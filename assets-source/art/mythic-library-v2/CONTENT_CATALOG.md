# Complete content catalog — 40 artifacts, 40 spells, 12 blessings

All values are proposals. GLOBAL_RULES.md governs timing, stacking and restrictions.


## Artifacts

### 1. Ariadne's Guiding Spool

ID: relic2_ariadne_spool · greek · icon: icon.artifact.relic2_ariadne_spool

Slot: **misc** · rarity: **major** · indicative value: **5000 gold**.

The first 3 rough-land steps each day ignore the terrain surcharge; base movement cost still applies. Excludes water, mountains and blocked cells.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Ariadne's thread is the mythic motif; this roadfinding power is a game invention.

Implementation hook: terrain_step_quota. FX recipe: relic2_ariadne_spool.

### 2. Aeolus's Windbag

ID: relic2_aeolus_windbag · greek · icon: icon.artifact.relic2_aeolus_windbag

Slot: **misc** · rarity: **major** · indicative value: **5500 gold**.

While sailing, reduce movement costs by 15%, rounded up; no movement is granted on equip. Shares the global sailing discount cap.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Aeolus's bag of winds inspires a limited sailing aid.

Implementation hook: naval_cost_modifier. FX recipe: relic2_aeolus_windbag.

### 3. Lyre of the Unbroken Song

ID: relic2_orpheus_lyre · greek · icon: icon.artifact.relic2_orpheus_lyre

Slot: **weapon** · rarity: **major** · indicative value: **6000 gold**.

+1 Knowledge. Cancel the first mind-tagged hostile debuff that would affect one allied stack each battle; does not block damage or area effects on other stacks.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Orpheus's music inspires protection from enthrallment; the rules are original.

Implementation hook: first_mind_guard. FX recipe: relic2_orpheus_lyre.

### 4. Mantle of the Golden Fleece

ID: relic2_golden_fleece_mantle · greek · icon: icon.artifact.relic2_golden_fleece_mantle

Slot: **armor** · rarity: **relic** · indicative value: **10000 gold**.

At battle start gain a shared army barrier of min(100,30+3*heroLevel) HP. It absorbs damage after mitigation until exhausted; cannot heal or revive.

All heroes may equip; pantheon is lore identity, not an equip restriction.

The Golden Fleece inspires a protective relic, not a claim about its ancient powers.

Implementation hook: army_barrier_pool. FX recipe: relic2_golden_fleece_mantle.

### 5. Hestia's Hearthclasp

ID: relic2_hestia_hearthclasp · greek · icon: icon.artifact.relic2_hestia_hearthclasp

Slot: **neck** · rarity: **minor** · indicative value: **3000 gold**.

Restore 8 extra mana at dawn if this hero spent no movement and entered no battle during the previous day; never exceed maximum mana.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional clasp honoring Hestia's hearth.

Implementation hook: rested_dawn_mana. FX recipe: relic2_hestia_hearthclasp.

### 6. Talos's Bronze Seal

ID: relic2_talos_bronze_seal · greek · icon: icon.artifact.relic2_talos_bronze_seal

Slot: **ring** · rarity: **major** · indicative value: **4500 gold**.

The first ranged physical hit against each allied stack deals 15% less damage. One trigger per original stack each battle; reflected damage never triggers it.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Talos's bronze body inspires this seal; its defense is a game adaptation.

Implementation hook: first_shot_mitigation. FX recipe: relic2_talos_bronze_seal.

### 7. Gleipnir Ribbon

ID: relic2_gleipnir_ribbon · norse · icon: icon.artifact.relic2_gleipnir_ribbon

Slot: **misc** · rarity: **relic** · indicative value: **9000 gold**.

Once per battle, spend the commander cast action to bind one enemy within 6 hexes of an allied stack: no movement on its next activation, but attacks and abilities remain usable. Dispellable.

All heroes may equip; pantheon is lore identity, not an equip restriction.

The delicate fetter Gleipnir inspires a temporary binding.

Implementation hook: artifact_bind. FX recipe: relic2_gleipnir_ribbon.

### 8. Shard-Shield of Svalinn

ID: relic2_svalinn_shield · norse · icon: icon.artifact.relic2_svalinn_shield

Slot: **shield** · rarity: **major** · indicative value: **6500 gold**.

+1 Defense. Army takes 25% less fire-tagged spell damage; shares the elemental-resistance cap and does not resist physical attacks.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Svalinn's shielding of the sun inspires fire protection.

Implementation hook: fire_resistance. FX recipe: relic2_svalinn_shield.

### 9. Cup of Mimir's Counsel

ID: relic2_mimir_cup · norse · icon: icon.artifact.relic2_mimir_cup

Slot: **neck** · rarity: **major** · indicative value: **5500 gold**.

The first 2 battle spells cost 2 less mana, minimum 1. Quota belongs to the hero for the entire battle, not to the equipped instance.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Mimir's wisdom inspires a drinking-vessel pendant; this is not a canonical named relic.

Implementation hook: battle_spell_discount_quota. FX recipe: relic2_mimir_cup.

### 10. Folded Keel of Skidbladnir

ID: relic2_skidbladnir_keel · norse · icon: icon.artifact.relic2_skidbladnir_keel

Slot: **mount** · rarity: **relic** · indicative value: **8500 gold**.

Once per day, boarding an existing owned empty ship costs only one normal land step. It creates no ship and grants no movement; require enough movement for that step.

All heroes may equip; pantheon is lore identity, not an equip restriction.

The folding ship Skidbladnir inspires a compact naval harness.

Implementation hook: first_embark_discount. FX recipe: relic2_skidbladnir_keel.

### 11. Idunn's Apple Clasp

ID: relic2_idunn_apple_clasp · norse · icon: icon.artifact.relic2_idunn_apple_clasp

Slot: **ring** · rarity: **minor** · indicative value: **3500 gold**.

At the end of rounds 1-3, heal 5 HP on the wounded front creature of each living allied stack. No resurrection; no undead or constructs.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Idunn's apples inspire limited restoration.

Implementation hook: early_round_front_heal. FX recipe: relic2_idunn_apple_clasp.

### 12. Skadi's Huntbow

ID: relic2_skadi_huntbow · norse · icon: icon.artifact.relic2_skadi_huntbow

