/**
 * City dedications and the computer (CITY DEDICATIONS handoff §11; app 1.5.0): the AI
 * dedicates only through the town view's selectable options (patron and committed minor
 * gods), values gifts by its build plan's needs, extra stock only where it can be recruited
 * and used before the scenario's estimated end, switches only above the fee × 1.25 (never
 * while a switch is pending, never on a stockpile change alone), and every command it emits
 * passes the rules' own quotes.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  deepClone,
  godBenefitsInMatch,
  processCommand,
  quoteDedicateTown,
  quoteScheduleTownRededication,
  resources,
  townDedicationView,
  type CommandPayload,
  type GameCommand,
  type GameEvent,
  type MatchState,
  type ScenarioFeatures,
} from '@pr/rules';
import {
  SWITCH_MARGIN,
  buildObservation,
  buildScore,
  byDedicationValue,
  dedicationCandidates,
  dedicationContext,
  dedicationValue,
  imminentCommitments,
  rededicationCandidates,
  runAITurn,
  switchTriggered,
  templeDedicationBonus,
  weighSwitch,
} from '../src';
import { effectScore, godCommitScore } from '../src/services';

interface Setup {
  readonly patron?: string | null;
  readonly minors?: readonly string[];
  readonly buildings?: Record<string, number>;
  readonly wallet?: Partial<Record<'gold' | 'wood' | 'stone' | 'crystal' | 'favor', number>>;
  readonly feature?: boolean;
  readonly dedicated?: string;
  readonly incomePercent?: number;
  readonly mission?: string;
}

/**
 * The rival's Eastharbor (Greek unless `mission` says otherwise) with Temple II, the given
 * commitments and treasury; the rival is to move. AI rivals start without a patron (the
 * mission factory), so `patron` defaults to null as in a real skirmish.
 */
function rivalTown(o: Setup = {}): { d: GameDriver; s: MatchState } {
  const d = GameDriver.mission(o.mission ?? 'skirmish_twin_harbors', { matchId: `ai-dedication-${(o.minors ?? []).join('-')}` });
  const s: MatchState = deepClone(d.state);
  (s.scenario as { features: ScenarioFeatures }).features = { ...s.scenario.features, cityDedicationsV1: o.feature !== false };
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  const rival = s.players['rival']!;
  const pantheon = rival.pantheon as { patronGodId: string | null; minorGodIds: string[] };
  pantheon.patronGodId = o.patron ?? null;
  pantheon.minorGodIds = [...(o.minors ?? [])];
  if (o.incomePercent !== undefined) rival.incomePercent = o.incomePercent;
  const town = s.towns['eastharbor']!;
  Object.assign(town.buildings, { pantheon_temple: 2, ...(o.buildings ?? {}) });
  if (o.dedicated) town.dedication = { activeGodId: o.dedicated, ownerId: 'rival', growthCredits: {}, lastProcessedWeek: 1 };
  rival.wallet = resources({ gold: 8000, wood: 20, stone: 20, crystal: 10, favor: 0, ...(o.wallet ?? {}) });
  s.activePlayerId = 'rival';
  return { d, s };
}

const belief = (d: GameDriver, s: MatchState) => buildObservation(d.catalog, s, 'rival').belief;
const command = (s: MatchState, payload: CommandPayload, n = 1): GameCommand => ({ ...payload, commandId: `test:${s.revision}:${n}`, expectedRevision: s.revision, actorPlayerId: 'rival' }) as GameCommand;

