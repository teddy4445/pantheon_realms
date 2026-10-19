/**
 * Coastal sites and sea salvage on the two naval templates (sea-map objects kit 2026-10-17; template
 * version 2). Placed in the first region's frame after the islands' content and copied to every slot by
 * the template's rotation, so every seat gets the same lookouts, wreck and salvage at the same sailing
 * distances, with the same drawn values (one draw per spec, never per slot):
 *
 *  - The Shattered Crown: one coastal watchtower on every home island (active or unused: an unused home
 *    island is an equally budgeted neutral opportunity), one contested lookout on every inner island where
 *    its land allows, one wreck in the open water between neighbouring inner islands, and the salvage trio
 *    (driftwood, stone cargo, lost treasury) within reach of each harbor plus driftwood and a treasury
 *    farther offshore.
 *  - The Serpent Straits: a lookout on each curved island's inner coast (it watches the inner passages; the
 *    outer bypass stays partly out of every tower's sight), one wreck in the outer sea off each flank and the
 *    same salvage per empire.
 *
 * Rules kept here (and checked again on the final map by naval/seaSitesValidate.ts): towers stand on coastal
 * land with a land approach and a beach, reached on foot from the island's gate or beaches, never within
 * sight of another seat's harbor (no tower shows a rival harbor — and none is owned on day 1); salvage and
 * wrecks float in open water (never beside land, so never on a landing, launch or ship cell), wrecks with
 * open water all around (two free approach hexes and no channel cut), salvage two hexes apart. Islands,
 * land bridges and water passability are never changed. Positions come from the layout stream of the
 * candidate, identities from their own content stream (the same for every candidate).
 */
import {
  axialDistance,
  axialNeighbors,
  coastalTowerPlacementProblem,
  hexKey,
  parseHexKey,
  seaSitePolicy,
  type ContentCatalog,
  type HexCoord,
  type RngCursor,
  type SeaPickupResource,
  type Terrain,
} from '@pr/rules';
import { coastalTowerBody, coastalTowerSkin, seaPickupAmount, seaPickupBody, shipwreckBody, wreckName, wreckOutcome, wreckSkin, type SeaSiteBody } from '../seaSites';
import { byKey, flood, originDistance, type Transform } from './geometry';
import type { NavalHarbor } from './generate';
import type { NavalTemplateInfo } from './templates';

/** One sea site in the first region's frame (copied to every slot as `${key}_${slot suffix}`). */
export interface NavalSeaSite {
  readonly key: string;
  readonly pos: HexCoord;
  readonly body: SeaSiteBody;
}

export interface NavalSeaInput {
  readonly catalog: ContentCatalog;
  readonly tpl: NavalTemplateInfo;
  /** Rotation group: slot s is the image of the first region under geom[s] (geom[0] the identity). */
  readonly geom: readonly Transform[];
  readonly R: number;
  /** Ground of a relative cell (undefined: off the map). */
  readonly terrainAt: (c: HexCoord) => Terrain | undefined;
  /** First-region island cells. */
  readonly home: ReadonlySet<string>;
  readonly outer: ReadonlySet<string>;
  readonly outerKey: 'inner' | 'crescent';
  readonly harbor: NavalHarbor;
  /** First-region cells taken by the islands' content (sites, towns, gates, monsters, hiring sites). */
  readonly busy: ReadonlySet<string>;
  readonly guardPct: number;
  readonly expanded: boolean;
  /** Positions (per candidate) and identities (per seed). */
  readonly layout: RngCursor;
  readonly content: RngCursor;
}

const PASSABLE = (t: Terrain | undefined) => !!t && t !== 'water' && t !== 'mountain' && t !== 'void';

