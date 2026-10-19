/**
 * City dedications — core rules (CITY DEDICATIONS handoff §03–§05, §08; app 1.5.0):
 * the two commands with every refusal, the weekly transaction at dawn (gift, favored
 * growth, switch activation), dormancy, capture clearing, idempotency across repeated
 * dawns, save/load and previews, and the source-aware replacement of the gods' old
 * economic benefits. Proposed values (docs/divine-city-benefits-v1), unplaytested.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  Tx,
  activeTownDedication,
  beginCityDedicationWeek,
  canonicalStateHash,
  changeTownOwner,
  dedicationGrowthPreview,
  dedicationGrowthSchedule,
  deepClone,
  familyDwellingSlotId,
  forecastTownDedicationWeek,
  godBenefitsForMode,
  godEffects,
  heroEffects,
  nextWorldWeekBoundary,
  playerEffects,
  processCommand,
  projectTownDedication,
  projectedIncome,
  quoteDedicateTown,
  quoteScheduleTownRededication,
  townDedicationView,
  townGrowthMultiplier,
  weeklyGrowthFor,
  weeksUntilNextExtraCreature,
  type GameEvent,
  type MatchState,
  type RequirementDefinition,
  type ScenarioFeatures,
} from '../src';

const SK = 'skirmish_twin_harbors';
const EGYPT = 'skirmish_twin_harbors_egyptian_vs_greek';
const W = 'westharbor';

interface Setup {
  mission?: string;
  temple?: number;
  gods?: string[];
  gold?: number;
  /** Families whose base dwelling is built (level 1) or upgraded (2). */
  dwellings?: Record<string, number>;
  matchId?: string;
  startingGodId?: string;
}

function features(d: GameDriver, patch: Partial<ScenarioFeatures>): void {
  d.state.scenario = { ...d.state.scenario, features: { ...d.state.scenario.features!, ...patch } };
}

function setup(o: Setup = {}): GameDriver {
  const d = GameDriver.mission(o.mission ?? SK, { matchId: o.matchId ?? 'dedications', ...(o.startingGodId ? { startingGodId: o.startingGodId } : {}) });
  // Growth is compared without the random weekly event (its own effects are tested below).
  features(d, { weeklyEvents: false });
  const t = d.state.towns[W]!;
  t.buildings['pantheon_temple'] = o.temple ?? 2;
  for (const [fam, level] of Object.entries(o.dwellings ?? {})) t.buildings[familyDwellingSlotId(d.catalog, t, fam)!] = level;
  const p = d.state.players['player']!;
  p.pantheon.minorGodIds.push(...(o.gods ?? []));
  p.wallet = { ...p.wallet, gold: o.gold ?? 10000 };
  return d;
}

const town = (d: GameDriver) => d.state.towns[W]!;
const wallet = (d: GameDriver, id = 'player') => ({ ...d.state.players[id]!.wallet });

/** End the active seat's turn (no AI moves). Command IDs follow the revision, so copies of a state replay identically. */
function endTurn(d: GameDriver): GameEvent[] {
  const res = processCommand({ catalog: d.catalog }, d.state, { kind: 'EndTurn', commandId: `turn-${d.state.revision}`, expectedRevision: d.state.revision, actorPlayerId: d.state.activePlayerId });
  if (!res.ok) throw new Error(`EndTurn rejected: ${res.rejection.message}`);
  d.state = res.state;
  return [...res.events];
}

/** End every seat's turn through one dawn; returns that day's events. */
function nextDay(d: GameDriver): GameEvent[] {
  const out: GameEvent[] = [];
  const day = d.state.day;
  for (let i = 0; i < 10 && d.state.day === day; i++) out.push(...endTurn(d));
  for (let i = 0; i < 10 && d.state.activePlayerId !== 'player'; i++) out.push(...endTurn(d));
  return out;
}

/** Play to the dawn of the next world week (day 8, 15, …); returns that dawn's events. */
function toNextWeek(d: GameDriver): GameEvent[] {
  const target = nextWorldWeekBoundary(d.catalog, d.state).day;
  let last: GameEvent[] = [];
  while (d.state.day < target) last = nextDay(d);
  return last;
}

const ofKind = <K extends GameEvent['kind']>(events: readonly GameEvent[], kind: K) => events.filter((e): e is Extract<GameEvent, { kind: K }> => e.kind === kind);