Slot: **weapon** · rarity: **major** · indicative value: **6000 gold**.

Each allied shooter ignores the distance penalty on its first ranged attack of battle. Cover, melee engagement and line-of-sight rules still apply.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional bow honoring Skadi's hunting associations.

Implementation hook: first_shot_range. FX recipe: relic2_skadi_huntbow.

### 13. Tyet of the Shelterer

ID: relic2_isis_tyet · egyptian · icon: icon.artifact.relic2_isis_tyet

Slot: **neck** · rarity: **major** · indicative value: **5000 gold**.

The first single-target hostile spell against the army has its damage reduced by 40%, up to 60 prevented HP. Status components still apply.

All heroes may equip; pantheon is lore identity, not an equip restriction.

The tyet amulet's protective symbolism inspires the effect.

Implementation hook: first_spell_guard. FX recipe: relic2_isis_tyet.

### 14. Sandals of the Opener

ID: relic2_wepwawet_sandals · egyptian · icon: icon.artifact.relic2_wepwawet_sandals

Slot: **feet** · rarity: **minor** · indicative value: **3500 gold**.

Ignore desert movement surcharge on the first 5 desert steps per day; never ignore base cost, guards or scenario boundaries.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional pair honoring Wepwawet as an opener of ways.

Implementation hook: desert_step_quota. FX recipe: relic2_wepwawet_sandals.

### 15. Thoth's Ibis Inkwell

ID: relic2_thoth_inkwell · egyptian · icon: icon.artifact.relic2_thoth_inkwell

Slot: **misc** · rarity: **major** · indicative value: **4500 gold**.

The first 2 adventure spells each day cost 2 less mana, minimum 1. Cannot discount Favor costs or reset on transfer.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Thoth's scribal imagery inspires a limited spell-cost tool.

Implementation hook: adventure_spell_discount_quota. FX recipe: relic2_thoth_inkwell.

### 16. Sistrum of Clear Hearts

ID: relic2_hathor_sistrum · egyptian · icon: icon.artifact.relic2_hathor_sistrum

Slot: **weapon** · rarity: **major** · indicative value: **5000 gold**.

Suppress the first negative-morale proc of each eligible allied stack per battle. No extra action, and morale-immune creatures receive no benefit.

All heroes may equip; pantheon is lore identity, not an equip restriction.

The sistrum and Hathor inspire a morale safeguard.

Implementation hook: first_negative_morale_guard. FX recipe: relic2_hathor_sistrum.

### 17. Canopic Seal of Anubis

ID: relic2_anubis_canopic_seal · egyptian · icon: icon.artifact.relic2_anubis_canopic_seal

Slot: **ring** · rarity: **major** · indicative value: **6000 gold**.

After victory recover 5% of eligible living losses, floored; only if at least one creature of that original stack survived. Shares the existing recovery cap; no summoned units.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional seal using funerary protection imagery.

Implementation hook: survivor_recovery. FX recipe: relic2_anubis_canopic_seal.

### 18. Starweave of Nut

ID: relic2_nut_starweave · egyptian · icon: icon.artifact.relic2_nut_starweave

Slot: **cape** · rarity: **major** · indicative value: **6500 gold**.

Once per battle, after spending at least 10 actual mana on a spell, regain 3 mana. Cannot exceed maximum or trigger from refunds, free casts or itself.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Nut's starry sky inspires a limited mana return.

Implementation hook: single_mana_rebate. FX recipe: relic2_nut_starweave.

### 19. Hoori's Ebbing Pearl

ID: relic2_hoori_tide_pearl · japanese · icon: icon.artifact.relic2_hoori_tide_pearl

Slot: **ring** · rarity: **major** · indicative value: **5500 gold**.

When sailing, ignore the first 2 adverse-current movement surcharges per day. If currents are absent, grant 10% sailing-cost reduction instead; never both.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Hoori's tide jewels inspire controlled navigation, not terrain flooding.

Implementation hook: current_surcharge_guard. FX recipe: relic2_hoori_tide_pearl.

### 20. Bells of the Dawn Dancer

ID: relic2_uzume_bells · japanese · icon: icon.artifact.relic2_uzume_bells

Slot: **neck** · rarity: **major** · indicative value: **4500 gold**.

Once per battle, the first successful friendly cleanse also grants its target +1 Speed until the end of its next activation. Does not trigger without removing a debuff.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Uzume's dance before the sun's cave inspires renewal of motion.

Implementation hook: cleanse_speed_followup. FX recipe: relic2_uzume_bells.

### 21. Inari's Rice-Key

ID: relic2_inari_rice_key · japanese · icon: icon.artifact.relic2_inari_rice_key

Slot: **misc** · rarity: **minor** · indicative value: **3000 gold**.

In a town this hero visits, the first tier1-2 recruitment purchase each day costs 10% less gold, capped at 150 gold saved empire-wide. Other resources unchanged.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional granary key honoring Inari's rice associations.

Implementation hook: daily_recruit_discount. FX recipe: relic2_inari_rice_key.

### 22. Centipede-Breaker Arrow

ID: relic2_hidesato_centipede_arrow · japanese · icon: icon.artifact.relic2_hidesato_centipede_arrow

Slot: **weapon** · rarity: **major** · indicative value: **6500 gold**.

Allied ranged attacks against two-hex enemy creatures deal 10% more physical damage. Does not affect war machines, spells or one-hex targets.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Inspired by the giant-centipede tale of Tawara Toda; the bonus is an adaptation.

Implementation hook: large_target_ranged. FX recipe: relic2_hidesato_centipede_arrow.

### 23. Cord of the Returning Shore

ID: relic2_yomi_return_cord · japanese · icon: icon.artifact.relic2_yomi_return_cord

Slot: **cape** · rarity: **major** · indicative value: **6000 gold**.

The first forced displacement against each allied stack per battle is prevented. Damage and other debuffs still apply; voluntary moves are unaffected.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional boundary cord inspired by separation of living and dead worlds.

Implementation hook: displacement_guard. FX recipe: relic2_yomi_return_cord.

### 24. Thunder-Sword Guard

ID: relic2_takemikazuchi_guard · japanese · icon: icon.artifact.relic2_takemikazuchi_guard

