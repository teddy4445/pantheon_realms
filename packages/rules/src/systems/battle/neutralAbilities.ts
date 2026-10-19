/**
 * The six neutral creatures' battle abilities (campaign expansion handoff,
 * 2026-10-15; proposed, unplaytested values in content): Sheltering Wings,
 * Distract, Long Reach, Devour Dread, Reed Guard and Tail Snare.
 *
 * Abilities are data (`AbilityRule` types any creature may carry). Every active
 * one is once per battle *per stack* (`abilityUses`), never multiplied by the
 * creatures in it, and validates its target before anything changes. Statuses
 * that last "until the start of the user's next activation" carry
 * `expiresOnActivationOf` (flow.ts removes them when that stack's scheduled
 * activation begins). Deterministic: no RNG is drawn here.
 */
import type { BattleStackId } from '../../ids';
import { cellDistance, cellKey, cellNeighbors, cellToCube, inBattleBounds, type BattleCell } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { AbilityRule } from '../../definitions/creatures';
import type { BattleStackState, BattleState, BattleStatusState } from '../../state/match';
import { reject, type Tx } from '../../engine/tx';
import { findAbility, isAlive, movementClassOf, occupancy, opposing, sideStacks, stackCells, statsOf } from './common';
import { footprintZoneProblem } from './board';
import { requestFaithfulShadow } from './libraryShadow';
import { applyFrostEntry } from './libraryFields';
import { consumeDisplacementGuard } from './libraryRelics';

type Rule<T extends AbilityRule['type']> = Extract<AbilityRule, { type: T }>;

/** Cells that block a line: obstacles and intact siege structures (stacks and the fallen do not). */
function lineBlockers(battle: BattleState): Set<string> {
  const out = new Set<string>(battle.obstacles.map(cellKey));
  for (const s of battle.siege?.structures ?? []) if (s.hp > 0) for (const c of s.cells) out.add(cellKey(c));
  return out;
}

/** The middle cell of a straight two-hex line from `a` to `b` (null when they are not two apart in one direction). */
export function straightMiddle(a: BattleCell, b: BattleCell, cols: number, rows: number): BattleCell | null {
  if (cellDistance(a, b) !== 2) return null;
  const ca = cellToCube(a);
  const cb = cellToCube(b);
  for (const n of cellNeighbors(a, cols, rows)) {
    const cn = cellToCube(n);
    if (cn.x * 2 === ca.x + cb.x && cn.y * 2 === ca.y + cb.y && cn.z * 2 === ca.z + cb.z) return n;
  }
  return null;
}

/** A clear line between two cells at most two apart: adjacent, or a shared neighbour that is not blocked. */
function clearLineBetween(a: BattleCell, b: BattleCell, battle: BattleState, blockers: Set<string>): boolean {
  const d = cellDistance(a, b);
  if (d <= 1) return true;
  if (d > 2) return false;
  return cellNeighbors(a, battle.cols, battle.rows).some((n) => cellDistance(n, b) === 1 && !blockers.has(cellKey(n)));
}

/** Within `range` hexes with a clear line, measured between occupied cells. */
function inClearReach(catalog: ContentCatalog, battle: BattleState, from: BattleStackState, to: BattleStackState, range: number): boolean {
  const blockers = lineBlockers(battle);
  for (const a of stackCells(catalog, from)) {
    for (const b of stackCells(catalog, to)) {
      const d = cellDistance(a, b);
      if (d <= range && (d <= 1 || clearLineBetween(a, b, battle, blockers))) return true;
    }
  }
  return false;
}

/** Adjacent (occupied-cell distance 1). */
function adjacent(catalog: ContentCatalog, a: BattleStackState, b: BattleStackState): boolean {
  return stackCells(catalog, a).some((x) => stackCells(catalog, b).some((y) => cellDistance(x, y) === 1));
}

export function abilityUsed(stack: BattleStackState, abilityId: string): number {
  return stack.abilityUses?.[abilityId] ?? 0;
}

