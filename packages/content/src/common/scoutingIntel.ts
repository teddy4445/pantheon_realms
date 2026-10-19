/**
 * Scouting intel terms (expedition kit 2026-10-17, design/scouting-policy.json;
 * scenario feature `scoutingIntelV1`). Proposed values, unplaytested: the stage
 * distances, quantity ranges and strength bands are the kit's; the two AI-belief
 * priors at the end are this build's (documented in packages/ai/src/observation.ts).
 * The Scouting skill keeps its +1/+2/+3 vision (heroesMagic.ts); its rank also sets
 * the scout-report distance here.
 */
import type { ScoutingIntelPolicy } from '@pr/rules';

export const SCOUTING_INTEL_POLICY: ScoutingIntelPolicy = {
  id: 'scoutingIntelV1',
  identifiedWithinHexes: 3,
  // Rank 0 never writes a scout report, however close; ranks 1/2/3 within 2/3/4 hexes.
  detailedDistanceByRank: [0, 2, 3, 4],
  quantityBins: [
    { min: 1, max: 4 },
    { min: 5, max: 9 },
    { min: 10, max: 19 },
    { min: 20, max: 39 },
    { min: 40, max: 79 },
    { min: 80, max: 159 },
    { min: 160, max: 319 },
    { min: 320, max: null },
  ],
  // Catalog Gold cost × living creatures, hero power excluded: a coarse size, never a win prediction.
  strengthBands: [
    { maxExclusive: 500, label: 'Small patrol' },
    { maxExclusive: 1500, label: 'Modest force' },
    { maxExclusive: 4500, label: 'Substantial force' },
    { maxExclusive: 10000, label: 'Large army' },
    { maxExclusive: null, label: 'Vast army' },
  ],
  // Conservative public priors: avoid treating an uncertain army's midpoint as a safe attack.
  // These change decisions only, never actual troops or the information revealed to either player.
  bandEstimateGold: [425, 1350, 4050, 9000, 25000],
  openRangeEstimateFactor: 1.75,
};
