import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { canonicalStateHash, fieldSpellProblem, fieldVictims, previewStrike, reachableAnchors, routeTo, cellKey, startRound, Tx } from '../src';

function setup() {
  const d = GameDriver.mission('three_beacons_m01');
  d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 8, r: 7 } });
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 10, r: 7 }, confirmEncounter: true });
  const b = d.state.battle!, allies = Object.values(b.stacks).filter((s) => s.side === 'attacker');
  const ally = allies[0]!, other = allies[1]!, enemy = Object.values(b.stacks).find((s) => s.side === 'defender')!;
  b.activeStackId = ally.id; b.obstacles = [];
  ally.anchor = { col: 2, row: 3 }; other.anchor = { col: 2, row: 6 }; enemy.anchor = { col: 9, row: 3 };
  b.sides.attacker.commander!.spellbook = true;
  b.sides.attacker.commander!.knownSpellIds = Object.keys(d.catalog.spells).filter((id) => id.startsWith('spell2_'));
  d.state.heroes.alexios!.mana = 100;
  return { d, b, ally, other, enemy };
}

describe('battlefield spells', () => {
  it('creates visible connected glass obstacles, expires them and rejects a sealed sole route before payment', () => {
    const { d, b, ally } = setup();
    const cells = [{ col: 6, row: 3 }, { col: 6, row: 4 }];
    b.obstacles = Array.from({ length: b.rows }, (_, row) => ({ col: 6, row })).filter((c) => c.row !== 3 && c.row !== 4);
    const before = canonicalStateHash(d.state);
    d.reject({ kind: 'BattleCastSpell', spellId: 'spell2_glass_bulwark', targetId: ally.id, cells });
    expect(canonicalStateHash(d.state)).toBe(before);
    b.obstacles = [];
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_glass_bulwark', targetId: ally.id, cells });
    const live = d.state.battle!;
    expect(live.spellFields![0]!.cells).toEqual(cells);
    expect(reachableAnchors(d.catalog, live, live.stacks[ally.id]!).has('6:3')).toBe(false);
    d.state = JSON.parse(JSON.stringify(d.state));
    startRound(new Tx({ catalog: d.catalog }, d.state, 'player'), d.state.battle!, 3);
    expect(d.state.battle!.spellFields).toEqual([]);
  });
  it('quotes frost movement surcharge and fires each marked hex at most once after save/reload', () => {
    const { d, b, ally, enemy } = setup();
    const cells = [{ col: 8, row: 3 }];
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_frost_threshold', targetId: ally.id, cells });
    d.state = JSON.parse(JSON.stringify(d.state));
    const live = d.state.battle!, t = live.stacks[enemy.id]!;
    // Drive the neutral defender through the real battle command using its side's actor.
    live.activeStackId = t.id;
    const node = reachableAnchors(d.catalog, live, t).get('8:3')!;
    expect(node.dist).toBe(2);
    const old = t.totalHp;
    d.do({ kind: 'BattleMove', stackId: t.id, to: cells[0]! }, '__neutral__');
    expect(d.state.battle!.stacks[t.id]!.totalHp).toBeLessThan(old);
    expect(d.state.battle!.spellFields![0]!.spent).toEqual(['8:3']);
  });
  it('wind line previews friendly fire, hits each multi-cell stack once, and rejects a crooked line', () => {
    const { d, b, ally, enemy } = setup();
    ally.anchor = { col: 4, row: 3 }; enemy.anchor = { col: 6, row: 3 };
    const cells = [{ col: 4, row: 3 }, { col: 5, row: 3 }, { col: 6, row: 3 }];
    expect(fieldVictims(d.catalog, b, cells).map((s) => s.id).sort()).toEqual([ally.id, enemy.id].sort());
    const oldA = ally.totalHp, oldE = enemy.totalHp;
    const effect = d.catalog.spells.spell2_serpents_breath!.effect;
    expect(effect.type).toBe('battle_field');
    if (effect.type === 'battle_field') expect(fieldSpellProblem(d.catalog, b, effect, [cells[0]!, cells[1]!, { col: 5, row: 4 }])).toContain('straight');
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_serpents_breath', targetId: ally.id, cells });
    expect(d.state.battle!.stacks[ally.id]!.totalHp).toBeLessThan(oldA);
    expect(d.state.battle!.stacks[enemy.id]!.totalHp).toBeLessThan(oldE);
  });
  it('sanctuary protects only friendly occupants and eclipse suppresses shots from either army', () => {
    const { d, b, ally, other, enemy } = setup();
    enemy.creatureId = 'peltast'; enemy.shotsRemaining = 10;
    const plain = previewStrike(d.catalog, b, enemy, ally, { mode: 'shot', chargeHexes: 0 });
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_rowan_sanctuary', targetId: ally.id, cells: [ally.anchor] });
    const live = d.state.battle!;
    const guarded = previewStrike(d.catalog, live, live.stacks[enemy.id]!, live.stacks[ally.id]!, { mode: 'shot', chargeHexes: 0 });
    expect(guarded.max).toBeLessThan(plain.max);
    live.sides.attacker.castThisRound = false;
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_obsidian_eclipse', targetId: ally.id, cells: [enemy.anchor] });
    const next = d.state.battle!;
    const suppressed = previewStrike(d.catalog, next, next.stacks[enemy.id]!, next.stacks[other.id]!, { mode: 'shot', chargeHexes: 0 });
    expect(suppressed.notes.some((n) => n.includes('Eclipse'))).toBe(true);
    next.stacks[other.id]!.anchor = { ...enemy.anchor };
    const own = previewStrike(d.catalog, next, next.stacks[other.id]!, next.stacks[enemy.id]!, { mode: 'shot', chargeHexes: 0 });
    expect(own.notes.some((n) => n.includes('Eclipse'))).toBe(true);
  });
});
