import { screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { page, userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../routes';
import { seedFavorites } from '../test/favoritesFake';
import { renderWithProviders } from '../test/renderWithProviders';
import { expectedLayout, TAP_TARGET_PX, VIEWPORTS } from '../test/viewports';
import { FROG_ENTRIES } from './frogEntries';
import { MODE_STORAGE_KEY } from './FavoritesPanel';

const ALL = FROG_ENTRIES.map((entry) => entry.id);

function seed(many: boolean) {
  if (many) {
    // All 20 are yours; 12 frogs have likes, 1 to 12.
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
  await screen.findByText('API ok, database up');
  await waitFor(() => expect(document.querySelector('.favorites-panel-list li')).not.toBeNull());
}

const rect = (element: Element) => element.getBoundingClientRect();
const column = () => screen.getByRole('complementary', { name: 'Favorites' });
const panel = () => document.querySelector<HTMLElement>('.favorites-panel')!;
const list = () => document.querySelector<HTMLElement>('.favorites-panel-list')!;
const cards = () => [...list().querySelectorAll<HTMLElement>(':scope > li > div > .frog-card')];
const px = (value: string) => parseFloat(value);

function expectSwitchInCorner() {
  const toggle = rect(screen.getByRole('switch', { name: 'All time' }));
  const heading = rect(within(panel()).getByRole('heading', { level: 2 }));
  const box = rect(panel());
  expect(Math.abs(toggle.right - box.right), 'right edge').toBeLessThanOrEqual(1);
  expect(toggle.height).toBeGreaterThanOrEqual(TAP_TARGET_PX - 0.5);
  // Either beside the heading, on the same row and to its right, or on a row of its own above it.
  const beside = toggle.top < heading.bottom && heading.top < toggle.bottom && toggle.left >= heading.right - 1;
  const above = toggle.bottom <= heading.top + 1;
  expect(beside || above, 'switch beside or above the heading, never over it').toBe(true);
  expect(Math.abs(toggle.top - box.top) <= 1 || beside, 'switch at the top of the panel').toBe(true);
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

  describe('with twenty favorites', () => {
    beforeEach(async () => {
      seed(true);
      await renderHome();
    });

    it('keeps the switch in the top-right corner', () => {
      expectSwitchInCorner();
    });

    it('scrolls the list inside the panel instead of growing', async () => {
      expect(cards()).toHaveLength(20);
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
        for (const name of ['Highlights', 'Favorites']) {
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
      expectSwitchInCorner();
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
      expectSwitchInCorner();
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

  it('keeps the switch in the corner, scrolls the list inside its column, and never scrolls sideways', () => {
    expectSwitchInCorner();
    expect(list().scrollHeight).toBeGreaterThan(list().clientHeight);
    expectNoHorizontalScroll();
    // (The desktop page itself may scroll at this text size: the spinner column grows too.)
    const col = column();
    const colStyle = getComputedStyle(col);
    const contentBottom = rect(col).bottom - px(colStyle.paddingBottom) - px(colStyle.borderBottomWidth);
    expect(rect(panel()).bottom).toBeLessThanOrEqual(contentBottom + 1);
  });
});
