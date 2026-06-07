// Lightweight in-memory metrics tracker.
// Tracks count, avg, and p95 latency per operation name.
// Resets on server restart — use prom-client for persistence.

const metrics = new Map();
const MAX_SAMPLES = 1000; // rolling window per operation

function getOrCreate(operation) {
  if (!metrics.has(operation)) {
    metrics.set(operation, { count: 0, samples: [] });
  }
  return metrics.get(operation);
}

export function recordMetric(operation, latencyMs) {
  const m = getOrCreate(operation);
  m.count += 1;
  m.samples.push(latencyMs);
  // Keep rolling window
  if (m.samples.length > MAX_SAMPLES) m.samples.shift();
}

export function getMetrics() {
  const result = {};
  for (const [op, { count, samples }] of metrics.entries()) {
    if (samples.length === 0) continue;
    const sorted = [...samples].sort((a, b) => a - b);
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const p95idx = Math.floor(sorted.length * 0.95);
    result[op] = {
      count,
      avg_ms:  Math.round(avg),
      p95_ms:  sorted[p95idx] ?? sorted[sorted.length - 1],
    };
  }
  return result;
}

// Express middleware: auto-records latency for every request
// Attach to app before routes
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const latency = Date.now() - start;
    // e.g. "POST /api/attendance" → operation key
    const op = `${req.method} ${req.route?.path ?? req.path}`;
    recordMetric(op, latency);
  });
  next();
}

// Backwards-compatible object used by controllers
export const metricsTracker = {
  record: recordMetric,
  getAll: getMetrics,
};
