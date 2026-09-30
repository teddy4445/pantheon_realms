# Greek Creature Pair and Animation Bible

**D:** Every creature family has exactly one upgrade. **P:** Art briefs, rig plans and production budgets. Numeric rules remain in the [v0.2 catalog](../design/06_greek_unit_catalog_values.md); this file does not redefine their statistics.  
**Scope:** Eight Greek families, sixteen forms, including both forms of neutral/enemy families used by the demo campaign.

## 1. Shared rules

Pair IDs are fixed by the [upgrade contract](../content/03_exactly_one_upgrade_contract.md). Base and upgrade share anatomy, compatible skeleton/socket conventions, footprint and family growth. The upgrade must be visibly distinguishable in silhouette, portrait and labels without depending on team color. Palette/emissive changes are cosmetic unless an ability explicitly grants a mechanic.

Common required source clips for a ground creature: `idle_a`, `move_walk`, `attack_melee_a`, `guard`, `hit_a`, `defeat`, `victory`. All shooters also have `attack_shoot`; a shooter still needs a valid melee/retaliation clip. Locomotion may use a walk/trot rather than a literal human walk, but maps to the same semantic Move state.

Griffins replace long-distance ground movement with `takeoff`, `move_fly`, `land` and a short `move_ground` reposition clip; include `idle_a`, `attack_melee_a`, `guard`, `hit_a`, `defeat`, `victory` in both forms. Their zero shots field means no ranged clip or projectile is presented as an available action.

Passive abilities do not require invented active buttons. A passive visual accent is allowed but must be brief and readable. Every family has both an accessible static portrait and its actual 3D preview. Optional select/turn/idle variants can enrich the presentation after required clips pass QA.

## 2. Hoplite -> Veteran Hoplite

**IDs:** `hoplite` -> `veteran_hoplite`. Tier 1; one hex; slow defensive infantry. Both use `charge_guard` and ordinary melee rules.

**Base brief:** A disciplined human soldier with a short spear, round shield, simple bronze helmet, pale linen tunic and restrained blue cloth. The silhouette is shield-forward and upright, not a broad two-handed bruiser. Keep exposed joints and shield rim clear at battle zoom. Equipment is original Greek-inspired game design, not a claimed historical reconstruction.

**Upgrade changes:** Crested helmet, stronger segmented shoulder/chest protection, a more substantial shield rim and short command sash. Retain the same spear/shield role and body proportions. The crest and shield geometry must distinguish Veteran from base in grayscale. Do not add a new shield aura, ranged spear throw or larger footprint.

**Rig/animation:** Shared humanoid spear-and-shield rig. Idle shifts weight behind the shield; move plants feet deliberately; melee is a controlled thrust with a short recoil; guard brings shield and spear into a braced stance. Charge protection may play a brief bracing reaction when the corresponding rule applies, but does not cancel the opponent's entire attack. Defeat lowers/falls without exaggerated gore. Upgrade reuses the motion set with a checked cloth/crest pass.

**Pair QA:** No spear teleporting between hands; shield does not invert on turning; the same family retains the proper icon at one-actor/three-actor stack display. Upgrade training changes model/portrait once and preserves the stack count.

## 3. Peltast -> Veteran Peltast

**IDs:** `peltast` -> `veteran_peltast`. Tier 2; one hex; `shooter`, with the normal engagement/ammunition/melee penalties.

**Base brief:** Light human skirmisher with small crescent/rounded shield, a visible bundle of javelins and flexible leather/cloth protection. Contrast the open stance and light load with a Hoplite. Do not draw a bow, crossbow or gun.

**Upgrade changes:** Distinctive reinforced helmet, braced throwing arm, tidier javelin harness and additional shoulder protection. Keep the light silhouette. The veteran has stronger ranged values and ammunition in the candidate catalog, not a two-shot or move-and-shoot ability.

**Rig/animation:** Shared humanoid rig with javelin-hand and projectile socket. `attack_shoot` takes a javelin, winds back, releases exactly one visual projectile and returns to idle. `attack_melee_a` is a short close-range thrust; neither is a free second action. A newly drawn cosmetic javelin must not replenish the rules ammunition.

**Pair QA:** Socket projectile detaches at the release cue, pooled world projectile starts at that point, and cleanup leaves no extra weapon hanging in the air. No attack animation implies a second hit. Dry-ammunition UI disables Shoot but keeps legal melee visible.

## 4. Centaur -> Centaur Sentinel

