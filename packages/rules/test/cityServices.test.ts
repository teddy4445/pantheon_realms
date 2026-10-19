/**
 * City dedications — the eleven town SERVICES in quotes (CITY DEDICATIONS handoff §06,
 * 2026-10-17; app 1.5.0). Each service is local to the active, eligible town, needs its
 * normal building (or the normal build prerequisites), lowers Gold only, per unit, once,
 * and every discounted quote carries its `dedication` breakdown. Commits re-quote, so
 * the discounted price is what is charged. Dedications are set up directly on a state
 * copy here (the commands and weekly processing have their own tests).
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { compileSkirmishMap, createGeneratedMatch, type SkirmishMapSeat } from '@pr/campaign';
import { GameDriver } from '@pr/testing';
import {
  axialDistance,
  cellIndex,
  cellsWithin,
  dedicatedUnitCost,
  dedicationGoldPrice,
  deepClone,
  discountedUnitGold,
  heroVisionRadius,
  marketBuyRateFloor,
  merchantPool,
  playerMarketCount,
  quoteArtifactPurchase,
  quoteConstruction,
  quoteRecruitBatch,
  quoteRecruitment,
  quoteSpellbook,
  quoteTrade,
  quoteTraining,
  quoteUpgrade,
  resources,
  townGate,
  townMarketRates,
  townShopPrice,
  townTrainingTerms,
  townVisionBonus,
  townVisionRadius,
  visibleCells,
  workshopPool,
  worldWeek,
  type ContentCatalog,
  type GameEvent,
  type MatchState,
  type ResourceKey,
  type ScenarioFeatures,
} from '../src';

const RICH = { gold: 100_000, wood: 200, stone: 200, crystal: 100 };
const ALEXIOS = { kind: 'hero', heroId: 'alexios' } as const;

function enableFeature(s: MatchState, on = true): void {
  (s.scenario as { features: ScenarioFeatures }).features = { ...s.scenario.features, cityDedicationsV1: on };
}

/** Honor `godId` in `townId`: feature on, Temple II, the god its owner's patron or committed minor god. */
function dedicate(d: GameDriver, townId: string, godId: string): void {
  const s = d.state;
  enableFeature(s);
  const town = s.towns[townId]!;
  town.buildings['pantheon_temple'] = 2;
  const pantheon = s.players[town.ownerId!]!.pantheon as { patronGodId: string | null; minorGodIds: string[] };
  if (d.catalog.gods[godId]!.role === 'patron') pantheon.patronGodId = godId;
  else if (!pantheon.minorGodIds.includes(godId)) pantheon.minorGodIds.push(godId);
  town.dedication = { activeGodId: godId, ownerId: town.ownerId, growthCredits: {}, lastProcessedWeek: 0 };
}

/** Twin Harbors (Greek vs Greek): the player's Westharbor honors `godId`; Alexios stands at its gate. */
function greek(godId: string, build: Record<string, number> = {}, catalog?: ContentCatalog): GameDriver {
  const base = GameDriver.mission('skirmish_twin_harbors', { matchId: 'test:city-services' });
  const d = catalog ? new GameDriver(base.state, catalog) : base;
  Object.assign(d.town('westharbor').buildings, build);
  d.player.wallet = resources(RICH);
  dedicate(d, 'westharbor', godId);
  return d;
}

/** The same map for two Norse empires: the player's Westharbor honors `godId`. */
function norse(godId: string, build: Record<string, number> = {}): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors_norse_vs_norse', { matchId: 'test:city-services-norse', startingGodId: 'norse_odin' });
  Object.assign(d.town('westharbor').buildings, build);
  d.player.wallet = resources(RICH);
  dedicate(d, 'westharbor', godId);
  return d;
}

/** Give the rival's Eastharbor to the player (a second, ordinary town of the same pantheon). */
function secondTown(d: GameDriver, build: Record<string, number> = {}): void {
  const east = d.town('eastharbor');
  east.ownerId = 'player';
  Object.assign(east.buildings, build);
}

/** A copy of the catalog with some creatures' Gold prices changed (the handoff's example prices). */
function withCreatureGold(catalog: ContentCatalog, prices: Record<string, number>): ContentCatalog {
  const creatures = { ...catalog.creatures };
  for (const [id, gold] of Object.entries(prices)) creatures[id] = { ...creatures[id]!, cost: { ...creatures[id]!.cost, gold } };
  return { ...catalog, creatures };
}

const spent = (events: readonly GameEvent[]) =>
  events.filter((e): e is Extract<GameEvent, { kind: 'ResourcesSpent' }> => e.kind === 'ResourcesSpent').reduce((n, e) => n + e.amount.gold, 0);

// ---------------------------------------------------------------------------

