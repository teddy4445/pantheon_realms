/**
 * The tactical AI and the six neutral creatures' active abilities (campaign
 * expansion handoff, 2026-10-15): it uses one when it is legal and plainly
 * useful (simple scoring), never an illegal one, deterministically; battles
 * without neutral abilities are played exactly as before.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { NEUTRAL_PLAYER_ID, canonicalStateHash, legalActions, processCommand, type BattleSideId, type BattleStackState, type CommandPayload, type GameCommand, type GameEvent } from '@pr/rules';
import { chooseBattleAction, neutralAbilityChoices } from '../src';

const MISSION = 'skirmish_twin_harbors';

function started(): GameDriver {
  const d = GameDriver.mission(MISSION, { matchId: 'test:ai-neutral-abilities' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = d.hero();
  const mine = d.catalog.missions[MISSION]!.sites.find((x) => x.id === 'sk_gold')!.coord;
  d.marchTo({ q: mine.q - 1, r: mine.r }, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: mine, confirmEncounter: true });
  expect(d.state.battle).not.toBeNull();
  return d;
}

interface Piece {
  readonly id: string;
  readonly side: BattleSideId;
  readonly creatureId: string;
  readonly count: number;
  readonly at: readonly [number, number];
}

/** A battle with exactly these stacks, no obstacles or walls, `active` acting now (the rules tests' arena). */
function arena(pieces: readonly Piece[], active: string): GameDriver {
  const d = started();
  const b = d.state.battle!;
  const tmpl = Object.values(b.stacks)[0]!;
  b.stacks = {};
  pieces.forEach((p, i) => {
    const st = d.catalog.creatures[p.creatureId]!.stats!;
    const stack: BattleStackState = {
      ...structuredClone(tmpl),
      id: p.id,
      side: p.side,
      sourceSlot: i,
      creatureId: p.creatureId,
      anchor: { col: p.at[0], row: p.at[1] },
      facing: p.side === 'attacker' ? 1 : -1,
      startingCount: p.count,
      totalHp: st.hp * p.count,
      shotsRemaining: st.shots,
      retaliationsUsed: 0,
      waited: false,
      defending: false,
      moraleRolledThisRound: true,
      statuses: [],
      killedByEnemy: 0,
      abilityUses: {},
    };
    delete (stack as { aspect?: boolean }).aspect;
    b.stacks[p.id] = stack;
  });
  b.obstacles = [];
  b.siege = null;
  b.phase = 'normal';
  b.deployment = null;
  b.selection = null;
  b.activeStackId = active;
  b.activeIsBonus = false;
  b.normalQueue = pieces.map((p) => p.id).filter((id) => id !== active);
  b.waitQueue = [];
  for (const side of Object.values(b.sides)) {
    if (side.commander) side.commander = { ...side.commander, morale: 0, luck: 0 };
    side.factionMorale = 0;
  }
  return d;
}

const actorOf = (d: GameDriver) => {
  const b = d.state.battle!;
  const side = b.activeStackId ? b.stacks[b.activeStackId]!.side : (b.deployment?.pending[0] ?? 'attacker');
  return b.sides[side].playerId ?? NEUTRAL_PLAYER_ID;
};

/** Submit the AI's choice for the active stack; it must be accepted as chosen (no Defend fallback). */
function step(d: GameDriver, n: number): { payload: CommandPayload; events: readonly GameEvent[] } {
  const payload = chooseBattleAction(d.catalog, d.state);
  expect(payload, 'the AI always has an order').not.toBeNull();
  const cmd = { ...payload!, commandId: `ai${n}`, expectedRevision: d.state.revision, actorPlayerId: actorOf(d) } as GameCommand;
  const res = processCommand({ catalog: d.catalog }, d.state, cmd);
  if (!res.ok) throw new Error(`${payload!.kind} ${JSON.stringify(payload)} rejected: [${res.rejection.code}] ${res.rejection.message}`);
  d.state = res.state;
  d.events.push(...res.events);
  return { payload: payload!, events: res.events };
}

/** Play the whole battle with the AI on both sides; every order must be legal. */
function fight(d: GameDriver, max = 600): CommandPayload[] {
  const orders: CommandPayload[] = [];
  for (let i = 0; i < max && d.state.battle; i++) orders.push(step(d, i).payload);
  expect(d.state.battle, 'the battle ends').toBeNull();
  return orders;
}

