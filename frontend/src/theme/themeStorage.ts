import { DARK_QUERY, parseTheme, resolveTheme, THEME_STORAGE_KEY, type Theme } from './theme';

// The browser's edges for the theme. Each one is safe when storage is blocked or matchMedia is
// missing: it falls back to "no choice" or light instead of throwing.

export function readStoredTheme(): Theme | null {
  try {
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // not remembered, but the switch still works for this visit
  }
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

// Calls back when the browser's preference changes. Returns the function that stops listening.
export function watchSystemTheme(onChange: (prefersDark: boolean) => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

// Calls back when another tab changes or clears the stored choice (the `storage` event never fires
// in the tab that wrote it). The value is parsed like any other read: null means "no choice".
export function watchStoredTheme(onChange: (stored: Theme | null) => void): () => void {
  const listener = (event: StorageEvent) => {
    // key is null when the other tab called localStorage.clear()
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    onChange(event.key === null ? null : parseTheme(event.newValue));
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

// dataset sets a plain attribute value; it is never parsed as HTML.
// The switch is atomic: while data-theme-switching is set, AppLayout.scss turns transitions off, and
// reading offsetWidth makes the browser compute the new colours right then, with nothing fading.
// Removing the attribute later starts no transition, because no colour changes at that point.
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (root.dataset.theme === theme) return;
  root.dataset.themeSwitching = '';
  root.dataset.theme = theme;
  void root.offsetWidth;
  setTimeout(() => delete root.dataset.themeSwitching, 0);
}

export const initialTheme = (): Theme => resolveTheme(readStoredTheme(), systemPrefersDark());

// Run once before React renders (startApp.tsx), so the first paint is already in the right colours.
export const bootstrapTheme = (): void => applyTheme(initialTheme());
