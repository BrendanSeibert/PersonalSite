import { ColumnLayout } from '../components/ColumnLayout';
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
      right={
        <>
          <h2>{t('home.right.heading')}</h2>
          <p>{t('home.right.body')}</p>
        </>
      }
      leftLabel={t('home.left.heading')}
      rightLabel={t('home.right.heading')}
    />
  );
}
