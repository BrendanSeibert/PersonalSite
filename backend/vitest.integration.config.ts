import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    // The files share one database, and some reset or reshape its tables: run them one at a time.
    fileParallelism: false,
  },
});
