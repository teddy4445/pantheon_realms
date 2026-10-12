/**
 * Small helpers shared by the shared kit and the 1.1.0 frontend components
 * (kept apart so the kit's dialogs can use them without an import cycle).
 */
import type { CSSProperties, ReactNode } from 'react';
import { guiArt } from '../assets/manifest';

/** An absolute URL for a CSS custom property (a relative one resolves against the stylesheet using it). */
export function cssUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return `url("${new URL(url, document.baseURI).href}")`;
  } catch {
    return `url("${url}")`;
  }
}

/**
 * A GUI picture cut to its visible (non-transparent) box, so a 3:1 canvas with
 * wide transparent margins (logo, header plate, button face) can be sized by
 * what is painted. Keeps the native pixels; only the view box changes.
 */
export function CroppedArt({ id, alt = '', className = '', style, fallback = null, eager }: { id: string; alt?: string; className?: string; style?: CSSProperties; fallback?: ReactNode; eager?: boolean }) {
  const a = guiArt(id);
  if (!a) return <>{fallback}</>;
  const [l, t, r, b] = a.visible ?? [0, 0, 1, 1];
  const w = Math.max(0.01, r - l);
  const h = Math.max(0.01, b - t);
  const box: CSSProperties = { aspectRatio: `${(w * a.width).toFixed(1)} / ${(h * a.height).toFixed(1)}`, ...style };
  const img: CSSProperties = { left: `${(-l / w) * 100}%`, top: `${(-t / h) * 100}%`, width: `${100 / w}%`, height: `${100 / h}%` };
  return (
    <span className={`fe-crop ${className}`} style={box} data-art={id}>
      <img src={a.url} alt={alt} style={img} draggable={false} decoding="async" loading={eager ? 'eager' : 'lazy'} aria-hidden={alt ? undefined : true} />
    </span>
  );
}

