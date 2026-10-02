import { defineConfig } from 'vitest/config';

/** The icon catalog inventory runs as a "test" so it shares the workspace resolution (development tool only). */
export default defineConfig({
  test: {
    include: ['tools/assets/icon-catalog/**/*.measure.ts'],
    environment: 'node',
    testTimeout: 120_000,
    silent: false,
  },
});
