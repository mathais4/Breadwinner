import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../db/migrations');

// Applies db/migrations/*.sql in filename order, once each, each inside its own transaction.
// Returns the names applied this run.
export async function runMigrations() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const applied = [];

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      applied.push(file);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw new Error(`Migration ${file} failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
  return applied;
}
