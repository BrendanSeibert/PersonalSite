import { screen, within } from '@testing-library/react';
import { page, userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import {
  expectNoHorizontalScroll,
  navItemNames as navItems,
  rect,
  SAGE_800_RGB,
  SAGE_900_RGB,
  setTheme,
  SIENNA_200_RGB,
  SIENNA_300_RGB,
} from '../test/browserHelpers';
import { renderApp } from '../test/renderApp';
import { applyTextSpacing } from '../test/textSpacing';
import { expectedLayout, VIEWPORTS } from '../test/viewports';
import { GUARDRAIL_LAYERS, LESSONS, LOOP_STEPS, PASS_LENSES, PASS_STAGES } from './aboutContent';

const PANEL_RADIUS_PX = 12; // $radius-lg, fixed: the probe below uses the same mixin, so it can't catch a change
const STACKED_MAX_PX = 768; // $stacked-max-width (48rem)

const panel = () => document.querySelector<HTMLElement>('.about-page-panel')!;
const lead = () => document.querySelector<HTMLElement>('.about-page-lead')!;
const body = () => screen.getByText(en.about.body);
const source = () => document.querySelector<HTMLElement>('.about-page-source')!;
const credits = () => document.querySelector<HTMLElement>('.about-page-credits')!;
const funnelLayers = () => [...document.querySelectorAll<HTMLElement>('.about-page-layers > li')];
const lensChips = () => [...document.querySelectorAll<HTMLElement>('.about-page-lenses > li')];

// Everything that holds words, with how many of each the page has: the prose, each step and its
// "who" chip, each lens chip, funnel layer and lesson card. The chips and step circles are what
// overflow first at large text. Exact counts, so a whole diagram going missing fails too.
const STEPS = LOOP_STEPS.length + PASS_STAGES.length;
const TEXT_BOXES: [selector: string, count: number][] = [
  ['.about-page-pipeline > li', STEPS],
  ['.about-page-pipeline-head', STEPS],
  ['.about-page-who', STEPS],
  ['.about-page-loopback', 1],
  ['.about-page-lenses > li', PASS_LENSES.length],
  ['.about-page-layers > li', GUARDRAIL_LAYERS.length],
  ['.about-page-lessons > li', LESSONS.length],
  ['.about-page-aside', 1],
  ['figcaption', 3],
];

function expectNotClipped() {
  const boxes = [panel(), lead(), body(), source()];
  for (const [selector, count] of TEXT_BOXES) {
    const found = [...document.querySelectorAll<HTMLElement>(selector)];
    expect(found, selector).toHaveLength(count);
    boxes.push(...found);
  }
  for (const element of boxes) {
    expect(element.scrollHeight, `${element.className} height`).toBeLessThanOrEqual(element.clientHeight + 1);
    expect(element.scrollWidth, `${element.className} width`).toBeLessThanOrEqual(element.clientWidth + 1);
  }
}

// At most 48rem wide (in the current rem), centred, and the panel fills <main>'s content box.
function expectCentredAndCapped(maxPx: number) {
  const main = screen.getByRole('main');
  const box = rect(main);
  expect(box.width).toBeLessThanOrEqual(maxPx + 1);
  expect(Math.abs(box.left - (window.innerWidth - box.right))).toBeLessThanOrEqual(1);
  const style = getComputedStyle(main);
  expect(rect(panel()).left).toBeCloseTo(box.left + parseFloat(style.paddingLeft), 0);
  expect(rect(panel()).right).toBeCloseTo(box.right - parseFloat(style.paddingRight), 0);
}

describe.each(VIEWPORTS)('the About page at %i × %i (%s)', (width, height) => {
  const layout = expectedLayout(width);

  beforeEach(async () => {
    await page.viewport(width, height);
    await renderApp('/about');
  });

  it('shows one centred panel, at most 48rem wide', () => {
    expect(document.querySelectorAll('.about-page-panel')).toHaveLength(1);
    expectCentredAndCapped(STACKED_MAX_PX);
  });

  it('looks like the home page’s middle column, but left-aligned under a centred heading', () => {
    // A throwaway copy of the home middle column, styled by the real ColumnLayout.scss and HomePage.scss.
    const probe = document.createElement('div');
    probe.className = 'd-column-layout column-layout';
    probe.innerHTML =
      '<div class="column-layout-column column-layout-middle"><h2>x</h2><p class="home-page-intro">x</p></div>';
    document.body.append(probe);
    const column = getComputedStyle(probe.querySelector('.column-layout-middle')!);
    const homeHeading = getComputedStyle(probe.querySelector('h2')!);
    const homeIntro = getComputedStyle(probe.querySelector('.home-page-intro')!);
    const expected = {
      backgroundColor: column.backgroundColor,
      borderTopColor: column.borderTopColor,
      borderTopWidth: column.borderTopWidth,
      borderTopLeftRadius: column.borderTopLeftRadius,
      paddingTop: column.paddingTop,
      paddingLeft: column.paddingLeft,
      headingColor: homeHeading.color,
      headingSize: homeHeading.fontSize,
      introSize: homeIntro.fontSize,
    };
    probe.remove();

    const style = getComputedStyle(panel());
    const heading = getComputedStyle(screen.getByRole('heading', { level: 2, name: 'About' }));
    expect({
      backgroundColor: style.backgroundColor,
      borderTopColor: style.borderTopColor,
      borderTopWidth: style.borderTopWidth,
      borderTopLeftRadius: style.borderTopLeftRadius,
      paddingTop: style.paddingTop,
      paddingLeft: style.paddingLeft,
      headingColor: heading.color,
      headingSize: heading.fontSize,
      introSize: getComputedStyle(lead()).fontSize,
    }).toEqual(expected);
    expect(parseFloat(style.borderTopLeftRadius)).toBe(PANEL_RADIUS_PX);
    // Long prose reads better left-aligned; the heading stays centred like the home page's.
    expect(style.textAlign).toBe('start');
    expect(heading.textAlign).toBe('center');
  });

  it(`sizes the panel to its content (${layout}), and the page scrolls when it is taller than the screen`, () => {
    const style = getComputedStyle(panel());
    const contentBottom = rect(credits()).bottom + parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth);
    expect(Math.abs(rect(panel()).bottom - contentBottom)).toBeLessThanOrEqual(1);
    expect(rect(source()).bottom).toBeLessThanOrEqual(rect(credits()).bottom + 1); // the citation closes the panel
    const pad = parseFloat(getComputedStyle(screen.getByRole('main')).paddingBottom);
    const pageBottom = rect(panel()).bottom + pad + window.scrollY;
    expect(Math.abs(document.documentElement.scrollHeight - Math.max(pageBottom, window.innerHeight))).toBeLessThanOrEqual(1);
  });

  it('shows all the text, with the lead larger than the body', () => {
    expectNotClipped();
    expect(parseFloat(getComputedStyle(lead()).fontSize)).toBeGreaterThan(parseFloat(getComputedStyle(body()).fontSize));
  });

  it('tapers the funnel, but never narrower than 16rem or the full width', () => {
    const layers = funnelLayers();
    expect(layers).toHaveLength(GUARDRAIL_LAYERS.length);
    const listWidth = rect(layers[0]!.parentElement!).width;
    const sixteenRem = 16 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const floor = Math.min(sixteenRem, listWidth);
    for (const [index, layer] of layers.entries()) {
      expect(rect(layer).width, `layer ${index + 1}`).toBeGreaterThanOrEqual(floor - 1);
      if (index > 0) expect(rect(layer).width).toBeLessThanOrEqual(rect(layers[index - 1]!).width + 1);
    }
    const [first, last] = [rect(layers[0]!).width, rect(layers.at(-1)!).width];
    if (listWidth <= sixteenRem + 1) {
      // Narrower than the floor (the smallest phone): no room to taper, so every layer is full width.
      for (const layer of layers) expect(rect(layer).width).toBeCloseTo(listWidth, 0);
    } else {
      // Room to taper: the last layer is narrower than the first, down to 58% or the floor.
      expect(last).toBeLessThan(first - 1);
      expect(last).toBeCloseTo(Math.max(listWidth * 0.58, floor), 0);
    }
  });

  it('fits every lens chip’s words on its chip, in a row that wraps', () => {
    const chips = lensChips();
    expect(chips).toHaveLength(5);
    const row = rect(chips[0]!.parentElement!);
    for (const chip of chips) {
      expect(chip.scrollWidth, chip.textContent!).toBeLessThanOrEqual(chip.clientWidth + 1);
      expect(rect(chip).right).toBeLessThanOrEqual(row.right + 1);
    }
  });

  it('shows the source link in the citation’s own colour and size, underlined', () => {
    const link = within(source()).getByRole('link');
    const linkStyle = getComputedStyle(link);
    const citationStyle = getComputedStyle(source());
    expect(linkStyle.color).toBe(citationStyle.color);
    expect(linkStyle.fontSize).toBe(citationStyle.fontSize);
    expect(linkStyle.fontWeight).toBe(citationStyle.fontWeight);
    expect(linkStyle.textDecorationLine).toBe('underline');
  });

  it('keeps the panel inside the viewport and never scrolls sideways', () => {
    expect(rect(panel()).left).toBeGreaterThanOrEqual(0);
    expect(rect(panel()).right).toBeLessThanOrEqual(window.innerWidth + 1);
    expectNoHorizontalScroll();
  });

  it('shows Home and Frog Library in the nav', () => {
    expect(navItems()).toEqual(['Home', 'Frog Library']);
  });
});

