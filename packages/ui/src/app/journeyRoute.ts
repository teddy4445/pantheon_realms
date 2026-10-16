/**
 * Spotting a changed route of a planned journey (presentation only; handoff 2026-10-14:
 * "Path changed due to a newly visible blocker or movement modifier: recalculate legally …
 * surface a meaningful reroute/encounter change before continuation").
 *
 * The map keeps the route as the player last saw it; each time it is quoted again from the
 * hero's position, the new route is compared with the rest of the old one.
 */
import { hexKey, type HexCoord } from '@pr/rules';

/** A quoted route as the player saw it: where the hero stood, each step with its running cost, and a battle at the end. */
interface SeenRoute {
  readonly from: string;
  readonly keys: readonly string[];
  readonly costs: readonly number[];
  readonly battle: boolean;
}

export function routeSignature(from: HexCoord, q: { path: readonly HexCoord[]; stepCosts: readonly number[]; endsInEncounter: boolean }): string {
  const r: SeenRoute = { from: hexKey(from), keys: q.path.map(hexKey), costs: q.stepCosts.slice(0, q.path.length), battle: q.endsInEncounter };
  return JSON.stringify(r);
}

/**
 * Whether the route quoted now differs from the one the player saw: not merely the rest of it
 * after walking part of it (or an equally long way to the same place), but a new way, another
 * length or a battle that was not there. Presentation only.
 */
export function routeChanged(seenSig: string, nowSig: string): boolean {
  let seen: SeenRoute;
  let now: SeenRoute;
  try {
    seen = JSON.parse(seenSig) as SeenRoute;
    now = JSON.parse(nowSig) as SeenRoute;
  } catch {
    return false;
  }
  if (seen.battle !== now.battle || seen.keys[seen.keys.length - 1] !== now.keys[now.keys.length - 1]) return true;
  const at = now.from === seen.from ? -1 : seen.keys.indexOf(now.from);
  if (at === -1 && now.from !== seen.from) return true;
  const rest = seen.keys.slice(at + 1);
  if (rest.length === now.keys.length && rest.every((k, i) => k === now.keys[i])) return false;
  const left = (seen.costs[seen.costs.length - 1] ?? 0) - (at >= 0 ? (seen.costs[at] ?? 0) : 0);
  return Math.abs((now.costs[now.costs.length - 1] ?? 0) - left) > 1e-6;
}
