/**
 * Coastal sites and sea salvage for the strategic AI (sea-sites kit 2026-10-17): targets for the land
 * and naval planners — uncaptured coastal watchtowers (reached on foot; across the water through the
 * ordinary voyage planner), floating salvage (sailed onto, through the same `quoteTravel` voyages) and
 * the water beside an untouched shipwreck — and the commands it issues at a wreck (ExploreWreck when
 * beside it and strong enough; ClaimWreckArtifact for its waiting artifact when it fits). Every move
 * and action is the same validated command a human gives, quoted by the same rules.
 *
 * Fair information only: a wreck's stored outcome is never read. Its danger is judged by the public
 * outcome table (content's `seaSitePolicy`: the strongest raiders any wreck may hold, at strong guard
 * strength) until this empire's own heroes have fought its raiders (`wreckKnowledge.seenGuard`).
 * Deterministic: stable orders and the empire's tie hash.
 */
import {
  axialDistance,
  axialNeighbors,
  coastalTowers,
  heroShip,
  missionSite,
  navalEnabled,
  quoteMovement,
  quoteClaimWreckArtifact,
  quoteExploreWreck,
  seaPickups,
  seaSiteBlockedCells,
  seaSitePolicy,
  shipwrecks,
  terrainAt,
  wreckKnowledge,
  type CommandPayload,
  type ContentCatalog,
  type HeroState,
  type HexCoord,
  type MatchState,
  type PlayerId,
  type StackSpec,
} from '@pr/rules';
import { fightingStrength } from './evaluation';
import { heroStrength } from './threat';
import type { Target } from './strategic';

/** Guard strength the AI assumes for an unscouted wreck: the policy's strongest raiders at this percentage. */
const WRECK_PRIOR_GUARD_PERCENT = 160;
/**
 * Values (AI weights, not rules): a lookout is sight only — worth a short walk, never a voyage of its own, and less
 * again when a rival holds it (towers changing hands every day cost empires their campaigns in the headless matches);
 * salvage and a wreck are detours for a hero already at sea (about half their Gold worth; the wreck table's
 * expectation is about 900 Gold).
 */
const TOWER_VALUE = 700;
const TOWER_RIVAL_FACTOR = 0.6;
const WRECK_VALUE = 650;
const SALVAGE_SHARE = 0.55;
const RESOURCE_GOLD: Readonly<Record<string, number>> = { gold: 1, wood: 250, stone: 250 };

/** The raiders an unscouted wreck may hold at worst (public table; never the wreck's own outcome). */
export function wreckThreatPrior(catalog: ContentCatalog): number {
  let worst = 0;
  for (const row of seaSitePolicy(catalog).wreckOutcomes) {
    const army: StackSpec[] = [];
    for (const g of row.guards ?? []) {
      const c = catalog.creatures[g.creatureId];
      if (c) army.push({ creatureId: c.id, count: Math.max(1, Math.round((g.share * WRECK_PRIOR_GUARD_PERCENT) / 100 / (c.cost?.gold ?? 100))) });
    }
    if (army.length) worst = Math.max(worst, fightingStrength(catalog, army));
  }
  return worst;
}

/** The danger of a wreck as this empire knows it: the raiders its heroes saw, else the prior. */
function wreckThreat(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, siteId: string): number {
  const k = wreckKnowledge(catalog, belief, playerId, siteId);
  if (k?.seenGuard) return fightingStrength(catalog, k.seenGuard);
  return wreckThreatPrior(catalog);
}

/** Free water beside a wreck (where a ship explores it from), stable order. */
function approaches(catalog: ContentCatalog, belief: MatchState, c: HexCoord): HexCoord[] {
  const blocked = seaSiteBlockedCells(catalog, belief);
  return axialNeighbors(c).filter((n) => n.q >= 0 && n.r >= 0 && n.q < belief.world.map.width && n.r < belief.world.map.height && terrainAt(belief.world.map, n) === 'water' && !blocked.has(`${n.q},${n.r}`));
}

/** The hero can walk there (the land graph, no voyage). */
function walkable(catalog: ContentCatalog, belief: MatchState, hero: HeroState, c: HexCoord): boolean {
  return quoteMovement(catalog, belief, hero.id, c).reachable;
}

