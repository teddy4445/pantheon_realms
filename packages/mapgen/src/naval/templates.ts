/**
 * The two naval random-map templates (naval random-maps kit, 2026-10-17; assets-source/art/naval-random-v1/):
 * The Shattered Crown (thirteen islands, 2 / 3 / 6 empires) and The Serpent Straits (a naval duel).
 * Plain data: what the setup screen shows (names, summaries, seats, sizes, reasons), the water band
 * the generator must hit and the landing capacity it must keep. No rule lives here.
 *
 * The kit's topology JSONs are design inputs only: the reference shapes are re-expressed below as
 * skeleton data (hexagonal discs, and the one crescent as row runs), never imported as a map.
 */
import { BATTLEFIELD_LAYOUTS, navalRules, type ContentCatalog, type HexCoord, type WorldMapDefinition } from '@pr/rules';

export type NavalMapType = 'shattered_crown' | 'serpent_straits';

/** Generator identity (part of every naval map's hash and save stamp). */
export const NAVAL_GENERATOR_ID = 'pr-naval-templates-1';
/**
 * Version of both templates' layouts (bump when a seed would give another map). 2 (2026-10-18, sea-sites
 * kit): coastal watchtowers, a shipwreck and floating salvage per region (naval/seaSites.ts).
 */
export const NAVAL_TEMPLATE_VERSION = 2;
/**
 * The version in the generator's random-stream labels (terrain, content, layout). Still 1: template v2 keeps the
 * first release's islands and content for a seed and adds the sea sites from their own streams (a candidate the
 * sea sites do not fit is passed over, so a few seeds move on to the next candidate).
 */
export const NAVAL_STREAM_VERSION = 1;
/** Deterministic candidates tried before the reference-shaped fallback. */
export const NAVAL_MAX_CANDIDATES = 32;

export interface NavalLandingNeeds {
  /** Separated landing clusters on every home island (invasion beaches). */
  readonly home: number;
  /** …on every inner resource island (Shattered Crown) or curved island (Serpent Straits). */
  readonly outer: number;
  /** …on the central objective island. */
  readonly objective: number;
}

export interface NavalTemplateInfo {
  readonly id: NavalMapType;
  readonly label: string;
  /** The card's one-line summary (the kit's selection summary). */
  readonly summary: string;
  /** The longer description of the selected type. */
  readonly description: string;
  readonly inspiredBy: string;
  /** Supported empire counts (first release). */
  readonly seats: readonly number[];
  /** Supported sizes (first release: Huge only). */
  readonly sizes: readonly ('small' | 'medium' | 'large' | 'huge')[];
  /** Why other sizes are disabled. */
  readonly sizeReason: string;
  /** Why other empire counts are disabled. */
  readonly seatReason: string;
  /** Water share of the non-void terrain, as fractions [min, max]. */
  readonly waterBand: readonly [number, number];
  readonly defaultVictory: { readonly type: 'elimination' } | { readonly type: 'hold_relic'; readonly days: number };
  readonly biome: WorldMapDefinition['biome'];
  readonly landing: NavalLandingNeeds;
  /** Inner corridors between islands at least this many water hexes wide. */
  readonly minChannel: number;
  /** The open sea between the outer islands and the map edge at least this wide (0: not checked). */
  readonly minOuterBypass: number;
  /** Frontend art (asset-manifest.json of the kit). */
  readonly artId: string;
  readonly loadingArtId: string;
  /** Why the map editor cannot produce this type yet. */
  readonly editorReason: string;
}

const EDITOR_REASON = 'The map editor does not keep starting ships and the naval travel rule yet, so it cannot make this map type.';

