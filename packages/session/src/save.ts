/**
 * SaveSnapshot / SaveEnvelope: versioned plain-data persistence of the
 * authoritative state (production/01 §9).
 *
 * Saves contain MatchState (including the generated logical map, fog, quests,
 * divine progression, RNG states and pending decisions) plus CampaignState.
 * They never contain renderer objects (sprites, textures), React objects or native handles.
 * Loading never regenerates a map; the stored logical map is authoritative.
 */
import { canonicalJson, hashString, type ContentCatalog, type MatchState, type VersionBundle, scenarioMission } from '@pr/rules';
import { contentVersionOf, runMissionIds, type CampaignState } from '@pr/campaign';
import type { SessionPresentation } from './journeys';

export const SAVE_SCHEMA = 'pantheon-realms-save';
export const SAVE_SCHEMA_VERSION = 1;

export type SaveKind = 'manual' | 'auto' | 'checkpoint';

export interface SaveMetadata {
  readonly scenarioName: string;
  readonly missionName: string;
  readonly campaignName: string | null;
  readonly branch: 'primary' | 'practice' | 'skirmish';
  readonly pantheonName: string;
  readonly heroName: string;
  readonly heroLevel: number;
  readonly day: number;
  readonly week: number;
  readonly dayOfWeek: number;
  readonly rulesVersion: string;
  readonly contentVersion: string;
  /**
   * Campaign content version of the run (1: the legacy missions, 2: the chapter graph of
   * the 2026-10-15 expansion); absent for skirmishes and in saves written before it.
   */
  readonly campaignContentVersion?: 1 | 2;
  /** The run's current chapter (v2) or mission (v1) number, 1-based; absent outside campaigns. */
  readonly chapterNumber?: number;
}

export interface SaveSnapshot {
  readonly match: MatchState;
  readonly campaign: CampaignState | null;
  /**
   * Optional, versioned presentation intent saved with the match (2026-10-14: each
   * hero's planned journey). Absent in older saves and when there is none; never part
   * of the rules. See journeys.ts.
   */
  readonly presentation?: SessionPresentation;
}

export interface SaveEnvelope {
  readonly schema: typeof SAVE_SCHEMA;
  readonly saveSchemaVersion: number;
  readonly id: string;
  readonly kind: SaveKind;
  readonly name: string;
  /** Wall-clock timestamp for display only; excluded from the checksum. */
  readonly savedAt: string;
  readonly versions: VersionBundle;
  readonly metadata: SaveMetadata;
  readonly checksum: string;
  readonly snapshot: SaveSnapshot;
}

export function snapshotChecksum(snapshot: SaveSnapshot): string {
  return hashString(canonicalJson(snapshot));
}

export function buildMetadata(catalog: ContentCatalog, snapshot: SaveSnapshot): SaveMetadata {
  const m = snapshot.match;
  const mission = scenarioMission(catalog, m);
  const humanId = m.playerOrder.find((p) => m.players[p]?.controller === 'human') ?? m.playerOrder[0]!;
  const player = m.players[humanId];
  const hero = Object.values(m.heroes).find((h) => h.ownerId === humanId);
  const campaign = snapshot.campaign ? catalog.campaigns[snapshot.campaign.campaignId] : undefined;
  const run = snapshot.campaign && campaign ? snapshot.campaign : null;
  const chapterIndex = run ? runMissionIds(catalog, run).indexOf(run.currentMissionId) : -1;
  return {
    scenarioName: m.scenario.name,
    missionName: mission?.name ?? m.scenario.name,
    campaignName: campaign?.name ?? null,
    branch: snapshot.campaign ? snapshot.campaign.branch : 'skirmish',
    pantheonName: player ? (catalog.pantheons[player.pantheonId]?.name ?? player.pantheonId) : '',
    heroName: hero?.name ?? '',
    heroLevel: hero?.level ?? 0,
    day: m.day,
    week: 1 + Math.floor((m.day - 1) / 7),
    dayOfWeek: 1 + ((m.day - 1) % 7),
    rulesVersion: m.versions.rulesVersion,
    contentVersion: m.versions.contentVersion,
    ...(run ? { campaignContentVersion: contentVersionOf(run) } : {}),
    ...(chapterIndex >= 0 ? { chapterNumber: chapterIndex + 1 } : {}),
  };
}

export function createEnvelope(
  catalog: ContentCatalog,
  snapshot: SaveSnapshot,
  opts: { id: string; kind: SaveKind; name: string; savedAt: string },
): SaveEnvelope {
  return {
    schema: SAVE_SCHEMA,
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    id: opts.id,
    kind: opts.kind,
    name: opts.name,
    savedAt: opts.savedAt,
    versions: catalog.versions,
    metadata: buildMetadata(catalog, snapshot),
    checksum: snapshotChecksum(snapshot),
    snapshot,
  };
}

export type SaveCompatibility =
  | { readonly status: 'ok' }
  | { readonly status: 'corrupt'; readonly reason: string }
  | { readonly status: 'incompatible'; readonly reason: string };

/** Validate an untrusted parsed save. Never guesses a migration. */
export function checkEnvelope(catalog: ContentCatalog, raw: unknown): SaveCompatibility {
  if (!raw || typeof raw !== 'object') return { status: 'corrupt', reason: 'Not a save file' };
  const e = raw as Partial<SaveEnvelope>;
  if (e.schema !== SAVE_SCHEMA) return { status: 'corrupt', reason: 'Unknown file format' };
  if (e.saveSchemaVersion !== SAVE_SCHEMA_VERSION) {
    return { status: 'incompatible', reason: `Save schema ${String(e.saveSchemaVersion)} is not supported by this build` };
  }
  if (!e.snapshot || !e.snapshot.match || e.snapshot.match.kind !== 'match') return { status: 'corrupt', reason: 'Missing match state' };
  if (!e.checksum || snapshotChecksum(e.snapshot) !== e.checksum) return { status: 'corrupt', reason: 'Checksum mismatch — the file is damaged' };
  const v = e.versions;
  if (!v || v.rulesVersion !== catalog.versions.rulesVersion) {
    return { status: 'incompatible', reason: `Saved with rules ${v?.rulesVersion ?? 'unknown'}; this build uses ${catalog.versions.rulesVersion}` };
  }
  if (v.contentVersion !== catalog.versions.contentVersion) {
    return { status: 'incompatible', reason: `Saved with content ${v.contentVersion}; this build uses ${catalog.versions.contentVersion}` };
  }
  if (!scenarioMission(catalog, e.snapshot.match)) return { status: 'incompatible', reason: 'The saved scenario is not part of this build' };
  return { status: 'ok' };
}

export function parseEnvelope(catalog: ContentCatalog, text: string): { envelope: SaveEnvelope | null; compatibility: SaveCompatibility } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { envelope: null, compatibility: { status: 'corrupt', reason: 'The file is not valid JSON' } };
  }
  const compatibility = checkEnvelope(catalog, raw);
  return { envelope: compatibility.status === 'ok' ? (raw as SaveEnvelope) : (raw as SaveEnvelope | null), compatibility };
}

export function serializeEnvelope(e: SaveEnvelope): string {
  return JSON.stringify(e);
}
