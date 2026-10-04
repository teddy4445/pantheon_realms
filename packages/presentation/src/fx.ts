/**
 * Code-drawn magic and Favor effects (PixiJS): the cast sigil, what travels to
 * the target, what happens where it lands, the moment over the whole field,
 * and the looping status overlays on battle stacks. They draw the looks in
 * `fxLooks.ts` until effect strips are delivered: before every phase the
 * painter looks for a strip under the phase's asset ID (`fx.spell.<id>.cast`,
 * `fx.miracle.<id>.screen`, `fx.status.<name>`, …) in the sprite manifest and
 * plays that instead — a delivery is an art drop + import, never a code change.
 *
 * Everything runs on the view's TweenPlayer, so instant playback (speed 0) and
 * Skip finish an effect at once, and an effect never decides anything. On the
 * Low preset (`effects: 'simple'`) every phase is a short flash in the school's
 * colour and the whole-field moments are left out.
 */
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { FX_PALETTE, type FxLook, type FxSchool, type FxScreen, type StatusOverlay } from './fxLooks';
import { TweenPlayer, easeInOut, easeOut, linear } from './tween';
import { graphicsProfile } from './graphics';
import { spriteManifest, type EffectDefinition } from './sprites';
import { loadStrip, stripFrames } from './textures';

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Where an effect lands: the feet, the figure's drawn height, how wide it is (two-hex creatures ×1.7) and its facing. */
export interface FxTarget extends Pt {
  readonly height: number;
  readonly width: number;
  readonly facing: 1 | -1;
}

const TAU = Math.PI * 2;
/** Schools drawn with ordinary (not additive) blending: dark matter does not glow. */
const DARK: ReadonlySet<FxSchool> = new Set<FxSchool>(['swarm', 'obsidian', 'shadow', 'curse', 'blight', 'earth', 'fate']);
/** Schools whose sky strike is a lightning bolt (the others fall as streaks). */
const BOLT_SCHOOLS: ReadonlySet<FxSchool> = new Set<FxSchool>(['storm', 'strike', 'star', 'spirit', 'silver', 'frost']);

/** Small deterministic random source (looks vary per effect, not per frame). */
function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let seedCounter = 1;

let dot: Texture | null = null;
/** A soft round glow (64 px, white; tinted per particle). */
export function softDot(): Texture {
  if (dot) return dot;
  if (typeof document === 'undefined') return Texture.WHITE;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    grad.addColorStop(0.65, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  dot = Texture.from(c);
  return dot;
}

/** One particle: start, travel over its life, a fall (gravity) and a wobble across. */
interface Mote {
  readonly s: Sprite;
  readonly x0: number;
  readonly y0: number;
  readonly dx: number;
  readonly dy: number;
  /** Extra downward travel over the life, growing with time squared. */
  readonly fall: number;
  /** Start and length of its life as fractions of the effect. */
  readonly d: number;
  readonly l: number;
  readonly r0: number;
  readonly r1: number;
  readonly a: number;
  readonly wob: number;
  readonly wf: number;
  readonly ph: number;
  readonly ease: boolean;
}

interface MoteSpec {
  n: number;
  colors: readonly number[];
  add: boolean;
  /** Fills in one particle's start, travel and look from a random source. */
  make: (i: number, r: () => number) => Partial<Omit<Mote, 's'>> & { x0: number; y0: number };
}

function stepMotes(ms: readonly Mote[], t: number): void {
  for (const m of ms) {
    const k = (t - m.d) / m.l;
    if (k <= 0 || k >= 1) {
      m.s.visible = false;
      continue;
    }
    m.s.visible = true;
    const e = m.ease ? easeOut(k) : k;
    m.s.position.set(m.x0 + m.dx * e + (m.wob ? Math.sin((k * m.wf + m.ph) * TAU) * m.wob : 0), m.y0 + m.dy * e + m.fall * k * k);
    m.s.scale.set((m.r0 + (m.r1 - m.r0) * k) / 32);
    m.s.alpha = m.a * (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88);
  }
}

/** Points of an equilateral triangle (flat array) — two make the six-pointed sigil. */
function tri(r: number, rot: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    const a = rot + (i * TAU) / 3 - Math.PI / 2;
    out.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  return out;
}

/** A chevron (^ or v) centred on 0,0. */
function chevron(g: Graphics, w: number, h: number, up: boolean, color: number, alpha: number, width: number): void {
  const s = up ? 1 : -1;
  g.moveTo(-w / 2, (s * h) / 2).lineTo(0, (-s * h) / 2).lineTo(w / 2, (s * h) / 2).stroke({ width, color, alpha, cap: 'round', join: 'round' });
}

/** A heater shield outline, point down, centred on 0,0. */
function shieldShape(w: number, h: number): number[] {
  const pts: number[] = [];
  pts.push(-w / 2, -h / 2, w / 2, -h / 2, w / 2, -h * 0.05);
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push((w / 2) * Math.cos(a), -h * 0.05 + h * 0.55 * Math.sin(a));
  }
  for (let i = 5; i >= 0; i--) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push((-w / 2) * Math.cos(a), -h * 0.05 + h * 0.55 * Math.sin(a));
  }
  return pts;
}

export class FxPainter {
  /**
   * @param layer   where effects are drawn (inside the scaled board or world)
   * @param tweens  the view's playback clock (speed 0 = instant, flush = skip)
   * @param u       one hex radius in layer pixels
   * @param squash  vertical foreshortening of the ground plane
   * @param screen  a layer in screen pixels over the whole view, for whole-field moments
   */
  constructor(
    private readonly layer: Container,
    private readonly tweens: TweenPlayer,
    private readonly u: number,
    private readonly squash: number,
    private readonly screen?: { readonly layer: Container; readonly size: () => { width: number; height: number } },
  ) {}

  private get simple(): boolean {
    return graphicsProfile().effects === 'simple';
  }

  /** The delivered strip for an asset ID, if any (Low quality keeps the flash). */
  stripOf(id: string | undefined): EffectDefinition | null {
    if (!id || this.simple) return null;
    return spriteManifest().effects[id] ?? null;
  }

  // ------------------------------------------------------------------ building blocks

  private async run(parts: readonly Container[], ms: number, step: (t: number) => void, layer: Container = this.layer, ease = linear): Promise<void> {
    for (const p of parts) layer.addChild(p);
    try {
      step(0);
      await this.tweens.tween(ms, step, ease);
    } finally {
      for (const p of parts) if (!p.destroyed) p.destroy({ children: true });
    }
  }

  private motes(spec: MoteSpec): Mote[] {
    const r = rng(seedCounter++ * 7919);
    const out: Mote[] = [];
    for (let i = 0; i < spec.n; i++) {
      const m = spec.make(i, r);
      const s = new Sprite(softDot());
      s.anchor.set(0.5);
      s.tint = spec.colors[i % spec.colors.length]!;
      if (spec.add) s.blendMode = 'add';
      s.visible = false;
      out.push({ s, dx: 0, dy: 0, fall: 0, d: 0, l: 1, r0: this.u * 0.1, r1: this.u * 0.04, a: 1, wob: 0, wf: 1, ph: r(), ease: true, ...m });
    }
    return out;
  }

