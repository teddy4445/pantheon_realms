/**
 * City dedications for the strategic AI (CITY DEDICATIONS handoff §11; app 1.5.0).
 *
 * The AI plays the feature through the same view, quotes, forecasts and commands as a
 * person: `townDedicationView` (its selectable options are the patron and the committed
 * minor gods — never an auto-granted god or one of another pantheon), `projectTownDedication`
 * (gifts after the owner's income handicap, extra creatures from the stored credit),
 * `quoteConstruction` / `dedicatedRecruitUnitCost` / `cityServiceDiscount` /
 * `townVisionBonus` (the service the rules would grant), and the commands `DedicateTown`
 * and `ScheduleTownRededication`, which the controller submits through processCommand.
 * Belief state only; no random draw; no god or service is named in code (the rules'
 * service dispatcher is asked, on a copy of the belief in which the town honors the god).
 *
 * Valuation of honoring god G in town T, in Gold equivalent over the next
 * `DEDICATION_WEEKS` (4) weeks, cut to the estimated end of the scenario:
 *   resource — each weekly gift inside the horizon at the stat values (Wood/Stone 250,
 *              Crystal 500, Gold 1) × a need factor: resources short for the empire's build
 *              plan (the next `NEED_PLAN_PER_TOWN` buildings of every town by build score,
 *              against the stockpile and four weeks of income) weigh up to `SCARCE_FACTOR`,
 *              covered ones `COVERED_FACTOR`, unplanned ones `UNPLANNED_FACTOR`; Gold 1;
 *   growth   — the extra creatures that mature inside the horizon (rare tier 6–7 growth that
 *              cannot mature counts zero) when the favored dwelling stands — or is
 *              forthcoming (its requirements met or planned: one week later) — × the price
 *              of the form the AI buys × `GROWTH_STOCK_VALUE` × the share of that stock its
 *              recruiting budget can buy after the higher tiers (`recruitUsage`);
 *   service  — savings on transactions the AI plans, priced by the rules on the copy:
 *              planned construction in T (its next `PLAN_PER_TOWN` buildings), expected
 *              recruitment in T, hero training at T's academy, artifact purchases at T's
 *              shops, and T's vision. The AI never trades at the market, upgrades town
 *              stacks or buys spellbooks, so those services are worth nothing to it.
 *
 * First dedication (free): every eligible town without one takes its best option (Temple II
 * just built, a commitment made); ties go to the lower god ID. Gifts and growth start only
 * at the next week boundary, so when a god the empire will commit to before then (Favor
 * arriving with the dawns, `imminentCommitments`) would be worth a paid switch later, the
 * town waits for it — at most until the eve of the boundary.
 * Switch (paid): only after a trigger — a construction in the town today, or a committed
 * god honored nowhere in the empire (a new commitment) — never while a switch is pending,
 * and only when (value(best) − value(current)) × (1 − days until the next week ÷ 28) ≥
 * fee × `SWITCH_MARGIN`, both with the treasury's stockpile and without it (structural
 * need only), so a fluctuating resource count alone can never cause a switch. The fee must
 * leave the build reserve. All constants are proposed values, not playtest results.
 */
import {
  STAT_RESOURCE_VALUE,
  activeTownDedication,
  quoteGodSelection,
  cityDedicationProfile,
  cityDedicationsEnabled,
  cityServiceDiscount,
  dedicatedRecruitUnitCost,
  dedicationGoldPrice,
  dedicationGrowthSchedule,
  familyDwellingLevel,
  familyDwellingSlotId,
  goldEquivalent,
  nextWorldWeekBoundary,
  playerTowns,
  projectedIncome,
  projectTownDedication,
  quoteConstruction,
  recruitableCreatureIds,
  townDedicationView,
  townHasEffect,
  townRoleLevel,
  townSlots,
  townTraining,
  townVisionBonus,
  weeklyGrowthFor,
  type BuildingId,
  type CommandPayload,
  type ContentCatalog,
  type CreatureFamilyId,
  type EffectDefinition,
  type GodId,
  type MatchState,
  type PlayerId,
  type ResourceBundle,
  type TownId,
  type TownState,
} from '@pr/rules';
import { GROWTH_STOCK_VALUE, buildScore, dedicationGods } from './build';
import { aiTemperamentFor } from './temperament';
import { buildReserve, weekPlan } from './assessment';
import { godCommitScore } from './services';

