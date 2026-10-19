/**
 * Coastal sites and sea salvage in the interface (sea-sites kit 2026-10-17): the map's view models
 * (`AdventureSeaSiteView` for the PixiJS layer), the tile-panel lines, the wreck panel and the event
 * notices ("Enemy ship sighted near <tower>", the salvage toast). Read-only: every legality and price
 * comes from the rules' quotes (`quoteExploreWreck`, `quoteClaimWreckArtifact`, `quoteTravel`) and
 * every action is the validated command they describe. A wreck's stored outcome is never shown before
 * the viewer's own heroes have explored or fought it (`wreckKnowledge`); a tower reports what is in
 * sight like any other vision, never more.
 */
import {
  RESOURCE_LABELS,
  axialDistance,
  axialNeighbors,
  cellIndex,
  coastalTowers,
  hexEquals,
  heroShip,
  isSeaSiteKind,
  missionSite,
  navalEnabled,
  quoteClaimWreckArtifact,
  quoteExploreWreck,
  quoteTravel,
  scenarioMission,
  seaSiteBlockedCells,
  terrainAt,
  wreckKnowledge,
  type ArtifactInstanceId,
  type CommandPayload,
  type ContentCatalog,
  type GameEvent,
  type HexCoord,
  type MatchState,
  type SiteDefinition,
  type StackSpec,
} from '@pr/rules';
import type { AdventureSeaSiteView } from '@pr/presentation';
import { seaSiteArt } from '../assets/manifest';
import { resourceItems, type RewardReceipt } from './rewards';

/** The sprite of a sea site (its skin or resource; presentation only). */
export function seaSiteAssetId(def: SiteDefinition): string | null {
  const k = def.kind;
  if (k.type === 'coastal_watchtower') return `seaSites.coastal.watchtower.${k.skin}`;
  if (k.type === 'sea_pickup') return `seaSites.sea.pickup.${k.resource}`;
  if (k.type === 'shipwreck') return k.skin === 'split_hull' ? 'seaSites.shipwreck.split.hull' : 'seaSites.shipwreck.broken.mast';
  return null;
}

/** The viewer knows where the site is (explored, or revealed by the story). */
function known(state: MatchState, viewerId: string, def: SiteDefinition): boolean {
  return state.fog[viewerId]?.explored[cellIndex(state.world.map, def.coord)] === 1 || state.mission.revealedSiteIds.includes(def.id);
}

/** The sea sites the map draws for the viewer (owner flags in the owner's colour; salvage taken and wrecks cleared as they are). */
export function seaSiteViews(catalog: ContentCatalog, state: MatchState, viewerId: string): AdventureSeaSiteView[] {
  const mission = scenarioMission(catalog, state);
  const out: AdventureSeaSiteView[] = [];
  for (const def of mission?.sites ?? []) {
    if (!isSeaSiteKind(def.kind.type)) continue;
    const st = state.world.sites[def.id];
    const assetId = seaSiteAssetId(def);
    if (!st || !assetId) continue;
    const kind = def.kind.type === 'coastal_watchtower' ? 'tower' : def.kind.type === 'sea_pickup' ? 'pickup' : 'wreck';
    const w = def.kind.type === 'shipwreck' ? wreckKnowledge(catalog, state, viewerId, def.id) : null;
    const owner = kind === 'tower' ? st.owner : null;
    out.push({
      id: def.id,
      coord: def.coord,
      kind,
      assetId,
      art: seaSiteArt(assetId),
      shown: known(state, viewerId, def),
      ownerColor: owner ? (state.players[owner]?.color ?? null) : null,
      ownerShape: owner === viewerId ? 'square' : 'pennant',
      claimed: kind === 'pickup' && st.claimed,
      cleared: !!w && (w.phase === 'cleared' || w.phase === 'pendingReward'),
      waiting: !!w?.waitingArtifactId,
    });
  }
  return out;
}

/** A known shipwreck on a tile (the panel opens for it), or null. */
export function wreckAt(catalog: ContentCatalog, state: MatchState, viewerId: string, c: HexCoord): string | null {
  const mission = scenarioMission(catalog, state);
  const def = mission?.sites.find((s) => s.kind.type === 'shipwreck' && hexEquals(s.coord, c));
  return def && known(state, viewerId, def) ? def.id : null;
}

