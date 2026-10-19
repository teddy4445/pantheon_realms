import { allied } from './coalition';
import { movementPricing, movementLedger, priceMovementStep, priceMovementPath, libraryTravelClock } from '../resolvers/libraryMovement';
/**
 * AdventureSystem: hero movement, fog reveal, site interaction and activation.
 *
 * Route previews and committed movement use the same pathfinder and edge costs.
 * A guarded destination requires explicit encounter confirmation; the hero pays
 * the final edge as the battle begins (heroes/05 "Adventure movement").
 */
import { changeTownOwner } from './ownership';
import type { HeroId, PlayerId, SiteId } from '../ids';
import { hexEquals, type HexCoord } from '../core/hex';
import { canAfford, resources, type ResourceBundle } from '../core/resources';
import type { ContentCatalog } from '../definitions/catalog';
import type { SiteDefinition } from '../definitions/world';
import type { HeroState, MatchState, TownState } from '../state/match';
import { evaluateAll } from '../resolvers/requirements';
import { heroVisionRadius, movementBudget, heroEffects } from '../resolvers/heroes';
import { cellIndex, cellsWithin, findHeroPath, heroAt, missionSite, movementTarget, siteAt, townGate, type PathResult } from '../resolvers/world';
import { reject, type Tx } from '../engine/tx';
import { spend } from './economy';
import { learnSpellsAtTown } from './heroes';
import { grantReward, MISSION_VICTORY_FLAG, setFlag } from './quests';
import { startBattle } from './battle/factory';
import { bumpTotal } from './stats';
import { quoteNeutralReaction, resolveNeutralReaction, visitWorldSite } from './sites';
import { scenarioMission } from '../resolvers/scenario';
import { enemyCaravanAt } from '../resolvers/caravans';
import { caravanEncounterLabel, startCaravanInterception } from './caravans';
import { heroShip, navalEnabled, planVoyage, type TravelMode, type VoyagePlan, type VoyageTransition } from '../resolvers/naval';
import { followShip } from './naval';
import { beginAtSea } from './seaEncounter';
import { arriveAtSeaSite } from './seaSites';

export interface MovementQuote extends PathResult {
  /** Index of the last step reachable today (-1 when none). */
  readonly stopIndex: number;
  readonly reachesDestinationToday: boolean;
  readonly encounterLabel: string | null;
  readonly movementPoints: number;
  /** The mode this leg moves in (navalMovementV1): 'sea' while the hero is aboard a ship. Absent = land. */
  readonly mode?: TravelMode;
  /**
   * A mixed land/sea route (`quoteTravel`): the embark or disembark step that ends this leg. The
   * commit stops there; EmbarkHero / DisembarkHero confirms it (never automatic). Absent or null:
   * the leg reaches the destination.
   */
  readonly transition?: VoyageTransition | null;
  /** The whole mixed-mode plan (every leg and transition), for route display, day counts and the AI. */
  readonly voyage?: VoyagePlan | null;
}

export function quoteMovement(catalog: ContentCatalog, state: MatchState, heroId: HeroId, dest: HexCoord): MovementQuote {
  // A town's own tile means its gate (heroes never stand on a town).
  dest = movementTarget(catalog, state, dest);
  const path = findHeroPath(catalog, state, heroId, dest);
  const hero = state.heroes[heroId];
  const points = hero?.movementPoints ?? 0;
  let stopIndex = -1;
  for (let i = 0; i < path.stepCosts.length; i++) if ((path.stepCosts[i] ?? Infinity) <= points) stopIndex = i;
  let encounterLabel: string | null = null;
  if (path.endsInEncounter) {
    const site = siteAt(catalog, state, dest);
    const enemy = heroAt(state, dest, heroId);
    const town = site ? siegeTownAt(catalog, state, site, hero?.ownerId ?? null) : null;
    const caravan = !town && !enemy ? enemyCaravanAt(state, dest, hero?.ownerId ?? null) : undefined;
    const liveGuard = !!site?.def.guard && !site.state.cleared;
    encounterLabel = town ? `Siege of ${town.name}` : caravan && !liveGuard ? caravanEncounterLabel(state, caravan) : (site?.def.guard?.label ?? (enemy ? `${enemy.name}'s army` : 'Encounter'));
  }
  // At sea, the encounter is a boarding (navalMovementV1).
  const aboard = !!hero && !!heroShip(state, heroId);
  if (aboard && path.endsInEncounter) {
    const enemy = heroAt(state, dest, heroId);
    if (enemy) encounterLabel = `Board ${enemy.name}'s ship`;
  }
  return {
    ...path,
    stopIndex,
    reachesDestinationToday: path.reachable && stopIndex === path.path.length - 1,
    encounterLabel,
    movementPoints: points,
    ...(aboard ? { mode: 'sea' as const } : {}),
  };
}

