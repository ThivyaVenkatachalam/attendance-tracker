import * as attendanceService from '../services/attendanceService.js';
import { success, conflict, created } from '../utils/responseHelper.js';
import { metricsTracker } from '../utils/metricsTracker.js';
import { auditLog } from '../config/logger.js';
import multer from 'multer';

// Multer: CSV stored in memory only (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
    else cb(new Error('Only CSV files are accepted'), false);
  },
});
export const csvUpload = upload.single('file');

// ─── Session ─────────────────────────────────────────────────────────────────

export const getSession = async (req, res, next) => {
  const t0 = Date.now();
  try {
    const data = await attendanceService.getSessionWithRecords(req.params.sessionId, req.user);
    metricsTracker.record('attendance_get_session', Date.now() - t0);
    return success(res, data);
  } catch (err) { next(err); }
};

export const listSessions = async (req, res, next) => {
  try {
    const filters = {
      subject: req.query.subject,
      date:    req.query.date,
      limit:   req.query.limit  || 20,
      offset:  req.query.offset || 0,
    };
    const data = await attendanceService.listSessionsForFaculty(req.user.id, filters, req.user.role);
    return success(res, data);
  } catch (err) { next(err); }
};

export const createTimetableSession = async (req, res, next) => {
  const t0 = Date.now();
  try {
    const data = await attendanceService.createTimetableSession(req.body, req.user);
    const latencyMs = Date.now() - t0;
    auditLog({
      actorId: req.user.id,
      studentId: null,
      action: 'timetable.create',
      status: 'success',
      latencyMs,
      meta: { session_id: data.id, subject: data.subject },
    });
    return created(res, data, 'Timetable session created');
  } catch (err) {
    const latencyMs = Date.now() - t0;
    auditLog({
      actorId: req.user?.id,
      studentId: null,
      action: 'timetable.create',
      status: 'failure',
      latencyMs,
      meta: { error_code: err.code },
    });
    next(err);
  }
};

// ─── Mark Attendance ─────────────────────────────────────────────────────────

export const markAttendance = async (req, res, next) => {
  const t0 = Date.now();
  try {
    const data = await attendanceService.markAttendance(req.body, req.user);
    const latencyMs = Date.now() - t0;
    metricsTracker.record('attendance_create', latencyMs);
    auditLog({
      actorId: req.user.id,
      studentId: req.body.student_id,
      action: 'attendance.create',
      status: 'success',
      latencyMs,
      meta: { session_id: req.body.session_id, attendance_status: req.body.status },
    });
    return created(res, data);
  } catch (err) {
    const latencyMs = Date.now() - t0;
    auditLog({
      actorId: req.user?.id,
      studentId: req.body?.student_id,
      action: 'attendance.create',
      status: 'failure',
      latencyMs,
      meta: { session_id: req.body?.session_id, error_code: err.code },
    });
    next(err);
  }
};

export const bulkMarkAttendance = async (req, res, next) => {
  const t0 = Date.now();
  try {
    const data = await attendanceService.bulkMarkAttendance(
      req.params.sessionId,
      req.body.records,
      req.user
    );
    const latencyMs = Date.now() - t0;
    metricsTracker.record('attendance_bulk', latencyMs);
    auditLog({
      actorId: req.user.id,
      studentId: null,
      action: 'attendance.bulk_update',
      status: 'success',
      latencyMs,
      meta: { session_id: Number(req.params.sessionId), count: data.count, changed_count: data.changed_count },
    });
    return created(res, data);
  } catch (err) {
    const latencyMs = Date.now() - t0;
    auditLog({
      actorId: req.user?.id,
      studentId: err.attempted?.student_id ?? null,
      action: 'attendance.bulk_update',
      status: 'failure',
      latencyMs,
      meta: { session_id: Number(req.params.sessionId), error_code: err.code },
    });
    if (err.code === 'VERSION_CONFLICT') return conflict(res, err.latest, err.attempted);
    next(err);
  }
};

// ─── OCC Update ──────────────────────────────────────────────────────────────

export const updateAttendance = async (req, res, next) => {
  const t0 = Date.now();
  try {
    const data = await attendanceService.updateAttendanceWithOCC(
      req.params.recordId,
      req.body,       // { status, version }
      req.user
    );
    const latencyMs = Date.now() - t0;
    metricsTracker.record('attendance_update', latencyMs);
    auditLog({
      actorId: req.user.id,
      studentId: data.student_id,
      action: 'attendance.update',
      status: 'success',
      latencyMs,
      meta: { record_id: Number(req.params.recordId), attendance_status: req.body.status },
    });
    return success(res, data);
  } catch (err) {
    const latencyMs = Date.now() - t0;
    auditLog({
      actorId: req.user?.id,
      studentId: err.latest?.student_id,
      action: 'attendance.update',
      status: 'failure',
      latencyMs,
      meta: { record_id: Number(req.params.recordId), error_code: err.code },
    });
    if (err.code === 'VERSION_CONFLICT') return conflict(res, err.latest, {
      status: req.body?.status,
      version: req.body?.version,
    });
    next(err);
  }
};

// ─── CSV Import ───────────────────────────────────────────────────────────────

export const importCSV = async (req, res, next) => {
  const t0 = Date.now();
  try {
    if (!req.file) throw Object.assign(new Error('No file uploaded'), { statusCode: 400 });
    const result = await attendanceService.importFromCSV(req.file.buffer, req.user);
    const latencyMs = Date.now() - t0;
    metricsTracker.record('attendance_csv_import', latencyMs);
    auditLog({
      actorId: req.user.id,
      studentId: null,
      action: 'attendance.csv_import',
      status: 'success',
      latencyMs,
      meta: { imported: result.imported, skipped: result.skipped },
    });
    return success(res, result, 200, `Imported ${result.imported} records`);
  } catch (err) {
    const latencyMs = Date.now() - t0;
    auditLog({
      actorId: req.user?.id,
      studentId: null,
      action: 'attendance.csv_import',
      status: 'failure',
      latencyMs,
      meta: { error_code: err.code },
    });
    next(err);
  }
};

// ─── Student View ─────────────────────────────────────────────────────────────

export const importTimetableCSV = async (req, res, next) => {
  const t0 = Date.now();
  try {
    if (!req.file) throw Object.assign(new Error('No file uploaded'), { statusCode: 400 });
    const result = await attendanceService.importTimetableFromCSV(req.file.buffer, req.user);
    metricsTracker.record('timetable_csv_import', Date.now() - t0);
    return success(res, result, 200, `Imported ${result.imported} timetable sessions`);
  } catch (err) { next(err); }
};

export const getMyAttendance = async (req, res, next) => {
  try {
    const filters = {
      subject:    req.query.subject,
      start_date: req.query.start_date,
      end_date:   req.query.end_date,
    };
    const data = await attendanceService.getMyAttendance(req.user.id, filters);
    return success(res, data);
  } catch (err) { next(err); }
};