  /** Play a delivered strip once at a point (anchored as the strip says). */
  async strip(def: EffectDefinition, at: Pt, scale = 1, layer: Container = this.layer, flipX = false): Promise<void> {
    const frames = await loadStrip(def).catch(() => null);
    if (!frames || layer.destroyed) return;
    const s = new Sprite(frames[0] ?? Texture.EMPTY);
    s.anchor.set(def.anchor[0], def.anchor[1]);
    s.scale.set(((Math.sqrt(3) * this.u) / def.pixelsPerHex) * scale);
    if (flipX) s.scale.x *= -1;
    if (def.additive) s.blendMode = 'add';
    s.position.set(at.x, at.y);
    await this.run([s], (frames.length / Math.max(1, def.fps)) * 1000, (t) => {
      s.texture = frames[Math.min(frames.length - 1, Math.floor(t * frames.length))]!;
    }, layer);
  }

  /** A short soft flash (also the whole effect on Low). */
  flash(at: Pt, color: number, size = 1, ms = 300): Promise<void> {
    const s = new Sprite(softDot());
    s.anchor.set(0.5);
    s.tint = color;
    s.blendMode = 'add';
    s.position.set(at.x, at.y);
    const r = this.u * 1.3 * size;
    return this.run([s], ms, (t) => {
      s.scale.set((r * (0.6 + 0.6 * t)) / 32, (r * (0.6 + 0.6 * t) * this.squash) / 32);
      s.alpha = 0.85 * (1 - t);
    });
  }

  /** A ring on the ground growing from r0 to r1 (hex radii). */
  private ring(at: Pt, color: number, r0: number, r1: number, ms: number, width = 3, delay = 0, add = true): Promise<void> {
    const g = new Graphics();
    g.circle(0, 0, this.u).stroke({ width: width / Math.max(0.3, r1), color, alpha: 1 });
    if (add) g.blendMode = 'add';
    g.position.set(at.x, at.y);
    g.visible = false;
    return this.run([g], ms, (t) => {
      const k = (t - delay) / (1 - delay);
      if (k <= 0) return;
      g.visible = true;
      const r = r0 + (r1 - r0) * easeOut(k);
      g.scale.set(r, r * this.squash);
      g.alpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
    });
  }

  // ------------------------------------------------------------------ cast

  /** On the caster (the commander's banner corner, or the hero): a sigil opens and motes rise. */
  async cast(look: FxLook, at: Pt, id?: string): Promise<void> {
    const def = this.stripOf(id);
    if (def) return this.strip(def, at);
    const [core, glow, spark] = FX_PALETTE[look.school];
    if (this.simple) return this.flash(at, glow, 0.7, 260);
    const u = this.u;
    const sig = new Container();
    sig.position.set(at.x, at.y);
    const g = new Graphics();
    g.circle(0, 0, u * 0.82).stroke({ width: 2.6, color: glow, alpha: 0.95 });
    g.circle(0, 0, u * 0.62).stroke({ width: 1.2, color: spark, alpha: 0.85 });
    g.poly(tri(u * 0.6, 0)).stroke({ width: 1.6, color: core, alpha: 0.8 });
    g.poly(tri(u * 0.6, Math.PI)).stroke({ width: 1.6, color: core, alpha: 0.8 });
    for (let i = 0; i < 6; i++) g.circle(Math.cos((i * TAU) / 6) * u * 0.82, Math.sin((i * TAU) / 6) * u * 0.82, u * 0.07).fill({ color: core });
    g.blendMode = DARK.has(look.school) ? 'normal' : 'add';
    sig.addChild(g);
    const ms = this.motes({
      n: 10,
      colors: [spark, glow, core],
      add: !DARK.has(look.school),
      make: (_i, r) => ({ x0: at.x + (r() - 0.5) * u * 1.4, y0: at.y + (r() - 0.5) * u * 0.6, dy: -u * (0.8 + r() * 0.9), d: r() * 0.4, l: 0.6, r0: u * 0.14, r1: u * 0.04 }),
    });
    await this.run([sig, ...ms.map((m) => m.s)], 480, (t) => {
      const k = 0.3 + 0.7 * easeOut(Math.min(1, t / 0.45));
      sig.scale.set(k, k * this.squash);
      g.rotation = t * 1.4;
      sig.alpha = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
      stepMotes(ms, t);
    });
  }

  // ------------------------------------------------------------------ travel

  /** From the caster to the target (or from the sky above it for `sky`). */
  async travel(look: FxLook, from: Pt, to: Pt, id?: string, flipX = false): Promise<void> {
    if (look.travel === 'none' || this.simple) return;
    const def = this.stripOf(id);
    if (def && look.travel !== 'sky') return this.travelStrip(def, from, to, flipX);
    const r = rng(seedCounter++ * 104729);
    switch (look.travel) {
      case 'bolt':
        return this.bolt(look.school, from, to, 300);
      case 'sky': {
        const top = { x: to.x + (r() - 0.5) * this.u * 1.6, y: to.y - this.u * 8 };
        if (def) return this.travelStrip(def, top, to, false);
        if (BOLT_SCHOOLS.has(look.school)) return this.bolt(look.school, top, to, 320);
        return this.fall(look, top, to, look.impact === 'shards' ? 6 : 1);
      }
      case 'orb':
        return this.orb(look.school, from, to, 1);
      case 'arrow':
        return this.orb(look.school, from, to, 0.45, true);
      case 'swarm':
        return this.swarm(look.school, from, to);
      case 'wisp':
        return Promise.all([0, 1, 2].map((i) => this.orb(look.school, from, to, 0.55, false, (i - 1) * 0.9, i * 0.08))).then(() => undefined);
      default:
        return;
    }
  }

  private async travelStrip(def: EffectDefinition, from: Pt, to: Pt, flipX: boolean): Promise<void> {
    const frames = stripFrames(def) ?? (await loadStrip(def).catch(() => null));
    if (!frames || this.layer.destroyed) return;
    const s = new Sprite(frames[0] ?? Texture.EMPTY);
    s.anchor.set(def.anchor[0], def.anchor[1]);
    s.scale.set((Math.sqrt(3) * this.u) / def.pixelsPerHex);
    if (flipX) s.scale.x *= -1;
    if (def.additive) s.blendMode = 'add';
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const ms = Math.max(260, (dist / this.u) * 40);
    s.rotation = Math.atan2(to.y - from.y, to.x - from.x) + (flipX ? Math.PI : 0);
    await this.run([s], ms, (t) => {
      s.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
      s.texture = frames[Math.floor((t * ms * Math.max(1, def.fps)) / 1000) % frames.length]!;
    });
  }

  /** A forked bolt from one point to another, flickering out. */
  private async bolt(school: FxSchool, from: Pt, to: Pt, ms: number): Promise<void> {
    const [core, glow] = FX_PALETTE[school];
    const r = rng(seedCounter++ * 15485863);
    const u = this.u;
    const pts: Pt[] = [from];
    const n = 9;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < n; i++) {
      const k = i / n;
      const off = (r() - 0.5) * u * 0.9 * Math.sin(k * Math.PI);
      pts.push({ x: from.x + dx * k + nx * off, y: from.y + dy * k + ny * off });
    }
    pts.push(to);
    const g = new Graphics();
    const path = (w: number, color: number, alpha: number) => {
      g.moveTo(pts[0]!.x, pts[0]!.y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      g.stroke({ width: w, color, alpha, cap: 'round', join: 'round' });
    };
    path(9, glow, 0.35);
    path(2.6, core, 1);
    // One short fork from the middle.
    const m = pts[Math.floor(n / 2)]!;
    g.moveTo(m.x, m.y)
      .lineTo(m.x + nx * u * 0.9 + dx * 0.08, m.y + ny * u * 0.9 + dy * 0.08)
      .lineTo(m.x + nx * u * 1.2 + dx * 0.18, m.y + ny * u * 1.1 + dy * 0.18)
      .stroke({ width: 1.6, color: core, alpha: 0.8 });
    g.blendMode = 'add';
    const end = this.flash(to, glow, 0.9, ms);
    await Promise.all([
      end,
      this.run([g], ms, (t) => {
        g.alpha = t < 0.12 ? t / 0.12 : (1 - t) * (0.65 + 0.35 * Math.sin(t * 60));
      }),
    ]);
  }

