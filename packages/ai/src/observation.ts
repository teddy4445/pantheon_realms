/**
 * ObservationBuilder: produces the AI's *belief state* — a redacted copy of
 * MatchState containing only what `playerId` may legally know.
 *
 * Hidden enemy heroes, unexplored sites, other players' wallets and fog are
 * removed BEFORE the planner runs, so the planner can safely reuse the shared
 * rules resolvers (pathfinding, quotes) without omniscience.
 *
 * Scouting intel (scenario feature `scoutingIntelV1`): the belief about an enemy
 * hero or wandering monster in view follows the same projection a human gets
 * (`armyIntel`) — its exact army is replaced by an estimate built ONLY from what
 * the stage permits (`estimatedArmy`), so every strength judgement of the planner
 * (`heroPower`, `endangered`, sieges, patrols) reads the estimate. Other players'
 * snapshots, the statistics of their armies and the casualty lines of battles this
 * player did not fight are removed too. With the feature off the belief is as before.
 */
import {
  activeIntelPolicy,
  armyIntel,
  cellIndex,
  deepClone,
  hireOptions,
  intelVision,
  visibleCells,
  type ArmyIntel,
  type ContentCatalog,
  type CreatureStackState,
  type HireCandidate,
  type IntelCountRange,
  type MatchState,
  type PlayerId,
  type ScoutingIntelPolicy,
  requireScenarioMission,
} from '@pr/rules';
import { redactCaravans } from './caravans';

export interface AIObservation {
  readonly playerId: PlayerId;
  readonly revision: number;
  readonly belief: MatchState;
  /**
   * The Tavern roster of each of the player's own towns, exactly as the Tavern
   * screen shows it to a human owner. Computed from the true state because the
   * belief hides unseen heroes, and a hidden enemy hero would otherwise look
   * hireable (the rules then refuse the hire).
   */
  readonly hireRoster: Readonly<Record<string, readonly HireCandidate[]>>;
}

/** Risk-aware prior from public bounds only: upper fifth of a finite range, or the configured open-range prior. */
export function rangeEstimate(policy: ScoutingIntelPolicy, range: IntelCountRange): number {
  return range.max === null ? Math.round(range.min * policy.openRangeEstimateFactor) : Math.ceil(range.min + (range.max - range.min) * 0.8);
}

const goldOf = (catalog: ContentCatalog, id: string) => Math.max(1, catalog.creatures[id]?.cost?.gold ?? 100);

/**
 * The stand-in army the belief gives an enemy army seen at `intel`'s stage — deterministic,
 * from permitted knowledge only (documented priors, proposed values):
 *  - scouted: each identified creature at its range's estimate (`rangeEstimate`);
 *  - identified: the band's representative Gold value (`bandEstimateGold`) shared equally in
 *    Gold among the identified types (at least one creature each);
 *  - sighting: that Gold value as the creature a wandering monster band is drawn as (its map
 *    figure), or, for a hero, as a typical army of its owner's pantheon (tiers 1–5, base forms,
 *    in proportion to their weekly growth — the public roster).
 * Full information (own armies, or the feature off) keeps the army as it is.
 */
export function estimatedArmy(catalog: ContentCatalog, state: MatchState, intel: ArmyIntel): { creatureId: string; count: number }[] {
  const policy = activeIntelPolicy(catalog, state);
  const lines = intel.creatures ?? [];
  if (intel.stage === 'full' || !policy) return lines.map((l) => ({ creatureId: l.creatureId, count: l.count ?? 0 })).filter((s) => s.count > 0);
  if (intel.stage === 'scouted') return lines.map((l) => ({ creatureId: l.creatureId, count: l.range ? rangeEstimate(policy, l.range) : 1 }));
  const gold = policy.bandEstimateGold[intel.strengthBand ?? 0] ?? 0;
  if (intel.stage === 'identified' && lines.length > 0) {
    const share = gold / lines.length;
    return lines.map((l) => ({ creatureId: l.creatureId, count: Math.max(1, Math.round(share / goldOf(catalog, l.creatureId))) }));
  }
  // Sighting: types unknown.
  if (intel.figureCreatureId) return [{ creatureId: intel.figureCreatureId, count: Math.max(1, Math.round(gold / goldOf(catalog, intel.figureCreatureId))) }];
  const pantheonId = state.players[intel.ownerId]?.pantheonId;
  const roster: { creatureId: string; growth: number }[] = [];
  for (const r of (pantheonId ? catalog.pantheons[pantheonId]?.roster : undefined) ?? []) {
    const fam = catalog.families[r.familyId];
    if (fam && fam.tier <= 5 && catalog.creatures[fam.baseCreatureId]?.stats) roster.push({ creatureId: fam.baseCreatureId, growth: Math.max(1, fam.baseGrowth) });
  }
  if (roster.length === 0) return [];
  const weekGold = roster.reduce((n, r) => n + r.growth * goldOf(catalog, r.creatureId), 0);
  const scale = gold / weekGold;
  const out = roster.map((r) => ({ creatureId: r.creatureId, count: Math.round(r.growth * scale) })).filter((s) => s.count > 0);
  return out.length > 0 ? out : [{ creatureId: roster[0]!.creatureId, count: 1 }];
}

