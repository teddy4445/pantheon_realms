/**
 * AdventureSceneController (S06): the 2D adventure map, drawn in layers from a
 * view model the interface builds from committed MatchState.
 *
 *   0 black surround            4 decoration, map locations and heroes (depth-sorted)
 *   1 terrain (painted ground)  5 route preview, hover and selection
 *   2 roads                     6 fog of war
 *   3 hex grid, reachable area  7 cosmetic effects (glows, teleport)
 *
 * Owns: sprites, the 2D camera (pan and zoom only), pointer → hex picking,
 * movement playback and the mounted map avatars (one per pantheon, idle/walk).
 * Does not own: legality (reachable tiles and routes come from the rules via
 * the view model), selection (interface), or anything persisted. The hex under
 * the pointer is found by inverting the board transform, so sprite sizes never
 * change what a click selects.
 */
import { Container, FillPattern, Graphics, Matrix, Rectangle, Sprite, Text, Texture, type FillStyle } from 'pixi.js';
import { TERRAIN_BY_CODE, TERRAIN_CODES, type HexCoord, type Terrain, type WorldMapDefinition } from '@pr/rules';
import { buildDecor, deriveStreams } from '@pr/mapgen';
import { facesLeft, planNatureSceneryCached, type NatureItem, type NaturePlan } from './nature';
import type { EngineHost, FramePace, SceneController } from './engineHost';
import { MAP_SQUASH, SQRT3, axialPoint, directionOf, hexPolygon, pointAxial, pointAxialFraction, type MapDirection } from './hexmath';
import { BIOME_TINT, HIGHLIGHT_REACH, PATH_ENCOUNTER, PATH_LATER, PATH_TODAY, SELECT_RING, UNKNOWN_COLOR, biomeTerrainRgb, hexToRgb, tileNoise } from './palette';
import { TweenPlayer, linear } from './tween';
import { TERRAIN_TEXTURE_WORLD, terrainArt, type EnvironmentArt } from './environmentArt';
import { ROUTE_MARKER_IDS, routeMarkerArt, type RouteMarkerArt, type RouteMarkerId } from './routeArt';
import { graphicsProfile } from './graphics';
import { SpriteFigure } from './figure';
import { FIGURE_SITE_ARCHETYPES, creatureSprites, heroSprites, pickSiteSprite, spriteManifest, spriteUrl, type EffectDefinition, type GroundEdgesData, type SiteArchetype, type StaticSpriteDefinition } from './sprites';
import { loadStrip, loadTexture, stripFrames } from './textures';
import { colorOf, groundShadow, rgbOf, stillHeight, stillSprite, stillTexture } from './staticSprites';
import { FxPainter, type FxTarget } from './fx';
import { PLANK_COLOR, ROAD_PARTS, ROAD_STEP, marksAlong, offsetRun, roadRuns, roadStyleFor, roadTileSlot, roadTypeFor, smoothRoadTypes, smoothRun, type RoadPoint, type RoadType } from './roads';
import type { FxLook } from './fxLooks';
import { GroundCache, type GroundCacheStats } from './groundCache';
import { groundCornerOutlines, groundEdgesComplete, groundEdgesUsable, groundPieceOutlines, planGroundCorners, planGroundEdges, type GroundEdgePiece } from './groundEdges';
import { mapTokenPicture, mapTokenScale, tokenHeading, type MapTokenHeading } from './mapTokens';
import { ShipLayer, type AdventureShipView, type ShipLayerDebug, type ShipMarksView, type ShipOverlayUrls } from './ships';
import { SeaSiteLayer, type AdventureSeaSiteView, type SeaSiteDebug } from './seaSites';

/**
 * Nominal map time per hex step (ms, before the Adventure animation speed
 * setting). Slower since 2026-10-04 (owner request: the player should feel the
 * journey); the walk strip plays at WALK_RATE of its own pace to match.
 */
const STEP_MS = 360;
const WALK_RATE = 0.7;
/** Hex radius in view pixels at zoom 1. */
const R = 36;
const S = MAP_SQUASH;
const HEX_W = SQRT3 * R;
const ZOOM_MIN = 0.42;
const ZOOM_MAX = 2.2;
const ZOOM_DEFAULT = 1;
/** Below this zoom the route markers keep their on-screen size (drawn larger in the world) so a distant route stays readable. */
const ROUTE_MARK_ZOOM = 0.9;

export type { SiteArchetype } from './sprites';

export interface AdventureSiteView {
  readonly id: string;
  readonly coord: HexCoord;
  readonly archetype: SiteArchetype;
  /** Sprite variant: a town's pantheon, a pickup's main reward. */
  readonly variant?: string | null;
  readonly name: string;
  /** Drawn at all (explored tile or story-revealed marker). */
  readonly shown: boolean;
  readonly ownerColor: string | null;
  readonly ownerShape: 'square' | 'pennant';
  /** Creature ID of the strongest guard still standing (drawn beside the location). */
  readonly guard: string | null;
  readonly lit: boolean;
  readonly open: boolean;
  readonly claimed: boolean;
  /** Key colour of key tents and gates (hex). */
  readonly tint?: string;
  /**
   * The site's preferred pictures, best first (`siteSpriteCandidates`: a sluice's state picture,
   * the site's own art, a ferry landing, a neutral hiring site): the first the sprite manifest has
   * is drawn, else the kind's picture (`archetype`, `variant`).
   */
  readonly sprites?: readonly string[];
  /**
   * The quest marker over the site of an open objective (journal state): its icon's asset ID and
   * picture (a campaign objective's own icon — evidence, supply, evacuation, pact — or the generic
   * quest marker). Absent: no marker.
   */
  readonly quest?: { readonly id: string; readonly url: string | null } | null;
}

export interface AdventureHeroView {
  readonly id: string;
  readonly coord: HexCoord;
  readonly color: string;
  readonly shown: boolean;
  readonly selected: boolean;
  /** Offset when sharing a tile with a town. */
  readonly inTown: boolean;
  /** Wandering monster: drawn as this creature instead of a rider. */
  readonly monster?: string | null;
  /** Pantheon whose mounted avatar draws this hero (hero definition, else the owner's). */
  readonly pantheonId?: string | null;
  /**
   * A looping map aura while a spell's effect lasts on this hero (the effect asset ID,
   * e.g. `fx.spell.fleet_foot.aura`): drawn only when its strip is delivered.
   */
  readonly aura?: string | null;
  /** Aboard a ship (navalMovementV1): the mounted avatar is hidden; the ship carries the hero's flag. */
  readonly embarked?: boolean;
}

/**
 * A recruitment caravan's wagon on the map (expedition kit, `recruitmentCaravansV1`): the
 * directional painted token in its owner's colour (a base disc and a pennant — never a
 * pantheon), turned toward its next tile. Another player's wagon is listed only while the
 * viewer sees its tile; `toward` is the owner's own knowledge only (never sent for another's).
 */
export interface AdventureCaravanView {
  readonly id: string;
  readonly coord: HexCoord;
  /** The owner's colour (the same source as a hero's banner). */
  readonly color: string;
  readonly shown: boolean;
  /** The next tile of its route (own caravans): the resting heading. */
  readonly toward?: HexCoord | null;
  /** A hero shares its tile: the wagon stands aside so both read. */
  readonly sharesTile?: boolean;
  /** Held (blocked or waiting at a gate): a small halt mark over the wagon. */
  readonly held?: boolean;
}

/** Read-only wagon state for tests and diagnostics. */
export interface CaravanTokenDebug {
  readonly coord: HexCoord;
  readonly heading: MapTokenHeading;
  readonly flipX: boolean;
  readonly texture: 'ready' | 'loading' | 'missing';
  readonly shown: boolean;
  readonly moving: boolean;
  readonly bob: boolean;
  /** Screen position of the ground point (CSS pixels within the canvas). */
  readonly x: number;
  readonly y: number;
}

export interface AdventurePathView {
  readonly steps: readonly HexCoord[];
  /** Last index reachable today (−1 none). */
  readonly stopIndex: number;
  readonly encounter: boolean;
  /** The day each step is reached (1 = today; rules `routeStepDays`), when known. */
  readonly days?: readonly number[] | null;
  /** The arrival day shown on the destination's parchment (rules `routeDays`: today = 1). */
  readonly arrivalDay?: number | null;
  /** The planned destination has no legal route right now: its seal shows locked, without a route. */
  readonly blocked?: boolean;
  /** The destination tile (the last step; the planned tile when blocked). */
  readonly destination?: HexCoord;
}

/** Read-only route state for tests and diagnostics. */
export interface RouteDebug {
  /** 'painted' with the kit's pictures, 'drawn' with the fallback shapes, 'none' without a route. */
  readonly mode: 'painted' | 'drawn' | 'none';
  readonly today: number;
  readonly later: number;
  readonly hourglasses: number;
  readonly destination: 'seal' | 'battle' | 'blocked' | null;
  readonly badge: string | null;
  readonly ring: 'painted' | 'drawn';
  /** Markers left out at a distant zoom. */
  readonly thinned: number;
}

export interface AdventureView {
  readonly map: WorldMapDefinition;
  readonly explored: readonly number[];
  readonly visible: ReadonlySet<number>;
  /** Changes whenever explored/visible change (e.g. revision + player). */
  readonly fogKey: string;
  readonly sites: readonly AdventureSiteView[];
  readonly heroes: readonly AdventureHeroView[];
  readonly reachable: readonly HexCoord[] | null;
  readonly reachKey: string;
  readonly path: AdventurePathView | null;
  readonly grid: 'always' | 'hover' | 'off';
  /** The player asked for reduced motion: looping map auras hold still. */
  readonly calm?: boolean;
  /**
   * Scouting intel (`scoutingIntelV1`): last-known markers — where an enemy army was last seen
   * outside the viewer's current vision, in its banner colour. Carries no army data (the panel
   * shows the dated report); absent or empty: none.
   */
  readonly signals?: readonly { id: string; coord: HexCoord; identified: boolean }[];
  readonly lastKnown?: readonly AdventureLastKnownView[];
  /** Recruitment caravans' wagons (absent or empty: none). */
  readonly caravans?: readonly AdventureCaravanView[];
  /** Hero ships (navalMovementV1; absent or empty: none): `ships.ts`. */
  readonly ships?: readonly AdventureShipView[];
  /** The selected hero's naval marks: landing cells, embark / disembark steps, the destination ring. */
  readonly shipMarks?: ShipMarksView;
  /** Picture URLs of the kit's wake and destination-ring overlays. */
  readonly shipOverlays?: ShipOverlayUrls;
  /** Coastal watchtowers, floating salvage and shipwrecks (sea-sites kit; absent or empty: none): `seaSites.ts`. */
  readonly seaSites?: readonly AdventureSeaSiteView[];
}

export interface AdventureLastKnownView {
  /** The observed army (hero ID): the marker's stable key. */
  readonly id: string;
  readonly coord: HexCoord;
  /** The owner's banner colour as it was seen. */
  readonly color: string;
  /** World day of the observation. */
  readonly day: number;
  readonly monster: boolean;
}

export interface AdventureCallbacks {
  onTileClick(c: HexCoord, button: number): void;
  onTileHover(c: HexCoord | null): void;
  /** The map started or stopped being dragged (for the grabbing cursor). */
  onDrag?(dragging: boolean): void;
}

export type PrepareOutcome = 'finished' | 'cancelled';

/** Read-only avatar state for tests and diagnostics. */
export interface HeroAnimationDebug {
  readonly sprite: 'ready' | 'loading' | 'missing';
  readonly status: 'final' | 'placeholder' | null;
  /** Animation requested: idle, walk or prepare (the readiness beat before a battle). */
  readonly clip: 'idle' | 'walk' | 'prepare';
  /** Strip actually drawn (a missing walk strip falls back to idle). */
  readonly drawn: string | null;
  readonly facing: MapDirection;
  readonly mirrored: boolean;
  readonly prepareCount: number;
  /** The avatar is drawn (false while hidden: out of sight, or aboard a ship). */
  readonly visible?: boolean;
  /** The looping aura strip drawn on the hero (asset ID), if any. */
  readonly aura: string | null;
}

interface HeroEntry {
  /** The game entity: placed at the hex's ground point. */
  root: Container;
  figure: SpriteFigure;
  marks: Container | null;
  color: string;
  look: string;
  pantheonId: string | null;
  monster: boolean;
  coord: HexCoord;
  prevCoord: HexCoord;
  locked: number;
  snapIn: number;
  inTown: boolean;
  clip: 'idle' | 'walk' | 'prepare';
  prepares: number;
  /** Pending readiness beat (resolved early by cancelPreparations). */
  cancel: (() => void) | null;
  /** A looping aura strip on the hero while a map spell lasts (Fleet Foot, Wings of Hermes). */
  aura: { id: string; sprite: Sprite; def: EffectDefinition } | null;
  /** In sight, aboard a ship (avatar hidden), and fading in or out during an embark / disembark playback. */
  shown: boolean;
  embarked: boolean;
  fading: boolean;
}

interface SiteEntry {
  root: Container;
  sprite: Sprite;
  def: StaticSpriteDefinition | null;
  key: string;
  /** The sprite ID drawn (null: none in the manifest), and the kind and variant it stands for. */
  spriteId: string | null;
  kindKey: string;
  /** The quest marker over the site (an open objective's), and the icon it shows. */
  quest: Container | null;
  questKey: string;
  glow: Graphics | null;
  seal: Graphics | null;
  banner: Graphics | null;
  bannerKey: string;
  guard: SpriteFigure | null;
  guardKey: string;
}

interface CaravanEntry {
  root: Container;
  /** The painted wagon (bobs in `pose`). */
  pose: Container;
  sprite: Sprite;
  marks: Container;
  halt: Graphics;
  color: string;
  coord: HexCoord;
  prevCoord: HexCoord;
  heading: MapTokenHeading;
  /** The heading whose picture is loaded (or loading). */
  textureKey: string;
  texture: 'ready' | 'loading' | 'missing';
  sharesTile: boolean;
  locked: number;
  snapIn: number;
  shown: boolean;
}

/** Ground types in a fixed order. */
const GROUND_TYPES: readonly Terrain[] = ['plains', 'forest', 'rough', 'marsh', 'mountain', 'water'];
type GroundFill = FillStyle;
/** The axial step to the neighbour across edge k of a pointy-top hex (corners k and k+1 of `hexPolygon`). */
const NEIGHBOUR_STEP = ROAD_STEP;

/** A short fingerprint of a list of tile numbers or flags (FNV-1a): equal lists, equal keys. */
function tileMaskKey(values: readonly number[]): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < values.length; i++) {
    h ^= values[i]! & 0xffff;
    h = Math.imul(h, 0x01000193);
    h ^= values[i]! >>> 16;
    h = Math.imul(h, 0x01000193);
  }
  return `${values.length}:${(h >>> 0).toString(36)}`;
}

