import type { InterventionDefinition } from '@pr/rules';
export const MYTHIC_BLESSINGS: readonly InterventionDefinition[] = [
  {
    "id": "blessing2_tyrs_equal_ground",
    "name": "Tyr's Equal Ground",
    "summary": "One allied stack's next normal melee strike ignores up to 6 points of the target's Defense supplied by its commander and positive temporary spell modifiers, never the creature's base Defense, artifact bonuses or cover. Expires after 2 rounds; does not grant an extra strike.",
    "favorCost": 12,
    "context": "battle",
    "target": "ally_stack",
    "effect": {
      "type": "library_battle_status",
      "status": "pierce_borrowed_defense",
      "amount": 6,
      "durationRounds": 2,
      "charges": 1
    },
    "pantheonIds": [
      "norse"
    ],
    "iconAssetId": "icon.intervention.blessing2_tyrs_equal_ground",
    "scope": "mythic_library_v2",
    "requiredGodId": "norse_tyr",
    "consumesCommanderAction": true
  },
  {
    "id": "blessing2_friggs_watched_return",
    "name": "Frigg's Watched Return",
    "summary": "For 2 rounds, the first physical hit that would completely destroy this original living stack instead leaves its final creature at 1 HP. The protection then ends. It cannot restore already lost creatures or prevent spell damage. Cannot target summons, illusions, undead or machines.",
    "favorCost": 18,
    "context": "battle",
    "target": "ally_stack",
    "effect": {
      "type": "library_battle_status",
      "status": "last_creature_guard",
      "amount": 1,
      "durationRounds": 2,
      "charges": 1
    },
    "pantheonIds": [
      "norse"
    ],
    "iconAssetId": "icon.intervention.blessing2_friggs_watched_return",
    "scope": "mythic_library_v2",
    "requiredGodId": "norse_frigg",
    "consumesCommanderAction": true
  },
  {
    "id": "blessing2_thoths_reckoning",
    "name": "Thoth's Reckoning",
    "summary": "The next ordinary battle spell cast within 2 rounds costs 4 less mana, minimum 1, and cannot have its beneficial duration shortened by an enemy effect on the same round it is cast. It can still be dispelled. This blessing uses this round's cast action, so the discounted spell is cast on a later round.",
    "favorCost": 8,
    "context": "battle",
    "target": "none",
    "effect": {
      "type": "library_spell_credit",
      "amount": 4,
      "durationRounds": 2
    },
    "pantheonIds": [
      "egyptian"
    ],
    "iconAssetId": "icon.intervention.blessing2_thoths_reckoning",
    "scope": "mythic_library_v2",
    "requiredGodId": "egyptian_thoth",
    "consumesCommanderAction": true
  },
  {
    "id": "blessing2_sobeks_river_oath",
    "name": "Sobek's River Oath",
    "summary": "In a naval, river or marsh battlefield, one allied stack's next 2 normal retaliations deal 20% extra physical damage, expiring after 2 rounds. It receives no additional retaliation charges and no permission to cross water.",
    "favorCost": 10,
    "context": "battle",
    "target": "ally_stack",
    "effect": {
      "type": "library_battle_status",
      "status": "retaliation_bonus",
      "amount": 20,
      "durationRounds": 2,
      "charges": 2,
      "wetBattleOnly": true
    },
    "pantheonIds": [
      "egyptian"
    ],
    "iconAssetId": "icon.intervention.blessing2_sobeks_river_oath",
    "scope": "mythic_library_v2",
    "requiredGodId": "egyptian_sobek",
    "consumesCommanderAction": true
  },
  {
    "id": "blessing2_brigids_unbroken_work",
    "name": "Brigid's Unbroken Work",
    "summary": "Restore 30 HP to the player's surviving immobile catapult, capped at its initial HP, and absorb up to 20 damage from its next hit within 2 rounds. Cannot rebuild a destroyed machine or relocate it.",
    "favorCost": 12,
    "context": "battle",
    "target": "none",
    "effect": {
      "type": "library_engine_repair",
      "heal": 30,
      "barrier": 20,
      "durationRounds": 2
    },
    "pantheonIds": [
      "celtic"
    ],
    "iconAssetId": "icon.intervention.blessing2_brigids_unbroken_work",
    "scope": "mythic_library_v2",
    "requiredGodId": "celtic_brigid",
    "consumesCommanderAction": true
  },
  {
    "id": "blessing2_poseidons_mooring",
    "name": "Poseidon's Mooring",
    "summary": "For the next naval battle begun by this ship before the next dawn, prevent the first forced displacement against each original allied stack. Damage and other status effects still apply. The ship must already exist and carry the invoking hero.",
    "favorCost": 12,
    "requiredGodId": "poseidon",
    "context": "adventure",
    "target": "own_hero",
    "scope": "mythic_library_v2",
    "pantheonIds": [
      "greek"
    ],
    "iconAssetId": "icon.intervention.blessing2_poseidons_mooring",
    "effect": {
      "type": "library_ship_blessing",
      "effect": "mooring"
    }
  },
  {
    "id": "blessing2_manannans_safe_landing",
    "name": "Manannan's Safe Landing",
    "summary": "The next legal disembark before dawn leaves 25% of the hero's daily movement allowance available, but never increases movement above its value immediately before disembarking. It cannot bypass a hostile coast, blocked landing or campaign boundary.",
    "favorCost": 12,
    "requiredGodId": "celtic_manannan",
    "context": "adventure",
    "target": "own_hero",
    "scope": "mythic_library_v2",
    "pantheonIds": [
      "celtic"
    ],
    "iconAssetId": "icon.intervention.blessing2_manannans_safe_landing",
    "effect": {
      "type": "library_ship_blessing",
      "effect": "safe_landing",
      "percent": 25
    }
  },
  {
    "id": "blessing2_amaterasus_true_dawn",
    "name": "Amaterasu's True Dawn",
    "summary": "Remove blindness and fear from all allied living stacks. Until the end of the following round, each affected stack resists the next new blindness or fear application once. No healing or damage bonus.",
    "favorCost": 14,
    "requiredGodId": "japanese_amaterasu",
    "context": "battle",
    "effect": {
      "type": "library_dawn_ward",
      "durationRounds": 2
    },
    "target": "none",
    "scope": "mythic_library_v2",
    "pantheonIds": [
      "japanese"
    ],
    "iconAssetId": "icon.intervention.blessing2_amaterasus_true_dawn",
    "consumesCommanderAction": true
  },
  {
    "id": "blessing2_chalchiuhtlicues_mercy",
    "name": "Chalchiuhtlicue's Mercy",
    "summary": "Extinguish a fire damage-over-time status on one ally and create a 40 HP barrier against fire or water spell damage for 2 rounds. This does not heal dead creatures, absorb physical attacks or change terrain eligibility.",
    "favorCost": 12,
    "requiredGodId": "mesoamerican_chalchiuhtlicue",
    "context": "battle",
    "effect": {
      "type": "library_element_barrier",
      "hp": 40,
      "durationRounds": 2
    },
    "target": "ally_stack",
    "scope": "mythic_library_v2",
    "pantheonIds": [
      "mesoamerican"
    ],
    "iconAssetId": "icon.intervention.blessing2_chalchiuhtlicues_mercy",
    "consumesCommanderAction": true
  },
  {
    "id": "blessing2_athenas_order",
    "name": "Athena's Ordered Ranks",
    "summary": "At battle start or before any allied stack has acted in round 1, swap the positions of up to two allied stacks inside their original deployment zone. All footprints must fit. Machines and summons cannot move. This consumes the commander cast action.",
    "favorCost": 10,
    "requiredGodId": "athena",
    "context": "battle",
    "target": "ally_stack",
    "effect": {
      "type": "library_formation_swap"
    },
    "scope": "mythic_library_v2",
    "pantheonIds": [
      "greek"
    ],
    "iconAssetId": "icon.intervention.blessing2_athenas_order",
    "consumesCommanderAction": true
  },
{
  "id": "blessing2_inari_guest_right",
  "name": "Inari's Guest Right",
  "summary": "Reserve up to one week's current unclaimed stock at a visited neutral dwelling for this hero until the next dawn. Pay nothing now; actual recruitment still requires full gold/resources and army capacity. Other heroes may buy unreserved stock. Invalid on hostile or quest-locked dwellings.",
  "favorCost": 10,
  "requiredGodId": "japanese_inari",
  "context": "adventure",
  "target": "own_hero",
  "scope": "mythic_library_v2",
  "pantheonIds": [
    "japanese"
  ],
  "iconAssetId": "icon.intervention.blessing2_inari_guest_right",
  "effect": {
    "type": "library_guest_right"
  }
},
{
  "id": "blessing2_xolotls_faithful_shadow",
  "name": "Xolotl's Faithful Shadow",
  "summary": "Mark one original living stack for 2 rounds. Its next hostile forced displacement is reversed to a legal adjacent hex chosen by its owner, at most one hex from its pre-hit position. If no destination fits, it stays. Damage still applies. This creates no unit and grants no attack.",
  "favorCost": 12,
  "requiredGodId": "mesoamerican_xolotl",
  "context": "battle",
  "target": "ally_stack",
  "scope": "mythic_library_v2",
  "pantheonIds": [
    "mesoamerican"
  ],
  "iconAssetId": "icon.intervention.blessing2_xolotls_faithful_shadow",
  "consumesCommanderAction": true,
  "effect": {
    "type": "library_battle_status",
    "status": "faithful_shadow",
    "amount": 1,
    "durationRounds": 2
  }
}
];
