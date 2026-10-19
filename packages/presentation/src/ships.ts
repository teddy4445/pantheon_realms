/**
 * Hero ships on the adventure map (expedition kit §07/§09, scenario feature `navalMovementV1`) —
 * the PixiJS layer the AdventureSceneController owns. Presentation only: it draws the view model
 * the interface builds from committed state (`AdventureShipView`) and plays committed events; it
 * never reads or changes a rule, consumes no RNG and decides nothing.
 *
 * A ship is the kit's directional painted hull (`mapTokenPicture('ship', heading)`: E / NE / SE,
 * mirrored for W / NW / SW, the heading from the PROJECTED travel delta — never a rotated picture),
 * sized by its visible bounds (`shipTokenLayout`), with the owner's square flag at the mast point
 * (x → 1 − x when mirrored; only the flag is tinted, from the player's colour) when a hero is aboard,
 * and an owner / neutral pennant only when it is empty (no fictitious hero). Motion follows
 * `shipMotion.ts` on presentation time; reduced motion holds bob, roll, wake and shaking still.
 */
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { HexCoord } from '@pr/rules';
import { hexPolygon } from './hexmath';
import { mapTokenPicture, tokenHeading, type MapTokenHeading } from './mapTokens';
import { SHIP_MOTION, facingHeading, shipPose, shipTokenLayout, sinkingLayers, transitionLayers, type ShipMotionState } from './shipMotion';
import { loadTexture } from './textures';
import { colorOf, groundShadow } from './staticSprites';
import { graphicsProfile } from './graphics';
import { linear, type TweenPlayer } from './tween';

/** One ship as the viewer may see it (own ships always; another's only while its tile is in sight). */
export interface AdventureShipView {
  readonly id: string;
  readonly coord: HexCoord;
  /** The rules' facing (an `AXIAL_DIRECTIONS` index): the resting heading. */
  readonly facing: number;
  /** The owner's colour (`state.players[ownerId].color`, the land banner's source); null: neutral. */
  readonly color: string | null;
  /** A hero is aboard (its square flag flies); false: an empty hull with its owner / neutral marker. */
  readonly occupied: boolean;
  readonly shown: boolean;
  /** The viewer's selected hero is aboard (the selection ring is drawn on the ship). */
  readonly selected?: boolean;
  /** Both ships of a boarding battle in progress hold the boarding pose. */
  readonly boarding?: boolean;
}

/** A destination or mode change on the planned voyage (drawn under the objects). */
export interface ShipMarksView {
  /** Shore tiles where the selected embarked hero may land now (Disembark). */
  readonly landing: readonly HexCoord[];
  /** The selected ship's planned destination (the kit's destination ring). */
  readonly ring: HexCoord | null;
  /** Embark / disembark steps on the planned route. */
  readonly transitions: readonly { readonly coord: HexCoord; readonly kind: 'embark' | 'disembark' }[];
}

/** Picture URLs of the kit's vector overlays (resolved by the interface). */
export interface ShipOverlayUrls {
  readonly wake: string | null;
  readonly ring: string | null;
}

/** Read-only ship state for tests and diagnostics. */
export interface ShipTokenDebug {
  readonly coord: HexCoord;
  readonly heading: MapTokenHeading;
  readonly flipX: boolean;
  readonly texture: 'ready' | 'loading' | 'missing';
  readonly shown: boolean;
  readonly occupied: boolean;
  /** The flag drawn (occupied ships): its mast point on screen and colour; null on an empty hull. */
  readonly flag: { readonly x: number; readonly y: number; readonly color: string } | null;
  /** The empty hull's marker colour ('neutral' without an owner); null on a crewed ship. */
  readonly marker: string | null;
  readonly motion: ShipMotionState;
  readonly moving: boolean;
  readonly bob: boolean;
  readonly wake: number;
  readonly selected: boolean;
  /** Ground point on screen (CSS pixels within the canvas). */
  readonly x: number;
  readonly y: number;
  /** Visible hull width on screen (pixels). */
  readonly width: number;
}

export interface ShipLayerDebug {
  readonly ships: Record<string, ShipTokenDebug>;
  /** Sinking playbacks in progress, and how many have finished. */
  readonly sinking: readonly string[];
  readonly sunk: readonly string[];
  readonly landing: number;
  readonly ring: HexCoord | null;
  readonly transitions: number;
  readonly calm: boolean;
  /** The kit's wake and destination-ring overlays drawn from their pictures, or as vector stand-ins until they load. */
  readonly wakeArt: 'overlay' | 'vector';
  readonly ringArt: 'overlay' | 'vector';
}

