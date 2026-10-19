import { cellDistance, cellEquals, cellKey, cellNeighbors, type BattleCell } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { SpellEffect } from '../../definitions/pantheons';
import type { BattleStackState, BattleState } from '../../state/match';
import type { Tx } from '../../engine/tx';
import { isAlive, stackCells } from './common';
import { forcedMoveProblem } from './seaBoard';
import { battleCellLegal } from './board';
import { deploymentZone } from './deployment';
import { illusionDestinations } from './libraryLife';
import { requestFaithfulShadow } from './libraryShadow';
import { applyFrostEntry } from './libraryFields';
import { consumeDisplacementGuard } from './libraryRelics';

export interface SpatialSpellOption { readonly destination: BattleCell; readonly secondTargetId?: string }

/** A short magical crossing may ignore ordinary obstacles, never the board mask or standing walls.
 * Validate every cell of a large footprint along a bounded corridor, including friendly gates. */
function unsealedCrossing(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, to: BattleCell, range: number): boolean {
  const walls = new Set(battle.siege?.structures.filter((s) => s.hp > 0).flatMap((s) => s.cells.map(cellKey)) ?? []);
  const seen = new Set([cellKey(stack.anchor)]);
  let frontier = [stack.anchor];
  for (let distance = 0; distance <= range; distance++) {
    const next: BattleCell[] = [];
    for (const cur of frontier) {
      if (cellEquals(cur, to)) return true;
      for (const c of cellNeighbors(cur, battle.cols, battle.rows)) {
        if (seen.has(cellKey(c))) continue;
        if (!stackCells(catalog, stack, c).every((p) => battleCellLegal(battle, p) && !walls.has(cellKey(p)))) continue;
        seen.add(cellKey(c)); next.push(c);
      }
    }
    frontier = next;
  }
  return false;
}

/** The complete legal choices, shared by the click UI, AI, and command validator. */
export function spatialSpellOptions(catalog: ContentCatalog, battle: BattleState, target: BattleStackState, effect: SpellEffect): SpatialSpellOption[] {
  if (effect.type === 'illusion_copy') return illusionDestinations(catalog, battle, target).map((destination) => ({ destination }));
  if (effect.type !== 'spatial_move' || target.summoned || !isAlive(target) || target.statuses.some((s) => s.kind === 'rooted')) return [];
  if (effect.mode === 'push' && target.statuses.some((s) => s.kind === 'pull_immunity')) return [];
  if (effect.mode === 'swap') {
    return Object.values(battle.stacks).filter((s) => s.id !== target.id && s.side === target.side && !s.summoned && isAlive(s) && !s.statuses.some((st) => st.kind === 'rooted') && cellDistance(s.anchor, target.anchor) <= effect.range)
      .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).flatMap((s) => {
        const withoutOther = { ...battle, stacks: { ...battle.stacks } };
        delete withoutOther.stacks[s.id];
        if (forcedMoveProblem(catalog, withoutOther, target, s.anchor)) return [];
        delete withoutOther.stacks[target.id];
        if (forcedMoveProblem(catalog, withoutOther, s, target.anchor)) return [];
        const first = new Set(stackCells(catalog, target, s.anchor).map(cellKey));
        if (stackCells(catalog, s, target.anchor).some((c) => first.has(cellKey(c)))) return [];
        return [{ destination: { ...s.anchor }, secondTargetId: s.id }];
      });
  }
  const out: SpatialSpellOption[] = [];
  for (let row = 0; row < battle.rows; row++) for (let col = 0; col < battle.cols; col++) {
    const c = { col, row }, distance = cellDistance(target.anchor, c);
    if (distance < 1 || distance > effect.range || (effect.mode === 'push' && distance !== 1)) continue;
    if (forcedMoveProblem(catalog, battle, target, c)) continue;
    if (effect.mode === 'teleport' && !unsealedCrossing(catalog, battle, target, c, effect.range)) continue;
    out.push({ destination: c });
  }
  return out;
}

export function applySpatialSpell(tx: Tx, battle: BattleState, target: BattleStackState, effect: Extract<SpellEffect, { type: 'spatial_move' }>, option: SpatialSpellOption): void {
  if (effect.mode === 'push' && (consumeDisplacementGuard(battle, target) || requestFaithfulShadow(tx, battle, target))) return;
  const from = { ...target.anchor };
  target.anchor = { ...option.destination };
  tx.emit({ kind: 'BattleStackMoved', stackId: target.id, path: [from, target.anchor], flying: true });
  if (option.secondTargetId) {
    const other = battle.stacks[option.secondTargetId]!;
    const otherFrom = { ...other.anchor };
    other.anchor = from;
    tx.emit({ kind: 'BattleStackMoved', stackId: other.id, path: [otherFrom, from], flying: true });
    applyFrostEntry(tx, battle, other, otherFrom, from);
  }
  applyFrostEntry(tx, battle, target, from, target.anchor);
}

export function formationSwapOptions(catalog: ContentCatalog, battle: BattleState, target: BattleStackState): SpatialSpellOption[] {
  if (battle.round !== 1 || battle.sides[target.side].actedInBattle) return [];
  const zone = deploymentZone(catalog, battle, target.side);
  const within = (s: BattleStackState) => stackCells(catalog, s).every((c) => c.col >= zone.minCol && c.col <= zone.maxCol);
  if (!within(target)) return [];
  return spatialSpellOptions(catalog, battle, target, { type: 'spatial_move', mode: 'swap', range: battle.cols + battle.rows }).filter((o) => within(battle.stacks[o.secondTargetId!]!));
}
