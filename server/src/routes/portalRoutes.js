import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getCalendar,
  getHodPortal,
  getParentPortal,
  getTimetable,
  sendLowAttendanceAlerts,
} from '../controllers/portalController.js';

const router = Router();

router.use(authenticate);

router.get('/timetable',
  authorize('admin', 'hod', 'faculty', 'student', 'parent'),
  getTimetable
);

router.get('/calendar',
  authorize('admin', 'hod', 'faculty', 'student', 'parent'),
  getCalendar
);

router.get('/hod',
  authorize('hod'),
  getHodPortal
);

router.get('/parent',
  authorize('parent'),
  getParentPortal
);

router.post('/alerts/low-attendance',
  authorize('admin', 'hod'),
  sendLowAttendanceAlerts
);

export default router;
