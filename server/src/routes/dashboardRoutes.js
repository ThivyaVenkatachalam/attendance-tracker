import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize }    from '../middleware/authorize.js';
import { getDashboard, getWarningReport } from '../controllers/dashboardController.js';

const router = Router();

router.use(authenticate);

// Role-aware: same URL, different data per role
router.get('/', getDashboard);

// Admin only: warning report
router.get('/warnings',
  authorize('admin'),
  getWarningReport
);

export default router;
