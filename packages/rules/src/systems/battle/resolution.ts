/**
 * BattleResultBuilder: converts a finished battle into persistent consequences
 * in ONE transaction, before the result screen opens (design/04 §9):
 * casualties, XP, scenario rewards, site clearing, hero outcomes, level-ups.
 * Reopening the result screen is read-only; rewards apply exactly once.
 */
import type { HeroId } from '../../ids';
import { addResources, resources } from '../../core/resources';
import { grant } from '../economy';
import { bumpTotal } from '../stats';
import type { BattleCasualtyLine, BattleResultRecord, BattleSideId, BattleState, HeroState } from '../../state/match';
import type { Tx } from '../../engine/tx';
import { aliveCount, sideStacks, statsOf } from './common';
import { grantExperience } from '../heroes';
import { grantReward } from '../quests';
import { missionSite } from '../../resolvers/world';
import { arriveAt } from '../adventure';

export function resolveBattle(tx: Tx, battle: BattleState, winner: BattleSideId, outcome: BattleResultRecord['outcome']): void {
  if (battle.status === 'ended') return;
  battle.status = 'ended';
  battle.activeStackId = null;
  const state = tx.state;
  const catalog = tx.catalog;
  const loser: BattleSideId = winner === 'attacker' ? 'defender' : 'attacker';
  tx.emit({ kind: 'BattleEnded', battleId: battle.battleId, winner, outcome });

  // --- Casualty recovery (casualty_recovery effects of the winning side, frozen at battle start) ---
  // Capped by this battle's own losses per stack; no XP, reward or kill credit is created.
  const recovered = new Map<string, number>();
  const recoveryPercent = battle.sides[winner].effects?.recoveryPercent ?? 0;
  if (recoveryPercent > 0 && outcome !== 'stalemate') {
    for (const s of Object.values(battle.stacks)) {
      if (s.side !== winner) continue;
      const losses = s.startingCount - aliveCount(catalog, s);
      const back = Math.min(losses, Math.floor((losses * recoveryPercent) / 100));
      if (back <= 0) continue;
      recovered.set(s.id, back);
      tx.emit({ kind: 'BattleCasualtiesRecovered', side: winner, stackId: s.id, creatureId: s.creatureId, count: back });
    }
  }
  const survivors = (s: BattleState['stacks'][string]) => aliveCount(catalog, s) + (recovered.get(s.id) ?? 0);

  // --- Casualty lines per side (grouped by originating slot) ---
  const lines = (side: BattleSideId): BattleCasualtyLine[] =>
    Object.values(battle.stacks)
      .filter((s) => s.side === side)
      .sort((a, b) => a.sourceSlot - b.sourceSlot)
      .map((s) => ({ creatureId: s.creatureId, before: s.startingCount, after: survivors(s), ...(recovered.has(s.id) ? { recovered: recovered.get(s.id)! } : {}) }));
  const attackerLines = lines('attacker');
  const defenderLines = lines('defender');

  // --- XP: base HP of opposing creatures actually killed by hostile damage ---
  const xpFor = (side: BattleSideId) =>
    Object.values(battle.stacks)
      .filter((s) => s.side !== side)
      .reduce((n, s) => n + s.killedByEnemy * statsOf(catalog, s.creatureId).hp, 0);

  const enc = battle.encounter;
  const attackerHero = state.heroes[enc.attackerHeroId];
  const defenderHero = enc.defenderHeroId ? state.heroes[enc.defenderHeroId] : undefined;

  const siegeTown = enc.kind === 'town_siege' && enc.townId ? state.towns[enc.townId] : undefined;
  /** Write a side's survivors back to their source army (hero, or the besieged town's garrison). */
  const persistArmy = (hero: HeroState | undefined, side: BattleSideId, keepSurvivors: boolean) => {
    for (const s of Object.values(battle.stacks)) {
      if (s.side !== side) continue;
      const army = s.sourceArmy === 'garrison' ? siegeTown?.garrison : hero?.army;
      if (!army) continue;
      const slot = army.slots[s.sourceSlot];
      if (!slot) continue;
      const alive = keepSurvivors ? survivors(s) : 0;
      if (alive <= 0) army.slots[s.sourceSlot] = null;
      else slot.count = alive;
    }
  };

  const xpAwarded: BattleResultRecord['xpAwarded'] = [];
  let rewardsGranted = resources();
  const artifactIds: string[] = [];
  const entitlementIds: string[] = [];
  let heroOutcome = '';

  const winnerSide = battle.sides[winner];
  const loserSide = battle.sides[loser];
  const winnerHero = winner === 'attacker' ? attackerHero : defenderHero;
  const loserHero = winner === 'attacker' ? defenderHero : attackerHero;

  // Winner keeps survivors (dead creatures remain dead; partial front HP heals).
  persistArmy(winnerHero, winner, true);

  // Loser consequences.
  if (loserHero) {
    if (loserSide.surrendered) {
      persistArmy(loserHero, loser, true);
      loserHero.status = 'retreated';
      heroOutcome = `${loserHero.name} surrendered and withdrew with the surviving troops.`;
      tx.emit({ kind: 'HeroRetreated', heroId: loserHero.id });
    } else if (loserSide.retreated) {
      persistArmy(loserHero, loser, false);
      loserHero.status = 'retreated';
      heroOutcome = `${loserHero.name} retreated; the army was abandoned.`;
      tx.emit({ kind: 'HeroRetreated', heroId: loserHero.id });
    } else if (outcome === 'stalemate') {
      persistArmy(loserHero, loser, true);
      heroOutcome = `The battle stalled; ${loserHero.name} withdrew.`;
    } else {
      persistArmy(loserHero, loser, false);
      loserHero.status = 'defeated';
      heroOutcome = `${loserHero.name} was defeated.`;
      tx.emit({ kind: 'HeroDefeated', heroId: loserHero.id });
      // Non-quest artifacts transfer to the winning hero.
      if (winnerHero) {
        const items = [...Object.values(loserHero.equipment).filter((x) => !!x), ...loserHero.backpack];
        loserHero.equipment = {};
        loserHero.backpack = [];
        for (const item of items) {
          if (!item) continue;
          if (winnerHero.backpack.length < tx.profile.backpackCapacity) winnerHero.backpack.push(item);
          artifactIds.push(item.artifactId);
        }
      }
    }
  }

  // Site guard outcome.
  if (enc.kind === 'site_guard' && enc.siteId) {
    const site = state.world.sites[enc.siteId];
    const def = missionSite(catalog, state, enc.siteId);
    if (site && def) {
      if (winner === 'attacker') {
        site.cleared = true;
        site.guard = null;
        const reward = def.guard?.reward;
        if (reward && attackerHero) {
          const before = { ...state.players[attackerHero.ownerId]!.wallet };
          grantReward(tx, attackerHero.ownerId, attackerHero.id, reward, `guard:${def.id}`, def.guard?.label ?? def.name);
          const after = state.players[attackerHero.ownerId]!.wallet;
          rewardsGranted = resources({
            gold: after.gold - before.gold,
            wood: after.wood - before.wood,
            stone: after.stone - before.stone,
            crystal: after.crystal - before.crystal,
            favor: after.favor - before.favor,
          });
          artifactIds.push(...(reward.artifactIds ?? []));
          entitlementIds.push(...(reward.entitlementIds ?? []));
        }
      } else {
        site.guard = sideStacks(battle, 'defender').map((s) => ({ creatureId: s.creatureId, count: aliveCount(catalog, s) }));
      }
    }
  }

  // Wandering monster: its bounty goes to whoever defeats it.
  if (loserHero?.monster && loserHero.status === 'defeated' && winnerHero && winnerHero.status === 'active') {
    const bounty = resources(loserHero.monster.bounty);
    if (tx.applyOnce(`bounty:${loserHero.id}`) && Object.values(bounty).some((v) => v > 0)) {
      grant(tx, winnerHero.ownerId, bounty, `Bounty for ${loserHero.name}`);
      rewardsGranted = addResources(rewardsGranted, bounty);
    }
  }

  // Statistics (end-of-game summary): battles, kills and losses per player.
  const killedOn = (side: BattleSideId) => Object.values(battle.stacks).filter((s) => s.side === side).reduce((n, s) => n + (s.startingCount - survivors(s)), 0);
  if (outcome !== 'stalemate') {
    bumpTotal(state, winnerSide.playerId, 'battlesWon');
    bumpTotal(state, loserSide.playerId, 'battlesLost');
  }
  bumpTotal(state, battle.sides.attacker.playerId, 'creaturesKilled', killedOn('defender'));
  bumpTotal(state, battle.sides.defender.playerId, 'creaturesKilled', killedOn('attacker'));
  bumpTotal(state, battle.sides.attacker.playerId, 'creaturesLost', killedOn('attacker'));
  bumpTotal(state, battle.sides.defender.playerId, 'creaturesLost', killedOn('defender'));

  // Town siege: a captured town loses its garrison and reserves; a visiting defender is defeated above.
  if (siegeTown) {
    if (winner === 'attacker' && attackerHero && attackerHero.status === 'active') {
      siegeTown.garrison.slots = siegeTown.garrison.slots.map(() => null);
      if (defenderHero) defenderHero.army.slots = defenderHero.army.slots.map(() => null);
      siegeTown.ownerId = attackerHero.ownerId;
      const site = state.world.sites[siegeTown.siteId];
      if (site) site.owner = attackerHero.ownerId;
      tx.emit({ kind: 'TownCaptured', townId: siegeTown.id, playerId: attackerHero.ownerId });
      bumpTotal(state, attackerHero.ownerId, 'townsCaptured');
      tx.emit({ kind: 'SiteCaptured', siteId: siegeTown.siteId, playerId: attackerHero.ownerId });
      heroOutcome = `${siegeTown.name} was captured. ${heroOutcome}`.trim();
    } else if (winner === 'defender') {
      const reserves = battle.siege?.reserves.length ?? 0;
      heroOutcome = `${siegeTown.name} held.${reserves > 0 ? ` ${reserves} reserve stack${reserves === 1 ? '' : 's'} stayed safe.` : ''} ${heroOutcome}`.trim();
    }
  }

  // XP to the winning hero (capped per scenario, visibly).
  if (winnerHero && winnerHero.status === 'active') {
    const bonus = battle.sides[winner].effects?.xpPercent ?? 0;
    const amount = Math.floor((xpFor(winner) * (100 + bonus)) / 100);
    if (amount > 0) {
      const res = grantExperience(tx, winnerHero.id, amount);
      xpAwarded.push({ heroId: winnerHero.id as HeroId, amount: res.granted, capped: res.capped });
    }
  }

  // Winning attacker steps onto the contested tile.
  if (winner === 'attacker' && attackerHero && attackerHero.status === 'active') {
    attackerHero.position = enc.destination;
    arriveAt(tx, attackerHero, enc.destination);
  }

  if (!heroOutcome) {
    heroOutcome =
      winner === 'attacker'
        ? `${attackerHero?.name ?? 'The attacker'} holds the field.`
        : `${attackerHero?.name ?? 'The attacker'} was defeated.`;
  }

  const playerSide: BattleSideId | null =
    winnerSide.controller === 'human' ? winner : loserSide.controller === 'human' ? loser : null;
  const levelUps = state.pendingDecisions.filter((d) => d.kind === 'level_up').length;
  const objectivesAdvanced = def(tx, enc.siteId);

  const record: BattleResultRecord = {
    battleId: battle.battleId,
    label: enc.label,
    winner,
    outcome,
    playerSide,
    attacker: { name: battle.sides.attacker.commander?.name ?? 'Attackers', playerId: battle.sides.attacker.playerId, lines: attackerLines },
    defender: { name: battle.sides.defender.commander?.name ?? enc.label, playerId: battle.sides.defender.playerId, lines: defenderLines },
    xpAwarded,
    rewards: { resources: rewardsGranted, artifactIds, entitlementIds },
    objectivesAdvanced,
    levelUpsQueued: levelUps,
    heroOutcome,
    day: state.day,
    rounds: battle.round,
  };
  state.lastBattleResult = record;
  state.battle = null;
}

function def(tx: Tx, siteId: string | null): BattleResultRecord['objectivesAdvanced'] {
  if (!siteId) return [];
  const site = missionSite(tx.catalog, tx.state, siteId);
  return [...(site?.objectiveIds ?? [])];
}
