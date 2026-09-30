/**
 * ContentValidator suite. A production build rejects content that breaks an
 * owner invariant (logical architecture §32):
 *   - a pantheon without exactly seven tiers, one family each
 *   - a family without exactly one upgrade, or an upgrade pointing onward
 *   - a town without exactly 18 locations (11 support + 7 dwellings)
 *   - references to unknown definitions (buildings, gods, effects, missions)
 */
import {
  CREATURE_TIERS,
  SUPPORT_ROLES,
  type ContentCatalog,
  type EffectDefinition,
  type RequirementDefinition,
} from '@pr/rules';

export interface ValidationIssue {
  readonly validator: string;
  readonly message: string;
}

export interface ValidationReport {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}

type Push = (message: string) => void;

function creatureRosterValidator(c: ContentCatalog, push: Push): void {
  for (const p of Object.values(c.pantheons)) {
    if (p.roster.length !== 7) push(`${p.id}: roster has ${p.roster.length} families, expected exactly 7`);
    for (const tier of CREATURE_TIERS) {
      const at = p.roster.filter((r) => r.tier === tier);
      if (at.length !== 1) push(`${p.id}: tier ${tier} has ${at.length} families, expected exactly 1`);
    }
    for (const r of p.roster) {
      const fam = c.families[r.familyId];
      if (!fam) {
        push(`${p.id}: roster references unknown family ${r.familyId}`);
        continue;
      }
      if (fam.tier !== r.tier) push(`${p.id}: family ${fam.id} is tier ${fam.tier} but listed at tier ${r.tier}`);
      if (fam.pantheonId !== p.id) push(`${p.id}: family ${fam.id} belongs to ${fam.pantheonId}`);
      if (fam.classification !== 'pantheon_roster') push(`${p.id}: family ${fam.id} is not classified as a roster family`);
    }
  }
  // Every roster family is in exactly one pantheon roster.
  for (const fam of Object.values(c.families)) {
    if (fam.classification !== 'pantheon_roster') continue;
    const owners = Object.values(c.pantheons).filter((p) => p.roster.some((r) => r.familyId === fam.id));
    if (owners.length !== 1) push(`family ${fam.id} appears in ${owners.length} pantheon rosters`);
  }
}

function creatureUpgradeValidator(c: ContentCatalog, push: Push): void {
  const incoming = new Map<string, number>();
  for (const fam of Object.values(c.families)) {
    const base = c.creatures[fam.baseCreatureId];
    const up = c.creatures[fam.upgradedCreatureId];
    if (!base) push(`${fam.id}: missing base form ${fam.baseCreatureId}`);
    if (!up) push(`${fam.id}: missing upgraded form ${fam.upgradedCreatureId}`);
    if (!base || !up) continue;
    if (base.id === up.id) push(`${fam.id}: self-upgrade`);
    if (base.form !== 'base') push(`${base.id}: expected form "base"`);
    if (up.form !== 'upgraded') push(`${up.id}: expected form "upgraded"`);
    if (base.upgradeId !== up.id) push(`${base.id}: upgradeId must be ${up.id}`);
    if (up.baseId !== base.id) push(`${up.id}: baseId must be ${base.id}`);
    if (up.upgradeId) push(`${up.id}: an upgraded form cannot upgrade again (third form)`);
    if (base.familyId !== fam.id || up.familyId !== fam.id) push(`${fam.id}: form family IDs mismatch`);
    if (base.tier !== fam.tier || up.tier !== fam.tier) push(`${fam.id}: form tiers mismatch`);
    if (base.pantheonId !== fam.pantheonId || up.pantheonId !== fam.pantheonId) push(`${fam.id}: form pantheons mismatch`);
    if (fam.implementationStatus === 'implemented') {
      if (!base.stats || !up.stats || !base.cost || !up.cost) push(`${fam.id}: implemented family needs stats and costs for both forms`);
      else if (base.stats.footprint !== up.stats.footprint) push(`${fam.id}: base and upgrade footprints differ`);
      if (fam.baseGrowth <= 0) push(`${fam.id}: implemented family needs positive growth`);
    }
    incoming.set(up.id, (incoming.get(up.id) ?? 0) + 1);
  }
  for (const [id, n] of incoming) if (n > 1) push(`${id}: ${n} families upgrade into it`);
  // Every creature belongs to exactly one family as base or upgrade.
  for (const cr of Object.values(c.creatures)) {
    const fam = c.families[cr.familyId];
    if (!fam) push(`${cr.id}: unknown family ${cr.familyId}`);
    else if (fam.baseCreatureId !== cr.id && fam.upgradedCreatureId !== cr.id) push(`${cr.id}: not linked by its family (unpaired or third form)`);
    for (const a of cr.abilityIds) if (!c.abilities[a]) push(`${cr.id}: unknown ability ${a}`);
    if (!c.lore[cr.loreId] && cr.implementationStatus === 'implemented') push(`${cr.id}: missing lore ${cr.loreId}`);
  }
}

