import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import { translate } from '../i18n/translate';
import { renderWithProviders } from '../test/renderWithProviders';
import { NewTabLink } from './NewTabLink';

describe('NewTabLink', () => {
  it('opens in a new tab without letting that tab reach back, and keeps the caller’s class', () => {
    renderWithProviders(
      <NewTabLink href="https://example.com/x" className="my-link">
        Example
      </NewTabLink>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass('my-link');
  });

  it('adds the new-tab warning after the text, with a space between', () => {
    renderWithProviders(
      <NewTabLink href="https://example.com/x" className="my-link">
        Example
      </NewTabLink>,
    );
    const warning = translate(en, 'link.newTab');
    // (Testing Library's name computation trims the hidden span's leading space, so check the text.)
    expect(screen.getByRole('link').textContent).toBe(`Example ${warning}`);
    expect(screen.getByRole('link').querySelector('.visually-hidden')!.textContent).toBe(` ${warning}`);
  });

  it('says the link is a PDF when pdf is set', () => {
    renderWithProviders(
      <NewTabLink href="https://example.com/x.pdf" className="my-link" pdf>
        Paper
      </NewTabLink>,
    );
    const warning = translate(en, 'link.newTabPdf');
    expect(screen.getByRole('link').querySelector('.visually-hidden')!.textContent).toBe(` ${warning}`);
    expect(warning).not.toBe(translate(en, 'link.newTab'));
  });
});
