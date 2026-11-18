import { screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { page, userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { FrogCard } from '../components/FrogCard';
import { FROG_ENTRIES, TONES } from '../components/frogEntries';
import en from '../i18n/en.json';
import type { Dictionary } from '../i18n/translate';
import { routes } from '../routes';
import { renderWithProviders } from '../test/renderWithProviders';
import { expectedLayout, VIEWPORTS, type Layout } from '../test/viewports';
import { FrogLibraryPage } from './FrogLibraryPage';
import { waitForHomeToSettle } from '../test/settle';

const IMAGE_MAX_PX = 192; // 12rem: the open layout's largest image, at 16px text
const PANEL_RADIUS_PX = 12; // $radius-lg
const STACKED_MAX_PX = 768; // $stacked-max-width (48rem)
const PAGE_MAX_PX = 1280; // $page-max-width (80rem)

async function renderApp(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
  if (url === '/') await waitForHomeToSettle();
  else await screen.findByRole('heading', { level: 2, name: 'Frog Library' });
  return router;
}

const rect = (element: Element) => element.getBoundingClientRect();
const cards = () => [...document.querySelectorAll<HTMLElement>('.frog-library-page-grid > li > article')];
const panel = () => document.querySelector<HTMLElement>('.frog-library-page-panel')!;
const navItems = () =>
  [...screen.getByRole('banner').querySelectorAll<HTMLElement>('.navbar-link')].map((item) => item.textContent);

function expectNoHorizontalScroll() {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}

// Nothing in the card, its title or its description is cut off, vertically or sideways.
function expectNotClipped(card: HTMLElement) {
  for (const element of [card, card.querySelector('.frog-card-title')!, card.querySelector('.frog-card-blurb')!]) {
    expect(element.scrollHeight, `${element.className} height`).toBeLessThanOrEqual(element.clientHeight + 1);
    expect(element.scrollWidth, `${element.className} width`).toBeLessThanOrEqual(element.clientWidth + 1);
  }
  expect(card.querySelector('.frog-card-blurb')).toBeVisible();
}

function expectInsidePanel() {
  const box = rect(panel());
  for (const card of cards()) {
    const inner = rect(card);
    expect(inner.left).toBeGreaterThanOrEqual(box.left - 1);
    expect(inner.right).toBeLessThanOrEqual(box.right + 1);
  }
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(window.innerWidth + 1);
}

// Rows: one column, each card below the last. Columns: three across, left to right, then down.
function expectGrid(layout: Layout) {
  const boxes = cards().map(rect);
  if (layout === 'rows') {
    boxes.forEach((box, i) => {
      expect(box.left).toBeCloseTo(boxes[0].left, 0);
      expect(box.width).toBeCloseTo(boxes[0].width, 0);
      if (i > 0) expect(box.top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
    });
  } else {
    const [a, b, c, d] = boxes;
    expect(Math.abs(b.top - a.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(c.top - a.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.width - a.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(c.width - a.width)).toBeLessThanOrEqual(1);
    expect(a.right).toBeLessThanOrEqual(b.left + 1);
    expect(b.right).toBeLessThanOrEqual(c.left + 1);
    expect(d.top).toBeGreaterThanOrEqual(a.bottom - 1); // the fourth card starts the next row
    expect(d.left).toBeCloseTo(a.left, 0);
  }
}

describe.each(VIEWPORTS)('the Frog Library at %i × %i (%s)', (width, height) => {
  const layout = expectedLayout(width);

  beforeEach(async () => {
    await page.viewport(width, height);
    await renderApp('/frog-library');
  });

  it(`shows the cards as ${layout === 'rows' ? 'one column' : 'three columns'}`, () => {
    expect(cards()).toHaveLength(FROG_ENTRIES.length);
    expectGrid(layout);
  });

  it('keeps en.json order, in the DOM and on screen', () => {
    const ids = cards().map((card) => card.dataset.entryId);
    expect(ids).toEqual(FROG_ENTRIES.map((entry) => entry.id));
    // Row-major on screen: sorting by (top, left) gives back the DOM order.
    const onScreen = cards()
      .map((card) => ({ id: card.dataset.entryId, box: rect(card) }))
      .sort((x, y) => (Math.abs(x.box.top - y.box.top) > 1 ? x.box.top - y.box.top : x.box.left - y.box.left))
      .map(({ id }) => id);
    expect(onScreen).toEqual(ids);
  });

  if (layout === 'columns') {
    it('gives every card in a row the same height, whatever its description length', () => {
      const boxes = cards().map(rect);
      for (let row = 0; row < boxes.length; row += 3) {
        for (const box of boxes.slice(row, row + 3)) {
          expect(Math.abs(box.height - boxes[row].height)).toBeLessThanOrEqual(1);
        }
      }
    });
  }

  it('shows every title and description in full, never clipped', () => {
    for (const card of cards()) expectNotClipped(card);
  });

  it('shows a square image slot above each title, as wide as the card allows up to 12rem', () => {
    for (const card of cards()) {
      const face = card.querySelector<HTMLElement>('.frog-card-face')!;
      const style = getComputedStyle(face);
      const faceContent = face.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const image = rect(card.querySelector('.frog-card-image')!);
      expect(image.width).toBeCloseTo(Math.min(faceContent, IMAGE_MAX_PX), 0);
      expect(image.height).toBeCloseTo(image.width, 0);
      expect(image.bottom).toBeLessThanOrEqual(rect(card.querySelector('.frog-card-title')!).top + 1);
    }
  });

  it('gives each frog its spinner tone, and the three tones look different', () => {
    const backgrounds = new Map<string, string>();
    cards().forEach((card, i) => {
      expect(card).toHaveClass(`frog-card-tone-${FROG_ENTRIES[i].tone}`);
      backgrounds.set(FROG_ENTRIES[i].tone, getComputedStyle(card).backgroundColor);
    });
    expect(backgrounds.size).toBe(TONES.length);
    expect(new Set(backgrounds.values()).size).toBe(TONES.length);
    for (const colour of backgrounds.values()) expect(colour).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('uses the same panel as the home page’s middle column, centred and width-capped', () => {
    // A throwaway copy of the home middle column, styled by the real ColumnLayout.scss.
    const probe = document.createElement('div');
    probe.className = 'd-column-layout column-layout';
    probe.innerHTML = '<div class="column-layout-column column-layout-middle"></div>';
    document.body.append(probe);
    const homeBackground = getComputedStyle(probe.firstElementChild!).backgroundColor;
    probe.remove();

    const style = getComputedStyle(panel());
    expect(parseFloat(style.borderTopLeftRadius)).toBe(PANEL_RADIUS_PX);
    expect(style.backgroundColor).toBe(homeBackground);
    // The heading is the main green, sage-800, like the home page's middle column.
    expect(getComputedStyle(screen.getByRole('heading', { level: 2, name: 'Frog Library' })).color).toBe(
      'rgb(59, 66, 46)',
    );

    const main = rect(screen.getByRole('main'));
    expect(main.width).toBeLessThanOrEqual((layout === 'rows' ? STACKED_MAX_PX : PAGE_MAX_PX) + 1);
    expect(Math.abs(main.left - (window.innerWidth - main.right))).toBeLessThanOrEqual(1);
  });

  it('keeps every card inside the panel and never scrolls sideways', () => {
    expectInsidePanel();
    expectNoHorizontalScroll();
  });

  it('scrolls downwards, with the nav bar at the top', () => {
    expect(document.documentElement.scrollHeight).toBeGreaterThan(window.innerHeight);
    expect(rect(screen.getByRole('banner')).top).toBe(0);
  });
});

describe.each([
  [320, 568],
  [1025, 768],
])('long unbroken words at %i × %i (the narrowest card in each layout)', (width, height) => {
  const LONG_WORD = 'Frog'.repeat(15); // 60 characters, no spaces
  const LONG_URL = `https://example.com/${'pond/'.repeat(16)}`;

  const entries = en.frogSpinner.entries;
  const dictionary: Dictionary = {
    ...en,
    frogSpinner: {
      ...en.frogSpinner,
      entries: {
        ...entries,
        entry01: { title: LONG_WORD, blurb: `${LONG_WORD} ${LONG_WORD}` },
        entry02: { title: entries.entry02.title, blurb: `See ${LONG_URL} for more.` },
      },
    },
  };

  beforeEach(async () => {
    await page.viewport(width, height);
    renderWithProviders(<FrogLibraryPage entries={FROG_ENTRIES.slice(0, 3)} />, { dictionary });
    await screen.findAllByRole('heading', { level: 3, name: LONG_WORD });
  });

  it('wraps them instead of cutting them off or widening the page', () => {
    for (const card of cards()) expectNotClipped(card);
    expectInsidePanel();
    expectNoHorizontalScroll();
  });

  it('wraps them in a card on its own, outside any panel that would pass its own wrapping down', () => {
    // The panel and the home columns both set overflow-wrap, which the cards inherit. The card
    // must not depend on that, so render one in a bare, narrow box.
    const { container } = renderWithProviders(
      <div style={{ width: '12rem' }}>
        {FROG_ENTRIES.slice(0, 3).map((entry) => (
          <FrogCard key={entry.id} entry={entry} full />
        ))}
      </div>,
      { dictionary },
    );
    const bare = [...container.querySelectorAll<HTMLElement>('article')];
    expect(bare).toHaveLength(3);
    for (const card of bare) expectNotClipped(card);
  });
});

describe.each([
  [375, 667],
  [1280, 800],
])('navigating at %i × %i', (width, height) => {
  beforeEach(async () => {
    await page.viewport(width, height);
  });

  it('home to library: starts at the top, focuses <main> without a ring, hides the library link', async () => {
    await renderApp('/');
    window.scrollTo(0, document.documentElement.scrollHeight);
    if (document.documentElement.scrollHeight > window.innerHeight) expect(window.scrollY).toBeGreaterThan(0);

    // A DOM click, not userEvent: Playwright scrolls the link into view first, which would scroll
    // the page to the top before navigating and hide a missing scrollTo.
    screen.getByRole('link', { name: 'Frog Library' }).click();
    await screen.findByRole('heading', { level: 2, name: 'Frog Library' });
    expect(window.scrollY).toBe(0);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('frog-library-page');
    expect(main).toHaveFocus();
    expect(getComputedStyle(main).outlineStyle).toBe('none');
    expect(navItems()).toEqual(['Home', 'About']);
  });

  it('keyboard: Enter on the link focuses the library; Tab reaches the first heart, Shift+Tab the nav', async () => {
    await renderApp('/');
    screen.getByRole('link', { name: 'Frog Library' }).focus();
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('heading', { level: 2, name: 'Frog Library' });
    const main = screen.getByRole('main');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(main).toHaveFocus();
    expect(window.scrollY).toBe(0);

    // The hearts are the library's only controls: Tab goes forward to the first card's, never back to the nav.
    await userEvent.keyboard('{Tab}');
    expect(nav.contains(document.activeElement)).toBe(false);
    expect(screen.getByRole('button', { name: 'Favorite Eastern Cricket Frog' })).toHaveFocus();

    main.focus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('link', { name: 'About' })).toHaveFocus();
  });

  it('keyboard into the home page: Tab goes on through the About Me links (resume, email, LinkedIn, GitHub) to the spinner, not back to the nav', async () => {
    await renderApp('/frog-library');
    screen.getByRole('link', { name: 'Home' }).focus();
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('heading', { name: 'About Me' });
    expect(screen.getByRole('main')).toHaveFocus();

    const main = within(screen.getByRole('main'));
    // Each name starts with the link's word; the new-tab links add a screen-reader-only warning.
    for (const word of ['my resume', 'email me', 'LinkedIn', 'GitHub']) {
      await userEvent.keyboard('{Tab}');
      expect(main.getByRole('link', { name: new RegExp(`^${word}( ?\\(.*opens in a new tab\\))?$`) })).toHaveFocus();
    }
    await userEvent.keyboard('{Tab}');
    const spinnerColumn = within(screen.getByRole('complementary', { name: 'Frog Spinner' }));
    expect(spinnerColumn.getByRole('button', { name: 'Spin the wheel' })).toHaveFocus();
  });

  it('library to home: shows the home page, focuses its <main>, hides the Home link', async () => {
    await renderApp('/frog-library');
    window.scrollTo(0, document.documentElement.scrollHeight);
    expect(window.scrollY).toBeGreaterThan(0);

    // A DOM click, not userEvent: Playwright would scroll the link (at the top) into view first,
    // reaching scrollY 0 on its own and hiding a missing scrollTo.
    screen.getByRole('link', { name: 'Home' }).click();
    await screen.findByRole('heading', { name: 'About Me' });
    expect(window.scrollY).toBe(0);
    expect(screen.getByRole('main')).toHaveClass('column-layout-middle');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(navItems()).toEqual(['Frog Library', 'About']);
  });

  it('Back and Forward also start the page at the top and focus its <main>', async () => {
    const router = await renderApp('/');
    await userEvent.click(screen.getByRole('link', { name: 'Frog Library' }));
    await screen.findByRole('heading', { level: 2, name: 'Frog Library' });
    window.scrollTo(0, document.documentElement.scrollHeight);
    expect(window.scrollY).toBeGreaterThan(0);

    await router.navigate(-1);
    await screen.findByRole('heading', { name: 'About Me' });
    expect(window.scrollY).toBe(0);
    expect(screen.getByRole('main')).toHaveFocus();
    expect(navItems()).toEqual(['Frog Library', 'About']);

    // Scroll down again, so Forward has to undo it (only possible where the home page scrolls).
    window.scrollTo(0, document.documentElement.scrollHeight);
    if (document.documentElement.scrollHeight > window.innerHeight) expect(window.scrollY).toBeGreaterThan(0);

    await router.navigate(1);
    await screen.findByRole('heading', { level: 2, name: 'Frog Library' });
    expect(window.scrollY).toBe(0);
    expect(screen.getByRole('main')).toHaveClass('frog-library-page');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(navItems()).toEqual(['Home', 'About']);
  });
});

describe.each([375, 1280])('the Frog Library with very large text (root font size doubled) at %i wide', (width) => {
  beforeEach(async () => {
    await page.viewport(width, 800);
    document.documentElement.style.fontSize = '200%';
    await renderApp('/frog-library');
  });

  it('keeps its column count, clips nothing, and never scrolls sideways', () => {
    expect(window.matchMedia('(width > 64rem)').matches).toBe(expectedLayout(width) === 'columns');
    expectGrid(expectedLayout(width));
    for (const card of cards()) expectNotClipped(card);
    expectInsidePanel();
    expectNoHorizontalScroll();
  });
});
