import pg from 'pg';

export function createPool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 2000, // max wait to open a connection
    query_timeout: 5000, // max wait for an answer (enforced by Node)
    statement_timeout: 5000, // max query run time (enforced by PostgreSQL)
  });
  pool.on('error', (err) => {
    console.error('Idle database connection error (the pool will reconnect):', err.message);
  });
  return pool;
}
