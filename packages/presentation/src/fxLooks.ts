import { EXPANSION_LOOKS } from './expansionLooks';
/**
 * How magic and Favor look (presentation data; no PixiJS import, part of
 * `@pr/presentation/core`). Every spell, divine intervention and divine gift
 * gets a look: a colour school, how it travels, what it does where it lands,
 * whether the whole field changes for a moment, and which sound family goes
 * with it. The looks follow the VFX list (`npm run vfx:list`); the code-drawn effects in
 * `fx.ts` draw them until effect strips are delivered under the same asset IDs
 * (`fx.spell.<id>.<phase>`, `fx.miracle.<id>.<phase>`, `fx.status.<name>`).
 *
 * New content gets a look from its effect type automatically; the tables only
 * refine named spells. Nothing here affects rules.
 */

/** Colour schools: [core, glow, spark] as 0xRRGGBB. */
export const FX_PALETTE = {
  strike: [0xffffff, 0x7fb2ff, 0xcfe6ff],
  storm: [0xffffff, 0x9cc4ff, 0xe8f0ff],
  star: [0xffffff, 0x9fb8ff, 0xfff4c0],
  fire: [0xfff1a8, 0xff7a2a, 0xffc04a],
  rage: [0xffe0c0, 0xe0402a, 0xff8a5a],
  sun: [0xfff4c0, 0xff9a2a, 0xffd27a],
  amber: [0xfff0c8, 0xe0a030, 0xffd890],
  hearth: [0xfff0c8, 0xffb050, 0xffd890],
  heal: [0xf4ffe0, 0x7fdc6a, 0xd8ffb0],
  bless: [0xfff6d0, 0xf3c86b, 0xffe9a0],
  spirit: [0xe8ffff, 0x6fd8e8, 0xb8f4ff],
  silver: [0xffffff, 0xb8c8e0, 0xe0e8f8],
  water: [0xe0fbff, 0x2aa3a8, 0x9fe8ef],
  frost: [0xf0fbff, 0x8fd8ff, 0xc8f0ff],
  wind: [0xffffff, 0xcfe8ff, 0xffffff],
  nature: [0xe0ffd0, 0x5aa845, 0x9fd86a],
  blossom: [0xfff0f4, 0xff9ac0, 0xffd0e0],
  fae: [0xfff0ff, 0xd08aff, 0xffd0ff],
  foxfire: [0xf0ffff, 0x5ab8ff, 0xc8e8ff],
  curse: [0xd9c4ff, 0x7a4ab8, 0x3a2a4a],
  shadow: [0xc0a8d8, 0x40285a, 0x8060a0],
  blight: [0xe8ffc8, 0x6a8a2a, 0x3a4a1a],
  obsidian: [0xffd0c0, 0x30202a, 0xff6040],
  swarm: [0xffe08a, 0x8a6a20, 0x3a2a10],
  earth: [0xe8d8c0, 0x8a6a4a, 0x5a4a3a],
  fate: [0xfff4d8, 0xb8a070, 0x6a5a40],
  sound: [0xfff4d0, 0xd8b56c, 0xf5e4b7],
  jade: [0xe0fff0, 0x2a9a6a, 0xffd27a],
} as const;

export type FxSchool = keyof typeof FX_PALETTE;
/** How a spell reaches its target: from the caster's corner, from the sky above it, or not at all. */
export type FxTravel = 'none' | 'bolt' | 'orb' | 'arrow' | 'swarm' | 'wisp' | 'sky';
/** What happens where it lands (on each affected stack, hero or town). */
export type FxImpact =
  | 'sparks' | 'flame' | 'heal' | 'glyph' | 'curse' | 'ring' | 'wind' | 'frost' | 'thorns' | 'shock'
  | 'shards' | 'pillar' | 'petals' | 'runes' | 'mist' | 'shield' | 'dome' | 'chevrons' | 'drain' | 'stars'
  | 'reveal' | 'coins' | 'motes';
/** A moment over the whole field (army spells and miracles). */
export type FxScreen = 'none' | 'night' | 'storm' | 'glow' | 'wind' | 'mist' | 'rain' | 'sun' | 'dusk';
/** Sound families (`magic.<sound>` in the sound manifest). */
export const FX_SOUNDS = ['strike', 'thunder', 'fire', 'heal', 'bless', 'curse', 'wind', 'frost', 'nature', 'swarm', 'water', 'shadow', 'holy', 'smite', 'reveal', 'teleport', 'coins', 'horn'] as const;
export type FxSound = (typeof FX_SOUNDS)[number];

