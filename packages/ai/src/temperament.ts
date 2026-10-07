/**
 * Difficulty margins and pantheon temperaments for the strategic AI.
 *
 * The difficulty (catalog data) sets how much stronger the AI wants to be before
 * it fights and how many heroes it keeps. With the scenario feature
 * `aiTemperaments` (skirmishes and random maps), each AI empire also plays by
 * its pantheon's temperament (`catalog.aiTemperaments`, proposed 2026-10-04):
 * bolder or more careful margins, extra heroes, and weights on what it builds,
 * which skills and heroes it takes and whether it keeps praying. A temperament
 * reads only the AI's own pantheon (public) and changes choices, never rules.
 */
import type { AIBuildFocus, AITemperamentDefinition, BuildingId, ContentCatalog, EffectDefinition, MatchState, PlayerId } from '@pr/rules';

/**
 * Strength margins and hero target by skirmish difficulty (catalog data). The
 * defaults are the Normal values, used whenever no difficulty applies (a campaign
 * run started before campaign levels existed).
 */
export interface AIPersonality {
  readonly heroAttackMargin: number;
  readonly guardMargin: number;
  readonly siegeMargin: number;
  readonly targetHeroes: number;
}

const DEFAULT_PERSONALITY: AIPersonality = { heroAttackMargin: 1.2, guardMargin: 1.3, siegeMargin: 1.25, targetHeroes: 3 };

/** The difficulty's margins alone (no temperament). */
export function aiPersonality(catalog: ContentCatalog, state: MatchState): AIPersonality {
  const id = state.scenario.difficultyId;
  return (id ? catalog.difficulties?.[id]?.ai : undefined) ?? DEFAULT_PERSONALITY;
}

/** Every weight neutral: how all rivals play when the feature is off. */
export const NEUTRAL_TEMPERAMENT: AITemperamentDefinition = {
  id: 'neutral',
  name: 'Even',
  summary: 'Weighs every option evenly.',
  boldness: 1,
  aggression: 1,
  extraHeroes: 0,
  build: {},
  magic: 1,
  faith: 1,
};

/** The temperament this empire plays by (neutral when the feature is off or its pantheon has none). */
export function aiTemperamentFor(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): AITemperamentDefinition {
  if (state.scenario.features?.aiTemperaments !== true) return NEUTRAL_TEMPERAMENT;
  const pantheonId = state.players[playerId]?.pantheonId;
  return (pantheonId ? catalog.aiTemperaments?.[pantheonId] : undefined) ?? NEUTRAL_TEMPERAMENT;
}

/** Margins never fall below this: the AI never attacks an army it judges stronger. */
const MIN_MARGIN = 1;

/** The difficulty's margins scaled by the empire's temperament (boldness, extra heroes). */
export function aiPersonalityFor(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): AIPersonality {
  const base = aiPersonality(catalog, state);
  const t = aiTemperamentFor(catalog, state, playerId);
  if (t.boldness === 1 && t.extraHeroes === 0) return base;
  const scale = (m: number) => Math.max(MIN_MARGIN, Math.round(m * t.boldness * 1000) / 1000);
  const maxHeroes = catalog.rulesProfile.maxHeroesPerPlayer;
  return {
    heroAttackMargin: scale(base.heroAttackMargin),
    guardMargin: scale(base.guardMargin),
    siegeMargin: scale(base.siegeMargin),
    targetHeroes: Math.max(1, Math.min(maxHeroes, base.targetHeroes + t.extraHeroes)),
  };
}

// ---------------------------------------------------------------------------
// Build focus
// ---------------------------------------------------------------------------

/** Magic effects (spell power and knowledge, mana, spells): weighed by `magic`. */
export function isMagicEffect(e: EffectDefinition): boolean {
  switch (e.type) {
    case 'commander_attribute':
      return e.attribute === 'power' || e.attribute === 'knowledge';
    case 'mana_regen':
    case 'spell_damage_percent':
    case 'spell_power_bonus':
    case 'spell_eligibility':
    case 'spell_library':
    case 'enables_spellbook_purchase':
      return true;
    default:
      return false;
  }
}

/** The kinds of building this is, for the temperament's build weights (data-driven: effects and dwellings). */
export function buildingFocus(catalog: ContentCatalog, buildingId: BuildingId): ReadonlySet<AIBuildFocus> {
  const out = new Set<AIBuildFocus>();
  const def = catalog.buildings[buildingId];
  if (!def) return out;
  if (def.dwelling) out.add(def.dwelling.form === 'base' ? 'military' : 'elite');
  for (const e of def.effects) {
    if (e.type === 'daily_income') out.add(e.resource === 'favor' ? 'faith' : 'economy');
    else if (e.type === 'enables_market') out.add('economy');
    else if (e.type === 'growth_multiplier' || e.type === 'weekly_growth_bonus') out.add('military');
    else if (e.type === 'enables_hero_training') out.add('elite');
    else if (e.type === 'siege_fortification' || e.type === 'town_vision_radius') out.add('defense');
    else if (e.type === 'offering') out.add('faith');
    else if (isMagicEffect(e)) out.add('magic');
  }
  return out;
}

/**
 * The base build score values some kinds little (walls only as prerequisites, a
 * Temple by its Favor income): a favoured kind (weight above 1) also gains this
 * much for every point of weight above 1, so the preference shows in the build order.
 */
export const FOCUS_BONUS = 1500;

/** Temperament adjustment of a build score (before the cost discount): weights, then the favoured kinds' bonus. */
export function temperBuildScore(catalog: ContentCatalog, buildingId: BuildingId, t: AITemperamentDefinition, score: number): number {
  let out = score;
  let bonus = 0;
  for (const f of buildingFocus(catalog, buildingId)) {
    const w = t.build[f] ?? 1;
    out *= w;
    if (w > 1) bonus += (w - 1) * FOCUS_BONUS;
  }
  return out + bonus;
}

/** Favor an empire whose faith is above 1 keeps offering for once its gods are chosen (miracles and gifts). */
export function faithFavorGoal(t: AITemperamentDefinition): number {
  return t.faith > 1 ? Math.round(60 * (t.faith - 1)) : 0;
}
