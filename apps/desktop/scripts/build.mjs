// Builds the Electron main + preload bundles and copies the shared client
// build (apps/client/dist) into ./renderer, which is the only directory the
// prgame://app/ protocol handler serves.
import { build } from 'vite';
import { cp, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { optimizeAssets } from './optimize-assets.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

for (const entry of ['main', 'preload']) {
  process.env.PR_DESKTOP_ENTRY = entry;
  await build({ configFile: path.join(root, 'vite.config.mjs'), root, logLevel: 'warn' });
}

const client = path.resolve(root, '../client/dist');
try {
  await stat(path.join(client, 'index.html'));
} catch {
  console.error('apps/client/dist is missing — run `npm run build` at the repository root first.');
  process.exit(1);
}
const renderer = path.join(root, 'renderer');
await rm(renderer, { recursive: true, force: true });
await cp(client, renderer, { recursive: true });
await optimizeAssets(renderer, path.join(root, '.asset-cache'));
console.log('Desktop build ready: dist/main.cjs, dist/preload.cjs, renderer/');
