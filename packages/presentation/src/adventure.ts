/**
 * AdventureSceneController (S06): the 2D adventure map, drawn in layers from a
 * view model the interface builds from committed MatchState.
 *
 *   0 sea and sky backdrop      4 decoration, map locations and heroes (depth-sorted)
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
import { Container, FillPattern, Graphics, Matrix, Sprite, Texture, TilingSprite } from 'pixi.js';
import { TERRAIN_BY_CODE, type HexCoord, type Terrain, type WorldMapDefinition } from '@pr/rules';
import { buildDecor, deriveStreams } from '@pr/mapgen';
import type { EngineHost, SceneController } from './engineHost';
import { MAP_SQUASH, SQRT3, axialPoint, directionOf, hexPolygon, pointAxial, pointAxialFraction, type MapDirection } from './hexmath';
import { BIOME_TINT, HIGHLIGHT_REACH, PATH_ENCOUNTER, PATH_LATER, PATH_TODAY, ROAD_COLOR, SEA_COLOR, SELECT_RING, UNKNOWN_COLOR, biomeTerrainRgb, hexToRgb, tileNoise } from './palette';
import { TweenPlayer, linear } from './tween';
import { TERRAIN_TEXTURE_WORLD, skyArt, terrainArt, type EnvironmentArt } from './environmentArt';
import { graphicsProfile } from './graphics';
import { SpriteFigure } from './figure';
import { creatureSprites, heroSprites, siteSprite, spriteManifest, spriteUrl, type SiteArchetype, type StaticSpriteDefinition } from './sprites';
import { loadTexture } from './textures';
import { colorOf, groundShadow, rgbOf, stillHeight, stillSprite } from './staticSprites';

/** Nominal map time per hex step (ms, before the Adventure animation speed setting). */
const STEP_MS = 210;
/** Hex radius in view pixels at zoom 1. */
const R = 36;
const S = MAP_SQUASH;
const HEX_W = SQRT3 * R;
const ZOOM_MIN = 0.42;
const ZOOM_MAX = 2.2;
const ZOOM_DEFAULT = 1;
/** Sky panorama beyond the north edge (owner decision 2026-10-02): its width in hexes and the gap above row 0. */
const SKY_WIDTH_HEXES = 70;
const SKY_GAP = 3 * R;

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
}

export interface AdventurePathView {
  readonly steps: readonly HexCoord[];
  /** Last index reachable today (−1 none). */
  readonly stopIndex: number;
  readonly encounter: boolean;
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
}

interface SiteEntry {
  root: Container;
  sprite: Sprite;
  def: StaticSpriteDefinition | null;
  key: string;
  glow: Graphics | null;
  seal: Graphics | null;
  banner: Graphics | null;
  bannerKey: string;
  guard: SpriteFigure | null;
  guardKey: string;
}

/** Ground types in a fixed order. */
const GROUND_TYPES: readonly Terrain[] = ['plains', 'forest', 'rough', 'marsh', 'mountain', 'water'];

export class AdventureSceneController implements SceneController {
  readonly root = new Container();
  readonly tweens = new TweenPlayer();
  private readonly engine: EngineHost;
  private readonly canvas: HTMLCanvasElement;
  private readonly cb: AdventureCallbacks;
  private readonly world = new Container();
  private readonly backdrop = new Container();
  private readonly terrain = new Graphics();
  private readonly roads = new Graphics();
  private readonly grid = new Graphics();
  private readonly reach = new Graphics();
  private readonly ground = new Container();
  private readonly pathLayer = new Graphics();
  /** The route a moving hero still has to walk (drawn during movement playback, cleared step by step). */
  private readonly trailLayer = new Graphics();
  private readonly hover = new Graphics();
  private readonly selectRing = new Graphics();
  private readonly objects = new Container();
  private readonly fog = new Graphics();
  private readonly effects = new Container();
  private map: WorldMapDefinition | null = null;
  private mapKey = '';
  private terrainArts = new Map<Terrain, EnvironmentArt>();
  private terrainTextures = new Map<Terrain, Texture>();
  private fogKey = '';
  private reachKey = '';
  private pathKey = '';
  private gridMode: AdventureView['grid'] = 'always';
  private explored: readonly number[] = [];
  private visibleSet: ReadonlySet<number> = new Set();
  private decorByTile = new Map<number, Container[]>();
  private heroes = new Map<string, HeroEntry>();
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
  private down: { x: number; y: number; button: number; tx: number; ty: number; dragging: boolean } | null = null;
  private lastHover = '';
  private hoverHex: HexCoord | null = null;
  /** Camera: the world point at the view's centre, and the zoom. */
  private cam = { x: 0, y: 0, zoom: ZOOM_DEFAULT };
  private camGoal: { x: number; y: number } | null = null;
  private view = { width: 1, height: 1 };
  private time = 0;
  private disposed = false;
  private readonly listeners: [string, EventListener][] = [];

