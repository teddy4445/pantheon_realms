/**
 * AssetManifest: stable asset IDs -> runtime files.
 *
 * UI code refers to asset IDs only (e.g. "town.greek.dwelling.tier1.base",
 * "creature.greek.tier3.upgraded.portrait"). Final art replaces placeholders by
 * adding/overriding manifest entries — no screen changes.
 *
 * Resolution order: final manifest (assets-runtime/ui/final-manifest.json) -> UI art manifest (owner-supplied menu and
 * interface art, assets-runtime/ui) -> placeholder manifest (cropped concept
 * references) -> procedural placeholder generated at runtime.
 */
import placeholderManifest from '../../../../assets-runtime/placeholders/manifest.json';
import uiArtManifest from '../../../../assets-runtime/ui/manifest.json';
import finalArtManifest from '../../../../assets-runtime/ui/final-manifest.json';
import storyArtManifest from '../../../../assets-runtime/art/manifest.json';
import spriteManifestFile from '../../../../assets-runtime/sprites/manifest.json';
import siegeArtV2 from '../../../../assets-runtime/siege-v2/manifest.json';
import siegeGateV3 from '../../../../assets-runtime/siege-gates-v3/manifest.json';
import frontendArtManifest from '../../../../assets-runtime/frontend-v1.1.0/manifest.json';
import frontendKitManifest from '../../../../assets-runtime/frontend-kit-v1.1.0/manifest.json';
import encounterKitManifest from '../../../../assets-runtime/encounters-v1.1.0/manifest.json';
import adventureKitManifest from '../../../../assets-runtime/adventure-gui-v1.1.0/manifest.json';
import heroPortraitPack from '../../../../assets-runtime/hero-portraits-complete/manifest.json';
import routeKitManifest from '../../../../assets-runtime/recruitment-route-v1/manifest.json';
import campaignV2Manifest from '../../../../assets-runtime/campaign-v2/manifest.json';
import battleFxUpgradesManifest from '../../../../assets-runtime/battle-fx-neutral-upgrades-v1/manifest.json';
import expeditionManifest from '../../../../assets-runtime/expedition-v1/manifest.json';
import navalRandomManifest from '../../../../assets-runtime/naval-random-v1/manifest.json';
import seaSitesManifest from '../../../../assets-runtime/sea-sites-v1/manifest.json';
import seaCreaturesManifest from '../../../../assets-runtime/sea-creatures-v1/manifest.json';
import { expansionArt, twinSiteSprites, type AtlasRegion } from './expansionArt';
import { registerEnvironmentArt, registerRouteArt, registerSpriteManifest, type EnvironmentArt, type RouteMarkerId, type SeaSiteArt, type SpriteManifest } from '@pr/presentation/core';

export type AssetStatus = 'final' | 'placeholder' | 'procedural';

export interface AssetRecord {
  readonly id: string;
  readonly status: AssetStatus;
  /** Relative URL (resolved against the app base) when a file exists. */
  readonly url: string | null;
  readonly provenance: string;
  /** Native source rectangle; consumers must crop rather than show the full sheet. */
  readonly atlas?: AtlasRegion;
}

interface ManifestFile {
  readonly assets: Record<string, { file: string; status: string; provenance: string }>;
}

const PLACEHOLDERS: ManifestFile['assets'] = { ...(placeholderManifest as ManifestFile).assets, ...(uiArtManifest as unknown as ManifestFile).assets };
/**
 * Final production assets, registered as they are delivered: drop a PNG named by
 * its asset ID into assets-source/icons/final/ and run `npm run icons:import`
 * (writes assets-runtime/ui/final-manifest.json). See `npm run icons:catalog`.
 */
const FINAL: Record<string, { file: string; provenance: string }> = { ...(finalArtManifest as unknown as { assets: Record<string, { file: string; provenance: string }> }).assets };

/**
 * Painted story art (ASSET_PIPELINE.md §13): dialogue busts, campaign covers and
 * cards, ending pictures, mission briefing art and cards; and the big-moment
 * art (miracle cards, victory/defeat splashes, level-up and new-week banners;
 * see assets/momentArt.ts). Written by
 * `npm run art:import` (tools/assets/import_story_art.py) from
 * assets-source/art/final/; the game only reads the runtime derivatives.
 */
