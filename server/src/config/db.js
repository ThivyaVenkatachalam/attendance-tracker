import mysql from 'mysql2/promise';
import { env } from './env.js';
import { logger } from './logger.js';

const pool = mysql.createPool({
  host:               env.DB_HOST,
  port:               env.DB_PORT,
  user:               env.DB_USER,
  password:           env.DB_PASSWORD,
  database:           env.DB_NAME,
  connectionLimit:    env.DB_POOL_MAX,
  waitForConnections: true,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
  // Return JS Date objects for DATE/DATETIME columns
  dateStrings: false,
  timezone: '+00:00',
});

// Verify connection on startup
export async function connectDB() {
  const conn = await pool.getConnection();
  logger.info(`✅  MySQL connected — ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
  conn.release();
}

// Graceful shutdown
export async function closeDB() {
  await pool.end();
  logger.info('MySQL pool closed');
}

export { pool as db };