/** What the layer needs from its controller. */
export interface ShipLayerHost {
  /** The depth-sorted map objects (ships join them, sorted by their ground point). */
  readonly objects: Container;
  /** Ground marks under the objects (landing cells, route steps, the destination ring). */
  readonly marks: Container;
  readonly tweens: TweenPlayer;
  readonly hexRadius: number;
  readonly squash: number;
  hexCenter(c: HexCoord): { x: number; y: number };
  /** Map pixels → canvas pixels (debug readouts). */
  toScreen(x: number, y: number): { x: number; y: number };
  zoom(): number;
  wake(): void;
  follow(x: number, y: number): void;
  calm(): boolean;
}

/** Map time per sea step (ms, before the animation speed setting): as a hero's step. */
const SHIP_STEP_MS = 360;
/** The wake's length in hex widths (the kit's overlay, trailing astern from the hull's middle). */
const WAKE_HEXES = 1.55;
/** The hull's ground point lies a little below the hex centre (the keel in the hex's lower half). */
const GROUND_DROP = 0.42;

interface ShipEntry {
  root: Container;
  /** Bob, roll and recoil (around the ground point). */
  pose: Container;
  hull: Sprite;
  wreck: Sprite | null;
  wake: Sprite;
  wakeG: Graphics;
  /** The owner's flag (occupied) — fades with embark / disembark. */
  crew: Container;
  cloth: Graphics;
  /** The owner / neutral pennant of an empty hull. */
  marker: Container;
  base: Graphics;
  ring: Graphics;
  view: AdventureShipView;
  coord: HexCoord;
  prevCoord: HexCoord;
  heading: MapTokenHeading;
  /** The projected angle of the last travel (the wake's direction). */
  angle: number;
  textureKey: string;
  texture: 'ready' | 'loading' | 'missing';
  flagAt: { x: number; y: number } | null;
  visibleWidth: number;
  motion: ShipMotionState;
  /** Layer time the loop began; one-shots are driven by `progress` (tween). */
  motionStart: number;
  progress: number;
  locked: number;
  snapIn: number;
  /** Crew opacity override while a crossfade runs (null: from the view). */
  crewAlpha: number | null;
  key: string;
  transient: boolean;
}

/** A rasterised copy of a vector overlay (SVG files have no pixel size of their own). */
const vectorTextures = new Map<string, Promise<Texture>>();
function vectorTexture(url: string, width: number, height: number): Promise<Texture> {
  let p = vectorTextures.get(url);
  if (!p) {
    p = new Promise<Texture>((resolve, reject) => {
      if (typeof Image === 'undefined' || typeof document === 'undefined') return reject(new Error('no DOM'));
      const img = new Image(width, height);
      img.decoding = 'async';
      img.onload = () => {
        const k = 4;
        const c = document.createElement('canvas');
        c.width = width * k;
        c.height = height * k;
        const ctx = c.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(Texture.from(c));
      };
      img.onerror = () => reject(new Error(`Could not load ${url}`));
      img.src = url;
    });
    p.catch(() => vectorTextures.delete(url));
    vectorTextures.set(url, p);
  }
  return p;
}

export class ShipLayer {
  private readonly host: ShipLayerHost;
  private readonly ships = new Map<string, ShipEntry>();
  /** Sinking hulls (transient; removed when their playback ends). */
  private readonly sinking = new Map<string, ShipEntry>();
  private readonly sunk: string[] = [];
  /** The last look of every ship drawn (a sinking playback starts from it after the hull left the view). */
  private readonly lastLook = new Map<string, { coord: HexCoord; heading: MapTokenHeading; color: string | null; occupied: boolean }>();
  private readonly marksLayer = new Container();
  private readonly landingG = new Graphics();
  private readonly stepsG = new Graphics();
  private readonly ringRoot = new Container();
  private readonly ringG = new Graphics();
  private ringSprite: Sprite | null = null;
  private marksKey = '';
  private marksView: ShipMarksView = { landing: [], ring: null, transitions: [] };
  private overlays: ShipOverlayUrls = { wake: null, ring: null };
  private wakeTex: Texture | null = null;
  private time = 0;
  private lastZoom = 0;
  private disposed = false;

  constructor(host: ShipLayerHost) {
    this.host = host;
    this.marksLayer.eventMode = 'none';
    this.marksLayer.addChild(this.landingG, this.stepsG, this.ringRoot);
    this.ringRoot.addChild(this.ringG);
    this.ringRoot.visible = false;
    host.marks.addChild(this.marksLayer);
  }

  private get R(): number {
    return this.host.hexRadius;
  }

  private get hexWidth(): number {
    return Math.sqrt(3) * this.host.hexRadius;
  }

  // ------------------------------------------------------------------ overlays

