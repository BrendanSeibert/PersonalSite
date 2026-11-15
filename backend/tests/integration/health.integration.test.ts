import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createPool } from '../../src/db.js';

const config = loadConfig(process.env);
const pool = createPool(config.DATABASE_URL);
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  // A real HTTP server on a real port, so the full stack is exercised over the network.
  server = createApp({ db: pool }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});

describe('against a real PostgreSQL', () => {
  it('GET /api/health returns 200 and db up', async () => {
    const res = await request(baseUrl).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  it('can run SELECT 1 and SELECT version()', async () => {
    const one = await pool.query<{ n: number }>('SELECT 1 AS n');
    expect(one.rows[0]?.n).toBe(1);
    const version = await pool.query<{ version: string }>('SELECT version()');
    expect(version.rows[0]?.version).toMatch(/^PostgreSQL 16\./);
  });

  it('returns 404 JSON for an unknown route over real HTTP', async () => {
    const res = await request(baseUrl).get('/nope');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('returns 503 when the database port refuses connections', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const refused = createPool('postgres://test:test@db-test:1/test');
    try {
      const res = await request(createApp({ db: refused })).get('/api/health');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: 'degraded', db: 'down' });
    } finally {
      await refused.end();
      vi.restoreAllMocks();
    }
  });
});
