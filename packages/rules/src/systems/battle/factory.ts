/**
 * BattleFactory: creates a legal tactical battle from an adventure encounter.
 *
 * Armies deploy on their side's first columns (heroes stay off-grid). Obstacles
 * come from the saved `layout` stream, never from the combat stream, and an
 * arrangement that would block contact falls back to an empty board.
 */
import type { BattleId, HeroId, ShipId, SiteId, TownId } from '../../ids';
import { cellKey, cellNeighbors, footprintCells, type BattleCell, type HexCoord } from '../../core/hex';
import type { BattlefieldArchetype, CommanderSpec, StackSpec } from '../../definitions/world';
import type { TownState } from '../../state/match';
import type { BattleCommanderSnapshot, BattleSideId, BattleSideState, BattleState, DefenderSelectionState, HeroState } from '../../state/match';
import { armyCompositionMorale, effectiveAttributes, heroEffects, heroLuckBonus, heroMoraleBonus } from '../../resolvers/heroes';
import { missionSite } from '../../resolvers/world';
import { reject, type Tx } from '../../engine/tx';
import { applyDefenderSelection, autoDefenderPicks, deploymentZone, finishSetup, mergeDefenderCandidates, placeStacks, type DeployEntry } from './deployment';
import { buildSiege, townFortificationLevel } from './siege';
import { buildSiegeEngine } from './engine';
import { battleSideEffects } from '../../resolvers/effects';
import { battleClimate } from './climate';
import { scenarioMission } from '../../resolvers/scenario';
import { caravanDefenders } from '../../resolvers/caravans';
import { BATTLEFIELD_LAYOUTS, navalRules } from '../../definitions/naval';
import { boardFromLayout } from './board';
import { seaEncounterBoard } from './seaBoard';
import { wreckDefenders } from '../seaSites';
import { heroShip } from '../../resolvers/naval';

export interface EncounterRequest {
  readonly attackerHeroId: HeroId;
  readonly kind: 'site_guard' | 'hero' | 'town_siege' | 'caravan_intercept' | 'naval_boarding' | 'wreck_expedition';
  readonly siteId: SiteId | null;
  /** Defending hero (hero battles) or the town's visiting hero (sieges, optional). */
  readonly defenderHeroId: HeroId | null;
  /** Besieged town (town_siege). */
  readonly townId?: TownId | null;
  readonly destination: HexCoord;
  /** The intercepted recruitment caravan (caravan_intercept): its cargo defends without a commander. */
  readonly caravanId?: string | null;
  /** naval_boarding (navalMovementV1): the boarding ship and the boarded one. */
  readonly attackerShipId?: ShipId | null;
  readonly defenderShipId?: ShipId | null;
  /** A sea encounter (seaEncountersV1): the ship whose deck is the battlefield (its hero attacks or defends). */
  readonly sourceShipId?: ShipId | null;
}

function heroCommander(tx: Tx, hero: HeroState): BattleCommanderSnapshot | null {
  // Wandering monsters fight without a commander (no attributes, spells or morale bonus).
  if (hero.monster) return null;
  const attrs = effectiveAttributes(tx.catalog, tx.state, hero);
  return {
    heroId: hero.id,
    name: hero.name,
    portraitAssetId: hero.portraitAssetId,
    attack: attrs.attack.total,
    defense: attrs.defense.total,
    ...(tx.state.scenario.features?.mythicLibraryV2 ? { defenseWithoutArtifacts: Math.max(0, attrs.defense.total - attrs.defense.artifacts) } : {}),
    power: attrs.power.total,
    knowledge: attrs.knowledge.total,
    skills: hero.skills.map((s) => ({ ...s })),
    spellbook: hero.spellbook,
    knownSpellIds: [...hero.knownSpellIds],
    morale: heroMoraleBonus(tx.catalog, tx.state, hero),
    luck: heroLuckBonus(tx.catalog, tx.state, hero),
  };
}

