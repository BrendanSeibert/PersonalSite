import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// No MSW here: the Node MSW server cannot run in a browser. Answer only the health request
// and pass everything else through to the real fetch, so Vitest's own traffic is untouched.
const realFetch = window.fetch.bind(window);

beforeEach(() => {
  vi.spyOn(window, 'fetch').mockImplementation((input, init) =>
    String(input).includes('/api/health')
      ? Promise.resolve(Response.json({ status: 'ok', db: 'up' }))
      : realFetch(input, init),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.fontSize = '';
});