/** The belief's army slots for an estimate (seven slots, stable stack IDs). */
function estimateSlots(heroId: string, stacks: readonly { creatureId: string; count: number }[]): (CreatureStackState | null)[] {
  const slots: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  stacks.slice(0, slots.length).forEach((s, i) => (slots[i] = { stackId: `intel:${heroId}:${i}`, creatureId: s.creatureId, count: s.count }));
  return slots;
}

export function buildObservation(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): AIObservation {
  const belief = deepClone(state);
  const map = belief.world.map;
  const visible = visibleCells(catalog, state, playerId);
  const fog = belief.fog[playerId];
  const explored = (q: number, r: number) => !fog || fog.explored[cellIndex(map, { q, r })] === 1;
  const intelOn = activeIntelPolicy(catalog, state) !== null;
  const vision = intelOn ? intelVision(catalog, state, playerId, visible) : null;

  for (const [id, hero] of Object.entries(belief.heroes)) {
    if (hero.ownerId === playerId) continue;
    // Private spell notes, destinations and daily quotas never enter a rival's belief.
    delete hero.libraryAdventure;
    if (!visible.has(cellIndex(map, hero.position)) || hero.status !== 'active') {
      delete belief.heroes[id];
      continue;
    }
    if (vision) {
      // What the player may know of this army now (the same projection as the map's panels).
      const intel = armyIntel(catalog, state, playerId, id, vision);
      if (intel && intel.stage !== 'full') hero.army = { slots: estimateSlots(id, estimatedArmy(catalog, state, intel)) };
    }
  }
  if (belief.world.signals) belief.world.signals = belief.world.signals.filter((s) => s.ownerId === playerId || visible.has(cellIndex(map, s.coord))).map((s) => ({ ...s, ownerId: s.ownerId === playerId ? playerId : '__unknown__', identifiedBy: s.identifiedBy.includes(playerId) ? [playerId] : [] }));
  // Recruitment caravans: another empire's only while seen, its cargo the permitted estimate, never its route or destination.
  redactCaravans(catalog, state, belief, playerId, visible, vision);
  // Ships (navalMovementV1): the player's own; empty hulls on explored tiles (they stay put, like
  // sites); occupied ones only while their hero is in view (like heroes).
  const ships = belief.world.ships;
  if (ships) {
    for (const [id, ship] of Object.entries(ships)) {
      if (ship.ownerId === playerId && (!ship.heroId || belief.heroes[ship.heroId])) continue;
      const keep = ship.heroId ? !!belief.heroes[ship.heroId] : explored(ship.coord.q, ship.coord.r);
      if (!keep) delete ships[id];
    }
  }
  for (const [id, p] of Object.entries(belief.players)) {
    if (id !== playerId) { p.wallet = { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 }; delete p.libraryEconomy; }
  }
  for (const id of Object.keys(belief.fog)) if (id !== playerId) delete belief.fog[id];
  if (belief.seaWatch) for (const id of Object.keys(belief.seaWatch)) if (id !== playerId) delete belief.seaWatch[id];
  if (intelOn) {
    // Only the player's own last-known reports; no other empire's army statistics or battle lines.
    if (belief.intel) belief.intel = belief.intel[playerId] ? { [playerId]: belief.intel[playerId]! } : {};
    const r = belief.lastBattleResult;
    if (r && r.attacker.playerId !== playerId && r.defender.playerId !== playerId) belief.lastBattleResult = null;
    if (belief.stats) {
      belief.stats = {
        timeline: belief.stats.timeline.map((d) => ({ day: d.day, players: d.players[playerId] ? { [playerId]: d.players[playerId]! } : {} })),
        totals: belief.stats.totals[playerId] ? { [playerId]: belief.stats.totals[playerId]! } : {},
      };
    }
  }
  const mission = requireScenarioMission(catalog, belief);
  for (const def of mission.sites) {
    const known = explored(def.coord.q, def.coord.r) || belief.mission.revealedSiteIds.includes(def.id);
    if (!known) delete belief.world.sites[def.id];
  }
  for (const town of Object.values(belief.towns)) {
    if (town.ownerId === playerId) continue;
    if (!visible.has(cellIndex(map, town.coord))) town.garrison = { slots: town.garrison.slots.map(() => null) };
  }
  belief.pendingDecisions = belief.pendingDecisions.filter((d) => belief.heroes[d.heroId]?.ownerId === playerId);
  const hireRoster: Record<string, readonly HireCandidate[]> = {};
  for (const town of Object.values(state.towns)) if (town.ownerId === playerId) hireRoster[town.id] = hireOptions(catalog, state, playerId, town.id);
  return { playerId, revision: state.revision, belief, hireRoster };
}
