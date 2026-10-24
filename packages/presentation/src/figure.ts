import { frameDurations, frameStart, stableAnimationPhase, timelineDuration, timelineFrame } from './animationTiming';
/**
 * SpriteFigure: one animated 2D figure (a battle stack, a map avatar, a map
 * guard, the bestiary subject) drawn from a manifest sprite set.
 *
 *   view  — placed by the owner at the logical anchor (feet / ground point);
 *   pose  — presentation-only choreography (lunge, flinch, hop, fall), mirrored
 *           for the defending side or westward travel;
 *   sprite — the current frame, anchored per strip (manifest anchor).
 *
 * Loops (idle, move, fly, walk, victory) advance with the frame clock; one-shot
 * animations (attack, shoot, hit, death, …) run on the owner's TweenPlayer, so
 * a skip or instant playback finishes them at once. Nothing here reads or
 * changes game state.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import { directionalStrip, resolveAnimation, type ResolvedAnimation, type SpriteSetDefinition, type SpriteStrip } from './sprites';
import { loadStrip, stripFrames, retainFigureStrip, releaseFigureStrip, trimFigureTextures } from './textures';
import { linear, type TweenPlayer } from './tween';
import type { MapDirection } from './hexmath';

export interface FigureOptions {
  readonly set: SpriteSetDefinition | null;
  /** Screen pixels (in the view's local units) of one hex width. */
  readonly hexWidth: number;
  /** Extra size factor (e.g. map guards drawn smaller). */
  readonly size?: number;
  /** Owner/accent colour, used only by sets marked `tint: 'accent'`. */
  readonly accent?: number | null;
  /** Stable instance phase; avoids identical troops breathing in unison. */
  readonly phaseKey?: string;
  /** Map figures request only standing/travel art, battle/viewer figures preload everything. */
  readonly context?: 'map' | 'guard' | 'battle';
}

interface Playing {
  readonly requested: string;
  readonly resolved: ResolvedAnimation;
  readonly strip: SpriteStrip;
  readonly frames: Texture[];
  readonly loop: boolean;
  time: number;
  /** Frame on screen (frame-region strips set the anchor and scale per frame). */
  index: number;
  times: number[];
}

export class SpriteFigure {
  readonly view = new Container();
  readonly pose = new Container();
  readonly sprite = new Sprite();
  /** Independent of combat choreography: tiny anchored breathing/weight shifts. */
  readonly body = new Container();
  private ambientTime = 0;
  private readonly phase: number;
  private readonly context: 'map' | 'guard' | 'battle';
  private travelDistance: number | null = null;
  private readonly retained = new Map<string, SpriteStrip>();
  private transitionMs = 0;
  private transitionY = 0;
  private transitionScale = 1;
  readonly set: SpriteSetDefinition | null;
  private playing: Playing | null = null;
  private loopName = 'idle';
  private direction: MapDirection = 'e';
  private mirrored = false;
  private baseScale = 1;
  private readonly hexWidth: number;
  private readonly size: number;
  private readonly accent: number | null;
  private destroyed = false;
  /** Resolves once the set's strips are loaded (or failed). */
  readonly loaded: Promise<void>;
  /**
   * Resolves once the idle strip is loaded (or failed): the figure can be drawn standing. It is
   * shown at once, before the other strips arrive (1.1.4: a battle is readable sooner).
   */
  readonly firstFrame: Promise<void>;
  status: 'loading' | 'ready' | 'missing' = 'loading';
  private holding = false;

  constructor(opts: FigureOptions) {
    this.set = opts.set;
    this.view.addChild(this.pose);
    this.pose.addChild(this.body);
    this.body.addChild(this.sprite);
    this.phase = stableAnimationPhase(opts.phaseKey ?? opts.set?.animations.idle?.file ?? 'figure');
    this.context = opts.context ?? 'battle';
    this.hexWidth = opts.hexWidth;
    this.size = opts.size ?? 1;
    this.accent = opts.accent ?? null;
    this.baseScale = opts.set ? (opts.hexWidth / opts.set.pixelsPerHex) * this.size : 1;
    this.sprite.scale.set(this.baseScale);
    const idle = opts.set?.animations['idle'];
    this.firstFrame = idle
      ? this.requestStrip(idle).then(
          () => this.showFirstFrame(),
          () => undefined,
        )
      : Promise.resolve();
    this.loaded = this.preload();
  }