/**
 * The movement quote MoveHero commits (navalMovementV1): the single-mode route when one exists
 * (walking on land, sailing while aboard — exactly `quoteMovement`), else the first leg of the
 * best mixed-mode voyage, which ends at its first embark or disembark step (`transition`; the
 * hero stands there when `path` is empty). Without ships it is `quoteMovement`.
 */
export function quoteTravel(catalog: ContentCatalog, state: MatchState, heroId: HeroId, dest: HexCoord): MovementQuote {
  const q = quoteMovement(catalog, state, heroId, dest);
  if (q.reachable || !navalEnabled(state)) return q;
  const plan = planVoyage(catalog, state, heroId, movementTarget(catalog, state, dest));
  if (!plan || plan.transitions.length === 0) return q;
  const leg = plan.legs[0]!;
  const points = state.heroes[heroId]?.movementPoints ?? 0;
  let stopIndex = -1;
  for (let i = 0; i < leg.stepCosts.length; i++) if ((leg.stepCosts[i] ?? Infinity) <= points) stopIndex = i;
  return {
    reachable: true,
    path: leg.path,
    stepCosts: leg.stepCosts,
    totalCost: leg.cost,
    endsInEncounter: false,
    reason: null,
    stopIndex,
    reachesDestinationToday: false,
    encounterLabel: null,
    movementPoints: points,
    mode: leg.mode,
    transition: plan.transitions[0]!,
    voyage: plan,
  };
}

/** What the player must confirm at a voyage's mode change (the rejection text of a MoveHero that stands there). */
export function transitionPrompt(t: VoyageTransition): string {
  return t.kind === 'embark' ? 'Board the ship to continue (Embark)' : 'Go ashore to continue (Disembark)';
}

/**
 * The day a route ends on, counting today as day 1 (read-only; the map's day count beside the
 * cursor). Today the hero walks as far as its remaining points go; every later day starts where it
 * stopped with the full daily budget (as at dawn). Null when the route cannot be walked.
 */
export function routeDays(catalog: ContentCatalog, state: MatchState, heroId: HeroId, q: MovementQuote): number | null {
  const days = routeStepDays(catalog, state, heroId, q);
  return days ? days[days.length - 1]! : null;
}

/**
 * The day each step of a route is reached, counting today as day 1 (read-only; the map's
 * route markers: today's steps, later days' steps and where each new day begins). Same
 * walk as `routeDays`, whose answer is the last entry. Null when the route cannot be walked.
 */
