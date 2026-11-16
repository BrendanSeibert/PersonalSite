import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../i18n/en.json';
import type { Dictionary } from '../i18n/translate';
import { routes } from '../routes';
import { renderWithProviders } from '../test/renderWithProviders';
import { AppLayout } from './AppLayout';

// The real routes, so navigation goes between the real pages and their <main>s.
async function renderApp(url = '/', { strict = false } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false, strict });
  if (url === '/') await screen.findByText('API ok, database up');
  return router;
}

function renderLayout(dictionary?: Dictionary) {
  const router = createMemoryRouter(
    [{ element: <AppLayout />, children: [{ index: true, element: <p>child route marker</p> }] }],
    { initialEntries: ['/'] },
  );
  return renderWithProviders(<RouterProvider router={router} />, { withRouter: false, dictionary });
}

afterEach(() => {
  document.title = '';
  document.documentElement.lang = '';
});

describe('AppLayout', () => {
  it('renders the nav bar and the child route', () => {
    renderLayout();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('child route marker')).toBeInTheDocument();
  });

  it('sets the document title and the page language from the dictionary', () => {
    renderLayout();
    expect(document.title).toBe('Brendan Seibert');
    expect(document.documentElement.lang).toBe('en');
  });

  it('follows a custom dictionary for the title', () => {
    renderLayout({ ...en, app: { lang: 'fr', title: 'Le site' } });
    expect(document.title).toBe('Le site');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('has the colour and layout classes on its root', () => {
    const { container } = renderLayout();
    expect(container.firstElementChild).toHaveClass('d-app-layout', 'app-layout');
  });
});

describe('AppLayout, the favorites status', () => {
  it.each(['/', '/frog-library', '/about', '/does-not-exist'])('renders the save-failed status once on %s', async (url) => {
    const router = createMemoryRouter(routes, { initialEntries: [url] });
    const { container } = renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
    if (url === '/') await screen.findByText('API ok, database up');
    const statuses = container.querySelectorAll('.app-layout > p.visually-hidden[role="status"]');
    expect(statuses).toHaveLength(1);
    expect(statuses[0].textContent).toBe('');
  });
});

describe('AppLayout, on navigation', () => {
  it.each([false, true])('moves neither focus nor scroll on the first load (StrictMode: %s)', async (strict) => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    await renderApp('/', { strict });
    expect(screen.getByRole('main')).not.toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
  });

  it('scrolls to the top and focuses the new page’s <main> after each navigation', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    const user = userEvent.setup();
    await renderApp('/');

    await user.click(screen.getByRole('link', { name: 'Frog Library' }));
    const library = screen.getByRole('main');
    expect(library).toHaveClass('frog-library-page');
    expect(library).toHaveFocus();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);

    await user.click(screen.getByRole('link', { name: 'Home' }));
    const home = screen.getByRole('main');
    expect(home).toHaveClass('column-layout-middle');
    expect(home).toHaveFocus();
    expect(scrollTo).toHaveBeenCalledTimes(2);
    scrollTo.mockRestore();
  });

  it('does the same for the About page, which renders one <main tabIndex={-1}>', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    const user = userEvent.setup();
    await renderApp('/');

    await user.click(screen.getByRole('link', { name: 'About' }));
    const about = screen.getByRole('main');
    expect(about).toHaveClass('about-page');
    expect(about).toHaveFocus();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scrollTo.mockRestore();
  });

  it('does the same on Back', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    const user = userEvent.setup();
    const router = await renderApp('/');
    await user.click(screen.getByRole('link', { name: 'Frog Library' }));

    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('main')).toHaveClass('column-layout-middle');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(scrollTo).toHaveBeenCalledTimes(2);
    scrollTo.mockRestore();
  });

  it('does nothing when only the hash changes', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    const router = await renderApp('/frog-library');

    await act(() => router.navigate('/frog-library#entry07'));
    expect(router.state.location.hash).toBe('#entry07');
    expect(screen.getByRole('main')).not.toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
  });
});