  /** Stand in the idle loop as soon as its strip is in (the status stays 'loading' until every strip is). */
  private showFirstFrame(): void {
    if (this.destroyed || this.playing || this.holding || this.loopName !== 'idle') return;
    this.start('idle', true);
  }

  private async preload(): Promise<void> {
    const set = this.set;
    if (!set) {
      this.status = 'missing';
      return;
    }
    const strips: SpriteStrip[] = [];
    for (const [name, a] of Object.entries(set.animations)) {
      if (this.context === 'guard' && name !== 'idle') continue;
      if (this.context === 'map' && !['idle', 'move', 'walk', 'fly', 'prepare', 'cast'].includes(name)) continue;
      if (!a) continue;
      strips.push(a);
      for (const d of Object.values(a.directions ?? {})) if (d) strips.push(d);
    }
    await Promise.all(strips.map((s) => this.requestStrip(s).catch(() => null)));
    if (this.destroyed) return;
    this.status = set.animations['idle'] && stripFrames(set.animations['idle']) ? 'ready' : 'missing';
    // Start the requested loop (the early idle frame may already be playing; a one-shot never is yet).
    if (!this.playing || this.playing.loop) this.setLoop(this.loopName);
  }

  private async requestStrip(strip: SpriteStrip): Promise<Texture[]> {
    if (!this.retained.has(strip.file)) { this.retained.set(strip.file,strip); retainFigureStrip(strip); }
    const frames = await loadStrip(strip);
    if (this.destroyed) trimFigureTextures();
    return frames;
  }

  /** The figure's own strip exists for this animation (not a stand-in). */
  has(name: string): boolean {
    return !!this.set?.animations[name];
  }

  /** What would be drawn for `name` (own strip or the fallback chain). */
  resolve(name: string): ResolvedAnimation | null {
    return resolveAnimation(this.set, name);
  }

  get mirror(): boolean {
    return this.mirrored;
  }

  /** Face left (true) or right (false); sprites are authored facing right. */
  set mirror(m: boolean) {
    this.mirrored = m;
    this.applyFacing();
  }

  /** Map avatars: face one of eight directions (a direction strip, else mirror the right-facing one). */
  face(dir: MapDirection): void {
    if (this.direction === dir) return;
    this.direction = dir;
    const p = this.playing;
    if (p) this.start(p.requested, p.loop);
    else this.applyFacing();
  }

  get facing(): MapDirection {
    return this.direction;
  }

  private applyFacing(extraMirror = false): void {
    const m = this.mirrored !== extraMirror;
    this.pose.scale.x = Math.abs(this.pose.scale.x) * (m ? -1 : 1);
  }

  /** Current animation name actually drawn and the one requested. */
  get current(): { requested: string; drawn: string; fallback: boolean } | null {
    const p = this.playing;
    return p ? { requested: p.requested, drawn: p.resolved.name, fallback: p.resolved.fallback } : null;
  }

  /** Drawn height of the current frame above the anchor, in view units. */
  get height(): number {
    const p = this.playing;
    if (!p) return this.baseScale * (this.set?.pixelsPerHex ?? 100);
    const r = p.strip.regions?.[p.index];
    if (r) return r.anchor[1] * r.sourceScale * this.baseScale;
    return p.strip.frameHeight * p.strip.anchor[1] * this.baseScale;
  }

