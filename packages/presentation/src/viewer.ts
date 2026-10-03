/**
 * UnitViewerController (S18 Animated Bestiary): one creature drawn large from
 * its battle sprite set on a plinth, with explicit playback controls:
 * Play / Pause / Stop / Restart, 0.5× / 1× / 2×, a choice among the
 * animations this creature has, facing left or right. Loops loop; one-shots
 * repeat after a pause; death plays once and holds. Reduced motion: nothing
 * plays by itself — the first idle frame is shown until Play is pressed.
 *
 * The viewer reports the sprite set's status (placeholder or final) and which
 * animations are its own, so the screen never presents a stand-in as final art.
 */
import { Container, Graphics } from 'pixi.js';
import type { EngineHost, SceneController } from './engineHost';
import { SpriteFigure } from './figure';
import { creatureSprites, type SpriteStatus } from './sprites';
import { TweenPlayer } from './tween';
import { colorOf, groundShadow } from './staticSprites';

export interface ViewerSubject {
  readonly key: string;
  readonly creatureId: string;
  readonly accent: string;
  readonly footprint: 1 | 2;
}

export type ViewerSpriteStatus =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly status: SpriteStatus; readonly provenance: string; readonly animations: readonly string[] }
  | { readonly kind: 'missing' };

export type PlaybackState = 'playing' | 'paused' | 'stopped';

const LOOPING: ReadonlySet<string> = new Set(['idle', 'move', 'fly', 'victory']);

export class UnitViewerController implements SceneController {
  readonly root = new Container();
  private readonly tweens = new TweenPlayer();
  private readonly stage = new Container();
  private readonly backdrop = new Graphics();
  private readonly holder = new Container();
  private figure: SpriteFigure | null = null;
  private subjectKey = '';
  private state = 'idle';
  private token = 0;
  private playback: PlaybackState = 'playing';
  private status: ViewerSpriteStatus = { kind: 'loading' };
  private view = { width: 1, height: 1 };
  private mirrored = false;
  /** Playback rate: 0.5, 1 or 2. */
  speed = 1;
  /** Reduced motion: no autoplay. */
  reducedMotion = false;
  /** Idle plays by itself (Settings: bestiary animation autoplay). */
  autoplay = true;
  onStatus: ((s: ViewerSpriteStatus) => void) | null = null;

  constructor(engine: EngineHost, _canvas: HTMLCanvasElement) {
    this.root.addChild(this.backdrop, this.stage);
    this.stage.addChild(this.holder);
    this.view = { width: engine.width, height: engine.height };
    this.layout();
  }

  resize(width: number, height: number): void {
    this.view = { width, height };
    this.layout();
  }

  private layout(): void {
    const { width, height } = this.view;
    const g = this.backdrop;
    g.clear();
    g.rect(0, 0, width, height).fill({ color: 0x0e1a2c });
    for (let i = 6; i > 0; i--) g.ellipse(width / 2, height * 0.58, width * 0.12 * i, height * 0.1 * i).fill({ color: 0x24406a, alpha: 0.05 });
    const px = width / 2;
    const py = height * 0.8;
    const rx = Math.min(width * 0.32, height * 0.42);
    g.ellipse(px, py + 6, rx * 1.04, rx * 0.2).fill({ color: 0x2e2c29 });
    g.ellipse(px, py, rx, rx * 0.19).fill({ color: 0x5b5a58 }).stroke({ width: 2, color: 0xc29a52, alpha: 0.85 });
    this.stage.position.set(px, py);
    this.fit();
  }

  /** Scale the subject so its idle frame fills about two thirds of the view height. */
  private fit(): void {
    const f = this.figure;
    const idle = f?.set?.animations['idle'];
    if (!f || !idle) return;
    const unscaled = idle.frameHeight * idle.anchor[1] * (100 / (idle.pixelsPerHex ?? f.set!.pixelsPerHex));
    const target = Math.min(this.view.height * 0.66, this.view.width * 0.7);
    this.holder.scale.set(target / Math.max(1, unscaled));
  }

  get spriteStatus(): ViewerSpriteStatus {
    return this.status;
  }

  get playbackState(): PlaybackState {
    return this.playback;
  }

  private setStatus(s: ViewerSpriteStatus): void {
    this.status = s;
    this.onStatus?.(s);
  }

  setSubject(s: ViewerSubject): void {
    if (s.key === this.subjectKey) return;
    this.subjectKey = s.key;
    this.token += 1;
    this.tweens.flush();
    this.figure?.destroy();
    const set = creatureSprites(s.creatureId);
    // A neutral size for the figure itself; the holder scales it to the view.
    const f = new SpriteFigure({ set, hexWidth: 100, accent: colorOf(s.accent) });
    f.mirror = this.mirrored;
    this.holder.removeChildren();
    this.holder.addChild(groundShadow(60 * (s.footprint === 2 ? 1.5 : 1), 12, 0.4), f.view);
    this.figure = f;
    this.fit();
    if (!set) {
      this.setStatus({ kind: 'missing' });
      return;
    }
    this.setStatus({ kind: 'loading' });
    const key = s.key;
    void f.loaded.then(() => {
      if (this.subjectKey !== key || this.figure !== f) return;
      if (f.status !== 'ready') return this.setStatus({ kind: 'missing' });
      this.setStatus({ kind: 'ready', status: set.status, provenance: set.provenance, animations: Object.keys(set.animations) });
      this.setAnimation(this.state);
    });
  }

