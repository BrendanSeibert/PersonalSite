import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { Db } from '../../src/db.js';
import { TOP_FAVORITES } from '../../src/routes/favorites.js';
import { DEV_VISITOR_SECRET, signVisitorId, VISITOR_COOKIE } from '../../src/visitor.js';

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
const COOKIE = `${VISITOR_COOKIE}=${signVisitorId(ID, DEV_VISITOR_SECRET)}`;

type Call = { sql: string; params: unknown[] };

// A fake database: answers each kind of query from canned data, and records every call.
// Answers by the query's opening words; the SQL's exact behaviour (order, ties, conflicts) is checked against real PostgreSQL in tests/integration/favorites.integration.test.ts.
function fakeDb({
  frogs = ['entry01', 'entry02', 'entry07'],
  mine = [] as string[],
  top = [] as { entry_id: string; count: number }[],
  count = 3,
  insertError = undefined as unknown,
} = {}) {
  const calls: Call[] = [];
  const db: Db = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT 1 FROM frogs')) return { rows: frogs.includes(params[0] as string) ? [{}] : [] };
      if (sql.startsWith('SELECT COUNT(*)')) return { rows: [{ count }] };
      if (sql.includes('WHERE f.visitor_id')) return { rows: mine.map((entry_id) => ({ entry_id })) };
      if (sql.includes('GROUP BY')) return { rows: top };
      if (sql.startsWith('INSERT') && insertError) throw insertError;
      return { rows: [] };
    }),
  };
  return { db, calls, app: createApp({ db }) };
}

