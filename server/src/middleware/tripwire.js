import { AppError } from '../utils/AppError.js';
import { db } from '../config/db.js';

// TRIPWIRE: Rejects attendance writes if the faculty member is not
// assigned to the requested session.
// Reads session_id from req.body or req.params.
// Must come after authenticate + authorize('faculty','admin').
// Admins bypass this check.

export async function tripwire(req, _res, next) {
  try {
    if (req.user.role === 'admin') return next(); // admins are unrestricted

    const sessionId =
      req.body?.session_id ??
      req.params?.sessionId ??
      req.query?.session_id;

    if (!sessionId) return next(AppError.badRequest('session_id is required'));

    const [rows] = await db.query(
      'SELECT 1 FROM faculty_classes WHERE faculty_id = ? AND session_id = ?',
      [req.user.id, sessionId]
    );

    if (rows.length === 0) {
      // ── TRIPWIRE FIRED ────────────────────────────────────
      return next(AppError.forbidden(
        'You are not assigned to this class session. Attendance rejected.',
        'TRIPWIRE_VIOLATION'
      ));
    }

    next();
  } catch (err) {
    next(err);
  }
}
