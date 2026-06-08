import { db as pool } from '../config/db.js';

// ─── Session Queries ────────────────────────────────────────────────────────

export const findSessionById = async (sessionId) => {
  const [rows] = await pool.query(
    `SELECT s.*, u.name AS faculty_name, u.department
     FROM sessions s
     JOIN users u ON s.faculty_id = u.id
     WHERE s.id = ?`,
    [sessionId]
  );
  return rows[0] || null;
};

export const findSessionsByFaculty = async (facultyId, filters = {}) => {
  let sql = `
    SELECT s.*,
      u.name AS faculty_name,
      COUNT(ar.id) AS marked_count,
      SUM(ar.status = 'present') AS present_count,
      CASE WHEN COUNT(ar.id) > 0 THEN 1 ELSE 0 END AS attendance_submitted
    FROM sessions s
    JOIN users u ON u.id = s.faculty_id
    LEFT JOIN attendance_records ar ON ar.session_id = s.id
    WHERE s.faculty_id = ?
  `;
  const params = [facultyId];

  if (filters.subject) { sql += ' AND s.subject LIKE ?'; params.push(`%${filters.subject}%`); }
  if (filters.date)    { sql += ' AND DATE(s.session_date) = ?'; params.push(filters.date); }

  sql += ' GROUP BY s.id ORDER BY s.session_date DESC';
  if (filters.limit) { sql += ' LIMIT ? OFFSET ?'; params.push(Number(filters.limit), Number(filters.offset || 0)); }

  const [rows] = await pool.query(sql, params);
  return rows;
};

export const findAllSessions = async (filters = {}) => {
  let sql = `
    SELECT s.*,
      u.name AS faculty_name,
      COUNT(ar.id) AS marked_count,
      SUM(ar.status = 'present') AS present_count,
      CASE WHEN COUNT(ar.id) > 0 THEN 1 ELSE 0 END AS attendance_submitted
    FROM sessions s
    JOIN users u ON u.id = s.faculty_id
    LEFT JOIN attendance_records ar ON ar.session_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.subject) { sql += ' AND s.subject LIKE ?'; params.push(`%${filters.subject}%`); }
  if (filters.date)    { sql += ' AND DATE(s.session_date) = ?'; params.push(filters.date); }

  sql += ' GROUP BY s.id ORDER BY s.session_date DESC';
  if (filters.limit) { sql += ' LIMIT ? OFFSET ?'; params.push(Number(filters.limit), Number(filters.offset || 0)); }

  const [rows] = await pool.query(sql, params);
  return rows;
};

// ─── Attendance Record Queries ───────────────────────────────────────────────

export const findRecordsBySession = async (sessionId) => {
  const [rows] = await pool.query(
    `SELECT
       ar.id,
       ? AS session_id,
       u.id AS student_id,
       COALESCE(ar.status, 'absent') AS status,
       COALESCE(ar.version, 0) AS version,
       ar.marked_by,
       ar.created_at,
       ar.updated_at,
       u.name AS student_name,
       u.roll_no,
       u.department,
       u.semester
     FROM sessions s
     JOIN users u
       ON u.role = 'student'
      AND u.is_active = 1
      AND u.department = s.department
      AND u.semester = s.semester
     LEFT JOIN attendance_records ar
       ON ar.session_id = s.id
      AND ar.student_id = u.id
     WHERE s.id = ?
     ORDER BY u.roll_no`,
    [sessionId, sessionId]
  );
  return rows;
};

export const findRecordById = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM attendance_records WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

export const findRecordBySessionAndStudent = async (sessionId, studentId) => {
  const [rows] = await pool.query(
    'SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?',
    [sessionId, studentId]
  );
  return rows[0] || null;
};

export const findActiveStudentInSession = async (sessionId, studentId) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.roll_no, u.department, u.semester
     FROM sessions s
     JOIN users u
       ON u.role = 'student'
      AND u.is_active = 1
      AND u.department = s.department
      AND u.semester = s.semester
     WHERE s.id = ? AND u.id = ?
     LIMIT 1`,
    [sessionId, studentId]
  );
  return rows[0] || null;
};

export const findActiveStudentByIdOrRollNo = async ({ studentId, rollNo }, connection) => {
  const conn = connection || pool;
  const predicate = studentId ? 'id = ?' : 'roll_no = ?';
  const lookup = studentId ? Number(studentId) : rollNo;
  const [rows] = await conn.query(
    `SELECT id, name, roll_no, department, semester
     FROM users
     WHERE role = 'student' AND is_active = 1 AND ${predicate}
     LIMIT 1`,
    [lookup]
  );
  return rows[0] || null;
};

// OCC update — returns affectedRows (0 = version conflict)
export const updateRecordWithVersion = async (id, status, expectedVersion) => {
  const [result] = await pool.query(
    `UPDATE attendance_records
     SET status = ?, version = version + 1, updated_at = NOW()
     WHERE id = ? AND version = ?`,
    [status, id, expectedVersion]
  );
  return result.affectedRows;
};

