type Server = { close: (callback: (err?: Error) => void) => unknown };
type Pool = { end: () => Promise<void> };
type Exit = (code: number) => void;

// Applies migrations on their own pool, then closes it. The tables must exist before the first
// request. On failure: log, close both pools, exit 1 (Docker shows the error).
export async function migrateOrExit({
  run,
  migrationPool,
  appPool,
  exit,
}: {
  run: () => Promise<unknown>;
  migrationPool: Pool;
  appPool: Pool;
  exit: Exit;
}): Promise<void> {
  try {
    await run();
  } catch (err) {
    console.error('Database migration failed, not starting:', err);
    await Promise.all([migrationPool.end(), appPool.end()].map((p) => p.catch(() => {})));
    exit(1);
    return;
  }
  await migrationPool.end();
}

// Returns the function to call on SIGTERM/SIGINT. Stops accepting requests, lets the ones in
// progress finish, closes the database pool, then exits (1 if closing failed). A second signal
// is ignored; if closing hangs, it forces exit 1 after timeoutMs (Docker's own limit is 10 s).
export function createShutdown({
  server,
  pool,
  exit,
  timeoutMs = 8000,
  log = console,
}: {
  server: Server;
  pool: Pool;
  exit: Exit;
  timeoutMs?: number;
  log?: Pick<Console, 'log' | 'error'>;
}): (signal: string) => void {
  let shuttingDown = false;

  return (signal: string) => {
    if (shuttingDown) return; // a second signal while we are already stopping: ignore it
    shuttingDown = true;
    log.log(`${signal} received, shutting down`);

    // Safety net: if closing gets stuck, give up after timeoutMs (Docker's own limit is 10 s).
    setTimeout(() => {
      log.error('Shutdown took too long, forcing exit');
      exit(1);
    }, timeoutMs).unref();

    server.close(async (err) => {
      // stop accepting new requests, finish the ones in progress
      try {
        await pool.end(); // then close the database connections
      } catch (poolErr) {
        log.error('Error while closing the database pool:', poolErr);
      }
      exit(err ? 1 : 0);
    });
  };
}
