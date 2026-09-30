# Candidate Heroes, Logistics, Skills, and Magic

**Status:** P. This is a small deterministic development model inspired by [the H3 reference](../reference/03_heroes3_combat_and_army_rules.md), not a transcription of all its hero classes or spells.

## Primary attributes and army influence

| Attribute | Meaning |
| --- | --- |
| Attack | Added to allied creature Attack in battle |
| Defense | Added to allied creature Defense in battle |
| Spell Power | Scales explicitly defined spell effects |
| Knowledge | Maximum mana = 10 x Knowledge |

Always show base attribute, artifact contribution, divine contribution, and effective total. Leadership is a secondary skill, not another primary attribute or army-strength cap. Movement is a derived daily budget, not a battlefield hero Speed. A hero has no personal HP or grid footprint.

Starting class proposals:

| Class | Attack | Defense | Power | Knowledge | Starting skill | Repeating primary-gain cycle |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Champion | 2 | 2 | 1 | 1 | Offense I | Attack, Defense, Attack, Knowledge |
| Strategos | 1 | 2 | 1 | 2 | Leadership I | Defense, Attack, Knowledge, Power |
| Oracle | 0 | 0 | 3 | 3 | Wisdom I | Power, Knowledge, Power, Defense |

One cycle step is applied at each level gained, starting with the first listed gain at level 2. This fixed cycle is an explicit testable simplification. Hero class Oracle is distinct from the unit family **Temple Adept**, renamed to avoid the old entity-name collision.

## Experience and secondary skills

Proposed cumulative XP thresholds:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| XP | 0 | 1,000 | 2,000 | 3,200 | 4,600 | 6,200 | 8,000 | 10,000 | 12,200 | 14,700 |

For subsequent levels, increase the preceding interval by 20% and round that interval up to the next 100. The curve is the candidate balance table; the package does not claim to reproduce the full original XP algorithm.

Learn at most eight secondary skills, each up to rank III. At a level-up offer two different legal options where possible: one upgrade to an existing non-maxed skill and one new skill if a slot is available. A seeded progression stream chooses eligible candidates; persist the offers before display so reopening does not reroll them. If only upgrades or only new skills are legal, offer up to two of that category. If one option exists, show one. If none exist, award the primary-stat gain and show a non-choice acknowledgment. Multiple levels resolve one at a time.

| Skill | Rank I / II / III effect |
| --- | --- |
| Offense | +10% / +20% / +30% melee base-damage bonus in the additive bracket |
| Archery | +10% / +25% / +50% ranged base-damage bonus in the additive bracket |
| Armorer | 5% / 10% / 15% multiplicative physical damage reduction |
| Logistics | +10% / +20% / +30% daily land movement before final rounding |
| Leadership | +1 / +2 / +3 morale; no army-capacity effect |
| Fortune | +1 / +2 / +3 Luck |
| Wisdom | Learn spells through tier 3 / 4 / 5; no Wisdom needed for tiers 1-2 |
| Scouting | +1 / +2 / +3 hexes of adventure visibility |
| Tactics | Expand the side's deployment zone by 1 / 2 / 3 columns, still within its half of the board |

Rank effects replace the previous rank rather than add all ranks together. All classes may learn these nine skills in the first profile. No respec, class-exclusive lottery weighting, hero-specialty scaling, or bonus starting troops from repeatedly hiring the same hero is implied.

## Adventure movement

At dawn, use the slowest permanent creature's base Speed in the current army to select the daily land budget: Speed 3=1,500; 4=1,560; 5=1,630; 6=1,700; 7=1,760; 8=1,830; 9=1,900; 10=1,960; 11+=2,000. Speeds below 3 use 1,500 in this candidate. Apply Logistics and artifact percentage bonuses additively, then floor once. Battle-only Speed changes never affect next dawn's travel.

Use a hex-based authored adventure map in the first profile, separate from tactical board size. Roads cost 75 movement points per edge, plains 100, forest 125, rough terrain 125, marsh 150. Water and mountains are impassable unless a later movement mode explicitly enables them. For mixed edges, destination terrain sets cost; road cost applies only when the edge itself is a road. No diagonal-distance rule is needed on this hex map.

