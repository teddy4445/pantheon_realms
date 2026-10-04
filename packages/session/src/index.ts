/** @pr/session — runtime host around MatchState + SaveSnapshot schema. */
export * from './session';
export * from './save';
export {
  campaignScore,
  createRandomSkirmish,
  RANDOM_TEMPLATE_ID,
  SKIRMISH_MAP_TYPES,
  SKIRMISH_SIZE_LABEL,
  SKIRMISH_SIZE_RADIUS,
  SKIRMISH_START_WALLET,
  SKIRMISH_MAX_EMPIRES,
  WEALTH_PERCENT,
  skirmishSizeAllows,
  type GuardStrength,
  type RandomSkirmish,
  type RoadDensity,
  type SkirmishGenOptions,
  type SkirmishMapSize,
  type SkirmishMapType,
  type SkirmishSeat,
  type SkirmishVictory,
  type StartWealth,
  type TreasureLevel,
} from '@pr/campaign';
