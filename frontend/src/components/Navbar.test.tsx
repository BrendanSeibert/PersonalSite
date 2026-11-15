import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../routes';
import { renderWithProviders } from '../test/renderWithProviders';
import { Navbar } from './Navbar';

// The nav's items in order, as "role:name", so links and the About button are told apart.
function navItems() {
  const nav = screen.getByRole('navigation', { name: 'Main' });
  return within(nav)
    .getAllByRole('listitem')
    .map((item) => {
      const control = item.firstElementChild as HTMLElement;
      return `${control.tagName === 'A' ? 'link' : 'button'}:${control.textContent}`;
    });
}

describe('Navbar', () => {
  it('shows the site title as the level-1 heading inside the banner', () => {
    renderWithProviders(<Navbar />);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('heading', { level: 1, name: 'Brendan Seibert' })).toBeInTheDocument();
  });

  it('on the home page, shows a link to the Frog Library and the About button, but no Home link', () => {
    renderWithProviders(<Navbar />, { route: '/' });
    expect(navItems()).toEqual(['link:Frog Library', 'button:About']);
    expect(screen.getByRole('link', { name: 'Frog Library' })).toHaveAttribute('href', '/frog-library');
  });

  it.each(['/frog-library', '/frog-library/'])('on %s, shows a Home link and About, but no Frog Library link', (route) => {
    renderWithProviders(<Navbar />, { route });
    expect(navItems()).toEqual(['link:Home', 'button:About']);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it.each(['/does-not-exist', '/frog-library/extra', '/home'])('on %s (not a page), shows both links and About', (route) => {
    renderWithProviders(<Navbar />, { route });
    expect(navItems()).toEqual(['link:Home', 'link:Frog Library', 'button:About']);
  });

  it('makes Home and Frog Library links, and About a plain button', () => {
    renderWithProviders(<Navbar />, { route: '/does-not-exist' });
    const nav = within(screen.getByRole('navigation', { name: 'Main' }));
    expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual(['Home', 'Frog Library']);
    expect(nav.getByRole('button', { name: 'About' })).toHaveAttribute('type', 'button');
    for (const control of [...nav.getAllByRole('link'), nav.getByRole('button')]) {
      expect(control).toHaveClass('navbar-button');
    }
  });

  it('navigates between the pages, hiding the link to the page you are on', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
    await screen.findByText('API ok, database up');

    await user.click(screen.getByRole('link', { name: 'Frog Library' }));
    expect(router.state.location.pathname).toBe('/frog-library');
    expect(screen.getByRole('heading', { level: 2, name: 'Frog Library' })).toBeInTheDocument();
    expect(navItems()).toEqual(['link:Home', 'button:About']);

    await user.click(screen.getByRole('link', { name: 'Home' }));
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Hello, world' })).toBeInTheDocument();
    expect(navItems()).toEqual(['link:Frog Library', 'button:About']);
  });

  it('does nothing yet when About is clicked', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
    await screen.findByText('API ok, database up');

    await user.click(screen.getByRole('button', { name: 'About' }));
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Hello, world' })).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('has the colour and layout classes on its root', () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByRole('banner')).toHaveClass('d-navbar', 'navbar');
  });
});
