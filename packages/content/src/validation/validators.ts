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
  equipSlotsFor,
  type ArtifactSlot,
  type ContentCatalog,
  type EffectDefinition,
  type MissionDefinition,
  type ObjectiveCondition,
  type RequirementDefinition,
  type RewardDefinition,
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
  // Shooting range (owner decision 2026-10-02): every shooter has one, nobody else does.
  for (const cr of Object.values(c.creatures)) {
    const st = cr.stats;
    if (!st) continue;
    if (st.shots > 0 && (st.range === undefined || !Number.isInteger(st.range) || st.range < 2 || st.range > 20)) push(`${cr.id}: a shooter needs a whole-number range of 2–20 hexes`);
    if (st.shots === 0 && st.range !== undefined) push(`${cr.id}: only shooters have a range`);
  }
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
      if (e.familyId !== undefined && !c.families[e.familyId]) push(`${where}: creature_stat filters on unknown family ${e.familyId}`);
      break;
    }
    case 'spell_power_bonus':
      if (!c.spells[e.spellId]) push(`${where}: unknown spell ${e.spellId}`);
      if (e.amount <= 0) push(`${where}: spell_power_bonus needs a positive amount`);
      break;
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
    case 'enables_workshop': {
      if (e.stockSize <= 0) push(`${where}: workshop needs a positive stock size`);
      const pool = Object.values(c.artifacts).filter((a) => a.merchantPrice && !a.unique && e.rarities.includes(a.rarity ?? 'minor'));
      if (pool.length < e.stockSize) push(`${where}: only ${pool.length} priced items of class ${e.rarities.join('/')} for a stock of ${e.stockSize}`);
      break;
    }
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
  // A creature dwelling never needs a dwelling of a higher tier, directly or through other
  // buildings (owner request 2026-10-05: each dwelling can be built before the more advanced ones).
  const tierOf = (id: string): number | null => {
    const b = c.buildings[id];
    return b?.dwelling ? (c.families[b.dwelling.familyId]?.tier ?? null) : null;
  };
  for (const b of Object.values(c.buildings)) {
    const own = tierOf(b.id);
    if (own === null) continue;
    const seen = new Set<string>();
    const stack = [...(edges.get(b.id) ?? [])];
    while (stack.length) {
      const d = stack.pop()!;
      if (seen.has(d)) continue;
      seen.add(d);
      const t = tierOf(d);
      if (t !== null && t > own) push(`${b.id} (tier ${own}) requires ${d} (tier ${t}): a dwelling must not need a more advanced dwelling`);
      stack.push(...(edges.get(d) ?? []));
    }
  }
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
    const sp = h.specialty;
    if (!sp) continue;
    const where = `${h.id}/specialty`;
    if (!sp.name || !sp.summary) push(`${where}: needs a name and exact rule text`);
    if (sp.effects.length === 0) push(`${where}: needs at least one effect`);
    for (const e of [...sp.effects, ...(sp.growth?.effects ?? [])]) checkEffect(c, e, where, push);
    if (sp.growth && sp.growth.everyLevels < 1) push(`${where}: growth step must be at least one level`);
    if (sp.kind === 'spell') {
      const spell = sp.spellId ? c.spells[sp.spellId] : undefined;
      if (!spell) push(`${where}: spell specialty needs a known spell`);
      else if (!('perPower' in spell.effect)) push(`${where}: ${spell.id} does not grow with Spell Power`);
      if (!c.heroClasses[h.classId]?.startsWithSpellbook) push(`${where}: spell specialties need a spellbook class`);
    }
    if (sp.kind === 'creature' && (!sp.familyId || !c.families[sp.familyId])) push(`${where}: creature specialty needs a known family`);
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
  for (const m of Object.values(c.missions)) validateMission(c, m, push, true);
}

/**
 * Checks one mission definition. Authored missions must also match their
 * template's anchors; generated missions (random maps) are checked the same way
 * minus the anchors (`validateGeneratedMission`).
 */
