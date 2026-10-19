import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { applyStatus, effectiveAttack, effectiveLuck, legalActions, previewRetaliation, reachableAnchors, scopeAllowed, statsOf, townLibrarySpells, townSpellLibraryTier, utilitySpellReason, type BattleStackState } from '../src';

function battle() {
  const d = GameDriver.mission('three_beacons_m01');
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 8, r: 7 } });
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 10, r: 7 }, confirmEncounter: true });
  d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
  const b = d.state.battle!;
  const allied = Object.values(b.stacks).filter((s) => s.side === 'attacker');
  const shooter = allied.find((s) => s.creatureId === 'peltast')!;
  b.activeStackId = allied[0]!.id;
  b.sides.attacker.commander!.spellbook = true;
  b.sides.attacker.commander!.knownSpellIds = Object.keys(d.catalog.spells).filter((id) => id.startsWith('spell2_'));
  d.state.heroes.alexios!.mana = 100;
  return { d, shooter, ally: allied[0]!, enemy: Object.values(b.stacks).find((s) => s.side === 'defender')! };
}
const cast = (id: string, target: BattleStackState) => ({ kind: 'BattleCastSpell' as const, spellId: id, targetId: target.id });
describe('Mythic Library II utility effects', () => {
  it('Sand Silence blocks explicitly magical creature abilities, not physical attacks or the commander', () => {
    const { d, ally, enemy } = battle();
    const caster = Object.values(d.catalog.creatures).find((c) => c.abilityIds.includes('family_ward'))!;
    enemy.creatureId = caster.id;
    d.do(cast('spell2_sand_silence', enemy));
    const b = d.state.battle!;
    b.stacks[enemy.id]!.side = 'attacker'; b.activeStackId = enemy.id;
    b.sides.attacker.castThisRound = false;
    const actions = legalActions(d.catalog, d.state)!;
    expect(actions.abilities.find((a) => a.abilityId === 'family_ward')!.reason).toContain('sealed');
    expect(actions.castAvailable).toBe(true);
    expect(actions.canDefend).toBe(true);
    d.reject({ kind: 'BattleUseAbility', stackId: enemy.id, abilityId: 'family_ward', targetId: ally.id });
    expect(b.sides.attacker.familyChargesUsed[caster.familyId] ?? 0).toBe(0);
  });
  it('weakens retaliation previews and consumes one of two charges on each actual response', () => {
    const { d, ally, enemy } = battle();
    ally.anchor = { col: 3, row: 3 }; enemy.anchor = { col: 4, row: 3 };
    enemy.totalHp = 1000;
    const before = previewRetaliation(d.catalog, d.state, ally.id, enemy.id)!;
    d.do(cast('spell2_oathbound_spear', enemy));
    const after = previewRetaliation(d.catalog, d.state, ally.id, enemy.id)!;
    expect(after.max).toBeLessThan(before.max);
    d.do({ kind: 'BattleMelee', stackId: ally.id, targetId: enemy.id, from: ally.anchor });
    expect(d.state.battle!.stacks[enemy.id]!.statuses.find((s) => s.kind === 'retaliation_weaken')!.charges).toBe(1);
  });
  it('returns thorn damage once without recursively triggering the attacker’s own thorns', () => {
    const { d, ally, enemy } = battle();
    ally.anchor = { col: 3, row: 3 }; enemy.anchor = { col: 4, row: 3 };
    enemy.totalHp = 1000; ally.totalHp = 1000;
    const thorn = { sourceId: 'spell:spell2_briar_debt', label: 'Briar Debt', kind: 'one_hit_thorns' as const, amount: 20, numerator: 1, denominator: 1, expiresAtRound: 3 };
    ally.statuses = [{ ...thorn }]; enemy.statuses = [{ ...thorn }];
    enemy.retaliationsUsed = 99; // Isolate the primary hit and its reflected damage.
    d.do({ kind: 'BattleMelee', stackId: ally.id, targetId: enemy.id, from: ally.anchor });
    expect(d.state.battle!.stacks[ally.id]!.totalHp).toBe(980);
    expect(d.state.battle!.stacks[ally.id]!.statuses.some((s) => s.kind === 'one_hit_thorns')).toBe(true);
    expect(d.state.battle!.stacks[enemy.id]!.statuses.some((s) => s.kind === 'one_hit_thorns')).toBe(false);
  });
  it('keeps a ranged lock through Wait, ends it after Defend and protects one recovery activation', () => {
    const { d, enemy } = battle();
    enemy.creatureId = 'peltast'; enemy.shotsRemaining = 8;
    d.do(cast('spell2_siren_refrain', enemy));
    const b = d.state.battle!;
    b.stacks['other-defender'] = { ...structuredClone(b.stacks[enemy.id]!), id: 'other-defender', statuses: [], anchor: { col: 12, row: 6 } };
    b.activeStackId = enemy.id; b.stacks[enemy.id]!.side = 'attacker'; // Drive the affected stack as the human for this timing test.
    expect(legalActions(d.catalog, d.state)!.shootBlockedReason).toContain('sealed');
    d.do({ kind: 'BattleWait', stackId: enemy.id });
    expect(d.state.battle!.stacks[enemy.id]!.statuses.some((s) => s.kind === 'ranged_lock')).toBe(true);
    d.state.battle!.activeStackId = enemy.id;
    for (const s of d.state.battle!.stacks[enemy.id]!.statuses) s.nextActivationStarted = true;
    d.do({ kind: 'BattleDefend', stackId: enemy.id });
    const recovered = d.state.battle!.stacks[enemy.id]!;
    expect(recovered.statuses.some((s) => s.kind === 'ranged_lock')).toBe(false);
    expect(recovered.controlGrace).toContain('ranged_lock');
    recovered.side = 'defender';
    const ally = Object.values(d.state.battle!.stacks).find((s) => s.side === 'attacker')!;
    d.state.battle!.activeStackId = ally.id; d.state.battle!.sides.attacker.castThisRound = false;
    expect(d.reject(cast('spell2_siren_refrain', recovered)).message).toContain('recovery');
  });
  it('blocks one hostile debuff without consuming the ward on damage or a friendly buff', () => {
    const { d, ally } = battle();
    d.do(cast('spell2_runes_refusal', ally));
    const b = d.state.battle!, target = b.stacks[ally.id]!;
    const s = { sourceId: 'spell:weakness', label: 'Weakness', kind: 'attack_bonus' as const, amount: -2, numerator: 1, denominator: 1, expiresAtRound: 3 };
    applyStatus(target, { ...s, sourceId: 'spell:inspiration', amount: 2 }, { battle: b, casterSide: 'attacker' });
    expect(target.statuses.some((s) => s.kind === 'debuff_ward')).toBe(true);
    applyStatus(target, s, { battle: b, casterSide: 'defender' });
    expect(target.statuses.map((s) => s.sourceId)).toEqual(['spell:inspiration']);
    applyStatus(target, s, { battle: b, casterSide: 'defender' });
    expect(target.statuses.some((s) => s.sourceId === 'spell:weakness' && s.amount === -2)).toBe(true);
  });
  it('suppresses only positive spell Attack and positive Luck for one activation', () => {
    const { d, enemy } = battle();
    const b = d.state.battle!;
    b.sides.defender.commander = { ...b.sides.attacker.commander!, luck: 3, attack: 6 };
    const status = { label: 'Power', kind: 'attack_bonus' as const, numerator: 1, denominator: 1, expiresAtRound: 5 };
    enemy.statuses = [{ ...status, sourceId: 'spell:power', amount: 5 }, { ...status, sourceId: 'artifact:power', amount: 4 }];
    const before = effectiveAttack(d.catalog, b, enemy);
    d.do(cast('spell2_feathers_verdict', enemy));
    const after = d.state.battle!;
    expect(effectiveAttack(d.catalog, after, after.stacks[enemy.id]!)).toBe(before - 3);
    expect(effectiveLuck(d.catalog, after, after.stacks[enemy.id]!)).toBe(0);
    expect(after.stacks[enemy.id]!.statuses.find((s) => s.sourceId === 'artifact:power')!.amount).toBe(4);
  });
  it('cleanses army-wide mind spells but leaves slows, traits and protected controls intact', () => {
    const { d, ally, shooter } = battle();
    d.reject(cast('spell2_uzumes_dawn', ally));
    const lock = { sourceId: 'spell:refrain', label: 'Refrain', kind: 'ranged_lock' as const, amount: 1, numerator: 1, denominator: 1, expiresAtRound: 5, hostile: true };
    ally.statuses = [{ ...lock }, { ...lock, sourceId: 'spell:slow', kind: 'speed_bonus', amount: -2 }];
    shooter.statuses = [{ ...lock }, { ...lock, sourceId: 'spell:protected', dispellable: false }];
    d.do(cast('spell2_uzumes_dawn', ally));
    expect(d.state.battle!.stacks[ally.id]!.statuses.map((s) => s.sourceId)).toEqual(['spell:slow']);
    expect(d.state.battle!.stacks[shooter.id]!.statuses.map((s) => s.sourceId)).toEqual(['spell:protected']);
  });
  it('temporary flight crosses an obstacle but never lands on one, and still spends only normal movement range', () => {
    const { d, ally } = battle();
    const b = d.state.battle!;
    ally.anchor = { col: 2, row: 3 };
    b.obstacles = Array.from({ length: b.rows }, (_, row) => ({ col: 3, row }));
    expect([...reachableAnchors(d.catalog, b, ally).values()].some((n) => n.cell.col > 3)).toBe(false);
    d.do(cast('spell2_daedalus_passage', ally));
    const reach = [...reachableAnchors(d.catalog, d.state.battle!, d.state.battle!.stacks[ally.id]!).values()];
    expect(reach.some((n) => n.cell.col > 3)).toBe(true);
    expect(reach.some((n) => n.cell.col === 3)).toBe(false);
    expect(Math.max(...reach.map((n) => n.dist))).toBeLessThanOrEqual(statsOf(d.catalog, ally.creatureId).speed);
  });
  it('respects explicit mind immunity and does not infer it from a creature picture', () => {
    const { d, enemy } = battle();
    enemy.creatureId = 'peltast';
    const catalog = { ...d.catalog, creatures: { ...d.catalog.creatures, peltast: { ...d.catalog.creatures.peltast!, traits: ['mind_immune' as const] } } };
    const effect = d.catalog.spells.spell2_siren_refrain!.effect;
    expect(utilitySpellReason(catalog, d.state, d.state.battle!, 'attacker', effect, enemy)).toContain('immune');
    expect(utilitySpellReason(d.catalog, d.state, d.state.battle!, 'attacker', effect, enemy)).toBeNull();
  });
  it('opens advanced native shelves only in opted-in final Sanctums', () => {
    const { d } = battle();
    const town = Object.values(d.state.towns).find((t) => t.pantheonId === 'greek')!;
    town.buildings.mage_guild = 3;
    expect(townSpellLibraryTier(d.catalog, town, d.state)).toBe(5);
    expect(townLibrarySpells(d.catalog, d.state, town)).toContain('spell2_daedalus_passage');
    expect(townLibrarySpells(d.catalog, d.state, town)).not.toContain('spell2_runes_refusal');
    d.state.scenario.features!.mythicLibraryV2 = false;
    expect(townSpellLibraryTier(d.catalog, town, d.state)).toBe(3);
    expect(townLibrarySpells(d.catalog, d.state, town).some((id) => id.startsWith('spell2_'))).toBe(false);
  });
  it('dispel requires an explicit valid choice when several spells apply and leaves innate/protected effects intact', () => {
    const { d, enemy } = battle();
    const buff = { label: 'Ward', kind: 'defense_bonus' as const, amount: 2, numerator: 1, denominator: 1, expiresAtRound: 4, hostile: false };
    enemy.statuses = [
      { ...buff, sourceId: 'spell:a' }, { ...buff, sourceId: 'spell:b', label: 'Blessing' },
      { ...buff, sourceId: 'ability:innate' }, { ...buff, sourceId: 'spell:protected', dispellable: false },
    ];
    d.reject(cast('spell2_unweave', enemy));
    d.reject({ ...cast('spell2_unweave', enemy), statusSourceId: 'ability:innate' });
    d.reject({ ...cast('spell2_unweave', enemy), statusSourceId: 'spell:protected' });
    expect(d.state.heroes.alexios!.mana).toBe(100);
    d.do({ ...cast('spell2_unweave', enemy), statusSourceId: 'spell:b' });
    expect(d.state.battle!.stacks[enemy.id]!.statuses.map((s) => s.sourceId)).toEqual(['spell:a', 'ability:innate', 'spell:protected']);
    expect(d.state.heroes.alexios!.mana).toBe(92);
  });
  it('cleanse removes one hostile spell, not wounds or friendly enchantments', () => {
    const { d, ally } = battle();
    const hp = ally.totalHp;
    ally.statuses = [
      { sourceId: 'spell:weakness', label: 'Weakness', kind: 'attack_bonus', amount: -3, numerator: 1, denominator: 1, expiresAtRound: 3 },
      { sourceId: 'spell:ward', label: 'Ward', kind: 'defense_bonus', amount: 2, numerator: 1, denominator: 1, expiresAtRound: 3, hostile: false },
    ];
    d.do({ ...cast('spell2_clear_mind', ally), statusSourceId: 'spell:weakness' });
    expect(d.state.battle!.stacks[ally.id]!.statuses.map((s) => s.sourceId)).toEqual(['spell:ward']);
    expect(d.state.battle!.stacks[ally.id]!.totalHp).toBe(hp);
    expect(d.state.heroes.alexios!.mana).toBe(93);
  });
  it('keeps the new pool off in old expanded saves and rejects injected known spells without charging', () => {
    const { d, shooter } = battle();
    d.state.scenario.features = { expandedContent: true, weeklyEvents: false, interventions: true };
    expect(scopeAllowed(d.state, 'mythic_library_v2')).toBe(false);
    expect(legalActions(d.catalog, d.state).spells).toHaveLength(0);
    d.reject(cast('spell2_hazels_recall', shooter));
    expect(d.state.heroes.alexios!.mana).toBe(100);
  });
  it('restores only missing finite shots, consumes the commander action, and survives reload/split', () => {
    const { d, shooter } = battle();
    const cap = statsOf(d.catalog, shooter.creatureId).shots;
    shooter.shotsRemaining = cap - 1;
    const active = d.state.battle!.activeStackId;
    const hp = shooter.totalHp;
    d.do(cast('spell2_hazels_recall', shooter));
    expect(d.state.battle!.stacks[shooter.id]!.shotsRemaining).toBe(cap);
    expect(d.state.battle!.stacks[shooter.id]!.totalHp).toBe(hp);
    expect(d.state.heroes.alexios!.mana).toBe(93);
    expect(d.state.battle!.activeStackId).toBe(active);
    expect(d.state.battle!.sides.attacker.castThisRound).toBe(true);
    d.state = JSON.parse(JSON.stringify(d.state));
    const b = d.state.battle!;
    b.sides.attacker.castThisRound = false;
    const split = { ...b.stacks[shooter.id]!, id: 'split-copy', shotsRemaining: 0 };
    b.stacks[split.id] = split;
    expect(d.reject(cast('spell2_hazels_recall', split)).message).toContain('original stack');
    expect(d.state.heroes.alexios!.mana).toBe(93);
  });
  it('rejects full quivers and renewable sea attacks before cost and allows only legal UI targets', () => {
    const { d, shooter, ally } = battle();
    d.reject(cast('spell2_hazels_recall', shooter));
    shooter.creatureId = Object.values(d.catalog.creatures).find((c) => c.abilityIds.some((id) => d.catalog.abilities[id]?.rule.type === 'renewable_shots'))!.id;
    shooter.shotsRemaining = 0;
    d.reject(cast('spell2_hazels_recall', shooter));
    d.reject(cast('spell2_hazels_recall', ally));
    expect(legalActions(d.catalog, d.state).spells.find((s) => s.spellId === 'spell2_hazels_recall')!.targets).toEqual([]);
    expect(d.state.heroes.alexios!.mana).toBe(100);
  });
  it('returns one spent retaliation without creating capacity or an activation', () => {
    const { d, ally } = battle();
    d.reject(cast('spell2_second_guard', ally));
    ally.retaliationsUsed = 1;
    d.do(cast('spell2_second_guard', ally));
    expect(d.state.battle!.stacks[ally.id]!.retaliationsUsed).toBe(0);
    expect(d.state.battle!.activeStackId).toBe(ally.id);
    d.state.battle!.sides.attacker.castThisRound = false;
    d.reject(cast('spell2_second_guard', d.state.battle!.stacks[ally.id]!));
    expect(d.state.heroes.alexios!.mana).toBe(92);
  });
  it('requires a real enemy hero, caps mana drain, never refunds the caster and remembers the side quota', () => {
    const { d, enemy } = battle();
    d.reject(cast('spell2_cinder_siphon', enemy));
    const hero = structuredClone(d.state.heroes.alexios!);
    hero.id = 'enemy-hero'; hero.ownerId = 'hostile'; hero.mana = 2;
    d.state.heroes[hero.id] = hero;
    d.state.battle!.sides.defender.commander = { ...d.state.battle!.sides.attacker.commander!, heroId: hero.id };
    d.do(cast('spell2_cinder_siphon', enemy));
    expect(d.state.heroes[hero.id]!.mana).toBe(0);
    expect(d.state.heroes.alexios!.mana).toBe(88);
    d.state = JSON.parse(JSON.stringify(d.state));
    d.state.battle!.sides.attacker.castThisRound = false;
    d.state.heroes[hero.id]!.mana = 20;
    expect(d.reject(cast('spell2_cinder_siphon', enemy)).message).toContain('already drained');
    expect(d.state.heroes[hero.id]!.mana).toBe(20);
  });
});
