import { Router } from 'express';
import { authenticate }    from '../middleware/authenticate.js';
import { authorize }       from '../middleware/authorize.js';
import { validate }        from '../middleware/validate.js';
import {
  markAttendanceSchema,
  updateAttendanceSchema,
  bulkMarkSchema,
  attendanceQuerySchema,
} from '../validators/attendanceValidator.js';
import {
  getSession,
  listSessions,
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
  createTimetableSession,
  importCSV,
  importTimetableCSV,
  csvUpload,
  getMyAttendance,
} from '../controllers/attendanceController.js';

const router = Router();

// All routes require a valid JWT
router.use(authenticate);

// Student: view own attendance
router.get('/me',
  authorize('student'),
  validate(attendanceQuerySchema, 'query'),
  getMyAttendance
);

// Faculty / Admin: list sessions
router.get('/sessions',
  authorize('admin', 'faculty'),
  listSessions
);

// Admin / HOD: add a timetable session
router.post('/sessions',
  authorize('admin', 'hod'),
  createTimetableSession
);

// Faculty / Admin: get a session + its records
router.get('/sessions/:sessionId',
  authorize('admin', 'faculty'),
  getSession
);

// Faculty / Admin: mark single record
router.post('/',
  authorize('admin', 'faculty'),
  validate(markAttendanceSchema),
  markAttendance
);

// Faculty / Admin: bulk mark (entire class at once)
router.post('/sessions/:sessionId/bulk',
  authorize('admin', 'faculty'),
  validate(bulkMarkSchema),
  bulkMarkAttendance
);

// Faculty / Admin: update single record (OCC — must send version)
router.patch('/:recordId',
  authorize('admin', 'faculty'),
  validate(updateAttendanceSchema),
  updateAttendance
);

// Admin / Faculty: CSV import
router.post('/import',
  authorize('admin', 'faculty'),
  csvUpload,
  importCSV
);

// Admin / HOD: CSV import for timetable sessions
router.post('/sessions/import',
  authorize('admin', 'hod'),
  csvUpload,
  importTimetableCSV
);

export default router;
