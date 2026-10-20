import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret';
export const PORT = process.env.PORT || 4000;
export const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
