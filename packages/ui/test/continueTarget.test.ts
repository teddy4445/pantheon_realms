/**
 * Continue (campaign expansion 2026-10-15): a campaign's practice replay never
 * stands in for the run it was started from.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import type { SaveRepository, StoredSave } from '@pr/platform';
import { GameSession } from '@pr/session';
import { SaveManager } from '../src/app/saves';

const catalog = loadCatalog();

function memoryRepo(): SaveRepository {
  const files = new Map<string, string>();
  return {
    kind: 'memory',
    availability: async () => ({ ok: true }),
    list: async (): Promise<StoredSave[]> => [...files].map(([id, text]) => ({ id, text, bytes: text.length })),
    read: async (id) => files.get(id) ?? null,
    write: async (id, text) => void files.set(id, text),
    remove: async (id) => void files.delete(id),
    exportSave: async () => false,
    importSave: async () => null,
  };
}

describe('Continue target', () => {
  it('resumes the primary run, not a newer practice replay; a practice save only when it is the only one', async () => {
    const saves = new SaveManager(catalog, memoryRepo());
    const run = GameSession.newCampaign(catalog, 'winter_oath', null, 'run-continue');
    const primary = await saves.write('manual-1', 'manual', 'The run', run.snapshot());
    // A practice replay of the opening chapter, saved later.
    const practice = GameSession.newCampaign(catalog, 'winter_oath', null, 'run-practice');
    const snap = practice.snapshot();
    const practiceSnap = { ...snap, campaign: { ...snap.campaign!, branch: 'practice' as const, campaignRunId: 'run-continue:practice:winter_oath_v2_m01' } };
    await new Promise((r) => setTimeout(r, 5));
    await saves.write('manual-2', 'manual', 'Practice', practiceSnap);
    expect((await saves.list())[0]!.id).toBe('manual-2');
    expect((await saves.continueTarget())?.id).toBe(primary.id);

    const only = new SaveManager(catalog, memoryRepo());
    await only.write('manual-2', 'manual', 'Practice', practiceSnap);
    expect((await only.continueTarget())?.id).toBe('manual-2');
  });
});
