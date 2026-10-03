/**
 * Divine gifts (proposed 2026-10-03, owner request): a Temple grants a gift for
 * Favor — resources, recruits for the town's dwellings, experience or an
 * artifact for the hero visiting the town — so Favor keeps a use once both
 * gods are chosen. One gift per town with a Temple per world week, in
 * scenarios with divine interventions (skirmish, random maps and the later
 * campaigns; The Three Beacons keeps them off).
 *
 * As for every service: a read-only quote (screens and AI) and a commit that
 * re-runs it. The gifts themselves are data (`catalog.divineGifts`).
 */
import { heroInTown } from '../resolvers/world';
import type { ArtifactId, HeroId, PlayerId, TownId } from '../ids';
import { hexEquals } from '../core/hex';
import { canAfford, resources } from '../core/resources';
import { RngCursor, seedFromLabel } from '../core/rng';
import type { ContentCatalog } from '../definitions/catalog';
import type { DivineGiftDefinition } from '../definitions/skirmish';
import type { MatchState, TownState } from '../state/match';
import { townRoleBuilding, weeklyGrowthFor } from '../resolvers/town';
import { scopeAllowed } from '../resolvers/scenario';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { grant, spend } from './economy';
import { grantArtifact, grantExperience } from './heroes';
import { interventionsEnabled } from './interventions';
import { worldWeek } from './services';

/** The gifts on offer in this match (empty when the scenario has no divine interventions). */
export function divineGifts(catalog: ContentCatalog, state: MatchState): DivineGiftDefinition[] {
  if (!interventionsEnabled(state)) return [];
  return Object.values(catalog.divineGifts ?? {}).sort((a, b) => a.favorCost - b.favorCost || (a.id < b.id ? -1 : 1));
}

/** Does this gift go to the hero visiting the town (experience, artifact)? */
export function giftNeedsHero(def: DivineGiftDefinition): boolean {
  return def.grant.type === 'experience' || def.grant.type === 'artifact';
}

export interface DivineGiftQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly def: DivineGiftDefinition | null;
  /** Recruits each family would gain (recruit gifts). */
  readonly recruits: Readonly<Record<string, number>>;
  /** The artifact the gift would give this week (artifact gifts). */
  readonly artifactId: ArtifactId | null;
}

/** Families housed in the town (their dwelling built) that a recruit gift adds to. */
function recruitsFor(catalog: ContentCatalog, state: MatchState, town: TownState, maxTier: number, percent: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const familyId of Object.keys(town.population).sort()) {
    const tier = catalog.families[familyId]?.tier ?? 99;
    if (tier > maxTier) continue;
    out[familyId] = Math.max(1, Math.floor((weeklyGrowthFor(catalog, town, familyId, state) * percent) / 100));
  }
  return out;
}

/** The artifact a Temple's gift draws this week: a pure function of match, town and week (never a gameplay RNG stream). */
function giftArtifact(catalog: ContentCatalog, state: MatchState, town: TownState, rarity: string): ArtifactId | null {
  const pool = Object.values(catalog.artifacts)
    .filter((a) => a.rarity === rarity && !a.unique && scopeAllowed(state, a.scope))
    .map((a) => a.id)
    .sort();
  if (pool.length === 0) return null;
  const rng = new RngCursor(seedFromLabel(`gift|${state.matchId}|${town.id}|${worldWeek(state, catalog.rulesProfile.daysPerWeek)}`));
  return pool[rng.nextInt(pool.length)]!;
}

export function quoteDivineGift(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, giftId: string, heroId?: HeroId | null): DivineGiftQuote {
  const def = catalog.divineGifts?.[giftId] ?? null;
  const fail = (code: RejectionCode, reason: string): DivineGiftQuote => ({ legal: false, code, reason, def, recruits: {}, artifactId: null });
  if (!def) return fail('not_found', 'Unknown gift');
  if (!interventionsEnabled(state)) return fail('not_in_scope', 'Divine gifts are not part of this scenario');
  const town = state.towns[townId];
  const player = state.players[playerId];
  if (!town || !player) return fail('not_found', 'Unknown town');
  if (town.ownerId !== playerId) return fail('not_owner', 'You do not own this town');
  if (!townRoleBuilding(catalog, town, 'pantheon_temple')) return fail('missing_requirement', 'Requires a Temple in this town');
  if ((town.lastGiftWeek ?? 0) === worldWeek(state, catalog.rulesProfile.daysPerWeek)) return fail('already_done', 'This Temple already granted a gift this week');
  if (giftNeedsHero(def)) {
    const hero = heroId ? state.heroes[heroId] : undefined;
    if (!hero || hero.ownerId !== playerId || hero.status !== 'active') return fail('not_found', 'Choose one of your heroes');
    if (!heroInTown(catalog, state, hero, town.id)) return fail('not_present', `${hero.name} must be in ${town.name}`);
  }
  let recruits: Record<string, number> = {};
  let artifactId: ArtifactId | null = null;
  if (def.grant.type === 'recruits') {
    recruits = recruitsFor(catalog, state, town, def.grant.maxTier, def.grant.percentOfWeek);
    if (Object.keys(recruits).length === 0) return fail('missing_requirement', `Build a dwelling of tier ${def.grant.maxTier} or lower first`);
  } else if (def.grant.type === 'artifact') {
    artifactId = giftArtifact(catalog, state, town, def.grant.rarity);
    if (!artifactId) return fail('not_found', 'No artifact to give');
  }
  if (!canAfford(player.wallet, resources({ favor: def.favorCost }))) return fail('insufficient_resources', `Needs ${def.favorCost} Favor`);
  return { legal: true, code: null, reason: null, def, recruits, artifactId };
}

export function commitDivineGift(tx: Tx, townId: TownId, giftId: string, heroId: HeroId | null): void {
  const q = quoteDivineGift(tx.catalog, tx.state, tx.actorId, townId, giftId, heroId);
  if (!q.legal || !q.def) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot receive this gift');
  const def = q.def!;
  const town = tx.state.towns[townId]!;
  spend(tx, tx.actorId, resources({ favor: def.favorCost }), def.name);
  town.lastGiftWeek = worldWeek(tx.state, tx.profile.daysPerWeek);
  let xp = 0;
  let recruits = 0;
  const g = def.grant;
  if (g.type === 'resources') grant(tx, tx.actorId, resources(g.resources), def.name);
  else if (g.type === 'recruits') {
    for (const [familyId, added] of Object.entries(q.recruits)) {
      town.population[familyId] = (town.population[familyId] ?? 0) + added;
      recruits += added;
      tx.emit({ kind: 'PopulationGrown', townId, familyId, added, total: town.population[familyId]! });
    }
  } else if (g.type === 'experience') xp = grantExperience(tx, heroId!, g.amount).granted;
  else if (g.type === 'artifact') grantArtifact(tx, heroId!, q.artifactId!);
  tx.emit({ kind: 'DivineGiftReceived', playerId: tx.actorId, townId, giftId, heroId: giftNeedsHero(def) ? heroId : null, favor: def.favorCost, artifactId: q.artifactId, xp, recruits });
}
