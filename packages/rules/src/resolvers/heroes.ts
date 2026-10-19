/**
 * ModifierResolver for heroes: effective attributes, skills, movement, vision, mana.
 *
 * Base attributes live on HeroState; artifacts and divine commitments add modifiers
 * here without changing any base record. Every screen that shows an effective
 * value uses these functions (no copied UI math).
 */
import type { SkillId } from '../ids';
import { getArtifact, requireStats, type ContentCatalog } from '../definitions/catalog';
import type { EffectDefinition, HeroAttribute } from '../definitions/logic';
import type { SkillRule } from '../definitions/pantheons';
import type { HeroState, MatchState } from '../state/match';
import { playerEffects } from './effects';

export interface AttributeBreakdown {
  readonly base: number;
  /** Artifacts, including artifact-set bonuses. */
  readonly artifacts: number;
  readonly divine: number;
  /** Secondary skills that grant attribute effects (pantheon skills). */
  readonly skills: number;
  readonly total: number;
}

export type EffectiveAttributes = Readonly<Record<HeroAttribute, AttributeBreakdown>>;

/** Equipped pieces per artifact set, with the bonuses currently active. */
export function artifactSetStatus(
  catalog: ContentCatalog,
  hero: Pick<HeroState, 'equipment'>,
): { setId: string; name: string; equipped: number; total: number; active: { pieces: number; summary: string }[] }[] {
  const counts = new Map<string, number>();
  for (const inst of Object.values(hero.equipment)) {
    const setId = inst ? catalog.artifacts[inst.artifactId]?.setId : undefined;
    if (setId) counts.set(setId, (counts.get(setId) ?? 0) + 1);
  }
  const out: { setId: string; name: string; equipped: number; total: number; active: { pieces: number; summary: string }[] }[] = [];
  for (const [setId, equipped] of [...counts].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const set = catalog.artifactSets?.[setId];
    if (!set) continue;
    out.push({
      setId,
      name: set.name,
      equipped,
      total: set.pieceIds.length,
      active: set.bonuses.filter((b) => equipped >= b.pieces).map((b) => ({ pieces: b.pieces, summary: b.summary })),
    });
  }
  return out;
}

/** Effects of equipped artifacts plus every met artifact-set bonus. */
export function artifactEffects(catalog: ContentCatalog, hero: Pick<HeroState, 'equipment'>, state?: Pick<MatchState, 'scenario'>): EffectDefinition[] {
  const seen = new Set<string>();
  const pieces = Object.values(hero.equipment).flatMap((inst) => {
    if (!inst) return [];
    const def = getArtifact(catalog, inst.artifactId);
    if (def.scope === 'mythic_library_v2') {
      if (!state?.scenario.features?.mythicLibraryV2 || seen.has(def.id)) return [];
      seen.add(def.id);
    }
    return def.effects;
  });
  const sets: EffectDefinition[] = [];
  for (const st of artifactSetStatus(catalog, hero)) {
    const set = catalog.artifactSets[st.setId]!;
    for (const b of set.bonuses) if (st.equipped >= b.pieces) sets.push(...b.effects);
  }
  return [...pieces, ...sets];
}

/** Effects granted by 'effects'-rule secondary skills at the hero's current ranks. */
export function skillEffects(catalog: ContentCatalog, hero: { skills: readonly { skillId: SkillId; rank: number }[] }): EffectDefinition[] {
  const out: EffectDefinition[] = [];
  for (const s of hero.skills) {
    const def = catalog.skills[s.skillId];
    if (!def || def.rule.type !== 'effects' || s.rank <= 0) continue;
    out.push(...(def.rule.effectsByRank[s.rank - 1] ?? []));
  }
  return out;
}

/** True when hero specialties apply in this match (scenario feature; off in older saves). */
export function specialtiesEnabled(state: Pick<MatchState, 'scenario'>): boolean {
  return state.scenario.features?.heroSpecialties === true;
}

/** How many times a specialty's growth effects apply at this level (0 below the first step). */
export function specialtyGrowthSteps(everyLevels: number, level: number): number {
  return everyLevels > 0 ? Math.floor(Math.max(1, level) / everyLevels) : 0;
}

