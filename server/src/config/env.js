import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV:             z.enum(['development', 'production', 'test']).default('development'),
  PORT:                 z.coerce.number().default(5000),

  DB_HOST:              z.string().min(1),
  DB_PORT:              z.coerce.number().default(3306),
  DB_USER:              z.string().min(1),
  DB_PASSWORD:          z.string().default(''),
  DB_NAME:              z.string().min(1),
  DB_POOL_MIN:          z.coerce.number().default(2),
  DB_POOL_MAX:          z.coerce.number().default(10),

  JWT_ACCESS_SECRET:    z.string().min(32),
  JWT_REFRESH_SECRET:   z.string().min(32),
  JWT_ACCESS_EXPIRES:   z.string().default('15m'),
  JWT_REFRESH_EXPIRES:  z.string().default('7d'),

  CLIENT_URL:           z.string().url(),
  LOG_LEVEL:            z.enum(['error','warn','info','http','debug']).default('info'),

  // Email / SMTP
  SMTP_HOST:            z.string().default('smtp.gmail.com'),
  SMTP_PORT:            z.coerce.number().default(587),
  SMTP_USER:            z.string().email().optional(),
  SMTP_PASS:            z.string().optional(),
  SMTP_FROM:            z.string().default('AttendEase <no-reply@attendease.com>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n');
  parsed.error.issues.forEach(issue => {
    console.error(`   ${issue.path.join('.')} — ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;