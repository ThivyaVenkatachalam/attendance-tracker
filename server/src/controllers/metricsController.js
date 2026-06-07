import { getMetrics as fetchMetrics } from '../utils/metricsTracker.js';
import { success } from '../utils/responseHelper.js';

// GET /api/metrics
// Returns rolling-window latency stats for every tracked operation
export const getMetrics = (_req, res) => {
  const data = fetchMetrics();
  return success(res, data);
};

// GET /api/metrics/health
// Lightweight liveness check (used by load balancers / uptime monitors)
export const getHealth = (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime_s:  Math.floor(process.uptime()),
  });
};
