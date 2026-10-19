/**
 * City dedications (handoff §09) — the screens' view models and formatting: rare-growth
 * words (never raw quarter counters), the payout day, the saving line, the locked
 * "future choice" reasons, the god cards' empire blessing per rules mode, the growth
 * breakdown, the weekly "City blessings" from the dawn's events, and that a legacy game
 * shows none of it. Built on real matches through the rules' processor (no UI prices).
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadCatalog } from '@pr/content';
import { compileSkirmishMap, createGeneratedMatch } from '@pr/campaign';
import { GameDriver } from '@pr/testing';
import { townDedicationView, type MatchState } from '@pr/rules';
import {
  blessingMode,
  blessingOnlyThroughCities,
  cityBlessingText,
  cityBlessingsFromEvents,
  dedicationsOn,
  empireBlessing,
  giftTitle,
  godCityOptions,
  godCityProfile,
  growthBreakdown,
  growthBreakdownText,
  growthProgressText,
  growthRateText,
  possessive,
  savingPriceText,
  savingText,
  serviceBuildingArt,
  townBenefitRows,
} from '../src/app/dedication';
import { GodBenefits } from '../src/components/godIcons';

const catalog = loadCatalog();
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** A two-empire Golden Fords skirmish (city dedications on) with the human's town at Temple II. */
function cityGame(pantheonId: string, patron: string, opts: { day?: number; legacy?: boolean } = {}) {
  const gen = compileSkirmishMap(catalog, 'golden_fords', [
    { pantheonId, controller: 'human' },
    { pantheonId: pantheonId === 'greek' ? 'norse' : 'greek', controller: 'ai' },
  ]);
  const { match } = createGeneratedMatch(catalog, gen, { matchId: `ut-ded-${pantheonId}`, startingGodId: patron });
  const town = Object.values(match.towns).find((t) => t.ownerId === 'player')!;
  (town.buildings as Record<string, number>)['pantheon_temple'] = 2;
  (town.buildings as Record<string, number>)['civic_hall'] = 3;
  Object.assign(match.players['player']!.wallet, { gold: 30_000, wood: 60, stone: 60, crystal: 40, favor: 80 });
  if (opts.day) (match as { day: number }).day = opts.day;
  if (opts.legacy) delete (match.scenario.features as Record<string, unknown>).cityDedicationsV1;
  return { d: new GameDriver(match, catalog), townId: town.id };
}

describe('formatting', () => {
  it('rare growth reads as words with the weeks remaining, tiers 1–5 as a weekly number', () => {
    expect(growthProgressText('Bennu', 2, 2)).toBe('One extra Bennu every 2 eligible weeks — 1 week remaining');
    expect(growthProgressText('Bennu', 2, 0)).toBe('One extra Bennu every 2 eligible weeks — 2 weeks remaining');
    expect(growthProgressText('Cyclops', 1, 0)).toBe('One extra Cyclops every 4 eligible weeks — 4 weeks remaining');
    expect(growthProgressText('Cyclops', 1, 3)).toBe('One extra Cyclops every 4 eligible weeks — 1 week remaining');
    expect(growthProgressText('Cyclops', 1, null)).toBe('One extra Cyclops every 4 eligible weeks');
    expect(growthProgressText('Hoplite', 8, 0)).toBe('+2 each week');
    expect(growthRateText(4)).toBe('+1 each week');
    expect(growthRateText(2)).toBe('+1 every 2 eligible weeks');
    // Never a quarter counter in player text.
    for (const q of [1, 2, 4, 8]) for (const s of [0, 1, 2, 3]) expect(growthProgressText('X', q, s)).not.toMatch(/quarter|\/4|credit/i);
  });

  it('a weekly gift always says "each week" (never a daily income)', () => {
    expect(giftTitle({ stone: 3 })).toBe('+3 Stone each week');
    expect(giftTitle({ gold: 600 })).toBe('+600 Gold each week');
    expect(giftTitle({ gold: 300, wood: 2 })).toBe('+300 Gold, +2 Wood each week');
  });

  it('the saving line names the god and the Gold saved, with the normal and final price in words', () => {
    const s = { godId: 'athena', serviceId: 'training' as const, percent: 20, normalGold: 1000, finalGold: 800, savedGold: 200 };
    expect(savingText(catalog, s)).toBe('Athena’s patronage — saves 200 Gold');
    expect(savingPriceText(s)).toBe('normally 1,000 Gold, now 800');
    expect(savingText(catalog, { ...s, godId: 'ares' })).toBe('Ares’ patronage — saves 200 Gold');
    expect(possessive('Mictlantecuhtli')).toBe('Mictlantecuhtli’s');
  });

  it('every god has an illustrated profile with an existing building picture for its service in its own town', () => {
    for (const p of Object.values(catalog.cityDedicationProfiles ?? {})) {
      const prof = godCityProfile(catalog, p.godId);
      expect(prof, p.godId).not.toBeNull();
      expect(prof!.giftTitle, p.godId).toMatch(/each week$/);
      expect(prof!.creatureId, p.godId).toBeTruthy();
      const god = catalog.gods[p.godId]!;
      const art = serviceBuildingArt(catalog, god.pantheonId, prof!.rule, p.favoredFamilyId);
      expect(art?.artAssetId, `${p.godId} ${p.serviceId}`).toMatch(new RegExp(`^town\\.${god.pantheonId}\\.`));
    }
  });
});

