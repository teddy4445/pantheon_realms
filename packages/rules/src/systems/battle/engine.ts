/**
 * The siege attacker's stationary, killable catapult (scenario feature `targetableCatapultV1`,
 * expedition kit 2026-10-17, design/catapult-policy.json; values proposed, not playtested).
 *
 * Decided when the battle is created: a fortified town siege under the feature gets ONE engine
 * (`SiegeState.engine`) on the fixed upper-left footprint, reserved before any deployment. It is a
 * battle object, not a creature, army slot or town structure: it never moves, never retaliates,
 * has no morale, luck or statuses, and never counts for victory, morale, stack caps, casualties or
 * XP. Enemy creatures strike or shoot it through the normal damage pipeline against its own
 * Defense and HP (never structure HP); damaging spells hit it; area damage hits it once per event.
 *
 * Scheduling: after the normal AND waiting queues of a round, before the next round starts, the
 * attacker gets one engine phase (`BattlePhase` `engine`): Fire at an intact structure (guaranteed
 * hit for `catapultDamage` structure HP) or Skip. With no structure left the phase is skipped with
 * a log event. A destroyed engine has no phase, no occupancy and never fires again. A siege
 * without an engine (older saves, The Three Beacons) keeps the automatic round-start shot.
 */
import type { BattleStackId } from '../../ids';
import { cellDistance, footprintDistance, inBattleBounds, type BattleCell } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { RulesProfile } from '../../definitions/rulesProfile';
import type { BattleSideId, BattleStackState, BattleState, SiegeEngineState, SiegeStructureState } from '../../state/match';
import type { Tx } from '../../engine/tx';
import { findAbility, isShooter, shootingRange, sideStacks, stackCells } from './common';
import { isAdjacentToEnemy, type MeleeOption, type ReachNode } from './geometry';
import { battleCellLegal } from './board';

/** The one engine's stable ID in a siege. */
export const SIEGE_ENGINE_ID = 'catapult';

/** A new engine from the rules profile (fresh HP, nothing aimed, never fired). */
export function buildSiegeEngine(profile: RulesProfile): SiegeEngineState {
  const cfg = profile.combat.siege.engine;
  return {
    id: SIEGE_ENGINE_ID,
    kind: 'catapult',
    side: 'attacker',
    anchor: { col: cfg.anchor.col, row: cfg.anchor.row },
    cells: cfg.footprint.map((c) => ({ col: c.col, row: c.row })),
    hp: cfg.maxHp,
    maxHp: cfg.maxHp,
    defense: cfg.defense,
    aimedStructureId: null,
    firedRound: 0,
    phaseRound: 0,
  };
}

/** The siege's engine (alive or wrecked), or null in a battle without one. */
export function siegeEngine(battle: BattleState | null | undefined): SiegeEngineState | null {
  return battle?.siege?.engine ?? null;
}

/** The engine while it stands (HP above 0), else null. */
export function liveEngine(battle: BattleState | null | undefined): SiegeEngineState | null {
  const e = siegeEngine(battle);
  return e && e.hp > 0 ? e : null;
}

/** The live engine that `side` may attack (an enemy engine), else null. */
export function enemyEngine(battle: BattleState, side: BattleSideId): SiegeEngineState | null {
  const e = liveEngine(battle);
  return e && e.side !== side ? e : null;
}

/** Whether a cell is one of the standing engine's cells. */
export function isEngineCell(battle: BattleState, c: BattleCell): boolean {
  const e = liveEngine(battle);
  return !!e && e.cells.some((x) => x.col === c.col && x.row === c.row);
}

/** Picture stage of the engine (policy: intact above half HP, damaged 1..half, destroyed at 0). */
export function engineStage(hp: number, maxHp: number): 'intact' | 'damaged' | 'destroyed' {
  if (hp <= 0) return 'destroyed';
  return hp * 2 > maxHp ? 'intact' : 'damaged';
}

/**
 * Creature or spell damage to the engine (its own HP; never a structure's). Emits `EngineDamaged`
 * and, at 0 HP, `EngineDestroyed` (a pending shot is cancelled: a destroyed engine has no phase).
 */
export function previewEngineDamage(battle: BattleState, engine: SiegeEngineState, damage: number): number {
  return Math.max(0, damage - (engine.barrier && engine.barrier.expiresAtRound > battle.round ? engine.barrier.hp : 0));
}

