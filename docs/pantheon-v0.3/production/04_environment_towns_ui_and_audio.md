# Non-Creature Visual Inventory and Scene Assembly

**Status:** P - production briefs and coverage, not delivered assets. The approved stack and sixteen paired creature forms are specified separately. This document covers the remaining game elements so "make the graphics" is not left as an undefined development task.

## 1. Shared environment kit

Make a modular Greek-coast 2D kit: painted repeating ground textures per climate and terrain type, sky panoramas, drawn roads, and map-object and decoration sprites that follow the frame, anchor, scale and facing conventions of the [visual pipeline](02_visual_and_animation_pipeline.md). Build reusable painted layers and sprite variants rather than one uneditable full-map image. The map generator places these assets on validated logical cells; decorative sprites never invent movement rules.

| Element family | Required initial pieces | Motion / state | Production approach |
| --- | --- | --- | --- |
| Ground | Plains, rocky rough ground, forest floor; cliff edge and bank transitions | Normally static | Painted repeating ground textures per terrain type with blended transitions; no baked UI/grid text |
| Roads | Straight/curved visual segments and intersections for six hex directions | Static | Connect exact logical road edges; test all junction orientations |
| Coast/river | Water layer, bank, bridge supports, foam accents, distant shoreline | Bounded water/foam effect | Painted sea backdrop and water tiles with a light cosmetic effect; no swimming/sailing mechanic implied |
| Mountains/cliffs | Large ridge, corner, end cap, rubble, distant silhouette | Static | Barrier sprites and painted tiles that clearly match the logical blocked mask |
| Vegetation | Pine/cypress-like trees, shrubs, dry grass, reeds | Optional slight wind | Shared decoration sprites, depth-sorted by screen y; thinned by the Low preset |
| Rocks and ruins | Small/large rocks, columns, broken walls, statue fragments | Static | Decoration sprites; collision-free placement outside protected paths |
| Flags/banners | Player, neutral and hostile variants | Short looping sprite strip or a light sway | Ownership is a distinct symbol as well as a color |
| Weather/sky | Clear coast, high-pass haze, storm-plateau sky panoramas | Slow clouds, optional rain particles | Never changes terrain costs or visibility without an explicit rule |
| Ground interaction | Selection disc, route dots, reachable boundary, destination marker | Minimal feedback | Generated from rules; distinguish route preview from committed movement |
| Fog | Unknown, remembered, currently visible | Controlled reveal transition | Hide live enemy state; reduced motion can reveal instantly |

M01 uses a warmer coast/river palette; M02 reuses the kit with higher cliffs and cooler distant haze; M03 uses darker cloud cover and restrained storm accents. These are palette/lighting variations of the painted kit, not three unrelated art packs. No screen shake or flashing weather is necessary to communicate the story.

## 2. Adventure objects

| Object / stable archetype | Needed appearance | Interactive states and animation |
| --- | --- | --- |
| Town marker | Greek settlement silhouette, owner emblem, selected-town flag | Owner change and selection; no independent real-time growth |
| Sawmill | Timber rack, small shed, cut logs | Neutral/owned flag; subtle machinery optional |
| Quarry | Cut-stone face, cart, stone blocks | Neutral/owned; no simulated digging economy |
| Gold Mine | Mine entrance, ore cart, gold symbol | Neutral/owned; payout is a dawn event, not a particle |
| Crystal Deposit | Distinct crystal outcrop | Neutral/owned; subdued glow without mandatory pulsing |
| Resource cache | Wreck crate, sack, stone/wood bundle or chest | Full/claimed; opening once does not award twice |
| Old Watchtower | Clearly taller watch structure with inspection point | Unvisited/visited; reveal presentation from actual vision event |
| Guarded crossing | Bridge/pass marker with the correct unit-family proxy | Guarded/cleared; remove blocking actor only after resolution |
| Griffin Nest | Cliff ledge, large nest and environmental feathers | Guarded, freed, covenant claimable, claimed; no independent recruit stock |
| Labyrinth Refuge | Original maze-marked rock doorway and banner | Guarded, covenant available, claimed |
| Cyclops cache | Boulder-strewn quarry and apex-creature marker | Guarded/claimed; do not create an extra town production line |
| Beacon | Common modular tower, brazier, lens frame | Dark, accessible, restored; each stage has a static readable version |
| Relay | Smaller signal plinth and orientation marker | Inactive/active with symbol change, not color alone |
| Ward gate | Rocky arch and visible sealed passage | Locked/unlocked; logic from two relay flags, never particle collision |
| Quest/objective marker | Distinct known/unknown/complete symbols | Driven by journal state; no premature hidden-site coordinates |

