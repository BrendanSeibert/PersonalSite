import { useI18n } from '../context/I18nContext';
import './AboutPage.scss';

// One panel, like the home page's middle column: a heading, a lead paragraph and the body.
export function AboutPage() {
  const { t } = useI18n();

  return (
    // tabIndex -1: AppLayout focuses <main> after a navigation; never a Tab stop.
    <main className="d-about-page about-page" tabIndex={-1}>
      <div className="about-page-panel">
        <h2>{t('about.heading')}</h2>
        <p className="about-page-intro">{t('about.intro')}</p>
        <p>{t('about.body')}</p>
      </div>
    </main>
  );
}
