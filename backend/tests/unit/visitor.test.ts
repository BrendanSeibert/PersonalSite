import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ensureVisitorId, readVisitorId, VISITOR_COOKIE } from '../../src/visitor.js';

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
const OTHER = '7a1c2e3f-4b5d-4c6e-9f8a-0b1c2d3e4f5a';

// A tiny app that reports what the functions under test see and do.
function app({ ensure = false, secure = false } = {}) {
  const a = express();
  a.get('/api/probe', (req, res) => {
    const id = ensure ? ensureVisitorId(req, res, { secure }) : readVisitorId(req);
    res.json({ id: id ?? null });
  });
  return a;
}

const read = (cookie?: string) => {
  const req = request(app()).get('/api/probe');
  return (cookie === undefined ? req : req.set('Cookie', cookie)).then((res) => res.body.id as string | null);
};

describe('readVisitorId', () => {
  it('reads a valid cookie among others, in any order, with spaces', async () => {
    expect(await read(`${VISITOR_COOKIE}=${ID}`)).toBe(ID);
    expect(await read(`theme=dark; ${VISITOR_COOKIE}=${ID}; other=1`)).toBe(ID);
    expect(await read(`a=1;${VISITOR_COOKIE}=${ID}`)).toBe(ID);
    expect(await read(`  ${VISITOR_COOKIE} = ${ID}  `)).toBe(ID);
  });

  it('finds nothing without a cookie header, or without this cookie', async () => {
    expect(await read()).toBeNull();
    expect(await read('theme=dark')).toBeNull();
    expect(await read('garbage')).toBeNull();
  });

  it.each([
    ['empty', ''],
    ['not a UUID', 'not-a-uuid'],
    ['uppercase', ID.toUpperCase()],
    ['a UUID of another version (v1)', '3f2b8c1e-9a4d-1e6f-8b2a-1c3d5e7f9a0b'],
    ['a bad variant', '3f2b8c1e-9a4d-4e6f-cb2a-1c3d5e7f9a0b'],
    ['extra text after the UUID', `${ID}x`],
    ['an equals-sign trick', `${ID}=${OTHER}`],
    ['SQL', "' OR 1=1 --"],
  ])('rejects %s', async (_name, value) => {
    expect(await read(`${VISITOR_COOKIE}=${value}`)).toBeNull();
  });

  it('uses only the first ex3_visitor cookie', async () => {
    expect(await read(`${VISITOR_COOKIE}=${ID}; ${VISITOR_COOKIE}=${OTHER}`)).toBe(ID);
    expect(await read(`${VISITOR_COOKIE}=bad; ${VISITOR_COOKIE}=${OTHER}`)).toBeNull();
  });

  it('does not mistake a cookie whose name only ends the same way', async () => {
    expect(await read(`not_${VISITOR_COOKIE}=${ID}`)).toBeNull();
  });
});

describe('ensureVisitorId', () => {
  it('issues a new v4 UUID with the right cookie attributes', async () => {
    const res = await request(app({ ensure: true })).get('/api/probe');
    expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const cookie = res.headers['set-cookie']![0]!;
    expect(cookie).toMatch(new RegExp(`^${VISITOR_COOKIE}=${res.body.id};`));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/api');
    expect(cookie).toContain('Max-Age=34560000'); // 400 days
    expect(cookie).not.toContain('Secure');
  });

  it('adds Secure only when asked', async () => {
    const res = await request(app({ ensure: true, secure: true })).get('/api/probe');
    expect(res.headers['set-cookie']![0]).toContain('Secure');
  });

  it('keeps and renews a valid cookie instead of replacing it', async () => {
    const res = await request(app({ ensure: true })).get('/api/probe').set('Cookie', `${VISITOR_COOKIE}=${ID}`);
    expect(res.body.id).toBe(ID);
    expect(res.headers['set-cookie']![0]).toMatch(new RegExp(`^${VISITOR_COOKIE}=${ID};.*Max-Age=34560000`));
  });

  it('replaces a forged cookie with a fresh ID', async () => {
    const res = await request(app({ ensure: true })).get('/api/probe').set('Cookie', `${VISITOR_COOKIE}=forged`);
    expect(res.body.id).not.toBe('forged');
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