describe('AI city dedications: eligibility', () => {
  it('dedicates only to a selectable god of the town view (committed minors; no patron without one)', () => {
    for (const minors of [['athena'], ['ares'], ['apollo', 'hermes'], ['artemis', 'hera']]) {
      const { d, s } = rivalTown({ minors });
      const b = belief(d, s);
      const out = dedicationCandidates(d.catalog, b, 'rival');
      expect(out).toHaveLength(1);
      const c = out[0] as Extract<CommandPayload, { kind: 'DedicateTown' }>;
      expect(c.kind).toBe('DedicateTown');
      const selectable = townDedicationView(d.catalog, b, 'eastharbor', 'rival').options.filter((x) => x.selectable && x.committed).map((x) => x.godId);
      expect(selectable).toEqual(expect.arrayContaining([c.godId]));
      expect(minors).toContain(c.godId); // never the patron Zeus, which this AI empire does not have
    }
  });

  it('proposes nothing without a committed god (no auto-granted patron) and nothing for a town without Temple II', () => {
    const none = rivalTown({ minors: [] });
    expect(dedicationCandidates(none.d.catalog, belief(none.d, none.s), 'rival')).toEqual([]);
    const low = rivalTown({ minors: ['athena'], buildings: { pantheon_temple: 1 } });
    expect(dedicationCandidates(low.d.catalog, belief(low.d, low.s), 'rival')).toEqual([]);
  });

  it('uses the patron when the empire has one', () => {
    const { d, s } = rivalTown({ patron: 'zeus', minors: [] });
    expect(dedicationCandidates(d.catalog, belief(d, s), 'rival')).toEqual([{ kind: 'DedicateTown', townId: 'eastharbor', godId: 'zeus' }]);
  });

  it('waits for a commitment its Favor brings before the week boundary when that god would be worth a switch, never past the eve', () => {
    // Temple II brings 2 Favor a dawn: from 15 Favor a 20-Favor first minor god is six dawns away.
    const soon = rivalTown({ patron: 'zeus', minors: [], wallet: { favor: 15, stone: 0 } });
    const b = belief(soon.d, soon.s);
    expect(imminentCommitments(soon.d.catalog, b, 'rival', 6).length).toBeGreaterThan(0);
    expect(dedicationCandidates(soon.d.catalog, b, 'rival')).toEqual([]);
    // On the eve of the boundary it takes the best god it has (gifts and growth start the next day).
    const eve = rivalTown({ patron: 'zeus', minors: [], wallet: { favor: 15, stone: 0 } });
    eve.s.day = 7;
    expect(dedicationCandidates(eve.d.catalog, belief(eve.d, eve.s), 'rival')).toEqual([{ kind: 'DedicateTown', townId: 'eastharbor', godId: 'zeus' }]);
    // Favor too far off: no wait.
    const far = rivalTown({ patron: 'zeus', minors: [], wallet: { favor: 0, stone: 0 } });
    expect(imminentCommitments(far.d.catalog, belief(far.d, far.s), 'rival', 6)).toEqual([]);
    expect(dedicationCandidates(far.d.catalog, belief(far.d, far.s), 'rival')).toEqual([{ kind: 'DedicateTown', townId: 'eastharbor', godId: 'zeus' }]);
  });

  it('never dedicates in legacy mode (feature off)', () => {
    const { d, s } = rivalTown({ minors: ['athena'], feature: false });
    const b = belief(d, s);
    expect(dedicationCandidates(d.catalog, b, 'rival')).toEqual([]);
    const sw = rivalTown({ patron: 'zeus', minors: ['athena'], feature: false, dedicated: 'zeus' });
    const sb = belief(sw.d, sw.s);
    sb.towns['eastharbor']!.buildUsedDay = sb.day;
    expect(rededicationCandidates(sw.d.catalog, sb, 'rival')).toEqual([]);
  });

  it('never dedicates a town of another pantheon it has taken', () => {
    // Greek player against a Norse rival: the rival holds the Greek Westharbor (Temple II) and its own Eastharbor.
    const { d, s } = rivalTown({ mission: 'skirmish_twin_harbors_greek_vs_norse', minors: ['norse_tyr'] });
    const west = s.towns['westharbor']!;
    west.ownerId = 'rival';
    Object.assign(west.buildings, { pantheon_temple: 2 });
    const b = belief(d, s);
    const out = dedicationCandidates(d.catalog, b, 'rival');
    expect(out.some((c) => c.kind === 'DedicateTown' && c.townId === 'westharbor')).toBe(false);
    expect(out).toEqual([{ kind: 'DedicateTown', townId: 'eastharbor', godId: 'norse_tyr' }]);
    // …and Temple II of the foreign town earns no dedication bonus in the build plan.
    expect(templeDedicationBonus(d.catalog, b, 'rival', 'westharbor', 'temple_2')).toBe(0);
  });
});

