# Pantheon Realms — Architecture

> Pantheon Realms is a desktop-first, offline-capable, data-driven
> deterministic turn-based strategy game. TypeScript owns authoritative rules
> and AI. React owns application interface screens. PixiJS owns the 2D
> Adventure Map, Tactical Battle presentation, sprite animation, and animated
> Unit Detail viewer. Electron packages the desktop application and a browser
> build uses the same core. Content presentation uses high-resolution 2D
> backgrounds, sprites, atlases, portraits, UI art and animation strips.
> Gameplay state changes only through validated commands; presentation never
> defines gameplay outcomes.

One TypeScript simulation core runs unchanged in the browser build, the
Electron desktop build and headless tests. Electron only provides native
storage and window services. (The 2D migration of 2026-10-03 replaced the
earlier 3D presentation layer.)

```
Content definitions ──► Shared TS rules ──► GameCommand ──► validate ──► commit
                                                                   │
                         MatchState (revision + 1) + immutable GameEvent[]
                                                                   │
                 ┌──────────────────────┬──────────────────────────┼───────────────┐
              React UI          PixiJS 2D views (playback)    AI observers     saves/tests
```

The rules decide; everything else presents. React never subtracts gold,
the Pixi views never compute damage, animation callbacks never kill creatures and the
AI never mutates state directly — each of those paths goes through
`processCommand`.

## 1. Packages