describe('price arithmetic (§06)', () => {
  it('per-unit ceiling gives the handoff examples; a positive price never reaches 0, zero stays 0', () => {
    expect(dedicationGoldPrice(61, 5)).toBe(58);
    expect(dedicationGoldPrice(61, 5) * 10).toBe(580);
    expect(dedicationGoldPrice(17, 15)).toBe(15);
    expect(dedicationGoldPrice(2500, 10)).toBe(2250);
    expect(dedicationGoldPrice(1000, 20)).toBe(800);
    expect(dedicationGoldPrice(500, 10)).toBe(450);
    expect(dedicationGoldPrice(1, 25)).toBe(1);
    expect(dedicationGoldPrice(0, 10)).toBe(0);
  });

  it('with another independent percentage discount the highest percent applies — never added or compounded', () => {
    expect(discountedUnitGold(1000, [20, 10])).toBe(800);
    expect(discountedUnitGold(1000, [10, 20])).toBe(800);
    expect(discountedUnitGold(1000, [])).toBe(1000);
    const d = greek('athena', { training_academy: 1 });
    const purchase = { kind: 'town_service', effect: 'enables_hero_training' } as const;
    const lower = dedicatedUnitCost(d.catalog, d.state, 'player', 'westharbor', purchase, { gold: 1000, wood: 2 }, [10]);
    expect(lower.unit).toEqual(resources({ gold: 800, wood: 2 }));
    expect(lower.discount).toEqual({ godId: 'athena', serviceId: 'training', percent: 20 });
    const higher = dedicatedUnitCost(d.catalog, d.state, 'player', 'westharbor', purchase, { gold: 1000 }, [30]);
    expect(higher.unit.gold).toBe(700);
    expect(higher.discount).toBeNull();
  });
});

describe('training (Athena: 20% off at the Training Academy)', () => {
  it('1000 → 800 Gold with its breakdown; XP unchanged; the commit charges 800', () => {
    const d = greek('athena', { training_academy: 1 });
    const q = quoteTraining(d.catalog, d.state, 'player', 'westharbor', 'alexios');
    expect(q.legal, q.reason ?? '').toBe(true);
    expect(q.cost).toEqual(resources({ gold: 800 }));
    expect(q.xp).toBe(500);
    expect(q.dedication).toEqual({ godId: 'athena', serviceId: 'training', percent: 20, normalGold: 1000, finalGold: 800, savedGold: 200 });
    // The terms screens show are the same numbers.
    expect(townTrainingTerms(d.catalog, d.state, 'player', 'westharbor')).toEqual({ xp: 500, gold: 800, normalGold: 1000, dedication: q.dedication });
    const gold = d.player.wallet.gold;
    const xp = d.hero().xp;
    const events = d.do({ kind: 'TrainHero', townId: 'westharbor', heroId: 'alexios' });
    expect(d.player.wallet.gold).toBe(gold - 800);
    expect(spent(events)).toBe(800);
    expect(events.find((e) => e.kind === 'HeroTrained')).toMatchObject({ gold: 800 });
    expect(d.hero().xp).toBe(xp + 500);
  });

  it('without the academy there is no discount (and no training)', () => {
    const d = greek('athena');
    const q = quoteTraining(d.catalog, d.state, 'player', 'westharbor', 'alexios');
    expect(q.legal).toBe(false);
    expect(q.code).toBe('missing_requirement');
    expect(q.dedication).toBeUndefined();
  });

  it('once per hero per week across two dedicated towns', () => {
    const d = greek('athena', { training_academy: 1 });
    secondTown(d, { training_academy: 1 });
    dedicate(d, 'eastharbor', 'athena');
    d.do({ kind: 'TrainHero', townId: 'westharbor', heroId: 'alexios' });
    d.hero().position = townGate(d.catalog, d.state, 'eastharbor');
    const again = quoteTraining(d.catalog, d.state, 'player', 'eastharbor', 'alexios');
    expect(again.legal).toBe(false);
    expect(again.code).toBe('already_done');
    d.reject({ kind: 'TrainHero', townId: 'eastharbor', heroId: 'alexios' });
    // Next week, at the other dedicated town: allowed again, at the discounted price.
    d.state.day += d.catalog.rulesProfile.daysPerWeek;
    const next = quoteTraining(d.catalog, d.state, 'player', 'eastharbor', 'alexios');
    expect(next.legal, next.reason ?? '').toBe(true);
    expect(next.cost.gold).toBe(800);
  });
});

