#!/usr/bin/env node
// Import-boundary lint for the monorepo (ARCHITECTURE.md §2).
//
// Each package may import only the packages listed for it. The simulation core
// (rules, content, mapgen, campaign, ai, session) may never import React,
// Babylon, Electron, DOM-only modules or Node built-ins. Relative imports must
// stay inside their own package, with one documented exception (the UI reads
// the committed placeholder asset manifest).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ALLOWED = {
  'packages/rules': [],
  'packages/content': ['@pr/rules'],
  'packages/mapgen': ['@pr/rules'],
  'packages/campaign': ['@pr/rules', '@pr/mapgen'],
  'packages/ai': ['@pr/rules'],
  'packages/session': ['@pr/rules', '@pr/campaign', '@pr/ai'],
  'packages/testing': ['@pr/rules', '@pr/content', '@pr/campaign', '@pr/ai', '@pr/mapgen'],
  'packages/platform': [],
  'packages/presentation': ['@pr/rules', '@pr/mapgen', '@babylonjs/core', '@babylonjs/loaders'],
  'packages/audio': [],
  'packages/ui': ['@pr/rules', '@pr/content', '@pr/session', '@pr/platform', '@pr/presentation', '@pr/audio', '@pr/ai', 'react', 'react-dom', '@fontsource/cinzel', '@fontsource/eb-garamond', '@fontsource/inter'],
  'apps/client': ['@pr/ui', '@pr/platform', 'react', 'react-dom'],
  'apps/desktop': ['electron', 'node:*'],
};

const RELATIVE_EXCEPTIONS = [
  { from: 'packages/ui/src/assets/manifest.ts', to: 'assets-runtime/placeholders/manifest.json' },
  { from: 'packages/ui/src/audio/gameAudio.ts', to: 'assets-runtime/audio/manifest.json' },
];

// Start-up size: the interface may take VALUES only from '@pr/presentation/core' (no
// Babylon). The 3D layer '@pr/presentation' is reached through `import type` or the
// on-demand loader in scene/SceneHost.tsx, so the main menu never waits for the engine.
const LAZY_ONLY = { pkg: 'packages/ui', spec: '@pr/presentation', loader: 'packages/ui/src/scene/SceneHost.tsx' };
const STATIC_VALUE_RE = /^\s*(?:import|export)\s+(?!type\b)[^'";]*?from\s+['"]([^'"]+)['"]/gm;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function packageName(spec) {
  if (spec.startsWith('node:')) return 'node:*';
  if (spec.startsWith('@')) return spec.split('/').slice(0, 2).join('/');
  return spec.split('/')[0];
}

let problems = 0;
for (const [pkg, allowed] of Object.entries(ALLOWED)) {
  const srcDir = path.join(root, pkg, 'src');
  let files;
  try {
    files = walk(srcDir);
  } catch {
    continue;
  }
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = path.relative(root, file).split(path.sep).join('/');
    for (const m of text.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2];
      if (!spec) continue;
      if (spec.startsWith('.')) {
        const target = path.relative(root, path.resolve(path.dirname(file), spec)).split(path.sep).join('/');
        if (!target.startsWith(`${pkg}/`)) {
          const ok = RELATIVE_EXCEPTIONS.some((x) => x.from === rel && target === x.to);
          if (!ok) {
            console.error(`${rel}: relative import leaves the package: ${spec}`);
            problems++;
          }
        }
        continue;
      }
      const name = packageName(spec);
      if (!allowed.includes(name)) {
        console.error(`${rel}: "${spec}" is not an allowed dependency of ${pkg} (allowed: ${allowed.join(', ') || 'none'})`);
        problems++;
      }
    }
    if (pkg === LAZY_ONLY.pkg) {
      for (const m of text.matchAll(STATIC_VALUE_RE)) {
        if (m[1] === LAZY_ONLY.spec) {
          console.error(`${rel}: static value import of "${LAZY_ONLY.spec}" pulls Babylon into start-up — use "import type" or "@pr/presentation/core", and load scenes through ${LAZY_ONLY.loader}`);
          problems++;
        }
      }
      if (rel !== LAZY_ONLY.loader && text.includes(`import('${LAZY_ONLY.spec}')`) && !/typeof import\('@pr\/presentation'\)/.test(text)) {
        console.error(`${rel}: load the 3D layer through ${LAZY_ONLY.loader} (loadPresentation), not a second dynamic import`);
        problems++;
      }
    }
  }
}

if (problems) {
  console.error(`\nBoundary check failed: ${problems} problem(s).`);
  process.exit(1);
}
console.log('Boundary check passed.');
