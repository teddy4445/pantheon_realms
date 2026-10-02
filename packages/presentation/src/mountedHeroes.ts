/**
 * Mounted adventure-map heroes: the six animated pantheon GLBs
 * (assets-runtime/heroes/, see ASSET_PIPELINE.md §12) and their animation
 * controller.
 *
 * One GLB is loaded per pantheon and per scene (an AssetContainer); every hero on
 * the map gets its own instance with its own skeleton, skinned meshes and
 * AnimationGroups (instantiateModelsToScene with doNotInstantiate), so playing or
 * stopping one hero never touches another. The rider and the mount stay one
 * hierarchy under one container node.
 *
 * Orientation and scale are applied at the container: GLB metres, +Y up, +Z
 * forward. In a left-handed scene Babylon's glTF loader adds its conversion root
 * (the model still faces +Z); in a right-handed scene it imports natively. Either
 * way the container turns the model's +Z front to the game's figure convention
 * (local +X = forward) and scales it uniformly.
 *
 * Loop flags, the hold-last-pose rule and the Prepare_War completion callback are
 * configured here explicitly; importing a GLB sets none of them. Nothing here
 * decides rules.
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { Observer } from '@babylonjs/core/Misc/observable';
import type { Skeleton } from '@babylonjs/core/Bones/skeleton';
import type { Scene } from '@babylonjs/core/scene';
import { readGlbJson, validateHeroGlb, walkPlaybackRate, type MountedHeroClipKey, type MountedHeroModelEntry } from './modelRegistry';

/** Uniform scale for all six heroes: world units per authored metre (one hero fits one hex). */
export const MOUNTED_HERO_SCALE = 0.36;

/**
 * Upper bound on the Walk playback rate. The map moves a hero one hex in about
 * 0.2 s, far faster than a walking horse at map scale (the exact rate would be
 * ~30×); above this cap the legs blur, so the cap keeps the gait readable and the
 * hooves slide instead. Below the cap the rate follows the formula exactly.
 */
export const MAX_WALK_PLAYBACK_RATE = 3.5;

/** The glTF loader is fetched only when a scene first loads a model. */
let gltfLoader: Promise<unknown> | null = null;
function loadGltfLoader(): Promise<unknown> {
  gltfLoader ??= Promise.all([import('@babylonjs/loaders/glTF/glTFFileLoader'), import('@babylonjs/loaders/glTF/2.0')]);
  return gltfLoader;
}

export type PrepareOutcome = 'finished' | 'cancelled';

export interface MountedHeroDebug {
  readonly pantheonId: string;
  /** The clip the hero is in (the crossfade target). */
  readonly clip: string;
  readonly playbackRate: number;
  /** Rate the formula asks for before the readability cap. */
  readonly formulaRate: number;
  readonly weights: Readonly<Record<string, number>>;
  readonly playing: readonly string[];
  readonly prepareStarted: number;
  readonly prepareFinished: number;
  readonly prepareCancelled: number;
  readonly holdingReadyPose: boolean;
}

interface Fade {
  readonly from: AnimationGroup[];
  readonly to: AnimationGroup;
  elapsed: number;
  readonly duration: number;
  readonly startWeights: number[];
}

/** One mounted hero instance: container node, meshes and its own three animation groups. */
export class MountedHeroRig {
  readonly root: TransformNode;
  readonly meshes: AbstractMesh[];
  readonly entry: MountedHeroModelEntry;
  readonly scale: number;
  private readonly groups: Record<MountedHeroClipKey, AnimationGroup>;
  private state: MountedHeroClipKey = 'idle';
  private fade: Fade | null = null;
  private rate = 1;
  private formula = 0;
  private prepareToken = 0;
  private prepareResolve: ((o: PrepareOutcome) => void) | null = null;
  private endObserver: Observer<AnimationGroup> | null = null;
  private holding = false;
  private counts = { started: 0, finished: 0, cancelled: 0 };

  private readonly skeletons: readonly Skeleton[];

  constructor(root: TransformNode, meshes: AbstractMesh[], groups: readonly AnimationGroup[], entry: MountedHeroModelEntry, scale: number, skeletons: readonly Skeleton[] = []) {
    this.root = root;
    this.skeletons = skeletons;
    this.meshes = meshes;
    this.entry = entry;
    this.scale = scale;
    const find = (key: MountedHeroClipKey): AnimationGroup => {
      const name = entry.clips[key].name;
      const g = groups.find((x) => x.name === name || x.name.endsWith(`:${name}`));
      if (!g) throw new Error(`${entry.pantheonId}: clip "${name}" missing after instantiation`);
      return g;
    };
    this.groups = { idle: find('idle'), walk: find('walk'), prepare: find('prepare') };
    for (const g of groups) g.stop();
    // Explicit loop flags from the manifest (glTF carries none).
    this.groups.idle.loopAnimation = entry.clips.idle.loop;
    this.groups.walk.loopAnimation = entry.clips.walk.loop;
    this.groups.prepare.loopAnimation = entry.clips.prepare.loop;
    // Start idling at a random phase so heroes never breathe in lockstep.
    const idle = this.groups.idle;
    idle.start(true, 1, idle.from, idle.to);
    idle.goToFrame(idle.from + Math.random() * (idle.to - idle.from));
    idle.weight = 1;
  }

