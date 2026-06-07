import 'dotenv/config';
import mysql from 'mysql2/promise';

const hash = '$2b$12$FoKypRtiKmMGWa8nZ0aTr.AVzZU2hUl7RwYq1m4/mrEeDNB0b/qaS';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const hasColumn = async (table, column) => {
  const [rows] = await connection.query(`SHOW COLUMNS FROM ${table}`);
  return rows.some((row) => row.Field === column);
};

await connection.query(
  "ALTER TABLE users MODIFY role ENUM('admin','hod','faculty','student','parent') NOT NULL"
);

if (!(await hasColumn('sessions', 'start_time'))) {
  await connection.query('ALTER TABLE sessions ADD COLUMN start_time TIME NULL AFTER session_date');
}
if (!(await hasColumn('sessions', 'end_time'))) {
  await connection.query('ALTER TABLE sessions ADD COLUMN end_time TIME NULL AFTER start_time');
}
if (!(await hasColumn('sessions', 'room'))) {
  await connection.query('ALTER TABLE sessions ADD COLUMN room VARCHAR(50) NULL AFTER end_time');
}

await connection.query(
  "ALTER TABLE leave_requests MODIFY status ENUM('pending','recommended','approved','rejected') NOT NULL DEFAULT 'pending'"
);

if (!(await hasColumn('leave_requests', 'recommended_by'))) {
  await connection.query('ALTER TABLE leave_requests ADD COLUMN recommended_by INT UNSIGNED NULL AFTER status');
}
if (!(await hasColumn('leave_requests', 'recommendation_note'))) {
  await connection.query('ALTER TABLE leave_requests ADD COLUMN recommendation_note VARCHAR(500) NULL AFTER recommended_by');
}
if (!(await hasColumn('leave_requests', 'recommended_at'))) {
  await connection.query('ALTER TABLE leave_requests ADD COLUMN recommended_at DATETIME NULL AFTER recommendation_note');
}

await connection.query(`
  CREATE TABLE IF NOT EXISTS parent_students (
    parent_id INT UNSIGNED NOT NULL,
    student_id INT UNSIGNED NOT NULL,
    relationship VARCHAR(30) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (parent_id, student_id),
    KEY idx_parent_student (student_id),
    CONSTRAINT fk_ps_parent FOREIGN KEY (parent_id) REFERENCES users(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ps_student FOREIGN KEY (student_id) REFERENCES users(id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

await connection.query(`
  CREATE TABLE IF NOT EXISTS attendance_email_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id INT UNSIGNED NOT NULL,
    parent_id INT UNSIGNED NOT NULL,
    parent_email VARCHAR(150) NOT NULL,
    attendance_pct DECIMAL(5,2) NULL,
    subject VARCHAR(150) NULL,
    status ENUM('sent','failed','skipped') NOT NULL DEFAULT 'sent',
    message TEXT NULL,
    triggered_by INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_email_student (student_id),
    KEY idx_email_parent (parent_id),
    CONSTRAINT fk_ael_student FOREIGN KEY (student_id) REFERENCES users(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ael_parent FOREIGN KEY (parent_id) REFERENCES users(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ael_trigger FOREIGN KEY (triggered_by) REFERENCES users(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

await connection.query(
  `INSERT INTO users (name, email, password_hash, role, department)
   VALUES (?, ?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE
     name = VALUES(name),
     role = VALUES(role),
     department = VALUES(department),
     is_active = 1`,
  ['Dr. Kavita Rao', 'hod.cs@college.edu', hash, 'hod', 'Computer Science']
);

await connection.query(
  `INSERT INTO users (name, email, password_hash, role)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE
     name = VALUES(name),
     role = VALUES(role),
     is_active = 1`,
  ['Suresh Kumar', 'parent.arun@example.com', hash, 'parent']
);

const [[parent]] = await connection.query(
  'SELECT id FROM users WHERE email = ?',
  ['parent.arun@example.com']
);
const [[student]] = await connection.query(
  'SELECT id FROM users WHERE email = ?',
  ['arun.kumar@student.edu']
);

if (parent && student) {
  await connection.query(
    `INSERT IGNORE INTO parent_students (parent_id, student_id, relationship)
     VALUES (?, ?, ?)`,
    [parent.id, student.id, 'father']
  );
}

await connection.query(`
  UPDATE sessions
  SET
    start_time = COALESCE(start_time, MAKETIME(9 + MOD(id, 6), 0, 0)),
    end_time = COALESCE(end_time, MAKETIME(10 + MOD(id, 6), 0, 0)),
    room = COALESCE(room, CONCAT('Room ', 100 + MOD(id, 20)))
`);

const [roles] = await connection.query(
  'SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY role'
);
console.log(JSON.stringify(roles));

await connection.end();
