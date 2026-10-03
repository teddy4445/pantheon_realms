# Asset Pipeline — 3D creature models (artist spec)

_For modellers, riggers and animators delivering creature GLBs. Engine side:
`packages/presentation/src/models.ts`. Source of truth for the rules behind
this sheet: `docs/pantheon-v0.3/production/02_visual_and_animation_pipeline.md`
and `CREATURE_ANIMATION_REQUIREMENTS.md`. Nothing here changes game rules._

**Status of the pipeline (measured, this build):** GLB loading, manifest
binding, clip playback in the bestiary and on the battlefield, the proxy
fallback and validation are implemented and tested with a generated
calibration model. **No production creature model exists yet** — every
creature still shows its procedural placeholder until its GLB is delivered.

---

## 1. Orientation, units, origin

| Rule | Value |
|---|---|
| Format | glTF 2.0 binary (`.glb`), one file per form (base and upgraded separately) |
| Units | **meters** (1 unit = 1 m). A standing human is ~1.8 m tall |
| Up axis | **+Y** in the exported file |
| Front | **+Z** in the exported file (the direction the creature looks and attacks) |
| Handedness | Right-handed (glTF standard). The game loads models into right-handed scenes, so no conversion is applied |
| Origin / root | At the feet — the ground projection of the body centre. Flying forms keep the same ground anchor; altitude is presentation |
| Blender | Author Z-up, facing **−Y**, and export with the standard glTF exporter "+Y Up" option. Apply scale/rotation **before** binding the skeleton. No negative scale / mirroring |

Do not add a "correction" rotation in the file. Check your export against the
calibration model instead (§7): its red arrow points to the front, its blue
block sits on the model's +X side (the creature's **left** when it faces +Z).

## 2. Size on the battlefield

The rules decide how many hexes a creature occupies (1 or 2); the model never
changes that. On the battle board one hex has a radius of 1 unit, and figures
are drawn at **0.6 × authored size** (`BATTLE_MODEL_SCALE`), so a 1.8 m soldier
reads ~1.1 units tall — the same as today's placeholders. The bestiary shows the
model at its true size.

* **One-hex creatures:** keep the body within a ~1.2 m radius of the root.
* **Two-hex creatures:** the game centres the model between its two cells;
  keep it within ~2.6 m along the front axis and ~1.4 m sideways. If the rig's
  root is not at the body centre, set `visualOffset` in the manifest (meters;
  presentation only — it never moves hit areas or reach).
* Large wings or tails may overhang visually; selection and landing still use
  the rules' cells.
* Stacks show a bounded formation: up to 3 small soldiers, 2 medium creatures,
  or 1 apex creature. The unit count is shown as a label.

## 3. The eight animation states (clip names)

The game plays clips **by these exact names** (they are bound in the manifest,
so a different name is possible, but please use these):

| Semantic state | Clip name | Loop | Typical length | Notes |
|---|---|---|---|---|
| Idle | `idle_a` | loop | 2–4 s | Breathing, weight shift. Ends must match |
| Move | `move_walk` | loop | 0.7–1.3 s per cycle | **In place** (no root motion); the game moves the figure along the path |
| Melee | `attack_melee_a` | once | 0.8–1.4 s | Anticipation, contact, recovery. Also used for retaliation. Put the contact frame in `impactAt` (0–1) |
| Ranged | `attack_shoot` | once | 0.8–1.4 s | **Shooters only.** Prepare/aim, release, recover. Release frame in `releaseAt`. The projectile is a separate game object launched from the `projectile` socket |
| Defend | `guard` | loop (or held pose) | ~1 s | A readable brace, distinct from attack wind-up |
| Hit | `hit_a` | once | 0.2–0.45 s | Reaction to damage already decided by the rules |
| Defeat | `defeat` | once, **never loops** | 1–1.8 s | The game holds the last frame |
| Victory | `victory` | once | 1.5–2.5 s | End-of-battle flourish; may be skipped |

Extra clips when they apply:

* **Flyers** (Griffins, Valkyries, Tengu, Bennu, Camazotz, …): `takeoff` (once), `move_fly` (loop, bound
  as `fly`), `land` (once); `move_walk` covers short ground moves.
* **Active abilities**: `ability_<id>`, e.g. `ability_family_ward` for the
  Temple Seer, the Runic Jotunn and the other warders listed in §9. Passive
  traits need no clip.
* The Cyclops' wall battering reuses `attack_shoot`.

Sample at 30 fps. Both forms of a family should share the rig and clips where
the anatomy allows; each form must still pass the checks on its own.

## 4. Files and folders

