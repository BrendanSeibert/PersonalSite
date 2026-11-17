import { useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useI18n } from '../context/I18nContext';
import { FavoritesStatus } from './FavoritesStatus';
import { Navbar } from './Navbar';
import './AppLayout.scss';

export function AppLayout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const shownPath = useRef(pathname);
  const layoutRef = useRef<HTMLDivElement>(null);

  // The page language only: each page sets its own title with usePageTitle().
  useEffect(() => {
    document.documentElement.lang = t('app.lang');
  }, [t]);

  // After a navigation (not on the first load), including Back and Forward, start the new page at
  // the top and move keyboard focus to its <main>: the nav link that was pressed is no longer
  // there, and a screen reader should start reading the new page. Comparing paths, not counting
  // renders, keeps StrictMode's double effect run on the first load from moving focus.
  // A layout effect, so this happens before the new page is first painted: a plain effect can run
  // a frame or more later, showing the new page at the old scroll position with focus on <body>.
  useLayoutEffect(() => {
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    window.scrollTo(0, 0);
    // Looked up inside this layout, not the whole document. The nav bar has no <main>, and every
    // page renders exactly one, at whatever depth (HomePage's is inside ColumnLayout).
    layoutRef.current?.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div ref={layoutRef} className="d-app-layout app-layout">
      <Navbar />
      <Outlet />
      {/* Once, for every page: announces a heart that couldn't be saved. */}
      <FavoritesStatus />
    </div>
  );
}
