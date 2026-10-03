/**
 * EngineHost: ONE long-lived PixiJS renderer and canvas for the application session.
 *
 * View controllers are created and disposed explicitly as screens change; the
 * canvas element is re-parented into the active screen's viewport element, so
 * pointer input goes straight to the view and only one render loop ever runs.
 * The host never decides game rules; controllers only present committed data.
 *
 * Offline: WebGL only, every texture comes from the game's own files, and the
 * no-eval build of PixiJS is used (the desktop Content-Security-Policy forbids
 * `unsafe-eval`).
 */
import 'pixi.js/unsafe-eval';
import { Container, autoDetectRenderer, type Renderer } from 'pixi.js';
import { graphicsProfile, onGraphicsChange, renderResolution, type GraphicsProfile } from './graphics';

export interface SceneController {
  /** Everything this view draws (added to the stage while it is shown). */
  readonly root: Container;
  /** Called every frame before rendering (camera easing, animation). */
  tick?(dtMs: number): void;
  /** The viewport changed size (CSS pixels). */
  resize?(width: number, height: number): void;
  dispose(): void;
}

export type ControllerFactory<T extends SceneController> = (engine: EngineHost, canvas: HTMLCanvasElement) => T;

export class EngineHost {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: Renderer;
  readonly stage = new Container();
  private active: SceneController | null = null;
  private frame = 0;
  private resizeObserver: ResizeObserver | null = null;
  private lastFrame = performance.now();
  /** Time of the last frame actually drawn (frame-rate cap). */
  private lastDrawn = 0;
  private size = { width: 1, height: 1 };
  contextLost = false;
  /** Anti-aliasing the context was created with (it cannot change until the next start). */
  readonly antialias: boolean;

  private constructor(renderer: Renderer, antialias: boolean) {
    this.renderer = renderer;
    this.canvas = renderer.canvas as HTMLCanvasElement;
    this.canvas.className = 'scene-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.tabIndex = -1;
    this.antialias = antialias;
    this.stage.eventMode = 'none';
    onGraphicsChange((p) => this.applyGraphics(p));
    this.canvas.addEventListener('webglcontextlost', () => {
      this.contextLost = true;
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
    });
  }

  /** Create the renderer (WebGL; nothing is fetched from the network). */
  static async create(): Promise<EngineHost> {
    const p = graphicsProfile();
    const renderer = await autoDetectRenderer({
      preference: 'webgl',
      antialias: p.antialias,
      autoDensity: true,
      resolution: renderResolution(p, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
      background: '#070e1a',
      width: 640,
      height: 480,
      powerPreference: 'high-performance',
      // The views own their pointer handling (hex picking); PixiJS's own event system is not used.
      eventFeatures: { move: false, globalMove: false, click: false, wheel: false },
    });
    return new EngineHost(renderer, p.antialias);
  }

  /** Resolution follows the preset at once (Settings → Display → Graphics quality). */
  private applyGraphics(p: GraphicsProfile): void {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.renderer.resolution = renderResolution(p, dpr);
    this.renderer.resize(this.size.width, this.size.height);
  }

  get width(): number {
    return this.size.width;
  }

  get height(): number {
    return this.size.height;
  }

  private fit(container: HTMLElement): void {
    const w = Math.max(1, Math.round(container.clientWidth));
    const h = Math.max(1, Math.round(container.clientHeight));
    if (w === this.size.width && h === this.size.height) return;
    this.size = { width: w, height: h };
    this.renderer.resize(w, h);
    this.active?.resize?.(w, h);
  }

  /** Place the canvas inside a viewport element and keep it sized to it. */
  mount(container: HTMLElement): void {
    if (this.canvas.parentElement !== container) container.appendChild(this.canvas);
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.fit(container));
    this.resizeObserver.observe(container);
    this.size = { width: 0, height: 0 };
    this.fit(container);
  }

  unmount(container: HTMLElement): void {
    if (this.canvas.parentElement === container) {
      container.removeChild(this.canvas);
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    }
  }

  /** Replace the active view. The previous controller is disposed first. */
  show<T extends SceneController>(factory: ControllerFactory<T>): T {
    this.release();
    const controller = factory(this, this.canvas);
    this.active = controller;
    this.stage.addChild(controller.root);
    controller.resize?.(this.size.width, this.size.height);
    this.startLoop();
    return controller;
  }

  /** Dispose the active controller (if it is `which`, or any when omitted). */
  release(which?: SceneController): void {
    if (!this.active || (which && which !== this.active)) return;
    const c = this.active;
    this.active = null;
    this.stopLoop();
    this.stage.removeChild(c.root);
    c.dispose();
  }

  get current(): SceneController | null {
    return this.active;
  }

  private startLoop(): void {
    if (this.frame) return;
    this.lastFrame = performance.now();
    const step = () => {
      this.frame = requestAnimationFrame(step);
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
      this.renderer.render(this.stage);
    };
    this.frame = requestAnimationFrame(step);
  }

  private stopLoop(): void {
    if (!this.frame) return;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}
