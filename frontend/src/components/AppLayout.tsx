import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useI18n } from '../context/I18nContext';
import { Navbar } from './Navbar';
import './AppLayout.scss';

export function AppLayout() {
  const { t } = useI18n();

  useEffect(() => {
    document.title = t('app.title');
    document.documentElement.lang = t('app.lang');
  }, [t]);

  return (
    <div className="d-app-layout app-layout">
      <Navbar />
      <Outlet />
    </div>
  );
}
