/**
 * CampaignMapGenerator (campaign/02 "pr-mapgen-0.3").
 *
 * Authored story graph + fixed anchors and barriers + deterministic road carving
 * + seeded non-critical terrain + explicit validation. Output is DATA (a logical
 * WorldMapDefinition plus a cosmetic decor manifest), never a Babylon scene.
 *
 * Stages: A validate inputs, B terrain/anchors, C carve roads, D bounded terrain
 * variation, F cosmetic decor, G validate + hash. (Stage E — placing mission
 * objects — is performed by the campaign MissionRuntimeFactory from content.)
 */
import {
  AXIAL_DIRECTIONS,
  RngCursor,
  TERRAIN_CODES,
  edgeKey,
  hashValue,
  hexKey,
  seedFromLabel,
  type HexCoord,
  type MapTemplateDefinition,
  type Terrain,
  type WorldMapDefinition,
} from '@pr/rules';

export const GENERATOR_VERSION = 'pr-mapgen-0.3';
export const MAX_ATTEMPTS = 16;

export type GenerationMode = 'golden' | 'variation';

export interface DecorItem {
  readonly q: number;
  readonly r: number;
  readonly kind: 'tree' | 'pine' | 'rock' | 'shrub' | 'grass' | 'ruin';
  readonly dx: number;
  readonly dz: number;
  readonly scale: number;
  readonly rotation: number;
}

export interface MapCheck {
  readonly id: string;
  readonly pass: boolean;
  readonly detail: string;
}

export interface MapGenerationReport {
  readonly valid: boolean;
  readonly attempts: number;
  readonly checks: readonly MapCheck[];
  readonly roadEdgeCount: number;
}

export interface MapGenerationResult {
  readonly map: WorldMapDefinition;
  readonly decor: readonly DecorItem[];
  readonly report: MapGenerationReport;
}

export class MapGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MapGenerationError';
  }
}

export interface Streams {
  readonly road_ties: RngCursor;
  readonly terrain: RngCursor;
  readonly decor: RngCursor;
  readonly tactical_layout: RngCursor;
}

export function deriveStreams(seed: number, templateId: string, attempt: number): Streams {
  const make = (name: string) => new RngCursor(seedFromLabel(`${GENERATOR_VERSION}|${templateId}|${seed >>> 0}|${name}|${attempt}`));
  return { road_ties: make('road_ties'), terrain: make('terrain'), decor: make('decor'), tactical_layout: make('tactical_layout') };
}

// ---------------------------------------------------------------------------
// Internal grid
// ---------------------------------------------------------------------------

class Grid {
  readonly terrain: Terrain[];
  readonly roads = new Set<string>();
  readonly protectedCells = new Set<string>();
  constructor(readonly width: number, readonly height: number) {
    this.terrain = new Array<Terrain>(width * height).fill('plains');
  }
  inBounds(c: HexCoord): boolean {
    return c.q >= 0 && c.q < this.width && c.r >= 0 && c.r < this.height;
  }
  get(c: HexCoord): Terrain {
    return this.terrain[c.r * this.width + c.q] ?? 'mountain';
  }
  set(c: HexCoord, t: Terrain): void {
    this.terrain[c.r * this.width + c.q] = t;
  }
  passable(c: HexCoord): boolean {
    if (!this.inBounds(c)) return false;
    const t = this.get(c);
    return t !== 'mountain' && t !== 'water';
  }
  isBoundary(c: HexCoord): boolean {
    return c.q === 0 || c.r === 0 || c.q === this.width - 1 || c.r === this.height - 1;
  }
}

function validateTemplate(t: MapTemplateDefinition): void {
  if (!Number.isInteger(t.width) || !Number.isInteger(t.height) || t.width < 5 || t.height < 5 || t.width > 64 || t.height > 64) {
    throw new MapGenerationError(`${t.id}: invalid dimensions`);
  }
  const ids = new Set<string>();
  const coords = new Set<string>();
  for (const a of t.anchors) {
    if (ids.has(a.id)) throw new MapGenerationError(`${t.id}: duplicate anchor ${a.id}`);
    ids.add(a.id);
    const k = hexKey(a.coord);
    if (coords.has(k)) throw new MapGenerationError(`${t.id}: two anchors share ${k}`);
    coords.add(k);
    if (a.coord.q <= 0 || a.coord.r <= 0 || a.coord.q >= t.width - 1 || a.coord.r >= t.height - 1) {
      throw new MapGenerationError(`${t.id}: anchor ${a.id} is outside the interior domain`);
    }
  }
  for (const [a, b] of t.roadEdges) {
    if (!ids.has(a) || !ids.has(b)) throw new MapGenerationError(`${t.id}: road edge references unknown anchor ${a}/${b}`);
  }
  if (t.symmetry === 'point') {
    for (const a of t.anchors) {
      if (!coords.has(hexKey(mirrorOf(t, a.coord)))) throw new MapGenerationError(`${t.id}: anchor ${a.id} has no point-symmetric partner`);
    }
    for (const b of t.barriers) {
      const m = t.barriers.find((x) => x.q === t.width - 1 - b.q);
      if (!m || m.terrain !== b.terrain) throw new MapGenerationError(`${t.id}: barrier q=${b.q} has no point-symmetric partner`);
    }
  }
}

