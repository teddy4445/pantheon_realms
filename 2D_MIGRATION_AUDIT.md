# 2D migration audit (Phase 1)

> **Record of the state before the migration.** Every mention below of
> Babylon.js, GLB/glTF, Blender, meshes, skeletons, rigs or 3D names what was
> found and removed — obsolete since 2026-10-03 (outcome: §8).

Owner directive of 2026-10-03, *2D Presentation Migration Directive*: the game
moves from a Babylon.js 3D presentation to a high-resolution pre-rendered 2D
presentation drawn with **PixiJS**. Rules, AI, content, saves, campaign, map
generation, pathfinding and the React interface stay. This file is the
repository audit the directive asks for before anything is deleted or created:
every relevant package, file and asset classified as **KEEP**, **ADAPT**,
**REMOVE** or **MISSING**, from the actual repository contents.

## 0. How the audit was made

* **Repositories inspected.** The development copy (owner commit
  `277fb7e more visuals` plus bundle 11) and, on the owner's computer, the
  owner's folder `C:\Users\lazeb\Desktop\pantheon_realms` (tracked tree listed
  with `git ls-tree -r -l HEAD`: 2,150 files). 117 files exist only in the
  owner's folder (the owner's development toolkit: `.claude/skills/`,
  `individual-skills/`, `docs/pantheon-v0.3/`, `docs/tooling/`,
  `tools/pantheon-dev/`, `CLAUDE_TOOLING.md`, `CREATURE_ANIMATION_REQUIREMENTS.md`,
  `PANTHEON_REALMS_LOGICAL_ARCHITECTURE.md`, `PANTHEON_TOOLKIT_README.md`,
  `LICENSE`); they were copied into the development copy byte for byte
  (117 of 117 blob hashes match) so the migration covers them too. 172 creature
  reference views (`assets-source/creatures/reference/*.png`) and 34 concept
  boards (`support images/`) are also in the owner's folder; the views and
  boards that matter here were read from there.
* **Searches run.** Every source file, document, manifest and asset folder was
  listed; the directive's stale-term search (Babylon, GLB, glTF, Blender, mesh,
  skeleton, armature, 3D model, SceneLoader, ArcRotateCamera) was run over the
  whole tree before any change (results in §5). Images were opened and checked
  (contact sheets of the creature views, the hero boards, the map-marker sheet,
  the town building crops).
* Nothing was deleted or created before this audit was written.

## 1. Summary

