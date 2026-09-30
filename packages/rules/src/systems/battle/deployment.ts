/**
 * Pre-battle phases: town-defender selection (design/04 §8, BAT-14) and
 * Tactics deployment (design/04 §1, heroes/05 "Tactics").
 *
 * Default formation: each side's stacks stand on its first columns (one-hex
 * creatures on the edge column, two-hex creatures one column in). That IS the
 * two-column deployment, so without Tactics no interactive step is needed.
 * Owner decision for this build: the interactive deployment step exists only
 * for a human side whose commander has Tactics; AI and neutral sides always
 * keep the default formation. Deployment never reveals hidden enemy modifiers.
 */
import { harmonyFor, harmonyThresholds } from '../../resolvers/effects';
import type { BattleStackId } from '../../ids';
import { cellEquals, cellKey, footprintCells, type BattleCell } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { StackSpec } from '../../definitions/world';
import type { BattleSideId, BattleStackState, BattleState, DefenderSelectionState } from '../../state/match';
import { skillValue } from '../../resolvers/heroes';
import { reject, type Tx } from '../../engine/tx';
import { footprintFree, isAlive, occupancy, requireBattle, sideStacks, stackCells, statsOf } from './common';
import { beginRounds } from './flow';
import { requireControl } from './actions';

const ROWS_BY_COUNT: Record<number, number[]> = {
  1: [5],
  2: [3, 7],
  3: [2, 5, 8],
  4: [1, 4, 6, 9],
  5: [1, 3, 5, 7, 9],
  6: [0, 2, 4, 6, 8, 10],
  7: [0, 2, 4, 5, 6, 8, 10],
};

export interface DeployEntry {
  readonly spec: StackSpec;
  readonly slot: number;
  /** Persistent source: a hero (or scripted guard) army, or a town garrison. */
  readonly source: 'hero' | 'garrison';
}

/** Place a side's stacks in the default formation. IDs: a<slot> attacker, d<slot> defender hero/guard, g<slot> garrison. */
export function placeStacks(tx: Tx, battle: BattleState, side: BattleSideId, entries: readonly DeployEntry[]): void {
  const facing = side === 'attacker' ? 1 : -1;
  const present = entries.filter((e) => e.spec.count > 0);
  const rows = ROWS_BY_COUNT[present.length] ?? ROWS_BY_COUNT[7]!;
  present.forEach((e, i) => {
    const stats = statsOf(tx.catalog, e.spec.creatureId);
    const row = rows[i] ?? i;
    const col = side === 'attacker' ? (stats.footprint === 2 ? 1 : 0) : stats.footprint === 2 ? battle.cols - 2 : battle.cols - 1;
    const prefix = side === 'attacker' ? 'a' : e.source === 'garrison' ? 'g' : 'd';
    const id = `${prefix}${e.slot}` as BattleStackId;
    const stack: BattleStackState = {
      id,
      side,
      sourceSlot: e.slot,
      ...(e.source === 'garrison' ? { sourceArmy: 'garrison' as const } : {}),
      creatureId: e.spec.creatureId,
      anchor: { col, row },
      facing,
      startingCount: e.spec.count,
      totalHp: e.spec.count * stats.hp,
      shotsRemaining: stats.shots,
      retaliationsUsed: 0,
      waited: false,
      defending: false,
      moraleRolledThisRound: false,
      statuses: [],
      killedByEnemy: 0,
    };
    battle.stacks[id] = stack;
  });
}

export function tacticsColumns(catalog: ContentCatalog, battle: BattleState, side: BattleSideId): number {
  const commander = battle.sides[side].commander;
  return commander ? skillValue(catalog, commander, 'tactics') : 0;
}

export interface DeploymentZone {
  readonly minCol: number;
  readonly maxCol: number;
  readonly width: number;
}

/** First columns of the side, expanded by Tactics, within its half (and inside/outside the walls in a siege). */
export function deploymentZone(catalog: ContentCatalog, battle: BattleState, side: BattleSideId): DeploymentZone {
  const combat = catalog.rulesProfile.combat;
  let width = Math.min(Math.floor(battle.cols / 2), combat.deploymentColumns + tacticsColumns(catalog, battle, side));
  const siege = battle.siege;
  if (siege && siege.level > 0) {
    width = side === 'attacker' ? Math.min(width, siege.wallCol - 2) : Math.min(width, battle.cols - siege.wallCol - 1);
  }
  return side === 'attacker'
    ? { minCol: 0, maxCol: width - 1, width }
    : { minCol: battle.cols - width, maxCol: battle.cols - 1, width };
}

