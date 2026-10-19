/**
 * Coastal sites and sea salvage on the adventure map (sea-sites kit 2026-10-17) — the PixiJS layer the
 * AdventureSceneController owns. Presentation only: it draws the view model the interface builds from
 * committed state (`AdventureSeaSiteView`) and decides nothing; it consumes no RNG.
 *
 *  - Coastal watchtowers: the delivered warm or cold picture (a biome skin), static, with the owner's flag
 *    at the bare mast — a square cloth for the viewer's own tower, a pennant for another's, none while
 *    neutral. Only the flag carries the player's colour; the sprite is never tinted.
 *  - Floating salvage: the delivered raft picture with a gentle bob (none under reduced motion); a pickup
 *    taken while in view fades out over 250 ms, one already taken is not drawn.
 *  - Shipwrecks: almost still (bob ≤ 0.4 px, roll ≤ 0.15°); a cleared wreck stays as a dimmed,
 *    non-interactive landmark with a cleared mark, and a small gold marker while its artifact waits.
 * Pictures are sized by their painted bounds (`seaSiteLayout`), loaded through `textures.ts`, and joined
 * to the depth-sorted objects by their ground point. Clicks never depend on a sprite (hexmath only).
 */
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { HexCoord } from '@pr/rules';
import { loadTexture } from './textures';
import { colorOf } from './staticSprites';
import { graphicsProfile } from './graphics';
import { SEA_PICKUP_FADE_MS, seaSiteBob, seaSiteLayout, type SeaSiteArt, type SeaSiteLayout } from './seaSiteLayout';

/** One sea site as the viewer may see it. */
export interface AdventureSeaSiteView {
  readonly id: string;
  readonly coord: HexCoord;
  readonly kind: 'tower' | 'pickup' | 'wreck';
  /** The manifest ID of its picture (`seaSites.*`). */
  readonly assetId: string;
  readonly art: SeaSiteArt | null;
  /** Drawn at all (explored or story-revealed). */
  readonly shown: boolean;
  /** Towers: the owner's colour (null: neutral, no flag) and the flag shape (square: the viewer's own). */
  readonly ownerColor: string | null;
  readonly ownerShape: 'square' | 'pennant';
  /** Salvage: taken (fades out when it happens in view; never drawn once taken). */
  readonly claimed: boolean;
  /** Wrecks: cleared (dimmed, with a cleared mark). */
  readonly cleared: boolean;
  /** Wrecks: an artifact waits there for the viewer. */
  readonly waiting?: boolean;
}

export interface SeaSiteLayerHost {
  readonly objects: Container;
  readonly hexRadius: number;
  readonly squash: number;
  hexCenter(c: HexCoord): { x: number; y: number };
  toScreen(x: number, y: number): { x: number; y: number };
  zoom(): number;
  wake(): void;
  calm(): boolean;
  /** A hero is still on its way to this hex (its playback has not arrived): the hex keeps its old look. */
  held(c: HexCoord): boolean;
}

/** Read-only state of one drawn sea site (tests and diagnostics). */
export interface SeaSiteDebug {
  readonly kind: AdventureSeaSiteView['kind'];
  readonly assetId: string;
  readonly texture: 'ready' | 'loading' | 'missing';
  readonly visible: boolean;
  readonly alpha: number;
  /** Ground point and painted size on screen (CSS pixels within the canvas). */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** The owner flag drawn (screen point of its mount and colour); null without one. */
  readonly flag: { readonly x: number; readonly y: number; readonly color: string; readonly shape: 'square' | 'pennant' } | null;
  readonly claimed: boolean;
  readonly cleared: boolean;
  readonly bob: boolean;
}

interface Entry {
  root: Container;
  pose: Container;
  sprite: Sprite;
  flag: Graphics | null;
  mark: Graphics | null;
  view: AdventureSeaSiteView;
  layout: SeaSiteLayout | null;
  texture: 'ready' | 'loading' | 'missing';
  textureKey: string;
  marksKey: string;
  phase: number;
  fadeStart: number | null;
  /** Taken, but the ship that took it has not arrived yet (the fade starts when it does). */
  awaiting: boolean;
  gone: boolean;
}

/**
 * Where the picture's ground point (the bottom of its painted bounds) sits below the hex centre, as a share
 * of the hex radius × squash. Chosen so the object's footprint is centred on its hex: a tower's rock base,
 * a raft, and a wreck's hull at the waterline — a wreck's broken mast rises far above its hull, so its
 * painted bottom (the foam under the hull) sits near the hex's lower corner (measured in the e2e gallery).
 */
