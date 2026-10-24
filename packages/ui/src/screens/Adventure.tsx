import { landmarkVisit } from '@pr/rules';
import { CourierDialog } from '../components/libraryAdventure';
/**
 * S06 Adventure Map. The 2D map view shows committed world state; every
 * movement, path and legality question is answered by the rules (quoteMovement,
 * reachableTiles, tileRole) and every change is a command.
 *
 * Click a tile once to preview the path, again to move. Encounters open the
 * pre-battle dialog. Right-click pins tile information.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  allied,
  visibleLibrarySignals,
  cellIndex,
  hexEquals,
  missionSite,
  parseHexKey,
  reachableTiles,
  siteAt,
  visibleCells,
  movementBudget,
  maxMana,
  missionObjectiveDefs,
  objectiveDoneEarly,
  adventureSpellsOf,
  quoteAdventureSpell,
  campStock,
  interventionsFor,
  interventionUsedThisWeek,
  quoteNeutralReaction,
  townDedicationView,
  questHutProgress,
  worldWeek,
  KEY_COLOR_HEX,
  KEY_COLOR_LABEL,
  type ContentCatalog,
  type GameEvent,
  type HeroState,
  type HexCoord,
  type MatchState,
  type SiteDefinition,
  type SiteState,
  scenarioMission,
  heroInTown,
  isTownTile,
  isSeaSiteKind,
  axialDistance,
  caravansAt,
  caravansOnMap,
  heroShip,
  landingCells,
  quoteTravel,
  type MovementQuote,
  type VoyageTransition,
} from '@pr/rules';
import { journeyReasonText, navalOn, shipViews, takeNavalPlayback, transitionPrompt, travelReach, travelRoute, visibleShipAt, type PendingNavalPlayback, type ShipAction } from '../app/naval';
import { ShipInspectPanel, ShipSidebar, ShipTileLines } from '../components/naval';
import { SeaSiteTileLines, WreckPanel } from '../components/seaSites';
import { SeaEncounterCards } from '../components/seaCreatures';
import { seaSiteViews, wreckAt } from '../app/seaSites';
import { expeditionArt } from '../assets/manifest';
import { biomeTerrainCss, miracleLook, siteSpriteCandidates, spellLook } from '@pr/presentation/core';
import type { AdventureSceneController, AdventureView } from '@pr/presentation';
import { RANDOM_TEMPLATE_ID, type JourneyIntent } from '@pr/session';
import { useStore } from '../app/context';
import { adventureCursor } from '../app/cursorContext';
import { cursorCss } from '../assets/cursors';
import { newWeekBannerArt } from '../assets/momentArt';
import { weeklyEventOf } from '../app/moments';
import type { AppStore } from '../app/store';
import { adventurePlaybackFactor, reducedMotion } from '../app/preferences';
import { Burst } from '../components/burst';
import { keyFor, keyLabel, matches } from '../app/keys';
import { routeChanged, routeSignature } from '../app/journeyRoute';
import { SceneViewport, inspectors, projectors, toPage, type SceneFactory } from '../scene/SceneHost';
import { Button, Chip, Bar, Panel } from '../components/kit';
import { HeroPortrait, MarkerIcon, siteMarkerAsset, siteMarkerTint } from '../components/art';
import { ArmyPreview, ArmyStrip, ResourceBar } from '../components/game';
import { Icon } from '../assets/icons';
import { resolveAsset } from '../assets/manifest';
import { GENERIC_QUEST_MARKER, portalBlockedText, questMarkerIcon, questMarkerSites, siteStatus, sluiceOperatedText } from '../app/siteInfo';
import { preloadReadingSkins } from '../assets/guiArt';
import { DeadlineTracker } from '../components/missionLedger';
import {
  dailyIncome,
  dayLabel,
  humanPlayer,
  playerHeroes,
  siteArchetype,
  siteKindLabel,
  terrainLabel,
  townAtHero,
} from '../app/view';
import { dedicationsOn, godName } from '../app/dedication';
import { CityBlessingsSection } from '../components/dedication';
import { currentIntelView, intelOn, lastKnownAt, lastKnownMarkers, lastKnownView } from '../app/intel';
import { ArmyIntelPanel } from '../components/armyIntel';
import { CaravanSidebar, CaravanTileLines } from '../components/caravans';

// ---------------------------------------------------------------------------
// View model
// ---------------------------------------------------------------------------

/** The creature that represents a wandering monster band (highest tier). */
function monsterLead(catalog: ContentCatalog, hero: HeroState) {
  let best: ReturnType<typeof getCreature> = undefined;
  for (const slot of hero.army.slots) {
    const c = slot ? getCreature(catalog, slot.creatureId) : undefined;
    if (c && (!best || c.tier > best.tier)) best = c;
  }
  return best;
}

function getCreature(catalog: ContentCatalog, id: string) {
  return catalog.creatures[id];
}

/** Whether a site's glow (flame/rune/lantern) is on for the viewer. */
function siteLit(catalog: ContentCatalog, state: MatchState, def: SiteDefinition, st: SiteState | undefined): boolean {
  switch (def.kind.type) {
    case 'map_event':
    case 'quest_hut':
    case 'prison':
    case 'treasure_chest':
      return !st?.claimed;
    case 'windmill':
      return (st?.lastCollectedWeek ?? 0) < worldWeek(state, catalog.rulesProfile.daysPerWeek);
    case 'relic':
    case 'portal':
    case 'learning_stone':
    case 'spell_shrine':
    case 'key_tent':
      return true;
    default:
      return !!st?.activated;
  }
}

/** Sprite variant of a map location: a town's pantheon, a pickup's main reward. */
function siteVariant(catalog: ContentCatalog, state: MatchState, def: SiteDefinition): string | null {
  const k = def.kind;
  if (k.type === 'town') return state.towns[k.townId]?.pantheonId ?? null;
  if (k.type === 'pickup') {
    if (k.reward.artifactIds?.length) return 'artifact';
    let best: string | null = null;
    let most = 0;
    for (const [res, n] of Object.entries(k.reward.resources ?? {})) if ((n ?? 0) > most) [best, most] = [res, n ?? 0];
    return best;
  }
  return null;
}

function buildView(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: string,
  selected: HeroState | null,
  journey: JourneyIntent | null,
  showReach: boolean,
  grid: AdventureView['grid'],
  auras: readonly { matchId: string; heroId: string; id: string; untilDay: number }[] = [],
  calm = false,
  landingPick = false,
): AdventureView {
  const explored = state.fog[playerId]?.explored ?? [];
  const visible = visibleCells(catalog, state, playerId);
  const map = state.world.map;
  const naval = navalOn(state);
  const mission = scenarioMission(catalog, state);
  // Quest markers over the sites of open objectives (the journal's state): a campaign objective's own icon, else the generic one.
  const quests = questMarkerSites(catalog, state, playerId);
  const sites = (mission?.sites ?? []).map((def) => {
    const st = state.world.sites[def.id];
    const quest = quests.get(def.id);
    const idx = cellIndex(map, def.coord);
    // Sea sites (lookouts, salvage, wrecks) are drawn by their own layer (`seaSites` below), never as a generic site.
    const shown = (explored[idx] === 1 || state.mission.revealedSiteIds.includes(def.id)) && !isSeaSiteKind(def.kind.type);
    let owner = st?.owner ?? null;
    if (def.kind.type === 'town') owner = state.towns[def.kind.townId]?.ownerId ?? null;
    const guardArmy = st?.guard ?? def.guard?.army ?? [];
    const guardCreature = def.guard && st && !st.cleared ? catalog.creatures[guardArmy[0]?.creatureId ?? ''] : undefined;
    return {
      id: def.id,
      coord: def.coord,
      archetype: siteArchetype(def),
      variant: siteVariant(catalog, state, def),
      name: def.name,
      shown,
      ownerColor: owner ? (state.players[owner]?.color ?? null) : null,
      ownerShape: owner === playerId ? ('square' as const) : ('pennant' as const),
      guard: guardCreature?.id ?? null,
      // Event shrines glow until used; a relic and a portal always glow.
      lit: siteLit(catalog, state, def, st) && !(def.kind.type === 'map_event' && def.kind.landmark && selected && landmarkVisit(catalog, state, selected.id, def.id)),
      // Key gates show their barrier only to empires without the key.
      open: def.kind.type === 'key_gate' ? (state.players[playerId]?.keys ?? []).includes(def.kind.color) : !!st?.open,
      claimed: !!st?.claimed,
      // The site's own picture first (its art, a sluice's state, a ferry landing, a neutral hiring site), from data only.
      sprites: siteSpriteCandidates(
        { ...def, art: def.artStates?.find((a) => state.mission.flags[a.flag])?.art ?? def.art },
        st,
        def.kind.type === 'town' ? state.towns[def.kind.townId] : undefined,
      ),
      // A campaign icon not delivered falls back to the generic quest marker (the ID names the picture drawn).
      quest: quest ? ((id) => ({ id, url: resolveAsset(id).url }))(resolveAsset(quest.id).url ? quest.id : GENERIC_QUEST_MARKER) : null,
      ...(def.kind.type === 'key_gate' || def.kind.type === 'key_tent' || def.kind.type === 'skill_trainer' ? { tint: def.kind.type === 'skill_trainer' ? '#b5423a' : KEY_COLOR_HEX[def.kind.color] } : {}),
    };
  });
  const heroes = Object.values(state.heroes)
    .filter((h) => h.status === 'active')
    .map((h) => {
      // Wandering monsters are drawn as the strongest creature of their band.
      const lead = h.monster ? monsterLead(catalog, h) : undefined;
      return {
        id: h.id,
        coord: h.position,
        color: state.players[h.ownerId]?.color ?? '#999',
        shown: h.ownerId === playerId || visible.has(cellIndex(map, h.position)),
        selected: selected?.id === h.id,
        // Heroes visit a town from its gate tile (2026-10-03), so no offset off the town sprite.
        inTown: false,
        monster: lead?.id ?? null,
        // The mounted map avatar follows the hero's own pantheon (else its owner's).
        pantheonId: catalog.heroes[h.definitionId]?.pantheonId ?? state.players[h.ownerId]?.pantheonId ?? null,
        // A spell lasting the day (Fleet Foot, Wings of Hermes) loops its aura on the viewer's own hero.
        aura: h.ownerId === playerId ? (auras.find((a) => a.heroId === h.id && a.matchId === state.matchId && state.day < a.untilDay)?.id ?? null) : null,
        // Hero ships: aboard, the mounted avatar is hidden (the ship flies the hero's flag).
        embarked: naval && !!heroShip(state, h.id),
      };
    });
  let reachable: HexCoord[] | null = null;
  if (selected && showReach) reachable = naval ? travelReach(catalog, state, selected.id) : [...reachableTiles(catalog, state, selected.id).keys()].map(parseHexKey);
  let path: AdventureView['path'] = null;
  let transitions: { coord: HexCoord; kind: 'embark' | 'disembark' }[] = [];
  let ring: HexCoord | null = null;
  if (selected && journey) {
    // The planned journey, quoted again from where the hero stands now (the destination is the plan; the tiles are not).
    // `quoteTravel` is what MoveHero commits: a destination over the water is a voyage with embark / disembark steps.
    const route = travelRoute(catalog, state, selected.id, journey.target);
    path = route.path;
    transitions = [...route.transitions];
    if (route.naval && naval && heroShip(state, selected.id) && route.path && !route.path.blocked) ring = route.path.destination ?? null;
  }
  return {
    map,
    explored,
    visible,
    fogKey: `${state.revision}|${playerId}`,
    sites,
    heroes,
    reachable,
    reachKey: `${state.revision}|${selected?.id ?? ''}|${showReach}`,
    path,
    grid,
    calm,
    // Scouting intel: where enemy armies were last seen outside today's vision (their banner colour; no army data).
    signals: visibleLibrarySignals(catalog, state, playerId),
    lastKnown: intelOn(catalog, state) ? lastKnownMarkers(catalog, state, playerId, visible) : [],
    // Recruitment caravans: own wagons always; another player's only while its tile is in sight (no route, no destination).
    caravans: caravansOnMap(state)
      .filter((k) => k.ownerId === playerId || visible.has(cellIndex(map, k.coord)))
      .map((k) => ({
        id: k.id,
        coord: k.coord,
        color: state.players[k.ownerId]?.color ?? '#999',
        shown: true,
        toward: k.ownerId === playerId ? (k.route[0] ?? null) : null,
        sharesTile: heroes.some((h) => h.shown && hexEquals(h.coord, k.coord)),
        held: k.ownerId === playerId && (k.status === 'blocked' || k.status === 'awaiting_garrison'),
      })),
    // Hero ships (navalMovementV1): own ships always, another's only while in sight (as heroes).
    ...(naval
      ? {
          ships: shipViews(state, playerId, selected?.id ?? null, visible),
          shipMarks: { landing: landingPick && selected && heroShip(state, selected.id) ? landingCells(catalog, state, selected.id) : [], ring, transitions },
          shipOverlays: { wake: expeditionArt('expedition.overlay.wake')?.url ?? null, ring: expeditionArt('expedition.overlay.destination-ring')?.url ?? null },
        }
      : {}),
    // Coastal watchtowers, floating salvage and shipwrecks (sea-sites kit; app/seaSites.ts).
    seaSites: seaSiteViews(catalog, state, playerId),
  };
}

