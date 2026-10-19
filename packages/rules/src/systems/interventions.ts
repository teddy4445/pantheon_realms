/**
 * Divine interventions (proposed this build): miracles paid for in Favor.
 *
 * A player may invoke at most one intervention per world week, adventure or
 * battle. Interventions are catalog data (effect types from
 * definitions/skirmish.ts) offered to every pantheon or to listed pantheons;
 * a scenario enables them with its `interventions` feature (The Three Beacons
 * does not, so its Favor economy stays as documented).
 */
import type { BattleStackId, PlayerId, TownId } from '../ids';
import { resources } from '../core/resources';
import type { ContentCatalog } from '../definitions/catalog';
import type { InterventionDefinition } from '../definitions/skirmish';
import type { BattleSideId, MatchState } from '../state/match';
import { maxMana, movementBudget } from '../resolvers/heroes';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { grant, spend } from './economy';
import { weekOf } from './turn';
import { applyDamage, frontHp, isAlive, requireBattle, sideStacks, statsOf } from './battle/common';
import { applyStatus, battleEnded, requireControl } from './battle/actions';
import { scopeAllowed } from '../resolvers/scenario';
import { terrainAt, missionSite, cellIndex } from '../resolvers/world';
import { axialDistance, hexEquals } from '../core/hex';
import { campStock, campLockedReason, liveCampReservation } from './world';
import { originalGroup } from './battle/libraryRelics';
import { formationSwapOptions, applySpatialSpell } from './battle/librarySpatial';
import { heroShip } from '../resolvers/naval';

export function interventionsEnabled(state: MatchState): boolean {
  return state.scenario.features?.interventions === true;
}

/** A miracle as a pantheon knows it: its own god's name for a shared miracle (same effect, cost and art). */
export function interventionForPantheon(def: InterventionDefinition, pantheonId: string | null | undefined): InterventionDefinition {
  const name = pantheonId ? def.names?.[pantheonId] : undefined;
  return name && name !== def.name ? { ...def, name } : def;
}

/** One intervention by ID, named as the player's pantheon names it (null when unknown). */
export function interventionOf(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, interventionId: string): InterventionDefinition | null {
  const def = catalog.interventions?.[interventionId];
  return def ? interventionForPantheon(def, state.players[playerId]?.pantheonId) : null;
}

/** Interventions this player's pantheon offers (both contexts), in stable order, under the pantheon's own names. */
export function interventionsFor(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): InterventionDefinition[] {
  const player = state.players[playerId];
  if (!player || !interventionsEnabled(state)) return [];
  return Object.values(catalog.interventions ?? {})
    .filter((d) => !d.pantheonIds || d.pantheonIds.includes(player.pantheonId))
    .filter((d) => scopeAllowed(state, d.scope) && (!d.requiredGodId || player.pantheon.patronGodId === d.requiredGodId || player.pantheon.minorGodIds.includes(d.requiredGodId)))
    .map((d) => interventionForPantheon(d, player.pantheonId))
    .sort((a, b) => (a.context === b.context ? (a.favorCost - b.favorCost || (a.id < b.id ? -1 : 1)) : a.context === 'adventure' ? -1 : 1));
}

export interface InterventionQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly def: InterventionDefinition | null;
}

/** True when the player already invoked an intervention this world week. */
export function interventionUsedThisWeek(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): boolean {
  const week = weekOf(state.day, catalog.rulesProfile.daysPerWeek);
  return (state.players[playerId]?.interventionWeek ?? 0) === week;
}

