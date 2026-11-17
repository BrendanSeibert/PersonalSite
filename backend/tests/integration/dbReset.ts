import { readdir, readFile } from 'node:fs/promises';
import type pg from 'pg';
import { MIGRATIONS_DIR } from '../../src/migrate.js';

const SEED = '002_seed_frogs.sql';
// A later migration that only adds or removes frog rows (no schema change), such as
// 004_remove_entry20.sql. Replaying these after the seed gives the current crop.
const FROG_ROWS_ONLY = (sql: string) => /\b(INSERT INTO|DELETE FROM) frogs\b/.test(sql) && !/\b(CREATE|ALTER|DROP)\b/i.test(sql);

// Puts the frogs back to the current crop (the seed plus later frog migrations) and removes every
// like, so each test starts the same.
export async function resetToSeed(pool: pg.Pool) {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d{3}_.*\.sql$/.test(f) && f >= SEED).sort();
  await pool.query('TRUNCATE favorites, frogs');
  for (const file of files) {
    const sql = await readFile(new URL(file, MIGRATIONS_DIR), 'utf8');
    if (file === SEED || FROG_ROWS_ONLY(sql)) await pool.query(sql);
  }
}