export class AdventureSceneController implements SceneController {
  readonly root = new Container();
  readonly tweens = new TweenPlayer();
  private readonly canvas: HTMLCanvasElement;
  private readonly cb: AdventureCallbacks;
  private readonly world = new Container();
  /** Around the map there is only black (owner request 2026-10-04: no sea, no sky panorama past the north edge); the map's own water tiles still show. */
  readonly background = 0x000000;
  /** The ground (painted terrain, borders, roads, grid): redrawn only when the map or the explored area changes. */
  private readonly groundLayer = new Container();
  /** Reach, path, hover and selection marks over the ground. */
  private readonly marks = new Container();
  private readonly fogLayer = new Container();
  private readonly terrain = new Graphics();
  /** The blended ground (one picture with soft transitions between ground types) once its textures are in. */
  private readonly terrainBlend = new Graphics();
  /** Shore foam over water hexes (GPT-6 Brief 17 Part B), drawn with the painted ground transitions. */
  private readonly groundFoam = new Container();
  /** The traced transition masks (`edges.json`), once loaded; 'failed' keeps the softened edges for this view. */
  private groundEdges: GroundEdgesData | null = null;
  private groundEdgesState: 'idle' | 'loading' | 'failed' = 'idle';
  private groundFoamTex: Texture | null = null;
  private groundFoamState: 'idle' | 'loading' | 'failed' = 'idle';
  private readonly foamFrames = new Map<string, Texture>();
  private groundMode: { edges: 'painted' | 'softened' | 'crisp'; pieces: number; foam: number } = { edges: 'crisp', pieces: 0, foam: 0 };
  private terrainQueued = false;
  private readonly roads = new Graphics();
  /** Painted road tiles (GPT-6 Brief 16), when every road type the map needs is delivered. */
  private readonly roadTiles = new Container();
  private readonly roadSheets = new Map<string, Texture>();
  private readonly roadFrames = new Map<string, Texture>();
  private roadSheetsLoading = false;
  private readonly grid = new Graphics();
  private readonly reach = new Graphics();
  private readonly ground = new Container();
  private readonly pathLayer = new Graphics();
  /** The painted route (recruitment & route kit): chevrons, hourglasses, the destination seal and its day parchment. */
  private readonly routeLayer = new Container();
  /** The route a moving hero still has to walk (drawn once per walk, one piece per step; passed pieces are hidden). */
  private readonly trailLayer = new Container();
  private readonly hover = new Graphics();
  private readonly selectRing = new Container();
  private readonly selectRingShape = new Graphics();
  private readonly objects = new Container();
  private readonly fog = new Graphics();
  /** Soft-edged fog (one low-resolution picture, redrawn when the fog changes). */
  private readonly fogSoft = new Container();
  private fogCanvas: { canvas: HTMLCanvasElement; texture: Texture; sprite: Sprite; k: number; map: WorldMapDefinition } | null = null;
  private readonly effects = new Container();
  /** Scouting intel: last-known markers (over the fog, so a remembered sighting stays readable). */
  private readonly signalLayer = new Container();
  private signalKey = '';
  private readonly lastKnownLayer = new Container();
  private lastKnownKey = '';
  private lastKnownDrawn: { id: string; q: number; r: number; day: number }[] = [];
  /** Whole-view moments (screen pixels, over the map). */
  private readonly screenLayer = new Container();
  private readonly painter: FxPainter;
  /** The last magic effects played (asset ID prefixes; read-only diagnostics). */
  private fxLog: string[] = [];
  private map: WorldMapDefinition | null = null;
  private mapKey = '';
  private terrainArts = new Map<Terrain, EnvironmentArt>();
  private terrainTextures = new Map<Terrain, Texture>();
  private fogKey = '';
  private exploredKey = '';
  private visibleKey = '';
  private reachKey = '';
  private pathKey = '';
  private gridMode: AdventureView['grid'] = 'always';
  private explored: readonly number[] = [];
  private decorByTile = new Map<number, Container[]>();
  /** The nature plan the map was dressed with (read-only diagnostics). */
  private naturePlan: NaturePlan | null = null;
  private heroes = new Map<string, HeroEntry>();
  private caravans = new Map<string, CaravanEntry>();
  private sites = new Map<string, SiteEntry>();
  private selectedHero: string | null = null;
  /**
   * Destinations of heroes whose move the view already shows but whose walk has
   * not been played yet: a location there keeps its old look (a pickup stays on
   * the ground, a guard stands) until the hero arrives.
   */
  private arrivals = new Map<string, HexCoord>();
  /** The site views last drawn, and the latest view received. */
  private drawnSites = new Map<string, AdventureSiteView>();
  private lastSites: readonly AdventureSiteView[] = [];
  private lastSeaSites: readonly AdventureSeaSiteView[] = [];
  private down: { x: number; y: number; button: number; tx: number; ty: number; dragging: boolean } | null = null;
  private lastHover = '';
  /** Camera: the world point at the view's centre, and the zoom. */
  private cam = { x: 0, y: 0, zoom: ZOOM_DEFAULT };
  private camGoal: { x: number; y: number } | null = null;
  private view = { width: 1, height: 1 };
  private time = 0;
  private disposed = false;
  private readonly listeners: [string, EventListener][] = [];

  /** Wakes the renderer to the full frame rate (frame pacing) after a change it cannot see coming. */
  private readonly wake: () => void;
  /** Hero ships (navalMovementV1): hulls, flags, wakes, their playbacks and the voyage's ground marks. */
  private readonly shipLayer: ShipLayer;
  /** Coastal watchtowers, floating salvage and shipwrecks (sea-sites kit). */
  private readonly seaSiteLayer: SeaSiteLayer;
  /** The ground drawn into textures (frame-rate work 2026-10-07; `groundCache.ts`): the map shows these instead of the ground layer. */
  private readonly groundCache: GroundCache;

  constructor(engine: EngineHost, canvas: HTMLCanvasElement, cb: AdventureCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    this.wake = () => engine.wake?.();
    this.groundCache = new GroundCache(engine.renderer, this.groundLayer, engine.antialias);
    this.root.addChild(this.world, this.screenLayer);
    this.painter = new FxPainter(this.effects, this.tweens, R, S, { layer: this.screenLayer, size: () => this.view });
    this.ground.addChild(this.selectRing, this.pathLayer, this.routeLayer, this.trailLayer, this.hover);
    this.selectRing.addChild(this.selectRingShape);
    // Markers never take the pointer: clicks go to the tile under them.
    for (const layer of [this.routeLayer, this.trailLayer, this.selectRing]) layer.eventMode = 'none';
    // The hover outline is one hex drawn once and moved to the tile under the pointer.
    this.hover.poly(hexPolygon(0, 0, R * 0.97, S)).stroke({ width: 2, color: 0xf5e4b7, alpha: 0.95 });
    this.objects.sortableChildren = true;
    this.groundLayer.addChild(this.terrain, this.terrainBlend, this.groundFoam, this.roads, this.roadTiles, this.grid);
    this.marks.addChild(this.reach, this.ground);
    this.fogLayer.addChild(this.fog, this.fogSoft);
    // The ground cache's chunks lie over the live ground; while they cover the view the live ground is not drawn.
    this.world.addChild(this.groundLayer, this.groundCache.view, this.marks, this.objects, this.fogLayer, this.lastKnownLayer, this.signalLayer, this.effects);
    this.lastKnownLayer.eventMode = 'none';
    // Render groups (2026-10-06 frame-rate work): moving the camera changes one
    // transform on the GPU instead of every vertex, and the animated heroes and
    // guards re-send only the objects layer each frame, never the ground or fog.
    this.world.enableRenderGroup();
    // Drawn shapes that change (the reach after each command, a route, the trail during a walk) each sit in a
    // small group of their own: redrawing one never re-sends the others.
    for (const layer of [this.groundLayer, this.marks, this.reach, this.pathLayer, this.routeLayer, this.trailLayer, this.objects, this.fogLayer, this.effects]) layer.enableRenderGroup();
    // The selection ring is drawn once; its pulse is a scale.
    this.selectRingShape.ellipse(0, 0, HEX_W * 0.44, HEX_W * 0.44 * S * 0.5).stroke({ width: 3, color: colorOf(SELECT_RING), alpha: 0.95 });
    this.hover.visible = false;
    this.selectRing.visible = false;
    this.view = { width: engine.width, height: engine.height };
    const on = (type: string, fn: (e: Event) => void) => {
      canvas.addEventListener(type, fn, { passive: type !== 'wheel' && type !== 'contextmenu' });
      this.listeners.push([type, fn]);
    };
    on('pointerdown', (e) => this.onDown(e as PointerEvent));
    on('pointermove', (e) => this.onMove(e as PointerEvent));
    on('pointerup', (e) => this.onUp(e as PointerEvent));
    on('pointerleave', () => this.onLeave());
    on('wheel', (e) => this.onWheel(e as WheelEvent));
    on('contextmenu', (e) => e.preventDefault());
    this.shipLayer = new ShipLayer({
      objects: this.objects,
      marks: this.ground,
      tweens: this.tweens,
      hexRadius: R,
      squash: S,
      hexCenter: (c) => this.hexCenter(c),
      toScreen: (x, y) => ({ x: x * this.cam.zoom + this.world.x, y: y * this.cam.zoom + this.world.y }),
      zoom: () => this.cam.zoom,
      wake: () => this.wake(),
      follow: (x, y) => (this.camGoal = { x, y }),
      calm: () => this.calm,
    });
    this.seaSiteLayer = new SeaSiteLayer({
      objects: this.objects,
      hexRadius: R,
      squash: S,
      hexCenter: (c) => this.hexCenter(c),
      toScreen: (x, y) => ({ x: x * this.cam.zoom + this.world.x, y: y * this.cam.zoom + this.world.y }),
      zoom: () => this.cam.zoom,
      wake: () => this.wake(),
      calm: () => this.calm,
      held: (c) => this.held(c),
    });
  }

  resize(width: number, height: number): void {
    this.view = { width, height };
    this.applyCamera();
  }

  // ------------------------------------------------------------------ view updates

  update(view: AdventureView): void {
    this.wake();
    this.calm = !!view.calm;
    const key = `${view.map.templateId}|${view.map.logicalHash}`;
    if (key !== this.mapKey) {
      this.buildMap(view.map, view.sites);
      this.mapKey = key;
      this.fogKey = '';
      this.exploredKey = '';
      this.visibleKey = '';
    } else if (this.map && view.map !== this.map) this.adoptMap(view.map, view.sites);
    if (view.fogKey !== this.fogKey || view.grid !== this.gridMode) {
      this.fogKey = view.fogKey;
      // The view's key changes with every command: redraw only what the fog itself changed
      // (the explored area: grid, roads and decor; what is in sight: the shading).
      const ek = `${tileMaskKey(view.explored)}|${view.grid}`;
      const vk = tileMaskKey([...view.visible].sort((a, b) => a - b));
      if (ek !== this.exploredKey || vk !== this.visibleKey) {
        const explored = ek !== this.exploredKey;
        this.exploredKey = ek;
        this.visibleKey = vk;
        this.gridMode = view.grid;
        this.applyFog(view.explored, view.visible, explored);
      }
    }
    if (view.reachKey !== this.reachKey) {
      this.buildReach(view.reachable);
      this.reachKey = view.reachKey;
    }
    this.syncHeroes(view.heroes);
    this.syncCaravans(view.caravans ?? []);
    this.shipLayer.setOverlays(view.shipOverlays);
    this.shipLayer.sync(view.ships ?? []);
    this.shipLayer.syncMarks(view.shipMarks);
    this.lastSeaSites = view.seaSites ?? [];
    this.seaSiteLayer.sync(this.lastSeaSites);
    this.lastSites = view.sites;
    this.syncSites(view.sites);
    this.syncLastKnown(view.lastKnown ?? []);
    this.syncSignals(view.signals ?? []);
    const vp = view.path;
    const pk = vp ? `${vp.steps.map((s) => `${s.q},${s.r}`).join(';')}|${vp.stopIndex}|${vp.encounter}|${vp.days?.join(',') ?? ''}|${vp.arrivalDay ?? ''}|${vp.blocked ? 'blocked' : ''}|${vp.destination ? `${vp.destination.q},${vp.destination.r}` : ''}|${this.selectedHero ?? ''}` : '';
    if (pk !== this.pathKey) {
      this.buildPath(view.path);
      this.pathKey = pk;
    }
  }

  /**
   * The same map whose ground changed during play (campaign v2: `OperateSluice` replaces
   * `state.world.map` with the channel cells switched between water and marsh). The ground layer
   * and everything planned from the terrain — painted transitions and shore foam, roads (boardwalks
   * follow the marsh), the nature scenery and its water bodies, the grid and the soft fog — are
   * drawn again; the camera, sites, heroes and route stay as they are. Every command copies the
   * state, so a new map object with the same ground keeps the one drawn (and its caches).
   */
  private adoptMap(map: WorldMapDefinition, sites: readonly AdventureSiteView[]): void {
    const prev = this.map!;
    if (map.terrain === prev.terrain && map.roads.length === prev.roads.length && map.roads.every((k, i) => k === prev.roads[i])) return;
    this.map = map;
    if (this.fogCanvas?.map === prev) this.fogCanvas.map = map;
    this.groundChanges += 1;
    this.drawTerrain();
    for (const list of this.decorByTile.values()) for (const d of list) d.destroy({ children: true });
    this.decorByTile.clear();
    this.buildDecor(map, sites);
    // The fog is applied again in full below: the new scenery's visibility, the grid and the roads.
    this.fogKey = '';
    this.exploredKey = '';
    this.visibleKey = '';
  }

  /** Times the ground was redrawn for a changed terrain (read-only diagnostics). */
  private groundChanges = 0;
  /** Counts `buildMap` calls: a picture that arrives for an earlier map is dropped (the same map with new ground keeps it). */
  private mapBuild = 0;

  private terrainOf(map: WorldMapDefinition, i: number): Terrain {
    return TERRAIN_BY_CODE[map.terrain[i] ?? 'p'] ?? 'plains';
  }

  private hexCenter(c: HexCoord): { x: number; y: number } {
    return axialPoint(c, R, S);
  }

