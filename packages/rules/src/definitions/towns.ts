/**
 * Town content: 18 fixed logical locations per archetype and building definitions.
 *
 * Every location holds one building chain (level 1..n). A creature dwelling
 * location holds exactly [base dwelling, upgraded dwelling]: empty -> base -> upgraded.
 * Only the highest built level of a chain is active; lower levels are superseded
 * (e.g. Town Hall replaces Village Hall income rather than adding to it).
 *
 * Immutable content. Runtime built levels live in TownState.buildings.
 */
import type { AssetId, BuildingId, BuildingSlotId, CreatureFamilyId, PantheonId, TownArchetypeId } from '../ids';
import type { ResourceCost } from '../core/resources';
import type { ImplementationStatus, ProvenanceInfo } from './common';
import type { CreatureForm, CreatureTier } from './creatures';
import type { EffectDefinition, RequirementDefinition } from './logic';

/** The eleven shared support functions (owner architecture §11). */
export type SupportRole =
  | 'civic_hall'
  | 'tavern'
  | 'marketplace'
  | 'resource_depot'
  | 'workshop'
  | 'mage_guild'
  | 'pantheon_temple'
  | 'fortifications'
  | 'training_academy'
  | 'watchtower'
  | 'artifact_merchant';

export const SUPPORT_ROLES: readonly SupportRole[] = [
  'civic_hall',
  'tavern',
  'marketplace',
  'resource_depot',
  'workshop',
  'mage_guild',
  'pantheon_temple',
  'fortifications',
  'training_academy',
  'watchtower',
  'artifact_merchant',
];

export interface BuildingDefinition {
  readonly id: BuildingId;
  readonly pantheonId: PantheonId;
  readonly name: string;
  readonly slotId: BuildingSlotId;
  /** 1-based level inside its location chain. */
  readonly level: number;
  readonly cost: ResourceCost;
  readonly requirements: readonly RequirementDefinition[];
  readonly effects: readonly EffectDefinition[];
  readonly dwelling?: {
    readonly familyId: CreatureFamilyId;
    readonly form: CreatureForm;
    /** First construction of the base dwelling grants one base-growth quantity. */
    readonly grantsInitialPopulation: boolean;
  };
  readonly summary: string;
  readonly implementationStatus: ImplementationStatus;
  readonly artAssetId: AssetId;
  readonly provenance: ProvenanceInfo;
}

/**
 * Normalized placement on the town composition (0..100 percent of the scene).
 * x is the building's horizontal center, y its baseline (bottom edge on the
 * platform), width a share of the scene width; height is the hit-area height.
 */
export interface TownSlotPlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Draw order; higher is closer to the viewer. */
  readonly layer: number;
  /** Optional shared image frame for a town's building upgrade variants. */
  readonly artAspectRatio?: number;
}

export interface BuildingSlotDefinition {
  readonly id: BuildingSlotId;
  readonly kind: 'support' | 'dwelling';
  readonly role?: SupportRole;
  readonly tier?: CreatureTier;
  readonly label: string;
  /** Ordered chain; index 0 is level 1. */
  readonly chain: readonly BuildingId[];
  readonly placement: TownSlotPlacement;
}

export interface TownArchetypeDefinition {
  readonly id: TownArchetypeId;
  readonly pantheonId: PantheonId;
  readonly name: string;
  readonly backgroundAssetId: AssetId;
  /** Background canvas width / height; older town paintings default to 4:3. */
  readonly sceneAspectRatio?: number;
  /** Matching recovery-state painting for archetypes with a revised composition. */
  readonly damagedBackgroundAssetId?: AssetId;
  /**
   * Presentation only: where the town screen's economy panel sits along the top
   * edge of the painting — the stretch of sky free of buildings and landmarks:
   * a corner, the centre (default), or the panel's centre as a percentage of
   * the painting's width.
   */
  readonly hudAnchor?: 'left' | 'center' | 'right' | number;
  /** Exactly 18 locations: 11 support + 7 dwellings. */
  readonly slots: readonly BuildingSlotDefinition[];
}
