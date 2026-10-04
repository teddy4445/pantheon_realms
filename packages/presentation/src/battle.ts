/**
 * BattleSceneController (S11): the tactical battle in 2D —
 *
 *   painted battlefield background
 *   + logical hex overlay (cells, deployment zone, moat, town side, grid)
 *   + highlights (moves, targets, route, attack side, hover, active stack)
 *   + obstacle and siege sprites, creature stacks (depth-sorted)
 *   + projectiles and spell/combat effects, floating numbers
 *   (+ the React battle HUD around the canvas).
 *
 * All outcomes (damage, kills, destruction) are already committed by the rules
 * before playback starts; this controller only visualises GameEvents. Instant
 * playback (speed 0) completes synchronously and cannot change any result.
 * Creature sprites face right; the defending side is mirrored.
 */
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { BattleCell, GameEvent } from '@pr/rules';
import type { EngineHost, SceneController } from './engineHost';
import { BATTLE_SQUASH, SQRT3, cellPoint, hexPolygon, pointCell } from './hexmath';
import { tileNoise } from './palette';
import { TweenPlayer, easeInOut, easeOut, linear } from './tween';
import { BATTLEFIELD_LAYOUT, battlefieldArt } from './environmentArt';
import { graphicsProfile } from './graphics';
import { SpriteFigure } from './figure';
import { creatureSprites, spriteManifest, type EffectDefinition, type StaticSpriteDefinition } from './sprites';
import { loadStrip, loadTexture } from './textures';
import { colorOf, groundShadow, stillHeight, stillSprite } from './staticSprites';
import { FxPainter, StatusAura, type FxTarget } from './fx';
import type { FxLook, FxSound, StatusOverlay } from './fxLooks';

/** Hex radius in board pixels before the fit-to-view scale. */
const RB = 40;
const S = BATTLE_SQUASH;
const HEX_W = SQRT3 * RB;

export interface BattleStackView {
  readonly id: string;
  /** Creature ID: selects the creature's sprite set. */
  readonly creatureId?: string;
  readonly side: 'attacker' | 'defender';
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
  /** Status overlays to show on the stack (fxLooks.statusOverlays of its statuses). */
  readonly statuses?: readonly StatusOverlay[];
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
  /** Reduced motion: status overlays hold still. */
  readonly calm?: boolean;
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
  | 'cast'
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
  /** Spells and miracles: the sound family of their look (`magic.<sound>`). */
  readonly magic?: FxSound;
}

/** How a battle spell looks (fxLooks.spellLook), with the word shown when it neither hurts nor heals. */
export interface BattleSpellFx extends FxLook {
  readonly label?: string;
  /** Aimed at the enemy (its word is shown in the curse colour). */
  readonly hostile?: boolean;
}

/** How a battle miracle looks, which side invoked it and what it did. */
export interface BattleMiracleFx {
  readonly look: FxLook;
  readonly side: 'attacker' | 'defender';
  /** A smite's damage. */
  readonly damage?: number;
  /** The word shown over the army (status miracles). */
  readonly label?: string;
}

export interface BattleCallbacks {
  /** `offset`: pointer position inside the cell, in hex radii (x right, y down, foreshortened like the board). */
  onCellClick(c: BattleCell, button: number, offset: { x: number; y: number }): void;
  onCellHover(c: BattleCell | null, offset: { x: number; y: number }): void;
  /** Optional: presentation cues timed with playback (sound). */
  onCue?(cue: BattleCue): void;
  /** Optional: how a spell looks (default: from its damage/heal numbers). */
  spellFx?(spellId: string): BattleSpellFx | null;
  /** Optional: how a divine intervention looks in this battle (null: not shown). */
  miracleFx?(interventionId: string, playerId: string): BattleMiracleFx | null;
}

interface StackEntry {
  root: Container;
  figure: SpriteFigure;
  base: Graphics;
  /** Count badge: drawn on its own layer above every figure (large final sprites would cover it), following `root`. */
  badge: Container;
  badgeText: Text;
  badgeBg: Graphics;
  badgeOffset: { x: number; y: number };
  view: BattleStackView;
  shownAnchor: BattleCell;
  prevAnchor: BattleCell;
  locked: number;
  snapIn: number;
  key: string;
  seed: number;
  /** The fallen lie where they died (owner request 2026-10-03). */
  down: boolean;
  /** Status overlays: drawn, and the set currently shown (it follows the view after spell playback). */
  aura: StatusAura;
  shownStatuses: readonly StatusOverlay[];
  /** Frames until a status change from a newer view is shown (lets playback claim it first). */
  auraDelay: number;
  /** Times the death and hit playback ran (read-only diagnostics). */
  deathPlays: number;
  hitPlays: number;
}

const ARCHETYPE_GROUND: Record<string, string> = {
  coast_road: '#8a8b5c',
  ridge_pass: '#7c7564',
  grove: '#5c7a45',
  plateau: '#6f7270',
  beacon_clearing: '#86844f',
  open_field: '#7e8a4f',
};

/** Obstacle stills per battlefield (manifest `obstacles` IDs); any missing ID falls back to the first that exists. */
const OBSTACLE_KINDS: Record<string, readonly string[]> = {
  coast_road: ['rock', 'boulder', 'log'],
  ridge_pass: ['boulder', 'rock', 'rock'],
  grove: ['tree', 'stump', 'tree'],
  plateau: ['column', 'boulder', 'rock'],
  beacon_clearing: ['stone_circle', 'rock', 'log'],
  open_field: ['rock', 'tree', 'log'],
};

export class BattleSceneController implements SceneController {
  readonly root = new Container();
  readonly tweens = new TweenPlayer();
  private readonly canvas: HTMLCanvasElement;
  private readonly cb: BattleCallbacks;
  private readonly board = new Container();
  private readonly backdrop = new Container();
  private readonly cells = new Graphics();
  private readonly grid = new Graphics();
  private readonly highlight = new Graphics();
  private readonly hover = new Graphics();
  private readonly activeRing = new Graphics();
  private readonly objects = new Container();
  /** Count badges, above every figure so a tall creature in the row in front never hides another stack's count. */
  private readonly badges = new Container();
  private readonly fx = new Container();
  private readonly floats = new Container();
  /** Whole-field moments (screen pixels, over the board). */
  private readonly screenLayer = new Container();
  private readonly painter: FxPainter;
  private calm = false;
  /** A battle heal's total, shown by the miracle that follows it in the same batch. */
  private pendingHeal: { side: string; healed: number } | null = null;
  /** The last magic effects played (asset ID prefixes; read-only diagnostics). */
  private fxLog: string[] = [];
  private boardKey = '';
  private highlightKey = '';
  private stacks = new Map<string, StackEntry>();
  private obstacleSprites: Container[] = [];
  private lastHover = '';
  private time = 0;
  private cols = 15;
  private rows = 11;
  private siegeView: SiegeView | null = null;
  /** Structure HP as currently drawn (playback advances it event by event). */
  private shownHp = new Map<string, number>();
  private structureKey = '';
  private structureSnapIn = 0;
  private structuresLocked = 0;
  private view = { width: 1, height: 1 };
  private fitScale = 1;
  private zoomK = 1;
  private readonly listeners: [string, EventListener][] = [];
  private disposed = false;
  private activeStack: StackEntry | null = null;
  /** Winners cheering after the battle was won (until the screen closes). */
  private celebrating = new Set<StackEntry>();
  private extraTweens: TweenPlayer[] = [];

