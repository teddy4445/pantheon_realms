/**
 * Naval random templates in a real match (2026-10-17): the rules' own town gates, starting heroes,
 * starting ships and launch cells are where the generator's checks say; the generated mission
 * validates; Recall never gives first access to an island (it returns to an owned town only, never
 * from a ship); and the custom-map format keeps ships and the naval travel rule (a damaged rule or
 * persisted portals are refused, a portal on such a map is an error).
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog, validateGeneratedMission } from '@pr/content';
import { axialDistance, freeLaunchCells, heroShip, hexKey, processCommand, terrainAt, townGate, type GameCommand, type HexCoord, type MatchState } from '@pr/rules';
import { analyzeNavalMap, compileCustomMap, createGeneratedMatch, createRandomSkirmish, customRowOffset, newCustomMap, parseCustomMap, serializeCustomMap, validateCustomMap, type CustomMapDocument, type SkirmishGenOptions } from '../src';

const catalog = buildCatalog();

function naval(mapType: 'shattered_crown' | 'serpent_straits', n: number, seed: number, extra: Partial<SkirmishGenOptions> = {}) {
  const pool = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];
  return createRandomSkirmish(catalog, { seed, size: 'huge', seats: pool.slice(0, n).map((pantheonId, i) => ({ pantheonId, controller: i === 0 ? 'human' : 'ai' })), victory: mapType === 'shattered_crown' ? { type: 'hold_relic', days: 7 } : { type: 'elimination' }, monsters: 'few', mapType, ...extra } as SkirmishGenOptions);
}

let cmd = 0;
function run(state: MatchState, payload: Record<string, unknown>): MatchState {
  const res = processCommand({ catalog }, state, { ...payload, commandId: `nr:${cmd++}`, expectedRevision: state.revision, actorPlayerId: state.activePlayerId } as GameCommand);
  if (!res.ok) throw new Error(res.rejection.message);
  return res.state;
}

const land = (s: MatchState, c: HexCoord) => ['plains', 'forest', 'rough', 'marsh'].includes(terrainAt(s.world.map, c));
const ring = (c: HexCoord): HexCoord[] => [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(([dq, dr]) => ({ q: c.q + dq!, r: c.r + dr! }));

describe('naval random maps in a match', () => {
  for (const [mapType, n] of [['shattered_crown', 3], ['serpent_straits', 2]] as const) {
    it(`${mapType}: the rules' gates, the starting heroes, ships and launch cells match the generator`, () => {
      const g = naval(mapType, n, 314);
      expect(validateGeneratedMission(catalog, g.mission).issues).toEqual([]);
      const { match } = createGeneratedMatch(catalog, g, { matchId: `nr-${mapType}` });
      expect(match.customMission?.navalPolicy?.portals).toBe(false);
      expect(match.scenario.features?.navalMovementV1).toBe(true);
      const a = analyzeNavalMap(catalog, match.world.map, g.mission);
      for (let i = 0; i < n; i++) {
        const townId = `town_${i + 1}`;
        const gate = townGate(catalog, match, townId);
        expect(gate).toEqual(a.gates.get(`site_${townId}`));
        // Inland gate, the leader standing in it, the town tile on the coast.
        expect(ring(gate).some((x) => terrainAt(match.world.map, x) === 'water')).toBe(false);
        expect(match.heroes[`leader_${i + 1}`]!.position).toEqual(gate);
        // The empire's own empty ship beside a beach next to the gate.
        const ship = match.world.ships![`start_ship_${i + 1}`]!;
        expect(ship).toMatchObject({ ownerId: i === 0 ? 'player' : `p${i + 1}`, heroId: null, state: 'empty' });
        const beach = ring(ship.coord).find((x) => land(match, x) && axialDistance(x, gate) === 1);
        expect(beach, `${townId} embark beach`).toBeDefined();
        // Two launch cells, each beside a beach a hero can stand on.
        const cells = freeLaunchCells(catalog, match, townId);
        expect(cells).toHaveLength(2);
        for (const c of cells) expect(ring(c).some((x) => land(match, x) && !(x.q === match.towns[townId]!.coord.q && x.r === match.towns[townId]!.coord.r))).toBe(true);
      }
    });
  }

  it('day 1: the leader walks one step to its ship and embarks', () => {
    const g = naval('shattered_crown', 2, 2718);
    let s = createGeneratedMatch(catalog, g, { matchId: 'nr-embark' }).match;
    const ship = s.world.ships!['start_ship_1']!;
    const gate = townGate(catalog, s, 'town_1');
    const beach = ring(ship.coord).find((x) => land(s, x) && axialDistance(x, gate) === 1)!;
    s = run(s, { kind: 'MoveHero', heroId: 'leader_1', destination: beach });
    s = run(s, { kind: 'EmbarkHero', heroId: 'leader_1', shipId: 'start_ship_1' });
    expect(heroShip(s, 'leader_1')?.shipId).toBe('start_ship_1');
    expect(s.heroes['leader_1']!.movementPoints).toBe(0);
  });

  it('Recall (Homecoming) returns to an owned town only — never into an unowned harbor on the island it stands on, never from a ship', () => {
    const g = naval('serpent_straits', 2, 1618, { unownedTowns: 'own', revealMap: true });
    let s = createGeneratedMatch(catalog, g, { matchId: 'nr-recall' }).match;
    const hero = s.heroes['leader_1']!;
    hero.spellbook = true;
    hero.knownSpellIds = [...hero.knownSpellIds, 'homecoming'];
    hero.mana = 60;
    // Stand beside the unowned harbor town on the curved island (a fixture edit).
    const free = g.mission.neutralTowns![0]!;
    const freeSite = g.mission.sites.find((x) => x.id === free.siteId)!;
    const near = ring(townGate(catalog, s, free.townId)).find((x) => land(s, x) && !g.mission.sites.some((y) => y.coord.q === x.q && y.coord.r === x.r) && !(x.q === freeSite.coord.q && x.r === freeSite.coord.r))!;
    hero.position = { ...near };
    hero.movementPoints = 600;
    s = run(s, { kind: 'CastAdventureSpell', heroId: 'leader_1', spellId: 'homecoming', target: near });
    expect(s.heroes['leader_1']!.position).toEqual(townGate(catalog, s, 'town_1'));
    const a = analyzeNavalMap(catalog, s.world.map, g.mission);
    expect(a.islandOf.get(hexKey(s.heroes['leader_1']!.position))).toBe(a.islandOf.get(hexKey(s.towns['town_1']!.coord)));
    // From a ship: refused (the hero lands first).
    const s2 = createGeneratedMatch(catalog, g, { matchId: 'nr-recall-sea' }).match;
    const h2 = s2.heroes['leader_1']!;
    Object.assign(h2, { spellbook: true, knownSpellIds: [...h2.knownSpellIds, 'homecoming'], mana: 60 });
    const ship = s2.world.ships!['start_ship_1']!;
    const beach = ring(ship.coord).find((x) => land(s2, x) && axialDistance(x, townGate(catalog, s2, 'town_1')) === 1)!;
    let t = run(s2, { kind: 'MoveHero', heroId: 'leader_1', destination: beach });
    t = run(t, { kind: 'EmbarkHero', heroId: 'leader_1', shipId: 'start_ship_1' });
    const res = processCommand({ catalog }, t, { kind: 'CastAdventureSpell', heroId: 'leader_1', spellId: 'homecoming', target: t.heroes['leader_1']!.position, commandId: 'nr:sea', expectedRevision: t.revision, actorPlayerId: 'player' } as GameCommand);
    expect(res.ok).toBe(false);
    expect(!res.ok && res.rejection.message).toMatch(/at sea/);
  });
});

describe('custom-map format with ships and the naval travel rule', () => {
  const g = naval('serpent_straits', 2, 99);
  const policy = g.mission.navalPolicy!;
  // Two islands with a strait between them (rectangle columns 10-19 are water), as in the naval fixtures.
  const base = newCustomMap(catalog, 'small', 'Strait test');
  const cellOf = (x: number, y: number) => ({ q: x - Math.floor(y / 2) + customRowOffset(base.height), r: y });
  const terrain = base.terrain.split('');
  for (let y = 0; y < 24; y++) for (let x = 10; x <= 19; x++) { const c = cellOf(x, y); terrain[c.r * base.width + c.q] = 'w'; }
  const doc: CustomMapDocument = {
    ...base,
    terrain: terrain.join(''),
    players: [{ pantheonId: 'greek' }, { pantheonId: 'norse' }],
    ships: [{ id: 'a', ...cellOf(10, 8), owner: 0 }, { id: 'b', ...cellOf(19, 16) }],
    navalPolicy: policy,
  };

  it('export and import keep the ships and the rule exactly', () => {
    const back = parseCustomMap(serializeCustomMap(doc));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.doc.ships).toEqual(doc.ships);
    expect(back.doc.navalPolicy).toEqual(policy);
    const again = parseCustomMap(serializeCustomMap(back.doc));
    expect(again.ok && again.doc).toEqual(back.doc);
  });

  it('an imported rule with portals on, or damaged, is refused; a portal on such a map is an error; the compiled mission keeps the rule', () => {
    const on = JSON.parse(serializeCustomMap(doc)) as { navalPolicy: { portals: boolean } };
    on.navalPolicy.portals = true;
    const r1 = parseCustomMap(JSON.stringify(on));
    expect(r1.ok).toBe(false);
    expect(!r1.ok && r1.error).toMatch(/Portals must stay off/);
    const damaged = JSON.parse(serializeCustomMap(doc)) as { navalPolicy: unknown };
    damaged.navalPolicy = { id: 'naval_only_v1' };
    expect(parseCustomMap(JSON.stringify(damaged)).ok).toBe(false);
    const withPortal: CustomMapDocument = { ...doc, sites: [...doc.sites, { id: 'p1', kind: 'portal', q: 3, r: 3, twinId: 'p2' }] };
    expect(validateCustomMap(catalog, withPortal).some((i) => i.severity === 'error' && /crossed by ship only/.test(i.text))).toBe(true);
    const playable: CustomMapDocument = { ...doc, sites: [{ id: 'town_a', kind: 'town', ...cellOf(9, 12), owner: 0 }, { id: 'town_b', kind: 'town', ...cellOf(20, 12), owner: 1 }] };
    const compiled = compileCustomMap(catalog, playable, [{ controller: 'human' }, { controller: 'ai' }]);
    expect(compiled.mission.navalPolicy).toEqual(policy);
  });
});