/** The valuation window: four weeks (handoff §11). */
export const DEDICATION_WEEKS = 4;
/** A switch must add at least the fee × this (handoff §11: 25 % above the fee). */
export const SWITCH_MARGIN = 1.25;
/** Planned buildings per town (construction savings): its next levels with requirements met, best build score first. */
export const PLAN_PER_TOWN = 4;
/**
 * The resource need looks further ahead (the next eight per town), so that one construction
 * shifts it only a little and a switch follows a real change of the empire's needs.
 */
export const NEED_PLAN_PER_TOWN = 8;
/** Share of the weekly Gold income the AI spends on recruits (the rest on buildings, heroes, services). */
export const RECRUIT_SHARE = 0.6;
/** Need factors of a gift resource: short for the build plan (up to), covered, not planned at all. */
export const SCARCE_FACTOR = 1.6;
export const COVERED_FACTOR = 0.75;
export const UNPLANNED_FACTOR = 0.5;
/** Estimated scenario length (days) and the least remaining time assumed: skirmish / random maps. */
export const SKIRMISH_DAYS = 56;
export const SKIRMISH_MIN_REMAINING = 14;
/** …and a campaign chapter (chapters are short; the AI rivals there are the chapter's empires). */
export const CAMPAIGN_DAYS = 28;
export const CAMPAIGN_MIN_REMAINING = 7;
/** Weekly Gold income at which the AI is "rich": trains and shops at the full rates below. */
export const RICH_WEEKLY_GOLD = 7000;
/** Hero training sessions per hero and week at full richness (at most two heroes counted). */
export const TRAINING_SESSIONS_PER_WEEK = 0.5;
/** Artifact purchases per shop and week at full richness. */
export const SHOP_PURCHASES_PER_WEEK = 0.3;
/** A shop price assumed when the town's stock is unknown or empty. */
export const SHOP_PRICE_GUESS = 2000;
/** Worth of extra town vision per week (it warns of raiders; no fog is revealed). */
export const WATCH_VALUE_PER_WEEK = 50;

const MATERIALS = ['wood', 'stone', 'crystal'] as const;
const EPSILON = 1e-6;

export interface DedicationOptions {
  /** Override the estimated last day of the scenario (tests; default from the scenario kind). */
  readonly endDay?: number;
  /** Count the treasury's stockpile in the resource need (default true; false = structural need only). */
  readonly includeWallet?: boolean;
}

/** Shared inputs of one valuation pass (computed once for every town and god). */
export interface DedicationContext {
  readonly catalog: ContentCatalog;
  readonly belief: MatchState;
  readonly playerId: PlayerId;
  /** Week boundaries (gifts, growth) inside the horizon, 0–4. */
  readonly weeks: number;
  /** Weeks of service use inside the horizon (fractional), 0–4. */
  readonly serviceWeeks: number;
  readonly endDay: number;
  /** The next dawn's income (handicap applied). */
  readonly income: ResourceBundle;
  readonly weeklyGold: number;
  /** Strategic heroes (for training). */
  readonly heroes: number;
  /** Planned buildings per town. */
  readonly plan: ReadonlyMap<TownId, readonly BuildingId[]>;
  /** Wood, Stone and Crystal the plan needs. */
  readonly need: Readonly<Record<string, number>>;
  readonly includeWallet: boolean;
  /** Weekly Gold of the ordinary growth of every family the AI can recruit, by tier (empire-wide). */
  readonly tierSpend: readonly number[];
}

export interface DedicationValue {
  readonly townId: TownId;
  readonly godId: GodId;
  readonly resource: number;
  readonly growth: number;
  readonly service: number;
  readonly total: number;
  /** Extra creatures counted inside the horizon. */
  readonly extras: number;
}

/** Estimated last day of the scenario (no scenario announces one): campaign chapters and skirmishes differ. */
export function estimatedEndDay(belief: MatchState): number {
  return belief.scenario.campaignId ? Math.max(belief.day + CAMPAIGN_MIN_REMAINING, CAMPAIGN_DAYS) : Math.max(belief.day + SKIRMISH_MIN_REMAINING, SKIRMISH_DAYS);
}

/** Week boundaries from the next one up to `endDay`, at most `DEDICATION_WEEKS`. */
export function boundariesBefore(catalog: ContentCatalog, belief: MatchState, endDay: number): number {
  const first = nextWorldWeekBoundary(catalog, belief).day;
  if (endDay < first) return 0;
  return Math.min(DEDICATION_WEEKS, Math.floor((endDay - first) / catalog.rulesProfile.daysPerWeek) + 1);
}

