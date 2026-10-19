/**
 * Saves on the naval random templates (2026-10-17): the naval-only travel rule travels with the
 * generated mission and a reload can never bring back portals or a game without ships; an embarked
 * hero, a defeated ship, a captured home harbor, blocked launch cells, a voyage planned across days
 * and a relic held then retaken all round-trip exactly and play on; a hero with a flying army still
 * cannot cross water on the map.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@pr/content';
import { stepBattleAI, battleActor } from '@pr/ai';
import { canonicalStateHash, freeLaunchCells, heroShip, hexKey, quoteLaunchShip, quoteMovement, quoteTravel, shipInvariantIssues, terrainAt, townGate, type HexCoord, type MatchState } from '@pr/rules';
import { analyzeNavalMap, createRandomSkirmish, type SkirmishGenOptions } from '@pr/campaign';
import { GameSession, checkEnvelope, createEnvelope, parseEnvelope, serializeEnvelope, type SaveSnapshot } from '../src';

const catalog = buildCatalog();
const H1 = 'leader_1';
const H2 = 'leader_2';

function naval(mapType: 'shattered_crown' | 'serpent_straits', seed: number, extra: Partial<SkirmishGenOptions> = {}) {
  return createRandomSkirmish(catalog, {
    seed,
    size: 'huge',
    seats: [
      { pantheonId: 'greek', controller: 'human' },
      { pantheonId: 'norse', controller: 'ai' },
    ],
    victory: mapType === 'shattered_crown' ? { type: 'hold_relic', days: 7 } : { type: 'elimination' },
    monsters: 'none',
    mapType,
    ...extra,
  } as SkirmishGenOptions);
}

function session(mapType: 'shattered_crown' | 'serpent_straits', seed: number, extra: Partial<SkirmishGenOptions> = {}) {
  const g = naval(mapType, seed, extra);
  return { g, s: GameSession.newGenerated(catalog, g, `naval-random-${mapType}-${seed}`) };
}

function envelopeOf(snapshot: SaveSnapshot, id: string) {
  return createEnvelope(catalog, snapshot, { id, kind: 'manual', name: id, savedAt: '2026-10-17T12:00:00Z' });
}

function roundTrip(s: GameSession, id: string): GameSession {
  const parsed = parseEnvelope(catalog, serializeEnvelope(envelopeOf(s.snapshot(), id)));
  expect(parsed.compatibility).toEqual({ status: 'ok' });
  return GameSession.fromSnapshot(catalog, parsed.envelope!.snapshot);
}

const neighbours = (c: HexCoord): HexCoord[] => [
  { q: c.q + 1, r: c.r },
  { q: c.q + 1, r: c.r - 1 },
  { q: c.q, r: c.r - 1 },
  { q: c.q - 1, r: c.r },
  { q: c.q - 1, r: c.r + 1 },
  { q: c.q, r: c.r + 1 },
];

/** The beach beside a ship on its home island (where the hero embarks). */
function embarkBeach(state: MatchState, shipId: string): HexCoord {
  const ship = state.world.ships![shipId]!;
  return neighbours(ship.coord).find((n) => terrainAt(state.world.map, n) === 'plains' || terrainAt(state.world.map, n) === 'rough' || terrainAt(state.world.map, n) === 'forest')!;
}

/** Walk the leader to its starting ship and embark (day 1). */
function embark(s: GameSession): void {
  const beach = embarkBeach(s.state, 'start_ship_1');
  expect(s.dispatch({ kind: 'MoveHero', heroId: H1, destination: beach }).ok).toBe(true);
  expect(s.dispatch({ kind: 'EmbarkHero', heroId: H1, shipId: 'start_ship_1' }).ok).toBe(true);
  expect(heroShip(s.state, H1)?.shipId).toBe('start_ship_1');
}

function endDay(s: GameSession): void {
  expect(s.dispatch({ kind: 'EndTurn' }).ok).toBe(true);
  while (s.needsAI()) s.stepAI();
}

