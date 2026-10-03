# First Demo Campaign: The Three Beacons

**Version:** `campaign-three-beacons-0.3` | **Status:** P - a complete proposed three-mission demo, not playtested content.  
**D:** There are exactly three short demo missions, using the approved desktop/offline stack and the base-plus-one-upgrade creature rule.  
**Rules baseline:** `pr-0.2-candidate`, plus the explicit campaign overrides below. Coordinates and generation are in [Map Generation](02_map_generation_specification.md).

## 1. Campaign promise

A storm has extinguished the three signal beacons protecting the coast of Asterion. The outer lighthouse is merely damaged, the mountain beacon has been cut off by raiders, and the great beacon's focusing lens has been taken by a former coastal commander, Melas. Alexios must reconnect the coast before the isolated settlements abandon one another.

This is original game fiction in a Greek-inspired setting, not a retelling claimed to be ancient history. Zeus is the fixed initial patron. Athena or Ares becomes the player's persistent minor-god choice in mission 2. No new mythology, economy, naval mode, or cinematic dialogue system is required for this campaign.

The campaign's three verbs are **restore, ally, reclaim**. It teaches through actual decisions: choose a route, recruit soldiers, pay for an upgrade, secure a covenant, choose a patron, and apply the resulting army in combat. There are no mandatory quiz or lecture screens.

| Mission | Name | Main new decisions | Target playtime, unmeasured | Golden map |
| --- | --- | --- | --- | --- |
| M01 | The Silent Shore | Explore, recruit, train the first upgrade, resolve losses | 10-15 minutes | 20 x 14 axial-hex cells |
| M02 | Wings over the Pass | Build prerequisites, choose a god, obtain and upgrade Griffins | 15-25 minutes | 26 x 18 cells |
| M03 | The Storm Beacon | Navigate a hostile patrol, activate two relays, combine unit roles | 20-30 minutes | 30 x 20 cells |

Total intended first-play session is approximately 45-70 minutes, excluding extensive encyclopedia browsing. These are design targets; they must be measured with new players. There is no hard day limit, hidden doom clock, or compulsory optimal build order.

## 2. Cast and reusable assets

**Alexios:** The player's sole playable hero, a Strategos. His command portrait, adventure-map sprite, skills, and artifacts persist; he remains an off-grid commander in tactical combat.

**Thaleia:** Asterion's steward. A portrait and short text boxes introduce construction and the responsibility to leave garrisons behind. She is not an additional recruitable troop.

**Ione:** A shrine keeper who explains the Griffin covenant and Athena/Ares decision. She is a story portrait, not a new hero class or a unit called Oracle.

**Melas:** The hostile commander at the final beacon. Use a distinct portrait and a Greek hero presentation variant. His final army contains the existing `stormforged_cyclops`; there is no unpaired third-form "boss Cyclops."

A text-first dialogue overlay with portraits, subtitles, Backlog and Continue is sufficient. Voice is optional and must not be required for comprehension. All lines remain available with audio disabled.

## 3. Shared mission rules and explicit exceptions

The player controls one active hero. Extra hero hiring and dismissal are disabled for this demo with an explanation, although Tavern remains a valid prerequisite building. No town siege, ship travel, mixed-faction diplomacy, procedural quest generation, or global conquest is required. Mission victory uses the explicit beacon objective, not elimination of every enemy.

Alexios must remain active. His defeat, retreat or surrender ends the mission attempt and offers the last pre-encounter checkpoint, a normal earlier save, or mission restart. Pre-battle and retreat confirmations explain this campaign exception. It does not silently change the general skirmish retreat rules.

Day 1 initializes once, with no extra dawn payout. Existing buildings and initial family populations are loaded as scenario state: do not replay construction events or add another initial-growth grant. All towns use the ordinary one-build-per-day allowance. Starting buildings include every ordinary prerequisite even when the list uses upgrade shorthand.

Only the scenario's allowed building list is buyable. A disabled entry says "Not available in this demo mission," not "insufficient resources" when the real issue is scope. Remote management is allowed; recruiting or training to Alexios still requires his presence at that town. Enemy and neutral composition is fixed in the golden campaign, not scaled to current player strength.

No difficulty modifier changes existing creature statistics. Optional encounters can be skipped. Resources and prices follow the v0.2 candidate tables. The generator may vary scenery and bounded terrain, not erase a quest reward or secretly strengthen a guardian.

## 4. Entry state and carryover

