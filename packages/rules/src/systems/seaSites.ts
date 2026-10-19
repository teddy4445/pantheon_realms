/**
 * Coastal sites and sea salvage — the commits (sea-map objects kit 2026-10-17; definitions/seaSites.ts,
 * read-only checks in resolvers/seaSites.ts). Every change happens inside `processCommand`:
 *
 *  - arrival (`arriveAtSeaSite`, from AdventureSystem.arriveAt): a land hero at a coastal watchtower
 *    captures it (owner set, ONE `SiteCaptured`, its sight explored at once; vision is derived, so it is
 *    live from the same command); a hero aboard a ship ending a sea move on floating salvage collects
 *    the stored amount once (`PickupCollected` + the ordinary `ResourcesGranted`, idempotent key);
 *  - `ExploreWreck` / `ClaimWreckArtifact` (the wreck's phases, its salvage granted exactly once);
 *  - the guarded wreck's battle: built by the battle factory from `wreckDefenders`, resolved by
 *    `resolveWreckExpedition` inside the battle's result transaction;
 *  - after every command, `refreshSeaWatch`: the "Enemy ship sighted near <tower>" alerts.
 * No RNG is read here: every outcome was drawn when the map was made and is stored on the site.
 */
import type { ArtifactId, ArtifactInstanceId, HeroId, PlayerId, ShipId, SiteId } from '../ids';
import { resources, type ResourceBundle } from '../core/resources';
import type { SiteDefinition, StackSpec } from '../definitions/world';
import type { WreckSiteState } from '../definitions/seaSites';
import type { BattleSideId, BattleState, HeroState, SiteState } from '../state/match';
import { reject, type Tx } from '../engine/tx';
import { missionSite, visibleCells } from '../resolvers/world';
import { heroShip, navalEnabled } from '../resolvers/naval';
import {
  artifactFits,
  coastalTowers,
  liveWreckGuard,
  quoteClaimWreckArtifact,
  quoteExploreWreck,
  shipsInTowerSight,
  wreckState,
} from '../resolvers/seaSites';
import { grant } from './economy';
import { grantArtifact } from './heroes';
import { grantReward } from './quests';
import { bumpTotal } from './stats';
import { revealAround } from './adventure';
import { startBattle } from './battle/factory';

// ---------------------------------------------------------------------------
// Arrival: coastal watchtowers and floating salvage
// ---------------------------------------------------------------------------

/** A hero ended its move on a sea site's hex (AdventureSystem.arriveAt). */
export function arriveAtSeaSite(tx: Tx, hero: HeroState, def: SiteDefinition, st: SiteState): void {
  const kind = def.kind;
  if (kind.type === 'coastal_watchtower') {
    // Only a hero on foot reaches the tower's hex (the sea graph never enters land; an embarked hero lands first).
    // Wandering monsters never man a tower.
    if (heroShip(tx.state, hero.id) || hero.monster || st.owner === hero.ownerId) return;
    st.owner = hero.ownerId;
    tx.emit({ kind: 'SiteCaptured', siteId: def.id, playerId: hero.ownerId });
    bumpTotal(tx.state, hero.ownerId, 'sitesCaptured');
    // The tower's whole sight is explored now (and stays explored if it is lost); live sight is derived.
    revealAround(tx, hero.ownerId, [def.coord], kind.radius);
  } else if (kind.type === 'sea_pickup') {
    // Only from a ship (a hero on land never stands on water; no remote collection, no flying exception).
    if (st.claimed || !heroShip(tx.state, hero.id)) return;
    st.claimed = true;
    st.clearedBy = hero.ownerId;
    tx.emit({ kind: 'PickupCollected', siteId: def.id, heroId: hero.id });
    grantReward(tx, hero.ownerId, hero.id, { resources: { [kind.resource]: kind.amount } }, `pickup:${def.id}`, def.name);
  }
}

// ---------------------------------------------------------------------------
// Shipwrecks
// ---------------------------------------------------------------------------

function wreckRecord(st: SiteState): WreckSiteState {
  if (!st.wreck) st.wreck = wreckState(st);
  return st.wreck;
}

/** ExploreWreck: pay the movement, then the stored salvage at once, or the raiders' battle. */
export function commitExploreWreck(tx: Tx, heroId: HeroId, siteId: SiteId): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  const q = quoteExploreWreck(tx.catalog, tx.state, heroId, siteId);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot explore the wreck');
  const def = missionSite(tx.catalog, tx.state, siteId)!;
  const st = tx.state.world.sites[siteId]!;
  const ship = heroShip(tx.state, heroId)!;
  const w = wreckRecord(st);
  hero.movementPoints = Math.max(0, hero.movementPoints - q.cost);
  const guard = liveWreckGuard(def, st);
  tx.emit({ kind: 'WreckExplored', siteId, heroId, playerId: hero.ownerId, cost: q.cost, battle: guard.length > 0 });
  if (guard.length === 0) {
    clearWreck(tx, hero, def, st);
    return;
  }
  w.phase = 'encounterPending';
  w.heroId = hero.id;
  const battle = startBattle(tx, {
    attackerHeroId: hero.id,
    kind: 'wreck_expedition',
    siteId,
    defenderHeroId: null,
    // The hero stays aboard its own ship on its approach hex, whatever the outcome.
    destination: { q: ship.coord.q, r: ship.coord.r },
    attackerShipId: ship.shipId,
  });
  w.battleId = battle.battleId;
}

