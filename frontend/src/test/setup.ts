import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server';

// jsdom has no scrollIntoView. A no-op that tests can spy on.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup(); // remove rendered components between tests
  server.resetHandlers(); // undo any per-test handler overrides
});
afterAll(() => server.close());
