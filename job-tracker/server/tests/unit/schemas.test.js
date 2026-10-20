import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchema, listSchema, profileSchema, updateSchema } from '../../src/lib/schemas.js';

const ok = (schema, input) => schema.safeParse(input);

test('create: defaults status, turns blank strings into null, trims', () => {
  const r = ok(createSchema, { company: '  Stripe ', role: 'Graduate SWE', notes: '   ', location: 'Dublin', job_url: '', deadline_date: '' });
  assert.equal(r.success, true);
  assert.equal(r.data.company, 'Stripe');
  assert.equal(r.data.status, 'applied');
  assert.equal(r.data.notes, null);
  assert.equal(r.data.job_url, null);
  assert.equal(r.data.deadline_date, null);
  assert.equal(r.data.location, 'Dublin');
});

test('create: absent optional fields stay absent (so they are not written as null)', () => {
  const r = ok(createSchema, { company: 'A', role: 'B' });
  assert.equal(r.success, true);
  assert.equal('notes' in r.data, false);
  assert.equal('applied_date' in r.data, false);
});

test('create: rejects bad urls, dates and statuses', () => {
  assert.equal(ok(createSchema, { company: 'A', role: 'B', job_url: 'javascript:alert(1)' }).success, false);
  assert.equal(ok(createSchema, { company: 'A', role: 'B', deadline_date: '2026-02-31' }).success, false);
  assert.equal(ok(createSchema, { company: 'A', role: 'B', status: 'ghosted' }).success, false);
  assert.equal(ok(createSchema, { company: '', role: 'B' }).success, false);
  assert.equal(ok(createSchema, { company: 'A', role: 'B', interview_date: 'next tuesday' }).success, false);
});

test('create: ignores unknown fields instead of passing them through', () => {
  const r = ok(createSchema, { company: 'A', role: 'B', user_id: 99, id: 5 });
  assert.equal(r.success, true);
  assert.equal('user_id' in r.data, false);
});

test('update: partial, can clear fields with null or blank, needs at least one field', () => {
  assert.equal(ok(updateSchema, {}).success, false);
  const r = ok(updateSchema, { follow_up_date: '', status: 'interview' });
  assert.equal(r.success, true);
  assert.deepEqual(Object.keys(r.data).sort(), ['follow_up_date', 'status']);
  assert.equal(r.data.follow_up_date, null);
  assert.equal(ok(updateSchema, { applied_date: null }).data.applied_date, null);
});

test('list: coerces numbers, enforces whitelist and limits', () => {
  const r = ok(listSchema, { page: '2', limit: '50', sort: 'applied_date' });
  assert.equal(r.success, true);
  assert.equal(r.data.limit, 50);
  assert.equal(ok(listSchema, { limit: '500' }).success, false);
  assert.equal(ok(listSchema, { sort: 'password_hash' }).success, false);
  assert.equal(ok(listSchema, {}).data.sort, 'created_at');
});

test('profile: name and goal validation', () => {
  assert.equal(ok(profileSchema, {}).success, false);
  assert.equal(ok(profileSchema, { weekly_goal: 0 }).success, false);
  assert.equal(ok(profileSchema, { weekly_goal: '7' }).data.weekly_goal, 7);
  assert.equal(ok(profileSchema, { display_name: '  ' }).data.display_name, null);
  assert.equal(ok(profileSchema, { display_name: 'x'.repeat(61) }).success, false);
});
