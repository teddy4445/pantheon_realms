# Pantheon Realms — Logical Architecture and Domain Model

**Status:** Development reference  
**Updated:** 2026-10-03 — presentation technology migrated to PixiJS 2D sprites (owner directive, *2D Presentation Migration Directive*); the domain model, rules and invariants are unchanged.  
**Purpose:** Canonical guide for Claude and human developers implementing Pantheon Realms.  
**Core principle:** The game is a **data-driven, deterministic strategy simulation**. Content definitions describe what things are; runtime state describes what is happening in a match; systems change state only through validated commands; immutable events describe committed results; React, PixiJS, animation, VFX, and audio present those results but never define game truth.

---

## 1. Architectural principles

1. **One authoritative TypeScript rules core.** Human players, AI, previews, saves, desktop, and browser builds all use the same rules implementation.
2. **Definitions are not runtime instances.** A `CreatureDefinition` describes a Hoplite; a `CreatureStackState` describes 37 Hoplites in a specific army.
3. **Prefer composition over inheritance.** Flight, ranged attacks, charge, regeneration, retaliation, etc. are abilities/effects, not subclasses.
4. **Use stable typed IDs for relationships.** Cross-domain relationships should normally use IDs rather than circular object references.
5. **All authoritative mutations go through commands.** UI, AI, scripts, and campaign logic submit commands to the same validation/commit path.
6. **Presentation never changes rules state.** Animation callbacks, particles, collisions, audio cues, and UI transitions cannot apply damage, spend resources, grant rewards, or complete quests.
7. **Gameplay randomness is explicit and deterministic.** Gameplay RNG streams are saved. Cosmetic randomness is separate.
8. **Content is data-driven.** Gods, creatures, buildings, spells, quests, and most abilities should be content definitions rather than bespoke code classes.
9. **Every pantheon has exactly seven creature families.**
10. **Every creature family has exactly one base form and one upgraded form.** No branching upgrade trees and no third promotion.
11. **Each city has eighteen logical building locations:** seven creature-dwelling locations and eleven support-building locations.
12. **A creature dwelling uses one location for both forms:** `empty -> base dwelling -> upgraded dwelling`.
13. **God count is not tied to city-building count.** A pantheon may contain many gods; divine choices are primarily content/progression, not one temple per god.
14. **Desktop-first and offline-capable, 2D presentation.** TypeScript owns authoritative rules and AI. React owns application interface screens. PixiJS owns the 2D Adventure Map, Tactical Battle presentation, sprite animation, and animated Unit Detail viewer. Electron packages the desktop application and a browser build uses the same core. Content presentation uses high-resolution 2D backgrounds, sprites, atlases, portraits, UI art and animation strips.

---

## 2. Top-level domain structure

```text
GameDefinition
├── RulesProfile
├── ContentCatalog
│   ├── PantheonDefinition[]
│   ├── GodDefinition[]
│   ├── HeroDefinition[]
│   ├── CreatureFamilyDefinition[]
│   ├── CreatureDefinition[]
│   ├── BuildingDefinition[]
│   ├── SpellDefinition[]
│   ├── AbilityDefinition[]
│   ├── ArtifactDefinition[]
│   ├── QuestDefinition[]
│   ├── CampaignDefinition[]
│   └── MapTemplateDefinition[]
└── VersionBundle

GameSession
└── MatchState
    ├── GameClockState
    ├── PlayerState[]
    ├── WorldMapState
    ├── MissionState
    ├── QuestState[]
    ├── PantheonProgressState[]
    ├── BattleState?
    ├── PendingDecisionState?
    ├── GameOutcome
    └── RngStateBundle
```

### Definition versus state

```text
CreatureDefinition
"Hoplite has Attack 6 and HP 10"
        │
        └── referenced by
               ↓
CreatureStackState
"Player 1 currently owns 37 Hoplites in this stack"
```

Never duplicate reusable base statistics into each runtime object unless a cached derived value is explicitly validated and disposable.

---

## 3. Naming conventions

| Suffix | Meaning |
|---|---|
| `Definition` | Immutable reusable content |
| `State` | Mutable state in one match/session |
| `System` | Rules that operate on state |
| `Resolver` | Pure or near-pure calculation/query |
| `Factory` | Creates a valid domain object/aggregate |
| `Validator` | Checks invariants |
| `Repository` | Persistence/storage abstraction |
| `Controller` | Coordinates external input or presentation |
| `ViewModel` | Read-only structure prepared for UI |
| `Command` | Requested authoritative mutation |
| `Event` | Result emitted by a committed mutation |
| `Quote` | Read-only preview of a possible action |
| `Policy` | Explicit rules for carryover, targeting, ownership, etc. |
| `Registry` / `Catalog` | Indexed lookup of definitions |

Examples:

```text
CreatureDefinition   -> reusable content
CreatureStackState   -> current match state
DamageResolver       -> calculation
RecruitUnitsCommand  -> requested mutation
UnitsRecruitedEvent  -> committed result
BattleViewModel      -> data prepared for the UI
```

---

