import { z } from 'zod';
import { STATUSES, isHttpUrl, isIsoDate } from './rules.js';
import { SORT_KEYS } from './listQuery.js';

// HTML forms send '' for empty fields. Treat blank as "not set".
const blankToNull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);

const text = (max) => z.preprocess(blankToNull, z.string().trim().max(max).nullable());
const day = z.preprocess(blankToNull, z.string().refine(isIsoDate, 'Use the format YYYY-MM-DD').nullable());
const url = z.preprocess(
  blankToNull,
  z.string().trim().max(2000).refine(isHttpUrl, 'Must start with http:// or https://').nullable()
);

export const displayName = text(60);

const status = z.enum(STATUSES);

const fields = {
  company: z.string().trim().min(1, 'Company is required').max(200),
  role: z.string().trim().min(1, 'Role is required').max(200),
  status,
  interview_date: z.preprocess(blankToNull, z.string().datetime({ offset: true }).nullable()),
  notes: text(5000),
  job_url: url,
  location: text(120),
  source: text(80),
  salary: text(100),
  contact_name: text(120),
  applied_date: day,
  deadline_date: day,
  follow_up_date: day,
};

export const createSchema = z.object({
  company: fields.company,
  role: fields.role,
  status: status.default('applied'),
  interview_date: fields.interview_date.optional(),
  notes: fields.notes.optional(),
  job_url: fields.job_url.optional(),
  location: fields.location.optional(),
  source: fields.source.optional(),
  salary: fields.salary.optional(),
  contact_name: fields.contact_name.optional(),
  applied_date: fields.applied_date.optional(),
  deadline_date: fields.deadline_date.optional(),
  follow_up_date: fields.follow_up_date.optional(),
});

export const updateSchema = z
  .object(fields)
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

export const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: status.optional(),
  sort: z.enum(SORT_KEYS).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(10),
});

export const idSchema = z.coerce.number().int().positive();

export const profileSchema = z
  .object({
    display_name: displayName.optional(),
    weekly_goal: z.coerce.number().int().min(1, 'Goal must be at least 1').max(100).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });
