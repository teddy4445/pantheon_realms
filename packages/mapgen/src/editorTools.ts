/**
 * Map editor tools (owner request 2026-10-07): the symmetry brush and "generate
 * a random map, then edit it".
 *
 * Symmetry works on the drawn map: a cell's centre is reflected (left–right,
 * top–bottom, both, or turned half around the map's centre) and the cell under
 * the reflected point is painted too. Turning half around is exact on the
 * editor's even-row rectangles; a mirror moves alternate rows by half a hex, so
 * the mirrored cell is the nearest one (the usual hex-map compromise).
 *
 * A generated random map becomes an ordinary editor document: the same terrain
 * and roads (moved into the editor's rectangle), its towns, mines and other
 * sites with their guards and rewards. What the editor has no site for (one-off
 * map events) is left out and listed; wandering monsters become standing ones.
 */
import { axialDistance, edgeKey, parseHexKey, CUSTOM_MAP_FORMAT, CUSTOM_MAP_VERSION, type ContentCatalog, type CustomGuard, type CustomMapDocument, type CustomReward, type CustomSite, type CustomSiteKind, type HexCoord, type MissionDefinition, type RewardDefinition, type StackSpec, type WorldMapDefinition } from '@pr/rules';
import { customInRect, customRowOffset } from './custom';

export type CustomSymmetry = 'none' | 'mirror_lr' | 'mirror_tb' | 'quad' | 'rotate';

export const CUSTOM_SYMMETRIES: readonly { readonly id: CustomSymmetry; readonly label: string; readonly summary: string }[] = [
  { id: 'none', label: 'Off', summary: 'Paint one place only.' },
  { id: 'mirror_lr', label: 'Left–right', summary: 'Also paint the mirror image across the vertical middle line.' },
  { id: 'mirror_tb', label: 'Top–bottom', summary: 'Also paint the mirror image across the horizontal middle line.' },
  { id: 'quad', label: 'Four ways', summary: 'Mirror across both middle lines: four copies.' },
  { id: 'rotate', label: 'Turned', summary: 'Also paint the copy turned half around the centre (exact on every map size).' },
];

function rect(doc: Pick<CustomMapDocument, 'width' | 'height'>): { cols: number; rows: number; off: number } {
  const off = customRowOffset(doc.height);
  return { cols: doc.width - off, rows: doc.height, off };
}

/** The drawn position of a stored cell: column (odd rows half a hex right) and row. */
function toPoint(doc: Pick<CustomMapDocument, 'width' | 'height'>, c: HexCoord): { x: number; y: number } {
  const { off } = rect(doc);
  const col = c.q + Math.floor(c.r / 2) - off;
  return { x: col + 0.5 * (c.r & 1), y: c.r };
}

function fromPoint(doc: Pick<CustomMapDocument, 'width' | 'height'>, x: number, y: number): HexCoord {
  const { off } = rect(doc);
  const r = Math.round(y);
  const col = Math.round(x - 0.5 * (r & 1) + 1e-9);
  return { q: col - Math.floor(r / 2) + off, r };
}

/** The cells a symmetric brush paints for `c` (itself first), each on the map, without repeats. */
export function symmetricCells(doc: Pick<CustomMapDocument, 'width' | 'height'>, c: HexCoord, mode: CustomSymmetry): HexCoord[] {
  const { cols, rows } = rect(doc);
  const out: HexCoord[] = [c];
  if (mode === 'none') return out;
  const p = toPoint(doc, c);
  const cx = (cols - 0.5) / 2;
  const cy = (rows - 1) / 2;
  const lr = { x: 2 * cx - p.x, y: p.y };
  const tb = { x: p.x, y: 2 * cy - p.y };
  const both = { x: 2 * cx - p.x, y: 2 * cy - p.y };
  const points = mode === 'mirror_lr' ? [lr] : mode === 'mirror_tb' ? [tb] : mode === 'rotate' ? [both] : [lr, tb, both];
  for (const pt of points) {
    const m = fromPoint(doc, pt.x, pt.y);
    if (customInRect(cols, rows, m) && !out.some((x) => x.q === m.q && x.r === m.r)) out.push(m);
  }
  return out;
}

