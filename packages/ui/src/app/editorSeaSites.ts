/**
 * The map editor's coastal sites and sea salvage (sea-sites kit 2026-10-18): which tiles a coastal
 * watchtower, floating salvage or a shipwreck may stand on — with the reason for every refused tile,
 * from the same placement rules the document validator and the random-map generator use
 * (`seaSiteCustomProblem` → rules/resolvers/seaSites.ts) — the fields a new one starts with, and the
 * palette entries. Pure document helpers; the editor screen only calls them.
 */
import { coastalTowerSkin, customWaterSiteKind, seaSiteCustomProblem, terrainAt, type CustomMapDocument, type CustomSite, type CustomSiteKind } from '@pr/session';
import { SEA_PICKUP_NAMES, SEA_PICKUP_RESOURCES, seaSitePolicy, type ContentCatalog, type HexCoord, type SeaPickupResource } from '@pr/rules';
import type { SeaSiteArt } from '@pr/presentation/core';
import { seaSiteArt } from '../assets/manifest';
import { isSeaMonsterKind, seaMonsterDefaults, seaMonsterPlacementProblem } from './editorSeaMonsters';

/** The three sea-site kinds of the kit (other water kinds, such as sea monsters, keep their own rules). */
export type EditorSeaSiteKind = 'coastal_watchtower' | 'sea_pickup' | 'shipwreck';

export function isEditorSeaSiteKind(kind: CustomSiteKind): kind is EditorSeaSiteKind {
  return kind === 'coastal_watchtower' || kind === 'sea_pickup' || kind === 'shipwreck';
}

/** A site ID no document uses (the placement probe excludes nothing). */
const PROBE_ID = '\u0000new-sea-site';

/**
 * Why a site of `kind` cannot stand on a tile:
 *  - `undefined`: the kind stands on land — the editor's own open-ground check applies;
 *  - `null`: it may stand there (or another site already does: the click selects that one);
 *  - a sentence: the reason, shown as the editor's error toast and hover hint.
 * `movingId`: the site being dragged to the tile (it does not count as an obstacle to itself).
 */
export function editorSeaPlacementProblem(catalog: ContentCatalog, doc: CustomMapDocument, c: HexCoord, kind: CustomSiteKind, movingId?: string): string | null | undefined {
  if (!isEditorSeaSiteKind(kind) && !customWaterSiteKind(kind)) return undefined;
  if (!movingId && doc.sites.some((s) => s.q === c.q && s.r === c.r)) return null;
  if (!isEditorSeaSiteKind(kind)) {
    // sea_monster: the sea-creature delivery's own check (open water, a sea army).
    if (isSeaMonsterKind(kind)) return seaMonsterPlacementProblem(catalog, doc, c, movingId ? doc.sites.find((s) => s.id === movingId)?.guard : undefined);
    return terrainAt(doc, c) === 'water' ? null : 'This site stands on open water';
  }
  const problem = seaSiteCustomProblem(doc, { id: movingId ?? PROBE_ID, kind, q: c.q, r: c.r });
  return problem ? sentence(problem) : null;
}

/** The rules' reasons are written lower-case for the validator's list; the editor shows them as sentences. */
function sentence(text: string): string {
  return text ? text[0]!.toUpperCase() + text.slice(1) : text;
}

/** The fields a newly placed water site starts with (everything else is drawn when the game starts). */
export function seaSiteDefaults(catalog: ContentCatalog, kind: CustomSiteKind, resource: SeaPickupResource | undefined): Partial<CustomSite> {
  if (kind === 'sea_pickup') return { resource: resource ?? 'gold' };
  if (isSeaMonsterKind(kind)) return seaMonsterDefaults(catalog);
  return {};
}

/** One button of the editor's sea palette. */
export interface SeaPaletteEntry {
  readonly kind: EditorSeaSiteKind;
  readonly resource?: SeaPickupResource;
  readonly label: string;
  readonly title: string;
  /** The map picture's asset ID (`seaSites.*`). */
  readonly assetId: string;
  readonly testId: string;
}

/** The sea palette: the lookout, the three kinds of salvage and the wreck. */
export function seaPalette(catalog: ContentCatalog): SeaPaletteEntry[] {
  const policy = seaSitePolicy(catalog);
  const range = (r: SeaPickupResource) => {
    const [lo, hi] = policy.pickupRewards[r];
    return r === 'gold' ? `${lo}–${hi} Gold` : `${lo}–${hi} ${r === 'wood' ? 'Wood' : 'Stone'}`;
  };
  return [
    {
      kind: 'coastal_watchtower',
      label: 'Coastal Watchtower',
      title: `A lookout on the coast: whoever holds it sees ${policy.towerRadius} hexes around, the sea lanes included, and is warned of enemy ships. Taken by a hero on foot. Coastal land reachable on foot, with a beach nearby.`,
      assetId: 'seaSites.coastal.watchtower.warm',
      testId: 'tool-place-coastal_watchtower',
    },
    ...SEA_PICKUP_RESOURCES.map(
      (r): SeaPaletteEntry => ({
        kind: 'sea_pickup',
        resource: r,
        label: SEA_PICKUP_NAMES[r],
        title: `${SEA_PICKUP_NAMES[r]}: ${range(r)} adrift on one open-water hex (drawn when the game starts unless set); the first ship to sail onto it takes it.`,
        assetId: `seaSites.sea.pickup.${r}`,
        testId: `tool-place-sea_pickup-${r}`,
      }),
    ),
    {
      kind: 'shipwreck',
      label: 'Shipwreck',
      title: `A wreck on open water: a hero aboard a ship beside it explores it for ${policy.wreckExploreCost} movement — salvage, perhaps raiders moored alongside (drawn when the game starts unless set). Needs two free water hexes beside it and never closes the last way through.`,
      assetId: 'seaSites.shipwreck.broken.mast',
      testId: 'tool-place-shipwreck',
    },
  ];
}

/** The hover hint of a sea tool over a tile (null: not a sea tool). */
export function seaToolHint(catalog: ContentCatalog, doc: CustomMapDocument, c: HexCoord, kind: CustomSiteKind, label: string): { readonly text: string; readonly fits: boolean } | null {
  const problem = editorSeaPlacementProblem(catalog, doc, c, kind);
  if (problem === undefined) return null;
  const there = doc.sites.find((s) => s.q === c.q && s.r === c.r);
  if (there) return { text: 'A site stands here — click to select it', fits: false };
  if (problem) return { text: problem, fits: false };
  return { text: `Place ${label.toLowerCase().startsWith('the ') ? label : `a ${label}`} here`, fits: true };
}

/** The adventure map's own picture of a placed sea site for the editor canvas (null: not a sea site). */
export function editorSeaSitePicture(doc: CustomMapDocument, site: Pick<CustomSite, 'kind' | 'q' | 'r' | 'resource' | 'skin'>): { readonly url: string; readonly art: SeaSiteArt } | null {
  const id =
    site.kind === 'coastal_watchtower'
      ? `seaSites.coastal.watchtower.${coastalTowerSkin(doc.biome, (x) => terrainAt(doc, x), { q: site.q, r: site.r })}`
      : site.kind === 'sea_pickup'
        ? `seaSites.sea.pickup.${site.resource ?? 'gold'}`
        : site.kind === 'shipwreck'
          ? site.skin === 'split_hull'
            ? 'seaSites.shipwreck.split.hull'
            : 'seaSites.shipwreck.broken.mast'
          : null;
  const art = id ? seaSiteArt(id) : null;
  return art?.url ? { url: art.url, art } : null;
}
