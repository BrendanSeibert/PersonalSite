import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeMatchMedia } from '../test/matchMedia';
import { THEME_STORAGE_KEY } from './theme';
import { useTheme } from './useTheme';

afterEach(() => vi.unstubAllGlobals());

function stubBrowser(prefersDark: boolean) {
  const stub = fakeMatchMedia(prefersDark);
  vi.stubGlobal('matchMedia', stub);
  return stub.list;
}

describe('useTheme', () => {
  it('starts dark when the browser prefers dark', () => {
    stubBrowser(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('starts light when the browser prefers light', () => {
    stubBrowser(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('lets a stored light beat a dark browser', () => {
    stubBrowser(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('toggle flips the theme, sets <html> and remembers it', () => {
    stubBrowser(false);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('follows a browser change before any choice', () => {
    const media = stubBrowser(false);
    const { result } = renderHook(() => useTheme());
    act(() => media.dispatch(true));
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    act(() => media.dispatch(false));
    expect(result.current.theme).toBe('light');
  });

  it('ignores a browser change after a toggle', () => {
    const media = stubBrowser(false);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    act(() => media.dispatch(false));
    expect(result.current.theme).toBe('dark');
    expect(media.listenerCount()).toBe(0);
  });

  it('ignores a browser change when a choice was already stored', () => {
    const media = stubBrowser(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const { result } = renderHook(() => useTheme());
    act(() => media.dispatch(true));
    expect(result.current.theme).toBe('light');
  });

  describe('with the site open in another tab', () => {
    const otherTabStores = (newValue: string | null) =>
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue }));
      });

    it('follows a toggle made there, and stops following the browser', () => {
      const media = stubBrowser(false);
      const { result } = renderHook(() => useTheme());
      otherTabStores('dark');
      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
      act(() => media.dispatch(false));
      expect(result.current.theme).toBe('dark');
      expect(media.listenerCount()).toBe(0);
    });

    it('goes back to following the browser when the choice is cleared there', () => {
      const media = stubBrowser(true);
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      const { result } = renderHook(() => useTheme());
      otherTabStores(null);
      expect(result.current.theme).toBe('dark');
      act(() => media.dispatch(false));
      expect(result.current.theme).toBe('light');
    });

    it('stops listening on unmount', () => {
      stubBrowser(false);
      const removed = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useTheme());
      unmount();
      expect(removed).toHaveBeenCalledWith('storage', expect.any(Function));
      removed.mockRestore();
    });
  });

  it('reads storage once on mount', () => {
    stubBrowser(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(getItem.mock.calls.filter(([key]) => key === THEME_STORAGE_KEY)).toHaveLength(1);
    getItem.mockRestore();
  });

  it('removes the browser listener on unmount', () => {
    const media = stubBrowser(false);
    const { unmount } = renderHook(() => useTheme());
    expect(media.listenerCount()).toBe(1);
    unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(media.listenerCount()).toBe(0);
  });
});