function checkRequirement(c: ContentCatalog, r: RequirementDefinition, where: string, push: Push): void {
  switch (r.type) {
    case 'has_building':
    case 'unique_per_player':
      if (!c.buildings[r.buildingId]) push(`${where}: unknown building ${r.buildingId}`);
      break;
    case 'has_god':
      if (!c.gods[r.godId]) push(`${where}: unknown god ${r.godId}`);
      break;
    case 'town_has_covenant':
      if (!c.families[r.familyId]) push(`${where}: unknown family ${r.familyId}`);
      break;
    case 'hero_skill_at_least':
      if (!c.skills[r.skillId]) push(`${where}: unknown skill ${r.skillId}`);
      break;
    case 'has_god_in_group':
    case 'no_god_in_group':
      if (!Object.values(c.gods).some((g) => g.exclusivityGroup === r.group)) push(`${where}: no god uses exclusivity group ${r.group}`);
      break;
    case 'all_of':
    case 'any_of':
      for (const x of r.requirements) checkRequirement(c, x, where, push);
      break;
    default:
      break;
  }
}

function checkEffect(c: ContentCatalog, e: EffectDefinition, where: string, push: Push): void {
  switch (e.type) {
    case 'recruit_access':
      if (!c.creatures[e.creatureId]) push(`${where}: unknown creature ${e.creatureId}`);
      break;
    case 'spell_eligibility':
      if (!c.spells[e.spellId]) push(`${where}: unknown spell ${e.spellId}`);
      break;
    case 'creature_stat': {
      const ruleTypes = new Set(Object.values(c.abilities).map((a) => a.rule.type as string));
      if (e.ability !== undefined && !ruleTypes.has(e.ability)) push(`${where}: creature_stat filters on unknown ability type ${e.ability}`);
      if (e.minTier !== undefined && e.maxTier !== undefined && e.minTier > e.maxTier) push(`${where}: creature_stat tier range is empty`);
      break;
    }
    case 'wounded_fury':
      if (e.denominator <= 0 || e.numerator <= 0 || e.numerator > e.denominator) push(`${where}: wounded_fury threshold must be in (0, 1]`);
      break;
    case 'casualty_recovery':
      if (e.percent <= 0 || e.percent > 100) push(`${where}: casualty_recovery percent must be 1-100`);
      break;
    case 'army_harmony':
      if (e.families < 1 || e.families > 7) push(`${where}: army_harmony needs 1-7 families`);
      break;
    case 'offering':
      if (e.goldPerFavor <= 0 || e.maxFavorPerWeek <= 0) push(`${where}: offering needs positive terms`);
      break;
    case 'enables_hero_training':
      if (e.xp <= 0 || e.gold < 0) push(`${where}: training needs positive experience`);
      break;
    case 'enables_artifact_merchant':
      if (e.stockSize <= 0) push(`${where}: merchant needs a positive stock size`);
      if (!Object.values(c.artifacts).some((a) => a.merchantPrice && !a.unique)) push(`${where}: no artifact has a merchant price`);
      break;
    default:
      break;
  }
}