## 4. Typed identifiers

Prefer branded IDs over plain strings.

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };

type PlayerId = Brand<string, "PlayerId">;
type HeroId = Brand<string, "HeroId">;
type TownId = Brand<string, "TownId">;
type CreatureId = Brand<string, "CreatureId">;
type CreatureFamilyId = Brand<string, "CreatureFamilyId">;
type GodId = Brand<string, "GodId">;
type BuildingId = Brand<string, "BuildingId">;
type QuestId = Brand<string, "QuestId">;
type MapLocationId = Brand<string, "MapLocationId">;
type CommandId = Brand<string, "CommandId">;
type EventId = Brand<string, "EventId">;
```

This prevents accidental cross-domain references such as passing a `HeroId` where a `TownId` is expected.

---

## 5. Foundation types

| Type | Responsibility |
|---|---|
| `GameDefinition` | Root immutable definition of a game/content version |
| `RulesProfile` | Calendar, formulas, limits, legal-action timing, rounding, combat/economy rules |
| `ContentCatalog` | Registry of all immutable content definitions |
| `VersionBundle` | Rules/content/save/map-generator/campaign versions |
| `GameSession` | Runtime host around one `MatchState` |
| `MatchState` | Complete authoritative match state |
| `GameClockState` | Current day, week, player turn, phase |
| `GameOutcome` | Running, victory, defeat, abandoned |
| `ResourceBundle` | Gold, Wood, Stone, Crystal, Favor quantities |
| `RngState` | One deterministic gameplay random stream |
| `RngStateBundle` | Named gameplay RNG streams |
| `PendingDecisionState` | A mandatory unresolved choice such as level-up or deity selection |

---

## 6. Pantheons, factions, and gods

A pantheon is a content aggregate. Individual gods should be data, not subclasses.

```text
PantheonDefinition
├── PantheonRosterDefinition
│   └── exactly 7 CreatureFamilyDefinition IDs
├── HeroDefinition IDs
├── GodDefinition IDs
├── TownArchetypeDefinition
├── PantheonVisualThemeDefinition
└── PantheonAudioThemeDefinition
```

### Core types

| Type | Responsibility |
|---|---|
| `PantheonDefinition` | Faction identity and references to its content |
| `PantheonRosterDefinition` | Exact seven creature families assigned to tiers 1–7 |
| `GodDefinition` | One selectable deity and its requirements/benefits |
| `DivineBenefitDefinition` | Reusable divine bonus/effect |
| `PantheonProgressState` | Player's selected/unlocked gods and divine progression |
| `PantheonVisualThemeDefinition` | Town, UI, environment, color, VFX asset references |
| `PantheonAudioThemeDefinition` | Music and ambience references |

### Seven-tier invariant

```ts
type CreatureTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;
```

Validation must require exactly one creature family at every tier.

```text
Tier 1 -> one CreatureFamilyDefinition
Tier 2 -> one CreatureFamilyDefinition
Tier 3 -> one CreatureFamilyDefinition
Tier 4 -> one CreatureFamilyDefinition
Tier 5 -> one CreatureFamilyDefinition
Tier 6 -> one CreatureFamilyDefinition
Tier 7 -> one CreatureFamilyDefinition
```

For six pantheons this yields:

```text
42 creature families
84 gameplay creature forms
```

### Do not use god subclasses

Avoid:

```text
God
├── Zeus
├── Athena
├── Odin
├── Ra
└── ...
```

Prefer:

```ts
interface GodDefinition {
  id: GodId;
  pantheonId: PantheonId;
  name: string;
  requirements: RequirementDefinition[];
  favorCost: number;
  benefits: EffectDefinition[];
}
```

Adding a new god should primarily be a content operation.

---

## 7. Creature domain

```text
CreatureFamilyDefinition
├── baseCreatureId
├── upgradedCreatureId
├── tier
├── baseGrowth
└── dwellingId

CreatureDefinition
├── CreatureStats
├── role
├── abilityIds[]
├── cost
├── lore reference
├── animation profile
└── presentation references
```

### Types

| Type | Responsibility |
|---|---|
| `CreatureFamilyDefinition` | Base/upgraded pair, tier, shared growth, dwelling |
| `CreatureDefinition` | Specific base or upgraded gameplay form |
| `CreatureStats` | Attack, Defense, HP, damage, Speed, shots, footprint |
| `CreatureRole` | Infantry, ranged, support, flying, tank, apex, etc. |
| `CreatureStackState` | Runtime quantity of one form |
| `CreatureStackHealth` | Runtime HP representation if persistent injury is needed |
| `AbilityDefinition` | Reusable creature mechanic |
| `StatusEffectDefinition` | Reusable status rules |
| `StatusEffectInstance` | Runtime applied status |
| `CreaturePresentationDefinition` | Sprite set (`spriteAssetId`), portrait, icon, sound, lore references |
| `AnimationProfileDefinition` | Animation names (shared vocabulary and fallbacks), loops, required states; strips, frame grids and anchors live in the sprite manifest |

### Exactly-one-upgrade invariant

```text
CreatureFamily
├── Base Form
└── Exactly One Upgraded Form
```

Validation rejects:

- missing upgraded form;
- upgrade pointing to another upgrade;
- branching upgrades;
- self-upgrades;
- third gameplay forms hidden as skins;
- mismatched family IDs;
- mismatched tiers;
- duplicate incoming upgrade links.

### Prefer abilities over creature subclasses

Avoid:

```text
Creature
└── MeleeCreature
    └── FlyingMeleeCreature
        └── Griffin