const visitorCookie = (res: request.Response) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${VISITOR_COOKIE}=`));

afterEach(() => vi.restoreAllMocks());

describe('GET /api/favorites/mine', () => {
  it('without a cookie: an empty list, no query and no cookie', async () => {
    const { app, calls } = fakeDb();
    const res = await request(app).get('/api/favorites/mine');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ entryIds: [] });
    expect(calls).toHaveLength(0);
    expect(visitorCookie(res)).toBeUndefined();
  });

  it('with a cookie: the visitor is a parameter, never in the SQL', async () => {
    const { app, calls } = fakeDb({ mine: ['entry02', 'entry07'] });
    const res = await request(app).get('/api/favorites/mine').set('Cookie', COOKIE);
    expect(res.body).toEqual({ entryIds: ['entry02', 'entry07'] });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.params).toEqual([ID]);
    expect(calls[0]!.sql).not.toContain(ID);
    expect(visitorCookie(res)).toBeUndefined(); // reads never set the cookie
  });

  it.each([
    ['junk', 'forged'],
    ['an unsigned UUID', ID],
  ])('treats a forged cookie (%s) as no cookie', async (_name, value) => {
    const { app, calls } = fakeDb();
    const res = await request(app).get('/api/favorites/mine').set('Cookie', `${VISITOR_COOKIE}=${value}`);
    expect(res.body).toEqual({ entryIds: [] });
    expect(calls).toHaveLength(0);
  });
});

describe('GET /api/favorites/top', () => {
  it('asks for the top ten and maps the rows', async () => {
    const { app, calls } = fakeDb({ top: [{ entry_id: 'entry07', count: 5 }, { entry_id: 'entry01', count: 2 }] });
    const res = await request(app).get('/api/favorites/top');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ top: [{ entryId: 'entry07', count: 5 }, { entryId: 'entry01', count: 2 }] });
    expect(TOP_FAVORITES).toBe(10);
    expect(calls[0]!.params).toEqual([10]);
    expect(visitorCookie(res)).toBeUndefined();
  });
});

describe('PUT /api/favorites/:entryId', () => {
  it('first like: looks the frog up, then issues the cookie and inserts idempotently', async () => {
    const { app, calls } = fakeDb({ count: 1 });
    const res = await request(app).put('/api/favorites/entry07');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ entryId: 'entry07', favorited: true, count: 1 });

    const cookie = visitorCookie(res)!;
    const issued = /^ex3_visitor=([^.;]+)\.[^;]+;/.exec(cookie)![1]; // <uuid>.<signature>
    expect(cookie).toMatch(/HttpOnly/);
    expect(calls.map((c) => c.sql.split(' ')[0])).toEqual(['SELECT', 'INSERT', 'SELECT']);
    expect(calls[0]!.params).toEqual(['entry07']);
    expect(calls[1]!.params).toEqual([issued, 'entry07']);
    expect(calls[2]!.params).toEqual(['entry07']);
  });

  it('keeps and renews an existing visitor', async () => {
    const { app, calls } = fakeDb();
    const res = await request(app).put('/api/favorites/entry07').set('Cookie', COOKIE);
    expect(calls[1]!.params).toEqual([ID, 'entry07']);
    expect(visitorCookie(res)!.startsWith(`${COOKIE};`)).toBe(true);
  });

  it('likes a frog beyond the first twenty like any other: nothing assumes 20', async () => {
    const { app } = fakeDb({ frogs: ['entry21'] });
    const res = await request(app).put('/api/favorites/entry21');
    expect(res.status).toBe(200);
    expect(res.body.entryId).toBe('entry21');
  });

  it('answers 404 for a frog that was removed mid-request (foreign key violation), not 500', async () => {
    const { app } = fakeDb({ insertError: Object.assign(new Error('fk'), { code: '23503' }) });
    const res = await request(app).put('/api/favorites/entry07');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Unknown frog' });
    expect(res.headers['set-cookie']).toBeUndefined(); // no cookie for a like that was not stored
  });

  it('lets other insert errors reach the error handler as a generic 500', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { app } = fakeDb({ insertError: Object.assign(new Error('secret detail'), { code: '57014' }) });
    const res = await request(app).put('/api/favorites/entry07');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(res.text).not.toContain('secret detail');
    expect(res.headers['set-cookie']).toBeUndefined(); // no cookie for a like that was not stored
    expect(spy).toHaveBeenCalled();
  });
});

describe('DELETE /api/favorites/:entryId', () => {
  it('without a cookie: nothing to remove, no cookie issued, the current count', async () => {
    const { app, calls } = fakeDb({ count: 4 });
    const res = await request(app).delete('/api/favorites/entry07');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ entryId: 'entry07', favorited: false, count: 4 });
    expect(calls.some((c) => c.sql.startsWith('DELETE'))).toBe(false);
    expect(visitorCookie(res)).toBeUndefined();
  });

  it('with a cookie: removes only this visitor’s like', async () => {
    const { app, calls } = fakeDb({ count: 2 });
    const res = await request(app).delete('/api/favorites/entry07').set('Cookie', COOKIE);
    expect(res.body).toEqual({ entryId: 'entry07', favorited: false, count: 2 });
    const del = calls.find((c) => c.sql.startsWith('DELETE'))!;
    expect(del.params).toEqual([ID, 'entry07']);
    expect(visitorCookie(res)).toBeUndefined();
  });
});

describe.each(['put', 'delete'] as const)('%s with a frog that is not liked-able', (method) => {
  it('answers 404 for an unknown frog: no insert or delete, no cookie', async () => {
    const { app, calls } = fakeDb({ frogs: [] });
    const res = await request(app)[method]('/api/favorites/entry99').set('Cookie', COOKIE);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Unknown frog' });
    expect(calls).toHaveLength(1); // only the lookup
    expect(visitorCookie(res)).toBeUndefined();
  });

  it.each(['ENTRY01', 'entry01;DROP', 'entry-01', 'a'.repeat(33), 'x'.repeat(1000), '%27%20OR%201%3D1'])(
    'answers 404 for the malformed id %j without any query',
    async (id) => {
      const { app, calls } = fakeDb();
      const res = await request(app)[method](`/api/favorites/${id}`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Unknown frog' });
      expect(calls).toHaveLength(0);
    },
  );

  it('answers 404 JSON for an empty id (no route matches)', async () => {
    const { app, calls } = fakeDb();
    const res = await request(app)[method]('/api/favorites/');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(calls).toHaveLength(0);
  });
});

describe('every favorites response', () => {
  it.each([
    ['get', '/api/favorites/mine'],
    ['get', '/api/favorites/top'],
    ['put', '/api/favorites/entry07'],
    ['delete', '/api/favorites/entry07'],
    ['put', '/api/favorites/entry99'],
  ] as const)('%s %s: no-store, JSON, no CORS header, and never the visitor ID in the body', async (method, url) => {
    const { app } = fakeDb({ mine: ['entry07'] });
    const res = await request(app)[method](url).set('Cookie', COOKIE);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.text).not.toContain(ID);
  });

  it('answers a database failure with a generic 500, details only in the log', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const db: Db = { query: vi.fn().mockRejectedValue(new Error('connection refused at 10.0.0.5')) };
    const res = await request(createApp({ db })).get('/api/favorites/mine').set('Cookie', COOKIE);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(res.text).not.toContain('10.0.0.5');
    expect(spy).toHaveBeenCalled();
  });

  it('answers other methods with the app’s 404 JSON', async () => {
    const { app, calls } = fakeDb();
    const res = await request(app).post('/api/favorites/entry01');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
    expect(calls).toHaveLength(0);
  });

  it('sets the Secure flag on the cookie when the app is configured for HTTPS', async () => {
    const { db } = fakeDb();
    const res = await request(createApp({ db, cookieSecure: true })).put('/api/favorites/entry07');
    expect(visitorCookie(res)).toMatch(/; Secure/);
  });
});