  /** A glowing orb (or arrow streak) on an arc with a short trail. */
  private async orb(school: FxSchool, from: Pt, to: Pt, size: number, streak = false, sway = 0, delay = 0): Promise<void> {
    const [core, glow, spark] = FX_PALETTE[school];
    const u = this.u;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const arc = Math.min(u * 2.4, dist * (streak ? 0.08 : 0.2));
    const ms = Math.max(streak ? 220 : 320, (dist / u) * (streak ? 26 : 42)) + delay * 600;
    const add = !DARK.has(school);
    const head = new Sprite(softDot());
    head.anchor.set(0.5);
    head.tint = core;
    if (add) head.blendMode = 'add';
    const halo = new Sprite(softDot());
    halo.anchor.set(0.5);
    halo.tint = glow;
    if (add) halo.blendMode = 'add';
    const trail: Sprite[] = [];
    for (let i = 0; i < 7; i++) {
      const s = new Sprite(softDot());
      s.anchor.set(0.5);
      s.tint = i % 2 ? spark : glow;
      if (add) s.blendMode = 'add';
      trail.push(s);
    }
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = dist || 1;
    const at = (k: number): Pt => {
      const c = Math.max(0, Math.min(1, k));
      const w = sway ? Math.sin(c * Math.PI * 2) * sway * u * (1 - c) : 0;
      return { x: from.x + dx * c + (-dy / len) * w, y: from.y + dy * c - Math.sin(c * Math.PI) * arc + (dx / len) * w };
    };
    const d0 = delay * 600 / ms;
    await this.run([...trail, halo, head], ms, (t) => {
      const k = d0 >= 1 ? 1 : Math.max(0, (t - d0) / (1 - d0));
      const p = at(k);
      const vis = k > 0 && k < 1;
      head.visible = halo.visible = vis;
      head.position.set(p.x, p.y);
      halo.position.set(p.x, p.y);
      const q = at(k - 0.02);
      const rot = Math.atan2(p.y - q.y, p.x - q.x);
      if (streak) {
        head.scale.set((u * 1.1 * size) / 32, (u * 0.16 * size) / 32);
        head.rotation = rot;
        halo.scale.set((u * 1.6 * size) / 32, (u * 0.5 * size) / 32);
        halo.rotation = rot;
      } else {
        head.scale.set((u * 0.36 * size) / 32);
        halo.scale.set((u * 0.85 * size) / 32);
      }
      halo.alpha = 0.7;
      trail.forEach((s, i) => {
        const tk = k - (i + 1) * 0.035;
        s.visible = vis && tk > 0;
        const tp = at(tk);
        s.position.set(tp.x, tp.y);
        s.scale.set((u * 0.3 * size * (1 - i / 8)) / 32);
        s.alpha = 0.55 * (1 - i / 7);
      });
    });
  }

  /** A tide of small things (scarabs, hounds' sparks) pouring from the caster to the target. */
  private async swarm(school: FxSchool, from: Pt, to: Pt): Promise<void> {
    const [core, glow, spark] = FX_PALETTE[school];
    const u = this.u;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const ms = Math.max(420, (len / u) * 50);
    const add = !DARK.has(school);
    const parts = this.motes({
      n: 22,
      colors: [glow, spark, core],
      add,
      make: (_i, r) => {
        const off = (r() - 0.5) * u * 1.2;
        return { x0: from.x + (-dy / len) * off, y0: from.y + (dx / len) * off, dx, dy, d: r() * 0.35, l: 0.65, r0: u * (add ? 0.16 : 0.12), r1: u * 0.1, a: add ? 0.9 : 1, wob: u * 0.3, wf: 2 + r() * 2, ease: false };
      },
    });
    await this.run(parts.map((m) => m.s), ms, (t) => stepMotes(parts, t));
  }

  /** Streaks falling from the sky onto a point (meteor, shards, a falling star). */
  private async fall(look: FxLook, top: Pt, to: Pt, count: number): Promise<void> {
    const r = rng(seedCounter++ * 31337);
    const u = this.u;
    await Promise.all(
      Array.from({ length: count }, (_, i) => {
        const ox = count > 1 ? (r() - 0.5) * u * 1.6 : 0;
        const oy = count > 1 ? (r() - 0.5) * u * 0.5 : 0;
        return this.tweens.wait(i * 60).then(() => this.orb(look.school, { x: top.x + ox, y: top.y }, { x: to.x + ox * 0.5, y: to.y + oy }, count > 1 ? 0.55 : 1, true));
      }),
    );
  }

  // ------------------------------------------------------------------ impact

