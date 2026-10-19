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
import type { HeroState, MatchState, TownState } from '../state/match';
import { axialDistance, axialNeighbors } from '../core/hex';
import { cellIndex, inMap, heroInTown, townVisitor, townGate } from '../resolvers/world';
import { heroVisionRadius } from '../resolvers/heroes';
import { heroShip } from '../resolvers/naval';
import { reject, type Tx } from '../engine/tx';
import { revealAround } from './adventure';
import { learnSpellsAtTown } from './heroes';
import { scopeAllowed } from '../resolvers/scenario';
import { libraryAdventureCost } from '../resolvers/libraryAdventure';
import { anchorProblem, boatCallPlan, compactSite, pilgrimageTown } from '../resolvers/libraryTravel';
import { courierPlan, sendCourier, type CourierChoice } from './libraryCourier';
import { decoyProblem } from './librarySignals';
import { libraryReportPlan } from './libraryReports';
import { facingBetween } from '../resolvers/naval';

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
    .filter((s): s is SpellDefinition => !!s && s.context === 'adventure' && s.implementationStatus === 'implemented' && scopeAllowed(state, s.scope));
}

export function quoteAdventureSpell(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  heroId: HeroId,
  spellId: SpellId,
  target: HexCoord | null,
  choice: CourierChoice = {},
): AdventureSpellQuote {
  const spell = catalog.spells[spellId] ?? null;
  const radius = spell?.effect.type === 'reveal_radius' ? spell.effect.radius : 0;
  const hero = state.heroes[heroId];
  const liveAnchor = hero?.libraryAdventure?.anchor && hero.libraryAdventure.anchor.untilDay > state.day;
  const baseCost = spell?.effect.type === 'adventure_anchor' ? (liveAnchor ? spell.effect.returnCost : spell.effect.markCost) : spell?.manaCost ?? 0;
  const manaCost = hero ? libraryAdventureCost(catalog, state, hero, baseCost) : baseCost;
  const fail = (reason: string): AdventureSpellQuote => ({ legal: false, reason, spell, manaCost, radius });
  if (!hero || hero.ownerId !== playerId) return fail('Not your hero');
  if (hero.status !== 'active') return fail(`${hero.name} is not on the map`);
  if (!spell) return fail('Unknown spell');
  if (!scopeAllowed(state, spell.scope)) return fail('This spell is not part of this scenario');
  const kind = spell.effect.type;
  if (spell.context !== 'adventure' || (kind !== 'reveal_radius' && kind !== 'movement_bonus' && kind !== 'recall' && !kind.startsWith('adventure_'))) return fail('Not an adventure spell');
  if (spell.implementationStatus !== 'implemented') return fail('This spell is not available in this build');
  if (!hero.spellbook) return fail('Requires a spellbook');
  if (!hero.knownSpellIds.includes(spellId)) return fail(`${hero.name} has not learned ${spell.name}`);
  if (state.pendingDecisions.some((d) => d.heroId === heroId)) return fail('Resolve the pending level-up first');
  if (hero.mana < manaCost) return fail(`Requires ${manaCost} mana`);
  if (spell.effect.type === 'adventure_camp' || spell.effect.type === 'adventure_boatcall' || spell.effect.type === 'adventure_compact' || spell.effect.type === 'adventure_travel_buff') {
    if (hero.libraryAdventure?.usedDays?.[spell.id] === state.day) return fail('Already used today');
  }
  if (spell.effect.type === 'adventure_anchor') {
    const problem = anchorProblem(catalog, state, hero, spell.effect.range);
    if (problem) return fail(problem);
  }
  if (spell.effect.type === 'adventure_compact') {
    if (target ? !compactSite(catalog, state, hero, target) : ![hero.position, ...axialNeighbors(hero.position)].some((c) => compactSite(catalog, state, hero, c))) return fail('Choose an adjacent, explored neutral hiring site with defeated guards');
  }
  if (spell.effect.type === 'adventure_boatcall') {
    if (target && !boatCallPlan(catalog, state, hero, target, spell.effect.steps)) return fail('Choose an owned empty ship with an explored, clear water route of at most eight steps to your shore');
    if (!target && !Object.values(state.world.ships ?? {}).some((s) => boatCallPlan(catalog, state, hero, s.coord, spell.effect.type === 'adventure_boatcall' ? spell.effect.steps : 0))) return fail('No owned empty ship can reach your shore');
  }
  if (spell.effect.type === 'adventure_decoy' && target) {
    const problem = decoyProblem(catalog, state, hero, target, spell.effect.range);
    if (problem) return fail(problem);
  }
  if (spell.effect.type === 'adventure_courier') {
    const problem = courierPlan(catalog, state, hero, choice).problem;
    if (problem) return fail(problem);
  }
  if (spell.effect.type === 'adventure_travel_buff') {
    if (spell.effect.discount.terrain === 'sea' && !heroShip(state, hero.id)) return fail('Board a ship before calling a sailing wind');
    if (spell.effect.toTown && (target ? !pilgrimageTown(catalog, state, hero, target) : !Object.values(state.towns).some((t) => pilgrimageTown(catalog, state, hero, t.coord)))) return fail('Choose a visited owned town reached by an explored, open land route');
  }
  if (spell.effect.type === 'adventure_report') {
    const problem = libraryReportPlan(catalog, state, hero, spell.effect, target).problem;
    if (problem) return fail(problem);
  }
  if (kind === 'reveal_radius' && target) {
    const map = state.world.map;
    if (!inMap(map, target)) return fail('Choose a tile on the map');
    const fog = state.fog[playerId];
    if (fog && fog.explored[cellIndex(map, target)] !== 1) return fail('Choose a tile you have already explored');
  }
  if (kind === 'recall') {
    // Never from a ship: the hero lands first (navalMovementV1; no land teleport from the sea).
    if (heroShip(state, heroId)) return fail(`${hero.name} is at sea: go ashore before casting Recall`);
    const town = recallTown(state, hero);
    if (!town) return fail('No town of yours to return to');
    if (heroInTown(catalog, state, hero, town.id)) return fail(`${hero.name} is already in ${town.name}`);
    if (townVisitor(catalog, state, town.id, hero.id)) return fail(`Another hero stands in ${town.name}`);
  }
  return { legal: true, reason: null, spell, manaCost, radius };
}

