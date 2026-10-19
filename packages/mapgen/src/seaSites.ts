/**
 * Coastal sites and sea salvage — the site bodies both map makers build (sea-map objects kit
 * 2026-10-17; rules definitions/seaSites.ts): the naval random templates (naval/seaSites.ts) and
 * compiled custom maps (custom.ts). Every random value — a pickup's amount, a wreck's outcome, its
 * raiders' counts, its cache's artifact, names and skins — is drawn ONCE here from the caller's
 * generator stream and stored on the site; the rules never roll them again (hover, reload or retry).
 * Numbers come from the content's `seaSitePolicy` (data), guard counts from the map's guard strength.
 */
import {
  SEA_PICKUP_NAMES,
  WRECK_GUARD_LABEL,
  seaSitePolicy,
  type ArtifactRarity,
  type CoastalTowerSkin,
  type ContentCatalog,
  type HexCoord,
  type MapTemplateDefinition,
  type SeaPickupResource,
  type ShipwreckSkin,
  type SiteDefinition,
  type StackSpec,
  type Terrain,
  type WreckOutcomeDefinition,
  type WreckOutcomeKind,
} from '@pr/rules';
import { axialNeighbors } from '@pr/rules';

/** A site without its ID and position (the maker places it). */
export type SeaSiteBody = Omit<SiteDefinition, 'id' | 'anchorId' | 'coord'>;

/** A draw from the caller's stream: an integer in [0, n). */
export type Draw = (n: number) => number;

/** Biomes whose coasts are cool or rocky (the cold tower skin); the rest warm (sand / temperate). Art only. */
const COLD_BIOMES: ReadonlySet<string> = new Set(['fjord', 'tundra', 'high_pass', 'storm_plateau', 'moor']);

/**
 * The tower picture for its coast (presentation only, never a rule): cold for a cool biome, or a coast
 * of rock, cliff or marsh around the tower (two or more such neighbours, or rough / marsh underfoot);
 * warm otherwise.
 */
export function coastalTowerSkin(biome: MapTemplateDefinition['biome'] | undefined, terrainAt: (c: HexCoord) => Terrain, c: HexCoord): CoastalTowerSkin {
  if (biome && COLD_BIOMES.has(biome)) return 'cold';
  const rocky = (t: Terrain) => t === 'mountain' || t === 'rough' || t === 'marsh';
  if (rocky(terrainAt(c))) return 'cold';
  return axialNeighbors(c).filter((n) => rocky(terrainAt(n))).length >= 2 ? 'cold' : 'warm';
}

export function coastalTowerBody(catalog: ContentCatalog, name: string, skin: CoastalTowerSkin): SeaSiteBody {
  const radius = seaSitePolicy(catalog).towerRadius;
  return {
    name,
    description: `A lookout over the sea. Whoever holds it sees every hex within ${radius} — ships in the lanes included — and is warned when an enemy ship comes into sight. Taken by a hero on foot; it changes hands when an enemy hero walks in.`,
    kind: { type: 'coastal_watchtower', radius, skin },
  };
}

/** A pickup's stored amount, drawn once inside the policy's range (Gold in steps of 25). */
export function seaPickupAmount(catalog: ContentCatalog, resource: SeaPickupResource, draw: Draw): number {
  const [lo, hi] = seaSitePolicy(catalog).pickupRewards[resource];
  if (resource === 'gold') {
    const a = Math.ceil(lo / 25);
    const b = Math.floor(hi / 25);
    return (a + draw(Math.max(1, b - a + 1))) * 25;
  }
  return lo + draw(Math.max(1, hi - lo + 1));
}

export function seaPickupBody(resource: SeaPickupResource, amount: number): SeaSiteBody {
  const label = resource === 'gold' ? `${amount.toLocaleString('en-US')} Gold` : `${amount} ${resource === 'wood' ? 'Wood' : 'Stone'}`;
  const what = resource === 'wood' ? 'Timber lashed to a raft, adrift' : resource === 'stone' ? 'Dressed stone on a cargo raft, adrift' : 'A treasury chest on a barrel raft, adrift';
  return {
    name: SEA_PICKUP_NAMES[resource],
    description: `${what}: ${label} for the first ship that sails onto it. Taken once.`,
    kind: { type: 'sea_pickup', resource, amount },
  };
}

