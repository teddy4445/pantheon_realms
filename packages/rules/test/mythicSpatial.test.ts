import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { canonicalStateHash, spatialSpellOptions, stackCells, cellKey } from '../src';

function setup() {
  const d = GameDriver.mission('three_beacons_m01');
  d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 8, r: 7 } });
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 10, r: 7 }, confirmEncounter: true });
  const b = d.state.battle!;
  const allies = Object.values(b.stacks).filter((s) => s.side === 'attacker');
  const enemy = Object.values(b.stacks).find((s) => s.side === 'defender')!;
  b.activeStackId = allies[0]!.id;
  b.sides.attacker.commander!.spellbook = true;
  b.sides.attacker.commander!.knownSpellIds = ['spell2_aether_step', 'spell2_ravens_exchange', 'spell2_tide_pearl_turn'];
  d.state.heroes.alexios!.mana = 100;
  b.obstacles = [];
  allies[0]!.anchor = { col: 3, row: 3 }; allies[1]!.anchor = { col: 5, row: 3 }; enemy.anchor = { col: 9, row: 4 };
  return { d, b, ally: allies[0]!, other: allies[1]!, enemy };
}

describe('positional library spells', () => {
  it('teleports over ordinary obstacles, consumes the commander action but not the creature activation', () => {
    const { d, b, ally } = setup();
    b.obstacles = Array.from({ length: b.rows }, (_, row) => ({ col: 4, row }));
    const destination = { col: 6, row: 3 };
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_aether_step', targetId: ally.id, destination });
    expect(d.state.battle!.stacks[ally.id]!.anchor).toEqual(destination);
    expect(d.state.battle!.activeStackId).toBe(ally.id);
    expect(d.state.battle!.sides.attacker.castThisRound).toBe(true);
    expect(d.state.heroes.alexios!.mana).toBe(100 - d.catalog.spells.spell2_aether_step!.manaCost);
  });
  it('rejects a sealed wall, an occupied destination and a rooted stack without charging', () => {
    const { d, b, ally, other } = setup();
    const cast = (destination: { col: number; row: number }) => ({ kind: 'BattleCastSpell' as const, spellId: 'spell2_aether_step', targetId: ally.id, destination });
    let before = canonicalStateHash(d.state);
    d.reject(cast(other.anchor));
    expect(canonicalStateHash(d.state)).toBe(before);
    b.siege = { structures: [{ id: 'sealed-wall', kind: 'wall', hp: 100, cells: Array.from({ length: b.rows }, (_, row) => ({ col: 4, row })) }] } as typeof b.siege;
    before = canonicalStateHash(d.state);
    d.reject(cast({ col: 6, row: 3 }));
    expect(canonicalStateHash(d.state)).toBe(before);
    b.siege = undefined;
    ally.statuses.push({ sourceId: 'spell:root', label: 'Rooted', kind: 'rooted', amount: 1, numerator: 1, denominator: 1, expiresAtRound: 5 });
    expect(spatialSpellOptions(d.catalog, b, ally, d.catalog.spells.spell2_aether_step!.effect)).toEqual([]);
  });
  it('swaps full footprints simultaneously and rejects incompatible footprint overlap', () => {
    const { d, b, ally, other } = setup();
    const a = { ...ally.anchor }, o = { ...other.anchor };
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_ravens_exchange', targetId: ally.id, destination: o, secondTargetId: other.id });
    expect(d.state.battle!.stacks[ally.id]!.anchor).toEqual(o);
    expect(d.state.battle!.stacks[other.id]!.anchor).toEqual(a);
    const occupied = Object.values(d.state.battle!.stacks).flatMap((s) => stackCells(d.catalog, s).map(cellKey));
    expect(new Set(occupied).size).toBe(occupied.length);
  });
  it('pushes exactly one legal hex and consumes a displacement ward only on a valid cast', () => {
    const { d, b, enemy } = setup();
    const before = canonicalStateHash(d.state);
    d.reject({ kind: 'BattleCastSpell', spellId: 'spell2_tide_pearl_turn', targetId: enemy.id, destination: { col: 11, row: 4 } });
    expect(canonicalStateHash(d.state)).toBe(before);
    b.sides.defender.effects = { ...b.sides.attacker.effects!, library: [{ type: 'library_displacement_guard' }] };
    const from = { ...enemy.anchor };
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_tide_pearl_turn', targetId: enemy.id, destination: { col: 10, row: 4 } });
    expect(d.state.battle!.stacks[enemy.id]!.anchor).toEqual(from);
    d.state = JSON.parse(JSON.stringify(d.state));
    d.state.battle!.sides.attacker.castThisRound = false;
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_tide_pearl_turn', targetId: enemy.id, destination: { col: 10, row: 4 } });
    expect(d.state.battle!.stacks[enemy.id]!.anchor).toEqual({ col: 10, row: 4 });
  });
});
