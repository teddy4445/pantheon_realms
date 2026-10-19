/**
 * The strategic AI at neutral hiring sites (owner decision 2026-10-16; app 1.3.0
 * left the AI hiring base forms only):
 *
 *  - at a site that hires both forms it hires the form that adds the most
 *    fighting strength (`fightingStrength`, before/after) for what it can pay
 *    above `CAMP_RESERVE_GOLD` — a tie goes to the upgrade — and, with stock and
 *    Gold left over, the other form on the next plan (the controller re-plans
 *    after each command);
 *  - it trains its base stacks of the site's family within the week's shared
 *    allowance and above `CAMP_TRAINING_RESERVE_GOLD`;
 *  - a camp that hires one form keeps the old command and trains nothing;
 *  - a camp is worth, as a destination, the best form it could buy and the
 *    training the hero's stacks could get (ordinary camps valued as before);
 *  - decisions are deterministic, read the belief state only, and scripted
 *    hostile players and patrols do not use camps.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  campTrainingLeft,
  effectiveAttributes,
  hashValue,
  missionSite,
  type CommandPayload,
  type CreatureStackState,
  type MissionDefinition,
  type SiteDefinition,
  type StackSpec,
} from '@pr/rules';
import { buildObservation, fightingStrength, stepStrategicAI, strategicCandidates } from '../src';
import { CAMP_RESERVE_GOLD, CAMP_TRAINING_RESERVE_GOLD, campCandidates, campTargetValue } from '../src/services';

const SITE = 'wo2_root_runners';
const BASE = 'root_runner'; // 110 Gold
const UP = 'crownroot_runner'; // 145 Gold

/** Hervor (the empire 'player') at the Root-Runner Grove of The Winter Oath, chapter 2: stock 8, 8 trainings a week. */
function grove(gold: number, army?: ([string, number] | null)[], matchId = 'test-ai-camp') {
  const d = GameDriver.mission('winter_oath_v2_m02', { matchId });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const site = missionSite(d.catalog, d.state, SITE)!;
  const hero = d.hero('hervor');
  hero.position = { ...site.coord };
  if (army) hero.army.slots = army.map((x, i) => (x ? { stackId: `ai-${i}`, creatureId: x[0], count: x[1] } : null)) as (CreatureStackState | null)[];
  (d.player.wallet as Record<string, number>).gold = gold;
  return { d, site };
}

const DEFAULT_ARMY: ([string, number] | null)[] = [['norse_draugr', 24], ['norse_frost_wolf', 8], null, null, null, null, null];

const camp = (d: GameDriver, playerId = 'player') => {
  const belief = buildObservation(d.catalog, d.state, playerId).belief;
  const heroes = Object.values(belief.heroes).filter((h) => h.ownerId === playerId && h.status === 'active' && h.ai?.profile !== 'patrol');
  return campCandidates(d.catalog, belief, playerId, heroes);
};
const plan = (d: GameDriver, playerId = 'player') => strategicCandidates(d.catalog, buildObservation(d.catalog, d.state, playerId)).filter((c) => c.kind === 'RecruitFromCamp' || c.kind === 'TrainAtCamp');

/** The gain in fighting strength of hiring `qty` of `id` into the hero's army, computed here independently. */
function hireGain(d: GameDriver, id: string, qty: number): number {
  const hero = d.hero('hervor');
  const eff = effectiveAttributes(d.catalog, d.state, hero);
  const commander = { attack: eff.attack.total, defense: eff.defense.total };
  const before: (StackSpec | null)[] = hero.army.slots.map((s) => (s ? { creatureId: s.creatureId, count: s.count } : null));
  const after = [...before];
  const merge = after.findIndex((s) => s?.creatureId === id);
  const at = merge >= 0 ? merge : after.findIndex((s) => !s);
  after[at] = { creatureId: id, count: (merge >= 0 ? after[merge]!.count : 0) + qty };
  return fightingStrength(d.catalog, after, commander) - fightingStrength(d.catalog, before, commander);
}

