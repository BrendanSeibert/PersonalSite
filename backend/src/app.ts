import { STATUS_CODES } from 'node:http';
import compression from 'compression';
import express, { type ErrorRequestHandler, type Express } from 'express';
import type { Db } from './db.js';
import { favoritesRouter } from './routes/favorites.js';
import { healthRouter } from './routes/health.js';
import { createLimiters, sameOriginWrites, securityHeaders, type Limits } from './security.js';
import { serveStaticSite } from './staticSite.js';
import { DEV_VISITOR_SECRET } from './visitor.js';

type AppOptions = {
  db: Db;
  cookieSecure?: boolean; // the visitor cookie's Secure flag (COOKIE_SECURE); also turns on HSTS
  trustProxy?: number; // TRUST_PROXY: how many proxies to believe in X-Forwarded-For
  staticDir?: string; // STATIC_DIR; unset serves no files
  limits?: Limits; // unset: no rate limits (development, most tests)
  checkOrigin?: boolean; // refuse writes from other sites (production)
  visitorSecret?: string; // VISITOR_SECRET, the visitor cookie's signing key; unset: the development key
  extraRoutes?: (app: Express) => void;
};

export function createApp({
  db,
  cookieSecure = false,
  trustProxy = 0,
  staticDir,
  limits,
  checkOrigin = false,
  visitorSecret = DEV_VISITOR_SECRET,
  extraRoutes,
}: AppOptions) {
  const app = express();
  app.disable('x-powered-by'); // don't advertise "Express" in every response
  app.set('trust proxy', trustProxy);
  app.use(securityHeaders({ https: cookieSecure })); // 1. headers on every response, errors included
  app.use(compression()); // 2. gzip text
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store'); // 3. nothing from the API is ever cached
    next();
  });
  if (limits) app.use('/api', createLimiters(limits, visitorSecret)); // 4. limits, API only, one set per app
  if (checkOrigin) app.use('/api', sameOriginWrites); // 5. writes from this site only
  app.use(express.json({ limit: '10kb' })); // 6. parse JSON request bodies, small ones only
  app.use('/api', healthRouter(db)); // 7. real routes
  app.use('/api', favoritesRouter(db, { cookieSecure, visitorSecret }));
  extraRoutes?.(app); // 8. test-only routes
  if (staticDir) app.use(serveStaticSite(staticDir)); // 9. the frontend, and index.html for pages

  // 10. Not-found handler: only reached if no route above answered.
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // 11. Error handler: Express recognises it because it takes FOUR arguments.
  const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    // 11a. Too late to send an error response: let Express close the connection.
    if (res.headersSent) return next(err);

    // 11b. Use the error's own status only if it is a real error status (400-599).
    const status =
      typeof err.status === 'number' && err.status >= 400 && err.status <= 599 ? err.status : 500;

    // 11c. Decide what the client is allowed to see.
    let message: string;
    if (status >= 500) {
      console.error(err); // full details go to the server log only
      message = 'Internal server error';
    } else if (err.expose === true) {
      message = err.message; // the library marked this message as safe to show
    } else {
      message = STATUS_CODES[status] ?? 'Request error'; // generic text, e.g. "Not Found"
    }
    res.status(status).json({ error: message });
  };
  app.use(errorHandler);

  return app;
}