function scriptedCommander(tx: Tx, spec: CommanderSpec): BattleCommanderSnapshot {
  const skillsHero = { skills: spec.skills.map((s) => ({ ...s })) };
  const leadership = spec.skills.reduce((n, s) => {
    const d = tx.catalog.skills[s.skillId];
    return d?.rule.type === 'leadership' ? n + (d.rule.moraleByRank[s.rank - 1] ?? 0) : n;
  }, 0);
  const fortune = spec.skills.reduce((n, s) => {
    const d = tx.catalog.skills[s.skillId];
    return d?.rule.type === 'fortune' ? n + (d.rule.luckByRank[s.rank - 1] ?? 0) : n;
  }, 0);
  return {
    heroId: null,
    name: spec.name,
    portraitAssetId: spec.portraitAssetId,
    attack: spec.attributes.attack,
    defense: spec.attributes.defense,
    power: spec.attributes.power,
    knowledge: spec.attributes.knowledge,
    skills: skillsHero.skills,
    spellbook: spec.spellbook,
    knownSpellIds: [...spec.spellIds],
    morale: leadership,
    luck: fortune,
  };
}

function factionMorale(tx: Tx, specs: readonly StackSpec[]): number {
  return armyCompositionMorale(tx.catalog, specs.map((s) => s.creatureId)).value;
}

function makeSide(
  tx: Tx,
  sideId: BattleSideId,
  playerId: string | null,
  controller: 'human' | 'ai',
  commander: BattleCommanderSnapshot | null,
  scriptedMana: number,
  morale: number,
  hero?: HeroState | null,
): BattleSideState {
  const heroFx = hero && !hero.monster ? heroEffects(tx.catalog, hero, tx.state) : [];
  return {
    sideId,
    playerId,
    controller,
    commander,
    scriptedMana,
    castThisRound: false,
    familyChargesUsed: {},
    factionMorale: morale,
    retreated: false,
    surrendered: false,
    effects: battleSideEffects(tx.catalog, tx.state, playerId, heroFx),
  };
}

const OBSTACLE_COUNT: Record<BattlefieldArchetype, [number, number]> = {
  coast_road: [3, 5],
  ridge_pass: [5, 7],
  grove: [5, 8],
  plateau: [4, 6],
  beacon_clearing: [2, 4],
  open_field: [3, 6],
  // The boarding board never gets random obstacles (only its fixed legal cells).
  boarding_two_ships_v1: [0, 0],
  // Nor the single-ship sea encounter (deck and water only; seaEncountersV1).
  single_ship_sea_encounter_v2: [0, 0],
};

