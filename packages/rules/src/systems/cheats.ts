import type { Tx } from '../engine/tx';
import { reject } from '../engine/tx';
import { resources } from '../core/resources';
import { grant } from './economy';
import { refreshTownShops } from './services';
import { maxMana } from '../resolvers/heroes';
import { weeklyGrowthFor } from '../resolvers/town';

export type CheatEffect = 'resources' | 'movement' | 'buildings' | 'creatures' | 'explore' | 'mana' | 'upgrades'
  | 'gold' | 'wood' | 'stone' | 'crystal' | 'favor' | 'attack' | 'defense' | 'power' | 'knowledge' | 'reinforcements' | 'population';

/** Typed commands keep these deliberate rule bypasses deterministic and saveable. */
export function commitCheat(tx: Tx, effect: CheatEffect): void {
  const player = tx.state.players[tx.actorId];
  if (!player || player.controller !== 'human') reject('not_owner', 'Only a human player can invoke this');
  const heroes = Object.values(tx.state.heroes).filter(h => h.ownerId === tx.actorId && h.status === 'active');
  const towns = Object.values(tx.state.towns).filter(t => t.ownerId === tx.actorId);
  switch (effect) {
    case 'gold': grant(tx, tx.actorId, resources({gold: 50000}), 'Midas touch'); break;
    case 'wood': grant(tx, tx.actorId, resources({wood: 250}), 'Forest bounty'); break;
    case 'stone': grant(tx, tx.actorId, resources({stone: 250}), 'Mountain gift'); break;
    case 'crystal': grant(tx, tx.actorId, resources({crystal: 100}), 'Starlight'); break;
    case 'favor': grant(tx, tx.actorId, resources({favor: 100}), 'Divine audience'); break;
    case 'attack': case 'defense': case 'power': case 'knowledge':
      for (const h of heroes) h.attributes[effect] += 5;
      break;
    case 'reinforcements':
      for (const army of [...heroes.map(h => h.army), ...towns.map(t => t.garrison)])
        for (const stack of army.slots) if (stack) stack.count += 25;
      break;
    case 'population':
      for (const town of towns) for (const familyId of Object.keys(town.population))
        town.population[familyId] = (town.population[familyId] ?? 0) + 25;
      break;
    case 'resources': grant(tx, tx.actorId, resources({ gold: 10000, wood: 50, stone: 50, crystal: 25, favor: 25 }), 'Divine blessing'); break;
    case 'movement': for (const h of heroes) h.movementPoints = 10000; break;
    case 'mana': for (const h of heroes) h.mana = maxMana(tx.catalog, tx.state, h); break;
    case 'explore': tx.state.fog[tx.actorId]!.explored.fill(1); break;
    case 'buildings':
      for (const town of towns) {
        for (const slot of tx.catalog.townArchetypes[town.archetypeId]!.slots) {
          const def = tx.catalog.buildings[slot.chain[slot.chain.length - 1]!]!;
          if ((town.buildings[slot.id] ?? 0) < def.level) {
            town.buildings[slot.id] = def.level;
            tx.emit({ kind: 'BuildingConstructed', townId: town.id, buildingId: def.id, level: def.level });
          }
          if (def.dwelling && town.population[def.dwelling.familyId] === undefined) {
            const family = tx.catalog.families[def.dwelling.familyId]!;
            town.population[family.id] = family.baseGrowth;
            tx.applyOnce(`dwelling_grant:${town.id}:${family.id}`);
          }
        }
        town.warDamaged = false;
        refreshTownShops(tx, town);
      }
      break;
    case 'creatures':
      for (const town of towns) {
        const families = Object.values(tx.catalog.families).filter(f => f.pantheonId === town.pantheonId).sort((a,b) => a.tier-b.tier).slice(0,7);
        const old = town.garrison.slots;
        town.garrison.slots = Array.from({ length: tx.profile.armySlots }, (_, i) => {
          const family = families[i];
          if (!family) return null;
          const upgraded = family.upgradedDwellingBuildingId ? tx.catalog.buildings[family.upgradedDwellingBuildingId] : undefined;
          const creatureId = upgraded && (town.buildings[upgraded.slotId] ?? 0) >= upgraded.level ? family.upgradedCreatureId! : family.baseCreatureId;
          const count = old.reduce((n, s) => n + (s?.creatureId === creatureId ? s.count : 0), 0) + weeklyGrowthFor(tx.catalog, town, family.id, tx.state);
          return { stackId: tx.nextId('stack'), creatureId, count };
        });
      }
      break;
    case 'upgrades':
      for (const army of [...heroes.map(h => h.army), ...towns.map(t => t.garrison)]) for (const s of army.slots) {
        const family = s ? tx.catalog.families[tx.catalog.creatures[s.creatureId]!.familyId] : undefined;
        if (s && family?.upgradedCreatureId) s.creatureId = family.upgradedCreatureId;
      }
      break;
    default: reject('illegal_action', 'Unknown invocation');
  }
  tx.emit({ kind: 'CheatApplied', playerId: tx.actorId, effect });
}