/** Targets for one hero: towers to take, salvage to sail onto, the water beside wrecks worth exploring. */
export function seaSiteTargets(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState, guardMargin: number, raid: number): Target[] {
  const out: Target[] = [];
  if (!navalEnabled(belief)) return out;
  const aboard = !!heroShip(belief, hero.id);
  // Lookouts on foot only (the land planner walks there; no voyage or ship purchase is ever made for one).
  for (const def of aboard ? [] : coastalTowers(catalog, belief)) {
    const st = belief.world.sites[def.id];
    if (!st || st.owner === playerId) continue;
    // A guarded tower is the guard planner's target (strategic.ts) until its guard falls.
    if (def.guard && !st.cleared) continue;
    if (!walkable(catalog, belief, hero, def.coord)) continue;
    out.push({ coord: def.coord, value: TOWER_VALUE * (st.owner ? TOWER_RIVAL_FACTOR * raid : 1), encounter: false, label: def.name });
  }
  // Salvage and wrecks are worth a detour to a hero already at sea, never a ship bought for them.
  if (!aboard) return out;
  for (const def of seaPickups(catalog, belief)) {
    const st = belief.world.sites[def.id];
    if (!st || st.claimed || def.kind.type !== 'sea_pickup') continue;
    out.push({ coord: def.coord, value: SALVAGE_SHARE * def.kind.amount * (RESOURCE_GOLD[def.kind.resource] ?? 1), encounter: false, label: def.name });
  }
  const mine = heroStrength(catalog, belief, hero);
  for (const def of shipwrecks(catalog, belief)) {
    const k = wreckKnowledge(catalog, belief, playerId, def.id);
    if (!k || (k.phase !== 'untouched' && !k.waitingArtifactId)) continue;
    if (k.phase === 'untouched' && mine < wreckThreat(catalog, belief, playerId, def.id) * guardMargin) continue;
    const ship = heroShip(belief, hero.id);
    // Already beside it: the action comes from seaSiteCandidates, not a move.
    if (ship && axialDistance(ship.coord, def.coord) === 1) continue;
    for (const a of approaches(catalog, belief, def.coord)) out.push({ coord: a, value: k.waitingArtifactId ? 600 : WRECK_VALUE, encounter: false, label: def.name });
  }
  return out;
}

/** Actions at a wreck for heroes aboard a ship beside it (before the heroes' moves). */
export function seaSiteCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, heroes: readonly HeroState[], guardMargin: number): CommandPayload[] {
  const out: CommandPayload[] = [];
  if (!navalEnabled(belief)) return out;
  const wrecks = shipwrecks(catalog, belief);
  if (wrecks.length === 0) return out;
  for (const hero of heroes) {
    const ship = heroShip(belief, hero.id);
    if (!ship) continue;
    for (const def of wrecks) {
      if (axialDistance(ship.coord, def.coord) !== 1) continue;
      const k = wreckKnowledge(catalog, belief, playerId, def.id);
      if (!k) continue;
      if (k.waitingArtifactId) {
        if (quoteClaimWreckArtifact(catalog, belief, hero.id, def.id).legal) out.push({ kind: 'ClaimWreckArtifact', heroId: hero.id, siteId: def.id });
        continue;
      }
      if (k.phase !== 'untouched') continue;
      if (heroStrength(catalog, belief, hero) < wreckThreat(catalog, belief, playerId, def.id) * guardMargin) continue;
      if (quoteExploreWreck(catalog, belief, hero.id, def.id).legal) out.push({ kind: 'ExploreWreck', heroId: hero.id, siteId: def.id });
    }
  }
  return out;
}

/** The wreck a hero is beside (diagnostics and tests). */
export function wreckBeside(catalog: ContentCatalog, belief: MatchState, heroId: string): string | null {
  const ship = heroShip(belief, heroId);
  if (!ship) return null;
  const def = shipwrecks(catalog, belief).find((w) => axialDistance(w.coord, ship.coord) === 1);
  return def && missionSite(catalog, belief, def.id) ? def.id : null;
}