Slot: **shield** · rarity: **major** · indicative value: **5500 gold**.

The first retaliation by each allied melee stack deals 15% more physical damage. It grants no extra retaliation and does not trigger from ranged counterfire.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional sword-guard relic inspired by Takemikazuchi.

Implementation hook: first_retaliation_bonus. FX recipe: relic2_takemikazuchi_guard.

### 25. Nuada's Silver Bracer

ID: relic2_nuada_silver_bracer · celtic · icon: icon.artifact.relic2_nuada_silver_bracer

Slot: **shield** · rarity: **major** · indicative value: **6000 gold**.

Once per battle, commander action: remove one attack or defense debuff from an allied stack and grant +2 Defense through its next activation. No heal or extra attack.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Nuada's silver hand inspires restoration of fighting ability.

Implementation hook: artifact_restore_guard. FX recipe: relic2_nuada_silver_bracer.

### 26. Brooch of Bran's Voyage

ID: relic2_brans_voyage_brooch · celtic · icon: icon.artifact.relic2_brans_voyage_brooch

Slot: **neck** · rarity: **minor** · indicative value: **4000 gold**.

After the first legal disembark each day, the hero ignores rough-terrain surcharge for its next 2 land steps. No extra movement is granted.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Otherworld voyage traditions inspire a shorefinding brooch.

Implementation hook: landing_step_quota. FX recipe: relic2_brans_voyage_brooch.

### 27. Needle of the Wellspring

ID: relic2_dian_cecht_needle · celtic · icon: icon.artifact.relic2_dian_cecht_needle

Slot: **misc** · rarity: **major** · indicative value: **5500 gold**.

Front-creature healing from the hero's spells increases by 20%, capped at 20 extra HP per target per cast. No resurrection or effect on casualty recovery.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional healer's needle inspired by Dian Cecht traditions.

Implementation hook: front_heal_amplifier. FX recipe: relic2_dian_cecht_needle.

### 28. Rhiannon's Patient Bridle

ID: relic2_rhiannon_bridle · celtic · icon: icon.artifact.relic2_rhiannon_bridle

Slot: **mount** · rarity: **major** · indicative value: **5000 gold**.

After leaving an owned town, halve the terrain surcharge on the next 3 forest or marsh steps that day, capped at 100 movement points saved. Base cost remains; returning to town or transferring the bridle cannot reset the quota.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Rhiannon's elusive horse inspires patient, effortless travel; the item and rules are original game fiction.

Implementation hook: town_departure_terrain_discount. FX recipe: relic2_rhiannon_bridle.

### 29. Salmon-Wisdom Pin

ID: relic2_salmon_wisdom_pin · celtic · icon: icon.artifact.relic2_salmon_wisdom_pin

Slot: **head** · rarity: **minor** · indicative value: **3500 gold**.

Learning an unknown spell restores 5 mana, at most once per day. Scroll consumption and relearning a known spell do not trigger it.

All heroes may equip; pantheon is lore identity, not an equip restriction.

The salmon-of-knowledge motif inspires a scholar's pin.

Implementation hook: new_spell_mana. FX recipe: relic2_salmon_wisdom_pin.

### 30. Crowcloak of the Last Watch

ID: relic2_morrigan_crowcloak · celtic · icon: icon.artifact.relic2_morrigan_crowcloak

Slot: **cape** · rarity: **relic** · indicative value: **8500 gold**.

Living allied stacks below 25% of their original creature count gain +3 Defense. Recalculate continuously; no bonus from splitting before battle into artificial fragments.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional war-cloak inspired by Morrigan's crow imagery.

Implementation hook: last_stand_defense. FX recipe: relic2_morrigan_crowcloak.

### 31. Ehecatl's Wind-Jewel

ID: relic2_ehecatl_conch · mesoamerican · icon: icon.artifact.relic2_ehecatl_conch

Slot: **neck** · rarity: **major** · indicative value: **5000 gold**.

Allied flying creatures gain +1 movement hex on their first activation. Does not increase initiative or allow illegal landing.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Ehecatl's cut-conch pectoral inspires a wind blessing.

Implementation hook: first_flight_step. FX recipe: relic2_ehecatl_conch.

### 32. Xiuhcoatl Firebrand

ID: relic2_xiuhcoatl_firebrand · mesoamerican · icon: icon.artifact.relic2_xiuhcoatl_firebrand

Slot: **weapon** · rarity: **major** · indicative value: **6500 gold**.

The hero's first direct fire spell each battle deals 20% more damage, capped at 50 extra HP. Area and mass spells are excluded.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Xiuhcoatl fire-serpent imagery inspires the weapon, without copying museum art.

Implementation hook: first_fire_spell_bonus. FX recipe: relic2_xiuhcoatl_firebrand.

### 33. Xolotl's Guide-Mask

ID: relic2_xolotl_guide_mask · mesoamerican · icon: icon.artifact.relic2_xolotl_guide_mask

Slot: **head** · rarity: **major** · indicative value: **5000 gold**.

Reveal legal embark and disembark points within 4 hexes of the hero on already explored coast. Does not reveal hidden enemies or make new landings.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional mask inspired by Xolotl's guiding role.

Implementation hook: coastal_access_overlay. FX recipe: relic2_xolotl_guide_mask.

### 34. Jade-Hemmed Mantle

ID: relic2_chalchiuhtlicue_hem · mesoamerican · icon: icon.artifact.relic2_chalchiuhtlicue_hem

Slot: **armor** · rarity: **major** · indicative value: **5500 gold**.

Army takes 20% less water-tagged spell damage. Front-creature healing from water-tagged spells on this army gains 10%, capped at 10 HP per target.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Chalchiuhtlicue's jade-skirt imagery inspires protective apparel.

Implementation hook: water_resist_heal. FX recipe: relic2_chalchiuhtlicue_hem.

### 35. Ring of the Returning Maize

ID: relic2_quetzal_seed_ring · mesoamerican · icon: icon.artifact.relic2_quetzal_seed_ring

Slot: **ring** · rarity: **minor** · indicative value: **4000 gold**.