  /** Current clip key ('idle' | 'walk' | 'prepare'). */
  get clip(): MountedHeroClipKey {
    return this.state;
  }

  /** Seconds of a clip as authored (from the manifest). */
  duration(key: MountedHeroClipKey): number {
    return this.entry.clips[key].durationSeconds;
  }

  /**
   * Movement drive from the map: a positive world speed (world units per second)
   * plays Walk at the matching rate; 0 returns to Idle_Standing. Crossfades.
   */
  setMoving(worldSpeed: number): void {
    if (this.state === 'prepare') return;
    if (worldSpeed > 0) {
      this.formula = walkPlaybackRate(worldSpeed, this.entry.walkReferenceSpeed, this.scale);
      this.rate = Math.min(MAX_WALK_PLAYBACK_RATE, Math.max(0.25, this.formula));
      this.groups.walk.speedRatio = this.rate;
      if (this.state !== 'walk') this.crossfadeTo('walk', this.rate);
    } else if (this.state !== 'idle') {
      this.rate = 1;
      this.formula = 0;
      this.crossfadeTo('idle', 1);
    }
  }

  /**
   * Play Prepare_War once (no loop) and hold its final pose. Resolves 'finished'
   * from the animation group's own end event — once — or 'cancelled' when
   * cancelPrepare() is called first, in which case the end event is ignored and
   * the hero blends back to Idle_Standing.
   */
  prepareWar(speedRatio = 1): Promise<PrepareOutcome> {
    this.cancelPrepare();
    const token = ++this.prepareToken;
    this.counts.started += 1;
    this.holding = false;
    const g = this.groups.prepare;
    g.loopAnimation = false;
    return new Promise<PrepareOutcome>((resolve) => {
      this.prepareResolve = resolve;
      this.endObserver = g.onAnimationGroupEndObservable.addOnce(() => {
        this.endObserver = null;
        if (token !== this.prepareToken || this.prepareResolve !== resolve) return; // cancelled: ignore
        this.prepareResolve = null;
        // Hold the final ready pose until the battle transition replaces the scene.
        g.start(false, 1, g.to, g.to);
        g.weight = 1;
        g.pause();
        this.holding = true;
        this.counts.finished += 1;
        resolve('finished');
      });
      this.crossfadeTo('prepare', speedRatio);
    });
  }

  /** Abandon a pending Prepare_War: its completion is ignored and the hero returns to idle. */
  cancelPrepare(): void {
    const resolve = this.prepareResolve;
    this.prepareToken += 1;
    this.prepareResolve = null;
    if (this.endObserver) {
      this.groups.prepare.onAnimationGroupEndObservable.remove(this.endObserver);
      this.endObserver = null;
    }
    if (resolve) {
      this.counts.cancelled += 1;
      resolve('cancelled');
    }
    if (this.state === 'prepare') {
      this.holding = false;
      this.crossfadeTo('idle', 1);
    }
  }

  private crossfadeTo(key: MountedHeroClipKey, speedRatio: number): void {
    const to = this.groups[key];
    const spec = this.entry.clips[key];
    const others = (Object.keys(this.groups) as MountedHeroClipKey[]).filter((k) => k !== key).map((k) => this.groups[k]);
    // A group held paused (the ready pose) keeps contributing while it fades out.
    const from = others.filter((g) => g.isStarted);
    if (to.isStarted) to.stop();
    to.start(spec.loop, speedRatio, to.from, to.to);
    this.state = key;
    const duration = this.entry.crossfadeSeconds * 1000;
    if (from.length === 0 || duration <= 0) {
      for (const g of from) g.stop();
      to.weight = 1;
      this.fade = null;
      return;
    }
    if (this.fade) for (const g of this.fade.from) if (!from.includes(g) && g !== to) g.stop();
    to.weight = 0;
    this.fade = { from, to, elapsed: 0, duration, startWeights: from.map((g) => (g.weight < 0 ? 1 : g.weight)) };
  }

