/**
 * Neutral upgrades (battle FX & neutral upgrades delivery, 2026-10-15): the six
 * expansion neutrals are base + one upgrade, hired at the family's existing
 * hiring site from ONE shared weekly stock, and a base stack trains there.
 *
 *  - RecruitFromCamp's optional `creatureId` picks the form; omitted it is the
 *    camp's listed (base) creature, so old commands, the AI and old saves are
 *    unchanged. A foreign or malformed creature ID is refused, never trusted.
 *  - Both forms consume the site's one stock (shared by every empire); the weekly
 *    reset sets it back to the weekly cap, never doubled.
 *  - TrainAtCamp converts N of the visiting hero's base stack: the price
 *    difference, no stock used, the count kept; a partial training needs a free
 *    slot or an upgraded stack; overflow is never destroyed; base and upgraded
 *    never share a stack. Movement is capped as in a town, never refilled.
 *  - A town's training never reaches a neutral family through its own dwellings.
 *  - Ordinary camps (growth restock) still hire only their listed creature.
 *  - Weekly training allowance (owner decision 2026-10-16): a site upgrades at most
 *    `weeklyTraining` (default: its weekly hiring stock) a week, all empires
 *    together, renewed each new week; the quote caps its maximum by what is left and
 *    a larger training is refused ("Its trainers can take 2 more this week (8 a
 *    week)"); a save from before has nothing trained this week.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  campForms,
  campSiteForms,
  campStock,
  campTrainedThisWeek,
  campTrainingAllowance,
  campTrainingLeft,
  hashValue,
  missionSite,
  movementBudget,
  quoteCampRecruitment,
  quoteCampTraining,
  type CreatureStackState,
  type MissionDefinition,
  type SiteDefinition,
} from '../src';

const PAIRS: readonly [string, string, number][] = [
  ['pegasus', 'dawncrest_pegasus', 75],
  ['root_runner', 'crownroot_runner', 35],
  ['serpopard', 'crested_serpopard', 70],
  ['baku', 'dreamtusk_baku', 70],
  ['afanc', 'ridgeback_afanc', 70],
  ['ahuitzotl', 'crownfin_ahuitzotl', 75],
];

const SITE = 'wo2_root_runners';

/** Hervor at the Root-Runner Grove of The Winter Oath, chapter 2 (no pact; stock 8; base 110 Gold, upgrade 145). */
function grove(army?: ([string, number] | null)[]) {
  const d = GameDriver.mission('winter_oath_v2_m02', { matchId: 'test-nu-grove' });
  const site = missionSite(d.catalog, d.state, SITE)!;
  const hero = d.hero('hervor');
  hero.position = { ...site.coord };
  if (army) hero.army.slots = army.map((x, i) => (x ? { stackId: `nu-${i}`, creatureId: x[0], count: x[1] } : null)) as (CreatureStackState | null)[];
  (d.player.wallet as Record<string, number>).gold = 10_000;
  return { d, site };
}

const slots = (d: GameDriver) => d.hero('hervor').army.slots.map((s) => (s ? [s.creatureId, s.count] : null));