For all three beacons, use one modular sprite family with locally appropriate height and scenery. Draw intact/damaged/lit states, not three copies of unrelated art. The final lens is a story prop and quest flag; it is not a saleable artifact with invented combat statistics.

## 3. Town scene: all 32 current building definitions

Town scenes are deliberately composed: one painted 2D town background with building overlay images at fixed authored locations. Base and upgraded images (or successive hall/defense states) replace each other at one location according to the town's building state. Clicking a silhouette opens a read-only quote; purchasing is a separate confirmed command. No free-form placement or real-time construction simulation is required.

The following table covers every current building ID. "Replace" means change the displayed state of one building family, not demolish unrelated gameplay records.

| Building ID | Visual contract | Motion / upgrade treatment |
| --- | --- | --- |
| `village_hall` | Small civic house and gathering court | Flag and people silhouettes optional |
| `town_hall` | Larger columned civic hall | Replace hall state; retain location |
| `city_hall` | Expanded civic complex with stairs | Replace hall state; clear size increase |
| `capitol` | Major civic/acropolis centerpiece | Highest hall state; optional final-game scope |
| `fort` | Modest perimeter and gate | Static gate/perimeter for town illustration |
| `citadel` | Stronger keep and additional defensive detail | Replace defense state; growth info stays in UI |
| `castle` | Full fortified silhouette and side towers | Highest defense state; actual siege behavior remains separate |
| `tavern` | Welcoming courtyard/inn and sign | Cloth/lantern detail; campaign hiring disabled in UI |
| `market` | Stalls, awnings and scales | Small canopy motion; no resource-generating animation |
| `workshop` | Tools, carts and work shed | Cosmetic work cycle; not a gameplay timer |
| `supply_depot` | Organized timber/stone storage | Visible resource racks; no manual worker micro |
| `sanctum_1` | Compact scholarly chamber with roof emblem | Subtle interior glow |
| `sanctum_2` | Additional chamber/tower attachment | Replace/extend Sanctum state |
| `sanctum_3` | Upper observatory-like element | Highest demo Sanctum state; no unsupported telescope mechanic |
| `temple_1` | Small columned shrine and altar | Torch/censer ambience optional |
| `temple_2` | Larger temple facade and courtyard | Expand shrine; patron choice shown with optional banner/symbol |
| `barracks` | Infantry court, shields and spear racks | Static barracks base |
| `barracks_up` | Crested standards and reinforced training area | Same family plus Veteran additions |
| `peltast_range` | Target dummies and javelin racks | Cosmetic target practice optional |
| `peltast_range_up` | More organized veteran training lane | Upgrade silhouette and rank emblem |
| `centaur_grove` | Open woodland enclosure without horse stables | Room for Centaur silhouettes; preserve anatomy |
| `centaur_grove_up` | Guardian totems and reinforced grove boundary | Sentinel motif; not a third dwelling family |
| `griffin_aerie` | Cliff terrace and nesting ledges | Distant Griffin silhouette optional |
| `griffin_aerie_up` | Taller wind-crest standards and expanded ledges | Windcrest motif, no independent population pool |
| `training_court` | Riding yard, stables and lance rack | Horse tether/cloth detail optional |
| `training_court_up` | Companion-standard stable and armor area | Same location and cavalry family |
| `adept_house` | Quiet study court and ritual workbench | Small focus-light effect |
| `adept_house_up` | Seer canopy, elevated focus and sigil plaque | Ward motif, not a healing fountain |
| `labyrinth` | Broad original maze-entry structure | Static doors; no actual labyrinth subgame |
| `labyrinth_up` | Warden horn/axe standards and stronger facade | Same family, stronger silhouette |
| `thunder_quarry` | Large stone-working yard and boulder storage | No automatic lightning attack |
| `thunder_quarry_up` | Forge/engraved-stone attachments and larger crane | Stormforged materials; no extra third Cyclops form |

