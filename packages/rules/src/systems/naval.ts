import { allied } from './coalition';
/**
 * NavalSystem (expedition kit §07, scenario feature `navalMovementV1`): launching ships,
 * embarking, disembarking, ships following their hero's sea moves, boarding battles and
 * their consequences on the map, and the ship invariants.
 *
 * Every change goes through these commits inside `processCommand`; the quotes in
 * resolvers/naval.ts are the same checks, read-only. Invariants (validated on load, after
 * defeat and after any scripted relocation): a hero is on land or aboard exactly one ship;
 * aboard, the hero stands on the ship's tile, which is water; two ships never share a tile;
 * an empty ship carries no hero; a ship in battle belongs to the battle in progress.
 */
import type { HeroId, ShipId, TownId } from '../ids';
import { hexEquals, hexKey, type HexCoord } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import type { MissionDefinition } from '../definitions/campaign';
import type { BattleSideId, BattleState, HeroState, MatchState, ShipState } from '../state/match';
import { reject, type Tx } from '../engine/tx';
import { heroVisionRadius } from '../resolvers/heroes';
import { inMap, terrainAt } from '../resolvers/world';
import {
  facingBetween,
  heroShip,
  isWater,
  navalEnabled,
  quoteAttackShip,
  quoteDisembark,
  quoteEmbark,
  quoteLaunchShip,
  shipAt,
  withdrawalCoord,
} from '../resolvers/naval';
import { movementLedger, movementPricing, priceMovementStep } from '../resolvers/libraryMovement';
import { spend } from './economy';
import { revealAround } from './adventure';
import { startBattle } from './battle/factory';
import { seaEncounterShip, shipsInBattle } from '../resolvers/seaEncounter';

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** LaunchShip: an empty ship of the actor's empire at a free water neighbour of an owned coastal town. */
export function commitLaunchShip(tx: Tx, townId: TownId, waterCoord: HexCoord): void {
  const q = quoteLaunchShip(tx.catalog, tx.state, tx.actorId, townId, waterCoord);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot launch a ship here');
  const town = tx.state.towns[townId]!;
  spend(tx, tx.actorId, q.cost, `Ship launched at ${town.name}`);
  const shipId = tx.nextId('ship') as ShipId;
  const facing = facingBetween(town.coord, waterCoord);
  const ships = (tx.state.world.ships ??= {});
  ships[shipId] = { shipId, ownerId: tx.actorId, coord: { q: waterCoord.q, r: waterCoord.r }, heroId: null, state: 'empty', facing, lastActionTurn: tx.state.day };
  tx.emit({ kind: 'ShipLaunched', shipId, townId, playerId: tx.actorId, coord: { q: waterCoord.q, r: waterCoord.r }, facing, cost: q.cost });
}

/** EmbarkHero: the hero steps from the shore onto the adjacent empty ship (claiming a neutral one) and uses one ordinary movement step. */
export function commitEmbarkHero(tx: Tx, heroId: HeroId, shipId: ShipId): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  const q = quoteEmbark(tx.catalog, tx.state, heroId, shipId);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot embark');
  const ship = tx.state.world.ships![shipId]!;
  const from = { q: hero.position.q, r: hero.position.r };
  ship.heroId = hero.id;
  ship.ownerId = hero.ownerId;
  ship.state = 'occupied';
  ship.facing = facingBetween(from, ship.coord);
  ship.lastActionTurn = tx.state.day;
  hero.position = { q: ship.coord.q, r: ship.coord.r };
  hero.movementPoints = q.remaining ?? 0;
  if (q.keel) ((hero.libraryAdventure ??= {}).usedDays ??= {}).keel = tx.state.day;
  tx.emit({ kind: 'HeroEmbarked', heroId: hero.id, shipId, from, to: { ...hero.position }, claimed: q.claims });
  revealAround(tx, hero.ownerId, [hero.position], heroVisionRadius(tx.catalog, hero, tx.state));
}

/** DisembarkHero: the hero steps onto the adjacent vacant shore, leaving the empty owned hull, and uses one ordinary movement step. */
export function commitDisembarkHero(tx: Tx, heroId: HeroId, landCoord: HexCoord): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  const q = quoteDisembark(tx.catalog, tx.state, heroId, landCoord);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot land there');
  const ship = heroShip(tx.state, heroId)!;
  const from = { q: ship.coord.q, r: ship.coord.r };
  ship.heroId = null;
  ship.state = 'empty';
  ship.lastActionTurn = tx.state.day;
  hero.position = { q: landCoord.q, r: landCoord.r };
  hero.movementPoints = q.remaining ?? 0;
  if (hero.libraryAdventure) delete hero.libraryAdventure.safeLanding;
  if (tx.state.scenario.features?.mythicLibraryV2) {
    const ledger = movementLedger(hero, tx.state.day); ledger.triggers.landing = true;
    (hero.libraryAdventure ??= {}).movementLedger = ledger;
  }
  tx.emit({ kind: 'HeroDisembarked', heroId: hero.id, shipId: ship.shipId, from, to: { ...hero.position } });
  revealAround(tx, hero.ownerId, [hero.position], heroVisionRadius(tx.catalog, hero, tx.state));
}

