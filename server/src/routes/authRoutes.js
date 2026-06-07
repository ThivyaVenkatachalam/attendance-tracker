import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../validators/authValidator.js';

const router = Router();

// ── Public routes (no auth required) ─────────────────────────

// POST /api/auth/register
// Admin-only action in production — add authorize('admin') after authenticate if needed
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login
);

// POST /api/auth/refresh  — rotates access + refresh token
router.post('/refresh', authController.refresh);

// ── Protected routes (auth required) ─────────────────────────

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout);

// GET /api/auth/me  — returns current user profile
router.get('/me', authenticate, authController.me);

// PATCH /api/auth/change-password
router.patch(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
