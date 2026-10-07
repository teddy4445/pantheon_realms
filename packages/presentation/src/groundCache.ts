/**
 * Ground cache (frame-rate work, 2026-10-07). The adventure map's ground — the
 * painted terrain, the painted transitions between grounds (three see-through
 * outline levels on every border), the shore foam, the roads and the grid — is
 * a large, still drawing: measured in this container it was about two thirds
 * of the GPU time of a map frame, the transitions alone about half. It is now
 * also drawn into square textures ("chunks", 512 view pixels at the current
 * zoom), and while the chunks cover the view the map shows them instead of the
 * ground itself: a frame draws the ground as a few textured squares instead of
 * every hex and border piece.
 *
 * The chunks sit on the screen's pixel grid at the current zoom and the
 * renderer's resolution, multisampled like the screen, so the cached ground
 * looks the same as the live one. A few chunks are drawn per frame: the ones
 * the view needs first, then the ring around it ahead of time (after a zoom,
 * once the wheel has rested a moment). Whenever the
 * chunks do not cover the view yet — the map just opened, the ground changed
 * (`invalidate`: new textures, roads or grid after exploring), the zoom or
 * resolution changed, or a fast pan outran them — the live ground is drawn as
 * before, so nothing is ever missing or blurred. Presentation only: nothing
 * here reads or changes game state, and picking never looks at these textures.
 */
import { Container, Matrix, RenderTexture, Sprite, type Renderer } from 'pixi.js';

/** Chunk side in view (CSS) pixels at the current zoom. */
export const GROUND_CHUNK = 512;
/** Chunks drawn per frame at most (the view's own first), and the main-thread time after which a frame draws no more (one at least). */
export const GROUND_BAKES_PER_FRAME = 4;
const BAKE_BUDGET_MS = 6;
/** Spare chunk textures kept for reuse. */
const POOL_MAX = 8;
/** After a zoom change, chunks are drawn only once the zoom has rested this long (ms): a turning wheel draws the live ground. */
export const ZOOM_SETTLE_MS = 200;

interface Chunk {
  readonly i: number;
  readonly j: number;
  readonly sprite: Sprite;
  readonly rt: RenderTexture;
  version: number;
}

export interface GroundCacheStats {
  readonly enabled: boolean;
  /** The chunks covered the view at the last frame (the map showed them instead of the live ground). */
  readonly covering: boolean;
  readonly chunks: number;
  /** Chunks drawn since the view opened, and the main-thread time spent drawing them (ms). */
  readonly bakes: number;
  readonly bakeMs: number;
  /** Frames that showed the cached ground, and frames that drew the live ground while the chunks caught up. */
  readonly cachedFrames: number;
  readonly liveFrames: number;
}

export class GroundCache {
  /** What the map shows in place of the ground while the chunks cover the view: one sprite per chunk. */
  readonly view = new Container();
  private readonly chunks = new Map<string, Chunk>();
  private readonly pool: RenderTexture[] = [];
  private zoom = 0;
  private res = 0;
  private version = 1;
  private bakes = 0;
  private bakeMs = 0;
  private cachedFrames = 0;
  private liveFrames = 0;
  private covering = false;
  private zoomChangedAt = -Infinity;
  /** False after a failure (the live ground is drawn from then on). */
  enabled = true;

  constructor(
    private readonly renderer: Renderer,
    /** The ground itself (also drawn live while the chunks do not cover the view). */
    private readonly source: Container,
    private readonly antialias: boolean,
  ) {}

  /** The ground changed: every chunk is drawn again (the live ground shows until they cover the view). */
  invalidate(): void {
    this.version += 1;
  }

  /** The chunks do not cover the view yet (the view should keep drawing frames until they do). */
  get pending(): boolean {
    return this.enabled && !this.covering;
  }