/** AttackShip: the embarked hero boards an adjacent hostile occupied ship (one sea edge of movement) — a boarding battle. */
export function commitAttackShip(tx: Tx, heroId: HeroId, targetShipId: ShipId): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  const q = quoteAttackShip(tx.catalog, tx.state, heroId, targetShipId);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot board that ship');
  if (tx.state.scenario.features?.mythicLibraryV2) (hero.libraryAdventure ??= {}).movementLedger = priceMovementStep(movementPricing(tx.catalog, tx.state, hero), movementLedger(hero, tx.state.day), hero.position, tx.state.world.ships![targetShipId]!.coord, 'sea').ledger;
  hero.movementPoints = Math.max(0, hero.movementPoints - q.cost);
  beginBoarding(tx, hero, tx.state.world.ships![targetShipId]!.coord);
}

// ---------------------------------------------------------------------------
// Sailing and boarding
// ---------------------------------------------------------------------------

/** The hero's ship follows a committed sea move (after its HeroMoved). No-op for a hero on land. */
export function followShip(tx: Tx, hero: HeroState, path: readonly HexCoord[]): void {
  const ship = heroShip(tx.state, hero.id);
  if (!ship || path.length === 0) return;
  const last = path[path.length - 1]!;
  const before = path.length > 1 ? path[path.length - 2]! : ship.coord;
  ship.facing = facingBetween(before, last);
  ship.coord = { q: last.q, r: last.r };
  ship.lastActionTurn = tx.state.day;
  tx.emit({ kind: 'ShipMoved', shipId: ship.shipId, heroId: hero.id, path: path.map((c) => ({ q: c.q, r: c.r })), facing: ship.facing });
}

/**
 * A boarding encounter: the embarked hero's ship against the hostile occupied ship at `dest`
 * (adjacent; the boarding edge was paid). Both ships are `in_battle` until the battle ends.
 */
export function beginBoarding(tx: Tx, hero: HeroState, dest: HexCoord): void {
  const own = heroShip(tx.state, hero.id);
  const target = shipAt(tx.state, dest);
  if (!own || !target || !target.heroId || target.shipId === own.shipId) reject('illegal_move', 'Nothing to board there');
  const defender = tx.state.heroes[target.heroId];
  if (!defender || defender.status !== 'active' || allied(tx.state, defender.ownerId, hero.ownerId)) reject('illegal_move', 'Nothing to board there');
  own.facing = facingBetween(own.coord, target.coord);
  own.state = 'in_battle';
  target.state = 'in_battle';
  own.lastActionTurn = tx.state.day;
  target.lastActionTurn = tx.state.day;
  tx.emit({ kind: 'BoardingStarted', attackerShipId: own.shipId, defenderShipId: target.shipId, attackerHeroId: hero.id, defenderHeroId: defender.id, coord: { ...target.coord } });
  startBattle(tx, {
    attackerHeroId: hero.id,
    kind: 'naval_boarding',
    siteId: null,
    defenderHeroId: defender.id,
    destination: { q: target.coord.q, r: target.coord.r },
    attackerShipId: own.shipId,
    defenderShipId: target.shipId,
  });
}

/** The ship of a boarding battle's side (null outside boarding battles). */
export function boardingShip(state: MatchState, battle: BattleState, side: BattleSideId): ShipState | null {
  if (battle.encounter.kind !== 'naval_boarding') return null;
  const id = side === 'attacker' ? battle.encounter.attackerShipId : battle.encounter.defenderShipId;
  return (id ? state.world.ships?.[id] : undefined) ?? null;
}

/**
 * Why `side` may not retreat or surrender a boarding battle now (null: it may): its ship needs a
 * vacant water hex to withdraw to — never a land teleport. Null for other battles.
 */
export function boardingWithdrawalBlocked(catalog: ContentCatalog, state: MatchState, battle: BattleState, side: BattleSideId): string | null {
  // A sea encounter (seaEncountersV1): the ship side withdraws by sea under the same rule.
  if (battle.encounter.sourceShipId && battle.board?.shipSide === side) {
    const own = seaEncounterShip(state, battle, side);
    if (!own) return 'The ship is lost';
    return withdrawalCoord(catalog, state, own) ? null : 'No open water to withdraw to: the ship is hemmed in';
  }
  if (battle.encounter.kind !== 'naval_boarding') return null;
  const ship = boardingShip(state, battle, side);
  if (!ship) return 'The ship is lost';
  return withdrawalCoord(catalog, state, ship) ? null : 'No open water to withdraw to: the ship is hemmed in';
}

