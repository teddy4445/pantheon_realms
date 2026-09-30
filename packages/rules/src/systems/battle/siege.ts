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
 * 1 HP from the intact structure with the lowest stable ID at each round
 * start; then the keep and each tower shoot the closest attacker. A wall
 * breaker (Cyclops) may spend its activation and one shot for 1 structure HP.
 */
import type { BattleStackId, TownId } from '../../ids';
import { cellKey, footprintDistance, type BattleCell } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { BattleStackState, BattleState, SiegeState, SiegeStructureState, TownState } from '../../state/match';
import type { Tx } from '../../engine/tx';
import { townEffects } from '../../resolvers/town';
import { aliveCount, applyDamage, sideStacks, stackCells } from './common';

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

export function isMoatCell(battle: BattleState, c: BattleCell): boolean {
  return !!battle.siege?.moat.some((m) => m.col === c.col && m.row === c.row);
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

/** Round-start siege effects: Catapult shot, then keep and towers (stable ID order). */
export function siegeRoundStart(tx: Tx, battle: BattleState): void {
  const siege = battle.siege;
  if (!siege || siege.level === 0) return;
  const cfg = tx.profile.combat.siege;
  if (sideStacks(battle, 'attacker').length > 0) {
    const target = intactStructures(battle).sort(byId)[0];
    if (target) damageStructure(tx, target, cfg.catapultDamage, 'catapult', null);
  }
  const turrets = intactStructures(battle)
    .filter((s) => s.kind === 'keep' || s.kind === 'tower')
    .sort(byId);
  for (const turret of turrets) {
    const attackers = sideStacks(battle, 'attacker');
    if (attackers.length === 0) return;
    const ref = turret.kind === 'keep' ? [keepReferenceCell(battle)] : turret.cells;
    let best: BattleStackState | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const a of attackers) {
      const d = footprintDistance(ref, stackCells(tx.catalog, a));
      if (d < bestDist || (d === bestDist && best && a.id < best.id)) {
        best = a;
        bestDist = d;
      }
    }
    if (!best) return;
    const damage = turret.kind === 'keep' ? cfg.keepDamage : cfg.towerDamage;
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
