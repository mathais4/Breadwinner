import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { computeInsights } from '../lib/insights.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const uid = req.user.id;
    const [apps, events, user] = await Promise.all([
      pool.query(
        `SELECT id, company, role, status, applied_date, deadline_date, follow_up_date,
                interview_date, created_at, updated_at FROM applications WHERE user_id = $1`,
        [uid]
      ),
      pool.query(
        'SELECT application_id, type, from_status, to_status, created_at FROM application_events WHERE user_id = $1',
        [uid]
      ),
      pool.query('SELECT weekly_goal FROM users WHERE id = $1', [uid]),
    ]);
    res.json(computeInsights({ apps: apps.rows, events: events.rows, weeklyGoal: user.rows[0]?.weekly_goal ?? 5 }));
  })
);

export default router;
