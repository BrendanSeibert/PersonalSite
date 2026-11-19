import { StrictMode, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { I18nProvider } from '../context/I18nContext';
import type { Dictionary } from '../i18n/translate';

type Options = {
  route?: string; // the pretend URL to start at (default '/')
  withRouter?: boolean; // set to false when the thing you render brings its own router
  dictionary?: Dictionary; // swap in another dictionary (default: the real English one)
  // Wrap everything in <StrictMode>, outermost, as main.tsx does. React only re-runs effects on
  // mount when StrictMode is at the root, so wrapping just the router inside would not do it.
  strict?: boolean;
};

// Renders `ui` the way main.tsx does: i18n, a fresh TanStack QueryClient (no retries, so a failed
// request fails at once), and a MemoryRouter at `route`, unless withRouter is false because the
// thing rendered brings its own router (then `route` is ignored). Returns RTL's result plus the
// QueryClient, so a test can wait on query state instead of sleeping.
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', withRouter = true, dictionary, strict = false }: Options = {},
) {
  // A brand-new QueryClient per test, so no test sees data cached by another one.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const content = withRouter ? <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter> : ui;
  const tree = (
    <I18nProvider dictionary={dictionary}>
      <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
    </I18nProvider>
  );
  return { ...render(strict ? <StrictMode>{tree}</StrictMode> : tree), queryClient };
}