**IDs:** `centaur` -> `centaur_sentinel`. Tier 3; two hexes; fast ground melee. These are **not archers** in the current roster.

**Base brief:** Human upper torso joined coherently to a horse body, carrying a melee spear. Warm chestnut coat, simple chest protection, bound hair and a small amount of cloth. Emphasize the six-limb anatomy's weight and transition without hiding the torso/horse junction behind excessive armor.

**Upgrade changes:** More substantial chest and foreleg protection, a crest or high tied mane, reinforced spearhead and patterned flank cloth. The Sentinel looks like a seasoned guardian of the same species, not a second horse breed with unrelated anatomy. No bow, magic missile or extra third promotion.

**Rig/animation:** Dedicated centaur rig with horse legs, equine spine, human torso and arms; use a connected master root. Required clips include a believable four-leg gait, torso-balanced spear strike, diagonal hit reaction and controlled fall. Retarget horse lower-body motion only after contact validation; do not attach a human walk to all four legs.

**Pair QA:** Correct two-cell selection, all four hooves plant coherently, rear legs do not pass through the ground, and armor does not break the shared rig. No flying or Cavalry charge bonus is implied; the existing catalog gives Centaurs ground mobility, not the Cavalry `charge` ability.

## 5. Griffin -> Windcrest Griffin

**IDs:** `griffin` -> `windcrest_griffin`. Tier 3; two hexes; flight. Base has two eligible retaliations per round; Windcrest has no retaliation-count limit, subject to the ordinary alive/disabled checks.

**Base brief:** A coherent eagle-headed, winged lion-bodied creature: forelegs/talons, lion hindquarters, two articulated wings, readable beak and expressive brow. Warm tawny body and pale head feathers make the head legible against terrain. No humanoid arms or accidental extra limbs.

**Upgrade changes:** A recognizable swept feather crest, longer organized primary feathers, stronger chest plumage and a restrained pale-blue/ivory accent pattern. Add silhouette rather than uniform glow. Preserve wing span clearance and the same gameplay footprint. The upgrade has no ranged wind spell or lightning damage.

**Rig/animation:** Dedicated quadruped-plus-wings rig. Takeoff compresses the hindquarters, pushes off and unfolds wings; `move_fly` loops a stable wingbeat; landing flares the wings and places feet; melee uses beak/talon contact with a short aerial hop; guard mantles the wings. Keep takeoff/landing presentation from overshooting the resolved cell. A defeat from a flying pose descends toward the known ground anchor rather than using gameplay ragdoll physics.

**Pair QA:** Both forms can land in a legal two-cell footprint, wings do not hide the target confirmation, the same resolved route works at 1x/2x/Instant, and repeated retaliations play separate event-linked melee clips without recursively creating more attacks.

## 6. Cavalry -> Companion Cavalry

**IDs:** `cavalry` -> `companion_cavalry`. Tier 4; two hexes; mounted melee, `charge`.

**Base brief:** A human rider with a visible lance and shield on a compact warhorse. Cloth saddle blanket and limited horse armor distinguish it from a Centaur at every zoom. Keep rider and horse readable as two anatomically separate beings.

**Upgrade changes:** Crested rider helmet, layered horse neck/chest protection, an embroidered saddle cloth and reinforced lance. Avoid an excessive banner that obscures nearby stacks. The horse does not become a mythical flying mount or change to a new species.

**Rig/animation:** One tested combined rider-and-horse deform rig or a verified coordinated two-armature export; the simpler initial production contract is a combined master rig. Walk/trot and attack sync rider balance with hoof contact. A moving charge presentation blends toward a forward lance strike. Stationary melee/retaliation uses a shorter thrust, not a full gallop through the enemy.

**Pair QA:** Rider hands remain on reins/weapon, saddle contact does not float, no detour generates extra charge bonus, and the simulation's charge component is suppressed against Hoplite `charge_guard` even if the visual approach is dramatic. Do not compute charge from root motion distance.

## 7. Temple Adept -> Temple Seer

**IDs:** `temple_adept` -> `temple_seer`. Tier 5; one hex; both are shooters. Seer adds the single army-shared `family_ward` activation.

**Base brief:** A human ritual scholar in practical layered robes with a staff and geometric bronze focus. Use a calm readable face and open-hand gestures. This fictional institution is not labeled as a historical priesthood or a real ritual practice.

**Upgrade changes:** A distinct sculpted headpiece, layered mantle, larger staff focus and a clear rune/ornament motif. Increase authority through posture and silhouette, not indiscriminate glowing effects. Use the same body rig and core cloth weighting.