/**
 * A boarding battle's consequences on the map, inside the battle's result transaction (after the
 * heroes' outcomes): a withdrawing loser's ship (retreat or surrender) sails to its vacant water
 * hex with its hero aboard; the hull of a hero no longer active is removed (ShipWrecked); the
 * attacker's ship takes the contested hex after a victory (its hero already stands there); the
 * survivors' ships are `occupied` again. A surviving hero never changes ship.
 */
export function resolveBoardingAftermath(tx: Tx, battle: BattleState, winner: BattleSideId, outcome: string): void {
  const enc = battle.encounter;
  if (enc.kind !== 'naval_boarding') return;
  const state = tx.state;
  const ships = state.world.ships ?? {};
  const loser: BattleSideId = winner === 'attacker' ? 'defender' : 'attacker';
  const attackerShip = enc.attackerShipId ? ships[enc.attackerShipId] : undefined;
  const defenderShip = enc.defenderShipId ? ships[enc.defenderShipId] : undefined;
  const loserShip = loser === 'attacker' ? attackerShip : defenderShip;
  const loserSide = battle.sides[loser];
  // 1. A retreating or surrendering hero sails away aboard its own ship.
  if (loserShip && loserShip.heroId && (loserSide.retreated || loserSide.surrendered)) {
    const hero = state.heroes[loserShip.heroId];
    const to = withdrawalCoord(tx.catalog, state, { ...loserShip, coord: loserShip.coord });
    if (hero && hero.status === 'active' && to) {
      const from = { ...loserShip.coord };
      loserShip.facing = facingBetween(from, to);
      loserShip.coord = { q: to.q, r: to.r };
      hero.position = { q: to.q, r: to.r };
      tx.emit({ kind: 'ShipWithdrawn', shipId: loserShip.shipId, heroId: hero.id, from, to: { ...to }, facing: loserShip.facing });
      revealAround(tx, hero.ownerId, [to], heroVisionRadius(tx.catalog, hero, state));
    }
  }
  // 2. Hulls whose hero was defeated aboard are lost; the others are occupied again.
  for (const ship of [attackerShip, defenderShip]) {
    if (!ship) continue;
    const hero = ship.heroId ? state.heroes[ship.heroId] : undefined;
    if (!hero || hero.status !== 'active') {
      delete ships[ship.shipId];
      tx.emit({ kind: 'ShipWrecked', shipId: ship.shipId, ownerId: ship.ownerId, coord: { ...ship.coord }, reason: 'boarding_defeat' });
      continue;
    }
    ship.state = 'occupied';
    ship.lastActionTurn = state.day;
  }
  // 3. The victorious attacker's own ship takes the contested hex (its hero stands there already).
  const attackerHero = state.heroes[enc.attackerHeroId];
  if (winner === 'attacker' && attackerShip && ships[attackerShip.shipId] && attackerHero && attackerHero.status === 'active') {
    const dest = enc.destination;
    if (!hexEquals(attackerShip.coord, dest) && !shipAt(state, dest)) {
      attackerShip.facing = facingBetween(attackerShip.coord, dest);
      attackerShip.coord = { q: dest.q, r: dest.r };
      tx.emit({ kind: 'ShipMoved', shipId: attackerShip.shipId, heroId: attackerHero.id, path: [{ q: dest.q, r: dest.r }], facing: attackerShip.facing });
    }
    attackerHero.position = { q: attackerShip.coord.q, r: attackerShip.coord.r };
  }
  tx.emit({
    kind: 'BoardingResolved',
    battleId: battle.battleId,
    winner,
    outcome,
    attackerShipId: (enc.attackerShipId ?? '') as ShipId,
    defenderShipId: (enc.defenderShipId ?? '') as ShipId,
    coord: { ...enc.destination },
  });
}

/**
 * Safety net after every command (cheap): a ship whose hero is gone, no longer active or no longer
 * on the ship's tile (a scripted relocation) is an empty hull again, keeping its owner. Ships stay
 * `in_battle` only while their battle runs. Never moves a hero.
 */
