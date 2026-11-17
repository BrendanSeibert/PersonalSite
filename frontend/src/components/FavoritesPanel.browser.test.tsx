import { screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { page, userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../i18n/en.json';
import type { Dictionary } from '../i18n/translate';
import { routes } from '../routes';
import { seedFavorites } from '../test/favoritesFake';
import { applyTextSpacing } from '../test/textSpacing';
import { renderWithProviders } from '../test/renderWithProviders';
import { expectedLayout, TAP_TARGET_PX, VIEWPORTS } from '../test/viewports';
import { FROG_ENTRIES } from './frogEntries';
import { MODE_STORAGE_KEY } from './FavoritesPanel';
import { waitForHomeToSettle } from '../test/settle';

const ALL = FROG_ENTRIES.map((entry) => entry.id);

function seed(many: boolean) {
  if (many) {
    // Every frog is yours; 12 frogs have likes, 1 to 12.
    seedFavorites({ mine: ALL });
    seedFavorites({ counts: Object.fromEntries(ALL.map((id, i) => [id, i < 12 ? i + 1 : 0])) });
  } else {
    seedFavorites({ mine: ['entry03', 'entry09'] });
  }
}

async function renderHome({ allTime = false } = {}) {
  if (allTime) localStorage.setItem(MODE_STORAGE_KEY, 'allTime');
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
  await waitForHomeToSettle();
  await waitFor(() => expect(document.querySelector('.favorites-panel-list li')).not.toBeNull());
}

const rect = (element: Element) => element.getBoundingClientRect();
const column = () => screen.getByRole('complementary', { name: 'Favorites' });
const panel = () => document.querySelector<HTMLElement>('.favorites-panel')!;
const list = () => document.querySelector<HTMLElement>('.favorites-panel-list')!;
const cards = () => [...list().querySelectorAll<HTMLElement>(':scope > li > div > .frog-card')];
const px = (value: string) => parseFloat(value);

const SAGE_800 = 'rgb(59, 66, 46)';
const SKY_700 = 'rgb(62, 80, 86)';
const MINE = 'Your Favorites';
const ALL_TIME = 'All Time Favorites';
const tab = (name: string) => screen.getByRole('tab', { name });
const tabpanel = (name: string) => screen.getByRole('tabpanel', { name });

// A label's lines of text: their count, and the top of the first, wherever the padding puts it.
function textLines(element: Element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const rects = [...range.getClientRects()];
  return { count: new Set(rects.map((r) => Math.round(r.top))).size, top: rects[0].top };
}

// The tabs as the panel's header, at its very top; the selected tab's panel under them. The
// "Favorites" heading is there for screen readers only and is never drawn.
function expectTabsAsHeader() {
  const box = rect(panel());
  const headingEl = within(panel()).getByRole('heading', { level: 2, name: 'Favorites' });
  const heading = rect(headingEl);
  expect(heading.width, 'heading not drawn').toBeLessThanOrEqual(1);
  expect(heading.height, 'heading not drawn').toBeLessThanOrEqual(1);
  expect(getComputedStyle(headingEl).position, 'heading takes no row').toBe('absolute');

  const tablistEl = screen.getByRole('tablist', { name: 'Favorites' });
  const tablist = rect(tablistEl);
  expect(Math.abs(tablist.top - box.top), 'tabs at the top of the panel').toBeLessThanOrEqual(1);
  // The panel is the column's content, so the tabs sit where the other columns' headings start.
  const col = getComputedStyle(column());
  const contentTop = rect(column()).top + px(col.borderTopWidth) + px(col.paddingTop);
  expect(Math.abs(tablist.top - contentTop), 'tabs at the top of the column').toBeLessThanOrEqual(1);
  expect(Math.abs(tablist.left - box.left), 'tablist left edge').toBeLessThanOrEqual(1);
  expect(Math.abs(tablist.right - box.right), 'tablist right edge').toBeLessThanOrEqual(1);

  const [first, second] = within(tablistEl).getAllByRole('tab');
  const [a, b] = [rect(first), rect(second)];
  expect(Math.abs(a.top - b.top), 'tabs level').toBeLessThanOrEqual(1);
  expect(Math.abs(a.height - b.height), 'tabs the same height').toBeLessThanOrEqual(1);
  expect(a.height).toBeGreaterThanOrEqual(TAP_TARGET_PX - 0.5);
  expect(Math.abs(a.width - b.width), 'tabs the same width').toBeLessThanOrEqual(1);
  expect(a.right, 'side by side, no overlap').toBeLessThanOrEqual(b.left + 1);
  for (const el of [first, second]) {
    expect(el.scrollWidth, `${el.textContent} fits across`).toBeLessThanOrEqual(el.clientWidth);
    expect(el.scrollHeight, `${el.textContent} fits down`).toBeLessThanOrEqual(el.clientHeight);
  }

  // The bar: only the selected tab has a bottom border, so forced colours can't paint a second.
  const selected = [first, second].find((el) => el.getAttribute('aria-selected') === 'true')!;
  const other = selected === first ? second : first;
  const style = getComputedStyle(selected);
  const bar = 0.1875 * px(getComputedStyle(document.documentElement).fontSize); // 3px at default text size
  expect(`${style.borderBottomWidth} ${style.borderBottomStyle} ${style.borderBottomColor}`).toBe(
    `${bar}px solid ${SAGE_800}`,
  );
  expect(getComputedStyle(other).borderBottomWidth).toBe('0px');
  // The padding takes the bar's place, so both tabs keep the same space under their labels.
  const underLabel = (el: Element) => {
    const s = getComputedStyle(el);
    return px(s.paddingBottom) + px(s.borderBottomWidth);
  };
  expect(Math.abs(underLabel(first) - underLabel(second)), 'same space under both labels').toBeLessThanOrEqual(0.5);
  // When both labels take the same number of lines, their text is level too.
  const [lines1, lines2] = [textLines(first), textLines(second)];
  if (lines1.count === lines2.count) {
    expect(Math.abs(lines1.top - lines2.top), 'labels level').toBeLessThanOrEqual(1);
  }

  // One panel shown, under the tabs.
  const shown = tabpanel(selected.textContent!);
  expect(shown).toBeVisible();
  expect(rect(shown).top).toBeGreaterThanOrEqual(tablist.bottom - 1);
  const hidden = document.getElementById(other.getAttribute('aria-controls')!)!;
  expect(getComputedStyle(hidden).display).toBe('none');
}

function expectNoHorizontalScroll() {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}

// The stacked cap: the screen less the page gutter (top and bottom) and the column's padding and border.
function stackedCap() {
  const layout = getComputedStyle(document.querySelector('.column-layout')!);
  const col = getComputedStyle(column());
  return (
    window.innerHeight -
    px(layout.paddingTop) -
    px(layout.paddingBottom) -
    px(col.paddingTop) -
    px(col.paddingBottom) -
    px(col.borderTopWidth) -
    px(col.borderBottomWidth)
  );
}

describe.each(VIEWPORTS)('the favorites panel at %i × %i (%s)', (width, height) => {
  const layout = expectedLayout(width);

  beforeEach(async () => {
    await page.viewport(width, height);
  });

  describe('with every frog a favorite', () => {
    beforeEach(async () => {
      seed(true);
      await renderHome();
    });

    it('makes the tabs the header, at the top of the panel, with the heading for screen readers only', () => {
      expectTabsAsHeader();
    });

    it('switches tabs with the arrow keys, and the focused tab shows the focus ring', async () => {
      tab(MINE).focus();
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(within(tabpanel(ALL_TIME)).getAllByRole('listitem')).toHaveLength(10));
      expect(tab(ALL_TIME)).toHaveFocus();
      expect(tab(ALL_TIME)).toHaveAttribute('aria-selected', 'true');
      expect(tab(ALL_TIME).matches(':focus-visible')).toBe(true);
      const ring = getComputedStyle(tab(ALL_TIME));
      expect(`${ring.outlineStyle} ${ring.outlineColor}`).toBe(`solid ${SKY_700}`);
      expectTabsAsHeader();
    });

    it('tabs from the selected tab to the panel, whose ring is drawn inside its edge', async () => {
      tab(MINE).focus();
      await userEvent.tab();
      const panelEl = tabpanel(MINE);
      expect(panelEl).toHaveFocus();
      expect(panelEl.matches(':focus-visible')).toBe(true);
      const ring = getComputedStyle(panelEl);
      expect(`${ring.outlineStyle} ${ring.outlineColor}`).toBe(`solid ${SKY_700}`);
      expect(px(ring.outlineOffset)).toBeCloseTo(-px(ring.outlineWidth), 1);
    });

    it('scrolls the list inside the panel instead of growing', async () => {
      expect(cards()).toHaveLength(ALL.length);
      expect(getComputedStyle(list()).overflowY).toBe('auto');
      expect(getComputedStyle(list()).overscrollBehaviorY).toBe('contain'); // the page doesn't scroll on at the end
      expect(list().scrollHeight).toBeGreaterThan(list().clientHeight);
      list().scrollTop = list().scrollHeight;
      await waitFor(() => {
        const last = rect(cards().at(-1)!);
        expect(last.bottom).toBeLessThanOrEqual(rect(list()).bottom + 1);
        expect(last.top).toBeGreaterThanOrEqual(rect(list()).top - 1);
      });
    });

    if (layout === 'columns') {
      it('never makes the desktop page scroll; the columns still end one gutter above the bottom', () => {
        expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
        const pad = px(getComputedStyle(document.querySelector('.column-layout')!).paddingBottom);
        for (const name of ['Frog Spinner', 'Favorites']) {
          const bottom = rect(screen.getByRole('complementary', { name })).bottom;
          expect(Math.abs(bottom - (window.innerHeight - pad))).toBeLessThanOrEqual(1);
        }
      });
    } else {
      it('caps the stacked panel at the screen height, so it fits on screen when scrolled to', () => {
        expect(rect(panel()).height).toBeLessThanOrEqual(stackedCap() + 1);
        column().scrollIntoView({ block: 'start' });
        const box = rect(panel());
        expect(box.top).toBeGreaterThanOrEqual(-1);
        expect(box.bottom).toBeLessThanOrEqual(window.innerHeight + 1);
      });
    }

    it('grows an opened card in place, pushing the cards below down, and keeps it in view', async () => {
      // The last card whose top is visible in the list.
      const listBox = rect(list());
      const index = cards().findLastIndex((card) => rect(card).top < listBox.bottom - 8);
      const target = cards()[index];
      const next = cards()[index + 1];
      // Positions within the list: opening scrolls the list, which moves everything on screen.
      const nextTop = next && next.closest('li')!.offsetTop;
      const heightBefore = rect(target).height;

      await userEvent.click(target.querySelector('.frog-card-face')!);
      expect(target.querySelector('.frog-card-face')).toHaveAttribute('aria-expanded', 'true');
      await waitFor(() => {
        const grown = rect(target).height - heightBefore;
        expect(grown).toBeGreaterThan(10);
        if (next) expect(Math.abs(next.closest('li')!.offsetTop - nextTop - grown)).toBeLessThanOrEqual(1);
        // In view within the list: wholly, or, when it is taller than the list (a phone held
        // sideways), from its top.
        const box = rect(target);
        const visible = rect(list());
        expect(box.top).toBeGreaterThanOrEqual(visible.top - 1);
        if (box.height <= list().clientHeight) expect(box.bottom).toBeLessThanOrEqual(visible.bottom + 1);
        else expect(box.top).toBeLessThan(visible.top + 8);
      });
      expect(getComputedStyle(target).position).not.toBe('absolute');
    });

    it('never scrolls sideways', () => {
      expectNoHorizontalScroll();
      for (const card of cards()) {
        expect(rect(card).right).toBeLessThanOrEqual(rect(list()).right + 1);
      }
    });
  });

  describe('in All Time Favorites', () => {
    beforeEach(async () => {
      seed(true);
      await renderHome({ allTime: true });
    });

    it('shows the top ten in count order, each count between its title and its heart', () => {
      expect(cards().map((card) => card.dataset.entryId)).toEqual(ALL.slice(0, 12).reverse().slice(0, 10));
      for (const card of cards()) {
        const title = rect(card.querySelector('.frog-card-title')!);
        const count = rect(card.querySelector('.frog-card-likes')!);
        const heart = rect(card.querySelector('.favorite-button')!);
        expect(count.left).toBeGreaterThanOrEqual(title.right - 1);
        expect(count.right).toBeLessThanOrEqual(heart.left + 1);
        expect(count.top).toBeLessThan(heart.bottom);
        expect(count.bottom).toBeGreaterThan(heart.top);
      }
      expectTabsAsHeader();
    });

    it('gives each title room to keep a whole word on a line, never breaking "Northern" mid-word', () => {
      const remPx = px(getComputedStyle(document.documentElement).fontSize);
      for (const card of cards()) {
        const titleEl = card.querySelector('.frog-card-title')!;
        const corner = rect(card.querySelector('.frog-card-corner')!);
        expect(corner.left - rect(titleEl).left, `room for ${titleEl.textContent}`).toBeGreaterThanOrEqual(5.5 * remPx);
        expect(getComputedStyle(titleEl).hyphens).toBe('auto'); // a word that must break gets a hyphen
      }
      // entry10, Northern Leopard Frog, is in the top ten: its first word sits on one line.
      const northern = cards()
        .find((card) => card.dataset.entryId === 'entry10')!
        .querySelector('.frog-card-title')!;
      const text = northern.firstChild!;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 'Northern'.length);
      const lineTops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      expect(lineTops.size, '"Northern" on one line').toBe(1);
    });
  });

  describe('with two favorites', () => {
    beforeEach(async () => {
      seed(false);
      await renderHome();
    });

    it('does not scroll, and when stacked is only as tall as its content', () => {
      expect(cards()).toHaveLength(2);
      expect(list().scrollHeight).toBeLessThanOrEqual(list().clientHeight + 1);
      if (layout === 'rows') {
        const style = getComputedStyle(list());
        const contentBottom = rect(cards().at(-1)!).bottom + px(style.paddingBottom);
        expect(Math.abs(rect(list()).bottom - contentBottom)).toBeLessThanOrEqual(1);
        expect(rect(panel()).height).toBeLessThan(stackedCap());
      }
      expectTabsAsHeader();
    });
  });
});

