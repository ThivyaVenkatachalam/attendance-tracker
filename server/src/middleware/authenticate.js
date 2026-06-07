import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { db } from '../config/db.js';

export async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw AppError.unauthorized();

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);

    // Verify user still exists and is active
    const [rows] = await db.query(
      'SELECT id, name, email, role, department, semester, roll_no FROM users WHERE id = ? AND is_active = 1',
      [payload.sub]
    );

    if (rows.length === 0) throw AppError.unauthorized('Account not found or deactivated');

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}
