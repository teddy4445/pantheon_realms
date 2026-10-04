# Asset Pipeline — 2D sprites, painted art, icons and sound

_For artists and for whoever brings art into the game. Engine side:
`packages/presentation/src/sprites.ts` (manifest, animation vocabulary,
fallbacks), `figure.ts` (playback) and `ui/src/assets/manifest.ts`
(registration). Source of truth for the rules behind this sheet:
`docs/pantheon-v0.3/production/02_visual_and_animation_pipeline.md` and
`CREATURE_ANIMATION_REQUIREMENTS.md`. Nothing here changes game rules._

**Status (measured, 2026-10-04, app 0.11.0):** the 2D views (Adventure Map,
Tactical Battle, Unit Detail viewer) draw everything from
`assets-runtime/sprites/manifest.json`. The owner's GPT-6 delivery (commit
071968c) made **every creature form (102), the six pantheon map heroes (idle
and walk, eight directions), the 41 map locations, decoration (6), obstacles
(7), siege pieces (12), projectiles (2) and the 9 shared effect strips
`final`**; the neutral map hero is the one placeholder left. Two owner
deliveries of 2026-10-04 added the **177 magic and Favor strips** (§5), six
town-action icons and 54 climate battlefields, then the **map heroes'
`prepare` and `cast` strips** (60, §12) with the god and hero portraits, the
god-card icons and the town building levels (§13).
`GPT6_2D_CONTENT_GENERATION.md` is the guide that delivery was made from and
stays as delivered. **The delivered final PNGs and their JSON sidecars in
`assets-source/sprites/final/` are authoritative**: some strips carry
reviewed component cuts, padding, calibrated scale and held-frame repairs
(sidecar `assemblyNote`), so the delivered sheets are never re-cut wholesale;
a re-import uses `tools/assets/sprites/import_sprites.py` on the final
sources. The magic and Favor strips of `VFX_MAGIC_AND_FAVORS.md` (§5) and the
briefs 8–11 in `assets-source/art/briefs/` (god portraits and god-card icons,
hero portraits, town building levels, map-hero prepare and cast; §12, §13)
were all delivered on 2026-10-04. A new or corrected sheet is cut alone with
`npm run sprites:cut -- --only <sheet>` (§4).

---

## 1. The sprite contract

| Rule | Value |
|---|---|
| Format delivered | PNG, RGBA, **transparent background** (the importer rejects a frame whose border is more than 2 % opaque) |
| Runtime format | WebP, written by `npm run sprites:import` (never edited by hand) |
| Strip | One image per animation: **N equal frames side by side, left to right**, no gaps, same baseline in every frame |
| Facing | Every creature and avatar is drawn **facing right** (screen right). The game mirrors defenders, enemies and westward travel; never deliver a mirrored copy |
| Light | From the upper left, the same in every frame and every form |
| Camera | The game's fixed three-quarter view from the front-right (as in the canonical reference views); no camera move inside a strip |
| Padding | Keep the whole figure inside the frame in every frame (weapons, wings, tails, effects attached to the body); nothing cut at the edges |
| One figure | One figure per stack (the count badge shows numbers); never draw a squad in one frame |
| What is not in the strip | Shadows on the ground, selection rings, health or count labels, projectiles in flight and spell effects are drawn by the game |

Statuses: `placeholder` (generated here, may be replaced at any time) and
`final` (delivered art, imported). A set is `final` only when every
animation its content needs is final; until then each strip keeps its own
status, so a half-delivered creature mixes final and placeholder strips and
the game says "Placeholder sprites" in the Unit Detail viewer.

## 2. Size and anchors

Every strip names its **anchor** (the point placed on the logical position,
as fractions of the frame) and its **scale** (frame pixels per hex width).
The views place sprites from logical positions only, so a sprite's size
never changes which hex a click selects (`hexmath.ts` is the only
screen↔hex transform).

| Kind | Delivered frame | Anchor | One hex width = | Runtime scale |
|---|---|---|---|---|
| Battle creature (one hex) | 512 × 512 | feet, bottom centre: (0.5, 0.9) | 240 px | ½ (256 × 256 frames) |
| Battle creature (two hexes) | 768 × 512 | feet, bottom centre: (0.5, 0.9); the body spans both hexes | 240 px | ½ |
| Map hero avatar (rider and mount) | 320 × 320 | ground point between the mount's feet: (0.5, 0.88) | 150 px | 0.6 |
| Hero-screen figure (still) | 1024 × 1024 | — (fitted to its panel) | — | ≤ 720 px |
| Map location | 512 × 512 | ground contact: (0.5, 0.92) | 280 px | ½ |
| Map decoration | 256 × 256 | (0.5, 0.95) | 280 px | ½ |
| Battle obstacle | 512 × 512 | (0.5, 0.92) | 240 px | ½ |
| Siege piece (wall, gate, tower) | 512 × 512 (keep 768 × 768) | (0.5, 0.95) | 240 px | ½ |
| Projectile | 128 × 32, pointing right | centre (0.5, 0.5) | 240 px | ½ |
| Effect | 256 × 256 frames | (0.5, 0.62) | 240 px | ½ |

**Sheets** (the normal delivery, §4) replace the frame sizes above with
cells: each sheet states how many hex widths one cell spans and where its
ground line is, and the cutter writes every strip with its own anchor and
pixels per hex (cell height ÷ cell height in hexes), so any delivered
resolution works. A single strip may still be delivered directly at any
uniform frame size from **half to twice** the listed one with the same shape.
Either way the importer never enlarges: the runtime scale is the delivered
one, capped at the nominal runtime scale (½ of the sizes above). Sizes on
the board come from the creature's size class (taller forms use more of the
cell), never from its footprint alone; each creature sheet in
`GPT6_2D_CONTENT_GENERATION.md` states the cell size and the creature's
height in it.

## 3. Animation vocabulary

| Name | Plays when | Loop | Frames (sheet) | Default rate |
|---|---|---|---|---|
| `idle` | standing, waiting, selected | loop | 6 (map avatars 4) | 3 fps (2 s) |
| `move` | walking a path on the board | loop | 6 | 8 fps (0.75 s) |
| `attack` | melee attack and retaliation | once | 6 | 6 fps (1 s) |
| `defend` | Defend command | once, hold | 3 | 8 fps |
| `hit` | taking damage | once | 3 | 10 fps (0.3 s) |
| `death` | the stack is destroyed (the last frame stays: the fallen lie on the board) | once, hold | 6 | 5 fps (1.2 s) |
| `victory` | the battle is won (every surviving winner) | loop | 6 | 4 fps (1.5 s) |
| `shoot` | ranged attack — **only creatures that shoot** | once | 6 | 6 fps (1 s) |
| `takeoff`, `fly`, `landing` | travel by flight — **only creatures with Flight** | once / loop / once | 3 / 6 / 3 | 8 / 10 / 8 fps |
| `ability` | an active ability — **only creatures that have one** | once | 6 | 6 fps (1 s) |
| `walk` | map avatars travelling (with `idle`) | loop | 6 | 8 fps |

`cast` is reserved (heroes cast spells; creatures do not). Which strips a
form needs follows its gameplay content (`requiredAnimations`): the base
seven, plus `shoot`, the flight three or `ability` as above — the Unit
Detail viewer shows exactly those buttons. The rates above put the strips
inside the pacing targets of `CREATURE_ANIMATION_REQUIREMENTS.md`; a sidecar
`<same name>.json` (`{"fps": 6, "loop": true, "anchor": [0.5, 0.9]}`) next
to a delivered file overrides them (the cutter writes one for every strip,
with the frame rates of `assets-source/sprites/sheet-layouts.json`). Animation never decides an outcome: the
rules have committed the result before anything plays, and Instant or Skip
gives the same result.

## 4. Files and folders

**Sheets.** GPT-6 delivers sheets into `assets-source/sprites/sheets/`
under the names in `GPT6_2D_CONTENT_GENERATION.md`:

