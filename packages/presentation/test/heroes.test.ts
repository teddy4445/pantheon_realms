/**
 * Mounted adventure-map heroes (ASSET_PIPELINE.md §12): the six copied GLBs, the
 * path-updated manifest, and the animation controller in a headless Babylon
 * scene — exact clip names, loop flags, independent instances, speed-matched
 * Walk, crossfades, Prepare_War once with its completion event, and cancellation.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FreeCamera, Mesh, NullEngine, Scene, TransformNode, Vector3, VertexBuffer } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { loadCatalog } from '@pr/content';
import {
  MAX_WALK_PLAYBACK_RATE,
  MOUNTED_HERO_CLIPS,
  MOUNTED_HERO_SCALE,
  MountedHeroCache,
  heroModelEntriesFromManifest,
  readGlbJson,
  validateHeroEntry,
  validateHeroGlb,
  walkPlaybackRate,
  type MountedHeroModelEntry,
  type MountedHeroRig,
} from '../src';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const HEROES = join(ROOT, 'assets-runtime', 'heroes');
const manifest = JSON.parse(readFileSync(join(HEROES, 'animation_manifest.json'), 'utf8')) as {
  skeleton: { contract: string };
  integration_guide: string;
  assets: { pantheon: string; runtime: string; runtime_sha256: string; clip_names: string[] }[];
};
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];

/** Entries whose URLs are data: URLs of the copied files (no server, no Blender project). */
function entries(): MountedHeroModelEntry[] {
  return heroModelEntriesFromManifest(manifest, (runtime) => `data:model/gltf-binary;base64,${readFileSync(join(HEROES, runtime)).toString('base64')}`);
}

/** Entries as the game builds them (packages/ui/src/assets/manifest.ts). */
function gameEntries(): MountedHeroModelEntry[] {
  return heroModelEntriesFromManifest(manifest, (runtime) => `./heroes/${runtime}`);
}

function headlessScene(): { engine: NullEngine; scene: Scene } {
  const engine = new NullEngine();
  const scene = new Scene(engine); // left-handed, like the adventure map
  scene.useConstantAnimationDeltaTime = true;
  new FreeCamera('cam', new Vector3(0, 5, -10), scene);
  return { engine, scene };
}

/** Advance Babylon animations by `ms` in 16 ms frames, updating the crossfades as the map tick does. */
function run(scene: Scene, rigs: readonly MountedHeroRig[], ms: number): void {
  for (let t = 0; t < ms; t += 16) {
    scene.render();
    for (const r of rigs) r.update(16);
  }
}

describe('mounted hero assets', () => {
  it('six pantheon GLBs are copied into the game with matching checksums and paths', () => {
    const catalog = loadCatalog();
    expect(manifest.assets.map((a) => a.pantheon).sort()).toEqual([...PANTHEONS].sort());
    for (const p of PANTHEONS) expect(catalog.pantheons[p], p).toBeDefined();
    for (const a of manifest.assets) {
      expect(a.runtime).toBe(`${a.pantheon}/hero_${a.pantheon}.glb`);
      const bytes = readFileSync(join(HEROES, a.runtime));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.runtime_sha256);
    }
    expect(existsSync(join(HEROES, manifest.skeleton.contract))).toBe(true);
    expect(existsSync(join(HEROES, manifest.integration_guide))).toBe(true);
    // The game copy never points back to the Blender project at runtime.
    expect(JSON.stringify(manifest.assets.map((a) => a.runtime))).not.toMatch(/blannder|runtime\/models|[A-Z]:\\/);
  });

  it('every GLB carries the three exact clips, a skin and no CDN-only extension; loop policy comes from the manifest', () => {
    for (const e of gameEntries()) {
      expect(validateHeroEntry(e)).toEqual([]);
      expect(e.url).toBe(`./heroes/${e.pantheonId}/hero_${e.pantheonId}.glb`);
      const a = manifest.assets.find((x) => x.pantheon === e.pantheonId)!;
      const json = readGlbJson(new Uint8Array(readFileSync(join(HEROES, a.runtime))));
      expect(validateHeroGlb(json as Parameters<typeof validateHeroGlb>[0], e)).toEqual([]);
      expect(e.clips.idle).toMatchObject({ name: 'Idle_Standing', durationSeconds: 4, loop: true });
      expect(e.clips.walk).toMatchObject({ name: 'Walk', durationSeconds: 1.6, loop: true });
      expect(e.clips.prepare).toMatchObject({ name: 'Prepare_War', durationSeconds: 2.4, loop: false, holdLastPose: true });
      expect(e.walkReferenceSpeed).toBe(0.75);
      expect(e.crossfadeSeconds).toBe(0.2);
    }
    expect(Object.values(MOUNTED_HERO_CLIPS)).toEqual(['Idle_Standing', 'Walk', 'Prepare_War']);
  });

  it('walk playback rate follows speed / (0.75 × scale)', () => {
    expect(walkPlaybackRate(0.75, 0.75, 1)).toBeCloseTo(1, 6);
    expect(walkPlaybackRate(1.5, 0.75, 1)).toBeCloseTo(2, 6);
    expect(walkPlaybackRate(0.75 * 0.36, 0.75, 0.36)).toBeCloseTo(1, 6);
    expect(walkPlaybackRate(0, 0.75, 0.36)).toBe(0);
  });
});