  /** Where the spell lands, on one stack, hero or town (`at`: its feet). */
  async impact(look: FxLook, at: FxTarget, id?: string): Promise<void> {
    const def = this.stripOf(id);
    if (def) return this.strip(def, at, at.width, this.layer, at.facing === -1);
    const [core, glow, spark] = FX_PALETTE[look.school];
    const chest = { x: at.x, y: at.y - at.height * 0.5 };
    if (this.simple) return this.flash(chest, glow, at.width, 320);
    const u = this.u;
    const w = at.width;
    const h = Math.max(u * 0.9, at.height);
    const add = !DARK.has(look.school);
    const motes = (n: number, ms: number, make: MoteSpec['make'], colors: readonly number[] = [spark, glow, core], blend = add) => {
      const list = this.motes({ n, colors, add: blend, make });
      return this.run(list.map((m) => m.s), ms, (t) => stepMotes(list, t));
    };
    const all = (...p: Promise<void>[]) => Promise.all(p).then(() => undefined);
    switch (look.impact) {
      case 'sparks':
        return all(
          this.flash(chest, core, 0.8, 260),
          motes(14, 440, (_i, r) => {
            const a = r() * TAU;
            return { x0: chest.x, y0: chest.y, dx: Math.cos(a) * u * (0.7 + r() * 0.8), dy: Math.sin(a) * u * (0.5 + r() * 0.6), fall: u * 0.6, l: 0.8 + r() * 0.2, r0: u * 0.12, r1: u * 0.03 };
          }),
        );
      case 'flame':
        return all(
          this.flash(chest, glow, w, 320),
          this.scorch(at, w, 0.42),
          motes(20, 680, (_i, r) => ({ x0: at.x + (r() - 0.5) * u * 1.1 * w, y0: at.y - r() * h * 0.4, dx: (r() - 0.5) * u * 0.4, dy: -u * (0.9 + r() * 1.3), d: r() * 0.35, l: 0.6, r0: u * (0.28 + r() * 0.12), r1: u * 0.05, wob: u * 0.12, wf: 2 }), [glow, core, spark]),
        );
      case 'heal':
        return all(
          this.ring(at, glow, 0.3, 0.85 * w, 700, 3),
          this.flash(chest, glow, 0.7 * w, 520),
          motes(18, 820, (_i, r) => ({ x0: at.x + (r() - 0.5) * u * 1.2 * w, y0: at.y - r() * u * 0.2, dy: -h * (0.8 + r() * 0.5), d: r() * 0.45, l: 0.55, r0: u * 0.13, r1: u * 0.05, wob: u * 0.1, wf: 1.5 })),
        );
      case 'glyph':
        return all(this.glyph(look.school, at, h, w), motes(8, 700, (_i, r) => ({ x0: at.x + (r() - 0.5) * u * w, y0: at.y - h * (0.3 + r() * 0.7), dy: -u * 0.3, d: 0.3 + r() * 0.3, l: 0.4, r0: u * 0.12, r1: u * 0.02 })));
      case 'curse':
        return all(
          this.ring(at, glow, 0.95 * w, 0.3, 720, 3, 0, false),
          motes(7, 780, (i, r) => {
            const a = (i / 7) * TAU;
            return { x0: at.x + Math.cos(a) * u * 1.2, y0: at.y - h - u * 0.2 + Math.sin(a) * u * 0.4, dx: -Math.cos(a) * u * 1.0, dy: -Math.sin(a) * u * 0.3, l: 1, r0: u * 0.5, r1: u * 0.7, a: 0.55 + r() * 0.2 };
          }, [spark, glow], false),
        );
      case 'ring':
        return all(
          this.ring(at, glow, 0.25, 0.95 * w, 650, 3.5),
          this.ring(at, core, 0.2, 0.75 * w, 650, 2, 0.25),
          motes(6, 650, (i) => ({ x0: at.x + Math.cos((i / 6) * TAU) * u * 0.8 * w, y0: at.y + Math.sin((i / 6) * TAU) * u * 0.8 * this.squash, dy: -u * 0.8, d: 0.2, l: 0.7, r0: u * 0.12, r1: u * 0.03 })),
        );
      case 'wind':
        return this.windArcs(look.school, at, h, w, 720);
      case 'frost':
        return all(this.shards(at, w, [core, spark], 8, 640, true), motes(10, 760, (_i, r) => ({ x0: at.x + (r() - 0.5) * u * 1.4 * w, y0: at.y - r() * u * 0.3, dx: (r() - 0.5) * u * 0.6, dy: -u * 0.3, l: 1, r0: u * 0.35, r1: u * 0.55, a: 0.5 }), [0xffffff, glow]));
      case 'thorns':
        return this.thorns(look.school, at, h, w);
      case 'shock':
        return all(
          this.flash(chest, core, 1.1 * w, 300),
          this.ring(at, glow, 0.3, 1.25 * w, 480, 4),
          this.ring(at, core, 0.2, 0.95 * w, 480, 2, 0.15),
          motes(10, 460, (_i, r) => {
            const a = r() * TAU;
            return { x0: chest.x, y0: chest.y, dx: Math.cos(a) * u * 1.1, dy: Math.sin(a) * u * 0.6, fall: u * 0.4, l: 0.8, r0: u * 0.1, r1: u * 0.03 };
          }),
        );
      case 'shards':
        return all(this.shards(at, w, [glow, spark], 9, 520, false), this.flash(chest, spark, 0.6 * w, 260));
      case 'pillar':
        return all(this.pillar(look.school, at, h, w, 820), this.ring(at, glow, 0.3, 1.0 * w, 820, 3, 0.15));
      case 'petals':
        return motes(16, 1050, (_i, r) => ({ x0: at.x + (r() - 0.5) * u * 1.8 * w, y0: at.y - h - u * (0.3 + r() * 0.8), dx: (r() - 0.3) * u * 0.8, dy: h + u * 0.4, d: r() * 0.4, l: 0.6, r0: u * 0.11, r1: u * 0.09, a: 0.95, wob: u * 0.25, wf: 1.2, ease: false }), [spark, glow, core], false);
      case 'runes':
        return all(this.runes(look.school, at, w), motes(10, 600, (_i, r) => ({ x0: at.x + (r() - 0.5) * u * 1.4 * w, y0: at.y, dx: (r() - 0.5) * u * 0.9, dy: -u * 0.3, d: 0.25, l: 0.75, r0: u * 0.25, r1: u * 0.4, a: 0.45 }), [0x8a7a62, 0x6a5a48], false));
      case 'mist':
        return motes(9, 1000, (_i, r) => ({ x0: at.x + (r() - 0.5) * u * 1.6 * w, y0: at.y - r() * u * 0.4, dx: (r() - 0.5) * u * 1.4, dy: -u * 0.1, l: 1, r0: u * 0.45, r1: u * 0.75, a: 0.5 }), [glow, spark], false);
      case 'shield':
        return this.shield(look.school, at, h, w);
      case 'dome':
        return this.dome(look.school, at, h, w);
      case 'chevrons':
        return all(this.chevrons(look.school, at, h), motes(10, 650, (_i, r) => ({ x0: at.x + (r() - 0.5) * u * 1.1 * w, y0: at.y - r() * h * 0.6, dy: -u * (0.6 + r() * 0.6), d: r() * 0.3, l: 0.65, r0: u * 0.11, r1: u * 0.03 }), [spark, glow]));
      case 'drain':
        return all(
          motes(14, 760, (_i, r) => {
            const a = r() * TAU;
            return { x0: at.x + (r() - 0.5) * u * 0.8 * w, y0: at.y - h * (0.2 + r() * 0.6), dx: Math.cos(a) * u * 0.7, dy: -u * (0.6 + r() * 0.5), d: r() * 0.3, l: 0.7, r0: u * 0.16, r1: u * 0.06 };
          }, [glow, spark], false),
          this.flash(chest, glow, 0.6 * w, 420),
        );
      case 'stars':
        return all(
          this.fall(look, { x: at.x - u * 2.5, y: at.y - u * 7 }, chest, 3),
          this.tweens.wait(260).then(() => this.flash(chest, spark, 0.8 * w, 300)),
        );
      case 'reveal':
        return all(this.ring(at, glow, 0.2, 1.6 * w, 900, 3), this.ring(at, core, 0.1, 1.2 * w, 900, 2, 0.2));
      case 'coins':
        return this.coins(chest, 14, w);
      case 'motes':
      default:
        return motes(16, 900, (_i, r) => ({ x0: at.x + (r() - 0.5) * u * 1.4 * w, y0: at.y - r() * h * 0.5, dy: -u * (0.8 + r() * 0.8), d: r() * 0.45, l: 0.55, r0: u * 0.14, r1: u * 0.04, wob: u * 0.12, wf: 1.3 }));
    }
  }

