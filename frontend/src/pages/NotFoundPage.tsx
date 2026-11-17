import { usePageTitle } from '../components/usePageTitle';
import { useI18n } from '../context/I18nContext';
import './NotFoundPage.scss';

export function NotFoundPage() {
  const { t } = useI18n();
  usePageTitle('notFound.heading');

  return (
    // tabIndex -1: AppLayout focuses <main> after a navigation; never a Tab stop. Named for the
    // page, so a screen reader says which page opened when focus lands here.
    <main className="d-not-found-page not-found-page" tabIndex={-1} aria-label={t('notFound.heading')}>
      <h2>{t('notFound.heading')}</h2>
    </main>
  );
}