export function quoteIntervention(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  interventionId: string,
  target: { townId?: TownId | null; stackId?: BattleStackId | null; heroId?: string | null; secondStackId?: string | null; siteId?: string | null } = {},
): InterventionQuote {
  const def = interventionOf(catalog, state, playerId, interventionId);
  const fail = (code: RejectionCode, reason: string): InterventionQuote => ({ legal: false, code, reason, def });
  const player = state.players[playerId];
  if (!def || !player) return fail('not_found', 'Unknown intervention');
  if (!interventionsEnabled(state)) return fail('not_in_scope', 'Divine interventions are not part of this scenario');
  if (!interventionsFor(catalog, state, playerId).some((d) => d.id === def.id)) return fail('not_in_scope', `${def.name} is not offered to your pantheon`);
  if (interventionUsedThisWeek(catalog, state, playerId)) return fail('already_done', 'The gods answer once per week');
  if (player.wallet.favor < def.favorCost) return fail('insufficient_resources', `Requires ${def.favorCost} Favor`);
  const battle = state.battle;
  if (def.context === 'battle') {
    if (!battle || battle.status !== 'active') return fail('illegal_action', 'Only during a battle');
    const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
    if (!active || battle.sides[active.side].playerId !== playerId) return fail('illegal_action', 'Invoke it at the start of one of your stacks’ activations');
    if (def.consumesCommanderAction) {
      const side = battle.sides[active.side];
      const heroId = side.commander?.heroId;
      if (!side.commander || (heroId && state.heroes[heroId]?.status !== 'active')) return fail('illegal_action', 'Requires a living commander');
      if (side.castThisRound) return fail('already_done', 'Your commander already used this round’s casting action');
    }
    if (def.target === 'enemy_stack' || def.target === 'ally_stack') {
      const t = target.stackId ? battle.stacks[target.stackId] : undefined;
      const ally = def.target === 'ally_stack';
      if (!t || !isAlive(t) || (t.side === active.side) !== ally) return fail('illegal_target', `Choose a living ${ally ? 'allied' : 'enemy'} stack`);
      if (def.effect.type === 'library_formation_swap') {
        const options = formationSwapOptions(catalog, battle, t);
        if (!options.length || (target.secondStackId && !options.some((o) => o.secondTargetId === target.secondStackId))) return fail('illegal_target', 'Swap two allied stacks within their deployment zone before any ally acts in round one');
      }
      if (def.effect.type === 'library_battle_status') {
        if ((def.effect.status === 'last_creature_guard' || def.effect.status === 'faithful_shadow') && (t.summoned || catalog.creatures[t.creatureId]?.traits?.some((tag) => tag === 'undead' || tag === 'construct'))) return fail('illegal_target', 'Choose an original living creature');
        if (def.effect.wetBattleOnly && !battle.board && terrainAt(state.world.map, battle.encounter.destination) !== 'marsh') return fail('illegal_action', 'Requires a naval or marsh battlefield');
      }
    }
    if (def.effect.type === 'library_dawn_ward' && !sideStacks(battle, active.side).some((s) => !catalog.creatures[s.creatureId]?.traits?.some((t) => t === 'undead' || t === 'construct'))) return fail('illegal_target', 'No living creatures to bless');
    if (def.effect.type === 'library_engine_repair') {
      const engine = battle.siege?.engine;
      if (!engine || engine.side !== active.side || engine.hp <= 0) return fail('illegal_target', 'Requires your surviving catapult');
    }
  } else {
    if (battle) return fail('battle_in_progress', 'Resolve the battle first');
    if (def.target === 'own_hero') {
      const hero = target.heroId ? state.heroes[target.heroId] : undefined;
      if (!hero || hero.status !== 'active' || hero.ownerId !== playerId) return fail('illegal_target', 'Choose an active hero of your empire');
      if (def.effect.type === 'library_guest_right') {
        const site = target.siteId ? missionSite(catalog, state, target.siteId) : undefined;
        const st = site ? state.world.sites[site.id] : undefined;
        if (!site || !st || site.kind.type !== 'creature_camp' || st.owner !== null || (site.guard && !st.cleared) || campLockedReason(catalog, state, site.id)) return fail('illegal_target', 'Choose an unclaimed neutral dwelling with defeated guards and an open hiring pact');
        if (state.fog[playerId]?.explored[cellIndex(state.world.map, site.coord)] !== 1 || axialDistance(hero.position, site.coord) > 1 || (!st.visitedHeroIds?.includes(hero.id) && !hexEquals(hero.position, site.coord))) return fail('illegal_target', 'Choose a dwelling this hero has visited, within one hex');
        if (Object.keys(state.world.sites).some((id) => { const r = liveCampReservation(state, id); return r && (id === site.id || r.ownerId === playerId); })) return fail('already_done', 'A reservation is already active here or for your empire');
        if ((hero.libraryAdventure?.usedDays?.[def.id] ?? -999) + 3 > state.day) return fail('already_done', 'This hero must wait three days between reservations');
        if (Math.min(campStock(catalog, state, site.id), site.kind.weeklyGrowth) < 1) return fail('no_population', 'No current stock can be reserved');
      }
      if (def.effect.type === 'library_ship_blessing') {
        const ship = heroShip(state, hero.id);
        if (!ship || ship.ownerId !== playerId) return fail('illegal_target', 'Choose a hero aboard an owned ship');
      }
    }
    if (def.target === 'own_town') {
      const town = target.townId ? state.towns[target.townId] : undefined;
      if (!town) return fail('illegal_target', 'Choose one of your towns');
      if (town.ownerId !== playerId) return fail('not_owner', 'Choose one of your towns');
    }
  }
  return { legal: true, code: null, reason: null, def };
}

