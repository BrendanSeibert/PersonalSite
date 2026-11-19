import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { CSP, PERMISSIONS_POLICY, PRODUCTION_LIMITS, type Limits } from '../../src/security.js';
import { DEV_VISITOR_SECRET, signVisitorId, VISITOR_COOKIE } from '../../src/visitor.js';
import { frogDb, makeSite } from './siteFixture.js';

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
const COOKIE = `${VISITOR_COOKIE}=${signVisitorId(ID, DEV_VISITOR_SECRET)}`;
const LIKE = '/api/favorites/entry01';
const big = (limits: Partial<Limits>): Limits => ({ reads: 50, writes: 50, newVisitors: 50, ...limits });

function appWithBoom(options: Partial<Parameters<typeof createApp>[0]> = {}) {
  return createApp({
    db: frogDb(),
    ...options,
    extraRoutes: (app: Express) => {
      app.get('/boom', () => {
        throw new Error('boom');
      });
    },
  });
}

async function times(n: number, send: () => Promise<request.Response>) {
  const results: request.Response[] = [];
  for (let i = 0; i < n; i++) results.push(await send());
  return results;
}

afterEach(() => vi.restoreAllMocks());

describe('security headers', () => {
  it('sends the strict CSP on every kind of response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = appWithBoom();
    for (const [path, status] of [
      ['/api/health', 200],
      ['/does-not-exist', 404],
      ['/boom', 500],
    ] as const) {
      const res = await request(app).get(path);
      expect(res.status).toBe(status);
      expect(res.headers['content-security-policy']).toBe(CSP);
    }
    expect(CSP).toMatch(/^default-src 'none';/);
    expect(CSP).not.toContain('unsafe-inline');
  });

  it('sends the other headers', async () => {
    const res = await request(createApp({ db: frogDb() })).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(res.headers['permissions-policy']).toBe(PERMISSIONS_POLICY);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sends HSTS only over HTTPS', async () => {
    const https = await request(createApp({ db: frogDb(), cookieSecure: true })).get('/api/health');
    expect(https.headers['strict-transport-security']).toBe('max-age=86400');
    const http = await request(createApp({ db: frogDb(), cookieSecure: false })).get('/api/health');
    expect(http.headers['strict-transport-security']).toBeUndefined();
  });

  it('makes every /api response no-store', async () => {
    const app = createApp({ db: frogDb() });
    for (const path of ['/api/health', '/api/favorites/top', '/api/nope']) {
      expect((await request(app).get(path)).headers['cache-control']).toBe('no-store');
    }
  });
});