| State category | Between missions |
| --- | --- |
| Hero identity/class, XP, skills, primary growth | Preserve after applying the mission's displayed XP cap |
| Spellbook, learned spells, equipped items and backpack | Preserve legal items; quest props use separate campaign flags |
| Zeus and Athena/Ares commitment | Preserve; mission 1 has no minor choice |
| Hero mana and movement | Initialize to the new mission's valid full budget; this is a mission transition, not an ordinary troop-transfer refill |
| Army, resource wallet, towns, pools and mine ownership | Replace with the declared expedition manifest; previous troops defend the restored region |
| Assigned/unassigned covenants | Mission-specific; M03 explicitly grants the continuing Griffin assignment to its new town |
| Fog, local quest flags, enemy troops and day | Reset to that mission's initial state |
| Cosmetic settings, codex discoveries, campaign completion | Preserve outside the match snapshot |

The debrief shows this policy before **Continue to next mission**. Do not surprise the player by silently removing an army. Preserving unlimited Gold and troops would undermine a short, testable progression; the fixed expedition manifests are an explicit demo design choice, not a rule for all future campaigns.

Mission XP caps are M01 level 3 (3,199 cumulative XP), M02 level 5 (6,199), M03 level 7 (9,999), using the existing curve. Excess XP is visibly capped, not converted into hidden currency. Secondary-skill choices remain earned and persisted. Caps do not lower the hero on a normal first playthrough.

Replaying an earlier unlocked mission uses its recorded entry snapshot in a separate practice branch. It cannot add Gold, items, XP, or completion rewards to the primary campaign. The canonical next mission is initialized from one committed completion record, never from whichever older replay happens to end last.

## 5. Mission 1 - The Silent Shore

### Opening

Thaleia: "The storm has passed. Our lighthouse is still dark. Open the road, train a guard we can trust, and bring its signal back."

Alexios: "First we reach the shore. Then we make sure the road stays open."

### Exact initialization

**Player town:** Asterion at `(3,7)`. Buildings: `village_hall`, `tavern`, `fort`, `barracks`. Empty garrison; Alexios is the visitor. Family pool: 14 Hoplites only. No Peltast pool exists yet.

**Wallet:** 5,000 Gold, 12 Wood, 18 Stone, 2 Crystal, 0 Favor.  
**Hero:** Level 1 Strategos, XP 0; Attack 1, Defense 2, Spell Power 1, Knowledge 2; Leadership I; 20/20 mana; no spellbook or artifacts. Army: 20 Hoplites + 8 Peltasts. Initial movement: 1,560, derived from the slowest creature.

**Purchasable buildings:** `town_hall`, `market`, `barracks_up`, `peltast_range`, `peltast_range_up`. All retain their regular prerequisites and costs. No mythic dwelling or Temple choice is exposed as available.

### Objectives and content

| Stable ID | Trigger / objective | Exact consequence |
| --- | --- | --- |
| `m01_recruit` | Buy at least 8 Hoplite-family creatures during this mission | Mark recruitment objective; starting troops and transfers do not count |
| `m01_upgrade` | Train at least 10 `hoplite` into `veteran_hoplite` through paid local upgrades | Mark training objective; later casualties do not erase the historical action |
| `m01_ford` | Defeat 6 Hoplites guarding the bridge at `(10,7)` | Open crossing; one-time 250 G + 3 W + 3 S; normal battle XP |
| `m01_beacon_guard` | Defeat 8 Hoplites + 4 Peltasts at `(16,7)` | Beacon accessible; one-time 500 G; normal battle XP |
| `m01_restore` | At beacon, guards defeated and both training objectives met | Quote 250 G + 3 W + 3 S; pay once, light beacon, award 900 quest XP and complete mission |
| `m01_centaur_cache` | Optional: defeat 3 Centaurs at `(6,2)` | One `warding_token` (+1 commander Defense); normal XP, no repeat loot |

An unowned Sawmill at `(3,3)` and Quarry at `(6,10)` are unguarded and capturable. Their regular 2 W/day and 2 S/day income makes a poor spending decision recoverable. An unguarded wreck cache at `(7,5)` gives 300 Gold once. There are no random reward rolls.

A low-cost example route is to build the Veteran Barracks, recruit 8 base Hoplites for 480 G, and train 10 for 150 G. With its 1,000 G / 5 S building and the 250 G / 3 W / 3 S restoration, the minimum quoted spend is **1,880 G, 3 W, 8 S**, before optional purchases. This is affordable from the opening wallet; construction still obeys the daily allowance.

