/**
 * The six neutral creatures' battle abilities (campaign expansion handoff,
 * 2026-10-15): Sheltering Wings, Distract, Long Reach, Devour Dread, Reed Guard
 * and Tail Snare. Each is checked on a hand-built board — legal and illegal
 * targets, the board's edges, once-per-battle-per-stack (never multiplied by the
 * creatures in the stack), expiry at the user's next activation, and that no
 * gameplay RNG is drawn by an ability.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  NEUTRAL_PLAYER_ID,
  canonicalStateHash,
  legalActions,
  meleeOptions,
  previewStrike,
  type BattleCell,
  type BattleSideId,
  type BattleStackState,
  type CommandPayload,
} from '../src';

const MISSION = 'skirmish_twin_harbors';

function started(): GameDriver {
  const d = GameDriver.mission(MISSION, { matchId: 'test:neutral-abilities' });
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

/** A battle with exactly these stacks, no obstacles or walls, `active` acting now. */
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
  // Neither side's morale or luck interferes with these checks.
  for (const side of Object.values(b.sides)) {
    if (side.commander) side.commander = { ...side.commander, morale: 0, luck: 0 };
    side.factionMorale = 0;
  }
  return d;
}

const actorOf = (d: GameDriver, id: string) => {
  const side = d.state.battle!.stacks[id]!.side;
  return d.state.battle!.sides[side].playerId ?? NEUTRAL_PLAYER_ID;
};
const act = (d: GameDriver, payload: CommandPayload & { stackId: string }) => d.do(payload, actorOf(d, payload.stackId));
const refuse = (d: GameDriver, payload: CommandPayload & { stackId: string }) => d.reject(payload, actorOf(d, payload.stackId));
const ability = (d: GameDriver, stackId: string, abilityId: string, targetId: string) => ({ kind: 'BattleUseAbility' as const, stackId, abilityId, targetId });
const stack = (d: GameDriver, id: string) => d.state.battle!.stacks[id]!;
const setActive = (d: GameDriver, id: string) => {
  const b = d.state.battle!;
  b.activeStackId = id;
  b.normalQueue = b.normalQueue.filter((x) => x !== id);
};

