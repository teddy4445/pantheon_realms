/**
 * Climate rules (owner request 2026-10-04, "climates that matter"; proposed,
 * unplaytested values). One small battle rule per map climate, the same for
 * both sides: it rewards an army suited to the ground, not either player.
 * Scenario feature `climateRules` (skirmishes; The Three Beacons and the
 * campaigns keep it off). Temperate has no rule.
 */
import type { ClimateRuleDefinition } from '@pr/rules';

const icon = (id: string) => `icon.climate.${id}`;

export const CLIMATE_RULES: readonly ClimateRuleDefinition[] = [
  {
    id: 'autumn',
    name: 'Harvest wind',
    summary: 'Harvest wind: every flying creature has +1 Speed in battle.',
    effects: [{ type: 'creature_stat', stat: 'speed', amount: 1, ability: 'flight' }],
    iconAssetId: icon('autumn'),
  },
  {
    id: 'coast',
    name: 'Salt spray',
    summary: 'Salt spray: every shooter’s range is 3 hexes shorter in battle.',
    effects: [{ type: 'shooting_range', amount: -3 }],
    iconAssetId: icon('coast'),
  },
  {
    id: 'desert',
    name: 'Scorching sand',
    summary: 'Scorching sand: every creature without Flight has −1 Speed in battle.',
    effects: [{ type: 'creature_stat', stat: 'speed', amount: -1, withoutAbility: 'flight' }],
    iconAssetId: icon('desert'),
  },
  {
    id: 'fjord',
    name: 'Icy spray',
    summary: 'Icy spray: every creature has −1 Defense in battle.',
    effects: [{ type: 'creature_stat', stat: 'defense', amount: -1 }],
    iconAssetId: icon('fjord'),
  },
  {
    id: 'high_pass',
    name: 'Thin air',
    summary: 'Thin air: every shooter’s range is 2 hexes longer and every flying creature has −1 Speed in battle.',
    effects: [
      { type: 'shooting_range', amount: 2 },
      { type: 'creature_stat', stat: 'speed', amount: -1, ability: 'flight' },
    ],
    iconAssetId: icon('high_pass'),
  },
  {
    id: 'jungle',
    name: 'Dense canopy',
    summary: 'Dense canopy: every shooter’s range is 4 hexes shorter and every flying creature has −1 Speed in battle.',
    effects: [
      { type: 'shooting_range', amount: -4 },
      { type: 'creature_stat', stat: 'speed', amount: -1, ability: 'flight' },
    ],
    iconAssetId: icon('jungle'),
  },
  {
    id: 'moor',
    name: 'Fog',
    summary: 'Fog: every shooter’s range is 6 hexes shorter in battle.',
    effects: [{ type: 'shooting_range', amount: -6 }],
    iconAssetId: icon('moor'),
  },
  {
    id: 'storm_plateau',
    name: 'Thunderstorm',
    summary: 'Thunderstorm: every flying creature has −2 Speed in battle.',
    effects: [{ type: 'creature_stat', stat: 'speed', amount: -2, ability: 'flight' }],
    iconAssetId: icon('storm_plateau'),
  },
  {
    id: 'tundra',
    name: 'Biting cold',
    summary: 'Biting cold: every creature has −1 Attack in battle.',
    effects: [{ type: 'creature_stat', stat: 'attack', amount: -1 }],
    iconAssetId: icon('tundra'),
  },
];