describe('first dedication', () => {
  it('is free, grants nothing on selection, and its service works at once', () => {
    const d = setup();
    const before = wallet(d);
    const pop = { ...town(d).population };
    const q = quoteDedicateTown(d.catalog, d.state, 'player', W, 'zeus');
    expect(q).toMatchObject({ legal: true, activation: 'immediate', activationDay: 8, activationWeek: 2, currentGodId: null });
    expect(q.cost).toEqual({ gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 });
    expect(activeTownDedication(d.catalog, d.state, W)).toBeNull();
    const ev = d.do({ kind: 'DedicateTown', townId: W, godId: 'zeus' });
    expect(ev.map((e) => e.kind)).toEqual(['TownDedicated']);
    expect(ev[0]).toMatchObject({ townId: W, playerId: 'player', godId: 'zeus', week: 1 });
    expect(wallet(d)).toEqual(before);
    expect(town(d).population).toEqual(pop);
    expect(town(d).dedication).toEqual({ activeGodId: 'zeus', ownerId: 'player', growthCredits: {}, lastProcessedWeek: 1 });
    // The service applies to the next command already.
    expect(activeTownDedication(d.catalog, d.state, W)?.godId).toBe('zeus');
    expect(activeTownDedication(d.catalog, d.state, W)?.rule.id).toBe('fortify');
  });

  it('pays its first gift and growth at the next world-week boundary, not before', () => {
    const d = setup({ gods: ['athena'] });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'athena' });
    for (let day = 2; day <= 7; day++) {
      const ev = nextDay(d);
      expect(ofKind(ev, 'CityGiftGranted'), `day ${day}`).toEqual([]);
    }
    const stone = wallet(d).stone;
    const ev = toNextWeek(d);
    expect(d.state.day).toBe(8);
    const gifts = ofKind(ev, 'CityGiftGranted');
    expect(gifts).toHaveLength(1);
    expect(gifts[0]).toMatchObject({ townId: W, playerId: 'player', godId: 'athena', week: 2, amount: { stone: 3 } });
    // The daily income of the same dawn is unaffected (the gift is not daily income).
    const income = ofKind(ev, 'IncomeCollected')[0]!.amount.stone;
    expect(wallet(d).stone).toBe(stone + income + 3);
    const growth = ofKind(ev, 'CityDevotionGrowthApplied');
    expect(growth).toHaveLength(1);
    expect(growth[0]).toMatchObject({ townId: W, playerId: 'player', godId: 'athena', familyId: 'hoplite', week: 2, quarters: 8, added: 2, remainingQuarters: 0 });
    // Dawn order: activation, existing income, gifts, ordinary growth then the dedication extra.
    const order = ev.map((e) => e.kind).filter((k) => ['IncomeCollected', 'CityGiftGranted', 'PopulationGrown', 'CityDevotionGrowthApplied'].includes(k));
    expect(order.indexOf('IncomeCollected')).toBeLessThan(order.indexOf('CityGiftGranted'));
    expect(order.indexOf('CityGiftGranted')).toBeLessThan(order.indexOf('PopulationGrown'));
    expect(order.lastIndexOf('PopulationGrown')).toBeLessThan(order.indexOf('CityDevotionGrowthApplied'));
  });
});

describe('refusals', () => {
  it('wrong owner, foreign town, no Temple II, uncommitted, other-pantheon and excluded gods, feature off', () => {
    const d = setup({ gods: ['athena'] });
    const east = d.state.towns['eastharbor']!;
    east.buildings['pantheon_temple'] = 2;
    expect(d.reject({ kind: 'DedicateTown', townId: 'eastharbor', godId: 'zeus' })).toMatchObject({ code: 'not_owner' });
    expect(d.reject({ kind: 'DedicateTown', townId: W, godId: 'hermes' })).toMatchObject({ code: 'missing_requirement', message: 'Commit to Hermes first (Pantheon screen)' });
    expect(d.reject({ kind: 'DedicateTown', townId: W, godId: 'norse_odin' })).toMatchObject({ code: 'illegal_action' });
    // Ares is excluded by the commitment to Athena: still not dedicable (a dedication never commits).
    expect(d.reject({ kind: 'DedicateTown', townId: W, godId: 'ares' })).toMatchObject({ code: 'missing_requirement' });
    town(d).buildings['pantheon_temple'] = 1;
    expect(d.reject({ kind: 'DedicateTown', townId: W, godId: 'zeus' })).toMatchObject({ code: 'missing_requirement', message: 'Needs Temple level II' });
    town(d).buildings['pantheon_temple'] = 2;
    features(d, { cityDedicationsV1: false });
    expect(d.reject({ kind: 'DedicateTown', townId: W, godId: 'zeus' })).toMatchObject({ code: 'not_in_scope' });
    features(d, { cityDedicationsV1: true });
    expect(d.do({ kind: 'DedicateTown', townId: W, godId: 'athena' })).toHaveLength(1);
  });

  it('a conquered town of another pantheon keeps working but cannot be dedicated (with the reason)', () => {
    const d = GameDriver.mission('skirmish_twin_harbors_greek_vs_norse', { matchId: 'foreign' });
    const east = d.state.towns['eastharbor']!;
    expect(east.pantheonId).toBe('norse');
    east.buildings['pantheon_temple'] = 2;
    east.ownerId = 'player';
    const r = d.reject({ kind: 'DedicateTown', townId: 'eastharbor', godId: 'zeus' });
    expect(r.code).toBe('illegal_action');
    expect(r.message).toMatch(/A Norse town cannot honor gods of your pantheon/);
    const view = townDedicationView(d.catalog, d.state, 'eastharbor', 'player');
    expect(view.town.ok).toBe(false);
    expect(view.town.reason).toMatch(/buildings, income and recruits work as usual/);
    expect(view.action).toBeNull();
    expect(view.options.every((o) => !o.selectable)).toBe(true);
  });

  it('The Three Beacons has no city dedications', () => {
    const tb = GameDriver.mission('three_beacons_m01');
    expect(tb.state.scenario.features?.cityDedicationsV1).toBe(false);
    const t = Object.values(tb.state.towns).find((x) => x.ownerId === 'player')!;
    t.buildings['pantheon_temple'] = 2;
    expect(quoteDedicateTown(tb.catalog, tb.state, 'player', t.id, 'zeus').code).toBe('not_in_scope');
  });

  it('switch: needs a dedication, never the same god, one pending only, enough Gold; first dedication cannot bypass it', () => {
    const d = setup({ gods: ['athena', 'hermes'], gold: 499 });
    expect(d.reject({ kind: 'ScheduleTownRededication', townId: W, godId: 'athena' })).toMatchObject({ code: 'missing_requirement' });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'zeus' });
    expect(d.reject({ kind: 'DedicateTown', townId: W, godId: 'athena' })).toMatchObject({ code: 'already_done' });
    expect(d.reject({ kind: 'ScheduleTownRededication', townId: W, godId: 'zeus' })).toMatchObject({ code: 'already_done' });
    expect(d.reject({ kind: 'ScheduleTownRededication', townId: W, godId: 'athena' })).toMatchObject({ code: 'insufficient_resources', message: 'Requires 500 Gold' });
    d.state.players['player']!.wallet = { ...wallet(d), gold: 1200 };
    const q = quoteScheduleTownRededication(d.catalog, d.state, 'player', W, 'athena');
    expect(q).toMatchObject({ legal: true, activation: 'next_week', activationWeek: 2, activationDay: 8, currentGodId: 'zeus' });
    const ev = d.do({ kind: 'ScheduleTownRededication', townId: W, godId: 'athena' });
    expect(ofKind(ev, 'TownRededicationScheduled')[0]).toMatchObject({ godId: 'athena', fromGodId: 'zeus', activationWeek: 2, activationDay: 8 });
    expect(wallet(d).gold).toBe(700);
    expect(town(d).dedication!.pending).toEqual({ godId: 'athena', requestedBy: 'player', activationWeek: 2 });
    expect(d.reject({ kind: 'ScheduleTownRededication', townId: W, godId: 'hermes' })).toMatchObject({ code: 'already_done' });
    expect(d.reject({ kind: 'ScheduleTownRededication', townId: W, godId: 'athena' }).message).toMatch(/cannot be cancelled/);
    expect(d.reject({ kind: 'DedicateTown', townId: W, godId: 'hermes' })).toMatchObject({ code: 'already_done' });
    expect(wallet(d).gold).toBe(700);
  });

  it('a stale command is re-quoted on commit (the Temple was lost after the screen was opened)', () => {
    const d = setup();
    expect(quoteDedicateTown(d.catalog, d.state, 'player', W, 'zeus').legal).toBe(true);
    town(d).buildings['pantheon_temple'] = 1;
    expect(d.reject({ kind: 'DedicateTown', townId: W, godId: 'zeus' }).code).toBe('missing_requirement');
  });
});

