/**
 * Status sources (expedition kit 2026-10-17, handoff §04): every battle status records who applied it
 * when it is applied — the casting commander's hero and side for a spell (a commander without a
 * HeroState: the side only), the stack for an ability, the side for a miracle. No rule reads these
 * fields; the inspection panel shows them. Nothing is inferred later from a label.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { NEUTRAL_PLAYER_ID, type BattleSideId, type BattleStackState } from '../src';

const MISSION = 'skirmish_twin_harbors';

function started(): GameDriver {
  const d = GameDriver.mission(MISSION, { matchId: 'test:status-sources' });
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

const PIECES: Piece[] = [
  { id: 'ally', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 4] },
  { id: 'rr', side: 'attacker', creatureId: 'root_runner', count: 20, at: [2, 6] },
  { id: 'seer', side: 'attacker', creatureId: 'temple_seer', count: 10, at: [1, 8] },
  { id: 'foe', side: 'defender', creatureId: 'brigand', count: 30, at: [4, 6] },
  { id: 'foe2', side: 'defender', creatureId: 'brigand', count: 10, at: [12, 2] },
];

const actorOf = (d: GameDriver, side: BattleSideId) => d.state.battle!.sides[side].playerId ?? NEUTRAL_PLAYER_ID;
const status = (d: GameDriver, id: string, sourceId: string) => d.state.battle!.stacks[id]!.statuses.find((s) => s.sourceId === sourceId);

/** The attacker's hero commander knows these battle spells, with mana to spare. */
function teach(d: GameDriver, spells: string[]): string {
  const side = d.state.battle!.sides.attacker;
  const heroId = side.commander!.heroId!;
  side.commander = { ...side.commander!, spellbook: true, knownSpellIds: spells };
  d.state.heroes[heroId]!.mana = 99;
  return heroId;
}

describe('battle status sources', () => {
  it('a hero commander’s spell records the hero and the side (friendly and hostile)', () => {
    const d = arena(PIECES, 'ally');
    const heroId = teach(d, ['warcry', 'sapping_touch']);
    d.do({ kind: 'BattleCastSpell', spellId: 'warcry', targetId: 'ally' }, actorOf(d, 'attacker'));
    expect(status(d, 'ally', 'spell:warcry')).toMatchObject({ sourceHeroId: heroId, sourceSide: 'attacker', hostile: false });
    expect(status(d, 'ally', 'spell:warcry')!.sourceStackId).toBeUndefined();
    // Next round's cast: a curse on the enemy is hostile, the same hero its source.
    d.state.battle!.sides.attacker.castThisRound = false;
    d.do({ kind: 'BattleCastSpell', spellId: 'sapping_touch', targetId: 'foe' }, actorOf(d, 'attacker'));
    expect(status(d, 'foe', 'spell:sapping_touch')).toMatchObject({ sourceHeroId: heroId, sourceSide: 'attacker', hostile: true });
  });

  it('a commander without a hero (a scripted guard captain) records only its side', () => {
    const d = arena(PIECES, 'foe');
    const b = d.state.battle!;
    const tmpl = b.sides.attacker.commander!;
    b.sides.defender.commander = { ...tmpl, heroId: null, name: 'Doros', spellbook: true, knownSpellIds: ['ward'] };
    b.sides.defender.scriptedMana = 20;
    d.do({ kind: 'BattleCastSpell', spellId: 'ward', targetId: 'foe2' }, actorOf(d, 'defender'));
    const st = status(d, 'foe2', 'spell:ward')!;
    expect(st).toMatchObject({ sourceSide: 'defender', hostile: false });
    expect(st.sourceHeroId).toBeUndefined();
    expect(st.sourceStackId).toBeUndefined();
  });

  it('a stack’s ability records the stack and its side (neutral abilities and Ward)', () => {
    const d = arena(PIECES, 'rr');
    d.do({ kind: 'BattleUseAbility', stackId: 'rr', abilityId: 'neutral_distract', targetId: 'foe' }, actorOf(d, 'attacker'));
    expect(status(d, 'foe', 'ability:distract')).toMatchObject({ kind: 'retaliation_suppressed', sourceStackId: 'rr', sourceSide: 'attacker', hostile: true, expiresOnActivationOf: 'rr' });
    const d2 = arena(PIECES, 'seer');
    d2.do({ kind: 'BattleUseAbility', stackId: 'seer', abilityId: 'family_ward', targetId: 'ally' }, actorOf(d2, 'attacker'));
    expect(status(d2, 'ally', 'ability:family_ward')).toMatchObject({ kind: 'defense_bonus', sourceStackId: 'seer', sourceSide: 'attacker' });
    expect(status(d2, 'ally', 'ability:family_ward')!.sourceHeroId).toBeUndefined();
  });

  it('a battle miracle records the invoking side, never a hero', () => {
    const d = arena(PIECES, 'ally');
    d.state.scenario.features = { ...(d.state.scenario.features ?? {}), interventions: true } as typeof d.state.scenario.features;
    const player = d.state.battle!.sides.attacker.playerId!;
    d.state.players[player]!.wallet = { ...d.state.players[player]!.wallet, favor: 50 };
    d.do({ kind: 'BattleInvokeIntervention', interventionId: 'shield_of_the_gods' }, player);
    for (const id of ['ally', 'rr', 'seer']) {
      const st = status(d, id, 'intervention:shield_of_the_gods')!;
      expect(st).toMatchObject({ sourceSide: 'attacker', hostile: false });
      expect(st.sourceHeroId).toBeUndefined();
      expect(st.sourceStackId).toBeUndefined();
    }
  });

  it('refreshing a status by its source keeps the latest applier', () => {
    const d = arena(PIECES, 'ally');
    const heroId = teach(d, ['warcry']);
    d.do({ kind: 'BattleCastSpell', spellId: 'warcry', targetId: 'ally' }, actorOf(d, 'attacker'));
    d.state.battle!.sides.attacker.castThisRound = false;
    d.do({ kind: 'BattleCastSpell', spellId: 'warcry', targetId: 'ally' }, actorOf(d, 'attacker'));
    const all = d.state.battle!.stacks['ally']!.statuses.filter((s) => s.sourceId === 'spell:warcry');
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ sourceHeroId: heroId, sourceSide: 'attacker' });
  });
});
