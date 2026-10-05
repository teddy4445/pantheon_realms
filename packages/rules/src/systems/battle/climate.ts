/**
 * Climate rules (proposed 2026-10-04): the map's climate changes a battle a
 * little, for both sides alike — fog shortens shots, sand slows the ground
 * troops, storms keep flyers low. Content data (`catalog.climates`, keyed by the
 * map biome) behind the scenario feature `climateRules`; The Three Beacons and
 * the campaigns keep it off, and a climate without effects changes nothing.
 */
import type { ContentCatalog } from '../../definitions/catalog';
import type { ClimateRuleDefinition } from '../../definitions/skirmish';
import type { BattleClimateState, MatchState } from '../../state/match';

/** The climate rule in force for battles in this match now, or null (feature off, temperate, no rule). */
export function climateRuleFor(catalog: ContentCatalog, state: MatchState): ClimateRuleDefinition | null {
  if (state.scenario.features?.climateRules !== true) return null;
  const rule = catalog.climates?.[state.world.map.biome];
  return rule && rule.effects.length > 0 ? rule : null;
}

/** The battle's copy of the rule (stored with the battle so a save keeps the battle it began). */
export function battleClimate(catalog: ContentCatalog, state: MatchState): BattleClimateState | null {
  const rule = climateRuleFor(catalog, state);
  if (!rule) return null;
  const creatureStats: BattleClimateState['creatureStats'] = [];
  let rangeMod = 0;
  for (const e of rule.effects) {
    if (e.type === 'creature_stat') {
      creatureStats.push({ stat: e.stat, amount: e.amount, ...(e.ability ? { ability: e.ability } : {}), ...(e.withoutAbility ? { withoutAbility: e.withoutAbility } : {}) });
    } else if (e.type === 'shooting_range') rangeMod += e.amount;
  }
  return { id: rule.id, name: rule.name, summary: rule.summary, creatureStats, rangeMod };
}