  constructor(engine: EngineHost, canvas: HTMLCanvasElement, cb: AdventureCallbacks) {
    this.engine = engine;
    this.canvas = canvas;
    this.cb = cb;
    this.root.addChild(this.world);
    this.ground.addChild(this.selectRing, this.pathLayer, this.trailLayer, this.hover);
    this.objects.sortableChildren = true;
    this.world.addChild(this.backdrop, this.terrain, this.roads, this.grid, this.reach, this.ground, this.objects, this.fog, this.effects);
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
  }

  resize(width: number, height: number): void {
    this.view = { width, height };
    this.applyCamera();
  }

  // ------------------------------------------------------------------ view updates

  update(view: AdventureView): void {
    const key = `${view.map.templateId}|${view.map.logicalHash}`;
    if (key !== this.mapKey) {
      this.buildMap(view.map);
      this.mapKey = key;
      this.fogKey = '';
    }
    if (view.fogKey !== this.fogKey || view.grid !== this.gridMode) {
      this.gridMode = view.grid;
      this.applyFog(view.explored, view.visible);
      this.fogKey = view.fogKey;
    }
    if (view.reachKey !== this.reachKey) {
      this.buildReach(view.reachable);
      this.reachKey = view.reachKey;
    }
    this.syncHeroes(view.heroes);
    this.lastSites = view.sites;
    this.syncSites(view.sites);
    const pk = view.path ? `${view.path.steps.map((s) => `${s.q},${s.r}`).join(';')}|${view.path.stopIndex}|${view.path.encounter}|${this.selectedHero ?? ''}` : '';
    if (pk !== this.pathKey) {
      this.buildPath(view.path);
      this.pathKey = pk;
    }
  }

  private terrainOf(map: WorldMapDefinition, i: number): Terrain {
    return TERRAIN_BY_CODE[map.terrain[i] ?? 'p'] ?? 'plains';
  }

  private hexCenter(c: HexCoord): { x: number; y: number } {
    return axialPoint(c, R, S);
  }