export function reconcileShips(tx: Tx): void {
  const ships = tx.state.world.ships;
  if (!ships) return;
  const battle = tx.state.battle;
  const fighting = shipsInBattle(battle);
  for (const id of Object.keys(ships).sort()) {
    const ship = ships[id]!;
    if (ship.heroId) {
      const hero = tx.state.heroes[ship.heroId];
      if (!hero || hero.status !== 'active' || !hexEquals(hero.position, ship.coord)) {
        ship.heroId = null;
        ship.state = 'empty';
        continue;
      }
    }
    if (ship.state === 'in_battle' && !fighting.has(id)) ship.state = ship.heroId ? 'occupied' : 'empty';
  }
}

// ---------------------------------------------------------------------------
// Scenario setup and invariants
// ---------------------------------------------------------------------------

/**
 * The ships a new match starts with (`MissionDefinition.ships`), or undefined when the scenario
 * turns ships off (campaign chapters, older scenarios): the match then has no `world.ships`.
 * A placement off the water or on a taken tile is skipped (the editor's checks refuse it first).
 */
export function initialShips(state: Pick<MatchState, 'scenario' | 'world' | 'players'>, mission: Pick<MissionDefinition, 'ships'>): Record<string, ShipState> | undefined {
  if (!navalEnabled(state)) return undefined;
  const out: Record<string, ShipState> = {};
  const taken = new Set<string>();
  const map = state.world.map;
  for (const s of mission.ships ?? []) {
    const k = hexKey(s.coord);
    if (out[s.shipId] || taken.has(k) || !inMap(map, s.coord) || terrainAt(map, s.coord) !== 'water') continue;
    const ownerId = s.ownerId && state.players[s.ownerId] ? s.ownerId : null;
    out[s.shipId] = { shipId: s.shipId, ownerId, coord: { q: s.coord.q, r: s.coord.r }, heroId: null, state: 'empty', facing: s.facing ?? 0, lastActionTurn: 0 };
    taken.add(k);
  }
  return out;
}

/**
 * Every broken ship invariant of a state (empty: all hold). Read-only; the session refuses a save
 * that breaks one, and the tests check them after every naval flow.
 */
export function shipInvariantIssues(catalog: ContentCatalog, state: MatchState): string[] {
  void catalog;
  const issues: string[] = [];
  const ships = state.world.ships;
  const aboard = new Map<string, string>();
  if (ships) {
    if (!navalEnabled(state) && Object.keys(ships).length > 0) issues.push('Ships exist but the scenario has no ships');
    const tiles = new Map<string, string>();
    const battle = state.battle;
    const fighting = shipsInBattle(battle);
    for (const [id, ship] of Object.entries(ships)) {
      if (!ship || ship.shipId !== id) {
        issues.push(`Ship ${id} is damaged`);
        continue;
      }
      if (!['empty', 'occupied', 'in_battle'].includes(ship.state)) issues.push(`Ship ${id} has the state ${String(ship.state)}`);
      if (!ship.coord || !isWater(state, ship.coord)) issues.push(`Ship ${id} is not on water`);
      else {
        const k = hexKey(ship.coord);
        if (tiles.has(k)) issues.push(`Ships ${tiles.get(k)} and ${id} share a tile`);
        tiles.set(k, id);
      }
      if (ship.ownerId !== null && !state.players[ship.ownerId]) issues.push(`Ship ${id} belongs to an unknown player`);
      if (!Number.isInteger(ship.facing) || ship.facing < 0 || ship.facing > 5) issues.push(`Ship ${id} has no valid heading`);
      if (ship.heroId) {
        const hero = state.heroes[ship.heroId];
        if (aboard.has(ship.heroId)) issues.push(`Hero ${ship.heroId} is aboard two ships`);
        aboard.set(ship.heroId, id);
        if (!hero || hero.status !== 'active') issues.push(`Ship ${id} carries a hero who is not on the map`);
        else {
          if (!hexEquals(hero.position, ship.coord)) issues.push(`Hero ${hero.id} is not on the tile of ship ${id}`);
          if (ship.ownerId !== hero.ownerId) issues.push(`Ship ${id} and its hero have different owners`);
        }
        if (ship.state === 'empty') issues.push(`Ship ${id} is empty but carries a hero`);
      } else if (ship.state !== 'empty') issues.push(`Ship ${id} is ${ship.state} without a hero`);
      if (ship.state === 'in_battle' && !fighting.has(id)) issues.push(`Ship ${id} is in a battle that is not running`);
    }
  }
  // Heroes on water are checked where ships exist (older scenarios never put a hero on water).
  if (!navalEnabled(state)) return issues;
  for (const hero of Object.values(state.heroes)) {
    if (hero.status !== 'active') continue;
    const onWater = isWater(state, hero.position);
    if (onWater && !aboard.has(hero.id)) issues.push(`Hero ${hero.id} stands on water without a ship`);
    if (!onWater && aboard.has(hero.id)) issues.push(`Hero ${hero.id} is aboard a ship but stands on land`);
  }
  return issues;
}