describe('switching', () => {
  it('the current god stays until the week boundary; the new one takes over then (its gift that week)', () => {
    const d = setup({ gods: ['athena'] });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'zeus' });
    nextDay(d);
    d.do({ kind: 'ScheduleTownRededication', townId: W, godId: 'athena' });
    for (let i = 0; i < 5; i++) {
      nextDay(d);
      expect(activeTownDedication(d.catalog, d.state, W)?.godId).toBe('zeus');
    }
    const ev = toNextWeek(d);
    expect(ofKind(ev, 'TownRededicationActivated')[0]).toMatchObject({ townId: W, godId: 'athena', fromGodId: 'zeus', week: 2, playerId: 'player' });
    expect(ofKind(ev, 'CityGiftGranted').map((e) => e.godId)).toEqual(['athena']);
    expect(activeTownDedication(d.catalog, d.state, W)?.godId).toBe('athena');
    expect(town(d).dedication!.pending).toBeUndefined();
    // Activation precedes the income and the gifts.
    const kinds = ev.map((e) => e.kind);
    expect(kinds.indexOf('TownRededicationActivated')).toBeLessThan(kinds.indexOf('IncomeCollected'));
  });

  it('an invalid pending switch waits (no gift, reason shown) and takes over at a later valid boundary', () => {
    const d = setup({ gods: ['athena'] });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'zeus' });
    d.do({ kind: 'ScheduleTownRededication', townId: W, godId: 'athena' });
    town(d).buildings['pantheon_temple'] = 1;
    const view = townDedicationView(d.catalog, d.state, W, 'player');
    expect(view.active).toMatchObject({ godId: 'zeus', state: 'dormant', dormantReason: 'Needs Temple level II' });
    expect(view.pending).toMatchObject({ godId: 'athena', activationDay: 8, waitingReason: 'Needs Temple level II' });
    const ev = toNextWeek(d);
    expect(ofKind(ev, 'TownRededicationDelayed')[0]).toMatchObject({ godId: 'athena', week: 2, reason: 'Needs Temple level II' });
    expect(ofKind(ev, 'TownRededicationActivated')).toEqual([]);
    expect(ofKind(ev, 'CityGiftGranted')).toEqual([]);
    expect(town(d).dedication).toMatchObject({ activeGodId: 'zeus', pending: { godId: 'athena' }, lastProcessedWeek: 2 });
    // The past-due switch is tried at the next boundary.
    expect(townDedicationView(d.catalog, d.state, W, 'player').pending).toMatchObject({ activationDay: 15, activationWeek: 3 });
    town(d).buildings['pantheon_temple'] = 2;
    const ev2 = toNextWeek(d);
    expect(ofKind(ev2, 'TownRededicationActivated')[0]).toMatchObject({ godId: 'athena', week: 3 });
    expect(ofKind(ev2, 'CityGiftGranted')[0]).toMatchObject({ godId: 'athena', amount: { stone: 3 } });
  });
});