| Package | Owns | Must not |
|---|---|---|
| `@pr/rules` | IDs, resources, deterministic RNG, hex math, content *types*, `MatchState`, commands, events, `processCommand`, every quote/commit (economy, movement, sites, heroes, gods, quests, turn/dawn, adventure spells, tactical battle, sieges, deployment, damage) | import anything outside the TS standard library (no DOM, React, PixiJS, Electron, Node) |
| `@pr/content` | The authored, validated `ContentCatalog`: six playable pantheons (Greek design values; Norse, Egyptian, Japanese, Celtic and Mesoamerican values proposed) with rosters/towns/gods/heroes/classes/lore, spells, skills, artifacts (incl. the `arcana` spells, artifacts and sets with lore), *The Three Beacons*, *The Winter Oath* (seven Norse missions), the four arc campaigns (`campaign/arc.ts` builds seven-mission campaigns from writing + layout; *The Twelfth Hour*, *The Lantern Road*, *The Silver Branch*, *The New Fire*), the neutral creature roster (`common/neutrals.ts`), the *Twin Harbors* skirmish in 36 pantheon pairings, validators | contain logic beyond building and validating data |
| `@pr/mapgen` | Template-driven logical map generation (`pr-mapgen-0.3`), validation, logical hash, cosmetic decor stream; the symmetric random skirmish generator (`pr-skirmishgen-0.7`, `skirmish.ts`: square maps with `void` cells outside the square, two to six empires (`symmetryLayout`), nine map types, zones, guarded passes and gates, two-way portals paired by the map's symmetry, roads to the centre (routed over hex and heading with trunk sharing and turn penalties, 0.7), optional unowned towns, neutral + pantheon creatures half and half, size/guard/treasure/wealth/road/reveal/portal settings) that outputs a full `MissionDefinition` | affect rules through cosmetic data |
| `@pr/campaign` | Mission factory (scenario manifest or generated scenario → `MatchState`; difficulty, seat controllers, names and patrons), hero carryover, campaign state machine, completion records with mission scores; `createRandomSkirmish` (re-exports the generator for the session and UI) | render or persist |
| `@pr/ai` | Observation (belief-state redaction), strategic and tactical planners, controller that submits commands | read hidden state or write state |
| `@pr/session` | `GameSession` (single authoritative state host), checkpoints, campaign transitions, versioned save envelope + validation | contain rules or storage I/O |
| `@pr/platform` | `SaveRepository` / `PreferencesStore` (preferences and the separate high-score `records` store) / window + quit contracts; browser (IndexedDB/localStorage), desktop (preload bridge) and memory adapters | contain rules |
| `@pr/presentation` | PixiJS 2D views: one long-lived `EngineHost` (one Pixi renderer and canvas); the Adventure Map, Tactical Battle and Unit Detail viewer controllers; `SpriteFigure` sprite animation (loops on the frame clock, one-shots on the tween clock); the sprite manifest types, animation vocabulary, fallback chain and `requiredAnimations`; battle playback cues for sound; code-drawn magic effects and status overlays (`fx.ts`); the climate-aware nature scenery (`nature.ts` with `nature-policy.json`: the map's plants, rocks, mountains, border clumps and water scenery, and the battle obstacles' stills, from stable hashes — presentation only). `@pr/presentation/core` is its Pixi-free part (sprite manifest lookup, hex↔screen transforms, palette, environment art keys, graphics presets, the looks of magic and Favor `fxLooks.ts`) | decide legality or change state |
| `@pr/audio` | Web Audio mixer: sound manifest types and validation, buses (music, ambience, interface, combat, voice), music/ambience crossfades, stinger ducking, voice limits and cooldowns, the "Calmer sound" policy | read or change game state; fetch anything that is not bundled |
| `@pr/ui` | React app shell, 21 screens, dialogs (incl. the story dialogue window, hot-seat hand-over, camps, map events, interventions), view helpers, preferences (incl. key bindings and tips), high-score records, save-slot policy, asset manifest (art by asset ID + the sprite manifest), which sound plays when (`audio/`) | edit `MatchState` (it dispatches commands) |
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
presentation ← rules, mapgen, pixi.js
audio      ← (nothing)
ui         ← rules, content, session, platform, presentation, audio, ai, react, fonts
client     ← ui, platform, react
desktop    ← electron, node:*
```

**Start-up size rule (also enforced by the lint):** `ui` may take *values*
only from `@pr/presentation/core`, which must not import `pixi.js`. The 2D
views are reached through `import type` or the one on-demand loader in
`ui/src/scene/SceneHost.tsx`, so PixiJS is not part of the start-up bundle
(see §6). The lint also rejects any `@babylonjs/*`, `three`, `SceneLoader` or
`ArcRotateCamera` reference in package sources.

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
  exceed seven stacks chooses at most seven (`BattleSelectDefenders`, BAT-14),
  optionally after combining identical stacks (`BattleMergeDefenders`,
  2026-10-07: a persistent exchange into the visiting hero's matching stack,
  else the garrison's; seven or fewer left defend at once). AI defenders
  combine, then pick by value. The rest become `siege.reserves`.
* `deployment` — only for a human side whose commander has Tactics
  (owner decision): `BattleDeploy` inside the zone (2 + Tactics columns, inside
  or outside the walls in a siege; swaps allowed), then
  `BattleConfirmDeployment`. Without Tactics the default formation *is* the
  two-column deployment. Auto-combat confirms.

`town_siege` encounters start when a hero enters an enemy-held town that has a
garrison or a visiting hero. `systems/battle/siege.ts` builds the fixed wall
layout from the town's `siege_fortification` level (Fort/Citadel/Castle), and
the round start runs the Catapult shot (at `siege.catapultTargetId`, set by
the attacker's free `BattleAimCatapult` on its own turn, while that structure
stands; else the lowest-ID intact structure) then keep/tower shots (each at the
attacker stack its shot hurts most — `turretTarget`: Gold worth of Health
removed, shooters × 1.5; ties closest, then ID). Structures block
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
  The Workshop (`enables_workshop` effect: stock size and item rarities) works
  the same way (`refreshWorkshopStock`; `TownState.workshop`; `BuyArtifact`
  with `shop: 'workshop'`); each town marks its own sold pieces until the
  next week. `refreshTownShops` refreshes both.
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
  (`artifactSetStatus`) + skill effects (`SkillRule` `effects` by rank) + the
  gods' gifts (`HeroState.perks`, `catalog.godPerks`; 2026-10-07: offered at
  levels 10 and 15 with `expandedContent` as `LevelUpDecision.perkOffers`, from
  the empire's committed gods, chosen with `ChooseLevelUp.perkIndex`; built from
  each god's domain words in `content/src/common/godPerks.ts`; attributes count
  as divine in `effectiveAttributes`). New
  effect types: `mana_regen`, `spell_damage_percent`, `movement_percent`
  (also used by weekly events) — read by dawn mana, spell damage and the
  movement budget.
* **Interventions** (`systems/interventions.ts`): `InvokeIntervention`
  (adventure) and `BattleInvokeIntervention` (at the start of one's own
  activation); one per world week (`PlayerState.interventionWeek`), paid in
  Favor; effect types `restore_movement`, `restore_mana`, `grant_resources`,
  `town_growth`, `battle_status`, `battle_heal`, `battle_smite`. Shared
  miracles carry each pantheon's own name (`names`); `interventionsFor`,
  `interventionOf` and the quote return them under the player's pantheon's
  name (2026-10-07).
* **Hero hiring**: at most one hire per empire per world week
  (`PlayerState.heroHireWeek`, `heroHiredThisWeek`; 2026-10-07).
* **Unowned towns** (`MissionDefinition.neutralTowns`, 2026-10-07): towns with
  `ownerId: null` and no hero; walking into an unguarded one takes it, a
  garrisoned one is a `town_siege` against a neutral side. Random maps place
  them with `unownedTowns`; authored and editor maps mark a town site without
  `owner` (`packages/mapgen/src/unownedTowns.ts` builds the setup and
  garrison).
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
  (`validateGeneratedMission`). Custom maps (the editor's `*.prmap.json`) and
  the authored skirmish maps (catalog `skirmishMaps`, documents in
  `packages/content/src/skirmish/maps/`) share one document type
  (`rules/definitions/customMap.ts`) and one compiler (`mapgen/custom.ts`,
  `compileCustomMap`; `campaign`'s `compileSkirmishMap` picks a map's seats).
* **Difficulty** (`DifficultyDefinition`): wallet and income percentages
  (`PlayerState.incomePercent`) applied by the mission factory, plus the AI
  personality margins (`aiPersonality`). Skirmish levels (Easy/Normal/Hard)
  and, since 2026-10-07, campaign levels (`scope: 'campaign'`: Story, Normal,
  Hard) which also scale the creatures in guards, wandering monsters, scripted
  hostile armies and unowned garrisons (`guardPercent`), the computer rivals'
  starting armies (`rivalArmyPercent`) and the scripted hostile heroes' attack
  threshold (`hostileThresholdPercent`, never below even). `missionDifficulty`
  picks the level a start may use (never one of the other scope); the run keeps
  it (`CampaignState.difficultyId`; absent in older runs = the missions as
  written, so their recorded entry hashes still match) and the match records it
  in `scenario.difficultyId` (score multiplier, AI margins). Creature numbers in
  mission texts are written as tokens (`{army:id=count,…}`) and shown through
  `missionText`, which scales them exactly as the factory scales the armies
  (`scaleStackCount`; a test checks that every token is one of its mission's
  armies).
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
makes Temple offerings only while Favor is still needed (lowest tiers first,
never a hero's last creature), trains visiting heroes while keeping Gold
reserves, and saves for a new hero when it has none. Hero development lives in
`packages/ai/src/growth.ts` (2026-10-02): level-up offers scored for the hero's
army and magic; artifact loadouts valued with set bonuses (equip, swap, buy by
gain per Gold); adventure spells (movement when a move falls just short,
scouting an unseen rival town, Recall to a threatened town). Map movement also
uses portals the empire has used, reinforces from any owned town, and only
approaches an unseen town with a hero strong enough for a public-information
estimate of its garrison. The tactical AI takes a free Shapeshift when the other
aspect gives a clearly better best action (e.g. Hare Speed lets a Pooka reach
an enemy); it does not use a Shapeshift that costs the activation.

Late game (2026-10-07, `packages/ai/src/handoff.ts`): from day 15 secondary
heroes carrying 15–80% of the main army's strength walk to it (≤ 2 days, safe
stops only) and hand their stacks over (`TransferStack`, one creature kept);
the weekly miracle is held for a battle while an enemy army or town is within
16 hexes, until the week's last two days, and called in battle only when it
decides something (siege, rival hero, close odds); a town lost in the last 21
days (`PlayerState.lostTowns`, written by `systems/ownership.ts` on every
ownership change) is worth 1.6 × and besieged at 0.85 × the usual margin.
Quick battles (`packages/ai/src/quickBattle.ts`): `runQuickBattle` submits the
encounter move and fights the battle with the tactical AI on both sides through
the processor; the encounter panel runs it on the current state for the
preview and `GameSession.quickBattle` runs it again on the same state, so both
agree exactly (deterministic RNG in the state, command IDs from the state).

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
* The strategic AI breaks ties between equally scored moves with a hash of
  the empire and the move (`tieHash` in `ai/src/strategic.ts`), not by
  coordinates, so empires on opposite sides of a mirrored map are not steered
  in different directions. Still deterministic per match.
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

**Loading on demand.** PixiJS 8 lives in a separate chunk (about 363 KB): the
main menu starts without it, `preloadPresentation()` fetches it when the
browser is idle after the menu appears, and a map, battle or bestiary screen
that opens before that waits for it behind "Loading…". Controllers therefore
reach their screen asynchronously; screens push their latest view from refs
when one arrives. Sprite strips are fetched when a view first needs them
(local files only; the desktop CSP forbids `eval`, so the views import
`pixi.js/unsafe-eval`, Pixi's no-eval shader path). `tools/perf/load-time.mjs`
measures start-up and first-scene times.

A single `EngineHost` owns one Pixi renderer (WebGL) and canvas, its own
frame loop (capped by the graphics preset; High 60 fps), context-loss
handling, adaptive resolution (`graphics.ts adaptResolutionStep`: fewer pixels
while frames run under ~34 per second), the GPU upload queue for loaded
pictures (`textures.ts`: decoded off the main thread, a few sent per frame)
and the frame counters behind the frame-rate readout; screens mount it into
their viewport and ask for a scene controller. Both controllers keep their
layers in Pixi render groups (2026-10-06): the camera is one group transform,
and a layer that changes (animated figures, the reach after a command, a
walk's trail) re-sends only its own group.

**Frame pacing** (2026-10-07): a controller reports its `pace()` — `full`
while anything moves (a playback, an effect, the camera easing, a drag, a walk,
the ground cache catching up), `ambient` while only idle loops and pulses play,
`still` without ambient motion (Low, reduced motion) — and the engine draws at
the preset's cap, at 30 frames a second (`AMBIENT_FPS`) or at 8 (`STILL_FPS`).
Pointer, wheel and key input, pictures still arriving and a controller's
`wake()` (every view update) bring the full rate back at once. Calm frames are
left out of the frame-rate readout's timing, the slow-frame count and adaptive
resolution; the readout says "calm" while nothing moves.

**Ground cache** (`groundCache.ts`, 2026-10-07): the map's ground layer
(painted terrain, painted transitions, shore foam, roads, grid) is also drawn
into 512-pixel square render textures on the screen's pixel grid at the current
zoom and resolution (multisampled like the screen); while those chunks cover
the view the live ground is not drawn (`renderable = false`). At most four
chunks (and about 6 ms) are drawn per frame — the view's first, then a
half-chunk ring around it — and whenever they do not cover the view (just
opened, the ground changed: `invalidate` from `drawTerrain`, `drawRoads`, a new
grid; a zoom, settled for 200 ms before chunks are drawn; a resolution change;
a pan faster than the ring) the live ground is drawn as before. Context loss
redraws the chunks (`SceneController.contextRestored`).

* `AdventureSceneController` — 2D layers, back to front (black behind the
  map is the renderer's background colour): painted terrain (the delivered ground paintings as
  repeating fills in map space), roads, optional hex grid, reachable
  overlay, ground markers (selection ring, route preview — dots, then an X
  for a battle — and hover), objects depth-sorted by screen *y* (map
  locations, decoration, guards, one mounted avatar per pantheon), fog and
  effects. Pointer→hex picking inverts the hex projection
  (`hexmath.pointAxial`), so a sprite's size never changes which hex is
  chosen. Avatars play `idle`/`walk` facing one of eight directions (a
  direction strip when delivered, else the right-facing strip mirrored) and
  a short readiness beat before an accepted battle; the Adventure presenter
  awaits it after a committed `BattleStarted`, so the battle screen follows
  it — the rules are untouched. A 2D camera pans (drag, arrow keys) and zooms
  (wheel, 0.42–2.2), clamped to the map.
* `BattleSceneController` — the painted battlefield background fitted to the
  board, the logical 15×11 odd-r hex overlay (deployment zones, moat, paved
  town cells, optional grid), obstacles and siege pieces (wall, gate, towers,
  keep in intact/damaged/rubble states with HP labels; the six-pantheon gate
  is an opening in the wall drawn in a north and a south part around the
  gate cell, `siegeGate.ts`), creature stack
  sprites standing on their anchor cell (feet at the cell centre; defenders
  mirrored), count badges, highlights, projectiles and effects, and playback
  of committed battle events (move, melee, shot + projectile, retaliation,
  spell, ward, defend, wait, morale, catapult/turret/moat/structure damage,
  destruction — the fallen play `death` and stay lying on their cells — and
  victory). The React HUD sits on top; the board is laid out between its
  insets. A new board reports when its essential pictures are drawn
  (`onBoardReady`: the battlefield painting, the siege pieces and each stack's
  idle frame, failures included — a stack without its picture stands as a
  silhouette — capped at 15 s); until then the battle screen veils the field,
  withholds commands and the AI waits (`AppStore.boardLoading`).
* `UnitViewerController` — the animated Unit Detail viewer: the subject's
  strips by state (the buttons come from `requiredAnimations`: the base
  seven `idle, move, attack, defend, hit, death, victory`, plus `shoot`,
  `takeoff/fly/landing` or `ability` when the creature's content has them),
  stand-ins marked when a strip falls back, Play / Pause / Stop / Restart,
  0.5×/1×/2×, Autoplay, Face left, `death` once-and-hold, reduced motion
  shows a still frame.

**Sprites.** `assets-runtime/sprites/manifest.json` (schema
`pantheon-realms-sprites-1`, registered by `ui/src/assets/manifest.ts`)
lists every sprite set: 102 creature forms, seven map avatars (six
pantheons + neutral) with a hero-screen figure each, map locations,
decoration, obstacles, siege pieces, projectiles and effects. Each strip is
one horizontal row of equal frames with an explicit anchor (battle: feet,
bottom centre; map avatars: the ground point between the mount's feet),
a frame rate and loop policy, a scale (pixels per hex), and a `status`
(`placeholder` | `final`) with provenance; sprites face right and the views
mirror them. A missing optional animation falls back (`shoot`→`attack`,
`fly`→`move`→`idle`, `ability`→`attack`, …); a missing `death` lays the figure
down. Replacing a placeholder is an art drop + `npm run sprites:import`
(`ASSET_PIPELINE.md` §1); no view code changes.

**Magic and Favor effects** (2026-10-03). `fxLooks.ts` (core, no Pixi) gives
every spell, divine intervention and divine gift a *look* — colour school,
travel (none, bolt, orb, arrow, swarm, wisps, sky strike), impact, a moment
over the whole field, reach (one stack; the target and the stacks beside it;
the whole army) and a sound family — from its effect type, refined per ID by
the `SPELL_LOOKS` / `MIRACLE_LOOKS` tables (presentation data; new content
gets a look automatically). `fx.ts` paints them with Pixi shapes and
particles on the view's tween clock (`FxPainter`: cast sigil, travel, impact,
map area ring, screen moment) and draws the looping status overlays on each
battle stack (`StatusAura`, one shape per status, still when ambient motion is
off or motion is reduced). Before each phase the painter looks for a delivered
strip under the phase's asset ID (`fx.spell.<id>.<phase>`,
`fx.miracle.<id>.<phase>`, `fx.status.<name>`) and plays it instead. The battle
view holds the stacks a spell or miracle reaches (`hold(events)`) so a newer
view does not show their new statuses before the effect lands; the Battle
presenter holds them while a miracle's painted card is up
(`AppStore.whenMiracleCardsClosed`) and plays the light after it. The Adventure
presenter plays map spells (fog-lifting ring, wind on the hero, Homecoming's
column of light) and the player's own map miracles; the town screen shows a
CSS burst from the Temple for gifts and offerings (`components/burst.tsx`).
Read-only diagnostics: `fxDebug()` on both views (`__prFx` under `?e2e`).

Playback runs after the rules committed the result. Speed 0 (instant or
reduced motion) completes synchronously and cannot change outcomes. Screens
register *presenters* with the `AppStore`; the AI pacing loop waits for the
presentation queue to drain. Presenters run asynchronously, so a screen that
must freeze its view before React re-renders registers a *preparer*
(`AppStore.registerPreparer`), called synchronously with each committed
batch before listeners are notified: the battle screen uses it to hold the
stacks a blow, spell or miracle reaches, so a killed stack plays its hit and
then its death once.

Assets are referenced only by stable IDs (`creature.greek.tier3.base.portrait`,
`town.greek.dwelling.tier1.upgraded`, `town.greek.background`,
`hero.greek.alexios.portrait`, `god.greek.zeus.portrait` …). Resolution order:
final manifest (`assets-runtime/ui/final-manifest.json`, written by
`npm run icons:import`) → UI art and placeholder manifests (`assets-runtime/ui`,
`assets-runtime/placeholders`) → procedural placeholder. `npm run icons:catalog`
lists every asset ID the screens show (`ICON_CATALOG.md`, written on demand). Swapping in final art or sprites requires manifest
entries, not screen changes.

**Sound.** `@pr/audio`'s `AudioDirector` is one Web Audio graph (source →
sound gain → bus → [music: stinger duck] → master → focus → limiter).
`ui/src/audio/gameAudio.ts` connects it to the app: music and ambience follow
the screen and the mission's `soundscape` (presentation data on the mission
definition, never read by the rules); a presenter plays the player's own
committed actions, the calendar and stingers without delaying the
presentation queue; the battle scene emits `BattleCue`s timed with its
animation (one summary sound per action when playback is instant; a spell's
cue carries its look's sound family, `magic.<family>`); buttons click, dialogs
open and close (the spellbook with its own sounds, and a page turn when its
filter changes), the town's building pop-up and actions have theirs, errors
sound once. Every sound accompanies
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
S06 Adventure Map · S07 Hero/Army · S08 Town · S09 Recruitment · S10
Pantheon/Gods · S11 Tactical Battle · S12 Battle Result · S13 Level-Up · S14
Journal · S16 Encyclopedia · S17 Settings · S18 Unit Detail · S19 Random Map
setup · S20 Summary · S21 High Scores (S05 Starting Patron and S15 World
Overview were removed on 2026-10-03; the single patron is preselected).
Dialogs: pause, save/load, confirmation, briefing, debrief, mission failed,
campaign complete, game over, help, army exchange, pre-battle encounter,
beacon/relay activation, stack details, the spellbook (read on the hero
screen, cast from the map's and the battle's Spells buttons:
`components/spellbook.tsx`), market, tavern, hot-seat hand-over, creature
camp, map event, interventions, keyboard shortcuts. The town's building
pop-up and economy panel sit on the painting (`TownArchetypeDefinition.hudAnchor`
names the stretch of sky each painting keeps free).

2026-10-07: the encounter dialog carries the quick-battle preview
(`dialogs/QuickBattle.tsx`; `store.quickBattle` goes straight to the result
screen because the battle starts and ends in one published batch); the map
shows "While you waited" (`app/rivalSummary.ts`: per human seat, notes from
the batches between its TurnEnded and TurnStarted, kept only for what that
seat saw or what touched it; `store.rivalSummary`); the level-up screen takes
a god's gift first when offered (`components/godGifts.tsx`: the god's portrait
and an existing stat icon per gift theme); the map editor has the symmetry
brush and Generate (`mapgen/src/editorTools.ts`).

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
* `packages/presentation/test` — sprite manifest completeness (every creature
  form, avatar, location, obstacle, effect; files at their declared sizes),
  animation requirements following content, the fallback chain, direction
  strips, hex↔screen round trips; `packages/ui/test/townArt.test.ts` — six
  towns, 18 locations each, base and upgraded dwelling pictures.
* Playwright (Chromium, SwiftShader WebGL) — main menu honesty, settings
  persistence, bestiary viewer, a UI journey through Mission 1, Mission 1 to
  its debrief and into Mission 2 (with its story scenes, Continue and
  Backlog), the New Game modes, skirmish difficulty, a hot-seat random map
  with hand-overs, shortcut help and rebinding, tips, the game-over →
  summary → high-score flow, sieges (BAT-14 selection, Tactics
  deployment, wall battering, capture), a skirmish for each non-Greek pantheon
  chosen with its rival in setup (town, build, recruit), the 2D views
  (`sprites2d.spec.ts`: bestiary states and reduced motion, battle stacks on
  their logical cells and mirrored, instant and normal auto-battle giving
  identical results; `heroes.spec.ts`: map avatars, walk facing, readiness
  beat, 2D camera). Scenario fixtures are ordinary save files built
  headlessly and brought in through Load → Import; the `?e2e` inspectors
  (`__prBattle`, hero animation debug) are read-only.
* `tools/desktop-smoke.mjs` (Electron under Xvfb) — app origin, sandboxed
  bridge, Quit on desktop, save written to disk, the sprite manifest and its
  files served and decoded (no `.glb`/`.gltf`/`.blend` in the renderer), the
  adventure map drawn without a view error, navigation blocked.
* `tools/check-boundaries.mjs` — package import rules.
* `npm run campaign-sim` (`tools/campaign-sim`, never packaged; 2026-10-07) —
  plays The Winter Oath and the arc campaigns many times: an objective-driven
  autopilot for the player (`pilot.ts`: recruit/train/build for counters,
  gods, claims, activations, map events that set a needed flag, sites, heroes
  and towns; a guarded objective only when `runQuickBattle` wins; otherwise
  the shipped strategic AI), the shipped AI for every other side; reports wins,
  days, the costliest battle and a verdict per mission.