export interface StoryArtRecord {
  readonly id: string;
  readonly url: string;
  readonly kind: 'bust' | 'cover' | 'ending' | 'briefing' | 'card' | 'miracle' | 'splash' | 'banner' | 'building' | 'background';
  readonly width: number;
  readonly height: number;
  /** Busts and banners: visible (non-transparent) bounds as fractions [left, top, right, bottom]. */
  readonly alphaBox?: readonly [number, number, number, number];
  /** Banners: the blank plaque the game writes on, measured per file, as fractions [left, top, right, bottom]. */
  readonly plaque?: readonly [number, number, number, number];
}
interface StoryArtFile {
  readonly provenance: string;
  readonly assets: Record<
    string,
    {
      file: string;
      kind: StoryArtRecord['kind'] | 'terrain' | 'battlefield' | 'sky';
      width: number;
      height: number;
      alphaBox?: [number, number, number, number];
      plaque?: [number, number, number, number];
      wrap?: 'repeat' | 'mirror';
      average?: string;
      edge?: string;
      haze?: string;
      horizon?: number;
    }
  >;
}
const STORY = storyArtManifest as unknown as StoryArtFile;
/**
 * The complete hero character portraits (owner delivery 2026-10-10,
 * `assets-runtime/hero-portraits-complete`): the 54 `hero.<…>.bust` cut-outs the
 * story-art manifest lacked, one per catalog hero, each made from that hero's own
 * square portrait. An additive pack: the story-art manifest (generated by
 * import_story_art.py) keeps precedence, so no existing bust changes. Read only
 * through `resolveArt` / `resolveAsset`; files load when a screen shows them.
 */
const HERO_BUSTS = (heroPortraitPack as unknown as { assets: StoryArtFile['assets'] }).assets;
const storyAsset = (id: string) => STORY.assets[id] ?? (id.endsWith('.bust') ? HERO_BUSTS[id] : undefined);
const SIEGE_V2 = siegeArtV2 as unknown as {
  ground: Record<string, { file: string; width: number; height: number }>;
  siege: SpriteManifest['siege'];
};
/**
 * The six-pantheon gate pack (2026-10-11, assets-runtime/siege-gates-v3): only the 18 keys
 * `gate.<intact|damaged|rubble>.<pantheon>`, each a 512 × 1024 frame of its pantheon's atlas whose
 * anchor is the painted passage centre (`registration`). Registered last, over the siege-v2 gates;
 * the v2 ground, walls, towers and keeps stay.
 */
const GATE_V3 = siegeGateV3 as unknown as { siege: SpriteManifest['siege'] };

/** Story art by asset ID, with its size (null when not delivered). */
export function resolveArt(id: string): StoryArtRecord | null {
  const expansion = expansionArt(id);
  if (expansion && (expansion.kind === 'briefing' || expansion.kind === 'background')) {
    return { id, url: expansion.url, kind: id.startsWith('ending.') ? 'ending' : id.endsWith('.thumbnail') ? 'card' : id.endsWith('.cover') ? 'cover' : expansion.kind, width: expansion.width, height: expansion.height };
  }
  const a = storyAsset(id);
  if (!a || a.kind === 'terrain' || a.kind === 'battlefield' || a.kind === 'sky') return null;
  return { id, url: `./${a.file}`, kind: a.kind, width: a.width, height: a.height, alphaBox: a.alphaBox, plaque: a.plaque };
}

/**
 * Ground and sky art (Brief 2) for the 2D views: terrain textures, battlefield
 * paintings and sky panoramas, from the same manifest. The views keep their
 * procedural colours for anything not delivered.
 */
export function resolveEnvironmentArt(id: string): EnvironmentArt | null {
  const siege = SIEGE_V2.ground[id];
  if (siege) return { url: `./${siege.file}`, width: siege.width, height: siege.height, layout: 'siege-v2' };
  const a = STORY.assets[id];
  if (!a || (a.kind !== 'terrain' && a.kind !== 'battlefield' && a.kind !== 'sky')) return null;
  return { url: `./${a.file}`, width: a.width, height: a.height, wrap: a.wrap, average: a.average, edge: a.edge, haze: a.haze, horizon: a.horizon };
}

registerEnvironmentArt(resolveEnvironmentArt);

// ---------------------------------------------------------------------------
// Pre-game art of release 1.1.0 (assets-runtime/frontend-v1.1.0/manifest.json)
// ---------------------------------------------------------------------------

/**
 * Three quiet full-window backdrops, four New Game illustrations, nine random
 * map types and the empty-archive prop, under their own `frontend.*` IDs. Only
 * `file` becomes a URL (relative to the app base: `./frontend-v1.1.0/…`); the
 * manifest's absolute delivery paths are never used. Decorative only: every
 * label and control stays live HTML.
 */
export interface FrontendArt {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly fit: 'cover' | 'contain';
  /** The manifest's text alternative ('' = decorative). */
  readonly alt: string;
  /** Where the painting is calm enough for text, as fractions [left, top, right, bottom]. */
  readonly quietRegion: readonly [number, number, number, number] | null;
}
const FRONTEND = (frontendArtManifest as unknown as { assets: Record<string, { file: string; width: number; height: number; fit?: string; alt?: string; quietRegionNormalized?: number[] }> }).assets;