const REGULAR: Piece[] = [
  { id: 'a_hop', side: 'attacker', creatureId: 'hoplite', count: 30, at: [2, 4] },
  { id: 'a_pel', side: 'attacker', creatureId: 'peltast', count: 20, at: [1, 6] },
  { id: 'a_gri', side: 'attacker', creatureId: 'griffin', count: 8, at: [2, 2] },
  { id: 'a_see', side: 'attacker', creatureId: 'temple_seer', count: 12, at: [0, 8] },
  { id: 'd_bri', side: 'defender', creatureId: 'brigand', count: 40, at: [12, 4] },
  { id: 'd_sli', side: 'defender', creatureId: 'hill_slinger', count: 20, at: [13, 6] },
  { id: 'd_ogr', side: 'defender', creatureId: 'ogre', count: 6, at: [12, 8] },
];

/** The six neutrals on each side, facing each other. */
const NEUTRALS: Piece[] = [
  { id: 'a_peg', side: 'attacker', creatureId: 'pegasus', count: 8, at: [2, 1] },
  { id: 'a_rr', side: 'attacker', creatureId: 'root_runner', count: 16, at: [1, 3] },
  { id: 'a_ser', side: 'attacker', creatureId: 'serpopard', count: 8, at: [2, 5] },
  { id: 'a_bk', side: 'attacker', creatureId: 'baku', count: 7, at: [2, 7] },
  { id: 'a_af', side: 'attacker', creatureId: 'afanc', count: 7, at: [2, 9] },
  { id: 'a_ahu', side: 'attacker', creatureId: 'ahuitzotl', count: 9, at: [1, 6] },
  { id: 'd_peg', side: 'defender', creatureId: 'pegasus', count: 8, at: [12, 1] },
  { id: 'd_rr', side: 'defender', creatureId: 'root_runner', count: 16, at: [13, 3] },
  { id: 'd_ser', side: 'defender', creatureId: 'serpopard', count: 8, at: [12, 5] },
  { id: 'd_bk', side: 'defender', creatureId: 'baku', count: 7, at: [12, 7] },
  { id: 'd_af', side: 'defender', creatureId: 'afanc', count: 7, at: [12, 9] },
  { id: 'd_sli', side: 'defender', creatureId: 'hill_slinger', count: 20, at: [13, 6] },
];

const choose = (d: GameDriver) => chooseBattleAction(d.catalog, d.state);
const use = (stackId: string, abilityId: string, targetId: string): CommandPayload => ({ kind: 'BattleUseAbility', stackId, abilityId, targetId });
const weakness = { sourceId: 'spell:weakness', label: 'Weakness', kind: 'attack_bonus' as const, amount: -3, numerator: 1, denominator: 1, expiresAtRound: 9, hostile: true, seq: 1 };

