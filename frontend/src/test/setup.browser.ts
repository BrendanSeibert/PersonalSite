import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { answerFavorites, resetFavorites } from './favoritesFake';

// No MSW here: the Node MSW server cannot run in a browser. Answer the
// favorites endpoints (from the shared in-memory fake), and pass everything else through to the
// real fetch, so Vitest's own traffic is untouched.
const realFetch = window.fetch.bind(window);

beforeEach(() => {
  vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const favorites = answerFavorites(method, url);
    return favorites ? Promise.resolve(favorites) : realFetch(input, init);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetFavorites();
  document.documentElement.style.fontSize = '';
  delete document.documentElement.dataset.theme; // a dark theme must not leak into the next test
  try {
    localStorage.clear(); // the favorites panel and the theme remember their choice there
  } catch {
    // storage blocked: nothing to clear
  }
});