```text
assets-src/units/<pantheon>/<familyId>/     # NOT shipped: .blend, textures, review renders
assets-runtime/units/<pantheon>/<familyId>/
  base/model.glb
  base/portrait.webp            # optional until portraits are rendered from the model
  upgraded/model.glb
  upgraded/portrait.webp
  family.manifest.json          # binds the files to creature IDs (below)
```

Everything under `assets-runtime/units` is bundled into the game build (no
downloads at runtime). Keep source files out of `assets-runtime`.

## 5. The family manifest

```json
{
  "schema": "pantheon-realms-unit-family",
  "schemaVersion": 1,
  "familyId": "hoplite",
  "pantheonId": "greek",
  "forms": {
    "base": {
      "assetId": "unit.greek.hoplite.base",
      "creatureId": "hoplite",
      "form": "base",
      "status": "exported",
      "model": "base/model.glb",
      "portrait": "base/portrait.webp",
      "rigId": "rig.hoplite.v1",
      "scale": 1,
      "visualOffset": [0, 0, 0],
      "sockets": { "projectile": "socket_projectile" },
      "clips": {
        "idle":    { "name": "idle_a", "loop": true },
        "move":    { "name": "move_walk", "loop": true },
        "melee":   { "name": "attack_melee_a", "loop": false, "impactAt": 0.52 },
        "defend":  { "name": "guard", "loop": true },
        "hit":     { "name": "hit_a", "loop": false },
        "defeat":  { "name": "defeat", "loop": false },
        "victory": { "name": "victory", "loop": false }
      },
      "provenanceId": "provenance.hoplite.v1"
    },
    "upgraded": { "...": "same shape, creatureId veteran_hoplite" }
  }
}
```

* `creatureId` must be the game ID from the table in §9 — **not** the display name.
* `scale` is a per-asset correction (normally `1`; the file is already in meters).
* `sockets` name empty nodes in the GLB (e.g. `socket_projectile` at the hand
  or mouth).
* `status` follows `briefed → concept_approved → modeled → rigged → animated →
  exported → integrated → verified`. A file existing is not verification.

## 6. Export rules and budgets

* glTF 2.0 binary; textures embedded (PNG or JPEG). Up to 4 bone influences per vertex.
* **No Draco, Meshopt or KTX2/Basis compression.** Their decoders would be
  downloaded from a CDN and the desktop game runs offline. The validator
  rejects these files.
* Do not rely on the first animation auto-playing; the game starts clips itself.
* Starting budgets (production/02 §6 — to be measured, not guarantees):

| Asset class | LOD0 triangles | Other |
|---|---|---|
| Human infantry / caster | 6,000–12,000 | 1–2 materials, ≤ 64 deform bones, mostly 2K textures |
| Rider / centaur | 16,000–28,000 | ≤ 96 bones (combined rig) |
| Griffin / winged | 18,000–30,000 | ≤ 96 bones; review feather overdraw |
| Large (Minotaur, Cyclops, Troll, Jotunn, Wyrm) | 12,000–24,000 | Strong silhouette, few accessories |

## 7. Checking your delivery

1. `npm run assets:calibration` regenerates the calibration fixture
   (`assets-runtime/units/_calibration/forward_arrow/`): a 1.8 m post, a red
   arrow to +Z, a blue block on +X, a 1 m footprint disc, and all eight clips as
   simple motions. Import it next to your export in Blender or any glTF viewer:
   heights, front and sides must agree.
2. `npm run assets:check` runs the Khronos glTF Validator on every model,
   checks every bound clip/socket and the forbidden extensions, writes
   `<form>.validation.json` beside the manifest (with the validator version),
   then runs the game-binding tests (creature ID and form exist, shooters bind
   `ranged`, flyers bind `takeoff`/`fly`/`land`, and a headless load checks
   meters, +Y and +Z).
3. In the game: **Bestiary → the creature**. The viewer label reads
   `GLB model · <status>` when your file loaded, or says it fell back to the
   placeholder (the reason is in the developer console under `[models]`).
   Try every state with Play / Pause / Stop / Restart at 0.5×, 1× and 2×; states
   without a clip are disabled with the reason.
4. Start a battle with that creature to see the formation, facing (attackers
   face right, defenders left) and playback at battle speed.

A validator pass proves the file is well-formed — not that the deformation,
art quality or frame rate are good. Those still need a review in the game.

## 8. What happens when something is missing

* No manifest for a creature → the procedural placeholder is shown (labelled as such).
* Manifest present but the file fails to load or validate → placeholder, plus a
  `[models]` warning with the reason.
* A required clip is missing → the bestiary disables that state with a reason;
  on the battlefield that state falls back to the placeholder motion on the model.

## 9. Creature IDs to bind (all six pantheons)

| Pantheon | Tier | Family ID | Base creature ID | Upgraded creature ID | Footprint | Flies | Shoots | Active ability clips |
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

