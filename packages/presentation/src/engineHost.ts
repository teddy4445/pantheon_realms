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
import { ADAPT_START, adaptResolutionStep, adaptiveResolution, frameDue, graphicsProfile, onGraphicsChange, renderResolution, type AdaptState, type GraphicsProfile } from './graphics';
import { markUploaded, pendingUploads, takeUploads } from './textures';

/**
 * How often a view needs drawing (frame pacing, 2026-10-07): `full` while
 * anything moves (the camera, a walk, an attack, an effect) or the player is
 * pointing, `ambient` while only idle loops play (figures breathing, a pulse),
 * `still` while nothing changes at all (Low graphics, reduced motion).
 */
export type FramePace = 'full' | 'ambient' | 'still';

export interface SceneController {
  /** Everything this view draws (added to the stage while it is shown). */
  readonly root: Container;
  /** Called every frame before rendering (camera easing, animation). */
  tick?(dtMs: number): void;
  /** How often the view needs drawing now (default `full`). */
  pace?(): FramePace;
  /** The GPU context was lost and restored: redraw whatever the view keeps in textures of its own. */
  contextRestored?(): void;
  /** The viewport changed size (CSS pixels). */
  resize?(width: number, height: number): void;
  /** Colour behind everything the view draws (instead of a full-screen rectangle; read every frame). */
  readonly background?: number;
  dispose(): void;
}

export type ControllerFactory<T extends SceneController> = (engine: EngineHost, canvas: HTMLCanvasElement) => T;

/**
 * Frame timing over the last few seconds and since the last reset (the
 * in-game frame-rate readout and the benchmark). Presentation only.
 */
export interface FrameStats {
  /** Frames per second over the recent window, judged on the frames drawn at full pace (something moving). */
  readonly fps: number;
  /** Frames drawn calm (paced: only idle loops, or nothing changing) in the window, and their share of all frames drawn. */
  readonly calmFrames: number;
  readonly calmShare: number;
  /** Every frame drawn per second over the window, calm ones included (what the GPU actually did). */
  readonly drawnFps: number;
  /** Frames drawn in the window, and those slower than 1/30 s (`SLOW_FRAME_MS`). */
  readonly frames: number;
  readonly slowFrames: number;
  /** Mean, 95th-percentile and worst time between drawn frames in the window (ms). */
  readonly avgMs: number;
  readonly p95Ms: number;
  readonly worstMs: number;
  /** Mean main-thread time per frame in the view's tick and in submitting the frame (ms). */
  readonly tickMs: number;
  readonly renderMs: number;
  /** The longest main-thread time of one frame in the window (view tick plus submitting the frame, ms). */
  readonly workMaxMs: number;
  /** Mean time waiting for the GPU to finish a frame (ms), when measured (`measureGpu`). */
  readonly gpuMs: number | null;
  /** Mean draw calls per frame, when measured (`measureGpu`). */
  readonly drawCalls: number | null;
  /** Mean kilobytes of vertex and index data sent to the GPU per frame, when measured (`measureGpu`). */
  readonly uploadKb: number | null;
  /** Since the view opened (or the last reset): frames drawn, frames slower than 1/30 s (`SLOW_FRAME_MS`), and the slowest (ms). */
  readonly total: number;
  readonly slow: number;
  readonly worstEverMs: number;
  /** Loaded pictures still waiting to be sent to the GPU. */
  readonly pendingUploads: number;
  /** Fraction of the preset's resolution drawn now (adaptive resolution; 1 = all of it). */
  readonly resolutionScale: number;
  /** Times the drawing buffer was resized so far (the view or the resolution changed). */
  readonly resizes: number;
  /** Drawing buffer in device pixels and its resolution (device pixels per CSS pixel). */
  readonly width: number;
  readonly height: number;
  readonly resolution: number;
}