describe('Sheltering Wings (Pegasus)', () => {
  const pieces: Piece[] = [
    // Odd-r board: the Pegasus holds (3,4)+(2,4); (3,5) touches (3,4); (4,5) touches (3,5) only.
    { id: 'peg', side: 'attacker', creatureId: 'pegasus', count: 40, at: [3, 4] },
    { id: 'ally', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 5] },
    { id: 'foe', side: 'defender', creatureId: 'brigand', count: 30, at: [4, 5] },
  ];

  it('wards an adjacent ally against exactly one direct blow, reduced by 25% rounded down', () => {
    const d = arena(pieces, 'peg');
    const la = legalActions(d.catalog, d.state)!;
    const opt = la.abilities.find((a) => a.abilityId === 'neutral_sheltering_wings')!;
    expect(opt.targets).toEqual(['ally']);
    expect(refuse(d, ability(d, 'peg', 'neutral_sheltering_wings', 'peg')).code).toBe('illegal_target');
    expect(refuse(d, ability(d, 'peg', 'neutral_sheltering_wings', 'foe')).code).toBe('illegal_target');
    const rng = { ...d.state.rng };
    act(d, ability(d, 'peg', 'neutral_sheltering_wings', 'ally'));
    expect(d.state.rng).toEqual(rng);
    expect(stack(d, 'ally').statuses.some((s) => s.kind === 'damage_ward' && s.amount === 25)).toBe(true);
    // The foe strikes the warded ally: the event names the reduction.
    setActive(d, 'foe');
    const unwarded = previewStrike(d.catalog, { ...d.state.battle!, stacks: { ...d.state.battle!.stacks, ally: { ...stack(d, 'ally'), statuses: [] } } }, stack(d, 'foe'), { ...stack(d, 'ally'), statuses: [] }, { mode: 'melee', chargeHexes: 0 });
    const warded = previewStrike(d.catalog, d.state.battle!, stack(d, 'foe'), stack(d, 'ally'), { mode: 'melee', chargeHexes: 0 });
    expect(warded.max).toBe(unwarded.max - Math.floor((unwarded.max * 25) / 100));
    const ev = act(d, { kind: 'BattleMelee', stackId: 'foe', targetId: 'ally', from: stack(d, 'foe').anchor });
    const hit = ev.find((e) => e.kind === 'BattleAttack' && e.targetId === 'ally' && e.mode === 'melee') as { damage: number } | undefined;
    const consumed = ev.find((e) => e.kind === 'BattleStatusConsumed' && e.status === 'damage_ward') as { amount: number } | undefined;
    expect(hit).toBeDefined();
    expect(consumed).toBeDefined();
    // The rolled blow was hit + reduction, and the reduction is a quarter of it, rounded down.
    expect(consumed!.amount).toBe(Math.floor(((hit!.damage + consumed!.amount) * 25) / 100));
    expect(consumed!.amount).toBeGreaterThan(0);
    expect(stack(d, 'ally').statuses.some((s) => s.kind === 'damage_ward')).toBe(false);
  });

  it('is once per battle per stack, whatever its size, and ends at the Pegasus’s next activation', () => {
    const d = arena(pieces, 'peg');
    act(d, ability(d, 'peg', 'neutral_sheltering_wings', 'ally'));
    setActive(d, 'peg');
    expect(stack(d, 'ally').statuses.some((s) => s.kind === 'damage_ward')).toBe(true); // set by hand: the expiry runs on a scheduled activation
    expect(refuse(d, ability(d, 'peg', 'neutral_sheltering_wings', 'ally')).message).toMatch(/already used/);
    // Let the round run: when the Pegasus is activated again, the unused ward ends.
    const d2 = arena(pieces, 'peg');
    act(d2, ability(d2, 'peg', 'neutral_sheltering_wings', 'ally'));
    for (let i = 0; i < 8 && d2.state.battle!.activeStackId !== 'peg'; i++) {
      const id = d2.state.battle!.activeStackId!;
      act(d2, { kind: 'BattleDefend', stackId: id });
    }
    expect(d2.state.battle!.activeStackId).toBe('peg');
    expect(stack(d2, 'ally').statuses.some((s) => s.kind === 'damage_ward')).toBe(false);
  });
});

describe('Distract (Root-Runner)', () => {
  const pieces: Piece[] = [
    // (2,5) is two hexes from (4,4); (3,4) touches (4,4).
    { id: 'rr', side: 'attacker', creatureId: 'root_runner', count: 20, at: [2, 5] },
    { id: 'hit', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 4] },
    { id: 'foe', side: 'defender', creatureId: 'brigand', count: 30, at: [4, 4] },
    { id: 'far', side: 'defender', creatureId: 'brigand', count: 10, at: [9, 5] },
  ];

  it('suppresses the next retaliation only; targets must be within two hexes in a clear line', () => {
    const d = arena(pieces, 'rr');
    const opt = legalActions(d.catalog, d.state)!.abilities.find((a) => a.abilityId === 'neutral_distract')!;
    expect(opt.targets).toEqual(['foe']);
    expect(refuse(d, ability(d, 'rr', 'neutral_distract', 'far')).code).toBe('illegal_target');
    act(d, ability(d, 'rr', 'neutral_distract', 'foe'));
    setActive(d, 'hit');
    const ev = act(d, { kind: 'BattleMelee', stackId: 'hit', targetId: 'foe', from: stack(d, 'hit').anchor });
    expect(ev.some((e) => e.kind === 'BattleAttack' && e.mode === 'retaliation')).toBe(false);
    expect(ev.some((e) => e.kind === 'BattleStatusConsumed' && e.status === 'retaliation_suppressed')).toBe(true);
    expect(stack(d, 'foe').retaliationsUsed).toBe(1);
    expect(stack(d, 'foe').statuses.some((s) => s.kind === 'retaliation_suppressed')).toBe(false);
  });
});