describe('AI city dedications: valuation', () => {
  it('prefers the god whose gift resource is scarce for its build plan', () => {
    // Athena: 3 Stone; Demeter: 4 Wood; both favor Hoplites (same growth).
    const stoneShort = rivalTown({ minors: ['athena', 'demeter'], wallet: { wood: 200, stone: 0 } });
    expect(dedicationCandidates(stoneShort.d.catalog, belief(stoneShort.d, stoneShort.s), 'rival')).toEqual([{ kind: 'DedicateTown', townId: 'eastharbor', godId: 'athena' }]);
    const woodShort = rivalTown({ minors: ['athena', 'demeter'], wallet: { wood: 0, stone: 200 } });
    expect(dedicationCandidates(woodShort.d.catalog, belief(woodShort.d, woodShort.s), 'rival')).toEqual([{ kind: 'DedicateTown', townId: 'eastharbor', godId: 'demeter' }]);
  });

  it('values extra stock only with the favored dwelling built or forthcoming', () => {
    // Hermes favors Cavalry (tier 4): its dwelling needs a Barracks and a Workshop.
    const absent = rivalTown({ minors: ['hermes'] });
    const a = belief(absent.d, absent.s);
    expect(dedicationValue(dedicationContext(absent.d.catalog, a, 'rival'), 'eastharbor', 'hermes').growth).toBe(0);
    const soon = rivalTown({ minors: ['hermes'], buildings: { workshop: 1 } });
    const so = belief(soon.d, soon.s);
    const forthcoming = dedicationValue(dedicationContext(soon.d.catalog, so, 'rival'), 'eastharbor', 'hermes');
    const built = rivalTown({ minors: ['hermes'], buildings: { workshop: 1, dwelling_t4: 1 } });
    const bu = belief(built.d, built.s);
    const standing = dedicationValue(dedicationContext(built.d.catalog, bu, 'rival'), 'eastharbor', 'hermes');
    expect(forthcoming.growth).toBeGreaterThan(0);
    expect(standing.growth).toBeGreaterThan(forthcoming.growth); // one week later when it is still to be built
    expect(standing.extras).toBe(4);
    expect(forthcoming.extras).toBe(3);
  });

  it('values extra stock only when the treasury can recruit it', () => {
    const rich = rivalTown({ minors: ['athena'] });
    const r = belief(rich.d, rich.s);
    const paid = dedicationValue(dedicationContext(rich.d.catalog, r, 'rival'), 'eastharbor', 'athena');
    expect(paid.extras).toBe(8);
    expect(paid.growth).toBeGreaterThan(0);
    // No income at all (handicap 0 %): the extra Hoplites could never be bought.
    const broke = rivalTown({ minors: ['athena'], incomePercent: 0 });
    const b = belief(broke.d, broke.s);
    const unpaid = dedicationValue(dedicationContext(broke.d.catalog, b, 'rival'), 'eastharbor', 'athena');
    expect(unpaid.extras).toBe(8);
    expect(unpaid.growth).toBe(0);
    // The gift itself follows the same handicap (applied once, rounded down by the rules).
    expect(unpaid.resource).toBe(0);
  });

  it('ignores tier 6–7 growth that cannot mature before the estimated end', () => {
    // Zeus: one Cyclops every four eligible weeks; Hades: one Minotaur every two.
    const { d, s } = rivalTown({ patron: 'zeus', minors: ['hades'], buildings: { dwelling_t6: 1, dwelling_t7: 1 } });
    const b = belief(d, s);
    const far = dedicationContext(d.catalog, b, 'rival', { endDay: b.day + 60 });
    const near = dedicationContext(d.catalog, b, 'rival', { endDay: b.day + 14 });
    const last = dedicationContext(d.catalog, b, 'rival', { endDay: b.day + 7 });
    expect(far.weeks).toBe(4);
    expect(dedicationValue(far, 'eastharbor', 'zeus').extras).toBe(1);
    expect(dedicationValue(far, 'eastharbor', 'zeus').growth).toBeGreaterThan(0);
    expect(dedicationValue(near, 'eastharbor', 'zeus').extras).toBe(0);
    expect(dedicationValue(near, 'eastharbor', 'zeus').growth).toBe(0);
    expect(dedicationValue(near, 'eastharbor', 'hades').extras).toBe(1);
    expect(dedicationValue(last, 'eastharbor', 'hades').extras).toBe(0);
    expect(dedicationValue(last, 'eastharbor', 'hades').growth).toBe(0);
  });

  it('counts a campaign chapter as short: rare growth late in a chapter is worth nothing', () => {
    const { d, s } = rivalTown({ patron: 'zeus', minors: [], buildings: { dwelling_t7: 1 } });
    (s.scenario as { campaignId: string | null }).campaignId = 'winter_oath';
    s.day = 22;
    const b = belief(d, s);
    expect(dedicationValue(dedicationContext(d.catalog, b, 'rival'), 'eastharbor', 'zeus').extras).toBe(0);
  });

  it('counts service savings only for what it plans (here: the Fort is in its build plan, Zeus discounts fortifications)', () => {
    const { d, s } = rivalTown({ patron: 'zeus', minors: [], buildings: { fortifications: 0 } });
    const b = belief(d, s);
    const ctx = dedicationContext(d.catalog, b, 'rival');
    const plannedFort = (ctx.plan.get('eastharbor') ?? []).some((x) => d.catalog.buildings[x]?.slotId === 'fortifications');
    const v = dedicationValue(ctx, 'eastharbor', 'zeus');
    expect(v.service > 0).toBe(plannedFort);
  });
});

