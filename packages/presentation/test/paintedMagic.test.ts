import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { PAINTED_MAGIC } from '../src/paintedMagicData';
import { EXPANSION_LOOKS } from '../src/expansionLooks';
import { MAGIC_POSE_WEIGHTS, magicPoseAt } from '../src/paintedMagicTypes';
import { magicParticlePosition } from '../src/paintedMagic';
import { regionsInside } from '../src/sprites';
import roster from '../../../assets-runtime/expansion-magic-v1/roster.json';
import icons from '../../../assets-runtime/expansion-magic-v2/icons.json';

describe('painted expansion magic', () => {
  it('binds all 42 spells and 12 miracles to distinct real artwork', () => {
    expect(Object.keys(PAINTED_MAGIC)).toHaveLength(54);
    expect(new Set(Object.values(PAINTED_MAGIC).map(r => r.strip.file)).size).toBe(54);
    expect(new Set(Object.values(PAINTED_MAGIC).map(r => r.sequence)).size).toBe(54);
    for (const item of roster) {
      const r = PAINTED_MAGIC[item.id]!;
      expect(r.name).toBe(item.name);
      expect(r.miracle).toBe(item.miracle);
      expect(EXPANSION_LOOKS[item.id]!.magicArt).toBe(item.id);
      expect(EXPANSION_LOOKS[item.id]!.travel).toBe('none');
      expect(r.strip.frames).toBe(8);
      expect(r.strip.regions).toHaveLength(8);
      expect(regionsInside(r.strip, r.strip.frameWidth * 4, r.strip.frameHeight * 2)).toBe(true);
      const key = `icon.${item.miracle ? 'intervention' : 'spell'}.${item.id}`;
      expect((icons as Record<string, string>)[key]).toBe(r.icon);
      for (const path of [r.icon, r.strip.file]) {
        expect(existsSync(`assets-runtime/${path}`)).toBe(true);
        expect(readFileSync(`assets-runtime/${path}`).subarray(8, 12).toString()).toBe('WEBP');
      }
    }
  });
  it('keeps authored anticipation, strike and fade in an ordered timeline', () => {
    expect(MAGIC_POSE_WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(magicPoseAt(0).frame).toBe(0);
    expect(magicPoseAt(.4).frame).toBe(3);
    expect(magicPoseAt(1)).toEqual({ frame: 7, next: 7, mix: 0 });
    let last = 0;
    for (let t = 0; t <= 1; t += .001) {
      const pose = magicPoseAt(t);
      expect(pose.frame).toBeGreaterThanOrEqual(last);
      expect(pose.mix).toBeGreaterThanOrEqual(0);
      expect(pose.mix).toBeLessThanOrEqual(1);
      last = pose.frame;
    }
  });
  it('uses material motion: gravity converges, embers rise, feathers fall', () => {
    const gravity = magicParticlePosition('gravity', 1, 4);
    expect(gravity.x).toBeCloseTo(0); expect(gravity.y).toBeCloseTo(-.65);
    expect(magicParticlePosition('ember', .9, 4).y).toBeLessThan(magicParticlePosition('ember', .1, 4).y);
    expect(magicParticlePosition('feather', .9, 4).y).toBeGreaterThan(magicParticlePosition('feather', .1, 4).y);
    expect(magicParticlePosition('stone', .5, 4)).not.toEqual(magicParticlePosition('paper', .5, 4));
  });
});
