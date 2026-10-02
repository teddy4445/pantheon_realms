# Pantheon Realms — Architecture

Pantheon Realms is a data-driven, deterministic, turn-based strategy game. One
TypeScript simulation core runs unchanged in the browser build, the Electron
desktop build and headless tests. React draws the interface, Babylon.js draws
the adventure map, battlefield and bestiary viewer, and Electron only provides
native storage and window services.

```
Content definitions ──► Shared TS rules ──► GameCommand ──► validate ──► commit
                                                                   │
                         MatchState (revision + 1) + immutable GameEvent[]
                                                                   │
                 ┌──────────────────────┬──────────────────────────┼───────────────┐
              React UI          Babylon scenes (playback)     AI observers     saves/tests
```

The rules decide; everything else presents. React never subtracts gold,
Babylon never computes damage, animation callbacks never kill creatures and the
AI never mutates state directly — each of those paths goes through
`processCommand`.

## 1. Packages

| Package | Owns | Must not |
|---|---|---|
| `@pr/rules` | IDs, resources, deterministic RNG, hex math, content *types*, `MatchState`, commands, events, `processCommand`, every quote/commit (economy, movement, sites, heroes, gods, quests, turn/dawn, adventure spells, tactical battle, sieges, deployment, damage) | import anything outside the TS standard library (no DOM, React, Babylon, Electron, Node) |
| `@pr/content` | The authored, validated `ContentCatalog`: six playable pantheons (Greek design values; Norse, Egyptian, Japanese, Celtic and Mesoamerican values proposed) with rosters/towns/gods/heroes/classes/lore, spells, skills, artifacts (incl. the `arcana` spells, artifacts and sets with lore), *The Three Beacons*, *The Winter Oath* (seven Norse missions), the *Twin Harbors* skirmish in 36 pantheon pairings, validators | contain logic beyond building and validating data |
| `@pr/mapgen` | Template-driven logical map generation (`pr-mapgen-0.3`), validation, logical hash, cosmetic decor stream; the symmetric random skirmish generator (`pr-skirmishgen-0.2`, `skirmish.ts`: six map types, zones, guarded passes and gates, size/guard/treasure/wealth/road/reveal settings) that outputs a full `MissionDefinition` | affect rules through cosmetic data |
| `@pr/campaign` | Mission factory (scenario manifest or generated scenario → `MatchState`; difficulty, seat controllers, names and patrons), hero carryover, campaign state machine, completion records with mission scores; `createRandomSkirmish` (re-exports the generator for the session and UI) | render or persist |
| `@pr/ai` | Observation (belief-state redaction), strategic and tactical planners, controller that submits commands | read hidden state or write state |
| `@pr/session` | `GameSession` (single authoritative state host), checkpoints, campaign transitions, versioned save envelope + validation | contain rules or storage I/O |
| `@pr/platform` | `SaveRepository` / `PreferencesStore` (preferences and the separate high-score `records` store) / window + quit contracts; browser (IndexedDB/localStorage), desktop (preload bridge) and memory adapters | contain rules |
| `@pr/presentation` | One long-lived Babylon `EngineHost`; adventure, battle and unit-viewer scene controllers; GLB unit-model pipeline (manifests, loader, rigs, validation) with procedural proxies as fallback; mounted adventure-map hero models and their animation controller; animation states; battle playback cues for sound. `@pr/presentation/core` is its Babylon-free part (unit-model registry and validation, palette, animation state list) | decide legality or change state |
| `@pr/audio` | Web Audio mixer: sound manifest types and validation, buses (music, ambience, interface, combat, voice), music/ambience crossfades, stinger ducking, voice limits and cooldowns, the "Calmer sound" policy | read or change game state; fetch anything that is not bundled |
| `@pr/ui` | React app shell, 21 screens, dialogs (incl. the story dialogue window, hot-seat hand-over, camps, map events, interventions), view helpers, preferences (incl. key bindings and tips), high-score records, save-slot policy, asset manifest (placeholders + bundled unit models), which sound plays when (`audio/`) | edit `MatchState` (it dispatches commands) |
| `@pr/testing` | Headless `GameDriver` for scripted playthroughs | bypass validation |
| `apps/client` | Vite entry for browser + Electron renderer | — |
| `apps/desktop` | Electron main (custom `prgame://app` origin, CSP, sandbox, validated IPC, atomic saves) + preload bridge | expose Node/Electron to the renderer |