  private mapBounds(map: WorldMapDefinition): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity;
    let maxX = -Infinity;
    for (const [q, r] of [[0, 0], [map.width - 1, 0], [0, map.height - 1], [map.width - 1, map.height - 1]] as const) {
      const p = this.hexCenter({ q, r });
      minX = Math.min(minX, p.x - HEX_W / 2);
      maxX = Math.max(maxX, p.x + HEX_W / 2);
    }
    return { minX, maxX, minY: -R * S, maxY: this.hexCenter({ q: 0, r: map.height - 1 }).y + R * S };
  }

  private buildMap(map: WorldMapDefinition): void {
    for (const s of this.sites.values()) this.disposeSite(s);
    this.sites.clear();
    for (const list of this.decorByTile.values()) for (const d of list) d.destroy({ children: true });
    this.decorByTile.clear();
    this.map = map;
    this.terrainArts.clear();
    this.terrainTextures.clear();
    const painted = graphicsProfile().paintedGround;
    for (const t of GROUND_TYPES) {
      const a = painted ? terrainArt(map.biome, t) : null;
      if (a) this.terrainArts.set(t, a);
    }
    this.drawTerrain();
    this.buildBackdrop(map);
    this.buildDecor(map);
    // Painted ground replaces the flat colours as each texture arrives.
    for (const [t, art] of this.terrainArts) {
      void loadTexture(art.url).then(
        (tex) => {
          if (this.disposed || this.map !== map) return;
          tex.source.style.addressModeU = art.wrap === 'repeat' ? 'repeat' : 'mirror-repeat';
          tex.source.style.addressModeV = art.wrap === 'repeat' ? 'repeat' : 'mirror-repeat';
          tex.source.style.update();
          this.terrainTextures.set(t, tex);
          this.drawTerrain();
          if (t === 'water') this.buildBackdrop(map);
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
    const map = this.map;
    const g = this.terrain;
    g.clear();
    if (!map) return;
    const tint = BIOME_TINT[map.biome] ?? [1, 1, 1];
    const patterns = new Map<Terrain, FillPattern | null>();
    for (const t of GROUND_TYPES) patterns.set(t, this.pattern(t));
    for (let r = 0; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        const i = r * map.width + q;
        const t = this.terrainOf(map, i);
        const { x, y } = this.hexCenter({ q, r });
        const poly = hexPolygon(x, y, R * 1.012, S);
        const n = tileNoise(q, r) * 0.06;
        const pat = patterns.get(t);
        if (pat) {
          // The painting shows; a light per-tile variation keeps large areas from looking flat.
          g.poly(poly).fill({ fill: pat, color: rgbOf(0.96 + n, 0.96 + n, 0.96 + n) });
        } else {
          const base = biomeTerrainRgb(t, map.biome);
          g.poly(poly).fill({ color: rgbOf(base[0] * tint[0] + n, base[1] * tint[1] + n, base[2] * tint[2] + n) });
        }
      }
    }
  }

  /**
   * The sea around the map (the climate's painted water, darker) and the sky
   * panorama standing past the north edge (owner decision 2026-10-02): the
   * panorama keeps its proportions, its horizon sits just above row 0, and it
   * repeats sideways (mirrored until its seam is verified).
   */
  private buildBackdrop(map: WorldMapDefinition): void {
    for (const c of this.backdrop.removeChildren()) c.destroy();
    const b = this.mapBounds(map);
    const margin = 40 * R;
    const sky = graphicsProfile().paintedGround ? skyArt(map.biome) : null;
    const horizonY = b.minY - SKY_GAP;
    const seaTop = sky ? horizonY : b.minY - margin;
    const water = this.terrainTextures.get('water');
    if (water) {
      const sea = new TilingSprite({ texture: water, width: b.maxX - b.minX + margin * 2, height: b.maxY + margin - seaTop });
      sea.position.set(b.minX - margin, seaTop);
      const span = TERRAIN_TEXTURE_WORLD * R;
      sea.tileScale.set(span / water.width, (span * S) / water.height);
      sea.tint = 0x99a3b3;
      this.backdrop.addChild(sea);
    } else {
      const sea = new Graphics().rect(b.minX - margin, seaTop, b.maxX - b.minX + margin * 2, b.maxY + margin - seaTop).fill({ color: colorOf(SEA_COLOR) });
      this.backdrop.addChild(sea);
    }
    if (!sky) return;
    void loadTexture(sky.url).then(
      (tex) => {
        if (this.disposed || this.map !== map) return;
        const w = SKY_WIDTH_HEXES * HEX_W;
        const h = (w * sky.height) / sky.width;
        const horizon = sky.horizon ?? 0.62;
        tex.source.style.addressModeU = sky.wrap === 'repeat' ? 'repeat' : 'mirror-repeat';
        tex.source.style.addressModeV = 'clamp-to-edge';
        const band = new TilingSprite({ texture: tex, width: b.maxX - b.minX + margin * 2, height: h });
        band.tileScale.set(w / tex.width, h / tex.height);
        // Centre one copy of the panorama on the map.
        band.tilePosition.x = (b.maxX - b.minX + margin * 2) / 2 - w / 2;
        band.position.set(b.minX - margin, horizonY - horizon * h);
        this.backdrop.addChildAt(band, 0);
      },
      () => undefined,
    );
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

  private buildDecor(map: WorldMapDefinition): void {
    const push = (i: number, c: Container) => {
      this.objects.addChild(c);
      const list = this.decorByTile.get(i) ?? [];
      list.push(c);
      this.decorByTile.set(i, list);
    };
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

  private applyFog(explored: readonly number[], visible: ReadonlySet<number>): void {
    const map = this.map;
    if (!map) return;
    this.explored = explored;
    this.visibleSet = visible;
    const fog = this.fog;
    const grid = this.grid;
    fog.clear();
    grid.clear();
    const unknown = hexToRgb(UNKNOWN_COLOR);
    for (let i = 0; i < map.width * map.height; i++) {
      const q = i % map.width;
      const r = Math.floor(i / map.width);
      const known = explored[i] === 1;
      const vis = visible.has(i);
      for (const d of this.decorByTile.get(i) ?? []) d.visible = known;
      const { x, y } = this.hexCenter({ q, r });
      if (!known) {
        const n = 0.02 * tileNoise(q + 7, r + 3);
        fog.poly(hexPolygon(x, y, R * 1.03, S)).fill({ color: rgbOf(unknown[0] + n, unknown[1] + n, unknown[2] + n * 1.4) });
      } else {
        if (!vis) fog.poly(hexPolygon(x, y, R * 1.012, S)).fill({ color: 0x000000, alpha: 0.42 });
        if (this.gridMode === 'always') grid.poly(hexPolygon(x, y, R * 0.985, S));
      }
    }
    if (this.gridMode === 'always') grid.stroke({ width: 1.1, color: 0x0d121a, alpha: 0.42 });
    // Roads only over explored tiles, dimmer where neither end is in sight.
    const roads = this.roads;
    roads.clear();
    const road = colorOf(ROAD_COLOR);
    const edges: { a: { x: number; y: number }; b: { x: number; y: number }; dim: boolean }[] = [];
    for (const k of map.roads) {
      const [a, b] = k.split('|');
      const [aq, ar] = a!.split(',').map(Number);
      const [bq, br] = b!.split(',').map(Number);
      const ia = ar! * map.width + aq!;
      const ib = br! * map.width + bq!;
      if (explored[ia] !== 1 || explored[ib] !== 1) continue;
      edges.push({ a: this.hexCenter({ q: aq!, r: ar! }), b: this.hexCenter({ q: bq!, r: br! }), dim: !(visible.has(ia) || visible.has(ib)) });
    }
    for (const e of edges) roads.moveTo(e.a.x, e.a.y).lineTo(e.b.x, e.b.y);
    roads.stroke({ width: R * 0.36, color: 0x3b2f1c, alpha: 0.45, cap: 'round', join: 'round' });
    for (const e of edges) roads.moveTo(e.a.x, e.a.y).lineTo(e.b.x, e.b.y).stroke({ width: R * 0.24, color: road, alpha: e.dim ? 0.62 : 1, cap: 'round', join: 'round' });
  }

  private buildReach(tiles: readonly HexCoord[] | null): void {
    const g = this.reach;
    g.clear();
    if (!tiles || tiles.length === 0) return;
    for (const c of tiles) {
      const { x, y } = this.hexCenter(c);
      g.poly(hexPolygon(x, y, R * 0.86, S));
    }
    g.fill({ color: colorOf(HIGHLIGHT_REACH), alpha: 0.2 });
  }

  private buildPath(path: AdventurePathView | null): void {
    const g = this.pathLayer;
    g.clear();
    if (!path || path.steps.length === 0) return;
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

  /** A hero arrived (or will not be animated): its destination's locations show their current state. */
  private releaseArrival(heroId: string): void {
    if (!this.arrivals.delete(heroId)) return;
    if (!this.disposed) this.syncSites(this.lastSites);
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
      const def = siteSprite(v.archetype, v.variant);
      const key = `${v.archetype}|${v.variant ?? ''}`;
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
        if (graphicsProfile().shadows) root.addChild(groundShadow(HEX_W * 0.4, HEX_W * 0.15));
        const sprite = stillSprite(def, HEX_W);
        root.addChild(sprite);
        this.objects.addChild(root);
        e = { root, sprite, def, key, glow: null, seal: null, banner: null, bannerKey: '', guard: null, guardKey: '' };
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
      if (e.glow) e.glow.visible = v.lit;
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
      // The strongest guard stands beside the location, facing the visitor.
      const gk = v.guard ?? '';
      if (gk !== e.guardKey) {
        e.guard?.destroy();
        e.guard = null;
        if (v.guard) {
          const f = new SpriteFigure({ set: creatureSprites(v.guard), hexWidth: HEX_W, size: 0.62, accent: 0x7a2f2a });
          f.view.position.set(HEX_W * 0.34, R * S * 0.1);
          f.mirror = true;
          e.root.addChild(f.view);
          e.guard = f;
        }
        e.guardKey = gk;
      }
    }
    for (const [id, e] of this.sites) {
      if (!seen.has(id)) {
        this.disposeSite(e);
        this.sites.delete(id);
      }
    }
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
        };
        if (old) {
          root.position.copyFrom(old.root.position);
          figure.mirror = old.figure.mirror;
          this.disposeHero(old);
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
      e.root.visible = v.shown;
      if (v.selected) this.selectedHero = v.id;
    }
    for (const [id, e] of this.heroes) {
      if (!seen.has(id)) {
        this.disposeHero(e);
        this.heroes.delete(id);
      }
    }
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
  async playHeroMove(heroId: string, path: readonly HexCoord[], speed: number, follow: boolean, teleportTo?: HexCoord, trail = false): Promise<void> {
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
      if (trail && speed > 0) this.drawTrail(path, 0);
      for (const [n, step] of path.entries()) {
        const a = this.hexCenter(from);
        const b = this.hexCenter(step);
        this.faceToward(e, b.x - a.x, b.y - a.y);
        const base = { x: e.root.x, y: e.root.y };
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        await this.tweens.tween(
          STEP_MS,
          (t) => {
            e.root.position.set(base.x + dx * t, base.y + dy * t);
            e.root.zIndex = e.root.y + 1;
            if (bob) e.figure.pose.y = -Math.abs(Math.sin(t * Math.PI)) * R * 0.1;
            if (follow) this.camGoal = { x: e.root.x, y: e.root.y };
          },
          linear,
        );
        from = step;
        if (trail && speed > 0) this.drawTrail(path, n + 1);
      }
      e.figure.pose.y = 0;
      if (teleportTo) await this.playTeleport(e, teleportTo, speed, follow);
    } finally {
      if (trail) this.trailLayer.clear();
      e.locked -= 1;
      if (e.locked === 0) {
        this.placeHero(e, e.coord);
        if (e.clip === 'walk') this.setClip(e, 'idle');
        e.figure.pose.y = 0;
        this.releaseArrival(heroId);
      }
    }
  }

  /** The part of a walked route from step `from` on: dots, and the end marker at its last tile. */
  private drawTrail(path: readonly HexCoord[], from: number): void {
    const g = this.trailLayer;
    g.clear();
    const col = colorOf(PATH_TODAY);
    const dark = 0x0f141f;
    const last = path.length - 1;
    for (let i = Math.max(0, from); i <= last; i++) {
      const p = this.hexCenter(path[i]!);
      if (i < last) {
        const q = this.hexCenter(path[i + 1]!);
        g.moveTo(p.x, p.y).lineTo(q.x, q.y).stroke({ width: R * 0.12, color: col, alpha: 0.9, cap: 'round' });
      }
    }
    for (let i = Math.max(0, from); i <= last; i++) {
      const p = this.hexCenter(path[i]!);
      if (i === last) {
        g.ellipse(p.x, p.y, R * 0.3, R * 0.3 * S).fill({ color: col });
        g.ellipse(p.x, p.y, R * 0.18, R * 0.18 * S).fill({ color: dark });
      } else g.ellipse(p.x, p.y, R * 0.14, R * 0.14 * S).fill({ color: col });
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

  /** Playback for a teleport that had no walk before it (the Recall spell). */
  async playHeroTeleport(heroId: string, to: HexCoord, speed: number, follow: boolean): Promise<void> {
    const e = this.heroes.get(heroId);
    if (!e) return;
    e.locked += 1;
    this.tweens.speed = speed;
    try {
      await this.playTeleport(e, to, speed, follow);
    } finally {
      e.locked -= 1;
      if (e.locked === 0) {
        this.placeHero(e, e.coord);
        this.releaseArrival(heroId);
      }
    }
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
    if (!e || this.disposed || e.monster || !e.root.visible || speed <= 0) return 'skipped';
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
    const ms = 1200 * speed;
    const outcome = await new Promise<PrepareOutcome>((resolve) => {
      let done = false;
      const finish = (o: PrepareOutcome) => {
        if (done) return;
        done = true;
        e.cancel = null;
        e.figure.rest();
        e.marks?.scale.set(1);
        if (e.clip === 'prepare') this.setClip(e, 'idle');
        resolve(o);
      };
      e.cancel = () => finish('cancelled');
      const tw = new TweenPlayer();
      this.extraTweens.push(tw);
      void tw
        .tween(ms, (t) => {
          const k = Math.sin(t * Math.PI);
          e.figure.pose.y = -k * R * 0.22;
          e.figure.pose.scale.y = 1 + k * 0.06;
          e.marks?.scale.set(1 + k * 0.12);
        })
        .then(() => {
          this.extraTweens = this.extraTweens.filter((x) => x !== tw);
          finish('finished');
        });
    });
    if (outcome === 'finished' && (this.disposed || !stillValid())) return 'cancelled';
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

  private clampCam(): void {
    const map = this.map;
    if (!map) return;
    const b = this.mapBounds(map);
    this.cam.x = Math.max(b.minX - 2 * R, Math.min(b.maxX + 2 * R, this.cam.x));
    this.cam.y = Math.max(b.minY - SKY_GAP - 2 * R, Math.min(b.maxY + 2 * R, this.cam.y));
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
    this.hoverHex = c;
    const g = this.hover;
    g.clear();
    if (!c || !this.isExplored(c) || this.gridMode === 'off') {
      g.visible = false;
      return;
    }
    const { x, y } = this.hexCenter(c);
    g.poly(hexPolygon(x, y, R * 0.97, S)).stroke({ width: 2, color: 0xf5e4b7, alpha: 0.95 });
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
      if (motion || e.clip === 'walk') e.figure.tick(dt);
    }
    if (motion) for (const s of this.sites.values()) s.guard?.tick(dt);
    const sel = this.selectedHero ? this.heroes.get(this.selectedHero) : undefined;
    const ring = this.selectRing;
    if (sel && sel.root.visible) {
      ring.clear();
      const pulse = 1 + Math.sin(this.time / 260) * 0.04;
      ring.ellipse(0, 0, HEX_W * 0.44 * pulse, HEX_W * 0.44 * pulse * S * 0.5).stroke({ width: 3, color: colorOf(SELECT_RING), alpha: 0.95 });
      ring.position.set(sel.root.x, sel.root.y);
      ring.visible = true;
    } else ring.visible = false;
    if (motion) {
      for (const s of this.sites.values()) {
        if (s.glow && s.glow.visible) {
          const k = 1 + Math.sin(this.time / 120) * 0.08;
          s.glow.scale.set(k, 1 + Math.sin(this.time / 90) * 0.1);
        }
      }
    }
  }

  get busy(): boolean {
    return this.tweens.busy;
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
    this.heroes.clear();
    this.sites.clear();
    this.root.destroy({ children: true });
  }
}

/** URL helper re-exported for the interface (asset-status readouts). */
export { spriteUrl };
