-- ============================================================
-- Attendance & Leave Tracker — Database Schema
-- MySQL 8.0+
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS attendance_email_logs;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS faculty_classes;
DROP TABLE IF EXISTS parent_students;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- users
-- Stores admin, faculty, and student accounts.
-- department + semester are NULL for admin/faculty.
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  email         VARCHAR(150)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  role          ENUM('admin','hod','faculty','student','parent') NOT NULL,
  roll_no       VARCHAR(30)     NULL,          -- students only
  department    VARCHAR(100)    NULL,
  semester      TINYINT UNSIGNED NULL,
  is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_email        (email),
  UNIQUE KEY uq_roll_no      (roll_no),
  KEY        idx_role        (role),
  KEY        idx_dept_sem    (department, semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- class_sessions
-- One row per class meeting (subject + faculty + date).
-- ------------------------------------------------------------
CREATE TABLE sessions (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  subject       VARCHAR(150)    NOT NULL,
  faculty_id    INT UNSIGNED    NOT NULL,
  department    VARCHAR(100)    NOT NULL,
  semester      TINYINT UNSIGNED NOT NULL,
  session_date  DATE            NOT NULL,
  start_time    TIME            NULL,
  end_time      TIME            NULL,
  room          VARCHAR(50)     NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_faculty      (faculty_id),
  KEY idx_date         (session_date),
  KEY idx_schedule     (department, semester, session_date, start_time),
  KEY idx_dept_sem     (department, semester),

  CONSTRAINT fk_session_faculty
    FOREIGN KEY (faculty_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- parent_students
-- Links parent portal users to the students they can view.
-- ------------------------------------------------------------
CREATE TABLE parent_students (
  parent_id     INT UNSIGNED    NOT NULL,
  student_id    INT UNSIGNED    NOT NULL,
  relationship  VARCHAR(30)     NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (parent_id, student_id),
  KEY idx_parent_student (student_id),

  CONSTRAINT fk_ps_parent
    FOREIGN KEY (parent_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_ps_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- faculty_classes
-- TRIPWIRE TABLE: defines which sessions a faculty member
-- is authorised to mark attendance for.
-- Server checks this before every attendance write.
-- ------------------------------------------------------------
CREATE TABLE faculty_classes (
  faculty_id    INT UNSIGNED    NOT NULL,
  session_id    INT UNSIGNED    NOT NULL,
  assigned_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (faculty_id, session_id),

  CONSTRAINT fk_fc_faculty
    FOREIGN KEY (faculty_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_fc_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- attendance_records
-- Core table. version column enables Optimistic Concurrency.
-- UNIQUE(session_id, student_id) makes CSV import idempotent.
-- status 'leave' is set automatically when leave is approved.
-- ------------------------------------------------------------
CREATE TABLE attendance_records (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  session_id    INT UNSIGNED    NOT NULL,
  student_id    INT UNSIGNED    NOT NULL,
  status        ENUM('present','absent','leave') NOT NULL DEFAULT 'absent',
  version       INT UNSIGNED    NOT NULL DEFAULT 0,  -- OCC field
  marked_by     INT UNSIGNED    NOT NULL,             -- faculty user id
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- Idempotency constraint: one record per student per session
  UNIQUE KEY uq_session_student (session_id, student_id),
  KEY idx_student    (student_id),
  KEY idx_session    (session_id),
  KEY idx_status     (status),

  CONSTRAINT fk_ar_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_ar_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_ar_marked_by
    FOREIGN KEY (marked_by) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- leave_requests
-- Students submit, staff advisor/class tutor recommends, HOD gives final approval.
-- When approved, matching absent attendance_records become leave.
-- ------------------------------------------------------------
CREATE TABLE leave_requests (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  student_id    INT UNSIGNED    NOT NULL,
  start_date    DATE            NOT NULL,
  end_date      DATE            NOT NULL,
  reason        TEXT            NOT NULL,
  document_url  VARCHAR(500)    NULL,
  status        ENUM('pending','recommended','approved','rejected') NOT NULL DEFAULT 'pending',
  recommended_by INT UNSIGNED   NULL,   -- faculty/class tutor user id
  recommendation_note VARCHAR(500) NULL,
  recommended_at DATETIME       NULL,
  reviewed_by   INT UNSIGNED    NULL,   -- HOD/admin user id
  admin_note    VARCHAR(500)    NULL,
  reviewed_at   DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_student   (student_id),
  KEY idx_status    (status),
  KEY idx_dates     (start_date, end_date),

  CONSTRAINT fk_lr_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_lr_recommender
    FOREIGN KEY (recommended_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_lr_reviewer
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT chk_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- attendance_email_logs
-- Audit trail for low-attendance parent alerts.
-- ------------------------------------------------------------
CREATE TABLE attendance_email_logs (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id     INT UNSIGNED    NOT NULL,
  parent_id      INT UNSIGNED    NOT NULL,
  parent_email   VARCHAR(150)    NOT NULL,
  attendance_pct DECIMAL(5,2)    NULL,
  subject        VARCHAR(150)    NULL,
  status         ENUM('sent','failed','skipped') NOT NULL DEFAULT 'sent',
  message        TEXT            NULL,
  triggered_by   INT UNSIGNED    NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_alert_day (student_id, parent_id, subject, created_at),
  KEY idx_email_student (student_id),
  KEY idx_email_parent  (parent_id),

  CONSTRAINT fk_ael_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_ael_parent
    FOREIGN KEY (parent_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_ael_trigger
    FOREIGN KEY (triggered_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- audit_logs
-- Immutable log of every significant action.
-- actor_id is NULL for system-generated actions.
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id      INT UNSIGNED    NULL,
  student_id    INT UNSIGNED    NULL,
  action        VARCHAR(60)     NOT NULL,  -- e.g. 'attendance.create'
  entity_type   VARCHAR(60)     NULL,
  entity_id     INT UNSIGNED    NULL,
  status        ENUM('success','failure') NOT NULL,
  latency_ms    SMALLINT UNSIGNED NULL,
  meta          JSON            NULL,       -- extra context
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_actor     (actor_id),
  KEY idx_student   (student_id),
  KEY idx_action    (action),
  KEY idx_created   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- Views (server computes dashboards from these)
-- ============================================================

-- Student attendance summary per subject
CREATE OR REPLACE VIEW vw_student_attendance AS
SELECT
  ar.student_id,
  cs.subject,
  cs.department,
  cs.semester,
  COUNT(*)                                                   AS total_sessions,
  SUM(ar.status = 'present')                                 AS present_count,
  SUM(ar.status = 'leave')                                   AS leave_count,
  ROUND(
    (SUM(ar.status = 'present') + SUM(ar.status = 'leave'))
    / COUNT(*) * 100, 2
  )                                                          AS attendance_pct
FROM attendance_records ar
JOIN sessions cs ON cs.id = ar.session_id
GROUP BY ar.student_id, cs.subject, cs.department, cs.semester;


-- Students below 75% (warning flag)
CREATE OR REPLACE VIEW vw_attendance_warnings AS
SELECT
  u.id            AS student_id,
  u.name,
  u.roll_no,
  u.department,
  u.semester,
  ROUND(
    (SUM(ar.status = 'present') + SUM(ar.status = 'leave'))
    / NULLIF(COUNT(*), 0) * 100, 2
  )               AS overall_attendance_pct
FROM users u
  JOIN attendance_records ar ON ar.student_id = u.id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.roll_no, u.department, u.semester
HAVING overall_attendance_pct < 75;
