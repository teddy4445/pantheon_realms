import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  equipSlotsFor,
  effectiveAttack,
  effectiveDefense,
  effectiveSpeed,
  harmonyFor,
  legalActions,
  playerEffects,
  projectedIncome,
  quoteGodSelection,
  signatureEffects,
  townDailyIncome,
  weeklyGrowthFor,
  type BattleStackState,
  type MatchState,
} from '../src';

const mission = (p: string, r = 'greek') => (p === 'greek' && r === 'greek' ? 'skirmish_twin_harbors' : `skirmish_twin_harbors_${p}_vs_${r}`);
const LEADER: Record<string, string> = {
  greek: 'alexios',
  norse: 'ragnar',
  egyptian: 'hatshepsut',
  japanese: 'yoshitsune',
  celtic: 'fionn',
  mesoamerican: 'nezahualcoyotl',
};
const RIVAL: Record<string, string> = { greek: 'rival_odysseus' };

type Army = [string, number][];
const slots = (army: Army) => [...army.map(([creatureId, count], i) => ({ stackId: `s${i}`, creatureId, count })), ...Array(7 - army.length).fill(null)];

/** A player-hero vs gold-mine-guard battle with a controlled army; returns the driver with the battle open. */
function guardBattle(pantheon: string, army: Army, guard: Army, opts: { zero?: boolean; matchId?: string } = {}) {
  const d = GameDriver.mission(mission(pantheon), { matchId: opts.matchId ?? `sig-${pantheon}` });
  const s: MatchState = d.state;
  for (const f of Object.values(s.fog)) f.explored = f.explored.map(() => 1);
  const heroId = LEADER[pantheon]!;
  const h = s.heroes[heroId]!;
  h.army.slots = slots(army);
  if (opts.zero !== false) {
    h.attributes = { attack: 0, defense: 0, power: 0, knowledge: 0 };
    h.skills = [];
  }
  const gold = d.catalog.missions[mission(pantheon)]!.sites.find((x) => x.id === 'sk_gold')!.coord;
  h.position = { q: gold.q - 1, r: gold.r };
  h.movementPoints = 5000;
  s.world.sites['sk_gold']!.guard = guard.map(([creatureId, count]) => ({ creatureId, count }));
  d.do({ kind: 'MoveHero', heroId, destination: gold, confirmEncounter: true });
  expect(d.state.battle).not.toBeNull();
  return { d, heroId };
}

const stackOf = (d: GameDriver, creatureId: string, side: 'attacker' | 'defender' = 'attacker'): BattleStackState =>
  Object.values(d.state.battle!.stacks).find((s) => s.creatureId === creatureId && s.side === side)!;

describe('pantheon signatures: data, scope and the campaign', () => {
  it('every pantheon has a signature made only of shared effects', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    for (const p of d.catalog.pantheonOrder) {
      const sig = d.catalog.pantheons[p]!.signature;
      expect(sig?.effects.length, p).toBeGreaterThan(0);
      expect(sig?.rules.length, p).toBeGreaterThan(0);
    }
  });

  it('applies in skirmish and never in The Three Beacons (documented campaign rules)', () => {
    const sk = GameDriver.mission(mission('egyptian'));
    expect(signatureEffects(sk.catalog, sk.state, 'player')).toEqual([{ type: 'casualty_recovery', percent: 20 }]);
    const camp = GameDriver.mission('three_beacons_m01');
    expect(camp.state.scenario.signatureMechanics).toBe(false);
    expect(signatureEffects(camp.catalog, camp.state, 'player')).toEqual([]);
    expect(playerEffects(camp.catalog, camp.state, 'player')).toEqual([]);
  });
});

