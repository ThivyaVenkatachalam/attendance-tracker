-- ============================================================
-- Seed Data — Development & Testing
-- Run AFTER schema.sql
-- All passwords are: Test@1234
-- bcrypt hash (cost 12) of 'Test@1234'
-- $2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE attendance_email_logs;
TRUNCATE TABLE leave_requests;
TRUNCATE TABLE attendance_records;
TRUNCATE TABLE faculty_classes;
TRUNCATE TABLE parent_students;
TRUNCATE TABLE sessions;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, roll_no, department, semester) VALUES

-- Admin
(1, 'Admin User',      'admin@college.edu',
 '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'admin', NULL, NULL, NULL),

-- Faculty
(2, 'Dr. Priya Sharma',  'priya.sharma@college.edu',
 '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'faculty', NULL, 'Computer Science', NULL),

(3, 'Prof. Arjun Nair',  'arjun.nair@college.edu',
 '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'faculty', NULL, 'Computer Science', NULL),

(4, 'Dr. Meena Rajan',   'meena.rajan@college.edu',
 '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'faculty', NULL, 'Electronics', NULL),

-- HOD
(16, 'Dr. Kavita Rao', 'hod.cs@college.edu',
 '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'hod', NULL, 'Computer Science', NULL),

-- Parents
(17, 'Suresh Kumar', 'parent.arun@example.com',
 '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'parent', NULL, NULL, NULL),

-- Students — CS Sem 3
(5,  'Arun Kumar',     'arun.kumar@student.edu',    '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'CS2301', 'Computer Science', 3),
(6,  'Divya Menon',    'divya.menon@student.edu',   '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'CS2302', 'Computer Science', 3),
(7,  'Karthik Raj',    'karthik.raj@student.edu',   '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'CS2303', 'Computer Science', 3),
(8,  'Sneha Pillai',   'sneha.pillai@student.edu',  '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'CS2304', 'Computer Science', 3),
(9,  'Rahul Iyer',     'rahul.iyer@student.edu',    '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'CS2305', 'Computer Science', 3),
(10, 'Pooja Nambiar',  'pooja.nambiar@student.edu', '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'CS2306', 'Computer Science', 3),

-- Students — CS Sem 5
(11, 'Vivek Suresh',   'vivek.suresh@student.edu',  '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'CS2101', 'Computer Science', 5),
(12, 'Ananya Das',     'ananya.das@student.edu',    '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'CS2102', 'Computer Science', 5),
(13, 'Rohan Varma',    'rohan.varma@student.edu',   '$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'CS2103', 'Computer Science', 5),

-- Students — Electronics Sem 3
(14, 'Lakshmi Pillai', 'lakshmi.pillai@student.edu','$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'EC2301', 'Electronics', 3),
(15, 'Sanjay Krishnan','sanjay.krishnan@student.edu','$2b$12$Y9/g3B09u2vKp62ZYGMWCO/i.1D6jwWSUq/enexetHNAmPtI2uXH.', 'student', 'EC2302', 'Electronics', 3);


-- ------------------------------------------------------------
-- Parent Links
-- ------------------------------------------------------------
INSERT INTO parent_students (parent_id, student_id, relationship) VALUES
(17, 5, 'father');


-- ------------------------------------------------------------
-- Class Sessions
-- ------------------------------------------------------------
INSERT INTO sessions (id, subject, faculty_id, department, semester, session_date) VALUES
-- CS Sem 3 — Data Structures (Dr. Priya)
(1,  'Data Structures',          2, 'Computer Science', 3, CURDATE() - INTERVAL 20 DAY),
(2,  'Data Structures',          2, 'Computer Science', 3, CURDATE() - INTERVAL 18 DAY),
(3,  'Data Structures',          2, 'Computer Science', 3, CURDATE() - INTERVAL 15 DAY),
(4,  'Data Structures',          2, 'Computer Science', 3, CURDATE() - INTERVAL 13 DAY),
(5,  'Data Structures',          2, 'Computer Science', 3, CURDATE() - INTERVAL 10 DAY),
(6,  'Data Structures',          2, 'Computer Science', 3, CURDATE() - INTERVAL 8  DAY),
(7,  'Data Structures',          2, 'Computer Science', 3, CURDATE() - INTERVAL 5  DAY),
(8,  'Data Structures',          2, 'Computer Science', 3, CURDATE() - INTERVAL 3  DAY),
-- CS Sem 3 — DBMS (Prof. Arjun)
(9,  'Database Management',      3, 'Computer Science', 3, CURDATE() - INTERVAL 19 DAY),
(10, 'Database Management',      3, 'Computer Science', 3, CURDATE() - INTERVAL 16 DAY),
(11, 'Database Management',      3, 'Computer Science', 3, CURDATE() - INTERVAL 14 DAY),
(12, 'Database Management',      3, 'Computer Science', 3, CURDATE() - INTERVAL 11 DAY),
(13, 'Database Management',      3, 'Computer Science', 3, CURDATE() - INTERVAL 9  DAY),
(14, 'Database Management',      3, 'Computer Science', 3, CURDATE() - INTERVAL 6  DAY),
(15, 'Database Management',      3, 'Computer Science', 3, CURDATE() - INTERVAL 4  DAY),
-- CS Sem 5 (Prof. Arjun)
(16, 'Operating Systems',        3, 'Computer Science', 5, CURDATE() - INTERVAL 18 DAY),
(17, 'Operating Systems',        3, 'Computer Science', 5, CURDATE() - INTERVAL 15 DAY),
(18, 'Operating Systems',        3, 'Computer Science', 5, CURDATE() - INTERVAL 12 DAY),
(19, 'Operating Systems',        3, 'Computer Science', 5, CURDATE() - INTERVAL 9  DAY),
(20, 'Operating Systems',        3, 'Computer Science', 5, CURDATE() - INTERVAL 6  DAY),
-- Electronics (Dr. Meena)
(21, 'Circuit Theory',           4, 'Electronics',      3, CURDATE() - INTERVAL 20 DAY),
(22, 'Circuit Theory',           4, 'Electronics',      3, CURDATE() - INTERVAL 17 DAY),
(23, 'Circuit Theory',           4, 'Electronics',      3, CURDATE() - INTERVAL 14 DAY),
(24, 'Circuit Theory',           4, 'Electronics',      3, CURDATE() - INTERVAL 11 DAY),
(25, 'Circuit Theory',           4, 'Electronics',      3, CURDATE() - INTERVAL 8  DAY),
-- Today's session (pending attendance)
(26, 'Data Structures',          2, 'Computer Science', 3, CURDATE());


-- ------------------------------------------------------------
-- Faculty Class Assignments (tripwire table)
-- ------------------------------------------------------------
INSERT INTO faculty_classes (faculty_id, session_id) VALUES
-- Dr. Priya owns Data Structures sessions
(2,1),(2,2),(2,3),(2,4),(2,5),(2,6),(2,7),(2,8),(2,26),
-- Prof. Arjun owns DBMS and OS sessions
(3,9),(3,10),(3,11),(3,12),(3,13),(3,14),(3,15),
(3,16),(3,17),(3,18),(3,19),(3,20),
-- Dr. Meena owns Electronics sessions
(4,21),(4,22),(4,23),(4,24),(4,25);


-- ------------------------------------------------------------
-- Attendance Records
-- Mix of present/absent to create realistic attendance %
-- Some students will fall below 75% (warning badge trigger)
-- version=0 for all seed data (clean state)
-- ------------------------------------------------------------

-- Helper: Arun (CS2301) — good attendance ~87%
INSERT INTO attendance_records (session_id, student_id, status, marked_by) VALUES
(1,5,'present',2),(2,5,'present',2),(3,5,'present',2),(4,5,'absent',2),
(5,5,'present',2),(6,5,'present',2),(7,5,'present',2),(8,5,'present',2),
(9,5,'present',3),(10,5,'present',3),(11,5,'absent',3),(12,5,'present',3),
(13,5,'present',3),(14,5,'present',3),(15,5,'present',3);

-- Divya (CS2302) — borderline ~73% — triggers warning
INSERT INTO attendance_records (session_id, student_id, status, marked_by) VALUES
(1,6,'absent',2),(2,6,'absent',2),(3,6,'present',2),(4,6,'absent',2),
(5,6,'present',2),(6,6,'present',2),(7,6,'absent',2),(8,6,'present',2),
(9,6,'present',3),(10,6,'absent',3),(11,6,'present',3),(12,6,'absent',3),
(13,6,'present',3),(14,6,'present',3),(15,6,'absent',3);

-- Karthik (CS2303) — good ~93%
INSERT INTO attendance_records (session_id, student_id, status, marked_by) VALUES
(1,7,'present',2),(2,7,'present',2),(3,7,'present',2),(4,7,'present',2),
(5,7,'present',2),(6,7,'absent',2),(7,7,'present',2),(8,7,'present',2),
(9,7,'present',3),(10,7,'present',3),(11,7,'present',3),(12,7,'present',3),
(13,7,'present',3),(14,7,'absent',3),(15,7,'present',3);

-- Sneha (CS2304) — poor ~60% — triggers warning
INSERT INTO attendance_records (session_id, student_id, status, marked_by) VALUES
(1,8,'absent',2),(2,8,'absent',2),(3,8,'present',2),(4,8,'absent',2),
(5,8,'absent',2),(6,8,'present',2),(7,8,'absent',2),(8,8,'present',2),
(9,8,'absent',3),(10,8,'present',3),(11,8,'absent',3),(12,8,'present',3),
(13,8,'absent',3),(14,8,'present',3),(15,8,'absent',3);

-- Rahul (CS2305) — decent ~80%
INSERT INTO attendance_records (session_id, student_id, status, marked_by) VALUES
(1,9,'present',2),(2,9,'present',2),(3,9,'absent',2),(4,9,'present',2),
(5,9,'present',2),(6,9,'present',2),(7,9,'absent',2),(8,9,'present',2),
(9,9,'present',3),(10,9,'present',3),(11,9,'present',3),(12,9,'absent',3),
(13,9,'present',3),(14,9,'present',3),(15,9,'present',3);

-- Pooja (CS2306) — approved leave, will have status='leave'
INSERT INTO attendance_records (session_id, student_id, status, marked_by) VALUES
(1,10,'present',2),(2,10,'present',2),(3,10,'leave',2),(4,10,'leave',2),
(5,10,'present',2),(6,10,'present',2),(7,10,'present',2),(8,10,'present',2),
(9,10,'present',3),(10,10,'leave',3),(11,10,'leave',3),(12,10,'present',3),
(13,10,'present',3),(14,10,'present',3),(15,10,'present',3);

-- CS Sem 5 students
INSERT INTO attendance_records (session_id, student_id, status, marked_by) VALUES
(16,11,'present',3),(17,11,'present',3),(18,11,'absent',3),(19,11,'present',3),(20,11,'present',3),
(16,12,'present',3),(17,12,'absent',3),(18,12,'absent',3),(19,12,'present',3),(20,12,'present',3),
(16,13,'absent',3),(17,13,'absent',3),(18,13,'present',3),(19,13,'absent',3),(20,13,'present',3);

-- Electronics students
INSERT INTO attendance_records (session_id, student_id, status, marked_by) VALUES
(21,14,'present',4),(22,14,'present',4),(23,14,'absent',4),(24,14,'present',4),(25,14,'present',4),
(21,15,'absent',4),(22,15,'present',4),(23,15,'present',4),(24,15,'absent',4),(25,15,'present',4);


-- ------------------------------------------------------------
-- Leave Requests
-- ------------------------------------------------------------
INSERT INTO leave_requests (id, student_id, start_date, end_date, reason, status, reviewed_by, reviewed_at) VALUES
-- Approved leave (Pooja)
(1, 10,
 CURDATE() - INTERVAL 18 DAY,
 CURDATE() - INTERVAL 15 DAY,
 'Family function — out of station',
 'approved', 1, NOW() - INTERVAL 14 DAY),

-- Pending leave (Divya)
(2, 6,
 CURDATE() + INTERVAL 2 DAY,
 CURDATE() + INTERVAL 4 DAY,
 'Medical appointment — doctor-advised rest',
 'pending', NULL, NULL),

-- Rejected leave (Rahul)
(3, 9,
 CURDATE() - INTERVAL 10 DAY,
 CURDATE() - INTERVAL 9 DAY,
 'Personal work',
 'rejected', 1, NOW() - INTERVAL 9 DAY),

-- Pending (Sneha)
(4, 8,
 CURDATE() + INTERVAL 1 DAY,
 CURDATE() + INTERVAL 3 DAY,
 'Medical emergency',
 'pending', NULL, NULL);