```

Prefer:

```ts
CreatureDefinition {
  abilityIds: ["flight", "unlimited_retaliation"]
}
```

Reusable ability examples:

```text
shooter
flight
charge
regeneration
poison
healing
teleport
wall_breaker
no_melee_penalty
retaliation_2
retaliation_unlimited
```

---

## 8. Player domain

```text
PlayerState
├── pantheonId
├── ResourceWallet
├── PantheonProgressState
├── ownedHeroIds
├── ownedTownIds
├── controlledSiteIds
├── QuestState[]
├── PlayerVisibilityState
└── DiplomacyState?
```

### Types

| Type | Responsibility |
|---|---|
| `PlayerState` | Authoritative runtime state of one player |
| `ResourceWallet` | Player resources |
| `OwnershipIndex` | References to owned entities |
| `PlayerVisibilityState` | Known/visible world information |
| `DiplomacyState` | Future diplomatic relations |
| `PlayerController` | Produces player decisions |
| `HumanPlayerController` | Human decision source |
| `AIPlayerController` | AI decision source |

Appropriate polymorphism:

```text
PlayerController
├── HumanPlayerController
└── AIPlayerController
```

`HumanPlayer` and `AIPlayer` should not be different subclasses of `PlayerState`; their game state follows the same rules.

---

## 9. Hero domain

```text
HeroDefinition
        ↓
HeroState
├── HeroAttributes
├── ExperienceState
├── HeroSkillState[]
├── SpellbookState
├── InventoryState
├── EquipmentState
├── MovementState
└── ArmyState
```

### Types

| Type | Responsibility |
|---|---|
| `HeroDefinition` | Immutable hero identity/content |
| `HeroClassDefinition` | Progression profile and skill eligibility |
| `HeroState` | Runtime hero instance |
| `HeroAttributes` | Attack, Defense, Power, Knowledge |
| `ExperienceState` | Level and XP |
| `HeroSkillDefinition` | Reusable skill definition |
| `HeroSkillState` | Current learned rank |
| `SpellbookState` | Known spells |
| `InventoryState` | Backpack/item ownership |
| `EquipmentState` | Equipped artifacts |
| `MovementState` | Daily movement budget and remaining movement |

Under the current combat model, heroes remain commanders rather than normal creature stacks on the tactical grid.

---

## 10. Army domain

```text
ArmyState
└── ArmySlot[7]
    └── CreatureStackState?
```

### Types

| Type | Responsibility |
|---|---|
| `ArmyState` | Ordered stack collection |
| `ArmySlot` | Slot index plus optional stack |
| `CreatureStackState` | Creature form, quantity, persistent runtime data |
| `ArmyTransferRequest` | Proposed stack movement |
| `ArmyValidationResult` | Validation outcome |

An army may belong to a hero, town garrison, neutral encounter, or scripted enemy hero. Prefer ownership/reference metadata to separate `HeroArmy`, `TownArmy`, and `NeutralArmy` subclasses.

---

## 11. Town and city domain

Each pantheon has one town archetype with **18 logical visual locations**.

```text
TownArchetypeDefinition
└── TownLayoutDefinition
    ├── 11 SupportBuildingSlotDefinition
    └── 7 CreatureDwellingSlotDefinition
```

### Types

| Type | Responsibility |
|---|---|
| `TownArchetypeDefinition` | Pantheon-specific town identity |
| `TownLayoutDefinition` | Eighteen fixed building locations and visual anchors |
| `BuildingSlotDefinition` | Position, visual bounds, allowed building family |
| `BuildingDefinition` | Cost, requirements, effects, assets |
| `SupportBuildingDefinition` | One of eleven non-creature structures |
| `CreatureDwellingDefinition` | One of seven creature-tier dwellings |
| `TownState` | Runtime town state |
| `TownBuildingState` | Empty/built/upgraded state for one slot |
| `RecruitmentPoolState` | Available population by creature family |
| `TownGarrisonState` | Garrison army |
| `TownVisitorState` | Visiting hero reference |
| `ConstructionQuote` | Read-only build eligibility/cost |
| `RecruitmentQuote` | Read-only recruit eligibility/cost |
| `UpgradeQuote` | Read-only creature-upgrade calculation |

### Dwelling lifecycle

```text
EMPTY SLOT
    ↓ build
BASE DWELLING
    ↓ upgrade