describe('Afterlife (casualty_recovery)', () => {
  it('returns floor(20%) of each winning stack’s losses, never more, with no extra XP', () => {
    const { d, heroId } = guardBattle('egyptian', [['egyptian_sacred_scarab', 60], ['egyptian_jackal_guardian', 30]], [['hoplite', 25]]);
    d.autoBattle();
    const r = d.state.lastBattleResult!;
    expect(r.winner).toBe('attacker');
    const events = d.events.filter((e) => e.kind === 'BattleCasualtiesRecovered');
    let recoveredTotal = 0;
    for (const line of r.attacker.lines) {
      const recovered = line.recovered ?? 0;
      recoveredTotal += recovered;
      const alive = line.after - recovered;
      const losses = line.before - alive;
      expect(recovered).toBe(Math.floor((losses * 20) / 100));
      expect(line.after).toBeLessThanOrEqual(line.before);
    }
    expect(recoveredTotal).toBe(events.reduce((n, e) => n + (e.kind === 'BattleCasualtiesRecovered' ? e.count : 0), 0));
    // The persisted army matches the result lines.
    const army = d.state.heroes[heroId]!.army.slots.filter((s) => s && s.count > 0).map((s) => s!.count);
    expect(army.reduce((a, b) => a + b, 0)).toBe(r.attacker.lines.reduce((a, l) => a + l.after, 0));
    // XP counts only enemies killed (25 Hoplites x 10 HP), untouched by recovery.
    expect(r.xpAwarded[0]?.amount).toBe(250);
  });

  it('does nothing for a pantheon without recovery', () => {
    const { d } = guardBattle('japanese', [['japanese_kitsune', 60]], [['hoplite', 20]]);
    d.autoBattle();
    expect(d.state.lastBattleResult!.attacker.lines.every((l) => !l.recovered)).toBe(true);
  });
});

describe('Glory (battle_xp_percent)', () => {
  it('gives the winning Greek hero 25% more battle XP (floored)', () => {
    const { d } = guardBattle('greek', [['cavalry', 20]], [['hoplite', 13]]);
    d.autoBattle();
    // 13 Hoplites x 10 HP = 130 -> floor(130 x 1.25) = 162
    expect(d.state.lastBattleResult!.xpAwarded[0]?.amount).toBe(162);
  });
});

describe('Berserk Fury (wounded_fury)', () => {
  it('adds +2 Attack while at most half of the stack is alive', () => {
    const { d } = guardBattle('norse', [['norse_draugr', 20]], [['hoplite', 5]]);
    const b = d.state.battle!;
    const st = stackOf(d, 'norse_draugr');
    const hp = d.catalog.creatures['norse_draugr']!.stats!.hp;
    const full = effectiveAttack(d.catalog, b, st);
    st.totalHp = 11 * hp;
    expect(effectiveAttack(d.catalog, b, st)).toBe(full);
    st.totalHp = 10 * hp;
    expect(effectiveAttack(d.catalog, b, st)).toBe(full + 2);
  });
});

describe('Harmony (army_harmony)', () => {
  it('counts distinct families at battle start: 3 or more give +1 Defense to every stack', () => {
    const three = guardBattle('japanese', [['japanese_kitsune', 5], ['japanese_kappa', 5], ['japanese_tengu', 3]], [['hoplite', 5]]);
    expect(three.d.state.battle!.sides.attacker.effects?.harmony).toEqual({ families: 3, attack: 0, defense: 1 });
    const two = guardBattle('japanese', [['japanese_kitsune', 5], ['japanese_kappa', 5]], [['hoplite', 5]], { matchId: 'sig-jp2' });
    expect(two.d.state.battle!.sides.attacker.effects?.harmony).toBeNull();
    // Harmony changes the effective stats every screen and the AI read.
    const b3 = three.d.state.battle!;
    const k3 = stackOf(three.d, 'japanese_kitsune');
    const k2 = stackOf(two.d, 'japanese_kitsune');
    expect(effectiveAttack(three.d.catalog, b3, k3) - effectiveAttack(two.d.catalog, two.d.state.battle!, k2)).toBe(0);
    expect(effectiveDefense(three.d.catalog, b3, k3) - effectiveDefense(two.d.catalog, two.d.state.battle!, k2)).toBe(1);
  });

  it('with several thresholds, the highest one met applies (any content may define steps)', () => {
    const steps = [
      { families: 3, attack: 0, defense: 1 },
      { families: 5, attack: 1, defense: 1 },
    ];
    expect(harmonyFor(steps, 2)).toBeNull();
    expect(harmonyFor(steps, 4)).toEqual(steps[0]);
    expect(harmonyFor(steps, 7)).toEqual(steps[1]);
  });

  it('splitting one family into many stacks does not count as harmony', () => {
    const { d } = guardBattle('japanese', [['japanese_kitsune', 5], ['japanese_kitsune', 5], ['japanese_kitsune', 5], ['japanese_kappa', 5]], [['hoplite', 5]]);
    expect(d.state.battle!.sides.attacker.effects?.harmony).toBeNull();
  });
});