export function routeStepDays(catalog: ContentCatalog, state: MatchState, heroId: HeroId, q: MovementQuote): number[] | null {
  const hero = state.heroes[heroId];
  if (!hero || !q.reachable || q.path.length === 0) return null;
  if (state.scenario.features?.mythicLibraryV2) {
    const clock = libraryTravelClock(catalog, state, hero), days: number[] = [];
    let from = hero.position;
    for (const to of q.path) {
      if (!clock.step(from, to, q.mode === 'sea' ? 'sea' : 'land')) return null;
      days.push(clock.days); from = to;
    }
    return days;
  }
  const budget = movementBudget(catalog, state, hero).total;
  const out: number[] = [];
  for (let k = 0; k <= q.stopIndex && k < q.path.length; k++) out.push(1);
  let days = 1;
  let paid = q.stopIndex >= 0 ? (q.stepCosts[q.stopIndex] ?? 0) : 0;
  let i = q.stopIndex + 1;
  while (i < q.path.length) {
    days++;
    const start = i;
    while (i < q.path.length && (q.stepCosts[i] ?? Infinity) - paid <= budget) {
      out.push(days);
      i++;
    }
    if (i === start) return null; // a single step costs more than a whole day
    paid = q.stepCosts[i - 1] ?? paid;
  }
  return out;
}

/** Mark cells within vision of the given positions as explored; returns newly explored count. */
export function revealAround(tx: Tx, playerId: PlayerId, positions: readonly HexCoord[], radius: number): number {
  const fog = tx.state.fog[playerId];
  if (!fog) return 0;
  const map = tx.state.world.map;
  let revealed = 0;
  for (const p of positions) {
    for (const c of cellsWithin(map, p, radius)) {
      const i = cellIndex(map, c);
      if (fog.explored[i] !== 1) {
        fog.explored[i] = 1;
        revealed++;
      }
    }
  }
  if (revealed > 0) tx.emit({ kind: 'TilesRevealed', playerId, count: revealed });
  return revealed;
}

/**
 * Where a patrol's waypoint circuit points (`HeroAiState.waypointIndex`): the
 * stored index modulo the circuit, so a save whose index is out of range (or not a
 * whole number) still names a waypoint. -1 for a hero without a circuit.
 */
export function patrolWaypointIndex(ai: { readonly waypoints: readonly HexCoord[]; readonly waypointIndex: number } | undefined): number {
  const n = ai?.waypoints.length ?? 0;
  if (!ai || n === 0) return -1;
  const i = Number.isInteger(ai.waypointIndex) ? ai.waypointIndex : 0;
  return ((i % n) + n) % n;
}

/**
 * A patrol standing on the waypoint its circuit points at has reached it: the
 * circuit then points at the next waypoint (wrapping round). Called when a move
 * starts (a patrol placed on its first waypoint) and where it ends; a move that
 * stops short or ends elsewhere (a chase, a guard or fall-back detour) leaves the
 * index as it is. Deterministic; part of the match state (2026-10-16: a stateless
 * circuit turned back on legs longer than a day and skipped a waypoint listed twice).
 */
function advancePatrolWaypoint(hero: HeroState): void {
  const ai = hero.ai;
  if (!ai || ai.profile !== 'patrol') return;
  const i = patrolWaypointIndex(ai);
  if (i < 0 || !hexEquals(ai.waypoints[i]!, hero.position)) return;
  ai.waypointIndex = (i + 1) % ai.waypoints.length;
}