/**
 * Naval random-map art (2026-10-17, assets-runtime/naval-random-v1, `npm run naval-random:import`): the
 * two type cards under `frontend.random.<typeId>` (so the chooser, the selected summary and the
 * thumbnail fallback find them like the nine land types) and the two loading paintings
 * `random.<typeId>.loading` (`navalRandomArt`). Native 1672 × 941, cover, centred; decorative only.
 */
const NAVAL_RANDOM = (navalRandomManifest as unknown as { assets: Record<string, { file: string; width: number; height: number; fit?: string; alt?: string }> }).assets;

export function navalRandomArt(id: string): FrontendArt | null {
  const a = NAVAL_RANDOM[id];
  if (!a || !a.file || /^[a-z]:|^\/|^\\/i.test(a.file)) return null;
  return { id, url: `./${a.file}`, width: a.width, height: a.height, fit: 'cover', alt: a.alt ?? '', quietRegion: null };
}

export function frontendArt(id: string): FrontendArt | null {
  if (!FRONTEND[id] && NAVAL_RANDOM[id]) return navalRandomArt(id);
  const a = FRONTEND[id];
  if (!a || !a.file || /^[a-z]:|^\/|^\\/i.test(a.file)) return null;
  return { id, url: `./${a.file}`, width: a.width, height: a.height, fit: a.fit === 'contain' ? 'contain' : 'cover', alt: a.alt ?? '', quietRegion: (a.quietRegionNormalized as unknown as FrontendArt['quietRegion']) ?? null };
}

export function frontendArtIds(): string[] {
  return Object.keys(FRONTEND);
}

/**
 * The complete frontend kit (`assets-runtime/frontend-kit-v1.1.0`, 33 pieces
 * under `frontendkit.*`): the title background and the title logo as separate
 * layers, the six finished pantheon banners (emblem painted on the cloth), the
 * settings, encyclopedia and editor icons, the warning seal, the records
 * medallion and two blank ornaments. Relative URLs only; decorative (every
 * label stays live text).
 */
const FRONTEND_KIT = (frontendKitManifest as unknown as { assets: Record<string, { file: string; width: number; height: number }> }).assets;

export function frontendKitArt(id: string): { id: string; url: string; width: number; height: number } | null {
  const a = FRONTEND_KIT[id];
  if (!a || !a.file || /^[a-z]:|^\/|^\\/i.test(a.file)) return null;
  return { id, url: `./${a.file}`, width: a.width, height: a.height };
}

export function frontendKitIds(): string[] {
  return Object.keys(FRONTEND_KIT);
}

/**
 * The encounter scenes of 1.1.0 (`assets-runtime/encounters-v1.1.0`, eight
 * pieces under `encounterkit.*`): six camp paintings for the hero meeting (one
 * per pantheon, no figures, no interface), the blank introduction scroll and
 * the empty reward tray. `safe` is the rectangle for live content on the scroll
 * and the tray, as fractions [left, top, right, bottom]. Relative URLs only.
 */
export interface EncounterKitArt {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly safe: readonly [number, number, number, number] | null;
}
const ENCOUNTER_KIT = (encounterKitManifest as unknown as { assets: Record<string, { file: string; width: number; height: number; safeContentNormalized?: number[] }> }).assets;

export function encounterKitArt(id: string): EncounterKitArt | null {
  const a = ENCOUNTER_KIT[id];
  if (!a || !a.file || /^[a-z]:|^\/|^\\/i.test(a.file)) return null;
  return { id, url: `./${a.file}`, width: a.width, height: a.height, safe: (a.safeContentNormalized as unknown as EncounterKitArt['safe']) ?? null };
}

export function encounterKitIds(): string[] {
  return Object.keys(ENCOUNTER_KIT);
}

/**
 * The six adventure screens of 1.1.0 (`assets-runtime/adventure-gui-v1.1.0`, 21
 * pieces under `adventurekit.*`): a tavern room and a recruitment court per
 * pantheon (no figures, no interface), six encounter landscapes by biome (no
 * armies), the blank skill plaque, the hero medallion and the empty balance.
 * Decorative stages only: the architecture in them grants nothing. `content`
 * is the live-text rectangle of a chrome piece as fractions [left, top, right,
 * bottom]. Relative URLs only.
 */
export interface AdventureKitArt {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly content: readonly [number, number, number, number] | null;
}
const ADVENTURE_KIT = (adventureKitManifest as unknown as { assets: Record<string, { file: string; width: number; height: number; contentRect?: number[] }> }).assets;

export function adventureKitArt(id: string): AdventureKitArt | null {
  const a = ADVENTURE_KIT[id];
  if (!a || !a.file || /^[a-z]:|^\/|^\\/i.test(a.file)) return null;
  return { id, url: `./${a.file}`, width: a.width, height: a.height, content: (a.contentRect as unknown as AdventureKitArt['content']) ?? null };
}

export function adventureKitIds(): string[] {
  return Object.keys(ADVENTURE_KIT);
}