describe.each([
  ['light', SAGE_800_RGB, SAGE_900_RGB],
  ['dark', SIENNA_300_RGB, SIENNA_200_RGB],
] as const)('the GitHub link in the %s theme', (theme, colour, hover) => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
    setTheme(theme); // before renderApp, so the page starts in this theme
    await renderApp('/about');
  });

  it('is in the link colour and underlined, so it never relies on colour alone', () => {
    const link = within(lead()).getByRole('link', { name: /^my GitHub/ });
    expect(document.documentElement.dataset.theme).toBe(theme);
    expect(getComputedStyle(link).color).toBe(colour);
    expect(getComputedStyle(link).textDecorationLine).toBe('underline');
  });

  it('turns the hover colour under the pointer', async () => {
    const link = within(lead()).getByRole('link', { name: /^my GitHub/ });
    await userEvent.hover(link);
    expect(getComputedStyle(link).color).toBe(hover);
    await userEvent.unhover(link);
    expect(getComputedStyle(link).color).toBe(colour);
  });
});

describe.each([
  [320, 568],
  [375, 667],
  [1280, 800],
])('the About page under the WCAG 1.4.12 text-spacing overrides at %i × %i', (width, height) => {
  beforeEach(async () => {
    await page.viewport(width, height);
    await renderApp('/about');
    return applyTextSpacing(); // its cleanup removes the overrides after each test
  });

  // axe (a11y.browser.test.tsx) can't see clipped text, so the clipping is checked here.
  it('clips no text in any chip, step, layer or card, and never scrolls sideways', () => {
    expectNotClipped();
    expectNoHorizontalScroll();
  });
});