function townLayoutValidator(c: ContentCatalog, push: Push): void {
  for (const t of Object.values(c.townArchetypes)) {
    if (t.slots.length !== 18) push(`${t.id}: has ${t.slots.length} locations, expected 18`);
    const support = t.slots.filter((s) => s.kind === 'support');
    const dwellings = t.slots.filter((s) => s.kind === 'dwelling');
    if (support.length !== 11) push(`${t.id}: has ${support.length} support locations, expected 11`);
    if (dwellings.length !== 7) push(`${t.id}: has ${dwellings.length} dwelling locations, expected 7`);
    for (const role of SUPPORT_ROLES) {
      const n = support.filter((s) => s.role === role).length;
      if (n !== 1) push(`${t.id}: support role ${role} appears ${n} times`);
    }
    const pantheon = c.pantheons[t.pantheonId];
    for (const tier of CREATURE_TIERS) {
      const slots = dwellings.filter((s) => s.tier === tier);
      if (slots.length !== 1) push(`${t.id}: tier ${tier} has ${slots.length} dwelling locations`);
      const slot = slots[0];
      if (!slot) continue;
      if (slot.chain.length !== 2) push(`${t.id}/${slot.id}: dwelling chain must be [base, upgraded]`);
      const [baseId, upId] = slot.chain;
      const base = baseId ? c.buildings[baseId] : undefined;
      const up = upId ? c.buildings[upId] : undefined;
      const rosterFamily = pantheon?.roster.find((r) => r.tier === tier)?.familyId;
      if (base?.dwelling?.form !== 'base') push(`${t.id}/${slot.id}: first level must be the base dwelling`);
      if (up?.dwelling?.form !== 'upgraded') push(`${t.id}/${slot.id}: second level must be the upgraded dwelling`);
      if (base?.dwelling && rosterFamily && base.dwelling.familyId !== rosterFamily) push(`${t.id}/${slot.id}: dwelling family ${base.dwelling.familyId} is not the tier-${tier} roster family ${rosterFamily}`);
      if (up?.dwelling && base?.dwelling && up.dwelling.familyId !== base.dwelling.familyId) push(`${t.id}/${slot.id}: base/upgraded dwelling families differ`);
    }
    for (const slot of t.slots) {
      slot.chain.forEach((id, i) => {
        const b = c.buildings[id];
        if (!b) {
          push(`${t.id}/${slot.id}: unknown building ${id}`);
          return;
        }
        if (b.slotId !== slot.id) push(`${id}: slotId ${b.slotId} does not match location ${slot.id}`);
        if (b.level !== i + 1) push(`${id}: level ${b.level} does not match chain position ${i + 1}`);
      });
      const p = slot.placement;
      if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) push(`${t.id}/${slot.id}: placement outside the composition`);
    }
  }
}

function buildingTreeValidator(c: ContentCatalog, push: Push): void {
  for (const b of Object.values(c.buildings)) {
    for (const r of b.requirements) checkRequirement(c, r, b.id, push);
    for (const e of b.effects) checkEffect(c, e, b.id, push);
    if (b.dwelling && !c.families[b.dwelling.familyId]) push(`${b.id}: unknown dwelling family`);
  }
  // Dependency graph (has_building edges + chain predecessor) must be acyclic.
  const edges = new Map<string, string[]>();
  for (const b of Object.values(c.buildings)) {
    const deps: string[] = [];
    const walk = (r: RequirementDefinition) => {
      if (r.type === 'has_building') deps.push(r.buildingId);
      if (r.type === 'all_of' || r.type === 'any_of') r.requirements.forEach(walk);
    };
    b.requirements.forEach(walk);
    const arch = Object.values(c.townArchetypes).find((t) => t.slots.some((s) => s.id === b.slotId && s.chain.includes(b.id)));
    const slot = arch?.slots.find((s) => s.id === b.slotId);
    if (slot && b.level > 1) {
      const prev = slot.chain[b.level - 2];
      if (prev) deps.push(prev);
    }
    edges.set(b.id, deps);
  }
  const state = new Map<string, 1 | 2>();
  const visit = (id: string, stack: string[]) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      push(`building dependency cycle: ${[...stack, id].join(' -> ')}`);
      return;
    }
    state.set(id, 1);
    for (const d of edges.get(id) ?? []) visit(d, [...stack, id]);
    state.set(id, 2);
  };
  for (const id of edges.keys()) visit(id, []);
}