The bridge is a real route blocker. The final beacon cannot be activated through an inspect button or while its garrison lives. If the player reaches it before training, the objective panel offers **Focus Asterion** without teleporting the hero or awarding free upgrades.

### Tutorial moments and ending

Show contextual help once, after the relevant action: route preview; a guarded route; family population; difference between dwelling upgrade and troop training; per-creature versus stack HP; battle casualties. The player can dismiss every help panel and later reopen it from the journal.

Thaleia, after restoration: "One light is enough to tell the coast we have not abandoned it. The next signal lies above the pass."

The debrief explains the fixed next-mission reinforcement roster. The normal mandatory encounters award 180 combat XP; with the 900 objective XP, a successful clean route reaches at least level 2 before mission 2, subject to resolving the earned skill choice.

## 6. Mission 2 - Wings over the Pass

### Opening

Ione: "The second beacon stands beyond the raiders. The Griffins once kept that road safe. Free their nesting ground, and they may stand with us again."

Alexios: "An alliance, not a trophy. Show us what they need."

### Exact initialization

**Town:** Passhaven at `(3,8)`. Buildings: `village_hall`, `town_hall`, `tavern`, `fort`, `barracks`, `peltast_range`, `market`, `workshop`, `temple_1`, `sanctum_1`. Pools: Hoplite 14, Peltast 9. Garrison empty. No Training Court, assigned light covenant, Aerie or upgrade is initially present.

**Wallet:** 9,500 G, 25 W, 30 S, 8 C, 15 Favor.  
**Army:** 32 Hoplites, 12 Peltasts, 4 Cavalry. The supplied Cavalry are expedition reinforcements, not evidence of a built Training Court. Hero progress and optional Warding Token carry over. Zeus remains the fixed major patron.

**Purchasable buildings:** `barracks_up`, `peltast_range_up`, `training_court`, `training_court_up`, `temple_2`, `griffin_aerie`, `griffin_aerie_up`, `sanctum_2`, `citadel`. No Centaur Grove in this campaign town. Hero may buy a spellbook for 500 G and learn eligible Sanctum spells through the normal local interaction.

### Objectives and content

| Stable ID | Trigger / objective | Exact consequence |
| --- | --- | --- |
| `m02_watchtower` | Visit Old Watchtower `(8,5)` | Reveal the nesting-ground tile as remembered and give a journal marker; no remote live vision or repeat XP |
| `m02_pass_guard` | Defeat 10 Hoplites + 6 Peltasts at `(13,8)` | Open ridge crossing; one-time 750 G + 5 Favor |
| `m02_nest_guard` | Defeat 4 Peltasts + 2 Cavalry at `(20,6)` | Make `covenant.griffin.m02` claimable; one-time 10 Favor, normal XP |
| `m02_claim_covenant` | Claim the freed-nest reward in the journal | Grant one unassigned Griffin entitlement; no duplicate on panel reopening |
| `m02_pantheon` | Own Temple II; commit to Athena OR Ares | Normal 20-Favor cost; irreversible player-wide choice, carried into M03 |
| `m02_windcrest` | Assign Griffin covenant, build Aerie and Windcrest Aerie, obtain at least 2 Windcrest Griffins in Alexios's army | Track current army requirement; normal local recruitment/training costs |
| `m02_restore` | At second beacon `(22,10)`, god chosen and Windcrest objective satisfied | Quote 250 G + 1 C; pay once, light beacon, award 2,000 quest XP and complete |
| `m02_sentinel_cache` | Optional: defeat 3 Centaur Sentinels at `(7,3)` | One-time 750 G + 5 W; no competing covenant |

The Sawmill `(5,4)` and Quarry `(6,12)` are unowned/unprotected. Crystal Deposit `(19,13)` is unowned/unprotected. A cache `(8,11)` gives 500 G once. Regular mine yields apply. The light slot is not silently changed between Centaur and Griffin; the campaign gives one specific Griffin covenant.

Required purchased buildings can be completed in four different world days: Temple II, Training Court, Griffin Aerie, Windcrest Aerie. Total **7,500 G, 15 W, 25 S, 4 C**. Two base Griffins plus their training cost another **600 G**; directly purchasing two Windcrest Griffins costs the same. Restoration adds 250 G / 1 C. Total minimum spend is **8,350 G, 15 W, 25 S, 5 C**, plus the 20 Favor commitment. A spellbook is optional, bringing Gold spend to 8,850 if purchased. All required numeric resources fit the initial wallet; Temple income and the named rewards provide the divine requirement.