All 32 are documented; only the buildings enabled in the three mission manifests need to be purchasable in the demo. Planned/full-game entries can use clearly labeled reference art. An inaccessible building card must not look like a functioning purchase. For buildings actually supplied at mission start, the scene must show their appropriate completed state immediately.

Building completion is logically instant after validation. A short appearance/fade or construction flourish is optional and skippable; it cannot delay recruitment, consume extra days, or replay an initial population grant. Do not restore the old demo's build queue to accommodate an animation.

## 4. Heroes, portraits and story objects

Create Alexios's adventure-map hero sprite (the mounted map avatar: idle and walk strips, optionally in eight directions; one direction is mirrored for the west) and matching command portrait; his tactical representation is UI, not an attackable unit. A mount can be a visual travel choice without changing creature-family definitions or granting a new travel mode. Melas and the Scout Captain can reuse a compatible hero sprite set with visibly distinct costume/portrait IDs. They do not use creature-upgrade mechanics.

Thaleia and Ione need illustrated portraits consistent with the painted 2D art direction, plus expressions only if useful. They do not require locomotion strips for the demo. The lens, shrine tokens and covenant seals need inventory/quest illustrations; only the Warding Token uses the existing equipment effect. Keep quest props in their own data category.

Do not bake dialogue, unit statistics, resource counts or translated text into images. Portrait descriptions and optional captions must remain available with effects disabled.

## 5. All-screen visual assembly

| Screen | Presentation plan | What remains real UI |
| --- | --- | --- |
| S01 Main Menu | Composed coastal beacon scene or still fallback | Continue metadata, New/Load, Bestiary, Settings, Credits, native Quit |
| S02 Game Mode | Reusable campaign/skirmish cards | Availability, descriptions, selected mode |
| S03 Scenario / Campaign Mission | Three-node campaign overview and mission thumbnail | Mission unlock, replay/practice status, objectives and difficulty |
| S04 Faction | Faction emblem/hero artwork | Greek playable; other factions labeled planned |
| S05 Starting God | _Removed 2026-10-03 (owner): the single patron is preselected_ | — |
| S06 Adventure | Generated 2D map drawn in PixiJS layers (painted terrain, roads, objects, fog; pan/zoom camera) | Resources, day, route costs, hero/army, objectives, End player turn |
| S07 Hero | Consistent portrait and item icons | Stats, skills, seven slots, form labels, equipment changes |
| S08 Town | Painted 2D town background with building overlays at fixed locations | Costs, prerequisites, build allowance, garrison and visiting hero |
| S09 Recruitment | Creature portrait; optional selected preview | Shared stock, base/upgrade choice, recipient, quantity, total cost |
| S10 Pantheon | God emblems, branching connective lines | Eligibility, scope, irreversible choice and Favor cost |
| S11 Battle | Animated creature sprites on the logical hex board over a painted battlefield | Activation, legal targets, preview, mana, ammo, statuses and combat log |
| S12 Results | Modest outcome accent and still unit icons | Actual before/after counts, XP, loot, no duplicated rewards |
| S13 Level-Up | Hero portrait and skill emblems | Persisted legal offers and exact effects |
| S14 Journal | Map snippets, quest illustrations, beacon icons | State/conditions, claim/track actions and unknown-location handling |
| S15 World Overview | _Removed 2026-10-03 (owner)_ | — |
| S16 Encyclopedia | Family portraits and category icons | Search, filters, implementation/lore status |
| S18 Unit Detail | One animated sprite viewer with base/upgrade switch and animation state buttons | Correct base/context stats, abilities, provenance, history and game lore |
| S17 Settings | Quiet/static backdrop | Real controls, Apply/Cancel, defaults, accessibility and disabled reasons |

