/**
 * Bridges React screens and the single long-lived PixiJS EngineHost.
 *
 * <SceneViewport factory={...}/> mounts the shared canvas inside itself, asks
 * the host to show a new view controller and disposes it on unmount. Screens
 * push view models into the controller from committed state; the controller
 * never writes back into game state.
 *
 * The 2D layer (`@pr/presentation`, which carries PixiJS) is loaded on demand:
 * the main menu starts without it, it is fetched in the background once the
 * browser is idle, and the first map, battle or bestiary screen waits for it if
 * it is not there yet. Screens therefore receive their controller
 * asynchronously and must push their latest view when it arrives.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ControllerFactory, EngineHost, FrameStats, SceneController } from '@pr/presentation';

export type Presentation = typeof import('@pr/presentation');
type EngineOf = Parameters<ControllerFactory<SceneController>>[0];
/** Builds a view controller once the 2D layer is loaded. */
export type SceneFactory<T extends SceneController> = (lib: Presentation, engine: EngineOf, canvas: HTMLCanvasElement) => T;

let lib: Presentation | null = null;
let libLoad: Promise<Presentation> | null = null;

/** Load the 2D layer once; every later call returns the same module. */
export function loadPresentation(): Promise<Presentation> {
  libLoad ??= import('@pr/presentation').then(
    (m) => (lib = m),
    (e: unknown) => {
      libLoad = null; // allow a retry on the next map, battle or bestiary screen
      throw e;
    },
  );
  return libLoad;
}

/** The 2D layer if it is already loaded (never starts loading). */
export function presentation(): Presentation | null {
  return lib;
}

/** Fetch the 2D layer in the background when the browser is idle (called once the menu is up). */
export function preloadPresentation(): void {
  const start = () => void loadPresentation().catch(() => undefined);
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, { timeout: 2000 });
  else setTimeout(start, 300);
}

let host: EngineHost | null = null;

/**
 * Read-only projection queries (hex/cell → page coordinates) registered by the
 * active scene screen. Used for anchoring UI and by automated UI tests; they
 * never change state.
 */
export const projectors: {
  adventure?: (q: number, r: number) => { x: number; y: number } | null;
  battle?: (col: number, row: number) => { x: number; y: number } | null;
} = {};

/** Read-only view readouts for the ?e2e inspector (map avatar state, camera). Never mutate. */
export const inspectors: {
  adventure?: { heroes: () => unknown; camera: () => unknown; fx: () => unknown; ground: () => unknown; scenery: () => unknown };
  battle?: { stacks: () => unknown; fx: () => unknown; obstacles?: () => unknown };
} = {};

/** Convert a canvas-local point to page coordinates. */
export function toPage(p: { x: number; y: number } | null): { x: number; y: number } | null {
  const canvas = host?.canvas;
  if (!p || !canvas) return null;
  const r = canvas.getBoundingClientRect();
  return { x: r.left + p.x, y: r.top + p.y };
}
let hostError: string | null = null;
let hostLoad: Promise<EngineHost | null> | null = null;

/** Create the one renderer for this application session (once; later calls share it). */
function getEngineHost(p: Presentation): Promise<EngineHost | null> {
  if (host || hostError) return Promise.resolve(host);
  hostLoad ??= p.EngineHost.create().then(
    (h) => {
      // Benchmark: `?gputime` waits for the GPU after each frame to time it (costs frame rate; never set by the game).
      if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('gputime')) h.measureGpu = true;
      return (host = h);
    },
    (e: unknown) => {
      hostError = e instanceof Error ? e.message : 'WebGL is unavailable';
      return null;
    },
  );
  return hostLoad;
}

export function engineError(): string | null {
  return hostError;
}

/** Frame timing of the renderer (frame-rate readout, benchmark); null before the first map, battle or bestiary. */
export function engineFrameStats(since?: number): (FrameStats & { objects: number; renderables: number }) | null {
  return host ? { ...host.frameStats(since), ...host.sceneCounts() } : null;
}

export function SceneViewport<T extends SceneController>({
  factory,
  onController,
  className = '',
  fallback,
  label,
  cursor,
}: {
  factory: SceneFactory<T>;
  onController: (c: T | null) => void;
  className?: string;
  fallback?: ReactNode;
  label: string;
  /** CSS cursor over the view (context cursors, assets/cursors.ts); the canvas inherits it. */
  cursor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!lib || !host);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let disposed = false;
    let h: EngineHost | null = null;
    let ctrl: T | null = null;
    const start = async (p: Presentation) => {
      if (disposed) return;
      const made = await getEngineHost(p);
      if (disposed) return;
      setLoading(false);
      h = made;
      if (!h) {
        setError(engineError() ?? 'WebGL is unavailable');
        return;
      }
      h.mount(el);
      try {
        ctrl = h.show((engine, canvas) => factory(p, engine, canvas));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return;
      }
      onController(ctrl);
    };
    if (lib) void start(lib);
    else
      loadPresentation().then(start, (e: unknown) => {
        if (disposed) return;
        setLoading(false);
        setError(`The view could not be loaded (${e instanceof Error ? e.message : String(e)}).`);
      });
    return () => {
      disposed = true;
      if (h && ctrl) {
        onController(null);
        h.release(ctrl);
      }
      if (h) h.unmount(el);
    };
    // The factory is created once per mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className={`scene-viewport ${className}`} role="application" aria-label={label} aria-busy={loading || undefined} style={cursor ? { cursor } : undefined} data-cursor={cursor ? 'context' : undefined}>
      {loading && !error ? <div className="scene-loading">Loading…</div> : null}
      {error ? (
        <div className="scene-error panel">
          <strong>View unavailable.</strong> {error}
          {fallback}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Global notice when the GPU context is lost (the engine restores automatically
 * when possible), and the frame-rate readout over the map and battle when
 * Settings → Display → Frame rate is on.
 */
export function SceneHostLayer({ showFrameRate = false }: { showFrameRate?: boolean }) {
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setLost(!!host?.contextLost), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      {lost ? <div className="scene-lost panel">Graphics context lost — waiting for the GPU to recover…</div> : null}
      {showFrameRate ? <FrameRateReadout /> : null}
    </>
  );
}

/**
 * Frames per second over the last four seconds, the slowest frame among them,
 * and how many frames since the view opened took longer than 1/30 s.
 */
function FrameRateReadout() {
  const [s, setS] = useState<FrameStats | null>(null);
  useEffect(() => {
    const t = setInterval(() => setS(host?.current ? host.frameStats() : null), 500);
    return () => clearInterval(t);
  }, []);
  if (!s || s.total === 0) return null;
  const low = s.fps > 0 && s.fps < 30;
  return (
    <div className={`frame-rate${low ? ' frame-rate--low' : ''}`} data-testid="frame-rate" aria-hidden="true">
      <strong>{Math.round(s.fps)} fps</strong>
      <span>slowest {Math.round(s.worstMs)} ms</span>
      <span>
        below 30 fps: {s.slow} of {s.total.toLocaleString('en-GB')}
      </span>
      {s.resolutionScale < 0.999 ? <span>resolution {Math.round(s.resolutionScale * 100)} %</span> : null}
    </div>
  );
}
