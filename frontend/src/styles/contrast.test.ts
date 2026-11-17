import { describe, expect, it } from 'vitest';

// Checks every colour pairing in the README's "Colour" table against the palette as written, so a
// shade changed later can't quietly drop a pairing below WCAG AA. It guards the palette, not which
// pairing a component actually uses; the browser tests check a few computed colours for that.

const palette = Object.values(
  import.meta.glob<string>('/src/styles/_palette.scss', { query: '?raw', import: 'default', eager: true }),
)[0];
const COLOURS: Record<string, string> = Object.fromEntries(
  [...palette.matchAll(/^\$([a-z0-9-]+):\s*(#[0-9a-f]{6});/gim)].map(([, name, hex]) => [name, hex]),
);

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5; // WCAG AA, normal text
const UI = 3; // WCAG AA, controls, focus rings, state indicators

// Mirrors the README's colour table: [where, foreground, background, minimum].
const PAIRINGS: [string, string, string, number][] = [
  ['body text on the page', 'sky-900', 'sand-100', TEXT],
  ['body text on the middle column', 'sky-900', 'sand-150', TEXT],
  ['body text on the left column', 'sky-900', 'sage-100', TEXT],
  ['body text on the right column', 'sky-900', 'sky-100', TEXT],
  ['body text on a sand card', 'sky-900', 'sand-200', TEXT],
  ['body text on a sage card', 'sky-900', 'sage-200', TEXT],
  ['body text on a sky card', 'sky-900', 'sky-200', TEXT],
  ['middle column heading (and Frog Library, About)', 'sage-800', 'sand-150', TEXT],
  ['left column heading', 'sage-800', 'sage-100', TEXT],
  ['right column heading', 'sky-800', 'sky-100', TEXT],
  ['page-not-found heading', 'sage-800', 'sand-100', TEXT],
  ['link in the middle column', 'sage-800', 'sand-150', TEXT],
  ['link in the middle column on hover', 'sage-900', 'sand-150', TEXT],
  ['spinner result line', 'sage-800', 'sage-100', TEXT],
  ['nav bar title', 'sand-50', 'sage-800', TEXT],
  ['nav links', 'sand-100', 'sage-800', TEXT],
  ['nav link on hover', 'sage-900', 'sand-200', TEXT],
  ['nav outline and focus ring', 'sand-300', 'sage-800', UI],
  ['"Spin the wheel" button', 'sand-50', 'sage-800', TEXT],
  ['"Spin the wheel" button on hover', 'sand-50', 'sage-900', TEXT],
  ['"Spin the wheel" button against its column', 'sage-800', 'sage-100', UI],
  ['page focus ring on the page', 'sky-700', 'sand-100', UI],
  ['page focus ring on the middle column', 'sky-700', 'sand-150', UI],
  ['page focus ring on the left column', 'sky-700', 'sage-100', UI],
  ['page focus ring on the right column', 'sky-700', 'sky-100', UI],
  ['payline', 'sage-800', 'sand-50', UI],
  ['heart on a sand card', 'sage-800', 'sand-200', UI],
  ['heart on a sage card', 'sage-800', 'sage-200', UI],
  ['heart on a sky card', 'sage-800', 'sky-200', UI],
  ['selected tab bar', 'sage-800', 'sky-100', UI],
  ['tab text', 'sky-700', 'sky-100', TEXT],
  ['tab text on hover', 'sky-700', 'sky-200', TEXT],
  ['selected tab text', 'sky-900', 'sky-100', TEXT],
];

describe('the contrast formula', () => {
  it('gives 21:1 for black on white and 1:1 for a colour on itself', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#3b422e', '#3b422e')).toBe(1);
  });
});

it('reads the palette (guards against the regex silently matching nothing)', () => {
  expect(Object.keys(COLOURS).length).toBeGreaterThanOrEqual(15);
});

describe.each(PAIRINGS)('%s: %s on %s', (_where, fg, bg, min) => {
  it(`is at least ${min}:1`, () => {
    expect(COLOURS[fg], `${fg} is in the palette`).toBeDefined();
    expect(COLOURS[bg], `${bg} is in the palette`).toBeDefined();
    expect(contrast(COLOURS[fg], COLOURS[bg])).toBeGreaterThanOrEqual(min);
  });
});
