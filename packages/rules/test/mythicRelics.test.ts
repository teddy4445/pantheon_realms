import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { applyStatus, artifactEffects, effectiveDefense, effectiveSpeed, legalActions, previewShot, reachableAnchors, resolveStackDamage, statsOf, Tx, type EquipSlot } from '../src';
import { afterLibraryCleanse, consumeDisplacementGuard, initializeLibraryArmy, relicHealAmount, relicRoundEnd, relicSpellDamage } from '../src/systems/battle/libraryRelics';

function setup(relics: string[]) {
  const d = GameDriver.mission('three_beacons_m01');
  d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
  const hero = d.state.heroes.alexios!;
  hero.attributes.knowledge = 20;
  relics.forEach((id, i) => { hero.equipment[`misc_${i + 1}` as EquipSlot] = { instanceId: `relic-${i}`, artifactId: id }; });
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 8, r: 7 } });
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 10, r: 7 }, confirmEncounter: true });
  const b = d.state.battle!;
  const ally = Object.values(b.stacks).find((s) => s.side === 'attacker' && s.creatureId === 'hoplite')!;
  const shooter = Object.values(b.stacks).find((s) => s.side === 'attacker' && s.creatureId === 'peltast')!;
  const enemy = Object.values(b.stacks).find((s) => s.side === 'defender')!;
  b.activeStackId = ally.id;
  b.sides.attacker.commander!.spellbook = true;
  b.sides.attacker.commander!.knownSpellIds = ['spell2_runes_refusal', 'spell2_oathbound_spear'];
  d.state.heroes.alexios!.mana = 100;
  return { d, ally, shooter, enemy };
}
describe('Mythic Library relic integration', () => {
  it('shares the Fleece barrier across targets and spends it before a fatal-hit guard', () => {
    const { d, ally, shooter } = setup(['relic2_golden_fleece_mantle']);
    const b = d.state.battle!;
    expect(b.sides.attacker.armyBarrier).toBe(30 + 3 * d.state.heroes.alexios!.level);
    const barrier = b.sides.attacker.armyBarrier!;
    ally.totalHp = 10;
    ally.statuses = [{ sourceId: 'intervention:frigg', label: 'Guard', kind: 'last_creature_guard', amount: 1, numerator: 1, denominator: 1, expiresAtRound: 3 }];
    const tx = new Tx({ catalog: d.catalog }, d.state, 'player');
    expect(resolveStackDamage(tx, b, ally, 10, true).damage).toBe(0);
    expect(ally.statuses).toHaveLength(1);
    expect(b.sides.attacker.armyBarrier).toBe(barrier - 10);
    expect(resolveStackDamage(tx, b, shooter, barrier, true).damage).toBe(10);
    expect(resolveStackDamage(tx, b, ally, 50, true).damage).toBe(9);
    expect(ally.totalHp).toBe(1);
    expect(ally.statuses).toHaveLength(0);
  });
  it('increases first flight movement without changing initiative Speed', () => {
    const { d, ally } = setup(['relic2_ehecatl_conch']);
    const b = d.state.battle!;
    ally.creatureId = 'griffin'; b.obstacles = []; ally.anchor = { col: 1, row: 5 };
    const speed = effectiveSpeed(d.catalog, ally, b);
    const before = [...reachableAnchors(d.catalog, b, ally).values()];
    expect(Math.max(...before.map((v) => v.dist))).toBe(speed + 1);
    (b.sides.attacker.effectUses ??= {})[`activationSpent:${ally.sourceArmy ?? 'hero'}:${ally.sourceSlot}`] = 1;
    expect(Math.max(...[...reachableAnchors(d.catalog, b, ally).values()].map((v) => v.dist))).toBe(speed);
    expect(effectiveSpeed(d.catalog, ally, b)).toBe(speed);
  });
  it('marks one strongest undead at deployment with a stable tie and never retargets', () => {
    const { d, enemy } = setup(['relic2_mictlan_guide_lantern']);
    const b = d.state.battle!;
    enemy.creatureId = 'norse_draugr';
    b.stacks['zz-duplicate'] = { ...structuredClone(enemy), id: 'zz-duplicate' };
    initializeLibraryArmy(d.catalog, d.state, b);
    expect(b.sides.attacker.markedUndeadId).toBe(enemy.id);
    enemy.totalHp = 0;
    expect(b.sides.attacker.markedUndeadId).toBe(enemy.id);
  });
  it('amplifies incoming water healing additively and grants cleanse speed once to the actual cleansed ally', () => {
    const { d, ally, shooter } = setup(['relic2_chalchiuhtlicue_hem', 'relic2_dian_cecht_needle', 'relic2_uzume_bells']);
    const b = d.state.battle!;
    const water = { ...d.catalog.spells.spark!, element: 'water' as const };
    expect(relicHealAmount(b, 'attacker', 50, ally, water)).toBe(65);
    expect(relicHealAmount(b, 'attacker', 200, ally, water)).toBe(230);
    afterLibraryCleanse(b, 'attacker', ally);
    afterLibraryCleanse(b, 'attacker', shooter);
    expect(ally.statuses.find((s) => s.sourceId === 'artifact:cleanse_speed')?.amount).toBe(1);
    expect(shooter.statuses).toHaveLength(0);
  });
  it('uses explicit projectile and element tags, caps prevention, and consumes a ward only on a matching hit', () => {
    const { d, ally } = setup(['relic2_svalinn_shield', 'relic2_isis_tyet']);
    const b = d.state.battle!;
    ally.statuses = [{ sourceId: 'spell:crane', label: 'Crane', kind: 'projectile_spell_ward', amount: 50, capHp: 50, numerator: 1, denominator: 1, expiresAtRound: 3 }];
    expect(relicSpellDamage(b, d.catalog.spells.ember_burst!, 'defender', ally, 200)).toBe(150); // Area fire: 25%, no single-hit or projectile trigger.
    expect(ally.statuses).toHaveLength(1);
    expect(b.sides.attacker.effectUses?.firstSingleSpell).toBeUndefined();
    expect(relicSpellDamage(b, d.catalog.spells.kitsune_fire!, 'defender', ally, 200)).toBe(140); // Strongest: 60-HP first-spell protection, not three multiplied wards.
    expect(ally.statuses).toHaveLength(0);
    expect(relicSpellDamage(b, d.catalog.spells.kitsune_fire!, 'defender', ally, 200)).toBe(150); // Only elemental resistance remains.
    expect(relicSpellDamage(b, d.catalog.spells.lightning!, 'defender', ally, 200)).toBe(200);
  });
  it('amplifies the first direct fire spell only, within its damage cap', () => {
    const { d, enemy } = setup(['relic2_xiuhcoatl_firebrand']);
    const b = d.state.battle!;
    expect(relicSpellDamage(b, d.catalog.spells.ember_burst!, 'attacker', enemy, 1000)).toBe(1000);
    expect(relicSpellDamage(b, d.catalog.spells.wrath_of_sekhmet!, 'attacker', enemy, 1000)).toBe(1050);
    expect(relicSpellDamage(b, d.catalog.spells.wrath_of_sekhmet!, 'attacker', enemy, 1000)).toBe(1000);
  });
  it('protects the first mind spell army-wide, but not ordinary weakening or subsequent mind spells', () => {
    const { d, ally, shooter } = setup(['relic2_orpheus_lyre']);
    const b = d.state.battle!;
    const s = { sourceId: 'spell:test', label: 'Test', kind: 'ranged_lock' as const, amount: 1, numerator: 1, denominator: 1, expiresAtRound: 3, mind: true };
    applyStatus(shooter, s, { battle: b, casterSide: 'defender' });
    expect(shooter.statuses).toHaveLength(0);
    applyStatus(shooter, s, { battle: b, casterSide: 'defender' });
    expect(shooter.statuses).toHaveLength(1);
    applyStatus(ally, { ...s, sourceId: 'spell:weakness', kind: 'attack_bonus', amount: -2, mind: false }, { battle: b, casterSide: 'defender' });
    expect(ally.statuses).toHaveLength(1);
  });
  it('keeps forced-displacement protection on the original stack through reload and fragmentation', () => {
    const { d, ally } = setup(['relic2_yomi_return_cord']);
    expect(consumeDisplacementGuard(d.state.battle!, ally)).toBe(true);
    d.state = JSON.parse(JSON.stringify(d.state));
    const split = { ...d.state.battle!.stacks[ally.id]!, id: 'fragment' };
    expect(consumeDisplacementGuard(d.state.battle!, split)).toBe(false);
  });
  it('gates imported items in old saves and never stacks duplicate copies', () => {
    const { d } = setup(['relic2_mimir_cup', 'relic2_mimir_cup']);
    const h = d.state.heroes.alexios!;
    expect(artifactEffects(d.catalog, h, d.state)).toHaveLength(1);
    d.state.scenario.features!.mythicLibraryV2 = false;
    expect(artifactEffects(d.catalog, h, d.state)).toHaveLength(0);
    expect(artifactEffects(d.catalog, h)).toHaveLength(0);
  });
  it('quotes and pays two discounted spells, persists the quota on reload, and never spends it on rejection', () => {
    const { d, ally, enemy } = setup(['relic2_mimir_cup']);
    const cost = () => legalActions(d.catalog, d.state)!.spells.find((s) => s.spellId === 'spell2_runes_refusal')!.manaCost;
    expect(cost()).toBe(8);
    d.reject({ kind: 'BattleCastSpell', spellId: 'spell2_runes_refusal', targetId: enemy.id });
    expect(d.state.heroes.alexios!.mana).toBe(100);
    for (let i = 0; i < 2; i++) {
      d.state.battle!.sides.attacker.castThisRound = false;
      d.do({ kind: 'BattleCastSpell', spellId: 'spell2_runes_refusal', targetId: ally.id });
      d.state = JSON.parse(JSON.stringify(d.state));
    }
    d.state.battle!.sides.attacker.castThisRound = false;
    expect(cost()).toBe(10);
    expect(d.state.heroes.alexios!.mana).toBe(84);
  });
  it('requires affordability before a low-mana reserve and refunds only once', () => {
    const { d, ally } = setup(['relic2_hourglass_reserve']);
    const cast = { kind: 'BattleCastSpell' as const, spellId: 'spell2_runes_refusal', targetId: ally.id };
    d.state.heroes.alexios!.mana = 9;
    d.reject(cast);
    expect(d.state.heroes.alexios!.mana).toBe(9);
    d.state.heroes.alexios!.mana = 11;
    d.do(cast);
    expect(d.state.heroes.alexios!.mana).toBe(5);
    d.state.battle!.sides.attacker.castThisRound = false;
    d.state.heroes.alexios!.mana = 11;
    d.do(cast);
    expect(d.state.heroes.alexios!.mana).toBe(1);
  });
  it('tests mana spent after discounts rather than the printed cost', () => {
    const { d, ally, enemy } = setup(['relic2_mimir_cup', 'relic2_nut_starweave']);
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_runes_refusal', targetId: ally.id });
    expect(d.state.heroes.alexios!.mana).toBe(92); // 8 paid does not trigger the 10-mana threshold.
    d.state.battle!.sides.attacker.castThisRound = false;
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_oathbound_spear', targetId: enemy.id });
    expect(d.state.heroes.alexios!.mana).toBe(85); // 10 paid, 3 returned.
  });
  it('uses the first-shot range bonus in preview and commit, then spends it for every fragment', () => {
    const { d, shooter, enemy } = setup(['relic2_skadi_huntbow']);
    const b = d.state.battle!;
    b.obstacles = [];
    shooter.anchor = { col: 1, row: 3 }; enemy.anchor = { col: 10, row: 3 }; enemy.totalHp = 10000;
    b.activeStackId = shooter.id;
    const first = previewShot(d.catalog, d.state, shooter.id, enemy.id)!;
    expect(first.notes).toContain('First shot ignores distance penalty');
    d.do({ kind: 'BattleShoot', stackId: shooter.id, targetId: enemy.id });
    const next = previewShot(d.catalog, d.state, shooter.id, enemy.id)!;
    expect(next.max).toBeLessThan(first.max);
    expect(next.notes).not.toContain('First shot ignores distance penalty');
  });
  it('bases the wounded defense on all fragments of an original stack', () => {
    const { d, ally } = setup(['relic2_morrigan_crowcloak']);
    const b = d.state.battle!;
    const hp = statsOf(d.catalog, ally.creatureId).hp;
    ally.startingCount = 10; ally.totalHp = hp;
    const base = statsOf(d.catalog, ally.creatureId).defense + (b.sides.attacker.commander?.defense ?? 0);
    expect(effectiveDefense(d.catalog, b, ally)).toBe(base + 3);
    b.stacks.fragment = { ...structuredClone(ally), id: 'fragment', startingCount: 10, totalHp: 10 * hp };
    expect(effectiveDefense(d.catalog, b, ally)).toBe(base);
  });
  it('heals only a living front creature in the first three rounds and caps amplification', () => {
    const { d, ally, shooter } = setup(['relic2_idunn_apple_clasp', 'relic2_dian_cecht_needle']);
    const b = d.state.battle!;
    ally.totalHp = 11; shooter.totalHp = 0;
    b.round = 1; relicRoundEnd(d.catalog, b);
    expect(ally.totalHp).toBe(16);
    expect(shooter.totalHp).toBe(0);
    b.round = 4; relicRoundEnd(d.catalog, b);
    expect(ally.totalHp).toBe(16);
    expect(relicHealAmount(b, 'attacker', 200)).toBe(220);
    ally.creatureId = 'clay_golem'; ally.totalHp = 1; b.round = 1;
    relicRoundEnd(d.catalog, b);
    expect(ally.totalHp).toBe(1);
  });
});
