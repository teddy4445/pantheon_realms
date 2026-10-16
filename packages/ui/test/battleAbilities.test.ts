/**
 * The battle screen's view of the neutral creatures' abilities (campaign
 * expansion handoff, 2026-10-15): the action buttons carry the definition's
 * exact rule (never typed copy), the uses left and the rules' reason; using one
 * leaves a status mark on its target and a combat-log line naming user, ability
 * and effect. Presentation only — read from the state and the rules.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { NEUTRAL_PLAYER_ID, legalActions, type BattleSideId, type BattleStackState, type CommandPayload } from '@pr/rules';
import { resolveAsset } from '../src/assets/manifest';
import { abilityActions, abilityEffect, abilityFxOf } from '../src/app/battleAbilities';
import { battleLogLines, clearBattleLogs, recordBattleEvents } from '../src/app/battleLog';
import { stackMarks } from '../src/app/stackMarks';

const MISSION = 'skirmish_twin_harbors';

function started(): GameDriver {
  const d = GameDriver.mission(MISSION, { matchId: 'unit:battle-abilities' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = d.hero();
  const mine = d.catalog.missions[MISSION]!.sites.find((x) => x.id === 'sk_gold')!.coord;
  d.marchTo({ q: mine.q - 1, r: mine.r }, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: mine, confirmEncounter: true });
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

const PIECES: Piece[] = [
  { id: 'peg', side: 'attacker', creatureId: 'pegasus', count: 8, at: [3, 4] },
  { id: 'ally', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 5] },
  { id: 'rr', side: 'attacker', creatureId: 'root_runner', count: 12, at: [6, 2] },
  { id: 'ahu', side: 'attacker', creatureId: 'ahuitzotl', count: 9, at: [5, 7] },
  { id: 'sli', side: 'defender', creatureId: 'hill_slinger', count: 20, at: [7, 7] },
  { id: 'ogre', side: 'defender', creatureId: 'ogre', count: 6, at: [8, 2] },
];

const actor = (d: GameDriver, stackId: string) => d.state.battle!.sides[d.state.battle!.stacks[stackId]!.side].playerId ?? NEUTRAL_PLAYER_ID;
const use = (d: GameDriver, stackId: string, abilityId: string, targetId: string) => d.do({ kind: 'BattleUseAbility', stackId, abilityId, targetId } as CommandPayload, actor(d, stackId));
const setActive = (d: GameDriver, id: string) => {
  const b = d.state.battle!;
  b.activeStackId = id;
  b.normalQueue = b.normalQueue.filter((x) => x !== id);
};

describe('ability buttons: exact rule, uses left, reason', () => {
  it('shows the definition’s exact rule and restriction verbatim, 1 of 1 use and the kind of target', () => {
    const d = arena(PIECES, 'peg');
    const def = d.catalog.abilities['neutral_sheltering_wings']!;
    const [a] = abilityActions(d.catalog, d.state.battle!, legalActions(d.catalog, d.state)!);
    expect(a!.abilityId).toBe('neutral_sheltering_wings');
    expect(a!.available).toBe(true);
    expect(a!.uses).toEqual({ left: 1, total: 1, scope: 'stack' });
    expect(a!.target).toBe('ally');
    expect(a!.targets).toEqual(['ally']);
    expect(a!.exactRule).toBe(def.exactRule);
    expect(a!.tooltip).toContain(def.exactRule);
    expect(a!.tooltip).toContain(def.restriction);
    expect(a!.tooltip).toContain('1 of 1 use left in this battle, for this stack');
    expect(a!.prompt).toBe('Sheltering Wings: choose a highlighted friendly stack (1 in reach).');
  });

  it('after its one use: unavailable, “used”, with the rules’ reason before the rule', () => {
    const d = arena(PIECES, 'peg');
    d.state.battle!.stacks['peg']!.abilityUses = { neutral_sheltering_wings: 1 };
    const [a] = abilityActions(d.catalog, d.state.battle!, legalActions(d.catalog, d.state)!);
    expect(a!.available).toBe(false);
    expect(a!.uses!.left).toBe(0);
    expect(a!.reason).toBe('Already used in this battle');
    expect(a!.tooltip.startsWith('Sheltering Wings — unavailable: Already used in this battle (used in this battle).')).toBe(true);
    expect(a!.tooltip).toContain(d.catalog.abilities['neutral_sheltering_wings']!.exactRule);
  });

  it('every active neutral ability carries its own definition’s words; enemy abilities ask for an enemy', () => {
    const d = arena(PIECES, 'rr');
    const [rr] = abilityActions(d.catalog, d.state.battle!, legalActions(d.catalog, d.state)!);
    expect(rr!.target).toBe('enemy');
    expect(rr!.targets).toEqual(['ogre']);
    expect(rr!.prompt).toContain('enemy stack');
    for (const id of ['neutral_sheltering_wings', 'neutral_distract', 'neutral_devour_dread', 'neutral_reed_guard', 'neutral_tail_snare']) {
      const def = d.catalog.abilities[id]!;
      expect(def.activation).toBe('active');
      const fx = abilityFxOf(d.catalog, { abilityId: id })!;
      expect(fx.name).toBe(def.name);
      expect(fx.effect.length).toBeGreaterThan(0);
      // The badge beside it is a delivered icon.
      expect(resolveAsset(fx.icon!).status).toBe('final');
    }
    expect(abilityFxOf(d.catalog, { abilityId: 'neutral_tail_snare' })).toMatchObject({ hostile: true, look: null, effect: 'Pulled 1 hex' });
    expect(abilityFxOf(d.catalog, { abilityId: 'neutral_devour_dread', removedStatus: 'Weakness' })).toMatchObject({ hostile: false, effect: 'Weakness removed' });
  });
});

describe('after an ability: marks and the combat log', () => {
  it('Sheltering Wings marks its target until the Pegasi’s next turn, and the log names user, ability and effect', () => {
    clearBattleLogs();
    const d = arena(PIECES, 'peg');
    const events = use(d, 'peg', 'neutral_sheltering_wings', 'ally');
    recordBattleEvents(d.catalog, d.state, events, 'normal');
    const b = d.state.battle!;
    const marks = stackMarks(d.catalog, b.stacks['ally']!, b.round, b);
    const ward = marks.find((m) => m.icon === 'icon.ability.family_ward');
    expect(ward?.label).toBe('Sheltering Wings: the next creature blow it takes is 25% lighter (until the next turn of the Pegasi)');
    expect(resolveAsset('icon.ability.family_ward').status).toBe('final');
    expect(battleLogLines(b.battleId)).toContain('Pegasi use Sheltering Wings on Hoplites: the next creature blow they take is 25% lighter.');
  });

  it('Distract and Tail Snare: a dazed mark, one log line for the pull (no separate move line)', () => {
    clearBattleLogs();
    const d = arena(PIECES, 'rr');
    const e1 = use(d, 'rr', 'neutral_distract', 'ogre');
    recordBattleEvents(d.catalog, d.state, e1, 'normal');
    let b = d.state.battle!;
    const dazed = stackMarks(d.catalog, b.stacks['ogre']!, b.round, b).find((m) => m.icon === 'icon.status.stun');
    expect(dazed?.label).toBe('Distract: its next retaliation is suppressed (until the next turn of the Root-Runners)');
    setActive(d, 'ahu');
    const e2 = use(d, 'ahu', 'neutral_tail_snare', 'sli');
    expect(e2.some((e) => e.kind === 'BattleStackMoved' && e.forced === 'pull')).toBe(true);
    recordBattleEvents(d.catalog, d.state, e2, 'normal');
    b = d.state.battle!;
    const lines = battleLogLines(b.battleId);
    expect(lines).toContain('Root-Runners use Distract on Ogres: their next retaliation is suppressed.');
    expect(lines).toContain('Ahuitzotls use Tail Snare on Hill Slingers: pulled one hex closer.');
    expect(lines.some((l) => /Hill Slingers move/.test(l))).toBe(false);
    expect(abilityEffect(d.catalog, 'neutral_reed_guard').clause).toBe('+2 Defense and immune to one pull');
  });
});
