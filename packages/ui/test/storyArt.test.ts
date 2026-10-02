/**
 * Story art (ASSET_PIPELINE.md §13, delivery 2026-10-02): every delivered
 * picture is wired to its speaker, campaign, ending or mission by the documented
 * asset-ID conventions, every runtime file exists with the registered size, no
 * runtime path points outside the game's own folders, and nothing was upscaled.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import { campaignEpilogueLines, type DialogueLine } from '@pr/rules';
import { createRandomSkirmish } from '@pr/campaign';
import { briefingArt, campaignEndingArtId, speakerBust, speakerSides } from '../src/assets/storyArt';
import { resolveArt, resolveAsset } from '../src/assets/manifest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
type Entry = { file: string; kind: string; width: number; height: number; alphaBox?: number[] };
const manifest = JSON.parse(readFileSync(path.join(runtime, 'art/manifest.json'), 'utf8')) as { assets: Record<string, Entry> };
const report = JSON.parse(readFileSync(path.join(root, 'assets-source/art/IMPORT_REPORT.json'), 'utf8')) as { assets: Record<string, Entry & { source: { file: string; width: number; height: number } }> };
const catalog = buildCatalog();

/** Width, height and alpha flag from a WebP header (VP8X, VP8 or VP8L). */
function webpInfo(file: string): { w: number; h: number; alpha: boolean } {
  const b = readFileSync(file);
  expect(b.toString('latin1', 0, 4)).toBe('RIFF');
  expect(b.toString('latin1', 8, 12)).toBe('WEBP');
  const cc = b.toString('latin1', 12, 16);
  if (cc === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), alpha: (b[20]! & 0x10) !== 0 };
  if (cc === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, alpha: false };
  const bits = b.readUInt32LE(21);
  return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1, alpha: ((bits >> 28) & 1) === 1 };
}

const allLines = (): DialogueLine[] => {
  const out: DialogueLine[] = [];
  for (const m of Object.values(catalog.missions)) {
    out.push(...m.briefing, ...(m.victory ?? []));
    for (const s of m.storyScenes ?? []) out.push(...s.lines);
  }
  for (const c of Object.values(catalog.campaigns)) {
    out.push(...(c.epilogue ?? []));
    for (const v of c.epilogueVariants ?? []) out.push(...v.lines);
  }
  return out;
};

