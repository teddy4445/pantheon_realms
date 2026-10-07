/**
 * StrategicPlanner + ActionGenerator for adventure turns.
 *
 * Works on the redacted belief state only. Produces an ORDERED list of candidate
 * commands; the controller submits them through the normal CommandProcessor and
 * falls through to the next candidate on rejection. EndTurn is always last.
 *
 * Profiles:
 *   strategic — full empire behaviour: level-ups, build, recruit, reinforce,
 *               collect, capture, fight favorable battles.
 *   patrol    — the finite M03 Scout Captain: waypoint circuit inside its region,
 *               attacks a visible target only above its documented threshold.
 */
import {
  axialDistance,
  axialNeighbors,
  cellIndex,
  cellsWithin,
  parseHexKey,
  reachableTiles,
  effectiveAttributes,
  movementBudget,
  hexEquals,
  hexKey,
  quoteConstruction,
  quoteHireHero,
  quoteMovement,
  quoteRecruitment,
  playerTowns,
  recruitableCreatureIds,
  townFortificationLevel,
  townSlots,
  visibleCells,
  type CommandPayload,
  type ContentCatalog,
  type HeroState,
  type MatchState,
  type PlayerId,
  type StackSpec,
  type HexCoord, requireScenarioMission,
  goldEquivalent,
  maxSpellTierLearnable,
  questHutProgress,
  quoteNeutralReaction,
  worldWeek,
  dayOfWeek, heroInTown, townGate, HIRE_STARTING_TROOPS,
} from '@pr/rules';
import type { AIObservation } from './observation';
import { armyStrength, fightingStrength } from './evaluation';
import { buildReserve, heroPower, hireReserve, weekPlan } from './assessment';
import { campCandidates, godCandidates, interventionCandidates,
  giftCandidates, mapEventCandidates, offeringCandidates, siteCandidates, trainingCandidates } from './services';
import { equipCandidates, levelUpCandidates, merchantCandidates, movementSpellCandidate, recallSpellCandidate, scoutingSpellCandidate, specialtyHireValue } from './growth';
import { aiPersonalityFor, aiTemperamentFor, temperBuildScore } from './temperament';
import { courierMove, handOffTransfer, handOffsActive, isCourier, mainHero } from './handoff';
import type { AITemperamentDefinition } from '@pr/rules';

/**
 * Data-driven build scoring (works for any pantheon's town tree): income first,
 * then new dwellings by tier, growth, hiring/market access and prerequisites
 * that unlock many other buildings. Heuristic, not a proven build order.
 */
function buildScore(catalog: ContentCatalog, buildingId: string, heroCount: number, temperament?: AITemperamentDefinition): number {
  const def = catalog.buildings[buildingId];
  if (!def) return 0;
  let score = 0;
  for (const e of def.effects) {
    if (e.type === 'daily_income') score += e.resource === 'gold' ? e.amount * 2 : e.resource === 'favor' ? 300 : 700;
    else if (e.type === 'growth_multiplier') score += 1500;
    else if (e.type === 'enables_hero_hiring') score += heroCount < 3 ? 900 : 200;
    else if (e.type === 'enables_market') score += 500;
    else if (e.type === 'spell_library') score += 350;
    else if (e.type === 'enables_hero_training') score += 260;
    else if (e.type === 'town_vision_radius') score += 220;
    else if (e.type === 'enables_artifact_merchant') score += 300;
  }
  if (def.dwelling) {
    const tier = catalog.families[def.dwelling.familyId]?.tier ?? 1;
    score += def.dwelling.form === 'base' ? 600 + tier * 350 : 300 + tier * 220;
  }
  // Prerequisite value: how many other buildings name this one directly.
  let unlocks = 0;
  for (const other of Object.values(catalog.buildings)) {
    if (other.pantheonId !== def.pantheonId || other.implementationStatus !== 'implemented') continue;
    if (other.requirements.some((r) => r.type === 'has_building' && r.buildingId === buildingId)) unlocks++;
  }
  score += unlocks * 380;
  // Temperament (scenario feature aiTemperaments): weights by kind of building, plus a
  // bonus for favoured kinds the score above values little (walls, Temple).
  if (temperament) score = temperBuildScore(catalog, buildingId, temperament, score);
  const gold = def.cost.gold ?? 0;
  return score / (1 + gold / 6000);
}

const HIRE_RESERVE_GOLD = 3000;

/**
 * Tavern preference: the specialty's value, plus or minus a spellcaster's
 * worth for a temperament that favours (or neglects) magic.
 */
function hireValue(catalog: ContentCatalog, definitionId: string, pantheonId: string, temperament: AITemperamentDefinition): number {
  const base = specialtyHireValue(catalog, definitionId, pantheonId);
  if (temperament.magic === 1) return base;
  const def = catalog.heroes[definitionId];
  const caster = !!def && !!catalog.heroClasses[def.classId]?.startsWithSpellbook;
  return caster ? base + (temperament.magic - 1) * 20 : base;
}

/** An enemy hero within this many hexes of a town counts as a threat to it. */
const THREAT_RADIUS = 8;
/** Strength ratio a hero needs before it attacks an enemy hero in the field. */
const HERO_ATTACK_MARGIN = 1.2;
/** A visible enemy at least this strong (relative) that can reach a tile next turn makes it dangerous. */
const DANGER_MARGIN = 1.0;

/**
 * Home guard (owner request 2026-10-06: "the computer leaves its towns empty").
 * A hero visiting a town leaves this share of the strength there (its army
 * and the garrison together) in the garrison: the lowest tiers first, so a
 * scout or a secondary hero can no longer walk into an empty town, and a main
 * army has to fight its way in (the maps balance runs of 2026-10-05 saw towns
 * lost on days 5–8 to the first army that found an empty garrison). A
 * temperament that favours defence (build weight) keeps more, an aggressive
 * one less (10–30 %). Days 1–3 keep nothing back (the first days decide the
 * expansion), the rest of week 1 half the share. Proposed values.
 */
const HOME_GUARD_SHARE = 0.2;
const HOME_GUARD_FROM_DAY = 4;
const HOME_GUARD_FULL_DAY = 8;
/** A visible enemy hero this close to a town (about two days' march) raises its guard (homeGuardTransfers). */
const GUARD_THREAT_RADIUS = 16;

