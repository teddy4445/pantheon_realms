/**
 * Town sieges (design/04 §8, BAT-14), Tactics deployment (design/04 §1) and
 * Divine Sight (heroes/05). Fixtures edit a fresh skirmish state directly
 * (explored map, placed heroes, garrisons); every action then goes through
 * processCommand exactly like the game.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  axialNeighbors,
  cellKey,
  legalActions,
  previewShot,
  quoteMovement,
  reachableAnchors,
  visibleCells,
  cellIndex,
  type BattleStackId,
  type CreatureStackState,
  type HexCoord,
  townGate,
} from '../src';

const SKIRMISH = 'skirmish_twin_harbors';

type Army = [string, number][];
const slots = (army: Army): (CreatureStackState | null)[] => {
  const out: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  army.forEach(([creatureId, count], i) => (out[i] = { creatureId, count }));
  return out;
};

/** A walkable, site-free neighbor of `c` from which `heroId` can step onto `c`. */
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

interface SiegeOpts {
  level?: 0 | 1 | 2 | 3;
  garrison?: Army;
  attacker?: Army;
  visitor?: Army | null;
}

/** The human (Alexios) besieges the rival's Eastharbor. */
function besiegeEast(opts: SiegeOpts = {}): GameDriver {
  const d = GameDriver.mission(SKIRMISH);
  const s = d.state;
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  const east = s.towns['eastharbor']!;
  east.buildings['fortifications'] = opts.level ?? 1;
  east.garrison.slots = slots(opts.garrison ?? [['hoplite', 10]]);
  const rival = s.heroes['rival_odysseus']!;
  if (opts.visitor) rival.army.slots = slots(opts.visitor);
  else rival.status = 'retreated'; // no visiting hero
  const alexios = s.heroes['alexios']!;
  alexios.army.slots = slots(opts.attacker ?? [['hoplite', 20], ['peltast', 10]]);
  alexios.position = approachTile(d, east.coord, 'alexios');
  alexios.movementPoints = 2000;
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: east.coord, confirmEncounter: true });
  return d;
}

function setActive(d: GameDriver, id: string): void {
  d.state.battle!.activeStackId = id as BattleStackId;
  d.state.battle!.activeIsBonus = false;
}

