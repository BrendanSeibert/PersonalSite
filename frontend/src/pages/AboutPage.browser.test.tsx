import { screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { page, userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import { routes } from '../routes';
import { renderWithProviders } from '../test/renderWithProviders';
import { expectedLayout, VIEWPORTS } from '../test/viewports';
import { waitForHomeToSettle } from '../test/settle';

const PANEL_RADIUS_PX = 12; // $radius-lg, fixed: the probe below uses the same mixin, so it can't catch a change
const STACKED_MAX_PX = 768; // $stacked-max-width (48rem)

async function renderApp(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false });
  if (url === '/') await waitForHomeToSettle();
  else await screen.findByRole('heading', { level: 2 });
  return router;
}

const rect = (element: Element) => element.getBoundingClientRect();
const panel = () => document.querySelector<HTMLElement>('.about-page-panel')!;
const intro = () => screen.getByText(en.about.intro);
const body = () => screen.getByText(en.about.body);
const source = () => document.querySelector<HTMLElement>('.about-page-source')!;
const navItems = () =>
  [...screen.getByRole('banner').querySelectorAll<HTMLElement>('.navbar-link')].map((item) => item.textContent);

function expectNoHorizontalScroll() {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}

function expectNotClipped() {
  for (const element of [panel(), intro(), body(), source()]) {
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

  it('looks like the home page’s middle column', () => {
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
      textAlign: column.textAlign,
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
      textAlign: style.textAlign,
      headingColor: heading.color,
      headingSize: heading.fontSize,
      introSize: getComputedStyle(intro()).fontSize,
    }).toEqual(expected);
    expect(parseFloat(style.borderTopLeftRadius)).toBe(PANEL_RADIUS_PX);
  });

  if (layout === 'rows') {
    it('sizes the panel to its content when stacked', () => {
      const style = getComputedStyle(panel());
      const contentBottom = rect(source()).bottom + parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth);
      expect(Math.abs(rect(panel()).bottom - contentBottom)).toBeLessThanOrEqual(1);
    });
  } else {
    it('reaches the bottom of the screen when wide, without scrolling the page', () => {
      const pad = parseFloat(getComputedStyle(screen.getByRole('main')).paddingBottom);
      expect(Math.abs(rect(panel()).bottom - (window.innerHeight - pad))).toBeLessThanOrEqual(1);
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
    });
  }

  it('shows all the text, with the lead larger than the body', () => {
    expectNotClipped();
    expect(parseFloat(getComputedStyle(intro()).fontSize)).toBeGreaterThan(parseFloat(getComputedStyle(body()).fontSize));
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

  it('keyboard: Enter on About focuses the page; Tab reaches the source link, then leaves; Shift+Tab reaches Frog Library', async () => {
    await renderApp('/');
    screen.getByRole('link', { name: 'About' }).focus();
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('heading', { level: 2, name: 'About' });
    const main = screen.getByRole('main');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(main).toHaveFocus();

    // The source link is the page's one Tab stop; the next Tab moves on past the page, never back to the nav.
    await userEvent.keyboard('{Tab}');
    expect(within(main).getByRole('link', { name: new RegExp(`^${en.about.sourceUrl}`) })).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    expect(nav.contains(document.activeElement)).toBe(false);
    expect(main.contains(document.activeElement) && document.activeElement !== main).toBe(false);

    main.focus();
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