export interface FxLook {
  readonly magicArt?: string;
  readonly school: FxSchool;
  readonly travel: FxTravel;
  readonly impact: FxImpact;
  readonly screen: FxScreen;
  /** One target, the target and the stacks beside it, or a whole army / every hero. */
  readonly scope: 'single' | 'area' | 'army';
  readonly sound: FxSound;
}

/** The shared looping overlays a status leaves on a battle stack (`fx.status.<name>`). */
export const STATUS_OVERLAYS = ['attack_up', 'attack_down', 'defense_up', 'defense_down', 'speed_up', 'speed_down', 'blessed', 'cursed', 'melee_ward', 'ranged_ward'] as const;
export type StatusOverlay = (typeof STATUS_OVERLAYS)[number];

type EffectLike = { readonly type: string; readonly amount?: number; readonly stat?: string };

/** The overlay for one battle status (`BattleStatusState.kind` and amount). */
export function statusOverlayOf(kind: string, amount: number): StatusOverlay | null {
  const down = amount < 0;
  switch (kind) {
    case 'attack_bonus':
      return down ? 'attack_down' : 'attack_up';
    case 'defense_bonus':
      return down ? 'defense_down' : 'defense_up';
    case 'speed_bonus':
      return down ? 'speed_down' : 'speed_up';
    case 'max_damage_roll':
      return 'blessed';
    case 'min_damage_roll':
      return 'cursed';
    case 'melee_mitigation':
      return 'melee_ward';
    case 'ranged_mitigation':
      return 'ranged_ward';
    default:
      return null;
  }
}

/** The overlays for a stack's statuses, each once, in a fixed order. */
export function statusOverlays(statuses: readonly { readonly kind: string; readonly amount: number }[]): StatusOverlay[] {
  const set = new Set<StatusOverlay>();
  for (const s of statuses) {
    const o = statusOverlayOf(s.kind, s.amount);
    if (o) set.add(o);
  }
  return STATUS_OVERLAYS.filter((o) => set.has(o));
}

const L = (school: FxSchool, travel: FxTravel, impact: FxImpact, scope: FxLook['scope'], sound: FxSound, screen: FxScreen = 'none'): FxLook => ({ school, travel, impact, screen, scope, sound });

/** The look of any spell from its effect type and target (refined by SPELL_LOOKS). */
export function defaultSpellLook(effect: EffectLike, target: string): FxLook {
  const army = target === 'friendly_army' || target === 'enemy_army';
  const scope: FxLook['scope'] = army ? 'army' : 'single';
  const down = (effect.amount ?? 0) < 0;
  switch (effect.type) {
    case 'direct_damage':
      return L('strike', 'bolt', 'sparks', 'single', 'strike');
    case 'area_damage':
      return L('fire', 'orb', 'flame', 'area', 'fire');
    case 'mass_damage':
      return L('star', 'none', 'stars', 'army', 'thunder', 'night');
    case 'heal_front':
      return L('heal', 'none', 'heal', 'single', 'heal');
    case 'mass_heal':
      return L('heal', 'none', 'heal', 'army', 'heal', 'glow');
    case 'max_damage_roll':
      return L('bless', 'none', 'glyph', scope, 'bless');
    case 'min_damage_roll':
      return L('curse', 'none', 'curse', scope, 'curse');
    case 'attack_bonus':
      return down ? L('curse', 'none', 'drain', scope, 'curse') : L('sun', 'none', 'chevrons', scope, 'bless');
    case 'defense_bonus':
      return down ? L('curse', 'none', 'drain', scope, 'curse') : L('silver', 'none', 'ring', scope, 'bless');
    case 'speed_bonus':
      return down ? L('shadow', 'none', 'mist', scope, 'curse') : L('wind', 'none', 'wind', scope, 'wind');
    case 'melee_mitigation':
      return L('bless', 'none', 'shield', scope, 'bless');
    case 'ranged_mitigation':
      return L('spirit', 'none', 'dome', scope, 'bless');
    case 'mass_bonus': {
      const friendly = target !== 'enemy_army';
      const impact: FxImpact = effect.stat === 'speed' ? (down ? 'mist' : 'wind') : effect.stat === 'defense' ? (down ? 'drain' : 'ring') : down ? 'drain' : 'chevrons';
      return L(friendly ? 'bless' : 'curse', 'none', impact, 'army', friendly ? 'holy' : 'curse', friendly ? 'glow' : 'dusk');
    }
    case 'reveal_radius':
      return L('spirit', 'none', 'reveal', 'single', 'reveal');
    case 'movement_bonus':
      return L('wind', 'none', 'wind', 'single', 'wind');
    case 'recall':
      return L('hearth', 'none', 'pillar', 'single', 'teleport');
    default:
      return L('bless', 'none', 'glyph', scope, 'bless');
  }
}

