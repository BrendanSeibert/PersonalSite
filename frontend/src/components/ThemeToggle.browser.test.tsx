import { screen } from '@testing-library/react';
import { page, userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../test/axe';
import { expectNoHorizontalScroll, navItems, rect, themeSwitch } from '../test/browserHelpers';
import { renderApp } from '../test/renderApp';
import { applyTextSpacing } from '../test/textSpacing';

const centreX = (element: Element) => {
  const box = rect(element);
  return box.left + box.width / 2;
};

const THUMB = '.theme-toggle-thumb';
const SUN = '.theme-toggle-icon-sun';
const MOON = '.theme-toggle-icon-moon';

describe('the theme switch in real Chromium', () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it('is reached by Tab from the last nav link, and shows a visible focus ring', async () => {
    await renderApp('/');
    const links = navItems();
    links.at(-1)!.focus();
    await userEvent.tab();
    const toggle = themeSwitch();
    expect(document.activeElement).toBe(toggle);
    expect(toggle.matches(':focus-visible')).toBe(true);
    const style = getComputedStyle(toggle);
    expect(style.outlineStyle).toBe('solid');
    expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
  });

  it('toggles with Space and keeps focus on the switch', async () => {
    await renderApp('/');
    const toggle = themeSwitch();
    toggle.focus();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.activeElement).toBe(toggle);
    await userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(document.activeElement).toBe(toggle);
  });

  it('starts light with the browser default (Chromium reports a light colour scheme)', async () => {
    await renderApp('/');
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false);
    expect(themeSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('starts dark when the browser prefers dark', async () => {
    const real = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      const list = real(query);
      return query === '(prefers-color-scheme: dark)'
        ? ({ ...list, matches: true, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList)
        : list;
    });
    await renderApp('/');
    expect(themeSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('puts the thumb over the sun when off and over the moon when on', async () => {
    await renderApp('/');
    const toggle = themeSwitch();
    const thumb = toggle.querySelector(THUMB)!;
    const sun = toggle.querySelector(SUN)!;
    const moon = toggle.querySelector(MOON)!;
    expect(centreX(sun)).toBeLessThan(centreX(moon));

    const distance = (a: Element, b: Element) => Math.abs(centreX(a) - centreX(b));
    expect(distance(thumb, sun)).toBeLessThan(1);
    expect(distance(thumb, moon)).toBeGreaterThan(10);

    await userEvent.click(toggle);
    // The thumb slides; wait for the transition to land.
    await vi.waitFor(() => expect(distance(thumb, moon)).toBeLessThan(1));
    expect(distance(thumb, sun)).toBeGreaterThan(10);
  });

  // The thumb moves by the logical inset-inline-start only, so a right-to-left page mirrors it.
  it('slides towards the moon in a right-to-left page too', async () => {
    await renderApp('/');
    const toggle = themeSwitch();
    toggle.dir = 'rtl';
    const thumb = toggle.querySelector(THUMB)!;
    const sun = toggle.querySelector(SUN)!;
    const moon = toggle.querySelector(MOON)!;
    expect(centreX(sun)).toBeGreaterThan(centreX(moon));
    const distance = (a: Element, b: Element) => Math.abs(centreX(a) - centreX(b));
    expect(distance(thumb, sun)).toBeLessThan(1);

    await userEvent.click(toggle);
    await vi.waitFor(() => expect(distance(thumb, moon)).toBeLessThan(1));
  });

  it('inverts the icon over the thumb, so the state is not shown by colour alone', async () => {
    await renderApp('/');
    const toggle = themeSwitch();
    const sun = toggle.querySelector(SUN)!;
    const moon = toggle.querySelector(MOON)!;
    const [sunOff, moonOff] = [getComputedStyle(sun).color, getComputedStyle(moon).color];
    expect(sunOff).not.toBe(moonOff);
    await userEvent.click(toggle);
    expect(getComputedStyle(moon).color).toBe(sunOff);
    expect(getComputedStyle(sun).color).toBe(moonOff);
  });
});

describe.each([
  ['light', false],
  ['dark', true],
])('in the %s theme with very large text (root font size doubled)', (_name, dark) => {
  it.each([320, 375, 1280])('fits the nav bar without overflow at %i wide', async (width) => {
    await page.viewport(width, 800);
    document.documentElement.style.fontSize = '200%';
    await renderApp('/');
    if (dark) await userEvent.click(themeSwitch());
    const toggle = themeSwitch();
    const header = rect(screen.getByRole('banner'));
    const box = rect(toggle);
    expectNoHorizontalScroll();
    expect(box.left).toBeGreaterThanOrEqual(header.left - 1);
    expect(box.right).toBeLessThanOrEqual(header.right + 1);
    expect(box.width).toBeGreaterThan(0);
    // The track grows with the text; the thumb still sits inside it.
    const track = rect(toggle.querySelector('.theme-toggle-track')!);
    const thumb = rect(toggle.querySelector(THUMB)!);
    await vi.waitFor(() => {
      const t = rect(toggle.querySelector(THUMB)!);
      expect(t.left).toBeGreaterThanOrEqual(track.left - 1);
      expect(t.right).toBeLessThanOrEqual(track.right + 1);
    });
    expect(thumb.width).toBeGreaterThan(0);
  });
});

describe('the switch under the WCAG 1.4.12 text-spacing overrides', () => {
  it.each([375, 1280])('has no axe violations and no overflow at %i wide', async (width) => {
    await page.viewport(width, 800);
    await renderApp('/');
    const undo = applyTextSpacing();
    try {
      expectNoHorizontalScroll();
      await expectNoAxeViolations();
      const box = rect(themeSwitch());
      expect(box.width).toBeGreaterThanOrEqual(44 - 0.5);
      expect(box.height).toBeGreaterThanOrEqual(44 - 0.5);
    } finally {
      undo();
    }
  });
});
