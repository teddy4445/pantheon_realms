/**
 * EngineHost: ONE long-lived Babylon engine and canvas for the application session.
 *
 * Scene controllers are created and disposed explicitly as screens change; the
 * canvas element is re-parented into the active screen's viewport element, so
 * pointer input goes straight to the scene and only one render loop ever runs.
 * The host never decides game rules; controllers only present committed data.
 */
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { graphicsProfile, hardwareScalingLevel, onGraphicsChange, type GraphicsProfile } from './graphics';
// Babylon features the scenes rely on that register themselves as side effects when
// imported by path (the package is imported by module path, not through its index, so
// only what the game uses is bundled).
import '@babylonjs/core/Culling/ray'; // Scene.createPickingRay (ground picking)
import '@babylonjs/core/Meshes/instancedMesh'; // Mesh.createInstance (tiles, decor)
import '@babylonjs/core/Animations/animatable'; // AnimationGroup playback for GLB clips
import '@babylonjs/core/Engines/Extensions/engine.dynamicTexture'; // label textures
// The two shader programs every scene compiles (StandardMaterial and line colour).
// Babylon would otherwise fetch them, and their ~25 include chunks, one after another
// when the first scene opens; bundled here they arrive with the background preload.
import '@babylonjs/core/Shaders/default.vertex';
import '@babylonjs/core/Shaders/default.fragment';
import '@babylonjs/core/Shaders/color.vertex';
import '@babylonjs/core/Shaders/color.fragment';

/**
 * Resolve Babylon's own lazy shader imports ahead of the first scene (they are tiny
 * re-export chunks once the shaders are bundled above). Called by the background preload.
 */
export function warmShaderImports(): Promise<unknown> {
  return Promise.all([
    import('@babylonjs/core/Shaders/default.vertex'),
    import('@babylonjs/core/Shaders/default.fragment'),
    import('@babylonjs/core/Shaders/color.vertex'),
    import('@babylonjs/core/Shaders/color.fragment'),
  ]);
}

export interface SceneController {
  readonly scene: Scene;
  /** Called every frame before rendering (camera easing, labels). */
  tick?(dtMs: number): void;
  dispose(): void;
}

export type ControllerFactory<T extends SceneController> = (engine: Engine, canvas: HTMLCanvasElement) => T;

export class EngineHost {
  readonly canvas: HTMLCanvasElement;
  readonly engine: Engine;
  private active: SceneController | null = null;
  private running = false;
  private resizeObserver: ResizeObserver | null = null;
  private lastFrame = performance.now();
  /** Time of the last frame actually drawn (frame-rate cap). */
  private lastDrawn = 0;
  contextLost = false;
  /** Anti-aliasing the context was created with (it cannot change until the next start). */
  readonly antialias: boolean;

  private constructor(canvas: HTMLCanvasElement, engine: Engine, antialias: boolean) {
    this.canvas = canvas;
    this.engine = engine;
    this.antialias = antialias;
    this.applyGraphics(graphicsProfile());
    onGraphicsChange((p) => this.applyGraphics(p));
    engine.onContextLostObservable.add(() => {
      this.contextLost = true;
    });
    engine.onContextRestoredObservable.add(() => {
      this.contextLost = false;
    });
  }

  static create(): EngineHost {
    const canvas = document.createElement('canvas');
    canvas.className = 'scene-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.tabIndex = -1;
    // WebGL2 is the required first backend (production/01 §11). No CDN fetches are configured.
    const antialias = graphicsProfile().antialias;
    const engine = new Engine(canvas, antialias, { preserveDrawingBuffer: false, stencil: true, antialias, disableWebGL2Support: false }, true);
    engine.disableManifestCheck = true;
    return new EngineHost(canvas, engine, antialias);
  }

  /** Resolution follows the preset at once (Settings → Display → Graphics quality). */
  private applyGraphics(p: GraphicsProfile): void {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.engine.setHardwareScalingLevel(hardwareScalingLevel(p, dpr));
    this.engine.resize();
  }

  /** Place the canvas inside a viewport element and keep it sized to it. */
  mount(container: HTMLElement): void {
    if (this.canvas.parentElement !== container) container.appendChild(this.canvas);
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.engine.resize());
    this.resizeObserver.observe(container);
    this.engine.resize();
  }

  unmount(container: HTMLElement): void {
    if (this.canvas.parentElement === container) {
      container.removeChild(this.canvas);
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    }
  }

  /** Replace the active scene. The previous controller is disposed first. */
  show<T extends SceneController>(factory: ControllerFactory<T>): T {
    this.release();
    const controller = factory(this.engine, this.canvas);
    this.active = controller;
    this.startLoop();
    return controller;
  }

  /** Dispose the active controller (if it is `which`, or any when omitted). */
  release(which?: SceneController): void {
    if (!this.active || (which && which !== this.active)) return;
    const c = this.active;
    this.active = null;
    this.stopLoop();
    c.dispose();
  }

  get current(): SceneController | null {
    return this.active;
  }

  private startLoop(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.engine.runRenderLoop(() => {
      const c = this.active;
      if (!c || this.contextLost) return;
      const now = performance.now();
      // Frame-rate cap: skip this display frame when the last drawn one is too recent
      // (the canvas keeps showing it). 1 ms of slack so a 60 Hz display meets a 60 cap.
      const cap = graphicsProfile().frameCap;
      if (cap > 0 && now - this.lastDrawn < 1000 / cap - 1) return;
      this.lastDrawn = now;
      const dt = Math.min(100, now - this.lastFrame);
      this.lastFrame = now;
      c.tick?.(dt);
      c.scene.render();
    });
  }

  private stopLoop(): void {
    if (!this.running) return;
    this.running = false;
    this.engine.stopRenderLoop();
  }
}