UPGRADED DWELLING
```

The base and upgraded dwelling occupy the same physical/logical city location. Population is shared by creature family; base and upgraded forms do not maintain independent weekly-growth pools.

### Eighteen locations

Seven creature locations:

1. Tier 1 Dwelling
2. Tier 2 Dwelling
3. Tier 3 Dwelling
4. Tier 4 Dwelling
5. Tier 5 Dwelling
6. Tier 6 Dwelling
7. Tier 7 Dwelling

Eleven support locations:

1. Civic Hall
2. Tavern / Heroes' Lodge
3. Marketplace
4. Resource Depot
5. Blacksmith / Workshop
6. Mage Guild / Sanctum
7. Pantheon Temple
8. Fortifications / Gatehouse
9. Training Academy
10. Watchtower / Observatory
11. Artifact Merchant

Pantheons use distinct visual designs while sharing broadly comparable logical roles.

---

## 12. Building system

Buildings should be data-driven.

```text
BuildingDefinition
├── requirements[]
├── cost
├── effects[]
├── slotCategory
├── visual references
└── optional upgrade relationship
```

Avoid building-specific rule classes such as `MarketplaceBuilding`, `GriffinAerieBuilding`, and `AthenaTempleBuilding` unless there is a strong implementation reason. General systems should process content definitions.

---

## 13. Requirements and effects framework

A common requirement/effect system prevents hard-coded special cases across gods, buildings, artifacts, spells, quests, and campaign events.

### `RequirementDefinition`

Example variants:

```text
HasBuilding
HasGod
HasResource
HeroLevelAtLeast
OwnsTown
OwnsSite
QuestCompleted
HasCreatureUnlock
MissionFlagSet
HasSpell
HeroPresentInTown
```

### `EffectDefinition`

Example variants:

```text
ModifyCreatureAttack
ModifyCreatureDefense
ModifyGrowth
ModifyIncome
GrantResource
GrantFavor
GrantSpell
GrantAbility
RevealMap
ModifyHeroMovement
ModifyMorale
ModifyLuck
UnlockBuilding
UnlockCreature
UnlockGod
ApplyStatus
```

### `TriggerDefinition`

Example variants:

```text
OnBuild
OnDayStart
OnWeekStart
OnBattleStart
OnCreatureAttack
OnHeroVisit
OnQuestComplete
OnTownCapture
```

Avoid scattered code such as `if (godId === "athena")`. Prefer shared effect/modifier resolution.

---

## 14. World map domain

```text
WorldMapDefinition
        ↓
WorldMapState
├── MapTileDefinition[]
├── RoadEdge[]
├── AdventureLocationState[]
├── entity positions
└── visibility by player
```

### Types

| Type | Responsibility |
|---|---|
| `HexCoord` | Immutable adventure-map coordinate |
| `MapTileDefinition` | Terrain data |
| `MapTileState` | Mutable tile state only where required |
| `RoadEdge` | Explicit connection and travel behavior |
| `WorldMapDefinition` | Immutable logical generated map |
| `WorldMapState` | Runtime ownership/visibility/state |
| `AdventureLocationDefinition` | Reusable definition of a map site |
| `AdventureLocationState` | Runtime state of one site |
| `ResourceSiteState` | Mine/quarry/sawmill/etc. |
| `ResourcePickupState` | One-time pickup |
| `GateState` | Region/story gate |
| `PatrolState` | World patrol |
| `FogOfWarState` | Known/current visibility |
| `Path` | Validated route |
| `MovementQuote` | Route cost and legality |

The 2D adventure view (PixiJS layers and sprites) is drawn from map data. Sprites, sprite bounds and decoration must never silently define legal movement; picking inverts the hex transform, never sprite size.

---

## 15. Adventure location types

Prefer a discriminated union instead of dozens of subclasses.

```ts
type AdventureLocationDefinition =
  | TownLocationDefinition
  | ResourceSiteDefinition
  | PickupDefinition
  | EncounterDefinition
  | QuestSiteDefinition
  | RevealSiteDefinition
  | GateDefinition
  | ShrineDefinition
  | SpecialLocationDefinition;
```

---

## 16. Map generation

```text
MapGenerator
├── CampaignMapGenerator
└── FutureSkirmishMapGenerator
```

### Types/services

| Type | Responsibility |
|---|---|
| `MapTemplateDefinition` | Authored anchors, barriers, roads, gates |
| `MapGenerationRequest` | Template, seed, versions |
| `MapGenerationResult` | Logical map plus reports/hashes |
| `MapGenerationReport` | Generation/validation diagnostics |
| `MapValidator` | Connectivity and invariant validation |
| `WorldPathfinder` | Hero pathfinding |
| `VisibilityResolver` | Fog/reveal calculation |
| `MovementCostResolver` | Terrain/road movement calculation |

Map generation should run independently of building the 2D view.

---

## 17. Battle domain

```text
BattleState
├── BattlefieldDefinition
├── BattlefieldState
├── BattleSideState attacker
├── BattleSideState defender
├── BattleStackState[]
├── BattleTurnState
├── StatusEffectInstance[]
└── battle RNG state
```

### Types

| Type | Responsibility |
|---|---|
| `BattleState` | Complete authoritative tactical state |
| `BattlefieldDefinition` | Static board/archetype |
| `BattlefieldState` | Runtime occupancy/obstacles |
| `BattleSideState` | Attacker/defender context |
| `BattleStackState` | Temporary tactical stack |
| `BattlePosition` | Tactical hex position |
| `BattleTurnState` | Round, active unit, waited/defended state |
| `BattleAction` | Discriminated union of possible actions |
| `BattleResult` | Final battle outcome |
| `CasualtyRecord` | Persistent losses |
| `RewardPackage` | XP/resources/artifacts/etc. |

A `BattleStackState` refers back to the originating army stack where applicable. It is not the persistent army object itself.

---

## 18. Battle actions

```ts
type BattleAction =
  | MoveAction
  | MeleeAttackAction
  | RangedAttackAction
  | DefendAction
  | WaitAction
  | CastSpellAction
  | UseAbilityAction
  | RetreatAction
  | SurrenderAction;
