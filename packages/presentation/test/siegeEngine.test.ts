/**
 * The siege engine's pictures on the battle board (targetableCatapultV1): stage by HP, sizing by the
 * painted (visible) box rather than the canvas, facing the walls, and the restrained aiming arc.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameEvent } from '@pr/rules';
import { CATAPULT_INTACT_VISIBLE, ENGINE_ART_FACING, catapultArc, engineDrawnBox, engineStageDraw, engineStageOf, missileFor } from '../src/core';

const root = join(__dirname, '../../..');
const kit = JSON.parse(readFileSync(join(root, 'assets-runtime/expedition-v1/manifest.json'), 'utf8')) as { assets: Record<string, { width: number; height: number; visibleBounds: [number, number, number, number]; file: string }> };
const damaged = kit.assets['expedition.catapult-damaged']!;
const destroyed = kit.assets['expedition.catapult-destroyed']!;

describe('siege engine pictures', () => {
  it('intact above half HP, damaged from half down to 1, destroyed at 0 (the policy for 120 HP: >60, 1–60, 0)', () => {
    expect(engineStageOf(120, 120)).toBe('intact');
    expect(engineStageOf(61, 120)).toBe('intact');
    expect(engineStageOf(60, 120)).toBe('damaged');
    expect(engineStageOf(1, 120)).toBe('damaged');
    expect(engineStageOf(0, 120)).toBe('destroyed');
  });

  it('the kit pictures are registered with relative runtime paths and their visible boxes', () => {
    expect(damaged.file).toBe('expedition-v1/catapult-damaged.png');
    expect(destroyed.file).toBe('expedition-v1/catapult-destroyed.png');
    expect(damaged.width).toBe(1254);
    expect(damaged.visibleBounds[0]).toBeCloseTo(0.09968, 4);
  });

  it('sizes each stage by its painted box: the damaged engine as wide as the intact one, the wreck in proportion', () => {
    const W = 132; // the intact engine's painted width on the board
    const d = engineStageDraw(damaged, W, 1);
    const box = engineDrawnBox(damaged, d, { x: 0, y: 0 });
    expect(box.x1 - box.x0).toBeCloseTo(W, 6);
    // Its visible bottom centre stands on the ground point (not the canvas's transparent margin).
    expect(d.anchorY).toBeCloseTo(damaged.visibleBounds[3], 6);
    expect(d.anchorX).toBeCloseTo((damaged.visibleBounds[0] + damaged.visibleBounds[2]) / 2, 6);
    const w = engineStageDraw(destroyed, W, 1, damaged);
    const wb = engineDrawnBox(destroyed, w, { x: 0, y: 0 });
    // Same canvas scale as the damaged picture: the wreck's painted width keeps its ratio to it.
    const ratio = (destroyed.visibleBounds[2] - destroyed.visibleBounds[0]) / (damaged.visibleBounds[2] - damaged.visibleBounds[0]);
    expect((wb.x1 - wb.x0) / W).toBeCloseTo(ratio, 6);
    expect(Math.abs(w.scaleX)).toBeCloseTo(Math.abs(d.scaleX), 9);
    // The intact still's measured box matches its manifest anchor (bottom centre at 0.5, ~0.95).
    expect((CATAPULT_INTACT_VISIBLE[0] + CATAPULT_INTACT_VISIBLE[2]) / 2).toBeCloseTo(0.5, 2);
    expect(CATAPULT_INTACT_VISIBLE[3]).toBeCloseTo(0.95, 2);
  });

  it('the art throws to the right; an engine facing east (the attacker, toward the walls) is drawn unmirrored', () => {
    expect(ENGINE_ART_FACING).toBe(1);
    expect(engineStageDraw(damaged, 100, 1).scaleX).toBeGreaterThan(0);
    expect(engineStageDraw(damaged, 100, -1).scaleX).toBeLessThan(0);
  });

  it('the aiming arc starts at the engine, ends on the target and rises a restrained amount', () => {
    const pts = catapultArc({ x: 0, y: 100 }, { x: 800, y: 300 }, 20);
    expect(pts[0]).toEqual({ x: 0, y: 100 });
    expect(pts[pts.length - 1]).toEqual({ x: 800, y: 300 });
    const top = Math.min(...pts.map((p) => p.y));
    expect(top).toBeLessThan(100);
    expect(100 - top).toBeLessThanOrEqual(90);
  });

  it('a shot at the engine flies the shooter’s own missile; a blow or spell flies nothing', () => {
    const profiles = { peltast: { unitId: 'peltast' } as never };
    const ev = (source: 'melee' | 'shot' | 'spell') => ({ kind: 'EngineDamaged', engineId: 'catapult', attackerId: source === 'spell' ? null : 'g0', source, damage: 5, hp: 100, maxHp: 120, luck: false }) as unknown as GameEvent;
    expect(missileFor(ev('shot'), () => 'peltast', profiles)).toMatchObject({ kind: 'profile', profileId: 'peltast' });
    expect(missileFor(ev('shot'), () => 'unknown_shooter', profiles)).toEqual({ kind: 'fallback', still: 'arrow' });
    expect(missileFor(ev('melee'), () => 'peltast', profiles)).toBeNull();
    expect(missileFor(ev('spell'), () => null, profiles)).toBeNull();
  });
});
