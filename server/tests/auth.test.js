import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { api, auth, setupDb, cleanDb, closeDb, registerUser } from './helpers.js';

beforeAll(setupDb);
beforeEach(cleanDb);
afterAll(closeDb);

describe('auth', () => {
  it('registers a user and returns a token', async () => {
    const res = await api().post('/api/auth/register').send({ email: 'New@Example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('new@example.com'); // normalised
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('rejects invalid input with 400', async () => {
    const res = await api().post('/api/auth/register').send({ email: 'nope', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('rejects duplicate emails with 409', async () => {
    await registerUser('dup@example.com');
    const res = await api().post('/api/auth/register').send({ email: 'dup@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials', async () => {
    await registerUser('a@example.com', 'password123');
    const res = await api().post('/api/auth/login').send({ email: 'a@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects wrong password with 401', async () => {
    await registerUser('a@example.com', 'password123');
    const res = await api().post('/api/auth/login').send({ email: 'a@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('protects routes', async () => {
    expect((await api().get('/api/applications')).status).toBe(401);
    expect((await api().get('/api/applications').set('Authorization', 'Bearer garbage')).status).toBe(401);
  });

  it('returns the current user from /me', async () => {
    const token = await registerUser('me@example.com');
    const res = await api().get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@example.com');
  });
});
