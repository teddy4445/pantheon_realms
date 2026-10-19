/**
 * City dedications (app 1.5.0): the content tables equal the delivered design JSON
 * (docs/divine-city-benefits-v1/design/, read here with node fs — the game itself never
 * reads it), and the town-role bindings resolve in all six town archetypes.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CITY_SERVICE_IDS, SUPPORT_ROLES, godBenefitsForMode, type ContentCatalog } from '@pr/rules';
import { buildCatalog, validateCatalog } from '../src';
import { CITY_DEDICATION_TUNING } from '../src/common/cityDedications';

const root = resolve(import.meta.dirname, '../../..');
const design = (file: string) => JSON.parse(readFileSync(resolve(root, 'docs/divine-city-benefits-v1/design', file), 'utf8'));

interface DesignProfile {
  godId: string;
  pantheonId: string;
  weeklyResource: Record<string, number>;
  favoredFamilyId: string;
  tier: number;
  baseCreatureId: string;
  upgradedCreatureId: string;
  weeklyGrowthQuarters: number;
  serviceId: string;
}

const catalog: ContentCatalog = buildCatalog();
const profilesJson = design('god-city-profiles.json') as { profiles: DesignProfile[] };
const rulesJson = design('service-rules.json') as Record<string, Record<string, unknown>>;
const policyJson = design('feature-policy.json') as { requiredTempleLevel: number; firstDedicationCost: Record<string, number>; switchCost: Record<string, number>; growthQuarters: Record<string, number> };
const bindingsJson = design('town-role-bindings.json') as Record<string, { archetypeId: string; roles: Record<string, { slotId: string; buildingIds: string[] }> }>;
const legacyJson = design('legacy-benefit-replacement.json') as { godId: string; suppressedDirectGodBenefitsWhenFeatureEnabled: unknown[]; retainedDirectGodBenefits: unknown[] }[];

describe('city dedication content equals the delivered design', () => {
  it('exactly 60 profiles, one per god, each equal to its JSON row', () => {
    const profiles = catalog.cityDedicationProfiles!;
    expect(profilesJson.profiles).toHaveLength(60);
    expect(Object.keys(profiles)).toHaveLength(60);
    expect(Object.keys(catalog.gods).sort()).toEqual(Object.keys(profiles).sort());
    for (const row of profilesJson.profiles) {
      expect(profiles[row.godId], row.godId).toEqual({
        godId: row.godId,
        // The delivered row, or its recorded tuning (owner decision 2026-10-17).
        weeklyResource: CITY_DEDICATION_TUNING[row.godId] ? CITY_DEDICATION_TUNING[row.godId]!.tuned : row.weeklyResource,
        favoredFamilyId: row.favoredFamilyId,
        weeklyGrowthQuarters: row.weeklyGrowthQuarters,
        serviceId: row.serviceId,
      });
      // The row's own facts match the live catalog (god pantheon, family tier and forms).
      const fam = catalog.families[row.favoredFamilyId]!;
      expect(catalog.gods[row.godId]!.pantheonId, row.godId).toBe(row.pantheonId);
      expect(fam.pantheonId, row.godId).toBe(row.pantheonId);
      expect(fam.tier, row.godId).toBe(row.tier);
      expect([fam.baseCreatureId, fam.upgradedCreatureId], row.godId).toEqual([row.baseCreatureId, row.upgradedCreatureId]);
      expect(row.weeklyGrowthQuarters, row.godId).toBe(policyJson.growthQuarters[String(row.tier)]);
    }
  });

  it('only the recorded tuning differs from the delivery', () => {
    expect(Object.keys(CITY_DEDICATION_TUNING).sort()).toEqual(['japanese_inari', 'norse_njord']);
    for (const [godId, t] of Object.entries(CITY_DEDICATION_TUNING)) {
      expect(profilesJson.profiles.find((r) => r.godId === godId)!.weeklyResource, godId).toEqual(t.delivered);
      expect(catalog.cityDedicationProfiles![godId]!.weeklyResource, godId).toEqual(t.tuned);
    }
  });

  it('the eleven service rules equal service-rules.json', () => {
    const rules = catalog.cityServiceRules!;
    expect(Object.keys(rulesJson).sort()).toEqual([...CITY_SERVICE_IDS].sort());
    for (const [id, r] of Object.entries(rulesJson)) expect(rules[id as keyof typeof rules], id).toEqual({ id, ...r });
  });

  it('the policy equals feature-policy.json', () => {
    const p = catalog.cityDedicationPolicy!;
    expect(p.id).toBe('cityDedicationsV1');
    expect(p.requiredTempleLevel).toBe(policyJson.requiredTempleLevel);
    expect(p.firstDedicationCost).toEqual(policyJson.firstDedicationCost);
    expect(p.switchCost).toEqual(policyJson.switchCost);
    expect([...p.suppressedGodEffectTypes].sort()).toEqual(['daily_income', 'weekly_growth_bonus']);
  });

  it('passes every validator (incl. CityDedicationValidator)', () => {
    expect(validateCatalog(catalog).issues).toEqual([]);
  });

  it('the validator catches a broken profile, a wrong growth rate and a missing summary', () => {
    const broken: ContentCatalog = {
      ...catalog,
      cityDedicationProfiles: {
        ...catalog.cityDedicationProfiles!,
        zeus: { ...catalog.cityDedicationProfiles!['zeus']!, weeklyGrowthQuarters: 4 },
        athena: { ...catalog.cityDedicationProfiles!['athena']!, favoredFamilyId: 'norse_draugr' },
      },
      cityModeGodSummaries: { ...catalog.cityModeGodSummaries!, hermes: undefined as never },
    };
    const issues = validateCatalog(broken).issues.filter((i) => i.validator === 'CityDedicationValidator').map((i) => i.message);
    expect(issues.some((m) => m.includes('zeus') && m.includes('quarters'))).toBe(true);
    expect(issues.some((m) => m.includes('athena') && m.includes('pantheon'))).toBe(true);
    expect(issues.some((m) => m.includes('hermes') && m.includes('summary'))).toBe(true);
  });
});

describe('town-role bindings resolve in all six archetypes', () => {
  it('every role of town-role-bindings.json is that archetype’s support location with exactly those buildings', () => {
    expect(Object.keys(bindingsJson).sort()).toEqual(['celtic', 'egyptian', 'greek', 'japanese', 'mesoamerican', 'norse']);
    for (const [pantheonId, b] of Object.entries(bindingsJson)) {
      const pantheon = catalog.pantheons[pantheonId]!;
      expect(pantheon.townArchetypeId, pantheonId).toBe(b.archetypeId);
      const arch = catalog.townArchetypes[b.archetypeId]!;
      expect(Object.keys(b.roles).sort(), pantheonId).toEqual([...SUPPORT_ROLES].sort());
      for (const [role, binding] of Object.entries(b.roles)) {
        const slot = arch.slots.find((s) => s.kind === 'support' && s.role === role);
        expect(slot?.id, `${pantheonId}/${role}`).toBe(binding.slotId);
        expect([...slot!.chain], `${pantheonId}/${role}`).toEqual(binding.buildingIds);
      }
    }
  });

  it('every service rule role exists as a support location in all six archetypes; Temple II everywhere', () => {
    for (const r of Object.values(catalog.cityServiceRules!)) {
      for (const role of [r.requiredRole, ...(r.requiredRolesAny ?? []), r.targetRole]) {
        if (!role || role === 'favored_dwelling' || role === 'favored_upgraded_dwelling') continue;
        for (const b of Object.values(bindingsJson)) expect(b.roles[role], `${r.id}: ${role} in ${b.archetypeId}`).toBeDefined();
      }
    }
    for (const b of Object.values(bindingsJson)) expect(b.roles['pantheon_temple']!.buildingIds.length).toBeGreaterThanOrEqual(policyJson.requiredTempleLevel);
  });

  it('every favored family has a base and upgraded dwelling in its pantheon’s town (by dwelling metadata)', () => {
    for (const p of Object.values(catalog.cityDedicationProfiles!)) {
      const fam = catalog.families[p.favoredFamilyId]!;
      const archId = catalog.pantheons[fam.pantheonId as string]!.townArchetypeId as string;
      const arch = catalog.townArchetypes[archId]!;
      const slot = arch.slots.find((s) => s.kind === 'dwelling' && s.chain.some((id) => catalog.buildings[id]?.dwelling?.familyId === fam.id))!;
      expect(slot, p.godId).toBeDefined();
      expect(slot.chain.map((id) => catalog.buildings[id]!.dwelling!.form), p.godId).toEqual(['base', 'upgraded']);
    }
  });
});

describe('legacy god economics replaced in city-dedication mode', () => {
  const AFFECTED = legacyJson.filter((e) => e.suppressedDirectGodBenefitsWhenFeatureEnabled.length > 0);

  it('exactly the twelve gods of legacy-benefit-replacement.json lose exactly the listed benefits and keep the listed ones', () => {
    expect(legacyJson).toHaveLength(60);
    expect(AFFECTED.map((e) => e.godId).sort()).toEqual(
      ['celtic_danu', 'demeter', 'egyptian_hathor', 'egyptian_sobek', 'hera', 'hermes', 'japanese_inari', 'japanese_izanagi', 'mesoamerican_chalchiuhtlicue', 'mesoamerican_tlaloc', 'norse_freyja', 'norse_njord'].sort(),
    );
    for (const e of legacyJson) {
      const mode = godBenefitsForMode(catalog, e.godId, true);
      expect(mode.suppressed, e.godId).toEqual(e.suppressedDirectGodBenefitsWhenFeatureEnabled);
      expect(mode.retained, e.godId).toEqual(e.retainedDirectGodBenefits);
      // Legacy mode: exactly the authored benefits and summary.
      const legacy = godBenefitsForMode(catalog, e.godId, false);
      expect(legacy.retained).toEqual(catalog.gods[e.godId]!.benefits);
      expect(legacy.suppressed).toEqual([]);
      expect(legacy.summary).toEqual(catalog.gods[e.godId]!.benefitSummary);
    }
  });

  it('new-mode summaries are explicit data for all twelve, one line per retained benefit, never a replaced line', () => {
    expect(Object.keys(catalog.cityModeGodSummaries!).sort()).toEqual(AFFECTED.map((e) => e.godId).sort());
    for (const e of AFFECTED) {
      const god = catalog.gods[e.godId]!;
      const mode = godBenefitsForMode(catalog, e.godId, true);
      expect(mode.summary, e.godId).toEqual(catalog.cityModeGodSummaries![e.godId]);
      expect(mode.summary.length, e.godId).toBe(mode.retained.length);
      // Today the authored lines pair one-to-one with the benefits: the explicit lines are exactly the kept ones.
      expect(god.benefitSummary.length).toBe(god.benefits.length);
      const kept = god.benefitSummary.filter((_, i) => !['daily_income', 'weekly_growth_bonus'].includes(god.benefits[i]!.type));
      expect(mode.summary, e.godId).toEqual(kept);
      for (const line of mode.summary) expect(line, e.godId).not.toMatch(/per day while you own a town|weekly growth/);
    }
    // Every other god keeps its summary unchanged in both modes.
    for (const god of Object.values(catalog.gods)) {
      if (AFFECTED.some((e) => e.godId === god.id)) continue;
      expect(godBenefitsForMode(catalog, god.id, true).summary, god.id).toEqual(god.benefitSummary);
    }
  });
});
