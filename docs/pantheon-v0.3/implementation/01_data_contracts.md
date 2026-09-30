# Content and State Contracts for a Later Implementation

**Status:** P. Conceptual contracts for the adopted TypeScript rules core. JSON snippets are valid examples, not a complete runtime schema or supplied game implementation. See [architecture](../production/01_approved_stack_and_architecture.md) and the [one-upgrade contract](../content/03_exactly_one_upgrade_contract.md).

## Ownership of data

| Record | Owns | Must not own |
| --- | --- | --- |
| RulesProfile | Calendar, formulas, limits, action timing, rule version | Per-player preferences |
| CreatureDefinition | Base stats, costs, family, form, abilities, growth link, lore/animation references | Current HP, player ownership, current buffs |
| TownState | Owner, buildings, used build day, family pools, covenants, garrison/visitor | A private duplicate of the global resource wallet |
| HeroState | Class, level, XP, four primary stats, skills, items, mana, position, remaining movement, army | Creature base definitions |
| BattleState | Current board, stack HP, charges, round order, pending legal action, RNG state | World-day advancement |
| PlayerState | Resource wallet, pantheon, unassigned covenants, owned entities | Hidden data belonging to other players |
| UnitDetailViewModel | Authorized base/context values derived from shared resolvers | Authoritative combat rules or copied prices |
| Preferences | Display/input/audio/accessibility choices and schema version | Unit balance, scenario difficulty, match rewards |

## Example creature definition

```json
{
  "id": "griffin",
  "familyId": "griffin",
  "factionId": "greek",
  "tier": 3,
  "form": "base",
  "upgradeId": "windcrest_griffin",
  "role": "flying_interceptor",
  "stats": {
    "attack": 8,
    "defense": 8,
    "hp": 25,
    "damageMin": 3,
    "damageMax": 6,
    "speed": 7,
    "shots": 0,
    "footprintHexes": 2
  },
  "cost": {"gold": 240, "wood": 0, "stone": 0, "crystal": 0, "favor": 0},
  "baseGrowth": 7,
  "abilityIds": ["flight", "retaliation_2"],
  "dwellingId": "griffin_aerie",
  "covenantSlot": "light",
  "loreId": "lore.griffin",
  "animationProfileId": "animation.griffin",
  "implementationStatus": "planned",
  "balanceStatus": "proposed_unplaytested"
}
```

`implementationStatus` is build-specific. A release containing the actual unit can mark it implemented; a documentation example must not claim a shipped asset. The family record is the authority for population growth; if definitions repeat `baseGrowth` for convenience, validation must require every form to agree with the family.

## Example town state

```json
{
  "id": "asterion",
  "ownerId": "player_1",
  "factionId": "greek",
  "buildingIds": ["village_hall", "tavern", "fort", "barracks"],
  "buildUsedDay": 0,
  "populationByFamily": {"hoplite": 14},
  "covenants": {"light": null, "middle": null, "apex": null},
  "garrisonStackIds": [],
  "visitingHeroId": "alexios"
}
```

A population entry exists only when a line is unlocked/built under the rules. Do not initialize all sixteen unit forms with independent growth. No `constructionDaysRemaining` or active queue belongs in this profile. Economic and fortification levels are determined from a validated upgrade chain, not by summing every building's listed income.

## Battle stack and inspection context

```json
{
  "stackId": "battle_stack_4",
  "sourceArmyStackId": "army_stack_4",
  "unitId": "griffin",
  "sideId": "attacker",
  "anchor": {"column": 3, "row": 4},
  "facing": "right",
  "totalHp": 183,
  "startingCount": 8,
  "shotsRemaining": 0,
  "retaliationsUsedThisRound": 1,
  "hasWaitedThisRound": false,
  "receivedMoraleBonusThisRound": false,
  "statusIds": []
}
```

Derive alive count and front HP; do not independently store contradictory values. Army-shared `temple_adept` Ward usage belongs in a battle-side ability ledger, not a stack-local field that splitting can duplicate. Footprint occupancy comes from the definition plus anchor/facing and must be validated against every occupied cell.

An inspection request carries `unitId`, optional authorized `stackId`, source screen, return context, and knowledge scope. Resolve it into a view model with explicit base/effective/per-creature/stack labels. Unknown modifiers are omitted or represented as unknown, never silently exposed by a generic JSON inspector.

## Command contracts

`Build(town, building)`, `Recruit(town, unit, quantity, destination)`, `UpgradeTroops(...)`, `Trade(...)`, `HireHero(...)`, `AssignCovenant(...)`, `PledgeGod(...)`, `MoveHero(...)`, `BeginEncounter(...)`, `MoveOrMelee(...)`, `Shoot(...)`, `Wait(...)`, `Defend(...)`, `Cast(...)`, and `ChooseLevelSkill(...)` follow the same contract:

Validate against current authoritative state -> return exact quote/legal action or typed rejection -> confirm where required -> revalidate -> commit all costs/effects atomically -> emit immutable presentation events. A stale quote cannot be committed after the balance, destination, or ownership changes.

Every non-idempotent reward and dawn event has a unique ID persisted with state. UI components request commands; they never set a resource balance directly. Repeated clicks, scene reloads, and animation callbacks cannot double-apply the same accepted command.

## Calculation and randomness

Use exact integer/rational or equivalent deterministic fixed-point arithmetic for percentage factors before the final documented floor/ceiling; avoid cross-platform floating-point boundary differences. Damage preview and execution share the same resolver but preview never advances RNG. Keep separate saved RNG streams for map generation, combat, and level-up offerings; cosmetic randomization must be separate and non-authoritative.

Settings changes do not reseed or alter a stream. A saved battle replay/event log references the rule profile, content version, and seed/state. Later changes to unit tables must not silently reinterpret old checkpoints.

## Lore and animation records

A lore record separates sourced note, source IDs, evidence status, original fictional biography, upgrade note, and localization keys. An animation profile separates renderer capability, supported state IDs, facing support, loop policy, still portrait, asset-license metadata, and accessible description. Asset URIs remain unset until actual production; do not fabricate a path that looks like an existing file.

## Save and preference versions

A match save includes `saveSchemaVersion`, `rulesProfileId`, `contentVersion`, scenario ID, players, current day/turn, heroes, towns, sites/fog, quests, completed event IDs, random states, and pending resolutions/level choices. The first implementation may prohibit user saves during combat, but its in-memory model must still represent unresolved state consistently.

Preferences have a separate version and storage path. Saving a match never overwrites the preferred audio level or motion policy. Imported files are validated for schema, identifiers, lengths, numeric ranges, and supported rule version before they become active. Unknown data is not executed as code.
