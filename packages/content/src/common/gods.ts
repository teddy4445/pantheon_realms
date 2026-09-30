/**
 * The second minor-god choice — PROPOSED this build (owner request: two or
 * three more minor gods per pantheon with real blessings).
 *
 * The documented first choice (Athena OR Ares and its mirrors, Temple II,
 * 20 Favor, design/02 §8) is unchanged. The second choice is a separate,
 * later, irreversible commitment: one of three gods, 25 Favor, needing a
 * Temple II and a City Hall (level-3 civic building) in the same owned town
 * and a first commitment already made. Blessings use only the shared effect
 * vocabulary. The Three Beacons allows only Athena and Ares.
 */
import type { EffectDefinition, GodDefinition } from '@pr/rules';

export const SECOND_MINOR_GROUP = 'second_minor';
export const SECOND_MINOR_FAVOR_COST = 25;

export interface SecondMinorSpec {
  readonly id: string;
  readonly pantheonId: string;
  readonly name: string;
  readonly domain: string;
  readonly quote?: string;
  readonly benefits: readonly EffectDefinition[];
  readonly benefitSummary: readonly string[];
  readonly portraitAssetId: string;
  /** The pantheon's Temple II and level-3 civic building IDs. */
  readonly templeId: string;
  readonly civicHallId: string;
}

export function secondMinorGod(s: SecondMinorSpec): GodDefinition {
  return {
    id: s.id,
    pantheonId: s.pantheonId,
    name: s.name,
    domain: s.domain,
    role: 'minor',
    exclusivityGroup: SECOND_MINOR_GROUP,
    requirements: [
      { type: 'has_god_in_group', group: 'first_minor' },
      { type: 'has_building', buildingId: s.templeId },
      { type: 'has_building', buildingId: s.civicHallId },
    ],
    favorCost: SECOND_MINOR_FAVOR_COST,
    benefits: s.benefits,
    benefitSummary: s.benefitSummary,
    ...(s.quote ? { quote: s.quote } : {}),
    portraitAssetId: s.portraitAssetId,
    implementationStatus: 'implemented',
    provenance: { source: 'proposed-this-build', note: 'Second minor-god choice (P, unplaytested).' },
  };
}

/** Blessing building blocks shared by several pantheons' gods (same effect, same text). */
export const BLESSINGS = {
  movement: (percent: number) => ({ fx: { type: 'movement_percent', percent } as EffectDefinition, text: `+${percent}% land movement for your heroes.` }),
  growth: (amount: number, maxTier: number) => ({
    fx: { type: 'weekly_growth_bonus', amount, maxTier } as EffectDefinition,
    text: `+${amount} weekly growth for every creature family of tiers 1–${maxTier} in your towns.`,
  }),
  recovery: (percent: number) => ({
    fx: { type: 'casualty_recovery', percent } as EffectDefinition,
    text: `After a battle you win, each stack regains ${percent}% of its losses (rounded down; adds to other recovery).`,
  }),
  income: (resource: 'gold' | 'wood' | 'stone' | 'crystal', amount: number) => ({
    fx: { type: 'daily_income', resource, amount } as EffectDefinition,
    text: `+${amount} ${resource === 'gold' ? 'Gold' : resource[0]!.toUpperCase() + resource.slice(1)} per day while you own a town.`,
  }),
  attribute: (attribute: 'attack' | 'defense' | 'power' | 'knowledge', amount: number) => ({
    fx: { type: 'commander_attribute', attribute, amount } as EffectDefinition,
    text: `+${amount} ${attribute === 'power' ? 'Spell Power' : attribute[0]!.toUpperCase() + attribute.slice(1)} for your commanders.`,
  }),
  luck: (amount: number) => ({ fx: { type: 'luck', amount } as EffectDefinition, text: `+${amount} Luck for your armies.` }),
  morale: (amount: number) => ({ fx: { type: 'morale', amount } as EffectDefinition, text: `+${amount} morale for your armies.` }),
  vision: (amount: number) => ({ fx: { type: 'vision_radius', amount } as EffectDefinition, text: `+${amount} hexes of adventure vision for your heroes.` }),
  creatures: (stat: 'attack' | 'defense' | 'speed', amount: number, filter: { minTier?: number; maxTier?: number; ability?: string; label: string }) => ({
    fx: {
      type: 'creature_stat',
      stat,
      amount,
      ...(filter.minTier !== undefined ? { minTier: filter.minTier } : {}),
      ...(filter.maxTier !== undefined ? { maxTier: filter.maxTier } : {}),
      ...(filter.ability !== undefined ? { ability: filter.ability } : {}),
    } as EffectDefinition,
    text: `${filter.label}: +${amount} ${stat[0]!.toUpperCase() + stat.slice(1)} in battle.`,
  }),
  offering: (goldPerFavor: number, maxFavorPerWeek: number) => ({
    fx: { type: 'offering', goldPerFavor, maxFavorPerWeek } as EffectDefinition,
    text: `Offerings yield 1 Favor per ${goldPerFavor} Gold, at most ${maxFavorPerWeek} per offering.`,
  }),
} as const;

/** Combine blessing blocks into benefits + matching summary lines. */
export function blessing(...parts: readonly { fx: EffectDefinition; text: string }[]): { benefits: EffectDefinition[]; benefitSummary: string[] } {
  return { benefits: parts.map((p) => p.fx), benefitSummary: parts.map((p) => p.text) };
}
