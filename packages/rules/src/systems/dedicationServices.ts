/**
 * City dedication SERVICES in quotes (CITY DEDICATIONS handoff §06, 2026-10-17; app 1.5.0).
 *
 * The active, eligible dedication of a town (`activeTownDedication`) grants ONE service
 * advantage, LOCAL to that town: a Gold discount on one kind of purchase made there, or
 * extra town vision. Every quote that a service can touch asks the one dispatcher below
 * (`cityServiceDiscount` / `townVisionBonus` → `resolveCityService`), which switches on the
 * service rule's `kind` only — never on a god or service ID — and checks the rule's data:
 * the location it needs built (`requiredRole` / `requiredRolesAny`, by slot role or the
 * favored family's dwelling metadata), the effect that location must provide
 * (`requiredEffect`) and the locations whose construction it discounts (`targetRole`).
 *
 * Arithmetic (§06): Gold only, other resources unchanged; per unit
 * `ceil(normal × (100 − percent) / 100)` (`dedicationGoldPrice`; a positive price stays
 * ≥ 1, zero stays 0), then × quantity — never a discount on a total. It is applied once,
 * after the ordinary price is known; with other independent percentage discounts the
 * HIGHEST percent applies (never added or compounded). Every discounted quote carries a
 * `DedicationSaving` breakdown (normal, final, saved Gold).
 *
 * Pure and read-only (no RNG, no mutation): the screens, the AI, previews and the commits
 * (which re-quote) all use these same functions. This module reads only the catalog, the
 * state and `./dedication`, so the town resolvers may use it (state-aware town vision).
 */
import type { ContentCatalog } from '../definitions/catalog';
import type { CityServiceId, CityServiceRole } from '../definitions/cityDedications';
import type { EffectDefinition } from '../definitions/logic';
import type { BuildingId, CreatureFamilyId, CreatureId, GodId, PlayerId, TownId } from '../ids';
import type { MatchState, TownState } from '../state/match';
import { resources, subtractResources, type ResourceBundle, type ResourceCost, type ResourceKey } from '../core/resources';
import { activeTownDedication, cityServiceRoleBuilt, dedicationGoldPrice, familyDwellingSlotId, type DedicationSaving } from './dedication';

// ---------------------------------------------------------------------------
// What a quote buys (the dispatcher's input)
// ---------------------------------------------------------------------------

/**
 * One purchase a service may discount, described by what it is — never by a service ID:
 * - `town_service`: a service of the town location that provides `effect` (hero training
 *   `enables_hero_training`, spellbooks `enables_spellbook_purchase`, the Artifact
 *   Merchant `enables_artifact_merchant`, the Workshop `enables_workshop`);
 * - `construction`: building or upgrading `buildingId` in this town;
 * - `recruit`: one creature of `creatureId` from this town's dwelling;
 * - `upgrade`: training one `creatureId` (the base form) into its upgraded form here;
 * - `market_buy`: buying one unit of `resource` with Gold at this town's market.
 */
export type CityServicePurchase =
  | { readonly kind: 'town_service'; readonly effect: EffectDefinition['type'] }
  | { readonly kind: 'construction'; readonly buildingId: BuildingId }
  | { readonly kind: 'recruit'; readonly creatureId: CreatureId }
  | { readonly kind: 'upgrade'; readonly creatureId: CreatureId }
  | { readonly kind: 'market_buy'; readonly resource: ResourceKey };

/** A dedication's Gold discount that applies to one purchase. */
export interface CityServiceDiscount {
  readonly godId: GodId;
  readonly serviceId: CityServiceId;
  readonly percent: number;
}

type CityServiceUse = CityServicePurchase | { readonly kind: 'town_vision' };

interface CityServiceGrant extends CityServiceDiscount {
  /** Extra hexes (`town_vision_bonus`). */
  readonly amount: number;
}

/** The town's built support locations whose active building provides `effect` (by slot role). */
function rolesProviding(catalog: ContentCatalog, town: TownState, effect: EffectDefinition['type']): CityServiceRole[] {
  const out: CityServiceRole[] = [];
  for (const slot of catalog.townArchetypes[town.archetypeId]?.slots ?? []) {
    if (slot.kind !== 'support' || !slot.role) continue;
    const level = town.buildings[slot.id] ?? 0;
    const id = level > 0 ? slot.chain[level - 1] : undefined;
    if (id && catalog.buildings[id]?.effects.some((e) => e.type === effect)) out.push(slot.role);
  }
  return out;
}

/** Whether building `buildingId` in this town builds or upgrades a location of `role` (support role, or the favored family's dwelling). */
function buildingInServiceRole(catalog: ContentCatalog, town: TownState, buildingId: BuildingId, role: CityServiceRole, familyId: CreatureFamilyId): boolean {
  const def = catalog.buildings[buildingId];
  const slot = def ? catalog.townArchetypes[town.archetypeId]?.slots.find((s) => s.id === def.slotId) : undefined;
  if (!def || !slot || !slot.chain.includes(buildingId)) return false;
  if (role === 'favored_dwelling' || role === 'favored_upgraded_dwelling') {
    if (slot.kind !== 'dwelling' || slot.id !== familyDwellingSlotId(catalog, town, familyId)) return false;
    if (def.dwelling && def.dwelling.familyId !== familyId) return false;
    return role === 'favored_dwelling' || def.level >= 2;
  }
  return slot.kind === 'support' && slot.role === role;
}