  /** Per-frame crossfade update (wall-clock milliseconds). */
  update(dtMs: number): void {
    const f = this.fade;
    if (!f) return;
    f.elapsed += dtMs;
    const t = Math.min(1, f.elapsed / f.duration);
    f.to.weight = t;
    f.from.forEach((g, i) => (g.weight = (f.startWeights[i] ?? 1) * (1 - t)));
    if (t >= 1) {
      for (const g of f.from) {
        g.stop();
        g.weight = 1;
      }
      f.to.weight = 1;
      this.fade = null;
    }
  }

  debug(): MountedHeroDebug {
    const weights: Record<string, number> = {};
    const playing: string[] = [];
    for (const [k, g] of Object.entries(this.groups)) {
      weights[k] = g.isStarted ? (g.weight < 0 ? 1 : Math.round(g.weight * 1000) / 1000) : 0;
      if (g.isPlaying) playing.push(this.entry.clips[k as MountedHeroClipKey].name);
    }
    return {
      pantheonId: this.entry.pantheonId,
      clip: this.entry.clips[this.state].name,
      playbackRate: Math.round(this.rate * 1000) / 1000,
      formulaRate: Math.round(this.formula * 1000) / 1000,
      weights,
      playing,
      prepareStarted: this.counts.started,
      prepareFinished: this.counts.finished,
      prepareCancelled: this.counts.cancelled,
      holdingReadyPose: this.holding,
    };
  }

  dispose(): void {
    this.cancelPrepare();
    for (const g of Object.values(this.groups)) {
      g.stop();
      g.dispose();
    }
    this.root.dispose(false, false);
    for (const k of this.skeletons) k.dispose();
  }
}

export type HeroLoadResult = { ok: true; rig: MountedHeroRig } | { ok: false; reason: string };

/** Per-scene cache of the six hero containers; instances are independent copies. */
export class MountedHeroCache {
  private readonly containers = new Map<string, Promise<AssetContainer>>();
  private readonly failures = new Map<string, string>();
  private counter = 0;

  constructor(
    private readonly scene: Scene,
    private readonly scale = MOUNTED_HERO_SCALE,
    /** Container yaw: π/2 turns the GLB's +Z front to the map figure's +X (other scenes pass their own). */
    private readonly yaw = Math.PI / 2,
  ) {}

  failureFor(entry: MountedHeroModelEntry): string | null {
    return this.failures.get(entry.url) ?? null;
  }

  private container(entry: MountedHeroModelEntry): Promise<AssetContainer> {
    let p = this.containers.get(entry.url);
    if (!p) {
      p = (async () => {
        const res = await fetch(entry.url);
        if (!res.ok) throw new Error(`HTTP ${res.status} loading ${entry.url}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        const issues = validateHeroGlb(readGlbJson(bytes) as Parameters<typeof validateHeroGlb>[0], entry);
        if (issues.length) throw new Error(issues.join('; '));
        await loadGltfLoader();
        return LoadAssetContainerAsync(bytes, this.scene, {
          pluginExtension: '.glb',
          // Never auto-play a clip: the controller decides (idle on spawn).
          pluginOptions: { gltf: { animationStartMode: 0 } },
        });
      })();
      this.containers.set(entry.url, p);
    }
    return p;
  }

  async instantiate(entry: MountedHeroModelEntry): Promise<HeroLoadResult> {
    const known = this.failures.get(entry.url);
    if (known) return { ok: false, reason: known };
    try {
      const c = await this.container(entry);
      if (this.scene.isDisposed) return { ok: false, reason: 'scene disposed' };
      const id = ++this.counter;
      // Independent copy: own skeleton, skinned meshes and animation groups.
      const inst = c.instantiateModelsToScene((n) => `hero-${entry.pantheonId}#${id}:${n}`, false, { doNotInstantiate: true });
      const container = new TransformNode(`mounted-hero-${entry.pantheonId}#${id}`, this.scene);
      // GLB +Z front → figure convention (local +X forward); uniform scale; hoof offset.
      container.rotation.y = this.yaw;
      container.scaling.setAll(this.scale);
      container.position.y = entry.groundOffset * this.scale;
      for (const n of inst.rootNodes) n.parent = container;
      const meshes = inst.rootNodes.flatMap((n) => n.getChildMeshes(false));
      for (const m of meshes) {
        m.isPickable = false;
        // Skinned bounds follow the bind pose; never cull a hero mid-stride.
        m.alwaysSelectAsActiveMesh = true;
      }
      return { ok: true, rig: new MountedHeroRig(container, meshes, inst.animationGroups, entry, this.scale, inst.skeletons) };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.failures.set(entry.url, reason);
      console.warn(`[heroes] ${entry.pantheonId}: keeping the placeholder rider — ${reason}`);
      return { ok: false, reason };
    }
  }

  dispose(): void {
    for (const p of this.containers.values()) void p.then((c) => c.dispose()).catch(() => undefined);
    this.containers.clear();
  }
}