/** The next levels of a town's locations whose requirements are met, best build score first (the AI's own order). */
export function plannedBuildings(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, town: TownState, heroCount: number, limit = PLAN_PER_TOWN): BuildingId[] {
  const temperament = aiTemperamentFor(catalog, belief, playerId);
  return townSlots(catalog, town)
    .map((slot) => slot.chain[town.buildings[slot.id] ?? 0])
    .filter((b): b is string => !!b)
    .filter((b) => {
      const st = quoteConstruction(catalog, belief, playerId, town.id, b).state;
      return st === 'available' || st === 'unaffordable' || st === 'used_today';
    })
    .map((b) => ({ b, score: buildScore(catalog, b, heroCount, temperament, { belief, playerId, townId: town.id }) }))
    .sort((x, y) => y.score - x.score || (x.b < y.b ? -1 : 1))
    .slice(0, limit)
    .map((x) => x.b);
}

/** The form of a family the AI recruits in this town (the upgraded one when its dwelling is upgraded — it buys that first). */
function recruitForm(catalog: ContentCatalog, town: TownState, familyId: CreatureFamilyId): string | null {
  const family = catalog.families[familyId];
  if (!family) return null;
  const forms = recruitableCreatureIds(catalog, town);
  const upgraded = family.upgradedCreatureId;
  if (upgraded && forms.includes(upgraded)) return upgraded;
  return forms.includes(family.baseCreatureId) ? family.baseCreatureId : familyDwellingLevel(catalog, town, familyId) >= 1 ? null : family.baseCreatureId;
}

function unitGold(catalog: ContentCatalog, creatureId: string | null): number {
  return creatureId ? (catalog.creatures[creatureId]?.cost?.gold ?? 0) : 0;
}

export function dedicationContext(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, opts: DedicationOptions = {}): DedicationContext {
  const endDay = opts.endDay ?? estimatedEndDay(belief);
  const weeks = boundariesBefore(catalog, belief, endDay);
  const serviceWeeks = Math.max(0, Math.min(DEDICATION_WEEKS, (endDay - belief.day + 1) / catalog.rulesProfile.daysPerWeek));
  const income = projectedIncome({ catalog, state: belief }, playerId);
  const heroes = Object.values(belief.heroes).filter((h) => h.ownerId === playerId && h.status === 'active' && h.ai?.profile !== 'patrol').length;
  const towns = playerTowns(belief, playerId);
  const plan = new Map<TownId, BuildingId[]>();
  const need: Record<string, number> = { wood: 0, stone: 0, crystal: 0 };
  for (const town of towns) {
    const list = plannedBuildings(catalog, belief, playerId, town, heroes, NEED_PLAN_PER_TOWN);
    plan.set(town.id, list.slice(0, PLAN_PER_TOWN));
    for (const b of list) for (const r of MATERIALS) need[r] = (need[r] ?? 0) + (catalog.buildings[b]?.cost[r] ?? 0);
  }
  // What the AI buys each week before a family of tier t (it recruits the highest tier first).
  const tierSpend = new Array<number>(9).fill(0);
  for (const town of towns) {
    for (const familyId of Object.keys(town.population)) {
      const family = catalog.families[familyId];
      if (!family || familyDwellingLevel(catalog, town, familyId) < 1) continue;
      tierSpend[family.tier] = (tierSpend[family.tier] ?? 0) + weeklyGrowthFor(catalog, town, familyId, belief) * unitGold(catalog, recruitForm(catalog, town, familyId));
    }
  }
  return { catalog, belief, playerId, weeks, serviceWeeks, endDay, income, weeklyGold: income.gold * catalog.rulesProfile.daysPerWeek, heroes, plan, need, includeWallet: opts.includeWallet !== false, tierSpend };
}

/** How much a gift resource is worth to the empire now (1 = its stat value). */
export function resourceNeedFactor(ctx: DedicationContext, resource: string): number {
  if (!(MATERIALS as readonly string[]).includes(resource)) return 1;
  const need = ctx.need[resource] ?? 0;
  if (need <= 0) return UNPLANNED_FACTOR;
  const wallet = ctx.includeWallet ? (ctx.belief.players[ctx.playerId]?.wallet[resource as 'wood'] ?? 0) : 0;
  const have = wallet + (ctx.income[resource as 'wood'] ?? 0) * ctx.catalog.rulesProfile.daysPerWeek * Math.max(1, ctx.weeks);
  if (have >= need) return COVERED_FACTOR;
  return COVERED_FACTOR + ((SCARCE_FACTOR - COVERED_FACTOR) * (need - have)) / need;
}