/**
 * The recruitment and route kit of 2026-10-14 (`assets-runtime/recruitment-route-v1`,
 * `npm run recruitroute:import`): nine text-free pictures under `recruitroute.*` —
 * the Recruit all, Train troops and Continue journey icons, and the painted
 * route markers (today's gold and later days' bronze chevrons, which point UP in
 * their pictures, the hourglass, the blank day parchment, the destination seal
 * and the selection ring). `visibleBounds` is the painted part of each picture as
 * fractions [left, top, right, bottom], for sizing by what shows rather than by
 * the transparent margin. Relative URLs only.
 */
export interface RouteKitArt {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly visibleBounds: readonly [number, number, number, number];
}
interface RouteKitFile {
  readonly assets: Record<string, { file: string; width: number; height: number; visibleBounds: number[] }>;
  readonly creatures: Record<string, { file: string; frames: number; frameWidth: number; frameHeight: number; fps: number; anchor: number[]; visibleUnion: number[] }>;
}
const ROUTE_KIT = routeKitManifest as unknown as RouteKitFile;
const safeFile = (f: string | undefined): f is string => !!f && !/^[a-z]:|^\/|^\\|\.\./i.test(f);

export function routeKitArt(id: string): RouteKitArt | null {
  const a = ROUTE_KIT.assets?.[id];
  if (!a || !safeFile(a.file)) return null;
  const b = a.visibleBounds;
  return { id, url: `./${a.file}`, width: a.width, height: a.height, visibleBounds: b?.length === 4 ? [b[0]!, b[1]!, b[2]!, b[3]!] : [0, 0, 1, 1] };
}

export function routeKitIds(): string[] {
  return Object.keys(ROUTE_KIT.assets ?? {});
}

/** The map's painted route markers (`@pr/presentation/core` routeArt). */
const ROUTE_MARKERS: Record<RouteMarkerId, string> = {
  chevronToday: 'recruitroute.route-chevron-current',
  chevronLater: 'recruitroute.route-chevron-later',
  hourglass: 'recruitroute.route-hourglass',
  dayBadge: 'recruitroute.route-day-badge',
  destination: 'recruitroute.route-destination',
  selectionRing: 'recruitroute.route-selection-ring',
};
registerRouteArt((id) => routeKitArt(ROUTE_MARKERS[id]));

/**
 * The campaign expansion kit of 2026-10-15 (`assets-runtime/campaign-v2`,
 * `npm run campaignv2:import`): 31 native pictures under `campaignv2.*` — six
 * neutral creature portraits, seven animation atlases (registered below as
 * frame-region sprite sets), ten map sites (six neutral hiring sites, the sluice
 * closed/open, the ferry landing, the supply depot), six campaign icons and two
 * text-free backgrounds. Icons and sites resolve to their trimmed display copies
 * (the native files ship beside them). Relative paths only.
 */
export interface CampaignV2Art {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly kind: string;
  /** The delivered native picture (portraits, atlases and backgrounds are used as delivered). */
  readonly nativeUrl: string;
}
interface CampaignV2File {
  readonly assets: Record<string, { file: string; kind: string; width: number; height: number; display?: { file: string; width: number; height: number } }>;
  readonly creatures: Record<string, unknown>;
  readonly sites: Record<string, unknown>;
}
const CAMPAIGN_V2 = campaignV2Manifest as unknown as CampaignV2File;

export function campaignV2Art(id: string): CampaignV2Art | null {
  const a = CAMPAIGN_V2.assets?.[id];
  if (!a || !safeFile(a.file)) return null;
  const d = a.display && safeFile(a.display.file) ? a.display : null;
  return { id, url: `./${(d ?? a).file}`, width: (d ?? a).width, height: (d ?? a).height, kind: a.kind, nativeUrl: `./${a.file}` };
}

export function campaignV2Ids(): string[] {
  return Object.keys(CAMPAIGN_V2.assets ?? {});
}

/**
 * The battle FX & neutral-upgrade delivery of 2026-10-15
 * (`assets-runtime/battle-fx-neutral-upgrades-v1`, `npm run battlefx:import`):
 * the six upgraded neutral portraits (`neutralupgrade.portrait.<creatureId>`),
 * their frame-region sprite sets, 24 projectile stills and impacts, and the
 * shooter projectile profiles — merged into the sprite manifest below, never
 * replacing it. Relative paths only.
 */
interface BattleFxFile {
  readonly assets: Record<string, { file: string; kind: string; width: number; height: number; creatureId: string; baseId: string }>;
  readonly creatures: Record<string, unknown>;
  readonly effects: Record<string, unknown>;
  readonly projectiles: Record<string, unknown>;
  readonly projectileProfiles: Record<string, unknown>;
}
const BATTLE_FX = battleFxUpgradesManifest as unknown as BattleFxFile;