describe('tactical AI: neutral abilities when plainly useful', () => {
  it('Tail Snare pulls an enemy shooter in reach next to itself (it can no longer shoot)', () => {
    const d = arena(
      [
        { id: 'ahu', side: 'attacker', creatureId: 'ahuitzotl', count: 12, at: [5, 4] },
        { id: 'hop', side: 'attacker', creatureId: 'hoplite', count: 30, at: [2, 6] },
        { id: 'sli', side: 'defender', creatureId: 'hill_slinger', count: 30, at: [7, 4] },
        { id: 'bri', side: 'defender', creatureId: 'brigand', count: 20, at: [13, 8] },
      ],
      'ahu',
    );
    expect(choose(d)).toEqual(use('ahu', 'neutral_tail_snare', 'sli'));
    const { events } = step(d, 0);
    expect(events.some((e) => e.kind === 'BattleStackMoved' && e.forced === 'pull' && e.stackId === 'sli')).toBe(true);
  });

  it('…but never pulls a melee enemy it gains nothing from', () => {
    const d = arena(
      [
        { id: 'ahu', side: 'attacker', creatureId: 'ahuitzotl', count: 12, at: [5, 4] },
        { id: 'bri', side: 'defender', creatureId: 'brigand', count: 20, at: [7, 4] },
      ],
      'ahu',
    );
    expect(legalActions(d.catalog, d.state)!.abilities.find((a) => a.abilityId === 'neutral_tail_snare')!.targets).toEqual(['bri']);
    expect(choose(d)!.kind).not.toBe('BattleUseAbility');
  });

  it('Sheltering Wings covers an adjacent ally an enemy can still strike; not one no enemy can reach', () => {
    const near: Piece[] = [
      { id: 'peg', side: 'attacker', creatureId: 'pegasus', count: 6, at: [3, 4] },
      { id: 'ally', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 5] },
      { id: 'foe', side: 'defender', creatureId: 'ogre', count: 10, at: [7, 5] },
    ];
    expect(choose(arena(near, 'peg'))).toEqual(use('peg', 'neutral_sheltering_wings', 'ally'));
    // The same ally with the enemy out of its reach this round and slower than the Pegasus: no ward.
    const far = arena(near.map((p) => (p.id === 'foe' ? { ...p, at: [14, 9] as const } : p)), 'peg');
    expect(choose(far)!.kind).not.toBe('BattleUseAbility');
  });

  it('Distract targets an enemy an ally still to act this round can attack; not when no ally is left to act', () => {
    const pieces: Piece[] = [
      { id: 'rr', side: 'attacker', creatureId: 'root_runner', count: 10, at: [6, 4] },
      { id: 'ally', side: 'attacker', creatureId: 'hoplite', count: 30, at: [6, 6] },
      { id: 'foe', side: 'defender', creatureId: 'ogre', count: 12, at: [8, 4] },
    ];
    expect(choose(arena(pieces, 'rr'))).toEqual(use('rr', 'neutral_distract', 'foe'));
    const late = arena(pieces, 'rr');
    late.state.battle!.normalQueue = ['foe'];
    expect(choose(late)!.kind).not.toBe('BattleUseAbility');
  });

  it('Reed Guard guards a threatened neighbour; Devour Dread removes a real debuff and is never offered without one', () => {
    const reed = arena(
      [
        { id: 'af', side: 'attacker', creatureId: 'afanc', count: 6, at: [3, 4] },
        { id: 'ally', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 5] },
        { id: 'foe', side: 'defender', creatureId: 'ogre', count: 10, at: [8, 5] },
      ],
      'af',
    );
    expect(choose(reed)).toEqual(use('af', 'neutral_reed_guard', 'ally'));
    const pieces: Piece[] = [
      { id: 'bk', side: 'attacker', creatureId: 'baku', count: 6, at: [3, 4] },
      { id: 'ally', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 5] },
      { id: 'foe', side: 'defender', creatureId: 'ogre', count: 10, at: [12, 5] },
    ];
    const clean = arena(pieces, 'bk');
    expect(choose(clean)!.kind).not.toBe('BattleUseAbility');
    const cursed = arena(pieces, 'bk');
    cursed.state.battle!.stacks['ally']!.statuses.push({ ...weakness });
    expect(choose(cursed)).toEqual(use('bk', 'neutral_devour_dread', 'ally'));
    step(cursed, 0);
    expect(cursed.state.battle!.stacks['ally']!.statuses).toEqual([]);
  });

  it('never chooses an ability already used by that stack in this battle', () => {
    const d = arena(
      [
        { id: 'peg', side: 'attacker', creatureId: 'pegasus', count: 6, at: [3, 4] },
        { id: 'ally', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 5] },
        { id: 'foe', side: 'defender', creatureId: 'ogre', count: 10, at: [7, 5] },
      ],
      'peg',
    );
    d.state.battle!.stacks['peg']!.abilityUses = { neutral_sheltering_wings: 1 };
    expect(choose(d)!.kind).not.toBe('BattleUseAbility');
  });
});

describe('tactical AI: whole battles with the six neutrals', () => {
  it('plays every order legally, uses the abilities, and is deterministic', () => {
    const run = () => {
      const d = arena(NEUTRALS, 'a_peg');
      const orders = fight(d);
      return { d, orders };
    };
    const a = run();
    const b = run();
    expect(canonicalStateHash(a.d.state)).toBe(canonicalStateHash(b.d.state));
    expect(a.orders).toEqual(b.orders);
    const used = a.d.events.filter((e) => e.kind === 'BattleAbilityUsed') as Extract<GameEvent, { kind: 'BattleAbilityUsed' }>[];
    expect(used.length).toBeGreaterThan(0);
    // Once per battle per stack, never more.
    const per = new Map<string, number>();
    for (const u of used) per.set(`${u.stackId}:${u.abilityId}`, (per.get(`${u.stackId}:${u.abilityId}`) ?? 0) + 1);
    expect(Math.max(...per.values())).toBe(1);
  });

  it('from the defender’s first move as well (every order accepted as chosen)', () => {
    const d = arena(NEUTRALS, 'd_rr');
    fight(d);
  });
});

describe('tactical AI without neutral abilities (unchanged)', () => {
  // Measured 2026-10-15: these battles ended in exactly the same states (canonical hashes
  // 26772346cc93ab3d after 22 orders, 2cbb6f87347091c0 after 26) before and after the
  // neutral-ability scoring was added. The structural check below keeps that true: for
  // creatures without a neutral ability, the new scoring adds nothing at any decision.
  for (const first of ['a_gri', 'd_sli']) {
    it(`adds no option at any decision of a battle of regular creatures (first: ${first})`, () => {
      const d = arena(REGULAR, first);
      for (let i = 0; i < 600 && d.state.battle; i++) {
        const b = d.state.battle;
        const la = b.activeStackId ? legalActions(d.catalog, d.state) : null;
        if (la) expect(neutralAbilityChoices(d.catalog, b, b.stacks[b.activeStackId!]!, la)).toEqual([]);
        step(d, i);
      }
      expect(d.state.battle).toBeNull();
    });
  }
});