describe('the six families: base + one upgrade with the delivered values', () => {
  it('each upgrade is the family’s only upgraded form, same tier, footprint, abilities and body; costs differ by the training price', () => {
    const d = GameDriver.mission('winter_oath_v2_m02');
    for (const [baseId, upId, diff] of PAIRS) {
      const base = d.catalog.creatures[baseId]!;
      const up = d.catalog.creatures[upId]!;
      const fam = d.catalog.families[baseId]!;
      expect(fam.baseCreatureId).toBe(baseId);
      expect(fam.upgradedCreatureId).toBe(upId);
      expect(fam.pantheonId).toBeNull();
      expect(fam.classification).toBe('neutral');
      expect(base.upgradeId).toBe(upId);
      expect(up.baseId).toBe(baseId);
      expect(up.form).toBe('upgraded');
      expect(up.familyId).toBe(fam.id);
      expect(up.pantheonId).toBeNull();
      expect(up.tier).toBe(base.tier);
      expect(up.stats!.footprint).toBe(base.stats!.footprint);
      expect(up.stats!.shots).toBe(0);
      expect(up.abilityIds).toEqual(base.abilityIds);
      expect(up.presentation.bodyProfile).toBe(base.presentation.bodyProfile);
      expect(up.presentation.portraitAssetId).toBe(`neutralupgrade.portrait.${upId}`);
      expect((up.cost!.gold ?? 0) - (base.cost!.gold ?? 0)).toBe(diff);
      expect(Object.keys(up.cost!)).toEqual(['gold']);
      // Pegasus alone flies.
      expect(up.abilityIds.includes('flight')).toBe(baseId === 'pegasus');
    }
    // The kit's candidate s(attack, defense, hp, [min, max], speed, shots, footprint).
    const s = (id: string) => {
      const x = d.catalog.creatures[id]!.stats!;
      return [x.attack, x.defense, x.hp, [x.damageMin, x.damageMax], x.speed, x.shots, x.footprint];
    };
    expect(s('dawncrest_pegasus')).toEqual([9, 10, 30, [4, 6], 9, 0, 2]);
    expect(s('crownroot_runner')).toEqual([7, 5, 18, [3, 4], 9, 0, 1]);
    expect(s('crested_serpopard')).toEqual([10, 7, 30, [5, 7], 7, 0, 2]);
    expect(s('dreamtusk_baku')).toEqual([6, 11, 35, [3, 5], 6, 0, 2]);
    expect(s('ridgeback_afanc')).toEqual([9, 12, 40, [4, 6], 4, 0, 2]);
    expect(s('crownfin_ahuitzotl')).toEqual([10, 8, 30, [4, 7], 7, 0, 1]);
  });

  it('every hiring site of the six hires both forms; ordinary camps (growth) only their listed creature', () => {
    const d = GameDriver.mission('winter_oath_v2_m02');
    let hiring = 0;
    for (const m of Object.values(d.catalog.missions)) {
      for (const s of m.sites) {
        if (s.kind.type !== 'creature_camp') continue;
        const forms = campSiteForms(d.catalog, s);
        const pair = PAIRS.find(([b]) => b === (s.kind as { creatureId: string }).creatureId);
        if (s.kind.restock === 'weekly' && pair) {
          hiring++;
          expect(forms, s.id).toEqual([pair[0], pair[1]]);
        } else expect(forms, s.id).toEqual([s.kind.creatureId]);
      }
    }
    expect(hiring).toBeGreaterThanOrEqual(20);
    expect(campForms(d.catalog, d.state, SITE)).toEqual(['root_runner', 'crownroot_runner']);
    expect(campSiteForms(d.catalog, missionSite(d.catalog, d.state, SITE)!)).toEqual(['root_runner', 'crownroot_runner']);
  });
});

