import { describe, expect, it } from 'vitest';
import { componentName, isThemeInvariant, themeInvariantClasses } from './themeInvariant';

const sources = import.meta.glob<string>('/src/**/*.scss', { query: '?raw', import: 'default', eager: true });

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// Colour literals: #hex, colour functions, and common colour keywords not preceded by `$` (so p.$sage-100 is fine).
// All 148 CSS Color Module Level 4 named colours, plus `transparent` (not `currentColor`).
const COLOR_NAMES = `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet
brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred
darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue
dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green
greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon
lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon
lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta
maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen
mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab
orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum
powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna
silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet
wheat white whitesmoke yellow yellowgreen transparent`.split(/\s+/);
const COLOR_LITERAL = new RegExp(
  String.raw`#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|(?<![$\w-])(?:${COLOR_NAMES.join('|')})(?![\w-])`,
  'i',
);
// Any px value except a 1px hairline (also -1px, as in the visually-hidden pattern).
const PX_VALUE = /(?<![\w.])-?(?!1px\b)\d*\.?\d+px\b/;

describe('the guard patterns themselves', () => {
  it('lists 149 colour names (148 named colours and transparent), each once', () => {
    expect(COLOR_NAMES).toHaveLength(149);
    expect(new Set(COLOR_NAMES).size).toBe(149);
  });
  it.each([
    'color: #fff',
    'color: rgb(0 0 0)',
    'color: white',
    'background: transparent',
    'color: orange',
    'background: rebeccapurple',
  ])('flags %j', (css) => {
    expect(css).toMatch(COLOR_LITERAL);
  });
  it.each([
    'color: p.$sage-100',
    'color: var(--text-color-navbar)',
    'color: currentColor',
    'animation-name: tanned',
  ])('allows %j', (css) => {
    expect(css).not.toMatch(COLOR_LITERAL);
  });
  it.each(['width: 10px', 'margin: 0.5px', 'top: 21px', 'margin: -10px', 'left: -0.5px'])('flags %j', (css) =>
    expect(css).toMatch(PX_VALUE),
  );
  it.each(['border: 1px solid', 'width: 10rem', 'gap: t.$space-1', 'margin: -1px'])('allows %j', (css) =>
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

// The block body may contain Sass interpolations (`#{p.$sage-800}`), whose `}` must not end the block.
const BODY = String.raw`((?:[^{}]|#\{[^{}]*\})*)`;
// The light block starts at the beginning of a line, so it cannot match inside the dark selector.
const lightBlock = (css: string, name: string) => new RegExp(String.raw`(?:^|\n)\.d-${name}\s*\{${BODY}\}`).exec(css);
const darkBlock = (css: string, name: string) =>
  new RegExp(String.raw`:root\[data-theme="dark"\]\s+\.d-${name}\s*\{${BODY}\}`).exec(css);
const declarationsOf = (body: string) =>
  body
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean);
const namesOf = (body: string) =>
  declarationsOf(body)
    .map((d) => d.split(':')[0].trim())
    .sort();
const ROLE_DECLARATION = /^--(text|surface|border|shadow)-color-[a-z0-9-]+:\s*#\{p\.\$[a-z0-9-]+\}$/;

describe('the dark block guard patterns', () => {
  const sample = `
.d-x {
  --text-color-x: #{p.$sage-800};
  --surface-color-x: #{p.$sand-100};
}
:root[data-theme="dark"] .d-x {
  --text-color-x: #{p.$sand-100};
  --surface-color-x: #{p.$sky-950};
}
`;
  it('parses a sample sheet into two identical name sets', () => {
    const light = lightBlock(sample, 'x')!;
    const dark = darkBlock(sample, 'x')!;
    expect(namesOf(light[1])).toEqual(['--surface-color-x', '--text-color-x']);
    expect(namesOf(dark[1])).toEqual(namesOf(light[1]));
  });
  it('does not mistake the dark selector for the light block', () => {
    const onlyDark = `:root[data-theme="dark"] .d-x {\n  --text-color-x: #{p.$sand-100};\n}\n`;
    expect(lightBlock(onlyDark, 'x')).toBeNull();
  });
  it('detects a dark block that misses a name', () => {
    const missing = sample.replace('  --surface-color-x: #{p.$sky-950};\n', '');
    expect(namesOf(darkBlock(missing, 'x')![1])).not.toEqual(namesOf(lightBlock(missing, 'x')![1]));
  });
  it.each(['[data-theme=dark] .d-x', ':root[data-theme="dark"].d-x', ':root[data-theme="light"] .d-x', '.d-x[data-theme="dark"]'])(
    'does not find a dark block written as %j',
    (selector) => {
      expect(darkBlock(`${selector} {\n  --text-color-x: #{p.$sand-100};\n}\n`, 'x')).toBeNull();
    },
  );
  it('finds a dark block whose values use Sass interpolation', () => {
    expect(darkBlock(sample, 'x')![1]).toContain('#{p.$sky-950}');
  });
});

describe('the theme-invariant marker', () => {
  it('needs a reason after the colon, at the start of a line', () => {
    expect(isThemeInvariant('// theme-invariant: sits on the nav bar\n.d-x {}')).toBe(true);
    expect(isThemeInvariant('// theme-invariant:\n.d-x {}')).toBe(false);
    expect(isThemeInvariant('// theme-invariant sits on the nav bar\n')).toBe(false);
    expect(isThemeInvariant('.d-x {} // theme-invariant: trailing\n')).toBe(false);
    expect(isThemeInvariant('.d-x {}\n')).toBe(false);
  });

  it('names components by their .d- class', () => {
    expect(componentName('/src/components/FrogCard.scss')).toBe('frog-card');
    expect(themeInvariantClasses({ '/a/ThemeToggle.scss': '// theme-invariant: why\n', '/a/Navbar.scss': '' })).toEqual([
      'd-theme-toggle',
    ]);
  });

  it('is used only where intended (a new opt-out is a deliberate change to this list)', () => {
    expect(themeInvariantClasses(Object.fromEntries(componentSheets))).toEqual(['d-theme-toggle']);
  });
});

describe.each(componentSheets)('%s', (path, raw) => {
  const name = componentName(path);
  const css = stripComments(raw);
  const light = lightBlock(css, name);
  const dark = darkBlock(css, name);

  it(`has a .d-${name} block`, () => {
    expect(light, `expected a .d-${name} { ... } block`).not.toBeNull();
  });

  it('maps only palette colours to correctly named custom properties in that block', () => {
    for (const declaration of declarationsOf(light![1])) {
      expect(declaration).toMatch(ROLE_DECLARATION);
    }
  });

  if (isThemeInvariant(raw)) {
    it('is marked theme-invariant, so it has no dark block', () => {
      expect(dark, `a theme-invariant sheet must not also have a dark block`).toBeNull();
    });
    return;
  }

  it(`has a :root[data-theme="dark"] .d-${name} block`, () => {
    expect(dark, `expected a :root[data-theme="dark"] .d-${name} { ... } block`).not.toBeNull();
  });

  it('maps only palette colours to correctly named custom properties in the dark block', () => {
    for (const declaration of declarationsOf(dark![1])) {
      expect(declaration).toMatch(ROLE_DECLARATION);
    }
  });

  it('has a dark block that sets exactly the same roles', () => {
    expect(namesOf(dark![1])).toEqual(namesOf(light![1]));
  });
});

it('finds the style sheets (guards against the glob silently matching nothing)', () => {
  expect(Object.keys(sources)).toContain('/src/styles/_palette.scss');
  expect(componentSheets.length).toBeGreaterThanOrEqual(11);
});