At weekly rollover, one owned town visited by this hero during the prior week gains 2 tier1 recruits. Select town before rollover; requires its dwelling. One ring benefit per empire.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional ring combining maize renewal and feathered-serpent motifs.

Implementation hook: weekly_tier_one_seed. FX recipe: relic2_quetzal_seed_ring.

### 36. Lantern of Nine Crossings

ID: relic2_mictlan_guide_lantern · mesoamerican · icon: icon.artifact.relic2_mictlan_guide_lantern

Slot: **misc** · rarity: **major** · indicative value: **6000 gold**.

At battle start mark the strongest enemy undead stack by total HP. Friendly physical attacks against it deal 10% more damage; marker ends when it dies. No retarget.

All heroes may equip; pantheon is lore identity, not an equip restriction.

A fictional funerary lantern inspired by Mictlan journeys.

Implementation hook: marked_undead_target. FX recipe: relic2_mictlan_guide_lantern.

### 37. Surveyor's Broken Astrolabe

ID: relic2_surveyors_astrolabe · general · icon: icon.artifact.relic2_surveyors_astrolabe

Slot: **misc** · rarity: **minor** · indicative value: **3500 gold**.

The first neutral site visited each day permanently reveals adjacent terrain one hex farther than normal. No extra enemy army-detail reveal.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Original Confluence relic, with no asserted historical origin.

Implementation hook: site_reveal_bonus. FX recipe: relic2_surveyors_astrolabe.

### 38. Runebreaker Gauntlet

ID: relic2_runebreaker_gauntlet · general · icon: icon.artifact.relic2_runebreaker_gauntlet

Slot: **shield** · rarity: **relic** · indicative value: **9000 gold**.

Once per battle, commander action: remove one dispellable positive spell from one visible enemy stack. Cannot remove creature traits, blessings or artifacts.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Original relic; inspired by classic strategy-game disenchantment roles.

Implementation hook: artifact_dispel. FX recipe: relic2_runebreaker_gauntlet.

### 39. Pilgrim's Mileboots

ID: relic2_pilgrim_mileboots · general · icon: icon.artifact.relic2_pilgrim_mileboots

Slot: **feet** · rarity: **minor** · indicative value: **3000 gold**.

On roads only, reduce movement costs by 10%, with at most 100 points saved per day. No effect on embark, teleport, sea or off-road travel.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Original road relic for logistics-focused heroes.

Implementation hook: road_discount_quota. FX recipe: relic2_pilgrim_mileboots.

### 40. Hourglass of the Last Ember

ID: relic2_hourglass_reserve · general · icon: icon.artifact.relic2_hourglass_reserve

Slot: **misc** · rarity: **relic** · indicative value: **10000 gold**.

Once per battle, when mana would fall below 3 after paying a spell cost, restore 4 mana. The cast must have been affordable before payment. No second trigger.

All heroes may equip; pantheon is lore identity, not an equip restriction.

Original relic emphasizing mana timing rather than free extra turns.

Implementation hook: low_mana_reserve. FX recipe: relic2_hourglass_reserve.


## Spells

### 1. Daedalus's Passage

ID: spell2_daedalus_passage · greek · icon: icon.spell.spell2_daedalus_passage

**battle** · tier 4 · **16 mana** · target: ally_stack.

One allied ground stack gains flight for its next activation. It must end on a legal ground/deck footprint within its normal movement range; never end over water or inside a wall.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Daedalus's flight motif; duration and restrictions are game rules.

Implementation hook: temporary_flight. FX recipe: spell2_daedalus_passage.

### 2. Siren's Refrain

ID: spell2_siren_refrain · greek · icon: icon.spell.spell2_siren_refrain

**battle** · tier 2 · **8 mana** · target: enemy_stack.

A mind-susceptible enemy shooter cannot use ranged attacks on its next activation. It may move, melee or use an otherwise legal ability. Dispel removes this effect.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

The Sirens' song inspires distraction; inspired mechanically by ranged denial.

Implementation hook: ranged_lock. FX recipe: spell2_siren_refrain.

### 3. Oathbound Spear

ID: spell2_oathbound_spear · greek · icon: icon.spell.spell2_oathbound_spear

**battle** · tier 3 · **12 mana** · target: enemy_stack.

The target's next 2 retaliations deal 35% less physical damage, expiring after 2 rounds. Its normal attacks are unaffected.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original oath-magic drawing on Greek sworn obligations.

Implementation hook: retaliation_weaken. FX recipe: spell2_oathbound_spear.

### 4. Crossroads Omen

ID: spell2_crossroads_omen · greek · icon: icon.spell.spell2_crossroads_omen

**adventure** · tier 2 · **6 mana** · target: known_neutral_guard.

For one known neutral guard within 6 hexes, reveal disposition and one scouting strength band for 2 days. No exact casualties, hidden army contents or automatic resolution.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original divination inspired by Greek omens.

Implementation hook: guard_intel. FX recipe: spell2_crossroads_omen.

### 5. Aeolian Tack

ID: spell2_aeolian_tack · greek · icon: icon.spell.spell2_aeolian_tack

**adventure** · tier 2 · **8 mana** · target: self_ship.

For this hero's next 6 sailing steps today, reduce cost by 20%, capped at 120 movement points saved. Once per hero per day; no extra movement on cast.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Aeolus's winds inspire a bounded naval movement spell.

Implementation hook: sea_step_discount. FX recipe: spell2_aeolian_tack.

### 6. Frost-Rune Threshold

ID: spell2_frost_threshold · norse · icon: icon.spell.spell2_frost_threshold

**battle** · tier 3 · **11 mana** · target: three_empty_adjacent_hexes.

Mark up to 3 connected legal land/deck hexes for 2 rounds. First enemy entering each hex takes 12+3*Power cold damage and spends 1 additional movement point. Each hex triggers once; flyers passing overhead do not trigger.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original rune trap using Norse frost imagery.

Implementation hook: rune_traps. FX recipe: spell2_frost_threshold.

### 7. Ravens' Exchange

ID: spell2_ravens_exchange · norse · icon: icon.spell.spell2_ravens_exchange

**battle** · tier 4 · **15 mana** · target: two_ally_stacks.

Swap two allied stacks whose anchors are at most 3 hexes apart. Their footprints must both fit at the destinations and retain legal terrain. No swap involving war machines, immobilized stacks or illusions.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original spell inspired by paired ravens and counsel.