describe('recruitment: the selected form from the one shared stock', () => {
  it('the base and the upgraded form are hired at their own prices; both draw on the site’s stock', () => {
    const { d } = grove();
    const gold = d.player.wallet.gold;
    d.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 3, creatureId: 'crownroot_runner' });
    expect(d.player.wallet.gold).toBe(gold - 3 * 145);
    expect(campStock(d.catalog, d.state, SITE)).toBe(5);
    d.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 2, creatureId: 'root_runner' });
    expect(d.player.wallet.gold).toBe(gold - 3 * 145 - 2 * 110);
    expect(campStock(d.catalog, d.state, SITE)).toBe(3);
    const army = d.hero('hervor').army.slots;
    // Two stacks: never one stack holding both forms.
    expect(army.filter((s) => s?.creatureId === 'crownroot_runner').map((s) => s!.count)).toEqual([3]);
    expect(army.filter((s) => s?.creatureId === 'root_runner').map((s) => s!.count)).toEqual([2]);
    const ev = d.events.filter((e) => e.kind === 'CampRecruited');
    expect(ev.map((e) => (e as { creatureId: string }).creatureId)).toEqual(['crownroot_runner', 'root_runner']);
    // The stock limits both forms together.
    expect(d.reject({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 4, creatureId: 'crownroot_runner' }).code).toBe('no_population');
    expect(quoteCampRecruitment(d.catalog, d.state, 'player', 'hervor', SITE, 1, 'crownroot_runner').maxQuantity).toBe(3);
  });

  it('an old command without a form hires the listed base creature, exactly as before', () => {
    const { d } = grove();
    const q = quoteCampRecruitment(d.catalog, d.state, 'player', 'hervor', SITE, 2);
    expect(q).toMatchObject({ legal: true, creatureId: 'root_runner', forms: ['root_runner', 'crownroot_runner'] });
    expect(q.unitCost.gold).toBe(110);
    d.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 2 });
    expect(d.hero('hervor').army.slots.some((s) => s?.creatureId === 'root_runner' && s.count === 2)).toBe(true);
    expect(d.hero('hervor').army.slots.some((s) => s?.creatureId === 'crownroot_runner')).toBe(false);
  });

  it('refuses another family’s creature, a pantheon creature and malformed IDs, changing nothing', () => {
    const { d } = grove();
    for (const bad of ['dawncrest_pegasus', 'pegasus', 'norse_draugr', 'centaur_sentinel', 'no_such_creature', '', 7 as unknown as string, { id: 'crownroot_runner' } as unknown as string]) {
      const r = d.reject({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 1, creatureId: bad });
      expect(r.code, String(bad)).toBe('not_recruitable');
      expect(r.message).toContain('hires only Root-Runners or Crownroot Runners');
    }
    expect(campStock(d.catalog, d.state, SITE)).toBe(8);
  });

  it('an ordinary camp hires only its listed creature: its family’s upgrade is refused', () => {
    const { d, site } = grove();
    const m = d.catalog.missions['winter_oath_v2_m02']!;
    const camp: SiteDefinition = { id: 'nu_centaurs', anchorId: 'nu_centaurs', coord: { q: site.coord.q, r: site.coord.r + 1 }, name: 'Centaur Camp', description: '', kind: { type: 'creature_camp', creatureId: 'centaur', weeklyGrowth: 4, initialStock: 6 } };
    d.state.customMission = { ...m, sites: [...m.sites, camp] } as MissionDefinition;
    d.state.world.sites[camp.id] = { siteId: camp.id, owner: null, cleared: true, claimed: false, activated: false, visitedBy: [], open: false, guard: null };
    d.hero('hervor').position = { ...camp.coord };
    expect(campForms(d.catalog, d.state, camp.id)).toEqual(['centaur']);
    expect(d.reject({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: camp.id, quantity: 1, creatureId: 'centaur_sentinel' }).code).toBe('not_recruitable');
    d.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: camp.id, quantity: 1, creatureId: 'centaur' });
    d.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: camp.id, quantity: 1 });
    expect(d.hero('hervor').army.slots.find((s) => s?.creatureId === 'centaur')!.count).toBe(2);
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: camp.id, fromCreatureId: 'centaur', quantity: 1 }).code).toBe('not_recruitable');
  });

  it('a pact not yet made locks both forms and training; presence and pending decisions are checked as before', () => {
    const d = GameDriver.mission('silent_oracle_v2_m02', { matchId: 'test-nu-pact' });
    const site = missionSite(d.catalog, d.state, 'so2_pegasus')!;
    const hero = d.hero('alexios');
    hero.position = { ...site.coord };
    hero.army.slots[5] = { stackId: 'nu-peg', creatureId: 'pegasus', count: 2 };
    (d.player.wallet as Record<string, number>).gold = 5000;
    for (const creatureId of [undefined, 'pegasus', 'dawncrest_pegasus']) {
      expect(d.reject({ kind: 'RecruitFromCamp', heroId: 'alexios', siteId: 'so2_pegasus', quantity: 1, ...(creatureId ? { creatureId } : {}) }).code).toBe('missing_requirement');
    }
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'alexios', siteId: 'so2_pegasus', fromCreatureId: 'pegasus', quantity: 1 }).code).toBe('missing_requirement');
    d.state.mission.flags['so2_bull_down'] = true;
    // A Greek hero hires the neutral upgrade (no faction lock).
    d.do({ kind: 'RecruitFromCamp', heroId: 'alexios', siteId: 'so2_pegasus', quantity: 1, creatureId: 'dawncrest_pegasus' });
    // The state is a new object after each command: move the committed hero away.
    d.state.heroes['alexios']!.position = { q: site.coord.q + 1, r: site.coord.r };
    expect(d.reject({ kind: 'RecruitFromCamp', heroId: 'alexios', siteId: 'so2_pegasus', quantity: 1, creatureId: 'dawncrest_pegasus' }).code).toBe('not_present');
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'alexios', siteId: 'so2_pegasus', fromCreatureId: 'pegasus', quantity: 1 }).code).toBe('not_present');
  });

  it('the stock is shared by every empire, and the new week resets it to the weekly cap — never doubled', () => {
    const { d, site } = grove();
    d.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 3, creatureId: 'crownroot_runner' });
    d.do({ kind: 'EndTurn' });
    expect(d.state.activePlayerId).toBe('hostile');
    const rival = Object.values(d.state.heroes).find((h) => h.ownerId === 'hostile' && h.status === 'active')!;
    rival.position = { ...site.coord };
    rival.army.slots[6] = null;
    (d.state.players['hostile']!.wallet as Record<string, number>).gold = 5000;
    // The rival sees the same stock (5 left) and hires from it; either form counts.
    expect(quoteCampRecruitment(d.catalog, d.state, 'hostile', rival.id, SITE, 1, 'root_runner').available).toBe(5);
    d.do({ kind: 'RecruitFromCamp', heroId: rival.id, siteId: SITE, quantity: 5, creatureId: 'root_runner' }, 'hostile');
    expect(campStock(d.catalog, d.state, SITE)).toBe(0);
    for (let i = 0; i < 40 && d.state.day < 8; i++) d.do({ kind: 'EndTurn' }, d.state.activePlayerId);
    expect(d.state.day).toBe(8);
    expect(campStock(d.catalog, d.state, SITE)).toBe(8);
    // Nobody hired the following week: still 8 on the next one (no accumulation, not 16).
    for (let i = 0; i < 40 && d.state.day < 15; i++) d.do({ kind: 'EndTurn' }, d.state.activePlayerId);
    expect(d.state.day).toBe(15);
    expect(campStock(d.catalog, d.state, SITE)).toBe(8);
    expect(d.events.filter((e) => e.kind === 'CampRestocked' && (e as { siteId: string }).siteId === SITE).map((e) => (e as { stock: number }).stock)).toEqual([8, 8]);
  });
});