  constructor(engine: EngineHost, canvas: HTMLCanvasElement, cb: BattleCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    this.objects.sortableChildren = true;
    this.badges.sortableChildren = true;
    this.board.addChild(this.backdrop, this.cells, this.grid, this.highlight, this.hover, this.activeRing, this.objects, this.badges, this.fx, this.floats);
    this.root.addChild(this.board, this.screenLayer);
    this.hover.visible = false;
    this.activeRing.visible = false;
    this.view = { width: engine.width, height: engine.height };
    this.painter = new FxPainter(this.fx, this.tweens, RB, S, { layer: this.screenLayer, size: () => this.view });
    const on = (type: string, fn: (e: Event) => void) => {
      canvas.addEventListener(type, fn, { passive: type !== 'wheel' && type !== 'contextmenu' });
      this.listeners.push([type, fn]);
    };
    on('pointermove', (e) => this.onMove(e as PointerEvent));
    on('pointerup', (e) => this.onUp(e as PointerEvent));
    on('pointerleave', () => this.onLeave());
    on('wheel', (e) => this.onWheel(e as WheelEvent));
    on('contextmenu', (e) => e.preventDefault());
  }

  // ------------------------------------------------------------------ layout

  resize(width: number, height: number): void {
    this.view = { width, height };
    this.layout();
  }

  /** Board extent in board pixels: the cells plus headroom above the top row for tall creatures. */
  private boardRect(): { x0: number; y0: number; x1: number; y1: number } {
    const last = cellPoint({ col: this.cols - 1, row: 1 }, RB, S);
    const bottom = cellPoint({ col: 0, row: this.rows - 1 }, RB, S);
    return { x0: -HEX_W / 2, y0: -RB * S - RB * 1.6, x1: last.x + HEX_W / 2, y1: bottom.y + RB * S + RB * 0.35 };
  }

  /** Screen margins kept clear for the battle HUD (top bar and turn order, bottom action bar). */
  private insets = { top: 112, bottom: 82, left: 16, right: 16 };

  /** The interface tells the view how much of the canvas its HUD covers (CSS pixels). */
  setInsets(i: { top: number; bottom: number; left: number; right: number }): void {
    this.insets = i;
    this.layout();
  }

