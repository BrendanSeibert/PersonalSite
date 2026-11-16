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
        <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z" />
      </svg>
    </button>
  );
}
