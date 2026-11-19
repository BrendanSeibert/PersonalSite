import { cleanup, screen, waitFor } from '@testing-library/react';
import { page, userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FROG_ENTRIES } from './components/frogEntries';
import en from './i18n/en.json';
import { translate } from './i18n/translate';
import { expectNoAxeViolations } from './test/axe';
import { setTheme } from './test/browserHelpers';
import { seedFavorites } from './test/favoritesFake';
import { renderApp, routesWithPage } from './test/renderApp';
import { applyTextSpacing } from './test/textSpacing';

// axe-core's WCAG 2.x A and AA rules over every page, and the home page's key states, in real
// Chromium (so it sees computed styles). A new page or state gets a case here.
// axe finds the mechanical failures only; a screen reader, keyboard-only use, 400% zoom, a
// forced-colours theme and flipping the OS theme with the site open still need checking by hand.

const SPIN_TIMEOUT = 6000; // the spin is 3s; allow for a slow CI machine
const AXE_TIMEOUT = 15000; // a full-page scan, after a spin, on a slow machine

// Every favorites request answers 500, as when the API is down.
function failFavorites() {
  const passThrough = vi.mocked(window.fetch).getMockImplementation()!;
  vi.mocked(window.fetch).mockImplementation((input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (new URL(url, location.href).pathname.startsWith('/api/favorites/')) {
      return Promise.resolve(Response.json({ error: 'Server error' }, { status: 500 }));
    }
    return passThrough(input, init);
  });
}

describe.each([
  ['light', 375, 667],
  ['light', 1280, 800],
  ['dark', 375, 667],
  ['dark', 1280, 800],
] as const)('no WCAG A or AA violations in the %s theme at %i × %i', (theme, width, height) => {
  beforeEach(async () => {
    await page.viewport(width, height);
    setTheme(theme); // before renderApp, so the app starts in this theme
  });

  if (theme === 'dark') {
    it('on the home page after switching to dark with a click', async () => {
      setTheme('light');
      await renderApp('/');
      expect(document.documentElement.dataset.theme).toBe('light');
      await userEvent.click(screen.getByRole('switch', { name: 'Dark mode' }));
      expect(document.documentElement.dataset.theme).toBe('dark');
      // No waiting for transitions: the switch changes every colour at once (applyTheme), so the
      // page must pass straight after the click.
      await expectNoAxeViolations();
    });
  }

  it('on the home page, idle, with favorites', async () => {
    seedFavorites({ mine: ['entry03', 'entry08'], counts: { entry07: 4 } });
    await renderApp('/');
    const seeded = FROG_ENTRIES.find((e) => e.id === 'entry08')!;
    await screen.findByRole('button', {
      name: translate(en, 'favorites.toggle', { title: translate(en, seeded.titleKey) }),
    });
    await expectNoAxeViolations();
  });

  it(
    'on the home page with a card landed and open',
    async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      await renderApp('/');
      await userEvent.click(screen.getByRole('button', { name: 'Spin the wheel' }));
      const status = screen.getAllByRole('status').find((el) => el.classList.contains('frog-spinner-result'))!;
      await vi.waitFor(() => expect(status).toHaveTextContent('You got: '), { timeout: SPIN_TIMEOUT });
      const face = document.querySelector<HTMLButtonElement>('.frog-spinner-pick .frog-card-face')!;
      await userEvent.click(face);
      expect(face).toHaveAttribute('aria-expanded', 'true');
      // The open card floats over the Spin button by design (it opens without moving anything, and
      // closes on a click outside, Escape, or focus moving away), so axe's target-size rule sees the
      // button as covered. This is the one deliberate exception (CLAUDE.md, Accessibility): the button
      // stays reachable because the card closes on a click outside, Escape or focus leaving it;
      // target size is still checked in every other state.
      await expectNoAxeViolations(document, { skipRules: ['target-size'] });
    },
    AXE_TIMEOUT,
  );

  it('on the home page in All Time Favorites', async () => {
    seedFavorites({ mine: ['entry02'], counts: { entry02: 3, entry07: 12, entry13: 1 } });
    await renderApp('/');
    await userEvent.click(screen.getByRole('tab', { name: 'All Time Favorites' }));
    await waitFor(() => expect(document.querySelectorAll('.favorites-panel-item')).toHaveLength(3));
    await expectNoAxeViolations();
  });

  it('on the home page when favorites are unavailable', async () => {
    failFavorites();
    await renderApp('/');
    await screen.findByText('Favorites are unavailable right now.');
    await expectNoAxeViolations();
  });

  it('on the home page with an empty Your Favorites', async () => {
    await renderApp('/');
    await screen.findByText(/^No favorites yet\./);
    await expectNoAxeViolations();
  });

  it.each(['/frog-library', '/about', '/does-not-exist'])('on %s', async (url) => {
    await renderApp(url);
    await expectNoAxeViolations();
  });

  it('on the error page', async () => {
    function Boom(): never {
      throw new Error('boom');
    }
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs the caught error
    await renderApp('/boom', { routeList: routesWithPage({ path: 'boom', element: <Boom /> }) });
    expect(screen.getByRole('heading', { level: 2, name: en.error.heading })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('names the new-tab links exactly, with the space before the hidden warning (Chromium’s own name engine)', async () => {
    // page.getByRole uses Playwright's accessible-name computation, which keeps the hidden span's
    // leading space as a browser does; Testing Library's (in jsdom and here) trims it.
    await renderApp('/');
    for (const name of [
      'my resume (PDF, opens in a new tab)',
      'LinkedIn (opens in a new tab)',
      'GitHub (opens in a new tab)',
    ]) {
      await expect.element(page.getByRole('link', { name, exact: true })).toBeInTheDocument();
    }
    cleanup();
    await renderApp('/about');
    await expect
      .element(page.getByRole('link', { name: 'https://www.paherps.com/herps/frogs-toads/ (opens in a new tab)', exact: true }))
      .toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'my GitHub (opens in a new tab)', exact: true })).toBeInTheDocument();
  });

  it.each([
    ['the Frog Library', '/frog-library'],
    ['the About page', '/about'],
  ])('on %s under the text-spacing overrides', async (_name, url) => {
    await renderApp(url);
    const undo = applyTextSpacing();
    try {
      await expectNoAxeViolations();
    } finally {
      undo();
    }
  });
});
