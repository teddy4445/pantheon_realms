/**
 * Coastal sites and sea salvage (sea-map objects kit of 2026-10-17; docs/sea-sites-v1/): three
 * site kinds that are shared data, never `if (id === …)` branches —
 *  - `coastal_watchtower`: a capturable lookout on a coastal land hex. Its owner sees every hex
 *    within `radius` (6 proposed) while it holds the tower — live ordinary vision, sea lanes
 *    included; an enemy ship entering that sight raises one coalesced alert per ship per turn.
 *    The old `watchtower` kind (reveals listed sites on a first visit) is unchanged.
 *  - `sea_pickup`: floating salvage on one water hex (Driftwood Bundle, Stone Cargo, Lost
 *    Treasury): a hero aboard a ship who ends a sea move on it collects the stored amount once.
 *  - `shipwreck`: a one-hex water landmark (blocks sailing); a hero aboard a ship beside it may
 *    Explore (movement points) — the outcome was drawn once when the map was made and is stored
 *    on the site: abandoned cargo, guarded salvage or a rare cache with one artifact. Guards are
 *    fought on the two-deck boarding battlefield as raiders moored alongside (`wreck_expedition`
 *    encounters; the wreck is a site, never a hostile ship).
 *
 * Owns: the kinds' data shapes, the per-site saved state of a wreck, the per-owner tower watch
 * record, and the proposed tuning (`PROPOSED_SEA_SITE_POLICY`; content's `seaSitePolicy` is the
 * one in force — tune it in `@pr/content`, never in code). The rules read only the numbers stored
 * on each site (radius, explore cost, reward, guard), so a saved map never depends on a later edit
 * of the policy. Does not own: the rules (resolvers/seaSites.ts, systems/seaSites.ts), placement
 * (@pr/mapgen) or pictures (presentation; the `skin` fields are presentation only).
 */
import type { ArtifactId, BattleId, HeroId, PlayerId, ShipId } from '../ids';
import type { ResourceCost } from '../core/resources';
import type { HexCoord } from '../core/hex';
import type { StackSpec } from './world';

/** The resources floating salvage can hold (the existing wallet keys). */
export type SeaPickupResource = 'wood' | 'stone' | 'gold';
export const SEA_PICKUP_RESOURCES: readonly SeaPickupResource[] = ['wood', 'stone', 'gold'];

/** Display names of the three pickups (the kit's names). */
export const SEA_PICKUP_NAMES: Readonly<Record<SeaPickupResource, string>> = {
  wood: 'Driftwood Bundle',
  stone: 'Stone Cargo',
  gold: 'Lost Treasury',
};

/** What a wreck holds (drawn once when the map is made). */
export type WreckOutcomeKind = 'abandoned_cargo' | 'guarded_salvage' | 'rare_cache';

/** Raiders moored alongside a wreck: an ordinary neutral army (existing catalog creatures). */
export interface WreckGuardDefinition {
  /** Shown before the battle ("Raiders moored alongside"). */
  readonly label: string;
  readonly army: readonly StackSpec[];
}

export interface WreckOutcomeDefinition {
  readonly kind: WreckOutcomeKind;
  /** Resources granted once when the wreck is cleared. */
  readonly reward: ResourceCost;
  /** The rare cache's artifact (an existing minor artifact chosen at generation). */
  readonly artifactId?: ArtifactId;
  /** Present: the wreck is guarded (guarded salvage, rare cache). */
  readonly guard?: WreckGuardDefinition;
}

/** Map pictures (presentation only; never read by the rules). */
export type CoastalTowerSkin = 'warm' | 'cold';
export type ShipwreckSkin = 'broken_mast' | 'split_hull';

/**
 * A wreck's expedition state (saved on its `SiteState.wreck`):
 *  - `untouched`: nobody has cleared it (guards, if any, still aboard — perhaps fewer after a lost fight);
 *  - `encounterPending`: its guards are being fought right now (`battleId`, `heroId`);
 *  - `pendingReward`: cleared, its resources granted, but the artifact did not fit the hero's packs —
 *    it waits at the wreck for `pendingFor`'s heroes (the ordinary swap / leave choice);
 *  - `cleared`: done; non-interactive (drawn with a cleared overlay).
 */
