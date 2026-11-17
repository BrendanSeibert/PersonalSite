import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { ASSET_JS, ENV_TEXT, frogDb, INDEX_FILLER, makeSite } from './siteFixture.js';

let site: Awaited<ReturnType<typeof makeSite>>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  site = await makeSite();
  app = createApp({ db: frogDb(), staticDir: site.dir });
});
afterAll(() => site.remove());

describe('serving the frontend build', () => {
  it.each(['/', '/frog-library', '/about', '/no-such-page'])(
    'answers the page URL %s with index.html, never cached',
    async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.text).toContain(INDEX_FILLER);
    },
  );

  it('caches hashed assets for a year', async () => {
    const res = await request(app).get('/assets/index-abc123.js');
    expect(res.status).toBe(200);
    expect(res.text).toBe(ASSET_JS);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['etag']).toBeDefined();
  });

  it('revalidates unhashed files', async () => {
    const res = await request(app).get('/favicon.svg');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it.each(['/api/nope', '/api'])('keeps the API’s own JSON 404 for %s', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('falls back only for documents', async () => {
    for (const res of [await request(app).post('/about'), await request(app).put('/')]) {
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    }
  });

  it.each([
    '/.env',
    '/assets/.hidden',
    '/assets/../.env',
    '/assets/%2e%2e/.env',
    '/assets/missing.js',
    '/robots.txt',
  ])('answers %s with a JSON 404, never a file or the page', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
    expect(res.text).not.toContain(ENV_TEXT);
    expect(res.text).not.toContain(INDEX_FILLER);
  });

  it('answers HEAD like GET, without a body', async () => {
    const res = await request(app).head('/about');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toBeUndefined();
  });

  it('serves nothing without STATIC_DIR', async () => {
    const res = await request(createApp({ db: frogDb() })).get('/');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('passes a failure to read index.html to the error handler', async () => {
    const broken = createApp({ db: frogDb(), staticDir: `${site.dir}/no-such-folder` });
    const res = await request(broken).get('/about');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