export const updateRecordBySessionStudentWithVersion = async (
  sessionId, studentId, status, expectedVersion, markedBy, connection
) => {
  const conn = connection || pool;
  const [result] = await conn.query(
    `UPDATE attendance_records
     SET status = ?,
         marked_by = ?,
         version = version + 1,
         updated_at = NOW()
     WHERE session_id = ? AND student_id = ? AND version = ?`,
    [status, markedBy, sessionId, studentId, expectedVersion]
  );
  return result.affectedRows;
};

export const insertRecordWithVersion = async (
  sessionId, studentId, status, markedBy, expectedVersion = 0, connection
) => {
  const conn = connection || pool;
  if (expectedVersion !== 0) return { inserted: false, conflict: true };
  try {
    const [result] = await conn.query(
      `INSERT INTO attendance_records (session_id, student_id, status, marked_by, version)
       VALUES (?, ?, ?, ?, 0)`,
      [sessionId, studentId, status, markedBy]
    );
    return { inserted: result.affectedRows === 1, conflict: false };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { inserted: false, conflict: true };
    throw err;
  }
};

// Bulk upsert for CSV import — idempotent via ON DUPLICATE KEY
export const bulkUpsertRecords = async (records, connection) => {
  const conn = connection || pool;
  const values = records.map(r => [r.session_id, r.student_id, r.status, r.marked_by]);
  const [result] = await conn.query(
    `INSERT INTO attendance_records (session_id, student_id, status, marked_by)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       marked_by  = IF(status <> VALUES(status), VALUES(marked_by), marked_by),
       version    = IF(status <> VALUES(status), version + 1, version),
       updated_at = IF(status <> VALUES(status), NOW(), updated_at),
       status     = IF(status <> VALUES(status), VALUES(status), status)`,
    [values]
  );
  return result;
};

// Insert single record
export const insertRecord = async (sessionId, studentId, status, markedBy) => {
  const [result] = await pool.query(
    `INSERT INTO attendance_records (session_id, student_id, status, marked_by)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status     = VALUES(status),
       version    = version + 1,
       updated_at = NOW()`,
    [sessionId, studentId, status, markedBy]
  );
  return result;
};

// ─── Student Attendance Summary ──────────────────────────────────────────────

export const getStudentAttendanceSummary = async (studentId, filters = {}) => {
  let sql = `
    SELECT
      COUNT(ar.id)                              AS total_sessions,
      SUM(ar.status = 'present')                AS present_count,
      SUM(ar.status = 'leave')                  AS leave_count,
      SUM(ar.status = 'absent')                 AS absent_count,
      ROUND((SUM(ar.status = 'present') + SUM(ar.status = 'leave')) * 100.0
            / NULLIF(COUNT(ar.id), 0), 2)       AS attendance_pct
    FROM attendance_records ar
    JOIN sessions s ON ar.session_id = s.id
    WHERE ar.student_id = ?
  `;
  const params = [studentId];
  if (filters.subject)    { sql += ' AND s.subject = ?';       params.push(filters.subject); }
  if (filters.start_date) { sql += ' AND s.session_date >= ?'; params.push(filters.start_date); }
  if (filters.end_date)   { sql += ' AND s.session_date <= ?'; params.push(filters.end_date); }
  const [rows] = await pool.query(sql, params);
  return rows[0];
};

export const getStudentAttendanceBySubject = async (studentId) => {
  const [rows] = await pool.query(
    `SELECT
       s.subject,
       COUNT(ar.id)                          AS total,
       SUM(ar.status = 'present')            AS present,
       SUM(ar.status = 'leave')              AS leave_count,
       SUM(ar.status = 'absent')             AS absent_count,
       ROUND((SUM(ar.status = 'present') + SUM(ar.status = 'leave')) * 100.0
             / NULLIF(COUNT(ar.id), 0), 2)   AS pct
     FROM attendance_records ar
     JOIN sessions s ON ar.session_id = s.id
     WHERE ar.student_id = ?
     GROUP BY s.subject
     ORDER BY s.subject`,
    [studentId]
  );
  return rows;
};

// ─── Warning Queries ─────────────────────────────────────────────────────────

export const getStudentsBelow75 = async (filters = {}) => {
  let sql = `
    SELECT
      u.id, u.name, u.roll_no, u.department, u.semester,
      COUNT(ar.id)                          AS total,
      SUM(ar.status = 'present')            AS present,
      SUM(ar.status = 'leave')              AS leave_count,
      SUM(ar.status = 'absent')             AS absent_count,
      ROUND((SUM(ar.status = 'present') + SUM(ar.status = 'leave')) * 100.0
            / NULLIF(COUNT(ar.id), 0), 2)   AS attendance_pct
    FROM users u
    JOIN attendance_records ar ON ar.student_id = u.id
    WHERE u.role = 'student'
  `;
  const params = [];
  if (filters.department) { sql += ' AND u.department = ?'; params.push(filters.department); }
  if (filters.semester)   { sql += ' AND u.semester = ?';   params.push(filters.semester); }
  sql += `
    GROUP BY u.id
    HAVING attendance_pct < 75
    ORDER BY attendance_pct ASC
  `;
  const [rows] = await pool.query(sql, params);
  return rows;
};