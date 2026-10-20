import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db.js';
import { JWT_SECRET } from '../config.js';
import { HttpError, asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { displayName } from '../lib/schemas.js';
import { rateLimit } from '../lib/rateLimit.js';

const router = Router();

const email = z.string().trim().toLowerCase().email('Enter a valid email');
const registerSchema = z.object({
  email,
  display_name: displayName.optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});
const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });

const USER_COLS = 'id, email, display_name, weekly_goal';
// 20 attempts per 15 minutes per IP on the credential endpoints.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const sign = (userId) => jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '7d' });

router.post(
  '/register',
  limiter,
  asyncHandler(async (req, res) => {
    const { email, password, display_name } = registerSchema.parse(req.body);
    const hash = await bcrypt.hash(password, 10);
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING ${USER_COLS}`,
        [email, hash, display_name ?? null]
      );
      res.status(201).json({ token: sign(rows[0].id), user: rows[0] });
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'Email is already registered');
      throw err;
    }
  })
);

router.post(
  '/login',
  limiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { rows } = await pool.query(
      `SELECT ${USER_COLS}, password_hash FROM users WHERE email = $1`,
      [email]
    );
    const user = rows[0];
    // Same message for unknown email and wrong password: don't leak which emails exist.
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) throw new HttpError(401, 'Invalid email or password');
    const { password_hash, ...profile } = user;
    res.json({ token: sign(user.id), user: profile });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [req.user.id]);
    if (!rows[0]) throw new HttpError(401, 'User no longer exists');
    res.json({ user: rows[0] });
  })
);

export default router;
