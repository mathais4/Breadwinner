import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, computeInsights, daysBetween, goalStreak, weekStart, weeklyCounts } from '../../src/lib/insights.js';

const NOW = new Date('2026-10-14T12:00:00Z'); // a Wednesday
const app = (id, status, extra = {}) => ({ id, company: `Co${id}`, role: 'Grad', status, created_at: '2026-10-01T09:00:00Z', updated_at: `2026-10-0${id}T09:00:00Z`, ...extra });
const ev = (application_id, to_status, day, from_status = null, type = 'status_change') => ({ application_id, type, from_status, to_status, created_at: `${day}T10:00:00Z` });

test('date helpers', () => {
  assert.equal(daysBetween('2026-10-01', '2026-10-14'), 13);
  assert.equal(daysBetween('2026-10-14', '2026-10-01'), -13);
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(weekStart('2026-10-14'), '2026-10-12'); // Wednesday -> Monday
  assert.equal(weekStart('2026-10-18'), '2026-10-12'); // Sunday belongs to the week that started Monday
  assert.equal(weekStart('2026-10-12'), '2026-10-12');
});

test('weeklyCounts buckets applied dates and ignores missing ones', () => {
  const w = weeklyCounts([app(1, 'applied', { applied_date: '2026-10-13' }), app(2, 'applied', { applied_date: '2026-10-12' }), app(3, 'applied', { applied_date: '2026-10-05' }), app(4, 'wishlist'), app(5, 'applied', { applied_date: '2020-01-01' })], '2026-10-14', 3);
  assert.deepEqual(w, [
    { weekStart: '2026-09-28', count: 0 },
    { weekStart: '2026-10-05', count: 1 },
    { weekStart: '2026-10-12', count: 2 },
  ]);
});

test('goalStreak: current week in progress does not break the streak', () => {
  const w = (...c) => c.map((count, i) => ({ weekStart: String(i), count }));
  assert.equal(goalStreak(w(5, 6, 5), 5), 3); // current week met
  assert.equal(goalStreak(w(5, 6, 1), 5), 2); // current week not yet met, still 2 behind it
  assert.equal(goalStreak(w(5, 2, 5), 5), 1); // gap breaks it
  assert.equal(goalStreak(w(0, 0, 0), 5), 0);
});

test('totals, statuses and goal', () => {
  const out = computeInsights({ apps: [app(1, 'applied', { applied_date: '2026-10-13' }), app(2, 'wishlist')], events: [], weeklyGoal: 3, now: NOW });
  assert.equal(out.total, 2);
  assert.equal(out.byStatus.applied, 1);
  assert.deepEqual(out.goal, { target: 3, thisWeek: 1, streak: 0 });
  assert.equal(out.weekly.length, 8);
});

test('funnel counts stages reached using history, and offers imply an interview', () => {
  const apps = [
    app(1, 'rejected', { applied_date: '2026-09-01' }), // interviewed, then rejected
    app(2, 'offer', { applied_date: '2026-09-02' }),
    app(3, 'applied', { applied_date: '2026-09-03' }),
    app(4, 'wishlist'),
    app(5, 'rejected', { applied_date: '2026-09-04' }), // rejected straight away
  ];
  const events = [ev(1, 'interview', '2026-09-10', 'applied'), ev(1, 'rejected', '2026-09-20', 'interview'), ev(5, 'rejected', '2026-09-08', 'applied')];
  const out = computeInsights({ apps, events, now: NOW });
  assert.deepEqual(out.funnel, { applied: 4, interview: 2, offer: 1 });
  assert.equal(out.responseRate, 3 / 4); // apps 1, 2, 5 replied
});

test('average days to first response uses the earliest reply', () => {
  const apps = [app(1, 'interview', { applied_date: '2026-09-01' }), app(2, 'rejected', { applied_date: '2026-09-10' }), app(3, 'applied', { applied_date: '2026-09-12' })];
  const events = [ev(1, 'interview', '2026-09-08', 'applied'), ev(1, 'offer', '2026-09-30', 'interview'), ev(2, 'rejected', '2026-09-14', 'applied')];
  assert.equal(computeInsights({ apps, events, now: NOW }).avgDaysToResponse, 5.5); // (7 + 4) / 2
});

test('no data gives nulls, not NaN', () => {
  const out = computeInsights({ apps: [], events: [], now: NOW });
  assert.equal(out.responseRate, null);
  assert.equal(out.avgDaysToResponse, null);
  assert.deepEqual(out.funnel, { applied: 0, interview: 0, offer: 0 });
});

test('follow-ups: explicit dates first, then applications gone quiet', () => {
  const apps = [
    app(1, 'applied', { applied_date: '2026-10-10', follow_up_date: '2026-10-13' }), // due, 1 day overdue
    app(2, 'applied', { applied_date: '2026-10-01' }), // 13 days: not stale yet
    app(3, 'applied', { applied_date: '2026-09-20' }), // 24 days quiet
    app(4, 'applied', { applied_date: '2026-09-25', follow_up_date: '2026-10-20' }), // future date: leave alone
    app(5, 'interview', { applied_date: '2026-08-01' }), // not "applied": ignored
    app(6, 'applied', { applied_date: '2026-09-29' }), // exactly 15 days quiet
  ];
  const f = computeInsights({ apps, events: [], now: NOW }).followUps;
  assert.deepEqual(f.map((x) => [x.id, x.reason]), [[1, 'due'], [3, 'stale'], [6, 'stale']]);
  assert.equal(f[0].daysOverdue, 1);
  assert.equal(f[1].daysQuiet, 24);
});

test('deadlines: next 30 days for wishlist roles, missed ones counted separately', () => {
  const apps = [
    app(1, 'wishlist', { deadline_date: '2026-10-14' }), // today
    app(2, 'wishlist', { deadline_date: '2026-10-20' }),
    app(3, 'wishlist', { deadline_date: '2026-12-31' }), // too far
    app(4, 'wishlist', { deadline_date: '2026-10-01' }), // missed
    app(5, 'applied', { deadline_date: '2026-10-15' }), // already applied: not a reminder
  ];
  const out = computeInsights({ apps, events: [], now: NOW });
  assert.deepEqual(out.deadlines.map((d) => [d.id, d.daysLeft]), [[1, 0], [2, 6]]);
  assert.equal(out.missedDeadlines, 1);
});

test('upcoming interviews exclude past ones and are sorted; recent is newest first', () => {
  const apps = [app(1, 'interview', { interview_date: '2026-10-20T09:00:00Z' }), app(2, 'interview', { interview_date: '2026-10-15T09:00:00Z' }), app(3, 'interview', { interview_date: '2026-09-01T09:00:00Z' })];
  const out = computeInsights({ apps, events: [], now: NOW });
  assert.deepEqual(out.upcomingInterviews.map((a) => a.id), [2, 1]);
  assert.deepEqual(out.recent.map((a) => a.id), [3, 2, 1]);
});