describe('hiring at a site that hires both forms', () => {
  it('a rich empire hires the upgraded form: the stock is the limit, and the upgrade adds more strength', () => {
    const { d } = grove(9000, DEFAULT_ARMY);
    expect(camp(d)).toEqual([{ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 8, creatureId: UP }]);
    expect(hireGain(d, UP, 8)).toBeGreaterThan(hireGain(d, BASE, 8));
    d.do(camp(d)[0]!);
    expect(d.hero('hervor').army.slots[2]).toMatchObject({ creatureId: UP, count: 8 });
    expect(d.player.wallet.gold).toBe(9000 - 8 * 145);
    // The stock is spent: nothing more to hire this week.
    expect(camp(d)).toEqual([]);
  });

  it('a short treasury: only what it pays above the reserve, the form that adds the most for it', () => {
    // 120 Gold above the reserve: one Root-Runner, no Crownroot Runner.
    let g = grove(CAMP_RESERVE_GOLD + 120, DEFAULT_ARMY).d;
    expect(camp(g)).toEqual([{ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 1, creatureId: BASE }]);
    // Below the reserve: nothing.
    g = grove(CAMP_RESERVE_GOLD + 100, DEFAULT_ARMY).d;
    expect(camp(g)).toEqual([]);
    // Every wallet from the reserve to a full week's stock of upgrades: the chosen form is the one whose
    // purchase adds the most fighting strength (ties: the upgrade), as many as the Gold above the reserve pays.
    const seen = new Set<string>();
    for (let extra = 110; extra <= 8 * 145 + 60; extra += 23) {
      const { d } = grove(CAMP_RESERVE_GOLD + extra, DEFAULT_ARMY, `test-ai-camp-${extra}`);
      const c = camp(d);
      expect(c, String(extra)).toHaveLength(1);
      const cmd = c[0] as Extract<CommandPayload, { kind: 'RecruitFromCamp' }>;
      const nUp = Math.min(8, Math.floor(extra / 145));
      const nBase = Math.min(8, Math.floor(extra / 110));
      const gUp = nUp > 0 ? hireGain(d, UP, nUp) : 0;
      const gBase = hireGain(d, BASE, nBase);
      const want = gUp >= gBase ? UP : BASE;
      expect(cmd.creatureId, `${extra} Gold above the reserve`).toBe(want);
      expect(cmd.quantity).toBe(want === UP ? nUp : nBase);
      seen.add(want);
    }
    // Both answers occur over that range (the choice really depends on the wallet).
    expect([...seen].sort()).toEqual([UP, BASE].sort());
  });

  it('with stock and Gold left over after the best form, the other form is hired on the next plan', () => {
    // 7 upgrades fit (1,015 Gold) and add more than all 8 base forms; 115 Gold above the reserve remain for one Root-Runner.
    const { d } = grove(CAMP_RESERVE_GOLD + 7 * 145 + 115, DEFAULT_ARMY);
    const issued: CommandPayload[] = [];
    const tried = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const r = stepStrategicAI(d.catalog, d.state, tried);
      d.state = r.state;
      const c = r.command;
      if (!c || c.kind === 'EndTurn' || c.kind === 'MoveHero') break;
      if (c.kind === 'RecruitFromCamp' || c.kind === 'TrainAtCamp') issued.push({ kind: c.kind, heroId: c.heroId, siteId: c.siteId, quantity: c.quantity, ...('creatureId' in c && c.creatureId ? { creatureId: c.creatureId } : {}) } as CommandPayload);
    }
    expect(issued).toEqual([
      { kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 7, creatureId: UP },
      { kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 1, creatureId: BASE },
    ]);
    const army = d.state.heroes['hervor']!.army.slots;
    expect(army[2]).toMatchObject({ creatureId: UP, count: 7 });
    expect(army[3]).toMatchObject({ creatureId: BASE, count: 1 });
    expect(d.state.world.sites[SITE]!.stock).toBe(0);
  });
});

