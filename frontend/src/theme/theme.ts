export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'ex3.theme'; // same 'ex3.' prefix as ex3.favoritesMode
export const DARK_QUERY = '(prefers-color-scheme: dark)';

// Anything that is not exactly 'light' or 'dark' (null, '', 'DARK', '<img onerror…>') is no choice.
export const parseTheme = (value: unknown): Theme | null =>
  value === 'light' || value === 'dark' ? value : null;

// A remembered choice wins; otherwise the browser's preference decides.
export const resolveTheme = (stored: Theme | null, prefersDark: boolean): Theme =>
  stored ?? (prefersDark ? 'dark' : 'light');

export const toggleTheme = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark');
