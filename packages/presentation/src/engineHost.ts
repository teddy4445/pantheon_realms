/**
 * EngineHost: ONE long-lived Babylon engine and canvas for the application session.
 *
 * Scene controllers are created and disposed explicitly as screens change; the
 * canvas element is re-parented into the active screen's viewport element, so
 * pointer input goes straight to the scene and only one render loop ever runs.
 * The host never decides game rules; controllers only present committed data.
 */
import { Engine, Scene } from '@babylonjs/core';

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
  contextLost = false;

  private constructor(canvas: HTMLCanvasElement, engine: Engine) {
    this.canvas = canvas;
    this.engine = engine;
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
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true, disableWebGL2Support: false }, true);
    engine.disableManifestCheck = true;
    return new EngineHost(canvas, engine);
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