  setOverlays(o: ShipOverlayUrls | undefined): void {
    const next = o ?? { wake: null, ring: null };
    if (next.wake === this.overlays.wake && next.ring === this.overlays.ring) return;
    this.overlays = next;
    if (next.wake) {
      void vectorTexture(next.wake, 180, 80)
        .then((tex) => {
          if (this.disposed || this.overlays.wake !== next.wake) return;
          this.wakeTex = tex;
          for (const e of [...this.ships.values(), ...this.sinking.values()]) this.applyWakeTexture(e);
          this.host.wake();
        })
        .catch(() => undefined);
    }
    if (next.ring) {
      void vectorTexture(next.ring, 76, 50)
        .then((tex) => {
          if (this.disposed || this.overlays.ring !== next.ring) return;
          this.ringSprite?.destroy();
          const s = new Sprite(tex);
          s.anchor.set(0.5);
          const w = this.hexWidth * 1.05;
          s.scale.set(w / tex.width);
          this.ringSprite = s;
          this.ringRoot.addChild(s);
          this.ringG.visible = false;
          this.host.wake();
        })
        .catch(() => undefined);
    }
  }

  private applyWakeTexture(e: ShipEntry): void {
    if (!this.wakeTex || e.wake.texture === this.wakeTex) return;
    e.wake.texture = this.wakeTex;
    // The overlay's bow end (x 170 of 180) meets the stern; it trails back over about one hex.
    e.wake.anchor.set(170 / 180, 0.5);
    const w = this.hexWidth * WAKE_HEXES;
    e.wake.scale.set(w / this.wakeTex.width, (w / this.wakeTex.width) * 0.9);
    e.wake.visible = true;
    e.wakeG.visible = false;
  }

  // ------------------------------------------------------------------ entries

  private ground(c: HexCoord): { x: number; y: number } {
    const p = this.host.hexCenter(c);
    return { x: p.x, y: p.y + this.R * this.host.squash * GROUND_DROP };
  }

  private place(e: ShipEntry, c: HexCoord): void {
    const p = this.ground(c);
    e.root.position.set(p.x, p.y);
    e.root.zIndex = p.y;
  }

  private create(v: AdventureShipView, transient = false): ShipEntry {
    const root = new Container();
    root.eventMode = 'none';
    const pose = new Container();
    const base = new Graphics();
    const ring = new Graphics();
    const hull = new Sprite(Texture.EMPTY);
    hull.visible = false;
    const wake = new Sprite(Texture.EMPTY);
    wake.visible = false;
    const wakeG = new Graphics();
    const crew = new Container();
    const cloth = new Graphics();
    const marker = new Container();
    if (graphicsProfile().shadows) root.addChild(groundShadow(this.hexWidth * 0.42, this.hexWidth * 0.11, 0.22));
    root.addChild(base, ring, wake, wakeG, pose);
    pose.addChild(hull, marker, crew);
    const e: ShipEntry = {
      root,
      pose,
      hull,
      wreck: null,
      wake,
      wakeG,
      crew,
      cloth,
      marker,
      base,
      ring,
      view: v,
      coord: v.coord,
      prevCoord: v.coord,
      heading: facingHeading(v.facing, this.host.squash),
      angle: 0,
      textureKey: '',
      texture: 'loading',
      flagAt: null,
      visibleWidth: this.hexWidth * 1.2,
      motion: v.boarding ? 'boarding' : 'idle',
      motionStart: this.time,
      progress: 0,
      locked: 0,
      snapIn: 0,
      crewAlpha: null,
      key: '',
      transient,
    };
    e.angle = headingAngle(e.heading);
    this.drawWakeFallback(e);
    this.applyWakeTexture(e);
    this.setHeading(e, e.heading, true);
    this.drawMarks(e);
    this.place(e, v.coord);
    this.host.objects.addChild(root);
    return e;
  }

  /** The kit's wake as a vector fallback (until or unless its overlay picture loads). */
  private drawWakeFallback(e: ShipEntry): void {
    const g = e.wakeG;
    g.clear();
    const w = this.hexWidth * WAKE_HEXES;
    const k = w / 180;
    const pt = (x: number, y: number) => [(x - 170) * k, (y - 40) * k * 0.9] as const;
    const curve = (a: [number, number], c: [number, number], b: [number, number], width: number, alpha: number) => {
      const [ax, ay] = pt(a[0], a[1]);
      const [cx, cy] = pt(c[0], c[1]);
      const [bx, by] = pt(b[0], b[1]);
      g.moveTo(ax, ay).quadraticCurveTo(cx, cy, bx, by).stroke({ width, color: 0xb5e3de, alpha, cap: 'round' });
    };
    curve([170, 38], [110, 20], [10, 13], 3 * k * 2, 0.55);
    curve([170, 42], [110, 60], [10, 67], 3 * k * 2, 0.55);
    curve([142, 38], [80, 29], [27, 25], 2 * k * 2, 0.4);
    curve([142, 42], [80, 51], [27, 55], 2 * k * 2, 0.4);
    g.visible = !this.wakeTex;
  }