```

Flow:

```text
BattleAction
    ↓
BattleActionValidator
    ↓
BattleActionResolver
    ↓
new BattleState + BattleEvent[]
```

Human and AI players use this exact same action pipeline.

---

## 19. Battle systems and resolvers

| Type | Responsibility |
|---|---|
| `BattleFactory` | Creates a battle from legal participants |
| `BattleActionGenerator` | Lists current legal actions |
| `BattleActionValidator` | Validates requested action |
| `BattleResolver` | Commits action |
| `BattlePathfinder` | Tactical movement |
| `TargetingResolver` | Target legality |
| `DamageResolver` | Physical damage calculation |
| `SpellResolver` | Spell resolution |
| `AbilityResolver` | Creature active/passive abilities |
| `ModifierResolver` | Hero/god/artifact/status modifiers |
| `TurnOrderResolver` | Speed-based action ordering |
| `MoraleResolver` | Morale behavior |
| `LuckResolver` | Luck behavior |
| `BattleResultBuilder` | Converts battle end into persistent result |

Animation, VFX, physics contacts, and audio do not belong in any of these rules services.

---

## 20. Magic domain

```text
SpellDefinition
├── manaCost
├── requirements[]
├── TargetDefinition
├── EffectDefinition[]
└── presentation references
```

| Type | Responsibility |
|---|---|
| `SpellDefinition` | Immutable spell content |
| `SpellbookState` | Hero's known spells |
| `SpellTargetDefinition` | Legal targeting schema |
| `SpellResolver` | Authoritative spell resolution |
| `SpellQuote` | Read-only legality/cost/preview |

Most spells should be data rather than classes such as `LightningSpell` or `HealingSpell`.

---

## 21. Artifact domain

```text
ArtifactDefinition
        ↓
ArtifactInstance
        ↓
InventoryState / EquipmentState
```

| Type | Responsibility |
|---|---|
| `ArtifactDefinition` | Reusable item effects/content |
| `ArtifactInstance` | One acquired item |
| `ArtifactSlot` | Equipment category |
| `InventoryState` | Hero-owned items |
| `EquipmentState` | Currently equipped items |
| `ArtifactSetDefinition` | Optional item set |
| `ModifierSource` | Tracks where a modifier originated |

Artifact effects flow through the common effect/modifier framework.

---

## 22. Quest and campaign domain

```text
CampaignDefinition
└── MissionDefinition[]
    ├── ScenarioDefinition
    ├── MapTemplateDefinition
    ├── QuestDefinition[]
    ├── EncounterDefinition[]
    ├── victory conditions
    └── failure conditions

CampaignState
└── MissionState
    └── QuestState[]
```

| Type | Responsibility |
|---|---|
| `CampaignDefinition` | Ordered campaign content |
| `CampaignState` | Runtime campaign progress |
| `MissionDefinition` | One campaign level |
| `MissionState` | Runtime mission state |
| `ScenarioDefinition` | Starting setup/restrictions |
| `QuestDefinition` | Reusable objective/reward definition |
| `QuestState` | Runtime quest progress |
| `ObjectiveDefinition` | One objective condition |
| `MissionFlagState` | Scriptable mission flags |
| `EncounterDefinition` | Fixed/scripted enemy encounter |
| `RewardDefinition` | Reusable reward content |
| `CarryoverPolicy` | What persists between missions |

---

## 23. Command architecture

All authoritative state changes use one command path.

```text
React UI --------┐
                 │
AI --------------┼──> GameCommand
                 │        ↓
Campaign script -┘   CommandProcessor
                          ↓
                    CommandValidator
                          ↓
                        commit
                          ↓
              MatchState + GameEvent[]
