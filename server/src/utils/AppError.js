export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', meta = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code       = code;
    this.meta       = meta;
    this.isOperational = true;  // distinguishes known errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', meta = {}) {
    return new AppError(message, 400, code, meta);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Access denied') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(resource = 'Resource') {
    return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  static conflict(message, meta = {}) {
    return new AppError(message, 409, 'VERSION_CONFLICT', meta);
  }

  static unprocessable(message, meta = {}) {
    return new AppError(message, 422, 'VALIDATION_ERROR', meta);
  }
}
