import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { createApp } from './app.js';

const config = loadConfig(process.env);
const pool = createPool(config.DATABASE_URL);
const app = createApp({ db: pool });

const server = app.listen(config.PORT, () => console.log(`API listening on ${config.PORT}`));

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