/**
 * Share (0–1) of a family's weekly pool in a town (its ordinary growth there plus the extra,
 * `poolGoldPerWeek`) that the recruiting budget (`RECRUIT_SHARE` of the weekly Gold income)
 * can buy after the ordinary growth of every higher tier in the empire — the AI recruits the
 * highest tier first.
 */
export function recruitUsage(ctx: DedicationContext, tier: number, poolGoldPerWeek: number): number {
  if (poolGoldPerWeek <= 0) return 1;
  const above = ctx.tierSpend.slice(tier + 1).reduce((a, b) => a + b, 0);
  return Math.max(0, Math.min(1, (ctx.weeklyGold * RECRUIT_SHARE - above) / poolGoldPerWeek));
}

/** Whether a family's base dwelling stands in the town, or is forthcoming (requirements met, or in the plan). */
function dwellingStatus(ctx: DedicationContext, town: TownState, familyId: CreatureFamilyId): 'built' | 'forthcoming' | 'absent' {
  if (familyDwellingLevel(ctx.catalog, town, familyId) >= 1) return 'built';
  const slotId = familyDwellingSlotId(ctx.catalog, town, familyId);
  const slot = slotId ? townSlots(ctx.catalog, town).find((s) => s.id === slotId) : undefined;
  const base = slot?.chain[0];
  if (!base) return 'absent';
  if ((ctx.plan.get(town.id) ?? []).includes(base)) return 'forthcoming';
  const st = quoteConstruction(ctx.catalog, ctx.belief, ctx.playerId, town.id, base).state;
  return st === 'available' || st === 'unaffordable' || st === 'used_today' ? 'forthcoming' : 'absent';
}

/** The belief with `townId` honoring `godId` for its owner (a read-only copy for the rules' service quotes). */
export function withDedication(belief: MatchState, townId: TownId, godId: GodId, playerId: PlayerId): MatchState {
  const town = belief.towns[townId]!;
  const rec = town.dedication;
  return {
    ...belief,
    towns: { ...belief.towns, [townId]: { ...town, dedication: { activeGodId: godId, ownerId: playerId, growthCredits: { ...(rec?.growthCredits ?? {}) }, lastProcessedWeek: rec?.lastProcessedWeek ?? 0 } } },
  };
}

/** The weekly Gold income as a 0.25–1 richness (the AI trains and shops above Gold reserves). */
function richness(ctx: DedicationContext): number {
  return Math.max(0.25, Math.min(1, ctx.weeklyGold / RICH_WEEKLY_GOLD));
}

/** Average Gold price in a town shop's current stock (a guess when empty). */
function shopPrice(ctx: DedicationContext, town: TownState, effect: EffectDefinition['type']): number {
  const stock = effect === 'enables_workshop' ? town.workshop?.stock : town.merchant?.stock;
  const prices = (stock ?? []).flatMap((id) => (id ? [ctx.catalog.artifacts[id]?.merchantPrice?.gold ?? 0] : [])).filter((g) => g > 0);
  return prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : SHOP_PRICE_GUESS;
}

const SHOP_EFFECTS: readonly EffectDefinition['type'][] = ['enables_artifact_merchant', 'enables_workshop'];

