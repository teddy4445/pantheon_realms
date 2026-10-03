/**
 * Interface art (ASSET_PIPELINE.md §11): every asset ID the UI names exists in
 * the generated manifest, every listed file is bundled and readable, and the
 * desktop icon carries the sizes Windows needs. Files only — no rendering.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
const manifest = JSON.parse(readFileSync(path.join(runtime, 'ui/manifest.json'), 'utf8')) as {
  schema: string;
  backgrounds: string[];
  assets: Record<string, { file: string; status: string; provenance: string; interior?: Record<string, number> }>;
};
const src = (rel: string) => readFileSync(path.join(root, 'packages/ui/src', rel), 'utf8');
const idsIn = (text: string) => [...text.matchAll(/'(icon\.[a-z0-9.-]+|brand\.[a-z.-]+|menu\.frame)'/g)].map((m) => m[1]!);

describe('UI art manifest', () => {
  it('lists bundled, readable files with provenance', () => {
    expect(manifest.schema).toBe('pantheon-realms-ui-art');
    for (const [id, a] of Object.entries(manifest.assets)) {
      const file = path.join(runtime, a.file);
      expect(existsSync(file), `${id} → ${a.file}`).toBe(true);
      const head = readFileSync(file).subarray(0, 12);
      const isPng = head.subarray(1, 4).toString('latin1') === 'PNG';
      const isWebp = head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP';
      expect(isPng || isWebp, `${a.file} is PNG or WebP`).toBe(true);
      expect(a.provenance.length).toBeGreaterThan(20);
    }
  });

  it('offers opening backgrounds and a measured menu frame window', () => {
    expect(manifest.backgrounds.length).toBeGreaterThanOrEqual(1);
    for (const id of manifest.backgrounds) expect(manifest.assets[id], id).toBeDefined();
    const w = manifest.assets['menu.frame']!.interior!;
    for (const k of ['left', 'right', 'top', 'bottom']) expect(w[k]).toBeGreaterThan(0.05);
    expect(w.left! + w.right!).toBeLessThan(0.8);
    expect(w.top! + w.bottom!).toBeLessThan(0.8);
  });

  it('resolves every asset ID the interface names', () => {
    const named = new Set([...idsIn(src('assets/icons.tsx')), ...idsIn(src('components/art.tsx')), ...idsIn(src('screens/Journal.tsx')), ...idsIn(src('screens/MainMenu.tsx'))]);
    expect(named.size).toBeGreaterThan(40);
    // Markers still to be delivered (ICON_CATALOG.md) name their stand-in: `ownMarker('<wanted>', '<existing>')`.
    const pending = [...src('components/art.tsx').matchAll(/ownMarker\('([^']+)', '([^']+)'\)/g)];
    expect(pending.length).toBeGreaterThanOrEqual(8);
    for (const [, wanted, fallback] of pending) {
      named.delete(wanted!);
      expect(manifest.assets[fallback!], `${wanted} falls back to ${fallback}`).toBeDefined();
    }
    for (const id of named) expect(manifest.assets[id], id).toBeDefined();
  });

  it('ships the app icon at every Windows size and a favicon', () => {
    const ico = readFileSync(path.join(root, 'apps/desktop/build-resources/icon.ico'));
    expect(ico.readUInt16LE(2)).toBe(1); // icon type
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico[6 + i * 16] || 256);
    expect(sizes).toEqual(expect.arrayContaining([16, 24, 32, 48, 256]));
    expect(existsSync(path.join(runtime, 'favicon.png'))).toBe(true);
  });
});

/**
 * Final art delivered by asset ID (ICON_CATALOG.md, `npm run icons:import`): every
 * source PNG in assets-source/icons/final/ is registered, every registration points
 * at a bundled file of its section's size — an RGBA PNG for icons with transparency,
 * a WebP for opaque paintings (creature portraits) — and every ID is a catalog asset ID.
 */
describe('final art manifest', () => {
  const finalManifest = JSON.parse(readFileSync(path.join(runtime, 'ui/final-manifest.json'), 'utf8')) as {
    assets: Record<string, { file: string; provenance: string }>;
  };
  const inventory = JSON.parse(readFileSync(path.join(root, 'assets-source/icons/icon-inventory.json'), 'utf8')) as {
    sections: { id: string; size: string; rows: { assetId: string }[] }[];
  };
  const sizeOf = new Map<string, number>();
  for (const s of inventory.sections) {
    // As the importer reads it: a size at the start of the section's text, else 256 px
    // (the illustrations section says "emblems 256 px; thumbnails 640 × 360 px").
    const m = /^\s*(\d+)\s*[×x]\s*(\d+)/.exec(s.size);
    for (const r of s.rows) sizeOf.set(r.assetId, m ? Number(m[1]) : 256);
  }
  const sourceDir = path.join(root, 'assets-source/icons/final');
  const sources = existsSync(sourceDir) ? readdirSync(sourceDir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)) : [];

  it('registers every delivered source file and nothing else', () => {
    expect(Object.keys(finalManifest.assets).sort()).toEqual([...sources].sort());
  });

  it('points every registration at a bundled RGBA PNG or opaque WebP of its catalog size', () => {
    for (const [id, a] of Object.entries(finalManifest.assets)) {
      expect(sizeOf.has(id), `${id} is a catalog asset ID`).toBe(true);
      const file = path.join(runtime, a.file);
      expect(existsSync(file), `${id} → ${a.file}`).toBe(true);
      const data = readFileSync(file);
      let w: number;
      let h: number;
      if (a.file.endsWith('.webp')) {
        expect(data.subarray(0, 4).toString('latin1') + data.subarray(8, 12).toString('latin1'), `${a.file} is a WebP`).toBe('RIFFWEBP');
        const chunk = data.subarray(12, 16).toString('latin1');
        if (chunk === 'VP8X') {
          w = 1 + data.readUIntLE(24, 3);
          h = 1 + data.readUIntLE(27, 3);
        } else {
          expect(chunk, `${a.file} is a lossy WebP`).toBe('VP8 ');
          w = data.readUInt16LE(26) & 0x3fff;
          h = data.readUInt16LE(28) & 0x3fff;
        }
        // Only paintings with their own backgrounds are written as WebP.
        expect(id, `${a.file}: WebP is for painted portraits`).toMatch(/\.portrait$/);
      } else {
        expect(data.subarray(1, 4).toString('latin1'), `${a.file} is a PNG`).toBe('PNG');
        [w, h] = [data.readUInt32BE(16), data.readUInt32BE(20)];
        expect(data[25], `${a.file} keeps its alpha channel`).toBe(6);
      }
      expect(Math.max(w, h), `${a.file} size`).toBe(sizeOf.get(id));
      expect(a.provenance).toMatch(/assets-source\/icons\/final\//);
    }
  });
});
