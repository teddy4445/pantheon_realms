import { allied } from './coalition';
/**
 * QuestSystem: rewards, objective state machine and mission outcome.
 *
 * The journal and map markers are projections of this same state machine.
 * Every reward is applied exactly once through an idempotency key.
 */
import type { HeroId, ObjectiveId, PlayerId } from '../ids';
import { resources } from '../core/resources';
import type { ObjectiveCondition, ObjectiveDefinition } from '../definitions/campaign';
import type { HeroAttribute, RewardDefinition } from '../definitions/logic';
import { placementSlot } from '../resolvers/army';
import { maxMana, movementBudget } from '../resolvers/heroes';
import type { MatchState } from '../state/match';
import type { ContentCatalog } from '../definitions/catalog';
import { reject, type Tx } from '../engine/tx';
import { grant } from './economy';
import { grantArtifact, grantExperience } from './heroes';
import { grantEntitlement } from './divine';
import { commitEndTurn } from './turn';
import { scenarioMission } from '../resolvers/scenario';
import { removeEliminatedCaravans } from './caravans';

export const MISSION_VICTORY_FLAG = 'mission_victory_pending';

export function missionPlayerId(catalog: ContentCatalog, state: MatchState): PlayerId {
  return scenarioMission(catalog, state)?.player.playerId ?? state.playerOrder[0]!;
}

export function missionObjectiveDefs(catalog: ContentCatalog, state: MatchState): readonly ObjectiveDefinition[] {
  return scenarioMission(catalog, state)?.objectives ?? [];
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
    grantHeroReward(tx, heroId, reward);
    if (reward.questXp) grantExperience(tx, heroId, reward.questXp);
  }
  return true;
}

/** Creature, attribute, mana and movement parts of a reward (map events, proposed this build). */
function grantHeroReward(tx: Tx, heroId: HeroId, reward: RewardDefinition): void {
  const hero = tx.state.heroes[heroId];
  if (!hero) return;
  for (const c of reward.creatures ?? []) {
    const slot = placementSlot(hero.army, c.creatureId);
    if (slot === null || c.count <= 0) continue;
    const existing = hero.army.slots[slot];
    if (existing) existing.count += c.count;
    else hero.army.slots[slot] = { stackId: tx.nextId('stack'), creatureId: c.creatureId, count: c.count };
    tx.emit({ kind: 'CreaturesJoined', heroId, creatureId: c.creatureId, count: c.count });
  }
  for (const [attr, amount] of Object.entries(reward.attributes ?? {})) {
    if (!amount) continue;
    hero.attributes[attr as HeroAttribute] += amount;
    tx.emit({ kind: 'AttributeGained', heroId, attribute: attr as HeroAttribute, amount });
  }
  // Army changes never refill movement (slower joiners can lower today's cap); a movement reward comes after.
  if ((reward.creatures ?? []).length > 0) hero.movementPoints = Math.min(hero.movementPoints, movementBudget(tx.catalog, tx.state, hero).total);
  if (reward.mana) hero.mana = Math.min(maxMana(tx.catalog, tx.state, hero), hero.mana + reward.mana);
  if (reward.movement) hero.movementPoints += reward.movement;
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
      return (state.players[playerId]?.pantheon.minorGodIds.length ?? 0) >= (cond.count ?? 1);
    case 'hero_defeated':
      return Object.values(state.heroes).some((h) => h.definitionId === cond.heroDefinitionId && h.ownerId !== playerId && h.status !== 'active');
    case 'town_building':
      return allied(state, state.towns[cond.townId]?.ownerId, playerId) && (state.towns[cond.townId]?.buildings[cond.slotId] ?? 0) >= cond.level;
    case 'site_owned':
      return allied(state, state.world.sites[cond.siteId]?.owner, playerId);
    case 'town_owned':
      return allied(state, state.towns[cond.townId]?.ownerId, playerId);
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
  if (cond.type === 'player_has_minor_god' && (cond.count ?? 1) > 1) {
    const n = state.players[missionPlayerId(catalog, state)]?.pantheon.minorGodIds.length ?? 0;
    return `${Math.min(n, cond.count!)} / ${cond.count}`;
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
    const mission = scenarioMission(tx.catalog, tx.state);
    const heroId = mission?.player.hero.heroId ?? null;
    grantReward(tx, missionPlayerId(tx.catalog, tx.state), heroId, def.reward, `objective:${def.id}`, def.title);
  }
  if (def.completesMission) setFlag(tx, MISSION_VICTORY_FLAG);
  for (const next of def.unlocks ?? []) {
    const ns = tx.state.mission.objectives[next];
    if (ns && ns.status === 'locked') {
      ns.status = 'active';
      tx.emit({ kind: 'ObjectiveChanged', objectiveId: next, status: 'active' });
    }
  }
}

/** The steps an objective waits for (its `requires`, or a claim's `after`). */
export function objectivePrerequisites(def: ObjectiveDefinition): readonly ObjectiveId[] {
  if (def.requires?.length) return def.requires;
  if (def.condition.type === 'claim') return def.condition.after;
  return [];
}

