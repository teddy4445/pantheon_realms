/**
 * AdventureSceneController: renders the logical world map (terrain, roads, fog,
 * sites, heroes, reachable area and path preview) from a view model built by the
 * UI from committed MatchState.
 *
 * Owns: meshes, camera, pointer→hex picking, movement playback.
 * Does not own: legality (movement/paths come from the rules via the view model),
 * selection state (UI), or anything persisted.
 */
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { PointerEventTypes, type PointerInfo } from '@babylonjs/core/Events/pointerEvents';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Observer } from '@babylonjs/core/Misc/observable';
import { TERRAIN_BY_CODE, type BodyProfile, type HexCoord, type Terrain, type WorldMapDefinition } from '@pr/rules';
import { buildDecor, deriveStreams } from '@pr/mapgen';
import type { SceneController } from './engineHost';
import { MeshAccumulator, axialWorld, clearColor, hexCorner, pickGround, projectPoint, worldAxial } from './meshkit';
import {
  BIOME_TINT,
  HIGHLIGHT_REACH,
  PATH_ENCOUNTER,
  PATH_LATER,
  PATH_TODAY,
  ROAD_COLOR,
  SEA_COLOR,
  SELECT_RING,
  TERRAIN_COLORS,
  TERRAIN_HEIGHT,
  UNKNOWN_COLOR,
  hexToRgb,
  tileNoise,
} from './palette';
import { MaterialCache, buildBanner, buildCreatureProxy, buildHeroProxy, buildSiteProxy, disposeProxy, type CreatureProxy, type SiteArchetype, type SiteProxy } from './proxies';
import { TweenPlayer, linear } from './tween';

const R = 1;
const FOG_TOP = 0.46;
const FOG_BOTTOM = -0.4;
const SKIRT_BOTTOM = -0.42;

export interface AdventureSiteView {
  readonly id: string;
  readonly coord: HexCoord;
  readonly archetype: SiteArchetype;
  readonly name: string;
  /** Drawn at all (explored tile or story-revealed marker). */
  readonly shown: boolean;
  readonly ownerColor: string | null;
  readonly ownerShape: 'square' | 'pennant';
  readonly guardBody: BodyProfile | null;
  readonly guardUpgraded: boolean;
  readonly lit: boolean;
  readonly open: boolean;
  readonly claimed: boolean;
}

export interface AdventureHeroView {
  readonly id: string;
  readonly coord: HexCoord;
  readonly color: string;
  readonly shown: boolean;
  readonly selected: boolean;
  /** Offset when sharing a tile with a town. */
  readonly inTown: boolean;
  /** Wandering monster: drawn as its creature body instead of a rider. */
  readonly monsterBody?: BodyProfile | null;
  readonly monsterUpgraded?: boolean;
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
}

interface HeroEntry {
  proxy: CreatureProxy;
  color: string;
  /** Proxy identity (rider colour or monster body). */
  look: string;
  coord: HexCoord;
  prevCoord: HexCoord;
  locked: number;
  snapIn: number;
  inTown: boolean;
}

interface SiteEntry {
  proxy: SiteProxy;
  guard: CreatureProxy | null;
  guardKey: string;
  banner: TransformNode | null;
  bannerKey: string;
}

export class AdventureSceneController implements SceneController {
  readonly scene: Scene;
  readonly tweens = new TweenPlayer();
  private readonly camera: ArcRotateCamera;
  private readonly mats: MaterialCache;
  private readonly cb: AdventureCallbacks;
  private map: WorldMapDefinition | null = null;
  private mapKey = '';
  private terrain: Mesh | null = null;
  private terrainColors: Float32Array | null = null;
  private tileVertexStart: number[] = [];
  private tileVertexCount: number[] = [];
  private tileBase: [number, number, number][] = [];
  private roads: Mesh | null = null;
  private fog: Mesh | null = null;
  private grid: LinesMesh | null = null;
  private decorRoot: TransformNode | null = null;
  private decorByTile = new Map<number, Mesh[]>();
  private reach: Mesh | null = null;
  private pathMesh: Mesh | null = null;
  private hover: LinesMesh;
  private selectRing: Mesh;
  private fogKey = '';
  private reachKey = '';
  private pathKey = '';
  private gridMode: AdventureView['grid'] = 'always';
  private explored: readonly number[] = [];
  private heroes = new Map<string, HeroEntry>();
  private sites = new Map<string, SiteEntry>();
  private selectedHero: string | null = null;
  private pointerObs: Observer<PointerInfo> | null = null;
  private down: { x: number; y: number; button: number; ground: Vector3 | null; dragging: boolean } | null = null;
  private lastHover = '';
  private camGoal: Vector3 | null = null;
  private time = 0;

