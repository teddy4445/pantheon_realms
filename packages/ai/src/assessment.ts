/**
 * The AI's fuller view of a hero's fighting power and of the week ahead
 * (owner request 2026-10-03: "it judges army strength ignoring skills,
 * artifact sets and pantheon bonuses; it does not plan around weekly events").
 *
 * `heroPower` starts from the shared strength heuristic (army HP and damage
 * adjusted by the commander's Attack and Defense, which already include
 * artifacts, set attributes, skills and gods) and adds what that ignores:
 * battle stat bonuses for matching creatures (pantheon signatures, gods,
 * specialties, set bonuses, the weekly event), the Offense/Archery/Armorer
 * skills, morale and luck, and spell casting. Documented heuristics (the
 * weights are proposed, like every AI margin), not combat predictions; the
 * neutral-reaction rule keeps the plain heuristic.
 *
 * `weekPlan` reads the week's event from its effects (content is data: no
 * event is named) and tells the planner how to lean this week.
 */
import {
  armyStrength,
  divineEffects,
  effectiveAttributes,
  findAbility,
  heroEffects,
  heroLuckBonus,
  heroMoraleBonus,
  isShooter,
  skillValue,
  weeklyEventEffects,
  type ContentCatalog,
  type EffectDefinition,
  type HeroState,
  type MatchState,
  type PlayerId,
} from '@pr/rules';

type StatEffect = Extract<EffectDefinition, { type: 'creature_stat' }>;

function statApplies(catalog: ContentCatalog, e: StatEffect, creatureId: string): boolean {
  const def = catalog.creatures[creatureId];
  if (!def) return false;
  if (e.minTier !== undefined && def.tier < e.minTier) return false;
  if (e.maxTier !== undefined && def.tier > e.maxTier) return false;
  if (e.familyId !== undefined && def.familyId !== e.familyId) return false;
  if (e.ability !== undefined && !findAbility(catalog, creatureId, e.ability as never)) return false;
  return true;
}

/** Fighting power of a hero's army as the AI judges it (comparable to `armyStrength` for guards and garrisons). */
export function heroPower(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  const eff = effectiveAttributes(catalog, state, hero);
  const fx = [...heroEffects(catalog, hero, state), ...divineEffects(catalog, state, hero)];
  const stats = fx.filter((e): e is StatEffect => e.type === 'creature_stat');
  const offense = skillValue(catalog, hero, 'offense');
  const archery = skillValue(catalog, hero, 'archery');
  const armorer = Math.min(60, skillValue(catalog, hero, 'armorer'));
  let total = 0;
  for (const s of hero.army.slots) {
    if (!s || s.count <= 0) continue;
    let atk = eff.attack.total;
    let def = eff.defense.total;
    let speed = 0;
    for (const e of stats) {
      if (!statApplies(catalog, e, s.creatureId)) continue;
      if (e.stat === 'attack') atk += e.amount;
      else if (e.stat === 'defense') def += e.amount;
      else speed += e.amount;
    }
    const base = armyStrength(catalog, [{ creatureId: s.creatureId, count: s.count }], { attack: atk, defense: def });
    const dmgPct = isShooter(catalog, s.creatureId) ? archery : offense;
    // Strength is sqrt(offense × durability): a damage bonus or a damage cut counts at its square root.
    total += base * Math.sqrt(1 + dmgPct / 100) * Math.sqrt(100 / (100 - armorer)) * (1 + 0.03 * speed);
  }
  const morale = Math.max(-3, Math.min(3, heroMoraleBonus(catalog, state, hero)));
  const luck = Math.max(-3, Math.min(3, heroLuckBonus(catalog, state, hero)));
  total *= 1 + 0.04 * morale + 0.03 * luck;
  if (hero.spellbook && hero.knownSpellIds.length > 0) total *= 1 + Math.min(0.25, 0.025 * eff.power.total) * (hero.mana >= 10 ? 1 : 0.5);
  return total;
}

/** How the planner leans this week, from the weekly event's effects on this player. */
export interface WeekPlan {
  /** Extra weekly growth on the town's dwellings: worth going home to recruit early in the week. */
  readonly growthBonus: number;
  /** Extra Gold income per day: build and hire with a smaller reserve. */
  readonly goldIncome: number;
  /** Extra Wood/Stone income per day: buildings are cheaper to keep up. */
  readonly materialIncome: number;
  /** Change in daily movement (percent): long marches cost more days. */
  readonly movementPercent: number;
  /** Extra mana regained each dawn: spells are cheap this week. */
  readonly manaRegen: number;
}

export function weekPlan(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): WeekPlan {
  let growthBonus = 0;
  let goldIncome = 0;
  let materialIncome = 0;
  let movementPercent = 0;
  let manaRegen = 0;
  for (const e of weeklyEventEffects(catalog, state, playerId)) {
    if (e.type === 'weekly_growth_bonus') growthBonus += e.amount;
    else if (e.type === 'daily_income' && e.resource === 'gold') goldIncome += e.amount;
    else if (e.type === 'daily_income' && (e.resource === 'wood' || e.resource === 'stone')) materialIncome += e.amount;
    else if (e.type === 'movement_percent') movementPercent += e.percent;
    else if (e.type === 'mana_regen') manaRegen += e.amount;
  }
  return { growthBonus, goldIncome, materialIncome, movementPercent, manaRegen };
}

/** Gold the AI keeps back when building, lowered in a week of extra income. */
export function buildReserve(plan: WeekPlan, base: number): number {
  return Math.max(500, base - plan.goldIncome * 3 - plan.materialIncome * 150);
}

/** Gold kept back before hiring another hero, lowered in a week of extra Gold income. */
export function hireReserve(plan: WeekPlan, base: number): number {
  return Math.max(1500, base - plan.goldIncome * 4);
}
