import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPool } from '../../src/db.js';

afterEach(() => vi.restoreAllMocks());

describe('createPool', () => {
  const url = 'postgres://u:p@localhost:5432/db';

  it('passes the connection string and all three timeouts through', async () => {
    const pool = createPool(url);
    expect(pool.options).toMatchObject({
      connectionString: url,
      connectionTimeoutMillis: 2000,
      query_timeout: 5000,
      statement_timeout: 5000,
    });
    await pool.end();
  });

  it('has exactly one error listener', async () => {
    const pool = createPool(url);
    expect(pool.listenerCount('error')).toBe(1);
    await pool.end();
  });

  it('logs instead of throwing when an idle connection errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const pool = createPool(url);
    expect(() => pool.emit('error', new Error('boom'))).not.toThrow();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Idle database connection error'), 'boom');
    await pool.end();
  });
});
