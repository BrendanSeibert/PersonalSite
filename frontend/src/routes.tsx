import type { RouteObject } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { PATHS } from './paths';
import { AboutPage } from './pages/AboutPage';
import { ErrorPage } from './pages/ErrorPage';
import { FrogLibraryPage } from './pages/FrogLibraryPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />, // AppLayout itself failed: no nav bar, but still our page
    children: [
      {
        errorElement: <ErrorPage />, // a page failed: AppLayout and the nav bar stay
        children: [
          { index: true, element: <HomePage /> },
          { path: PATHS.frogLibrary, element: <FrogLibraryPage /> },
          { path: PATHS.about, element: <AboutPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