export function commitMoveHero(tx: Tx, heroId: HeroId, dest: HexCoord, confirmEncounter: boolean, encounterChoice: 'fight' | 'join' | 'release' = 'fight'): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  if (hero.status !== 'active') reject('illegal_action', `${hero.name} cannot move`);
  dest = movementTarget(tx.catalog, tx.state, dest);
  // Mixed land/sea routes walk (or sail) their first leg only; a mode change is confirmed explicitly.
  const q = quoteTravel(tx.catalog, tx.state, heroId, dest);
  if (!q.reachable) reject('illegal_move', q.reason ?? 'No route');
  if (q.transition && q.path.length === 0) reject('transition_required', transitionPrompt(q.transition));
  // A rejected command leaves the state untouched, so the circuit may advance here.
  advancePatrolWaypoint(hero);
  const last = q.path.length - 1;
  if (q.endsInEncounter && q.stopIndex === last) {
    if (!confirmEncounter) reject('encounter_requires_confirmation', `Attack ${q.encounterLabel}?`);
    // Much weaker neutrals may join or flee instead of fighting (scenario feature).
    const reaction = encounterChoice === 'fight' ? null : quoteNeutralReaction(tx.catalog, tx.state, heroId, dest);
    if (reaction && !reaction.kind) reject('illegal_action', reaction.reason ?? 'These creatures will fight');
    if (reaction && encounterChoice === 'join' && reaction.kind !== 'join') reject('illegal_action', 'They will not join you — you can only let them go');
    const approach = last - 1;
    if (approach >= 0) moveAlong(tx, hero, q.path.slice(0, approach + 1), q.stepCosts[approach] ?? 0);
    advancePatrolWaypoint(hero);
    // Pay the final edge as combat begins.
    const finalEdge = (q.stepCosts[last] ?? 0) - (approach >= 0 ? (q.stepCosts[approach] ?? 0) : 0);
    if (tx.state.scenario.features?.mythicLibraryV2) {
      const price = priceMovementStep(movementPricing(tx.catalog, tx.state, hero), movementLedger(hero, tx.state.day), hero.position, dest, heroShip(tx.state, hero.id) ? 'sea' : 'land');
      (hero.libraryAdventure ??= {}).movementLedger = price.ledger;
    }
    hero.movementPoints = Math.max(0, hero.movementPoints - finalEdge);
    if (reaction) {
      resolveNeutralReaction(tx, hero, dest, reaction, encounterChoice === 'join');
      hero.position = { q: dest.q, r: dest.r };
      tx.emit({ kind: 'HeroMoved', heroId: hero.id, path: [{ q: dest.q, r: dest.r }], cost: finalEdge, remaining: hero.movementPoints });
      // At sea (a sea monster that fled), the ship carries its hero onto the cleared water.
      followShip(tx, hero, [{ q: dest.q, r: dest.r }]);
      revealAround(tx, hero.ownerId, [dest], heroVisionRadius(tx.catalog, hero, tx.state));
      arriveAt(tx, hero, dest);
      advancePatrolWaypoint(hero);
      return;
    }
    beginEncounter(tx, hero, dest);
    return;
  }
  let stop = q.stopIndex;
  if (q.endsInEncounter) stop = Math.min(stop, last - 1);
  if (stop < 0) reject('insufficient_movement', `${hero.name} does not have enough movement points today`);
  moveAlong(tx, hero, q.path.slice(0, stop + 1), q.stepCosts[stop] ?? 0);
  if (stop === last) arriveAt(tx, hero, q.path[last]!);
  advancePatrolWaypoint(hero);
}

function moveAlong(tx: Tx, hero: HeroState, path: HexCoord[], cost: number): void {
  if (path.length === 0) return;
  if (tx.state.scenario.features?.mythicLibraryV2) {
    const priced = priceMovementPath(movementPricing(tx.catalog, tx.state, hero), movementLedger(hero, tx.state.day), hero.position, path, heroShip(tx.state, hero.id) ? 'sea' : 'land');
    if (priced.cost !== cost) reject('illegal_move', 'Movement costs changed; preview the route again');
    (hero.libraryAdventure ??= {}).movementLedger = priced.ledger;
  }
  hero.movementPoints -= cost;
  hero.position = path[path.length - 1]!;
  tx.emit({ kind: 'HeroMoved', heroId: hero.id, path, cost, remaining: hero.movementPoints });
  // Aboard, the ship carries the hero (navalMovementV1).
  followShip(tx, hero, path);
  revealAround(tx, hero.ownerId, path, heroVisionRadius(tx.catalog, hero, tx.state));
}

