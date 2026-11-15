import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../routes';
import { renderWithProviders } from '../test/renderWithProviders';
import { Navbar } from './Navbar';

describe('Navbar', () => {
  it('shows the site title as the level-1 heading inside the banner', () => {
    renderWithProviders(<Navbar />);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('heading', { level: 1, name: 'Brendan Seibert' })).toBeInTheDocument();
  });

  it('has a navigation landmark named "Main" with three buttons in order', () => {
    renderWithProviders(<Navbar />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const buttons = within(nav).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Home', 'Pick a Frog', 'About']);
    for (const button of buttons) expect(button).toHaveAttribute('type', 'button');
  });

  it('has the colour and layout classes on its root', () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByRole('banner')).toHaveClass('d-navbar', 'navbar');
  });

  it('does nothing yet when a button is clicked', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
    await screen.findByText('API ok, database up');

    for (const name of ['Home', 'Pick a Frog', 'About']) {
      await user.click(screen.getByRole('button', { name }));
      expect(router.state.location.pathname).toBe('/');
      expect(screen.getByRole('heading', { name: 'Hello, world' })).toBeInTheDocument();
    }
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
