import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { I18nProvider } from '../context/I18nContext';
import type { Dictionary } from '../i18n/translate';

type Options = {
  route?: string; // the pretend URL to start at (default '/')
  withRouter?: boolean; // set to false when the thing you render brings its own router
  dictionary?: Dictionary; // swap in another dictionary (default: the real English one)
};

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', withRouter = true, dictionary }: Options = {},
) {
  // A brand-new QueryClient per test, so no test sees data cached by another one.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const content = withRouter ? <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter> : ui;
  return render(
    <I18nProvider dictionary={dictionary}>
      <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
    </I18nProvider>,
  );
}
