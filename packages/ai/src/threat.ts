/**
 * Shared threat helpers of the adventure AI (strategic.ts and patrol.ts):
 * a hero's strength as the AI judges it, field danger from visible enemy
 * heroes, a patrol's region and the stable tie-breaks. Works on the redacted
 * belief only (observation.ts): an enemy hero the player cannot see is not in
 * the belief, so it never counts as a danger.
 */
import {
  axialDistance,
  hexEquals,
  hexKey,
  movementBudget,
  quoteMovement,
  townGate,
  type ContentCatalog,
  type HeroState,
  type HexCoord,
  type MatchState,
  type PlayerId,
} from '@pr/rules';
import { heroPower } from './assessment';

/** A visible enemy at least this strong (relative) that can reach a tile next turn makes it dangerous. */
export const DANGER_MARGIN = 1.0;

/**
 * Tie-break for equally scored moves: a hash of the empire and the option key.
 * Ordering ties by the key alone (its coordinates) made empires on opposite
 * sides of a mirrored map prefer different directions — the west explored
 * toward the middle, the east away from it.
 */
export function tieHash(playerId: PlayerId, key: string): number {
  let h = 0x811c9dc5;
  const s = `${playerId}|${key}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function byScoreThenTie(playerId: PlayerId) {
  return (a: { score: number; key: string }, b: { score: number; key: string }) =>
    b.score - a.score || tieHash(playerId, a.key) - tieHash(playerId, b.key) || (a.key < b.key ? -1 : 1);
}

/** A hero's fighting power as the AI judges it: army, commander, skills, set and pantheon bonuses, morale, luck, magic (assessment.ts). */
export function heroStrength(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  return heroPower(catalog, state, hero);
}

/** Inside a patrol's region (its column band and, for wandering monsters, its circle); heroes without a patrol state are free. */
export function withinRegion(hero: HeroState, c: HexCoord): boolean {
  if (!hero.ai) return true;
  if (hero.ai.regionCenter && hero.ai.regionRadius !== undefined && axialDistance(hero.ai.regionCenter, c) > hero.ai.regionRadius) return false;
  return c.q >= hero.ai.regionMinQ && c.q <= hero.ai.regionMaxQ;
}

/**
 * Field danger: would a visible enemy hero at least `margin` × `strength` be
 * able to reach `stop` on its next turn? Uses only what the belief shows (the
 * enemy's visible army decides its movement budget). Heroes inside a town are
 * judged by the town threat logic instead.
 */
export function endangered(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, stop: HexCoord, strength: number, ignoreHeroId?: string, margin = DANGER_MARGIN): boolean {
  // Heroes visiting a town stand at its gate.
  const townCoords = new Set(Object.values(belief.towns).map((t) => hexKey(townGate(catalog, belief, t.id))));
  for (const e of Object.values(belief.heroes)) {
    if (e.ownerId === playerId || e.status !== 'active' || e.id === ignoreHeroId) continue;
    const theirs = heroStrength(catalog, belief, e);
    if (theirs < strength * margin) continue;
    if (townCoords.has(hexKey(e.position)) && hexEquals(e.position, stop)) continue;
    const q = quoteMovement(catalog, belief, e.id, stop);
    if (q.reachable && q.totalCost <= movementBudget(catalog, belief, e).total) return true;
  }
  return false;
}