```
sheet.creature.<pantheon>.tier<N>.<base|upgraded>.png   all animations of one form, one row each (6 cells per row;
sheet.creature.neutral.<family>.<base|upgraded>.png     defend+hit and takeoff+landing share a row)
sheet.hero.<pantheon>.png                               5 directions (rows) × idle 4 + walk 6 (cells)
sheet.hero.figures.png                                  the six hero-screen figures
sheet.ref.<pantheon|neutral>.<n>.png                    canonical references, 3 families × (base, upgraded)
sheet.portrait.<pantheon|neutral>.<n>.png               portraits, same families (opaque, black gutters)
sheet.map.towns.png, sheet.map.resources.png, sheet.map.locations.1.png, sheet.map.locations.2.png
sheet.battle.obstacles.png, sheet.battle.siege.png, sheet.fx.png
sheet.heroanim.<pantheon>.png                           map hero prepare + cast: 5 directions (rows) × 6 + 6 cells (Brief 11)
sheet.god.<pantheon>.png, sheet.icons.gods.png          god portraits; the 21 god-card icons (Brief 8)
sheet.heroportrait.<pantheon>.png                       hero portraits (Brief 9)
sheet.town.<pantheon>.levels.png                        town building levels (Brief 10)
```

The briefs' sheets have their layouts in
`assets-source/sprites/sheet-layouts.briefs.json` (written by
`npm run art:briefs`); the cutter reads every `sheet-layouts*.json` next to
the main one.

A sheet may arrive as two row ranges, `<sheet>.part1.png` and
`<sheet>.part2.png` (the upper part has the extra row when the count is
odd). Each sheet's grid, cell size in hexes, ground line and the file every
cell becomes are in `assets-source/sprites/sheet-layouts.json` (written by
`npm run sprites:queue`). `npm run sprites:cut` keys out a non-transparent
background (flat magenta, grey, a fake checkerboard), moves each cut to the
emptiest line near the grid, re-aligns every animation on the creature's
feet (median ground contact and foot position; airborne frames keep the
idle row's height), crops objects to their content with the anchor at their
ground contact, squares references and figures, cuts portraits along their
gutters, and writes:

* strips and objects (with a sidecar JSON: frames, fps, loop, anchor, pixels
  per hex) to `assets-source/sprites/final/` under the single-file names
  below;
* references to `assets-source/creatures/reference/`, portraits to
  `assets-source/icons/final/`;
* a preview of every cut (frames on a checkerboard with the anchor and
  ground line) to `assets-source/sprites/sheets/_preview/` (not committed);
* `assets-source/sprites/sheets/cut-log.json`: what each sheet produced. A
  sheet is cut again only when it changes, and the cutter never overwrites a
  file it did not cut (`--force` overrides both).

It reports frames that are empty, figures that touch (a row with more or
fewer separate figures than cells) and sheets whose background it cannot
separate; `--dry-run` checks without writing, `--self-test` cuts synthetic
sheets and checks the results.

**Single files.** The cut files — or any file delivered on its own — go into
`assets-source/sprites/final/` under these exact names:

```
sprite.creature.<pantheon>.tier<N>.<base|upgraded>.<animation>.png
sprite.creature.neutral.<family>.<base|upgraded>.<animation>.png
sprite.hero.<pantheon>.<idle|walk|prepare|cast>.<e|ne|n|s|se>.png   (nw, w, sw accepted; the game mirrors ne, e, se for them)
sprite.hero.<pantheon>.figure.png
sprite.map.site.<kind>[.<variant>].png        (towns: .<pantheon>; pickups: .<resource>|.artifact)
sprite.map.decor.<kind>.png
sprite.battle.obstacle.<kind>.png
sprite.battle.siege.<wall|gate|tower|keep>.<intact|damaged|rubble>.png
sprite.battle.projectile.<arrow|stone>.png
sprite.fx.<effect>.png
```

Map avatars: `e` is right, `n` away from the camera, `s` toward it. The
game mirrors the right-facing ones for the west (`w` ← `e`, `nw` ← `ne`,
`sw` ← `se`), so five directions complete a set.

Runtime layout (generated): `assets-runtime/sprites/manifest.json`,
placeholders in `assets-runtime/sprites/{creatures,heroes,map,battle,effects}/`,
imported finals in `assets-runtime/sprites/final/…`. Sources that are not
read by the game: `assets-source/creatures/reference/` (canonical reference
views of 43 forms, the drawing reference for every strip of that form),
`assets-source/sprites/content-plan.json` (`npm run sprites:plan`: forms,
animations, map locations, battlefields, climates and spells the content
uses) and `assets-source/sprites/silhouettes/`.

## 5. The sprite manifest

`assets-runtime/sprites/manifest.json`, schema `pantheon-realms-sprites-1`,
sections `creatures` (by creature ID), `heroes` (by pantheon, plus
`neutral`), `sites`, `decor`, `obstacles`, `siege`, `projectiles`,
`effects`:

```json
"veteran_peltast": {
  "status": "placeholder",
  "provenance": "Still pose cut from the delivered canonical reference view …",
  "facing": "right",
  "pixelsPerHex": 120,
  "tint": "accent",
  "animations": {
    "idle":  { "file": "sprites/final/creatures/veteran_peltast/idle.webp", "frames": 8,
               "frameWidth": 256, "frameHeight": 256, "fps": 4, "loop": true,
               "anchor": [0.5, 0.9], "pixelsPerHex": 120, "status": "final" },
    "shoot": { "file": "…", "frames": 8, "…": "…" }
  }
}
```

`tint: "accent"` colours a placeholder with its owner's colour so sides stay
readable; final strips are never tinted. Map avatars may carry
`directions` per animation and a `figure` still for the hero screen. The
manifest is written by the tools (§7); edit it by hand only to fix an
anchor, and then re-run `npm run check`.

**Magic and Favor effects.** All 177 phase strips of `VFX_MAGIC_AND_FAVORS.md`
were delivered on 2026-10-04 (owner's delivery `magic_icons_battlefields_delivery_2026-10-04`,
commit 2de3a50) and sit in `effects` under their full asset IDs
(`fx.spell.<id>.<phase>`, `fx.miracle.<id>.<phase>`, `fx.status.<name>`,
`fx.gift.<id>`, `fx.offering.rise|favor`), with the nine shared battle effects
(`impact`, `ward`, `morale.*`, `spell.*`) still under their short IDs. Phases
and playback: `cast` 6 frames @ 10 fps, `travel` 4 @ 12 looping, `impact`,
`area`, `depart`, `arrive`, gifts and offering 8 @ 12, `screen` 12 @ 12, status
overlays 6 @ 6 looping, `aura` 6 @ 6 looping. Before each phase the views look
up the phase's ID and play its strip (frames, rate, loop, anchor, pixels per
hex and `additive` from the manifest); without one the code-drawn look
(`fxLooks.ts`, painted by `fx.ts`) draws it, and a delivered **shared** strip
stands for an impact whose look matches (`genericImpactOf`: `spell.damage`,
`spell.area`, `spell.heal`, `spell.buff`, `spell.curse`, `ward`). Where they
play:

* **Battle:** `cast` at the commander's banner corner, `travel` from it to the
  target (the sky strike falls from above), `impact` at each stack's feet
  (wider for two-hex creatures, mirrored for the side facing left), `screen`
  over the whole view — proportions kept, covering it, at 60 % opacity easing
  in and out, mirrored for the defender — and `fx.status.*` as a looping
  overlay on each stack while its status lasts (a still first frame on Low
  quality and under Reduce motion). A battle miracle plays after its painted
  card.
* **Map:** `cast` on the hero, `area` centred on the chosen tile (the strip's
  ring spans two hexes at scale 1; it is scaled to the reveal radius + ½ hex,
  so its diameter is twice that), the `impact` on each hero or town, the
  `screen` strip of map miracles too (their drawn look has no whole-view
  moment), Homecoming's `cast` then `depart` and `arrive`, and the `aura`
  loops of Fleet Foot and Wings of Hermes on the hero for the rest of the day
  they were cast (presentation only, kept by the interface while the session
  lasts; a still frame under Reduce motion; none on Low quality).