Shooters now have a shooting range in hexes (proposed values in each
creature's statistics; Encyclopedia and creature details show it). Every non-Greek number is proposed; final roles may
change their required clips (e.g. a shooter needs `attack_shoot`, a flyer
`takeoff`/`fly`/`land`). "base only"/"upgraded only" means the ability is
gained or lost on upgrade, so only that form needs the clips.

Suggested order (production/02 §10): finish the Hoplite pair end to end, then
Peltast, Cavalry and Griffin to prove the humanoid, ranged, mounted and flying
paths, then the rest.

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

Files: Ogg Vorbis (`.ogg`), 44.1 kHz; music and ambience stereo, effects
mono. Loops must loop seamlessly (no silence at either end). Keep editable
masters and source provenance outside the runtime folder. Test decoding in
the desktop build and a Chromium browser — `npm run test:e2e` decodes every
file in the manifest. Never reference a URL: files must be bundled.

Sound IDs by use (the full list is `REQUIRED_SOUND_IDS` in
`packages/ui/src/audio/sounds.ts`, and a unit test fails if one is missing):

* Music: `music.menu`, `music.explore.<soundscape>` (`coast`, `high_pass`,
  `storm_plateau` — each mission names its soundscape), `music.battle`,
  `music.resolution`.
* Stingers: `stinger.victory`, `stinger.defeat`, `stinger.levelup`,
  `stinger.beacon`.
* Ambience: `amb.<soundscape>`, `amb.battlefield`.
* Interface: `ui.click`, `ui.open`, `ui.close`, `ui.confirm`, `ui.error`,
  `ui.coins`, `ui.build`, `ui.recruit`, `ui.endday`, `ui.newday`,
  `ui.newweek`, `ui.pickup`, `ui.capture`, `ui.divine`, `ui.objective`,
  `sfx.steps` (loop).
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
`MarkerIcon` in `components/art.tsx`); the 3D map itself is unchanged.

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
Blender-project handoff folder into `assets-source/icons/final/` (unmodified
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
delivered. The 172 matching model-reference views are in
`assets-source/creatures/reference/` with the delivery's modelling notes
(`delivery-notes/`); the game does not read them.

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

## 12. Mounted adventure-map heroes (six animated GLBs)

The six mounted heroes — rider and mount in one skinned model per pantheon —
come from the separate Blender asset project (on the owner's computer:
`C:\Users\lazeb\Desktop\blannder_models`, release `MountedHero_Animations_v1`).
They were **copied** into the game on 2026-10-01; the game never reads,
links or imports anything from the Blender project, and the Blender
sources (`.blend`) are not part of the game (they are only needed to edit
the models).

| Copied from the Blender project | Game copy |
|---|---|
| `runtime\models\heroes\animated\hero_<pantheon>.glb` (six files) | `assets-runtime/heroes/<pantheon>/hero_<pantheon>.glb` (byte-identical; SHA-256 as in the manifest) |
| `animation_manifest.json` | `assets-runtime/heroes/animation_manifest.json` — paths rewritten for the game (`assets[].runtime`, `skeleton.contract`, `integration_guide`) plus a `game_copy` block naming the source; `assets[].source`, `assets[].validation` and `combined_source` still name files in the Blender project and are never read |
| `assets\characters\heroes\shared\mounted_hero_animated_rig.json` | `assets-runtime/heroes/shared/mounted_hero_animated_rig.json` (identical; the 44-bone `MountedHero_v1` contract) |
| `HERO_ANIMATION_REPORT.md` | `assets-source/heroes/HERO_ANIMATION_REPORT.md` (identical text under a short "game copy" note) |

**Loading.** `packages/ui/src/assets/manifest.ts` imports the copied manifest
and registers one entry per pantheon (`heroModelEntriesFromManifest`,
`packages/presentation/src/modelRegistry.ts`) with the URL
`./heroes/<pantheon>/hero_<pantheon>.glb`. Vite serves `assets-runtime/` as
the public folder, so the same relative URL works in `npm run dev`, the
browser build and the desktop package (no CDN, no hashed duplicate). Before a
model is used, the GLB's JSON is checked: the three clips by exact name, a
skin, no extension whose decoder would come from a CDN. A model that fails to
load leaves the hero's earlier placeholder rider in place.

**Placement.** `MountedHeroCache` (`packages/presentation/src/mountedHeroes.ts`)
loads each GLB once per map scene and instantiates an independent copy per
hero (own nodes, skeleton and animation groups). Orientation and scale are set
on a container node only: the model's +Z front is turned to the map figure's
+X front (`rotation.y = π/2`), one uniform scale `MOUNTED_HERO_SCALE = 0.36`
for all six (1 model metre = 0.36 map units; measured heights 1.28–1.43 map
units, a hex is 1.73 wide), and the manifest's −0.02 m ground offset. The
entity node (position, facing) belongs to the map; the hierarchy, skin
weights, materials and vertex colours inside the model are untouched. Each
hero keeps an owner-coloured banner and a translucent owner-coloured base disc
so faction ownership stays visible; the selection ring is unchanged.

**Animation policy** (configured in the game — glTF carries no loop flags or
events):

| Clip | Game use |
|---|---|
| `Idle_Standing` (4 s) | loops while the hero stands; each instance starts at a random phase |
| `Walk` (1.6 s, in place) | loops while the map moves the entity; the entity faces each step; rate = speed ÷ (0.75 × 0.36), **capped at 3.5** (see below); 0.2 s crossfades in and out; back to idle when the move ends |
| `Prepare_War` (2.4 s) | plays once (no loop) on the attacking hero after an accepted encounter, holds the last pose; the battle screen opens from the clip's own end event, once |

Walk speed: the map moves a hero 1 hex (1.73 map units) per 210 ms at normal
adventure speed, 8.25 map units/s. The formula then asks for a playback rate
of about 30.5 (×2.2 at "fast"), which would be an unreadable blur, so the rate
is capped at 3.5 and the hooves slide. Slowing the map pace to match the clip
would make a 1-hex step take ~6 s at rate 1; that is a design decision for the
owner, not taken here.

**Battle flow.** Encounter dialog → **Attack** commits the move through the
rules (unchanged). The presentation plays the approach move (Walk), stops the
hero on its approach tile, turns it — and a defending mounted hero — to face
the opponent, plays Prepare_War, and only then lets the battle screen open
(`AppStore.routeAfterUpdate` waits for the presentation step). The hero
holds the ready pose until the map is replaced by the battle screen (which
then shows its own loading state while the battlefield builds). **Withdraw** cancels before
anything is committed. If the encounter goes away while the gesture plays
(another game loaded, Main Menu, Restart Mission) the completion is ignored
and the hero blends back to idle. The gesture is skipped (battle opens at
once, as before) when adventure animation is instant or reduced motion is on,
when the attacker is a monster or out of sight, or when no human side takes
part.

**Replacing a model.** Copy the new GLB over the game copy, update its
`runtime_sha256` (and `runtime_bytes`) in `assets-runtime/heroes/animation_manifest.json`,
and run `npm run assets:check` (Khronos validator, checksums, clips, skin)
and `npx playwright test tests/e2e/heroes.spec.ts`.

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
**model-reference views** (three-quarter, front, side, top; 1024 × 1024,
transparent, neutral pose and light) for the later 3D step, kept in
`assets-source/creatures/reference/` and never read by the game, and the
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

Hero portraits: a hero without a portrait of its own (`hero.….portrait`, none
delivered yet) shows its painted dialogue bust when one exists, framed on the
head and shoulders in the square portrait frame — 20 of the 62 heroes (the six
campaign heroes, Hervor among them, and 14 campaign opponents). The other 42,
29 of the 30 hireable heroes among them, keep the generated stand-in until
hero portraits are delivered.

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
`registerEnvironmentArt`, filled by the interface's manifest; the map camera's
fixed angle, panning and zoom are unchanged):

