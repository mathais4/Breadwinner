import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express 4 doesn't catch rejected promises, so wrap async handlers.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (process.env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
