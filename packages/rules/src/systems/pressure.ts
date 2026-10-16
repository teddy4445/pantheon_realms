/**
 * Mission pressure for campaign content v2 (campaign expansion handoff,
 * 2026-10-15): announced deadlines, patrols that withdraw once their home camp
 * falls, and sluices that change a channel's terrain.
 *
 *  - Timers start only when their announced trigger first holds; the start day and
 *    the deadline are saved. Running out sets flags and fails *optional* objectives
 *    only — never the mission, never essential evidence.
 *  - A patrol with a home camp withdraws for good when that camp's guard is cleared:
 *    no endless waves.
 *  - A sluice switches its channel cells between two terrains (route rule and
 *    picture together); it refuses to strand a hero standing in the channel.
 */
import type { HeroId, SiteId } from '../ids';
import { hexEquals, hexKey } from '../core/hex';
import { TERRAIN_CODES, type SiteDefinition } from '../definitions/world';
import type { MissionTimerDefinition } from '../definitions/campaign';
import type { ContentCatalog } from '../definitions/catalog';
import type { MatchState, MissionTimerState } from '../state/match';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { missionSite } from '../resolvers/world';
import { scenarioMission } from '../resolvers/scenario';
import { evaluateCondition, setFlag } from './quests';

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

/** The saved state of every timer (absent entries are still waiting). */
export function timerStates(catalog: ContentCatalog, state: MatchState): { id: string; def: MissionTimerDefinition; state: MissionTimerState }[] {
  const defs = scenarioMission(catalog, state)?.timers ?? [];
  return defs.map((def) => ({ id: def.id, def, state: state.mission.timers?.[def.id] ?? { status: 'waiting' } }));
}

/** Days left before a running timer expires (0 = its last day), or null. */
export function timerDaysLeft(state: MatchState, t: MissionTimerState): number | null {
  if (t.status !== 'running' || t.deadlineDay === undefined) return null;
  return Math.max(0, t.deadlineDay - state.day);
}

export function evaluateTimers(tx: Tx): void {
  const mission = scenarioMission(tx.catalog, tx.state);
  const defs = mission?.timers ?? [];
  if (defs.length === 0) return;
  const timers = (tx.state.mission.timers ??= {});
  for (const def of defs) {
    const st = (timers[def.id] ??= { status: 'waiting' });
    if (st.status === 'waiting' && evaluateCondition(tx.catalog, tx.state, def.startWhen)) {
      st.status = 'running';
      st.startedDay = tx.state.day;
      st.deadlineDay = tx.state.day + def.days;
      tx.emit({ kind: 'TimerStarted', timerId: def.id, label: def.label, deadlineDay: st.deadlineDay });
    }
    if (st.status !== 'running') continue;
    if (evaluateCondition(tx.catalog, tx.state, def.metWhen)) {
      st.status = 'met';
      st.resolvedDay = tx.state.day;
      tx.emit({ kind: 'TimerResolved', timerId: def.id, met: true });
      continue;
    }
    if (st.deadlineDay !== undefined && tx.state.day > st.deadlineDay) {
      st.status = 'expired';
      st.resolvedDay = tx.state.day;
      for (const f of def.onExpire.flags ?? []) setFlag(tx, f);
      for (const id of def.onExpire.failObjectives ?? []) {
        const od = mission?.objectives.find((o) => o.id === id);
        const os = tx.state.mission.objectives[id];
        // Only an optional objective can be lost to a deadline.
        if (!od || od.category !== 'optional' || !os || os.status === 'completed' || os.status === 'failed') continue;
        os.status = 'failed';
        tx.emit({ kind: 'ObjectiveChanged', objectiveId: id, status: 'failed' });
      }
      tx.emit({ kind: 'TimerResolved', timerId: def.id, met: false });
    }
  }
}

// ---------------------------------------------------------------------------
// Patrols with a home camp
// ---------------------------------------------------------------------------

