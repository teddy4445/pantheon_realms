import { describe, expect, it } from 'vitest';
import { battleInsets } from '../src/scene/battleInsets';
describe('battle HUD clearance', () => {
  it('accounts for offset canvases, the lower queue edge and the actual action-bar top', () => {
    expect(battleInsets({ top: 40, bottom: 940, height: 900 }, [120, 180], 830)).toEqual({ top: 150, bottom: 120, left: 16, right: 16 });
  });
  it('converts CSS-zoomed bounds to renderer client coordinates', () => {
    const value = battleInsets({ top: 64, bottom: 1504, height: 1440 }, [192, 288], 1328, 1.6);
    expect(value.top).toBe(146.25);
    expect(value.bottom).toBe(116.25);
  });
});
