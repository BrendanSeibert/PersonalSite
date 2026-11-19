import { screen } from '@testing-library/react';
import { expect } from 'vitest';

// Computed colours the browser reports for palette shades used in assertions. Keep in step with
// src/styles/_palette.scss (sage-800 is #3b422e).
export const SAGE_800_RGB = 'rgb(59, 66, 46)';

export const rect = (element: Element) => element.getBoundingClientRect();

// The nav's links, as elements.
export const navItems = () => [...screen.getByRole('banner').querySelectorAll<HTMLElement>('.navbar-link')];

// The nav's link texts, in order.
export const navItemNames = () => navItems().map((item) => item.textContent);

export function expectNoHorizontalScroll() {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}