### Allowed dependencies (enforced by `tools/check-boundaries.mjs`)

```
rules      ← (nothing)
content    ← rules
mapgen     ← rules
ai         ← rules
campaign   ← rules, mapgen
session    ← rules, campaign, ai
testing    ← rules, content, campaign, ai, mapgen
platform   ← (nothing)
presentation ← rules, mapgen, @babylonjs/core, @babylonjs/loaders
audio      ← (nothing)
ui         ← rules, content, session, platform, presentation, audio, ai, react, fonts
client     ← ui, platform, react
desktop    ← electron, node:*
```

**Start-up size rule (also enforced by the lint):** `ui` may take *values*
only from `@pr/presentation/core`. The 3D layer is reached through
`import type` or the one on-demand loader in `ui/src/scene/SceneHost.tsx`,
so Babylon.js is not part of the start-up bundle (see §6).

The simulation core (`rules`, `content`, `mapgen`, `campaign`, `ai`,
`session`) is also type-checked with a DOM-free `tsconfig.core.json`
(`lib: ES2023`, `types: []`), so a stray `window`, `document` or Node import
fails the build.

## 2. Data model

* **Immutable content** (`definitions/*`) — creatures, families (exactly one
  base + one upgraded form, one family per tier, seven tiers per pantheon),
  buildings (18 logical town locations: 7 dwellings + 11 support), gods (any
  number per pantheon), heroes, skills, spells, artifacts, missions,
  campaigns. Behavior is expressed with reusable discriminated unions
  (`RequirementDefinition`, `EffectDefinition`, `RewardDefinition`,
  `AbilityRule`, `SpellEffect`, `ObjectiveCondition`) instead of
  per-entity code or class hierarchies. Every definition carries
  `implementationStatus` (implemented / preparation / planned) and provenance.
* **Runtime state** (`state/match.ts`) — plain serializable records referring
  to content by stable string IDs. `MatchState` is the single truth for one
  match: players (one wallet each), heroes, towns, world sites, fog, mission,
  pending decisions, battle, last battle result, processed command IDs,
  idempotency keys and saved RNG stream states.
* **IDs** are branded strings (`Id<'Creature'>` etc.) that accept literals but
  reject cross-domain mix-ups at compile time.

### Content, not code — the pantheon check

The Norse pantheon was added as data only: seven families, an 18-location
town, gods, heroes, hero classes, lore. The rules needed no Norse-specific
branch; the only rule-level additions made while building it were generic
vocabulary (`siege_fortification` effect, `apex_melee` role label) and
replacing one hard-coded ability label with the ability's catalog name.

The Egyptian, Japanese, Celtic and Mesoamerican pantheons were then added with
**no rule change at all** through `packages/content/src/pantheonKit.ts`: a
compact spec per pantheon (`<pantheon>/pantheon.ts`: seven families with stats,
abilities and lore, location names and placements, a patron, a minor-god pair,
the other gods, three classes, five heroes) is expanded into ordinary
definitions. The town mirrors the Greek design/03 tree slot-for-slot (costs,
prerequisites and effects remapped by tier), gods mirror Zeus/Ares/Athena and
classes mirror Champion/Strategos/Oracle. Building IDs follow
`<pantheon>_<location>_l<level>` (`kitBuildingId`). Everything goes through the
same validators. The skirmish offers every pantheon pairing as scenario
*variants* (`SkirmishScenarioDefinition.variants`), chosen in setup.

## 3. Command pipeline

`processCommand(ctx, state, command)`:

1. Rejects duplicates (`commandId` seen), stale revisions, finished matches,
   wrong actor, pending decisions and battle-phase mismatches.
2. Deep-clones a draft and runs the system handler inside a `Tx` (event
   collector, RNG cursors, deterministic ID allocation, `applyOnce`
   idempotency keys).
3. Runs gate updates, the objective state machine and the mission outcome.
4. Commits: `revision + 1`, events stamped `${revision}.${n}`, RNG cursors
   written back. A rejected command returns a structured `Rejection` and the
   original state is untouched.

