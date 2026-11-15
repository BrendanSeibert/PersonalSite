import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translate';
import './Navbar.scss';

const NAV_ITEMS = ['navbar.home', 'navbar.pickAFrog', 'navbar.about'] as const satisfies readonly TranslationKey[];

export function Navbar() {
  const { t } = useI18n();

  return (
    <header className="d-navbar navbar">
      <h1 className="navbar-title">{t('navbar.title')}</h1>
      <nav className="navbar-links" aria-label={t('navbar.label')}>
        <ul className="navbar-list">
          {NAV_ITEMS.map((key) => (
            <li key={key}>
              {/* No behaviour yet. These become React Router <NavLink>s once the pages exist. */}
              <button type="button" className="navbar-button">
                {t(key)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