/** Value of honoring `godId` in `townId` over the window (Gold equivalent; see the module comment). */
export function dedicationValue(ctx: DedicationContext, townId: TownId, godId: GodId): DedicationValue {
  const { catalog, belief, playerId } = ctx;
  const town = belief.towns[townId];
  const profile = cityDedicationProfile(catalog, godId);
  const zero = { townId, godId, resource: 0, growth: 0, service: 0, total: 0, extras: 0 };
  if (!town || !profile) return zero;
  const projection = projectTownDedication(catalog, belief, townId, godId, DEDICATION_WEEKS);
  if (projection.blockedReason) return zero;

  // Resource: each gift inside the horizon, weighed by the empire's need.
  let resource = 0;
  for (const w of projection.weeks.slice(0, ctx.weeks)) {
    for (const [k, v] of Object.entries(w.gift)) if (v > 0) resource += v * (STAT_RESOURCE_VALUE[k as keyof typeof STAT_RESOURCE_VALUE] ?? 0) * resourceNeedFactor(ctx, k);
  }

  // Growth: extra creatures that mature inside the horizon, worth a share of their price when the AI can buy them.
  const familyId = profile.favoredFamilyId;
  const family = catalog.families[familyId];
  const dwelling = dwellingStatus(ctx, town, familyId);
  const stored = town.dedication?.growthCredits[familyId] ?? 0;
  const extrasByWeek = dwelling === 'built' ? projection.weeks.slice(0, ctx.weeks).map((w) => w.added) : dwelling === 'forthcoming' ? dedicationGrowthSchedule(profile.weeklyGrowthQuarters, stored, Math.max(0, ctx.weeks - 1)) : [];
  const extras = extrasByWeek.reduce((a, b) => a + b, 0);
  const form = recruitForm(catalog, town, familyId);
  const price = unitGold(catalog, form);
  const ordinary = dwelling === 'built' ? weeklyGrowthFor(catalog, town, familyId, belief) * price : 0;
  const usage = family && extras > 0 ? recruitUsage(ctx, family.tier, ordinary + (extras / Math.max(1, ctx.weeks)) * price) : 0;
  const growth = extras * price * GROWTH_STOCK_VALUE * usage;

  // Service: savings on the AI's own planned transactions, priced by the rules on a copy where the town honors the god.
  let service = 0;
  const hypo = withDedication(belief, townId, godId, playerId);
  if (activeTownDedication(catalog, hypo, townId) && ctx.serviceWeeks > 0) {
    const span = Math.min(1, ctx.serviceWeeks / DEDICATION_WEEKS);
    for (const b of ctx.plan.get(townId) ?? []) service += (quoteConstruction(catalog, hypo, playerId, townId, b).dedication?.savedGold ?? 0) * span;
    // A forthcoming favored dwelling is built in the window too (its own discount, when the service has one).
    if (dwelling === 'forthcoming') {
      const slotId = familyDwellingSlotId(catalog, town, familyId);
      const base = slotId ? townSlots(catalog, town).find((s) => s.id === slotId)?.chain[0] : undefined;
      if (base && !(ctx.plan.get(townId) ?? []).includes(base)) service += (quoteConstruction(catalog, hypo, playerId, townId, base).dedication?.savedGold ?? 0) * span;
    }
    for (const creatureId of recruitableCreatureIds(catalog, town)) {
      const c = catalog.creatures[creatureId];
      if (!c || recruitForm(catalog, town, c.familyId) !== creatureId) continue;
      const priced = dedicatedRecruitUnitCost(catalog, hypo, playerId, townId, creatureId);
      if (!priced.discount) continue;
      const fam = catalog.families[c.familyId];
      const weekly = weeklyGrowthFor(catalog, town, c.familyId, belief) + (c.familyId === familyId ? extras / Math.max(1, ctx.weeks) : 0);
      const use = fam ? recruitUsage(ctx, fam.tier, weekly * priced.normal.gold) : 0;
      service += (priced.normal.gold - priced.unit.gold) * weekly * use * ctx.serviceWeeks;
    }
    const terms = townTraining(catalog, town);
    if (terms && terms.gold > 0 && ctx.heroes > 0) {
      const d = cityServiceDiscount(catalog, hypo, playerId, townId, { kind: 'town_service', effect: 'enables_hero_training' });
      if (d) service += (terms.gold - dedicationGoldPrice(terms.gold, d.percent)) * TRAINING_SESSIONS_PER_WEEK * Math.min(2, ctx.heroes) * richness(ctx) * ctx.serviceWeeks;
    }
    for (const effect of SHOP_EFFECTS) {
      if (!townHasEffect(catalog, town, effect)) continue;
      const d = cityServiceDiscount(catalog, hypo, playerId, townId, { kind: 'town_service', effect });
      if (!d) continue;
      const p = shopPrice(ctx, town, effect);
      service += (p - dedicationGoldPrice(p, d.percent)) * SHOP_PURCHASES_PER_WEEK * richness(ctx) * ctx.serviceWeeks;
    }
    if (townVisionBonus(catalog, hypo, townId) > 0) service += WATCH_VALUE_PER_WEEK * ctx.serviceWeeks;
  }
  return { townId, godId, resource, growth, service, total: resource + growth + service, extras };
}

