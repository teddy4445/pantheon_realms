/**
 * Authored attack expansion: 42 spells and 12 Favor-funded interventions.
 * These records define mechanics and availability, not animation timing. Their
 * stable IDs also bind icons and paintedMagicData recipes in presentation.
 * Keep mechanical changes here/rules separate from art-only recipe changes.
 */
import type { SpellDefinition, InterventionDefinition } from '@pr/rules';
export const EXPANSION_SPELLS: readonly SpellDefinition[] = [
  {
    "id": "exp_greek_aegis_shard",
    "name": "Aegis Shard",
    "tier": 1,
    "manaCost": 8,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 20,
      "perPower": 7
    },
    "summary": "One enemy stack take 20 + 7 \u00d7 Power damage.",
    "lore": "Aegis Shard channels the greek tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_greek_aegis_shard",
    "implementationStatus": "implemented",
    "element": "lightning",
    "delivery": "direct",
    "pantheonId": "greek"
  },
  {
    "id": "exp_greek_olympian_spark",
    "name": "Olympian Spark",
    "tier": 1,
    "manaCost": 10,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 12,
      "perPower": 4
    },
    "summary": "Target and adjacent enemies take 12 + 4 \u00d7 Power damage.",
    "lore": "Olympian Spark channels the greek tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_greek_olympian_spark",
    "implementationStatus": "implemented",
    "element": "lightning",
    "delivery": "area",
    "pantheonId": "greek"
  },
  {
    "id": "exp_greek_trident_surge",
    "name": "Trident Surge",
    "tier": 2,
    "manaCost": 12,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 40,
      "perPower": 14
    },
    "summary": "One enemy stack take 40 + 14 \u00d7 Power damage.",
    "lore": "Trident Surge channels the greek tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_greek_trident_surge",
    "implementationStatus": "implemented",
    "element": "lightning",
    "delivery": "direct",
    "pantheonId": "greek"
  },
  {
    "id": "exp_greek_gorgon_gaze",
    "name": "Gorgon Gaze",
    "tier": 2,
    "manaCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 24,
      "perPower": 8
    },
    "summary": "Target and adjacent enemies take 24 + 8 \u00d7 Power damage.",
    "lore": "Gorgon Gaze channels the greek tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_greek_gorgon_gaze",
    "implementationStatus": "implemented",
    "element": "lightning",
    "delivery": "area",
    "pantheonId": "greek"
  },
  {
    "id": "exp_greek_titan_javelin",
    "name": "Titan Javelin",
    "tier": 3,
    "manaCost": 16,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 60,
      "perPower": 21
    },
    "summary": "One enemy stack take 60 + 21 \u00d7 Power damage.",
    "lore": "Titan Javelin channels the greek tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_greek_titan_javelin",
    "implementationStatus": "implemented",
    "element": "lightning",
    "delivery": "direct",
    "pantheonId": "greek"
  },
  {
    "id": "exp_greek_olympian_tempest",
    "name": "Olympian Tempest",
    "tier": 3,
    "manaCost": 18,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 36,
      "perPower": 12
    },
    "summary": "Target and adjacent enemies take 36 + 12 \u00d7 Power damage.",
    "lore": "Olympian Tempest channels the greek tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_greek_olympian_tempest",
    "implementationStatus": "implemented",
    "element": "lightning",
    "delivery": "area",
    "pantheonId": "greek"
  },
  {
    "id": "exp_norse_rime_needle",
    "name": "Rime Needle",
    "tier": 1,
    "manaCost": 8,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 20,
      "perPower": 7
    },
    "summary": "One enemy stack take 20 + 7 \u00d7 Power damage.",
    "lore": "Rime Needle channels the norse tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_norse_rime_needle",
    "implementationStatus": "implemented",
    "element": "cold",
    "delivery": "direct",
    "pantheonId": "norse"
  },
  {
    "id": "exp_norse_raven_talon",
    "name": "Raven Talon",
    "tier": 1,
    "manaCost": 10,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 12,
      "perPower": 4
    },
    "summary": "Target and adjacent enemies take 12 + 4 \u00d7 Power damage.",
    "lore": "Raven Talon channels the norse tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_norse_raven_talon",
    "implementationStatus": "implemented",
    "element": "cold",
    "delivery": "area",
    "pantheonId": "norse"
  },
  {
    "id": "exp_norse_glacier_fang",
    "name": "Glacier Fang",
    "tier": 2,
    "manaCost": 12,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 40,
      "perPower": 14
    },
    "summary": "One enemy stack take 40 + 14 \u00d7 Power damage.",
    "lore": "Glacier Fang channels the norse tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_norse_glacier_fang",
    "implementationStatus": "implemented",
    "element": "cold",
    "delivery": "direct",
    "pantheonId": "norse"
  },
  {
    "id": "exp_norse_rune_shatter",
    "name": "Rune Shatter",
    "tier": 2,
    "manaCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 24,
      "perPower": 8
    },
    "summary": "Target and adjacent enemies take 24 + 8 \u00d7 Power damage.",
    "lore": "Rune Shatter channels the norse tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_norse_rune_shatter",
    "implementationStatus": "implemented",
    "element": "cold",
    "delivery": "area",
    "pantheonId": "norse"
  },
  {
    "id": "exp_norse_fenrir_bite",
    "name": "Fenrir Bite",
    "tier": 3,
    "manaCost": 16,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 60,
      "perPower": 21
    },
    "summary": "One enemy stack take 60 + 21 \u00d7 Power damage.",
    "lore": "Fenrir Bite channels the norse tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_norse_fenrir_bite",
    "implementationStatus": "implemented",
    "element": "cold",
    "delivery": "direct",
    "pantheonId": "norse"
  },
  {
    "id": "exp_norse_winter_sundering",
    "name": "Winter Sundering",
    "tier": 3,
    "manaCost": 18,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 36,
      "perPower": 12
    },
    "summary": "Target and adjacent enemies take 36 + 12 \u00d7 Power damage.",
    "lore": "Winter Sundering channels the norse tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_norse_winter_sundering",
    "implementationStatus": "implemented",
    "element": "cold",
    "delivery": "area",
    "pantheonId": "norse"
  },
  {
    "id": "exp_egyptian_sun_needle",
    "name": "Sun Needle",
    "tier": 1,
    "manaCost": 8,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 20,
      "perPower": 7
    },
    "summary": "One enemy stack take 20 + 7 \u00d7 Power damage.",
    "lore": "Sun Needle channels the egyptian tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_egyptian_sun_needle",
    "implementationStatus": "implemented",
    "element": "solar",
    "delivery": "direct",
    "pantheonId": "egyptian"
  },
  {
    "id": "exp_egyptian_scarab_sting",
    "name": "Scarab Sting",
    "tier": 1,
    "manaCost": 10,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 12,
      "perPower": 4
    },
    "summary": "Target and adjacent enemies take 12 + 4 \u00d7 Power damage.",
    "lore": "Scarab Sting channels the egyptian tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_egyptian_scarab_sting",
    "implementationStatus": "implemented",
    "element": "solar",
    "delivery": "area",
    "pantheonId": "egyptian"
  },
  {
    "id": "exp_egyptian_desert_glass",
    "name": "Desert Glass",
    "tier": 2,
    "manaCost": 12,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 40,
      "perPower": 14
    },
    "summary": "One enemy stack take 40 + 14 \u00d7 Power damage.",
    "lore": "Desert Glass channels the egyptian tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_egyptian_desert_glass",
    "implementationStatus": "implemented",
    "element": "solar",
    "delivery": "direct",
    "pantheonId": "egyptian"
  },
  {
    "id": "exp_egyptian_cobra_crown",
    "name": "Cobra Crown",
    "tier": 2,
    "manaCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 24,
      "perPower": 8
    },
    "summary": "Target and adjacent enemies take 24 + 8 \u00d7 Power damage.",
    "lore": "Cobra Crown channels the egyptian tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_egyptian_cobra_crown",
    "implementationStatus": "implemented",
    "element": "solar",
    "delivery": "area",
    "pantheonId": "egyptian"
  },
  {
    "id": "exp_egyptian_solar_lance",
    "name": "Solar Lance",
    "tier": 3,
    "manaCost": 16,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 60,
      "perPower": 21
    },
    "summary": "One enemy stack take 60 + 21 \u00d7 Power damage.",
    "lore": "Solar Lance channels the egyptian tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_egyptian_solar_lance",
    "implementationStatus": "implemented",
    "element": "solar",
    "delivery": "direct",
    "pantheonId": "egyptian"
  },
  {
    "id": "exp_egyptian_pyramid_nova",
    "name": "Pyramid Nova",
    "tier": 3,
    "manaCost": 18,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 36,
      "perPower": 12
    },
    "summary": "Target and adjacent enemies take 36 + 12 \u00d7 Power damage.",
    "lore": "Pyramid Nova channels the egyptian tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_egyptian_pyramid_nova",
    "implementationStatus": "implemented",
    "element": "solar",
    "delivery": "area",
    "pantheonId": "egyptian"
  },
  {
    "id": "exp_japanese_fox_ember",
    "name": "Fox Ember",
    "tier": 1,
    "manaCost": 8,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 20,
      "perPower": 7
    },
    "summary": "One enemy stack take 20 + 7 \u00d7 Power damage.",
    "lore": "Fox Ember channels the japanese tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_japanese_fox_ember",
    "implementationStatus": "implemented",
    "element": "fire",
    "delivery": "direct",
    "pantheonId": "japanese"
  },
  {
    "id": "exp_japanese_paper_blade",
    "name": "Paper Blade",
    "tier": 1,
    "manaCost": 10,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 12,
      "perPower": 4
    },
    "summary": "Target and adjacent enemies take 12 + 4 \u00d7 Power damage.",
    "lore": "Paper Blade channels the japanese tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_japanese_paper_blade",
    "implementationStatus": "implemented",
    "element": "fire",
    "delivery": "area",
    "pantheonId": "japanese"
  },
  {
    "id": "exp_japanese_oni_flame",
    "name": "Oni Flame",
    "tier": 2,
    "manaCost": 12,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 40,
      "perPower": 14
    },
    "summary": "One enemy stack take 40 + 14 \u00d7 Power damage.",
    "lore": "Oni Flame channels the japanese tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_japanese_oni_flame",
    "implementationStatus": "implemented",
    "element": "fire",
    "delivery": "direct",
    "pantheonId": "japanese"
  },
  {
    "id": "exp_japanese_mirror_shatter",
    "name": "Mirror Shatter",
    "tier": 2,
    "manaCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 24,
      "perPower": 8
    },
    "summary": "Target and adjacent enemies take 24 + 8 \u00d7 Power damage.",
    "lore": "Mirror Shatter channels the japanese tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_japanese_mirror_shatter",
    "implementationStatus": "implemented",
    "element": "fire",
    "delivery": "area",
    "pantheonId": "japanese"
  },
  {
    "id": "exp_japanese_dragon_comet",
    "name": "Dragon Comet",
    "tier": 3,
    "manaCost": 16,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 60,
      "perPower": 21
    },
    "summary": "One enemy stack take 60 + 21 \u00d7 Power damage.",
    "lore": "Dragon Comet channels the japanese tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_japanese_dragon_comet",
    "implementationStatus": "implemented",
    "element": "fire",
    "delivery": "direct",
    "pantheonId": "japanese"
  },
  {
    "id": "exp_japanese_thousand_lanterns",
    "name": "Thousand Lanterns",
    "tier": 3,
    "manaCost": 18,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 36,
      "perPower": 12
    },
    "summary": "Target and adjacent enemies take 36 + 12 \u00d7 Power damage.",
    "lore": "Thousand Lanterns channels the japanese tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_japanese_thousand_lanterns",
    "implementationStatus": "implemented",
    "element": "fire",
    "delivery": "area",
    "pantheonId": "japanese"
  },
  {
    "id": "exp_celtic_briar_dart",
    "name": "Briar Dart",
    "tier": 1,
    "manaCost": 8,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 20,
      "perPower": 7
    },
    "summary": "One enemy stack take 20 + 7 \u00d7 Power damage.",
    "lore": "Briar Dart channels the celtic tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_celtic_briar_dart",
    "implementationStatus": "implemented",
    "element": "nature",
    "delivery": "direct",
    "pantheonId": "celtic"
  },
  {
    "id": "exp_celtic_wisp_sting",
    "name": "Wisp Sting",
    "tier": 1,
    "manaCost": 10,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 12,
      "perPower": 4
    },
    "summary": "Target and adjacent enemies take 12 + 4 \u00d7 Power damage.",
    "lore": "Wisp Sting channels the celtic tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_celtic_wisp_sting",
    "implementationStatus": "implemented",
    "element": "nature",
    "delivery": "area",
    "pantheonId": "celtic"
  },
  {
    "id": "exp_celtic_oak_spear",
    "name": "Oak Spear",
    "tier": 2,
    "manaCost": 12,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 40,
      "perPower": 14
    },
    "summary": "One enemy stack take 40 + 14 \u00d7 Power damage.",
    "lore": "Oak Spear channels the celtic tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_celtic_oak_spear",
    "implementationStatus": "implemented",
    "element": "nature",
    "delivery": "direct",
    "pantheonId": "celtic"
  },
  {
    "id": "exp_celtic_thorn_spiral",
    "name": "Thorn Spiral",
    "tier": 2,
    "manaCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 24,
      "perPower": 8
    },
    "summary": "Target and adjacent enemies take 24 + 8 \u00d7 Power damage.",
    "lore": "Thorn Spiral channels the celtic tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_celtic_thorn_spiral",
    "implementationStatus": "implemented",
    "element": "nature",
    "delivery": "area",
    "pantheonId": "celtic"
  },
  {
    "id": "exp_celtic_moon_hunt",
    "name": "Moon Hunt",
    "tier": 3,
    "manaCost": 16,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 60,
      "perPower": 21
    },
    "summary": "One enemy stack take 60 + 21 \u00d7 Power damage.",
    "lore": "Moon Hunt channels the celtic tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_celtic_moon_hunt",
    "implementationStatus": "implemented",
    "element": "nature",
    "delivery": "direct",
    "pantheonId": "celtic"
  },
  {
    "id": "exp_celtic_wildwood_reckoning",
    "name": "Wildwood Reckoning",
    "tier": 3,
    "manaCost": 18,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 36,
      "perPower": 12
    },
    "summary": "Target and adjacent enemies take 36 + 12 \u00d7 Power damage.",
    "lore": "Wildwood Reckoning channels the celtic tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_celtic_wildwood_reckoning",
    "implementationStatus": "implemented",
    "element": "nature",
    "delivery": "area",
    "pantheonId": "celtic"
  },
  {
    "id": "exp_mesoamerican_jade_fang",
    "name": "Jade Fang",
    "tier": 1,
    "manaCost": 8,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 20,
      "perPower": 7
    },
    "summary": "One enemy stack take 20 + 7 \u00d7 Power damage.",
    "lore": "Jade Fang channels the mesoamerican tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_mesoamerican_jade_fang",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "direct",
    "pantheonId": "mesoamerican"
  },
  {
    "id": "exp_mesoamerican_obsidian_splinter",
    "name": "Obsidian Splinter",
    "tier": 1,
    "manaCost": 10,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 12,
      "perPower": 4
    },
    "summary": "Target and adjacent enemies take 12 + 4 \u00d7 Power damage.",
    "lore": "Obsidian Splinter channels the mesoamerican tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_mesoamerican_obsidian_splinter",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "area",
    "pantheonId": "mesoamerican"
  },
  {
    "id": "exp_mesoamerican_serpent_coil",
    "name": "Serpent Coil",
    "tier": 2,
    "manaCost": 12,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 40,
      "perPower": 14
    },
    "summary": "One enemy stack take 40 + 14 \u00d7 Power damage.",
    "lore": "Serpent Coil channels the mesoamerican tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_mesoamerican_serpent_coil",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "direct",
    "pantheonId": "mesoamerican"
  },
  {
    "id": "exp_mesoamerican_jaguar_eclipse",
    "name": "Jaguar Eclipse",
    "tier": 2,
    "manaCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 24,
      "perPower": 8
    },
    "summary": "Target and adjacent enemies take 24 + 8 \u00d7 Power damage.",
    "lore": "Jaguar Eclipse channels the mesoamerican tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_mesoamerican_jaguar_eclipse",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "area",
    "pantheonId": "mesoamerican"
  },
  {
    "id": "exp_mesoamerican_star_calendar",
    "name": "Star Calendar",
    "tier": 3,
    "manaCost": 16,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 60,
      "perPower": 21
    },
    "summary": "One enemy stack take 60 + 21 \u00d7 Power damage.",
    "lore": "Star Calendar channels the mesoamerican tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_mesoamerican_star_calendar",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "direct",
    "pantheonId": "mesoamerican"
  },
  {
    "id": "exp_mesoamerican_volcanic_crown",
    "name": "Volcanic Crown",
    "tier": 3,
    "manaCost": 18,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 36,
      "perPower": 12
    },
    "summary": "Target and adjacent enemies take 36 + 12 \u00d7 Power damage.",
    "lore": "Volcanic Crown channels the mesoamerican tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_mesoamerican_volcanic_crown",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "area",
    "pantheonId": "mesoamerican"
  },
  {
    "id": "exp_shared_arcane_needle",
    "name": "Arcane Needle",
    "tier": 1,
    "manaCost": 8,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 20,
      "perPower": 7
    },
    "summary": "One enemy stack take 20 + 7 \u00d7 Power damage.",
    "lore": "Arcane Needle channels the shared tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_shared_arcane_needle",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "direct"
  },
  {
    "id": "exp_shared_searing_cinder",
    "name": "Searing Cinder",
    "tier": 1,
    "manaCost": 10,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 12,
      "perPower": 4
    },
    "summary": "Target and adjacent enemies take 12 + 4 \u00d7 Power damage.",
    "lore": "Searing Cinder channels the shared tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_shared_searing_cinder",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "area"
  },
  {
    "id": "exp_shared_crystal_lance",
    "name": "Crystal Lance",
    "tier": 2,
    "manaCost": 12,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 40,
      "perPower": 14
    },
    "summary": "One enemy stack take 40 + 14 \u00d7 Power damage.",
    "lore": "Crystal Lance channels the shared tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_shared_crystal_lance",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "direct"
  },
  {
    "id": "exp_shared_gravity_bloom",
    "name": "Gravity Bloom",
    "tier": 2,
    "manaCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 24,
      "perPower": 8
    },
    "summary": "Target and adjacent enemies take 24 + 8 \u00d7 Power damage.",
    "lore": "Gravity Bloom channels the shared tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_shared_gravity_bloom",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "area"
  },
  {
    "id": "exp_shared_astral_execution",
    "name": "Astral Execution",
    "tier": 3,
    "manaCost": 16,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "direct_damage",
      "base": 60,
      "perPower": 21
    },
    "summary": "One enemy stack take 60 + 21 \u00d7 Power damage.",
    "lore": "Astral Execution channels the shared tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_shared_astral_execution",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "direct"
  },
  {
    "id": "exp_shared_comet_convergence",
    "name": "Comet Convergence",
    "tier": 3,
    "manaCost": 18,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "area_damage",
      "base": 36,
      "perPower": 12
    },
    "summary": "Target and adjacent enemies take 36 + 12 \u00d7 Power damage.",
    "lore": "Comet Convergence channels the shared tradition into a destructive battlefield invocation.",
    "access": "sanctum",
    "scope": "expanded",
    "iconAssetId": "icon.spell.exp_shared_comet_convergence",
    "implementationStatus": "implemented",
    "element": "arcane",
    "delivery": "area"
  }
];
export const EXPANSION_MIRACLES: readonly InterventionDefinition[] = [
  {
    "id": "exp_greek_judgment_of_olympus",
    "name": "Judgment of Olympus",
    "summary": "One enemy stack loses 16% of its current HP (at least 100 damage).",
    "favorCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 100,
      "percent": 16
    },
    "pantheonIds": [
      "greek"
    ],
    "iconAssetId": "icon.intervention.exp_greek_judgment_of_olympus"
  },
  {
    "id": "exp_greek_sea_kings_wrath",
    "name": "Sea Kings Wrath",
    "summary": "One enemy stack loses 24% of its current HP (at least 160 damage).",
    "favorCost": 20,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 160,
      "percent": 24
    },
    "pantheonIds": [
      "greek"
    ],
    "iconAssetId": "icon.intervention.exp_greek_sea_kings_wrath"
  },
  {
    "id": "exp_norse_ragnarok_hammer",
    "name": "Ragnarok Hammer",
    "summary": "One enemy stack loses 16% of its current HP (at least 100 damage).",
    "favorCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 100,
      "percent": 16
    },
    "pantheonIds": [
      "norse"
    ],
    "iconAssetId": "icon.intervention.exp_norse_ragnarok_hammer"
  },
  {
    "id": "exp_norse_fimbulwinter",
    "name": "Fimbulwinter",
    "summary": "One enemy stack loses 24% of its current HP (at least 160 damage).",
    "favorCost": 20,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 160,
      "percent": 24
    },
    "pantheonIds": [
      "norse"
    ],
    "iconAssetId": "icon.intervention.exp_norse_fimbulwinter"
  },
  {
    "id": "exp_egyptian_judgment_of_anubis",
    "name": "Judgment of Anubis",
    "summary": "One enemy stack loses 16% of its current HP (at least 100 damage).",
    "favorCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 100,
      "percent": 16
    },
    "pantheonIds": [
      "egyptian"
    ],
    "iconAssetId": "icon.intervention.exp_egyptian_judgment_of_anubis"
  },
  {
    "id": "exp_egyptian_ra_ascendant",
    "name": "Ra Ascendant",
    "summary": "One enemy stack loses 24% of its current HP (at least 160 damage).",
    "favorCost": 20,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 160,
      "percent": 24
    },
    "pantheonIds": [
      "egyptian"
    ],
    "iconAssetId": "icon.intervention.exp_egyptian_ra_ascendant"
  },
  {
    "id": "exp_japanese_raijins_verdict",
    "name": "Raijins Verdict",
    "summary": "One enemy stack loses 16% of its current HP (at least 100 damage).",
    "favorCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 100,
      "percent": 16
    },
    "pantheonIds": [
      "japanese"
    ],
    "iconAssetId": "icon.intervention.exp_japanese_raijins_verdict"
  },
  {
    "id": "exp_japanese_amaterasus_dawn",
    "name": "Amaterasus Dawn",
    "summary": "One enemy stack loses 24% of its current HP (at least 160 damage).",
    "favorCost": 20,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 160,
      "percent": 24
    },
    "pantheonIds": [
      "japanese"
    ],
    "iconAssetId": "icon.intervention.exp_japanese_amaterasus_dawn"
  },
  {
    "id": "exp_celtic_morrigans_flight",
    "name": "Morrigans Flight",
    "summary": "One enemy stack loses 16% of its current HP (at least 100 damage).",
    "favorCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 100,
      "percent": 16
    },
    "pantheonIds": [
      "celtic"
    ],
    "iconAssetId": "icon.intervention.exp_celtic_morrigans_flight"
  },
  {
    "id": "exp_celtic_lughs_judgment",
    "name": "Lughs Judgment",
    "summary": "One enemy stack loses 24% of its current HP (at least 160 damage).",
    "favorCost": 20,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 160,
      "percent": 24
    },
    "pantheonIds": [
      "celtic"
    ],
    "iconAssetId": "icon.intervention.exp_celtic_lughs_judgment"
  },
  {
    "id": "exp_mesoamerican_feathered_serpent_descent",
    "name": "Feathered Serpent Descent",
    "summary": "One enemy stack loses 16% of its current HP (at least 100 damage).",
    "favorCost": 14,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 100,
      "percent": 16
    },
    "pantheonIds": [
      "mesoamerican"
    ],
    "iconAssetId": "icon.intervention.exp_mesoamerican_feathered_serpent_descent"
  },
  {
    "id": "exp_mesoamerican_heart_of_the_sun",
    "name": "Heart of the Sun",
    "summary": "One enemy stack loses 24% of its current HP (at least 160 damage).",
    "favorCost": 20,
    "context": "battle",
    "target": "enemy_stack",
    "effect": {
      "type": "battle_smite",
      "damage": 160,
      "percent": 24
    },
    "pantheonIds": [
      "mesoamerican"
    ],
    "iconAssetId": "icon.intervention.exp_mesoamerican_heart_of_the_sun"
  }
];
