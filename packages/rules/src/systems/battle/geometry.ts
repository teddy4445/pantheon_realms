/**
 * Tactical geometry: reachable anchors, routes, melee landings and engagement.
 *
 * Two-hex creatures move by anchor; every occupied cell of the footprint must be
 * legal at every step (ground) or at the landing (flight). Distances use the
 * minimum distance between occupied cells.
 */
import { cellDistance, cellKey, cellNeighbors, footprintDistance, type BattleCell } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { BattleStackState, BattleState } from '../../state/match';
import {
  effectiveSpeed,
  findAbility,
  footprintFree,
  hasFlight,
  isAlive,
  movementClassOf,
  occupancy,
  opposing,
  sideStacks,
  stackCells,
  statsOf,
} from './common';
import { footprintCells } from '../../core/hex';
import { touchesMoat } from './siege';
import { reachLine } from './neutralAbilities';
import { frostEntries } from './libraryFields';
import { libraryEffects, originalUse } from './libraryRelics';

export interface ReachNode {
  readonly path?: readonly BattleCell[];
  readonly cell: BattleCell;
  readonly dist: number;
  readonly prev: string | null;
  /** The footprint ends in the moat: movement stops and no attack may follow (design/04 §8). */
  readonly moat?: boolean;
}

/** All anchors this stack can end on this activation (excluding its current anchor). */
export function reachableAnchors(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): Map<string, ReachNode> {
  if (stack.statuses.some((s) => s.kind === 'rooted')) return new Map();
  const flightBonus = hasFlight(catalog, stack.creatureId) && !originalUse(battle, stack, 'activationSpent') ? Math.max(0, ...libraryEffects(battle, stack.side, 'library_first_flight_move').map((e) => e.amount)) : 0;
  const speed = effectiveSpeed(catalog, stack, battle) + flightBonus;
  const occ = occupancy(catalog, battle, stack.id, stack.side);
  const fp = statsOf(catalog, stack.creatureId).footprint;
  // The board's zone policy for this mover (a sea encounter: walkers on the deck, swimmers in the water).
  const cls = movementClassOf(catalog, stack.creatureId);
  const out = new Map<string, ReachNode>();
  const startKey = cellKey(stack.anchor);
  if (hasFlight(catalog, stack.creatureId) || stack.statuses.some((s) => s.kind === 'temporary_flight')) {
    for (let col = 0; col < battle.cols; col++) {
      for (let row = 0; row < battle.rows; row++) {
        const c = { col, row };
        const d = cellDistance(stack.anchor, c) + frostEntries(catalog, battle, stack, stack.anchor, c).length;
        if (d === 0 || d > speed) continue;
        const cells = footprintCells(c, fp, stack.facing);
        if (!footprintFree(cells, occ, battle, cls)) continue;
        out.set(cellKey(c), { cell: c, dist: d, prev: startKey, moat: touchesMoat(battle, cells) });
      }
    }
    return out;
  }
  if (!(battle.spellFields ?? []).some((f) => f.kind === 'frost' && f.side !== stack.side && f.expiresAtRound > battle.round)) {
    const visited = new Map<string, ReachNode>([[startKey, { cell: stack.anchor, dist: 0, prev: null }]]);
    let frontier: BattleCell[] = [stack.anchor];
    for (let step = 1; step <= speed && frontier.length; step++) {
      const next: BattleCell[] = [];
      for (const cur of frontier) for (const n of cellNeighbors(cur, battle.cols, battle.rows)) {
        const k = cellKey(n);
        if (visited.has(k)) continue;
        const cells = footprintCells(n, fp, stack.facing);
        if (!footprintFree(cells, occ, battle, cls)) continue;
        const inMoat = touchesMoat(battle, cells);
        visited.set(k, { cell: n, dist: step, prev: cellKey(cur), moat: inMoat });
        if (!inMoat) next.push(n);
      }
      frontier = next;
    }
    visited.delete(startKey);
    return visited;
  }
  const visited = new Map<string, number>();
  const frontier: { cell: BattleCell; dist: number; path: BattleCell[]; spent: string[] }[] = [{ cell: stack.anchor, dist: 0, path: [], spent: [] }];
  while (frontier.length) {
    frontier.sort((a, b) => a.dist - b.dist || (cellKey(a.cell) < cellKey(b.cell) ? -1 : 1));
    const cur = frontier.shift()!;
    for (const n of cellNeighbors(cur.cell, battle.cols, battle.rows)) {
      const k = cellKey(n);
      if (k === startKey) continue;
      const cells = footprintCells(n, fp, stack.facing);
      if (!footprintFree(cells, occ, battle, cls)) continue;
      const newTraps = frostEntries(catalog, battle, stack, cur.cell, n).map(({ field, cell }) => `${field.id}:${cellKey(cell)}`).filter((key) => !cur.spent.includes(key));
      const dist = cur.dist + 1 + newTraps.length;
      if (dist > speed) continue;
      const spent = [...cur.spent, ...newTraps].sort(), stateKey = `${k}|${spent.join(';')}`;
      if ((visited.get(stateKey) ?? Infinity) <= dist) continue;
      visited.set(stateKey, dist);
      const path = [...cur.path, n], inMoat = touchesMoat(battle, cells);
      if (!out.has(k) || out.get(k)!.dist > dist) out.set(k, { cell: n, dist, prev: cellKey(cur.cell), path, moat: inMoat });
      if (!inMoat) frontier.push({ cell: n, dist, path, spent });
    }
  }
  return out;
}

/** Reconstruct a ground route (or a direct flight hop) to an anchor. */
export function routeTo(stack: BattleStackState, reach: Map<string, ReachNode>, target: BattleCell): BattleCell[] {
  const saved = reach.get(cellKey(target))?.path;
  if (saved) return [...saved];
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
  /** A Long Reach strike from two hexes away (handoff 2026-10-15), not an adjacent blow. */
  readonly reach?: boolean;
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
  const reaches = !!findAbility(catalog, stack.creatureId, 'long_reach');
  if (footprintDistance(stackCells(catalog, stack), targetCells) === 1) out.push({ from: stack.anchor, distance: 0 });
  else if (reaches && reachLine(catalog, battle, stack, stack.anchor, target)) out.push({ from: stack.anchor, distance: 0, reach: true });
  const r = reach ?? reachableAnchors(catalog, battle, stack);
  for (const node of r.values()) {
    if (node.moat) continue;
    if (footprintDistance(stackCells(catalog, stack, node.cell), targetCells) === 1) out.push({ from: node.cell, distance: hasFlight(catalog, stack.creatureId) || stack.statuses.some((s) => s.kind === 'temporary_flight') ? cellDistance(stack.anchor, node.cell) : routeTo(stack, r, node.cell).length });
    else if (reaches && reachLine(catalog, battle, stack, node.cell, target)) out.push({ from: node.cell, distance: hasFlight(catalog, stack.creatureId) || stack.statuses.some((s) => s.kind === 'temporary_flight') ? cellDistance(stack.anchor, node.cell) : routeTo(stack, r, node.cell).length, reach: true });
  }
  return out.sort((a, b) => a.distance - b.distance || a.from.row - b.from.row || a.from.col - b.from.col);
}

/** Minimum occupied-cell distance between two stacks. */
export function stackDistance(catalog: ContentCatalog, a: BattleStackState, b: BattleStackState): number {
  return footprintDistance(stackCells(catalog, a), stackCells(catalog, b));
}
