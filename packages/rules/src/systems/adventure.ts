/**
 * AdventureSystem: hero movement, fog reveal, site interaction and activation.
 *
 * Route previews and committed movement use the same pathfinder and edge costs.
 * A guarded destination requires explicit encounter confirmation; the hero pays
 * the final edge as the battle begins (heroes/05 "Adventure movement").
 */
import type { HeroId, PlayerId, SiteId } from '../ids';
import { hexEquals, hexKey, type HexCoord } from '../core/hex';
import { canAfford, resources, type ResourceBundle } from '../core/resources';
import type { ContentCatalog } from '../definitions/catalog';
import type { SiteDefinition } from '../definitions/world';
import type { HeroState, MatchState, TownState } from '../state/match';
import { evaluateAll } from '../resolvers/requirements';
import { heroVisionRadius } from '../resolvers/heroes';
import { cellIndex, cellsWithin, findHeroPath, heroAt, missionSite, siteAt, type PathResult } from '../resolvers/world';
import { reject, type Tx } from '../engine/tx';
import { spend } from './economy';
import { learnSpellsAtTown } from './heroes';
import { grantReward, MISSION_VICTORY_FLAG, setFlag } from './quests';
import { startBattle } from './battle/factory';
import { bumpTotal } from './stats';
import { scenarioMission } from '../resolvers/scenario';

export interface MovementQuote extends PathResult {
  /** Index of the last step reachable today (-1 when none). */
  readonly stopIndex: number;
  readonly reachesDestinationToday: boolean;
  readonly encounterLabel: string | null;
  readonly movementPoints: number;
}

export function quoteMovement(catalog: ContentCatalog, state: MatchState, heroId: HeroId, dest: HexCoord): MovementQuote {
  const path = findHeroPath(catalog, state, heroId, dest);
  const hero = state.heroes[heroId];
  const points = hero?.movementPoints ?? 0;
  let stopIndex = -1;
  for (let i = 0; i < path.stepCosts.length; i++) if ((path.stepCosts[i] ?? Infinity) <= points) stopIndex = i;
  let encounterLabel: string | null = null;
  if (path.endsInEncounter) {
    const site = siteAt(catalog, state, dest);
    const enemy = heroAt(state, dest, heroId);
    const town = site ? siegeTownAt(state, site, hero?.ownerId ?? null) : null;
    encounterLabel = town ? `Siege of ${town.name}` : (site?.def.guard?.label ?? (enemy ? `${enemy.name}'s army` : 'Encounter'));
  }
  return {
    ...path,
    stopIndex,
    reachesDestinationToday: path.reachable && stopIndex === path.path.length - 1,
    encounterLabel,
    movementPoints: points,
  };
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

export function commitMoveHero(tx: Tx, heroId: HeroId, dest: HexCoord, confirmEncounter: boolean): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  if (hero.status !== 'active') reject('illegal_action', `${hero.name} cannot move`);
  const q = quoteMovement(tx.catalog, tx.state, heroId, dest);
  if (!q.reachable) reject('illegal_move', q.reason ?? 'No route');
  const last = q.path.length - 1;
  if (q.endsInEncounter && q.stopIndex === last) {
    if (!confirmEncounter) reject('encounter_requires_confirmation', `Attack ${q.encounterLabel}?`);
    const approach = last - 1;
    if (approach >= 0) moveAlong(tx, hero, q.path.slice(0, approach + 1), q.stepCosts[approach] ?? 0);
    // Pay the final edge as combat begins.
    const finalEdge = (q.stepCosts[last] ?? 0) - (approach >= 0 ? (q.stepCosts[approach] ?? 0) : 0);
    hero.movementPoints = Math.max(0, hero.movementPoints - finalEdge);
    beginEncounter(tx, hero, dest);
    return;
  }
  let stop = q.stopIndex;
  if (q.endsInEncounter) stop = Math.min(stop, last - 1);
  if (stop < 0) reject('insufficient_movement', `${hero.name} does not have enough movement points today`);
  moveAlong(tx, hero, q.path.slice(0, stop + 1), q.stepCosts[stop] ?? 0);
  if (stop === last) arriveAt(tx, hero, dest);
}

function moveAlong(tx: Tx, hero: HeroState, path: HexCoord[], cost: number): void {
  if (path.length === 0) return;
  hero.movementPoints -= cost;
  hero.position = path[path.length - 1]!;
  tx.emit({ kind: 'HeroMoved', heroId: hero.id, path, cost, remaining: hero.movementPoints });
  revealAround(tx, hero.ownerId, path, heroVisionRadius(tx.catalog, hero, tx.state));
}

/** The town at a site when entering it means a siege for `playerId` (enemy-held and defended). */
export function siegeTownAt(state: MatchState, site: NonNullable<ReturnType<typeof siteAt>>, playerId: PlayerId | null): TownState | null {
  if (site.def.kind.type !== 'town') return null;
  const town = state.towns[site.def.kind.townId];
  if (!town || town.ownerId === playerId) return null;
  const garrisoned = town.garrison.slots.some((s) => s && s.count > 0);
  const visitor = heroAt(state, town.coord);
  const defended = garrisoned || (!!visitor && visitor.ownerId !== playerId);
  return defended ? town : null;
}

function beginEncounter(tx: Tx, hero: HeroState, dest: HexCoord): void {
  const site = siteAt(tx.catalog, tx.state, dest);
  const enemy = heroAt(tx.state, dest, hero.id);
  const town = site ? siegeTownAt(tx.state, site, hero.ownerId) : null;
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
  switch (def.kind.type) {
    case 'town': {
      const town = tx.state.towns[def.kind.townId];
      if (!town) break;
      if (town.ownerId === playerId) {
        learnSpellsAtTown(tx, hero, town);
      } else {
        const garrisoned = town.garrison.slots.some((s) => s && s.count > 0);
        if (garrisoned) reject('illegal_action', 'Town sieges are not available in this build');
        town.ownerId = playerId;
        st.owner = playerId;
        tx.emit({ kind: 'SiteCaptured', siteId: def.id, playerId });
        bumpTotal(tx.state, playerId, 'townsCaptured');
      }
      break;
    }
    case 'resource_site':
      if (st.owner !== playerId) {
        st.owner = playerId;
        tx.emit({ kind: 'SiteCaptured', siteId: def.id, playerId });
        bumpTotal(tx.state, playerId, 'sitesCaptured');
      }
      break;
    case 'relic':
      if (st.owner !== playerId) {
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
    default:
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

export function siteKeyAt(coord: HexCoord): string {
  return hexKey(coord);
}