* **Town:** the gift's strip (`fx.gift.<id>`) or `fx.offering.rise` rises from
  the Temple; the same strip, smaller, lands where the gift goes — the
  resource counters (Gold, Wood, Stone, Crystal), the visiting hero's portrait
  (Anointing, Temple Relic) — and `fx.offering.favor` plays on the Favor
  counter. Blessed Brood also lights each dwelling. Strip frames are sized
  for a 900 px tall window and follow the window's height.
* **Low quality** keeps a short flash per phase and leaves out whole-view
  moments; **Reduce motion** and instant playback skip the one-shot phases
  (results are applied the same).

**Importing effect strips.** `npm run sprites:import` keeps the full `fx.*` ID
of every magic and Favor phase and takes `loop` and `additive` from the
strip's sidecar (an effect loops only when its sidecar says so); the nine
shared effects keep their short IDs. Before 2026-10-04 it stripped the `fx.`
prefix and forced every effect to play once, so the delivery was imported with
a scoped wrapper; the importer is fixed and checked by
`python3 tools/assets/sprites/import_sprites.py --self-test` (run by
`packages/presentation/test/importSprites.test.ts` where Python with Pillow and
NumPy is installed). `--only <text>` imports a subset (e.g. `--only sprite.fx.`).
`packages/presentation/test/vfxHooks.test.ts` checks that every delivered
`fx.*` strip is one the game plays.

## 6. Image rules and budgets

* Transparent background, clean edges (no halo of the generation
  background), no text, no frame or border, no ground or cast shadow.
* Consistency across a pair: the upgraded form keeps the base form's
  silhouette family, palette and proportions, with the upgrade's added
  details (as in the reference views and portraits); both forms share one
  motion design (same frame count and timing per animation).
* Consistency across frames: same scale, light, line weight and baseline;
  the feet stay on the baseline except where the motion lifts them (jumps,
  flight).
* Budgets (runtime, measured on the placeholders: 7.1 MB for all 186
  entries): aim for ≤ 150 KB per creature strip and ≤ 2.5 MB per creature
  pair after import (WebP quality 90); the importer reports sizes.
* Painted backgrounds (battlefields, terrain, skies) follow §13 instead.

## 7. Checking your delivery

```
npm run sprites:cut -- --only <sheet> # cut one new or corrected sheet; look at assets-source/sprites/sheets/_preview/
npm run sprites:import -- --dry-run   # check names, frame grid, sizes, transparency; write nothing
npm run sprites:import                # write WebP into assets-runtime/sprites/final/, mark "final"
npm run icons:import                  # portraits cut from portrait sheets
npm run check                         # manifest completeness, files at their declared sizes, tests
npm run sprites:queue                 # refresh GPT6_2D_CONTENT_GENERATION.md (delivered strips drop out)
```

The importer refuses (and lists) a file whose name matches no form or
animation, whose width is not a whole number of frames of the expected
shape, whose height is outside half to twice the nominal one, or whose
background is not transparent. Then look at the result in the game: the
Unit Detail viewer plays every state (open the creature from the
Encyclopedia; the state buttons sit under the viewer, "Face left" checks the
mirrored side, the Assets tab lists each strip's status), a battle shows the stack on its cell
with the feet at the cell centre.

## 8. What happens when something is missing

* A missing optional animation falls back along a fixed chain (`shoot` →
  `attack` → `idle`; `fly` → `move` → `idle`; `takeoff`/`landing` → `move`;
  `ability` → `attack`; …); the viewer marks a stand-in with `*`.
* A missing `death` strip: the view lays the figure down itself.
* A file that fails to load keeps the previous frame; a set without a
  usable `idle` shows the portrait only ("No sprites yet — portrait only").
* Placeholders are regenerated by `npm run sprites:placeholders`
  (`tools/assets/sprites/make_sprite_placeholders.py`; Python 3 with Pillow,
  NumPy, SciPy and cairosvg); it never overwrites a `final` entry or strip.

## 9. Creature IDs to bind (all six pantheons)

| Pantheon | Tier | Family ID | Base creature ID | Upgraded creature ID | Footprint | Flies | Shoots | `ability` strip |
|---|---|---|---|---|---|---|---|---|
| Greek | 1 | `hoplite` | `hoplite` | `veteran_hoplite` | 1 hex | no | no | — |
| Greek | 2 | `peltast` | `peltast` | `veteran_peltast` | 1 hex | no | yes | — |
| Greek | 3 | `griffin` | `griffin` | `windcrest_griffin` | 2 hex | yes | no | — |
| Greek | 4 | `cavalry` | `cavalry` | `companion_cavalry` | 2 hex | no | no | — |
| Greek | 5 | `temple_adept` | `temple_adept` | `temple_seer` | 1 hex | no | yes | `ability_family_ward` (Temple Seer) |
| Greek | 6 | `minotaur` | `minotaur` | `labyrinth_warden` | 2 hex | no | no | — |
| Greek | 7 | `cyclops` | `cyclops` | `stormforged_cyclops` | 2 hex | no | yes | — |
| Norse | 1 | `norse_draugr` | `norse_draugr` | `norse_deathless_draugr` | 1 hex | no | no | — |
| Norse | 2 | `norse_frost_wolf` | `norse_frost_wolf` | `norse_fenrir_wolf` | 1 hex | no | no | — |
| Norse | 3 | `norse_frost_troll` | `norse_frost_troll` | `norse_ancient_frost_troll` | 2 hex | no | no | — |
| Norse | 4 | `norse_valkyrie` | `norse_valkyrie` | `norse_battle_valkyrie` | 1 hex | yes | no | — |
| Norse | 5 | `norse_lindworm` | `norse_lindworm` | `norse_storm_lindworm` | 2 hex | no | yes | — |
| Norse | 6 | `norse_jotunn` | `norse_jotunn` | `norse_runic_jotunn` | 2 hex | no | no | `ability_family_ward` (Runic Jotunn) |
| Norse | 7 | `norse_nidhogg_wyrm` | `norse_nidhogg_wyrm` | `norse_world_serpent_wyrm` | 2 hex | no | no | — |
| Egyptian | 1 | `egyptian_sacred_scarab` | `egyptian_sacred_scarab` | `egyptian_solar_scarab` | 1 hex | no | no | — |
| Egyptian | 2 | `egyptian_jackal_guardian` | `egyptian_jackal_guardian` | `egyptian_anubian_warden` | 1 hex | no | yes | — |
| Egyptian | 3 | `egyptian_ushabti` | `egyptian_ushabti` | `egyptian_royal_ushabti` | 1 hex | no | no | — |
| Egyptian | 4 | `egyptian_sphinx` | `egyptian_sphinx` | `egyptian_great_sphinx` | 2 hex | upgraded only | no | — |
| Egyptian | 5 | `egyptian_crocodile_beast` | `egyptian_crocodile_beast` | `egyptian_sobek_warbeast` | 2 hex | no | no | — |
| Egyptian | 6 | `egyptian_bennu` | `egyptian_bennu` | `egyptian_radiant_bennu` | 2 hex | yes | no | — |
| Egyptian | 7 | `egyptian_desert_colossus` | `egyptian_desert_colossus` | `egyptian_divine_colossus` | 2 hex | no | yes | — |
| Japanese | 1 | `japanese_kitsune` | `japanese_kitsune` | `japanese_nine_tailed_kitsune` | 1 hex | no | no | `ability_family_ward` (Nine-Tailed Kitsune) |
| Japanese | 2 | `japanese_kappa` | `japanese_kappa` | `japanese_river_elder_kappa` | 1 hex | no | no | — |
| Japanese | 3 | `japanese_tengu` | `japanese_tengu` | `japanese_great_tengu` | 1 hex | yes | no | — |
| Japanese | 4 | `japanese_oni` | `japanese_oni` | `japanese_oni_warlord` | 2 hex | no | no | — |
| Japanese | 5 | `japanese_jorogumo` | `japanese_jorogumo` | `japanese_queen_jorogumo` | 1 hex | no | no | `ability_family_ward` (Queen Jorogumo) |
| Japanese | 6 | `japanese_kirin` | `japanese_kirin` | `japanese_celestial_kirin` | 2 hex | no | yes | — |
| Japanese | 7 | `japanese_orochi` | `japanese_orochi` | `japanese_imperial_orochi` | 2 hex | no | no | — |
| Celtic | 1 | `celtic_pooka` | `celtic_pooka` | `celtic_elder_pooka` | 1 hex | no | no | — |
| Celtic | 2 | `celtic_cu_sith` | `celtic_cu_sith` | `celtic_great_cu_sith` | 1 hex | no | no | — |
| Celtic | 3 | `celtic_kelpie` | `celtic_kelpie` | `celtic_dread_kelpie` | 2 hex | no | no | — |
| Celtic | 4 | `celtic_banshee` | `celtic_banshee` | `celtic_battle_banshee` | 1 hex | no | yes | — |
| Celtic | 5 | `celtic_selkie` | `celtic_selkie` | `celtic_storm_selkie` | 2 hex | no | no | `ability_family_ward` (Storm Selkie) |
| Celtic | 6 | `celtic_horned_stag_spirit` | `celtic_horned_stag_spirit` | `celtic_great_stag_spirit` | 2 hex | no | no | — |
| Celtic | 7 | `celtic_fomorian_giant` | `celtic_fomorian_giant` | `celtic_ancient_fomorian` | 2 hex | no | no | — |
| Mesoamerican | 1 | `mesoamerican_feathered_serpent` | `mesoamerican_feathered_serpent` | `mesoamerican_celestial_feathered_serpent` | 1 hex | upgraded only | no | — |
| Mesoamerican | 2 | `mesoamerican_jaguar_spirit` | `mesoamerican_jaguar_spirit` | `mesoamerican_sun_jaguar` | 1 hex | no | no | — |
| Mesoamerican | 3 | `mesoamerican_eagle_warrior_spirit` | `mesoamerican_eagle_warrior_spirit` | `mesoamerican_solar_eagle_warrior` | 1 hex | no | yes | — |
| Mesoamerican | 4 | `mesoamerican_cenote_crocodile` | `mesoamerican_cenote_crocodile` | `mesoamerican_temple_crocodile` | 2 hex | no | no | — |
| Mesoamerican | 5 | `mesoamerican_camazotz` | `mesoamerican_camazotz` | `mesoamerican_blood_moon_camazotz` | 1 hex | yes | no | — |
| Mesoamerican | 6 | `mesoamerican_xiuhcoatl` | `mesoamerican_xiuhcoatl` | `mesoamerican_divine_xiuhcoatl` | 2 hex | no | yes | — |
| Mesoamerican | 7 | `mesoamerican_stone_colossus` | `mesoamerican_stone_colossus` | `mesoamerican_sun_colossus` | 2 hex | no | no | — |

Neutral creatures (no pantheon; random maps and campaign guards) use the same
rules; their asset IDs are `creature.neutral.<familyId>.<base|upgraded>.*`:

| Tier | Family ID | Base creature ID | Upgraded creature ID | Footprint | Flies | Shoots |
|---|---|---|---|---|---|---|
| 1 | `brigand` | `brigand` | `brigand_cutthroat` | 1 hex | no | no |
| 2 | `hill_slinger` | `hill_slinger` | `sling_master` | 1 hex | no | yes |
| 2 | `wild_boar` | `wild_boar` | `tusked_boar` | 1 hex | no | no |
| 3 | `centaur` | `centaur` | `centaur_sentinel` | 2 hex | no | no |
| 3 | `clay_golem` | `clay_golem` | `bronze_golem` | 1 hex | no | no |
| 4 | `wyvern` | `wyvern` | `wyvern_matriarch` | 2 hex | yes | no |
| 5 | `ogre` | `ogre` | `ogre_chieftain` | 2 hex | no | no |
| 6 | `basilisk` | `basilisk` | `greater_basilisk` | 2 hex | no | no |
| 7 | `elder_drake` | `elder_drake` | `ancient_drake` | 2 hex | yes | no |

Every non-Greek number is proposed; if a creature's content changes (it
gains Flight, a ranged attack or an active ability), its required strips
change with it (`requiredAnimations`), and `npm run sprites:queue` lists the
new ones. "base only"/"upgraded only" means the ability is gained or lost on
upgrade, so only that form needs those strips.

