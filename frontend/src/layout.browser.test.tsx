import { screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from './routes';
import { renderWithProviders } from './test/renderWithProviders';
import { expectedLayout, TAP_TARGET_PX, VIEWPORTS, type Layout } from './test/viewports';
import { waitForHomeToSettle } from './test/settle';

async function renderApp(url = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
  // Let the layout settle into its final content.
  if (url === '/') await waitForHomeToSettle();
  else await screen.findByRole('heading', { level: 2 });
}

// The nav's links.
const navItems = () => [...screen.getByRole('banner').querySelectorAll<HTMLElement>('.navbar-link')];

function columns() {
  const middle = screen.getByRole('main');
  const left = screen.getByRole('complementary', { name: 'Frog Spinner' });
  const right = screen.getByRole('complementary', { name: 'Favorites' });
  return { middle, left, right };
}

const rect = (element: Element) => element.getBoundingClientRect();

const overlaps = (a: DOMRect, b: DOMRect) =>
  a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

function expectNoHorizontalScroll() {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}

function expectColumnOrder(layout: Layout) {
  const { middle, left, right } = columns();
  const [m, l, r] = [rect(middle), rect(left), rect(right)];

  if (layout === 'columns') {
    // Drawn left to right, no overlap.
    expect(l.right).toBeLessThanOrEqual(m.left + 1);
    expect(m.right).toBeLessThanOrEqual(r.left + 1);
    // Equal-height columns on one row.
    expect(m.top).toBeCloseTo(l.top, 0);
    expect(r.top).toBeCloseTo(l.top, 0);
    expect(m.height).toBeCloseTo(l.height, 0);
    expect(r.height).toBeCloseTo(l.height, 0);
  } else {
    // Stacked in DOM order: middle, left, right.
    expect(m.bottom).toBeLessThanOrEqual(l.top + 1);
    expect(l.bottom).toBeLessThanOrEqual(r.top + 1);
    expect(l.left).toBeCloseTo(m.left, 0);
    expect(r.left).toBeCloseTo(m.left, 0);
    expect(l.width).toBeCloseTo(m.width, 0);
    expect(r.width).toBeCloseTo(m.width, 0);
  }
}

function expectNavbarTitleAndButtonsApart() {
  const title = rect(screen.getByRole('heading', { level: 1 }));
  for (const item of navItems()) {
    expect(overlaps(title, rect(item)), `title overlaps "${item.textContent}"`).toBe(false);
  }
}

function expectNavbarPinnedOnOneRow() {
  const header = screen.getByRole('banner');
  const style = getComputedStyle(header);
  const box = rect(header);
  const contentLeft = box.left + parseFloat(style.paddingLeft);
  const contentRight = box.right - parseFloat(style.paddingRight);

  const title = rect(screen.getByRole('heading', { level: 1 }));
  const items = navItems().map(rect);

  expect(items).toHaveLength(2); // the current page's link is hidden
  expect(title.left).toBeCloseTo(contentLeft, 0);
  expect(items.at(-1)!.right).toBeCloseTo(contentRight, 0);
  expectNavbarTitleAndButtonsApart();
  for (const item of items) {
    expect(item.top).toBeCloseTo(items[0].top, 0);
    expect(item.height).toBeGreaterThanOrEqual(TAP_TARGET_PX - 0.5);
  }
}

describe.each(VIEWPORTS)('at %i × %i (%s)', (width, height) => {
  const layout = expectedLayout(width);

  beforeEach(async () => {
    await page.viewport(width, height);
    await renderApp();
  });

  it('really is at that viewport size', () => {
    expect(window.innerWidth).toBe(width);
    expect(window.matchMedia('(width > 64rem)').matches).toBe(layout === 'columns');
  });

  it(`shows the content as ${layout}`, () => {
    expectColumnOrder(layout);

    if (layout === 'columns') {
      const { middle, left, right } = columns();
      const [m, l, r] = [rect(middle), rect(left), rect(right)];
      expect(m.width).toBeCloseTo(2 * l.width, 0);
      expect(r.width).toBeCloseTo(l.width, 0);
    }
  });

  it('keeps every piece of content inside its own column', () => {
    const { middle, left, right } = columns();
    for (const column of [middle, left, right]) {
      const box = rect(column);
      // The reel strip is meant to run past its clipping window, and the favorites list scrolls;
      // the window and the list themselves are still checked. The hidden tabpanel has no box to check.
      for (const child of column.querySelectorAll('*:not(.frog-spinner-window *):not(.favorites-panel-list *):not([hidden]):not([hidden] *)')) {
        const inner = rect(child);
        expect(inner.left).toBeGreaterThanOrEqual(box.left - 1);
        expect(inner.right).toBeLessThanOrEqual(box.right + 1);
        expect(inner.top).toBeGreaterThanOrEqual(box.top - 1);
        expect(inner.bottom).toBeLessThanOrEqual(box.bottom + 1);
      }
    }
    expect(within(middle).getByRole('heading', { name: 'About Me' })).toBeVisible();
    expect(within(middle).getByText(/amateur frog enthusiast/)).toBeVisible();
    expect(within(middle).getByRole('link', { name: 'GitHub' })).toBeVisible();
    expect(within(left).getByRole('heading', { name: 'Frog Spinner' })).toBeVisible();
    expect(within(left).getByRole('button', { name: 'Spin the wheel' })).toBeVisible();
    expect(within(left).getByRole('status')).toHaveTextContent('Press the button to get a random frog.');
    expect(getComputedStyle(within(left).getByRole('status')).whiteSpace).toBe('pre-line'); // the prompt's line break shows
    // The tabs are the right column's visible header; its heading is for screen readers only.
    expect(within(right).getByRole('heading', { name: 'Favorites' })).toHaveClass('visually-hidden');
    expect(within(right).getByRole('tab', { name: 'All Time Favorites' })).toBeVisible();
    expect(within(right).getByRole('tab', { name: 'Your Favorites' })).toBeVisible();
  });

  it('never scrolls horizontally', () => {
    expectNoHorizontalScroll();
  });

  if (width === 375 || width === 1280) {
    it('draws the nav bar, the "Spin the wheel" button and the middle heading in the main green (sage-800)', () => {
      const SAGE_800 = 'rgb(59, 66, 46)';
      expect(getComputedStyle(document.querySelector('.navbar')!).backgroundColor).toBe(SAGE_800);
      expect(getComputedStyle(screen.getByRole('button', { name: 'Spin the wheel' })).backgroundColor).toBe(SAGE_800);
      const heading = within(columns().middle).getByRole('heading', { level: 2 });
      expect(getComputedStyle(heading).color).toBe(SAGE_800);
    });
  }

  if (layout === 'columns') {
    it('fills the viewport height with the columns, and the page does not scroll', () => {
      const pad = parseFloat(getComputedStyle(document.querySelector('.column-layout')!).paddingBottom);
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
      for (const column of Object.values(columns())) {
        expect(Math.abs(rect(column).bottom - (window.innerHeight - pad))).toBeLessThanOrEqual(1);
      }
    });
  } else {
    it('sizes each row to its content', () => {
      for (const column of Object.values(columns())) {
        const style = getComputedStyle(column);
        const contentBottom =
          rect(column.lastElementChild!).bottom + parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth);
        expect(Math.abs(rect(column).bottom - contentBottom)).toBeLessThanOrEqual(1);
      }
    });
  }

  it('pins the title to the left and the nav items to the right, on one row', () => {
    expectNavbarPinnedOnOneRow();
  });
});

