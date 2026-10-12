import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SIEGE_PANTHEONS, SIEGE_ROW } from '../src/siegeLayout';
import { GATE_FIT, GATE_REACH, gateJambs, isWallGate, wallGateScale } from '../src/siegeGate';
import type { StaticSpriteDefinition } from '../src/sprites';

const root = resolve(import.meta.dirname, '../../..');
const gates = JSON.parse(readFileSync(resolve(root, 'assets-runtime/siege-gates-v3/manifest.json'), 'utf8')) as { siege: Record<string, StaticSpriteDefinition> };
const v2 = JSON.parse(readFileSync(resolve(root, 'assets-runtime/siege-v2/manifest.json'), 'utf8')) as { siege: Record<string, StaticSpriteDefinition> };
function pngSize(file: string): [number, number] {
  const data = readFileSync(resolve(root, 'assets-runtime', file));
  expect(data.subarray(1, 4).toString()).toBe('PNG');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}
const STATES = ['intact', 'damaged', 'rubble'] as const;

describe('six-pantheon siege gate pack (siege-gates-v3)', () => {
  it('registers exactly the 18 gate states, each a native 512 × 1024 frame of its pantheon’s v5 atlas', () => {
    expect(Object.keys(gates.siege).sort()).toEqual(SIEGE_PANTHEONS.flatMap((p) => STATES.map((s) => `gate.${s}.${p}`)).sort());
    for (const p of SIEGE_PANTHEONS) {
      STATES.forEach((s, i) => {
        const def = gates.siege[`gate.${s}.${p}`]!;
        // Runtime-relative, the selected revision only; no drive letters or provenance paths.
        expect(def.file).toBe(`siege-gates-v3/gate.${p}-v5.png`);
        expect(existsSync(resolve(root, 'assets-runtime', def.file))).toBe(true);
        expect(pngSize(def.file)).toEqual([1536, 1024]);
        expect(def.frame).toEqual([i * 512, 0, 512, 1024]);
        expect(def.status).toBe('final');
        expect(isWallGate(def)).toBe(true);
        // The anchor is the painted passage centre (not a re-centred silhouette).
        const [cx, cy] = def.registration!.passageCenter;
        expect(def.anchor[0] * 512).toBeCloseTo(cx, 0);
        expect(def.anchor[1] * 1024).toBeCloseTo(cy, 0);
      });
    }
    expect(JSON.stringify(gates)).not.toMatch(/[A-Za-z]:\\|\/(home|Users)\//);
  });

  it('keeps the siege-v2 walls, towers and keeps; only the gates are replaced', () => {
    for (const p of SIEGE_PANTHEONS) for (const k of ['wall', 'tower', 'keep']) for (const s of STATES) expect(v2.siege[`${k}.${s}.${p}`], `${k}.${s}.${p}`).toBeDefined();
    // The v2 gate stills are not wall gates; the renderer keeps drawing them as stills if the pack is absent.
    expect(isWallGate(v2.siege['gate.intact.greek'])).toBe(false);
  });

  it('fits one painted passage pitch to the board row (times the presentation fit) and cuts connectors at the jambs', () => {
    const def = gates.siege['gate.intact.greek']!;
    expect(wallGateScale(def as Parameters<typeof wallGateScale>[0]) * def.registration!.startingPassagePitchPixels).toBeCloseTo(SIEGE_ROW * GATE_FIT, 6);
    for (const p of SIEGE_PANTHEONS) {
      const j = gateJambs(p);
      // A fallen neighbour's connector is cut inside the standing reach, never beyond the picture.
      expect(j.north).toBeLessThan(-0.5);
      expect(j.north).toBeGreaterThanOrEqual(-GATE_REACH / GATE_FIT - 0.01);
      expect(j.south).toBeGreaterThan(0.5);
      expect(j.south).toBeLessThan(GATE_REACH / GATE_FIT);
    }
  });
});
