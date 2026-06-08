import { db as pool } from '../config/db.js';

export const createLeaveRequest = async ({ student_id, start_date, end_date, reason, document_url }) => {
  const [result] = await pool.query(
    `INSERT INTO leave_requests (student_id, start_date, end_date, reason, document_url, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [student_id, start_date, end_date, reason, document_url || null]
  );
  return result.insertId;
};

export const findLeaveById = async (id) => {
  const [rows] = await pool.query(
    `SELECT lr.*, 
       u.name AS student_name, u.roll_no, u.department, u.semester,
       rec.name AS recommended_by_name,
       a.name AS reviewed_by_name
     FROM leave_requests lr
     JOIN users u ON lr.student_id = u.id
     LEFT JOIN users rec ON lr.recommended_by = rec.id
     LEFT JOIN users a ON lr.reviewed_by = a.id
     WHERE lr.id = ?`,
    [id]
  );
  return rows[0] || null;
};

export const findLeavesByStudent = async (studentId, filters = {}) => {
  let sql = `
    SELECT lr.*, u.name AS student_name
    FROM leave_requests lr
    JOIN users u ON lr.student_id = u.id
    WHERE lr.student_id = ?
  `;
  const params = [studentId];

  if (filters.status) { sql += ' AND lr.status = ?'; params.push(filters.status); }
  sql += ' ORDER BY lr.created_at DESC';

  const [rows] = await pool.query(sql, params);
  return rows;
};

export const findAllLeaves = async (filters = {}) => {
  let sql = `
    SELECT lr.*, 
      u.name AS student_name, u.roll_no, u.department, u.semester,
      rec.name AS recommended_by_name,
      reviewer.name AS reviewed_by_name
    FROM leave_requests lr
    JOIN users u ON lr.student_id = u.id
    LEFT JOIN users rec ON lr.recommended_by = rec.id
    LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.status)     { sql += ' AND lr.status = ?';       params.push(filters.status); }
  if (filters.department) { sql += ' AND u.department = ?';    params.push(filters.department); }
  if (filters.start_date) { sql += ' AND lr.start_date >= ?';  params.push(filters.start_date); }
  if (filters.end_date)   { sql += ' AND lr.end_date <= ?';    params.push(filters.end_date); }

  sql += ' ORDER BY lr.created_at DESC';
  if (filters.limit) { sql += ' LIMIT ? OFFSET ?'; params.push(Number(filters.limit), Number(filters.offset || 0)); }

  const [rows] = await pool.query(sql, params);
  return rows;
};

export const recommendLeave = async (id, recommendedBy, recommendationNote) => {
  const [result] = await pool.query(
    `UPDATE leave_requests
     SET status = 'recommended',
         recommended_by = ?,
         recommendation_note = ?,
         recommended_at = NOW(),
         updated_at = NOW()
     WHERE id = ? AND status = 'pending'`,
    [recommendedBy, recommendationNote || null, id]
  );
  return result.affectedRows;
};

export const updateLeaveStatus = async (id, status, reviewedBy, adminNote) => {
  const [result] = await pool.query(
    `UPDATE leave_requests
     SET status = ?, reviewed_by = ?, admin_note = ?, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = ? AND status IN ('pending', 'recommended')`,
    [status, reviewedBy, adminNote || null, id]
  );
  return result.affectedRows;
};

export const markAttendanceAsLeave = async (studentId, startDate, endDate, markedBy) => {
  // 1. Update existing absent/present records to leave
  await pool.query(
    `UPDATE attendance_records ar
     JOIN sessions s ON s.id = ar.session_id
     SET ar.status = 'leave',
         ar.marked_by = ?,
         ar.version = ar.version + 1,
         ar.updated_at = NOW()
     WHERE ar.student_id = ?
       AND ar.status IN ('absent', 'present')
       AND DATE(s.session_date) BETWEEN ? AND ?`,
    [markedBy, studentId, startDate, endDate]
  );

  // 2. Insert leave records for sessions that don't have attendance yet
  const [result] = await pool.query(
    `INSERT IGNORE INTO attendance_records (session_id, student_id, status, marked_by)
     SELECT s.id, ?, 'leave', ?
     FROM sessions s
     JOIN users u ON u.department = s.department AND u.semester = s.semester
     WHERE u.id = ?
       AND DATE(s.session_date) BETWEEN ? AND ?
       AND NOT EXISTS (
         SELECT 1 FROM attendance_records ar2
         WHERE ar2.session_id = s.id AND ar2.student_id = ?
       )`,
    [studentId, markedBy, studentId, startDate, endDate, studentId]
  );

  return result.affectedRows;
};

// Count approved leave days for a student within a date range (used for attendance recalc)
export const countApprovedLeaveDays = async (studentId) => {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(DATEDIFF(end_date, start_date) + 1), 0) AS approved_days
     FROM leave_requests
     WHERE student_id = ? AND status = 'approved'`,
    [studentId]
  );
  return rows[0].approved_days;
};

// Check for overlapping pending/approved leave for the same student
export const findOverlappingLeave = async (studentId, startDate, endDate, excludeId = null) => {
  let sql = `
    SELECT id FROM leave_requests
    WHERE student_id = ?
      AND status IN ('pending', 'recommended', 'approved')
      AND start_date <= ? AND end_date >= ?
  `;
  const params = [studentId, endDate, startDate];
  if (excludeId) { sql += ' AND id != ?'; params.push(excludeId); }
  const [rows] = await pool.query(sql, params);
  return rows;
};