function validateMission(c: ContentCatalog, m: MissionDefinition, push: Push, checkAnchors: boolean): void {
  const where = m.id;
  if (checkAnchors && !c.mapTemplates[m.mapTemplateId]) push(`${where}: unknown map template`);
  const template = checkAnchors ? c.mapTemplates[m.mapTemplateId] : undefined;
  const creatureOk = (id: string) => {
    const cr = c.creatures[id];
    if (!cr) push(`${where}: unknown creature ${id}`);
    else if (cr.implementationStatus !== 'implemented') push(`${where}: creature ${id} is not implemented`);
  };
  const rewardOk = (r: RewardDefinition | undefined, at: string) => {
    for (const a of r?.artifactIds ?? []) if (!c.artifacts[a]) push(`${at}: unknown artifact ${a}`);
    for (const e of r?.entitlementIds ?? []) if (!c.entitlements[e]) push(`${at}: unknown entitlement ${e}`);
    for (const cr of r?.creatures ?? []) creatureOk(cr.creatureId);
  };
  m.player.hero.army.forEach((s) => creatureOk(s.creatureId));
  for (const b of m.player.town.buildings) if (!c.buildings[b]) push(`${where}: unknown starting building ${b}`);
  m.player.town.garrison?.forEach((g) => creatureOk(g.creatureId));
  for (const b of m.purchasableBuildingIds ?? []) if (!c.buildings[b]) push(`${where}: unknown purchasable building ${b}`);
  for (const g of m.committableGodIds ?? []) if (!c.gods[g]) push(`${where}: unknown committable god ${g}`);
  const siteIds = new Set(m.sites.map((s) => s.id));
  const objIds = new Set(m.objectives.map((o) => o.id));
  if (siteIds.size !== m.sites.length) push(`${where}: duplicate site IDs`);
  const coords = new Set<string>();
  for (const s of m.sites) {
    const k = `${s.coord.q},${s.coord.r}`;
    if (coords.has(k)) push(`${where}: two sites share ${k}`);
    coords.add(k);
    if (template && !template.anchors.some((a) => a.id === s.anchorId && a.coord.q === s.coord.q && a.coord.r === s.coord.r)) {
      push(`${where}: site ${s.id} does not match a template anchor`);
    }
    s.guard?.army.forEach((a) => creatureOk(a.creatureId));
    rewardOk(s.guard?.reward, `${where}/${s.id}`);
    if (s.kind.type === 'watchtower') for (const r of s.kind.revealSiteIds) if (!siteIds.has(r)) push(`${where}: watchtower reveals unknown site ${r}`);
    if (s.kind.type === 'portal') {
      const exit = m.sites.find((x) => x.id === (s.kind as { exitSiteId: string }).exitSiteId);
      if (!exit || exit.kind.type !== 'portal') push(`${where}: portal ${s.id} leads to ${s.kind.exitSiteId}, which is not a portal`);
      else if (exit.kind.exitSiteId !== s.id) push(`${where}: portal ${s.id} and ${exit.id} are not twins (two-way)`);
      else if (exit.id === s.id) push(`${where}: portal ${s.id} leads to itself`);
    }
    if (s.kind.type === 'activation') for (const r of s.kind.requirements) {
      checkRequirement(c, r, `${where}/${s.id}`, push);
      if (r.type === 'objective_completed' && !objIds.has(r.objectiveId)) push(`${where}/${s.id}: unknown objective ${r.objectiveId}`);
    }
    if (s.kind.type === 'pickup') rewardOk(s.kind.reward, `${where}/${s.id}`);
    if (s.kind.type === 'creature_camp') {
      creatureOk(s.kind.creatureId);
      if (s.kind.initialStock < 0 || s.kind.weeklyGrowth < 0) push(`${where}/${s.id}: camp stock and growth must be non-negative`);
    }
    if (s.kind.type === 'map_event') {
      if (s.kind.options.length === 0) push(`${where}/${s.id}: a map event needs at least one option`);
      s.kind.options.forEach((o, i) => rewardOk(o.reward, `${where}/${s.id}#${i}`));
    }
    // Sites added 2026-10-02 (random maps).
    const sk = s.kind;
    if (sk.type === 'learning_stone' && sk.xp <= 0) push(`${where}/${s.id}: a learning stone needs positive experience`);
    if (sk.type === 'spell_shrine' && !c.spells[sk.spellId]) push(`${where}/${s.id}: unknown spell ${sk.spellId}`);
    if (sk.type === 'skill_trainer' && !c.skills[sk.skillId]) push(`${where}/${s.id}: unknown skill ${sk.skillId}`);
    if (sk.type === 'treasure_chest' && (sk.gold <= 0 || sk.xp <= 0)) push(`${where}/${s.id}: a chest needs a gold and an experience choice`);
    if (sk.type === 'windmill' && !Object.values(sk.weekly).some((v) => (v ?? 0) > 0)) push(`${where}/${s.id}: a windmill needs a weekly yield`);
    if (sk.type === 'prison') {
      if (!c.heroes[sk.heroDefinitionId]) push(`${where}/${s.id}: unknown captive hero ${sk.heroDefinitionId}`);
      if (sk.level < 1 || sk.level > c.rulesProfile.xpThresholds.length) push(`${where}/${s.id}: captive level out of range`);
    }
    if (sk.type === 'quest_hut') {
      rewardOk(sk.reward, `${where}/${s.id}`);
      if (sk.quest.type === 'defeat') {
        const target = m.sites.find((x) => x.id === (sk.quest as { siteId: string }).siteId);
        if (!target || !target.guard) push(`${where}/${s.id}: quest target ${sk.quest.siteId} is not a guarded site`);
      } else if (!Object.values(sk.quest.resources).some((v) => (v ?? 0) > 0)) push(`${where}/${s.id}: a delivery quest needs resources`);
    }
    if (sk.type === 'key_gate' && !m.sites.some((x) => x.kind.type === 'key_tent' && x.kind.color === sk.color)) push(`${where}/${s.id}: no key tent of colour ${sk.color}`);
  }
  const objById = new Map(m.objectives.map((o) => [o.id, o] as const));
  const townIds = new Set([m.player.town.townId, ...(m.rivals ?? []).map((r) => r.town.townId), ...(m.neutralTowns ?? []).map((t) => t.townId)]);
  const foeIds = new Set([...m.hostileHeroes.map((h) => h.commander.heroDefinitionId), ...(m.rivals ?? []).map((r) => r.hero.definitionId)]);
  for (const o of m.objectives) {
    for (const u of o.unlocks ?? []) if (!objIds.has(u)) push(`${where}/${o.id}: unlocks unknown objective ${u}`);
    for (const r of o.requires ?? []) if (!objIds.has(r)) push(`${where}/${o.id}: requires unknown objective ${r}`);
    if (o.requires?.length && o.initialStatus !== 'locked') push(`${where}/${o.id}: a step with requires must start locked`);
    // No step may (transitively) wait for itself.
    const seen = new Set<string>();
    const stack = [...(o.requires ?? []), ...(o.condition.type === 'claim' ? o.condition.after : [])];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === o.id) {
        push(`${where}/${o.id}: objective prerequisites form a cycle`);
        break;
      }
      if (seen.has(id)) continue;
      seen.add(id);
      const d = objById.get(id);
      if (d) stack.push(...(d.requires ?? []), ...(d.condition.type === 'claim' ? d.condition.after : []));
    }
    if (o.markerSiteId && !siteIds.has(o.markerSiteId)) push(`${where}/${o.id}: unknown marker site`);
    // Condition references: sites, towns and non-player heroes of this mission.
    const walk = (cond: ObjectiveCondition): void => {
      if ((cond.type === 'site_cleared' || cond.type === 'site_activated' || cond.type === 'site_visited') && !siteIds.has(cond.siteId)) push(`${where}/${o.id}: unknown site ${cond.siteId}`);
      if (cond.type === 'town_owned' && !townIds.has(cond.townId)) push(`${where}/${o.id}: unknown town ${cond.townId}`);
      if (cond.type === 'hero_defeated' && !foeIds.has(cond.heroDefinitionId)) push(`${where}/${o.id}: no hostile or rival hero ${cond.heroDefinitionId} in this mission`);
      if (cond.type === 'player_has_minor_god' && cond.count !== undefined && (!Number.isInteger(cond.count) || cond.count < 1)) push(`${where}/${o.id}: minor-god count must be a positive whole number`);
      if (cond.type === 'all' || cond.type === 'any') cond.conditions.forEach(walk);
    };
    walk(o.condition);
    for (const e of o.reward?.entitlementIds ?? []) if (!c.entitlements[e]) push(`${where}/${o.id}: unknown entitlement ${e}`);
  }
  m.hostileHeroes.forEach((h) => h.army.forEach((a) => creatureOk(a.creatureId)));
  for (const r of m.rivals ?? []) {
    r.hero.army.forEach((s) => creatureOk(s.creatureId));
    for (const b of r.town.buildings) if (!c.buildings[b]) push(`${where}: unknown starting building ${b}`);
    r.town.garrison?.forEach((g) => creatureOk(g.creatureId));
    if (!siteIds.has(r.town.siteId)) push(`${where}: rival town site ${r.town.siteId} is missing`);
  }
  // Unowned towns (2026-10-07): a known archetype and buildings, a town site of their own, no clash with an empire's town.
  const empireTowns = new Set([m.player.town.townId, ...(m.rivals ?? []).map((r) => r.town.townId)]);
  for (const t of m.neutralTowns ?? []) {
    if (!c.townArchetypes[t.archetypeId]) push(`${where}: unowned town ${t.townId} has an unknown archetype ${t.archetypeId}`);
    for (const b of t.buildings) if (!c.buildings[b]) push(`${where}: unknown building ${b} in unowned town ${t.townId}`);
    t.garrison?.forEach((g) => creatureOk(g.creatureId));
    if (empireTowns.has(t.townId)) push(`${where}: unowned town ${t.townId} shares an empire town's ID`);
    const site = m.sites.find((x) => x.id === t.siteId);
    if (!site) push(`${where}: unowned town site ${t.siteId} is missing`);
    else if (site.kind.type !== 'town' || site.kind.townId !== t.townId) push(`${where}: site ${t.siteId} is not the town ${t.townId}`);
  }
  const cond = m.victoryCondition;
  if (cond?.type === 'hold_site') {
    const site = m.sites.find((x) => x.id === cond.siteId);
    if (!site) push(`${where}: victory relic ${cond.siteId} is missing`);
    else if (site.kind.type !== 'relic') push(`${where}: victory site ${cond.siteId} is not a relic`);
    if (cond.days < 1) push(`${where}: hold-the-relic needs at least one day`);
  }
  // Story scenes: unique IDs, valid references, readable lines.
  const sceneIds = new Set<string>();
  for (const scene of m.storyScenes ?? []) {
    if (sceneIds.has(scene.id)) push(`${where}: duplicate story scene ${scene.id}`);
    sceneIds.add(scene.id);
    if (scene.lines.length === 0) push(`${where}/${scene.id}: a story scene needs at least one line`);
    for (const l of scene.lines) if (!l.text.trim() || !l.speaker.trim()) push(`${where}/${scene.id}: empty dialogue line`);
    const t = scene.trigger;
    if ((t.type === 'site_visited' || t.type === 'site_cleared') && !siteIds.has(t.siteId)) push(`${where}/${scene.id}: unknown site ${t.siteId}`);
    if (t.type === 'battle_started' && t.siteId && !siteIds.has(t.siteId)) push(`${where}/${scene.id}: unknown site ${t.siteId}`);
    if (t.type === 'objective_completed' && !objIds.has(t.objectiveId)) push(`${where}/${scene.id}: unknown objective ${t.objectiveId}`);
    if (t.type === 'god_committed' && !c.gods[t.godId]) push(`${where}/${scene.id}: unknown god ${t.godId}`);
    if (t.type === 'casualties' && (!Number.isInteger(t.minLost) || t.minLost < 1)) push(`${where}/${scene.id}: casualties trigger needs a positive whole number`);
  }
}