describe.each([375, 1280])('the favorites panel with very large text (root font size doubled) at %i wide', (width) => {
  beforeEach(async () => {
    await page.viewport(width, 800);
    document.documentElement.style.fontSize = '200%';
    seed(true);
    await renderHome();
  });

  it('keeps the tabs on top as the header, scrolls the list inside its column, and never scrolls sideways', () => {
    expectTabsAsHeader();
    expect(list().scrollHeight).toBeGreaterThan(list().clientHeight);
    expectNoHorizontalScroll();
    // (The desktop page itself may scroll at this text size: the spinner column grows too.)
    const col = column();
    const colStyle = getComputedStyle(col);
    const contentBottom = rect(col).bottom - px(colStyle.paddingBottom) - px(colStyle.borderBottomWidth);
    expect(rect(panel()).bottom).toBeLessThanOrEqual(contentBottom + 1);
  });

  it('keeps the tabs on top as the header in All Time Favorites too', async () => {
    await userEvent.click(tab(ALL_TIME));
    await waitFor(() => expect(within(tabpanel(ALL_TIME)).getAllByRole('listitem')).toHaveLength(10));
    expectTabsAsHeader();
    expectNoHorizontalScroll();
  });
});

describe('the favorites panel while its list loads', () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it('keeps focus on the panel when the list arrives while the panel has focus', async () => {
    seedFavorites({ mine: ['entry01'] });
    // Hold the Your Favorites request until the panel has focus.
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    const answer = vi.mocked(window.fetch).getMockImplementation()!;
    vi.mocked(window.fetch).mockImplementation(async (input, init) => {
      if (String(input instanceof Request ? input.url : input).includes('/api/favorites/mine')) await held;
      return answer(input, init);
    });
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
    await screen.findByText('Loading favorites...');

    tab(MINE).focus();
    await userEvent.tab();
    const panelEl = tabpanel(MINE);
    expect(panelEl).toHaveFocus();
    release();
    await waitFor(() => expect(within(panelEl).getAllByRole('listitem')).toHaveLength(1));
    expect(panelEl, 'focus is not dropped to <body>').toHaveFocus();
  });
});