describe('training at the hiring site', () => {
  it('trains the whole stack in place for the price difference, using no stock and keeping the count', () => {
    const { d } = grove([['norse_draugr', 10], ['root_runner', 6], null, null, null, null, null]);
    const gold = d.player.wallet.gold;
    const q = quoteCampTraining(d.catalog, d.state, 'player', 'hervor', SITE, 'root_runner', 6);
    expect(q).toMatchObject({ legal: true, fromId: 'root_runner', toId: 'crownroot_runner', slot: 1, targetSlot: 1, stackCount: 6, maxQuantity: 6 });
    expect(q.unitCost.gold).toBe(35);
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 6 });
    expect(d.player.wallet.gold).toBe(gold - 6 * 35);
    expect(slots(d)).toEqual([['norse_draugr', 10], ['crownroot_runner', 6], null, null, null, null, null]);
    expect(campStock(d.catalog, d.state, SITE)).toBe(8);
    expect(d.state.mission.counters['trained:root_runner']).toBe(6);
    const trained = d.events.filter((e) => e.kind === 'CampTrained');
    expect(trained).toHaveLength(1);
    expect(trained[0]).toMatchObject({ kind: 'CampTrained', siteId: SITE, heroId: 'hervor', fromId: 'root_runner', toId: 'crownroot_runner', quantity: 6 });
  });

  it('a partial training goes to a free slot, or joins an existing upgraded stack; the rest stay base', () => {
    const { d } = grove([['root_runner', 6], ['norse_draugr', 10], null, null, null, null, null]);
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 2 });
    expect(slots(d)).toEqual([['root_runner', 4], ['norse_draugr', 10], ['crownroot_runner', 2], null, null, null, null]);
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 3 });
    expect(slots(d)).toEqual([['root_runner', 1], ['norse_draugr', 10], ['crownroot_runner', 5], null, null, null, null]);
    // The last one: the whole (remaining) stack joins the upgraded stack and frees its slot.
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 1 });
    expect(slots(d)).toEqual([null, ['norse_draugr', 10], ['crownroot_runner', 6], null, null, null, null]);
    // Nothing left to train.
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 1 }).code).toBe('not_found');
  });

  it('a partial training with no free slot and no upgraded stack is refused; the whole stack still trains in place', () => {
    const full: ([string, number] | null)[] = [['root_runner', 5], ['norse_draugr', 1], ['norse_draugr', 2], ['norse_draugr', 3], ['norse_frost_wolf', 1], ['norse_frost_wolf', 2], ['norse_frost_wolf', 3]];
    const { d } = grove(full);
    const before = slots(d);
    const r = d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 2 });
    expect(r.code).toBe('no_capacity');
    expect(r.message).toBe('A partial training needs a free slot or an existing stack of Crownroot Runners');
    expect(slots(d)).toEqual(before);
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 5 });
    expect(slots(d)[0]).toEqual(['crownroot_runner', 5]);
    expect(d.hero('hervor').army.slots.reduce((n, s) => n + (s?.count ?? 0), 0)).toBe(17);
  });

  it('refuses too little gold, a bad quantity, the wrong creature, the wrong site and a slot that holds something else', () => {
    const { d, site } = grove([['root_runner', 4], ['norse_draugr', 10], null, null, null, null, null]);
    (d.player.wallet as Record<string, number>).gold = 100;
    // 100 Gold: two of four can train (35 each), never three.
    const q = quoteCampTraining(d.catalog, d.state, 'player', 'hervor', SITE, 'root_runner', 3);
    expect(q).toMatchObject({ legal: false, code: 'insufficient_resources', maxQuantity: 2 });
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 3 }).code).toBe('insufficient_resources');
    for (const n of [0, 5, 1.5, -1]) expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: n }).code, String(n)).toBe('invalid_quantity');
    // Upgraded → nothing; another family's base; a pantheon creature; unknown and malformed IDs.
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'crownroot_runner', quantity: 1 }).code).toBe('not_recruitable');
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'pegasus', quantity: 1 }).code).toBe('not_recruitable');
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'norse_draugr', quantity: 1 }).message).toBe(`${site.name} trains only Root-Runners into Crownroot Runners`);
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'nope', quantity: 1 }).code).toBe('invalid_command');
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 42 as unknown as string, quantity: 1 }).code).toBe('invalid_command');
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 1, slot: 1 }).code).toBe('not_found');
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: 'no_such_site', fromCreatureId: 'root_runner', quantity: 1 }).code).toBe('not_found');
    // Another family's hiring site (wrong site for these creatures), present there.
    const so = GameDriver.mission('silent_oracle_v2_m02', { matchId: 'test-nu-wrong' });
    so.state.mission.flags['so2_bull_down'] = true;
    so.hero('alexios').position = { ...missionSite(so.catalog, so.state, 'so2_pegasus')!.coord };
    so.hero('alexios').army.slots[6] = { stackId: 'rr', creatureId: 'root_runner', count: 3 };
    expect(so.reject({ kind: 'TrainAtCamp', heroId: 'alexios', siteId: 'so2_pegasus', fromCreatureId: 'root_runner', quantity: 1 }).message).toBe('Pegasus Meadow trains only Pegasi into Dawncrest Pegasi');
    // Another player's hero.
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'norse_white_pack_0', siteId: SITE, fromCreatureId: 'root_runner', quantity: 1 }).code).toBe('not_owner');
    expect(d.player.wallet.gold).toBe(100);
  });

  it('waits for a pending level-up, like hiring', () => {
    const { d } = grove([['root_runner', 4], null, null, null, null, null, null]);
    d.state.pendingDecisions.push({ decisionId: 'lv', heroId: 'hervor', kind: 'level_up', level: 2, offers: [] } as unknown as (typeof d.state.pendingDecisions)[number]);
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 1 }).code).toBe('decision_pending');
    expect(d.reject({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 1, creatureId: 'crownroot_runner' }).code).toBe('decision_pending');
  });

  it('training changes the slowest speed as a town does: movement is capped at the new maximum, never refilled', () => {
    // Root-Runners (speed 8) are the only stack; Crownroot Runners have speed 9.
    const { d } = grove([['root_runner', 6], null, null, null, null, null, null]);
    const before = movementBudget(d.catalog, d.state, d.hero('hervor')).total;
    d.hero('hervor').movementPoints = 100;
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 3 });
    // Points left are never refilled by an army change.
    expect(d.hero('hervor').movementPoints).toBe(100);
    d.hero('hervor').movementPoints = 99_999;
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 3 });
    const after = movementBudget(d.catalog, d.state, d.hero('hervor')).total;
    expect(after).toBeGreaterThanOrEqual(before);
    expect(d.hero('hervor').movementPoints).toBe(after);
  });

  it('a repeated command ID neither pays nor trains twice; the same commands from the same state give the same state', () => {
    const run = () => {
      const { d } = grove([['root_runner', 6], null, null, null, null, null, null]);
      d.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 2, creatureId: 'crownroot_runner' });
      d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 3 });
      return d;
    };
    const a = run();
    const b = run();
    expect(hashValue(a.state)).toBe(hashValue(b.state));
    expect(slots(a)).toEqual([['root_runner', 3], ['crownroot_runner', 5], null, null, null, null, null]);
  });
});