  /** The owner's marks: a base ellipse on the water, the square flag (crewed) or the pennant (empty). */
  private drawMarks(e: ShipEntry): void {
    const v = e.view;
    const R = this.R;
    const S = this.host.squash;
    const owned = v.color !== null;
    const col = colorOf(v.color ?? '#e9dfc4');
    e.base.clear();
    if (owned) e.base.ellipse(0, -R * S * 0.18, this.hexWidth * 0.44, this.hexWidth * 0.44 * S * 0.42).fill({ color: col, alpha: 0.3 }).stroke({ width: 1.5, color: col, alpha: 0.85 });
    else e.base.ellipse(0, -R * S * 0.18, this.hexWidth * 0.44, this.hexWidth * 0.44 * S * 0.42).stroke({ width: 1.2, color: 0xe9dfc4, alpha: 0.55 });
    e.ring.clear();
    e.ring.ellipse(0, -R * S * 0.18, this.hexWidth * 0.52, this.hexWidth * 0.52 * S * 0.46).stroke({ width: 3, color: 0xf1d48a, alpha: 0.95 });
    e.ring.visible = !!v.selected;
    // Crewed: the hero's square banner on a short staff over the masthead (only this cloth carries the colour).
    for (const c of e.crew.removeChildren()) c.destroy({ children: true });
    const pole = new Graphics();
    const poleH = R * 0.62;
    pole.moveTo(0, 0).lineTo(0, -poleH).stroke({ width: 2.2, color: 0x3a2c1c });
    e.cloth = new Graphics();
    e.cloth.rect(0, 0, R * 0.5, R * 0.36).fill({ color: col }).stroke({ width: 1.2, color: 0x1a1208, alpha: 0.75 });
    e.cloth.position.set(1, -poleH);
    e.crew.addChild(pole, e.cloth);
    e.crew.visible = v.occupied;
    // Empty: a small pennant (the "not crewed" shape), the owner's colour or a pale neutral one.
    for (const c of e.marker.removeChildren()) c.destroy({ children: true });
    const pen = new Graphics();
    const ph = R * 0.42;
    pen.moveTo(0, 0).lineTo(0, -ph).stroke({ width: 1.8, color: 0x3a2c1c });
    pen.poly([1, -ph, 1 + R * 0.4, -ph + R * 0.11, 1, -ph + R * 0.22]).fill({ color: col, alpha: owned ? 0.98 : 0.9 }).stroke({ width: 1, color: 0x1a1208, alpha: 0.8 });
    e.marker.addChild(pen);
    e.marker.visible = !v.occupied;
    this.positionFlag(e);
    e.key = `${v.color ?? ''}|${v.occupied}|${!!v.selected}`;
  }

  private positionFlag(e: ShipEntry): void {
    const at = e.flagAt ?? { x: 0, y: -this.R * 1.4 };
    e.crew.position.set(at.x, at.y);
    e.marker.position.set(at.x, at.y);
    // The cloth streams aft (away from the bow); a mirrored hull turns it round, never the flag's colour.
    const west = e.heading === 'w' || e.heading === 'nw' || e.heading === 'sw';
    e.cloth.scale.x = west ? 1 : -1;
    const pen = e.marker.children[0];
    if (pen) pen.scale.x = west ? 1 : -1;
  }

  /** Turn a ship to a heading: the painted facing or its mirror (never a rotation), loaded once per facing. */
  private setHeading(e: ShipEntry, heading: MapTokenHeading, force = false): void {
    if (heading === e.heading && !force && e.textureKey) return;
    e.heading = heading;
    const t = mapTokenPicture('ship', heading);
    const key = t ? `${t.picture.assetId}|${t.flipX}` : 'missing';
    if (!t) {
      e.texture = 'missing';
      e.textureKey = key;
      e.hull.visible = false;
      this.positionFlag(e);
      return;
    }
    const lay = shipTokenLayout(t, this.hexWidth);
    e.flagAt = lay.flag;
    e.visibleWidth = lay.visibleWidth;
    e.hull.anchor.set(t.picture.groundAnchor[0], t.picture.groundAnchor[1]);
    e.hull.scale.set(t.flipX ? -lay.scale : lay.scale, lay.scale);
    this.positionFlag(e);
    if (key === e.textureKey) return;
    e.textureKey = key;
    e.texture = 'loading';
    void loadTexture(t.url)
      .then((tex) => {
        if (e.hull.destroyed || e.textureKey !== key) return;
        e.hull.texture = tex;
        e.hull.visible = true;
        e.texture = 'ready';
        this.host.wake();
      })
      .catch(() => {
        if (e.textureKey === key) e.texture = 'missing';
      });
  }

  private turnToward(e: ShipEntry, from: HexCoord, to: HexCoord): void {
    const a = this.host.hexCenter(from);
    const b = this.host.hexCenter(to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.hypot(dx, dy) < 1e-6) return;
    e.angle = Math.atan2(dy, dx);
    this.setHeading(e, tokenHeading(dx, dy, e.heading));
  }