const GROUND_DROP: Readonly<Record<AdventureSeaSiteView['kind'], number>> = { tower: 0.38, pickup: 0.3, wreck: 0.85 };

function hashPhase(id: string): number {
  let x = 0;
  for (let i = 0; i < id.length; i++) x = (x * 31 + id.charCodeAt(i)) >>> 0;
  return ((x % 1000) / 1000) * Math.PI * 2;
}

export class SeaSiteLayer {
  private readonly host: SeaSiteLayerHost;
  private readonly entries = new Map<string, Entry>();
  private time = 0;
  private disposed = false;

  constructor(host: SeaSiteLayerHost) {
    this.host = host;
  }

  private get hexWidth(): number {
    return Math.sqrt(3) * this.host.hexRadius;
  }

  /** A pickup fade is playing (the frame pace stays full). */
  get busy(): boolean {
    for (const e of this.entries.values()) if (e.fadeStart !== null) return true;
    return false;
  }

  private create(v: AdventureSeaSiteView): Entry {
    const root = new Container();
    root.eventMode = 'none';
    const pose = new Container();
    const sprite = new Sprite(Texture.EMPTY);
    sprite.visible = false;
    pose.addChild(sprite);
    root.addChild(pose);
    const e: Entry = { root, pose, sprite, flag: null, mark: null, view: v, layout: null, texture: 'loading', textureKey: '', marksKey: '', phase: hashPhase(v.id), fadeStart: null, awaiting: false, gone: false };
    this.place(e);
    this.host.objects.addChild(root);
    return e;
  }

  private place(e: Entry): void {
    const p = this.host.hexCenter(e.view.coord);
    const rs = this.host.hexRadius * this.host.squash;
    const y = p.y + rs * GROUND_DROP[e.view.kind];
    e.root.position.set(p.x, y);
    // Depth: a hero standing at a lookout is drawn in front of it (the tower would hide it); a ship
    // beside a wreck in the same row stays in front of the hull's spill.
    e.root.zIndex = e.view.kind === 'tower' ? p.y : e.view.kind === 'wreck' ? p.y + rs * 0.36 : y;
  }

  private applyArt(e: Entry): void {
    const art = e.view.art;
    const key = art?.url ?? '';
    if (key === e.textureKey) return;
    e.textureKey = key;
    if (!art || !art.url) {
      e.texture = 'missing';
      e.layout = null;
      e.sprite.visible = false;
      this.drawMarks(e, true);
      return;
    }
    const lay = seaSiteLayout(art, this.hexWidth);
    e.layout = lay;
    e.sprite.anchor.set(art.groundAnchor[0], art.groundAnchor[1]);
    e.sprite.scale.set(lay.scale);
    e.texture = 'loading';
    this.drawMarks(e, true);
    const url = art.url;
    void loadTexture(url)
      .then((tex) => {
        if (this.disposed || e.sprite.destroyed || e.textureKey !== url) return;
        e.sprite.texture = tex;
        e.sprite.visible = true;
        e.texture = 'ready';
        this.host.wake();
      })
      .catch(() => {
        if (e.textureKey === url) e.texture = 'missing';
      });
  }

  /** The owner flag (towers), the cleared mark and the waiting marker (wrecks): drawn when they change. */
  private drawMarks(e: Entry, force = false): void {
    const v = e.view;
    const key = `${v.ownerColor ?? ''}|${v.ownerShape}|${v.cleared}|${!!v.waiting}|${e.layout ? e.layout.height.toFixed(1) : ''}`;
    if (!force && key === e.marksKey) return;
    e.marksKey = key;
    const R = this.host.hexRadius;
    e.flag?.destroy();
    e.flag = null;
    e.mark?.destroy();
    e.mark = null;
    if (v.kind === 'tower' && v.ownerColor) {
      // The cloth hangs from the bare mast at the top of the tower (its approximate mount from the manifest).
      const at = e.layout?.flag ?? { x: 0, y: -(e.layout?.height ?? this.hexWidth * 2) };
      const g = new Graphics();
      const c = colorOf(v.ownerColor);
      const w = R * 0.5;
      const h = R * 0.34;
      g.moveTo(0, 0).lineTo(0, -R * 0.18).stroke({ width: 2, color: 0x3a2c1c });
      if (v.ownerShape === 'square') g.rect(1, -R * 0.18, w, h).fill({ color: c }).stroke({ width: 1, color: 0x1a1208, alpha: 0.7 });
      else g.poly([1, -R * 0.18, 1 + w * 1.15, -R * 0.18 + h / 2, 1, -R * 0.18 + h]).fill({ color: c }).stroke({ width: 1, color: 0x1a1208, alpha: 0.7 });
      g.position.set(at.x, at.y);
      e.pose.addChild(g);
      e.flag = g;
    }
    if (v.kind === 'wreck' && (v.cleared || v.waiting)) {
      const g = new Graphics();
      const top = -(e.layout?.height ?? this.hexWidth) * 0.55;
      const r = R * 0.26;
      if (v.waiting) {
        // A gold diamond: the artifact still waits at the wreck.
        g.poly([0, top - r * 1.2, r, top, 0, top + r * 1.2, -r, top]).fill({ color: 0xe8c25a }).stroke({ width: 1.5, color: 0x3a2808, alpha: 0.9 });
      } else {
        // The cleared mark: a navy disc with a pale tick.
        g.circle(0, top, r).fill({ color: 0x14203a, alpha: 0.88 }).stroke({ width: 1.5, color: 0xd9b45a, alpha: 0.95 });
        g.moveTo(-r * 0.45, top).lineTo(-r * 0.1, top + r * 0.38).lineTo(r * 0.5, top - r * 0.4).stroke({ width: 2, color: 0xf5e4b7, cap: 'round', join: 'round' });
      }
      e.root.addChild(g);
      e.mark = g;
    }
    e.sprite.alpha = v.kind === 'wreck' && v.cleared ? 0.62 : 1;
  }