/** Best value first; equal values (within a millionth) by god ID — a stable tie-break. */
export function byDedicationValue(a: Pick<DedicationValue, 'godId' | 'total'>, b: Pick<DedicationValue, 'godId' | 'total'>): number {
  if (Math.abs(a.total - b.total) > EPSILON) return b.total - a.total;
  return a.godId < b.godId ? -1 : a.godId > b.godId ? 1 : 0;
}

/** A town this player could ever dedicate now: feature on, its own pantheon, Temple level met (cheap filter before the view). */
function candidateTown(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, town: TownState): boolean {
  const need = catalog.cityDedicationPolicy?.requiredTempleLevel;
  return need !== undefined && town.ownerId === playerId && town.pantheonId === belief.players[playerId]?.pantheonId && townRoleLevel(catalog, town, 'pantheon_temple') >= need;
}

/**
 * Minor gods the empire will commit to within `days` dawns: per exclusivity group, the god
 * `godCandidates` would choose (best commitment score) among those whose only missing
 * condition is Favor that the daily Favor income brings in time (or none: committable now).
 */
export function imminentCommitments(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, days: number): GodId[] {
  const player = belief.players[playerId];
  if (!player || days < 0) return [];
  const favorPerDay = projectedIncome({ catalog, state: belief }, playerId).favor;
  const best = new Map<string, { godId: GodId; score: number }>();
  for (const g of catalog.pantheons[player.pantheonId]?.godIds ?? []) {
    const def = catalog.gods[g];
    if (!def || !cityDedicationProfile(catalog, g)) continue;
    const q = quoteGodSelection(catalog, belief, playerId, g);
    const soon = q.state === 'available' || (q.state === 'unaffordable' && def.favorCost - player.wallet.favor <= favorPerDay * days);
    if (!soon) continue;
    const group = def.exclusivityGroup ?? g;
    const score = godCommitScore(catalog, belief, playerId, g);
    const cur = best.get(group);
    if (!cur || score > cur.score || (score === cur.score && g < cur.godId)) best.set(group, { godId: g, score });
  }
  return [...best.values()].map((x) => x.godId).sort();
}

/** The belief with `godIds` committed as well (a read-only copy for valuing a commitment to come). */
export function withCommitments(belief: MatchState, playerId: PlayerId, godIds: readonly GodId[]): MatchState {
  const player = belief.players[playerId]!;
  return { ...belief, players: { ...belief.players, [playerId]: { ...player, pantheon: { ...player.pantheon, minorGodIds: [...player.pantheon.minorGodIds, ...godIds] } } } };
}

/**
 * Whether a town should wait with its free first dedication: a god committed before the eve
 * of the next week boundary would beat today's best by at least a switch's fee × the margin
 * (so dedicating now would later call for a paid switch). Never on the eve itself.
 */
export function waitForCommitment(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, townId: TownId, bestNow: number, opts: DedicationOptions = {}): boolean {
  const daysLeft = nextWorldWeekBoundary(catalog, belief).day - belief.day;
  if (daysLeft <= 1) return false;
  const coming = imminentCommitments(catalog, belief, playerId, daysLeft - 1);
  if (coming.length === 0) return false;
  const hypo = withCommitments(belief, playerId, coming);
  const ctx = dedicationContext(catalog, hypo, playerId, opts);
  const later = Math.max(...coming.map((g) => dedicationValue(ctx, townId, g).total));
  const fee = goldEquivalent(catalog.cityDedicationPolicy?.switchCost ?? {});
  return later - bestNow >= fee * SWITCH_MARGIN;
}

/** The eligible gods of a town's view, ranked (only the view's selectable, committed options). */
export function rankTownDedications(ctx: DedicationContext, townId: TownId, godIds: readonly GodId[]): DedicationValue[] {
  return godIds.map((g) => dedicationValue(ctx, townId, g)).sort(byDedicationValue);
}

/**
 * Free first dedications: every eligible town without an honored god or a pending switch
 * takes its best eligible god (Temple II just built, or a town taken). Belief state only.
 */
