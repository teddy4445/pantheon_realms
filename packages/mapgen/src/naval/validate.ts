/**
 * Production validation of a naval random map (naval random-maps kit §3-§5 and §8), run on the final
 * mission and map after content placement. A candidate that fails any check is discarded by the
 * generator; tests run the same checks on every generated seed.
 *
 *   NAV-1  water share of the non-void terrain inside the template's band
 *   NAV-2  no land flood from a home reaches another active home or the central objective
 *   NAV-3  every island is its own land component (13 or 5), objective apart from every home
 *   NAV-4  town footprint: coastal tile, inward land gate (the rules' own gate), two usable launch cells
 *   NAV-5  embark approach: each starting ship beside a beach reached from the gate without a site or guard
 *   NAV-6  every starting ship reaches every landing-water cluster of every island
 *   NAV-7  two internally vertex-disjoint sea paths from each start's outbound water to the contested sea
 *   NAV-8  …and to every rival home island's invasion beaches (no single water tile isolates a home)
 *   NAV-9  separated landing clusters per island kind (home, inner/curved, objective)
 *   NAV-10 channels between islands and the outer bypass at least their minimum width
 *   NAV-11 every site reachable on land from its island's beaches (home sites from the gate)
 *   NAV-12 sites, guards and monsters on passable land; ships on water; decoration never on water
 *   NAV-13 the naval-only travel policy holds (no portal, sluice or ferry; portals false; ships on)
 *   NAV-14 fairness: gate→embark and first neutral landing within one hex; same usable land, budgets, shoreline
 *   NAV-15 sawmill, quarry and supplies on every home island, reached from the gate
 *   NAV-16 one empty starting ship per empire, owned by it, beside its own home island
 *   NAV-17 the objective: reached on land from every central landing cluster, with room around it
 *   NAV-18 … NAV-21 lookouts, wrecks and salvage (template v2, sea-sites kit): naval/seaSitesValidate.ts
 */
import {
  TERRAIN_BY_CODE,
  axialNeighbors,
  hexKey,
  navalPolicyIssues,
  parseHexKey,
  townGates,
  type ContentCatalog,
  type HexCoord,
  type MatchState,
  type MissionDefinition,
  type SiteDefinition,
  type Terrain,
  type WorldMapDefinition,
} from '@pr/rules';
import type { DecorItem, MapCheck } from '../generator';
import { travelCosts } from '../skirmish';
import { components, flood, stepDistances, vertexDisjointPaths } from './geometry';
import type { NavalTemplateInfo } from './templates';
import { seaSiteBudget, validateNavalSeaSites } from './seaSitesValidate';

export interface NavalLandingCluster {
  /** Landable shore cells (map coordinates). */
  readonly shore: readonly string[];
  /** Water cells beside them (where a ship lands from). */
  readonly water: readonly string[];
}

export interface NavalIsland {
  readonly index: number;
  readonly cells: readonly string[];
  readonly clusters: readonly NavalLandingCluster[];
}

export interface NavalAnalysis {
  readonly terrainAt: (k: string) => Terrain;
  readonly water: ReadonlySet<string>;
  readonly land: ReadonlySet<string>;
  readonly islands: readonly NavalIsland[];
  readonly islandOf: ReadonlyMap<string, number>;
  /** Site tiles (every mission site). */
  readonly siteCells: ReadonlySet<string>;
  /** Town site ID -> gate (the rules' own `townGates`). */
  readonly gates: ReadonlyMap<string, HexCoord>;
  /** Player IDs in seat order and their town sites. */
  readonly playerIds: readonly string[];
  readonly homeTowns: readonly SiteDefinition[];
  readonly objective: SiteDefinition | undefined;
  readonly center: HexCoord;
}

const PASSABLE: ReadonlySet<Terrain> = new Set(['plains', 'forest', 'rough', 'marsh']);

/** The rules' town gates for a generated mission (a read-only stand-in state; no match is created). */
function gatesFor(catalog: ContentCatalog, map: WorldMapDefinition, mission: MissionDefinition): Map<string, HexCoord> {
  const stub = { customMission: mission, mission: { missionId: mission.id }, world: { map } } as unknown as MatchState;
  return townGates(catalog, stub);
}