/** The town at a site when entering it means a siege for `playerId` (enemy-held and defended). */
export function siegeTownAt(catalog: ContentCatalog, state: MatchState, site: NonNullable<ReturnType<typeof siteAt>>, playerId: PlayerId | null): TownState | null {
  if (site.def.kind.type !== 'town') return null;
  const town = state.towns[site.def.kind.townId];
  if (!town || allied(state, town.ownerId, playerId)) return null;
  const garrisoned = town.garrison.slots.some((s) => s && s.count > 0);
  const visitor = heroAt(state, townGate(catalog, state, town.id));
  const defended = garrisoned || (!!visitor && visitor.ownerId !== playerId);
  return defended ? town : null;
}

function beginEncounter(tx: Tx, hero: HeroState, dest: HexCoord): void {
  // At sea the only encounter is a hostile occupied ship: a boarding battle (navalMovementV1).
  // Sea encounters (seaEncountersV1): a sea monster there is fought on the hero's own deck.
  if (heroShip(tx.state, hero.id)) return beginAtSea(tx, hero, dest);
  const site = siteAt(tx.catalog, tx.state, dest);
  const enemy = heroAt(tx.state, dest, hero.id);
  const town = site ? siegeTownAt(tx.catalog, tx.state, site, hero.ownerId) : null;
  if (town) {
    startBattle(tx, {
      attackerHeroId: hero.id,
      kind: 'town_siege',
      siteId: site!.def.id,
      townId: town.id,
      defenderHeroId: enemy && enemy.ownerId !== hero.ownerId ? enemy.id : null,
      destination: dest,
    });
  } else if (enemy) {
    startBattle(tx, { attackerHeroId: hero.id, kind: 'hero', siteId: null, defenderHeroId: enemy.id, destination: dest });
  } else if (enemyCaravanAt(tx.state, dest, hero.ownerId)) {
    // Recruitment caravans: its cargo defends the tile without a commander.
    startCaravanInterception(tx, hero, enemyCaravanAt(tx.state, dest, hero.ownerId)!, dest);
  } else if (site?.def.guard && !site.state.cleared) {
    startBattle(tx, { attackerHeroId: hero.id, kind: 'site_guard', siteId: site.def.id, defenderHeroId: null, destination: dest });
  } else {
    reject('illegal_move', 'Nothing to fight there');
  }
}