describe('local to the active, eligible town', () => {
  const trainingGold = (d: GameDriver, townId = 'westharbor') => quoteTraining(d.catalog, d.state, 'player', townId, 'alexios').cost.gold;

  it('another town of the same owner pays the ordinary price', () => {
    const d = greek('athena', { training_academy: 1 });
    secondTown(d, { training_academy: 1, pantheon_temple: 2 });
    d.hero().position = townGate(d.catalog, d.state, 'eastharbor');
    expect(trainingGold(d, 'eastharbor')).toBe(1000);
    expect(quoteTraining(d.catalog, d.state, 'player', 'eastharbor', 'alexios').dedication).toBeUndefined();
  });

  it('a dormant dedication (Temple II lost) gives nothing until the temple stands again', () => {
    const d = greek('athena', { training_academy: 1 });
    d.town('westharbor').buildings['pantheon_temple'] = 1;
    expect(trainingGold(d)).toBe(1000);
    d.town('westharbor').buildings['pantheon_temple'] = 2;
    expect(trainingGold(d)).toBe(800);
  });

  it('a god of another pantheon, an uncommitted god, another owner or the feature off: no discount', () => {
    const foreign = greek('athena', { training_academy: 1 });
    foreign.town('westharbor').dedication!.activeGodId = 'norse_tyr'; // a Norse god with the training service
    expect(trainingGold(foreign)).toBe(1000);

    const uncommitted = greek('athena', { training_academy: 1 });
    (uncommitted.player.pantheon as { minorGodIds: string[] }).minorGodIds = [];
    expect(trainingGold(uncommitted)).toBe(1000);

    const stale = greek('athena', { training_academy: 1 });
    stale.town('westharbor').dedication!.ownerId = 'rival';
    expect(trainingGold(stale)).toBe(1000);

    const off = greek('athena', { training_academy: 1 });
    enableFeature(off.state, false);
    expect(trainingGold(off)).toBe(1000);
  });

  it('only the active god’s service applies; a pending switch gives nothing before it activates', () => {
    const d = greek('athena', { training_academy: 1, marketplace: 1, mage_guild: 1, dwelling_t1: 2 });
    d.hero().spellbook = false;
    const citadel = () => quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'citadel');
    expect(citadel().cost.gold).toBe(2500);
    expect(citadel().dedication).toBeUndefined();
    expect(quoteRecruitment(d.catalog, d.state, 'player', 'westharbor', 'hoplite', 1, ALEXIOS).unitCost.gold).toBe(60);
    expect(quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'gold', 'wood', 1).rate).toBe(500);
    expect(quoteSpellbook(d.catalog, d.state, 'alexios', 'westharbor').cost.gold).toBe(500);
    d.town('westharbor').dedication!.pending = { godId: 'zeus', requestedBy: 'player', activationWeek: 2 };
    expect(citadel().cost.gold).toBe(2500);
    expect(trainingGold(d)).toBe(800);
  });
});

describe('trade (Hermes: 10% off buying at this town’s market)', () => {
  it('buy rates 500 → 450 and 1000 → 900; sell rates unchanged; the commit charges the discounted price', () => {
    const d = greek('hermes', { marketplace: 1 });
    const buy = quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'gold', 'wood', 3);
    expect(buy.legal, buy.reason ?? '').toBe(true);
    expect(buy.rate).toBe(450);
    expect(buy.pay).toEqual(resources({ gold: 1350 }));
    expect(buy.dedication).toEqual({ godId: 'hermes', serviceId: 'trade', percent: 10, normalGold: 1500, finalGold: 1350, savedGold: 150 });
    expect(quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'gold', 'stone', 1).rate).toBe(450);
    expect(quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'gold', 'crystal', 1).rate).toBe(900);
    const sell = quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'wood', 'gold', 2);
    expect(sell.rate).toBe(50);
    expect(sell.dedication).toBeUndefined();
    expect(quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'crystal', 'gold', 1).rate).toBe(100);
    expect(townMarketRates(d.catalog, d.state, 'player', 'westharbor')).toMatchObject({ buyCommon: 450, buyCrystal: 900, sellCommon: 50, sellCrystal: 100, normalBuyCommon: 500, normalBuyCrystal: 1000 });
    const gold = d.player.wallet.gold;
    d.do({ kind: 'TradeResources', townId: 'westharbor', sell: 'gold', buy: 'wood', amount: 3 });
    expect(d.player.wallet.gold).toBe(gold - 1350);
  });

  it('local: another market of the owner trades at the ordinary tier, and the town is not an extra market', () => {
    const d = greek('hermes', { marketplace: 1 });
    secondTown(d, { marketplace: 1 });
    expect(playerMarketCount(d.catalog, d.state, 'player')).toBe(2);
    expect(quoteTrade(d.catalog, d.state, 'player', 'eastharbor', 'gold', 'wood', 1).rate).toBe(450); // tier 2, ordinary
    expect(quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'gold', 'wood', 1).rate).toBe(405); // tier 2 at 90%
    expect(quoteTrade(d.catalog, d.state, 'player', 'eastharbor', 'gold', 'wood', 1).dedication).toBeUndefined();
  });

  it('without a market there is no trade and no discount', () => {
    const d = greek('hermes');
    const q = quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'gold', 'wood', 1);
    expect(q.legal).toBe(false);
    expect(q.dedication).toBeUndefined();
  });

  it('a discounted buy rate never falls to the best ordinary sell rate of any tier', () => {
    const base = loadCatalog();
    expect(marketBuyRateFloor(base, 'wood')).toBe(76);
    expect(marketBuyRateFloor(base, 'crystal')).toBe(151);
    // A tier whose ordinary buy rates sit just above the sell rates: 80 × 90% = 72 → 76; 160 → 151.
    const tight = { ...base, rulesProfile: { ...base.rulesProfile, market: [...base.rulesProfile.market.slice(0, 2), { minMarkets: 3, buyCommon: 80, sellCommon: 75, buyCrystal: 160, sellCrystal: 150 }] } };
    const d = greek('hermes', { marketplace: 1 }, tight);
    secondTown(d, { marketplace: 1 });
    expect(quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'gold', 'wood', 1).rate).toBe(405);
    // Three markets need a third town: borrow a copy of Eastharbor's record under another id.
    d.state.towns['thirdharbor'] = { ...deepClone(d.town('eastharbor')), id: 'thirdharbor' };
    expect(playerMarketCount(d.catalog, d.state, 'player')).toBe(3);
    expect(quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'gold', 'wood', 1).rate).toBe(76);
    expect(quoteTrade(d.catalog, d.state, 'player', 'westharbor', 'gold', 'crystal', 1).rate).toBe(151);
    expect(quoteTrade(d.catalog, d.state, 'player', 'eastharbor', 'gold', 'wood', 1).rate).toBe(80);
  });
});

