import { db } from '../config/db.js';

// ── Find ──────────────────────────────────────────────────────

export async function findByEmail(email) {
  const [rows] = await db.query(
    `SELECT id, name, email, password_hash, role,
            roll_no, department, semester, is_active
     FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findById(id) {
  const [rows] = await db.query(
    `SELECT id, name, email, role,
            roll_no, department, semester, is_active
     FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findAllStudents(filters = {}) {
  return searchStudents(filters);
}

export async function findAllFaculty() {
  const [rows] = await db.query(
    `SELECT id, name, email, department FROM users
     WHERE role = 'faculty' AND is_active = 1 ORDER BY name ASC`
  );
  return rows;
}

// ── Create ────────────────────────────────────────────────────

export async function createUser({ name, email, passwordHash, role, roll_no, department, semester }) {
  const [result] = await db.query(
    `INSERT INTO users (name, email, password_hash, role, roll_no, department, semester)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, email, passwordHash, role, roll_no ?? null, department ?? null, semester ?? null]
  );
  return result.insertId;
}

// ── Update ────────────────────────────────────────────────────

export async function updatePassword(userId, newPasswordHash) {
  await db.query(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [newPasswordHash, userId]
  );
}

export async function deactivateUser(userId) {
  await db.query(
    'UPDATE users SET is_active = 0 WHERE id = ?',
    [userId]
  );
}

// ── Search ────────────────────────────────────────────────────

export async function searchStudents({
  query,
  department,
  semester,
  min_attendance,
  max_attendance,
  leave_status,
} = {}) {
  let sql = `
    SELECT
      u.id, u.name, u.email, u.roll_no, u.department, u.semester,
      COALESCE(att.attendance_pct, 0) AS attendance_pct,
      latest_leave.status AS leave_status
    FROM users u
    LEFT JOIN (
      SELECT
        ar.student_id,
        ROUND((SUM(ar.status = 'present') + SUM(ar.status = 'leave')) * 100.0
          / NULLIF(COUNT(ar.id), 0), 2) AS attendance_pct
      FROM attendance_records ar
      GROUP BY ar.student_id
    ) att ON att.student_id = u.id
    LEFT JOIN (
      SELECT lr.student_id, lr.status
      FROM leave_requests lr
      JOIN (
        SELECT student_id, MAX(created_at) AS latest_created_at
        FROM leave_requests
        GROUP BY student_id
      ) latest ON latest.student_id = lr.student_id
        AND latest.latest_created_at = lr.created_at
    ) latest_leave ON latest_leave.student_id = u.id
    WHERE u.role = 'student' AND u.is_active = 1`;
  const params = [];

  if (query) {
    sql += ' AND (u.name LIKE ? OR u.roll_no LIKE ?)';
    params.push(`%${query}%`, `%${query}%`);
  }
  if (department)     { sql += ' AND u.department = ?'; params.push(department); }
  if (semester)       { sql += ' AND u.semester = ?'; params.push(semester); }
  if (min_attendance) { sql += ' AND COALESCE(att.attendance_pct, 0) >= ?'; params.push(Number(min_attendance)); }
  if (max_attendance) { sql += ' AND COALESCE(att.attendance_pct, 0) <= ?'; params.push(Number(max_attendance)); }
  if (leave_status)   { sql += ' AND latest_leave.status = ?'; params.push(leave_status); }

  sql += ' ORDER BY u.roll_no ASC LIMIT 100';
  const [rows] = await db.query(sql, params);
  return rows;
}
