/**
 * Shared vocabulary for immutable content definitions.
 *
 * Status fields are honest labels shown in the encyclopedia and screens.
 * They never change rules; they describe how complete a piece of content is.
 */

/** How far a definition is implemented in this build. */
export type ImplementationStatus =
  /** Rules are implemented and usable in play; art may still be a placeholder. */
  | 'implemented'
  /** Names/topology exist for architecture and encyclopedia preview; not playable. */
  | 'preparation'
  /** Documented location or concept with no approved mechanics yet; never purchasable. */
  | 'planned';

/** Balance provenance. Every v0.2/v0.3 number is proposed and unplaytested. */
export type BalanceStatus = 'proposed_unplaytested' | 'not_applicable' | 'approved';

/** Where a piece of content comes from, for provenance display. */
export type ContentSource =
  | 'v0.3-catalog'
  | 'v0.3-campaign'
  | 'v0.2-candidate-rules'
  | 'owner-architecture'
  | 'concept-board'
  | 'proposed-this-build';

export interface ProvenanceInfo {
  readonly source: ContentSource;
  readonly note?: string;
}