  private start(name: string, loop: boolean): Playing | null {
    if (this.destroyed) return null;
    const resolved = resolveAnimation(this.set, name);
    if (!resolved) return null;
    const { strip, mirror } = directionalStrip(resolved.def, this.direction);
    const frames = stripFrames(strip);
    if (!frames || frames.length === 0) return null;
    const times = frameDurations(name, strip);
    const old = this.playing;
    // Preserve gait phase through direction changes; one-shots always restart.
    const keep = !loop ? 0 : old?.strip === strip ? old.time :
      old?.loop && old.requested === name ? (old.time / timelineDuration(old.times) % 1) * timelineDuration(times) :
      name === 'idle' && !old ? this.phase * timelineDuration(times) : 0;
    if (old?.requested !== name) {
      this.transitionMs = 120;
      this.transitionY = this.body.y;
      this.transitionScale = this.body.scale.y;
    }
    const p: Playing = { requested: name, resolved, strip, frames, loop, time: keep, index: -1, times };
    this.playing = p;
    this.sprite.anchor.set(strip.anchor[0], strip.anchor[1]);
    // Each strip carries its own scale and tint when it differs from its set's (mixed final/placeholder sets).
    const ppx = strip.pixelsPerHex ?? resolved.def.pixelsPerHex ?? this.set!.pixelsPerHex;
    this.baseScale = (this.hexWidth / ppx) * this.size;
    this.sprite.scale.set(this.baseScale);
    const tinted = (strip.tint ?? resolved.def.tint ?? (strip.status === 'final' ? undefined : this.set!.tint)) === 'accent';
    this.sprite.tint = tinted && this.accent !== null ? this.accent : 0xffffff;
    this.applyFacing(mirror);
    this.showFrame(p, timelineFrame(times, p.time, loop));
    return p;
  }

  private showFrame(p: Playing, index: number): void {
    const n = p.frames.length;
    const i = p.loop ? ((index % n) + n) % n : Math.max(0, Math.min(n - 1, index));
    const tex = p.frames[i]!;
    if (this.sprite.texture !== tex) this.sprite.texture = tex;
    const r = p.strip.regions?.[i];
    if (r && p.index !== i) {
      // Frame-region atlas: this pose's own ground point on the figure's origin, at one
      // constant scale for every pose (no per-frame fitting, so no size jumps). The
      // facing mirror sits on the pose container, around that same origin.
      this.sprite.anchor.set(r.anchor[0] / Math.max(1, r.rect[2]), r.anchor[1] / Math.max(1, r.rect[3]));
      this.sprite.scale.set(this.baseScale * r.sourceScale);
    }
    p.index = i;
  }

  /** Loop an animation (idle, move, fly, walk, victory) until told otherwise. */
  setLoop(name: string): void {
    this.loopName = name;
    if (this.status !== 'ready') return;
    const p = this.playing;
    if (p && p.loop && p.requested === name) return;
    this.start(name, true);
  }

  get looping(): string {
    return this.loopName;
  }

  /**
   * Play an animation once on the tween clock (a skip finishes it). Afterwards the
   * figure returns to its loop, or holds the last frame (`hold`, for death).
   * Returns what was drawn (null: nothing to draw; the owner animates the pose instead).
   */
  async playOnce(name: string, tweens: TweenPlayer, opts: { hold?: boolean; minMs?: number } = {}): Promise<ResolvedAnimation | null> {
    if (this.destroyed) return null;
    if (this.status === 'loading') await this.loaded;
    if (this.destroyed) return null;
    const resolved = this.resolve(name);
    if (resolved && !stripFrames(directionalStrip(resolved.def, this.direction).strip)) await this.requestStrip(directionalStrip(resolved.def, this.direction).strip).catch(() => null);
    if (this.destroyed) return null;
    const p = this.start(name, false);
    if (!p) return null;
    p.times = frameDurations(name, p.strip, opts.minMs);
    const ms = timelineDuration(p.times);
    await tweens.tween(ms, (t) => this.playing === p && this.showFrame(p, timelineFrame(p.times, t * ms, false)), linear);
    if (this.playing === p) {
      if (opts.hold) this.showFrame(p, p.frames.length - 1);
      else this.start(this.loopName, true);
    }
    return p.resolved;
  }

