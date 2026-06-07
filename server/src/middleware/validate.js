// Usage: router.post('/path', validate(myZodSchema), controller)
// Validates req.body by default; pass 'query' or 'params' for other sources.

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      // Pass ZodError to global error handler which formats it
      return next(result.error);
    }
    // Replace raw input with parsed + coerced data
    req[source] = result.data;
    next();
  };
}
