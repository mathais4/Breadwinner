import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';
import { runMigrations } from '../src/migrate.js';

export const api = () => request(app);

export async function setupDb() {
  await runMigrations();
}
export async function cleanDb() {
  await pool.query('TRUNCATE users, applications, application_events RESTART IDENTITY CASCADE');
}
export async function closeDb() {
  await pool.end();
}

export async function registerUser(email = 'a@example.com', password = 'password123') {
  const res = await api().post('/api/auth/register').send({ email, password });
  return res.body.token;
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });
