import { screen, within } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { themeInvariantClasses } from './styles/themeInvariant';
import {
  SAGE_800_RGB,
  SAGE_900_RGB,
  SAND_100_RGB,
  setTheme,
  SIENNA_300_RGB,
  SKY_950_RGB,
  themeSwitch,
} from './test/browserHelpers';
import { renderApp } from './test/renderApp';

// What the browser really computes in each theme: proves the dark blocks compiled and apply.

const color = (element: Element, property: 'backgroundColor' | 'color') => getComputedStyle(element)[property];

const INVARIANT = themeInvariantClasses(
  import.meta.glob<string>('/src/{components,pages}/*.scss', { query: '?raw', import: 'default', eager: true }),
);

it('reads the theme-invariant sheets (an empty glob would excuse nothing and test nothing)', () => {
  expect(INVARIANT).toEqual(['d-theme-toggle']);
});
const middleHeading = () => within(screen.getByRole('main')).getByRole('heading', { level: 2 });

describe('the dark theme', () => {
  it('draws the page, text, nav bar, Spin button and middle heading with the dark palette', async () => {
    setTheme('dark');
    await renderApp('/');
    const layout = document.querySelector('.app-layout')!;
    expect(color(layout, 'backgroundColor')).toBe(SKY_950_RGB);
    expect(color(layout, 'color')).toBe(SAND_100_RGB);
    expect(color(document.querySelector('.navbar')!, 'backgroundColor')).toBe(SAGE_900_RGB);
    expect(color(screen.getByRole('button', { name: 'Spin the wheel' }), 'backgroundColor')).toBe(SIENNA_300_RGB);
    expect(color(middleHeading(), 'color')).toBe(SIENNA_300_RGB);
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('dark');
  });
});

describe('the light theme', () => {
  it('keeps the main green (sage-800) and tells the browser the page is light', async () => {
    setTheme('light');
    await renderApp('/');
    expect(color(document.querySelector('.navbar')!, 'backgroundColor')).toBe(SAGE_800_RGB);
    expect(color(screen.getByRole('button', { name: 'Spin the wheel' }), 'backgroundColor')).toBe(SAGE_800_RGB);
    expect(color(middleHeading(), 'color')).toBe(SAGE_800_RGB);
    expect(color(document.querySelector('.app-layout')!, 'backgroundColor')).not.toBe(SKY_950_RGB);
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('light');
  });
});

describe('the live switch', () => {
  it('repaints the page when pressed, and back again', async () => {
    setTheme('light');
    await renderApp('/');
    const layout = document.querySelector('.app-layout')!;
    const lightBackground = color(layout, 'backgroundColor');
    await userEvent.click(themeSwitch());
    expect(color(layout, 'backgroundColor')).toBe(SKY_950_RGB);
    expect(color(layout, 'backgroundColor')).not.toBe(lightBackground);
    await userEvent.click(themeSwitch());
    expect(color(layout, 'backgroundColor')).toBe(lightBackground);
    expect(localStorage.getItem('ex3.theme')).toBe('light');
  });
});

// The role custom properties (--text-color-..., --surface-color-..., ...) that a component's light
// `.d-<name>` block declares, read from the real stylesheets.
function rolesOf(className: string): string[] {
  const roles = new Set<string>();
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // a cross-origin sheet can't be read; none of ours is one
    }
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule && rule.selectorText === `.${className}`) {
        for (const property of rule.style) if (property.startsWith('--')) roles.add(property);
      }
    }
  }
  return [...roles];
}

const dClasses = (element: Element) => [...element.classList].filter((name) => name.startsWith('d-'));

// Role values per .d-* element of the page now on screen, keyed "<class> <role>".
function roleValues(): Map<string, string> {
  const values = new Map<string, string>();
  for (const element of document.querySelectorAll('[class^="d-"], [class*=" d-"]')) {
    const style = getComputedStyle(element);
    for (const className of dClasses(element)) {
      for (const role of rolesOf(className)) values.set(`${className} ${role}`, style.getPropertyValue(role).trim());
    }
  }
  return values;
}

describe.each(['/', '/frog-library', '/about', '/does-not-exist'])('every component on %s', (url) => {
  it('changes at least one of its colour roles when the theme switches (a dark block that never applied would fail)', async () => {
    setTheme('light');
    await renderApp(url);
    const light = roleValues();
    expect(light.size).toBeGreaterThan(0);
    await userEvent.click(themeSwitch());
    expect(document.documentElement.dataset.theme).toBe('dark');
    const dark = roleValues();

    const components = new Set([...light.keys()].map((key) => key.split(' ')[0]));
    expect(components).toContain('d-navbar');
    for (const component of components) {
      const keys = [...light.keys()].filter((key) => key.startsWith(`${component} `));
      for (const key of keys) expect(light.get(key), `${key} has a light value`).not.toBe('');
      const changed = keys.filter((key) => light.get(key) !== dark.get(key));
      // A sheet marked `// theme-invariant:` (styles/themeInvariant.ts) must really stay the same.
      if (INVARIANT.includes(component)) expect(changed, `${component} is marked theme-invariant`).toEqual([]);
      else expect(changed, `${component}: no role changed in dark mode`).not.toEqual([]);
    }
  });
});

describe.each(['light', 'dark'] as const)('starting in the %s theme', (theme) => {
  it('sets <html> and the switch to the theme asked for', async () => {
    setTheme(theme);
    await renderApp('/');
    expect(document.documentElement.dataset.theme).toBe(theme);
    expect(themeSwitch()).toHaveAttribute('aria-checked', String(theme === 'dark'));
  });

  // Overscroll and rubber-band scrolling show <html>'s background, not .app-layout's.
  it('paints the canvas outside the page in the page colour', async () => {
    setTheme(theme);
    await renderApp('/');
    const page = color(document.querySelector('.app-layout')!, 'backgroundColor');
    expect(color(document.documentElement, 'backgroundColor')).toBe(page);
    expect(page).toBe(theme === 'dark' ? SKY_950_RGB : SAND_100_RGB);
  });
});

describe('switching theme', () => {
  const COLOUR_PROPERTY = /color$/; // color, background-color, border-*-color
  const colourTransitions = () =>
    document
      .getAnimations()
      .filter((animation) => animation instanceof CSSTransition && COLOUR_PROPERTY.test(animation.transitionProperty));

  it('changes every colour at once, with no fading in-between state, both ways', async () => {
    setTheme('light');
    await renderApp('/');
    // A nav link, the Spin button and the tabs all have colour transitions (the transitions mixin).
    expect(getComputedStyle(screen.getByRole('button', { name: 'Spin the wheel' })).transitionProperty).toContain(
      'background-color',
    );
    await userEvent.click(themeSwitch());
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(colourTransitions()).toEqual([]);
    await vi.waitFor(() => expect(document.documentElement.dataset.themeSwitching).toBeUndefined());
    expect(colourTransitions()).toEqual([]);
    await userEvent.click(themeSwitch());
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(colourTransitions()).toEqual([]);
  });

  it('still slides the switch thumb', async () => {
    setTheme('light');
    await renderApp('/');
    await userEvent.click(themeSwitch());
    const thumb = themeSwitch().querySelector('.theme-toggle-thumb')!;
    // Chromium reports the logical inset-inline-start as the physical side it maps to: left here.
    expect(thumb.getAnimations().map((a) => (a as CSSTransition).transitionProperty)).toEqual(['left']);
  });
});
