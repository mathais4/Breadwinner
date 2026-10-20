import { runMigrations } from './migrate.js';
import { pool } from './db.js';

try {
  const applied = await runMigrations();
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.');
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
