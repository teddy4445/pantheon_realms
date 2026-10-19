/**
 * Build scoring for the strategic AI (moved from strategic.ts on 2026-10-17 so the city
 * dedication planner can rank the same build plan) and the Temple II bonus of city
 * dedications (CITY DEDICATIONS handoff §11, app 1.5.0).
 *
 * Data-driven (works for any pantheon's town tree): income first, then new dwellings by
 * tier, growth, hiring/market access and prerequisites that unlock many other
 * buildings. Heuristic, not a proven build order.
 */
import {
  cityDedicationProfile,
  cityDedicationsEnabled,
  familyDwellingLevel,
  goldEquivalent,
  ownerIncomeShare,
  type AITemperamentDefinition,
  type ContentCatalog,
  type GodId,
  type MatchState,
  type PlayerId,
  type TownId,
} from '@pr/rules';
import { temperBuildScore } from './temperament';

/**
 * A recruit from a city dedication's extra stock is not free: it still costs its price.
 * What the extra stock is worth is the chance to turn Gold into army when the weekly stock,
 * not the treasury, is the limit — taken as this share of the creature's Gold price
 * (proposed value; the handoff asks never to count the catalog price as income).
 */
export const GROWTH_STOCK_VALUE = 0.4;

/**
 * Weight of the Temple II bonus: the best god the town could honor, as if its weekly gift
 * and stock were daily income (a Gold `daily_income` effect scores twice its amount).
 * 1 = valued like income of the same size (proposed; measured with the balance tool).
 */
export const TEMPLE_DEDICATION_WEIGHT = 1;
/**
 * A minor god not yet committed counts at this share in the Temple II bonus: Temple II is
 * what lets the empire commit to it (every minor god requires it), but the Favor is still
 * to be found. Computer empires start without a patron, so before Temple II these are
 * usually their only prospects.
 */
export const PROSPECT_WEIGHT = 0.5;

/** Committed gods of a player that have a city profile: patron first, then minors in commitment order. */
export function dedicationGods(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): GodId[] {
  const p = belief.players[playerId]?.pantheon;
  if (!p) return [];
  const ids = [p.patronGodId, ...p.minorGodIds].filter((g): g is GodId => !!g && !!cityDedicationProfile(catalog, g));
  return [...new Set(ids)];
}

/**
 * Minor gods of the player's pantheon it could still commit to (the mission allows them and
 * no committed god of the same exclusivity group excludes them) — whatever their other
 * requirements or Favor price.
 */
export function prospectiveDedicationGods(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): GodId[] {
  const player = belief.players[playerId];
  if (!player) return [];
  const committed = new Set(dedicationGods(catalog, belief, playerId));
  const groups = new Set(player.pantheon.minorGodIds.map((g) => catalog.gods[g]?.exclusivityGroup).filter((x): x is string => !!x));
  const allow = belief.scenario.committableGodIds;
  return (catalog.pantheons[player.pantheonId]?.godIds ?? []).filter((g) => {
    const def = catalog.gods[g];
    if (!def || committed.has(g) || def.role !== 'minor' || def.implementationStatus !== 'implemented' || !cityDedicationProfile(catalog, g)) return false;
    if (allow && !allow.includes(g)) return false;
    return !def.exclusivityGroup || !groups.has(def.exclusivityGroup);
  });
}

/**
 * A god's city profile at a glance in one town (Gold equivalent per week): its weekly gift
 * after the owner's income handicap, plus its favored family's extra stock at
 * `GROWTH_STOCK_VALUE` when that family's dwelling stands. For quick comparisons (Temple II,
 * commitments); the dedication choice itself uses the full valuation in dedication.ts.
 */
export function profileWeeklyGlance(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, townId: TownId, godId: GodId): number {
  const profile = cityDedicationProfile(catalog, godId);
  const town = belief.towns[townId];
  if (!profile || !town) return 0;
  const gift = goldEquivalent(ownerIncomeShare(profile.weeklyResource, belief.players[playerId]?.incomePercent ?? 100));
  const family = catalog.families[profile.favoredFamilyId];
  const unit = family ? (catalog.creatures[family.baseCreatureId]?.cost?.gold ?? 0) : 0;
  const stock = familyDwellingLevel(catalog, town, profile.favoredFamilyId) >= 1 ? (profile.weeklyGrowthQuarters / 4) * unit * GROWTH_STOCK_VALUE : 0;
  return gift + stock;
}

