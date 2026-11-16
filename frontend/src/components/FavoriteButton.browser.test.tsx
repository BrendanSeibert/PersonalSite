import { screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { page, userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../routes';
import { seedFavorites } from '../test/favoritesFake';
import { renderWithProviders } from '../test/renderWithProviders';
import { VIEWPORTS } from '../test/viewports';

const INSET_PX = 4; // $space-1: the heart's distance from the card's top and right edges
const HEART_PX = 32; // $favorite-size (2rem); Playwright's Chromium reports a fine pointer
const MIN_TITLE_PX = 48; // 3rem: a title always keeps at least this much width
const SIENNA_750 = 'rgb(116, 50, 17)';

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
  expect(title.width).toBeGreaterThanOrEqual(MIN_TITLE_PX);
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
    expect(cards).toHaveLength(20);
    for (const card of cards) expectHeartInCorner(card);
  });

  it('sit in the corner of the favorites panel’s cards, with the count beside them in All Time', async () => {
    seedFavorites({ mine: ['entry01', 'entry12'], counts: { entry01: 3, entry12: 120 } });
    await renderApp('/');
    const panelCards = () => [...document.querySelectorAll<HTMLElement>('.favorites-panel-list .frog-card')];
    await waitFor(() => expect(panelCards()).toHaveLength(2));
    for (const card of panelCards()) expectHeartInCorner(card);

    await userEvent.click(screen.getByRole('switch', { name: 'All time' }));
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
    const heart = screen.getByRole('button', { name: 'Favorite Lorem ipsum' });
    expect(heart).toHaveFocus();
    expectRingInside(heart);
  });

  it('fills in sienna when pressed, and keeps the same outline colour', async () => {
    const heart = screen.getByRole('button', { name: 'Favorite Lorem ipsum' });
    const strokeBefore = pathOf(heart).stroke;
    expect(pathOf(heart).fill).toBe('none');
    await userEvent.click(heart);
    await waitFor(() => expect(pathOf(heart).fill).toBe(SIENNA_750));
    expect(pathOf(heart).stroke).toBe(strokeBefore);
    expect(strokeBefore).toBe(SIENNA_750);
    await userEvent.click(heart);
    await waitFor(() => expect(pathOf(heart).fill).toBe('none'));
  });
});
