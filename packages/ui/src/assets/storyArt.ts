/**
 * Story art lookups (ASSET_PIPELINE.md §13) — presentation only. Asset IDs are
 * derived from content data by the documented conventions; nothing here names
 * a character, campaign or mission.
 */
import { resolveArt, type StoryArtRecord } from './manifest';

/**
 * The half-body dialogue portrait of a line's speaker: the speaker's
 * `portraitAssetId` with `.portrait` → `.bust` (null when none is delivered).
 */
export function speakerBust(line: { readonly portraitAssetId: string }): StoryArtRecord | null {
  const id = line.portraitAssetId;
  return id.endsWith('.portrait') ? resolveArt(`${id.slice(0, -'.portrait'.length)}.bust`) : null;
}

export type SpeakerSide = 'left' | 'right';

/**
 * Where each speaker of a scene stands beside the dialogue box. The campaign
 * hero (when present) speaks from the left; the other speakers take the sides in
 * order of first appearance. The busts face right, so a speaker on the right is
 * mirrored to face the scene.
 */
export function speakerSides(lines: readonly { readonly speaker: string }[], protagonist?: string | null): Map<string, SpeakerSide> {
  const out = new Map<string, SpeakerSide>();
  const order: string[] = [];
  if (protagonist && lines.some((l) => l.speaker === protagonist)) order.push(protagonist);
  for (const l of lines) if (!order.includes(l.speaker)) order.push(l.speaker);
  order.forEach((sp, i) => out.set(sp, i % 2 === 0 ? 'left' : 'right'));
  return out;
}

/** Briefing art for a mission thumbnail ID (`mission.<…>.thumbnail` → `mission.<…>.briefing`). */
export function briefingArt(thumbnailAssetId: string | undefined): StoryArtRecord | null {
  if (!thumbnailAssetId?.endsWith('.thumbnail')) return null;
  return resolveArt(`${thumbnailAssetId.slice(0, -'.thumbnail'.length)}.briefing`);
}

/**
 * The ending picture for a finished campaign: the chosen epilogue variant
 * (`ending.<campaign>.<flag>`, the same variant `campaignEpilogueLines` plays) or,
 * for a campaign with one epilogue, `ending.<campaign>.epilogue`. A campaign with
 * alternatives but no chosen flag shows none — never the other ending.
 */
export function campaignEndingArtId(camp: { readonly id: string; readonly epilogueVariants?: readonly { readonly flag: string }[] }, flags: Readonly<Record<string, boolean | undefined>>): string | null {
  if (camp.epilogueVariants?.length) {
    const v = camp.epilogueVariants.find((x) => flags[x.flag]);
    return v ? `ending.${camp.id}.${v.flag}` : null;
  }
  return `ending.${camp.id}.epilogue`;
}

