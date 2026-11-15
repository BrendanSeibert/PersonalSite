import { useI18n } from '../context/I18nContext';
import './NotFoundPage.scss';

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <main className="d-not-found-page not-found-page">
      <h2>{t('notFound.heading')}</h2>
    </main>
  );
}
