import pg from 'pg';
import './config.js';

// DATE columns come back as plain 'YYYY-MM-DD' strings. By default node-pg turns them into JS Dates
// at local midnight, which shifts the day depending on the server's time zone.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

// Runs fn(client) inside BEGIN/COMMIT, rolling back on any error.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