**Rig/animation:** Ground common set plus `attack_shoot`. The normal projectile is a compact stylized energy bolt, visually distinct from the hero's Lightning spell; its rules are still the defined ranged creature strike. Close melee is a staff strike with the shooter's normal penalty. Only the Seer adds `ability_ward`, an outward staff/hand gesture and a short protective target effect.

**Pair QA:** The base does not display a Ward action. The Seer's Ward consumes the actual family-shared charge and activation, not one charge per model or per creature in a stack. Previewing Ward consumes nothing. Do not depict resurrection, healing or an area shield that the rules do not grant.

## 8. Minotaur -> Labyrinth Warden

**IDs:** `minotaur` -> `labyrinth_warden`. Tier 6; two hexes; durable melee, `unyielding`.

**Base brief:** Bull-headed biped with powerful shoulders, hooves, simple chest straps and a heavy axe. Horn direction and shoulder shape should identify it in silhouette. Keep the lower body large enough to support the upper body rather than making an unstable top-heavy figure.

**Upgrade changes:** Reinforced patterned chest armor, protective horn/head fittings, a heavier but still readable axe head, and maze-motif belt/cloth. The Warden remains the same creature, not a horned Cyclops. Do not add a rage meter, kill-farming effect, chain attack or ranged throw.

**Rig/animation:** Dedicated large-biped rig with hooves, neck and head control. Weighty but bounded steps; axe windup with ground-supported follow-through; guard braces the axe; hit reaction moves the body rather than stretching the neck. An optional short snort is cosmetic, not an extra morale roll.

**Pair QA:** Axe contact remains within the visual target envelope, both two-cell facings fit valid spaces, shoulder armor deforms correctly and `unyielding` appears through the existing morale UI, not a new active button. Death clips do not block later attacks with an unremoved collider.

## 9. Cyclops -> Stormforged Cyclops

**IDs:** `cyclops` -> `stormforged_cyclops`. Tier 7; two hexes; expensive ranged apex creature; `shooter`, `wall_breaker`, `no_melee_penalty` for this production binding to the candidate intended role.

**Base brief:** One-eyed giant with a broad readable face, stone-carrying sling/satchel and simple bracers. Use a boulder as the ranged weapon and a short heavy strike for close combat. Its scale is imposing but must remain readable within a two-cell presentation envelope.

**Upgrade changes:** Forged bronze/stone bracers, reinforced belt and shoulder piece, visible engraved seams and a subtly luminous boulder treatment. The single eye remains obvious. "Stormforged" is original lore and material direction; it does not grant electrical area damage, chain lightning or immunity.

**Rig/animation:** Large-biped rig with a controlled boulder socket. `attack_shoot` lifts and releases one rock; projectile flight is presentation-only. `attack_melee_a` is a powerful short strike. A siege `attack_wall` alias may reuse the throw, but its rule target is structure HP and it never also damages a troop. The demo's open-field finale does not enable wall targeting without structures.

**Pair QA:** No extra rock appears when ammo is empty; close melee remains legal under the unit's defined penalty policy; both forms inspect correctly; the final named encounter uses the existing upgraded asset, not a third special boss form. The exact ability assignment, particularly `no_melee_penalty`, is a P clarification to be reviewed with the rules catalog before implementation, not a silently adopted numeric change.

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

For each family deliver one shared approved design sheet, editable family `.blend`, base and upgraded meshes, deform rig, required source clips, export preset, both GLBs, both portraits/icons, manifest, provenance, and runtime QA report. Animation reuse is permitted; missing counterpart assets are not.

A reusable concept-art brief for an artist or image-generation tool:

```text
Design the [BASE NAME] and its single upgrade [UPGRADE NAME] as a coherent
pair for an original stylized Greek-mythology strategy game. Use the same
anatomy, scale, equipment role and front/side/back orientation. Present a
neutral, evenly lit full-body turnaround plus grayscale silhouettes.
The upgrade changes [EXPLICIT SILHOUETTE DETAILS] and [MATERIAL DETAILS],
not species or gameplay footprint. Show [REQUIRED EQUIPMENT]. Do not add
[FORBIDDEN WEAPONS/ABILITIES], background scenery, UI text, copied game logos,
or extra limbs. Keep the design readable from an isometric gameplay camera.
These images are modeling references, not a claim of game-ready geometry.
```

The human review gate resolves inconsistent anatomy or views before modeling. Generated reference images do not bypass the production/rights review or replace a Blender rig and exported animation library.