// The nav has different items on each page, so its layout is checked on both.
// The nav has different links on each page, so its layout is checked on the other pages too.
describe.each(['/frog-library', '/about'])('the nav bar on %s', (url) => {
  describe.each(VIEWPORTS)('at %i × %i (%s)', (width, height) => {
    beforeEach(async () => {
      await page.viewport(width, height);
      await renderApp(url);
    });

    it('pins the title to the left and the nav items to the right, on one row', () => {
      expectNavbarPinnedOnOneRow();
    });

    it('draws every nav item the same way, as an outlined 44px box without an underline', () => {
      const items = navItems();
      const styles = items.map((item) => getComputedStyle(item));
      for (const [i, item] of items.entries()) {
        expect(item.tagName).toBe('A');
        expect(styles[i].textDecorationLine).toBe('none');
        // Fixed values, so "the same as each other" can't pass with every item equally wrong.
        expect(parseFloat(styles[i].minHeight)).toBeCloseTo(TAP_TARGET_PX, 0);
        expect(styles[i].borderTopWidth).toBe('1px');
        expect(styles[i].borderTopStyle).toBe('solid');
      }
      for (const property of ['color', 'backgroundColor', 'borderTopColor', 'fontSize', 'fontWeight', 'paddingLeft'] as const) {
        expect(styles[1][property], property).toBe(styles[0][property]);
      }
      expect(rect(items[1]).height).toBeCloseTo(rect(items[0]).height, 0);
    });
  });
});

describe.each([375, 1280])('with very large text (root font size doubled) at %i wide', (width) => {
  beforeEach(async () => {
    await page.viewport(width, 800);
    document.documentElement.style.fontSize = '200%';
    await renderApp();
  });

  it('still fits, without overlaps, and keeps the same layout', () => {
    // The breakpoint is in rem of the browser default, so the root font size does not move it.
    expect(window.matchMedia('(width > 64rem)').matches).toBe(expectedLayout(width) === 'columns');
    expectNoHorizontalScroll();
    expectNavbarTitleAndButtonsApart();
    expectColumnOrder(expectedLayout(width));
  });

  it('keeps the frog spinner inside the left column, in order', () => {
    const left = within(screen.getByRole('complementary', { name: 'Frog Spinner' }));
    const column = rect(screen.getByRole('complementary', { name: 'Frog Spinner' }));
    const reel = rect(document.querySelector('.frog-spinner-reel')!);
    const button = rect(left.getByRole('button', { name: 'Spin the wheel' }));
    const status = rect(left.getByRole('status'));
    for (const box of [reel, button, status]) {
      expect(box.left).toBeGreaterThanOrEqual(column.left - 1);
      expect(box.right).toBeLessThanOrEqual(column.right + 1);
    }
    expect(reel.bottom).toBeLessThanOrEqual(button.top + 1);
    expect(button.bottom).toBeLessThanOrEqual(status.top + 1);
    expectNoHorizontalScroll();

    if (width === 1280) {
      // Cards are now narrower than 9.5rem (in the doubled rem), so the image slot gives way.
      const card = document.querySelector('.frog-spinner-row .frog-card')!;
      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
      expect(card.clientWidth).toBeLessThan(9.5 * remPx);
      expect(getComputedStyle(card.querySelector('.frog-card-image')!).display).toBe('none');
    }
  });
});
