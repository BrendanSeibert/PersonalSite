import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';
import type { Db } from '../../src/db.js';

// 2 KB of filler, so index.html is big enough for compression to kick in.
export const INDEX_FILLER = 'frog '.repeat(400);
export const INDEX_HTML = `<!doctype html><html><head><title>EX3</title></head><body>${INDEX_FILLER}</body></html>`;
export const ENV_TEXT = 'DATABASE_URL=postgres://secret-from-env-file';
export const ASSET_JS = 'console.log("frog");';

// A fake Vite build in a temp folder, with a few files that must never be served.
export async function makeSite(): Promise<{ dir: string; remove: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), 'ex3-site-'));
  await mkdir(join(dir, 'assets'));
  await writeFile(join(dir, 'index.html'), INDEX_HTML);
  await writeFile(join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await writeFile(join(dir, 'assets', 'index-abc123.js'), ASSET_JS);
  await writeFile(join(dir, '.env'), ENV_TEXT);
  await writeFile(join(dir, 'assets', '.hidden'), ENV_TEXT);
  return { dir, remove: () => rm(dir, { recursive: true, force: true }) };
}

// A database that knows frog entry01 and answers every like and count.
export function frogDb(): Db {
  return {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      if (sql.startsWith('SELECT 1 FROM frogs')) return { rows: params[0] === 'entry01' ? [{}] : [] };
      if (sql.startsWith('SELECT COUNT(*)')) return { rows: [{ count: 1 }] };
      return { rows: [] };
    }),
  };
}