describe('Shapeshifting (shapeshift ability + free_shapeshift)', () => {
  function activate(d: GameDriver, creatureId: string) {
    for (let i = 0; i < 30; i++) {
      const b = d.state.battle!;
      const active = b.activeStackId ? b.stacks[b.activeStackId] : null;
      if (active?.creatureId === creatureId && active.side === 'attacker') return active;
      if (active?.side === 'defender' || !active) d.autoBattleStep();
      else d.do({ kind: 'BattleDefend', stackId: active.id });
    }
    throw new Error(`${creatureId} never activated`);
  }

  it('is free once per activation for Celtic armies, then costs the activation', () => {
    const { d } = guardBattle('celtic', [['celtic_pooka', 20]], [['hoplite', 30]]);
    const st = activate(d, 'celtic_pooka');
    const la = legalActions(d.catalog, d.state)!;
    const shift = la.abilities.find((a) => a.abilityId === 'shapeshift_hare')!;
    expect(shift).toMatchObject({ free: true, targets: [st.id], label: 'Take Hare aspect' });
    const speed = effectiveSpeed(d.catalog, st, d.state.battle!);
    const def = effectiveDefense(d.catalog, d.state.battle!, st);
    d.do({ kind: 'BattleUseAbility', stackId: st.id, abilityId: 'shapeshift_hare', targetId: st.id });
    // Still the same activation, now in the Hare aspect (+2 Speed, -1 Defense).
    const after = d.state.battle!.stacks[st.id]!;
    expect(d.state.battle!.activeStackId).toBe(st.id);
    expect(after.aspect).toBe(true);
    expect(effectiveSpeed(d.catalog, after, d.state.battle!)).toBe(speed + 2);
    expect(effectiveDefense(d.catalog, d.state.battle!, after)).toBe(def - 1);
    // A second change in the same activation is not free: it spends the activation.
    const again = legalActions(d.catalog, d.state)!.abilities.find((a) => a.abilityId === 'shapeshift_hare')!;
    expect(again.free).toBe(false);
    d.do({ kind: 'BattleUseAbility', stackId: st.id, abilityId: 'shapeshift_hare', targetId: st.id });
    expect(d.state.battle!.stacks[st.id]!.aspect).toBe(false);
    expect(d.state.battle?.activeStackId).not.toBe(st.id);
  });

  it('spends the activation for a pantheon without the rite', () => {
    const { d } = guardBattle('greek', [['celtic_pooka', 20]], [['hoplite', 30]]);
    const st = activate(d, 'celtic_pooka');
    expect(legalActions(d.catalog, d.state)!.abilities.find((a) => a.abilityId === 'shapeshift_hare')?.free).toBe(false);
    d.do({ kind: 'BattleUseAbility', stackId: st.id, abilityId: 'shapeshift_hare', targetId: st.id });
    expect(d.state.battle?.activeStackId).not.toBe(st.id);
  });

  it('rejects targeting another stack and creatures without the ability', () => {
    const { d } = guardBattle('celtic', [['celtic_pooka', 20], ['celtic_cu_sith', 10]], [['hoplite', 30]]);
    const st = activate(d, 'celtic_pooka');
    const other = stackOf(d, 'celtic_cu_sith');
    expect(d.reject({ kind: 'BattleUseAbility', stackId: st.id, abilityId: 'shapeshift_hare', targetId: other.id }).code).toBe('illegal_target');
    expect(d.reject({ kind: 'BattleUseAbility', stackId: st.id, abilityId: 'shapeshift_rut', targetId: st.id }).code).toBe('illegal_action');
  });
});