/** An upgraded neutral's delivered portrait (native 1254 × 1254), or null. */
export function neutralUpgradeArt(id: string): { id: string; url: string; width: number; height: number; creatureId: string; baseId: string } | null {
  const a = BATTLE_FX.assets?.[id];
  if (!a || !safeFile(a.file)) return null;
  return { id, url: `./${a.file}`, width: a.width, height: a.height, creatureId: a.creatureId, baseId: a.baseId };
}

export function neutralUpgradeIds(): string[] {
  return Object.keys(BATTLE_FX.assets ?? {});
}

/**
 * The expedition, naval & siege kit of 2026-10-17 (`assets-runtime/expedition-v1`,
 * `npm run expedition:import`): 13 native pictures under their kit IDs — the neutral ship
 * (`expedition.ship-e`, `-ne`, `-se`) and its wreck (`expedition.ship-wreck`), the caravan wagon
 * (`expedition.wagon-e`, `-ne`, `-se`), the boarding battlefield (`expedition.boarding-battle`,
 * native 1672 × 941), the unknown-army vignette (`expedition.scout-unknown`), the caravan
 * dispatch and arrival paintings (`expedition.caravan-dispatch-art`, `-arrival-art`) and the
 * damaged / destroyed catapult (`expedition.catapult-damaged`, `-destroyed`); three vector
 * overlays (`expedition.overlay.flag-template`, `.wake`, `.destination-ring`) and the 28 controls
 * (`expedition.icon.*`, drawn by the Icon component under their `iconName`). The ship, wagon and
 * wreck also go to the sprite manifest's `mapTokens` (below). `visibleBounds` is the painted part
 * as fractions [left, top, right, bottom]: size by what shows, not by the transparent margin.
 * Relative paths only; the kit's reused IDs keep their existing registrations.
 */
export interface ExpeditionArt {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** `map-token` | `battlefield` | `illustration` | `siege-variant` | `overlay` | `icon`. */
  readonly kind: string;
  readonly visibleBounds: readonly [number, number, number, number];
  /** Ground contact point as fractions [x, y] (map tokens and siege variants). */
  readonly groundAnchor: readonly [number, number] | null;
  /** The kit's runtime display notes. */
  readonly display: string | null;
  /** Controls: the Icon name that draws this path. */
  readonly iconName: string | null;
}
interface ExpeditionFile {
  readonly assets: Record<string, { file: string; kind: string; width: number; height: number; visibleBounds?: number[]; groundAnchor?: number[]; display?: string; iconName?: string }>;
  readonly mapTokens: Record<string, unknown>;
}
const EXPEDITION = expeditionManifest as unknown as ExpeditionFile;

export function expeditionArt(id: string): ExpeditionArt | null {
  const a = EXPEDITION.assets?.[id];
  if (!a || !safeFile(a.file)) return null;
  const b = a.visibleBounds;
  const g = a.groundAnchor;
  return {
    id,
    url: `./${a.file}`,
    width: a.width,
    height: a.height,
    kind: a.kind,
    visibleBounds: b?.length === 4 ? [b[0]!, b[1]!, b[2]!, b[3]!] : [0, 0, 1, 1],
    groundAnchor: g?.length === 2 ? [g[0]!, g[1]!] : null,
    display: a.display ?? null,
    iconName: a.iconName ?? null,
  };
}

export function expeditionIds(): string[] {
  return Object.keys(EXPEDITION.assets ?? {});
}

/**
 * Coastal sites and sea salvage (2026-10-18, `assets-runtime/sea-sites-v1`, `npm run sea-sites:import`): the seven
 * native map sprites (`seaSites.coastal.watchtower.warm` / `.cold`, `seaSites.shipwreck.broken.mast` /
 * `.split.hull`, `seaSites.sea.pickup.wood` / `.stone` / `.gold`) with their measured painted bounds, ground
 * anchors, display sizes and the towers' flag mounts (presentation only), and the shipwreck expedition painting
 * (`seaSites.shipwreck.expedition.scene`, 1672 × 941, panels only).
 */
interface SeaSitesFile {
  readonly assets: Record<string, { file: string; kind: string; width: number; height: number; visibleBounds?: number[]; groundAnchor?: number[]; displayMeasure?: string; displayHexWidths?: number; flagAnchorApprox?: number[]; alt?: string }>;
}
const SEA_SITES = seaSitesManifest as unknown as SeaSitesFile;