function inZone(zone: DeploymentZone, cells: readonly BattleCell[]): boolean {
  return cells.every((c) => c.col >= zone.minCol && c.col <= zone.maxCol);
}

/** Free anchors in the stack's deployment zone (read-only; used by the UI). */
export function deploymentAnchors(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): BattleCell[] {
  const zone = deploymentZone(catalog, battle, stack.side);
  const occ = occupancy(catalog, battle, stack.id, stack.side);
  const fp = statsOf(catalog, stack.creatureId).footprint;
  const out: BattleCell[] = [];
  for (let col = zone.minCol; col <= zone.maxCol; col++) {
    for (let row = 0; row < battle.rows; row++) {
      const c = { col, row };
      if (cellEquals(c, stack.anchor)) continue;
      const cells = footprintCells(c, fp, stack.facing);
      if (inZone(zone, cells) && footprintFree(cells, occ, battle)) out.push(c);
    }
  }
  return out;
}

/** Sides that still have to confirm deployment; empty when no interactive step applies. */
function sidesNeedingDeployment(catalog: ContentCatalog, battle: BattleState): BattleSideId[] {
  return (['attacker', 'defender'] as const).filter(
    (side) => battle.sides[side].controller === 'human' && tacticsColumns(catalog, battle, side) > 0 && sideStacks(battle, side).length > 0,
  );
}

/** Enter deployment when a human side has Tactics; otherwise start round 1. */
/** Freeze each side's army_harmony bonus from the distinct families actually deployed. */
function snapshotHarmony(tx: Tx, battle: BattleState): void {
  for (const sideId of ['attacker', 'defender'] as const) {
    const side = battle.sides[sideId];
    if (!side.effects) continue;
    const families = new Set(Object.values(battle.stacks).filter((s) => s.side === sideId).map((s) => tx.catalog.creatures[s.creatureId]?.familyId ?? s.creatureId));
    side.effects.harmony = harmonyFor(harmonyThresholds(tx.catalog, tx.state, side.playerId), families.size);
  }
}

export function finishSetup(tx: Tx, battle: BattleState): void {
  snapshotHarmony(tx, battle);
  const pending = sidesNeedingDeployment(tx.catalog, battle);
  if (pending.length === 0) {
    beginRounds(tx, battle);
    return;
  }
  battle.phase = 'deployment';
  battle.deployment = {
    pending,
    columns: {
      attacker: deploymentZone(tx.catalog, battle, 'attacker').width,
      defender: deploymentZone(tx.catalog, battle, 'defender').width,
    },
  };
  tx.emit({ kind: 'BattleDeploymentStarted', sides: [...pending] });
}

export function commitBattleDeploy(tx: Tx, stackId: BattleStackId, to: BattleCell): void {
  const battle = requireBattle(tx.state);
  if (battle.phase !== 'deployment' || !battle.deployment) reject('illegal_action', 'Deployment is over');
  const stack = battle.stacks[stackId];
  if (!stack || !isAlive(stack)) reject('illegal_target', 'Choose one of your stacks');
  if (!battle.deployment.pending.includes(stack.side)) reject('already_done', 'Deployment already confirmed');
  requireControl(tx, battle, stack.side);
  const zone = deploymentZone(tx.catalog, battle, stack.side);
  const fp = statsOf(tx.catalog, stack.creatureId).footprint;
  const cells = footprintCells(to, fp, stack.facing);
  if (!inZone(zone, cells)) reject('illegal_move', 'Stay inside your deployment zone');
  if (cellEquals(to, stack.anchor)) reject('illegal_move', 'Choose a different hex');
  const occ = occupancy(tx.catalog, battle, stack.id, stack.side);
  if (footprintFree(cells, occ, battle)) {
    stack.anchor = to;
    tx.emit({ kind: 'BattleStackDeployed', stackId, to });
    return;
  }
  // Swap with exactly one friendly stack when both footprints fit.
  const blockers = new Set(cells.map((c) => occ.get(cellKey(c))).filter((x): x is string => !!x));
  const otherId = blockers.size === 1 ? ([...blockers][0] as BattleStackId) : undefined;
  const other = otherId ? battle.stacks[otherId] : undefined;
  if (other && other.side === stack.side && isAlive(other)) {
    const occ2 = new Map([...occ].filter(([, v]) => v !== other.id));
    const otherCells = stackCells(tx.catalog, other, stack.anchor);
    const overlap = otherCells.some((a) => cells.some((b) => cellEquals(a, b)));
    if (!overlap && inZone(zone, otherCells) && footprintFree(cells, occ2, battle) && footprintFree(otherCells, occ2, battle)) {
      const from = stack.anchor;
      stack.anchor = to;
      other.anchor = from;
      tx.emit({ kind: 'BattleStackDeployed', stackId, to });
      tx.emit({ kind: 'BattleStackDeployed', stackId: other.id, to: from });
      return;
    }
  }
  reject('illegal_move', 'That hex is not free in your deployment zone');
}

