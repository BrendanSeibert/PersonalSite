import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express, NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

const okDb = { query: vi.fn().mockResolvedValue({ rows: [] }) };

function errorWith(props: Record<string, unknown>, message = 'secret internal detail') {
  return Object.assign(new Error(message), props);
}

function appThrowing(err: unknown) {
  return createApp({
    db: okDb,
    extraRoutes: (app: Express) => {
      app.get('/boom', () => {
        throw err;
      });
    },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('createApp', () => {
  it('mounts the health route under /api', async () => {
    const res = await request(createApp({ db: okDb })).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns 404 JSON for unknown paths', async () => {
    const res = await request(createApp({ db: okDb })).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('does not send an x-powered-by header', async () => {
    const res = await request(createApp({ db: okDb })).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('returns 400 JSON (not 500) for a malformed JSON body', async () => {
    const res = await request(createApp({ db: okDb }))
      .post('/anything')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(typeof res.body.error).toBe('string');
  });

  it('refuses a body over 10 KB with 413 JSON', async () => {
    const res = await request(createApp({ db: okDb }))
      .post('/anything')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ filler: 'x'.repeat(20 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('sends the security headers on error responses', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appThrowing(new Error('x'))).get('/boom');
    expect(res.headers['content-security-policy']).toMatch(/^default-src 'none'/);
  });

  it('keeps development wiring: no limits and no Origin check', async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [{ count: 0 }] }) };
    const res = await request(createApp({ db }))
      .put('/api/favorites/entry01')
      .set('Origin', 'https://evil.example');
    expect(res.status).not.toBe(403);
    expect(res.headers['ratelimit']).toBeUndefined();
  });

  it('returns a generic 500 for a thrown error and hides its details', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('secret internal detail');
    const res = await request(appThrowing(err)).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(res.text).not.toContain('secret internal detail');
    expect(res.text).not.toContain(err.stack!.split('\n')[1]!.trim());
    expect(spy).toHaveBeenCalledWith(err);
  });
});

describe('error handler', () => {
  it('shows the message of an exposed 4xx error', async () => {
    const res = await request(appThrowing(errorWith({ status: 404, expose: true }, 'Widget missing'))).get('/boom');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Widget missing' });
  });

  it('hides the message of a non-exposed 4xx error', async () => {
    const res = await request(appThrowing(errorWith({ status: 400 }))).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Bad Request' });
  });

  it('falls back to a generic message for an unnamed 4xx status', async () => {
    const res = await request(appThrowing(errorWith({ status: 499 }))).get('/boom');
    expect(res.status).toBe(499);
    expect(res.body).toEqual({ error: 'Request error' });
  });

  it.each([200, 0, 600, '404'])('treats status %j as 500', async (status) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appThrowing(errorWith({ status, expose: true }))).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it('closes the connection when the response was already started', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const lateError = new Error('late');
    const app = createApp({
      db: okDb,
      extraRoutes: (a: Express) => {
        a.get('/late', (_req: Request, res: Response, next: NextFunction) => {
          res.status(200).write('partial');
          next(lateError);
        });
      },
    });
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const body = await new Promise<string>((resolve) => {
      let data = '';
      http
        .get(`http://127.0.0.1:${port}/late`, (res) => {
          res.on('data', (c) => (data += c));
          res.on('error', () => resolve(data)); // aborted
          res.on('close', () => resolve(data));
        })
        .on('error', () => resolve(data));
    });
    server.close();
    expect(body).toBe('partial'); // nothing was appended
    expect(body).not.toContain('"error"');
    // The handler took its headersSent branch: it did not run the normal path, which logs the error.
    expect(spy).not.toHaveBeenCalledWith(lateError);
  });
});