/** The town a Recall spell returns to: the nearest town the hero's player owns (stable ID tie-break). */
export function recallTown(state: MatchState, hero: HeroState): TownState | null {
  let best: TownState | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const t of Object.values(state.towns).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (t.ownerId !== hero.ownerId) continue;
    const d = axialDistance(t.coord, hero.position);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

export function commitCastAdventureSpell(tx: Tx, heroId: HeroId, spellId: SpellId, target: HexCoord, choice: CourierChoice = {}): void {
  const q = quoteAdventureSpell(tx.catalog, tx.state, tx.actorId, heroId, spellId, target, choice);
  if (!q.legal || !q.spell) reject(q.reason?.startsWith('Requires') ? 'insufficient_resources' : 'illegal_action', q.reason ?? 'Cannot cast');
  const hero = tx.state.heroes[heroId]!;
  hero.mana -= q.manaCost;
  if (tx.state.scenario.features?.mythicLibraryV2) {
    const a = hero.libraryAdventure ??= {};
    a.casts = { day: tx.state.day, count: (a.casts?.day === tx.state.day ? a.casts.count : 0) + 1 };
  }
  const untilDay = tx.state.day + 1;
  const effect = q.spell.effect;
  if (effect.type === 'adventure_decoy') {
    const id = `foxfire:${heroId}`;
    tx.state.world.signals = [...(tx.state.world.signals ?? []).filter((s) => s.id !== id && s.untilDay > tx.state.day), { id, ownerId: hero.ownerId, coord: { ...target }, untilDay: tx.state.day + effect.days, identifiedBy: [hero.ownerId] }];
    tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: { ...target }, radius: 0, untilDay: tx.state.day + effect.days });
    return;
  }
  if (effect.type === 'adventure_courier') {
    sendCourier(tx, hero, choice);
    tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: { ...hero.position }, radius: 0, untilDay });
    return;
  }
  if (effect.type === 'adventure_travel_buff') {
    const a = hero.libraryAdventure ??= {};
    (a.usedDays ??= {})[spellId] = tx.state.day;
    const town = effect.toTown ? pilgrimageTown(tx.catalog, tx.state, hero, target)! : null;
    a.travelBuffs = [...(a.travelBuffs ?? []).filter((b) => b.day === tx.state.day && b.spellId !== spellId), { spellId, day: tx.state.day, discount: { ...effect.discount }, ...(town ? { townId: town.id } : {}) }];
    tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: { ...target }, radius: 0, untilDay });
    return;
  }
  if (effect.type === 'adventure_report') {
    const entries = libraryReportPlan(tx.catalog, tx.state, hero, effect, target).entries;
    const a = hero.libraryAdventure ??= {};
    a.reports = [...(a.reports ?? []).filter((r) => r.untilDay > tx.state.day && r.spellId !== spellId), { spellId, day: tx.state.day, untilDay: tx.state.day + effect.days, entries }];
    tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: { ...target }, radius: 0, untilDay: tx.state.day + effect.days });
    return;
  }
  if (effect.type === 'adventure_compact') {
    const site = compactSite(tx.catalog, tx.state, hero, target)!;
    const a = hero.libraryAdventure ??= {};
    (a.usedDays ??= {})[spellId] = tx.state.day;
    a.compact = { siteId: site.def.id, day: tx.state.day, percent: effect.percent, cap: effect.cap };
    tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: target, radius: 0, untilDay });
    return;
  }
  if (effect.type === 'adventure_camp') {
    const a = hero.libraryAdventure ??= {};
    (a.usedDays ??= {})[spellId] = tx.state.day;
    a.camp = { day: tx.state.day, mana: effect.mana, battleSinceCast: false };
    hero.movementPoints = 0;
    tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: { ...hero.position }, radius: 0, untilDay });
    return;
  }
  if (effect.type === 'adventure_anchor') {
    const a = hero.libraryAdventure ??= {};
    if (a.anchor && a.anchor.untilDay > tx.state.day) {
      const from = { ...hero.position }, to = { ...a.anchor.coord };
      hero.position = to; hero.movementPoints = 0; delete a.anchor;
      tx.emit({ kind: 'HeroTeleported', heroId, from, to });
      revealAround(tx, hero.ownerId, [to], heroVisionRadius(tx.catalog, hero, tx.state));
    } else a.anchor = { coord: { ...hero.position }, untilDay: tx.state.day + effect.days };
    tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: { ...hero.position }, radius: 0, untilDay: tx.state.day + effect.days });
    return;
  }
  if (effect.type === 'adventure_boatcall') {
    const plan = boatCallPlan(tx.catalog, tx.state, hero, target, effect.steps)!;
    const from = { ...plan.ship.coord }, to = plan.path[plan.path.length - 1]!;
    plan.ship.coord = { ...to }; plan.ship.facing = facingBetween(plan.path[plan.path.length - 2] ?? from, to);
    const a = hero.libraryAdventure ??= {};
    (a.usedDays ??= {})[spellId] = tx.state.day;
    tx.emit({ kind: 'EmptyShipCalled', heroId, shipId: plan.ship.shipId, path: plan.path });
    tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: to, radius: 0, untilDay });
    return;
  }
  if (effect.type === 'movement_bonus') {
    hero.movementPoints += effect.points;
    tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: { ...hero.position }, radius: 0, untilDay });
    return;
  }
  if (effect.type === 'recall') {
    const town = recallTown(tx.state, hero)!;
    const from = { ...hero.position };
    const gate = townGate(tx.catalog, tx.state, town.id);
    hero.position = { ...gate };
    hero.movementPoints = 0;
    tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: from, radius: 0, untilDay });
    tx.emit({ kind: 'HeroTeleported', heroId, from, to: { ...gate } });
    revealAround(tx, hero.ownerId, [gate], heroVisionRadius(tx.catalog, hero, tx.state));
    learnSpellsAtTown(tx, hero, town);
    return;
  }
  const fog = tx.state.fog[hero.ownerId];
  if (fog) {
    fog.temporaryReveals = [...(fog.temporaryReveals ?? []), { center: { q: target.q, r: target.r }, radius: q.radius, untilDay }];
  }
  revealAround(tx, hero.ownerId, [target], q.radius);
  tx.emit({ kind: 'AdventureSpellCast', heroId, spellId, center: { q: target.q, r: target.r }, radius: q.radius, untilDay });
}

/** Dawn cleanup: drop expired temporary vision. */
export function expireTemporaryVision(state: MatchState): void {
  for (const fog of Object.values(state.fog)) {
    if (!fog.temporaryReveals) continue;
    fog.temporaryReveals = fog.temporaryReveals.filter((r) => r.untilDay > state.day);
  }
}
