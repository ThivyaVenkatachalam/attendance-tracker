// All API responses follow this envelope:
// { success, data, message, meta? }
// { success, error: { code, message, details? } }

export function success(res, data = null, statusCode = 200, message = 'OK', meta = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(Object.keys(meta).length ? { meta } : {}),
  });
}

export function created(res, data, message = 'Created') {
  return success(res, data, 201, message);
}

export function noContent(res) {
  return res.status(204).send();
}

export function errorResponse(res, statusCode, code, message, details = null) {
  const body = {
    success: false,
    error: { code, message },
  };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

export function conflict(res, latestRecord, attempted = null) {
  return res.status(409).json({
    success: false,
    error: {
      code:    'VERSION_CONFLICT',
      message: 'This record was updated by someone else. Please resolve the conflict.',
      latest:  latestRecord,   // Client uses this for Compare / Reload
      ...(attempted ? { attempted } : {}),
    },
  });
}
