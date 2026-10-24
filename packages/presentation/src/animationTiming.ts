import type { SpriteStrip } from './sprites';

/** One clock for poses, contact cues and choreography. Values are presentation-only. */
export function frameDurations(name: string, strip: Pick<SpriteStrip, 'frames' | 'fps' | 'regions' | 'frameDurationsMs'>, minMs = 0): number[] {
  const n = Math.max(1, strip.regions?.length ?? strip.frames);
  const authored = strip.frameDurationsMs;
  const valid = authored?.length === n && authored.every(v => Number.isFinite(v) && v > 0);
  const natural = n / Math.max(1, strip.fps) * 1000;
  // Retiming the common six-pose attack preserves its pictures, not its old equal holds.
  const weights = valid ? [...authored] : name === 'attack' && n === 6 ? [110, 150, 60, 80, 100, 160] :
    name === 'idle' && n === 6 ? [2, 1, 1, 2, 1, 1] : Array(n).fill(1) as number[];
  const sum = weights.reduce((a,b) => a+b,0);
  const total = Math.max(minMs, valid || (name === 'attack' && n === 6) ? sum : natural);
  return weights.map(w => w / sum * total);
}
export const timelineDuration = (times: readonly number[]): number => times.reduce((a,b) => a+b,0);
/** Sample positive frame holds in milliseconds. Looping wraps negative time;
 * one-shots clamp to the first/last pose. Callers supply a non-empty timeline. */
export function timelineFrame(times: readonly number[], elapsed: number, loop: boolean): number {
  const total = timelineDuration(times);
  let t = loop ? ((elapsed % total) + total) % total : Math.max(0, elapsed);
  for (let i=0;i<times.length-1;i++) { if (t < times[i]!) return i; t -= times[i]!; }
  return times.length-1;
}
/** Millisecond offset of a pose, used to align contact cues with retimed art. */
export function frameStart(times: readonly number[], frame: number): number {
  return times.slice(0,Math.max(0,Math.min(times.length-1,Math.round(frame)))).reduce((a,b)=>a+b,0);
}
/** Stable phase in [0, 1), so idle units do not move in lockstep. This cosmetic
 * hash never consumes the match's gameplay RNG stream. */
export function stableAnimationPhase(key: string): number {
  let h=2166136261; for(const c of key) h=Math.imul(h^c.charCodeAt(0),16777619);
  return (h>>>0)/4294967296;
}
/** Grounded endpoints and a continuous pace across intervening tiles. */
export function travelProgress(t: number): number { return t*t*(3-2*t); }

/** Sample one route segment with normalized t in [0, 1]. Ease only at the whole
 * journey's endpoints; intermediate tiles retain motion instead of stop-start hops. */
export function segmentProgress(t: number, index: number, count: number): number {
  if(count===1) return travelProgress(t);
  if(index===0) return t*t*(2-t);
  if(index===count-1) return t+t*t-t*t*t;
  return t;
}
