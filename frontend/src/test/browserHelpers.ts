import { screen } from '@testing-library/react';
import { expect } from 'vitest';

// Computed colours the browser reports for palette shades used in assertions. Keep in step with
// src/styles/_palette.scss (sage-800 is #3b422e, sage-900 #292f1e, sienna-300 #ebad8e,
// sky-950 #111a1c, sand-100 #f5f0ea).
export const SAGE_800_RGB = 'rgb(59, 66, 46)';
export const SAGE_900_RGB = 'rgb(41, 47, 30)';
export const SIENNA_300_RGB = 'rgb(235, 173, 142)';
export const SKY_950_RGB = 'rgb(17, 26, 28)';
export const SAND_100_RGB = 'rgb(245, 240, 234)';

// Starts the next renderApp in `theme`, as a returning visitor's stored choice would.
export function setTheme(theme: 'light' | 'dark') {
  localStorage.setItem('ex3.theme', theme);
}

// The theme switch in the nav bar.
export const themeSwitch = () => screen.getByRole('switch', { name: 'Dark mode' });

export const rect = (element: Element) => element.getBoundingClientRect();

// The nav's links, as elements.
export const navItems = () => [...screen.getByRole('banner').querySelectorAll<HTMLElement>('.navbar-link')];

// The nav's link texts, in order.
export const navItemNames = () => navItems().map((item) => item.textContent);

export function expectNoHorizontalScroll() {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}