describe('Offering (Temple rite)', () => {
  const setup = () => {
    const d = GameDriver.mission(mission('mesoamerican'));
    const town = d.state.towns['westharbor']!;
    town.buildings['pantheon_temple'] = 1;
    town.garrison.slots = slots([['mesoamerican_feathered_serpent', 40], ['mesoamerican_jaguar_spirit', 5]]);
    return { d, town };
  };

  it('turns creatures into Favor at 1 per 125 Gold, capped at 10, once per town per week', () => {
    const { d } = setup();
    const favor = d.player.wallet.favor;
    // 12 serpents x 60 = 720 Gold -> 5 Favor.
    d.do({ kind: 'MakeOffering', townId: 'westharbor', offerings: [{ army: { kind: 'garrison', townId: 'westharbor' }, slot: 0, quantity: 12 }] });
    expect(d.player.wallet.favor).toBe(favor + 5);
    expect(d.town('westharbor').garrison.slots[0]?.count).toBe(28);
    expect(d.reject({ kind: 'MakeOffering', townId: 'westharbor', offerings: [{ army: { kind: 'garrison', townId: 'westharbor' }, slot: 0, quantity: 1 }] }).code).toBe('already_done');
    // Next week the rite is available again; the cap limits a large offering to 10.
    for (let i = 0; i < 7; i++) d.endDay();
    const f2 = d.player.wallet.favor;
    d.do({ kind: 'MakeOffering', townId: 'westharbor', offerings: [{ army: { kind: 'garrison', townId: 'westharbor' }, slot: 0, quantity: d.town('westharbor').garrison.slots[0]!.count }] });
    expect(d.player.wallet.favor).toBe(f2 + 10);
  });

  it('needs a Temple, the rite, a present army, and never takes a hero’s last creature', () => {
    const { d, town } = setup();
    const hero = d.state.heroes['nezahualcoyotl']!;
    hero.army.slots = slots([['mesoamerican_jaguar_spirit', 3]]);
    expect(d.reject({ kind: 'MakeOffering', townId: 'westharbor', offerings: [{ army: { kind: 'hero', heroId: hero.id }, slot: 0, quantity: 3 }] }).code).toBe('illegal_action');
    expect(d.reject({ kind: 'MakeOffering', townId: 'westharbor', offerings: [{ army: { kind: 'garrison', townId: 'westharbor' }, slot: 0, quantity: 1 }] }).code).toBe('invalid_quantity');
    town.buildings['pantheon_temple'] = 0;
    expect(d.reject({ kind: 'MakeOffering', townId: 'westharbor', offerings: [{ army: { kind: 'garrison', townId: 'westharbor' }, slot: 0, quantity: 5 }] }).code).toBe('missing_requirement');
    const greek = GameDriver.mission('skirmish_twin_harbors');
    greek.state.towns['westharbor']!.buildings['pantheon_temple'] = 1;
    expect(greek.reject({ kind: 'MakeOffering', townId: 'westharbor', offerings: [{ army: { kind: 'garrison', townId: 'westharbor' }, slot: 0, quantity: 1 }] }).code).toBe('missing_requirement');
  });
});

describe('Training Academy', () => {
  it('sells 500 XP for 1,000 Gold to a visiting hero once per week', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    d.state.towns['westharbor']!.buildings['training_academy'] = 1;
    const gold = d.player.wallet.gold;
    d.do({ kind: 'TrainHero', townId: 'westharbor', heroId: 'alexios' });
    expect(d.hero().xp).toBe(500);
    expect(d.player.wallet.gold).toBe(gold - 1000);
    expect(d.reject({ kind: 'TrainHero', townId: 'westharbor', heroId: 'alexios' }).code).toBe('already_done');
    // Absent heroes cannot train.
    d.state.heroes['alexios']!.position = { q: 0, r: 0 };
    d.state.heroes['alexios']!.lastTrainedWeek = 0;
    expect(d.reject({ kind: 'TrainHero', townId: 'westharbor', heroId: 'alexios' }).code).toBe('not_present');
  });

  it('is outside the campaign allowlists', () => {
    const d = GameDriver.mission('three_beacons_m02');
    expect(d.reject({ kind: 'BuildStructure', townId: Object.keys(d.state.towns)[0]!, buildingId: 'training_academy' }).code).toBe('not_in_scope');
  });
});