  /** A dark ground mark that fades (fire). */
  private scorch(at: Pt, w: number, alpha: number): Promise<void> {
    const g = new Graphics();
    g.ellipse(0, 0, this.u * 0.7 * w, this.u * 0.7 * w * this.squash * 0.62).fill({ color: 0x1a0f08, alpha: 1 });
    g.position.set(at.x, at.y);
    return this.run([g], 900, (t) => (g.alpha = alpha * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85)));
  }

  /** The god's sigil descends onto the stack and settles at its feet. */
  private glyph(school: FxSchool, at: FxTarget, h: number, w: number): Promise<void> {
    const [core, glow] = FX_PALETTE[school];
    const u = this.u;
    const c = new Container();
    const g = new Graphics();
    g.circle(0, 0, u * 0.7).stroke({ width: 2.4, color: glow, alpha: 1 });
    g.poly(tri(u * 0.55, 0)).stroke({ width: 1.8, color: core, alpha: 0.95 });
    g.poly(tri(u * 0.55, Math.PI)).stroke({ width: 1.8, color: core, alpha: 0.95 });
    g.circle(0, 0, u * 0.14).fill({ color: core, alpha: 0.9 });
    g.blendMode = 'add';
    c.addChild(g);
    return this.run([c], 760, (t) => {
      const k = easeInOut(Math.min(1, t / 0.7));
      c.position.set(at.x, at.y - (h + u * 0.4) * (1 - k));
      const s = (0.55 + 0.45 * k) * w;
      c.scale.set(s, s * this.squash);
      g.rotation = t * 2;
      c.alpha = t < 0.1 ? t / 0.1 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    });
  }

  /** Curving streaks circling the stack. */
  private windArcs(school: FxSchool, at: FxTarget, h: number, w: number, ms: number): Promise<void> {
    const [core, glow] = FX_PALETTE[school];
    const u = this.u;
    const arcs: Container[] = [];
    const gs: Graphics[] = [];
    for (let i = 0; i < 4; i++) {
      const c = new Container();
      c.position.set(at.x, at.y - h * (0.1 + i * 0.22));
      c.scale.set(w, this.squash * 0.55);
      const g = new Graphics();
      g.arc(0, 0, u * (0.75 - i * 0.08), 0, Math.PI * 0.9).stroke({ width: 3 - i * 0.4, color: i % 2 ? glow : core, alpha: 0.9, cap: 'round' });
      g.blendMode = 'add';
      c.addChild(g);
      arcs.push(c);
      gs.push(g);
    }
    return this.run(arcs, ms, (t) => {
      gs.forEach((g, i) => {
        g.rotation = t * (5 + i) + i * 1.3;
        g.alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      });
    });
  }

  /** Diamond shards bursting out from the feet (ice) or falling glass breaking (obsidian). */
  private shards(at: FxTarget, w: number, colors: readonly number[], n: number, ms: number, ice: boolean): Promise<void> {
    const r = rng(seedCounter++ * 7);
    const u = this.u;
    const parts: { g: Graphics; a: number; d: number; spin: number }[] = [];
    for (let i = 0; i < n; i++) {
      const g = new Graphics();
      const s = u * (0.14 + r() * 0.12);
      g.poly([0, -s * 1.6, s * 0.5, 0, 0, s * 1.6, -s * 0.5, 0]).fill({ color: colors[i % colors.length]!, alpha: 0.95 });
      if (ice) g.blendMode = 'add';
      g.position.set(at.x, at.y - u * 0.15);
      parts.push({ g, a: (i / n) * TAU + r() * 0.4, d: u * (0.5 + r() * 0.5) * w, spin: (r() - 0.5) * 4 });
    }
    return this.run(parts.map((p) => p.g), ms, (t) => {
      const k = easeOut(t);
      for (const p of parts) {
        p.g.position.set(at.x + Math.cos(p.a) * p.d * k, at.y - u * 0.15 + Math.sin(p.a) * p.d * k * this.squash - (ice ? u * 0.25 * Math.sin(t * Math.PI) : 0));
        p.g.rotation = ice ? p.a + Math.PI / 2 : p.spin * t;
        p.g.scale.set(ice ? 0.4 + 0.6 * k : 1);
        p.g.alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      }
    });
  }

  /** Vines bursting from the ground and coiling up the stack's legs. */
  private thorns(school: FxSchool, at: FxTarget, h: number, w: number): Promise<void> {
    const [, glow, spark] = FX_PALETTE[school];
    const u = this.u;
    const r = rng(seedCounter++ * 13);
    const vines = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * TAU + r() * 0.5;
      return { x: Math.cos(a) * u * 0.75 * w, y: Math.sin(a) * u * 0.75 * w * this.squash * 0.6, top: h * (0.35 + r() * 0.3), bend: (r() - 0.5) * u * 1.2 };
    });
    const g = new Graphics();
    g.position.set(at.x, at.y);
    return this.run([g], 760, (t) => {
      const k = easeOut(Math.min(1, t / 0.5));
      g.clear();
      for (const v of vines) {
        const ex = v.x * 0.35;
        const ey = -v.top * k;
        g.moveTo(v.x, v.y).quadraticCurveTo(v.x + v.bend, (v.y + ey) / 2, ex, ey).stroke({ width: 3.2, color: 0x2f4a1e, alpha: 1, cap: 'round' });
        g.moveTo(v.x, v.y).quadraticCurveTo(v.x + v.bend, (v.y + ey) / 2, ex, ey).stroke({ width: 1.4, color: glow, alpha: 0.9, cap: 'round' });
        g.circle(ex, ey, u * 0.07).fill({ color: spark });
      }
      g.alpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    });
  }

  /** A column of light from the sky to the ground. */
  private pillar(school: FxSchool, at: FxTarget, h: number, w: number, ms: number): Promise<void> {
    const [core, glow] = FX_PALETTE[school];
    const u = this.u;
    const tall = h + u * 4;
    const outer = new Sprite(softDot());
    const inner = new Sprite(softDot());
    for (const [s, c] of [[outer, glow], [inner, core]] as const) {
      s.anchor.set(0.5, 0.5);
      s.tint = c;
      s.blendMode = 'add';
      s.position.set(at.x, at.y - tall / 2 + u * 0.2);
    }
    return this.run([outer, inner], ms, (t) => {
      const k = t < 0.25 ? easeOut(t / 0.25) : 1;
      const fade = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      outer.scale.set((u * 1.1 * w) / 32, (tall * 0.62 * k) / 32);
      inner.scale.set((u * 0.42 * w) / 32, (tall * 0.6 * k) / 32);
      outer.alpha = 0.75 * fade;
      inner.alpha = fade;
    });
  }

  /** Three runes slam into the ground around the feet. */
  private runes(school: FxSchool, at: FxTarget, w: number): Promise<void> {
    const [core, glow] = FX_PALETTE[school];
    const u = this.u;
    const shapes: Graphics[] = [];
    const draw = (g: Graphics, kind: number) => {
      const s = u * 0.32;
      const st = { width: 3, color: glow, alpha: 1, cap: 'round' as const };
      if (kind === 0) g.moveTo(0, s).lineTo(0, -s).moveTo(-s * 0.6, -s * 0.4).lineTo(0, -s).lineTo(s * 0.6, -s * 0.4).stroke(st); // Tyr's arrow
      else if (kind === 1) g.moveTo(-s * 0.4, s).lineTo(-s * 0.4, -s).lineTo(s * 0.5, -s * 0.3).lineTo(-s * 0.4, s * 0.1).lineTo(s * 0.5, s).stroke(st);
      else g.moveTo(0, s).lineTo(0, -s).moveTo(0, -s * 0.2).lineTo(s * 0.6, -s * 0.8).moveTo(0, s * 0.3).lineTo(s * 0.6, -s * 0.2).stroke(st);
      g.circle(0, 0, s * 1.25).stroke({ width: 1.2, color: core, alpha: 0.6 });
      g.blendMode = DARK.has(school) ? 'normal' : 'add';
    };
    const spots = [-0.65, 0, 0.65];
    spots.forEach((dx, i) => {
      const g = new Graphics();
      draw(g, i);
      shapes.push(g);
    });
    return this.run(shapes, 720, (t) => {
      shapes.forEach((g, i) => {
        const k = Math.max(0, Math.min(1, (t - i * 0.1) / 0.3));
        g.position.set(at.x + spots[i]! * u * w, at.y + (i === 1 ? u * 0.25 : 0) - u * 1.4 * (1 - easeOut(k)));
        g.alpha = k <= 0 ? 0 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
        g.scale.set(1, k < 1 ? 1 : 0.9);
      });
    });
  }

  /** A shield of light forms in front of the stack, facing its enemies. */
  private shield(school: FxSchool, at: FxTarget, h: number, w: number): Promise<void> {
    const [core, glow] = FX_PALETTE[school];
    const u = this.u;
    const g = new Graphics();
    const pts = shieldShape(u * 0.75, u * 1.0);
    g.poly(pts).fill({ color: glow, alpha: 0.28 }).stroke({ width: 2.6, color: core, alpha: 0.95 });
    g.moveTo(0, -u * 0.38).lineTo(0, u * 0.3).moveTo(-u * 0.22, -u * 0.12).lineTo(u * 0.22, -u * 0.12).stroke({ width: 1.6, color: core, alpha: 0.8 });
    g.blendMode = 'add';
    g.position.set(at.x + at.facing * u * 0.62 * w, at.y - h * 0.45);
    return this.run([g], 720, (t) => {
      const k = easeOut(Math.min(1, t / 0.35));
      g.scale.set((0.55 + 0.45 * k) * 0.8, 0.55 + 0.45 * k);
      g.alpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    });
  }

  /** A dome of light over the stack; its edge shimmers. */
  private dome(school: FxSchool, at: FxTarget, h: number, w: number): Promise<void> {
    const [core, glow] = FX_PALETTE[school];
    const u = this.u;
    const g = new Graphics();
    const rx = u * 0.85 * w;
    const ry = h * 1.05;
    // Upper half of an ellipse (sampled), filled faintly with a bright rim.
    const pts: number[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI + (i / 24) * Math.PI;
      pts.push(Math.cos(a) * rx, Math.sin(a) * ry);
    }
    g.poly(pts).fill({ color: glow, alpha: 0.16 });
    g.moveTo(pts[0]!, pts[1]!);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
    g.stroke({ width: 2.4, color: core, alpha: 0.9 });
    g.ellipse(0, 0, rx, rx * this.squash * 0.62).stroke({ width: 1.6, color: glow, alpha: 0.7 });
    g.blendMode = 'add';
    g.position.set(at.x, at.y);
    return this.run([g], 800, (t) => {
      const k = easeOut(Math.min(1, t / 0.35));
      g.scale.set(0.6 + 0.4 * k);
      g.alpha = (t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1) * (0.85 + 0.15 * Math.sin(t * 40));
    });
  }

  /** Rising chevrons over the head (strength, fury). */
  private chevrons(school: FxSchool, at: FxTarget, h: number): Promise<void> {
    const [core, glow] = FX_PALETTE[school];
    const u = this.u;
    const gs = [0, 1, 2].map(() => {
      const g = new Graphics();
      chevron(g, u * 0.7, u * 0.32, true, glow, 1, 4);
      chevron(g, u * 0.7, u * 0.32, true, core, 1, 1.6);
      g.blendMode = 'add';
      return g;
    });
    return this.run(gs, 700, (t) => {
      gs.forEach((g, i) => {
        const k = (t - i * 0.15) / 0.7;
        g.visible = k > 0 && k < 1;
        g.position.set(at.x, at.y - h * 0.4 - u * 1.2 * easeOut(Math.max(0, k)));
        g.alpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      });
    });
  }

  /** Gold coins tossed up from a point, spinning as they fall. */
  coins(at: Pt, n: number, w = 1): Promise<void> {
    if (this.simple) return this.flash(at, 0xf3c86b, 0.8, 320);
    const r = rng(seedCounter++ * 29);
    const u = this.u;
    const parts = Array.from({ length: n }, () => {
      const g = new Graphics();
      g.circle(0, 0, u * 0.16).fill({ color: 0xf3c86b }).stroke({ width: 1.4, color: 0x8a5a1a });
      g.circle(0, 0, u * 0.08).stroke({ width: 1, color: 0xfff1b0, alpha: 0.9 });
      return { g, dx: (r() - 0.5) * u * 2.2 * w, up: u * (1.2 + r() * 1.2), spin: 3 + r() * 5, d: r() * 0.25 };
    });
    return this.run(parts.map((p) => p.g), 900, (t) => {
      for (const p of parts) {
        const k = Math.max(0, (t - p.d) / (1 - p.d));
        p.g.visible = k > 0;
        p.g.position.set(at.x + p.dx * k, at.y - p.up * Math.sin(k * Math.PI) + u * 0.6 * k);
        p.g.scale.set(Math.abs(Math.cos(k * p.spin * Math.PI)) * 0.9 + 0.1, 1);
        p.g.alpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      }
    });
  }

  // ------------------------------------------------------------------ map area

  /** A ring spreading over the ground to a radius (pixels): the fog lifts in it (reveal spells, town miracles). */
  async area(look: FxLook, at: Pt, radius: number, id?: string): Promise<void> {
    const def = this.stripOf(id);
    if (def) return this.strip(def, at, radius / (Math.sqrt(3) * this.u));
    const [core, glow, spark] = FX_PALETTE[look.school];
    if (this.simple) return this.flash(at, glow, radius / this.u / 1.3, 420);
    const u = this.u;
    const k = radius / u;
    const fill = new Sprite(softDot());
    fill.anchor.set(0.5);
    fill.tint = glow;
    fill.blendMode = 'add';
    fill.position.set(at.x, at.y);
    const list = this.motes({
      n: Math.min(40, 12 + Math.round(k * 2)),
      colors: [spark, glow, core],
      add: true,
      make: (_i, r) => {
        const a = r() * TAU;
        const d = Math.sqrt(r()) * radius;
        return { x0: at.x + Math.cos(a) * d, y0: at.y + Math.sin(a) * d * this.squash, dy: -u * (0.6 + r() * 0.8), d: (d / radius) * 0.5, l: 0.5, r0: u * 0.16, r1: u * 0.04 };
      },
    });
    await Promise.all([
      this.ring(at, glow, 0.2, k, 1100, 4),
      this.ring(at, core, 0.1, k * 0.8, 1100, 2, 0.2),
      this.run([fill, ...list.map((m) => m.s)], 1100, (t) => {
        const e = easeOut(t);
        fill.scale.set((radius * 2.1 * e) / 32, (radius * 2.1 * e * this.squash) / 32);
        fill.alpha = 0.35 * (1 - t);
        stepMotes(list, t);
      }),
    ]);
  }

  // ------------------------------------------------------------------ whole field

  /** A moment over the whole view (army spells, battle miracles). `dir`: 1 = from the left (attacker's side). */
  async screenFx(kind: FxScreen, school: FxSchool, dir: 1 | -1 = 1, id?: string): Promise<void> {
    const sc = this.screen;
    if (!sc || kind === 'none' || this.simple) return;
    const { width: W, height: H } = sc.size();
    const def = this.stripOf(id);
    if (def) {
      // A delivered screen strip is stretched over the view.
      const frames = await loadStrip(def).catch(() => null);
      if (!frames || sc.layer.destroyed) return;
      const s = new Sprite(frames[0] ?? Texture.EMPTY);
      s.width = W;
      s.height = H;
      if (def.additive) s.blendMode = 'add';
      return this.run([s], (frames.length / Math.max(1, def.fps)) * 1000, (t) => (s.texture = frames[Math.min(frames.length - 1, Math.floor(t * frames.length))]!), sc.layer);
    }
    const [core, glow, spark] = FX_PALETTE[school];
    const tint = (color: number, peak: number, ms: number, add = false, hold = 0.4) => {
      const g = new Graphics().rect(0, 0, W, H).fill({ color });
      if (add) g.blendMode = 'add';
      return this.run([g], ms, (t) => {
        const up = (1 - hold) / 2;
        g.alpha = peak * (t < up ? t / up : t > 1 - up ? (1 - t) / up : 1);
      }, sc.layer);
    };
    const streaks = (n: number, color: number, ms: number, rain: boolean) => {
      const r = rng(seedCounter++ * 3);
      const parts = Array.from({ length: n }, () => {
        const s = new Sprite(softDot());
        s.anchor.set(0.5);
        s.tint = color;
        s.blendMode = 'add';
        return { s, x: r() * W, y: r() * H, d: r() * 0.5, sp: 0.6 + r() * 0.6 };
      });
      return this.run(parts.map((p) => p.s), ms, (t) => {
        for (const p of parts) {
          const k = (t - p.d) / 0.5;
          p.s.visible = k > 0 && k < 1;
          if (rain) {
            p.s.position.set(p.x - k * H * 0.15, ((p.y + k * H * p.sp) % H));
            p.s.scale.set(1.5 / 32, (H * 0.05) / 32);
            p.s.rotation = 0.15;
            p.s.alpha = 0.45;
          } else {
            p.s.position.set(dir === 1 ? -W * 0.2 + k * W * 1.4 * p.sp : W * 1.2 - k * W * 1.4 * p.sp, p.y);
            p.s.scale.set((W * 0.12) / 32, 2.4 / 32);
            p.s.alpha = 0.5 * Math.sin(Math.max(0, Math.min(1, k)) * Math.PI);
          }
        }
      }, sc.layer);
    };
    const rise = (n: number, ms: number) => {
      const list = this.motes({ n, colors: [spark, glow, core], add: true, make: (_i, r) => ({ x0: r() * W, y0: H * (0.55 + r() * 0.45), dy: -H * (0.2 + r() * 0.25), d: r() * 0.5, l: 0.5, r0: 6, r1: 2, wob: 8, wf: 1 }) });
      return this.run(list.map((m) => m.s), ms, (t) => stepMotes(list, t), sc.layer);
    };
    const all = (...p: Promise<void>[]) => Promise.all(p).then(() => undefined);
    switch (kind) {
      case 'night':
        return all(tint(0x070b1e, 0.45, 1300, false, 0.5));
      case 'storm':
        return all(
          tint(0x10141e, 0.38, 1300, false, 0.5),
          this.tweens.wait(380).then(() => tint(0xffffff, 0.2, 140, true, 0)),
          this.tweens.wait(700).then(() => tint(0xffffff, 0.14, 120, true, 0)),
        );
      case 'glow':
        return all(tint(glow, 0.16, 1200, true), rise(30, 1200));
      case 'wind':
        return all(streaks(16, 0xffffff, 1000, false), tint(glow, 0.06, 1000, true));
      case 'mist': {
        const list = this.motes({ n: 12, colors: [glow, spark], add: false, make: (_i, r) => ({ x0: r() * W, y0: H * (0.5 + r() * 0.5), dx: dir * W * 0.12, l: 1, r0: H * 0.18, r1: H * 0.24, a: 0.32, ease: false }) });
        return this.run(list.map((m) => m.s), 1400, (t) => stepMotes(list, t), sc.layer);
      }
      case 'rain':
        return all(tint(0x10202a, 0.18, 1300, false, 0.5), streaks(70, 0x9fe8ef, 1300, true));
      case 'sun': {
        const s = new Sprite(softDot());
        s.anchor.set(0.5);
        s.tint = glow;
        s.blendMode = 'add';
        s.position.set(dir === 1 ? -W * 0.05 : W * 1.05, H * 0.75);
        return all(
          tint(core, 0.1, 1300, true),
          this.run([s], 1300, (t) => {
            s.scale.set((H * 1.6 * (0.7 + 0.3 * t)) / 32);
            s.alpha = 0.5 * Math.sin(t * Math.PI);
          }, sc.layer),
        );
      }
      case 'dusk':
        return all(tint(0x2a1e36, 0.32, 1200, false, 0.5));
      default:
        return;
    }
  }
}

