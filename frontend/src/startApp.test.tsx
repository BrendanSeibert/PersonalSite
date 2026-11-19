import { act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { startApp } from './startApp';
import { THEME_STORAGE_KEY } from './theme/theme';

// The "no flash of the wrong theme" promise: <html> has its theme before React's first render.
// The probe page has no ThemeToggle, so only startApp's bootstrap can have set it.

let root: ReturnType<typeof startApp> | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
});

function startWithProbe() {
  const seen: (string | undefined)[] = [];
  function Probe() {
    seen.push(document.documentElement.dataset.theme);
    return <p>probe</p>;
  }
  const container = document.createElement('div');
  document.body.append(container);
  act(() => {
    root = startApp(container, [{ path: '*', element: <Probe /> }]);
  });
  return { seen, container };
}

describe('startApp', () => {
  it.each(['dark', 'light'])('has the stored %s theme on <html> at the first render', (theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    const { seen, container } = startWithProbe();
    expect(container).toHaveTextContent('probe');
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toBe(theme);
  });

  it('uses light at the first render when nothing is stored and matchMedia is missing', () => {
    const { seen } = startWithProbe();
    expect(seen[0]).toBe('light');
  });
});
