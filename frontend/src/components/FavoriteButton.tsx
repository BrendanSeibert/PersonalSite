import { useI18n } from '../context/I18nContext';
import type { FrogEntry } from './frogEntries';
import { useFavorite } from './useFavorite';
import './FavoriteButton.scss';

// A toggle: aria-pressed, not a radio (radios can't be unchosen, and they come in groups).
export function FavoriteButton({ entry }: { entry: FrogEntry }) {
  const { t } = useI18n();
  const { favorited, ready, toggle } = useFavorite(entry.id);

  return (
    <button
      type="button"
      className="d-favorite-button favorite-button"
      aria-pressed={favorited}
      aria-disabled={!ready}
      aria-label={t('favorites.toggle', { title: t(entry.titleKey) })}
      onClick={toggle}
    >
      <svg className="favorite-button-heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {/* Mirror-symmetric about x = 12. Both curves at the bottom point have real control points,
            so they meet in a clean tip (a degenerate one there drew a "foot" under the heart). */}
        <path d="M12 20.5C7.5 17.5 3 13.8 3 9.2 3 6.3 5.2 4 8 4c1.7 0 3.1.9 4 2.3C12.9 4.9 14.3 4 16 4c2.8 0 5 2.3 5 5.2 0 4.6-4.5 8.3-9 11.3Z" />
      </svg>
    </button>
  );
}
