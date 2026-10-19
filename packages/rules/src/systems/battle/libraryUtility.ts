import type { ContentCatalog } from '../../definitions/catalog';
import type { SpellEffect } from '../../definitions/pantheons';
import type { BattleSideId, BattleStackState, BattleState, MatchState } from '../../state/match';
import { isShooter, movementClassOf, opposing, retaliationAllowance, sideStacks, statsOf } from './common';
import { renewableShotCapacity } from './renewableShots';
import { lifeSpellReason } from './libraryLife';
import { spatialSpellOptions } from './librarySpatial';
import { afterLibraryCleanse } from './libraryRelics';

export function dispellableStatuses(target: BattleStackState, polarity: 'positive' | 'negative') {
  return target.statuses.filter((s) => {
    if (!s.sourceId.startsWith('spell:') || s.dispellable === false) return false;
    const negative = s.hostile ?? (s.amount < 0 || s.kind === 'min_damage_roll' || s.kind === 'retaliation_suppressed');
    return negative === (polarity === 'negative');
  }).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0));
}

/** Source army + slot is shared by deployment fragments, not their transient battle IDs. */
export function originalStackKey(stack: BattleStackState): string {
  return `${stack.sourceArmy ?? 'hero'}:${stack.sourceSlot}`;
}
export function utilitySpellReason(catalog: ContentCatalog, state: MatchState, battle: BattleState, sideId: BattleSideId, effect: SpellEffect, target: BattleStackState): string | null {
  const uses = battle.sides[sideId].effectUses ?? {};
  const life = lifeSpellReason(catalog, battle, target, effect);
  if (life) return life;
  if (target.summoned && ['restore_shots', 'retaliation_restore', 'heal_front', 'mass_heal'].includes(effect.type)) return 'Temporary summons cannot recover troops or charges';
  if (effect.type === 'spatial_move' && !spatialSpellOptions(catalog, battle, target, effect).length) return 'No legal destination or swap partner';
  if (effect.type === 'group_mind_cleanse' && !sideStacks(battle, sideId).some((s) => s.statuses.some(mindCleanseEligible))) return 'No removable fear, blind or ranged-lock spell';
  if (effect.type === 'tactical_status') {
    if (effect.mind && catalog.creatures[target.creatureId]?.traits?.includes('mind_immune')) return 'This creature is immune to mind effects';
    if (target.controlGrace?.includes(effect.status)) return 'This stack has a recovery activation before it can be controlled again';
    if ((effect.status === 'ranged_lock' || effect.status === 'spell_lock') && target.statuses.some((s) => s.kind === effect.status)) return 'This control is already active and cannot be refreshed';
    if (effect.status === 'ranged_lock' && !isShooter(catalog, target.creatureId)) return 'Choose an enemy shooter';
    if (effect.status === 'spell_lock' && !(catalog.creatures[target.creatureId]?.abilityIds ?? []).some((id) => catalog.abilities[id]?.spellcasting && catalog.abilities[id]?.activation === 'active')) return 'Choose a creature with an active spell ability';
    if (effect.status === 'temporary_flight' && movementClassOf(catalog, target.creatureId) !== 'ground') return 'Choose an allied ground creature';
  }
  if (effect.type === 'dispel_status' && !dispellableStatuses(target, effect.polarity).length) return `No dispellable ${effect.polarity} spell status`;
  if (effect.type === 'restore_shots') {
    if (!isShooter(catalog, target.creatureId) || renewableShotCapacity(catalog, target.creatureId) !== null) return 'Choose a shooter with finite ammunition';
    if (target.shotsRemaining >= statsOf(catalog, target.creatureId).shots) return 'No ammunition has been spent';
    if (uses[`ammunition:${originalStackKey(target)}`]) return 'This original stack already recovered ammunition this battle';
  }
  if (effect.type === 'retaliation_restore') {
    if (retaliationAllowance(catalog, target.creatureId) === 'unlimited') return 'This creature has unlimited retaliations';
    if (target.retaliationsUsed <= 0) return 'No retaliation has been spent this round';
  }
  if (effect.type === 'enemy_mana_drain') {
    const enemy = battle.sides[opposing(sideId)].commander;
    const hero = enemy?.heroId ? state.heroes[enemy.heroId] : null;
    if (!hero || hero.status !== 'active' || hero.mana <= 0) return 'The enemy needs a living hero with mana';
    if (uses.enemyManaDrain) return 'Your side already drained mana this battle';
  }
  return null;
}
export function mindCleanseEligible(s: BattleStackState['statuses'][number]): boolean {
  return s.sourceId.startsWith('spell:') && s.dispellable !== false && s.hostile !== false && (s.kind === 'ranged_lock' || s.mind === true);
}
/** Called only after shared target/cost validation; no command or animation side effects. */
export function applyUtilitySpell(catalog: ContentCatalog, state: MatchState, battle: BattleState, sideId: BattleSideId, effect: SpellEffect, target: BattleStackState, power: number, statusSourceId?: string): boolean {
  if (effect.type === 'dispel_status') {
    const source = statusSourceId ?? dispellableStatuses(target, effect.polarity)[0]!.sourceId;
    target.statuses = target.statuses.filter((s) => s.sourceId !== source);
    if (effect.polarity === 'negative') afterLibraryCleanse(battle, sideId, target);
    return true;
  }
  if (effect.type === 'restore_shots') {
    target.shotsRemaining = Math.min(statsOf(catalog, target.creatureId).shots, target.shotsRemaining + effect.amount);
    (battle.sides[sideId].effectUses ??= {})[`ammunition:${originalStackKey(target)}`] = 1;
    return true;
  }
  if (effect.type === 'retaliation_restore') {
    target.retaliationsUsed = Math.max(0, target.retaliationsUsed - effect.amount);
    return true;
  }
  if (effect.type === 'enemy_mana_drain') {
    const heroId = battle.sides[opposing(sideId)].commander!.heroId!;
    const hero = state.heroes[heroId]!;
    hero.mana = Math.max(0, hero.mana - Math.min(effect.cap, effect.base + Math.floor(power / effect.powerDivisor)));
    (battle.sides[sideId].effectUses ??= {}).enemyManaDrain = 1;
    return true;
  }
  return false;
}