Every legality question the UI shows is answered by a pure *quote* function
using the same code as the commit (`quoteConstruction`, `quoteRecruitment`,
`quoteUpgrade`, `quoteTransfer`, `quoteTrade`, `quoteMovement`,
`quoteActivation`, `quoteGodSelection`, `quoteHireHero`, `legalActions`,
`previewMelee/Shot/Retaliation`). Disabled buttons always display the quote's
reason.

### Battle phases and sieges

A battle can open in a pre-round phase before round 1:

* `selection` — a human town defender whose garrison plus visiting hero
  exceed seven stacks chooses at most seven (`BattleSelectDefenders`, BAT-14);
  AI defenders pick automatically by value. The rest become `siege.reserves`.
* `deployment` — only for a human side whose commander has Tactics
  (owner decision): `BattleDeploy` inside the zone (2 + Tactics columns, inside
  or outside the walls in a siege; swaps allowed), then
  `BattleConfirmDeployment`. Without Tactics the default formation *is* the
  two-column deployment. Auto-combat confirms.

`town_siege` encounters start when a hero enters an enemy-held town that has a
garrison or a visiting hero. `systems/battle/siege.ts` builds the fixed wall
layout from the town's `siege_fortification` level (Fort/Citadel/Castle), and
the round start runs the Catapult shot then keep/tower shots. Structures block
occupancy (the intact gate opens only for the defender), moat cells are
terminal for ground movement and forbid an attack after entering, and shots
into the town across an intact section take the wall factor. Resolution writes
survivors back to hero *or garrison* (`sourceArmy`), and a winning attacker
captures the town, clearing garrison and reserves.

### Signatures, gods and town services — all effect data

Pantheon signatures, the second minor-god choice and the three support
buildings (Training Academy, Watchtower, Artifact Merchant) are expressed as
**effect types** (`EffectDefinition` in `definitions/logic.ts`; all proposed,
see `DESIGN_PROPOSALS.md`). A pantheon's signature is
`PantheonDefinition.signature` — a name, exact rule text and a list of
ordinary effects. Rules consume the types, never the pantheon or god:

* `resolvers/effects.ts` — `playerEffects(player)` = signature effects (only
  when `ScenarioRuntimeInfo.signatureMechanics`) + every committed god's
  benefits. Hero modifiers (attributes, morale, luck, movement, vision), town
  growth (`weekly_growth_bonus`), player income (`daily_income`) and the
  offering rite all read it.
* Battles freeze the battle-relevant part per side at battle start
  (`BattleSideState.effects`: recovery %, XP %, fury, free shapeshift,
  harmony, creature-stat filters). `attackBreakdown` / `defenseBreakdown` /
  `effectiveSpeed` in `battle/common.ts` add aspect, creature-stat, harmony
  and fury on top of base + commander + statuses, so previews, AI and
  execution agree. Casualty recovery and the XP bonus are applied by the
  battle-result transaction.
* Shapeshift is an ordinary creature ability (`AbilityRule` `shapeshift`); the
  stack's `aspect` flag is a battle status (not a form — DEC-21 unchanged).
  With `free_shapeshift` it does not end the activation
  (`BattleState.freeShiftUsed` allows one free change per activation).
* Town services live in `systems/services.ts` (quote + commit each):
  `MakeOffering`, `TrainHero`, `BuyArtifact`. The merchant's weekly stock is
  a pure function of match and week — the same catalog in every town (`refreshMerchantStock`, run at the
  weekly dawn and on construction), so no gameplay RNG stream is touched.
* Scenarios can restrict gods (`committableGodIds`) and turn signatures off
  (`signatureMechanics: false`); The Three Beacons does both, so the campaign
  keeps its documented rules. The Winter Oath keeps signatures on and turns
  `expandedContent` on.
* **Objectives in order** (`systems/quests.ts`): an objective with `requires`
  starts locked and opens when its prerequisites complete; a step whose
  condition already holds completes in the same pass (owner decision
  2026-10-01). Conditions are data: counters, site cleared / activated /
  visited, flags, minor gods (with a `count`), hero army contents,
  `hero_defeated` (a hostile commander, band or rival by definition),
  `town_owned`, claims, `all` / `any`. Campaign epilogues may add a variant by
  final-mission flag (`campaignEpilogueLines`).
