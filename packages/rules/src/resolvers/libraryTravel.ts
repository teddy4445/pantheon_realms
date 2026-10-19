import { axialDistance, axialNeighbors, hexEquals, hexKey, type HexCoord } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import type { HeroState, MatchState, ShipState } from '../state/match';
import { cellIndex, findHeroPath, siteAt, terrainAt, tileRole, townGate, heroInTown } from './world';
import { campLockedReason } from '../systems/world';
import { heroShip, navalEnabled, shipAt, vacantWater } from './naval';

export function anchorProblem(catalog: ContentCatalog, state: MatchState, hero: HeroState, range: number): string | null {
  if (heroShip(state, hero.id)) return 'Go ashore before marking or returning to an anchor';
  const anchor = hero.libraryAdventure?.anchor;
  const live = anchor && anchor.untilDay > state.day ? anchor : undefined;
  const dest = live?.coord ?? hero.position;
  if (terrainAt(state.world.map, dest) === 'water' || tileRole(catalog, state, hero.ownerId, dest, hero.id) !== 'open' || siteAt(catalog, state, dest)) return 'The anchor needs a free legal land tile without a site';
  if (!live) return null;
  if (hexEquals(hero.position, dest)) return 'Already at the marked anchor';
  if (axialDistance(hero.position, dest) > range) return `The anchor is more than ${range} hexes away`;
  const route = findHeroPath(catalog, state, hero.id, dest);
  if (!route.reachable || route.endsInEncounter || route.path.some((c) => tileRole(catalog, state, hero.ownerId, c, hero.id) !== 'open')) return 'The anchor must remain connected by an explored, open land route';
  return null;
}

export interface BoatCallPlan { ship: ShipState; path: HexCoord[] }
export function compactSite(catalog: ContentCatalog, state: MatchState, hero: HeroState, target: HexCoord) {
  if (axialDistance(hero.position, target) > 1 || state.fog[hero.ownerId]?.explored[cellIndex(state.world.map, target)] !== 1) return null;
  const site = siteAt(catalog, state, target);
  return site?.def.kind.type === 'creature_camp' && site.state.owner === null && (!site.def.guard || site.state.cleared) && !campLockedReason(catalog, state, site.def.id) ? site : null;
}
/** Move a real empty boat along known vacant water. BFS limits travel, not just straight-line distance. */
export function boatCallPlan(catalog: ContentCatalog, state: MatchState, hero: HeroState, target: HexCoord, maxSteps: number): BoatCallPlan | null {
  if (!navalEnabled(state) || heroShip(state, hero.id) || tileRole(catalog, state, hero.ownerId, hero.position, hero.id) !== 'open') return null;
  const ship = shipAt(state, target);
  const explored = (c: HexCoord) => state.fog[hero.ownerId]?.explored[cellIndex(state.world.map, c)] === 1;
  if (!ship || ship.ownerId !== hero.ownerId || ship.state !== 'empty' || ship.heroId || !explored(target)) return null;
  const destinations = new Set(axialNeighbors(hero.position).filter((c) => explored(c) && vacantWater(catalog, state, c)).map(hexKey));
  if (axialDistance(hero.position, ship.coord) === 1 || !destinations.size) return null;
  const queue: { coord: HexCoord; path: HexCoord[] }[] = [{ coord: ship.coord, path: [] }];
  const seen = new Set([hexKey(ship.coord)]);
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i]!;
    if (item.path.length >= maxSteps) continue;
    for (const n of axialNeighbors(item.coord)) {
      const k = hexKey(n);
      if (seen.has(k) || !explored(n) || !vacantWater(catalog, state, n)) continue;
      const path = [...item.path, n];
      if (destinations.has(k)) return { ship, path };
      seen.add(k); queue.push({ coord: n, path });
    }
  }
  return null;
}

export function pilgrimageTown(catalog: ContentCatalog, state: MatchState, hero: HeroState, target: HexCoord) {
  if (heroShip(state, hero.id)) return null;
  const town = Object.values(state.towns).find((t) => t.ownerId === hero.ownerId && (hexEquals(t.coord, target) || hexEquals(townGate(catalog, state, t.id), target)));
  if (!town) return null;
  const gate = townGate(catalog, state, town.id), site = siteAt(catalog, state, gate);
  if (!heroInTown(catalog, state, hero, town.id) && !site?.state.visitedHeroIds?.includes(hero.id)) return null;
  const route = findHeroPath(catalog, state, hero.id, gate);
  return route.reachable && !route.endsInEncounter ? town : null;
}
