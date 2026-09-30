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
  readonly artifacts: number;
  readonly divine: number;
  readonly total: number;
}

export type EffectiveAttributes = Readonly<Record<HeroAttribute, AttributeBreakdown>>;

export function artifactEffects(catalog: ContentCatalog, hero: HeroState): EffectDefinition[] {
  return Object.values(hero.equipment).flatMap((inst) => (inst ? getArtifact(catalog, inst.artifactId).effects : []));
}

/** Player-wide effects reaching this hero: committed gods and the pantheon signature. */
export function divineEffects(catalog: ContentCatalog, state: MatchState, hero: HeroState): EffectDefinition[] {
  return playerEffects(catalog, state, hero.ownerId);
}

export function effectiveAttributes(catalog: ContentCatalog, state: MatchState, hero: HeroState): EffectiveAttributes {
  const art = artifactEffects(catalog, hero);
  const div = divineEffects(catalog, state, hero);
  const sum = (effects: EffectDefinition[], attr: HeroAttribute) =>
    effects.reduce((n, e) => (e.type === 'commander_attribute' && e.attribute === attr ? n + e.amount : n), 0);
  const make = (attr: HeroAttribute): AttributeBreakdown => {
    const base = hero.attributes[attr];
    const artifacts = sum(art, attr);
    const divine = sum(div, attr);
    return { base, artifacts, divine, total: Math.max(0, base + artifacts + divine) };
  };
  return { attack: make('attack'), defense: make('defense'), power: make('power'), knowledge: make('knowledge') };
}

export function skillRank(hero: HeroState, skillId: SkillId): number {
  return hero.skills.find((s) => s.skillId === skillId)?.rank ?? 0;
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
    }
  }
  return 0;
}

export function maxMana(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  return catalog.rulesProfile.manaPerKnowledge * effectiveAttributes(catalog, state, hero).knowledge.total;
}

export function heroMoraleBonus(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  const fx = [...artifactEffects(catalog, hero), ...divineEffects(catalog, state, hero)];
  return skillValue(catalog, hero, 'leadership') + fx.reduce((n, e) => (e.type === 'morale' ? n + e.amount : n), 0);
}

export function heroLuckBonus(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  const fx = [...artifactEffects(catalog, hero), ...divineEffects(catalog, state, hero)];
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
  const fx = [...artifactEffects(catalog, hero), ...divineEffects(catalog, state, hero)];
  const percent =
    skillValue(catalog, hero, 'logistics') + fx.reduce((n, e) => (e.type === 'movement_percent' ? n + e.percent : n), 0);
  const total = Math.floor((base * (100 + percent)) / 100);
  return { base, percentBonus: percent, total, slowestSpeed: slowest };
}

export function heroVisionRadius(catalog: ContentCatalog, hero: HeroState, state?: MatchState): number {
  const fx = [...artifactEffects(catalog, hero), ...(state ? divineEffects(catalog, state, hero) : [])];
  const bonus = fx.reduce((n, e) => (e.type === 'vision_radius' ? n + e.amount : n), 0);
  return catalog.rulesProfile.heroVisionRadius + skillValue(catalog, hero, 'scouting') + bonus;
}

export function maxSpellTierLearnable(catalog: ContentCatalog, hero: HeroState): number {
  // Tiers 1-2 need no Wisdom; Wisdom I/II/III allows tiers 3/4/5.
  return Math.max(2, skillValue(catalog, hero, 'wisdom'));
}

export function armyStackCount(hero: HeroState): number {
  return hero.army.slots.filter((s) => s !== null).length;
}

export function armyTotalCreatures(hero: HeroState): number {
  return hero.army.slots.reduce((n, s) => n + (s?.count ?? 0), 0);
}
