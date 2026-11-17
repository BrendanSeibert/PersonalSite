import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { createApp } from './app.js';
import { migrate } from './migrate.js';
import { PRODUCTION_LIMITS } from './security.js';

const config = loadConfig(process.env);
const pool = createPool(config.DATABASE_URL, config.DATABASE_CA_CERT);

// The tables must exist before the first request. If a migration fails, stop: Docker shows the error.
try {
  await migrate(pool);
} catch (err) {
  console.error('Database migration failed, not starting:', err);
  await pool.end().catch(() => {});
  process.exit(1);
}

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
server.keepAliveTimeout = 65_000; // longer than a hosting proxy's idle timeout (usually 60 s)
server.headersTimeout = 66_000; // must exceed keepAliveTimeout

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return; // a second signal while we are already stopping: ignore it
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);

  // Safety net: if closing gets stuck, give up after 8 seconds (Docker's own limit is 10).
  setTimeout(() => {
    console.error('Shutdown took too long, forcing exit');
    process.exit(1);
  }, 8000).unref();

  server.close(async (err) => {
    // stop accepting new requests, finish the ones in progress
    try {
      await pool.end(); // then close the database connections
    } catch (poolErr) {
      console.error('Error while closing the database pool:', poolErr);
    }
    process.exit(err ? 1 : 0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM')); // sent by Docker and by nodemon
process.on('SIGINT', () => shutdown('SIGINT')); // sent by Ctrl+C, and by nodemon first
