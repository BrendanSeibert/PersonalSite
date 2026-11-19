import { NewTabLink } from '../components/NewTabLink';
import { usePageTitle } from '../components/usePageTitle';
import { useI18n } from '../context/I18nContext';
import { fillSlots } from '../i18n/fillSlots';
import { PAHERPS_URL } from './contactLinks';
import './AboutPage.scss';

// One panel, like the home page's middle column: a heading, a lead paragraph, the body and the
// source of the frog facts.
export function AboutPage() {
  const { t } = useI18n();
  usePageTitle('about.heading');

  return (
    // tabIndex -1: AppLayout focuses <main> after a navigation; never a Tab stop. Named for the
    // page, so a screen reader says which page opened when focus lands here.
    <main className="d-about-page about-page" tabIndex={-1} aria-label={t('about.heading')}>
      <div className="about-page-panel">
        <h2>{t('about.heading')}</h2>
        <p className="about-page-intro">{t('about.intro')}</p>
        <p>{t('about.body')}</p>
        <p className="about-page-source">
          {fillSlots(t('about.source'), {
            // The citation shows its URL as written; the link only makes it clickable (new tab).
            url: (
              <NewTabLink className="about-page-source-link" href={PAHERPS_URL}>
                {t('about.sourceUrl')}
              </NewTabLink>
            ),
          })}
        </p>
      </div>
    </main>
  );
}
