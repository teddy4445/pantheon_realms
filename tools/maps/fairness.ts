/**
 * Seat fairness of an authored skirmish map (development tool; never packaged).
 *
 * A short all-AI test: mirror matches — every seat the same pantheon, the
 * pantheon changing from match to match — so pantheon strength cancels out
 * and what is left is the map and the turn order. A seat scores 1 for a win
 * (or for a day-cap finish at least 25% ahead in armies), and a draw is split
 * between the empires still standing. A fair map gives every seat about 1/N.
 *
 * This file plays the matches; tools/maps/fairnessJudge.mjs scores them and
 * gives the verdict (sequential batches, proposed thresholds 2026-10-07).
 */
import type { ContentCatalog, CustomMapDocument } from '@pr/rules';
import { compileCustomMap } from '@pr/campaign';
import { playGenerated, type RandomResult } from '../balance/lib';

export const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

/** Day cap of a fairness match (the verdict and the batch sizes live in fairnessJudge.mjs). */
export const MAX_DAY = 45;

export interface FairnessJob {
  readonly mapId: string;
  readonly index: number;
}

export interface FairnessMatch extends RandomResult {
  readonly mapId: string;
  readonly index: number;
  readonly pantheonId: string;
}

/** One mirror match: match `index` uses pantheon index % 6 at every seat and its own seed. */
export function playMirror(catalog: ContentCatalog, mapId: string, doc: CustomMapDocument, index: number): FairnessMatch {
  const pantheonId = PANTHEONS[index % PANTHEONS.length]!;
  const mirror: CustomMapDocument = { ...doc, players: doc.players.map((p) => ({ ...p, pantheonId })) };
  const g = compileCustomMap(
    catalog,
    mirror,
    mirror.players.map(() => ({ controller: 'ai' as const })),
    { skirmishMapId: mapId, subtitle: 'Fairness test', unownedTowns: 'none' },
  );
  const r = playGenerated(catalog, g, `fair-${mapId}-${index}`, { pantheon: pantheonId, empires: doc.players.length, seed: index, maxDay: MAX_DAY });
  return { ...r, mapId, index, pantheonId };
}
