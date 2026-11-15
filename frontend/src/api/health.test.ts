import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { fetchHealth } from './health';

describe('fetchHealth', () => {
  it('returns parsed JSON on 200', async () => {
    await expect(fetchHealth()).resolves.toEqual({ status: 'ok', db: 'up' });
  });

  it('throws on 503', async () => {
    server.use(
      http.get('/api/health', () => HttpResponse.json({ status: 'degraded', db: 'down' }, { status: 503 })),
    );
    await expect(fetchHealth()).rejects.toThrow('Health check failed with status 503');
  });

  it('throws on network failure', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()));
    await expect(fetchHealth()).rejects.toThrow();
  });
});