describe('AI city dedications: determinism and ties', () => {
  it('the same observation gives the same command, and a full AI turn dedicates the same way twice', () => {
    const { d, s } = rivalTown({ minors: ['athena', 'hermes'] });
    const once = dedicationCandidates(d.catalog, belief(d, s), 'rival');
    const twice = dedicationCandidates(d.catalog, belief(d, deepClone(s)), 'rival');
    expect(twice).toEqual(once);
    const run = () => {
      const events: GameEvent[] = [];
      runAITurn(d.catalog, deepClone(s), { onEvents: (e) => events.push(...e) });
      return events.filter((e) => e.kind === 'TownDedicated');
    };
    const first = run();
    expect(first).toHaveLength(1);
    expect(run()).toEqual(first);
  });

  it('breaks equal values by god ID (stable, no random draw)', () => {
    expect([{ godId: 'b', total: 5 }, { godId: 'a', total: 5 }, { godId: 'c', total: 7 }].sort(byDedicationValue).map((x) => x.godId)).toEqual(['c', 'a', 'b']);
    // With no time left every option is worth 0: the lower ID (Ares before Athena) is taken.
    const { d, s } = rivalTown({ minors: ['athena', 'hermes'] });
    const b = belief(d, s);
    expect(dedicationCandidates(d.catalog, b, 'rival', { endDay: b.day - 1 })).toEqual([{ kind: 'DedicateTown', townId: 'eastharbor', godId: 'athena' }]);
    const t = rivalTown({ minors: ['ares', 'hera'] });
    expect(dedicationCandidates(t.d.catalog, belief(t.d, t.s), 'rival', { endDay: t.s.day - 1 })).toEqual([{ kind: 'DedicateTown', townId: 'eastharbor', godId: 'ares' }]);
  });
});

