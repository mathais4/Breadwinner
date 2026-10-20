import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { api, auth, setupDb, cleanDb, closeDb, registerUser } from './helpers.js';

beforeAll(setupDb);
beforeEach(cleanDb);
afterAll(closeDb);

const create = (token, body) => api().post('/api/applications').set(auth(token)).send(body);
const patch = (token, id, body) => api().patch(`/api/applications/${id}`).set(auth(token)).send(body);
const events = async (token, id) => (await api().get(`/api/applications/${id}/events`).set(auth(token))).body.data;
const today = () => new Date().toISOString().slice(0, 10);

describe('application details', () => {
  it('stores the extra fields and stamps today as the applied date', async () => {
    const token = await registerUser();
    const res = await create(token, {
      company: 'Stripe', role: 'Graduate SWE', location: 'Dublin', source: 'DCU Job Fair',
      salary: '€45,000', job_url: 'https://example.com/job', deadline_date: '2026-11-15', contact_name: 'Aoife',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ location: 'Dublin', source: 'DCU Job Fair', deadline_date: '2026-11-15', contact_name: 'Aoife', applied_date: today() });
  });

  it('wishlist items have no applied date until they move forward', async () => {
    const token = await registerUser();
    const { body } = await create(token, { company: 'A', role: 'B', status: 'wishlist' });
    expect(body.applied_date).toBeNull();
    const moved = await patch(token, body.id, { status: 'applied' });
    expect(moved.body.applied_date).toBe(today());
  });

  it('rejects javascript: links and impossible dates', async () => {
    const token = await registerUser();
    expect((await create(token, { company: 'A', role: 'B', job_url: 'javascript:alert(1)' })).status).toBe(400);
    expect((await create(token, { company: 'A', role: 'B', deadline_date: '2026-02-31' })).status).toBe(400);
  });

  it('lets you clear an optional field with a blank value', async () => {
    const token = await registerUser();
    const { body } = await create(token, { company: 'A', role: 'B', follow_up_date: '2030-01-01' });
    const res = await patch(token, body.id, { follow_up_date: '' });
    expect(res.status).toBe(200);
    expect(res.body.follow_up_date).toBeNull();
  });
});

describe('status history', () => {
  it('records creation and each status change, but not no-op updates', async () => {
    const token = await registerUser();
    const { body } = await create(token, { company: 'A', role: 'B' });
    await patch(token, body.id, { status: 'interview' });
    await patch(token, body.id, { status: 'interview', notes: 'same status' });
    await patch(token, body.id, { status: 'offer' });

    const list = await events(token, body.id);
    expect(list.map((e) => [e.type, e.from_status, e.to_status])).toEqual([
      ['created', null, 'applied'],
      ['status_change', 'applied', 'interview'],
      ['status_change', 'interview', 'offer'],
    ]);
  });

  it("does not expose another user's history", async () => {
    const alice = await registerUser('alice@example.com');
    const bob = await registerUser('bob@example.com');
    const { body } = await create(alice, { company: 'A', role: 'B' });
    expect((await api().get(`/api/applications/${body.id}/events`).set(auth(bob))).status).toBe(404);
  });
});

describe('search and sorting', () => {
  it('treats % and _ in the search as literal characters', async () => {
    const token = await registerUser();
    await create(token, { company: 'Acme', role: 'Dev' });
    await create(token, { company: 'Half Price', role: '50% discount engineer' });
    const res = await api().get('/api/applications').query({ q: '%' }).set(auth(token));
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].company).toBe('Half Price');
  });

  it('searches location and source, and sorts by closing date with blanks last', async () => {
    const token = await registerUser();
    await create(token, { company: 'NoDate', role: 'R', status: 'wishlist' });
    await create(token, { company: 'Later', role: 'R', status: 'wishlist', deadline_date: '2030-12-01', location: 'Cork' });
    await create(token, { company: 'Sooner', role: 'R', status: 'wishlist', deadline_date: '2030-11-01', source: 'GradIreland' });

    const sorted = await api().get('/api/applications?sort=deadline_date&order=asc').set(auth(token));
    expect(sorted.body.data.map((a) => a.company)).toEqual(['Sooner', 'Later', 'NoDate']);
    expect((await api().get('/api/applications?q=cork').set(auth(token))).body.total).toBe(1);
    expect((await api().get('/api/applications?q=gradireland').set(auth(token))).body.total).toBe(1);
  });
});

describe('CSV export', () => {
  it('requires auth', async () => {
    expect((await api().get('/api/applications/export.csv')).status).toBe(401);
  });

  it('exports only your rows and defuses spreadsheet formulas', async () => {
    const alice = await registerUser('alice@example.com');
    const bob = await registerUser('bob@example.com');
    await create(alice, { company: '=HYPERLINK("http://evil")', role: 'Dev, Senior' });
    await create(bob, { company: 'Bobs Secret Co', role: 'Dev' });

    const res = await api().get('/api/applications/export.csv').set(auth(alice));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain("'=HYPERLINK");
    expect(res.text).toContain('"Dev, Senior"');
    expect(res.text).not.toContain('Bobs Secret Co');
  });
});

describe('dashboard insights', () => {
  it('reports the funnel, follow-ups, deadlines and weekly goal', async () => {
    const token = await registerUser();
    const a = (await create(token, { company: 'Quiet', role: 'R', applied_date: '2020-01-01' })).body; // long quiet => stale
    const b = (await create(token, { company: 'Replied', role: 'R' })).body;
    await patch(token, b.id, { status: 'interview' });
    await create(token, { company: 'Closing', role: 'R', status: 'wishlist', deadline_date: today() });

    const { body } = await api().get('/api/dashboard').set(auth(token));
    expect(body.total).toBe(3);
    expect(body.funnel).toEqual({ applied: 2, interview: 1, offer: 0 });
    expect(body.responseRate).toBe(0.5);
    expect(body.followUps.map((f) => f.id)).toEqual([a.id]);
    expect(body.deadlines[0]).toMatchObject({ company: 'Closing', daysLeft: 0 });
    expect(body.goal).toMatchObject({ target: 5, thisWeek: 1 });
    expect(body.weekly).toHaveLength(8);
  });
});

describe('profile', () => {
  it('registers with a name and updates name and goal', async () => {
    const res = await api().post('/api/auth/register').send({ email: 'n@example.com', password: 'password123', display_name: 'Stephen' });
    expect(res.body.user).toMatchObject({ display_name: 'Stephen', weekly_goal: 5 });

    const upd = await api().patch('/api/profile').set(auth(res.body.token)).send({ weekly_goal: 8 });
    expect(upd.status).toBe(200);
    expect(upd.body.user).toMatchObject({ display_name: 'Stephen', weekly_goal: 8 });

    const me = await api().get('/api/auth/me').set(auth(res.body.token));
    expect(me.body.user.weekly_goal).toBe(8);
    expect((await api().patch('/api/profile').set(auth(res.body.token)).send({ weekly_goal: 0 })).status).toBe(400);
  });
});

describe('hardening', () => {
  it('sends security headers and hides the framework', async () => {
    const res = await api().get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