export function damageEngine(
  tx: Tx,
  battle: BattleState,
  engine: SiegeEngineState,
  damage: number,
  cause: { attackerId: BattleStackId | null; source: 'melee' | 'shot' | 'spell'; spellId?: string; luck?: boolean },
): void {
  if (engine.hp <= 0 || damage <= 0) return;
  if (engine.barrier && engine.barrier.expiresAtRound > battle.round) {
    damage = previewEngineDamage(battle, engine, damage);
    delete engine.barrier; // Protects one hit, not a renewable pool.
  }
  engine.hp = Math.max(0, engine.hp - damage);
  tx.emit({
    kind: 'EngineDamaged',
    engineId: engine.id,
    attackerId: cause.attackerId,
    source: cause.source,
    ...(cause.spellId ? { spellId: cause.spellId } : {}),
    damage,
    hp: engine.hp,
    maxHp: engine.maxHp,
    luck: !!cause.luck,
  });
  if (engine.hp === 0) tx.emit({ kind: 'EngineDestroyed', engineId: engine.id, round: battle.round, attackerId: cause.attackerId });
}

/** Legal landing anchors from which `stack` can strike the enemy engine this activation (adjacent, or Long Reach). */
export function engineMeleeOptions(
  catalog: ContentCatalog,
  battle: BattleState,
  stack: BattleStackState,
  reach: Map<string, ReachNode>,
  reachLineTo: (anchor: BattleCell, cells: readonly BattleCell[]) => boolean,
): MeleeOption[] {
  const engine = enemyEngine(battle, stack.side);
  if (!engine) return [];
  const out: MeleeOption[] = [];
  const reaches = !!findAbility(catalog, stack.creatureId, 'long_reach');
  if (footprintDistance(stackCells(catalog, stack), engine.cells) === 1) out.push({ from: stack.anchor, distance: 0 });
  else if (reaches && reachLineTo(stack.anchor, engine.cells)) out.push({ from: stack.anchor, distance: 0, reach: true });
  for (const node of reach.values()) {
    if (node.moat) continue;
    if (footprintDistance(stackCells(catalog, stack, node.cell), engine.cells) === 1) out.push({ from: node.cell, distance: node.dist });
    else if (reaches && reachLineTo(node.cell, engine.cells)) out.push({ from: node.cell, distance: node.dist, reach: true });
  }
  return out.sort((a, b) => a.distance - b.distance || a.from.row - b.from.row || a.from.col - b.from.col);
}

/** Why `stack` cannot shoot the enemy engine now (null: it can). */
export function engineShotBlocked(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): string | null {
  const engine = enemyEngine(battle, stack.side);
  if (!engine) return 'No enemy siege engine stands';
  if (!isShooter(catalog, stack.creatureId)) return 'This creature cannot shoot';
  if (stack.statuses.some((s) => s.kind === 'ranged_lock')) return 'Ranged attacks are sealed for this activation';
  if (stack.shotsRemaining <= 0) return 'No ammunition left';
  if (isAdjacentToEnemy(catalog, battle, stack)) return 'Engaged by an adjacent enemy';
  const range = shootingRange(catalog, stack.creatureId, battle);
  if (engineDistance(catalog, stack, engine) > range) return `Out of range: this creature shoots up to ${range} hexes`;
  return null;
}

/** Minimum cell distance between a stack and the engine. */
export function engineDistance(catalog: ContentCatalog, stack: BattleStackState, engine: SiegeEngineState): number {
  let best = Number.POSITIVE_INFINITY;
  for (const a of stackCells(catalog, stack)) for (const b of engine.cells) best = Math.min(best, cellDistance(a, b));
  return best;
}

/** Stacks of `side` whose footprint touches the engine's (area damage around an engine target). */
export function stacksBesideEngine(catalog: ContentCatalog, battle: BattleState, engine: SiegeEngineState, side: BattleSideId): BattleStackState[] {
  return sideStacks(battle, side).filter((s) => footprintDistance(stackCells(catalog, s), engine.cells) === 1);
}

/** Whether the standing engine touches `stack` (area damage around a stack target reaches it once). */
export function engineBeside(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): SiegeEngineState | null {
  const e = liveEngine(battle);
  if (!e || e.side !== stack.side) return null;
  return footprintDistance(stackCells(catalog, stack), e.cells) === 1 ? e : null;
}

// ---------------------------------------------------------------------------
// The engine phase
// ---------------------------------------------------------------------------

