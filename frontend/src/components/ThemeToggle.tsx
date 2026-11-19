import { useI18n } from '../context/I18nContext';
import { useTheme } from '../theme/useTheme';
import './ThemeToggle.scss';

// Decorative icons: they sit inside an aria-hidden track and take their colour from CSS.
function SunIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" focusable="false">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" focusable="false">
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" fill="currentColor" />
    </svg>
  );
}

export function ThemeToggle() {
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label={t('theme.toggle')}
      className="d-theme-toggle theme-toggle"
      onClick={toggle}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb" />
        <SunIcon className="theme-toggle-icon theme-toggle-icon-sun" />
        <MoonIcon className="theme-toggle-icon theme-toggle-icon-moon" />
      </span>
    </button>
  );
}
