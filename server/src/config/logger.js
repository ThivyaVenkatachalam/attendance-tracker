import winston from 'winston';
import { env } from './env.js';
import { db as pool } from './db.js'; // ← add this import

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});

// Convenience: structured audit log
export function auditLog({ actorId, studentId, action, status, latencyMs, meta = {} }) {
  // 1. Log to console as before
  logger.info('audit', {
    actor_id:   actorId,
    student_id: studentId,
    action,
    status,
    latency_ms: latencyMs,
    ...meta,
  });

  // 2. Save to database ← ADD THIS
  pool.query(
    `INSERT INTO audit_logs (actor_id, student_id, action, status, latency_ms, meta)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      actorId ?? null,
      studentId ?? null,
      action,
      status,
      latencyMs ?? null,
      JSON.stringify(meta),
    ]
  ).catch((err) => {
    logger.error('Failed to write audit log to DB', { error: err.message });
  });
}