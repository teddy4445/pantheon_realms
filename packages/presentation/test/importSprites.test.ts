/**
 * Regression (delivery of 2026-10-04): `tools/assets/sprites/import_sprites.py`
 * keeps the full `fx.*` asset IDs of the magic and Favor phases (the nine
 * shared battle effects keep their short IDs) and takes each effect's loop
 * from its sidecar, leaving unrelated manifest entries alone. Runs the
 * importer's own self-test on synthetic strips in a temporary folder; skipped
 * where Python with Pillow and NumPy is not installed (the importer needs them).
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const script = path.join(root, 'tools/assets/sprites/import_sprites.py');
const python = ['python3', 'python'].find((p) => spawnSync(p, ['-c', 'import numpy, PIL'], { encoding: 'utf8' }).status === 0);

describe('sprite importer', () => {
  it.skipIf(!python)('keeps full fx.* IDs and sidecar loops (self-test)', () => {
    const r = spawnSync(python!, [script, '--self-test'], { encoding: 'utf8', timeout: 60_000 });
    expect(r.stderr).not.toMatch(/SELF-TEST FAIL/);
    expect(r.stdout).toMatch(/self-test passed/);
    expect(r.status).toBe(0);
  });

  it('the game manifest registers every delivered phase under its full ID, with loops only where the brief plays one', () => {
    const m = JSON.parse(readFileSync(path.join(root, 'assets-runtime/sprites/manifest.json'), 'utf8')) as { effects: Record<string, { loop: boolean; frames: number }> };
    const ids = Object.keys(m.effects);
    // The nine shared battle effects are still there under their short IDs.
    for (const id of ['impact', 'ward', 'morale.up', 'morale.down', 'spell.damage', 'spell.area', 'spell.heal', 'spell.buff', 'spell.curse']) expect(ids, id).toContain(id);
    // No phase lost its prefix (e.g. "spell.lightning.cast" instead of "fx.spell.lightning.cast").
    expect(ids.filter((id) => /^(spell|miracle)\.[a-z_]+\.[a-z]+$/.test(id) || /^(status|gift|offering)\./.test(id))).toEqual([]);
    for (const [id, e] of Object.entries(m.effects)) {
      if (!id.startsWith('fx.')) continue;
      const looping = id.startsWith('fx.status.') || id.endsWith('.travel') || id.endsWith('.aura');
      expect(e.loop, id).toBe(looping);
    }
  });
});