const amountText = (resource: string, amount: number) => `${amount.toLocaleString('en-US')} ${RESOURCE_LABELS[resource as 'gold'] ?? resource}`;

/** Army lines in words ("14 Brigands, 4 Brigand Cutthroats"). */
export function armyWords(catalog: ContentCatalog, army: readonly StackSpec[]): string {
  return army.map((s) => `${s.count} ${s.count === 1 ? (catalog.creatures[s.creatureId]?.name ?? s.creatureId) : (catalog.creatures[s.creatureId]?.pluralName ?? s.creatureId)}`).join(', ');
}

/** Tile-panel lines of a sea site for the viewer (null: not a sea site). */
export function seaSiteTileLines(catalog: ContentCatalog, state: MatchState, viewerId: string, siteId: string, heroId: string | null): { state: string; lines: string[]; warn: string | null } | null {
  const def = missionSite(catalog, state, siteId);
  const st = state.world.sites[siteId];
  if (!def || !st || !isSeaSiteKind(def.kind.type)) return null;
  const k = def.kind;
  const hero = heroId ? state.heroes[heroId] : undefined;
  if (k.type === 'coastal_watchtower') {
    const owner = st.owner ? state.players[st.owner] : undefined;
    const lines = [`Whoever holds it sees ${k.radius} hexes around — ships in the lanes included — and is warned when an enemy ship comes into its sight.`];
    let warn: string | null = null;
    if (st.owner !== viewerId) {
      if (def.guard && !st.cleared) warn = 'Guards hold the tower.';
      if (hero && heroShip(state, hero.id)) lines.push(`${hero.name} must go ashore first: the tower is taken on foot.`);
      else lines.push('A hero on foot who walks in takes it.');
    } else lines.push('Your lookout: its sight is yours while you hold it.');
    return { state: owner ? (owner.id === viewerId ? 'Held by you' : `Held by ${owner.name}`) : 'Neutral — nobody holds it', lines, warn };
  }
  if (k.type === 'sea_pickup') {
    if (st.claimed) return { state: 'Taken', lines: ['Somebody has already salvaged it.'], warn: null };
    const lines = [`${amountText(k.resource, k.amount)} for the first ship that sails onto it.`];
    if (hero && !heroShip(state, hero.id)) lines.push(`${hero.name} needs a ship: salvage is taken from the water.`);
    return { state: 'Adrift', lines, warn: null };
  }
  if (k.type !== 'shipwreck') return null;
  const w = wreckKnowledge(catalog, state, viewerId, siteId);
  if (!w) return null;
  const lines: string[] = [];
  let warn: string | null = null;
  if (w.phase === 'cleared') lines.push(w.found ? `You salvaged it (${outcomeWords(w.found)}). Nothing is left aboard.` : 'Explored: nothing is left aboard.');
  else if (w.phase === 'pendingReward') lines.push(w.waitingArtifactId ? `Its artifact waits for you: ${catalog.artifacts[w.waitingArtifactId]?.name ?? 'an artifact'}.` : 'Explored by another empire.');
  else if (w.phase === 'encounterPending') lines.push('A fight is under way at the wreck.');
  else {
    lines.push(`A hero aboard a ship beside it may explore it (${k.exploreCost} movement).`);
    if (w.seenGuard) warn = `Raiders seen aboard: ${armyWords(catalog, w.seenGuard)}.`;
    else lines.push('Danger unknown: raiders may be moored alongside. Salvage unknown until explored.');
  }
  return { state: w.phase === 'untouched' ? 'Unexplored' : w.phase === 'cleared' ? 'Cleared' : w.phase === 'pendingReward' ? 'Cleared — treasure waiting' : 'Fight under way', lines, warn };
}

function outcomeWords(kind: string): string {
  return kind === 'abandoned_cargo' ? 'abandoned cargo' : kind === 'guarded_salvage' ? 'guarded salvage' : 'a rare cache';
}

// ---------------------------------------------------------------------------
// The wreck panel
// ---------------------------------------------------------------------------

