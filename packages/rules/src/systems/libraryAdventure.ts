import { processLibrarySignals } from './librarySignals';
import type { Tx } from '../engine/tx';
import { processCourierDawn } from './libraryCourier';
import { liveCampReservation } from './world';
import { heroEffects, maxMana } from '../resolvers/heroes';

/** Observe committed actions, including spells/portals and defensive battles. No item-equip reset. */
export function processLibraryAdventureEvents(tx: Tx): void {
  if (!tx.state.scenario.features?.mythicLibraryV2) return;
  processLibrarySignals(tx);
  for (const [id, site] of Object.entries(tx.state.world.sites)) if (site.reservation && !liveCampReservation(tx.state, id)) delete site.reservation;
  for (const event of [...tx.events]) {
    if (event.kind === 'HeroMoved' || event.kind === 'HeroTeleported' || event.kind === 'HeroEmbarked' || event.kind === 'HeroDisembarked') {
      const h = tx.state.heroes[event.heroId];
      if (h) (h.libraryAdventure ??= {}).lastMovedDay = tx.state.day;
    }
    if (event.kind === 'BattleStarted' && tx.state.battle) {
      for (const side of Object.values(tx.state.battle.sides)) {
        const h = side.commander?.heroId ? tx.state.heroes[side.commander.heroId] : undefined;
        if (!h) continue;
        const a = h.libraryAdventure ??= {};
        a.lastBattleDay = tx.state.day;
        if (a.camp) a.camp.battleSinceCast = true;
      }
    }
    if (event.kind === 'SpellsLearned' && event.spellIds.length) {
      const h = tx.state.heroes[event.heroId];
      if (!h || h.libraryAdventure?.learnedManaDay === tx.state.day) continue;
      const amount = Math.max(0, ...heroEffects(tx.catalog, h, tx.state).map((e) => e.type === 'adventure_learning_mana' ? e.amount : 0));
      if (amount) { h.mana = Math.min(maxMana(tx.catalog, tx.state, h), h.mana + amount); (h.libraryAdventure ??= {}).learnedManaDay = tx.state.day; }
    }
  }
}

/** Runs after the day increments, before ordinary dawn refresh. No benefit for newly upgraded old saves without activity history. */
export function processLibraryAdventureDawn(tx: Tx): void {
  if (!tx.state.scenario.features?.mythicLibraryV2) return;
  processCourierDawn(tx);
  for (const h of Object.values(tx.state.heroes)) {
    if (h.status !== 'active') continue;
    const a = h.libraryAdventure;
    let gain = 0;
    if (a && a.lastMovedDay !== tx.state.day - 1 && a.lastBattleDay !== tx.state.day - 1) gain = Math.max(0, ...heroEffects(tx.catalog, h, tx.state).map((e) => e.type === 'adventure_rested_mana' ? e.amount : 0));
    if (a?.camp && a.camp.day < tx.state.day) {
      if (a.camp.day === tx.state.day - 1 && !a.camp.battleSinceCast) gain += a.camp.mana;
      delete a.camp;
    }
    if (gain) h.mana = Math.min(maxMana(tx.catalog, tx.state, h), h.mana + gain);
    if (a?.travelBuffs) a.travelBuffs = a.travelBuffs.filter((b) => b.day === tx.state.day);
    if (a?.reports) a.reports = a.reports.filter((r) => r.untilDay > tx.state.day);
    if (a?.anchor && a.anchor.untilDay <= tx.state.day) delete a.anchor;
    // Record a known observation day even if the hero stood still throughout it.
    h.libraryAdventure ??= {};
  }
}