describe('market no-arbitrage sweep: every pair of towns, every tier, every resource', () => {
  const GOODS: ResourceKey[] = ['wood', 'stone', 'crystal'];
  const seats: SkirmishMapSeat[] = Array.from({ length: 6 }, (_, i) => ({ pantheonId: 'greek', controller: i === 0 ? 'human' : 'ai' }));

  /** Six Thrones with six Greek empires; the player holds three towns, the first `markets` with a Marketplace; `honored` towns honor Hermes. */
  function sweepState(catalog: ContentCatalog, markets: number, honored: readonly number[]): { d: GameDriver; towns: string[] } {
    const start = createGeneratedMatch(catalog, compileSkirmishMap(catalog, 'six_thrones', seats), { matchId: 'test:market-sweep' }).match;
    const d = new GameDriver(start, catalog);
    const towns = Object.values(d.state.towns)
      .map((t) => t.id)
      .sort()
      .slice(0, 3);
    towns.forEach((id, i) => {
      const t = d.town(id);
      t.ownerId = 'player';
      t.buildings['marketplace'] = i < markets ? 1 : 0;
      t.dedication = undefined;
    });
    d.player.wallet = resources({ gold: 1_000_000, wood: 100, stone: 100, crystal: 100 });
    for (const i of honored) dedicate(d, towns[i]!, 'hermes');
    return { d, towns };
  }

  function sweep(catalog: ContentCatalog): { minBuy: Record<string, number>; maxSell: Record<string, number>; checked: number } {
    const minBuy: Record<string, number> = {};
    const maxSell: Record<string, number> = {};
    let checked = 0;
    for (const markets of [1, 2, 3]) {
      for (const honored of [[], [0], [0, 1], [0, 1, 2]]) {
        const { d, towns } = sweepState(catalog, markets, honored);
        expect(playerMarketCount(d.catalog, d.state, 'player')).toBe(markets);
        const open = towns.filter((id) => d.town(id).buildings['marketplace'] === 1);
        for (const k of GOODS) {
          for (const a of open) {
            const buy = quoteTrade(d.catalog, d.state, 'player', a, 'gold', k, 1);
            expect(buy.legal, buy.reason ?? '').toBe(true);
            for (const b of open) {
              const sell = quoteTrade(d.catalog, d.state, 'player', b, k, 'gold', 1);
              expect(sell.legal, sell.reason ?? '').toBe(true);
              // Buying one at `a` and selling it at `b` (same moment, same tier) never makes Gold.
              expect(sell.receive.gold, `${markets} markets, honored ${honored}, ${k}: buy at ${a}, sell at ${b}`).toBeLessThan(buy.pay.gold);
              checked++;
            }
            minBuy[k] = Math.min(minBuy[k] ?? Infinity, buy.pay.gold);
          }
          for (const b of open) maxSell[k] = Math.max(maxSell[k] ?? 0, quoteTrade(d.catalog, d.state, 'player', b, k, 'gold', 1).receive.gold);
        }
      }
    }
    return { minBuy, maxSell, checked };
  }

  it('ordinary tiers: no immediate or cross-tier round trip makes Gold', () => {
    const { minBuy, maxSell, checked } = sweep(loadCatalog());
    expect(checked).toBeGreaterThan(100);
    // Across all tiers and towns (buy now, sell after a tier change): the cheapest buy beats the best sell.
    for (const k of GOODS) expect(minBuy[k]!, k).toBeGreaterThan(maxSell[k]!);
    expect(minBuy).toEqual({ wood: 360, stone: 360, crystal: 720 });
  });

  it('tight tiers (buy rates just above the sell rates): the floor still holds', () => {
    const base = loadCatalog();
    const tight = { ...base, rulesProfile: { ...base.rulesProfile, market: [{ minMarkets: 1, buyCommon: 82, sellCommon: 60, buyCrystal: 160, sellCrystal: 120 }, { minMarkets: 2, buyCommon: 81, sellCommon: 70, buyCrystal: 155, sellCrystal: 140 }, { minMarkets: 3, buyCommon: 80, sellCommon: 75, buyCrystal: 152, sellCrystal: 150 }] } };
    const { minBuy, maxSell } = sweep(tight);
    for (const k of GOODS) expect(minBuy[k]!, k).toBeGreaterThan(maxSell[k]!);
    expect(minBuy).toEqual({ wood: 76, stone: 76, crystal: 151 });
  });

  it('committed buy-then-sell round trips between every pair of towns lose Gold', () => {
    for (const markets of [1, 3]) {
      const { d, towns } = sweepState(loadCatalog(), markets, [0]);
      const open = towns.filter((id) => d.town(id).buildings['marketplace'] === 1);
      for (const k of GOODS) {
        for (const a of open) {
          for (const b of open) {
            const gold = d.player.wallet.gold;
            d.do({ kind: 'TradeResources', townId: a, sell: 'gold', buy: k, amount: 2 });
            d.do({ kind: 'TradeResources', townId: b, sell: k, buy: 'gold', amount: 2 });
            expect(d.player.wallet.gold, `${k}: ${a} → ${b}`).toBeLessThan(gold);
          }
        }
      }
    }
  });
});