/** Named spells: the look from the VFX list (only what differs from the default). */
export const SPELL_LOOKS: Readonly<Record<string, Partial<FxLook>>> = {
  // Shared
  spark: { school: 'strike', travel: 'bolt', impact: 'sparks' },
  blessing: { school: 'bless', impact: 'glyph' },
  ward: { school: 'silver', impact: 'ring' },
  warcry: { school: 'rage', impact: 'chevrons', sound: 'horn' },
  swiftness: { school: 'wind', impact: 'wind' },
  ill_omen: { school: 'curse', impact: 'curse' },
  shield_of_faith: { school: 'bless', impact: 'shield' },
  hearthlight: { school: 'hearth', impact: 'heal' },
  lightning: { school: 'storm', travel: 'sky', impact: 'shock', sound: 'thunder' },
  mend: { school: 'heal', impact: 'heal' },
  veil: { school: 'spirit', impact: 'dome' },
  weariness: { school: 'shadow', impact: 'mist' },
  ember_burst: { school: 'fire', travel: 'orb', impact: 'flame' },
  sapping_touch: { school: 'blight', impact: 'drain' },
  steadfast: { school: 'earth', impact: 'runes' },
  starfall: { school: 'star', impact: 'stars', screen: 'night', sound: 'thunder' },
  rallying_hymn: { school: 'bless', impact: 'ring', screen: 'glow', sound: 'holy' },
  leaden_air: { school: 'earth', impact: 'mist', screen: 'dusk', sound: 'curse' },
  renewal: { school: 'nature', impact: 'petals', screen: 'glow', sound: 'heal' },
  // Celtic
  bramble_snare: { school: 'nature', impact: 'thorns', sound: 'nature' },
  glamour: { school: 'fae', impact: 'stars', sound: 'curse' },
  cauldron_of_dagda: { school: 'hearth', impact: 'heal' },
  wild_hunt: { school: 'spirit', travel: 'swarm', impact: 'shock', sound: 'horn' },
  mist_of_manannan: { school: 'water', impact: 'mist', screen: 'mist', sound: 'water' },
  // Egyptian
  ankh_of_renewal: { school: 'water', impact: 'heal' },
  wrath_of_sekhmet: { school: 'rage', travel: 'orb', impact: 'flame', sound: 'fire' },
  scarab_swarm: { school: 'swarm', travel: 'swarm', impact: 'shards', sound: 'swarm' },
  balance_of_maat: { school: 'bless', impact: 'heal', screen: 'glow', sound: 'holy' },
  // Greek
  hoplon_wall: { school: 'bless', impact: 'shield' },
  apollos_arrow: { school: 'sun', travel: 'arrow', impact: 'shock', sound: 'strike' },
  aegis: { school: 'silver', impact: 'dome', screen: 'glow', sound: 'holy' },
  thunderclap: { school: 'storm', travel: 'sky', impact: 'shock', sound: 'thunder' },
  // Japanese
  kitsune_fire: { school: 'foxfire', travel: 'wisp', impact: 'flame', sound: 'fire' },
  blossom_veil: { school: 'blossom', impact: 'petals' },
  yata_mirror: { school: 'sun', impact: 'shield' },
  divine_wind: { school: 'wind', impact: 'wind', screen: 'wind', sound: 'wind' },
  raijin_drums: { school: 'storm', travel: 'sky', impact: 'shock', screen: 'storm', sound: 'thunder' },
  // Mesoamerican
  jaguar_spirit: { school: 'amber', impact: 'chevrons' },
  smoking_mirror: { school: 'shadow', impact: 'drain', sound: 'shadow' },
  rain_of_tlaloc: { school: 'water', impact: 'heal', screen: 'rain', sound: 'water' },
  obsidian_rain: { school: 'obsidian', travel: 'sky', impact: 'shards', sound: 'shadow' },
  fifth_sun: { school: 'sun', impact: 'chevrons', screen: 'sun', sound: 'holy' },
  // Norse
  rune_of_tyr: { school: 'frost', impact: 'runes' },
  frost_breath: { school: 'frost', impact: 'frost', sound: 'frost' },
  norns_thread: { school: 'fate', impact: 'curse' },
  berserkergang: { school: 'rage', impact: 'chevrons', screen: 'dusk', sound: 'horn' },
  gjallarhorn: { school: 'sound', impact: 'shock', screen: 'dusk', sound: 'horn' },
  // Adventure (map)
  far_sight: { school: 'spirit', impact: 'reveal' },
  clear_skies: { school: 'sun', impact: 'reveal' },
  divine_sight: { school: 'bless', impact: 'reveal' },
  eye_of_horus: { school: 'water', impact: 'reveal' },
  fleet_foot: { school: 'wind', impact: 'wind' },
  wings_of_hermes: { school: 'bless', impact: 'wind' },
  homecoming: { school: 'hearth', impact: 'pillar' },
};