/**
 * The wreck is cleared by `hero`: its stored resources granted once (idempotent key), its artifact to
 * the hero's packs — or, when they are full, kept at the wreck for the hero's empire (pendingReward).
 * Returns what was granted (for the battle result).
 */
function clearWreck(tx: Tx, hero: HeroState, def: SiteDefinition, st: SiteState): { resources: ResourceBundle; artifactIds: ArtifactId[] } {
  const none = { resources: resources(), artifactIds: [] as ArtifactId[] };
  if (def.kind.type !== 'shipwreck') return none;
  const w = wreckRecord(st);
  st.cleared = true;
  st.claimed = true;
  st.guard = null;
  st.clearedBy = hero.ownerId;
  w.battleId = null;
  w.heroId = hero.id;
  if (!tx.applyOnce(`wreck:${def.id}`)) return none;
  const outcome = def.kind.outcome;
  const granted = resources(outcome.reward);
  grant(tx, hero.ownerId, granted, `Salvage from ${def.name}`);
  const art = outcome.artifactId ?? null;
  let pending = false;
  if (art && tx.catalog.artifacts[art]) {
    if (artifactFits(tx.catalog, hero, art)) grantArtifact(tx, hero.id, art);
    else pending = true;
  }
  w.phase = pending ? 'pendingReward' : 'cleared';
  w.pendingArtifactId = pending ? art : null;
  w.pendingFor = pending ? hero.ownerId : null;
  tx.emit({ kind: 'WreckRewardGranted', siteId: def.id, heroId: hero.id, playerId: hero.ownerId, resources: granted, artifactId: art, pending });
  return { resources: granted, artifactIds: art && !pending ? [art] : [] };
}

/** ClaimWreckArtifact: the waiting artifact to the hero (or swapped for one backpack item, which stays at the wreck). */
export function commitClaimWreckArtifact(tx: Tx, heroId: HeroId, siteId: SiteId, leaveInstanceId: ArtifactInstanceId | null): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  const q = quoteClaimWreckArtifact(tx.catalog, tx.state, heroId, siteId, leaveInstanceId);
  if (!q.legal || !q.artifactId) reject(q.code ?? 'illegal_action', q.reason ?? 'Nothing to take');
  const st = tx.state.world.sites[siteId]!;
  const w = wreckRecord(st);
  let left: ArtifactId | null = null;
  if (!q.fits) {
    const idx = hero.backpack.findIndex((a) => a.instanceId === leaveInstanceId);
    left = hero.backpack[idx]!.artifactId;
    hero.backpack.splice(idx, 1);
  }
  grantArtifact(tx, hero.id, q.artifactId);
  if (left) {
    // The swap: the item left behind waits at the wreck in its place (nothing is ever discarded).
    w.pendingArtifactId = left;
  } else {
    w.phase = 'cleared';
    w.pendingArtifactId = null;
    w.pendingFor = null;
  }
  tx.emit({ kind: 'WreckArtifactClaimed', siteId, heroId, artifactId: q.artifactId, leftArtifactId: left });
}

/** The raiders a wreck battle deploys (the battle factory's defender side): label and stacks. */
export function wreckDefenders(tx: Tx, siteId: SiteId | null): { label: string; army: StackSpec[] } {
  const def = siteId ? missionSite(tx.catalog, tx.state, siteId) : undefined;
  const st = siteId ? tx.state.world.sites[siteId] : undefined;
  if (!def || def.kind.type !== 'shipwreck' || !st) reject('not_found', 'Unknown wreck');
  const army = liveWreckGuard(def, st);
  if (army.length === 0) reject('illegal_move', 'Nobody guards that wreck');
  return { label: def.kind.outcome.guard?.label ?? `Raiders at ${def.name}`, army };
}

/**
 * A wreck battle's consequences (inside the battle's result transaction, after the heroes' outcomes):
 * victory clears the wreck and grants its salvage once; otherwise the surviving raiders stay aboard and
 * the wreck is untouched again. A hero defeated aboard loses its hull (the naval ship-loss contract:
 * `ShipWrecked`, no orphan ship); a retreat keeps the hero on its own ship on its approach hex.
 */
