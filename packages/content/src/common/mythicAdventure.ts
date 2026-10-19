import type { SpellDefinition } from '@pr/rules';
export const MYTHIC_ADVENTURE_SPELLS: readonly SpellDefinition[] = [
  {
    "id": "spell2_skalds_camp",
    "name": "Skald's Quiet Camp",
    "tier": 1,
    "manaCost": 4,
    "summary": "End this hero's remaining movement now. At next dawn restore 10 mana if the hero has not entered battle since casting; cap at maximum. Once per day; recasting cannot add rewards.",
    "lore": "Original skaldic rest magic; rewards a deliberate pause.",
    "context": "adventure",
    "scope": "mythic_library_v2",
    "access": "sanctum",
    "implementationStatus": "implemented",
    "iconAssetId": "icon.spell.spell2_skalds_camp",
    "pantheonId": "norse",
    "target": "self",
    "effect": {
      "type": "adventure_camp",
      "mana": 10
    }
  },
  {
    "id": "spell2_well_remembering",
    "name": "Well of Remembering",
    "tier": 4,
    "manaCost": 16,
    "summary": "Pay 6 mana to mark the current legal land cell for 2 days. Later pay 10 mana and end all movement to return from at most 6 hexes away on the same connected passable land component. Anchor must remain free and inside the active region; one anchor per hero.",
    "lore": "Otherworld well imagery adapted into a bounded return spell.",
    "context": "adventure",
    "scope": "mythic_library_v2",
    "access": "sanctum",
    "implementationStatus": "implemented",
    "iconAssetId": "icon.spell.spell2_well_remembering",
    "pantheonId": "celtic",
    "target": "self",
    "effect": {
      "type": "adventure_anchor",
      "markCost": 6,
      "returnCost": 10,
      "range": 6,
      "days": 2
    }
  },
  {
    "id": "spell2_ehecatls_boatcall",
    "name": "Ehecatl's Boatcall",
    "tier": 3,
    "manaCost": 12,
    "summary": "Move an existing owned empty ship along a fully explored navigable water path of at most 8 hexes to a free legal adjacent embark point. No passengers, ship creation, enemy passage or teleport across land. Once per hero per day.",
    "lore": "Wind imagery with the classic summon-boat utility role.",
    "context": "adventure",
    "scope": "mythic_library_v2",
    "access": "sanctum",
    "implementationStatus": "implemented",
    "iconAssetId": "icon.spell.spell2_ehecatls_boatcall",
    "pantheonId": "mesoamerican",
    "target": "known_tile",
    "effect": {
      "type": "adventure_boatcall",
      "steps": 8
    }
  },
  {
    "id": "spell2_maizebound_compact",
    "name": "Maizebound Compact",
    "tier": 2,
    "manaCost": 7,
    "summary": "The next neutral recruitment purchase here today costs 15% less gold, capped at 200 gold saved. Stock, other costs, allegiance and army-slot limits are unchanged. One cast/purchase per hero per day.",
    "lore": "Original pact of provisioning; no forced conversion of creatures.",
    "context": "adventure",
    "scope": "mythic_library_v2",
    "access": "sanctum",
    "implementationStatus": "implemented",
    "iconAssetId": "icon.spell.spell2_maizebound_compact",
    "pantheonId": "mesoamerican",
    "target": "known_tile",
    "effect": {
      "type": "adventure_compact",
      "percent": 15,
      "cap": 200
    }
  },
{
  "id": "spell2_crossroads_omen",
  "name": "Crossroads Omen",
  "tier": 2,
  "manaCost": 6,
  "summary": "For one known neutral guard within 6 hexes, reveal disposition and one scouting strength band for 2 days. No exact casualties, hidden army contents or automatic resolution.",
  "lore": "Original divination inspired by Greek omens.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_crossroads_omen",
  "target": "known_tile",
  "effect": {
    "type": "adventure_report",
    "kind": "omen",
    "range": 6,
    "days": 2
  },
  "pantheonId": "greek"
},
{
  "id": "spell2_njords_sounding",
  "name": "Njord's Sounding",
  "tier": 2,
  "manaCost": 6,
  "summary": "For 3 days record legal landing cells beside already explored water within 5 hexes of the hero. This world has no separate current or reef rules. No terrain changes, enemy reveal or access through expedition boundaries.",
  "lore": "Original navigation spell honoring Njord.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_njords_sounding",
  "target": "self",
  "effect": {
    "type": "adventure_report",
    "kind": "sounding",
    "range": 5,
    "days": 3
  },
  "pantheonId": "norse"
},
{
  "id": "spell2_scribes_survey",
  "name": "Scribe's Survey",
  "tier": 2,
  "manaCost": 7,
  "summary": "For 2 days identify resource-site types on already explored tiles within 8 hexes. Reveal no contents, ownership changes or guards beyond normal scouting knowledge.",
  "lore": "Thoth's scribal traditions inspire map annotation.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_scribes_survey",
  "target": "self",
  "effect": {
    "type": "adventure_report",
    "kind": "resources",
    "range": 8,
    "days": 2
  },
  "pantheonId": "egyptian"
},
{
  "id": "spell2_leyline_chart",
  "name": "Leyline Chart",
  "tier": 2,
  "manaCost": 6,
  "summary": "Identify spell-teaching sites on already explored tiles within 8 hexes for 2 days. Reveal no spell contents, guards or hidden terrain; respects scenario concealment flags.",
  "lore": "Original exploration utility, complementary to scouting.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_leyline_chart",
  "target": "self",
  "effect": {
    "type": "adventure_report",
    "kind": "leylines",
    "range": 8,
    "days": 2
  }
},
{
  "id": "spell2_aeolian_tack",
  "name": "Aeolian Tack",
  "tier": 2,
  "manaCost": 8,
  "summary": "For this hero's next 6 sailing steps today, reduce cost by 20%, capped at 120 movement points saved. Once per hero per day; no extra movement on cast.",
  "lore": "Aeolus's winds inspire a bounded naval movement spell.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_aeolian_tack",
  "target": "self",
  "effect": {
    "type": "adventure_travel_buff",
    "discount": {
      "key": "spell2_aeolian_tack",
      "terrain": "sea",
      "mode": "percent",
      "percent": 20,
      "steps": 6,
      "cap": 120
    }
  },
  "pantheonId": "greek"
},
{
  "id": "spell2_silt_to_stone",
  "name": "Silt to Stone",
  "tier": 3,
  "manaCost": 10,
  "summary": "For the next 5 marsh/desert land steps today, remove half the terrain surcharge, capped at 120 movement points saved. Never change water, walls, roads, ownership or guard engagement.",
  "lore": "Original river-land shaping with strictly local travel effects.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_silt_to_stone",
  "target": "self",
  "effect": {
    "type": "adventure_travel_buff",
    "discount": {
      "key": "spell2_silt_to_stone",
      "terrain": "marsh_desert",
      "mode": "surcharge",
      "percent": 50,
      "steps": 5,
      "cap": 120
    }
  },
  "pantheonId": "egyptian"
},
{
  "id": "spell2_lantern_pilgrimage",
  "name": "Lantern Pilgrimage",
  "tier": 2,
  "manaCost": 8,
  "summary": "Choose a visited owned town reachable by an already legal land route. Until next dawn, road steps that reduce path distance to that town cost 20% less, capped at 120 saved points. No teleport; once per day.",
  "lore": "Original pilgrimage magic.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_lantern_pilgrimage",
  "target": "known_tile",
  "effect": {
    "type": "adventure_travel_buff",
    "discount": {
      "key": "spell2_lantern_pilgrimage",
      "terrain": "road",
      "mode": "percent",
      "percent": 20,
      "cap": 120
    },
    "toTown": true
  },
  "pantheonId": "japanese"
},
{
  "id": "spell2_hares_borrowed_path",
  "name": "Hare's Borrowed Path",
  "tier": 2,
  "manaCost": 7,
  "summary": "The next 4 forest land steps today ignore terrain surcharge, capped at 100 saved movement points. No pass through impassable trees, guards, walls or water; once per day.",
  "lore": "Original travel charm using hare folklore.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_hares_borrowed_path",
  "target": "self",
  "effect": {
    "type": "adventure_travel_buff",
    "discount": {
      "key": "spell2_hares_borrowed_path",
      "terrain": "forest",
      "mode": "surcharge",
      "percent": 100,
      "steps": 4,
      "cap": 100
    }
  },
  "pantheonId": "celtic"
},
{
  "id": "spell2_road_mending",
  "name": "Road Mending",
  "tier": 2,
  "manaCost": 8,
  "summary": "For the next 6 road steps today, reduce cost by 20%, capped at 120 movement points saved. Does not create roads or affect water, embark, gates or off-road cells; once per day.",
  "lore": "Original route utility; movement budget remains finite.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_road_mending",
  "target": "self",
  "effect": {
    "type": "adventure_travel_buff",
    "discount": {
      "key": "spell2_road_mending",
      "terrain": "road",
      "mode": "percent",
      "percent": 20,
      "steps": 6,
      "cap": 120
    }
  }
},
{
  "id": "spell2_courier_sigil",
  "name": "Courier Sigil",
  "tier": 4,
  "manaCost": 14,
  "summary": "Send one non-quest backpack artifact from this hero in an owned town to another owned hero in an owned town. Both endpoints must have been visited and be linked by an explored legal land/sea route; takes until next dawn, one parcel per empire at a time. No equipped items, army transfer or same-day use.",
  "lore": "Original logistics spell; prevents instant equipment-swapping exploits.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_courier_sigil",
  "target": "self",
  "effect": {
    "type": "adventure_courier"
  }
}
,
{
  "id": "spell2_foxfire_diversion",
  "name": "Foxfire Diversion",
  "pantheonId": "japanese",
  "tier": 3,
  "manaCost": 10,
  "summary": "Place an uncertain magical signal on a known open land hex within 4 for 2 days. Enemies identify it within 2 hexes. It cannot block movement, fight, or reveal fog; one signal per hero.",
  "lore": "Kitsune lights lure the unwary from their road.",
  "context": "adventure",
  "scope": "mythic_library_v2",
  "access": "sanctum",
  "implementationStatus": "implemented",
  "iconAssetId": "icon.spell.spell2_foxfire_diversion",
  "target": "known_tile",
  "effect": {
    "type": "adventure_decoy",
    "range": 4,
    "days": 2
  }
}
];
