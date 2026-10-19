/**
 * Hero ships in the interface (expedition kit §07/§11, `navalMovementV1`): the map's ship views (empty
 * versus crewed, the hidden avatar aboard, fog like heroes, flags from the owner's colour and never the
 * pantheon), the ship inspector's actions and their reasons from the rules' quotes, the coastal launch
 * service's price and refusals, the travel route over the water with its embark / disembark steps and
 * day counts from `voyageDays`, the explicit confirmation at a mode change, the boarding board view, the
 * notices from committed events, and the map editor's ship tool with its save / import round trip.
 */
import { describe, expect, it } from 'vitest';
import { TERRAIN_CODES, axialNeighbors, cellIndex, hexEquals, heroShip, landingCells, quoteTravel, resources, terrainAt, tileRole, voyageDays, type HexCoord, type MatchState } from '@pr/rules';
import { catalog, cellIn, cellOf, navalDoc, navalDriver, navalMatch, paint, slots } from '@pr/testing';
import { compileCustomMap, parseCustomMap, serializeCustomMap, validateCustomMap } from '@pr/session';
import type { GameDriver } from '@pr/testing';
import {
  boardingBoardView,
  directionLabel,
  journeyReasonText,
  launchView,
  navalNotices,
  noteNavalPlayback,
  shipInspectView,
  shipViews,
  takeNavalPlayback,
  transitionPrompt,
  travelReach,
  travelRoute,
} from '../src/app/naval';
import { applyShipTool, docShipAt, placeShip, removeShipAt, shipPlacementProblem } from '../src/app/editorShips';

const P1 = 'player';
const P2 = 'p2';
const H1 = 'leader_1';
const H2 = 'leader_2';
const ALL = (s: MatchState) => new Set(s.world.map.terrain.split('').map((_, i) => i));

function shoreBeside(s: MatchState, c: HexCoord, heroId = H1, playerId = P1): HexCoord {
  const spot = axialNeighbors(c).find((n) => terrainAt(s.world.map, n) !== 'water' && tileRole(catalog, s, playerId, n, heroId) === 'open');
  if (!spot) throw new Error('no shore');
  return spot;
}
function place(d: GameDriver, heroId: string, c: HexCoord, mp = 1000): void {
  const h = d.state.heroes[heroId]!;
  h.position = { q: c.q, r: c.r };
  h.movementPoints = mp;
}

describe('ship views on the adventure map', () => {
  it('an empty neutral ship shows its neutral marker only; aboard, the ship flies the owner colour and the avatar hides', () => {
    const d = navalDriver();
    const view0 = shipViews(d.state, P1, H1, ALL(d.state));
    expect(view0).toHaveLength(1);
    expect(view0[0]).toMatchObject({ id: 'map_ship_free', occupied: false, color: null, selected: false, boarding: false });
    const ship = d.state.world.ships!.map_ship_free!;
    place(d, H1, shoreBeside(d.state, ship.coord));
    d.do({ kind: 'EmbarkHero', heroId: H1, shipId: 'map_ship_free' });
    const view1 = shipViews(d.state, P1, H1, ALL(d.state));
    expect(view1[0]).toMatchObject({ occupied: true, color: d.state.players[P1]!.color, selected: true });
    // The flag's colour is the player's, never the pantheon's: both empires are Greek here.
    expect(d.state.players[P1]!.pantheonId).toBe(d.state.players[P2]!.pantheonId);
    expect(d.state.players[P1]!.color).not.toBe(d.state.players[P2]!.color);
    // The avatar hides aboard (the map view's `embarked` flag is the rules' heroShip).
    expect(heroShip(d.state, H1)?.shipId).toBe('map_ship_free');
  });

  it("another empire's ship is drawn only while its tile is in sight; one's own always", () => {
    const d = navalDriver({ ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'mine', ...cellOf(doc, 10, 3), owner: 0 }, { id: 'theirs', ...cellOf(doc, 19, 20), owner: 1 }] });
    const none = new Set<number>();
    expect(shipViews(d.state, P1, null, none).map((v) => v.id)).toEqual(['map_ship_mine']);
    // A neutral ship far from the viewer's sight is not drawn live either (as a wandering monster).
    const theirs = d.state.world.ships!.map_ship_theirs!;
    const seen = new Set([cellIndex(d.state.world.map, theirs.coord)]);
    expect(shipViews(d.state, P1, null, seen).map((v) => v.id).sort()).toEqual(['map_ship_mine', 'map_ship_theirs']);
    expect(shipViews(d.state, P1, null, seen).find((v) => v.id === 'map_ship_theirs')!.color).toBe(d.state.players[P2]!.color);
  });

  it('nothing at all without the scenario feature (campaigns, older saves)', () => {
    const d = navalDriver();
    d.state.scenario = { ...d.state.scenario, features: { ...d.state.scenario.features!, navalMovementV1: false } };
    expect(shipViews(d.state, P1, H1, ALL(d.state))).toEqual([]);
  });
});