/** The sea sites of one region, or why the candidate has no room for them (the generator tries the next). */
export function placeNavalSeaSites(inp: NavalSeaInput): NavalSeaSite[] | string {
  const { catalog, geom, terrainAt } = inp;
  const radius = seaSitePolicy(catalog).towerRadius;
  const water = (c: HexCoord) => terrainAt(c) === 'water';
  const images = (c: HexCoord) => geom.map((t) => t(c));
  const ground = { terrainAt: (c: HexCoord): Terrain => terrainAt(c) ?? 'void' };
  // Every slot's harbor (town, gate, beaches, launch water, starting ship): never within a tower's sight but its own.
  const h = inp.harbor;
  const harborCells = [h.town, h.gate, h.embark, h.beach, ...h.launch, h.ship];
  const harbors = geom.map((t) => harborCells.map(t));
  // Reserved water: every slot's starting ship and launch cells and their neighbours.
  const reservedWater = new Set<string>();
  for (const t of geom) for (const c of [h.ship, ...h.launch]) for (const x of [c, ...axialNeighbors(c)]) if (water(t(x))) reservedWater.add(hexKey(t(x)));
  // Busy cells of every slot (the islands' content is copied the same way).
  const busyAll = new Set<string>();
  for (const k of inp.busy) for (const x of images(parseHexKey(k))) busyAll.add(hexKey(x));
  const taken = new Set<string>(busyAll);
  const out: NavalSeaSite[] = [];
  const pick = <T>(list: readonly T[], top = 4): T | null => (list.length ? list[inp.layout.nextInt(Math.min(top, list.length))]! : null);
  const claim = (pos: HexCoord) => {
    for (const x of images(pos)) taken.add(hexKey(x));
  };
  const imagesFree = (pos: HexCoord, spacing: number) => {
    const all = images(pos);
    if (new Set(all.map(hexKey)).size !== all.length) return false;
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (axialDistance(all[i]!, all[j]!) < spacing) return false;
    return all.every((x) => !taken.has(hexKey(x)));
  };

  // --- Coastal watchtowers -------------------------------------------------------------------
  const towerOk = (c: HexCoord, island: ReadonlySet<string>, from: readonly HexCoord[]): boolean => {
    if (!island.has(hexKey(c)) || taken.has(hexKey(c))) return false;
    if (coastalTowerPlacementProblem(ground, c, { sites: taken, ships: new Set(), towns: [], wrecks: new Set() })) return false;
    // Never within sight of another slot's harbor.
    for (let s = 1; s < geom.length; s++) if (harbors[s]!.some((x) => axialDistance(geom[0]!(c), x) <= radius)) return false;
    // Reached on foot from the island's anchors, and taking it as a site cuts no beach off from them.
    // The anchors themselves may be sites (a town's gate); walking never passes another site.
    const anchors = new Set(from.map(hexKey));
    const walk = (k: string, extra: string | null) => island.has(k) && PASSABLE(terrainAt(parseHexKey(k))) && (!taken.has(k) || anchors.has(k)) && k !== extra;
    const before = flood([...anchors].filter((k) => walk(k, null)), (k) => walk(k, null));
    if (!axialNeighbors(c).some((n) => before.has(hexKey(n)))) return false;
    const after = flood([...anchors].filter((k) => walk(k, hexKey(c))), (k) => walk(k, hexKey(c)));
    for (const k of before) if (k !== hexKey(c) && !after.has(k)) return false;
    return imagesFree(c, 6);
  };
  const coastOf = (island: ReadonlySet<string>) => [...island].map(parseHexKey).filter((c) => PASSABLE(terrainAt(c)) && axialNeighbors(c).some(water)).sort(byKey);
  // Home island: facing the inner sea, three to nine steps from the gate.
  {
    const from = [h.gate];
    const cands = coastOf(inp.home)
      .filter((c) => axialDistance(c, h.gate) >= 3 && axialDistance(c, h.gate) <= 9 && towerOk(c, inp.home, from))
      .sort((a, b) => originDistance(a) - originDistance(b) || byKey(a, b));
    const c = pick(cands, 3);
    if (!c) return 'no coastal spot for the home lookout';
    claim(c);
    out.push({ key: 'lookout_home', pos: c, body: coastalTowerBody(catalog, 'Harbor Lookout', coastalTowerSkin(inp.tpl.biome, ground.terrainAt, c)) });
  }
  // The outer island: the coast facing the centre (the inner passages); skipped where the land has no room.
  {
    const beaches = coastOf(inp.outer).filter((c) => !taken.has(hexKey(c)));
    const inward = (c: HexCoord) => axialNeighbors(c).some((n) => water(n) && originDistance(n) < originDistance(c));
    const cands = coastOf(inp.outer)
      .filter((c) => inward(c) && towerOk(c, inp.outer, beaches))
      .sort((a, b) => originDistance(a) - originDistance(b) || byKey(a, b));
    const c = pick(cands, 3);
    if (c) {
      claim(c);
      out.push({ key: inp.outerKey === 'inner' ? 'lookout_inner' : 'lookout_straits', pos: c, body: coastalTowerBody(catalog, inp.outerKey === 'inner' ? 'Crown Lookout' : 'Straits Lookout', coastalTowerSkin(inp.tpl.biome, ground.terrainAt, c)) });
    } else if (inp.outerKey === 'crescent') return 'no coastal spot for the straits lookout';
  }

  // --- Open water ------------------------------------------------------------------------------
  /** Water with only water within `ring` hexes (never beside land: never a landing, launch or ship cell). */
  const openWater = (c: HexCoord, ring: number): boolean => {
    for (let dq = -ring; dq <= ring; dq++) {
      for (let dr = Math.max(-ring, -dq - ring); dr <= Math.min(ring, -dq + ring); dr++) {
        const x = { q: c.q + dq, r: c.r + dr };
        if (!water(x)) return false;
      }
    }
    return true;
  };
  const seaCells: HexCoord[] = [];
  for (let q = -inp.R; q <= inp.R; q++) for (let r = -inp.R; r <= inp.R; r++) {
    const c = { q, r };
    if (originDistance(c) <= inp.R && water(c)) seaCells.push(c);
  }
  seaCells.sort(byKey);
  const wrecks: HexCoord[] = [];
  // --- Wrecks ------------------------------------------------------------------------------
  {
    let target: HexCoord;
    if (inp.outerKey === 'inner') {
      // Between this region's inner island and the next one's (their island anchors), off every beach.
      const a = centroidCell(inp.outer);
      const b = geom[1]!(a);
      target = { q: Math.round((a.q + b.q) / 2), r: Math.round((a.r + b.r) / 2) };
    } else {
      // The outer sea off the curved island's flank (the long way round).
      const a = centroidCell(inp.outer);
      const d = Math.max(1, originDistance(a));
      const k = (inp.R - 4) / d;
      target = { q: Math.round(a.q * k), r: Math.round(a.r * k) };
    }
    const cands = seaCells
      .filter((c) => axialDistance(c, target) <= 4 && openWater(c, 2) && !reservedWater.has(hexKey(c)) && imagesFree(c, 6))
      .sort((x, y) => axialDistance(x, target) - axialDistance(y, target) || byKey(x, y));
    const c = pick(cands, 4);
    if (!c) return 'no open water for the wreck';
    claim(c);
    for (const x of images(c)) wrecks.push(x);
    const outcome = wreckOutcome(catalog, (n) => inp.content.nextInt(n), inp.guardPct, inp.expanded);
    out.push({ key: 'wreck', pos: c, body: shipwreckBody(catalog, wreckName((n) => inp.content.nextInt(n)), outcome, wreckSkin((n) => inp.content.nextInt(n))) });
  }
  // --- Floating salvage --------------------------------------------------------------------
  // Sailing bands from the starting ship (the Serpent Straits' harbors face the narrow rim lane: wider bands).
  const wide = inp.outerKey === 'crescent' ? 3 : 0;
  const specs: { key: string; resource: SeaPickupResource; band: readonly [number, number] }[] = [
    { key: 'salvage_wood_near', resource: 'wood', band: [3, 7 + wide] },
    { key: 'salvage_stone_near', resource: 'stone', band: [3, 7 + wide] },
    { key: 'salvage_gold_near', resource: 'gold', band: [4, 8 + wide] },
    { key: 'salvage_wood_far', resource: 'wood', band: [9 + wide, 14 + wide] },
    { key: 'salvage_gold_far', resource: 'gold', band: [10 + wide, 15 + wide] },
  ];
  const pickups: HexCoord[] = [];
  for (const sp of specs) {
    const amount = seaPickupAmount(catalog, sp.resource, (n) => inp.content.nextInt(n));
    const cands = seaCells.filter((c) => {
      const d = axialDistance(c, h.ship);
      if (d < sp.band[0] || d > sp.band[1] || reservedWater.has(hexKey(c)) || !openWater(c, 1)) return false;
      // Two hexes from other salvage, never beside a wreck (its approach stays clear), of every slot.
      for (const x of images(c)) {
        if (pickups.some((p) => axialDistance(p, x) < 2) || wrecks.some((w) => axialDistance(w, x) < 2)) return false;
      }
      return imagesFree(c, 2);
    });
    const c = pick(cands, cands.length);
    if (!c) return `no open water for ${sp.key}`;
    claim(c);
    for (const x of images(c)) pickups.push(x);
    out.push({ key: sp.key, pos: c, body: seaPickupBody(sp.resource, amount) });
  }
  return out;
}