// ---------------------------------------------------------------------- status overlays

interface AuraPart {
  readonly kind: StatusOverlay;
  readonly node: Container;
  /** Animate with the scene time (ms). */
  readonly anim: (time: number) => void;
}

/**
 * The looping overlays a battle stack's statuses leave on it (one shape per
 * status, so they never rely on colour alone). `back` goes under the figure
 * (ground rings, haze at the feet), `front` over it (chevrons, sparkles, the
 * shield). They stay still when ambient motion is off (Low) or the player
 * asked for reduced motion; a delivered `fx.status.<name>` strip replaces the
 * drawn shape.
 */
export class StatusAura {
  readonly back = new Container();
  readonly front = new Container();
  private parts: AuraPart[] = [];
  private key = '';

  constructor(
    private readonly u: number,
    private readonly squash: number,
  ) {}

  /** Show these overlays (rebuilt only when the set or the figure's size changes). */
  set(kinds: readonly StatusOverlay[], height: number, width: number, facing: 1 | -1): void {
    const key = `${kinds.join(',')}|${Math.round(height / 4)}|${width}|${facing}`;
    if (key === this.key) return;
    this.key = key;
    this.removeParts();
    for (const k of kinds) {
      const p = this.build(k, Math.max(this.u * 0.9, height), width, facing);
      if (!p) continue;
      (isBack(k) ? this.back : this.front).addChild(p.node);
      this.parts.push(p);
    }
    this.update(0);
  }

