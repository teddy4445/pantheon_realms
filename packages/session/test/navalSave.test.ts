/**
 * Hero ships and saves (expedition kit §12, `navalMovementV1`): a save with ships (one at sea
 * with its hero) round-trips exactly and plays on identically; an older save without ships loads
 * with none; a save that breaks a ship invariant is refused as damaged. A planned journey beyond
 * the water survives the days and pauses with a clear reason at each mode change.
 */
import { describe, expect, it } from 'vitest';
import { canonicalStateHash, terrainAt, type MatchState } from '@pr/rules';
import { compileCustomMap } from '@pr/campaign';
import { catalog, navalDoc } from '@pr/testing';
import { GameSession, checkEnvelope, createEnvelope, parseEnvelope, serializeEnvelope } from '../src';

const H1 = 'leader_1';

function navalSession(matchId: string): GameSession {
  const compiled = compileCustomMap(catalog, navalDoc(), [{ controller: 'human' }, { controller: 'ai' }]);
  return GameSession.newGenerated(catalog, compiled, matchId);
}

function roundTrip(s: GameSession, id: string): GameSession {
  const env = createEnvelope(catalog, s.snapshot(), { id, kind: 'manual', name: id, savedAt: '2026-10-17T12:00:00Z' });
  const parsed = parseEnvelope(catalog, serializeEnvelope(env));
  expect(parsed.compatibility.status).toBe('ok');
  return GameSession.fromSnapshot(catalog, parsed.envelope!.snapshot);
}

/** Put the human leader on the shore beside the neutral ship with full movement (a fixture edit). */
function toShore(s: GameSession): void {
  const m = s.state as MatchState;
  const ship = m.world.ships!['map_ship_free']!;
  const hero = m.heroes[H1]!;
  hero.position = { q: ship.coord.q - 1, r: ship.coord.r };
  hero.movementPoints = 900;
}

describe('saves with ships', () => {
  it('a save with a hero at sea round-trips exactly and plays on identically', () => {
    const s = navalSession('naval-save-1');
    toShore(s);
    expect(s.dispatch({ kind: 'EmbarkHero', heroId: H1, shipId: 'map_ship_free' }).ok).toBe(true);
    const restored = roundTrip(s, 'naval-1');
    expect(restored.state.world.ships).toEqual(s.state.world.ships);
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    for (const g of [s, restored]) {
      expect(g.dispatch({ kind: 'EndTurn' }).ok).toBe(true);
      while (g.needsAI()) g.stepAI();
      const ship = g.state.world.ships!['map_ship_free']!;
      expect(g.dispatch({ kind: 'MoveHero', heroId: H1, destination: { q: ship.coord.q + 3, r: ship.coord.r } }).ok).toBe(true);
    }
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    expect(terrainAt(restored.state.world.map, restored.state.heroes[H1]!.position)).toBe('water');
  });

  it('an older save without ships loads with none; a save that breaks a ship invariant is refused as damaged', () => {
    const old = GameSession.newScenario(catalog, 'skirmish_twin_harbors', 'naval-old', 'zeus');
    const m = old.state as MatchState;
    // An old save: no naval flag, no ships record.
    m.scenario = { ...m.scenario, features: { ...m.scenario.features!, navalMovementV1: undefined } };
    delete m.world.ships;
    const restored = roundTrip(old, 'naval-old');
    expect(restored.state.world.ships).toBeUndefined();
    expect(restored.dispatch({ kind: 'LaunchShip', townId: Object.values(restored.state.towns).find((t) => t.ownerId === 'player')!.id, waterCoord: { q: 0, r: 0 } })).toMatchObject({ ok: false, rejection: { code: 'not_in_scope' } });

    const s = navalSession('naval-bad');
    const bad = JSON.parse(JSON.stringify(s.snapshot())) as ReturnType<GameSession['snapshot']>;
    const ship = bad.match.world.ships!['map_ship_free']!;
    // Two ships on one tile.
    bad.match.world.ships!['copy'] = { ...ship, shipId: 'copy' };
    const env = createEnvelope(catalog, bad, { id: 'bad', kind: 'manual', name: 'bad', savedAt: '2026-10-17T12:00:00Z' });
    const verdict = checkEnvelope(catalog, JSON.parse(serializeEnvelope(env)));
    expect(verdict.status).toBe('corrupt');
    expect(verdict.status === 'corrupt' && verdict.reason).toMatch(/share a tile/);
  });
});

describe('journeys beyond the water', () => {
  it('a destination on the rival island survives the days, pauses at the embark and landing steps with their reason, and plans on after each confirmation', () => {
    const s = navalSession('naval-journey');
    toShore(s);
    const target = s.state.towns['town_2']!.coord;
    s.planJourney(H1, target);
    // Standing at the embark step already: the journey waits for the player's Embark.
    expect(s.dispatch({ kind: 'EndTurn' }).ok).toBe(true);
    while (s.needsAI()) s.stepAI();
    expect(s.journey(H1)).toMatchObject({ status: 'paused', reason: 'embark' });
    expect(s.dispatch({ kind: 'MoveHero', heroId: H1, destination: target })).toMatchObject({ ok: false, rejection: { code: 'transition_required' } });
    expect(s.dispatch({ kind: 'EmbarkHero', heroId: H1, shipId: 'map_ship_free' }).ok).toBe(true);
    expect(s.journey(H1)?.status).toBe('planned');
    expect(s.journey(H1)?.reason).toBeUndefined();
    // Saved and loaded at sea: the destination is kept.
    const restored = roundTrip(s, 'naval-journey');
    expect(restored.journey(H1)).toMatchObject({ status: 'planned', target });
    // Sail on, day after day, until the landing step.
    for (let day = 0; day < 6 && restored.journey(H1)?.reason !== 'disembark'; day++) {
      expect(restored.dispatch({ kind: 'EndTurn' }).ok).toBe(true);
      while (restored.needsAI()) restored.stepAI();
      if (restored.journey(H1)?.reason === 'disembark') break;
      expect(restored.dispatch({ kind: 'MoveHero', heroId: H1, destination: target }).ok).toBe(true);
    }
    expect(restored.journey(H1)).toMatchObject({ status: 'paused', reason: 'disembark' });
  });

  it('a journey waiting to embark says when its ship is gone', () => {
    const s = navalSession('naval-noship');
    toShore(s);
    s.planJourney(H1, s.state.towns['town_2']!.coord);
    expect(s.dispatch({ kind: 'EndTurn' }).ok).toBe(true);
    while (s.needsAI()) s.stepAI();
    expect(s.journey(H1)?.reason).toBe('embark');
    // The ship is taken away (a fixture edit standing for a rival claiming it), then any command runs.
    delete (s.state as MatchState).world.ships!['map_ship_free'];
    expect(s.dispatch({ kind: 'EndTurn' }).ok).toBe(true);
    expect(s.journey(H1)).toMatchObject({ status: 'blocked', reason: 'no_ship' });
  });
});