describe('construction discounts (fortify, civic, dwelling, library)', () => {
  it('Zeus (fortify): Citadel 2500 Gold / 5 Stone → 2250 / 5; one build a day unchanged', () => {
    const d = greek('zeus');
    const q = quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'citadel');
    expect(q.legal, q.reason ?? '').toBe(true);
    expect(q.cost).toEqual(resources({ gold: 2250, stone: 5 }));
    expect(q.dedication).toEqual({ godId: 'zeus', serviceId: 'fortify', percent: 10, normalGold: 2500, finalGold: 2250, savedGold: 250 });
    const before = d.player.wallet;
    d.do({ kind: 'BuildStructure', townId: 'westharbor', buildingId: 'citadel' });
    expect(d.player.wallet.gold).toBe(before.gold - 2250);
    expect(d.player.wallet.stone).toBe(before.stone - 5);
    const castle = quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'castle');
    expect(castle.state).toBe('used_today');
    expect(castle.cost).toEqual(resources({ gold: 4500, wood: 10, stone: 10 }));
    // Other locations: ordinary prices.
    expect(quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'market').cost.gold).toBe(500);
  });

  it('the target need not exist yet, but the ordinary requirements do', () => {
    const d = greek('zeus');
    d.town('westharbor').buildings['fortifications'] = 0;
    const fort = quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'fort');
    expect(fort.legal, fort.reason ?? '').toBe(true);
    expect(fort.cost).toEqual(resources({ gold: 4500, wood: 20, stone: 20 }));
    const citadel = quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'citadel');
    expect(citadel.legal).toBe(false);
    expect(citadel.code).toBe('missing_requirement');
  });

  it('Hera (civic): the civic hall’s levels cost 10% less Gold; prerequisites unchanged', () => {
    const d = greek('hera');
    const hall = quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'town_hall');
    expect(hall.legal, hall.reason ?? '').toBe(true);
    expect(hall.cost.gold).toBe(2250);
    expect(hall.dedication?.serviceId).toBe('civic');
    d.town('westharbor').buildings['civic_hall'] = 2;
    const city = quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'city_hall');
    expect(city.cost.gold).toBe(4500);
    expect(city.code).toBe('missing_requirement');
    expect(quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'citadel').cost.gold).toBe(2500);
  });

  it('Poseidon (dwelling): the favored family’s dwelling, both levels, 10% less Gold; other dwellings ordinary', () => {
    const d = greek('poseidon', { workshop: 1 });
    const court = quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'training_court');
    expect(court.legal, court.reason ?? '').toBe(true);
    expect(court.cost).toEqual(resources({ gold: 1800, wood: 5, stone: 5 }));
    expect(court.dedication).toMatchObject({ serviceId: 'dwelling', normalGold: 2000, finalGold: 1800 });
    d.town('westharbor').buildings['dwelling_t4'] = 1;
    expect(quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'training_court_up').cost).toEqual(resources({ gold: 1800, stone: 5, crystal: 2 }));
    expect(quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'barracks_up').cost.gold).toBe(1000);
    expect(quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'griffin_aerie').cost.gold).toBe(2000);
  });

  it('Baldr (library, Norse): the rune circle’s levels cost 10% less Gold', () => {
    const d = norse('norse_baldr');
    const circle = quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'norse_rune_circle_1');
    expect(circle.legal, circle.reason ?? '').toBe(true);
    expect(circle.cost).toEqual(resources({ gold: 1800, wood: 5, stone: 5 }));
    expect(circle.dedication?.serviceId).toBe('library');
    d.town('westharbor').buildings['mage_guild'] = 1;
    expect(quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'norse_rune_circle_2').cost).toEqual(resources({ gold: 900, wood: 5, stone: 5, crystal: 4 }));
    expect(quoteConstruction(d.catalog, d.state, 'player', 'westharbor', 'norse_watchtower').cost.gold).toBe(1500);
  });
});

describe('spellbook (Apollo: 25% off at the Sanctum)', () => {
  it('500 → 375 Gold; learning stays free and mana is untouched', () => {
    const d = greek('apollo', { mage_guild: 1 });
    d.hero().spellbook = false;
    d.hero().knownSpellIds = [];
    const q = quoteSpellbook(d.catalog, d.state, 'alexios', 'westharbor');
    expect(q.legal, q.reason ?? '').toBe(true);
    expect(q.cost).toEqual(resources({ gold: 375 }));
    expect(q.dedication).toEqual({ godId: 'apollo', serviceId: 'spellbook', percent: 25, normalGold: 500, finalGold: 375, savedGold: 125 });
    const gold = d.player.wallet.gold;
    const mana = d.hero().mana;
    const events = d.do({ kind: 'BuySpellbook', heroId: 'alexios', townId: 'westharbor' });
    expect(d.player.wallet.gold).toBe(gold - 375);
    expect(events.filter((e) => e.kind === 'ResourcesSpent')).toHaveLength(1);
    expect(events.some((e) => e.kind === 'SpellsLearned')).toBe(true);
    expect(d.hero().knownSpellIds.length).toBeGreaterThan(0);
    expect(d.hero().mana).toBe(mana);
  });

  it('without a Sanctum: no spellbook and no discount', () => {
    const d = greek('apollo');
    d.hero().spellbook = false;
    const q = quoteSpellbook(d.catalog, d.state, 'alexios', 'westharbor');
    expect(q.legal).toBe(false);
    expect(q.cost.gold).toBe(500);
    expect(q.dedication).toBeUndefined();
  });
});

