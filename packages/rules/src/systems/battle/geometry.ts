/**
 * Tactical geometry: reachable anchors, routes, melee landings and engagement.
 *
 * Two-hex creatures move by anchor; every occupied cell of the footprint must be
 * legal at every step (ground) or at the landing (flight). Distances use the
 * minimum distance between occupied cells.
 */
import type { BattleStackId } from '../../ids';
import { cellDistance, cellKey, cellNeighbors, footprintDistance, type BattleCell } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { BattleStackState, BattleState } from '../../state/match';
import {
  effectiveSpeed,
  footprintFree,
  hasFlight,
  isAlive,
  occupancy,
  opposing,
  sideStacks,
  stackCells,
  statsOf,
} from './common';
import { footprintCells } from '../../core/hex';
import { touchesMoat } from './siege';

export interface ReachNode {
  readonly cell: BattleCell;
  readonly dist: number;
  readonly prev: string | null;
  /** The footprint ends in the moat: movement stops and no attack may follow (design/04 §8). */
  readonly moat?: boolean;
}

/** All anchors this stack can end on this activation (excluding its current anchor). */
export function reachableAnchors(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): Map<string, ReachNode> {
  const speed = effectiveSpeed(catalog, stack, battle);
  const occ = occupancy(catalog, battle, stack.id, stack.side);
  const fp = statsOf(catalog, stack.creatureId).footprint;
  const out = new Map<string, ReachNode>();
  const startKey = cellKey(stack.anchor);
  if (hasFlight(catalog, stack.creatureId)) {
    for (let col = 0; col < battle.cols; col++) {
      for (let row = 0; row < battle.rows; row++) {
        const c = { col, row };
        const d = cellDistance(stack.anchor, c);
        if (d === 0 || d > speed) continue;
        const cells = footprintCells(c, fp, stack.facing);
        if (!footprintFree(cells, occ, battle)) continue;
        out.set(cellKey(c), { cell: c, dist: d, prev: startKey, moat: touchesMoat(battle, cells) });
      }
    }
    return out;
  }
  const visited = new Map<string, ReachNode>([[startKey, { cell: stack.anchor, dist: 0, prev: null }]]);
  let frontier: BattleCell[] = [stack.anchor];
  for (let step = 1; step <= speed && frontier.length > 0; step++) {
    const next: BattleCell[] = [];
    for (const cur of frontier) {
      for (const n of cellNeighbors(cur, battle.cols, battle.rows)) {
        const k = cellKey(n);
        if (visited.has(k)) continue;
        const cells = footprintCells(n, fp, stack.facing);
        if (!footprintFree(cells, occ, battle)) continue;
        // Entering a moat cell ends ground movement: reachable, but never expanded.
        const inMoat = touchesMoat(battle, cells);
        visited.set(k, { cell: n, dist: step, prev: cellKey(cur), moat: inMoat });
        if (!inMoat) next.push(n);
      }
    }
    frontier = next;
  }
  visited.delete(startKey);
  for (const [k, v] of visited) out.set(k, v);
  return out;
}

/** Reconstruct a ground route (or a direct flight hop) to an anchor. */
export function routeTo(stack: BattleStackState, reach: Map<string, ReachNode>, target: BattleCell): BattleCell[] {
  const path: BattleCell[] = [];
  let k: string | null = cellKey(target);
  const start = cellKey(stack.anchor);
  while (k && k !== start) {
    const node = reach.get(k);
    if (!node) break;
    path.unshift(node.cell);
    k = node.prev;
  }
  return path;
}

export function isAdjacentToEnemy(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): boolean {
  const mine = stackCells(catalog, stack);
  return sideStacks(battle, opposing(stack.side)).some((e) => footprintDistance(mine, stackCells(catalog, e)) === 1);
}

export interface MeleeOption {
  readonly from: BattleCell;
  /** Hexes traversed on the shortest legal approach (0 when striking in place). */
  readonly distance: number;
}

/** Legal landing anchors from which `stack` can strike `target` this activation. */
export function meleeOptions(
  catalog: ContentCatalog,
  battle: BattleState,
  stack: BattleStackState,
  target: BattleStackState,
  reach?: Map<string, ReachNode>,
): MeleeOption[] {
  if (!isAlive(target) || target.side === stack.side) return [];
  const targetCells = stackCells(catalog, target);
  const out: MeleeOption[] = [];
  if (footprintDistance(stackCells(catalog, stack), targetCells) === 1) out.push({ from: stack.anchor, distance: 0 });
  const r = reach ?? reachableAnchors(catalog, battle, stack);
  for (const node of r.values()) {
    if (node.moat) continue;
    if (footprintDistance(stackCells(catalog, stack, node.cell), targetCells) === 1) out.push({ from: node.cell, distance: node.dist });
  }
  return out.sort((a, b) => a.distance - b.distance || a.from.row - b.from.row || a.from.col - b.from.col);
}

export function stackById(battle: BattleState, id: BattleStackId): BattleStackState | undefined {
  return battle.stacks[id];
}

/** Minimum occupied-cell distance between two stacks. */
export function stackDistance(catalog: ContentCatalog, a: BattleStackState, b: BattleStackState): number {
  return footprintDistance(stackCells(catalog, a), stackCells(catalog, b));
}
