/**
 * Story art that is ordered but not delivered yet. The game shows its procedural
 * stand-ins meanwhile (a generated square for a portrait, no bust beside the
 * dialogue box, a drawn card for a campaign or mission picture).
 *
 * GPT-6 Brief 18 (`assets-source/art/briefs/GPT6_BRIEF_18_SILENT_ORACLE.md`,
 * The Silent Oracle): delivered and imported on 2026-10-14 (`npm run art:import`,
 * `npm run icons:import -- --new`), so both lists are empty and the story-art and
 * portrait tests require every file. A later brief lists its awaited IDs here
 * until its import, then empties the lists again.
 */
export const AWAITING_BRIEF_18 = {
  /** Campaigns whose cover, card, mission pictures and endings are not delivered. */
  campaigns: [] as readonly string[],
  /** New speakers and opponents (portrait IDs; their busts follow by convention). */
  portraits: [] as readonly string[],
};

export const awaitingPortrait = (portraitAssetId: string | undefined): boolean => !!portraitAssetId && AWAITING_BRIEF_18.portraits.includes(portraitAssetId);
export const awaitingCampaign = (campaignId: string | null | undefined): boolean => !!campaignId && AWAITING_BRIEF_18.campaigns.includes(campaignId);
