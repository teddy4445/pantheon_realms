/**
 * The battle screen's view of creature abilities (presentation only).
 *
 * The action buttons take every word from the ability's own definition — its
 * name, `exactRule` and `restriction` — and the rules' legal actions (targets
 * and the reason an ability is unavailable); uses left are read from the stack
 * (`abilityUses`) or the army (`familyChargesUsed`). The short words and look of
 * an ability on the battlefield, and its combat-log sentence, follow the
 * ability's rule *type* and numbers (the shared vocabulary), never its ID.
 * Nothing here changes a rule or the state.
 */
import { abilityUsed, type AbilityRule, type BattleLegalActions, type BattleStackState, type BattleState, type ContentCatalog } from '@pr/rules';
import type { BattleAbilityFx } from '@pr/presentation';
import type { FxLook } from '@pr/presentation/core';
import { resolveAsset } from '../assets/manifest';

type RuleType = AbilityRule['type'];

/** Who an ability is aimed at, by its rule type. */
const TARGET: Partial<Record<RuleType, 'ally' | 'enemy' | 'self'>> = {
  family_ward: 'ally',
  sheltering_wings: 'ally',
  devour_dread: 'ally',
  reed_guard: 'ally',
  distract: 'enemy',
  tail_snare: 'enemy',
  shapeshift: 'self',
};

/**
 * The badge an ability's button and its word on the battlefield carry: its own
 * delivered `icon.ability.<id>`, else the campaign kit's reused badge for its rule
 * type (a symbolic label only; it grants nothing), else the generic ability icon.
 */
const BADGE: Partial<Record<RuleType, string>> = {
  family_ward: 'icon.ability.family_ward',
  sheltering_wings: 'icon.ability.family_ward',
  devour_dread: 'icon.ability.family_ward',
  reed_guard: 'icon.ability.charge_guard',
  distract: 'icon.action.ability',
  tail_snare: 'icon.action.ability',
};

/** Where an ability lands on the battlefield (code-drawn by the effect painter; presentation only). */
const LOOK: Partial<Record<RuleType, FxLook>> = {
  sheltering_wings: { school: 'silver', travel: 'none', impact: 'shield', screen: 'none', scope: 'single', sound: 'bless' },
  reed_guard: { school: 'water', travel: 'none', impact: 'ring', screen: 'none', scope: 'single', sound: 'water' },
  devour_dread: { school: 'spirit', travel: 'none', impact: 'motes', screen: 'none', scope: 'single', sound: 'holy' },
  distract: { school: 'amber', travel: 'none', impact: 'stars', screen: 'none', scope: 'single', sound: 'wind' },
};

export function abilityBadge(catalog: ContentCatalog, abilityId: string): string {
  const own = `icon.ability.${abilityId}`;
  if (resolveAsset(own).url) return own;
  const type = catalog.abilities[abilityId]?.rule.type;
  return (type && BADGE[type]) || 'icon.action.ability';
}

export interface AbilityUses {
  readonly left: number;
  readonly total: number;
  /** Counted per stack (the neutrals' once-per-battle abilities) or shared by the family in the army (Ward). */
  readonly scope: 'stack' | 'army';
}

/** Uses left of an ability for this stack in this battle (null: not limited). */
export function abilityUses(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, abilityId: string): AbilityUses | null {
  const rule = catalog.abilities[abilityId]?.rule;
  if (!rule) return null;
  if ('usesPerBattle' in rule) return { total: rule.usesPerBattle, left: Math.max(0, rule.usesPerBattle - abilityUsed(stack, abilityId)), scope: 'stack' };
  if (rule.type === 'family_ward') {
    const familyId = catalog.creatures[stack.creatureId]?.familyId ?? '';
    return { total: rule.chargesPerBattle, left: Math.max(0, rule.chargesPerBattle - (battle.sides[stack.side].familyChargesUsed[familyId] ?? 0)), scope: 'army' };
  }
  return null;
}

export function usesText(u: AbilityUses): string {
  if (u.left === 0) return u.scope === 'army' ? 'used by this army in this battle' : 'used in this battle';
  const who = u.scope === 'army' ? 'shared by its kind in this army' : 'for this stack';
  return `${u.left} of ${u.total} use${u.total === 1 ? '' : 's'} left in this battle, ${who}`;
}

