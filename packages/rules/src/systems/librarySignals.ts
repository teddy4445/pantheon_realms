import { axialDistance, type HexCoord } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import type { HeroState, MatchState } from '../state/match';
import type { Tx } from '../engine/tx';
import { cellIndex, inMap, siteAt, terrainAt, visibleCells } from '../resolvers/world';
export function decoyProblem(catalog: ContentCatalog, state: MatchState, hero: HeroState, target: HexCoord, range: number): string | null {
  if (!inMap(state.world.map, target) || state.fog[hero.ownerId]?.explored[cellIndex(state.world.map, target)] !== 1 || axialDistance(hero.position, target) > range) return 'Choose a known land hex within four steps';
  // Terrain and known sites only: hidden occupancy must not leak through a quote.
  if (terrainAt(state.world.map, target) === 'water' || catalog.rulesProfile.terrainCost[terrainAt(state.world.map, target)] === null) return 'Choose passable land';
  const seen=visibleCells(catalog,state,hero.ownerId);
  if (siteAt(catalog,state,target) || Object.values(state.heroes).some((h)=>h.status==='active'&&h.position.q===target.q&&h.position.r===target.r&&seen.has(cellIndex(state.world.map,target)))) return 'Choose an empty known land hex';
  return null;
}
export function processLibrarySignals(tx: Tx): void {
  if (!tx.state.scenario.features?.mythicLibraryV2) return;
  tx.state.world.signals = (tx.state.world.signals ?? []).filter((s) => s.untilDay > tx.state.day);
  for (const s of tx.state.world.signals) for (const h of Object.values(tx.state.heroes)) if (h.status === 'active' && axialDistance(h.position, s.coord) <= 2 && !s.identifiedBy.includes(h.ownerId)) s.identifiedBy.push(h.ownerId);
}
/** Only currently visible signals, except the caster's own. No owner/expiry leak to rivals. */
export function visibleLibrarySignals(catalog: ContentCatalog, state: MatchState, playerId: string) {
  if (!state.scenario.features?.mythicLibraryV2) return [];
  const seen = visibleCells(catalog, state, playerId);
  return (state.world.signals ?? []).filter((s) => s.untilDay > state.day && (s.ownerId === playerId || seen.has(cellIndex(state.world.map, s.coord)))).map((s) => ({ id: s.id, coord: s.coord, identified: s.identifiedBy.includes(playerId) || Object.values(state.heroes).some((h) => h.ownerId === playerId && h.status === 'active' && axialDistance(h.position, s.coord) <= 2) }));
}
