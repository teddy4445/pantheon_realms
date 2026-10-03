import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
// PR_FEW_CHUNKS=1: put all of PixiJS (still loaded on demand, after the menu) into one
// chunk instead of several, for static hosts that limit the number of files per site.
const fewChunks = !!process.env.PR_FEW_CHUNKS;

// One client build serves the browser and the Electron renderer (prgame://app/).
// All runtime assets are local: no CDN fonts, decoders or remote files.
export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: fileURLToPath(new URL('../../assets-runtime', import.meta.url)),
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: process.env.PR_OUT_DIR || 'dist',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 9000,
    sourcemap: false,
    // The preload helper gets its own group so the start-up chunk never has to import the
    // renderer chunk to reach it (groups pull in their dependencies by default).
    ...(fewChunks
      ? {
          rollupOptions: {
            output: {
              advancedChunks: {
                groups: [
                  { name: 'preload', test: /preload-helper/, priority: 2 },
                  { name: 'pixi', test: /node_modules[\\/]pixi\.js[\\/]/, priority: 1 },
                ],
              },
            },
          },
        }
      : {}),
  },
  server: { port: 5173, strictPort: true },
});
