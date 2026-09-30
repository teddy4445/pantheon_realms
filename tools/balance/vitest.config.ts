import { defineConfig } from 'vitest/config';

/** Balance measurements run as long "tests" so they share the workspace resolution. */
export default defineConfig({
  test: {
    include: ['tools/balance/**/*.measure.ts'],
    environment: 'node',
    testTimeout: 6 * 60 * 60 * 1000,
    silent: false,
  },
});
