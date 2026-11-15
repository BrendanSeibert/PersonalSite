import { describe, expect, it } from 'vitest';

const sources = import.meta.glob<string>('/src/**/*.scss', { query: '?raw', import: 'default', eager: true });

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// Colour literals: #hex, colour functions, and common colour keywords not preceded by `$` (so p.$green-50 is fine).
const COLOR_LITERAL =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|(?<![$\w-])(?:white|black|red|green|blue|yellow|gray|grey|transparent)(?![\w-])/i;
// Any px value except exactly 1px.
const PX_VALUE = /(?<![\w.-])(?!1px\b)\d*\.?\d+px\b/;

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

describe('the guard patterns themselves', () => {
  it.each(['color: #fff', 'color: rgb(0 0 0)', 'color: white', 'background: transparent'])('flags %j', (css) => {
    expect(css).toMatch(COLOR_LITERAL);
  });
  it.each(['color: p.$green-50', 'color: var(--text-color-navbar)', 'color: currentColor'])('allows %j', (css) => {
    expect(css).not.toMatch(COLOR_LITERAL);
  });
  it.each(['width: 10px', 'margin: 0.5px', 'top: 21px'])('flags %j', (css) => expect(css).toMatch(PX_VALUE));
  it.each(['border: 1px solid', 'width: 10rem', 'gap: t.$space-1'])('allows %j', (css) =>
    expect(css).not.toMatch(PX_VALUE),
  );
});

describe.each(Object.entries(sources))('%s', (path, raw) => {
  const css = stripComments(raw);

  it('was read as real source (an empty string would let every rule pass)', () => {
    expect(raw.trim()).not.toBe('');
  });

  it('contains no colour literals outside the palette', () => {
    if (path.endsWith('/styles/_palette.scss')) return;
    expect(css).not.toMatch(COLOR_LITERAL);
  });

  it('uses rem rather than px (only 1px hairlines are allowed)', () => {
    expect(css).not.toMatch(PX_VALUE);
  });
});

const componentSheets = Object.entries(sources).filter(([path]) => /\/src\/(components|pages)\//.test(path));

describe.each(componentSheets)('%s', (path, raw) => {
  const name = kebab(path.split('/').pop()!.replace('.scss', ''));
  // The block body may contain Sass interpolations (`#{p.$green-800}`), whose `}` must not end the block.
  const block = new RegExp(`\\.d-${name}\\s*\\{((?:[^{}]|#\\{[^{}]*\\})*)\\}`).exec(stripComments(raw));

  it(`has a .d-${name} block`, () => {
    expect(block, `expected a .d-${name} { ... } block`).not.toBeNull();
  });

  it('maps only palette colours to correctly named custom properties in that block', () => {
    const declarations = block![1]
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean);
    for (const declaration of declarations) {
      expect(declaration).toMatch(/^--(text|surface|border|shadow)-color-[a-z0-9-]+:\s*#\{p\.\$[a-z0-9-]+\}$/);
    }
  });
});

it('finds the style sheets (guards against the glob silently matching nothing)', () => {
  expect(Object.keys(sources)).toContain('/src/styles/_palette.scss');
  expect(componentSheets.length).toBeGreaterThanOrEqual(7);
});
