/**
 * HeroFigureController (S07 hero screen): the hero's mounted model standing in
 * the middle of the paper doll, Heroes-3 style. Right-handed scene (the GLB
 * loads natively), a fixed three-quarter camera, Idle_Standing looping; a click
 * plays Prepare_War once and blends back to idle. Presentation only — nothing
 * here reads or changes game state. Without a model (failed load, unknown
 * pantheon) the stage stays empty and the screen shows the portrait instead.
 */
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { SceneController } from './engineHost';
import { clearColor } from './meshkit';
import { MaterialCache } from './proxies';
import { heroModelFor } from './modelRegistry';
import { MountedHeroCache, type MountedHeroRig } from './mountedHeroes';

export type HeroFigureStatus = 'none' | 'loading' | 'ready' | 'failed';

export class HeroFigureController implements SceneController {
  readonly scene: Scene;
  private readonly models: MountedHeroCache;
  private readonly mats: MaterialCache;
  private rig: MountedHeroRig | null = null;
  private key = '';
  private token = 0;
  private disposed = false;
  status: HeroFigureStatus = 'none';
  onStatus: ((s: HeroFigureStatus) => void) | null = null;
  /** Reduced motion: no gesture on click. */
  reducedMotion = false;

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    this.scene = scene;
    scene.clearColor = clearColor('#0b1524');
    this.mats = new MaterialCache(scene);
    // Model scale 1 (metres): the camera frames a 2.6 m rider and mount.
    this.models = new MountedHeroCache(scene, 1, 0);
    const cam = new ArcRotateCamera('figure-cam', 1.05, 1.38, 6.1, new Vector3(0, 1.32, 0), scene);
    cam.minZ = 0.1;
    cam.inputs.clear(); // a portrait, not a viewer: no orbit or zoom
    cam.attachControl(canvas, true);
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.7;
    hemi.groundColor = new Color3(0.14, 0.15, 0.22);
    const key = new DirectionalLight('key', new Vector3(-0.5, -1, -0.6), scene);
    key.intensity = 0.95;
    const rim = new DirectionalLight('rim', new Vector3(0.6, -0.3, 0.9), scene);
    rim.intensity = 0.45;
    rim.diffuse = new Color3(0.95, 0.82, 0.55);
    const plinth = MeshBuilder.CreateCylinder('plinth', { height: 0.16, diameterTop: 2.9, diameterBottom: 3.1, tessellation: 48 }, scene);
    plinth.position.y = -0.08;
    plinth.material = this.mats.get('#3d3a36');
    const trim = MeshBuilder.CreateTorus('trim', { diameter: 3.0, thickness: 0.05, tessellation: 64 }, scene);
    trim.position.y = 0.004;
    trim.material = this.mats.get('#c29a52', { emissive: 0.3 });
    scene.onPointerObservable.add((p) => {
      if (p.type === PointerEventTypes.POINTERTAP) this.salute();
    });
  }

  /** Show the mounted hero of this pantheon (owner colour is not used: the model carries its own). */
  setHero(pantheonId: string | null): void {
    const key = pantheonId ?? '';
    if (key === this.key) return;
    this.key = key;
    const token = ++this.token;
    this.rig?.dispose();
    this.rig = null;
    const entry = heroModelFor(pantheonId);
    if (!entry) return this.setStatus('none');
    this.setStatus('loading');
    void this.models.instantiate(entry).then((res) => {
      if (this.disposed || token !== this.token) {
        if (res.ok) res.rig.dispose();
        return;
      }
      if (!res.ok) return this.setStatus('failed');
      this.rig = res.rig;
      this.setStatus('ready');
    });
  }

  /** Prepare_War once, then back to idle (a click on the figure). */
  salute(): void {
    const rig = this.rig;
    if (!rig || this.reducedMotion || rig.clip === 'prepare') return;
    void rig.prepareWar(1).then((o) => {
      if (o === 'finished' && rig === this.rig) setTimeout(() => rig === this.rig && rig.cancelPrepare(), 700);
    });
  }

  private setStatus(s: HeroFigureStatus): void {
    this.status = s;
    this.onStatus?.(s);
  }

  tick(dt: number): void {
    this.rig?.update(dt);
  }

  dispose(): void {
    this.disposed = true;
    this.token += 1;
    this.rig?.dispose();
    this.rig = null;
    this.models.dispose();
    this.mats.dispose();
    this.scene.dispose();
  }
}