  constructor(engine: Engine, canvas: HTMLCanvasElement, cb: AdventureCallbacks) {
    this.cb = cb;
    const scene = new Scene(engine);
    this.scene = scene;
    scene.clearColor = clearColor('#070e1a');
    scene.skipPointerMovePicking = true;
    this.mats = new MaterialCache(scene);
    const cam = new ArcRotateCamera('adv-cam', -Math.PI / 2, 0.92, 24, Vector3.Zero(), scene);
    cam.lowerRadiusLimit = 8;
    cam.upperRadiusLimit = 36;
    cam.lowerBetaLimit = 0.92;
    cam.upperBetaLimit = 0.92;
    cam.inputs.clear();
    cam.inputs.addMouseWheel();
    cam.wheelPrecision = 18;
    cam.minZ = 0.5;
    cam.maxZ = 400;
    cam.attachControl(canvas, true);
    this.camera = cam;
    const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, -0.3), scene);
    hemi.intensity = 0.68;
    hemi.groundColor = new Color3(0.2, 0.22, 0.3);
    const sun = new DirectionalLight('sun', new Vector3(-0.45, -1, 0.35), scene);
    sun.intensity = 0.75;
    const sea = MeshBuilder.CreateGround('sea', { width: 400, height: 400 }, scene);
    sea.position.y = -0.34;
    sea.material = this.mats.get(SEA_COLOR, { specular: 0.2 });
    sea.isPickable = false;
    this.hover = this.hexOutline('hover', '#f5e4b7');
    this.hover.isVisible = false;
    this.selectRing = MeshBuilder.CreateTorus('select', { diameter: 1.25, thickness: 0.07, tessellation: 32 }, scene);
    this.selectRing.material = this.mats.get(SELECT_RING, { emissive: 0.8 });
    this.selectRing.isPickable = false;
    this.selectRing.isVisible = false;
    this.pointerObs = scene.onPointerObservable.add((p) => this.onPointer(p));
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
    const pk = view.path ? `${view.path.steps.map((s) => `${s.q},${s.r}`).join(';')}|${view.path.stopIndex}|${view.path.encounter}` : '';
    if (pk !== this.pathKey) {
      this.buildPath(view.path);
      this.pathKey = pk;
    }
    this.syncSites(view.sites);
    this.syncHeroes(view.heroes);
  }

  private heightAt(c: HexCoord): number {
    const map = this.map;
    if (!map || c.q < 0 || c.r < 0 || c.q >= map.width || c.r >= map.height) return 0;
    const t = TERRAIN_BY_CODE[map.terrain[c.r * map.width + c.q] ?? 'p'] ?? 'plains';
    return TERRAIN_HEIGHT[t] ?? 0;
  }

  private terrainOf(map: WorldMapDefinition, i: number): Terrain {
    return TERRAIN_BY_CODE[map.terrain[i] ?? 'p'] ?? 'plains';
  }

  private buildMap(map: WorldMapDefinition): void {
    this.terrain?.dispose();
    this.roads?.dispose();
    this.decorRoot?.dispose();
    this.decorByTile.clear();
    for (const s of this.sites.values()) this.disposeSite(s);
    this.sites.clear();
    this.map = map;
    const tint = BIOME_TINT[map.biome] ?? [1, 1, 1];
    const acc = new MeshAccumulator();
    this.tileVertexStart = [];
    this.tileVertexCount = [];
    this.tileBase = [];
    for (let r = 0; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        const i = r * map.width + q;
        const t = this.terrainOf(map, i);
        const base = hexToRgb(TERRAIN_COLORS[t]);
        const n = tileNoise(q, r) * 0.06;
        const rgb: [number, number, number] = [
          Math.min(1, base[0] * tint[0] + n),
          Math.min(1, base[1] * tint[1] + n),
          Math.min(1, base[2] * tint[2] + n),
        ];
        const { x, z } = axialWorld({ q, r }, R);
        const h = TERRAIN_HEIGHT[t];
        const start = acc.vertexCount;
        acc.hexTop(x, z, R * 0.985, h, rgb);
        acc.hexSides(x, z, R * 0.985, h, SKIRT_BOTTOM, rgb.map((c) => c * 0.55));
        this.tileVertexStart.push(start);
        this.tileVertexCount.push(acc.vertexCount - start);
        this.tileBase.push(rgb);
      }
    }
    this.terrain = acc.build('terrain', this.scene, { updatableColors: true });
    this.terrainColors = new Float32Array(acc.colors);
    // Roads
    const roads = new MeshAccumulator();
    const road = hexToRgb(ROAD_COLOR);
    for (const k of map.roads) {
      const [a, b] = k.split('|');
      const [aq, ar] = a!.split(',').map(Number);
      const [bq, br] = b!.split(',').map(Number);
      const pa = axialWorld({ q: aq!, r: ar! }, R);
      const pb = axialWorld({ q: bq!, r: br! }, R);
      const y = Math.max(this.heightAt({ q: aq!, r: ar! }), this.heightAt({ q: bq!, r: br! })) + 0.02;
      roads.ribbon(pa.x, pa.z, pb.x, pb.z, y, 0.26, road);
      roads.hexTop(pa.x, pa.z, 0.15, y + 0.001, road);
      roads.hexTop(pb.x, pb.z, 0.15, y + 0.001, road);
    }
    this.roads = roads.build('roads', this.scene);
    this.roads.metadata = { edges: map.roads };
    this.buildDecor(map);
    // Center the camera on the map initially.
    const center = axialWorld({ q: map.width / 2 - map.height / 4, r: map.height / 2 }, R);
    this.camera.target = new Vector3(center.x, 0, center.z);
  }

  private buildDecor(map: WorldMapDefinition): void {
    const root = new TransformNode('decor', this.scene);
    this.decorRoot = root;
    const streams = deriveStreams(map.seed, map.templateId, map.attempt);
    const items = buildDecor(map, streams);
    const tree = MeshBuilder.CreateCylinder('tree-src', { height: 0.62, diameterTop: 0, diameterBottom: 0.36, tessellation: 7 }, this.scene);
    tree.material = this.mats.get('#2f5a30');
    const pine = MeshBuilder.CreateCylinder('pine-src', { height: 0.8, diameterTop: 0, diameterBottom: 0.3, tessellation: 6 }, this.scene);
    pine.material = this.mats.get('#28492c');
    const rock = MeshBuilder.CreatePolyhedron('rock-src', { type: 1, size: 0.14 }, this.scene);
    rock.material = this.mats.get('#7d7a74');
    const shrub = MeshBuilder.CreateSphere('shrub-src', { diameter: 0.22, segments: 4 }, this.scene);
    shrub.material = this.mats.get('#5b7a3a');
    const peak = MeshBuilder.CreateCylinder('peak-src', { height: 1.1, diameterTop: 0.05, diameterBottom: 1.3, tessellation: 6 }, this.scene);
    peak.material = this.mats.get('#77726b');
    const snow = MeshBuilder.CreateCylinder('snow-src', { height: 0.28, diameterTop: 0.02, diameterBottom: 0.38, tessellation: 6 }, this.scene);
    snow.material = this.mats.get('#e9e6df');
    for (const src of [tree, pine, rock, shrub, peak, snow]) {
      src.isVisible = false;
      src.isPickable = false;
      src.parent = root;
    }
    const push = (i: number, m: Mesh) => {
      m.parent = root;
      m.isPickable = false;
      const list = this.decorByTile.get(i) ?? [];
      list.push(m);
      this.decorByTile.set(i, list);
    };
    for (let r = 0; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        const i = r * map.width + q;
        if (this.terrainOf(map, i) !== 'mountain') continue;
        const { x, z } = axialWorld({ q, r }, R);
        const p = peak.createInstance(`peak-${i}`);
        p.position.set(x, TERRAIN_HEIGHT.mountain + 0.5, z);
        p.rotation.y = tileNoise(q, r) * 3;
        push(i, p as unknown as Mesh);
        const s = snow.createInstance(`snow-${i}`);
        s.position.set(x, TERRAIN_HEIGHT.mountain + 0.96, z);
        push(i, s as unknown as Mesh);
      }
    }
    for (const d of items) {
      const src = d.kind === 'pine' ? pine : d.kind === 'tree' ? tree : d.kind === 'rock' ? rock : d.kind === 'shrub' ? shrub : d.kind === 'grass' ? shrub : rock;
      if (d.kind === 'rock' && this.terrainOf(map, d.r * map.width + d.q) === 'mountain') continue;
      const { x, z } = axialWorld({ q: d.q, r: d.r }, R);
      const inst = src.createInstance(`d-${d.q}-${d.r}-${Math.round(d.dx * 100)}`);
      const h = this.heightAt({ q: d.q, r: d.r });
      const s = d.kind === 'grass' ? d.scale * 0.5 : d.scale;
      inst.scaling.set(s, s, s);
      inst.position.set(x + d.dx * 0.42, h + (src === tree ? 0.31 : src === pine ? 0.4 : 0.07) * s, z + d.dz * 0.42);
      inst.rotation.y = d.rotation;
      push(d.r * map.width + d.q, inst as unknown as Mesh);
    }
  }

  private applyFog(explored: readonly number[], visible: ReadonlySet<number>): void {
    const map = this.map;
    if (!map || !this.terrain || !this.terrainColors) return;
    this.explored = explored;
    const colors = this.terrainColors;
    const fog = new MeshAccumulator();
    const unknown = hexToRgb(UNKNOWN_COLOR);
    const gridPts: Vector3[][] = [];
    for (let i = 0; i < map.width * map.height; i++) {
      const q = i % map.width;
      const r = Math.floor(i / map.width);
      const known = explored[i] === 1;
      const vis = visible.has(i);
      const base = this.tileBase[i]!;
      const f = known ? (vis ? 1 : 0.58) : 0;
      const start = this.tileVertexStart[i]!;
      const count = this.tileVertexCount[i]!;
      for (let v = 0; v < count; v++) {
        const side = v >= 7 ? 0.55 : 1;
        const o = (start + v) * 4;
        colors[o] = base[0] * f * side;
        colors[o + 1] = base[1] * f * side;
        colors[o + 2] = base[2] * f * side;
      }
      for (const m of this.decorByTile.get(i) ?? []) m.isVisible = known;
      const { x, z } = axialWorld({ q, r }, R);
      if (!known) {
        const n = 0.02 * tileNoise(q + 7, r + 3);
        const c = [unknown[0] + n, unknown[1] + n, unknown[2] + n * 1.4];
        fog.hexTop(x, z, R * 1.0, FOG_TOP + tileNoise(q, r + 11) * 0.03, c);
        fog.hexSides(x, z, R * 1.0, FOG_TOP, FOG_BOTTOM, c.map((k) => k * 0.8));
      } else if (this.gridMode === 'always') {
        const h = this.heightAt({ q, r }) + 0.012;
        const ring: Vector3[] = [];
        for (let k = 0; k <= 6; k++) {
          const cc = hexCorner(k % 6, R * 0.985);
          ring.push(new Vector3(x + cc.x, h, z + cc.z));
        }
        gridPts.push(ring);
      }
    }
    this.terrain.updateVerticesData(VertexBuffer.ColorKind, colors);
    this.fog?.dispose();
    this.fog = fog.positions.length ? fog.build('fog', this.scene) : null;
    this.grid?.dispose();
    this.grid = null;
    if (gridPts.length) {
      this.grid = MeshBuilder.CreateLineSystem('grid', { lines: gridPts }, this.scene);
      this.grid.color = new Color3(0.05, 0.07, 0.1);
      this.grid.alpha = 0.42;
      this.grid.isPickable = false;
    }
    // Roads only over explored tiles: rebuild from the edge list.
    if (this.roads) {
      this.roads.dispose();
      const roads = new MeshAccumulator();
      const road = hexToRgb(ROAD_COLOR);
      for (const k of map.roads) {
        const [a, b] = k.split('|');
        const [aq, ar] = a!.split(',').map(Number);
        const [bq, br] = b!.split(',').map(Number);
        const ia = ar! * map.width + aq!;
        const ib = br! * map.width + bq!;
        if (explored[ia] !== 1 || explored[ib] !== 1) continue;
        const pa = axialWorld({ q: aq!, r: ar! }, R);
        const pb = axialWorld({ q: bq!, r: br! }, R);
        const dim = visible.has(ia) || visible.has(ib) ? 1 : 0.6;
        const rgb = road.map((c) => c * dim);
        const y = Math.max(this.heightAt({ q: aq!, r: ar! }), this.heightAt({ q: bq!, r: br! })) + 0.02;
        roads.ribbon(pa.x, pa.z, pb.x, pb.z, y, 0.26, rgb);
        roads.hexTop(pa.x, pa.z, 0.15, y + 0.001, rgb);
        roads.hexTop(pb.x, pb.z, 0.15, y + 0.001, rgb);
      }
      this.roads = roads.positions.length ? roads.build('roads', this.scene) : new Mesh('roads-empty', this.scene);
    }
  }

  private buildReach(tiles: readonly HexCoord[] | null): void {
    this.reach?.dispose();
    this.reach = null;
    if (!tiles || tiles.length === 0) return;
    const acc = new MeshAccumulator();
    const rgb = hexToRgb(HIGHLIGHT_REACH);
    for (const c of tiles) {
      const { x, z } = axialWorld(c, R);
      acc.hexTop(x, z, R * 0.86, this.heightAt(c) + 0.03, rgb, 0.2);
    }
    this.reach = acc.build('reach', this.scene, { alpha: true });
  }

  private buildPath(path: AdventurePathView | null): void {
    this.pathMesh?.dispose();
    this.pathMesh = null;
    if (!path || path.steps.length === 0) return;
    const acc = new MeshAccumulator();
    const today = hexToRgb(PATH_TODAY);
    const later = hexToRgb(PATH_LATER);
    const enc = hexToRgb(PATH_ENCOUNTER);
    const last = path.steps.length - 1;
    let prev: { x: number; z: number; y: number } | null = null;
    const heroStart = this.selectedHero ? this.heroes.get(this.selectedHero)?.coord : undefined;
    if (heroStart) {
      const w = axialWorld(heroStart, R);
      prev = { ...w, y: this.heightAt(heroStart) + 0.05 };
    }
    path.steps.forEach((c, i) => {
      const w = axialWorld(c, R);
      const y = this.heightAt(c) + 0.05;
      const rgb = i <= path.stopIndex ? today : later;
      if (prev) acc.ribbon(prev.x, prev.z, w.x, w.z, Math.max(prev.y, y), 0.07, rgb, 0.9);
      if (i === last) {
        if (path.encounter) {
          // Crossed-swords "X" marker: shape, not only color.
          acc.ribbon(w.x - 0.3, w.z - 0.3, w.x + 0.3, w.z + 0.3, y + 0.02, 0.12, enc);
          acc.ribbon(w.x - 0.3, w.z + 0.3, w.x + 0.3, w.z - 0.3, y + 0.02, 0.12, enc);
        } else {
          acc.hexTop(w.x, w.z, 0.3, y + 0.01, rgb);
          acc.hexTop(w.x, w.z, 0.18, y + 0.02, [0.06, 0.08, 0.12]);
        }
      } else {
        // Today: solid dot; later days: hollow ring (shape cue).
        acc.hexTop(w.x, w.z, 0.14, y + 0.01, rgb);
        if (i > path.stopIndex) acc.hexTop(w.x, w.z, 0.07, y + 0.02, [0.06, 0.08, 0.12]);
      }
      prev = { ...w, y };
    });
    this.pathMesh = acc.build('path', this.scene, { alpha: true });
  }

  // ------------------------------------------------------------------ sites & heroes

  private disposeSite(s: SiteEntry): void {
    s.proxy.root.dispose(false, false);
    if (s.guard) disposeProxy(s.guard);
  }

  private syncSites(views: readonly AdventureSiteView[]): void {
    const seen = new Set<string>();
    for (const v of views) {
      seen.add(v.id);
      let e = this.sites.get(v.id);
      if (!v.shown || (v.archetype === 'pickup' && v.claimed)) {
        if (e) e.proxy.root.setEnabled(false);
        continue;
      }
      if (!e) {
        const proxy = buildSiteProxy(this.scene, this.mats, v.archetype, `site-${v.id}`);
        const w = axialWorld(v.coord, R);
        proxy.root.position.set(w.x, this.heightAt(v.coord), w.z);
        proxy.root.scaling.setAll(v.archetype === 'town' ? 0.95 : 0.8);
        e = { proxy, guard: null, guardKey: '', banner: null, bannerKey: '' };
        this.sites.set(v.id, e);
      }
      e.proxy.root.setEnabled(true);
      if (e.proxy.flame) e.proxy.flame.isVisible = v.lit;
      if (e.proxy.seal) e.proxy.seal.isVisible = !v.open;
      const bk = v.ownerColor ? `${v.ownerColor}|${v.ownerShape}` : '';
      if (bk !== e.bannerKey) {
        e.banner?.dispose(false, false);
        e.banner = v.ownerColor ? buildBanner(this.scene, this.mats, e.proxy.flagPole, v.ownerColor, v.ownerShape) : null;
        e.bannerKey = bk;
      }
      const gk = v.guardBody ? `${v.guardBody}|${v.guardUpgraded}` : '';
      if (gk !== e.guardKey) {
        if (e.guard) disposeProxy(e.guard);
        e.guard = null;
        if (v.guardBody) {
          const g = buildCreatureProxy(this.scene, this.mats, v.guardBody, v.guardUpgraded, '#7a2f2a', `guard-${v.id}`);
          g.root.parent = e.proxy.root;
          g.root.position.set(0.55, 0, -0.45);
          g.root.rotation.y = Math.PI * 0.8;
          g.root.scaling.setAll(0.75);
          e.guard = g;
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
    const w = axialWorld(c, R);
    const off = e.inTown ? 0.42 : 0;
    e.proxy.root.position.set(w.x + off, this.heightAt(c), w.z - off * 0.6);
  }

  private syncHeroes(views: readonly AdventureHeroView[]): void {
    const seen = new Set<string>();
    this.selectedHero = null;
    for (const v of views) {
      seen.add(v.id);
      let e = this.heroes.get(v.id);
      const look = v.monsterBody ? `monster|${v.monsterBody}|${v.monsterUpgraded === true}` : `hero|${v.color}`;
      if (!e || e.look !== look) {
        if (e) disposeProxy(e.proxy);
        let proxy: CreatureProxy;
        if (v.monsterBody) {
          proxy = buildCreatureProxy(this.scene, this.mats, v.monsterBody, v.monsterUpgraded === true, v.color, `monster-${v.id}`);
          proxy.root.scaling.setAll(0.85);
        } else proxy = buildHeroProxy(this.scene, this.mats, v.color, `hero-${v.id}`);
        e = { proxy, color: v.color, look, coord: v.coord, prevCoord: v.coord, locked: 0, snapIn: 0, inTown: v.inTown };
        this.heroes.set(v.id, e);
        this.placeHero(e, v.coord);
      }
      e.inTown = v.inTown;
      if (e.coord.q !== v.coord.q || e.coord.r !== v.coord.r) {
        e.prevCoord = e.coord;
        e.coord = v.coord;
        // Give a queued movement playback two frames to claim the hero before snapping.
        if (e.locked === 0) e.snapIn = 2;
      } else if (e.locked === 0 && e.snapIn === 0) {
        this.placeHero(e, v.coord);
      }
      e.proxy.root.setEnabled(v.shown);
      if (v.selected) this.selectedHero = v.id;
    }
    for (const [id, e] of this.heroes) {
      if (!seen.has(id)) {
        disposeProxy(e.proxy);
        this.heroes.delete(id);
      }
    }
  }

  /** Movement playback for a committed HeroMoved event (never changes state). */
  async playHeroMove(heroId: string, path: readonly HexCoord[], speed: number, follow: boolean): Promise<void> {
    const e = this.heroes.get(heroId);
    if (!e || path.length === 0) return;
    const end = path[path.length - 1]!;
    const start = e.coord.q === end.q && e.coord.r === end.r ? e.prevCoord : e.coord;
    e.locked += 1;
    e.snapIn = 0;
    this.tweens.speed = speed;
    try {
      let from = start;
      this.placeHero(e, from);
      for (const step of path) {
        const a = axialWorld(from, R);
        const b = axialWorld(step, R);
        const ha = this.heightAt(from);
        const hb = this.heightAt(step);
        e.proxy.root.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
        await this.tweens.tween(
          210,
          (t) => {
            e.proxy.root.position.set(a.x + (b.x - a.x) * t, ha + (hb - ha) * t + Math.sin(t * Math.PI) * 0.08, a.z + (b.z - a.z) * t);
            if (follow) this.camGoal = new Vector3(e.proxy.root.position.x, 0, e.proxy.root.position.z);
          },
          linear,
        );
        from = step;
      }
    } finally {
      e.locked -= 1;
      if (e.locked === 0) this.placeHero(e, e.coord);
    }
  }

  // ------------------------------------------------------------------ camera

  focus(c: HexCoord, animate = true): void {
    const w = axialWorld(c, R);
    const goal = new Vector3(w.x, 0, w.z - 1.2);
    if (animate) this.camGoal = goal;
    else this.camera.target = goal;
  }

  pan(dx: number, dz: number): void {
    const t = this.camera.target.clone();
    t.x += dx;
    t.z += dz;
    this.camera.target = this.clampTarget(t);
    this.camGoal = null;
  }

  zoom(delta: number): void {
    const c = this.camera;
    c.radius = Math.max(c.lowerRadiusLimit ?? 8, Math.min(c.upperRadiusLimit ?? 36, c.radius + delta));
  }

  private clampTarget(t: Vector3): Vector3 {
    const map = this.map;
    if (!map) return t;
    const a = axialWorld({ q: 0, r: 0 }, R);
    const b = axialWorld({ q: map.width - 1, r: map.height - 1 }, R);
    const minX = Math.min(a.x, b.x, axialWorld({ q: 0, r: map.height - 1 }, R).x) - 2;
    const maxX = Math.max(a.x, b.x, axialWorld({ q: map.width - 1, r: 0 }, R).x) + 2;
    t.x = Math.max(minX, Math.min(maxX, t.x));
    t.z = Math.max(b.z - 4, Math.min(a.z + 2, t.z));
    return t;
  }

  // ------------------------------------------------------------------ input

  private hexOutline(name: string, hex: string): LinesMesh {
    const pts: Vector3[] = [];
    for (let k = 0; k <= 6; k++) {
      const c = hexCorner(k % 6, R * 0.97);
      pts.push(new Vector3(c.x, 0, c.z));
    }
    const l = MeshBuilder.CreateLines(name, { points: pts }, this.scene);
    l.color = Color3.FromHexString(hex);
    l.isPickable = false;
    return l;
  }

  private tileAtPointer(x: number, y: number): HexCoord | null {
    const p = pickGround(this.scene, this.camera, x, y, 0);
    if (!p || !this.map) return null;
    const c = worldAxial(p.x, p.z, R);
    if (c.q < 0 || c.r < 0 || c.q >= this.map.width || c.r >= this.map.height) return null;
    return c;
  }

  private onPointer(p: PointerInfo): void {
    const ev = p.event as PointerEvent;
    const x = this.scene.pointerX;
    const y = this.scene.pointerY;
    if (p.type === PointerEventTypes.POINTERDOWN) {
      this.down = { x, y, button: ev.button, ground: pickGround(this.scene, this.camera, x, y, 0), dragging: false };
    } else if (p.type === PointerEventTypes.POINTERMOVE) {
      const d = this.down;
      if (d && (d.button === 0 || d.button === 1) && (d.dragging || Math.hypot(x - d.x, y - d.y) > 7)) {
        d.dragging = true;
        const g = pickGround(this.scene, this.camera, x, y, 0);
        if (g && d.ground) {
          const t = this.camera.target.clone();
          t.x -= g.x - d.ground.x;
          t.z -= g.z - d.ground.z;
          this.camera.target = this.clampTarget(t);
          this.camGoal = null;
        }
        return;
      }
      const c = this.tileAtPointer(x, y);
      const key = c ? `${c.q},${c.r}` : '';
      if (key !== this.lastHover) {
        this.lastHover = key;
        this.setHover(c);
        this.cb.onTileHover(c && this.isExplored(c) ? c : null);
      }
    } else if (p.type === PointerEventTypes.POINTERUP) {
      const d = this.down;
      this.down = null;
      if (!d || d.dragging) return;
      const c = this.tileAtPointer(x, y);
      if (c && this.isExplored(c)) this.cb.onTileClick(c, d.button);
    }
  }

  private isExplored(c: HexCoord): boolean {
    const map = this.map;
    return !!map && this.explored[c.r * map.width + c.q] === 1;
  }

  private setHover(c: HexCoord | null): void {
    if (!c || !this.isExplored(c) || this.gridMode === 'off') {
      this.hover.isVisible = false;
      return;
    }
    const w = axialWorld(c, R);
    this.hover.position.set(w.x, this.heightAt(c) + 0.03, w.z);
    this.hover.isVisible = true;
  }

  /** Screen position (CSS pixels within the canvas) of a hex center — read-only, for tests and UI anchoring. */
  projectHex(c: HexCoord): { x: number; y: number } | null {
    const w = axialWorld(c, R);
    return projectPoint(this.scene, this.camera, new Vector3(w.x, this.heightAt(c), w.z));
  }

  // ------------------------------------------------------------------ frame

  tick(dt: number): void {
    this.time += dt;
    this.tweens.tick(dt);
    if (this.camGoal) {
      const t = this.camera.target;
      const k = Math.min(1, dt / 160);
      const next = new Vector3(t.x + (this.camGoal.x - t.x) * k, 0, t.z + (this.camGoal.z - t.z) * k);
      this.camera.target = this.clampTarget(next);
      if (Vector3.Distance(next, this.camGoal) < 0.02) this.camGoal = null;
    }
    for (const e of this.heroes.values()) {
      if (e.snapIn > 0 && e.locked === 0) {
        e.snapIn -= 1;
        if (e.snapIn === 0) this.placeHero(e, e.coord);
      }
    }
    const sel = this.selectedHero ? this.heroes.get(this.selectedHero) : undefined;
    if (sel && sel.proxy.root.isEnabled()) {
      const p = sel.proxy.root.position;
      this.selectRing.position.set(p.x, p.y + 0.05, p.z);
      this.selectRing.rotation.y = this.time / 900;
      this.selectRing.isVisible = true;
    } else this.selectRing.isVisible = false;
    for (const s of this.sites.values()) {
      if (s.proxy.flame && s.proxy.flame.isVisible) {
        const k = 1 + Math.sin(this.time / 120) * 0.08;
        s.proxy.flame.scaling.set(k, 1 + Math.sin(this.time / 90) * 0.12, k);
      }
    }
  }

  get busy(): boolean {
    return this.tweens.busy;
  }

  dispose(): void {
    this.tweens.flush();
    if (this.pointerObs) this.scene.onPointerObservable.remove(this.pointerObs);
    this.mats.dispose();
    this.scene.dispose();
  }
}
