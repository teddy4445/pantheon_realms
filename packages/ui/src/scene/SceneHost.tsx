/**
 * Bridges React screens and the single long-lived Babylon EngineHost.
 *
 * <SceneViewport factory={...}/> mounts the shared canvas inside itself, asks
 * the host to show a new scene controller and disposes it on unmount. Screens
 * push view models into the controller from committed state; the controller
 * never writes back into game state.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EngineHost, type ControllerFactory, type SceneController } from '@pr/presentation';

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

/** Convert a canvas-local point to page coordinates. */
export function toPage(p: { x: number; y: number } | null): { x: number; y: number } | null {
  const canvas = host?.canvas;
  if (!p || !canvas) return null;
  const r = canvas.getBoundingClientRect();
  return { x: r.left + p.x, y: r.top + p.y };
}
let hostError: string | null = null;

/** Lazily create the one engine for this application session. */
export function getEngineHost(): EngineHost | null {
  if (host || hostError) return host;
  try {
    host = EngineHost.create();
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
}: {
  factory: ControllerFactory<T>;
  onController: (c: T | null) => void;
  className?: string;
  fallback?: ReactNode;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    const h = getEngineHost();
    if (!el || !h) {
      setError(engineError() ?? 'WebGL is unavailable');
      return;
    }
    h.mount(el);
    let ctrl: T;
    try {
      ctrl = h.show(factory);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    onController(ctrl);
    return () => {
      onController(null);
      h.release(ctrl);
      h.unmount(el);
    };
    // The factory is created once per mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className={`scene-viewport ${className}`} role="application" aria-label={label}>
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