/** Point reflection of the grid (180° rotation); preserves axial distance and adjacency. */
export function mirrorOf(t: Pick<MapTemplateDefinition, 'width' | 'height'>, c: HexCoord): HexCoord {
  return { q: t.width - 1 - c.q, r: t.height - 1 - c.r };
}

function neighborsInOrder(c: HexCoord, order: readonly number[]): HexCoord[] {
  return order.map((i) => {
    const d = AXIAL_DIRECTIONS[i]!;
    return { q: c.q + d.q, r: c.r + d.r };
  });
}

const CANONICAL = [0, 1, 2, 3, 4, 5];

/** BFS shortest path; endpoints allowed, other reserved anchors excluded. */
function bfsPath(
  grid: Grid,
  from: HexCoord,
  to: HexCoord,
  blocked: Set<string>,
  order: (c: HexCoord) => readonly number[],
): HexCoord[] | null {
  const startKey = hexKey(from);
  const goalKey = hexKey(to);
  const prev = new Map<string, string | null>([[startKey, null]]);
  const coords = new Map<string, HexCoord>([[startKey, from]]);
  const queue: HexCoord[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    const ck = hexKey(cur);
    if (ck === goalKey) break;
    for (const n of neighborsInOrder(cur, order(cur))) {
      const nk = hexKey(n);
      if (prev.has(nk)) continue;
      if (!grid.passable(n)) continue;
      if (nk !== goalKey && blocked.has(nk)) continue;
      prev.set(nk, ck);
      coords.set(nk, n);
      queue.push(n);
    }
  }
  if (!prev.has(goalKey)) return null;
  const path: HexCoord[] = [];
  let k: string | null = goalKey;
  while (k !== null) {
    path.unshift(coords.get(k)!);
    k = prev.get(k) ?? null;
  }
  return path;
}

function shuffledOrder(rng: RngCursor): number[] {
  const arr = [...CANONICAL];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function carve(grid: Grid, path: HexCoord[]): void {
  for (let i = 1; i < path.length; i++) grid.roads.add(edgeKey(path[i - 1]!, path[i]!));
  for (const c of path) {
    grid.protectedCells.add(hexKey(c));
    for (const n of neighborsInOrder(c, CANONICAL)) if (grid.inBounds(n)) grid.protectedCells.add(hexKey(n));
  }
}

function buildAttempt(t: MapTemplateDefinition, streams: Streams, mode: GenerationMode): Grid | null {
  const grid = new Grid(t.width, t.height);
  // Stage B: boundary, barriers, anchors.
  const boundaryTerrain: Terrain = t.biome === 'coast' || t.biome === 'fjord' ? 'water' : 'mountain';
  for (let r = 0; r < t.height; r++) {
    for (let q = 0; q < t.width; q++) {
      const c = { q, r };
      if (grid.isBoundary(c)) grid.set(c, boundaryTerrain);
    }
  }
  for (const b of t.barriers) {
    for (let r = 0; r < t.height; r++) {
      const c = { q: b.q, r };
      if (b.openings.some((o) => o.q === c.q && o.r === c.r)) continue;
      grid.set(c, b.terrain);
    }
  }
  const anchorKeys = new Set(t.anchors.map((a) => hexKey(a.coord)));
  for (const a of t.anchors) {
    grid.protectedCells.add(hexKey(a.coord));
    for (const n of neighborsInOrder(a.coord, CANONICAL)) if (grid.inBounds(n) && grid.passable(n)) grid.protectedCells.add(hexKey(n));
  }
  for (const b of t.barriers) for (const o of b.openings) grid.protectedCells.add(hexKey(o));

  // Stage C: carve the authored road graph in declared order.
  const byId = new Map(t.anchors.map((a) => [a.id, a.coord]));
  const order = (): readonly number[] => (mode === 'golden' ? CANONICAL : shuffledOrder(streams.road_ties));
  for (const [aId, bId] of t.roadEdges) {
    const a = byId.get(aId)!;
    const b = byId.get(bId)!;
    const path = bfsPath(grid, a, b, anchorKeys, order);
    if (!path) return null;
    carve(grid, path);
  }
  if (t.patrolLoop && t.patrolLoop.length > 1) {
    const loop = t.patrolLoop;
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i]!;
      const b = loop[(i + 1) % loop.length]!;
      const path = bfsPath(grid, a, b, anchorKeys, order);
      if (!path) return null;
      carve(grid, path);
    }
  }

  const symmetric = t.symmetry === 'point';
  if (symmetric) {
    // Mirror the carved roads and their protection so both halves match.
    for (const k of [...grid.roads]) {
      const [a, b] = k.split('|').map((x) => {
        const [q, r] = x.split(',').map(Number);
        return mirrorOf(t, { q: q!, r: r! });
      });
      grid.roads.add(edgeKey(a!, b!));
    }
    for (const k of [...grid.protectedCells]) {
      const [q, r] = k.split(',').map(Number);
      grid.protectedCells.add(hexKey(mirrorOf(t, { q: q!, r: r! })));
    }
  }

  // Stage D: bounded terrain variation outside protected cells (no new impassable terrain).
  for (let r = 0; r < t.height; r++) {
    for (let q = 0; q < t.width; q++) {
      const c = { q, r };
      if (symmetric) {
        // Roll only the first half (row-major); its mirror receives the same terrain.
        const m = mirrorOf(t, c);
        if (m.r * t.width + m.q < r * t.width + q) continue;
      }
      if (grid.get(c) !== 'plains' || grid.protectedCells.has(hexKey(c))) continue;
      const roll = streams.terrain.nextInt(100);
      const terrain: Terrain = roll < 60 ? 'plains' : roll < 85 ? 'forest' : 'rough';
      grid.set(c, terrain);
      if (symmetric) grid.set(mirrorOf(t, c), terrain);
    }
  }
  return grid;
}

