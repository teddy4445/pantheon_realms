import { describe, expect, it } from 'vitest';
import { GameDriver, navalDriver, cellIn } from '@pr/testing';
import { interventionsFor, quoteIntervention, legalActions, previewEngineStrike, previewStrike, applyStatus, quoteDisembark, movementBudget, canonicalStateHash, Tx } from '../src';
import { buildSiegeEngine, damageEngine } from '../src/systems/battle/engine';
import { consumeLastCreatureGuard, previewLastCreatureGuard, relicSpellDamage } from '../src/systems/battle/libraryRelics';

function setup(pantheonId: string, god: string) {
  const d = GameDriver.mission('three_beacons_m01');
  d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true, interventions: true };
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 8, r: 7 } });
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 10, r: 7 }, confirmEncounter: true });
  const b = d.state.battle!, player = d.state.players[b.sides.attacker.playerId!]!;
  player.pantheonId = pantheonId; player.pantheon.patronGodId = god; player.wallet.favor = 100;
  const ally = Object.values(b.stacks).find((s) => s.side === 'attacker')!;
  const enemy = Object.values(b.stacks).find((s) => s.side === 'defender')!;
  b.activeStackId = ally.id;
  b.sides.attacker.commander!.spellbook = false;
  return { d, b, player, ally, enemy };
}
const invoke = (id: string, targetId?: string) => ({ kind: 'BattleInvokeIntervention' as const, interventionId: id, ...(targetId ? { targetId } : {}) });

