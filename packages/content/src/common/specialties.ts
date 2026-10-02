/**
 * Hero specialties — PROPOSED 2026-10-02 (owner request: "None of the 62 heroes
 * has one. Giving each a special unit, spell or resource makes hiring a real
 * choice — list them in the tavern").
 *
 * Three kinds, all plain effects from the shared vocabulary (no rule names a hero):
 *   creature — the family (both forms) gets +1 Attack and +1 Defense in this
 *              hero's battles, one more of each at hero levels 4 and 8;
 *   spell    — the hero knows the spell from the start and casts it with +1 Spell
 *              Power, one more at hero levels 3, 6 and 9 (only damage and healing
 *              spells, whose effect grows with Power; only spellbook classes);
 *   resource — a flat daily income while the hero is active (Gold +250, Wood or
 *              Stone +2, Crystal or Favor +1).
 * Specialties apply only in scenarios with the `heroSpecialties` feature: every
 * skirmish, random map, The Winter Oath and the four arc campaigns. The Three
 * Beacons keeps its documented rules. All values are proposals (unplaytested).
 */
import type { CreatureDefinition, CreatureFamilyDefinition, EffectDefinition, HeroDefinition, HeroSpecialtyDefinition, ResourceKey, SpellDefinition } from '@pr/rules';

export type SpecialtySpec =
  | { readonly kind: 'creature'; readonly familyId: string }
  | { readonly kind: 'spell'; readonly spellId: string }
  | { readonly kind: 'resource'; readonly resource: ResourceKey; readonly amount: number };

const c = (familyId: string): SpecialtySpec => ({ kind: 'creature', familyId });
const s = (spellId: string): SpecialtySpec => ({ kind: 'spell', spellId });
const r = (resource: ResourceKey, amount: number): SpecialtySpec => ({ kind: 'resource', resource, amount });

/** Every hero's specialty, by hero definition ID. */
export const HERO_SPECIALTY_SPECS: Readonly<Record<string, SpecialtySpec>> = {
  // --- Greek ---
  alexios: c('hoplite'),
  melas: c('peltast'),
  scout_captain: c('griffin'),
  heracles: c('minotaur'),
  achilles: c('cavalry'),
  odysseus: r('gold', 250),
  atalanta: r('wood', 2),
  perseus: s('lightning'),
  // --- Norse ---
  norse_sigurd: c('norse_lindworm'),
  norse_brynhild: c('norse_valkyrie'),
  norse_ragnar: r('gold', 250),
  norse_lagertha: c('norse_frost_wolf'),
  norse_hervor: s('spark'),
  norse_grey_jarl: c('norse_draugr'),
  norse_ulfhild: c('norse_frost_troll'),
  norse_hrafn: c('norse_jotunn'),
  norse_bone_helm: c('norse_nidhogg_wyrm'),
  norse_barrow_captain: c('norse_draugr'),
  // --- Egyptian ---
  egyptian_imhotep: r('stone', 2),
  egyptian_hatshepsut: r('gold', 250),
  egyptian_ramses: c('egyptian_sphinx'),
  egyptian_cleopatra: r('crystal', 1),
  egyptian_nefertiti: s('ankh_of_renewal'),
  egyptian_seshet: s('wrath_of_sekhmet'),
  egyptian_djedkhonsu: s('scarab_swarm'),
  egyptian_paser: c('egyptian_ushabti'),
  egyptian_ankhwen: c('egyptian_crocodile_beast'),
  egyptian_hekaib: c('egyptian_jackal_guardian'),
  egyptian_iti: c('egyptian_bennu'),
  // --- Japanese ---
  japanese_momotaro: c('japanese_kitsune'),
  japanese_yamato_takeru: r('gold', 250),
  japanese_tomoe_gozen: c('japanese_kirin'),
  japanese_benkei: c('japanese_oni'),
  japanese_yoshitsune: c('japanese_tengu'),
  japanese_akane: s('kitsune_fire'),
  japanese_yamikage: s('raijin_drums'),
  japanese_kurogane: c('japanese_jorogumo'),
  japanese_gonryo: c('japanese_kappa'),
  japanese_oboro: c('japanese_orochi'),
  japanese_kagero: c('japanese_tengu'),
  // --- Celtic ---
  celtic_cu_chulainn: c('celtic_cu_sith'),
  celtic_fionn_mac_cumhaill: c('celtic_horned_stag_spirit'),
  celtic_scathach: c('celtic_kelpie'),
  celtic_deirdre: s('cauldron_of_dagda'),
  celtic_boudicca: r('favor', 1),
  celtic_orla: s('wild_hunt'),
  celtic_dubhghall: c('celtic_banshee'),
  celtic_fiachra: c('celtic_fomorian_giant'),
  celtic_corc: c('celtic_selkie'),
  celtic_tadhg: c('celtic_pooka'),
  celtic_ciar: c('celtic_banshee'),
  // --- Mesoamerican ---
  mesoamerican_hunahpu: c('mesoamerican_camazotz'),
  mesoamerican_xbalanque: c('mesoamerican_jaguar_spirit'),
  mesoamerican_nezahualcoyotl: r('gold', 250),
  mesoamerican_topiltzin_quetzalcoatl: s('rain_of_tlaloc'),
  mesoamerican_eight_deer_jaguar_claw: c('mesoamerican_eagle_warrior_spirit'),
  mesoamerican_itzel: s('obsidian_rain'),
  mesoamerican_itztli: s('ember_burst'),
  mesoamerican_tecuani: c('mesoamerican_xiuhcoatl'),
  mesoamerican_acatl: c('mesoamerican_cenote_crocodile'),
  mesoamerican_mazatl: c('mesoamerican_stone_colossus'),
  mesoamerican_tlacatl: c('mesoamerican_feathered_serpent'),
};

