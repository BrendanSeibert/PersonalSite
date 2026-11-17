import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('is the main landmark, focusable by script only, holding the heading', () => {
    renderWithProviders(<NotFoundPage />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('tabIndex', '-1');
    expect(within(main).getByRole('heading', { level: 2, name: 'Page not found' })).toBeInTheDocument();
  });

  it('names its one <main> "Page not found" and titles the tab "Page not found · Brendan Seibert"', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main', { name: 'Page not found' })).toBeInTheDocument();
    expect(document.title).toBe('Page not found · Brendan Seibert');
  });

  it('has the colour and layout classes on its root', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('main')).toHaveClass('d-not-found-page', 'not-found-page');
  });
});