describe('rate limits', () => {
  it('limits writes separately from reads', async () => {
    const app = createApp({ db: frogDb(), limits: big({ writes: 3 }) });
    const writes = await times(4, () => request(app).put(LIKE).set('Cookie', COOKIE));
    expect(writes.slice(0, 3).map((r) => r.status)).toEqual([200, 200, 200]);
    const last = writes[3]!;
    expect(last.status).toBe(429);
    expect(last.body).toEqual({ error: 'Too many requests' });
    expect(last.headers['content-type']).toMatch(/application\/json/);
    expect(last.headers['ratelimit']).toBeDefined();
    expect((await request(app).get('/api/health')).status).toBe(200);
  });

  it('limits reads', async () => {
    const app = createApp({ db: frogDb(), limits: big({ reads: 3 }) });
    const reads = await times(4, () => request(app).get('/api/health'));
    expect(reads.map((r) => r.status)).toEqual([200, 200, 200, 429]);
  });

  it('limits new visitors, but not cookie holders', async () => {
    const app = createApp({ db: frogDb(), limits: big({ newVisitors: 2 }) });
    // DELETEs and GETs never count toward it.
    await times(3, () => request(app).delete(LIKE));
    await times(3, () => request(app).get('/api/favorites/mine'));
    const fresh = await times(3, () => request(app).put(LIKE));
    expect(fresh.map((r) => r.status)).toEqual([200, 200, 429]);
    const holders = await times(3, () => request(app).put(LIKE).set('Cookie', COOKIE));
    expect(holders.map((r) => r.status)).toEqual([200, 200, 200]);
  });

  it('counts likes with a made-up or wrongly signed cookie as new visitors', async () => {
    const app = createApp({ db: frogDb(), limits: big({ newVisitors: 2 }) });
    const forged = [
      `${VISITOR_COOKIE}=${randomUUID()}`, // a bare UUID, as a script would invent
      `${VISITOR_COOKIE}=${signVisitorId(randomUUID(), 'a-guessed-secret-that-is-not-the-real-one')}`,
      `${VISITOR_COOKIE}=${randomUUID()}`,
    ];
    const results = [];
    for (const cookie of forged) results.push((await request(app).put(LIKE).set('Cookie', cookie)).status);
    expect(results).toEqual([200, 200, 429]);
  });

  it('signs cookies with the secret it is given, and only accepts that secret', async () => {
    const secret = 'the-production-secret-for-this-test-only';
    const app = createApp({ db: frogDb(), visitorSecret: secret, limits: big({ newVisitors: 1 }) });
    const first = await request(app).put(LIKE);
    const issued = String(first.headers['set-cookie']).split(';')[0]!;
    expect(issued).toBe(`${VISITOR_COOKIE}=${signVisitorId(issued.split('=')[1]!.split('.')[0]!, secret)}`);
    expect((await request(app).put(LIKE).set('Cookie', issued)).status).toBe(200); // known visitor
    expect((await request(app).put(LIKE).set('Cookie', COOKIE)).status).toBe(429); // dev-key cookie: new
  });

  it('allows room for many people behind one address in production', () => {
    expect(PRODUCTION_LIMITS).toEqual({ reads: 600, writes: 60, newVisitors: 30 });
  });

  it('never shares counters between two apps', async () => {
    const limits = big({ writes: 3 });
    for (const app of [createApp({ db: frogDb(), limits }), createApp({ db: frogDb(), limits })]) {
      const writes = await times(3, () => request(app).put(LIKE).set('Cookie', COOKIE));
      expect(writes.map((r) => r.status)).toEqual([200, 200, 200]);
    }
  });

  it('applies no limits unless asked for', async () => {
    const app = createApp({ db: frogDb() });
    const writes = await times(60, () => request(app).put(LIKE));
    expect(writes.every((r) => r.status === 200)).toBe(true);
    expect(writes[0]!.headers['ratelimit']).toBeUndefined();
  });

  it('believes X-Forwarded-For only when trustProxy is set', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // express-rate-limit warns about the forged header
    const burst = async (trustProxy: number) => {
      const app = createApp({ db: frogDb(), trustProxy, limits: big({ reads: 2 }) });
      await times(2, () => request(app).get('/api/health').set('X-Forwarded-For', '203.0.113.1'));
      return (await request(app).get('/api/health').set('X-Forwarded-For', '203.0.113.2')).status;
    };
    expect(await burst(0)).toBe(429); // one counter: the real (local) address
    expect(await burst(1)).toBe(200); // two counters: the forwarded addresses
  });
});

describe('same-origin writes', () => {
  const app = () => createApp({ db: frogDb(), checkOrigin: true });

  it.each(['https://evil.example', 'null'])('refuses a write from Origin %s', async (origin) => {
    const db = frogDb();
    const res = await request(createApp({ db, checkOrigin: true })).put(LIKE).set('Origin', origin);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden' });
    expect(db.query).not.toHaveBeenCalled(); // never reached the route
  });

  it('refuses a DELETE from another site too', async () => {
    expect((await request(app()).delete(LIKE).set('Origin', 'https://evil.example')).status).toBe(403);
  });

  it('accepts a write from its own origin, or with no Origin at all', async () => {
    const server = request(app());
    const own = await server.put(LIKE).set('Host', 'frogs.example').set('Origin', 'https://frogs.example');
    expect(own.status).toBe(200);
    expect((await request(app()).put(LIKE)).status).toBe(200);
  });

  it('lets reads from other sites through', async () => {
    expect((await request(app()).get('/api/health').set('Origin', 'https://evil.example')).status).toBe(200);
  });

  it('lets a foreign write through when the check is off (development)', async () => {
    const res = await request(createApp({ db: frogDb() })).put(LIKE).set('Origin', 'https://evil.example');
    expect(res.status).toBe(200);
  });
});

describe('with the frontend build', () => {
  let site: Awaited<ReturnType<typeof makeSite>>;
  beforeAll(async () => {
    site = await makeSite();
  });
  afterAll(() => site.remove());

  it('does not rate limit pages or assets', async () => {
    const app = createApp({ db: frogDb(), staticDir: site.dir, limits: big({ reads: 2 }) });
    const pages = await times(5, () => request(app).get('/'));
    expect(pages.every((r) => r.status === 200)).toBe(true);
  });

  it('compresses text when asked', async () => {
    const app = createApp({ db: frogDb(), staticDir: site.dir });
    const gzip = await request(app).get('/').set('Accept-Encoding', 'gzip');
    expect(gzip.headers['content-encoding']).toBe('gzip');
    const plain = await request(app).get('/').set('Accept-Encoding', 'identity');
    expect(plain.headers['content-encoding']).toBeUndefined();
  });
});
