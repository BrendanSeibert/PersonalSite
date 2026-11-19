import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyFavorites, fetchTopFavorites, saveFavorite } from '../api/favorites';
import type { EntryId } from './frogEntries';

export const MINE_KEY = ['favorites', 'mine'] as const;
export const TOP_KEY = ['favorites', 'top'] as const;
export const FAVORITE_MUTATION = ['favorite'] as const;
const STALE_MS = 30_000; // other visitors' likes show up on the next refetch after this

export const useMyFavorites = () => useQuery({ queryKey: MINE_KEY, queryFn: fetchMyFavorites, staleTime: STALE_MS });
export const useTopFavorites = (enabled = true) =>
  useQuery({ queryKey: TOP_KEY, queryFn: fetchTopFavorites, staleTime: STALE_MS, enabled });

// One frog's heart. Every heart for the same frog reads the same cache entry, so the library,
// the spinner and the panel always agree.
export function useFavorite(entryId: EntryId) {
  const queryClient = useQueryClient();
  const mine = useMyFavorites();
  const mutation = useMutation({
    mutationKey: FAVORITE_MUTATION,
    scope: { id: `favorite:${entryId}` }, // this frog's saves go one at a time, in click order
    mutationFn: (favorited: boolean) => saveFavorite(entryId, favorited),
    onMutate: async (favorited) => {
      await queryClient.cancelQueries({ queryKey: MINE_KEY });
      const before = queryClient.getQueryData<EntryId[]>(MINE_KEY);
      queryClient.setQueryData<EntryId[]>(MINE_KEY, (ids = []) =>
        favorited ? [...new Set([...ids, entryId])] : ids.filter((id) => id !== entryId),
      );
      return { before };
    },
    // Put back what was there; the refetch below then brings the server's truth.
    onError: (_error, _favorited, context) => queryClient.setQueryData(MINE_KEY, context?.before),
    // Returned on purpose: the save counts as finished only once both lists are refetched, so the
    // next queued save for this frog (same scope) starts from the server's truth, and
    // FavoritesStatus never sees a save as done while the page still shows the optimistic state.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MINE_KEY }),
        queryClient.invalidateQueries({ queryKey: TOP_KEY }),
      ]),
  });

  const favorited = mine.data?.includes(entryId) ?? false;
  return {
    favorited,
    ready: mine.isSuccess, // hearts are aria-disabled until your favorites are known
    toggle: () => {
      if (mine.isSuccess) mutation.mutate(!favorited);
    },
  };
}
