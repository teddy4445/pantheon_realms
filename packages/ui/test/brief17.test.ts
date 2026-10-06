/**
 * GPT-6 Brief 17 in the game (owner delivery 2026-10-06): the ground-transition
 * masks and shore foam, 24 town backgrounds (four town-hall stages per
 * pantheon), three markers, 16 story portraits and the neutral map hero — every
 * ID resolves to a final file on disk with the delivered metadata.
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAsset } from '../src/assets/manifest';
import spriteManifest from '../../../assets-runtime/sprites/manifest.json';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const onDisk = (url: string | null) => !!url && existsSync(path.join(root, 'assets-runtime', url.replace(/^\.\//, '')));

const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];
const PORTRAITS = [
  'hero.celtic.cathal.portrait',
  'hero.celtic.sadb.portrait',
  'hero.egyptian.nebet.portrait',
  'hero.egyptian.pawah.portrait',
  'hero.greek.ione.portrait',
  'hero.greek.thaleia.portrait',
  'hero.japanese.genzo.portrait',
  'hero.japanese.shiro.portrait',
  'hero.mesoamerican.chimal.portrait',
  'hero.mesoamerican.xoco.portrait',
  'hero.norse.eydis.portrait',
  'hero.norse.jokul.portrait',
  'hero.norse.skeggi.portrait',
  'hero.norse.svanhild.portrait',
  'hero.norse.troll_wife.portrait',
  'story.herald.portrait',
];
const MARKERS = ['icon.marker.hero', 'icon.marker.enemy-hero', 'icon.marker.encounter'];

describe('Brief 17 delivered art in the game', () => {
  it('24 town backgrounds: four stages for each of the six pantheons', () => {
    for (const p of PANTHEONS) {
      for (const n of [1, 2, 3, 4]) {
        const rec = resolveAsset(`town.${p}.background.l${n}`);
        expect(rec.status, rec.id).toBe('final');
        expect(onDisk(rec.url), rec.id).toBe(true);
      }
    }
  });

  it('the three markers and the 16 story portraits are final', () => {
    for (const id of [...MARKERS, ...PORTRAITS]) {
      const rec = resolveAsset(id);
      expect(rec.status, id).toBe('final');
      expect(onDisk(rec.url), id).toBe(true);
    }
  });

  it('ground: all six transition characters and the shore foam atlas', () => {
    const g = (spriteManifest as unknown as { ground: { edges: { status: string; file: string; characters: string[] }; foam: { status: string; file: string; cols: number; rows: number; cell: number } } }).ground;
    expect(g.edges.status).toBe('final');
    expect([...g.edges.characters].sort()).toEqual(['boggy', 'meadow', 'rocky', 'scree', 'shore', 'woodland']);
    expect(onDisk(g.edges.file)).toBe(true);
    expect(g.foam.status).toBe('final');
    expect([g.foam.cols, g.foam.rows, g.foam.cell]).toEqual([6, 3, 256]);
    expect(onDisk(g.foam.file)).toBe(true);
  });

  it('the neutral map hero: idle, walk, prepare and cast in five directions with the delivered timing', () => {
    type Anim = { frames: number; fps: number; loop: boolean; anchor: number[]; frameWidth: number; frameHeight: number; pixelsPerHex: number; status: string; file: string; directions: Record<string, Anim> };
    const n = (spriteManifest as unknown as { heroes: Record<string, { status: string; animations: Record<string, Anim> }> }).heroes['neutral']!;
    expect(n.status).toBe('final');
    const want: Record<string, [number, number, boolean]> = { idle: [4, 3, true], walk: [6, 8, true], prepare: [6, 6, false], cast: [6, 6, false] };
    for (const [name, [frames, fps, loop]] of Object.entries(want)) {
      const a = n.animations[name]!;
      expect(Object.keys(a.directions).sort(), name).toEqual(['e', 'n', 'ne', 's', 'se']);
      for (const [dir, d] of Object.entries(a.directions)) {
        expect([d.frames, d.fps, d.loop, d.status], `${name}.${dir}`).toEqual([frames, fps, loop, 'final']);
        expect(d.anchor).toEqual([0.5, 0.88]);
        // Square frames, the delivered 320 px per 150 px of hex scaled together (never the strip's total width).
        expect(d.frameWidth).toBe(d.frameHeight);
        expect(d.frameWidth / d.pixelsPerHex).toBeCloseTo(320 / 150, 2);
        expect(onDisk(`./${d.file}`), d.file).toBe(true);
      }
    }
  });
});
