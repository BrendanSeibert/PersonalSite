import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './routes';
import { renderWithProviders } from './test/renderWithProviders';

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
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

  it('renders the nav bar and a not-found page for an unknown URL', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
