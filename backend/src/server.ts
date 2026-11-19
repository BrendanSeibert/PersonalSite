import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { createApp } from './app.js';
import { migrate } from './migrate.js';
import { createShutdown, migrateOrExit } from './lifecycle.js';
import { PRODUCTION_LIMITS } from './security.js';

const config = loadConfig(process.env);
const pool = createPool(config.DATABASE_URL, config.DATABASE_CA_CERT);

// Migrations get their own one-connection pool: waiting for another instance's migration lock,
// or building an index, can take longer than the 5 s a web request is allowed.
const MIGRATION_TIMEOUT_MS = 10 * 60 * 1000;
const migrationPool = createPool(config.DATABASE_URL, config.DATABASE_CA_CERT, {
  max: 1,
  statement_timeout: MIGRATION_TIMEOUT_MS,
  query_timeout: MIGRATION_TIMEOUT_MS,
});

// The tables must exist before the first request. If a migration fails, stop: Docker shows the error.
await migrateOrExit({ run: () => migrate(migrationPool), migrationPool, appPool: pool, exit: process.exit });

const production = config.NODE_ENV === 'production';
const app = createApp({
  db: pool,
  cookieSecure: config.COOKIE_SECURE,
  trustProxy: config.TRUST_PROXY,
  staticDir: config.STATIC_DIR,
  limits: production ? PRODUCTION_LIMITS : undefined, // the Vite proxy shares one address in development
  checkOrigin: production, // the Vite proxy rewrites Host in development
  visitorSecret: config.VISITOR_SECRET, // always set in production (config.ts); unset: the development key
});

const server = app.listen(config.PORT, () => console.log(`API listening on ${config.PORT}`));
// Do not lower: if Node closes an idle connection the hosting proxy is about to reuse, the proxy answers 502.
server.keepAliveTimeout = 65_000; // longer than a hosting proxy's idle timeout (usually 60 s)
server.headersTimeout = 66_000; // must exceed keepAliveTimeout

const shutdown = createShutdown({ server, pool, exit: process.exit });
process.on('SIGTERM', () => shutdown('SIGTERM')); // sent by Docker and by nodemon
process.on('SIGINT', () => shutdown('SIGINT')); // sent by Ctrl+C, and by nodemon first
