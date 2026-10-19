/**
 * City dedications (CITY DEDICATIONS handoff, 2026-10-17; app 1.5.0) — the shared
 * contract. Pure, read-only resolvers that every other part (service quotes, AI,
 * screens) uses; the commands, the weekly processing and the capture clearing build
 * on them (`dedicationSystem.ts`, `ownership.ts`, `dedicationView.ts`). Design:
 * docs/divine-city-benefits-v1/CLAUDE_HANDOFF.txt (§03–§08).
 *
 * Everything here reads the state and the catalog only: no RNG, no mutation, no
 * idempotency keys, so previews and forecasts can be computed any number of times.
 * This module is a leaf (types, the catalog, the state and core/resources only): the
 * town resolvers and the service quotes import it, so it must never import them.
 */
import type { ContentCatalog } from '../definitions/catalog';
import type { CityDedicationProfile, CityServiceId, CityServiceRule, CityServiceRole } from '../definitions/cityDedications';
import type { EffectDefinition } from '../definitions/logic';
import type { SupportRole } from '../definitions/towns';
import type { CreatureFamilyId, GodId, PlayerId, TownId } from '../ids';
import type { MatchState, TownDedicationState, TownState } from '../state/match';
import { RESOURCE_KEYS, RESOURCE_LABELS, canAfford, resources, type ResourceBundle, type ResourceCost } from '../core/resources';

/** The scenario plays with city dedications (absent flag = off: older saves keep the old god economics). */
export function cityDedicationsEnabled(state: MatchState): boolean {
  return state.scenario.features?.cityDedicationsV1 === true;
}

export function cityDedicationProfile(catalog: ContentCatalog, godId: GodId | null | undefined): CityDedicationProfile | null {
  return godId ? (catalog.cityDedicationProfiles?.[godId] ?? null) : null;
}

export function cityServiceRule(catalog: ContentCatalog, profile: CityDedicationProfile | null | undefined): CityServiceRule | null {
  return profile ? (catalog.cityServiceRules?.[profile.serviceId] ?? null) : null;
}

/**
 * A dedication's Gold price per unit: ceil(normal × (100 − percent) / 100); a positive
 * price stays at least 1, a zero price stays 0. Recruitment and upgrades apply it PER
 * UNIT and then multiply by the quantity (no order-splitting exploit).
 */
export function dedicationGoldPrice(normalUnitGold: number, percent: number): number {
  if (!(normalUnitGold > 0)) return 0;
  const p = Math.max(0, Math.min(100, percent));
  return Math.max(1, Math.ceil((normalUnitGold * (100 - p)) / 100));
}

/** Built level of the town location with this support role (0 = not built or no such location). */
export function townRoleLevel(catalog: ContentCatalog, town: TownState, role: SupportRole): number {
  const arch = catalog.townArchetypes[town.archetypeId];
  const slot = arch?.slots.find((s) => s.kind === 'support' && s.role === role);
  return slot ? (town.buildings[slot.id] ?? 0) : 0;
}

/**
 * The dwelling location of a family in this town, or null: the dwelling location whose
 * buildings name the family in their dwelling metadata (else the archetype's dwelling of
 * the family's tier). A family of another pantheon has no dwelling here.
 */
export function familyDwellingSlotId(catalog: ContentCatalog, town: TownState, familyId: CreatureFamilyId): string | null {
  const family = catalog.families[familyId];
  const arch = catalog.townArchetypes[town.archetypeId];
  if (!family || !arch || family.pantheonId !== town.pantheonId) return null;
  const dwellings = arch.slots.filter((s) => s.kind === 'dwelling');
  const byMeta = dwellings.find((s) => s.chain.some((b) => catalog.buildings[b]?.dwelling?.familyId === familyId));
  if (byMeta) return byMeta.id;
  return dwellings.find((s) => s.tier === family.tier)?.id ?? null;
}

/** Built level of the family's dwelling (0 none, 1 base, 2 upgraded). */
export function familyDwellingLevel(catalog: ContentCatalog, town: TownState, familyId: CreatureFamilyId): number {
  const slotId = familyDwellingSlotId(catalog, town, familyId);
  return slotId ? (town.buildings[slotId] ?? 0) : 0;
}