function pantheonValidator(c: ContentCatalog, push: Push): void {
  for (const p of Object.values(c.pantheons)) {
    if (p.signature) {
      if (p.signature.effects.length === 0 || p.signature.rules.length === 0) push(`${p.id}: signature needs effects and exact rules`);
      for (const e of p.signature.effects) checkEffect(c, e, `${p.id}/signature`, push);
    }
    for (const g of p.godIds) if (!c.gods[g]) push(`${p.id}: unknown god ${g}`);
    for (const h of p.heroIds) if (!c.heroes[h]) push(`${p.id}: unknown hero ${h}`);
    if (p.playability === 'playable') {
      if (!p.townArchetypeId || !c.townArchetypes[p.townArchetypeId]) push(`${p.id}: playable pantheon needs a town archetype`);
      for (const r of p.roster) if (c.families[r.familyId]?.implementationStatus !== 'implemented') push(`${p.id}: playable roster family ${r.familyId} is not implemented`);
    }
  }
}

function godValidator(c: ContentCatalog, push: Push): void {
  for (const g of Object.values(c.gods)) {
    if (!c.pantheons[g.pantheonId]) push(`${g.id}: unknown pantheon ${g.pantheonId}`);
    for (const r of g.requirements) checkRequirement(c, r, g.id, push);
    for (const e of g.benefits) checkEffect(c, e, g.id, push);
    if (g.role === 'undesigned' && g.benefits.length > 0) push(`${g.id}: undesigned gods must not carry mechanics`);
    if (g.benefitSummary.length === 0) push(`${g.id}: needs a benefit summary (even "not yet designed")`);
    if (g.role === 'minor' && g.benefits.length === 0) push(`${g.id}: a minor god needs at least one real blessing`);
    if (g.role === 'minor' && g.benefitSummary.length < g.benefits.filter((e) => e.type !== 'spell_eligibility').length) push(`${g.id}: every blessing needs a summary line`);
  }
}

function artifactValidator(c: ContentCatalog, push: Push): void {
  for (const a of Object.values(c.artifacts)) {
    for (const e of a.effects) checkEffect(c, e, a.id, push);
    if (a.merchantPrice && Object.values(a.merchantPrice).some((v) => (v ?? 0) < 0)) push(`${a.id}: negative merchant price`);
    if (a.merchantPrice && a.unique) push(`${a.id}: unique artifacts are never stocked by merchants`);
  }
}

function heroValidator(c: ContentCatalog, push: Push): void {
  for (const h of Object.values(c.heroes)) {
    if (!c.heroClasses[h.classId]) push(`${h.id}: unknown class ${h.classId}`);
  }
  for (const cl of Object.values(c.heroClasses)) {
    for (const s of cl.startingSkills) if (!c.skills[s.skillId]) push(`${cl.id}: unknown skill ${s.skillId}`);
  }
}