export function commitBattleConfirmDeployment(tx: Tx): void {
  const battle = requireBattle(tx.state);
  if (battle.phase !== 'deployment' || !battle.deployment) reject('illegal_action', 'Deployment is over');
  const side = battle.deployment.pending.find((s) => battle.sides[s].playerId === tx.actorId);
  if (!side) reject('not_owner', 'You have no deployment to confirm');
  battle.deployment.pending = battle.deployment.pending.filter((s) => s !== side);
  tx.emit({ kind: 'BattleDeploymentConfirmed', side });
  if (battle.deployment.pending.length === 0) beginRounds(tx, battle);
}

// ---------------------------------------------------------------------------
// Town defender selection (at most seven of garrison + visitor)
// ---------------------------------------------------------------------------

function candidateValue(catalog: ContentCatalog, c: DefenderSelectionState['candidates'][number]): number {
  const def = catalog.creatures[c.creatureId];
  const unit = def?.cost?.gold ?? statsOf(catalog, c.creatureId).hp * 10;
  return unit * c.count;
}

/** Deterministic automatic choice (AI defenders and auto-combat): the most valuable stacks, ties by index. */
export function autoDefenderPicks(catalog: ContentCatalog, sel: DefenderSelectionState): number[] {
  return sel.candidates
    .map((c, i) => ({ i, v: candidateValue(catalog, c) }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .slice(0, sel.max)
    .map((x) => x.i)
    .sort((a, b) => a - b);
}

/** Deploy the chosen defenders and record the rest as reserves. */
export function applyDefenderSelection(tx: Tx, battle: BattleState, sel: DefenderSelectionState, picks: readonly number[]): void {
  const chosen = new Set(picks);
  const entries: DeployEntry[] = [];
  const reserves: { source: 'hero' | 'garrison'; slot: number }[] = [];
  sel.candidates.forEach((c, i) => {
    if (chosen.has(i)) entries.push({ spec: { creatureId: c.creatureId, count: c.count }, slot: c.slot, source: c.source });
    else reserves.push({ source: c.source, slot: c.slot });
  });
  placeStacks(tx, battle, 'defender', entries);
  if (battle.siege) battle.siege.reserves = reserves;
  battle.selection = null;
  const pantheons = new Set(entries.map((e) => tx.catalog.creatures[e.spec.creatureId]?.pantheonId ?? null));
  const only = pantheons.size === 1 ? [...pantheons][0] : null;
  battle.sides.defender.factionMorale = only ? tx.profile.combat.sameFactionMorale : 0;
  tx.emit({ kind: 'BattleDefendersSelected', count: entries.length, reserves: reserves.length });
}

export function commitBattleSelectDefenders(tx: Tx, picks: readonly number[]): void {
  const battle = requireBattle(tx.state);
  const sel = battle.selection;
  if (battle.phase !== 'selection' || !sel) reject('illegal_action', 'No defender selection is pending');
  requireControl(tx, battle, 'defender');
  const unique = new Set(picks);
  if (unique.size !== picks.length) reject('illegal_action', 'Each stack can be chosen once');
  if (picks.length === 0) reject('illegal_action', 'Choose at least one stack');
  if (picks.length > sel.max) reject('illegal_action', `At most ${sel.max} stacks can defend`);
  if (picks.some((p) => !Number.isInteger(p) || p < 0 || p >= sel.candidates.length)) reject('illegal_target', 'Unknown stack');
  applyDefenderSelection(tx, battle, sel, picks);
  finishSetup(tx, battle);
}
