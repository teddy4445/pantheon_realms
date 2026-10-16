/**
 * Divine interventions (proposed this build): miracles paid for in Favor.
 *
 * A player may invoke at most one intervention per world week, adventure or
 * battle. Interventions are catalog data (effect types from
 * definitions/skirmish.ts) offered to every pantheon or to listed pantheons;
 * a scenario enables them with its `interventions` feature (The Three Beacons
 * does not, so its Favor economy stays as documented).
 */
import type { BattleStackId, PlayerId, TownId } from '../ids';
import { resources } from '../core/resources';
import type { ContentCatalog } from '../definitions/catalog';
import type { InterventionDefinition } from '../definitions/skirmish';
import type { BattleSideId, MatchState } from '../state/match';
import { maxMana, movementBudget } from '../resolvers/heroes';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { grant, spend } from './economy';
import { weekOf } from './turn';
import { applyDamage, frontHp, isAlive, requireBattle, sideStacks, statsOf } from './battle/common';
import { applyStatus, battleEnded, requireControl } from './battle/actions';

export function interventionsEnabled(state: MatchState): boolean {
  return state.scenario.features?.interventions === true;
}

/** A miracle as a pantheon knows it: its own god's name for a shared miracle (same effect, cost and art). */
export function interventionForPantheon(def: InterventionDefinition, pantheonId: string | null | undefined): InterventionDefinition {
  const name = pantheonId ? def.names?.[pantheonId] : undefined;
  return name && name !== def.name ? { ...def, name } : def;
}

/** One intervention by ID, named as the player's pantheon names it (null when unknown). */
export function interventionOf(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, interventionId: string): InterventionDefinition | null {
  const def = catalog.interventions?.[interventionId];
  return def ? interventionForPantheon(def, state.players[playerId]?.pantheonId) : null;
}

/** Interventions this player's pantheon offers (both contexts), in stable order, under the pantheon's own names. */
export function interventionsFor(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): InterventionDefinition[] {
  const player = state.players[playerId];
  if (!player || !interventionsEnabled(state)) return [];
  return Object.values(catalog.interventions ?? {})
    .filter((d) => !d.pantheonIds || d.pantheonIds.includes(player.pantheonId))
    .map((d) => interventionForPantheon(d, player.pantheonId))
    .sort((a, b) => (a.context === b.context ? (a.favorCost - b.favorCost || (a.id < b.id ? -1 : 1)) : a.context === 'adventure' ? -1 : 1));
}

export interface InterventionQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly def: InterventionDefinition | null;
}

/** True when the player already invoked an intervention this world week. */
export function interventionUsedThisWeek(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): boolean {
  const week = weekOf(state.day, catalog.rulesProfile.daysPerWeek);
  return (state.players[playerId]?.interventionWeek ?? 0) === week;
}

export function quoteIntervention(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  interventionId: string,
  target: { townId?: TownId | null; stackId?: BattleStackId | null } = {},
): InterventionQuote {
  const def = interventionOf(catalog, state, playerId, interventionId);
  const fail = (code: RejectionCode, reason: string): InterventionQuote => ({ legal: false, code, reason, def });
  const player = state.players[playerId];
  if (!def || !player) return fail('not_found', 'Unknown intervention');
  if (!interventionsEnabled(state)) return fail('not_in_scope', 'Divine interventions are not part of this scenario');
  if (!interventionsFor(catalog, state, playerId).some((d) => d.id === def.id)) return fail('not_in_scope', `${def.name} is not offered to your pantheon`);
  if (interventionUsedThisWeek(catalog, state, playerId)) return fail('already_done', 'The gods answer once per week');
  if (player.wallet.favor < def.favorCost) return fail('insufficient_resources', `Requires ${def.favorCost} Favor`);
  const battle = state.battle;
  if (def.context === 'battle') {
    if (!battle || battle.status !== 'active') return fail('illegal_action', 'Only during a battle');
    const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
    if (!active || battle.sides[active.side].playerId !== playerId) return fail('illegal_action', 'Invoke it at the start of one of your stacks’ activations');
    if (def.target === 'enemy_stack') {
      const t = target.stackId ? battle.stacks[target.stackId] : undefined;
      if (!t || !isAlive(t)) return fail('illegal_target', 'Choose a living enemy stack');
      if (t.side === active.side) return fail('illegal_target', 'Choose an enemy stack');
    }
  } else {
    if (battle) return fail('battle_in_progress', 'Resolve the battle first');
    if (def.target === 'own_town') {
      const town = target.townId ? state.towns[target.townId] : undefined;
      if (!town) return fail('illegal_target', 'Choose one of your towns');
      if (town.ownerId !== playerId) return fail('not_owner', 'Choose one of your towns');
    }
  }
  return { legal: true, code: null, reason: null, def };
}