describe('naval random saves: the travel rule', () => {
  it('a generated naval match carries the rule; a save that turns ships off, persists portals as on or holds a portal is refused', () => {
    const { s } = session('shattered_crown', 41);
    expect(s.state.customMission?.navalPolicy).toMatchObject({ id: 'naval_only_v1', portals: false });
    expect(s.state.scenario.features?.navalMovementV1).toBe(true);
    expect(checkEnvelope(catalog, JSON.parse(serializeEnvelope(envelopeOf(s.snapshot(), 'ok'))))).toEqual({ status: 'ok' });
    const tamper = (edit: (m: MatchState) => void) => {
      const snap = JSON.parse(JSON.stringify(s.snapshot())) as SaveSnapshot;
      edit(snap.match);
      return checkEnvelope(catalog, JSON.parse(serializeEnvelope(envelopeOf(snap, 'bad'))));
    };
    const portalsOn = tamper((m) => ((m.customMission!.navalPolicy as unknown as { portals: boolean }).portals = true));
    expect(portalsOn).toMatchObject({ status: 'corrupt' });
    expect(portalsOn.status === 'corrupt' && portalsOn.reason).toMatch(/Portals must stay off/);
    const shipsOff = tamper((m) => (m.scenario = { ...m.scenario, features: { ...m.scenario.features!, navalMovementV1: false } }));
    expect(shipsOff.status).toBe('corrupt');
    const portal = tamper((m) => {
      const mission = m.customMission!;
      (m as { customMission: unknown }).customMission = { ...mission, sites: [...mission.sites, { id: 'p1', anchorId: 'p1', coord: mission.sites[2]!.coord, name: 'Twin Portal', description: '', kind: { type: 'portal', exitSiteId: 'p2' } }] };
    });
    expect(portal.status === 'corrupt' && portal.reason).toMatch(/would cross the sea without a ship/);
  });

  it('a portal smuggled into a naval mission does not move a hero (the rules refuse the crossing)', () => {
    const { s } = session('serpent_straits', 43);
    const m = s.state as MatchState;
    const gate = townGate(catalog, m, 'town_1');
    const near = neighbours(gate).find((n) => terrainAt(m.world.map, n) !== 'water' && terrainAt(m.world.map, n) !== 'mountain' && !m.customMission!.sites.some((x) => x.coord.q === n.q && x.coord.r === n.r) && !(n.q === m.towns['town_1']!.coord.q && n.r === m.towns['town_1']!.coord.r))!;
    const far = m.towns['town_2']!.coord;
    const mission = m.customMission!;
    (m as { customMission: unknown }).customMission = {
      ...mission,
      sites: [...mission.sites, { id: 'portal_a', anchorId: 'portal_a', coord: near, name: 'Twin Portal', description: '', kind: { type: 'portal', exitSiteId: 'portal_b' } }, { id: 'portal_b', anchorId: 'portal_b', coord: { q: far.q, r: far.r + 2 }, name: 'Twin Portal', description: '', kind: { type: 'portal', exitSiteId: 'portal_a' } }],
    };
    m.world.sites = { ...m.world.sites, portal_a: { id: 'portal_a', cleared: false, claimed: false, owner: null, visitedBy: [] } as never, portal_b: { id: 'portal_b', cleared: false, claimed: false, owner: null, visitedBy: [] } as never };
    const res = s.dispatch({ kind: 'MoveHero', heroId: H1, destination: near });
    expect(res.ok).toBe(true);
    expect(res.ok && res.events.some((e) => e.kind === 'PortalBlocked')).toBe(true);
    expect(res.ok && res.events.some((e) => e.kind === 'HeroTeleported')).toBe(false);
    expect(s.state.heroes[H1]!.position).toEqual(near);
  });
});

