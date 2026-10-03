/**
 * Bridges React screens and the single long-lived Babylon EngineHost.
 *
 * <SceneViewport factory={...}/> mounts the shared canvas inside itself, asks
 * the host to show a new scene controller and disposes it on unmount. Screens
 * push view models into the controller from committed state; the controller
 * never writes back into game state.
 *
 * The 3D layer (`@pr/presentation`, which carries Babylon.js) is loaded on
 * demand: the main menu starts without it, it is fetched in the background once
 * the browser is idle, and the first 3D screen waits for it if it is not there
 * yet. Screens therefore receive their controller asynchronously and must push
 * their latest view when it arrives.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ControllerFactory, EngineHost, SceneController } from '@pr/presentation';

export type Presentation = typeof import('@pr/presentation');
type EngineOf = Parameters<ControllerFactory<SceneController>>[0];
/** Builds a scene controller once the 3D layer is loaded. */
export type SceneFactory<T extends SceneController> = (lib: Presentation, engine: EngineOf, canvas: HTMLCanvasElement) => T;

let lib: Presentation | null = null;
let libLoad: Promise<Presentation> | null = null;

/** Load the 3D layer once; every later call returns the same module. */
export function loadPresentation(): Promise<Presentation> {
  libLoad ??= import('@pr/presentation').then(
    (m) => (lib = m),
    (e: unknown) => {
      libLoad = null; // allow a retry on the next 3D screen
      throw e;
    },
  );
  return libLoad;
}

/** The 3D layer if it is already loaded (never starts loading). */
export function presentation(): Presentation | null {
  return lib;
}

/** Fetch the 3D layer in the background when the browser is idle (called once the menu is up). */
export function preloadPresentation(): void {
  const start = () =>
    void loadPresentation()
      .then((p) => p.warmShaderImports())
      .catch(() => undefined);
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

/** Read-only scene readouts for the ?e2e inspector (hero animation state, camera pose). Never mutate. */
export const inspectors: {
  adventure?: { heroes: () => unknown; camera: () => unknown };
} = {};

/** Convert a canvas-local point to page coordinates. */
export function toPage(p: { x: number; y: number } | null): { x: number; y: number } | null {
  const canvas = host?.canvas;
  if (!p || !canvas) return null;
  const r = canvas.getBoundingClientRect();
  return { x: r.left + p.x, y: r.top + p.y };
}
let hostError: string | null = null;

/** Lazily create the one engine for this application session. */
function getEngineHost(p: Presentation): EngineHost | null {
  if (host || hostError) return host;
  try {
    host = p.EngineHost.create();
  } catch (e) {
    hostError = e instanceof Error ? e.message : 'WebGL is unavailable';
  }
  return host;
}

export function engineError(): string | null {
  return hostError;
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
  /** CSS cursor over the 3D view (context cursors, assets/cursors.ts); the canvas inherits it. */
  cursor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!lib);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let disposed = false;
    let h: EngineHost | null = null;
    let ctrl: T | null = null;
    const start = (p: Presentation) => {
      if (disposed) return;
      setLoading(false);
      h = getEngineHost(p);
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
    if (lib) start(lib);
    else
      loadPresentation().then(start, (e: unknown) => {
        if (disposed) return;
        setLoading(false);
        setError(`The 3D view could not be loaded (${e instanceof Error ? e.message : String(e)}).`);
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
      {loading && !error ? <div className="scene-loading">Loading the 3D view…</div> : null}
      {error ? (
        <div className="scene-error panel">
          <strong>3D view unavailable.</strong> {error}
          {fallback}
        </div>
      ) : null}
    </div>
  );
}

/** Global notice when the GPU context is lost (the engine restores automatically when possible). */
export function SceneHostLayer() {
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setLost(!!host?.contextLost), 1000);
    return () => clearInterval(t);
  }, []);
  return lost ? <div className="scene-lost panel">Graphics context lost — waiting for the GPU to recover…</div> : null;
}
