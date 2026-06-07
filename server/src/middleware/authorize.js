import { AppError } from '../utils/AppError.js';
import { db } from '../config/db.js';

// ── Role-based access control ─────────────────────────────────
// Usage: router.post('/...', authenticate, authorize('admin'), controller)
//        router.post('/...', authenticate, authorize('admin','faculty'), controller)
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden(
        `This action requires one of these roles: ${roles.join(', ')}`
      ));
    }
    next();
  };
}
