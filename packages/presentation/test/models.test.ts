/**
 * Unit model pipeline (QA-31/QA-32): manifests, GLB checks and a headless load
 * of the axis/scale calibration fixture in a right-handed Babylon scene.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LoadAssetContainerAsync, NullEngine, Scene, Vector3 } from '@babylonjs/core';
// The game fetches the glTF loader on demand (ModelCache); this direct Babylon load needs it registered.
import '@babylonjs/loaders/glTF';
import { loadCatalog } from '@pr/content';
import { findAbility, hasFlight, isShooter } from '@pr/rules';
import {
  DEFAULT_CLIP_NAMES,
  ModelCache,
  SEMANTIC_STATES,
  TweenPlayer,
  readGlbJson,
  validateFormManifest,
  validateGlbAgainstManifest,
  type UnitFamilyManifest,
} from '../src';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const UNITS = join(ROOT, 'assets-runtime', 'units');

function manifests(dir = UNITS): { path: string; family: UnitFamilyManifest }[] {
  const out: { path: string; family: UnitFamilyManifest }[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...manifests(p));
    else if (name === 'family.manifest.json') out.push({ path: p, family: JSON.parse(readFileSync(p, 'utf8')) as UnitFamilyManifest });
  }
  return out;
}

describe('unit model manifests', () => {
  const catalog = loadCatalog();
  const all = manifests();

  it('includes the calibration fixture', () => {
    expect(all.some((m) => m.family.familyId === '_calibration')).toBe(true);
  });

  it('every manifest is well-formed, bound to a real creature form and matches its GLB', () => {
    for (const { path, family } of all) {
      expect(family.schema).toBe('pantheon-realms-unit-family');
      for (const form of [family.forms.base, family.forms.upgraded]) {
        if (!form) continue;
        const fixture = family.familyId.startsWith('_');
        const def = catalog.creatures[form.creatureId];
        if (!fixture) {
          expect(def, `${form.assetId} → ${form.creatureId}`).toBeDefined();
          expect(def!.form).toBe(form.form);
          expect(def!.familyId).toBe(family.familyId);
        }
        const req = def
          ? { ranged: isShooter(catalog, def.id), flying: hasFlight(catalog, def.id) }
          : { ranged: true, flying: false };
        expect(validateFormManifest(form, req)).toEqual([]);
        const bytes = new Uint8Array(readFileSync(join(dirname(path), form.model)));
        expect(validateGlbAgainstManifest(readGlbJson(bytes), form)).toEqual([]);
      }
    }
    void findAbility;
  });

  it('rejects CDN-only compression and missing clips', () => {
    const form = all.find((m) => m.family.familyId === '_calibration')!.family.forms.base!;
    const issues = validateGlbAgainstManifest(
      { asset: { version: '2.0' }, extensionsUsed: ['KHR_draco_mesh_compression'], animations: [{ name: 'idle_a' }], nodes: [], scenes: [{}] },
      form,
    );
    expect(issues.some((i) => i.includes('KHR_draco_mesh_compression'))).toBe(true);
    expect(issues.some((i) => i.includes('attack_melee_a'))).toBe(true);
    expect(validateFormManifest({ ...form, clips: { ...form.clips, defeat: { name: 'defeat', loop: true } } }, { ranged: false, flying: false })).toContain(`${form.assetId}: defeat must not loop`);
  });
});

describe('calibration GLB in a right-handed scene (QA-32)', () => {
  const file = join(UNITS, '_calibration', 'forward_arrow', 'model.glb');
  const bytes = new Uint8Array(readFileSync(file));

  it('loads with meters, Y-up, +Z front and the eight named clips, none auto-playing', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    const c = await LoadAssetContainerAsync(bytes, scene, { pluginExtension: '.glb', pluginOptions: { gltf: { animationStartMode: 0 } } });
    c.addAllToScene();
    const names = c.animationGroups.map((g) => g.name).sort();
    expect(names).toEqual(Object.values(DEFAULT_CLIP_NAMES).sort());
    expect(c.animationGroups.some((g) => g.isPlaying)).toBe(false);
    const byName = (n: string) => c.meshes.find((m) => m.name === n)!;
    for (const m of c.meshes) m.computeWorldMatrix(true);
    const post = byName('post').getBoundingInfo().boundingBox;
    expect(post.maximumWorld.y).toBeCloseTo(1.8, 3); // meters, Y-up
    expect(post.minimumWorld.y).toBeCloseTo(0, 3); // root at the ground anchor
    const head = byName('arrow_head').getBoundingInfo().boundingBox;
    expect(head.maximumWorld.z).toBeCloseTo(1.05, 3); // front = +Z, no conversion flip
    const left = byName('left_marker').getBoundingInfo().boundingBox;
    expect(left.minimumWorld.x).toBeGreaterThan(0.25); // +X side preserved (no mirroring)
    // No negative-scale conversion root in a right-handed scene.
    const root = c.meshes.find((m) => m.name === '__root__');
    if (root) expect(root.scaling.z).toBeGreaterThan(0);
    scene.dispose();
    engine.dispose();
  });

  it('ModelCache instantiates independent rigs that play clips by semantic state', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    const family = JSON.parse(readFileSync(join(UNITS, '_calibration', 'forward_arrow', 'family.manifest.json'), 'utf8')) as UnitFamilyManifest;
    const entry = { manifest: family.forms.base!, url: `data:model/gltf-binary;base64,${Buffer.from(bytes).toString('base64')}` };
    const cache = new ModelCache(scene);
    const a = await cache.instantiate(entry);
    const b = await cache.instantiate(entry);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    for (const s of SEMANTIC_STATES) expect(a.rig.has(s)).toBe(true);
    expect(a.rig.duration('idle')).toBeCloseTo(3, 1);
    expect(a.rig.height).toBeGreaterThan(1.7);
    // Model +Z front is turned to the figure's local +X (forward) by the wrapper.
    const tip = scene.meshes.filter((m) => m.name.endsWith(':arrow_head'))[0]!;
    tip.computeWorldMatrix(true);
    expect(tip.getBoundingInfo().boundingBox.maximumWorld.x).toBeCloseTo(1.05, 2);
    // Instant playback (speed 0) resolves at once; defeat holds its end pose.
    const tw = new TweenPlayer();
    tw.speed = 0;
    await a.rig.playOnce('melee', tw);
    await a.rig.playOnce('defeat', tw);
    a.rig.loop('idle');
    expect(scene.animationGroups.filter((g) => g.isPlaying).length).toBe(1);
    // A missing model reports a reason instead of throwing (the proxy stays).
    const bad = await cache.instantiate({ manifest: entry.manifest, url: 'data:model/gltf-binary;base64,AAAA' });
    expect(bad.ok).toBe(false);
    void Vector3;
    cache.dispose();
    scene.dispose();
    engine.dispose();
  });
});
