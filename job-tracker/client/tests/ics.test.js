import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, calendarItems, escapeText, fold } from '../src/lib/ics.js';

const NOW = new Date('2026-10-12T09:00:00Z');

test('escapes special characters', () => {
  assert.equal(escapeText('a,b;c\\d\nnext'), 'a\\,b\\;c\\\\d\\nnext');
});

test('folds long lines at 75 octets, including multi-byte characters', () => {
  const long = `SUMMARY:${'€'.repeat(60)}`;
  const folded = fold(long);
  for (const [i, line] of folded.split('\r\n').entries()) {
    assert.ok(new TextEncoder().encode(line).length <= 75, `line ${i} too long`);
    if (i > 0) assert.ok(line.startsWith(' '));
  }
  assert.equal(folded.replace(/\r\n /g, ''), long); // unfolding restores the original
  assert.equal(fold('short'), 'short');
});

test('builds a valid timed event with an alarm', () => {
  const ics = buildIcs([{ uid: 'a@x', summary: 'Interview: Stripe, Dublin', start: '2026-10-20T09:30:00Z', minutes: 45, alarm: '-PT1H' }], NOW);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  for (const line of ['UID:a@x', 'DTSTAMP:20261012T090000Z', 'DTSTART:20261020T093000Z', 'DTEND:20261020T101500Z', 'SUMMARY:Interview: Stripe\\, Dublin', 'TRIGGER:-PT1H']) assert.ok(ics.includes(line), line);
  assert.equal(ics.split('BEGIN:VEVENT').length - 1, ics.split('END:VEVENT').length - 1);
  assert.ok(!/[^\r]\n/.test(ics), 'every newline must be CRLF');
});

test('all-day events end on the following day (exclusive end), even at month end', () => {
  const ics = buildIcs([{ uid: 'd@x', summary: 'Closes', day: '2026-10-31' }], NOW);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261031'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20261101'));
});

test('calendarItems picks the right dates per status', () => {
  const apps = [
    { id: 1, company: 'A', role: 'R', status: 'interview', interview_date: '2026-10-20T09:00:00Z' },
    { id: 2, company: 'B', role: 'R', status: 'wishlist', deadline_date: '2026-11-01' },
    { id: 3, company: 'C', role: 'R', status: 'applied', follow_up_date: '2026-10-25', deadline_date: '2026-10-30' }, // already applied: no closing reminder
    { id: 4, company: 'D', role: 'R', status: 'rejected' },
  ];
  assert.deepEqual(calendarItems(apps).map((i) => i.uid), ['app-1-interview@launchpad', 'app-2-deadline@launchpad', 'app-3-followup@launchpad']);
});

test('empty list still produces a valid calendar', () => {
  assert.match(buildIcs([], NOW), /^BEGIN:VCALENDAR[\s\S]*END:VCALENDAR\r\n$/);
});
