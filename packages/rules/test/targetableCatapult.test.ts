/**
 * The stationary, killable siege catapult (scenario feature `targetableCatapultV1`, expedition kit
 * 2026-10-17, design/catapult-policy.json). Fixtures edit a fresh skirmish state (the feature is on in
 * skirmishes); every action then goes through processCommand exactly like the game.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  axialNeighbors,
  canonicalStateHash,
  catapultStatus,
  cellKey,
  legalActions,
  occupancy,
  previewEngineAttack,
  processCommand,
  previewCatapultTarget,
  quoteMovement,
  reachableAnchors,
  stackCells,
  sideStacks,
  SIEGE_ENGINE_ID,
  type BattleStackId,
  type BattleStackState,
  type CreatureStackState,
  type HexCoord,
  type MatchState,
} from '../src';

const SKIRMISH = 'skirmish_twin_harbors';
type Army = [string, number][];
const slots = (army: Army): (CreatureStackState | null)[] => {
  const out: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  army.forEach(([creatureId, count], i) => (out[i] = { creatureId, count }));
  return out;
};

function approachTile(d: GameDriver, c: HexCoord, heroId: string): HexCoord {
  const hero = d.state.heroes[heroId]!;
  const home = hero.position;
  for (const n of axialNeighbors(c)) {
    hero.position = n;
    const q = quoteMovement(d.catalog, d.state, heroId, c);
    if (q.reachable && q.path.length === 1) {
      hero.position = home;
      return n;
    }
  }
  hero.position = home;
  throw new Error('no approach tile');
}

interface Opts {
  level?: 1 | 2 | 3;
  garrison?: Army;
  attacker?: Army;
  /** Scenario feature value at battle creation (default: the skirmish's own, on). */
  feature?: boolean;
}

/** The player (Alexios) besieges the rival's Eastharbor. */
function besiege(opts: Opts = {}): GameDriver {
  const d = GameDriver.mission(SKIRMISH);
  const s = d.state;
  if (opts.feature !== undefined) s.scenario.features = { ...s.scenario.features!, targetableCatapultV1: opts.feature };
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  const east = s.towns['eastharbor']!;
  east.buildings['fortifications'] = opts.level ?? 1;
  east.garrison.slots = slots(opts.garrison ?? [['hoplite', 10]]);
  s.heroes['rival_odysseus']!.status = 'retreated';
  const alexios = s.heroes['alexios']!;
  alexios.army.slots = slots(opts.attacker ?? [['hoplite', 20], ['peltast', 10]]);
  alexios.position = approachTile(d, east.coord, 'alexios');
  alexios.movementPoints = 2000;
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: east.coord, confirmEncounter: true });
  return d;
}

const actorOf = (d: GameDriver, side: 'attacker' | 'defender') => d.state.battle!.sides[side].playerId!;

/** Every stack defends until the round's queues are done (the engine phase opens, or the round advances). */
function finishCreatureTurns(d: GameDriver): void {
  const start = d.state.battle!.round;
  for (let i = 0; i < 40; i++) {
    const b = d.state.battle;
    if (!b || b.phase === 'engine' || !b.activeStackId || b.round !== start) return;
    const st = b.stacks[b.activeStackId]!;
    d.do({ kind: 'BattleDefend', stackId: st.id }, actorOf(d, st.side));
  }
  throw new Error('round did not finish');
}

function setActive(d: GameDriver, id: string): void {
  d.state.battle!.activeStackId = id as BattleStackId;
  d.state.battle!.activeIsBonus = false;
}

function structureHp(d: GameDriver, id: string): number {
  return d.state.battle!.siege!.structures.find((s) => s.id === id)!.hp;
}

/** Put a defender stack beside the engine (east of its anchor) and make it the active stack. */
function defenderBesideEngine(d: GameDriver): BattleStackState {
  const b = d.state.battle!;
  const g = sideStacks(b, 'defender')[0]!;
  // Clear the cell east of the engine of any attacker standing there.
  for (const s of Object.values(b.stacks)) if (s.side === 'attacker' && stackCells(d.catalog, s).some((c) => c.col === 2 && c.row === 0)) s.anchor = { col: 0, row: 6 };
  g.anchor = { col: 2, row: 0 };
  g.facing = -1;
  setActive(d, g.id);
  return g;
}

