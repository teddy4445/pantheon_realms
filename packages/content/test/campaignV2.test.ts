/**
 * Campaign content v2 (campaign expansion handoff, 2026-10-15) on the shipped
 * catalog: the chapter graphs carry every legacy chapter exactly once; every
 * chapter is an authored region map whose objective sites are reachable and
 * whose principal objective has two independent approaches (checks.ts).
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { checkV2Missions } from './v2/checks';

const catalog = loadCatalog();
const v2Missions = Object.values(catalog.missions).filter((m) => m.contentVersion === 2);
const v2Campaigns = Object.values(catalog.campaigns).filter((c) => c.chapters?.length);

describe('campaign content v2', () => {
  it('chapter graphs carry every legacy chapter exactly once', () => {
    expect(v2Campaigns.length).toBeGreaterThan(0);
    for (const camp of v2Campaigns) {
      const carried = camp.chapters!.flatMap((c) => c.legacyMissionIds).sort();
      expect(carried, camp.id).toEqual([...camp.missionIds].sort());
      expect(camp.epilogueV2, `${camp.id}: v2 epilogue`).toBeDefined();
    }
    const chapters = v2Campaigns.reduce((n, c) => n + c.chapters!.length, 0);
    expect(chapters).toBe(51);
  });

  it('every chapter is an authored region map with reachable objectives and two approaches to its principal objective', () => {
    // Confluence uses mandatory voyages, validated separately by confluenceWorld and confluenceAcceptance.
    checkV2Missions(catalog, v2Missions.filter((m)=>!catalog.campaigns[m.campaignId!]?.regionalWorldId));
  });
});