describe('training at the hiring site', () => {
  it('trains its base stack within the week’s allowance (a part into a free slot), then hires', () => {
    const { d } = grove(9000, [['norse_draugr', 24], [BASE, 12], null, null, null, null, null]);
    const c = camp(d);
    expect(c).toContainEqual({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: BASE, quantity: 8, slot: 1 });
    expect(c).toContainEqual({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 8, creatureId: UP });
    // Training adds at least as much strength per Gold: it comes first.
    expect(c[0]!.kind).toBe('TrainAtCamp');
    for (let i = 0; i < 4; i++) {
      const next = camp(d)[0];
      if (!next) break;
      d.do(next);
    }
    const army = d.hero('hervor').army.slots.map((s) => (s ? [s.creatureId, s.count] : null));
    // 4 Root-Runners stay (the week trains 8); the 8 trained join the 8 hired upgrades.
    expect(army).toEqual([['norse_draugr', 24], [BASE, 4], [UP, 16], null, null, null, null]);
    expect(campTrainingLeft(d.catalog, d.state, SITE)).toBe(0);
    expect(d.player.wallet.gold).toBe(9000 - 8 * 35 - 8 * 145);
    // Nothing is left to do here this week.
    expect(camp(d)).toEqual([]);
  });

  it('keeps its training reserve; trains only what the Gold above it pays', () => {
    const army: ([string, number] | null)[] = [['norse_draugr', 24], [BASE, 6], null, null, null, null, null];
    // 3 × 35 = 105 above the training reserve, under the hiring reserve: three train, nobody is hired.
    let g = grove(CAMP_TRAINING_RESERVE_GOLD + 110, army).d;
    expect(camp(g)).toEqual([{ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: BASE, quantity: 3, slot: 1 }]);
    // Below it: nothing.
    g = grove(CAMP_TRAINING_RESERVE_GOLD + 30, army).d;
    expect(camp(g)).toEqual([]);
    // The whole stack when the Gold allows (in place).
    g = grove(CAMP_TRAINING_RESERVE_GOLD + 300, army).d;
    expect(camp(g)).toEqual([{ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: BASE, quantity: 6, slot: 1 }]);
  });

  it('within what is left this week: a rival’s trainings count, and none are proposed once it is used up', () => {
    const army: ([string, number] | null)[] = [['norse_draugr', 24], [BASE, 6], null, null, null, null, null];
    const { d } = grove(CAMP_TRAINING_RESERVE_GOLD + 1000, army);
    d.state.world.sites[SITE]!.trainedThisWeek = 5;
    d.state.world.sites[SITE]!.trainedWeek = 1;
    expect(camp(d).filter((c) => c.kind === 'TrainAtCamp')).toEqual([{ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: BASE, quantity: 3, slot: 1 }]);
    d.state.world.sites[SITE]!.trainedThisWeek = 8;
    expect(camp(d).filter((c) => c.kind === 'TrainAtCamp')).toEqual([]);
    // Last week's count is no limit.
    d.state.world.sites[SITE]!.trainedWeek = 0;
    expect(camp(d).find((c) => c.kind === 'TrainAtCamp')).toMatchObject({ kind: 'TrainAtCamp', quantity: 6 });
  });

  it('no partial training where the rules find no slot: a full army trains a stack only whole', () => {
    const full: ([string, number] | null)[] = [[BASE, 10], ['norse_draugr', 1], ['norse_draugr', 2], ['norse_draugr', 3], ['norse_frost_wolf', 1], ['norse_frost_wolf', 2], ['norse_frost_wolf', 3]];
    let g = grove(9000, full).d;
    // 10 is more than the week trains (8), and a part has nowhere to go; Root-Runners can still be hired into their own stack.
    expect(camp(g).filter((c) => c.kind === 'TrainAtCamp')).toEqual([]);
    g = grove(9000, [[BASE, 7], ...full.slice(1)]).d;
    expect(camp(g)).toContainEqual({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: BASE, quantity: 7, slot: 0 });
  });
});

describe('a camp that hires one form', () => {
  /** An ordinary Centaur Camp (growth restock) beside the grove, Hervor on it with Centaurs. */
  function centaurs(gold: number) {
    const { d, site } = grove(gold, [['norse_draugr', 24], ['centaur', 4], null, null, null, null, null]);
    const m = d.catalog.missions['winter_oath_v2_m02']!;
    const def: SiteDefinition = { id: 'ai_centaurs', anchorId: 'ai_centaurs', coord: { q: site.coord.q, r: site.coord.r + 1 }, name: 'Centaur Camp', description: '', kind: { type: 'creature_camp', creatureId: 'centaur', weeklyGrowth: 4, initialStock: 6 } };
    d.state.customMission = { ...m, sites: [...m.sites, def] } as MissionDefinition;
    d.state.world.sites[def.id] = { siteId: def.id, owner: null, cleared: true, claimed: false, activated: false, visitedBy: [], open: false, guard: null };
    d.hero('hervor').position = { ...def.coord };
    return { d, def };
  }

  it('keeps the old command (no form) and trains nothing', () => {
    const { d, def } = centaurs(9000);
    expect(camp(d)).toEqual([{ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: def.id, quantity: 6 }]);
    expect(plan(d).some((c) => c.kind === 'TrainAtCamp')).toBe(false);
  });

  it('is valued as a destination exactly as before (500 + a quarter of what the hero would spend)', () => {
    const { d, def } = centaurs(2600);
    const unit = d.catalog.creatures['centaur']!.cost!.gold!;
    const belief = buildObservation(d.catalog, d.state, 'player').belief;
    expect(campTargetValue(d.catalog, belief, 'player', belief.heroes['hervor']!, def)).toBeCloseTo(500 + 0.25 * Math.min(6 * unit, 2600), 6);
    // Too little Gold for three above the reserve: not a destination (as before).
    (belief.players['player']!.wallet as Record<string, number>).gold = unit * 3 + CAMP_RESERVE_GOLD - 1;
    expect(campTargetValue(d.catalog, belief, 'player', belief.heroes['hervor']!, def)).toBeNull();
  });
});

