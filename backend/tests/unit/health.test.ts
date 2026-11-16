import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../../src/db.js';
import { healthRouter } from '../../src/routes/health.js';

function appWith(db: Db) {
  const app = express();
  app.use('/api', healthRouter(db));
  return app;
}

afterEach(() => vi.restoreAllMocks());

describe('GET /api/health', () => {
  it('returns 200 with db up when the query succeeds', async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [{ ok: 1 }] }) };
    const res = await request(appWith(db)).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns 503 with db down and logs the reason when the query fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = { query: vi.fn().mockRejectedValue(new Error('connection refused')) };
    const res = await request(appWith(db)).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'degraded', db: 'down' });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Health check'), 'connection refused');
  });

  it('logs non-Error rejections as-is', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = { query: vi.fn().mockRejectedValue('plain string') };
    const res = await request(appWith(db)).get('/api/health');
    expect(res.status).toBe(503);
    expect(spy).toHaveBeenCalledWith(expect.any(String), 'plain string');
  });
});
