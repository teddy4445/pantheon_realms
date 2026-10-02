/**
 * BattleSceneController: the tactical hex board, stack figures, highlights and
 * event playback (move, melee, ranged, retaliation, spells, defend, wait,
 * morale, destruction, victory).
 *
 * All outcomes (damage, kills, destruction) are already committed by the rules
 * before playback starts; this controller only visualizes GameEvents. Instant
 * playback (speed 0) completes synchronously and cannot change any result.
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
import type { Observer } from '@babylonjs/core/Misc/observable';
import type { BattleCell, BodyProfile, GameEvent } from '@pr/rules';
import type { SceneController } from './engineHost';
import { MeshAccumulator, cellWorld, clearColor, createLabel, hexCorner, pickGround, projectPoint, worldCell, type Label } from './meshkit';
import { hexToRgb, tileNoise } from './palette';
import { MaterialCache, buildCreatureProxy, disposeProxy } from './proxies';
import { TweenPlayer, easeInOut, linear } from './tween';
import { applyIdle, faceGroup, playState, restFigure, type Figure } from './animations';
import { ModelCache, unitModelFor, type ModelRig } from './models';
import { BATTLEFIELD_LAYOUT, battlefieldArt } from './environmentArt';
import { groundMaterial, loadArtTexture } from './artTextures';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';

const R = 1;
const WHITE: readonly [number, number, number] = [1, 1, 1];
/**
 * Battlefield presentation scale for GLB figures: models are authored in true
 * meters (a 1.8 m human); the board uses 1-unit hex radii, so figures are drawn
 * at 0.6 × authored size to sit inside one hex like the proxies. The bestiary
 * shows models at true scale. See ASSET_PIPELINE.md §2.
 */
export const BATTLE_MODEL_SCALE = 0.6;

export interface BattleStackView {
  readonly id: string;
  /** Creature ID: selects a registered GLB model, else the procedural proxy. */
  readonly creatureId?: string;
  readonly side: 'attacker' | 'defender';
  readonly body: BodyProfile;
  readonly upgraded: boolean;
  readonly accent: string;
  readonly anchor: BattleCell;
  readonly facing: 1 | -1;
  readonly footprint: 1 | 2;
  readonly count: number;
  readonly alive: boolean;
  readonly active: boolean;
  readonly label: string;
  readonly labelColor: string;
}

export interface SiegeStructureView {
  readonly id: string;
  readonly kind: 'wall' | 'gate' | 'tower' | 'keep';
  readonly cells: readonly BattleCell[];
  readonly hp: number;
  readonly maxHp: number;
}

export interface SiegeView {
  readonly structures: readonly SiegeStructureView[];
  readonly moat: readonly BattleCell[];
  readonly wallCol: number;
}

export interface BattleView {
  readonly battleId: string;
  readonly cols: number;
  readonly rows: number;
  readonly obstacles: readonly BattleCell[];
  readonly archetype: string;
  /** Map climate (picks a battlefield painting variant when one exists; presentation only). */
  readonly climate?: string;
  readonly stacks: readonly BattleStackView[];
  /** Reachable anchors for the active human stack. */
  readonly moves: readonly BattleCell[];
  /** Cells of enemy stacks that can be attacked now (melee or shot). */
  readonly targets: readonly BattleCell[];
  readonly path: readonly BattleCell[] | null;
  readonly attackFrom: BattleCell | null;
  readonly highlightKey: string;
  readonly grid: boolean;
  /** Town fortifications (sieges only). */
  readonly siege: SiegeView | null;
  /** Deployment zone cells to shade while a side arranges its army. */
  readonly zone: readonly BattleCell[];
}

/**
 * Presentation cues: moments in battle playback that a sound (or any other
 * cosmetic layer) can follow, timed with the animation. Cosmetic only; they
 * carry no rules information that is not already shown.
 */
export type BattleCueKind =
  | 'march'
  | 'flight'
  | 'swing'
  | 'impact'
  | 'shot'
  | 'arrow-hit'
  | 'death'
  | 'spell'
  | 'heal'
  | 'bless'
  | 'ward'
  | 'defend'
  | 'morale-up'
  | 'morale-down'
  | 'shapeshift'
  | 'recovery'
  | 'catapult'
  | 'stone-hit'
  | 'breach'
  | 'turret'
  | 'moat';

export interface BattleCue {
  readonly kind: BattleCueKind;
  /** The blow killed creatures (a heavier sound). */
  readonly heavy?: boolean;
}

export interface BattleCallbacks {
  onCellClick(c: BattleCell, button: number, offset: { x: number; z: number }): void;
  onCellHover(c: BattleCell | null, offset: { x: number; z: number }): void;
  /** Optional: presentation cues timed with playback (sound). */
  onCue?(cue: BattleCue): void;
}

interface StackEntry {
  group: TransformNode;
  figures: Figure[];
  base: Mesh;
  label: Label;
  view: BattleStackView;
  shownAnchor: BattleCell;
  prevAnchor: BattleCell;
  locked: number;
  snapIn: number;
  hideIn: number;
  key: string;
  /** GLB rigs waiting for the stack to be idle before they replace the proxies. */
  pendingRigs: ModelRig[] | null;
}

const ARCHETYPE_GROUND: Record<string, string> = {
  coast_road: '#8a8b5c',
  ridge_pass: '#7c7564',
  grove: '#5c7a45',
  plateau: '#6f7270',
  beacon_clearing: '#86844f',
  open_field: '#7e8a4f',
};

export class BattleSceneController implements SceneController {
  readonly scene: Scene;
  readonly tweens = new TweenPlayer();
  private readonly camera: ArcRotateCamera;
  private readonly mats: MaterialCache;
  private readonly cb: BattleCallbacks;
  private boardKey = '';
  private board: Mesh | null = null;
  /** Painted battlefield (Brief 2): the ground plane and the board's cell tops show one painting. */
  private boardArt: Mesh | null = null;
  private boardArtColors: Float32Array | null = null;
  private artGround: Mesh | null = null;
  private artDisposables: { dispose(): void }[] = [];
  private surround: Mesh;
  private surroundDefault: StandardMaterial | null = null;
  private obstacleRoot: TransformNode | null = null;
  private grid: LinesMesh | null = null;
  private highlight: Mesh | null = null;
  private highlightKey = '';
  private hover: LinesMesh;
  private activeRing: Mesh;
  private stacks = new Map<string, StackEntry>();
  private readonly models: ModelCache;
  private pointerObs: Observer<PointerInfo> | null = null;
  private lastHover = '';
  private time = 0;
  private cols = 15;
  private rows = 11;
  private obstacleSet = new Set<string>();
  private siegeView: SiegeView | null = null;
  private structureRoot: TransformNode | null = null;
  private structureLabels: Label[] = [];
  /** Structure HP as currently drawn (playback advances it event by event). */
  private shownHp = new Map<string, number>();
  private structureKey = '';
  private structureSnapIn = 0;
  private structuresLocked = 0;

