/**
 * Interface bursts for Favor on the town screen and the resource bar: coins
 * tossed up, timber and stone tumbling out, crystals rising, motes of light
 * (VFX_MAGIC_AND_FAVORS.md, divine gifts and the Temple offering). CSS
 * transforms and opacity only (no filters over the game); the caller leaves
 * them out under reduced motion. Placeholder look until the `fx.gift.*` and
 * `fx.offering.*` strips are delivered.
 */
import { useEffect, useMemo, type CSSProperties } from 'react';
import { spriteManifest, spriteUrl, type TownFxKind } from '@pr/presentation/core';

const COUNT: Record<TownFxKind, number> = { coins: 14, timber: 10, crystal: 10, anoint: 14, brood: 10, relic: 12, offering: 14 };
/** How the pieces move: tossed up and falling, flung outward, or rising. */
const MOTION: Record<TownFxKind, 'toss' | 'fling' | 'rise'> = { coins: 'toss', timber: 'fling', crystal: 'rise', anoint: 'rise', brood: 'rise', relic: 'rise', offering: 'rise' };

/**
 * One burst; calls `onDone` when it has played (about 1.6 s). With `stripId`
 * (`fx.gift.<id>`, `fx.offering.rise`) a delivered effect strip in the sprite
 * manifest plays instead of the drawn pieces.
 */
export function Burst({ kind, stripId, onDone, style, className, scale = 1 }: { kind: TownFxKind; stripId?: string; onDone?: () => void; style?: CSSProperties; className?: string; scale?: number }) {
  const strip = stripId ? spriteManifest().effects[stripId] : undefined;
  const ms = strip ? Math.round((strip.frames / Math.max(1, strip.fps)) * 1000) : 1700;
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), ms + 50);
    return () => clearTimeout(t);
    // One timer per burst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const bits = useMemo(() => {
    const n = COUNT[kind];
    const motion = MOTION[kind];
    // Fixed spread (no randomness): the same burst every time.
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.4;
      const r = (0.55 + ((i * 37) % 10) / 22) * 70 * scale;
      const dx = motion === 'rise' ? Math.cos(a) * r * 0.45 : Math.cos(a) * r;
      const up = motion === 'toss' ? -(50 + ((i * 53) % 40)) * scale : motion === 'rise' ? -(60 + ((i * 29) % 50)) * scale : Math.sin(a) * r * 0.5;
      const dy = motion === 'toss' ? (30 + ((i * 17) % 30)) * scale : motion === 'rise' ? -(90 + ((i * 31) % 60)) * scale : Math.sin(a) * r * 0.6 + 20 * scale;
      return { dx, up, dy, delay: (i * 47) % 280, rot: ((i * 71) % 360) - 180 };
    });
  }, [kind, scale]);
  if (strip) {
    const w = strip.frameWidth * scale;
    const h = strip.frameHeight * scale;
    return (
      <div className={`burst burst--${kind} ${className ?? ''}`} style={style} aria-hidden="true" data-testid={`burst-${kind}`}>
        <span
          className="burst__strip"
          style={{ width: w, height: h, left: -w * strip.anchor[0], top: -h * strip.anchor[1], backgroundImage: `url(${spriteUrl(strip.file)})`, backgroundSize: `${w * strip.frames}px ${h}px`, '--frames': strip.frames, '--fw': `${w}px`, '--dur': `${ms}ms` } as CSSProperties}
        />
      </div>
    );
  }
  return (
    <div className={`burst burst--${kind} burst--${MOTION[kind]} ${className ?? ''}`} style={style} aria-hidden="true" data-testid={`burst-${kind}`}>
      <span className="burst__glow" />
      {bits.map((b, i) => (
        <span key={i} className="burst__bit" style={{ '--dx': `${b.dx.toFixed(1)}px`, '--up': `${b.up.toFixed(1)}px`, '--dy': `${b.dy.toFixed(1)}px`, '--d': `${b.delay}ms`, '--r': `${b.rot}deg` } as CSSProperties} />
      ))}
    </div>
  );
}
