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
import { AWAITING_BRIEF_18, awaitingCampaign, awaitingPortrait } from './awaitingArt';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
type Entry = { file: string; kind: string; width: number; height: number; alphaBox?: number[] };
const manifest = JSON.parse(readFileSync(path.join(runtime, 'art/manifest.json'), 'utf8')) as { assets: Record<string, Entry> };
const report = JSON.parse(readFileSync(path.join(root, 'assets-source/art/IMPORT_REPORT.json'), 'utf8')) as { assets: Record<string, Entry & { source: { file: string; width: number; height: number } }> };
const catalog = buildCatalog();
/** Brief 1 kinds (ground and sky: groundArt.test.ts; big moments: bigMoments.test.ts). */
const STORY_KINDS = ['bust', 'cover', 'ending', 'briefing', 'card'];

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
    const entries = Object.entries(manifest.assets).filter(([, a]) => STORY_KINDS.includes(a.kind));
    // Busts, covers, campaign cards, endings, mission pictures and their cards (incl. the six skirmish maps of Brief 14).
    expect(entries.length).toBe(40 + 7 + 7 + 13 + 53 + 53);
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
      if (!STORY_KINDS.includes(a.kind)) continue; // groundArt.test.ts, bigMoments.test.ts
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
  it('all 40 busts belong to story speakers or catalog heroes, and every story speaker has one (the Herald’s own since 2026-10-04)', () => {
    const busts = Object.keys(manifest.assets).filter((k) => manifest.assets[k]!.kind === 'bust');
    expect(busts).toHaveLength(40);
    const lines = allLines();
    const used = new Set(lines.map((l) => speakerBust(l)?.id).filter(Boolean));
    // A hero who never speaks (The Silent Oracle's Phaidon) still shows his bust where he stands in a scene (HeroFigure).
    const heroBusts = new Set(Object.values(catalog.heroes).map((h) => speakerBust({ portraitAssetId: h.portraitAssetId })?.id).filter(Boolean));
    for (const b of busts) expect(used.has(b) || heroBusts.has(b), `${b} is spoken by someone or a catalog hero's`).toBe(true);
    // Every story speaker shows a bust — except art still awaited from a brief (awaitingArt.ts; none since Brief 18 was imported).
    const missing = [...new Set(lines.filter((l) => !speakerBust(l) && !awaitingPortrait(l.portraitAssetId)).map((l) => `${l.speaker} (${l.portraitAssetId})`))];
    expect(missing).toEqual([]);
    const awaited = new Set(lines.filter((l) => awaitingPortrait(l.portraitAssetId)).map((l) => l.portraitAssetId));
    for (const id of awaited) expect(speakerBust({ portraitAssetId: id }), `${id}: delivered — empty AWAITING_BRIEF_18`).toBeNull();
    // The herald has its own bust (an ordinary messenger), through the same .portrait → .bust route; it borrows no hero's face.
    const herald = lines.filter((l) => l.speaker === 'Herald');
    expect(herald.length).toBeGreaterThan(0);
    expect(herald.every((l) => l.portraitAssetId === 'story.herald.portrait' && speakerBust(l)?.id === 'story.herald.bust')).toBe(true);
  });

  it('a cover and a card for every campaign (The Silent Oracle’s from Brief 18, imported 2026-10-14)', () => {
    const camps = Object.values(catalog.campaigns);
    expect(camps).toHaveLength(7);
    for (const c of camps.filter((x) => awaitingCampaign(x.id))) {
      expect(resolveArt(`campaign.${c.id}.cover`), `${c.id}: delivered — empty AWAITING_BRIEF_18`).toBeFalsy();
      expect(resolveAsset(c.thumbnailAssetId).status).toBe('procedural');
    }
    for (const c of camps.filter((x) => !awaitingCampaign(x.id))) {
      expect(resolveArt(`campaign.${c.id}.cover`)?.kind, c.id).toBe('cover');
      expect(resolveArt(c.thumbnailAssetId)?.kind, c.thumbnailAssetId).toBe('card');
      expect(resolveAsset(c.thumbnailAssetId).status).toBe('final');
    }
  });

  it('thirteen ending routes: one epilogue for The Three Beacons, the chosen one of two elsewhere — never the other', () => {
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
        if (awaitingCampaign(c.id)) {
          expect(resolveArt(id!), `${id}: delivered — empty AWAITING_BRIEF_18`).toBeFalsy();
          continue;
        }
        expect(resolveArt(id!)?.kind, id!).toBe('ending');
        // The picture follows the same variant as the closing lines.
        expect(campaignEpilogueLines(c, flags).slice(-v.lines.length)).toEqual(v.lines);
        routes += 1;
      }
    }
    expect(routes).toBe(13);
  });

  it('45 campaign mission pictures (The Silent Oracle’s seven from Brief 18) and 2 skirmish pictures: briefing art and 640 × 360 cards', () => {
    const campaignMissions = Object.values(catalog.campaigns).flatMap((c) => c.missionIds.map((id) => catalog.missions[id]!));
    expect(campaignMissions).toHaveLength(45);
    const awaited = campaignMissions.filter((m) => awaitingCampaign(m.campaignId));
    expect(awaited).toHaveLength(7 * AWAITING_BRIEF_18.campaigns.length);
    for (const m of awaited) {
      expect(m.thumbnailAssetId).toBe(`mission.${m.campaignId}.m0${m.order}.thumbnail`);
      expect(briefingArt(m.thumbnailAssetId), `${m.id}: delivered — empty AWAITING_BRIEF_18`).toBeFalsy();
    }
    for (const m of campaignMissions.filter((x) => !awaitingCampaign(x.campaignId))) {
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