describe('the ship inspector (ShipInspect)', () => {
  it('Embark from the adjacent shore (the quote decides), with the reason when it cannot', () => {
    const d = navalDriver();
    const ship = d.state.world.ships!.map_ship_free!;
    const vis = ALL(d.state);
    // Far away: the embark is refused with the rules' reason, and a route is offered.
    const far = shipInspectView(catalog, d.state, P1, ship.shipId, H1, vis)!;
    expect(far.hero).toBeNull();
    expect(far.ownerName).toBe('Neutral');
    expect(far.stateLabel).toBe('At anchor');
    const embarkFar = far.actions.find((a) => a.id === 'embark')!;
    expect(embarkFar.enabled).toBe(false);
    expect(embarkFar.reason).toMatch(/beside the ship/);
    expect(far.actions.find((a) => a.id === 'route')!.enabled).toBe(true);
    // On the shore: legal, claims the neutral ship, uses all remaining movement.
    place(d, H1, shoreBeside(d.state, ship.coord), 700);
    const near = shipInspectView(catalog, d.state, P1, ship.shipId, H1, vis)!;
    const embark = near.actions.find((a) => a.id === 'embark')!;
    expect(embark).toMatchObject({ enabled: true, reason: null, command: { kind: 'EmbarkHero', heroId: H1, shipId: ship.shipId } });
    expect(embark.label).toMatch(/claims the ship/);
    expect(embark.detail).toMatch(/all remaining movement/);
    // Too little movement: refused with the rules' reason.
    d.state.heroes[H1]!.movementPoints = 40;
    const tired = shipInspectView(catalog, d.state, P1, ship.shipId, H1, vis)!.actions.find((a) => a.id === 'embark')!;
    expect(tired.enabled).toBe(false);
    expect(tired.reason).toMatch(/at least 100 movement/);
  });

  it('Disembark lists the free shores by direction; Attack an adjacent hostile crewed ship (never sent without confirmation)', () => {
    const d = navalDriver({ ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'a', ...cellOf(doc, 10, 10), owner: 0 }, { id: 'b', ...cellOf(doc, 11, 10), owner: 1 }] });
    const s = d.state;
    for (const [heroId, shipId] of [[H1, 'map_ship_a'], [H2, 'map_ship_b']] as const) {
      const ship = s.world.ships![shipId]!;
      ship.heroId = heroId;
      ship.state = 'occupied';
      s.heroes[heroId]!.position = { ...ship.coord };
      s.heroes[heroId]!.movementPoints = 1000;
    }
    const vis = ALL(s);
    const own = shipInspectView(catalog, s, P1, 'map_ship_a', H1, vis)!;
    expect(own.mine).toBe(true);
    expect(own.hero?.id).toBe(H1);
    expect(own.movement).toEqual({ left: 1000, max: expect.any(Number) });
    const dis = own.actions.find((a) => a.id === 'disembark')!;
    expect(dis.enabled).toBe(true);
    expect(own.landing.length).toBe(landingCells(catalog, s, H1).length);
    expect(own.landing.length).toBeGreaterThan(0);
    for (const l of own.landing) {
      expect(l.label).toMatch(/^Land to the (east|north-east|north-west|west|south-west|south-east)$/);
      expect(l.command).toMatchObject({ kind: 'DisembarkHero', heroId: H1, landCoord: l.coord });
    }
    const foe = shipInspectView(catalog, s, P1, 'map_ship_b', H1, vis)!;
    expect(foe.mine).toBe(false);
    expect(foe.movement).toBeNull(); // another empire's movement is never shown
    const attack = foe.actions.find((a) => a.id === 'attack')!;
    expect(attack).toMatchObject({ enabled: true, command: { kind: 'AttackShip', heroId: H1, targetShipId: 'map_ship_b' } });
    expect(attack.label).toMatch(/Board .*'s ship/);
    // The rules' reason when it cannot (no movement).
    s.heroes[H1]!.movementPoints = 10;
    expect(shipInspectView(catalog, s, P1, 'map_ship_b', H1, vis)!.actions.find((a) => a.id === 'attack')).toMatchObject({ enabled: false, reason: expect.stringMatching(/movement/) });
    // Out of sight: no inspector at all for another empire's ship.
    expect(shipInspectView(catalog, s, P1, 'map_ship_b', H1, new Set())).toBeNull();
  });
});

