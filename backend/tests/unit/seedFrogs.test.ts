import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '../../src/migrate.js';

// The seed migration, with the frogs later migrations add or remove, and the frontend's entries
// must list the same frogs, in the same order. Both folders exist in a full checkout, which is
// where the unit tests run (README).
function readOrExplain(url: URL): string {
  try {
    return readFileSync(url, 'utf8');
  } catch (err) {
    throw new Error(`Could not read ${url.pathname}: run the backend unit tests from a full checkout`, { cause: err });
  }
}

const EN_JSON = new URL('../../../frontend/src/i18n/en.json', import.meta.url);
const SEED = '002_seed_frogs.sql';
const ROW = /\('([^']*)',\s*(\d+)\)/g; // ('entry01', 1)

const insertedRows = (sql: string) =>
  [...sql.matchAll(ROW)].map(([, id, position]) => ({ id: id!, position: Number(position) }));
const deletedIds = (sql: string) =>
  [...sql.matchAll(/DELETE FROM frogs WHERE id = '([^']*)'/g)].map(([, id]) => id!);

// The frogs after every migration has run, in position order.
function frogsAfterMigrations(): { id: string; position: number }[] {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
  const frogs = new Map<string, number>();
  for (const file of files.filter((f) => f >= SEED)) {
    const sql = readOrExplain(new URL(file, MIGRATIONS_DIR));
    if (/INSERT INTO frogs/.test(sql)) for (const { id, position } of insertedRows(sql)) frogs.set(id, position);
    for (const id of deletedIds(sql)) frogs.delete(id);
  }
  return [...frogs].map(([id, position]) => ({ id, position })).sort((a, b) => a.position - b.position);
}

it('seeds frogs with positions 1, 2, 3... and well-formed, unique ids', () => {
  const pairs = insertedRows(readOrExplain(new URL(SEED, MIGRATIONS_DIR)));
  expect(pairs.map(({ position }) => position)).toEqual(pairs.map((_, i) => i + 1));
  expect(new Set(pairs.map(({ id }) => id)).size).toBe(pairs.length);
  for (const { id } of pairs) expect(id).toMatch(/^[a-z0-9]{1,32}$/); // the frogs.id CHECK
});

it('leaves exactly the frogs in en.json, in order, once every migration has run', () => {
  const en = JSON.parse(readOrExplain(EN_JSON)) as { frogSpinner: { entries: Record<string, unknown> } };
  expect(frogsAfterMigrations().map(({ id }) => id)).toEqual(Object.keys(en.frogSpinner.entries));
});

it('removes entry20, the last placeholder (004_remove_entry20.sql)', () => {
  const ids = frogsAfterMigrations().map(({ id }) => id);
  expect(ids).not.toContain('entry20');
  expect(ids).toHaveLength(19);
});

it('explains a missing file instead of skipping', () => {
  expect(() => readOrExplain(new URL('does-not-exist.json', EN_JSON))).toThrow(/full checkout/);
});