describe('mounted hero controller (headless Babylon, left-handed map scene)', () => {
  it('instances are independent; idle loops; walk crossfades at the matching rate and returns to idle', async () => {
    const { engine, scene } = headlessScene();
    const all = entries();
    const greek = all.find((e) => e.pantheonId === 'greek')!;
    const norse = all.find((e) => e.pantheonId === 'norse')!;
    const cache = new MountedHeroCache(scene);
    const [a, b, c] = await Promise.all([cache.instantiate(greek), cache.instantiate(greek), cache.instantiate(norse)]);
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok) return;
    const rigs = [a.rig, b.rig, c.rig];
    // Each instance has its own animation groups and skeleton.
    const groups = scene.animationGroups.filter((g) => g.name.endsWith(':Walk') || g.name === 'Walk');
    expect(new Set(groups).size).toBeGreaterThanOrEqual(3);
    expect(new Set(scene.skeletons).size).toBeGreaterThanOrEqual(3);
    for (const r of rigs) expect(r.debug().playing).toEqual(['Idle_Standing']);

    // Orientation and scale at the container: +Z front → local +X; metres × scale.
    const entity = new TransformNode('entity', scene);
    a.rig.root.parent = entity;
    entity.computeWorldMatrix(true);
    const head = scene.transformNodes.find((n) => n.name.startsWith('hero-greek#1:') && n.name.endsWith(':mount_head'))!;
    expect(head).toBeDefined();
    head.computeWorldMatrix(true);
    const p = head.getAbsolutePosition();
    expect(p.x).toBeGreaterThan(0.3 * MOUNTED_HERO_SCALE);
    expect(Math.abs(p.z)).toBeLessThan(0.15);
    expect(p.y).toBeGreaterThan(1.5 * MOUNTED_HERO_SCALE);

    // Walk on one hero only.
    a.rig.setMoving(0.75 * MOUNTED_HERO_SCALE * 2); // exactly 2× the authored speed
    run(scene, rigs, 100);
    expect(a.rig.debug().weights.walk).toBeGreaterThan(0);
    expect(a.rig.debug().weights.idle).toBeGreaterThan(0); // mid-crossfade
    run(scene, rigs, 200);
    expect(a.rig.debug()).toMatchObject({ clip: 'Walk', playbackRate: 2, formulaRate: 2, playing: ['Walk'] });
    expect(b.rig.debug()).toMatchObject({ clip: 'Idle_Standing', playing: ['Idle_Standing'] });
    expect(c.rig.debug()).toMatchObject({ clip: 'Idle_Standing', playing: ['Idle_Standing'] });
    // The map's fast pace asks for far more than a readable walk: the rate is capped.
    a.rig.setMoving(8.25);
    expect(a.rig.debug().formulaRate).toBeGreaterThan(20);
    expect(a.rig.debug().playbackRate).toBe(MAX_WALK_PLAYBACK_RATE);
    // Stopping returns to idle.
    a.rig.setMoving(0);
    run(scene, rigs, 300);
    expect(a.rig.debug()).toMatchObject({ clip: 'Idle_Standing', playing: ['Idle_Standing'] });
    expect(a.rig.debug().weights).toMatchObject({ idle: 1, walk: 0 });
    cache.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('all six load with their own skeleton, skin, materials and vertex colours, at one consistent scale', async () => {
    const { engine, scene } = headlessScene();
    const cache = new MountedHeroCache(scene);
    const heights: Record<string, number> = {};
    for (const e of entries()) {
      const a = manifest.assets.find((x) => x.pantheon === e.pantheonId)!;
      const json = readGlbJson(new Uint8Array(readFileSync(join(HEROES, a.runtime)))) as { meshes?: { primitives: { attributes: Record<string, number> }[] }[] };
      const glbHasColors = (json.meshes ?? []).some((m) => m.primitives.some((p) => 'COLOR_0' in p.attributes));
      const [x, y] = await Promise.all([cache.instantiate(e), cache.instantiate(e)]);
      if (!x.ok || !y.ok) throw new Error(`${e.pantheonId} failed to load`);
      for (const r of [x.rig, y.rig]) {
        const geo = r.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0);
        expect(geo.length, e.pantheonId).toBeGreaterThan(0);
        for (const m of geo) expect(m.material, `${e.pantheonId} ${m.name}`).not.toBeNull();
        const skinned = geo.filter((m) => m.skeleton);
        expect(skinned.length, `${e.pantheonId} skinned meshes`).toBeGreaterThan(0);
        for (const m of skinned) {
          expect(m.isVerticesDataPresent(VertexBuffer.MatricesIndicesKind)).toBe(true);
          expect(m.isVerticesDataPresent(VertexBuffer.MatricesWeightsKind)).toBe(true);
        }
        if (glbHasColors) expect(geo.some((m) => m.isVerticesDataPresent(VertexBuffer.ColorKind)), `${e.pantheonId} vertex colours`).toBe(true);
      }
      // The two instances never share a skeleton (independent animation state).
      const skX = new Set(x.rig.meshes.map((m) => m.skeleton).filter(Boolean));
      for (const m of y.rig.meshes) if (m.skeleton) expect(skX.has(m.skeleton)).toBe(false);
      x.rig.root.computeWorldMatrix(true);
      let top = -Infinity;
      let bottom = Infinity;
      for (const m of x.rig.meshes) {
        m.computeWorldMatrix(true);
        const bb = m.getBoundingInfo().boundingBox;
        top = Math.max(top, bb.maximumWorld.y);
        bottom = Math.min(bottom, bb.minimumWorld.y);
      }
      heights[e.pantheonId] = top - bottom;
      expect(bottom, `${e.pantheonId} stands on the ground`).toBeGreaterThan(-0.05);
    }
    // One uniform scale for all six: similar rider-and-mount heights in world units.
    const hs = Object.values(heights);
    expect(hs).toHaveLength(6);
    expect(Math.max(...hs) / Math.min(...hs)).toBeLessThan(1.6);
    for (const h of hs) expect(h).toBeGreaterThan(0.4);
    cache.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('Prepare_War plays once, resolves from its finished event exactly once and holds the ready pose; cancelling ignores the completion', async () => {
    const { engine, scene } = headlessScene();
    const greek = entries().find((e) => e.pantheonId === 'greek')!;
    const cache = new MountedHeroCache(scene);
    const [a, b] = await Promise.all([cache.instantiate(greek), cache.instantiate(greek)]);
    if (!a.ok || !b.ok) throw new Error('load failed');
    const rigs = [a.rig, b.rig];
    let done = 0;
    let outcome: string | null = null;
    void a.rig.prepareWar(1).then((o) => {
      done += 1;
      outcome = o;
    });
    run(scene, rigs, 1000);
    expect(a.rig.debug()).toMatchObject({ clip: 'Prepare_War', prepareStarted: 1, prepareFinished: 0 });
    expect(b.rig.debug().clip).toBe('Idle_Standing'); // the other hero is untouched
    expect(done).toBe(0); // no fixed timer: still playing at 1 s
    run(scene, rigs, 1600); // past the 2.4 s clip
    await Promise.resolve();
    expect(outcome).toBe('finished');
    expect(done).toBe(1);
    expect(a.rig.debug()).toMatchObject({ clip: 'Prepare_War', prepareFinished: 1, holdingReadyPose: true });
    run(scene, rigs, 3000); // holding: the completion never fires again
    await Promise.resolve();
    expect(done).toBe(1);
    expect(a.rig.debug().prepareFinished).toBe(1);

    // Cancelled encounter: the pending completion is ignored and the hero blends back to idle.
    let bOutcome: string | null = null;
    void b.rig.prepareWar(1).then((o) => (bOutcome = o));
    run(scene, rigs, 800);
    b.rig.cancelPrepare();
    await Promise.resolve();
    expect(bOutcome).toBe('cancelled');
    run(scene, rigs, 3000);
    await Promise.resolve();
    expect(b.rig.debug()).toMatchObject({ clip: 'Idle_Standing', prepareFinished: 0, prepareCancelled: 1, holdingReadyPose: false, playing: ['Idle_Standing'] });
    expect(b.rig.debug().weights).toMatchObject({ idle: 1, prepare: 0 });
    cache.dispose();
    scene.dispose();
    engine.dispose();
  });
});
