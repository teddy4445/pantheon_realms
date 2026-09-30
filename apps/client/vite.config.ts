import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

// One client build serves the browser and the Electron renderer (prgame://app/).
// All runtime assets are local: no CDN fonts, decoders or remote files.
export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: fileURLToPath(new URL('../../assets-runtime', import.meta.url)),
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 9000,
    sourcemap: false,
  },
  server: { port: 5173, strictPort: true },
});
