/**
 * Battle helpers: stack stats, alive counts, occupancy, effective values.
 *
 * Aggregate stack HP is stored; alive count and front-creature HP are derived
 * (design/04 §5), never stored independently.
 */
import type { BattleStackId, CreatureId } from '../../ids';
import { cellDistance, cellKey, footprintCells, inBattleBounds, type BattleCell } from '../../core/hex';
import { getAbility, requireStats, type ContentCatalog } from '../../definitions/catalog';
import type { AbilityRule, CreatureStats } from '../../definitions/creatures';
import type { BattleSideId, BattleStackState, BattleState, MatchState } from '../../state/match';
import { reject, type Tx } from '../../engine/tx';

export function requireBattle(state: MatchState): BattleState {
  if (!state.battle || state.battle.status !== 'active') reject('no_battle', 'No battle in progress');
  return state.battle;
}

export function statsOf(catalog: ContentCatalog, creatureId: CreatureId): CreatureStats {
  return requireStats(catalog, creatureId).stats;
}

export function aliveCount(catalog: ContentCatalog, stack: BattleStackState): number {
  if (stack.totalHp <= 0) return 0;
  return Math.ceil(stack.totalHp / statsOf(catalog, stack.creatureId).hp);
}

export function frontHp(catalog: ContentCatalog, stack: BattleStackState): number {
  const hp = statsOf(catalog, stack.creatureId).hp;
  const alive = aliveCount(catalog, stack);
  return alive === 0 ? 0 : stack.totalHp - (alive - 1) * hp;
}

export function isAlive(stack: BattleStackState): boolean {
  return stack.totalHp > 0;
}

export function stackCells(catalog: ContentCatalog, stack: BattleStackState, anchor: BattleCell = stack.anchor): BattleCell[] {
  return footprintCells(anchor, statsOf(catalog, stack.creatureId).footprint, stack.facing);
}

export function abilityRules(catalog: ContentCatalog, creatureId: CreatureId): AbilityRule[] {
  const def = catalog.creatures[creatureId];
  return (def?.abilityIds ?? []).map((id) => getAbility(catalog, id).rule);
}

export function findAbility<T extends AbilityRule['type']>(
  catalog: ContentCatalog,
  creatureId: CreatureId,
  type: T,
): Extract<AbilityRule, { type: T }> | undefined {
  return abilityRules(catalog, creatureId).find((r) => r.type === type) as Extract<AbilityRule, { type: T }> | undefined;
}

