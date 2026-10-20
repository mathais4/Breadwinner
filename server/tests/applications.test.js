import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { api, auth, setupDb, cleanDb, closeDb, registerUser } from './helpers.js';

beforeAll(setupDb);
beforeEach(cleanDb);
afterAll(closeDb);

const create = (token, body) => api().post('/api/applications').set(auth(token)).send(body);

describe('applications CRUD', () => {
  it('creates an application with defaults', async () => {
    const token = await registerUser();
    const res = await create(token, { company: 'Acme', role: 'Backend Engineer' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ company: 'Acme', role: 'Backend Engineer', status: 'applied' });
  });

  it('validates input', async () => {
    const token = await registerUser();
    const res = await create(token, { company: '', role: 'X', status: 'bogus' });
    expect(res.status).toBe(400);
  });

  it('reads, updates and deletes', async () => {
    const token = await registerUser();
    const { body: created } = await create(token, { company: 'Acme', role: 'Dev' });

    const got = await api().get(`/api/applications/${created.id}`).set(auth(token));
    expect(got.status).toBe(200);

    const upd = await api()
      .patch(`/api/applications/${created.id}`)
      .set(auth(token))
      .send({ status: 'interview', interview_date: '2030-01-01T10:00:00.000Z', notes: 'Prep system design' });
    expect(upd.status).toBe(200);
    expect(upd.body.status).toBe('interview');
    expect(upd.body.notes).toBe('Prep system design');

    const del = await api().delete(`/api/applications/${created.id}`).set(auth(token));
    expect(del.status).toBe(204);
    const gone = await api().get(`/api/applications/${created.id}`).set(auth(token));
    expect(gone.status).toBe(404);
  });

  it('rejects an empty PATCH and a bad id', async () => {
    const token = await registerUser();
    const { body } = await create(token, { company: 'Acme', role: 'Dev' });
    expect((await api().patch(`/api/applications/${body.id}`).set(auth(token)).send({})).status).toBe(400);
    expect((await api().get('/api/applications/abc').set(auth(token))).status).toBe(400);
  });

  it("never exposes another user's data", async () => {
    const alice = await registerUser('alice@example.com');
    const bob = await registerUser('bob@example.com');
    const { body } = await create(alice, { company: 'Secret Corp', role: 'Dev' });

    expect((await api().get(`/api/applications/${body.id}`).set(auth(bob))).status).toBe(404);
    expect((await api().patch(`/api/applications/${body.id}`).set(auth(bob)).send({ status: 'offer' })).status).toBe(404);
    expect((await api().delete(`/api/applications/${body.id}`).set(auth(bob))).status).toBe(404);
    const list = await api().get('/api/applications').set(auth(bob));
    expect(list.body.total).toBe(0);
  });
});

describe('search, filter, pagination', () => {
  async function seed(token) {
    await create(token, { company: 'Google', role: 'SWE', status: 'applied' });
    await create(token, { company: 'Stripe', role: 'Backend Engineer', status: 'interview' });
    await create(token, { company: 'Spotify', role: 'Frontend Engineer', status: 'rejected' });
  }

  it('filters by status', async () => {
    const token = await registerUser();
    await seed(token);
    const res = await api().get('/api/applications?status=interview').set(auth(token));
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].company).toBe('Stripe');
  });

  it('searches company and role case-insensitively', async () => {
    const token = await registerUser();
    await seed(token);
    const res = await api().get('/api/applications?q=engineer').set(auth(token));
    expect(res.body.total).toBe(2);
  });

  it('paginates', async () => {
    const token = await registerUser();
    await seed(token);
    const res = await api().get('/api/applications?limit=2&page=2').set(auth(token));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.totalPages).toBe(2);
  });

  it('rejects invalid query params', async () => {
    const token = await registerUser();
    expect((await api().get('/api/applications?status=nope').set(auth(token))).status).toBe(400);
    expect((await api().get('/api/applications?sort=password_hash').set(auth(token))).status).toBe(400);
  });
});

describe('dashboard', () => {
  it('summarises counts and upcoming interviews', async () => {
    const token = await registerUser();
    await create(token, { company: 'A', role: 'R', status: 'applied' });
    await create(token, { company: 'B', role: 'R', status: 'interview', interview_date: '2099-01-01T09:00:00.000Z' });
    await create(token, { company: 'C', role: 'R', status: 'interview', interview_date: '2000-01-01T09:00:00.000Z' });

    const res = await api().get('/api/dashboard').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.byStatus).toMatchObject({ applied: 1, interview: 2, offer: 0 });
    expect(res.body.upcomingInterviews).toHaveLength(1); // past interview excluded
    expect(res.body.upcomingInterviews[0].company).toBe('B');
  });
});