  get kinds(): StatusOverlay[] {
    return this.parts.map((p) => p.kind);
  }

  update(time: number): void {
    for (const p of this.parts) p.anim(time);
  }

  /** Show nothing (the next `set` draws again). */
  clear(): void {
    this.removeParts();
    this.key = '';
  }

  private removeParts(): void {
    for (const p of this.parts) p.node.destroy({ children: true });
    this.parts = [];
  }

  destroy(): void {
    this.removeParts();
    this.back.destroy({ children: true });
    this.front.destroy({ children: true });
  }

  private build(kind: StatusOverlay, h: number, w: number, facing: 1 | -1): AuraPart | null {
    const def = spriteManifest().effects[`fx.status.${kind}`];
    if (def) return this.stripPart(kind, def, h, w);
    const u = this.u;
    const S = this.squash;
    const node = new Container();
    const g = new Graphics();
    node.addChild(g);
    switch (kind) {
      case 'attack_up':
      case 'attack_down': {
        const up = kind === 'attack_up';
        const [core, glow] = up ? FX_PALETTE.rage : FX_PALETTE.curse;
        const gs = [0, 1].map((i) => {
          const c = new Graphics();
          chevron(c, u * 0.42, u * 0.2, up, glow, 0.95, 3.4);
          chevron(c, u * 0.42, u * 0.2, up, core, 1, 1.3);
          if (up) c.blendMode = 'add';
          c.y = i * u * 0.22 * (up ? 1 : -1);
          node.addChild(c);
          return c;
        });
        node.position.set(w * u * 0.55, -h - u * 0.1);
        return {
          kind,
          node,
          anim: (t) => {
            const k = (t / 1600) % 1;
            gs.forEach((c, i) => {
              const kk = (k + i * 0.5) % 1;
              c.y = (up ? -1 : 1) * kk * u * 0.35;
              c.alpha = Math.sin(kk * Math.PI);
            });
          },
        };
      }
      case 'defense_up':
      case 'defense_down': {
        const up = kind === 'defense_up';
        const [core, glow] = up ? FX_PALETTE.silver : FX_PALETTE.curse;
        node.scale.set(w, S * 0.62);
        // Outside the side marker and the active stack's ring, so all three read at once.
        const r = u * 1.0;
        if (up) {
          g.circle(0, 0, r).stroke({ width: 3, color: glow, alpha: 0.95 });
          for (let i = 0; i < 4; i++) {
            const a = (i * TAU) / 4 + TAU / 8;
            g.poly([Math.cos(a) * r, Math.sin(a) * r - u * 0.12, Math.cos(a) * r + u * 0.09, Math.sin(a) * r, Math.cos(a) * r, Math.sin(a) * r + u * 0.12, Math.cos(a) * r - u * 0.09, Math.sin(a) * r]).fill({ color: core });
          }
          g.blendMode = 'add';
        } else {
          // A broken ring: dashes, slowly turning.
          for (let i = 0; i < 8; i++) {
            const a0 = (i * TAU) / 8;
            g.arc(0, 0, r, a0, a0 + TAU / 16).stroke({ width: 3, color: glow, alpha: 0.9 });
          }
        }
        return { kind, node, anim: (t) => (up ? (g.alpha = 0.65 + 0.35 * Math.sin(t / 380)) : (g.rotation = t / 2400)) };
      }
      case 'speed_up': {
        const [core, glow] = FX_PALETTE.wind;
        node.scale.set(w, S * 0.5);
        node.y = -u * 0.08;
        g.arc(0, 0, u * 0.92, 0, Math.PI * 0.7).stroke({ width: 2.6, color: core, alpha: 0.9, cap: 'round' });
        g.arc(0, 0, u * 0.8, Math.PI, Math.PI * 1.6).stroke({ width: 2, color: glow, alpha: 0.85, cap: 'round' });
        g.blendMode = 'add';
        return { kind, node, anim: (t) => (g.rotation = t / 260) };
      }
      case 'speed_down': {
        const [, glow, spark] = FX_PALETTE.shadow;
        const dots = [0, 1, 2].map((i) => {
          const s = new Sprite(softDot());
          s.anchor.set(0.5);
          s.tint = i % 2 ? spark : glow;
          s.scale.set((u * 0.55 * w) / 32, (u * 0.3) / 32);
          s.alpha = 0.5;
          node.addChild(s);
          return s;
        });
        return {
          kind,
          node,
          anim: (t) => dots.forEach((s, i) => s.position.set(Math.sin(t / 900 + i * 2.1) * u * 0.45 * w, -u * 0.05 + Math.cos(t / 1300 + i) * u * 0.06)),
        };
      }
      case 'blessed': {
        const [core, glow] = FX_PALETTE.bless;
        const stars = [0, 1, 2, 3].map(() => {
          const c = new Graphics();
          const s = u * 0.13;
          c.poly([0, -s * 1.6, s * 0.35, -s * 0.35, s * 1.6, 0, s * 0.35, s * 0.35, 0, s * 1.6, -s * 0.35, s * 0.35, -s * 1.6, 0, -s * 0.35, -s * 0.35]).fill({ color: core });
          c.circle(0, 0, s * 0.8).fill({ color: glow, alpha: 0.5 });
          c.blendMode = 'add';
          node.addChild(c);
          return c;
        });
        const spots = [
          [-0.45, 0.35],
          [0.4, 0.55],
          [-0.2, 0.8],
          [0.3, 0.2],
        ] as const;
        stars.forEach((c, i) => c.position.set(spots[i]![0] * u * w, -h * spots[i]![1]));
        return {
          kind,
          node,
          anim: (t) =>
            stars.forEach((c, i) => {
              const k = (t / 1100 + i * 0.27) % 1;
              c.alpha = Math.sin(k * Math.PI);
              c.scale.set(0.5 + 0.5 * Math.sin(k * Math.PI));
            }),
        };
      }
      case 'cursed': {
        const [, glow, spark] = FX_PALETTE.curse;
        const haze = [0, 1, 2].map((i) => {
          const s = new Sprite(softDot());
          s.anchor.set(0.5);
          s.tint = i === 1 ? spark : glow;
          s.scale.set((u * 0.5) / 32, (u * 0.28) / 32);
          s.alpha = 0.6;
          node.addChild(s);
          return s;
        });
        // A crow's silhouette circling now and then.
        const crow = new Graphics();
        crow.moveTo(-u * 0.22, -u * 0.06).quadraticCurveTo(-u * 0.1, -u * 0.14, 0, 0).quadraticCurveTo(u * 0.1, -u * 0.14, u * 0.22, -u * 0.06).stroke({ width: 2.4, color: 0x14101a, alpha: 0.95 });
        node.addChild(crow);
        node.position.set(0, -h - u * 0.25);
        return {
          kind,
          node,
          anim: (t) => {
            haze.forEach((s, i) => s.position.set(Math.sin(t / 1200 + i * 2) * u * 0.3, Math.cos(t / 1500 + i) * u * 0.05));
            const k = (t / 5200) % 1;
            crow.visible = k < 0.4;
            const a = (k / 0.4) * TAU;
            crow.position.set(Math.cos(a) * u * 0.55, -u * 0.25 + Math.sin(a) * u * 0.12);
            crow.scale.y = 0.7 + 0.3 * Math.sin(t / 90);
          },
        };
      }
      case 'melee_ward': {
        const [core, glow] = FX_PALETTE.bless;
        g.poly(shieldShape(u * 0.5, u * 0.66)).fill({ color: glow, alpha: 0.22 }).stroke({ width: 2, color: core, alpha: 0.85 });
        g.blendMode = 'add';
        node.position.set(facing * u * 0.62 * w, -h * 0.45);
        node.scale.x = 0.75;
        return { kind, node, anim: (t) => (g.alpha = 0.75 + 0.25 * Math.sin(t / 500)) };
      }
      case 'ranged_ward': {
        const [core, glow] = FX_PALETTE.spirit;
        const rx = u * 0.78 * w;
        const ry = h * 1.02;
        const pts: number[] = [];
        for (let i = 0; i <= 18; i++) {
          const a = Math.PI + (i / 18) * Math.PI;
          pts.push(Math.cos(a) * rx, Math.sin(a) * ry);
        }
        g.moveTo(pts[0]!, pts[1]!);
        for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
        g.stroke({ width: 1.8, color: core, alpha: 0.7 });
        g.poly(pts).fill({ color: glow, alpha: 0.08 });
        g.blendMode = 'add';
        return { kind, node, anim: (t) => (g.alpha = 0.6 + 0.4 * Math.sin(t / 300)) };
      }
      default:
        return null;
    }
  }

  private stripPart(kind: StatusOverlay, def: EffectDefinition, h: number, w: number): AuraPart {
    const node = new Container();
    const s = new Sprite(Texture.EMPTY);
    s.anchor.set(def.anchor[0], def.anchor[1]);
    s.scale.set(((Math.sqrt(3) * this.u) / def.pixelsPerHex) * w);
    if (def.additive) s.blendMode = 'add';
    node.addChild(s);
    void loadStrip(def).catch(() => null);
    void h;
    return {
      kind,
      node,
      anim: (t) => {
        const frames = stripFrames(def);
        if (!frames || frames.length === 0) return;
        s.texture = frames[Math.floor((t * Math.max(1, def.fps)) / 1000) % frames.length]!;
      },
    };
  }
}

function isBack(k: StatusOverlay): boolean {
  return k === 'defense_up' || k === 'defense_down' || k === 'speed_up' || k === 'speed_down';
}
