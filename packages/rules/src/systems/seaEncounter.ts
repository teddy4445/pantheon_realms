/**
 * Sea encounters on the adventure map (sea-creature delivery 2026-10-17; scenario feature
 * `seaEncountersV1`, which needs hero ships `navalMovementV1`).
 *
 * A neutral sea-monster stack is a `sea_monster` site on a water tile whose guard holds swimmers and
 * flyers only. Only a hero aboard a ship reaches it — sailing onto its tile is an encounter (destination
 * only, like a hostile ship) — and the fight is a `site_guard` battle on the single-ship sea board
 * (`single_ship_sea_encounter_v2`) bound to the hero's ship (`encounter.sourceShipId`). The neutral
 * guard's own rules apply (rewards, clearing, neutral reactions — sea creatures never join), and the
 * naval ship contract decides the ship: it follows its winning hero onto the cleared water, withdraws
 * with a retreating hero to vacant water (refused when there is none), stays where it was after a
 * stalemate, and is lost with a defeated hero (no ghost ship, no ghost hero). A ship is never sunk by a
 * round limit.
 *
 * Read-only helpers are pure; the commits run inside `processCommand`.
 */
import type { HeroId, ShipId, SiteId } from '../ids';
import { hexEquals, type HexCoord } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import type { SiteDefinition } from '../definitions/world';
import type { BattleSideId, BattleState, HeroState, MatchState } from '../state/match';
import { reject, type Tx } from '../engine/tx';
import { heroVisionRadius } from '../resolvers/heroes';
import { facingBetween, heroShip, shipAt, withdrawalCoord } from '../resolvers/naval';
import { seaMonsterAt, seaMonsterProblem } from '../resolvers/seaEncounter';
import { revealAround } from './adventure';
import { startBattle } from './battle/factory';
import { beginBoarding } from './naval';

/**
 * An embarked hero's encounter at sea (the destination of its sail): a hostile occupied ship is boarded
 * (unchanged), a sea monster is fought on the single-ship board.
 */
export function beginAtSea(tx: Tx, hero: HeroState, dest: HexCoord): void {
  if (shipAt(tx.state, dest)) return beginBoarding(tx, hero, dest);
  const site = seaMonsterAt(tx.catalog, tx.state, dest);
  if (site) return beginSeaEncounter(tx, hero, site);
  return beginBoarding(tx, hero, dest);
}

/** The embarked hero's ship meets the sea monster at `site`: a `site_guard` battle on the hero's own deck. */
export function beginSeaEncounter(tx: Tx, hero: HeroState, site: SiteDefinition): void {
  const own = heroShip(tx.state, hero.id);
  if (!own) reject('illegal_move', 'Sea monsters are met from a ship');
  const why = seaMonsterProblem(tx.catalog, tx.state, site);
  if (why) reject('illegal_move', why);
  own.facing = facingBetween(own.coord, site.coord);
  own.state = 'in_battle';
  own.lastActionTurn = tx.state.day;
  tx.emit({ kind: 'SeaEncounterStarted', shipId: own.shipId, heroId: hero.id, siteId: site.id as SiteId, coord: { ...site.coord }, shipSide: 'attacker' });
  startBattle(tx, {
    attackerHeroId: hero.id,
    kind: 'site_guard',
    siteId: site.id as SiteId,
    defenderHeroId: null,
    destination: { q: site.coord.q, r: site.coord.r },
    sourceShipId: own.shipId,
  });
}

/**
 * A sea encounter's consequences for the ship, inside the battle's result transaction (after the
 * heroes' outcomes and the guard's): a withdrawing hero's ship sails to its vacant water hex; the hull
 * of a hero no longer active is removed (ShipWrecked); a winning ship-side attacker's ship takes the
 * cleared water (its hero stands there already); otherwise the ship stays and is `occupied` again.
 */
export function resolveSeaEncounterAftermath(tx: Tx, battle: BattleState, winner: BattleSideId, outcome: string): void {
  const shipId = battle.encounter.sourceShipId;
  if (!shipId) return;
  const state = tx.state;
  const ships = state.world.ships ?? {};
  const ship = ships[shipId];
  const side = battle.board?.shipSide ?? 'attacker';
  if (!ship) return;
  const hero = ship.heroId ? state.heroes[ship.heroId] : undefined;
  const sideState = battle.sides[side];
  let coord: HexCoord = { ...ship.coord };
  if (!hero || hero.status !== 'active') {
    delete ships[ship.shipId];
    tx.emit({ kind: 'ShipWrecked', shipId: ship.shipId, ownerId: ship.ownerId, coord: { ...ship.coord }, reason: 'sea_encounter_defeat' });
  } else if (winner !== side && (sideState.retreated || sideState.surrendered)) {
    const to = withdrawalCoord(tx.catalog, state, ship);
    if (to) {
      const from = { ...ship.coord };
      ship.facing = facingBetween(from, to);
      ship.coord = { q: to.q, r: to.r };
      hero.position = { q: to.q, r: to.r };
      coord = { ...to };
      tx.emit({ kind: 'ShipWithdrawn', shipId: ship.shipId, heroId: hero.id, from, to: { ...to }, facing: ship.facing });
      revealAround(tx, hero.ownerId, [to], heroVisionRadius(tx.catalog, hero, state));
    }
    ship.state = 'occupied';
  } else {
    // The winning ship side's hero stepped onto the cleared water (resolution): its ship carries it there.
    const dest = battle.encounter.destination;
    if (winner === side && side === 'attacker' && hexEquals(hero.position, dest) && !hexEquals(ship.coord, dest) && !otherShipAt(state, dest, ship.shipId)) {
      ship.facing = facingBetween(ship.coord, dest);
      ship.coord = { q: dest.q, r: dest.r };
      coord = { ...dest };
      tx.emit({ kind: 'ShipMoved', shipId: ship.shipId, heroId: hero.id, path: [{ q: dest.q, r: dest.r }], facing: ship.facing });
    }
    // A hero never leaves its ship: it stands on the ship's tile whatever happened.
    hero.position = { q: ship.coord.q, r: ship.coord.r };
    ship.state = 'occupied';
  }
  if (ships[shipId]) ship.lastActionTurn = state.day;
  tx.emit({ kind: 'SeaEncounterResolved', battleId: battle.battleId, winner, outcome, shipId: shipId as ShipId, coord });
}

function otherShipAt(state: MatchState, c: HexCoord, except: string): boolean {
  return Object.values(state.world.ships ?? {}).some((s) => s.shipId !== except && hexEquals(s.coord, c));
}

/** Read-only label of a sea encounter for the encounter prompt (the guard's own label). */
export function seaEncounterLabel(catalog: ContentCatalog, state: MatchState, heroId: HeroId, dest: HexCoord): string | null {
  void heroId;
  const site = seaMonsterAt(catalog, state, dest);
  return site ? (site.guard?.label ?? site.name) : null;
}