/**
 * A locked step whose condition is already met (done ahead of order): it completes
 * as soon as its prerequisites do. Read-only, for the journal.
 */
export function objectiveDoneEarly(catalog: ContentCatalog, state: MatchState, def: ObjectiveDefinition): boolean {
  if (state.mission.objectives[def.id]?.status !== 'locked' || def.condition.type === 'claim') return false;
  return evaluateCondition(catalog, state, def.condition);
}

/** Advance the objective state machine to a fixed point. */
export function evaluateObjectives(tx: Tx): void {
  const defs = missionObjectiveDefs(tx.catalog, tx.state);
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const def of defs) {
      // A save made before the mission gained this objective: it starts as the mission declares.
      const st = (tx.state.mission.objectives[def.id] ??= { status: def.initialStatus, completedOnDay: null, rewardGranted: false });
      if (st.status === 'locked' && def.requires?.length) {
        if (!def.requires.every((id) => tx.state.mission.objectives[id]?.status === 'completed')) continue;
        st.status = 'active';
        tx.emit({ kind: 'ObjectiveChanged', objectiveId: def.id, status: 'active' });
        changed = true;
        // Falls through: a step whose condition already holds completes in this pass.
      }
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
  if (state.mission.flags['skirmish']) {
    evaluateSkirmishOutcome(tx);
    return;
  }
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
    const mission = scenarioMission(tx.catalog, state);
    const reason = mission ? `${mission.name} complete` : 'Mission complete';
    state.outcome = { status: 'victory', reason, day: state.day, winnerIds: state.coalition?.playerIds ?? [playerId] };
    tx.emit({ kind: 'MissionCompleted', reason });
  }
}

/** Empires that compete for victory (not scripted forces or wandering monsters). */
export function contenderIds(state: MatchState): PlayerId[] {
  return state.playerOrder.filter((p) => {
    const role = state.players[p]?.role;
    return role === 'player' || role === 'rival';
  });
}

function hasPresence(state: MatchState, playerId: PlayerId): boolean {
  const hero = Object.values(state.heroes).some((h) => h.ownerId === playerId && h.status === 'active' && !h.monster);
  return hero || Object.values(state.towns).some((t) => t.ownerId === playerId);
}

/**
 * Skirmish outcome (any number of empires, any mix of humans and AI):
 * an empire with no heroes and no towns is eliminated; the last empire
 * standing wins, as does an empire that holds the relic long enough when the
 * scenario's victory condition says so. The match ends for the humans when no
 * human empire remains.
 */
function evaluateSkirmishOutcome(tx: Tx): void {
  const state = tx.state;
  const contenders = contenderIds(state);
  for (const id of contenders) {
    const p = state.players[id]!;
    if (!p.eliminated) {
      if (hasPresence(state, id)) continue;
      p.eliminated = true;
      tx.emit({ kind: 'PlayerEliminated', playerId: id });
    }
    removeEliminatedCaravans(tx, id);
  }
  const alive = contenders.filter((id) => !state.players[id]!.eliminated);
  const humansAlive = alive.filter((id) => state.players[id]!.controller === 'human');
  const mission = scenarioMission(tx.catalog, state);
  const cond = mission?.victoryCondition;
  let winner: PlayerId | null = null;
  let reason = '';
  if (cond?.type === 'hold_site') {
    const st = state.world.sites[cond.siteId];
    if (st?.owner && alive.includes(st.owner) && (st.heldDays ?? 0) >= cond.days) {
      winner = st.owner;
      const site = mission?.sites.find((x) => x.id === cond.siteId);
      reason = `${state.players[winner]!.name} held ${site?.name ?? 'the relic'} for ${cond.days} days`;
    }
  }
  const soloHuman = contenders.filter((id) => state.players[id]!.controller === 'human').length === 1;
  if (!winner && alive.length === 1 && contenders.length > 1) {
    winner = alive[0]!;
    const human = state.players[winner]!.controller === 'human';
    reason = soloHuman ? (human ? 'All rivals defeated' : 'You have no towns and no heroes remaining.') : `${state.players[winner]!.name} is the last empire standing`;
  }
  if (winner) {
    setFlag(tx, 'rivals_eliminated');
    const human = state.players[winner]!.controller === 'human';
    state.outcome = { status: human ? 'victory' : 'defeat', reason, day: state.day, winnerIds: [winner] };
    tx.emit(human ? { kind: 'MissionCompleted', reason } : { kind: 'MissionFailed', reason });
    return;
  }
  const humansTotal = contenders.filter((id) => state.players[id]!.controller === 'human').length;
  if (humansTotal > 0 && humansAlive.length === 0) {
    const r = alive.length === 0 ? 'Every empire has fallen.' : 'You have no towns and no heroes remaining.';
    state.outcome = { status: 'defeat', reason: r, day: state.day };
    tx.emit({ kind: 'MissionFailed', reason: r });
    return;
  }
  // An empire eliminated during its own turn hands the turn on (hot-seat and AI alike).
  if (state.players[state.activePlayerId]?.eliminated && !state.battle) commitEndTurn(tx);
}
