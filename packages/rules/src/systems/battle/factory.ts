/**
 * BattleFactory: creates a legal tactical battle from an adventure encounter.
 *
 * Armies deploy on their side's first columns (heroes stay off-grid). Obstacles
 * come from the saved `layout` stream, never from the combat stream, and an
 * arrangement that would block contact falls back to an empty board.
 */
import type { BattleId, HeroId, SiteId, TownId } from '../../ids';
import { cellKey, cellNeighbors, footprintCells, type BattleCell, type HexCoord } from '../../core/hex';
import type { BattlefieldArchetype, CommanderSpec, StackSpec } from '../../definitions/world';
import type { TownState } from '../../state/match';
import type { BattleCommanderSnapshot, BattleSideId, BattleSideState, BattleState, DefenderSelectionState, HeroState } from '../../state/match';
import { effectiveAttributes, heroEffects, heroLuckBonus, heroMoraleBonus } from '../../resolvers/heroes';
import { missionSite } from '../../resolvers/world';
import { reject, type Tx } from '../../engine/tx';
import { applyDefenderSelection, autoDefenderPicks, deploymentZone, finishSetup, placeStacks, type DeployEntry } from './deployment';
import { buildSiege, townFortificationLevel } from './siege';
import { battleSideEffects } from '../../resolvers/effects';
import { scenarioMission } from '../../resolvers/scenario';

export interface EncounterRequest {
  readonly attackerHeroId: HeroId;
  readonly kind: 'site_guard' | 'hero' | 'town_siege';
  readonly siteId: SiteId | null;
  /** Defending hero (hero battles) or the town's visiting hero (sieges, optional). */
  readonly defenderHeroId: HeroId | null;
  /** Besieged town (town_siege). */
  readonly townId?: TownId | null;
  readonly destination: HexCoord;
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
  const pantheons = new Set(specs.map((s) => tx.catalog.creatures[s.creatureId]?.pantheonId ?? null));
  if (pantheons.size !== 1) return 0;
  const [only] = [...pantheons];
  return only ? tx.profile.combat.sameFactionMorale : 0;
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
  const heroFx = hero && !hero.monster ? heroEffects(tx.catalog, hero) : [];
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
};

function connected(battle: BattleState, blocked: Set<string>): boolean {
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

function generateObstacles(tx: Tx, battle: BattleState): BattleCell[] {
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
  } else {
    const defender = req.defenderHeroId ? tx.state.heroes[req.defenderHeroId] : undefined;
    if (!defender) reject('not_found', 'Unknown defending hero');
    label = defender.monster ? defender.name : `${defender.name}'s army`;
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
  const battle: BattleState = {
    battleId: tx.nextId('battle') as BattleId,
    encounter: {
      kind: req.kind,
      siteId: req.siteId,
      ...(req.kind === 'town_siege' ? { townId: req.townId ?? null } : {}),
      defenderHeroId: req.defenderHeroId,
      attackerHeroId: attacker.id,
      destination: req.destination,
      label,
    },
    archetype,
    cols: combat.cols,
    rows: combat.rows,
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
  };
  if (siegeTown) {
    // Sieges use the fixed wall layout and no random obstacles.
    battle.siege = buildSiege(tx.catalog, battle.rows, siegeTown.id, townFortificationLevel(tx.catalog, siegeTown));
  } else {
    battle.obstacles = generateObstacles(tx, battle);
  }
  placeStacks(tx, battle, 'attacker', attackerEntries);
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
    const picks = defenderEntries.length > max ? autoDefenderPicks(tx.catalog, selection) : defenderEntries.map((_, i) => i);
    applyDefenderSelection(tx, battle, selection, picks);
  } else {
    placeStacks(tx, battle, 'defender', defenderEntries);
  }
  finishSetup(tx, battle);
  return battle;
}
