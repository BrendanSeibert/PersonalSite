import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createPool } from '../../src/db.js';
import { migrate } from '../../src/migrate.js';
import { resetToSeed } from './dbReset.js';

const pool = createPool(loadConfig(process.env).DATABASE_URL);
const app = createApp({ db: pool });

// One agent per visitor: each keeps its own ex3_visitor cookie between requests, like a browser.
const visitor = () => request.agent(app);
const like = (agent: ReturnType<typeof visitor>, id: string) => agent.put(`/api/favorites/${id}`);
const unlike = (agent: ReturnType<typeof visitor>, id: string) => agent.delete(`/api/favorites/${id}`);
const mine = async (agent: ReturnType<typeof visitor>) => (await agent.get('/api/favorites/mine')).body.entryIds;
const top = async () => (await request(app).get('/api/favorites/top')).body.top;
const entry = (n: number) => `entry${String(n).padStart(2, '0')}`;

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await migrate(pool);
});

beforeEach(async () => {
  await resetToSeed(pool);
});

afterAll(async () => {
  await resetToSeed(pool);
  vi.restoreAllMocks();
  await pool.end();
});

describe('favorites, against a real PostgreSQL', () => {
  it('tallies across visitors, and each visitor sees only their own list', async () => {
    const a = visitor();
    const b = visitor();
    expect((await like(a, 'entry07')).body).toEqual({ entryId: 'entry07', favorited: true, count: 1 });
    expect((await like(b, 'entry07')).body.count).toBe(2);
    expect((await unlike(a, 'entry07')).body).toEqual({ entryId: 'entry07', favorited: false, count: 1 });
    expect(await mine(a)).toEqual([]);
    expect(await mine(b)).toEqual(['entry07']);
  });

  it('is idempotent: liking three times counts once, unliking twice never goes negative', async () => {
    const a = visitor();
    for (let i = 0; i < 3; i += 1) expect((await like(a, 'entry07')).body.count).toBe(1);
    expect((await unlike(a, 'entry07')).body.count).toBe(0);
    expect((await unlike(a, 'entry07')).body.count).toBe(0);
  });

  it('ignores an unlike from a visitor without a cookie', async () => {
    await like(visitor(), 'entry07');
    const res = await unlike(visitor(), 'entry07');
    expect(res.body.count).toBe(1);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('counts exactly under concurrency: 50 visitors at once, and one visitor 10 times at once', async () => {
    const visitors = Array.from({ length: 50 }, visitor);
    // Give each visitor its cookie first, so the burst below is 50 distinct, known visitors.
    await Promise.all(visitors.map((v) => like(v, 'entry01')));
    await Promise.all(visitors.map((v) => like(v, 'entry03')));
    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM favorites WHERE entry_id = 'entry03'");
    expect(rows[0].n).toBe(50);

    const one = visitor();
    await like(one, 'entry04');
    await Promise.all(Array.from({ length: 10 }, () => like(one, 'entry04')));
    expect((await like(one, 'entry04')).body.count).toBe(1);
  });

  it('returns the top ten: most liked first, ties in position order, no zero counts', async () => {
    // Frog n (1..12) gets `likes[n - 1]` likes; entry02 and entry05 tie on 7.
    const likes = [1, 7, 3, 9, 7, 2, 4, 5, 6, 8, 10, 1];
    const crowd = Array.from({ length: 10 }, visitor);
    for (const [i, n] of likes.entries()) {
      for (const v of crowd.slice(0, n)) await like(v, entry(i + 1));
    }
    const result = await top();
    expect(result).toHaveLength(10);
    expect(result.map((r: { entryId: string }) => r.entryId)).toEqual([
      'entry11', 'entry04', 'entry10', 'entry02', 'entry05', 'entry09', 'entry08', 'entry07', 'entry03', 'entry06',
    ]);
    expect(result.map((r: { count: number }) => r.count)).toEqual([10, 9, 8, 7, 7, 6, 5, 4, 3, 2]);
    expect(result.every((r: { count: number }) => r.count > 0)).toBe(true);
  });

  it('replaces a forged cookie with a fresh one, and stores the like under the new ID', async () => {
    const res = await request(app).put('/api/favorites/entry07').set('Cookie', 'ex3_visitor=not-a-uuid');
    expect(res.status).toBe(200);
    // The cookie is <uuid>.<signature>; the database stores only the UUID.
    const match = /ex3_visitor=([^.;]+)\.[^;]+/.exec(String(res.headers['set-cookie']));
    expect(match).not.toBeNull();
    const issued = match![1];
    expect(issued).not.toBe('not-a-uuid');
    const { rows } = await pool.query('SELECT visitor_id FROM favorites');
    expect(rows).toEqual([{ visitor_id: issued }]);
  });

  it('accepts a frog added later: liked, listed and sorted by its position', async () => {
    await pool.query("INSERT INTO frogs (id, position) VALUES ('entry21', 0)"); // sorts first
    const a = visitor();
    await like(a, 'entry10');
    expect((await like(a, 'entry21')).status).toBe(200);
    expect(await mine(a)).toEqual(['entry21', 'entry10']);
    expect((await top()).map((r: { entryId: string }) => r.entryId)).toEqual(['entry21', 'entry10']);
  });

  it('forgets a removed frog: its likes go, it leaves every list, and liking it is a 404', async () => {
    const a = visitor();
    const b = visitor();
    await like(a, 'entry05');
    await like(b, 'entry05');
    await like(a, 'entry06');
    await pool.query("DELETE FROM frogs WHERE id = 'entry05'");

    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM favorites WHERE entry_id = 'entry05'");
    expect(rows[0].n).toBe(0);
    expect(await mine(a)).toEqual(['entry06']);
    expect((await top()).map((r: { entryId: string }) => r.entryId)).toEqual(['entry06']);
    const res = await like(a, 'entry05');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Unknown frog' });
  });

  it('refuses a favorite for a frog that does not exist, even written directly', async () => {
    await expect(
      pool.query("INSERT INTO favorites (visitor_id, entry_id) VALUES ('3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b', 'entry99')"),
    ).rejects.toThrow(/foreign key/);
  });

  it('follows a new order when two frogs swap positions', async () => {
    const a = visitor();
    await like(a, 'entry02');
    await like(a, 'entry09');
    // position is UNIQUE, so swap through a spare value.
    await pool.query("UPDATE frogs SET position = -1 WHERE id = 'entry02'");
    await pool.query("UPDATE frogs SET position = 2 WHERE id = 'entry09'");
    await pool.query("UPDATE frogs SET position = 9 WHERE id = 'entry02'");
    expect(await mine(a)).toEqual(['entry09', 'entry02']);
    expect((await top()).map((r: { entryId: string }) => r.entryId)).toEqual(['entry09', 'entry02']); // a tie on 1
  });
});
