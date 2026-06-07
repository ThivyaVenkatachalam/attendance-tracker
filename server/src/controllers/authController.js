import * as authService from '../services/authService.js';
import { success, created } from '../utils/responseHelper.js';
import { auditLog } from '../config/logger.js';
import { env } from '../config/env.js';

// Cookie config for refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,                              // JS cannot read it
  secure:   env.NODE_ENV === 'production',     // HTTPS only in prod
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,          // 7 days in ms
  path:     '/api/auth/refresh',               // scoped — not sent on every request
};

// ── POST /api/auth/register ───────────────────────────────────
export async function register(req, res, next) {
  const start = Date.now();
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body);

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    auditLog({
      actorId:   user.id,
      action:    'auth.register',
      status:    'success',
      latencyMs: Date.now() - start,
      meta:      { role: user.role },
    });

    return created(res, { user, accessToken, refreshToken }, 'Account created successfully');
  } catch (err) {
    auditLog({
      action:    'auth.register',
      status:    'failure',
      latencyMs: Date.now() - start,
      meta:      { email: req.body?.email, error: err.message },
    });
    next(err);
  }
}

// ── POST /api/auth/login ──────────────────────────────────────
export async function login(req, res, next) {
  const start = Date.now();
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    auditLog({
      actorId:   user.id,
      action:    'auth.login',
      status:    'success',
      latencyMs: Date.now() - start,
      meta:      { role: user.role },
    });

    return success(res, { user, accessToken, refreshToken }, 200, 'Login successful');
  } catch (err) {
    auditLog({
      action:    'auth.login',
      status:    'failure',
      latencyMs: Date.now() - start,
      meta:      { email: req.body?.email },
    });
    next(err);
  }
}

// ── POST /api/auth/refresh ────────────────────────────────────
export async function refresh(req, res, next) {
  try {
    // Accept from cookie (web) or body (mobile)
    const token = req.cookies?.refreshToken ?? req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token not provided' },
      });
    }

    const { accessToken, refreshToken } = await authService.refreshAccessToken(token);

    // Rotate cookie
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    return success(res, { accessToken }, 200, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/logout ─────────────────────────────────────
export async function logout(req, res) {
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  return success(res, null, 200, 'Logged out successfully');
}

// ── GET /api/auth/me ──────────────────────────────────────────
export async function me(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/auth/change-password ──────────────────────────
export async function changePassword(req, res, next) {
  const start = Date.now();
  try {
    await authService.changePassword(req.user.id, req.body);

    auditLog({
      actorId:   req.user.id,
      action:    'auth.change_password',
      status:    'success',
      latencyMs: Date.now() - start,
    });

    return success(res, null, 200, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
}