Suggested order (production/02 §10): finish the Hoplite pair end to end, then
Peltast, Cavalry and Griffin to prove the humanoid, ranged, mounted and flying
paths, then the rest (the queue in `GPT6_2D_CONTENT_GENERATION.md` follows it).

## 10. Sound and music (replacing the placeholders)

Every sound the game plays is a **sound ID** in
`assets-runtime/audio/manifest.json`; code never names a file. Today every
entry is a placeholder synthesized by `tools/audio/make_placeholders.py`
(status `placeholder`, shown as such in Settings → Audio).

To deliver final audio for an ID, either overwrite the file at the same path
(`assets-runtime/audio/placeholder/<name>.ogg`) or, better, add the file
under a new folder (e.g. `assets-runtime/audio/final/`) and change that
entry's `files`, `status: "final"` and `provenance`. No code changes.

| Field | Meaning |
|---|---|
| `role` | `music` and `ambience` loop and crossfade when the scene changes; `stinger` is a short fanfare that dips the music while it plays; `effect` is a one-shot; `loop` is an effect loop (hero footsteps). |
| `bus` | `music`, `ambience`, `interface`, `combat` or `voice` — the Settings volume that controls it. |
| `files` | One or more bundled files; several are variants picked at random. |
| `gain` | Level of this sound in the mix (1 = as delivered). |
| `intensity: "strong"` | Thunder, crashes: softened by **Calmer sound**. |
| `maxVoices`, `cooldownMs`, `pitchJitterCents` | Limits on overlapping copies and repeats; small random pitch variation. |

The 34 sounds added on 2026-10-03 (the five campaign soundscapes' music and
ambience, the spellbook and town sounds, and the magic families) are, like
the first 52, **original placeholders synthesized in code** (no recordings,
samples or downloads: free sound sites and generation services were not
reachable from the development environment) and are appended to the
generator's catalogue, so the earlier files keep their seeds. Regenerate only
some IDs with `python3 tools/audio/make_placeholders.py --only id,id`.

Files: Ogg Vorbis (`.ogg`), 44.1 kHz; music and ambience stereo, effects
mono. Loops must loop seamlessly (no silence at either end). Keep editable
masters and source provenance outside the runtime folder. Test decoding in
the desktop build and a Chromium browser — `npm run test:e2e` decodes every
file in the manifest. Never reference a URL: files must be bundled.

Sound IDs by use (the full list is `REQUIRED_SOUND_IDS` in
`packages/ui/src/audio/sounds.ts`, and a unit test fails if one is missing):

* Music: `music.menu`, `music.explore.<soundscape>`, `music.battle`,
  `music.resolution`. Each mission names its soundscape: `coast`,
  `high_pass`, `storm_plateau` (The Three Beacons, and every campaign's
  darkest missions), `fjord` (The Winter Oath), `desert` (the Egyptian
  campaign), `shrine` (Japanese), `glen` (Celtic), `jungle` (Mesoamerican) —
  the last five added 2026-10-03.
* Stingers: `stinger.victory`, `stinger.defeat`, `stinger.levelup`,
  `stinger.beacon`.
* Ambience: `amb.<soundscape>`, `amb.battlefield`.
* Interface: `ui.click`, `ui.open`, `ui.close`, `ui.confirm`, `ui.error`,
  `ui.coins`, `ui.build`, `ui.recruit`, `ui.endday`, `ui.newday`,
  `ui.newweek`, `ui.pickup`, `ui.capture`, `ui.divine`, `ui.objective`,
  `sfx.steps` (loop); the spellbook `ui.book_open`, `ui.book_close`,
  `ui.book_page` (changing its filter); the town's building pop-up
  `ui.popup` and its actions (market, tavern, temple, merchant)
  `ui.town_action`.