describe('Long Reach (Serpopard)', () => {
  it('strikes exactly two hexes away along a clear straight line, for 75%, without an adjacent-only retaliation', () => {
    const d = arena(
      [
        { id: 'ser', side: 'attacker', creatureId: 'serpopard', count: 20, at: [3, 5] },
        { id: 'foe', side: 'defender', creatureId: 'brigand', count: 40, at: [5, 5] },
      ],
      'ser',
    );
    const b = d.state.battle!;
    // The serpopard's front cell is (3,5); (4,5) is clear: a straight two-hex line to (5,5).
    const opts = meleeOptions(d.catalog, b, stack(d, 'ser'), stack(d, 'foe'));
    const here = opts.find((o) => o.from.col === 3 && o.from.row === 5);
    expect(here?.reach).toBe(true);
    const reach = previewStrike(d.catalog, b, stack(d, 'ser'), stack(d, 'foe'), { mode: 'melee', chargeHexes: 0, reach: true });
    const plain = previewStrike(d.catalog, b, stack(d, 'ser'), stack(d, 'foe'), { mode: 'melee', chargeHexes: 0 });
    expect(reach.max).toBeLessThan(plain.max);
    expect(reach.notes.join(' ')).toMatch(/Long Reach/);
    const ev = act(d, { kind: 'BattleMelee', stackId: 'ser', targetId: 'foe', from: { col: 3, row: 5 } });
    expect(ev.some((e) => e.kind === 'BattleAttack' && e.mode === 'melee' && e.attackerId === 'ser')).toBe(true);
    expect(ev.some((e) => e.kind === 'BattleAttack' && e.mode === 'retaliation')).toBe(false);
    expect(stack(d, 'ser').anchor).toEqual({ col: 3, row: 5 });
  });

  it('is blocked by anything standing in the middle hex, and is never a diagonal off the line', () => {
    const d = arena(
      [
        { id: 'ser', side: 'attacker', creatureId: 'serpopard', count: 20, at: [3, 5] },
        { id: 'foe', side: 'defender', creatureId: 'brigand', count: 40, at: [5, 5] },
      ],
      'ser',
    );
    const b = d.state.battle!;
    b.obstacles = [{ col: 4, row: 5 }];
    const blocked = meleeOptions(d.catalog, b, stack(d, 'ser'), stack(d, 'foe')).filter((o) => o.reach && o.from.col === 3 && o.from.row === 5);
    expect(blocked).toHaveLength(0);
    b.obstacles = [];
    // (5,4) is two hexes from (3,5) but off every straight line: not a reach target.
    stack(d, 'foe').anchor = { col: 5, row: 4 };
    const off = meleeOptions(d.catalog, b, stack(d, 'ser'), stack(d, 'foe')).filter((o) => o.reach && o.from.col === 3 && o.from.row === 5);
    expect(off).toHaveLength(0);
  });

  it('works along the board edge', () => {
    const d = arena(
      [
        { id: 'ser', side: 'attacker', creatureId: 'serpopard', count: 20, at: [2, 0] },
        { id: 'foe', side: 'defender', creatureId: 'brigand', count: 40, at: [4, 0] },
      ],
      'ser',
    );
    const here = meleeOptions(d.catalog, d.state.battle!, stack(d, 'ser'), stack(d, 'foe')).find((o) => o.from.col === 2 && o.from.row === 0);
    expect(here?.reach).toBe(true);
  });
});

