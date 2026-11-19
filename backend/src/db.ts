import pg from 'pg';

// Anything with a query() function will do: the real pg.Pool, or a fake in tests.
// Values always travel separately from the SQL ($1, $2, ...): never put them in the string.
export type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

export function createPool(databaseUrl: string, caCert?: string, overrides: pg.PoolConfig = {}): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    // A provider with its own certificate authority: trust exactly that one. rejectUnauthorized keeps
    // its default (true). config.ts makes sure the URL has no sslmode that would replace this.
    ...(caCert ? { ssl: { ca: caCert } } : {}),
    connectionTimeoutMillis: 2000, // max wait to open a connection
    query_timeout: 5000, // max wait for an answer (enforced by Node)
    statement_timeout: 5000, // max query run time (enforced by PostgreSQL)
    ...overrides, // the migration pool replaces the timeouts (server.ts)
  });
  pool.on('error', (err) => {
    console.error('Idle database connection error (the pool will reconnect):', err.message);
  });
  return pool;
}
