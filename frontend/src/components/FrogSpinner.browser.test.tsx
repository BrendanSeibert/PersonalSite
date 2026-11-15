import { screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../i18n/en.json';
import { translate } from '../i18n/translate';
import { routes } from '../routes';
import { renderWithProviders } from '../test/renderWithProviders';
import { expectedPeek, TAP_TARGET_PX, VIEWPORTS } from '../test/viewports';
import { FROG_ENTRIES } from './frogEntries';
import { pickNextIndex } from './frogReel';

const ROW_PX = 88; // one reel row: $frog-card-height (5rem) + 2 × 0.25rem, at 16px text
const GAP_PX = 12; // the spinner's flex gap, $space-3
const CARD_RADIUS_PX = 12; // $radius-lg
// Card widths are measured inside the border, as the stylesheet's container queries measure them.
const IMAGE_MIN_CARD_PX = 152; // 9.5rem: below this the image slot is hidden
const IMAGE_FULL_CARD_PX = 192; // 12rem: from here the image slot is full size
const IMAGE_COLLAPSED_PX = 56; // 3.5rem: the image slot on a collapsed card
const IMAGE_SMALL_PX = 40; // 2.5rem: the image slot on a card narrower than 12rem

// The image slot a collapsed card of this width should show: full, small, or none (0).
const expectedImagePx = (cardWidth: number) =>
  cardWidth >= IMAGE_FULL_CARD_PX ? IMAGE_COLLAPSED_PX : cardWidth >= IMAGE_MIN_CARD_PX ? IMAGE_SMALL_PX : 0;

function expectImageSlotFits(card: HTMLElement) {
  const image = card.querySelector('.frog-card-image')!;
  const expected = expectedImagePx(card.clientWidth);
  if (expected === 0) {
    expect(getComputedStyle(image).display).toBe('none');
    return;
  }
  const box = image.getBoundingClientRect();
  expect(box.width).toBeCloseTo(expected, 0);
  expect(box.height).toBeCloseTo(expected, 0);
  expect(box.right).toBeLessThanOrEqual(card.getBoundingClientRect().right);
}
const IMAGE_EXPANDED_MAX_PX = 192; // 12rem: the largest image on an expanded card
const SPIN_TIMEOUT = 6000; // the spin is 3s; allow for a slow CI machine

const title = (index: number) => translate(en, FROG_ENTRIES[index].titleKey);

async function renderApp() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
  await screen.findByText('API ok, database up');
}

// In page coordinates, so comparisons survive the page scrolling (pinning a card may scroll it).
const rect = (element: Element) => {
  const box = element.getBoundingClientRect();
  return new DOMRect(box.x + window.scrollX, box.y + window.scrollY, box.width, box.height);
};
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parts() {
  const left = screen.getByRole('complementary', { name: 'Highlights' });
  const scope = within(left);
  return {
    left,
    heading: scope.getByRole('heading', { name: 'Highlights' }),
    reel: left.querySelector('.frog-spinner-reel')!,
    window: left.querySelector<HTMLElement>('.frog-spinner-window')!,
    strip: left.querySelector<HTMLElement>('.frog-spinner-strip')!,
    button: scope.getByRole('button', { name: 'Get a frog' }),
    status: scope.getByRole('status'),
  };
}

// The strip card whose centre sits on the payline: what the visitor actually sees.
function paylineCard() {
  const { window: win, strip } = parts();
  const border = parseFloat(getComputedStyle(win).borderTopWidth);
  const peek = (win.clientHeight - ROW_PX) / 2; // the window is a payline row plus a peek above and below
  const y = rect(win).top + border + peek + ROW_PX / 2;
  const row = [...strip.querySelectorAll('.frog-spinner-row')].find((li) => {
    const box = rect(li);
    return box.top <= y && y < box.bottom;
  })!;
  return row.querySelector<HTMLElement>('.frog-card')!;
}

const landedCard = () => document.querySelector<HTMLElement>('.frog-spinner-pick .frog-card')!;
const landedFace = () => document.querySelector<HTMLButtonElement>('.frog-spinner-pick .frog-card-face')!;
const isOpen = () => landedFace().getAttribute('aria-expanded') === 'true';

function expectClose(a: DOMRect, b: DOMRect) {
  for (const side of ['top', 'left', 'width', 'height'] as const) {
    expect(Math.abs(a[side] - b[side]), side).toBeLessThanOrEqual(1);
  }
}

function expectNoHorizontalScroll() {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}

// Waits for the real transitionend: nothing else moves the status on.
async function waitForLanding(expectedTitle: string) {
  await vi.waitFor(() => expect(parts().status).toHaveTextContent(`You got: ${expectedTitle}.`), {
    timeout: SPIN_TIMEOUT,
  });
}

