/**
 * Town resolvers: which buildings are active, their effects, income and growth.
 *
 * Only the highest built level of each location chain is active. This is how
 * "Town Hall replaces Village Hall income" and "only the highest fortification
 * applies" are expressed as data instead of special cases.
 */
import type { BuildingId, BuildingSlotId, CreatureFamilyId, CreatureId, PlayerId, SpellId } from '../ids';
import { RngCursor, seedFromLabel } from '../core/rng';
import { scopeAllowed } from './scenario';
import { EMPTY_RESOURCES, addResources, type ResourceBundle } from '../core/resources';
import { getBuilding, getFamily, getTownArchetype, type ContentCatalog } from '../definitions/catalog';
import type { EffectDefinition } from '../definitions/logic';
import type { ArtifactRarity } from '../definitions/pantheons';
import type { BuildingDefinition, BuildingSlotDefinition } from '../definitions/towns';
import type { MatchState, TownState } from '../state/match';
import { playerEffects } from './effects';
import { townVisionBonus } from '../systems/dedicationServices';

export function townSlots(catalog: ContentCatalog, town: TownState): readonly BuildingSlotDefinition[] {
  return getTownArchetype(catalog, town.archetypeId).slots;
}

export function slotOf(catalog: ContentCatalog, town: TownState, slotId: BuildingSlotId): BuildingSlotDefinition {
  const slot = townSlots(catalog, town).find((s) => s.id === slotId);
  if (!slot) throw new Error(`Town ${town.id} has no location ${slotId}`);
  return slot;
}

/** The currently active building in a location, or null when empty. */
export function activeBuildingInSlot(catalog: ContentCatalog, town: TownState, slotId: BuildingSlotId): BuildingDefinition | null {
  const level = town.buildings[slotId] ?? 0;
  if (level <= 0) return null;
  const slot = slotOf(catalog, town, slotId);
  const id = slot.chain[level - 1];
  return id ? getBuilding(catalog, id) : null;
}

export function activeBuildings(catalog: ContentCatalog, town: TownState): BuildingDefinition[] {
  const out: BuildingDefinition[] = [];
  for (const slot of townSlots(catalog, town)) {
    const b = activeBuildingInSlot(catalog, town, slot.id);
    if (b) out.push(b);
  }
  return out;
}

/** True when the town has this building or a higher level of the same chain. */
export function townHasBuilding(catalog: ContentCatalog, town: TownState, buildingId: BuildingId): boolean {
  const def = getBuilding(catalog, buildingId);
  return (town.buildings[def.slotId] ?? 0) >= def.level;
}

/** All built buildings including superseded lower levels (for display of what exists). */
export function builtBuildingIds(catalog: ContentCatalog, town: TownState): BuildingId[] {
  const out: BuildingId[] = [];
  for (const slot of townSlots(catalog, town)) {
    const level = town.buildings[slot.id] ?? 0;
    for (let i = 0; i < level; i++) {
      const id = slot.chain[i];
      if (id) out.push(id);
    }
  }
  return out;
}

export function townEffects(catalog: ContentCatalog, town: TownState): EffectDefinition[] {
  return activeBuildings(catalog, town).flatMap((b) => b.effects);
}

export function townDailyIncome(catalog: ContentCatalog, town: TownState): ResourceBundle {
  let total: ResourceBundle = EMPTY_RESOURCES;
  for (const e of townEffects(catalog, town)) {
    if (e.type === 'daily_income') total = addResources(total, { [e.resource]: e.amount });
  }
  return total;
}

/** Highest fortification multiplier as a rational (1/1 when none). */
export function townGrowthMultiplier(catalog: ContentCatalog, town: TownState): { numerator: number; denominator: number } {
  let best = { numerator: 1, denominator: 1 };
  for (const e of townEffects(catalog, town)) {
    if (e.type === 'growth_multiplier' && e.numerator * best.denominator > best.numerator * e.denominator) {
      best = { numerator: e.numerator, denominator: e.denominator };
    }
  }
  return best;
}

/**
 * weeklyAddition = floor(baseGrowth * multiplier), per family, plus the owner's
 * flat `weekly_growth_bonus` effects for that tier (gods; needs `state`).
 */
export function weeklyGrowthFor(catalog: ContentCatalog, town: TownState, familyId: CreatureFamilyId, state?: MatchState): number {
  const family = getFamily(catalog, familyId);
  const m = townGrowthMultiplier(catalog, town);
  const base = Math.floor((family.baseGrowth * m.numerator) / m.denominator);
  if (!state || !town.ownerId) return base;
  let bonus = 0;
  for (const e of playerEffects(catalog, state, town.ownerId)) if (e.type === 'weekly_growth_bonus' && family.tier <= e.maxTier) bonus += e.amount;
  return base + bonus;
}

/**
 * Adventure vision radius around the town: the highest `town_vision_radius`, else the rules
 * default, plus the town's own dedication vision bonus (city dedications: only while its
 * Watchtower stands and the dedication is active and eligible). State-aware and derived —
 * never cached — so it follows dedication, temple or watchtower loss, capture and load.
 */