/** A sea-site map picture with its layout data (null: not a map sprite of the kit). */
export function seaSiteArt(id: string): SeaSiteArt | null {
  const a = SEA_SITES.assets?.[id];
  if (!a || a.kind !== 'map-sprite' || !safeFile(a.file)) return null;
  const b = a.visibleBounds;
  const g = a.groundAnchor;
  const f = a.flagAnchorApprox;
  return {
    url: `./${a.file}`,
    width: a.width,
    height: a.height,
    visibleBounds: b?.length === 4 ? [b[0]!, b[1]!, b[2]!, b[3]!] : [0, 0, 1, 1],
    groundAnchor: g?.length === 2 ? [g[0]!, g[1]!] : [0.5, 1],
    measure: a.displayMeasure === 'height' ? 'height' : 'width',
    hexWidths: a.displayHexWidths ?? 1,
    flagAnchor: f?.length === 2 ? [f[0]!, f[1]!] : null,
  };
}

/** The shipwreck expedition painting (wreck and reward panels; never a battlefield). */
export function seaSitePainting(): { url: string; width: number; height: number; alt: string } | null {
  const a = SEA_SITES.assets?.['seaSites.shipwreck.expedition.scene'];
  if (!a || !safeFile(a.file)) return null;
  return { url: `./${a.file}`, width: a.width, height: a.height, alt: a.alt ?? '' };
}

/**
 * The sea-creature delivery of 2026-10-17 (`assets-runtime/sea-creatures-v1`, `npm run sea-creatures:import`):
 * the ten native portraits (`seacreatures.portrait.<creatureId>`, opaque 1254 × 1254, for the encyclopedia,
 * inspection and encounter cards) and the single-ship battlefield (`seacreatures.battlefield.single-ship`,
 * 1672 × 941, contain-fitted). The creature atlases, impacts, projectiles and profiles are registered in the
 * sprite manifest itself (merged by the importer). Relative paths only.
 */
interface SeaCreaturesFile {
  readonly assets: Record<string, { file: string; kind: string; width: number; height: number; creatureId?: string; layoutId?: string }>;
}
const SEA_CREATURES = seaCreaturesManifest as unknown as SeaCreaturesFile;

/** A sea-creature delivery picture (portrait or battlefield), or null. */
export function seaCreatureArt(id: string): { id: string; url: string; width: number; height: number; kind: string } | null {
  const a = SEA_CREATURES.assets?.[id];
  if (!a || !safeFile(a.file)) return null;
  return { id, url: `./${a.file}`, width: a.width, height: a.height, kind: a.kind };
}

const cache = new Map<string, AssetRecord>();

export function resolveAsset(id: string): AssetRecord {
  const hit = cache.get(id);
  if (hit) return hit;
  const expansion = expansionArt(id);
  if (expansion) {
    const rec: AssetRecord = { id, status: 'final', url: expansion.url, atlas: expansion.atlas, provenance: 'Approved native expansion artwork, October 2026' };
    cache.set(id, rec);
    return rec;
  }
  let rec: AssetRecord;
  const seaArt = id.startsWith('seacreatures.') ? seaCreatureArt(id) : null;
  if (seaArt) {
    rec = { id, status: 'final', url: seaArt.url, provenance: 'Sea-creature delivery 2026-10-17 (sea-creatures-v1)' };
    cache.set(id, rec);
    return rec;
  }
  const fe = id.startsWith('frontend.') ? frontendArt(id) : null;
  if (fe) {
    rec = { id, status: 'final', url: fe.url, provenance: '1.1.0 pre-game art (frontend-v1.1.0)' };
    cache.set(id, rec);
    return rec;
  }
  const kit = id.startsWith('frontendkit.') ? frontendKitArt(id) : null;
  if (kit) {
    rec = { id, status: 'final', url: kit.url, provenance: '1.1.0 complete frontend kit (frontend-kit-v1.1.0)' };
    cache.set(id, rec);
    return rec;
  }
  const adv = id.startsWith('adventurekit.') ? adventureKitArt(id) : null;
  if (adv) {
    rec = { id, status: 'final', url: adv.url, provenance: '1.1.0 adventure screens (adventure-gui-v1.1.0)' };
    cache.set(id, rec);
    return rec;
  }
  const v2 = id.startsWith('campaignv2.') ? campaignV2Art(id) : null;
  if (v2) {
    rec = { id, status: 'final', url: v2.url, provenance: 'Campaign expansion kit 2026-10-15 (campaign-v2)' };
    cache.set(id, rec);
    return rec;
  }
  const up = id.startsWith('neutralupgrade.') ? neutralUpgradeArt(id) : null;
  if (up) {
    rec = { id, status: 'final', url: up.url, provenance: 'Battle FX & neutral upgrades 2026-10-15 (battle-fx-neutral-upgrades-v1)' };
    cache.set(id, rec);
    return rec;
  }
  const sea = id.startsWith('seaSites.') ? SEA_SITES.assets?.[id] : undefined;
  if (sea && safeFile(sea.file)) {
    rec = { id, status: 'final', url: `./${sea.file}`, provenance: 'Coastal sites & sea salvage kit 2026-10-17 (sea-sites-v1)' };
    cache.set(id, rec);
    return rec;
  }
  const exp = id.startsWith('expedition.') ? expeditionArt(id) : null;
  if (exp) {
    rec = { id, status: 'final', url: exp.url, provenance: 'Expedition, naval & siege kit 2026-10-17 (expedition-v1)' };
    cache.set(id, rec);
    return rec;
  }
  const route = id.startsWith('recruitroute.') ? routeKitArt(id) : null;
  if (route) {
    rec = { id, status: 'final', url: route.url, provenance: 'Recruitment & route kit 2026-10-14 (recruitment-route-v1)' };
    cache.set(id, rec);
    return rec;
  }
  const enc = id.startsWith('encounterkit.') ? encounterKitArt(id) : null;
  if (enc) {
    rec = { id, status: 'final', url: enc.url, provenance: '1.1.0 encounter scenes (encounters-v1.1.0)' };
    cache.set(id, rec);
    return rec;
  }
  const fin = FINAL[id];
  const art = storyAsset(id);
  const ph = PLACEHOLDERS[id];
  if (fin) rec = { id, status: 'final', url: `./${fin.file}`, provenance: fin.provenance };
  else if (art) rec = { id, status: 'final', url: `./${art.file}`, provenance: STORY.provenance };
  else if (ph) rec = { id, status: 'placeholder', url: `./${ph.file}`, provenance: ph.provenance };
  else rec = { id, status: 'procedural', url: null, provenance: 'Procedural development placeholder generated at runtime.' };
  cache.set(id, rec);
  return rec;
}