/** Validate a generated scenario definition (random skirmish maps) with the catalog's rules. */
export function validateGeneratedMission(c: ContentCatalog, m: MissionDefinition): ValidationReport {
  const issues: ValidationIssue[] = [];
  validateMission(c, m, (message) => issues.push({ validator: 'GeneratedMissionValidator', message }), false);
  return { ok: issues.length === 0, issues };
}

/** Skills, spells, artifact sets, interventions, weekly events, difficulties and skirmish kits (proposed this build). */
function expandedContentValidator(c: ContentCatalog, push: Push): void {
  const maxRank = c.rulesProfile.maxSkillRank;
  const pantheons = new Set(Object.keys(c.pantheons));
  for (const sk of Object.values(c.skills)) {
    if (sk.rankSummaries.length !== maxRank) push(`${sk.id}: needs ${maxRank} rank summaries`);
    if (sk.rule.type === 'effects') {
      if (sk.rule.effectsByRank.length !== maxRank) push(`${sk.id}: needs effects for ${maxRank} ranks`);
      sk.rule.effectsByRank.forEach((rank, i) => rank.forEach((e) => checkEffect(c, e, `${sk.id} rank ${i + 1}`, push)));
    }
    if (sk.pantheonId && !pantheons.has(sk.pantheonId)) push(`${sk.id}: unknown pantheon ${sk.pantheonId}`);
  }
  let maxLibrary = 0;
  for (const b of Object.values(c.buildings)) for (const e of b.effects) if (e.type === 'spell_library') maxLibrary = Math.max(maxLibrary, e.maxTier);
  for (const sp of Object.values(c.spells)) {
    if (sp.pantheonId && !pantheons.has(sp.pantheonId)) push(`${sp.id}: unknown pantheon ${sp.pantheonId}`);
    if (sp.access === 'sanctum' && sp.tier > maxLibrary) push(`${sp.id}: tier ${sp.tier} exceeds every Sanctum library (max ${maxLibrary})`);
    const needsAdventure = sp.effect.type === 'reveal_radius' || sp.effect.type === 'movement_bonus' || sp.effect.type === 'recall';
    if (needsAdventure !== (sp.context === 'adventure')) push(`${sp.id}: effect ${sp.effect.type} does not match context ${sp.context}`);
    const army = sp.target === 'friendly_army' || sp.target === 'enemy_army';
    const mass = sp.effect.type === 'mass_bonus' || sp.effect.type === 'mass_heal' || sp.effect.type === 'mass_damage';
    if (mass !== army) push(`${sp.id}: mass effects (and only they) target a whole army`);
    if (sp.effect.type === 'mass_heal' && sp.target !== 'friendly_army') push(`${sp.id}: a mass heal targets 'friendly_army'`);
    if (sp.effect.type === 'mass_damage' && sp.target !== 'enemy_army') push(`${sp.id}: mass damage targets 'enemy_army'`);
    if (sp.effect.type === 'mass_bonus' && (sp.target === 'enemy_army') !== sp.effect.amount < 0) push(`${sp.id}: an army-wide bonus helps friends, a penalty hurts enemies`);
    if ((sp.effect.type === 'min_damage_roll' || sp.effect.type === 'direct_damage' || sp.effect.type === 'area_damage') && sp.target !== 'enemy_stack') push(`${sp.id}: ${sp.effect.type} targets an enemy stack`);
    if ((sp.effect.type === 'melee_mitigation' || sp.effect.type === 'ranged_mitigation' || sp.effect.type === 'heal_front' || sp.effect.type === 'max_damage_roll') && sp.target !== 'ally_stack') push(`${sp.id}: ${sp.effect.type} targets a friendly stack`);
  }
  for (const set of Object.values(c.artifactSets)) {
    for (const id of set.pieceIds) {
      const a = c.artifacts[id];
      if (!a) push(`${set.id}: unknown piece ${id}`);
      else if (a.setId !== set.id) push(`${set.id}: piece ${id} names set ${a.setId ?? '(none)'}`);
    }
    for (const b of set.bonuses) {
      if (b.pieces < 2 || b.pieces > set.pieceIds.length) push(`${set.id}: bonus needs 2-${set.pieceIds.length} pieces`);
      b.effects.forEach((e) => checkEffect(c, e, `${set.id} (${b.pieces})`, push));
    }
    const perKind = new Map<string, number>();
    for (const id of set.pieceIds) {
      const k = c.artifacts[id]?.slot;
      if (k) perKind.set(k, (perKind.get(k) ?? 0) + 1);
    }
    for (const [k, n] of perKind) if (n > equipSlotsFor(k as ArtifactSlot).length) push(`${set.id}: ${n} pieces need the ${k} slot, so the full set cannot be worn`);
  }
  for (const a of Object.values(c.artifacts)) if (a.setId && !c.artifactSets[a.setId]) push(`${a.id}: unknown set ${a.setId}`);
  for (const iv of Object.values(c.interventions)) {
    if (iv.favorCost <= 0) push(`${iv.id}: needs a positive Favor cost`);
    for (const p of iv.pantheonIds ?? []) if (!pantheons.has(p)) push(`${iv.id}: unknown pantheon ${p}`);
    const battle = iv.effect.type.startsWith('battle_');
    if (battle !== (iv.context === 'battle')) push(`${iv.id}: effect ${iv.effect.type} does not match context ${iv.context}`);
    if ((iv.target === 'enemy_stack') !== (iv.effect.type === 'battle_smite')) push(`${iv.id}: only a smite targets an enemy stack`);
    if ((iv.target === 'own_town') !== (iv.effect.type === 'town_growth')) push(`${iv.id}: only town growth targets a town`);
  }
  for (const w of Object.values(c.weeklyEvents)) {
    if (w.weight <= 0) push(`${w.id}: needs a positive weight`);
    w.effects.forEach((e) => checkEffect(c, e, w.id, push));
  }
  const orders = Object.values(c.difficulties).map((d) => d.order);
  if (new Set(orders).size !== orders.length) push('difficulties: duplicate order');
  for (const d of Object.values(c.difficulties)) {
    if (d.humanStartPercent <= 0 || d.aiStartPercent <= 0 || d.aiIncomePercent <= 0) push(`${d.id}: percentages must be positive`);
    if (d.ai.heroAttackMargin < 1 || d.ai.guardMargin < 1 || d.ai.siegeMargin < 1) push(`${d.id}: AI margins below 1 would attack stronger armies`);
  }
  for (const [pid, kit] of Object.entries(c.skirmishKits)) {
    if (!pantheons.has(pid) || kit.pantheonId !== pid) push(`skirmish kit ${pid}: pantheon mismatch`);
    if (!c.townArchetypes[kit.archetypeId]) push(`skirmish kit ${pid}: unknown town ${kit.archetypeId}`);
    for (const b of kit.buildings) if (c.buildings[b]?.pantheonId !== pid) push(`skirmish kit ${pid}: building ${b} is not ${pid}`);
    for (const a of kit.army) if (!c.creatures[a.creatureId]) push(`skirmish kit ${pid}: unknown creature ${a.creatureId}`);
    if (kit.leaders.length < 4) push(`skirmish kit ${pid}: needs 4 leaders for four-empire maps`);
    const ids = kit.leaders.map((l) => l.definitionId);
    if (new Set(ids).size !== ids.length) push(`skirmish kit ${pid}: duplicate leaders`);
    for (const l of kit.leaders) {
      if (!c.heroes[l.definitionId]) push(`skirmish kit ${pid}: unknown leader ${l.definitionId}`);
      if (!c.heroClasses[l.classId]) push(`skirmish kit ${pid}: unknown class ${l.classId}`);
    }
    if (kit.townNames.length < 4) push(`skirmish kit ${pid}: needs at least 4 town names`);
  }
  for (const ev of Object.values(c.mapEventTemplates)) {
    if (ev.options.length === 0) push(`${ev.id}: a map event needs options`);
    for (const o of ev.options) {
      for (const a of o.reward.artifactIds ?? []) if (!c.artifacts[a]) push(`${ev.id}: unknown artifact ${a}`);
      for (const cr of o.reward.creatures ?? []) if (!c.creatures[cr.creatureId]?.stats) push(`${ev.id}: creature ${cr.creatureId} cannot join an army`);
    }
  }
}