/** Creature specialties: +1/+1, one more of each every `CREATURE_STEP` levels (levels 4 and 8). */
export const CREATURE_STEP = 4;
/** Spell specialties: +1 Power, one more every `SPELL_STEP` levels (levels 3, 6 and 9). */
export const SPELL_STEP = 3;

const RESOURCE_LABEL: Record<ResourceKey, string> = { gold: 'Gold', wood: 'Wood', stone: 'Stone', crystal: 'Crystal', favor: 'Favor' };

export interface SpecialtyLookups {
  readonly families: Readonly<Record<string, CreatureFamilyDefinition>>;
  readonly creatures: Readonly<Record<string, CreatureDefinition>>;
  readonly spells: Readonly<Record<string, SpellDefinition>>;
}

/** Build the specialty definition (names and exact rule text come from the catalog content). */
export function buildSpecialty(spec: SpecialtySpec, lk: SpecialtyLookups): HeroSpecialtyDefinition {
  switch (spec.kind) {
    case 'creature': {
      const fam = lk.families[spec.familyId];
      if (!fam) throw new Error(`specialty: unknown family ${spec.familyId}`);
      const base = lk.creatures[fam.baseCreatureId];
      const up = lk.creatures[fam.upgradedCreatureId];
      const plural = base?.pluralName ?? fam.name;
      const both = up ? `${plural} and ${up.pluralName}` : plural;
      const fx: EffectDefinition[] = [
        { type: 'creature_stat', stat: 'attack', amount: 1, familyId: fam.id },
        { type: 'creature_stat', stat: 'defense', amount: 1, familyId: fam.id },
      ];
      return {
        kind: 'creature',
        name: plural,
        summary: `${both} in this hero’s army: +1 Attack and +1 Defense in battle, one more of each at hero levels ${CREATURE_STEP} and ${CREATURE_STEP * 2}.`,
        effects: fx,
        growth: { everyLevels: CREATURE_STEP, effects: fx },
        familyId: fam.id,
      };
    }
    case 'spell': {
      const sp = lk.spells[spec.spellId];
      if (!sp) throw new Error(`specialty: unknown spell ${spec.spellId}`);
      const fx: EffectDefinition[] = [{ type: 'spell_power_bonus', spellId: sp.id, amount: 1 }];
      return {
        kind: 'spell',
        name: sp.name,
        summary: `Knows ${sp.name} from the start and casts it with +1 Spell Power, one more at hero levels ${SPELL_STEP}, ${SPELL_STEP * 2} and ${SPELL_STEP * 3}.`,
        effects: fx,
        growth: { everyLevels: SPELL_STEP, effects: fx },
        spellId: sp.id,
      };
    }
    case 'resource':
      return {
        kind: 'resource',
        name: RESOURCE_LABEL[spec.resource],
        summary: `+${spec.amount.toLocaleString('en-US')} ${RESOURCE_LABEL[spec.resource]} per day while this hero is in play.`,
        effects: [{ type: 'daily_income', resource: spec.resource, amount: spec.amount }],
      };
  }
}

/** Attach every hero's specialty (a hero without an entry keeps none). */
export function withSpecialties(heroes: readonly HeroDefinition[], lk: SpecialtyLookups): HeroDefinition[] {
  return heroes.map((h) => {
    const spec = HERO_SPECIALTY_SPECS[h.id];
    return spec ? { ...h, specialty: buildSpecialty(spec, lk) } : h;
  });
}
