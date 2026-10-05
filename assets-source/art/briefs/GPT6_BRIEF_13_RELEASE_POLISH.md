# Pantheon Realms — Art Brief 13 for GPT-6: RELEASE POLISH

_Written 2026-10-05 from the game (`assets-source/icons/icon-inventory.json`, the art and sprite manifests). Everything else the game shows is final art: all creatures and heroes animated, every map object, battlefield, effect, town building, god and hero portrait, spell, artifact, skill, set, climate and ability icon. This brief lists what is still a concept crop or a stand-in._

**Status (2026-10-05):** Parts B–E — all 94 icons — were delivered by the owner and are in the game (imported with the delivery's scoped helper; masters in `assets-source/icons/final/`, runtime files in `assets-runtime/ui/icons/final/`; DEVELOPMENT_STATUS.md). **Part A, the six town backgrounds, is still open**; it is the only part left to paint.

## At a glance

| Part | What | Count | Size | Priority |
|---|---|---|---|---|
| A | Town backgrounds, repainted (Brief 12 Part E, not yet made) | 6 | 2048 × 1536, opaque | **high** — the last concept crops on a main screen |
| B | Interface icons: resources, stats, actions and status | 38 | 96 × 96 px PNG, transparent (menu icons 192 px) | medium |
| C | Map markers (tile panel beside a site's name) | 22 | 96 × 96 px PNG, transparent | medium |
| D | Effect-family icons (stand-ins for spells without their own icon, battle status badges) | 20 | 96 × 96 px PNG, transparent | low |
| E | Divine interventions (miracles bought with Favor) | 14 | 96 × 96 px PNG, transparent | medium |

Parts B–E replace art the game already shows: crops from the owner’s concept icon pack (`assets-source/ui/sheets/resource-status-icon-pack.png`, labelled placeholder). Nothing in the game code changes; each file is found by its asset ID.

## 1. Rules for every image

* **Look.** Painted metal-and-enamel icons in the style of the delivered interface art (assets-source/ui/sheets/resource-status-icon-pack.png): warm gold rims, deep blue and bronze, soft top-left light, a subtle dark outline so the icon reads on dark panels.
* **Background.** Transparent PNG, no baked-in frame or square backdrop (the game draws sockets, frames and rarity borders).
* **Readability.** Must read at 24 px (resource bar, cost lists) and look good at 96–128 px (hero screen, encyclopedia). One clear silhouette, no text or letters.
* **Palette.** Shared icons stay neutral (gold, bronze, ivory, deep blue). Pantheon icons use the pantheon accent: Greek #3b73d9, Norse #7fb3d9, Egyptian #2aa3a8, Japanese #d0453f, Celtic #4f9f5c, Mesoamerican #d9772f (each pantheon’s theme accent).
* **No text, letters, numbers or watermarks** in any image. Never enlarge a smaller image to reach the size; deliver at least the size given (larger masters are welcome).
* **One file per asset**, named exactly by its asset ID plus `.png` (e.g. `icon.res.gold.png`). Sheets are not needed for this brief.

## 2. How a delivery enters the game

1. Parts B–E: save each icon as `assets-source/icons/final/<asset ID>.png`, then run `npm run icons:import -- --new` (only icons not yet registered are encoded; the game resizes to the size above and never upscales).
2. Part A: save each painting as `assets-source/art/final/town.<pantheon>.background.png`, then run `npm run art:import` (the town screen shows it in place of the concept painting; the importer warns on any proportion other than 4:3).
3. Run `npm run check`, then look at the result: the town screen of each pantheon (buildings sit on their plots), the resource bar and a cost list at 24 px, the adventure tile panel, the battle status badges and the Miracles book.

## Part A — Town backgrounds (6)

The town screen paints the 18 buildings over a background painting. The six backgrounds are still the owner’s concept paintings at 1448 × 1086 px, cropped for the game — they look right but soft on large screens. Repaint each at **2048 × 1536 px** (the same 4:3) and keep the composition **exactly**: every plot where a building stands stays where it is, at the same size, **empty** (the game draws the buildings there; they were painted for these plots in Briefs 10 and 12). Attach today’s painting as the base and its layout guide as the check: `assets-source/art/briefs/guides/town.<pantheon>.layout.png` marks every location’s footprint (blue: dwellings, gold: services); `town-placements.json` beside it gives the same in numbers.

| Pantheon | Deliver as | Today (attach) | Keep |
|---|---|---|---|
| Greek | `assets-source/art/final/town.greek.background.png` | `assets-runtime/placeholders/town/greek/background.jpg` + `assets-source/art/briefs/guides/town.greek.layout.png` | white-marble terraces stepping down a sunlit sea cliff, waterfalls into a blue bay, cypresses, a great statue and temple on the summit, snowy mountains far behind |
| Norse | `assets-source/art/final/town.norse.background.png` | `assets-runtime/placeholders/town/norse/background.jpg` + `assets-source/art/briefs/guides/town.norse.layout.png` | stone and timber terraces over frozen waterfalls in a snowy fjord, pines, braziers, a giant warrior statue and a fortress gate at the top, the aurora in the night sky |
| Egyptian | `assets-source/art/final/town.egyptian.background.png` | `assets-runtime/placeholders/town/egyptian/background.jpg` + `assets-source/art/briefs/guides/town.egyptian.layout.png` | sandstone terraces and quays over waterfalls into the green Nile, palms, obelisks and sphinxes, a sailing boat, the pyramids and a temple city on the horizon |
| Japanese | `assets-source/art/final/town.japanese.background.png` | `assets-runtime/placeholders/town/japanese/background.jpg` + `assets-source/art/briefs/guides/town.japanese.layout.png` | terraces on misty cliffs joined by red arched bridges, waterfalls, cherry trees in blossom, torii gates, pagodas and a snow-capped mountain at sunset |
| Celtic | `assets-source/art/final/town.celtic.background.png` | `assets-runtime/placeholders/town/celtic/background.jpg` + `assets-source/art/briefs/guides/town.celtic.layout.png` | mossy terraces among waterfalls in a misty highland valley, standing stones, a giant oak on the left, a stag statue and a stone arch on the far crag |
| Mesoamerican | `assets-source/art/final/town.mesoamerican.background.png` | `assets-runtime/placeholders/town/mesoamerican/background.jpg` + `assets-source/art/briefs/guides/town.mesoamerican.layout.png` | stepped stone terraces and causeways over turquoise pools and waterfalls in the rainforest, crimson banners, a great sun temple on the central axis at sunrise |

```text
Repaint the attached town background for the fantasy strategy game Pantheon Realms at 2048 × 1536 px, keeping its composition exactly: the same terraces, plots, paths, bridges, waterfalls and horizon in the same places and at the same sizes (the second attachment marks every plot that must stay an empty, flat, walkable platform — the game paints the buildings there). Sharpen and enrich the painting: crisper stone, water and foliage, warm light, atmospheric depth. No buildings on the marked plots, no people, no text, no frame.
```

Check before delivering: lay the layout guide over the repaint at 50 % opacity — every marked plot must still be an empty platform of the same size in the same place. A repaint that moves a plot cannot be used (the buildings would float).

## Part B — Interface icons (38)

Every icon name the interface draws through `Icon` (`packages/ui/src/assets/icons.tsx`). Names with art today show the owner-supplied art; the rest show a simple SVG glyph and are the first to replace. Asset IDs starting `icon.ui.` are the IDs for icons that have no art yet: art delivered under that ID replaces the glyph automatically (`iconArt`). **Size:** 96 × 96 px PNG, transparent (menu icons 192 px). Deliver as `assets-source/icons/final/<asset ID>.png`.

| Asset ID | What it shows | Where the game shows it | Today |
|---|---|---|---|
| `icon.res.gold` | Gold — a small stack of thick gold coins. | Costs and rewards (every screen); Resource bar (adventure, town); components/godIcons.tsx | `assets-runtime/ui/icons/res.gold.png` |
| `icon.res.wood` | Wood — a bundle of three cut logs tied with rope. | Costs and rewards (every screen); Resource bar (adventure, town) | `assets-runtime/ui/icons/res.wood.png` |
| `icon.res.stone` | Stone — two squared, quarried stone blocks. | Costs and rewards (every screen); Resource bar (adventure, town) | `assets-runtime/ui/icons/res.stone.png` |
| `icon.res.crystal` | Crystal — a cluster of glowing violet-blue crystals. | Costs and rewards (every screen); Resource bar (adventure, town) | `assets-runtime/ui/icons/res.crystal.png` |
| `icon.res.favor` | Favor — a radiant laurel around a small sacred flame (divine favor). | Adventure map; Battle; Costs and rewards (every screen); Map dialogs (camps, events, sites); Pantheon; Resource bar (adventure, town); Town; components/godIcons.tsx | `assets-runtime/ui/icons/res.favor.png` |
| `icon.stat.attack` | Attack — a sword blade pointing up-right. | Adventure map; Artifact fallback glyph (hero screen, merchant, encyclopedia); Battle; Dialogs (briefing, debrief, pause, save/load, encounters); Encyclopedia; Hero screen; components/godIcons.tsx | `assets-runtime/ui/icons/stat.attack.png` |
| `icon.stat.defense` | Defense — a round shield with a boss. | Ability badge stand-in (army slots, creature details, encyclopedia) until the ability icon exists; Artifact fallback glyph (hero screen, merchant, encyclopedia); Battle; Encyclopedia; Hero screen | `assets-runtime/ui/icons/stat.defense.png` |
| `icon.stat.hp` | Health — a heart with a small cross. | Encyclopedia | `assets-runtime/ui/icons/stat.hp.png` |
| `icon.stat.damage` | Damage — a jagged impact burst on a blade edge. | Ability badge stand-in (army slots, creature details, encyclopedia) until the ability icon exists; Battle; Encyclopedia | `assets-runtime/ui/icons/stat.damage.png` |
| `icon.stat.speed` | Speed — a winged boot. | Ability badge stand-in (army slots, creature details, encyclopedia) until the ability icon exists; Artifact fallback glyph (hero screen, merchant, encyclopedia); Battle; Encyclopedia | `assets-runtime/ui/icons/stat.speed.png` |
| `icon.stat.shots` | Shots — a quiver with arrows. | Battle | `assets-runtime/ui/icons/stat.shots.png` |
| `icon.stat.range` | Shooting range — a drawn bow with a dotted arc ending in a small target. | Battle | `assets-runtime/ui/icons/stat.range.png` |
| `icon.stat.movement` | Movement — a boot print on a path. | Artifact fallback glyph (hero screen, merchant, encyclopedia); Hero screen; components/godIcons.tsx | `assets-runtime/ui/icons/stat.movement.png` |
| `icon.stat.mana` | Mana — a blue droplet of light. | Hero screen; components/godIcons.tsx | `assets-runtime/ui/icons/stat.mana.png` |
| `icon.stat.morale` | Morale — a raised banner with a laurel. | Ability badge stand-in (army slots, creature details, encyclopedia) until the ability icon exists; Hero screen | `assets-runtime/ui/icons/stat.morale.png` |
| `icon.stat.luck` | Luck — a four-leaf clover on a coin. | Artifact fallback glyph (hero screen, merchant, encyclopedia); Hero screen | `assets-runtime/ui/icons/stat.luck.png` |
| `icon.stat.power` | Spell power — an open hand with a star of light. | Artifact fallback glyph (hero screen, merchant, encyclopedia); Hero screen | `assets-runtime/ui/icons/stat.power.png` |
| `icon.stat.knowledge` | Knowledge — an open scroll with a quill. | Artifact fallback glyph (hero screen, merchant, encyclopedia); Hero screen | `assets-runtime/ui/icons/stat.knowledge.png` |
| `icon.stat.xp` | Experience — a star with a small plus sign. | Hero screen; Town | `assets-runtime/ui/icons/stat.xp.png` |
| `icon.world.hero` | Hero — a helmeted bust in profile. | Adventure map | `assets-runtime/ui/icons/world.hero.png` |
| `icon.world.town` | Town — a walled town with a gate and two towers. | Adventure map; Dialogs (briefing, debrief, pause, save/load, encounters); Town; components/godIcons.tsx | `assets-runtime/ui/icons/world.town.png` |
| `icon.menu.encyclopedia` | Encyclopedia — an open book with a creature silhouette. | Adventure map; Dialogs (briefing, debrief, pause, save/load, encounters); Encyclopedia; Main menu; Recruitment | `assets-runtime/icons/menu-encyclopedia.png` |
| `icon.menu.settings` | Settings — a gear wheel. | Dialogs (briefing, debrief, pause, save/load, encounters); Main menu | `assets-runtime/icons/menu-settings.png` |
| `icon.menu.load-game` | Load — a tray with an arrow lifting out. | Dialogs (briefing, debrief, pause, save/load, encounters); Main menu | `assets-runtime/icons/menu-load-game.png` |
| `icon.time.day` | Day / end of turn — an hourglass. | Adventure map; Shared game widgets (resource bar, costs, stat blocks); Town | `assets-runtime/ui/icons/time.day.png` |
| `icon.menu.continue` | Continue — a double chevron pointing right. | Ability badge stand-in (army slots, creature details, encyclopedia) until the ability icon exists; Main menu | `assets-runtime/icons/menu-continue.png` |
| `icon.menu.new-game` | New game — a four-point star. | Dialogs (briefing, debrief, pause, save/load, encounters); Main menu | `assets-runtime/icons/menu-new-game.png` |
| `icon.menu.campaign` | Campaign — a map with a dotted route. | New game / setup | `assets-runtime/icons/menu-campaign.png` |
| `icon.menu.skirmish` | Skirmish — two crossed swords. | New game / setup | `assets-runtime/icons/menu-skirmish.png` |
| `icon.menu.quit` | Quit — a door with an arrow leaving it. | Main menu | `assets-runtime/icons/menu-quit.png` |
| `icon.menu.credits` | Credits — a laurel wreath around a small “i” mark (no letters if possible: a quill instead). | (not shown on any screen yet) | `assets-runtime/icons/menu-credits.png` |
| `icon.action.defend` | Defend (battle action) — a shield raised in front of a figure. | Ability badge stand-in (army slots, creature details, encyclopedia) until the ability icon exists; Battle | `assets-runtime/ui/icons/action.defend.png` |
| `icon.action.wait` | Wait (battle action) — a small hourglass beside a raised hand. | Battle | `assets-runtime/ui/icons/action.wait.png` |
| `icon.action.retreat` | Retreat — a banner turned backwards with an arrow. | Battle; Dialogs (briefing, debrief, pause, save/load, encounters) | `assets-runtime/ui/icons/action.retreat.png` |
| `icon.action.spell` | Cast a spell — an open spellbook with a spark above it. | Adventure map; Battle; Hero screen; Town | `assets-runtime/ui/icons/action.spell.png` |
| `icon.stat.vision` | Vision — an open eye. | Adventure map; Hero screen; Journal; components/godIcons.tsx | `assets-runtime/ui/icons/stat.vision.png` |
| `icon.action.ability` | Ability — a burst of light around a hand. | Battle | `assets-runtime/ui/icons/action.ability.png` |
| `icon.action.surrender` | Surrender — a white flag. | Battle | `assets-runtime/ui/icons/action.surrender.png` |

## Part C — Map markers (22)

Marker art beside site names (adventure tile panel, Journal). Chosen by the site kind and ownership in `siteMarkerAsset` (`components/art.tsx`). **Size:** 96 × 96 px PNG, transparent. Deliver as `assets-source/icons/final/<asset ID>.png`.

| Asset ID | What it shows | Where the game shows it | Today |
|---|---|---|---|
| `icon.marker.town` | A small walled town with your banner. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.town.png` |
| `icon.marker.hostile-town` | A walled town under a red banner. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.hostile-town.png` |
| `icon.marker.neutral-town` | A walled town with a grey banner. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.neutral-town.png` |
| `icon.marker.sawmill` | A saw blade over a log. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.sawmill.png` |
| `icon.marker.quarry` | A pick against a stone block. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.quarry.png` |
| `icon.marker.crystal` | A single crystal shard. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.crystal.png` |
| `icon.marker.mine` | A mine entrance with a cart of gold. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.mine.png` |
| `icon.marker.gold` | A small heap of coins. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.gold.png` |
| `icon.marker.wood` | A pile of logs. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.wood.png` |
| `icon.marker.stone` | A pile of stones. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.stone.png` |
| `icon.marker.chest` | A treasure chest. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.chest.png` |
| `icon.marker.artifact` | A glowing relic on a plinth. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.artifact.png` |
| `icon.marker.watchtower` | A tall wooden lookout tower. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.watchtower.png` |
| `icon.marker.locked` | A closed gate with a padlock. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.locked.png` |
| `icon.marker.quest` | A scroll with a seal. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.quest.png` |
| `icon.marker.story` | A stone beacon with a flame. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.story.png` |
| `icon.marker.creature` | A tent with a creature’s paw print. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.creature.png` |
| `icon.marker.question` | A question mark made of light over a road. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.question.png` |
| `icon.marker.shrine` | A small shrine with a flame. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.shrine.png` |
| `icon.marker.portal` | An arch of standing stones around a violet veil. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.portal.png` |
| `icon.marker.check` | A check mark in a ring. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.check.png` |
| `icon.marker.unknown` | A question mark. | Adventure map tile panel; Journal objectives | `assets-runtime/ui/icons/marker.unknown.png` |

## Part D — Effect-family icons (20)

Effect-family art: the stand-in for spells without their own icon, and the planned battle status badges. **Size:** 96 × 96 px PNG, transparent. Deliver as `assets-source/icons/final/<asset ID>.png`.

| Asset ID | What it shows | Where the game shows it | Today |
|---|---|---|---|
| `icon.fx.arrow` | Effect: arrow volley. | Available, not used yet | `assets-runtime/ui/icons/fx.arrow.png` |
| `icon.fx.burning` | Effect: fire / burning. | Spell fallback for effects: area_damage, mass_damage | `assets-runtime/ui/icons/fx.burning.png` |
| `icon.fx.death` | Effect: death (skull wreathed in smoke). | Available, not used yet | `assets-runtime/ui/icons/fx.death.png` |
| `icon.fx.divine` | Effect: divine light. | Available, not used yet | `assets-runtime/ui/icons/fx.divine.png` |
| `icon.fx.frost` | Effect: frost (snowflake on ice). | Available, not used yet | `assets-runtime/ui/icons/fx.frost.png` |
| `icon.fx.healing` | Effect: healing (green-gold motes rising). | Spell fallback for effects: heal_front, mass_heal | `assets-runtime/ui/icons/fx.healing.png` |
| `icon.fx.lightning` | Effect: lightning bolt. | Spell fallback for effects: direct_damage | `assets-runtime/ui/icons/fx.lightning.png` |
| `icon.fx.poison` | Effect: poison (green drop). | Available, not used yet | `assets-runtime/ui/icons/fx.poison.png` |
| `icon.fx.shadow` | Effect: shadow (dark smoke). | Available, not used yet | `assets-runtime/ui/icons/fx.shadow.png` |
| `icon.fx.shield` | Effect: protective shield of light. | Spell fallback for effects: defense_bonus, ranged_mitigation, melee_mitigation | `assets-runtime/ui/icons/fx.shield.png` |
| `icon.fx.strike` | Effect: heavy strike (impact star). | Spell fallback for effects: max_damage_roll | `assets-runtime/ui/icons/fx.strike.png` |
| `icon.fx.summon` | Effect: summoning circle. | Available, not used yet | `assets-runtime/ui/icons/fx.summon.png` |
| `icon.status.buff` | Status: blessed / strengthened (up arrow glow). | Spell fallback for effects: attack_bonus, mass_bonus | `assets-runtime/ui/icons/status.buff.png` |
| `icon.status.burning` | Status: burning. | Available, not used yet | `assets-runtime/ui/icons/status.burning.png` |
| `icon.status.debuff` | Status: cursed / weakened (down arrow glow). | Spell fallback for effects: min_damage_roll | `assets-runtime/ui/icons/status.debuff.png` |
| `icon.status.frozen` | Status: frozen. | Available, not used yet | `assets-runtime/ui/icons/status.frozen.png` |
| `icon.status.heal` | Status: regenerating. | Available, not used yet | `assets-runtime/ui/icons/status.heal.png` |
| `icon.status.poison` | Status: poisoned. | Available, not used yet | `assets-runtime/ui/icons/status.poison.png` |
| `icon.status.stun` | Status: stunned (stars). | Available, not used yet | `assets-runtime/ui/icons/status.stun.png` |
| `icon.status.weaken` | Status: weakened (cracked shield). | Available, not used yet | `assets-runtime/ui/icons/status.weaken.png` |

## Part E — Divine interventions (14)

Miracles bought with Favor (skirmish feature). **Size:** 96 × 96 px PNG, transparent. Deliver as `assets-source/icons/final/<asset ID>.png`.

| Asset ID | What it shows | Where the game shows it | Today |
|---|---|---|---|
| `icon.intervention.favorable_winds` | Favorable Winds: Every hero of yours regains half a day’s movement. | Pantheon screen — interventions | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.bountiful_harvest` | Bountiful Harvest: The chosen town gains 4 recruits for every tier 1–3 creature family it houses. | Pantheon screen — interventions | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.tithe_of_the_faithful` | Tithe of the Faithful: +1,500 Gold at once. | Pantheon screen — interventions | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.inspiration` | Inspiration: Every hero of yours regains 15 mana (never above its maximum). | Pantheon screen — interventions | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.rally_the_faithful` | Rally the Faithful: Every friendly stack +2 Attack through the current and next round. | Battle — divine intervention menu | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.shield_of_the_gods` | Shield of the Gods: Every friendly stack +3 Defense through the current and next round. | Battle — divine intervention menu | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.mending_light` | Mending Light: The front creature of every friendly stack heals up to 30 HP (no resurrection). | Battle — divine intervention menu | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.wrath_from_above` | Wrath from Above: One enemy stack takes 120 damage. | Battle — divine intervention menu | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.thunderbolt_of_zeus` | Thunderbolt of Zeus: One enemy stack takes 200 damage. | Battle — divine intervention menu | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.ride_of_the_valkyries` | Ride of the Valkyries: Every friendly stack +2 Speed through the current and next round. | Battle — divine intervention menu | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.blessing_of_the_nile` | Blessing of the Nile: The chosen town gains 3 recruits for every tier 1–5 creature family it houses. | Pantheon screen — interventions | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.ward_of_the_kami` | Ward of the Kami: Every friendly stack +4 Defense through the current and next two rounds. | Battle — divine intervention menu | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.mists_of_the_sidhe` | Mists of the Sídhe: Every hero of yours regains a full day’s movement. | Pantheon screen — interventions | `assets-runtime/ui/icons/res.favor.png` |
| `icon.intervention.gift_of_the_feathered_serpent` | Gift of the Feathered Serpent: +1,000 Gold and +3 Crystal at once. | Pantheon screen — interventions | `assets-runtime/ui/icons/res.favor.png` |

## After this brief

Once Parts A–E are in, the only stand-ins left are the neutral map hero (a tinted rider silhouette for heroes without a pantheon, rarely seen) and the square portraits of 16 campaign characters whose dialogue already shows their painted bust (`npm run icons:catalog` lists them; deliver `hero.<pantheon>.<id>.portrait.png` at 256 × 256 cropped from the bust if wanted).
