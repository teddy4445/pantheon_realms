import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { canonicalStateHash, quoteActiveRelic, reachableAnchors, legalActions } from '../src';

function setup(id: string) {
  const d = GameDriver.mission('three_beacons_m01');
  d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
  const h = d.state.heroes.alexios!;
  h.equipment.misc_1 = { instanceId: 'active-relic', artifactId: id };
  d.do({ kind: 'MoveHero', heroId: h.id, destination: { q: 8, r: 7 } });
  d.do({ kind: 'MoveHero', heroId: h.id, destination: { q: 10, r: 7 }, confirmEncounter: true });
  const b = d.state.battle!, ally = Object.values(b.stacks).find((s) => s.side === 'attacker')!, enemy = Object.values(b.stacks).find((s) => s.side === 'defender')!;
  b.activeStackId = ally.id; b.sides.attacker.commander!.spellbook = false;
  ally.anchor = { col: 3, row: 3 }; enemy.anchor = { col: 4, row: 3 };
  return { d, ally, enemy };
}
describe('active relic commander powers', () => {
  it('binds without a spellbook, removes movement but preserves attacks, and spends the round and saved battle quota', () => {
    const id = 'relic2_gleipnir_ribbon', { d, ally, enemy } = setup(id);
    const mana = d.state.heroes.alexios!.mana;
    d.do({ kind: 'BattleActivateArtifact', artifactId: id, targetId: enemy.id });
    let b = d.state.battle!;
    expect(b.sides.attacker.castThisRound).toBe(true);
    expect(d.state.heroes.alexios!.mana).toBe(mana);
    expect(reachableAnchors(d.catalog, b, b.stacks[enemy.id]!).size).toBe(0);
    b.activeStackId = enemy.id;
    expect(legalActions(d.catalog, d.state)!.melee.some((m) => m.targetId === ally.id)).toBe(true);
    d.state = JSON.parse(JSON.stringify(d.state)); b = d.state.battle!;
    b.activeStackId = ally.id; b.sides.attacker.castThisRound = false;
    b.stacks[enemy.id]!.statuses = [];
    expect(quoteActiveRelic(d.catalog, d.state, id, enemy.id).reason).toContain('already used');
  });
  it('never spends the action on an invalid range or recovery-protected target', () => {
    const id = 'relic2_gleipnir_ribbon', { d, enemy } = setup(id);
    enemy.controlGrace = ['rooted'];
    const before = canonicalStateHash(d.state);
    d.reject({ kind: 'BattleActivateArtifact', artifactId: id, targetId: enemy.id });
    expect(canonicalStateHash(d.state)).toBe(before);
    enemy.controlGrace = []; enemy.anchor = { col: 14, row: 8 };
    expect(quoteActiveRelic(d.catalog, d.state, id, enemy.id).legal).toBe(false);
  });
  it('requires explicit selection among several dispellable buffs, preserving innate and artifact effects', () => {
    const id = 'relic2_runebreaker_gauntlet', { d, enemy } = setup(id);
    const base = { label: 'Buff', kind: 'defense_bonus' as const, amount: 3, numerator: 1, denominator: 1, expiresAtRound: 5 };
    enemy.statuses = ['spell:first', 'spell:second', 'artifact:passive', 'intervention:god'].map((sourceId) => ({ ...base, sourceId }));
    d.reject({ kind: 'BattleActivateArtifact', artifactId: id, targetId: enemy.id });
    d.do({ kind: 'BattleActivateArtifact', artifactId: id, targetId: enemy.id, statusSourceId: 'spell:second' });
    expect(d.state.battle!.stacks[enemy.id]!.statuses.map((s) => s.sourceId)).toEqual(['spell:first', 'artifact:passive', 'intervention:god']);
  });
  it('cleanses only an Attack or Defense debuff and grants Defense through a subsequent activation', () => {
    const id = 'relic2_nuada_silver_bracer', { d, ally } = setup(id);
    ally.statuses = [{ sourceId: 'spell:slow', label: 'Slow', kind: 'speed_bonus', amount: -3, numerator: 1, denominator: 1, expiresAtRound: 5, hostile: true }];
    d.reject({ kind: 'BattleActivateArtifact', artifactId: id, targetId: ally.id });
    ally.statuses.push({ ...ally.statuses[0]!, sourceId: 'spell:weak', label: 'Weak', kind: 'attack_bonus' });
    d.do({ kind: 'BattleActivateArtifact', artifactId: id, targetId: ally.id, statusSourceId: 'spell:weak' });
    const target = d.state.battle!.stacks[ally.id]!;
    expect(target.statuses.some((s) => s.sourceId === 'spell:slow')).toBe(true);
    expect(target.statuses.find((s) => s.sourceId === `artifact:${id}`)).toMatchObject({ amount: 2, expiresAfterActivation: true, nextActivationStarted: false });
  });
});