describe('targetable catapult: placement and occupancy', () => {
  it('a fortified siege under the feature gets one attacker engine on the fixed upper-left footprint', () => {
    const d = besiege({ level: 1 });
    const e = d.state.battle!.siege!.engine!;
    expect(e).toMatchObject({ id: SIEGE_ENGINE_ID, kind: 'catapult', side: 'attacker', anchor: { col: 1, row: 0 }, hp: 120, maxHp: 120, defense: 6, aimedStructureId: null, firedRound: 0 });
    expect(e.cells).toEqual([{ col: 0, row: 0 }, { col: 1, row: 0 }]);
    // It is not a stack: no army slot, no turn-order entry.
    expect(Object.keys(d.state.battle!.stacks)).not.toContain(SIEGE_ENGINE_ID);
    expect(d.state.battle!.normalQueue).not.toContain(SIEGE_ENGINE_ID);
    const occ = occupancy(d.catalog, d.state.battle!);
    expect(occ.get('0:0')).toBe(`engine:${SIEGE_ENGINE_ID}`);
    expect(occ.get('1:0')).toBe(`engine:${SIEGE_ENGINE_ID}`);
  });

  it('reserves its cells before deployment: a seven-stack army whose first slot is row 0 moves aside', () => {
    const d = besiege({ level: 1, attacker: [['hoplite', 5], ['peltast', 5], ['hoplite', 5], ['peltast', 5], ['hoplite', 5], ['peltast', 5], ['cyclops', 1]] });
    const b = d.state.battle!;
    const engineCells = new Set(b.siege!.engine!.cells.map(cellKey));
    const attackers = sideStacks(b, 'attacker');
    expect(attackers).toHaveLength(7);
    const seen = new Set<string>();
    for (const s of attackers) {
      for (const c of stackCells(d.catalog, s)) {
        expect(engineCells.has(cellKey(c)), `${s.id} on an engine cell`).toBe(false);
        expect(seen.has(cellKey(c)), `${s.id} overlaps another stack`).toBe(false);
        seen.add(cellKey(c));
        expect(c.col).toBeLessThanOrEqual(1); // still in the deployment columns
      }
    }
    // The slot that wanted row 0 stands in row 1 next to the engine.
    expect(b.stacks['a0' as BattleStackId]!.anchor).toEqual({ col: 0, row: 1 });
    // The engine's open approach (east of it) stays reachable for a defender in the field.
    const g = sideStacks(b, 'defender')[0]!;
    g.anchor = { col: 5, row: 0 };
    expect(reachableAnchors(d.catalog, b, g).has('2:0')).toBe(true);
  });

  it('nothing moves onto it: ground and flying stacks never end on its cells, and it has no orders of its own', () => {
    const d = besiege({ level: 1, attacker: [['windcrest_griffin', 5], ['hoplite', 10]] });
    const b = d.state.battle!;
    for (const s of Object.values(b.stacks)) {
      const reach = reachableAnchors(d.catalog, b, s);
      for (const node of reach.values()) for (const c of stackCells(d.catalog, s, node.cell)) expect(c.row === 0 && c.col <= 1).toBe(false);
    }
    // No stack ID, no activation: a move or wait for it is refused, and the engine never changes place.
    expect(d.reject({ kind: 'BattleMove', stackId: SIEGE_ENGINE_ID as BattleStackId, to: { col: 3, row: 3 } }, 'player').code).toBe('not_active_stack');
    expect(d.reject({ kind: 'BattleWait', stackId: SIEGE_ENGINE_ID as BattleStackId }, 'player').code).toBe('not_active_stack');
    expect(d.state.battle!.siege!.engine!.anchor).toEqual({ col: 1, row: 0 });
  });

  it('creature-only orders that name it are refused with a clear reason (abilities, stack spells, stack attacks)', () => {
    const d = besiege({ level: 1 });
    const g = defenderBesideEngine(d);
    const rival = actorOf(d, 'defender');
    const msg = d.reject({ kind: 'BattleMelee', stackId: g.id, targetId: SIEGE_ENGINE_ID as BattleStackId, from: g.anchor }, rival).message;
    expect(msg).toMatch(/siege engine, not a creature/);
    expect(d.reject({ kind: 'BattleUseAbility', stackId: g.id, abilityId: 'family_ward', targetId: SIEGE_ENGINE_ID as BattleStackId }, rival).message).toMatch(/siege engine, not a creature/);
  });

  it('a siege without the feature, or an open-field town defense, has no engine', () => {
    expect(besiege({ level: 1, feature: false }).state.battle!.siege!.engine ?? null).toBeNull();
  });
});