* Magic and Favor (2026-10-03): `magic.cast` when a battle spell gathers at
  the commander's corner, then one sound per look family
  (`packages/presentation/src/fxLooks.ts` `FX_SOUNDS`): `magic.strike`,
  `magic.thunder`, `magic.fire`, `magic.heal`, `magic.bless`, `magic.curse`,
  `magic.wind`, `magic.frost`, `magic.nature`, `magic.swarm`, `magic.water`,
  `magic.shadow`, `magic.holy`, `magic.smite`, `magic.reveal`,
  `magic.teleport`, `magic.coins`, `magic.horn`. Each spell, miracle, gift and
  the offering picks its family from its look, so a final sound per family
  covers all of them; a sound per spell can be added later as a new ID.
* Combat: `combat.start`, `combat.march`, `combat.flight`, `combat.swing`,
  `combat.hit`, `combat.hit_heavy`, `combat.shot`, `combat.arrow_hit`,
  `combat.death`, `combat.spell`, `combat.heal`, `combat.ward`,
  `combat.defend`, `combat.morale_up`, `combat.morale_down`,
  `combat.shapeshift`, `combat.recovery`, `combat.catapult`,
  `combat.stone_hit`, `combat.breach`, `combat.turret`, `combat.moat`.

## 11. Interface art (opening screen, branding, icons)

The interface art is owner-supplied (AI-generated visual references delivered
on 2026-10-01). Sources live in `assets-source/ui/`; the runtime files are
**generated** by `python3 tools/assets/prepare_ui_art.py` (Pillow, numpy,
scipy) and listed with provenance in `assets-runtime/ui/manifest.json`.
Code refers to asset IDs only, so final art replaces a file without screen
changes. Edit the sources and re-run the script; never edit the outputs.