describe('the weekly training allowance (owner decision 2026-10-16)', () => {
  /** The grove trains at most 8 a week (its weekly hiring stock), every empire together. */
  const left = (d: GameDriver) => campTrainingLeft(d.catalog, d.state, SITE);

  it('defaults to the weekly hiring stock; the quote exposes it, what is left, and caps the maximum by it', () => {
    const { d, site } = grove([['root_runner', 12], ['norse_draugr', 10], null, null, null, null, null]);
    expect(campTrainingAllowance(d.catalog, site)).toBe(8);
    expect((site.kind as { weeklyGrowth: number }).weeklyGrowth).toBe(8);
    expect(left(d)).toBe(8);
    const q = quoteCampTraining(d.catalog, d.state, 'player', 'hervor', SITE, 'root_runner', 1);
    expect(q).toMatchObject({ legal: true, weeklyAllowance: 8, leftThisWeek: 8, maxQuantity: 8, stackCount: 12 });
    // The whole stack of 12 is more than the week allows.
    const r = d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 12 });
    expect(r).toEqual({ code: 'no_population', message: 'Its trainers can take 8 more this week (8 a week)' });
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 6 });
    expect(slots(d)).toEqual([['root_runner', 6], ['norse_draugr', 10], ['crownroot_runner', 6], null, null, null, null]);
    expect(left(d)).toBe(2);
    expect(d.state.world.sites[SITE]).toMatchObject({ trainedThisWeek: 6, trainedWeek: 1 });
    expect(quoteCampTraining(d.catalog, d.state, 'player', 'hervor', SITE, 'root_runner', 1)).toMatchObject({ leftThisWeek: 2, maxQuantity: 2 });
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 3 }).message).toBe('Its trainers can take 2 more this week (8 a week)');
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 2 });
    expect(left(d)).toBe(0);
    const none = d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 1 });
    expect(none).toEqual({ code: 'no_population', message: 'Its trainers can take no more this week (8 a week)' });
    expect(quoteCampTraining(d.catalog, d.state, 'player', 'hervor', SITE, 'root_runner', 1)).toMatchObject({ legal: false, leftThisWeek: 0, maxQuantity: 0 });
    // Training still uses no hiring stock, and hiring uses none of the allowance.
    expect(campStock(d.catalog, d.state, SITE)).toBe(8);
    d.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 8, creatureId: 'crownroot_runner' });
    expect(campStock(d.catalog, d.state, SITE)).toBe(0);
    expect(d.state.world.sites[SITE]!.trainedThisWeek).toBe(8);
    expect(campTrainedThisWeek(d.catalog, d.state, SITE)).toBe(8);
  });

  it('is shared by every empire: what one trains, the other cannot this week', () => {
    const { d, site } = grove([['root_runner', 5], ['norse_draugr', 10], null, null, null, null, null]);
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 5 });
    d.do({ kind: 'EndTurn' });
    expect(d.state.activePlayerId).toBe('hostile');
    expect(d.state.day).toBe(1);
    const rival = Object.values(d.state.heroes).find((h) => h.ownerId === 'hostile' && h.status === 'active')!;
    rival.position = { ...site.coord };
    rival.army.slots[5] = null;
    rival.army.slots[6] = { stackId: 'rv-rr', creatureId: 'root_runner', count: 6 };
    (d.state.players['hostile']!.wallet as Record<string, number>).gold = 5000;
    const q = quoteCampTraining(d.catalog, d.state, 'hostile', rival.id, SITE, 'root_runner', 1);
    expect(q).toMatchObject({ legal: true, leftThisWeek: 3, weeklyAllowance: 8 });
    // Six would need more than is left; the rival's army has free slots, so a part trains.
    expect(q.maxQuantity).toBe(3);
    expect(d.reject({ kind: 'TrainAtCamp', heroId: rival.id, siteId: SITE, fromCreatureId: 'root_runner', quantity: 6 }, 'hostile').message).toBe('Its trainers can take 3 more this week (8 a week)');
    d.do({ kind: 'TrainAtCamp', heroId: rival.id, siteId: SITE, fromCreatureId: 'root_runner', quantity: 3 }, 'hostile');
    expect(left(d)).toBe(0);
    expect(d.reject({ kind: 'TrainAtCamp', heroId: rival.id, siteId: SITE, fromCreatureId: 'root_runner', quantity: 1 }, 'hostile').message).toBe('Its trainers can take no more this week (8 a week)');
    const rv = d.state.heroes[rival.id]!.army.slots;
    expect(rv[6]).toMatchObject({ creatureId: 'root_runner', count: 3 });
    expect(rv.some((s) => s?.creatureId === 'crownroot_runner' && s.count === 3)).toBe(true);
  });

  it('renews with the new week (the week the stock refills), without carrying over or doubling', () => {
    const { d } = grove([['root_runner', 20], null, null, null, null, null, null]);
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 8 });
    expect(left(d)).toBe(0);
    for (let i = 0; i < 40 && d.state.day < 7; i++) d.do({ kind: 'EndTurn' }, d.state.activePlayerId);
    expect(d.state.day).toBe(7);
    // The last day of the week: still none.
    expect(left(d)).toBe(0);
    for (let i = 0; i < 40 && d.state.day < 8; i++) d.do({ kind: 'EndTurn' }, d.state.activePlayerId);
    expect(d.state.day).toBe(8);
    while (d.state.activePlayerId !== 'player') d.do({ kind: 'EndTurn' }, d.state.activePlayerId);
    // A new week: the full allowance again (8, not 16), on the day the stock refills; the stored count is last week's.
    expect(d.state.world.sites[SITE]).toMatchObject({ trainedThisWeek: 8, trainedWeek: 1 });
    expect(left(d)).toBe(8);
    expect(campTrainedThisWeek(d.catalog, d.state, SITE)).toBe(0);
    d.hero('hervor').position = { ...missionSite(d.catalog, d.state, SITE)!.coord };
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 9 }).message).toBe('Its trainers can take 8 more this week (8 a week)');
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 4 });
    expect(d.state.world.sites[SITE]).toMatchObject({ trainedThisWeek: 4, trainedWeek: 2 });
    expect(left(d)).toBe(4);
    // An unused week does not pile up: two weeks later, still 8.
    for (let i = 0; i < 80 && d.state.day < 22; i++) d.do({ kind: 'EndTurn' }, d.state.activePlayerId);
    expect(d.state.day).toBe(22);
    expect(left(d)).toBe(8);
  });

  it('an old save’s site state (no training fields) has nothing trained this week; a stale count is ignored', () => {
    const { d } = grove([['root_runner', 6], null, null, null, null, null, null]);
    const st = d.state.world.sites[SITE]!;
    expect('trainedThisWeek' in st).toBe(false);
    expect('trainedWeek' in st).toBe(false);
    expect(left(d)).toBe(8);
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 6 });
    expect(left(d)).toBe(2);
    // Only a count alone (no week) or a count of another week: none this week.
    const fresh = grove([['root_runner', 6], null, null, null, null, null, null]).d;
    fresh.state.world.sites[SITE]!.trainedThisWeek = 8;
    expect(campTrainingLeft(fresh.catalog, fresh.state, SITE)).toBe(8);
    fresh.state.world.sites[SITE]!.trainedWeek = 0;
    expect(campTrainingLeft(fresh.catalog, fresh.state, SITE)).toBe(8);
    fresh.state.world.sites[SITE]!.trainedWeek = 1;
    expect(campTrainingLeft(fresh.catalog, fresh.state, SITE)).toBe(0);
  });

  it('a partial training keeps its slot rules within the allowance', () => {
    // Every slot full: the stack of 10 can only train whole, and the week allows 8.
    const full: ([string, number] | null)[] = [['root_runner', 10], ['norse_draugr', 1], ['norse_draugr', 2], ['norse_draugr', 3], ['norse_frost_wolf', 1], ['norse_frost_wolf', 2], ['norse_frost_wolf', 3]];
    const { d } = grove(full);
    expect(quoteCampTraining(d.catalog, d.state, 'player', 'hervor', SITE, 'root_runner', 1).maxQuantity).toBe(0);
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 10 }).message).toBe('Its trainers can take 8 more this week (8 a week)');
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 5 }).code).toBe('no_capacity');
    // A stack of 8 trains whole, in place.
    const eight = grove([['root_runner', 8], ...full.slice(1)]).d;
    expect(quoteCampTraining(eight.catalog, eight.state, 'player', 'hervor', SITE, 'root_runner', 1).maxQuantity).toBe(8);
    eight.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 8 });
    expect(slots(eight)[0]).toEqual(['crownroot_runner', 8]);
  });

  it('weeklyTraining in the site’s data overrides the default; 0 trains nobody', () => {
    const withTraining = (n: number) => {
      const { d } = grove([['root_runner', 6], null, null, null, null, null, null]);
      const m = d.catalog.missions['winter_oath_v2_m02']!;
      d.state.customMission = { ...m, sites: m.sites.map((s) => (s.id === SITE && s.kind.type === 'creature_camp' ? { ...s, kind: { ...s.kind, weeklyTraining: n } } : s)) } as MissionDefinition;
      return d;
    };
    const d = withTraining(3);
    expect(campTrainingAllowance(d.catalog, missionSite(d.catalog, d.state, SITE)!)).toBe(3);
    expect(quoteCampTraining(d.catalog, d.state, 'player', 'hervor', SITE, 'root_runner', 1)).toMatchObject({ weeklyAllowance: 3, leftThisWeek: 3, maxQuantity: 3 });
    expect(d.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 6 }).message).toBe('Its trainers can take 3 more this week (3 a week)');
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 3 });
    expect(campTrainingLeft(d.catalog, d.state, SITE)).toBe(0);
    // The hiring stock is the site's own (8), whatever the training allowance.
    expect(campStock(d.catalog, d.state, SITE)).toBe(8);
    const zero = withTraining(0);
    expect(campTrainingAllowance(zero.catalog, missionSite(zero.catalog, zero.state, SITE)!)).toBe(0);
    const r = zero.reject({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 1 });
    expect(r.code).toBe('not_recruitable');
    expect(r.message).toBe(`${missionSite(zero.catalog, zero.state, SITE)!.name} trains no creatures`);
    // Hiring is unchanged there.
    zero.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 1, creatureId: 'crownroot_runner' });
  });

  it('a site that trains nothing has no allowance (ordinary camps)', () => {
    const { d, site } = grove();
    const m = d.catalog.missions['winter_oath_v2_m02']!;
    const camp: SiteDefinition = { id: 'nu_centaurs2', anchorId: 'nu_centaurs2', coord: { q: site.coord.q, r: site.coord.r + 1 }, name: 'Centaur Camp', description: '', kind: { type: 'creature_camp', creatureId: 'centaur', weeklyGrowth: 4, initialStock: 6, weeklyTraining: 4 } };
    d.state.customMission = { ...m, sites: [...m.sites, camp] } as MissionDefinition;
    d.state.world.sites[camp.id] = { siteId: camp.id, owner: null, cleared: true, claimed: false, activated: false, visitedBy: [], open: false, guard: null };
    expect(campTrainingAllowance(d.catalog, camp)).toBe(0);
    expect(campTrainingLeft(d.catalog, d.state, camp.id)).toBe(0);
    expect(campTrainingAllowance(d.catalog, { kind: { type: 'pickup', reward: {} } } as unknown as SiteDefinition)).toBe(0);
  });

  it('the commands written before the allowance stay valid within it: no slot, no form, the same results', () => {
    const { d } = grove([['root_runner', 6], null, null, null, null, null, null]);
    d.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 2 });
    d.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 8 });
    expect(slots(d)).toEqual([['crownroot_runner', 8], null, null, null, null, null, null]);
    expect(left(d)).toBe(0);
    const a = grove([['root_runner', 6], null, null, null, null, null, null]).d;
    const b = grove([['root_runner', 6], null, null, null, null, null, null]).d;
    for (const g of [a, b]) {
      g.do({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 2 });
      g.do({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 1, creatureId: 'crownroot_runner' });
    }
    expect(hashValue(a.state)).toBe(hashValue(b.state));
  });
});

describe('town training never reaches a neutral family', () => {
  it('a fully built town of the player’s own cannot train base neutrals in its garrison (no dwelling hires them)', () => {
    const d = GameDriver.mission('winter_oath_v2_m02', { matchId: 'test-nu-town' });
    const town = Object.values(d.state.towns).find((t) => t.ownerId === 'player')!;
    const arch = d.catalog.townArchetypes[town.archetypeId]!;
    for (const sl of arch.slots) town.buildings[sl.id] = sl.chain.length;
    (d.player.wallet as Record<string, number>).gold = 10_000;
    for (const [baseId, upId] of PAIRS) {
      town.garrison.slots[0] = { stackId: 'g', creatureId: baseId, count: 3 };
      const r = d.reject({ kind: 'UpgradeStack', townId: town.id, army: { kind: 'garrison', townId: town.id }, slot: 0, quantity: 1 });
      expect(r.code, baseId).toBe('missing_requirement');
      expect(r.message).toBe(`Requires the upgraded dwelling for ${d.catalog.creatures[upId]!.name}`);
      expect(town.garrison.slots[0]).toEqual({ stackId: 'g', creatureId: baseId, count: 3 });
    }
  });
});