describe('Mythic Library god commitments and battle blessings', () => {
  it('Athena swaps two valid deployment stacks before any allied action and cannot be invoked after Wait', () => {
    const { d, b, ally } = setup('greek', 'athena');
    const other = Object.values(b.stacks).find((s) => s.side === ally.side && s.id !== ally.id)!;
    ally.anchor = { col: 1, row: 2 }; other.anchor = { col: 1, row: 5 };
    const a = { ...ally.anchor }, o = { ...other.anchor };
    d.reject(invoke('blessing2_athenas_order', ally.id));
    d.do({ ...invoke('blessing2_athenas_order', ally.id), secondTargetId: other.id });
    expect(d.state.battle!.stacks[ally.id]!.anchor).toEqual(o);
    expect(d.state.battle!.stacks[other.id]!.anchor).toEqual(a);
    const again = setup('greek', 'athena');
    again.d.do({ kind: 'BattleWait', stackId: again.ally.id });
    again.d.state.battle!.activeStackId = again.ally.id;
    expect(quoteIntervention(again.d.catalog, again.d.state, again.player.id, 'blessing2_athenas_order', { stackId: again.ally.id }).legal).toBe(false);
  });
  it('True Dawn clears fear and blindness but leaves slows, then blocks one new control per living stack', () => {
    const { d, ally } = setup('japanese', 'japanese_amaterasu');
    const status = { sourceId: 'spell:blindness', label: 'Blind', kind: 'blind' as const, amount: 1, numerator: 1, denominator: 1, expiresAtRound: 5, hostile: true };
    ally.statuses = [status, { ...status, sourceId: 'spell:slow', kind: 'speed_bonus', amount: -2 }];
    d.do(invoke('blessing2_amaterasus_true_dawn'));
    const b = d.state.battle!, t = b.stacks[ally.id]!;
    expect(t.statuses.map((s) => s.kind)).toEqual(['speed_bonus', 'mind_control_ward']);
    applyStatus(t, status, { battle: b, casterSide: 'defender' });
    expect(t.statuses.map((s) => s.kind)).toEqual(['speed_bonus']);
    applyStatus(t, status, { battle: b, casterSide: 'defender' });
    expect(t.statuses.some((s) => s.kind === 'blind')).toBe(true);
  });
  it('Mercy extinguishes fire DOT and absorbs only fire/water spell HP, retaining unused capacity after reload', () => {
    const { d, ally } = setup('mesoamerican', 'mesoamerican_chalchiuhtlicue');
    ally.statuses = [{ sourceId: 'spell:fire', label: 'Burning', kind: 'fire_dot', amount: 5, numerator: 1, denominator: 1, expiresAtRound: 5 }];
    d.do(invoke('blessing2_chalchiuhtlicues_mercy', ally.id));
    d.state = JSON.parse(JSON.stringify(d.state));
    const b = d.state.battle!, t = b.stacks[ally.id]!;
    expect(t.statuses.some((s) => s.kind === 'fire_dot')).toBe(false);
    const spell = { ...d.catalog.spells.spell2_briar_debt!, effect: { type: 'direct_damage' as const, base: 1, perPower: 0 } };
    expect(relicSpellDamage(b, { ...spell, element: 'nature' }, 'defender', t, 30)).toBe(30);
    expect(relicSpellDamage(b, { ...spell, element: 'fire' }, 'defender', t, 30)).toBe(0);
    expect(relicSpellDamage(b, { ...spell, element: 'water' }, 'defender', t, 30)).toBe(20);
    expect(t.statuses.some((s) => s.kind === 'element_barrier')).toBe(false);
  });
  it('requires the feature and a real commitment, validates before payment, and shares the weekly and cast allowance without a spellbook', () => {
    const { d, b, player, ally, enemy } = setup('norse', 'norse_tyr');
    const id = 'blessing2_tyrs_equal_ground';
    expect(interventionsFor(d.catalog, d.state, player.id).some((x) => x.id === id)).toBe(true);
    d.state.scenario.features!.mythicLibraryV2 = false;
    expect(quoteIntervention(d.catalog, d.state, player.id, id, { stackId: ally.id }).legal).toBe(false);
    d.state.scenario.features!.mythicLibraryV2 = true;
    player.pantheon.patronGodId = 'norse_odin';
    expect(quoteIntervention(d.catalog, d.state, player.id, id, { stackId: ally.id }).legal).toBe(false);
    player.pantheon.minorGodIds = ['norse_tyr'];
    d.reject(invoke(id, enemy.id));
    expect(d.state.players[player.id]!.wallet.favor).toBe(100);
    expect(d.state.battle!.sides.attacker.castThisRound).toBe(false);
    d.do(invoke(id, ally.id));
    expect(d.state.players[player.id]!.wallet.favor).toBe(88);
    expect(d.state.battle!.sides.attacker.castThisRound).toBe(true);
    expect(d.state.battle!.stacks[ally.id]!.statuses[0]!.dispellable).toBe(false);
    d.state = JSON.parse(JSON.stringify(d.state));
    d.state.battle!.sides.attacker.castThisRound = false;
    expect(quoteIntervention(d.catalog, d.state, player.id, id, { stackId: ally.id }).reason).toContain('once per week');
    expect(b.sides.attacker.commander!.spellbook).toBe(false);
  });
  it('applies Thoth credit on a later round only, consumes it once, and never creates mana', () => {
    const { d, b, ally } = setup('egyptian', 'egyptian_thoth');
    b.sides.attacker.commander!.spellbook = true;
    b.sides.attacker.commander!.knownSpellIds = ['spell2_runes_refusal'];
    d.state.heroes.alexios!.mana = 20;
    d.do(invoke('blessing2_thoths_reckoning'));
    d.reject({ kind: 'BattleCastSpell', spellId: 'spell2_runes_refusal', targetId: ally.id });
    d.state.battle!.round++; d.state.battle!.sides.attacker.castThisRound = false;
    expect(legalActions(d.catalog, d.state)!.spells.find((s) => s.spellId === 'spell2_runes_refusal')!.manaCost).toBe(6);
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_runes_refusal', targetId: ally.id });
    expect(d.state.heroes.alexios!.mana).toBe(14);
    expect(d.state.battle!.sides.attacker.spellCredit).toBeUndefined();
  });
  it('protects only the last original fragment from a fatal physical hit and survives serialization', () => {
    const { d, ally } = setup('norse', 'norse_frigg');
    d.do(invoke('blessing2_friggs_watched_return', ally.id));
    d.state = JSON.parse(JSON.stringify(d.state));
    const b = d.state.battle!, target = b.stacks[ally.id]!;
    const fragment = { ...structuredClone(target), id: 'fragment', totalHp: 10 };
    b.stacks.fragment = fragment;
    expect(previewLastCreatureGuard(b, target, target.totalHp + 20)).toBe(target.totalHp + 20);
    target.totalHp = 0;
    expect(previewLastCreatureGuard(b, fragment, 50)).toBe(9);
    expect(consumeLastCreatureGuard(b, fragment, 50)).toBe(9);
    expect(consumeLastCreatureGuard(b, fragment, 50)).toBe(50);
    expect(target.statuses.some((s) => s.kind === 'last_creature_guard')).toBe(false);
  });
  it('pierces commander and spell defense while preserving base and artifact defense', () => {
    const { d, b, ally, enemy } = setup('norse', 'norse_tyr');
    b.sides.defender.commander = { ...b.sides.attacker.commander!, defense: 12, defenseWithoutArtifacts: 2 };
    enemy.statuses = [{ sourceId: 'spell:defense', kind: 'defense_bonus', label: 'Ward', amount: 2, numerator: 1, denominator: 1, expiresAtRound: 5 }];
    const before = previewStrike(d.catalog, b, ally, enemy, { mode: 'melee', chargeHexes: 0 });
    d.do(invoke('blessing2_tyrs_equal_ground', ally.id));
    const next = d.state.battle!;
    const after = previewStrike(d.catalog, next, next.stacks[ally.id]!, next.stacks[enemy.id]!, { mode: 'melee', chargeHexes: 0 });
    expect(after.notes).toContain('Ignores 4 borrowed Defense');
    expect(after.max).toBeGreaterThanOrEqual(before.max);
    const retaliate = previewStrike(d.catalog, next, next.stacks[ally.id]!, next.stacks[enemy.id]!, { mode: 'retaliation', chargeHexes: 0 });
    expect(retaliate.notes.some((n) => n.includes('borrowed'))).toBe(false);
  });
  it('refuses Sobek on dry land without charging Favor', () => {
    const { d, ally, player } = setup('egyptian', 'egyptian_sobek');
    expect(d.reject(invoke('blessing2_sobeks_river_oath', ally.id)).message).toContain('naval or marsh');
    expect(d.state.players[player.id]!.wallet.favor).toBe(100);
  });
  it('repairs a surviving catapult, quotes its barrier, consumes it on one hit, and cannot rebuild a wreck', () => {
    const { d, b, player, enemy } = setup('celtic', 'celtic_brigid');
    const engine = buildSiegeEngine(d.catalog.rulesProfile);
    b.siege = { townId: 'test', fortificationLevel: 1, structures: [], engine } as typeof b.siege;
    engine.hp = 0;
    expect(quoteIntervention(d.catalog, d.state, player.id, 'blessing2_brigids_unbroken_work').legal).toBe(false);
    engine.hp = engine.maxHp - 10;
    d.do(invoke('blessing2_brigids_unbroken_work'));
    const next = d.state.battle!, repaired = next.siege!.engine!;
    expect(repaired.hp).toBe(repaired.maxHp);
    const guarded = previewEngineStrike(d.catalog, next, next.stacks[enemy.id]!, repaired, { mode: 'melee', chargeHexes: 0 });
    const unguarded = previewEngineStrike(d.catalog, next, next.stacks[enemy.id]!, { ...repaired, barrier: undefined }, { mode: 'melee', chargeHexes: 0 });
    expect(guarded.min).toBe(Math.max(0, unguarded.min - 20));
    const tx = new Tx({ catalog: d.catalog }, d.state, player.id);
    damageEngine(tx, next, repaired, 10, { attackerId: enemy.id, source: 'melee' });
    expect(repaired.hp).toBe(repaired.maxHp);
    expect(repaired.barrier).toBeUndefined();
    damageEngine(tx, next, repaired, 10, { attackerId: enemy.id, source: 'melee' });
    expect(repaired.hp).toBe(repaired.maxHp - 10);
  });
});


