/**
 * Graphics quality presets and the automatic pick (graphics.ts): the presets
 * are ordered (Low never costs more than Medium, Medium than High), the
 * render resolution follows the preset, and the quick test's result maps to
 * a preset (software renderers always Low).
 */
import { describe, expect, it } from 'vitest';
import { GRAPHICS_PRESETS, classifyGraphics, graphicsProfile, hardwareScalingLevel, onGraphicsChange, setGraphicsQuality, type GraphicsProbeResult } from '../src/graphics';

const probe = (over: Partial<GraphicsProbeResult>): GraphicsProbeResult => ({ webgl2: true, renderer: 'ANGLE (NVIDIA GeForce)', msPerPass: 2, cores: 8, memoryGb: 16, ...over });

describe('graphics presets', () => {
  it('cost goes down from High to Low on every setting', () => {
    const [h, m, l] = [GRAPHICS_PRESETS.high, GRAPHICS_PRESETS.medium, GRAPHICS_PRESETS.low];
    for (const [a, b] of [[h, m], [m, l]] as const) {
      expect(a.maxPixelRatio * a.renderScale).toBeGreaterThanOrEqual(b.maxPixelRatio * b.renderScale);
      expect(Number(a.contactShadows)).toBeGreaterThanOrEqual(Number(b.contactShadows));
      expect(a.maxFigures).toBeGreaterThanOrEqual(b.maxFigures);
      expect(a.anisotropy).toBeGreaterThanOrEqual(b.anisotropy);
      expect(a.frameCap === 0 || (b.frameCap > 0 && b.frameCap <= a.frameCap)).toBe(true);
    }
    expect(l.contactShadows).toBe(false);
    expect(l.paintedGround).toBe(false);
    expect(l.antialias).toBe(false);
  });

  it('render resolution: High is sharp on a 2× screen, Medium renders CSS pixels, Low renders 70% of them', () => {
    expect(hardwareScalingLevel(GRAPHICS_PRESETS.high, 2)).toBeCloseTo(0.5);
    expect(hardwareScalingLevel(GRAPHICS_PRESETS.high, 3)).toBeCloseTo(0.5);
    expect(hardwareScalingLevel(GRAPHICS_PRESETS.medium, 2)).toBeCloseTo(1);
    expect(hardwareScalingLevel(GRAPHICS_PRESETS.low, 1)).toBeCloseTo(1 / 0.7);
    expect(hardwareScalingLevel(GRAPHICS_PRESETS.high, 1)).toBeCloseTo(1);
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