export interface AbilityAction {
  readonly abilityId: string;
  readonly name: string;
  /** Acts at once on the stack itself (Shapeshift); its button text. */
  readonly selfLabel: string | null;
  /** Does not spend the activation. */
  readonly free: boolean;
  /** The definition's exact rule and restriction (shown verbatim). */
  readonly exactRule: string | null;
  readonly restriction: string | null;
  readonly uses: AbilityUses | null;
  /** Usable now (a target exists and nothing forbids it). */
  readonly available: boolean;
  /** Why not (the rules' reason). */
  readonly reason: string | null;
  readonly target: 'ally' | 'enemy' | 'self';
  readonly targets: readonly string[];
  readonly maxTargets: number;
  readonly allTargets: boolean;
  readonly icon: string;
  /** Tooltip and accessible description: state, uses, exact rule, restriction. */
  readonly tooltip: string;
  /** The line shown while choosing its target. */
  readonly prompt: string;
}

/** The active stack's abilities as the battle bar shows them (one per `la.abilities` entry, in its order). */
export function abilityActions(catalog: ContentCatalog, battle: BattleState, la: BattleLegalActions): AbilityAction[] {
  const stack = battle.stacks[la.stackId];
  if (!stack) return [];
  return la.abilities.map((a) => {
    const def = catalog.abilities[a.abilityId];
    const type = def?.rule.type;
    const uses = abilityUses(catalog, battle, stack, a.abilityId);
    const selfLabel = a.label ?? null;
    const available = !a.reason && (selfLabel !== null || a.targets.length > 0);
    const reason = available ? null : (a.reason ?? 'No legal target now');
    const target = (type && TARGET[type]) ?? (a.targets.every((id) => battle.stacks[id]?.side === stack.side) ? 'ally' : 'enemy');
    const exactRule = def?.exactRule ?? null;
    const restriction = def?.restriction ?? null;
    const parts: string[] = [];
    parts.push(available ? `${a.name}${selfLabel ? ` — ${selfLabel}` : ''}` : `${a.name} — unavailable: ${reason}`);
    if (uses) parts.push(`(${usesText(uses)})`);
    if (a.free) parts.push('(free: this stack still acts afterwards)');
    const head = parts.join(' ');
    const tooltip = [head.endsWith('.') ? head : `${head}.`, exactRule, restriction].filter(Boolean).join(' ');
    const n = a.targets.length;
    const whom = target === 'ally' ? 'friendly stack' : target === 'enemy' ? 'enemy stack' : 'stack';
    const maxTargets=a.maxTargets??1,allTargets=!!a.allTargets;
    const prompt = allTargets ? `${a.name}: choose an ally to protect all ${n} eligible neighbours.` : maxTargets>1 ? `${a.name}: select up to ${maxTargets} highlighted stacks, then confirm (${n} in reach).` : `${a.name}: choose a highlighted ${whom} (${n} in reach).`;
    return { abilityId: a.abilityId, name: a.name, selfLabel, free: !!a.free, exactRule, restriction, uses, available, reason, target, targets: a.targets, maxTargets, allTargets, icon: abilityBadge(catalog, a.abilityId), tooltip, prompt };
  });
}

/** What an ability did, from its rule type and numbers: a short word for the battlefield and a log clause. */
export function abilityEffect(catalog: ContentCatalog, abilityId: string, removedStatus?: string): { word: string; clause: string } {
  const def = catalog.abilities[abilityId];
  const rule = def?.rule;
  switch (rule?.type) {
    case 'sheltering_wings':
      return { word: `Next blow −${rule.reductionPercent}%`, clause: `the next creature blow they take is ${rule.reductionPercent}% lighter` };
    case 'distract':
      return { word: 'No next retaliation', clause: 'their next retaliation is suppressed' };
    case 'devour_dread':
      return { word: `${removedStatus ?? 'Debuff'} removed`, clause: `${removedStatus ?? 'a debuff'} removed` };
    case 'reed_guard':
      return { word: `Defense +${rule.defenseBonus} · pull-proof`, clause: `+${rule.defenseBonus} Defense and immune to one pull` };
    case 'tail_snare':
      return { word: 'Pulled 1 hex', clause: 'pulled one hex closer' };
    case 'family_ward':
      return { word: `Defense +${rule.defenseBonus}`, clause: `+${rule.defenseBonus} Defense for ${rule.durationRounds} rounds` };
    default:
      return { word: def?.name ?? abilityId, clause: def?.summary ?? '' };
  }
}

/** How an ability's use looks on the battlefield (words from its rule; the look by its type). */
export function abilityFxOf(catalog: ContentCatalog, ev: { abilityId: string; removedStatus?: string }): BattleAbilityFx | null {
  const def = catalog.abilities[ev.abilityId];
  if (!def) return null;
  const type = def.rule.type;
  return { name: def.name, effect: abilityEffect(catalog, ev.abilityId, ev.removedStatus).word, hostile: TARGET[type] === 'enemy', icon: abilityBadge(catalog, ev.abilityId), look: LOOK[type] ?? null };
}
