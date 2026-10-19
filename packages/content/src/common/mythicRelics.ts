/** Approved library relics with implemented, typed rules. */
import type { ArtifactDefinition } from '@pr/rules';
export const MYTHIC_RELICS: readonly ArtifactDefinition[] = [
  {
    "id": "relic2_mimir_cup",
    "name": "Cup of Mimir's Counsel",
    "slot": "neck",
    "effects": [
      {
        "type": "library_spell_discount",
        "amount": 2,
        "casts": 2
      }
    ],
    "summary": "The first 2 battle spells cost 2 less mana, minimum 1. Quota belongs to the hero for the entire battle, not to the equipped instance.",
    "iconAssetId": "icon.artifact.relic2_mimir_cup",
    "unique": false,
    "merchantPrice": {
      "gold": 5500
    },
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Mimir's wisdom inspires a drinking-vessel pendant; this is not a canonical named relic.",
    "originPantheonId": "norse",
    "rarity": "major",
    "scope": "mythic_library_v2"
  },
  {
    "id": "relic2_idunn_apple_clasp",
    "name": "Idunn's Apple Clasp",
    "slot": "ring",
    "effects": [
      {
        "type": "library_front_heal",
        "amount": 5,
        "rounds": 3
      }
    ],
    "summary": "At the end of rounds 1-3, heal 5 HP on the wounded front creature of each living allied stack. No resurrection; no undead or constructs.",
    "iconAssetId": "icon.artifact.relic2_idunn_apple_clasp",
    "unique": false,
    "merchantPrice": {
      "gold": 3500
    },
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Idunn's apples inspire limited restoration.",
    "originPantheonId": "norse",
    "rarity": "minor",
    "scope": "mythic_library_v2"
  },
  {
    "id": "relic2_skadi_huntbow",
    "name": "Skadi's Huntbow",
    "slot": "weapon",
    "effects": [
      {
        "type": "library_first_shot_range"
      }
    ],
    "summary": "Each allied shooter ignores the distance penalty on its first ranged attack of battle. Cover, melee engagement and line-of-sight rules still apply.",
    "iconAssetId": "icon.artifact.relic2_skadi_huntbow",
    "unique": false,
    "merchantPrice": {
      "gold": 6000
    },
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "A fictional bow honoring Skadi's hunting associations.",
    "originPantheonId": "norse",
    "rarity": "major",
    "scope": "mythic_library_v2"
  },
  {
    "id": "relic2_nut_starweave",
    "name": "Starweave of Nut",
    "slot": "cape",
    "effects": [
      {
        "type": "library_mana_refund",
        "trigger": "spent",
        "threshold": 10,
        "amount": 3
      }
    ],
    "summary": "Once per battle, after spending at least 10 actual mana on a spell, regain 3 mana. Cannot exceed maximum or trigger from refunds, free casts or itself.",
    "iconAssetId": "icon.artifact.relic2_nut_starweave",
    "unique": false,
    "merchantPrice": {
      "gold": 6500
    },
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Nut's starry sky inspires a limited mana return.",
    "originPantheonId": "egyptian",
    "rarity": "major",
    "scope": "mythic_library_v2"
  },
  {
    "id": "relic2_hidesato_centipede_arrow",
    "name": "Centipede-Breaker Arrow",
    "slot": "weapon",
    "effects": [
      {
        "type": "library_large_target_damage",
        "percent": 10
      }
    ],
    "summary": "Allied ranged attacks against two-hex enemy creatures deal 10% more physical damage. Does not affect war machines, spells or one-hex targets.",
    "iconAssetId": "icon.artifact.relic2_hidesato_centipede_arrow",
    "unique": false,
    "merchantPrice": {
      "gold": 6500
    },
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Inspired by the giant-centipede tale of Tawara Toda; the bonus is an adaptation.",
    "originPantheonId": "japanese",
    "rarity": "major",
    "scope": "mythic_library_v2"
  },
  {
    "id": "relic2_takemikazuchi_guard",
    "name": "Thunder-Sword Guard",
    "slot": "shield",
    "effects": [
      {
        "type": "library_first_retaliation",
        "percent": 15
      }
    ],
    "summary": "The first retaliation by each allied melee stack deals 15% more physical damage. It grants no extra retaliation and does not trigger from ranged counterfire.",
    "iconAssetId": "icon.artifact.relic2_takemikazuchi_guard",
    "unique": false,
    "merchantPrice": {
      "gold": 5500
    },
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "A fictional sword-guard relic inspired by Takemikazuchi.",
    "originPantheonId": "japanese",
    "rarity": "major",
    "scope": "mythic_library_v2"
  },
  {
    "id": "relic2_dian_cecht_needle",
    "name": "Needle of the Wellspring",
    "slot": "misc",
    "effects": [
      {
        "type": "library_heal_amplification",
        "percent": 20,
        "cap": 20
      }
    ],
    "summary": "Front-creature healing from the hero's spells increases by 20%, capped at 20 extra HP per target per cast. No resurrection or effect on casualty recovery.",
    "iconAssetId": "icon.artifact.relic2_dian_cecht_needle",
    "unique": false,
    "merchantPrice": {
      "gold": 5500
    },
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "A fictional healer's needle inspired by Dian Cecht traditions.",
    "originPantheonId": "celtic",
    "rarity": "major",
    "scope": "mythic_library_v2"
  },
  {
    "id": "relic2_morrigan_crowcloak",
    "name": "Crowcloak of the Last Watch",
    "slot": "cape",
    "effects": [
      {
        "type": "library_wounded_defense",
        "belowPercent": 25,
        "defense": 3
      }
    ],
    "summary": "Living allied stacks below 25% of their original creature count gain +3 Defense. Recalculate continuously; no bonus from splitting before battle into artificial fragments.",
    "iconAssetId": "icon.artifact.relic2_morrigan_crowcloak",
    "unique": true,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "A fictional war-cloak inspired by Morrigan's crow imagery.",
    "originPantheonId": "celtic",
    "rarity": "relic",
    "scope": "mythic_library_v2"
  },
  {
    "id": "relic2_hourglass_reserve",
    "name": "Hourglass of the Last Ember",
    "slot": "misc",
    "effects": [
      {
        "type": "library_mana_refund",
        "trigger": "low",
        "threshold": 3,
        "amount": 4
      }
    ],
    "summary": "Once per battle, when mana would fall below 3 after paying a spell cost, restore 4 mana. The cast must have been affordable before payment. No second trigger.",
    "iconAssetId": "icon.artifact.relic2_hourglass_reserve",
    "unique": true,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Original relic emphasizing mana timing rather than free extra turns.",
    "rarity": "relic",
    "scope": "mythic_library_v2"
  },
  {
    "id": "relic2_orpheus_lyre",
    "name": "Lyre of the Unbroken Song",
    "slot": "weapon",
    "effects": [
      {
        "type": "commander_attribute",
        "attribute": "knowledge",
        "amount": 1
      },
      {
        "type": "library_first_mind_guard"
      }
    ],
    "summary": "+1 Knowledge. Cancel the first mind-tagged hostile debuff that would affect one allied stack each battle; does not block damage or area effects on other stacks.",
    "iconAssetId": "icon.artifact.relic2_orpheus_lyre",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Orpheus's music inspires protection from enthrallment; the rules are original.",
    "originPantheonId": "greek",
    "rarity": "major",
    "scope": "mythic_library_v2",
    "merchantPrice": {
      "gold": 6000
    }
  },
  {
    "id": "relic2_talos_bronze_seal",
    "name": "Talos's Bronze Seal",
    "slot": "ring",
    "effects": [
      {
        "type": "library_first_ranged_resist",
        "percent": 15
      }
    ],
    "summary": "The first ranged physical hit against each allied stack deals 15% less damage. One trigger per original stack each battle; reflected damage never triggers it.",
    "iconAssetId": "icon.artifact.relic2_talos_bronze_seal",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Talos's bronze body inspires this seal; its defense is a game adaptation.",
    "originPantheonId": "greek",
    "rarity": "major",
    "scope": "mythic_library_v2",
    "merchantPrice": {
      "gold": 4500
    }
  },
  {
    "id": "relic2_svalinn_shield",
    "name": "Shard-Shield of Svalinn",
    "slot": "shield",
    "effects": [
      {
        "type": "commander_attribute",
        "attribute": "defense",
        "amount": 1
      },
      {
        "type": "library_elemental_resist",
        "element": "fire",
        "percent": 25
      }
    ],
    "summary": "+1 Defense. Army takes 25% less fire-tagged spell damage; shares the elemental-resistance cap and does not resist physical attacks.",
    "iconAssetId": "icon.artifact.relic2_svalinn_shield",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Svalinn's shielding of the sun inspires fire protection.",
    "originPantheonId": "norse",
    "rarity": "major",
    "scope": "mythic_library_v2",
    "merchantPrice": {
      "gold": 6500
    }
  },
  {
    "id": "relic2_isis_tyet",
    "name": "Tyet of the Shelterer",
    "slot": "neck",
    "effects": [
      {
        "type": "library_first_spell_resist",
        "percent": 40,
        "cap": 60
      }
    ],
    "summary": "The first single-target hostile spell against the army has its damage reduced by 40%, up to 60 prevented HP. Status components still apply.",
    "iconAssetId": "icon.artifact.relic2_isis_tyet",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "The tyet amulet's protective symbolism inspires the effect.",
    "originPantheonId": "egyptian",
    "rarity": "major",
    "scope": "mythic_library_v2",
    "merchantPrice": {
      "gold": 5000
    }
  },
  {
    "id": "relic2_hathor_sistrum",
    "name": "Sistrum of Clear Hearts",
    "slot": "weapon",
    "effects": [
      {
        "type": "library_first_morale_guard"
      }
    ],
    "summary": "Suppress the first negative-morale proc of each eligible allied stack per battle. No extra action, and morale-immune creatures receive no benefit.",
    "iconAssetId": "icon.artifact.relic2_hathor_sistrum",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "The sistrum and Hathor inspire a morale safeguard.",
    "originPantheonId": "egyptian",
    "rarity": "major",
    "scope": "mythic_library_v2",
    "merchantPrice": {
      "gold": 5000
    }
  },
  {
    "id": "relic2_yomi_return_cord",
    "name": "Cord of the Returning Shore",
    "slot": "cape",
    "effects": [
      {
        "type": "library_displacement_guard"
      }
    ],
    "summary": "The first forced displacement against each allied stack per battle is prevented. Damage and other debuffs still apply; voluntary moves are unaffected.",
    "iconAssetId": "icon.artifact.relic2_yomi_return_cord",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "A fictional boundary cord inspired by separation of living and dead worlds.",
    "originPantheonId": "japanese",
    "rarity": "major",
    "scope": "mythic_library_v2",
    "merchantPrice": {
      "gold": 6000
    }
  },
  {
    "id": "relic2_xiuhcoatl_firebrand",
    "name": "Xiuhcoatl Firebrand",
    "slot": "weapon",
    "effects": [
      {
        "type": "library_direct_element_amplify",
        "element": "fire",
        "percent": 20,
        "cap": 50
      }
    ],
    "summary": "The hero's first direct fire spell each battle deals 20% more damage, capped at 50 extra HP. Area and mass spells are excluded.",
    "iconAssetId": "icon.artifact.relic2_xiuhcoatl_firebrand",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Xiuhcoatl fire-serpent imagery inspires the weapon, without copying museum art.",
    "originPantheonId": "mesoamerican",
    "rarity": "major",
    "scope": "mythic_library_v2",
    "merchantPrice": {
      "gold": 6500
    }
  },
  {
    "id": "relic2_aeolus_windbag",
    "name": "Aeolus's Windbag",
    "slot": "misc",
    "rarity": "major",
    "summary": "While sailing, reduce movement costs by 15%, rounded up; no movement is granted on equip. Shares the global sailing discount cap.",
    "merchantPrice": {
      "gold": 5500
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "greek",
    "iconAssetId": "icon.artifact.relic2_aeolus_windbag",
    "effects": [
      {
        "type": "adventure_sailing_discount",
        "percent": 15
      }
    ],
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Aeolus's bag of winds inspires a limited sailing aid."
  },
  {
    "id": "relic2_hestia_hearthclasp",
    "name": "Hestia's Hearthclasp",
    "slot": "neck",
    "rarity": "minor",
    "summary": "Restore 8 extra mana at dawn if this hero spent no movement and entered no battle during the previous day; never exceed maximum mana.",
    "merchantPrice": {
      "gold": 3000
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "greek",
    "iconAssetId": "icon.artifact.relic2_hestia_hearthclasp",
    "effects": [
      {
        "type": "adventure_rested_mana",
        "amount": 8
      }
    ],
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "A fictional clasp honoring Hestia's hearth."
  },
  {
    "id": "relic2_thoth_inkwell",
    "name": "Thoth's Ibis Inkwell",
    "slot": "misc",
    "rarity": "major",
    "summary": "The first 2 adventure spells each day cost 2 less mana, minimum 1. Cannot discount Favor costs or reset on transfer.",
    "merchantPrice": {
      "gold": 4500
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "egyptian",
    "iconAssetId": "icon.artifact.relic2_thoth_inkwell",
    "effects": [
      {
        "type": "adventure_cast_discount",
        "amount": 2,
        "casts": 2
      }
    ],
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Thoth's scribal imagery inspires a limited spell-cost tool."
  },
  {
    "id": "relic2_hoori_tide_pearl",
    "name": "Hoori's Ebbing Pearl",
    "slot": "ring",
    "rarity": "major",
    "summary": "When sailing, ignore the first 2 adverse-current movement surcharges per day. If currents are absent, grant 10% sailing-cost reduction instead; never both.",
    "merchantPrice": {
      "gold": 5500
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "japanese",
    "iconAssetId": "icon.artifact.relic2_hoori_tide_pearl",
    "effects": [
      {
        "type": "adventure_sailing_discount",
        "percent": 10
      }
    ],
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "Hoori's tide jewels inspire controlled navigation, not terrain flooding."
  },
  {
    "id": "relic2_salmon_wisdom_pin",
    "name": "Salmon-Wisdom Pin",
    "slot": "head",
    "rarity": "minor",
    "summary": "Learning an unknown spell restores 5 mana, at most once per day. Scroll consumption and relearning a known spell do not trigger it.",
    "merchantPrice": {
      "gold": 3500
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "celtic",
    "iconAssetId": "icon.artifact.relic2_salmon_wisdom_pin",
    "effects": [
      {
        "type": "adventure_learning_mana",
        "amount": 5
      }
    ],
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "lore": "The salmon-of-knowledge motif inspires a scholar's pin."
  },
  {
    "id": "relic2_gleipnir_ribbon",
    "name": "Gleipnir Ribbon",
    "slot": "misc",
    "rarity": "relic",
    "summary": "Once per battle, spend the commander cast action to bind one enemy within 6 hexes of an allied stack: no movement on its next activation, but attacks and abilities remain usable. Dispellable.",
    "lore": "The delicate fetter Gleipnir inspires a temporary binding.",
    "unique": true,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "norse",
    "iconAssetId": "icon.artifact.relic2_gleipnir_ribbon",
    "effects": [
      {
        "type": "library_active",
        "action": "bind"
      }
    ]
  },
  {
    "id": "relic2_nuada_silver_bracer",
    "name": "Nuada's Silver Bracer",
    "slot": "shield",
    "rarity": "major",
    "summary": "Once per battle, commander action: remove one attack or defense debuff from an allied stack and grant +2 Defense through its next activation. No heal or extra attack.",
    "lore": "Nuada's silver hand inspires restoration of fighting ability.",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "celtic",
    "iconAssetId": "icon.artifact.relic2_nuada_silver_bracer",
    "effects": [
      {
        "type": "library_active",
        "action": "cleanse_defense"
      }
    ],
    "merchantPrice": {
      "gold": 6000
    }
  },
  {
    "id": "relic2_runebreaker_gauntlet",
    "name": "Runebreaker Gauntlet",
    "slot": "shield",
    "rarity": "relic",
    "summary": "Once per battle, commander action: remove one dispellable positive spell from one visible enemy stack. Cannot remove creature traits, blessings or artifacts.",
    "lore": "Original relic; inspired by classic strategy-game disenchantment roles.",
    "unique": true,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "scope": "mythic_library_v2",
    "iconAssetId": "icon.artifact.relic2_runebreaker_gauntlet",
    "effects": [
      {
        "type": "library_active",
        "action": "dispel"
      }
    ]
  },
  {
    "id": "relic2_golden_fleece_mantle",
    "name": "Mantle of the Golden Fleece",
    "slot": "armor",
    "rarity": "relic",
    "summary": "At battle start gain a shared army barrier of min(100,30+3*heroLevel) HP. It absorbs damage after mitigation until exhausted; cannot heal or revive.",
    "lore": "The Golden Fleece inspires a protective relic, not a claim about its ancient powers.",
    "unique": true,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "greek",
    "iconAssetId": "icon.artifact.relic2_golden_fleece_mantle",
    "effects": [
      {
        "type": "library_army_barrier",
        "base": 30,
        "perLevel": 3,
        "cap": 100
      }
    ]
  },
  {
    "id": "relic2_ehecatl_conch",
    "name": "Ehecatl's Wind-Jewel",
    "slot": "neck",
    "rarity": "major",
    "summary": "Allied flying creatures gain +1 movement hex on their first activation. Does not increase initiative or allow illegal landing.",
    "lore": "Ehecatl's cut-conch pectoral inspires a wind blessing.",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "mesoamerican",
    "iconAssetId": "icon.artifact.relic2_ehecatl_conch",
    "effects": [
      {
        "type": "library_first_flight_move",
        "amount": 1
      }
    ],
    "merchantPrice": {
      "gold": 5000
    }
  },
  {
    "id": "relic2_mictlan_guide_lantern",
    "name": "Lantern of Nine Crossings",
    "slot": "misc",
    "rarity": "major",
    "summary": "At battle start mark the strongest enemy undead stack by total HP. Friendly physical attacks against it deal 10% more damage; marker ends when it dies. No retarget.",
    "lore": "A fictional funerary lantern inspired by Mictlan journeys.",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "mesoamerican",
    "iconAssetId": "icon.artifact.relic2_mictlan_guide_lantern",
    "effects": [
      {
        "type": "library_undead_mark",
        "percent": 10
      }
    ],
    "merchantPrice": {
      "gold": 6000
    }
  },
  {
    "id": "relic2_anubis_canopic_seal",
    "name": "Canopic Seal of Anubis",
    "slot": "ring",
    "rarity": "major",
    "summary": "After victory recover 5% of eligible living losses, floored; only if at least one creature of that original stack survived. Shares the existing recovery cap; no summoned units.",
    "lore": "A fictional seal using funerary protection imagery.",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "egyptian",
    "iconAssetId": "icon.artifact.relic2_anubis_canopic_seal",
    "effects": [
      {
        "type": "library_living_recovery",
        "percent": 5
      }
    ],
    "merchantPrice": {
      "gold": 6000
    }
  },
  {
    "id": "relic2_uzume_bells",
    "name": "Bells of the Dawn Dancer",
    "slot": "neck",
    "rarity": "major",
    "summary": "Once per battle, the first successful friendly cleanse also grants its target +1 Speed until the end of its next activation. Does not trigger without removing a debuff.",
    "lore": "Uzume's dance before the sun's cave inspires renewal of motion.",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "japanese",
    "iconAssetId": "icon.artifact.relic2_uzume_bells",
    "effects": [
      {
        "type": "library_cleanse_speed",
        "amount": 1
      }
    ],
    "merchantPrice": {
      "gold": 4500
    }
  },
  {
    "id": "relic2_chalchiuhtlicue_hem",
    "name": "Jade-Hemmed Mantle",
    "slot": "armor",
    "rarity": "major",
    "summary": "Army takes 20% less water-tagged spell damage. Front-creature healing from water-tagged spells on this army gains 10%, capped at 10 HP per target.",
    "lore": "Chalchiuhtlicue's jade-skirt imagery inspires protective apparel.",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "mesoamerican",
    "iconAssetId": "icon.artifact.relic2_chalchiuhtlicue_hem",
    "effects": [
      {
        "type": "library_elemental_resist",
        "element": "water",
        "percent": 20
      },
      {
        "type": "library_received_heal",
        "element": "water",
        "percent": 10,
        "cap": 10
      }
    ],
    "merchantPrice": {
      "gold": 5500
    }
  },
  {
    "id": "relic2_inari_rice_key",
    "name": "Inari's Rice-Key",
    "slot": "misc",
    "rarity": "minor",
    "summary": "In a town this hero visits, the first tier1-2 recruitment purchase each day costs 10% less gold, capped at 150 gold saved empire-wide. Other resources unchanged.",
    "lore": "A fictional granary key honoring Inari's rice associations.",
    "unique": false,
    "provenance": {
      "source": "proposed-this-build",
      "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
    },
    "scope": "mythic_library_v2",
    "originPantheonId": "japanese",
    "iconAssetId": "icon.artifact.relic2_inari_rice_key",
    "merchantPrice": {
      "gold": 3000
    },
    "effects": [
      {
        "type": "adventure_recruit_discount",
        "percent": 10,
        "cap": 150,
        "maxTier": 2
      }
    ]
  },
{
  "id": "relic2_ariadne_spool",
  "name": "Ariadne's Guiding Spool",
  "slot": "misc",
  "summary": "The first 3 rough-land steps each day ignore the terrain surcharge; base movement cost still applies. Excludes water, mountains and blocked cells.",
  "lore": "Ariadne's thread is the mythic motif; this roadfinding power is a game invention.",
  "rarity": "major",
  "effects": [
    {
      "type": "adventure_step_discount",
      "key": "relic2_ariadne_spool",
      "terrain": "rough",
      "mode": "surcharge",
      "percent": 100,
      "steps": 3
    }
  ],
  "iconAssetId": "icon.artifact.relic2_ariadne_spool",
  "unique": false,
  "merchantPrice": {
    "gold": 5000
  },
  "provenance": {
    "source": "proposed-this-build",
    "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
  },
  "scope": "mythic_library_v2",
  "originPantheonId": "greek"
},
{
  "id": "relic2_skidbladnir_keel",
  "name": "Folded Keel of Skidbladnir",
  "slot": "mount",
  "summary": "Once per day, boarding an existing owned empty ship costs only one normal land step. It creates no ship and grants no movement; require enough movement for that step.",
  "lore": "The folding ship Skidbladnir inspires a compact naval harness.",
  "rarity": "relic",
  "effects": [
    {
      "type": "adventure_embark_discount"
    }
  ],
  "iconAssetId": "icon.artifact.relic2_skidbladnir_keel",
  "unique": false,
  "merchantPrice": {
    "gold": 8500
  },
  "provenance": {
    "source": "proposed-this-build",
    "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
  },
  "scope": "mythic_library_v2",
  "originPantheonId": "norse"
},
{
  "id": "relic2_wepwawet_sandals",
  "name": "Sandals of the Opener",
  "slot": "feet",
  "summary": "Ignore desert movement surcharge on the first 5 desert steps per day; never ignore base cost, guards or scenario boundaries.",
  "lore": "A fictional pair honoring Wepwawet as an opener of ways.",
  "rarity": "minor",
  "effects": [
    {
      "type": "adventure_step_discount",
      "key": "relic2_wepwawet_sandals",
      "terrain": "desert",
      "mode": "surcharge",
      "percent": 100,
      "steps": 5
    }
  ],
  "iconAssetId": "icon.artifact.relic2_wepwawet_sandals",
  "unique": false,
  "merchantPrice": {
    "gold": 3500
  },
  "provenance": {
    "source": "proposed-this-build",
    "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
  },
  "scope": "mythic_library_v2",
  "originPantheonId": "egyptian"
},
{
  "id": "relic2_brans_voyage_brooch",
  "name": "Brooch of Bran's Voyage",
  "slot": "neck",
  "summary": "After the first legal disembark each day, the hero ignores rough-terrain surcharge for its next 2 land steps. No extra movement is granted.",
  "lore": "Otherworld voyage traditions inspire a shorefinding brooch.",
  "rarity": "minor",
  "effects": [
    {
      "type": "adventure_step_discount",
      "key": "relic2_brans_voyage_brooch",
      "terrain": "rough",
      "mode": "surcharge",
      "percent": 100,
      "steps": 2,
      "trigger": "landing"
    }
  ],
  "iconAssetId": "icon.artifact.relic2_brans_voyage_brooch",
  "unique": false,
  "merchantPrice": {
    "gold": 4000
  },
  "provenance": {
    "source": "proposed-this-build",
    "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
  },
  "scope": "mythic_library_v2",
  "originPantheonId": "celtic"
},
{
  "id": "relic2_rhiannon_bridle",
  "name": "Rhiannon's Patient Bridle",
  "slot": "mount",
  "summary": "After leaving an owned town, halve the terrain surcharge on the next 3 forest or marsh steps that day, capped at 100 movement points saved. Base cost remains; returning to town or transferring the bridle cannot reset the quota.",
  "lore": "Rhiannon's elusive horse inspires patient, effortless travel; the item and rules are original game fiction.",
  "rarity": "major",
  "effects": [
    {
      "type": "adventure_step_discount",
      "key": "relic2_rhiannon_bridle",
      "terrain": "forest_marsh",
      "mode": "surcharge",
      "percent": 50,
      "steps": 3,
      "cap": 100,
      "trigger": "town_exit"
    }
  ],
  "iconAssetId": "icon.artifact.relic2_rhiannon_bridle",
  "unique": false,
  "merchantPrice": {
    "gold": 5000
  },
  "provenance": {
    "source": "proposed-this-build",
    "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
  },
  "scope": "mythic_library_v2",
  "originPantheonId": "celtic"
},
{
  "id": "relic2_pilgrim_mileboots",
  "name": "Pilgrim's Mileboots",
  "slot": "feet",
  "summary": "On roads only, reduce movement costs by 10%, with at most 100 points saved per day. No effect on embark, teleport, sea or off-road travel.",
  "lore": "Original road relic for logistics-focused heroes.",
  "rarity": "minor",
  "effects": [
    {
      "type": "adventure_step_discount",
      "key": "relic2_pilgrim_mileboots",
      "terrain": "road",
      "mode": "percent",
      "percent": 10,
      "cap": 100
    }
  ],
  "iconAssetId": "icon.artifact.relic2_pilgrim_mileboots",
  "unique": false,
  "merchantPrice": {
    "gold": 3000
  },
  "provenance": {
    "source": "proposed-this-build",
    "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
  },
  "scope": "mythic_library_v2"
},
{
  "id": "relic2_xolotl_guide_mask",
  "name": "Xolotl's Guide-Mask",
  "slot": "head",
  "summary": "Reveal legal embark and disembark points within 4 hexes of the hero on already explored coast. Does not reveal hidden enemies or make new landings.",
  "lore": "A fictional mask inspired by Xolotl's guiding role.",
  "rarity": "major",
  "effects": [
    {
      "type": "adventure_coast_survey",
      "radius": 4
    }
  ],
  "iconAssetId": "icon.artifact.relic2_xolotl_guide_mask",
  "unique": false,
  "merchantPrice": {
    "gold": 5000
  },
  "provenance": {
    "source": "proposed-this-build",
    "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
  },
  "scope": "mythic_library_v2",
  "originPantheonId": "mesoamerican"
},
{
  "id": "relic2_quetzal_seed_ring",
  "name": "Ring of the Returning Maize",
  "slot": "ring",
  "summary": "At weekly rollover, one owned town visited by this hero during the prior week gains 2 tier1 recruits. Select town before rollover; requires its dwelling. One ring benefit per empire.",
  "lore": "A fictional ring combining maize renewal and feathered-serpent motifs.",
  "rarity": "minor",
  "effects": [
    {
      "type": "adventure_seed_growth",
      "amount": 2
    }
  ],
  "iconAssetId": "icon.artifact.relic2_quetzal_seed_ring",
  "unique": false,
  "merchantPrice": {
    "gold": 4000
  },
  "provenance": {
    "source": "proposed-this-build",
    "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
  },
  "scope": "mythic_library_v2",
  "originPantheonId": "mesoamerican"
},
{
  "id": "relic2_surveyors_astrolabe",
  "name": "Surveyor's Broken Astrolabe",
  "slot": "misc",
  "summary": "The first neutral site visited each day permanently reveals adjacent terrain one hex farther than normal. No extra enemy army-detail reveal.",
  "lore": "Original Confluence relic, with no asserted historical origin.",
  "rarity": "minor",
  "effects": [
    {
      "type": "adventure_site_survey",
      "radius": 1
    }
  ],
  "iconAssetId": "icon.artifact.relic2_surveyors_astrolabe",
  "unique": false,
  "merchantPrice": {
    "gold": 3500
  },
  "provenance": {
    "source": "proposed-this-build",
    "note": "Approved Mythic Library II, 2026-10-18; balance candidates."
  },
  "scope": "mythic_library_v2"
}
];
