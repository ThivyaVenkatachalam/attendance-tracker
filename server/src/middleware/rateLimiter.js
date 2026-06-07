import rateLimit from 'express-rate-limit';

const message = (action) => ({
  success: false,
  error: {
    code:    'RATE_LIMITED',
    message: `Too many ${action} attempts. Please try again later.`,
  },
});

// Strict: login / register — 10 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          message('login'),
  skipSuccessfulRequests: false,
});

// General API — 200 requests per minute
export const apiLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         message('API'),
});

// CSV upload — 20 per hour (heavy operation)
export const uploadLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         message('upload'),
});
