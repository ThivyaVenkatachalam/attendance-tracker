import { db as pool } from '../config/db.js';

export const createSession = async ({
  subject,
  faculty_id,
  session_date,
  department,
  semester,
  start_time = null,
  end_time = null,
  room = null,
}, connection) => {
  const conn = connection || pool;
  const [result] = await conn.query(
    `INSERT INTO sessions
       (subject, faculty_id, session_date, department, semester, start_time, end_time, room)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [subject, faculty_id, session_date, department, semester, start_time, end_time, room]
  );
  return result.insertId;
};

export const assignFacultyToSession = async (facultyId, sessionId, connection) => {
  const conn = connection || pool;
  await conn.query(
    `INSERT IGNORE INTO faculty_classes (faculty_id, session_id)
     VALUES (?, ?)`,
    [facultyId, sessionId]
  );
};

export const findFacultyForSessionImport = async ({ faculty_id, faculty_email }) => {
  if (faculty_id) {
    const [rows] = await pool.query(
      `SELECT id, department FROM users
       WHERE id = ? AND role = 'faculty' AND is_active = 1`,
      [Number(faculty_id)]
    );
    return rows[0] || null;
  }

  if (faculty_email) {
    const [rows] = await pool.query(
      `SELECT id, department FROM users
       WHERE email = ? AND role = 'faculty' AND is_active = 1`,
      [faculty_email]
    );
    return rows[0] || null;
  }

  return null;
};

export const findSessionById = async (id) => {
  const [rows] = await pool.query(
    `SELECT s.*, u.name AS faculty_name
     FROM sessions s
     JOIN users u ON s.faculty_id = u.id
     WHERE s.id = ?`,
    [id]
  );
  return rows[0] || null;
};

export const findSessionsByDepartment = async (department, semester) => {
  let sql = 'SELECT * FROM sessions WHERE department = ?';
  const params = [department];
  if (semester) { sql += ' AND semester = ?'; params.push(semester); }
  sql += ' ORDER BY session_date DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

export const isFacultyAssignedToSession = async (facultyId, sessionId) => {
  const [rows] = await pool.query(
    `SELECT 1 FROM faculty_classes fc
     WHERE fc.faculty_id = ? AND fc.session_id = ?
     LIMIT 1`,
    [facultyId, sessionId]
  );
  return rows.length > 0;
};

export const deleteSession = async (sessionId) => {
  const [result] = await pool.query('DELETE FROM sessions WHERE id = ?', [sessionId]);
  return result.affectedRows;
};