describe('Devour Dread (Baku)', () => {
  const pieces: Piece[] = [
    { id: 'baku', side: 'attacker', creatureId: 'baku', count: 20, at: [3, 5] },
    { id: 'ally', side: 'attacker', creatureId: 'hoplite', count: 30, at: [4, 6] },
    { id: 'foe', side: 'defender', creatureId: 'brigand', count: 30, at: [9, 5] },
  ];
  const curse = { sourceId: 'spell:curse', label: 'Curse', kind: 'min_damage_roll' as const, amount: 0, numerator: 1, denominator: 1, expiresAtRound: 9, hostile: true, seq: 2 };
  const weak = { sourceId: 'spell:weakness', label: 'Weakness', kind: 'attack_bonus' as const, amount: -3, numerator: 1, denominator: 1, expiresAtRound: 9, hostile: true, seq: 1 };
  const bless = { sourceId: 'spell:bless', label: 'Bless', kind: 'max_damage_roll' as const, amount: 0, numerator: 1, denominator: 1, expiresAtRound: 9, hostile: false, seq: 0 };

  it('is unavailable (no use spent) when nobody in reach has a temporary hostile debuff', () => {
    const d = arena(pieces, 'baku');
    stack(d, 'ally').statuses = [bless];
    const opt = legalActions(d.catalog, d.state)!.abilities.find((a) => a.abilityId === 'neutral_devour_dread')!;
    expect(opt.targets).toEqual([]);
    expect(opt.reason).toMatch(/debuff/);
    expect(refuse(d, ability(d, 'baku', 'neutral_devour_dread', 'ally')).code).toBe('illegal_target');
    expect(stack(d, 'baku').abilityUses?.['neutral_devour_dread'] ?? 0).toBe(0);
  });

  it('removes exactly the earliest hostile debuff, never a blessing', () => {
    const d = arena(pieces, 'baku');
    stack(d, 'ally').statuses = [bless, curse, weak];
    const ev = act(d, ability(d, 'baku', 'neutral_devour_dread', 'ally'));
    expect(stack(d, 'ally').statuses.map((s) => s.sourceId)).toEqual(['spell:bless', 'spell:curse']);
    expect(ev.find((e) => e.kind === 'BattleAbilityUsed')).toMatchObject({ removedStatus: 'Weakness' });
  });

  it('may target itself', () => {
    const d = arena(pieces, 'baku');
    stack(d, 'baku').statuses = [curse];
    act(d, ability(d, 'baku', 'neutral_devour_dread', 'baku'));
    expect(stack(d, 'baku').statuses).toEqual([]);
  });
});

describe('Reed Guard (Afanc) and Tail Snare (Ahuitzotl)', () => {
  it('Reed Guard defends, gives the adjacent ally +2 Defense and stops one pull', () => {
    const d = arena(
      [
        // The Afanc (facing left) holds (6,5)+(7,5); (6,4) touches (6,5); (4,4)-(5,4)-(6,4) is a straight line.
        { id: 'afanc', side: 'defender', creatureId: 'afanc', count: 20, at: [6, 5] },
        { id: 'ally', side: 'defender', creatureId: 'brigand', count: 30, at: [6, 4] },
        { id: 'snare', side: 'attacker', creatureId: 'ahuitzotl', count: 10, at: [4, 4] },
      ],
      'afanc',
    );
    act(d, ability(d, 'afanc', 'neutral_reed_guard', 'ally'));
    expect(stack(d, 'afanc').defending).toBe(true);
    expect(stack(d, 'ally').statuses.find((s) => s.kind === 'defense_bonus')?.amount).toBe(2);
    expect(stack(d, 'ally').statuses.some((s) => s.kind === 'pull_immunity')).toBe(true);
    setActive(d, 'snare');
    const opt = legalActions(d.catalog, d.state)!.abilities.find((a) => a.abilityId === 'neutral_tail_snare')!;
    expect(opt.targets).toEqual([]);
    expect(opt.reason).toMatch(/Protected/);
    expect(refuse(d, ability(d, 'snare', 'neutral_tail_snare', 'ally')).message).toMatch(/Protected/);
    expect(stack(d, 'ally').anchor).toEqual({ col: 6, row: 4 });
  });

  it('Tail Snare pulls a one-hex enemy exactly two hexes away one hex closer, deterministically', () => {
    const pieces: Piece[] = [
      { id: 'snare', side: 'attacker', creatureId: 'ahuitzotl', count: 10, at: [3, 4] },
      { id: 'foe', side: 'defender', creatureId: 'brigand', count: 30, at: [5, 4] },
      { id: 'big', side: 'defender', creatureId: 'centaur', count: 10, at: [6, 6] },
    ];
    const runs = [0, 1].map(() => {
      const d = arena(pieces, 'snare');
      const opt = legalActions(d.catalog, d.state)!.abilities.find((a) => a.abilityId === 'neutral_tail_snare')!;
      expect(opt.targets).toEqual(['foe']);
      const rng = { ...d.state.rng };
      const ev = act(d, ability(d, 'snare', 'neutral_tail_snare', 'foe'));
      expect(d.state.rng).toEqual(rng);
      expect(stack(d, 'foe').anchor).toEqual({ col: 4, row: 4 });
      expect(ev.some((e) => e.kind === 'BattleStackMoved' && e.forced === 'pull')).toBe(true);
      expect(ev.some((e) => e.kind === 'BattleAttack')).toBe(false);
      return canonicalStateHash(d.state);
    });
    expect(runs[0]).toBe(runs[1]);
  });

  it('Tail Snare refuses two-hex stacks, an occupied middle hex and a non-straight line', () => {
    const d = arena(
      [
        { id: 'snare', side: 'attacker', creatureId: 'ahuitzotl', count: 10, at: [3, 4] },
        { id: 'big', side: 'defender', creatureId: 'centaur', count: 10, at: [6, 4] },
        { id: 'foe', side: 'defender', creatureId: 'brigand', count: 30, at: [5, 4] },
        { id: 'block', side: 'attacker', creatureId: 'hoplite', count: 5, at: [4, 4] },
      ],
      'snare',
    );
    expect(refuse(d, ability(d, 'snare', 'neutral_tail_snare', 'big')).message).toMatch(/one-hex/);
    expect(refuse(d, ability(d, 'snare', 'neutral_tail_snare', 'foe')).message).toMatch(/straight line/);
    stack(d, 'block').anchor = { col: 1, row: 9 };
    // (4,3) is two hexes from (3,4), off every straight line.
    stack(d, 'foe').anchor = { col: 4, row: 3 };
    expect(refuse(d, ability(d, 'snare', 'neutral_tail_snare', 'foe')).message).toMatch(/straight line/);
  });

  it('Tail Snare works on the board edge row', () => {
    const d = arena(
      [
        { id: 'snare', side: 'attacker', creatureId: 'ahuitzotl', count: 10, at: [0, 0] },
        { id: 'foe', side: 'defender', creatureId: 'brigand', count: 30, at: [2, 0] },
      ],
      'snare',
    );
    act(d, ability(d, 'snare', 'neutral_tail_snare', 'foe'));
    expect(stack(d, 'foe').anchor).toEqual({ col: 1, row: 0 });
  });
});