function payAndMark(tx: Tx, def: InterventionDefinition): void {
  spend(tx, tx.actorId, resources({ favor: def.favorCost }), def.name);
  tx.state.players[tx.actorId]!.interventionWeek = weekOf(tx.state.day, tx.profile.daysPerWeek);
}

export function commitIntervention(tx: Tx, interventionId: string, townId: TownId | null, heroId?: string, siteId?: string): void {
  const q = quoteIntervention(tx.catalog, tx.state, tx.actorId, interventionId, { townId, heroId, siteId });
  if (!q.legal || !q.def) reject(q.code ?? 'illegal_action', q.reason ?? 'The gods do not answer');
  const def = q.def;
  if (def.context !== 'adventure') reject('illegal_action', 'Only during a battle');
  payAndMark(tx, def);
  const e = def.effect;
  const heroes = Object.values(tx.state.heroes)
    .filter((h) => h.ownerId === tx.actorId && h.status === 'active' && !h.monster)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  switch (e.type) {
    case 'library_guest_right': {
      const site = missionSite(tx.catalog, tx.state, siteId!)!;
      const hero = tx.state.heroes[heroId!]!;
      if (site.kind.type !== 'creature_camp') reject('illegal_target', 'Not a dwelling');
      tx.state.world.sites[site.id]!.reservation = { heroId: hero.id, ownerId: tx.actorId, quantity: Math.min(campStock(tx.catalog, tx.state, site.id), site.kind.weeklyGrowth), untilDay: tx.state.day + 1 };
      ((hero.libraryAdventure ??= {}).usedDays ??= {})[def.id] = tx.state.day;
      break;
    }
    case 'library_ship_blessing': {
      const hero = tx.state.heroes[heroId!]!;
      if (e.effect === 'mooring') heroShip(tx.state, hero.id)!.mooring = { untilDay: tx.state.day + 1, ownerId: tx.actorId, heroId: hero.id };
      else (hero.libraryAdventure ??= {}).safeLanding = { untilDay: tx.state.day + 1, ownerId: tx.actorId, percent: e.percent ?? 25 };
      break;
    }
    case 'restore_movement':
      for (const h of heroes) h.movementPoints += Math.floor((movementBudget(tx.catalog, tx.state, h).total * e.percent) / 100);
      break;
    case 'restore_mana':
      for (const h of heroes) h.mana = Math.min(maxMana(tx.catalog, tx.state, h), h.mana + e.amount);
      break;
    case 'grant_resources':
      grant(tx, tx.actorId, resources(e.resources), def.name);
      break;
    case 'town_growth': {
      const town = tx.state.towns[townId!]!;
      for (const familyId of Object.keys(town.population).sort()) {
        const tier = tx.catalog.families[familyId]?.tier ?? 99;
        if (tier > e.maxTier) continue;
        town.population[familyId] = (town.population[familyId] ?? 0) + e.amount;
        tx.emit({ kind: 'PopulationGrown', townId: town.id, familyId, added: e.amount, total: town.population[familyId]! });
      }
      break;
    }
    default:
      reject('illegal_action', 'Only during a battle');
  }
  tx.emit({ kind: 'InterventionInvoked', playerId: tx.actorId, interventionId: def.id, targetTownId: townId ?? null, targetStackId: null });
}