export type WreckPhase = 'untouched' | 'encounterPending' | 'cleared' | 'pendingReward';

export interface WreckSiteState {
  phase: WreckPhase;
  /** The battle of a pending encounter (null otherwise). */
  battleId: BattleId | null;
  /** The hero fighting it (encounterPending) or the hero who cleared it. */
  heroId: HeroId | null;
  /** Empires whose heroes have fought its guards (they know what is aboard). */
  guardSeenBy: PlayerId[];
  /** The artifact waiting at the wreck (pendingReward). */
  pendingArtifactId?: ArtifactId | null;
  /** The empire it waits for (pendingReward). */
  pendingFor?: PlayerId | null;
}

/**
 * One owner's tower watch (saved in `MatchState.seaWatch`): the hostile ships its towers see now
 * and the alerts already raised in the current owner-turn period, so an alert is raised at most
 * once per ship per owner-turn, never for a ship that merely stays in sight, and never again on load.
 */
export interface SeaWatchState {
  /** Hostile ships inside the owner's tower sight after the last command (sorted IDs). */
  inRange: ShipId[];
  /** The owner-turn period of `alerted` (see `ownerTurnPeriod`). */
  period: number;
  /** Ships already alerted in `period` (sorted IDs). */
  alerted: ShipId[];
  /** Last 100 reports observed by this owner; retained after a tower changes hands. */
  history?: { day: number; siteId: string; shipId: ShipId; shipOwnerId: PlayerId | null; coord: HexCoord }[];
}

/** The proposed numbers (the kit's interaction contracts; unplaytested). */
export interface SeaSitePolicy {
  /** Live sight of an owned coastal watchtower, in adventure hexes. */
  readonly towerRadius: number;
  /** Movement points an Explore at a wreck costs (and needs). */
  readonly wreckExploreCost: number;
  /** Reward ranges of floating salvage, drawn once at generation: [min, max] inclusive. */
  readonly pickupRewards: Readonly<Record<SeaPickupResource, readonly [number, number]>>;
  /**
   * The wreck outcome table (weights out of their sum). `guardValue` is the raiders' Gold value
   * before the map's guard strength (`GUARD_PERCENT`); `guards` lists the creatures and the share
   * of that value each takes (existing humanoid neutrals: no new art).
   */
  readonly wreckOutcomes: readonly {
    readonly kind: WreckOutcomeKind;
    readonly weight: number;
    readonly reward: ResourceCost;
    readonly artifactRarity?: 'minor';
    readonly guardValue?: number;
    readonly guards?: readonly { readonly creatureId: string; readonly share: number }[];
  }[];
}

export const PROPOSED_SEA_SITE_POLICY: SeaSitePolicy = {
  towerRadius: 6,
  wreckExploreCost: 100,
  pickupRewards: { wood: [3, 6], stone: [3, 6], gold: [250, 500] },
  wreckOutcomes: [
    { kind: 'abandoned_cargo', weight: 50, reward: { gold: 500, wood: 4 } },
    {
      kind: 'guarded_salvage',
      weight: 40,
      reward: { gold: 1000, wood: 8 },
      // The kit's example, 14 Brigands and 4 Brigand Cutthroats, at normal guard strength.
      guardValue: 1050,
      guards: [
        { creatureId: 'brigand', share: 770 },
        { creatureId: 'brigand_cutthroat', share: 280 },
      ],
    },
    {
      kind: 'rare_cache',
      weight: 10,
      reward: { gold: 750 },
      artifactRarity: 'minor',
      guardValue: 2000,
      guards: [
        { creatureId: 'brigand_cutthroat', share: 1200 },
        { creatureId: 'sling_master', share: 800 },
      ],
    },
  ],
};

/** The policy in force (content's, else the proposed one). */
export function seaSitePolicy(catalog: { readonly seaSitePolicy?: SeaSitePolicy }): SeaSitePolicy {
  return catalog.seaSitePolicy ?? PROPOSED_SEA_SITE_POLICY;
}

/** The label of wreck raiders (one wording everywhere). */
export const WRECK_GUARD_LABEL = 'Raiders moored alongside the wreck';