Implementation hook: ally_swap. FX recipe: spell2_ravens_exchange.

### 8. Runes of Refusal

ID: spell2_runes_refusal · norse · icon: icon.spell.spell2_runes_refusal

**battle** · tier 3 · **10 mana** · target: ally_stack.

For 2 rounds, block the next dispellable hostile debuff on this ally. Damage still applies. An area spell still affects its other targets; the ward is then consumed.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original protective runes; one-charge ward mechanics.

Implementation hook: single_debuff_ward. FX recipe: spell2_runes_refusal.

### 9. Njord's Sounding

ID: spell2_njords_sounding · norse · icon: icon.spell.spell2_njords_sounding

**adventure** · tier 2 · **6 mana** · target: self_ship.

For 3 days show reefs, currents and legal landing cells on already explored water within 5 hexes of the hero. No terrain changes, enemy reveal or access through expedition boundaries.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original navigation spell honoring Njord.

Implementation hook: nautical_intel. FX recipe: spell2_njords_sounding.

### 10. Skald's Quiet Camp

ID: spell2_skalds_camp · norse · icon: icon.spell.spell2_skalds_camp

**adventure** · tier 1 · **4 mana** · target: self.

End this hero's remaining movement now. At next dawn restore 10 mana if the hero has not entered battle since casting; cap at maximum. Once per day; recasting cannot add rewards.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original skaldic rest magic; rewards a deliberate pause.

Implementation hook: rest_mana_contract. FX recipe: spell2_skalds_camp.

### 11. Feather's Verdict

ID: spell2_feathers_verdict · egyptian · icon: icon.spell.spell2_feathers_verdict

**battle** · tier 2 · **8 mana** · target: enemy_stack.

For the target's next activation, prevent positive-luck critical damage and negate up to 3 positive Attack from spell buffs. Base stats, artifact stats and ordinary damage remain.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Ma'at's weighing imagery inspires measured suppression.

Implementation hook: bounded_buff_suppression. FX recipe: spell2_feathers_verdict.

### 12. Door of the Duat

ID: spell2_door_duat · egyptian · icon: icon.spell.spell2_door_duat

**battle** · tier 5 · **24 mana** · target: friendly_dead_or_wounded_living_stack.

Temporarily restore up to 35+7*Power lost HP to one original living stack, capped at its battle-start count. Restored creatures vanish at end of round cast+1; no permanent recovery, XP or on-death rewards. A wholly dead stack needs its original free legal footprint.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Duat imagery; temporary return rather than permanent resurrection.

Implementation hook: temporary_return. FX recipe: spell2_door_duat.

### 13. Sand of Silence

ID: spell2_sand_silence · egyptian · icon: icon.spell.spell2_sand_silence

**battle** · tier 3 · **11 mana** · target: enemy_stack.

Disable the target creature's active spellcasting for its next activation. Movement, physical attacks and non-spell abilities remain. Does not silence its hero; spell-tagged abilities must be explicit in data.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original temple silence magic.

Implementation hook: creature_spell_lock. FX recipe: spell2_sand_silence.

### 14. Scribe's Survey

ID: spell2_scribes_survey · egyptian · icon: icon.spell.spell2_scribes_survey

**adventure** · tier 2 · **7 mana** · target: self.

For 2 days identify resource-site types on already explored tiles within 8 hexes. Reveal no contents, ownership changes or guards beyond normal scouting knowledge.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Thoth's scribal traditions inspire map annotation.

Implementation hook: resource_site_intel. FX recipe: spell2_scribes_survey.

### 15. Silt to Stone

ID: spell2_silt_to_stone · egyptian · icon: icon.spell.spell2_silt_to_stone

**adventure** · tier 3 · **10 mana** · target: self.

For the next 5 marsh/desert land steps today, remove half the terrain surcharge, capped at 120 movement points saved. Never change water, walls, roads, ownership or guard engagement.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original river-land shaping with strictly local travel effects.

Implementation hook: rough_step_discount. FX recipe: spell2_silt_to_stone.

### 16. Tide-Pearl Turn

ID: spell2_tide_pearl_turn · japanese · icon: icon.spell.spell2_tide_pearl_turn

**battle** · tier 2 · **9 mana** · target: enemy_stack_and_direction.

Push one enemy stack exactly 1 hex in a chosen direction. Destination must fit and be legal for that creature; blocked displacement is an invalid cast, not damage. No war machines, anchoring or illegal deck-to-water moves.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Hoori's tide jewels inspire displacement.

Implementation hook: legal_push. FX recipe: spell2_tide_pearl_turn.

### 17. Paper Crane Ward

ID: spell2_paper_crane_ward · japanese · icon: icon.spell.spell2_paper_crane_ward

**battle** · tier 2 · **8 mana** · target: ally_stack.

Within 2 rounds, reduce the next projectile-tagged spell damage to this ally by 50%, capped at 50 HP prevented. No effect on melee, area ground effects or ordinary arrows.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original paper charm; not a canonical named mythic spell.

Implementation hook: projectile_spell_guard. FX recipe: spell2_paper_crane_ward.

### 18. Uzume's Dawn

ID: spell2_uzumes_dawn · japanese · icon: icon.spell.spell2_uzumes_dawn

**battle** · tier 3 · **13 mana** · target: friendly_army.

Remove fear, blind and ranged-lock spell statuses from living allies. Does not remove slows, poison, base traits or other debuffs. No bonus if none are present.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Uzume's dance inspiring release from darkness.

Implementation hook: group_mind_cleanse. FX recipe: spell2_uzumes_dawn.

### 19. Lantern Pilgrimage

ID: spell2_lantern_pilgrimage · japanese · icon: icon.spell.spell2_lantern_pilgrimage

**adventure** · tier 2 · **8 mana** · target: visited_owned_town.

Choose a visited owned town reachable by an already legal land route. Until next dawn, road steps that reduce path distance to that town cost 20% less, capped at 120 saved points. No teleport; once per day.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original pilgrimage magic.

Implementation hook: homebound_road_discount. FX recipe: spell2_lantern_pilgrimage.

### 20. Foxfire Diversion