describe('naval blessings', () => {
  function afloat(pantheonId: string, godId: string) {
    const d = navalDriver();
    d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true, interventions: true };
    const h = d.state.heroes.leader_1!;
    h.position = cellIn(d.state, 9, 8);
    d.do({ kind: 'EmbarkHero', heroId: h.id, shipId: 'map_ship_free' });
    const p = d.state.players[h.ownerId]!;
    p.pantheonId = pantheonId; p.pantheon.patronGodId = godId; p.wallet.favor = 100;
    d.state.heroes[h.id]!.movementPoints = 100;
    return { d, heroId: h.id, ownerId: h.ownerId, land: cellIn(d.state, 9, 8) };
  }
  it('requires an owned embarked hero before spending Favor', () => {
    const { d, heroId, land } = afloat('celtic', 'celtic_manannan');
    const before = canonicalStateHash(d.state);
    d.reject({ kind: 'InvokeIntervention', interventionId: 'blessing2_manannans_safe_landing', heroId: 'leader_2' });
    expect(canonicalStateHash(d.state)).toBe(before);
    d.do({ kind: 'InvokeIntervention', interventionId: 'blessing2_manannans_safe_landing', heroId });
    const expected = Math.min(100, Math.floor(movementBudget(d.catalog, d.state, d.state.heroes[heroId]!).total / 4));
    d.state = JSON.parse(JSON.stringify(d.state));
    expect(quoteDisembark(d.catalog, d.state, heroId, land).remaining).toBe(expected);
    d.do({ kind: 'DisembarkHero', heroId, landCoord: land });
    expect(d.state.heroes[heroId]!.movementPoints).toBe(expected);
    expect(d.state.heroes[heroId]!.libraryAdventure?.safeLanding).toBeUndefined();
  });
  it('does not create movement and expires at dawn', () => {
    const { d, heroId, land } = afloat('celtic', 'celtic_manannan');
    d.do({ kind: 'InvokeIntervention', interventionId: 'blessing2_manannans_safe_landing', heroId });
    d.state.heroes[heroId]!.movementPoints = 50;
    expect(quoteDisembark(d.catalog, d.state, heroId, land).remaining ?? 0).toBeLessThanOrEqual(50);
    d.state.day++;
    expect(quoteDisembark(d.catalog, d.state, heroId, land).remaining ?? 0).toBe(0);
  });
  it('attaches Mooring to the existing vessel and records its owner, hero and expiry', () => {
    const { d, heroId, ownerId } = afloat('greek', 'poseidon');
    d.do({ kind: 'InvokeIntervention', interventionId: 'blessing2_poseidons_mooring', heroId });
    expect(d.state.world.ships!.map_ship_free!.mooring).toEqual({ untilDay: d.state.day + 1, ownerId, heroId });
    expect(Object.keys(d.state.world.ships!)).toEqual(['map_ship_free']);
    expect(d.state.players[ownerId]!.wallet.favor).toBe(88);
  });
});


