import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import { renderWithProviders } from '../test/renderWithProviders';
import { AboutPage } from './AboutPage';

describe('AboutPage', () => {
  it('is the main landmark, focusable by script only, with the "About" heading', () => {
    renderWithProviders(<AboutPage />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('tabIndex', '-1');
    expect(within(main).getByRole('heading', { level: 2, name: 'About' })).toBeInTheDocument();
  });

  it('shows the lead and the body from en.json', () => {
    renderWithProviders(<AboutPage />);
    expect(screen.getByText(en.about.intro)).toHaveClass('about-page-intro');
    expect(screen.getByText(en.about.body)).toBeInTheDocument();
  });

  it('has nothing to click, so Tab after a navigation leaves the page', () => {
    renderWithProviders(<AboutPage />);
    const main = screen.getByRole('main');
    expect(within(main).queryAllByRole('button')).toHaveLength(0);
    expect(within(main).queryAllByRole('link')).toHaveLength(0);
  });

  it('has the colour and layout classes on its root, and the panel class', () => {
    renderWithProviders(<AboutPage />);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('d-about-page', 'about-page');
    expect(main.firstElementChild).toHaveClass('about-page-panel');
  });
});
