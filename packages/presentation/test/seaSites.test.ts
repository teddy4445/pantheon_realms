/**
 * Coastal sites and sea salvage on the map (packages/presentation/src/seaSiteLayout.ts, sea-sites kit
 * 2026-10-17): every delivered map picture is scaled by its PAINTED bounds into the handoff's bands
 * (towers 1.8–2.2 hex widths tall, wreck hulls 1.4–1.7 wide, salvage 0.55–0.7 wide), never by the
 * transparent canvas; the owner flag hangs at the tower's mast (above the roof, inside the picture);
 * the idle motion stays within the handoff's amplitudes and stops under reduced motion.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEA_PICKUP_FADE_MS, seaSiteBob, seaSiteLayout, type SeaSiteArt } from '../src/seaSiteLayout';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
type Entry = { kind: string; file: string; width: number; height: number; visibleBounds: [number, number, number, number]; groundAnchor: [number, number]; displayMeasure: 'width' | 'height'; displayHexWidths: number; flagAnchorApprox?: [number, number] | null };
const manifest = JSON.parse(readFileSync(path.join(root, 'assets-runtime/sea-sites-v1/manifest.json'), 'utf8')) as { assets: Record<string, Entry> };
const art = (id: string): SeaSiteArt => {
  const a = manifest.assets[id]!;
  return { url: `./${a.file}`, width: a.width, height: a.height, visibleBounds: a.visibleBounds, groundAnchor: a.groundAnchor, measure: a.displayMeasure, hexWidths: a.displayHexWidths, flagAnchor: a.flagAnchorApprox ?? null };
};
const HEX = 64;

describe('sea-site pictures on the map', () => {
  it('scales every map picture by its painted bounds into the handoff bands', () => {
    const sprites = Object.entries(manifest.assets).filter(([, a]) => a.kind === 'map-sprite');
    expect(sprites).toHaveLength(7);
    for (const [id, a] of sprites) {
      const lay = seaSiteLayout(art(id), HEX);
      if (id.includes('watchtower')) {
        expect(lay.height / HEX, id).toBeGreaterThanOrEqual(1.8);
        expect(lay.height / HEX, id).toBeLessThanOrEqual(2.2);
      } else if (id.includes('shipwreck')) {
        expect(lay.width / HEX, id).toBeGreaterThanOrEqual(1.4);
        expect(lay.width / HEX, id).toBeLessThanOrEqual(1.7);
      } else {
        expect(lay.width / HEX, id).toBeGreaterThanOrEqual(0.55);
        expect(lay.width / HEX, id).toBeLessThanOrEqual(0.7);
      }
      // Never the canvas: the transparent margins do not count.
      const canvasScale = (a.displayHexWidths * HEX) / (a.displayMeasure === 'height' ? a.height : a.width);
      expect(lay.scale, id).toBeGreaterThan(canvasScale);
    }
  });

  it('hangs the owner flag at the tower mast: above the roof, inside the picture, the same at any hex size', () => {
    for (const id of ['seaSites.coastal.watchtower.warm', 'seaSites.coastal.watchtower.cold']) {
      const lay = seaSiteLayout(art(id), HEX);
      expect(lay.flag, id).not.toBeNull();
      expect(-lay.flag!.y, id).toBeGreaterThan(lay.height * 0.8);
      expect(-lay.flag!.y, id).toBeLessThanOrEqual(lay.height);
      expect(Math.abs(lay.flag!.x), id).toBeLessThan(lay.width / 2);
      const big = seaSiteLayout(art(id), HEX * 2);
      expect(big.flag!.x / lay.flag!.x).toBeCloseTo(2, 5);
      expect(big.flag!.y / lay.flag!.y).toBeCloseTo(2, 5);
    }
    expect(seaSiteLayout(art('seaSites.sea.pickup.wood'), HEX).flag).toBeNull();
  });

  it('idle motion: salvage bobs 0.8–1.5 px over 3–4 s, wrecks barely move, towers never; all still under reduced motion', () => {
    let maxPick = 0;
    let maxWreck = 0;
    let maxRoll = 0;
    for (let t = 0; t < 8000; t += 25) {
      maxPick = Math.max(maxPick, Math.abs(seaSiteBob('pickup', t, 0.3, false).dy));
      const w = seaSiteBob('wreck', t, 0.3, false);
      maxWreck = Math.max(maxWreck, Math.abs(w.dy));
      maxRoll = Math.max(maxRoll, Math.abs(w.roll));
      expect(seaSiteBob('tower', t, 0.3, false)).toEqual({ dy: 0, roll: 0 });
      expect(seaSiteBob('pickup', t, 0.3, true)).toEqual({ dy: 0, roll: 0 });
      expect(seaSiteBob('wreck', t, 0.3, true)).toEqual({ dy: 0, roll: 0 });
    }
    expect(maxPick).toBeGreaterThanOrEqual(0.8);
    expect(maxPick).toBeLessThanOrEqual(1.5);
    expect(maxWreck).toBeLessThanOrEqual(0.4);
    expect((maxRoll * 180) / Math.PI).toBeLessThanOrEqual(0.15);
    // One period of the salvage bob is 3–4 s.
    const a = seaSiteBob('pickup', 1000, 0, false).dy;
    expect(seaSiteBob('pickup', 4500, 0, false).dy).toBeCloseTo(a, 6);
    expect(SEA_PICKUP_FADE_MS).toBe(250);
  });
});