function spendUse(stack: BattleStackState, abilityId: string): void {
  stack.abilityUses = { ...(stack.abilityUses ?? {}), [abilityId]: abilityUsed(stack, abilityId) + 1 };
}

/** Next application number (earliest-applied ordering for Devour Dread). */
export function nextStatusSeq(battle: BattleState): number {
  battle.statusSeq = (battle.statusSeq ?? 0) + 1;
  return battle.statusSeq;
}

/** Add or refresh a status by source; copies of one source never stack (the strongest stays). */
export function putStatus(battle: BattleState, stack: BattleStackState, status: Omit<BattleStatusState, 'seq'>): void {
  const i = stack.statuses.findIndex((s) => s.sourceId === status.sourceId && s.kind === status.kind);
  if (i >= 0) {
    const old = stack.statuses[i]!;
    stack.statuses[i] = { ...old, ...status, amount: Math.max(old.amount, status.amount), expiresAtRound: Math.max(old.expiresAtRound, status.expiresAtRound) };
  } else {
    stack.statuses.push({ ...status, seq: nextStatusSeq(battle) });
  }
}

/** The status a Devour Dread may remove: a temporary hostile weakening (never a buff, equipment or morale). */
export function isCleansable(s: BattleStatusState, stackSide: BattleStackState['side'] | null): boolean {
  void stackSide;
  if (s.kind === 'min_damage_roll') return s.hostile !== false;
  if (s.kind === 'attack_bonus' || s.kind === 'defense_bonus' || s.kind === 'speed_bonus') return s.amount < 0 && s.hostile !== false;
  return false;
}

/** The earliest-applied cleansable status of a stack (stable source-ID tie-break), or null. */
export function cleansableStatus(stack: BattleStackState): BattleStatusState | null {
  const list = stack.statuses.filter((s) => isCleansable(s, stack.side));
  list.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : a.kind < b.kind ? -1 : 1));
  return list[0] ?? null;
}

// ---------------------------------------------------------------------------
// Long Reach (passive attack option)
// ---------------------------------------------------------------------------

/** A reach strike from `stack` standing at `anchor` against `target`: the straight two-hex line is clear. */
export function reachLine(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, anchor: BattleCell, target: BattleStackState): boolean {
  return reachLineToCells(catalog, battle, stack, anchor, stackCells(catalog, target));
}

/** Long Reach toward any occupied cells (a stack's, or the siege engine's). */
export function reachLineToCells(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, anchor: BattleCell, theirs: readonly BattleCell[]): boolean {
  const rule = findAbility(catalog, stack.creatureId, 'long_reach');
  if (!rule) return false;
  const occ = occupancy(catalog, battle, stack.id);
  const mine = stackCells(catalog, stack, anchor);
  // Adjacent: an ordinary melee strike, not a reach.
  if (mine.some((a) => theirs.some((b) => cellDistance(a, b) <= 1))) return false;
  for (const a of mine) {
    for (const b of theirs) {
      const m = straightMiddle(a, b, battle.cols, battle.rows);
      if (!m) continue;
      const k = cellKey(m);
      const who = occ.get(k);
      // The middle cell is clear of stacks (living or fallen), obstacles and intact structures.
      if (who === undefined) return true;
    }
  }
  return false;
}

/** Damage factor of a reach strike ([numerator, denominator]). */
export function reachFactor(catalog: ContentCatalog, creatureId: string): readonly [number, number] {
  const rule = findAbility(catalog, creatureId, 'long_reach');
  return [rule?.damagePercent ?? 100, 100];
}

// ---------------------------------------------------------------------------
// Active abilities: options (read-only) and execution
// ---------------------------------------------------------------------------

export interface NeutralAbilityOption {
  readonly abilityId: string;
  readonly name: string;
  readonly targets: BattleStackId[];
  readonly reason: string | null;
}

