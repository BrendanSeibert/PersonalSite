import { FROG_ENTRIES } from '../components/frogEntries';

// An in-memory stand-in for the backend's four favorites endpoints: one visitor's favorites and
// everyone's tallies. Shared by MSW (jsdom tests) and the fetch mock (browser tests).
const ORDER = FROG_ENTRIES.map((entry) => entry.id as string);
const state = { mine: new Set<string>(), counts: new Map<string, number>() };
export const favoriteRequests: string[] = []; // "PUT entry07", in arrival order

export function resetFavorites() {
  state.mine.clear();
  state.counts.clear();
  favoriteRequests.length = 0;
}

// `counts` are everyone's likes; a frog in `mine` counts at least 1 unless counts says otherwise.
export function seedFavorites({ mine = [], counts = {} }: { mine?: string[]; counts?: Record<string, number> }) {
  for (const id of mine) {
    state.mine.add(id);
    state.counts.set(id, Math.max(state.counts.get(id) ?? 0, 1));
  }
  for (const [id, count] of Object.entries(counts)) state.counts.set(id, count);
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

// The fake's answer, or undefined for a URL it doesn't handle.
export function answerFavorites(method: string, url: string): Response | undefined {
  const path = new URL(url, 'http://localhost').pathname;
  if (!path.startsWith('/api/favorites/')) return undefined;
  const rest = path.slice('/api/favorites/'.length);

  if (method === 'GET' && rest === 'mine') {
    return json({ entryIds: ORDER.filter((id) => state.mine.has(id)) });
  }
  if (method === 'GET' && rest === 'top') {
    const top = [...state.counts]
      .filter(([, count]) => count > 0)
      .sort(([a, x], [b, y]) => y - x || ORDER.indexOf(a) - ORDER.indexOf(b))
      .slice(0, 10)
      .map(([entryId, count]) => ({ entryId, count }));
    return json({ top });
  }
  if (method === 'PUT' || method === 'DELETE') {
    favoriteRequests.push(`${method} ${rest}`);
    if (!ORDER.includes(rest)) return json({ error: 'Unknown frog' }, 404);
    const had = state.mine.has(rest);
    const count = state.counts.get(rest) ?? 0;
    if (method === 'PUT' && !had) {
      state.mine.add(rest);
      state.counts.set(rest, count + 1);
    } else if (method === 'DELETE' && had) {
      state.mine.delete(rest);
      state.counts.set(rest, count - 1);
    }
    return json({ entryId: rest, favorited: method === 'PUT', count: state.counts.get(rest) ?? 0 });
  }
  return json({ error: 'Not found' }, 404);
}
