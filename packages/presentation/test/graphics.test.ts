/**
 * Graphics quality presets and the automatic pick (graphics.ts): the presets
 * are ordered (Low never costs more than Medium, Medium than High), the
 * render resolution follows the preset, and the quick test's result maps to
 * a preset (software renderers always Low).
 */
import { describe, expect, it } from 'vitest';
import { ADAPT_MIN_SCALE, ADAPT_START, GRAPHICS_PRESETS, adaptResolutionStep, classifyGraphics, frameDue, graphicsProfile, renderResolution, onGraphicsChange, setGraphicsQuality, type AdaptState, type GraphicsProbeResult } from '../src/graphics';

const probe = (over: Partial<GraphicsProbeResult>): GraphicsProbeResult => ({ webgl2: true, renderer: 'ANGLE (NVIDIA GeForce)', msPerPass: 2, cores: 8, memoryGb: 16, ...over });

describe('graphics presets', () => {
  it('cost goes down from High to Low on every setting', () => {
    const [h, m, l] = [GRAPHICS_PRESETS.high, GRAPHICS_PRESETS.medium, GRAPHICS_PRESETS.low];
    for (const [a, b] of [[h, m], [m, l]] as const) {
      expect(a.maxPixelRatio * a.renderScale).toBeGreaterThanOrEqual(b.maxPixelRatio * b.renderScale);
      expect(Number(a.shadows)).toBeGreaterThanOrEqual(Number(b.shadows));
      expect(Number(a.ambientMotion)).toBeGreaterThanOrEqual(Number(b.ambientMotion));
      expect(['all', 'no-grass', 'sparse'].indexOf(a.decor)).toBeLessThanOrEqual(['all', 'no-grass', 'sparse'].indexOf(b.decor));
      expect(a.frameCap === 0 || (b.frameCap > 0 && b.frameCap <= a.frameCap)).toBe(true);
    }
    expect(l.shadows).toBe(false);
    expect(l.effects).toBe('simple');
    expect(l.paintedGround).toBe(false);
    expect(l.antialias).toBe(false);
  });

  it('render resolution: High is sharp on a 2× screen, Medium renders CSS pixels, Low renders 70% of them', () => {
    expect(renderResolution(GRAPHICS_PRESETS.high, 2)).toBeCloseTo(2);
    expect(renderResolution(GRAPHICS_PRESETS.high, 3)).toBeCloseTo(2);
    expect(renderResolution(GRAPHICS_PRESETS.medium, 2)).toBeCloseTo(1);
    expect(renderResolution(GRAPHICS_PRESETS.low, 1)).toBeCloseTo(0.7);
    expect(renderResolution(GRAPHICS_PRESETS.high, 1)).toBeCloseTo(1);
  });

  it('switching presets notifies the engine', () => {
    const seen: string[] = [];
    const off = onGraphicsChange((p) => seen.push(p.quality));
    setGraphicsQuality('low');
    setGraphicsQuality('low');
    setGraphicsQuality('medium');
    off();
    setGraphicsQuality('high');
    expect(seen).toEqual(['low', 'medium']);
    expect(graphicsProfile().quality).toBe('high');
  });
});

describe('automatic pick', () => {
  it('fast GPU → High; middling → Medium; slow, software or no WebGL 2 → Low', () => {
    expect(classifyGraphics(probe({}))).toBe('high');
    expect(classifyGraphics(probe({ msPerPass: 7 }))).toBe('medium');
    expect(classifyGraphics(probe({ msPerPass: 20 }))).toBe('low');
    expect(classifyGraphics(probe({ renderer: 'Google SwiftShader', msPerPass: Infinity }))).toBe('low');
    expect(classifyGraphics(probe({ renderer: 'llvmpipe (LLVM 15.0.7, 256 bits)', msPerPass: 1 }))).toBe('low');
    expect(classifyGraphics(probe({ webgl2: false }))).toBe('low');
  });

  it('few cores or little memory cap the pick at Medium', () => {
    expect(classifyGraphics(probe({ cores: 2 }))).toBe('medium');
    expect(classifyGraphics(probe({ memoryGb: 2 }))).toBe('medium');
    expect(classifyGraphics(probe({ memoryGb: null }))).toBe('high');
  });
});

describe('frame-rate cap (2026-10-06)', () => {
  /** Frames drawn per second on a display of `hz` with a cap, over ten seconds. */
  const drawn = (hz: number, cap: number) => {
    let due = 0;
    let n = 0;
    for (let i = 0; i < hz * 10; i++) {
      const next = frameDue((i * 1000) / hz, due, cap);
      if (next !== null) {
        due = next;
        n++;
      }
    }
    return n / 10;
  };
  it('averages the cap on displays whose rate is not a multiple of it, and every frame without a cap', () => {
    expect(drawn(60, 60)).toBeCloseTo(60, 0);
    expect(drawn(60, 30)).toBeCloseTo(30, 0);
    expect(drawn(144, 60)).toBeGreaterThan(55);
    expect(drawn(144, 60)).toBeLessThanOrEqual(61);
    expect(drawn(120, 60)).toBeCloseTo(60, 0);
    expect(drawn(75, 60)).toBeGreaterThan(55);
    expect(drawn(144, 0)).toBe(144);
  });
  it('High is capped at 60 frames per second (laptops with fast displays need not draw more)', () => {
    expect(GRAPHICS_PRESETS.high.frameCap).toBe(60);
  });
});

describe('adaptive resolution (2026-10-06)', () => {
  const judge = (s: AdaptState, now: number, meanMs: number, busyShare = 0, frameCap = 60) => adaptResolutionStep(s, { now, meanMs, busyShare, frameCap });
  it('steps down while frames run under ~34 per second, never below 60 %', () => {
    let s = ADAPT_START;
    for (let t = 2000; t <= 40_000; t += 2000) s = judge(s, t, 45);
    expect(s.scale).toBeCloseTo(ADAPT_MIN_SCALE);
    expect(judge(ADAPT_START, 2000, 25).scale).toBe(1);
  });
  it('does not step down while the main thread was held by game logic (a lower resolution would not help)', () => {
    expect(judge(ADAPT_START, 2000, 60, 0.5).scale).toBe(1);
  });
  it('a 30-frame cap (Low) is not mistaken for slow frames', () => {
    expect(judge(ADAPT_START, 2000, 34, 0, 30).scale).toBe(1);
    expect(judge(ADAPT_START, 2000, 40, 0, 30).scale).toBeLessThan(1);
  });
  it('steps back up when frames are at the cap again and settled; a step that proves too slow is held off for a minute', () => {
    let s = judge(ADAPT_START, 2000, 45);
    expect(s.scale).toBeCloseTo(0.85);
    expect(judge(s, 4000, 16.7).scale).toBeCloseTo(0.85); // not settled yet
    s = judge(s, 10_000, 16.7);
    expect(s.scale).toBeCloseTo(1);
    s = judge(s, 12_000, 45); // too slow right after the step up
    expect(s.scale).toBeCloseTo(0.85);
    expect(judge(s, 30_000, 16.7).scale).toBeCloseTo(0.85); // held off
    expect(judge(s, 80_000, 16.7).scale).toBeCloseTo(1); // tried again after a minute
  });
});