describe('recruit (Demeter: 5% off per Hoplite, both forms)', () => {
  it('both forms of the favored family, per unit; other families ordinary', () => {
    const d = greek('demeter', { dwelling_t1: 2, dwelling_t2: 1 });
    d.town('westharbor').population = { hoplite: 20, peltast: 10 };
    const base = quoteRecruitment(d.catalog, d.state, 'player', 'westharbor', 'hoplite', 3, ALEXIOS);
    expect(base.unitCost.gold).toBe(57);
    expect(base.totalCost.gold).toBe(171);
    expect(base.dedication).toEqual({ godId: 'demeter', serviceId: 'recruit', percent: 5, normalGold: 180, finalGold: 171, savedGold: 9 });
    expect(quoteRecruitment(d.catalog, d.state, 'player', 'westharbor', 'veteran_hoplite', 1, ALEXIOS).unitCost.gold).toBe(72); // ceil(71.25)
    const peltast = quoteRecruitment(d.catalog, d.state, 'player', 'westharbor', 'peltast', 1, ALEXIOS);
    expect(peltast.unitCost.gold).toBe(100);
    expect(peltast.dedication).toBeUndefined();
  });

  it('without the favored dwelling: no recruit, no discount', () => {
    const d = greek('demeter', { dwelling_t1: 0 });
    const q = quoteRecruitment(d.catalog, d.state, 'player', 'westharbor', 'hoplite', 1, ALEXIOS);
    expect(q.legal).toBe(false);
    expect(q.dedication).toBeUndefined();
  });

  it('the §06 example: 61 Gold → 58 each, ten for 580', () => {
    const d = greek('demeter', { dwelling_t1: 1 }, withCreatureGold(loadCatalog(), { hoplite: 61 }));
    d.town('westharbor').population = { hoplite: 10 };
    const q = quoteRecruitment(d.catalog, d.state, 'player', 'westharbor', 'hoplite', 10, ALEXIOS);
    expect(q.unitCost.gold).toBe(58);
    expect(q.totalCost.gold).toBe(580);
    expect(q.dedication).toMatchObject({ normalGold: 610, finalGold: 580, savedGold: 30 });
  });

  it('single, batch, max and both commits give identical per-unit prices for odd prices and quantities', () => {
    for (const price of [61, 77, 133, 1]) {
      const unit = dedicationGoldPrice(price, 5);
      for (const qty of [1, 3, 7, 10, 13]) {
        const d = greek('demeter', { dwelling_t1: 1 }, withCreatureGold(loadCatalog(), { hoplite: price }));
        d.town('westharbor').population = { hoplite: 40 };
        const single = quoteRecruitment(d.catalog, d.state, 'player', 'westharbor', 'hoplite', qty, ALEXIOS);
        const batch = quoteRecruitBatch(d.catalog, d.state, 'player', 'westharbor', [{ creatureId: 'hoplite', quantity: qty }], ALEXIOS);
        expect(single.unitCost.gold, `${price}`).toBe(unit);
        expect(single.totalCost.gold).toBe(unit * qty);
        expect(batch.lines[0]!.unitCost.gold).toBe(unit);
        expect(batch.lines[0]!.totalCost.gold).toBe(unit * qty);
        expect(batch.totalCost.gold).toBe(unit * qty);
        expect(batch.dedication).toEqual(single.dedication);
        // Max: exactly what the wallet buys at the per-unit price.
        d.player.wallet = resources({ gold: unit * qty + unit - 1 });
        expect(quoteRecruitment(d.catalog, d.state, 'player', 'westharbor', 'hoplite', 1, ALEXIOS).maxQuantity).toBe(qty);
        d.player.wallet = resources(RICH);
        const one = d.do({ kind: 'RecruitUnits', townId: 'westharbor', creatureId: 'hoplite', quantity: qty, destination: ALEXIOS });
        expect(spent(one)).toBe(unit * qty);
        const many = d.do({ kind: 'RecruitBatch', townId: 'westharbor', items: [{ creatureId: 'hoplite', quantity: qty }], destination: ALEXIOS });
        expect(spent(many)).toBe(unit * qty);
        // A price is never split into a cheaper order: one-by-one costs the same as all at once.
        expect(unit * qty).toBe([...Array(qty)].reduce((n) => n + unit, 0));
        expect(unit).toBeGreaterThan(0);
      }
    }
  });

  it('a mixed batch discounts only the favored family’s line; recruit all charges the quoted total', () => {
    const d = greek('demeter', { dwelling_t1: 1, dwelling_t2: 1 });
    d.town('westharbor').population = { hoplite: 7, peltast: 3 };
    const items = [{ creatureId: 'hoplite', quantity: 7 }, { creatureId: 'peltast', quantity: 3 }];
    const q = quoteRecruitBatch(d.catalog, d.state, 'player', 'westharbor', items, ALEXIOS);
    expect(q.legal, q.reason ?? '').toBe(true);
    expect(q.totalCost.gold).toBe(7 * 57 + 3 * 100);
    expect(q.lines[1]!.dedication).toBeUndefined();
    expect(q.dedication).toMatchObject({ normalGold: 420, finalGold: 399, savedGold: 21 });
    expect(spent(d.do({ kind: 'RecruitBatch', townId: 'westharbor', items, destination: ALEXIOS }))).toBe(q.totalCost.gold);
  });
});

