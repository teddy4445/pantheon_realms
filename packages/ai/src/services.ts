/**
 * Strategic AI for divine commitments and town services (proposed this build).
 *
 * All decisions go through the same read-only quotes the screens use; the
 * controller submits the resulting commands through the CommandProcessor and
 * falls through on rejection. Scores are documented heuristics, not proven
 * values.
 */
import {
  divineGifts,
  giftNeedsHero,
  quoteDivineGift,
  goldEquivalent,
  interventionsFor,
  interventionUsedThisWeek,
  quoteCampRecruitment,
  quoteIntervention,
  quoteMapEvent,
  quoteOpenChest,
  quoteCompleteQuestHut,
  scenarioMission,
  type MapEventOptionDefinition,
  hexEquals,
  offeringRule,
  playerTowns,
  axialDistance,
  quoteGodSelection,
  quoteOffering,
  quoteTraining,
  type CommandPayload,
  type ContentCatalog,
  type EffectDefinition,
  type HeroState,
  type MatchState,
  type OfferingLine,
  type PlayerId, heroInTown,
} from '@pr/rules';
import { aiTemperamentFor, faithFavorGoal } from './temperament';
import { lateInWeek } from './handoff';

/** Rough value of a blessing for an AI empire (higher is better). */
export function effectScore(e: EffectDefinition): number {
  switch (e.type) {
    case 'commander_attribute':
      return e.attribute === 'attack' || e.attribute === 'defense' ? 10 * e.amount : 4 * e.amount;
    case 'morale':
    case 'luck':
      return 8 * e.amount;
    case 'movement_percent':
      return 0.6 * e.percent;
    case 'daily_income':
      return e.resource === 'gold' ? e.amount / 25 : 10 * e.amount;
    case 'weekly_growth_bonus':
      return 4 * e.amount * e.maxTier;
    case 'casualty_recovery':
      return 1.5 * e.percent;
    case 'creature_stat':
      return (e.stat === 'speed' ? 8 : 6) * e.amount * (e.ability || e.maxTier !== undefined || e.minTier !== undefined ? 0.6 : 1);
    case 'vision_radius':
      return 2 * e.amount;
    case 'offering':
      return 5;
    case 'spell_eligibility':
      return 2;
    case 'mana_regen':
      return 2 * e.amount;
    case 'wounded_fury':
      return 6 * e.attack;
    default:
      return 1;
  }
}

/** Commit to the best legal god (any group), highest blessing score first. */
export function godCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): CommandPayload[] {
  const player = belief.players[playerId];
  if (!player) return [];
  const gods = (catalog.pantheons[player.pantheonId]?.godIds ?? [])
    .filter((g) => quoteGodSelection(catalog, belief, playerId, g).legal)
    .map((g) => ({ g, score: catalog.gods[g]!.benefits.reduce((n, e) => n + effectScore(e), 0) }))
    .sort((a, b) => b.score - a.score || (a.g < b.g ? -1 : 1));
  return gods.slice(0, 1).map(({ g }) => ({ kind: 'SelectGod', godId: g }));
}

/** Favor still needed for the dearest uncommitted designed god group (0 when none is left). */
function favorNeeded(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): number {
  const player = belief.players[playerId]!;
  const committedGroups = new Set(player.pantheon.minorGodIds.map((g) => catalog.gods[g]?.exclusivityGroup));
  let need = 0;
  for (const g of catalog.pantheons[player.pantheonId]?.godIds ?? []) {
    const def = catalog.gods[g]!;
    if (def.role !== 'minor' || !def.exclusivityGroup || committedGroups.has(def.exclusivityGroup)) continue;
    const q = quoteGodSelection(catalog, belief, playerId, g);
    if (q.state === 'excluded' || q.state === 'undesigned') continue;
    need = Math.max(need, def.favorCost - player.wallet.favor);
  }
  return Math.max(0, need);
}

/** A devout temperament (faith above 1) keeps a Favor goal for miracles and gifts once its gods are chosen. */
function faithNeeded(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): number {
  const player = belief.players[playerId]!;
  return Math.max(0, faithFavorGoal(aiTemperamentFor(catalog, belief, playerId)) - player.wallet.favor);
}

/**
 * Temple offering when Favor is still needed: the lowest-tier garrison stacks
 * first, then the visiting hero's lowest-tier stack (never its last creature),
 * only as many creatures as the weekly cap can use.
 */
