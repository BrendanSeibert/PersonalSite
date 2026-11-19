import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '../context/I18nContext';
import { ExpandableFrogCard } from './ExpandableFrogCard';
import { FROG_ENTRIES, type EntryId, type FrogEntry } from './frogEntries';
import { visibleFavorites } from './favoritesList';
import { MODES, nextTab, type Mode } from './favoritesTabs';
import { useMyFavorites, useTopFavorites } from './useFavorite';
import { useStoredFlag } from './useStoredFlag';
import './FavoritesPanel.scss';

export const MODE_STORAGE_KEY = 'ex3.favoritesMode';

const TAB_LABEL = { mine: 'favorites.mine.tab', allTime: 'favorites.allTime.tab' } as const;

type Item = { entry: FrogEntry; likes?: number };
type Props = {
  entries?: FrogEntry[]; // defaults to the same list the spinner uses; tests pass their own
};

// The home page's right column: Your Favorites (default) or All Time Favorites, chosen with the
// tabs across its top, which serve as its header (the WAI-ARIA tabs pattern, with automatic
// activation). Cards open and close exactly like the spinner's landed card.
export function FavoritesPanel({ entries = FROG_ENTRIES }: Props) {
  const { t } = useI18n();
  const headingId = useId();
  const baseId = useId();
  const tabId = (mode: Mode) => `${baseId}-tab-${mode}`;
  const panelId = (mode: Mode) => `${baseId}-panel-${mode}`;
  const tabs = useRef<Partial<Record<Mode, HTMLButtonElement | null>>>({});
  const [allTime, setAllTime] = useStoredFlag(MODE_STORAGE_KEY, 'allTime');
  const current: Mode = allTime ? 'allTime' : 'mine';
  const mine = useMyFavorites();
  const top = useTopFavorites(allTime); // fetched only while All Time is shown
  // Every frog shown in Your Favorites since the tab was opened. A card you unlike stays (with an
  // empty heart) until you switch tabs or reload, so a mis-tap is one tap to undo and keyboard focus
  // is never lost; liking a frog elsewhere adds it at once.
  const [shown, setShown] = useState<ReadonlySet<EntryId>>(() => new Set());
  // Adjusted during render, not in an effect: React re-renders at once, before anything is painted.
  const showing = !allTime && mine.data ? mine.data : [];
  if (showing.some((id) => !shown.has(id))) setShown(new Set([...shown, ...showing]));

  function select(mode: Mode) {
    if (mode === current) return; // re-clicking the open tab is not a switch: keep the unliked cards
    setShown(new Set());
    setAllTime(mode === 'allTime');
  }

  // Roving focus: arrows wrap, Home and End jump; selection follows focus (automatic activation).
  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const next = nextTab(current, event.key);
    if (!next) return;
    event.preventDefault();
    select(next);
    tabs.current[next]?.focus();
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
      {/* The tabs are the panel's visible header. The heading stays for screen readers only, so
          heading navigation still reaches this column like the other two, and it names the tablist. */}
      <h2 id={headingId} className="visually-hidden">
        {t('favorites.label')}
      </h2>
      <div role="tablist" aria-labelledby={headingId} className="favorites-panel-tabs">
        {MODES.map((mode) => (
          <button
            key={mode}
            ref={(el) => {
              tabs.current[mode] = el;
            }}
            type="button"
            role="tab"
            id={tabId(mode)}
            aria-selected={mode === current}
            aria-controls={panelId(mode)}
            tabIndex={mode === current ? 0 : -1}
            className="favorites-panel-tab"
            onClick={() => select(mode)}
            onKeyDown={onTabKeyDown}
          >
            {t(TAB_LABEL[mode])}
          </button>
        ))}
      </div>
      {MODES.map((mode) => (
        <div
          key={mode}
          role="tabpanel"
          id={panelId(mode)}
          aria-labelledby={tabId(mode)}
          hidden={mode !== current}
          // Always focusable (APG): a message has nothing else to focus, and a tabIndex taken away
          // while the panel has focus (Loading… -> list) would drop focus to <body>.
          tabIndex={mode === current ? 0 : undefined}
          className="favorites-panel-tabpanel"
        >
          {mode !== current ? null : message ? (
            <p className="favorites-panel-message">{message}</p>
          ) : (
            // role="list": Safari drops list semantics from a list styled with list-style: none.
            // No name of its own: the tabpanel around it already says which list this is.
            <List className="favorites-panel-list" role="list">
              {items.map(({ entry, likes }) => (
                <li key={entry.id} className="favorites-panel-item">
                  <ExpandableFrogCard className="favorites-panel-card" entry={entry} heart likes={likes} />
                </li>
              ))}
            </List>
          )}
        </div>
      ))}
    </div>
  );
}