describe('upgrade (Ares: 15% off the Peltast upgrade difference)', () => {
  it('the catalog difference per unit (50 → 43), times the quantity; no population consumed', () => {
    const d = greek('ares', { dwelling_t2: 2 });
    d.town('westharbor').population = { peltast: 5 };
    const slot = d.hero().army.slots.findIndex((s) => s?.creatureId === 'peltast');
    expect(slot).toBeGreaterThanOrEqual(0);
    d.hero().army.slots[slot]!.count = 9;
    const q = quoteUpgrade(d.catalog, d.state, 'player', 'westharbor', ALEXIOS, slot, 3);
    expect(q.legal, q.reason ?? '').toBe(true);
    expect(q.unitCost.gold).toBe(43);
    expect(q.totalCost.gold).toBe(129);
    expect(q.dedication).toEqual({ godId: 'ares', serviceId: 'upgrade', percent: 15, normalGold: 150, finalGold: 129, savedGold: 21 });
    const events = d.do({ kind: 'UpgradeStack', townId: 'westharbor', army: ALEXIOS, slot, quantity: 3 });
    expect(spent(events)).toBe(129);
    expect(d.town('westharbor').population['peltast']).toBe(5);
  });

  it('the §06 example: a 17 Gold difference → 15 each', () => {
    const d = greek('ares', { dwelling_t2: 2 }, withCreatureGold(loadCatalog(), { peltast: 100, veteran_peltast: 117 }));
    const slot = d.hero().army.slots.findIndex((s) => s?.creatureId === 'peltast');
    d.hero().army.slots[slot]!.count = 4;
    const q = quoteUpgrade(d.catalog, d.state, 'player', 'westharbor', ALEXIOS, slot, 4);
    expect(q.unitCost.gold).toBe(15);
    expect(q.totalCost.gold).toBe(60);
  });

  it('without the upgraded dwelling: no training and no discount', () => {
    const d = greek('ares', { dwelling_t2: 1 });
    const slot = d.hero().army.slots.findIndex((s) => s?.creatureId === 'peltast');
    const q = quoteUpgrade(d.catalog, d.state, 'player', 'westharbor', ALEXIOS, slot, 1);
    expect(q.legal).toBe(false);
    expect(q.dedication).toBeUndefined();
  });

  it('never derived from discounted recruitment prices', () => {
    // Demeter discounts Hoplite recruitment (70 → 67, 90 → 86): the upgrade still costs the catalog difference, 20.
    const d = greek('demeter', { dwelling_t1: 2 }, withCreatureGold(loadCatalog(), { hoplite: 70, veteran_hoplite: 90 }));
    const slot = d.hero().army.slots.findIndex((s) => s?.creatureId === 'hoplite');
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(quoteRecruitment(d.catalog, d.state, 'player', 'westharbor', 'veteran_hoplite', 1, ALEXIOS).unitCost.gold - quoteRecruitment(d.catalog, d.state, 'player', 'westharbor', 'hoplite', 1, ALEXIOS).unitCost.gold).toBe(19);
    const q = quoteUpgrade(d.catalog, d.state, 'player', 'westharbor', ALEXIOS, slot, 1);
    expect(q.unitCost.gold).toBe(20);
    expect(q.dedication).toBeUndefined();
  });
});

