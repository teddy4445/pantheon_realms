// Builds the Electron main and preload scripts as CommonJS bundles.
import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

const entry = process.env.PR_DESKTOP_ENTRY ?? 'main';
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'node22',
    minify: false,
    sourcemap: false,
    lib: { entry: `src/${entry}.ts`, formats: ['cjs'], fileName: () => `${entry}.cjs` },
    rollupOptions: { external: ['electron', ...builtinModules, ...builtinModules.map((m) => `node:${m}`)] },
  },
});
