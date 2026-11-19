import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeMatchMedia } from '../test/matchMedia';
import { DARK_QUERY, THEME_STORAGE_KEY } from './theme';
import {
  applyTheme,
  bootstrapTheme,
  initialTheme,
  readStoredTheme,
  systemPrefersDark,
  watchStoredTheme,
  watchSystemTheme,
  writeStoredTheme,
} from './themeStorage';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const blocked = () => {
  throw new Error('blocked');
};

describe('stored theme', () => {
  it('reads null when nothing is stored', () => {
    expect(readStoredTheme()).toBeNull();
  });

  it('round-trips both themes', () => {
    writeStoredTheme('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredTheme()).toBe('dark');
    writeStoredTheme('light');
    expect(readStoredTheme()).toBe('light');
  });

  it('ignores a planted invalid value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, '<img src=x onerror=alert(1)>');
    expect(readStoredTheme()).toBeNull();
  });

  it('reads null, without throwing, when reading storage throws', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    expect(readStoredTheme()).toBeNull();
  });

  it('does not throw when writing storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    expect(() => writeStoredTheme('dark')).not.toThrow();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});

describe('systemPrefersDark', () => {
  it('is false when matchMedia is missing', () => {
    expect(typeof window.matchMedia).not.toBe('function');
    expect(systemPrefersDark()).toBe(false);
  });

  it.each([true, false])('follows matchMedia when it matches %s', (matches) => {
    const stub = fakeMatchMedia(matches);
    vi.stubGlobal('matchMedia', stub);
    expect(systemPrefersDark()).toBe(matches);
    expect(stub).toHaveBeenCalledWith(DARK_QUERY);
  });
});

describe('watchSystemTheme', () => {
  it('returns a harmless function when matchMedia is missing', () => {
    const stop = watchSystemTheme(vi.fn());
    expect(() => stop()).not.toThrow();
  });

  it('calls back on change and stops after unsubscribing', () => {
    const stub = fakeMatchMedia(false);
    vi.stubGlobal('matchMedia', stub);
    const onChange = vi.fn();
    const stop = watchSystemTheme(onChange);
    stub.list.dispatch(true);
    expect(onChange).toHaveBeenLastCalledWith(true);
    stub.list.dispatch(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(onChange).toHaveBeenCalledTimes(2);
    stop();
    stub.list.dispatch(true);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe('watchStoredTheme', () => {
  const fromOtherTab = (key: string | null, newValue: string | null) =>
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));

  it('reports a choice made in another tab, parsed', () => {
    const onChange = vi.fn();
    const stop = watchStoredTheme(onChange);
    fromOtherTab(THEME_STORAGE_KEY, 'dark');
    expect(onChange).toHaveBeenLastCalledWith('dark');
    fromOtherTab(THEME_STORAGE_KEY, '<img onerror=alert(1)>');
    expect(onChange).toHaveBeenLastCalledWith(null);
    stop();
  });

  it('reports no choice when the other tab removes the key or clears storage', () => {
    const onChange = vi.fn();
    const stop = watchStoredTheme(onChange);
    fromOtherTab(THEME_STORAGE_KEY, null);
    expect(onChange).toHaveBeenLastCalledWith(null);
    onChange.mockClear();
    fromOtherTab(null, null);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
    stop();
  });

  it('ignores other keys, and stops after unsubscribing', () => {
    const onChange = vi.fn();
    const stop = watchStoredTheme(onChange);
    fromOtherTab('ex3.favoritesMode', 'dark');
    expect(onChange).not.toHaveBeenCalled();
    stop();
    fromOtherTab(THEME_STORAGE_KEY, 'dark');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('applyTheme', () => {
  afterEach(() => vi.useRealTimers());

  it('turns transitions off while it switches, then back on', () => {
    vi.useFakeTimers();
    const root = document.documentElement;
    let switchingWhileLaidOut: string | undefined;
    vi.spyOn(root, 'offsetWidth', 'get').mockImplementation(() => {
      switchingWhileLaidOut = root.dataset.themeSwitching; // the flush happens with transitions off
      return 0;
    });
    applyTheme('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(switchingWhileLaidOut).toBe('');
    expect(root.dataset.themeSwitching).toBe('');
    vi.runAllTimers();
    expect(root.dataset.themeSwitching).toBeUndefined();
  });

  it('does nothing when the theme is already applied', () => {
    vi.useFakeTimers();
    applyTheme('dark');
    vi.runAllTimers();
    applyTheme('dark');
    expect(document.documentElement.dataset.themeSwitching).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sets data-theme on <html> by default', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('sets it on a given element only', () => {
    const el = document.createElement('div');
    applyTheme('dark', el);
    expect(el.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});

describe('initialTheme', () => {
  it('uses the browser preference with no stored choice', () => {
    vi.stubGlobal('matchMedia', fakeMatchMedia(true));
    expect(initialTheme()).toBe('dark');
  });

  it('prefers a stored choice over the browser', () => {
    vi.stubGlobal('matchMedia', fakeMatchMedia(true));
    writeStoredTheme('light');
    expect(initialTheme()).toBe('light');
  });

  it('is light with no choice and no matchMedia', () => {
    expect(initialTheme()).toBe('light');
  });
});

describe('bootstrapTheme', () => {
  it('applies the initial theme to <html>', () => {
    writeStoredTheme('dark');
    bootstrapTheme();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
