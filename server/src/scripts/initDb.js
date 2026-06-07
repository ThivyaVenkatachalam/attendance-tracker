import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  // Navigate from server/src/scripts → server/src → server → workspace root → database/
  const schemaPath = path.join(__dirname, '..', '..', '..', 'database', 'schema.sql');
  const seedPath = path.join(__dirname, '..', '..', '..', 'database', 'seed.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql not found at', schemaPath);
    process.exit(1);
  }
  if (!fs.existsSync(seedPath)) {
    console.error('seed.sql not found at', seedPath);
    process.exit(1);
  }
  
  return runWithSchema(schemaPath, seedPath);
}

async function runWithSchema(schemaPath, seedPath) {

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  // Connect without database to ensure DB exists, allow multiple statements
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    logger.info(`Initializing database ${env.DB_NAME}...`);

    // Drop database if exists (to avoid FK constraint conflicts), then recreate
    await conn.query(`DROP DATABASE IF EXISTS \`${env.DB_NAME}\``);

    // Create database, run schema, then run seed
    const fullSql = `
CREATE DATABASE \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; 
USE \`${env.DB_NAME}\`;
${schemaSql}
${seedSql}
    `;
    await conn.query(fullSql);

    logger.info('Database initialized successfully with seed data');
    process.exit(0);
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
