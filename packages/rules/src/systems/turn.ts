import { processSeedGrowth } from './libraryEconomy';
/**
 * TurnManager / DayProcessor / WeekProcessor.
 *
 * A world day advances only after every active player ends their turn. The dawn
 * transition is one atomic step (design/02 §3): income, weekly growth, build
 * allowance reset, movement/mana refresh, then the next turn sequence begins.
 * With city dedications (app 1.5.0) a new week also activates due switches before
 * the income, pays the towns' weekly gifts after it and adds each favored family's
 * extra after its ordinary growth (dedicationSystem.ts).
 * Each payout carries an idempotency key; reloading never repeats it.
 */
import { expireTemporaryVision } from './magic';
import { addResources, resources, type ResourceBundle } from '../core/resources';
import type { MatchState } from '../state/match';
import { dawnManaRegen, heroEffects, maxMana, movementBudget } from '../resolvers/heroes';
import { playerTowns, townDailyIncome, townHasEffect, weeklyGrowthFor } from '../resolvers/town';
import { missionSite, heroInTown } from '../resolvers/world';
import { scenarioMission } from '../resolvers/scenario';
import type { Tx } from '../engine/tx';
import { grant } from './economy';
import { learnSpellsAtTown } from './heroes';
import { refreshTownShops } from './services';
import { playerEffects } from '../resolvers/effects';
import { advanceRelics, restockCamps, startWeeklyEvent } from './world';
import { recordDayStats } from './stats';
import { applyCityDevotionGrowth, beginCityDedicationWeek, grantCityGifts } from './dedicationSystem';
import { processCaravanTurnStart } from './caravans';
import { processLibraryAdventureDawn } from './libraryAdventure';

export function weekOf(day: number, daysPerWeek = 7): number {
  return 1 + Math.floor((day - 1) / daysPerWeek);
}

export function dayOfWeek(day: number, daysPerWeek = 7): number {
  return 1 + ((day - 1) % daysPerWeek);
}

export function commitEndTurn(tx: Tx): void {
  const state = tx.state;
  tx.emit({ kind: 'TurnEnded', playerId: state.activePlayerId });
  const members = state.coalition?.playerIds ?? [], lead = members[0];
  const order = state.playerOrder.filter((id) => !members.includes(id) || id === lead);
  const acting = members.includes(state.activePlayerId) ? lead! : state.activePlayerId;
  const start = Math.max(0, order.indexOf(acting));
  // Walk the full order from the current seat (which may itself have just been
  // eliminated), skipping eliminated players; passing the last seat is dawn.
  let next = state.activePlayerId;
  for (let step = 1; step <= order.length; step++) {
    const i = start + step;
    if (i === order.length) {
      processDawn(tx);
      if (scenarioMission(tx.catalog, state)?.turnOrder === 'rotating') {
        // The empire that opened the day moves last tomorrow (non-contenders keep their places).
        rotateContenders(state);
        next = state.playerOrder.find((id) => !state.players[id]?.eliminated) ?? next;
        break;
      }
    }
    const id = order[i % order.length]!;
    if (!state.players[id]?.eliminated) {
      next = id;
      break;
    }
  }
  state.activePlayerId = next;
  // Recruitment caravans move at the start of their owner's turn (once per turn; saved cursor).
  for (const owner of members.includes(next) ? members : [next]) processCaravanTurnStart(tx, owner);
  tx.emit({ kind: 'TurnStarted', playerId: state.activePlayerId, day: state.day });
}

/** Rotate the empires (role player/rival) one place within their positions in the turn order. */
function rotateContenders(state: MatchState): void {
  const isContender = (id: string) => state.players[id]?.role === 'player' || state.players[id]?.role === 'rival';
  const slots = state.playerOrder.map((id, i) => (isContender(id) ? i : -1)).filter((i) => i >= 0);
  if (slots.length < 2) return;
  const ids = slots.map((i) => state.playerOrder[i]!);
  const rotated = [...ids.slice(1), ids[0]!];
  const order = [...state.playerOrder];
  slots.forEach((slot, k) => (order[slot] = rotated[k]!));
  state.playerOrder = order;
}

