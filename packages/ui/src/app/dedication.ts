/**
 * City dedications (CITY DEDICATIONS handoff §09, 2026-10-17; app 1.5.0) — the screens'
 * view models. Pure functions over the rules' read-only resolvers (`townDedicationView`,
 * `projectTownDedication`, `cityServiceStatus`, `godBenefitsForMode`, the service quotes'
 * `dedication` savings and the dedication events): they only choose words and pictures.
 * Nothing here prices, decides eligibility or changes a rule; every number shown comes
 * from the rules (the gift after the owner's handicap, the payout day, the growth credit,
 * the saved Gold).
 *
 * Player text never shows raw quarter counters: tiers 1–5 read "+2 each week" /
 * "+1 each week", rare families "One extra Bennu every 2 eligible weeks — 1 week
 * remaining".
 */
import {
  RESOURCE_KEYS,
  activeBuildingInSlot,
  cityDedicationProfile,
  cityDedicationsEnabled,
  cityServiceRule,
  cityServiceStatus,
  dedicationGrowthPreview,
  favoredGrowthBlocker,
  familyDwellingSlotId,
  forecastTownDedicationWeek,
  godBenefitsForMode,
  nextWorldWeekBoundary,
  playerDedicationViews,
  resourceBundleText,
  resources,
  townDedicationView,
  weeklyGrowthFor,
  weeksUntilNextExtraCreature,
  type CityServiceRole,
  type CityServiceRule,
  type ContentCatalog,
  type DedicationSaving,
  type GameEvent,
  type GodBenefitsForMode,
  type MatchState,
  type ResourceBundle,
  type ResourceCost,
  type ResourceKey,
  type TownDedicationView,
  type TownState,
} from '@pr/rules';

/** The scenario plays with city dedications (legacy saves and The Three Beacons: false — everything stays hidden). */
export function dedicationsOn(state: MatchState | null | undefined): boolean {
  return !!state && cityDedicationsEnabled(state);
}

const fmt = (n: number) => n.toLocaleString('en-US');

