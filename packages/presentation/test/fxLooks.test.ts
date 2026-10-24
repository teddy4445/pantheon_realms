/**
 * How magic and Favor look (fxLooks.ts): every spell, divine intervention and
 * divine gift in the catalog gets a complete look; statuses map to their
 * overlays (one each, in a fixed order); the named looks only use known
 * colour schools; and every sound family has a sound in the manifest.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import { FX_PALETTE, FX_SOUNDS, MIRACLE_LOOKS, SPELL_LOOKS, STATUS_OVERLAYS, fxCss, giftFxKind, miracleLook, spellLook, statusOverlayOf, statusOverlays } from '../src/fxLooks';

const catalog = buildCatalog();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('magic looks', () => {
  it('every spell has a complete look; army spells reach the whole army, area spells the stacks beside the target', () => {
    for (const sp of Object.values(catalog.spells)) {
      const look = spellLook(sp);
      expect(FX_PALETTE[look.school], sp.id).toBeDefined();
      expect(FX_SOUNDS as readonly string[]).toContain(look.sound);
      if (sp.target === 'friendly_army' || sp.target === 'enemy_army') expect(look.scope, sp.id).toBe('army');
      if (sp.effect.type === 'area_damage') expect(look.scope, sp.id).toBe('area');
      if (sp.effect.type === 'reveal_radius') expect(look.impact, sp.id).toBe('reveal');
      if (sp.effect.type === 'recall') expect(look.impact, sp.id).toBe('pillar');
    }
  });
  it('the named looks cover real content only and use known schools', () => {
    for (const [id, l] of Object.entries(SPELL_LOOKS)) {
      expect(catalog.spells[id], id).toBeDefined();
      if (l.school) expect(FX_PALETTE[l.school], id).toBeDefined();
    }
    for (const [id, l] of Object.entries(MIRACLE_LOOKS)) {
      expect(catalog.interventions?.[id], id).toBeDefined();
      if (l.school) expect(FX_PALETTE[l.school], id).toBeDefined();
    }
  });
  it('every divine intervention has a look; a smite has a sky strike or authored attack, blessings reach the army', () => {
    for (const def of Object.values(catalog.interventions ?? {})) {
      const look = miracleLook(def);
      expect(FX_PALETTE[look.school], def.id).toBeDefined();
      if (def.effect.type === 'battle_smite') {
        expect(look.scope, def.id).toBe('single');
        expect(look.travel === 'sky' || Boolean(look.magicArt), def.id).toBe(true);
      }
      if (def.effect.type === 'battle_status' || def.effect.type === 'battle_heal') expect(look.scope, def.id).toBe('army');
    }
  });
  it('divine gifts rise from the Temple as coins, timber, crystals or light', () => {
    const kinds = Object.fromEntries(Object.values(catalog.divineGifts ?? {}).map((g) => [g.id, giftFxKind(g.grant)]));
    expect(kinds['temple_treasury']).toBe('coins');
    expect(kinds['timber_and_stone']).toBe('timber');
    expect(kinds['tears_of_the_gods']).toBe('crystal');
    expect(kinds['anointing']).toBe('anoint');
    expect(kinds['blessed_brood']).toBe('brood');
    expect(kinds['temple_relic']).toBe('relic');
  });
  it('palette colours print as CSS colours', () => {
    expect(fxCss('fire', 1)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('status overlays', () => {
  it('each battle status has its own overlay; lowering a stat is a different shape from raising it', () => {
    expect(statusOverlayOf('attack_bonus', 2)).toBe('attack_up');
    expect(statusOverlayOf('attack_bonus', -3)).toBe('attack_down');
    expect(statusOverlayOf('defense_bonus', 5)).toBe('defense_up');
    expect(statusOverlayOf('speed_bonus', -2)).toBe('speed_down');
    expect(statusOverlayOf('max_damage_roll', 0)).toBe('blessed');
    expect(statusOverlayOf('min_damage_roll', 0)).toBe('cursed');
    expect(statusOverlayOf('melee_mitigation', 0)).toBe('melee_ward');
    expect(statusOverlayOf('ranged_mitigation', 0)).toBe('ranged_ward');
    expect(statusOverlayOf('something_new', 1)).toBeNull();
  });
  it('a stack shows each overlay once, in a fixed order', () => {
    const s = (kind: string, amount: number) => ({ kind, amount });
    expect(statusOverlays([s('speed_bonus', 2), s('attack_bonus', 2), s('attack_bonus', 4)])).toEqual(['attack_up', 'speed_up']);
    expect(STATUS_OVERLAYS.length).toBe(new Set(STATUS_OVERLAYS).size);
  });
});

describe('magic sounds', () => {
  it('every look family and the cast have a sound in the manifest', () => {
    const manifest = JSON.parse(readFileSync(path.join(root, 'assets-runtime/audio/manifest.json'), 'utf8')) as { sounds: { id: string }[] };
    const ids = new Set(manifest.sounds.map((x) => x.id));
    for (const s of ['cast', ...FX_SOUNDS]) expect(ids.has(`magic.${s}`), s).toBe(true);
  });
});