/** Income a player will receive at the next dawn (for the "next dawn" preview). */
export function projectedIncome(tx: Pick<Tx, 'catalog' | 'state'>, playerId: string): ResourceBundle {
  const { catalog, state } = tx;
  let total = resources();
  for (const town of playerTowns(state, playerId)) total = addResources(total, townDailyIncome(catalog, town));
  // Player-wide income (gods, signatures, weekly events): paid while the player still owns a town.
  if (playerTowns(state, playerId).length > 0) {
    for (const e of playerEffects(catalog, state, playerId)) if (e.type === 'daily_income') total = addResources(total, { [e.resource]: e.amount });
  }
  // Hero income (pantheon skills, artifacts): paid for every active hero.
  for (const hero of Object.values(state.heroes)) {
    if (hero.ownerId !== playerId || hero.status !== 'active' || hero.monster) continue;
    for (const e of heroEffects(catalog, hero, state)) if (e.type === 'daily_income') total = addResources(total, { [e.resource]: e.amount });
  }
  for (const [siteId, site] of Object.entries(state.world.sites)) {
    if (site.owner !== playerId) continue;
    const def = missionSite(catalog, state, siteId);
    if (def?.kind.type === 'resource_site') total = addResources(total, { [def.kind.resource]: def.kind.dailyYield });
  }
  // Skirmish difficulty handicap (AI empires on Easy/Hard), each resource rounded down.
  const pct = state.players[playerId]?.incomePercent ?? 100;
  if (pct !== 100) {
    total = resources({
      gold: Math.floor((total.gold * pct) / 100),
      wood: Math.floor((total.wood * pct) / 100),
      stone: Math.floor((total.stone * pct) / 100),
      crystal: Math.floor((total.crystal * pct) / 100),
      favor: Math.floor((total.favor * pct) / 100),
    });
  }
  return total;
}

export function processDawn(tx: Tx): void {
  const state = tx.state;
  const { catalog } = tx;
  const daysPerWeek = tx.profile.daysPerWeek;
  state.day += 1;
  const day = state.day;
  const week = weekOf(day, daysPerWeek);
  const newWeek = day > 1 && (day - 1) % daysPerWeek === 0;
  expireTemporaryVision(state);
  processLibraryAdventureDawn(tx);
  tx.emit({ kind: 'DayStarted', day, week, dayOfWeek: dayOfWeek(day, daysPerWeek) });

  // Step 1b: a new week's event is announced before it pays or grows anything.
  if (newWeek) startWeeklyEvent(tx, week);

  // Step 1c (city dedications, app 1.5.0): each dedicated town claims this week's transaction
  // once (key + stamp) and a due valid switch takes over. Null in scenarios without the feature.
  const dedicationWeek = newWeek ? beginCityDedicationWeek(tx, week) : null;

  // Step 2: recurring income from ownership and buildings already present.
  const incomeToday: Record<string, ResourceBundle> = {};
  for (const playerId of state.playerOrder) {
    const player = state.players[playerId];
    if (!player || player.eliminated || player.role === 'scripted_hostile') continue;
    if (!tx.applyOnce(`dawn_income:${day}:${playerId}`)) continue;
    const income = projectedIncome(tx, playerId);
    incomeToday[playerId] = income;
    if (Object.values(income).some((v) => v > 0)) {
      grant(tx, playerId, income, 'Dawn income');
      tx.emit({ kind: 'IncomeCollected', playerId, amount: income });
    }
  }

  // Step 2b (city dedications): each eligible dedicated town's weekly gift (never part of the daily income).
  if (dedicationWeek) grantCityGifts(tx, dedicationWeek);

  // Step 3: weekly growth on days 8, 15, 22, ...
  if (newWeek) {
    for (const town of Object.values(state.towns).sort((a, b) => (a.id < b.id ? -1 : 1))) {
      if (!tx.applyOnce(`weekly_growth:${day}:${town.id}`)) continue;
      for (const familyId of Object.keys(town.population).sort()) {
        const added = weeklyGrowthFor(catalog, town, familyId, state);
        town.population[familyId] = (town.population[familyId] ?? 0) + added;
        tx.emit({ kind: 'PopulationGrown', townId: town.id, familyId, added, total: town.population[familyId]! });
      }
      // Ordinary growth first (with its modifiers), then the dedication's favored-family extra once.
      if (dedicationWeek) applyCityDevotionGrowth(tx, town, dedicationWeek);
      refreshTownShops(tx, town);
    }
    restockCamps(tx, week);
    processSeedGrowth(tx, week);
  }

  // Step 4: build allowance resets implicitly (buildUsedDay != day); refresh heroes.
  for (const hero of Object.values(state.heroes).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (hero.status !== 'active') continue;
    hero.movementPoints = movementBudget(catalog, state, hero).total;
    const cap = maxMana(catalog, state, hero);
    const town = Object.values(state.towns).find((t) => t.ownerId === hero.ownerId && heroInTown(catalog, state, hero, t.id));
    if (town && townHasEffect(catalog, town, 'spell_library')) {
      hero.mana = cap;
      learnSpellsAtTown(tx, hero, town);
    } else {
      hero.mana = Math.min(cap, hero.mana + dawnManaRegen(catalog, state, hero));
    }
  }

  // Step 5: relics count another day held; the day's statistics are recorded.
  advanceRelics(tx);
  recordDayStats(catalog, state, (id) => incomeToday[id] ?? resources());
}