describe.each([
  [375, 667],
  [1280, 800],
])('navigating to and from About at %i × %i', (width, height) => {
  beforeEach(async () => {
    await page.viewport(width, height);
  });

  // DOM click(), not userEvent: Playwright scrolls the link into view first, which would scroll the
  // page to the top on its own and hide a missing scrollTo.
  async function clickAboutAndCheck() {
    screen.getByRole('link', { name: 'About' }).click();
    await screen.findByRole('heading', { level: 2, name: 'About' });
    expect(window.scrollY).toBe(0);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('about-page');
    expect(main).toHaveFocus();
    expect(getComputedStyle(main).outlineStyle).toBe('none');
    expect(navItems()).toEqual(['Home', 'Frog Library']);
  }

  it('home to About: starts at the top, focuses <main> without a ring, hides the About link', async () => {
    await renderApp('/');
    window.scrollTo(0, document.documentElement.scrollHeight);
    if (document.documentElement.scrollHeight > window.innerHeight) expect(window.scrollY).toBeGreaterThan(0);
    await clickAboutAndCheck();
  });

  it('library to About: the same, from a page that always scrolls', async () => {
    await renderApp('/frog-library');
    window.scrollTo(0, document.documentElement.scrollHeight);
    expect(window.scrollY).toBeGreaterThan(0);
    await clickAboutAndCheck();
  });

  it('keyboard: Enter on About focuses the page; Tab reaches GitHub, then the source link, then leaves; Shift+Tab reaches Frog Library', async () => {
    await renderApp('/');
    screen.getByRole('link', { name: 'About' }).focus();
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('heading', { level: 2, name: 'About' });
    const main = screen.getByRole('main');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(main).toHaveFocus();

    // The page's two Tab stops, in reading order; the next Tab moves on past the page, never back to the nav.
    await userEvent.keyboard('{Tab}');
    expect(within(main).getByRole('link', { name: /^my GitHub/ })).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    expect(within(main).getByRole('link', { name: new RegExp(`^${en.about.sourceUrl}`) })).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    expect(nav.contains(document.activeElement)).toBe(false);
    expect(main.contains(document.activeElement) && document.activeElement !== main).toBe(false);

    main.focus();
    // Back from the page: first the dark-mode switch (the nav bar's last control), then the last link.
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('link', { name: 'Frog Library' })).toHaveFocus();
  });

  it('About to home: shows the home page, focuses its <main>, shows Frog Library and About', async () => {
    await renderApp('/about');
    screen.getByRole('link', { name: 'Home' }).click();
    await screen.findByRole('heading', { name: 'About Me' });
    expect(window.scrollY).toBe(0);
    expect(screen.getByRole('main')).toHaveClass('column-layout-middle');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(navItems()).toEqual(['Frog Library', 'About']);
  });
});

describe.each([375, 1280])('the About page with very large text (root font size doubled) at %i wide', (width) => {
  beforeEach(async () => {
    await page.viewport(width, 800);
    document.documentElement.style.fontSize = '200%';
    await renderApp('/about');
  });

  it('keeps its layout, stays within 48rem, clips nothing and never scrolls sideways', () => {
    expect(window.matchMedia('(width > 64rem)').matches).toBe(expectedLayout(width) === 'columns');
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    expectCentredAndCapped(48 * remPx);
    // 48rem is now 1536px, wider than either viewport: the page fills the width.
    expect(rect(screen.getByRole('main')).width).toBeCloseTo(window.innerWidth, 0);
    expectNotClipped();
    expectNoHorizontalScroll();
  });
});
