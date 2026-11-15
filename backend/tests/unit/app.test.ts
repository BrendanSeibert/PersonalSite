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
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createApp({
      db: okDb,
      extraRoutes: (a: Express) => {
        a.get('/late', (_req: Request, res: Response, next: NextFunction) => {
          res.status(200).write('partial');
          next(new Error('late'));
        });
      },
    });
    await expect(request(app).get('/late')).rejects.toThrow();
  });
});