The Aerie's first construction creates 7 family recruits; its upgrade creates none. The required two Windcrest Griffins cannot be recruited into a distant hero's army. The player must return to Passhaven, train/recruit, and physically travel to the beacon. This deliberately tests that towns, the map, upgrades, and journal share the same state.

### Divine choice and ending

Athena's panel: "Hold the road together." Current game effect: +1 commander Defense and eligibility to learn Ward on a subsequent eligible Sanctum visit.

Ares' panel: "Break the force that bars the road." Current effect: +1 commander Attack and eligibility to learn War Cry. Neither choice changes the creature's base record or creates a third Griffin form.

Ione, after restoration: "The lights can speak again. But the great beacon has no lens. Melas carried it to the storm plateau."

Both divine paths continue to the same third mission. Dialogue can acknowledge the choice, but neither branch receives an exclusive required resource or a structurally easier map.

## 7. Mission 3 - The Storm Beacon

### Opening

Melas: "A single beacon can command an entire coast. Why should I give that power back?"

Alexios: "Because it was built to guide people home, not make them kneel."

### Exact initialization

**Town:** Highwatch at `(3,10)`. Buildings: `village_hall`, `town_hall`, `tavern`, `fort`, `citadel`, `barracks`, `barracks_up`, `peltast_range`, `peltast_range_up`, `market`, `workshop`, `training_court`, `temple_1`, `temple_2`, `sanctum_1`, `sanctum_2`, `griffin_aerie`, `griffin_aerie_up`, `adept_house`. Assigned light covenant: Griffin. Initial pools: Hoplite 14, Peltast 9, Cavalry 4, Griffin 7, Temple Adept 3; these are explicit starting stocks, not a Citadel dawn.

**Wallet:** 15,000 G, 30 W, 35 S, 12 C, 10 Favor.  
**Army:** 40 Veteran Hoplites, 16 Veteran Peltasts, 4 Cavalry, 2 Windcrest Griffins, 2 Temple Adepts. Preserve the hero, book, spells, items, and chosen minor god. Starting at the town counts as a visit for eligible spell learning when a book exists.

**Purchasable buildings:** `training_court_up`, `adept_house_up`, `labyrinth`, `labyrinth_up`, `sanctum_3`. The latter still requires Wisdom to learn tier-3 spells. No Castle, Capitol or Thunder Quarry is required for this short mission. Cyclops forms appear as enemies and full bestiary entries, not a mandatory long late-game economy.

### Objectives and encounters

| Stable ID | Content | Exact consequence |
| --- | --- | --- |
| `m03_north_guard` | 6 Peltasts + 4 Cavalry at north crossing `(12,6)` | Open northern approach; one-time 500 G |
| `m03_south_guard` | 1 Minotaur + 6 Hoplites at south crossing `(12,13)` | Open southern approach; one-time 500 G |
| `m03_relay_north` | Activate relay `(16,5)` | Cost 250 G + 3 S once; set north flag |
| `m03_relay_south` | Activate relay `(16,14)` | Cost 250 G + 3 S once; set south flag |
| `m03_ward_gate` | Both relay flags true | Open crossing `(21,10)`; no new combat or free travel |
| `m03_melas` | Final open-field battle at `(26,10)`: 1 Stormforged Cyclops, 2 Labyrinth Wardens, 6 Veteran Peltasts | Defeat commander, record the returned lens as a non-tradable mission flag; normal combat XP |
| `m03_restore` | At final beacon, both relays active, Melas defeated and lens recovered | Cost 500 G + 3 C + 5 Favor; light beacon, award 2,500 quest XP; campaign complete |
| `m03_labyrinth` | Optional guarded refuge `(17,2)`: 2 Minotaurs + 1 Labyrinth Warden | 1,500 G and one assignable middle Minotaur Covenant |
| `m03_cyclops_cache` | Optional quarry `(18,17)`: 1 Cyclops | 4 Crystal; no apex covenant or hidden extra form |

Only one of the first two crossings needs to be cleared to reach both relays. This is a real route choice, not a requirement to fight every guard. A Sawmill `(5,6)`, Quarry `(6,15)`, and Gold Mine `(7,15)` are unowned/unprotected on the starting side. An Old Watchtower `(9,4)` reveals the two relay coordinates as remembered sites. The final ritual chain costs **1,000 G, 6 S, 3 C, 5 Favor**; optional military upgrades remain ordinary purchases.

