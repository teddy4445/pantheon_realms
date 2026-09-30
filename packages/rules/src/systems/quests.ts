/**
 * QuestSystem: rewards, objective state machine and mission outcome.
 *
 * The journal and map markers are projections of this same state machine.
 * Every reward is applied exactly once through an idempotency key.
 */
import type { HeroId, ObjectiveId, PlayerId } from '../ids';
import { resources } from '../core/resources';
import type { ObjectiveCondition, ObjectiveDefinition } from '../definitions/campaign';
import type { RewardDefinition } from '../definitions/logic';
import type { MatchState } from '../state/match';
import type { ContentCatalog } from '../definitions/catalog';
import { reject, type Tx } from '../engine/tx';
import { grant } from './economy';
import { grantArtifact, grantExperience } from './heroes';
import { grantEntitlement } from './divine';

export const MISSION_VICTORY_FLAG = 'mission_victory_pending';

export function missionPlayerId(catalog: ContentCatalog, state: MatchState): PlayerId {
  return catalog.missions[state.mission.missionId]?.player.playerId ?? state.playerOrder[0]!;
}

export function missionObjectiveDefs(catalog: ContentCatalog, state: MatchState): readonly ObjectiveDefinition[] {
  return catalog.missions[state.mission.missionId]?.objectives ?? [];
}

export function grantReward(
  tx: Tx,
  playerId: PlayerId,
  heroId: HeroId | null,
  reward: RewardDefinition,
  key: string,
  reason: string,
): boolean {
  if (!tx.applyOnce(`reward:${key}`)) return false;
  if (reward.resources) grant(tx, playerId, resources(reward.resources), reason);
  for (const flag of reward.flags ?? []) setFlag(tx, flag);
  for (const ent of reward.entitlementIds ?? []) grantEntitlement(tx, playerId, ent);
  if (heroId) {
    for (const art of reward.artifactIds ?? []) grantArtifact(tx, heroId, art);
    if (reward.questXp) grantExperience(tx, heroId, reward.questXp);
  }
  return true;
}

export function setFlag(tx: Tx, flag: string): void {
  if (tx.state.mission.flags[flag]) return;
  tx.state.mission.flags[flag] = true;
  tx.emit({ kind: 'MissionFlagSet', flag });
}

export function evaluateCondition(catalog: ContentCatalog, state: MatchState, cond: ObjectiveCondition): boolean {
  const mission = state.mission;
  const playerId = missionPlayerId(catalog, state);
  switch (cond.type) {
    case 'counter_at_least':
      return (mission.counters[cond.counter] ?? 0) >= cond.value;
    case 'site_cleared':
      return state.world.sites[cond.siteId]?.cleared === true;
    case 'site_activated':
      return state.world.sites[cond.siteId]?.activated === true;
    case 'site_visited':
      return state.world.sites[cond.siteId]?.visitedBy.includes(playerId) === true;
    case 'flag':
      return mission.flags[cond.flag] === true;
    case 'player_has_minor_god':
      return (state.players[playerId]?.pantheon.minorGodIds.length ?? 0) > 0;
    case 'hero_army_contains': {
      const hero = state.heroes[cond.heroId];
      if (!hero) return false;
      const n = hero.army.slots.reduce((acc, s) => acc + (s?.creatureId === cond.creatureId ? s.count : 0), 0);
      return n >= cond.count;
    }
    case 'claim':
      return false;
    case 'all':
      return cond.conditions.every((c) => evaluateCondition(catalog, state, c));
    case 'any':
      return cond.conditions.some((c) => evaluateCondition(catalog, state, c));
  }
}

/** Progress text for the journal, e.g. "6 / 10". */
export function conditionProgress(catalog: ContentCatalog, state: MatchState, cond: ObjectiveCondition): string | null {
  if (cond.type === 'counter_at_least') return `${Math.min(state.mission.counters[cond.counter] ?? 0, cond.value)} / ${cond.value}`;
  if (cond.type === 'hero_army_contains') {
    const hero = state.heroes[cond.heroId];
    const n = hero?.army.slots.reduce((acc, s) => acc + (s?.creatureId === cond.creatureId ? s.count : 0), 0) ?? 0;
    return `${Math.min(n, cond.count)} / ${cond.count}`;
  }
  if (cond.type === 'all') {
    const done = cond.conditions.filter((c) => evaluateCondition(catalog, state, c)).length;
    return `${done} / ${cond.conditions.length}`;
  }
  return null;
}