describe('a hiring site as a destination', () => {
  const value = (d: GameDriver, site: SiteDefinition, playerId = 'player', heroId = 'hervor') => {
    const belief = buildObservation(d.catalog, d.state, playerId).belief;
    return campTargetValue(d.catalog, belief, playerId, belief.heroes[heroId]!, site);
  };

  it('is worth the best form it could buy, more again with base stacks to train; nothing behind a pact or without Gold', () => {
    const { d, site } = grove(9000, DEFAULT_ARMY);
    const old = 500 + 0.25 * Math.min(8 * 110, 9000);
    const best = value(d, site)!;
    // Eight upgrades at the Root-Runner's strength per Gold — more than eight Root-Runners.
    expect(best).toBeGreaterThan(old);
    const withStack = grove(9000, [['norse_draugr', 24], [BASE, 6], null, null, null, null, null]);
    expect(value(withStack.d, withStack.site)!).toBeGreaterThan(best);
    // No stock left: still worth the visit for the training alone.
    withStack.d.state.world.sites[SITE]!.stock = 0;
    expect(value(withStack.d, withStack.site)!).toBeGreaterThan(500);
    // No stock and nothing to train: not a destination.
    d.state.world.sites[SITE]!.stock = 0;
    expect(value(d, site)).toBeNull();
    // Gold under the reserve: not a destination.
    const poor = grove(CAMP_RESERVE_GOLD + 100, DEFAULT_ARMY);
    expect(value(poor.d, poor.site)).toBeNull();
    // A pact not yet made.
    const so = GameDriver.mission('silent_oracle_v2_m02', { matchId: 'test-ai-pact' });
    for (const fog of Object.values(so.state.fog)) fog.explored = fog.explored.map(() => 1);
    (so.player.wallet as Record<string, number>).gold = 9000;
    const meadow = missionSite(so.catalog, so.state, 'so2_pegasus')!;
    expect(value(so, meadow, 'player', 'alexios')).toBeNull();
    so.state.mission.flags['so2_bull_down'] = true;
    expect(value(so, meadow, 'player', 'alexios')).toBeGreaterThan(500);
  });

  it('scripted hostile players and patrols never use camps', () => {
    const { d, site } = grove(9000, DEFAULT_ARMY);
    d.do({ kind: 'EndTurn' });
    expect(d.state.activePlayerId).toBe('hostile');
    const patrol = d.state.heroes['norse_white_pack_0']!;
    patrol.position = { ...site.coord };
    patrol.army.slots[6] = { stackId: 'pt-rr', creatureId: BASE, count: 4 };
    (d.state.players['hostile']!.wallet as Record<string, number>).gold = 9000;
    expect(plan(d, 'hostile')).toEqual([]);
    expect(value(d, site, 'hostile', 'norse_white_pack_0')).toBeNull();
    // Not even if it were an ordinary hero of that empire: scripted hostile empires never hire.
    delete (patrol as { ai?: unknown }).ai;
    expect(plan(d, 'hostile')).toEqual([]);
    expect(value(d, site, 'hostile', 'norse_white_pack_0')).toBeNull();
  });
});

describe('determinism and the belief state', () => {
  it('the same observation gives the same commands; planning changes nothing and draws no random number', () => {
    const run = () => {
      const { d } = grove(5321, [['norse_draugr', 24], [BASE, 5], null, null, null, null, null], 'test-ai-camp-det');
      const before = hashValue(d.state);
      const a = plan(d);
      expect(hashValue(d.state)).toBe(before);
      return { a, b: plan(d), d };
    };
    const one = run();
    const two = run();
    expect(one.a).toEqual(one.b);
    expect(one.a).toEqual(two.a);
    expect(one.a.length).toBeGreaterThan(0);
    // What this empire cannot know (the rival's treasury, redacted) does not change the plan.
    (one.d.state.players['hostile']!.wallet as Record<string, number>).gold = 123_456;
    expect(plan(one.d)).toEqual(one.a);
  });
});