export function dedicationCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, opts: DedicationOptions = {}): CommandPayload[] {
  const player = belief.players[playerId];
  if (!player || player.role === 'scripted_hostile' || !cityDedicationsEnabled(belief)) return [];
  const out: CommandPayload[] = [];
  let ctx: DedicationContext | null = null;
  for (const town of playerTowns(belief, playerId).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (!candidateTown(catalog, belief, playerId, town)) continue;
    const view = townDedicationView(catalog, belief, town.id, playerId);
    if (view.action !== 'dedicate') continue;
    const options = view.options.filter((o) => o.selectable && o.committed).map((o) => o.godId);
    if (options.length === 0) continue;
    ctx ??= dedicationContext(catalog, belief, playerId, opts);
    const best = rankTownDedications(ctx, town.id, options)[0];
    if (!best || waitForCommitment(catalog, belief, playerId, town.id, best.total, opts)) continue;
    out.push({ kind: 'DedicateTown', townId: town.id, godId: best.godId });
  }
  return out;
}

/**
 * When a town's dedication is weighed again: a construction in the town today (important
 * construction), or a committed god that no town of the empire honors or has scheduled (a
 * new commitment). The valuation itself depends on structure only for the switch test, so
 * weighing again on those days never flips on a resource count.
 */
export function switchTriggered(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, town: TownState): boolean {
  if (town.buildUsedDay === belief.day) return true;
  const honored = new Set<string>();
  for (const t of playerTowns(belief, playerId)) {
    const rec = t.dedication;
    if (rec?.ownerId === playerId && rec.activeGodId) honored.add(rec.activeGodId);
    if (rec?.pending?.requestedBy === playerId) honored.add(rec.pending.godId);
  }
  return dedicationGods(catalog, belief, playerId).some((g) => !honored.has(g));
}

export interface SwitchDecision {
  readonly townId: TownId;
  readonly currentGodId: GodId;
  readonly godId: GodId;
  /** Extra value of the switch after the delay, with the stockpile and with structural need only. */
  readonly gain: number;
  readonly structuralGain: number;
  readonly fee: number;
  readonly switch: boolean;
}

/**
 * The switch test for one town (null when no switch can be weighed: no active dedication,
 * a pending switch, no other eligible god). `switch` is true only when both gains reach the
 * fee × `SWITCH_MARGIN`.
 */
export function weighSwitch(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, townId: TownId, opts: DedicationOptions = {}): SwitchDecision | null {
  const view = townDedicationView(catalog, belief, townId, playerId);
  if (view.action !== 'schedule' || view.pending || !view.active || view.active.state !== 'active') return null;
  const current = view.active.godId;
  const options = view.options.filter((o) => o.selectable && o.committed && o.godId !== current).map((o) => o.godId);
  if (options.length === 0) return null;
  const delay = nextWorldWeekBoundary(catalog, belief).day - belief.day;
  const keep = Math.max(0, 1 - delay / (DEDICATION_WEEKS * catalog.rulesProfile.daysPerWeek));
  const withWallet = dedicationContext(catalog, belief, playerId, { ...opts, includeWallet: true });
  const best = rankTownDedications(withWallet, townId, options)[0]!;
  const gain = (best.total - dedicationValue(withWallet, townId, current).total) * keep;
  const structural: DedicationContext = { ...withWallet, includeWallet: false };
  const structuralGain = (dedicationValue(structural, townId, best.godId).total - dedicationValue(structural, townId, current).total) * keep;
  const fee = goldEquivalent(view.switchCost);
  const need = fee * SWITCH_MARGIN;
  return { townId, currentGodId: current, godId: best.godId, gain, structuralGain, fee, switch: gain >= need && structuralGain >= need };
}

/**
 * Paid switches: a town whose dedication is weighed again today (`switchTriggered`), with no
 * switch pending, schedules the best alternative when `weighSwitch` says so and the fee
 * leaves the Gold build reserve.
 */
export function rededicationCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, opts: DedicationOptions = {}): CommandPayload[] {
  const player = belief.players[playerId];
  if (!player || player.role === 'scripted_hostile' || !cityDedicationsEnabled(belief)) return [];
  const out: CommandPayload[] = [];
  const reserve = buildReserve(weekPlan(catalog, belief, playerId), 1500);
  for (const town of playerTowns(belief, playerId).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (!candidateTown(catalog, belief, playerId, town) || !switchTriggered(catalog, belief, playerId, town)) continue;
    const fee = catalog.cityDedicationPolicy?.switchCost.gold ?? 0;
    if (player.wallet.gold - fee < reserve) continue;
    const d = weighSwitch(catalog, belief, playerId, town.id, opts);
    if (d?.switch) out.push({ kind: 'ScheduleTownRededication', townId: town.id, godId: d.godId });
  }
  return out;
}