| Class | What |
|---|---|
| **KEEP** | All simulation packages (`rules`, `content`, `mapgen`, `campaign`, `ai`, `session`, `testing`, `platform`, `audio`); the React interface (all 17 screens, the shared kit, overlays, cursors, sound wiring); Electron and the browser build; every 2D image already in the game (painted terrain, skies, battlefields, story art, big moments, 221 final icons and 43 creature portraits, 6 emblems, 24 cursors, 96 interface icons, 11 opening backgrounds, logo and frame, 156 town building/background placeholders); the source sheets and boards they came from. |
| **ADAPT** | `@pr/presentation` (adventure map, battle, bestiary viewer, engine host, graphics presets, palette, environment art); the interface files that host or feed those views (`SceneHost.tsx`, `Adventure.tsx`, `Battle.tsx`, `UnitDetail.tsx`, `Hero.tsx`, `view.ts`, `assets/manifest.ts`, `index.ts`, `Settings.tsx`, `preferences.ts`, `graphicsProbe.ts`, sounds); the creature presentation reference `modelAssetId`; build configuration (`vite.config.ts`, boundary lint, desktop smoke, load-time tool); e2e tests that read the 3D camera or hero rigs; Brief 5 (reference views are still the canonical 2D references); active documentation; the owner's toolkit skills and contract that name Babylon/Blender/glTF. |
| **REMOVE** | Babylon.js (`@babylonjs/core`, `@babylonjs/loaders`), `@gltf-transform/core`, `gltf-validator`; 3D scene code (`meshkit`, `proxies`, `models`, `modelRegistry`, `mountedHeroes`, `contactShadow`, `artTextures`, 3D `animations`, `viewer`, `heroFigure`); 7 GLB files (6 mounted heroes, 1 calibration arrow) and their manifests/rig contract; `validate-units.mjs`, `make-calibration-glb.mjs`, `assets:check`, `assets:calibration`; 3D tests (`presentation/test/heroes.test.ts`, `models.test.ts`, `tests/e2e/models.spec.ts`, the calibration hook); 3D-only documents (`assets-source/heroes/HERO_ANIMATION_REPORT.md`, ASSET_PIPELINE §1–9 and §12, the `pr-babylon-scene` skill, the toolkit's glTF validator and Blender/Babylon MCP templates). |
| **MISSING** | PixiJS; a 2D sprite manifest with semantic animation names, explicit anchors and graceful fallbacks; a sprite/animation loader; 2D placeholders for every creature form (battle sprites), the six mounted map avatars, every map-site kind, map decoration, battle obstacles, siege structures, projectiles and spell/combat effects; a sprite import step for final GPT-6 strips; the GPT-6 2D production queue. |

## 2. KEEP

### 2.1 Simulation core and platform (unchanged)

| Package | Why it stays |
|---|---|
| `packages/rules` | Authoritative rules, commands, events, resolvers, pathfinding, fog, battle rules, siege, corpses, town gates. No rendering import. Only prose comments mention Babylon (ADAPT, comments only). |
| `packages/content` | Definitions (6 pantheons × 7 families × base + 1 upgrade = 84 forms, 9 neutral families = 18 forms; 18 town locations; 5 resources; gods, heroes, spells, artifacts, campaigns). One presentation field (`modelAssetId`) is ADAPT. |
| `packages/mapgen` | Logical maps, random skirmish maps and the cosmetic decor stream (`buildDecor`, `deriveStreams`), which the 2D map reuses as-is. |
| `packages/campaign`, `packages/ai`, `packages/session`, `packages/testing`, `packages/platform`, `packages/audio` | Campaign flow, AI, saves (the save format holds no presentation data, so old saves keep loading), the game driver, platform adapters, audio engine. |
| `apps/desktop`, `apps/client` | Electron shell (offline `prgame://` protocol, file saves) and the browser build; only the bundler's Babylon chunk rule is ADAPT. |

### 2.2 React interface

Kept unchanged: `MainMenu`, `Setup`, `RandomSetup`, `Overview`, `Town`,
`Recruitment`, `Pantheon`, `Journal`, `LevelUp`, `BattleResult`, `Summary`,
`Encyclopedia` screens; `components/` (kit, art, badges, game, moments);
`app/` store, saves, records, hints, keys, moments, battle log, cursor context;
`assets/` icons, cursors, story art, moment art, SVG placeholders; all styles.
The **town screen already is 2D** (painted background + 18 building overlays +
React panels): KEEP, verified in Phase 6.

### 2.3 2D assets already in the game (reused, not regenerated)

| Folder | Files | Use in the 2D game |
|---|---|---|
| `assets-runtime/art/terrain/` | 60 (`terrain.<climate>.<ground>.webp`, 10 climates × 6 grounds) | Adventure-map ground (texture fills per terrain type), sea. |
| `assets-runtime/art/sky/` | 10 (`sky.<climate>.webp`) | Sky panorama beyond the map's north edge (owner decision 2026-10-02). |
| `assets-runtime/art/battle/` | 6 (`battlefield.<archetype>.ground.webp`) | Painted battlefield background under the logical hex board. |
| `assets-runtime/art/{busts,covers,endings,missions,cards,miracles,splashes,banners}/` | 179 | Story art and big moments (React). |
| `assets-runtime/ui/icons/final/` | 221 + manifest (172 icons, 43 creature portraits, 6 emblems) | Interface icons, creature portraits (Unit Detail portrait, army slots), pantheon emblems (map avatars' banners). |
| `assets-runtime/ui/icons/` | 96 (markers, stats, resources, actions, effects, status, time) | Interface; `marker.*` stay the minimap/legend markers. |
| `assets-runtime/ui/cursors/` | 58 + manifest | Context cursors over the map and battle canvases. |
| `assets-runtime/ui/backgrounds/`, `branding/`, `frames/` | 11 + 4 + 1 | Opening screen, logo, frame. |
| `assets-runtime/placeholders/town/<pantheon>/` | 6 × 26 (background + 14 dwellings + 11 support buildings) | Town screen (2D background + building overlays), unchanged. |
| `assets-runtime/placeholders/menu/`, `assets-runtime/icons/` | 1 + 9 | Menu fallback and menu icons. |
| `assets-runtime/audio/` | 60 + manifest | Sound (unchanged). |

### 2.4 Sources and references (kept; several feed the new placeholders)

| Source | Files | Reuse |
|---|---|---|
| `assets-source/creatures/reference/` (owner's folder) | 172 views of 43 forms (three-quarter, front, side, top; 1254², transparent) + delivery notes | **Canonical references (directive §16 A).** The three-quarter master faces right (checked on a contact sheet of all 43) and becomes the placeholder battle sprite of those 43 forms; it is the reference to attach for their GPT-6 strips. |
| `support images/heros_full_view/` (owner's folder) | 6 boards (top / front / side of each pantheon's mounted hero) | **Mounted map-avatar references.** The side view (facing right) becomes each pantheon's placeholder map avatar and hero-screen figure. |
| `assets-source/ui/sheets/map-markers-sheet.png` | 1 (12 panels: town markers incl. pantheon variants, resource sites, adventure objects, structures, passages, utility, encounters) | **Adventure-map objects.** Cropped into transparent placeholder sprites for every site kind it covers. |
| `assets-source/ui/sheets/resource-status-icon-pack.png` | 1 | Already cropped into the interface icons. |
| `support images/ChatGPT Image Sep 29 …` (owner's folder) | 27 concept boards: 12 GUI reference sheets, 6 pantheon boards (gods, heroes, 7 creature levels), 6 town-building boards, 3 more boards | Style and design references for GPT-6 (town boards already cropped into the town placeholders). |
| `assets-source/ui/{backgrounds,branding,frames,menu-icons,cursors}/` | 11 + 2 + 1 + 9 + 26 | Interface sources. |
| `assets-source/icons/final/`, `assets-source/icons/current/`, catalog | 222 + 120 + catalog | Icon sources and catalog. |
| `assets-source/art/final/` + briefs 1–4, 6, 7 | 210 + 6 briefs | Painted art sources; briefs are 2D already. |

## 3. ADAPT

### 3.1 `@pr/presentation` (Babylon → PixiJS)

| File (lines) | Today | 2D replacement |
|---|---|---|
| `engineHost.ts` (159) | One Babylon `Engine` and canvas, render loop, hardware scaling, shader warm-up | One PixiJS application and canvas (WebGL, local only), same mount / show / release contract, frame cap and resolution from the graphics preset, context-loss flag. |
| `adventure.ts` (1230) | 3D terrain meshes, decor instances, mounted GLB heroes, orbit camera with locked angle, ground picking | Layered 2D map: terrain → roads → grid/overlays → decor, sites and heroes (depth-sorted) → path → fog → effects; 2D camera (pan, zoom); hex picking by inverse projection. **Same controller API** (`update`, `playHeroMove`, `playHeroTeleport`, `prepareForBattle`, `cancelPreparations`, `focus`, `pan`, `zoom`, `projectHex`, `viewFootprint`, `heroAnimationDebug`, `cameraPose`). |
| `battle.ts` (1220) | 3D board, figure proxies/GLB rigs, 3D projectiles and labels | Painted background + logical hex overlay + obstacle and siege sprites + creature sprites (mirrored enemy side) + projectiles/effects + count badges; same event playback and cues; **same controller API** (`update`, `play`, `skip`, `projectCell`, `busy`). |
| `viewer.ts` (268) | 3D bestiary turntable | 2D animated sprite viewer: animation-state selection, base/upgrade switch (screen), playback controls, mirror, reduced-motion static pose. |
| `heroFigure.ts` (119) | 3D mounted hero on the hero screen | Removed; the hero screen shows the pantheon's 2D figure image (React `<img>`). |
| `graphics.ts` (99) | Presets incl. anisotropy, figures per troop, contact shadows | 2D presets: resolution, anti-aliasing, painted ground, map decoration density, soft shadows under figures, small ambient animations, frame cap. |
| `palette.ts`, `environmentArt.ts`, `tween.ts` | Colours, ground/sky/battlefield art lookup, tweens | KEEP with 3D wording removed (`TERRAIN_HEIGHT` relief is 3D-only: removed). |
| `animations.ts` (222) | 3D state vocabulary idle/move/melee/ranged/defend/hit/defeat/victory + procedural transforms | Replaced by the directive's semantic vocabulary in a manifest-driven sprite system (idle, move, attack, defend, hit, death, victory; shoot; takeoff/fly/landing; cast/ability). |

### 3.2 Interface

| File | Change |
|---|---|
| `scene/SceneHost.tsx` | Loads the 2D layer on demand (PixiJS), async engine creation, "2D view" wording. |
| `screens/Adventure.tsx`, `app/view.ts` | View model gains what 2D sprites need (town pantheon, pickup resource, guard/monster creature ID); keyboard pan/zoom unchanged. |
| `screens/Battle.tsx` | Melee-side choice uses the 2D board transform (`cellPoint`); otherwise unchanged. |
| `screens/UnitDetail.tsx` | 2D viewer, semantic states available for that creature (from its content), asset status from the sprite manifest. |
| `screens/Hero.tsx` | 2D figure instead of the 3D model. |
| `assets/manifest.ts`, `index.ts` | Register the 2D sprite manifest instead of GLB entries; remove the calibration hook. |
| `screens/Settings.tsx`, `app/preferences.ts`, `app/graphicsProbe.ts` | Graphics preset texts for 2D; "Bestiary auto-rotate" becomes "Bestiary animation autoplay"; controls for features this build does not have are removed (directive §19: only options that work). |
| `audio/sounds.ts`, `audio/gameAudio.ts` | Import the cue type from the new module (no behaviour change). |

### 3.3 Content, build, tests, documents

* **Content:** `CreaturePresentationRefs.modelAssetId` (`creature.<…>.model`)
  → `spriteAssetId` (`creature.<…>.sprites`). Presentation reference only;
  rules and saves are unaffected (saves carry no presentation data).
* **Build:** `apps/client/vite.config.ts` (Babylon chunk group), boundary lint
  (forbid `@babylonjs`), `tools/desktop-smoke.mjs` (GLB checks → sprite checks),
  `tools/perf/load-time.mjs` (3D wording).
* **Unit tests:** `presentation/test/graphics.test.ts` (2D presets),
  `ui/test/groundArt.test.ts` (2D wording); new sprite-manifest tests.
* **E2E:** `heroes.spec.ts` (mounted GLB heroes, camera angle) → 2D avatars and
  2D camera; `groundArt.spec.ts` (camera pose); `heroscreen.spec.ts` (3D
  figure); `menu.spec.ts` (bestiary viewer statuses).
* **Briefs:** `GPT6_BRIEF_5_CREATURES.md` — its reference views and portraits
  are exactly the directive's canonical references (§16 A/B); wording about a
  later 3D step is replaced.
* **Active documents:** `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`,
  `ASSET_PIPELINE.md` (§10, §11, §13 KEEP; §1–9, §12 REMOVE),
  `IMPLEMENTATION_PLAN.md`, `DEVELOPMENT_STATUS.md` (history marked as 3D-era),
  `DESIGN_PROPOSALS.md`, package READMEs, `assets-source/creatures/reference/README.md`.
* **Owner's toolkit:** `PANTHEON_REALMS_LOGICAL_ARCHITECTURE.md`,
  `CREATURE_ANIMATION_REQUIREMENTS.md`, `PANTHEON_TOOLKIT_README.md`,
  `CLAUDE_TOOLING.md`, `.claude/skills/*/references/project-contract.md` (×10:
  "Babylon.js stylized 3D … Blender/glTF assets"), `pr-creature-pipeline`
  (Blender rigs → 2D strips), `pr-audio-vfx`, `pr-qa-release`,
  `pr-react-game-ui`, `pr-project-lead`, `pr-rules-engine`,
  `pr-campaign-mapgen`, `pr-electron-offline`, `docs/tooling/*`,
  `tools/pantheon-dev/` (audit script, tests), the `individual-skills/*.zip`
  copies; `docs/pantheon-v0.3/` (the original design set: production chapters
  01–04 and a few lines elsewhere describe the 3D stack; marked superseded
  where they do).

## 4. REMOVE

| Item | Size | Reason |
|---|---|---|
| `@babylonjs/core` 9.28.0, `@babylonjs/loaders` 9.28.0 | ~1.5 MB of the game bundle | 3D engine and glTF loader. |
| `@gltf-transform/core` 4.5.1, `gltf-validator` (root dev) | dev only | GLB tooling. |
| `presentation/src/{meshkit,proxies,models,modelRegistry,mountedHeroes,contactShadow,artTextures,animations,viewer,heroFigure}.ts` | 2,546 lines | 3D meshes, primitive proxies, GLB loading and rigs, Babylon materials, 3D viewer and hero figure. |
| `assets-runtime/heroes/<pantheon>/hero_<pantheon>.glb` ×6, `animation_manifest.json`, `shared/mounted_hero_animated_rig.json` | 9.4 MB | Mounted 3D heroes (the 2D map uses pantheon avatars). |
| `assets-runtime/units/_calibration/forward_arrow/` (GLB + 2 manifests) | 13 KB | Axis/scale calibration model. |
| `tools/assets/validate-units.mjs`, `tools/assets/make-calibration-glb.mjs`; scripts `assets:check`, `assets:calibration` | 351 lines | GLB validation and calibration. |
| `presentation/test/heroes.test.ts`, `presentation/test/models.test.ts`; `tests/e2e/models.spec.ts`; the `?e2e=calibration` hook | 446 lines | 3D tests. |
| `assets-source/heroes/HERO_ANIMATION_REPORT.md` | 1 doc | GLB rig report only. |
| `ASSET_PIPELINE.md` §1–9 (GLB creature contract) and §12 (mounted GLB heroes) | ~330 lines | 3D pipeline only; replaced by the 2D sprite contract. |
| `.claude/skills/pr-babylon-scene/`, `individual-skills/pr-babylon-scene/skill.zip` | 4 files | Babylon scene skill → replaced by `pr-pixi-scene`. |
| `tools/pantheon-dev/validate-gltf.mjs`, `fixtures/metadata-only.gltf`, `mcp-templates/{babylon-authoring,blender}.example.json` | 4 files | glTF inspection and 3D authoring MCP templates. |

Not removed (checked): the 172 creature reference views and the six hero
boards — they were made for a 3D step but are useful 2D references
(directive §6: "Do not delete a useful 2D render/reference image just because it
was originally created during a 3D workflow"). No `.gltf`/`.blend` file exists
in the game; the owner's separate Blender project (`blannder_models`) is
outside this repository and is not touched.

## 5. Stale-term search before the migration

`babylon|glb|gltf|blender|mesh|skeleton|armature|3d model|sceneloader|arcrotatecamera|3D`
matched **132 tracked files** (plus generated `apps/desktop/renderer/` build
output, which is ignored by git and rebuilt). Largest: `adventure.ts` 67,
`battle.ts` 64, Brief 5 59, `DEVELOPMENT_STATUS.md` 52, `mountedHeroes.ts` 35,
`proxies.ts` 34, `ASSET_PIPELINE.md` 30, `models.ts` 29, `modelRegistry.ts` 27,
`meshkit.ts` 27, `heroes.test.ts` 25, `ARCHITECTURE.md` 22, the v0.3 production
architecture 20, the hero animation manifest 20. The post-migration search and
the classification of every remaining match are in `DEVELOPMENT_STATUS.md`
(2D migration section).

## 6. MISSING (before the migration)

### 6.1 Runtime

* PixiJS (`pixi.js` 8.x) and a 2D engine host.
* A sprite manifest (`assets-runtime/sprites/manifest.json`) with, per sprite
  set: status (placeholder / final), provenance, facing (right), pixels per
  hex, optional tint, and per semantic animation a strip (file, frames, frame
  size, fps, loop, anchor), optional 8-direction variants for map avatars.
* A loader and player: textures from the game's own files (no workers, no
  network), strips cut into frames, playback by semantic name, fallback chain
  for missing optional animations, mirroring for the enemy side.
* `requiredAnimations(creature)` from content (shooter → shoot; flight →
  takeoff/fly/landing; active ability → ability; `cast` only for a creature
  that casts — none today).
* An import step for final GPT-6 strips (`npm run sprites:import`) and a
  placeholder generator (`tools/assets/sprites/`).

### 6.2 Art (before placeholders; the exact queue is `GPT6_2D_CONTENT_GENERATION.md`)

| Category | Needed | Existing usable 2D | Gap |
|---|---|---|---|
| Creature canonical references (A) | 102 forms | 43 (three-quarter masters) | 59 forms |
| Creature portraits (B) | 102 | 43 | 59 |
| Battle animation strips (C) | per form: 7 base + conditional | 0 | all |
| Mounted map heroes (D) | 6 pantheons × 8 directions × idle/walk | 6 side-view concept boards | all strips |
| Adventure terrain/objects (E) | 29 site kinds (+ town per pantheon), decoration (trees, pines, rocks, shrubs, grass, mountains), roads | map-marker sheet covers most site kinds as concept art; terrain textures complete | windmill, nest, refuge, key tent, prison, decoration, road texture; final versions of all site sprites |
| Battlefield backgrounds (F) | 6 archetypes × climates in use | 6 temperate paintings | climate variants (optional) |
| Battlefield obstacles (G) | rocks, logs, trees, ruined columns, siege walls/gate/towers/keep | none | all |
| Spell/combat effects (H) | strike, arrow/stone projectile, impact, damage spell, area damage, heal, bless/buff, curse/debuff, ward, morale, death | none (interface icons only) | all |

## 7. Content integrity notes (art versus rules)

Rules win; disagreements are noted and the right asset goes to the GPT-6 queue
(directive §18):

1. **Egyptian tier 2 and tier 5** — the pantheon board shows a four-legged base
   and an upright upgrade (Jackal Guardian → Anubian Warden; Crocodile Beast →
   Sobek Warbeast). In 2D this no longer needs a shared skeleton, but base and
   upgrade strips cannot share poses; the queue asks for the upgrade strips
   from the upgrade reference (owner decision still open: keep the board's
   body plans).
2. **Older documents** describing eight Greek families, a 3D creature
   pipeline, rigs, skeletons and a 3D renderer are superseded by the owner's
   later decisions (7 families; this 2D directive).
3. **Board vs. brief details** already recorded by the creature delivery (the
   Draugr carries a sword, the World-Serpent Wyrm is blue-violet, the Bennu
   red-orange-gold) — the delivered references govern the strips.
4. **Animations follow gameplay:** the queue requests `shoot` only for
   shooters, `takeoff/fly/landing` only for creatures with Flight and
   `ability` only for creatures with an active ability; no creature casts
   spells in battle today, so no `cast` strip is requested.

## 8. Outcome (2026-10-03)

Done as planned: the three views run on PixiJS, every sprite is a labelled
placeholder from the sources in §2.4 or a procedural drawing, everything in
§4 is deleted, and the remaining art is queued file by file in
`GPT6_2D_CONTENT_GENERATION.md`. This audit is a record of the state before
the migration; §5's 3D terms describe that state and are obsolete. Tests run,
the post-migration stale-term classification and the owner decisions are in
`DEVELOPMENT_STATUS.md` ("2D presentation migration").
