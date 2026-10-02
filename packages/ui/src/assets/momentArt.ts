/**
 * Big-moment art lookups (GPT6_BRIEF_3, delivery 2026-10-02; ASSET_PIPELINE.md
 * §13) — presentation only. Asset IDs follow the brief's naming from content
 * IDs (intervention, pantheon, weekly event); nothing here names a miracle,
 * pantheon or event, and nothing changes play. A missing picture returns null
 * and the caller keeps the game's earlier presentation.
 */
import { resolveArt, type StoryArtRecord } from './manifest';

/** The large painted card of a divine intervention (`intervention.<id>.card`), not its 96 px icon. */
export function miracleCardArt(interventionId: string): StoryArtRecord | null {
  return resolveArt(`intervention.${interventionId}.card`);
}

/** The victory or defeat painting of the player's pantheon (`splash.<pantheon>.victory|defeat`). */
export function resultSplashArt(pantheonId: string | null | undefined, won: boolean): StoryArtRecord | null {
  return pantheonId ? resolveArt(`splash.${pantheonId}.${won ? 'victory' : 'defeat'}`) : null;
}

/** The level-up banner of a hero's pantheon (`banner.level_up.<pantheon>`). */
export function levelUpBannerArt(pantheonId: string | null | undefined): StoryArtRecord | null {
  return pantheonId ? resolveArt(`banner.level_up.${pantheonId}`) : null;
}

/**
 * The new-week banner: exactly one picture — the weekly event's own variant
 * (`banner.week.<event>`) when there is an event and it has one, otherwise the
 * default `banner.new_week`.
 */
export function newWeekBannerArt(eventId: string | null | undefined): StoryArtRecord | null {
  return (eventId ? resolveArt(`banner.week.${eventId}`) : null) ?? resolveArt('banner.new_week');
}
