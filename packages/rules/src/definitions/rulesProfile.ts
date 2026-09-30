/**
 * RulesProfile: every formula constant and limit for rule profile pr-0.2-candidate.
 *
 * Owns: numbers from design/02, /04, /05. These are PROPOSED (P) balance values.
 * Does not own: per-player preferences or scenario setup.
 */
import type { Terrain } from './world';

export interface Rational {
  readonly numerator: number;
  readonly denominator: number;
}

export interface MarketTier {
  readonly minMarkets: number;
  readonly buyCommon: number;
  readonly sellCommon: number;
  readonly buyCrystal: number;
  readonly sellCrystal: number;
}

export interface RulesProfile {
  readonly id: string;
  readonly daysPerWeek: number;
  readonly armySlots: number;
  /** Cumulative XP for levels 1..10; later levels extend by +20% interval rounded up to 100. */
  readonly xpThresholds: readonly number[];
  readonly movementBySlowestSpeed: readonly { readonly speed: number; readonly points: number }[];
  readonly minimumMovement: number;
  readonly maximumMovement: number;
  readonly terrainCost: Readonly<Record<Terrain, number | null>>;
  readonly roadCost: number;
  readonly heroVisionRadius: number;
  readonly townVisionRadius: number;
  readonly maxSecondarySkills: number;
  readonly maxSkillRank: number;
  readonly manaPerKnowledge: number;
  readonly dawnManaRegen: number;
  readonly spellbookCost: number;
  readonly heroHireCost: number;
  readonly maxHeroesPerPlayer: number;
  readonly backpackCapacity: number;
  readonly market: readonly MarketTier[];
  readonly minorGodFavorCost: number;
  readonly combat: {
    readonly cols: number;
    readonly rows: number;
    readonly deploymentColumns: number;
    readonly maxStacksPerSide: number;
    /** Attack advantage bonus per point, per mille (0.05 = 50). */
    readonly attackBonusPerPoint: number;
    readonly attackBonusCap: number;
    /** Defense advantage reduction per point, per mille (0.025 = 25). */
    readonly defenseReductionPerPoint: number;
    readonly defenseReductionCap: number;
    readonly defendMultiplier: Rational;
    readonly longRangeDistance: number;
    readonly longRangeFactor: Rational;
    readonly wallFactor: Rational;
    readonly meleePenaltyFactor: Rational;
    readonly sameFactionMorale: number;
    readonly negativeMoraleDenominator: number;
    readonly positiveMoraleDenominator: number;
    readonly luckDenominator: number;
    /** +1.0 in the additive bracket, per mille. */
    readonly luckBonus: number;
    readonly moraleClamp: number;
    readonly luckClamp: number;
    readonly retreatRehireCost: number;
    /** Safety valve: battles end in a defender hold after this many rounds (prevents infinite stalls). */
    readonly roundLimit: number;
    /** Temporary deterministic siege model (design/04 §8, proposed). */
    readonly siege: {
      /** Board column of the wall line; the town interior is east of it. */
      readonly wallCol: number;
      /** Wall-section structure HP for Fort, Citadel, Castle. */
      readonly wallHpByLevel: readonly [number, number, number];
      readonly gateHp: number;
      readonly towerHp: number;
      readonly keepHp: number;
      /** Structure HP removed by the automatic Catapult shot each round. */
      readonly catapultDamage: number;
      /** Structure HP removed by a wall breaker's shot. */
      readonly wallBreakerDamage: number;
      readonly keepDamage: number;
      readonly towerDamage: number;
      readonly moatDamage: number;
    };
  };
}

export const PR_02_CANDIDATE: RulesProfile = {
  id: 'pr-0.2-candidate',
  daysPerWeek: 7,
  armySlots: 7,
  xpThresholds: [0, 1000, 2000, 3200, 4600, 6200, 8000, 10000, 12200, 14700],
  movementBySlowestSpeed: [
    { speed: 3, points: 1500 },
    { speed: 4, points: 1560 },
    { speed: 5, points: 1630 },
    { speed: 6, points: 1700 },
    { speed: 7, points: 1760 },
    { speed: 8, points: 1830 },
    { speed: 9, points: 1900 },
    { speed: 10, points: 1960 },
    { speed: 11, points: 2000 },
  ],
  minimumMovement: 1500,
  maximumMovement: 2000,
  terrainCost: { plains: 100, forest: 125, rough: 125, marsh: 150, mountain: null, water: null },
  roadCost: 75,
  heroVisionRadius: 5,
  townVisionRadius: 3,
  maxSecondarySkills: 8,
  maxSkillRank: 3,
  manaPerKnowledge: 10,
  dawnManaRegen: 1,
  spellbookCost: 500,
  heroHireCost: 2500,
  maxHeroesPerPlayer: 8,
  backpackCapacity: 30,
  market: [
    { minMarkets: 1, buyCommon: 500, sellCommon: 50, buyCrystal: 1000, sellCrystal: 100 },
    { minMarkets: 2, buyCommon: 450, sellCommon: 60, buyCrystal: 900, sellCrystal: 120 },
    { minMarkets: 3, buyCommon: 400, sellCommon: 75, buyCrystal: 800, sellCrystal: 150 },
  ],
  minorGodFavorCost: 20,
  combat: {
    cols: 15,
    rows: 11,
    deploymentColumns: 2,
    maxStacksPerSide: 7,
    attackBonusPerPoint: 50,
    attackBonusCap: 3000,
    defenseReductionPerPoint: 25,
    defenseReductionCap: 700,
    defendMultiplier: { numerator: 6, denominator: 5 },
    longRangeDistance: 10,
    longRangeFactor: { numerator: 1, denominator: 2 },
    wallFactor: { numerator: 1, denominator: 2 },
    meleePenaltyFactor: { numerator: 1, denominator: 2 },
    sameFactionMorale: 1,
    negativeMoraleDenominator: 12,
    positiveMoraleDenominator: 24,
    luckDenominator: 24,
    luckBonus: 1000,
    moraleClamp: 3,
    luckClamp: 3,
    retreatRehireCost: 2500,
    roundLimit: 60,
    siege: {
      wallCol: 10,
      wallHpByLevel: [2, 2, 3],
      gateHp: 2,
      towerHp: 2,
      keepHp: 2,
      catapultDamage: 1,
      wallBreakerDamage: 1,
      keepDamage: 20,
      towerDamage: 10,
      moatDamage: 10,
    },
  },
};

/** Cumulative XP required to reach `level` (level 1 = 0). */
export function xpForLevel(profile: RulesProfile, level: number): number {
  const t = profile.xpThresholds;
  if (level <= 1) return 0;
  if (level <= t.length) return t[level - 1] ?? 0;
  let total = t[t.length - 1] ?? 0;
  let interval = (t[t.length - 1] ?? 0) - (t[t.length - 2] ?? 0);
  for (let l = t.length + 1; l <= level; l++) {
    interval = Math.ceil((interval * 1.2) / 100) * 100;
    total += interval;
  }
  return total;
}

export function levelForXp(profile: RulesProfile, xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(profile, level + 1)) level++;
  return level;
}
