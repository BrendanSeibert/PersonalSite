import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { configDefaults, coverageConfigDefaults, defineConfig } from 'vitest/config';

const browserTests = 'src/**/*.browser.test.{ts,tsx}';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on all interfaces (needed inside Docker)
    port: 5173,
    watch: { usePolling: true }, // file change notifications don't cross from Windows into Docker
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        ...coverageConfigDefaults.exclude, // keep Vitest's built-in list
        'src/**/*.test.{ts,tsx}', // test files are not code under test
        'src/**/*.d.ts', // type declarations contain no runnable code
        'src/main.tsx',
        'src/test/**',
      ],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'], // jest-dom matchers; start/stop/reset the MSW server
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, browserTests],
          // Vitest replaces every style import with an empty string by default, `?raw` included.
          // Let the raw SCSS source through so styleConventions.test.ts can read it.
          css: { include: [/\.scss\?raw$/] },
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: [browserTests],
          setupFiles: ['./src/test/setup.browser.ts'],
          css: true, // compile and apply the real SCSS
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }] },
        },
      },
    ],
  },
});