function campaignValidator(c: ContentCatalog, push: Push): void {
  for (const camp of Object.values(c.campaigns)) {
    if (camp.status !== 'playable') continue;
    if (camp.missionIds.length !== 3 && camp.id === 'three_beacons') push(`${camp.id}: The Three Beacons must have exactly 3 missions`);
    for (const g of camp.startingGodOptions) if (!c.gods[g]) push(`${camp.id}: unknown starting god ${g}`);
    for (const m of camp.missionIds) if (!c.missions[m]) push(`${camp.id}: unknown mission ${m}`);
  }
  for (const m of Object.values(c.missions)) {
    const where = m.id;
    if (!c.mapTemplates[m.mapTemplateId]) push(`${where}: unknown map template`);
    const template = c.mapTemplates[m.mapTemplateId];
    const creatureOk = (id: string) => {
      const cr = c.creatures[id];
      if (!cr) push(`${where}: unknown creature ${id}`);
      else if (cr.implementationStatus !== 'implemented') push(`${where}: creature ${id} is not implemented`);
    };
    m.player.hero.army.forEach((s) => creatureOk(s.creatureId));
    for (const b of m.player.town.buildings) if (!c.buildings[b]) push(`${where}: unknown starting building ${b}`);
    for (const b of m.purchasableBuildingIds ?? []) if (!c.buildings[b]) push(`${where}: unknown purchasable building ${b}`);
    for (const g of m.committableGodIds ?? []) if (!c.gods[g]) push(`${where}: unknown committable god ${g}`);
    const siteIds = new Set(m.sites.map((s) => s.id));
    const objIds = new Set(m.objectives.map((o) => o.id));
    for (const s of m.sites) {
      if (template && !template.anchors.some((a) => a.id === s.anchorId && a.coord.q === s.coord.q && a.coord.r === s.coord.r)) {
        push(`${where}: site ${s.id} does not match a template anchor`);
      }
      s.guard?.army.forEach((a) => creatureOk(a.creatureId));
      for (const a of s.guard?.reward.artifactIds ?? []) if (!c.artifacts[a]) push(`${where}: unknown artifact ${a}`);
      for (const e of s.guard?.reward.entitlementIds ?? []) if (!c.entitlements[e]) push(`${where}: unknown entitlement ${e}`);
      if (s.kind.type === 'watchtower') for (const r of s.kind.revealSiteIds) if (!siteIds.has(r)) push(`${where}: watchtower reveals unknown site ${r}`);
      if (s.kind.type === 'activation') for (const r of s.kind.requirements) {
        checkRequirement(c, r, `${where}/${s.id}`, push);
        if (r.type === 'objective_completed' && !objIds.has(r.objectiveId)) push(`${where}/${s.id}: unknown objective ${r.objectiveId}`);
      }
    }
    for (const o of m.objectives) {
      for (const u of o.unlocks ?? []) if (!objIds.has(u)) push(`${where}/${o.id}: unlocks unknown objective ${u}`);
      if (o.markerSiteId && !siteIds.has(o.markerSiteId)) push(`${where}/${o.id}: unknown marker site`);
      for (const e of o.reward?.entitlementIds ?? []) if (!c.entitlements[e]) push(`${where}/${o.id}: unknown entitlement ${e}`);
    }
    m.hostileHeroes.forEach((h) => h.army.forEach((a) => creatureOk(a.creatureId)));
  }
}

function assetReferenceValidator(c: ContentCatalog, push: Push): void {
  const seen = new Set<string>();
  for (const cr of Object.values(c.creatures)) {
    for (const a of [cr.presentation.portraitAssetId, cr.presentation.modelAssetId]) {
      if (!a) push(`${cr.id}: empty asset ID`);
      if (seen.has(a)) push(`${cr.id}: duplicate asset ID ${a} (base and upgraded need distinct assets)`);
      seen.add(a);
    }
  }
}

export const VALIDATORS: Readonly<Record<string, (c: ContentCatalog, push: Push) => void>> = {
  CreatureRosterValidator: creatureRosterValidator,
  CreatureUpgradeValidator: creatureUpgradeValidator,
  TownLayoutValidator: townLayoutValidator,
  BuildingTreeValidator: buildingTreeValidator,
  PantheonValidator: pantheonValidator,
  GodValidator: godValidator,
  HeroValidator: heroValidator,
  ArtifactValidator: artifactValidator,
  CampaignValidator: campaignValidator,
  AssetReferenceValidator: assetReferenceValidator,
};

export function validateCatalog(c: ContentCatalog): ValidationReport {
  const issues: ValidationIssue[] = [];
  for (const [name, fn] of Object.entries(VALIDATORS)) fn(c, (message) => issues.push({ validator: name, message }));
  return { ok: issues.length === 0, issues };
}
