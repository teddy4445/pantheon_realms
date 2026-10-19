/**
 * Hero ship motion (expedition kit `runtime/ship-motion.js`, ported to `shipMotion.ts`): the TypeScript
 * port answers exactly as the kit's reference for every state, time and reduced-motion setting; the
 * direction picks the painted facing and mirror from the projected angle (never a rotation); the six
 * rules facings map to the six headings; the flag's mast point mirrors x → 1 − x with the hull; the
 * crossfade and sinking layers; reduced motion holds bob, roll, wake and shaking still. Pure functions
 * of presentation time: no RNG, no rules state.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  MAP_TOKEN_HEADINGS,
  SHIP_MOTION,
  SHIP_MOTION_STATES,
  facingHeading,
  mapTokenPicture,
  registerSpriteManifest,
  shipDirection,
  shipPose,
  shipTokenLayout,
  sinkingLayers,
  spriteManifest,
  transitionLayers,
  type MapTokenHeading,
  type SpriteManifest,
} from '../src/core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** The kit's own runtime reference, evaluated in a sandbox (the delivered file, unchanged). */
function kitMotion(): { shipPose: (s: string, t: number, r?: boolean) => Record<string, number>; direction: (a: number) => { sprite: string; flipX: boolean }; states: Record<string, { loop: boolean; durationMs: number }> } {
  const code = readFileSync(path.join(root, 'assets-source/expedition-v1/runtime/ship-motion.js'), 'utf8');
  const sandbox: Record<string, unknown> = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox);
  return sandbox.FieldKitMotion as ReturnType<typeof kitMotion>;
}

/** The expedition map tokens as the interface registers them (assets-runtime/expedition-v1/manifest.json). */
function withTokens(): void {
  const exp = JSON.parse(readFileSync(path.join(root, 'assets-runtime/expedition-v1/manifest.json'), 'utf8')) as { mapTokens: SpriteManifest['mapTokens'] };
  registerSpriteManifest({ ...spriteManifest(), mapTokens: exp.mapTokens } as SpriteManifest, (f) => `./${f}`);
}

describe('ship motion: the port of the kit runtime', () => {
  const kit = kitMotion();

  it('has the kit states, durations and loops', () => {
    expect(Object.keys(kit.states).sort()).toEqual([...SHIP_MOTION_STATES].sort());
    for (const s of SHIP_MOTION_STATES) expect(SHIP_MOTION[s]).toEqual(kit.states[s]);
  });

  it('answers exactly as the reference for every state, time and reduced-motion setting', () => {
    for (const s of [...SHIP_MOTION_STATES, 'unknown']) {
      for (const reduced of [false, true]) {
        for (let t = -100; t <= 4000; t += 37) {
          const a = shipPose(s, t, reduced);
          const b = kit.shipPose(s, t, reduced);
          for (const k of ['x', 'y', 'rotation', 'opacity', 'wakeOpacity', 'flagWave', 'progress'] as const) expect(a[k], `${s} t=${t} reduced=${reduced} ${k}`).toBeCloseTo(b[k]!, 12);
        }
      }
    }
  });

  it('idle bobs 1.4 px and rolls 0.65° over 3.2 s; sailing bobs 2 px, rolls 1° and shows the wake at 0.55', () => {
    expect(shipPose('idle', 800).y).toBeCloseTo(1.4, 9);
    expect(shipPose('idle', 800).rotation).toBeCloseTo(0.65, 9);
    expect(shipPose('idle', 800).wakeOpacity).toBe(0);
    expect(shipPose('sailing', 450).y).toBeCloseTo(2, 9);
    expect(shipPose('sailing', 575).rotation).toBeCloseTo(1, 9);
    expect(shipPose('sailing', 1).wakeOpacity).toBe(0.55);
    // The boarding hold: a calmer roll and a faint wake (the vessels hold still).
    expect(Math.abs(shipPose('boarding', 800).rotation)).toBeCloseTo(0.26, 9);
    expect(shipPose('boarding', 800).wakeOpacity).toBe(0.12);
  });

  it('hit recoils for 420 ms and settles; sinking drops, rolls and fades over 1.8 s', () => {
    expect(shipPose('hit', 420).x).toBeCloseTo(0, 9);
    expect(shipPose('hit', 420).rotation).toBeCloseTo(0, 9);
    expect(shipPose('hit', 420).progress).toBe(1);
    const end = shipPose('sinking', 1800);
    // The drop rides on the idle buoyancy (the kit adds it to the bob).
    expect(end.y - shipPose('idle', 1800).y).toBeCloseTo(32, 9);
    expect(end.rotation).toBeCloseTo(8, 9);
    expect(end.opacity).toBe(0);
    expect(shipPose('embark', 325).opacity).toBeCloseTo(0.5, 9);
    expect(shipPose('disembark', 650).opacity).toBe(0);
  });

  it('reduced motion: no bob, roll, wake, shaking or flutter — only the readable state changes', () => {
    for (const s of SHIP_MOTION_STATES) {
      for (const t of [0, 210, 900, 1799, 1800, 3000]) {
        const p = shipPose(s, t, true);
        expect([p.x, p.y, p.rotation, p.wakeOpacity, p.flagWave], `${s} ${t}`).toEqual([0, 0, 0, 0, 0]);
      }
    }
    expect(shipPose('sinking', 1800, true).opacity).toBe(0);
    expect(shipPose('sinking', 900, true).opacity).toBe(1);
    expect(shipPose('disembark', 10, true).opacity).toBe(0);
  });

  it('picks the painted facing and mirror from the projected angle, as the kit direction()', () => {
    const want: [number, string, boolean][] = [
      [0, 'e', false],
      [-30, 'ne', false],
      [30, 'se', false],
      [180, 'e', true],
      [-150, 'ne', true],
      [150, 'se', true],
      [-90, 'ne', false],
      [90, 'se', false],
      [14, 'e', false],
      [-166, 'e', true],
    ];
    for (const [a, facing, flipX] of want) expect(shipDirection(a), String(a)).toEqual({ facing, flipX });
    for (let a = -360; a <= 360; a += 7) {
      const k = kit.direction(a);
      expect(shipDirection(a), String(a)).toEqual({ facing: k.sprite, flipX: k.flipX });
    }
  });

  it('maps the six rules facings (AXIAL_DIRECTIONS) to the six projected headings', () => {
    const got = [0, 1, 2, 3, 4, 5].map((f) => facingHeading(f));
    expect(got).toEqual(['e', 'ne', 'nw', 'w', 'sw', 'se']);
    expect(new Set(got).size).toBe(6);
    expect(facingHeading(6)).toBe('e');
    expect(facingHeading(-1)).toBe('se');
  });

  it('crossfades the avatar and the crewed ship over embark / disembark; sinking fades the hull into the wreck', () => {
    expect(transitionLayers('embark', 0)).toEqual({ avatar: 1, crew: 0 });
    expect(transitionLayers('embark', 1)).toEqual({ avatar: 0, crew: 1 });
    expect(transitionLayers('disembark', 0)).toEqual({ avatar: 0, crew: 1 });
    expect(transitionLayers('disembark', 1)).toEqual({ avatar: 1, crew: 0 });
    expect(transitionLayers('embark', 0.2, true)).toEqual({ avatar: 0, crew: 1 });
    expect(sinkingLayers(0)).toEqual({ hull: 1, wreck: 0 });
    const mid = sinkingLayers(0.7);
    expect(mid.hull).toBe(0);
    expect(mid.wreck).toBe(1);
    expect(sinkingLayers(1)).toEqual({ hull: 0, wreck: 0 });
    expect(sinkingLayers(0.3, true)).toEqual({ hull: 1, wreck: 0 });
    expect(sinkingLayers(0.6, true)).toEqual({ hull: 0, wreck: 1 });
    expect(sinkingLayers(1, true)).toEqual({ hull: 0, wreck: 0 });
  });
});

