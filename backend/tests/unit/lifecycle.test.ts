import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShutdown, migrateOrExit } from '../../src/lifecycle.js';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('migrateOrExit', () => {
  it('ends the migration pool and does not exit on success', async () => {
    const migrationPool = { end: vi.fn().mockResolvedValue(undefined) };
    const appPool = { end: vi.fn().mockResolvedValue(undefined) };
    const exit = vi.fn();
    const run = vi.fn().mockResolvedValue(['001_x.sql']);
    await migrateOrExit({ run, migrationPool, appPool, exit });
    expect(run).toHaveBeenCalledOnce();
    expect(migrationPool.end).toHaveBeenCalledOnce();
    expect(appPool.end).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it('logs, ends both pools even if one end() rejects, and exits 1 on failure', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const migrationPool = { end: vi.fn().mockRejectedValue(new Error('already closed')) };
    const appPool = { end: vi.fn().mockResolvedValue(undefined) };
    const exit = vi.fn();
    const failure = new Error('Migration 001_x.sql failed');
    await migrateOrExit({ run: () => Promise.reject(failure), migrationPool, appPool, exit });
    expect(spy).toHaveBeenCalledWith('Database migration failed, not starting:', failure);
    expect(migrationPool.end).toHaveBeenCalledOnce();
    expect(appPool.end).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
});

describe('createShutdown', () => {
  function setup(closeError?: Error) {
    const closeCallbacks: Array<(err?: Error) => unknown> = [];
    const server = { close: vi.fn((cb: (err?: Error) => unknown) => closeCallbacks.push(cb)) };
    const pool = { end: vi.fn().mockResolvedValue(undefined) };
    const exit = vi.fn();
    const log = { log: vi.fn(), error: vi.fn() };
    const shutdown = createShutdown({ server, pool, exit, log });
    const finishClose = () => closeCallbacks[0](closeError);
    return { server, pool, exit, log, shutdown, finishClose };
  }

  it('closes the server, then the pool, then exits 0', async () => {
    const { server, pool, exit, log, shutdown, finishClose } = setup();
    shutdown('SIGTERM');
    expect(log.log).toHaveBeenCalledWith('SIGTERM received, shutting down');
    expect(server.close).toHaveBeenCalledOnce();
    expect(pool.end).not.toHaveBeenCalled(); // not until the server has closed
    await finishClose();
    expect(pool.end).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('exits 1 when server.close reports an error', async () => {
    const { pool, exit, shutdown, finishClose } = setup(new Error('close failed'));
    shutdown('SIGINT');
    await finishClose();
    expect(pool.end).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('logs a pool error and still exits with the close result', async () => {
    const { pool, exit, log, shutdown, finishClose } = setup();
    const poolErr = new Error('pool boom');
    pool.end.mockRejectedValue(poolErr);
    shutdown('SIGTERM');
    await finishClose();
    expect(log.error).toHaveBeenCalledWith('Error while closing the database pool:', poolErr);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('ignores a second signal', () => {
    const { server, shutdown } = setup();
    shutdown('SIGTERM');
    shutdown('SIGINT');
    expect(server.close).toHaveBeenCalledOnce();
  });

  it('forces exit 1 when closing hangs', () => {
    const { exit, log, shutdown } = setup();
    shutdown('SIGTERM'); // the close callback never fires
    vi.advanceTimersByTime(7999);
    expect(exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(log.error).toHaveBeenCalledWith('Shutdown took too long, forcing exit');
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('does not let the force-exit timer keep the process alive', () => {
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const { shutdown } = setup();
    shutdown('SIGTERM');
    const timer = spy.mock.results[0].value as { hasRef: () => boolean };
    expect(timer.hasRef()).toBe(false);
  });
});