export function spellLook(spell: { readonly id: string; readonly effect: EffectLike; readonly target: string }): FxLook {
  return { ...defaultSpellLook(spell.effect, spell.target), ...(SPELL_LOOKS[spell.id] ?? {}), ...(EXPANSION_LOOKS[spell.id] ?? {}) };
}

/** The look of any divine intervention from its effect type (refined by MIRACLE_LOOKS). */
export function defaultMiracleLook(effect: EffectLike, target: string): FxLook {
  switch (effect.type) {
    case 'battle_status': {
      const impact: FxImpact = effect.stat === 'speed' ? 'wind' : effect.stat === 'defense' ? 'dome' : 'chevrons';
      return L('bless', 'none', impact, 'army', 'holy', 'glow');
    }
    case 'battle_heal':
      return L('heal', 'none', 'pillar', 'army', 'holy', 'glow');
    case 'battle_smite':
      return L('rage', 'sky', 'pillar', 'single', 'smite', 'night');
    case 'restore_movement':
      return L('wind', 'none', 'wind', 'army', 'wind');
    case 'restore_mana':
      return L('spirit', 'none', 'motes', 'army', 'holy');
    case 'town_growth':
      return L('sun', 'none', 'motes', 'single', 'holy');
    case 'grant_resources':
      return L('bless', 'none', 'coins', 'single', 'coins');
    default:
      return L('bless', 'none', 'glyph', target === 'enemy_stack' ? 'single' : 'army', 'holy', 'glow');
  }
}

export const MIRACLE_LOOKS: Readonly<Record<string, Partial<FxLook>>> = {
  rally_the_faithful: { school: 'rage', impact: 'chevrons', screen: 'glow' },
  shield_of_the_gods: { school: 'silver', impact: 'dome', screen: 'glow' },
  mending_light: { school: 'bless', impact: 'pillar', screen: 'glow' },
  wrath_from_above: { school: 'fire', travel: 'sky', impact: 'pillar', screen: 'night' },
  thunderbolt_of_zeus: { school: 'storm', travel: 'sky', impact: 'shock', screen: 'storm', sound: 'thunder' },
  ride_of_the_valkyries: { school: 'spirit', impact: 'wind', screen: 'wind', sound: 'horn' },
  ward_of_the_kami: { school: 'spirit', impact: 'ring', screen: 'glow' },
  favorable_winds: { school: 'wind', impact: 'wind' },
  bountiful_harvest: { school: 'sun', impact: 'motes' },
  tithe_of_the_faithful: { school: 'bless', impact: 'coins' },
  inspiration: { school: 'spirit', impact: 'motes' },
  blessing_of_the_nile: { school: 'water', impact: 'ring', sound: 'water' },
  mists_of_the_sidhe: { school: 'fae', impact: 'mist', sound: 'wind' },
  gift_of_the_feathered_serpent: { school: 'jade', impact: 'coins' },
};

export function miracleLook(def: { readonly id: string; readonly effect: EffectLike; readonly target: string }): FxLook {
  return { ...defaultMiracleLook(def.effect, def.target), ...(MIRACLE_LOOKS[def.id] ?? {}), ...(EXPANSION_LOOKS[def.id] ?? {}) };
}

/** Divine gifts and the Temple offering: what rises from the Temple on the town screen. */
export type TownFxKind = 'coins' | 'timber' | 'crystal' | 'anoint' | 'brood' | 'relic' | 'offering';

export function giftFxKind(grant: { readonly type: string; readonly resources?: Readonly<Record<string, number | undefined>> }): TownFxKind {
  if (grant.type === 'experience') return 'anoint';
  if (grant.type === 'recruits') return 'brood';
  if (grant.type === 'artifact') return 'relic';
  const r = grant.resources ?? {};
  if ((r['crystal'] ?? 0) > 0 && !(r['gold'] ?? 0)) return 'crystal';
  if ((r['wood'] ?? 0) > 0 || (r['stone'] ?? 0) > 0) return 'timber';
  return 'coins';
}

/** `#rrggbb` for a palette colour (interface effects). */
export function fxCss(school: FxSchool, i: 0 | 1 | 2 = 1): string {
  return `#${FX_PALETTE[school][i].toString(16).padStart(6, '0')}`;
}
