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
  cellIndex,
  hexEquals,
  missionSite,
  parseHexKey,
  quoteMovement,
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
  axialDistance,
} from '@pr/rules';
import { biomeTerrainCss, miracleLook, spellLook } from '@pr/presentation/core';
import type { AdventureSceneController, AdventureView } from '@pr/presentation';
import { useStore } from '../app/context';
import { adventureCursor } from '../app/cursorContext';
import { cursorCss } from '../assets/cursors';
import { newWeekBannerArt } from '../assets/momentArt';
import { weeklyEventOf } from '../app/moments';
import type { AppStore } from '../app/store';
import { adventurePlaybackFactor, reducedMotion } from '../app/preferences';
import { Burst } from '../components/burst';
import { matches } from '../app/keys';
import { SceneViewport, inspectors, projectors, toPage, type SceneFactory } from '../scene/SceneHost';
import { Button, Chip, Bar, Panel } from '../components/kit';
import { HeroPortrait, MarkerIcon, siteMarkerAsset } from '../components/art';
import { ArmyPreview, ResourceBar } from '../components/game';
import { Icon } from '../assets/icons';
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
  target: HexCoord | null,
  showReach: boolean,
  grid: AdventureView['grid'],
): AdventureView {
  const explored = state.fog[playerId]?.explored ?? [];
  const visible = visibleCells(catalog, state, playerId);
  const map = state.world.map;
  const mission = scenarioMission(catalog, state);
  const sites = (mission?.sites ?? []).map((def) => {
    const st = state.world.sites[def.id];
    const idx = cellIndex(map, def.coord);
    const shown = explored[idx] === 1 || state.mission.revealedSiteIds.includes(def.id);
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
      lit: siteLit(catalog, state, def, st),
      // Key gates show their barrier only to empires without the key.
      open: def.kind.type === 'key_gate' ? (state.players[playerId]?.keys ?? []).includes(def.kind.color) : !!st?.open,
      claimed: !!st?.claimed,
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
      };
    });
  let reachable: HexCoord[] | null = null;
  if (selected && showReach) reachable = [...reachableTiles(catalog, state, selected.id).keys()].map(parseHexKey);
  let path: AdventureView['path'] = null;
  if (selected && target) {
    const q = quoteMovement(catalog, state, selected.id, target);
    if (q.reachable) path = { steps: q.path, stopIndex: q.stopIndex, encounter: q.endsInEncounter };
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
  };
}

// ---------------------------------------------------------------------------
// Minimap
// ---------------------------------------------------------------------------

