import type { ContentCatalog } from '../definitions/catalog';
import type { MatchState } from '../state/match';
import { heroEffects } from '../resolvers/heroes';
import { heroInTown } from '../resolvers/world';
import { recruitableCreatureIds } from '../resolvers/town';
import { reject, type Tx } from '../engine/tx';

function tierOneFamily(catalog: ContentCatalog, state: MatchState, townId: string): string | null {
  const town = state.towns[townId];
  return town ? recruitableCreatureIds(catalog, town).map((id) => catalog.creatures[id]!).find((c) => c.tier === 1)?.familyId ?? null : null;
}
export function seedTownOptions(catalog: ContentCatalog, state: MatchState, heroId: string) {
  const hero = state.heroes[heroId];
  if (!hero || hero.status !== 'active' || !heroEffects(catalog, hero, state).some((e) => e.type === 'adventure_seed_growth')) return [];
  const week = Math.floor((state.day - 1) / catalog.rulesProfile.daysPerWeek) + 1;
  return Object.values(state.towns).filter((t) => t.ownerId === hero.ownerId && !!tierOneFamily(catalog, state, t.id) && (hero.libraryAdventure?.townVisitWeeks?.[t.id] === week || heroInTown(catalog, state, hero, t.id)));
}
export function commitSelectSeedTown(tx: Tx, heroId: string, townId: string): void {
  const h = tx.state.heroes[heroId];
  if (!h || h.ownerId !== tx.actorId || !seedTownOptions(tx.catalog, tx.state, heroId).some((t) => t.id === townId)) reject('illegal_target', 'Equip the Seed Ring and select an owned town visited this week with its tier-one dwelling');
  const week = Math.floor((tx.state.day - 1) / tx.profile.daysPerWeek) + 1;
  if (heroInTown(tx.catalog, tx.state, h, townId)) ((h.libraryAdventure ??= {}).townVisitWeeks ??= {})[townId] = week;
  (tx.state.players[tx.actorId]!.libraryEconomy ??= {}).seedTown = { heroId, townId };
}
export function processSeedGrowth(tx: Tx, week: number): void {
  if (!tx.state.scenario.features?.mythicLibraryV2) return;
  for (const player of Object.values(tx.state.players).sort((a, b) => a.id.localeCompare(b.id))) {
    const economy = player.libraryEconomy, chosen = economy?.seedTown;
    if (player.eliminated || !chosen || economy?.seedPaidWeek === week) continue;
    const h = tx.state.heroes[chosen.heroId], town = tx.state.towns[chosen.townId];
    if (!h || h.status !== 'active' || h.ownerId !== player.id || town?.ownerId !== player.id || h.libraryAdventure?.townVisitWeeks?.[town.id] !== week - 1) continue;
    const familyId = tierOneFamily(tx.catalog, tx.state, town.id);
    const amount = Math.max(0, ...heroEffects(tx.catalog, h, tx.state).map((e) => e.type === 'adventure_seed_growth' ? e.amount : 0));
    if (!familyId || !amount) continue;
    economy!.seedPaidWeek = week;
    town.population[familyId] = (town.population[familyId] ?? 0) + amount;
    tx.emit({ kind: 'PopulationGrown', townId: town.id, familyId, added: amount, total: town.population[familyId]! });
  }
}
