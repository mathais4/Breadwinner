import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { HttpError } from './error.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Missing or malformed Authorization header'));
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: Number(payload.sub) };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}
