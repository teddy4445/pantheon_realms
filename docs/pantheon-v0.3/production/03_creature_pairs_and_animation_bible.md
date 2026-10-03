# Greek Creature Pair and Animation Bible

**D:** Every creature family has exactly one upgrade. **P:** Art briefs, animation-strip plans and production budgets for the 2D sprite pipeline ([visual pipeline](02_visual_and_animation_pipeline.md), updated for the 2D migration of 2026-10-03). Numeric rules remain in the [v0.2 catalog](../design/06_greek_unit_catalog_values.md); this file does not redefine their statistics.  
**Scope:** Eight Greek families, sixteen forms, including both forms of neutral/enemy families used by the demo campaign.

## 1. Shared rules

Pair IDs are fixed by the [upgrade contract](../content/03_exactly_one_upgrade_contract.md). Base and upgrade share anatomy, one motion design (the upgrade's strips are generated from the base strips frame for frame), frame size and anchor, footprint and family growth. The upgrade must be visibly distinguishable in silhouette, portrait and labels without depending on team color. Palette/emissive changes are cosmetic unless an ability explicitly grants a mechanic.

Common required strips for a ground creature: `idle`, `move`, `attack`, `defend`, `hit`, `death`, `victory`. All shooters also have `shoot`; a shooter still needs a valid `attack` strip for melee/retaliation. Locomotion may draw a walk/trot rather than a literal human walk, but maps to the same semantic Move state. Every strip faces right; the renderer mirrors it for the other side.

Griffins replace long-distance ground movement with `takeoff`, `fly` and `landing`, and keep a short `move` strip for ground repositioning; include `idle`, `attack`, `defend`, `hit`, `death`, `victory` in both forms. Their zero shots field means no `shoot` strip or projectile is presented as an available action.

Passive abilities do not require invented active buttons. A passive visual accent is allowed but must be brief and readable. Every family has both an accessible static portrait and its animated sprite preview in the S18 viewer. Optional idle variants can enrich the presentation after required strips pass QA; missing optional strips use the fallback chain of the [visual pipeline](02_visual_and_animation_pipeline.md).

## 2. Hoplite -> Veteran Hoplite

**IDs:** `hoplite` -> `veteran_hoplite`. Tier 1; one hex; slow defensive infantry. Both use `charge_guard` and ordinary melee rules.

**Base brief:** A disciplined human soldier with a short spear, round shield, simple bronze helmet, pale linen tunic and restrained blue cloth. The silhouette is shield-forward and upright, not a broad two-handed bruiser. Keep exposed joints and shield rim clear at battle zoom. Equipment is original Greek-inspired game design, not a claimed historical reconstruction.

**Upgrade changes:** Crested helmet, stronger segmented shoulder/chest protection, a more substantial shield rim and short command sash. Retain the same spear/shield role and body proportions. The crest and shield geometry must distinguish Veteran from base in grayscale. Do not add a new shield aura, ranged spear throw or larger footprint.

**Animation strips:** One-hex frames (512 x 512 delivery). Idle shifts weight behind the shield; move plants feet deliberately; attack is a controlled thrust with a short recoil; defend brings shield and spear into a braced stance. Charge protection may play a brief bracing reaction when the corresponding rule applies, but does not cancel the opponent's entire attack. Death lowers/falls without exaggerated gore. The upgrade's strips repeat the base poses frame for frame with the crest, sash and armour added and checked in every frame.

**Pair QA:** No spear teleporting between hands from frame to frame; the mirrored (left-facing) figure still reads correctly; the same family retains the proper icon at battle stack display size. Upgrade training changes sprite set/portrait once and preserves the stack count.

## 3. Peltast -> Veteran Peltast

**IDs:** `peltast` -> `veteran_peltast`. Tier 2; one hex; `shooter`, with the normal engagement/ammunition/melee penalties.

**Base brief:** Light human skirmisher with small crescent/rounded shield, a visible bundle of javelins and flexible leather/cloth protection. Contrast the open stance and light load with a Hoplite. Do not draw a bow, crossbow or gun.

**Upgrade changes:** Distinctive reinforced helmet, braced throwing arm, tidier javelin harness and additional shoulder protection. Keep the light silhouette. The veteran has stronger ranged values and ammunition in the candidate catalog, not a two-shot or move-and-shoot ability.

**Animation strips:** One-hex frames. `shoot` takes a javelin, winds back, releases it and returns to idle; the released javelin is drawn by the separate projectile sprite, exactly one per shot. `attack` is a short close-range thrust; neither is a free second action. A newly drawn cosmetic javelin in the hand must not replenish the rules ammunition.

**Pair QA:** The javelin leaves the hand on the release frame, the pooled projectile sprite starts at the figure's release point, and cleanup leaves no extra weapon hanging in the air. No attack animation implies a second hit. Dry-ammunition UI disables Shoot but keeps legal melee visible.

## 4. Centaur -> Centaur Sentinel

**IDs:** `centaur` -> `centaur_sentinel`. Tier 3; two hexes; fast ground melee. These are **not archers** in the current roster.

**Base brief:** Human upper torso joined coherently to a horse body, carrying a melee spear. Warm chestnut coat, simple chest protection, bound hair and a small amount of cloth. Emphasize the six-limb anatomy's weight and transition without hiding the torso/horse junction behind excessive armor.

**Upgrade changes:** More substantial chest and foreleg protection, a crest or high tied mane, reinforced spearhead and patterned flank cloth. The Sentinel looks like a seasoned guardian of the same species, not a second horse breed with unrelated anatomy. No bow, magic missile or extra third promotion.

**Animation strips:** Two-hex frames (768 x 512 delivery); horse body and human torso drawn as one connected creature. Required strips include a believable four-leg gait, torso-balanced spear strike, diagonal hit reaction and controlled fall. Check hoof contact against the baseline in every frame; do not draw a human walk on all four legs.

**Pair QA:** Correct two-cell selection, all four hooves plant coherently on the baseline, rear legs do not sink below the ground line, and the upgrade's armor stays consistent across frames. No flying or Cavalry charge bonus is implied; the existing catalog gives Centaurs ground mobility, not the Cavalry `charge` ability.

## 5. Griffin -> Windcrest Griffin

**IDs:** `griffin` -> `windcrest_griffin`. Tier 3; two hexes; flight. Base has two eligible retaliations per round; Windcrest has no retaliation-count limit, subject to the ordinary alive/disabled checks.

**Base brief:** A coherent eagle-headed, winged lion-bodied creature: forelegs/talons, lion hindquarters, two articulated wings, readable beak and expressive brow. Warm tawny body and pale head feathers make the head legible against terrain. No humanoid arms or accidental extra limbs.

**Upgrade changes:** A recognizable swept feather crest, longer organized primary feathers, stronger chest plumage and a restrained pale-blue/ivory accent pattern. Add silhouette rather than uniform glow. Preserve wing span clearance and the same gameplay footprint. The upgrade has no ranged wind spell or lightning damage.

**Animation strips:** Two-hex frames. `takeoff` compresses the hindquarters, pushes off and unfolds wings; `fly` loops a stable wingbeat; `landing` flares the wings and places feet; `attack` uses beak/talon contact with a short aerial hop; `defend` mantles the wings. Keep wings inside the frame padding and takeoff/landing presentation from overshooting the resolved cell. A death from a flying pose descends toward the known ground anchor rather than using gameplay ragdoll physics.

**Pair QA:** Both forms can land in a legal two-cell footprint, wings do not hide the target confirmation, the same resolved route works at 1x/2x/Instant, and repeated retaliations play separate event-linked `attack` strips without recursively creating more attacks.

## 6. Cavalry -> Companion Cavalry

**IDs:** `cavalry` -> `companion_cavalry`. Tier 4; two hexes; mounted melee, `charge`.

**Base brief:** A human rider with a visible lance and shield on a compact warhorse. Cloth saddle blanket and limited horse armor distinguish it from a Centaur at every zoom. Keep rider and horse readable as two anatomically separate beings.

**Upgrade changes:** Crested rider helmet, layered horse neck/chest protection, an embroidered saddle cloth and reinforced lance. Avoid an excessive banner that obscures nearby stacks. The horse does not become a mythical flying mount or change to a new species.

**Animation strips:** Two-hex frames with rider and horse drawn together in every frame. Walk/trot and attack sync rider balance with hoof contact. A moving charge presentation blends toward a forward lance strike. Stationary melee/retaliation uses a shorter thrust, not a full gallop through the enemy.

**Pair QA:** Rider hands remain on reins/weapon, saddle contact does not float, no detour generates extra charge bonus, and the simulation's charge component is suppressed against Hoplite `charge_guard` even if the visual approach is dramatic. Do not compute charge from the drawn movement distance.

## 7. Temple Adept -> Temple Seer

**IDs:** `temple_adept` -> `temple_seer`. Tier 5; one hex; both are shooters. Seer adds the single army-shared `family_ward` activation.

**Base brief:** A human ritual scholar in practical layered robes with a staff and geometric bronze focus. Use a calm readable face and open-hand gestures. This fictional institution is not labeled as a historical priesthood or a real ritual practice.

**Upgrade changes:** A distinct sculpted headpiece, layered mantle, larger staff focus and a clear rune/ornament motif. Increase authority through posture and silhouette, not indiscriminate glowing effects. Keep the base form's body proportions and cloth behaviour in every frame.

**Animation strips:** One-hex frames; ground common set plus `shoot`. The normal projectile is a compact stylized energy bolt, visually distinct from the hero's Lightning spell; its rules are still the defined ranged creature strike. Close melee (`attack`) is a staff strike with the shooter's normal penalty. Only the Seer adds `ability` (the Ward), an outward staff/hand gesture plus a short protective target effect drawn by the effects layer.

**Pair QA:** The base does not display a Ward action. The Seer's Ward consumes the actual family-shared charge and activation, not one charge per figure or per creature in a stack. Previewing Ward in the viewer consumes nothing. Do not depict resurrection, healing or an area shield that the rules do not grant.

## 8. Minotaur -> Labyrinth Warden

**IDs:** `minotaur` -> `labyrinth_warden`. Tier 6; two hexes; durable melee, `unyielding`.

**Base brief:** Bull-headed biped with powerful shoulders, hooves, simple chest straps and a heavy axe. Horn direction and shoulder shape should identify it in silhouette. Keep the lower body large enough to support the upper body rather than making an unstable top-heavy figure.

**Upgrade changes:** Reinforced patterned chest armor, protective horn/head fittings, a heavier but still readable axe head, and maze-motif belt/cloth. The Warden remains the same creature, not a horned Cyclops. Do not add a rage meter, kill-farming effect, chain attack or ranged throw.

**Animation strips:** Two-hex frames. Weighty but bounded steps; axe windup with ground-supported follow-through; `defend` braces the axe; the hit reaction moves the body rather than stretching the neck. An optional short snort is cosmetic, not an extra morale roll.

**Pair QA:** Axe contact remains within the visual target envelope, both two-cell facings (drawn and mirrored) fit valid spaces, shoulder armor stays consistent across frames and `unyielding` appears through the existing morale UI, not a new active button. A held death frame does not block later attacks or picking.

## 9. Cyclops -> Stormforged Cyclops

**IDs:** `cyclops` -> `stormforged_cyclops`. Tier 7; two hexes; expensive ranged apex creature; `shooter`, `wall_breaker`, `no_melee_penalty` for this production binding to the candidate intended role.

**Base brief:** One-eyed giant with a broad readable face, stone-carrying sling/satchel and simple bracers. Use a boulder as the ranged weapon and a short heavy strike for close combat. Its scale is imposing but must remain readable within a two-cell presentation envelope.

**Upgrade changes:** Forged bronze/stone bracers, reinforced belt and shoulder piece, visible engraved seams and a subtly luminous boulder treatment. The single eye remains obvious. "Stormforged" is original lore and material direction; it does not grant electrical area damage, chain lightning or immunity.

**Animation strips:** Two-hex frames. `shoot` lifts and releases one rock; the flying boulder is the separate projectile sprite and is presentation-only. `attack` is a powerful short strike. A shot at a wall reuses the `shoot` strip, but its rule target is structure HP and it never also damages a troop. The demo's open-field finale does not enable wall targeting without structures.

**Pair QA:** No extra rock appears when ammo is empty; close melee remains legal under the unit's defined penalty policy; both forms inspect correctly; the final named encounter uses the existing upgraded sprite set, not a third special boss form. The exact ability assignment, particularly `no_melee_penalty`, is a P clarification to be reviewed with the rules catalog before implementation, not a silently adopted numeric change.

## 10. Ability binding review

The earlier catalog defines abilities but does not provide a complete per-form JSON mapping. Use the following **P mapping** to close that content gap, and record it with the rules freeze. This is not a modification of creature stats.

| Family | Base ability IDs | Upgrade ability IDs |
| --- | --- | --- |
| Hoplite | `charge_guard` | `charge_guard` |
| Peltast | `shooter` | `shooter` |
| Centaur | None beyond ordinary melee | None beyond ordinary melee |
| Griffin | `flight`, `retaliation_2` | `flight`, `retaliation_unlimited` |
| Cavalry | `charge` | `charge` |
| Temple Adept | `shooter` | `shooter`, `family_ward` |
| Minotaur | `unyielding` | `unyielding` |
| Cyclops | `shooter`, `wall_breaker`, `no_melee_penalty` | `shooter`, `wall_breaker`, `no_melee_penalty` |

Until this mapping is implemented, text and animation cannot stand in for missing mechanics. All ranged shots are stationary in the current rules; no creature gets a move-and-shoot attack merely from a mobile-looking animation.

## 11. Pair-level deliverables and prompt brief

For each family deliver one shared approved design sheet, a canonical reference view for each form, both portraits/icons, the required animation strips for both forms (named by the production queue and imported with `npm run sprites:import`), sprite manifest entries, provenance, and runtime QA report. Motion reuse between the forms is expected; missing counterpart assets are not.

A reusable concept-art brief for an artist or image-generation tool:

```text
Design the [BASE NAME] and its single upgrade [UPGRADE NAME] as a coherent
pair for an original stylized Greek-mythology strategy game. Use the same
anatomy, scale, equipment role, camera and orientation. Present a
neutral, evenly lit full-body three-quarter view facing right plus grayscale
silhouettes, transparent background.
The upgrade changes [EXPLICIT SILHOUETTE DETAILS] and [MATERIAL DETAILS],
not species or gameplay footprint. Show [REQUIRED EQUIPMENT]. Do not add
[FORBIDDEN WEAPONS/ABILITIES], background scenery, UI text, copied game logos,
or extra limbs. Keep the design readable from the fixed elevated battle camera.
These images are canonical references for portraits and animation strips,
not finished game sprites.
```

The human review gate resolves inconsistent anatomy or views before any strip is generated. Generated reference images do not bypass the production/rights review or replace imported, validated animation strips.
