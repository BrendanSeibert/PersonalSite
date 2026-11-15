import { screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from './routes';
import { renderWithProviders } from './test/renderWithProviders';
import { expectedLayout, TAP_TARGET_PX, VIEWPORTS, type Layout } from './test/viewports';

async function renderApp() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
  await screen.findByText('API ok, database up'); // let the layout settle into its final content
}

function columns() {
  const middle = screen.getByRole('main');
  const left = screen.getByRole('complementary', { name: 'Highlights' });
  const right = screen.getByRole('complementary', { name: 'Get in touch' });
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
  for (const button of within(screen.getByRole('banner')).getAllByRole('button')) {
    expect(overlaps(title, rect(button)), `title overlaps "${button.textContent}"`).toBe(false);
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
      // The reel strip is meant to run past its clipping window; the window itself is still checked.
      for (const child of column.querySelectorAll('*:not(.frog-spinner-window *)')) {
        const inner = rect(child);
        expect(inner.left).toBeGreaterThanOrEqual(box.left - 1);
        expect(inner.right).toBeLessThanOrEqual(box.right + 1);
        expect(inner.top).toBeGreaterThanOrEqual(box.top - 1);
        expect(inner.bottom).toBeLessThanOrEqual(box.bottom + 1);
      }
    }
    expect(within(middle).getByRole('heading', { name: 'Hello, world' })).toBeVisible();
    expect(within(middle).getByText(/this is my corner of the web/)).toBeVisible();
    expect(within(middle).getByRole('status')).toHaveTextContent('API ok, database up');
    expect(within(left).getByRole('heading', { name: 'Highlights' })).toBeVisible();
    expect(within(left).getByRole('button', { name: 'Get a frog' })).toBeVisible();
    expect(within(left).getByRole('status')).toHaveTextContent('Press the button to get a frog.');
    expect(within(right).getByRole('heading', { name: 'Get in touch' })).toBeVisible();
    expect(within(right).getByText('Coming soon.')).toBeVisible();
  });

  it('never scrolls horizontally', () => {
    expectNoHorizontalScroll();
  });

  it('pins the title to the left and the buttons to the right, on one row', () => {
    const header = screen.getByRole('banner');
    const style = getComputedStyle(header);
    const box = rect(header);
    const contentLeft = box.left + parseFloat(style.paddingLeft);
    const contentRight = box.right - parseFloat(style.paddingRight);

    const title = rect(screen.getByRole('heading', { level: 1 }));
    const buttons = within(header).getAllByRole('button').map(rect);

    expect(title.left).toBeCloseTo(contentLeft, 0);
    expect(buttons.at(-1)!.right).toBeCloseTo(contentRight, 0);
    expectNavbarTitleAndButtonsApart();
    for (const button of buttons) {
      expect(button.top).toBeCloseTo(buttons[0].top, 0);
      expect(button.height).toBeGreaterThanOrEqual(TAP_TARGET_PX - 0.5);
    }
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
    const left = within(screen.getByRole('complementary', { name: 'Highlights' }));
    const column = rect(screen.getByRole('complementary', { name: 'Highlights' }));
    const reel = rect(document.querySelector('.frog-spinner-reel')!);
    const button = rect(left.getByRole('button', { name: 'Get a frog' }));
    const status = rect(left.getByRole('status'));
    for (const box of [reel, button, status]) {
      expect(box.left).toBeGreaterThanOrEqual(column.left - 1);
      expect(box.right).toBeLessThanOrEqual(column.right + 1);
    }
    expect(reel.bottom).toBeLessThanOrEqual(button.top + 1);
    expect(button.bottom).toBeLessThanOrEqual(status.top + 1);
    expectNoHorizontalScroll();

    if (width === 1280) {
      // Cards are now narrower than 14rem (in the doubled rem), so the image slot gives way.
      const card = document.querySelector('.frog-spinner-row .frog-card')!;
      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
      expect(rect(card).width).toBeLessThan(14 * remPx);
      expect(getComputedStyle(card.querySelector('.frog-card-image')!).display).toBe('none');
    }
  });
});