export interface WreckPanelView {
  readonly siteId: string;
  readonly name: string;
  readonly stateLabel: string;
  /** What the viewer may know of the danger, in words. */
  readonly danger: string;
  /** What the viewer may know of the reward, in words. */
  readonly reward: string;
  /** Explore: the quote's verdict (null when the selected hero cannot even try: no hero, not aboard). */
  readonly explore: { readonly legal: boolean; readonly reason: string | null; readonly cost: number; readonly command: CommandPayload | null };
  /** "Sail beside it": the nearest free approach the selected hero can reach (null: none or already beside). */
  readonly approach: HexCoord | null;
  /** The artifact waiting for the viewer, with the swap options when the packs are full. */
  readonly claim: {
    readonly artifactName: string;
    readonly fits: boolean;
    readonly legal: boolean;
    readonly reason: string | null;
    readonly command: CommandPayload | null;
    readonly swaps: readonly { readonly instanceId: string; readonly name: string; readonly command: CommandPayload }[];
  } | null;
}

/** The wreck panel's view for the viewer and the selected hero. */
export function wreckPanelView(catalog: ContentCatalog, state: MatchState, viewerId: string, siteId: string, heroId: string | null): WreckPanelView | null {
  const def = missionSite(catalog, state, siteId);
  if (!def || def.kind.type !== 'shipwreck') return null;
  const w = wreckKnowledge(catalog, state, viewerId, siteId);
  if (!w) return null;
  const hero = heroId ? state.heroes[heroId] : undefined;
  const mine = !!hero && hero.ownerId === viewerId && hero.status === 'active';
  const q = mine ? quoteExploreWreck(catalog, state, hero!.id, siteId) : null;
  const danger =
    w.phase === 'cleared' || w.phase === 'pendingReward'
      ? 'None: the wreck is cleared.'
      : w.seenGuard
        ? `Raiders seen aboard: ${armyWords(catalog, w.seenGuard)} — a battle on two decks if you explore.`
        : 'Unknown. Raiders may be moored alongside: exploring may mean a battle on two decks.';
  const reward =
    w.phase === 'cleared'
      ? w.found
        ? `Taken: ${outcomeWords(w.found)}.`
        : 'Nothing is left aboard.'
      : w.phase === 'pendingReward'
        ? w.waitingArtifactId
          ? `Its artifact still waits for you: ${catalog.artifacts[w.waitingArtifactId]?.name ?? 'an artifact'}.`
          : 'Another empire cleared it.'
        : 'Unknown until explored — cargo, or a richer haul guarded by raiders.';
  let approach: HexCoord | null = null;
  if (mine && hero && w.phase === 'untouched') {
    const ship = heroShip(state, hero.id);
    if (!ship || axialDistance(ship.coord, def.coord) !== 1) {
      const blocked = seaSiteBlockedCells(catalog, state);
      const options = axialNeighbors(def.coord).filter((n) => n.q >= 0 && n.r >= 0 && n.q < state.world.map.width && n.r < state.world.map.height && terrainAt(state.world.map, n) === 'water' && !blocked.has(`${n.q},${n.r}`));
      let best: { c: HexCoord; cost: number } | null = null;
      for (const c of options) {
        const tq = quoteTravel(catalog, state, hero.id, c);
        if (!tq.reachable) continue;
        const cost = tq.voyage?.totalCost ?? tq.totalCost;
        if (!best || cost < best.cost) best = { c, cost };
      }
      approach = best?.c ?? null;
    }
  }
  let claim: WreckPanelView['claim'] = null;
  if (w.waitingArtifactId && mine && hero) {
    const cq = quoteClaimWreckArtifact(catalog, state, hero.id, siteId);
    const swaps = cq.fits
      ? []
      : hero.backpack.map((a) => ({
          instanceId: a.instanceId,
          name: catalog.artifacts[a.artifactId]?.name ?? a.artifactId,
          command: { kind: 'ClaimWreckArtifact', heroId: hero.id, siteId, leaveInstanceId: a.instanceId as ArtifactInstanceId } as CommandPayload,
        }));
    claim = {
      artifactName: catalog.artifacts[w.waitingArtifactId]?.name ?? 'an artifact',
      fits: cq.fits,
      legal: cq.legal,
      reason: cq.legal ? null : cq.reason,
      command: cq.legal ? { kind: 'ClaimWreckArtifact', heroId: hero.id, siteId } : null,
      swaps: cq.code === 'not_present' || cq.code === 'illegal_action' ? [] : swaps,
    };
  }
  return {
    siteId,
    name: def.name,
    stateLabel: w.phase === 'untouched' ? 'Unexplored' : w.phase === 'cleared' ? 'Cleared' : w.phase === 'pendingReward' ? 'Cleared — treasure waiting' : 'Fight under way',
    danger,
    reward,
    explore: {
      legal: !!q?.legal,
      reason: q ? (q.legal ? null : q.reason) : 'Select one of your heroes aboard a ship',
      cost: def.kind.exploreCost,
      command: q?.legal ? { kind: 'ExploreWreck', heroId: hero!.id, siteId } : null,
    },
    approach,
    claim,
  };
}