describe('town sieges (design/04 §8)', () => {
  it('a garrisoned enemy town is an encounter and starts a Fort siege; the Catapult fires at round start', () => {
    const d = besiegeEast({ level: 1 });
    const b = d.state.battle!;
    expect(b.encounter.kind).toBe('town_siege');
    expect(b.encounter.label).toBe('Siege of Eastharbor');
    expect(b.obstacles).toEqual([]);
    expect(b.siege!.level).toBe(1);
    expect(b.siege!.structures.map((s) => s.id)).toEqual(['gate', 'wall_1', 'wall_2', 'wall_3', 'wall_4']);
    expect(b.siege!.moat).toEqual([]);
    // Lowest stable ID first: the gate loses 1 of its 2 HP before anyone acts.
    expect(b.siege!.structures.find((s) => s.id === 'gate')!.hp).toBe(1);
    expect(d.events.some((e) => e.kind === 'SiegeStructureDamaged' && e.source === 'catapult' && e.structureId === 'gate')).toBe(true);
    // Garrison stacks are tagged for write-back.
    expect(b.stacks['g0' as BattleStackId]!.sourceArmy).toBe('garrison');
  });

  it('intact walls block ground attackers; the gate opens only for the defender', () => {
    const d = besiegeEast({ level: 1 });
    const b = d.state.battle!;
    const a0 = b.stacks['a0' as BattleStackId]!;
    a0.anchor = { col: 8, row: 5 };
    const reach = reachableAnchors(d.catalog, b, a0);
    expect([...reach.values()].some((n) => n.cell.col >= 10)).toBe(false);
    const g0 = b.stacks['g0' as BattleStackId]!;
    g0.anchor = { col: 11, row: 5 };
    const dReach = reachableAnchors(d.catalog, b, g0);
    expect(dReach.has(cellKey({ col: 10, row: 5 }))).toBe(true); // through the gate
    expect(dReach.has(cellKey({ col: 10, row: 2 }))).toBe(false); // not through a wall
    // Breach: a destroyed section is a permanent opening for everyone.
    b.siege!.structures.find((s) => s.id === 'gate')!.hp = 0;
    expect(reachableAnchors(d.catalog, b, a0).has(cellKey({ col: 10, row: 5 }))).toBe(true);
  });

  it('Citadel: keep shoots the closest attacker; the moat stops movement, deals 10 once and forbids an attack after', () => {
    const d = besiegeEast({ level: 2 });
    const b = d.state.battle!;
    expect(b.siege!.structures.map((s) => s.id)).toContain('keep');
    expect(b.siege!.moat).toHaveLength(10);
    const shot = d.events.find((e) => e.kind === 'SiegeTurretShot');
    expect(shot).toMatchObject({ structureId: 'keep', damage: 20 });
    // Moat: from (8,2) the moat cell (9,2) is reachable but terminal.
    const a0 = b.stacks['a0' as BattleStackId]!;
    a0.anchor = { col: 8, row: 2 };
    const reach = reachableAnchors(d.catalog, b, a0);
    expect(reach.get(cellKey({ col: 9, row: 2 }))?.moat).toBe(true);
    setActive(d, 'a0');
    const hp = a0.totalHp;
    const events = d.do({ kind: 'BattleMove', stackId: a0.id, to: { col: 9, row: 2 } }, 'player');
    expect(events.find((e) => e.kind === 'SiegeMoatDamage')).toMatchObject({ stackId: 'a0', damage: 10 });
    expect(d.state.battle!.stacks[a0.id]!.totalHp).toBe(hp - 10);
  });

  it('Castle: two towers and three-point walls; keep then towers fire in stable-ID order', () => {
    const d = besiegeEast({ level: 3 });
    const st = d.state.battle!.siege!.structures;
    expect(st.map((s) => s.id)).toEqual(['gate', 'keep', 'tower_n', 'tower_s', 'wall_1', 'wall_2', 'wall_3', 'wall_4']);
    expect(st.find((s) => s.id === 'wall_1')!.maxHp).toBe(3);
    expect(st.find((s) => s.id === 'tower_n')!.maxHp).toBe(2);
    const shots = d.events.filter((e) => e.kind === 'SiegeTurretShot').map((e) => (e.kind === 'SiegeTurretShot' ? [e.structureId, e.damage] : []));
    expect(shots).toEqual([
      ['keep', 20],
      ['tower_n', 10],
      ['tower_s', 10],
    ]);
  });

  it('halves attacker shots into the town across an intact wall, and not after a breach', () => {
    const d = besiegeEast({ level: 1 });
    const b = d.state.battle!;
    const g0 = b.stacks['g0' as BattleStackId]!;
    g0.anchor = { col: 12, row: 2 };
    const a1 = b.stacks['a1' as BattleStackId]!; // peltasts
    a1.anchor = { col: 5, row: 2 };
    const before = previewShot(d.catalog, d.state, a1.id, g0.id)!;
    expect(before.notes.some((n) => n.startsWith('Behind the walls'))).toBe(true);
    b.siege!.structures.find((s) => s.id === 'wall_1')!.hp = 0;
    const after = previewShot(d.catalog, d.state, a1.id, g0.id)!;
    expect(after.notes.some((n) => n.startsWith('Behind the walls'))).toBe(false);
    expect(after.max).toBeGreaterThan(before.max);
  });

  it('a Cyclops spends its activation and one shot to remove 1 structure HP', () => {
    const d = besiegeEast({ level: 1, attacker: [['cyclops', 2], ['hoplite', 10]] });
    const b = d.state.battle!;
    setActive(d, 'a0');
    const actions = legalActions(d.catalog, d.state)!;
    expect(actions.structureTargets).toContain('wall_1');
    const shots = b.stacks['a0' as BattleStackId]!.shotsRemaining;
    const events = d.do({ kind: 'BattleAttackStructure', stackId: 'a0' as BattleStackId, structureId: 'wall_1' }, 'player');
    expect(events.find((e) => e.kind === 'SiegeStructureDamaged')).toMatchObject({ structureId: 'wall_1', source: 'creature', hp: 1, attackerId: 'a0' });
    const now = d.state.battle;
    if (now) {
      expect(now.stacks['a0' as BattleStackId]!.shotsRemaining).toBe(shots - 1);
      expect(now.activeStackId).not.toBe('a0');
    }
    // A creature without the ability cannot.
    if (now) {
      setActive(d, 'a1');
      d.reject({ kind: 'BattleAttackStructure', stackId: 'a1' as BattleStackId, structureId: 'wall_2' }, 'player');
    }
  });

  it('capturing the town transfers ownership and clears the garrison', () => {
    const d = besiegeEast({ level: 1, garrison: [['hoplite', 1]], attacker: [['cyclops', 3], ['hoplite', 30], ['peltast', 20]] });
    d.autoBattle();
    const east = d.state.towns['eastharbor']!;
    expect(d.state.lastBattleResult!.winner).toBe('attacker');
    expect(east.ownerId).toBe('player');
    expect(east.garrison.slots.every((s) => !s)).toBe(true);
    expect(d.events.some((e) => e.kind === 'TownCaptured' && e.townId === 'eastharbor')).toBe(true);
    expect(d.state.heroes['alexios']!.position).toEqual(townGate(d.catalog, d.state, east.id));
  });
});

