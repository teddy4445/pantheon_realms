/**
 * ObservationBuilder: produces the AI's *belief state* — a redacted copy of
 * MatchState containing only what `playerId` may legally know.
 *
 * Hidden enemy heroes, unexplored sites, other players' wallets and fog are
 * removed BEFORE the planner runs, so the planner can safely reuse the shared
 * rules resolvers (pathfinding, quotes) without omniscience.
 */
import {
  cellIndex,
  deepClone,
  getMission,
  hireOptions,
  visibleCells,
  type ContentCatalog,
  type HireCandidate,
  type MatchState,
  type PlayerId,
} from '@pr/rules';

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

export function buildObservation(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): AIObservation {
  const belief = deepClone(state);
  const map = belief.world.map;
  const visible = visibleCells(catalog, state, playerId);
  const fog = belief.fog[playerId];
  const explored = (q: number, r: number) => !fog || fog.explored[cellIndex(map, { q, r })] === 1;

  for (const [id, hero] of Object.entries(belief.heroes)) {
    if (hero.ownerId === playerId) continue;
    if (!visible.has(cellIndex(map, hero.position)) || hero.status !== 'active') delete belief.heroes[id];
  }
  for (const [id, p] of Object.entries(belief.players)) {
    if (id !== playerId) p.wallet = { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 };
  }
  for (const id of Object.keys(belief.fog)) if (id !== playerId) delete belief.fog[id];
  const mission = getMission(catalog, belief.mission.missionId);
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
