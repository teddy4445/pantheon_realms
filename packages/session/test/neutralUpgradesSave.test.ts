/**
 * Neutral upgrades and saves (battle FX & neutral upgrades, 2026-10-15): a
 * stack of an upgraded neutral round-trips through a save file and plays on
 * identically; a save holding only base neutrals (as every save written before
 * the upgrades does) loads unchanged — nothing is silently upgraded — and an old
 * command without a form still hires the base creature.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { createMissionMatch } from '@pr/campaign';
import { campTrainingLeft, canonicalStateHash, missionSite, type CreatureStackState, type MatchState } from '@pr/rules';
import { buildObservation, strategicCandidates } from '@pr/ai';
import { GameSession, createEnvelope, parseEnvelope, serializeEnvelope } from '../src';

const catalog = loadCatalog();
const SITE = 'wo2_root_runners';

/** Hervor at the Root-Runner Grove (The Winter Oath, chapter 2) with base Root-Runners in slot 2. */
function grove(matchId: string): GameSession {
  const { match } = createMissionMatch(catalog, 'winter_oath_v2_m02', { matchId, carryover: null, startingGodId: 'zeus' });
  const m = match as MatchState;
  const hero = m.heroes['hervor']!;
  hero.position = { ...missionSite(catalog, m, SITE)!.coord };
  hero.army.slots = [{ stackId: 's-d', creatureId: 'norse_draugr', count: 10 }, { stackId: 's-rr', creatureId: 'root_runner', count: 6 }, null, null, null, null, null] as (CreatureStackState | null)[];
  (m.players['player']!.wallet as Record<string, number>).gold = 5000;
  return GameSession.fromSnapshot(catalog, { match: m, campaign: null });
}

const roundTrip = (s: GameSession, id: string) => {
  const env = createEnvelope(catalog, s.snapshot(), { id, kind: 'manual', name: id, savedAt: '2026-10-16T12:00:00Z' });
  const parsed = parseEnvelope(catalog, serializeEnvelope(env));
  expect(parsed.compatibility.status).toBe('ok');
  return GameSession.fromSnapshot(catalog, parsed.envelope!.snapshot);
};

describe('saves with neutral upgrades', () => {
  it('an upgraded stack (hired and trained) round-trips and plays on identically', () => {
    const s = grove('save-nu-1');
    expect(s.dispatch({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 2, creatureId: 'crownroot_runner' }).ok).toBe(true);
    expect(s.dispatch({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 2 }).ok).toBe(true);
    const restored = roundTrip(s, 'nu-1');
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    const slots = restored.state.heroes['hervor']!.army.slots.map((x) => (x ? [x.creatureId, x.count] : null));
    expect(slots).toEqual([['norse_draugr', 10], ['root_runner', 4], ['crownroot_runner', 4], null, null, null, null]);
    // The same orders on both copies give the same state.
    for (const g of [s, restored]) {
      expect(g.dispatch({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 4 }).ok).toBe(true);
      expect(g.dispatch({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 1, creatureId: 'crownroot_runner' }).ok).toBe(true);
    }
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    expect(restored.state.heroes['hervor']!.army.slots.filter((x) => x?.creatureId === 'crownroot_runner').map((x) => x!.count)).toEqual([9]);
  });

  it('a base-only save (as written before the upgrades) loads unchanged; an old command hires the base form', () => {
    const s = grove('save-nu-old');
    const env = createEnvelope(catalog, s.snapshot(), { id: 'old', kind: 'manual', name: 'old', savedAt: '2026-10-14T12:00:00Z' });
    const text = serializeEnvelope(env);
    // Nothing in the file names an upgraded form.
    for (const id of ['dawncrest_pegasus', 'crownroot_runner', 'crested_serpopard', 'dreamtusk_baku', 'ridgeback_afanc', 'crownfin_ahuitzotl']) expect(text.includes(id), id).toBe(false);
    const parsed = parseEnvelope(catalog, text);
    expect(parsed.compatibility.status).toBe('ok');
    const restored = GameSession.fromSnapshot(catalog, parsed.envelope!.snapshot);
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    expect(restored.state.heroes['hervor']!.army.slots[1]).toEqual({ stackId: 's-rr', creatureId: 'root_runner', count: 6 });
    expect(restored.dispatch({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 2 }).ok).toBe(true);
    expect(restored.state.heroes['hervor']!.army.slots[1]).toEqual({ stackId: 's-rr', creatureId: 'root_runner', count: 8 });
    expect(restored.state.world.sites[SITE]!.stock).toBe(6);
  });

  it('the strategic AI names the form it hires (2026-10-16); an old command without a form still hires the base creature', () => {
    const s = grove('save-nu-ai');
    (s.state.players['player']!.wallet as Record<string, number>).gold = 9000;
    // The AI sees what its empire has explored: the map is explored here.
    for (const fog of Object.values(s.state.fog)) fog.explored = fog.explored.map(() => 1);
    const all = strategicCandidates(catalog, buildObservation(catalog, s.state, 'player'));
    const cands = all.filter((c) => c.kind === 'RecruitFromCamp');
    expect(cands.length).toBe(1);
    // A full week's stock with Gold to spare: the upgrade adds more strength.
    expect(cands[0]).toMatchObject({ creatureId: 'crownroot_runner', quantity: 8 });
    // The old command shape (no form) is still the base creature, after a round trip too.
    const restored = roundTrip(s, 'nu-ai');
    expect(restored.dispatch({ kind: 'RecruitFromCamp', heroId: 'hervor', siteId: SITE, quantity: 2 }).ok).toBe(true);
    expect(restored.state.heroes['hervor']!.army.slots[1]).toMatchObject({ creatureId: 'root_runner', count: 8 });
    expect(s.dispatch(cands[0]!).ok).toBe(true);
    expect(s.state.heroes['hervor']!.army.slots.find((x) => x?.creatureId === 'crownroot_runner')!.count).toBe(8);
  });
});