  private destroyEntry(e: ShipEntry): void {
    if (!e.root.destroyed) e.root.destroy({ children: true });
  }

  /** The hull facings and the wreck still load once ships are on the map, so a turn or a sinking never waits for its picture. */
  private preloaded = false;
  private preload(): void {
    if (this.preloaded) return;
    this.preloaded = true;
    for (const [id, h] of [['ship', 'e'], ['ship', 'ne'], ['ship', 'se'], ['ship-wreck', 'e']] as const) {
      const t = mapTokenPicture(id, h);
      if (t) void loadTexture(t.url).catch(() => undefined);
    }
  }

  /** Bring the drawn ships in line with the view (own ships always; others while in sight). */
  sync(views: readonly AdventureShipView[]): void {
    if (views.length) this.preload();
    const seen = new Set<string>();
    for (const v of views) {
      seen.add(v.id);
      let e = this.ships.get(v.id);
      if (!e) {
        e = this.create(v);
        this.ships.set(v.id, e);
      }
      const prev = e.view;
      e.view = v;
      if (`${v.color ?? ''}|${v.occupied}|${!!v.selected}` !== e.key) this.drawMarks(e);
      if (e.locked === 0 && prev.facing !== v.facing) this.setHeading(e, facingHeading(v.facing, this.host.squash));
      if (e.coord.q !== v.coord.q || e.coord.r !== v.coord.r) {
        e.prevCoord = e.coord;
        e.coord = v.coord;
        // A queued playback claims the ship within two frames; else it snaps there.
        if (e.locked === 0) e.snapIn = 2;
      } else if (e.locked === 0 && e.snapIn === 0) this.place(e, v.coord);
      if (e.locked === 0 && (e.motion === 'idle' || e.motion === 'boarding') && e.motion !== (v.boarding ? 'boarding' : 'idle')) this.setMotion(e, v.boarding ? 'boarding' : 'idle');
      e.root.visible = v.shown;
      this.lastLook.set(v.id, { coord: v.coord, heading: e.heading, color: v.color, occupied: v.occupied });
    }
    for (const [id, e] of this.ships) {
      if (seen.has(id)) continue;
      this.destroyEntry(e);
      this.ships.delete(id);
    }
    this.host.wake();
  }

  /** The route's naval marks: landing cells, embark / disembark steps and the destination ring. */
  syncMarks(m: ShipMarksView | undefined): void {
    const v = m ?? { landing: [], ring: null, transitions: [] };
    const key = `${v.landing.map((c) => `${c.q},${c.r}`).join(';')}|${v.ring ? `${v.ring.q},${v.ring.r}` : ''}|${v.transitions.map((t) => `${t.kind}@${t.coord.q},${t.coord.r}`).join(';')}`;
    if (key === this.marksKey) return;
    this.marksKey = key;
    this.marksView = v;
    const R = this.R;
    const S = this.host.squash;
    const g = this.landingG;
    g.clear();
    for (const c of v.landing) {
      const p = this.host.hexCenter(c);
      g.poly(hexPolygon(p.x, p.y, R * 0.9, S));
    }
    if (v.landing.length) {
      g.fill({ color: 0x8fe07a, alpha: 0.26 });
      for (const c of v.landing) {
        const p = this.host.hexCenter(c);
        g.poly(hexPolygon(p.x, p.y, R * 0.9, S));
      }
      g.stroke({ width: 2.4, color: 0xd9f5c6, alpha: 0.95 });
    }
    const s = this.stepsG;
    s.clear();
    for (const t of v.transitions) {
      const p = this.host.hexCenter(t.coord);
      // A gold seal with an arrow: down into the hull (embark) or up onto the shore (disembark); shape, not colour alone.
      s.circle(p.x, p.y, R * 0.34).fill({ color: 0x10202c, alpha: 0.82 }).stroke({ width: 2.2, color: 0xf1d48a, alpha: 0.98 });
      const dir = t.kind === 'embark' ? 1 : -1;
      s.moveTo(p.x, p.y - dir * R * 0.18).lineTo(p.x, p.y + dir * R * 0.16).stroke({ width: 2.4, color: 0xf5e4b7, cap: 'round' });
      s.poly([p.x - R * 0.12, p.y + dir * R * 0.05, p.x + R * 0.12, p.y + dir * R * 0.05, p.x, p.y + dir * R * 0.2]).fill({ color: 0xf5e4b7 });
      s.moveTo(p.x - R * 0.2, p.y + R * 0.24).quadraticCurveTo(p.x, p.y + R * 0.32, p.x + R * 0.2, p.y + R * 0.24).stroke({ width: 1.6, color: 0x9fd6e6, cap: 'round' });
    }
    if (v.ring) {
      const p = this.host.hexCenter(v.ring);
      this.ringRoot.position.set(p.x, p.y);
      if (!this.ringSprite) {
        this.ringG.clear();
        // The kit's dashed destination ellipse, drawn as vector until its overlay picture loads.
        const rx = this.hexWidth * 0.44;
        const ry = rx * 0.44;
        for (let i = 0; i < 24; i += 2) {
          const a0 = (i / 24) * Math.PI * 2;
          const a1 = ((i + 1) / 24) * Math.PI * 2;
          this.ringG.moveTo(Math.cos(a0) * rx, Math.sin(a0) * ry).lineTo(Math.cos(a1) * rx, Math.sin(a1) * ry);
        }
        this.ringG.stroke({ width: 2, color: 0xe7c17a, alpha: 0.95 });
        this.ringG.visible = true;
      }
      this.ringRoot.visible = true;
    } else this.ringRoot.visible = false;
    this.host.wake();
  }

