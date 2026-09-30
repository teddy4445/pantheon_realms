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

The neutral Centaur pair (`centaur`, `centaur_sentinel`, 2 hex, ground melee)
uses the same rules. Every non-Greek number is proposed; final roles may
change their required clips (e.g. a shooter needs `attack_shoot`, a flyer
`takeoff`/`fly`/`land`). "base only"/"upgraded only" means the ability is
gained or lost on upgrade, so only that form needs the clips.

Suggested order (production/02 §10): finish the Hoplite pair end to end, then
Peltast, Cavalry and Griffin to prove the humanoid, ranged, mounted and flying
paths, then the rest.