export function analyzeNavalMap(catalog: ContentCatalog, map: WorldMapDefinition, mission: MissionDefinition): NavalAnalysis {
  const terrainAt = (k: string): Terrain => {
    const c = parseHexKey(k);
    if (c.q < 0 || c.r < 0 || c.q >= map.width || c.r >= map.height) return 'void';
    return TERRAIN_BY_CODE[map.terrain[c.r * map.width + c.q] ?? 'v'] ?? 'void';
  };
  const water = new Set<string>();
  const land = new Set<string>();
  for (let r = 0; r < map.height; r++) {
    for (let q = 0; q < map.width; q++) {
      const t = TERRAIN_BY_CODE[map.terrain[r * map.width + q] ?? 'v'];
      if (t === 'water') water.add(`${q},${r}`);
      else if (t && t !== 'void') land.add(`${q},${r}`);
    }
  }
  const siteCells = new Set(mission.sites.map((s) => hexKey(s.coord)));
  const gates = gatesFor(catalog, map, mission);
  const gateCells = new Set([...gates.values()].map(hexKey));
  const comps = components(land);
  const islandOf = new Map<string, number>();
  comps.forEach((cells, i) => cells.forEach((k) => islandOf.set(k, i)));
  const islands: NavalIsland[] = comps.map((cells, index) => {
    const shoreSet = new Set(cells.filter((k) => PASSABLE.has(terrainAt(k)) && !siteCells.has(k) && !gateCells.has(k) && axialNeighbors(parseHexKey(k)).some((n) => water.has(hexKey(n)))));
    const clusters = components(shoreSet).map((shore) => {
      const w = new Set<string>();
      for (const k of shore) for (const n of axialNeighbors(parseHexKey(k))) if (water.has(hexKey(n))) w.add(hexKey(n));
      return { shore, water: [...w].sort() };
    });
    return { index, cells, clusters };
  });
  const playerIds = [mission.player.playerId, ...(mission.rivals ?? []).map((r) => r.playerId)];
  const townIds = [mission.player.town.townId, ...(mission.rivals ?? []).map((r) => r.town.townId)];
  const homeTowns = townIds.map((id) => mission.sites.find((s) => s.kind.type === 'town' && s.kind.townId === id)!).filter(Boolean);
  const objective = mission.sites.find((s) => s.id === 'relic' || s.id === 'center_gold');
  return { terrainAt, water, land, islands, islandOf, siteCells, gates, playerIds, homeTowns, objective, center: { q: (map.width - 1) / 2, r: (map.height - 1) / 2 } };
}

const relDist = (c: HexCoord, center: HexCoord) => {
  const dq = c.q - center.q;
  const dr = c.r - center.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
};

/** Water cells a ship of `ownShip` may cross (every other starting ship is in the way). */
function seaFor(a: NavalAnalysis, mission: MissionDefinition, ownShip: string | null): Set<string> {
  const blocked = new Set((mission.ships ?? []).map((s) => hexKey(s.coord)).filter((k) => k !== ownShip));
  // Shipwrecks are landmarks no ship enters (sea-sites kit): every route is checked around them.
  for (const s of mission.sites) if (s.kind.type === 'shipwreck') blocked.add(hexKey(s.coord));
  return new Set([...a.water].filter((k) => !blocked.has(k)));
}

/** Land reachable from `from` on foot: passable, never through a site (a site is a destination). */
function walkFrom(a: NavalAnalysis, from: readonly string[], island: number): Set<string> {
  const ok = (k: string) => a.islandOf.get(k) === island && PASSABLE.has(a.terrainAt(k)) && !a.siteCells.has(k);
  return flood(from.filter(ok), ok);
}

const touches = (reach: ReadonlySet<string>, k: string) => reach.has(k) || axialNeighbors(parseHexKey(k)).some((n) => reach.has(hexKey(n)));

function guardValue(s: SiteDefinition, catalog: ContentCatalog): number {
  return (s.guard?.army ?? []).reduce((n, x) => n + x.count * (catalog.creatures[x.creatureId]?.cost?.gold ?? 0), 0);
}