/** Whether a service role is satisfied in this town for this favored family. */
export function cityServiceRoleBuilt(catalog: ContentCatalog, town: TownState, role: CityServiceRole, familyId: CreatureFamilyId): boolean {
  if (role === 'favored_dwelling') return familyDwellingLevel(catalog, town, familyId) >= 1;
  if (role === 'favored_upgraded_dwelling') return familyDwellingLevel(catalog, town, familyId) >= 2;
  return townRoleLevel(catalog, town, role) >= 1;
}

// ---------------------------------------------------------------------------
// Calendar and the owner's share
// ---------------------------------------------------------------------------

/** World week of a day (week 1 = days 1–7; the same calendar as `weekOf` in turn.ts). */
export function dedicationWeekOf(catalog: ContentCatalog, day: number): number {
  return 1 + Math.floor((day - 1) / catalog.rulesProfile.daysPerWeek);
}

/** The first day of a world week (week 2 starts on day 8). */
export function worldWeekStartDay(catalog: ContentCatalog, week: number): number {
  return (week - 1) * catalog.rulesProfile.daysPerWeek + 1;
}

/** The next world-week boundary from today: its week and first day (normally days 8, 15, 22 …). */
export function nextWorldWeekBoundary(catalog: ContentCatalog, state: Pick<MatchState, 'day'>): { readonly week: number; readonly day: number } {
  const week = dedicationWeekOf(catalog, state.day) + 1;
  return { week, day: worldWeekStartDay(catalog, week) };
}

/**
 * A weekly gift as the owner receives it: the owner's income handicap (`incomePercent`,
 * absent = 100) applied once, each resource rounded down — as `projectedIncome` does for
 * the daily income. The gift never enters the daily income.
 */
export function ownerIncomeShare(amount: ResourceCost, incomePercent = 100): ResourceBundle {
  const r = resources(amount);
  if (incomePercent === 100) return r;
  const out: Record<string, number> = {};
  for (const k of RESOURCE_KEYS) out[k] = Math.floor((r[k] * incomePercent) / 100);
  return resources(out);
}