describe('the temple pane', () => {
  it('first dedication: three rows — next payout day, growth blocked without the dwelling, service with its own status', () => {
    const { d, townId } = cityGame('egyptian', 'egyptian_ra', { day: 3 });
    d.do({ kind: 'SelectGod', godId: 'egyptian_isis' });
    d.do({ kind: 'DedicateTown', townId, godId: 'egyptian_isis' });
    const town = d.state.towns[townId]!;
    const view = townDedicationView(catalog, d.state, townId, 'player');
    expect(view.active).toMatchObject({ godId: 'egyptian_isis', state: 'active' });
    const rows = townBenefitRows(catalog, d.state, town, view);
    expect(rows.map((r) => r.kind)).toEqual(['resource', 'growth', 'service']);
    expect(rows[0]).toMatchObject({ title: '+1 Crystal each week', ok: true, status: 'Next gift on day 8' });
    // Bennu (tier 6) without its dwelling: the reason, not a counter.
    expect(rows[1]!.ok).toBe(false);
    expect(rows[1]!.status).toBe('Build the Bennu dwelling to begin');
    expect(rows[1]!.title).toBe('One extra Bennu every 2 eligible weeks');
    expect(rows[2]).toMatchObject({ kind: 'service', title: 'Library construction', ok: true });
    expect(rows[2]!.art).toMatchObject({ type: 'building' });
  });

  it('rare growth with saved progress: "One extra Bennu every 2 eligible weeks — 1 week remaining"', () => {
    const { d, townId } = cityGame('egyptian', 'egyptian_ra', { day: 3 });
    d.do({ kind: 'SelectGod', godId: 'egyptian_isis' });
    const town0 = d.state.towns[townId]!;
    const bennuSlot = catalog.townArchetypes[town0.archetypeId]!.slots.find((s) => s.kind === 'dwelling' && s.chain.some((b) => catalog.buildings[b]?.dwelling?.familyId === 'egyptian_bennu'))!;
    (town0.buildings as Record<string, number>)[bennuSlot.id] = 1;
    d.do({ kind: 'DedicateTown', townId, godId: 'egyptian_isis' });
    d.state.towns[townId]!.dedication!.growthCredits['egyptian_bennu'] = 2;
    const view = townDedicationView(catalog, d.state, townId, 'player');
    const rows = townBenefitRows(catalog, d.state, d.state.towns[townId]!, view);
    expect(rows[1]!.title).toBe('One extra Bennu every 2 eligible weeks — 1 week remaining');
    expect(rows[1]!.status).toBe('The next Bennu arrives on day 8');
  });

  it('a dormant dedication (Temple II lost) shows its reason on every row', () => {
    const { d, townId } = cityGame('greek', 'zeus', { day: 2 });
    d.do({ kind: 'DedicateTown', townId, godId: 'zeus' });
    (d.state.towns[townId]!.buildings as Record<string, number>)['pantheon_temple'] = 1;
    const view = townDedicationView(catalog, d.state, townId, 'player');
    expect(view.active?.state).toBe('dormant');
    const rows = townBenefitRows(catalog, d.state, d.state.towns[townId]!, view);
    for (const r of rows) {
      expect(r.ok, r.kind).toBe(false);
      expect(r.status, r.kind).toMatch(/Temple level II/);
    }
  });

  it('selection: patron and committed gods are actionable; the others are locked future choices with the commitment reason', () => {
    const { d, townId } = cityGame('greek', 'zeus', { day: 2 });
    d.do({ kind: 'SelectGod', godId: 'athena' });
    const view = townDedicationView(catalog, d.state, townId, 'player');
    const actionable = view.options.filter((o) => o.committed).map((o) => o.godId);
    expect(actionable).toEqual(['zeus', 'athena']);
    const future = view.options.filter((o) => !o.committed);
    expect(future.length).toBeGreaterThan(0);
    for (const o of future) {
      expect(o.selectable, o.godId).toBe(false);
      expect(o.reason, o.godId).toBeTruthy();
    }
    // Ares shares Athena's choice group: excluded for good; Hermes is the next choice.
    expect(future.find((o) => o.godId === 'ares')!.reason).not.toMatch(/^Commit to Ares first/);
    expect(future.find((o) => o.godId === 'hermes')!.reason).toMatch(/Hermes/);
  });
});

