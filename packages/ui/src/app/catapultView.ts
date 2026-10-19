/**
 * The siege engine in the battle screen (`targetableCatapultV1`, expedition kit 2026-10-17): what the
 * board shows of it and what a click on the board means for it. Read-only helpers over the rules'
 * own views (`catapultStatus`, `legalActions().engine`, `previewEngineAttack`); every order they
 * return is an ordinary validated battle command — the canvas and the keyboard list send the same.
 */
import {
  catapultStatus,
  cellEquals,
  liveEngine,
  structureLabel,
  type BattleCell,
  type BattleLegalActions,
  type BattleState,
  type CommandPayload,
  type ContentCatalog,
  type MatchState,
  type MeleeOption,
} from '@pr/rules';
import type { SiegeEngineView } from '@pr/presentation';
import { cellPoint } from '@pr/presentation/core';

/** The engine as the board draws it (null: a battle without one). */
export function engineSiegeView(battle: BattleState): SiegeEngineView | null {
  const e = battle.siege?.engine;
  return e ? { id: e.id, side: e.side, cells: e.cells, hp: e.hp, maxHp: e.maxHp } : null;
}

/** Whether `cell` is one of the standing engine's cells. */
export function engineAt(battle: BattleState, cell: BattleCell): boolean {
  const e = liveEngine(battle);
  return !!e && e.cells.some((c) => cellEquals(c, cell));
}

/** The structure (wall, gate, tower) standing on a cell, if any (the keep has no cells). */
export function structureAt(battle: BattleState, cell: BattleCell): { id: string; hp: number } | null {
  const s = battle.siege?.structures.find((x) => x.cells.some((c) => cellEquals(c, cell)));
  return s ? { id: s.id, hp: s.hp } : null;
}

/** Whether the human side commands the engine's phase right now (Fire / Skip). */
export function engineCommandable(state: MatchState, humanTurn: boolean, busy: boolean): boolean {
  const st = catapultStatus(state.battle);
  if (!st || !st.phaseActive || !humanTurn || busy) return false;
  return state.battle!.sides[st.side].controller === 'human';
}

/** Engine cells to mark as a target for the active stack (a blow, a shot or the chosen spell can reach it). */
export function engineTargetCells(battle: BattleState, la: BattleLegalActions | null, mode: { kind: string; spellId?: string }): BattleCell[] {
  const e = liveEngine(battle);
  if (!e || !la?.engine) return [];
  if (mode.kind === 'normal') return la.engine.canShoot || la.engine.melee.length > 0 ? e.cells : [];
  if (mode.kind === 'spell') return la.spells.find((s) => s.spellId === mode.spellId)?.engineTarget ? e.cells : [];
  return [];
}

/** The melee landing nearest the pointer (the same choice the board makes for a stack), else null. */
export function engineAttackFrom(la: BattleLegalActions | null, hover: { cell: BattleCell; offset: { x: number; y: number } } | null): MeleeOption | null {
  const opts = la?.engine?.melee ?? [];
  if (!hover || opts.length === 0 || la?.engine?.canShoot) return null;
  const w = cellPoint(hover.cell, 1);
  const px = w.x + hover.offset.x;
  const py = w.y + hover.offset.y;
  let best = opts[0]!;
  let bd = Infinity;
  for (const o of opts) {
    const ow = cellPoint(o.from, 1);
    const d = (ow.x - px) ** 2 + (ow.y - py) ** 2 + o.distance * 0.001;
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

export type BoardClick = { kind: 'command'; payload: CommandPayload } | { kind: 'toast'; message: string } | { kind: 'inspect-engine' } | null;

/**
 * What a click on the board means for the catapult or the engine (null: nothing to do with them, the
 * screen's ordinary click handling goes on):
 *  - in the engine's phase, its commander clicks a wall, gate or tower to aim (the keep: `keepClick`);
 *  - on a creature turn, the engine's cells: strike or shoot it, cast the chosen damage spell at it,
 *    or a clear reason why the chosen ability, spell or miracle cannot target it.
 */
export function catapultBoardClick(
  catalog: ContentCatalog,
  state: MatchState,
  la: BattleLegalActions | null,
  mode: { kind: string; spellId?: string; abilityId?: string; interventionId?: string },
  cell: BattleCell,
  hover: { cell: BattleCell; offset: { x: number; y: number } },
  commandEngine: boolean,
): BoardClick {
  const battle = state.battle;
  if (!battle) return null;
  const status = catapultStatus(battle);
  if (!status) return null;
  if (commandEngine) {
    const st = structureAt(battle, cell);
    if (st) return st.hp > 0 ? { kind: 'command', payload: { kind: 'BattleAimCatapult', structureId: st.id } } : { kind: 'toast', message: `${structureLabel(st.id)} is already destroyed: choose another target` };
    if (engineAt(battle, cell)) return { kind: 'inspect-engine' };
    return { kind: 'toast', message: 'Catapult phase: choose a wall section, the gate, a tower or the keep' };
  }
  if (!engineAt(battle, cell) || !la) return null;
  const engine = la.engine;
  if (mode.kind === 'ability' || mode.kind === 'intervention') {
    const name = mode.kind === 'ability' ? (catalog.abilities[mode.abilityId ?? '']?.name ?? 'This ability') : 'This miracle';
    return { kind: 'toast', message: `${name} works only on creatures: the catapult is a siege engine` };
  }
  if (mode.kind === 'spell') {
    const sp = la.spells.find((s) => s.spellId === mode.spellId);
    if (!sp) return null;
    if (!sp.engineTarget || !engine) return { kind: 'toast', message: `${sp.name} cannot target the siege engine: only damage spells aimed at one enemy can` };
    return { kind: 'command', payload: { kind: 'BattleCastAtEngine', spellId: sp.spellId, engineId: engine.engineId } };
  }
  if (mode.kind !== 'normal') return null;
  if (!engine) return status.side === la.side ? { kind: 'inspect-engine' } : null;
  if (engine.canShoot) return { kind: 'command', payload: { kind: 'BattleAttackEngine', stackId: la.stackId, engineId: engine.engineId, mode: 'shot' } };
  const from = engineAttackFrom(la, hover);
  if (from) return { kind: 'command', payload: { kind: 'BattleAttackEngine', stackId: la.stackId, engineId: engine.engineId, mode: 'melee', from: from.from } };
  return { kind: 'toast', message: engine.reason ?? 'The siege engine cannot be reached this turn' };
}

/** A click on the keep's picture (no board cells): aim at it in the engine's phase. */
export function keepClick(state: MatchState, structureId: string, commandEngine: boolean): BoardClick {
  const battle = state.battle;
  if (!battle || !commandEngine) return null;
  const s = battle.siege?.structures.find((x) => x.id === structureId);
  if (!s) return null;
  return s.hp > 0 ? { kind: 'command', payload: { kind: 'BattleAimCatapult', structureId: s.id } } : { kind: 'toast', message: `${structureLabel(s.id)} is already destroyed: choose another target` };
}