  /** Bring the drawn sea sites in line with the view. */
  sync(views: readonly AdventureSeaSiteView[]): void {
    const seen = new Set<string>();
    for (const v of views) {
      seen.add(v.id);
      let e = this.entries.get(v.id);
      if (!e) {
        // Salvage already taken is never drawn (no fade on load or when it first comes into view).
        if (v.kind === 'pickup' && v.claimed) continue;
        e = this.create(v);
        this.entries.set(v.id, e);
      }
      const prev = e.view;
      e.view = v;
      if (prev.coord.q !== v.coord.q || prev.coord.r !== v.coord.r) this.place(e);
      this.applyArt(e);
      this.drawMarks(e);
      if (v.kind === 'pickup' && v.claimed && ((!prev.claimed && !e.gone && e.root.visible) || e.awaiting)) {
        // Taken in view: it fades once the ship that took it has arrived.
        e.awaiting = this.host.held(v.coord);
        if (!e.awaiting && e.fadeStart === null) e.fadeStart = this.time;
      } else if (v.kind === 'pickup' && v.claimed && e.fadeStart === null && !e.awaiting) {
        e.gone = true;
      }
      e.root.visible = v.shown && !e.gone;
    }
    for (const [id, e] of this.entries) {
      if (seen.has(id)) continue;
      e.root.destroy({ children: true });
      this.entries.delete(id);
    }
    this.host.wake();
  }

  tick(dt: number): void {
    this.time += dt;
    const motion = graphicsProfile().ambientMotion && !this.host.calm();
    for (const e of this.entries.values()) {
      if (e.fadeStart !== null) {
        const t = (this.time - e.fadeStart) / SEA_PICKUP_FADE_MS;
        if (t >= 1) {
          e.fadeStart = null;
          e.gone = true;
          e.root.visible = false;
          e.root.alpha = 1;
        } else e.root.alpha = 1 - t;
      }
      const b = seaSiteBob(e.view.kind, this.time, e.phase, !motion);
      e.pose.position.y = b.dy;
      e.pose.rotation = b.roll;
    }
  }

  debug(): Record<string, SeaSiteDebug> {
    const out: Record<string, SeaSiteDebug> = {};
    const z = this.host.zoom();
    const motion = graphicsProfile().ambientMotion && !this.host.calm();
    for (const [id, e] of this.entries) {
      const p = this.host.toScreen(e.root.x, e.root.y);
      const fl = e.flag && e.view.ownerColor ? this.host.toScreen(e.root.x + e.flag.x, e.root.y + e.flag.y) : null;
      out[id] = {
        kind: e.view.kind,
        assetId: e.view.assetId,
        texture: e.texture,
        visible: e.root.visible,
        alpha: e.gone ? 0 : e.root.alpha * e.sprite.alpha,
        x: p.x,
        y: p.y,
        width: (e.layout?.width ?? 0) * z,
        height: (e.layout?.height ?? 0) * z,
        flag: fl ? { x: fl.x, y: fl.y, color: e.view.ownerColor!, shape: e.view.ownerShape } : null,
        claimed: e.view.claimed,
        cleared: e.view.cleared,
        bob: motion && e.view.kind !== 'tower',
      };
    }
    return out;
  }

  dispose(): void {
    this.disposed = true;
    for (const e of this.entries.values()) if (!e.root.destroyed) e.root.destroy({ children: true });
    this.entries.clear();
  }
}
