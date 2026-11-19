import { readdir, readFile } from 'node:fs/promises';

// The part of a pg.Pool the runner needs: one dedicated connection, so the lock, each
// transaction and the unlock all happen on the same session.
export type MigrationClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  release: () => void;
};
export type MigrationPool = { connect: () => Promise<MigrationClient> };

const MIGRATION_FILE = /^\d{3}_[a-z0-9_]+\.sql$/;
export const MIGRATIONS_DIR = new URL('../migrations/', import.meta.url); // backend/migrations, from src/ or dist/
const LOCK_ID = 727_001; // any fixed number: one migration run at a time, across processes

// Applies every migration not yet recorded in schema_migrations, in file-name order, each in its
// own transaction. Safe to call on every start, and from two processes at once.
export async function migrate(pool: MigrationPool, dir: URL = MIGRATIONS_DIR): Promise<string[]> {
  const client = await pool.connect();
  const appliedNow: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => (row as { name: string }).name));
    const files = (await readdir(dir)).filter((file) => MIGRATION_FILE.test(file)).sort();
    for (const name of files) {
      if (applied.has(name)) continue;
      const sql = await readFile(new URL(name, dir), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
      } catch (err) {
        // A broken connection makes ROLLBACK fail too; PostgreSQL rolls back when the session ends.
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`Migration ${name} failed`, { cause: err });
      }
      console.log(`Applied migration ${name}`);
      appliedNow.push(name);
    }
    return appliedNow;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}
