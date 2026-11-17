import { ColumnLayout } from '../components/ColumnLayout';
import { FavoritesPanel } from '../components/FavoritesPanel';
import { FrogSpinner } from '../components/FrogSpinner';
import { useI18n } from '../context/I18nContext';
import { fillSlots } from '../i18n/fillSlots';
import { EMAIL_ADDRESS, GITHUB_URL, LINKEDIN_URL, RESUME_URL } from './contactLinks';
import './HomePage.scss';

// Other sites and the resume PDF open in a new tab, so the site stays open behind them;
// noopener stops the new tab from reaching back into this one.
function NewTabLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="home-page-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function HomePage() {
  const { t } = useI18n();

  return (
    <ColumnLayout
      middle={
        <>
          <h2>{t('home.middle.heading')}</h2>
          <div className="d-home-page home-page-about">
            <p className="home-page-intro">{t('home.middle.intro')}</p>
            <p className="home-page-intro">
              {fillSlots(t('home.middle.contact'), {
                resume: <NewTabLink href={RESUME_URL}>{t('home.middle.resume')}</NewTabLink>,
                email: (
                  <a className="home-page-link" href={`mailto:${EMAIL_ADDRESS}`}>
                    {t('home.middle.email')}
                  </a>
                ),
                linkedIn: <NewTabLink href={LINKEDIN_URL}>{t('home.middle.linkedIn')}</NewTabLink>,
                gitHub: <NewTabLink href={GITHUB_URL}>{t('home.middle.gitHub')}</NewTabLink>,
              })}
            </p>
          </div>
        </>
      }
      left={
        <>
          <h2>{t('home.left.heading')}</h2>
          <FrogSpinner />
        </>
      }
      right={<FavoritesPanel />}
      leftLabel={t('home.left.heading')}
      rightLabel={t('favorites.label')}
    />
  );
}
