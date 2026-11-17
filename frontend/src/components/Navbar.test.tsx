import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from '../routes';
import { renderWithProviders } from '../test/renderWithProviders';
import { Navbar } from './Navbar';
import { waitForHomeToSettle } from '../test/settle';

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

  it('on the home page, shows links to the Frog Library and About, but no Home link', () => {
    renderWithProviders(<Navbar />, { route: '/' });
    expect(navItems()).toEqual(['link:Frog Library', 'link:About']);
    expect(screen.getByRole('link', { name: 'Frog Library' })).toHaveAttribute('href', '/frog-library');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });

  it.each(['/frog-library', '/frog-library/'])('on %s, shows Home and About, but no Frog Library link', (route) => {
    renderWithProviders(<Navbar />, { route });
    expect(navItems()).toEqual(['link:Home', 'link:About']);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it.each(['/about', '/about/'])('on %s, shows Home and the Frog Library, but no About link', (route) => {
    renderWithProviders(<Navbar />, { route });
    expect(navItems()).toEqual(['link:Home', 'link:Frog Library']);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it.each(['/does-not-exist', '/frog-library/extra', '/about/extra', '/aboutme', '/home'])(
    'on %s (not a page), shows all three links',
    (route) => {
      renderWithProviders(<Navbar />, { route });
      expect(navItems()).toEqual(['link:Home', 'link:Frog Library', 'link:About']);
    },
  );

  it('is links only: no buttons in the nav', () => {
    renderWithProviders(<Navbar />, { route: '/does-not-exist' });
    const nav = within(screen.getByRole('navigation', { name: 'Main' }));
    const links = nav.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Home', 'Frog Library', 'About']);
    for (const link of links) expect(link).toHaveClass('navbar-link');
    expect(nav.queryAllByRole('button')).toHaveLength(0);
  });

  it('navigates between all three pages, hiding the link to the page you are on', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
    await waitForHomeToSettle();

    await user.click(screen.getByRole('link', { name: 'About' }));
    expect(router.state.location.pathname).toBe('/about');
    expect(screen.getByRole('heading', { level: 2, name: 'About' })).toBeInTheDocument();
    expect(navItems()).toEqual(['link:Home', 'link:Frog Library']);

    await user.click(screen.getByRole('link', { name: 'Frog Library' }));
    expect(router.state.location.pathname).toBe('/frog-library');
    expect(screen.getByRole('heading', { level: 2, name: 'Frog Library' })).toBeInTheDocument();
    expect(navItems()).toEqual(['link:Home', 'link:About']);

    await user.click(screen.getByRole('link', { name: 'About' }));
    expect(router.state.location.pathname).toBe('/about');
    expect(navItems()).toEqual(['link:Home', 'link:Frog Library']);

    await user.click(screen.getByRole('link', { name: 'Home' }));
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'About Me' })).toBeInTheDocument();
    expect(navItems()).toEqual(['link:Frog Library', 'link:About']);
  });

  it('has the colour and layout classes on its root', () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByRole('banner')).toHaveClass('d-navbar', 'navbar');
  });
});
