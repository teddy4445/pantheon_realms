/**
 * Army counts written into mission texts (proposed 2026-10-07, with the
 * campaign difficulty levels). An objective such as "Defeat 14 Draugar at the
 * Rune Stone" is authored as `Defeat {army:norse_draugr=14} at the Rune Stone`;
 * the text is shown through `missionText`, which writes the counts the match
 * actually started with — the written numbers scaled by the campaign level's
 * `guardPercent`, stack by stack, exactly as the mission factory scales the
 * guards and hostile armies. Presentation text only: nothing here changes play.
 */
import type { ContentCatalog } from '../definitions/catalog';
import type { MatchState } from '../state/match';

/**
 * One stack's creatures at `percent` of the written count, never below 1. A
 * half rounds the level's way — down on an easier level, up on a harder one —
 * so small stacks still feel the level (two wardens at 75% become one).
 */
export function scaleStackCount(count: number, percent: number): number {
  if (percent === 100) return count;
  const x = (count * percent) / 100;
  const n = percent < 100 ? Math.ceil(x - 0.5) : Math.floor(x + 0.5);
  return Math.max(1, n);
}

/** An army as a mission-text token: `{army:id=count,id=count}` (stacks in order, repeats allowed). */
export function armyToken(army: readonly { readonly creatureId: string; readonly count: number }[]): string {
  return `{army:${army.map((s) => `${s.creatureId}=${s.count}`).join(',')}}`;
}

/** The share of the written guard numbers this match uses (100 outside campaign levels). */
export function guardPercentOf(catalog: ContentCatalog, state: Pick<MatchState, 'scenario'> | null): number {
  const id = state?.scenario.difficultyId;
  return (id ? catalog.difficulties?.[id]?.guardPercent : undefined) ?? 100;
}

const TOKEN = /\{army:([a-z0-9_]+=\d+(?:,[a-z0-9_]+=\d+)*)\}/g;

/** "14 Draugar", "16 Draugar and 6 Deathless Draugar", "30 X, 3 Y and 2 Z". */
function armyWords(catalog: ContentCatalog, spec: string, percent: number): string {
  const merged = new Map<string, number>();
  for (const part of spec.split(',')) {
    const [id, n] = part.split('=') as [string, string];
    merged.set(id, (merged.get(id) ?? 0) + scaleStackCount(Number(n), percent));
  }
  const words = [...merged].map(([id, n]) => {
    const def = catalog.creatures[id];
    return `${n} ${def ? (n === 1 ? def.name : def.pluralName) : id}`;
  });
  return words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** A mission text (objective, hint, summary) with its army tokens written out for this match. */
export function missionText(catalog: ContentCatalog, state: Pick<MatchState, 'scenario'> | null, text: string): string {
  if (!text.includes('{army:')) return text;
  const percent = guardPercentOf(catalog, state);
  return text.replace(TOKEN, (_, spec: string) => armyWords(catalog, spec, percent));
}
