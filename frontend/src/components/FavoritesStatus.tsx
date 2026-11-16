import { useMutationState } from '@tanstack/react-query';
import { useI18n } from '../context/I18nContext';
import { FAVORITE_MUTATION } from './useFavorite';

// Says so when a heart couldn't be saved: a heart that quietly flips back isn't enough for a
// screen-reader user. Rendered once, in AppLayout, so it works on every page. Visually hidden:
// sighted visitors see the heart flip back.
export function FavoritesStatus() {
  const { t } = useI18n();
  const saves = useMutationState({
    filters: { mutationKey: FAVORITE_MUTATION },
    select: (mutation) => mutation.state,
  });
  // The most recent save decides: a later success clears the message.
  const latest = saves.reduce<(typeof saves)[number] | undefined>(
    (newest, save) => (!newest || save.submittedAt >= newest.submittedAt ? save : newest),
    undefined,
  );

  return (
    <p className="visually-hidden" role="status">
      {latest?.status === 'error' ? t('favorites.saveFailed') : ''}
    </p>
  );
}