  private setMotion(e: ShipEntry, m: ShipMotionState): void {
    e.motion = m;
    e.motionStart = this.time;
    e.progress = 0;
  }

  // ------------------------------------------------------------------ playback (committed events; never changes state)

  /** The ship follows its hero's committed sea route (`ShipMoved`), sailing hex to hex. */
  async playMove(shipId: string, path: readonly HexCoord[], speed: number, follow: boolean): Promise<void> {
    const e = this.ships.get(shipId);
    if (!e || path.length === 0) return;
    const end = path[path.length - 1]!;
    const start = end.q === e.coord.q && end.r === e.coord.r ? e.prevCoord : e.coord;
    if (start.q === end.q && start.r === end.r) return;
    await this.sail(e, start, path, speed, follow);
  }

  /**
   * Hold a ship on a tile (its committed coordinate may already be elsewhere) until the returned
   * release is called — e.g. a boarding's winner waits beside the contested hex while the loser's
   * wreck sinks there, then sails in. Presentation only.
   */
  holdAt(shipId: string, at: HexCoord): () => void {
    const e = this.ships.get(shipId);
    if (!e) return () => undefined;
    e.locked += 1;
    e.snapIn = 0;
    this.place(e, at);
    let done = false;
    return () => {
      if (done || e.root.destroyed) return;
      done = true;
      e.locked -= 1;
      if (e.locked === 0) this.place(e, e.coord);
    };
  }

  /** A withdrawing ship (`ShipWithdrawn`) sails from the contested water to its new hex. */
  async playWithdraw(shipId: string, from: HexCoord, to: HexCoord, speed: number, follow = false): Promise<void> {
    const e = this.ships.get(shipId);
    if (!e) return;
    await this.sail(e, from, [to], speed, follow);
  }

  private async sail(e: ShipEntry, start: HexCoord, path: readonly HexCoord[], speed: number, follow: boolean): Promise<void> {
    e.locked += 1;
    e.snapIn = 0;
    this.host.tweens.speed = speed;
    if (speed > 0) this.setMotion(e, 'sailing');
    try {
      let from = start;
      this.place(e, from);
      for (const step of path) {
        this.turnToward(e, from, step);
        const a = this.ground(from);
        const b = this.ground(step);
        await this.host.tweens.tween(
          SHIP_STEP_MS,
          (t) => {
            e.root.position.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
            e.root.zIndex = e.root.y;
            if (follow) this.host.follow(e.root.x, e.root.y);
          },
          linear,
        );
        from = step;
      }
    } finally {
      e.locked -= 1;
      if (e.locked === 0 && !e.root.destroyed) {
        this.place(e, e.coord);
        this.setMotion(e, e.view.boarding ? 'boarding' : 'idle');
      }
    }
  }

  /**
   * Embark / disembark (after the command is committed): a 650 ms crossfade between the mounted avatar
   * (faded by `avatar`, which the controller applies to the hero's own figure) and the crewed ship.
   */
  async playTransition(kind: 'embark' | 'disembark', shipId: string, speed: number, avatar: (alpha: number, t: number) => void): Promise<void> {
    const e = this.ships.get(shipId);
    const calm = this.host.calm();
    this.host.tweens.speed = speed;
    if (e) {
      e.locked += 1;
      e.crew.visible = true;
      this.setMotion(e, kind);
    }
    try {
      await this.host.tweens.tween(SHIP_MOTION[kind].durationMs, (t) => {
        const l = transitionLayers(kind, t, calm);
        if (e) {
          e.progress = t;
          e.crewAlpha = l.crew;
        }
        avatar(l.avatar, t);
      }, linear);
    } finally {
      avatar(1, 1);
      if (e && !e.root.destroyed) {
        e.locked -= 1;
        e.crewAlpha = null;
        e.crew.visible = e.view.occupied;
        this.setMotion(e, e.view.boarding ? 'boarding' : 'idle');
        if (e.locked === 0) this.place(e, e.coord);
      }
    }
  }