* **Equipment** (`definitions/pantheons.ts`): 19 equip slots (`EQUIP_SLOTS`) of
  ten artifact kinds; `freeEquipSlot` / `commitEquip` place an artifact in a
  matching slot or swap. Town spell libraries (`resolvers/town.ts`
  `townLibrarySpells`) add a per-match, per-town draw of shared spells to the
  town pantheon's own.

### Proposed 0.4 systems — scenario features and expanded content

Everything added in 0.4 that changes play is gated by data, never by
scenario IDs (`DESIGN_PROPOSALS.md` §4–12):

* **Scenario features** (`MissionDefinition.features` → `ScenarioRuntimeInfo
  .features`): `expandedContent`, `weeklyEvents`, `interventions`. Twin
  Harbors and random maps turn all three on; The Three Beacons none.
* **Content scope**: skills, spells, artifacts and sets carry `scope:
  'expanded'`; `resolvers/scenario.ts` `scopeAllowed(state, scope)` filters
  level-up offers, Sanctum learning and merchant stock. Pantheon skills and
  spells carry `pantheonId` (offered only to that pantheon's heroes / taught
  only in that pantheon's towns).
* **Hero effects**: `heroEffects` = artifact pieces + active set bonuses
  (`artifactSetStatus`) + skill effects (`SkillRule` `effects` by rank). New
  effect types: `mana_regen`, `spell_damage_percent`, `movement_percent`
  (also used by weekly events) — read by dawn mana, spell damage and the
  movement budget.
* **Interventions** (`systems/interventions.ts`): `InvokeIntervention`
  (adventure) and `BattleInvokeIntervention` (at the start of one's own
  activation); one per world week (`PlayerState.interventionWeek`), paid in
  Favor; effect types `restore_movement`, `restore_mana`, `grant_resources`,
  `town_growth`, `battle_status`, `battle_heal`, `battle_smite`.
* **World features** (`systems/world.ts`): weekly events drawn at each new
  week from the `progression` stream (`world.weeklyEventId`, reaching every
  empire through `playerEffects`); creature camps (`RecruitFromCamp`,
  `SiteState.stock`, weekly restock); one-time map events
  (`ResolveMapEvent`, any `RewardDefinition`); relic shrines (`heldDays` at
  each dawn for the `hold_site` victory).
* **Wandering monsters** are hostile heroes with `HeroState.monster`
  (bounty) owned by the scenario's hostile player; the patrol AI keeps them
  inside `regionCenter`/`regionRadius` and attacks only at its threshold.
* **Skirmish outcome** (`quests.ts`): elimination of empires without heroes
  or towns (`PlayerEliminated`), `hold_site` victory, `outcome.winnerIds`;
  works for any number of empires and any mix of humans and AI.
* **Generated scenarios**: a random map's `MissionDefinition` travels in
  `MatchState.customMission`; every mission lookup goes through
  `scenarioMission(catalog, state)`, so saves of random maps are
  self-contained and validated like authored ones
  (`validateGeneratedMission`).
* **Difficulty** (`DifficultyDefinition`): wallet and income percentages
  (`PlayerState.incomePercent`) applied by the mission factory, plus the AI
  personality margins (`aiPersonality`). Skirmish only.
* **Statistics** (`systems/stats.ts`): `MatchState.stats` records each
  empire's day line at the start and at every dawn plus running totals;
  `matchScore` turns them into the score. Never read by play.
* **Story** (`systems/story.ts`): after every command, unplayed
  `storyScenes` whose trigger holds are recorded in `mission.scenesPlayed`
  and announced with `StoryScene`; scenes never change play.

Adventure spells (`CastAdventureSpell`: Divine Sight, Eye of Horus reveal a
tile area; Fleet Foot adds movement; Homecoming recalls to the nearest own
town with `HeroTeleported`) — reveal spells store temporary vision
in `fog.temporaryReveals` until the next dawn; `visibleCells` includes it, so
UI and AI belief states agree.

### AI information and fairness

The strategic AI plans on the redacted belief state, plus one piece of
information a human owner also sees: the true Tavern roster of its own towns
(`AIObservation.hireRoster`) — the belief hides unseen enemy heroes, which
otherwise looked hireable. A hero only stays home against enemies it cannot
beat in the field, and never ends a move where a visible enemy at least as
strong can reach it next turn (reach from the enemy's visible army). Skirmish
maps can be generated point-symmetric (`MapTemplateDefinition.symmetry:
'point'`: anchors, roads and terrain mirrored under a 180° rotation, which
preserves hex distance); Twin Harbors v2 uses it, and both sides start with
same-archetype leaders. `npm run balance` (tools/balance, never packaged)
measures pantheons AI-vs-AI with sides and first movers swapped.

The AI uses the new mechanics through the same quotes as the screens
(`packages/ai/src/services.ts`): it commits to the best-scoring legal god,
equips backpack items, makes Temple offerings only while Favor is still needed
(lowest tiers first, never a hero's last creature), trains visiting heroes and
buys artifacts for empty slots while keeping Gold reserves, and saves for a new
hero when it has none. The tactical AI takes a free Shapeshift when the other
aspect gives a clearly better best action (e.g. Hare Speed lets a Pooka reach
an enemy); it does not use a Shapeshift that costs the activation.

Turn-order fairness (measured with `npm run balance`): whoever moves first
advances into the unseen middle first and is caught by armies it never saw.
Three rules, all from public knowledge only, removed most of that edge:

* **Retreat** — a hero standing within reach of a visible, stronger enemy
  (often one revealed by its own move) steps back out of reach, into one of
  its towns if it can arrive today, while movement remains. The "return
  home" move no longer stops short in danger.
* **Fog caution for secondaries** — a hero below 60% of its empire's
  strongest hero ends its moves on its own half of the map (nearer one of
  its towns than any enemy town) or within 3 hexes of that strongest hero.
* **No lone advance (tactical)** — when a stack cannot strike this
  activation, a cell that more enemy melee stacks could reach next than
  allies stand beside costs 2 cells of progress per extra attacker, so fast
  flyers no longer land alone in the enemy line.

## 4. Determinism

* RNG: FNV-1a stream derivation + xorshift32 with unbiased bounded draws.
  Gameplay streams (`combat`, `progression`, `layout`) live in `MatchState.rng`
  and are saved; cosmetic randomness uses a separate generator and never
  touches them.
* Damage uses exact rationals (BigInt) with a single floor and minimum 1;
  previews never draw randomness.
* Pathfinding uses canonical neighbor order and deterministic tie-breaking;
  only explored tiles are used, so routes never leak hidden terrain.
* The map generator produces a logical hash; decor comes from its own stream.
* `canonicalStateHash` is used by tests to prove identical runs.

## 5. Session, saves and platform

`GameSession` hosts the only mutable reference to the current `MatchState`.
Human commands, AI steps and auto-combat all call `processCommand`. Several
seats may be human (hot-seat): `humanPlayerId` is the *viewer* (the active
human, else the human who acted last), a battle command is issued for the
side that acts (`battleActor`), and `humanSeats` lists the people at the
table. `newGenerated` starts a random map. It emits
`SessionUpdate { state, events, source }` to subscribers and checkpoint
signals (`pre_encounter`, `dawn`, `mission_start`).

Saves are `SaveEnvelope` v1 (`pantheon-realms-save`): versions bundle,
metadata for slot lists, a checksum over the canonical snapshot and the plain
`SaveSnapshot { match, campaign }`. Loading validates untrusted text
(format, schema, checksum, rules/content versions, scenario presence) and
never guesses a migration; a failed read never deletes the file. Slot policy:
5 manual, 3 rotating autosaves, 1 pre-battle checkpoint.

Desktop saves are written atomically (temp file → fsync → `.bak` → rename) by
the Electron main process behind a sender-validated IPC surface with a strict
save-ID alphabet and size cap. The browser adapter uses IndexedDB for saves and
localStorage for preferences. The browser build never offers Quit. High
scores (`ui/src/app/records.ts`) live in a third store, `records.json`
(desktop, written atomically like preferences) or a localStorage key, so they
never appear in the save list.

## 6. Presentation

**Loading on demand.** Babylon.js is imported by module path (never through
its package index, which pulls in the whole engine), and the 3D layer is a
separate chunk: the main menu starts without it, `preloadPresentation()`
fetches it when the browser is idle after the menu appears (with the two
shader programs every scene compiles bundled in, and Babylon's own lazy
shader imports warmed), and a 3D screen that opens before that waits for it
behind "Loading the 3D view…". Controllers therefore reach their screen
asynchronously; screens push their latest view from refs when one arrives.
The glTF loader is fetched only when a scene first loads a model.
`tools/perf/load-time.mjs` measures start-up and first-scene times.

A single `EngineHost` owns one WebGL2 engine and canvas; screens mount it into
their viewport and ask for a scene controller:

* `AdventureSceneController` — merged vertex-colored terrain mesh, fog caps
  that hide unexplored geometry, roads, decor instances, site proxies,
  mounted hero models (placeholder riders until loaded or if a load fails),
  reachable overlay, path preview (shape-coded: dots today, rings later, X for
  battle), pointer→hex picking via ground-plane intersection, movement
  playback, the pre-battle Prepare_War gesture, fixed-angle camera panning.
* `BattleSceneController` — 15×11 odd-r board, obstacles, siege walls/gate/
  towers/keep/moat, deployment-zone shading, stack groups (1–3 figures),
  count/health billboards, highlights, and playback of committed battle
  events (move, melee, shot + projectile, retaliation, spell, ward, defend,
  wait, morale, catapult/turret/moat/structure damage, destruction, victory).
* `UnitViewerController` — pedestal viewer with the eight animation states
  `idle, move, melee, ranged, defend, hit, defeat, victory`, Play / Pause /
  Stop / Restart, 0.5×/1×/2×, defeat once-and-hold, reduced-motion rules.

**Handedness.** The battle and viewer scenes are right-handed
(`useRightHandedSystem` before any load, production/02 §5) so glTF models
import without a conversion root. The adventure map stays a left-handed
scene; its six mounted hero GLBs load through `MountedHeroCache`
(`mountedHeroes.ts`), which accepts the loader's conversion root and turns
and scales each model on a container node (+Z front → the map figure's +X,
uniform 0.36). **Mounted heroes**: the copied
`assets-runtime/heroes/animation_manifest.json` is registered per pantheon
(`heroModelEntriesFromManifest`); every hero gets its own instance
(skeleton + animation groups) with Idle_Standing / Walk (speed-matched,
capped) / Prepare_War (once, held; resolves from the group's end event, once,
or is cancelled by a token). The Adventure presenter awaits Prepare_War
after a committed BattleStarted, so the battle screen (opened by
`AppStore.routeAfterUpdate` when the presentation queue drains) follows the
gesture; the rules are untouched. The map camera has a fixed yaw and pitch
(limits locked, no orbit input, target moves keep alpha/beta/radius);
dragging and the arrow keys translate its target screen-relatively, clamped
to the map. See `ASSET_PIPELINE.md` §12. **Unit models** (`models.ts`): the UI bundles
`assets-runtime/units/**/family.manifest.json` + GLBs and registers them by
creature ID; `ModelCache` validates each GLB (clip names, sockets, no
CDN-decoder extensions), loads it once per scene and instantiates independent
rigs; `playState` plays the bound clip per semantic state (timed by the shared
tween player so 2×/Instant/Skip behave identically) and falls back to the
procedural motion when a clip is missing. A failed load keeps the proxy and
reports the reason. See `ASSET_PIPELINE.md`.

Playback runs after the rules committed the result. Speed 0 (instant or
reduced motion) completes synchronously and cannot change outcomes. Screens
register *presenters* with the `AppStore`; the AI pacing loop waits for the
presentation queue to drain.

Assets are referenced only by stable IDs (`creature.greek.tier3.base.portrait`,
`town.greek.dwelling.tier1.upgraded`, `town.greek.background`,
`hero.greek.alexios.portrait`, `god.greek.zeus.portrait` …). Resolution order:
final manifest (`assets-runtime/ui/final-manifest.json`, written by
`npm run icons:import`) → UI art and placeholder manifests (`assets-runtime/ui`,
`assets-runtime/placeholders`) → procedural placeholder. `ICON_CATALOG.md`
lists every asset ID the screens show (generated by `npm run icons:catalog`). Swapping in final art or GLB models requires manifest
entries, not screen changes.

**Sound.** `@pr/audio`'s `AudioDirector` is one Web Audio graph (source →
sound gain → bus → [music: stinger duck] → master → focus → limiter).
`ui/src/audio/gameAudio.ts` connects it to the app: music and ambience follow
the screen and the mission's `soundscape` (presentation data on the mission
definition, never read by the rules); a presenter plays the player's own
committed actions, the calendar and stingers without delaying the
presentation queue; the battle scene emits `BattleCue`s timed with its
animation (one summary sound per action when playback is instant); buttons
click, dialogs open and close, errors sound once. Every sound accompanies
something already on screen, so no information is carried by sound alone,
and a missing device or an undecodable file only means silence. Browsers
start audio after the first click; the desktop app starts it at launch.
Files are resolved by sound ID from `assets-runtime/audio/manifest.json`
(see `ASSET_PIPELINE.md` §10).

## 7. UI

`AppStore` owns navigation (stack with per-entry params for return context),
overlays, toasts, preferences, the setup draft, the active session and the
presentation queue. Components read state through `useSyncExternalStore`
bindings and change it only by `store.dispatch(command)`.

Screens: S01 Main Menu · S02 Game Mode · S03 Scenario/Campaign · S04 Pantheon ·
S05 Starting Patron · S06 Adventure Map · S07 Hero/Army · S08 Town · S09
Recruitment · S10 Pantheon/Gods · S11 Tactical Battle · S12 Battle Result ·
S13 Level-Up · S14 Journal · S15 World Overview · S16 Encyclopedia · S17
Settings · S18 Unit Detail · S19 Random Map setup · S20 Summary · S21 High
Scores. Dialogs: pause, save/load, confirmation, briefing, debrief, mission
failed, campaign complete, game over, credits, help, army exchange,
pre-battle encounter, beacon/relay activation, stack details, market,
tavern, hot-seat hand-over, creature camp, map event, interventions,
keyboard shortcuts.

Visual language (0.4.1): the shared kit (`components/kit.tsx`,
`components/game.tsx`, `components/art.tsx`) and `styles/components.css`
carry the owner's GUI style once — navy and slate plates, double gold rims
with chamfered corner ornaments (inline SVG in `styles/tokens.css`), Cinzel
small capitals, burnished-gold primary buttons, framed resource counters,
army slots with count plates, sockets for spells and artifacts. Screens only
lay these out. Interface art resolves by asset ID through
`assets/manifest.ts` (final → `assets-runtime/ui/manifest.json` →
placeholders → procedural); `menuBackground()` picks this run's opening
background once per start (presentation only) and `index.ts` exposes it as
the `--app-art` CSS variable for the menu-style screens.

Two non-modal layers sit above the screens: the **story dialogue window**
(`dialogs/Story.tsx`; queued from `StoryScene` events after their playback,
Continue/Backlog/Skip, the AI waits while it is open) and the **tip panel**
(contextual help, `app/hints.ts`; only its buttons take clicks). Keyboard
shortcuts come from `app/keys.ts` (`KEY_ACTIONS`, defaults, the player's
rebinding in `Preferences.keyBindings`); Esc, F1 and the arrows are fixed.

## 8. Testing layers

* `vitest` — content validation, invariants, economy/building/recruitment/
  upgrade/transfer/market, movement costs, growth, damage worked examples,
  battle legality/determinism/reward idempotency, divine choices, hiring,
  save round-trip and corruption, map generation golden values, full headless
  campaign journeys, AI legality.
* Playwright (Chromium, SwiftShader WebGL) — main menu honesty, settings
  persistence, bestiary viewer, a UI journey through Mission 1, Mission 1 to
  its debrief and into Mission 2 (with its story scenes, Continue and
  Backlog), the New Game modes, skirmish difficulty, a hot-seat random map
  with hand-overs, shortcut help and rebinding, tips, the game-over →
  summary → high-score flow, sieges (BAT-14 selection, Tactics
  deployment, wall battering, capture), a skirmish for each non-Greek pantheon
  chosen with its rival in setup (town, build, recruit), and the GLB
  pipeline (`?e2e=calibration`, a presentation-only fixture mode that shows the
  calibration model in place of the Hoplite). Scenario fixtures are ordinary
  save files built headlessly and brought in through Load → Import.
* `tools/desktop-smoke.mjs` (Electron under Xvfb) — app origin, sandboxed
  bridge, Quit on desktop, save written to disk, bundled GLB served intact,
  navigation blocked.
* `npm run assets:check` — Khronos glTF Validator + manifest/GLB checks for
  every unit model, then the headless model tests.
* `tools/check-boundaries.mjs` — package import rules.
