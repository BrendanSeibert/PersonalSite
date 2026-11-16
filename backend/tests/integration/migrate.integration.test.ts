import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { createPool } from '../../src/db.js';
import { migrate } from '../../src/migrate.js';
import { resetToSeed } from './dbReset.js';

const pool = createPool(loadConfig(process.env).DATABASE_URL);
const FILES = ['001_create_frogs.sql', '002_seed_frogs.sql', '003_create_favorites.sql'];

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await migrate(pool);
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
    expect(await frogIds()).toHaveLength(20);
  });

  it('is safe to run from two processes at once (the advisory lock)', async () => {
    const other = createPool(loadConfig(process.env).DATABASE_URL);
    try {
      await expect(Promise.all([migrate(pool), migrate(other)])).resolves.toEqual([[], []]);
    } finally {
      await other.end();
    }
  });

  it('creates the tables, keys and index, and seeds entry01 to entry20 with positions 1 to 20', async () => {
    expect(await frogIds()).toEqual(
      Array.from({ length: 20 }, (_, i) => ({ id: `entry${String(i + 1).padStart(2, '0')}`, position: i + 1 })),
    );
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
    expect(ids).toHaveLength(20);
  });
});