  /** A new ship (`ShipLaunched`) rises onto its water. */
  async playLaunch(shipId: string, speed: number): Promise<void> {
    const e = this.ships.get(shipId);
    if (!e) return;
    this.host.tweens.speed = speed;
    e.locked += 1;
    try {
      await this.host.tweens.tween(SHIP_MOTION.embark.durationMs, (t) => (e.root.alpha = this.host.calm() ? 1 : t), linear);
    } finally {
      if (!e.root.destroyed) {
        e.root.alpha = 1;
        e.locked -= 1;
      }
    }
  }

  /** Both ships of a boarding hold the boarding pose while the battlefield opens (`ms` of it here). */
  async playBoarding(shipIds: readonly string[], ms: number, speed: number): Promise<void> {
    const list = shipIds.map((id) => this.ships.get(id)).filter((e): e is ShipEntry => !!e);
    for (const e of list) {
      e.locked += 1;
      this.setMotion(e, 'boarding');
    }
    this.host.tweens.speed = speed;
    try {
      await this.host.tweens.wait(ms);
    } finally {
      for (const e of list) if (!e.root.destroyed) e.locked -= 1;
    }
  }

  /** A short recoil cue (no hull HP). */
  async playHit(shipId: string, speed: number): Promise<void> {
    const e = this.ships.get(shipId);
    if (!e) return;
    const keep = e.motion;
    e.locked += 1;
    this.setMotion(e, 'hit');
    this.host.tweens.speed = speed;
    try {
      await this.host.tweens.tween(SHIP_MOTION.hit.durationMs, (t) => (e.progress = t), linear);
    } finally {
      if (!e.root.destroyed) {
        e.locked -= 1;
        this.setMotion(e, keep === 'hit' ? 'idle' : keep);
      }
    }
  }

  /**
   * Sinking after a confirmed defeat (`ShipWrecked`; the hull already left the rules): the last look of
   * the ship fades into the wreck still, goes down and is removed. Never delays the logical result.
   */
  async playSinking(shipId: string, speed: number, fallback?: { coord: HexCoord; facing?: number; color: string | null; occupied?: boolean }): Promise<void> {
    const look = this.lastLook.get(shipId) ?? (fallback ? { coord: fallback.coord, heading: facingHeading(fallback.facing ?? 0, this.host.squash), color: fallback.color, occupied: !!fallback.occupied } : null);
    if (!look || this.sinking.has(shipId)) return;
    // The live entry (if the view still holds it) gives way to a transient copy.
    const live = this.ships.get(shipId);
    if (live) {
      this.destroyEntry(live);
      this.ships.delete(shipId);
    }
    const e = this.create({ id: shipId, coord: look.coord, facing: 0, color: look.color, occupied: look.occupied, shown: true }, true);
    this.setHeading(e, look.heading, true);
    this.sinking.set(shipId, e);
    const wreck = mapTokenPicture('ship-wreck', look.heading);
    if (wreck) {
      const s = new Sprite(Texture.EMPTY);
      const lay = shipTokenLayout(wreck, this.hexWidth);
      s.anchor.set(wreck.picture.groundAnchor[0], wreck.picture.groundAnchor[1]);
      s.scale.set(wreck.flipX ? -lay.scale : lay.scale, lay.scale);
      s.alpha = 0;
      e.pose.addChildAt(s, 1);
      e.wreck = s;
      void loadTexture(wreck.url)
        .then((tex) => {
          if (!s.destroyed) s.texture = tex;
        })
        .catch(() => undefined);
    }
    e.locked += 1;
    this.setMotion(e, 'sinking');
    this.host.tweens.speed = speed;
    try {
      await this.host.tweens.tween(SHIP_MOTION.sinking.durationMs, (t) => (e.progress = t), linear);
    } finally {
      this.sinking.delete(shipId);
      this.destroyEntry(e);
      this.lastLook.delete(shipId);
      this.sunk.push(shipId);
      if (this.sunk.length > 20) this.sunk.shift();
      this.host.wake();
    }
  }

  // ------------------------------------------------------------------ frame

  tick(dt: number): void {
    this.time += dt;
    const calm = this.host.calm();
    const motion = graphicsProfile().ambientMotion;
    const z = this.host.zoom();
    if (z !== this.lastZoom) {
      this.lastZoom = z;
      // The flag keeps a legible size at a distant zoom (drawn larger in the world, like the route markers).
      const k = Math.min(1.9, Math.max(1, 0.85 / Math.max(0.05, z)));
      for (const list of [this.ships, this.sinking])
        for (const e of list.values()) {
          e.crew.scale.set(k);
          e.marker.scale.set(k);
        }
    }
    if (this.ringRoot.visible) this.ringRoot.scale.set(motion && !calm ? 1 + Math.sin(this.time / 420) * 0.04 : 1);
    for (const list of [this.ships, this.sinking]) for (const e of list.values()) this.tickShip(e, calm, motion);
  }

