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
type Pairing = [string, string, string, number];
const LIGHT_PAIRINGS: Pairing[] = [
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
  ['heart focus ring on a sand card', 'sky-700', 'sand-200', UI],
  ['heart focus ring on a sage card', 'sky-700', 'sage-200', UI],
  ['heart focus ring on a sky card', 'sky-700', 'sky-200', UI],
  ['heart on its hover surface', 'sage-800', 'sand-50', UI],
  ['card focus ring on the spinner window', 'sky-700', 'sand-50', UI],
  ['About figure caption on the panel', 'sky-700', 'sand-150', TEXT],
  ['About lesson heading on a lesson card', 'sage-800', 'sand-100', TEXT],
  ['About "who" chip, Claude tone', 'sky-900', 'sage-200', TEXT],
  ['About "who" chip, me tone, and the third funnel layer', 'sky-900', 'sand-200', TEXT],
  ['About "who" chip, tests tone', 'sky-900', 'sky-200', TEXT],
  ['About first funnel layer and lens chips', 'sky-900', 'sage-100', TEXT],
  ['About second funnel layer and the "What’s next" aside', 'sky-900', 'sky-100', TEXT],
  ['About "What’s next" heading', 'sky-800', 'sky-100', TEXT],
  ['About step number and last funnel layer', 'sand-50', 'sage-800', TEXT],
];

// Dark theme: one row per individual foreground/background pair.
const DARK_PAIRINGS: Pairing[] = [
  ['body text on the page', 'sand-100', 'sky-950', TEXT],
  ['body text on the middle column', 'sand-100', 'sand-900', TEXT],
  ['body text on the left column', 'sand-100', 'sage-950', TEXT],
  ['body text on the right column', 'sand-100', 'sky-900', TEXT],
  ['body text on a sand card', 'sand-100', 'sand-800', TEXT],
  ['body text on a sage card', 'sand-100', 'sage-850', TEXT],
  ['body text on a sky card', 'sand-100', 'sky-850', TEXT],
  ['middle column heading (and Frog Library, About)', 'sienna-300', 'sand-900', TEXT],
  ['left column heading', 'sage-300', 'sage-950', TEXT],
  ['spinner result line', 'sage-300', 'sage-950', TEXT],
  ['right column heading', 'sky-300', 'sky-900', TEXT],
  ['page-not-found and error headings', 'sienna-300', 'sky-950', TEXT],
  ['link in the middle column', 'sienna-300', 'sand-900', TEXT],
  ['link in the middle column on hover', 'sienna-200', 'sand-900', TEXT],
  ['nav bar title', 'sand-50', 'sage-900', TEXT],
  ['nav links', 'sand-100', 'sage-900', TEXT],
  ['nav link on hover', 'sage-900', 'sand-200', TEXT],
  ['nav outline and focus ring', 'sand-300', 'sage-900', UI],
  ['"Spin the wheel" button', 'sienna-950', 'sienna-300', TEXT],
  ['"Spin the wheel" button on hover', 'sienna-950', 'sienna-200', TEXT],
  ['"Spin the wheel" button against its column', 'sienna-300', 'sage-950', UI],
  ['page focus ring on the page', 'sky-300', 'sky-950', UI],
  ['page focus ring on the middle column', 'sky-300', 'sand-900', UI],
  ['page focus ring on the left column', 'sky-300', 'sage-950', UI],
  ['page focus ring on the right column', 'sky-300', 'sky-900', UI],
  ['payline', 'sienna-400', 'sky-950', UI],
  ['heart on a sand card', 'sienna-300', 'sand-800', UI],
  ['heart on a sage card', 'sienna-300', 'sage-850', UI],
  ['heart on a sky card', 'sienna-300', 'sky-850', UI],
  ['heart on its hover surface', 'sienna-300', 'sky-950', UI],
  ['heart focus ring on a sand card', 'sky-300', 'sand-800', UI],
  ['heart focus ring on a sage card', 'sky-300', 'sage-850', UI],
  ['heart focus ring on a sky card', 'sky-300', 'sky-850', UI],
  ['tab text', 'sky-300', 'sky-900', TEXT],
  ['tab text on hover', 'sky-300', 'sky-800', TEXT],
  ['selected tab text', 'sand-50', 'sky-900', TEXT],
  ['selected tab bar', 'sienna-300', 'sky-900', UI],
  ['card focus ring on the spinner window', 'sky-300', 'sky-950', UI],
  ['About figure caption on the panel', 'sky-300', 'sand-900', TEXT],
  ['About lesson heading on a lesson card', 'sienna-300', 'sand-800', TEXT],
  ['About "who" chip (Claude tone), first funnel layer and lens chips', 'sand-100', 'sage-850', TEXT],
  ['About "who" chip (me tone), third funnel layer and lesson cards', 'sand-100', 'sand-800', TEXT],
  ['About "who" chip (tests tone) and second funnel layer', 'sand-100', 'sky-850', TEXT],
  ['About "What’s next" aside', 'sand-100', 'sky-900', TEXT],
  ['About "What’s next" heading', 'sky-300', 'sky-900', TEXT],
  ['About step number and last funnel layer', 'sienna-950', 'sienna-300', TEXT],
];

// Theme switch in the nav bar, checked on both nav surfaces (sage-800 in light, sage-900 in dark).
const TOGGLE_PAIRINGS: Pairing[] = ['sage-800', 'sage-900'].flatMap((nav): Pairing[] => [
  [`switch track outline on ${nav}`, 'sand-300', nav, UI],
  [`switch track outline on hover on ${nav}`, 'sand-50', nav, UI],
  [`inactive switch icon on ${nav}`, 'sand-100', nav, UI],
  [`switch thumb against the track on ${nav}`, 'sand-200', nav, UI],
]).concat([['active switch icon on the thumb', 'sage-900', 'sand-200', UI]]);

const withTheme =
  (theme: string) =>
  ([where, fg, bg, min]: Pairing): Pairing => [`${theme}: ${where}`, fg, bg, min];
const ALL_PAIRINGS: Pairing[] = [
  ...LIGHT_PAIRINGS.map(withTheme('light')),
  ...DARK_PAIRINGS.map(withTheme('dark')),
  ...TOGGLE_PAIRINGS.map(withTheme('toggle')),
];

describe('the contrast formula', () => {
  it('gives 21:1 for black on white and 1:1 for a colour on itself', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#3b422e', '#3b422e')).toBe(1);
  });
});

it('reads the palette (guards against the regex silently matching nothing)', () => {
  expect(Object.keys(COLOURS).length).toBeGreaterThanOrEqual(30);
});

describe.each(ALL_PAIRINGS)('%s: %s on %s', (_where, fg, bg, min) => {
  it(`is at least ${min}:1`, () => {
    expect(COLOURS[fg], `${fg} is in the palette`).toBeDefined();
    expect(COLOURS[bg], `${bg} is in the palette`).toBeDefined();
    expect(contrast(COLOURS[fg], COLOURS[bg])).toBeGreaterThanOrEqual(min);
  });
});