describe('Watchtower', () => {
  it('widens the town’s vision from 3 to 8 hexes', async () => {
    const { townVisionRadius } = await import('../src');
    const d = GameDriver.mission('skirmish_twin_harbors');
    const t = d.state.towns['westharbor']!;
    expect(townVisionRadius(d.catalog, t)).toBe(3);
    t.buildings['watchtower'] = 1;
    expect(townVisionRadius(d.catalog, t)).toBe(8);
  });
});

describe('Artifact Merchant', () => {
  const setup = (matchId = 'merchant') => {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId });
    const t = d.state.towns['westharbor']!;
    t.buildings['marketplace'] = 1;
    t.buildings['civic_hall'] = 2;
    d.do({ kind: 'BuildStructure', townId: 'westharbor', buildingId: 'artifact_merchant' });
    return d;
  };

  it('stocks four distinct priced artifacts, deterministically per match and week', () => {
    const a = setup();
    const b = setup();
    const stock = a.town('westharbor').merchant!;
    expect(stock.week).toBe(1);
    expect(stock.stock).toHaveLength(4);
    expect(new Set(stock.stock).size).toBe(4);
    for (const id of stock.stock) expect(a.catalog.artifacts[id!]!.merchantPrice).toBeDefined();
    expect(b.town('westharbor').merchant).toEqual(stock);
    // Every merchant in a match offers the same weekly catalog (no town is favored).
    const e = b.state.towns['eastharbor']!;
    e.ownerId = 'player';
    e.buildings['marketplace'] = 1;
    e.buildings['civic_hall'] = 2;
    b.do({ kind: 'BuildStructure', townId: 'eastharbor', buildingId: 'artifact_merchant' });
    expect(b.town('eastharbor').merchant).toEqual(stock);
    // A new week brings a new draw (defenders keep the idle player's town through the week).
    a.state.towns['westharbor']!.garrison.slots[0] = { stackId: 'test_guard', creatureId: 'cyclops', count: 40 };
    for (let i = 0; i < 7; i++) a.endDay();
    expect(a.town('westharbor').merchant!.week).toBe(2);
  });

  it('sells to a visiting hero: pays the price, equips into a free slot, removes it from stock', () => {
    const d = setup();
    const id = d.town('westharbor').merchant!.stock[0]!;
    const def = d.catalog.artifacts[id]!;
    const gold = d.player.wallet.gold;
    d.do({ kind: 'BuyArtifact', townId: 'westharbor', heroId: 'alexios', index: 0 });
    expect(d.player.wallet.gold).toBe(gold - (def.merchantPrice!.gold ?? 0));
    expect(d.hero().equipment[equipSlotsFor(def.slot)[0]!]?.artifactId).toBe(id);
    expect(d.town('westharbor').merchant!.stock[0]).toBeNull();
    expect(d.reject({ kind: 'BuyArtifact', townId: 'westharbor', heroId: 'alexios', index: 0 }).code).toBe('not_found');
  });
});

