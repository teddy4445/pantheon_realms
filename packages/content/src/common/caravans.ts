/**
 * Recruitment caravan terms (expedition kit 2026-10-17, design/caravan-policy.json;
 * scenario feature `recruitmentCaravansV1`). Proposed values, unplaytested: the flat
 * transport fee, the daily movement (the rules profile's road cost 75 and terrain costs
 * apply), the seven-stack limit and the one-hex wagon vision are the kit's.
 */
import type { CaravanPolicy } from '@pr/rules';

export const CARAVAN_POLICY: CaravanPolicy = {
  id: 'recruitmentCaravansV1',
  transportFee: { gold: 150 },
  dailyMovement: 600,
  maxDistinctStacks: 7,
  visionRadius: 1,
};