| Source (`assets-source/ui/`) | Runtime output | Asset ID(s) / use |
|---|---|---|
| `backgrounds/opening-<pantheon>-<landscape\|battle>.png` | `assets-runtime/ui/backgrounds/*.webp` (WebP q80, ≤1920 px wide) | `menu.background.<name>`; the main menu picks one **at random each time the game starts**; the same image, darkened, sits behind the menu-style screens |
| `branding/full-logo.png` | `ui/branding/full-logo.webp` (navy background keyed out, cropped) and `ui/branding/logo-text.webp` (the lettering alone: the logo split at the widest empty column gap in its left half, 1047 × 294) | `brand.logo.full`; `brand.logo.text` — the main-menu title and the Credits dialog (owner request 2026-10-02: the lettering only, no emblem) |
| `branding/logo.png` | `ui/branding/emblem-256.png`, `assets-runtime/favicon.png` (64 px), `apps/desktop/build-resources/icon.ico` (16–256 px) and `icon.png` (512 px), `ui/branding/app-icon-256.png` | `brand.emblem` (small branding: the in-game pause menu), app/installer icon, favicon, window icon |
| `frames/intro-frame.png` | `ui/frames/intro-frame.webp` | `menu.frame`; the script also measures the transparent window (`interior`) the menu sits in |
| `menu-icons/menu-*.png` (the owner's nine `init_icon` files, renamed by meaning) | `assets-runtime/icons/menu-*.png` (192 px) | `icon.menu.<continue\|new-game\|load-game\|campaign\|skirmish\|encyclopedia\|settings\|credits\|quit>` |
| `sheets/resource-status-icon-pack.png` | `ui/icons/<group>.<name>.png` (96 px, 96 icons) | `icon.res.*`, `icon.stat.*`, `icon.world.*`, `icon.time.*`, `icon.status.*`, `icon.attr.*`, `icon.action.*` (battle actions), `icon.fx.*`, `icon.marker.*` (map markers) |
| `sheets/map-markers-sheet.png` | — (reference only) | |

Main-menu icon mapping (by meaning): double chevron → Continue, four-point
star → New Game, tray with arrow → Load Game, map with route → Campaign,
crossed swords → Skirmish, open book → Encyclopedia, gear → Settings, laurel
with "i" → Credits, door with arrow → Quit. Random Map and High Scores are
no longer main-menu entries (owner request 2026-10-02): Random Map is a card
under New Game, High Scores open from the end-of-game summary.

Where icon art is used: `Icon` (`packages/ui/src/assets/icons.tsx`) draws the
art for the names listed in `ICON_ART` (resources, hero stats, battle actions,
menu entries…) inside the same 24×24 `<svg>`, so every resource counter, cost
list, stat block, battle control and menu entry picks it up; interface glyphs
(close, back, check, lock…) stay SVG. Map-marker art appears beside site names
in the adventure tile panel and on Journal objectives (`siteMarkerAsset`,
`MarkerIcon` in `components/art.tsx`); on the map itself each location is a sprite (§1, `sites`).

To add or replace an opening background, drop `opening-<name>.png` into
`assets-source/ui/backgrounds/` and run the script.

**Icon catalog and final icons.** `ICON_CATALOG.md` (repo root) lists every
icon and small illustration the game shows — interface icons, map markers,
spells, artifacts, artifact sets, skills, interventions, creature abilities,
effect art, portraits, emblems, buildings and thumbnails — with the asset ID to
deliver, the screens it appears on, what is shown today and a brief. The same
list with thumbnails and a Status column is `assets-source/icons/ICON_CATALOG.xlsx`
(and `icon_catalog.csv`). Both are generated from the game by
`npm run icons:catalog` (`tools/assets/icon-catalog/`: a Vitest inventory step,
a Playwright step that renders today's SVG glyphs, and a Python step that
writes the files; development tools, never packaged). To deliver a final icon,
name the PNG by its asset ID, put it in `assets-source/icons/final/` and run
`npm run icons:import`: the file is checked against the catalog, sized for the
game, copied to `assets-runtime/ui/icons/final/` and registered in
`assets-runtime/ui/final-manifest.json`, which takes precedence over every
placeholder (`FINAL` in `packages/ui/src/assets/manifest.ts`). Interface icons
without pack art take final art under `icon.ui.<name>` automatically. No screen
changes are needed.

First delivery (2026-10-02): **172 functional icons** — 22 interface
(`icon.ui.*`), 54 spells, 79 artifacts, 17 skills — copied from the owner's
art-project handoff folder (`blannder_models`) into `assets-source/icons/final/` (unmodified
1254 × 1254 RGBA masters; the originals stay where they were) and imported to
128 px (spells, artifacts) and 96 px (interface, skills) runtime PNGs, 3.7 MB
in all. The game never reads the handoff folder or its
`delivery-manifest.json`; `final-manifest.json` is written by the importer.
Each item shows its own icon through the shared widgets — `SpellIcon`,
`ArtifactIcon` and `SkillIcon` (`components/art.tsx`) — which fall back to the
old glyph when an ID has no file. Spell art sits at 80 % of its round socket
without a circular clip, because several delivered spell silhouettes reach
past the inscribed circle. An interface icon also replaces its glyph wherever
the game already draws that glyph, including the ability-badge stand-ins
(`bow` for Shooter, `upgrade` for Shapeshift) and completed objectives
(`check`).

Second delivery (2026-10-04): the six town-action icons `icon.ui.build`,
`icon.ui.recruit`, `icon.ui.market`, `icon.ui.tavern`, `icon.ui.merchant` and
`icon.ui.gift` (96 px runtime PNGs; masters in `assets-source/icons/final/`
and `assets-source/icons/masters/`). They replace the SVG stand-ins of the
same names wherever the game draws those glyphs (the building pop-up actions
and the town bar among them) with no code change.

Creature portraits (Brief 5, first part delivered 2026-10-03): **43 painted
portraits** — every Greek, Norse and Egyptian form and the Kitsune — imported
from 1254 × 1254 opaque masters to 256 × 256. Pictures without transparency
(painted portraits with their own background) are written as **WebP** (quality
88; 1.2 MB for the 43, against 6.6 MB as PNG); icons with transparency stay
PNG. They show wherever a creature is drawn through `CreaturePortrait` —
army slots, recruitment and training, the battle turn order and stack panel,
the Bestiary, the creature detail screen (now 8 rem), encounters and results —
inside the game's own square gold frame (no second frame). The other 59 forms
(the Nine-Tailed Kitsune and forms 045–102) keep the generated stand-in until
delivered. The 172 matching canonical reference views (four per form) are in
`assets-source/creatures/reference/` with the delivery's notes
(`delivery-notes/`); the game does not read them at run time — they are the
drawing reference for each form's 2D strips, and the placeholder generator
cuts the 43 forms' battle stills from the three-quarter views.

Set and ability badges (2026-10-02) use the same path: `icon.set.<setId>`
appears on worn and packed set pieces, the set list and item cards;
`icon.ability.<abilityId>` on army slots, creature details and the
Encyclopedia. Until a file is delivered they show a clearly temporary stand-in
(a coloured gem for sets, the nearest interface glyph for abilities). The
catalog now has 777 entries (neutral creatures, four campaign heroes and their
opponents, story speakers, 28 mission and 4 campaign thumbnails, the range
icon and the portal marker were added).

### Mouse cursors (Brief 7; all 24 delivered 2026-10-03)

1. Drop the delivered 128 × 128 transparent PNGs, named by cursor ID
   (`cursor.map.attack.png`, …; the 24 IDs of the brief), into
   `assets-source/ui/cursors/`.
2. Run `npm run cursors:import` (`tools/assets/import_cursors.py`, Pillow). Each
   file is written to `assets-runtime/ui/cursors/` at 32 px (1x) and 64 px
   (2x, `@2x.png`) with its hotspot — taken from the delivery's
   `delivery-manifest.json` (`hotspot128`) kept beside the PNGs, else measured
   (arrow and gauntlet at their tip, the sword at its point, others at the
   centre). The sword is also written turned to the six hex sides
   (`cursor.battle.melee@<0–300>`, clockwise on screen) on a canvas grown so the
   blade is never clipped, with the point as the turned hotspot. `manifest.json`
   lists `{ file, file2x, size, hotspot }` per image, the hotspot in 1x CSS
   pixels. Files no longer in the source folder are removed.
3. Rebuild. `packages/ui/src/assets/cursors.ts` writes
   `image-set(url(1x) 1x, url(2x) 2x) x y, <system cursor>` with absolute URLs
   and preloads the images; a cursor without art falls back to its drawn
   stand-in or system cursor. Delivered 2026-10-03: all 24 (hashes checked
   against the delivery manifest). Which
   cursor shows where is decided in `packages/ui/src/app/cursorContext.ts` (map:
   move, move later, attack, siege, visit, portal, own hero or town, blocked,
   busy on another empire's turn, grabbing while dragging; battle: move, fly,
   melee from the side of the chosen hex, shoot, weak shot, structure, spell,
   ability, info, blocked) and in the interface stylesheets (`--cur-*`
   variables for the arrow, hand, grab, busy and blocked). Settings → Display →
   *Game cursors* turns them off.

## 12. Mounted adventure-map heroes (2D avatars)

One mounted avatar per pantheon (named heroes keep their own portraits and
share their pantheon's avatar), plus a neutral one: sprite sets in the
manifest's `heroes` section with `idle` and `walk` strips, optional
`directions` (eight: `e`, `ne`, `n`, `nw`, `w`, `sw`, `s`, `se`) and a
`figure` still for the hero screen (§2, §4 for sizes and names).

**Delivered (owner commit 071968c).** The six pantheon avatars are final:
`idle` (4 frames) and `walk` (6 frames) in all eight directions, and the
figure still. The neutral avatar is still the placeholder cut from the
owner's boards.

**In the game.** The avatar stands with the ground point between the
mount's feet on its hex; it plays `walk` while moving, turned to the
direction of each step (`directionOf`; the direction's strip, else the
mirrored right-facing one), `idle` otherwise. Since 2026-10-04 a step takes
360 ms and the walk strip plays at 0.7× its rate (the owner asked for a
slower journey). Before an accepted battle a readiness beat (1.2 s × the
adventure animation speed; skipped at Instant, for monsters and hidden
heroes) plays the **`prepare`** strip when delivered (once, holding its last
frame) — else the rider rises a little — and a map spell plays the caster's
**`cast`** strip when delivered (else only the sigil). The rules are
untouched. Wandering monsters and site guards use their creature's `idle`
strip, drawn smaller. `prepare` and `cast` are ordered in
`GPT6_BRIEF_11_MAP_HERO_ANIMATIONS.md` (one sheet per pantheon: five
directions × 6 + 6 frames), cut by `npm run sprites:cut -- --only sheet.heroanim.<pantheon>` and imported by
`npm run sprites:import` (6 fps, played once).

**`prepare` and `cast` delivered (owner delivery
`gods_heroes_towns_delivery_2026-10-04`, 60 strips).** Every pantheon avatar
has both in the five drawn directions (`e`, `ne`, `n`, `s`, `se`; `w`, `nw`,
`sw` mirror `e`, `ne`, `se` on the same ground anchor): 6 frames at 6 fps,
`loop: false`, each strip with its own frame size (1500 × 232 px strips of
250 × 232 frames), anchor and 90 px per hex (calibrated to the idle
avatar's height). `prepare` holds five poses and repeats the ready pose. In
the game the beat plays `prepare` once on the beat's clock and **holds the
ready pose until the map closes for the battle**; an abandoned encounter
(leaving the map, the battle gone) puts the hero back to `idle`, and a second
request while a beat is pending is skipped. A map spell — Homecoming
included — plays `cast` once with the spell's own effects, then `idle`.
Direction never changes during either. Checked frame by frame in SwiftShader
captures for all six pantheons in six directions (`e`, `ne`, `nw`, `w`, `sw`,
`se`; `n` and `s` are not neighbour directions on the map and are covered by
`sprites.test.ts`).

## 13. Large painted art (story, ground and sky, big moments)

Three production briefs for an image generator live in
`assets-source/art/briefs/` (`GPT6_BRIEF_1_STORY_ART.md`,
`GPT6_BRIEF_2_GROUND_AND_SKY.md`, `GPT6_BRIEF_3_BIG_MOMENTS.md`, 2026-10-02):
a style bible built on the owner's references, a description of every image,
its size and its file name. Delivered files go into
**`assets-source/art/final/`**, named by asset ID plus `.png` (the same rule as
the icons in §11), and are imported with **`npm run art:import`**
(`tools/assets/import_story_art.py`, a development tool; see "Story art in the
game" below). A fourth brief, `GPT6_BRIEF_4_GOD_PORTRAITS.md`, covers the 60
god portraits (1024 × 1024, round crop); those are icons-catalog portraits and
go into `assets-source/icons/final/` with `npm run icons:import`. A fifth,
`GPT6_BRIEF_5_CREATURES.md`, asks for every creature form (102): four
**canonical reference views** (three-quarter, front, side, top; 1024 × 1024,
transparent, neutral pose and light; written for a later modelling step that
the 2D migration of 2026-10-03 replaced — they are now the drawing
reference for the 2D strips), kept in `assets-source/creatures/reference/`
and never read by the game at run time, and the
**painted portrait** shown in the panels (`creature.….portrait`, into
`assets-source/icons/final/`, imported at 256 × 256 by `npm run icons:import`).
First part delivered 2026-10-03: forms 001–043 (215 of the 510 images; see
"Creature portraits" in §11 and `assets-source/creatures/reference/README.md`).
A sixth, `GPT6_BRIEF_6_PANTHEON_EMBLEMS.md`, covers the six pantheon emblems
(`emblem.<pantheon>`, 1024 × 1024 transparent crests with six different
silhouettes, readable at 18 px; into `assets-source/icons/final/`, imported at
256 × 256 by `npm run icons:import`). The game shows every pantheon emblem
through one component (`Emblem`, `components/art.tsx`: setup cards and rival
chips, random-map seats, the Encyclopedia's pantheon dividers, the Pantheon,
Town, Kingdom Overview and hero screens, world dialogs, the summary and high
scores), so the delivered files replace the generated stand-in everywhere at
once. Delivered 2026-10-03: all six (1024 × 1024, imported at 256 px). A seventh, `GPT6_BRIEF_7_CURSORS.md`, covers 24 context mouse cursors
(128 × 128 masters with hotspot rules, into `assets-source/ui/cursors/`). All 24
were delivered on 2026-10-03 and are in the game — see *Mouse cursors* below.

Four more briefs (2026-10-04), generated from the content by
**`npm run art:briefs`** (`tools/assets/briefs/`, a development tool), ask for
sheets in the §4 sheet format and write their layouts to
`assets-source/sprites/sheet-layouts.briefs.json`:

* `GPT6_BRIEF_8_GODS_AND_ICONS.md` — the 60 god portraits again as six sheets
  (one per pantheon, 4 × 3 cells of 384 px, cut into
  `assets-source/icons/final/god.….portrait.png`, then `npm run icons:import`),
  and **21 god-card icons** on one transparent 5 × 5 sheet
  (`icon.bless.*`, `icon.req.*`, `icon.god.*`; list in
  `tools/assets/briefs/godIcons.ts`).
* `GPT6_BRIEF_9_HERO_PORTRAITS.md` — the 74 hero portraits
  (`hero.<pantheon>.<hero>.portrait`), one sheet per pantheon (4 columns of
  384 px cells), with the dialogue bust attached where one exists.
* `GPT6_BRIEF_10_TOWN_BUILDING_LEVELS.md` — one picture per level for the
  locations whose levels share one painting today (Civic Hall 4, Temple 2,
  Mage Guild 3, Fortifications 3; 72 pictures), one 4 × 4 sheet per pantheon,
  cut into `assets-source/art/final/<level asset ID>.png` and imported by
  `npm run art:import` (kind `building`: transparent, at most 512 px, into
  `assets-runtime/art/town/`). The town shows the exact level's picture
  first, so a delivery needs no code change.
* `GPT6_BRIEF_11_MAP_HERO_ANIMATIONS.md` — the map heroes' `prepare` and
  `cast` strips (§12).

**Briefs 8–11 delivered (2026-10-04, `gods_heroes_towns_delivery_2026-10-04`,
287 assets; the owner copied them in with the delivery's own scoped
`copy_to_project.py`, which merges only the delivered IDs into the three
manifests).** 60 god portraits and 74 hero portraits (painted, 256 × 256
WebP in `assets-runtime/ui/icons/final/`), 21 god-card icons (transparent
PNG; eight of them were cut at their native 192–250 px and are not enlarged),
72 town building levels (`town.<pantheon>.support.<building>.lN`, 320 × 320
transparent cutouts in `assets-runtime/art/town/`) and the 60 `prepare` /
`cast` strips (§12). No higher-resolution painted detail is claimed; the
delivery's `asset-index.json` records every source and runtime size and hash.
The portraits reach every screen through `GodPortrait` / `HeroPortrait`
(god choice and Pantheon screen, Encyclopedia, Tavern, map hero list, hero
screen, encounters, story lists and — new — the battle header beside each
commanding hero's name); the town picks each location's exact level picture
(`resolveBuildingArt`), drawn in proportion with its transparency.

**God-card icon rows** (`components/godIcons.tsx`, Pantheon screen and
Encyclopedia): each blessing is a token of *who* (`icon.bless.commanders`,
`armies`, `creatures`, `shooters`, `flyers`) or *what* (`growth`, `recovery`,
`spell_unlock`, `daily_income`, `offering`, `fury`) with the existing
attribute, morale, luck, movement, vision, mana and resource icons and the
definition's number; the price is the Favor icon and cost, then
`icon.req.temple` / `grand_temple` (temple level 1 / 2), `city_hall` (civic
hall) and `after_first` per requirement; the state chips carry
`icon.god.patron`, `first_choice`, `second_choice`, `committed` and
`excluded`, and the choice rule `icon.god.permanent`. Every token's tooltip and
screen-reader text is the content's own sentence (`benefitSummary`, the
requirement, the quote's reason), so no number or condition is lost;
`godIcons.test.tsx` checks this for every god. Patrons without a mechanical
blessing keep their sentences.

| Group | Files | Size | Asset ID pattern |
|---|---|---|---|
| Dialogue portraits (half-body, transparent) | 35 | 1024 × 1536 | `hero.<pantheon>.<character>.bust` (the speaker's `portraitAssetId` with `.portrait` → `.bust`) |
| Campaign covers | 6 | 2560 × 1440 | `campaign.<campaign>.cover` |
| Ending pictures | 11 | 2560 × 1440 | `ending.<campaign>.<epilogue flag>` (`ending.three_beacons.epilogue`) |
| Mission pictures | 40 | 1920 × 1080 | `mission.<campaign>.mNN.thumbnail`, `mission.skirmish.twin_harbors.thumbnail`, `mission.skirmish.random.thumbnail` — the existing thumbnail IDs; the 640 × 360 card is made from them |
| Ground textures (seamless) | 60 | 1024 × 1024 | `terrain.<biome>.<terrain>` (10 biomes × 6 terrains) |
| Battlefield grounds | 6 (+18 optional) | 4096 × 3200 | `battlefield.<archetype>.ground` (`.desert` / `.tundra` / `.jungle` variants) |
| Sky backdrops | 10 | 4096 × 1536 | `sky.<biome>` |
| Miracle cards | 14 | 1024 × 1536 | `intervention.<interventionId>.card` |
| Victory / defeat splashes | 12 | 1920 × 1080 | `splash.<pantheon>.victory`, `splash.<pantheon>.defeat` |
| Level-up banners (transparent) | 6 | 1536 × 512 | `banner.level_up.<pantheon>` |
| New-week banners (transparent) | 9 | 1536 × 512 | `banner.new_week`, `banner.week.<weeklyEventId>` |

### Story art in the game (first delivery, 2026-10-02)

The owner's delivery `blannder_models\story_art_delivery_2026-10-02\` (92 PNGs
for Brief 1: 35 busts, 6 covers, 11 endings, 40 mission pictures) was **copied**
into `assets-source/art/final/` with the exact names (the folder held only its
README; SHA-256 of all 92 match the delivery manifest). The originals stay
where they were; the game never reads the delivery folder, its manifest or any
generator cache.

**Sizes.** Busts are 1024 × 1536 RGBA as requested. The 57 landscape pictures
are **native 1672 × 940/941** — below the brief's 2560 × 1440 (covers, endings)
and 1920 × 1080 (missions). The owner's resize-only export decision is pending,
so nothing was upscaled: the runtime copies are the native size.

**Import** (`npm run art:import`): sources are never modified; derivatives are
never larger than their source and keep the aspect ratio.

| Source | Runtime file (`assets-runtime/art/`) | Asset ID |
|---|---|---|
| `hero.<p>.<c>.bust.png` | `busts/<id>.webp`, 768 × 1152, transparency kept | `hero.<p>.<c>.bust` |
| `campaign.<c>.cover.png` | `covers/<id>.webp`, native size | `campaign.<c>.cover` |
|  | `cards/campaign.<c>.thumbnail.webp`, 640 × 360 | `campaign.<c>.thumbnail` (the campaign's `thumbnailAssetId`) |
| `ending.<c>.<e>.png` | `endings/<id>.webp`, native size | `ending.<c>.<e>` |
| `mission.<…>.thumbnail.png` | `missions/mission.<…>.briefing.webp`, native size | `mission.<…>.briefing` |
|  | `cards/<id>.webp`, 640 × 360 | `mission.<…>.thumbnail` (the mission's `thumbnailAssetId`) |

Cards are a centred 16:9 crop (at most one pixel row from the 1672 × 941
paintings), then reduced. WebP quality 78–82; 138 runtime files, 33.4 MB.
`assets-runtime/art/manifest.json` (24 KB, read by `resolveAsset` and
`resolveArt` in `packages/ui/src/assets/manifest.ts`) lists file, kind, size and
— for busts — the visible (non-transparent) bounds. Sources, SHA-256, crops
and notes are in `assets-source/art/IMPORT_REPORT.json` (not packaged).

**Where they appear** (all presentation; the map camera and movement are
unchanged):

* **Busts** — the story dialogue window, the briefing scene and the epilogue:
  the current speaker's bust stands beside the dialogue box (wide windows) or
  behind its edge, contain fit, its visible lower edge on the box's lower
  edge. The campaign hero speaks from the left; other speakers take the sides
  in order of first appearance; a bust on the right is mirrored. No frame.
  Dialogue lists (Journal, debrief, backlog) and the campaign detail show the
  bust in a small 2:3 slot. Lines without a bust keep the square portrait.
* **Covers** — behind campaign selection and the campaign's Pantheon and
  Patron steps (under a scrim; the UI draws every title and button). The cards
  head each campaign's list entry.
* **Mission pictures** — the full-screen briefing scene (the bottom 30 % holds
  the dialogue), and the 640 × 360 cards in the campaign's mission list, the
  skirmish list and detail (one Twin Harbors picture for every pairing) and the
  Random Map screen.
* **Endings** — only the finished campaign's chosen ending, behind its
  epilogue (`campaignEndingArtId`: the same variant `campaignEpilogueLines`
  plays; The Three Beacons' single epilogue picture otherwise; a campaign with
  two endings and no choice shows none). The dialogue keeps to the bottom
  quarter.

To replace a picture, drop the new PNG under the same name into
`assets-source/art/final/` and run `npm run art:import`.


### Ground and sky in the game (Brief 2, first delivery, 2026-10-02)

The owner's art project copied the 76 PNGs (60 terrain, 6 battlefields, 10
skies) straight into `assets-source/art/final/` of this game; SHA-256 of all 76
match the delivery's `manifest.json`. Nothing reads the art project's folders.

**Sizes and seams (measured, not production-ready).** Terrain 1254 × 1254
(brief 1024²), battlefields 1419 × 1108 (brief 4096 × 3200), skies 2048 × 768
(brief 4096 × 1536). The delivery reports terrain edge discontinuities
(edge/inside difference 1.2–2.7 ×, worst on the ten water textures) and sky
left/right seams; no seam finishing has been done, and the game does **not**
claim them seamless. The exact-size export is the owner's open decision; the
importer never enlarges.

**Import** (`npm run art:import`, the same tool as the story art):

| Source | Runtime file (`assets-runtime/art/`) | Notes |
|---|---|---|
| `terrain.<climate>.<ground>.png` | `terrain/<id>.webp`, 1024 × 1024 (reduced from 1254, a power of two for mipmaps) | average colour, `wrap` |
| `battlefield.<b>.ground[.<climate>].png` | `battle/<id>.webp`, native 1419 × 1108 | average and far-margin colours |
| `sky.<climate>.png` | `sky/<id>.webp`, native 2048 × 768 | horizon 0.62 (the brief's target, approximate in this delivery), sky and haze colours |

76 runtime files, 28.1 MB. `wrap` is `mirror` for every terrain and sky until
its seams are checked: list verified IDs in `assets-source/art/seamless-verified.txt`
and re-import to switch them to a plain repeat (owner decision 2026-10-02:
mirrored repeat until finished art arrives).

**Where they appear** (presentation only; `@pr/presentation/core`
`registerEnvironmentArt`, filled by the interface's manifest; drawn by the
PixiJS views since the 2D migration):

* **Adventure map** — each ground type of the map's climate (`map.biome`)
  fills its hexes with the painting as a repeating pattern in **map space**:
  one texture spans two hexes and continues across neighbouring hexes
  (mirrored repeat while `wrap` is `mirror`). Fog of war is a dark layer
  above it. Hex sides, roads, rivers, locations, trees (on forest floor) and
  peaks (on mountain rock) are separate layers and sprites. Since
  2026-10-04 the space around the map is black (owner request; no sea). Until a texture has loaded —
  or if one is missing — the hex keeps its flat colour. The minimap keeps
  the brief's colours.
* **Sky** — no longer shown (owner request 2026-10-04: black around the map);
  the ten sky files stay in the game unused. Battles never showed a sky.
* **Battles** — the archetype's painting is the battle's background, fitted
  so the 15 × 11 board lies inside its quiet centre (1500 × 1000 of
  4096 × 3200); the logical hexes are an overlay on it (deployment columns
  darker, moat and paved town cells in their colours, grid optional). Image
  top = far side (coast sea, plateau chasm and beacon base at the top; ridge
  walls left and right). Beyond the painting, the view takes the colour of
  its far margin. **Climate paintings** (`battlefield.<b>.ground.<climate>`):
  all 54 — the six archetypes in the nine climates other than temperate —
  were delivered on 2026-10-04 (native 1419 × 1108, the proportions of the
  4096 × 3200 layout; not enlarged) and are chosen from the map's climate;
  temperate and unknown climates keep the default painting.

### Big moments in the game (Brief 3, first delivery, 2026-10-02)

The owner's art project copied the 41 PNGs (14 miracle cards, 12 splashes, 6
level-up and 9 new-week banners) into `assets-source/art/final/`; SHA-256 of
all 41 match the delivery's `manifest.json`. Nothing reads the art project's
folders.

**Sizes (measured).** Miracle cards 1024 × 1536 (as the brief). Splashes
1672 × 941 (one 1672 × 940; brief 1920 × 1080). Banners 2172 × 724 (brief
1536 × 512, same 3:1 shape). 27 files differ from the brief's sizes; the
exact-size export of the masters is the owner's open decision and has **not**
been done here. Banners have real transparency; cards and splashes are opaque.

**Import** (`npm run art:import`; display derivatives only — the masters are
untouched, nothing is enlarged, aspect ratios kept):

| Source | Runtime file (`assets-runtime/art/`) | Notes |
|---|---|---|
| `intervention.<id>.card.png` | `miracles/<id>.webp`, 768 × 1152 (reduced) | opaque |
| `splash.<pantheon>.<victory\|defeat>.png` | `splashes/<id>.webp`, native 1672 × 941/940 | opaque, not enlarged to 1920 × 1080 |
| `banner.level_up.<pantheon>.png`, `banner.new_week.png`, `banner.week.<event>.png` | `banners/<id>.webp`, 1536 × 512 (reduced from 2172 × 724) | transparency and transparent padding kept (never cropped); the blank plaque is **measured per file** (`plaque`, fractions) because the generated variants differ slightly |

41 runtime files, 10.1 MB.

**Where they appear** (presentation only; built from committed events, so an
effect is never applied twice and nothing replays on load; asset IDs follow
the brief from content IDs — `packages/ui/src/assets/momentArt.ts`):

* **Miracle card** — when a divine intervention is invoked (after the rules
  accepted it: Favor, once per week, target): the viewer's own, on the map or
  in battle, and an opponent's battle miracle in the viewer's battle (map
  miracles of other empires stay hidden). The painting rises into the kit's
  gold panel frame (corner ornaments, double rim) with the miracle's name on a
  live plate over the bottom 18 %. The 96 px icons stay in the lists and buttons.
* **Victory / defeat splash** — the player's own pantheon (never the
  opponent's), full window behind the battle result (win or loss; a stalemate
  keeps the plain screen), the end-of-game dialogs (skirmish result, mission
  failed, mission debrief, campaign complete) and the summary. Titles are live
  text in the painting's calm upper centre (x 30–70 %, y 8–30 %; long titles
  shrink and wrap to two lines), panels and dialogs in the lower half, over the
  existing bottom scrim. Never tiled or mirrored.
* **Level-up banner** — the hero's own pantheon, at the top of the level-up
  screen: "Level up", the hero's name and the new level written on the plaque;
  the emblem above it is left clear. Choices and progression are unchanged.
* **New-week banner** — at the dawn of a new week (day 8, 15, …; the rules'
  `DayStarted`): the weekly event's own banner, or `banner.new_week` when there
  is no event (The Three Beacons) or no picture for it; "Week N", the event's
  name and effect written on the plaque. It replaces the text day banner for
  that day. Once per dawn; never on load or restart.

Timing and dismissal reuse the game's settings: banner times as the existing
day banner (2.2 s; 3.6 s with an event; miracle cards 3.6 s), shortened by the
Adventure animation / Battle speed choices, and counted as time on screen
(frames drawn; a stalled or hidden window does not use it up); a click or Esc
closes a card or banner at once without blocking play.
Reduced motion removes the rise and fade (the motion tokens), not the reading
time. A missing picture leaves the earlier presentation (toast, text banner,
plain result screen, panel title).
