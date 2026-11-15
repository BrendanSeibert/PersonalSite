import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import type { Dictionary } from '../i18n/translate';
import { renderWithProviders } from '../test/renderWithProviders';
import { AppLayout } from './AppLayout';

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
