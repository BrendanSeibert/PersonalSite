import { screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { page, userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../routes';
import { seedFavorites } from '../test/favoritesFake';
import { renderWithProviders } from '../test/renderWithProviders';
import { VIEWPORTS } from '../test/viewports';
import { FROG_ENTRIES } from './frogEntries';

const INSET_PX = 4; // $space-1: the heart's distance from the card's top and right edges
const HEART_PX = 32; // $favorite-size (2rem); Playwright's Chromium reports a fine pointer
const MIN_TITLE_PX = 48; // 3rem: a title always keeps at least this much room beside the heart
const SAGE_800 = 'rgb(59, 66, 46)';

async function renderApp(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
  // Hearts are aria-disabled until your favorites are known.
  await waitFor(() => expect(document.querySelector('.favorite-button[aria-disabled="false"]')).not.toBeNull());
}

// The card's padding box: where its absolutely placed corner is measured from, and where its
// overflow is clipped.
function inner(card: HTMLElement) {
  const box = card.getBoundingClientRect();
  const style = getComputedStyle(card);
  return {
    top: box.top + parseFloat(style.borderTopWidth),
    right: box.right - parseFloat(style.borderRightWidth),
    bottom: box.bottom - parseFloat(style.borderBottomWidth),
    left: box.left + parseFloat(style.borderLeftWidth),
  };
}

const overlaps = (a: DOMRect, b: DOMRect) =>
  a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

function expectHeartInCorner(card: HTMLElement) {
  const heart = card.querySelector<HTMLElement>('.favorite-button')!;
  const h = heart.getBoundingClientRect();
  const box = inner(card);
  expect(Math.abs(box.right - h.right - INSET_PX), 'right inset').toBeLessThanOrEqual(1);
  expect(Math.abs(h.top - box.top - INSET_PX), 'top inset').toBeLessThanOrEqual(1);
  expect(h.width).toBeCloseTo(HEART_PX, 0);
  expect(h.height).toBeCloseTo(HEART_PX, 0);

  const corner = card.querySelector('.frog-card-corner')!.getBoundingClientRect();
  const title = card.querySelector('.frog-card-title')!.getBoundingClientRect();
  expect(overlaps(corner, title), 'corner over the title').toBe(false);
  // The room the title gets, not its own width: a short title ("Greg") is narrow however much room
  // it has. On the corner's row the room ends at the corner; below it, at the card's inner edge.
  const besideCorner = corner.bottom > title.top && corner.top < title.bottom;
  const room = (besideCorner ? corner.left : box.right) - title.left;
  expect(room, 'room for the title').toBeGreaterThanOrEqual(MIN_TITLE_PX);
  const image = card.querySelector('.frog-card-image')!;
  if (getComputedStyle(image).display !== 'none') {
    expect(overlaps(corner, image.getBoundingClientRect()), 'corner over the image').toBe(false);
  }
}

// The keyboard ring (outline + offset) must fit inside the card, which clips its overflow.
function expectRingInside(heart: HTMLElement) {
  const style = getComputedStyle(heart);
  expect(style.outlineStyle).toBe('solid');
  const grow = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
  const h = heart.getBoundingClientRect();
  const box = inner(heart.closest<HTMLElement>('.frog-card')!);
  expect(h.top - grow).toBeGreaterThanOrEqual(box.top - 0.5);
  expect(h.right + grow).toBeLessThanOrEqual(box.right + 0.5);
}

const pathOf = (heart: Element) => getComputedStyle(heart.querySelector('path')!);

describe.each(VIEWPORTS)('hearts at %i × %i (%s)', (width, height) => {
  beforeEach(async () => {
    await page.viewport(width, height);
  });

  it('sit in the top-right corner of every Frog Library card, clear of the title and image', async () => {
    await renderApp('/frog-library');
    const cards = [...document.querySelectorAll<HTMLElement>('.frog-library-page-grid .frog-card')];
    expect(cards).toHaveLength(FROG_ENTRIES.length);
    for (const card of cards) expectHeartInCorner(card);
  });

  it('sit in the corner of the favorites panel’s cards, with the count beside them in All Time', async () => {
    seedFavorites({ mine: ['entry01', 'entry12'], counts: { entry01: 3, entry12: 120 } });
    await renderApp('/');
    const panelCards = () => [...document.querySelectorAll<HTMLElement>('.favorites-panel-list .frog-card')];
    await waitFor(() => expect(panelCards()).toHaveLength(2));
    for (const card of panelCards()) expectHeartInCorner(card);

    await userEvent.click(screen.getByRole('tab', { name: 'All Time Favorites' }));
    await waitFor(() => expect(document.querySelector('.favorites-panel-list .frog-card-likes')).not.toBeNull());
    for (const card of panelCards()) {
      expectHeartInCorner(card);
      // Count, then heart, on one line; three digits still fit.
      const count = card.querySelector('.frog-card-likes')!.getBoundingClientRect();
      const heart = card.querySelector('.favorite-button')!.getBoundingClientRect();
      expect(count.right).toBeLessThanOrEqual(heart.left + 1);
      expect(count.top).toBeLessThan(heart.bottom);
      expect(count.bottom).toBeGreaterThan(heart.top);
    }
  });
});

describe.each([
  [375, 667],
  [1280, 800],
])('a heart at %i × %i', (width, height) => {
  beforeEach(async () => {
    await page.viewport(width, height);
    await renderApp('/frog-library');
  });

  it('shows its keyboard ring inside the card', async () => {
    screen.getByRole('main').focus();
    await userEvent.keyboard('{Tab}');
    const heart = screen.getByRole('button', { name: 'Favorite Eastern Cricket Frog' });
    expect(heart).toHaveFocus();
    expectRingInside(heart);
  });

  it('fills in green when pressed, and keeps the same outline colour', async () => {
    const heart = screen.getByRole('button', { name: 'Favorite Eastern Cricket Frog' });
    const strokeBefore = pathOf(heart).stroke;
    expect(pathOf(heart).fill).toBe('none');
    await userEvent.click(heart);
    await waitFor(() => expect(pathOf(heart).fill).toBe(SAGE_800));
    expect(pathOf(heart).stroke).toBe(strokeBefore);
    expect(strokeBefore).toBe(SAGE_800);
    await userEvent.click(heart);
    await waitFor(() => expect(pathOf(heart).fill).toBe('none'));
  });

  it('is a plain heart: symmetric, with a rounded tip and no "foot" below the point', () => {
    const heart = screen.getByRole('button', { name: 'Favorite Eastern Cricket Frog' });
    const path = heart.querySelector('path')!;
    // Round joins never reach past the outline's corners, the way a miter join can at the tip.
    expect(pathOf(heart).strokeLinejoin).toBe('round');
    // The shape itself, in the 24 × 24 viewBox: centred on x = 12, its point at the bottom.
    const box = path.getBBox();
    expect(box.x + box.width / 2).toBeCloseTo(12, 1);
    expect(box.x).toBeCloseTo(3, 1);
    expect(box.y + box.height).toBeCloseTo(20.5, 1);
    expect(path.isPointInFill(new DOMPoint(12, 20))).toBe(true); // just above the point: inside
    expect(path.isPointInFill(new DOMPoint(12, 21.5))).toBe(false); // below it: nothing
    // With its stroke (half the width outside the outline), it still fits the viewBox.
    const half = parseFloat(pathOf(heart).strokeWidth) / 2;
    expect(box.y + box.height + half).toBeLessThanOrEqual(24);
    expect(box.x - half).toBeGreaterThanOrEqual(0);
  });
});