/** The first-region cells the islands' content takes (sites, towns and gates, monsters and their rounds, hiring sites, the harbor). */
export function seaBusy(
  h: NavalHarbor,
  layouts: readonly {
    readonly sites: readonly { readonly pos: HexCoord }[];
    readonly towns?: readonly { readonly town: HexCoord; readonly gate: HexCoord }[];
    readonly monsters?: readonly { readonly home: HexCoord; readonly way: readonly HexCoord[] }[];
    readonly neutrals?: readonly { readonly pos: HexCoord }[];
  }[],
): Set<string> {
  const out = new Set<string>([h.town, h.gate, h.embark, h.beach, h.back].map(hexKey));
  for (const l of layouts) {
    for (const p of l.sites) out.add(hexKey(p.pos));
    for (const t of l.towns ?? []) {
      out.add(hexKey(t.town));
      out.add(hexKey(t.gate));
    }
    for (const m of l.monsters ?? []) for (const c of [m.home, ...m.way]) out.add(hexKey(c));
    for (const n of l.neutrals ?? []) out.add(hexKey(n.pos));
  }
  return out;
}

/** The island cell nearest its centre (stable). */
function centroidCell(cells: ReadonlySet<string>): HexCoord {
  const list = [...cells].map(parseHexKey).sort(byKey);
  let sq = 0;
  let sr = 0;
  for (const c of list) {
    sq += c.q;
    sr += c.r;
  }
  const mid = { q: sq / Math.max(1, list.length), r: sr / Math.max(1, list.length) };
  let best = list[0] ?? { q: 0, r: 0 };
  let bestD = Infinity;
  for (const c of list) {
    const dq = c.q - mid.q;
    const dr = c.r - mid.r;
    const d = (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
    if (d < bestD - 1e-9) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