/** "1 Crystal", "300 Gold, 2 Wood" — a resource bundle in words (non-zero amounts). */
export function resourceBundleText(amount: ResourceCost): string {
  const r = resources(amount);
  const parts = RESOURCE_KEYS.filter((k) => r[k] !== 0).map((k) => `${r[k]} ${RESOURCE_LABELS[k]}`);
  return parts.length > 0 ? parts.join(', ') : 'nothing';
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

type Refusal = { readonly code: string; readonly reason: string };

function godRefusal(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, godId: GodId): Refusal | null {
  const player = state.players[playerId];
  const god = catalog.gods[godId];
  if (!player || !god) return { code: 'not_found', reason: 'Unknown god' };
  if (!cityDedicationProfile(catalog, godId)) return { code: 'not_found', reason: `${god.name} has no city dedication` };
  if (god.pantheonId !== player.pantheonId) return { code: 'illegal_action', reason: `${god.name} belongs to another pantheon` };
  if (player.pantheon.patronGodId === godId) return null;
  if (player.pantheon.minorGodIds.includes(godId)) return null;
  if (god.role === 'patron') return { code: 'missing_requirement', reason: `${god.name} is not your patron` };
  return { code: 'missing_requirement', reason: `Commit to ${god.name} first (Pantheon screen)` };
}

function townRefusal(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId): Refusal | null {
  if (!cityDedicationsEnabled(state)) return { code: 'not_in_scope', reason: 'City dedications are not part of this scenario' };
  if (!catalog.cityDedicationPolicy) return { code: 'not_in_scope', reason: 'City dedications are not part of this build' };
  const town = state.towns[townId];
  const player = state.players[playerId];
  if (!town || !player) return { code: 'not_found', reason: 'Unknown town' };
  if (town.ownerId !== playerId) return { code: 'not_owner', reason: 'Not your town' };
  if (town.pantheonId !== player.pantheonId) {
    const name = catalog.pantheons[town.pantheonId]?.name ?? town.pantheonId;
    return { code: 'illegal_action', reason: `A ${name} town cannot honor gods of your pantheon; its buildings, income and recruits work as usual` };
  }
  const need = catalog.cityDedicationPolicy.requiredTempleLevel;
  if (townRoleLevel(catalog, town, 'pantheon_temple') < need) return { code: 'missing_requirement', reason: `Needs Temple level ${romanLevel(need)}` };
  return null;
}

function romanLevel(n: number): string {
  return ['0', 'I', 'II', 'III', 'IV', 'V'][n] ?? String(n);
}

/**
 * Why a god may not be honored by `playerId` right now (null: it may) — the player's
 * current patron or an already committed minor god of the player's pantheon. A dedication
 * never commits a god: the mission allowlist and exclusivity were honored when the god was
 * committed (`quoteGodSelection`), so a committed god is always eligible.
 */
export function godDedicationBlocker(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, godId: GodId): string | null {
  return godRefusal(catalog, state, playerId, godId)?.reason ?? null;
}

/** Why this town cannot hold a dedication of `playerId` now (null: it can): feature, ownership, pantheon, Temple II. */
export function townDedicationBlocker(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId): string | null {
  return townRefusal(catalog, state, playerId, townId)?.reason ?? null;
}

/** Why `godId` gives `ownerId` nothing in this town now (null: eligible): the town's conditions, then the god's. */
export function dedicationEligibilityBlocker(catalog: ContentCatalog, state: MatchState, ownerId: PlayerId, townId: TownId, godId: GodId): string | null {
  return townDedicationBlocker(catalog, state, ownerId, townId) ?? godDedicationBlocker(catalog, state, ownerId, godId);
}

/** The town's current dedication record (absent = none). */
export function townDedicationRecord(town: TownState | undefined): TownDedicationState | null {
  return town?.dedication ?? null;
}

/** The god the town honors for its CURRENT owner — active or dormant (null: none). */
export function honoredTownGod(state: MatchState, townId: TownId): GodId | null {
  const town = state.towns[townId];
  const rec = town?.dedication;
  return town && rec && rec.activeGodId && town.ownerId && rec.ownerId === town.ownerId ? rec.activeGodId : null;
}

/** The town's paid switch waiting for its week boundary, when it belongs to the current owner (null: none). */
export function pendingTownDedication(state: MatchState, townId: TownId): { readonly godId: GodId; readonly requestedBy: PlayerId; readonly activationWeek: number } | null {
  const town = state.towns[townId];
  const p = town?.dedication?.pending;
  return town && p && town.ownerId && p.requestedBy === town.ownerId ? p : null;
}

/**
 * The town's ACTIVE and currently ELIGIBLE dedication, or null: feature on, an active god
 * belonging to the current owner, the town eligible (owner, pantheon, Temple II) and the
 * god still the owner's patron or committed minor. A dormant dedication returns null —
 * no services, gifts or growth while invalid. Individual services additionally need
 * their own building (`cityServiceRoleBuilt`), checked where the service applies.
 */
export function activeTownDedication(catalog: ContentCatalog, state: MatchState, townId: TownId): { readonly godId: GodId; readonly profile: CityDedicationProfile; readonly rule: CityServiceRule } | null {
  const town = state.towns[townId];
  const godId = honoredTownGod(state, townId);
  if (!town || !godId || !town.ownerId) return null;
  if (dedicationEligibilityBlocker(catalog, state, town.ownerId, townId, godId)) return null;
  const profile = cityDedicationProfile(catalog, godId);
  const rule = cityServiceRule(catalog, profile);
  return profile && rule ? { godId, profile, rule } : null;
}

/** "Build the Bennu dwelling to begin" — why a favored family's extra stock cannot grow here (null: it can). */
export function favoredGrowthBlocker(catalog: ContentCatalog, town: TownState, familyId: CreatureFamilyId): string | null {
  if (familyDwellingLevel(catalog, town, familyId) >= 1) return null;
  const family = catalog.families[familyId];
  if (!family || family.pantheonId !== town.pantheonId) return `${family?.name ?? familyId} have no dwelling in this town`;
  return `Build the ${family.name} dwelling to begin`;
}

// ---------------------------------------------------------------------------
// Legacy god economics (§05): the gods' direct daily income and weekly growth bonus
// are replaced by the city profiles while the feature is on. Filtered at the god
// source only (never on the combined player effects); the catalog is never changed.
// ---------------------------------------------------------------------------

const DEFAULT_SUPPRESSED_TYPES: readonly EffectDefinition['type'][] = ['daily_income', 'weekly_growth_bonus'];

/** The direct god benefit types city dedications replace (policy data; the handoff's two types by default). */
export function suppressedGodEffectTypes(catalog: ContentCatalog): readonly EffectDefinition['type'][] {
  return catalog.cityDedicationPolicy?.suppressedGodEffectTypes ?? DEFAULT_SUPPRESSED_TYPES;
}

/** A god's direct benefits that stay empire-wide with city dedications on (the others are replaced). */
export function retainedGodBenefits(catalog: ContentCatalog, benefits: readonly EffectDefinition[]): EffectDefinition[] {
  const types = suppressedGodEffectTypes(catalog);
  return benefits.filter((e) => !types.includes(e.type));
}

export interface GodBenefitsForMode {
  /** The god's empire blessing in this mode (its direct benefits that apply). */
  readonly retained: readonly EffectDefinition[];
  /** Direct benefits replaced by the city dedication profiles (empty in legacy mode). */
  readonly suppressed: readonly EffectDefinition[];
  /** The empire blessing in words — never a line of a replaced benefit. */
  readonly summary: readonly string[];
}

/**
 * A god's effective empire blessing in a rules mode, for the god cards and the
 * encyclopedia. Legacy mode (`cityDedications` false): the god's benefits and summary
 * exactly as authored. City dedications: without the direct `daily_income` /
 * `weekly_growth_bonus` entries; the summary of an affected god is explicit content
 * data (`catalog.cityModeGodSummaries`), never parsed from the old sentences.
 */
export function godBenefitsForMode(catalog: ContentCatalog, godId: GodId, cityDedications: boolean): GodBenefitsForMode {
  const god = catalog.gods[godId];
  if (!god) return { retained: [], suppressed: [], summary: [] };
  if (!cityDedications) return { retained: [...god.benefits], suppressed: [], summary: [...god.benefitSummary] };
  const types = suppressedGodEffectTypes(catalog);
  const retained = god.benefits.filter((e) => !types.includes(e.type));
  const suppressed = god.benefits.filter((e) => types.includes(e.type));
  if (suppressed.length === 0) return { retained, suppressed, summary: [...god.benefitSummary] };
  const explicit = catalog.cityModeGodSummaries?.[godId];
  // Older catalogs without the explicit lines: keep only lines that pair one-to-one with a retained benefit.
  const fallback = god.benefitSummary.length === god.benefits.length ? god.benefitSummary.filter((_, i) => !types.includes(god.benefits[i]!.type)) : [];
  return { retained, suppressed, summary: [...(explicit ?? fallback)] };
}

/** `godBenefitsForMode` in the match's own rules mode. */
export function godBenefitsInMatch(catalog: ContentCatalog, state: MatchState, godId: GodId): GodBenefitsForMode {
  return godBenefitsForMode(catalog, godId, cityDedicationsEnabled(state));
}

// ---------------------------------------------------------------------------
// Commands: quotes (pure). The commits re-quote against the current state.
// ---------------------------------------------------------------------------

function godName(catalog: ContentCatalog, godId: GodId | null | undefined): string {
  return godId ? (catalog.gods[godId]?.name ?? godId) : '';
}

function quoteShell(catalog: ContentCatalog, state: MatchState, townId: TownId, godId: GodId, cost: ResourceBundle, activation: TownDedicationQuote['activation']): Omit<TownDedicationQuote, 'legal' | 'code' | 'reason'> {
  const next = nextWorldWeekBoundary(catalog, state);
  return { townId, godId, cost, activation, activationDay: next.day, activationWeek: next.week, currentGodId: honoredTownGod(state, townId) };
}

function finish(shell: Omit<TownDedicationQuote, 'legal' | 'code' | 'reason'>, refusal: Refusal | null): TownDedicationQuote {
  return { ...shell, legal: refusal === null, code: refusal?.code ?? null, reason: refusal?.reason ?? null };
}

function sharedRefusal(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, godId: GodId): Refusal | null {
  return townRefusal(catalog, state, playerId, townId) ?? godRefusal(catalog, state, playerId, godId);
}

/**
 * The FIRST dedication of a town: free (`policy.firstDedicationCost`), its service works at
 * once, its weekly gift and growth start at the next world-week boundary; it grants no
 * resources or population on selection. Legal only while the town has neither an honored
 * god (active or dormant) nor a pending switch — it can never bypass a pending switch.
 */
export function quoteDedicateTown(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, godId: GodId): TownDedicationQuote {
  const cost = resources(catalog.cityDedicationPolicy?.firstDedicationCost ?? {});
  const shell = quoteShell(catalog, state, townId, godId, cost, 'immediate');
  const refusal = sharedRefusal(catalog, state, playerId, townId, godId);
  if (refusal) return finish(shell, refusal);
  const town = state.towns[townId]!;
  const current = honoredTownGod(state, townId);
  if (current) return finish(shell, { code: 'already_done', reason: `${town.name} already honors ${godName(catalog, current)}; schedule a change instead` });
  const pending = pendingTownDedication(state, townId) ?? town.dedication?.pending ?? null;
  if (pending) return finish(shell, { code: 'already_done', reason: `A change to ${godName(catalog, pending.godId)} is already scheduled` });
  if (!canAfford(state.players[playerId]!.wallet, cost)) return finish(shell, { code: 'insufficient_resources', reason: `Requires ${resourceBundleText(cost)}` });
  return finish(shell, null);
}

/**
 * A paid SWITCH (`policy.switchCost`, spent on confirmation, never refunded): the new god
 * takes over at the next world-week boundary; the current god stays until then. Needs an
 * honored god; only one pending switch (no cancel in this version); never the honored or
 * the pending god again.
 */
export function quoteScheduleTownRededication(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, godId: GodId): TownDedicationQuote {
  const cost = resources(catalog.cityDedicationPolicy?.switchCost ?? {});
  const shell = quoteShell(catalog, state, townId, godId, cost, 'next_week');
  const refusal = sharedRefusal(catalog, state, playerId, townId, godId);
  if (refusal) return finish(shell, refusal);
  const town = state.towns[townId]!;
  const current = honoredTownGod(state, townId);
  if (!current) return finish(shell, { code: 'missing_requirement', reason: `Dedicate ${town.name} first (the first dedication is free)` });
  const pending = pendingTownDedication(state, townId);
  if (pending) {
    const day = worldWeekStartDay(catalog, Math.max(pending.activationWeek, shell.activationWeek));
    const again = pending.godId === godId ? `${godName(catalog, godId)} is already scheduled` : `A change to ${godName(catalog, pending.godId)} is already scheduled`;
    return finish(shell, { code: 'already_done', reason: `${again} for day ${day}; it cannot be cancelled in this version` });
  }
  if (current === godId) return finish(shell, { code: 'already_done', reason: `${town.name} already honors ${godName(catalog, godId)}` });
  if (!canAfford(state.players[playerId]!.wallet, cost)) return finish(shell, { code: 'insufficient_resources', reason: `Requires ${resourceBundleText(cost)}` });
  return finish(shell, null);
}

// ---------------------------------------------------------------------------
// The weekly transaction of one town (§04, §08), computed purely. The dawn applies
// exactly this plan (dedicationSystem.ts); forecasts compute it for the next boundary.
// ---------------------------------------------------------------------------

export interface TownDedicationWeekPlan {
  readonly townId: TownId;
  readonly week: number;
  readonly ownerId: PlayerId | null;
  /** A due pending switch that takes over at this boundary. */
  readonly activation: { readonly godId: GodId; readonly fromGodId: GodId | null; readonly playerId: PlayerId } | null;
  /** A due pending switch that is invalid now: it stays pending and is tried again at the next boundary. */
  readonly waiting: { readonly godId: GodId; readonly playerId: PlayerId; readonly reason: string } | null;
  /** A pending switch requested by someone who no longer owns the town (never activates; removed). */
  readonly dropPending: boolean;
  /** The honored god after any activation (null: none). */
  readonly godId: GodId | null;
  /** Why the honored god gives nothing at this boundary (dormant), or null. */
  readonly dormantReason: string | null;
  /** The owner's weekly gift (after the owner's income handicap), or null when none is paid. */
  readonly gift: ResourceBundle | null;
  /** The favored family's one credit update (quarter creatures), or null. */
  readonly growth: { readonly familyId: CreatureFamilyId; readonly quarters: number; readonly storedBefore: number; readonly added: number; readonly storedAfter: number } | null;
  /** Why the favored family accrues nothing this week while the god is eligible (no base dwelling), or null. */
  readonly growthBlockedReason: string | null;
}

/**
 * What the boundary of `week` does for one town: activate a due valid switch, pay the
 * eligible god's gift, update the favored family's credit (only with its base dwelling
 * built). Null when the town has no dedication record or already processed that week
 * (`lastProcessedWeek`). Pure: no idempotency key, no mutation.
 *
 * Growth: credit = stored + weeklyGrowthQuarters; extra = floor(credit / 4);
 * stored = credit % 4 — added once to the family's shared base/upgraded pool, never
 * multiplied by fortifications, events or other growth modifiers.
 */
export function planTownDedicationWeek(catalog: ContentCatalog, state: MatchState, townId: TownId, week: number): TownDedicationWeekPlan | null {
  const town = state.towns[townId];
  const rec = town?.dedication;
  if (!town || !rec || rec.lastProcessedWeek >= week) return null;
  const ownerId = town.ownerId;
  let godId = honoredTownGod(state, townId);
  let activation: TownDedicationWeekPlan['activation'] = null;
  let waiting: TownDedicationWeekPlan['waiting'] = null;
  let dropPending = false;
  const p = rec.pending;
  if (p && p.activationWeek <= week) {
    if (!ownerId || p.requestedBy !== ownerId) dropPending = true;
    else {
      const reason = dedicationEligibilityBlocker(catalog, state, ownerId, townId, p.godId);
      if (reason) waiting = { godId: p.godId, playerId: ownerId, reason };
      else {
        activation = { godId: p.godId, fromGodId: godId, playerId: ownerId };
        godId = p.godId;
      }
    }
  }
  const dormantReason = godId && ownerId ? dedicationEligibilityBlocker(catalog, state, ownerId, townId, godId) : null;
  const profile = godId && ownerId && !dormantReason ? cityDedicationProfile(catalog, godId) : null;
  let gift: ResourceBundle | null = null;
  let growth: TownDedicationWeekPlan['growth'] = null;
  let growthBlockedReason: string | null = null;
  if (profile && ownerId) {
    gift = ownerIncomeShare(profile.weeklyResource, state.players[ownerId]?.incomePercent ?? 100);
    const familyId = profile.favoredFamilyId;
    growthBlockedReason = favoredGrowthBlocker(catalog, town, familyId);
    if (!growthBlockedReason) {
      const storedBefore = rec.growthCredits[familyId] ?? 0;
      const credit = storedBefore + profile.weeklyGrowthQuarters;
      growth = { familyId, quarters: profile.weeklyGrowthQuarters, storedBefore, added: Math.floor(credit / 4), storedAfter: credit % 4 };
    }
  }
  return { townId, week, ownerId, activation, waiting, dropPending, godId, dormantReason, gift, growth, growthBlockedReason };
}

/**
 * The next world-week boundary for one town as it stands now (null: no dedication
 * record). A preview: it consumes no credit, sets no key and changes nothing; the
 * dawn computes the same plan on the state it finds then.
 */
export function forecastTownDedicationWeek(catalog: ContentCatalog, state: MatchState, townId: TownId): TownDedicationWeekPlan | null {
  return planTownDedicationWeek(catalog, state, townId, nextWorldWeekBoundary(catalog, state).week);
}

/** Extra creatures of `familyId` this town's dedication adds at the next boundary (0: none) — for growth breakdowns. */
export function dedicationGrowthPreview(catalog: ContentCatalog, state: MatchState, townId: TownId, familyId: CreatureFamilyId): number {
  const g = forecastTownDedicationWeek(catalog, state, townId)?.growth;
  return g && g.familyId === familyId ? g.added : 0;
}

export interface TownDedicationProjection {
  readonly townId: TownId;
  readonly godId: GodId;
  /** Why this god would give nothing in this town now (null: eligible). */
  readonly blockedReason: string | null;
  /** Why its favored family would not grow (no base dwelling), or null. */
  readonly growthBlockedReason: string | null;
  /** The next `weeks` world-week boundaries, from the next one. */
  readonly weeks: readonly { readonly week: number; readonly day: number; readonly gift: ResourceBundle; readonly familyId: CreatureFamilyId; readonly added: number }[];
  readonly totalGift: ResourceBundle;
  readonly totalAdded: number;
}

/**
 * What honoring `godId` in this town would yield over the next `weeks` boundaries if nothing
 * else changed (the town's buildings, the owner's handicap, the family's stored credit): for
 * the AI's choice and the god cards. A first dedication and a switch both start paying at the
 * next boundary. Pure; consumes nothing.
 */
export function projectTownDedication(catalog: ContentCatalog, state: MatchState, townId: TownId, godId: GodId, weeks: number): TownDedicationProjection {
  const town = state.towns[townId];
  const profile = cityDedicationProfile(catalog, godId);
  const ownerId = town?.ownerId ?? null;
  const blockedReason = !town || !profile ? 'Unknown town or god' : !ownerId ? 'Not your town' : dedicationEligibilityBlocker(catalog, state, ownerId, townId, godId);
  const familyId = profile?.favoredFamilyId ?? '';
  const growthBlockedReason = town && profile && !blockedReason ? favoredGrowthBlocker(catalog, town, familyId) : null;
  const out: { week: number; day: number; gift: ResourceBundle; familyId: CreatureFamilyId; added: number }[] = [];
  let total = resources();
  let totalAdded = 0;
  if (town && profile && ownerId && !blockedReason) {
    const gift = ownerIncomeShare(profile.weeklyResource, state.players[ownerId]?.incomePercent ?? 100);
    const extras = growthBlockedReason ? new Array<number>(weeks).fill(0) : dedicationGrowthSchedule(profile.weeklyGrowthQuarters, town.dedication?.growthCredits[familyId] ?? 0, weeks);
    const first = nextWorldWeekBoundary(catalog, state).week;
    for (let i = 0; i < weeks; i++) {
      out.push({ week: first + i, day: worldWeekStartDay(catalog, first + i), gift, familyId, added: extras[i] ?? 0 });
      total = resources(Object.fromEntries(RESOURCE_KEYS.map((k) => [k, total[k] + gift[k]])));
      totalAdded += extras[i] ?? 0;
    }
  }
  return { townId, godId, blockedReason, growthBlockedReason, weeks: out, totalGift: total, totalAdded };
}

/** Eligible weeks until the next extra creature (≥ 1) with `storedQuarters` saved and `quartersPerWeek` added each week. */
export function weeksUntilNextExtraCreature(quartersPerWeek: number, storedQuarters: number): number {
  if (!(quartersPerWeek > 0)) return Infinity;
  return Math.max(1, Math.ceil((4 - storedQuarters) / quartersPerWeek));
}

/** Extra creatures in each of the next `weeks` eligible weeks (pure projection; nothing is consumed). */
export function dedicationGrowthSchedule(quartersPerWeek: number, storedQuarters: number, weeks: number): number[] {
  const out: number[] = [];
  let stored = storedQuarters;
  for (let i = 0; i < weeks; i++) {
    const credit = stored + quartersPerWeek;
    out.push(Math.floor(credit / 4));
    stored = credit % 4;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Read-only view for screens and the AI (shape agreed 2026-10-17; filled by
// `townDedicationView` in dedicationView.ts).
// ---------------------------------------------------------------------------

export interface DedicationBenefitStatus {
  /** The benefit works now (all its prerequisites met). */
  readonly ok: boolean;
  /** Why not, in player words ("Build the Bennu dwelling to begin"), or null. */
  readonly reason: string | null;
}

export interface TownDedicationView {
  /** The scenario has the feature. */
  readonly enabled: boolean;
  readonly townId: TownId;
  readonly ownerId: PlayerId | null;
  /** Whether `viewerId` may dedicate this town at all now (ownership, pantheon, Temple II). */
  readonly town: DedicationBenefitStatus;
  /** The honored god: active, or dormant (invalid now — no benefits) with the reason. Shown to every viewer. */
  readonly active: { readonly godId: GodId; readonly state: 'active' | 'dormant'; readonly dormantReason: string | null } | null;
  /**
   * A paid switch waiting for its week boundary (owner only). `activationDay` is the boundary it
   * will be tried at; `waitingReason` why it would not take over if tried now (null: it would).
   */
  readonly pending: { readonly godId: GodId; readonly activationDay: number; readonly activationWeek: number; readonly waitingReason: string | null } | null;
  /** The three benefits of the honored god (null without one, or for another player's town). */
  readonly benefits: {
    /** Each week's gift after the owner's income handicap; `nextPayoutDay` = the next world-week boundary. */
    readonly resource: { readonly amount: ResourceBundle; readonly nextPayoutDay: number; readonly status: DedicationBenefitStatus };
    /** Favored family growth: quarters per eligible week, stored remainder, weeks until the next extra creature. */
    readonly growth: {
      readonly familyId: CreatureFamilyId;
      readonly quartersPerWeek: number;
      readonly storedQuarters: number;
      readonly extraNextWeek: number;
      readonly weeksUntilNextExtra: number;
      readonly status: DedicationBenefitStatus;
    };
    readonly service: { readonly serviceId: string; readonly rule: CityServiceRule; readonly status: DedicationBenefitStatus };
  } | null;
  /** The viewer's choices: patron and committed minors (selectable), then the pantheon's other gods (locked "future choices"). */
  readonly options: readonly {
    readonly godId: GodId;
    readonly selectable: boolean;
    readonly reason: string | null;
    readonly isActive: boolean;
    readonly isPending: boolean;
    /** The viewer's patron or a committed minor (false: a locked future choice — commit on the Pantheon screen first). */
    readonly committed: boolean;
  }[];
  /** What choosing an option does: the free first dedication, a paid switch, or nothing (not the viewer's eligible town). */
  readonly action: 'dedicate' | 'schedule' | null;
  /** Price of scheduling a switch (first dedication is free). */
  readonly switchCost: ResourceBundle;
}

// ---------------------------------------------------------------------------
// Service savings in quotes (shape agreed 2026-10-17): every quote a service
// discounts carries `dedication?: DedicationSaving` next to its normal fields.
// ---------------------------------------------------------------------------

/** What a city dedication's service saved on one quote (Gold only; other resources unchanged). */
export interface DedicationSaving {
  readonly godId: GodId;
  readonly serviceId: CityServiceId;
  readonly percent: number;
  /** Total Gold without the discount (for quantities: normal per-unit price × quantity). */
  readonly normalGold: number;
  /** Total Gold charged (discounted per-unit price × quantity). */
  readonly finalGold: number;
  readonly savedGold: number;
}

// ---------------------------------------------------------------------------
// Commands (commands.ts; committed in dedicationSystem.ts):
//   { kind: 'DedicateTown', townId, godId }             — first dedication, free, immediate
//   { kind: 'ScheduleTownRededication', townId, godId } — paid switch at the next world week
// Events (events.ts): TownDedicated, TownRededicationScheduled, TownRededicationActivated,
// TownRededicationDelayed, TownDedicationCleared, CityGiftGranted, CityDevotionGrowthApplied.
// ---------------------------------------------------------------------------

export interface TownDedicationQuote {
  readonly legal: boolean;
  /** A RejectionCode when refused. */
  readonly code: string | null;
  readonly reason: string | null;
  readonly townId: TownId;
  readonly godId: GodId;
  /** Free for the first dedication; the switch fee for a rededication. */
  readonly cost: ResourceBundle;
  /** First dedication: services at once (gifts and growth from the next boundary); switch: at the next world week. */
  readonly activation: 'immediate' | 'next_week';
  /** World day and week on which the god's benefits begin (the weekly gift and growth: the next boundary). */
  readonly activationDay: number;
  readonly activationWeek: number;
  /** The god honored now (for a switch). */
  readonly currentGodId: GodId | null;
}