describe('targetable catapult: taking damage', () => {
  it('enemies strike it with the normal damage pipeline against Defense 6 and its HP; no retaliation; structures untouched', () => {
    const d = besiege({ level: 1 });
    const g = defenderBesideEngine(d);
    const la = legalActions(d.catalog, d.state)!;
    expect(la.engine?.engineId).toBe(SIEGE_ENGINE_ID);
    expect(la.engine!.melee.some((o) => o.from.col === 2 && o.from.row === 0 && o.distance === 0)).toBe(true);
    const preview = previewEngineAttack(d.catalog, d.state, g.id, 'melee', g.anchor)!;
    expect(preview.notes.join(' ')).toMatch(/Defense 6/);
    const walls = d.state.battle!.siege!.structures.map((s) => s.hp);
    const events = d.do({ kind: 'BattleAttackEngine', stackId: g.id, engineId: SIEGE_ENGINE_ID, mode: 'melee', from: g.anchor }, actorOf(d, 'defender'));
    const hit = events.find((e) => e.kind === 'EngineDamaged');
    expect(hit).toBeTruthy();
    if (hit?.kind !== 'EngineDamaged') throw new Error('no hit');
    expect(hit.damage).toBeGreaterThanOrEqual(preview.min);
    expect(hit.damage).toBeLessThanOrEqual(hit.luck ? preview.luckMax ?? preview.max : preview.max);
    expect(d.state.battle!.siege!.engine!.hp).toBe(120 - hit.damage);
    expect(hit.hp).toBe(120 - hit.damage);
    // Ordinary creature damage, never structure damage; no retaliation from a machine.
    expect(events.some((e) => e.kind === 'SiegeStructureDamaged')).toBe(false);
    expect(events.some((e) => e.kind === 'BattleAttack')).toBe(false);
    expect(d.state.battle!.siege!.structures.map((s) => s.hp)).toEqual(walls);
    // No casualty credit: the striker killed no creatures.
    expect(Object.values(d.state.battle!.stacks).reduce((n, s) => n + s.killedByEnemy, 0)).toBe(0);
  });

  it('shooters shoot it in range (one shot spent); a wrecked engine stops blocking and can no longer be targeted', () => {
    const d = besiege({ level: 1, garrison: [['peltast', 20]] });
    const b = d.state.battle!;
    const shooter = sideStacks(b, 'defender')[0]!;
    shooter.anchor = { col: 6, row: 2 };
    for (const s of sideStacks(b, 'attacker')) s.anchor = { col: s.anchor.col, row: Math.max(4, s.anchor.row) };
    setActive(d, shooter.id);
    expect(legalActions(d.catalog, d.state)!.engine?.canShoot).toBe(true);
    const shots = shooter.shotsRemaining;
    b.siege!.engine!.hp = 3;
    const events = d.do({ kind: 'BattleAttackEngine', stackId: shooter.id, engineId: SIEGE_ENGINE_ID, mode: 'shot' }, actorOf(d, 'defender'));
    expect(d.state.battle!.stacks[shooter.id]!.shotsRemaining).toBe(shots - 1);
    expect(events.find((e) => e.kind === 'EngineDestroyed')).toMatchObject({ engineId: SIEGE_ENGINE_ID });
    expect(d.state.battle!.siege!.engine!.hp).toBe(0);
    const occ = occupancy(d.catalog, d.state.battle!);
    expect(occ.has('0:0') || occ.has('1:0')).toBe(false);
    expect(catapultStatus(d.state.battle!)!.stage).toBe('destroyed');
  });

  it('area damage hits its footprint once per event; direct damage spells can target it', () => {
    const d = besiege({ level: 1, garrison: [['hoplite', 10]] });
    const b = d.state.battle!;
    // A defender commander with Thunderclap (area) and the attacker stack beside the engine as the target.
    const side = b.sides.defender;
    side.commander = { heroId: null, name: 'Test', portraitAssetId: 'x', attack: 0, defense: 0, power: 2, knowledge: 2, skills: [], spellbook: true, knownSpellIds: ['thunderclap'], morale: 0, luck: 0 };
    side.scriptedMana = 100;
    const target = sideStacks(b, 'attacker')[0]!;
    target.anchor = { col: 2, row: 0 };
    target.facing = 1;
    if (d.catalog.creatures[target.creatureId]!.stats!.footprint === 2) target.anchor = { col: 3, row: 0 };
    setActive(d, sideStacks(b, 'defender')[0]!.id);
    const events = d.do({ kind: 'BattleCastSpell', spellId: 'thunderclap', targetId: target.id }, actorOf(d, 'defender'));
    expect(events.filter((e) => e.kind === 'EngineDamaged')).toHaveLength(1);
    const hpAfterArea = d.state.battle!.siege!.engine!.hp;
    expect(hpAfterArea).toBeLessThan(120);
    // Next round, the same spell aimed at the engine itself: the engine once, the stack beside it once.
    d.state.battle!.sides.defender.castThisRound = false;
    const la = legalActions(d.catalog, d.state)!;
    expect(la.spells.find((s) => s.spellId === 'thunderclap')?.engineTarget).toBe(true);
    const events2 = d.do({ kind: 'BattleCastAtEngine', spellId: 'thunderclap', engineId: SIEGE_ENGINE_ID }, actorOf(d, 'defender'));
    expect(events2.filter((e) => e.kind === 'EngineDamaged')).toHaveLength(1);
    expect(events2.find((e) => e.kind === 'BattleSpellCast')).toMatchObject({ targetEngineId: SIEGE_ENGINE_ID });
    expect(d.state.battle!.siege!.engine!.hp).toBeLessThan(hpAfterArea);
  });

  it('never counts for victory, XP or living counts: the defenders win when every attacker stack falls, the engine standing', () => {
    const d = besiege({ level: 1, attacker: [['hoplite', 1]], garrison: [['hoplite', 30]] });
    const b = d.state.battle!;
    const a = sideStacks(b, 'attacker')[0]!;
    const g = sideStacks(b, 'defender')[0]!;
    a.anchor = { col: 8, row: 5 };
    g.anchor = { col: 9, row: 4 };
    g.facing = -1;
    setActive(d, g.id);
    expect(b.siege!.engine!.hp).toBe(120);
    d.do({ kind: 'BattleMelee', stackId: g.id, targetId: a.id, from: g.anchor }, actorOf(d, 'defender'));
    expect(d.state.battle).toBeNull();
    const r = d.state.lastBattleResult!;
    expect(r.winner).toBe('defender');
    expect(r.attacker.lines.map((l) => l.creatureId)).toEqual(['hoplite']);
    // XP would be the base HP of the one hoplite (towns have no hero to receive it here).
    expect(r.xpAwarded.every((x) => x.amount <= d.catalog.creatures['hoplite']!.stats!.hp)).toBe(true);
  });
});

