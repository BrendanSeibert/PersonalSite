import { FROG_ENTRIES, type EntryId } from '../components/frogEntries';

export type TopFavorite = { entryId: EntryId; count: number };

const KNOWN = new Set<string>(FROG_ENTRIES.map((entry) => entry.id));
const isKnown = (id: unknown): id is EntryId => typeof id === 'string' && KNOWN.has(id);
const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

async function request(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url} failed with status ${res.status}`);
  return res.json();
}

// Data from the server is checked before the UI sees it: unknown frogs and invalid counts are dropped.
export async function fetchMyFavorites(): Promise<EntryId[]> {
  const body = (await request('/api/favorites/mine')) as { entryIds?: unknown } | null;
  return Array.isArray(body?.entryIds) ? body.entryIds.filter(isKnown) : [];
}

export async function fetchTopFavorites(): Promise<TopFavorite[]> {
  const body = (await request('/api/favorites/top')) as { top?: unknown } | null;
  if (!Array.isArray(body?.top)) return [];
  return body.top
    .filter((row: unknown): row is TopFavorite => {
      const { entryId, count } = (row ?? {}) as Partial<Record<keyof TopFavorite, unknown>>;
      return isKnown(entryId) && isCount(count) && count > 0;
    })
    .map(({ entryId, count }) => ({ entryId, count }));
}

export async function saveFavorite(entryId: EntryId, favorited: boolean): Promise<void> {
  await request(`/api/favorites/${encodeURIComponent(entryId)}`, { method: favorited ? 'PUT' : 'DELETE' });
}
