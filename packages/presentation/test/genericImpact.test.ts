/**
 * The shared battle effect strips (sprite manifest `effects`, delivered as final
 * art in the owner's commit 071968c) stand for a spell's or miracle's impact
 * when its look matches; other impacts stay code-drawn (fx.ts, genericImpactOf).
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@pr/content';
import { genericImpactOf } from '../src/fx';
import { miracleLook, spellLook } from '../src/fxLooks';

const catalog = buildCatalog();
const SHARED = new Set(['spell.damage', 'spell.area', 'spell.heal', 'spell.buff', 'spell.curse', 'ward']);

describe('shared impact strips', () => {
  it('lightning strikes, healing, blessings and curses use the shared strips; other looks stay code-drawn', () => {
    const look = (id: string) => spellLook(catalog.spells[id]!);
    expect(genericImpactOf(look('lightning'))).toBe('spell.damage');
    expect(genericImpactOf(look('blessing'))).toBe('spell.buff');
    const all = Object.values(catalog.spells).map((s) => genericImpactOf(spellLook(s)));
    for (const g of all) if (g) expect(SHARED.has(g), g).toBe(true);
    expect(all.some((g) => g === null), 'some impacts stay code-drawn').toBe(true);
    expect(all.filter(Boolean).length).toBeGreaterThan(0);
  });
  it('miracles follow the same rule', () => {
    for (const m of Object.values(catalog.interventions)) {
      const g = genericImpactOf(miracleLook(m));
      if (g) expect(SHARED.has(g), m.id).toBe(true);
    }
  });
});