Keep existing screen IDs stable. Campaign briefing/debrief and completion use supporting overlays rather than renumbering screens or adding an unexplained fourth mission. The review sidebar from the earlier demo is an internal tool and is not a player menu.

Create original SVG UI icons for the five resources, movement, mana, attack, defense, HP, shots, growth, upgrades, save, return, inspect and settings. A native button's hit target and keyboard focus must remain larger than any decorative glyph. Faction, owner, selected state and upgrade rank need shape/text cues as well as color.

## 6. Battle effects and projectiles

| Effect family | Required examples | Rule boundary |
| --- | --- | --- |
| Melee contacts | Spear, axe, staff, claw, heavy giant impact | Cosmetic impact for one resolved strike |
| Projectiles | Javelin, Adept bolt, Cyclops boulder | One resolved target, no physical miss or accidental area damage |
| Commander spells | Spark, Blessing, Ward, War Cry, Lightning, Mend, Veil, Divine Sight | Only actual learned/cast effects; no independent particle-triggered rule |
| Creature ability | Seer Ward | Same family-shared charge reflected in UI |
| Status cues | Defend, active blessing, low ammunition, morale/luck result | Duration and charges from rules, not animation time |
| Upgrades | Short rank/form transformation accent | Plays after training commit; preserves quantity and does not grant units |
| World events | Beacon ignition, relay activation, gate release | Plays after committed quest state |

Use pooled transient sprites, bounded effect counts and clear ownership of cleanup. Projectile speed affects only playback. Disable excessive flashes and camera shake through settings. Art direction must distinguish direct-damage magic from normal physical-looking ranged attacks, even when both glow.

## 7. Audio companion plan

Music and sound are part of the intended production game, but this document supplies briefs, not generated tracks. Proposed minimum music set: main-menu theme, coast exploration, high-pass exploration, storm-plateau exploration, reusable tactical battle loop, and campaign resolution. Short stingers cover victory, defeat, level-up and beacon restoration. Loop edits need clean transitions and tested crossfades.

Ambient layers: coast/water, high wind, forest, quiet town and storm. Interface sounds: confirm, cancel, disabled action, recruit, train and save confirmation. Creature sound families: movement/contact, attack, hit, defeat and optional selection. Share related base/upgrade source families where sensible; avoid an unrelated voice for every armor change. Human acknowledgments can be sparse and optional. No compulsory voice acting is required for the first demo.

Keep editable audio masters and source provenance. Export runtime codecs tested in the actual desktop/browser targets; do not assume a file extension guarantees decode support. Route music, ambience, interface, combat and optional voices through their own buses using the existing Settings defaults. Limit repeated identical sounds and simultaneous creature voices. Respect mute, focus behavior, independent volumes and reduced sensory-effects options.

No track or sound is fetched from a third-party service during ordinary play. No user microphone permission, live narration service or voice cloning is needed. Silence or a failed audio device must not disable gameplay.

## 8. Asset-completeness gate

Before calling the demo production-ready, cross-check the campaign's used unit forms, buildings, site types, effects, UI icons and audio cues against the asset manifest. An identifier marked `implemented` must resolve to a local runtime asset or an explicitly accepted static equivalent appropriate to that feature. A bestiary portrait is a valid loading fallback, not a substitute for a promised animated battlefield creature.

Verify actual packaged paths on a case-sensitive filesystem, relative dependencies, sprite manifest entries and strip frame grids, fonts and sounds with networking disabled. Validate full-screen, windowed and scaled UI. Generated concepts and this written inventory alone do not satisfy the asset-completeness gate.