/** Legal targets (and why not) for each of the stack's active neutral abilities. */
export function neutralAbilityOptions(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): NeutralAbilityOption[] {
  const out: NeutralAbilityOption[] = [];
  const allies = sideStacks(battle, stack.side);
  const enemies = sideStacks(battle, opposing(stack.side));
  for (const abilityId of catalog.creatures[stack.creatureId]?.abilityIds ?? []) {
    const def = catalog.abilities[abilityId];
    if (!def || def.activation !== 'active') continue;
    const rule = def.rule;
    const used = (n: number) => (abilityUsed(stack, abilityId) >= n ? 'Already used in this battle' : null);
    const push = (targets: BattleStackId[], reason: string | null, none: string) =>
      out.push({ abilityId, name: def.name, targets: reason ? [] : targets, reason: reason ?? (targets.length === 0 ? none : null) });
    switch (rule.type) {
      case 'sheltering_wings':
        push(
          allies.filter((a) => a.id !== stack.id && adjacent(catalog, stack, a)).map((a) => a.id),
          used(rule.usesPerBattle),
          'No adjacent ally to shelter',
        );
        break;
      case 'distract':
        push(
          enemies.filter((e) => inClearReach(catalog, battle, stack, e, rule.range)).map((e) => e.id),
          used(rule.usesPerBattle),
          `No enemy within ${rule.range} hexes in a clear line`,
        );
        break;
      case 'devour_dread': {
        const inReach = allies.filter((a) => a.id === stack.id || inClearReach(catalog, battle, stack, a, rule.range));
        push(
          inReach.filter((a) => cleansableStatus(a) !== null).map((a) => a.id),
          used(rule.usesPerBattle),
          'No ally within reach has a temporary hostile debuff',
        );
        break;
      }
      case 'reed_guard':
        push(
          allies.filter((a) => a.id !== stack.id && adjacent(catalog, stack, a)).map((a) => a.id),
          used(rule.usesPerBattle),
          'No adjacent ally to guard',
        );
        break;
      case 'tail_snare': {
        const reason = used(rule.usesPerBattle);
        const targets: BattleStackId[] = [];
        let blocked: string | null = null;
        for (const e of enemies) {
          const why = snareProblem(catalog, battle, stack, e, rule);
          if (why === null) targets.push(e.id);
          else if (why.startsWith('Protected') || why === 'The pull would end in the water' || why === 'The pull would drag it out of the water') blocked = why;
        }
        push(targets, reason, blocked ?? 'No one-hex enemy exactly two hexes away in a clear straight line');
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/** Why `target` cannot be snared now (null when it can). */
function snareProblem(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, target: BattleStackState, rule: Rule<'tail_snare'>): string | null {
  if (!isAlive(target) || target.side === stack.side) return 'Choose a living enemy stack';
  if (statsOf(catalog, target.creatureId).footprint !== 1) return 'Only a one-hex stack can be pulled';
  const from = stackCells(catalog, stack);
  const dest = pullDestination(catalog, battle, from, target, rule.distance);
  if (!dest) {
    // Exactly two away in a straight line, but the target may not stand on the hex between (water on a boarding
    // board; the deck for a swimmer or the water for a walker at sea): the pull fails, nobody is drowned.
    const cls = movementClassOf(catalog, target.creatureId);
    const zone = from
      .map((a) => straightMiddle(a, target.anchor, battle.cols, battle.rows))
      .map((m) => (m ? footprintZoneProblem(battle, [m], cls) : null))
      .find((x) => !!x);
    return zone ? (cls === 'swim' ? 'The pull would drag it out of the water' : 'The pull would end in the water') : 'Not exactly two hexes away in a clear straight line';
  }
  if (target.statuses.some((s) => s.kind === 'pull_immunity')) return 'Protected from pulls (Reed Guard)';
  if (target.statuses.some((s) => s.kind === 'rooted')) return 'Rooted creatures cannot be displaced';
  return null;
}

/** The cell a snared stack is pulled to: the middle of a straight two-hex line, empty, on the board, not a hazard. */
function pullDestination(catalog: ContentCatalog, battle: BattleState, from: readonly BattleCell[], target: BattleStackState, distance: number): BattleCell | null {
  if (distance !== 2) return null;
  const occ = occupancy(catalog, battle, target.id, target.side);
  const moat = new Set((battle.siege?.moat ?? []).map(cellKey));
  for (const a of from) {
    const m = straightMiddle(a, target.anchor, battle.cols, battle.rows);
    if (!m) continue;
    if (!inBattleBounds(m, battle.cols, battle.rows)) continue;
    // A forced move onto a hex the target may not stand on (the board's zones for its movement class) fails:
    // nobody is ever drowned or beached (the shared occupancy validator, board.ts).
    if (footprintZoneProblem(battle, [m], movementClassOf(catalog, target.creatureId))) continue;
    const k = cellKey(m);
    if (occ.has(k) || moat.has(k)) continue;
    return m;
  }
  return null;
}

/** Execute an active neutral ability (validated first; spends the activation unless stated). Returns false when the rule is not a neutral ability. */
export function commitNeutralAbility(tx: Tx, battle: BattleState, stack: BattleStackState, abilityId: string, targetId: BattleStackId): boolean {
  const def = tx.catalog.abilities[abilityId];
  if (!def) return false;
  const rule = def.rule;
  const catalog = tx.catalog;
  const target = battle.stacks[targetId];
  const label = def.name;
  const needUse = (n: number) => {
    if (abilityUsed(stack, abilityId) >= n) reject('illegal_action', `${label} was already used by this stack in this battle`);
  };
  switch (rule.type) {
    case 'sheltering_wings': {
      needUse(rule.usesPerBattle);
      if (!target || !isAlive(target) || target.side !== stack.side || target.id === stack.id) reject('illegal_target', 'Choose another friendly stack');
      if (!adjacent(catalog, stack, target)) reject('illegal_target', 'The ally must stand next to this stack');
      spendUse(stack, abilityId);
      putStatus(battle, target, { sourceId: `ability:${rule.type}`, label, kind: 'damage_ward', amount: rule.reductionPercent, numerator: 1, denominator: 1, expiresAtRound: Number.MAX_SAFE_INTEGER, expiresOnActivationOf: stack.id, sourceStackId: stack.id, sourceSide: stack.side });
      tx.emit({ kind: 'BattleAbilityUsed', stackId: stack.id, abilityId, targetId });
      return true;
    }
    case 'distract': {
      needUse(rule.usesPerBattle);
      if (!target || !isAlive(target) || target.side === stack.side) reject('illegal_target', 'Choose a living enemy stack');
      if (!inClearReach(catalog, battle, stack, target, rule.range)) reject('illegal_target', `The enemy must be within ${rule.range} hexes in a clear line`);
      spendUse(stack, abilityId);
      putStatus(battle, target, { sourceId: `ability:${rule.type}`, label, kind: 'retaliation_suppressed', amount: 1, numerator: 1, denominator: 1, expiresAtRound: Number.MAX_SAFE_INTEGER, expiresOnActivationOf: stack.id, sourceStackId: stack.id, sourceSide: stack.side, hostile: true });
      tx.emit({ kind: 'BattleAbilityUsed', stackId: stack.id, abilityId, targetId });
      return true;
    }
    case 'devour_dread': {
      needUse(rule.usesPerBattle);
      if (!target || !isAlive(target) || target.side !== stack.side) reject('illegal_target', 'Choose a friendly stack (this one included)');
      if (target.id !== stack.id && !inClearReach(catalog, battle, stack, target, rule.range)) reject('illegal_target', `The ally must be within ${rule.range} hexes in a clear line`);
      const st = cleansableStatus(target);
      if (!st) reject('illegal_target', 'That stack has no temporary hostile debuff to remove');
      spendUse(stack, abilityId);
      target.statuses = target.statuses.filter((s) => s !== st);
      tx.emit({ kind: 'BattleAbilityUsed', stackId: stack.id, abilityId, targetId, removedStatus: st.label });
      return true;
    }
    case 'reed_guard': {
      needUse(rule.usesPerBattle);
      if (!target || !isAlive(target) || target.side !== stack.side || target.id === stack.id) reject('illegal_target', 'Choose another friendly stack');
      if (!adjacent(catalog, stack, target)) reject('illegal_target', 'The ally must stand next to this stack');
      spendUse(stack, abilityId);
      stack.defending = true;
      tx.emit({ kind: 'BattleStackDefended', stackId: stack.id });
      const source = `ability:${rule.type}`;
      putStatus(battle, target, { sourceId: source, label, kind: 'defense_bonus', amount: rule.defenseBonus, numerator: 1, denominator: 1, expiresAtRound: Number.MAX_SAFE_INTEGER, expiresOnActivationOf: stack.id, sourceStackId: stack.id, sourceSide: stack.side, hostile: false });
      putStatus(battle, target, { sourceId: source, label, kind: 'pull_immunity', amount: 1, numerator: 1, denominator: 1, expiresAtRound: Number.MAX_SAFE_INTEGER, expiresOnActivationOf: stack.id, sourceStackId: stack.id, sourceSide: stack.side, hostile: false });
      tx.emit({ kind: 'BattleAbilityUsed', stackId: stack.id, abilityId, targetId });
      return true;
    }
    case 'tail_snare': {
      needUse(rule.usesPerBattle);
      if (!target) reject('illegal_target', 'Choose a living enemy stack');
      const why = snareProblem(catalog, battle, stack, target, rule);
      if (why) reject('illegal_target', why);
      const dest = pullDestination(catalog, battle, stackCells(catalog, stack), target, rule.distance)!;
      spendUse(stack, abilityId);
      if (consumeDisplacementGuard(battle, target) || requestFaithfulShadow(tx, battle, target)) {
        tx.emit({ kind: 'BattleAbilityUsed', stackId: stack.id, abilityId, targetId });
        return true;
      }
      const from = target.anchor;
      target.anchor = dest;
      tx.emit({ kind: 'BattleAbilityUsed', stackId: stack.id, abilityId, targetId });
      tx.emit({ kind: 'BattleStackMoved', stackId: target.id, path: [from, dest], flying: false, forced: 'pull', byStackId: stack.id });
      applyFrostEntry(tx, battle, target, from, dest);
      return true;
    }
    default:
      return false;
  }
}

/** Sheltering Wings on the target of a direct creature-damage event: the reduced damage (and the ward is spent). */
export function wardedDamage(tx: Tx, target: BattleStackState, damage: number): number {
  const i = target.statuses.findIndex((s) => s.kind === 'damage_ward');
  if (i < 0 || damage <= 0) return damage;
  const ward = target.statuses[i]!;
  const reduction = Math.floor((damage * ward.amount) / 100);
  target.statuses = target.statuses.filter((_, j) => j !== i);
  tx.emit({ kind: 'BattleStatusConsumed', stackId: target.id, status: 'damage_ward', amount: reduction });
  return damage - reduction;
}

/** Preview of a warded blow (no state change): the damage after the ward's reduction. */
export function previewWarded(target: BattleStackState, damage: number): number {
  const ward = target.statuses.find((s) => s.kind === 'damage_ward');
  if (!ward || damage <= 0) return damage;
  return damage - Math.floor((damage * ward.amount) / 100);
}

/** Distract: a retaliation that would happen is suppressed instead (counts as used). True when suppressed. */
export function suppressRetaliation(tx: Tx, stack: BattleStackState): boolean {
  const i = stack.statuses.findIndex((s) => s.kind === 'retaliation_suppressed');
  if (i < 0) return false;
  stack.statuses = stack.statuses.filter((_, j) => j !== i);
  stack.retaliationsUsed += 1;
  tx.emit({ kind: 'BattleStatusConsumed', stackId: stack.id, status: 'retaliation_suppressed' });
  return true;
}

/** Remove the statuses that end when `stack`'s scheduled activation begins (from every stack). */
export function expireOnActivation(battle: BattleState, stack: BattleStackState): void {
  for (const s of Object.values(battle.stacks)) {
    if (s.statuses.some((st) => st.expiresOnActivationOf === stack.id)) s.statuses = s.statuses.filter((st) => st.expiresOnActivationOf !== stack.id);
  }
}