// ---------------------------------------------------------------------------
// Notices from committed events
// ---------------------------------------------------------------------------

/** "Enemy ship sighted near <tower>" lines for the viewer (several ships in one batch coalesced). */
export function towerAlertTexts(catalog: ContentCatalog, state: MatchState, events: readonly GameEvent[], viewerId: string): string[] {
  const byTower = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== 'ShipSightedNearTower' || e.playerId !== viewerId) continue;
    const name = missionSite(catalog, state, e.siteId)?.name ?? 'your lookout';
    byTower.set(name, (byTower.get(name) ?? 0) + 1);
  }
  return [...byTower.entries()].map(([name, n]) => (n === 1 ? `Enemy ship sighted near ${name}` : `${n} enemy ships sighted near ${name}`));
}

/** The salvage toast (the existing resource receipt) for a pickup the viewer's hero took. */
export function salvageReceipts(catalog: ContentCatalog, state: MatchState, events: readonly GameEvent[], viewerId: string): RewardReceipt[] {
  const out: RewardReceipt[] = [];
  for (const e of events) {
    if (e.kind !== 'PickupCollected' || state.heroes[e.heroId]?.ownerId !== viewerId) continue;
    const def = missionSite(catalog, state, e.siteId);
    if (!def || def.kind.type !== 'sea_pickup') continue;
    out.push({
      id: `salvage:${'eventId' in e ? String((e as { eventId: string }).eventId) : def.id}`,
      title: `${def.name}: +${amountText(def.kind.resource, def.kind.amount)}`,
      source: 'Floating salvage',
      items: resourceItems({ [def.kind.resource]: def.kind.amount }),
      costs: null,
      notes: [],
      major: false,
    });
  }
  return out;
}

/** The viewer's coastal watchtowers (the journal and tests). */
export function myTowers(catalog: ContentCatalog, state: MatchState, viewerId: string): SiteDefinition[] {
  if (!navalEnabled(state)) return [];
  return coastalTowers(catalog, state).filter((t) => state.world.sites[t.id]?.owner === viewerId);
}

/**
 * The store's step for every committed batch: the viewing seat's tower alerts and salvage toasts (the
 * turn summary keeps the alerts raised during the rivals' turns: rivalSummary.ts). Read from the
 * committed events only, never from a save, so a reload raises nothing again. Shown once the batch's
 * movement has played (the hero reaches the lookout, the ship the salvage), not while it still walks.
 */
export function announceSeaSiteEvents(
  store: {
    readonly catalog: ContentCatalog;
    readonly session: { readonly state: MatchState; readonly humanPlayerId: string } | null;
    toast(text: string, tone?: 'info' | 'success' | 'error', opts?: { receipt?: RewardReceipt }): void;
    whenIdle(): Promise<void>;
  },
  events: readonly GameEvent[],
): void {
  const session = store.session;
  if (!session || !events.some((e) => e.kind === 'ShipSightedNearTower' || e.kind === 'PickupCollected')) return;
  const me = session.humanPlayerId;
  if (session.state.players[me]?.controller !== 'human') return;
  const alerts = towerAlertTexts(store.catalog, session.state, events, me);
  const receipts = salvageReceipts(store.catalog, session.state, events, me);
  if (alerts.length === 0 && receipts.length === 0) return;
  void store.whenIdle().then(() => {
    if (store.session !== session) return;
    for (const r of receipts) store.toast(r.title, 'success', { receipt: r });
    for (const t of alerts) store.toast(t, 'info');
  });
}
