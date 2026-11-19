import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FROG_ENTRIES } from './components/frogEntries';
import en from './i18n/en.json';
import { translate } from './i18n/translate';
import { routes } from './routes';
import { routesWithPage } from './test/renderApp';
import { renderWithProviders } from './test/renderWithProviders';
import { waitForHomeToSettle } from './test/settle';

function renderAt(url: string, routeList = routes) {
  const router = createMemoryRouter(routeList, { initialEntries: [url] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
  return router;
}

afterEach(() => {
  document.title = ''; // so no test passes on a title left by the one before
});

describe('routes', () => {
  it('renders the nav bar and the home page at /', async () => {
    renderAt('/');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'About Me' })).toBeInTheDocument();
    await waitForHomeToSettle();
  });

  it('renders the nav bar and the Frog Library at /frog-library', () => {
    renderAt('/frog-library');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Frog Library' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Frog Library' })).toBeInTheDocument();
  });

  it('renders the nav bar and the About page at /about', () => {
    renderAt('/about');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'About' })).toBeInTheDocument();
  });

  it('renders the nav bar and a not-found page for an unknown URL', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('shows the error page, inside the layout, when a page throws', () => {
    function Boom(): never {
      throw new Error('boom');
    }
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs the caught error
    try {
      renderAt('/boom', routesWithPage({ path: 'boom', element: <Boom /> }));
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: en.error.heading })).toBeInTheDocument();
      expect(screen.getByText(en.error.body)).toBeInTheDocument();
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });

  it.each([
    ['/', 'Brendan Seibert', 'Home'],
    ['/frog-library', 'Frog Library · Brendan Seibert', 'Frog Library'],
    ['/about', 'About · Brendan Seibert', 'About'],
    ['/nope', 'Page not found · Brendan Seibert', 'Page not found'],
  ])('titles %s "%s" and names its <main> "%s"', async (url, title, mainName) => {
    renderAt(url);
    expect(screen.getByRole('main', { name: mainName })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe(title));
    if (url === '/') await waitForHomeToSettle();
  });

  it('changes the title on navigation, and restores it on Back and Forward', async () => {
    const user = userEvent.setup();
    const router = renderAt('/');
    await waitForHomeToSettle();
    expect(document.title).toBe('Brendan Seibert');

    await user.click(screen.getByRole('link', { name: 'Frog Library' }));
    expect(document.title).toBe('Frog Library · Brendan Seibert');
    expect(screen.getByRole('main', { name: 'Frog Library' })).toHaveFocus();

    await act(() => router.navigate(-1));
    expect(document.title).toBe('Brendan Seibert');
    expect(screen.getByRole('main', { name: 'Home' })).toHaveFocus();
    await waitForHomeToSettle();

    await act(() => router.navigate(1));
    expect(document.title).toBe('Frog Library · Brendan Seibert');
  });

  it('shows a frog liked in the library in Your Favorites on the home page, pressed in both places', async () => {
    const user = userEvent.setup();
    const router = renderAt('/frog-library');
    const title = translate(en, FROG_ENTRIES[2].titleKey);
    const heartName = translate(en, 'favorites.toggle', { title });
    const heart = screen.getByRole('button', { name: heartName });
    await waitFor(() => expect(heart).toHaveAttribute('aria-disabled', 'false'));
    await user.click(heart);
    expect(heart).toHaveAttribute('aria-pressed', 'true');

    await act(() => router.navigate('/'));
    const panel = within(screen.getByRole('complementary', { name: 'Favorites' }));
    const list = await within(await panel.findByRole('tabpanel', { name: 'Your Favorites' })).findByRole('list');
    expect(within(list).getByRole('button', { name: title })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: heartName })).toHaveAttribute('aria-pressed', 'true');

    await act(() => router.navigate('/frog-library'));
    expect(screen.getByRole('button', { name: heartName })).toHaveAttribute('aria-pressed', 'true');
  });
});
