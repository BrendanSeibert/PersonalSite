import net from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createPool } from '../../src/db.js';

const openSockets = new Set<net.Socket>();
// Accepts every connection, never sends a single byte back.
const silentServer = net.createServer((socket) => openSockets.add(socket));
let port = 0;

beforeAll(async () => {
  await new Promise<void>((resolve) => silentServer.listen(0, '127.0.0.1', resolve)); // 0 = any free port
  port = (silentServer.address() as net.AddressInfo).port;
});

afterAll(async () => {
  for (const socket of openSockets) socket.destroy(); // close() waits for open sockets, so end them first
  await new Promise<void>((resolve) => silentServer.close(() => resolve()));
});

it('returns 503 quickly when the database never answers', async () => {
  const pool = createPool(`postgres://test:test@127.0.0.1:${port}/test`);
  try {
    const started = Date.now();
    const res = await request(createApp({ db: pool })).get('/api/health');
    expect(res.status).toBe(503);
    expect(Date.now() - started).toBeLessThan(5000); // timeout is 2000 ms, so allow some slack
  } finally {
    await pool.end();
  }
});