ID: spell2_foxfire_diversion · japanese · icon: icon.spell.spell2_foxfire_diversion

**adventure** · tier 3 · **10 mana** · target: known_empty_land_tile.

Place a visible uncertain magical signal within 4 hexes for 2 days. Enemies identify it as a decoy when within 2 hexes. It grants no blocking, scouting or attacks; AI may investigate only within a bounded detour budget.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Foxfire folklore inspires deception; it is not a fake attack-capable hero.

Implementation hook: strategic_decoy. FX recipe: spell2_foxfire_diversion.

### 21. Rowan Sanctuary

ID: spell2_rowan_sanctuary · celtic · icon: icon.spell.spell2_rowan_sanctuary

**battle** · tier 3 · **12 mana** · target: three_empty_adjacent_hexes.

For 2 rounds create a zone on up to 3 connected land/deck hexes. Friendly occupants take 20% less ranged physical damage. No movement block, healing or protection outside the marked cells.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Rowan protective folklore inspires a small defensible zone.

Implementation hook: protective_zone. FX recipe: spell2_rowan_sanctuary.

### 22. Hazel's Recall

ID: spell2_hazels_recall · celtic · icon: icon.spell.spell2_hazels_recall

**battle** · tier 2 · **7 mana** · target: ally_shooter.

Restore up to 2 spent ammunition charges to one allied shooter, never above its battle-start capacity. Once per original stack per battle; ineligible for unlimited-ammo stacks and siege machines.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original recall magic with a woodland motif.

Implementation hook: restore_shots. FX recipe: spell2_hazels_recall.

### 23. Briar Debt

ID: spell2_briar_debt · celtic · icon: icon.spell.spell2_briar_debt

**battle** · tier 3 · **10 mana** · target: ally_stack.

For 2 rounds, the next enemy melee hit on this ally triggers 18+3*Power nature damage against the attacker. One trigger, no chain reactions and no trigger from reflected damage.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original thorn reprisal spell.

Implementation hook: one_hit_thorns. FX recipe: spell2_briar_debt.

### 24. Hare's Borrowed Path

ID: spell2_hares_borrowed_path · celtic · icon: icon.spell.spell2_hares_borrowed_path

**adventure** · tier 2 · **7 mana** · target: self.

The next 4 forest land steps today ignore terrain surcharge, capped at 100 saved movement points. No pass through impassable trees, guards, walls or water; once per day.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original travel charm using hare folklore.

Implementation hook: forest_step_discount. FX recipe: spell2_hares_borrowed_path.

### 25. Well of Remembering

ID: spell2_well_remembering · celtic · icon: icon.spell.spell2_well_remembering

**adventure** · tier 4 · **16 mana** · target: self_then_saved_anchor.

Pay 6 mana to mark the current legal land cell for 2 days. Later pay 10 mana and end all movement to return from at most 6 hexes away on the same connected passable land component. Anchor must remain free and inside the active region; one anchor per hero.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Otherworld well imagery adapted into a bounded return spell.

Implementation hook: short_return_anchor. FX recipe: spell2_well_remembering.

### 26. Obsidian Eclipse

ID: spell2_obsidian_eclipse · mesoamerican · icon: icon.spell.spell2_obsidian_eclipse

**battle** · tier 4 · **16 mana** · target: known_hex.

For 2 rounds, radius-1 cells impose 25% less outgoing ranged physical damage on ALL occupants, friend or foe. No miss chance, no hero spell suppression and no line-of-sight changes.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original eclipse spell using Mesoamerican sky imagery.

Implementation hook: symmetric_ranged_zone. FX recipe: spell2_obsidian_eclipse.

### 27. Feathered Serpent's Breath

ID: spell2_serpents_breath · mesoamerican · icon: icon.spell.spell2_serpents_breath

**battle** · tier 3 · **12 mana** · target: three_hex_line.

Deal 18+5*Power wind damage to every stack touched by a straight line of 3 legal battlefield hexes. Friendly fire applies; each multi-hex stack is hit once. Preview all affected stacks before casting.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Feathered-serpent imagery; line geometry is a game mechanic.

Implementation hook: line_damage. FX recipe: spell2_serpents_breath.

### 28. Xolotl's Pale Twin

ID: spell2_xolotls_twin · mesoamerican · icon: icon.spell.spell2_xolotls_twin

**battle** · tier 5 · **24 mana** · target: ally_stack_and_empty_hex.

Create one illusory copy of an allied living non-summoned stack on a free adjacent legal footprint for 2 rounds. Copy has one hit point, deals 25% of source physical damage, cannot retaliate or use abilities; any positive damage destroys it. One illusion per army, never persistent.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Xolotl's twin associations inspire a bounded illusion.

Implementation hook: fragile_illusion. FX recipe: spell2_xolotls_twin.

### 29. Ehecatl's Boatcall

ID: spell2_ehecatls_boatcall · mesoamerican · icon: icon.spell.spell2_ehecatls_boatcall

**adventure** · tier 3 · **12 mana** · target: owned_empty_ship.

Move an existing owned empty ship along a fully explored navigable water path of at most 8 hexes to a free legal adjacent embark point. No passengers, ship creation, enemy passage or teleport across land. Once per hero per day.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Wind imagery with the classic summon-boat utility role.

Implementation hook: summon_existing_boat. FX recipe: spell2_ehecatls_boatcall.

### 30. Maizebound Compact

ID: spell2_maizebound_compact · mesoamerican · icon: icon.spell.spell2_maizebound_compact

**adventure** · tier 2 · **7 mana** · target: adjacent_neutral_dwelling.

The next neutral recruitment purchase here today costs 15% less gold, capped at 200 gold saved. Stock, other costs, allegiance and army-slot limits are unchanged. One cast/purchase per hero per day.

Native pantheon Sanctum; cross-pantheon learning only through explicit rare scroll rewards.

Original pact of provisioning; no forced conversion of creatures.

Implementation hook: neutral_purchase_discount. FX recipe: spell2_maizebound_compact.

### 31. Aether Step

ID: spell2_aether_step · general · icon: icon.spell.spell2_aether_step

**battle** · tier 3 · **13 mana** · target: ally_stack_and_empty_hex.

