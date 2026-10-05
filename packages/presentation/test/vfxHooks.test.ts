/**
 * Every magic and Favor strip in the sprite manifest (the delivery of
 * 2026-10-04, the VFX list of `npm run vfx:list`) has a moment in the game that plays it:
 * a strip whose phase the game never asks for would be art the player never
 * sees. The phases each view asks for follow the content's looks (fxLooks.ts)
 * and the hooks in battle.ts, adventure.ts and the town screen.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import { STATUS_OVERLAYS, miracleLook, spellLook } from '../src/fxLooks';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const catalog = buildCatalog();
const effects = (JSON.parse(readFileSync(path.join(root, 'assets-runtime/sprites/manifest.json'), 'utf8')) as { effects: Record<string, unknown> }).effects;

/** Asset IDs the game asks for (a strip under any of them plays when delivered). */
function requested(): Set<string> {
  const out = new Set<string>();
  for (const sp of Object.values(catalog.spells)) {
    const id = `fx.spell.${sp.id}`;
    const look = spellLook(sp);
    out.add(`${id}.cast`);
    if (sp.context === 'adventure') {
      if (sp.effect.type === 'reveal_radius') out.add(`${id}.area`);
      if (sp.effect.type === 'movement_bonus') out.add(`${id}.impact`).add(`${id}.aura`);
      if (sp.effect.type === 'recall') out.add(`${id}.depart`).add(`${id}.arrive`);
      out.add(`${id}.screen`);
      continue;
    }
    out.add(`${id}.impact`).add(`${id}.screen`);
    if (look.travel !== 'none' && (look.travel === 'sky' || look.scope !== 'army')) out.add(`${id}.travel`);
  }
  for (const m of Object.values(catalog.interventions ?? {})) {
    const id = `fx.miracle.${m.id}`;
    const look = miracleLook(m);
    // The whole-view phase is asked for always: a delivered strip plays even where the drawn look has none.
    out.add(`${id}.impact`).add(`${id}.screen`);
    if (look.travel === 'sky') out.add(`${id}.travel`);
  }
  for (const k of STATUS_OVERLAYS) out.add(`fx.status.${k}`);
  for (const g of Object.values(catalog.divineGifts ?? {})) out.add(`fx.gift.${g.id}`);
  out.add('fx.offering.rise').add('fx.offering.favor');
  // GodCommitFx in the Pantheon UI asks for this dedicated strip when delivered.
  out.add('fx.god.commit');
  return out;
}

describe('magic and Favor strips', () => {
  it('every delivered fx.* strip is one the game plays', () => {
    const asked = requested();
    const unused = Object.keys(effects).filter((id) => id.startsWith('fx.') && !asked.has(id));
    expect(unused).toEqual([]);
  });
});