  /** The extent of the map's own cells in view pixels (void cells of the stored array excluded). */
  private mapBounds(map: WorldMapDefinition): { minX: number; maxX: number; minY: number; maxY: number } {
    if (this.boundsFor === map && this.bounds) return this.bounds;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let r = 0; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        if (map.terrain[r * map.width + q] === TERRAIN_CODES.void) continue;
        const p = this.hexCenter({ q, r });
        minX = Math.min(minX, p.x - HEX_W / 2);
        maxX = Math.max(maxX, p.x + HEX_W / 2);
        minY = Math.min(minY, p.y - R * S);
        maxY = Math.max(maxY, p.y + R * S);
      }
    }
    if (!Number.isFinite(minX)) ({ minX, maxX, minY, maxY } = { minX: 0, maxX: HEX_W, minY: -R * S, maxY: R * S });
    this.bounds = { minX, maxX, minY, maxY };
    this.boundsFor = map;
    return this.bounds;
  }

  private bounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  private boundsFor: WorldMapDefinition | null = null;

  private buildMap(map: WorldMapDefinition, sites: readonly AdventureSiteView[] = []): void {
    for (const s of this.sites.values()) this.disposeSite(s);
    this.sites.clear();
    for (const list of this.decorByTile.values()) for (const d of list) d.destroy({ children: true });
    this.decorByTile.clear();
    this.map = map;
    const build = ++this.mapBuild;
    this.terrainArts.clear();
    this.terrainTextures.clear();
    const painted = graphicsProfile().paintedGround;
    for (const t of GROUND_TYPES) {
      const a = painted ? terrainArt(map.biome, t) : null;
      if (a) this.terrainArts.set(t, a);
    }
    this.drawTerrain();
    this.buildDecor(map, sites);
    // Painted ground replaces the flat colours as each texture arrives.
    for (const [t, art] of this.terrainArts) {
      // A ground painting spans about two tiles: drawn 5–20 times smaller than its pixels, so with mipmaps.
      void loadTexture(art.url, { mipmaps: true }).then(
        (tex) => {
          if (this.disposed || this.mapBuild !== build) return;
          tex.source.style.addressModeU = art.wrap === 'repeat' ? 'repeat' : 'mirror-repeat';
          tex.source.style.addressModeV = art.wrap === 'repeat' ? 'repeat' : 'mirror-repeat';
          tex.source.style.update();
          this.terrainTextures.set(t, tex);
          this.queueTerrain();
        },
        () => undefined,
      );
    }
    // Centre the camera on the map initially.
    const c = this.hexCenter({ q: Math.round(map.width / 2 - map.height / 4), r: Math.round(map.height / 2) });
    this.cam = { x: c.x, y: c.y, zoom: this.cam.zoom };
    this.applyCamera();
  }

  /** The texture fill of a ground type: one painting spans about two tiles and continues across hexes. */
  private pattern(t: Terrain): FillPattern | null {
    const tex = this.terrainTextures.get(t);
    if (!tex) return null;
    const p = new FillPattern(tex, 'repeat');
    const mode = this.terrainArts.get(t)?.wrap === 'repeat' ? 'repeat' : 'mirror-repeat';
    tex.source.style.addressModeU = mode;
    tex.source.style.addressModeV = mode;
    const span = TERRAIN_TEXTURE_WORLD * R;
    p.setTransform(new Matrix().scale(span / tex.width, (span * S) / tex.height));
    return p;
  }

  private drawTerrain(): void {
    this.groundCache.invalidate();
    const map = this.map;
    const g = this.terrain;
    g.clear();
    this.terrainBlend.clear();
    for (const c of this.groundFoam.removeChildren()) c.destroy();
    this.groundMode = { edges: 'crisp', pieces: 0, foam: 0 };
    if (!map) return;
    const tint = BIOME_TINT[map.biome] ?? [1, 1, 1];
    const patterns = new Map<Terrain, FillPattern | null>();
    for (const t of GROUND_TYPES) patterns.set(t, this.pattern(t));
    const fillOf = (t: Terrain, alpha: number): GroundFill => {
      const pat = patterns.get(t);
      if (pat) return { fill: pat, color: rgbOf(0.97, 0.97, 0.97), alpha };
      const base = biomeTerrainRgb(t, map.biome);
      return { color: rgbOf(base[0] * tint[0], base[1] * tint[1], base[2] * tint[2]), alpha };
    };
    for (let r = 0; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        const t = this.terrainOf(map, r * map.width + q);
        if (t === 'void') continue;
        const { x, y } = this.hexCenter({ q, r });
        // One even tone per ground type: no per-tile shading, so no hex outlines show (owner request 2026-10-04).
        g.poly(hexPolygon(x, y, R * 1.012, S)).fill(fillOf(t, 1));
      }
    }
    if (graphicsProfile().softGround && !this.paintGroundEdges(map, fillOf)) {
      this.featherGroundEdges(map, fillOf);
      this.groundMode = { edges: 'softened', pieces: 0, foam: 0 };
    }
  }

  /** Redraw the ground once, after the textures or outlines arriving together. */
  private queueTerrain(): void {
    if (this.terrainQueued) return;
    this.terrainQueued = true;
    setTimeout(() => {
      this.terrainQueued = false;
      if (!this.disposed) this.drawTerrain();
    }, 0);
  }

  /**
   * Painted ground transitions (GPT-6 Brief 17, `groundEdges.ts`): where two grounds
   * meet, the higher one reaches into the lower one's hex in the shape of its
   * character's mask (meadow, woodland, rocky, boggy, scree; any land into water
   * as a shore), filled with the reaching ground's own painting at the three
   * outline levels (a soft rim, a solid core); the shore foam lies over the water
   * hex in the matching cell. Used only once all six mask sheets are imported and
   * their outlines loaded; returns false until then, and the softened hex edges
   * are drawn instead.
   */
  private paintGroundEdges(map: WorldMapDefinition, fillOf: (t: Terrain, alpha: number) => GroundFill): boolean {
    const def = spriteManifest().ground?.edges;
    if (!def || !groundEdgesComplete(def)) return false;
    const data = this.groundEdges;
    if (!data) {
      if (this.groundEdgesState === 'idle' && typeof fetch === 'function') {
        this.groundEdgesState = 'loading';
        fetch(spriteUrl(def.file))
          .then((res) => (res.ok ? (res.json() as Promise<unknown>) : Promise.reject(new Error(String(res.status)))))
          .then(
            (json) => {
              if (!groundEdgesUsable(json as GroundEdgesData)) {
                this.groundEdgesState = 'failed';
                return;
              }
              this.groundEdges = json as GroundEdgesData;
              this.groundEdgesState = 'idle';
              if (!this.disposed && this.map) this.queueTerrain();
            },
            () => {
              this.groundEdgesState = 'failed';
            },
          );
      }
      return false;
    }
    const rows = data.characters['shore']?.[0]?.length ?? 3;
    // Varied borders (owner request 2026-10-07): reach, mirroring and the lower ground reaching back differ along a border and by map.
    const pieces = planGroundEdges(map.width, map.height, (q, r) => this.terrainOf(map, r * map.width + q), NEIGHBOUR_STEP, rows, { salt: map.seed | 0 });
    // One fill per reaching ground and outline level, outer (faint) levels first.
    const batches = new Map<string, { from: Terrain; level: number; polys: number[][] }>();
    const add = (from: Terrain, level: number, points: number[]) => {
      const key = `${level}|${from}`;
      let b = batches.get(key);
      if (!b) batches.set(key, (b = { from, level, polys: [] }));
      b.polys.push(points);
    };
    // Rounded corners first (a border bends instead of stepping hex by hex), then the painted edge shapes over them.
    for (const p of planGroundCorners(map.width, map.height, (q, r) => this.terrainOf(map, r * map.width + q), NEIGHBOUR_STEP, map.seed | 0)) {
      const c = this.hexCenter({ q: p.q, r: p.r });
      for (const o of groundCornerOutlines(p, c.x, c.y, HEX_W, data.levels.length)) add(p.from, o.level, o.points);
    }
    for (const p of pieces) {
      const c = this.hexCenter({ q: p.q, r: p.r });
      for (const o of groundPieceOutlines(data, p, c.x, c.y, HEX_W)) add(p.from, o.level, o.points);
    }
    const g = this.terrainBlend;
    for (const b of [...batches.values()].sort((x, y) => x.level - y.level)) {
      const alpha = data.levels[b.level]?.alpha ?? 1;
      for (const poly of b.polys) g.poly(poly);
      g.fill(fillOf(b.from, alpha));
    }
    const foam = this.drawGroundFoam(map, pieces);
    this.groundMode = { edges: 'painted', pieces: pieces.length, foam };
    return true;
  }

  /** The surf line over every water hex a shore reaches into, in the shore mask's cell (Brief 17 Part B). */
  private drawGroundFoam(map: WorldMapDefinition, pieces: readonly GroundEdgePiece[]): number {
    const def = spriteManifest().ground?.foam;
    const build = this.mapBuild;
    if (!def) return 0;
    const tex = this.groundFoamTex;
    if (!tex) {
      if (this.groundFoamState === 'idle') {
        this.groundFoamState = 'loading';
        loadTexture(spriteUrl(def.file)).then(
          (t) => {
            this.groundFoamTex = t;
            this.groundFoamState = 'idle';
            if (!this.disposed && this.map && this.mapBuild === build) this.queueTerrain();
          },
          () => {
            this.groundFoamState = 'failed';
          },
        );
      }
      return 0;
    }
    let n = 0;
    for (const p of pieces) {
      if (p.character !== 'shore') continue;
      const row = p.variant % def.rows;
      const key = `${p.k}|${row}`;
      let frame = this.foamFrames.get(key);
      if (!frame) {
        frame = new Texture({ source: tex.source, frame: new Rectangle(p.k * def.cell, row * def.cell, def.cell, def.cell) });
        this.foamFrames.set(key, frame);
      }
      const sp = new Sprite(frame);
      sp.anchor.set(0.5);
      const { x, y } = this.hexCenter({ q: p.q, r: p.r });
      sp.position.set(x, y);
      sp.scale.set(HEX_W / def.hexWidth);
      this.groundFoam.addChild(sp);
      n++;
    }
    return n;
  }

  /** How the ground borders and roads are drawn right now (read-only diagnostics for tests): painted road tiles drawn, if any. */
  groundDebug(): { edges: 'painted' | 'softened' | 'crisp'; pieces: number; foam: number; roadTiles: number; roadTypes: Record<string, number>; roadTileTypes: Record<string, string>; cache: GroundCacheStats; terrain: string; groundChanges: number } {
    const roadTypes: Record<string, number> = {};
    for (const t of Object.values(this.roadTileTypes)) roadTypes[t] = (roadTypes[t] ?? 0) + 1;
    // `terrain`: the terrain codes the ground is drawn from; `groundChanges`: redraws for a changed terrain (a sluice).
    return { ...this.groundMode, roadTiles: this.roadTiles.children.length, roadTypes, roadTileTypes: { ...this.roadTileTypes }, cache: this.groundCache.stats(), terrain: this.map?.terrain ?? '', groundChanges: this.groundChanges };
  }

  /** The material of every painted road tile now drawn, by `q,r` (read-only diagnostics). */
  private roadTileTypes: Record<string, string> = {};

  /**
   * Slightly softened borders between grounds (owner request 2026-10-05: smooth
   * the edges a little, not a blur). Where two different grounds meet, each
   * reaches a sixth of a hex into its neighbour in three fading steps, so the
   * hard hex edge becomes a short transition; textures stay sharp, and the
   * map's outer edge and same-ground neighbours are untouched.
   */
  private featherGroundEdges(map: WorldMapDefinition, fillOf: (t: Terrain, alpha: number) => GroundFill): void {
    const g = this.terrainBlend;
    const corners = hexPolygon(0, 0, R * 1.012, S);
    const STEPS: readonly [number, number, number][] = [
      [0, 0.06, 0.5],
      [0.06, 0.12, 0.3],
      [0.12, 0.18, 0.13],
    ];
    // Edge k (corners k, k+1) faces the neighbour at NEIGHBOUR_STEP[k].
    const byGround = new Map<Terrain, number[][]>();
    for (let r = 0; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        const t = this.terrainOf(map, r * map.width + q);
        if (t === 'void') continue;
        const c = this.hexCenter({ q, r });
        for (let k = 0; k < 6; k++) {
          const [dq, dr] = NEIGHBOUR_STEP[k]!;
          const nq = q + dq;
          const nr = r + dr;
          if (nq < 0 || nr < 0 || nq >= map.width || nr >= map.height) continue;
          const nt = this.terrainOf(map, nr * map.width + nq);
          if (nt === 'void' || nt === t) continue;
          const n = this.hexCenter({ q: nq, r: nr });
          const a = { x: c.x + corners[k * 2]!, y: c.y + corners[k * 2 + 1]! };
          const b = { x: c.x + corners[((k + 1) % 6) * 2]!, y: c.y + corners[((k + 1) % 6) * 2 + 1]! };
          // A band inside the neighbour: between the shared edge pulled towards the neighbour's centre by f0 and by f1.
          const at = (p: { x: number; y: number }, f: number) => [p.x + (n.x - p.x) * f, p.y + (n.y - p.y) * f];
          const list = byGround.get(t) ?? [];
          for (const [f0, f1, alpha] of STEPS) list.push([...at(a, f0), ...at(b, f0), ...at(b, f1), ...at(a, f1), alpha]);
          byGround.set(t, list);
        }
      }
    }
    for (const [t, bands] of byGround) {
      for (const [, , alpha] of STEPS) {
        let any = false;
        for (const band of bands) {
          if (band[8] !== alpha) continue;
          g.poly(band.slice(0, 8));
          any = true;
        }
        if (any) g.fill(fillOf(t, alpha));
      }
    }
  }

  private decorSprite(kind: string, size: number, mirror: boolean): Container | null {
    const def = spriteManifest().decor[kind] ?? null;
    if (!def) return null;
    const c = new Container();
    if (graphicsProfile().shadows && kind !== 'grass') c.addChild(groundShadow(HEX_W * 0.16 * size, HEX_W * 0.07 * size, 0.22));
    const s = stillSprite(def, HEX_W, size);
    if (mirror) s.scale.x *= -1;
    c.addChild(s);
    return c;
  }

  /**
   * Map scenery. Climates with nature art (all ten) are dressed by
   * `planNatureScenery` (owner delivery 2026-10-06): the climate's plants, rocks
   * and mountains per terrain, clumps along the borders between grounds and
   * sparse rocks, islets, boats and wildlife on water whose kind is known — all
   * presentation, placed once per map from stable hashes. A map whose climate
   * has none keeps the generic decoration of the map generator.
   */
  private buildDecor(map: WorldMapDefinition, sites: readonly AdventureSiteView[] = []): void {
    const push = (i: number, c: Container) => {
      this.objects.addChild(c);
      const list = this.decorByTile.get(i) ?? [];
      list.push(c);
      this.decorByTile.set(i, list);
    };
    const decorDefs = spriteManifest().decor;
    const plan = planNatureSceneryCached(map, {
      sites: sites.map((v) => v.coord),
      towns: sites.filter((v) => v.archetype === 'town').map((v) => v.coord),
      available: (id) => !!decorDefs[id],
      decor: graphicsProfile().decor,
      artKey: String(Object.keys(decorDefs).length),
    });
    this.naturePlan = plan;
    if (plan.supported) {
      for (const it of plan.items) {
        const c = this.natureSprite(it);
        if (!c) continue;
        const q = it.tile % map.width;
        const r = (it.tile - q) / map.width;
        const { x, y } = this.hexCenter({ q, r });
        // Mountains stand a little below the centre so the painting covers the hex (as before).
        c.position.set(x + it.dx * R, y + it.dy * R + (it.kind === 'mountain' ? R * S * 0.55 : 0));
        c.zIndex = c.y;
        push(it.tile, c);
      }
      return;
    }
    for (let r = 0; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        const i = r * map.width + q;
        if (this.terrainOf(map, i) !== 'mountain') continue;
        const { x, y } = this.hexCenter({ q, r });
        const m = this.decorSprite('mountain', 1 + tileNoise(q, r) * 0.08, tileNoise(q + 3, r) > 0);
        if (!m) continue;
        m.position.set(x, y + R * S * 0.55);
        m.zIndex = m.y;
        push(i, m);
      }
    }
    const streams = deriveStreams(map.seed, map.templateId, map.attempt);
    const items = buildDecor(map, streams);
    // Graphics quality: Medium drops grass tufts and shrubs, Low also every other tree and rock.
    const decor = graphicsProfile().decor;
    for (const [n, d] of items.entries()) {
      if (decor !== 'all' && (d.kind === 'grass' || d.kind === 'shrub')) continue;
      if (decor === 'sparse' && n % 2 === 1) continue;
      if (d.kind === 'rock' && this.terrainOf(map, d.r * map.width + d.q) === 'mountain') continue;
      const s = this.decorSprite(d.kind, d.kind === 'grass' ? d.scale * 0.7 : d.scale, d.rotation > Math.PI);
      if (!s) continue;
      const { x, y } = this.hexCenter({ q: d.q, r: d.r });
      s.position.set(x + d.dx * 0.42 * R, y - d.dz * 0.42 * R * S);
      s.zIndex = s.y;
      push(d.r * map.width + d.q, s);
    }
  }

  /** One nature still, upright and never mirrored (painted light stays on its side); a soft shadow under trees and rocks. */
  private natureSprite(it: NatureItem): Container | null {
    const def = spriteManifest().decor[it.id] ?? null;
    if (!def) return null;
    const c = new Container();
    // Shadows only where they read (trees and rocks), kept small: on a huge map the shadow quads cost the
    // emulated GPU more than the scenery itself (measured 2026-10-06).
    const shadowed = it.role === 'canopy' || it.role === 'rock';
    if (graphicsProfile().shadows && shadowed) {
      // The stills are trimmed to their painted pixels: the shadow follows the visible width.
      const w = (def.width / def.pixelsPerHex) * HEX_W * it.scale;
      c.addChild(groundShadow(w * 0.36, w * 0.13, 0.22));
    }
    c.addChild(stillSprite(def, HEX_W, it.scale));
    return c;
  }

  /** What the map is dressed with (read-only diagnostics for tests): counts per role and kind, the IDs used and the water bodies. */
  sceneryDebug(): {
    climate: string;
    nature: boolean;
    items: number;
    drawn: number;
    byRole: Record<string, number>;
    byKind: Record<string, number>;
    /** Pieces shown now (explored tiles) and any shown on a tile not explored (should be none). */
    shown: number;
    shownUnexplored: number;
    ids: string[];
    water: { kind: string | null; area: number; boundary: boolean; maxClearance: number }[];
    waterItems: { id: string; tile: number; body: string | null; area: number }[];
    /** Location guards drawn beside their sites and whether each faces left (mirrored). */
    guards: { id: string; mirrored: boolean }[];
    /** Every location drawn: the sprite ID of its picture, whether it shows now, and its quest marker's icon (asset ID). */
    sites: { id: string; sprite: string | null; shown: boolean; quest: string | null }[];
  } {
    const plan = this.naturePlan;
    const byRole: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    let drawn = 0;
    let shown = 0;
    let shownUnexplored = 0;
    for (const [tile, list] of this.decorByTile) {
      drawn += list.length;
      for (const c of list) {
        if (!c.visible) continue;
        shown += 1;
        if (this.explored[tile] !== 1) shownUnexplored += 1;
      }
    }
    for (const it of plan?.items ?? []) {
      byRole[it.role] = (byRole[it.role] ?? 0) + 1;
      byKind[it.kind] = (byKind[it.kind] ?? 0) + 1;
    }
    return {
      climate: plan?.climate ?? '',
      nature: !!plan?.supported,
      items: plan?.items.length ?? 0,
      drawn,
      byRole,
      byKind,
      shown,
      shownUnexplored,
      ids: [...new Set((plan?.items ?? []).map((it) => it.id))].sort(),
      water: (plan?.water.components ?? []).map((c) => ({ kind: c.kind, area: c.area, boundary: c.boundary, maxClearance: c.maxClearance })),
      waterItems: (plan?.items ?? [])
        .filter((it) => it.kind === 'water')
        .map((it) => {
          const c = plan!.water.components[plan!.water.componentOf[it.tile]!]!;
          return { id: it.id, tile: it.tile, body: c.kind, area: c.area };
        }),
      guards: [...this.sites.entries()].filter(([, e]) => !!e.guard).map(([id, e]) => ({ id, mirrored: e.guard!.mirror })),
      sites: [...this.sites.entries()].map(([id, e]) => ({ id, sprite: e.spriteId, shown: e.root.visible, quest: e.questKey ? e.questKey.slice(0, e.questKey.indexOf('|')) : null })),
    };
  }

  /** Draw the fog; with `explored` also what follows the explored area (grid, roads, decor). */
  private applyFog(explored: readonly number[], visible: ReadonlySet<number>, full = true): void {
    const map = this.map;
    if (!map) return;
    this.explored = explored;
    const fog = this.fog;
    const grid = this.grid;
    fog.clear();
    if (full) {
      grid.clear();
      this.groundCache.invalidate();
    }
    const unknown = hexToRgb(UNKNOWN_COLOR);
    // Soft fog (2026-10-05): the edges of the unknown and of what is out of sight fade over a
    // fraction of a hex instead of following hex outlines; tile drawing stays without a canvas.
    const soft = this.drawSoftFog(map, explored, visible, unknown);
    for (let i = 0; i < map.width * map.height; i++) {
      const q = i % map.width;
      const r = Math.floor(i / map.width);
      if (this.terrainOf(map, i) === 'void') continue;
      const known = explored[i] === 1;
      const vis = visible.has(i);
      if (full) for (const d of this.decorByTile.get(i) ?? []) d.visible = known;
      const { x, y } = this.hexCenter({ q, r });
      if (!known) {
        // Unexplored ground is plain black, like the space around the map (owner request 2026-10-04).
        if (!soft) fog.poly(hexPolygon(x, y, R * 1.03, S)).fill({ color: rgbOf(unknown[0], unknown[1], unknown[2]) });
      } else {
        // Remembered tiles: shaded whole hexes meeting edge to edge (no darker seams between tiles).
        if (!vis && !soft) fog.poly(hexPolygon(x, y, R, S)).fill({ color: 0x000000, alpha: 0.42 });
        if (full && this.gridMode === 'always') grid.poly(hexPolygon(x, y, R * 0.985, S));
      }
    }
    if (!full) return;
    if (this.gridMode === 'always') grid.stroke({ width: 1.1, color: 0x0d121a, alpha: 0.42 });
    // Roads only over explored tiles (the fog above dims what is out of sight).
    this.drawRoads(map, explored);
  }

  private drawSoftFog(map: WorldMapDefinition, explored: readonly number[], visible: ReadonlySet<number>, unknown: readonly number[]): boolean {
    if (typeof document === 'undefined' || !graphicsProfile().softGround) return false;
    const b = this.mapBounds(map);
    const pad = HEX_W;
    let fc = this.fogCanvas;
    if (!fc || fc.map !== map) {
      if (fc) fc.sprite.destroy({ texture: true, textureSource: true });
      // At most 1536 pixels across (a huge map): the picture is blurred anyway, and it is redrawn and re-sent to the GPU when the fog changes.
      const k = Math.min(0.3, 1536 / Math.max(1, b.maxX - b.minX + pad * 2), 1536 / Math.max(1, b.maxY - b.minY + pad * 2));
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil((b.maxX - b.minX + pad * 2) * k);
      canvas.height = Math.ceil((b.maxY - b.minY + pad * 2) * k);
      const texture = Texture.from(canvas);
      const sprite = new Sprite(texture);
      sprite.position.set(b.minX - pad, b.minY - pad);
      sprite.scale.set(1 / k);
      this.fogSoft.addChild(sprite);
      fc = this.fogCanvas = { canvas, texture, sprite, k, map };
    }
    const ctx = fc.canvas.getContext('2d');
    if (!ctx) return false;
    const k = fc.k;
    ctx.clearRect(0, 0, fc.canvas.width, fc.canvas.height);
    const path = (want: (i: number) => boolean, grow: number) => {
      ctx.beginPath();
      for (let i = 0; i < map.width * map.height; i++) {
        if (this.terrainOf(map, i) === 'void' || !want(i)) continue;
        const { x, y } = this.hexCenter({ q: i % map.width, r: Math.floor(i / map.width) });
        const poly = hexPolygon((x - b.minX + pad) * k, (y - b.minY + pad) * k, R * k * grow, S);
        ctx.moveTo(poly[0]!, poly[1]!);
        for (let j = 2; j < poly.length; j += 2) ctx.lineTo(poly[j]!, poly[j + 1]!);
        ctx.closePath();
      }
    };
    const px = (v: number) => `${Math.max(1, v * k).toFixed(1)}px`;
    ctx.filter = `blur(${px(HEX_W * 0.22)})`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    path((i) => explored[i] === 1 && !visible.has(i), 1.04);
    ctx.fill();
    // The unknown, grown a little so its fade never shows the ground beneath it.
    ctx.filter = `blur(${px(HEX_W * 0.16)})`;
    ctx.fillStyle = `rgb(${Math.round(unknown[0]! * 255)}, ${Math.round(unknown[1]! * 255)}, ${Math.round(unknown[2]! * 255)})`;
    path((i) => explored[i] !== 1, 1.28);
    ctx.fill();
    ctx.filter = 'none';
    fc.texture.source.update();
    return true;
  }

  /**
   * Roads as rounded runs between junctions, in the style of the map's climate
   * (`roads.ts`): a dark verge, the road, its worn middle and ruts, flagstones or
   * cobbles — and planks where the road crosses a marsh.
   */
  /**
   * Painted roads (GPT-6 Brief 16): one tile per road hex, chosen by the hex's
   * connections (63 patterns in three sheets per road type) and by its land
   * (`roadTypeFor`). Used only when all three sheets of every road type the map
   * needs are registered and loaded, so a map never mixes painted and drawn
   * roads; until then (or without them) the roads are drawn by code. Returns
   * whether the tiles were drawn.
   */
  private roadMaterialCache: { map: WorldMapDefinition; types: Map<string, RoadType> } | null = null;

  private roadMaterials(map: WorldMapDefinition): Map<string, RoadType> {
    if (this.roadMaterialCache?.map === map) return this.roadMaterialCache.types;
    const edges = map.roads.map((k) => k.split('|') as [string, string]);
    const raw = (key: string): RoadType => {
      const [q, r] = key.split(',').map(Number);
      return roadTypeFor(map.biome, this.terrainOf(map, r! * map.width + q!));
    };
    const types = smoothRoadTypes(edges, raw);
    this.roadMaterialCache = { map, types };
    return types;
  }

  private drawRoadTiles(map: WorldMapDefinition, explored: readonly number[]): boolean {
    const sheets = spriteManifest().roads;
    if (!sheets || map.roads.length === 0) return false;
    const masks = new Map<number, number>();
    for (const k of map.roads) {
      const [a, b] = k.split('|');
      const [aq, ar] = a!.split(',').map(Number);
      const [bq, br] = b!.split(',').map(Number);
      const ia = ar! * map.width + aq!;
      const ib = br! * map.width + bq!;
      if (explored[ia] !== 1 || explored[ib] !== 1) continue;
      const da = NEIGHBOUR_STEP.findIndex(([dq, dr]) => dq === bq! - aq! && dr === br! - ar!);
      const db = NEIGHBOUR_STEP.findIndex(([dq, dr]) => dq === aq! - bq! && dr === ar! - br!);
      if (da < 0 || db < 0) continue;
      masks.set(ia, (masks.get(ia) ?? 0) | (1 << da));
      masks.set(ib, (masks.get(ib) ?? 0) | (1 << db));
    }
    // One material per stretch of road (smoothRoadTypes), over every road of the map so the fog never changes a tile.
    const smooth = this.roadMaterials(map);
    const typeOf = (i: number): RoadType => smooth.get(`${i % map.width},${Math.floor(i / map.width)}`) ?? roadTypeFor(map.biome, this.terrainOf(map, i));
    const types = new Set<RoadType>();
    for (const i of masks.keys()) types.add(typeOf(i));
    const keys = [...types].flatMap((t) => ROAD_PARTS.map((p) => `${t}.${p}`));
    if (keys.some((k) => !sheets[k])) return false;
    const missing = keys.filter((k) => !this.roadSheets.has(k));
    if (missing.length > 0) {
      const build = this.mapBuild;
      if (!this.roadSheetsLoading) {
        this.roadSheetsLoading = true;
        void Promise.allSettled(missing.map((k) => loadTexture(spriteUrl(sheets[k]!.file)).then((tex) => this.roadSheets.set(k, tex)))).then(() => {
          this.roadSheetsLoading = false;
          if (!this.disposed && this.map && this.mapBuild === build && this.explored && keys.every((k) => this.roadSheets.has(k))) this.drawRoads(this.map, this.explored);
        });
      }
      return false;
    }
    for (const [i, mask] of masks) {
      const slot = roadTileSlot(mask);
      if (!slot) continue;
      const key = `${typeOf(i)}.${slot.part}`;
      const def = sheets[key]!;
      const fk = `${key}#${slot.index}`;
      let frame = this.roadFrames.get(fk);
      if (!frame) {
        const tex = this.roadSheets.get(key)!;
        const x = (slot.index % def.cols) * def.cell;
        const y = Math.floor(slot.index / def.cols) * def.cell;
        frame = new Texture({ source: tex.source, frame: new Rectangle(x, y, def.cell, def.cell) });
        this.roadFrames.set(fk, frame);
      }
      const sp = new Sprite(frame);
      sp.anchor.set(0.5);
      const { x, y } = this.hexCenter({ q: i % map.width, r: Math.floor(i / map.width) });
      sp.position.set(x, y);
      sp.scale.set(HEX_W / def.hexWidth);
      this.roadTiles.addChild(sp);
      this.roadTileTypes[`${i % map.width},${Math.floor(i / map.width)}`] = typeOf(i);
    }
    return true;
  }

  private drawRoads(map: WorldMapDefinition, explored: readonly number[]): void {
    this.groundCache.invalidate();
    const g = this.roads;
    g.clear();
    for (const c of this.roadTiles.removeChildren()) c.destroy();
    this.roadTileTypes = {};
    if (this.drawRoadTiles(map, explored)) return;
    const edges: [string, string][] = [];
    for (const k of map.roads) {
      const [a, b] = k.split('|');
      const [aq, ar] = a!.split(',').map(Number);
      const [bq, br] = b!.split(',').map(Number);
      if (explored[ar! * map.width + aq!] !== 1 || explored[br! * map.width + bq!] !== 1) continue;
      edges.push([a!, b!]);
    }
    if (edges.length === 0) return;
    const style = roadStyleFor(map.biome);
    const point = (key: string) => {
      const [q, r] = key.split(',').map(Number);
      return this.hexCenter({ q: q!, r: r! });
    };
    const runs = roadRuns(edges).map((run) => smoothRun(run.map(point), 3));
    const line = (pts: readonly RoadPoint[]) => {
      g.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
    };
    for (const pts of runs) line(pts);
    g.stroke({ width: R * 0.46, color: style.edge, alpha: 0.55, cap: 'round', join: 'round' });
    for (const pts of runs) line(pts);
    g.stroke({ width: R * 0.32, color: style.body, alpha: 1, cap: 'round', join: 'round' });
    for (const pts of runs) line(pts);
    g.stroke({ width: R * 0.13, color: style.light, alpha: 0.38, cap: 'round', join: 'round' });
    // Details by the land: ruts, flagstone joints or cobbles.
    if (style.detail === 'ruts') {
      for (const pts of runs) for (const side of [-1, 1]) line(offsetRun(pts, side * R * 0.085));
      g.stroke({ width: 1.4, color: style.mark, alpha: 0.5, cap: 'round', join: 'round' });
    } else {
      runs.forEach((pts, n) => {
        for (const m of marksAlong(pts, style.detail === 'flags' ? R * 0.2 : R * 0.13, n * 3.7)) {
          if (style.detail === 'flags') {
            g.moveTo(m.x - m.dy * R * 0.15, m.y + m.dx * R * 0.15).lineTo(m.x + m.dy * R * 0.15, m.y - m.dx * R * 0.15);
          } else {
            for (const side of [-0.08, 0.08]) g.circle(m.x - m.dy * R * side + m.dx * (side > 0 ? R * 0.06 : 0), m.y + m.dx * R * side + m.dy * (side > 0 ? R * 0.06 : 0), R * 0.045);
          }
        }
      });
      if (style.detail === 'flags') g.stroke({ width: 1.2, color: style.mark, alpha: 0.5 });
      else g.fill({ color: style.mark, alpha: 0.45 });
    }
    // Boardwalks: planks across the road wherever it runs over marsh.
    const marsh = (x: number, y: number) => {
      const c = pointAxial(x, y, R, S);
      return c.q >= 0 && c.r >= 0 && c.q < map.width && c.r < map.height && this.terrainOf(map, c.r * map.width + c.q) === 'marsh';
    };
    let planks = false;
    runs.forEach((pts, n) => {
      for (const m of marksAlong(pts, R * 0.12, n * 1.3)) {
        if (!marsh(m.x, m.y)) continue;
        planks = true;
        g.moveTo(m.x - m.dy * R * 0.2, m.y + m.dx * R * 0.2).lineTo(m.x + m.dy * R * 0.2, m.y - m.dx * R * 0.2);
      }
    });
    if (planks) g.stroke({ width: R * 0.075, color: PLANK_COLOR, alpha: 0.95, cap: 'butt' });
  }

  private buildReach(tiles: readonly HexCoord[] | null): void {
    const g = this.reach;
    g.clear();
    if (!tiles || tiles.length === 0) return;
    for (const c of tiles) {
      const { x, y } = this.hexCenter(c);
      // Whole hexes that meet edge to edge: no lines between tiles (owner request 2026-10-04).
      g.poly(hexPolygon(x, y, R, S));
    }
    g.fill({ color: colorOf(HIGHLIGHT_REACH), alpha: 0.2 });
  }

  // ------------------------------------------------------------------ the planned route

  /** The kit's route pictures, loaded once for the whole map (cached by URL in `textures`). */
  private routeArt: Partial<Record<RouteMarkerId, { tex: Texture; art: RouteMarkerArt }>> = {};
  private routeArtState: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';
  private lastPath: AdventurePathView | null = null;
  /** Painted markers that a distant zoom leaves out (every other chevron, the later hourglasses). */
  private routeThin: Container[] = [];
  /** Every painted marker (each in a holder at its point): a distant zoom draws them larger, so they stay readable. */
  private routeMarks: Container[] = [];
  private routeFar = false;
  /** How much larger the markers are drawn at the current zoom (1 from a near zoom; they keep their size on screen farther out). */
  private routeGrow = 1;
  /** The destination seal (its gentle pulse), and what the route shows (diagnostics). */
  private routeSeal: Container | null = null;
  private routeInfo: Omit<RouteDebug, 'ring' | 'thinned'> = { mode: 'none', today: 0, later: 0, hourglasses: 0, destination: null, badge: null };
  private ringPainted = false;

  private ensureRouteArt(): void {
    if (this.routeArtState !== 'idle') return;
    const want = ROUTE_MARKER_IDS.map((id) => ({ id, art: routeMarkerArt(id) })).filter((w): w is { id: RouteMarkerId; art: RouteMarkerArt } => !!w.art);
    if (!want.some((w) => w.id === 'chevronToday')) {
      this.routeArtState = 'failed';
      return;
    }
    this.routeArtState = 'loading';
    void Promise.allSettled(
      want.map((w) =>
        loadTexture(w.art.url, { mipmaps: true }).then((tex) => {
          this.routeArt[w.id] = { tex, art: w.art };
        }),
      ),
    ).then(() => {
      if (this.disposed) return;
      const a = this.routeArt;
      this.routeArtState = a.chevronToday && a.chevronLater && a.destination ? 'ready' : 'failed';
      this.applyRingArt();
      this.buildPath(this.lastPath);
      this.wake();
    });
  }

  /** The selected hero's ring: the painted hollow ring, laid like the drawn one, once its picture is in. */
  private applyRingArt(): void {
    const ring = this.routeArt.selectionRing;
    if (!ring || this.ringPainted) return;
    const [l, , r] = ring.art.visibleBounds;
    const sp = new Sprite(ring.tex);
    const [, t, , b] = ring.art.visibleBounds;
    sp.anchor.set((l + r) / 2, (t + b) / 2);
    // The painted ring covers the drawn ring's ellipse: HEX_W × 0.88 across, flattened as the ground ring.
    const k = (HEX_W * 0.88) / Math.max(1, (r - l) * ring.tex.width);
    sp.scale.set(k, k * S * 0.5);
    sp.eventMode = 'none';
    this.selectRingShape.visible = false;
    this.selectRing.addChild(sp);
    this.ringPainted = true;
  }

  /**
   * A marker laid on the ground: sized by its painted part (`visibleWidth` world units across),
   * turned in the ground plane by `angle` (0 = the picture's own up), then foreshortened once by
   * the map's ground squash — never turned after squashing.
   */
  private groundMarker(m: { tex: Texture; art: RouteMarkerArt }, x: number, y: number, visibleWidth: number, angle: number, squash = S): Sprite {
    const [l, t, r, b] = m.art.visibleBounds;
    const sp = new Sprite(m.tex);
    sp.anchor.set((l + r) / 2, (t + b) / 2);
    const k = visibleWidth / Math.max(1, (r - l) * m.tex.width);
    sp.setFromMatrix(new Matrix().scale(k, k).rotate(angle).scale(1, squash).translate(x, y));
    sp.eventMode = 'none';
    return sp;
  }

  /** A route arrowhead with a soft dark copy under it (the same picture, tinted): it reads on snow, sand and roads alike. */
  private chevron(m: { tex: Texture; art: RouteMarkerArt }, visibleWidth: number, angle: number): Container[] {
    const shade = this.groundMarker(m, R * 0.035, R * 0.06, visibleWidth * 1.06, angle);
    shade.tint = 0x000000;
    shade.alpha = 0.42;
    return [shade, this.groundMarker(m, 0, 0, visibleWidth, angle)];
  }

  /** A holder at (x, y) for a marker drawn around its own origin (scaled as one at a distant zoom). */
  private markAt(x: number, y: number, ...children: Container[]): Container {
    const h = new Container();
    h.position.set(x, y);
    h.eventMode = 'none';
    h.addChild(...children);
    this.routeLayer.addChild(h);
    this.routeMarks.push(h);
    return h;
  }

  /** A marker standing upright (hourglass, parchment): sized by its painted height, its painted foot at (x, y). */
  private uprightMarker(m: { tex: Texture; art: RouteMarkerArt }, x: number, y: number, visibleHeight: number, anchorY: 'foot' | 'centre' = 'foot'): Sprite {
    const [l, t, r, b] = m.art.visibleBounds;
    const sp = new Sprite(m.tex);
    sp.anchor.set((l + r) / 2, anchorY === 'foot' ? b : (t + b) / 2);
    sp.scale.set(visibleHeight / Math.max(1, (b - t) * m.tex.height));
    sp.position.set(x, y);
    sp.eventMode = 'none';
    return sp;
  }

  private buildPath(path: AdventurePathView | null): void {
    this.lastPath = path;
    const g = this.pathLayer;
    g.clear();
    for (const c of this.routeLayer.removeChildren()) c.destroy({ children: true });
    this.routeThin = [];
    this.routeMarks = [];
    this.routeSeal = null;
    this.routeFar = false;
    this.routeInfo = { mode: 'none', today: 0, later: 0, hourglasses: 0, destination: null, badge: null };
    if (!path || (path.steps.length === 0 && !(path.blocked && path.destination))) return;
    this.ensureRouteArt();
    if (this.routeArtState === 'ready') {
      this.buildPaintedPath(path);
      return;
    }
    if (path.steps.length === 0) {
      // Blocked journey without the pictures: a hollow ring with a bar across, at the destination.
      const p = this.hexCenter(path.destination!);
      g.ellipse(p.x, p.y, R * 0.3, R * 0.3 * S).stroke({ width: R * 0.08, color: colorOf(PATH_LATER), alpha: 0.8 });
      g.moveTo(p.x - R * 0.2, p.y + R * 0.2 * S).lineTo(p.x + R * 0.2, p.y - R * 0.2 * S).stroke({ width: R * 0.08, color: colorOf(PATH_ENCOUNTER) });
      this.routeInfo = { ...this.routeInfo, mode: 'drawn', destination: 'blocked' };
      return;
    }
    this.routeInfo = { ...this.routeInfo, mode: 'drawn', destination: path.encounter ? 'battle' : 'seal' };
    const today = colorOf(PATH_TODAY);
    const later = colorOf(PATH_LATER);
    const enc = colorOf(PATH_ENCOUNTER);
    const dark = 0x0f141f;
    const last = path.steps.length - 1;
    const start = this.selectedHero ? this.heroes.get(this.selectedHero)?.coord : undefined;
    let prev = start ? this.hexCenter(start) : null;
    path.steps.forEach((c, i) => {
      const p = this.hexCenter(c);
      const col = i <= path.stopIndex ? today : later;
      if (prev) g.moveTo(prev.x, prev.y).lineTo(p.x, p.y).stroke({ width: R * 0.12, color: col, alpha: 0.9, cap: 'round' });
      prev = p;
    });
    path.steps.forEach((c, i) => {
      const p = this.hexCenter(c);
      const col = i <= path.stopIndex ? today : later;
      if (i === last) {
        if (path.encounter) {
          // Crossed-swords "X" marker: shape, not only colour.
          const k = R * 0.32;
          g.moveTo(p.x - k, p.y - k * S).lineTo(p.x + k, p.y + k * S).moveTo(p.x - k, p.y + k * S).lineTo(p.x + k, p.y - k * S).stroke({ width: R * 0.14, color: enc, cap: 'round' });
        } else {
          g.ellipse(p.x, p.y, R * 0.3, R * 0.3 * S).fill({ color: col });
          g.ellipse(p.x, p.y, R * 0.18, R * 0.18 * S).fill({ color: dark });
        }
      } else {
        // Today: solid dot; later days: hollow ring (shape cue).
        g.ellipse(p.x, p.y, R * 0.14, R * 0.14 * S).fill({ color: col });
        if (i > path.stopIndex) g.ellipse(p.x, p.y, R * 0.07, R * 0.07 * S).fill({ color: dark });
      }
    });
  }

  /**
   * The route in the kit's painted markers, from the pathfinder's own steps: a small arrowhead on
   * every step but the last, turned toward the next step — gold for today, bronze for later days,
   * with an upright hourglass where a later day begins (shape, not colour alone). The destination
   * gets the compass seal on the ground and an upright parchment with the arrival day; a battle
   * there keeps the crossed swords instead of the seal, a blocked destination its seal with a lock.
   */
  private buildPaintedPath(path: AdventurePathView): void {
    const art = this.routeArt as Required<typeof this.routeArt>;
    const steps = path.steps;
    const last = steps.length - 1;
    const pts = steps.map((c) => this.hexCenter(c));
    const days = path.days && path.days.length === steps.length ? path.days : null;
    const dayOf = (i: number) => (days ? days[i]! : i <= path.stopIndex ? 1 : 2);
    let today = 0;
    let later = 0;
    let hourglasses = 0;
    for (let i = 0; i < last; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      // The step's direction on the ground (undo the squash), then the picture's "up" turned onto it.
      const angle = Math.atan2(b.x - a.x, -(b.y - a.y) / S);
      const d = dayOf(i);
      const isLater = d > 1;
      const m = isLater ? (art.chevronLater ?? art.chevronToday) : art.chevronToday;
      const sp = this.markAt(a.x, a.y, ...this.chevron(m, HEX_W * (isLater ? 0.27 : 0.3), angle));
      if (isLater) later++;
      else today++;
      const newDay = i === 0 ? d > 1 : d > dayOf(i - 1);
      if (newDay && art.hourglass) {
        const hg = this.markAt(a.x + HEX_W * 0.2, a.y + R * 0.1, this.uprightMarker(art.hourglass, 0, 0, HEX_W * 0.3));
        hourglasses++;
        // At a distance only the first later day keeps its hourglass.
        if (hourglasses > 1) this.routeThin.push(hg);
      } else if (i % 2 === 1 && i !== path.stopIndex) this.routeThin.push(sp);
    }
    const dest = path.destination ?? steps[last];
    let destination: RouteDebug['destination'] = null;
    let badge: string | null = null;
    if (dest) {
      const p = this.hexCenter(dest);
      if (path.encounter) {
        // A battle waits there: the crossed swords stay (the compass never hides a battle).
        const k = R * 0.32;
        const enc = colorOf(PATH_ENCOUNTER);
        this.pathLayer.moveTo(p.x - k, p.y - k * S).lineTo(p.x + k, p.y + k * S).moveTo(p.x - k, p.y + k * S).lineTo(p.x + k, p.y - k * S).stroke({ width: R * 0.14, color: enc, cap: 'round' });
        destination = 'battle';
      } else {
        const holder = this.markAt(p.x, p.y, this.groundMarker(art.destination, 0, 0, HEX_W * 0.54, 0));
        if (path.blocked) {
          holder.alpha = 0.6;
          // The lock: shackle and body, upright over the seal.
          const lock = new Graphics();
          const w = R * 0.22;
          lock.roundRect(-w / 2, -w * 0.15, w, w * 0.8, w * 0.12).fill({ color: 0x2a1d10 }).stroke({ width: R * 0.03, color: 0xe9cf8d });
          lock.arc(0, -w * 0.15, w * 0.3, Math.PI, 0).stroke({ width: R * 0.05, color: 0xe9cf8d });
          lock.position.set(0, -R * 0.12);
          this.markAt(p.x, p.y, lock);
          destination = 'blocked';
        } else {
          this.routeSeal = holder;
          destination = 'seal';
        }
      }
      // The arrival day on its upright parchment (live text; never painted into the picture).
      if (!path.blocked && path.arrivalDay != null && art.dayBadge) {
        const bx = p.x + HEX_W * 0.34;
        const by = p.y - R * 0.62;
        const parchment = this.uprightMarker(art.dayBadge, 0, 0, HEX_W * 0.38, 'centre');
        const n = new Text({
          text: String(path.arrivalDay),
          style: { fontFamily: 'Cinzel, Georgia, serif', fontSize: Math.round(HEX_W * 0.27), fontWeight: '700', fill: 0x3b2412 },
          resolution: 3,
        });
        n.anchor.set(0.5, 0.52);
        n.eventMode = 'none';
        this.markAt(bx, by, parchment, n);
        badge = String(path.arrivalDay);
      }
    }
    this.routeInfo = { mode: 'painted', today, later, hourglasses, destination, badge };
    this.applyRouteZoom(true);
  }

  /** At a distant zoom the route thins out (every other chevron, one hourglass), so the map is not covered in arrows. */
  private applyRouteZoom(force = false): void {
    const far = this.cam.zoom < 0.72;
    const grow = Math.round(Math.max(1, ROUTE_MARK_ZOOM / Math.max(0.05, this.cam.zoom)) * 100) / 100;
    if (far === this.routeFar && grow === this.routeGrow && !force) return;
    this.routeFar = far;
    this.routeGrow = grow;
    for (const m of this.routeThin) m.visible = !far;
    for (const m of this.routeMarks) m.scale.set(grow);
  }

  /** Read-only route state (tests, diagnostics). */
  routeDebug(): RouteDebug {
    return { ...this.routeInfo, ring: this.ringPainted ? 'painted' : 'drawn', thinned: this.routeFar ? this.routeThin.length : 0 };
  }

  // ------------------------------------------------------------------ sites & heroes

  private disposeSite(s: SiteEntry): void {
    s.guard?.destroy();
    s.root.destroy({ children: true });
  }

  /** Owner banner on a pole: square = yours, pennant = others (ownership is never colour alone). */
  private banner(color: string, shape: 'square' | 'pennant', height: number): Graphics {
    const g = new Graphics();
    const c = colorOf(color);
    g.moveTo(0, 0).lineTo(0, -height).stroke({ width: 2.2, color: 0x3a2c1c });
    const top = -height;
    if (shape === 'square') g.rect(1, top, R * 0.42, R * 0.3).fill({ color: c }).stroke({ width: 1, color: 0x1a1208, alpha: 0.6 });
    else g.poly([1, top, 1 + R * 0.5, top + R * 0.15, 1, top + R * 0.3]).fill({ color: c }).stroke({ width: 1, color: 0x1a1208, alpha: 0.6 });
    return g;
  }

  private held(c: HexCoord): boolean {
    for (const a of this.arrivals.values()) if (a.q === c.q && a.r === c.r) return true;
    return false;
  }

  /**
   * Scouting intel: one LAST KNOWN marker per stale report — a hollow ground ring and a faded
   * pennant in the owner's banner colour (the existing "not yours" banner shape) with a question
   * mark. Drawn once per change of the list; no army data is drawn (the panel holds the report).
   */
  private syncSignals(list: NonNullable<AdventureView['signals']>): void {
    const key = JSON.stringify(list); if (key === this.signalKey) return; this.signalKey = key;
    for (const child of this.signalLayer.removeChildren()) child.destroy({ children: true });
    for (const signal of list) {
      const p = this.hexCenter(signal.coord), root = new Container(); root.eventMode = 'none'; root.position.set(p.x, p.y);
      root.addChild(new Graphics().ellipse(0, 0, R * .6, R * S * .3).stroke({ color: 0x75e8cd, width: 2, alpha: .75 }).circle(0, -R * .4, R * .15).fill({ color: 0xb9ffe9, alpha: .9 }));
      const label = new Text({ text: signal.identified ? 'FOXFIRE' : 'SIGNAL ?', style: { fontFamily: 'Georgia', fontSize: 9, fill: 0xe6fbe9, stroke: { color: 0x061017, width: 3 } }, resolution: 2 }); label.anchor.set(.5, 1); label.position.set(0, -R * .6); root.addChild(label); this.signalLayer.addChild(root);
    }
  }

  private syncLastKnown(list: readonly AdventureLastKnownView[]): void {
    const key = list.map((m) => `${m.id}@${m.coord.q},${m.coord.r}|${m.color}|${m.day}`).join(';');
    if (key === this.lastKnownKey) return;
    this.lastKnownKey = key;
    for (const old of this.lastKnownLayer.removeChildren()) old.destroy({ children: true });
    this.lastKnownDrawn = list.map((m) => ({ id: m.id, q: m.coord.q, r: m.coord.r, day: m.day }));
    for (const m of list) {
      const { x, y } = this.hexCenter(m.coord);
      const root = new Container();
      const c = colorOf(m.color);
      const ring = new Graphics();
      ring
        .ellipse(0, 0, HEX_W * 0.3, HEX_W * 0.3 * S * 0.5)
        .fill({ color: 0x05090f, alpha: 0.35 })
        .stroke({ width: 2, color: c, alpha: 0.9 })
        .ellipse(0, 0, HEX_W * 0.38, HEX_W * 0.38 * S * 0.5)
        .stroke({ width: 1, color: 0xf5e4b7, alpha: 0.55 });
      root.addChild(ring);
      const flag = this.banner(m.color, 'pennant', R * 1.3);
      flag.position.set(-HEX_W * 0.04, -1);
      flag.alpha = 0.75;
      root.addChild(flag);
      const mark = new Text({
        text: '?',
        style: { fontFamily: 'Cinzel, Georgia, serif', fontSize: Math.round(HEX_W * 0.3), fontWeight: '700', fill: 0xf5e4b7, stroke: { color: 0x05090f, width: 3 } },
        resolution: 2,
      });
      mark.anchor.set(0.5, 1);
      mark.position.set(HEX_W * 0.14, -R * 0.15);
      root.addChild(mark);
      root.position.set(x, y + R * S * 0.3);
      root.alpha = 0.92;
      this.lastKnownLayer.addChild(root);
    }
    this.wake();
  }

  /** Last-known markers drawn (read-only diagnostics for tests). */
  lastKnownDebug(): readonly { id: string; q: number; r: number; day: number }[] {
    return this.lastKnownDrawn.map((m) => ({ ...m }));
  }

  /** A hero arrived (or will not be animated): its destination's locations show their current state. */
  private releaseArrival(heroId: string): void {
    if (!this.arrivals.delete(heroId)) return;
    if (!this.disposed) this.syncSites(this.lastSites);
    if (!this.disposed) this.seaSiteLayer.sync(this.lastSeaSites);
  }

  private syncSites(latest: readonly AdventureSiteView[]): void {
    const seen = new Set<string>();
    const views = latest.map((v) => (this.held(v.coord) ? (this.drawnSites.get(v.id) ?? v) : v));
    // A location at a held destination that left the view (taken) stays until the hero arrives.
    for (const [id, v] of this.drawnSites) if (!latest.some((x) => x.id === id) && this.held(v.coord)) views.push(v);
    this.drawnSites = new Map(views.map((v) => [v.id, v]));
    for (const v of views) {
      seen.add(v.id);
      let e = this.sites.get(v.id);
      if (!v.shown || ((v.archetype === 'pickup' || v.archetype === 'treasure_chest') && v.claimed)) {
        if (e) e.root.visible = false;
        continue;
      }
      // The site's own picture when the manifest has it (art, state, ferry, hiring site), else its kind's.
      const pick = pickSiteSprite(v.sprites, v.archetype, v.variant);
      const def = pick.def;
      const kindKey = `${v.archetype}|${v.variant ?? ''}`;
      const key = `${kindKey}|${pick.id ?? ''}`;
      if (e && e.key !== key && e.kindKey === kindKey && def && e.root.visible) {
        // The same location with a new picture (a sluice opened or closed): the new picture replaces the old
        // one once it is on the GPU, so the location never blinks out; its marks are placed again for its height.
        const old = e.sprite;
        const next = stillSprite(def, HEX_W);
        e.root.addChildAt(next, e.root.getChildIndex(old) + 1);
        const drop = () => {
          if (!old.destroyed) old.destroy();
        };
        void stillTexture(def).then(drop, drop);
        Object.assign(e, { sprite: next, def, key, spriteId: pick.id, questKey: '', bannerKey: '' });
        e.quest?.destroy({ children: true });
        e.quest = null;
        e.banner?.destroy();
        e.banner = null;
      }
      if (e && e.key !== key) {
        this.disposeSite(e);
        this.sites.delete(v.id);
        e = undefined;
      }
      if (!e) {
        const root = new Container();
        const { x, y } = this.hexCenter(v.coord);
        root.position.set(x, y + R * S * 0.38);
        root.zIndex = root.y;
        // A figure-only location (a sea-monster stack on water) has no picture and no ground shadow.
        if (graphicsProfile().shadows && !FIGURE_SITE_ARCHETYPES.includes(v.archetype)) root.addChild(groundShadow(HEX_W * 0.4, HEX_W * 0.15));
        const sprite = stillSprite(def, HEX_W);
        root.addChild(sprite);
        this.objects.addChild(root);
        e = { root, sprite, def, key, spriteId: pick.id, kindKey, quest: null, questKey: '', glow: null, seal: null, banner: null, bannerKey: '', guard: null, guardKey: '' };
        this.sites.set(v.id, e);
      }
      e.root.visible = true;
      const h = Math.max(R * 0.9, stillHeight(e.def, HEX_W));
      // Lit sites (beacons, event shrines, relics, portals) glow.
      if (v.lit && !e.glow) {
        const g = new Graphics();
        for (let i = 0; i < 5; i++) g.circle(0, 0, R * (0.55 - i * 0.09)).fill({ color: 0xffc56a, alpha: 0.08 });
        g.position.set(0, -h * 0.55);
        g.blendMode = 'add';
        e.root.addChild(g);
        e.glow = g;
      }
      if (e.glow) {
        e.glow.visible = v.lit;
        e.glow.position.set(0, -h * 0.55);
      }
      // A closed gate shows a barrier in its key colour (or neutral iron).
      const closed = (v.archetype === 'gate' || v.archetype === 'key_gate') && !v.open;
      if (closed && !e.seal) {
        const g = new Graphics();
        const w = HEX_W * 0.62;
        g.roundRect(-w / 2, -R * 0.62, w, R * 0.5, 4).fill({ color: colorOf(v.tint, 0x8c3b2a), alpha: 0.78 }).stroke({ width: 2, color: 0x1a1208, alpha: 0.7 });
        for (let i = 1; i < 5; i++) g.moveTo(-w / 2 + (w * i) / 5, -R * 0.62).lineTo(-w / 2 + (w * i) / 5, -R * 0.12).stroke({ width: 1.5, color: 0x1a1208, alpha: 0.6 });
        e.root.addChild(g);
        e.seal = g;
      }
      if (e.seal) e.seal.visible = closed;
      // Ownership banner (towns, mines) or the key colour of key tents and gates.
      const bk = v.ownerColor ? `${v.ownerColor}|${v.ownerShape}` : v.tint ? `tint|${v.tint}` : '';
      if (bk !== e.bannerKey) {
        e.banner?.destroy();
        e.banner = v.ownerColor ? this.banner(v.ownerColor, v.ownerShape, h * 0.9) : v.tint ? this.banner(v.tint, 'pennant', h * 0.8) : null;
        if (e.banner) {
          e.banner.position.set(-HEX_W * 0.36, 0);
          e.root.addChild(e.banner);
        }
        e.bannerKey = bk;
      }
      // The strongest guard stands beside the location, facing left or right by a
      // stable hash of the location (owner request 2026-10-07: not all one way).
      const gk = v.guard ?? '';
      if (gk !== e.guardKey) {
        e.guard?.destroy();
        e.guard = null;
        if (v.guard) {
          // A figure-only location (sea monster): its creature stands alone in the middle of the hex, larger.
          const alone = FIGURE_SITE_ARCHETYPES.includes(v.archetype);
          const f = new SpriteFigure({ set: creatureSprites(v.guard), hexWidth: HEX_W, size: alone ? 0.86 : 0.62, accent: 0x7a2f2a });
          f.view.position.set(alone ? 0 : HEX_W * 0.34, alone ? -R * S * 0.06 : R * S * 0.1);
          f.mirror = facesLeft('guard', v.id);
          e.root.addChild(f.view);
          e.guard = f;
        }
        e.guardKey = gk;
      }
      // The quest marker of an open objective's site (journal state): its icon on a small disc over the picture.
      const qk = v.quest?.url ? `${v.quest.id}|${v.quest.url}` : '';
      if (qk !== e.questKey) {
        e.quest?.destroy({ children: true });
        e.quest = qk ? this.questMarker(v.quest!.url!, h) : null;
        if (e.quest) e.root.addChild(e.quest);
        e.questKey = qk;
      }
    }
    for (const [id, e] of this.sites) {
      if (!seen.has(id)) {
        this.disposeSite(e);
        this.sites.delete(id);
      }
    }
  }

  /**
   * A quest marker standing over a site (drawn once; it never animates): a navy disc with a gold
   * rim and the objective's icon, loaded through `textures.ts` and shown once it is on the GPU.
   */
  private questMarker(url: string, siteHeight: number): Container {
    const c = new Container();
    c.eventMode = 'none';
    const size = HEX_W * 0.42;
    c.addChild(new Graphics().circle(0, 0, size * 0.6).fill({ color: 0x14203a, alpha: 0.85 }).stroke({ width: 2, color: 0xd9b45a, alpha: 0.95 }));
    const icon = new Sprite(Texture.EMPTY);
    icon.anchor.set(0.5);
    icon.visible = false;
    c.addChild(icon);
    // A 192-pixel icon drawn about a fifth of that size: with mipmaps, so it stays smooth at every zoom.
    void loadTexture(url, { mipmaps: true }).then(
      (t) => {
        if (icon.destroyed) return;
        icon.texture = t;
        icon.scale.set((size * 0.9) / Math.max(1, t.width, t.height));
        icon.visible = true;
        this.wake();
      },
      () => undefined,
    );
    c.position.set(0, -siteHeight - size * 0.5);
    return c;
  }

  private placeHero(e: HeroEntry, c: HexCoord): void {
    const { x, y } = this.hexCenter(c);
    const off = e.inTown ? R * 0.42 : 0;
    e.root.position.set(x + off, y + R * S * 0.3 + off * 0.3);
    e.root.zIndex = e.root.y + 1;
  }

  private disposeHero(e: HeroEntry): void {
    e.cancel?.();
    e.figure.destroy();
    e.root.destroy({ children: true });
  }

  private setClip(e: HeroEntry, clip: HeroEntry['clip']): void {
    e.clip = clip;
    e.figure.setLoop(clip === 'walk' ? (e.monster ? 'move' : 'walk') : 'idle');
  }

  private syncHeroes(views: readonly AdventureHeroView[]): void {
    const seen = new Set<string>();
    this.selectedHero = null;
    for (const v of views) {
      seen.add(v.id);
      let e = this.heroes.get(v.id);
      const pantheonId = v.monster ? null : (v.pantheonId ?? null);
      const look = v.monster ? `monster|${v.monster}` : `hero|${pantheonId ?? ''}|${v.color}`;
      if (!e || e.look !== look) {
        const old = e;
        const root = new Container();
        const monster = !!v.monster;
        const figure = monster
          ? new SpriteFigure({ set: creatureSprites(v.monster!), hexWidth: HEX_W, size: 0.8, accent: colorOf(v.color) })
          : new SpriteFigure({ set: heroSprites(pantheonId), hexWidth: HEX_W, accent: colorOf(v.color) });
        let marks: Container | null = null;
        if (graphicsProfile().shadows) root.addChild(groundShadow(HEX_W * 0.34, HEX_W * 0.12));
        if (!monster) {
          // Faction ownership stays visible on the avatar: a base disc and the owner's banner behind the rider.
          marks = new Container();
          marks.addChild(new Graphics().ellipse(0, 0, HEX_W * 0.36, HEX_W * 0.36 * S * 0.5).fill({ color: colorOf(v.color), alpha: 0.5 }).stroke({ width: 1.5, color: colorOf(v.color), alpha: 0.9 }));
          const flag = this.banner(v.color, 'square', R * 1.75);
          flag.position.set(-HEX_W * 0.3, -2);
          marks.addChild(flag);
          root.addChild(marks);
        }
        root.addChild(figure.view);
        e = {
          root,
          figure,
          marks,
          color: v.color,
          look,
          pantheonId,
          monster,
          coord: v.coord,
          prevCoord: old?.prevCoord ?? v.coord,
          locked: 0,
          snapIn: 0,
          inTown: v.inTown,
          clip: 'idle',
          prepares: 0,
          cancel: null,
          aura: null,
          shown: v.shown,
          embarked: !!v.embarked,
          fading: false,
        };
        if (old) {
          root.position.copyFrom(old.root.position);
          figure.mirror = old.figure.mirror;
          this.disposeHero(old);
        } else if (monster) {
          // A wandering band at rest faces either way (stable per band); walking turns it as before.
          figure.mirror = facesLeft('monster', v.id);
        }
        this.objects.addChild(root);
        this.heroes.set(v.id, e);
        this.placeHero(e, v.coord);
        this.setClip(e, 'idle');
      }
      e.inTown = v.inTown;
      if (e.coord.q !== v.coord.q || e.coord.r !== v.coord.r) {
        e.prevCoord = e.coord;
        e.coord = v.coord;
        this.arrivals.set(v.id, v.coord);
        // Give a queued movement playback two frames to claim the hero before snapping.
        if (e.locked === 0) e.snapIn = 2;
      } else if (e.locked === 0 && e.snapIn === 0) {
        this.placeHero(e, v.coord);
      }
      e.shown = v.shown;
      e.embarked = !!v.embarked;
      // Aboard a ship the mounted avatar is hidden (the ship flies the hero's flag), except while it fades.
      if (e.locked === 0) e.root.visible = v.shown && (!e.embarked || e.fading);
      this.syncAura(e, v.monster ? null : (v.aura ?? null));
      if (v.selected) this.selectedHero = v.id;
    }
    for (const [id, e] of this.heroes) {
      if (!seen.has(id)) {
        this.disposeHero(e);
        this.heroes.delete(id);
      }
    }
  }

  /**
   * The looping aura of a map spell on a hero (its delivered strip, anchored at the
   * hero's feet, over the rider). Nothing on Low quality (short flashes only) or
   * without a delivered strip; a still first frame under reduced motion.
   */
  private syncAura(e: HeroEntry, id: string | null): void {
    const def = id && graphicsProfile().effects !== 'simple' ? (spriteManifest().effects[id] ?? null) : null;
    if (e.aura && (!def || e.aura.id !== id)) {
      if (!e.aura.sprite.destroyed) e.aura.sprite.destroy();
      e.aura = null;
    }
    if (!def || e.aura) return;
    const sprite = new Sprite(Texture.EMPTY);
    sprite.anchor.set(def.anchor[0], def.anchor[1]);
    sprite.scale.set(HEX_W / def.pixelsPerHex);
    if (def.additive) sprite.blendMode = 'add';
    e.root.addChild(sprite);
    e.aura = { id: id!, sprite, def };
    void loadStrip(def)
      .then((frames) => {
        if (!sprite.destroyed && sprite.texture === Texture.EMPTY && frames[0]) sprite.texture = frames[0];
      })
      .catch(() => null);
  }

  // ------------------------------------------------------------------ recruitment caravans (wagons)

  /** Where a wagon stands on a tile: the hex's ground point, aside when a hero shares the tile. */
  private placeCaravan(e: CaravanEntry, c: HexCoord, aside: boolean): void {
    const { x, y } = this.hexCenter(c);
    e.root.position.set(x + (aside ? R * 0.62 : 0), y + R * S * (aside ? 0.55 : 0.3));
    e.root.zIndex = e.root.y;
  }

  /** The owner's marks: a base disc and a pennant at the wagon's rear (never mirrored text; colour only). */
  private drawCaravanMarks(e: CaravanEntry): void {
    for (const c of e.marks.removeChildren()) c.destroy({ children: true });
    const color = colorOf(e.color);
    e.marks.addChild(new Graphics().ellipse(0, 0, HEX_W * 0.4, HEX_W * 0.4 * S * 0.5).fill({ color, alpha: 0.42 }).stroke({ width: 1.5, color, alpha: 0.9 }));
    const west = e.heading === 'w' || e.heading === 'nw' || e.heading === 'sw';
    const flag = new Graphics();
    const x0 = (west ? 1 : -1) * HEX_W * 0.4;
    const top = -R * 1.25;
    flag.moveTo(x0, 0).lineTo(x0, top).stroke({ width: 2, color: 0x3b2a1a, alpha: 0.95 });
    // The pennant streams away from the direction of travel.
    const dir = west ? 1 : -1;
    flag.poly([x0, top, x0 + dir * R * 0.62, top + R * 0.16, x0, top + R * 0.34]).fill({ color, alpha: 0.98 }).stroke({ width: 1, color: 0x1a1208, alpha: 0.8 });
    e.marks.addChild(flag);
  }

  /** Turn a wagon to a heading: the painted facing (E, NE, SE) or its mirror, loaded once per heading. */
  private setCaravanHeading(e: CaravanEntry, heading: MapTokenHeading): void {
    const t = mapTokenPicture('wagon', heading);
    const key = t ? `${t.picture.assetId}|${t.flipX}` : 'missing';
    const turned = heading !== e.heading;
    e.heading = heading;
    if (turned) this.drawCaravanMarks(e);
    if (key === e.textureKey) return;
    e.textureKey = key;
    if (!t) {
      e.texture = 'missing';
      e.sprite.visible = false;
      return;
    }
    const k = mapTokenScale(t.picture, HEX_W, t.def.displayHexWidths);
    // Mirrored by a negative x scale around the ground point (the picture's own anchor).
    e.sprite.anchor.set(t.picture.groundAnchor[0], t.picture.groundAnchor[1]);
    e.sprite.scale.set(t.flipX ? -k : k, k);
    e.texture = 'loading';
    void loadTexture(t.url)
      .then((tex) => {
        if (e.sprite.destroyed || e.textureKey !== key) return;
        e.sprite.texture = tex;
        e.sprite.visible = true;
        e.texture = 'ready';
        this.wake();
      })
      .catch(() => {
        if (e.textureKey === key) e.texture = 'missing';
      });
  }

  private syncCaravans(views: readonly AdventureCaravanView[]): void {
    const seen = new Set<string>();
    for (const v of views) {
      seen.add(v.id);
      let e = this.caravans.get(v.id);
      if (!e) {
        const root = new Container();
        const marks = new Container();
        const pose = new Container();
        const sprite = new Sprite(Texture.EMPTY);
        sprite.visible = false;
        const halt = new Graphics();
        // A small halt sign over a held wagon (shape and colour, never colour alone).
        halt.circle(0, 0, R * 0.26).fill({ color: 0x8c1f1a, alpha: 0.95 }).stroke({ width: 2, color: 0xf5e4b7, alpha: 0.95 });
        halt.rect(-R * 0.15, -R * 0.045, R * 0.3, R * 0.09).fill({ color: 0xf5e4b7 });
        halt.position.set(0, -R * 1.55);
        halt.visible = false;
        if (graphicsProfile().shadows) root.addChild(groundShadow(HEX_W * 0.36, HEX_W * 0.12));
        pose.addChild(sprite);
        root.addChild(marks, pose, halt);
        root.eventMode = 'none';
        e = { root, pose, sprite, marks, halt, color: v.color, coord: v.coord, prevCoord: v.coord, heading: 'e', textureKey: '', texture: 'loading', sharesTile: !!v.sharesTile, locked: 0, snapIn: 0, shown: v.shown };
        this.objects.addChild(root);
        this.caravans.set(v.id, e);
        this.drawCaravanMarks(e);
        this.setCaravanHeading(e, 'e');
        this.placeCaravan(e, v.coord, !!v.sharesTile);
      }
      if (e.color !== v.color) {
        e.color = v.color;
        this.drawCaravanMarks(e);
      }
      if (e.locked === 0 && v.toward && (v.toward.q !== v.coord.q || v.toward.r !== v.coord.r)) {
        const a = this.hexCenter(v.coord);
        const b = this.hexCenter(v.toward);
        this.setCaravanHeading(e, tokenHeading(b.x - a.x, b.y - a.y, e.heading));
      }
      e.sharesTile = !!v.sharesTile;
      if (e.coord.q !== v.coord.q || e.coord.r !== v.coord.r) {
        e.prevCoord = e.coord;
        e.coord = v.coord;
        // A queued movement playback claims the wagon within two frames; else it snaps there.
        if (e.locked === 0) e.snapIn = 2;
      } else if (e.locked === 0 && e.snapIn === 0) {
        this.placeCaravan(e, v.coord, e.sharesTile);
      }
      e.shown = v.shown;
      if (e.locked === 0) e.root.visible = v.shown;
      e.halt.visible = !!v.held;
    }
    for (const [id, e] of this.caravans) {
      if (seen.has(id)) continue;
      e.root.destroy({ children: true });
      this.caravans.delete(id);
    }
  }

  /**
   * Movement playback for a committed CaravanMoved event (never changes state): the wagon rolls
   * hex to hex along the committed path, turned to each step's projected direction (six headings
   * from three paintings), with a restrained cart bob — none under reduced motion.
   */
  async playCaravanMove(caravanId: string, path: readonly HexCoord[], speed: number, follow = false): Promise<void> {
    const e = this.caravans.get(caravanId);
    if (!e || path.length === 0) return;
    const end = path[path.length - 1]!;
    const start = end.q === e.coord.q && end.r === e.coord.r ? e.prevCoord : e.coord;
    // A wagon that came into view with this move has no drawn start: it simply stands where it arrived.
    if (start.q === end.q && start.r === end.r) return;
    e.locked += 1;
    e.snapIn = 0;
    this.tweens.speed = speed;
    const bob = !this.calm && speed > 0;
    try {
      let from = start;
      this.placeCaravan(e, from, false);
      for (const step of path) {
        const a = this.hexCenter(from);
        const b = this.hexCenter(step);
        this.setCaravanHeading(e, tokenHeading(b.x - a.x, b.y - a.y, e.heading));
        const base = { x: e.root.x, y: e.root.y };
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        await this.tweens.tween(
          STEP_MS,
          (t) => {
            e.root.position.set(base.x + dx * t, base.y + dy * t);
            e.root.zIndex = e.root.y;
            // Two small jolts per hex: the wheels over the road, not a gait.
            if (bob) e.pose.y = -Math.abs(Math.sin(t * Math.PI * 2)) * R * 0.05;
            if (follow && e.root.visible) this.camGoal = { x: e.root.x, y: e.root.y };
          },
          linear,
        );
        from = step;
      }
    } finally {
      e.locked -= 1;
      if (e.locked === 0) {
        e.pose.y = 0;
        this.placeCaravan(e, e.coord, e.sharesTile);
      }
    }
  }

  /** Read-only wagon state of every caravan drawn (tests and diagnostics). */
  caravanDebug(): Record<string, CaravanTokenDebug> {
    const out: Record<string, CaravanTokenDebug> = {};
    const z = this.cam.zoom;
    for (const [id, e] of this.caravans) {
      out[id] = {
        coord: { q: e.coord.q, r: e.coord.r },
        heading: e.heading,
        flipX: e.sprite.scale.x < 0,
        texture: e.texture,
        shown: e.shown,
        moving: e.locked > 0,
        bob: e.pose.y !== 0,
        x: Math.round(e.root.x * z + this.world.x),
        y: Math.round(e.root.y * z + this.world.y),
      };
    }
    return out;
  }

  // ------------------------------------------------------------------ hero ships (navalMovementV1)

  /** Playback of a committed `ShipMoved` (never changes state): the hull sails the committed sea route. */
  playShipMove(shipId: string, path: readonly HexCoord[], speed: number, follow: boolean, visibleAt?: (coord: HexCoord) => boolean): Promise<void> {
    return this.shipLayer.playMove(shipId, path, speed, follow, visibleAt);
  }

  /** A boarding battle's loser withdrew (`ShipWithdrawn`): its hull sails to the new hex. */
  playShipWithdraw(shipId: string, from: HexCoord, to: HexCoord, speed: number, follow = false): Promise<void> {
    return this.shipLayer.playWithdraw(shipId, from, to, speed, follow);
  }

  /** A launched ship (`ShipLaunched`) rises onto its water. */
  playShipLaunch(shipId: string, speed: number): Promise<void> {
    return this.shipLayer.playLaunch(shipId, speed);
  }

  /** The two ships of a boarding hold still in the boarding pose while the battlefield opens. */
  playShipBoarding(shipIds: readonly string[], speed: number): Promise<void> {
    return this.shipLayer.playBoarding(shipIds, 1300, speed);
  }

  /** A recoil cue on a hull (no hull HP). */
  playShipHit(shipId: string, speed: number): Promise<void> {
    return this.shipLayer.playHit(shipId, speed);
  }

  /** A wrecked hull (`ShipWrecked`, already gone from the rules) fades into the wreck and is removed. */
  playShipSinking(shipId: string, speed: number, fallback?: { coord: HexCoord; facing?: number; color: string | null; occupied?: boolean }): Promise<void> {
    return this.shipLayer.playSinking(shipId, speed, fallback);
  }

  /** Hold a ship on a tile until the release is called (a boarding's winner waits while the wreck sinks). */
  holdShip(shipId: string, at: HexCoord): () => void {
    return this.shipLayer.holdAt(shipId, at);
  }

  /**
   * Embark / disembark (after the command committed): the mounted avatar on the shore and the crewed
   * ship crossfade over 650 ms — the avatar steps a little toward the hull (embark) or off it (disembark).
   */
  async playShipTransition(kind: 'embark' | 'disembark', heroId: string, shipId: string, shore: HexCoord, water: HexCoord, speed: number): Promise<void> {
    const h = this.heroes.get(heroId);
    const a = this.hexCenter(shore);
    const b = this.hexCenter(water);
    const lift = R * S * 0.3;
    if (h) {
      h.locked += 1;
      h.snapIn = 0;
      h.fading = true;
      h.root.visible = h.shown;
      this.faceToward(h, kind === 'embark' ? b.x - a.x : a.x - b.x, kind === 'embark' ? b.y - a.y : a.y - b.y);
    }
    try {
      await this.shipLayer.playTransition(kind, shipId, speed, (alpha, t) => {
        if (!h || h.root.destroyed) return;
        const k = kind === 'embark' ? 0.35 * t : 0.35 * (1 - t);
        h.root.position.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + lift);
        h.root.zIndex = h.root.y + 1;
        h.root.alpha = alpha;
      });
    } finally {
      if (h && !h.root.destroyed) {
        h.locked -= 1;
        h.fading = false;
        h.root.alpha = 1;
        h.root.visible = h.shown && !h.embarked;
        if (h.locked === 0) this.placeHero(h, h.coord);
        this.releaseArrival(heroId);
      }
    }
  }

  /** Read-only state of the drawn ships (tests and diagnostics). */
  shipDebug(): ShipLayerDebug {
    return this.shipLayer.debug();
  }

  /** Read-only sea-site state (tests; `__prSeaSites()` under `?e2e`). */
  seaSiteDebug(): Record<string, SeaSiteDebug> {
    return this.seaSiteLayer.debug();
  }

  /** Face the avatar toward a screen vector (8 directions; mirrored when only the side view exists). */
  private faceToward(e: HeroEntry, dx: number, dy: number): void {
    if (Math.hypot(dx, dy) < 1e-3) return;
    e.figure.face(directionOf(dx, dy));
  }

  /**
   * Movement playback for a committed HeroMoved event (never changes state). The
   * avatar walks hex to hex facing its direction (walk strip, or a light step bob
   * while only a still exists) and returns to idle when it stops.
   */
  async playHeroMove(heroId: string, path: readonly HexCoord[], speed: number, follow: boolean, teleportTo?: HexCoord, trail = false, visibleAt?: (coord: HexCoord) => boolean): Promise<void> {
    const e = this.heroes.get(heroId);
    if (!e || path.length === 0) {
      this.releaseArrival(heroId);
      return;
    }
    const end = path[path.length - 1]!;
    const same = (a: HexCoord | undefined, b: HexCoord) => !!a && a.q === b.q && a.r === b.r;
    // The view may already show where the move ended (or, through a portal, the twin).
    const start = same(end, e.coord) || same(teleportTo, e.coord) ? e.prevCoord : e.coord;
    e.locked += 1;
    e.snapIn = 0;
    this.tweens.speed = speed;
    try {
      let from = start;
      this.placeHero(e, from);
      if (speed > 0) this.setClip(e, 'walk');
      const bob = e.figure.resolve(e.monster ? 'move' : 'walk')?.fallback !== false;
      // The route stays on the ground ahead of the hero and is cleared tile by tile as it walks.
      if (trail && speed > 0) this.drawTrail(path);
      for (const [n, step] of path.entries()) {
        const shown = !visibleAt || visibleAt(from) || visibleAt(step);
        e.root.visible = shown && !e.embarked;
        this.tweens.speed = shown ? speed : 0;
        const a = this.hexCenter(from);
        const b = this.hexCenter(step);
        this.faceToward(e, b.x - a.x, b.y - a.y);
        const base = { x: e.root.x, y: e.root.y };
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        await this.tweens.tween(
          STEP_MS,
          (t) => {
            if (visibleAt) e.root.visible = visibleAt(t < 0.5 ? from : step) && !e.embarked;
            e.root.position.set(base.x + dx * t, base.y + dy * t);
            e.root.zIndex = e.root.y + 1;
            if (bob) e.figure.pose.y = -Math.abs(Math.sin(t * Math.PI)) * R * 0.1;
            if (follow && e.root.visible) this.camGoal = { x: e.root.x, y: e.root.y };
          },
          linear,
        );
        from = step;
        // The piece of route just walked disappears.
        if (trail && speed > 0) {
          const piece = this.trailLayer.children[n];
          if (piece) piece.visible = false;
        }
      }
      e.figure.pose.y = 0;
      if (teleportTo) await this.playTeleport(e, teleportTo, speed, follow);
    } finally {
      if (trail) for (const c of this.trailLayer.removeChildren()) c.destroy({ children: true });
      e.locked -= 1;
      if (e.locked === 0) {
        this.placeHero(e, e.coord);
        if (e.clip === 'walk') this.setClip(e, 'idle');
        e.figure.pose.y = 0;
        e.root.visible = e.shown && !e.embarked;
        this.releaseArrival(heroId);
      }
    }
  }

  /**
   * A walked route: one piece per step (the dot at that step's tile and the line on
   * to the next; the end marker at the last tile), hidden one by one as the hero
   * passes them — drawn once per walk instead of once per step.
   */
  private drawTrail(path: readonly HexCoord[]): void {
    for (const c of this.trailLayer.removeChildren()) c.destroy({ children: true });
    const chevron = this.routeArtState === 'ready' ? this.routeArt.chevronToday : undefined;
    if (chevron) {
      // The painted route walked today: the same gold arrowheads as the planned route, one per
      // step (the last tile, where the hero stops, has none), hidden as the hero passes them.
      const last = path.length - 1;
      for (let i = 0; i <= last; i++) {
        const piece = new Container();
        piece.eventMode = 'none';
        if (i < last) {
          const a = this.hexCenter(path[i]!);
          const b = this.hexCenter(path[i + 1]!);
          piece.position.set(a.x, a.y);
          piece.addChild(...this.chevron(chevron, HEX_W * 0.3, Math.atan2(b.x - a.x, -(b.y - a.y) / S)));
        }
        this.trailLayer.addChild(piece);
      }
      return;
    }
    const col = colorOf(PATH_TODAY);
    const dark = 0x0f141f;
    const last = path.length - 1;
    for (let i = 0; i <= last; i++) {
      const g = new Graphics();
      const p = this.hexCenter(path[i]!);
      if (i < last) {
        const q = this.hexCenter(path[i + 1]!);
        g.moveTo(p.x, p.y).lineTo(q.x, q.y).stroke({ width: R * 0.12, color: col, alpha: 0.9, cap: 'round' });
        g.ellipse(p.x, p.y, R * 0.14, R * 0.14 * S).fill({ color: col });
      } else {
        g.ellipse(p.x, p.y, R * 0.3, R * 0.3 * S).fill({ color: col });
        g.ellipse(p.x, p.y, R * 0.18, R * 0.18 * S).fill({ color: dark });
      }
      this.trailLayer.addChild(g);
    }
  }

  /** A hero steps into a portal (or is recalled): it shrinks out of sight and grows back at `to`. */
  private async playTeleport(e: HeroEntry, to: HexCoord, speed: number, follow: boolean): Promise<void> {
    const ms = STEP_MS * 1.5;
    this.setClip(e, 'idle');
    if (speed > 0) await this.tweens.tween(ms, (t) => e.root.scale.set(1 - 0.85 * t), linear);
    this.placeHero(e, to);
    if (follow) this.focus(to, speed > 0);
    if (speed > 0) await this.tweens.tween(ms, (t) => e.root.scale.set(0.15 + 0.85 * t), linear);
    e.root.scale.set(1);
  }

  /**
   * Playback for a teleport that had no walk before it (the Recall spell). With
   * a look (Homecoming), a column of light lifts the hero away and sets it down
   * (`<fxId>.depart` / `.arrive` strips when delivered).
   */
  async playHeroTeleport(heroId: string, to: HexCoord, speed: number, follow: boolean, fx?: { look: FxLook; id: string }): Promise<void> {
    const e = this.heroes.get(heroId);
    if (!e) return;
    e.locked += 1;
    this.tweens.speed = speed;
    try {
      if (fx && speed > 0) {
        this.logFx(fx.id);
        this.painter.preload(fx.id);
        // The rider's own `cast` strip (Brief 11) with the spell's sigil on the hero, then the column of light.
        if (e.root.visible) {
          const anim = !e.monster && e.figure.has('cast') ? e.figure.playOnce('cast', this.tweens) : null;
          await Promise.all([this.painter.cast(fx.look, { x: e.root.x, y: e.root.y }, `${fx.id}.cast`), anim]);
        }
        const column = { ...fx.look, impact: 'pillar' as const };
        const depart = this.painter.impact(column, this.heroTarget(e), `${fx.id}.depart`);
        await this.tweens.wait(260);
        await this.playTeleport(e, to, speed, follow);
        await depart;
        await this.painter.impact(column, this.heroTarget(e), `${fx.id}.arrive`);
      } else await this.playTeleport(e, to, speed, follow);
    } finally {
      e.locked -= 1;
      if (e.locked === 0) {
        this.placeHero(e, e.coord);
        this.releaseArrival(heroId);
      }
    }
  }

  private heroTarget(e: HeroEntry): FxTarget {
    return { x: e.root.x, y: e.root.y, height: Math.max(R * 1.2, e.figure.height * 0.85), width: 1, facing: 1 };
  }

  private logFx(id: string): void {
    this.fxLog = [...this.fxLog.slice(-19), id];
  }

  /** Start loading an effect's delivered strips (e.g. a miracle's, while its painted card is up). Presentation only. */
  preloadFx(id: string): void {
    this.painter.preload(id);
  }

  /** The magic effects played most recently (read-only diagnostics for tests). */
  fxDebug(): readonly string[] {
    return this.fxLog;
  }

  /**
   * A map spell or miracle (never changes state): the sigil on the casting
   * hero, then a ring spreading over the chosen tiles (the fog lifts in it),
   * light on heroes (wind, mist, motes) or on towns (growth, gifts). Heroes
   * out of view are skipped; a town miracle brings its town into view. `icon`
   * (a runtime URL, e.g. the miracle's Brief 13 icon) rises over each one.
   */
  async playMapFx(
    fx: { look: FxLook; id: string; caster?: string; area?: { center: HexCoord; radius: number }; heroIds?: readonly string[]; towns?: readonly HexCoord[]; icon?: string | null },
    speed: number,
  ): Promise<void> {
    if (speed <= 0 || this.disposed) return;
    this.tweens.speed = speed;
    this.logFx(fx.id);
    this.painter.preload(fx.id);
    const { look, id } = fx;
    const caster = fx.caster ? this.heroes.get(fx.caster) : undefined;
    if (caster && caster.root.visible) {
      // The rider's own `cast` strip (Brief 11: a hand glow, played once, then idle) with the spell's sigil.
      const anim = !caster.monster && caster.figure.has('cast') ? caster.figure.playOnce('cast', this.tweens) : null;
      await Promise.all([this.painter.cast(look, { x: caster.root.x, y: caster.root.y }, `${id}.cast`), anim]);
    }
    const jobs: Promise<void>[] = [this.painter.screenFx(look.screen, look.school, 1, `${id}.screen`)];
    if (fx.area) jobs.push(this.painter.area(look, this.hexCenter(fx.area.center), (fx.area.radius + 0.5) * HEX_W, `${id}.area`));
    (fx.heroIds ?? []).forEach((hid, i) => {
      const e = this.heroes.get(hid);
      if (!e || !e.root.visible) return;
      jobs.push(this.tweens.wait(i * 90).then(() => this.painter.impact(look, this.heroTarget(e), `${id}.impact`)));
      if (fx.icon) jobs.push(this.tweens.wait(i * 90 + 250).then(() => this.riseIcon(fx.icon!, { x: e.root.x, y: e.root.y - this.heroTarget(e).height })));
    });
    const towns = fx.towns ?? [];
    if (towns.length === 1) this.focus(towns[0]!, true);
    towns.forEach((c) => {
      const p = this.hexCenter(c);
      const at: FxTarget = { x: p.x, y: p.y + R * S * 0.3, height: R * 2.2, width: 1.6, facing: 1 };
      jobs.push(this.painter.impact(look, at, `${id}.impact`));
      if (look.impact !== 'coins' && look.impact !== 'motes') jobs.push(this.painter.impact({ ...look, impact: 'motes' }, at));
      if (fx.icon) jobs.push(this.tweens.wait(250).then(() => this.riseIcon(fx.icon!, { x: p.x, y: p.y - R * 2.2 })));
    });
    await Promise.all(jobs);
  }

  /** An icon rising and fading over a point (presentation only; skipped when it does not load in time). */
  private async riseIcon(url: string, at: { x: number; y: number }): Promise<void> {
    const tex = await Promise.race([loadTexture(url, { urgent: true }).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 1500))]);
    if (!tex || this.disposed) return;
    const sp = new Sprite(tex);
    sp.anchor.set(0.5, 1);
    const size = R * 1.25;
    sp.scale.set(size / Math.max(1, tex.width));
    sp.position.set(at.x, at.y);
    sp.alpha = 0;
    this.effects.addChild(sp);
    await this.tweens.tween(
      1300,
      (k) => {
        sp.y = at.y - k * R * 0.9;
        sp.alpha = k < 0.15 ? k / 0.15 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      },
      linear,
    );
    sp.destroy();
  }

  /**
   * Readiness before a battle: stop on the approach tile, face the opponent and
   * play a short readiness beat (the rider rises and the banner flashes) once.
   * Resolves 'finished' when it ends — the caller opens the battle then — or
   * 'cancelled' when the encounter is abandoned first (cancelPreparations, or
   * `stillValid()` false at completion). 'skipped' for monsters, hidden heroes
   * and instant playback.
   */
  async prepareForBattle(heroId: string, opponent: HexCoord, speed: number, stillValid: () => boolean = () => true): Promise<PrepareOutcome | 'skipped'> {
    const e = this.heroes.get(heroId);
    // One beat at a time per hero: a second request while one is pending never plays it twice.
    if (!e || this.disposed || e.monster || !e.root.visible || speed <= 0 || e.cancel) return 'skipped';
    if (e.figure.status === 'loading') await Promise.race([e.figure.loaded, new Promise((r) => setTimeout(r, 2000))]);
    if (e.locked === 0) this.placeHero(e, e.coord);
    const b = this.hexCenter(opponent);
    this.faceToward(e, b.x - e.root.x, b.y - e.root.y);
    // A defending hero turns to meet the attacker.
    for (const [id, other] of this.heroes) {
      if (id === heroId || other.coord.q !== opponent.q || other.coord.r !== opponent.r) continue;
      this.faceToward(other, e.root.x - other.root.x, e.root.y - other.root.y);
    }
    e.prepares += 1;
    e.clip = 'prepare';
    // The delivered `prepare` strip (Brief 11, 6 frames at 6 fps: five poses and the ready
    // hold) plays once within the beat on the same clock and holds its last frame until
    // the battle opens; a set without one gets the code-drawn rise of the rider.
    const strip = !e.monster && e.figure.has('prepare');
    this.tweens.speed = speed;
    if (strip) void e.figure.playOnce('prepare', this.tweens, { hold: true });
    const ms = 1200 * speed;
    const outcome = await new Promise<PrepareOutcome>((resolve) => {
      let done = false;
      const finish = (o: PrepareOutcome) => {
        if (done) return;
        done = true;
        e.cancel = null;
        e.figure.rest();
        e.marks?.scale.set(1);
        // Finished: the ready pose stays until the map closes for the battle. Cancelled: back to idle.
        if (o === 'cancelled' && e.clip === 'prepare') this.setClip(e, 'idle');
        resolve(o);
      };
      e.cancel = () => finish('cancelled');
      const tw = new TweenPlayer();
      this.extraTweens.push(tw);
      void tw
        .tween(ms, (t) => {
          const k = Math.sin(t * Math.PI);
          if (!strip) {
            e.figure.pose.y = -k * R * 0.22;
            e.figure.pose.scale.y = 1 + k * 0.06;
          }
          e.marks?.scale.set(1 + k * 0.12);
        })
        .then(() => {
          this.extraTweens = this.extraTweens.filter((x) => x !== tw);
          finish('finished');
        });
    });
    if (outcome === 'finished' && (this.disposed || !stillValid())) {
      // The encounter went away during the beat: release the held pose.
      if (!this.disposed && e.clip === 'prepare') this.setClip(e, 'idle');
      return 'cancelled';
    }
    return outcome;
  }

  /** Abandon every pending readiness beat (encounter cancelled): heroes return to idle. */
  cancelPreparations(): void {
    for (const e of this.heroes.values()) e.cancel?.();
  }

  /** Read-only avatar state of every hero (tests and diagnostics). */
  heroAnimationDebug(): Record<string, HeroAnimationDebug> {
    const out: Record<string, HeroAnimationDebug> = {};
    for (const [id, e] of this.heroes) {
      const cur = e.figure.current;
      out[id] = {
        sprite: e.figure.status,
        status: e.figure.set?.status ?? null,
        clip: e.clip,
        drawn: cur?.drawn ?? null,
        facing: e.figure.facing,
        mirrored: e.figure.pose.scale.x < 0,
        prepareCount: e.prepares,
        visible: e.root.visible,
        aura: e.aura && !e.aura.sprite.destroyed ? e.aura.id : null,
      };
    }
    return out;
  }

  /** Read-only camera state (tests): the view centre in map pixels and the zoom. */
  cameraPose(): { x: number; y: number; zoom: number } {
    return { x: Math.round(this.cam.x * 100) / 100, y: Math.round(this.cam.y * 100) / 100, zoom: Math.round(this.cam.zoom * 1000) / 1000 };
  }

  /**
   * The ground the view shows: its four corners as fractional axial
   * coordinates (top-left, top-right, bottom-right, bottom-left), for the
   * minimap's frame.
   */
  viewFootprint(): { q: number; r: number }[] | null {
    if (!this.map) return null;
    const { width: w, height: h } = this.view;
    return [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ].map(([x, y]) => {
      const p = this.toWorld(x!, y!);
      return pointAxialFraction(p.x, p.y, R, S);
    });
  }

  // ------------------------------------------------------------------ camera

  private applyCamera(): void {
    const { width, height } = this.view;
    const z = this.cam.zoom;
    this.world.scale.set(z);
    this.world.position.set(Math.round(width / 2 - this.cam.x * z), Math.round(height / 2 - this.cam.y * z));
  }

  private toWorld(x: number, y: number): { x: number; y: number } {
    const z = this.cam.zoom;
    return { x: (x - this.world.x) / z, y: (y - this.world.y) / z };
  }

  /**
   * Keep the view on the map: at most a thin band (half a hex) beyond its
   * edges shows (owner request 2026-10-04); a map smaller than the view is
   * centred on that axis.
   */
  private clampCam(): void {
    const map = this.map;
    if (!map) return;
    const b = this.mapBounds(map);
    const z = Math.max(0.01, this.cam.zoom);
    const halfW = this.view.width / 2 / z;
    const halfH = this.view.height / 2 / z;
    const m = R * 0.5;
    const axis = (v: number, lo: number, hi: number, half: number) => (hi - lo + 2 * m <= half * 2 ? (lo + hi) / 2 : Math.max(lo - m + half, Math.min(hi + m - half, v)));
    this.cam.x = axis(this.cam.x, b.minX, b.maxX, halfW);
    this.cam.y = axis(this.cam.y, b.minY, b.maxY, halfH);
  }

  focus(c: HexCoord, animate = true): void {
    const p = this.hexCenter(c);
    if (animate) this.camGoal = { x: p.x, y: p.y };
    else {
      this.cam.x = p.x;
      this.cam.y = p.y;
      this.camGoal = null;
      this.clampCam();
      this.applyCamera();
    }
  }

  /** Pan relative to the screen: +dx = right, +dz = toward the top of the screen (hex radii). */
  pan(dx: number, dz: number): void {
    this.cam.x += (dx * R * 1.6) / Math.max(0.5, this.cam.zoom);
    this.cam.y -= (dz * R * 1.6) / Math.max(0.5, this.cam.zoom);
    this.camGoal = null;
    this.clampCam();
    this.applyCamera();
  }

  /** Zoom by steps (negative = closer), as the keyboard shortcuts send them. */
  zoom(delta: number): void {
    this.cam.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.cam.zoom * Math.exp(-delta * 0.08)));
    this.clampCam();
    this.applyCamera();
  }

  // ------------------------------------------------------------------ input

  private local(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private tileAt(x: number, y: number): HexCoord | null {
    if (!this.map) return null;
    const p = this.toWorld(x, y);
    const c = pointAxial(p.x, p.y, R, S);
    if (c.q < 0 || c.r < 0 || c.q >= this.map.width || c.r >= this.map.height) return null;
    if (this.terrainOf(this.map, c.r * this.map.width + c.q) === 'void') return null;
    return c;
  }

  private onDown(e: PointerEvent): void {
    const p = this.local(e);
    this.down = { x: p.x, y: p.y, button: e.button, tx: this.cam.x, ty: this.cam.y, dragging: false };
  }

  private onMove(e: PointerEvent): void {
    const p = this.local(e);
    const d = this.down;
    if (d && (d.button === 0 || d.button === 1) && (e.buttons & 5) !== 0 && (d.dragging || Math.hypot(p.x - d.x, p.y - d.y) > 7)) {
      if (!d.dragging) this.cb.onDrag?.(true);
      d.dragging = true;
      this.cam.x = d.tx - (p.x - d.x) / this.cam.zoom;
      this.cam.y = d.ty - (p.y - d.y) / this.cam.zoom;
      this.camGoal = null;
      this.clampCam();
      this.applyCamera();
      return;
    }
    const c = this.tileAt(p.x, p.y);
    const key = c ? `${c.q},${c.r}` : '';
    if (key !== this.lastHover) {
      this.lastHover = key;
      this.setHover(c);
      this.cb.onTileHover(c && this.isExplored(c) ? c : null);
    }
  }

  private onUp(e: PointerEvent): void {
    const d = this.down;
    this.down = null;
    if (d?.dragging) this.cb.onDrag?.(false);
    if (!d || d.dragging) return;
    const p = this.local(e);
    const c = this.tileAt(p.x, p.y);
    if (c && this.isExplored(c)) this.cb.onTileClick(c, d.button);
  }

  private onLeave(): void {
    if (this.down?.dragging) this.cb.onDrag?.(false);
    this.down = null;
    if (this.lastHover !== '') {
      this.lastHover = '';
      this.setHover(null);
      this.cb.onTileHover(null);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const p = this.local(e);
    const before = this.toWorld(p.x, p.y);
    const k = Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.0016);
    this.cam.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.cam.zoom * k));
    // Keep the point under the pointer in place.
    this.applyCamera();
    const after = this.toWorld(p.x, p.y);
    this.cam.x += before.x - after.x;
    this.cam.y += before.y - after.y;
    this.camGoal = null;
    this.clampCam();
    this.applyCamera();
  }

  private isExplored(c: HexCoord): boolean {
    const map = this.map;
    return !!map && this.explored[c.r * map.width + c.q] === 1;
  }

  private setHover(c: HexCoord | null): void {
    const g = this.hover;
    if (!c || !this.isExplored(c) || this.gridMode === 'off' || (this.map && this.terrainOf(this.map, c.r * this.map.width + c.q) === 'void')) {
      g.visible = false;
      return;
    }
    const { x, y } = this.hexCenter(c);
    g.position.set(x, y);
    g.visible = true;
  }

  /** Screen position (CSS pixels within the canvas) of a hex centre — read-only, for tests and UI anchoring. */
  projectHex(c: HexCoord): { x: number; y: number } | null {
    const p = this.hexCenter(c);
    const z = this.cam.zoom;
    return { x: p.x * z + this.world.x, y: p.y * z + this.world.y };
  }

  // ------------------------------------------------------------------ frame

  private extraTweens: TweenPlayer[] = [];
  /** Reduced motion (from the view): auras hold their first frame. */
  private calm = false;

  tick(dt: number): void {
    this.time += dt;
    this.tweens.tick(dt);
    for (const tw of this.extraTweens) tw.tick(dt);
    if (this.camGoal) {
      const k = Math.min(1, dt / 160);
      this.cam.x += (this.camGoal.x - this.cam.x) * k;
      this.cam.y += (this.camGoal.y - this.cam.y) * k;
      if (Math.hypot(this.camGoal.x - this.cam.x, this.camGoal.y - this.cam.y) < 0.5) this.camGoal = null;
      this.clampCam();
      this.applyCamera();
    }
    const motion = graphicsProfile().ambientMotion;
    for (const e of this.heroes.values()) {
      if (e.snapIn > 0 && e.locked === 0) {
        e.snapIn -= 1;
        if (e.snapIn === 0) {
          this.placeHero(e, e.coord);
          // No playback claimed this move (out of sight, or instant): show its destination as it is now.
          for (const [id, h] of this.heroes) if (h === e) this.releaseArrival(id);
        }
      }
      if (motion || e.clip === 'walk') e.figure.tick(dt, e.clip === 'walk' ? WALK_RATE : 1);
      if (e.aura) {
        const frames = stripFrames(e.aura.def);
        // Loops with the scene time; a still first frame without ambient motion (Low, reduced motion).
        if (frames && frames.length) e.aura.sprite.texture = frames[motion && !this.calm ? Math.floor((this.time * Math.max(1, e.aura.def.fps)) / 1000) % frames.length : 0]!;
      }
    }
    for (const e of this.caravans.values()) {
      if (e.snapIn > 0 && e.locked === 0) {
        e.snapIn -= 1;
        if (e.snapIn === 0) this.placeCaravan(e, e.coord, e.sharesTile);
      }
    }
    this.shipLayer.tick(dt);
    this.seaSiteLayer.tick(dt);
    if (motion) for (const s of this.sites.values()) s.guard?.tick(dt);
    const sel = this.selectedHero ? this.heroes.get(this.selectedHero) : undefined;
    const ring = this.selectRing;
    if (sel && sel.root.visible) {
      // A gentle breath, held still under reduced motion or without ambient motion.
      ring.scale.set(motion && !this.calm ? 1 + Math.sin(this.time / 260) * 0.04 : 1);
      ring.position.set(sel.root.x, sel.root.y);
      ring.visible = true;
    } else ring.visible = false;
    if (this.routeSeal) {
      const k = (motion && !this.calm ? 1 + Math.sin(this.time / 420) * 0.03 : 1) * this.routeGrow;
      this.routeSeal.scale.set(k);
    }
    this.applyRouteZoom();
    if (motion) {
      for (const s of this.sites.values()) {
        if (s.glow && s.glow.visible) {
          const k = 1 + Math.sin(this.time / 120) * 0.08;
          s.glow.scale.set(k, 1 + Math.sin(this.time / 90) * 0.1);
        }
      }
    }
    this.syncGroundCache();
  }

  /** Bring the ground chunks up to date for this frame's camera: the chunks when they cover the view, else the live ground. */
  private syncGroundCache(): void {
    const z = this.cam.zoom;
    const x0 = -this.world.x / z;
    const y0 = -this.world.y / z;
    const covering = this.groundCache.update(x0, y0, x0 + this.view.width / z, y0 + this.view.height / z, z);
    if (this.groundLayer.renderable === covering) this.groundLayer.renderable = !covering;
  }

  /** The GPU lost and restored its context: the chunk textures are empty, draw them again. */
  contextRestored(): void {
    this.groundCache.invalidate();
  }

  get busy(): boolean {
    return this.tweens.busy;
  }

  /**
   * Frame pacing (engineHost `FramePace`): full while anything moves — a
   * playback, an effect, the camera easing, a drag, a walk or a hero snapping
   * in — ambient while only the idle loops and pulses play, still without
   * ambient motion (Low graphics, reduced motion).
   */
  pace(): FramePace {
    if (this.tweens.busy || this.camGoal || this.down || this.terrainQueued || this.groundCache.pending || this.extraTweens.some((t) => t.busy)) return 'full';
    for (const e of this.heroes.values()) if (e.clip !== 'idle' || e.locked > 0 || e.snapIn > 0) return 'full';
    for (const e of this.caravans.values()) if (e.locked > 0 || e.snapIn > 0) return 'full';
    if (this.shipLayer.busy || this.seaSiteLayer.busy) return 'full';
    return graphicsProfile().ambientMotion && !this.calm ? 'ambient' : 'still';
  }

  dispose(): void {
    this.disposed = true;
    // Leaving the map abandons any pending readiness beat (its completion is ignored).
    this.cancelPreparations();
    this.tweens.flush();
    for (const tw of this.extraTweens) tw.flush();
    for (const [type, fn] of this.listeners) this.canvas.removeEventListener(type, fn);
    for (const e of this.heroes.values()) e.figure.destroy();
    for (const s of this.sites.values()) s.guard?.destroy();
    this.shipLayer.dispose();
    this.seaSiteLayer.dispose();
    this.groundCache.destroy();
    this.heroes.clear();
    this.caravans.clear();
    this.sites.clear();
    this.root.destroy({ children: true });
  }
}

/** URL helper re-exported for the interface (asset-status readouts). */
export { spriteUrl };
