import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween, daysFromToday, formatDay, localIso, relativeDay, weekdayLong } from '../src/lib/dates.js';

test('localIso uses the local calendar day', () => {
  assert.equal(localIso(new Date(2026, 9, 14, 23, 59)), '2026-10-14');
  assert.equal(localIso(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('day arithmetic crosses month, year and leap boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(daysBetween('2026-10-25', '2026-10-26'), 1); // clocks go back that night: still one day
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2); // clocks go forward in between
});

test('daysFromToday', () => {
  const now = new Date(2026, 9, 14, 15, 0);
  assert.equal(daysFromToday('2026-10-14', now), 0);
  assert.equal(daysFromToday('2026-10-21', now), 7);
  assert.equal(daysFromToday('2026-10-01', now), -13);
});

test('formatting', () => {
  assert.equal(formatDay('2026-10-14'), '14 Oct');
  assert.equal(formatDay('2026-10-14', true), '14 Oct 2026');
  assert.equal(formatDay(null), '');
  assert.equal(weekdayLong('2026-10-14'), 'Wednesday');
});

test('relativeDay wording', () => {
  assert.deepEqual([0, 1, -1, 5, -5].map(relativeDay), ['today', 'tomorrow', 'yesterday', 'in 5 days', '5 days ago']);
});