/** The rival attacks the human's Westharbor, defended by Alexios plus the garrison. */
function rivalBesiegesWest(garrison: Army, visitor: Army, rivalArmy: Army): GameDriver {
  const d = GameDriver.mission(SKIRMISH);
  const s = d.state;
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  const west = s.towns['westharbor']!;
  west.garrison.slots = slots(garrison);
  s.heroes['alexios']!.army.slots = slots(visitor);
  const rival = s.heroes['rival_odysseus']!;
  rival.army.slots = slots(rivalArmy);
  rival.position = approachTile(d, west.coord, 'rival_odysseus');
  rival.movementPoints = 2000;
  s.activePlayerId = 'rival';
  d.do({ kind: 'MoveHero', heroId: rival.id, destination: west.coord, confirmEncounter: true }, 'rival');
  return d;
}

describe('town defender selection (BAT-14)', () => {
  const garrison: Army = [['hoplite', 5], ['hoplite', 5], ['peltast', 4], ['peltast', 4]];
  const visitor: Army = [['hoplite', 6], ['peltast', 3], ['hoplite', 2], ['peltast', 2]];

  it('asks the human defender to choose at most seven stacks; reserves survive a defensive victory', () => {
    const d = rivalBesiegesWest(garrison, visitor, [['hoplite', 1]]);
    const b = d.state.battle!;
    expect(b.phase).toBe('selection');
    expect(b.selection!.candidates).toHaveLength(8);
    expect(b.selection!.max).toBe(7);
    expect(legalActions(d.catalog, d.state)).toBeNull();
    expect(d.reject({ kind: 'BattleSelectDefenders', picks: [0, 1, 2, 3, 4, 5, 6] }, 'rival').code).toBe('not_owner');
    expect(d.reject({ kind: 'BattleSelectDefenders', picks: [0, 1, 2, 3, 4, 5, 6, 7] }, 'player').code).toBe('illegal_action');
    // Leave the last garrison stack (candidate 7) in reserve.
    const events = d.do({ kind: 'BattleSelectDefenders', picks: [0, 1, 2, 3, 4, 5, 6] }, 'player');
    expect(events.find((e) => e.kind === 'BattleDefendersSelected')).toMatchObject({ count: 7, reserves: 1 });
    expect(d.state.battle?.siege?.reserves ?? [{ source: 'garrison', slot: 3 }]).toEqual([{ source: 'garrison', slot: 3 }]);
    d.autoBattle();
    expect(d.state.lastBattleResult!.winner).toBe('defender');
    const west = d.state.towns['westharbor']!;
    expect(west.ownerId).toBe('player');
    expect(west.garrison.slots[3]).toEqual({ creatureId: 'peltast', count: 4 });
  });

  it('the town defender cannot retreat or surrender', () => {
    const d = rivalBesiegesWest([['hoplite', 5]], [['peltast', 5]], [['hoplite', 3]]);
    const b = d.state.battle!;
    expect(b.phase).not.toBe('selection'); // two stacks: no choice needed
    const defender = Object.values(b.stacks).find((s) => s.side === 'defender')!;
    setActive(d, defender.id);
    const actions = legalActions(d.catalog, d.state)!;
    expect(actions.canRetreat).toBe(false);
    expect(actions.canSurrender).toBe(false);
    expect(d.reject({ kind: 'BattleRetreat' }, 'player').message).toMatch(/cannot retreat/);
    expect(d.reject({ kind: 'BattleSurrender' }, 'player').message).toMatch(/cannot surrender/);
  });

  it('on capture the reserves are lost and the visiting hero is defeated', () => {
    const d = rivalBesiegesWest(garrison, visitor, [['stormforged_cyclops', 12], ['cyclops', 12], ['minotaur', 30], ['windcrest_griffin', 40]]);
    d.do({ kind: 'BattleSelectDefenders', picks: [0, 1, 2, 3, 4, 5, 6] }, 'player');
    d.autoBattle();
    const west = d.state.towns['westharbor']!;
    expect(d.state.lastBattleResult!.winner).toBe('attacker');
    expect(west.ownerId).toBe('rival');
    expect(west.garrison.slots.every((s) => !s)).toBe(true);
    expect(d.state.heroes['alexios']!.status).toBe('defeated');
    expect(d.state.heroes['alexios']!.army.slots.every((s) => !s)).toBe(true);
  });
});

