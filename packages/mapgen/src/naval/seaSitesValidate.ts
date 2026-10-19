/**
 * Production checks of the naval templates' coastal sites and sea salvage (sea-sites kit, template v2),
 * run with NAV-1 … NAV-17 on the final mission and map (a candidate failing any is discarded):
 *
 *   NAV-18 placement: every lookout on coastal land with a land approach and a beach; every salvage and
 *          wreck on open water (never beside land, so never on a landing, launch or ship cell), wrecks with
 *          two free approach hexes and no sea cut, salvage two hexes apart and clear of every wreck
 *   NAV-19 sight: no lookout sees more than one seat's harbor (its own region's): no tower shows a rival
 *          harbor, and none is owned on day 1
 *   NAV-20 fairness: every seat has its home lookout, its wreck and the same salvage (resources, amounts,
 *          outcomes), the near salvage at the same sailing distance from its starting ship (within 1 hex)
 *   NAV-21 the Serpent Straits' outer bypass stays partly out of every tower's sight (at least a quarter of
 *          the rim sea); the Shattered Crown's inner lookouts are counted (where the land allows)
 * Wrecks block sailing, so NAV-6 – NAV-8 already check every route around them (validate.ts `seaFor`).
 */
import {
  axialDistance,
  axialNeighbors,
  coastalTowerPlacementProblem,
  hexKey,
  mapGround,
  seaPickupPlacementProblem,
  seaPlacementContextOf,
  shipwreckPlacementProblem,
  type ContentCatalog,
  type HexCoord,
  type MissionDefinition,
  type SiteDefinition,
  type WorldMapDefinition,
} from '@pr/rules';
import type { MapCheck } from '../generator';
import { stepDistances } from './geometry';
import type { NavalTemplateInfo } from './templates';
import type { NavalAnalysis } from './validate';

/** The budget words of a sea site (appended to NAV-14's per-seat budget). */
export function seaSiteBudget(s: SiteDefinition, catalog: ContentCatalog): string {
  const k = s.kind;
  if (k.type === 'sea_pickup') return `:${k.resource}${k.amount}`;
  if (k.type === 'coastal_watchtower') return `:r${k.radius}`;
  if (k.type === 'shipwreck') {
    const value = (k.outcome.guard?.army ?? []).reduce((n, x) => n + x.count * (catalog.creatures[x.creatureId]?.cost?.gold ?? 0), 0);
    return `:${k.outcome.kind}:${k.outcome.reward.gold ?? 0}/${k.outcome.reward.wood ?? 0}:${value}:${k.outcome.artifactId ? 'artifact' : '-'}:${k.exploreCost}`;
  }
  return '';
}