```

### Base command contract

```ts
interface GameCommand {
  commandId: CommandId;
  expectedRevision: number;
  actorPlayerId: PlayerId;
  kind: CommandKind;
}
```

### Important commands

```text
EndTurn
MoveHero
InteractWithLocation
BuildStructure
RecruitUnits
UpgradeStack
TransferStack
HireHero
EquipArtifact
UnequipArtifact
SelectGod
CastAdventureSpell
StartBattle
BattleMove
BattleMelee
BattleShoot
BattleDefend
BattleWait
BattleCastSpell
BattleUseAbility
Retreat
Surrender
ChooseLevelUp
AcceptQuest
CompleteInteraction
CompleteMission
```

A failed command changes nothing.

---

## 24. Events

Successful commands emit immutable events.

Examples:

```text
HeroMoved
ResourcesSpent
ResourcesGranted
BuildingConstructed
DwellingUpgraded
UnitsRecruited
StackTransferred
StackUpgraded
HeroHired
ArtifactEquipped
GodSelected
BattleStarted
BattleStackMoved
DamageApplied
CreaturesKilled
SpellCast
AbilityUsed
BattleEnded
ExperienceGranted
HeroLeveled
QuestProgressed
QuestCompleted
TownCaptured
MissionCompleted
```

Events can drive animation, audio, VFX, UI notifications, replay/debugging, tests, analytics, and idempotency checks. The authoritative state remains `MatchState`.

---

## 25. Economy systems

```text
EconomySystem
├── IncomeResolver
├── MarketplaceSystem
├── ConstructionSystem
├── RecruitmentSystem
├── CreatureUpgradeSystem
└── GrowthResolver
```

| Type | Responsibility |
|---|---|
| `EconomySystem` | Coordinates economy rules |
| `IncomeResolver` | Daily/resource income |
| `MarketplaceSystem` | Resource exchange |
| `ConstructionSystem` | Building purchases |
| `RecruitmentSystem` | Creature purchases |
| `CreatureUpgradeSystem` | Base-to-upgraded troop conversion |
| `GrowthResolver` | Weekly family population growth |
| `AffordabilityResolver` | Resource checks |

`PlayerState` owns the wallet. Towns must not hold duplicate copies of the player's resources.

---

## 26. Turn and calendar systems

| Type | Responsibility |
|---|---|
| `TurnManager` | Player turn progression |
| `DayProcessor` | Dawn/day-start processing |
| `WeekProcessor` | Weekly creature growth |
| `GameClockState` | Calendar state |
| `ScheduledGameEffect` | Explicit delayed effects where truly necessary |

Avoid hidden real-time timers in authoritative logic.

---

## 27. AI architecture

```text
AIPlayerController
        ↓
ObservationBuilder
        ↓
AIObservation
        ↓
StrategicPlanner
        ↓
ObjectiveEvaluator
        ↓
ActionGenerator
        ↓
proposed GameCommand
        ↓
normal CommandProcessor
```

| Type | Responsibility |
|---|---|
| `AIPlayerController` | Coordinates an AI turn |
| `AIObservation` | Information legally visible to the AI |
| `ObservationBuilder` | Prevents omniscient access |
| `StrategicPlanner` | World/town/hero strategy |
| `TacticalPlanner` | Battle decisions |
| `ObjectiveEvaluator` | Scores strategic goals |
| `ThreatEvaluator` | Estimates danger |
| `ActionGenerator` | Produces candidate legal actions |
| `SearchBudget` | Bounds computation |
| `AIPlan` | Current strategic intention |
| `AIProfileDefinition` | Difficulty/personality parameters |

AI never directly mutates game state.

---

## 28. Factories

Use factories where constructing a valid aggregate requires invariants.

| Factory | Creates |
|---|---|
| `GameSessionFactory` | New game session |
| `PlayerFactory` | Starting player state |
| `HeroFactory` | Runtime hero |
| `ArmyFactory` | Starting/neutral army |
| `CreatureStackFactory` | Valid stack |
| `TownFactory` | Runtime town |
| `MissionRuntimeFactory` | Starting mission state |
| `BattleFactory` | Tactical battle |
| `CampaignFactory` | Campaign runtime |
| `MapGenerator` | Logical map |
| `ViewModelFactory` | Read-only UI data |
| `SceneControllerFactory` | Presentation scene controller |

Do not create factories for trivial records.

---

## 29. Persistence

```text
SaveRepository
├── ElectronSaveRepository
└── BrowserSaveRepository
```

| Type | Responsibility |
|---|---|
| `SaveEnvelope` | Metadata, versions, checksum |
| `SaveSnapshot` | Serialized authoritative state |
| `SaveRepository` | Persistence abstraction |
| `ElectronSaveRepository` | Desktop filesystem adapter |
| `BrowserSaveRepository` | Browser storage adapter |
| `CheckpointService` | Safe save checkpoints |
| `SaveValidator` | Schema/content compatibility |
| `SaveMigrator` | Explicit supported migrations |
| `ReplayRecord` | Optional deterministic command/event record |

Do not serialize PixiJS display objects, React objects, class prototypes, native handles, or incidental JS object ordering.

---

## 30. Presentation architecture

Presentation types are intentionally separate from rules types.

```text
SceneController
├── AdventureSceneController
├── TownSceneController
├── BattleSceneController
└── UnitViewerSceneController
```

Presentation services:

```text
AssetLoader
AssetManifest
AnimationController
VfxDirector
AudioDirector
MusicDirector
CameraController
SelectionController
TownBuildingLayerController
CreaturePresentationController
```

These read committed state/events. They do not authoritatively mutate gameplay.

In the 2D implementation (`packages/presentation`, PixiJS): the adventure map, battle and unit viewer controllers share one renderer and frame loop; the town is a React screen over a painted background with building overlays at its eighteen locations. `AssetManifest` is the sprite manifest (one horizontal strip per animation, explicit anchor, right-facing art mirrored by the renderer, `placeholder`/`final` status and provenance per entry). `CameraController` is a 2D pan/zoom camera with clamps. Screen-to-hex conversion has exactly one implementation, and picking never depends on sprite size.

---

## 31. React/UI architecture

React consumes purpose-built read-only view models.

```text
GameViewModelFactory
├── MainMenuViewModel
├── AdventureViewModel
├── TownViewModel
├── RecruitmentViewModel
├── HeroViewModel
├── PantheonViewModel
├── BattleViewModel
├── BestiaryViewModel
├── QuestViewModel
├── WorldOverviewViewModel
└── SettingsViewModel
```

The UI must not maintain duplicate creature stats, wallets, prices, battle formulas, or quest truth.

---

## 32. Content loading and validation

```text
ContentLoader
        ↓