// ---------------------------------------------------------------------------
// Opening-screen art (assets-runtime/ui/manifest.json, tools/assets/prepare_ui_art.py)
// ---------------------------------------------------------------------------

interface UiArtFile {
  readonly backgrounds: readonly string[];
  readonly assets: Record<string, { file: string; interior?: { left: number; right: number; top: number; bottom: number } }>;
}
const UI_ART = uiArtManifest as unknown as UiArtFile;

let chosenBackground: AssetRecord | null = null;

/**
 * The opening-screen background: the frontend kit's title painting (the hall
 * of the six pantheons, painted for the main page with no logo or text in it).
 * Only when that file is missing does the screen fall back to one of the older
 * opening paintings, picked at random once per start (presentation only — the
 * simulation never sees this), then to the menu placeholder.
 *
 * 1.1.3 (owner): the title always shows the new painting; 1.1.0–1.1.2 rotated
 * it with the twelve older ones, so most starts showed an old picture.
 */
export function menuBackground(): AssetRecord {
  if (chosenBackground) return chosenBackground;
  const title = resolveAsset('frontendkit.backdrop.title');
  if (title.url) return (chosenBackground = title);
  const ids = UI_ART.backgrounds.filter((id) => resolveAsset(id).url);
  const id = ids.length ? ids[Math.floor(Math.random() * ids.length)]! : 'menu.background';
  chosenBackground = resolveAsset(id);
  return chosenBackground;
}

/** Transparent window of the main-menu frame, as fractions of the frame image. */
export function menuFrameInterior(): { left: number; right: number; top: number; bottom: number } {
  return UI_ART.assets['menu.frame']?.interior ?? { left: 0.25, right: 0.25, top: 0.22, bottom: 0.15 };
}

/**
 * The hero screen's equipment figure: a neutral schematic body on navy (owner
 * delivery 2026-10-06, `hero-equipment-schematic-v2.png`, 1122 × 1402, kept as
 * delivered in `assets-runtime/ui/`, its source in `assets-source/ui/`). The
 * slot boxes stand over it; it is never the hero's look.
 */
export const HERO_EQUIPMENT_SCHEMATIC = './ui/hero-equipment-schematic-v2.png';

/** Building art: exact level asset first, then the location's generic placeholder. */
export function resolveBuildingArt(artAssetId: string): AssetRecord {
  const exact = resolveAsset(artAssetId);
  if (exact.url) return exact;
  const generic = artAssetId.replace(/\.l\d+$/, '');
  return resolveAsset(generic);
}

/**
 * A town's painting for its town hall level (Brief 17, owner request
 * 2026-10-06: four stages per pantheon, `<background>.l1`–`.l4`). No hall or
 * level 0 shows the first stage, above 4 the fourth; a stage not delivered
 * falls back to the first, then to the single painting. Buildings stay overlays
 * at their own places on every stage.
 */
export function townBackground(backgroundAssetId: string, civicHallLevel: number | undefined, resolve: (id: string) => AssetRecord = resolveAsset): AssetRecord {
  const level = Math.max(1, Math.min(4, Math.floor(civicHallLevel ?? 1) || 1));
  const staged = resolve(`${backgroundAssetId}.l${level}`);
  if (staged.url) return staged;
  const first = resolve(`${backgroundAssetId}.l1`);
  return first.url ? first : resolve(backgroundAssetId);
}

