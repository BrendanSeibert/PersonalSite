import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { routes } from '../routes';
import { renderWithProviders } from './renderWithProviders';
import { waitForHomeToSettle } from './settle';

// The real routes with one extra page inside the layout's error boundary, so a test can mount a
// page that throws.
export const routesWithPage = (extra: RouteObject): RouteObject[] => {
  const layout = routes[0];
  const pages = layout.children![0];
  // (Cast: RouteObject is a union, and an index route may not have children.)
  const wrapped = { ...pages, children: [...pages.children!, extra] } as RouteObject;
  return [{ ...layout, children: [wrapped] } as RouteObject];
};

// Mounts the real routes at `url`, as main.tsx does, and waits until the page is ready: the home
// page until favorites have loaded, any other page until its level-2 heading shows.
export async function renderApp(url = '/', { routeList = routes }: { routeList?: RouteObject[] } = {}) {
  const router = createMemoryRouter(routeList, { initialEntries: [url] });
  const result = renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
  if (url === '/') await waitForHomeToSettle();
  else await screen.findByRole('heading', { level: 2 });
  return { router, ...result };
}
