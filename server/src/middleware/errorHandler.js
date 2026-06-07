import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, _next) {
  // Known operational errors (thrown intentionally)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code:    err.code,
        message: err.message,
        ...(err.meta && Object.keys(err.meta).length ? { details: err.meta } : {}),
      },
    });
  }

  // Zod validation errors (from validate middleware)
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      error: {
        code:    'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  }

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ENTRY', message: 'Record already exists' },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' },
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
    });
  }

  // Unknown / programming errors — log full stack, hide details from client
  logger.error('Unhandled error', {
    error:  err.message,
    stack:  err.stack,
    path:   req.path,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}
