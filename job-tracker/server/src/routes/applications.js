import { Router } from 'express';
import { pool, withTransaction } from '../db.js';
import { HttpError, asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { createSchema, idSchema, listSchema, updateSchema } from '../lib/schemas.js';
import { buildListQuery } from '../lib/listQuery.js';
import { appliedDateOnCreate, appliedDateOnUpdate } from '../lib/rules.js';
import { toCsv } from '../lib/csv.js';

const router = Router();
router.use(requireAuth);

// Columns a client may set. Insert/update statements are built from this list only.
const COLUMNS = [
  'company', 'role', 'status', 'interview_date', 'notes', 'job_url', 'location',
  'source', 'salary', 'contact_name', 'applied_date', 'deadline_date', 'follow_up_date',
];

const EXPORT_COLUMNS = [
  ['company', 'Company'], ['role', 'Role'], ['status', 'Status'], ['applied_date', 'Applied'],
  ['deadline_date', 'Closing date'], ['follow_up_date', 'Follow up'], ['interview_date', 'Interview'],
  ['location', 'Location'], ['source', 'Source'], ['salary', 'Salary'], ['contact_name', 'Contact'],
  ['job_url', 'Link'], ['notes', 'Notes'], ['created_at', 'Created'],
].map(([key, label]) => ({ key, label }));

// SECURITY: every query below filters by user_id so users only ever see their own rows.

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listSchema.parse(req.query);
    const { whereSql, params, orderSql, limit, offset } = buildListQuery({ userId: req.user.id, ...query });

    const total = (await pool.query(`SELECT COUNT(*)::int AS n FROM applications WHERE ${whereSql}`, params)).rows[0].n;
    // orderSql, limit and offset are built from whitelisted keys and validated integers.
    const { rows } = await pool.query(
      `SELECT * FROM applications WHERE ${whereSql} ORDER BY ${orderSql} LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    res.json({ data: rows, page: query.page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  })
);

// Must be registered before '/:id'.
router.get(
  '/export.csv',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC, id DESC', [req.user.id]);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="applications.csv"',
    });
    res.send(toCsv(EXPORT_COLUMNS, rows));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const d = createSchema.parse(req.body);
    const values = { ...d, applied_date: appliedDateOnCreate(d) };

    const created = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO applications (user_id, ${COLUMNS.join(', ')})
         VALUES ($1, ${COLUMNS.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING *`,
        [req.user.id, ...COLUMNS.map((c) => values[c] ?? null)]
      );
      await client.query(
        `INSERT INTO application_events (application_id, user_id, type, to_status) VALUES ($1, $2, 'created', $3)`,
        [rows[0].id, req.user.id, rows[0].status]
      );
      return rows[0];
    });
    res.status(201).json(created);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { rows } = await pool.query('SELECT * FROM applications WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!rows[0]) throw new HttpError(404, 'Application not found');
    res.json(rows[0]);
  })
);

router.get(
  '/:id/events',
  asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const owned = await pool.query('SELECT 1 FROM applications WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!owned.rowCount) throw new HttpError(404, 'Application not found');
    const { rows } = await pool.query(
      `SELECT id, type, from_status, to_status, created_at FROM application_events
       WHERE application_id = $1 AND user_id = $2 ORDER BY created_at ASC, id ASC`,
      [id, req.user.id]
    );
    res.json({ data: rows });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const patch = updateSchema.parse(req.body);

    const updated = await withTransaction(async (client) => {
      const current = (
        await client.query('SELECT * FROM applications WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, req.user.id])
      ).rows[0];
      if (!current) throw new HttpError(404, 'Application not found');

      // Moving a wishlist item forward stamps today as the applied date, unless the client sent one.
      const auto = appliedDateOnUpdate(current, patch);
      const data = auto === undefined ? patch : { ...patch, applied_date: auto };
      const keys = Object.keys(data); // only whitelisted keys survive zod parsing

      const { rows } = await client.query(
        `UPDATE applications SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')}, updated_at = now()
         WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2} RETURNING *`,
        [...keys.map((k) => data[k]), id, req.user.id]
      );
      if (patch.status && patch.status !== current.status) {
        await client.query(
          `INSERT INTO application_events (application_id, user_id, type, from_status, to_status)
           VALUES ($1, $2, 'status_change', $3, $4)`,
          [id, req.user.id, current.status, patch.status]
        );
      }
      return rows[0];
    });
    res.json(updated);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM applications WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!rowCount) throw new HttpError(404, 'Application not found');
    res.status(204).end();
  })
);

export default router;