/** "Athena’s", "Ares’" — a god's name in the possessive. */
export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}’` : `${name}’s`;
}

export function godName(catalog: ContentCatalog, godId: string | null | undefined): string {
  return godId ? (catalog.gods[godId]?.name ?? godId) : '';
}

// ---------------------------------------------------------------------------
// Weekly gift
// ---------------------------------------------------------------------------

/** The resource a gift is paid in (its first non-zero resource; null for an empty gift). */
export function giftResource(amount: ResourceCost | null | undefined): ResourceKey | null {
  if (!amount) return null;
  const r = resources(amount);
  return RESOURCE_KEYS.find((k) => r[k] > 0) ?? null;
}

/** "+3 Stone each week" — always with "each week", never as a daily income. */
export function giftTitle(amount: ResourceCost): string {
  const r = resources(amount);
  if (!RESOURCE_KEYS.some((k) => r[k] > 0)) return 'No gift this week';
  return `+${resourceBundleText(amount).replace(/, /g, ', +')} each week`;
}

/** "Next gift on day 8". */
export function nextGiftText(day: number): string {
  return `Next gift on day ${day}`;
}

// ---------------------------------------------------------------------------
// Favored creature growth
// ---------------------------------------------------------------------------

/** Eligible weeks between two extra creatures (rare families: 2 or 4), 1 for tiers 1–5. */
export function growthPeriod(quartersPerWeek: number): number {
  return quartersPerWeek >= 4 ? 1 : Math.round(4 / Math.max(1, quartersPerWeek));
}

/** "+2 each week", "+1 each week", "+1 every 2 eligible weeks", "+1 every 4 eligible weeks". */
export function growthRateText(quartersPerWeek: number): string {
  if (quartersPerWeek >= 4) return `+${Math.floor(quartersPerWeek / 4)} each week`;
  return `+1 every ${growthPeriod(quartersPerWeek)} eligible weeks`;
}

/**
 * The favored family's growth in player words. Tiers 1–5: "+2 each week". Rare families:
 * "One extra Bennu every 2 eligible weeks — 1 week remaining" (with the saved progress;
 * without it, the rate alone).
 */
export function growthProgressText(creatureName: string, quartersPerWeek: number, storedQuarters: number | null): string {
  if (quartersPerWeek >= 4) return growthRateText(quartersPerWeek);
  const every = `One extra ${creatureName} every ${growthPeriod(quartersPerWeek)} eligible weeks`;
  if (storedQuarters === null) return every;
  const left = weeksUntilNextExtraCreature(quartersPerWeek, storedQuarters);
  return `${every} — ${left} ${left === 1 ? 'week' : 'weeks'} remaining`;
}

/** The base creature's singular and plural names for a family. */
export function familyNames(catalog: ContentCatalog, familyId: string): { family: string; one: string; many: string; baseId: string; upgradedId: string | null } {
  const f = catalog.families[familyId];
  const base = f ? catalog.creatures[f.baseCreatureId] : undefined;
  return { family: f?.name ?? familyId, one: base?.name ?? f?.name ?? familyId, many: base?.pluralName ?? f?.name ?? familyId, baseId: f?.baseCreatureId ?? '', upgradedId: f?.upgradedCreatureId ?? null };
}

// ---------------------------------------------------------------------------
// Service savings
// ---------------------------------------------------------------------------

/** "Athena’s patronage — saves 200 Gold". */
export function savingText(catalog: ContentCatalog, saving: DedicationSaving): string {
  return `${possessive(godName(catalog, saving.godId))} patronage — saves ${fmt(saving.savedGold)} Gold`;
}

/** "normally 1,000 Gold, now 800" — the price before and after, in words (never by a strike line alone). */
export function savingPriceText(saving: DedicationSaving): string {
  return `normally ${fmt(saving.normalGold)} Gold, now ${fmt(saving.finalGold)}`;
}

// ---------------------------------------------------------------------------
// Pictures: the town building a service needs or discounts
// ---------------------------------------------------------------------------

/** The role a service is about: the building it needs, else the one whose construction it discounts. */
export function serviceRole(rule: CityServiceRule): CityServiceRole | null {
  return rule.requiredRole ?? rule.targetRole ?? rule.requiredRolesAny?.[0] ?? null;
}

/**
 * The existing town-building picture for a service in a pantheon's town (archetype slot by
 * role, or the favored family's dwelling): in a town, the level that stands (else the first
 * level); outside a town, the first level. Null when the archetype has no such location.
 */
export function serviceBuildingArt(catalog: ContentCatalog, pantheonId: string, rule: CityServiceRule, familyId: string, town?: TownState | null): { artAssetId: string; name: string } | null {
  const role = serviceRole(rule);
  if (!role) return null;
  const archId = town?.archetypeId ?? catalog.pantheons[pantheonId]?.townArchetypeId;
  const arch = archId ? catalog.townArchetypes[archId] : undefined;
  if (!arch) return null;
  let slotId: string | null = null;
  let wantLevel = 1;
  if (role === 'favored_dwelling' || role === 'favored_upgraded_dwelling') {
    slotId = town ? familyDwellingSlotId(catalog, town, familyId) : (arch.slots.find((s) => s.kind === 'dwelling' && s.chain.some((b) => catalog.buildings[b]?.dwelling?.familyId === familyId))?.id ?? null);
    if (role === 'favored_upgraded_dwelling') wantLevel = 2;
  } else {
    slotId = arch.slots.find((s) => s.kind === 'support' && s.role === role)?.id ?? null;
  }
  const slot = slotId ? arch.slots.find((s) => s.id === slotId) : undefined;
  if (!slot) return null;
  const built = town ? activeBuildingInSlot(catalog, town, slot.id) : null;
  const def = built ?? catalog.buildings[slot.chain[Math.min(wantLevel, slot.chain.length) - 1] ?? ''] ?? catalog.buildings[slot.chain[0] ?? ''];
  return def ? { artAssetId: def.artAssetId, name: built ? def.name : slot.label } : null;
}

// ---------------------------------------------------------------------------
// The temple pane: three illustrated rows with their own prerequisite status
// ---------------------------------------------------------------------------

export type BenefitArt = { readonly type: 'resource'; readonly resource: ResourceKey } | { readonly type: 'creature'; readonly creatureId: string } | { readonly type: 'building'; readonly artAssetId: string; readonly name: string };

export interface BenefitRow {
  readonly kind: 'resource' | 'growth' | 'service';
  readonly title: string;
  readonly detail: string;
  /** Works now (true) or what is missing (false), in words. */
  readonly ok: boolean;
  readonly status: string;
  readonly art: BenefitArt | null;
}

/**
 * The honored god's three benefits in this town for its owner: the weekly gift (amount after
 * the handicap, next payout day), the favored family (shared pool, rate or rare progress,
 * what is missing) and the service (its building, its summary, its own prerequisite).
 */
export function townBenefitRows(catalog: ContentCatalog, state: MatchState, town: TownState, view: TownDedicationView): BenefitRow[] {
  const b = view.benefits;
  const godId = view.active?.godId;
  const profile = cityDedicationProfile(catalog, godId);
  if (!b || !profile || !godId) return [];
  const day = b.resource.nextPayoutDay;
  const res = giftResource(b.resource.amount);
  const fam = familyNames(catalog, b.growth.familyId);
  const pool = town.population[b.growth.familyId] ?? 0;
  const forms = fam.upgradedId ? `${fam.one} and ${catalog.creatures[fam.upgradedId]?.name ?? fam.upgradedId}` : fam.one;
  const rare = b.growth.quartersPerWeek < 4;
  const growthStatus = !b.growth.status.ok
    ? (b.growth.status.reason ?? 'Not growing now')
    : rare
      ? b.growth.extraNextWeek > 0
        ? `The next ${fam.one} arrives on day ${day}`
        : `${b.growth.weeksUntilNextExtra} eligible ${b.growth.weeksUntilNextExtra === 1 ? 'week' : 'weeks'} to the next ${fam.one}`
      : `+${b.growth.extraNextWeek} on day ${day}`;
  const art = serviceBuildingArt(catalog, town.pantheonId, b.service.rule, b.growth.familyId, town);
  return [
    {
      kind: 'resource',
      title: giftTitle(b.resource.amount),
      detail: 'Paid to your treasury at each new week, in this city only',
      ok: b.resource.status.ok,
      status: b.resource.status.ok ? nextGiftText(day) : (b.resource.status.reason ?? 'No gift while dormant'),
      art: res ? { type: 'resource', resource: res } : null,
    },
    {
      kind: 'growth',
      title: rare ? growthProgressText(fam.one, b.growth.quartersPerWeek, b.growth.status.ok ? b.growth.storedQuarters : null) : `${growthRateText(b.growth.quartersPerWeek)}: ${fam.family}`,
      detail: `Shared pool of ${forms} · ${fmt(pool)} available now · recruited at the usual price`,
      ok: b.growth.status.ok,
      status: growthStatus,
      art: fam.baseId ? { type: 'creature', creatureId: fam.baseId } : null,
    },
    {
      kind: 'service',
      title: b.service.rule.name,
      detail: b.service.rule.summary,
      ok: b.service.status.ok,
      status: b.service.status.ok ? 'Works in this city now' : (b.service.status.reason ?? 'Not available yet'),
      art: art ? { type: 'building', ...art } : null,
    },
  ];
}

// ---------------------------------------------------------------------------
// A god's city profile (selection cards, god cards, encyclopedia)
// ---------------------------------------------------------------------------

export interface GodCityProfile {
  readonly godId: string;
  readonly gift: ResourceBundle;
  readonly giftResource: ResourceKey | null;
  readonly giftTitle: string;
  readonly familyId: string;
  readonly familyName: string;
  readonly creatureId: string;
  readonly growthText: string;
  readonly rule: CityServiceRule;
  readonly serviceArt: { artAssetId: string; name: string } | null;
}

/** The god's authored profile in words and pictures (the catalog amounts, before any handicap). */
export function godCityProfile(catalog: ContentCatalog, godId: string, town?: TownState | null): GodCityProfile | null {
  const profile = cityDedicationProfile(catalog, godId);
  const rule = cityServiceRule(catalog, profile);
  const god = catalog.gods[godId];
  if (!profile || !rule || !god) return null;
  const fam = familyNames(catalog, profile.favoredFamilyId);
  const gift = resources(profile.weeklyResource);
  return {
    godId,
    gift,
    giftResource: giftResource(gift),
    giftTitle: giftTitle(gift),
    familyId: profile.favoredFamilyId,
    familyName: fam.family,
    creatureId: fam.baseId,
    growthText: profile.weeklyGrowthQuarters >= 4 ? `${growthRateText(profile.weeklyGrowthQuarters)}: ${fam.family}` : growthProgressText(fam.one, profile.weeklyGrowthQuarters, null),
    rule,
    serviceArt: serviceBuildingArt(catalog, god.pantheonId, rule, profile.favoredFamilyId, town ?? null),
  };
}

/** The gods (of any pantheon) whose city dedication favors this family, in catalog order. */
export function godsFavoringFamily(catalog: ContentCatalog, familyId: string): string[] {
  return Object.values(catalog.cityDedicationProfiles ?? {})
    .filter((p) => p.favoredFamilyId === familyId)
    .map((p) => p.godId)
    .filter((g) => !!catalog.gods[g]);
}

// ---------------------------------------------------------------------------
// God cards: empire blessing (mode-aware) and the player's cities
// ---------------------------------------------------------------------------

/** Where a god card is shown: in a city-dedication game, in a legacy game, or outside a game (encyclopedia). */
export type BlessingMode = 'city' | 'legacy' | 'outside';

export function blessingMode(state: MatchState | null | undefined): BlessingMode {
  if (!state) return 'outside';
  return cityDedicationsEnabled(state) ? 'city' : 'legacy';
}

/** The god's empire blessing for a mode: city mode without the replaced economy; legacy and outside exactly as authored. */
export function empireBlessing(catalog: ContentCatalog, godId: string, mode: BlessingMode): GodBenefitsForMode {
  return godBenefitsForMode(catalog, godId, mode === 'city');
}

/** The god keeps no empire-wide blessing with city dedications (Demeter, Freyja, Njord, Sobek, Inari, Tlaloc). */
export function blessingOnlyThroughCities(b: GodBenefitsForMode): boolean {
  return b.suppressed.length > 0 && b.retained.length === 0 && b.summary.length === 0;
}

export interface GodCityOption {
  readonly townId: string;
  readonly townName: string;
  /** honors: the god is honored there; pending: it takes over on `day`; free / switch: it could be chosen now; later: after a commitment; blocked: the town cannot. */
  readonly kind: 'honors' | 'pending' | 'free' | 'switch' | 'later' | 'blocked';
  readonly text: string;
  /** What would work at once there (null) or what is missing first, per benefit. */
  readonly growthMissing: string | null;
  readonly serviceMissing: string | null;
}

/**
 * The player's cities for one god card: where it is honored or scheduled, where it could be
 * chosen now (free first dedication, or a switch with its fee and day), where only after a
 * commitment, and why a town cannot; per town, what would work at once and what needs a
 * dwelling or a service building first. A commitment never changes any of them.
 */
export function godCityOptions(catalog: ContentCatalog, state: MatchState, playerId: string, godId: string): GodCityOption[] {
  if (!cityDedicationsEnabled(state)) return [];
  const profile = cityDedicationProfile(catalog, godId);
  const rule = cityServiceRule(catalog, profile);
  if (!profile || !rule) return [];
  const name = godName(catalog, godId);
  const out: GodCityOption[] = [];
  for (const view of playerDedicationViews(catalog, state, playerId)) {
    const town = state.towns[view.townId];
    if (!town) continue;
    const opt = view.options.find((o) => o.godId === godId);
    const growthMissing = view.town.ok ? favoredGrowthBlocker(catalog, town, profile.favoredFamilyId) : null;
    const service = view.town.ok ? cityServiceStatus(catalog, town, rule, profile.favoredFamilyId) : null;
    const serviceMissing = service && !service.ok ? service.reason : null;
    const base = { townId: town.id, townName: town.name, growthMissing, serviceMissing };
    const current = view.active ? godName(catalog, view.active.godId) : null;
    const pendingDay = view.pending?.activationDay;
    if (!view.town.ok) out.push({ ...base, kind: 'blocked', text: view.town.reason ?? 'Cannot be dedicated now' });
    else if (opt?.isActive) out.push({ ...base, kind: 'honors', text: view.active?.state === 'dormant' ? `Honors ${name} (dormant: ${view.active.dormantReason})` : `Honors ${name} now` });
    else if (opt?.isPending) out.push({ ...base, kind: 'pending', text: `${name} takes over on day ${pendingDay}` });
    else if (!opt || !opt.committed) out.push({ ...base, kind: 'later', text: current ? `Could switch from ${current} after you commit to ${name}` : `Could honor ${name} after you commit` });
    else if (opt.selectable && view.action === 'dedicate') out.push({ ...base, kind: 'free', text: `Free first dedication · services at once, gifts from day ${nextWorldWeekBoundary(catalog, state).day}` });
    else if (opt.selectable) out.push({ ...base, kind: 'switch', text: `Could switch from ${current ?? 'its god'} for ${fmt(view.switchCost.gold)} Gold · from day ${nextWorldWeekBoundary(catalog, state).day}` });
    else out.push({ ...base, kind: 'blocked', text: opt.reason ?? 'Cannot be chosen now' });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Recruitment: the growth breakdown
// ---------------------------------------------------------------------------

export interface GrowthBreakdown {
  readonly base: number;
  /** Fortification multiplier's share. */
  readonly fortification: number;
  /** Retained non-god and other modifiers (signatures, events, legacy god bonuses). */
  readonly other: number;
  /** The town's dedication increment at the next boundary (0: none) and its god. */
  readonly god: { readonly godId: string; readonly added: number; readonly quartersPerWeek: number; readonly storedQuarters: number; readonly blocked: string | null } | null;
  readonly total: number;
}

/**
 * Next week's growth of a family in a town, as the rules compute it: base, the fortification
 * effect, other modifiers (each the difference of the rules' own `weeklyGrowthFor` with and
 * without them), then the dedication's single increment (`dedicationGrowthPreview`, never
 * multiplied).
 */
export function growthBreakdown(catalog: ContentCatalog, state: MatchState, town: TownState, familyId: string): GrowthBreakdown {
  const family = catalog.families[familyId];
  const base = family?.baseGrowth ?? 0;
  const fortified = family ? weeklyGrowthFor(catalog, town, familyId) : 0;
  const withEffects = family ? weeklyGrowthFor(catalog, town, familyId, state) : 0;
  let god: GrowthBreakdown['god'] = null;
  if (cityDedicationsEnabled(state) && town.ownerId) {
    const view = townDedicationView(catalog, state, town.id, town.ownerId);
    const profile = view.active ? cityDedicationProfile(catalog, view.active.godId) : null;
    if (view.active && profile && profile.favoredFamilyId === familyId) {
      const plan = forecastTownDedicationWeek(catalog, state, town.id);
      const added = dedicationGrowthPreview(catalog, state, town.id, familyId);
      const blocked = view.active.state === 'dormant' ? view.active.dormantReason : (plan?.growthBlockedReason ?? favoredGrowthBlocker(catalog, town, familyId));
      god = { godId: view.active.godId, added, quartersPerWeek: profile.weeklyGrowthQuarters, storedQuarters: town.dedication?.growthCredits[familyId] ?? 0, blocked };
    }
  }
  return { base, fortification: fortified - base, other: withEffects - fortified, god, total: withEffects + (god?.added ?? 0) };
}

/** "10 base + 5 fortifications + 2 Athena = 17 next week" (zero terms left out, except the base). */
export function growthBreakdownText(catalog: ContentCatalog, g: GrowthBreakdown): string {
  const parts = [`${g.base} base`];
  if (g.fortification) parts.push(`${g.fortification > 0 ? '+ ' : '− '}${Math.abs(g.fortification)} fortifications`);
  if (g.other) parts.push(`${g.other > 0 ? '+ ' : '− '}${Math.abs(g.other)} other effects`);
  if (g.god && g.god.added > 0) parts.push(`+ ${g.god.added} ${godName(catalog, g.god.godId)}`);
  return `${parts.join(' ')} = ${g.total} next week`;
}

// ---------------------------------------------------------------------------
// Weekly summary: one grouped "City blessings" section, from the dawn's events
// ---------------------------------------------------------------------------

export interface CityBlessingLine {
  readonly townId: string;
  readonly townName: string;
  /** The god behind this line (after any activation). */
  readonly godId: string | null;
  readonly gift: ResourceBundle | null;
  readonly growth: { readonly familyId: string; readonly creatureId: string; readonly added: number; readonly total: number; readonly text: string } | null;
  readonly activated: { readonly godId: string; readonly fromGodId: string | null } | null;
  readonly delayed: { readonly godId: string; readonly reason: string } | null;
  readonly cleared: { readonly godId: string | null; readonly pendingGodId: string | null } | null;
}

export interface CityBlessingsSummary {
  readonly week: number;
  readonly lines: readonly CityBlessingLine[];
  /** All gifts added up. */
  readonly total: ResourceBundle;
}

const BLESSING_EVENTS = new Set(['CityGiftGranted', 'CityDevotionGrowthApplied', 'TownRededicationActivated', 'TownRededicationDelayed', 'TownDedicationCleared']);

/** Is this one of the events the city-blessings section is made of? */
export function isBlessingEvent(e: GameEvent): boolean {
  return BLESSING_EVENTS.has(e.kind);
}

/**
 * The viewer's city blessings from committed events (presentation only: built from what the
 * dawn already paid; showing it pays nothing): per town the gift, the new stock with the
 * pool it reached, rare-growth progress, an activated or delayed switch, a lost dedication.
 * Null when nothing concerns the viewer.
 */
export function cityBlessingsFromEvents(catalog: ContentCatalog, state: MatchState, events: readonly GameEvent[], viewerId: string): CityBlessingsSummary | null {
  const byTown = new Map<string, { godId: string | null; gift: ResourceBundle | null; growth: CityBlessingLine['growth']; activated: CityBlessingLine['activated']; delayed: CityBlessingLine['delayed']; cleared: CityBlessingLine['cleared'] }>();
  const at = (townId: string) => {
    let x = byTown.get(townId);
    if (!x) byTown.set(townId, (x = { godId: null, gift: null, growth: null, activated: null, delayed: null, cleared: null }));
    return x;
  };
  let week = 0;
  let total = resources();
  for (const e of events) {
    switch (e.kind) {
      case 'CityGiftGranted': {
        if (e.playerId !== viewerId) break;
        const x = at(e.townId);
        x.godId = e.godId;
        x.gift = resources(Object.fromEntries(RESOURCE_KEYS.map((k) => [k, (x.gift?.[k] ?? 0) + (e.amount[k] ?? 0)])));
        total = resources(Object.fromEntries(RESOURCE_KEYS.map((k) => [k, total[k] + (e.amount[k] ?? 0)])));
        week = Math.max(week, e.week);
        break;
      }
      case 'CityDevotionGrowthApplied': {
        if (e.playerId !== viewerId) break;
        const x = at(e.townId);
        x.godId = e.godId;
        const n = familyNames(catalog, e.familyId);
        const rare = e.quarters < 4;
        const gained = e.added > 0 ? `+${e.added} ${e.added === 1 ? n.one : n.many} (now ${fmt(e.total)} in the pool)` : null;
        const left = weeksUntilNextExtraCreature(e.quarters, e.remainingQuarters);
        const progress = rare ? `next extra ${n.one} in ${left} eligible ${left === 1 ? 'week' : 'weeks'}` : null;
        x.growth = { familyId: e.familyId, creatureId: n.baseId, added: e.added, total: e.total, text: [gained, progress].filter(Boolean).join(' · ') || `No new ${n.many} yet` };
        week = Math.max(week, e.week);
        break;
      }
      case 'TownRededicationActivated': {
        if (e.playerId !== viewerId) break;
        const x = at(e.townId);
        x.godId = e.godId;
        x.activated = { godId: e.godId, fromGodId: e.fromGodId };
        week = Math.max(week, e.week);
        break;
      }
      case 'TownRededicationDelayed': {
        if (e.playerId !== viewerId) break;
        const x = at(e.townId);
        x.delayed = { godId: e.godId, reason: e.reason };
        week = Math.max(week, e.week);
        break;
      }
      case 'TownDedicationCleared': {
        if (e.playerId !== viewerId) break;
        at(e.townId).cleared = { godId: e.godId, pendingGodId: e.pendingGodId };
        break;
      }
      default:
        break;
    }
  }
  if (byTown.size === 0) return null;
  const lines: CityBlessingLine[] = [...byTown.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([townId, x]) => ({ townId, townName: state.towns[townId]?.name ?? townId, ...x }));
  return { week, lines, total };
}

/** One line of the summary in words (the screen also shows it with portraits and icons). */
export function cityBlessingText(catalog: ContentCatalog, line: CityBlessingLine): string {
  const parts: string[] = [];
  if (line.activated) parts.push(`now honors ${godName(catalog, line.activated.godId)}${line.activated.fromGodId ? ` (was ${godName(catalog, line.activated.fromGodId)})` : ''}`);
  if (line.gift) parts.push(`+${resourceBundleText(line.gift).replace(/, /g, ', +')}`);
  if (line.growth) parts.push(line.growth.text);
  if (line.delayed) parts.push(`the change to ${godName(catalog, line.delayed.godId)} waits: ${line.delayed.reason} (tried again next week)`);
  if (line.cleared) parts.push(`lost: its dedication${line.cleared.godId ? ` to ${godName(catalog, line.cleared.godId)}` : ''} ended`);
  return `${line.townName}: ${parts.join(' · ')}`;
}