/**
 * THE service dispatcher: what the town's active dedication grants for `use`, or null.
 * Local to the town; only for the town's owner (`buyerId`); only while the dedication is
 * active and eligible; only with the rule's required location built. Switches on the
 * rule's `kind` (data), never on a god or service ID.
 */
function resolveCityService(catalog: ContentCatalog, state: MatchState, townId: TownId, use: CityServiceUse, buyerId: PlayerId | null): CityServiceGrant | null {
  const town = state.towns[townId];
  if (!town || !town.ownerId || (buyerId !== null && buyerId !== town.ownerId)) return null;
  const active = activeTownDedication(catalog, state, townId);
  if (!active) return null;
  const { godId, profile, rule } = active;
  const familyId = profile.favoredFamilyId;
  const built = (role: CityServiceRole) => cityServiceRoleBuilt(catalog, town, role, familyId);
  if (rule.requiredRole && !built(rule.requiredRole)) return null;
  if (rule.requiredRolesAny && !rule.requiredRolesAny.some(built)) return null;
  const percent = Math.max(0, Math.min(100, rule.percent ?? 0));
  const grant = (amount = 0): CityServiceGrant => ({ godId, serviceId: profile.serviceId, percent, amount });
  let applies = false;
  switch (rule.kind) {
    case 'gold_discount':
    case 'shop_gold_discount': {
      // A service of a location: the purchase's providing location must be one the rule names.
      if (use.kind !== 'town_service') break;
      if (rule.requiredEffect && rule.requiredEffect !== use.effect) break;
      const roles = rule.requiredRolesAny ?? (rule.requiredRole ? [rule.requiredRole] : []);
      const providers = rolesProviding(catalog, town, use.effect);
      applies = roles.some((r) => providers.includes(r));
      break;
    }
    case 'construction_gold_discount':
    case 'family_dwelling_gold_discount':
      applies = use.kind === 'construction' && !!rule.targetRole && buildingInServiceRole(catalog, town, use.buildingId, rule.targetRole, familyId);
      break;
    case 'family_recruit_gold_discount':
      applies = use.kind === 'recruit' && catalog.creatures[use.creatureId]?.familyId === familyId;
      break;
    case 'family_upgrade_gold_discount':
      applies = use.kind === 'upgrade' && catalog.creatures[use.creatureId]?.familyId === familyId;
      break;
    case 'market_buy_discount':
      applies = use.kind === 'market_buy' && use.resource !== 'gold' && use.resource !== 'favor';
      break;
    case 'town_vision_bonus':
      if (use.kind === 'town_vision') return (rule.amount ?? 0) > 0 ? grant(rule.amount ?? 0) : null;
      break;
  }
  return applies && percent > 0 ? grant() : null;
}

/** The town's dedication discount for one purchase by `buyerId`, or null (local, active, eligible, building present). */
export function cityServiceDiscount(catalog: ContentCatalog, state: MatchState, buyerId: PlayerId, townId: TownId, purchase: CityServicePurchase): CityServiceDiscount | null {
  const g = resolveCityService(catalog, state, townId, purchase, buyerId);
  return g ? { godId: g.godId, serviceId: g.serviceId, percent: g.percent } : null;
}

/**
 * Extra hexes on this town's OWN vision radius from its dedication (0 without one): only
 * while the dedication is active and eligible and its required location (the Watchtower)
 * stands. Derived from the state every time — it follows dedication, temple or watchtower
 * loss, capture and load at once; nothing is stored and no fog is revealed by it.
 */
