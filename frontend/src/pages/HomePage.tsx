import { ColumnLayout } from '../components/ColumnLayout';
import { FavoritesPanel } from '../components/FavoritesPanel';
import { FrogSpinner } from '../components/FrogSpinner';
import { NewTabLink } from '../components/NewTabLink';
import { usePageTitle } from '../components/usePageTitle';
import { useI18n } from '../context/I18nContext';
import { fillSlots } from '../i18n/fillSlots';
import { EMAIL_ADDRESS, GITHUB_URL, LINKEDIN_URL, RESUME_URL } from './contactLinks';
import './HomePage.scss';

export function HomePage() {
  const { t } = useI18n();
  usePageTitle();

  return (
    <ColumnLayout
      middle={
        <>
          <h2>{t('home.middle.heading')}</h2>
          <div className="d-home-page home-page-about">
            <p className="home-page-intro">{t('home.middle.intro')}</p>
            <p className="home-page-intro">
              {fillSlots(t('home.middle.contact'), {
                resume: (
                  <NewTabLink className="home-page-link" href={RESUME_URL} pdf>
                    {t('home.middle.resume')}
                  </NewTabLink>
                ),
                email: (
                  <a className="home-page-link" href={`mailto:${EMAIL_ADDRESS}`}>
                    {t('home.middle.email')}
                  </a>
                ),
                linkedIn: (
                  <NewTabLink className="home-page-link" href={LINKEDIN_URL}>
                    {t('home.middle.linkedIn')}
                  </NewTabLink>
                ),
                gitHub: (
                  <NewTabLink className="home-page-link" href={GITHUB_URL}>
                    {t('home.middle.gitHub')}
                  </NewTabLink>
                ),
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
      mainLabel={t('navbar.home')}
      leftLabel={t('home.left.heading')}
      rightLabel={t('favorites.label')}
    />
  );
}
