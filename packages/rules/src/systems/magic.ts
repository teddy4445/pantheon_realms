/**
 * Adventure-map spellcasting (heroes/05 "Spells"): Divine Sight.
 *
 * A hero with a spellbook who knows an adventure spell pays its mana to reveal
 * a radius around an already-explored tile. The revealed cells become explored
 * and count as live vision for that player until the next dawn. Temporary
 * vision is stored per player in the fog state, so saves and AI belief states
 * see exactly the same thing.
 */
import type { HeroId, PlayerId, SpellId } from '../ids';
import type { HexCoord } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import type { SpellDefinition } from '../definitions/pantheons';
import type { MatchState } from '../state/match';
import { cellIndex, cellsWithin, inMap } from '../resolvers/world';
import { reject, type Tx } from '../engine/tx';
import { revealAround } from './adventure';

export interface AdventureSpellQuote {
  readonly legal: boolean;
  readonly reason: string | null;
  readonly spell: SpellDefinition | null;
  readonly manaCost: number;
  readonly radius: number;
}

/** Adventure spells the hero knows (castable or not), for the adventure-map spell menu. */
export function adventureSpellsOf(catalog: ContentCatalog, state: MatchState, heroId: HeroId): SpellDefinition[] {
  const hero = state.heroes[heroId];
  if (!hero?.spellbook) return [];
  return hero.knownSpellIds
    .map((id) => catalog.spells[id])
    .filter((s): s is SpellDefinition => !!s && s.context === 'adventure' && s.implementationStatus === 'implemented');
}

export function quoteAdventureSpell(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  heroId: HeroId,
  spellId: SpellId,
  target: HexCoord | null,
): AdventureSpellQuote {
  const spell = catalog.spells[spellId] ?? null;
  const radius = spell?.effect.type === 'reveal_radius' ? spell.effect.radius : 0;
  const manaCost = spell?.manaCost ?? 0;
  const fail = (reason: string): AdventureSpellQuote => ({ legal: false, reason, spell, manaCost, radius });
  const hero = state.heroes[heroId];
  if (!hero || hero.ownerId !== playerId) return fail('Not your hero');
  if (hero.status !== 'active') return fail(`${hero.name} is not on the map`);
  if (!spell) return fail('Unknown spell');
  if (spell.context !== 'adventure' || spell.effect.type !== 'reveal_radius') return fail('Not an adventure spell');
  if (spell.implementationStatus !== 'implemented') return fail('This spell is not available in this build');
  if (!hero.spellbook) return fail('Requires a spellbook');
  if (!hero.knownSpellIds.includes(spellId)) return fail(`${hero.name} has not learned ${spell.name}`);
  if (state.pendingDecisions.some((d) => d.heroId === heroId)) return fail('Resolve the pending level-up first');
  if (hero.mana < spell.manaCost) return fail(`Requires ${spell.manaCost} mana`);
  if (target) {
    const map = state.world.map;
    if (!inMap(map, target)) return fail('Choose a tile on the map');
    const fog = state.fog[playerId];
    if (fog && fog.explored[cellIndex(map, target)] !== 1) return fail('Choose a tile you have already explored');
  }
  return { legal: true, reason: null, spell, manaCost, radius };
}

export function commitCastAdventureSpell(tx: Tx, heroId: HeroId, spellId: SpellId, target: HexCoord): void {
  const q = quoteAdventureSpell(tx.catalog, tx.state, tx.actorId, heroId, spellId, target);
  if (!q.legal || !q.spell) reject(q.reason?.startsWith('Requires') ? 'insufficient_resources' : 'illegal_action', q.reason ?? 'Cannot cast');
  const hero = tx.state.heroes[heroId]!;
  hero.mana -= q.manaCost;
  const untilDay = tx.state.day + 1;
  const fog = tx.state.fog[hero.ownerId];
  if (fog) {
    fog.temporaryReveals = [...(fog.temporaryReveals ?? []), { center: { q: target.q, r: target.r }, radius: q.radius, untilDay }];
  }
  revealAround(tx, hero.ownerId, [target], q.radius);
  tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: { q: target.q, r: target.r }, radius: q.radius, untilDay });
}

/** Cells lit by a player's active temporary reveals (Divine Sight) on the current day. */
export function temporaryVisionCells(state: MatchState, playerId: PlayerId): HexCoord[] {
  const fog = state.fog[playerId];
  const out: HexCoord[] = [];
  for (const r of fog?.temporaryReveals ?? []) {
    if (r.untilDay <= state.day) continue;
    out.push(...cellsWithin(state.world.map, r.center, r.radius));
  }
  return out;
}

/** Dawn cleanup: drop expired temporary vision. */
export function expireTemporaryVision(state: MatchState): void {
  for (const fog of Object.values(state.fog)) {
    if (!fog.temporaryReveals) continue;
    fog.temporaryReveals = fog.temporaryReveals.filter((r) => r.untilDay > state.day);
  }
}