describe('story art runtime files', () => {
  it('every registered file exists with its registered size; paths stay inside assets-runtime', () => {
    const entries = Object.entries(manifest.assets);
    expect(entries.length).toBe(35 + 6 + 6 + 11 + 40 + 40);
    for (const [id, a] of entries) {
      expect(a.file.startsWith('art/'), `${id}: ${a.file}`).toBe(true);
      expect(a.file).not.toMatch(/\.\.|assets-source|\.codex|blannder|:\\|^\//i);
      const file = path.join(runtime, a.file);
      expect(existsSync(file), a.file).toBe(true);
      const info = webpInfo(file);
      expect([info.w, info.h], a.file).toEqual([a.width, a.height]);
      if (a.kind === 'bust') expect(info.alpha, `${a.file} keeps transparency`).toBe(true);
      if (a.kind === 'card') expect([a.width, a.height]).toEqual([640, 360]);
    }
  });

  it('never upscales and keeps every aspect ratio (busts 2:3, landscapes as painted)', () => {
    for (const [id, a] of Object.entries(report.assets)) {
      const s = a.source;
      expect(s.file.startsWith('assets-source/art/final/'), id).toBe(true);
      if (a.kind === 'card') continue;
      expect(a.width, id).toBeLessThanOrEqual(s.width);
      expect(a.height, id).toBeLessThanOrEqual(s.height);
      expect(Math.abs(a.width / a.height - s.width / s.height), id).toBeLessThan(0.01);
    }
  });
});

describe('story art wiring', () => {
  it('all 35 dialogue busts belong to speakers, and every story speaker with a portrait of their own has one', () => {
    const busts = Object.keys(manifest.assets).filter((k) => manifest.assets[k]!.kind === 'bust');
    expect(busts).toHaveLength(35);
    const lines = allLines();
    const used = new Set(lines.map((l) => speakerBust(l)?.id).filter(Boolean));
    for (const b of busts) expect(used.has(b), `${b} is spoken by someone`).toBe(true);
    // Every named story speaker (not the skirmish herald) shows a bust.
    const missing = [...new Set(lines.filter((l) => l.speaker !== 'Herald' && !speakerBust(l)).map((l) => `${l.speaker} (${l.portraitAssetId})`))];
    expect(missing).toEqual([]);
    // The herald borrows no one's face.
    expect(lines.filter((l) => l.speaker === 'Herald').every((l) => speakerBust(l) === null)).toBe(true);
  });

  it('six campaign covers and their cards', () => {
    const camps = Object.values(catalog.campaigns);
    expect(camps).toHaveLength(6);
    for (const c of camps) {
      expect(resolveArt(`campaign.${c.id}.cover`)?.kind, c.id).toBe('cover');
      expect(resolveArt(c.thumbnailAssetId)?.kind, c.thumbnailAssetId).toBe('card');
      expect(resolveAsset(c.thumbnailAssetId).status).toBe('final');
    }
  });

  it('eleven ending routes: one epilogue for The Three Beacons, the chosen one of two elsewhere — never the other', () => {
    let routes = 0;
    for (const c of Object.values(catalog.campaigns)) {
      if (!c.epilogueVariants?.length) {
        const id = campaignEndingArtId(c, {});
        expect(id).toBe(`ending.${c.id}.epilogue`);
        expect(resolveArt(id!)?.kind).toBe('ending');
        routes += 1;
        continue;
      }
      expect(c.epilogueVariants).toHaveLength(2);
      expect(campaignEndingArtId(c, {}), `${c.id} with no choice shows no ending`).toBeNull();
      for (const v of c.epilogueVariants) {
        const flags = { [v.flag]: true };
        const id = campaignEndingArtId(c, flags);
        expect(id).toBe(`ending.${c.id}.${v.flag}`);
        expect(resolveArt(id!)?.kind, id!).toBe('ending');
        // The picture follows the same variant as the closing lines.
        expect(campaignEpilogueLines(c, flags).slice(-v.lines.length)).toEqual(v.lines);
        routes += 1;
      }
    }
    expect(routes).toBe(11);
  });

  it('38 campaign mission pictures and 2 skirmish pictures: briefing art and 640 × 360 cards', () => {
    const campaignMissions = Object.values(catalog.campaigns).flatMap((c) => c.missionIds.map((id) => catalog.missions[id]!));
    expect(campaignMissions).toHaveLength(38);
    for (const m of campaignMissions) {
      expect(resolveArt(m.thumbnailAssetId)?.kind, m.id).toBe('card');
      expect(briefingArt(m.thumbnailAssetId)?.kind, m.id).toBe('briefing');
    }
    // Every Twin Harbors pairing shares one picture; random maps carry their own.
    const skirmish = Object.values(catalog.missions).filter((m) => !m.campaignId);
    expect(new Set(skirmish.map((m) => m.thumbnailAssetId))).toEqual(new Set(['mission.skirmish.twin_harbors.thumbnail']));
    const g = createRandomSkirmish(catalog, { seed: 3, size: 'small', seats: [{ pantheonId: 'greek', controller: 'human' }, { pantheonId: 'norse', controller: 'ai' }], victory: { type: 'elimination' }, monsters: 'none' });
    expect(g.mission.thumbnailAssetId).toBe('mission.skirmish.random.thumbnail');
    for (const id of ['mission.skirmish.twin_harbors.thumbnail', 'mission.skirmish.random.thumbnail']) {
      expect(resolveArt(id)?.kind).toBe('card');
      expect(briefingArt(id)?.kind).toBe('briefing');
    }
  });

  it('speakers keep their side through a scene; the campaign hero speaks from the left', () => {
    const lines = [{ speaker: 'Thaleia' }, { speaker: 'Alexios' }, { speaker: 'Ione' }, { speaker: 'Thaleia' }];
    const sides = speakerSides(lines, 'Alexios');
    expect(sides.get('Alexios')).toBe('left');
    expect(sides.get('Thaleia')).toBe('right');
    expect(sides.get('Ione')).toBe('left');
    expect(speakerSides(lines, null).get('Thaleia')).toBe('left');
  });
});