describe('Xolotl reactive displacement', () => {
  it('pauses for the marked army owner, preserves the paid spell after reload and rejects unrelated orders', () => {
    const {d,b,ally,enemy}=setup('mesoamerican','mesoamerican_xolotl');
    ally.anchor={col:4,row:3};enemy.anchor={col:7,row:3};b.obstacles=[];
    d.do(invoke('blessing2_xolotls_faithful_shadow',ally.id));
    const live=d.state.battle!;
    live.sides.defender.commander={...structuredClone(live.sides.attacker.commander!),heroId:null,spellbook:true,knownSpellIds:['spell2_tide_pearl_turn']};
    live.sides.defender.scriptedMana=100;live.activeStackId=enemy.id;
    const before={...live.stacks[ally.id]!.anchor};
    d.do({kind:'BattleCastSpell',spellId:'spell2_tide_pearl_turn',targetId:ally.id,destination:{col:5,row:3}},'__neutral__');
    expect(d.state.battle!.shadowChoice!.stackId).toBe(ally.id);
    expect(d.state.battle!.sides.defender.scriptedMana).toBe(91);
    expect(d.state.battle!.stacks[ally.id]!.anchor).toEqual(before);
    const hash=canonicalStateHash(d.state);d.reject({kind:'BattleDefend',stackId:enemy.id},'__neutral__');expect(canonicalStateHash(d.state)).toBe(hash);
    d.state=JSON.parse(JSON.stringify(d.state));
    const to=d.state.battle!.shadowChoice!.options[0]!;
    d.reject({kind:'BattleResolveShadow',to},'__neutral__');
    d.do({kind:'BattleResolveShadow',to});
    expect(d.state.battle!.shadowChoice).toBeUndefined();expect(d.state.battle!.stacks[ally.id]!.anchor).toEqual(to);
    expect(d.state.battle!.activeStackId).toBe(enemy.id); // commander cast did not spend its creature action
    expect(d.state.battle!.sides.defender.scriptedMana).toBe(91);
  });
  it('defers the puller activation until the shadow choice and never spends its ability twice', () => {
    const {d,b,ally,enemy}=setup('mesoamerican','mesoamerican_xolotl');
    ally.anchor={col:4,row:3};enemy.anchor={col:6,row:3};b.obstacles=[];
    const snarer=Object.values(d.catalog.creatures).find(c=>c.abilityIds.includes('neutral_tail_snare'))!;
    enemy.creatureId=snarer.id;
    d.do(invoke('blessing2_xolotls_faithful_shadow',ally.id));d.state.battle!.activeStackId=enemy.id;
    d.do({kind:'BattleUseAbility',stackId:enemy.id,abilityId:'neutral_tail_snare',targetId:ally.id},'__neutral__');
    expect(d.state.battle!.shadowChoice!.resume!.stackId).toBe(enemy.id);
    const choice=d.state.battle!.shadowChoice!.options[0]!;
    d.do({kind:'BattleResolveShadow',to:choice});
    expect(d.state.battle!.shadowChoice).toBeUndefined();
    expect(d.state.battle!.stacks[ally.id]!.statuses.some(s=>s.kind==='faithful_shadow')).toBe(false);
  });
});