describe('AI city dedications: switching', () => {
  it('switches when the alternative beats the current god by more than the fee × 1.25, and the rules accept it', () => {
    // Zeus (1 Crystal, no Cyclops dwelling) against Athena (3 Stone, short for the plan; Hoplites built).
    const { d, s } = rivalTown({ patron: 'zeus', minors: ['athena'], dedicated: 'zeus', wallet: { stone: 0 } });
    s.towns['eastharbor']!.buildUsedDay = s.day; // built today: weighed again
    const b = belief(d, s);
    const w = weighSwitch(d.catalog, b, 'rival', 'eastharbor')!;
    expect(w.godId).toBe('athena');
    expect(w.gain).toBeGreaterThanOrEqual(w.fee * SWITCH_MARGIN);
    expect(w.structuralGain).toBeGreaterThanOrEqual(w.fee * SWITCH_MARGIN);
    expect(w.switch).toBe(true);
    const out = rededicationCandidates(d.catalog, b, 'rival');
    expect(out).toEqual([{ kind: 'ScheduleTownRededication', townId: 'eastharbor', godId: 'athena' }]);
    expect(quoteScheduleTownRededication(d.catalog, s, 'rival', 'eastharbor', 'athena').legal).toBe(true);
    const r = processCommand({ catalog: d.catalog }, s, command(s, out[0]!));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.towns['eastharbor']!.dedication!.pending?.godId).toBe('athena');
    // …and never again while that switch is pending.
    const after = buildObservation(d.catalog, r.state, 'rival').belief;
    after.towns['eastharbor']!.buildUsedDay = after.day;
    expect(weighSwitch(d.catalog, after, 'rival', 'eastharbor')).toBeNull();
    expect(rededicationCandidates(d.catalog, after, 'rival')).toEqual([]);
  });

  it('the decision is exactly "both gains reach the fee × 1.25"', () => {
    const cases: Setup[] = [
      { patron: 'zeus', minors: ['athena'], dedicated: 'zeus', wallet: { stone: 0 } },
      { patron: 'zeus', minors: ['athena'], dedicated: 'athena', wallet: { stone: 0 } },
      { minors: ['athena', 'hermes'], dedicated: 'hermes' },
      { minors: ['athena', 'hermes'], dedicated: 'athena' },
      { minors: ['ares', 'hera'], dedicated: 'hera', wallet: { gold: 2600 } },
    ];
    let yes = 0;
    let no = 0;
    for (const c of cases) {
      const { d, s } = rivalTown(c);
      const w = weighSwitch(d.catalog, belief(d, s), 'rival', 'eastharbor')!;
      const need = w.fee * SWITCH_MARGIN;
      expect(w.switch).toBe(w.gain >= need && w.structuralGain >= need);
      if (w.switch) yes++;
      else no++;
    }
    expect(yes).toBeGreaterThan(0);
    expect(no).toBeGreaterThan(0);
  });

  it('a stockpile change alone never causes a switch', () => {
    // Athena (3 Stone) honored; Poseidon (3 Wood) committed. A Stone hoard and no Wood make
    // Poseidon look better with the treasury counted, but not on the empire's structural needs.
    const { d, s } = rivalTown({ minors: ['athena', 'poseidon'], dedicated: 'athena', wallet: { stone: 500, wood: 0 } });
    s.towns['eastharbor']!.buildUsedDay = s.day;
    const b = belief(d, s);
    const w = weighSwitch(d.catalog, b, 'rival', 'eastharbor')!;
    expect(w.godId).toBe('poseidon');
    expect(w.gain).toBeGreaterThanOrEqual(w.fee * SWITCH_MARGIN);
    expect(w.structuralGain).toBeLessThan(w.fee * SWITCH_MARGIN);
    expect(w.switch).toBe(false);
    expect(rededicationCandidates(d.catalog, b, 'rival')).toEqual([]);
  });

  it('weighs a switch only after a construction in the town or with a committed god honored nowhere', () => {
    const { d, s } = rivalTown({ minors: ['athena'], dedicated: 'athena' });
    const b = belief(d, s);
    const town = b.towns['eastharbor']!;
    town.buildUsedDay = 0;
    expect(switchTriggered(d.catalog, b, 'rival', town)).toBe(false);
    town.buildUsedDay = b.day;
    expect(switchTriggered(d.catalog, b, 'rival', town)).toBe(true);
    town.buildUsedDay = 0;
    (b.players['rival']!.pantheon as { minorGodIds: string[] }).minorGodIds.push('hermes'); // a new commitment
    expect(switchTriggered(d.catalog, b, 'rival', town)).toBe(true);
  });

  it('keeps the build reserve: no switch it cannot pay above the reserve', () => {
    const { d, s } = rivalTown({ patron: 'zeus', minors: ['athena'], dedicated: 'zeus', wallet: { stone: 0, gold: 900 } });
    s.towns['eastharbor']!.buildUsedDay = s.day;
    expect(rededicationCandidates(d.catalog, belief(d, s), 'rival')).toEqual([]);
  });
});

