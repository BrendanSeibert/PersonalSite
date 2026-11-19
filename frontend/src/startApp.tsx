import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from './context/I18nContext';
import { createQueryClient } from './queryClient';
import { routes } from './routes';
import { bootstrapTheme } from './theme/themeStorage';

// Everything main.tsx does, in a module the unit tests can run. `appRoutes` lets a test mount a
// probe page instead of the real ones.
export function startApp(container: HTMLElement, appRoutes: RouteObject[] = routes) {
  // Before React renders, so its first paint is already in the right colours.
  bootstrapTheme();

  const router = createBrowserRouter(appRoutes);
  const queryClient = createQueryClient();
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </I18nProvider>
    </StrictMode>,
  );
  return root;
}