  private layout(): void {
    const b = this.boardRect();
    const { width, height } = this.view;
    const ins = this.insets;
    const w = Math.max(100, width - ins.left - ins.right);
    const h = Math.max(100, height - ins.top - ins.bottom);
    const k = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0));
    this.fitScale = Math.max(0.2, k);
    const z = this.fitScale * this.zoomK;
    this.board.scale.set(z);
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    this.board.position.set(Math.round(ins.left + w / 2 - cx * z), Math.round(ins.top + h / 2 - cy * z));
  }

  // ------------------------------------------------------------------ board

  private cellXY(c: BattleCell): { x: number; y: number } {
    return cellPoint(c, RB, S);
  }

  /**
   * The painted battlefield (Brief 2, §6.0): one painting, foreshortened like the
   * board, with the 15 × 11 board fitted inside its quiet centre (about
   * 1500 × 1000 of 4096 × 3200 px). Image top = the far side of the field.
   */
  private buildBackdrop(view: BattleView): void {
    for (const c of this.backdrop.removeChildren()) c.destroy();
    const ground = colorOf(ARCHETYPE_GROUND[view.archetype] ?? '#7e8a4f');
    const plain = new Graphics().rect(-4000, -3000, 9000, 7000).fill({ color: ground });
    this.backdrop.addChild(plain);
    const art = graphicsProfile().paintedGround ? battlefieldArt(view.archetype, view.climate) : null;
    if (!art) return;
    const first = this.cellXY({ col: 0, row: 0 });
    const last = this.cellXY({ col: view.cols - 1, row: view.rows - 1 });
    const minX = first.x - RB;
    const maxX = this.cellXY({ col: view.cols - 1, row: 1 }).x + RB;
    const minY = first.y - RB * S;
    const maxY = last.y + RB * S;
    const L = BATTLEFIELD_LAYOUT;
    // Board pixels per layout pixel: the board fits the quiet centre in both directions (rows foreshortened).
    const unit = Math.max((maxX - minX) / L.centreWidth, (maxY - minY) / S / L.centreHeight);
    const w = L.width * unit;
    const h = L.height * unit * S;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const battleId = view.battleId;
    if (art.edge) plain.tint = colorOf(art.edge);
    void loadTexture(art.url).then(
      (tex) => {
        if (this.disposed || !this.boardKey.startsWith(battleId)) return;
        const s = new Sprite(tex);
        s.width = w;
        s.height = h;
        s.position.set(cx - w / 2, cy - h / 2);
        this.backdrop.addChild(s);
      },
      () => undefined,
    );
  }

  private buildBoard(view: BattleView): void {
    this.cols = view.cols;
    this.rows = view.rows;
    this.layout();
    this.buildBackdrop(view);
    const moat = new Set((view.siege?.moat ?? []).map((c) => `${c.col}:${c.row}`));
    const painted = graphicsProfile().paintedGround && !!battlefieldArt(view.archetype, view.climate);
    const base = colorOf(ARCHETYPE_GROUND[view.archetype] ?? '#7e8a4f');
    const g = this.cells;
    g.clear();
    this.grid.clear();
    for (let row = 0; row < view.rows; row++) {
      for (let col = 0; col < view.cols; col++) {
        const { x, y } = this.cellXY({ col, row });
        const poly = hexPolygon(x, y, RB * 0.975, S);
        const inMoat = moat.has(`${col}:${row}`);
        const inTown = !!view.siege && view.siege.structures.length > 0 && col > view.siege.wallCol;
        const deploy = col < 2 || col >= view.cols - 2;
        if (inMoat) g.poly(poly).fill({ color: 0x2e5871, alpha: 0.9 });
        else if (inTown) g.poly(poly).fill({ color: 0x8c8474, alpha: painted ? 0.55 : 1 });
        else if (!painted) {
          const n = tileNoise(col * 3 + 1, row * 5 + 2) * 0.045 - (deploy ? 0.03 : 0);
          const r = ((base >> 16) & 255) / 255 + n;
          const gg = ((base >> 8) & 255) / 255 + n;
          const bb = (base & 255) / 255 + n;
          g.poly(poly).fill({ color: (Math.round(Math.max(0, Math.min(1, r)) * 255) << 16) | (Math.round(Math.max(0, Math.min(1, gg)) * 255) << 8) | Math.round(Math.max(0, Math.min(1, bb)) * 255) });
        } else if (deploy) g.poly(poly).fill({ color: 0x000000, alpha: 0.1 });
        this.grid.poly(hexPolygon(x, y, RB * 0.975, S));
      }
    }
    this.grid.stroke({ width: 1.2, color: 0x141a14, alpha: 0.5 });
    // Obstacles: rocks, trees, logs, columns — drawn where the rules placed them.
    for (const o of this.obstacleSprites) o.destroy({ children: true });
    this.obstacleSprites = [];
    const kinds = OBSTACLE_KINDS[view.archetype] ?? OBSTACLE_KINDS['open_field']!;
    const all = spriteManifest().obstacles;
    const anyDef = Object.values(all)[0] ?? null;
    view.obstacles.forEach((c, i) => {
      const kind = kinds[(c.col * 7 + c.row * 3 + i) % kinds.length]!;
      const def: StaticSpriteDefinition | null = all[kind] ?? anyDef;
      const { x, y } = this.cellXY(c);
      const root = new Container();
      root.position.set(x, y + RB * S * 0.35);
      root.zIndex = root.y;
      if (graphicsProfile().shadows) root.addChild(groundShadow(HEX_W * 0.42, HEX_W * 0.16, 0.34));
      const s = stillSprite(def, HEX_W);
      if ((c.col + c.row) % 2 === 1) s.scale.x *= -1;
      root.addChild(s);
      this.objects.addChild(root);
      this.obstacleSprites.push(root);
    });
  }

  private buildHighlights(view: BattleView): void {
    const g = this.highlight;
    g.clear();
    const fill = (cells: readonly BattleCell[], k: number, color: number, alpha: number) => {
      if (!cells.length) return;
      for (const c of cells) {
        const { x, y } = this.cellXY(c);
        g.poly(hexPolygon(x, y, RB * k, S));
      }
      g.fill({ color, alpha });
    };
    fill(view.zone, 0.93, 0xf1d48a, 0.24);
    fill(view.moves, 0.86, 0x4fc3d6, 0.24);
    fill(view.targets, 0.9, 0xe0573f, 0.32);
    if (view.path) {
      for (const c of view.path) {
        const { x, y } = this.cellXY(c);
        g.ellipse(x, y, RB * 0.16, RB * 0.16 * S);
      }
      g.fill({ color: 0x8fe07a, alpha: 0.95 });
    }
    if (view.attackFrom) {
      const { x, y } = this.cellXY(view.attackFrom);
      g.poly(hexPolygon(x, y, RB * 0.7, S)).fill({ color: 0xf1d48a, alpha: 0.45 });
      g.poly(hexPolygon(x, y, RB * 0.52, S)).fill({ color: 0x33332a, alpha: 0.3 });
    }
  }

  // ------------------------------------------------------------------ stacks

  private groupPosition(anchor: BattleCell, footprint: 1 | 2, facing: 1 | -1): { x: number; y: number } {
    const a = this.cellXY(anchor);
    if (footprint === 1) return { x: a.x, y: a.y + RB * S * 0.3 };
    const b = this.cellXY({ col: anchor.col - facing, row: anchor.row });
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + RB * S * 0.3 };
  }

  private place(e: StackEntry, anchor: BattleCell): void {
    const p = this.groupPosition(anchor, e.view.footprint, e.view.facing);
    e.root.position.set(p.x, p.y);
    e.root.zIndex = p.y;
    e.badge.position.set(p.x + e.badgeOffset.x, p.y + e.badgeOffset.y);
  }

  private createStack(v: BattleStackView): StackEntry {
    const root = new Container();
    const w = v.footprint === 2 ? 1.7 : 1;
    if (graphicsProfile().shadows) root.addChild(groundShadow(HEX_W * 0.36 * w, HEX_W * 0.13, 0.36));
    // Side marker under the figure: blue disc (attacker) or red disc with a dark centre (defender) — shape, not only colour.
    const base = new Graphics();
    const sideCol = v.side === 'attacker' ? 0x3b73d9 : 0xb8453a;
    base.ellipse(0, 0, HEX_W * 0.4 * w, HEX_W * 0.4 * S * 0.62).fill({ color: sideCol, alpha: 0.5 }).stroke({ width: 2, color: sideCol, alpha: 0.95 });
    if (v.side === 'defender') base.ellipse(0, 0, HEX_W * 0.22 * w, HEX_W * 0.22 * S * 0.62).fill({ color: 0x14141a, alpha: 0.5 });
    root.addChild(base);
    const aura = new StatusAura(RB, S);
    root.addChild(aura.back);
    const figure = new SpriteFigure({ set: creatureSprites(v.creatureId), hexWidth: HEX_W, accent: colorOf(v.accent) });
    figure.mirror = v.facing === -1;
    root.addChild(figure.view);
    root.addChild(aura.front);
    // Count badge at the front foot.
    const badge = new Container();
    const badgeBg = new Graphics();
    const badgeText = new Text({ text: v.label, style: { fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: '700', fill: v.labelColor } });
    badgeText.anchor.set(0.5);
    badge.addChild(badgeBg, badgeText);
    const badgeOffset = { x: v.facing * HEX_W * 0.34 * w, y: RB * S * 0.28 };
    this.badges.addChild(badge);
    const e: StackEntry = {
      root,
      figure,
      base,
      badge,
      badgeText,
      badgeBg,
      badgeOffset,
      view: v,
      shownAnchor: v.anchor,
      prevAnchor: v.anchor,
      locked: 0,
      snapIn: 0,
      key: `${v.creatureId ?? ''}|${v.side}|${v.footprint}`,
      seed: v.id.length * 1.7 + v.anchor.row,
      down: false,
      aura,
      shownStatuses: [],
      auraDelay: 0,
      deathPlays: 0,
      hitPlays: 0,
    };
    this.setBadge(e, v.label, v.labelColor);
    this.place(e, v.anchor);
    this.objects.addChild(root);
    figure.setLoop('idle');
    // A stack already dead (a battle loaded from a save) lies where it fell.
    if (!v.alive) this.layDown(e);
    else this.applyAura(e);
    return e;
  }

  private setBadge(e: StackEntry, label: string, color: string): void {
    if (e.badgeText.text !== label) e.badgeText.text = label;
    e.badgeText.style.fill = color;
    const w = Math.max(22, e.badgeText.width + 10);
    e.badgeBg.clear();
    e.badgeBg.roundRect(-w / 2, -10, w, 20, 5).fill({ color: e.view.side === 'attacker' ? 0x16284a : 0x4a1a16, alpha: 0.92 }).stroke({ width: 1.2, color: 0xc29a52, alpha: 0.9 });
  }

  /**
   * The fallen stay on the battlefield (owner request 2026-10-03): lying down
   * (their death strip's last frame, or the figure laid on its side), without
   * their side's marker or count; the rules keep their cells taken.
   */
  private layDown(e: StackEntry): void {
    e.down = true;
    e.root.visible = true;
    e.base.visible = false;
    e.badge.visible = false;
    e.figure.rest();
    if (e.figure.has('death')) e.figure.holdLast('death');
    else this.fallenPose(e, 1);
    e.root.zIndex = e.root.y - 2;
    e.shownStatuses = [];
    e.aura.clear();
  }

  /** Show the stack's current statuses (after any spell that set them has played). */
  private applyAura(e: StackEntry): void {
    e.auraDelay = 0;
    e.shownStatuses = e.down || !e.view.alive ? [] : (e.view.statuses ?? []);
    this.refreshAura(e);
  }

  private refreshAura(e: StackEntry): void {
    e.aura.set(e.shownStatuses, Math.max(RB * 0.9, e.figure.height * 0.85), e.view.footprint === 2 ? 1.7 : 1, e.view.facing);
  }

  /** Fallback death pose (no death strip): tipped over backwards and a little dimmed. */
  private fallenPose(e: StackEntry, t: number): void {
    const back = e.view.facing === 1 ? -1 : 1;
    e.figure.pose.rotation = back * t * (Math.PI / 2.2);
    e.figure.pose.y = -t * e.figure.height * 0.12;
    e.figure.pose.alpha = 1 - t * 0.15;
  }

  private disposeStack(e: StackEntry): void {
    e.figure.destroy();
    e.badge.destroy({ children: true });
    e.root.destroy({ children: true });
  }

  private syncStacks(views: readonly BattleStackView[]): void {
    const seen = new Set<string>();
    let active: StackEntry | null = null;
    for (const v of views) {
      seen.add(v.id);
      let e = this.stacks.get(v.id);
      const key = `${v.creatureId ?? ''}|${v.side}|${v.footprint}`;
      if (e && e.key !== key && e.locked === 0 && v.alive) {
        this.disposeStack(e);
        e = undefined;
      }
      if (!e) {
        e = this.createStack(v);
        this.stacks.set(v.id, e);
      }
      const moved = e.view.anchor.col !== v.anchor.col || e.view.anchor.row !== v.anchor.row;
      if (moved) {
        e.prevAnchor = e.view.anchor;
        if (e.locked === 0) e.snapIn = 3;
      }
      const died = !v.alive && e.view.alive;
      const statusesChanged = (v.statuses ?? []).join(',') !== e.shownStatuses.join(',');
      e.view = v;
      if (statusesChanged && e.locked === 0 && e.auraDelay === 0) e.auraDelay = 3;
      this.setBadge(e, v.label, v.labelColor);
      e.badge.visible = v.alive;
      if (v.alive && e.down && e.locked === 0) {
        // Raised again (resurrection-type recovery): stand up.
        e.down = false;
        e.base.visible = true;
        e.figure.rest();
        e.figure.setLoop('idle');
        this.applyAura(e);
      }
      // Died without playback (instant speed): lie down now; otherwise the death playback does it.
      if (died && e.locked === 0) this.layDown(e);
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

  update(view: BattleView): void {
    const bk = `${view.battleId}|${view.obstacles.length}|${view.siege?.moat.length ?? -1}|${view.siege?.structures.length ?? -1}`;
    if (bk !== this.boardKey) {
      for (const e of this.stacks.values()) this.disposeStack(e);
      this.stacks.clear();
      this.boardKey = bk;
      this.buildBoard(view);
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
    this.grid.visible = view.grid;
    this.calm = !!view.calm;
    if (view.highlightKey !== this.highlightKey) {
      this.buildHighlights(view);
      this.highlightKey = view.highlightKey;
    }
    this.syncStacks(view.stacks);
  }

  // ------------------------------------------------------------------ siege structures

  /** Where a structure stands (the keep sits beyond the east edge). */
  private structurePos(st: SiegeStructureView): { x: number; y: number } {
    if (st.cells.length === 0) {
      const w = this.cellXY({ col: this.cols, row: 5 });
      return { x: w.x + RB * 1.1, y: w.y };
    }
    let x = 0;
    let y = 0;
    for (const c of st.cells) {
      const w = this.cellXY(c);
      x += w.x;
      y += w.y;
    }
    return { x: x / st.cells.length, y: y / st.cells.length };
  }

  private structureTop(st: SiegeStructureView): { x: number; y: number } {
    const p = this.structurePos(st);
    const def = this.siegeDef(st, this.shownHp.get(st.id) ?? st.hp);
    return { x: p.x, y: p.y + RB * S * 0.3 - Math.max(RB, stillHeight(def, HEX_W)) };
  }

  private siegeDef(st: SiegeStructureView, hp: number): StaticSpriteDefinition | null {
    const all = spriteManifest().siege;
    const state = hp <= 0 ? 'rubble' : hp < st.maxHp ? 'damaged' : 'intact';
    return all[`${st.kind}.${state}`] ?? all[`${st.kind}.intact`] ?? null;
  }

  /** Draw every structure at its shown HP (intact, damaged or rubble). */
  private syncStructures(): void {
    const view = this.siegeView;
    for (const st of view?.structures ?? []) if (this.structuresLocked === 0 || !this.shownHp.has(st.id)) this.shownHp.set(st.id, st.hp);
    this.drawStructures();
  }

  private drawStructures(): void {
    this.clearStructurePieces();
    const view = this.siegeView;
    if (!view || view.structures.length === 0) return;
    for (const st of view.structures) {
      const hp = this.shownHp.get(st.id) ?? st.hp;
      const def = this.siegeDef(st, hp);
      const spots = st.kind === 'keep' || st.cells.length === 0 ? [this.structurePos(st)] : st.cells.map((c) => this.cellXY(c));
      for (const p of spots) {
        // Pieces join the depth-sorted objects so creatures pass in front and behind correctly.
        const piece = new Container();
        piece.position.set(p.x, p.y + RB * S * 0.3);
        piece.zIndex = piece.y;
        piece.addChild(stillSprite(def, HEX_W, st.kind === 'keep' ? 1.6 : 1));
        this.objects.addChild(piece);
        this.structurePieces.push(piece);
      }
      if (hp > 0) {
        const top = this.structureTop(st);
        const t = new Text({ text: `${hp}/${st.maxHp}`, style: { fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: '700', fill: '#f5e4b7', stroke: { color: '#1a1208', width: 3 } } });
        t.anchor.set(0.5, 1);
        t.position.set(top.x, top.y - 4);
        this.floats.addChild(t);
        this.structureLabels.push(t);
      }
    }
  }

  private structurePieces: Container[] = [];
  private structureLabels: Text[] = [];

  private clearStructurePieces(): void {
    for (const p of this.structurePieces) p.destroy({ children: true });
    for (const l of this.structureLabels) l.destroy();
    this.structurePieces = [];
    this.structureLabels = [];
  }

  private structureById(id: string): SiegeStructureView | undefined {
    return this.siegeView?.structures.find((s) => s.id === id);
  }

  // ------------------------------------------------------------------ playback helpers

  private floatText(at: { x: number; y: number }, text: string, color: string, speed: number): Promise<void> {
    const t = new Text({ text, style: { fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: '700', fill: color, stroke: { color: '#10131a', width: 4 } } });
    t.anchor.set(0.5, 1);
    t.position.set(at.x, at.y);
    this.floats.addChild(t);
    const tw = new TweenPlayer();
    tw.speed = speed;
    this.extraTweens.push(tw);
    return tw
      .tween(
        900,
        (k) => {
          t.y = at.y - k * RB * 0.9;
          t.alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        },
        linear,
      )
      .then(() => {
        t.destroy();
        this.extraTweens = this.extraTweens.filter((x) => x !== tw);
      });
  }

  private headOf(e: StackEntry): { x: number; y: number } {
    return { x: e.root.x, y: e.root.y - Math.max(RB * 0.9, e.figure.height * 0.85) };
  }

  private chestOf(e: StackEntry): { x: number; y: number } {
    return { x: e.root.x, y: e.root.y - Math.max(RB * 0.5, e.figure.height * 0.5) };
  }

  private async projectile(from: { x: number; y: number }, to: { x: number; y: number }, kind: string): Promise<void> {
    const def = spriteManifest().projectiles[kind] ?? null;
    const p = stillSprite(def, HEX_W);
    if (!def) {
      const g = new Graphics().rect(-RB * 0.3, -1.5, RB * 0.6, 3).fill({ color: 0xd8c08a });
      p.addChild(g);
      p.visible = true;
    }
    this.fx.addChild(p);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const arc = Math.min(RB * 2.4, dist * 0.18);
    await this.tweens.tween(
      Math.max(220, (dist / RB) * 45),
      (t) => {
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * arc;
        p.position.set(x, y);
        const dy = (to.y - from.y) - Math.cos(t * Math.PI) * arc * Math.PI;
        p.rotation = Math.atan2(dy, to.x - from.x);
      },
      linear,
    );
    p.destroy();
  }

  /** A one-shot effect strip at a point (a short flash in `flash` colour on Low or when the strip is missing). */
  private async effect(id: string, at: { x: number; y: number }, opts: { flash?: number; scale?: number } = {}): Promise<void> {
    const def: EffectDefinition | undefined = spriteManifest().effects[id];
    const scale = opts.scale ?? 1;
    if (!def || graphicsProfile().effects === 'simple') {
      const g = new Graphics();
      g.ellipse(0, 0, RB * 0.9 * scale, RB * 0.9 * S * scale).fill({ color: opts.flash ?? 0xffffff, alpha: 0.5 });
      g.position.set(at.x, at.y);
      g.blendMode = 'add';
      this.fx.addChild(g);
      await this.tweens.tween(320, (t) => {
        g.alpha = 1 - t;
        g.scale.set(0.6 + t * 0.6);
      });
      g.destroy();
      return;
    }
    const frames = await loadStrip(def).catch(() => null);
    if (!frames || this.disposed) return;
    const s = new Sprite(frames[0] ?? Texture.EMPTY);
    s.anchor.set(def.anchor[0], def.anchor[1]);
    s.scale.set((HEX_W / def.pixelsPerHex) * scale);
    if (def.additive) s.blendMode = 'add';
    s.position.set(at.x, at.y);
    this.fx.addChild(s);
    await this.tweens.tween(
      (frames.length / Math.max(1, def.fps)) * 1000,
      (t) => {
        const i = Math.min(frames.length - 1, Math.floor(t * frames.length));
        s.texture = frames[i]!;
      },
      linear,
    );
    s.destroy();
  }

  private lock(e: StackEntry | undefined): void {
    if (!e) return;
    e.locked += 1;
    e.snapIn = 0;
  }

  private unlock(e: StackEntry | undefined): void {
    if (!e) return;
    e.locked = Math.max(0, e.locked - 1);
    if (e.locked === 0) this.snap(e);
  }

  private snap(e: StackEntry): void {
    this.place(e, e.view.anchor);
    e.figure.mirror = e.view.facing === -1;
    e.shownAnchor = e.view.anchor;
    if (!e.view.alive) {
      if (!e.down) this.layDown(e);
      else e.root.zIndex = e.root.y - 2;
      return;
    }
    e.root.visible = true;
    e.base.visible = true;
    e.badge.visible = true;
    e.figure.rest();
    if (!this.celebrating.has(e)) e.figure.setLoop('idle');
    this.applyAura(e);
  }

  /**
   * Keep the stacks (and fortifications) these events touch as they are drawn
   * now, so a newer view does not show the outcome before its playback. Returns
   * the release. Used by `play`, and by the interface to hold a battle miracle's
   * targets while its painted card is up.
   */
  hold(events: readonly GameEvent[]): () => void {
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
      } else if (ev.kind === 'BattleSpellCast') {
        // The spell's targets keep their old look (and their old statuses) until it lands.
        for (const v of this.victims(this.stacks.get(ev.targetId), this.spellLookOf(ev).scope)) lockOnce(v);
      } else if (ev.kind === 'InterventionInvoked') {
        const m = this.miracleOf(ev.interventionId, ev.playerId);
        if (m) for (const v of this.miracleVictims(m, ev.targetStackId)) lockOnce(v);
      }
    }
    if (structures) {
      this.structuresLocked += 1;
      this.structureSnapIn = 0;
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const e of touched) this.unlock(e);
      if (structures) {
        this.structuresLocked = Math.max(0, this.structuresLocked - 1);
        if (this.structuresLocked === 0) this.syncStructures();
      }
    };
  }

  /** Visualise one batch of committed events. Resolves when playback is finished. */
  async play(events: readonly GameEvent[], speed: number): Promise<void> {
    this.tweens.speed = speed;
    const release = this.hold(events);
    try {
      for (const ev of events) {
        if (this.tweens.speed === 0) break;
        await this.playEvent(ev, this.tweens.speed);
      }
    } finally {
      release();
    }
  }

  private cue(kind: BattleCueKind, heavy?: boolean, magic?: FxSound): void {
    try {
      this.cb.onCue?.({ kind, ...(heavy === undefined ? {} : { heavy }), ...(magic ? { magic } : {}) });
    } catch {
      // A cosmetic listener must never break playback.
    }
  }

  /** Attack choreography: the strip plays while the figure lunges toward the target (further when only a still exists). */
  private async strike(a: StackEntry, toward: StackEntry, name: 'attack' | 'shoot', k = 1): Promise<void> {
    const f = a.figure;
    const own = f.has(name);
    const dir = Math.sign(toward.root.x - a.root.x) || a.view.facing;
    const reach = (own ? 0.16 : 0.34) * HEX_W;
    const lunge = name === 'attack' ? reach : -0.06 * HEX_W;
    const strip = f.playOnce(name, this.tweens, { minMs: 560 * k });
    await this.tweens.tween(200 * k, (t) => (f.pose.x = dir * lunge * t));
    await this.tweens.tween(140 * k, () => undefined, easeOut);
    await this.tweens.tween(220 * k, (t) => (f.pose.x = dir * lunge * (1 - t)));
    await strip;
    f.pose.x = 0;
  }

  /** Being hit: the strip, or a flinch and flash when only a still exists. */
  private async flinch(e: StackEntry): Promise<void> {
    e.hitPlays += 1;
    const f = e.figure;
    const strip = f.playOnce('hit', this.tweens, { minMs: 320 });
    // Recoil away from where the figure faces (it may have turned toward its attacker).
    const back = f.mirror ? 1 : -1;
    const own = f.has('hit');
    await this.tweens.tween(
      320,
      (t) => {
        const kick = Math.sin(t * Math.PI);
        f.pose.x = back * kick * (own ? 0.04 : 0.1) * HEX_W;
        if (!own) {
          f.pose.rotation = back * kick * 0.12;
          f.sprite.alpha = t < 0.5 ? (Math.floor(t * 12) % 2 === 0 ? 0.45 : 1) : 1;
        }
      },
      linear,
    );
    await strip;
    f.rest();
  }

  /**
   * Taking a blow: the hit strip always plays first; only when the stack is
   * destroyed does its death strip follow, once (owner request 2026-10-04).
   */
  private async sufferBlow(e: StackEntry, killed: boolean): Promise<void> {
    if (e.down) return;
    await this.flinch(e);
    if (killed) {
      this.cue('death');
      await this.die(e);
    }
  }

  /** Dying on the killing blow: the death strip held on its last frame, or the fallback fall (never twice). */
  private async die(e: StackEntry): Promise<void> {
    if (e.down) return;
    e.deathPlays += 1;
    const f = e.figure;
    e.badge.visible = false;
    if (f.has('death')) {
      await f.playOnce('death', this.tweens, { hold: true });
    } else {
      await this.tweens.tween(620, (t) => this.fallenPose(e, t));
    }
    e.view = { ...e.view, alive: false };
    this.layDown(e);
  }

  private async cheer(e: StackEntry): Promise<void> {
    const f = e.figure;
    if (f.has('victory')) {
      await f.playOnce('victory', this.tweens);
      f.setLoop('victory');
      return;
    }
    await this.tweens.tween(700, (t) => (f.pose.y = -Math.abs(Math.sin(t * Math.PI * 2)) * RB * 0.35), linear);
    f.pose.y = 0;
  }

  private async playEvent(ev: GameEvent, speed: number): Promise<void> {
    switch (ev.kind) {
      case 'BattleStackMoved': {
        const e = this.stacks.get(ev.stackId);
        if (!e || ev.path.length === 0) return;
        this.cue(ev.flying ? 'flight' : 'march');
        const v = e.view;
        const f = e.figure;
        let from = this.groupPosition(e.shownAnchor, v.footprint, v.facing);
        const last = ev.path[ev.path.length - 1]!;
        const dest = this.groupPosition(last, v.footprint, v.facing);
        f.mirror = dest.x < from.x - 1 ? true : dest.x > from.x + 1 ? false : v.facing === -1;
        if (ev.flying) {
          if (f.has('takeoff')) await f.playOnce('takeoff', this.tweens);
          f.setLoop(f.has('fly') ? 'fly' : 'move');
          const f0 = { ...from };
          const dist = Math.hypot(dest.x - f0.x, dest.y - f0.y);
          const lift = Math.min(RB * 2.6, RB * 0.8 + dist * 0.15);
          await this.tweens.tween(
            Math.max(380, (dist / RB) * 90),
            (t) => {
              e.root.position.set(f0.x + (dest.x - f0.x) * t, f0.y + (dest.y - f0.y) * t);
              e.root.zIndex = e.root.y;
              f.pose.y = -Math.sin(t * Math.PI) * lift;
            },
            easeInOut,
          );
          f.pose.y = 0;
          if (f.has('landing')) await f.playOnce('landing', this.tweens);
        } else {
          f.setLoop('move');
          const bob = !f.has('move');
          for (const c of ev.path) {
            const to = this.groupPosition(c, v.footprint, v.facing);
            const f0 = { ...from };
            await this.tweens.tween(
              170,
              (t) => {
                e.root.position.set(f0.x + (to.x - f0.x) * t, f0.y + (to.y - f0.y) * t);
                e.root.zIndex = e.root.y;
                if (bob) f.pose.y = -Math.abs(Math.sin(t * Math.PI)) * RB * 0.12;
              },
              linear,
            );
            from = to;
          }
          f.pose.y = 0;
        }
        e.shownAnchor = last;
        f.setLoop('idle');
        return;
      }
      case 'BattleAttack': {
        const a = this.stacks.get(ev.attackerId);
        const t = this.stacks.get(ev.targetId);
        if (!a || !t) return;
        const retaliation = ev.mode === 'retaliation';
        const heavy = ev.killed > 0;
        // Both turn to face each other for the exchange (owner request 2026-10-04), then turn back.
        const dx = t.root.x - a.root.x;
        if (Math.abs(dx) > 1) {
          a.figure.mirror = dx < 0;
          if (!t.down) t.figure.mirror = dx > 0;
        }
        if (ev.mode === 'shot') {
          await Promise.all([
            this.strike(a, t, 'shoot'),
            this.tweens.wait(260).then(() => {
              this.cue('shot');
              return this.projectile(this.chestOf(a), this.chestOf(t), 'arrow').then(() => this.cue('arrow-hit', heavy));
            }),
          ]);
        } else {
          this.cue('swing');
          await this.strike(a, t, 'attack', retaliation ? 0.85 : 1);
          this.cue('impact', heavy);
          void this.effect('impact', this.chestOf(t), { flash: 0xfff1c8, scale: 0.8 });
        }
        const text = ev.killed > 0 ? `−${ev.damage} · ${ev.killed} slain` : `−${ev.damage}`;
        void this.floatText(this.headOf(t), ev.luck ? `Lucky! ${text}` : text, ev.luck ? '#f5e4b7' : '#ff8a70', speed);
        await this.sufferBlow(t, ev.targetRemaining <= 0);
        a.figure.mirror = a.view.facing === -1;
        if (!t.down) t.figure.mirror = t.view.facing === -1;
        return;
      }
      case 'BattleSpellCast':
        return this.playSpell(ev, speed);
      case 'BattleStacksHealed':
        this.pendingHeal = { side: ev.side, healed: ev.healed };
        return;
      case 'InterventionInvoked':
        return this.playMiracle(ev, speed);
      case 'BattleAbilityUsed': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        this.cue('ward');
        void this.floatText(this.headOf(e), 'Ward!', '#9fe8ff', speed);
        void this.effect('ward', { x: e.root.x, y: e.root.y }, { flash: 0x9fe8ff });
        if (e.figure.has('ability')) await e.figure.playOnce('ability', this.tweens);
        else await this.defendPose(e, 0.7);
        return;
      }
      case 'BattleStackDefended': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        this.cue('defend');
        void this.floatText(this.headOf(e), 'Defend', '#cfe3ff', speed);
        await this.defendPose(e, 0.8);
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
        void this.effect(ev.positive ? 'morale.up' : 'morale.down', { x: e.root.x, y: e.root.y }, { flash: ev.positive ? 0xf5e4b7 : 0xff9d8a });
        await this.floatText(this.headOf(e), ev.positive ? 'Morale! Acts again' : 'Falters — skips turn', ev.positive ? '#f5e4b7' : '#ff9d8a', speed * 0.8);
        return;
      }
      case 'BattleStackDestroyed': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        // The dying animation played on the killing blow; the body stays where it fell.
        await this.tweens.wait(120);
        // Remember the death even if no newer view arrives (the battle's final
        // blow: the rules have already cleared the battle), so unlocking the
        // stack after playback keeps it lying down.
        e.view = { ...e.view, alive: false };
        if (!e.down) this.layDown(e);
        return;
      }
      case 'SiegeStructureDamaged': {
        const st = this.structureById(ev.structureId);
        if (!st) return;
        const top = this.structureTop(st);
        const to = { x: top.x, y: top.y + RB * 0.4 };
        if (ev.source === 'catapult') {
          const left = this.cellXY({ col: 0, row: 5 });
          this.cue('catapult');
          await this.projectile({ x: left.x - RB * 3, y: left.y - RB }, to, 'stone');
        } else {
          const a = ev.attackerId ? this.stacks.get(ev.attackerId) : undefined;
          if (a)
            await Promise.all([
              a.figure.playOnce(a.figure.has('shoot') ? 'shoot' : 'attack', this.tweens, { minMs: 400 }),
              this.tweens.wait(260).then(() => {
                this.cue('shot');
                return this.projectile(this.chestOf(a), to, 'stone');
              }),
            ]);
        }
        this.cue('stone-hit');
        void this.effect('impact', to, { flash: 0xc8b89a });
        this.shownHp.set(st.id, ev.hp);
        this.drawStructures();
        void this.floatText({ x: to.x, y: to.y - RB * 0.6 }, ev.source === 'catapult' ? 'Catapult −1' : '−1', '#f0c27a', speed);
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
        await this.projectile(this.structureTop(st), this.chestOf(t), 'arrow');
        this.cue('arrow-hit', ev.killed > 0);
        void this.floatText(this.headOf(t), ev.killed > 0 ? `−${ev.damage} · ${ev.killed} slain` : `−${ev.damage}`, '#ff8a70', speed);
        await this.sufferBlow(t, ev.targetRemaining <= 0);
        return;
      }
      case 'SiegeMoatDamage': {
        const t = this.stacks.get(ev.stackId);
        if (!t) return;
        this.cue('moat');
        void this.floatText(this.headOf(t), `Moat −${ev.damage}`, '#9cc4ff', speed);
        await this.sufferBlow(t, ev.targetRemaining <= 0);
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
        // Every surviving creature of the winning side celebrates — once in full, then it
        // keeps cheering until the result screen opens (owner request 2026-10-03).
        const winners = [...this.stacks.values()].filter((e) => e.view.side === ev.winner && e.view.alive);
        for (const e of winners) {
          e.root.visible = true;
          this.place(e, e.view.anchor);
          e.figure.rest();
        }
        await Promise.all(winners.map((e) => this.cheer(e)));
        for (const e of winners) this.celebrating.add(e);
        return;
      }
      default:
        return;
    }
  }

  // ------------------------------------------------------------------ magic

  private spellLookOf(ev: { spellId: string; damage: number; healed: number }): BattleSpellFx {
    let look: BattleSpellFx | null = null;
    try {
      look = this.cb.spellFx?.(ev.spellId) ?? null;
    } catch {
      look = null;
    }
    if (look) return look;
    const heal = ev.healed > 0;
    const hurt = ev.damage > 0;
    return { school: heal ? 'heal' : hurt ? 'strike' : 'bless', travel: hurt ? 'bolt' : 'none', impact: heal ? 'heal' : hurt ? 'sparks' : 'glyph', screen: 'none', scope: 'single', sound: heal ? 'heal' : hurt ? 'strike' : 'bless' };
  }

  private miracleOf(interventionId: string, playerId: string): BattleMiracleFx | null {
    try {
      return this.cb.miracleFx?.(interventionId, playerId) ?? null;
    } catch {
      return null;
    }
  }

  /** The cells a stack stands on, in unsquashed board pixels (neighbours are exactly one hex width apart). */
  private flatCells(e: StackEntry): { x: number; y: number }[] {
    const a = e.view.anchor;
    const cells = e.view.footprint === 2 ? [a, { col: a.col - e.view.facing, row: a.row }] : [a];
    return cells.map((c) => cellPoint(c, RB, 1));
  }

  /** Who a spell lands on: the target; the target and the stacks of its side beside it; or that whole side. */
  private victims(target: StackEntry | undefined, scope: FxLook['scope']): StackEntry[] {
    if (!target) return [];
    if (scope === 'single') return [target];
    const side = [...this.stacks.values()].filter((e) => e !== target && e.view.side === target.view.side && !e.down);
    if (scope === 'army') return [target, ...side.sort((a, b) => a.root.x - b.root.x)];
    const mine = this.flatCells(target);
    return [target, ...side.filter((e) => this.flatCells(e).some((p) => mine.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < HEX_W * 1.1)))];
  }

  private miracleVictims(m: BattleMiracleFx, targetId: string | null): StackEntry[] {
    const t = targetId ? this.stacks.get(targetId) : undefined;
    if (t) return this.victims(t, m.look.scope === 'army' ? 'army' : 'single');
    return [...this.stacks.values()].filter((e) => e.view.side === m.side && !e.down).sort((a, b) => a.root.x - b.root.x);
  }

  /** Where a side's commander casts from: its banner corner above the far end of its deployment edge. */
  private casterPoint(side: 'attacker' | 'defender'): { x: number; y: number } {
    const c = this.cellXY({ col: side === 'attacker' ? 0 : this.cols - 1, row: 0 });
    return { x: c.x + (side === 'attacker' ? -RB * 0.4 : RB * 0.4), y: c.y - RB * 1.25 };
  }

  private targetOf(e: StackEntry): FxTarget {
    return { x: e.root.x, y: e.root.y, height: Math.max(RB * 0.9, e.figure.height * 0.85), width: e.view.footprint === 2 ? 1.7 : 1, facing: e.view.facing };
  }

  private logFx(id: string): void {
    this.fxLog = [...this.fxLog.slice(-19), id];
  }

  /** A battle spell: the sigil at the commander's corner, its flight, where it lands on each stack it touches, then the numbers. */
  private async playSpell(ev: Extract<GameEvent, { kind: 'BattleSpellCast' }>, speed: number): Promise<void> {
    const t = this.stacks.get(ev.targetId);
    if (!t) return;
    const look = this.spellLookOf(ev);
    const id = `fx.spell.${ev.spellId}`;
    this.logFx(id);
    const victims = this.victims(t, look.scope);
    const dir = ev.side === 'attacker' ? 1 : -1;
    const from = this.casterPoint(ev.side);
    this.cue('cast');
    await this.painter.cast(look, from, `${id}.cast`);
    const screen = this.painter.screenFx(look.screen, look.school, dir, `${id}.screen`);
    if (look.travel !== 'none' && look.travel !== 'sky' && look.scope !== 'army') await this.painter.travel(look, from, this.chestOf(t), `${id}.travel`, dir === -1);
    this.cue(ev.healed > 0 ? 'heal' : ev.damage > 0 ? 'spell' : 'bless', undefined, look.sound);
    const per = victims.length > 1 && ev.damage > 0 && ev.damage % victims.length === 0 ? ev.damage / victims.length : null;
    const gap = look.scope === 'army' ? 110 : 70;
    const react = async (v: StackEntry, i: number) => {
      await this.tweens.wait(i * gap);
      if (look.travel === 'sky') await this.painter.travel(look, from, this.chestOf(v), `${id}.travel`);
      const hit = this.painter.impact(look, this.targetOf(v), `${id}.impact`);
      await this.tweens.wait(200);
      let text: string | null = null;
      let color = '#f5e4b7';
      if (ev.healed > 0) {
        if (i === 0) text = `+${ev.healed} HP`;
        color = '#9be58a';
      } else if (ev.damage > 0) {
        text = per !== null ? `−${per}` : i === 0 ? `−${ev.damage}` : null;
        color = '#9cc4ff';
      } else if (i === 0) {
        text = look.label ?? (look.hostile ? 'Cursed' : 'Blessed');
        color = look.hostile ? '#d7b0ff' : '#f5e4b7';
      }
      if (text) void this.floatText(this.headOf(v), text, color, speed);
      if (ev.damage > 0) await this.sufferBlow(v, !v.view.alive);
      await hit;
    };
    await Promise.all([...victims.map(react), screen]);
  }

  /** A battle miracle: the moment over the field, then light (or a smite) on each stack it touches. */
  private async playMiracle(ev: Extract<GameEvent, { kind: 'InterventionInvoked' }>, speed: number): Promise<void> {
    const m = this.miracleOf(ev.interventionId, ev.playerId);
    const heal = this.pendingHeal;
    this.pendingHeal = null;
    if (!m) return;
    const look = m.look;
    const id = `fx.miracle.${ev.interventionId}`;
    this.logFx(id);
    const victims = this.miracleVictims(m, ev.targetStackId);
    const dir = m.side === 'attacker' ? 1 : -1;
    const healed = heal && heal.side === m.side ? heal.healed : 0;
    const screen = this.painter.screenFx(look.screen, look.school, dir, `${id}.screen`);
    await this.tweens.wait(look.screen === 'none' ? 0 : 280);
    this.cue(healed > 0 ? 'heal' : m.damage ? 'spell' : 'bless', undefined, look.sound);
    const react = async (v: StackEntry, i: number) => {
      await this.tweens.wait(i * 110);
      if (look.travel === 'sky') await this.painter.travel(look, { x: v.root.x, y: v.root.y - RB * 8 }, this.chestOf(v), `${id}.travel`);
      const hit = this.painter.impact(look, this.targetOf(v), `${id}.impact`);
      await this.tweens.wait(220);
      if (m.damage) {
        void this.floatText(this.headOf(v), `−${m.damage}`, '#ff8a70', speed);
        await this.sufferBlow(v, !v.view.alive);
      } else if (i === 0) {
        const text = healed > 0 ? `+${healed} HP` : m.label;
        if (text) void this.floatText(this.headOf(v), text, healed > 0 ? '#9be58a' : '#f5e4b7', speed);
      }
      await hit;
    };
    await Promise.all([...victims.map(react), screen]);
  }

  /** The magic effects played most recently (read-only diagnostics for tests). */
  fxDebug(): readonly string[] {
    return this.fxLog;
  }

  /** Defending: the strip, or a crouch behind the shield when only a still exists. */
  private async defendPose(e: StackEntry, k: number): Promise<void> {
    const f = e.figure;
    if (f.has('defend')) {
      await f.playOnce('defend', this.tweens, { minMs: 600 * k });
      return;
    }
    const back = e.view.facing === 1 ? -1 : 1;
    await this.tweens.tween(260 * k, (t) => {
      f.pose.scale.y = 1 - t * 0.08;
      f.pose.x = back * t * 0.05 * HEX_W;
    });
    await this.tweens.wait(360 * k);
    await this.tweens.tween(220 * k, (t) => {
      f.pose.scale.y = 0.92 + t * 0.08;
      f.pose.x = back * 0.05 * HEX_W * (1 - t);
    });
    f.rest();
  }

  // ------------------------------------------------------------------ input

  private local(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const z = this.board.scale.x;
    return { x: (e.clientX - r.left - this.board.x) / z, y: (e.clientY - r.top - this.board.y) / z };
  }

  private cellAt(p: { x: number; y: number }): { cell: BattleCell; offset: { x: number; y: number } } | null {
    const c = pointCell(p.x, p.y, RB, S);
    if (c.col < 0 || c.row < 0 || c.col >= this.cols || c.row >= this.rows) return null;
    const w = this.cellXY(c);
    return { cell: c, offset: { x: (p.x - w.x) / RB, y: (p.y - w.y) / RB } };
  }

  private onMove(e: PointerEvent): void {
    const hit = this.cellAt(this.local(e));
    const key = hit ? `${hit.cell.col}:${hit.cell.row}:${Math.sign(hit.offset.x)}:${Math.sign(hit.offset.y)}:${Math.round(Math.atan2(hit.offset.y, hit.offset.x) / (Math.PI / 3))}` : '';
    if (key === this.lastHover) return;
    this.lastHover = key;
    const g = this.hover;
    g.clear();
    if (hit) {
      const w = this.cellXY(hit.cell);
      g.poly(hexPolygon(w.x, w.y, RB * 0.95, S)).stroke({ width: 2, color: 0xf5e4b7, alpha: 0.95 });
      g.visible = true;
    } else g.visible = false;
    this.cb.onCellHover(hit?.cell ?? null, hit?.offset ?? { x: 0, y: 0 });
  }

  private onUp(e: PointerEvent): void {
    const hit = this.cellAt(this.local(e));
    if (hit) this.cb.onCellClick(hit.cell, e.button, hit.offset);
  }

  private onLeave(): void {
    if (this.lastHover === '') return;
    this.lastHover = '';
    this.hover.visible = false;
    this.cb.onCellHover(null, { x: 0, y: 0 });
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.zoomK = Math.max(0.85, Math.min(1.6, this.zoomK * Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.0012)));
    this.layout();
  }

  /** Read-only state of every stack figure (tests and diagnostics): where it is drawn and how. */
  stackDebug(): Record<string, { anchor: BattleCell; x: number; y: number; mirrored: boolean; drawn: string | null; status: string | null; sprite: string; down: boolean; visible: boolean; overlays: string[]; deaths: number; hits: number }> {
    const out: Record<string, { anchor: BattleCell; x: number; y: number; mirrored: boolean; drawn: string | null; status: string | null; sprite: string; down: boolean; visible: boolean; overlays: string[]; deaths: number; hits: number }> = {};
    const z = this.board.scale.x;
    for (const [id, e] of this.stacks) {
      out[id] = {
        anchor: e.shownAnchor,
        x: Math.round((e.root.x * z + this.board.x) * 10) / 10,
        y: Math.round((e.root.y * z + this.board.y) * 10) / 10,
        mirrored: e.figure.pose.scale.x < 0,
        drawn: e.figure.current?.drawn ?? null,
        status: e.figure.set?.status ?? null,
        sprite: e.figure.status,
        down: e.down,
        visible: e.root.visible,
        overlays: e.aura.kinds,
        deaths: e.deathPlays,
        hits: e.hitPlays,
      };
    }
    return out;
  }

  /** Screen position (CSS pixels within the canvas) of a battle cell centre — read-only. */
  projectCell(c: BattleCell): { x: number; y: number } | null {
    const w = this.cellXY(c);
    const z = this.board.scale.x;
    return { x: w.x * z + this.board.x, y: w.y * z + this.board.y };
  }

  // ------------------------------------------------------------------ frame

  tick(dt: number): void {
    this.time += dt;
    this.tweens.tick(dt);
    if (this.structureSnapIn > 0 && --this.structureSnapIn === 0 && this.structuresLocked === 0) this.syncStructures();
    for (const tw of this.extraTweens) tw.tick(dt);
    const motion = graphicsProfile().ambientMotion;
    for (const e of this.stacks.values()) {
      if (e.locked === 0 && e.snapIn > 0 && --e.snapIn === 0) this.snap(e);
      e.badge.position.set(e.root.x + e.badgeOffset.x, e.root.y + e.badgeOffset.y);
      e.badge.zIndex = e.root.y;
      e.badge.renderable = e.root.visible;
      if (e.down) continue;
      if (motion || e.locked > 0) e.figure.tick(dt);
      if (e.locked === 0 && e.auraDelay > 0 && --e.auraDelay === 0) this.applyAura(e);
      if (e.shownStatuses.length > 0) {
        this.refreshAura(e);
        if (motion && !this.calm) e.aura.update(this.time + e.seed * 1000);
      }
      if (e.locked === 0 && this.celebrating.has(e) && !e.figure.has('victory')) {
        // Winners keep cheering (a little hop) until the result opens.
        const t = this.time / 1000 + e.seed * 0.37;
        e.figure.pose.y = -Math.abs(Math.sin(t * Math.PI * 1.6)) * RB * 0.28;
      }
    }
    const a = this.activeStack;
    const ring = this.activeRing;
    if (a && a.locked === 0 && a.view.alive) {
      const w = a.view.footprint === 2 ? 1.7 : 1;
      const pulse = 1 + Math.sin(this.time / 220) * 0.05;
      ring.clear();
      ring.ellipse(0, 0, HEX_W * 0.48 * w * pulse, HEX_W * 0.48 * S * 0.62 * pulse).stroke({ width: 3, color: 0xf1d48a, alpha: 0.95 });
      ring.position.set(a.root.x, a.root.y);
      ring.visible = true;
    } else ring.visible = false;
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

  dispose(): void {
    this.disposed = true;
    this.skip();
    for (const [type, fn] of this.listeners) this.canvas.removeEventListener(type, fn);
    for (const e of this.stacks.values()) e.figure.destroy();
    this.stacks.clear();
    this.root.destroy({ children: true });
  }
}
