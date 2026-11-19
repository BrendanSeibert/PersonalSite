import { usePageTitle } from '../components/usePageTitle';
import { useI18n } from '../context/I18nContext';
import './ErrorPage.scss';

// Shown in place of a page that failed to render (routes.tsx errorElement). The nav bar stays.
export function ErrorPage() {
  const { t } = useI18n();
  usePageTitle('error.heading');

  return (
    // tabIndex -1: AppLayout focuses <main> after a navigation; never a Tab stop. Named for the
    // page, so a screen reader says which page opened when focus lands here.
    <main className="d-error-page error-page" tabIndex={-1} aria-label={t('error.heading')}>
      <h2>{t('error.heading')}</h2>
      <p>{t('error.body')}</p>
    </main>
  );
}