async function spinAndLand(expectedTitle: string) {
  await userEvent.click(parts().button);
  await waitForLanding(expectedTitle);
}

// Moves the mouse onto the column heading: off the card, but not to the centre of <body>,
// which can be over the card itself.
const moveMouseAway = () => userEvent.hover(parts().heading);

// A finger tap, in the order a phone sends it.
async function tap(target: Element) {
  const init = { bubbles: true, cancelable: true, composed: true, pointerType: 'touch', isPrimary: true };
  target.dispatchEvent(new PointerEvent('pointerover', init));
  target.dispatchEvent(new PointerEvent('pointerenter', { ...init, bubbles: false }));
  target.dispatchEvent(new PointerEvent('pointerdown', init));
  target.dispatchEvent(new PointerEvent('pointerup', init));
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
  await wait(0); // let React commit
}

describe.each(VIEWPORTS)('at %i × %i (%s)', (width, height) => {
  beforeEach(async () => {
    await page.viewport(width, height);
    await renderApp();
  });

  it('puts the reel, the button and the status in the left column, in that order', () => {
    const { left, reel, button, status } = parts();
    const column = rect(left);
    for (const box of [rect(reel), rect(button), rect(status)]) {
      expect(box.left).toBeGreaterThanOrEqual(column.left - 1);
      expect(box.right).toBeLessThanOrEqual(column.right + 1);
      expect(box.top).toBeGreaterThanOrEqual(column.top - 1);
      expect(box.bottom).toBeLessThanOrEqual(column.bottom + 1);
    }
    expect(rect(button).top - rect(reel).bottom).toBeCloseTo(GAP_PX, 0);
    expect(rect(button).bottom).toBeLessThanOrEqual(rect(status).top + 1);
  });

  it('puts a full-width button directly below the reel', () => {
    const { reel, button } = parts();
    expect(Math.abs(rect(button).left - rect(reel).left)).toBeLessThanOrEqual(1);
    expect(Math.abs(rect(button).right - rect(reel).right)).toBeLessThanOrEqual(1);
    expect(rect(button).height).toBeGreaterThanOrEqual(TAP_TARGET_PX - 0.5);
  });

  it(`shows ${expectedPeek(height) === 1 ? 'whole' : 'half'} rows above and below the payline`, () => {
    const { window: win } = parts();
    expect(win.clientHeight).toBeCloseTo(ROW_PX + 2 * expectedPeek(height) * ROW_PX, 0);
  });

  it('rests on the first entry', () => {
    expect(paylineCard().dataset.entryId).toBe(FROG_ENTRIES[0].id);
  });

  it('centres the spinner and the column text horizontally', () => {
    const { left, heading, reel, status } = parts();
    const column = left.getBoundingClientRect();
    const style = getComputedStyle(left);
    const contentLeft = column.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const contentRight = column.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
    const box = reel.getBoundingClientRect();
    expect(Math.abs(box.left - contentLeft - (contentRight - box.right))).toBeLessThanOrEqual(1);
    for (const element of [heading, status, screen.getByRole('main'), screen.getByRole('complementary', { name: 'Get in touch' })]) {
      expect(getComputedStyle(element).textAlign).toBe('center');
    }
  });

  it('draws rounded cards, with neighbours in different colours', () => {
    const card = paylineCard();
    expect(parseFloat(getComputedStyle(card).borderTopLeftRadius)).toBeCloseTo(CARD_RADIUS_PX, 0);
    const row = card.parentElement!;
    const colour = (li: Element) => getComputedStyle(li.querySelector('.frog-card')!).backgroundColor;
    const [above, on, below, next] = [
      row.previousElementSibling!,
      row,
      row.nextElementSibling!,
      row.nextElementSibling!.nextElementSibling!,
    ].map(colour);
    // At rest the payline shows entry 1, so the row above is entry 20: the wrap-around.
    expect(on).not.toBe(above);
    expect(on).not.toBe(below);
    expect(new Set([on, below, next]).size).toBe(3); // all three tones are in use
    for (const c of [above, on, below, next]) expect(c).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('sizes the image slot to the card: full, smaller on narrow cards, none only when very narrow', () => {
    expectImageSlotFits(paylineCard());
    // At the default text size every layout has room for at least the small image.
    expect(expectedImagePx(paylineCard().clientWidth)).toBeGreaterThan(0);
  });

  it('conceals every reel card: no text or picture, a title bar in a deeper shade of its tone', () => {
    const { window: win } = parts();
    expect(win.textContent).toBe('');
    expect(win.querySelector('img')).toBeNull();
    const card = paylineCard();
    const bar = card.querySelector('.frog-card-title-concealed')!;
    const barBox = rect(bar);
    expect(barBox.width).toBeGreaterThan(0);
    expect(barBox.height).toBeGreaterThan(0);
    expect(barBox.left).toBeGreaterThanOrEqual(rect(card).left - 1);
    expect(barBox.right).toBeLessThanOrEqual(rect(card).right + 1);
    const barColour = getComputedStyle(bar).backgroundColor;
    expect(barColour).not.toBe('rgba(0, 0, 0, 0)');
    expect(barColour).not.toBe(getComputedStyle(card).backgroundColor);
  });

  it('never scrolls horizontally', () => {
    expectNoHorizontalScroll();
    const win = rect(parts().window);
    for (const card of parts().strip.querySelectorAll('.frog-card')) {
      expect(rect(card).left).toBeGreaterThanOrEqual(win.left - 1);
      expect(rect(card).right).toBeLessThanOrEqual(win.right + 1);
    }
  });
});

describe.each([
  [375, 667],
  [844, 390],
  [1280, 800],
])('spinning and expanding at %i × %i', (width, height) => {
  const first = pickNextIndex(FROG_ENTRIES.length, 0, () => 0.5);
  const second = pickNextIndex(FROG_ENTRIES.length, first, () => 0.5);

  beforeEach(async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    await page.viewport(width, height);
    await renderApp();
  }, SPIN_TIMEOUT);

  afterEach(() => {
    window.scrollTo(0, 0);
  });

  it('really animates, showing the payline frame only while spinning', async () => {
    const { strip, status, window: win } = parts();
    const payline = () => getComputedStyle(win, '::after').display;
    expect(payline()).toBe('none');
    await userEvent.click(parts().button);
    expect(status).toHaveTextContent('Spinning...');
    expect(payline()).not.toBe('none');
    const before = getComputedStyle(strip).transform;
    await wait(200);
    expect(getComputedStyle(strip).transform).not.toBe(before);
    await waitForLanding(title(first)); // no second click: Playwright would wait for aria-disabled to clear
    expect(payline()).toBe('none');
  });

  it('lands where it says: the announced card is the payline card is the landed card', async () => {
    // What the reel stopped on, read when the real transitionend fires and before the component
    // moves the strip back to its resting copy (a capture listener on window runs before React's).
    let stoppedOn = '';
    const onEnd = (event: TransitionEvent) => {
      if (event.target === parts().strip) stoppedOn = paylineCard().dataset.entryId ?? '';
    };
    window.addEventListener('transitionend', onEnd, true);
    try {
      await spinAndLand(title(first));
    } finally {
      window.removeEventListener('transitionend', onEnd, true);
    }
    expect(stoppedOn).toBe(FROG_ENTRIES[first].id);
    expect(paylineCard().dataset.entryId).toBe(FROG_ENTRIES[first].id);
    expect(landedCard().dataset.entryId).toBe(FROG_ENTRIES[first].id);
    expect(landedCard()).toHaveTextContent(title(first));
    // The landed card shows its small image and keeps its title within two lines while collapsed.
    expectImageSlotFits(landedCard());
    expect(expectedImagePx(landedCard().clientWidth)).toBeGreaterThan(0); // shown at these sizes
    const titleEl = landedCard().querySelector('.frog-card-title')!;
    expect(rect(titleEl).height).toBeLessThanOrEqual(2 * parseFloat(getComputedStyle(titleEl).lineHeight) + 1);
    expect(rect(titleEl).right).toBeLessThanOrEqual(rect(landedCard()).right);
    expectClose(rect(landedCard()), rect(paylineCard()));
  });

  describe('once landed', () => {
    beforeEach(async () => {
      await spinAndLand(title(first));
    }, SPIN_TIMEOUT * 2);

    it('opens over the page on click, without moving or resizing anything', async () => {
      const { left, window: win, button, status } = parts();
      const layout = document.querySelector('.column-layout')!;
      const columns = [screen.getByRole('main'), left, screen.getByRole('complementary', { name: 'Get in touch' })];
      const before = [rect(win), rect(button), rect(status), rect(layout), ...columns.map(rect)];
      const pageHeight = document.documentElement.scrollHeight;
      const cardBefore = rect(landedCard());

      await userEvent.click(landedFace());
      expect(isOpen()).toBe(true);
      expect(landedCard().querySelector('.frog-card-blurb')).toBeVisible();

      // It grows downwards only, from where it was.
      const card = rect(landedCard());
      expect(card.height).toBeGreaterThan(cardBefore.height + 1);
      expect(Math.abs(card.top - cardBefore.top)).toBeLessThanOrEqual(1);
      expect(Math.abs(card.left - cardBefore.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(card.width - cardBefore.width)).toBeLessThanOrEqual(1);

      // Nothing else moves or changes size: not the reel, the button, the status, or any column.
      const after = [rect(win), rect(button), rect(status), rect(layout), ...columns.map(rect)];
      before.forEach((box, i) => expectClose(after[i], box));
      expect(document.documentElement.scrollHeight).toBe(pageHeight);
      expectNoHorizontalScroll();

      // It lies over the button: what is drawn there is the card.
      const viewportCard = landedCard().getBoundingClientRect();
      const viewportButton = button.getBoundingClientRect();
      expect(viewportCard.bottom).toBeGreaterThan(viewportButton.top);
      // Probe in the middle: the card is inset from the reel's sides, so the button's edges show beside it.
      const hit = document.elementFromPoint(viewportButton.left + viewportButton.width / 2, viewportButton.top + 4);
      expect(hit?.closest('.frog-spinner-pick')).not.toBeNull();
    });

    it('shows a larger, square image above the title when expanded, even on a narrow card', async () => {
      const image = () => landedCard().querySelector('.frog-card-image')!;
      const collapsedWidth = image().getBoundingClientRect().width; // 0 when hidden on a narrow card
      await userEvent.click(landedFace());
      expect(isOpen()).toBe(true);
      const box = rect(image());
      const card = rect(landedCard());
      expect(getComputedStyle(image()).display).not.toBe('none');
      expect(box.width).toBeGreaterThan(Math.max(collapsedWidth, IMAGE_COLLAPSED_PX) + 1);
      expect(box.width).toBeLessThanOrEqual(IMAGE_EXPANDED_MAX_PX + 1);
      expect(Math.abs(box.height - box.width)).toBeLessThanOrEqual(1);
      expect(box.left).toBeGreaterThanOrEqual(card.left - 1);
      expect(box.right).toBeLessThanOrEqual(card.right + 1);
      const title = rect(landedCard().querySelector('.frog-card-title')!);
      expect(title.top).toBeGreaterThanOrEqual(box.bottom - 1);
    });

    it('does not open on hover', async () => {
      await userEvent.hover(landedFace());
      expect(isOpen()).toBe(false);
      expect(landedCard().querySelector('.frog-card-blurb')).not.toBeVisible();
    });

    it('collapses back to exactly where it was', async () => {
      const { button, status } = parts();
      const before = [rect(landedCard()), rect(button), rect(status)];
      await userEvent.click(landedFace());
      expect(isOpen()).toBe(true);
      await userEvent.click(landedFace());
      expect(isOpen()).toBe(false);
      const after = [rect(landedCard()), rect(button), rect(status)];
      before.forEach((box, i) => expectClose(after[i], box));
    });

    it('opens on click and stays open when the mouse moves away', async () => {
      await userEvent.click(landedFace());
      expect(isOpen()).toBe(true);
      await moveMouseAway();
      expect(isOpen()).toBe(true);
      await userEvent.click(landedFace());
      expect(isOpen()).toBe(false);
    });

    it('closes on a click outside', async () => {
      const buttonBefore = rect(parts().button);
      await userEvent.click(landedFace());
      expect(isOpen()).toBe(true);
      await userEvent.click(parts().heading);
      expect(isOpen()).toBe(false);
      expectClose(rect(parts().button), buttonBefore);
    });

    it('closes when keyboard focus leaves (Tab and Shift+Tab)', async () => {
      landedFace().focus();
      await userEvent.keyboard('{Enter}');
      expect(isOpen()).toBe(true);
      await userEvent.tab();
      expect(parts().button).toHaveFocus();
      expect(isOpen()).toBe(false);

      landedFace().focus();
      await userEvent.keyboard('{Enter}');
      expect(isOpen()).toBe(true);
      await userEvent.tab({ shift: true });
      expect(landedFace()).not.toHaveFocus();
      expect(isOpen()).toBe(false);
    });

    it('rings the whole card, description included, when the keyboard focuses it', async () => {
      const ringed = (element: Element) => getComputedStyle(element).outlineStyle !== 'none';
      parts().button.focus();
      await userEvent.tab({ shift: true }); // keyboard navigation, so :focus-visible applies
      expect(landedFace()).toHaveFocus();
      expect(ringed(landedCard())).toBe(true);
      expect(ringed(landedFace())).toBe(false);

      await userEvent.keyboard('{Enter}');
      expect(isOpen()).toBe(true);
      expect(ringed(landedCard())).toBe(true);
      expect(ringed(landedFace())).toBe(false);
      // The ring follows the card's edge, so it encloses the open description.
      const card = rect(landedCard());
      const blurb = rect(landedCard().querySelector('.frog-card-blurb')!);
      expect(blurb.top).toBeGreaterThanOrEqual(card.top);
      expect(blurb.bottom).toBeLessThanOrEqual(card.bottom + 1);
      // Nothing clips the ring: the ring's outer edge stays inside the reel's grid cell.
      const outer = parseFloat(getComputedStyle(landedCard()).outlineOffset) + parseFloat(getComputedStyle(landedCard()).outlineWidth);
      expect(card.left - outer).toBeGreaterThanOrEqual(rect(parts().reel).left - 1);
      expect(card.right + outer).toBeLessThanOrEqual(rect(parts().reel).right + 1);
    });

    it('shows no ring when the card is clicked with a mouse', async () => {
      await userEvent.click(landedFace());
      expect(isOpen()).toBe(true);
      expect(getComputedStyle(landedCard()).outlineStyle).toBe('none');
    });

    it('closes on Escape, keeping focus on the card', async () => {
      landedFace().focus();
      await userEvent.keyboard('{Enter}');
      expect(isOpen()).toBe(true);
      await userEvent.keyboard('{Escape}');
      expect(isOpen()).toBe(false);
      expect(landedFace()).toHaveFocus();
    });

    it('opens on a tap, stays open on a second tap, and closes on a tap outside', async () => {
      const buttonBefore = rect(parts().button);
      const cardBefore = rect(landedCard());
      await tap(landedFace());
      expect(isOpen()).toBe(true);
      expect(rect(landedCard()).height).toBeGreaterThan(cardBefore.height + 1);
      expectClose(rect(parts().button), buttonBefore); // overlaid, not pushed down
      await tap(landedFace());
      expect(isOpen()).toBe(true);
      await tap(parts().heading);
      expect(isOpen()).toBe(false);
    });

    it('stays open when a touch on the page turns into a scroll', async () => {
      await tap(landedFace());
      expect(isOpen()).toBe(true);
      const init = { bubbles: true, pointerType: 'touch', isPrimary: true };
      document.body.dispatchEvent(new PointerEvent('pointerdown', init));
      document.body.dispatchEvent(new PointerEvent('pointercancel', init));
      window.scrollBy(0, 100);
      await wait(50);
      expect(isOpen()).toBe(true);
    });

    it('keeps a long description within the column width, and on screen on desktop', async () => {
      // Land on entry12, the long blurb: one more spin from `first`.
      const target = FROG_ENTRIES.findIndex((entry) => entry.id === 'entry12');
      const choice = target > first ? target - 1 : target;
      vi.mocked(Math.random).mockReturnValue((choice + 0.5) / (FROG_ENTRIES.length - 1));
      await spinAndLand(title(target));
      await userEvent.click(landedFace());
      expect(isOpen()).toBe(true);
      const card = rect(landedCard());
      const column = rect(parts().left);
      expect(card.left).toBeGreaterThanOrEqual(column.left - 1);
      expect(card.right).toBeLessThanOrEqual(column.right + 1);
      expectNoHorizontalScroll();

      if (window.matchMedia('(width > 64rem)').matches) {
        // The page doesn't scroll on desktop, so the card stops above the screen's bottom edge
        // and scrolls inside itself.
        expect(landedCard().getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
        expect(landedCard().scrollHeight).toBeGreaterThan(landedCard().clientHeight);
        expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
      }
    });

    it('closes the card and lands on a new entry on a second spin', async () => {
      await userEvent.click(landedFace());
      expect(isOpen()).toBe(true);
      // The open card lies over "Get a frog", so start the spin from the keyboard.
      parts().button.focus();
      await userEvent.keyboard('{Enter}');
      await waitForLanding(title(second));
      expect(isOpen()).toBe(false);
      expect(paylineCard().dataset.entryId).toBe(FROG_ENTRIES[second].id);
      expectClose(rect(landedCard()), rect(paylineCard()));
    });

    if (height === 390) {
      it('scrolls a pinned card into view', async () => {
        // Put the card face just above the bottom edge, so its description opens below the fold.
        window.scrollBy(0, rect(landedFace()).bottom - (window.innerHeight - 8));
        landedFace().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
        landedFace().dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
        await vi.waitFor(() => expect(isOpen()).toBe(true));
        await vi.waitFor(() => expect(landedCard().getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight + 1));
      });
    }
  });
}, SPIN_TIMEOUT * 3);
