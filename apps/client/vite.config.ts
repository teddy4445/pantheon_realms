import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
// PR_FEW_CHUNKS=1: put all of PixiJS (still loaded on demand, after the menu) into one
// chunk instead of several, for static hosts that limit the number of files per site.
const fewChunks = !!process.env.PR_FEW_CHUNKS;

/**
 * The 1.1.0 pre-game manifests (frontend-v1.1.0, frontend-kit-v1.1.0) are delivered with the
 * delivery machine's absolute paths as provenance (`sourceAbsolute`, `runtimeAbsolute`, …); the
 * encounter, adventure and hero-portrait manifests are covered too, should a later delivery add them.
 * The game reads only `file`; when the screens import those manifests, every value that is a local
 * disk path is dropped so no such path is bundled into the code. The delivered files stay
 * byte-identical.
 */
function dropDiskPaths(): Plugin {
  const target = /assets-runtime[\\/]((frontend|frontend-kit|encounters|adventure-gui)-v1\.1\.0|hero-portraits-complete)[\\/]manifest\.json$/;
  const isDiskPath = (v: unknown) => typeof v === 'string' && /^[a-z]:[\\/]|^\\\\|^\/(home|Users)\//i.test(v);
  const strip = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => !isDiskPath(x)).map(([k, x]) => [k, strip(x)]));
    return v;
  };
  return {
    name: 'pr-drop-disk-paths',
    enforce: 'pre',
    transform(code, id) {
      if (!target.test(id.split('?')[0]!)) return null;
      return { code: JSON.stringify(strip(JSON.parse(code))), map: null };
    },
  };
}

/**
 * The same provenance paths also sit in the delivered JSON files that `publicDir` copies into the
 * build (manifests, `complete-assets.json`, `dependencies.json`). No screen reads those fields, but
 * the copies ship in the installer, so after the build each copied JSON file that holds a local disk
 * path is rewritten without those values. Only the build output changes; `assets-runtime/` keeps the
 * delivered bytes.
 */
function dropDiskPathsFromCopies(): Plugin {
  const isDiskPath = (v: unknown) => typeof v === 'string' && /^[a-z]:[\\/]|^\\\\|^\/(home|Users)\//i.test(v);
  const strip = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => !isDiskPath(x)).map(([k, x]) => [k, strip(x)]));
    return v;
  };
  const quick = /"(?:[a-z]:\\\\|\\\\\\\\|\/(?:home|Users)\/)/i;
  let outDir = '';
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      return e.name.endsWith('.json') ? [p] : [];
    });
  return {
    name: 'pr-drop-disk-paths-from-copies',
    apply: 'build',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      if (!outDir) return;
      for (const file of walk(outDir)) {
        const text = readFileSync(file, 'utf8');
        if (!quick.test(text)) continue;
        writeFileSync(file, `${JSON.stringify(strip(JSON.parse(text)), null, 2)}\n`);
      }
    },
  };
}

// One client build serves the browser and the Electron renderer (prgame://app/).
// All runtime assets are local: no CDN fonts, decoders or remote files.
export default defineConfig({
  base: './',
  plugins: [dropDiskPaths(), dropDiskPathsFromCopies(), react()],
  publicDir: fileURLToPath(new URL('../../assets-runtime', import.meta.url)),
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: process.env.PR_OUT_DIR || 'dist',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 9000,
    sourcemap: false,
    // PR_NO_MINIFY=1: readable function names for CPU profiles (tests/perf); never for a release.
    ...(process.env.PR_NO_MINIFY ? { minify: false } : {}),
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
