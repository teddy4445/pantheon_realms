/**
 * Scouting intel and saves (expedition kit §12, `scoutingIntelV1`): a new-mode save keeps
 * every player's last-known snapshots exactly (stage, day, position, permitted fields) and
 * plays on identically; a save written before the feature — no flag, no `intel` — loads with
 * the legacy rule (full information about visible armies) and never gains snapshots.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { armyIntel, canonicalStateHash, lastKnownIntel, scoutingIntelEnabled, type MatchState } from '@pr/rules';
import { GameSession, createEnvelope, parseEnvelope, serializeEnvelope } from '../src';

const catalog = loadCatalog();
const at = (q: number) => ({ q, r: 7 });

function session(matchId: string): GameSession {
  const s = GameSession.newScenario(catalog, 'skirmish_twin_harbors', matchId, 'zeus');
  const m = s.state as MatchState;
  m.scenario = { ...m.scenario, features: { ...m.scenario.features!, weeklyEvents: false } };
  for (const fog of Object.values(m.fog)) fog.explored = fog.explored.map(() => 1);
  m.heroes['alexios']!.position = at(15);
  m.heroes['alexios']!.movementPoints = 5000;
  m.heroes['rival_odysseus']!.position = at(22);
  m.heroes['rival_odysseus']!.army.slots[0]!.count = 20;
  m.heroes['rival_odysseus']!.army.slots[1]!.count = 8;
  return s;
}

function roundTrip(s: GameSession, id: string): GameSession {
  const env = createEnvelope(catalog, s.snapshot(), { id, kind: 'manual', name: id, savedAt: '2026-10-17T12:00:00Z' });
  const parsed = parseEnvelope(catalog, serializeEnvelope(env));
  expect(parsed.compatibility.status).toBe('ok');
  return GameSession.fromSnapshot(catalog, parsed.envelope!.snapshot);
}

describe('saves with scouting intel', () => {
  it('a new-mode save restores the snapshots exactly and plays on identically', () => {
    const s = session('save-intel-1');
    expect(s.dispatch({ kind: 'MoveHero', heroId: 'alexios', destination: at(19) }).ok).toBe(true);
    expect(s.dispatch({ kind: 'MoveHero', heroId: 'alexios', destination: at(12) }).ok).toBe(true);
    const snap = lastKnownIntel(s.state, 'player', 'rival_odysseus');
    expect(snap).toMatchObject({ stage: 'identified', lastSeenCoord: at(22), observedDay: 1 });
    const restored = roundTrip(s, 'intel-1');
    expect(restored.state.intel).toEqual(s.state.intel);
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    // Out of vision after the load as before it: no current report, the same last-known one.
    expect(armyIntel(catalog, restored.state, 'player', 'rival_odysseus')).toBeNull();
    for (const g of [s, restored]) {
      expect(g.dispatch({ kind: 'EndTurn' }).ok).toBe(true);
      expect(g.dispatch({ kind: 'EndTurn' }, 'rival').ok).toBe(true);
    }
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    expect(lastKnownIntel(restored.state, 'player', 'rival_odysseus')).toEqual(snap);
  });

  it('a save from before the feature (no flag, no snapshots) keeps the legacy rule and never gains snapshots', () => {
    const s = session('save-intel-old');
    const m = JSON.parse(JSON.stringify(s.state)) as MatchState;
    const { scoutingIntelV1: _drop, ...oldFeatures } = m.scenario.features!;
    void _drop;
    m.scenario = { ...m.scenario, features: oldFeatures };
    const old = GameSession.fromSnapshot(catalog, { match: m, campaign: null });
    const text = serializeEnvelope(createEnvelope(catalog, old.snapshot(), { id: 'old', kind: 'manual', name: 'old', savedAt: '2026-10-16T12:00:00Z' }));
    expect(text.includes('scoutingIntelV1')).toBe(false);
    expect(text.includes('"intel"')).toBe(false);
    const loaded = roundTrip(old, 'old');
    expect(scoutingIntelEnabled(loaded.state)).toBe(false);
    expect(loaded.dispatch({ kind: 'MoveHero', heroId: 'alexios', destination: at(18) }).ok).toBe(true);
    expect(armyIntel(catalog, loaded.state, 'player', 'rival_odysseus')).toMatchObject({ stage: 'full', creatures: [{ creatureId: 'hoplite', count: 20 }, { creatureId: 'peltast', count: 8 }] });
    expect(loaded.dispatch({ kind: 'EndTurn' }).ok).toBe(true);
    expect(loaded.state.intel).toBeUndefined();
    expect(loaded.state.scenario.features?.scoutingIntelV1).toBeUndefined();
  });
});