  constructor(engine: Engine, canvas: HTMLCanvasElement, cb: BattleCallbacks) {
    this.cb = cb;
    const scene = new Scene(engine);
    // Right-handed before any glTF load (production/02 §5).
    scene.useRightHandedSystem = true;
    this.scene = scene;
    this.models = new ModelCache(scene);
    scene.clearColor = clearColor('#0a1220');
    scene.skipPointerMovePicking = true;
    this.mats = new MaterialCache(scene);
    const center = cellWorld({ col: 7, row: 5 }, R);
    const cam = new ArcRotateCamera('battle-cam', Math.PI / 2, 0.8, 27.5, new Vector3(center.x + 0.45, 0, center.z + 0.6), scene);
    cam.lowerRadiusLimit = 17;
    cam.upperRadiusLimit = 34;
    cam.lowerBetaLimit = 0.82;
    cam.upperBetaLimit = 0.82;
    cam.inputs.clear();
    cam.inputs.addMouseWheel();
    cam.wheelPrecision = 30;
    cam.attachControl(canvas, true);
    this.camera = cam;
    const hemi = new HemisphericLight('hemi', new Vector3(0.1, 1, 0.2), scene);
    hemi.intensity = 0.7;
    hemi.groundColor = new Color3(0.2, 0.2, 0.28);
    const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.4), scene);
    sun.intensity = 0.7;
    const ground = MeshBuilder.CreateGround('surround', { width: 90, height: 70 }, scene);
    ground.position.set(center.x, -0.12, center.z);
    ground.material = this.mats.get('#2b3524');
    ground.isPickable = false;
    this.surround = ground;
    this.surroundDefault = ground.material as StandardMaterial;
    this.hover = this.outline('hover', '#f5e4b7');
    this.hover.isVisible = false;
    this.activeRing = MeshBuilder.CreateTorus('active', { diameter: 1.45, thickness: 0.08, tessellation: 36 }, scene);
    this.activeRing.material = this.mats.get('#f1d48a', { emissive: 0.9 });
    this.activeRing.isPickable = false;
    this.activeRing.isVisible = false;
    this.pointerObs = scene.onPointerObservable.add((p) => this.onPointer(p));
  }

  // ------------------------------------------------------------------ board

  private outline(name: string, hex: string): LinesMesh {
    const pts: Vector3[] = [];
    for (let k = 0; k <= 6; k++) {
      const c = hexCorner(k % 6, R * 0.95);
      pts.push(new Vector3(c.x, 0, c.z));
    }
    const l = MeshBuilder.CreateLines(name, { points: pts }, this.scene);
    l.color = Color3.FromHexString(hex);
    l.isPickable = false;
    return l;
  }

  private disposeBoardArt(): void {
    const mats = new Set([this.boardArt?.material, this.artGround?.material].filter((m) => !!m));
    for (const m of mats) m!.dispose();
    this.boardArt?.dispose();
    this.boardArt = null;
    this.boardArtColors = null;
    this.artGround?.dispose();
    this.artGround = null;
    for (const d of this.artDisposables) d.dispose();
    this.artDisposables = [];
    if (this.surroundDefault) this.surround.material = this.surroundDefault;
  }

  /**
   * The painted battlefield (Brief 2, §6.0): one painting drawn once (clamped)
   * across the ground, seen straight down, with the 15 × 11 board fitted inside
   * its quiet centre (about 1500 × 1000 of 4096 × 3200 px). Image top = the far
   * side of the field. Returns the world → UV mapping, or null without art.
   */
  private battlefieldMapping(view: BattleView): { uv: (x: number, z: number) => readonly [number, number]; x0: number; z0: number; w: number; h: number } | null {
    const art = battlefieldArt(view.archetype, view.climate);
    if (!art) return null;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [col, row] of [[0, 0], [view.cols - 1, 0], [0, view.rows - 1], [view.cols - 1, view.rows - 1], [0, 1], [view.cols - 1, 1]] as const) {
      const p = cellWorld({ col, row }, R);
      minX = Math.min(minX, p.x - R);
      maxX = Math.max(maxX, p.x + R);
      minZ = Math.min(minZ, p.z - R);
      maxZ = Math.max(maxZ, p.z + R);
    }
    const L = BATTLEFIELD_LAYOUT;
    // World units per layout pixel: the board fits the quiet centre in both directions.
    const unit = Math.max((maxX - minX) / L.centreWidth, (maxZ - minZ) / L.centreHeight);
    const w = L.width * unit;
    const h = L.height * unit;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const x0 = cx - w / 2;
    const z0 = cz - h / 2;
    // Rows advance toward +Z (the camera side), so the image top (v = 1) is the far edge (−Z).
    const uv = (x: number, z: number) => [(x - x0) / w, 1 - (z - z0) / h] as const;
    return { uv, x0, z0, w, h };
  }

  private buildBoard(view: BattleView): void {
    this.board?.dispose();
    this.grid?.dispose();
    this.obstacleRoot?.dispose();
    this.disposeBoardArt();
    this.cols = view.cols;
    this.rows = view.rows;
    this.obstacleSet = new Set(view.obstacles.map((c) => `${c.col}:${c.row}`));
    const moat = new Set((view.siege?.moat ?? []).map((c) => `${c.col}:${c.row}`));
    const acc = new MeshAccumulator();
    const mapping = this.battlefieldMapping(view);
    const art = mapping ? battlefieldArt(view.archetype, view.climate) : null;
    const tops = mapping ? new MeshAccumulator(mapping.uv) : null;
    /** Per painted cell top: the tint it keeps once the painting shows (deployment columns slightly darker). */
    const paintedTint: number[] = [];
    const baseRgb = hexToRgb(ARCHETYPE_GROUND[view.archetype] ?? '#7e8a4f');
    const water = hexToRgb('#2e5871');
    const paved = hexToRgb('#8c8474');
    const lines: Vector3[][] = [];
    for (let row = 0; row < view.rows; row++) {
      for (let col = 0; col < view.cols; col++) {
        const { x, z } = cellWorld({ col, row }, R);
        const n = tileNoise(col * 3 + 1, row * 5 + 2) * 0.045;
        const deploy = col < 2 || col >= view.cols - 2 ? -0.03 : 0;
        const inMoat = moat.has(`${col}:${row}`);
        const inTown = !!view.siege && view.siege.structures.length > 0 && col > view.siege.wallCol;
        const src = inMoat ? water : inTown ? paved : baseRgb;
        const rgb = src.map((c) => Math.max(0, Math.min(1, c + n + (inMoat ? 0 : deploy))));
        const top = inMoat ? -0.08 : 0;
        if (tops && !inMoat && !inTown) {
          // Painted cell: the battlefield painting continues across the board.
          tops.hexTop(x, z, R * 0.975, top, rgb);
          for (let k = 0; k < 7; k++) paintedTint.push(deploy < 0 ? 0.9 : 1);
        } else {
          acc.hexTop(x, z, R * 0.975, top, rgb);
        }
        acc.hexSides(x, z, R * 0.975, top, -0.12, rgb.map((c) => c * 0.5));
        const ring: Vector3[] = [];
        for (let k = 0; k <= 6; k++) {
          const cc = hexCorner(k % 6, R * 0.975);
          ring.push(new Vector3(x + cc.x, 0.012, z + cc.z));
        }
        lines.push(ring);
      }
    }
    this.board = acc.build('board', this.scene);
    if (tops && mapping && art && tops.positions.length) {
      const painted = tops.build('board-art', this.scene, { updatableColors: true });
      this.boardArt = painted;
      this.boardArtColors = new Float32Array(tops.colors);
      // The ground plane under and around the board shows the same painting (clamped at its edges).
      const g = new MeshAccumulator(mapping.uv);
      const y = -0.115;
      const a = g.vertex(mapping.x0, y, mapping.z0, WHITE);
      const b = g.vertex(mapping.x0 + mapping.w, y, mapping.z0, WHITE);
      const c = g.vertex(mapping.x0 + mapping.w, y, mapping.z0 + mapping.h, WHITE);
      const d = g.vertex(mapping.x0, y, mapping.z0 + mapping.h, WHITE);
      g.indices.push(a, b, c, a, c, d);
      const plane = g.build('battlefield-art', this.scene);
      plane.isVisible = false;
      this.artGround = plane;
      const colors = this.boardArtColors;
      const tint = paintedTint;
      const tex = loadArtTexture(this.scene, art, 'clamp', 'clamp', (loaded) => {
        if (this.boardArt !== painted) return;
        const mat = groundMaterial('battlefield-art', this.scene, loaded);
        plane.material = mat;
        plane.isVisible = true;
        const old = painted.material;
        painted.material = mat;
        old?.dispose();
        for (let v = 0; v < tint.length; v++) {
          colors[v * 4] = tint[v]!;
          colors[v * 4 + 1] = tint[v]!;
          colors[v * 4 + 2] = tint[v]!;
        }
        painted.updateVerticesData(VertexBuffer.ColorKind, colors);
        // Beyond the painting, the old surround takes the colour of the painting's far margin.
        if (art.edge) this.surround.material = this.mats.get(art.edge);
      });
      this.artDisposables.push(tex);
    }
    this.grid = MeshBuilder.CreateLineSystem('bgrid', { lines }, this.scene);
    this.grid.color = new Color3(0.08, 0.1, 0.08);
    this.grid.alpha = 0.5;
    this.grid.isPickable = false;
    const root = new TransformNode('obstacles', this.scene);
    this.obstacleRoot = root;
    view.obstacles.forEach((c, i) => {
      const { x, z } = cellWorld(c, R);
      const kind = (c.col * 7 + c.row * 3 + i) % 3;
      const m =
        kind === 0
          ? MeshBuilder.CreatePolyhedron(`ob-${i}`, { type: 2, size: 0.42 }, this.scene)
          : kind === 1
            ? MeshBuilder.CreateCylinder(`ob-${i}`, { height: 1.0, diameterTop: 0.5, diameterBottom: 0.62, tessellation: 8 }, this.scene)
            : MeshBuilder.CreateCylinder(`ob-${i}`, { height: 0.9, diameterTop: 0, diameterBottom: 0.9, tessellation: 7 }, this.scene);
      m.material = this.mats.get(kind === 2 ? '#35573a' : kind === 1 ? '#bdb6a6' : '#7b7872');
      m.position.set(x, kind === 0 ? 0.3 : 0.45, z);
      m.rotation.y = i * 1.3;
      m.parent = root;
      m.isPickable = false;
    });
  }

  private buildHighlights(view: BattleView): void {
    this.highlight?.dispose();
    this.highlight = null;
    const acc = new MeshAccumulator();
    const move = hexToRgb('#4fc3d6');
    const target = hexToRgb('#e0573f');
    const path = hexToRgb('#8fe07a');
    const from = hexToRgb('#f1d48a');
    const zone = hexToRgb('#f1d48a');
    for (const c of view.zone) {
      const { x, z } = cellWorld(c, R);
      acc.hexTop(x, z, R * 0.93, 0.015, zone, 0.24);
    }
    for (const c of view.moves) {
      const { x, z } = cellWorld(c, R);
      acc.hexTop(x, z, R * 0.86, 0.02, move, 0.22);
    }
    for (const c of view.targets) {
      const { x, z } = cellWorld(c, R);
      acc.hexTop(x, z, R * 0.9, 0.025, target, 0.3);
    }
    if (view.path) {
      for (const c of view.path) {
        const { x, z } = cellWorld(c, R);
        acc.hexTop(x, z, 0.16, 0.04, path, 0.95);
      }
    }
    if (view.attackFrom) {
      const { x, z } = cellWorld(view.attackFrom, R);
      acc.hexTop(x, z, R * 0.7, 0.035, from, 0.45);
      acc.hexTop(x, z, R * 0.52, 0.04, [0.2, 0.2, 0.15], 0.3);
    }
    if (acc.positions.length) this.highlight = acc.build('highlights', this.scene, { alpha: true });
  }

  // ------------------------------------------------------------------ stacks

  private groupPosition(anchor: BattleCell, footprint: 1 | 2, facing: 1 | -1): Vector3 {
    const a = cellWorld(anchor, R);
    if (footprint === 1) return new Vector3(a.x, 0, a.z);
    const b = cellWorld({ col: anchor.col - facing, row: anchor.row }, R);
    return new Vector3((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
  }

  private figureCount(v: BattleStackView): number {
    if (v.footprint === 2) return v.count >= 5 ? 2 : 1;
    return v.count >= 10 ? 3 : v.count >= 2 ? 2 : 1;
  }

  private createStack(v: BattleStackView): StackEntry {
    const group = new TransformNode(`stack-${v.id}`, this.scene);
    const baseAcc = new MeshAccumulator();
    const sideRgb = hexToRgb(v.side === 'attacker' ? '#3b73d9' : '#b8453a');
    const w = v.footprint === 2 ? 1.6 : 1;
    baseAcc.hexTop(0, 0, 0.62 * w, 0.03, sideRgb, 0.55);
    if (v.side === 'defender') baseAcc.hexTop(0, 0, 0.4 * w, 0.035, [0.08, 0.08, 0.1], 0.55);
    const base = baseAcc.build(`base-${v.id}`, this.scene, { alpha: true });
    base.parent = group;
    const n = this.figureCount(v);
    const offsets: [number, number][] =
      v.footprint === 2
        ? n === 2
          ? [
              [0.35, 0.25],
              [-0.35, -0.2],
            ]
          : [[0, 0]]
        : n === 3
          ? [
              [0.22, 0.26],
              [0.24, -0.26],
              [-0.24, 0],
            ]
          : n === 2
            ? [
                [0.16, 0.22],
                [-0.16, -0.2],
              ]
            : [[0, 0]];
    const scale = n === 3 ? 0.95 : n === 2 ? 1.08 : v.footprint === 2 ? 1.35 : 1.25;
    // Each figure sits in a scaled wrapper so pose resets (scale 1) keep the stack size.
    const figures: Figure[] = offsets.map(([x, z], i) => {
      const wrap = new TransformNode(`wrap-${v.id}-${i}`, this.scene);
      wrap.parent = group;
      wrap.scaling.setAll(scale);
      wrap.position.set(x, 0, z);
      const proxy = buildCreatureProxy(this.scene, this.mats, v.body, v.upgraded, v.accent, `fig-${v.id}-${i}`);
      proxy.root.parent = wrap;
      return { proxy, base: { x: 0, y: 0, z: 0 }, seed: i * 1.7 + v.id.length };
    });
    const label = createLabel(this.scene, `lbl-${v.id}`, v.label, { worldWidth: 0.95, width: 256, height: 96 });
    label.mesh.parent = group;
    // The camera looks down −Z; local z is mirrored for groups facing −X, so keep the badge on the camera side.
    label.mesh.position.set(0, 0.2, 0.62 * v.facing);
    faceGroup(group, v.facing);
    const e: StackEntry = {
      group,
      figures,
      base,
      label,
      view: v,
      shownAnchor: v.anchor,
      prevAnchor: v.anchor,
      locked: 0,
      snapIn: 0,
      hideIn: 0,
      key: `${v.body}|${v.upgraded}|${this.figureCount(v)}|${v.side}|${v.creatureId ?? ''}`,
      pendingRigs: null,
    };
    group.position.copyFrom(this.groupPosition(v.anchor, v.footprint, v.facing));
    this.requestModels(e);
    return e;
  }

  /** Replace the stack's proxies with GLB rigs when a model is registered (async; proxies stay on failure). */
  private requestModels(e: StackEntry): void {
    const entry = e.view.creatureId ? unitModelFor(e.view.creatureId) : undefined;
    if (!entry) return;
    const key = e.key;
    void Promise.all(e.figures.map(() => this.models.instantiate(entry))).then((results) => {
      const rigs = results.flatMap((r) => (r.ok ? [r.rig] : []));
      const current = this.stacks.get(e.view.id);
      if (rigs.length !== results.length || current !== e || e.key !== key || this.disposed) {
        for (const r of rigs) r.dispose();
        return;
      }
      e.pendingRigs = rigs;
      if (e.locked === 0) this.applyRigs(e);
    });
  }

  private applyRigs(e: StackEntry): void {
    const rigs = e.pendingRigs;
    if (!rigs) return;
    e.pendingRigs = null;
    e.figures = e.figures.map((f, i) => {
      const rig = rigs[i]!;
      const wrap = f.proxy.root.parent as TransformNode;
      disposeProxy(f.proxy);
      // Scale on an intermediate node: figure resets restore the rig root to scale 1.
      const scaler = new TransformNode(`model-scale-${e.view.id}-${i}`, this.scene);
      scaler.parent = wrap;
      scaler.scaling.setAll(BATTLE_MODEL_SCALE);
      rig.root.parent = scaler;
      const strike = new TransformNode(`strike-${e.view.id}-${i}`, this.scene);
      strike.parent = rig.root;
      rig.loop('idle');
      return { proxy: { root: rig.root, meshes: rig.meshes, strike, shield: null, height: rig.height }, rig, base: f.base, seed: f.seed };
    });
  }

  private disposeStack(e: StackEntry): void {
    for (const r of e.pendingRigs ?? []) r.dispose();
    e.pendingRigs = null;
    for (const f of e.figures) {
      if (f.rig) f.rig.dispose();
      else disposeProxy(f.proxy);
    }
    e.label.dispose();
    e.group.dispose(false, false);
  }

  private syncStacks(views: readonly BattleStackView[]): void {
    const seen = new Set<string>();
    let active: StackEntry | null = null;
    for (const v of views) {
      seen.add(v.id);
      let e = this.stacks.get(v.id);
      const key = `${v.body}|${v.upgraded}|${this.figureCount(v)}|${v.side}|${v.creatureId ?? ''}`;
      if (e && e.key !== key && e.locked === 0 && v.alive) {
        this.disposeStack(e);
        e = undefined;
      }
      if (!e) {
        e = this.createStack(v);
        this.stacks.set(v.id, e);
        e.group.setEnabled(v.alive);
      }
      const moved = e.view.anchor.col !== v.anchor.col || e.view.anchor.row !== v.anchor.row;
      if (moved) {
        e.prevAnchor = e.view.anchor;
        if (e.locked === 0) e.snapIn = 3;
      }
      if (!v.alive && e.view.alive && e.locked === 0) e.hideIn = 3;
      if (v.alive) e.group.setEnabled(true);
      e.view = v;
      e.label.set(v.label, v.labelColor);
      e.label.mesh.isVisible = v.alive;
      if (v.active && v.alive) active = e;
    }
    for (const [id, e] of this.stacks) {
      if (!seen.has(id)) {
        this.disposeStack(e);
        this.stacks.delete(id);
      }
    }
    this.activeStack = active;
  }

  private activeStack: StackEntry | null = null;

  update(view: BattleView): void {
    const bk = `${view.battleId}|${view.obstacles.length}|${view.siege?.moat.length ?? -1}|${view.siege?.structures.length ?? -1}`;
    if (bk !== this.boardKey) {
      for (const e of this.stacks.values()) this.disposeStack(e);
      this.stacks.clear();
      this.buildBoard(view);
      this.boardKey = bk;
      this.shownHp.clear();
      this.structureKey = '';
    }
    this.siegeView = view.siege;
    const sk = view.siege ? view.siege.structures.map((x) => `${x.id}:${x.hp}`).join('|') : '';
    if (sk !== this.structureKey) {
      const first = this.structureKey === '';
      this.structureKey = sk;
      if (first) this.syncStructures();
      else if (this.structuresLocked === 0) this.structureSnapIn = 3;
    }
    if (this.grid) this.grid.isVisible = view.grid;
    if (view.highlightKey !== this.highlightKey) {
      this.buildHighlights(view);
      this.highlightKey = view.highlightKey;
    }
    this.syncStacks(view.stacks);
  }

  // ------------------------------------------------------------------ siege structures

  /** Where a structure stands in the world (the keep sits beyond the east edge). */
  private structurePos(st: SiegeStructureView): Vector3 {
    if (st.cells.length === 0) {
      const w = cellWorld({ col: this.cols, row: 5 }, R);
      return new Vector3(w.x + 1.1, 0, w.z);
    }
    let x = 0;
    let z = 0;
    for (const c of st.cells) {
      const w = cellWorld(c, R);
      x += w.x;
      z += w.z;
    }
    return new Vector3(x / st.cells.length, 0, z / st.cells.length);
  }

  private structureTop(st: SiegeStructureView): Vector3 {
    const h = st.kind === 'keep' ? 3 : st.kind === 'tower' ? 2.6 : st.kind === 'gate' ? 1.4 : 1.7;
    return this.structurePos(st).add(new Vector3(0, h, 0));
  }

  /** Draw every structure at its shown HP (intact, damaged or rubble). */
  private syncStructures(): void {
    const view = this.siegeView;
    for (const st of view?.structures ?? []) if (this.structuresLocked === 0 || !this.shownHp.has(st.id)) this.shownHp.set(st.id, st.hp);
    this.drawStructures();
  }

  private drawStructures(): void {
    this.structureRoot?.dispose();
    for (const l of this.structureLabels) l.dispose();
    this.structureLabels = [];
    this.structureRoot = null;
    const view = this.siegeView;
    if (!view || view.structures.length === 0) return;
    const root = new TransformNode('siege', this.scene);
    this.structureRoot = root;
    const stone = this.mats.get('#b9ae96');
    const stoneDark = this.mats.get('#8a8070');
    const rubble = this.mats.get('#6f675b');
    const wood = this.mats.get('#7a5230');
    const roof = this.mats.get('#8c3b2a');
    for (const st of view.structures) {
      const hp = this.shownHp.get(st.id) ?? st.hp;
      const frac = st.maxHp > 0 ? hp / st.maxHp : 0;
      const destroyed = hp <= 0;
      const add = (m: Mesh, x: number, y: number, z: number) => {
        m.parent = root;
        m.position.set(x, y, z);
        m.isPickable = false;
      };
      if (st.kind === 'keep') {
        const p = this.structurePos(st);
        const h = destroyed ? 0.5 : 2.2 + 0.8 * frac;
        const body = MeshBuilder.CreateBox(`keep`, { width: 2, depth: 3.2, height: h }, this.scene);
        body.material = destroyed ? rubble : stone;
        add(body, p.x, h / 2, p.z);
        if (!destroyed) {
          const top = MeshBuilder.CreateCylinder('keep-roof', { height: 0.9, diameterTop: 0, diameterBottom: 2.2, tessellation: 4 }, this.scene);
          top.material = roof;
          add(top, p.x, h + 0.45, p.z);
        }
      } else {
        for (const c of st.cells) {
          const w = cellWorld(c, R);
          if (st.kind === 'tower') {
            const h = destroyed ? 0.4 : 1.8 + 0.8 * frac;
            const t = MeshBuilder.CreateCylinder(`tower-${st.id}`, { height: h, diameter: 1.35, tessellation: 12 }, this.scene);
            t.material = destroyed ? rubble : stoneDark;
            add(t, w.x, h / 2, w.z);
            if (!destroyed) {
              const cap = MeshBuilder.CreateCylinder(`tower-cap-${st.id}`, { height: 0.8, diameterTop: 0, diameterBottom: 1.6, tessellation: 12 }, this.scene);
              cap.material = roof;
              add(cap, w.x, h + 0.4, w.z);
            }
          } else if (st.kind === 'gate') {
            const h = destroyed ? 0.15 : 0.9 + 0.5 * frac;
            const g = MeshBuilder.CreateBox(`gate`, { width: 0.5, depth: 1.3, height: h }, this.scene);
            g.material = destroyed ? rubble : wood;
            add(g, w.x, h / 2, w.z);
            if (!destroyed) {
              for (const dz of [-0.78, 0.78]) {
                const post = MeshBuilder.CreateBox('gate-post', { width: 0.8, depth: 0.3, height: 1.9 }, this.scene);
                post.material = stone;
                add(post, w.x, 0.95, w.z + dz);
              }
            }
          } else {
            const h = destroyed ? 0.3 : 1.0 + 0.7 * frac;
            const wall = MeshBuilder.CreateBox(`wall-${st.id}`, { width: 0.85, depth: 1.62, height: h }, this.scene);
            wall.material = destroyed ? rubble : frac < 1 ? stoneDark : stone;
            add(wall, w.x, h / 2, w.z);
            if (!destroyed) {
              for (const dz of [-0.5, 0, 0.5]) {
                const m = MeshBuilder.CreateBox('merlon', { width: 0.85, depth: 0.28, height: 0.28 }, this.scene);
                m.material = wall.material;
                add(m, w.x, h + 0.14, w.z + dz);
              }
            }
          }
        }
      }
      if (!destroyed) {
        const lbl = createLabel(this.scene, `st-${st.id}`, `${hp}/${st.maxHp}`, { worldWidth: 0.7, width: 192, height: 80 });
        lbl.mesh.position.copyFrom(this.structureTop(st).add(new Vector3(0, 0.45, 0)));
        this.structureLabels.push(lbl);
      }
    }
  }

  private structureById(id: string): SiegeStructureView | undefined {
    return this.siegeView?.structures.find((s) => s.id === id);
  }

  // ------------------------------------------------------------------ playback

  private floatText(at: Vector3, text: string, color: string, speed: number): Promise<void> {
    const lbl = createLabel(this.scene, `float-${this.time}-${text}`, text, { background: null, worldWidth: 1.5, width: 320, height: 96, color, font: '700 60px Inter, sans-serif' });
    lbl.mesh.position.copyFrom(at);
    lbl.mesh.renderingGroupId = 2;
    const tw = new TweenPlayer();
    tw.speed = speed;
    this.extraTweens.push(tw);
    return tw
      .tween(
        900,
        (t) => {
          lbl.mesh.position.y = at.y + t * 0.9;
          lbl.mesh.visibility = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        },
        linear,
      )
      .then(() => {
        lbl.dispose();
        this.extraTweens = this.extraTweens.filter((x) => x !== tw);
      });
  }

  private extraTweens: TweenPlayer[] = [];

  private async projectile(from: Vector3, to: Vector3, color: string): Promise<void> {
    const p = MeshBuilder.CreateCylinder('proj', { height: 0.5, diameter: 0.05, tessellation: 5 }, this.scene);
    p.material = this.mats.get(color, { emissive: 0.6 });
    p.isPickable = false;
    const dist = Vector3.Distance(from, to);
    await this.tweens.tween(
      Math.max(220, dist * 45),
      (t) => {
        const x = from.x + (to.x - from.x) * t;
        const z = from.z + (to.z - from.z) * t;
        const y = from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * Math.min(2.2, dist * 0.18);
        p.position.set(x, y, z);
        const dy = Math.cos(t * Math.PI) * Math.min(2.2, dist * 0.18) * Math.PI;
        p.rotation.z = Math.atan2(dy, dist) - Math.PI / 2;
        p.rotation.y = Math.atan2(-(to.z - from.z), to.x - from.x);
      },
      linear,
    );
    p.dispose();
  }

  private async spellColumn(at: Vector3, color: string): Promise<void> {
    const c = MeshBuilder.CreateCylinder('spell', { height: 4, diameterTop: 0.2, diameterBottom: 1.1, tessellation: 16 }, this.scene);
    c.material = this.mats.get(color, { emissive: 1, alpha: 0.45 });
    c.isPickable = false;
    c.position.set(at.x, 2, at.z);
    await this.tweens.tween(520, (t) => {
      c.scaling.set(1 - t * 0.4, 1, 1 - t * 0.4);
      c.visibility = t < 0.5 ? t * 2 : 2 - t * 2;
    });
    c.dispose();
  }

  private lock(e: StackEntry | undefined): void {
    if (!e) return;
    e.locked += 1;
    e.snapIn = 0;
    e.hideIn = 0;
  }

  private unlock(e: StackEntry | undefined): void {
    if (!e) return;
    e.locked = Math.max(0, e.locked - 1);
    if (e.locked === 0) {
      this.applyRigs(e);
      this.snap(e);
    }
  }

  private snap(e: StackEntry): void {
    e.group.position.copyFrom(this.groupPosition(e.view.anchor, e.view.footprint, e.view.facing));
    faceGroup(e.group, e.view.facing);
    e.shownAnchor = e.view.anchor;
    e.group.setEnabled(e.view.alive);
    for (const f of e.figures) restFigure(f);
  }

  private headOf(e: StackEntry): Vector3 {
    return e.group.position.add(new Vector3(0, 1.3, 0));
  }

  /** Visualize one batch of committed events. Resolves when playback is finished. */
  async play(events: readonly GameEvent[], speed: number): Promise<void> {
    this.tweens.speed = speed;
    const touched = new Set<StackEntry>();
    const lockOnce = (e: StackEntry | undefined) => {
      if (e && !touched.has(e)) {
        touched.add(e);
        this.lock(e);
      }
    };
    let structures = false;
    for (const ev of events) {
      if (ev.kind === 'BattleStackMoved' || ev.kind === 'BattleAttack' || ev.kind === 'BattleStackDestroyed') {
        lockOnce(this.stacks.get(ev.kind === 'BattleAttack' ? ev.attackerId : ev.stackId));
        if (ev.kind === 'BattleAttack') lockOnce(this.stacks.get(ev.targetId));
      } else if (ev.kind === 'SiegeTurretShot' || ev.kind === 'SiegeMoatDamage') {
        lockOnce(this.stacks.get(ev.kind === 'SiegeTurretShot' ? ev.targetId : ev.stackId));
      } else if (ev.kind === 'SiegeStructureDamaged') {
        structures = true;
        if (ev.attackerId) lockOnce(this.stacks.get(ev.attackerId));
      }
    }
    if (structures) {
      this.structuresLocked += 1;
      this.structureSnapIn = 0;
    }
    try {
      for (const ev of events) {
        if (this.tweens.speed === 0) break;
        await this.playEvent(ev, this.tweens.speed);
      }
    } finally {
      for (const e of touched) this.unlock(e);
      if (structures) {
        this.structuresLocked = Math.max(0, this.structuresLocked - 1);
        if (this.structuresLocked === 0) this.syncStructures();
      }
    }
  }

  private cue(kind: BattleCueKind, heavy?: boolean): void {
    try {
      this.cb.onCue?.(heavy === undefined ? { kind } : { kind, heavy });
    } catch {
      // A cosmetic listener must never break playback.
    }
  }

  private async playEvent(ev: GameEvent, speed: number): Promise<void> {
    switch (ev.kind) {
      case 'BattleStackMoved': {
        const e = this.stacks.get(ev.stackId);
        if (!e || ev.path.length === 0) return;
        this.cue(ev.flying ? 'flight' : 'march');
        const v = e.view;
        const start = e.shownAnchor;
        let from = this.groupPosition(start, v.footprint, v.facing);
        for (const f of e.figures) if (f.rig) f.rig.loop(ev.flying && f.rig.has('fly') ? 'fly' : 'move');
        if (ev.flying) {
          const last = ev.path[ev.path.length - 1]!;
          const to = this.groupPosition(last, v.footprint, v.facing);
          const f0 = from.clone();
          const dist = Vector3.Distance(f0, to);
          await this.tweens.tween(Math.max(380, dist * 90), (t) => {
            e.group.position.set(f0.x + (to.x - f0.x) * t, Math.sin(t * Math.PI) * Math.min(2.5, 0.8 + dist * 0.15), f0.z + (to.z - f0.z) * t);
          }, easeInOut);
        } else {
          for (const c of ev.path) {
            const to = this.groupPosition(c, v.footprint, v.facing);
            const f0 = from.clone();
            await this.tweens.tween(
              170,
              (t) => {
                e.group.position.set(f0.x + (to.x - f0.x) * t, Math.abs(Math.sin(t * Math.PI)) * 0.06, f0.z + (to.z - f0.z) * t);
              },
              linear,
            );
            from = to;
          }
        }
        e.shownAnchor = ev.path[ev.path.length - 1]!;
        for (const f of e.figures) f.rig?.loop('idle');
        return;
      }
      case 'BattleAttack': {
        const a = this.stacks.get(ev.attackerId);
        const t = this.stacks.get(ev.targetId);
        if (!a || !t) return;
        const retaliation = ev.mode === 'retaliation';
        const heavy = ev.killed > 0;
        if (ev.mode === 'shot') {
          await Promise.all([
            playState(this.tweens, a.figures, 'ranged'),
            this.tweens.wait(260).then(() => {
              this.cue('shot');
              return this.projectile(this.headOf(a), this.headOf(t).subtract(new Vector3(0, 0.4, 0)), '#d8c08a').then(() => this.cue('arrow-hit', heavy));
            }),
          ]);
        } else {
          this.cue('swing');
          await playState(this.tweens, a.figures, 'melee', retaliation ? 0.85 : 1);
          this.cue('impact', heavy);
        }
        if (ev.targetRemaining <= 0) this.cue('death');
        const text = ev.killed > 0 ? `−${ev.damage} · ${ev.killed} slain` : `−${ev.damage}`;
        const floats = this.floatText(this.headOf(t), ev.luck ? `Lucky! ${text}` : text, ev.luck ? '#f5e4b7' : '#ff8a70', speed);
        await playState(this.tweens, t.figures, ev.targetRemaining > 0 ? 'hit' : 'defeat');
        void floats;
        return;
      }
      case 'BattleSpellCast': {
        const t = this.stacks.get(ev.targetId);
        if (!t) return;
        const heal = ev.healed > 0;
        this.cue(heal ? 'heal' : ev.damage > 0 ? 'spell' : 'bless');
        await this.spellColumn(t.group.position, heal ? '#9be58a' : ev.damage > 0 ? '#7fb2ff' : '#f5e4b7');
        const txt = heal ? `+${ev.healed} HP` : ev.damage > 0 ? `−${ev.damage}` : 'Blessed';
        void this.floatText(this.headOf(t), txt, heal ? '#9be58a' : ev.damage > 0 ? '#9cc4ff' : '#f5e4b7', speed);
        if (ev.damage > 0) await playState(this.tweens, t.figures, 'hit');
        return;
      }
      case 'BattleAbilityUsed': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        this.cue('ward');
        void this.floatText(this.headOf(e), 'Ward!', '#9fe8ff', speed);
        const clip = `ability_${ev.abilityId}` as const;
        const withClip = e.figures.filter((f) => f.rig?.has(clip));
        await Promise.all([
          ...withClip.map(async (f) => {
            await f.rig!.playOnce(clip, this.tweens);
            f.rig!.loop('idle');
          }),
          playState(this.tweens, e.figures.filter((f) => !withClip.includes(f)), 'defend', 0.7),
        ]);
        return;
      }
      case 'BattleStackDefended': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        this.cue('defend');
        void this.floatText(this.headOf(e), 'Defend', '#cfe3ff', speed);
        await playState(this.tweens, e.figures, 'defend', 0.8);
        return;
      }
      case 'BattleStackWaited': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        await this.floatText(this.headOf(e), 'Wait', '#e6d7b0', speed * 0.6);
        return;
      }
      case 'BattleMorale': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        this.cue(ev.positive ? 'morale-up' : 'morale-down');
        await this.floatText(this.headOf(e), ev.positive ? 'Morale! Acts again' : 'Falters — skips turn', ev.positive ? '#f5e4b7' : '#ff9d8a', speed * 0.8);
        return;
      }
      case 'BattleStackDestroyed': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        // The defeat pose already played on the killing blow; finish hiding.
        await this.tweens.wait(120);
        e.group.setEnabled(false);
        // Remember the death even if no newer view arrives (the battle's final
        // blow: the rules have already cleared the battle), so unlocking the
        // stack after playback does not show it again.
        e.view = { ...e.view, alive: false };
        e.label.mesh.isVisible = false;
        return;
      }
      case 'SiegeStructureDamaged': {
        const st = this.structureById(ev.structureId);
        if (!st) return;
        const to = this.structureTop(st).subtract(new Vector3(0, 0.4, 0));
        if (ev.source === 'catapult') {
          const from = new Vector3(cellWorld({ col: 0, row: 5 }, R).x - 3, 0.8, to.z);
          this.cue('catapult');
          await this.projectile(from, to, '#8f8676');
        } else {
          const a = ev.attackerId ? this.stacks.get(ev.attackerId) : undefined;
          if (a)
            await Promise.all([
              playState(this.tweens, a.figures, 'ranged'),
              this.tweens.wait(260).then(() => {
                this.cue('shot');
                return this.projectile(this.headOf(a), to, '#8f8676');
              }),
            ]);
        }
        this.cue('stone-hit');
        this.shownHp.set(st.id, ev.hp);
        this.drawStructures();
        void this.floatText(to.add(new Vector3(0, 0.6, 0)), ev.source === 'catapult' ? 'Catapult −1' : '−1', '#f0c27a', speed);
        return;
      }
      case 'SiegeStructureDestroyed': {
        const st = this.structureById(ev.structureId);
        if (!st) return;
        this.cue('breach');
        await this.floatText(this.structureTop(st), st.kind === 'wall' || st.kind === 'gate' ? 'Breach!' : 'Destroyed', '#ffcf8a', speed * 0.8);
        return;
      }
      case 'SiegeTurretShot': {
        const st = this.structureById(ev.structureId);
        const t = this.stacks.get(ev.targetId);
        if (!st || !t) return;
        this.cue('turret');
        await this.projectile(this.structureTop(st), this.headOf(t).subtract(new Vector3(0, 0.4, 0)), '#d8c08a');
        this.cue('arrow-hit', ev.killed > 0);
        void this.floatText(this.headOf(t), ev.killed > 0 ? `−${ev.damage} · ${ev.killed} slain` : `−${ev.damage}`, '#ff8a70', speed);
        await playState(this.tweens, t.figures, ev.targetRemaining > 0 ? 'hit' : 'defeat');
        return;
      }
      case 'SiegeMoatDamage': {
        const t = this.stacks.get(ev.stackId);
        if (!t) return;
        this.cue('moat');
        void this.floatText(this.headOf(t), `Moat −${ev.damage}`, '#9cc4ff', speed);
        await playState(this.tweens, t.figures, ev.targetRemaining > 0 ? 'hit' : 'defeat');
        return;
      }
      case 'BattleStackShapeshifted': {
        this.cue('shapeshift');
        return;
      }
      case 'BattleCasualtiesRecovered': {
        this.cue('recovery');
        return;
      }
      case 'BattleEnded': {
        const winners = [...this.stacks.values()].filter((e) => e.view.side === ev.winner && e.view.alive);
        await Promise.all(winners.map((e) => playState(this.tweens, e.figures, 'victory')));
        return;
      }
      default:
        return;
    }
  }

  // ------------------------------------------------------------------ input

  private cellAt(x: number, y: number): { cell: BattleCell; offset: { x: number; z: number } } | null {
    const p = pickGround(this.scene, this.camera, x, y, 0);
    if (!p) return null;
    const c = worldCell(p.x, p.z, R);
    if (c.col < 0 || c.row < 0 || c.col >= this.cols || c.row >= this.rows) return null;
    const w = cellWorld(c, R);
    return { cell: c, offset: { x: p.x - w.x, z: p.z - w.z } };
  }

  private onPointer(p: PointerInfo): void {
    const x = this.scene.pointerX;
    const y = this.scene.pointerY;
    if (p.type === PointerEventTypes.POINTERMOVE) {
      const hit = this.cellAt(x, y);
      const key = hit ? `${hit.cell.col}:${hit.cell.row}:${Math.sign(hit.offset.x)}:${Math.sign(hit.offset.z)}:${Math.round(Math.atan2(hit.offset.z, hit.offset.x) / (Math.PI / 3))}` : '';
      if (key !== this.lastHover) {
        this.lastHover = key;
        if (hit) {
          const w = cellWorld(hit.cell, R);
          this.hover.position.set(w.x, 0.03, w.z);
          this.hover.isVisible = true;
        } else this.hover.isVisible = false;
        this.cb.onCellHover(hit?.cell ?? null, hit?.offset ?? { x: 0, z: 0 });
      }
    } else if (p.type === PointerEventTypes.POINTERUP) {
      const hit = this.cellAt(x, y);
      if (hit) this.cb.onCellClick(hit.cell, (p.event as PointerEvent).button, hit.offset);
    }
  }

  /** Screen position (CSS pixels within the canvas) of a battle cell center — read-only. */
  projectCell(c: BattleCell): { x: number; y: number } | null {
    const w = cellWorld(c, R);
    return projectPoint(this.scene, this.camera, new Vector3(w.x, 0, w.z));
  }

  // ------------------------------------------------------------------ frame

  tick(dt: number): void {
    this.time += dt;
    this.tweens.tick(dt);
    if (this.structureSnapIn > 0 && --this.structureSnapIn === 0 && this.structuresLocked === 0) this.syncStructures();
    for (const tw of this.extraTweens) tw.tick(dt);
    for (const e of this.stacks.values()) {
      if (e.locked === 0) {
        if (e.snapIn > 0 && --e.snapIn === 0) this.snap(e);
        if (e.hideIn > 0 && --e.hideIn === 0) e.group.setEnabled(e.view.alive);
        if (e.view.alive) for (const f of e.figures) applyIdle(f, this.time);
      }
    }
    const a = this.activeStack;
    if (a && a.locked === 0 && a.view.alive) {
      this.activeRing.position.set(a.group.position.x, 0.06, a.group.position.z);
      this.activeRing.scaling.x = a.view.footprint === 2 ? 1.6 : 1;
      this.activeRing.rotation.y = this.time / 700;
      this.activeRing.isVisible = true;
    } else this.activeRing.isVisible = false;
  }

  get busy(): boolean {
    return this.tweens.busy;
  }

  /** Finish any running playback immediately (skip). */
  skip(): void {
    this.tweens.speed = 0;
    this.tweens.flush();
    for (const tw of this.extraTweens) tw.flush();
  }

  private disposed = false;

  dispose(): void {
    this.disposed = true;
    this.skip();
    this.models.dispose();
    for (const l of this.structureLabels) l.dispose();
    if (this.pointerObs) this.scene.onPointerObservable.remove(this.pointerObs);
    this.mats.dispose();
    this.scene.dispose();
  }
}
