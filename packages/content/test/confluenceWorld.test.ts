import { describe, expect, it } from 'vitest';
import { AXIAL_DIRECTIONS, type HexCoord } from '@pr/rules';
import { ACCORD_ISLE, ACCORD_LANDINGS, CONFLUENCE_MASTER, CONFLUENCE_REGIONS, CONFLUENCE_TOWNS, confluenceCoord, confluenceMap } from '../src/campaign/confluence/world';

const map = CONFLUENCE_MASTER.map;
const key = (c: HexCoord) => `${c.q},${c.r}`;
const at = (c: HexCoord, rows = map.rows) => rows[c.r]?.[c.q] ?? 'v';
const neighbors = (c: HexCoord) => AXIAL_DIRECTIONS.map((d) => ({ q: c.q + d.q, r: c.r + d.r }));
function reach(start: HexCoord, allowed: (c: HexCoord) => boolean): Set<string> {
  const visited = new Set<string>();
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]!;
    if (visited.has(key(c)) || !allowed(c)) continue;
    visited.add(key(c)); queue.push(...neighbors(c));
  }
  return visited;
}
describe('Confluence shared geography', () => {
  it('has a bounded navigable sea budget and preserves both eras’ coastlines', () => {
    const codes = map.rows.join('').replaceAll('v', '');
    const water = [...codes].filter((c) => c === 'w').length / codes.length;
    expect(water).toBeGreaterThanOrEqual(0.35);
    expect(water).toBeLessThanOrEqual(0.40);
    const before = confluenceMap('discovery').rows.join('');
    const after = confluenceMap('aftermath').rows.join('');
    expect([...before].map((c) => c === 'w')).toEqual([...after].map((c) => c === 'w'));
  });
  it('connects all six launch points to one sea and keeps the central objective ship-only with two beaches', () => {
    const sea = reach(confluenceCoord(CONFLUENCE_TOWNS.greek.landing), (c) => at(c) === 'w');
    for (const region of CONFLUENCE_REGIONS) {
      const t = CONFLUENCE_TOWNS[region];
      expect(sea.has(key(confluenceCoord(t.landing))), `${region} port connects to the sea`).toBe(true);
      expect(at(confluenceCoord(t.at))).toBe('p');
      expect(neighbors(confluenceCoord(t.at)).some((c) => sea.has(key(c))), `${region} town can launch`).toBe(true);
    }
    const island = reach(confluenceCoord(ACCORD_ISLE), (c) => !['w', 'v', 'm'].includes(at(c)));
    for (const region of CONFLUENCE_REGIONS) expect(island.has(key(confluenceCoord(CONFLUENCE_TOWNS[region].at)))).toBe(false);
    for (const landing of ACCORD_LANDINGS) {
      expect(island.has(key(confluenceCoord(landing)))).toBe(true);
      expect(neighbors(confluenceCoord(landing)).some((c) => sea.has(key(c)))).toBe(true);
    }
  });
  it('gives every region navigable water, an offshore objective and room to approach its town from either side', () => {
    for (const region of CONFLUENCE_REGIONS) {
      const rows = confluenceMap('discovery', region).rows;
      const t = CONFLUENCE_TOWNS[region];
      const town = confluenceCoord(t.at);
      const walkable = (c: HexCoord) => !['w', 'v', 'm'].includes(at(c, rows));
      const approaches = neighbors(town).filter(walkable);
      expect(approaches.length, region).toBeGreaterThanOrEqual(2);
      const alternate = reach(approaches[0]!, (c) => key(c) !== key(town) && walkable(c));
      expect(approaches.slice(1).some((c) => alternate.has(key(c))), `${region} town has a circuit`).toBe(true);
      expect(walkable(confluenceCoord(t.island)), `${region} survey island is in its region`).toBe(true);
      const land = reach(town, walkable);
      expect(land.has(key(confluenceCoord(t.island))), `${region} survey island requires a ship`).toBe(false);
      const sea = reach(confluenceCoord(t.landing), (c) => at(c, rows) === 'w');
      const beach = [...reach(confluenceCoord(t.island), walkable)].some((k) => {
        const [q, r] = k.split(',').map(Number);
        return neighbors({ q: q!, r: r! }).some((c) => sea.has(key(c)));
      });
      expect(beach, `${region} survey island has a reachable landing`).toBe(true);
    }
  });
});
