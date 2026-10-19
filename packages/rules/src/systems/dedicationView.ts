/**
 * City dedications — the read-only town view for the screens and the AI (CITY DEDICATIONS
 * handoff §03, §04, §09; app 1.5.0). Pure: it reads the catalog and the state, computes the
 * same quotes the commands use, and never consumes a credit or sets a key.
 *
 * Privacy: another player's town shows only its honored god (a public fact of its Temple);
 * the pending switch, the benefits' progress and the choices are the owner's.
 */
import type { ContentCatalog } from '../definitions/catalog';
import type { CityServiceRole, CityServiceRule } from '../definitions/cityDedications';
import type { CreatureFamilyId, GodId, PlayerId, TownId } from '../ids';
import type { MatchState, TownState } from '../state/match';
import { resources } from '../core/resources';
import { townHasEffect } from '../resolvers/town';
import { quoteGodSelection } from './divine';
import {
  cityDedicationProfile,
  cityDedicationsEnabled,
  cityServiceRoleBuilt,
  cityServiceRule,
  dedicationEligibilityBlocker,
  favoredGrowthBlocker,
  honoredTownGod,
  nextWorldWeekBoundary,
  ownerIncomeShare,
  pendingTownDedication,
  quoteDedicateTown,
  quoteScheduleTownRededication,
  townDedicationBlocker,
  weeksUntilNextExtraCreature,
  worldWeekStartDay,
  type DedicationBenefitStatus,
  type TownDedicationView,
} from './dedication';

const OK: DedicationBenefitStatus = { ok: true, reason: null };
const no = (reason: string): DedicationBenefitStatus => ({ ok: false, reason });

function roleLabel(catalog: ContentCatalog, town: TownState, role: CityServiceRole, familyId: CreatureFamilyId): string {
  const family = catalog.families[familyId]?.name ?? familyId;
  if (role === 'favored_dwelling') return `the ${family} dwelling`;
  if (role === 'favored_upgraded_dwelling') return `the upgraded ${family} dwelling`;
  const slot = catalog.townArchetypes[town.archetypeId]?.slots.find((s) => s.kind === 'support' && s.role === role);
  return `the ${slot?.label ?? role}`;
}

/**
 * Whether the town has what a service needs (its normal service building; construction
 * discounts need nothing built — the ordinary build requirements still apply).
 */
export function cityServiceStatus(catalog: ContentCatalog, town: TownState, rule: CityServiceRule, familyId: CreatureFamilyId): DedicationBenefitStatus {
  if (rule.requiredRole && !cityServiceRoleBuilt(catalog, town, rule.requiredRole, familyId)) {
    const verb = rule.requiredRole === 'favored_upgraded_dwelling' && cityServiceRoleBuilt(catalog, town, 'favored_dwelling', familyId) ? 'Upgrade' : 'Build';
    const label = roleLabel(catalog, town, rule.requiredRole, familyId);
    return no(`${verb} ${verb === 'Upgrade' ? label.replace('the upgraded ', 'the ') : label} to use it`);
  }
  if (rule.requiredRolesAny && rule.requiredRolesAny.length > 0 && !rule.requiredRolesAny.some((r) => cityServiceRoleBuilt(catalog, town, r, familyId))) {
    return no(`Build ${rule.requiredRolesAny.map((r) => roleLabel(catalog, town, r, familyId)).join(' or ')} to use it`);
  }
  if (rule.requiredEffect && !townHasEffect(catalog, town, rule.requiredEffect as Parameters<typeof townHasEffect>[2])) {
    return no(rule.requiredRole ? `${capitalize(roleLabel(catalog, town, rule.requiredRole, familyId))} does not offer this yet` : 'Not offered in this town yet');
  }
  return OK;
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Why a god of the viewer's pantheon that is not yet chosen is a locked "future choice" (the commitment rules' reason). */
function futureChoiceReason(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, godId: GodId): string {
  const q = quoteGodSelection(catalog, state, viewerId, godId);
  const name = catalog.gods[godId]?.name ?? godId;
  if (q.state === 'available') return `Commit to ${name} first (Pantheon screen)`;
  if (q.state === 'unaffordable') return `Commit to ${name} first (${q.reason ?? 'not enough Favor'})`;
  return q.reason ?? 'Locked';
}

/**
 * The dedication pane of one town as `viewerId` sees it: whether the viewer may dedicate it,
 * the honored god (active or dormant, with the reason), a pending switch with the day it is
 * tried, the three benefits with their own prerequisite status, and the viewer's choices —
 * patron and committed minors (selectable when the command would be accepted) plus the
 * pantheon's other gods as locked future choices with the commitment rules' reasons.
 */