function completeObjective(tx: Tx, def: ObjectiveDefinition): void {
  const st = tx.state.mission.objectives[def.id];
  if (!st) return;
  st.status = 'completed';
  st.completedOnDay = tx.state.day;
  tx.emit({ kind: 'ObjectiveChanged', objectiveId: def.id, status: 'completed' });
  if (def.reward && !st.rewardGranted) {
    st.rewardGranted = true;
    const mission = tx.catalog.missions[tx.state.mission.missionId];
    const heroId = mission?.player.hero.heroId ?? null;
    grantReward(tx, missionPlayerId(tx.catalog, tx.state), heroId, def.reward, `objective:${def.id}`, def.title);
  }
  for (const next of def.unlocks ?? []) {
    const ns = tx.state.mission.objectives[next];
    if (ns && ns.status === 'locked') {
      ns.status = 'active';
      tx.emit({ kind: 'ObjectiveChanged', objectiveId: next, status: 'active' });
    }
  }
}

/** Advance the objective state machine to a fixed point. */
export function evaluateObjectives(tx: Tx): void {
  const defs = missionObjectiveDefs(tx.catalog, tx.state);
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const def of defs) {
      const st = tx.state.mission.objectives[def.id];
      if (!st) continue;
      if (def.condition.type === 'claim') {
        if (st.status === 'locked' || st.status === 'active') {
          const ready = def.condition.after.every((id) => tx.state.mission.objectives[id]?.status === 'completed');
          if (ready) {
            st.status = 'available';
            tx.emit({ kind: 'ObjectiveChanged', objectiveId: def.id, status: 'available' });
            changed = true;
          }
        }
        continue;
      }
      if (st.status === 'locked' || st.status === 'failed') continue;
      const met = evaluateCondition(tx.catalog, tx.state, def.condition);
      if (st.status !== 'completed' && met) {
        completeObjective(tx, def);
        changed = true;
      } else if (def.live && st.status === 'completed' && !met && !tx.state.mission.flags[MISSION_VICTORY_FLAG]) {
        st.status = 'active';
        st.completedOnDay = null;
        tx.emit({ kind: 'ObjectiveChanged', objectiveId: def.id, status: 'active' });
        changed = true;
      }
    }
    if (!changed) break;
  }
}

export function commitClaimObjective(tx: Tx, objectiveId: ObjectiveId): void {
  const def = missionObjectiveDefs(tx.catalog, tx.state).find((d) => d.id === objectiveId);
  const st = tx.state.mission.objectives[objectiveId];
  if (!def || !st) reject('not_found', 'Unknown objective');
  if (def.condition.type !== 'claim') reject('illegal_action', 'This objective completes automatically');
  if (tx.actorId !== missionPlayerId(tx.catalog, tx.state)) reject('not_owner', 'Not your objective');
  if (st.status === 'completed') reject('already_done', 'Already claimed');
  if (st.status !== 'available') reject('missing_requirement', 'Not yet claimable');
  completeObjective(tx, def);
}

/** Mission outcome checks run after every committed command. */
export function evaluateMissionOutcome(tx: Tx): void {
  const state = tx.state;
  if (state.outcome.status !== 'running') return;
  const playerId = missionPlayerId(tx.catalog, state);
  for (const heroId of state.scenario.protectedHeroIds) {
    const hero = state.heroes[heroId];
    if (hero && hero.status !== 'active') {
      const reason =
        hero.status === 'retreated'
          ? `${hero.name} withdrew from battle. The expedition cannot continue without its commander.`
          : `${hero.name} was defeated. The expedition cannot continue without its commander.`;
      state.outcome = { status: 'defeat', reason, day: state.day };
      tx.emit({ kind: 'MissionFailed', reason });
      return;
    }
  }
  const player = state.players[playerId];
  const hasHero = Object.values(state.heroes).some((h) => h.ownerId === playerId && h.status === 'active');
  const hasTown = Object.values(state.towns).some((t) => t.ownerId === playerId);
  if (player && !hasHero && !hasTown) {
    const reason = 'You have no towns and no heroes remaining.';
    state.outcome = { status: 'defeat', reason, day: state.day };
    tx.emit({ kind: 'MissionFailed', reason });
    return;
  }
  if (state.mission.flags[MISSION_VICTORY_FLAG] && !state.pendingDecisions.some((d) => state.heroes[d.heroId]?.ownerId === playerId)) {
    const mission = tx.catalog.missions[state.mission.missionId];
    const reason = mission ? `${mission.name} complete` : 'Mission complete';
    state.outcome = { status: 'victory', reason, day: state.day };
    tx.emit({ kind: 'MissionCompleted', reason });
  }
  // Skirmish elimination victory: every rival player eliminated.
  if (state.outcome.status === 'running' && state.mission.flags['skirmish']) {
    const rivals = state.playerOrder.filter((p) => p !== playerId && state.players[p]?.role === 'rival');
    const alive = rivals.filter((p) => {
      const rh = Object.values(state.heroes).some((h) => h.ownerId === p && h.status === 'active');
      const rt = Object.values(state.towns).some((t) => t.ownerId === p);
      return rh || rt;
    });
    if (rivals.length > 0 && alive.length === 0) {
      state.outcome = { status: 'victory', reason: 'All rivals defeated', day: state.day };
      tx.emit({ kind: 'MissionCompleted', reason: 'All rivals defeated' });
    }
  }
}
