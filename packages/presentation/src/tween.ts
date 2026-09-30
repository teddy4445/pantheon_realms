/**
 * Promise-based tweens driven by the controller tick. A speed factor of 0 means
 * "instant": tweens complete immediately. Presentation timing never affects rules.
 */
export type Easing = (t: number) => number;

export const easeInOut: Easing = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut: Easing = (t) => 1 - (1 - t) * (1 - t);
export const linear: Easing = (t) => t;

interface ActiveTween {
  elapsed: number;
  duration: number;
  step: (t: number) => void;
  ease: Easing;
  resolve: () => void;
}

export class TweenPlayer {
  private tweens: ActiveTween[] = [];
  /** Multiplier on nominal durations; 0 = instant. */
  speed = 1;

  tween(durationMs: number, step: (t: number) => void, ease: Easing = easeInOut): Promise<void> {
    const duration = durationMs * this.speed;
    if (duration <= 0) {
      step(1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.tweens.push({ elapsed: 0, duration, step, ease, resolve });
    });
  }

  wait(ms: number): Promise<void> {
    return this.tween(ms, () => undefined, linear);
  }

  tick(dt: number): void {
    if (this.tweens.length === 0) return;
    const done: ActiveTween[] = [];
    for (const t of this.tweens) {
      t.elapsed += dt;
      const p = Math.min(1, t.elapsed / t.duration);
      t.step(t.ease(p));
      if (p >= 1) done.push(t);
    }
    if (done.length) {
      this.tweens = this.tweens.filter((t) => !done.includes(t));
      for (const t of done) t.resolve();
    }
  }

  /** Finish everything immediately (skip / scene exit). */
  flush(): void {
    const all = this.tweens;
    this.tweens = [];
    for (const t of all) {
      t.step(1);
      t.resolve();
    }
  }

  get busy(): boolean {
    return this.tweens.length > 0;
  }
}