// ---------------------------------------------------------------------------
// Minimap
// ---------------------------------------------------------------------------

function Minimap({ catalog, state, playerId, onPick, footprint }: { catalog: ContentCatalog; state: MatchState; playerId: string; onPick: (c: HexCoord) => void; footprint: () => readonly { q: number; r: number }[] | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  /**
   * The camera's ground footprint (polled: the camera moves in the render loop).
   * Held here, so panning redraws only the minimap's frame, not the whole map screen
   * (2026-10-06 frame-rate work).
   */
  const [frame, setFrame] = useState<readonly { q: number; r: number }[] | null>(null);
  const read = useRef(footprint);
  read.current = footprint;
  useEffect(() => {
    let last = '';
    const t = setInterval(() => {
      const f = read.current();
      const key = f ? f.map((p) => `${p.q.toFixed(2)},${p.r.toFixed(2)}`).join(';') : '';
      if (key !== last) {
        last = key;
        setFrame(f);
      }
    }, 150);
    return () => clearInterval(t);
  }, []);
  const map = state.world.map;
  const cell = 7;
  // Only the map's own cells (a square random map's void cells are left out).
  const box = useMemo(() => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let r0 = Infinity;
    let r1 = -Infinity;
    for (let r = 0; r < map.height; r++)
      for (let q = 0; q < map.width; q++) {
        if (map.terrain[r * map.width + q] === 'v') continue;
        x0 = Math.min(x0, q + r / 2);
        x1 = Math.max(x1, q + r / 2 + 1);
        r0 = Math.min(r0, r);
        r1 = Math.max(r1, r);
      }
    return Number.isFinite(x0) ? { x0, x1, r0, r1 } : { x0: 0, x1: map.width + map.height / 2, r0: 0, r1: map.height - 1 };
  }, [map]);
  const w = Math.ceil((box.x1 - box.x0) * cell);
  const h = Math.ceil((box.r1 - box.r0) * cell * 0.87 + cell);
  const px = (q: number, r: number) => (q + r / 2 - box.x0) * cell;
  const py = (r: number) => (r - box.r0) * cell * 0.87;
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    const explored = state.fog[playerId]?.explored ?? [];
    for (let r = 0; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        const i = r * map.width + q;
        if (explored[i] !== 1) continue;
        const code = map.terrain[i] ?? 'p';
        if (code === 'v') continue;
        const terrain = ({ p: 'plains', f: 'forest', r: 'rough', s: 'marsh', m: 'mountain', w: 'water' } as const)[code as 'p'] ?? 'plains';
        ctx.fillStyle = biomeTerrainCss(terrain, map.biome);
        ctx.fillRect(px(q, r), py(r), cell, cell);
      }
    }
    for (const t of Object.values(state.towns)) {
      if (explored[cellIndex(map, t.coord)] !== 1) continue;
      ctx.fillStyle = t.ownerId ? (state.players[t.ownerId]?.color ?? '#aaa') : '#aaa';
      const x = px(t.coord.q, t.coord.r);
      const y = py(t.coord.r);
      ctx.fillRect(x - 2, y - 2, cell + 4, cell + 4);
      ctx.strokeStyle = '#f5e4b7';
      ctx.strokeRect(x - 2, y - 2, cell + 4, cell + 4);
    }
    const vis = visibleCells(catalog, state, playerId);
    // Wagons use a diamond, distinct from hero circles and town squares. Never reveal fogged rivals.
    if (state.scenario.features?.recruitmentCaravansV1) for (const wagon of caravansOnMap(state)) {
      if (wagon.ownerId !== playerId && !vis.has(cellIndex(map, wagon.coord))) continue;
      const x = px(wagon.coord.q, wagon.coord.r) + cell / 2;
      const y = py(wagon.coord.r) + cell / 2;
      const radius = Math.max(2, cell * 0.9);
      ctx.fillStyle = state.players[wagon.ownerId]?.color ?? '#e9dfc4';
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(x, y - radius); ctx.lineTo(x + radius, y);
      ctx.lineTo(x, y + radius); ctx.lineTo(x - radius, y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    for (const hero of Object.values(state.heroes)) {
      if (hero.status !== 'active') continue;
      if (hero.ownerId !== playerId && !vis.has(cellIndex(map, hero.position))) continue;
      ctx.fillStyle = state.players[hero.ownerId]?.color ?? '#fff';
      const x = px(hero.position.q, hero.position.r) + cell / 2;
      const y = py(hero.position.r) + cell / 2;
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();
    }
    // Hero ships: a small hull mark in the owner's colour (neutral: pale), with the same sight rules as heroes.
    for (const s of shipViews(state, playerId, null, vis)) {
      if (s.occupied) continue; // a crewed ship's hero is already marked
      const x = px(s.coord.q, s.coord.r) + cell / 2;
      const y = py(s.coord.r) + cell / 2;
      ctx.fillStyle = s.color ?? '#e9dfc4';
      ctx.beginPath();
      ctx.moveTo(x - cell * 0.7, y - cell * 0.15);
      ctx.lineTo(x + cell * 0.7, y - cell * 0.15);
      ctx.lineTo(x + cell * 0.4, y + cell * 0.45);
      ctx.lineTo(x - cell * 0.4, y + cell * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();
    }
    // Scouting intel: last-known sightings as hollow rings in the banner colour seen (no army data).
    if (intelOn(catalog, state)) {
      for (const m of lastKnownMarkers(catalog, state, playerId, vis)) {
        ctx.strokeStyle = m.color;
        ctx.lineWidth = Math.max(1, cell * 0.35);
        ctx.beginPath();
        ctx.arc(px(m.coord.q, m.coord.r) + cell / 2, py(m.coord.r) + cell / 2, cell * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, state, playerId, map, w, h, box]);
  // The part of the map the camera shows.
  const framePoints = frame?.map((p) => `${(px(p.q, p.r) + cell / 2).toFixed(1)},${(py(p.r) + cell / 2).toFixed(1)}`).join(' ');
  return (
    <div className="minimap-wrap">
    <canvas
      ref={ref}
      width={w}
      height={h}
      className="minimap"
      aria-label="Minimap — click to move the camera"
      onClick={(e) => {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * w;
        const my = ((e.clientY - rect.top) / rect.height) * h;
        const r = Math.round(my / (cell * 0.87) - 0.5) + box.r0;
        const q = Math.round(mx / cell + box.x0 - r / 2 - 0.5);
        const c = { q: Math.max(0, Math.min(map.width - 1, q)), r: Math.max(0, Math.min(map.height - 1, r)) };
        onPick(c);
      }}
    />
      {framePoints ? (
        <svg className="minimap__frame" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" data-testid="minimap-frame">
          <polygon points={framePoints} />
        </svg>
      ) : null}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Tile information
// ---------------------------------------------------------------------------

/** Whether a site's one-time purpose is spent (for its map marker). */
function siteDone(kind: string, st: { claimed: boolean; activated: boolean; open: boolean; cleared: boolean }): boolean {
  if (kind === 'pickup' || kind === 'map_event' || kind === 'treasure_chest' || kind === 'quest_hut' || kind === 'prison') return st.claimed;
  if (kind === 'activation') return st.activated;
  if (kind === 'gate') return st.open;
  if (kind === 'crossing' || kind === 'landmark') return st.cleared;
  return false;
}

function TileInfo({ store, state, c, hero }: { store: AppStore; state: MatchState; c: HexCoord; hero: HeroState | null }) {
  const catalog = store.catalog;
  const playerId = store.session!.humanPlayerId;
  const site = siteAt(catalog, state, c);
  const other = Object.values(state.heroes).find((h) => h.status === 'active' && hexEquals(h.position, c));
  const vis = visibleCells(catalog, state, playerId).has(cellIndex(state.world.map, c));
  // The quote MoveHero commits (a destination over the water through a ship).
  const quote = hero && !hexEquals(hero.position, c) ? quoteTravel(catalog, state, hero.id, c) : null;
  // Campaign v2 sites (sluice, supply depot, ferry landing, neutral hiring site): their known state and what a hero can do there.
  const v2 = site ? siteStatus(catalog, state, playerId, site.def.id, hero?.id ?? null) : null;
  const quest = site ? questMarkerSites(catalog, state, playerId).get(site.def.id) : undefined;
  // Scouting intel (`scoutingIntelV1`): an enemy army in sight is shown at its observation stage only,
  // and outside vision a tile shows its last-known report (dated); never the hidden army itself.
  const intel = intelOn(catalog, state);
  const shownHero = other && (vis || other.ownerId === playerId || !intel) ? other : undefined;
  const foeIntel = shownHero && shownHero.ownerId !== playerId && vis && intel ? currentIntelView(catalog, state, playerId, shownHero.id) : null;
  const stale = intel && !vis ? lastKnownAt(catalog, state, playerId, c) : null;
  return (
    <div className="tile-info">
      <div className="tile-info__head">
        {site ? (
          (() => {
            const assetId = siteMarkerAsset(site.def.kind, {
              owner: (() => {
                const o = site.def.kind.type === 'town' ? state.towns[site.def.kind.townId]?.ownerId : site.state.owner;
                return o ? (o === playerId ? 'self' : 'other') : null;
              })(),
              done: siteDone(site.def.kind.type, site.state),
            });
            return <MarkerIcon assetId={assetId} tint={siteMarkerTint(site.def.kind as { type: string; color?: string }, assetId, KEY_COLOR_HEX)} />;
          })()
        ) : shownHero ? (
          <MarkerIcon assetId={shownHero.ownerId === playerId ? 'icon.marker.hero' : 'icon.marker.enemy-hero'} />
        ) : stale ? (
          <MarkerIcon assetId="icon.marker.enemy-hero" />
        ) : null}
        <div className="tile-info__title">{site ? site.def.name : terrainLabel(state, c)}</div>
        {quest ? (
          <span className="tile-info__quest" title={quest.label} data-testid="tile-quest-marker" data-marker={quest.id}>
            <MarkerIcon assetId={resolveAsset(quest.id).url ? quest.id : GENERIC_QUEST_MARKER} label={quest.label} size="1.8rem" />
          </span>
        ) : null}
      </div>
      {site || !vis ? (
        <div className="dim small">
          {site ? `${siteKindLabel(site.def)} · ${terrainLabel(state, c)}` : ''}
          {!vis ? `${site ? ' · ' : ''}remembered` : ''}
        </div>
      ) : null}
      {site ? <p className="small">{site.def.description}</p> : null}
      {site?.def.kind.type === 'resource_site' || site?.def.kind.type === 'town' ? (
        <div className="small">
          Owner:{' '}
          {(() => {
            const o = site.def.kind.type === 'town' ? state.towns[site.def.kind.townId]?.ownerId : site.state.owner;
            return o ? (o === playerId ? 'You' : (state.players[o]?.name ?? o)) : 'Unowned';
          })()}
        </div>
      ) : null}
      {site?.def.kind.type === 'town' && dedicationsOn(state) ? (() => {
        // City dedications: which god a town honors is public (its Temple); its progress and choices stay the owner's.
        const v = townDedicationView(catalog, state, site.def.kind.townId, playerId);
        return v.active ? (
          <div className="small" data-testid="tile-town-god">
            Honors {godName(catalog, v.active.godId)}
            {v.active.state === 'dormant' && v.ownerId === playerId ? ` (dormant: ${v.active.dormantReason})` : ''}
          </div>
        ) : null;
      })() : null}
      {site?.def.guard && !site.state.cleared ? (
        <div className="tile-info__guard">
          <div>
            <Icon name="attack" className="inline-icon" /> <strong>{site.def.guard.label}</strong>
          </div>
          <ArmyPreview catalog={catalog} stacks={site.state.guard ?? site.def.guard.army} onInfo={(creatureId, count) => store.openOverlay({ kind: 'stack-info', creatureId, count })} testId="guard-army" />
          {site.def.kind.type === 'sea_monster' ? <SeaEncounterCards catalog={catalog} stacks={site.state.guard ?? site.def.guard.army} /> : null}
          {hero ? (
            (() => {
              const r = quoteNeutralReaction(catalog, state, hero.id, site.def.coord);
              return r.kind ? (
                <div className="small" data-testid="neutral-reaction">
                  {r.kind === 'join' ? 'They would rather join your army than fight it.' : 'They will flee from your army rather than fight.'}
                </div>
              ) : null;
            })()
          ) : null}
        </div>
      ) : site?.def.guard ? (
        <div className="small success">Guards defeated</div>
      ) : null}
      {site?.def.kind.type === 'creature_camp' && !v2 ? (
        <div className="small">
          {(() => {
            const cr = catalog.creatures[site.def.kind.creatureId];
            return (
              <>
                {campStock(catalog, state, site.def.id)} {cr?.pluralName} willing to join · +{site.def.kind.weeklyGrowth} each week
              </>
            );
          })()}
        </div>
      ) : null}
      {site?.def.kind.type === 'map_event' ? <div className="small">{site.def.kind.restoration ? (site.state.claimed ? 'Restored — the gift has been claimed' : `Restore for ${site.def.kind.restoration.size === 'small' ? 8 : 20} Favor: choose supplies, creatures, or a spell`) : site.state.claimed ? 'Already claimed' : site.def.kind.landmark ? (hero && landmarkVisit(catalog, state, hero.id, site.def.id) ? 'Visited this week — return next week' : site.def.kind.landmark === 'ruins' ? 'Visit: treasure or a guardian battle' : site.def.kind.landmark === 'statue' ? 'Visit: +2 Attack for the next battle · weekly' : site.def.kind.landmark === 'waterfall' ? 'Visit: restore up to 15 mana · weekly' : 'Visit: buy experience or a protective blessing · weekly') : 'Something awaits the first hero to arrive'}</div> : null}
      {site?.def.kind.type === 'relic' ? (
        <div className="small">
          {site.state.owner ? `Held by ${site.state.owner === playerId ? 'you' : (state.players[site.state.owner]?.name ?? site.state.owner)} for ${site.state.heldDays ?? 0} day(s)` : 'Unclaimed'}
          {(() => {
            const cond = scenarioMission(catalog, state)?.victoryCondition;
            return cond?.type === 'hold_site' && cond.siteId === site.def.id ? ` · ${cond.days} needed to win` : '';
          })()}
        </div>
      ) : null}
      {site?.def.kind.type === 'activation' ? <div className="small">{site.state.activated ? 'Restored' : 'Not yet restored'}</div> : null}
      {site?.def.kind.type === 'pickup' && !v2 ? <div className="small">{site.state.claimed ? 'Already collected' : 'Uncollected'}</div> : null}
      {site?.def.kind.type === 'gate' ? <div className="small">{site.state.open ? 'Open' : 'Sealed'}</div> : null}
      <NewSiteInfo site={site} hero={hero} />
      <SeaSiteTileLines siteId={site?.def.id ?? null} heroId={hero?.id ?? null} />
      {v2 ? (
        <div className="small" data-testid="site-status">
          <div className={v2.locked && !v2.refused ? 'warn' : undefined} data-testid="site-state">
            {v2.state}
          </div>
          {v2.action ? (
            <div className={v2.refused ? 'warn' : undefined} data-testid="site-action">
              {v2.action}
            </div>
          ) : null}
        </div>
      ) : null}
      {site?.def.kind.type === 'portal' && !v2 ? (
        <div className="small" data-testid="portal-info">
          Stop on it to step out of its twin at once, at no movement cost. Blocked while a hero stands on the twin. {site.state.visitedBy.includes(playerId) ? 'You have used it.' : 'Its far side is unknown until you go through.'}
        </div>
      ) : null}
      {other && (vis || other.ownerId === playerId) ? (
        <div className="small">
          <Icon name="hero" className="inline-icon" /> {other.name} ({other.ownerId === playerId ? 'yours' : (state.players[other.ownerId]?.name ?? 'hostile')})
          {other.ownerId !== playerId ? (
            foeIntel ? (
              <ArmyIntelPanel catalog={catalog} view={foeIntel} compact testId="foe-intel" />
            ) : (
              <ArmyPreview catalog={catalog} stacks={other.army.slots.filter((s): s is NonNullable<typeof s> => !!s)} onInfo={(creatureId, count) => store.openOverlay({ kind: 'stack-info', creatureId, count })} testId="foe-army" />
            )
          ) : null}
          {/* Whether neutrals would join or flee compares exact strengths: with scouting intel it shows only when they meet (the encounter). */}
          {other.ownerId !== playerId && other.monster && hero && !intel ? (
            (() => {
              const r = quoteNeutralReaction(catalog, state, hero.id, other.position);
              return r.kind ? <div>{r.kind === 'join' ? 'They would rather join your army than fight it.' : 'They will flee from your army rather than fight.'}</div> : null;
            })()
          ) : null}
        </div>
      ) : null}
      {stale ? <ArmyIntelPanel catalog={catalog} view={lastKnownView(catalog, state, stale)} compact testId="last-known-intel" /> : null}
      <CaravanTileLines coord={c} />
      <ShipTileLines coord={c} />
      {quote && !quote.reachable ? <div className="small danger">{quote.reason}</div> : null}
      {quote?.voyage ? (
        <div className="small" data-testid="tile-voyage">
          <Icon name="ship" className="inline-icon" /> Over the water: {quote.voyage.transitions.map((t) => (t.kind === 'embark' ? 'embark' : 'go ashore')).join(', then ')} on the way
        </div>
      ) : null}
    </div>
  );
}

/** Tile-panel lines for the sites added 2026-10-02 (random maps). */
function NewSiteInfo({ site, hero }: { site: ReturnType<typeof siteAt>; hero: HeroState | null }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  if (!site) return null;
  const k = site.def.kind;
  const st = site.state;
  const used = !!hero && (st.usedBy ?? []).includes(hero.id);
  let text: string | null = null;
  switch (k.type) {
    case 'learning_stone':
      text = hero ? (used ? `${hero.name} has already studied here.` : `${hero.name} gains ${k.xp.toLocaleString('en-US')} experience here (once per hero).`) : 'Every hero gains its experience once.';
      break;
    case 'spell_shrine': {
      const sp = catalog.spells[k.spellId];
      text = `Teaches ${sp?.name ?? k.spellId} (tier ${sp?.tier ?? '?'}) to heroes with a spellbook${sp && sp.tier > 2 ? ' and enough Wisdom' : ''}.${hero && sp ? (hero.knownSpellIds.includes(sp.id) ? ` ${hero.name} knows it.` : !hero.spellbook ? ` ${hero.name} has no spellbook.` : '') : ''}`;
      break;
    }
    case 'skill_trainer': {
      const sk = catalog.skills[k.skillId];
      text = `Teaches ${sk?.name ?? k.skillId} (Basic) to heroes with a free skill slot.${hero && sk && hero.skills.some((x) => x.skillId === sk.id) ? ` ${hero.name} knows it.` : ''}`;
      break;
    }
    case 'quest_hut': {
      if (st.claimed) text = 'Quest fulfilled.';
      else {
        const p = questHutProgress(catalog, state, playerId, k.quest);
        text = k.quest.type === 'deliver' ? `Wants ${costText(k.quest.resources)}.${p.met ? ' You can pay it.' : ''}` : `${p.text}.`;
      }
      break;
    }
    case 'key_tent':
      text = (state.players[playerId]?.keys ?? []).includes(k.color) ? `You hold the ${KEY_COLOR_LABEL[k.color].toLowerCase()} key.` : `Visit to receive the ${KEY_COLOR_LABEL[k.color].toLowerCase()} key.`;
      break;
    case 'key_gate':
      text = (state.players[playerId]?.keys ?? []).includes(k.color) ? 'Open for you (you hold the key).' : `Closed: find the ${KEY_COLOR_LABEL[k.color].toLowerCase()} key tent.`;
      break;
    case 'windmill': {
      const week = worldWeek(state, catalog.rulesProfile.daysPerWeek);
      text = `${costText(k.weekly)} for the first hero each week · ${(st.lastCollectedWeek ?? 0) >= week ? 'already emptied this week' : 'ready this week'}.`;
      break;
    }
    case 'treasure_chest':
      text = st.claimed ? 'Opened.' : `${k.gold.toLocaleString('en-US')} Gold or ${k.xp.toLocaleString('en-US')} experience — your choice.`;
      break;
    case 'prison': {
      const h = catalog.heroes[k.heroDefinitionId];
      text = st.claimed ? 'Empty: the captive was freed.' : `${h?.name ?? 'A hero'} waits here and joins the first empire to arrive (at level ${k.level}).`;
      break;
    }
    default:
      return null;
  }
  return (
    <div className="small" data-testid="site-info">
      {text}
    </div>
  );
}

function costText(c: Partial<Record<string, number | undefined>>): string {
  return Object.entries(c)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([key, v]) => `${(v as number).toLocaleString('en-US')} ${key[0]!.toUpperCase() + key.slice(1)}`)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Planned journey (the bar over the map's bottom edge)
// ---------------------------------------------------------------------------

/** "Arrives today / tomorrow / in N turns", counting today as the first turn (routeDays). */
export function arrivalText(days: number | null): string {
  if (days == null) return 'Arrival unknown';
  if (days <= 1) return 'Arrives today';
  if (days === 2) return 'Arrives tomorrow';
  return `Arrives in ${days} turns`;
}

function JourneyBar({
  heroName,
  status,
  quote,
  days,
  rerouted,
  shortcut,
  busy,
  onContinue,
  onCancel,
  reason: journeyReason,
  transition,
}: {
  heroName: string;
  status: JourneyIntent['status'];
  quote: MovementQuote;
  days: number | null;
  rerouted: boolean;
  shortcut: string;
  busy: boolean;
  onContinue: () => void;
  onCancel: () => void;
  /** Why the journey waits (session `JourneyIntent.reason`: interrupted, embark, disembark, no_ship, no_route). */
  reason?: string;
  /** The route stands at a mode change now: what Continue confirms, and whether the rules allow it today. */
  transition?: { readonly kind: 'embark' | 'disembark'; readonly legal: boolean; readonly reason: string | null } | null;
}) {
  const blocked = !quote.reachable;
  const atTransition = !blocked && !!transition;
  const noMoveToday = !blocked && !atTransition && quote.stopIndex < 0;
  const why = journeyReasonText(journeyReason);
  const reason = blocked
    ? `Route unavailable: ${quote.reason ?? 'no way there now'}`
    : atTransition && !transition!.legal
      ? `${transition!.reason ?? 'Not possible now'} — continue next day`
      : noMoveToday
        ? 'Continue next day'
        : busy
          ? 'Wait for the move to finish'
          : null;
  let text: string;
  if (blocked) text = `Route unavailable — ${why && (journeyReason === 'no_ship' || journeyReason === 'no_route') ? `${why.toLowerCase()} (${quote.reason ?? 'no way there now'})` : (quote.reason ?? 'no way there now')}. The destination is kept.`;
  else if (rerouted) text = `Route changed${quote.endsInEncounter ? ': it now ends in battle' : ''} — ${arrivalText(days).toLowerCase()}. Check the new way on the map.`;
  else if (atTransition) text = `${transition!.kind === 'embark' ? 'At the shore beside the ship: Continue to embark' : 'At the coast: Continue to go ashore'} (costs one movement step) · ${arrivalText(days)}`;
  else {
    const parts = [arrivalText(days)];
    if (quote.voyage) parts.push(`voyage: ${quote.voyage.transitions.map((t) => (t.kind === 'embark' ? 'embark' : 'go ashore')).join(' then ')}`);
    if (!quote.reachesDestinationToday && quote.stopIndex >= 0) parts.push(`${quote.stopIndex + 1} of ${quote.path.length} steps today`);
    if (noMoveToday) parts.push('no movement left today');
    if (quote.endsInEncounter) parts.push('ends in battle');
    text = `${status === 'paused' ? `Journey paused${why && journeyReason === 'interrupted' ? ` (${why.toLowerCase()})` : ''} · ` : ''}${parts.join(' · ')}`;
  }
  return (
    <span className={`journey-bar ${blocked ? 'is-blocked' : ''} ${rerouted ? 'is-rerouted' : ''}`} data-testid="journey-bar" data-status={blocked ? 'blocked' : rerouted ? 'rerouted' : status} data-reason={journeyReason ?? ''}>
      <span className="journey-bar__text small" data-testid="journey-status">
        <strong>{heroName}:</strong> {text}
      </span>
      <Button
        size="small"
        variant={rerouted ? undefined : 'primary'}
        icon={rerouted ? 'check' : 'journey'}
        onClick={onContinue}
        disabled={!!reason}
        disabledReason={reason ?? undefined}
        title={rerouted ? `Accept the new route (${shortcut})` : `Continue journey (${shortcut})`}
        aria-keyshortcuts={shortcut}
        data-testid="journey-continue"
      >
        {rerouted ? 'Accept new route' : 'Continue journey'}
      </Button>
      <Button size="small" variant="ghost" icon="close" onClick={onCancel} title="Cancel journey" aria-label="Cancel journey" data-testid="journey-cancel" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Hero ships (navalMovementV1)
// ---------------------------------------------------------------------------

/**
 * The explicit confirmation where a route reaches a ship or a shore: "Embark on the ship? Uses all
 * remaining movement." — Confirm dispatches EmbarkHero / DisembarkHero; a mode change the rules
 * refuse now (too little movement) says why instead.
 */
function confirmTransition(store: AppStore, heroId: string, t: VoyageTransition): void {
  const s = store.session?.state;
  if (!s) return;
  const p = transitionPrompt(store.catalog, s, heroId, t);
  if (!p.legal) {
    store.toast(p.reason ?? 'Not possible now', 'error');
    return;
  }
  store.confirm(p.title, p.body, p.confirmLabel, () => {
    if (!store.dispatch(p.command)) store.toast(p.kind === 'embark' ? 'Embarked: continue your voyage.' : 'Ashore: continue your journey.', 'success');
  });
}

/** Map playback of a boarding battle's aftermath kept while the map was closed (the battlefield and its result screen). */
async function playPendingNaval(store: AppStore, c: AdventureSceneController, factor: number): Promise<void> {
  const session = store.session;
  if (!session) return;
  const st = session.state;
  const me = session.humanPlayerId;
  const vis = visibleCells(store.catalog, st, me);
  const seen = (p: HexCoord | undefined) => !!p && vis.has(cellIndex(st.world.map, p));
  // Only what still matches the committed state (a loaded save of the same match never replays a stale wreck).
  const items = (takeNavalPlayback(st.matchId) as PendingNavalPlayback[])
    .filter((item) => (item.kind === 'wreck' ? !st.world.ships?.[item.shipId] : hexEquals(st.world.ships?.[item.shipId]?.coord ?? { q: -1, r: -1 }, item.coord)))
    .filter((item) => item.ownerId === me || seen(item.coord) || seen(item.from));
  // The ships that sail afterwards wait where they stood (the winner beside the contested hex) while a wreck sinks.
  const holds = items.filter((item) => item.kind !== 'wreck' && item.from).map((item) => ({ item, release: c.holdShip(item.shipId, item.from!) }));
  try {
    for (const item of items) if (item.kind === 'wreck') await c.playShipSinking(item.shipId, factor, { coord: item.coord, color: item.ownerColor, ...(item.facing !== undefined ? { facing: item.facing } : {}), occupied: !!item.occupied });
    for (const { item, release } of holds) {
      release();
      await c.playShipWithdraw(item.shipId, item.from!, item.coord, factor);
    }
  } finally {
    for (const h of holds) h.release();
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function AdventureScreen() {
  const store = useStore();
  const session = store.session!;
  const state = session.state;
  const catalog = store.catalog;
  const player = humanPlayer(state);
  const playerId = player.id;
  const heroes = state.coalition ? Object.values(state.heroes).filter((h) => h.status === 'active' && allied(state, h.ownerId, playerId)) : playerHeroes(state, playerId);
  const selected = heroes.find((h) => h.id === store.selectedHeroId && h.ownerId === playerId) ?? heroes.find((h)=>h.ownerId===playerId) ?? null;
  useEffect(() => { if (selected && store.selectedHeroId !== selected.id) { store.selectedHeroId=selected.id; store.notify(); } }, [selected?.id, store]);
  // The selected hero's planned journey: kept by the session per match, player and hero (saved with the
  // game), so it survives the end of the day, other screens, other heroes and save/load (owner request 2026-10-14).
  const journey = selected ? session.journey(selected.id, playerId) : null;
  const target = journey?.target ?? null;
  const [hover, setHover] = useState<HexCoord | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pinned, setPinned] = useState<HexCoord | null>(null);
  const [dayBanner, setDayBanner] = useState<string | null>(null);
  /** The coin shower over the Gold counter (Tithe of the Faithful, the Feathered Serpent's gift). */
  const [coins, setCoins] = useState<{ key: number; x: number; y: number } | null>(null);
  /** Adventure spell awaiting a target tile (Divine Sight). */
  const [courierHero, setCourierHero] = useState<string | null>(null);
  const [casting, setCasting] = useState<string | null>(null);
  /** Hero ships: the ship whose inspector is open, and whether the map waits for a shore to land on. */
  const [shipPanel, setShipPanel] = useState<string | null>(null);
  /** The wreck panel (sea-sites kit): the wreck's site ID, or null. */
  const [wreckPanel, setWreckPanel] = useState<string | null>(null);
  const [landingPick, setLandingPick] = useState(false);
  const ctrl = useRef<AdventureSceneController | null>(null);
  const humanTurn = state.activePlayerId === playerId && !state.battle && state.outcome.status === 'running';
  const pending = state.pendingDecisions.find((d) => state.heroes[d.heroId]?.ownerId === playerId);
  const grid = store.prefs.hexOverlay;

  useEffect(() => {
    if (selected && store.selectedHeroId !== selected.id) store.selectedHeroId = selected.id;
  }, [selected, store]);

  // The paper under the journal, spellbook and codex text, decoded once a match is on the map (GUI audit 1.1.2).
  useEffect(() => {
    const t = window.setTimeout(preloadReadingSkins, 1500);
    return () => window.clearTimeout(t);
  }, []);

  // Contextual tips (Settings → Tutorial hints); shown once each.
  const outOfMoves = humanTurn && !!selected && selected.movementPoints === 0 && state.day > 1;
  const canInvoke = humanTurn && state.day >= 3 && !interventionUsedThisWeek(catalog, state, playerId) && interventionsFor(catalog, state, playerId).some((d) => d.favorCost <= player.wallet.favor);
  const seesMonster = Object.values(state.heroes).some((h) => h.monster && h.status === 'active' && visibleCells(catalog, state, playerId).has(cellIndex(state.world.map, h.position)));
  useEffect(() => {
    if (outOfMoves) store.showHint('out_of_movement');
  }, [outOfMoves, store]);
  useEffect(() => {
    if (canInvoke) store.showHint('interventions');
  }, [canInvoke, store]);
  useEffect(() => {
    if (seesMonster) store.showHint('wandering_monsters');
  }, [seesMonster, store]);

  const [auraTick, setAuraTick] = useState(0);
  const [, refreshSystemMotion] = useState(0);
  useEffect(() => {
    if (store.prefs.motion !== 'system') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => refreshSystemMotion(n => n + 1);
    media.addEventListener('change', refresh);
    return () => media.removeEventListener('change', refresh);
  }, [store.prefs.motion]);
  const calm = reducedMotion(store.prefs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // The shore pick is the selected embarked hero's (it ends with the hero's turn, the panel or the selection).
  const picking = landingPick && humanTurn && !!selected && !!heroShip(state, selected.id);
  const view = useMemo(() => buildView(catalog, state, playerId, selected, humanTurn ? journey : null, humanTurn, grid, store.mapAuras, calm, picking), [catalog, state, playerId, selected, journey, humanTurn, grid, auraTick, calm, picking]);

  // The controller can arrive after the first render (the 2D layer loads on demand),
  // so it reads the latest view and selection from refs when it does.
  const viewRef = useRef(view);
  viewRef.current = view;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    ctrl.current?.update(view);
  }, [view]);

  // A focus asked for while the map is open (a caravan tracker's Show on map): centre the camera once.
  useEffect(() => {
    if (store.focusRequest && ctrl.current) {
      ctrl.current.focus(store.focusRequest);
      store.focusRequest = null;
    }
  });

  // A different game (load, restart) abandons any pending readiness beat of the old one.
  const sessionRef = store.session;
  useEffect(() => () => ctrl.current?.cancelPreparations(), [sessionRef]);

  useEffect(() => store.registerPreparer(events => {
    const session = store.session;
    if (session && events.some(e => e.kind === 'HeroMoved' && session.state.heroes[e.heroId]?.ownerId === session.humanPlayerId)) ctrl.current?.holdTravelFog();
  }), [store]);

  // Presentation of committed events (movement playback, day banner). Never alters state.
  useEffect(() => {
    return store.registerPresenter(async (events, source) => {
      const c = ctrl.current;
      const moves = events.filter((e) => e.kind === 'HeroMoved');
      const day = events.find((e) => e.kind === 'DayStarted');
      if (day && day.kind === 'DayStarted') {
        const weeklyId = store.session ? weeklyEventOf(store.session.state, events, day.week) : null;
        const ev = weeklyId ? catalog.weeklyEvents?.[weeklyId] : undefined;
        // A new week shows its painted banner (the moment layer) when the art is there; otherwise this text.
        const painted = day.dayOfWeek === 1 && day.day > 1 && !!newWeekBannerArt(ev?.id ?? null);
        if (!painted) {
          setDayBanner(`Week ${day.week} · Day ${day.dayOfWeek}${day.dayOfWeek === 1 ? (ev ? ` — ${ev.name}: ${ev.summary}` : ' — a new week: enemy armies grow 12%; town recruits replenish') : ''}`);
          setTimeout(() => setDayBanner(null), ev ? 3600 : 2200);
        }
        if (ev) store.showHint('weekly_event');
      }
      if (!c) {
        siteNotices(events);
        afterMoves(moves);
        return;
      }
      const teleports = events.filter((e) => e.kind === 'HeroTeleported');
      const played = new Set<number>();
      for (const m of moves) {
        if (m.kind !== 'HeroMoved') continue;
        const hero = store.session?.state.heroes[m.heroId];
        const mine = hero?.ownerId === store.session?.humanPlayerId;
        const updateSight = mine && hero && store.session ? (position: HexCoord) => {
          const session = store.session!;
          const visualState = { ...session.state, heroes: { ...session.state.heroes, [hero.id]: { ...hero, position } } };
          c.advanceTravelFog(visibleCells(catalog, visualState, session.humanPlayerId));
        } : undefined;
        const vis = store.session ? visibleCells(catalog, store.session.state, store.session.humanPlayerId) : new Set<number>();
        // A portal at the end of this walk: the hero sinks into it and rises from its twin.
        const tpIndex = teleports.findIndex((t, i) => !played.has(i) && t.kind === 'HeroTeleported' && t.heroId === m.heroId && !!t.viaSiteId);
        const tp = tpIndex >= 0 ? teleports[tpIndex] : undefined;
        if (tp) played.add(tpIndex);
        const teleportTo = tp && tp.kind === 'HeroTeleported' ? tp.to : undefined;
        // Aboard a ship (navalMovementV1): the hull sails the committed route; the hidden avatar simply follows it.
        const last = m.path[m.path.length - 1];
        const sail = last ? events.find((x) => x.kind === 'ShipMoved' && x.heroId === m.heroId && hexEquals(x.path[x.path.length - 1] ?? last, last)) : undefined;
        if (sail && sail.kind === 'ShipMoved') {
          try { await c.playShipMove(sail.shipId, sail.path, adventurePlaybackFactor(store.prefs, source === 'ai'), true, mine ? undefined : p => vis.has(cellIndex(store.session!.state.world.map, p)), updateSight); } finally { if (mine) c.releaseTravelFog(); }
          continue;
        }
        if (mine) store.audio?.heroSteps(true);
        try {
          // The viewer's own walk keeps its route on the ground, cleared step by step.
          await c.playHeroMove(m.heroId, m.path, adventurePlaybackFactor(store.prefs, source === 'ai'), true, mine || (teleportTo && vis.has(cellIndex(store.session!.state.world.map, teleportTo))) ? teleportTo : undefined, mine, mine ? undefined : p => vis.has(cellIndex(store.session!.state.world.map, p)), updateSight);
        } finally {
          if (mine) { store.audio?.heroSteps(false); c.releaseTravelFog(); }
        }
      }
      // Teleports without a walk before them (the Recall spell: Homecoming's column of light).
      for (const [i, t] of teleports.entries()) {
        if (played.has(i) || t.kind !== 'HeroTeleported') continue;
        const hero = store.session?.state.heroes[t.heroId];
        if (hero?.ownerId !== store.session?.humanPlayerId) continue;
        const cast = events.find((e) => e.kind === 'AdventureSpellCast' && e.heroId === t.heroId);
        const spell = cast && cast.kind === 'AdventureSpellCast' ? catalog.spells[cast.spellId] : undefined;
        await c.playHeroTeleport(t.heroId, t.to, adventurePlaybackFactor(store.prefs, source === 'ai'), true, spell ? { look: spellLook(spell), id: `fx.spell.${spell.id}` } : undefined);
      }
      // Recruitment caravans: the viewer's own wagons, and another's whose whole road is in sight.
      for (const e of events) {
        if (e.kind !== 'CaravanMoved') continue;
        const st = store.session?.state;
        if (!st) break;
        const mineCaravan = e.playerId === store.session?.humanPlayerId;
        const vis = visibleCells(catalog, st, store.session!.humanPlayerId);
        // Another player's wagon rolls on screen only along a road wholly in sight (no hidden stretch is shown).
        if (!mineCaravan && !e.path.every((p) => vis.has(cellIndex(st.world.map, p)))) continue;
        await c.playCaravanMove(e.caravanId, e.path, adventurePlaybackFactor(store.prefs, true), false);
      }
      await playNaval(c, events, source);
      await playMagic(c, events, source);
      siteNotices(events);
      const started = events.find((e) => e.kind === 'BattleStarted');
      if (started && started.kind === 'BattleStarted') await prepareBeforeBattle(c, started.battleId, source);
      afterMoves(moves);
    });
    /**
     * Hero ships (presentation of committed events only): a launched hull rises, embark / disembark
     * crossfade the avatar and the crewed ship, a boarding holds both ships while the battlefield opens,
     * and a battle's aftermath (withdrawal, wreck, the winner taking the hex) plays on the map.
     */
    async function playNaval(c: AdventureSceneController, events: readonly GameEvent[], source: string) {
      const session = store.session;
      if (!session || !navalOn(session.state)) return;
      const st = session.state;
      const me = session.humanPlayerId;
      const factor = adventurePlaybackFactor(store.prefs, source === 'ai');
      const vis = visibleCells(catalog, st, me);
      const seen = (p: HexCoord) => vis.has(cellIndex(st.world.map, p));
      for (const e of events) {
        if (e.kind === 'ShipLaunched' && (e.playerId === me || seen(e.coord))) await c.playShipLaunch(e.shipId, factor);
        else if ((e.kind === 'HeroEmbarked' || e.kind === 'HeroDisembarked') && (st.heroes[e.heroId]?.ownerId === me || seen(e.from) || seen(e.to))) {
          const embark = e.kind === 'HeroEmbarked';
          await c.playShipTransition(embark ? 'embark' : 'disembark', e.heroId, e.shipId, embark ? e.from : e.to, embark ? e.to : e.from, factor);
        } else if (e.kind === 'BoardingStarted' && (st.heroes[e.attackerHeroId]?.ownerId === me || st.heroes[e.defenderHeroId]?.ownerId === me || seen(e.coord))) {
          await Promise.all([c.playShipBoarding([e.attackerShipId, e.defenderShipId], factor), c.playShipHit(e.defenderShipId, factor)]);
        }
      }
      await playPendingNaval(store, c, factor);
    }
    /**
     * Notices for the sites a batch touched (shown after the walk, with or without the 2D view): a portal
     * or ferry the viewer's hero could not take — a ferry that does not run says why (its `lockedReason`) —
     * and a sluice operated (by the viewer's hero, or one in sight).
     */
    function siteNotices(events: readonly GameEvent[]) {
      const session = store.session;
      if (!session) return;
      const blocked = events.find((e) => e.kind === 'PortalBlocked');
      if (blocked && blocked.kind === 'PortalBlocked' && session.state.heroes[blocked.heroId]?.ownerId === session.humanPlayerId) {
        store.toast(portalBlockedText(catalog, session.state, blocked.siteId), 'info');
      }
      for (const e of events) {
        if (e.kind !== 'SluiceOperated') continue;
        const text = sluiceOperatedText(catalog, session.state, session.humanPlayerId, e);
        if (text) store.toast(text, 'success');
      }
    }
    /**
     * Map spells and the player's own map miracles (presentation only): the
     * fog-lifting ring, wind or motes on heroes, light over a town, coins over
     * the treasury. A miracle's effect follows its painted card.
     */
    async function playMagic(c: AdventureSceneController, events: readonly GameEvent[], source: string) {
      const session = store.session;
      if (!session) return;
      const st = session.state;
      const me = session.humanPlayerId;
      const factor = adventurePlaybackFactor(store.prefs, source === 'ai');
      for (const e of events) {
        if (e.kind === 'AdventureSpellCast') {
          const spell = catalog.spells[e.spellId];
          if (!spell || st.heroes[e.heroId]?.ownerId !== me || spell.effect.type === 'recall') continue;
          const look = spellLook(spell);
          const id = `fx.spell.${spell.id}`;
          await c.playMapFx(spell.effect.type === 'reveal_radius' ? { look, id, caster: e.heroId, area: { center: e.center, radius: e.radius } } : { look, id, caster: e.heroId, heroIds: [e.heroId] }, factor);
          if (spell.effect.type === 'movement_bonus') {
            // The extra movement lasts the day: its aura loops on the hero until then (when its strip is delivered).
            store.mapAuras = [...store.mapAuras.filter((a) => a.matchId === st.matchId && a.heroId !== e.heroId && st.day < a.untilDay), { matchId: st.matchId, heroId: e.heroId, id: `${id}.aura`, untilDay: e.untilDay }];
            setAuraTick((n) => n + 1);
          }
        } else if (e.kind === 'InterventionInvoked' && e.playerId === me) {
          const def = catalog.interventions?.[e.interventionId];
          if (!def || def.context !== 'adventure') continue;
          c.preloadFx(`fx.miracle.${def.id}`);
          if (factor > 0) await store.whenMiracleCardsClosed();
          const look = miracleLook(def);
          const id = `fx.miracle.${def.id}`;
          // The miracle's own icon (Brief 13) rises over the heroes or town it touches.
          const icon = resolveAsset(`icon.intervention.${def.id}`).url;
          store.audio?.effect(`magic.${look.sound}`);
          const fx = def.effect;
          if (fx.type === 'restore_movement' || fx.type === 'restore_mana') {
            const heroIds = Object.values(st.heroes)
              .filter((h) => h.ownerId === me && h.status === 'active' && !h.monster)
              .map((h) => h.id);
            await c.playMapFx({ look, id, heroIds, icon }, factor);
          } else if (fx.type === 'town_growth') {
            const town = e.targetTownId ? st.towns[e.targetTownId] : undefined;
            if (town) await c.playMapFx({ look, id, towns: [town.coord], icon }, factor);
          } else if (fx.type === 'grant_resources') {
            if (factor > 0 && !reducedMotion(store.prefs)) {
              const r = document.querySelector('[data-testid="res-gold"]')?.getBoundingClientRect();
              if (r) setCoins({ key: Date.now(), x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }
            const capital = Object.values(st.towns).find((t) => t.ownerId === me);
            await c.playMapFx({ look, id, icon, ...(capital ? { towns: [capital.coord] } : {}) }, factor);
          }
        }
      }
    }
    /**
     * Readiness beat: the attacking mounted hero has stopped on its approach tile; it
     * faces the opponent and holds its readiness pose once. The battlefield opens
     * (store.routeAfterUpdate, after this presentation step) only once the beat has
     * finished. If the encounter is abandoned meanwhile (another game loaded, the
     * battle gone), the completion is ignored and the hero returns to idle.
     */
    async function prepareBeforeBattle(c: AdventureSceneController, battleId: string, source: string) {
      const session = store.session;
      const st = session?.state;
      const b = st?.battle;
      if (!session || !st || !b || b.battleId !== battleId) return;
      if (!Object.values(b.sides).some((side) => side.controller === 'human')) return;
      const attacker = st.heroes[b.encounter.attackerHeroId];
      if (!attacker || attacker.monster) return;
      const mine = attacker.ownerId === session.humanPlayerId;
      if (!mine && !visibleCells(catalog, st, session.humanPlayerId).has(cellIndex(st.world.map, attacker.position))) return;
      const outcome = await c.prepareForBattle(attacker.id, b.encounter.destination, adventurePlaybackFactor(store.prefs, source === 'ai'), () => store.session === session && session.state.battle?.battleId === battleId);
      store.prepareWar[outcome] += 1;
    }
    /**
     * After the viewer's hero arrives: at one of its own towns, open the town; at a
     * camp or an unused event, chest or quest hut, open its dialog.
     */
    function afterMoves(moves: readonly { kind: string; heroId?: string }[]) {
      const session = store.session;
      if (!session || moves.length === 0) return;
      const last = moves[moves.length - 1] as { heroId: string };
      const st = session.state;
      const hero = st.heroes[last.heroId];
      if (!hero || hero.ownerId !== session.humanPlayerId || hero.status !== 'active' || st.battle) return;
      if (store.overlays.length || store.screen.id !== 'adventure') return;
      // A voyage stopped at its mode change (the shore beside the ship, or the coast): ask — never embark or land by itself.
      const j = navalOn(st) ? session.journey(hero.id, session.humanPlayerId) : null;
      if (j) {
        const q = quoteTravel(catalog, st, hero.id, j.target);
        if (q.reachable && q.transition && q.path.length === 0 && transitionPrompt(catalog, st, hero.id, q.transition).legal) {
          confirmTransition(store, hero.id, q.transition);
          return;
        }
      }
      const town = townAtHero(catalog, st, hero);
      if (town && town.ownerId === session.humanPlayerId) {
        store.selectedHeroId = hero.id;
        store.goto('town', { townId: town.id });
        return;
      }
      const site = siteAt(catalog, st, hero.position);
      if (!site) return;
      if (site.def.kind.type === 'creature_camp' && (!site.def.guard || site.state.cleared)) {
        store.showHint('creature_camp');
        store.openOverlay({ kind: 'camp', heroId: hero.id, siteId: site.def.id });
      } else if (site.def.kind.type === 'map_event' && !site.state.claimed && (!site.def.guard || site.state.cleared)) {
        store.showHint('map_event');
        store.openOverlay({ kind: 'map-event', heroId: hero.id, siteId: site.def.id });
      } else if (site.def.kind.type === 'treasure_chest' && !site.state.claimed && (!site.def.guard || site.state.cleared)) {
        store.openOverlay({ kind: 'chest', heroId: hero.id, siteId: site.def.id });
      } else if (site.def.kind.type === 'quest_hut' && !site.state.claimed && (!site.def.guard || site.state.cleared)) {
        store.openOverlay({ kind: 'quest-hut', heroId: hero.id, siteId: site.def.id });
      } else if (site.def.kind.type === 'sluice' && (!site.def.guard || site.state.cleared)) {
        store.openOverlay({ kind: 'sluice', heroId: hero.id, siteId: site.def.id });
      }
    }
  }, [store, catalog]);

  const onController = useCallback(
    (c: AdventureSceneController | null) => {
      ctrl.current = c;
      projectors.adventure = c ? (q, r) => toPage(c.projectHex({ q, r })) : undefined;
      inspectors.adventure = c ? { heroes: () => c.heroAnimationDebug(), camera: () => c.cameraPose(), fx: () => c.fxDebug(), ground: () => c.groundDebug(), scenery: () => c.sceneryDebug(), route: () => c.routeDebug(), lastKnown: () => c.lastKnownDebug(), caravans: () => c.caravanDebug(), ships: () => c.shipDebug(), seaSites: () => c.seaSiteDebug() } : undefined;
      if (c) {
        c.update(viewRef.current);
        const focus = store.focusRequest ?? selectedRef.current?.position ?? null;
        store.focusRequest = null;
        if (focus) c.focus(focus, false);
        // A boarding fought on the battlefield ended while the map was closed: its aftermath plays now.
        void playPendingNaval(store, c, adventurePlaybackFactor(store.prefs, false));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** The Spells button: the hero's book, opened to cast on the map. */
  const openSpells = () => {
    if (!selected) return;
    const hero = selected;
    const options: Record<string, { castable: boolean; reason: string | null; manaCost?: number }> = {};
    for (const sp of adventureSpellsOf(catalog, state, hero.id)) {
      const q = quoteAdventureSpell(catalog, state, playerId, hero.id, sp.id, null);
      options[sp.id] = { castable: humanTurn && q.legal, reason: !humanTurn ? 'Not your turn' : q.legal ? null : (q.reason ?? 'Cannot be cast now'), manaCost: q.manaCost };
    }
    store.openOverlay({
      kind: 'spellbook',
      heroId: hero.id,
      cast: {
        context: 'adventure',
        options,
        onCast: (spellId) => {
          const sp = catalog.spells[spellId];
          if (!sp) return;
          if (sp.effect.type === 'adventure_courier') { setCourierHero(hero.id); return; }
          // A spell with a target tile (Divine Sight) asks for the tile next.
          if (sp.effect.type === 'adventure_decoy' || sp.effect.type === 'reveal_radius' || sp.effect.type === 'adventure_boatcall' || sp.effect.type === 'adventure_compact' || (sp.effect.type === 'adventure_report' && sp.effect.kind === 'omen') || (sp.effect.type === 'adventure_travel_buff' && sp.effect.toTown)) {
            setCasting(spellId);
            return;
          }
          const run = () => {
            if (!store.dispatch({ kind: 'CastAdventureSpell', heroId: hero.id, spellId, target: hero.position })) {
              store.toast(`${sp.name}: ${sp.effect.type === 'adventure_report' ? 'Report recorded in your Journal.' : sp.summary}`, 'success');
              if (sp.effect.type === 'adventure_report') store.goto('journal', { tab: 'scout-notes' });
            }
          };
          if (sp.effect.type === 'recall') store.confirm(`Cast ${sp.name}?`, `${hero.name} returns to the nearest town you own and ends the day's movement there.`, 'Cast', run);
          else if (sp.effect.type === 'adventure_camp') store.confirm(`Make camp?`, `End ${hero.name}'s movement for today. Gain ${sp.effect.mana} mana at dawn only if no battle interrupts the camp.`, 'Make camp', run);
          else if (sp.effect.type === 'adventure_anchor') store.confirm(`Cast ${sp.name}?`, hero.libraryAdventure?.anchor && hero.libraryAdventure.anchor.untilDay > state.day ? 'Return to the marked anchor and end today’s movement.' : 'Mark this tile as your return anchor for two days.', 'Cast', run);
          else run();
        },
      },
    });
  };

  // Selecting another hero keeps every hero's journey: coming back to one shows its route again.
  const selectHero = (h: HeroState) => {
    if (state.coalition && h.ownerId !== state.activePlayerId && store.dispatch({ kind: 'SelectCoalitionSeat', playerId: h.ownerId })) return;
    store.selectedHeroId = h.id;
    ctrl.current?.focus(h.position);
    store.notify();
  };

  /** The selected hero's remaining route, quoted now from where it stands (the quote MoveHero commits: voyages included). */
  const journeyRoute = selected && target ? travelRoute(catalog, state, selected.id, target) : null;
  const journeyQuote = journeyRoute?.quote ?? null;
  const journeyTransition = selected && journeyQuote?.reachable && journeyQuote.transition && journeyQuote.path.length === 0 ? transitionPrompt(catalog, state, selected.id, journeyQuote.transition) : null;
  const routeSig = selected && journeyQuote && journeyQuote.reachable && journeyQuote.path.length > 0 ? routeSignature(selected.position, journeyQuote) : null;
  const seenKey = selected ? `${state.matchId}|${playerId}|${selected.id}` : '';
  const seenSig = seenKey ? store.routeSeen.get(seenKey) : undefined;
  // Not the rest of the route the player last saw: a blocker came into view, the costs changed, the hero was carried off.
  const rerouted = !!routeSig && !!seenSig && routeChanged(seenSig, routeSig);
  useEffect(() => {
    if (seenKey && routeSig && !store.routeSeen.has(seenKey)) store.routeSeen.set(seenKey, routeSig);
  }, [seenKey, routeSig, store]);

  /** An explicit choice of destination: replaces this hero's journey only. A hover never does. */
  const planJourney = (heroId: string, c: HexCoord) => {
    session.planJourney(heroId, c, playerId);
    store.routeSeen.delete(`${state.matchId}|${playerId}|${heroId}`);
    store.notify();
  };
  const cancelJourney = () => {
    if (!selected) return;
    session.cancelJourney(selected.id, playerId);
    store.routeSeen.delete(seenKey);
    store.notify();
  };

  // ------------------------------------------------------------ hero ships
  const openShip = (shipId: string) => {
    setShipPanel(shipId);
    setLandingPick(false);
  };
  const closeShip = () => {
    setShipPanel(null);
    setLandingPick(false);
  };
  /** DisembarkHero onto a chosen shore (the panel's list or a highlighted tile); the rules' quote decides. */
  const landAt = (heroId: string, land: HexCoord) => {
    if (!store.dispatch({ kind: 'DisembarkHero', heroId, landCoord: { q: land.q, r: land.r } })) {
      store.toast('Ashore: the empty ship stays at anchor.', 'success');
      closeShip();
    }
  };
  /** Boarding a hostile ship is always confirmed by the player first (never automatic). */
  const attackShip = (a: ShipAction) => {
    if (!a.command || a.command.kind !== 'AttackShip') return;
    const cmd = a.command;
    const foe = state.heroes[state.world.ships?.[cmd.targetShipId]?.heroId ?? ''];
    store.confirm(`${a.label}?`, `A boarding battle on the two decks against ${foe?.name ?? 'the enemy crew'}. ${a.detail ?? ''}`.trim(), 'Board', () => {
      if (!store.dispatch(cmd)) closeShip();
    }, { danger: true });
  };
  const routeToShip = (to: HexCoord) => {
    if (!selected) return;
    planJourney(selected.id, to);
    closeShip();
  };

  const tryMove = (dest: HexCoord) => {
    if (!selected) return;
    // The quote MoveHero commits: over the water, the route stops at its embark / disembark step.
    const q = quoteTravel(catalog, state, selected.id, dest);
    if (!q.reachable) {
      store.toast(q.reason ?? 'No route', 'error');
      return;
    }
    if (q.transition && q.path.length === 0) {
      confirmTransition(store, selected.id, q.transition);
      return;
    }
    if (q.endsInEncounter && q.stopIndex === q.path.length - 1) {
      store.openOverlay({ kind: 'encounter', heroId: selected.id, dest });
      return;
    }
    if (q.stopIndex < 0) {
      store.toast(`${selected.name} has no movement left today`, 'error');
      return;
    }
    // The journey stays planned: the session clears it only once the hero has actually arrived.
    store.dispatch({ kind: 'MoveHero', heroId: selected.id, destination: dest });
  };

  /**
   * Continue journey (the button, Space or a second click on the destination): as far as today's
   * movement and the encounter rules allow, never past a battle or a choice. A route that changed
   * since the player last saw it is shown first; the next Continue follows it.
   */
  const continueJourney = () => {
    if (!selected || !target || !humanTurn || store.presentationBusy) return;
    if (rerouted && routeSig) {
      store.routeSeen.set(seenKey, routeSig);
      store.toast(`${selected.name}'s route has changed — the new way is shown. Continue again to follow it.`, 'info');
      store.notify();
      return;
    }
    store.routeSeen.delete(seenKey);
    tryMove(target);
  };

  const onTileClick = (c: HexCoord, button: number) => {
    const s = store.session?.state;
    if (!s) return;
    // Right-click inspects a tile; it never cancels a journey (Cancel journey does).
    if (button === 2) {
      setPinned((p) => (p && hexEquals(p, c) ? null : c));
      return;
    }
    if (!humanTurn) return;
    if (casting) {
      const sel = playerHeroes(s, playerId).find((h) => h.id === store.selectedHeroId) ?? null;
      if (!sel) return;
      const q = quoteAdventureSpell(catalog, s, playerId, sel.id, casting, c);
      if (!q.legal) {
        store.toast(q.reason ?? 'Cannot cast there', 'error');
        return;
      }
      if (!store.dispatch({ kind: 'CastAdventureSpell', heroId: sel.id, spellId: casting, target: c })) {
        store.toast(`${q.spell?.name ?? 'Spell'}: ${q.spell?.effect.type === 'reveal_radius' ? 'the area is revealed until the next dawn' : q.spell?.effect.type === 'adventure_report' ? 'Report recorded in your Journal.' : q.spell?.summary ?? 'Cast successfully'}`);
        if (q.spell?.effect.type === 'adventure_report') store.goto('journal', { tab: 'scout-notes' });
        setCasting(null);
      }
      return;
    }
    const mine = Object.values(s.heroes).filter((h)=>h.status==='active'&&allied(s,h.ownerId,playerId)).find((h) => hexEquals(h.position, c));
    const sel = playerHeroes(s, playerId).find((h) => h.id === store.selectedHeroId) ?? null;
    // Hero ships: while Disembark waits for a shore, a highlighted shore lands there (the quote decides; water does nothing).
    if (picking && sel && heroShip(s, sel.id)) {
      if (landingCells(catalog, s, sel.id).some((x) => hexEquals(x, c))) {
        landAt(sel.id, c);
        return;
      }
      if (!hexEquals(sel.position, c)) {
        store.toast('Pick one of the highlighted shores beside the ship (or cancel the landing)', 'info');
        return;
      }
    }
    // A ship the viewer can see: its inspector (the selected hero's own ship included); the journey's own target continues it.
    const shipHere = navalOn(s) ? visibleShipAt(s, playerId, c, visibleCells(catalog, s, playerId)) : null;
    if (shipHere && !(target && hexEquals(target, c))) {
      // Preview a voyage on the first click, then use the normal travel/boarding
      // quote on the second. The inspector remains available for ship details.
      if (sel && !hexEquals(sel.position, c) && !shipHere.heroId) {
        closeShip();
        planJourney(sel.id, c);
        return;
      }
      const aboard = shipHere.heroId ? s.heroes[shipHere.heroId] : undefined;
      if (aboard && allied(s, aboard.ownerId, playerId) && sel?.id !== aboard.id) selectHero(aboard);
      openShip(shipHere.shipId);
      return;
    }
    // A known shipwreck: its panel (Explore / Leave, or Sail beside it); a ship never sails into a wreck's hex.
    const wreckHere = wreckAt(catalog, s, playerId, c);
    if (wreckHere) {
      closeShip();
      setWreckPanel(wreckHere);
      return;
    }
    // Recruitment caravans: a tile with the viewer's own wagon asks which actor the click meant
    // (a hero there, the caravan, or the selected hero's route) — never silently the wrong one.
    const myWagons = caravansAt(s, c).filter((k) => k.ownerId === playerId);
    if (myWagons.length > 0 && !(target && hexEquals(target, c))) {
      const canPlan = !!sel && !hexEquals(sel.position, c);
      if (!mine && myWagons.length === 1 && !canPlan) {
        store.openOverlay({ kind: 'caravan-tracker', caravanId: myWagons[0]!.id });
        return;
      }
      store.openOverlay({ kind: 'actor-picker', coord: c, plan: canPlan ? () => planJourney(sel!.id, c) : null });
      return;
    }
    // Next to the selected hero: meet and trade troops (the exchange dialog).
    if (mine && sel && mine.ownerId === sel.ownerId && mine.id !== sel.id && axialDistance(mine.position, sel.position) === 1) {
      store.openOverlay({ kind: 'transfer', townId: null, heroId: sel.id, otherHeroId: mine.id });
      return;
    }
    if (mine && (!sel || mine.id !== sel.id)) {
      selectHero(mine);
      return;
    }
    // The town's own tile while the hero stands at its gate: open the town.
    if (sel && isTownTile(catalog, s, c)) {
      const at = siteAt(catalog, s, c);
      const townId = at?.def.kind.type === 'town' ? at.def.kind.townId : null;
      if (townId && heroInTown(catalog, s, sel, townId) && s.towns[townId]?.ownerId === playerId) {
        store.goto('town', { townId });
        return;
      }
    }
    if (sel && hexEquals(sel.position, c)) {
      const town = townAtHero(catalog, s, sel);
      if (town && town.ownerId === playerId) {
        store.goto('town', { townId: town.id });
        return;
      }
      const site = siteAt(catalog, s, c);
      if (site && site.def.kind.type === 'activation' && !site.state.activated) {
        store.openOverlay({ kind: 'activate', heroId: sel.id, siteId: site.def.id });
        return;
      }
      if (site && site.def.kind.type === 'creature_camp') {
        store.openOverlay({ kind: 'camp', heroId: sel.id, siteId: site.def.id });
        return;
      }
      if (site && site.def.kind.type === 'sluice') {
        store.openOverlay({ kind: 'sluice', heroId: sel.id, siteId: site.def.id });
        return;
      }
      if (site && site.def.kind.type === 'map_event' && !site.state.claimed) {
        store.openOverlay({ kind: 'map-event', heroId: sel.id, siteId: site.def.id });
        return;
      }
      if (site && site.def.kind.type === 'treasure_chest' && !site.state.claimed) {
        store.openOverlay({ kind: 'chest', heroId: sel.id, siteId: site.def.id });
        return;
      }
      if (site && site.def.kind.type === 'quest_hut') {
        store.openOverlay({ kind: 'quest-hut', heroId: sel.id, siteId: site.def.id });
        return;
      }
      store.goto('hero', { heroId: sel.id });
      return;
    }
    if (!sel) return;
    if (target && hexEquals(target, c)) continueJourney();
    else {
      planJourney(sel.id, c);
      store.showHint('route_planning');
    }
  };

  // Keep callbacks fresh for the controller (created once).
  const clickRef = useRef(onTileClick);
  clickRef.current = onTileClick;

  const factory = useCallback<SceneFactory<AdventureSceneController>>(
    (lib, engine, canvas) =>
      new lib.AdventureSceneController(engine, canvas, {
        onTileClick: (c, b) => clickRef.current(c, b),
        onTileHover: (c) => setHover(c),
        onDrag: (d) => setDragging(d),
      }),
    [],
  );

  const endDay = () => {
    const s = store.session?.state;
    if (!s) return;
    const canStillMove = playerHeroes(s, playerId).some((h) => reachableTiles(catalog, s, h.id).size > 0);
    // Journeys are kept over the night; nobody moves by themselves at dawn.
    const go = () => {
      store.dispatch({ kind: 'EndTurn' });
    };
    if (canStillMove && store.prefs.confirmEndDayWithMovement) {
      store.confirm('End the day?', 'Some heroes can still move today.', 'End Day', go);
    } else go();
  };

  // Esc closes the ship inspector (and its shore pick) before it would open the pause menu.
  useEffect(() => {
    if (!shipPanel) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || store.overlays.length || store.story.length) return;
      e.preventDefault();
      e.stopPropagation();
      if (landingPick) setLandingPick(false);
      else setShipPanel(null);
    };
    window.addEventListener('keydown', onEsc, true);
    return () => window.removeEventListener('keydown', onEsc, true);
  }, [shipPanel, landingPick, store]);
  // The inspected ship left the map (wrecked, or out of sight): the panel closes.
  const shipGone = !!shipPanel && !visibleShipAt(state, playerId, state.world.ships?.[shipPanel]?.coord ?? { q: -1, r: -1 }, view.visible);
  useEffect(() => {
    if (shipGone) {
      setShipPanel(null);
      setLandingPick(false);
    }
  }, [shipGone]);

  // Esc while choosing a spell's tile cancels the spell (capture phase: before Esc opens the pause menu).
  useEffect(() => {
    if (!casting) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || store.overlays.length || store.story.length) return;
      e.preventDefault();
      e.stopPropagation();
      setCasting(null);
    };
    window.addEventListener('keydown', onEsc, true);
    return () => window.removeEventListener('keydown', onEsc, true);
  }, [casting, store]);

  // Keyboard: camera pan/zoom, Space = continue along path, Enter = end day, Tab = next hero.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (store.overlays.length || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
      // Enter and Space on a focused button or link press that control, never a map shortcut as well
      // (a keyboard player opening a caravan or a hero from the sidebar must not end the day).
      if ((e.key === 'Enter' || e.key === ' ') && t.closest?.('button, a[href], summary, [role="button"]')) return;
      if (store.story.length > 0) return;
      const c = ctrl.current;
      const k = e.key;
      const is = (action: string) => matches(store.prefs, action, k);
      if (c && (k === 'ArrowLeft' || is('pan_left'))) c.pan(-1.2, 0);
      else if (c && (k === 'ArrowRight' || is('pan_right'))) c.pan(1.2, 0);
      else if (c && (k === 'ArrowUp' || is('pan_up'))) c.pan(0, 1.2);
      else if (c && (k === 'ArrowDown' || is('pan_down'))) c.pan(0, -1.2);
      else if (c && is('zoom_in')) c.zoom(-2);
      else if (c && is('zoom_out')) c.zoom(2);
      else if (is('continue_move') && target && humanTurn) {
        e.preventDefault();
        // A held key repeats: one press, one move. Nothing new while the last walk still plays.
        if (!e.repeat) continueJourney();
      } else if (is('end_day') && humanTurn) {
        e.preventDefault();
        endDay();
      } else if (is('next_hero') && heroes.length > 1) {
        e.preventDefault();
        const i = heroes.findIndex((h) => h.id === selected?.id);
        selectHero(heroes[(i + 1) % heroes.length]!);
      } else if (is('center_hero') && selected && c) c.focus(selected.position);
      else if (is('interventions') && interventionsOn) {
        e.preventDefault();
        store.openOverlay({ kind: 'interventions' });
      } else if (is('open_spells') && selected) {
        e.preventDefault();
        openSpells();
      } else return;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const interventionsOn = interventionsFor(catalog, state, playerId).length > 0;
  const weeklyEvent = state.world.weeklyEventId ? catalog.weeklyEvents?.[state.world.weeklyEventId] : undefined;
  const relicCond = scenarioMission(catalog, state)?.victoryCondition;
  const relicState = relicCond?.type === 'hold_site' ? state.world.sites[relicCond.siteId] : undefined;
  const income = dailyIncome(catalog, state, playerId);
  const day = dayLabel(state);
  const objectives = missionObjectiveDefs(catalog, state).filter((o) => o.category === 'primary');
  const info = pinned ?? hover;
  const cursorChoice = useMemo(
    () => adventureCursor(catalog, state, playerId, selected, hover, { humanTurn, casting, dragging }),
    [catalog, state, playerId, selected, hover, humanTurn, casting, dragging],
  );
  const sceneCursor = cursorCss(cursorChoice.id, { enabled: store.prefs.gameCursors });
  // Beyond today's movement: the day the hero gets there, beside the cursor (owner request 2026-10-14).
  // It follows the pointer through a ref (no re-render per mouse move).
  const pointerAt = useRef<{ x: number; y: number } | null>(null);
  const daysRef = useRef<HTMLDivElement | null>(null);
  const placeDays = () => {
    const el = daysRef.current;
    const p = pointerAt.current;
    if (!el) return;
    if (!p) {
      el.style.visibility = 'hidden';
      return;
    }
    el.style.visibility = '';
    // Just right of the 32 px cursor (its hotspot is the centre), on its lower half.
    el.style.transform = `translate(${Math.round(p.x + 17)}px, ${Math.round(p.y + 2)}px)`;
  };
  const daysBadge = useCallback((el: HTMLDivElement | null) => {
    daysRef.current = el;
    placeDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const activeName = state.players[state.activePlayerId]?.name ?? state.activePlayerId;
  const mission = scenarioMission(catalog, state);
  // The selected hero stands on a sluice: the map offers to operate it (the dialog shows what changes, or why not).
  const standing = selected ? siteAt(catalog, state, selected.position) : undefined;
  const sluiceHere = standing && standing.def.kind.type === 'sluice' ? standing : undefined;

  return (
    <div
      className="adventure"
      onPointerMove={(e) => {
        pointerAt.current = { x: e.clientX, y: e.clientY };
        placeDays();
      }}
      onPointerLeave={() => {
        pointerAt.current = null;
        placeDays();
      }}
    >
      <SceneViewport factory={factory} onController={onController} className="adventure__scene" label="Adventure map. Click a tile to preview a route, click again to move." cursor={sceneCursor} />
      {cursorChoice.days ? (
        <div ref={daysBadge} className="adv-days num" data-testid="route-days" aria-hidden="true" title={`Reached on day ${cursorChoice.days} (today is day 1)`}>
          {cursorChoice.days}
        </div>
      ) : null}

      <header className="adv-top">
        <div className="adv-top__mission">
          <div className="adv-top__name">{mission?.name ?? state.scenario.name}</div>
          <div className="dim small">{state.scenario.campaignId ? catalog.campaigns[state.scenario.campaignId]?.name : 'Skirmish'}</div>
        </div>
        <ResourceBar wallet={player.wallet} income={income} />
        {weeklyEvent ? (
          <span className="weekly-chip" title={`${weeklyEvent.name}: ${weeklyEvent.summary}`} data-testid="weekly-event">
            <Chip tone="info">{weeklyEvent.name}</Chip>
          </span>
        ) : null}
        {relicCond?.type === 'hold_site' ? (
          <span title="Hold the relic shrine at enough dawns in a row to win" data-testid="relic-status">
            <Chip tone={relicState?.owner === playerId ? 'ok' : relicState?.owner ? 'bad' : 'muted'}>
              Relic: {relicState?.owner ? `${relicState.owner === playerId ? 'you' : (state.players[relicState.owner]?.name ?? '?')} ${relicState.heldDays ?? 0}/${relicCond.days}` : `unclaimed (0/${relicCond.days})`}
            </Chip>
          </span>
        ) : null}
        <div className="daybox daybox--large" title={`Day ${day.day} of the mission`}>
          <Icon name="hourglass" />
          <div>
            <div>{day.text}</div>
            <div className="faint small">Day {day.day}</div>
          </div>
        </div>
      </header>

      {!humanTurn && state.outcome.status === 'running' && !state.battle ? (
        <div className="turn-banner panel" role="status" data-testid="ai-turn">
          <span className="spinner" /> {activeName} is taking their turn…
        </div>
      ) : null}
      {dayBanner ? (
        <div className="day-banner" role="status">
          {dayBanner}
        </div>
      ) : null}
      {coins ? <Burst key={coins.key} kind="coins" className="burst--resbar" style={{ left: coins.x, top: coins.y }} onDone={() => setCoins(null)} /> : null}

      {/* 1.1.0 command sidebar (concept 04): minimap, heroes and towns, the selected hero and army, commands and End Day in one stable place. */}
      <aside className="adv-command" aria-label="Command">
        {store.prefs.minimap ? (
          <div className="adv-command__minimap adv-minimap">
            <Minimap catalog={catalog} state={state} playerId={playerId} onPick={(c) => ctrl.current?.focus(c)} footprint={() => ctrl.current?.viewFootprint() ?? null} />
          </div>
        ) : null}
        <section className="adv-command__group" aria-label="Heroes">
          <div className="adv-command__label">Heroes</div>
          <div className="adv-list adv-command__heroes">
            {heroes.map((h) => {
              const budget = movementBudget(catalog, state, h);
              return (
                <button key={h.id} type="button" className={`hero-tab ${selected?.id === h.id ? 'is-selected' : ''}`} onClick={() => selectHero(h)} onDoubleClick={() => store.goto('hero', { heroId: h.id })} aria-pressed={selected?.id === h.id} aria-label={`${h.name}, ${h.movementPoints} of ${Math.max(budget.total, h.movementPoints)} movement`} data-testid={`hero-tab-${h.id}`}>
                  <HeroPortrait catalog={catalog} definitionId={h.definitionId} name={h.name} size="3rem" />
                  <span className="hero-tab__bars">
                    <Bar value={h.movementPoints} max={Math.max(budget.total, h.movementPoints)} kind="move" label={`${h.name} movement`} />
                    <Bar value={h.mana} max={Math.max(1, maxMana(catalog, state, h))} kind="mana" label={`${h.name} mana`} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        {selected ? (
          <section className="adv-command__hero" aria-label={`Selected hero: ${selected.name}`}>
            <button type="button" className="adv-command__portrait" onClick={() => store.goto('hero', { heroId: selected.id })} title={`Open ${selected.name} (H)`} aria-label={`Open ${selected.name}`}>
              <HeroPortrait catalog={catalog} definitionId={selected.definitionId} name={selected.name} size="100%" />
            </button>
            <div className="adv-command__hero-text">
              <div className="adv-command__hero-name">{selected.name}</div>
              <div className="adv-command__meter" title="Movement points left today">
                <Icon name="movement" className="inline-icon" />
                <span className="num">
                  {selected.movementPoints}/{Math.max(movementBudget(catalog, state, selected).total, selected.movementPoints)}
                </span>
              </div>
              <Bar value={selected.movementPoints} max={Math.max(movementBudget(catalog, state, selected).total, selected.movementPoints)} kind="move" label="Movement" />
              <div className="adv-command__meter" title="Spell points">
                <Icon name="mana" className="inline-icon" />
                <span className="num">
                  {selected.mana}/{Math.max(1, maxMana(catalog, state, selected))}
                </span>
              </div>
              <Bar value={selected.mana} max={Math.max(1, maxMana(catalog, state, selected))} kind="mana" label="Spell points" />
              {navalOn(state) && heroShip(state, selected.id) ? (
                <Button size="small" icon="ship" className="adv-command__aboard" onClick={() => openShip(heroShip(state, selected.id)!.shipId)} title={`${selected.name} is aboard a ship — inspect it`} data-testid="hero-aboard">
                  Aboard
                </Button>
              ) : null}
            </div>
            <div className="adv-command__army">
              <ArmyStrip catalog={catalog} army={selected.army} label={`${selected.name}'s army`} onSlot={() => store.goto('hero', { heroId: selected.id })} onInfo={(creatureId) => store.openOverlay({ kind: 'stack-info', creatureId })} testId="adv-army" />
            </div>
          </section>
        ) : null}
        <section className="adv-command__group" aria-label="Towns">
          <div className="adv-command__label">Towns</div>
          <div className="adv-list adv-command__towns">
            {Object.values(state.towns)
              .filter((t) => allied(state, t.ownerId, playerId))
              .map((t) => (
                <button key={t.id} type="button" className="town-tab" onClick={() => { if (state.coalition && t.ownerId && t.ownerId !== state.activePlayerId && store.dispatch({kind:'SelectCoalitionSeat',playerId:t.ownerId})) return; store.goto('town', { townId: t.id }); }} onContextMenu={(e) => { e.preventDefault(); ctrl.current?.focus(t.coord); }} title={`Enter ${t.name} (right-click: show on the map)`} data-testid={`town-tab-${t.id}`}>
                  <Icon name="town" />
                  <span>{t.name}</span>
                  {t.buildUsedDay !== state.day ? (
                    <span className="town-tab__badge" title="A building can be constructed today" aria-label="A building can be constructed today" data-testid={`town-build-${t.id}`}>
                      <Icon name="build" />
                    </span>
                  ) : null}
                </button>
              ))}
          </div>
        </section>
        <CaravanSidebar onFocus={(at) => ctrl.current?.focus(at)} />
        {navalOn(state) ? (
          <ShipSidebar
            onInspect={(shipId, at) => {
              ctrl.current?.focus(at);
              openShip(shipId);
            }}
          />
        ) : null}
        <nav className="adv-command__grid adv-bottom__tools" aria-label="Commands">
          <Button icon="hero" onClick={() => selected && store.goto('hero', { heroId: selected.id })} disabled={!selected} disabledReason="No hero selected" title="Hero (H)">
            Hero
          </Button>
          <Button icon="town" onClick={() => { const t = Object.values(state.towns).find((x) => x.ownerId === playerId); if (t) store.goto('town', { townId: t.id }); }} title="Town (T)">
            Town
          </Button>
          <Button icon="pantheon" onClick={() => store.goto('pantheon')} title="Pantheon (P)">
            Pantheon
          </Button>
          {interventionsOn ? (
            <Button icon="favor" onClick={() => store.openOverlay({ kind: 'interventions' })} title="Divine interventions (I)" data-testid="open-interventions">
              Miracles
            </Button>
          ) : null}
          <Button icon="journal" onClick={() => store.goto('journal')} title="Journal (J)">
            Journal
          </Button>
          <Button icon="spell" onClick={openSpells} disabled={!selected} disabledReason="No hero selected" title="Spells (C)" data-testid="open-spells">
            Spells
          </Button>
          <Button icon="bestiary" onClick={() => store.goto('encyclopedia')} title="Encyclopedia (B)">
            Bestiary
          </Button>
          <Button icon="pause" onClick={() => store.openOverlay({ kind: 'pause' })} title="Menu (Esc)">
            Menu
          </Button>
        </nav>
        <div className="adv-endday">
          <Button variant="primary" size="large" icon="hourglass" className="btn--endday" onClick={endDay} disabled={!humanTurn || !!pending} disabledReason={pending ? 'Resolve the pending level-up first' : 'Wait for the other side'} data-testid="end-day">
            End Day
          </Button>
        </div>
      </aside>

      {/* Over the map, at the left: what the rivals did, the inspected tile, the mission's objectives. */}
      <aside className="adv-left adv-info">
        {wreckPanel ? (
          <WreckPanel
            siteId={wreckPanel}
            selectedHeroId={selected?.id ?? null}
            onRoute={(to) => {
              if (selected) planJourney(selected.id, to);
            }}
            onClose={() => setWreckPanel(null)}
          />
        ) : null}
        {shipPanel && !shipGone ? (
          <ShipInspectPanel
            shipId={shipPanel}
            selectedHeroId={selected?.id ?? null}
            picking={picking}
            onPickLanding={(on) => setLandingPick(on)}
            onDisembark={(land) => {
              const ship = state.world.ships?.[shipPanel];
              if (ship?.heroId) landAt(ship.heroId, land);
            }}
            onAttack={attackShip}
            onRoute={routeToShip}
            onClose={closeShip}
          />
        ) : null}
        {(store.rivalSummary && store.rivalSummary.viewerId === playerId) || (store.cityBlessings && store.cityBlessings.viewerId === playerId) || (store.caravanNotes && store.caravanNotes.viewerId === playerId) ? (
          <Panel
            className="adv-rivals"
            title="While you waited"
            headerIcon="hourglass"
            actions={<Button size="small" variant="ghost" icon="close" onClick={() => store.dismissRivalSummary()} aria-label="Close the rivals’ summary" data-testid="rival-summary-close" />}
          >
            {store.rivalSummary && store.rivalSummary.viewerId === playerId ? (
              <ul className="adv-rivals__list" data-testid="rival-summary">
                {store.rivalSummary.lines.map((l) => (
                  <li key={l.playerId} className={l.mine ? 'is-mine' : ''} data-testid={`rival-line-${l.playerId}`}>
                    <span className="dot" style={{ background: state.players[l.playerId]?.color }} aria-hidden="true" />
                    <span>
                      <strong>{l.who}</strong> {l.text}.
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {/* City dedications: one grouped section for every city's weekly blessing (read from the dawn's events). */}
            {store.cityBlessings && store.cityBlessings.viewerId === playerId ? <CityBlessingsSection catalog={catalog} summary={store.cityBlessings.summary} /> : null}
            {/* Recruitment caravans: the viewer's shipments of the night (read from the committed events). */}
            {store.caravanNotes && store.caravanNotes.viewerId === playerId ? (
              <ul className="adv-rivals__list adv-caravans" data-testid="caravan-summary">
                {store.caravanNotes.lines.map((l, i) => (
                  <li key={i} className="is-mine">
                    <Icon name="caravan" className="inline-icon" />
                    <span>{l}.</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>
        ) : null}
        {info ? (
          <Panel className="adv-tile" label={pinned ? 'Tile (pinned)' : 'Tile'}>
            {pinned ? <Button size="small" variant="ghost" icon="close" onClick={() => setPinned(null)} aria-label="Unpin" className="adv-tile__unpin" /> : null}
            <TileInfo store={store} state={state} c={info} hero={selected} />
          </Panel>
        ) : null}
        {state.world.map.templateId === RANDOM_TEMPLATE_ID ? null : (
        <Panel title="Objectives" className="adv-objectives" headerIcon="journal" actions={<Button size="small" onClick={() => store.goto('journal')}>Journal</Button>}>
          <ul className="objective-mini">
            {objectives.map((o) => {
              const raw = state.mission.objectives[o.id]?.status ?? 'locked';
              // A step already achieved before it opens reads as completed (as in the Journal).
              const st = raw === 'locked' && objectiveDoneEarly(catalog, state, o) ? 'completed' : raw;
              if (st === 'locked') return null;
              // An open objective at a campaign site with its own marker (evidence, supplies, evacuation, pact) shows that icon.
              const markerDef = o.markerSiteId && (st === 'active' || st === 'available') ? missionSite(catalog, state, o.markerSiteId) : undefined;
              const icon = markerDef?.marker ? questMarkerIcon(markerDef) : null;
              return (
                <li key={o.id} className={`is-${st}`}>
                  {icon && resolveAsset(icon.id).url ? (
                    <span className="objective-mini__marker" data-testid={`objective-marker-${o.id}`} data-marker={icon.id}>
                      <MarkerIcon assetId={icon.id} label={icon.label} size="1.3rem" />
                    </span>
                  ) : (
                    <Icon name={st === 'completed' ? 'check' : st === 'failed' ? 'close' : 'flag'} className="inline-icon" />
                  )}
                  <span>{o.title}{o.condition.type === 'claim' && st !== 'completed' ? ' — open Journal to claim' : ''}</span>
                  {o.markerSiteId ? (
                    <button type="button" className="link" onClick={() => { const def = missionSite(catalog, state, o.markerSiteId!); if (def && (state.fog[playerId]?.explored[cellIndex(state.world.map, def.coord)] === 1 || state.mission.revealedSiteIds.includes(def.id))) ctrl.current?.focus(def.coord); else store.toast('Location not yet discovered'); }} aria-label={`Show ${o.title} on map`}>
                      <Icon name="eye" className="inline-icon" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <DeadlineTracker />
        </Panel>
        )}
      </aside>

      <footer className="adv-bottom">
        <div className="adv-bottom__status">
          {casting ? (
            <span className="small" data-testid="casting-hint">
              {catalog.spells[casting]?.name}: {catalog.spells[casting]?.effect.type === 'adventure_boatcall' ? 'choose an owned empty ship' : catalog.spells[casting]?.effect.type === 'adventure_compact' ? 'choose an adjacent neutral hiring site' : catalog.spells[casting]?.effect.type === 'adventure_report' ? 'choose a known neutral guard within six hexes' : catalog.spells[casting]?.effect.type === 'adventure_travel_buff' ? 'choose a visited owned town' : 'choose an explored tile'} · Esc to cancel{' '}
              <Button size="small" onClick={() => setCasting(null)}>
                Cancel
              </Button>
            </span>
          ) : journey && selected && journeyQuote && humanTurn ? (
            <JourneyBar
              heroName={selected.name}
              status={journey.status}
              quote={journeyQuote}
              days={journeyRoute?.days ?? null}
              reason={journey.reason}
              transition={journeyTransition}
              rerouted={rerouted}
              shortcut={keyLabel(keyFor(store.prefs, 'continue_move'))}
              busy={store.presentationBusy}
              onContinue={continueJourney}
              onCancel={cancelJourney}
            />
          ) : sluiceHere && selected && humanTurn ? (
            <span className="journey-bar" data-testid="sluice-bar">
              <span className="journey-bar__text small">
                <strong>{selected.name}</strong> stands at {sluiceHere.def.name} · {sluiceHere.state.open ? 'open' : 'closed'}
              </span>
              <Button size="small" variant="primary" icon="swap" onClick={() => store.openOverlay({ kind: 'sluice', heroId: selected.id, siteId: sluiceHere.def.id })} data-testid="sluice-offer">
                {sluiceHere.state.open ? 'Close the sluice…' : 'Open the sluice…'}
              </Button>
            </span>
          ) : null}
        </div>
      </footer>
      {courierHero ? <CourierDialog heroId={courierHero} onClose={() => setCourierHero(null)} /> : null}
    </div>
  );
}
