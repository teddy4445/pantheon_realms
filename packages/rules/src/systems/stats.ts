/**
 * MatchStatistics: day-by-day records and running totals for the end-of-game
 * summary, and the score shown there and in the high-score table.
 *
 * Statistics are part of MatchState (recorded by the rules at the start and at
 * every dawn) so a loaded game shows exactly the same history. They never
 * influence play.
 */
import type { PlayerId } from '../ids';
import type { ResourceCost } from '../core/resources';
import type { ContentCatalog } from '../definitions/catalog';
import type { DayStatsRecord, MatchState, MatchStats, PlayerDayStats, PlayerTotals } from '../state/match';
import { scenarioMission } from '../resolvers/scenario';
import { playerTowns } from '../resolvers/town';

/** Gold-equivalent weights used only for statistics and score (not a market rate). */
export const STAT_RESOURCE_VALUE: Readonly<Record<keyof ResourceCost, number>> = { gold: 1, wood: 250, stone: 250, crystal: 500, favor: 500 };

export function goldEquivalent(b: ResourceCost): number {
  let n = 0;
  for (const [k, v] of Object.entries(b)) n += (v ?? 0) * (STAT_RESOURCE_VALUE[k as keyof ResourceCost] ?? 0);
  return n;
}

export function emptyTotals(): PlayerTotals {
  return { battlesWon: 0, battlesLost: 0, creaturesKilled: 0, creaturesLost: 0, buildingsBuilt: 0, creaturesRecruited: 0, sitesCaptured: 0, townsCaptured: 0 };
}

/** The statistics record, created on first use (older states have none). */
export function ensureStats(state: MatchState): MatchStats {
  if (!state.stats) state.stats = { timeline: [], totals: {} };
  for (const id of state.playerOrder) if (!state.stats.totals[id]) state.stats.totals[id] = emptyTotals();
  return state.stats;
}

export function bumpTotal(state: MatchState, playerId: PlayerId | null | undefined, key: keyof PlayerTotals, amount = 1): void {
  if (!playerId || !state.players[playerId] || amount === 0) return;
  const stats = ensureStats(state);
  const t = stats.totals[playerId] ?? (stats.totals[playerId] = emptyTotals());
  t[key] += amount;
}

/** Recruitment Gold value of a player's creatures (heroes on the map plus town garrisons). */
export function armyValue(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): number {
  let total = 0;
  const add = (slots: readonly ({ creatureId: string; count: number } | null)[]) => {
    for (const s of slots) if (s && s.count > 0) total += s.count * (catalog.creatures[s.creatureId]?.cost?.gold ?? 0);
  };
  for (const h of Object.values(state.heroes)) if (h.ownerId === playerId && h.status === 'active') add(h.army.slots);
  for (const t of playerTowns(state, playerId)) add(t.garrison.slots);
  return total;
}

export function playerDayStats(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, income: ResourceCost): PlayerDayStats {
  const mission = scenarioMission(catalog, state);
  const sites = (mission?.sites ?? []).filter((d) => d.kind.type !== 'town' && state.world.sites[d.id]?.owner === playerId).length;
  return {
    armyValue: armyValue(catalog, state, playerId),
    towns: playerTowns(state, playerId).length,
    heroes: Object.values(state.heroes).filter((h) => h.ownerId === playerId && h.status === 'active').length,
    income: goldEquivalent(income),
    gold: state.players[playerId]?.wallet.gold ?? 0,
    sites,
  };
}

/** Record (or replace) today's line in the timeline. `incomeOf` gives each player's daily income. */
export function recordDayStats(catalog: ContentCatalog, state: MatchState, incomeOf: (playerId: PlayerId) => ResourceCost): void {
  const stats = ensureStats(state);
  const players: DayStatsRecord['players'] = {};
  for (const id of state.playerOrder) {
    const p = state.players[id];
    if (!p || p.role === 'scripted_hostile') continue;
    players[id] = playerDayStats(catalog, state, id, incomeOf(id));
  }
  const rec: DayStatsRecord = { day: state.day, players };
  const last = stats.timeline[stats.timeline.length - 1];
  if (last && last.day === state.day) stats.timeline[stats.timeline.length - 1] = rec;
  else stats.timeline.push(rec);
}

export interface ScoreLine {
  readonly label: string;
  readonly points: number;
}

export interface ScoreBreakdown {
  readonly lines: readonly ScoreLine[];
  /** Before the difficulty multiplier. */
  readonly subtotal: number;
  readonly difficultyPercent: number;
  readonly total: number;
}

/**
 * Score (proposed this build): victory 2,000 plus up to 1,500 for winning fast
 * (−25 per day), army value ÷ 100, 300 per town, 100 per captured site,
 * 100 per battle won, 2 per creature killed; times the difficulty multiplier.
 */
export function matchScore(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): ScoreBreakdown {
  const stats = ensureStats(state);
  const totals = stats.totals[playerId] ?? emptyTotals();
  const won = state.outcome.status !== 'running' && (state.outcome.winnerIds?.includes(playerId) ?? state.outcome.status === 'victory');
  const day = state.outcome.status !== 'running' ? state.outcome.day : state.day;
  const now = playerDayStats(catalog, state, playerId, {});
  const lines: ScoreLine[] = [
    { label: won ? 'Victory' : 'No victory', points: won ? 2000 : 0 },
    { label: won ? `Speed (won on day ${day})` : 'Speed', points: won ? Math.max(0, 1500 - 25 * day) : 0 },
    { label: 'Army value ÷ 100', points: Math.floor(now.armyValue / 100) },
    { label: `Towns held (${now.towns} × 300)`, points: now.towns * 300 },
    { label: `Sites held (${now.sites} × 100)`, points: now.sites * 100 },
    { label: `Battles won (${totals.battlesWon} × 100)`, points: totals.battlesWon * 100 },
    { label: `Creatures defeated (${totals.creaturesKilled} × 2)`, points: totals.creaturesKilled * 2 },
  ];
  const subtotal = lines.reduce((n, l) => n + l.points, 0);
  const diff = state.scenario.difficultyId ? catalog.difficulties?.[state.scenario.difficultyId] : undefined;
  const difficultyPercent = diff?.scorePercent ?? 100;
  return { lines, subtotal, difficultyPercent, total: Math.floor((subtotal * difficultyPercent) / 100) };
}
