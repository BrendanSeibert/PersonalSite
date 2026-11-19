import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../test/server';
import { ApiError, fetchMyFavorites, fetchTopFavorites, saveFavorite } from './favorites';

describe('favorites API client', () => {
  it('fetches your favorites, dropping ids it has no frog for', async () => {
    server.use(
      http.get('/api/favorites/mine', () => HttpResponse.json({ entryIds: ['entry02', 'entry99', 7, null, 'entry07'] })),
    );
    expect(await fetchMyFavorites()).toEqual(['entry02', 'entry07']);
  });

  it.each([{}, { entryIds: 'entry01' }, null])('treats a body without a list (%j) as no favorites', async (body) => {
    server.use(http.get('/api/favorites/mine', () => HttpResponse.json(body)));
    expect(await fetchMyFavorites()).toEqual([]);
  });

  it('fetches the top favorites, dropping unknown frogs and invalid or zero counts', async () => {
    server.use(
      http.get('/api/favorites/top', () =>
        HttpResponse.json({
          top: [
            { entryId: 'entry07', count: 12 },
            { entryId: 'entry99', count: 5 },
            { entryId: 'entry01', count: -1 },
            { entryId: 'entry02', count: 1.5 },
            { entryId: 'entry03', count: '4' },
            { entryId: 'entry04', count: 0 },
            null,
            { entryId: 'entry05', count: 1, extra: '<script>' },
          ],
        }),
      ),
    );
    expect(await fetchTopFavorites()).toEqual([
      { entryId: 'entry07', count: 12 },
      { entryId: 'entry05', count: 1 },
    ]);
  });

  it('treats a top body without a list as no favorites', async () => {
    server.use(http.get('/api/favorites/top', () => HttpResponse.json({ top: {} })));
    expect(await fetchTopFavorites()).toEqual([]);
  });

  it('likes with PUT and unlikes with DELETE, sending cookies for this site only', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const seen: string[] = [];
    server.use(
      http.all('/api/favorites/:id', ({ request, params }) => {
        seen.push(`${request.method} ${String(params.id)}`);
        return HttpResponse.json({ ok: true });
      }),
    );
    await saveFavorite('entry07', true);
    await saveFavorite('entry07', false);
    expect(seen).toEqual(['PUT entry07', 'DELETE entry07']);
    expect(fetchSpy).toHaveBeenCalledWith('/api/favorites/entry07', { credentials: 'same-origin', method: 'PUT' });
    fetchSpy.mockRestore();
  });

  it.each([
    ['GET', () => fetchMyFavorites(), 'mine'],
    ['GET', () => fetchTopFavorites(), 'top'],
    ['PUT', () => saveFavorite('entry07', true), 'entry07'],
  ] as const)('throws on a failed %s, naming the status', async (method, call, path) => {
    server.use(http.all(`/api/favorites/${path}`, () => new HttpResponse(null, { status: 500 })));
    await expect(call()).rejects.toThrow(`${method} /api/favorites/${path} failed with status 500`);
    const error = await call().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });
});