describe('capture and recapture', () => {
  it('a capture (by the real siege-free path) clears god, pending switch and credits without refund, keeping the stamp', () => {
    const d = setup();
    const east = d.state.towns['eastharbor']!;
    east.buildings['pantheon_temple'] = 2;
    east.buildings[familyDwellingSlotId(d.catalog, east, 'griffin')!] = 1;
    const rival = d.state.players['rival']!;
    rival.pantheon.patronGodId = 'zeus';
    rival.pantheon.minorGodIds.push('artemis');
    rival.wallet = { ...rival.wallet, gold: 5000 };
    d.do({ kind: 'EndTurn' });
    d.do({ kind: 'DedicateTown', townId: 'eastharbor', godId: 'artemis' }, 'rival');
    d.do({ kind: 'EndTurn' }, 'rival');
    toNextWeek(d);
    expect(east.id).toBe('eastharbor');
    expect(d.state.towns['eastharbor']!.dedication).toMatchObject({ activeGodId: 'artemis', growthCredits: { griffin: 0 }, lastProcessedWeek: 2 });
    // Give the rival a remainder and a paid pending switch.
    d.state.towns['eastharbor']!.dedication!.growthCredits['griffin'] = 3;
    d.do({ kind: 'EndTurn' });
    d.do({ kind: 'ScheduleTownRededication', townId: 'eastharbor', godId: 'zeus' }, 'rival');
    d.do({ kind: 'EndTurn' }, 'rival');
    const rivalGold = d.state.players['rival']!.wallet.gold;
    // The player walks into the undefended town.
    const e = d.state.towns['eastharbor']!;
    e.garrison.slots = e.garrison.slots.map(() => null);
    for (const h of Object.values(d.state.heroes)) if (h.ownerId === 'rival') h.status = 'defeated';
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    const hero = d.hero();
    hero.movementPoints = 99999;
    const ev = d.do({ kind: 'MoveHero', heroId: hero.id, destination: e.coord });
    expect(d.state.towns['eastharbor']!.ownerId).toBe('player');
    expect(ofKind(ev, 'TownDedicationCleared')[0]).toMatchObject({ townId: 'eastharbor', playerId: 'rival', godId: 'artemis', pendingGodId: 'zeus', reason: 'owner_changed' });
    expect(d.state.towns['eastharbor']!.dedication).toEqual({ activeGodId: null, ownerId: null, growthCredits: {}, lastProcessedWeek: 2 });
    expect(d.state.players['rival']!.wallet.gold).toBe(rivalGold);
    // Nothing is paid by the capture; the conqueror inherits nothing.
    expect(ofKind(ev, 'CityGiftGranted')).toEqual([]);
    expect(activeTownDedication(d.catalog, d.state, 'eastharbor')).toBeNull();
  });

  it('recapture restores nothing; the owner may make a fresh (free) dedication paid only from the next boundary', () => {
    const d = setup({ gods: ['athena'], dwellings: { griffin: 1 } });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'athena' });
    toNextWeek(d);
    d.do({ kind: 'ScheduleTownRededication', townId: W, godId: 'zeus' });
    const t = town(d);
    t.dedication!.growthCredits['cyclops'] = 2;
    const tx = new Tx({ catalog: d.catalog }, d.state, 'rival');
    changeTownOwner(tx, t, 'rival');
    expect(tx.events.map((e) => e.kind)).toEqual(['TownCaptured', 'TownDedicationCleared']);
    changeTownOwner(new Tx({ catalog: d.catalog }, d.state, 'player'), t, 'player');
    expect(t.dedication).toEqual({ activeGodId: null, ownerId: null, growthCredits: {}, lastProcessedWeek: 2 });
    expect(activeTownDedication(d.catalog, d.state, W)).toBeNull();
    // Same week: a fresh dedication is free, but week 2 was already paid — next payout at day 15.
    const q = quoteDedicateTown(d.catalog, d.state, 'player', W, 'athena');
    expect(q).toMatchObject({ legal: true, activationDay: 15 });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'athena' });
    expect(t.dedication!.lastProcessedWeek).toBe(2);
    expect(beginCityDedicationWeek(new Tx({ catalog: d.catalog }, deepClone(d.state), 'player'), 2)!.plans.size).toBe(0);
  });
});

describe('idempotency: repeated dawns, save/load and previews never pay twice', () => {
  it('a replayed dawn command, a re-run week step and stripped keys or stamps pay nothing again', () => {
    const d = setup({ gods: ['athena'] });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'athena' });
    while (d.state.day < 7) nextDay(d);
    // The rival ends day 7: that command runs the dawn of day 8.
    d.do({ kind: 'EndTurn' });
    const before = d.state;
    const cmd = d.command({ kind: 'EndTurn' }, 'rival');
    const first = processCommand({ catalog: d.catalog }, before, cmd);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(ofKind(first.events as GameEvent[], 'CityGiftGranted')).toHaveLength(1);
    // The same command again on the new state: refused (command ID and revision).
    expect(processCommand({ catalog: d.catalog }, first.state, cmd).ok).toBe(false);
    // The week step again on the paid state: nothing (key and stamp).
    const again = new Tx({ catalog: d.catalog }, deepClone(first.state), 'player');
    expect(beginCityDedicationWeek(again, 2)!.plans.size).toBe(0);
    expect(again.events).toEqual([]);
    // Stamp present, key stripped: still nothing.
    const noKey = deepClone(first.state);
    noKey.appliedKeys = noKey.appliedKeys.filter((k) => !k.startsWith('city_dedication:'));
    expect(beginCityDedicationWeek(new Tx({ catalog: d.catalog }, noKey, 'player'), 2)!.plans.size).toBe(0);
    // Key present, stamp rolled back: still nothing.
    const noStamp = deepClone(first.state);
    noStamp.towns[W]!.dedication!.lastProcessedWeek = 1;
    const tx = new Tx({ catalog: d.catalog }, noStamp, 'player');
    expect(beginCityDedicationWeek(tx, 2)!.plans.size).toBe(0);
  });

  it('save/load (deepClone and JSON) mid-week and previews leave the payouts identical', () => {
    const d = setup({ gods: ['hades'], dwellings: { minotaur: 1 } });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'hades' });
    toNextWeek(d);
    nextDay(d);
    const hash = canonicalStateHash(d.state);
    // Previews, views and forecasts any number of times: no change.
    for (let i = 0; i < 5; i++) {
      forecastTownDedicationWeek(d.catalog, d.state, W);
      townDedicationView(d.catalog, d.state, W, 'player');
      dedicationGrowthPreview(d.catalog, d.state, W, 'minotaur');
      quoteScheduleTownRededication(d.catalog, d.state, 'player', W, 'zeus');
    }
    expect(canonicalStateHash(d.state)).toBe(hash);
    const loaded = new GameDriver(JSON.parse(JSON.stringify(d.state)) as MatchState, d.catalog);
    const cloned = new GameDriver(deepClone(d.state), d.catalog);
    expect(canonicalStateHash(loaded.state)).toBe(hash);
    const runs = [d, loaded, cloned].map((g) => {
      const ev = toNextWeek(g);
      return { gifts: ofKind(ev, 'CityGiftGranted').map((e) => e.amount), growth: ofKind(ev, 'CityDevotionGrowthApplied').map((e) => [e.added, e.remainingQuarters]), hash: canonicalStateHash(g.state) };
    });
    expect(runs[1]).toEqual(runs[0]);
    expect(runs[2]).toEqual(runs[0]);
    expect(runs[0]!.growth).toEqual([[1, 0]]);
    expect(runs[0]!.gifts).toEqual([{ gold: 0, wood: 0, stone: 3, crystal: 0, favor: 0 }]);
  });
});

