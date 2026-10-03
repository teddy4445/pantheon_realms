/**
 * Context cursors (GPT6_BRIEF_7_CURSORS.md, art delivered 2026-10-03): every
 * cursor ID resolves to its 1x/2x art with the delivery's hotspot, the sword
 * turns to six sides, and the adventure map and battlefield pick the cursor
 * that matches what a click would do.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { legalActions, siteAt, type HexCoord } from '@pr/rules';
import { CURSOR_IDS, cursorCss, cursorDelivered, meleeAngle } from '../src/assets/cursors';
import manifest from '../../../assets-runtime/ui/cursors/manifest.json';
import { adventureCursor, battleCursor } from '../src/app/cursorContext';

describe('cursor values', () => {
  it('all 24 delivered cursors (2026-10-03) resolve to their 1x/2x art with an in-bounds hotspot and a system fallback', () => {
    expect(CURSOR_IDS).toHaveLength(24);
    for (const id of CURSOR_IDS) {
      expect(cursorDelivered(id), id).toBe(true);
      const css = cursorCss(id);
      const m = /^image-set\(url\("[^"]*\/ui\/cursors\/([^"]+)\.png"\) 1x, url\("[^"]*\/ui\/cursors\/([^"]+)@2x\.png"\) 2x\) (\d+) (\d+), ([a-z-]+)$/.exec(css);
      expect(m, `${id}: ${css}`).not.toBeNull();
      expect(m![1]).toBe(m![2]);
      const [hx, hy] = [Number(m![3]), Number(m![4])];
      const art = (manifest as { assets: Record<string, { size: [number, number]; hotspot: [number, number] }> }).assets[m![1]!]!;
      expect([hx, hy]).toEqual(art.hotspot);
      expect(hx).toBeLessThan(art.size[0]);
      expect(hy).toBeLessThan(art.size[1]);
      // Off (Settings → Game cursors): the plain system cursor.
      expect(cursorCss(id, { enabled: false })).toMatch(/^[a-z-]+$/);
    }
    // Hotspots of the delivery (32 px): arrow and gauntlet at the tip, sword at its point, the rest centred.
    const hot = (id: Parameters<typeof cursorCss>[0], angle?: number) => / (\d+ \d+), [a-z-]+$/.exec(cursorCss(id, { angle }))![1];
    expect(hot('cursor.ui.default')).toBe('2 2');
    expect(hot('cursor.ui.pointer')).toBe('2 2');
    expect(hot('cursor.battle.info')).toBe('16 16');
    expect(hot('cursor.battle.melee', 0)).toBe('30 16');
    expect(cursorCss('cursor.blocked', { enabled: false })).toBe('not-allowed');
    expect(cursorCss('cursor.ui.busy', { enabled: false })).toBe('progress');
  });

  it('the sword turns to the side the strike comes from; its point stays the hotspot', () => {
    expect(meleeAngle(1, 0)).toBe(0);
    expect(meleeAngle(1, 1.7)).toBe(60);
    expect(meleeAngle(-1, 1.7)).toBe(120);
    expect(meleeAngle(-1, 0)).toBe(180);
    expect(meleeAngle(-1, -1.7)).toBe(240);
    expect(meleeAngle(1, -1.7)).toBe(300);
    const assets = (manifest as { assets: Record<string, { size: [number, number]; hotspot: [number, number] }> }).assets;
    for (const angle of [0, 60, 120, 180, 240, 300]) {
      const a = assets[`cursor.battle.melee@${angle}`]!;
      expect(cursorCss('cursor.battle.melee', { angle })).toContain(`cursor.battle.melee@${angle}.png`);
      // The point lies on the side the sword turned to (screen: x right, y down).
      const cx = a.size[0] / 2;
      const cy = a.size[1] / 2;
      const r = (angle * Math.PI) / 180;
      const along = (a.hotspot[0] - cx) * Math.cos(r) + (a.hotspot[1] - cy) * Math.sin(r);
      expect(along, `angle ${angle}`).toBeGreaterThan(cx * 0.6);
    }
  });
});

describe('adventure map cursor', () => {
  const d = GameDriver.mission('skirmish_twin_harbors');
  const s = d.state;
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = Object.values(s.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!;
  const ctx = { humanTurn: true, casting: null, dragging: false };
  const at = (c: HexCoord) => adventureCursor(d.catalog, s, 'player', hero, c, ctx).id;

  it('matches what a click does', () => {
    const own = siteAt(d.catalog, s, hero.position);
    expect(at(hero.position)).toBe(own?.def.kind.type === 'town' ? 'cursor.map.town' : 'cursor.map.hero');
    const mine = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!;
    expect(at(mine.coord)).toBe('cursor.map.attack');
    const enemyTown = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_town_e')!;
    expect(at(enemyTown.coord)).toBe('cursor.map.siege');
    const next = { q: hero.position.q + 1, r: hero.position.r };
    expect(['cursor.map.move', 'cursor.map.visit', 'cursor.blocked']).toContain(at(next));
    // A tile far beyond today's movement but reachable.
    const kinds = new Set<string>();
    for (let q = 0; q < s.world.map.width; q++) for (let r = 0; r < s.world.map.height; r++) kinds.add(at({ q, r }));
    for (const k of ['cursor.map.move', 'cursor.map.move_later', 'cursor.blocked', 'cursor.map.visit']) expect(kinds, k).toContain(k);
  });

  it('busy on another empire’s turn, grabbing while the map is dragged, default off the map', () => {
    expect(adventureCursor(d.catalog, s, 'player', hero, hero.position, { ...ctx, humanTurn: false }).id).toBe('cursor.ui.busy');
    expect(adventureCursor(d.catalog, s, 'player', hero, hero.position, { ...ctx, dragging: true }).id).toBe('cursor.ui.grabbing');
    expect(adventureCursor(d.catalog, s, 'player', hero, null, ctx).id).toBe('cursor.ui.default');
  });
});

describe('battlefield cursor', () => {
  const d = GameDriver.mission('skirmish_twin_harbors');
  const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!;
  const mine = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  d.marchTo({ q: mine.q - 1, r: mine.r }, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: mine, confirmEncounter: true });
  for (let i = 0; i < 30 && d.state.battle && legalActions(d.catalog, d.state) === null; i++) d.autoBattleStep();

  it('move, info, melee from a side, busy without legal actions', () => {
    const b = d.state.battle!;
    const la = legalActions(d.catalog, d.state);
    expect(la).not.toBeNull();
    const ctx = { battleActive: true, deploying: false };
    const pick = (cell: { col: number; row: number }, from: { col: number; row: number } | null = null) => battleCursor(d.catalog, d.state, la, { kind: 'normal' }, cell, from, ctx);
    if (la!.moves.length) expect(['cursor.battle.move', 'cursor.battle.fly']).toContain(pick(la!.moves[0]!).id);
    const own = Object.values(b.stacks).find((x) => x.side === la!.side && x.totalHp > 0 && x.id !== la!.stackId) ?? b.stacks[la!.stackId]!;
    expect(pick(own.anchor).id).toBe('cursor.battle.info');
    const enemy = Object.values(b.stacks).find((x) => x.side !== la!.side && x.totalHp > 0)!;
    const strike = pick(enemy.anchor, { col: enemy.anchor.col - 1, row: enemy.anchor.row });
    if (la!.shootTargets.includes(enemy.id)) expect(['cursor.battle.shoot', 'cursor.battle.shoot_weak']).toContain(strike.id);
    else expect(strike).toEqual({ id: 'cursor.battle.melee', angle: 0 });
    expect(battleCursor(d.catalog, d.state, null, { kind: 'normal' }, enemy.anchor, null, ctx).id).toBe('cursor.ui.busy');
    expect(pick({ col: 7, row: 5 }, null).id).toMatch(/cursor\.(battle\.move|battle\.fly|blocked|battle\.info)/);
  });
});
