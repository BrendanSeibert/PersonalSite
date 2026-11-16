import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '../../src/migrate.js';

// The seed migration and the frontend's entries must list the same frogs, in the same order.
// Both folders exist in a full checkout, which is where the unit tests run (README).
function readOrExplain(url: URL): string {
  try {
    return readFileSync(url, 'utf8');
  } catch (err) {
    throw new Error(`Could not read ${url.pathname}: run the backend unit tests from a full checkout`, { cause: err });
  }
}

const EN_JSON = new URL('../../../frontend/src/i18n/en.json', import.meta.url);

it('seeds exactly the frogs in en.json, in order, with positions 1, 2, 3...', () => {
  const seed = readOrExplain(new URL('002_seed_frogs.sql', MIGRATIONS_DIR));
  const en = JSON.parse(readOrExplain(EN_JSON)) as { frogSpinner: { entries: Record<string, unknown> } };

  const pairs = [...seed.matchAll(/\('([^']*)',\s*(\d+)\)/g)].map(([, id, position]) => ({ id, position: Number(position) }));
  const expected = Object.keys(en.frogSpinner.entries);

  expect(pairs.map(({ id }) => id)).toEqual(expected);
  expect(pairs.map(({ position }) => position)).toEqual(expected.map((_, i) => i + 1));
  expect(new Set(pairs.map(({ id }) => id)).size).toBe(pairs.length);
  for (const { id } of pairs) expect(id).toMatch(/^[a-z0-9]{1,32}$/); // the frogs.id CHECK
});

it('explains a missing file instead of skipping', () => {
  expect(() => readOrExplain(new URL('does-not-exist.json', EN_JSON))).toThrow(/full checkout/);
});
