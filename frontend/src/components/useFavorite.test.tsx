import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { answerFavorites, favoriteRequests } from '../test/favoritesFake';
import { server } from '../test/server';
import { useFavorite, useTopFavorites } from './useFavorite';

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  // Two hearts for the same frog, and one for another, sharing one cache.
  const hook = renderHook(
    () => ({
      a: useFavorite('entry07'),
      b: useFavorite('entry07'),
      other: useFavorite('entry01'),
      top: useTopFavorites(), // as when All Time Favorites is on screen
    }),
    { wrapper },
  );
  return { ...hook, queryClient };
}

// Counts the GETs the fake answers, by path.
function countGets() {
  const gets: string[] = [];
  server.use(
    http.get('/api/favorites/:which', ({ request, params }) => {
      gets.push(String(params.which));
      return answerFavorites('GET', request.url);
    }),
  );
  return gets;
}

describe('useFavorite', () => {
  it('is not ready while your favorites load, and toggle() then sends nothing', async () => {
    server.use(http.get('/api/favorites/mine', async () => {
      await delay('infinite');
      return HttpResponse.json({ entryIds: [] });
    }));
    const { result } = setup();
    expect(result.current.a.ready).toBe(false);
    act(() => result.current.a.toggle());
    expect(result.current.a.favorited).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(favoriteRequests).toEqual([]);
  });

  it('is not ready when your favorites fail to load', async () => {
    server.use(http.get('/api/favorites/mine', () => new HttpResponse(null, { status: 500 })));
    const { result, queryClient } = setup();
    await waitFor(() => expect(queryClient.getQueryState(['favorites', 'mine'])?.status).toBe('error'));
    expect(result.current.a.ready).toBe(false);
  });

  it('changes at once (optimistic), and every heart for that frog agrees', async () => {
    server.use(http.put('/api/favorites/entry07', async () => {
      await delay(200);
      return answerFavorites('PUT', '/api/favorites/entry07');
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.a.ready).toBe(true));
    act(() => result.current.a.toggle());
    await waitFor(() => expect(result.current.a.favorited).toBe(true));
    expect(result.current.b.favorited).toBe(true);
    expect(result.current.other.favorited).toBe(false);
    expect(favoriteRequests).toEqual([]); // the server hasn't answered yet: the delayed handler doesn't record
  });

  it('refetches yours and the top list after a save', async () => {
    const gets = countGets();
    const { result } = setup();
    await waitFor(() => expect(result.current.a.ready).toBe(true));
    await waitFor(() => expect(result.current.top.isSuccess).toBe(true));
    gets.length = 0;
    act(() => result.current.a.toggle());
    await waitFor(() => expect(gets.sort()).toEqual(['mine', 'top']));
    expect(result.current.a.favorited).toBe(true);
  });

  it('rolls back when the save fails, before any refetch could', async () => {
    let minesServed = 0;
    server.use(
      http.put('/api/favorites/entry07', async () => {
        await delay(50); // long enough to see the optimistic state first
        return new HttpResponse(null, { status: 500 });
      }),
      // Only the first load answers: the refetch after the failure never does, so only the
      // rollback itself can put the heart back.
      http.get('/api/favorites/mine', async ({ request }) => {
        minesServed += 1;
        if (minesServed > 1) await delay('infinite');
        return answerFavorites('GET', request.url);
      }),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.a.ready).toBe(true));
    act(() => result.current.a.toggle());
    await waitFor(() => expect(result.current.a.favorited).toBe(true));
    await waitFor(() => expect(result.current.a.favorited).toBe(false));
    expect(result.current.b.favorited).toBe(false);
  });

  it('sends one frog’s saves one at a time, in click order, and the last click wins', async () => {
    const log: string[] = [];
    let inFlight = 0;
    let overlapped = false;
    server.use(
      http.all('/api/favorites/entry07', async ({ request }) => {
        inFlight += 1;
        if (inFlight > 1) overlapped = true;
        log.push(`start ${request.method}`);
        await delay(100);
        log.push(`end ${request.method}`);
        inFlight -= 1;
        return answerFavorites(request.method, request.url);
      }),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.a.ready).toBe(true));
    // Three quick clicks, each as soon as the last one shows (no polling in between), all while
    // the first save is still on its way.
    // 5ms per click: enough for the optimistic update, far less than the server's 100ms.
    const click = () =>
      act(async () => {
        result.current.a.toggle();
        await new Promise((resolve) => setTimeout(resolve, 5));
      });
    await click(); // like
    expect(result.current.a.favorited).toBe(true);
    await click(); // unlike
    expect(result.current.a.favorited).toBe(false);
    await click(); // like
    expect(result.current.a.favorited).toBe(true);
    expect(log).toEqual(['start PUT']); // the other two are waiting their turn
    await waitFor(() => expect(log).toHaveLength(6), { timeout: 2000 });
    expect(log).toEqual(['start PUT', 'end PUT', 'start DELETE', 'end DELETE', 'start PUT', 'end PUT']);
    expect(overlapped).toBe(false);
    await waitFor(() => expect(result.current.a.favorited).toBe(true));
  });

  it('saves different frogs in parallel', async () => {
    let inFlight = 0;
    let peak = 0;
    server.use(
      http.put('/api/favorites/:id', async ({ request }) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await delay(50);
        inFlight -= 1;
        return answerFavorites('PUT', request.url);
      }),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.a.ready).toBe(true));
    act(() => {
      result.current.a.toggle();
      result.current.other.toggle();
    });
    await waitFor(() => expect(result.current.other.favorited).toBe(true));
    await waitFor(() => expect(inFlight).toBe(0));
    expect(peak).toBe(2);
  });
});
