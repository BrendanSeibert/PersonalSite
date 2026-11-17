import { resolve, sep } from 'node:path';
import express, { type RequestHandler, type Router } from 'express';

const ONE_YEAR = 365 * 24 * 60 * 60; // seconds

// Serves a Vite build: hashed /assets for a year, everything else always revalidated, and
// index.html for any page URL (the browser's address bar is React Router's business).
export function serveStaticSite(dir: string): Router {
  const root = resolve(dir);
  const assets = resolve(root, 'assets') + sep;
  const router = express.Router();

  router.use(
    express.static(root, {
      index: false, // "/" is handled by the fallback below, with no-cache
      dotfiles: 'ignore', // never .env, .git, anything hidden
      etag: true,
      setHeaders: (res, filePath) => {
        const hashed = filePath.startsWith(assets);
        res.set('Cache-Control', hashed ? `public, max-age=${ONE_YEAR}, immutable` : 'no-cache');
      },
    }),
  );

  // Only page URLs fall back to index.html. The API, anything under /assets, and any path whose last
  // part has a dot (/robots.txt, /.env, /favicon.ico) get the app's 404, so a missing file is never
  // answered with HTML and a 200.
  const isPageUrl = (path: string) =>
    path !== '/api' &&
    !path.startsWith('/api/') &&
    !path.startsWith('/assets/') &&
    !(path.split('/').pop() ?? '').includes('.');

  const fallback: RequestHandler = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next(); // only pages are documents
    if (!isPageUrl(req.path)) return next(); // the app's JSON 404
    res.sendFile(resolve(root, 'index.html'), { headers: { 'Cache-Control': 'no-cache' } }, (err) => {
      if (err) next(err);
    });
  };
  router.use(fallback);
  return router;
}
