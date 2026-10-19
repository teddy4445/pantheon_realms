/** Pure quotes and committed relic hooks. Quotas live on the army, never on an item instance. */
import type { ContentCatalog } from '../../definitions/catalog';
import type { LibraryPassiveEffect } from '../../definitions/logic';
import type { SpellDefinition } from '../../definitions/pantheons';
import type { BattleSideId, BattleStackState, BattleState, MatchState } from '../../state/match';
import { maxMana } from '../../resolvers/heroes';
import { originalStackKey } from './libraryUtility';

export function libraryEffects<T extends LibraryPassiveEffect['type']>(battle: BattleState, side: BattleSideId, type: T): Extract<LibraryPassiveEffect, { type: T }>[] {
  return (battle.sides[side].effects?.library ?? []).filter((e): e is Extract<LibraryPassiveEffect, { type: T }> => e.type === type);
}
export function relicSpellCost(battle: BattleState, side: BattleSideId, base: number): number {
  const used = battle.sides[side].effectUses?.spellCasts ?? 0;
  const discount = Math.max(0, ...libraryEffects(battle, side, 'library_spell_discount').filter((e) => used < e.casts).map((e) => e.amount));
  const credit = battle.sides[side].spellCredit;
  return Math.max(1, base - discount - (credit && credit.expiresAtRound > battle.round ? credit.amount : 0));
}
export function afterRelicSpellPayment(catalog: ContentCatalog, state: MatchState, battle: BattleState, side: BattleSideId, spent: number): void {
  delete battle.sides[side].spellCredit;
  if (!battle.sides[side].effects?.library?.length) return;
  const army = battle.sides[side], uses = army.effectUses ??= {};
  uses.spellCasts = (uses.spellCasts ?? 0) + 1;
  const hero = army.commander?.heroId ? state.heroes[army.commander.heroId] : undefined;
  if (!hero) return;
  // Test both conditions against the actual post-payment balance, before either refund.
  const paidBalance = hero.mana;
  const refunds = libraryEffects(battle, side, 'library_mana_refund');
  let total = 0;
  for (const trigger of ['spent', 'low'] as const) {
    const key = `manaRefund:${trigger}`;
    if (uses[key]) continue;
    const amount = Math.max(0, ...refunds.filter((e) => e.trigger === trigger && (trigger === 'spent' ? spent >= e.threshold : paidBalance < e.threshold)).map((e) => e.amount));
    if (amount) { uses[key] = 1; total += amount; }
  }
  if (total) hero.mana = Math.min(maxMana(catalog, state, hero), hero.mana + total);
}
/** Original-stack survival protection only triggers when its final fragment would fall. */
export function previewLastCreatureGuard(battle: BattleState, target: BattleStackState, damage: number): number {
  if (!target.statuses.some((s) => s.kind === 'last_creature_guard') || damage < target.totalHp || target.totalHp <= 0) return damage;
  if (originalGroup(battle, target).some((s) => s.id !== target.id && s.totalHp > 0)) return damage;
  return Math.max(0, target.totalHp - 1);
}
export function consumeLastCreatureGuard(battle: BattleState, target: BattleStackState, damage: number): number {
  const reduced = previewLastCreatureGuard(battle, target, damage);
  if (reduced < damage) for (const s of originalGroup(battle, target)) s.statuses = s.statuses.filter((st) => st.kind !== 'last_creature_guard');
  return reduced;
}
export function originalGroup(battle: BattleState, target: BattleStackState): BattleStackState[] {
  return Object.values(battle.stacks).filter((s) => s.side === target.side && originalStackKey(s) === originalStackKey(target));
}
export function originalUse(battle: BattleState, stack: BattleStackState, hook: string): number {
  return battle.sides[stack.side].effectUses?.[`${hook}:${originalStackKey(stack)}`] ?? 0;
}
export function spendOriginalUse(battle: BattleState, stack: BattleStackState, hook: string): void {
  if (stack.summoned) return;
  const uses = battle.sides[stack.side].effectUses ??= {};
  const key = `${hook}:${originalStackKey(stack)}`;
  uses[key] = (uses[key] ?? 0) + 1;
}
/** One army's protection cancels one mind debuff, not the other targets of an area spell. */
export function consumeMindGuard(battle: BattleState, stack: BattleStackState): boolean {
  const side = battle.sides[stack.side];
  if (!libraryEffects(battle, stack.side, 'library_first_mind_guard').length || side.effectUses?.mindGuard) return false;
  (side.effectUses ??= {}).mindGuard = 1;
  return true;
}
export function consumeDisplacementGuard(battle: BattleState, stack: BattleStackState): boolean {
  if (!libraryEffects(battle, stack.side, 'library_displacement_guard').length || originalUse(battle, stack, 'displacementGuard')) return false;
  spendOriginalUse(battle, stack, 'displacementGuard');
  return true;
}
/** New spell protections choose the strongest applicable prevention, never multiply reductions. */
export function relicSpellOutgoing(battle: BattleState, spell: SpellDefinition, side: BattleSideId, raw: number): number {
  if (raw <= 0) return raw;
  let amount = raw;
  const caster = battle.sides[side];
  if (spell.effect.type === 'direct_damage' && spell.element && !caster.effectUses?.elementAmplify) {
    const extra = Math.max(0, ...libraryEffects(battle, side, 'library_direct_element_amplify').filter((e) => e.element === spell.element).map((e) => Math.min(e.cap, Math.floor(raw * Math.min(30, e.percent) / 100))));
    if (extra) { (caster.effectUses ??= {}).elementAmplify = 1; amount += extra; }
  }
  return amount;
}
export function relicSpellDamage(battle: BattleState, spell: SpellDefinition, side: BattleSideId, target: BattleStackState, raw: number): number {
  if (raw <= 0) return raw;
  if (target.summoned?.kind === 'illusion') return 1;
  const amount = relicSpellOutgoing(battle, spell, side, raw);
  const elemental = Math.min(50, Math.max(0, ...libraryEffects(battle, target.side, 'library_elemental_resist').filter((e) => e.element === spell.element).map((e) => e.percent)));
  let prevented = Math.ceil(amount * elemental / 100);
  const victim = battle.sides[target.side];
  if (spell.effect.type === 'direct_damage' && !victim.effectUses?.firstSingleSpell) {
    const first = libraryEffects(battle, target.side, 'library_first_spell_resist');
    if (first.length) {
      prevented = Math.max(prevented, ...first.map((e) => Math.min(e.cap, Math.ceil(amount * Math.min(40, e.percent) / 100))));
      (victim.effectUses ??= {}).firstSingleSpell = 1;
    }
  }
  if (spell.delivery === 'projectile') {
    const ward = target.statuses.find((s) => s.kind === 'projectile_spell_ward');
    if (ward) {
      prevented = Math.max(prevented, Math.min(ward.capHp ?? 0, Math.ceil(amount * Math.min(50, ward.amount) / 100)));
      target.statuses = target.statuses.filter((s) => s !== ward);
    }
  }
  let remaining = Math.max(0, amount - prevented);
  if (spell.element === 'fire' || spell.element === 'water') {
    for (const barrier of target.statuses.filter((s) => s.kind === 'element_barrier').sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))) {
      const absorbed = Math.min(remaining, barrier.amount);
      remaining -= absorbed; barrier.amount -= absorbed;
    }
    target.statuses = target.statuses.filter((s) => s.kind !== 'element_barrier' || s.amount > 0);
  }
  return remaining;
}
export function relicHealAmount(battle: BattleState, side: BattleSideId, base: number, target?: BattleStackState, spell?: SpellDefinition): number {
  const fx = libraryEffects(battle, side, 'library_heal_amplification');
  const incoming = target && spell ? libraryEffects(battle, target.side, 'library_received_heal').filter((e) => e.element === spell.element) : [];
  const extra = [...fx, ...incoming].reduce((n, e) => n + Math.min(e.cap, Math.floor(base * e.percent / 100)), 0);
  return base + Math.min(Math.floor(base * 30 / 100), extra);
}

