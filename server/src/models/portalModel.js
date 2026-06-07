import { db as pool } from '../config/db.js';

const appendScheduleScope = (sql, params, user, filters = {}) => {
  if (user.role === 'faculty') {
    sql += ' AND s.faculty_id = ?';
    params.push(user.id);
  } else if (user.role === 'student') {
    sql += ' AND s.department = ? AND s.semester = ?';
    params.push(user.department, user.semester);
  } else if (user.role === 'hod') {
    sql += ' AND s.department = ?';
    params.push(user.department);
  } else if (user.role === 'parent') {
    sql += ` AND EXISTS (
      SELECT 1 FROM parent_students ps
      JOIN users st ON st.id = ps.student_id
      WHERE ps.parent_id = ?
        AND st.department = s.department
        AND st.semester = s.semester
    )`;
    params.push(user.id);
  }

  if (filters.department && ['admin', 'hod'].includes(user.role)) {
    sql += ' AND s.department = ?';
    params.push(filters.department);
  }
  if (filters.semester && ['admin', 'hod'].includes(user.role)) {
    sql += ' AND s.semester = ?';
    params.push(Number(filters.semester));
  }
  if (filters.start_date) {
    sql += ' AND s.session_date >= ?';
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    sql += ' AND s.session_date <= ?';
    params.push(filters.end_date);
  }

  return { sql, params };
};

export const getSchedule = async (user, filters = {}) => {
  let sql = `
    SELECT
      s.id, s.subject, s.department, s.semester, s.session_date,
      s.start_time, s.end_time, s.room,
      u.name AS faculty_name,
      COUNT(ar.id) AS marked_count,
      SUM(ar.status = 'present') AS present_count,
      SUM(ar.status = 'absent') AS absent_count,
      SUM(ar.status = 'leave') AS leave_count
    FROM sessions s
    JOIN users u ON u.id = s.faculty_id
    LEFT JOIN attendance_records ar ON ar.session_id = s.id
    WHERE 1=1
  `;
  let params = [];

  const scopedSchedule = appendScheduleScope(sql, params, user, filters);
  sql = scopedSchedule.sql;
  params = scopedSchedule.params;

  sql += ' GROUP BY s.id ORDER BY s.session_date ASC, s.start_time ASC, s.subject ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

export const getParentStudents = async (parentId) => {
  const [rows] = await pool.query(
    `SELECT
       st.id, st.name, st.email, st.roll_no, st.department, st.semester,
       ps.relationship
     FROM parent_students ps
     JOIN users st ON st.id = ps.student_id
     WHERE ps.parent_id = ? AND st.is_active = 1
     ORDER BY st.name ASC`,
    [parentId]
  );
  return rows;
};

export const getRecentRecordsForStudents = async (studentIds, limit = 10) => {
  if (!studentIds.length) return [];
  const [rows] = await pool.query(
    `SELECT
       ar.student_id, ar.status, s.subject, s.session_date,
       st.name AS student_name
     FROM attendance_records ar
     JOIN sessions s ON s.id = ar.session_id
     JOIN users st ON st.id = ar.student_id
     WHERE ar.student_id IN (?)
     ORDER BY s.session_date DESC
     LIMIT ?`,
    [studentIds, limit]
  );
  return rows;
};

export const getHodStats = async (department) => {
  const [rows] = await pool.query(
    `SELECT
       COUNT(DISTINCT st.id) AS total_students,
       COUNT(DISTINCT f.id) AS total_faculty,
       COUNT(DISTINCT s.id) AS total_sessions,
       ROUND((SUM(ar.status = 'present') + SUM(ar.status = 'leave')) * 100.0
             / NULLIF(COUNT(ar.id), 0), 2) AS attendance_pct
     FROM users st
     LEFT JOIN sessions s
       ON s.department = st.department AND s.semester = st.semester
     LEFT JOIN attendance_records ar
       ON ar.session_id = s.id AND ar.student_id = st.id
     LEFT JOIN users f
       ON f.role = 'faculty' AND f.department = st.department
     WHERE st.role = 'student' AND st.department = ?`,
    [department]
  );
  return rows[0] ?? {};
};

export const getEmailLogs = async (filters = {}) => {
  let sql = `
    SELECT
      l.*, st.name AS student_name, st.roll_no, p.name AS parent_name
    FROM attendance_email_logs l
    JOIN users st ON st.id = l.student_id
    JOIN users p ON p.id = l.parent_id
    WHERE 1=1
  `;
  const params = [];

  if (filters.department) {
    sql += ' AND st.department = ?';
    params.push(filters.department);
  }

  sql += ' ORDER BY l.created_at DESC LIMIT ?';
  params.push(Number(filters.limit ?? 20));

  const [rows] = await pool.query(sql, params);
  return rows;
};

export const getLowAttendanceAlertTargets = async (filters = {}) => {
  let sql = `
    SELECT
      st.id AS student_id,
      st.name AS student_name,
      st.roll_no,
      st.department,
      st.semester,
      p.id AS parent_id,
      p.name AS parent_name,
      p.email AS parent_email,
      COUNT(ar.id) AS total,
      SUM(ar.status = 'present') AS present,
      SUM(ar.status = 'leave') AS leave_count,
      ROUND((SUM(ar.status = 'present') + SUM(ar.status = 'leave')) * 100.0
            / NULLIF(COUNT(ar.id), 0), 2) AS attendance_pct
    FROM users st
    JOIN parent_students ps ON ps.student_id = st.id
    JOIN users p ON p.id = ps.parent_id AND p.is_active = 1
    JOIN attendance_records ar ON ar.student_id = st.id
    JOIN sessions s ON s.id = ar.session_id
    WHERE st.role = 'student' AND st.is_active = 1
  `;
  const params = [];

  if (filters.department) {
    sql += ' AND st.department = ?';
    params.push(filters.department);
  }
  if (filters.semester) {
    sql += ' AND st.semester = ?';
    params.push(Number(filters.semester));
  }

  sql += `
    GROUP BY st.id, p.id
    HAVING attendance_pct < ?
    ORDER BY attendance_pct ASC
  `;
  params.push(Number(filters.threshold ?? 75));

  const [rows] = await pool.query(sql, params);
  return rows;
};

export const findEmailLogToday = async ({ student_id, parent_id, subject = null }) => {
  const [rows] = await pool.query(
    `SELECT id FROM attendance_email_logs
     WHERE student_id = ?
       AND parent_id = ?
       AND (subject <=> ?)
       AND DATE(created_at) = CURDATE()
     LIMIT 1`,
    [student_id, parent_id, subject]
  );
  return rows[0] ?? null;
};

export const createEmailLog = async ({
  student_id,
  parent_id,
  parent_email,
  attendance_pct,
  subject = null,
  status = 'sent',
  message,
  triggered_by,
}) => {
  const [result] = await pool.query(
    `INSERT INTO attendance_email_logs
       (student_id, parent_id, parent_email, attendance_pct, subject, status, message, triggered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, parent_id, parent_email, attendance_pct, subject, status, message, triggered_by ?? null]
  );
  return result.insertId;
};