describe('equipment (Loki: 10% off at the Rune Merchant and the Smithy)', () => {
  function shops(build: Record<string, number>) {
    const d = norse('norse_loki', build);
    const town = d.town('westharbor');
    const week = worldWeek(d.state, d.catalog.rulesProfile.daysPerWeek);
    town.merchant = { week, stock: merchantPool(d.catalog, d.state).slice(0, 4) };
    town.workshop = { week, stock: workshopPool(d.catalog, ['treasure'], d.state).slice(0, 4) };
    return d;
  }

  it('both shops, Gold only; the stock is unchanged and the commit charges the discounted price', () => {
    const d = shops({ artifact_merchant: 1, workshop: 1 });
    const town = d.town('westharbor');
    const merchantBefore = [...town.merchant!.stock];
    const workshopBefore = [...town.workshop!.stock];
    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && !h.monster && h.status === 'active')!;
    for (const shop of ['merchant', 'workshop'] as const) {
      const artifactId = (shop === 'merchant' ? merchantBefore : workshopBefore)[0]!;
      const price = resources(d.catalog.artifacts[artifactId]!.merchantPrice ?? {});
      const q = quoteArtifactPurchase(d.catalog, d.state, 'player', 'westharbor', hero.id, 0, shop);
      expect(q.legal, q.reason ?? '').toBe(true);
      expect(q.cost).toEqual({ ...price, gold: dedicationGoldPrice(price.gold, 10) });
      expect(q.dedication).toMatchObject({ godId: 'norse_loki', serviceId: 'equipment', normalGold: price.gold });
      // The price the shop shows (also before a hero visits) is the same.
      expect(townShopPrice(d.catalog, d.state, 'player', 'westharbor', artifactId, shop)).toEqual({ cost: q.cost, dedication: q.dedication });
    }
    // Quoting changes nothing; the dedication never rerolls or adds stock.
    expect(town.merchant!.stock).toEqual(merchantBefore);
    expect(town.workshop!.stock).toEqual(workshopBefore);
    const q = quoteArtifactPurchase(d.catalog, d.state, 'player', 'westharbor', hero.id, 1, 'workshop');
    const gold = d.player.wallet.gold;
    d.do({ kind: 'BuyArtifact', townId: 'westharbor', heroId: hero.id, index: 1, shop: 'workshop' });
    expect(d.player.wallet.gold).toBe(gold - q.cost.gold);
    expect(d.town('westharbor').workshop!.stock).toEqual(workshopBefore.map((a, i) => (i === 1 ? null : a)));
    expect(d.town('westharbor').merchant!.stock).toEqual(merchantBefore);
  });

  it('a shop that is not built sells nothing; the other keeps its discount', () => {
    const d = shops({ workshop: 1 });
    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && !h.monster && h.status === 'active')!;
    const merchant = quoteArtifactPurchase(d.catalog, d.state, 'player', 'westharbor', hero.id, 0, 'merchant');
    expect(merchant.legal).toBe(false);
    expect(merchant.dedication).toBeUndefined();
    expect(quoteArtifactPurchase(d.catalog, d.state, 'player', 'westharbor', hero.id, 0, 'workshop').dedication?.serviceId).toBe('equipment');
  });
});

describe('watch (Artemis: +2 town vision while the Watchtower stands)', () => {
  const ring = (d: GameDriver, r: number) => {
    const t = d.town('westharbor');
    return cellsWithin(d.state.world.map, t.coord, r).filter((c) => axialDistance(c, t.coord) === r).map((c) => cellIndex(d.state.world.map, c));
  };

  it('8 → 10 hexes only with the Watchtower; no hero bonus and no fog reveal', () => {
    const d = greek('artemis');
    const town = d.town('westharbor');
    expect(townVisionBonus(d.catalog, d.state, 'westharbor')).toBe(0);
    expect(townVisionRadius(d.catalog, d.state, town)).toBe(3);
    town.buildings['watchtower'] = 1;
    expect(townVisionRadius(d.catalog, d.state, town)).toBe(10);
    // Fog: the town's own vision reaches 10 hexes (not 11); the explored map is not changed by it.
    d.hero().position = townGate(d.catalog, d.state, 'eastharbor'); // keep the hero's sight out of the way
    const explored = [...d.state.fog['player']!.explored];
    const seen = visibleCells(d.catalog, d.state, 'player');
    const ten = ring(d, 10);
    expect(ten.length).toBeGreaterThan(0);
    for (const i of ten) expect(seen.has(i)).toBe(true);
    for (const i of ring(d, 11)) expect(seen.has(i)).toBe(false);
    expect(d.state.fog['player']!.explored).toEqual(explored);
    // No hero vision bonus.
    const heroRadius = heroVisionRadius(d.catalog, d.hero(), d.state);
    town.dedication = undefined;
    expect(heroVisionRadius(d.catalog, d.hero(), d.state)).toBe(heroRadius);
    expect(townVisionRadius(d.catalog, d.state, town)).toBe(8);
  });

  it('follows watchtower and temple loss, capture and load — derived from the state every time', () => {
    const d = greek('artemis', { watchtower: 1 });
    const town = () => d.town('westharbor');
    const radius = () => townVisionRadius(d.catalog, d.state, town());
    expect(radius()).toBe(10);
    town().buildings['watchtower'] = 0;
    expect(radius()).toBe(3);
    town().buildings['watchtower'] = 1;
    town().buildings['pantheon_temple'] = 1;
    expect(radius()).toBe(8);
    town().buildings['pantheon_temple'] = 2;
    // Load: a saved copy computes the same vision.
    const loaded = JSON.parse(JSON.stringify(d.state)) as MatchState;
    expect(townVisionRadius(d.catalog, loaded, loaded.towns['westharbor']!)).toBe(10);
    // Capture: the owner changes and the dedication is cleared (as the capture hook does).
    d.hero().position = townGate(d.catalog, d.state, 'eastharbor');
    const before = visibleCells(d.catalog, d.state, 'player');
    for (const i of ring(d, 10)) expect(before.has(i)).toBe(true);
    town().ownerId = 'rival';
    town().dedication = { activeGodId: null, ownerId: null, growthCredits: {}, lastProcessedWeek: 0 };
    expect(radius()).toBe(8);
    const lost = visibleCells(d.catalog, d.state, 'player');
    for (const i of ring(d, 10)) expect(lost.has(i)).toBe(false);
    const rival = visibleCells(d.catalog, d.state, 'rival');
    for (const i of ring(d, 8)) expect(rival.has(i)).toBe(true);
    // Even a stale record naming the old owner gives the new owner nothing.
    town().dedication = { activeGodId: 'artemis', ownerId: 'player', growthCredits: {}, lastProcessedWeek: 0 };
    expect(radius()).toBe(8);
  });
});
