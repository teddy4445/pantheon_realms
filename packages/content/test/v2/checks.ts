/**
 * Shared checks of campaign content v2 (campaign expansion handoff, 2026-10-15),
 * used by campaignV2.test.ts on the shipped catalog and by the per-campaign
 * tests on a catalog with one campaign under construction (harness.ts).
 */
import { expect } from 'vitest';
import { AXIAL_DIRECTIONS, hexKey, type ContentCatalog, type HexCoord, type MissionDefinition } from '@pr/rules';
import { independentApproaches, mapGraph, reachableFrom } from '../../src/campaign/v2/regionMap';

/** Where heroes cannot pass: site tiles that end a route (towns, landmarks, camps…), except crossings and gates. */
export function blockers(m: MissionDefinition, except: readonly HexCoord[] = []): Set<string> {
  const out = new Set<string>();
  for (const s of m.sites) {
    if (s.kind.type === 'crossing' || s.kind.type === 'gate') continue;
    out.add(hexKey(s.coord));
  }
  for (const c of except) out.delete(hexKey(c));
  return out;
}

/** The town's gate: the walkable neighbour joined to the town by a road. */
export function gateOf(m: MissionDefinition): HexCoord {
  const town = m.sites.find((s) => s.kind.type === 'town' && s.id === m.player.town.siteId)!;
  const roads = new Set(m.map!.roads);
  for (const d of AXIAL_DIRECTIONS) {
    const n = { q: town.coord.q + d.q, r: town.coord.r + d.r };
    const a = town.coord.q < n.q || (town.coord.q === n.q && town.coord.r <= n.r) ? town.coord : n;
    const b = a === town.coord ? n : town.coord;
    if (roads.has(`${hexKey(a)}|${hexKey(b)}`)) return n;
  }
  throw new Error(`${m.id}: the town has no road`);
}

/** The map with every sluice channel in one state. */
export function withSluices(m: MissionDefinition, open: boolean): MissionDefinition {
  const map = m.map!;
  const rows = map.rows.map((r) => r.split(''));
  for (const s of m.sites) {
    if (s.kind.type !== 'sluice') continue;
    const code = { plains: 'p', forest: 'f', rough: 'r', marsh: 's', mountain: 'm', water: 'w', void: 'v' }[open ? s.kind.openTerrain : s.kind.closedTerrain];
    for (const c of s.kind.channel) rows[c.r]![c.q] = code;
  }
  return { ...m, map: { ...map, rows: rows.map((r) => r.join('')) } };
}

/** Ferry pairs as extra links for reachability (a ferry is a route connector). */
function ferryLinks(m: MissionDefinition): [HexCoord, HexCoord][] {
  const out: [HexCoord, HexCoord][] = [];
  for (const s of m.sites) {
    if (s.kind.type !== 'portal') continue;
    const exit = m.sites.find((x) => x.id === (s.kind as { exitSiteId: string }).exitSiteId);
    if (exit) out.push([s.coord, exit.coord]);
  }
  return out;
}

/** Reachable cells from the gate (with ferries: each landing reached links to its twin). */
export function reachWithFerries(m: MissionDefinition, gate: HexCoord, sluicesOpen: boolean): Set<string> {
  const mm = withSluices(m, sluicesOpen);
  const links = ferryLinks(m);
  const block = blockers(m, links.flat());
  let reach = reachableFrom(mapGraph(mm.map!, block), gate);
  for (let i = 0; i < 6; i++) {
    let grew = false;
    for (const [a, b] of links) {
      if (reach.has(hexKey(a)) && !reach.has(hexKey(b))) {
        for (const k of reachableFrom(mapGraph(mm.map!, block), b)) reach.add(k);
        grew = true;
      }
    }
    if (!grew) break;
  }
  return reach;
}

/** Every v2 chapter of `missions`: an authored map, objective sites reachable, two approaches to the principal objective. */
export function checkV2Missions(catalog: ContentCatalog, missions: readonly MissionDefinition[]): void {
  for (const m of missions) {
    expect(m.contentVersion, m.id).toBe(2);
    expect(m.map, `${m.id}: an authored map`).toBeDefined();
    expect(catalog.mapTemplates[m.mapTemplateId], `${m.id}: no generated template`).toBeUndefined();
    const terrain = m.map!.rows.join('');
    for (const k of m.map!.roads) {
      for (const c of k.split('|')) {
        const [q, r] = c.split(',').map(Number);
        expect('wmv'.includes(terrain[r! * m.map!.width + q!]!), `${m.id}: road on impassable ${c}`).toBe(false);
      }
    }
    const gate = gateOf(m);
    const hasSluice = m.sites.some((x) => x.kind.type === 'sluice');
    const markers = new Set(m.objectives.flatMap((o) => (o.markerSiteId ? [o.markerSiteId] : [])));
    // Sites reachable with the sluices open, or (for sites the open water cuts) with them closed.
    const open = reachWithFerries(m, gate, true);
    const closed = hasSluice ? reachWithFerries(m, gate, false) : open;
    const near = (reach: Set<string>, c: HexCoord) => reach.has(hexKey(c)) || AXIAL_DIRECTIONS.some((d) => reach.has(hexKey({ q: c.q + d.q, r: c.r + d.r })));
    for (const s of m.sites) {
      if (s.kind.type === 'town') continue;
      if (!markers.has(s.id) && !(s.objectiveIds ?? []).length) continue;
      expect(near(open, s.coord) || near(closed, s.coord), `${m.id}: objective site ${s.id} unreachable from the town`).toBe(true);
    }
    // The principal objective: two approaches that share no cell.
    const principal = m.objectives.find((o) => o.id === m.principalObjectiveId);
    expect(principal, `${m.id}: principalObjectiveId`).toBeDefined();
    const target = principal?.markerSiteId ? m.sites.find((s) => s.id === principal.markerSiteId) : undefined;
    expect(target, `${m.id}: the principal objective needs a marker site`).toBeDefined();
    if (target) {
      const g = mapGraph(withSluices(m, true).map!, blockers(m, [target.coord]));
      expect(independentApproaches(g, gate, target.coord, 2), `${m.id}: two independent approaches to ${target.id}`).toBeGreaterThanOrEqual(2);
    }
    for (const h of m.hostileHeroes) expect(h.purpose, `${m.id}: ${h.commander.name} needs a stated purpose`).toBeTruthy();
    expect(m.lossConditions?.length, `${m.id}: loss conditions`).toBeGreaterThan(0);
    expect(m.briefingArt?.length, `${m.id}: briefing art`).toBeGreaterThan(0);
  }
}
