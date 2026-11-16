import type { RouteObject } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { PATHS } from './paths';
import { AboutPage } from './pages/AboutPage';
import { FrogLibraryPage } from './pages/FrogLibraryPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: PATHS.frogLibrary, element: <FrogLibraryPage /> },
      { path: PATHS.about, element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
