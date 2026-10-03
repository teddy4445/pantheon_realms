import { defineConfig } from 'vitest/config';

/** The 2D sprite content plan runs as a "test" so it shares the workspace resolution (development tool only). */
export default defineConfig({
  test: {
    include: ['tools/assets/sprites/**/*.measure.ts'],
    environment: 'node',
    testTimeout: 300_000,
    silent: false,
  },
});