describe('favored creature growth', () => {
  /** Four eligible weeks of one god in a fresh town with the family's base dwelling; total extra creatures. */
  function fourWeeks(god: string, family: string, mission = SK): number {
    const d = setup({ mission, gods: [god], dwellings: { [family]: 1 }, matchId: `grow-${god}` });
    d.do({ kind: 'DedicateTown', townId: W, godId: god });
    let added = 0;
    for (let w = 0; w < 4; w++) {
      const ev = toNextWeek(d);
      const g = ofKind(ev, 'CityDevotionGrowthApplied');
      expect(g, `${god} week ${w}`).toHaveLength(1);
      added += g[0]!.added;
    }
    return added;
  }

  it('tier 1–2: 8 over four eligible weeks; tier 3–5: 4; tier 6: 2; tier 7: 1', () => {
    expect(fourWeeks('athena', 'hoplite')).toBe(8);
    expect(fourWeeks('ares', 'peltast')).toBe(8);
    expect(fourWeeks('artemis', 'griffin')).toBe(4);
    expect(fourWeeks('apollo', 'temple_adept')).toBe(4);
    expect(fourWeeks('hades', 'minotaur')).toBe(2);
    expect(fourWeeks('zeus', 'cyclops')).toBe(1);
  });

  it('“+1 every 4 eligible weeks”: the view counts down and the schedule helper agrees', () => {
    const d = setup({ dwellings: { cyclops: 1 } });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'zeus' });
    expect(townDedicationView(d.catalog, d.state, W, 'player').benefits!.growth).toMatchObject({ familyId: 'cyclops', quartersPerWeek: 1, storedQuarters: 0, extraNextWeek: 0, weeksUntilNextExtra: 4 });
    toNextWeek(d);
    toNextWeek(d);
    expect(townDedicationView(d.catalog, d.state, W, 'player').benefits!.growth).toMatchObject({ storedQuarters: 2, weeksUntilNextExtra: 2 });
    toNextWeek(d);
    expect(townDedicationView(d.catalog, d.state, W, 'player').benefits!.growth).toMatchObject({ storedQuarters: 3, extraNextWeek: 1, weeksUntilNextExtra: 1 });
    expect(dedicationGrowthPreview(d.catalog, d.state, W, 'cyclops')).toBe(1);
    expect(dedicationGrowthSchedule(1, 3, 5)).toEqual([1, 0, 0, 0, 1]);
    expect(weeksUntilNextExtraCreature(2, 0)).toBe(2);
    expect(weeksUntilNextExtraCreature(8, 0)).toBe(1);
  });

  it('a missing dwelling or a dormant Temple adds no credit; the gift still needs only the Temple', () => {
    const d = setup({ gods: ['hades'] });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'hades' });
    expect(townDedicationView(d.catalog, d.state, W, 'player').benefits!.growth.status).toEqual({ ok: false, reason: 'Build the Minotaurs dwelling to begin' });
    let ev = toNextWeek(d);
    expect(ofKind(ev, 'CityDevotionGrowthApplied')).toEqual([]);
    expect(ofKind(ev, 'CityGiftGranted')).toHaveLength(1);
    expect(town(d).dedication!.growthCredits).toEqual({});
    // Building the dwelling grants only its own initial population, no divine stock or back credit.
    town(d).buildings[familyDwellingSlotId(d.catalog, town(d), 'minotaur')!] = 1;
    town(d).buildings['pantheon_temple'] = 1;
    ev = toNextWeek(d);
    expect(ofKind(ev, 'CityDevotionGrowthApplied')).toEqual([]);
    expect(ofKind(ev, 'CityGiftGranted')).toEqual([]);
    expect(town(d).dedication!.growthCredits).toEqual({});
    expect(town(d).dedication!.lastProcessedWeek).toBe(3);
  });

  it('pauses while dormant and resumes without catch-up', () => {
    const d = setup({ gods: ['hades'], dwellings: { minotaur: 1 } });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'hades' });
    toNextWeek(d);
    expect(town(d).dedication!.growthCredits).toEqual({ minotaur: 2 });
    town(d).buildings['pantheon_temple'] = 1;
    const dormant = toNextWeek(d);
    expect(ofKind(dormant, 'CityDevotionGrowthApplied')).toEqual([]);
    expect(town(d).dedication!.growthCredits).toEqual({ minotaur: 2 });
    town(d).buildings['pantheon_temple'] = 2;
    const resumed = ofKind(toNextWeek(d), 'CityDevotionGrowthApplied');
    expect(resumed.map((e) => [e.added, e.remainingQuarters])).toEqual([[1, 0]]);
  });

  it('a switch to a god of the same family continues its credit; another family parks it', () => {
    const d = setup({ mission: EGYPT, startingGodId: 'egyptian_ra', gods: ['egyptian_isis', 'egyptian_horus'], dwellings: { egyptian_bennu: 1, egyptian_sacred_scarab: 1 } });
    expect(d.state.players['player']!.pantheon.patronGodId).toBe('egyptian_ra');
    d.do({ kind: 'DedicateTown', townId: W, godId: 'egyptian_isis' });
    toNextWeek(d);
    expect(town(d).dedication!.growthCredits).toEqual({ egyptian_bennu: 2 });
    // Another family (Ra: Sacred Scarabs) — the Bennu remainder is parked.
    d.do({ kind: 'ScheduleTownRededication', townId: W, godId: 'egyptian_ra' });
    const ra = ofKind(toNextWeek(d), 'CityDevotionGrowthApplied');
    expect(ra.map((e) => [e.familyId, e.added])).toEqual([['egyptian_sacred_scarab', 2]]);
    expect(town(d).dedication!.growthCredits).toEqual({ egyptian_bennu: 2, egyptian_sacred_scarab: 0 });
    // Back to the Bennu with Horus: the parked 2 quarters continue.
    d.do({ kind: 'ScheduleTownRededication', townId: W, godId: 'egyptian_horus' });
    const horus = ofKind(toNextWeek(d), 'CityDevotionGrowthApplied');
    expect(horus.map((e) => [e.familyId, e.added, e.remainingQuarters])).toEqual([['egyptian_bennu', 1, 0]]);
  });

  it('fortification multipliers raise ordinary growth but never the divine extra; base and upgraded share one pool', () => {
    const d = setup({ gods: ['athena'], dwellings: { hoplite: 2 } });
    town(d).buildings['fortifications'] = 3; // Castle: ×2
    expect(townGrowthMultiplier(d.catalog, town(d))).toEqual({ numerator: 2, denominator: 1 });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'athena' });
    const normal = weeklyGrowthFor(d.catalog, town(d), 'hoplite', d.state);
    expect(normal).toBe(28);
    const pool = town(d).population['hoplite']!;
    const ev = toNextWeek(d);
    expect(ofKind(ev, 'PopulationGrown').filter((e) => e.townId === W && e.familyId === 'hoplite').map((e) => e.added)).toEqual([28]);
    expect(ofKind(ev, 'CityDevotionGrowthApplied').map((e) => e.added)).toEqual([2]);
    expect(town(d).population['hoplite']).toBe(pool + 28 + 2);
    expect(Object.keys(town(d).population).filter((k) => k.includes('hoplite'))).toEqual(['hoplite']);
    // Both forms are recruited from that one pool.
    const total = town(d).population['hoplite']!;
    d.do({ kind: 'RecruitUnits', townId: W, creatureId: 'veteran_hoplite', quantity: 3, destination: { kind: 'garrison' } });
    d.do({ kind: 'RecruitUnits', townId: W, creatureId: 'hoplite', quantity: 2, destination: { kind: 'garrison' } });
    expect(town(d).population['hoplite']).toBe(total - 5);
  });

  it('the initial dwelling grant is unchanged by a dedication', () => {
    const d = setup({ gods: ['artemis'] });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'artemis' });
    town(d).buildings['civic_hall'] = 4;
    town(d).buildings['fortifications'] = 3;
    const arch = d.catalog.townArchetypes[town(d).archetypeId]!;
    const slot = arch.slots.find((s) => s.id === familyDwellingSlotId(d.catalog, town(d), 'griffin'))!;
    const building = d.catalog.buildings[slot.chain[0]!]!;
    // Every building it requires (recursively) is already standing.
    const satisfy = (reqs: readonly RequirementDefinition[]): void => {
      for (const r of reqs) {
        if (r.type === 'all_of') satisfy(r.requirements);
        if (r.type !== 'has_building') continue;
        const b = d.catalog.buildings[r.buildingId]!;
        satisfy(b.requirements);
        town(d).buildings[b.slotId] = Math.max(town(d).buildings[b.slotId] ?? 0, b.level);
      }
    };
    satisfy(building.requirements);
    const ev = d.do({ kind: 'BuildStructure', townId: W, buildingId: building.id });
    expect(ofKind([...ev], 'PopulationGrown')).toEqual([expect.objectContaining({ familyId: 'griffin', added: d.catalog.families['griffin']!.baseGrowth })]);
    expect(ofKind([...ev], 'CityDevotionGrowthApplied')).toEqual([]);
  });
});