Start visibility radius 5 around the hero and 3 around owned towns; use graph distance without terrain occlusion in the slice. Unknown, remembered, and currently visible information are distinct. Static terrain can remain remembered; current enemy positions cannot.

Preview routes before commit. A guarded destination produces an encounter confirmation before paying the final edge and entering combat. A hero with insufficient points cannot enter that destination. Visits/pickups after a paid arrival cost no additional movement in this candidate. There is no hidden 'lose all movement after battle' rule.

Splitting, merging, recruiting, equipping, or transferring never refills current movement. Recompute the theoretical maximum when appropriate, but cap remaining points at the lesser of its current value and the new maximum. A larger maximum becomes usable at the next dawn. This avoids fresh movement from troop-shuffling.

## Mana and spell learning

Maximum mana is 10 x effective Knowledge. At dawn regenerate 1 mana up to that cap. A hero starting dawn in an owned town with a Sanctum refills to the cap instead. Buying a spellbook costs 500 Gold at a Sanctum. Oracle starts with one; the other classes do not. Learning eligible spells from an owned town's unlocked library is free once the hero visits with a book. It is a one-time known-spell update, not a recurring reward.

A newly raised cap does not instantly fill the additional mana. Lowering the cap clamps current mana. A spell cannot be cast without a learned entry or a separately specified artifact ability.

## Initial spell library

The following are our formulas and names. Direct spell damage bypasses Attack/Defense and physical Armorer; a later explicit magic resistance may reduce it, but none exists by default. P = caster's effective Spell Power. All battle effects use stable source IDs; duplicate copies of the same named effect do not stack.

| ID | Name / tier | Cost | Target and exact effect | Access |
| --- | --- | ---: | --- | --- |
| `spark` | Spark / 1 | 4 mana | Enemy stack: 10 + 5P direct damage | Sanctum I |
| `blessing` | Blessing / 1 | 4 mana | Ally rolls its maximum damage endpoint through the current round and next round | Sanctum I |
| `ward` | Ward / 1 | 4 mana | Ally +3 Defense through the current round and next round | Athena commitment and a visit to a Sanctum |
| `warcry` | War Cry / 1 | 4 mana | Ally +3 Attack through the current round and next round | Ares commitment and a visit to a Sanctum |
| `lightning` | Lightning / 2 | 6 mana | Enemy stack: 25 + 10P direct damage | Sanctum II |
| `mend` | Mend / 2 | 5 mana | Heal up to 20 + 5P of the living front creature's missing HP; no resurrection | Sanctum II |
| `veil` | Veil / 2 | 6 mana | Ally receives a 0.75 factor against ranged physical strikes through current and next round | Sanctum II |
| `divine_sight` | Divine Sight / 3 | 10 mana | Adventure only: reveal radius 3 around a selected already-known tile until next dawn | Sanctum III and Wisdom I |

For two-round-duration effects cast in round r, expire at the start of round r+2. A repeat cast refreshes that effect's expiry but does not add its stat bonus again. A target killed before resolution invalidates the pending action; costs are paid only when the validated cast executes. No two enemy turns occur while an ordinary UI confirmation is open in this sequential profile.

The temporary review-demo spells had different formulas. Preserve that old behavior only under its old rule version. Do not call these proposed spell values 'verified Heroes III spell values'. Spell tiers IV/V, resurrection, area damage, summons, teleportation, and full thematic schools are future content.

## Hiring, equipment, and recovery

Hero purchase, local deployment, transfers, and retreat/surrender are specified in the economy and combat documents. Equipment uses Weapon, Armor, Head, Relic, Ring, Mount: one slot of each in this profile; a backpack holds 30 items. Equip from the backpack outside combat only; no inventory mutation during deployment or battle. Item effects update derived values without changing base definitions.

Proposed starter examples: Bronze Standard, Relic, +1 Leadership-equivalent morale; Winged Sandals, Mount slot, +10% land movement; Warding Token, Ring, +1 Defense. These are candidate game items, not assertions of matching ancient artifact traditions. Set bonuses and item binding are deferred.
