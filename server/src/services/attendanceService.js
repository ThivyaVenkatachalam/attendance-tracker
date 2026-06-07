import { db as pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as attendanceModel from '../models/attendanceModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as notificationService from './notificationService.js';
import { parse } from 'csv-parse/sync';

// ─── Session Management ──────────────────────────────────────────────────────

export const getSessionWithRecords = async (sessionId, requestingUser) => {
  const session = await attendanceModel.findSessionById(sessionId);
  if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');

  // Faculty can only view their own sessions
  if (requestingUser.role === 'faculty' && session.faculty_id !== requestingUser.id) {
    throw new AppError('You are not assigned to this session', 403, 'TRIPWIRE_VIOLATION');
  }

  const records = await attendanceModel.findRecordsBySession(sessionId);
  return { session, records };
};

export const listSessionsForFaculty = async (userId, filters, userRole) => {
  // Admins can see all sessions, faculty see only their sessions
  if (userRole === 'admin') {
    return attendanceModel.findAllSessions(filters);
  }
  return attendanceModel.findSessionsByFaculty(userId, filters);
};

// ─── Mark / Update Attendance (OCC) ─────────────────────────────────────────

/**
 * Mark attendance for a single student in a session.
 * Uses Optimistic Concurrency Control:
 * - Client sends current `version` with the update request
 * - Server runs: UPDATE ... WHERE id = ? AND version = ?
 * - If affectedRows = 0 → someone else updated first → 409 Conflict
 */
export const markAttendance = async ({ session_id, student_id, status }, markedBy) => {
  const session = await attendanceModel.findSessionById(session_id);
  if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');

  // Tripwire: faculty can only mark attendance for their own assigned sessions
  if (markedBy.role === 'faculty') {
    const assigned = await sessionModel.isFacultyAssignedToSession(markedBy.id, session_id);
    if (!assigned) throw new AppError('Not assigned to this session', 403, 'TRIPWIRE_VIOLATION');
  }

  await attendanceModel.insertRecord(session_id, student_id, status, markedBy.id);
  await notificationService.sendLowAttendanceAlerts({
    filters: { department: session.department, semester: session.semester },
    triggeredBy: markedBy.id,
  });
  return { session_id, student_id, status };
};

export const updateAttendanceWithOCC = async (recordId, { status, version }, requestingUser) => {
  const record = await attendanceModel.findRecordById(recordId);
  if (!record) throw new AppError('Attendance record not found', 404, 'RECORD_NOT_FOUND');

  // Faculty tripwire: must own the session
  if (requestingUser.role === 'faculty') {
    const assigned = await sessionModel.isFacultyAssignedToSession(requestingUser.id, record.session_id);
    if (!assigned) throw new AppError('Not assigned to this session', 403, 'TRIPWIRE_VIOLATION');
  }

  const affected = await attendanceModel.updateRecordWithVersion(recordId, status, version);

  if (affected === 0) {
    // Version conflict — fetch the latest state for the client to compare
    const latest = await attendanceModel.findRecordById(recordId);
    const err = new AppError('Version conflict — record was modified by another request', 409, 'VERSION_CONFLICT');
    err.latest = latest;
    throw err;
  }

  const updated = await attendanceModel.findRecordById(recordId);
  const session = await attendanceModel.findSessionById(updated.session_id);
  await notificationService.sendLowAttendanceAlerts({
    filters: { department: session.department, semester: session.semester },
    triggeredBy: requestingUser.id,
  });
  return updated;
};

// ─── Bulk Mark (mark entire class at once) ───────────────────────────────────

export const bulkMarkAttendance = async (sessionId, records, markedBy) => {
  const session = await attendanceModel.findSessionById(sessionId);
  if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');

  if (markedBy.role === 'faculty') {
    const assigned = await sessionModel.isFacultyAssignedToSession(markedBy.id, sessionId);
    if (!assigned) throw new AppError('Not assigned to this session', 403, 'TRIPWIRE_VIOLATION');
  }

  const conn = await pool.getConnection();
  let changedCount = 0;

  try {
    await conn.beginTransaction();

    for (const record of records) {
      const expectedVersion = Number(record.version);
      if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
        throw new AppError('version is required for each bulk attendance record', 422, 'VALIDATION_ERROR');
      }

      const student = await attendanceModel.findActiveStudentInSession(sessionId, record.student_id);
      if (!student) {
        throw new AppError(
          `Student ${record.student_id} is not enrolled in this session`,
          400,
          'STUDENT_SESSION_MISMATCH',
          { student_id: record.student_id, session_id: Number(sessionId) }
        );
      }

      const existing = await attendanceModel.findRecordBySessionAndStudent(sessionId, record.student_id);

      if (!existing) {
        const insertResult = await attendanceModel.insertRecordWithVersion(
          sessionId,
          record.student_id,
          record.status,
          markedBy.id,
          expectedVersion,
          conn
        );

        if (insertResult.conflict) {
          const latest = await attendanceModel.findRecordBySessionAndStudent(sessionId, record.student_id);
          const err = new AppError('Version conflict - record was modified by another request', 409, 'VERSION_CONFLICT');
          err.latest = latest;
          err.attempted = record;
          throw err;
        }

        changedCount += insertResult.inserted ? 1 : 0;
        continue;
      }

      if (existing.status === record.status && existing.version === expectedVersion) {
        continue;
      }

      const affected = await attendanceModel.updateRecordBySessionStudentWithVersion(
        sessionId,
        record.student_id,
        record.status,
        expectedVersion,
        markedBy.id,
        conn
      );

      if (affected === 0) {
        const latest = await attendanceModel.findRecordBySessionAndStudent(sessionId, record.student_id);
        const err = new AppError('Version conflict - record was modified by another request', 409, 'VERSION_CONFLICT');
        err.latest = latest;
        err.attempted = record;
        throw err;
      }

      changedCount += 1;
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await notificationService.sendLowAttendanceAlerts({
    filters: { department: session.department, semester: session.semester },
    triggeredBy: markedBy.id,
  });
  return { session_id: Number(sessionId), count: records.length, changed_count: changedCount };
};

// ─── CSV Import ──────────────────────────────────────────────────────────────

/**
 * Parse and import a CSV file.
 * Expected columns: student_id, session_id, status
 * Returns per-row result: { imported, skipped, errors }
 */
export const importFromCSV = async (fileBuffer, importedBy) => {
  let rows;
  try {
    rows = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch {
    throw new AppError('Invalid CSV format', 400, 'CSV_PARSE_ERROR');
  }

  const VALID_STATUSES = ['present', 'absent', 'leave'];
  const results = { imported: 0, skipped: 0, errors: [] };
  const valid = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-based + header row

    const studentLookup = row.student_id || row.roll_no;

    if (!studentLookup || !row.session_id || !row.status) {
      results.errors.push({ row: rowNum, reason: 'Missing required fields (student_id or roll_no, session_id, status)' });
      results.skipped++;
      continue;
    }

    if (!VALID_STATUSES.includes(row.status.toLowerCase())) {
      results.errors.push({ row: rowNum, reason: `Invalid status "${row.status}"` });
      results.skipped++;
      continue;
    }

    const session = await attendanceModel.findSessionById(Number(row.session_id));
    if (!session) {
      results.errors.push({ row: rowNum, reason: `Session ${row.session_id} does not exist` });
      results.skipped++;
      continue;
    }

    const student = await attendanceModel.findActiveStudentByIdOrRollNo({
      studentId: row.student_id,
      rollNo: row.roll_no,
    });
    if (!student) {
      results.errors.push({ row: rowNum, reason: `Student ${studentLookup} does not exist` });
      results.skipped++;
      continue;
    }

    if (student.department !== session.department || Number(student.semester) !== Number(session.semester)) {
      results.errors.push({ row: rowNum, reason: `Student ${student.roll_no} is not enrolled in session ${session.id}` });
      results.skipped++;
      continue;
    }

    if (importedBy.role === 'faculty') {
      const assigned = await sessionModel.isFacultyAssignedToSession(importedBy.id, session.id);
      if (!assigned) {
        results.errors.push({ row: rowNum, reason: `Faculty is not assigned to session ${session.id}` });
        results.skipped++;
        continue;
      }
    }

    valid.push({
      session_id: session.id,
      student_id: student.id,
      status:     row.status.toLowerCase(),
      marked_by:  importedBy.id,
    });
  }

  if (valid.length > 0) {
  // Check which records already exist
  for (const record of valid) {
    const existing = await attendanceModel.findRecordBySessionAndStudent(
      record.session_id,
      record.student_id
    );
    if (existing) {
      results.skipped++;
    } else {
      results.imported++;
    }
  }

  await attendanceModel.bulkUpsertRecords(valid);

  const sessionIds = [...new Set(valid.map((r) => r.session_id))];
  const [sessions] = await pool.query(
    'SELECT DISTINCT department, semester FROM sessions WHERE id IN (?)',
    [sessionIds]
  );
  await Promise.all(sessions.map((session) =>
    notificationService.sendLowAttendanceAlerts({
      filters: { department: session.department, semester: session.semester },
      triggeredBy: importedBy.id,
    })
  ));
}
  return results;
};

export const importTimetableFromCSV = async (fileBuffer, importedBy) => {
  let rows;
  try {
    rows = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch {
    throw new AppError('Invalid CSV format', 400, 'CSV_PARSE_ERROR');
  }

  const results = { imported: 0, skipped: 0, errors: [] };
  const sessionIds = [];
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const subject = row.subject?.trim();
      const department = row.department?.trim();
      const semester = Number(row.semester);
      const session_date = row.session_date?.trim() || row.date?.trim();

      if (!subject || !department || !semester || !session_date) {
        results.errors.push({ row: rowNum, reason: 'Missing subject, department, semester, or session_date' });
        results.skipped++;
        continue;
      }

      if (importedBy.role === 'hod' && importedBy.department !== department) {
        results.errors.push({ row: rowNum, reason: 'HOD can import only their own department timetable' });
        results.skipped++;
        continue;
      }

      const faculty = await sessionModel.findFacultyForSessionImport({
        faculty_id: row.faculty_id,
        faculty_email: row.faculty_email?.trim(),
      });

      if (!faculty) {
        results.errors.push({ row: rowNum, reason: 'Faculty not found. Use faculty_id or faculty_email' });
        results.skipped++;
        continue;
      }

      const sessionId = await sessionModel.createSession({
        subject,
        faculty_id: faculty.id,
        department,
        semester,
        session_date,
        start_time: row.start_time || null,
        end_time: row.end_time || null,
        room: row.room || null,
      }, conn);

      await sessionModel.assignFacultyToSession(faculty.id, sessionId, conn);
      sessionIds.push(sessionId);
      results.imported++;
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return { ...results, session_ids: sessionIds };
};

// ─── Student Attendance View ─────────────────────────────────────────────────

export const getMyAttendance = async (studentId, filters) => {
  const [summary, bySubject] = await Promise.all([
    attendanceModel.getStudentAttendanceSummary(studentId, filters),
    attendanceModel.getStudentAttendanceBySubject(studentId),
  ]);
  return { summary, by_subject: bySubject };
};
