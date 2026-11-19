import { vi } from 'vitest';

// A stand-in for window.matchMedia(query) with a test-only dispatch(matches) that changes
// `matches` and tells the listeners, as the browser does when its preference changes.
export function fakeMatchMedia(initial: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const list = {
    matches: initial,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    }),
    dispatch(matches: boolean) {
      list.matches = matches;
      listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
    },
    listenerCount: () => listeners.size,
  };
  const matchMedia = vi.fn(() => list);
  return Object.assign(matchMedia, { list });
}
