import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { profileSchema } from '../lib/schemas.js';

const router = Router();
router.use(requireAuth);

router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const data = profileSchema.parse(req.body);
    const keys = Object.keys(data);
    const { rows } = await pool.query(
      `UPDATE users SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')}
       WHERE id = $${keys.length + 1} RETURNING id, email, display_name, weekly_goal`,
      [...keys.map((k) => data[k]), req.user.id]
    );
    if (!rows[0]) throw new HttpError(401, 'User no longer exists');
    res.json({ user: rows[0] });
  })
);

export default router;
