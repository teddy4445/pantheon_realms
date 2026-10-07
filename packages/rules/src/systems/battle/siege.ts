/**
 * SiegeSystem: the temporary deterministic town-siege model (design/04 §8).
 *
 * Every number comes from `rulesProfile.combat.siege` (proposed values). The
 * geometry is fixed for the 15x11 board:
 *
 *   col 10  wall line (odd-r: a full column is a complete barrier)
 *           Fort/Citadel: wall_1 rows 0-2, wall_2 3-4, gate 5, wall_3 6-7, wall_4 8-10
 *           Castle:       tower_n 0, wall_1 1-2, wall_2 3-4, gate 5, wall_3 6-7, wall_4 8-9, tower_s 10
 *   col 9   moat (Citadel+), every row except the gate row
 *   keep    Citadel+, stands behind the east board edge (no board cells)
 *
 * Creature damage never reduces structure HP. The attacker's Catapult removes
 * 1 HP from a structure at each round start: the one the attacker aimed it at
 * (BattleAimCatapult, 2026-10-07) while it stands, otherwise the intact
 * structure with the lowest stable ID (the gate first). Then the keep and each
 * tower shoot: each picks the attacker stack it hurts most — the Gold worth of
 * the creatures its shot removes, shooters counted half again (they hit the
 * town over the walls); ties go to the closest, then the lowest ID. A wall
 * breaker (Cyclops) may spend its activation and one shot for 1 structure HP.
 * Before a siege a defender with more than seven stacks may combine identical
 * stacks of the garrison and the visiting hero (BattleMergeDefenders).
 */
import type { BattleStackId, TownId } from '../../ids';
import { cellKey, footprintDistance, type BattleCell } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { BattleStackState, BattleState, SiegeState, SiegeStructureState, TownState } from '../../state/match';
import { reject, type Tx } from '../../engine/tx';
import { townEffects } from '../../resolvers/town';
import { aliveCount, applyDamage, isShooter, requireBattle, sideStacks, stackCells, statsOf } from './common';
import { requireControl } from './actions';

export type FortificationLevel = 0 | 1 | 2 | 3;

/** Highest `siege_fortification` effect among the town's active buildings (0 = no walls). */
export function townFortificationLevel(catalog: ContentCatalog, town: TownState): FortificationLevel {
  let level = 0;
  for (const e of townEffects(catalog, town)) if (e.type === 'siege_fortification') level = Math.max(level, e.level);
  return level as FortificationLevel;
}

export const SIEGE_GATE_ROW = 5;

type Section = readonly [id: string, kind: SiegeStructureState['kind'], rows: readonly number[]];

const FORT_SECTIONS: readonly Section[] = [
  ['wall_1', 'wall', [0, 1, 2]],
  ['wall_2', 'wall', [3, 4]],
  ['gate', 'gate', [5]],
  ['wall_3', 'wall', [6, 7]],
  ['wall_4', 'wall', [8, 9, 10]],
];

const CASTLE_SECTIONS: readonly Section[] = [
  ['tower_n', 'tower', [0]],
  ['wall_1', 'wall', [1, 2]],
  ['wall_2', 'wall', [3, 4]],
  ['gate', 'gate', [5]],
  ['wall_3', 'wall', [6, 7]],
  ['wall_4', 'wall', [8, 9]],
  ['tower_s', 'tower', [10]],
];

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function buildSiege(catalog: ContentCatalog, rows: number, townId: TownId, level: FortificationLevel): SiegeState {
  const cfg = catalog.rulesProfile.combat.siege;
  const col = cfg.wallCol;
  const structures: SiegeStructureState[] = [];
  const moat: BattleCell[] = [];
  if (level > 0) {
    if (rows !== 11) throw new Error('Siege layout expects an 11-row board');
    const sections = level === 3 ? CASTLE_SECTIONS : FORT_SECTIONS;
    for (const [id, kind, sectionRows] of sections) {
      const hp = kind === 'wall' ? (cfg.wallHpByLevel[level - 1] ?? 2) : kind === 'gate' ? cfg.gateHp : cfg.towerHp;
      structures.push({ id, kind, cells: sectionRows.map((row) => ({ col, row })), hp, maxHp: hp });
    }
    if (level >= 2) {
      structures.push({ id: 'keep', kind: 'keep', cells: [], hp: cfg.keepHp, maxHp: cfg.keepHp });
      for (let row = 0; row < rows; row++) if (row !== SIEGE_GATE_ROW) moat.push({ col: col - 1, row });
    }
    structures.sort(byId);
  }
  return { townId, level, wallCol: col, structures, moat, reserves: [] };
}

export function intactStructures(battle: BattleState): SiegeStructureState[] {
  return (battle.siege?.structures ?? []).filter((s) => s.hp > 0);
}

export function touchesMoat(battle: BattleState, cells: readonly BattleCell[]): boolean {
  if (!battle.siege || battle.siege.moat.length === 0) return false;
  const keys = new Set(battle.siege.moat.map(cellKey));
  return cells.some((c) => keys.has(cellKey(c)));
}

/**
 * Wall factor (design/04 §3): an attacking shooter outside the walls firing at a
 * target inside, across an intact structure in the target's row. Simplification:
 * the crossing section is the one on the target's anchor row.
 */
export function wallPenaltyApplies(catalog: ContentCatalog, battle: BattleState, attacker: BattleStackState, target: BattleStackState): boolean {
  const siege = battle.siege;
  if (!siege || siege.level === 0 || attacker.side !== 'attacker') return false;
  const from = stackCells(catalog, attacker);
  const to = stackCells(catalog, target);
  if (!from.every((c) => c.col < siege.wallCol) || !to.every((c) => c.col > siege.wallCol)) return false;
  return siege.structures.some((s) => s.hp > 0 && s.cells.some((c) => c.row === target.anchor.row));
}