Melas is a level-4 Champion with base Attack 4, Defense 3, Power 1, Knowledge 1; skills Offense II, Tactics I and Fortune I; a spellbook with Spark; 10 mana; no artifacts or minor-god bonus. This is a scenario-defined legal hero build, not a modified creature stat table. His commander remains off-grid. His battle uses the same activation, mana and casualty rules as the player.

### A limited but genuine adventure opponent

A separate hostile Scout Captain starts at `(17,10)`: level-2 Champion, Attack 3, Defense 2, Power 1, Knowledge 1, Offense I and Tactics I, no book/artifacts; army 12 Hoplites + 6 Peltasts + 2 Cavalry. It has one ordinary adventure turn after the player each day and the same movement/vision rules. It does not move in real time.

The patrol circuit is `(15,8) -> (18,10) -> (15,12) -> (17,10)`. Its permitted region is the middle plateau, q=13..20. It prefers a visible legal attack it evaluates as favorable, otherwise advances toward the next waypoint, otherwise defends its current route. A first reference utility is visible aggregate army HP adjusted by effective Attack/Defense; use a documented threshold of 1.10 before attacking. This is a testable initial policy, not a claimed strong strategic AI. A later tactical rollout can replace the estimate without changing its legal information access.

It cannot see through fog, acquire free reinforcements, teleport, capture Highwatch, attack neutral guardians, or leave the permitted region. It is removed permanently on defeat. The scripted hostile faction has no towns or wallet, and this scenario explicitly disables the normal townless-elimination timer for that faction. It is an authored encounter faction, not a demonstration of a full empire economy.

Melas is a stationary commander attached to the final encounter; he does not also take a second adventure movement turn. Static neutral guards do not take world turns. All tactical enemies use the normal battle AI.

### Finale and scope

The Storm Beacon sits in an open ceremonial clearing, not behind an intact city wall. Do not render a closed fortress and then pretend an ordinary battlefield implements a siege. A full town siege remains a later game-system milestone.

After restoration, the camera presents the three lit beacons through a short skippable sequence. Reduced motion uses three still views and the same text. The final summary shows objectives, days, battles, losses, upgrades trained and the chosen god; it does not issue a fabricated skill rating.

Thaleia: "Three lights. One coast. We can build the rest together."

Actions: **Return to Main Menu**, **Review Army and Bestiary**, **Replay a Mission** in a separate practice branch. There is no placeholder fourth level or unavailable next button.

## 8. Objective state machine and transaction rules

Use `locked`, `available`, `active`, `completed`, and `failed` objective states. A prerequisite transition must have an explicit cause. The journal and map markers are projections of that same state machine. Hidden sites have no precise marker until revealed; story knowledge can reveal a remembered coordinate without revealing its surrounding enemies.

Restoration is an explicit quote/confirm command after legal arrival. Validate hero identity/location, flags, alive army, cost, event uniqueness, and unresolved battle/level choices. Apply payment, story flags, quest XP, map presentation state and completion eligibility in one ordered transaction. Showing its flame is not the authority for its completion.

After quest XP, resolve any mandatory level choices. Then commit a completion record with `campaignRunId`, `missionId`, entry snapshot hash, result snapshot hash, and event IDs. A crash before that record resumes the pending result; a crash after it resumes the debrief. Next mission initialization has an idempotency key derived from the completion record. Clicking Continue twice, reloading or replaying a cinematic cannot create a second reinforcement army.

Unique reward item `warding_token` uses the earlier candidate Ring effect (+1 commander Defense). It appears once in the primary campaign; if the backpack is full, it remains in a labeled one-time cache, not discarded or repeatedly granted. Beacon lenses/covenants are quest state/entitlements and never occupy saleable equipment slots.

## 9. Scope and acceptance

Every unit family appearing in gameplay ships with both forms documented, inspectable and asset-complete. The campaign need not give the player every dwelling or require training every form. All sixteen Greek forms have full bestiary entries, and the first two missions explicitly exercise real upgrades. See the [upgrade contract](../content/03_exactly_one_upgrade_contract.md).

The short campaign excludes full campaign-editor UI, multiplayer, unrestricted world generation, naval combat, six finished mythologies, troop upkeep, world boss third forms, and paid/runtime AI services. Those exclusions keep the three-level story coherent; they do not justify missing menu, settings, saving, audio controls, local AI or animation lifecycle.

Before release: validate all reward flags and resource ledgers, both divine branches, all mandatory routes, no-network launch, repeated save/load, missing-asset fallback, retreat failure messaging, and the ability to recover from inefficient spending through mines/income. Actual casualty balance and completion times require simulation and human playtests; this document does not claim those results.
