/**
 * Sea creatures in the presentation layer (sea-creature delivery 2026-10-17): the piecewise
 * single-ship board (every one of its 176 cells round-trips through drawing and hit-testing; the rail
 * between deck and water and the margins select nothing), the delivered frame regions and their
 * cadences, the Isonade's three-frame shoot, the Hippocampi's reversed landing, the mirrored release
 * sockets, the Deepwater Blast's travel orientation (π on travel only, impacts unrotated), the hover
 * and sink-fade metadata and the once-per-action-token guard. The live picture is checked in
 * tests/e2e/seaCreatures.spec.ts.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SINGLE_SHIP_SEA_CELLS, SINGLE_SHIP_SEA_ENCOUNTER_V2 } from '@pr/rules';
import {
  ActionTokens,
  CORPSE_ALPHA_OVER_WATER,
  SOURCE_POINT_RULES,
  creatureSprites,
  hoverPx,
  impactRotation,
  missileFor,
  overOpenWater,
  pickTableCell,
  registerSpriteManifest,
  regionReleaseSocket,
  releasePoint,
  releaseSocket,
  spriteManifest,
  tableCellPoint,
  tableCellPolygon,
  tableProjection,
  travelLiftPx,
  travelRotation,
  waterDeathSettle,
  type SpriteManifest,
} from '../src/core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SEA = ['hippocampus', 'tempest_hippocampus', 'triton', 'stormcaller_triton', 'isonade', 'razorwake_isonade', 'cetus', 'crownfin_cetus', 'hafgufa', 'abyssal_hafgufa'] as const;
const SWIMMERS = SEA.filter((id) => !id.includes('hippocampus'));
const ART = SINGLE_SHIP_SEA_ENCOUNTER_V2.art;
// The production registry (the importer merged the sea sets and their missile profiles into it), as the interface installs it.
registerSpriteManifest(JSON.parse(readFileSync(path.join(root, 'assets-runtime/sprites/manifest.json'), 'utf8')) as SpriteManifest);

/** PNG width/height from the IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

describe('single-ship sea board projection', () => {
  const t = tableProjection(SINGLE_SHIP_SEA_CELLS, 16, 11, ART);

  it('has the delivered 176 cells and the delivered painting size', () => {
    expect(SINGLE_SHIP_SEA_CELLS).toHaveLength(176);
    expect([ART.width, ART.height]).toEqual([1672, 941]);
    expect(new Set(SINGLE_SHIP_SEA_CELLS.map((c) => `${c[0]}:${c[1]}`)).size).toBe(176);
  });

  it('round-trips every cell: its drawn centre and every point well inside its polygon pick that cell', () => {
    let checked = 0;
    for (const [col, row] of SINGLE_SHIP_SEA_CELLS) {
      const c = { col, row };
      const p = tableCellPoint(c, t);
      expect(pickTableCell(p.x, p.y, t)).toEqual(c);
      const poly = tableCellPolygon(c, t, 0.9);
      for (let i = 0; i < poly.length; i += 2) {
        // 90 % polygon corners, nudged toward the centre: still the same cell.
        const x = p.x + (poly[i]! - p.x) * 0.98;
        const y = p.y + (poly[i + 1]! - p.y) * 0.98;
        expect(pickTableCell(x, y, t)).toEqual(c);
      }
      checked++;
    }
    expect(checked).toBe(176);
  });

  it('selects nothing on the rail between deck and water, between cells or in the margins', () => {
    for (let row = 0; row < 11; row++) {
      const deck = tableCellPoint({ col: 7, row }, t);
      const water = tableCellPoint({ col: 8, row }, t);
      // The rail gap: halfway between the last deck cell and the first water cell.
      expect(pickTableCell((deck.x + water.x) / 2, (deck.y + water.y) / 2, t)).toBeNull();
    }
    const W = t.art.width;
    const H = t.art.height;
    for (const [x, y] of [
      [1, 1],
      [W - 1, 1],
      [1, H - 1],
      [W - 1, H - 1],
      [W / 2, 2],
      [W / 2, H - 2],
      [-5, H / 2],
      [W + 5, H / 2],
    ] as const) {
      expect(pickTableCell(x, y, t)).toBeNull();
    }
  });

  it('a legal mask rejects instead of picking a neighbour', () => {
    const p = tableCellPoint({ col: 3, row: 4 }, t);
    expect(pickTableCell(p.x, p.y, t, () => false)).toBeNull();
    expect(pickTableCell(p.x, p.y, t, (c) => c.col === 3)).toEqual({ col: 3, row: 4 });
  });

  it('deck columns step one standard hex width', () => {
    const a = tableCellPoint({ col: 2, row: 0 }, t);
    const b = tableCellPoint({ col: 3, row: 0 }, t);
    expect(b.x - a.x).toBeCloseTo(Math.sqrt(3), 1);
  });

  it('knows open water from the deck by the zone letters', () => {
    const board = { cells: SINGLE_SHIP_SEA_ENCOUNTER_V2.rowsText.join(''), cols: 16, legalCodes: 'k.' };
    expect(overOpenWater([{ col: 9, row: 3 }], board)).toBe(true);
    expect(overOpenWater([{ col: 2, row: 3 }], board)).toBe(false);
    // A boarding board (water never legal) is never "open water" for a figure.
    expect(overOpenWater([{ col: 9, row: 3 }], { ...board, legalCodes: undefined } as never)).toBe(false);
  });
});

describe('sea creature sprites', () => {
  it('registers all ten forms, final, under runtime keys starting sea-creatures-v1/, files inside their atlases', () => {
    for (const id of SEA) {
      const set = creatureSprites(id);
      expect(set, id).toBeTruthy();
      expect(set!.status).toBe('final');
      for (const [name, strip] of Object.entries(set!.animations)) {
        expect(strip!.file.startsWith('sea-creatures-v1/'), `${id}.${name}`).toBe(true);
        const file = path.join(root, 'assets-runtime', strip!.file);
        expect(existsSync(file), file).toBe(true);
        const { width, height } = pngSize(file);
        for (const r of strip!.regions ?? []) {
          expect(r.rect[0] + r.rect[2] <= width && r.rect[1] + r.rect[3] <= height, `${id}.${name}`).toBe(true);
          expect(r.anchor[0] >= 0 && r.anchor[0] <= r.rect[2] && r.anchor[1] >= 0 && r.anchor[1] <= r.rect[3] + 1).toBe(true);
        }
      }
    }
  });

  it('plays the delivered cadences and loop policies', () => {
    const CADENCE: Record<string, number> = { idle: 3, move: 6, shoot: 6, attack: 7, hit: 7, defend: 5, landing: 5, death: 4, victory: 4, takeoff: 6, fly: 7 };
    const LOOPS = new Set(['idle', 'move', 'fly']);
    for (const id of SEA) {
      for (const [name, strip] of Object.entries(creatureSprites(id)!.animations)) {
        expect(strip!.fps, `${id}.${name}`).toBe(CADENCE[name]);
        expect(strip!.loop, `${id}.${name}`).toBe(LOOPS.has(name));
      }
    }
  });

  it('gives the Razorwake Isonade a three-frame shoot and the Tempest Hippocampus a reversed takeoff as landing', () => {
    expect(creatureSprites('razorwake_isonade')!.animations.shoot!.regions).toHaveLength(3);
    // The Tempest's landing is its takeoff poses in reverse (the delivery); the base Hippocampus has its own landing row.
    const tempest = creatureSprites('tempest_hippocampus')!.animations;
    expect(tempest.landing!.regions!.map((r) => r.rect)).toEqual([...tempest.takeoff!.regions!].reverse().map((r) => r.rect));
    const base = creatureSprites('hippocampus')!.animations;
    expect(base.landing!.regions).toHaveLength(4);
    expect(base.landing!.regions!.map((r) => r.rect)).not.toEqual(base.takeoff!.regions!.map((r) => r.rect));
  });

  it('carries the hover only for the Hippocampi, 0.12 hex standing and 0.4 hex travelling, over water only', () => {
    const hexW = 100;
    for (const id of SEA) {
      const set = creatureSprites(id)!;
      const flyer = id.includes('hippocampus');
      expect(hoverPx(set, true, hexW)).toBeCloseTo(flyer ? 12 : 0);
      expect(hoverPx(set, false, hexW)).toBe(0);
      expect(travelLiftPx(set, hexW)).toBe(flyer ? 40 : null);
    }
  });

  it('sinks and fades a fallen creature only over water, to a readable alpha', () => {
    const set = creatureSprites('cetus')!;
    expect(waterDeathSettle(set, true, 100)).toEqual({ sinkPx: 12, fadeMs: 450, alpha: CORPSE_ALPHA_OVER_WATER });
    expect(waterDeathSettle(set, false, 100)).toBeNull();
    expect(CORPSE_ALPHA_OVER_WATER).toBeGreaterThan(0.3);
  });

  it('releases each swimmer’s missile from its delivered socket (mouth, tail tip, conch bell), mirrored with the figure', () => {
    const sources = new Set<string>();
    for (const id of SWIMMERS) {
      const set = creatureSprites(id)!;
      const shoot = set.events!.shoot!;
      sources.add(shoot.sourcePoint);
      expect(SOURCE_POINT_RULES[shoot.sourcePoint]).toBeTruthy();
      const socket = regionReleaseSocket(set.animations.shoot, set.pixelsPerHex, shoot)!;
      expect(socket.frame).toBe(shoot.releaseFrame);
      expect(socket.x).toBeGreaterThan(0); // forward of the feet
      expect(socket.y).toBeGreaterThan(0); // above the ground point
      const used = releaseSocket(id, { sourcePoint: shoot.sourcePoint, heightHex: 1, footprint: 1, ownShootStrip: true, delivered: socket });
      expect(used.calibrated).toBe(true);
      const right = releasePoint({ x: 500, y: 400 }, used, 1, 100);
      const left = releasePoint({ x: 500, y: 400 }, used, -1, 100);
      expect(right.x - 500).toBeCloseTo(500 - left.x);
      expect(right.y).toBeCloseTo(left.y);
    }
    expect([...sources].sort()).toEqual(['conch-bell', 'mouth', 'tail-tip']);
  });

  it('turns only the Deepwater Blast’s travel art by π; impacts stay unrotated', () => {
    const profiles = spriteManifest().projectileProfiles ?? {};
    for (const id of SWIMMERS) {
      const p = profiles[id];
      expect(p, id).toBeTruthy();
      const blast = id.includes('hafgufa');
      expect(travelRotation(0.3, p) - 0.3).toBeCloseTo(blast ? Math.PI : 0, 6);
      expect(impactRotation(p)).toBe(0);
    }
  });
  it('flies each swimmer’s own missile and impact from the delivery (never the generic arrow); Deck Harpoon flies the arrow', () => {
    const m = spriteManifest();
    const profiles = m.projectileProfiles ?? {};
    const shot = (attackerId: string, mode: 'shot' | 'harpoon' = 'shot') => ({ kind: 'BattleAttack', attackerId, targetId: 't', mode, damage: 5, killed: 0, targetRemaining: 3, luck: false }) as const;
    for (const id of SWIMMERS) {
      const choice = missileFor(shot('s1'), () => id, profiles);
      expect(choice?.kind, id).toBe('profile');
      if (choice?.kind !== 'profile') continue;
      const p = choice.profile;
      expect(p.file.startsWith('sea-creatures-v1/'), id).toBe(true);
      const [w, h] = [pngSize(path.join(root, 'assets-runtime', p.file)).width, pngSize(path.join(root, 'assets-runtime', p.file)).height];
      const hit = m.effects[p.impactEffectId]!;
      expect(hit, `${id} impact`).toBeTruthy();
      expect(hit.loop).toBe(false);
      for (const r of [...p.travel, ...(hit.regions ?? [])]) expect(r.rect[0] + r.rect[2] <= w && r.rect[1] + r.rect[3] <= h, id).toBe(true);
      expect(m.projectiles[p.projectileId]?.file, id).toBe(p.file);
    }
    expect(missileFor(shot('s1', 'harpoon'), () => 'veteran_hoplite', profiles)).toEqual({ kind: 'fallback', still: 'arrow' });
  });
});

describe('cosmetic events', () => {
  it('play once per action token', () => {
    const t = new ActionTokens(3);
    expect(t.take('e1')).toBe(true);
    expect(t.take('e1')).toBe(false);
    expect(t.take(null)).toBe(true);
    expect(t.take(null)).toBe(true);
    t.take('e2');
    t.take('e3');
    t.take('e4');
    // The oldest token leaves the bounded memory.
    expect(t.has('e1')).toBe(false);
    expect(t.has('e4')).toBe(true);
  });
});