* **Adventure map** — each ground type of the map's climate (`map.biome`) is
  its own mesh with **world-space UVs**: one texture spans two tiles
  (2√3 world units) and continues across neighbouring tiles; mipmaps,
  trilinear and 8× anisotropic filtering. Fog of war dims the texture through
  the vertex colours. Hex sides, roads, rivers, sites, trees (on forest floor)
  and peaks (on mountain rock) stay separate. The sea around the map shows the
  climate's water, darkened. Until a texture has loaded — or if one is
  missing — the tile keeps its old flat colour. The minimap keeps the brief's
  colours.
* **Sky** — the fixed camera never looks up to the horizon, so the climate's
  sky stands as a backdrop 4 units past the **north edge of the map** (owner
  decision 2026-10-02): unlit, proportions kept (150 world units per panorama),
  horizon 1.2 units above the sea, clamped vertically and repeated sideways
  (mirrored). Seen whenever the view reaches the north edge. Temperate is the
  fallback. Battles show no sky (the painting fills the view to its top edge).
* **Battles** — the archetype's painting is drawn once (clamped) across the
  ground, straight down, the 15 × 11 board fitted inside its quiet centre
  (1500 × 1000 of 4096 × 3200); the board's cell tops show the same painting,
  deployment columns 10 % darker, moat and town cells keep their colours.
  Image top = far side (coast sea, plateau chasm and beacon base at the top;
  ridge walls left and right). Beyond the painting, the ground takes the
  colour of its far margin. Climate variants (`battlefield.<b>.ground.<climate>`)
  are used automatically if they are ever delivered.

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