/** Intact structures the catapult can be aimed at, in stable ID order. */
export function catapultTargets(battle: BattleState): SiegeStructureState[] {
  return (battle.siege?.structures ?? []).filter((s) => s.hp > 0).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The engine's aimed structure while it stands (no fallback: a fallen target means none). */
export function engineAim(battle: BattleState): SiegeStructureState | null {
  const e = siegeEngine(battle);
  if (!e?.aimedStructureId) return null;
  const s = battle.siege?.structures.find((x) => x.id === e.aimedStructureId);
  return s && s.hp > 0 ? s : null;
}

/** True when the round's engine phase is still owed: a standing engine, not yet resolved this round. */
export function enginePhaseDue(battle: BattleState): boolean {
  const e = liveEngine(battle);
  return !!e && e.phaseRound < battle.round && battle.round > 0;
}

/**
 * Open the engine phase (no stack active). With no intact structure left the phase is resolved at
 * once with `CatapultSkipped` (`no_targets`) and false is returned; otherwise true (await Fire/Skip).
 */
export function beginEnginePhase(tx: Tx, battle: BattleState): boolean {
  const engine = liveEngine(battle)!;
  if (catapultTargets(battle).length === 0) {
    engine.phaseRound = battle.round;
    tx.emit({ kind: 'CatapultSkipped', engineId: engine.id, round: battle.round, reason: 'no_targets' });
    return false;
  }
  battle.phase = 'engine';
  battle.activeStackId = null;
  battle.activeIsBonus = false;
  tx.emit({ kind: 'CatapultPhaseStarted', engineId: engine.id, round: battle.round, aimedStructureId: engineAim(battle)?.id ?? null });
  return true;
}

/** Read-only engine view for the interface and the AI (no hidden information: the engine stands on the board). */
export interface CatapultStatus {
  readonly engineId: string;
  readonly side: BattleSideId;
  readonly hp: number;
  readonly maxHp: number;
  readonly defense: number;
  readonly anchor: BattleCell;
  readonly cells: readonly BattleCell[];
  readonly stage: 'intact' | 'damaged' | 'destroyed';
  /** The engine phase of this round is open now (Fire / Skip). */
  readonly phaseActive: boolean;
  readonly round: number;
  /** The aimed structure while it stands; null when none was chosen or it fell. */
  readonly aimedStructureId: string | null;
  /** The aimed structure fell: a new target must be chosen (no silent fallback). */
  readonly aimLost: boolean;
  readonly firedThisRound: boolean;
  readonly targets: readonly { readonly id: string; readonly kind: SiegeStructureState['kind']; readonly hp: number; readonly maxHp: number }[];
}

export function catapultStatus(battle: BattleState | null | undefined): CatapultStatus | null {
  const e = siegeEngine(battle);
  if (!battle || !e) return null;
  const aim = engineAim(battle);
  return {
    engineId: e.id,
    side: e.side,
    hp: e.hp,
    maxHp: e.maxHp,
    defense: e.defense,
    anchor: e.anchor,
    cells: e.cells,
    stage: engineStage(e.hp, e.maxHp),
    phaseActive: battle.phase === 'engine' && e.hp > 0,
    round: battle.round,
    aimedStructureId: aim?.id ?? null,
    aimLost: !!e.aimedStructureId && !aim,
    firedThisRound: e.firedRound === battle.round && battle.round > 0,
    targets: catapultTargets(battle).map((s) => ({ id: s.id, kind: s.kind, hp: s.hp, maxHp: s.maxHp })),
  };
}

/** Preview of a catapult shot (read-only; `PreviewCatapultTarget`): legal or why not, and the structure HP after. */
export function previewCatapultTarget(catalog: ContentCatalog, battle: BattleState | null | undefined, structureId: string): { legal: boolean; reason: string | null; damage: number; hpAfter: number | null } {
  const e = siegeEngine(battle);
  const damage = catalog.rulesProfile.combat.siege.catapultDamage;
  if (!battle || !e) return { legal: false, reason: 'This siege has no targetable catapult', damage, hpAfter: null };
  if (e.hp <= 0) return { legal: false, reason: 'The catapult is destroyed', damage, hpAfter: null };
  const s = battle.siege?.structures.find((x) => x.id === structureId);
  if (!s) return { legal: false, reason: 'Unknown structure', damage, hpAfter: null };
  if (s.hp <= 0) return { legal: false, reason: 'Already destroyed', damage, hpAfter: 0 };
  return { legal: true, reason: null, damage, hpAfter: Math.max(0, s.hp - damage) };
}

/**
 * The first free anchor for a stack of `footprint` on the attacker's deployment columns near
 * `want` (stable order: distance, then row, then column) — used when the engine's reserved cells
 * take a default formation slot.
 */
export function freeDeployAnchor(
  battle: BattleState,
  want: BattleCell,
  footprintOf: (anchor: BattleCell) => BattleCell[],
  zone: { minCol: number; maxCol: number },
  taken: (c: BattleCell) => boolean,
): BattleCell | null {
  const cands: { c: BattleCell; d: number }[] = [];
  for (let col = zone.minCol; col <= zone.maxCol; col++) {
    for (let row = 0; row < battle.rows; row++) {
      const c = { col, row };
      const cells = footprintOf(c);
      if (!cells.every((x) => inBattleBounds(x, battle.cols, battle.rows) && battleCellLegal(battle, x) && x.col >= zone.minCol && x.col <= zone.maxCol && !taken(x))) continue;
      cands.push({ c, d: cellDistance(c, want) });
    }
  }
  cands.sort((a, b) => a.d - b.d || a.c.row - b.c.row || a.c.col - b.c.col);
  return cands[0]?.c ?? null;
}