Teleport one allied non-machine stack up to 4 hexes to a free visible legal footprint. Cannot cross a closed siege wall or sealed scenario barrier; rooted stacks are ineligible. No extra activation.

Shared Sanctum pool.

Classic tactical repositioning adapted to legal terrain and siege limits.

Implementation hook: short_battle_teleport. FX recipe: spell2_aether_step.

### 32. Unweave

ID: spell2_unweave · general · icon: icon.spell.spell2_unweave

**battle** · tier 2 · **8 mana** · target: enemy_stack.

Remove one chosen dispellable positive spell status from a visible enemy. No effect on creature traits, artifacts, Favor blessings or scenario protections.

Shared Sanctum pool.

Classic disenchantment role with explicit eligible statuses.

Implementation hook: targeted_positive_dispel. FX recipe: spell2_unweave.

### 33. Clear Mind

ID: spell2_clear_mind · general · icon: icon.spell.spell2_clear_mind

**battle** · tier 2 · **7 mana** · target: ally_stack.

Remove one chosen dispellable negative spell status from an ally. No healing or removal of permanent traits, artifact drawbacks, terrain rules or scenario penalties.

Shared Sanctum pool.

Classic cleansing role; rules distinguish statuses from permanent effects.

Implementation hook: targeted_negative_dispel. FX recipe: spell2_clear_mind.

### 34. Cinder Siphon

ID: spell2_cinder_siphon · general · icon: icon.spell.spell2_cinder_siphon

**battle** · tier 3 · **12 mana** · target: enemy_commander.

Drain min(8,3+floor(Power/3)) current enemy hero mana, never below zero. Caster gains nothing. Once per side per battle; invalid if no mana-bearing enemy hero or zero mana.

Shared Sanctum pool.

Original mana-pressure spell inspired by resource-denial mechanics.

Implementation hook: bounded_enemy_mana_drain. FX recipe: spell2_cinder_siphon.

### 35. Glass Bulwark

ID: spell2_glass_bulwark · general · icon: icon.spell.spell2_glass_bulwark

**battle** · tier 4 · **16 mana** · target: two_empty_adjacent_hexes.

Create 2 adjacent blocking crystal hexes until end of next round. Walkers cannot enter; flyers may pass over, not land. No projectile cover. Reject placement that disconnects a currently reachable opposing ground pair or seals the sole deck bridge.

Shared Sanctum pool.

Classic force-field role with anti-softlock placement validation.

Implementation hook: temporary_obstacle. FX recipe: spell2_glass_bulwark.

### 36. Spellground

ID: spell2_spellground · general · icon: icon.spell.spell2_spellground

**battle** · tier 3 · **10 mana** · target: enemy_summoned_stack.

Deal 30+6*Power arcane damage to one summoned creature stack, or immediately dismiss one fragile illusion. Invalid on naturally recruited stacks, resurrected original troops or war machines.

Shared Sanctum pool.

Classic anti-summoning role, deliberately restricted.

Implementation hook: summon_banish. FX recipe: spell2_spellground.

### 37. Second Guard

ID: spell2_second_guard · general · icon: icon.spell.spell2_second_guard

**battle** · tier 2 · **8 mana** · target: ally_stack.

Restore one spent normal retaliation charge to an allied stack, capped at its normal per-round maximum. It must already have spent a charge this round; no extra turn and no benefit to unlimited-retaliation stacks.

Shared Sanctum pool.

Original tactical reserve inspired by limited-action resource play.

Implementation hook: retaliation_restore. FX recipe: spell2_second_guard.

### 38. Leyline Chart

ID: spell2_leyline_chart · general · icon: icon.spell.spell2_leyline_chart

**adventure** · tier 2 · **6 mana** · target: self.

Identify spell-teaching sites on already explored tiles within 8 hexes for 2 days. Reveal no spell contents, guards or hidden terrain; respects scenario concealment flags.

Shared Sanctum pool.

Original exploration utility, complementary to scouting.

Implementation hook: spell_site_intel. FX recipe: spell2_leyline_chart.

### 39. Road Mending

ID: spell2_road_mending · general · icon: icon.spell.spell2_road_mending

**adventure** · tier 2 · **8 mana** · target: self.

For the next 6 road steps today, reduce cost by 20%, capped at 120 movement points saved. Does not create roads or affect water, embark, gates or off-road cells; once per day.

Shared Sanctum pool.

Original route utility; movement budget remains finite.

Implementation hook: road_step_discount. FX recipe: spell2_road_mending.

### 40. Courier Sigil

ID: spell2_courier_sigil · general · icon: icon.spell.spell2_courier_sigil

**adventure** · tier 4 · **14 mana** · target: owned_hero_in_owned_town.

Send one non-quest backpack artifact from this hero in an owned town to another owned hero in an owned town. Both endpoints must have been visited and be linked by an explored legal land/sea route; takes until next dawn, one parcel per empire at a time. No equipped items, army transfer or same-day use.

Shared Sanctum pool.

Original logistics spell; prevents instant equipment-swapping exploits.

Implementation hook: delayed_artifact_delivery. FX recipe: spell2_courier_sigil.


## Blessings

### 1. Athena's Ordered Ranks

ID: blessing2_athenas_order · greek · icon: icon.intervention.blessing2_athenas_order

**battle** · **10 Favor** · god: athena · target: allied_army.

At battle start or before any allied stack has acted in round 1, swap the positions of up to two allied stacks inside their original deployment zone. All footprints must fit. Machines and summons cannot move. This consumes the commander cast action.

One use per battle; no use after the first allied activation.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: formation_swap. FX recipe: blessing2_athenas_order.

### 2. Poseidon's Mooring

ID: blessing2_poseidons_mooring · greek · icon: icon.intervention.blessing2_poseidons_mooring

**adventure** · **12 Favor** · god: poseidon · target: owned_ship_with_hero.

For the next naval battle begun by this ship before the next dawn, prevent the first forced displacement against each original allied stack. Damage and other status effects still apply. The ship must already exist and carry the invoking hero.

One blessing per ship; 3-day hero cooldown; expires at dawn or after that battle.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: naval_anchor_ward. FX recipe: blessing2_poseidons_mooring.

### 3. Tyr's Equal Ground

