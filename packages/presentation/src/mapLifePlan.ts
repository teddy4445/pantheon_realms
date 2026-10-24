import type { HexCoord, WorldMapDefinition } from '@pr/rules';

const DIRECTIONS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]] as const;
export interface ShoreLife {
  water: HexCoord;
  land: HexCoord;
  seed: number;
  reeds: boolean;
  birds: boolean;
  dock: boolean;
}

/** Stable, sparse dressing. Both sides must be revealed before a shore detail is shown. */
export function planShoreLife(map: Pick<WorldMapDefinition, 'width' | 'height' | 'terrain'>, towns: readonly HexCoord[]): ShoreLife[] {
  const out: ShoreLife[] = [];
  const usedDocks = new Set<number>();
  for (let r = 0; r < map.height; r++) for (let q = 0; q < map.width; q++) {
    if (map.terrain[r * map.width + q] !== 'w') continue;
    const shore = DIRECTIONS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
      .filter(c => c.q >= 0 && c.r >= 0 && c.q < map.width && c.r < map.height)
      .filter(c => ['p', 'f', 's', 'r'].includes(map.terrain[c.r * map.width + c.q]!));
    if (!shore.length) continue;
    const seed = ((q * 73856093) ^ (r * 19349663)) >>> 0;
    const town = towns.findIndex(t => shore.some(c => c.q === t.q && c.r === t.r));
    const dock = town >= 0 && !usedDocks.has(town);
    if (dock) usedDocks.add(town);
    const land = dock ? towns[town]! : shore[seed % shore.length]!;
    // Bound the decoration count even on very large maps; functional towns never depend on this.
    if (out.length >= 120 || (!dock && seed % 3 !== 0)) continue;
    out.push({ water: { q, r }, land, seed, reeds: !dock && seed % 2 === 0, birds: seed % 7 === 0, dock });
  }
  return out;
}

/** Shared visibility policy: do not reveal coast geometry or activity through fog. */
export function shoreLifeVisible(item: ShoreLife, width: number, visible: ReadonlySet<number>): boolean {
  return visible.has(item.water.r * width + item.water.q) && visible.has(item.land.r * width + item.land.q);
}