ContentRegistry
        ↓
ContentValidator
```

Specialized validators:

```text
CreatureRosterValidator
CreatureUpgradeValidator
TownLayoutValidator
BuildingTreeValidator
PantheonValidator
GodValidator
CampaignValidator
MapTemplateValidator
QuestValidator
AssetReferenceValidator
```

A production build should reject content where, for example:

- a pantheon has fewer or more than seven creature tiers;
- a tier has two creature families;
- a creature family lacks an upgrade;
- an upgraded creature points to a third form;
- a dwelling references the wrong family;
- a town does not define exactly eighteen building locations;
- a god references an unknown effect;
- a mission references an unknown creature;
- an asset manifest references missing mandatory files.

---

## 33. Recommended inheritance rules

### Appropriate polymorphism

```text
PlayerController
├── HumanPlayerController
└── AIPlayerController

SaveRepository
├── ElectronSaveRepository
└── BrowserSaveRepository

SceneController
├── AdventureSceneController
├── TownSceneController
├── BattleSceneController
└── UnitViewerSceneController

MapGenerator
├── CampaignMapGenerator
└── SkirmishMapGenerator
```

### Avoid domain inheritance explosions

Avoid:

```text
Creature
└── MeleeCreature
    └── FlyingMeleeCreature
        └── Griffin
```

Avoid:

```text
God
├── Zeus
├── Athena
├── Odin
└── ...
```

Avoid:

```text
Building
└── MilitaryBuilding
    └── CreatureBuilding
        └── GriffinBuilding
```

Prefer definitions, discriminated unions, abilities, requirements, effects, and composition.

---

## 34. Aggregate ownership map

```text
MATCH
│
├── PLAYER
│   ├── ResourceWallet
│   ├── PantheonProgressState
│   ├── OwnershipIndex
│   └── QuestState[]
│
├── HERO
│   ├── ExperienceState
│   ├── HeroSkillState[]
│   ├── EquipmentState
│   └── ARMY
│       └── CreatureStackState[]
│
├── TOWN
│   ├── 18 BuildingSlot states
│   ├── RecruitmentPoolState[]
│   ├── TownGarrisonState
│   └── visiting HeroId?
│
├── WORLD MAP
│   ├── terrain
│   ├── roads
│   ├── locations
│   ├── entity positions
│   └── visibility
│
└── BATTLE?
    ├── battlefield
    ├── temporary battle stacks
    ├── temporary effects
    └── battle RNG
```

Cross-aggregate relationships should normally use IDs.

---

## 35. Example: recruiting creatures

```text
Player clicks Recruit
        ↓
RecruitmentView
        ↓
RecruitmentQuoteResolver
        ↓
"12 Hoplites cost X; action is legal"
        ↓
Player confirms
        ↓
RecruitUnitsCommand
        ↓
CommandProcessor
        ↓
RecruitmentSystem
        ↓
validate:
  actor
  town ownership
  dwelling
  population
  destination
  army slots
  resources
        ↓
atomic commit
        ↓
MatchState revision + 1
        ↓
events:
  ResourcesSpent
  RecruitmentPoolChanged
  CreatureStackCreated / CreatureStackIncreased
        ↓
React updates displayed values
PixiJS may play presentation
Audio may play recruitment cue
```

React and PixiJS never directly add troops or remove resources.

---

## 36. Example: combat attack

```text
Player selects attack
        ↓
BattleView
        ↓
MeleeAttackAction
        ↓
BattleActionValidator
        ↓
TargetingResolver
        ↓
DamageResolver
        ↓
BattleResolver commits result
        ↓
new BattleState
        ↓
events:
  BattleAttackCommitted
  DamageApplied
  CreaturesKilled?
  RetaliationAvailable?
        ↓
