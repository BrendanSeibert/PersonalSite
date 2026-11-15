import { useI18n } from '../context/I18nContext';
import './NotFoundPage.scss';

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    // tabIndex -1: AppLayout focuses <main> after a navigation; never a Tab stop.
    <main className="d-not-found-page not-found-page" tabIndex={-1}>
      <h2>{t('notFound.heading')}</h2>
    </main>
  );
}