export function homeGuardShare(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): number {
  if (belief.day < HOME_GUARD_FROM_DAY) return 0;
  const t = aiTemperamentFor(catalog, belief, playerId);
  const share = Math.max(0.1, Math.min(0.3, (HOME_GUARD_SHARE * (t.build.defense ?? 1)) / Math.max(0.5, t.aggression)));
  return belief.day < HOME_GUARD_FULL_DAY ? share / 2 : share;
}

type Slot = { creatureId: string; count: number } | null | undefined;
/** Plain heuristic strength (linear in count, so splitting a stack between hero and town changes nothing). */
const plainOf = (catalog: ContentCatalog, slots: readonly Slot[]) => armyStrength(catalog, slots.filter((x): x is NonNullable<Slot> => !!x && x.count > 0).map((x) => ({ creatureId: x.creatureId, count: x.count })));

/**
 * The army of a hero fresh from a rival's Tavern (its town's tier-1 escort, public
 * rules data): the cheapest raider that could walk into one of our towns. The
 * strongest such escort among the rival empires.
 */
function raiderPrior(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): number {
  let best = 0;
  for (const [id, p] of Object.entries(belief.players)) {
    if (id === playerId || p.eliminated) continue;
    const fam = catalog.pantheons[p.pantheonId]?.roster[0];
    const creatureId = fam ? catalog.families[fam.familyId]?.baseCreatureId : undefined;
    if (creatureId) best = Math.max(best, armyStrength(catalog, [{ creatureId, count: HIRE_STARTING_TROOPS }]));
  }
  return best;
}

/** The strength a town keeps when `heroSlots` visit it: `share` of the hero's army and the garrison together. */
function homeGuardTarget(catalog: ContentCatalog, share: number, heroSlots: readonly Slot[], garrison: readonly Slot[]): number {
  return share > 0 ? share * plainOf(catalog, [...heroSlots, ...garrison]) : 0;
}

/**
 * The visiting hero's moves between its army and the garrison: take the
 * garrison's stacks (highest tier first) while what stays home is still worth
 * the guard (a partial stack when only part can go), then, if the garrison is
 * short of its guard, leave the hero's lowest-tier creatures there (shooters
 * first among equals) — never the hero's last creature.
 *
 * `threat`: the strongest visible enemy hero within about two days' march of
 * the town (the visitor being strong enough not to be held inside), and from
 * day 4 at least a rival's fresh Tavern hero (`raiderPrior`). The guard then
 * grows to hold the walls against that hero alone (its strength over the
 * walls' factor, at most 60 % of the strength there): heroes used to leave a
 * town behind with a fifth of the strength, and a rival's ten-creature hero
 * walked in two days later (maps balance trace, The Burning Oasis, 2026-10-06).
 */
function homeGuardTransfers(catalog: ContentCatalog, town: MatchState['towns'][string], visitor: HeroState, share: number, nearThreat = 0): CommandPayload[] {
  const out: CommandPayload[] = [];
  const heroSlots = visitor.army.slots;
  const gSlots = town.garrison.slots;
  const walls = 1 + 0.25 * townFortificationLevel(catalog, town);
  const combined = plainOf(catalog, [...heroSlots, ...gSlots]);
  const target = Math.max(homeGuardTarget(catalog, share, heroSlots, gSlots), Math.min(0.6 * combined, nearThreat / walls));
  const per = (id: string) => armyStrength(catalog, [{ creatureId: id, count: 1 }]);
  const tier = (id: string) => catalog.creatures[id]?.tier ?? 0;
  let kept = plainOf(catalog, gSlots);
  const order = gSlots.map((s, i) => ({ s, i })).flatMap((x) => (x.s && x.s.count > 0 ? [{ s: x.s as { creatureId: string; count: number }, i: x.i }] : [])).sort((a, b) => tier(b.s.creatureId) - tier(a.s.creatureId) || a.i - b.i);
  for (const { s, i } of order) {
    const merge = heroSlots.findIndex((x) => x?.creatureId === s.creatureId);
    const empty = heroSlots.findIndex((x) => !x);
    const to = merge >= 0 ? merge : empty;
    if (to < 0) continue;
    const unit = per(s.creatureId);
    const spare = unit > 0 ? Math.floor((kept - target) / unit + 1e-9) : s.count;
    const qty = Math.min(s.count, Math.max(0, spare));
    if (qty <= 0) continue;
    out.push({ kind: 'TransferStack', from: { kind: 'garrison', townId: town.id }, fromSlot: i, to: { kind: 'hero', heroId: visitor.id }, toSlot: to, quantity: qty });
    kept -= qty * unit;
  }
  if (target > 0 && kept < target - 1e-6) {
    const heroCreatures = heroSlots.reduce((n, x) => n + (x?.count ?? 0), 0);
    const leave = heroSlots
      .map((s, j) => ({ s, j }))
      .flatMap((x) => (x.s && x.s.count > 0 ? [{ s: x.s as { creatureId: string; count: number }, j: x.j }] : []))
      .sort((a, b) => tier(a.s.creatureId) - tier(b.s.creatureId) || Number(!!catalog.creatures[b.s.creatureId]?.stats?.shots) - Number(!!catalog.creatures[a.s.creatureId]?.stats?.shots) || a.j - b.j);
    for (const { s, j } of leave) {
      const merge = gSlots.findIndex((x) => x?.creatureId === s.creatureId);
      const empty = gSlots.findIndex((x) => !x || x.count <= 0);
      const to = merge >= 0 ? merge : empty;
      if (to < 0) continue;
      const unit = per(s.creatureId);
      const need = unit > 0 ? Math.ceil((target - kept) / unit - 1e-9) : 0;
      const qty = Math.min(need, s.count, heroCreatures - 1);
      if (qty <= 0) continue;
      out.push({ kind: 'TransferStack', from: { kind: 'hero', heroId: visitor.id }, fromSlot: j, to: { kind: 'garrison', townId: town.id }, toSlot: to, quantity: qty });
      break;
    }
  }
  return out;
}

/**
 * Tie-break for equally scored moves: a hash of the empire and the option key.
 * Ordering ties by the key alone (its coordinates) made empires on opposite
 * sides of a mirrored map prefer different directions — the west explored
 * toward the middle, the east away from it.
 */