describe('AI city dedications: commands, Temple II and commitments', () => {
  it('its first dedication passes the rules quote and is accepted during an AI turn', () => {
    const { d, s } = rivalTown({ minors: ['athena'] });
    const [c] = dedicationCandidates(d.catalog, belief(d, s), 'rival') as Extract<CommandPayload, { kind: 'DedicateTown' }>[];
    expect(quoteDedicateTown(d.catalog, s, 'rival', c!.townId, c!.godId).legal).toBe(true);
    expect(processCommand({ catalog: d.catalog }, s, command(s, c!)).ok).toBe(true);
    const events: GameEvent[] = [];
    const end = runAITurn(d.catalog, s, { onEvents: (e) => events.push(...e) });
    const dedicated = events.find((e): e is Extract<GameEvent, { kind: 'TownDedicated' }> => e.kind === 'TownDedicated');
    expect(dedicated).toMatchObject({ townId: 'eastharbor', playerId: 'rival', godId: 'athena' });
    expect(events.filter((e) => e.kind === 'TownRededicationScheduled')).toHaveLength(0);
    expect(end.towns['eastharbor']!.dedication?.activeGodId).toBe('athena');
  });

  it('values Temple II more with dedications on, and only Temple II', () => {
    const on = rivalTown({ minors: [], buildings: { pantheon_temple: 1, civic_hall: 2 } });
    const b = belief(on.d, on.s);
    const ctx = { belief: b, playerId: 'rival', townId: 'eastharbor' };
    expect(templeDedicationBonus(on.d.catalog, b, 'rival', 'eastharbor', 'temple_2')).toBeGreaterThan(0);
    expect(templeDedicationBonus(on.d.catalog, b, 'rival', 'eastharbor', 'temple_1')).toBe(0);
    expect(templeDedicationBonus(on.d.catalog, b, 'rival', 'eastharbor', 'market')).toBe(0);
    expect(buildScore(on.d.catalog, 'temple_2', 1, undefined, ctx)).toBeGreaterThan(buildScore(on.d.catalog, 'temple_2', 1));
    expect(buildScore(on.d.catalog, 'market', 1, undefined, ctx)).toBe(buildScore(on.d.catalog, 'market', 1));
    const off = rivalTown({ minors: [], buildings: { pantheon_temple: 1, civic_hall: 2 }, feature: false });
    const ob = belief(off.d, off.s);
    expect(buildScore(off.d.catalog, 'temple_2', 1, undefined, { belief: ob, playerId: 'rival', townId: 'eastharbor' })).toBe(buildScore(off.d.catalog, 'temple_2', 1));
  });

  it('scores commitments by the blessing that applies in the match (legacy mode: exactly as authored)', () => {
    const off = rivalTown({ minors: [], feature: false });
    const ob = belief(off.d, off.s);
    for (const g of ['hermes', 'athena', 'demeter', 'norse_njord']) {
      const raw = off.d.catalog.gods[g]!.benefits.reduce((n, e) => n + effectScore(e), 0);
      expect(godCommitScore(off.d.catalog, ob, 'rival', g)).toBe(raw);
    }
    const on = rivalTown({ minors: [] });
    const nb = belief(on.d, on.s);
    // Hermes' +250 Gold a day is replaced by his city profile: it no longer counts as income.
    const retained = godBenefitsInMatch(on.d.catalog, nb, 'hermes').retained.reduce((n, e) => n + effectScore(e), 0);
    expect(retained).toBeLessThan(off.d.catalog.gods['hermes']!.benefits.reduce((n, e) => n + effectScore(e), 0));
    expect(godCommitScore(on.d.catalog, nb, 'rival', 'hermes')).toBeGreaterThan(retained); // plus the dedication it brings
  });
});
