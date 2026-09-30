/**
 * UnitViewerController (S18 Animated Bestiary): one creature on a pedestal with
 * an orbit camera and explicit playback controls (production/02 §8):
 * Play / Pause / Stop / Restart, 0.5× / 1× / 2×, defeat plays once and holds,
 * reduced motion disables idle autoplay and auto-rotation.
 *
 * The subject is the creature's registered GLB model when one exists (loaded
 * into this right-handed scene), otherwise the procedural proxy. The viewer
 * reports which one it shows so the screen never presents a placeholder as
 * final art.
 */
import { ArcRotateCamera, Color3, DirectionalLight, Engine, HemisphericLight, MeshBuilder, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { BodyProfile } from '@pr/rules';
import type { SceneController } from './engineHost';
import { clearColor } from './meshkit';
import { MaterialCache, buildCreatureProxy, disposeProxy, type CreatureProxy } from './proxies';
import { TweenPlayer } from './tween';
import { applyIdle, playState, restFigure, type AnimationState, type Figure } from './animations';
import { ModelCache, unitModelFor, type ModelRig } from './models';

export interface ViewerSubject {
  readonly key: string;
  readonly body: BodyProfile;
  readonly upgraded: boolean;
  readonly accent: string;
  readonly footprint: 1 | 2;
  /** Selects a registered GLB model; the proxy is shown until it loads or if it fails. */
  readonly creatureId?: string;
}

export type ViewerModelStatus =
  | { readonly kind: 'proxy' }
  | { readonly kind: 'loading'; readonly assetId: string }
  | { readonly kind: 'model'; readonly assetId: string; readonly status: string; readonly clips: readonly AnimationState[] }
  | { readonly kind: 'failed'; readonly assetId: string; readonly reason: string };

export type PlaybackState = 'playing' | 'paused' | 'stopped';

const LOOPING: ReadonlySet<AnimationState> = new Set(['idle', 'move', 'defend']);

export class UnitViewerController implements SceneController {
  readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly mats: MaterialCache;
  private readonly tweens = new TweenPlayer();
  private readonly holder: TransformNode;
  private readonly models: ModelCache;
  private proxy: CreatureProxy | null = null;
  private rig: ModelRig | null = null;
  private figure: Figure | null = null;
  private subjectKey = '';
  private state: AnimationState = 'idle';
  private loopToken = 0;
  private time = 0;
  private playback: PlaybackState = 'playing';
  private status: ViewerModelStatus = { kind: 'proxy' };
  autoRotate = true;
  /** Playback rate: 0.5, 1 or 2. */
  speed = 1;
  /** Reduced motion: no idle autoplay, no auto-rotation. */
  reducedMotion = false;
  onStatus: ((s: ViewerModelStatus) => void) | null = null;

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    this.scene = scene;
    this.models = new ModelCache(scene);
    scene.clearColor = clearColor('#0e1a2c');
    this.mats = new MaterialCache(scene);
    const cam = new ArcRotateCamera('viewer-cam', Math.PI / 2.6, 1.22, 5.6, new Vector3(0, 0.6, 0), scene);
    cam.lowerRadiusLimit = 2.2;
    cam.upperRadiusLimit = 8;
    cam.lowerBetaLimit = 0.5;
    cam.upperBetaLimit = 1.45;
    cam.wheelPrecision = 60;
    cam.panningSensibility = 0;
    cam.attachControl(canvas, true);
    this.camera = cam;
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.62;
    hemi.groundColor = new Color3(0.15, 0.16, 0.24);
    const key = new DirectionalLight('key', new Vector3(-0.6, -1, -0.5), scene);
    key.intensity = 0.9;
    const rim = new DirectionalLight('rim', new Vector3(0.7, -0.4, 0.8), scene);
    rim.intensity = 0.4;
    rim.diffuse = new Color3(0.6, 0.75, 1);
    const plinth = MeshBuilder.CreateCylinder('plinth', { height: 0.22, diameterTop: 2.1, diameterBottom: 2.3, tessellation: 48 }, scene);
    plinth.position.y = -0.11;
    plinth.material = this.mats.get('#5b5a58');
    const trim = MeshBuilder.CreateTorus('trim', { diameter: 2.2, thickness: 0.05, tessellation: 64 }, scene);
    trim.position.y = 0.005;
    trim.material = this.mats.get('#c29a52', { emissive: 0.25 });
    const floor = MeshBuilder.CreateGround('floor', { width: 400, height: 400 }, scene);
    floor.position.y = -0.22;
    floor.material = this.mats.get('#0e1a2c');
    this.holder = new TransformNode('holder', scene);
  }

  get modelStatus(): ViewerModelStatus {
    return this.status;
  }

  get playbackState(): PlaybackState {
    return this.playback;
  }

  private setStatus(s: ViewerModelStatus): void {
    this.status = s;
    this.onStatus?.(s);
  }

  private clearSubject(): void {
    this.loopToken += 1;
    this.tweens.flush();
    if (this.rig) this.rig.dispose();
    else if (this.proxy) disposeProxy(this.proxy);
    this.rig = null;
    this.proxy = null;
    this.figure = null;
  }

  setSubject(s: ViewerSubject): void {
    if (s.key === this.subjectKey) return;
    this.subjectKey = s.key;
    this.clearSubject();
    const proxy = buildCreatureProxy(this.scene, this.mats, s.body, s.upgraded, s.accent, `viewer-${s.key}`);
    proxy.root.parent = this.holder;
    const scale = s.footprint === 2 ? 1.05 : 1.35;
    this.holder.scaling.setAll(scale);
    this.proxy = proxy;
    this.figure = { proxy, base: { x: 0, y: 0, z: 0 }, seed: 0 };
    this.camera.target = new Vector3(0, (proxy.height * scale) / 2, 0);
    const entry = s.creatureId ? unitModelFor(s.creatureId) : undefined;
    if (!entry) {
      this.setStatus({ kind: 'proxy' });
      this.setAnimation(this.state);
      return;
    }
    this.setStatus({ kind: 'loading', assetId: entry.manifest.assetId });
    this.setAnimation(this.state);
    const key = s.key;
    void this.models.instantiate(entry).then((r) => {
      if (this.subjectKey !== key) {
        if (r.ok) r.rig.dispose();
        return;
      }
      if (!r.ok) {
        this.setStatus({ kind: 'failed', assetId: entry.manifest.assetId, reason: r.reason });
        return;
      }
      this.loopToken += 1;
      this.tweens.flush();
      if (this.proxy) disposeProxy(this.proxy);
      this.proxy = null;
      this.rig = r.rig;
      // Models are authored in meters; show them at their true size on the 2.2 m plinth.
      this.holder.scaling.setAll(1);
      r.rig.root.parent = this.holder;
      const strike = new TransformNode('viewer-strike', this.scene);
      strike.parent = r.rig.root;
      this.figure = { proxy: { root: r.rig.root, meshes: r.rig.meshes, strike, shield: null, height: r.rig.height }, rig: r.rig, base: { x: 0, y: 0, z: 0 }, seed: 0 };
      this.camera.target = new Vector3(0, r.rig.height / 2, 0);
      const clips = (['idle', 'move', 'melee', 'ranged', 'defend', 'hit', 'defeat', 'victory'] as const).filter((c) => r.rig.has(c));
      this.setStatus({ kind: 'model', assetId: entry.manifest.assetId, status: entry.manifest.status, clips });
      this.setAnimation(this.state);
    });
  }

  /** States the current subject can show (a model lacking a clip cannot fake it). */
  available(state: AnimationState): boolean {
    return !this.rig || this.rig.has(state);
  }

  /** Select and play a state. Loops loop; one-shots repeat with a pause; defeat plays once and holds. */
  setAnimation(state: AnimationState): void {
    this.state = state;
    this.playback = 'playing';
    this.loopToken += 1;
    const token = this.loopToken;
    this.tweens.flush();
    this.rig?.stop();
    if (this.figure) restFigure(this.figure);
    if (!this.figure) return;
    if (state === 'idle') {
      if (this.reducedMotion) this.rig?.stop();
      else this.rig?.loop('idle', this.speed);
      return;
    }
    if (this.rig && !this.rig.has(state)) return;
    if (this.rig && LOOPING.has(state)) {
      this.rig.loop(state, this.speed);
      return;
    }
    const run = async () => {
      while (token === this.loopToken && this.figure) {
        this.tweens.speed = this.speed <= 0 ? 1 : 1 / this.speed;
        await playState(this.tweens, [this.figure], state);
        if (token !== this.loopToken) return;
        if (state === 'defeat' || this.reducedMotion) {
          this.playback = 'stopped';
          return;
        }
        await this.tweens.wait(380);
        if (this.figure && token === this.loopToken) restFigure(this.figure);
      }
    };
    void run();
  }

  get animation(): AnimationState {
    return this.state;
  }

  pause(): void {
    if (this.playback !== 'playing') return;
    this.playback = 'paused';
    for (const g of this.scene.animationGroups) if (g.isPlaying) g.pause();
  }

  resume(): void {
    if (this.playback !== 'paused') return;
    this.playback = 'playing';
    for (const g of this.scene.animationGroups) if (g.isStarted && !g.isPlaying) g.play();
  }

  /** Stop immediately and return to the rest pose. */
  stop(): void {
    this.loopToken += 1;
    this.tweens.flush();
    this.rig?.stop();
    if (this.figure) restFigure(this.figure);
    this.rig?.stop();
    this.playback = 'stopped';
  }

  restart(): void {
    this.setAnimation(this.state);
  }

  resetCamera(): void {
    this.camera.alpha = Math.PI / 2.6;
    this.camera.beta = 1.22;
    this.camera.radius = 5.6;
  }

  tick(dt: number): void {
    this.time += dt;
    if (this.playback !== 'paused') this.tweens.tick(dt);
    if (this.autoRotate && !this.reducedMotion && this.playback !== 'paused') this.holder.rotation.y += dt * 0.00035;
    if (this.state === 'idle' && this.figure && !this.reducedMotion && this.playback === 'playing') applyIdle(this.figure, this.time);
  }

  dispose(): void {
    this.clearSubject();
    this.models.dispose();
    this.mats.dispose();
    this.scene.dispose();
  }
}