function assetReferenceValidator(c: ContentCatalog, push: Push): void {
  const seen = new Set<string>();
  for (const cr of Object.values(c.creatures)) {
    for (const a of [cr.presentation.portraitAssetId, cr.presentation.spriteAssetId]) {
      if (!a) push(`${cr.id}: empty asset ID`);
      if (seen.has(a)) push(`${cr.id}: duplicate asset ID ${a} (base and upgraded need distinct assets)`);
      seen.add(a);
    }
  }
}

/** Climate rules: keyed by a biome the maps use, known stats and ability types, small amounts (proposed 2026-10-04). */
function climateValidator(c: ContentCatalog, push: Push): void {
  const biomes = new Set(Object.values(c.mapTemplates).map((t) => t.biome));
  const abilityTypes = new Set(Object.values(c.abilities).map((a) => a.rule.type as string));
  for (const [id, r] of Object.entries(c.climates ?? {})) {
    if (r.id !== id) push(`climate ${id}: id mismatch`);
    if (!biomes.has(r.id as never) && r.id !== 'temperate') push(`climate ${id}: no map uses this biome`);
    if (!r.summary.startsWith(r.name)) push(`climate ${id}: the summary must open with its name`);
    for (const e of r.effects) {
      if (e.type === 'creature_stat') {
        if (!['attack', 'defense', 'speed'].includes(e.stat)) push(`climate ${id}: unknown stat ${e.stat}`);
        if (e.ability && !abilityTypes.has(e.ability)) push(`climate ${id}: no creature has an ability of type ${e.ability}`);
        if (e.withoutAbility && !abilityTypes.has(e.withoutAbility)) push(`climate ${id}: no creature has an ability of type ${e.withoutAbility}`);
        if (e.amount === 0 || Math.abs(e.amount) > 2) push(`climate ${id}: a climate changes a stat by 1 or 2`);
      } else if (e.type === 'shooting_range') {
        if (e.amount === 0 || Math.abs(e.amount) > 6) push(`climate ${id}: a climate changes shooting range by 1 to 6 hexes`);
      }
    }
  }
}