export function townVisionRadius(catalog: ContentCatalog, state: MatchState, town: TownState): number {
  let r = catalog.rulesProfile.townVisionRadius;
  for (const e of townEffects(catalog, town)) if (e.type === 'town_vision_radius') r = Math.max(r, e.radius);
  return r + townVisionBonus(catalog, state, town.id);
}

/** Training Academy terms in this town (null without one). */
export function townTraining(catalog: ContentCatalog, town: TownState): { xp: number; gold: number } | null {
  for (const e of townEffects(catalog, town)) if (e.type === 'enables_hero_training') return { xp: e.xp, gold: e.gold };
  return null;
}

/** Workshop stock (`enables_workshop`): how many items of which classes; null without one. */
export function townWorkshopStock(catalog: ContentCatalog, town: TownState): { stockSize: number; rarities: readonly ArtifactRarity[] } | null {
  let best: { stockSize: number; rarities: readonly ArtifactRarity[] } | null = null;
  for (const e of townEffects(catalog, town)) if (e.type === 'enables_workshop' && (!best || e.stockSize > best.stockSize)) best = { stockSize: e.stockSize, rarities: e.rarities };
  return best;
}

/** Artifact Merchant stock size in this town (0 without one). */
export function townMerchantStockSize(catalog: ContentCatalog, town: TownState): number {
  let n = 0;
  for (const e of townEffects(catalog, town)) if (e.type === 'enables_artifact_merchant') n = Math.max(n, e.stockSize);
  return n;
}

/** The support building of a role that is currently built in this town, if any. */
export function townRoleBuilding(catalog: ContentCatalog, town: TownState, role: string): BuildingDefinition | null {
  const slot = townSlots(catalog, town).find((s) => s.role === role);
  return slot ? activeBuildingInSlot(catalog, town, slot.id) : null;
}

export function townSpellLibraryTier(catalog: ContentCatalog, town: TownState, state?: Pick<MatchState, 'scenario'>): number {
  let tier = 0;
  for (const e of townEffects(catalog, town)) if (e.type === 'spell_library') tier = Math.max(tier, e.maxTier);
  // The existing final Sanctum houses the new advanced shelves; Wisdom still gates learning.
  // This changes only explicitly opted-in games and needs no fabricated building artwork.
  return tier >= 3 && state?.scenario.features?.mythicLibraryV2 ? Math.max(tier, 5) : tier;
}

/**
 * The spells this town's Sanctum teaches (sanctum-access spells only; god spells come
 * from eligibility): every spell of the town's own pantheon up to the library tier,
 * plus, per tier, a fixed draw of the shared spells filling the tier's library size.
 * The draw is a pure function of match, town and tier, so it never changes in a game.
 */
export function townLibrarySpells(catalog: ContentCatalog, state: Pick<MatchState, 'matchId' | 'scenario'>, town: TownState): SpellId[] {
  const maxTier = townSpellLibraryTier(catalog, town, state);
  const out: SpellId[] = [];
  const sizes = catalog.rulesProfile.librarySpellsPerTier;
  for (let tier = 1; tier <= maxTier; tier++) {
    const candidates = Object.values(catalog.spells)
      .filter((sp) => sp.tier === tier && sp.access === 'sanctum' && sp.implementationStatus === 'implemented' && scopeAllowed(state, sp.scope))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    const own = candidates.filter((sp) => sp.pantheonId === town.pantheonId).map((sp) => sp.id);
    const shared = candidates.filter((sp) => !sp.pantheonId).map((sp) => sp.id);
    const size = sizes[tier - 1] ?? sizes[sizes.length - 1] ?? 0;
    const room = Math.max(0, size - own.length);
    const picked: SpellId[] = [];
    if (shared.length <= room) picked.push(...shared);
    else {
      const rng = new RngCursor(seedFromLabel(`library|${state.matchId}|${town.id}|${tier}`));
      const pool = [...shared];
      while (picked.length < room && pool.length > 0) picked.push(pool.splice(rng.nextInt(pool.length), 1)[0]!);
      picked.sort();
    }
    out.push(...own, ...picked);
  }
  return out;
}

export function townHasEffect(catalog: ContentCatalog, town: TownState, type: EffectDefinition['type']): boolean {
  return townEffects(catalog, town).some((e) => e.type === type);
}

/** Creature forms currently recruitable in this town (from active dwelling effects). */
export function recruitableCreatureIds(catalog: ContentCatalog, town: TownState): CreatureId[] {
  const out: CreatureId[] = [];
  for (const e of townEffects(catalog, town)) if (e.type === 'recruit_access') out.push(e.creatureId);
  return out;
}

export function familyForSlot(catalog: ContentCatalog, slot: BuildingSlotDefinition): CreatureFamilyId | null {
  const first = slot.chain[0];
  if (!first) return null;
  return getBuilding(catalog, first).dwelling?.familyId ?? null;
}

export function playerTowns(state: MatchState, playerId: PlayerId): TownState[] {
  return Object.values(state.towns)
    .filter((t) => t.ownerId === playerId)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function isBuildUsedToday(state: MatchState, town: TownState): boolean {
  return town.buildUsedDay === state.day;
}

export function playerMarketCount(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): number {
  return playerTowns(state, playerId).filter((t) => townHasEffect(catalog, t, 'enables_market')).length;
}
