import { db as pool } from '../config/db.js';
import * as attendanceModel from '../models/attendanceModel.js';

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

export const getAdminDashboard = async (filters = {}) => {
  const [overview, deptBreakdown, recentSessions, warningStudents] = await Promise.all([
    getOverallStats(filters),
    getDepartmentBreakdown(filters),
    getRecentSessions(10),
    attendanceModel.getStudentsBelow75(filters),
  ]);

  return {
    overview,
    department_breakdown: deptBreakdown,
    recent_sessions:      recentSessions,
    warning_students:     warningStudents,
    warning_count:        warningStudents.length,
  };
};

const getOverallStats = async (filters = {}) => {
  let sql = `
    SELECT
      COUNT(DISTINCT ar.student_id)           AS total_students,
      COUNT(DISTINCT s.id)                    AS total_sessions,
      COUNT(ar.id)                            AS total_records,
      SUM(ar.status = 'present')              AS total_present,
      SUM(ar.status = 'leave')                AS total_leave,
      ROUND((SUM(ar.status = 'present') + SUM(ar.status = 'leave')) * 100.0
            / NULLIF(COUNT(ar.id), 0), 2)     AS overall_attendance_pct,
      (SELECT COUNT(*) FROM leave_requests WHERE status = 'pending') AS pending_leaves
    FROM attendance_records ar
    JOIN sessions s ON ar.session_id = s.id
    JOIN users u ON ar.student_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (filters.department) { sql += ' AND u.department = ?'; params.push(filters.department); }
  if (filters.semester)   { sql += ' AND u.semester = ?';   params.push(filters.semester); }

  const [rows] = await pool.query(sql, params);
  return rows[0];
};

const getDepartmentBreakdown = async (filters = {}) => {
  const [rows] = await pool.query(`
    SELECT
      u.department,
      COUNT(DISTINCT ar.student_id)           AS students,
      COUNT(ar.id)                            AS records,
      ROUND((SUM(ar.status = 'present') + SUM(ar.status = 'leave')) * 100.0
            / NULLIF(COUNT(ar.id), 0), 2)     AS attendance_pct
    FROM attendance_records ar
    JOIN users u ON ar.student_id = u.id
    GROUP BY u.department
    ORDER BY attendance_pct DESC
  `);
  return rows;
};

const getRecentSessions = async (limit = 10) => {
  const [rows] = await pool.query(`
    SELECT
      s.id, s.subject, s.session_date, s.department, s.semester,
      u.name AS faculty_name,
      COUNT(ar.id)                    AS total_marked,
      SUM(ar.status = 'present')      AS present_count,
      SUM(ar.status = 'leave')        AS leave_count
    FROM sessions s
    JOIN users u ON s.faculty_id = u.id
    LEFT JOIN attendance_records ar ON ar.session_id = s.id
    GROUP BY s.id
    ORDER BY s.session_date DESC
    LIMIT ?
  `, [limit]);
  return rows;
};

// ─── Faculty Dashboard ───────────────────────────────────────────────────────

export const getFacultyDashboard = async (facultyId) => {
  const [sessions, subjectStats, lowAttendance] = await Promise.all([
    getRecentSessionsByFaculty(facultyId, 5),
    getSubjectStatsByFaculty(facultyId),
    getLowAttendanceStudentsForFaculty(facultyId),
  ]);

  return {
    recent_sessions:     sessions,
    subject_stats:       subjectStats,
    low_attendance:      lowAttendance,
    low_attendance_count: lowAttendance.length,
  };
};

const getRecentSessionsByFaculty = async (facultyId, limit) => {
  const [rows] = await pool.query(`
    SELECT
      s.id, s.subject, s.session_date,
      COUNT(ar.id)               AS total,
      SUM(ar.status = 'present') AS present,
      SUM(ar.status = 'leave')   AS leave_count
    FROM sessions s
    LEFT JOIN attendance_records ar ON ar.session_id = s.id
    WHERE s.faculty_id = ?
    GROUP BY s.id
    ORDER BY s.session_date DESC
    LIMIT ?
  `, [facultyId, limit]);
  return rows;
};

const getSubjectStatsByFaculty = async (facultyId) => {
  const [rows] = await pool.query(`
    SELECT
      s.subject,
      COUNT(DISTINCT s.id)                   AS session_count,
      COUNT(ar.id)                           AS total_records,
      ROUND((SUM(ar.status = 'present') + SUM(ar.status = 'leave')) * 100.0
            / NULLIF(COUNT(ar.id), 0), 2)    AS avg_attendance_pct
    FROM sessions s
    LEFT JOIN attendance_records ar ON ar.session_id = s.id
    WHERE s.faculty_id = ?
    GROUP BY s.subject
    ORDER BY s.subject
  `, [facultyId]);
  return rows;
};

const getLowAttendanceStudentsForFaculty = async (facultyId) => {
  const [rows] = await pool.query(`
    SELECT
      u.id, u.name, u.roll_no, u.department, u.semester, s.subject,
      COUNT(ar.id)                          AS total,
      SUM(ar.status = 'present')            AS present,
      SUM(ar.status = 'leave')              AS leave_count,
      ROUND((SUM(ar.status = 'present') + SUM(ar.status = 'leave')) * 100.0
            / NULLIF(COUNT(ar.id), 0), 2)   AS attendance_pct
    FROM attendance_records ar
    JOIN sessions s ON ar.session_id = s.id
    JOIN users u ON ar.student_id = u.id
    WHERE s.faculty_id = ?
    GROUP BY u.id, s.subject
    HAVING attendance_pct < 75
    ORDER BY attendance_pct ASC
  `, [facultyId]);
  return rows;
};

// ─── Student Dashboard ───────────────────────────────────────────────────────

export const getStudentDashboard = async (studentId) => {
  const [summary, bySubject, recentRecords] = await Promise.all([
    attendanceModel.getStudentAttendanceSummary(studentId),
    attendanceModel.getStudentAttendanceBySubject(studentId),
    getRecentRecordsForStudent(studentId, 10),
  ]);

  return {
    summary,
    by_subject:    bySubject,
    recent_records: recentRecords,
    is_warned:     summary.attendance_pct !== null && summary.attendance_pct < 75,
  };
};

const getRecentRecordsForStudent = async (studentId, limit) => {
  const [rows] = await pool.query(`
    SELECT ar.status, ar.created_at, s.subject, s.session_date
    FROM attendance_records ar
    JOIN sessions s ON ar.session_id = s.id
    WHERE ar.student_id = ?
    ORDER BY s.session_date DESC
    LIMIT ?
  `, [studentId, limit]);
  return rows;
};

// ─── Warning Report (for admin) ──────────────────────────────────────────────

export const getWarningReport = async (filters = {}) => {
  const students = await attendanceModel.getStudentsBelow75(filters);
  return {
    total_warned: students.length,
    threshold:    75,
    students,
  };
};
