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
import '@babylonjs/loaders/glTF';
import { LoadAssetContainerAsync, TransformNode, Vector3, type AbstractMesh, type AnimationGroup, type AssetContainer, type Scene } from '@babylonjs/core';
import type { TweenPlayer } from './tween';
import { linear } from './tween';

/** The eight semantic states every creature presents (plus optional flight/ability clips). */
export const SEMANTIC_STATES = ['idle', 'move', 'melee', 'ranged', 'defend', 'hit', 'defeat', 'victory'] as const;
export type SemanticState = (typeof SEMANTIC_STATES)[number];
export type ClipKey = SemanticState | 'takeoff' | 'fly' | 'land' | `ability_${string}`;

/** Default source clip names (CREATURE_ANIMATION_REQUIREMENTS §2-3). */
export const DEFAULT_CLIP_NAMES: Readonly<Record<SemanticState, string>> = {
  idle: 'idle_a',
  move: 'move_walk',
  melee: 'attack_melee_a',
  ranged: 'attack_shoot',
  defend: 'guard',
  hit: 'hit_a',
  defeat: 'defeat',
  victory: 'victory',
};

export interface ClipBinding {
  readonly name: string;
  readonly loop: boolean;
  /** Normalized cue points (0..1) for presentation sync; never rules. */
  readonly impactAt?: number;
  readonly releaseAt?: number;
}

export type AssetState = 'briefed' | 'concept_approved' | 'modeled' | 'rigged' | 'animated' | 'exported' | 'integrated' | 'verified';

export interface UnitFormManifest {
  readonly assetId: string;
  readonly creatureId: string;
  readonly form: 'base' | 'upgraded';
  readonly status: AssetState;
  /** Path relative to the family manifest. */
  readonly model: string;
  readonly portrait: string | null;
  readonly rigId: string;
  /** Uniform scale applied after import (1 = authored meters). */
  readonly scale: number;
  /** Presentation-only offset in meters (centers a two-cell model); never moves the hit area. */
  readonly visualOffset: readonly [number, number, number];
  readonly sockets?: Readonly<Record<string, string>>;
  readonly clips: Readonly<Partial<Record<ClipKey, ClipBinding>>>;
  readonly provenanceId: string;
}

export interface UnitFamilyManifest {
  readonly schema: 'pantheon-realms-unit-family';
  readonly schemaVersion: 1;
  readonly familyId: string;
  readonly pantheonId: string | null;
  readonly note?: string;
  readonly forms: { readonly base?: UnitFormManifest; readonly upgraded?: UnitFormManifest };
}

export interface UnitModelEntry {
  readonly manifest: UnitFormManifest;
  /** Resolved runtime URL of the GLB (bundled; never a CDN). */
  readonly url: string;
}

// ---------------------------------------------------------------------------
// Registry (filled by the application from bundled manifests)
// ---------------------------------------------------------------------------

const registry = new Map<string, UnitModelEntry>();

export function registerUnitModels(entries: readonly UnitModelEntry[]): void {
  for (const e of entries) registry.set(e.manifest.creatureId, e);
}

export function unitModelFor(creatureId: string): UnitModelEntry | undefined {
  return registry.get(creatureId);
}

export function registeredUnitModels(): UnitModelEntry[] {
  return [...registry.values()];
}

// ---------------------------------------------------------------------------
// Validation (pure; shared by tests, tools and the runtime loader)
// ---------------------------------------------------------------------------

/** Extensions whose decoders Babylon would fetch from a CDN. The game must work offline. */
export const FORBIDDEN_EXTENSIONS = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_meshopt_compression', 'KHR_texture_basisu'] as const;

export interface GltfJson {
  readonly asset?: { readonly version?: string; readonly generator?: string };
  readonly extensionsUsed?: readonly string[];
  readonly extensionsRequired?: readonly string[];
  readonly animations?: readonly { readonly name?: string }[];
  readonly nodes?: readonly { readonly name?: string }[];
  readonly scenes?: readonly unknown[];
}