  /** One ship's frame: its pose (bob, roll, recoil, sinking), wake and flag flutter — transforms only. */
  private tickShip(e: ShipEntry, calm: boolean, motion: boolean): void {
    if (e.snapIn > 0 && e.locked === 0 && --e.snapIn === 0) this.place(e, e.coord);
    const loop = SHIP_MOTION[e.motion].loop;
    // Loops run on the layer clock (held still without ambient motion); one-shots on their tween's progress.
    const t = loop ? (motion ? this.time - e.motionStart : 0) : e.progress * SHIP_MOTION[e.motion].durationMs;
    const pose = shipPose(e.motion, t, calm || (loop && !motion && e.motion !== 'sailing'));
    e.pose.position.set(pose.x, pose.y);
    e.pose.rotation = (pose.rotation * Math.PI) / 180;
    // The wake trails astern on the water (it does not bob with the hull).
    const wx = -Math.cos(e.angle) * e.visibleWidth * 0.24;
    const wy = -this.R * this.host.squash * 0.14 - Math.sin(e.angle) * e.visibleWidth * 0.12;
    const show = pose.wakeOpacity > 0.001;
    const w = this.wakeTex ? e.wake : e.wakeG;
    w.alpha = pose.wakeOpacity;
    w.rotation = e.angle;
    w.position.set(wx, wy);
    e.wake.visible = !!this.wakeTex && show;
    e.wakeG.visible = !this.wakeTex && show;
    e.cloth.skew.y = (pose.flagWave * Math.PI) / 180;
    if (e.motion === 'sinking') {
      const l = sinkingLayers(pose.progress, calm);
      e.hull.alpha = l.hull;
      if (e.wreck) e.wreck.alpha = l.wreck;
      e.crew.alpha = l.hull;
      e.marker.alpha = l.hull;
      e.base.alpha = l.hull;
    } else {
      e.hull.alpha = 1;
      const crew = e.crewAlpha ?? 1;
      e.crew.alpha = crew;
      e.marker.alpha = e.crewAlpha === null ? 1 : 1 - crew;
      e.marker.visible = e.crewAlpha === null ? !e.view.occupied : true;
      e.base.alpha = 1;
    }
    if (e.ring.visible) e.ring.scale.set(motion && !calm ? 1 + Math.sin(this.time / 260) * 0.04 : 1);
  }

  /** Something moves (a playback, a snap or a sinking): the frame pacing runs at full rate. */
  get busy(): boolean {
    if (this.sinking.size > 0) return true;
    for (const e of this.ships.values()) if (e.locked > 0 || e.snapIn > 0) return true;
    return false;
  }

  debug(): ShipLayerDebug {
    const out: Record<string, ShipTokenDebug> = {};
    const z = this.host.zoom();
    for (const [id, e] of this.ships) {
      const at = this.host.toScreen(e.root.x, e.root.y);
      const flag = e.view.occupied && e.flagAt ? this.host.toScreen(e.root.x + e.flagAt.x, e.root.y + e.flagAt.y) : null;
      out[id] = {
        coord: { q: e.coord.q, r: e.coord.r },
        heading: e.heading,
        flipX: e.hull.scale.x < 0,
        texture: e.texture,
        shown: e.view.shown,
        occupied: e.view.occupied,
        flag: flag && e.view.color ? { x: Math.round(flag.x), y: Math.round(flag.y), color: e.view.color } : null,
        marker: e.view.occupied ? null : (e.view.color ?? 'neutral'),
        motion: e.motion,
        moving: e.locked > 0,
        bob: Math.abs(e.pose.y) > 0.01 || Math.abs(e.pose.rotation) > 1e-4,
        wake: Math.round((this.wakeTex ? e.wake.alpha : e.wakeG.alpha) * 100) / 100,
        selected: !!e.view.selected,
        x: Math.round(at.x),
        y: Math.round(at.y),
        width: Math.round(e.visibleWidth * z),
      };
    }
    return {
      ships: out,
      sinking: [...this.sinking.keys()],
      sunk: [...this.sunk],
      landing: this.marksView.landing.length,
      ring: this.marksView.ring,
      transitions: this.marksView.transitions.length,
      calm: this.host.calm(),
      wakeArt: this.wakeTex ? 'overlay' : 'vector',
      ringArt: this.ringSprite ? 'overlay' : 'vector',
    };
  }

  dispose(): void {
    this.disposed = true;
    for (const e of [...this.ships.values(), ...this.sinking.values()]) this.destroyEntry(e);
    this.ships.clear();
    this.sinking.clear();
    if (!this.marksLayer.destroyed) this.marksLayer.destroy({ children: true });
  }
}

/** The projected screen angle of a heading (the wake's direction at rest). */
function headingAngle(h: MapTokenHeading): number {
  const deg: Record<MapTokenHeading, number> = { e: 0, ne: -55, se: 55, w: 180, nw: -125, sw: 125 };
  return (deg[h] * Math.PI) / 180;
}
