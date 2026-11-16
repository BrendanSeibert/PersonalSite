import { readFile } from 'node:fs/promises';
import type pg from 'pg';
import { MIGRATIONS_DIR } from '../../src/migrate.js';

// Puts the frogs back to the initial crop and removes every like, so each test starts the same.
export async function resetToSeed(pool: pg.Pool) {
  const seed = await readFile(new URL('002_seed_frogs.sql', MIGRATIONS_DIR), 'utf8');
  await pool.query('TRUNCATE favorites, frogs');
  await pool.query(seed);
}
