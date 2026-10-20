/**
 * The second minor-god choice — PROPOSED this build (owner request: two or
 * three more minor gods per pantheon with real blessings).
 *
 * The documented first choice (Athena OR Ares and its mirrors, Temple I,
 * 20 Favor, design/02 §8) is unchanged. The second choice is a separate,
 * later, irreversible commitment: one of three gods, 25 Favor, needing a
 * Temple II and a City Hall (level-3 civic building) in the same owned town
 * and a first commitment already made. Blessings use only the shared effect
 * vocabulary. The Three Beacons allows only Athena and Ares.
 */
import type { EffectDefinition, GodDefinition } from '@pr/rules';

export const FIRST_MINOR_GROUP = 'first_minor';
export const FIRST_MINOR_FAVOR_COST = 20;
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

export interface FirstMinorSpec {
  readonly id: string;
  readonly pantheonId: string;
  readonly name: string;
  readonly domain: string;
  readonly quote?: string;
  readonly benefits: readonly EffectDefinition[];
  readonly benefitSummary: readonly string[];
  readonly portraitAssetId: string;
  /** The pantheon's Temple I building ID. */
  readonly templeId: string;
}

/**
 * Two more options for the FIRST minor-god choice (owner answer 2026-10-02:
 * "Split 2 + 2" — of the four undesigned gods per pantheon, two join the first
 * choice and two the second). Same terms as Athena/Ares: Temple I, 20 Favor,
 * exclusive with the other first-choice gods. Blessings are proposals.
 */
export function firstMinorGod(s: FirstMinorSpec): GodDefinition {
  return {
    id: s.id,
    pantheonId: s.pantheonId,
    name: s.name,
    domain: s.domain,
    role: 'minor',
    exclusivityGroup: FIRST_MINOR_GROUP,
    requirements: [{ type: 'has_building', buildingId: s.templeId }],
    favorCost: FIRST_MINOR_FAVOR_COST,
    benefits: s.benefits,
    benefitSummary: s.benefitSummary,
    ...(s.quote ? { quote: s.quote } : {}),
    portraitAssetId: s.portraitAssetId,
    implementationStatus: 'implemented',
    provenance: { source: 'proposed-this-build', note: 'First minor-god choice, added 2026-10-02 (P, unplaytested).' },
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
  vision: (amount: number) => ({ fx: { type: 'vision_radius', amount } as EffectDefinition, text: `+${amount} ${amount === 1 ? 'hex' : 'hexes'} of adventure vision for your heroes.` }),
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
  manaRegen: (amount: number) => ({ fx: { type: 'mana_regen', amount } as EffectDefinition, text: `+${amount} mana for your heroes at every dawn.` }),
  fury: (attack: number) => ({
    fx: { type: 'wounded_fury', attack, numerator: 1, denominator: 2 } as EffectDefinition,
    text: `Your stacks at half strength or less: +${attack} Attack in battle (does not add to other fury).`,
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