/**
 * AI temperaments (proposed 2026-10-04): one per playable pantheon, small
 * weights, margins that never let the AI attack an army it judges stronger.
 */
function temperamentValidator(c: ContentCatalog, push: Push): void {
  const all = c.aiTemperaments ?? {};
  for (const [id, t] of Object.entries(all)) {
    if (t.id !== id) push(`temperament ${id}: id mismatch`);
    if (!c.pantheons[id]) push(`temperament ${id}: no pantheon with this id`);
    if (!t.name || !t.summary) push(`temperament ${id}: needs a name and a summary`);
    if (t.boldness < 0.8 || t.boldness > 1.25) push(`temperament ${id}: boldness outside 0.8–1.25`);
    if (t.aggression < 0.7 || t.aggression > 1.5) push(`temperament ${id}: aggression outside 0.7–1.5`);
    if (!Number.isInteger(t.extraHeroes) || Math.abs(t.extraHeroes) > 1) push(`temperament ${id}: extraHeroes must be −1, 0 or 1`);
    for (const [f, w] of Object.entries(t.build)) {
      if (!['economy', 'military', 'elite', 'defense', 'magic', 'faith'].includes(f)) push(`temperament ${id}: unknown build focus ${f}`);
      if ((w ?? 1) < 0.5 || (w ?? 1) > 2) push(`temperament ${id}: build weight ${f} outside 0.5–2`);
    }
    if (t.magic < 0.5 || t.magic > 2) push(`temperament ${id}: magic weight outside 0.5–2`);
    if (t.faith < 0.5 || t.faith > 2) push(`temperament ${id}: faith weight outside 0.5–2`);
    for (const d of Object.values(c.difficulties)) {
      if (d.ai.heroAttackMargin * t.boldness < 0.9) push(`temperament ${id}: with ${d.id} it would attack heroes well below even strength`);
    }
  }
  if (Object.keys(all).length > 0) {
    for (const p of Object.values(c.pantheons)) if (p.playability === 'playable' && !all[p.id]) push(`pantheon ${p.id}: playable but has no AI temperament`);
  }
}

