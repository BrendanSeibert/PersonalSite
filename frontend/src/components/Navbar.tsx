import { Link, matchPath, useLocation } from 'react-router';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translate';
import { PATHS } from '../paths';
import './Navbar.scss';

type NavItem = { key: TranslationKey; to?: string };

const NAV_ITEMS: readonly NavItem[] = [
  { key: 'navbar.home', to: PATHS.home },
  { key: 'navbar.frogLibrary', to: PATHS.frogLibrary },
  { key: 'navbar.about' }, // no page yet: a button that does nothing
];

export function Navbar() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  // The link to the page you are on is not shown. `end: true` so "/" only matches the home page;
  // matchPath also treats a trailing slash as the same page.
  const items = NAV_ITEMS.filter(({ to }) => !to || !matchPath({ path: to, end: true }, pathname));

  return (
    <header className="d-navbar navbar">
      <h1 className="navbar-title">{t('navbar.title')}</h1>
      <nav className="navbar-links" aria-label={t('navbar.label')}>
        <ul className="navbar-list">
          {items.map(({ key, to }) => (
            <li key={key}>
              {to ? (
                <Link to={to} className="navbar-button">
                  {t(key)}
                </Link>
              ) : (
                <button type="button" className="navbar-button">
                  {t(key)}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