Animation/VFX/audio present known result
```

Visual contact does not determine whether the attack hit or how much damage it caused.

---

## 37. Suggested TypeScript repository structure

```text
packages/

  rules/
    domain/
      game/
      player/
      pantheon/
      hero/
      army/
      creature/
      town/
      economy/
      map/
      battle/
      magic/
      artifact/
      quest/
      campaign/

    commands/
    events/
    systems/
    resolvers/
    factories/
    validation/

  content/
    definitions/
    schemas/
    registry/
    localization/
    validation/

  mapgen/
    generators/
    templates/
    pathfinding/
    visibility/
    validation/

  ai/
    observation/
    strategic/
    tactical/
    evaluation/
    workers/

  campaign/
    missions/
    scripting/
    carryover/

  presentation/
    adventure/
    town/
    battle/
    units/
    sprites/
    animation/
    vfx/
    audio/
    cameras/

  ui/
    view-models/
    screens/
    components/
    hooks/

  platform/
    saves/
    browser/
    electron/

  testing/
    fixtures/
    scenarios/
    deterministic/
    replay/
```

---

## 38. Recommended logical dependency direction

Dependencies should mostly point inward toward rules/content, never outward from rules toward UI/graphics.

```text
Content Definitions
       ↓
Rules / Domain
       ↓
Commands / Resolvers / Systems
       ↓
Authoritative MatchState + Events
       ↓
┌───────────────┬──────────────────┬───────────────────┐
UI View Models   AI Observation     Presentation Events
       ↓               ↓                    ↓
React UI         AI planners          PixiJS / Audio
```

Platform adapters sit outside the domain:

```text
Electron / Browser
       ↓
SaveRepository / file APIs / window lifecycle
       ↓
GameSession
```

---

## 39. Central classes/types for Claude to understand first

```text
GameDefinition
RulesProfile
ContentCatalog
VersionBundle

GameSession
MatchState
GameClockState
PlayerState

PantheonDefinition
PantheonRosterDefinition
GodDefinition
PantheonProgressState

HeroDefinition
HeroState

CreatureFamilyDefinition
CreatureDefinition
CreatureStackState
AbilityDefinition

ArmyState

TownArchetypeDefinition
TownLayoutDefinition
BuildingDefinition
TownState
RecruitmentPoolState

WorldMapDefinition
WorldMapState
AdventureLocationDefinition
AdventureLocationState

CampaignDefinition
MissionDefinition
MissionState
QuestDefinition
QuestState

BattleState
BattleStackState
BattleAction
BattleResult

GameCommand
GameEvent
CommandProcessor

EffectDefinition
RequirementDefinition
ModifierResolver

GameSessionFactory
BattleFactory
MapGenerator

PlayerController
HumanPlayerController
AIPlayerController

SaveSnapshot
SaveRepository
```

---

## 40. Human-readable design checklist

When adding a new concept, a developer should be able to answer:

1. **Is this content or runtime state?**
2. **Who owns it?**
3. **What stable ID identifies it?**
4. **Which command may change it?**
5. **Which system validates that command?**
6. **Which event is emitted after the change?**
7. **Which resolver computes any derived value?**
8. **Does it belong in rules, AI, UI, presentation, or platform code?**
9. **Can it be represented through data/effects rather than a new subclass?**
10. **Can it be saved and reloaded deterministically?**

If those answers are unclear, the feature should not be implemented yet.

---

## 41. Architecture statement for `CLAUDE.md`

> **Pantheon Realms is a data-driven deterministic turn-based strategy simulation. Immutable content definitions describe creatures, gods, heroes, buildings, spells, maps, quests, and campaigns. Runtime state represents one match. Authoritative state may change only through validated commands processed by the shared TypeScript rules core; committed changes emit immutable events. React, PixiJS, animation, VFX, audio, Electron, and browser adapters present or persist game state but never define gameplay truth. Prefer composition, discriminated unions, effects, requirements, and stable IDs over deep domain inheritance. Each pantheon has exactly seven creature families, each creature family has exactly one base form and one upgraded form, and each town contains eighteen logical building locations: seven creature dwellings and eleven support structures. Human and AI players use the same rules and command path.**

---

## 42. Summary diagram

```text
                         PANTHEON REALMS

                    ┌─────────────────────┐
                    │   ContentCatalog    │
                    │ definitions + IDs   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Shared TypeScript   │
                    │     Rules Core      │
                    └──────────┬──────────┘
                               │
                GameCommand -> │ <- AI command
                               ▼
                    ┌─────────────────────┐
                    │   CommandProcessor  │
                    │ validate + commit   │
                    └──────────┬──────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
      ┌───────────────────┐           ┌────────────────┐
      │    MatchState     │           │  GameEvent[]   │
      │ authoritative     │           │ immutable      │
      └─────────┬─────────┘           └───────┬────────┘
                │                             │
         ┌──────┼────────┐          ┌─────────┼──────────┐
         ▼      ▼        ▼          ▼         ▼          ▼
       React   Saves    AI obs.   PixiJS     Audio      VFX
        UI
```

---

## Final implementation rule

**Game truth lives in the rules/state layer. Everything else observes it, proposes changes to it, presents it, or persists it.**