describe('ship token layout: visible bounds, mirroring and the flag mount', () => {
  it('sizes the visible hull to 1.2 hexes and mirrors W/NW/SW around the ground point; the flag mount follows x → 1 − x', () => {
    withTokens();
    const hex = 62.35;
    for (const h of MAP_TOKEN_HEADINGS) {
      const t = mapTokenPicture('ship', h as MapTokenHeading)!;
      expect(t, h).not.toBeNull();
      const lay = shipTokenLayout(t, hex);
      const b = t.picture.visibleBounds;
      // The transparent margin is not the footprint: the PAINTED width spans 1.2 hexes.
      expect((b[2] - b[0]) * t.picture.width * lay.scale).toBeCloseTo(hex * 1.2, 6);
      expect(lay.visibleWidth).toBeCloseTo(hex * 1.2, 6);
      const west = h === 'w' || h === 'nw' || h === 'sw';
      expect(lay.flipX, h).toBe(west);
      // Mount [0.52, 0.08]: the flag stands at the masthead, above the ground point, on the mirrored side when flipped.
      const m = t.def.flag!.mount;
      const ax = t.picture.groundAnchor[0];
      const expectedX = ((west ? 1 - m[0] : m[0]) - (west ? 1 - ax : ax)) * t.picture.width * lay.scale;
      expect(lay.flag!.x).toBeCloseTo(expectedX, 6);
      expect(lay.flag!.y).toBeLessThan(-hex * 0.6);
    }
    const e = shipTokenLayout(mapTokenPicture('ship', 'e')!, hex);
    const w = shipTokenLayout(mapTokenPicture('ship', 'w')!, hex);
    expect(w.flag!.x).toBeCloseTo(-e.flag!.x, 6);
    expect(w.flag!.y).toBeCloseTo(e.flag!.y, 6);
    // The wreck still is one picture, mirrored with the ship it replaces.
    expect(mapTokenPicture('ship-wreck', 'sw')!.flipX).toBe(true);
    expect(mapTokenPicture('ship-wreck', 'se')!.flipX).toBe(false);
  });
});