  /** Show the last frame of an animation at once (a stack that fell earlier). */
  holdLast(name: string): ResolvedAnimation | null {
    if (this.destroyed) return null;
    if (this.status !== 'ready') {
      // A fallen stack never stands up in the early idle frame while its death strip loads.
      this.holding = true;
      if (this.playing?.loop) {
        this.playing = null;
        this.sprite.texture = Texture.EMPTY;
      }
      void this.loaded.then(() => this.holdLast(name));
      return this.resolve(name);
    }
    const p = this.start(name, false);
    if (p) { this.showFrame(p, p.frames.length - 1); this.body.position.set(0,0); this.body.scale.set(1); this.body.skew.set(0,0); }
    return p?.resolved ?? null;
  }

  motionDebug() {
    return {frame:this.playing?.index ?? -1,animation:this.playing?.requested ?? null,phase:this.playing?.time ?? 0,
      bodyY:this.body.y,bodyScale:this.body.scale.y,retainedFiles:this.retained.size,context:this.context};
  }
  duration(name: string, minMs = 0): number {
    const strip = this.resolve(name)?.def;
    return strip ? timelineDuration(frameDurations(name, strip, minMs)) : minMs;
  }
  contactFrame(): number {
    const strip = this.set?.animations.attack;
    return this.set?.events?.attackContactFrame ?? Math.floor((strip?.frames ?? 6) / 2);
  }
  frameDelay(name: string, frame: number, minMs = 0): number {
    const strip = this.resolve(name)?.def;
    return strip ? frameStart(frameDurations(name, strip, minMs), frame) : minMs / 2;
  }
  beginTravel(): void { this.travelDistance = 0; }
  travelTo(distance: number): void {
    const p = this.playing;
    if (!p?.loop || this.travelDistance === null) return;
    const delta = Math.max(0, distance - this.travelDistance);
    this.travelDistance = distance;
    // A relaxed stride: avoid cycling the whole strip several times per map tile.
    p.time += delta / (this.hexWidth * 2.5) * timelineDuration(p.times);
    this.showFrame(p, timelineFrame(p.times, p.time, true));
  }
  endTravel(): void { this.travelDistance = null; }

  /** Ambient transforms never affect feet anchors, hit positions or combat clocks. */
  tick(dt: number, rate = 1, ambient = true): void {
    const p = this.playing;
    if (!p) return;
    const step = Math.min(Math.max(dt, 0), 100);
    if (p.loop && this.travelDistance === null && rate > 0) {
      const pace = p.requested === 'idle' ? .32 : ['walk', 'move', 'fly'].includes(p.requested) ? .6 : 1;
      p.time += dt * rate * pace;
      this.showFrame(p, timelineFrame(p.times, p.time, true));
    }
    if (ambient) this.ambientTime += step;
    const t = this.ambientTime / 1000 + this.phase * Math.PI * 2;
    const idle = ambient && p.loop && p.requested === 'idle';
    const travelling = ambient && p.loop && ['walk','move','fly'].includes(p.requested);
    const beat = p.time / timelineDuration(p.times) * Math.PI * 4;
    const flying = travelling && p.requested === 'fly';
    const y = flying ? Math.sin(beat / 2) * this.hexWidth * .005 : travelling ? -Math.abs(Math.sin(beat)) * this.hexWidth * .003 : 0;
    const scale = idle ? 1 + Math.sin(t * .55) * .002 : 1;
    this.transitionMs = ambient ? Math.max(0, this.transitionMs-step) : 0;
    const blend = 1-this.transitionMs/120;
    this.body.y = this.transitionY*(1-blend)+y*blend;
    this.body.scale.y = this.transitionScale*(1-blend)+scale*blend;
    this.body.skew.x = idle ? Math.sin(t * .3) * .001 : 0;
  }

  /** Reset the choreography transforms (position, rotation, squash, alpha). */
  rest(): void {
    this.pose.position.set(0, 0);
    this.pose.rotation = 0;
    this.pose.scale.y = 1;
    this.pose.scale.x = Math.sign(this.pose.scale.x || 1);
    this.pose.alpha = 1;
    this.sprite.alpha = 1;
  }

  destroy(): void {
    this.destroyed = true;
    this.view.destroy({ children: true });
    for (const strip of this.retained.values()) releaseFigureStrip(strip);
    this.retained.clear();
  }
}