describe('Tactics deployment (design/04 §1; interactive only with Tactics)', () => {
  function guardBattle(tacticsRank: number | null): GameDriver {
    const d = GameDriver.mission(SKIRMISH);
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    const alexios = d.state.heroes['alexios']!;
    if (tacticsRank) alexios.skills.push({ skillId: 'tactics', rank: tacticsRank });
    alexios.army.slots = slots([['hoplite', 20], ['peltast', 10]]);
    const mine = d.catalog.missions[SKIRMISH]!.sites.find((s) => s.id === 'sk_gold')!.coord;
    alexios.position = approachTile(d, mine, 'alexios');
    alexios.movementPoints = 2000;
    d.do({ kind: 'MoveHero', heroId: 'alexios', destination: mine, confirmEncounter: true });
    return d;
  }

  it('without Tactics the default two-column formation starts round 1 at once', () => {
    const d = guardBattle(null);
    expect(d.state.battle!.phase).not.toBe('deployment');
    expect(d.state.battle!.round).toBe(1);
  });

  it('with Tactics II the human deploys within four columns, may swap stacks, then confirms', () => {
    const d = guardBattle(2);
    const b = d.state.battle!;
    expect(b.phase).toBe('deployment');
    expect(b.deployment).toEqual({ pending: ['attacker'], columns: { attacker: 4, defender: 2 } });
    expect(b.round).toBe(0);
    expect(legalActions(d.catalog, d.state)).toBeNull();
    d.reject({ kind: 'BattleDeploy', stackId: 'a0' as BattleStackId, to: { col: 4, row: 5 } }, 'player');
    d.do({ kind: 'BattleDeploy', stackId: 'a0' as BattleStackId, to: { col: 3, row: 5 } }, 'player');
    expect(d.state.battle!.stacks['a0' as BattleStackId]!.anchor).toEqual({ col: 3, row: 5 });
    const a1 = d.state.battle!.stacks['a1' as BattleStackId]!.anchor;
    d.do({ kind: 'BattleDeploy', stackId: 'a0' as BattleStackId, to: a1 }, 'player');
    expect(d.state.battle!.stacks['a1' as BattleStackId]!.anchor).toEqual({ col: 3, row: 5 });
    expect(d.reject({ kind: 'BattleConfirmDeployment' }, 'rival').code).toBe('not_owner');
    const events = d.do({ kind: 'BattleConfirmDeployment' }, 'player');
    expect(events.some((e) => e.kind === 'BattleRoundStarted' && e.round === 1)).toBe(true);
    expect(d.state.battle ? d.state.battle.phase : 'normal').not.toBe('deployment');
    d.reject({ kind: 'BattleDeploy', stackId: 'a0' as BattleStackId, to: { col: 2, row: 1 } }, 'player');
  });

  it('auto-combat confirms the default formation', () => {
    const d = guardBattle(1);
    expect(d.state.battle!.phase).toBe('deployment');
    d.autoBattle();
    expect(d.state.battle).toBeNull();
    expect(d.state.lastBattleResult).not.toBeNull();
  });
});

describe('Divine Sight (adventure spell)', () => {
  it('is learned at Sanctum III with Wisdom I and reveals radius 3 around a known tile until the next dawn', () => {
    const d = GameDriver.mission(SKIRMISH);
    const s = d.state;
    const alexios = s.heroes['alexios']!;
    const west = s.towns['westharbor']!;
    west.buildings['mage_guild'] = 3;
    alexios.spellbook = true;
    if (!alexios.skills.some((k) => k.skillId === 'wisdom')) alexios.skills.push({ skillId: 'wisdom', rank: 1 });
    d.endDay(); // dawn in town with a Sanctum: learn eligible spells
    expect(d.state.heroes['alexios']!.knownSpellIds).toContain('divine_sight');

    const map = d.state.world.map;
    const fog = d.state.fog['player']!;
    const far = { q: 16, r: 3 };
    const unknown = { q: 18, r: 12 };
    fog.explored[cellIndex(map, far)] = 1;
    fog.explored[cellIndex(map, unknown)] = 0;
    expect(visibleCells(d.catalog, d.state, 'player').has(cellIndex(map, far))).toBe(false);
    expect(d.reject({ kind: 'CastAdventureSpell', heroId: 'alexios', spellId: 'divine_sight', target: unknown }).message).toMatch(/explored/);
    const mana = d.state.heroes['alexios']!.mana;
    const events = d.do({ kind: 'CastAdventureSpell', heroId: 'alexios', spellId: 'divine_sight', target: far });
    expect(events.find((e) => e.kind === 'AdventureSpellCast')).toMatchObject({ radius: 3, untilDay: d.state.day + 1 });
    expect(d.state.heroes['alexios']!.mana).toBe(mana - 10);
    const vis = visibleCells(d.catalog, d.state, 'player');
    expect(vis.has(cellIndex(map, far))).toBe(true);
    expect(vis.has(cellIndex(map, { q: 16, r: 6 }))).toBe(true);
    d.endDay();
    expect(visibleCells(d.catalog, d.state, 'player').has(cellIndex(map, far))).toBe(false);
    expect(d.state.fog['player']!.explored[cellIndex(map, { q: 16, r: 6 })]).toBe(1);
  });
});