/**
 * The hero's specialty effects at its current level (empty when the scenario has
 * no specialties or the hero has none). Growth effects are repeated once per
 * `everyLevels` levels reached; amounts of identical effects simply add up.
 */
export function specialtyEffects(catalog: ContentCatalog, state: Pick<MatchState, 'scenario'>, hero: Pick<HeroState, 'definitionId' | 'level'>): EffectDefinition[] {
  if (!specialtiesEnabled(state)) return [];
  const sp = catalog.heroes[hero.definitionId]?.specialty;
  if (!sp) return [];
  const out: EffectDefinition[] = [...sp.effects];
  if (sp.growth) {
    const steps = specialtyGrowthSteps(sp.growth.everyLevels, hero.level);
    for (let i = 0; i < steps; i++) out.push(...sp.growth.effects);
  }
  return out;
}

/** The effects of the gods' gifts a hero took at levels 10 and 15 (owner request 2026-10-07). */
export function perkEffects(catalog: ContentCatalog, hero: Pick<HeroState, 'perks'>): EffectDefinition[] {
  return (hero.perks ?? []).flatMap((id) => catalog.godPerks?.[id]?.effects ?? []);
}

/** Everything the hero itself carries: artifacts, set bonuses, skill effects, the gods' gifts and (with `state`) its specialty. */
export function heroEffects(catalog: ContentCatalog, hero: HeroState, state?: Pick<MatchState, 'scenario'>): EffectDefinition[] {
  return [...artifactEffects(catalog, hero, state), ...skillEffects(catalog, hero), ...perkEffects(catalog, hero), ...(state ? specialtyEffects(catalog, state, hero) : [])];
}

/** Player-wide effects reaching this hero: committed gods and the pantheon signature. */
export function divineEffects(catalog: ContentCatalog, state: MatchState, hero: HeroState): EffectDefinition[] {
  return playerEffects(catalog, state, hero.ownerId);
}

export function effectiveAttributes(catalog: ContentCatalog, state: MatchState, hero: HeroState): EffectiveAttributes {
  const art = artifactEffects(catalog, hero, state);
  // The gods' gifts count with the divine part.
  const div = [...divineEffects(catalog, state, hero), ...perkEffects(catalog, hero)];
  const sk = skillEffects(catalog, hero);
  const sum = (effects: EffectDefinition[], attr: HeroAttribute) =>
    effects.reduce((n, e) => (e.type === 'commander_attribute' && e.attribute === attr ? n + e.amount : n), 0);
  const make = (attr: HeroAttribute): AttributeBreakdown => {
    const base = hero.attributes[attr];
    const artifacts = sum(art, attr);
    const divine = sum(div, attr);
    const skills = sum(sk, attr);
    return { base, artifacts, divine, skills, total: Math.max(0, base + artifacts + divine + skills) };
  };
  return { attack: make('attack'), defense: make('defense'), power: make('power'), knowledge: make('knowledge') };
}

/** Look up a skill's rank value by rule type (skills are data; IDs are not hard-coded). */
export function skillValue(catalog: ContentCatalog, hero: { skills: readonly { skillId: SkillId; rank: number }[] }, type: SkillRule['type']): number {
  for (const s of hero.skills) {
    const def = catalog.skills[s.skillId];
    if (!def || def.rule.type !== type || s.rank <= 0) continue;
    const rule = def.rule;
    const idx = s.rank - 1;
    switch (rule.type) {
      case 'offense':
      case 'archery':
      case 'logistics':
        return rule.percentByRank[idx] ?? 0;
      case 'armorer':
        return rule.reductionPercentByRank[idx] ?? 0;
      case 'leadership':
        return rule.moraleByRank[idx] ?? 0;
      case 'fortune':
        return rule.luckByRank[idx] ?? 0;
      case 'wisdom':
        return rule.maxSpellTierByRank[idx] ?? 0;
      case 'scouting':
        return rule.radiusByRank[idx] ?? 0;
      case 'tactics':
        return rule.columnsByRank[idx] ?? 0;
      case 'effects':
        return 0;
    }
  }
  return 0;
}

export function maxMana(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  return catalog.rulesProfile.manaPerKnowledge * effectiveAttributes(catalog, state, hero).knowledge.total;
}