/** The road edges a symmetric road brush draws for the edge a–b (itself first); a copy whose cells are not neighbours is left out. */
export function symmetricEdges(doc: Pick<CustomMapDocument, 'width' | 'height'>, a: HexCoord, b: HexCoord, mode: CustomSymmetry): string[] {
  const out = [edgeKey(a, b)];
  if (mode === 'none') return out;
  // Pair the copies by transform: recompute each transform for both ends.
  const pairs: [HexCoord, HexCoord][] = [];
  const pa = toPoint(doc, a);
  const pb = toPoint(doc, b);
  const { cols, rows } = rect(doc);
  const cx = (cols - 0.5) / 2;
  const cy = (rows - 1) / 2;
  const tf = mode === 'mirror_lr' ? [[true, false]] : mode === 'mirror_tb' ? [[false, true]] : mode === 'rotate' ? [[true, true]] : [[true, false], [false, true], [true, true]];
  for (const [fx, fy] of tf) {
    const m = (p: { x: number; y: number }) => fromPoint(doc, fx ? 2 * cx - p.x : p.x, fy ? 2 * cy - p.y : p.y);
    pairs.push([m(pa), m(pb)]);
  }
  for (const [x, y] of pairs) {
    if (!customInRect(cols, rows, x) || !customInRect(cols, rows, y) || axialDistance(x, y) !== 1) continue;
    const k = edgeKey(x, y);
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Generate, then edit
// ---------------------------------------------------------------------------

export interface GeneratedForEditor {
  readonly mission: MissionDefinition;
  readonly map: WorldMapDefinition;
}

export interface EditorDocumentFromGenerated {
  readonly doc: CustomMapDocument;
  /** What could not be carried into the document (shown to the author). */
  readonly leftOut: readonly string[];
}

const SITE_ID = /^[a-z0-9_]{1,40}$/;

function guardOf(army: readonly StackSpec[] | undefined, label?: string): CustomGuard | null {
  const stacks = (army ?? []).filter((s) => s.count > 0);
  if (stacks.length === 0) return null;
  const [first, ...more] = stacks;
  return { creatureId: first!.creatureId, count: first!.count, ...(more.length ? { more: more.slice(0, 6).map((s) => ({ creatureId: s.creatureId, count: s.count })) } : {}), ...(label ? { label } : {}) };
}

function rewardOf(r: RewardDefinition | undefined): CustomReward | undefined {
  if (!r) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of ['gold', 'wood', 'stone', 'crystal'] as const) if (r.resources?.[k]) out[k] = r.resources[k];
  if (r.questXp) out.xp = r.questXp;
  if (r.artifactIds?.[0]) out.artifactId = r.artifactIds[0];
  return Object.keys(out).length ? (out as CustomReward) : undefined;
}

/**
 * Turn a generated random map into an editor document. Coordinates move by a
 * whole number of columns only, so every distance, neighbour and road stays as
 * generated; cells of the editor's rectangle that the generated map did not
 * have are void (outside the map), as in the generator's square maps.
 */
export function customMapFromGenerated(catalog: ContentCatalog, g: GeneratedForEditor, name = 'Generated map'): EditorDocumentFromGenerated {
  const { map, mission } = g;
  const H = map.height;
  const off = customRowOffset(H);
  // Shift so the leftmost used column is column 0 of the editor's rectangle.
  let minCol = Infinity;
  let maxCol = -Infinity;
  for (let r = 0; r < H; r++)
    for (let q = 0; q < map.width; q++) {
      if ((map.terrain[r * map.width + q] ?? 'v') === 'v') continue;
      const col = q + Math.floor(r / 2);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  const cols = maxCol - minCol + 1;
  const width = cols + off;
  const dq = off - minCol; // new q = old q + dq
  const move = (c: HexCoord): HexCoord => ({ q: c.q + dq, r: c.r });
  let terrain = '';
  for (let r = 0; r < H; r++)
    for (let q = 0; q < width; q++) {
      const src = q - dq;
      const t = src >= 0 && src < map.width ? (map.terrain[r * map.width + src] ?? 'v') : 'v';
      terrain += customInRect(cols, H, { q, r }) ? t : 'v';
    }
  const roads = map.roads.map((k) => {
    const [a, b] = k.split('|').map(parseHexKey) as [HexCoord, HexCoord];
    return edgeKey(move(a), move(b));
  });
  const leftOut: string[] = [];
  const townOwner = new Map<string, number>();
  townOwner.set(mission.player.town.townId, 0);
  const rivals = mission.rivals ?? [];
  rivals.forEach((r, i) => townOwner.set(r.town.townId, i + 1));
  const neutral = new Map((mission.neutralTowns ?? []).map((t) => [t.townId as string, t]));
  const kitOf = (archetypeId: string) => Object.values(catalog.skirmishKits).find((k) => k.archetypeId === archetypeId);
  const ids = new Set<string>();
  const safeId = (raw: string, kind: string) => {
    let id = raw.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 36);
    if (!SITE_ID.test(id)) id = kind;
    let k = id;
    let n = 2;
    while (ids.has(k)) k = `${id.slice(0, 34)}_${n++}`;
    ids.add(k);
    return k;
  };
  const renamed = new Map<string, string>();
  for (const s of mission.sites) renamed.set(s.id, safeId(s.id, 'site'));
  const sites: CustomSite[] = [];
  for (const s of mission.sites) {
    const c = move(s.coord);
    const id = renamed.get(s.id)!;
    const base = { id, q: c.q, r: c.r };
    const guard = s.guard ? guardOf(s.guard.army, s.guard.label) : null;
    const withGuard = <T extends object>(x: T): T => (guard ? { ...x, guard, ...(s.guard?.reward ? { reward: rewardOf(s.guard.reward) } : {}) } : x);
    const k = s.kind;
    let site: CustomSite | null = null;
    switch (k.type) {
      case 'town': {
        const owner = townOwner.get(k.townId);
        if (owner !== undefined) site = { ...base, kind: 'town', owner, name: s.name };
        else {
          const nt = neutral.get(k.townId);
          const kit = nt ? kitOf(nt.archetypeId) : undefined;
          const g2 = guardOf(nt?.garrison);
          site = { ...base, kind: 'town', name: s.name, ...(kit ? { pantheon: kit.pantheonId } : {}), ...(g2 ? { guard: g2 } : {}) };
        }
        break;
      }
      case 'resource_site': {
        const kind = (['sawmill', 'quarry', 'gold_mine', 'crystal_deposit'] as const).find((x) => x === k.siteType);
        if (kind) site = withGuard({ ...base, kind, name: s.name } as CustomSite);
        break;
      }
      case 'pickup': {
        // An artifact cache keeps its artifact; supplies become the editor's Supply Cache.
        const reward = rewardOf(k.reward);
        site = reward?.artifactId
          ? { ...withGuard({ ...base, kind: 'artifact' as CustomSiteKind, name: s.name } as CustomSite), reward }
          : withGuard({ ...base, kind: 'resource_cache', name: s.name } as CustomSite);
        break;
      }
      case 'treasure_chest':
        site = withGuard({ ...base, kind: 'treasure_chest', name: s.name } as CustomSite);
        break;
      case 'learning_stone':
        site = withGuard({ ...base, kind: 'learning_stone', name: s.name } as CustomSite);
        break;
      case 'spell_shrine':
        site = withGuard({ ...base, kind: 'spell_shrine', spellId: k.spellId, name: s.name } as CustomSite);
        break;
      case 'skill_trainer':
        site = withGuard({ ...base, kind: 'skill_trainer', skillId: k.skillId, name: s.name } as CustomSite);
        break;
      case 'windmill':
        site = { ...base, kind: 'windmill', name: s.name };
        break;
      case 'creature_camp':
        site = { ...base, kind: 'creature_camp', creatureId: k.creatureId, name: s.name };
        break;
      case 'portal':
        site = { ...base, kind: 'portal', twinId: renamed.get(k.exitSiteId) ?? k.exitSiteId };
        break;
      case 'relic':
        site = withGuard({ ...base, id: 'relic', kind: 'relic' } as CustomSite);
        break;
      case 'key_tent':
        site = withGuard({ ...base, kind: 'key_tent', color: k.color } as CustomSite);
        break;
      case 'key_gate':
        site = { ...base, kind: 'key_gate', color: k.color };
        break;
      case 'prison':
        site = withGuard({ ...base, kind: 'prison', heroId: k.heroDefinitionId, level: k.level } as CustomSite);
        break;
      case 'quest_hut': {
        const q = k.quest;
        const quest = q.type === 'deliver' ? { type: 'deliver' as const, ...(q.resources as Record<string, number>) } : { type: 'defeat' as const, siteId: renamed.get(q.siteId) ?? q.siteId };
        site = { ...base, kind: 'quest_hut', quest, reward: rewardOf(k.reward) ?? { gold: 1000 }, name: s.name } as CustomSite;
        break;
      }
      case 'watchtower':
        site = { ...base, kind: 'watchtower', radius: 9, name: s.name };
        break;
      case 'crossing':
      case 'landmark':
        // A guarded crossing or ruin: a standing army with its reward.
        if (guard) site = { ...base, kind: 'monster', guard, ...(s.guard?.reward ? { reward: rewardOf(s.guard.reward) } : {}) };
        break;
      default:
        break;
    }
    if (site) sites.push(site);
    else leftOut.push(s.name);
  }
  // Wandering monsters stand where they started.
  for (const h of mission.hostileHeroes) {
    const g2 = guardOf(h.army, h.commander.name);
    if (!g2) continue;
    const c = move(h.startCoord);
    if (sites.some((x) => x.q === c.q && x.r === c.r)) continue;
    const bounty = h.monster?.bounty;
    sites.push({ id: safeId(`monster_${h.commander.heroDefinitionId}`, 'monster'), kind: 'monster', q: c.q, r: c.r, guard: g2, ...(bounty ? { reward: rewardOf({ resources: bounty }) } : {}) });
  }
  const vc = mission.victoryCondition;
  const doc: CustomMapDocument = {
    format: CUSTOM_MAP_FORMAT,
    version: CUSTOM_MAP_VERSION,
    name,
    description: `Generated as a random map (${mission.subtitle ?? mission.name}), then opened in the editor.`,
    width,
    height: H,
    terrain,
    roads: [...new Set(roads)].sort(),
    biome: map.biome,
    players: [{ pantheonId: mission.player.pantheonId }, ...rivals.map((r) => ({ pantheonId: r.pantheonId }))],
    sites,
    victory: vc?.type === 'hold_site' ? { type: 'hold_relic', days: vc.days } : { type: 'elimination' },
    startWealth: 'normal',
  };
  return { doc, leftOut };
}