export function initializeLibraryArmy(catalog: ContentCatalog, state: MatchState, battle: BattleState): void {
  for (const side of ['attacker', 'defender'] as const) {
    const army = battle.sides[side], id = army.commander?.heroId, hero = id ? state.heroes[id] : undefined;
    const barrier = Math.max(0, ...libraryEffects(battle, side, 'library_army_barrier').map((e) => Math.min(e.cap, e.base + e.perLevel * (hero?.level ?? 0))));
    if (barrier) army.armyBarrier = barrier;
    if (libraryEffects(battle, side, 'library_undead_mark').length) {
      const marked = Object.values(battle.stacks).filter((s) => s.side !== side && s.totalHp > 0 && catalog.creatures[s.creatureId]?.traits?.includes('undead')).sort((a, b) => b.totalHp - a.totalHp || (a.id < b.id ? -1 : 1))[0];
      if (marked) army.markedUndeadId = marked.id;
    }
  }
}
export function previewArmyBarrier(battle: BattleState, side: BattleSideId, damage: number): number {
  return Math.max(0, damage - (battle.sides[side].armyBarrier ?? 0));
}
/** One successful cleanse benefits one target, including a mass cleanse in stable stack order. */
export function afterLibraryCleanse(battle: BattleState, side: BattleSideId, target: BattleStackState): void {
  const amount = Math.max(0, ...libraryEffects(battle, side, 'library_cleanse_speed').map((e) => e.amount));
  if (!amount || battle.sides[side].effectUses?.cleanseSpeed) return;
  (battle.sides[side].effectUses ??= {}).cleanseSpeed = 1;
  target.statuses.push({ sourceId: 'artifact:cleanse_speed', label: 'Bells of Clear Laughter', kind: 'speed_bonus', amount, numerator: 1, denominator: 1, expiresAtRound: Number.MAX_SAFE_INTEGER, expiresAfterActivation: true, nextActivationStarted: false, dispellable: false });
}

/** End of a round, before expiry/reset; cannot revive a fallen stack or exceed its front HP. */
export function relicRoundEnd(catalog: ContentCatalog, battle: BattleState): void {
  for (const side of ['attacker', 'defender'] as const) {
    const amount = Math.max(0, ...libraryEffects(battle, side, 'library_front_heal').filter((e) => battle.round <= e.rounds).map((e) => e.amount));
    if (!amount) continue;
    for (const s of Object.values(battle.stacks)) {
      if (s.summoned || s.side !== side || s.totalHp <= 0) continue;
      const def = catalog.creatures[s.creatureId]!;
      if (def.traits?.some((t) => t === 'undead' || t === 'construct')) continue;
      const hp = def.stats!.hp;
      s.totalHp += Math.min(amount, (hp - s.totalHp % hp) % hp);
    }
  }
}
