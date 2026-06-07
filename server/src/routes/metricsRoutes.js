import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize }    from '../middleware/authorize.js';
import { getMetrics, getHealth } from '../controllers/metricsController.js';

const router = Router();

// Health check — public (no auth needed for uptime monitors)
router.get('/health', getHealth);

// Metrics — admin only
router.get('/', authenticate, authorize('admin'), getMetrics);

export default router;
