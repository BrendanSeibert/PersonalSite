// The one place that decides which components keep the same colours in both themes. A component
// sheet opts out of the dark block with a line comment starting `// theme-invariant:` followed by
// the reason. styleConventions.test.ts then requires it to have no dark block, and
// theme.browser.test.tsx requires its roles to stay the same when the theme switches (every other
// component must change at least one).

const MARKER = /^\/\/ theme-invariant:[ \t]*\S/m; // the reason must be on the same line

export const isThemeInvariant = (rawScss: string): boolean => MARKER.test(rawScss);

// FrogCard.scss -> frog-card
export const componentName = (path: string): string =>
  path
    .split('/')
    .pop()!
    .replace('.scss', '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

// The `.d-<name>` classes of the marked sheets, given { path: raw source }.
export const themeInvariantClasses = (sources: Record<string, string>): string[] =>
  Object.entries(sources)
    .filter(([, raw]) => isThemeInvariant(raw))
    .map(([path]) => `d-${componentName(path)}`)
    .sort();
