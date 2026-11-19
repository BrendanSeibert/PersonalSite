import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import { renderWithProviders } from '../test/renderWithProviders';
import { AboutPage } from './AboutPage';
import { PAHERPS_URL } from './contactLinks';

// The citation exactly as it reads on the page (the URL inside it is also a link).
const CITATION =
  'Pa Herp Identification, https://www.paherps.com/herps/frogs-toads/, accessed November 16, 2026';

describe('AboutPage', () => {
  it('is the main landmark, focusable by script only, with the "About" heading', () => {
    renderWithProviders(<AboutPage />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('tabIndex', '-1');
    expect(within(main).getByRole('heading', { level: 2, name: 'About' })).toBeInTheDocument();
  });

  it('names its one <main> "About" and titles the tab "About · Brendan Seibert"', () => {
    renderWithProviders(<AboutPage />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main', { name: 'About' })).toBeInTheDocument();
    expect(document.title).toBe('About · Brendan Seibert');
  });

  it('shows the lead, the body and the source from en.json, in that order', () => {
    renderWithProviders(<AboutPage />);
    expect(screen.getByText(en.about.intro)).toHaveClass('about-page-intro');
    expect(screen.getByText(en.about.body)).toBeInTheDocument();
    const shown = screen.getByRole('main').cloneNode(true) as HTMLElement;
    for (const hidden of shown.querySelectorAll('.visually-hidden')) hidden.remove(); // screen-reader-only text
    const paragraphs = [...shown.querySelectorAll('p')].map((p) => p.textContent);
    expect(paragraphs).toEqual([en.about.intro, en.about.body, CITATION]);
    expect(screen.getByRole('main').querySelector('p:last-child')).toHaveClass('about-page-source');
  });

  it('has no placeholder text left', () => {
    renderWithProviders(<AboutPage />);
    expect(screen.getByRole('main').textContent).not.toMatch(/lorem|ipsum|\{url\}/i);
  });

  it('makes the source URL in the citation a link, showing the URL as written, in a new tab', () => {
    renderWithProviders(<AboutPage />);
    const main = screen.getByRole('main');
    expect(within(main).queryAllByRole('button')).toHaveLength(0);
    const links = within(main).getAllByRole('link');
    expect(links).toHaveLength(1); // the only Tab stop on the page
    const link = links[0]!;
    expect(link.firstChild!.textContent).toBe('https://www.paherps.com/herps/frogs-toads/');
    // A screen reader also hears that it opens a new tab; nothing extra is drawn.
    // (jsdom trims the hidden span's leading space from the name; a real browser keeps it, and
    // a11y.browser.test.tsx checks the exact name in Chromium.)
    expect(link).toHaveAccessibleName(/^https:\/\/www\.paherps\.com\/herps\/frogs-toads\/ ?\(opens in a new tab\)$/);
    expect(link.querySelector('.visually-hidden')!.textContent).toBe(' (opens in a new tab)');
    expect(link).toHaveAttribute('href', 'https://www.paherps.com/herps/frogs-toads/');
    expect(link).toHaveAttribute('href', en.about.sourceUrl); // the shown text and the target agree
    expect(PAHERPS_URL).toBe(en.about.sourceUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass('about-page-source-link');
  });

  it('has the colour and layout classes on its root, and the panel class', () => {
    renderWithProviders(<AboutPage />);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('d-about-page', 'about-page');
    expect(main.firstElementChild).toHaveClass('about-page-panel');
  });
});