describe('the coastal launch service (CoastalLaunch)', () => {
  it('quotes the data price, offers the free water cells by direction and refuses with the reasons', () => {
    const d = navalDriver();
    d.state.players[P1]!.wallet = resources({ gold: 5000, wood: 20 });
    const v = launchView(catalog, d.state, P1, 'town_1', null);
    expect(v.offered).toBe(true);
    expect(v.cost.gold).toBe(1500);
    expect(v.cost.wood).toBe(10);
    expect(v.legal).toBe(true);
    expect(v.cells.length).toBeGreaterThan(0);
    for (const c of v.cells) expect(c.label).toMatch(/^Launch to the /);
    expect(v.command).toMatchObject({ kind: 'LaunchShip', townId: 'town_1', waterCoord: v.cells[0]!.coord });
    // A chosen cell is kept.
    const second = v.cells[1]?.coord;
    if (second) expect(launchView(catalog, d.state, P1, 'town_1', second).command).toMatchObject({ waterCoord: second });
    // Funds.
    d.state.players[P1]!.wallet = resources({ gold: 1000, wood: 20 });
    const poor = launchView(catalog, d.state, P1, 'town_1', null);
    expect(poor.legal).toBe(false);
    expect(poor.reason).toMatch(/1500 Gold and 10 Wood/);
    expect(poor.command).toBeNull();
    // Another empire's town.
    expect(launchView(catalog, d.state, P1, 'town_2', null).reason).toMatch(/do not own/);
    // The launch itself goes through the rules.
    d.state.players[P1]!.wallet = resources({ gold: 5000, wood: 20 });
    const ev = d.do(launchView(catalog, d.state, P1, 'town_1', null).command!);
    expect(ev.some((e) => e.kind === 'ShipLaunched')).toBe(true);
    expect(navalNotices(d.state, ev, P1, ALL(d.state))[0]!.text).toMatch(/A ship is launched at/);
  });

  it('is not offered inland, and says so when every water cell is taken', () => {
    const d = navalDriver();
    const s = d.state;
    const town = s.towns.town_1!;
    s.players[P1]!.wallet = resources({ gold: 50_000, wood: 200 });
    let n = 0;
    for (const c of axialNeighbors(town.coord)) {
      if (terrainAt(s.world.map, c) !== 'water' || Object.values(d.state.world.ships ?? {}).some((x) => hexEquals(x.coord, c))) continue;
      d.do({ kind: 'LaunchShip', townId: 'town_1', waterCoord: c });
      n++;
    }
    expect(n).toBeGreaterThan(0);
    const full = launchView(catalog, d.state, P1, 'town_1', null);
    expect(full.offered).toBe(true);
    expect(full.legal).toBe(false);
    expect(full.reason).toMatch(/No free water/);
    // The sea moved away from the west town (columns 10-11 are land again): the service is not offered at all.
    const inland = navalDriver({ terrain: (doc) => paint(doc, Array.from({ length: 24 }, (_, y) => [cellOf(doc, 10, y), cellOf(doc, 11, y)]).flat(), TERRAIN_CODES.plains), ships: (doc) => [{ id: 'free', ...cellOf(doc, 12, 8) }] });
    expect(launchView(catalog, inland.state, P1, 'town_1', null).offered).toBe(false);
  });
});

