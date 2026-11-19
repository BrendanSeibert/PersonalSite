import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import { translate } from '../i18n/translate';
import { renderWithProviders } from '../test/renderWithProviders';
import { ErrorPage } from './ErrorPage';

describe('ErrorPage', () => {
  it('is the one main landmark, focusable by script only, named and headed from en.json, with the body text', () => {
    renderWithProviders(<ErrorPage />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    const main = screen.getByRole('main', { name: en.error.heading });
    expect(main).toHaveAttribute('tabIndex', '-1');
    expect(within(main).getByRole('heading', { level: 2, name: en.error.heading })).toBeInTheDocument();
    expect(within(main).getByText(en.error.body)).toBeInTheDocument();
  });

  it('titles the tab with the page-title format', () => {
    renderWithProviders(<ErrorPage />);
    expect(document.title).toBe(translate(en, 'app.pageTitle', { page: en.error.heading, site: en.app.title }));
  });

  it('has the colour and layout classes on its root', () => {
    renderWithProviders(<ErrorPage />);
    expect(screen.getByRole('main')).toHaveClass('d-error-page', 'error-page');
  });
});