describe('second minor-god choice', () => {
  it('needs a first commitment, Temple II and City Hall; one of three; 25 Favor', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const t = d.state.towns['westharbor']!;
    d.state.players['player']!.wallet.favor = 60;
    expect(quoteGodSelection(d.catalog, d.state, 'player', 'hermes').state).toBe('locked');
    t.buildings['pantheon_temple'] = 2;
    t.buildings['civic_hall'] = 3;
    expect(quoteGodSelection(d.catalog, d.state, 'player', 'hermes').reason).toBe('Requires your first minor-god commitment');
    d.do({ kind: 'SelectGod', godId: 'athena' });
    d.do({ kind: 'SelectGod', godId: 'hermes' });
    expect(d.player.wallet.favor).toBe(60 - 20 - 25);
    expect(quoteGodSelection(d.catalog, d.state, 'player', 'demeter').state).toBe('excluded');
    expect(quoteGodSelection(d.catalog, d.state, 'player', 'hades').state).toBe('excluded');
    // Hermes: +250 Gold per day on top of town income, +15% movement.
    const income = projectedIncome({ catalog: d.catalog, state: d.state }, 'player');
    expect(income.gold).toBe(townDailyIncome(d.catalog, d.state.towns['westharbor']!).gold + 250);
  });

  it('growth blessings add to weekly growth of the matching tiers', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const t = d.state.towns['westharbor']!;
    const before = weeklyGrowthFor(d.catalog, t, 'hoplite', d.state);
    d.state.players['player']!.pantheon.minorGodIds.push('athena', 'demeter');
    expect(weeklyGrowthFor(d.catalog, t, 'hoplite', d.state)).toBe(before + 2);
    expect(weeklyGrowthFor(d.catalog, t, 'cavalry', d.state)).toBe(Math.floor(d.catalog.families['cavalry']!.baseGrowth));
  });

  it('creature_stat blessings only reach matching creatures (Horus: flyers)', () => {
    const { d } = guardBattle('egyptian', [['egyptian_bennu', 2], ['egyptian_sacred_scarab', 10]], [['hoplite', 5]], { matchId: 'horus-0' });
    const base = { bennu: effectiveAttack(d.catalog, d.state.battle!, stackOf(d, 'egyptian_bennu')), scarab: effectiveAttack(d.catalog, d.state.battle!, stackOf(d, 'egyptian_sacred_scarab')) };
    // Commit Horus through state (the battle snapshot is taken at battle start).
    const d2 = GameDriver.mission(mission('egyptian'), { matchId: 'horus-2' });
    d2.state.players['player']!.pantheon.minorGodIds.push('egyptian_set', 'egyptian_horus');
    const s = d2.state;
    for (const f of Object.values(s.fog)) f.explored = f.explored.map(() => 1);
    const h = s.heroes['hatshepsut']!;
    h.army.slots = slots([['egyptian_bennu', 2], ['egyptian_sacred_scarab', 10]]);
    h.attributes = { attack: 0, defense: 0, power: 0, knowledge: 0 };
    h.skills = [];
    const gold = d2.catalog.missions[mission('egyptian')]!.sites.find((x) => x.id === 'sk_gold')!.coord;
    h.position = { q: gold.q - 1, r: gold.r };
    h.movementPoints = 5000;
    s.world.sites['sk_gold']!.guard = [{ creatureId: 'hoplite', count: 5 }];
    d2.do({ kind: 'MoveHero', heroId: 'hatshepsut', destination: gold, confirmEncounter: true });
    const bennu = stackOf(d2, 'egyptian_bennu');
    const scarab = stackOf(d2, 'egyptian_sacred_scarab');
    // Set adds +1 commander Attack to everyone; Horus adds +1 Attack and +1 Speed to flyers only.
    expect(effectiveAttack(d2.catalog, d2.state.battle!, bennu)).toBe(base.bennu + 2);
    expect(effectiveAttack(d2.catalog, d2.state.battle!, scarab)).toBe(base.scarab + 1);
    expect(effectiveSpeed(d2.catalog, bennu, d2.state.battle!)).toBe(d2.catalog.creatures['egyptian_bennu']!.stats!.speed + 1);
    expect(effectiveSpeed(d2.catalog, scarab, d2.state.battle!)).toBe(d2.catalog.creatures['egyptian_sacred_scarab']!.stats!.speed);
  });

  it('The Three Beacons allows only Athena and Ares', () => {
    const d = GameDriver.mission('three_beacons_m02');
    expect(d.state.scenario.committableGodIds).toEqual(['athena', 'ares']);
    expect(quoteGodSelection(d.catalog, d.state, 'player', 'hermes').reason).toBe('Not available in this mission');
  });
});