describe('god cards and the empire blessing per rules mode', () => {
  it('city mode drops the replaced economy; six gods keep no empire-wide blessing; legacy keeps the authored text', () => {
    const none = ['demeter', 'norse_freyja', 'norse_njord', 'egyptian_sobek', 'japanese_inari', 'mesoamerican_tlaloc'];
    for (const g of none) {
      const city = empireBlessing(catalog, g, 'city');
      expect(blessingOnlyThroughCities(city), g).toBe(true);
      const html = decode(renderToStaticMarkup(<GodBenefits catalog={catalog} god={catalog.gods[g]!} blessing={city} />));
      expect(html, g).toContain('Their blessing now comes through city dedications'.replace('Their', 'their'));
      // Legacy and the encyclopedia outside a game: the classic text.
      expect(empireBlessing(catalog, g, 'legacy').summary).toEqual(catalog.gods[g]!.benefitSummary);
      expect(empireBlessing(catalog, g, 'outside').summary).toEqual(catalog.gods[g]!.benefitSummary);
    }
    const hermes = empireBlessing(catalog, 'hermes', 'city');
    expect(hermes.summary).toEqual(['+15% land movement for your heroes.']);
    expect(hermes.retained.every((e) => e.type !== 'daily_income' && e.type !== 'weekly_growth_bonus')).toBe(true);
    // A god without replaced effects keeps its blessing unchanged.
    expect(empireBlessing(catalog, 'athena', 'city').summary).toEqual(catalog.gods['athena']!.benefitSummary);
  });

  it('the player’s cities on a god card: honored, could switch with fee and day, what needs building first; never a rededication', () => {
    const { d, townId } = cityGame('greek', 'zeus', { day: 2 });
    d.do({ kind: 'SelectGod', godId: 'athena' });
    d.do({ kind: 'DedicateTown', townId, godId: 'zeus' });
    const zeus = godCityOptions(catalog, d.state, 'player', 'zeus');
    expect(zeus[0]).toMatchObject({ townId, kind: 'honors' });
    const athena = godCityOptions(catalog, d.state, 'player', 'athena');
    expect(athena[0]!.kind).toBe('switch');
    expect(athena[0]!.text).toContain('500 Gold');
    expect(athena[0]!.text).toContain('day 8');
    // No Training Academy in the town: the service waits for it.
    expect(athena[0]!.serviceMissing).toMatch(/Training Academy/);
    // Uncommitted gods: only after a commitment.
    expect(godCityOptions(catalog, d.state, 'player', 'hermes')[0]!.kind).toBe('later');
    // Listing changed nothing.
    expect(d.state.towns[townId]!.dedication!.activeGodId).toBe('zeus');
  });
});