export function offeringCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, threatened: ReadonlySet<string>): CommandPayload[] {
  const rule = offeringRule(catalog, belief, playerId);
  if (!rule) return [];
  const forGods = favorNeeded(catalog, belief, playerId);
  // Beyond its gods a devout empire offers only from town garrisons, never from a hero's army.
  const need = Math.max(forGods, faithNeeded(catalog, belief, playerId));
  if (need <= 0) return [];
  const out: CommandPayload[] = [];
  for (const town of playerTowns(belief, playerId)) {
    if (threatened.has(town.id)) continue;
    const favorGoal = Math.min(rule.maxFavorPerWeek, need);
    let goldGoal = favorGoal * rule.goldPerFavor;
    const pool: { line: Omit<OfferingLine, 'quantity'>; count: number; unit: number; tier: number; keep: number }[] = [];
    town.garrison.slots.forEach((s, slot) => {
      if (!s) return;
      const c = catalog.creatures[s.creatureId]!;
      if (c.tier <= 3) pool.push({ line: { army: { kind: 'garrison', townId: town.id }, slot }, count: s.count, unit: c.cost?.gold ?? 0, tier: c.tier, keep: 0 });
    });
    const visitor = Object.values(belief.heroes).find((h) => h.ownerId === playerId && h.status === 'active' && heroInTown(catalog, belief, h, town.id));
    if (visitor && forGods > 0) {
      visitor.army.slots.forEach((s, slot) => {
        if (!s) return;
        const c = catalog.creatures[s.creatureId]!;
        if (c.tier <= 2) pool.push({ line: { army: { kind: 'hero', heroId: visitor.id }, slot }, count: s.count, unit: c.cost?.gold ?? 0, tier: c.tier, keep: 1 });
      });
    }
    pool.sort((a, b) => a.tier - b.tier || a.unit - b.unit || (a.line.army.kind === 'garrison' ? -1 : 1));
    const lines: OfferingLine[] = [];
    for (const p of pool) {
      if (goldGoal <= 0 || p.unit <= 0) break;
      const avail = p.count - p.keep;
      if (avail <= 0) continue;
      const qty = Math.min(avail, Math.ceil(goldGoal / p.unit));
      lines.push({ ...p.line, quantity: qty });
      goldGoal -= qty * p.unit;
    }
    if (lines.length === 0) continue;
    const q = quoteOffering(catalog, belief, playerId, town.id, lines);
    // Only worth it when it yields at least half of the goal.
    if (q.legal && q.favor * 2 >= favorGoal) out.push({ kind: 'MakeOffering', townId: town.id, offerings: lines });
  }
  return out;
}

const TRAINING_RESERVE_GOLD = 2500;