// WCAG 1.4.12: a favorites card has no reel row to match, so it grows to show its whole title,
// with or without the text-spacing overrides. Atlantic Coast Leopard Frog already needs three lines
// in the desktop column; entry01 is renamed to a made-up 60-character title for this test.
describe.each([
  [1280, 800],
  [375, 667],
])('favorites titles in full at %i × %i', (width, height) => {
  const LONG_TITLE = 'Extraordinarily Long Speckled Northern Mountain Chorus Frogs';
  const dictionary: Dictionary = {
    ...en,
    frogSpinner: {
      ...en.frogSpinner,
      entries: { ...en.frogSpinner.entries, entry01: { ...en.frogSpinner.entries.entry01, title: LONG_TITLE } },
    },
  };

  beforeEach(async () => {
    await page.viewport(width, height);
    seedFavorites({ mine: ['entry01', 'entry08'] });
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    renderWithProviders(<RouterProvider router={router} />, { withRouter: false, dictionary });
    await waitForHomeToSettle();
    await waitFor(() => expect(cards()).toHaveLength(2));
  });

  function expectWholeTitles() {
    expect(LONG_TITLE).toHaveLength(60);
    expect(cards().map((card) => card.querySelector('.frog-card-title')!.textContent)).toEqual([
      LONG_TITLE,
      'Atlantic Coast Leopard Frog',
    ]);
    for (const card of cards()) {
      const title = card.querySelector<HTMLElement>('.frog-card-title')!;
      expect(card).toHaveAttribute('data-fits-row', 'false');
      expect(getComputedStyle(title).getPropertyValue('-webkit-line-clamp'), 'not clamped').toBe('none');
      expect(title.scrollHeight, 'title not cut off').toBeLessThanOrEqual(title.clientHeight + 1);
      expect(rect(title).bottom, 'title inside its card').toBeLessThanOrEqual(rect(card).bottom);
      expect(card.scrollWidth, 'card not clipped sideways').toBeLessThanOrEqual(card.clientWidth + 1);
    }
    expect(getComputedStyle(list()).overflowY, 'the list still scrolls').toBe('auto');
    expectNoHorizontalScroll();
  }

  it('without the text-spacing overrides', () => {
    expectWholeTitles();
  });

  it('with the text-spacing overrides', () => {
    const undo = applyTextSpacing();
    try {
      expectWholeTitles();
    } finally {
      undo();
    }
  });
});
