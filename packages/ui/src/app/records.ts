/**
 * High scores (proposed this build): the best finished games, kept on this
 * computer in the platform's records store (records.json on desktop,
 * localStorage in the browser) — separate from saves and preferences.
 *
 * Scores come from the rules' matchScore (skirmish) or the sum of the mission
 * scores in the campaign record; this module only stores and sorts them.
 */
import type { PreferencesStore } from '@pr/platform';

export const RECORDS_SCHEMA_VERSION = 1;
const MAX_PER_TABLE = 20;

export type ScoreTable = 'campaign' | 'skirmish';

export interface HighScoreEntry {
  /** Unique per finished match (match or campaign run id + player) so a reload never adds it twice. */
  readonly key: string;
  readonly table: ScoreTable;
  readonly score: number;
  readonly playerName: string;
  readonly pantheonId: string;
  /** Scenario or campaign name. */
  readonly title: string;
  readonly outcome: 'victory' | 'defeat';
  readonly days: number;
  readonly difficultyId: string | null;
  readonly recordedAt: string;
}

interface RecordsFile {
  readonly schemaVersion: number;
  readonly entries: readonly HighScoreEntry[];
}

function sanitize(raw: unknown): HighScoreEntry[] {
  if (!raw || typeof raw !== 'object') return [];
  const entries = (raw as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return [];
  const out: HighScoreEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;
    const r = e as Record<string, unknown>;
    if (typeof r.key !== 'string' || (r.table !== 'campaign' && r.table !== 'skirmish') || typeof r.score !== 'number' || !Number.isFinite(r.score)) continue;
    out.push({
      key: r.key,
      table: r.table,
      score: Math.floor(r.score),
      playerName: typeof r.playerName === 'string' ? r.playerName.slice(0, 40) : 'Player',
      pantheonId: typeof r.pantheonId === 'string' ? r.pantheonId : '',
      title: typeof r.title === 'string' ? r.title.slice(0, 80) : '',
      outcome: r.outcome === 'defeat' ? 'defeat' : 'victory',
      days: typeof r.days === 'number' && Number.isFinite(r.days) ? Math.floor(r.days) : 0,
      difficultyId: typeof r.difficultyId === 'string' ? r.difficultyId : null,
      recordedAt: typeof r.recordedAt === 'string' ? r.recordedAt : '',
    });
  }
  return out;
}

export async function loadHighScores(store: PreferencesStore): Promise<HighScoreEntry[]> {
  try {
    const text = await store.load();
    return text ? sanitize(JSON.parse(text)) : [];
  } catch {
    return [];
  }
}

export function sortTable(entries: readonly HighScoreEntry[], table: ScoreTable): HighScoreEntry[] {
  return entries.filter((e) => e.table === table).sort((a, b) => b.score - a.score || a.days - b.days || a.recordedAt.localeCompare(b.recordedAt));
}

/** Add an entry (ignored when its key is already recorded). Returns the new rank (1-based) or null when it did not place. */
export async function recordHighScore(store: PreferencesStore, entry: HighScoreEntry): Promise<{ rank: number | null; entries: HighScoreEntry[] }> {
  const all = await loadHighScores(store);
  if (all.some((e) => e.key === entry.key)) {
    const table = sortTable(all, entry.table);
    const i = table.findIndex((e) => e.key === entry.key);
    return { rank: i >= 0 ? i + 1 : null, entries: all };
  }
  const next = [...all, entry];
  const kept: HighScoreEntry[] = [];
  for (const t of ['campaign', 'skirmish'] as const) kept.push(...sortTable(next, t).slice(0, MAX_PER_TABLE));
  const file: RecordsFile = { schemaVersion: RECORDS_SCHEMA_VERSION, entries: kept };
  await store.save(JSON.stringify(file));
  const table = sortTable(kept, entry.table);
  const i = table.findIndex((e) => e.key === entry.key);
  return { rank: i >= 0 ? i + 1 : null, entries: kept };
}

export async function clearHighScores(store: PreferencesStore): Promise<void> {
  const file: RecordsFile = { schemaVersion: RECORDS_SCHEMA_VERSION, entries: [] };
  await store.save(JSON.stringify(file));
}
