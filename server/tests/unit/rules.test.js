import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appliedDateOnCreate, appliedDateOnUpdate, isHttpUrl, isIsoDate } from '../../src/lib/rules.js';
import { buildListQuery, escapeLike } from '../../src/lib/listQuery.js';
import { csvCell, toCsv } from '../../src/lib/csv.js';
import { createLimiter } from '../../src/lib/rateLimit.js';

const NOW = new Date('2026-10-14T23:30:00Z');

test('isHttpUrl only allows http(s)', () => {
  assert.equal(isHttpUrl('https://example.com/job/1'), true);
  assert.equal(isHttpUrl('http://example.com'), true);
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://x.com', 'example.com', '', 'file:///etc/passwd']) assert.equal(isHttpUrl(bad), false, bad);
});

test('isIsoDate rejects impossible dates', () => {
  assert.equal(isIsoDate('2026-02-28'), true);
  assert.equal(isIsoDate('2028-02-29'), true);
  for (const bad of ['2026-02-31', '2026-13-01', '26-01-01', '2026-1-1', 'tomorrow', null, 20260101]) assert.equal(isIsoDate(bad), false, String(bad));
});

test('applied date defaults', () => {
  assert.equal(appliedDateOnCreate({ status: 'applied' }, NOW), '2026-10-14');
  assert.equal(appliedDateOnCreate({ status: 'wishlist' }, NOW), null);
  assert.equal(appliedDateOnCreate({ status: 'applied', applied_date: '2026-10-01' }, NOW), '2026-10-01');

  assert.equal(appliedDateOnUpdate({ applied_date: null }, { status: 'applied' }, NOW), '2026-10-14');
  assert.equal(appliedDateOnUpdate({ applied_date: '2026-10-01' }, { status: 'interview' }, NOW), undefined);
  assert.equal(appliedDateOnUpdate({ applied_date: null }, { status: 'wishlist' }, NOW), undefined);
  assert.equal(appliedDateOnUpdate({ applied_date: null }, { notes: 'x' }, NOW), undefined);
  assert.equal(appliedDateOnUpdate({ applied_date: '2026-10-01' }, { applied_date: null }, NOW), null); // explicit clear wins
});

test('escapeLike neutralises wildcards', () => {
  assert.equal(escapeLike('50%_off\\'), '50\\%\\_off\\\\');
});

test('buildListQuery numbers placeholders and whitelists sorting', () => {
  const q = buildListQuery({ userId: 7, q: 'dev%', status: 'applied', sort: 'company', order: 'asc', page: 3, limit: 10 });
  assert.match(q.whereSql, /^user_id = \$1 AND status = \$2 AND \(company ILIKE \$3 OR role ILIKE \$3/);
  assert.deepEqual(q.params, [7, 'applied', '%dev\\%%']);
  assert.equal(q.orderSql, 'lower(company) ASC, id DESC');
  assert.equal(q.offset, 20);
  assert.equal(buildListQuery({ userId: 1, sort: 'deadline_date', order: 'asc' }).orderSql, 'deadline_date ASC NULLS LAST, id DESC');
});

test('buildListQuery puts NULLS LAST on date sorts and rejects unknown sort keys', () => {
  assert.equal(buildListQuery({ userId: 1, sort: 'interview_date', order: 'asc' }).orderSql, 'interview_date ASC NULLS LAST, id DESC');
  assert.throws(() => buildListQuery({ userId: 1, sort: 'password_hash; DROP TABLE users' }), /Unsupported sort/);
});

test('csvCell quotes, escapes and defuses formulas', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell('=HYPERLINK("http://evil")'), '"\'=HYPERLINK(""http://evil"")"');
  assert.equal(csvCell('+1 555'), "'+1 555");
  assert.equal(csvCell('-5'), "'-5");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell(new Date('2026-10-14T10:00:00Z')), '2026-10-14T10:00:00.000Z');
});

test('toCsv has BOM, header and CRLF rows', () => {
  const out = toCsv([{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }], [{ a: 1, b: 'x,y' }]);
  assert.equal(out, '\uFEFFA,B\r\n1,"x,y"\r\n');
});

test('rate limiter blocks after max and recovers after the window', () => {
  let t = 1000;
  const lim = createLimiter({ windowMs: 60_000, max: 3, now: () => t });
  assert.deepEqual([1, 2, 3].map(() => lim.check('ip').allowed), [true, true, true]);
  const blocked = lim.check('ip');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSec, 60);
  assert.equal(lim.check('other').allowed, true); // separate key
  t += 60_001;
  assert.equal(lim.check('ip').allowed, true);
});
