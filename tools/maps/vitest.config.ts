import { defineConfig } from 'vitest/config';

/** The skirmish-map authoring script runs as a "test" so it shares the workspace resolution (development tool only). */
export default defineConfig({
  test: {
    include: ['tools/maps/**/*.author.ts'],
    environment: 'node',
    testTimeout: 600_000,
    silent: false,
  },
});
