import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, closeDB } from './config/db.js';
import { metricsMiddleware } from './utils/metricsTracker.js';

// Routes
import authRoutes        from './routes/authRoutes.js';
import attendanceRoutes  from './routes/attendanceRoutes.js';
import leaveRoutes       from './routes/leaveRoutes.js';
import dashboardRoutes   from './routes/dashboardRoutes.js';
import userRoutes        from './routes/userRoutes.js';
import metricsRoutes     from './routes/metricsRoutes.js';
import portalRoutes      from './routes/portalRoutes.js';

// Global error handler
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ── Security ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      env.CLIENT_URL,
  credentials: true,             // allow cookies (refresh token)
  methods:     ['GET','POST','PUT','PATCH','DELETE'],
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── HTTP logging ──────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev', {
    stream: { write: msg => logger.http(msg.trim()) },
  }));
}

// ── Metrics middleware (must be before routes) ─────────────────
app.use(metricsMiddleware);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', env: env.NODE_ENV }));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/attendance',  attendanceRoutes);
app.use('/api/leave',       leaveRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/portal',      portalRoutes);
app.use('/metrics',         metricsRoutes);

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// ── Global error handler (must be last) ───────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
async function start() {
  await connectDB();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀  Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

if (env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  start().catch(err => {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  });
}

export default app; // for tests