// ---------------------------------------------------------------------------
// 2D sprites — assets-runtime/sprites/manifest.json (written by the placeholder
// generator and by `npm run sprites:import`; ASSET_PIPELINE.md §1). Creature
// battle strips, mounted map avatars, map locations, decoration, obstacles,
// siege pieces, projectiles and effects, each with its status (placeholder or
// final). Every file is served from the app's own runtime folder.
// ---------------------------------------------------------------------------

/** Campaign-v2 sprite entries with relative files only (frame-region creature sets, map sites). */
function safeEntries<T>(rec: Record<string, unknown> | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(rec ?? {})) {
    const files = JSON.stringify(v).match(/"file":"([^"]*)"/g) ?? [];
    if (files.every((f) => safeFile(f.slice(8, -1)))) out[k] = v as T;
  }
  return out;
}

registerSpriteManifest(
  {
    ...(spriteManifestFile as unknown as SpriteManifest),
    creatures: {
      ...(spriteManifestFile as unknown as SpriteManifest).creatures,
      ...safeEntries<SpriteManifest['creatures'][string]>(CAMPAIGN_V2.creatures),
      ...safeEntries<SpriteManifest['creatures'][string]>(BATTLE_FX.creatures),
    },
    projectiles: { ...(spriteManifestFile as unknown as SpriteManifest).projectiles, ...safeEntries<SpriteManifest['projectiles'][string]>(BATTLE_FX.projectiles) },
    effects: { ...(spriteManifestFile as unknown as SpriteManifest).effects, ...safeEntries<SpriteManifest['effects'][string]>(BATTLE_FX.effects) },
    projectileProfiles: {
      ...((spriteManifestFile as unknown as SpriteManifest).projectileProfiles ?? {}),
      ...safeEntries<NonNullable<SpriteManifest['projectileProfiles']>[string]>(BATTLE_FX.projectileProfiles),
    },
    sites: { ...(spriteManifestFile as unknown as SpriteManifest).sites, ...safeEntries<SpriteManifest['sites'][string]>(CAMPAIGN_V2.sites), ...twinSiteSprites },
    siege: { ...(spriteManifestFile as unknown as SpriteManifest).siege, ...SIEGE_V2.siege, ...GATE_V3.siege },
    mapTokens: safeEntries<NonNullable<SpriteManifest['mapTokens']>[string]>(EXPEDITION.mapTokens),
  },
  (file) => `./${file}`,
);

/** A creature's idle animation strip (full-body, feet anchored), for the 1.1.0 recruitment stage. */
export interface IdleStrip {
  readonly url: string;
  readonly frames: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly fps: number;
  /** Feet point as fractions of a frame. */
  readonly anchor: readonly [number, number];
}

/**
 * The recruitment stage's strip: the creature's delivered native idle strip
 * (source resolution, original timing and anchor; recruitment-route-v1), with the
 * union of its visible pixels over every frame — the stage fits that, not the
 * whole frame. Map and battle keep their own strips (`creatureIdleStrip`).
 * Falls back to the runtime strip, fitted by its whole frame, when no copy exists.
 */
export interface StageStrip extends IdleStrip {
  /** Union of the visible pixels over all frames, in frame pixels [x0, y0, x1, y1]. */
  readonly visible: readonly [number, number, number, number];
  readonly native: boolean;
}

export function creatureStageStrip(creatureId: string): StageStrip | null {
  const c = ROUTE_KIT.creatures?.[creatureId];
  if (c && safeFile(c.file) && c.frames > 0 && c.frameWidth > 0 && c.frameHeight > 0 && c.visibleUnion?.length === 4) {
    const v = c.visibleUnion;
    return {
      url: `./${c.file}`,
      frames: c.frames,
      frameWidth: c.frameWidth,
      frameHeight: c.frameHeight,
      fps: c.fps || 4,
      anchor: c.anchor?.length === 2 ? [c.anchor[0]!, c.anchor[1]!] : [0.5, 0.9],
      visible: [v[0]!, v[1]!, v[2]!, v[3]!],
      native: true,
    };
  }
  const s = creatureIdleStrip(creatureId);
  return s ? { ...s, visible: [0, 0, s.frameWidth, s.frameHeight], native: false } : null;
}

export function creatureIdleStrip(creatureId: string): IdleStrip | null {
  const set = (spriteManifestFile as unknown as SpriteManifest).creatures[creatureId];
  const idle = set?.animations?.idle as { file?: string; frames?: number; frameWidth?: number; frameHeight?: number; fps?: number; anchor?: readonly [number, number] } | undefined;
  if (!idle?.file || !idle.frames || !idle.frameWidth || !idle.frameHeight) return null;
  return { url: `./${idle.file}`, frames: idle.frames, frameWidth: idle.frameWidth, frameHeight: idle.frameHeight, fps: idle.fps ?? 4, anchor: idle.anchor ?? [0.5, 0.9] };
}