function payAndMark(tx: Tx, def: InterventionDefinition): void {
  spend(tx, tx.actorId, resources({ favor: def.favorCost }), def.name);
  tx.state.players[tx.actorId]!.interventionWeek = weekOf(tx.state.day, tx.profile.daysPerWeek);
}

export function commitIntervention(tx: Tx, interventionId: string, townId: TownId | null): void {
  const q = quoteIntervention(tx.catalog, tx.state, tx.actorId, interventionId, { townId });
  if (!q.legal || !q.def) reject(q.code ?? 'illegal_action', q.reason ?? 'The gods do not answer');
  const def = q.def;
  if (def.context !== 'adventure') reject('illegal_action', 'Only during a battle');
  payAndMark(tx, def);
  const e = def.effect;
  const heroes = Object.values(tx.state.heroes)
    .filter((h) => h.ownerId === tx.actorId && h.status === 'active' && !h.monster)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  switch (e.type) {
    case 'restore_movement':
      for (const h of heroes) h.movementPoints += Math.floor((movementBudget(tx.catalog, tx.state, h).total * e.percent) / 100);
      break;
    case 'restore_mana':
      for (const h of heroes) h.mana = Math.min(maxMana(tx.catalog, tx.state, h), h.mana + e.amount);
      break;
    case 'grant_resources':
      grant(tx, tx.actorId, resources(e.resources), def.name);
      break;
    case 'town_growth': {
      const town = tx.state.towns[townId!]!;
      for (const familyId of Object.keys(town.population).sort()) {
        const tier = tx.catalog.families[familyId]?.tier ?? 99;
        if (tier > e.maxTier) continue;
        town.population[familyId] = (town.population[familyId] ?? 0) + e.amount;
        tx.emit({ kind: 'PopulationGrown', townId: town.id, familyId, added: e.amount, total: town.population[familyId]! });
      }
      break;
    }
    default:
      reject('illegal_action', 'Only during a battle');
  }
  tx.emit({ kind: 'InterventionInvoked', playerId: tx.actorId, interventionId: def.id, targetTownId: townId ?? null, targetStackId: null });
}

export function commitBattleIntervention(tx: Tx, interventionId: string, targetId: BattleStackId | null): void {
  const battle = requireBattle(tx.state);
  const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
  if (!active) reject('illegal_action', 'Invoke it at the start of a friendly activation');
  requireControl(tx, battle, active.side);
  const q = quoteIntervention(tx.catalog, tx.state, tx.actorId, interventionId, { stackId: targetId });
  if (!q.legal || !q.def) reject(q.code ?? 'illegal_action', q.reason ?? 'The gods do not answer');
  const def = q.def;
  if (def.context !== 'battle') reject('illegal_action', 'Not a battle intervention');
  payAndMark(tx, def);
  const side: BattleSideId = active.side;
  const e = def.effect;
  switch (e.type) {
    case 'battle_status': {
      const kind = e.stat === 'attack' ? 'attack_bonus' : e.stat === 'defense' ? 'defense_bonus' : 'speed_bonus';
      for (const s of sideStacks(battle, side)) {
        applyStatus(s, { sourceId: `intervention:${def.id}`, label: def.name, kind, amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds }, { battle, casterSide: side });
      }
      break;
    }
    case 'battle_heal': {
      let healed = 0;
      for (const s of sideStacks(battle, side)) {
        const hp = statsOf(tx.catalog, s.creatureId).hp;
        const add = Math.max(0, Math.min(hp - frontHp(tx.catalog, s), e.amount));
        s.totalHp += add;
        healed += add;
      }
      tx.emit({ kind: 'BattleStacksHealed', side, healed });
      break;
    }
    case 'battle_smite': {
      const target = battle.stacks[targetId!]!;
      applyDamage(tx, battle, target, e.damage);
      break;
    }
    default:
      reject('illegal_action', 'Not a battle intervention');
  }
  tx.emit({ kind: 'InterventionInvoked', playerId: tx.actorId, interventionId: def.id, targetTownId: null, targetStackId: targetId ?? null });
  battleEnded(tx, battle);
}
