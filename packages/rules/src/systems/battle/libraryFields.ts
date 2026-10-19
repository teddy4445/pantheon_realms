import { cellDistance, cellKey, cellNeighbors, cellToCube, footprintDistance, type BattleCell } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { SpellDefinition, SpellEffect } from '../../definitions/pantheons';
import type { BattleFieldState, BattleSideId, BattleStackState, BattleState } from '../../state/match';
import type { Tx } from '../../engine/tx';
import { footprintFree, isAlive, movementClassOf, occupancy, resolveStackDamage, stackCells } from './common';
import { battleCellLegal, boardZone } from './board';
import { relicSpellDamage } from './libraryRelics';

type FieldEffect = Extract<SpellEffect, { type: 'battle_field' }>;
export function fieldCells(battle: BattleState, effect: FieldEffect, chosen: readonly BattleCell[]): BattleCell[] {
  if (effect.kind !== 'eclipse' || !chosen[0]) return chosen.map((c) => ({ ...c }));
  return [chosen[0], ...cellNeighbors(chosen[0], battle.cols, battle.rows)].filter((c) => battleCellLegal(battle, c));
}
export function fieldVictims(catalog: ContentCatalog, battle: BattleState, cells: readonly BattleCell[]): BattleStackState[] {
  const keys = new Set(cells.map(cellKey));
  return Object.values(battle.stacks).filter((s) => isAlive(s) && stackCells(catalog, s).some((c) => keys.has(cellKey(c)))).sort((a, b) => a.id < b.id ? -1 : 1);
}
function connected(cells: readonly BattleCell[]): boolean {
  if (!cells.length) return false;
  const reached = new Set([cellKey(cells[0]!)]);
  for (let n = 0; n < cells.length; n++) for (const c of cells) if (cells.some((p) => reached.has(cellKey(p)) && cellDistance(p, c) <= 1)) reached.add(cellKey(c));
  return reached.size === cells.length;
}
function straight(cells: readonly BattleCell[]): boolean {
  if (cells.length < 3) return true;
  return cells.some((mid) => {
    const ends = cells.filter((c) => c !== mid);
    const a = cellToCube(ends[0]!), b = cellToCube(ends[1]!), m = cellToCube(mid);
    return cellDistance(ends[0]!, ends[1]!) === 2 && a.x + b.x === m.x * 2 && a.z + b.z === m.z * 2;
  });
}
/** Ignore mobile units for topology, but retain terrain, large footprints, fixed obstacles and walls. */
function canMeet(catalog: ContentCatalog, battle: BattleState, mover: BattleStackState, target: BattleStackState, extra: readonly BattleCell[]): boolean {
  const empty = { ...battle, stacks: {} };
  const occ = occupancy(catalog, empty, undefined, mover.side);
  for (const c of extra) occ.set(cellKey(c), 'glass');
  const targetCells = stackCells(catalog, target), frontier = [mover.anchor], seen = new Set([cellKey(mover.anchor)]);
  for (let i = 0; i < frontier.length; i++) {
    const cur = frontier[i]!;
    if (footprintDistance(stackCells(catalog, mover, cur), targetCells) <= 1) return true;
    for (const c of cellNeighbors(cur, battle.cols, battle.rows)) {
      if (seen.has(cellKey(c)) || !footprintFree(stackCells(catalog, mover, c), occ, battle, 'ground')) continue;
      seen.add(cellKey(c)); frontier.push(c);
    }
  }
  return false;
}
export function fieldSpellProblem(catalog: ContentCatalog, battle: BattleState, effect: FieldEffect, chosen: readonly BattleCell[], partial = false): string | null {
  const max = effect.kind === 'eclipse' ? 1 : effect.cells;
  if (!chosen.length || chosen.length > max || new Set(chosen.map(cellKey)).size !== chosen.length) return `Choose ${max === 1 ? 'one hex' : `up to ${max} different connected hexes`}`;
  if (!partial && (effect.kind === 'glass' || effect.kind === 'wind_line') && chosen.length !== max) return `Choose exactly ${max} hexes`;
  if (!connected(chosen)) return 'The selected hexes must connect';
  if (effect.kind === 'wind_line' && !straight(chosen)) return 'Choose three hexes in a straight line';
  for (const c of chosen) {
    if (!Number.isInteger(c.col) || !Number.isInteger(c.row) || !battleCellLegal(battle, c)) return 'Choose legal battlefield hexes';
    if ((effect.kind === 'frost' || effect.kind === 'sanctuary' || effect.kind === 'glass') && boardZone(battle, c) === 'water') return 'This spell needs land or deck hexes';
  }
  if (effect.kind !== 'glass') return null;
  const occ = occupancy(catalog, battle);
  if (chosen.some((c) => occ.has(cellKey(c)))) return 'Crystals need empty hexes';
  if (partial) return null;
  if (battle.board) {
    const fixed = new Set([...occ].filter(([, id]) => !battle.stacks[id]).map(([key]) => key));
    const blocked = new Set(chosen.map(cellKey));
    const starts: BattleCell[] = [];
    for (let row = 0; row < battle.rows; row++) for (let col = 0; col < battle.cols; col++) if (boardZone(battle, { col, row }) === 'attacker_deck') starts.push({ col, row });
    const connects = (extra: ReadonlySet<string>) => {
      const queue = starts.filter((c) => !extra.has(cellKey(c))), seen = new Set(queue.map(cellKey));
      for (let i = 0; i < queue.length; i++) {
        const c = queue[i]!;
        if (boardZone(battle, c) === 'defender_deck') return true;
        for (const n of cellNeighbors(c, battle.cols, battle.rows)) if (!seen.has(cellKey(n)) && !extra.has(cellKey(n)) && !fixed.has(cellKey(n)) && boardZone(battle, n) !== 'water') { seen.add(cellKey(n)); queue.push(n); }
      }
      return false;
    };
    if (starts.length && connects(new Set()) && !connects(blocked)) return 'Crystals cannot seal the boarding bridge';
  }
  const ground = Object.values(battle.stacks).filter((s) => isAlive(s) && movementClassOf(catalog, s.creatureId) === 'ground');
  for (const a of ground) for (const b of ground) {
    if (a.side === b.side) continue;
    if (canMeet(catalog, battle, a, b, []) && !canMeet(catalog, battle, a, b, chosen)) return 'Crystals would seal a route between opposing ground troops';
  }
  return null;
}
export function applyFieldSpell(tx: Tx, battle: BattleState, spell: SpellDefinition, effect: FieldEffect, side: BattleSideId, chosen: readonly BattleCell[], power: number): { damage: number; healed: number } {
  const cells = fieldCells(battle, effect, chosen), amount = (effect.base ?? 0) + (effect.perPower ?? 0) * power;
  if (effect.kind === 'wind_line') {
    let damage = 0;
    for (const target of fieldVictims(tx.catalog, battle, cells)) damage += resolveStackDamage(tx, battle, target, relicSpellDamage(battle, spell, side, target, amount)).damage;
    return { damage, healed: 0 };
  }
  const field: BattleFieldState = { id: `${spell.id}:${side}:${tx.state.revision}`, spellId: spell.id, side, kind: effect.kind, cells, expiresAtRound: battle.round + effect.durationRounds, damage: amount, percent: effect.percent ?? 0 };
  // Recasting relocates this side's existing field instead of multiplying copies.
  battle.spellFields = [...(battle.spellFields ?? []).filter((f) => f.side !== side || f.spellId !== spell.id), field];
  return { damage: 0, healed: 0 };
}
export function frostEntries(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, from: BattleCell, to: BattleCell): { field: BattleFieldState; cell: BattleCell }[] {
  const prior = new Set(stackCells(catalog, stack, from).map(cellKey)), next = new Set(stackCells(catalog, stack, to).map(cellKey));
  return (battle.spellFields ?? []).filter((f) => f.kind === 'frost' && f.side !== stack.side && f.expiresAtRound > battle.round).flatMap((field) => field.cells.filter((c) => next.has(cellKey(c)) && !prior.has(cellKey(c)) && !field.spent?.includes(cellKey(c))).map((cell) => ({ field, cell })));
}
export function applyFrostEntry(tx: Tx, battle: BattleState, stack: BattleStackState, from: BattleCell, to: BattleCell): void {
  for (const { field, cell } of frostEntries(tx.catalog, battle, stack, from, to)) {
    if (!isAlive(stack)) break;
    (field.spent ??= []).push(cellKey(cell));
    const spell = tx.catalog.spells[field.spellId]!;
    const damage = resolveStackDamage(tx, battle, stack, relicSpellDamage(battle, spell, field.side, stack, field.damage)).damage;
    tx.emit({ kind: 'BattleSpellCast', side: field.side, spellId: field.spellId, targetId: stack.id, damage, healed: 0 });
  }
}
export function fieldRangedModifier(battle: BattleState, side: BattleSideId, cells: readonly BattleCell[], kind: 'sanctuary' | 'eclipse'): number {
  const keys = new Set(cells.map(cellKey));
  return Math.max(0, ...(battle.spellFields ?? []).filter((f) => f.kind === kind && f.expiresAtRound > battle.round && (kind === 'eclipse' || f.side === side) && f.cells.some((c) => keys.has(cellKey(c)))).map((f) => f.percent));
}