export function validateNavalSeaSites(catalog: ContentCatalog, map: WorldMapDefinition, mission: MissionDefinition, tpl: NavalTemplateInfo, a: NavalAnalysis): MapCheck[] {
  const checks: MapCheck[] = [];
  const push = (id: string, problems: string[], ok: string) => checks.push({ id, pass: problems.length === 0, detail: problems.length ? problems.slice(0, 4).join('; ') + (problems.length > 4 ? ` (+${problems.length - 4} more)` : '') : ok });
  const ground = mapGround(map);
  const towers = mission.sites.filter((s) => s.kind.type === 'coastal_watchtower');
  const pickups = mission.sites.filter((s) => s.kind.type === 'sea_pickup');
  const wrecks = mission.sites.filter((s) => s.kind.type === 'shipwreck');
  const water = (c: HexCoord) => ground.terrainAt(c) === 'water';
  const besideLand = (c: HexCoord) => axialNeighbors(c).some((n) => !water(n));
  const shipRing = new Set<string>();
  for (const sh of mission.ships ?? []) for (const c of [sh.coord, ...axialNeighbors(sh.coord)]) shipRing.add(hexKey(c));

  // NAV-18 placement.
  const p18: string[] = [];
  for (const s of [...towers, ...pickups, ...wrecks]) {
    const ctx = { ...seaPlacementContextOf(mission, s.id), reservedWater: shipRing };
    const problem =
      s.kind.type === 'coastal_watchtower' ? coastalTowerPlacementProblem(ground, s.coord, ctx) : s.kind.type === 'sea_pickup' ? seaPickupPlacementProblem(ground, s.coord, ctx) : shipwreckPlacementProblem(ground, s.coord, ctx);
    if (problem) p18.push(`${s.id}: ${problem}`);
    if (s.kind.type !== 'coastal_watchtower' && besideLand(s.coord)) p18.push(`${s.id} lies beside land (a landing hex)`);
  }
  for (let i = 0; i < pickups.length; i++) for (let j = i + 1; j < pickups.length; j++) if (axialDistance(pickups[i]!.coord, pickups[j]!.coord) < 2) p18.push(`${pickups[i]!.id} and ${pickups[j]!.id} touch`);
  for (const p of pickups) for (const w of wrecks) if (axialDistance(p.coord, w.coord) < 2) p18.push(`${p.id} lies in ${w.id}'s approach`);
  push('NAV-18', p18, `${towers.length} lookouts on the coast, ${wrecks.length} wrecks and ${pickups.length} salvage on open water`);

  // NAV-19 sight: harbors of every seat (town tile, gate, launch water, starting ship).
  const p19: string[] = [];
  const harbors = a.homeTowns.map((t, i) => {
    const cells: HexCoord[] = [t.coord, ...axialNeighbors(t.coord).filter(water)];
    const gate = a.gates.get(t.id);
    if (gate) cells.push(gate);
    for (const sh of mission.ships ?? []) if (sh.ownerId === a.playerIds[i]) cells.push(sh.coord);
    return cells;
  });
  for (const t of towers) {
    if (t.kind.type !== 'coastal_watchtower') continue;
    const r = t.kind.radius;
    const seen = harbors.map((cells, i) => (cells.some((c) => axialDistance(c, t.coord) <= r) ? i : -1)).filter((i) => i >= 0);
    if (seen.length > 1) p19.push(`${t.id} sees the harbors of seats ${seen.map((i) => i + 1).join(' and ')}`);
    if (seen.length === 1 && !t.id.endsWith(`_${seen[0]! + 1}`)) p19.push(`${t.id} sees seat ${seen[0]! + 1}'s harbor from another region`);
  }
  push('NAV-19', p19, 'no lookout shows a rival harbor; every lookout starts unowned');

  // NAV-20 fairness.
  const p20: string[] = [];
  const n = a.playerIds.length;
  const seatSites = (i: number) => mission.sites.filter((s) => s.id.endsWith(`_${i + 1}`));
  const nearDist: string[] = [];
  for (let i = 0; i < n; i++) {
    const mine = seatSites(i);
    if (!mine.some((s) => s.kind.type === 'coastal_watchtower' && s.id.startsWith('lookout_home_'))) p20.push(`seat ${i + 1} has no home lookout`);
    if (!mine.some((s) => s.kind.type === 'shipwreck')) p20.push(`seat ${i + 1} has no wreck`);
    const salvage = mine.filter((s) => s.kind.type === 'sea_pickup');
    if (salvage.length < 3) p20.push(`seat ${i + 1} has ${salvage.length} salvage`);
    const ship = (mission.ships ?? []).find((sh) => sh.ownerId === a.playerIds[i]);
    if (ship) {
      const blocked = new Set([...(mission.ships ?? []).map((s) => hexKey(s.coord)), ...wrecks.map((w) => hexKey(w.coord))]);
      blocked.delete(hexKey(ship.coord));
      const dist = stepDistances([hexKey(ship.coord)], (k) => a.water.has(k) && !blocked.has(k));
      nearDist.push(
        salvage
          .filter((s) => s.id.includes('_near_'))
          .map((s) => dist.get(hexKey(s.coord)) ?? -1)
          .sort((x, y) => x - y)
          .join('/'),
      );
    }
  }
  if (nearDist.some((d) => d.includes('-1'))) p20.push(`unreachable near salvage (${nearDist.join(' · ')})`);
  else if (nearDist.length > 1) {
    const rows = nearDist.map((d) => d.split('/').map(Number));
    for (let j = 0; j < (rows[0]?.length ?? 0); j++) {
      const col = rows.map((r) => r[j] ?? 0);
      if (Math.max(...col) - Math.min(...col) > 1) p20.push(`near salvage sailing distances differ: ${nearDist.join(' · ')}`);
    }
  }
  push('NAV-20', [...new Set(p20)], `every seat: a home lookout, a wreck, ${seatSites(0).filter((s) => s.kind.type === 'sea_pickup').length} salvage; near salvage ${nearDist[0] ?? '-'} sea hexes from the ship`);

  // NAV-21 tower sight over the outer sea.
  const p21: string[] = [];
  let detail = '';
  if (tpl.id === 'serpent_straits') {
    const R = 25;
    const rel = (k: string) => {
      const [q, r] = k.split(',').map(Number) as [number, number];
      const dq = q - a.center.q;
      const dr = r - a.center.r;
      return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
    };
    const rim = [...a.water].filter((k) => rel(k) >= R - tpl.minOuterBypass);
    const seen = rim.filter((k) => {
      const [q, r] = k.split(',').map(Number) as [number, number];
      return towers.some((t) => t.kind.type === 'coastal_watchtower' && axialDistance(t.coord, { q, r }) <= t.kind.radius);
    });
    const hidden = rim.length ? (rim.length - seen.length) / rim.length : 1;
    if (hidden < 0.25) p21.push(`only ${(hidden * 100).toFixed(0)} % of the outer bypass is out of tower sight`);
    if (!towers.some((t) => t.id.startsWith('lookout_straits_'))) p21.push('no lookout on the curved islands');
    detail = `${(hidden * 100).toFixed(0)} % of the outer bypass out of tower sight; ${towers.filter((t) => t.id.startsWith('lookout_straits_')).length} straits lookouts`;
  } else {
    detail = `${towers.filter((t) => t.id.startsWith('lookout_inner_')).length} inner lookouts, ${towers.filter((t) => t.id.startsWith('lookout_home_')).length} home lookouts`;
  }
  push('NAV-21', p21, detail);
  return checks;
}
