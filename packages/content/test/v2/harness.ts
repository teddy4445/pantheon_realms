/**
 * A catalog with one content-v2 campaign under construction added to the shipped
 * one (campaign expansion, 2026-10-15): lets a campaign be built and tested on its
 * own before it is registered in packages/content/src/campaign/v2/index.ts.
 */
import { loadCatalog, validateCatalog } from '@pr/content';
import type { ContentCatalog } from '@pr/rules';
import type { V2Campaign } from '../../src/campaign/v2/kit';
import type { V2Built } from '../../src/campaign/v2/index';

export function catalogWith(campaignId: string, pantheonId: string, build: (camp: V2Campaign) => V2Built): { catalog: ContentCatalog; built: V2Built; issues: string[] } {
  const base = loadCatalog();
  const camp: V2Campaign = {
    id: campaignId,
    pantheonId,
    names: (id) => base.creatures[id],
    v1: (missionId) => {
      const m = base.missions[missionId];
      if (!m || m.contentVersion === 2) throw new Error(`unknown legacy mission ${missionId}`);
      return m;
    },
  };
  const built = build(camp);
  const required = new Set(built.chapters.flatMap((c) => c.requiresAll));
  const finals = built.chapters.filter((c) => !required.has(c.missionId));
  const missions = { ...base.missions };
  for (const m of built.missions) missions[m.id] = m;
  const original = base.campaigns[campaignId]!;
  const catalog: ContentCatalog = {
    ...base,
    missions,
    campaigns: {
      ...base.campaigns,
      [campaignId]: { ...original, chapters: built.chapters, finalChapterId: finals[0]?.missionId, ...(built.epilogue ? { epilogueV2: built.epilogue } : {}) },
    },
  };
  const report = validateCatalog(catalog);
  return { catalog, built, issues: report.issues.map((i) => `[${i.validator}] ${i.message}`) };
}