/** Parse the JSON chunk of a binary glTF (throws on a malformed container). */
export function readGlbJson(bytes: Uint8Array): GltfJson {
  if (bytes.byteLength < 20) throw new Error('File is too small to be a GLB');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('Not a GLB (missing glTF magic)');
  if (view.getUint32(4, true) !== 2) throw new Error('Only glTF 2.0 GLB is supported');
  const chunkLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a) throw new Error('First GLB chunk is not JSON');
  const text = new TextDecoder().decode(bytes.subarray(20, 20 + chunkLength));
  return JSON.parse(text) as GltfJson;
}

export interface ManifestRequirements {
  /** The creature can shoot (needs a ranged clip). */
  readonly ranged: boolean;
  /** The creature flies (takeoff/fly/land recommended; move remains the short ground move). */
  readonly flying: boolean;
}

/** Manifest-level checks: required semantic states, loop policies and cue ranges. */
export function validateFormManifest(m: UnitFormManifest, req: ManifestRequirements): string[] {
  const issues: string[] = [];
  const need: SemanticState[] = ['idle', 'move', 'melee', 'defend', 'hit', 'defeat', 'victory'];
  if (req.ranged) need.push('ranged');
  for (const s of need) if (!m.clips[s]) issues.push(`${m.assetId}: missing required "${s}" clip binding`);
  if (req.flying) for (const k of ['takeoff', 'fly', 'land'] as const) if (!m.clips[k]) issues.push(`${m.assetId}: flying creature should bind "${k}"`);
  if (m.clips.defeat?.loop) issues.push(`${m.assetId}: defeat must not loop`);
  for (const k of ['melee', 'ranged', 'hit', 'victory'] as const) if (m.clips[k]?.loop) issues.push(`${m.assetId}: ${k} plays once (loop must be false)`);
  if (m.clips.idle && !m.clips.idle.loop) issues.push(`${m.assetId}: idle must loop`);
  for (const [k, b] of Object.entries(m.clips)) {
    for (const cue of [b?.impactAt, b?.releaseAt]) if (cue !== undefined && (cue < 0 || cue > 1)) issues.push(`${m.assetId}: ${k} cue ${cue} outside 0..1`);
  }
  if (!(m.scale > 0)) issues.push(`${m.assetId}: scale must be positive`);
  if (!/\.glb$/i.test(m.model)) issues.push(`${m.assetId}: runtime model must be a .glb`);
  return issues;
}

/** File-level checks against the manifest: clip names, sockets, offline-safe extensions. */
export function validateGlbAgainstManifest(json: GltfJson, m: UnitFormManifest): string[] {
  const issues: string[] = [];
  if (json.asset?.version !== '2.0') issues.push(`${m.assetId}: glTF asset.version must be "2.0"`);
  const used = new Set([...(json.extensionsUsed ?? []), ...(json.extensionsRequired ?? [])]);
  for (const x of FORBIDDEN_EXTENSIONS) if (used.has(x)) issues.push(`${m.assetId}: uses ${x}, whose decoder would be fetched from a CDN — export without it (or vendor the decoder first)`);
  const clipNames = new Set((json.animations ?? []).map((a) => a.name ?? ''));
  for (const [k, b] of Object.entries(m.clips)) if (b && !clipNames.has(b.name)) issues.push(`${m.assetId}: clip "${b.name}" (${k}) is not in the GLB`);
  const nodeNames = new Set((json.nodes ?? []).map((n) => n.name ?? ''));
  for (const [k, n] of Object.entries(m.sockets ?? {})) if (!nodeNames.has(n)) issues.push(`${m.assetId}: socket "${k}" node "${n}" is not in the GLB`);
  if ((json.scenes ?? []).length === 0) issues.push(`${m.assetId}: GLB has no scene`);
  return issues;
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
