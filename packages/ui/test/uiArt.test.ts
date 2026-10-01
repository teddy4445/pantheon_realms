/**
 * Interface art (ASSET_PIPELINE.md §11): every asset ID the UI names exists in
 * the generated manifest, every listed file is bundled and readable, and the
 * desktop icon carries the sizes Windows needs. Files only — no rendering.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
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
