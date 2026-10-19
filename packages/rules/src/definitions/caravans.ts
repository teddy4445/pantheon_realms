/**
 * Recruitment caravans (expedition kit 2026-10-17, design/caravan-policy.json; scenario
 * feature `recruitmentCaravansV1`): the terms of sending recruits bought in one owned town
 * over land to another owned town, as data. The values are the kit's proposal, unplaytested;
 * tune them in `@pr/content` (`common/caravans.ts`), never in code.
 *
 * Owns: the policy's shape. Does not own: the quote, dispatch, movement and delivery
 * (systems/caravans.ts), the route search (resolvers/caravans.ts) or the saved shipments
 * (`MatchState.caravans`).
 */
import type { ResourceCost } from '../core/resources';

export interface CaravanPolicy {
  /** The scenario feature flag (`ScenarioFeatures.recruitmentCaravansV1`). */
  readonly id: 'recruitmentCaravansV1';
  /** Paid once per shipment on top of the recruits' own source-town prices. */
  readonly transportFee: ResourceCost;
  /** Movement points a caravan spends at the start of each of its owner's turns (no carry-over). Edges cost the rules profile's road and terrain costs. */
  readonly dailyMovement: number;
  /** At most this many distinct creature stacks in one shipment (identical creatures merge). */
  readonly maxDistinctStacks: number;
  /** Hexes the wagon sees around itself (its owner's fog): it never reveals distant threats on its route. */
  readonly visionRadius: number;
}