export function damageStructure(
  tx: Tx,
  structure: SiegeStructureState,
  amount: number,
  source: 'catapult' | 'creature',
  attackerId: BattleStackId | null,
): void {
  if (structure.hp <= 0) return;
  structure.hp = Math.max(0, structure.hp - amount);
  tx.emit({ kind: 'SiegeStructureDamaged', structureId: structure.id, source, hp: structure.hp, attackerId });
  if (structure.hp === 0) tx.emit({ kind: 'SiegeStructureDestroyed', structureId: structure.id });
}

/** Reference cell for the off-board keep when choosing its closest target. */
export function keepReferenceCell(battle: BattleState): BattleCell {
  return { col: battle.cols - 1, row: SIEGE_GATE_ROW };
}

/** The structure the Catapult hits next: the aimed one while it stands, else the intact one with the lowest ID. */
export function catapultTarget(battle: BattleState): SiegeStructureState | null {
  const intact = intactStructures(battle).sort(byId);
  const aimed = battle.siege?.catapultTargetId;
  return (aimed ? intact.find((s) => s.id === aimed) : undefined) ?? intact[0] ?? null;
}

/**
 * How much a turret's shot of `damage` hurts `stack`: the Gold worth of the
 * creature HP it removes (a stack at full health loses only what the shot
 * reaches), shooters × 1.5 while they have shots.
 */
export function turretTargetValue(catalog: ContentCatalog, stack: BattleStackState, damage: number): number {
  const hp = Math.max(1, statsOf(catalog, stack.creatureId).hp);
  const unit = catalog.creatures[stack.creatureId]?.cost?.gold ?? hp * 10;
  const removed = Math.min(damage, stack.totalHp);
  const shooter = isShooter(catalog, stack.creatureId) && stack.shotsRemaining > 0 ? 1.5 : 1;
  return (removed / hp) * unit * shooter;
}

/** The attacker stack a turret shoots: most hurt by the shot, then closest, then lowest ID. */
export function turretTarget(catalog: ContentCatalog, battle: BattleState, turret: SiegeStructureState, damage: number): BattleStackState | null {
  const ref = turret.kind === 'keep' ? [keepReferenceCell(battle)] : turret.cells;
  let best: BattleStackState | null = null;
  let bestV = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const a of sideStacks(battle, 'attacker').sort(byId)) {
    const v = Math.round(turretTargetValue(catalog, a, damage) * 1000);
    const d = footprintDistance(ref, stackCells(catalog, a));
    if (v > bestV || (v === bestV && d < bestDist)) {
      best = a;
      bestV = v;
      bestDist = d;
    }
  }
  return best;
}

/** Round-start siege effects: Catapult shot, then keep and towers (stable ID order). */
export function siegeRoundStart(tx: Tx, battle: BattleState): void {
  const siege = battle.siege;
  if (!siege || siege.level === 0) return;
  const cfg = tx.profile.combat.siege;
  if (sideStacks(battle, 'attacker').length > 0) {
    const target = catapultTarget(battle);
    if (target) damageStructure(tx, target, cfg.catapultDamage, 'catapult', null);
  }
  const turrets = intactStructures(battle)
    .filter((s) => s.kind === 'keep' || s.kind === 'tower')
    .sort(byId);
  for (const turret of turrets) {
    const damage = turret.kind === 'keep' ? cfg.keepDamage : cfg.towerDamage;
    const best = turretTarget(tx.catalog, battle, turret, damage);
    if (!best) return;
    const killed = applyDamage(tx, battle, best, damage);
    tx.emit({ kind: 'SiegeTurretShot', structureId: turret.id, targetId: best.id, damage, killed, targetRemaining: aliveCount(tx.catalog, best) });
  }
}

/** Moat damage when a move ends in the moat and did not start there. */
export function applyMoatEntry(tx: Tx, battle: BattleState, stack: BattleStackState, before: readonly BattleCell[]): void {
  if (!battle.siege) return;
  if (!touchesMoat(battle, stackCells(tx.catalog, stack)) || touchesMoat(battle, before)) return;
  const damage = tx.profile.combat.siege.moatDamage;
  const killed = applyDamage(tx, battle, stack, damage);
  tx.emit({ kind: 'SiegeMoatDamage', stackId: stack.id, damage, killed, targetRemaining: aliveCount(tx.catalog, stack) });
}

/** Human-readable structure name for logs and the UI. */
export function structureLabel(id: string): string {
  switch (id) {
    case 'gate':
      return 'Gate';
    case 'keep':
      return 'Keep';
    case 'tower_n':
      return 'North tower';
    case 'tower_s':
      return 'South tower';
    default:
      return id.startsWith('wall_') ? `Wall section ${id.slice(5)}` : id;
  }
}

/** The siege attacker aims the Catapult (on one of its own activations; free, no action spent). */
export function commitBattleAimCatapult(tx: Tx, structureId: string): void {
  const battle = requireBattle(tx.state);
  const siege = battle.siege;
  if (!siege || siege.level === 0) reject('illegal_action', 'There are no walls to aim at');
  const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
  if (!active || active.side !== 'attacker') reject('illegal_action', 'Aim the Catapult on one of your own turns');
  requireControl(tx, battle, 'attacker');
  const target = siege.structures.find((s) => s.id === structureId);
  if (!target) reject('illegal_target', 'Unknown structure');
  if (target.hp <= 0) reject('illegal_target', `${structureLabel(structureId)} is already destroyed`);
  siege.catapultTargetId = structureId;
  tx.emit({ kind: 'SiegeCatapultAimed', structureId });
}