describe('naval random saves: round trips', () => {
  it('an embarked hero round-trips exactly and sails on identically', () => {
    const { s } = session('shattered_crown', 47);
    embark(s);
    const restored = roundTrip(s, 'embarked');
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    expect(restored.state.world.ships).toEqual(s.state.world.ships);
    for (const g of [s, restored]) {
      endDay(g);
      const a = analyzeNavalMap(catalog, g.state.world.map, g.state.customMission!);
      const ship = g.state.world.ships!['start_ship_1']!.coord;
      const dest = [...a.water].map((k) => ({ q: Number(k.split(',')[0]), r: Number(k.split(',')[1]) })).find((c) => Math.abs(c.q - ship.q) + Math.abs(c.r - ship.r) + Math.abs(c.q + c.r - ship.q - ship.r) === 8 && quoteMovement(catalog, g.state, H1, c).reachable)!;
      expect(g.dispatch({ kind: 'MoveHero', heroId: H1, destination: dest }).ok).toBe(true);
    }
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    expect(terrainAt(restored.state.world.map, restored.state.heroes[H1]!.position)).toBe('water');
  });

  it('a defeated ship: the boarding battle removes the loser’s hull, the save keeps every ship invariant', () => {
    const { s } = session('serpent_straits', 53);
    embark(s);
    const m = s.state as MatchState;
    // The rival's leader aboard its own ship right beside ours (a fixture edit), weak; ours strong.
    const own = m.world.ships!['start_ship_1']!;
    const spot = neighbours(own.coord).find((n) => terrainAt(m.world.map, n) === 'water' && !Object.values(m.world.ships!).some((x) => x.coord.q === n.q && x.coord.r === n.r))!;
    const theirs = m.world.ships!['start_ship_2']!;
    theirs.coord = { ...spot };
    theirs.heroId = H2;
    theirs.state = 'occupied';
    m.heroes[H2]!.position = { ...spot };
    m.heroes[H2]!.army.slots = [{ stackId: 'w', creatureId: m.heroes[H2]!.army.slots.find((x) => x)!.creatureId, count: 2 }, null, null, null, null, null, null];
    m.heroes[H1]!.army.slots = [{ stackId: 'a', creatureId: 'griffin', count: 30 }, { stackId: 'b', creatureId: 'hoplite', count: 60 }, null, null, null, null, null];
    m.heroes[H1]!.movementPoints = 800;
    expect(shipInvariantIssues(catalog, m)).toEqual([]);
    const res = s.dispatch({ kind: 'AttackShip', heroId: H1, targetShipId: 'start_ship_2' });
    expect(res.ok).toBe(true);
    let st = s.state as MatchState;
    for (let i = 0; st.battle && i < 3000; i++) {
      if (!battleActor(st)) break;
      st = stepBattleAI(catalog, st, { playerSimulation: true }).state;
    }
    expect(st.battle).toBeNull();
    expect(st.heroes[H2]!.status).not.toBe('active');
    expect(Object.values(st.world.ships ?? {}).filter((x) => x.state !== 'wrecked').map((x) => x.shipId)).not.toContain('start_ship_2');
    expect(shipInvariantIssues(catalog, st)).toEqual([]);
    const restored = GameSession.fromSnapshot(catalog, { match: st, campaign: null });
    const back = roundTrip(restored, 'defeated-ship');
    expect(canonicalStateHash(back.state)).toBe(canonicalStateHash(st));
  });

  it('a captured home harbor: the new owner launches there; blocked launch cells give a reason; both survive a reload', () => {
    const { s } = session('shattered_crown', 59, { revealMap: true });
    const m = s.state as MatchState;
    // The rival's leader is away on another island (so the rival stays in the game) and its town unguarded;
    // our leader stands beside its gate (fixture edits).
    const islands = analyzeNavalMap(catalog, m.world.map, m.customMission!);
    const homes = new Set(['town_1', 'town_2'].map((t) => islands.islandOf.get(hexKey(m.towns[t]!.coord))));
    const elsewhere = islands.islands.find((i) => !homes.has(i.index))!.clusters[0]!.shore[0]!;
    m.heroes[H2]!.position = { q: Number(elsewhere.split(',')[0]), r: Number(elsewhere.split(',')[1]) };
    m.towns['town_2']!.garrison.slots = m.towns['town_2']!.garrison.slots.map(() => null);
    const gate = townGate(catalog, m, 'town_2');
    const beside = neighbours(gate).find((n) => ['plains', 'forest', 'rough', 'marsh'].includes(terrainAt(m.world.map, n)) && !m.customMission!.sites.some((x) => x.coord.q === n.q && x.coord.r === n.r))!;
    m.heroes[H1]!.position = { ...beside };
    m.heroes[H1]!.movementPoints = 800;
    m.players['player']!.wallet = { ...m.players['player']!.wallet, gold: 9000, wood: 40 };
    const cap = s.dispatch({ kind: 'MoveHero', heroId: H1, destination: m.towns['town_2']!.coord });
    expect(cap.ok).toBe(true);
    expect(s.state.towns['town_2']!.ownerId).toBe('player');
    const cells = freeLaunchCells(catalog, s.state, 'town_2');
    expect(cells.length).toBeGreaterThanOrEqual(2);
    let restored = roundTrip(s, 'harbor');
    expect(restored.state.towns['town_2']!.ownerId).toBe('player');
    expect(quoteLaunchShip(catalog, restored.state, 'player', 'town_2', null).legal).toBe(true);
    const launched = restored.dispatch({ kind: 'LaunchShip', townId: 'town_2', waterCoord: cells[0]! });
    expect(launched.ok ? '' : launched.rejection.message).toBe('');
    // Block the remaining launch cells with ships: a launch is refused with its reason (nothing spawns under a ship).
    const rm = restored.state as MatchState;
    freeLaunchCells(catalog, rm, 'town_2').forEach((c, i) => (rm.world.ships![`blocker_${i}`] = { shipId: `blocker_${i}`, ownerId: null, coord: { ...c }, heroId: null, state: 'empty', facing: 0, lastActionTurn: 0 }));
    expect(freeLaunchCells(catalog, rm, 'town_2')).toEqual([]);
    const q = quoteLaunchShip(catalog, rm, 'player', 'town_2', null);
    expect(q).toMatchObject({ legal: false, code: 'no_capacity' });
    expect(q.reason).toMatch(/No free water beside/);
    restored = roundTrip(restored, 'blocked');
    expect(quoteLaunchShip(catalog, restored.state, 'player', 'town_2', null)).toMatchObject({ legal: false, code: 'no_capacity' });
    expect(shipInvariantIssues(catalog, restored.state)).toEqual([]);
  });

  it('a voyage planned to the rival harbor survives saves across the days and continues after each mode change', () => {
    const { s } = session('serpent_straits', 61, { revealMap: true });
    const target = s.state.towns['town_2']!.coord;
    const beach = embarkBeach(s.state, 'start_ship_1');
    expect(s.dispatch({ kind: 'MoveHero', heroId: H1, destination: beach }).ok).toBe(true);
    s.planJourney(H1, target);
    expect(quoteTravel(catalog, s.state, H1, target).transition?.kind).toBe('embark');
    let g = roundTrip(s, 'voyage-0');
    expect(g.journey(H1)).toMatchObject({ status: 'planned', target });
    expect(g.dispatch({ kind: 'EmbarkHero', heroId: H1, shipId: 'start_ship_1' }).ok).toBe(true);
    let landed = false;
    for (let day = 0; day < 12 && !landed; day++) {
      endDay(g);
      g = roundTrip(g, `voyage-${day + 1}`);
      expect(g.journey(H1)?.target).toEqual(target);
      const q = quoteTravel(catalog, g.state, H1, target);
      expect(q.reachable).toBe(true);
      if (q.transition?.kind === 'disembark' && q.path.length === 0) {
        expect(g.dispatch({ kind: 'DisembarkHero', heroId: H1, landCoord: q.transition.landCoord }).ok).toBe(true);
        landed = true;
      } else expect(g.dispatch({ kind: 'MoveHero', heroId: H1, destination: target }).ok).toBe(true);
    }
    expect(landed).toBe(true);
    expect(terrainAt(g.state.world.map, g.state.heroes[H1]!.position)).not.toBe('water');
    // On the rival island now: the rest of the way is on foot.
    expect(quoteMovement(catalog, g.state, H1, target).reachable).toBe(true);
  });

  it('a relic held by a rival survives the reload, is retaken by visiting it and then counts for its new owner', () => {
    const { g, s } = session('shattered_crown', 67, { revealMap: true });
    const relic = g.mission.sites.find((x) => x.id === 'relic')!;
    const m = s.state as MatchState;
    m.world.sites['relic'] = { ...m.world.sites['relic']!, owner: 'p2', cleared: true, heldDays: 3 };
    let back = roundTrip(s, 'relic-held');
    expect(back.state.world.sites['relic']).toMatchObject({ owner: 'p2', heldDays: 3 });
    const bm = back.state as MatchState;
    const beside = neighbours(relic.coord).find((n) => ['plains', 'rough', 'forest', 'marsh'].includes(terrainAt(bm.world.map, n)))!;
    bm.heroes[H1]!.position = { ...beside };
    bm.heroes[H1]!.movementPoints = 800;
    expect(back.dispatch({ kind: 'MoveHero', heroId: H1, destination: relic.coord }).ok).toBe(true);
    expect(back.state.world.sites['relic']).toMatchObject({ owner: 'player', heldDays: 0 });
    back = roundTrip(back, 'relic-retaken');
    endDay(back);
    expect(back.state.world.sites['relic']).toMatchObject({ owner: 'player', heldDays: 1 });
  });

  it('a hero with a flying army still walks the map: no island is reached without a ship, and water is never entered on foot', () => {
    const { g, s } = session('shattered_crown', 71, { revealMap: true });
    const m = s.state as MatchState;
    m.heroes[H1]!.army.slots = [{ stackId: 'f', creatureId: 'griffin', count: 20 }, null, null, null, null, null, null];
    const a = analyzeNavalMap(catalog, m.world.map, g.mission);
    const homeIsland = a.islandOf.get(hexKey(m.towns['town_1']!.coord));
    const away = a.islands.find((i) => i.index !== homeIsland)!.clusters[0]!.shore[0]!;
    const dest = { q: Number(away.split(',')[0]), r: Number(away.split(',')[1]) };
    expect(quoteMovement(catalog, m, H1, dest).reachable).toBe(false);
    const travel = quoteTravel(catalog, m, H1, dest);
    expect(travel.reachable).toBe(true);
    expect(travel.voyage?.transitions.map((t) => t.kind)).toEqual(['embark', 'disembark']);
    const beach = embarkBeach(m, 'start_ship_1');
    expect(s.dispatch({ kind: 'MoveHero', heroId: H1, destination: beach }).ok).toBe(true);
    const water = m.world.ships!['start_ship_1']!.coord;
    const onFoot = neighbours(beach).find((n) => terrainAt(m.world.map, n) === 'water' && !(n.q === water.q && n.r === water.r));
    if (onFoot) expect(s.dispatch({ kind: 'MoveHero', heroId: H1, destination: onFoot }).ok).toBe(false);
  });
});
