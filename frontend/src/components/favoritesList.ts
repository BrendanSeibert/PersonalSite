import type { EntryId, FrogEntry } from './frogEntries';

// Which frogs Your Favorites shows: everything you favorite now, plus anything shown since the
// mode was opened, so an unliked card stays (with an empty heart) until you switch modes. That
// keeps a mis-tap one tap from undone, and keyboard focus is never lost. Always in en.json order.
export function visibleFavorites(entries: FrogEntry[], mine: readonly EntryId[], shownBefore: ReadonlySet<EntryId>) {
  const show = new Set([...shownBefore, ...mine]);
  return entries.filter((entry) => show.has(entry.id));
}