/** Train visiting heroes at a Training Academy while keeping a Gold reserve. */
export function trainingCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, heroes: readonly HeroState[]): CommandPayload[] {
  const out: CommandPayload[] = [];
  const wallet = belief.players[playerId]!.wallet;
  for (const town of playerTowns(belief, playerId)) {
    for (const h of heroes) {
      if (!heroInTown(catalog, belief, h, town.id)) continue;
      const q = quoteTraining(catalog, belief, playerId, town.id, h.id);
      if (q.legal && wallet.gold - q.cost.gold >= TRAINING_RESERVE_GOLD) out.push({ kind: 'TrainHero', townId: town.id, heroId: h.id });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// World map and divine interventions (proposed this build)
// ---------------------------------------------------------------------------

const CAMP_RESERVE_GOLD = 1500;

/** A hero standing on a creature camp recruits as many as it can afford above a reserve. */
export function campCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, heroes: readonly HeroState[]): CommandPayload[] {
  const out: CommandPayload[] = [];
  const mission = scenarioMission(catalog, belief);
  const wallet = belief.players[playerId]?.wallet;
  if (!mission || !wallet) return out;
  for (const h of heroes) {
    const def = mission.sites.find((s) => s.kind.type === 'creature_camp' && hexEquals(s.coord, h.position));
    if (!def) continue;
    const probe = quoteCampRecruitment(catalog, belief, playerId, h.id, def.id, 1);
    const unit = probe.unitCost.gold;
    const affordable = unit > 0 ? Math.floor((wallet.gold - CAMP_RESERVE_GOLD) / unit) : 0;
    const qty = Math.min(probe.maxQuantity, affordable);
    if (qty > 0 && quoteCampRecruitment(catalog, belief, playerId, h.id, def.id, qty).legal) out.push({ kind: 'RecruitFromCamp', heroId: h.id, siteId: def.id, quantity: qty });
  }
  return out;
}

/** Rough Gold-equivalent value of a map-event option for the AI. */
export function eventOptionValue(catalog: ContentCatalog, o: MapEventOptionDefinition): number {
  const r = o.reward;
  let v = goldEquivalent(r.resources ?? {}) + (r.questXp ?? 0) * 1.2 + (r.mana ?? 0) * 15 + (r.movement ?? 0) * 0.8;
  for (const amount of Object.values(r.attributes ?? {})) v += (amount ?? 0) * 900;
  for (const a of r.artifactIds ?? []) v += catalog.artifacts[a]?.merchantPrice?.gold ?? 1500;
  for (const c of r.creatures ?? []) v += c.count * (catalog.creatures[c.creatureId]?.cost?.gold ?? 0) * 1.1;
  return v - goldEquivalent(o.cost ?? {});
}

/** A hero standing on an unresolved map event takes the best legal option. */
export function mapEventCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, heroes: readonly HeroState[]): CommandPayload[] {
  const out: CommandPayload[] = [];
  const mission = scenarioMission(catalog, belief);
  if (!mission) return out;
  for (const h of heroes) {
    const def = mission.sites.find((s) => s.kind.type === 'map_event' && hexEquals(s.coord, h.position));
    if (!def || def.kind.type !== 'map_event' || belief.world.sites[def.id]?.claimed) continue;
    const ranked = def.kind.options
      .map((o, i) => ({ i, v: eventOptionValue(catalog, o), legal: quoteMapEvent(catalog, belief, playerId, h.id, def.id, i).legal }))
      .filter((x) => x.legal)
      .sort((a, b) => b.v - a.v || a.i - b.i);
    if (ranked[0]) out.push({ kind: 'ResolveMapEvent', heroId: h.id, siteId: def.id, optionIndex: ranked[0].i });
  }
  return out;
}

/**
 * A hero standing on a treasure chest opens it (experience while the hero is
 * young, Gold later); one standing on a quest hut whose quest it has fulfilled
 * turns it in (sites added 2026-10-02).
 */
export function siteCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, heroes: readonly HeroState[]): CommandPayload[] {
  const out: CommandPayload[] = [];
  const mission = scenarioMission(catalog, belief);
  if (!mission) return out;
  for (const h of heroes) {
    const def = mission.sites.find((s) => hexEquals(s.coord, h.position));
    if (!def || belief.world.sites[def.id]?.claimed) continue;
    if (def.kind.type === 'treasure_chest' && quoteOpenChest(catalog, belief, playerId, h.id, def.id).legal) {
      out.push({ kind: 'OpenChest', heroId: h.id, siteId: def.id, choice: h.level <= 5 && def.kind.xp * 2 >= def.kind.gold ? 'xp' : 'gold' });
    } else if (def.kind.type === 'quest_hut' && quoteCompleteQuestHut(catalog, belief, playerId, h.id, def.id).legal) {
      // A delivery is worth it only with a comfortable treasury left (resources still buy armies).
      const deliver = def.kind.quest.type === 'deliver' ? goldEquivalent(def.kind.quest.resources) : 0;
      if (deliver === 0 || (belief.players[playerId]?.wallet.gold ?? 0) >= 4000) out.push({ kind: 'CompleteQuestHut', heroId: h.id, siteId: def.id });
    }
  }
  return out;
}

/** Favor kept for god choices while the player could still commit to one. */
const FAVOR_RESERVE_FOR_GODS = 25;

function favorSpare(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): number {
  const player = belief.players[playerId]!;
  const committedAll = player.pantheon.minorGodIds.length >= 2;
  return player.wallet.favor - (committedAll ? 0 : FAVOR_RESERVE_FOR_GODS);
}

/** How near (hexes, about two days' march) an enemy army or town must be for the week's miracle to be kept for battle. */
const DECISIVE_RADIUS = 16;

/**
 * A battle that matters may come this week (2026-10-07): an enemy empire's hero
 * or town within about two days of one of our heroes, or an enemy hero that
 * near one of our towns. Uses the belief only (visible heroes, known towns).
 */
export function decisiveBattleNear(belief: MatchState, playerId: PlayerId, heroes: readonly HeroState[]): boolean {
  const enemyHeroes = Object.values(belief.heroes).filter((h) => h.status === 'active' && !h.monster && h.ownerId !== playerId && belief.players[h.ownerId]?.role !== 'scripted_hostile');
  const enemyTowns = Object.values(belief.towns).filter((t) => t.ownerId && t.ownerId !== playerId);
  const ours = playerTowns(belief, playerId);
  for (const h of heroes) {
    if (enemyHeroes.some((e) => axialDistance(e.position, h.position) <= DECISIVE_RADIUS)) return true;
    if (enemyTowns.some((t) => axialDistance(t.coord, h.position) <= DECISIVE_RADIUS)) return true;
  }
  return ours.some((t) => enemyHeroes.some((e) => axialDistance(e.position, t.coord) <= DECISIVE_RADIUS));
}