/** Interactions when a hero ends movement on a tile. */
export function arriveAt(tx: Tx, hero: HeroState, coord: HexCoord): void {
  const site = siteAt(tx.catalog, tx.state, coord);
  if (!site) return;
  const { def, state: st } = site;
  const playerId = hero.ownerId;
  const firstVisit = !st.visitedBy.includes(playerId);
  if (firstVisit) st.visitedBy.push(playerId);
  if (tx.state.scenario.features?.mythicLibraryV2) {
    const firstHeroVisit = !st.visitedHeroIds?.includes(hero.id);
    if (firstHeroVisit) (st.visitedHeroIds ??= []).push(hero.id);
    if (firstHeroVisit && st.owner === null && hero.libraryAdventure?.usedDays?.siteSurvey !== tx.state.day) {
      const radius = Math.max(0, ...heroEffects(tx.catalog, hero, tx.state).map((e) => e.type === 'adventure_site_survey' ? e.radius : 0));
      if (radius) {
        ((hero.libraryAdventure ??= {}).usedDays ??= {}).siteSurvey = tx.state.day;
        revealAround(tx, playerId, [coord], heroVisionRadius(tx.catalog, hero, tx.state) + radius);
      }
    }
    if (def.kind.type === 'town' && tx.state.towns[def.kind.townId]?.ownerId === playerId) ((hero.libraryAdventure ??= {}).townVisitWeeks ??= {})[def.kind.townId] = Math.floor((tx.state.day - 1) / tx.profile.daysPerWeek) + 1;
  }
  switch (def.kind.type) {
    case 'town': {
      const town = tx.state.towns[def.kind.townId];
      if (!town) break;
      if (allied(tx.state, town.ownerId, playerId)) {
        learnSpellsAtTown(tx, hero, town);
      } else {
        const garrisoned = town.garrison.slots.some((s) => s && s.count > 0);
        if (garrisoned) reject('illegal_action', 'Town sieges are not available in this build');
        changeTownOwner(tx, town, playerId);
        st.owner = playerId;
        tx.emit({ kind: 'SiteCaptured', siteId: def.id, playerId });
        bumpTotal(tx.state, playerId, 'townsCaptured');
      }
      break;
    }
    case 'resource_site':
      if (!allied(tx.state, st.owner, playerId)) {
        st.owner = playerId;
        tx.emit({ kind: 'SiteCaptured', siteId: def.id, playerId });
        bumpTotal(tx.state, playerId, 'sitesCaptured');
      }
      break;
    case 'relic':
      if (!allied(tx.state, st.owner, playerId)) {
        st.owner = playerId;
        st.heldDays = 0;
        tx.emit({ kind: 'SiteCaptured', siteId: def.id, playerId });
        bumpTotal(tx.state, playerId, 'sitesCaptured');
      }
      break;
    case 'pickup':
      if (!st.claimed) {
        st.claimed = true;
        tx.emit({ kind: 'PickupCollected', siteId: def.id, heroId: hero.id });
        grantReward(tx, playerId, hero.id, def.kind.reward, `pickup:${def.id}`, def.name);
      }
      break;
    case 'watchtower':
      if (firstVisit) revealSites(tx, playerId, def.kind.revealSiteIds);
      break;
    // Coastal sites and sea salvage (sea-sites kit): capture on foot, salvage from a ship (systems/seaSites.ts).
    case 'coastal_watchtower':
    case 'sea_pickup':
      arriveAtSeaSite(tx, hero, def, st);
      break;
    case 'shipwreck':
      // A wreck is explored from beside it (ExploreWreck); no hero ever ends a move on its hex.
      break;
    default:
      // Learning stones, shrines, trainers, key tents, windmills, prisons (2026-10-02).
      visitWorldSite(tx, hero, def, st);
      break;
  }
  if (firstVisit) tx.emit({ kind: 'SiteVisited', siteId: def.id, heroId: hero.id });
  if (def.kind.type === 'portal') stepThroughPortal(tx, hero, def, def.kind.exitSiteId);
}

/**
 * Two-way portal: the hero leaves from its twin at once (no movement cost) and
 * sees around it. Blocked while any hero stands on the twin; the twin is not
 * entered again (step off and on to travel back).
 */
function stepThroughPortal(tx: Tx, hero: HeroState, from: SiteDefinition, exitSiteId: SiteId): void {
  const exit = missionSite(tx.catalog, tx.state, exitSiteId);
  if (!exit || exit.kind.type !== 'portal') return;
  // Naval-only maps (definitions/navalPolicy.ts): no crossing without a ship, whatever a site claims.
  if (scenarioMission(tx.catalog, tx.state)?.navalPolicy) {
    tx.emit({ kind: 'PortalBlocked', heroId: hero.id, siteId: from.id });
    return;
  }
  // A ferry that does not run yet (campaign v2): the hero waits at the landing.
  if (from.kind.type === 'portal' && from.kind.requiresFlag && !tx.state.mission.flags[from.kind.requiresFlag]) {
    tx.emit({ kind: 'PortalBlocked', heroId: hero.id, siteId: from.id });
    return;
  }
  if (heroAt(tx.state, exit.coord, hero.id)) {
    tx.emit({ kind: 'PortalBlocked', heroId: hero.id, siteId: from.id });
    return;
  }
  hero.position = { q: exit.coord.q, r: exit.coord.r };
  tx.emit({ kind: 'HeroTeleported', heroId: hero.id, from: { ...from.coord }, to: { ...exit.coord }, viaSiteId: from.id });
  revealAround(tx, hero.ownerId, [exit.coord], heroVisionRadius(tx.catalog, hero, tx.state));
  const st = tx.state.world.sites[exit.id];
  if (st && !st.visitedBy.includes(hero.ownerId)) {
    st.visitedBy.push(hero.ownerId);
    tx.emit({ kind: 'SiteVisited', siteId: exit.id, heroId: hero.id });
  }
}