/**
 * Morale from an army's make-up: +1 when every creature is of one pantheon (no
 * neutrals), −1 for each pantheon beyond the first (at most −2; neutral creatures
 * never count; owner request 2026-10-07), else 0.
 */
export function armyCompositionMorale(catalog: ContentCatalog, creatureIds: readonly string[]): { value: number; pantheons: string[]; neutral: boolean } {
  const ids = creatureIds.filter((id) => !!catalog.creatures[id]);
  const pantheons = [...new Set(ids.map((id) => catalog.creatures[id]!.pantheonId).filter((p): p is string => !!p))].sort();
  const neutral = ids.some((id) => !catalog.creatures[id]!.pantheonId);
  const c = catalog.rulesProfile.combat;
  if (ids.length === 0) return { value: 0, pantheons, neutral };
  if (pantheons.length === 1 && !neutral) return { value: c.sameFactionMorale, pantheons, neutral };
  if (pantheons.length >= 2) return { value: -Math.min(c.mixedPantheonMoraleCap, (pantheons.length - 1) * c.mixedPantheonMorale), pantheons, neutral };
  return { value: 0, pantheons, neutral };
}

export function heroMoraleBonus(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  const fx = [...heroEffects(catalog, hero, state), ...divineEffects(catalog, state, hero)];
  return skillValue(catalog, hero, 'leadership') + fx.reduce((n, e) => (e.type === 'morale' ? n + e.amount : n), 0);
}

export function heroLuckBonus(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  const fx = [...heroEffects(catalog, hero, state), ...divineEffects(catalog, state, hero)];
  return skillValue(catalog, hero, 'fortune') + fx.reduce((n, e) => (e.type === 'luck' ? n + e.amount : n), 0);
}

/** Slowest permanent creature's base Speed in the army (null for an empty army). */
export function slowestSpeed(catalog: ContentCatalog, hero: HeroState): number | null {
  let slowest: number | null = null;
  for (const s of hero.army.slots) {
    if (!s) continue;
    const speed = requireStats(catalog, s.creatureId).stats.speed;
    slowest = slowest === null ? speed : Math.min(slowest, speed);
  }
  return slowest;
}

export interface MovementBudget {
  readonly base: number;
  readonly percentBonus: number;
  readonly total: number;
  readonly slowestSpeed: number | null;
}

/** Daily land budget: table by slowest Speed, then Logistics + artifacts additively, floor once. */
export function movementBudget(catalog: ContentCatalog, state: MatchState, hero: HeroState): MovementBudget {
  const profile = catalog.rulesProfile;
  const slowest = slowestSpeed(catalog, hero);
  let base = profile.minimumMovement;
  if (slowest !== null) {
    for (const row of profile.movementBySlowestSpeed) if (slowest >= row.speed) base = row.points;
  }
  const fx = [...heroEffects(catalog, hero, state), ...divineEffects(catalog, state, hero)];
  const percent =
    skillValue(catalog, hero, 'logistics') + fx.reduce((n, e) => (e.type === 'movement_percent' ? n + e.percent : n), 0);
  const total = Math.floor((base * (100 + percent)) / 100);
  return { base, percentBonus: percent, total, slowestSpeed: slowest };
}

export function heroVisionRadius(catalog: ContentCatalog, hero: HeroState, state?: MatchState): number {
  const fx = [...heroEffects(catalog, hero, state), ...(state ? divineEffects(catalog, state, hero) : [])];
  const bonus = fx.reduce((n, e) => (e.type === 'vision_radius' ? n + e.amount : n), 0);
  return catalog.rulesProfile.heroVisionRadius + skillValue(catalog, hero, 'scouting') + bonus;
}

/** Mana regained at dawn away from a Sanctum: the rules' rate plus mana_regen effects. */
export function dawnManaRegen(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  const fx = [...heroEffects(catalog, hero, state), ...divineEffects(catalog, state, hero)];
  return catalog.rulesProfile.dawnManaRegen + fx.reduce((n, e) => (e.type === 'mana_regen' ? n + e.amount : n), 0);
}

export function maxSpellTierLearnable(catalog: ContentCatalog, hero: HeroState): number {
  // Tiers 1-2 need no Wisdom; Wisdom I/II/III allows tiers 3/4/5.
  return Math.max(2, skillValue(catalog, hero, 'wisdom'));
}