/**
 * Authored skirmish maps (2026-10-05): the document is a playable custom map —
 * IDs, empires, one town each, known creatures, spells, skills, artifacts and
 * heroes. Reachability, symmetry and compilation are checked by the map tests
 * (packages/campaign/test/skirmishMaps.test.ts), which can use the map compiler.
 */
function skirmishMapValidator(c: ContentCatalog, push: Push): void {
  const orders = new Set<number>();
  for (const [id, m] of Object.entries(c.skirmishMaps ?? {})) {
    if (m.id !== id) push(`skirmish map ${id}: id mismatch`);
    if (orders.has(m.order)) push(`skirmish map ${id}: duplicate order ${m.order}`);
    orders.add(m.order);
    if (!m.name || !m.tagline || !m.summary || m.highlights.length === 0) push(`skirmish map ${id}: needs a name, tagline, summary and highlights`);
    if (m.thumbnailAssetId !== `mission.skirmish.${id}.thumbnail`) push(`skirmish map ${id}: thumbnail must be mission.skirmish.${id}.thumbnail`);
    const d = m.map;
    if (d.format !== 'pantheon-realms-map' || d.version !== 1) push(`skirmish map ${id}: not a version-1 map document`);
    if (d.terrain.length !== d.width * d.height) push(`skirmish map ${id}: terrain size mismatch`);
    if (d.players.length < 2 || d.players.length > 6) push(`skirmish map ${id}: needs 2–6 empires`);
    d.players.forEach((p, i) => {
      if (!c.skirmishKits[p.pantheonId]) push(`skirmish map ${id}: empire ${i + 1} pantheon ${p.pantheonId} has no skirmish kit`);
      if (d.sites.filter((s) => s.kind === 'town' && s.owner === i).length !== 1) push(`skirmish map ${id}: empire ${i + 1} needs exactly one town`);
    });
    const ids = new Set<string>();
    for (const s of d.sites) {
      if (ids.has(s.id)) push(`skirmish map ${id}: duplicate site ${s.id}`);
      ids.add(s.id);
      for (const g of s.guard ? [s.guard, ...(s.guard.more ?? [])] : []) if (!c.creatures[g.creatureId]) push(`skirmish map ${id}: ${s.id} guard ${g.creatureId} unknown`);
      if (s.creatureId && !c.creatures[s.creatureId]) push(`skirmish map ${id}: ${s.id} creature ${s.creatureId} unknown`);
      if (s.spellId && !c.spells[s.spellId]) push(`skirmish map ${id}: ${s.id} spell ${s.spellId} unknown`);
      if (s.skillId && !c.skills[s.skillId]) push(`skirmish map ${id}: ${s.id} skill ${s.skillId} unknown`);
      if (s.heroId && !c.heroes[s.heroId]) push(`skirmish map ${id}: ${s.id} hero ${s.heroId} unknown`);
      if (s.reward?.artifactId && !c.artifacts[s.reward.artifactId]) push(`skirmish map ${id}: ${s.id} artifact ${s.reward.artifactId} unknown`);
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
  ExpandedContentValidator: expandedContentValidator,
  AssetReferenceValidator: assetReferenceValidator,
  ClimateValidator: climateValidator,
  TemperamentValidator: temperamentValidator,
  SkirmishMapValidator: skirmishMapValidator,
};

export function validateCatalog(c: ContentCatalog): ValidationReport {
  const issues: ValidationIssue[] = [];
  for (const [name, fn] of Object.entries(VALIDATORS)) fn(c, (message) => issues.push({ validator: name, message }));
  return { ok: issues.length === 0, issues };
}