export function townDedicationView(catalog: ContentCatalog, state: MatchState, townId: TownId, viewerId: PlayerId): TownDedicationView {
  const enabled = cityDedicationsEnabled(state);
  const switchCost = resources(catalog.cityDedicationPolicy?.switchCost ?? {});
  const town = state.towns[townId];
  if (!town) return { enabled, townId, ownerId: null, town: no('Unknown town'), active: null, pending: null, benefits: null, options: [], action: null, switchCost };
  const ownerId = town.ownerId;
  const townBlocker = townDedicationBlocker(catalog, state, viewerId, townId);
  const isOwner = ownerId !== null && ownerId === viewerId;
  const next = nextWorldWeekBoundary(catalog, state);

  const honored = enabled ? honoredTownGod(state, townId) : null;
  const dormantReason = honored && ownerId ? dedicationEligibilityBlocker(catalog, state, ownerId, townId, honored) : null;
  const active = honored ? { godId: honored, state: dormantReason ? ('dormant' as const) : ('active' as const), dormantReason } : null;

  const p = enabled && isOwner ? pendingTownDedication(state, townId) : null;
  const pending = p
    ? {
        godId: p.godId,
        activationWeek: Math.max(p.activationWeek, next.week),
        activationDay: worldWeekStartDay(catalog, Math.max(p.activationWeek, next.week)),
        waitingReason: dedicationEligibilityBlocker(catalog, state, ownerId!, townId, p.godId),
      }
    : null;

  let benefits: TownDedicationView['benefits'] = null;
  const profile = honored && isOwner ? cityDedicationProfile(catalog, honored) : null;
  const rule = cityServiceRule(catalog, profile);
  if (profile && rule && ownerId) {
    const familyId = profile.favoredFamilyId;
    const stored = town.dedication?.growthCredits[familyId] ?? 0;
    const growthBlocker = dormantReason ?? favoredGrowthBlocker(catalog, town, familyId);
    benefits = {
      resource: {
        amount: ownerIncomeShare(profile.weeklyResource, state.players[ownerId]?.incomePercent ?? 100),
        nextPayoutDay: next.day,
        status: dormantReason ? no(dormantReason) : OK,
      },
      growth: {
        familyId,
        quartersPerWeek: profile.weeklyGrowthQuarters,
        storedQuarters: stored,
        extraNextWeek: growthBlocker ? 0 : Math.floor((stored + profile.weeklyGrowthQuarters) / 4),
        weeksUntilNextExtra: weeksUntilNextExtraCreature(profile.weeklyGrowthQuarters, stored),
        status: growthBlocker ? no(growthBlocker) : OK,
      },
      service: { serviceId: rule.id, rule, status: dormantReason ? no(dormantReason) : cityServiceStatus(catalog, town, rule, familyId) },
    };
  }

  const action: TownDedicationView['action'] = !enabled || !isOwner || townBlocker ? null : honored ? 'schedule' : 'dedicate';
  const options: TownDedicationView['options'][number][] = [];
  const player = state.players[viewerId];
  if (enabled && isOwner && player) {
    const committed = [player.pantheon.patronGodId, ...player.pantheon.minorGodIds].filter((g): g is GodId => !!g && !!cityDedicationProfile(catalog, g));
    const others = (catalog.pantheons[player.pantheonId]?.godIds ?? []).filter((g) => !committed.includes(g) && !!cityDedicationProfile(catalog, g));
    for (const godId of [...new Set(committed)]) {
      const q = honored ? quoteScheduleTownRededication(catalog, state, viewerId, townId, godId) : quoteDedicateTown(catalog, state, viewerId, townId, godId);
      options.push({ godId, selectable: q.legal, reason: q.reason, isActive: godId === honored, isPending: godId === p?.godId, committed: true });
    }
    for (const godId of others) {
      options.push({ godId, selectable: false, reason: futureChoiceReason(catalog, state, viewerId, godId), isActive: false, isPending: false, committed: false });
    }
  }

  return { enabled, townId, ownerId, town: townBlocker ? no(townBlocker) : OK, active, pending, benefits, options, action, switchCost };
}

/** Every town of `playerId` with its dedication view (town order), e.g. for the god card's "cities that could switch". */
export function playerDedicationViews(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): TownDedicationView[] {
  return Object.values(state.towns)
    .filter((t) => t.ownerId === playerId)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((t) => townDedicationView(catalog, state, t.id, playerId));
}