export function commitBattleIntervention(tx: Tx, interventionId: string, targetId: BattleStackId | null, secondTargetId?: string): void {
  const battle = requireBattle(tx.state);
  const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
  if (!active) reject('illegal_action', 'Invoke it at the start of a friendly activation');
  requireControl(tx, battle, active.side);
  const q = quoteIntervention(tx.catalog, tx.state, tx.actorId, interventionId, { stackId: targetId, secondStackId: secondTargetId });
  if (!q.legal || !q.def) reject(q.code ?? 'illegal_action', q.reason ?? 'The gods do not answer');
  const def = q.def;
  if (def.context !== 'battle') reject('illegal_action', 'Not a battle intervention');
  if (def.effect.type === 'library_formation_swap' && !secondTargetId) reject('illegal_target', 'Choose the second stack');
  payAndMark(tx, def);
  const side: BattleSideId = active.side;
  if (def.consumesCommanderAction) battle.sides[side].castThisRound = true;
  const e = def.effect;
  switch (e.type) {
    case 'library_formation_swap': {
      const target = battle.stacks[targetId!]!;
      const option = formationSwapOptions(tx.catalog, battle, target).find((o) => o.secondTargetId === secondTargetId)!;
      applySpatialSpell(tx, battle, target, { type: 'spatial_move', mode: 'swap', range: battle.cols + battle.rows }, option);
      break;
    }
    case 'library_dawn_ward':
      for (const target of sideStacks(battle, side)) {
        if (tx.catalog.creatures[target.creatureId]?.traits?.some((t) => t === 'undead' || t === 'construct')) continue;
        target.statuses = target.statuses.filter((s) => s.kind !== 'fear' && s.kind !== 'blind');
        applyStatus(target, { sourceId: `intervention:${def.id}`, label: def.name, kind: 'mind_control_ward', amount: 1, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds, dispellable: false }, { battle, casterSide: side });
      }
      break;
    case 'library_element_barrier': {
      const target = battle.stacks[targetId!]!;
      target.statuses = target.statuses.filter((s) => s.kind !== 'fire_dot');
      applyStatus(target, { sourceId: `intervention:${def.id}`, label: def.name, kind: 'element_barrier', amount: e.hp, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds, dispellable: false }, { battle, casterSide: side });
      break;
    }
    case 'library_battle_status': {
      const target = battle.stacks[targetId!]!;
      const affected = (e.status === 'last_creature_guard' || e.status === 'faithful_shadow') ? originalGroup(battle, target) : [target];
      for (const s of affected) applyStatus(s, { sourceId: `intervention:${def.id}`, label: def.name, kind: e.status, amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds, ...(e.charges !== undefined ? { charges: e.charges } : {}), dispellable: false }, { battle, casterSide: side });
      break;
    }
    case 'library_spell_credit':
      battle.sides[side].spellCredit = { amount: e.amount, expiresAtRound: battle.round + e.durationRounds };
      break;
    case 'library_engine_repair': {
      const engine = battle.siege!.engine!;
      engine.hp = Math.min(engine.maxHp, engine.hp + e.heal);
      engine.barrier = { hp: e.barrier, expiresAtRound: battle.round + e.durationRounds };
      break;
    }
    case 'battle_status': {
      const kind = e.stat === 'attack' ? 'attack_bonus' : e.stat === 'defense' ? 'defense_bonus' : 'speed_bonus';
      for (const s of sideStacks(battle, side)) {
        applyStatus(s, { sourceId: `intervention:${def.id}`, label: def.name, kind, amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds }, { battle, casterSide: side });
      }
      break;
    }
    case 'battle_heal': {
      let healed = 0;
      for (const s of sideStacks(battle, side)) {
        if (s.summoned) continue;
        const hp = statsOf(tx.catalog, s.creatureId).hp;
        const add = Math.max(0, Math.min(hp - frontHp(tx.catalog, s), e.amount));
        s.totalHp += add;
        healed += add;
      }
      tx.emit({ kind: 'BattleStacksHealed', side, healed });
      break;
    }
    case 'battle_smite': {
      const target = battle.stacks[targetId!]!;
      applyDamage(tx, battle, target, e.damage);
      break;
    }
    default:
      reject('illegal_action', 'Not a battle intervention');
  }
  tx.emit({ kind: 'InterventionInvoked', playerId: tx.actorId, interventionId: def.id, targetTownId: null, targetStackId: targetId ?? null });
  battleEnded(tx, battle);
}
