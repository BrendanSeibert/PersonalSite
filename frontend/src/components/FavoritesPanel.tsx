import { useId, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { ExpandableFrogCard } from './ExpandableFrogCard';
import { FROG_ENTRIES, type EntryId, type FrogEntry } from './frogEntries';
import { visibleFavorites } from './favoritesList';
import { useMyFavorites, useTopFavorites } from './useFavorite';
import { useStoredFlag } from './useStoredFlag';
import './FavoritesPanel.scss';

export const MODE_STORAGE_KEY = 'ex3.favoritesMode';

type Item = { entry: FrogEntry; likes?: number };
type Props = {
  entries?: FrogEntry[]; // defaults to the same list the spinner uses; tests pass their own
};

// The home page's right column: Your Favorites (default) or All Time Favorites, chosen with the
// switch in the corner. Cards open and close exactly like the spinner's landed card.
export function FavoritesPanel({ entries = FROG_ENTRIES }: Props) {
  const { t } = useI18n();
  const headingId = useId();
  const [allTime, setAllTime] = useStoredFlag(MODE_STORAGE_KEY, 'allTime');
  const mine = useMyFavorites();
  const top = useTopFavorites(allTime); // fetched only while All Time is shown
  // Every frog shown in Your Favorites since the mode was opened: an unliked card stays until you
  // switch modes or reload (Decision 6.4).
  const [shown, setShown] = useState<ReadonlySet<EntryId>>(() => new Set());
  // Adjusted during render, not in an effect: React re-renders at once, before anything is painted.
  const showing = !allTime && mine.data ? mine.data : [];
  if (showing.some((id) => !shown.has(id))) setShown(new Set([...shown, ...showing]));

  function switchMode() {
    setShown(new Set());
    setAllTime(!allTime);
  }

  // The list for the current mode, or the message that takes its place.
  let items: Item[] = [];
  let message: string | undefined;
  if (!allTime) {
    if (mine.isPending) message = t('favorites.loading');
    else if (mine.isError) message = t('favorites.unavailable');
    else {
      items = visibleFavorites(entries, mine.data, shown).map((entry) => ({ entry }));
      if (items.length === 0) message = t('favorites.mine.empty');
    }
  } else if (top.isPending) {
    message = t('favorites.loading');
  } else if (top.isError) {
    message = t('favorites.unavailable');
  } else {
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    items = top.data.flatMap(({ entryId, count }) => {
      const entry = byId.get(entryId);
      return entry ? [{ entry, likes: count }] : [];
    });
    if (items.length === 0) message = t('favorites.allTime.empty');
  }

  // <ul> for yours, <ol> for the ranked top ten, so a screen reader announces each frog's rank.
  const List = allTime ? 'ol' : 'ul';

  return (
    <div className="d-favorites-panel favorites-panel">
      <div className="favorites-panel-header">
        <h2 id={headingId}>{t(allTime ? 'favorites.allTime.heading' : 'favorites.mine.heading')}</h2>
        <button
          type="button"
          role="switch"
          aria-checked={allTime}
          className="favorites-panel-switch"
          onClick={switchMode}
        >
          <span className="favorites-panel-switch-label">{t('favorites.switch')}</span>
          <span className="favorites-panel-switch-track" aria-hidden="true" />
        </button>
      </div>
      {message ? (
        <p className="favorites-panel-message">{message}</p>
      ) : (
        // role="list": Safari drops list semantics from a list styled with list-style: none.
        <List className="favorites-panel-list" role="list" aria-labelledby={headingId}>
          {items.map(({ entry, likes }) => (
            <li key={entry.id} className="favorites-panel-item">
              <ExpandableFrogCard className="favorites-panel-card" entry={entry} heart likes={likes} />
            </li>
          ))}
        </List>
      )}
    </div>
  );
}