describe('travel over the water (quoteTravel)', () => {
  it('a destination on the other island is a voyage: embark and disembark steps, step days from voyageDays, and the confirmation at the shore', () => {
    const d = navalDriver();
    const s = d.state;
    // Leader 1 on the west shore near the neutral ship; the destination deep in the east island.
    const ship = s.world.ships!.map_ship_free!;
    const shore = shoreBeside(s, ship.coord);
    place(d, H1, { q: shore.q - 2, r: shore.r }, 1500);
    const target = cellIn(s, 24, 8);
    const route = travelRoute(catalog, s, H1, target);
    expect(route.quote.reachable).toBe(true);
    expect(route.quote.voyage).toBeTruthy();
    expect(route.naval).toBe(true);
    expect(route.transitions.map((t) => t.kind)).toEqual(['embark', 'disembark']);
    // The embark seal on the shore beside the ship; the route steps onto the hull next.
    expect(axialNeighbors(route.transitions[0]!.coord).some((c) => hexEquals(c, ship.coord))).toBe(true);
    expect(terrainAt(s.world.map, route.transitions[0]!.coord)).not.toBe('water');
    expect(route.path!.steps.some((c) => hexEquals(c, ship.coord))).toBe(true);
    expect(terrainAt(s.world.map, route.transitions[1]!.coord)).not.toBe('water');
    const days = route.path!.days!;
    expect(days).toHaveLength(route.path!.steps.length);
    expect(days[days.length - 1]).toBe(voyageDays(catalog, s, H1, route.quote.voyage!));
    expect(route.days).toBe(days[days.length - 1]);
    // Never earlier than the step before (days only go forward).
    for (let i = 1; i < days.length; i++) expect(days[i]!).toBeGreaterThanOrEqual(days[i - 1]!);
    // The embark costs the rest of the day: the first sea step is on a later day.
    const embarkAt = route.path!.steps.findIndex((c) => hexEquals(c, ship.coord));
    expect(days[embarkAt + 1]!).toBeGreaterThan(days[embarkAt]!);
    // Walk to the shore through the rules; the route then stands at the embark step.
    d.do({ kind: 'MoveHero', heroId: H1, destination: target });
    const q = quoteTravel(catalog, d.state, H1, target);
    expect(q.transition?.kind).toBe('embark');
    expect(q.path).toHaveLength(0);
    const p = transitionPrompt(catalog, d.state, H1, q.transition!);
    expect(p.title).toBe('Embark on the ship? Uses all remaining movement.');
    expect(p.legal).toBe(true);
    expect(p.command).toMatchObject({ kind: 'EmbarkHero', heroId: H1, shipId: ship.shipId });
    // The MoveHero itself refuses to embark by itself.
    expect(() => d.do({ kind: 'MoveHero', heroId: H1, destination: target })).toThrow();
    d.do(p.command);
    expect(heroShip(d.state, H1)?.shipId).toBe(ship.shipId);
    // Aboard: today's reach is water (and landing shores when movement allows) — none today after embarking.
    expect(travelReach(catalog, d.state, H1)).toHaveLength(0);
  });

  it('today\'s reach adds the empty ship the hero can still embark today', () => {
    const d = navalDriver();
    const ship = d.state.world.ships!.map_ship_free!;
    const shore = shoreBeside(d.state, ship.coord);
    place(d, H1, { q: shore.q - 1, r: shore.r }, 1500);
    const reach = travelReach(catalog, d.state, H1);
    expect(reach.some((c) => hexEquals(c, ship.coord))).toBe(true);
    // Without the movement to stand on the shore with 100 left, it is not offered.
    d.state.heroes[H1]!.movementPoints = 90;
    expect(travelReach(catalog, d.state, H1).some((c) => hexEquals(c, ship.coord))).toBe(false);
  });

  it('says why a journey waits', () => {
    expect(journeyReasonText('embark')).toMatch(/embark/);
    expect(journeyReasonText('disembark')).toMatch(/ashore/);
    expect(journeyReasonText('no_ship')).toMatch(/ship .* is gone/);
    expect(journeyReasonText('no_route')).toMatch(/No route/);
    expect(journeyReasonText('interrupted')).toMatch(/battle/);
    expect(journeyReasonText(undefined)).toBeNull();
    expect(directionLabel({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe('north-east');
    expect(directionLabel({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe('south-east');
  });
});

describe('boarding: the battle view and the aftermath', () => {
  function boarding(): GameDriver {
    const d = navalDriver({ ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'a', ...cellOf(doc, 13, 10), owner: 0 }, { id: 'b', ...cellOf(doc, 14, 10), owner: 1 }] });
    const s = d.state;
    for (const [heroId, shipId] of [[H1, 'map_ship_a'], [H2, 'map_ship_b']] as const) {
      const ship = s.world.ships![shipId]!;
      ship.heroId = heroId;
      ship.state = 'occupied';
      s.heroes[heroId]!.position = { ...ship.coord };
      s.heroes[heroId]!.army.slots = slots([['hoplite', 20]]);
      s.heroes[heroId]!.movementPoints = 1000;
    }
    d.do({ kind: 'AttackShip', heroId: H1, targetShipId: 'map_ship_b' });
    return d;
  }

  it('the boarding board view carries the saved cell letters, the measured projection and each deck owner colour', () => {
    const d = boarding();
    const v = boardingBoardView(d.state)!;
    expect(v).not.toBeNull();
    expect(v.cells).toBe(d.state.battle!.board!.cells);
    expect(v.cells.replace(/\./g, '')).toHaveLength(102);
    expect(v.projection).toMatchObject({ x0: 0.17, dx: 0.045, oddRowOffset: 0.0225, y0: 0.22, dy: 0.048, hexWidth: 0.043, hexHeight: 0.045 });
    expect(v.art).toMatchObject({ url: './expedition-v1/boarding-battle.png', width: 1672, height: 941 });
    expect(v.flags).toEqual({ attacker: d.state.players[P1]!.color, defender: d.state.players[P2]!.color });
    // No other battle has one.
    expect(boardingBoardView(navalMatch())).toBeNull();
  });

  it('keeps the aftermath (wreck, the winner taking the hex) for the map, and the notices', () => {
    const d = boarding();
    // Whatever the outcome, every committed ShipWrecked / BoardingResolved reaches the map playback once.
    const all = [{ kind: 'ShipWrecked', shipId: 'map_ship_b', ownerId: P2, coord: { q: 1, r: 1 }, reason: 'boarding_defeat' }, { kind: 'BoardingResolved', battleId: 'x', winner: 'attacker', outcome: 'victory', attackerShipId: 'map_ship_a', defenderShipId: 'map_ship_b', coord: { q: 1, r: 1 } }, { kind: 'ShipMoved', shipId: 'map_ship_a', heroId: H1, path: [{ q: 1, r: 1 }], facing: 0 }] as unknown as import('@pr/rules').GameEvent[];
    noteNavalPlayback(d.state, all);
    const items = takeNavalPlayback(d.state.matchId);
    expect(items.map((i) => i.kind)).toEqual(['wreck', 'move']);
    expect(items[0]).toMatchObject({ shipId: 'map_ship_b', ownerId: P2, ownerColor: d.state.players[P2]!.color });
    expect(takeNavalPlayback(d.state.matchId)).toEqual([]);
    const notes = navalNotices(d.state, all, P2, new Set());
    expect(notes.some((n) => /Your ship was lost/.test(n.text))).toBe(true);
  });
});

describe('the map editor ship tool', () => {
  it('places ships on water only (with a reason elsewhere), toggles and reassigns them, and keeps them through save, import and play', () => {
    // The two-isle test map without its ship: Empire 2's town is cut off until a ship is placed.
    let doc = navalDoc({ ships: () => [] });
    delete (doc as { ships?: unknown }).ships;
    expect(validateCustomMap(catalog, doc).some((i) => /cannot be reached/.test(i.text))).toBe(true);
    const land = cellOf(doc, 5, 5);
    expect(shipPlacementProblem(doc, land)).toMatch(/water only/);
    expect(shipPlacementProblem(doc, { q: -3, r: -3 })).toMatch(/off the map/);
    const water = cellOf(doc, 10, 8);
    const r1 = placeShip(doc, water, -1);
    expect(r1.error).toBeNull();
    doc = r1.doc;
    expect(docShipAt(doc, water)).toMatchObject({ id: 'ship_1', q: water.q, r: water.r });
    expect(docShipAt(doc, water)!.owner).toBeUndefined();
    expect(placeShip(doc, water, 0).error).toMatch(/already lies/);
    expect(placeShip(doc, land, 0).error).toMatch(/water only/);
    const second = cellOf(doc, 12, 8);
    doc = placeShip(doc, second, 0).doc;
    expect(docShipAt(doc, second)!.owner).toBe(0);
    // The tool: the same owner removes, another owner reassigns.
    const re = applyShipTool(doc, second, -1);
    expect(re.removed).toBe(false);
    expect(docShipAt(re.doc, second)!.owner).toBeUndefined();
    const gone = applyShipTool(doc, second, 0);
    expect(gone.removed).toBe(true);
    expect(docShipAt(gone.doc, second)).toBeNull();
    // Save / export text and import keep them.
    const text = serializeCustomMap(doc);
    const back = parseCustomMap(text);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.doc.ships).toEqual(doc.ships);
    // The document check accepts them on water and counts the neutral ship as the crossing; play-test compiles them.
    expect(validateCustomMap(catalog, back.doc).filter((i) => i.severity === 'error')).toEqual([]);
    const compiled = compileCustomMap(catalog, back.doc, back.doc.players.map(() => ({ controller: 'human' as const })));
    expect(JSON.stringify(compiled)).toContain('map_ship_ship_1');
    // Removing the last ship drops the field.
    const empty = removeShipAt(removeShipAt(doc, water), second);
    expect(empty.ships).toBeUndefined();
  });
});