describe('neutral abilities on older saves', () => {
  it('a stack without `abilityUses` (an older save) still uses its ability once', () => {
    const d = arena(
      [
        { id: 'peg', side: 'attacker', creatureId: 'pegasus', count: 4, at: [3, 4] },
        { id: 'ally', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 5] },
        { id: 'foe', side: 'defender', creatureId: 'brigand', count: 30, at: [9, 5] },
      ],
      'peg',
    );
    delete stack(d, 'peg').abilityUses;
    act(d, ability(d, 'peg', 'neutral_sheltering_wings', 'ally'));
    expect(stack(d, 'peg').abilityUses).toEqual({ neutral_sheltering_wings: 1 });
  });
});

export type { BattleCell };

describe('neutral dragon powers', () => {
  const ward = 'neutral_celestial_rain_dragon_special';
  const wings: Piece[] = [
    { id:'dragon',side:'attacker',creatureId:'neutral_celestial_rain_dragon',count:2,at:[3,4] },
    { id:'ally',side:'attacker',creatureId:'hoplite',count:50,at:[6,4] },
    { id:'near',side:'attacker',creatureId:'hoplite',count:50,at:[3,5] },
    { id:'foe',side:'defender',creatureId:'brigand',count:100,at:[7,4] },
  ];
  it('wards two chosen targets within three hexes, spends one action/use, draws no RNG, and expires on reactivation', () => {
    const d=arena(wings,'dragon');
    expect(legalActions(d.catalog,d.state)!.abilities.find(a=>a.abilityId===ward)).toMatchObject({maxTargets:2,targets:['ally','dragon','near']});
    const rng={...d.state.rng};
    const events=act(d,{...ability(d,'dragon',ward,'ally'),additionalTargetIds:['near']});
    expect(d.state.rng).toEqual(rng);
    expect(events.filter(e=>e.kind==='BattleAbilityUsed')).toEqual([expect.objectContaining({targetId:'ally',targetIds:['ally','near']})]);
    for(const id of ['ally','near']) expect(stack(d,id).statuses).toContainEqual(expect.objectContaining({kind:'damage_ward',amount:30,expiresOnActivationOf:'dragon'}));
    expect(stack(d,'dragon').abilityUses?.[ward]).toBe(1);
    expect(d.state.battle!.activeStackId).not.toBe('dragon');
    for(let i=0;i<10 && d.state.battle!.activeStackId!=='dragon';i++) act(d,{kind:'BattleDefend',stackId:d.state.battle!.activeStackId!});
    for(const id of ['ally','near']) expect(stack(d,id).statuses).not.toContainEqual(expect.objectContaining({kind:'damage_ward'}));
    expect(refuse(d,ability(d,'dragon',ward,'ally')).message).toMatch(/already used/i);
  });
  it('validates every selected target before changing state, including duplicates, excess and hostile targets', () => {
    const d=arena(wings,'dragon');
    for(const ids of [['ally'],['near','dragon'],['foe'],['missing']]){
      const before=canonicalStateHash(d.state);
      expect(refuse(d,{...ability(d,'dragon',ward,'ally'),additionalTargetIds:ids}).code).toBe('illegal_target');
      expect(canonicalStateHash(d.state)).toBe(before);
    }
  });
  it('a blocked three-hex line is illegal; base Rainward allows self but only one target', () => {
    const d=arena(wings.map(p=>p.id==='dragon'?{...p,creatureId:'neutral_rain_dragon'}:p),'dragon');
    d.state.battle!.obstacles=[{col:4,row:4}];
    const id='neutral_rain_dragon_special';
    expect(legalActions(d.catalog,d.state)!.abilities.find(a=>a.abilityId===id)!.targets).not.toContain('ally');
    expect(refuse(d,{...ability(d,'dragon',id,'dragon'),additionalTargetIds:['near']}).code).toBe('illegal_target');
    act(d,ability(d,'dragon',id,'dragon'));
    expect(stack(d,'dragon').statuses).toContainEqual(expect.objectContaining({kind:'damage_ward',amount:25}));
  });
  it('Royal Dread suppresses two foes and excludes undead, constructs and mind immunity', () => {
    const d=arena([
      {id:'dragon',side:'attacker',creatureId:'neutral_crowned_zilant',count:2,at:[3,4]},
      {id:'foe',side:'defender',creatureId:'brigand',count:10,at:[5,4]},
      {id:'foe2',side:'defender',creatureId:'brigand',count:10,at:[4,5]},
      {id:'immune',side:'defender',creatureId:'hoplite',count:10,at:[5,5]},
    ],'dragon');
    const id='neutral_crowned_zilant_special';
    for(const trait of ['undead','construct','mind_immune'] as const){
      const catalog={...d.catalog,creatures:{...d.catalog.creatures,hoplite:{...d.catalog.creatures.hoplite!,traits:[trait]}}};
      expect(legalActions(catalog,d.state)!.abilities.find(a=>a.abilityId===id)!.targets).toEqual(['foe','foe2']);
    }
    act(d,{...ability(d,'dragon',id,'foe'),additionalTargetIds:['foe2']});
    for(const target of ['foe','foe2']) expect(stack(d,target).statuses).toContainEqual(expect.objectContaining({kind:'retaliation_suppressed',amount:1}));
  });
  it.each([['neutral_cuelebre',4,false],['neutral_ancient_cuelebre',5,true]] as const)('%s defends and protects the intended living neighbours', (creatureId,amount,all) => {
    const d=arena([
      {id:'dragon',side:'attacker',creatureId,count:2,at:[3,4]},
      {id:'a',side:'attacker',creatureId:'hoplite',count:30,at:[3,5]},
      {id:'b',side:'attacker',creatureId:'hoplite',count:30,at:[2,3]},
      {id:'far',side:'attacker',creatureId:'hoplite',count:30,at:[7,5]},
      {id:'foe',side:'defender',creatureId:'brigand',count:100,at:[9,4]},
    ],'dragon');
    const events=act(d,ability(d,'dragon',creatureId+'_special','a'));
    expect(stack(d,'dragon').defending).toBe(true);
    expect(events.filter(e=>e.kind==='BattleStackDefended')).toHaveLength(1);
    for(const target of (all?['a','b']:['a'])) {
      expect(stack(d,target).statuses).toContainEqual(expect.objectContaining({kind:'defense_bonus',amount}));
      expect(stack(d,target).statuses).toContainEqual(expect.objectContaining({kind:'pull_immunity',amount:1}));
    }
    expect(stack(d,'far').statuses).toEqual([]);
    if(!all) expect(stack(d,'b').statuses).toEqual([]);
  });
});
