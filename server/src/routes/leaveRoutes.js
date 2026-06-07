import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize }    from '../middleware/authorize.js';
import { validate }     from '../middleware/validate.js';
import {
  submitLeaveSchema,
  reviewLeaveSchema,
  leaveQuerySchema,
} from '../validators/leaveValidator.js';
import {
  submitLeave,
  getLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
  getAdjustedAttendance,
} from '../controllers/leaveController.js';

const router = Router();

router.use(authenticate);

// Student: submit leave
router.post('/',
  authorize('student'),
  validate(submitLeaveSchema),
  submitLeave
);

// Student: view own leaves
router.get('/me',
  authorize('student'),
  validate(leaveQuerySchema, 'query'),
  getMyLeaves
);

// Student: adjusted attendance (excludes approved leave days)
router.get('/me/adjusted-attendance',
  authorize('student'),
  getAdjustedAttendance
);

// Admin/HOD/faculty: list leave requests. HOD/faculty are scoped to department.
router.get('/',
  authorize('admin', 'hod', 'faculty'),
  validate(leaveQuerySchema, 'query'),
  getAllLeaves
);

// Admin/HOD: adjusted attendance for any student
router.get('/students/:studentId/adjusted-attendance',
  authorize('admin', 'hod'),
  getAdjustedAttendance
);

// All authenticated: view a specific leave (student sees own, admin sees all)
router.get('/:id',
  getLeave
);

// Faculty recommends, HOD/admin gives final approval or rejection.
router.patch('/:id/status',
  authorize('admin', 'hod', 'faculty'),
  validate(reviewLeaveSchema),
  reviewLeave
);

export default router;