describe('recruitment growth breakdown', () => {
  it('base + fortifications + other effects + the local god increment (added once, not multiplied)', () => {
    const { d, townId } = cityGame('greek', 'zeus', { day: 2 });
    d.do({ kind: 'SelectGod', godId: 'athena' });
    d.do({ kind: 'DedicateTown', townId, godId: 'athena' });
    const town = d.state.towns[townId]!;
    const g = growthBreakdown(catalog, d.state, town, 'hoplite');
    expect(g.base).toBe(catalog.families['hoplite']!.baseGrowth);
    expect(g.god).toMatchObject({ godId: 'athena', added: 2, blocked: null });
    expect(g.total).toBe(g.base + g.fortification + g.other + 2);
    expect(growthBreakdownText(catalog, g)).toMatch(/^\d+ base .*\+ 2 Athena = \d+ next week$/);
    // Another family: no god term.
    expect(growthBreakdown(catalog, d.state, town, 'peltast').god).toBeNull();
  });
});

describe('weekly summary: one grouped City blessings section from the dawn’s events', () => {
  it('lists the gift and the new stock with the pool it reached; other players’ events are not shown', () => {
    const { d, townId } = cityGame('greek', 'zeus', { day: 7 });
    d.do({ kind: 'SelectGod', godId: 'athena' });
    d.do({ kind: 'DedicateTown', townId, godId: 'athena' });
    const wallet0 = d.state.players['player']!.wallet.stone;
    const from = d.events.length;
    d.endDay();
    expect(d.state.day).toBe(8);
    const events = d.events.slice(from);
    const summary = cityBlessingsFromEvents(catalog, d.state, events, 'player')!;
    expect(summary).not.toBeNull();
    expect(summary.week).toBe(2);
    const line = summary.lines.find((l) => l.townId === townId)!;
    expect(line.gift?.stone).toBe(3);
    expect(line.growth).toMatchObject({ familyId: 'hoplite', added: 2 });
    expect(line.growth!.text).toMatch(/^\+2 Hoplites \(now \d+ in the pool\)$/);
    expect(cityBlessingText(catalog, line)).toContain('+3 Stone');
    expect(d.state.players['player']!.wallet.stone).toBeGreaterThanOrEqual(wallet0 + 3);
    // Building the summary again (opening it) pays nothing.
    const before = JSON.stringify(d.state.players['player']!.wallet);
    cityBlessingsFromEvents(catalog, d.state, events, 'player');
    expect(JSON.stringify(d.state.players['player']!.wallet)).toBe(before);
    expect(cityBlessingsFromEvents(catalog, d.state, events, 'p2')).toBeNull();
  });

  it('rare growth progress and an activated switch appear in the same section', () => {
    const { d, townId } = cityGame('greek', 'zeus', { day: 7 });
    d.do({ kind: 'SelectGod', godId: 'athena' });
    d.do({ kind: 'DedicateTown', townId, godId: 'athena' });
    d.do({ kind: 'ScheduleTownRededication', townId, godId: 'zeus' });
    const from = d.events.length;
    d.endDay();
    const s = cityBlessingsFromEvents(catalog, d.state, d.events.slice(from), 'player')!;
    const line = s.lines.find((l) => l.townId === townId)!;
    expect(line.activated).toMatchObject({ godId: 'zeus', fromGodId: 'athena' });
    expect(line.gift?.crystal).toBe(1);
    // Cyclopes (tier 7) need their dwelling: no growth line without it.
    expect(line.growth).toBeNull();
    expect(cityBlessingText(catalog, line)).toContain('now honors Zeus (was Athena)');
  });
});

describe('legacy games show none of it', () => {
  it('no flag: dedications off, no city options, the classic god text, no rows', () => {
    const { d, townId } = cityGame('greek', 'zeus', { legacy: true, day: 2 });
    const st: MatchState = d.state;
    expect(dedicationsOn(st)).toBe(false);
    expect(blessingMode(st)).toBe('legacy');
    expect(blessingMode(null)).toBe('outside');
    expect(godCityOptions(catalog, st, 'player', 'zeus')).toEqual([]);
    const view = townDedicationView(catalog, st, townId, 'player');
    expect(view.enabled).toBe(false);
    expect(townBenefitRows(catalog, st, st.towns[townId]!, view)).toEqual([]);
    expect(growthBreakdown(catalog, st, st.towns[townId]!, 'hoplite').god).toBeNull();
    d.reject({ kind: 'DedicateTown', townId, godId: 'zeus' });
  });
});
