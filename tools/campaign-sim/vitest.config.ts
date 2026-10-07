import { defineConfig } from 'vitest/config';

/** Campaign simulations run as long "tests" so they share the workspace resolution. */
export default defineConfig({
  test: {
    include: ['tools/campaign-sim/**/*.measure.ts'],
    environment: 'node',
    testTimeout: 12 * 60 * 60 * 1000,
    silent: false,
  },
});