describe('the weekly gift and the owner’s income handicap', () => {
  it('incomePercent is applied once, flooring each resource; the daily income does not include the gift', () => {
    const d = setup({ gods: ['athena', 'hermes'] });
    d.state.players['player']!.incomePercent = 50;
    d.do({ kind: 'DedicateTown', townId: W, godId: 'athena' });
    expect(townDedicationView(d.catalog, d.state, W, 'player').benefits!.resource).toMatchObject({ amount: { stone: 1 }, nextPayoutDay: 8, status: { ok: true } });
    const daily = projectedIncome({ catalog: d.catalog, state: d.state }, 'player');
    const ev = toNextWeek(d);
    expect(ofKind(ev, 'CityGiftGranted')[0]!.amount).toEqual({ gold: 0, wood: 0, stone: 1, crystal: 0, favor: 0 });
    expect(ofKind(ev, 'IncomeCollected')[0]!.amount).toEqual(daily);
    // Hermes: 600 Gold at 50 % = 300.
    d.do({ kind: 'ScheduleTownRededication', townId: W, godId: 'hermes' });
    const ev2 = toNextWeek(d);
    expect(ofKind(ev2, 'CityGiftGranted')[0]!.amount.gold).toBe(300);
  });

  it('each dedicated town pays its own gift; a god may be honored in several towns', () => {
    const d = setup({ gods: ['athena'] });
    const east = d.state.towns['eastharbor']!;
    east.ownerId = 'player';
    east.buildings['pantheon_temple'] = 2;
    d.do({ kind: 'DedicateTown', townId: W, godId: 'athena' });
    d.do({ kind: 'DedicateTown', townId: 'eastharbor', godId: 'athena' });
    const gifts = ofKind(toNextWeek(d), 'CityGiftGranted');
    expect(gifts.map((g) => [g.townId, g.amount.stone])).toEqual([['eastharbor', 3], [W, 3]]);
  });
});

