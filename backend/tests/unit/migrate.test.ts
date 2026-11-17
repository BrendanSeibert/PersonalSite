import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrate, type MigrationPool } from '../../src/migrate.js';

// A fake pool with one client that records every query. `applied` is what schema_migrations holds;
// `failOn` makes the query containing that text reject.
function fakePool({ applied = [] as string[], failOn = '' } = {}) {
  const queries: string[] = [];
  const release = vi.fn();
  const client = {
    query: vi.fn(async (sql: string) => {
      queries.push(sql.trim());
      if (failOn && sql.includes(failOn)) throw new Error('syntax error');
      if (sql.startsWith('SELECT name FROM schema_migrations')) return { rows: applied.map((name) => ({ name })) };
      return { rows: [] };
    }),
    release,
  };
  const pool: MigrationPool = { connect: vi.fn(async () => client) };
  return { pool, queries, release };
}

let dir: string;
let dirUrl: URL;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ex3-migrations-'));
  dirUrl = pathToFileURL(`${dir}/`);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe('migrate', () => {
  it('on a fresh database: locks, creates the bookkeeping table, applies every file in order, unlocks', async () => {
    const { pool, queries, release } = fakePool();
    const applied = await migrate(pool); // the real backend/migrations folder
    expect(applied).toEqual(['001_create_frogs.sql', '002_seed_frogs.sql', '003_create_favorites.sql', '004_remove_entry20.sql']);

    expect(queries[0]).toMatch(/^SELECT pg_advisory_lock/);
    expect(queries[1]).toMatch(/^CREATE TABLE IF NOT EXISTS schema_migrations/);
    expect(queries[2]).toMatch(/^SELECT name FROM schema_migrations/);
    // Each migration: BEGIN, its SQL, the record, COMMIT.
    const perFile = queries.slice(3, -1);
    expect(perFile).toHaveLength(16);
    for (let i = 0; i < 4; i += 1) {
      const [begin, sql, record, commit] = perFile.slice(i * 4, i * 4 + 4);
      expect(begin).toBe('BEGIN');
      expect(sql).not.toBe('');
      expect(record).toMatch(/^INSERT INTO schema_migrations/);
      expect(commit).toBe('COMMIT');
    }
    expect(perFile[1]).toMatch(/CREATE TABLE frogs/);
    expect(perFile[5]).toMatch(/INSERT INTO frogs/);
    expect(perFile[9]).toMatch(/CREATE TABLE favorites/);
    expect(perFile[13]).toMatch(/DELETE FROM frogs WHERE id = 'entry20'/);
    expect(queries.at(-1)).toMatch(/^SELECT pg_advisory_unlock/);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('when everything is applied: only the lock, the bookkeeping and the unlock', async () => {
    const { pool, queries } = fakePool({
      applied: ['001_create_frogs.sql', '002_seed_frogs.sql', '003_create_favorites.sql', '004_remove_entry20.sql'],
    });
    expect(await migrate(pool)).toEqual([]);
    expect(queries).toHaveLength(4);
    expect(queries).not.toContain('BEGIN');
  });

  it('runs files in name order and ignores anything that is not a numbered .sql file', async () => {
    await writeFile(join(dir, '002_b.sql'), 'SELECT 2');
    await writeFile(join(dir, '001_a.sql'), 'SELECT 1');
    await writeFile(join(dir, 'notes.txt'), 'not a migration');
    await writeFile(join(dir, '3_short.sql'), 'SELECT 3');
    const { pool, queries } = fakePool();
    expect(await migrate(pool, dirUrl)).toEqual(['001_a.sql', '002_b.sql']);
    expect(queries.filter((q) => q.startsWith('SELECT ') && /^SELECT \d$/.test(q))).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('skips files already applied and applies only the new one', async () => {
    await writeFile(join(dir, '001_a.sql'), 'SELECT 1');
    await writeFile(join(dir, '002_b.sql'), 'SELECT 2');
    const { pool, queries } = fakePool({ applied: ['001_a.sql'] });
    expect(await migrate(pool, dirUrl)).toEqual(['002_b.sql']);
    expect(queries).not.toContain('SELECT 1');
  });

  it('rolls a failing migration back, names it, keeps the cause, and still unlocks and releases', async () => {
    await writeFile(join(dir, '001_a.sql'), 'SELECT 1');
    await writeFile(join(dir, '002_bad.sql'), 'BROKEN SQL');
    await writeFile(join(dir, '003_c.sql'), 'SELECT 3');
    const { pool, queries, release } = fakePool({ failOn: 'BROKEN' });

    const error = (await migrate(pool, dirUrl).then(
      () => undefined,
      (err: unknown) => err,
    )) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Migration 002_bad.sql failed');
    expect((error.cause as Error).message).toBe('syntax error');

    expect(queries).toContain('ROLLBACK');
    expect(queries).not.toContain('SELECT 3'); // stops at the failure
    expect(queries.filter((q) => q.startsWith('INSERT INTO schema_migrations'))).toHaveLength(1); // only 001
    expect(queries.at(-1)).toMatch(/^SELECT pg_advisory_unlock/);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('still releases the client when the unlock itself fails', async () => {
    const { pool, release } = fakePool({ applied: ['001_create_frogs.sql', '002_seed_frogs.sql', '003_create_favorites.sql', '004_remove_entry20.sql'], failOn: 'unlock' });
    await expect(migrate(pool)).resolves.toEqual([]);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