  /**
   * Draw the chunks this frame needs for the view covering world `x0`–`x1` ×
   * `y0`–`y1` at `zoom`, a few per frame. Returns true when they cover the
   * view (show the chunks), false when the live ground must be drawn.
   */
  update(x0: number, y0: number, x1: number, y1: number, zoom: number): boolean {
    if (!this.enabled) return false;
    const res = this.renderer.resolution;
    const now = performance.now();
    if (res !== this.res || zoom !== this.zoom) {
      this.dropAll();
      if (zoom !== this.zoom && this.zoom !== 0) this.zoomChangedAt = now;
      this.zoom = zoom;
      this.res = res;
    }
    const C = GROUND_CHUNK;
    const margin = C / 2;
    // The view in zoomed world pixels (the chunks' own grid).
    const left = x0 * zoom;
    const top = y0 * zoom;
    const right = x1 * zoom;
    const bottom = y1 * zoom;
    const range = (a: number, b: number) => [Math.floor(a / C), Math.floor((b - 1) / C)] as const;
    const [vi0, vi1] = range(left, right);
    const [vj0, vj1] = range(top, bottom);
    const [mi0, mi1] = range(left - margin, right + margin);
    const [mj0, mj1] = range(top - margin, bottom + margin);
    // Chunks well out of view go back to the pool.
    for (const [key, c] of this.chunks) {
      if (c.i < mi0 || c.i > mi1 || c.j < mj0 || c.j > mj1) {
        this.release(c);
        this.chunks.delete(key);
      }
    }
    // While the wheel turns, the live ground is drawn; the chunks follow once the zoom rests.
    let budget = now - this.zoomChangedAt < ZOOM_SETTLE_MS ? 0 : GROUND_BAKES_PER_FRAME;
    const spend = () => {
      budget -= 1;
      if (performance.now() - now > BAKE_BUDGET_MS) budget = 0;
    };
    let covering = true;
    try {
      for (let j = vj0; j <= vj1; j++)
        for (let i = vi0; i <= vi1; i++) {
          if (this.fresh(i, j)) continue;
          if (budget > 0) {
            this.bake(i, j);
            spend();
          } else covering = false;
        }
      // Ahead of time: the ring around the view, with what is left of this frame's budget.
      for (let j = mj0; j <= mj1 && budget > 0; j++)
        for (let i = mi0; i <= mi1 && budget > 0; i++) {
          if (this.fresh(i, j)) continue;
          this.bake(i, j);
          spend();
        }
    } catch {
      this.enabled = false;
      this.destroy();
      return false;
    }
    this.covering = covering;
    this.view.visible = covering;
    if (covering) this.cachedFrames += 1;
    else this.liveFrames += 1;
    return covering;
  }

  stats(): GroundCacheStats {
    return { enabled: this.enabled, covering: this.covering, chunks: this.chunks.size, bakes: this.bakes, bakeMs: Math.round(this.bakeMs * 10) / 10, cachedFrames: this.cachedFrames, liveFrames: this.liveFrames };
  }

  /** Drop every chunk and pooled texture (dispose, failure). */
  destroy(): void {
    this.dropAll();
    for (const rt of this.pool) rt.destroy(true);
    this.pool.length = 0;
    this.covering = false;
    this.view.visible = false;
  }

  private fresh(i: number, j: number): boolean {
    return this.chunks.get(`${i},${j}`)?.version === this.version;
  }

  private bake(i: number, j: number): void {
    const key = `${i},${j}`;
    let c = this.chunks.get(key);
    if (!c) {
      const rt = this.take();
      const sprite = new Sprite(rt);
      this.view.addChild(sprite);
      c = { i, j, sprite, rt, version: 0 };
      this.chunks.set(key, c);
    }
    const C = GROUND_CHUNK;
    const z = this.zoom;
    const t0 = performance.now();
    // The live ground may be hidden this frame (the chunks cover the view): draw it into the chunk all the same.
    const shown = this.source.renderable;
    this.source.renderable = true;
    // World → chunk pixels: the chunk's top-left corner on the zoomed pixel grid is the origin.
    this.renderer.render({ container: this.source, target: c.rt, clear: true, clearColor: [0, 0, 0, 0], transform: new Matrix(z, 0, 0, z, -i * C, -j * C) });
    this.source.renderable = shown;
    c.sprite.position.set((i * C) / z, (j * C) / z);
    c.sprite.scale.set(1 / z);
    c.version = this.version;
    this.bakes += 1;
    this.bakeMs += performance.now() - t0;
  }

  private take(): RenderTexture {
    const rt = this.pool.pop();
    if (rt) {
      if (rt.source.resolution !== this.res) rt.resize(GROUND_CHUNK, GROUND_CHUNK, this.res);
      return rt;
    }
    return RenderTexture.create({ width: GROUND_CHUNK, height: GROUND_CHUNK, resolution: this.res, antialias: this.antialias });
  }

  private release(c: Chunk): void {
    c.sprite.destroy();
    if (this.pool.length < POOL_MAX) this.pool.push(c.rt);
    else c.rt.destroy(true);
  }

  private dropAll(): void {
    for (const c of this.chunks.values()) this.release(c);
    this.chunks.clear();
  }
}