describe('legacy god economics (§05)', () => {
  const AFFECTED: Record<string, string[]> = {
    hermes: ['daily_income'],
    demeter: ['weekly_growth_bonus'],
    hera: ['weekly_growth_bonus'],
    norse_freyja: ['weekly_growth_bonus'],
    norse_njord: ['daily_income', 'daily_income'],
    egyptian_hathor: ['daily_income'],
    egyptian_sobek: ['weekly_growth_bonus', 'daily_income'],
    japanese_inari: ['daily_income', 'daily_income'],
    japanese_izanagi: ['weekly_growth_bonus'],
    celtic_danu: ['weekly_growth_bonus'],
    mesoamerican_tlaloc: ['weekly_growth_bonus'],
    mesoamerican_chalchiuhtlicue: ['weekly_growth_bonus'],
  };

  it('suppresses exactly the twelve gods’ direct income/growth entries in new mode; legacy mode keeps every benefit', () => {
    const d = setup();
    const legacy = deepClone(d.state);
    legacy.scenario = { ...legacy.scenario, features: { ...legacy.scenario.features!, cityDedicationsV1: false } };
    const p = d.state.players['player']!;
    for (const god of Object.values(d.catalog.gods)) {
      for (const s of [d.state, legacy]) s.players['player']!.pantheon = { patronGodId: null, minorGodIds: [god.id] };
      expect(godEffects(d.catalog, legacy, 'player'), god.id).toEqual(god.benefits);
      const kept = godEffects(d.catalog, d.state, 'player');
      const removed = god.benefits.filter((e) => !kept.includes(e));
      expect(removed.map((e) => e.type), god.id).toEqual(AFFECTED[god.id] ?? []);
      expect(kept, god.id).toEqual(godBenefitsForMode(d.catalog, god.id, true).retained);
    }
    expect(p).toBeDefined();
    // The catalog itself is never changed.
    expect(d.catalog.gods['hermes']!.benefits.map((e) => e.type)).toEqual(['movement_percent', 'daily_income']);
  });

  it('new mode: Hermes adds no daily Gold, Demeter no weekly growth — legacy saves keep both', () => {
    const d = setup({ gods: ['demeter', 'hermes'] });
    const legacy = new GameDriver(deepClone(d.state), d.catalog);
    features(legacy, { cityDedicationsV1: false });
    const t = (g: GameDriver) => g.state.towns[W]!;
    const base = d.catalog.families['hoplite']!.baseGrowth;
    expect(weeklyGrowthFor(d.catalog, t(d), 'hoplite', d.state)).toBe(base);
    expect(weeklyGrowthFor(d.catalog, t(legacy), 'hoplite', legacy.state)).toBe(base + 2);
    const gold = (g: GameDriver) => projectedIncome({ catalog: g.catalog, state: g.state }, 'player').gold;
    expect(gold(legacy) - gold(d)).toBe(250);
    // A few legacy dawns: no records, no dedication events, growth with the god bonus.
    const pop = t(legacy).population['hoplite']!;
    const ev: GameEvent[] = [];
    for (let i = 0; i < 8; i++) ev.push(...nextDay(legacy));
    expect(Object.values(legacy.state.towns).some((x) => x.dedication)).toBe(false);
    expect(ev.some((e) => ['CityGiftGranted', 'CityDevotionGrowthApplied', 'TownRededicationActivated'].includes(e.kind))).toBe(false);
    expect(t(legacy).population['hoplite']).toBe(pop + base + 2);
    expect(legacy.state.appliedKeys.some((k) => k.startsWith('city_dedication:'))).toBe(false);
    expect(legacy.reject({ kind: 'DedicateTown', townId: W, godId: 'zeus' }).code).toBe('not_in_scope');
  });

  it('weekly events, signatures and hero perks with income or growth stay untouched in new mode', () => {
    const d = setup();
    features(d, { weeklyEvents: true });
    d.state.world.weeklyEventId = 'week_of_merchants';
    const ev = playerEffects(d.catalog, d.state, 'player').filter((e) => e.type === 'daily_income');
    expect(ev).toEqual([{ type: 'daily_income', resource: 'gold', amount: 300 }]);
    d.state.world.weeklyEventId = 'week_of_plenty';
    expect(weeklyGrowthFor(d.catalog, town(d), 'hoplite', d.state)).toBe(d.catalog.families['hoplite']!.baseGrowth + 3);
    // A god's gift to a hero with daily income keeps paying.
    const perk = Object.values(d.catalog.godPerks ?? {}).find((p) => p.effects.some((e) => e.type === 'daily_income'))!;
    expect(perk).toBeDefined();
    const hero = d.hero();
    hero.perks = [perk.id];
    expect(heroEffects(d.catalog, hero, d.state).filter((e) => e.type === 'daily_income')).toEqual(perk.effects.filter((e) => e.type === 'daily_income'));
    // Signatures still reach the player in new mode.
    for (const p of Object.values(d.catalog.pantheons)) {
      if (!p.signature) continue;
      d.state.players['player']!.pantheonId = p.id;
      const sig = playerEffects(d.catalog, d.state, 'player');
      for (const e of p.signature.effects) expect(sig).toContainEqual(e);
    }
  });
});

