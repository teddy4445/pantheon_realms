# Every Creature Has Exactly One Upgrade

**D - Owner requirement, adopted 2026-09-29:** Every creature family has one base form and exactly one upgraded form. There are no branching upgrades, no second promotion, and no unpaired ordinary creature families.  
**P:** The detailed validation and production contracts below make that requirement implementable. Existing v0.2 numeric values remain candidate balance.

## Canonical pairs

Use these existing IDs. Do not invent new spellings in models, JSON, campaign encounters, screenshots, or the bestiary.

| Family ID | Base ID / name | Upgrade ID / name | Tier | Upgrade building |
| --- | --- | --- | ---: | --- |
| `hoplite` | `hoplite` / Hoplite | `veteran_hoplite` / Veteran Hoplite | 1 | `barracks_up` |
| `peltast` | `peltast` / Peltast | `veteran_peltast` / Veteran Peltast | 2 | `peltast_range_up` |
| `centaur` | `centaur` / Centaur | `centaur_sentinel` / Centaur Sentinel | 3 | `centaur_grove_up` |
| `griffin` | `griffin` / Griffin | `windcrest_griffin` / Windcrest Griffin | 3 | `griffin_aerie_up` |
| `cavalry` | `cavalry` / Cavalry | `companion_cavalry` / Companion Cavalry | 4 | `training_court_up` |
| `temple_adept` | `temple_adept` / Temple Adept | `temple_seer` / Temple Seer | 5 | `adept_house_up` |
| `minotaur` | `minotaur` / Minotaur | `labyrinth_warden` / Labyrinth Warden | 6 | `labyrinth_up` |
| `cyclops` | `cyclops` / Cyclops | `stormforged_cyclops` / Stormforged Cyclops | 7 | `thunder_quarry_up` |

This is eight families and sixteen forms. Centaur and Griffin compete for the town's light mythic slot; that is a **choice between families**, not two upgrades of one creature. A town still has at most seven active recruitment families and a hero still has seven stack slots. A base and upgraded form can occupy separate stacks.

## Data invariant

A family has exactly `baseId` and `upgradeId`. The base definition uses `form: "base"` and names its upgrade. The upgrade uses `form: "upgraded"`, references `baseId`, and has no outgoing upgrade. Both share faction, family ID, tier, base population growth and logical footprint. Future deliberate footprint changes require a separate migration; none exist in the Greek catalog.

```json
{
  "familyId": "griffin",
  "baseId": "griffin",
  "upgradeId": "windcrest_griffin",
  "growthPerWeek": 7,
  "upgradeBuildingId": "griffin_aerie_up",
  "formIds": ["griffin", "windcrest_griffin"]
}
```

The catalog validator rejects missing upgrades, self-links, cycles, two incoming base families for one upgrade, outgoing links on an upgrade, unpaired neutral recruitable species, duplicate IDs, and third gameplay forms disguised as skins. A campaign boss made from an existing upgraded creature remains that same definition; a named encounter is not a new promotion.

Unique heroes and deity portraits are not army-creature families. Cosmetic team colors, damage poses, LOD meshes, costumes, and accessibility outlines are presentation variants without independent prices or statistics. A future summon or non-recruitable monster must be classified explicitly; adding a new creature family still requires its pair rather than quietly creating an exception.

## Recruitment and training

The existing candidate economy remains authoritative: one shared family population pool, one base-growth grant on first dwelling construction, no new population for its upgraded building, and ordinary weekly growth once per family. The upgrade building unlocks a purchase option; it does not automatically transform all troops.

Troop training is local to the relevant owned town and costs the quantity multiplied by the resource-by-resource price difference. It consumes no population. A full-stack upgrade preserves the slot; a partial upgrade needs an existing matching upgrade stack or a spare slot. Validate all conditions before changing resources, counts or form IDs. See [economy](../design/02_economy_calendar_and_recruitment.md).

Both forms remain recruitable when unlocked in the candidate profile. There is no downgrade/refund action. An upgrade animation is only a presentation of a successful `UpgradeStack` event, never the transaction itself.

## Visual and animation invariant

Each pair is approved together, preferably using the same skeleton, proportions, sockets, clip names and material layout. The upgrade needs a readable silhouette/detail change, a material treatment, a portrait, a rank marker, and a distinct written description. Recolor alone is insufficient, and extra ornament cannot obscure the underlying family.

Reuse motion where it remains anatomically and tactically correct. Add upgrade-specific motion only for a real new ability or a useful character detail. Temple Seer gains a Ward presentation; Windcrest Griffin still uses physical melee/retaliation and does not acquire an invented ranged wind spell. No upgrade may lose a required clip because only the base was commissioned.

The production catalog is not complete until **both forms** have a runtime asset, required clips, an accessible still, lore status, bestiary entry, valid material/texture references, and a tested shared data link. A developer placeholder build may label assets pending; it may not advertise an unpaired finished family. All sixteen Greek forms receive briefs in the [creature bible](../production/03_creature_pairs_and_animation_bible.md).

## Screen requirements

S09 recruitment shows base/upgrade names, current family stock, total price, and missing building requirements. S07 army inspection differentiates exact forms. S18 bestiary links both directions, compares the same fields in the same order, and offers a 3D preview for either form. A main-menu preview cannot display fictitious live army modifiers.

Never duplicate weekly growth in the comparison total. An upgrade is not guaranteed to win every matchup: show actual stat/ability differences rather than a universal power score. Tier number and upgrade rank are separate labels.