describe('targetable catapult: the engine phase', () => {
  it('no automatic shot: structures stand at full HP through round 1; the phase opens after both queues', () => {
    const d = besiege({ level: 1 });
    expect(structureHp(d, 'gate')).toBe(2);
    expect(d.events.some((e) => e.kind === 'SiegeStructureDamaged')).toBe(false);
    finishCreatureTurns(d);
    const b = d.state.battle!;
    expect(b.phase).toBe('engine');
    expect(b.activeStackId).toBeNull();
    expect(b.round).toBe(1);
    expect(d.events.some((e) => e.kind === 'CatapultPhaseStarted' && e.round === 1)).toBe(true);
    expect(catapultStatus(b)).toMatchObject({ phaseActive: true, aimedStructureId: null, aimLost: false, firedThisRound: false });
    // Nothing else can act now: no stack order, no spell, no retreat.
    expect(legalActions(d.catalog, d.state)).toBeNull();
    expect(d.reject({ kind: 'BattleRetreat' }, 'player').code).toBe('illegal_action');
    // The defender cannot fire the attacker's engine.
    expect(d.reject({ kind: 'BattleFireCatapult', structureId: 'gate', expectedRound: 1 }, actorOf(d, 'defender')).code).toBe('not_owner');
  });

  it('fires once at each target kind (wall, gate, tower, keep): a guaranteed 1 structure HP, never creature damage', () => {
    const d = besiege({ level: 3, attacker: [['hoplite', 60], ['peltast', 40]], garrison: [['hoplite', 2]] });
    const cfg = d.catalog.rulesProfile.combat.siege;
    for (const id of ['wall_2', 'gate', 'tower_n', 'keep']) {
      finishCreatureTurns(d);
      const b = d.state.battle!;
      expect(b.phase).toBe('engine');
      const round = b.round;
      const before = structureHp(d, id);
      expect(previewCatapultTarget(d.catalog, b, id)).toEqual({ legal: true, reason: null, damage: cfg.catapultDamage, hpAfter: before - cfg.catapultDamage });
      const events = d.do({ kind: 'BattleFireCatapult', structureId: id, expectedRound: round }, 'player');
      expect(events.findIndex((e) => e.kind === 'CatapultFired')).toBeLessThan(events.findIndex((e) => e.kind === 'SiegeStructureDamaged'));
      expect(events.find((e) => e.kind === 'SiegeStructureDamaged')).toMatchObject({ structureId: id, source: 'catapult' });
      expect(structureHp(d, id)).toBe(before - cfg.catapultDamage);
      expect(d.state.battle!.siege!.engine).toMatchObject({ firedRound: round, aimedStructureId: id, phaseRound: round });
      // The catapult hurt no creature (turrets of the next round start may, so compare before them).
      const fired = events.findIndex((e) => e.kind === 'BattleRoundStarted');
      expect(events.slice(0, fired).some((e) => e.kind === 'BattleAttack' || e.kind === 'SiegeTurretShot')).toBe(false);
      expect(d.state.battle!.round).toBe(round + 1);
    }
  });

  it('one shot per round: a second Fire (double click, retry with a new ID) or a stale round is refused; the same command ID is a duplicate', () => {
    const d = besiege({ level: 1 });
    finishCreatureTurns(d);
    d.do({ kind: 'BattleFireCatapult', structureId: 'gate', expectedRound: 1 }, 'player');
    expect(structureHp(d, 'gate')).toBe(1);
    // A second click for the same round (a new command ID, the current revision).
    expect(d.reject({ kind: 'BattleFireCatapult', structureId: 'gate', expectedRound: 1 }, 'player').code).toBe('already_done');
    expect(d.reject({ kind: 'BattleSkipCatapult', expectedRound: 1 }, 'player').code).toBe('already_done');
    expect(structureHp(d, 'gate')).toBe(1);
    // Round 2's phase is not open yet (creatures act first): firing early is refused.
    expect(d.reject({ kind: 'BattleFireCatapult', structureId: 'gate', expectedRound: 2 }, 'player').code).toBe('illegal_action');
  });

  it('a repeated command ID never fires twice', () => {
    const d = besiege({ level: 1 });
    finishCreatureTurns(d);
    const cmd = { kind: 'BattleFireCatapult' as const, structureId: 'gate', expectedRound: 1, commandId: 'fire-once', expectedRevision: d.state.revision, actorPlayerId: 'player' };
    const first = processCommand({ catalog: d.catalog }, d.state, cmd);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = processCommand({ catalog: d.catalog }, first.state, { ...cmd, expectedRevision: first.state.revision });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.rejection.code).toBe('duplicate_command');
    expect(first.state.battle!.siege!.structures.find((s) => s.id === 'gate')!.hp).toBe(1);
  });

  it('campaign battles stay manual: automation may not fire or skip for a human side; the player may', () => {
    const d = besiege({ level: 1 });
    finishCreatureTurns(d);
    d.state.scenario = { ...d.state.scenario, campaignId: 'test_campaign' };
    const base = { commandId: 'auto-fire', expectedRevision: d.state.revision, actorPlayerId: 'player', automated: true } as const;
    const fire = processCommand({ catalog: d.catalog }, d.state, { ...base, kind: 'BattleFireCatapult', structureId: 'gate', expectedRound: 1 });
    expect(fire.ok).toBe(false);
    if (!fire.ok) expect(fire.rejection.code).toBe('manual_battle_required');
    const skip = processCommand({ catalog: d.catalog }, d.state, { ...base, commandId: 'auto-skip', kind: 'BattleSkipCatapult', expectedRound: 1 });
    expect(skip.ok).toBe(false);
    d.do({ kind: 'BattleFireCatapult', structureId: 'gate', expectedRound: 1 }, 'player');
    expect(structureHp(d, 'gate')).toBe(1);
  });

  it('skip ends the phase without a shot', () => {
    const d = besiege({ level: 1 });
    finishCreatureTurns(d);
    const events = d.do({ kind: 'BattleSkipCatapult', expectedRound: 1 }, 'player');
    expect(events.find((e) => e.kind === 'CatapultSkipped')).toMatchObject({ round: 1, reason: 'skipped' });
    expect(events.some((e) => e.kind === 'SiegeStructureDamaged' || e.kind === 'CatapultFired')).toBe(false);
    expect(d.state.battle!.round).toBe(2);
    expect(d.state.battle!.siege!.engine).toMatchObject({ firedRound: 0, phaseRound: 1 });
  });

  it('a destroyed target is never silently replaced: the player must choose again', () => {
    const d = besiege({ level: 1 });
    finishCreatureTurns(d);
    d.do({ kind: 'BattleAimCatapult', structureId: 'wall_1' }, 'player');
    expect(catapultStatus(d.state.battle!)!.aimedStructureId).toBe('wall_1');
    d.state.battle!.siege!.structures.find((s) => s.id === 'wall_1')!.hp = 0;
    const st = catapultStatus(d.state.battle!)!;
    expect(st.aimedStructureId).toBeNull();
    expect(st.aimLost).toBe(true);
    const before = d.state.battle!.siege!.structures.map((s) => s.hp);
    expect(d.reject({ kind: 'BattleFireCatapult', structureId: 'wall_1', expectedRound: 1 }, 'player').message).toMatch(/already destroyed: choose another target/);
    expect(d.state.battle!.siege!.structures.map((s) => s.hp)).toEqual(before);
    expect(d.state.battle!.phase).toBe('engine');
    d.do({ kind: 'BattleFireCatapult', structureId: 'wall_2', expectedRound: 1 }, 'player');
    expect(structureHp(d, 'wall_2')).toBe(1);
  });

  it('with no structure left the phase is skipped with a log event, never a fake shot', () => {
    const d = besiege({ level: 1 });
    for (const s of d.state.battle!.siege!.structures) s.hp = 0;
    finishCreatureTurns(d);
    expect(d.state.battle!.round).toBe(2);
    expect(d.events.find((e) => e.kind === 'CatapultSkipped')).toMatchObject({ round: 1, reason: 'no_targets' });
    expect(d.events.some((e) => e.kind === 'CatapultFired' || e.kind === 'CatapultPhaseStarted')).toBe(false);
  });

  it('death before firing: enemies kill it during the round; it gets no phase and never shoots again', () => {
    const d = besiege({ level: 1 });
    const g = defenderBesideEngine(d);
    d.state.battle!.siege!.engine!.hp = 1;
    d.do({ kind: 'BattleAttackEngine', stackId: g.id, engineId: SIEGE_ENGINE_ID, mode: 'melee', from: g.anchor }, actorOf(d, 'defender'));
    expect(d.state.battle!.siege!.engine!.hp).toBe(0);
    for (let round = 1; round <= 2; round++) {
      finishCreatureTurns(d);
      expect(d.state.battle!.phase).not.toBe('engine');
    }
    expect(d.events.some((e) => e.kind === 'CatapultPhaseStarted' || e.kind === 'CatapultFired')).toBe(false);
    expect(d.reject({ kind: 'BattleFireCatapult', structureId: 'gate', expectedRound: d.state.battle!.round }, 'player').message).toMatch(/destroyed/);
    expect(d.reject({ kind: 'BattleAimCatapult', structureId: 'gate' }, 'player').message).toMatch(/destroyed/);
    expect(structureHp(d, 'gate')).toBe(2);
  });

  it('save and load in the middle of the phase: the same shot, the same result', () => {
    const d = besiege({ level: 2 });
    finishCreatureTurns(d);
    const saved = JSON.parse(JSON.stringify(d.state)) as MatchState;
    const fire = { kind: 'BattleFireCatapult' as const, structureId: 'keep', expectedRound: 1, commandId: 'fire-r1', expectedRevision: d.state.revision, actorPlayerId: 'player' };
    const live = processCommand({ catalog: d.catalog }, d.state, fire);
    const loaded = processCommand({ catalog: d.catalog }, saved, fire);
    expect(saved.battle!.phase).toBe('engine');
    expect(live.ok && loaded.ok).toBe(true);
    if (!live.ok || !loaded.ok) return;
    expect(canonicalStateHash(loaded.state)).toBe(canonicalStateHash(live.state));
    expect(loaded.state.battle!.siege!.structures.find((s) => s.id === 'keep')!.hp).toBe(1);
    // And the reloaded result never offers a second shot for that round.
    const again = processCommand({ catalog: d.catalog }, loaded.state, { ...fire, commandId: 'fire-r1-again', expectedRevision: loaded.state.revision });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.rejection.code).toBe('already_done');
  });

  it('an already-active siege saved without an engine keeps the automatic round-start shot (no engine is ever spawned into it)', () => {
    const d = besiege({ level: 1, feature: false });
    expect(structureHp(d, 'gate')).toBe(1); // round 1's automatic shot
    // The scenario gains the feature mid-battle (e.g. an upgraded build): this battle stays legacy.
    d.state.scenario.features = { ...d.state.scenario.features!, targetableCatapultV1: true };
    finishCreatureTurns(d);
    const b = d.state.battle!;
    expect(b.siege!.engine ?? null).toBeNull();
    expect(b.phase).not.toBe('engine');
    expect(b.round).toBe(2);
    expect(structureHp(d, 'gate')).toBe(0); // round 2's automatic shot
    expect(d.events.some((e) => e.kind === 'CatapultPhaseStarted' || e.kind === 'CatapultFired')).toBe(false);
  });

  it('no phantom legacy shot in a new siege, also over several rounds of the tactical AI', () => {
    const d = besiege({ level: 2, attacker: [['hoplite', 40], ['peltast', 25]], garrison: [['hoplite', 8]] });
    d.autoBattle();
    const catapultHits = d.events.filter((e) => e.kind === 'SiegeStructureDamaged' && e.source === 'catapult').length;
    const fired = d.events.filter((e) => e.kind === 'CatapultFired').length;
    expect(fired).toBeGreaterThan(0);
    expect(catapultHits).toBe(fired);
    // Every shot came from its own engine phase, at most one per round.
    const rounds = d.events.filter((e) => e.kind === 'CatapultFired').map((e) => (e.kind === 'CatapultFired' ? e.round : 0));
    expect(new Set(rounds).size).toBe(rounds.length);
  });
});