// ---------------------------------------------------------------------------
// Stage G: validation
// ---------------------------------------------------------------------------

function reachableSet(grid: Grid, start: HexCoord, closed: Set<string>): Set<string> {
  const seen = new Set<string>([hexKey(start)]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of neighborsInOrder(cur, CANONICAL)) {
      const k = hexKey(n);
      if (seen.has(k) || !grid.passable(n) || closed.has(k)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return seen;
}

export function validateGrid(t: MapTemplateDefinition, grid: Grid): MapCheck[] {
  const checks: MapCheck[] = [];
  const add = (id: string, pass: boolean, detail: string) => checks.push({ id, pass, detail });
  const anchors = t.anchors;
  // MAP-01 anchors in bounds, unique and passable.
  const badAnchors = anchors.filter((a) => !grid.inBounds(a.coord) || !grid.passable(a.coord));
  add('MAP-01', badAnchors.length === 0, badAnchors.length ? `blocked anchors: ${badAnchors.map((a) => a.id).join(', ')}` : `${anchors.length} anchors valid`);
  // MAP-02 road edges connect adjacent passable hexes.
  let badRoads = 0;
  for (const k of grid.roads) {
    const [a, b] = k.split('|').map((x) => {
      const [q, r] = x.split(',').map(Number);
      return { q: q!, r: r! };
    });
    const d = (Math.abs(a!.q - b!.q) + Math.abs(a!.r - b!.r) + Math.abs(a!.q + a!.r - b!.q - b!.r)) / 2;
    if (d !== 1 || !grid.passable(a!) || !grid.passable(b!)) badRoads++;
  }
  add('MAP-02', badRoads === 0, `${grid.roads.size} road edges, ${badRoads} invalid`);
  // MAP-03 all anchors reachable from the first anchor (town) with all gates open.
  const town = anchors[0]!.coord;
  const all = reachableSet(grid, town, new Set());
  const unreachable = anchors.filter((a) => !all.has(hexKey(a.coord)));
  add('MAP-03', unreachable.length === 0, unreachable.length ? `unreachable: ${unreachable.map((a) => a.id).join(', ')}` : 'all anchors reachable with gates open');
  // Gate checks: closing every opening of a barrier isolates everything beyond it.
  const barriers = [...t.barriers].sort((a, b) => a.q - b.q);
  barriers.forEach((b, i) => {
    const closed = new Set(b.openings.map(hexKey));
    const reach = reachableSet(grid, town, closed);
    const beyond = anchors.filter((a) => a.coord.q > b.q);
    const leaked = beyond.filter((a) => reach.has(hexKey(a.coord)));
    add(`GATE-${i + 1}-closed`, leaked.length === 0, leaked.length ? `bypass reaches ${leaked.map((a) => a.id).join(', ')}` : `barrier q=${b.q} closed isolates ${beyond.length} anchors`);
    // Opening any single opening (later barriers closed) reaches every anchor up to the next barrier.
    const next = barriers[i + 1];
    const laterClosed = new Set(barriers.slice(i + 1).flatMap((x) => x.openings.map(hexKey)));
    for (const o of b.openings) {
      const closedOthers = new Set([...b.openings.filter((x) => x.q !== o.q || x.r !== o.r).map(hexKey), ...laterClosed]);
      const r2 = reachableSet(grid, town, closedOthers);
      const region = anchors.filter((a) => a.coord.q > b.q && (!next || a.coord.q < next.q));
      const missing = region.filter((a) => !r2.has(hexKey(a.coord)));
      add(`GATE-${i + 1}-open-${o.q},${o.r}`, missing.length === 0, missing.length ? `opening ${hexKey(o)} misses ${missing.map((a) => a.id).join(', ')}` : `opening ${hexKey(o)} reaches ${region.length} anchors`);
    }
  });
  if (t.symmetry === 'point') {
    let bad = 0;
    for (let r = 0; r < t.height; r++) for (let q = 0; q < t.width; q++) if (grid.get({ q, r }) !== grid.get(mirrorOf(t, { q, r }))) bad++;
    let badRoads2 = 0;
    for (const k of grid.roads) {
      const [a, b] = k.split('|').map((x) => {
        const [q, r] = x.split(',').map(Number);
        return mirrorOf(t, { q: q!, r: r! });
      });
      if (!grid.roads.has(edgeKey(a!, b!))) badRoads2++;
    }
    add('SYM-01', bad === 0 && badRoads2 === 0, `point symmetry: ${bad} terrain and ${badRoads2} road mismatches`);
  }
  return checks;
}

function freeze(t: MapTemplateDefinition, grid: Grid, seed: number, attempt: number, mode: WorldMapDefinition['mode']): WorldMapDefinition {
  const terrain = grid.terrain.map((x) => TERRAIN_CODES[x]).join('');
  const roads = [...grid.roads].sort();
  const logicalHash = hashValue({ templateId: t.id, templateVersion: t.version, width: t.width, height: t.height, terrain, roads });
  return {
    templateId: t.id,
    templateVersion: t.version,
    generatorVersion: GENERATOR_VERSION,
    seed: seed >>> 0,
    attempt,
    mode,
    width: t.width,
    height: t.height,
    terrain,
    roads,
    logicalHash,
    biome: t.biome,
  };
}

/** Stage F: cosmetic decor from the decor stream only. Never affects the logical hash. */
export function buildDecor(map: WorldMapDefinition, streams: Streams): DecorItem[] {
  const out: DecorItem[] = [];
  const roadCells = new Set<string>();
  for (const k of map.roads) for (const c of k.split('|')) roadCells.add(c);
  const rng = streams.decor;
  for (let r = 0; r < map.height; r++) {
    for (let q = 0; q < map.width; q++) {
      const code = map.terrain[r * map.width + q];
      const onRoad = roadCells.has(`${q},${r}`);
      const count = code === 'f' ? 3 : code === 'r' ? 2 : code === 'm' ? 1 : code === 'p' ? (onRoad ? 0 : rng.nextInt(3) === 0 ? 1 : 0) : 0;
      for (let i = 0; i < count; i++) {
        const kind: DecorItem['kind'] =
          code === 'f' ? (rng.nextInt(2) === 0 ? 'pine' : 'tree') : code === 'r' ? 'rock' : code === 'm' ? 'rock' : rng.nextInt(4) === 0 ? 'shrub' : 'grass';
        out.push({
          q,
          r,
          kind,
          dx: (rng.nextInt(1000) / 1000 - 0.5) * 1.6,
          dz: (rng.nextInt(1000) / 1000 - 0.5) * 1.6,
          scale: 0.7 + rng.nextInt(600) / 1000,
          rotation: (rng.nextInt(628) / 100),
        });
      }
    }
  }
  return out;
}

export function generateMap(t: MapTemplateDefinition, seed: number = t.goldenSeed, mode: GenerationMode = 'golden'): MapGenerationResult {
  validateTemplate(t);
  let lastChecks: MapCheck[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const streams = deriveStreams(seed, t.id, attempt);
    const grid = buildAttempt(t, streams, mode);
    if (!grid) continue;
    const checks = validateGrid(t, grid);
    lastChecks = checks;
    if (checks.every((c) => c.pass)) {
      const map = freeze(t, grid, seed, attempt, mode);
      return {
        map,
        decor: buildDecor(map, streams),
        report: { valid: true, attempts: attempt + 1, checks, roadEdgeCount: grid.roads.size },
      };
    }
  }
  if (mode === 'variation' || seed !== t.goldenSeed) {
    // Fall back to the reviewed golden logical map for the same template/version.
    const golden = generateMap(t, t.goldenSeed, 'golden');
    return { ...golden, map: { ...golden.map, mode: 'golden_fallback' } };
  }
  throw new MapGenerationError(`${t.id}: golden map failed validation: ${lastChecks.filter((c) => !c.pass).map((c) => `${c.id} ${c.detail}`).join('; ')}`);
}