export function sideStacks(battle: BattleState, side: BattleSideId, aliveOnly = true): BattleStackState[] {
  return Object.values(battle.stacks)
    .filter((s) => s.side === side && (!aliveOnly || isAlive(s)))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function opposing(side: BattleSideId): BattleSideId {
  return side === 'attacker' ? 'defender' : 'attacker';
}

/**
 * Occupancy: cell key -> stack id, 'obstacle' or 'structure:<id>'. Intact siege
 * structures block every stack except that the intact gate opens for the
 * defending side (`forSide`).
 */
export function occupancy(catalog: ContentCatalog, battle: BattleState, exceptId?: BattleStackId, forSide?: BattleSideId): Map<string, string> {
  const occ = new Map<string, string>();
  for (const o of battle.obstacles) occ.set(cellKey(o), 'obstacle');
  for (const s of battle.siege?.structures ?? []) {
    if (s.hp <= 0 || (s.kind === 'gate' && forSide === 'defender')) continue;
    for (const c of s.cells) occ.set(cellKey(c), `structure:${s.id}`);
  }
  const structureCells = new Set((battle.siege?.structures ?? []).flatMap((st) => st.cells.map(cellKey)));
  for (const s of Object.values(battle.stacks)) {
    if (s.id === exceptId) continue;
    if (isAlive(s)) {
      for (const c of stackCells(catalog, s)) occ.set(cellKey(c), s.id);
    } else if (s.anchor) {
      // The fallen stay where they fell (owner request 2026-10-03): their cells are taken
      // for the rest of the battle — except in a wall or gate opening, so a corpse in a
      // breach can never seal a town. Flyers still pass over them.
      for (const c of stackCells(catalog, s)) {
        const k = cellKey(c);
        if (!occ.has(k) && !structureCells.has(k)) occ.set(k, `corpse:${s.id}`);
      }
    }
  }
  return occ;
}

export function footprintFree(cells: readonly BattleCell[], occ: Map<string, string>, battle: BattleState): boolean {
  return cells.every((c) => inBattleBounds(c, battle.cols, battle.rows) && !occ.has(cellKey(c)));
}

// ---------------------------------------------------------------------------
// Effective values (shared by preview, execution, UI and AI)
// ---------------------------------------------------------------------------

function statusSum(stack: BattleStackState, kind: BattleStackState['statuses'][number]['kind']): number {
  return stack.statuses.filter((s) => s.kind === kind).reduce((n, s) => n + s.amount, 0);
}

/** The creature's Shapeshift rule (null when it has none). */
export function shapeshiftRule(catalog: ContentCatalog, creatureId: CreatureId): Extract<AbilityRule, { type: 'shapeshift' }> | null {
  return findAbility(catalog, creatureId, 'shapeshift') ?? null;
}

/** Modifier of the stack's current aspect (zero in its normal aspect). */
function aspectMod(catalog: ContentCatalog, stack: BattleStackState, stat: 'attack' | 'defense' | 'speed'): number {
  if (!stack.aspect) return 0;
  return shapeshiftRule(catalog, stack.creatureId)?.[stat] ?? 0;
}

/** creature_stat effects of the stack's side that match this creature (tier/ability filters). */
function sideStatMod(catalog: ContentCatalog, battle: BattleState | undefined, stack: BattleStackState, stat: 'attack' | 'defense' | 'speed'): number {
  const fx = battle?.sides[stack.side].effects;
  if (!fx || fx.creatureStats.length === 0) return 0;
  const def = catalog.creatures[stack.creatureId];
  if (!def) return 0;
  let n = 0;
  for (const e of fx.creatureStats) {
    if (e.stat !== stat) continue;
    if (e.minTier !== undefined && def.tier < e.minTier) continue;
    if (e.maxTier !== undefined && def.tier > e.maxTier) continue;
    if (e.ability !== undefined && !abilityRules(catalog, stack.creatureId).some((r) => r.type === e.ability)) continue;
    if (e.familyId !== undefined && def.familyId !== e.familyId) continue;
    n += e.amount;
  }
  return n;
}

/** True when the side's wounded_fury applies to this stack now (at most num/den of its starting creatures alive). */
export function furyActive(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): boolean {
  const fury = battle.sides[stack.side].effects?.fury;
  if (!fury || !isAlive(stack)) return false;
  return aliveCount(catalog, stack) * fury.denominator <= stack.startingCount * fury.numerator;
}

/** Effective Attack and its parts (the preview, AI and inspection all read this). */
export function attackBreakdown(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState) {
  const side = battle.sides[stack.side];
  const base = statsOf(catalog, stack.creatureId).attack;
  const commander = side.commander?.attack ?? 0;
  const statuses = statusSum(stack, 'attack_bonus');
  const aspect = aspectMod(catalog, stack, 'attack');
  const effects = sideStatMod(catalog, battle, stack, 'attack') + (side.effects?.harmony?.attack ?? 0);
  const fury = furyActive(catalog, battle, stack) ? (side.effects?.fury?.attack ?? 0) : 0;
  return { base, commander, statuses, aspect, effects, fury, total: Math.max(0, base + commander + statuses + aspect + effects + fury) };
}

/** Effective Defense (before the Defend multiplier) and its parts. */
export function defenseBreakdown(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState) {
  const side = battle.sides[stack.side];
  const base = statsOf(catalog, stack.creatureId).defense;
  const commander = side.commander?.defense ?? 0;
  const statuses = statusSum(stack, 'defense_bonus');
  const aspect = aspectMod(catalog, stack, 'defense');
  const effects = sideStatMod(catalog, battle, stack, 'defense') + (side.effects?.harmony?.defense ?? 0);
  return { base, commander, statuses, aspect, effects, total: Math.max(0, base + commander + statuses + aspect + effects) };
}

export function effectiveAttack(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): number {
  return attackBreakdown(catalog, battle, stack).total;
}

/** Defense before the Defend multiplier. */
export function effectiveDefense(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): number {
  return defenseBreakdown(catalog, battle, stack).total;
}

/** Battle Speed: base + aspect + matching creature_stat effects (never below 1; adventure travel uses base Speed). */
export function effectiveSpeed(catalog: ContentCatalog, stack: BattleStackState, battle?: BattleState): number {
  const base = statsOf(catalog, stack.creatureId).speed;
  return Math.max(1, base + aspectMod(catalog, stack, 'speed') + sideStatMod(catalog, battle, stack, 'speed') + statusSum(stack, 'speed_bonus'));
}

export function effectiveMorale(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): number {
  const side = battle.sides[stack.side];
  let m = (side.commander?.morale ?? 0) + side.factionMorale;
  const unyielding = findAbility(catalog, stack.creatureId, 'unyielding');
  if (unyielding) m = Math.max(m, unyielding.minimumMorale);
  const clamp = catalog.rulesProfile.combat.moraleClamp;
  return Math.max(-clamp, Math.min(clamp, m));
}

export function effectiveLuck(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): number {
  const clamp = catalog.rulesProfile.combat.luckClamp;
  const l = battle.sides[stack.side].commander?.luck ?? 0;
  return Math.max(-clamp, Math.min(clamp, l));
}

export function retaliationAllowance(catalog: ContentCatalog, creatureId: CreatureId): number | 'unlimited' {
  const r = findAbility(catalog, creatureId, 'retaliations');
  return r ? r.perRound : 1;
}

export function canRetaliate(catalog: ContentCatalog, stack: BattleStackState): boolean {
  if (!isAlive(stack)) return false;
  const allowance = retaliationAllowance(catalog, stack.creatureId);
  return allowance === 'unlimited' || stack.retaliationsUsed < allowance;
}

/** Shooting range in hexes (0 for creatures that do not shoot). */
export function shootingRange(catalog: ContentCatalog, creatureId: CreatureId): number {
  return statsOf(catalog, creatureId).range ?? 0;
}

/** Whether a shooter's target lies within its range (nearest cells of the two stacks). */
export function inShootingRange(catalog: ContentCatalog, shooter: BattleStackState, target: BattleStackState): boolean {
  const dist = Math.min(...stackCells(catalog, shooter).flatMap((x) => stackCells(catalog, target).map((y) => cellDistance(x, y))));
  return dist <= shootingRange(catalog, shooter.creatureId);
}

export function isShooter(catalog: ContentCatalog, creatureId: CreatureId): boolean {
  return !!findAbility(catalog, creatureId, 'shooter') && statsOf(catalog, creatureId).shots > 0;
}

export function hasFlight(catalog: ContentCatalog, creatureId: CreatureId): boolean {
  return !!findAbility(catalog, creatureId, 'flight');
}

export function killsFrom(catalog: ContentCatalog, target: BattleStackState, damage: number): number {
  const before = aliveCount(catalog, target);
  const hp = statsOf(catalog, target.creatureId).hp;
  const remaining = Math.max(0, target.totalHp - damage);
  return before - (remaining <= 0 ? 0 : Math.ceil(remaining / hp));
}

/** Apply hostile HP damage to a stack (kills count for XP); removes a destroyed stack from the queues. */
export function applyDamage(tx: Tx, battle: BattleState, target: BattleStackState, damage: number): number {
  const killed = killsFrom(tx.catalog, target, damage);
  target.totalHp = Math.max(0, target.totalHp - damage);
  target.killedByEnemy += killed;
  if (!isAlive(target)) {
    tx.emit({ kind: 'BattleStackDestroyed', stackId: target.id });
    battle.normalQueue = battle.normalQueue.filter((id) => id !== target.id);
    battle.waitQueue = battle.waitQueue.filter((id) => id !== target.id);
  }
  return killed;
}