export function townVisionBonus(catalog: ContentCatalog, state: MatchState, townId: TownId): number {
  return resolveCityService(catalog, state, townId, { kind: 'town_vision' }, null)?.amount ?? 0;
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

/**
 * One unit's Gold after the best of several independent percentage discounts: the highest
 * percent applies — never added or compounded. Zero or negative prices are unchanged.
 */
export function discountedUnitGold(normalUnitGold: number, percents: readonly number[]): number {
  if (!(normalUnitGold > 0)) return normalUnitGold;
  const best = Math.max(0, ...percents);
  return best > 0 ? dedicationGoldPrice(normalUnitGold, best) : normalUnitGold;
}

/** One unit's price: the ordinary cost, the price charged, and the dedication discount behind it (null: none applied). */
export interface DedicatedUnitCost {
  readonly normal: ResourceBundle;
  readonly unit: ResourceBundle;
  readonly discount: CityServiceDiscount | null;
}

/**
 * One unit's price after the town's dedication service (Gold only). `normal` is the
 * ordinary unit cost with its existing modifiers already applied; `otherPercents` are any
 * other independent percentage discounts on the same Gold (the highest percent wins). The
 * returned `discount` is set only when the dedication's percent is the one applied and it
 * lowers a positive Gold price (so a saving is never 0).
 */
export function dedicatedUnitCost(
  catalog: ContentCatalog,
  state: MatchState,
  buyerId: PlayerId,
  townId: TownId,
  purchase: CityServicePurchase,
  normal: ResourceCost,
  otherPercents: readonly number[] = [],
): DedicatedUnitCost {
  const base = resources(normal);
  const found = base.gold > 0 ? cityServiceDiscount(catalog, state, buyerId, townId, purchase) : null;
  const percents = found ? [found.percent, ...otherPercents] : otherPercents;
  const gold = discountedUnitGold(base.gold, percents);
  const discount = found && found.percent >= Math.max(0, ...otherPercents) && gold < base.gold ? found : null;
  return { normal: base, unit: gold === base.gold ? base : { ...base, gold }, discount };
}

/** The `DedicationSaving` of `quantity` units (undefined without a discount or without a positive normal Gold price). */
export function dedicationSaving(discount: CityServiceDiscount | null, normalUnitGold: number, unitGold: number, quantity = 1): DedicationSaving | undefined {
  const qty = Number.isInteger(quantity) ? Math.max(0, quantity) : 0;
  if (!discount || !(normalUnitGold > 0) || qty < 1) return undefined;
  const normalGold = normalUnitGold * qty;
  const finalGold = unitGold * qty;
  return { godId: discount.godId, serviceId: discount.serviceId, percent: discount.percent, normalGold, finalGold, savedGold: normalGold - finalGold };
}

/** Several lines' savings added up (a recruit batch); undefined when none was discounted. */
export function sumDedicationSavings(savings: readonly (DedicationSaving | undefined)[]): DedicationSaving | undefined {
  let out: DedicationSaving | undefined;
  for (const s of savings) {
    if (!s) continue;
    out = out
      ? { ...out, normalGold: out.normalGold + s.normalGold, finalGold: out.finalGold + s.finalGold, savedGold: out.savedGold + s.savedGold }
      : s;
  }
  return out;
}

/**
 * THE per-unit recruitment price of a town creature (single recruit, recruit max, batch /
 * recruit all, AI, previews and commits all use it): the catalog price, then the favored
 * family's discount per unit. Callers multiply the unit price by the quantity.
 */
export function dedicatedRecruitUnitCost(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, creatureId: CreatureId): DedicatedUnitCost {
  const creature = catalog.creatures[creatureId];
  return dedicatedUnitCost(catalog, state, playerId, townId, { kind: 'recruit', creatureId }, creature?.cost ?? {});
}

/**
 * THE per-unit troop-upgrade price (base → upgraded form) in a town: the ordinary catalog
 * difference `upgraded.cost − base.cost`, then the favored family's discount on its Gold
 * per unit — never derived from (discounted) recruitment prices.
 */
export function dedicatedUpgradeUnitCost(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, baseCreatureId: CreatureId): DedicatedUnitCost {
  const base = catalog.creatures[baseCreatureId];
  const up = base?.upgradeId ? catalog.creatures[base.upgradeId] : undefined;
  const normal = base?.cost && up?.cost ? subtractResources(up.cost, base.cost) : resources();
  return dedicatedUnitCost(catalog, state, playerId, townId, { kind: 'upgrade', creatureId: baseCreatureId }, normal);
}

/** The lowest Gold buy rate a market may ever offer for `resource`: its best ordinary sell rate across all market tiers + 1. */
export function marketBuyRateFloor(catalog: ContentCatalog, resource: ResourceKey): number {
  const tiers = catalog.rulesProfile.market;
  const best = Math.max(0, ...tiers.map((t) => (resource === 'crystal' ? t.sellCrystal : t.sellCommon)));
  return best + 1;
}

/**
 * The Gold buy rate of one `resource` at this town's market for `playerId`, from the
 * ordinary rate of the player's market tier: with the town's market discount,
 * max(discounted rate, best ordinary sell rate across all tiers + 1) — so no buy/sell
 * round trip between any towns or tiers can make Gold. Sell rates never change, and the
 * town does not count as an extra market.
 */
export function dedicatedMarketBuyRate(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  townId: TownId,
  resource: ResourceKey,
  normalRate: number,
): { readonly rate: number; readonly normalRate: number; readonly discount: CityServiceDiscount | null } {
  const found = normalRate > 0 ? cityServiceDiscount(catalog, state, playerId, townId, { kind: 'market_buy', resource }) : null;
  if (!found) return { rate: normalRate, normalRate, discount: null };
  const rate = Math.min(normalRate, Math.max(discountedUnitGold(normalRate, [found.percent]), marketBuyRateFloor(catalog, resource)));
  return { rate, normalRate, discount: rate < normalRate ? found : null };
}