/** The raiders of a guarded wreck: the policy's creatures and shares, scaled by the guard strength (at least one of each). */
export function wreckGuardArmy(catalog: ContentCatalog, kind: WreckOutcomeKind, guardPct: number): StackSpec[] {
  const row = seaSitePolicy(catalog).wreckOutcomes.find((o) => o.kind === kind);
  if (!row?.guards || !row.guardValue) return [];
  const out: StackSpec[] = [];
  for (const g of row.guards) {
    const c = catalog.creatures[g.creatureId];
    if (!c) continue;
    out.push({ creatureId: c.id, count: Math.max(1, Math.round((g.share * guardPct) / 100 / (c.cost?.gold ?? 100))) });
  }
  return out;
}

/** Which outcome a roll in [0, total weight) falls on (the policy's order). */
export function wreckOutcomeKind(catalog: ContentCatalog, draw: Draw): WreckOutcomeKind {
  const rows = seaSitePolicy(catalog).wreckOutcomes;
  const total = rows.reduce((n, r) => n + r.weight, 0);
  let roll = draw(Math.max(1, total));
  for (const r of rows) {
    if (roll < r.weight) return r.kind;
    roll -= r.weight;
  }
  return rows[rows.length - 1]!.kind;
}

/** Existing minor artifacts the scenario may hold (stable order). */
function minorArtifacts(catalog: ContentCatalog, rarity: ArtifactRarity, expanded: boolean): string[] {
  return Object.values(catalog.artifacts)
    .filter((a) => (a.rarity ?? (a.unique ? 'relic' : 'minor')) === rarity && (a.scope !== 'expanded' || expanded) && a.scope !== 'mythic_library_v2')
    .map((a) => a.id)
    .sort();
}

/**
 * A wreck's whole outcome, drawn once: its kind (policy weights), its stored reward, its raiders (scaled)
 * and — for a rare cache — one existing artifact of the policy's rarity. `kind` may be fixed by the author.
 */
export function wreckOutcome(catalog: ContentCatalog, draw: Draw, guardPct: number, expanded: boolean, kind: WreckOutcomeKind = wreckOutcomeKind(catalog, draw)): WreckOutcomeDefinition {
  const row = seaSitePolicy(catalog).wreckOutcomes.find((o) => o.kind === kind)!;
  const army = wreckGuardArmy(catalog, kind, guardPct);
  let artifactId: string | undefined;
  if (row.artifactRarity) {
    const pool = minorArtifacts(catalog, row.artifactRarity, expanded);
    if (pool.length > 0) artifactId = pool[draw(pool.length)]!;
  }
  return {
    kind,
    reward: { ...row.reward },
    ...(artifactId ? { artifactId } : {}),
    ...(army.length > 0 ? { guard: { label: WRECK_GUARD_LABEL, army } } : {}),
  };
}

const WRECK_NAMES = ['Gull', 'Swift Heron', 'Amber Oar', 'Saltwind', 'Grey Petrel', 'Dawn Trader', 'Tidecaller', 'Lantern Maid', 'Red Dolphin', 'Northern Star', 'Seafoam', 'Silver Mullet'] as const;

/** A wreck's name (seeded, never read from its picture). */
export function wreckName(draw: Draw): string {
  return `Wreck of the ${WRECK_NAMES[draw(WRECK_NAMES.length)]!}`;
}

export function shipwreckBody(catalog: ContentCatalog, name: string, outcome: WreckOutcomeDefinition, skin: ShipwreckSkin): SeaSiteBody {
  const cost = seaSitePolicy(catalog).wreckExploreCost;
  return {
    name,
    description: `A wrecked ship on the rocks. A hero aboard a ship beside it may explore it (${cost} movement): there may be salvage — and there may be raiders moored alongside.`,
    kind: { type: 'shipwreck', exploreCost: cost, outcome, skin },
  };
}

/** The help topic of a map with sea sites. */
export const SEA_SITES_HELP = {
  id: 'sea_sites',
  title: 'Lookouts, wrecks and sea salvage',
  text: 'A coastal watchtower is taken by a hero on foot: while you hold it you see 6 hexes around it, ships in the lanes included, and you are warned once a turn when an enemy ship comes into its sight. Floating salvage (driftwood, stone cargo, a lost treasury) goes to the first ship that sails onto it. A shipwreck is explored from a ship beside it for 100 movement: abandoned cargo, or raiders moored alongside to fight on two decks for a bigger haul — sometimes an artifact. Proposed; values unplaytested.',
} as const;

/** The wreck skin of a draw (presentation only; either picture fits any outcome). */
export function wreckSkin(draw: Draw): ShipwreckSkin {
  return draw(2) === 0 ? 'broken_mast' : 'split_hull';
}