/** Story reveal: remembered coordinate + journal marker, not live vision of surroundings. */
export function revealSites(tx: Tx, playerId: PlayerId, siteIds: readonly SiteId[]): void {
  const fog = tx.state.fog[playerId];
  const map = tx.state.world.map;
  for (const id of siteIds) {
    const def = missionSite(tx.catalog, tx.state, id);
    if (!def) continue;
    if (!tx.state.mission.revealedSiteIds.includes(id)) {
      tx.state.mission.revealedSiteIds.push(id);
      tx.emit({ kind: 'SiteRevealed', siteId: id });
    }
    if (fog) fog.explored[cellIndex(map, def.coord)] = 1;
  }
}

// ---------------------------------------------------------------------------
// Site activation (beacons, relays)
// ---------------------------------------------------------------------------

export interface ActivationQuote {
  readonly legal: boolean;
  readonly reason: string | null;
  readonly cost: ResourceBundle;
  readonly site: SiteDefinition | null;
}

export function quoteActivation(catalog: ContentCatalog, state: MatchState, heroId: HeroId, siteId: SiteId): ActivationQuote {
  const def = missionSite(catalog, state, siteId) ?? null;
  const st = state.world.sites[siteId];
  const hero = state.heroes[heroId];
  const none = resources();
  if (!def || !st || !hero) return { legal: false, reason: 'Unknown site', cost: none, site: def };
  if (def.kind.type !== 'activation') return { legal: false, reason: 'Nothing to activate here', cost: none, site: def };
  const cost = resources(def.kind.cost);
  const fail = (reason: string): ActivationQuote => ({ legal: false, reason, cost, site: def });
  if (st.activated) return fail('Already restored');
  if (!hexEquals(hero.position, def.coord)) return fail(`${hero.name} must stand at ${def.name}`);
  if (def.guard && !st.cleared) return fail('Its guards still hold the site');
  if (state.pendingDecisions.some((d) => d.heroId === heroId)) return fail('Resolve the pending level-up first');
  const req = evaluateAll(catalog, state, def.kind.requirements, { playerId: hero.ownerId, heroId });
  if (!req.ok) return fail(req.reason ?? 'Requirements not met');
  const wallet = state.players[hero.ownerId]?.wallet;
  if (!wallet || !canAfford(wallet, cost)) return fail('Not enough resources');
  return { legal: true, reason: null, cost, site: def };
}

export function commitActivateSite(tx: Tx, heroId: HeroId, siteId: SiteId): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  const q = quoteActivation(tx.catalog, tx.state, heroId, siteId);
  if (!q.legal || !q.site || q.site.kind.type !== 'activation') reject('missing_requirement', q.reason ?? 'Cannot activate');
  const kind = q.site.kind;
  spend(tx, tx.actorId, q.cost, `Restored ${q.site.name}`);
  tx.state.world.sites[siteId]!.activated = true;
  tx.emit({ kind: 'SiteActivated', siteId, heroId });
  grantReward(tx, tx.actorId, heroId, kind.reward, `activation:${siteId}`, q.site.name);
  if (kind.completesMission) setFlag(tx, MISSION_VICTORY_FLAG);
  updateGates(tx);
}

/** Gates open exactly when all their flags are set. */
export function updateGates(tx: Tx): void {
  const mission = scenarioMission(tx.catalog, tx.state);
  if (!mission) return;
  for (const def of mission.sites) {
    if (def.kind.type !== 'gate') continue;
    const st = tx.state.world.sites[def.id];
    if (!st || st.open) continue;
    if (def.kind.openWhenFlags.every((f) => tx.state.mission.flags[f])) {
      st.open = true;
      tx.emit({ kind: 'GateOpened', siteId: def.id });
    }
  }
}
