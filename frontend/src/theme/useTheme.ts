import { useEffect, useLayoutEffect, useState } from 'react';
import { resolveTheme, toggleTheme, type Theme } from './theme';
import {
  applyTheme,
  readStoredTheme,
  systemPrefersDark,
  watchStoredTheme,
  watchSystemTheme,
  writeStoredTheme,
} from './themeStorage';

type ThemeState = { theme: Theme; chosen: boolean };

// One storage read gives both the theme and whether the visitor chose it.
function fromStored(stored: Theme | null): ThemeState {
  return { theme: resolveTheme(stored, systemPrefersDark()), chosen: stored !== null };
}

export function useTheme() {
  const [{ theme, chosen }, setState] = useState(() => fromStored(readStoredTheme()));
  // A layout effect, so <html> changes before the browser paints the new state.
  useLayoutEffect(() => applyTheme(theme), [theme]);
  // Until the visitor chooses, follow the browser live (e.g. an OS that turns dark at sunset).
  useEffect(() => {
    if (chosen) return;
    return watchSystemTheme((prefersDark) => setState({ theme: prefersDark ? 'dark' : 'light', chosen: false }));
  }, [chosen]);
  // A choice made (or cleared) in another tab applies here too, without a reload.
  useEffect(() => watchStoredTheme((stored) => setState(fromStored(stored))), []);
  const toggle = () => {
    const next = toggleTheme(theme);
    setState({ theme: next, chosen: true });
    writeStoredTheme(next);
  };
  return { theme, toggle };
}