function Minimap({ catalog, state, playerId, onPick, frame }: { catalog: ContentCatalog; state: MatchState; playerId: string; onPick: (c: HexCoord) => void; frame?: readonly { q: number; r: number }[] | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const map = state.world.map;
  const cell = 7;
  const w = Math.ceil((map.width + map.height / 2) * cell);
  const h = Math.ceil(map.height * cell * 0.87 + cell);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    ctx.fillStyle = '#081222';
    ctx.fillRect(0, 0, w, h);
    const explored = state.fog[playerId]?.explored ?? [];
    for (let r = 0; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        const i = r * map.width + q;
        if (explored[i] !== 1) continue;
        const code = map.terrain[i] ?? 'p';
        const terrain = ({ p: 'plains', f: 'forest', r: 'rough', s: 'marsh', m: 'mountain', w: 'water' } as const)[code as 'p'] ?? 'plains';
        ctx.fillStyle = biomeTerrainCss(terrain, map.biome);
        const x = (q + r / 2) * cell;
        const y = r * cell * 0.87;
        ctx.fillRect(x, y, cell, cell);
      }
    }
    for (const t of Object.values(state.towns)) {
      if (explored[cellIndex(map, t.coord)] !== 1) continue;
      ctx.fillStyle = t.ownerId ? (state.players[t.ownerId]?.color ?? '#aaa') : '#aaa';
      const x = (t.coord.q + t.coord.r / 2) * cell;
      const y = t.coord.r * cell * 0.87;
      ctx.fillRect(x - 2, y - 2, cell + 4, cell + 4);
      ctx.strokeStyle = '#f5e4b7';
      ctx.strokeRect(x - 2, y - 2, cell + 4, cell + 4);
    }
    const vis = visibleCells(catalog, state, playerId);
    for (const hero of Object.values(state.heroes)) {
      if (hero.status !== 'active') continue;
      if (hero.ownerId !== playerId && !vis.has(cellIndex(map, hero.position))) continue;
      ctx.fillStyle = state.players[hero.ownerId]?.color ?? '#fff';
      const x = (hero.position.q + hero.position.r / 2) * cell + cell / 2;
      const y = hero.position.r * cell * 0.87 + cell / 2;
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();
    }
  }, [catalog, state, playerId, map, w, h]);
  // The part of the map the camera shows (a trapezoid: the view is tilted).
  const framePoints = frame?.map((p) => `${((p.q + p.r / 2) * cell + cell / 2).toFixed(1)},${(p.r * cell * 0.87 + cell / 2).toFixed(1)}`).join(' ');
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
        const px = ((e.clientX - rect.left) / rect.width) * w;
        const py = ((e.clientY - rect.top) / rect.height) * h;
        const r = Math.round(py / (cell * 0.87) - 0.5);
        const q = Math.round(px / cell - r / 2 - 0.5);
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
  const quote = hero && !hexEquals(hero.position, c) ? quoteMovement(catalog, state, hero.id, c) : null;
  return (
    <div className="tile-info">
      <div className="tile-info__head">
        {site ? (
          <MarkerIcon
            assetId={siteMarkerAsset(site.def.kind, {
              owner: (() => {
                const o = site.def.kind.type === 'town' ? state.towns[site.def.kind.townId]?.ownerId : site.state.owner;
                return o ? (o === playerId ? 'self' : 'other') : null;
              })(),
              done: siteDone(site.def.kind.type, site.state),
            })}
          />
        ) : other ? (
          <MarkerIcon assetId={other.ownerId === playerId ? 'icon.marker.hero' : 'icon.marker.enemy-hero'} />
        ) : null}
        <div className="tile-info__title">{site ? site.def.name : terrainLabel(state, c)}</div>
      </div>
      <div className="dim small">
        {site ? `${siteKindLabel(site.def)} · ${terrainLabel(state, c)}` : `Tile ${c.q}, ${c.r}`}
        {!vis ? ' · remembered' : ''}
      </div>
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
      {site?.def.guard && !site.state.cleared ? (
        <div className="tile-info__guard">
          <div>
            <Icon name="attack" className="inline-icon" /> <strong>{site.def.guard.label}</strong>
          </div>
          <ArmyPreview catalog={catalog} stacks={site.state.guard ?? site.def.guard.army} onInfo={(creatureId, count) => store.openOverlay({ kind: 'stack-info', creatureId, count })} testId="guard-army" />
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
      {site?.def.kind.type === 'creature_camp' ? (
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
      {site?.def.kind.type === 'map_event' ? <div className="small">{site.state.claimed ? 'Already happened' : 'Something awaits the first hero to arrive'}</div> : null}
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
      {site?.def.kind.type === 'pickup' ? <div className="small">{site.state.claimed ? 'Already collected' : 'Uncollected'}</div> : null}
      {site?.def.kind.type === 'gate' ? <div className="small">{site.state.open ? 'Open' : 'Sealed'}</div> : null}
      <NewSiteInfo site={site} hero={hero} />
      {site?.def.kind.type === 'portal' ? (
        <div className="small" data-testid="portal-info">
          Stop on it to step out of its twin at once, at no movement cost. Blocked while a hero stands on the twin. {site.state.visitedBy.includes(playerId) ? 'You have used it.' : 'Its far side is unknown until you go through.'}
        </div>
      ) : null}
      {other && (vis || other.ownerId === playerId) ? (
        <div className="small">
          <Icon name="hero" className="inline-icon" /> {other.name} ({other.ownerId === playerId ? 'yours' : (state.players[other.ownerId]?.name ?? 'hostile')})
          {other.ownerId !== playerId ? (
            <ArmyPreview catalog={catalog} stacks={other.army.slots.filter((s): s is NonNullable<typeof s> => !!s)} onInfo={(creatureId, count) => store.openOverlay({ kind: 'stack-info', creatureId, count })} testId="foe-army" />
          ) : null}
          {other.ownerId !== playerId && other.monster && hero ? (
            (() => {
              const r = quoteNeutralReaction(catalog, state, hero.id, other.position);
              return r.kind ? <div>{r.kind === 'join' ? 'They would rather join your army than fight it.' : 'They will flee from your army rather than fight.'}</div> : null;
            })()
          ) : null}
        </div>
      ) : null}
      {quote ? (
        quote.reachable ? (
          <div className="small">
            Route: {quote.totalCost} movement {quote.reachesDestinationToday ? <Chip tone="ok">Today</Chip> : <Chip tone="warn">Beyond today</Chip>}
            {quote.endsInEncounter ? <Chip tone="bad">Battle</Chip> : null}
          </div>
        ) : (
          <div className="small danger">{quote.reason}</div>
        )
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
// Screen
// ---------------------------------------------------------------------------

export function AdventureScreen() {
  const store = useStore();
  const session = store.session!;
  const state = session.state;
  const catalog = store.catalog;
  const player = humanPlayer(state);
  const playerId = player.id;
  const heroes = playerHeroes(state, playerId);
  const selected = heroes.find((h) => h.id === store.selectedHeroId) ?? heroes[0] ?? null;
  const [target, setTarget] = useState<HexCoord | null>(null);
  const [hover, setHover] = useState<HexCoord | null>(null);
  const [dragging, setDragging] = useState(false);
  /** The camera's ground footprint for the minimap frame (polled; the camera moves in the render loop). */
  const [viewFrame, setViewFrame] = useState<{ q: number; r: number }[] | null>(null);
  useEffect(() => {
    if (!store.prefs.minimap) return;
    let last = '';
    const t = setInterval(() => {
      const f = ctrl.current?.viewFootprint() ?? null;
      const key = f ? f.map((p) => `${p.q.toFixed(2)},${p.r.toFixed(2)}`).join(';') : '';
      if (key !== last) {
        last = key;
        setViewFrame(f);
      }
    }, 150);
    return () => clearInterval(t);
  }, [store.prefs.minimap]);
  const [pinned, setPinned] = useState<HexCoord | null>(null);
  const [dayBanner, setDayBanner] = useState<string | null>(null);
  /** The coin shower over the Gold counter (Tithe of the Faithful, the Feathered Serpent's gift). */
  const [coins, setCoins] = useState<{ key: number; x: number; y: number } | null>(null);
  /** Adventure spell awaiting a target tile (Divine Sight). */
  const [casting, setCasting] = useState<string | null>(null);
  const ctrl = useRef<AdventureSceneController | null>(null);
  const humanTurn = state.activePlayerId === playerId && !state.battle && state.outcome.status === 'running';
  const pending = state.pendingDecisions.find((d) => state.heroes[d.heroId]?.ownerId === playerId);
  const grid = store.prefs.hexOverlay;

  useEffect(() => {
    if (selected && store.selectedHeroId !== selected.id) store.selectedHeroId = selected.id;
  }, [selected, store]);

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

  const view = useMemo(() => buildView(catalog, state, playerId, selected, humanTurn ? target : null, humanTurn, grid), [catalog, state, playerId, selected, target, humanTurn, grid]);

  // The controller can arrive after the first render (the 2D layer loads on demand),
  // so it reads the latest view and selection from refs when it does.
  const viewRef = useRef(view);
  viewRef.current = view;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    ctrl.current?.update(view);
  }, [view]);

  // A different game (load, restart) abandons any pending readiness beat of the old one.
  const sessionRef = store.session;
  useEffect(() => () => ctrl.current?.cancelPreparations(), [sessionRef]);

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
          setDayBanner(`Week ${day.week} · Day ${day.dayOfWeek}${day.dayOfWeek === 1 ? (ev ? ` — ${ev.name}: ${ev.summary}` : ' — a new week: creatures grow') : ''}`);
          setTimeout(() => setDayBanner(null), ev ? 3600 : 2200);
        }
        if (ev) store.showHint('weekly_event');
      }
      if (!c) {
        afterMoves(moves);
        return;
      }
      const teleports = events.filter((e) => e.kind === 'HeroTeleported');
      const played = new Set<number>();
      for (const m of moves) {
        if (m.kind !== 'HeroMoved') continue;
        const hero = store.session?.state.heroes[m.heroId];
        const mine = hero?.ownerId === store.session?.humanPlayerId;
        const vis = store.session ? visibleCells(catalog, store.session.state, store.session.humanPlayerId) : new Set<number>();
        // A portal at the end of this walk: the hero sinks into it and rises from its twin.
        const tpIndex = teleports.findIndex((t, i) => !played.has(i) && t.kind === 'HeroTeleported' && t.heroId === m.heroId && !!t.viaSiteId);
        const tp = tpIndex >= 0 ? teleports[tpIndex] : undefined;
        if (tp) played.add(tpIndex);
        const teleportTo = tp && tp.kind === 'HeroTeleported' ? tp.to : undefined;
        const seen = mine || m.path.some((p) => vis.has(cellIndex(store.session!.state.world.map, p)));
        if (!seen) continue;
        if (mine) store.audio?.heroSteps(true);
        try {
          // The viewer's own walk keeps its route on the ground, cleared step by step.
          await c.playHeroMove(m.heroId, m.path, adventurePlaybackFactor(store.prefs, source === 'ai'), true, mine || (teleportTo && vis.has(cellIndex(store.session!.state.world.map, teleportTo))) ? teleportTo : undefined, mine);
        } finally {
          if (mine) store.audio?.heroSteps(false);
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
      await playMagic(c, events, source);
      const blocked = events.find((e) => e.kind === 'PortalBlocked');
      if (blocked && blocked.kind === 'PortalBlocked' && store.session?.state.heroes[blocked.heroId]?.ownerId === store.session?.humanPlayerId) {
        store.toast('The far side of the portal is blocked: a hero stands on its twin.', 'info');
      }
      const started = events.find((e) => e.kind === 'BattleStarted');
      if (started && started.kind === 'BattleStarted') await prepareBeforeBattle(c, started.battleId, source);
      afterMoves(moves);
    });
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
        } else if (e.kind === 'InterventionInvoked' && e.playerId === me) {
          const def = catalog.interventions?.[e.interventionId];
          if (!def || def.context !== 'adventure') continue;
          if (factor > 0) await store.whenMiracleCardsClosed();
          const look = miracleLook(def);
          const id = `fx.miracle.${def.id}`;
          store.audio?.effect(`magic.${look.sound}`);
          const fx = def.effect;
          if (fx.type === 'restore_movement' || fx.type === 'restore_mana') {
            const heroIds = Object.values(st.heroes)
              .filter((h) => h.ownerId === me && h.status === 'active' && !h.monster)
              .map((h) => h.id);
            await c.playMapFx({ look, id, heroIds }, factor);
          } else if (fx.type === 'town_growth') {
            const town = e.targetTownId ? st.towns[e.targetTownId] : undefined;
            if (town) await c.playMapFx({ look, id, towns: [town.coord] }, factor);
          } else if (fx.type === 'grant_resources') {
            if (factor > 0 && !reducedMotion(store.prefs)) {
              const r = document.querySelector('[data-testid="res-gold"]')?.getBoundingClientRect();
              if (r) setCoins({ key: Date.now(), x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }
            const capital = Object.values(st.towns).find((t) => t.ownerId === me);
            await c.playMapFx({ look, id, ...(capital ? { towns: [capital.coord] } : {}) }, factor);
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
      }
    }
  }, [store, catalog]);

  const onController = useCallback(
    (c: AdventureSceneController | null) => {
      ctrl.current = c;
      projectors.adventure = c ? (q, r) => toPage(c.projectHex({ q, r })) : undefined;
      inspectors.adventure = c ? { heroes: () => c.heroAnimationDebug(), camera: () => c.cameraPose(), fx: () => c.fxDebug() } : undefined;
      if (c) {
        c.update(viewRef.current);
        const focus = store.focusRequest ?? selectedRef.current?.position ?? null;
        store.focusRequest = null;
        if (focus) c.focus(focus, false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** The Spells button: the hero's book, opened to cast on the map. */
  const openSpells = () => {
    if (!selected) return;
    const hero = selected;
    const options: Record<string, { castable: boolean; reason: string | null }> = {};
    for (const sp of adventureSpellsOf(catalog, state, hero.id)) {
      const q = quoteAdventureSpell(catalog, state, playerId, hero.id, sp.id, null);
      options[sp.id] = { castable: humanTurn && q.legal, reason: !humanTurn ? 'Not your turn' : q.legal ? null : (q.reason ?? 'Cannot be cast now') };
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
          // A spell with a target tile (Divine Sight) asks for the tile next.
          if (sp.effect.type === 'reveal_radius') {
            setCasting(spellId);
            return;
          }
          const run = () => {
            if (!store.dispatch({ kind: 'CastAdventureSpell', heroId: hero.id, spellId, target: hero.position })) store.toast(`${sp.name}: ${sp.summary}`, 'success');
          };
          if (sp.effect.type === 'recall') store.confirm(`Cast ${sp.name}?`, `${hero.name} returns to the nearest town you own and ends the day's movement there.`, 'Cast', run);
          else run();
        },
      },
    });
  };

  const selectHero = (h: HeroState) => {
    store.selectedHeroId = h.id;
    setTarget(null);
    ctrl.current?.focus(h.position);
    store.notify();
  };

  const tryMove = (dest: HexCoord) => {
    if (!selected) return;
    const q = quoteMovement(catalog, state, selected.id, dest);
    if (!q.reachable) {
      store.toast(q.reason ?? 'No route', 'error');
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
    const rej = store.dispatch({ kind: 'MoveHero', heroId: selected.id, destination: dest });
    if (!rej && q.reachesDestinationToday) setTarget(null);
  };

  const onTileClick = (c: HexCoord, button: number) => {
    const s = store.session?.state;
    if (!s) return;
    if (button === 2) {
      setPinned((p) => (p && hexEquals(p, c) ? null : c));
      setTarget(null);
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
        store.toast(`${q.spell?.name ?? 'Spell'}: the area is revealed until the next dawn`);
        setCasting(null);
      }
      return;
    }
    const mine = playerHeroes(s, playerId).find((h) => hexEquals(h.position, c));
    const sel = playerHeroes(s, playerId).find((h) => h.id === store.selectedHeroId) ?? null;
    // Next to the selected hero: meet and trade troops (the exchange dialog).
    if (mine && sel && mine.id !== sel.id && axialDistance(mine.position, sel.position) === 1) {
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
    if (target && hexEquals(target, c)) tryMove(c);
    else {
      setTarget(c);
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
    const go = () => {
      setTarget(null);
      store.dispatch({ kind: 'EndTurn' });
    };
    if (canStillMove && store.prefs.confirmEndDayWithMovement) {
      store.confirm('End the day?', 'Some heroes can still move today.', 'End Day', go);
    } else go();
  };

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
        tryMove(target);
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
  const activeName = state.players[state.activePlayerId]?.name ?? state.activePlayerId;
  const mission = scenarioMission(catalog, state);

  return (
    <div className="adventure">
      <SceneViewport factory={factory} onController={onController} className="adventure__scene" label="Adventure map. Click a tile to preview a route, click again to move." cursor={sceneCursor} />

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

      <aside className="adv-left">
        <Panel className="adv-list" label="Heroes">
          {heroes.map((h) => {
            const budget = movementBudget(catalog, state, h);
            return (
              <button key={h.id} type="button" className={`hero-tab ${selected?.id === h.id ? 'is-selected' : ''}`} onClick={() => selectHero(h)} onDoubleClick={() => store.goto('hero', { heroId: h.id })} data-testid={`hero-tab-${h.id}`}>
                <HeroPortrait catalog={catalog} definitionId={h.definitionId} name={h.name} size="3rem" />
                <span className="hero-tab__bars">
                  <Bar value={h.movementPoints} max={Math.max(budget.total, h.movementPoints)} kind="move" label={`${h.name} movement`} />
                  <Bar value={h.mana} max={Math.max(1, maxMana(catalog, state, h))} kind="mana" label={`${h.name} mana`} />
                </span>
              </button>
            );
          })}
        </Panel>
        <Panel className="adv-list" label="Towns">
          {Object.values(state.towns)
            .filter((t) => t.ownerId === playerId)
            .map((t) => (
              <button key={t.id} type="button" className="town-tab" onClick={() => store.goto('town', { townId: t.id })} onContextMenu={(e) => { e.preventDefault(); ctrl.current?.focus(t.coord); }} data-testid={`town-tab-${t.id}`}>
                <Icon name="town" />
                <span>{t.name}</span>
                {t.buildUsedDay !== state.day ? <Chip tone="ok" title="A building can be constructed today">Build</Chip> : null}
              </button>
            ))}
        </Panel>
        {store.prefs.minimap ? (
          <Panel className="adv-minimap">
            <Minimap catalog={catalog} state={state} playerId={playerId} onPick={(c) => ctrl.current?.focus(c)} frame={viewFrame} />
          </Panel>
        ) : null}
      </aside>

      <aside className="adv-right">
        {info ? (
          <Panel title={pinned ? 'Tile (pinned)' : 'Tile'} className="adv-tile" actions={pinned ? <Button size="small" variant="ghost" icon="close" onClick={() => setPinned(null)} aria-label="Unpin" /> : undefined}>
            <TileInfo store={store} state={state} c={info} hero={selected} />
          </Panel>
        ) : null}
        <Panel title="Objectives" className="adv-objectives" headerIcon="journal" actions={<Button size="small" onClick={() => store.goto('journal')}>Journal</Button>}>
          <ul className="objective-mini">
            {objectives.map((o) => {
              const raw = state.mission.objectives[o.id]?.status ?? 'locked';
              // A step already achieved before it opens reads as completed (as in the Journal).
              const st = raw === 'locked' && objectiveDoneEarly(catalog, state, o) ? 'completed' : raw;
              if (st === 'locked') return null;
              return (
                <li key={o.id} className={`is-${st}`}>
                  <Icon name={st === 'completed' ? 'check' : st === 'failed' ? 'close' : 'flag'} className="inline-icon" />
                  <span>{o.title}</span>
                  {o.markerSiteId ? (
                    <button type="button" className="link" onClick={() => { const def = missionSite(catalog, state, o.markerSiteId!); if (def && (state.fog[playerId]?.explored[cellIndex(state.world.map, def.coord)] === 1 || state.mission.revealedSiteIds.includes(def.id))) ctrl.current?.focus(def.coord); else store.toast('Location not yet discovered'); }} aria-label={`Show ${o.title} on map`}>
                      <Icon name="eye" className="inline-icon" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Panel>
      </aside>

      <footer className="adv-bottom panel">
        <div className="adv-bottom__tools">
          <Button icon="hero" onClick={() => selected && store.goto('hero', { heroId: selected.id })} disabled={!selected} title="Hero (H)">
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
          <Button icon="spell" onClick={openSpells} disabled={!selected} title="Spells (C)" data-testid="open-spells">
            Spells
          </Button>
          <Button icon="bestiary" onClick={() => store.goto('encyclopedia')} title="Encyclopedia (B)">
            Bestiary
          </Button>
          <Button icon="pause" onClick={() => store.openOverlay({ kind: 'pause' })} title="Menu (Esc)">
            Menu
          </Button>
        </div>
        <div className="adv-bottom__status">
          {casting ? (
            <span className="small" data-testid="casting-hint">
              {catalog.spells[casting]?.name}: click a tile you have already explored (radius {catalog.spells[casting]?.effect.type === 'reveal_radius' ? catalog.spells[casting]!.effect.radius : 0}) · Esc to cancel{' '}
              <Button size="small" onClick={() => setCasting(null)}>
                Cancel
              </Button>
            </span>
          ) : target && selected ? (
            <span className="small">
              {(() => {
                const q = quoteMovement(catalog, state, selected.id, target);
                if (!q.reachable) return <span className="danger">{q.reason}</span>;
                return (
                  <>
                    Route {q.totalCost} · {q.reachesDestinationToday ? 'arrives today' : `${q.stopIndex + 1}/${q.path.length} steps today`} {q.endsInEncounter ? '· ends in battle' : ''} — click again or press Space
                  </>
                );
              })()}
            </span>
          ) : (
            <span className="dim small">Click a tile to plan a route · right-click for details · drag to pan · wheel to zoom</span>
          )}
        </div>
        <Button variant="primary" size="large" icon="hourglass" onClick={endDay} disabled={!humanTurn || !!pending} disabledReason={pending ? 'Resolve the pending level-up first' : 'Wait for the other side'} data-testid="end-day">
          End Day
        </Button>
      </footer>
    </div>
  );
}