export const NAVAL_MAP_TYPES: readonly NavalTemplateInfo[] = [
  {
    id: 'shattered_crown',
    label: 'The Shattered Crown',
    summary: 'Separate island kingdoms surround the broken Crown. Sail for distant riches, capture landing beaches, and carry your army across the sea to conquer.',
    description:
      'Thirteen islands and no land between them: six home islands ring six small resource islands and the isolated Crown at the center. Every empire starts with its own empty ship beside its harbor. Hold the Crown at seven dawns in a row, or invade every rival island.',
    inspiredBy: 'Age of Mythology water maps and HoMM3 island templates',
    seats: [2, 3, 6],
    sizes: ['huge'],
    sizeReason: 'Huge only in this release: the thirteen islands need the room.',
    seatReason: 'For 2, 3 or 6 empires: the six home islands seat them symmetrically.',
    waterBand: [0.7, 0.77],
    defaultVictory: { type: 'hold_relic', days: 7 },
    biome: 'coast',
    landing: { home: 2, outer: 2, objective: 4 },
    minChannel: 2,
    minOuterBypass: 2,
    artId: 'frontend.random.shattered_crown',
    loadingArtId: 'random.shattered_crown.loading',
    editorReason: EDITOR_REASON,
  },
  {
    id: 'serpent_straits',
    label: 'The Serpent Straits',
    summary: 'Rival harbors face a maze of island straits. Seize the inner passages or sail around the outer coast to land behind the enemy.',
    description:
      'A naval duel. Two home islands, two long curved islands between the inner straits and the open outer sea, and an isolated island at the center. Intercept enemy ships in the short inner passages, or sail the long way round and land behind the rival harbor.',
    inspiredBy: 'HoMM3 water duels and Age of Mythology “Mediterranean”',
    seats: [2],
    sizes: ['huge'],
    sizeReason: 'Huge only in this release.',
    seatReason: 'A naval duel for two empires (human or computer, or hot-seat).',
    waterBand: [0.66, 0.74],
    defaultVictory: { type: 'elimination' },
    biome: 'fjord',
    landing: { home: 3, outer: 2, objective: 3 },
    minChannel: 2,
    minOuterBypass: 3,
    artId: 'frontend.random.serpent_straits',
    loadingArtId: 'random.serpent_straits.loading',
    editorReason: EDITOR_REASON,
  },
];

export function isNavalMapType(id: string | undefined | null): id is NavalMapType {
  return id === 'shattered_crown' || id === 'serpent_straits';
}

export function navalTemplate(id: NavalMapType): NavalTemplateInfo {
  return NAVAL_MAP_TYPES.find((t) => t.id === id)!;
}

/**
 * Shattered Crown home slots by empire count (kit §1): 6 uses slots 0-5, 3 uses 0, 2, 4 and 2 uses 0, 3
 * (before the deterministic rotation that randomizes which island each seat gets).
 */
export const SHATTERED_CROWN_SLOTS: Readonly<Record<number, readonly number[]>> = { 2: [0, 3], 3: [0, 2, 4], 6: [0, 1, 2, 3, 4, 5] };

/** The Serpent Straits' curved island (region of the first empire) as row runs [r, qFrom, qTo] in centered axial coordinates. */
export const SERPENT_CRESCENT_ROWS: readonly (readonly [number, number, number])[] = [
  [4, -9, -6],
  [5, -10, -6],
  [5, 6, 9],
  [6, -11, -3],
  [6, 5, 9],
  [7, -12, 9],
  [8, -12, 9],
  [9, -12, 8],
  [10, -12, 7],
  [11, -9, 6],
  [12, -9, 3],
  [13, -5, 2],
];

export function crescentCells(): HexCoord[] {
  const out: HexCoord[] = [];
  for (const [r, a, b] of SERPENT_CRESCENT_ROWS) for (let q = a; q <= b; q++) out.push({ q, r });
  return out;
}

export interface NavalReadiness {
  /** Hero ships, sailing and boarding battles are available in this build. */
  readonly ready: boolean;
  /** Why not (empty when ready). */
  readonly reason: string;
  /** One line for the setup screen: what the ships cost and do (from the rules profile). */
  readonly detail: string;
}

/**
 * Whether the naval templates can be started (dependency `navalMovementV1`): the rules profile's
 * naval numbers and the boarding battlefield must exist. New random maps always switch hero ships on.
 */
export function navalTemplatesReadiness(catalog: ContentCatalog): NavalReadiness {
  const rules = navalRules(catalog.rulesProfile);
  if (!BATTLEFIELD_LAYOUTS[rules.boardingLayoutId]) return { ready: false, reason: 'Boarding battles are missing from this build, so ships cannot fight.', detail: '' };
  if (!(rules.sailCost > 0) || !(rules.transitionMinimumMovement > 0)) return { ready: false, reason: 'Hero ships are not set up in this build.', detail: '' };
  const gold = rules.shipCost.gold ?? 0;
  const wood = rules.shipCost.wood ?? 0;
  return { ready: true, reason: '', detail: `Hero ships are ready: ${gold.toLocaleString('en-US')} Gold and ${wood} Wood a ship at an owned coastal town, ${rules.sailCost} movement a sea hex, boarding battles on two decks.` };
}