export function connected(battle: BattleState, blocked: Set<string>): boolean {
  // A two-hex walker anchored at col 1 must reach col >= cols - 2 on some row.
  const ok = (c: BattleCell) =>
    footprintCells(c, 2, 1).every((x) => x.col >= 0 && x.col < battle.cols && !blocked.has(cellKey(x)));
  const start: BattleCell[] = [];
  for (let row = 0; row < battle.rows; row++) if (ok({ col: 1, row })) start.push({ col: 1, row });
  const seen = new Set(start.map(cellKey));
  const queue = [...start];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.col >= battle.cols - 2) return true;
    for (const n of cellNeighbors(cur, battle.cols, battle.rows)) {
      const k = cellKey(n);
      if (seen.has(k) || !ok(n)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return false;
}

export function generateObstacles(tx: Tx, battle: BattleState): BattleCell[] {
  const rng = tx.rng('layout');
  const [lo, hi] = OBSTACLE_COUNT[battle.archetype];
  const count = rng.nextRange(lo, hi);
  // Protect both deployment zones, including columns added by Tactics (mapgen §battle).
  const minCol = Math.max(3, deploymentZone(tx.catalog, battle, 'attacker').width);
  const maxCol = Math.min(battle.cols - 4, battle.cols - 1 - deploymentZone(tx.catalog, battle, 'defender').width);
  const cells: BattleCell[] = [];
  const keys = new Set<string>();
  let attempts = 0;
  while (cells.length < count && attempts < 200) {
    attempts++;
    const c = { col: rng.nextRange(minCol, maxCol), row: rng.nextRange(0, battle.rows - 1) };
    const k = cellKey(c);
    if (keys.has(k)) continue;
    keys.add(k);
    cells.push(c);
  }
  return connected(battle, keys) ? cells : [];
}

const slotEntries = (slots: readonly ({ creatureId: string; count: number } | null)[], source: DeployEntry['source']): DeployEntry[] =>
  slots.flatMap((sl, slot) => (sl && sl.count > 0 ? [{ spec: { creatureId: sl.creatureId, count: sl.count }, slot, source }] : []));

export function startBattle(tx: Tx, req: EncounterRequest): BattleState {
  if (tx.state.battle) reject('battle_in_progress', 'A battle is already in progress');
  const attacker = tx.state.heroes[req.attackerHeroId];
  if (!attacker) reject('not_found', 'Unknown attacking hero');
  const attackerPlayer = tx.state.players[attacker.ownerId]!;
  const combat = tx.profile.combat;

  let label = 'Battle';
  let archetype: BattlefieldArchetype = 'open_field';
  let defenderSide: BattleSideState;
  let defenderEntries: DeployEntry[];
  let siegeTown: TownState | null = null;
  if (req.kind === 'site_guard') {
    const def = req.siteId ? missionSite(tx.catalog, tx.state, req.siteId) : undefined;
    const st = req.siteId ? tx.state.world.sites[req.siteId] : undefined;
    if (!def?.guard || !st || st.cleared) reject('illegal_move', 'That site is not guarded');
    label = def.guard.label;
    archetype = def.guard.battlefield;
    const specs = [...(st.guard ?? def.guard.army)];
    defenderEntries = specs.flatMap((sp, slot) => (sp && sp.count > 0 ? [{ spec: sp, slot, source: 'hero' as const }] : []));
    const commander = def.guard.commander ? scriptedCommander(tx, def.guard.commander) : null;
    const hostile = scenarioMission(tx.catalog, tx.state)?.hostilePlayer?.playerId ?? null;
    defenderSide = makeSide(
      tx,
      'defender',
      commander && hostile && tx.state.players[hostile] ? hostile : null,
      'ai',
      commander,
      def.guard.commander?.mana ?? 0,
      factionMorale(tx, specs.filter((s): s is StackSpec => !!s)),
    );
  } else if (req.kind === 'town_siege') {
    const town = req.townId ? tx.state.towns[req.townId] : undefined;
    if (!town) reject('not_found', 'Unknown town');
    siegeTown = town;
    const visitor = req.defenderHeroId ? tx.state.heroes[req.defenderHeroId] : undefined;
    label = `Siege of ${town.name}`;
    defenderEntries = [...(visitor ? slotEntries(visitor.army.slots, 'hero') : []), ...slotEntries(town.garrison.slots, 'garrison')];
    if (defenderEntries.length === 0) reject('illegal_move', 'Nothing defends that town');
    const ownerId = town.ownerId;
    defenderSide = makeSide(
      tx,
      'defender',
      ownerId,
      ownerId ? (tx.state.players[ownerId]?.controller ?? 'ai') : 'ai',
      visitor ? heroCommander(tx, visitor) : null,
      0,
      0,
      visitor ?? null,
    );
  } else if (req.kind === 'caravan_intercept') {
    // A recruitment caravan's cargo: a hero-less defending army (no commander, spells or retreat),
    // commanded by its owner where the turn policy allows; the owner's player-wide effects only.
    const caravan = req.caravanId ? tx.state.caravans?.[req.caravanId] : undefined;
    if (!caravan) reject('not_found', 'Unknown caravan');
    label = `${tx.state.players[caravan.ownerId]?.name ?? 'A rival'}’s caravan`;
    defenderEntries = caravanDefenders(caravan).map((e) => ({ spec: e.spec, slot: e.slot, source: 'hero' as const }));
    if (defenderEntries.length === 0) reject('illegal_move', 'Nothing defends that caravan');
    defenderSide = makeSide(
      tx,
      'defender',
      caravan.ownerId,
      tx.state.players[caravan.ownerId]?.controller ?? 'ai',
      null,
      0,
      factionMorale(tx, defenderEntries.map((e) => e.spec)),
      null,
    );
  } else if (req.kind === 'wreck_expedition') {
    // Sea-sites kit: raiders moored alongside a wreck — a commander-less neutral army on the far deck.
    const raiders = wreckDefenders(tx, req.siteId);
    label = raiders.label;
    defenderEntries = raiders.army.map((spec, slot) => ({ spec, slot, source: 'hero' as const }));
    defenderSide = makeSide(tx, 'defender', null, 'ai', null, 0, factionMorale(tx, raiders.army));
  } else {
    const defender = req.defenderHeroId ? tx.state.heroes[req.defenderHeroId] : undefined;
    if (!defender) reject('not_found', 'Unknown defending hero');
    label = defender.monster ? defender.name : req.kind === 'naval_boarding' ? `Boarding ${defender.name}'s ship` : `${defender.name}'s army`;
    defenderEntries = slotEntries(defender.army.slots, 'hero');
    defenderSide = makeSide(
      tx,
      'defender',
      defender.ownerId,
      tx.state.players[defender.ownerId]?.controller ?? 'ai',
      heroCommander(tx, defender),
      0,
      factionMorale(tx, defenderEntries.map((e) => e.spec)),
      defender,
    );
  }
  const attackerEntries = slotEntries(attacker.army.slots, 'hero');
  // Boarding battles use the two-ship board (navalMovementV1): its own archetype and legal-cell mask.
  // Wreck expeditions (sea-sites kit) are fought on the same two decks: raiders moored alongside the wreck.
  const onDecks = req.kind === 'naval_boarding' || req.kind === 'wreck_expedition';
  const boardLayout = onDecks ? BATTLEFIELD_LAYOUTS[navalRules(tx.profile).boardingLayoutId] : undefined;
  if (onDecks && !boardLayout) reject('not_found', 'Unknown boarding battlefield');
  if (boardLayout) archetype = boardLayout.id as BattlefieldArchetype;
  // Sea encounters (seaEncountersV1): the single-ship board, its ship side bound to the source ship's hero.
  const sea = req.sourceShipId && !boardLayout ? seaEncounterBoard(tx, { sourceShipId: req.sourceShipId, attackerHeroId: attacker.id, defenderHeroId: req.defenderHeroId }, attackerEntries.map((e) => e.spec.creatureId), defenderEntries.map((e) => e.spec.creatureId)) : null;
  if (sea) archetype = sea.layout.id as BattlefieldArchetype;
  const battle: BattleState = {
    battleId: tx.nextId('battle') as BattleId,
    encounter: {
      kind: req.kind,
      siteId: req.siteId,
      ...(req.kind === 'town_siege' ? { townId: req.townId ?? null } : {}),
      ...(req.kind === 'caravan_intercept' ? { caravanId: req.caravanId ?? null } : {}),
      ...(req.kind === 'naval_boarding' ? { attackerShipId: req.attackerShipId ?? null, defenderShipId: req.defenderShipId ?? null } : {}),
      ...(req.kind === 'wreck_expedition' ? { attackerShipId: req.attackerShipId ?? null, defenderShipId: null } : {}),
      ...(sea ? { sourceShipId: req.sourceShipId ?? null } : {}),
      defenderHeroId: req.defenderHeroId,
      attackerHeroId: attacker.id,
      destination: req.destination,
      label,
    },
    archetype,
    cols: sea?.layout.cols ?? boardLayout?.cols ?? combat.cols,
    rows: sea?.layout.rows ?? boardLayout?.rows ?? combat.rows,
    obstacles: [],
    sides: {
      attacker: makeSide(
        tx,
        'attacker',
        attacker.ownerId,
        attackerPlayer.controller,
        heroCommander(tx, attacker),
        0,
        factionMorale(tx, attackerEntries.map((e) => e.spec)),
        attacker,
      ),
      defender: defenderSide,
    },
    stacks: {},
    round: 0,
    phase: 'normal',
    normalQueue: [],
    waitQueue: [],
    activeStackId: null,
    activeIsBonus: false,
    status: 'active',
    layoutSeed: tx.state.rng.layout,
    // The map climate's rule for both sides (scenario feature climateRules), fixed for this battle.
    climate: battleClimate(tx.catalog, tx.state),
  };
  if (siegeTown) {
    // Sieges use the fixed wall layout and no random obstacles.
    battle.siege = buildSiege(tx.catalog, battle.rows, siegeTown.id, townFortificationLevel(tx.catalog, siegeTown));
    // targetableCatapultV1 (decided now, saved with the battle): a fortified siege gets the attacker's
    // stationary catapult, its cells reserved before anyone deploys. Absent = the legacy automatic shot.
    if (battle.siege.level > 0 && tx.state.scenario.features?.targetableCatapultV1 === true) battle.siege.engine = buildSiegeEngine(tx.profile);
  } else if (sea) {
    // The single-ship sea encounter: deck and water by its zone policy; no random obstacles.
    battle.board = sea.board;
  } else if (boardLayout) {
    // A masked board (naval boarding): only its legal cells exist; no random obstacles (expedition kit §08).
    battle.board = boardFromLayout(boardLayout);
  } else {
    battle.obstacles = generateObstacles(tx, battle);
  }
  placeStacks(tx, battle, 'attacker', attackerEntries);
  if (battle.board && tx.state.scenario.features?.mythicLibraryV2) {
    for (const side of ['attacker', 'defender'] as const) {
      const heroId = side === 'attacker' ? req.attackerHeroId : req.defenderHeroId;
      const ship = heroId ? heroShip(tx.state, heroId) : null;
      const blessing = ship?.mooring;
      if (ship && blessing && blessing.untilDay > tx.state.day && blessing.heroId === heroId && blessing.ownerId === ship.ownerId) {
        const fx = battle.sides[side].effects;
        if (fx) fx.library = [...(fx.library ?? []), { type: 'library_displacement_guard' }];
        delete ship.mooring;
      }
    }
  }
  tx.state.battle = battle;
  tx.state.lastBattleResult = null;
  tx.emit({ kind: 'BattleStarted', battleId: battle.battleId, label });
  if (siegeTown) {
    const max = combat.maxStacksPerSide;
    const selection: DefenderSelectionState = {
      candidates: defenderEntries.map((e) => ({ source: e.source, slot: e.slot, creatureId: e.spec.creatureId, count: e.spec.count })),
      max,
    };
    if (defenderEntries.length > max && defenderSide.controller === 'human') {
      // BAT-14: the human defender chooses; reserves and their fate are shown first.
      battle.phase = 'selection';
      battle.selection = selection;
      return battle;
    }
    // The game's own defenders combine identical stacks first (2026-10-07), then keep the most valuable.
    if (defenderEntries.length > max) mergeDefenderCandidates(tx, battle, selection);
    const picks = selection.candidates.length > max ? autoDefenderPicks(tx.catalog, selection) : selection.candidates.map((_, i) => i);
    applyDefenderSelection(tx, battle, selection, picks);
  } else {
    placeStacks(tx, battle, 'defender', defenderEntries);
  }
  finishSetup(tx, battle);
  return battle;
}