describe('the town view', () => {
  it('lists patron and committed minors as choices, the rest as locked future choices with the commitment reasons', () => {
    const d = setup({ gods: ['athena'] });
    const v = townDedicationView(d.catalog, d.state, W, 'player');
    expect(v).toMatchObject({ enabled: true, ownerId: 'player', town: { ok: true }, active: null, pending: null, benefits: null, action: 'dedicate', switchCost: { gold: 500 } });
    const chosen = v.options.filter((o) => o.committed);
    expect(chosen.map((o) => [o.godId, o.selectable])).toEqual([['zeus', true], ['athena', true]]);
    const future = Object.fromEntries(v.options.filter((o) => !o.committed).map((o) => [o.godId, o]));
    expect(Object.keys(future)).toHaveLength(8);
    expect(Object.values(future).every((o) => !o.selectable)).toBe(true);
    expect(future['ares']!.reason).toBe('Excluded by your commitment to Athena');
    expect(future['hermes']!.reason).toBeTruthy();
  });

  it('shows the active god’s three benefits with their own prerequisites; another player sees only the honored god', () => {
    const d = setup({ gods: ['athena'] });
    d.do({ kind: 'DedicateTown', townId: W, godId: 'athena' });
    const v = townDedicationView(d.catalog, d.state, W, 'player');
    expect(v.action).toBe('schedule');
    expect(v.active).toEqual({ godId: 'athena', state: 'active', dormantReason: null });
    expect(v.benefits!.resource).toMatchObject({ amount: { stone: 3 }, nextPayoutDay: 8, status: { ok: true, reason: null } });
    expect(v.benefits!.growth).toMatchObject({ familyId: 'hoplite', quartersPerWeek: 8, extraNextWeek: 2, status: { ok: true } });
    expect(v.benefits!.service).toMatchObject({ serviceId: 'training', status: { ok: false } });
    expect(v.benefits!.service.status.reason).toMatch(/^Build the .+ to use it$/);
    expect(v.options.find((o) => o.godId === 'athena')).toMatchObject({ isActive: true, selectable: false });
    expect(v.options.find((o) => o.godId === 'zeus')).toMatchObject({ selectable: true });
    const rivalView = townDedicationView(d.catalog, d.state, W, 'rival');
    expect(rivalView).toMatchObject({ active: { godId: 'athena' }, pending: null, benefits: null, options: [], action: null });
    expect(rivalView.town.reason).toBe('Not your town');
  });

  it('a feature-off scenario shows nothing to dedicate', () => {
    const d = setup();
    features(d, { cityDedicationsV1: false });
    const v = townDedicationView(d.catalog, d.state, W, 'player');
    expect(v).toMatchObject({ enabled: false, active: null, options: [], action: null, town: { ok: false, reason: 'City dedications are not part of this scenario' } });
  });
});

describe('projection for the AI and the god cards', () => {
  it('projects gifts and growth over several weeks without consuming anything; blocked gods yield nothing', () => {
    const d = setup({ gods: ['hades'], dwellings: { minotaur: 1 } });
    d.state.players['player']!.incomePercent = 50;
    d.do({ kind: 'DedicateTown', townId: W, godId: 'hades' });
    toNextWeek(d);
    const hash = canonicalStateHash(d.state);
    const p = projectTownDedication(d.catalog, d.state, W, 'hades', 4);
    expect(p.blockedReason).toBeNull();
    expect(p.weeks.map((w) => [w.week, w.day, w.added, w.gift.stone])).toEqual([[3, 15, 1, 1], [4, 22, 0, 1], [5, 29, 1, 1], [6, 36, 0, 1]]);
    expect(p.totalAdded).toBe(2);
    expect(p.totalGift.stone).toBe(4);
    expect(projectTownDedication(d.catalog, d.state, W, 'demeter', 4)).toMatchObject({ blockedReason: 'Commit to Demeter first (Pantheon screen)', totalAdded: 0, weeks: [] });
    expect(projectTownDedication(d.catalog, d.state, W, 'zeus', 4)).toMatchObject({ growthBlockedReason: 'Build the Cyclopes dwelling to begin', totalAdded: 0 });
    expect(canonicalStateHash(d.state)).toBe(hash);
    // The real weeks match the projection.
    const real = [0, 1, 2, 3].map(() => ofKind(toNextWeek(d), 'CityDevotionGrowthApplied')[0]!.added);
    expect(real).toEqual([1, 0, 1, 0]);
  });
});

