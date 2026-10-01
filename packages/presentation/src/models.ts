/**
 * Unit model pipeline: GLB creature models bound to creature IDs through unit
 * manifests (production/02 §7), with the procedural proxies as the fallback.
 *
 * Conventions (production/02 §5, see ASSET_PIPELINE.md): meters, Y-up,
 * right-handed scene, model front = +Z, root at the ground anchor. Scenes that
 * load models set `useRightHandedSystem` before loading, so Babylon imports
 * glTF without a conversion root. A model's +Z front is turned to the proxy
 * convention (local +X = forward) by the rig wrapper.
 *
 * Nothing here decides rules. Missing or broken assets fall back to the proxy
 * and report why; they are never silently presented as finished art.
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { Scene } from '@babylonjs/core/scene';
import type { TweenPlayer } from './tween';
import { linear } from './tween';
import { readGlbJson, validateGlbAgainstManifest, type ClipBinding, type ClipKey, type UnitFormManifest, type UnitModelEntry } from './modelRegistry';

export * from './modelRegistry';

/** The glTF loader is fetched only when a scene first loads a model (no model, no loader code). */
let gltfLoader: Promise<unknown> | null = null;
function loadGltfLoader(): Promise<unknown> {
  gltfLoader ??= Promise.all([import('@babylonjs/loaders/glTF/glTFFileLoader'), import('@babylonjs/loaders/glTF/2.0')]);
  return gltfLoader;
}

// ---------------------------------------------------------------------------
// Runtime loading and playback
// ---------------------------------------------------------------------------

/** One placed model: its wrapper root, meshes and semantic clips. */
export class ModelRig {
  readonly root: TransformNode;
  readonly meshes: AbstractMesh[];
  readonly height: number;
  private readonly clips = new Map<ClipKey, { group: AnimationGroup; binding: ClipBinding }>();
  private current: AnimationGroup | null = null;

  constructor(root: TransformNode, meshes: AbstractMesh[], groups: readonly AnimationGroup[], manifest: UnitFormManifest) {
    this.root = root;
    this.meshes = meshes;
    for (const g of groups) g.stop();
    for (const [key, binding] of Object.entries(manifest.clips) as [ClipKey, ClipBinding][]) {
      const group = groups.find((g) => g.name === binding.name || g.name.endsWith(`:${binding.name}`));
      if (group) this.clips.set(key, { group, binding });
    }
    let top = 0;
    for (const m of meshes) {
      m.computeWorldMatrix(true);
      top = Math.max(top, m.getBoundingInfo().boundingBox.maximumWorld.y);
    }
    this.height = Math.max(0.2, top - root.getAbsolutePosition().y);
  }

  has(key: ClipKey): boolean {
    return this.clips.has(key);
  }

  /** Seconds of the bound clip (0 when missing). */
  duration(key: ClipKey): number {
    const c = this.clips.get(key);
    if (!c) return 0;
    const fps = c.group.targetedAnimations[0]?.animation.framePerSecond ?? 60;
    return Math.max(0, (c.group.to - c.group.from) / fps);
  }

  /** Start a looping clip (idle, move, fly, guard). */
  loop(key: ClipKey, speedRatio = 1): void {
    const c = this.clips.get(key);
    if (!c) return;
    if (this.current === c.group && c.group.isPlaying) return;
    this.current?.stop();
    c.group.start(true, speedRatio, c.group.from, c.group.to);
    this.current = c.group;
  }

  /**
   * Play a clip once, timed by the shared TweenPlayer so 2×, Instant and Skip
   * behave exactly like procedural playback. Defeat holds its last pose.
   */
  async playOnce(key: ClipKey, tw: TweenPlayer, nominal = 1): Promise<void> {
    const c = this.clips.get(key);
    if (!c) return;
    this.current?.stop();
    const factor = tw.speed * nominal;
    const seconds = this.duration(key);
    if (factor > 0) {
      c.group.start(false, 1 / factor, c.group.from, c.group.to);
      this.current = c.group;
    }
    await tw.tween(seconds * 1000 * nominal, () => undefined, linear);
    c.group.stop();
    if (key === 'defeat') {
      c.group.start(false, 1, c.group.to, c.group.to);
      c.group.pause();
    }
    this.current = null;
  }

  stop(): void {
    this.current?.stop();
    this.current = null;
  }

  dispose(): void {
    this.stop();
    for (const c of this.clips.values()) c.group.dispose();
    this.root.dispose(false, false);
  }
}

export type ModelLoadResult = { ok: true; rig: ModelRig } | { ok: false; reason: string };

/** Per-scene cache of loaded GLB containers. */
export class ModelCache {
  private readonly containers = new Map<string, Promise<AssetContainer>>();
  private readonly failures = new Map<string, string>();
  private counter = 0;

  constructor(private readonly scene: Scene) {
    if (!scene.useRightHandedSystem) throw new Error('Model scenes must use the right-handed system before loading glTF');
  }

  failureFor(url: string): string | null {
    return this.failures.get(url) ?? null;
  }

  private container(entry: UnitModelEntry): Promise<AssetContainer> {
    let p = this.containers.get(entry.url);
    if (!p) {
      p = (async () => {
        const res = await fetch(entry.url);
        if (!res.ok) throw new Error(`HTTP ${res.status} loading ${entry.url}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        const issues = validateGlbAgainstManifest(readGlbJson(bytes), entry.manifest);
        if (issues.length) throw new Error(issues.join('; '));
        await loadGltfLoader();
        return LoadAssetContainerAsync(bytes, this.scene, {
          pluginExtension: '.glb',
          // Never auto-play a random first clip (production/02 §7).
          pluginOptions: { gltf: { animationStartMode: 0 } },
        });
      })();
      this.containers.set(entry.url, p);
    }
    return p;
  }

  /** Instantiate an independent copy (own skeleton and animation groups). */
  async instantiate(entry: UnitModelEntry): Promise<ModelLoadResult> {
    const known = this.failures.get(entry.url);
    if (known) return { ok: false, reason: known };
    try {
      const c = await this.container(entry);
      const id = ++this.counter;
      const inst = c.instantiateModelsToScene((n) => `${entry.manifest.assetId}#${id}:${n}`, false, { doNotInstantiate: true });
      const wrapper = new TransformNode(`model-${entry.manifest.assetId}#${id}`, this.scene);
      // Model front is +Z; figures treat local +X as forward.
      const inner = new TransformNode(`model-inner#${id}`, this.scene);
      inner.parent = wrapper;
      inner.rotation.y = Math.PI / 2;
      inner.scaling.setAll(entry.manifest.scale);
      const [ox, oy, oz] = entry.manifest.visualOffset;
      inner.position = new Vector3(ox, oy, oz);
      for (const n of inst.rootNodes) n.parent = inner;
      const meshes = inst.rootNodes.flatMap((n) => n.getChildMeshes(false));
      for (const m of meshes) m.isPickable = false;
      return { ok: true, rig: new ModelRig(wrapper, meshes, inst.animationGroups, entry.manifest) };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.failures.set(entry.url, reason);
      console.warn(`[models] ${entry.manifest.assetId}: falling back to the placeholder proxy — ${reason}`);
      return { ok: false, reason };
    }
  }

  dispose(): void {
    for (const p of this.containers.values()) void p.then((c) => c.dispose()).catch(() => undefined);
    this.containers.clear();
  }
}
