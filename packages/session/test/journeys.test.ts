import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { compileSkirmishMap } from '@pr/campaign';
import { deepClone, quoteMovement, routeDays, siteAt, type HexCoord, type MatchState } from '@pr/rules';
import { GameSession, createEnvelope, parseEnvelope, reconcileJourneys, sanitizePresentation, serializeEnvelope, type SessionPresentation } from '../src';

const catalog = loadCatalog();

/** A free tile `days` days away for the hero (no site, no encounter on the way's end). */
function tileDaysAway(s: GameSession, heroId: string, days: number): HexCoord {
  const st = s.state;
  const map = st.world.map;
  for (let r = 0; r < map.height; r++)
    for (let q = 0; q < map.width; q++) {
      const c = { q, r };
      if (siteAt(catalog, st, c)) continue;
      const m = quoteMovement(catalog, st, heroId, c);
      if (m.reachable && !m.endsInEncounter && routeDays(catalog, st, heroId, m) === days) return c;
    }
  throw new Error(`no tile ${days} days away`);
}

/** A skirmish on Twin Harbors, map revealed; returns the session and the player's hero id. */
function skirmish(matchId: string): { s: GameSession; hero: string } {
  const s = GameSession.newScenario(catalog, 'skirmish_twin_harbors', matchId);
  for (const fog of Object.values(s.state.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = Object.values(s.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!.id;
  return { s, hero };
}

/** End the human day; the other empires pass (only the journey is under test). */
function endDay(s: GameSession): void {
  expect(s.dispatch({ kind: 'EndTurn' }).ok).toBe(true);
  for (let i = 0; i < 8 && s.state.activePlayerId !== 'player'; i++) expect(s.dispatch({ kind: 'EndTurn' }, s.state.activePlayerId).ok).toBe(true);
  expect(s.state.activePlayerId).toBe('player');
}

/** Follow the hero's planned journey as far as today allows (what Continue journey does). */
function follow(s: GameSession, heroId: string): void {
  const j = s.journey(heroId)!;
  expect(s.dispatch({ kind: 'MoveHero', heroId, destination: j.target }).ok).toBe(true);
}

describe('planned journeys', () => {
  it('a three-day journey: chosen once, followed day after day, cleared only on arrival', () => {
    const { s, hero: alexios } = skirmish('run-journey');
    const target = tileDaysAway(s, alexios, 3);
    s.planJourney(alexios, target);
    follow(s, alexios);
    expect(s.journey(alexios)?.target).toEqual(target);
    endDay(s);
    // A new day keeps the destination and moves nobody by itself.
    const at = s.state.heroes[alexios]!.position;
    expect(s.journey(alexios)?.status).toBe('planned');
    expect(s.state.heroes[alexios]!.position).toEqual(at);
    follow(s, alexios);
    expect(s.journey(alexios)).not.toBeNull();
    endDay(s);
    follow(s, alexios);
    expect(s.state.heroes[alexios]!.position).toEqual(target);
    expect(s.journey(alexios)).toBeNull();
  });

  it('each hero keeps its own destination; cancelling one leaves the other', () => {
    const { s, hero: alexios } = skirmish('run-two');
    const st = s.state as MatchState;
    // A second hero of the player beside Alexios (test fixture).
    const second = deepClone(st.heroes[alexios]!);
    st.heroes.ione = { ...second, id: 'ione', name: 'Ione', position: { q: st.heroes[alexios]!.position.q, r: st.heroes[alexios]!.position.r + 1 } };
    const a = tileDaysAway(s, alexios, 2);
    const b = tileDaysAway(s, 'ione', 3);
    s.planJourney(alexios, a);
    s.planJourney('ione', b);
    expect(s.journey(alexios)?.target).toEqual(a);
    expect(s.journey('ione')?.target).toEqual(b);
    s.cancelJourney(alexios);
    expect(s.journey(alexios)).toBeNull();
    expect(s.journey('ione')?.target).toEqual(b);
  });

  it('travels in the save (new optional field) and an older save loads with none', () => {
    const { s, hero: alexios } = skirmish('run-save-journey');
    const target = tileDaysAway(s, alexios, 2);
    // No journey: the snapshot has no presentation field at all (byte-identical to before).
    expect('presentation' in s.snapshot()).toBe(false);
    s.planJourney(alexios, target);
    follow(s, alexios);
    const env = createEnvelope(catalog, s.snapshot(), { id: 'slot1', kind: 'manual', name: 'J', savedAt: '2026-10-14T12:00:00Z' });
    const parsed = parseEnvelope(catalog, serializeEnvelope(env));
    expect(parsed.compatibility.status).toBe('ok');
    const restored = GameSession.fromSnapshot(catalog, parsed.envelope!.snapshot);
    expect(restored.journey(alexios)).toEqual(s.journey(alexios));
    endDay(restored);
    expect(restored.journey(alexios)?.target).toEqual(target);
    // An older save (no presentation field) loads with no journeys.
    const { presentation: _p, ...old } = parsed.envelope!.snapshot;
    expect(GameSession.fromSnapshot(catalog, old).presentation.journeys).toEqual({});
  });

  it('drops journeys of another match, of a hero the player no longer commands, or of an unknown version', () => {
    const { s, hero: alexios } = skirmish('run-sanitize');
    const target = tileDaysAway(s, alexios, 2);
    s.planJourney(alexios, target);
    const good = s.presentation;
    expect(sanitizePresentation(good, s.state)).toEqual(good);
    const otherMatch = { ...s.state, matchId: 'another' } as MatchState;
    expect(sanitizePresentation(good, otherMatch).journeys).toEqual({});
    expect(sanitizePresentation({ ...good, version: 2 }, s.state).journeys).toEqual({});
    const captured = deepClone(s.state) as MatchState;
    captured.heroes[alexios]!.ownerId = 'rival';
    expect(sanitizePresentation(good, captured).journeys).toEqual({});
    // Another player's journeys never show for this one.
    expect(s.journey(alexios, 'rival')).toBeNull();
  });

  it('keeps a blocked destination (status blocked), pauses on a battle and clears for a lost hero', () => {
    const { s, hero: alexios } = skirmish('run-block');
    const st = s.state;
    const target = tileDaysAway(s, alexios, 2);
    s.planJourney(alexios, target);
    // Blocked: the target turned into impassable mountain (fixture) — kept, marked blocked.
    const flooded = deepClone(st) as MatchState;
    const i = target.r * flooded.world.map.width + target.q;
    const t = flooded.world.map.terrain;
    (flooded.world.map as { terrain: string }).terrain = t.slice(0, i) + 'm' + t.slice(i + 1);
    const blocked = reconcileJourneys(catalog, flooded, s.presentation);
    expect(blocked.journeys.player?.[alexios]?.status).toBe('blocked');
    // Passable again: planned.
    expect(reconcileJourneys(catalog, st, blocked).journeys.player?.[alexios]?.status).toBe('planned');
    // A battle pauses it.
    const paused: SessionPresentation = reconcileJourneys(catalog, st, s.presentation, new Set([alexios]));
    expect(paused.journeys.player?.[alexios]?.status).toBe('paused');
    // The hero is gone: the journey goes with it.
    const lost = deepClone(st) as MatchState;
    lost.heroes[alexios]!.status = 'defeated';
    expect(reconcileJourneys(catalog, lost, s.presentation).journeys.player?.[alexios]).toBeUndefined();
  });

  it('a new mission clears the old match’s journeys', () => {
    const { s, hero: alexios } = skirmish('run-restart');
    s.planJourney(alexios, tileDaysAway(s, alexios, 2));
    s.restartMission();
    expect(s.presentation.journeys).toEqual({});
  });
  it('a journey to a portal ends when the hero goes through it', () => {
    const gen = compileSkirmishMap(catalog, 'circle_of_gates', [
      { pantheonId: 'greek', controller: 'human' },
      { pantheonId: 'norse', controller: 'ai' },
      { pantheonId: 'egyptian', controller: 'ai' },
    ]);
    const s = GameSession.newGenerated(catalog, gen, 'run-portal');
    for (const fog of Object.values(s.state.fog)) fog.explored = fog.explored.map(() => 1);
    const me = s.humanPlayerId;
    const hero = Object.values(s.state.heroes).find((h) => h.ownerId === me && h.status === 'active')!.id;
    // The nearest portal the hero can walk onto.
    const portals = gen.mission.sites.filter((x) => x.kind.type === 'portal');
    const reach = portals
      .map((p) => ({ p, q: quoteMovement(catalog, s.state, hero, p.coord) }))
      .filter((x) => x.q.reachable && !x.q.endsInEncounter)
      .sort((a, b) => a.q.totalCost - b.q.totalCost)[0]!;
    expect(reach).toBeDefined();
    s.planJourney(hero, reach.p.coord);
    expect(s.journey(hero)?.targetSiteId).toBe(reach.p.id);
    for (let day = 0; day < 6 && s.journey(hero); day++) {
      if (quoteMovement(catalog, s.state, hero, reach.p.coord).stopIndex >= 0) follow(s, hero);
      if (s.journey(hero)) endDay(s);
    }
    // Through the portal: the hero stands at its twin, and the journey is over.
    expect(s.journey(hero)).toBeNull();
    expect(s.state.heroes[hero]!.position).not.toEqual(reach.p.coord);
  });
});