export function withdrawPatrols(tx: Tx): void {
  for (const h of Object.values(tx.state.heroes)) {
    const home = h.ai?.homeSiteId;
    if (!home || h.status !== 'active') continue;
    if (tx.state.world.sites[home]?.cleared !== true) continue;
    h.status = 'retreated';
    tx.emit({ kind: 'PatrolWithdrawn', heroId: h.id, siteId: home });
  }
}

// ---------------------------------------------------------------------------
// Sluices
// ---------------------------------------------------------------------------

type SluiceSite = SiteDefinition & { kind: Extract<SiteDefinition['kind'], { type: 'sluice' }> };

function sluiceDef(catalog: ContentCatalog, state: MatchState, siteId: SiteId): SluiceSite | null {
  const def = missionSite(catalog, state, siteId);
  return def && def.kind.type === 'sluice' ? (def as SluiceSite) : null;
}

/** Write the channel's terrain for the open or closed state (mission start and every operation). */
export function setChannelTerrain(state: MatchState, def: SluiceSite, open: boolean): void {
  const map = state.world.map;
  const code = TERRAIN_CODES[open ? def.kind.openTerrain : def.kind.closedTerrain];
  const chars = map.terrain.split('');
  for (const c of def.kind.channel) {
    if (c.q < 0 || c.r < 0 || c.q >= map.width || c.r >= map.height) continue;
    chars[c.r * map.width + c.q] = code;
  }
  state.world.map = { ...map, terrain: chars.join('') };
}

export interface SluiceQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  /** Open after operating. */
  readonly willOpen: boolean;
  /** Exactly what changes. */
  readonly text: string;
}

export function quoteSluice(catalog: ContentCatalog, state: MatchState, heroId: HeroId, siteId: SiteId): SluiceQuote {
  const def = sluiceDef(catalog, state, siteId);
  const st = state.world.sites[siteId];
  const hero = state.heroes[heroId];
  const willOpen = !st?.open;
  const text = def ? (willOpen ? def.kind.openText : def.kind.closeText) : '';
  const fail = (code: RejectionCode, reason: string): SluiceQuote => ({ legal: false, code, reason, willOpen, text });
  if (!def || !st) return fail('not_found', 'There is no sluice here');
  if (!hero || hero.status !== 'active') return fail('not_owner', 'Unknown hero');
  if (!hexEquals(hero.position, def.coord)) return fail('not_present', `${hero.name} must stand at ${def.name}`);
  if (def.guard && !st.cleared) return fail('missing_requirement', 'Its guards still hold the sluice');
  const target = willOpen ? def.kind.openTerrain : def.kind.closedTerrain;
  if (catalog.rulesProfile.terrainCost[target] === null) {
    const cells = new Set(def.kind.channel.map(hexKey));
    const stranded = Object.values(state.heroes).find((h) => h.status === 'active' && cells.has(hexKey(h.position)));
    if (stranded) return fail('illegal_action', `${stranded.name} stands in the channel; the water would cut them off`);
  }
  return { legal: true, code: null, reason: null, willOpen, text };
}

export function commitOperateSluice(tx: Tx, heroId: HeroId, siteId: SiteId): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  const q = quoteSluice(tx.catalog, tx.state, heroId, siteId);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot operate the sluice');
  const def = sluiceDef(tx.catalog, tx.state, siteId)!;
  const st = tx.state.world.sites[siteId]!;
  st.open = q.willOpen;
  setChannelTerrain(tx.state, def, st.open);
  if (st.open) setFlag(tx, def.kind.openFlag);
  else if (tx.state.mission.flags[def.kind.openFlag]) {
    delete tx.state.mission.flags[def.kind.openFlag];
    tx.emit({ kind: 'MissionFlagCleared', flag: def.kind.openFlag });
  }
  if (!st.visitedBy.includes(hero.ownerId)) st.visitedBy.push(hero.ownerId);
  tx.emit({ kind: 'SluiceOperated', siteId, heroId, open: st.open });
}