  /** 'own': the creature's own strip; 'fallback': another strip stands in; 'none': nothing to show. */
  available(name: string): 'own' | 'fallback' | 'none' {
    const f = this.figure;
    if (!f?.set) return 'none';
    if (f.has(name)) return 'own';
    return f.resolve(name) ? 'fallback' : 'none';
  }

  get mirror(): boolean {
    return this.mirrored;
  }

  /** Face left (the defending side's view) or right. */
  set mirror(m: boolean) {
    this.mirrored = m;
    if (this.figure) this.figure.mirror = m;
  }

  /** Select and play a state. Loops loop; one-shots repeat with a pause; death plays once and holds. */
  setAnimation(state: string): void {
    this.state = state;
    const f = this.figure;
    this.token += 1;
    const token = this.token;
    this.tweens.flush();
    if (!f || f.status !== 'ready') return;
    f.rest();
    this.tweens.speed = 1 / Math.max(0.25, this.speed);
    if (this.reducedMotion && !this.forcePlay) {
      // Reduced motion: the first frame of the state, nothing moving.
      f.setLoop('idle');
      this.playback = 'stopped';
      if (state !== 'idle') f.holdLast(state);
      return;
    }
    this.forcePlay = false;
    this.playback = 'playing';
    if (LOOPING.has(state) && (f.has(state) || state === 'idle')) {
      f.setLoop(state);
      if (!this.autoplay && state === 'idle') this.playback = 'stopped';
      return;
    }
    f.setLoop('idle');
    const run = async () => {
      while (token === this.token && this.figure === f) {
        if (state === 'death') {
          if (f.has('death')) await f.playOnce('death', this.tweens, { hold: true });
          else
            await this.tweens.tween(620, (t) => {
              f.pose.rotation = -t * (Math.PI / 2.2);
              f.pose.alpha = 1 - t * 0.15;
            });
          if (token === this.token) this.playback = 'stopped';
          return;
        }
        if (f.has(state) || !f.resolve(state)) await f.playOnce(state, this.tweens, { minMs: 500 });
        else await this.standIn(f, state);
        if (token !== this.token) return;
        if (this.reducedMotion) {
          this.playback = 'stopped';
          return;
        }
        await this.tweens.wait(420);
        if (token === this.token) f.rest();
      }
    };
    void run();
  }

  /** A missing strip: the stand-in strip plus a little motion of the figure itself. */
  private async standIn(f: SpriteFigure, state: string): Promise<void> {
    const strip = f.playOnce(state, this.tweens, { minMs: 560 });
    const lunge = state === 'attack' || state === 'ability' || state === 'cast' ? 22 : state === 'shoot' ? -6 : 0;
    if (lunge) {
      await this.tweens.tween(220, (t) => (f.pose.x = lunge * t));
      await this.tweens.tween(260, (t) => (f.pose.x = lunge * (1 - t)));
    } else if (state === 'hit') {
      await this.tweens.tween(320, (t) => (f.pose.x = -Math.sin(t * Math.PI) * 10));
    } else if (state === 'defend') {
      await this.tweens.tween(520, (t) => (f.pose.scale.y = 1 - Math.sin(t * Math.PI) * 0.08));
    } else if (state === 'victory' || state === 'takeoff' || state === 'landing') {
      await this.tweens.tween(620, (t) => (f.pose.y = -Math.abs(Math.sin(t * Math.PI * 2)) * 24));
    }
    await strip;
    f.rest();
  }

  get animation(): string {
    return this.state;
  }

  private forcePlay = false;

  pause(): void {
    if (this.playback !== 'playing') return;
    this.playback = 'paused';
  }

  resume(): void {
    if (this.playback !== 'paused') return;
    this.playback = 'playing';
  }

  /** Stop immediately and return to the first idle frame. */
  stop(): void {
    this.token += 1;
    this.tweens.flush();
    const f = this.figure;
    if (f) {
      f.rest();
      f.setLoop('idle');
    }
    this.playback = 'stopped';
  }

  /** Play the selected state from its start (also under reduced motion, once). */
  restart(): void {
    this.forcePlay = true;
    this.setAnimation(this.state);
  }

  tick(dt: number): void {
    if (this.playback !== 'playing') return;
    this.tweens.tick(dt);
    this.figure?.tick(dt, this.speed);
  }

  dispose(): void {
    this.token += 1;
    this.tweens.flush();
    this.figure?.destroy();
    this.root.destroy({ children: true });
  }
}
