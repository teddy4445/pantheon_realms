/**
 * The six expansion neutrals are base + one upgrade (battle FX & neutral upgrades
 * delivery, 2026-10-15; supersedes the single-form instruction): each upgraded
 * form carries exactly the delivery's candidate values
 * (docs/battle-fx-neutral-upgrades-v1/design/neutral-upgrades.json — s(attack,
 * defense, hp, [min, max], speed, shots, footprint), gold cost, training gold,
 * portrait ID, abilities), and the families keep their IDs, tier, growth,
 * footprint, body, abilities and weekly site stock.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isSingleForm } from '@pr/rules';
import { NEUTRAL_V2_HABITATS, NEUTRAL_V2_SITE_STOCK, buildCatalog, validateCatalog } from '../src';
import { NEUTRAL_V2_FAMILY_SPECS } from '../src/common/neutralsV2';

interface Delivered {
  readonly id: string;
  readonly baseId: string;
  readonly name: string;
  readonly familyId: string;
  readonly pantheonId: null;
  readonly portraitAssetId: string;
  readonly abilities: readonly string[];
  readonly candidateStats: readonly [number, number, number, readonly [number, number], number, number, 1 | 2];
  readonly candidateCostGold: number;
  readonly candidateTrainingGold: number;
  readonly weeklySiteStock: number;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const design = JSON.parse(readFileSync(path.join(root, 'docs/battle-fx-neutral-upgrades-v1/design/neutral-upgrades.json'), 'utf8')) as { upgrades: Delivered[] };
const catalog = buildCatalog();

describe('the six neutral upgrades (delivery 2026-10-15)', () => {
  it('the catalog still passes every validator', () => {
    expect(validateCatalog(catalog).issues).toEqual([]);
  });

  it('every family of the kit is base + exactly one upgrade, with the delivered values', () => {
    expect(design.upgrades).toHaveLength(6);
    expect(NEUTRAL_V2_FAMILY_SPECS.map((f) => f.familyId).sort()).toEqual(design.upgrades.map((u) => u.familyId).sort());
    for (const u of design.upgrades) {
      const fam = catalog.families[u.familyId]!;
      expect(isSingleForm(fam), u.familyId).toBe(false);
      expect(fam.baseCreatureId).toBe(u.baseId);
      expect(fam.upgradedCreatureId).toBe(u.id);
      expect(fam.pantheonId).toBe(u.pantheonId);
      const base = catalog.creatures[u.baseId]!;
      const up = catalog.creatures[u.id]!;
      expect(up.name).toBe(u.name);
      expect(up.presentation.portraitAssetId).toBe(u.portraitAssetId);
      expect(up.abilityIds).toEqual(u.abilities);
      expect(up.abilityIds).toEqual(base.abilityIds);
      const [attack, defense, hp, [damageMin, damageMax], speed, shots, footprint] = u.candidateStats;
      expect(up.stats).toEqual({ attack, defense, hp, damageMin, damageMax, speed, shots, footprint });
      expect(up.cost).toEqual({ gold: u.candidateCostGold });
      expect(u.candidateCostGold - (base.cost!.gold ?? 0)).toBe(u.candidateTrainingGold);
      // The weekly stock stays the family's (one table entry, keyed by the base/family ID).
      expect(NEUTRAL_V2_SITE_STOCK[u.familyId]).toBe(u.weeklySiteStock);
      expect(fam.baseGrowth).toBe(u.weeklySiteStock);
      // Habitat by family: no entry of the upgrade's own.
      expect(NEUTRAL_V2_HABITATS[u.familyId]).toBeDefined();
      expect(NEUTRAL_V2_HABITATS[u.id]).toBeUndefined();
      // Unchanged family facts.
      expect(up.tier).toBe(base.tier);
      expect(up.role).toBe(base.role);
      expect(up.presentation.bodyProfile).toBe(base.presentation.bodyProfile);
      expect(up.loreId).toBe(base.loreId);
      expect(catalog.lore[up.loreId]!.upgradeLore?.length).toBeGreaterThan(20);
      expect(up.balanceStatus).toBe('proposed_unplaytested');
      // The base forms keep their kit portraits.
      expect(base.presentation.portraitAssetId).toBe(`campaignv2.portrait.${u.baseId}`);
    }
  });
});
