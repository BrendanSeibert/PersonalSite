import { ColumnLayout } from '../components/ColumnLayout';
import { FavoritesPanel } from '../components/FavoritesPanel';
import { FrogSpinner } from '../components/FrogSpinner';
import { HealthStatus } from '../components/HealthStatus';
import { useI18n } from '../context/I18nContext';
import './HomePage.scss';

export function HomePage() {
  const { t } = useI18n();

  return (
    <ColumnLayout
      middle={
        <>
          <h2>{t('home.middle.heading')}</h2>
          <p className="home-page-intro">{t('home.middle.intro')}</p>
          <HealthStatus />
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