/**
 * Adventure interventions (at most one a week): extra recruits, then resources,
 * then movement. The gods answer once a week, battle or map alike, so while a
 * battle that matters may come the miracle is kept for it (2026-10-07) — until
 * the last two days of the week, when an unused miracle is spent here.
 */
export function interventionCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, heroes: readonly HeroState[]): CommandPayload[] {
  if (interventionUsedThisWeek(catalog, belief, playerId)) return [];
  const hasBattleMiracle = interventionsFor(catalog, belief, playerId).some((d) => d.context === 'battle');
  if (hasBattleMiracle && !lateInWeek(catalog, belief) && decisiveBattleNear(belief, playerId, heroes)) return [];
  const spare = favorSpare(catalog, belief, playerId);
  const options = interventionsFor(catalog, belief, playerId).filter((d) => d.context === 'adventure' && d.favorCost <= spare);
  const scored: { score: number; payload: CommandPayload }[] = [];
  for (const d of options) {
    const e = d.effect;
    if (e.type === 'town_growth') {
      for (const town of playerTowns(belief, playerId)) {
        const families = Object.keys(town.population).filter((f) => (catalog.families[f]?.tier ?? 99) <= e.maxTier).length;
        if (families === 0) continue;
        if (quoteIntervention(catalog, belief, playerId, d.id, { townId: town.id }).legal) scored.push({ score: families * e.amount * 120, payload: { kind: 'InvokeIntervention', interventionId: d.id, townId: town.id } });
      }
    } else if (e.type === 'grant_resources') {
      if (quoteIntervention(catalog, belief, playerId, d.id).legal) scored.push({ score: goldEquivalent(e.resources) / 2, payload: { kind: 'InvokeIntervention', interventionId: d.id } });
    } else if (e.type === 'restore_movement' && heroes.length >= 2) {
      if (quoteIntervention(catalog, belief, playerId, d.id).legal) scored.push({ score: heroes.length * e.percent * 4, payload: { kind: 'InvokeIntervention', interventionId: d.id } });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 1).map((s) => s.payload);
}

/** Favor kept back for the week's intervention while it is still unused. */
const INTERVENTION_RESERVE = 10;

/**
 * Divine gifts (proposed 2026-10-03): with Favor to spare (both gods chosen, or
 * above the reserve for them, and the week's miracle paid or reserved), each
 * town with a Temple takes its best gift by value per Favor: recruits are worth
 * their price, experience and artifacts only with a hero in the town.
 */
export function giftCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, threatened: ReadonlySet<string>): CommandPayload[] {
  let spare = favorSpare(catalog, belief, playerId) - (interventionsFor(catalog, belief, playerId).length && !interventionUsedThisWeek(catalog, belief, playerId) ? INTERVENTION_RESERVE : 0);
  const gifts = divineGifts(catalog, belief);
  if (gifts.length === 0 || spare <= 0) return [];
  const wallet = belief.players[playerId]!.wallet;
  const out: CommandPayload[] = [];
  for (const town of playerTowns(belief, playerId)) {
    if (threatened.has(town.id)) continue;
    const visitor = Object.values(belief.heroes).find((h) => h.ownerId === playerId && h.status === 'active' && heroInTown(catalog, belief, h, town.id));
    let best: { score: number; payload: CommandPayload; cost: number } | null = null;
    for (const g of gifts) {
      if (g.favorCost > spare) continue;
      const needsHero = giftNeedsHero(g);
      if (needsHero && !visitor) continue;
      const q = quoteDivineGift(catalog, belief, playerId, town.id, g.id, needsHero ? visitor!.id : null);
      if (!q.legal) continue;
      let value = 0;
      const gr = g.grant;
      if (gr.type === 'resources') {
        value = goldEquivalent(gr.resources);
        // Building materials matter more when short of them.
        if ((gr.resources.wood ?? 0) > 0 && wallet.wood < 10) value *= 1.3;
        if ((gr.resources.crystal ?? 0) > 0 && wallet.crystal < 5) value *= 1.2;
      } else if (gr.type === 'recruits') {
        for (const [f, n] of Object.entries(q.recruits)) value += n * (catalog.creatures[catalog.families[f]?.baseCreatureId ?? '']?.cost?.gold ?? 0);
      } else if (gr.type === 'experience') value = 1.5 * gr.amount;
      else if (gr.type === 'artifact') value = 2500;
      const score = value / g.favorCost;
      if (!best || score > best.score) best = { score, cost: g.favorCost, payload: { kind: 'ReceiveDivineGift', townId: town.id, giftId: g.id, ...(needsHero ? { heroId: visitor!.id } : {}) } };
    }
    if (best) {
      out.push(best.payload);
      spare -= best.cost;
    }
  }
  return out;
}

export { favorSpare };