export function validateNavalMap(catalog: ContentCatalog, map: WorldMapDefinition, mission: MissionDefinition, tpl: NavalTemplateInfo, decor: readonly DecorItem[] = []): MapCheck[] {
  const checks: MapCheck[] = [];
  const push = (id: string, problems: string[], ok: string) => checks.push({ id, pass: problems.length === 0, detail: problems.length ? problems.slice(0, 4).join('; ') + (problems.length > 4 ? ` (+${problems.length - 4} more)` : '') : ok });
  const a = analyzeNavalMap(catalog, map, mission);
  const n = a.playerIds.length;

  // NAV-1 water share.
  const ratio = a.water.size / Math.max(1, a.water.size + a.land.size);
  push('NAV-1', ratio >= tpl.waterBand[0] && ratio <= tpl.waterBand[1] ? [] : [`water ${(ratio * 100).toFixed(2)} % outside ${tpl.waterBand[0] * 100}–${tpl.waterBand[1] * 100} %`], `water ${(ratio * 100).toFixed(2)} % of the non-void terrain`);

  // NAV-2 / NAV-3 land components.
  const homeIsland = a.homeTowns.map((t) => a.islandOf.get(hexKey(t.coord)) ?? -1);
  const objIsland = a.objective ? (a.islandOf.get(hexKey(a.objective.coord)) ?? -1) : -1;
  const p2: string[] = [];
  a.homeTowns.forEach((t, i) => {
    const reach = flood([hexKey(t.coord)], (k) => a.land.has(k));
    a.homeTowns.forEach((o, j) => {
      if (j !== i && reach.has(hexKey(o.coord))) p2.push(`${t.id} reaches ${o.id} over land`);
    });
    if (a.objective && reach.has(hexKey(a.objective.coord))) p2.push(`${t.id} reaches the objective over land`);
  });
  push('NAV-2', p2, 'no home reaches another home or the objective over land');
  const expected = tpl.id === 'shattered_crown' ? 13 : 5;
  const p3: string[] = [];
  if (a.islands.length !== expected) p3.push(`${a.islands.length} land components, expected ${expected}`);
  if (new Set(homeIsland).size !== n || homeIsland.includes(-1)) p3.push('two homes share an island');
  if (objIsland < 0 || homeIsland.includes(objIsland)) p3.push('the objective is not on its own island');
  push('NAV-3', p3, `${a.islands.length} islands, every home and the objective apart`);

  // NAV-4 town footprints (empires' towns and unowned towns).
  const shipCells = new Set((mission.ships ?? []).map((s) => hexKey(s.coord)));
  const p4: string[] = [];
  const usableLaunch = new Map<string, string[]>();
  for (const site of mission.sites.filter((s) => s.kind.type === 'town')) {
    const k = hexKey(site.coord);
    const island = a.islandOf.get(k) ?? -1;
    if (!PASSABLE.has(a.terrainAt(k))) p4.push(`${site.id} is not on open land`);
    const gate = a.gates.get(site.id);
    if (!gate) {
      p4.push(`${site.id} has no gate`);
      continue;
    }
    const gk = hexKey(gate);
    if (!PASSABLE.has(a.terrainAt(gk)) || a.islandOf.get(gk) !== island) p4.push(`${site.id}'s gate is not land of its island`);
    if (axialNeighbors(gate).some((x) => a.water.has(hexKey(x)))) p4.push(`${site.id}'s gate is on the shore, not inland`);
    const reach = walkFrom(a, [gk], island);
    const launch = axialNeighbors(site.coord).map(hexKey).filter((x) => a.water.has(x) && !shipCells.has(x));
    const usable = launch.filter((w) => axialNeighbors(parseHexKey(w)).some((x) => hexKey(x) !== k && reach.has(hexKey(x))));
    usableLaunch.set(site.id, usable);
    if (usable.length < 2) p4.push(`${site.id} has ${usable.length} usable launch cells`);
  }
  push('NAV-4', p4, 'every town is coastal with an inward gate and two usable launch cells');

  // NAV-5 / NAV-16 starting ships and the embark approach.
  const p5: string[] = [];
  const p16: string[] = [];
  const ships = mission.ships ?? [];
  const embarkCost: number[] = [];
  const blockedSites = new Set(a.siteCells);
  a.homeTowns.forEach((t, i) => {
    const mine = ships.filter((s) => s.ownerId === a.playerIds[i]);
    if (mine.length !== 1) {
      p16.push(`${a.playerIds[i]} has ${mine.length} starting ships`);
      return;
    }
    const ship = mine[0]!;
    const sk = hexKey(ship.coord);
    if (!a.water.has(sk)) p16.push(`${ship.shipId} is not on water`);
    const beaches = axialNeighbors(ship.coord).map(hexKey).filter((x) => a.islandOf.get(x) === homeIsland[i] && PASSABLE.has(a.terrainAt(x)) && !a.siteCells.has(x));
    if (beaches.length === 0) p16.push(`${ship.shipId} is not beside its own home island`);
    const gate = a.gates.get(t.id);
    if (!gate) return;
    const costs = travelCosts(map, gate, blockedSites);
    const best = Math.min(...beaches.map((b) => costs.get(b) ?? Infinity));
    if (!Number.isFinite(best)) p5.push(`${t.id}: no land path from the gate to the embark beach`);
    else if (best > 300) p5.push(`${t.id}: the embark beach is ${best} movement from the gate`);
    embarkCost.push(best);
  });
  if (ships.length !== n) p16.push(`${ships.length} starting ships for ${n} empires`);
  push('NAV-16', p16, 'one empty starting ship per empire beside its home island');
  push('NAV-5', p5, `embark beaches ${embarkCost.join(' / ')} movement from the gates, no site or guard on the way`);

  // NAV-6 every start reaches every landing-water cluster.
  const p6: string[] = [];
  const outbound: string[][] = [];
  ships.forEach((ship, i) => {
    const sk = hexKey(ship.coord);
    const sea = seaFor(a, mission, sk);
    const reach = flood([sk], (k) => sea.has(k));
    for (const isl of a.islands) {
      isl.clusters.forEach((c, ci) => {
        if (!c.water.some((w) => reach.has(w))) p6.push(`${ship.shipId} cannot reach cluster ${ci} of island ${isl.index}`);
      });
    }
    const town = a.homeTowns[i];
    outbound.push([sk, ...(town ? (usableLaunch.get(town.id) ?? []) : [])]);
  });
  push('NAV-6', p6, 'every starting ship reaches every landing cluster');

  // NAV-7 / NAV-8 vertex-disjoint sea routes.
  const p7: string[] = [];
  const p8: string[] = [];
  const objClusters = objIsland >= 0 ? a.islands[objIsland]!.clusters : [];
  const contested = [...new Set(objClusters.flatMap((c) => c.water))];
  ships.forEach((ship, j) => {
    const sea = seaFor(a, mission, hexKey(ship.coord));
    const src = outbound[j]!.filter((k) => sea.has(k));
    const toCenter = vertexDisjointPaths(sea, src, contested, 2);
    if (toCenter < 2) p7.push(`${ship.shipId}: ${toCenter} disjoint route(s) to the contested sea`);
    homeIsland.forEach((isl, i) => {
      if (i === j || isl < 0) return;
      const beaches = [...new Set(a.islands[isl]!.clusters.flatMap((c) => c.water))];
      const k = vertexDisjointPaths(sea, src, beaches, 2);
      if (k < 2) p8.push(`${ship.shipId} → ${a.homeTowns[i]!.id}: ${k} disjoint route(s)`);
    });
  });
  push('NAV-7', p7, 'two vertex-disjoint routes from every harbor to the contested sea');
  push('NAV-8', p8, 'no single water tile cuts any harbor off from a rival home’s beaches');

  // NAV-9 landing clusters.
  const p9: string[] = [];
  a.islands.forEach((isl) => {
    const isHome = homeIsland.includes(isl.index);
    const isObj = isl.index === objIsland;
    const big = isl.cells.length >= 45;
    const need = isObj ? tpl.landing.objective : isHome || (tpl.id === 'shattered_crown' && big) ? tpl.landing.home : tpl.landing.outer;
    if (isl.clusters.length < need) p9.push(`island ${isl.index} (${isObj ? 'objective' : isHome ? 'home' : 'outer'}) has ${isl.clusters.length} landing clusters, needs ${need}`);
  });
  push('NAV-9', p9, `landing clusters: ${a.islands.map((i) => i.clusters.length).join(' ')}`);

  // NAV-10 channel widths.
  const p10: string[] = [];
  const minDist = tpl.minChannel + 1;
  for (const k of a.land) {
    const c = parseHexKey(k);
    const own = a.islandOf.get(k);
    for (let dq = -minDist + 1; dq < minDist; dq++) {
      for (let dr = Math.max(-minDist + 1, -dq - minDist + 1); dr <= Math.min(minDist - 1, -dq + minDist - 1); dr++) {
        const x = `${c.q + dq},${c.r + dr}`;
        const other = a.islandOf.get(x);
        if (other !== undefined && other !== own) p10.push(`${k} is within ${minDist - 1} of island ${other}`);
      }
    }
  }
  // The sea along the map edge: behind a home island at least a channel wide, around the outer islands the outer bypass.
  const R = 25;
  for (const k of a.land) {
    const isl = a.islandOf.get(k)!;
    if (isl === objIsland) continue;
    const need = homeIsland.includes(isl) ? tpl.minChannel : tpl.minOuterBypass;
    if (relDist(parseHexKey(k), a.center) > R - need) p10.push(`${k} narrows the sea along the edge below ${need}`);
  }
  push('NAV-10', [...new Set(p10)], `channels at least ${tpl.minChannel} water hexes wide; outer sea at least ${tpl.minOuterBypass}`);

  // NAV-11 site reachability; NAV-15 home essentials.
  const p11: string[] = [];
  const p15: string[] = [];
  const gateReach = new Map<number, Set<string>>();
  a.homeTowns.forEach((t, i) => {
    const gate = a.gates.get(t.id);
    if (gate) gateReach.set(homeIsland[i]!, walkFrom(a, [hexKey(gate)], homeIsland[i]!));
  });
  for (const site of mission.sites) {
    const k = hexKey(site.coord);
    const isl = a.islandOf.get(k);
    if (isl === undefined) continue;
    const fromGate = gateReach.get(isl);
    const reach = fromGate ?? walkFrom(a, a.islands[isl]!.clusters.flatMap((c) => c.shore), isl);
    const target = site.kind.type === 'town' ? hexKey(a.gates.get(site.id) ?? site.coord) : k;
    if (!touches(reach, target)) p11.push(`${site.id} cannot be reached on land`);
  }
  if (gateReach.size > 0) {
    for (const [isl, reach] of gateReach) for (const c of a.islands[isl]!.clusters) for (const s of c.shore) if (!reach.has(s)) p11.push(`beach ${s} of home island ${isl} is cut off from the gate`);
  }
  a.homeTowns.forEach((_, i) => {
    const suffix = `_${i + 1}`;
    for (const key of ['sawmill', 'quarry', 'cache']) {
      const s = mission.sites.find((x) => x.id === `${key}${suffix}`);
      if (!s || a.islandOf.get(hexKey(s.coord)) !== homeIsland[i]) p15.push(`${key}${suffix} is not on the home island`);
      else if (s.guard || !touches(gateReach.get(homeIsland[i]!) ?? new Set(), hexKey(s.coord))) p15.push(`${key}${suffix} is not reached safely from the gate`);
    }
  });
  push('NAV-11', [...new Set(p11)], 'every site is reached on land from its island’s beaches');
  push('NAV-15', p15, 'sawmill, quarry and supplies on every home island, reached safely from the gate');

  // NAV-12 placement.
  const p12: string[] = [];
  const keys = mission.sites.map((s) => hexKey(s.coord));
  if (new Set(keys).size !== keys.length) p12.push('two sites share a tile');
  // Sea salvage and wrecks float on water (sea-sites kit); every other site stands on passable land.
  for (const s of mission.sites) {
    const onWater = s.kind.type === 'sea_pickup' || s.kind.type === 'shipwreck';
    if (onWater ? a.terrainAt(hexKey(s.coord)) !== 'water' : !PASSABLE.has(a.terrainAt(hexKey(s.coord)))) p12.push(`${s.id} is not on ${onWater ? 'water' : 'passable land'}`);
  }
  for (const h of mission.hostileHeroes ?? []) if (!PASSABLE.has(a.terrainAt(hexKey(h.startCoord))) || a.siteCells.has(hexKey(h.startCoord))) p12.push(`${h.commander.name} does not start on open land`);
  for (const d of decor) {
    const t = a.terrainAt(`${d.q},${d.r}`);
    if (t === 'water' || t === 'void') p12.push(`decoration on ${t} at ${d.q},${d.r}`);
  }
  push('NAV-12', p12, 'sites, monsters and decoration on land; ships on water');

  // NAV-13 policy.
  push('NAV-13', navalPolicyIssues(mission, mission.features), 'naval-only travel: no portal, sluice or ferry; portals off; ships on');

  // NAV-14 fairness.
  const p14: string[] = [];
  const spread = (xs: number[]) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);
  if (spread(embarkCost) > 100) p14.push(`gate→embark ${embarkCost.join(' / ')}`);
  const firstNeutral = ships.map((ship) => {
    const sk = hexKey(ship.coord);
    const sea = seaFor(a, mission, sk);
    const dist = stepDistances([sk], (k) => sea.has(k));
    let best = Infinity;
    for (const isl of a.islands) {
      if (homeIsland.includes(isl.index)) continue;
      for (const c of isl.clusters) for (const w of c.water) best = Math.min(best, dist.get(w) ?? Infinity);
    }
    return best;
  });
  if (spread(firstNeutral) > 1 || firstNeutral.some((x) => !Number.isFinite(x))) p14.push(`first neutral landing ${firstNeutral.join(' / ')} hexes`);
  const usable = homeIsland.map((isl) => (isl >= 0 ? a.islands[isl]!.cells.filter((k) => PASSABLE.has(a.terrainAt(k))).length : 0));
  if (spread(usable) > 0) p14.push(`usable home land ${usable.join(' / ')}`);
  const shore = homeIsland.map((isl) => (isl >= 0 ? a.islands[isl]!.clusters.reduce((s, c) => s + c.shore.length, 0) : 0));
  if (spread(shore) > 0) p14.push(`accessible home shoreline ${shore.join(' / ')}`);
  const budget = a.playerIds.map((_, i) =>
    mission.sites
      .filter((s) => s.id.endsWith(`_${i + 1}`) && s.kind.type !== 'town')
      .map((s) => `${s.id.slice(0, -`_${i + 1}`.length)}:${s.kind.type}:${guardValue(s, catalog)}:${s.guard?.reward.resources?.gold ?? 0}${seaSiteBudget(s, catalog)}`)
      .sort()
      .join(','),
  );
  if (new Set(budget).size > 1) p14.push('the empires’ sites, guards and rewards differ');
  push('NAV-14', p14, `fair: embark ${embarkCost.join('/')}, first neutral ${firstNeutral.join('/')} hexes, usable land ${usable[0]}, shoreline ${shore[0]}`);

  // NAV-17 the objective island.
  const p17: string[] = [];
  if (!a.objective) p17.push('no central objective');
  else {
    const ok = hexKey(a.objective.coord);
    const room = axialNeighbors(a.objective.coord).filter((x) => PASSABLE.has(a.terrainAt(hexKey(x))) && !a.siteCells.has(hexKey(x))).length;
    if (room < 2) p17.push(`only ${room} free tiles beside the objective`);
    objClusters.forEach((c, ci) => {
      const reach = walkFrom(a, [...c.shore], objIsland);
      if (!touches(reach, ok)) p17.push(`central landing ${ci} has no land path to the objective`);
    });
  }
  push('NAV-17', p17, `the objective is reached from all ${objClusters.length} central landing clusters`);
  // NAV-18 – NAV-21: coastal watchtowers, wrecks and salvage (sea-sites kit; naval/seaSitesValidate.ts).
  checks.push(...validateNavalSeaSites(catalog, map, mission, tpl, a));
  return checks;
}
