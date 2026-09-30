#!/usr/bin/env node
/**
 * Validate every unit model under assets-runtime/units (QA-31).
 *
 *   npm run assets:check          # this script + the game-binding tests
 *   node tools/assets/validate-units.mjs [--no-write]
 *
 * For each family.manifest.json and each form it references:
 *   - manifest shape: schema, IDs, .glb path, required semantic clips, loop policy
 *   - GLB container and JSON: glTF 2.0, every bound clip and socket present,
 *     no extensions whose decoders Babylon would fetch from a CDN
 *   - the Khronos glTF Validator (format, references, buffers, animations)
 * and writes <form>.validation.json next to the manifest with the tool versions.
 *
 * Game-side checks that need the content catalog (creature/form binding, ranged
 * and flight requirements) and a headless Babylon load run in
 * packages/presentation/test/models.test.ts.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const validator = require('gltf-validator');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const UNITS = join(ROOT, 'assets-runtime', 'units');
const WRITE = !process.argv.includes('--no-write');

const REQUIRED = ['idle', 'move', 'melee', 'defend', 'hit', 'defeat', 'victory'];
const ONCE = ['melee', 'ranged', 'hit', 'defeat', 'victory'];
const FORBIDDEN = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_meshopt_compression', 'KHR_texture_basisu'];
const STATES = ['briefed', 'concept_approved', 'modeled', 'rigged', 'animated', 'exported', 'integrated', 'verified'];

function findManifests(dir) {
  const out = [];
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const n of names) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...findManifests(p));
    else if (n === 'family.manifest.json') out.push(p);
  }
  return out;
}

function glbJson(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
  if (view.getUint32(4, true) !== 2) throw new Error('GLB version must be 2');
  const len = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a) throw new Error('first chunk is not JSON');
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + len)));
}

let failures = 0;
const manifests = findManifests(UNITS);
if (manifests.length === 0) console.log('No unit manifests found under assets-runtime/units.');
for (const file of manifests) {
  const rel = relative(ROOT, file);
  let family;
  try {
    family = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`✗ ${rel}: invalid JSON (${e.message})`);
    failures++;
    continue;
  }
  const issues = [];
  if (family.schema !== 'pantheon-realms-unit-family' || family.schemaVersion !== 1) issues.push('schema must be pantheon-realms-unit-family v1');
  if (!family.familyId) issues.push('familyId missing');
  for (const formKey of ['base', 'upgraded']) {
    const m = family.forms?.[formKey];
    if (!m) continue;
    const fi = [];
    if (m.form !== formKey) fi.push(`form must be "${formKey}"`);
    if (!STATES.includes(m.status)) fi.push(`status "${m.status}" is not an asset state`);
    if (!/\.glb$/i.test(m.model ?? '')) fi.push('model must be a .glb path relative to the manifest');
    for (const s of REQUIRED) if (!m.clips?.[s]) fi.push(`missing required "${s}" clip binding`);
    for (const s of ONCE) if (m.clips?.[s]?.loop) fi.push(`${s} must not loop`);
    if (m.clips?.idle && !m.clips.idle.loop) fi.push('idle must loop');
    if (!(m.scale > 0)) fi.push('scale must be positive');
    let report = null;
    try {
      const bytes = new Uint8Array(readFileSync(join(dirname(file), m.model)));
      const json = glbJson(bytes);
      const used = new Set([...(json.extensionsUsed ?? []), ...(json.extensionsRequired ?? [])]);
      for (const x of FORBIDDEN) if (used.has(x)) fi.push(`uses ${x} (decoder would come from a CDN)`);
      const clips = new Set((json.animations ?? []).map((a) => a.name));
      for (const [k, b] of Object.entries(m.clips ?? {})) if (!clips.has(b.name)) fi.push(`clip "${b.name}" (${k}) not in GLB`);
      const nodes = new Set((json.nodes ?? []).map((n) => n.name));
      for (const [k, n] of Object.entries(m.sockets ?? {})) if (!nodes.has(n)) fi.push(`socket ${k} → node "${n}" not in GLB`);
      const result = await validator.validateBytes(bytes, { uri: m.model, maxIssues: 200 });
      if (result.issues.numErrors > 0) fi.push(`Khronos validator: ${result.issues.numErrors} error(s)`);
      report = {
        assetId: m.assetId,
        model: m.model,
        validatedWith: { tool: 'gltf-validator', version: validator.version() },
        generator: json.asset?.generator ?? null,
        issues: result.issues,
        info: result.info,
        gameChecks: fi,
      };
    } catch (e) {
      fi.push(`cannot read model: ${e.message}`);
    }
    if (report && WRITE) writeFileSync(join(dirname(file), `${formKey}.validation.json`), `${JSON.stringify(report, null, 2)}\n`);
    for (const i of fi) issues.push(`${formKey}: ${i}`);
  }
  if (issues.length) {
    failures++;
    console.error(`✗ ${rel}`);
    for (const i of issues) console.error(`    ${i}`);
  } else console.log(`✓ ${rel}`);
}
if (failures) {
  console.error(`${failures} manifest(s) failed.`);
  process.exit(1);
}
