/**
 * Battle impacts that land (presentation only, 2026-10-16): when a stack's count badge changes
 * during playback, and how long a killing blow holds the playback (hit-stop) and flashes. Pure
 * values and rules, no PixiJS; the battle view (`battle.ts`) applies them. Nothing here reads
 * hidden information, draws a random number or changes an outcome: instant playback and a skip
 * end with the same badges as the view says.
 */

/** A count badge as drawn: its text, colour and whether it shows. */
export interface BadgeShown {
  readonly label: string;
  readonly color: string;
  readonly visible: boolean;
}

/** What the newest view says about a stack's badge. */
export interface BadgeView {
  readonly label: string;
  readonly labelColor: string;
  readonly alive: boolean;
}

/**
 * The moment a badge may change:
 *  - `view`: a newer view arrived (the rules have already applied the batch being played);
 *  - `blow`: the stack takes its blow, or a heal or status lands on it (its words are shown);
 *  - `release`: the playback holding the stack is over (also instant playback and a skip);
 *  - `death`: the stack falls (the fallen show no count).
 */
export type BadgeMoment = 'view' | 'blow' | 'release' | 'death';

/**
 * The badge to draw at `moment`. A stack held for playback keeps the badge it shows when a newer
 * view arrives, so its count never drops before the blow lands; the blow shows the view's count
 * (a blow that destroys the stack takes its badge away at once, with the words "N slain"); the release shows exactly
 * what the view says. A stack hit twice in one batch shows the batch's final count at its first
 * blow (the view is the batch's end; accepted).
 */
export function nextBadge(shown: BadgeShown, view: BadgeView, moment: BadgeMoment, held: boolean): BadgeShown {
  switch (moment) {
    case 'view':
      return held ? shown : { label: view.label, color: view.labelColor, visible: view.alive };
    case 'blow':
      return { label: view.label, color: view.labelColor, visible: view.alive && shown.visible };
    case 'release':
      return { label: view.label, color: view.labelColor, visible: view.alive };
    case 'death':
      return { ...shown, visible: false };
  }
}

/**
 * Hit-stop on a blow that kills creatures: the whole playback holds this long (nominal ms; scaled
 * by the battle speed, nothing at instant speed). Proposed values (2026-10-16); tune in play.
 */
export const HIT_STOP_KILL_MS = 60;
/** …and this long when the blow destroys the stack. Proposed; tune in play. */
export const HIT_STOP_DESTROY_MS = 100;

/** The hit-stop for a blow that killed `killed` creatures and left `targetRemaining` (0: none). */
export function hitStopMs(killed: number, targetRemaining: number): number {
  if (!(killed > 0)) return 0;
  return targetRemaining <= 0 ? HIT_STOP_DESTROY_MS : HIT_STOP_KILL_MS;
}

/**
 * The light flash at the contact point of a killing blow (the effect painter's soft flash; never a
 * screen filter or a camera move): warm white, a little larger when the stack is destroyed.
 * Proposed; tune in play.
 */
export const KILL_FLASH = { color: 0xfff1cf, size: 0.7, destroyedSize: 1, ms: 260 } as const;

/** Whether a killing blow flashes: not on Low graphics, not with reduced motion. */
export function killFlashShown(killed: number, quality: 'low' | 'medium' | 'high', calm: boolean): boolean {
  return killed > 0 && quality !== 'low' && !calm;
}