ID: blessing2_tyrs_equal_ground · norse · icon: icon.intervention.blessing2_tyrs_equal_ground

**battle** · **12 Favor** · god: norse_tyr · target: allied_stack.

One allied stack's next normal melee strike ignores up to 6 points of the target's Defense supplied by its commander and positive temporary spell modifiers, never the creature's base Defense, artifact bonuses or cover. Expires after 2 rounds; does not grant an extra strike.

Once per battle; subject to status cleansing.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: temporary_defense_pierce. FX recipe: blessing2_tyrs_equal_ground.

### 4. Frigg's Watched Return

ID: blessing2_friggs_watched_return · norse · icon: icon.intervention.blessing2_friggs_watched_return

**battle** · **18 Favor** · god: norse_frigg · target: allied_living_stack.

For 2 rounds, the first physical hit that would completely destroy this original living stack instead leaves its final creature at 1 HP. The protection then ends. It cannot restore already lost creatures or prevent spell damage. Cannot target summons, illusions, undead or machines.

Once per battle; army may carry only one last-creature guard at a time.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: last_creature_guard. FX recipe: blessing2_friggs_watched_return.

### 5. Thoth's Reckoning

ID: blessing2_thoths_reckoning · egyptian · icon: icon.intervention.blessing2_thoths_reckoning

**battle** · **8 Favor** · god: egyptian_thoth · target: self_commander.

The next ordinary battle spell cast within 2 rounds costs 4 less mana, minimum 1, and cannot have its beneficial duration shortened by an enemy effect on the same round it is cast. It can still be dispelled. This blessing uses this round's cast action, so the discounted spell is cast on a later round.

Once per battle; one prepared discount; cannot affect blessings, artifacts or summons' abilities.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: prepared_spell_discount. FX recipe: blessing2_thoths_reckoning.

### 6. Sobek's River Oath

ID: blessing2_sobeks_river_oath · egyptian · icon: icon.intervention.blessing2_sobeks_river_oath

**battle** · **10 Favor** · god: egyptian_sobek · target: allied_stack.

In a naval, river or marsh battlefield, one allied stack's next 2 normal retaliations deal 20% extra physical damage, expiring after 2 rounds. It receives no additional retaliation charges and no permission to cross water.

Once per battle; only legal on an explicit supported battlefield biome tag.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: wetland_retaliation. FX recipe: blessing2_sobeks_river_oath.

### 7. Amaterasu's True Dawn

ID: blessing2_amaterasus_true_dawn · japanese · icon: icon.intervention.blessing2_amaterasus_true_dawn

**battle** · **14 Favor** · god: japanese_amaterasu · target: allied_army.

Remove blindness and fear from all allied living stacks. Until the end of the following round, each affected stack resists the next new blindness or fear application once. No healing or damage bonus.

Once per battle; does not remove other debuffs or reveal adventure fog.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: dawn_clarity. FX recipe: blessing2_amaterasus_true_dawn.

### 8. Inari's Guest Right

ID: blessing2_inari_guest_right · japanese · icon: icon.intervention.blessing2_inari_guest_right

**adventure** · **10 Favor** · god: japanese_inari · target: adjacent_neutral_dwelling.

Reserve up to one week's current unclaimed stock at a visited neutral dwelling for this hero until the next dawn. Pay nothing now; actual recruitment still requires full gold/resources and army capacity. Other heroes may buy unreserved stock. Invalid on hostile or quest-locked dwellings.

One active reservation per player; 3-day hero cooldown; reservation releases on expiry, death or dwelling capture.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: dwelling_reservation. FX recipe: blessing2_inari_guest_right.

### 9. Brigid's Unbroken Work

ID: blessing2_brigids_unbroken_work · celtic · icon: icon.intervention.blessing2_brigids_unbroken_work

**battle** · **12 Favor** · god: celtic_brigid · target: owned_catapult.

Restore 30 HP to the player's surviving immobile catapult, capped at its initial HP, and absorb up to 20 damage from its next hit within 2 rounds. Cannot rebuild a destroyed machine or relocate it.

Once per siege; only if a friendly catapult exists and has damage or no repair barrier.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: catapult_repair. FX recipe: blessing2_brigids_unbroken_work.

### 10. Manannan's Safe Landing

ID: blessing2_manannans_safe_landing · celtic · icon: icon.intervention.blessing2_manannans_safe_landing

**adventure** · **12 Favor** · god: celtic_manannan · target: self_hero_on_ship.

The next legal disembark before dawn leaves 25% of the hero's daily movement allowance available, but never increases movement above its value immediately before disembarking. It cannot bypass a hostile coast, blocked landing or campaign boundary.

Once per hero every 3 days; no movement creation; one landing only.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: landing_reserve. FX recipe: blessing2_manannans_safe_landing.

### 11. Xolotl's Faithful Shadow

ID: blessing2_xolotls_faithful_shadow · mesoamerican · icon: icon.intervention.blessing2_xolotls_faithful_shadow

**battle** · **12 Favor** · god: mesoamerican_xolotl · target: allied_living_stack.

Mark one original living stack for 2 rounds. Its next hostile forced displacement is reversed to a legal adjacent hex chosen by its owner, at most one hex from its pre-hit position. If no destination fits, it stays. Damage still applies. This creates no unit and grants no attack.

Once per battle; not machines, rooted stacks, illusions or summons; does not trigger on voluntary movement.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: guided_displacement. FX recipe: blessing2_xolotls_faithful_shadow.

### 12. Chalchiuhtlicue's Mercy

ID: blessing2_chalchiuhtlicues_mercy · mesoamerican · icon: icon.intervention.blessing2_chalchiuhtlicues_mercy

**battle** · **12 Favor** · god: mesoamerican_chalchiuhtlicue · target: allied_stack.

Extinguish a fire damage-over-time status on one ally and create a 40 HP barrier against fire or water spell damage for 2 rounds. This does not heal dead creatures, absorb physical attacks or change terrain eligibility.

Once per battle; barrier does not stack with itself.

Requires the invoking player's existing committed god ID (or native patron god for a patron entry), matching pantheon, and scenario.features.interventions. Check actual player commitment state; no new dedication system.

Implementation hook: river_quench. FX recipe: blessing2_chalchiuhtlicues_mercy.
