/**
 * City dedications and saves (app 1.5.0): a new-mode save restores every town's active
 * god, pending switch, growth credits and processed-week stamp exactly and plays on
 * identically (no payout repeated or lost); a save written by 1.4.0 — no feature flag, no
 * dedication fields — loads in legacy mode: the old god economics, no dedications, nothing
 * switched on or assigned after the load.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { canonicalStateHash, cityDedicationsEnabled, familyDwellingSlotId, projectedIncome, type GameEvent, type MatchState } from '@pr/rules';
import { GameSession, createEnvelope, parseEnvelope, serializeEnvelope } from '../src';

const catalog = loadCatalog();
const W = 'westharbor';

function session(matchId: string): GameSession {
  const s = GameSession.newScenario(catalog, 'skirmish_twin_harbors', matchId, 'zeus');
  const m = s.state as MatchState;
  m.scenario = { ...m.scenario, features: { ...m.scenario.features!, weeklyEvents: false } };
  const t = m.towns[W]!;
  t.buildings['pantheon_temple'] = 2;
  t.buildings[familyDwellingSlotId(catalog, t, 'minotaur')!] = 1;
  m.players['player']!.pantheon.minorGodIds.push('hades', 'athena', 'hermes');
  m.players['player']!.wallet = { ...m.players['player']!.wallet, gold: 10000 };
  return s;
}

/** Every seat ends its turn (no AI) until the next dawn. */
function nextDay(s: GameSession): GameEvent[] {
  const out: GameEvent[] = [];
  const day = s.state.day;
  for (let i = 0; i < 10 && s.state.day === day; i++) {
    const r = s.dispatch({ kind: 'EndTurn' }, s.state.activePlayerId);
    if (!r.ok) throw new Error(r.rejection.message);
    out.push(...r.events);
  }
  return out;
}

function roundTrip(s: GameSession, id: string): GameSession {
  const env = createEnvelope(catalog, s.snapshot(), { id, kind: 'manual', name: id, savedAt: '2026-10-17T12:00:00Z' });
  const parsed = parseEnvelope(catalog, serializeEnvelope(env));
  expect(parsed.compatibility.status).toBe('ok');
  return GameSession.fromSnapshot(catalog, parsed.envelope!.snapshot);
}

describe('saves with city dedications', () => {
  it('a new-mode save restores active, pending, credits and stamp exactly and plays on identically', () => {
    const s = session('save-ded-1');
    expect(s.dispatch({ kind: 'DedicateTown', townId: W, godId: 'hades' }).ok).toBe(true);
    while (s.state.day < 9) nextDay(s);
    expect(s.dispatch({ kind: 'ScheduleTownRededication', townId: W, godId: 'athena' }).ok).toBe(true);
    const record = s.state.towns[W]!.dedication!;
    expect(record).toEqual({ activeGodId: 'hades', ownerId: 'player', growthCredits: { minotaur: 2 }, lastProcessedWeek: 2, pending: { godId: 'athena', requestedBy: 'player', activationWeek: 3 } });
    const restored = roundTrip(s, 'ded-1');
    expect(restored.state.scenario.features?.cityDedicationsV1).toBe(true);
    expect(restored.state.towns[W]!.dedication).toEqual(record);
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    // Both copies reach the next boundary: the switch activates once, Athena's gift is paid once.
    const runs = [s, restored].map((g) => {
      const ev: GameEvent[] = [];
      while (g.state.day < 15) ev.push(...nextDay(g));
      return ev.filter((e) => e.kind === 'TownRededicationActivated' || e.kind === 'CityGiftGranted' || e.kind === 'CityDevotionGrowthApplied').map((e) => e.kind);
    });
    expect(runs[0]).toEqual(['TownRededicationActivated', 'CityGiftGranted', 'CityDevotionGrowthApplied']);
    expect(runs[1]).toEqual(runs[0]);
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    // Loading again after the payout does not pay the week again.
    const again = roundTrip(restored, 'ded-1b');
    expect(again.state.towns[W]!.dedication!.lastProcessedWeek).toBe(3);
    const gold = again.state.players['player']!.wallet.gold;
    nextDay(again);
    expect(again.state.players['player']!.wallet.gold - gold).toBe(projectedIncome({ catalog, state: restored.state }, 'player').gold);
  });

  it('a 1.4.0-style save (no flag, no dedication fields) loads in legacy mode and stays there', () => {
    const s = session('save-ded-old');
    const m = JSON.parse(JSON.stringify(s.state)) as MatchState;
    // What 1.4.0 wrote: the features without the new flag; towns without dedication records.
    const { cityDedicationsV1: _drop, ...oldFeatures } = m.scenario.features!;
    void _drop;
    m.scenario = { ...m.scenario, features: oldFeatures };
    for (const t of Object.values(m.towns)) expect(t.dedication).toBeUndefined();
    const old = GameSession.fromSnapshot(catalog, { match: m, campaign: null });
    const text = serializeEnvelope(createEnvelope(catalog, old.snapshot(), { id: 'old', kind: 'manual', name: 'old', savedAt: '2026-10-16T12:00:00Z' }));
    expect(text.includes('cityDedicationsV1')).toBe(false);
    expect(text.includes('"dedication"')).toBe(false);
    const loaded = roundTrip(old, 'old');
    expect(cityDedicationsEnabled(loaded.state)).toBe(false);
    // The old god economics: Hermes still adds his 250 Gold a day.
    const newMode = session('save-ded-new');
    expect(projectedIncome({ catalog, state: loaded.state }, 'player').gold - projectedIncome({ catalog, state: newMode.state }, 'player').gold).toBe(250);
    // No dedication can be made, and none appears over two weeks of play.
    const r = loaded.dispatch({ kind: 'DedicateTown', townId: W, godId: 'zeus' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.code).toBe('not_in_scope');
    const ev: GameEvent[] = [];
    while (loaded.state.day < 16) ev.push(...nextDay(loaded));
    expect(Object.values(loaded.state.towns).some((t) => t.dedication !== undefined)).toBe(false);
    expect(loaded.state.scenario.features?.cityDedicationsV1).toBeUndefined();
    expect(ev.some((e) => e.kind.startsWith('Town') && e.kind.includes('Dedicat'))).toBe(false);
    expect(ev.some((e) => e.kind === 'CityGiftGranted' || e.kind === 'CityDevotionGrowthApplied')).toBe(false);
  });
});