export function resolveWreckExpedition(
  tx: Tx,
  battle: BattleState,
  winner: BattleSideId,
  survivors: (s: BattleState['stacks'][string]) => number,
): { resources: ResourceBundle; artifactIds: ArtifactId[] } {
  const none = { resources: resources(), artifactIds: [] as ArtifactId[] };
  const enc = battle.encounter;
  if (enc.kind !== 'wreck_expedition' || !enc.siteId) return none;
  const def = missionSite(tx.catalog, tx.state, enc.siteId);
  const st = tx.state.world.sites[enc.siteId];
  if (!def || !st) return none;
  const w = wreckRecord(st);
  const hero = tx.state.heroes[enc.attackerHeroId];
  if (hero && !w.guardSeenBy.includes(hero.ownerId)) w.guardSeenBy.push(hero.ownerId);
  w.battleId = null;
  if (winner === 'attacker' && hero && hero.status === 'active') return clearWreck(tx, hero, def, st);
  st.guard = Object.values(battle.stacks)
    .filter((s) => s.side === 'defender')
    .sort((a, b) => a.sourceSlot - b.sourceSlot)
    .map((s) => ({ creatureId: s.creatureId, count: survivors(s) }))
    .filter((s) => s.count > 0);
  w.phase = 'untouched';
  w.heroId = null;
  // Defeated aboard: the hull is lost with its hero (never an empty orphan hull at the wreck).
  if (!hero || hero.status !== 'active') {
    const shipId = enc.attackerShipId;
    const ships = tx.state.world.ships;
    const ship = shipId && ships ? ships[shipId] : undefined;
    if (ship && ships) {
      delete ships[ship.shipId];
      tx.emit({ kind: 'ShipWrecked', shipId: ship.shipId as ShipId, ownerId: ship.ownerId, coord: { ...ship.coord }, reason: 'hero_lost' });
    }
  }
  return none;
}

// ---------------------------------------------------------------------------
// Tower watch: "Enemy ship sighted near <tower>"
// ---------------------------------------------------------------------------

/**
 * After every settled command: for each empire that owns (or owned) a coastal watchtower, the hostile
 * ships its towers see now; a ship that was not in that sight after the previous command and was not
 * alerted yet in this owner-turn raises ONE `ShipSightedNearTower` (several towers coalesced). The
 * owner-turn period resets when the owner's turn starts (its `TurnStarted` in this command's events).
 * Saved in `MatchState.seaWatch`, so a reload never raises an alert again.
 */
export function refreshSeaWatch(tx: Tx): void {
  const state = tx.state;
  if (!navalEnabled(state)) return;
  const towers = coastalTowers(tx.catalog, state);
  if (towers.length === 0 && !state.seaWatch) return;
  const owners = new Set<PlayerId>();
  for (const t of towers) {
    const o = state.world.sites[t.id]?.owner;
    if (o && state.players[o]) owners.add(o);
  }
  for (const p of Object.keys(state.seaWatch ?? {})) owners.add(p as PlayerId);
  if (owners.size === 0) return;
  const watch = (state.seaWatch ??= {});
  const started = new Set(tx.events.filter((e) => e.kind === 'TurnStarted').map((e) => (e as { playerId: PlayerId }).playerId));
  for (const playerId of state.playerOrder.filter((p) => owners.has(p))) {
    const prev = watch[playerId] ?? { inRange: [], period: state.day, alerted: [] };
    const next = { inRange: [...prev.inRange], period: prev.period, alerted: [...prev.alerted], history: [...(prev.history ?? [])] };
    if (started.has(playerId)) {
      next.period = state.day;
      next.alerted = [];
    }
    const seen = shipsInTowerSight(tx.catalog, state, playerId, visibleCells(tx.catalog, state, playerId)).sort((a, b) => (a.ship.shipId < b.ship.shipId ? -1 : a.ship.shipId > b.ship.shipId ? 1 : 0));
    for (const { ship, towers: by } of seen) {
      if (prev.inRange.includes(ship.shipId) || next.alerted.includes(ship.shipId)) continue;
      next.alerted.push(ship.shipId);
      const shipOwnerId = ship.heroId ? (state.heroes[ship.heroId]?.ownerId ?? ship.ownerId) : ship.ownerId;
      next.history.push({ day: state.day, siteId: by[0]!, shipId: ship.shipId, shipOwnerId, coord: { ...ship.coord } });
      if (next.history.length > 100) next.history.splice(0, next.history.length - 100);
      tx.emit({ kind: 'ShipSightedNearTower', playerId, shipId: ship.shipId, shipOwnerId, siteId: by[0]!, siteIds: [...by], coord: { ...ship.coord } });
    }
    next.inRange = seen.map((x) => x.ship.shipId);
    next.alerted.sort();
    if (next.inRange.length === 0 && next.alerted.length === 0 && next.history.length === 0 && !towers.some((t) => state.world.sites[t.id]?.owner === playerId)) delete watch[playerId];
    else watch[playerId] = next;
  }
  if (Object.keys(watch).length === 0) delete state.seaWatch;
}