describe('saves and the weekly training allowance (owner decision 2026-10-16)', () => {
  it('the week’s training count round-trips: what is left stays left, the same refusal, the same next week', () => {
    const s = grove('save-nu-cap');
    s.state.heroes['hervor']!.army.slots[1] = { stackId: 's-rr', creatureId: 'root_runner', count: 12 } as CreatureStackState;
    expect(s.dispatch({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 5 }).ok).toBe(true);
    const restored = roundTrip(s, 'nu-cap');
    expect(restored.state.world.sites[SITE]).toMatchObject({ trainedThisWeek: 5, trainedWeek: 1 });
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    expect(campTrainingLeft(catalog, restored.state, SITE)).toBe(3);
    for (const g of [s, restored]) {
      const r = g.dispatch({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 4 });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.rejection).toEqual({ code: 'no_population', message: 'Its trainers can take 3 more this week (8 a week)' });
      expect(g.dispatch({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 3 }).ok).toBe(true);
      expect(campTrainingLeft(catalog, g.state, SITE)).toBe(0);
    }
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    // Saved again and loaded once more: the count of a past week counts as none in the next.
    const again = roundTrip(restored, 'nu-cap-2');
    const st = again.state as MatchState;
    st.day = 8;
    expect(campTrainingLeft(catalog, st, SITE)).toBe(8);
  });

  it('a 1.3.0-style save (no training fields, trainings already made) loads with this week’s whole allowance', () => {
    const s = grove('save-nu-130');
    // A 1.3.0 game trained here before the allowance existed: its counter, no site fields.
    expect(s.dispatch({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 2 }).ok).toBe(true);
    const m = s.state as MatchState;
    const site = m.world.sites[SITE]!;
    delete site.trainedThisWeek;
    delete site.trainedWeek;
    const env = createEnvelope(catalog, s.snapshot(), { id: 'v130', kind: 'manual', name: 'v130', savedAt: '2026-10-15T20:00:00Z' });
    const text = serializeEnvelope(env);
    expect(text.includes('trainedThisWeek')).toBe(false);
    expect(text.includes('trainedWeek')).toBe(false);
    const parsed = parseEnvelope(catalog, text);
    expect(parsed.compatibility.status).toBe('ok');
    const restored = GameSession.fromSnapshot(catalog, parsed.envelope!.snapshot);
    expect(restored.state.mission.counters['trained:root_runner']).toBe(2);
    expect(campTrainingLeft(catalog, restored.state, SITE)).toBe(8);
    expect(restored.dispatch({ kind: 'TrainAtCamp', heroId: 'hervor', siteId: SITE, fromCreatureId: 'root_runner', quantity: 4 }).ok).toBe(true);
    expect(restored.state.world.sites[SITE]).toMatchObject({ trainedThisWeek: 4, trainedWeek: 1 });
    expect(campTrainingLeft(catalog, restored.state, SITE)).toBe(4);
  });
});
