import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetFavorites } from './favoritesFake';
import { server } from './server';

// jsdom has no scrollIntoView. A no-op that tests can spy on.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
// jsdom's scrollTo exists but only logs "Not implemented", so this must be a plain assignment:
// `??=` (as used for scrollIntoView above) would keep jsdom's version.
window.scrollTo = () => {};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup(); // remove rendered components between tests
  server.resetHandlers(); // undo any per-test handler overrides
  resetFavorites(); // the in-memory favorites fake starts empty in every test
  try {
    localStorage.clear(); // the favorites panel remembers its mode there
  } catch {
    // storage blocked: nothing to clear
  }
});
afterAll(() => server.close());
