import { readdir } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { createPool } from '../../src/db.js';
import { MIGRATIONS_DIR, migrate } from '../../src/migrate.js';
import { resetToSeed } from './dbReset.js';

const pool = createPool(loadConfig(process.env).DATABASE_URL);
let FILES: string[] = [];
let afterMigrate: { id: string; position: number }[] = [];

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  FILES = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f)).sort();
  await migrate(pool);
  afterMigrate = await frogIds();
});

beforeEach(async () => {
  await resetToSeed(pool);
});

afterAll(async () => {
  await resetToSeed(pool);
  vi.restoreAllMocks();
  await pool.end();
});

const frogIds = async () =>
  (await pool.query<{ id: string; position: number }>('SELECT id, position FROM frogs ORDER BY position')).rows;

describe('migrate, against a real PostgreSQL', () => {
  it('is safe to run again: one record per file, and the seed does not run twice', async () => {
    expect(await migrate(pool)).toEqual([]);
    const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations ORDER BY name');
    expect(rows.map((r) => r.name)).toEqual(FILES);
    expect(await frogIds()).toEqual(afterMigrate);
  });

  it('is safe to run from two processes at once (the advisory lock)', async () => {
    const other = createPool(loadConfig(process.env).DATABASE_URL);
    try {
      await expect(Promise.all([migrate(pool), migrate(other)])).resolves.toEqual([[], []]);
    } finally {
      await other.end();
    }
  });

  it('creates the tables, keys and index, and leaves valid frog rows once entry20 is removed', async () => {
    // Positions need not be contiguous: a frog added after entry20 was removed leaves a gap on purpose.
    expect(afterMigrate.length).toBeGreaterThan(0);
    const ids = afterMigrate.map((f) => f.id);
    const positions = afterMigrate.map((f) => f.position);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(positions).size).toBe(positions.length);
    expect(positions.every((p) => p > 0)).toBe(true);
    expect(ids).not.toContain('entry20');
    const { rows: keys } = await pool.query<{ table_name: string; constraint_type: string }>(
      `SELECT table_name, constraint_type FROM information_schema.table_constraints
       WHERE table_name IN ('frogs', 'favorites') AND constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
       ORDER BY table_name, constraint_type`,
    );
    expect(keys).toEqual([
      { table_name: 'favorites', constraint_type: 'FOREIGN KEY' },
      { table_name: 'favorites', constraint_type: 'PRIMARY KEY' },
      { table_name: 'frogs', constraint_type: 'PRIMARY KEY' },
      { table_name: 'frogs', constraint_type: 'UNIQUE' },
    ]);
    const { rows: indexes } = await pool.query("SELECT 1 FROM pg_indexes WHERE indexname = 'favorites_entry_id_idx'");
    expect(indexes).toHaveLength(1);
  });

  it('rejects a frog id that breaks the format', async () => {
    await expect(pool.query("INSERT INTO frogs (id, position) VALUES ('Bad Id', 99)")).rejects.toThrow(/check/i);
  });

  it('keeps frogs added or removed after seeding across a restart', async () => {
    await pool.query("INSERT INTO frogs (id, position) VALUES ('entry21', 21)");
    await pool.query("DELETE FROM frogs WHERE id = 'entry05'");
    await migrate(pool);
    const ids = (await frogIds()).map((f) => f.id);
    expect(ids).toContain('entry21');
    expect(ids).not.toContain('entry05');
    expect(ids).toHaveLength(afterMigrate.length);
  });
});