const BACKGROUND = 0x070e1a;
const WINDOW = 1200;
/** The readout's recent window (ms). */
const RECENT_MS = 4000;
/** Loaded pictures sent to the GPU per frame at most, and the time after which the frame stops sending more (ms). */
const UPLOADS_PER_FRAME = 4;
/** Adaptive resolution (graphics.ts `adaptResolutionStep`): judged every two seconds; a gap over a quarter second is a pause, not drawing. */
const ADAPT_WINDOW_MS = 2000;
const ADAPT_PAUSE_MS = 250;
/** A frame slower than 1/30 s (with 2 ms for timer jitter around a 30 fps frame cap) counts as slow. */
const SLOW_FRAME_MS = 1000 / 30 + 2;
/**
 * Frame pacing: frames per second while only idle loops play (the sprite strips
 * run at 3–14 frames per second; a pulse at 30 stays smooth), and while nothing
 * changes at all (a safety net for late pictures; input wakes the view at once).
 */
export const AMBIENT_FPS = 30;
export const STILL_FPS = 8;
/** Full frame rate this long after the last pointer, wheel or key input, or a view's `wake()` (ms). */
const INPUT_HOLD_MS = 600;
const UPLOAD_BUDGET_MS = 4;

export class EngineHost {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: Renderer;
  readonly stage = new Container();
  private active: SceneController | null = null;
  private frame = 0;
  private resizeObserver: ResizeObserver | null = null;
  /** The device pixel ratio the resolution was last set for. */
  private appliedDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  private lastFrame = performance.now();
  /** When the next frame is due under the frame-rate cap. */
  private nextDue = 0;
  /**
   * Adaptive resolution: the fraction of the preset's resolution drawn now (1 =
   * all of it), and the frame-rate window it is judged on.
   */
  private adaptState: AdaptState = ADAPT_START;
  private adapt = { since: 0, frames: 0, sum: 0, busy: 0 };
  /** Main-thread time taken by long tasks (game logic, interface) since the window opened (ms). */
  private longTasks = 0;
  private size = { width: 1, height: 1 };
  private background = BACKGROUND;
  contextLost = false;
  /** Anti-aliasing the context was created with (it cannot change until the next start). */
  readonly antialias: boolean;
  /** Wait for the GPU after each frame and time it (benchmark only: it costs frame rate). */
  measureGpu = false;
  private readonly pixel = new Uint8Array(4);
  private readonly ring = { at: new Float64Array(WINDOW), interval: new Float32Array(WINDOW), tick: new Float32Array(WINDOW), render: new Float32Array(WINDOW), gpu: new Float32Array(WINDOW), draws: new Float32Array(WINDOW), upload: new Float32Array(WINDOW), paced: new Uint8Array(WINDOW), n: 0, i: 0 };
  private draws = 0;
  private uploaded = 0;
  /** Benchmark: textures sent to the GPU since the view opened. */
  textureUploads = 0;
  private countingDraws = false;
  private totals = { frames: 0, slow: 0, worst: 0 };
  /** The window was hidden or shown since the last frame. */
  private resumed = false;
  /** Times the drawing buffer was resized (diagnostics). */
  private resizes = 0;
  /** Frame pacing: the last input (or `wake()`), and whether the last drawn frame was at full pace. */
  private lastInput = -Infinity;
  private paceFull = true;

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
      this.active?.contextRestored?.();
    });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => (this.resumed = true));
    // Frame pacing: any pointing or key press draws at the full rate at once (hover marks, camera keys).
    const woken = () => this.wake();
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) this.canvas.addEventListener(type, woken, { passive: true });
    if (typeof window !== 'undefined') window.addEventListener('keydown', woken, { passive: true });
    // Long tasks (the computer players' turns, the interface) slow frames too, but a lower resolution would not help them.
    try {
      if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) this.longTasks += e.duration;
        }).observe({ type: 'longtask', buffered: false });
      }
    } catch {
      // Not available: every slow stretch counts as drawing.
    }
  }

  /** Create the renderer (WebGL; nothing is fetched from the network). */
  static async create(): Promise<EngineHost> {
    const p = graphicsProfile();
    const renderer = await autoDetectRenderer({
      preference: 'webgl',
      antialias: p.antialias,
      autoDensity: true,
      resolution: renderResolution(p, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
      background: BACKGROUND,
      width: 640,
      height: 480,
      powerPreference: 'high-performance',
      // The views own their pointer handling (hex picking); PixiJS's own event system is not used.
      eventFeatures: { move: false, globalMove: false, click: false, wheel: false },
    });
    return new EngineHost(renderer, p.antialias);
  }

  /** Resolution follows the preset at once (Settings → Display → Graphics quality); a new preset starts at its full resolution. */
  private applyGraphics(p: GraphicsProfile): void {
    this.adaptState = ADAPT_START;
    this.adapt = { since: 0, frames: 0, sum: 0, busy: 0 };
    this.applyResolution(p);
  }

  private applyResolution(p: GraphicsProfile = graphicsProfile()): void {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.appliedDpr = dpr;
    this.renderer.resolution = renderResolution(p, dpr) * this.adaptState.scale;
    this.resizes += 1;
    this.renderer.resize(this.size.width, this.size.height);
  }

  /**
   * Adaptive resolution (Settings → Display, on by default): every two seconds
   * of steady drawing, `adaptResolutionStep` judges the frame rate — fewer
   * pixels while frames are slower than about 34 per second (not while the game
   * logic or the interface held the main thread), back up when they are fast.
   */
  private adaptResolution(now: number, interval: number): void {
    const a = this.adapt;
    if (!adaptiveResolution() || this.measureGpu) {
      if (this.adaptState.scale !== 1) {
        this.adaptState = ADAPT_START;
        this.applyResolution();
      }
      return;
    }
    if (a.since === 0 || interval > ADAPT_PAUSE_MS) {
      // A loading pause or a window that was away: judge the steady rate only.
      a.since = now;
      a.frames = 0;
      a.sum = 0;
      a.busy = this.longTasks;
      return;
    }
    a.frames += 1;
    a.sum += interval;
    if (now - a.since < ADAPT_WINDOW_MS) return;
    const mean = a.sum / a.frames;
    const busy = (this.longTasks - a.busy) / (now - a.since);
    a.since = now;
    a.frames = 0;
    a.sum = 0;
    a.busy = this.longTasks;
    const next = adaptResolutionStep(this.adaptState, { now, meanMs: mean, busyShare: busy, frameCap: graphicsProfile().frameCap });
    if (next.scale === this.adaptState.scale) {
      this.adaptState = next;
      return;
    }
    this.adaptState = next;
    this.applyResolution();
  }

  get width(): number {
    return this.size.width;
  }

  get height(): number {
    return this.size.height;
  }

  /**
   * Keep the drawing buffer the size of its viewport element. Browser zoom changes both the CSS size
   * and the device pixel ratio: the resolution follows the new ratio (crisp, as at start), and the
   * view is drawn again at once — 1.1.4, real-zoom check of the GUI audit: a still view kept showing
   * the frame laid out for the old size until the next input.
   */
  private fit(container: HTMLElement): void {
    const w = Math.max(1, Math.round(container.clientWidth));
    const h = Math.max(1, Math.round(container.clientHeight));
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    if (w === this.size.width && h === this.size.height && dpr === this.appliedDpr) return;
    this.size = { width: w, height: h };
    if (dpr !== this.appliedDpr) {
      this.appliedDpr = dpr;
      this.renderer.resolution = renderResolution(graphicsProfile(), dpr) * this.adaptState.scale;
    }
    this.resizes += 1;
    this.renderer.resize(w, h);
    this.active?.resize?.(w, h);
    this.wake();
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
    // The readout's totals count from the moment this view opened.
    this.resetFrameStats();
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

  /** Draw at the full frame rate for a moment (input, or a view that just changed something). */
  wake(): void {
    this.lastInput = performance.now();
  }

  /** The pace of the next frame: full while input is recent or pictures are still arriving, else the view's own. */
  private paceOf(c: SceneController, now: number): FramePace {
    if (now - this.lastInput < INPUT_HOLD_MS || pendingUploads() > 0) return 'full';
    return c.pace?.() ?? 'full';
  }

  private startLoop(): void {
    if (this.frame) return;
    this.lastFrame = performance.now();
    const step = () => {
      this.frame = requestAnimationFrame(step);
      const c = this.active;
      if (!c || this.contextLost) return;
      const now = performance.now();
      // Frame pacing: the full cap while anything moves, fewer frames while only idle loops
      // play or nothing changes; waking up draws the next display frame at once.
      const pace = this.paceOf(c, now);
      const capFull = graphicsProfile().frameCap;
      const cap = pace === 'full' ? capFull : pace === 'ambient' ? (capFull > 0 ? Math.min(capFull, AMBIENT_FPS) : AMBIENT_FPS) : STILL_FPS;
      if (pace === 'full' && !this.paceFull) this.nextDue = 0;
      // Frame-rate cap: skip this display frame until the next one is due (the canvas keeps
      // showing the last). Due times advance by the cap's period, so a display whose rate is
      // not a multiple of the cap (144 Hz, cap 60) still averages the cap; 1 ms of slack.
      const due = frameDue(now, this.nextDue, cap);
      if (due === null) return;
      this.nextDue = due;
      const interval = now - this.lastFrame;
      const dt = Math.min(100, interval);
      this.lastFrame = now;
      // The window was hidden (no frames are drawn then), or the view is calm (paced frames) or
      // just woke from calm: not a slow frame, and not judged by adaptive resolution.
      const paced = pace !== 'full';
      const resumed = this.resumed || (!paced && !this.paceFull);
      this.resumed = false;
      this.paceFull = !paced;
      c.tick?.(dt);
      const bg = c.background ?? BACKGROUND;
      if (bg !== this.background) this.renderer.background.color = this.background = bg;
      if (this.measureGpu && !this.countingDraws) this.countDraws();
      this.uploadPending();
      const t1 = performance.now();
      this.renderer.render(this.stage);
      const t2 = performance.now();
      let gpu = 0;
      if (this.measureGpu) {
        // Reading one pixel back waits until the GPU has drawn the frame (`finish` does not wait in Chrome),
        // so the next frame's submit time is the processor's alone and this wait is the GPU's.
        (this.renderer as unknown as { gl?: WebGLRenderingContext }).gl?.readPixels(0, 0, 1, 1, 0x1908, 0x1401, this.pixel);
        gpu = performance.now() - t2;
      }
      if (paced) this.record(interval, t1 - now, t2 - t1, gpu, this.draws, this.uploaded, true);
      else if (!resumed) {
        this.record(interval, t1 - now, t2 - t1, gpu, this.draws, this.uploaded);
        this.adaptResolution(now, interval);
      } else this.adapt.since = 0;
      this.draws = 0;
      this.uploaded = 0;
    };
    this.frame = requestAnimationFrame(step);
  }

  /**
   * Send pictures that finished loading to the GPU, a few per frame within a
   * small time budget, before any frame needs them: otherwise the first frame
   * showing a new strip (a creature's first attack) waits for the upload.
   */
  private uploadPending(): void {
    const t0 = performance.now();
    for (let n = 0; n < UPLOADS_PER_FRAME; n++) {
      const [s] = takeUploads(1);
      if (!s) return;
      this.renderer.texture.initSource(s);
      markUploaded(s);
      if (performance.now() - t0 > UPLOAD_BUDGET_MS) return;
    }
  }

  /** Benchmark only: count the draw calls the renderer issues. */
  private countDraws(): void {
    const gl = (this.renderer as unknown as { gl?: WebGL2RenderingContext }).gl;
    if (!gl) return;
    this.countingDraws = true;
    type Fn = (...a: unknown[]) => void;
    const fns = gl as unknown as Record<string, Fn | undefined>;
    const wrap = (name: string, before: (a: unknown[]) => void) => {
      const f = fns[name];
      if (typeof f !== 'function') return;
      fns[name] = (...a: unknown[]) => {
        before(a);
        f.apply(gl, a);
      };
    };
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) wrap(name, () => (this.draws += 1));
    for (const name of ['texImage2D', 'texSubImage2D']) {
      wrap(name, (a) => {
        const src = a.find((x) => x && typeof x === 'object' && 'width' in (x as object)) as { width: number; height: number } | undefined;
        const w = src ? src.width : typeof a[3] === 'number' ? a[3] : 0;
        const h = src ? src.height : typeof a[4] === 'number' ? a[4] : 0;
        this.textureUploads += 1;
        this.uploaded += w * h * 4;
      });
    }
    for (const name of ['bufferData', 'bufferSubData']) {
      wrap(name, (a) => {
        const data = (name === 'bufferData' ? a[1] : a[2]) as (ArrayBufferView & { BYTES_PER_ELEMENT?: number }) | number | undefined;
        if (typeof data !== 'object' || !data) return;
        this.uploaded += name === 'bufferSubData' && typeof a[4] === 'number' ? a[4] * (data.BYTES_PER_ELEMENT ?? 1) : data.byteLength;
      });
    }
  }

  /** Display objects under the stage (benchmark readout): all, and those that draw. */
  sceneCounts(): { objects: number; renderables: number } {
    let objects = 0;
    let renderables = 0;
    const walk = (c: Container, parentDraws = true) => {
      objects += 1;
      const draws = parentDraws && c.visible && c.renderable;
      if (draws && (c as unknown as { renderPipeId?: string }).renderPipeId) renderables += 1;
      for (const ch of c.children) walk(ch, draws);
    };
    walk(this.stage);
    return { objects, renderables };
  }

  private record(interval: number, tick: number, render: number, gpu: number, draws = 0, uploaded = 0, paced = false): void {
    const r = this.ring;
    r.paced[r.i] = paced ? 1 : 0;
    r.upload[r.i] = uploaded / 1024;
    r.at[r.i] = performance.now();
    r.draws[r.i] = draws;
    r.interval[r.i] = interval;
    r.tick[r.i] = tick;
    r.render[r.i] = render;
    r.gpu[r.i] = gpu;
    r.i = (r.i + 1) % WINDOW;
    r.n = Math.min(WINDOW, r.n + 1);
    if (paced) return;
    this.totals.frames += 1;
    if (interval > SLOW_FRAME_MS) this.totals.slow += 1;
    this.totals.worst = Math.max(this.totals.worst, interval);
  }

  /**
   * Frame timing (see `FrameStats`) over the frames drawn since `since`
   * (a `performance.now()` time; default: the last four seconds).
   */
  frameStats(since?: number): FrameStats {
    const r = this.ring;
    const from = since ?? performance.now() - RECENT_MS;
    const all: number[] = [];
    for (let k = 0; k < r.n; k++) if (r.at[k]! >= from) all.push(k);
    // Timing is judged on the frames drawn at full pace (calm, paced frames are slow on purpose).
    const idx = all.filter((k) => r.paced[k] === 0);
    const calm = all.filter((k) => r.paced[k] === 1);
    const n = idx.length;
    const mean = (a: Float32Array) => {
      let t = 0;
      for (const k of idx) t += a[k]!;
      return n ? t / n : 0;
    };
    const iv = idx.map((k) => r.interval[k]!).sort((a, b) => a - b);
    const avg = mean(r.interval);
    const span = all.length > 1 ? r.at[all[all.length - 1]!]! - r.at[all[0]!]! : 0;
    return {
      fps: avg > 0 ? 1000 / avg : 0,
      calmFrames: calm.length,
      calmShare: all.length ? calm.length / all.length : 0,
      drawnFps: span > 0 ? ((all.length - 1) * 1000) / span : 0,
      frames: n,
      slowFrames: iv.filter((v) => v > SLOW_FRAME_MS).length,
      avgMs: avg,
      p95Ms: n ? iv[Math.min(n - 1, Math.floor(n * 0.95))]! : 0,
      worstMs: n ? iv[n - 1]! : 0,
      tickMs: mean(r.tick),
      renderMs: mean(r.render),
      workMaxMs: idx.reduce((m, k) => Math.max(m, r.tick[k]! + r.render[k]!), 0),
      gpuMs: this.measureGpu ? mean(r.gpu) : null,
      drawCalls: this.measureGpu ? mean(r.draws) : null,
      uploadKb: this.measureGpu ? mean(r.upload) : null,
      total: this.totals.frames,
      slow: this.totals.slow,
      worstEverMs: this.totals.worst,
      pendingUploads: pendingUploads(),
      resolutionScale: this.adaptState.scale,
      resizes: this.resizes,
      width: this.canvas.width,
      height: this.canvas.height,
      resolution: this.renderer.resolution,
    };
  }

  /** Start counting again (the recent window and the totals). */
  resetFrameStats(): void {
    this.ring.n = 0;
    this.ring.i = 0;
    this.totals = { frames: 0, slow: 0, worst: 0 };
  }

  private stopLoop(): void {
    if (!this.frame) return;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}