function tieHash(playerId: PlayerId, key: string): number {
  let h = 0x811c9dc5;
  const s = `${playerId}|${key}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function byScoreThenTie(playerId: PlayerId) {
  return (a: { score: number; key: string }, b: { score: number; key: string }) =>
    b.score - a.score || tieHash(playerId, a.key) - tieHash(playerId, b.key) || (a.key < b.key ? -1 : 1);
}

/** A hero's fighting power as the AI judges it: army, commander, skills, set and pantheon bonuses, morale, luck, magic (assessment.ts). */
function heroStrength(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  return heroPower(catalog, state, hero);
}

/** Expected strength of an unseen town's garrison (see heroTargets): a public-information prior. */
function unseenGarrisonPrior(catalog: ContentCatalog, belief: MatchState, pantheonId: string): number {
  const roster = catalog.pantheons[pantheonId]?.roster ?? [];
  const week: StackSpec[] = [];
  for (const r of roster) {
    const fam = catalog.families[r.familyId];
    if (fam && fam.tier <= 5) week.push({ creatureId: fam.baseCreatureId, count: fam.baseGrowth });
  }
  const weeks = Math.min(8, Math.max(1, Math.ceil(belief.day / 7)));
  return 0.5 * fightingStrength(catalog, week) * weeks;
}

function withinRegion(hero: HeroState, c: HexCoord): boolean {
  if (!hero.ai) return true;
  if (hero.ai.regionCenter && hero.ai.regionRadius !== undefined && axialDistance(hero.ai.regionCenter, c) > hero.ai.regionRadius) return false;
  return c.q >= hero.ai.regionMinQ && c.q <= hero.ai.regionMaxQ;
}

interface Target {
  readonly coord: HexCoord;
  readonly value: number;
  readonly encounter: boolean;
  readonly label: string;
  /** Strength of the army fought on arrival (guards or an enemy hero), for the post-fight estimate. */
  readonly fights?: number;
  /** Enemy hero targeted by this move (never counted as a danger to itself). */
  readonly enemyHeroId?: string;
  /** Ends inside a town (walls): not checked for field danger. */
  readonly town?: boolean;
}

/** Days after losing a town during which the empire counterattacks it (2026-10-07). */
const RETAKE_DAYS = 21;
/** A lost town is worth this much more to retake… */
const RETAKE_VALUE = 1.6;
/** …and is besieged at closer odds (never below even). */
const RETAKE_MARGIN = 0.85;

/** Towns this empire lost recently and has not retaken (public: ownership changes are seen by all). */
export function recentlyLostTowns(belief: MatchState, playerId: PlayerId): Set<string> {
  return new Set((belief.players[playerId]?.lostTowns ?? []).filter((x) => belief.day - x.day <= RETAKE_DAYS && belief.towns[x.townId]?.ownerId !== playerId).map((x) => x.townId));
}

function heroTargets(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): Target[] {
  const out: Target[] = [];
  const mission = requireScenarioMission(catalog, belief);
  const persona = aiPersonalityFor(catalog, belief, playerId);
  const lostTowns = recentlyLostTowns(belief, playerId);
  // Temperament: rival heroes, towns and mines are worth more (or less) to raiders.
  const raid = aiTemperamentFor(catalog, belief, playerId).aggression;
  const holdRelic = mission.victoryCondition?.type === 'hold_site' ? mission.victoryCondition.siteId : null;
  const wallet = belief.players[playerId]?.wallet;
  const myStrength = heroStrength(catalog, belief, hero);
  const visible = visibleCells(catalog, belief, playerId);
  for (const def of mission.sites) {
    const st = belief.world.sites[def.id];
    if (!st) continue; // unknown to this player
    if (def.guard && !st.cleared) {
      const guardStr = fightingStrength(catalog, st.guard ?? def.guard.army, def.guard.commander ? { attack: def.guard.commander.attributes.attack, defense: def.guard.commander.attributes.defense } : undefined);
      if (myStrength >= guardStr * persona.guardMargin) {
        const reward = def.guard.reward.resources?.gold ?? 0;
        out.push({ coord: def.coord, value: 600 + reward + guardStr * 0.2, encounter: true, label: def.name, fights: guardStr });
      }
      continue;
    }
    switch (def.kind.type) {
      case 'pickup':
        if (!st.claimed) out.push({ coord: def.coord, value: 700 + (def.kind.reward.resources?.gold ?? 0), encounter: false, label: def.name });
        break;
      case 'resource_site':
        if (st.owner !== playerId) out.push({ coord: def.coord, value: (def.kind.resource === 'gold' ? 2500 : 1200) * (st.owner ? raid : 1), encounter: false, label: def.name });
        break;
      case 'town': {
        const town = belief.towns[def.kind.townId];
        if (!town || town.ownerId === playerId) break;
        // An empire's last town ends it: worth half again as much (ownership is public).
        // A town this empire just lost is worth more again, and taken back at closer odds.
        const retake = lostTowns.has(town.id);
        const siegeMargin = retake ? Math.max(1, persona.siegeMargin * RETAKE_MARGIN) : persona.siegeMargin;
        const last = (!!town.ownerId && Object.values(belief.towns).filter((x) => x.ownerId === town.ownerId).length <= 1 ? 1.5 : 1) * (town.ownerId ? raid : 1) * (retake ? RETAKE_VALUE : 1);
        if (!visible.has(cellIndex(belief.world.map, town.coord))) {
          // Garrison unknown: approach (the real move is refused if it would start an unplanned
          // siege) only when strong enough for a typical garrison — half a week of the town's
          // tier 1–5 growth per week played, up to eight weeks. Weak heroes used to walk up,
          // see the walls, walk home and come back the next day for weeks on end.
          const prior = unseenGarrisonPrior(catalog, belief, town.pantheonId);
          if (myStrength >= prior * siegeMargin) out.push({ coord: def.coord, value: (myStrength >= 2 * prior * siegeMargin ? 4000 : 2500) * last, encounter: false, label: town.name });
          break;
        }
        const garrison: StackSpec[] = town.garrison.slots.filter((x): x is NonNullable<typeof x> => !!x && x.count > 0).map((x) => ({ creatureId: x.creatureId, count: x.count }));
        const visitor = Object.values(belief.heroes).find((h) => h.status === 'active' && h.ownerId !== playerId && heroInTown(catalog, belief, h, town.id));
        if (garrison.length === 0 && !visitor) {
          out.push({ coord: def.coord, value: 6000 * last, encounter: false, label: town.name, town: true });
          break;
        }
        // Siege: walls, keep and towers favour the defender; demand a clear margin.
        const defense = fightingStrength(catalog, garrison) + (visitor ? heroStrength(catalog, belief, visitor) : 0);
        const walls = 1 + 0.25 * townFortificationLevel(catalog, town);
        if (myStrength >= defense * walls * siegeMargin) {
          out.push({ coord: def.coord, value: (8000 + defense * 0.3) * last, encounter: true, label: `Siege of ${town.name}`, town: true });
        }
        break;
      }
      case 'creature_camp': {
        const creature = catalog.creatures[def.kind.creatureId];
        const stock = st.stock ?? def.kind.initialStock;
        const unit = creature?.cost?.gold ?? 0;
        if (creature && stock > 0 && wallet && unit > 0 && wallet.gold >= unit * Math.min(stock, 3) + 1500 && hero.army.slots.some((x) => !x || x.creatureId === creature.id)) {
          out.push({ coord: def.coord, value: 500 + Math.min(stock * unit, wallet.gold) * 0.25, encounter: false, label: def.name });
        }
        break;
      }
      case 'map_event':
        if (!st.claimed) out.push({ coord: def.coord, value: 900, encounter: false, label: def.name });
        break;
      case 'portal':
        // Learn where an unknown portal leads (both ends are known after one use).
        if (!st.visitedBy.includes(playerId)) out.push({ coord: def.coord, value: 600, encounter: false, label: def.name });
        break;
      case 'relic':
        if (st.owner !== playerId) out.push({ coord: def.coord, value: def.id === holdRelic ? 9000 : 1500, encounter: false, label: def.name });
        break;
      // --- Sites added 2026-10-02 (random maps) ---
      case 'learning_stone':
        if (!(st.usedBy ?? []).includes(hero.id)) out.push({ coord: def.coord, value: 400 + def.kind.xp, encounter: false, label: def.name });
        break;
      case 'spell_shrine': {
        const sp = catalog.spells[def.kind.spellId];
        if (sp && hero.spellbook && !hero.knownSpellIds.includes(sp.id) && sp.tier <= maxSpellTierLearnable(catalog, hero)) out.push({ coord: def.coord, value: 800, encounter: false, label: def.name });
        break;
      }
      case 'skill_trainer': {
        const skillId = def.kind.skillId;
        if (!hero.skills.some((x) => x.skillId === skillId) && hero.skills.length < catalog.rulesProfile.maxSecondarySkills) out.push({ coord: def.coord, value: 900, encounter: false, label: def.name });
        break;
      }
      case 'quest_hut':
        if (!st.claimed && questHutProgress(catalog, belief, playerId, def.kind.quest).met) out.push({ coord: def.coord, value: 1600, encounter: false, label: def.name });
        break;
      case 'key_tent':
        if (!(belief.players[playerId]?.keys ?? []).includes(def.kind.color)) out.push({ coord: def.coord, value: 1000, encounter: false, label: def.name });
        break;
      case 'windmill':
        if ((st.lastCollectedWeek ?? 0) < worldWeek(belief, catalog.rulesProfile.daysPerWeek)) out.push({ coord: def.coord, value: 300 + goldEquivalent(def.kind.weekly), encounter: false, label: def.name });
        break;
      case 'treasure_chest':
        if (!st.claimed) out.push({ coord: def.coord, value: 700 + def.kind.gold, encounter: false, label: def.name });
        break;
      case 'prison': {
        const mine = Object.values(belief.heroes).filter((h) => h.ownerId === playerId && h.status === 'active').length;
        if (!st.claimed && mine < catalog.rulesProfile.maxHeroesPerPlayer) out.push({ coord: def.coord, value: 3000, encounter: false, label: def.name });
        break;
      }
      default:
        break;
    }
  }
  // Heroes visiting a town stand at its gate.
  const townCoords = new Set(Object.values(belief.towns).map((t) => hexKey(townGate(catalog, belief, t.id))));
  for (const enemy of Object.values(belief.heroes)) {
    if (enemy.ownerId === playerId || enemy.status !== 'active') continue;
    if (townCoords.has(hexKey(enemy.position))) continue; // visiting a town: evaluated as a siege above
    const theirs = heroStrength(catalog, belief, enemy);
    const margin = enemy.monster ? Math.max(persona.guardMargin, HERO_ATTACK_MARGIN) : persona.heroAttackMargin;
    const value = enemy.monster ? 900 + (enemy.monster.bounty.gold ?? 0) + theirs * 0.2 : (3000 + theirs * 0.5) * raid;
    if (myStrength >= theirs * margin) out.push({ coord: enemy.position, value, encounter: true, label: enemy.name, fights: theirs, enemyHeroId: enemy.id });
  }
  return out;
}

/**
 * Field danger: would a visible enemy hero at least as strong as `strength` be
 * able to reach `stop` on its next turn? Uses only what the belief shows (the
 * enemy's visible army decides its movement budget). Heroes inside a town are
 * judged by the town threat logic instead.
 */
function endangered(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, stop: HexCoord, strength: number, ignoreHeroId?: string): boolean {
  // Heroes visiting a town stand at its gate.
  const townCoords = new Set(Object.values(belief.towns).map((t) => hexKey(townGate(catalog, belief, t.id))));
  for (const e of Object.values(belief.heroes)) {
    if (e.ownerId === playerId || e.status !== 'active' || e.id === ignoreHeroId) continue;
    const theirs = heroStrength(catalog, belief, e);
    if (theirs < strength * DANGER_MARGIN) continue;
    if (townCoords.has(hexKey(e.position)) && hexEquals(e.position, stop)) continue;
    const q = quoteMovement(catalog, belief, e.id, stop);
    if (q.reachable && q.totalCost <= movementBudget(catalog, belief, e).total) return true;
  }
  return false;
}

/** A hero below this share of its empire's strongest hero is a secondary (a scout or mine-taker). */
const SECONDARY_SHARE = 0.6;
/** A secondary may stand on the enemy's half of the map only this close to its main army. */
const ESCORT_RADIUS = 3;

/**
 * Fog caution for secondary heroes: enemy main armies are often out of sight, and
 * whoever advances into the middle first is seen first and caught by an army it
 * never saw. A secondary therefore ends its moves on our half of the map (nearer
 * one of our towns than any enemy town) or next to our strongest hero. Uses only
 * public knowledge (town positions); no hidden enemy is read.
 */
function exposedSecondary(belief: MatchState, playerId: PlayerId, hero: HeroState, stop: HexCoord, mine: number, strongest: { hero: HeroState; strength: number } | null): boolean {
  if (!strongest || strongest.hero.id === hero.id || mine >= strongest.strength * SECONDARY_SHARE) return false;
  const towns = Object.values(belief.towns);
  const ours = towns.filter((t) => t.ownerId === playerId);
  const theirs = towns.filter((t) => t.ownerId && t.ownerId !== playerId);
  if (ours.length === 0 || theirs.length === 0) return false;
  const nearOurs = Math.min(...ours.map((t) => axialDistance(t.coord, stop)));
  const nearTheirs = Math.min(...theirs.map((t) => axialDistance(t.coord, stop)));
  if (nearOurs <= nearTheirs) return false;
  return axialDistance(strongest.hero.position, stop) > ESCORT_RADIUS;
}

function strongestHero(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): { hero: HeroState; strength: number } | null {
  let best: { hero: HeroState; strength: number } | null = null;
  for (const h of Object.values(belief.heroes)) {
    if (h.ownerId !== playerId || h.status !== 'active') continue;
    const st = heroStrength(catalog, belief, h);
    if (!best || st > best.strength || (st === best.strength && h.id < best.hero.id)) best = { hero: h, strength: st };
  }
  return best;
}

/** Lanchester square-law estimate of the strength left after beating `enemy`. */
function strengthAfter(mine: number, enemy: number): number {
  return Math.sqrt(Math.max(0, mine * mine - enemy * enemy));
}

/**
 * Portals this empire has used (so it knows where they lead), with their exits not
 * blocked by a visible hero: the entry this hero reaches most cheaply, if any. A
 * hero standing on a portal (just arrived through it) uses it again by stepping
 * off and back on: `stepOff` is that first step (2026-10-05 — heroes that took a
 * portal to a dead-end island used to stay there for the rest of the match).
 */
function nearestKnownPortal(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): { entry: HexCoord; exit: HexCoord; cost: number; stepOff?: HexCoord } | null {
  const mission = requireScenarioMission(catalog, belief);
  let best: { entry: HexCoord; exit: HexCoord; cost: number; stepOff?: HexCoord } | null = null;
  for (const def of mission.sites) {
    if (def.kind.type !== 'portal') continue;
    const exitId = def.kind.exitSiteId;
    const st = belief.world.sites[def.id];
    if (!st || !st.visitedBy.includes(playerId)) continue;
    const exit = mission.sites.find((s) => s.id === exitId);
    if (!exit) continue;
    if (Object.values(belief.heroes).some((h) => h.status === 'active' && h.id !== hero.id && hexEquals(h.position, exit.coord))) continue;
    if (hexEquals(hero.position, def.coord)) {
      // Step onto a free neighbouring tile; the next move steps back on.
      let off: { c: HexCoord; cost: number } | null = null;
      for (const n of axialNeighbors(def.coord)) {
        const q = quoteMovement(catalog, belief, hero.id, n);
        if (!q.reachable || q.endsInEncounter || q.path.length !== 1) continue;
        if (!off || q.totalCost < off.cost || (q.totalCost === off.cost && hexKey(n) < hexKey(off.c))) off = { c: n, cost: q.totalCost };
      }
      if (off && (!best || off.cost * 2 < best.cost)) best = { entry: def.coord, exit: exit.coord, cost: off.cost * 2, stepOff: off.c };
      continue;
    }
    const q = quoteMovement(catalog, belief, hero.id, def.coord);
    if (!q.reachable || q.endsInEncounter) continue;
    if (!best || q.totalCost < best.cost) best = { entry: def.coord, exit: exit.coord, cost: q.totalCost };
  }
  return best;
}

/**
 * Much weaker neutrals (scenario feature): accept those that offer to join and let
 * the others flee — no losses either way; the guard's reward is kept.
 */
function encounterChoiceFor(catalog: ContentCatalog, belief: MatchState, hero: HeroState, dest: HexCoord, arrivesInEncounter: boolean): { encounterChoice?: 'join' | 'release' } {
  if (!arrivesInEncounter) return {};
  const r = quoteNeutralReaction(catalog, belief, hero.id, dest);
  return r.kind === 'join' ? { encounterChoice: 'join' } : r.kind === 'flee' ? { encounterChoice: 'release' } : {};
}

function movementCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload[] {
  if (hero.movementPoints <= 0) return [];
  const scored: { score: number; key: string; payload: CommandPayload }[] = [];
  const mine = heroStrength(catalog, belief, hero);
  const strongest = strongestHero(catalog, belief, playerId);
  // A known portal: targets far from here but near its exit are reached through it.
  const portal = nearestKnownPortal(catalog, belief, playerId, hero);
  const fromExit = portal ? { ...belief, heroes: { ...belief.heroes, [hero.id]: { ...hero, position: portal.exit } } } : null;
  for (const t of heroTargets(catalog, belief, playerId, hero)) {
    const q = quoteMovement(catalog, belief, hero.id, t.coord);
    // Through the portal when the target is far — or cannot be reached on foot at all (an island).
    if (portal && fromExit && (!q.reachable || q.totalCost > hero.movementPoints)) {
      const after = quoteMovement(catalog, fromExit, hero.id, t.coord);
      const via = portal.cost + after.totalCost;
      if (after.reachable && (!q.reachable || via < q.totalCost * 0.75)) {
        const days = Math.max(1, Math.ceil(via / Math.max(1, hero.movementPoints)));
        scored.push({ score: (t.value / (1 + via / 800) / days) * 0.95, key: `portal:${hexKey(t.coord)}`, payload: { kind: 'MoveHero', heroId: hero.id, destination: portal.stepOff ?? portal.entry } });
        continue;
      }
    }
    if (!q.reachable || q.stopIndex < 0) continue;
    // Do not end the day (or a fight) where a visible, stronger enemy can strike next.
    if (!t.town) {
      const arrives = q.stopIndex === q.path.length - 1;
      const after = arrives && t.fights ? strengthAfter(mine, t.fights) : mine;
      const stop = q.path[q.stopIndex]!;
      if (endangered(catalog, belief, playerId, stop, after, t.enemyHeroId)) continue;
      if (exposedSecondary(belief, playerId, hero, stop, after, strongest)) continue;
    }
    const days = Math.max(1, Math.ceil(q.totalCost / Math.max(1, hero.movementPoints)));
    const score = t.value / (1 + q.totalCost / 800) / days;
    scored.push({ score, key: hexKey(t.coord), payload: { kind: 'MoveHero', heroId: hero.id, destination: t.coord, confirmEncounter: q.endsInEncounter, ...encounterChoiceFor(catalog, belief, hero, t.coord, q.endsInEncounter && q.stopIndex === q.path.length - 1) } });
  }
  // Return to a town to reinforce when it has recruits waiting (not by stopping short
  // within reach of a stronger visible enemy). Every owned town counts, worth more the
  // bigger its garrison: heroes used to walk only to the first town while a captured
  // town's garrison grew untouched for the rest of the match.
  // A trickle of daily recruits is not worth the walk (heroes used to shuttle between
  // the town gate and the field every day); recruits the treasury cannot pay for are
  // not waiting at all.
  const gold = belief.players[playerId]?.wallet.gold ?? 0;
  const plan = weekPlan(catalog, belief, playerId);
  const reserve = buildReserve(plan, 1500);
  const earlyGrowthWeek = plan.growthBonus > 0 && dayOfWeek(belief.day, catalog.rulesProfile.daysPerWeek) <= 3;
  const guardShare = homeGuardShare(catalog, belief, playerId);
  for (const home of playerTowns(belief, playerId)) {
    if (heroInTown(catalog, belief, hero, home.id)) continue;
    // Only what the hero may take counts: the home guard stays (homeGuardTransfers).
    const plainGarrison = plainOf(catalog, home.garrison.slots);
    const takeable = plainGarrison > 0 ? Math.max(0, plainGarrison - homeGuardTarget(catalog, guardShare, hero.army.slots, home.garrison.slots)) / plainGarrison : 0;
    const garrison = takeable * fightingStrength(catalog, home.garrison.slots.map((s) => (s && s.count > 0 ? { creatureId: s.creatureId, count: s.count } : null)));
    const recruits = gold >= reserve && Object.values(home.population).some((n) => n > 0);
    if (garrison < Math.max(150, mine * 0.2) && !recruits) continue;
    const q = quoteMovement(catalog, belief, hero.id, home.coord);
    if (!q.reachable || q.stopIndex < 0) continue;
    const arrives = q.stopIndex === q.path.length - 1;
    if (arrives || !endangered(catalog, belief, playerId, q.path[q.stopIndex]!, mine)) {
      let value = 400 + Math.min(4000, garrison * (mine > 0 ? Math.min(2, garrison / mine) : 1));
      // A week of extra growth: the dwellings are full early in the week, worth the walk.
      if (recruits && earlyGrowthWeek) value *= 1.5;
      const days = Math.max(1, Math.ceil(q.totalCost / Math.max(1, hero.movementPoints)));
      scored.push({ score: value / (1 + q.totalCost / 800) / days, key: `home:${hexKey(home.coord)}`, payload: { kind: 'MoveHero', heroId: hero.id, destination: home.coord } });
    }
  }
  // Standing within reach of a stronger visible enemy (often one that came into view
  // during this very move): step back out of its reach while movement remains.
  scored.push(...retreatCandidates(catalog, belief, playerId, hero, mine));
  // Explore: step to a reachable tile that borders the unknown (vision reveals more map).
  for (const e of explorationTargets(catalog, belief, playerId, hero)) {
    const dest = e.payload.kind === 'MoveHero' ? e.payload.destination : null;
    if (dest && endangered(catalog, belief, playerId, dest, mine)) continue;
    if (dest && exposedSecondary(belief, playerId, hero, dest, mine, strongest)) continue;
    scored.push(e);
  }
  scored.sort(byScoreThenTie(playerId));
  return scored.map((s) => s.payload);
}

/** How many retreat tiles are checked exactly (each check quotes every dangerous enemy's path). */
const RETREAT_CHECKS = 8;

function retreatCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState, mine: number): { score: number; key: string; payload: CommandPayload }[] {
  const towns = playerTowns(belief, playerId);
  if (towns.some((t) => heroInTown(catalog, belief, hero, t.id))) return [];
  if (!endangered(catalog, belief, playerId, hero.position, mine)) return [];
  const threats = Object.values(belief.heroes).filter((e) => e.ownerId !== playerId && e.status === 'active' && heroStrength(catalog, belief, e) >= mine * DANGER_MARGIN);
  const out: { score: number; key: string; payload: CommandPayload }[] = [];
  // Into one of our towns (walls; judged by the town threat logic) when it can be reached today.
  for (const t of towns) {
    const q = quoteMovement(catalog, belief, hero.id, t.coord);
    if (q.reachable && q.stopIndex === q.path.length - 1) out.push({ score: 5000 / (1 + q.totalCost / 800), key: `retreat-town:${hexKey(t.coord)}`, payload: { kind: 'MoveHero', heroId: hero.id, destination: t.coord } });
  }
  // Otherwise the reachable tiles farthest from the threats that are verified out of their reach.
  const tiles = [...reachableTiles(catalog, belief, hero.id).keys()]
    .map((k) => {
      const c = parseHexKey(k);
      return { c, k, far: Math.min(...threats.map((e) => axialDistance(e.position, c))) };
    })
    .sort((a, b) => b.far - a.far || tieHash(playerId, a.k) - tieHash(playerId, b.k) || (a.k < b.k ? -1 : 1))
    .slice(0, RETREAT_CHECKS);
  for (const t of tiles) {
    if (endangered(catalog, belief, playerId, t.c, mine)) continue;
    out.push({ score: 1500 + t.far, key: `retreat:${t.k}`, payload: { kind: 'MoveHero', heroId: hero.id, destination: t.c } });
    break;
  }
  return out;
}

function explorationTargets(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): { score: number; key: string; payload: CommandPayload }[] {
  const fog = belief.fog[playerId];
  if (!fog) return [];
  const map = belief.world.map;
  const unknownAround = (c: HexCoord) => {
    let n = 0;
    for (const x of cellsWithin(map, c, 3)) if (fog.explored[cellIndex(map, x)] !== 1) n++;
    return n;
  };
  const out: { score: number; key: string; payload: CommandPayload }[] = [];
  for (const [k, cost] of reachableTiles(catalog, belief, hero.id)) {
    const c = parseHexKey(k);
    const unknown = unknownAround(c);
    if (unknown < 3) continue;
    out.push({ score: (120 + unknown * 25) / (1 + cost / 800), key: `explore:${k}`, payload: { kind: 'MoveHero', heroId: hero.id, destination: c } });
  }
  out.sort(byScoreThenTie(playerId));
  return out.slice(0, 3);
}

function patrolCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload[] {
  const ai = hero.ai!;
  const out: CommandPayload[] = [];
  const mine = heroStrength(catalog, belief, hero);
  // Attack a visible enemy inside the region above the documented threshold.
  for (const enemy of Object.values(belief.heroes).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (enemy.ownerId === playerId || enemy.status !== 'active' || !withinRegion(hero, enemy.position)) continue;
    const theirs = heroStrength(catalog, belief, enemy);
    if (mine * ai.attackThreshold.denominator >= theirs * ai.attackThreshold.numerator) {
      const q = quoteMovement(catalog, belief, hero.id, enemy.position);
      if (q.reachable && q.path.every((c) => withinRegion(hero, c))) {
        out.push({ kind: 'MoveHero', heroId: hero.id, destination: enemy.position, confirmEncounter: true });
      }
    }
  }
  // Otherwise advance along the waypoint circuit (stateless: next after the one we stand on).
  const wps = ai.waypoints;
  if (wps.length > 0) {
    const at = wps.findIndex((w) => hexEquals(w, hero.position));
    let targetIdx: number;
    if (at >= 0) targetIdx = (at + 1) % wps.length;
    else {
      let bestI = 0;
      let bestD = Number.POSITIVE_INFINITY;
      wps.forEach((w, i) => {
        const d = axialDistance(w, hero.position);
        if (d < bestD) {
          bestD = d;
          bestI = i;
        }
      });
      targetIdx = bestI;
    }
    for (let k = 0; k < wps.length; k++) {
      const wp = wps[(targetIdx + k) % wps.length]!;
      if (hexEquals(wp, hero.position)) continue;
      const q = quoteMovement(catalog, belief, hero.id, wp);
      if (q.reachable && q.stopIndex >= 0 && !q.endsInEncounter && q.path.slice(0, q.stopIndex + 1).every((c) => withinRegion(hero, c))) {
        out.push({ kind: 'MoveHero', heroId: hero.id, destination: wp });
        break;
      }
    }
  }
  return out;
}

/**
 * Adventure spells before the hero's moves: Recall to a threatened town, a look at
 * an unseen rival town (scouting) and a movement spell when the chosen move falls
 * just short today (see growth.ts).
 */
function adventureSpellCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState, planned: CommandPayload | undefined, threatened: ReadonlySet<string>): CommandPayload[] {
  if (!hero.spellbook || hero.mana <= 0) return [];
  const out: CommandPayload[] = [];
  const recall = recallSpellCandidate(catalog, belief, playerId, hero, threatened, (coord) => {
    const q = quoteMovement(catalog, belief, hero.id, coord);
    return q.reachable && q.stopIndex === q.path.length - 1;
  });
  if (recall) return [recall];
  const scout = scoutingSpellCandidate(catalog, belief, playerId, hero);
  if (scout) out.push(scout);
  if (planned && planned.kind === 'MoveHero') {
    const q = quoteMovement(catalog, belief, hero.id, planned.destination);
    const move = movementSpellCandidate(catalog, belief, playerId, hero, q.reachable ? { destination: planned.destination, totalCost: q.totalCost, reachesToday: q.reachesDestinationToday } : null);
    if (move) out.push(move);
  }
  return out;
}

export function strategicCandidates(catalog: ContentCatalog, obs: AIObservation): CommandPayload[] {
  const belief = obs.belief;
  const playerId = obs.playerId;
  const out: CommandPayload[] = [];
  const player = belief.players[playerId];
  if (!player) return [{ kind: 'EndTurn' }];

  out.push(...levelUpCandidates(catalog, belief, playerId));
  if (out.length > 0) return out;

  const myHeroes = Object.values(belief.heroes)
    .filter((h) => h.ownerId === playerId && h.status === 'active')
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const strategic = myHeroes.filter((h) => h.ai?.profile !== 'patrol');

  // Defend home: a visible enemy hero close to a town keeps recruits in its garrison
  // and keeps the visiting hero inside the walls — unless the visitor can beat
  // every such enemy in the field (then it goes out and hunts them instead; holding
  // against weak raiders used to freeze the hero at home and block its Tavern).
  const enemies = Object.values(belief.heroes).filter((h) => h.ownerId !== playerId && h.status === 'active');
  const threatened = new Set(
    playerTowns(belief, playerId)
      .filter((t) => {
        const near = enemies.filter((e) => axialDistance(e.position, t.coord) <= THREAT_RADIUS);
        if (near.length === 0) return false;
        const visitor = strategic.find((h) => heroInTown(catalog, belief, h, t.id));
        if (!visitor) return true;
        // Judge the sally with the garrison folded into the visitor (it is moved into the
        // hero below when the town is not held). Two empires used to freeze for the rest
        // of a random map: each hero camped beside the other's town, each defender stayed
        // inside, and the garrisons grew while neither side attacked.
        const garrison: StackSpec[] = t.garrison.slots.filter((x): x is NonNullable<typeof x> => !!x && x.count > 0).map((x) => ({ creatureId: x.creatureId, count: x.count }));
        const eff = effectiveAttributes(catalog, belief, visitor);
        const own: StackSpec[] = visitor.army.slots.filter((x): x is NonNullable<typeof x> => !!x).map((x) => ({ creatureId: x.creatureId, count: x.count }));
        const mine = fightingStrength(catalog, [...own, ...garrison], { attack: eff.attack.total, defense: eff.defense.total });
        return near.some((e) => heroStrength(catalog, belief, e) * aiPersonalityFor(catalog, belief, playerId).heroAttackMargin > mine);
      })
      .map((t) => t.id),
  );
  const holding = new Set<string>();

  // With no hero left, save for a new one instead of spending every coin on the
  // garrison (heroless empires used to sit at ~1,000 Gold for the rest of the match).
  const hireCost = catalog.rulesProfile.heroHireCost;
  const canHireSomewhere = playerTowns(belief, playerId).some((t) => (obs.hireRoster[t.id] ?? []).length > 0);
  const saving = belief.scenario.heroHiringEnabled && strategic.length === 0 && canHireSomewhere && player.wallet.gold < hireCost;

  const temperament = aiTemperamentFor(catalog, belief, playerId);
  if (player.role !== 'scripted_hostile') {
    // Divine commitments and equipment first: they only ever help.
    out.push(...godCandidates(catalog, belief, playerId));
    out.push(...equipCandidates(catalog, strategic));
    out.push(...offeringCandidates(catalog, belief, playerId, threatened));
    out.push(...trainingCandidates(catalog, belief, playerId, strategic));
    out.push(...merchantCandidates(catalog, belief, playerId, strategic));
    out.push(...mapEventCandidates(catalog, belief, playerId, strategic));
    out.push(...siteCandidates(catalog, belief, playerId, strategic));
    out.push(...campCandidates(catalog, belief, playerId, strategic));
    out.push(...interventionCandidates(catalog, belief, playerId, strategic));
    out.push(...giftCandidates(catalog, belief, playerId, threatened));
    const plan = weekPlan(catalog, belief, playerId);
    // One hero hire a week for every empire (owner request 2026-10-07): propose it at one town only.
    let hireProposed = false;
    for (const town of playerTowns(belief, playerId)) {
      const underThreat = threatened.has(town.id);
      // Build: best-scoring legal next level of any location, keeping a Gold reserve.
      if (town.buildUsedDay !== belief.day && !saving) {
        const options = townSlots(catalog, town)
          .map((slot) => slot.chain[town.buildings[slot.id] ?? 0])
          .filter((x): x is string => !!x)
          .map((b) => ({ b, score: buildScore(catalog, b, myHeroes.length, temperament) }))
          .sort((x, y) => y.score - x.score || (x.b < y.b ? -1 : 1));
        for (const { b } of options) {
          const q = quoteConstruction(catalog, belief, playerId, town.id, b);
          if (q.legal && q.balanceAfter.gold >= buildReserve(plan, 1500)) {
            out.push({ kind: 'BuildStructure', townId: town.id, buildingId: b });
            break;
          }
        }
      }
      // Hire: returning heroes first, then new candidates, while keeping a reserve.
      if (!hireProposed && myHeroes.length < aiPersonalityFor(catalog, belief, playerId).targetHeroes && player.wallet.gold >= hireCost + (strategic.length === 0 ? 0 : hireReserve(plan, HIRE_RESERVE_GOLD))) {
        // Returning heroes first (they keep their levels), then new recruits by specialty value.
        const roster = [...(obs.hireRoster[town.id] ?? [])].sort(
          (a, b) =>
            Number(!!b.returningHeroId) - Number(!!a.returningHeroId) ||
            hireValue(catalog, b.definitionId, player.pantheonId, temperament) - hireValue(catalog, a.definitionId, player.pantheonId, temperament) ||
            (a.definitionId < b.definitionId ? -1 : 1),
        );
        for (const option of roster) {
          if (quoteHireHero(catalog, belief, playerId, town.id, option.definitionId).legal) {
            out.push({ kind: 'HireHero', townId: town.id, heroDefinitionId: option.definitionId });
            hireProposed = true;
            break;
          }
        }
      }
      // Recruit (highest tier first) to a visiting hero, else the garrison.
      const visitor = strategic.find((h) => heroInTown(catalog, belief, h, town.id));
      if (visitor && underThreat) holding.add(visitor.id);
      const forms = recruitableCreatureIds(catalog, town)
        .map((id) => catalog.creatures[id]!)
        .sort((a, b) => b.tier - a.tier || (a.form === 'upgraded' ? -1 : 1));
      for (const c of saving && !underThreat ? [] : forms) {
        const dest = visitor && !underThreat ? { kind: 'hero' as const, heroId: visitor.id } : { kind: 'garrison' as const };
        const probe = quoteRecruitment(catalog, belief, playerId, town.id, c.id, 1, dest);
        const qty = probe.maxQuantity;
        if (qty > 0) {
          const q = quoteRecruitment(catalog, belief, playerId, town.id, c.id, qty, dest);
          if (q.legal) out.push({ kind: 'RecruitUnits', townId: town.id, creatureId: c.id, quantity: qty, destination: dest });
        }
      }
      // Reinforce: move garrison stacks into a visiting hero (not while the town is threatened),
      // keeping the home guard in the garrison (from week 2).
      if (visitor && !underThreat) {
        const seen = enemies.filter((e) => axialDistance(e.position, town.coord) <= GUARD_THREAT_RADIUS).map((e) => heroStrength(catalog, belief, e));
        const nearThreat = Math.max(0, ...seen, belief.day >= HOME_GUARD_FROM_DAY ? raiderPrior(catalog, belief, playerId) : 0);
        out.push(...homeGuardTransfers(catalog, town, visitor, homeGuardShare(catalog, belief, playerId), nearThreat));
      }
    }
  }

  // Late game (2026-10-07): secondary heroes carry their armies to the main hero.
  const couriers = new Map<string, HeroState>();
  if (player.role !== 'scripted_hostile' && handOffsActive(catalog, belief, strategic)) {
    const main = mainHero(catalog, belief, strategic);
    if (main) {
      for (const h of strategic) {
        if (holding.has(h.id) || !isCourier(catalog, belief, h, main)) continue;
        const give = handOffTransfer(catalog, belief, playerId, h, main.hero);
        if (give) out.push(give);
        else couriers.set(h.id, main.hero);
      }
    }
  }

  for (const hero of myHeroes) {
    if (holding.has(hero.id)) continue;
    if (hero.ai?.profile === 'patrol') {
      out.push(...patrolCandidates(catalog, belief, playerId, hero));
      continue;
    }
    const main = couriers.get(hero.id);
    if (main) {
      const mine = heroStrength(catalog, belief, hero);
      const walk = courierMove(catalog, belief, hero, main, (stop) => !endangered(catalog, belief, playerId, stop, mine));
      if (walk) out.push(walk);
    }
    const moves = movementCandidates(catalog, belief, playerId, hero);
    if (player.role !== 'scripted_hostile') out.push(...adventureSpellCandidates(catalog, belief, playerId, hero, moves[0], threatened));
    out.push(...moves);
  }
  out.push({ kind: 'EndTurn' });
  return out;
}
