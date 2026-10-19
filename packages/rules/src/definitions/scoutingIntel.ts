/**
 * Scouting intel (expedition kit, scenario feature `scoutingIntelV1`): the terms of
 * gradual adventure scouting, as data (design/scouting-policy.json of the kit,
 * docs/expedition-v1/). The values are proposed and unplaytested; tune them in
 * `@pr/content` (`common/scoutingIntel.ts`), never in code.
 *
 * Owns: the policy's shape. Does not own: the projection (resolvers/intel.ts) or
 * the per-player snapshots (systems/intel.ts).
 */

/** An approximate quantity range shown by a scout report: `min`–`max` (`max` null = open, e.g. 320+). */
export interface IntelCountRange {
  readonly min: number;
  readonly max: number | null;
}

/** One broad army-size band: Gold value below `maxExclusive` (null = no upper bound). */
export interface IntelStrengthBand {
  readonly maxExclusive: number | null;
  /** The player-facing words ("Substantial force"); never "safe". */
  readonly label: string;
}

export interface ScoutingIntelPolicy {
  /** The scenario feature flag (`ScenarioFeatures.scoutingIntelV1`). */
  readonly id: 'scoutingIntelV1';
  /** A visible enemy army within this many hexes of a friendly hero or town is identified (creature types). */
  readonly identifiedWithinHexes: number;
  /**
   * A friendly hero's Scouting rank → the hexes within which a visible army is scouted
   * (approximate quantities). Rank 0 never scouts (0). Index = rank.
   */
  readonly detailedDistanceByRank: readonly number[];
  /** Quantity ranges of a scout report, ascending (the last may be open). */
  readonly quantityBins: readonly IntelCountRange[];
  /** Strength bands over the army's catalog Gold value (Gold cost × living count), ascending. */
  readonly strengthBands: readonly IntelStrengthBand[];
  /**
   * The AI's belief (observation.ts): the representative Gold value of a band whose army is not
   * scouted, by band index — a documented prior (the band's middle; twice its floor for the open band).
   */
  readonly bandEstimateGold: readonly number[];
  /** The AI's belief: the count it assumes inside an open quantity range (320+), as a multiple of its floor. */
  readonly openRangeEstimateFactor: number;
}
