import { defineConfig } from 'vitest/config';

/** Campaign v2 development tools run as "tests" so they share the workspace resolution. */
export default defineConfig({
  test: {
    include: ['tools/campaign-v2/**/*.measure.ts'],
    environment: 'node',
    testTimeout: 60 * 60 * 1000,
    silent: false,
  },
});