/**
 * City dedications on: Temple II (the level `cityDedicationPolicy.requiredTempleLevel` of the
 * town's `pantheon_temple` location) unlocks the town's dedication, so it is worth the best
 * god's weekly glance as daily income (× 2 / 7, like a Gold `daily_income`): a committed god
 * (or the patron) in full, a god it could still commit to at `PROSPECT_WEIGHT`. Zero with the
 * feature off, for other buildings, and in a town of another pantheon (it can never be
 * dedicated by this player).
 */
export function templeDedicationBonus(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, townId: TownId, buildingId: string): number {
  const policy = catalog.cityDedicationPolicy;
  if (!policy || !cityDedicationsEnabled(belief)) return 0;
  const def = catalog.buildings[buildingId];
  const town = belief.towns[townId];
  const player = belief.players[playerId];
  if (!def || !town || !player || town.ownerId !== playerId || town.pantheonId !== player.pantheonId) return 0;
  const slot = catalog.townArchetypes[town.archetypeId]?.slots.find((s) => s.id === def.slotId);
  if (!slot || slot.kind !== 'support' || slot.role !== 'pantheon_temple' || def.level !== policy.requiredTempleLevel) return 0;
  let best = 0;
  for (const g of dedicationGods(catalog, belief, playerId)) best = Math.max(best, profileWeeklyGlance(catalog, belief, playerId, townId, g));
  for (const g of prospectiveDedicationGods(catalog, belief, playerId)) best = Math.max(best, PROSPECT_WEIGHT * profileWeeklyGlance(catalog, belief, playerId, townId, g));
  return (TEMPLE_DEDICATION_WEIGHT * 2 * best) / 7;
}

/** The town the score is for (the Temple II bonus needs it; without it the score is the plain one). */
export interface BuildScoreContext {
  readonly belief: MatchState;
  readonly playerId: PlayerId;
  readonly townId: TownId;
}

export function buildScore(catalog: ContentCatalog, buildingId: string, heroCount: number, temperament?: AITemperamentDefinition, ctx?: BuildScoreContext): number {
  const def = catalog.buildings[buildingId];
  if (!def) return 0;
  let score = 0;
  for (const e of def.effects) {
    if (e.type === 'daily_income') score += e.resource === 'gold' ? e.amount * 2 : e.resource === 'favor' ? 300 : 700;
    else if (e.type === 'growth_multiplier') score += 1500;
    else if (e.type === 'enables_hero_hiring') score += heroCount < 3 ? 900 : 200;
    else if (e.type === 'enables_market') score += 500;
    else if (e.type === 'spell_library') score += 350;
    else if (e.type === 'enables_hero_training') score += 260;
    else if (e.type === 'town_vision_radius') score += 220;
    else if (e.type === 'enables_artifact_merchant') score += 300;
  }
  if (def.dwelling) {
    const tier = catalog.families[def.dwelling.familyId]?.tier ?? 1;
    score += def.dwelling.form === 'base' ? 600 + tier * 350 : 300 + tier * 220;
  }
  // Prerequisite value: how many other buildings name this one directly.
  let unlocks = 0;
  for (const other of Object.values(catalog.buildings)) {
    if (other.pantheonId !== def.pantheonId || other.implementationStatus !== 'implemented') continue;
    if (other.requirements.some((r) => r.type === 'has_building' && r.buildingId === buildingId)) unlocks++;
  }
  score += unlocks * 380;
  // City dedications: Temple II unlocks the town's dedication (zero with the feature off).
  if (ctx) score += templeDedicationBonus(catalog, ctx.belief, ctx.playerId, ctx.townId, buildingId);
  // Temperament (scenario feature aiTemperaments): weights by kind of building, plus a
  // bonus for favoured kinds the score above values little (walls, Temple).
  if (temperament) score = temperBuildScore(catalog, buildingId, temperament, score);
  const gold = def.cost.gold ?? 0;
  return score / (1 + gold / 6000);
}
