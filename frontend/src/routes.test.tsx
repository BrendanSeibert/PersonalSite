import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './routes';
import { renderWithProviders } from './test/renderWithProviders';

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
  return router;
}

describe('routes', () => {
  it('renders the nav bar and the home page at /', async () => {
    renderAt('/');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hello, world' })).toBeInTheDocument();
    await screen.findByText('API ok, database up');
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

  it('shows a frog liked in the library in Your Favorites on the home page, pressed in both places', async () => {
    const user = userEvent.setup();
    const router = renderAt('/frog-library');
    const heart = screen.getByRole('button', { name: "Favorite Fowler's Toad" });
    await waitFor(() => expect(heart).toHaveAttribute('aria-disabled', 'false'));
    await user.click(heart);
    expect(heart).toHaveAttribute('aria-pressed', 'true');

    await act(() => router.navigate('/'));
    const panel = within(screen.getByRole('complementary', { name: 'Favorites' }));
    const list = await within(await panel.findByRole('tabpanel', { name: 'Your Favorites' })).findByRole('list');
    expect(within(list).getByRole('button', { name: "Fowler's Toad" })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: "Favorite Fowler's Toad" })).toHaveAttribute('aria-pressed', 'true');

    await act(() => router.navigate('/frog-library'));
    expect(screen.getByRole('button', { name: "Favorite Fowler's Toad" })).toHaveAttribute('aria-pressed', 'true');
  });
});
