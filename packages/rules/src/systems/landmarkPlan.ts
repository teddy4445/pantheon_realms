import { AXIAL_DIRECTIONS, type HexCoord } from '../core/hex';
import type { WorldMapDefinition } from '../definitions/world';
function natureHash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export interface Landmark {
  id: string;
  coord: HexCoord;
  /** A waterfall's neighboring water must also be explored before showing it. */
  reveal: number[];
}
export const landmarkDistance = (a: HexCoord, b: HexCoord): number =>
  (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;

/** Deterministic candidates; callers may restrict them to reachable encounter locations. */
export function planLandmarks(map: WorldMapDefinition, sites: readonly { coord: HexCoord; archetype: string; variant?: string | null }[], available: (id: string) => boolean, accept: (landmark: Landmark) => boolean = () => true): Landmark[] {
  const roads = new Map<string, HexCoord>();
  for (const edge of map.roads) for (const end of edge.split('|')) {
    const [q, r] = end.split(',').map(Number);
    roads.set(end, { q: q!, r: r! });
  }
  const towns = sites.filter(s => s.archetype === 'town');
  const roadCoords = [...roads.values()];
  const dry = map.biome === 'desert';
  const frozen = ['tundra', 'high_pass'].includes(map.biome);
  const tropical = map.biome === 'jungle';
  const fallback = dry ? 'egyptian' : tropical ? 'mesoamerican' : ['fjord', 'tundra', 'high_pass'].includes(map.biome) ? 'norse' : map.biome === 'moor' ? 'celtic' : 'greek';
  const pools: Record<string, (Landmark & { rank: number })[]> = { waterfall: [], tree: [], ruins: [], statue: [] };
  const terrain = (c: HexCoord) => map.terrain[c.r * map.width + c.q];
  for (let r = 2; r < map.height - 2; r++) for (let q = 2; q < map.width - 2; q++) {
    const coord = { q, r }, tile = r * map.width + q, t = terrain(coord);
    if (!['p', 'r', 'f', 'm'].includes(t!)) continue;
    if (sites.some(s => landmarkDistance(coord, s.coord) < 4)) continue;
    if (roadCoords.some(c => landmarkDistance(coord, c) < 3)) continue;
    if (AXIAL_DIRECTIONS.some(d => terrain({ q: q + d.q, r: r + d.r }) === 'v')) continue;
    const add = (kind: string, name: string, reveal = [tile]) => {
      const id = `landmark.${name}`;
      if (available(id) && accept({ id, coord, reveal })) pools[kind]!.push({ id, coord, reveal, rank: natureHash(map.seed, q, r, kind) });
    };
    const water = AXIAL_DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r })).find(c => terrain(c) === 'w');
    if (t === 'm' && water && !frozen && !dry) add('waterfall', tropical ? 'waterfall-tropical' : 'waterfall-temperate', [tile, water.r * map.width + water.q]);
    if ((t === 'f' || t === 'p') && !dry && !frozen) add('tree', map.biome === 'autumn' ? 'tree-sacred-blossom' : 'tree-sacred-oak');
    if (t === 'r' || t === 'p') {
      add('ruins', dry ? 'ruins-sandstone' : 'ruins-marble');
      const nearest = [...towns].sort((a, b) => landmarkDistance(coord, a.coord) - landmarkDistance(coord, b.coord))[0];
      const p = nearest?.variant ?? fallback;
      add('statue', `statue-${p}`);
    }
  }
  for (const pool of Object.values(pools)) pool.sort((a, b) => a.rank - b.rank);
  const chosen: Landmark[] = [];
  const limit = Math.min(8, Math.max(1, Math.floor(map.width * map.height / 320)));
  for (const kind of ['waterfall', 'tree', 'ruins', 'statue', 'statue', 'ruins', 'tree', 'statue']) {
    if (chosen.length >= limit) break;
    const pick = pools[kind]!.find(c => chosen.every(p => landmarkDistance(c.coord, p.coord) >= 8));
    if (pick) chosen.push({ id: pick.id, coord: pick.coord, reveal: pick.reveal });
  }
  return chosen;
}
