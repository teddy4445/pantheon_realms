# Claude Code handoff — Pantheon Realms: Mythic Library II

## Request and delivery
Add 40 hero artifacts, 40 spells and 12 Favor blessings, with their supplied icons and effects. The audited local catalog is game **1.6.0**, 2026-10-18: 88 artifacts, 54 spells and 14 interventions. After additive integration expect **128 artifacts, 94 spells, 26 interventions**, assuming no intervening changes. Re-audit current HEAD before editing.

This delivery is art + design, **not already implemented game code**. All numbers are initial balance proposals. Preserve existing heroes, creatures, gods, campaigns and IDs. Keep automatic battle resolution disabled in campaign mode.

Distribution:
- Artifacts: 6 per pantheon + 4 general = 40.
- Spells: 5 per pantheon + 10 general = 40; 25 battlefield, 15 adventure.
- Blessings: 2 per pantheon = 12. These are temporary Favor interventions requiring existing god commitments, not 12 extra gods or permanent city perks.
- Visuals: 92 distinct icons in seven native atlases; 36 effect textures in three approved native atlases. Every content entry has a VFX recipe; passive artifacts only show an effect when their rule actually triggers.

## The two projects and exact paths
**Source delivery project:**
C:\Users\lazeb\Desktop\blannder_models\relics-magic-blessings-2026-10-18

**Game project:**
C:\Users\lazeb\Desktop\pantheon_realms

**Copy runtime pack to:**
C:\Users\lazeb\Desktop\pantheon_realms\assets-runtime\mythic-library-v2

**Copy source design/provenance to:**
C:\Users\lazeb\Desktop\pantheon_realms\assets-source\art\mythic-library-v2

The source and game are separate projects. COPY approved files into the game. Never reference blannder_models, .codex/generated_images or desktop absolute paths from shipped code.

Use COPY_TO_GAME.ps1 in the source folder after reviewing its target. It copies only the ten approved atlas PNGs listed in manifest.json, plus metadata, and copies design docs into the source-art folder. It does not edit code or delete old assets. It verifies hashes and refuses to overwrite a different existing target file.

Read in this order:
1. CLAUDE_HANDOFF.md (this file).
2. GLOBAL_RULES.md (authoritative timing, stacking, limits, edge cases).
3. CONTENT_CATALOG.md (all 92 entries in readable form).
4. design/content-catalog.json (merged structured design, not a drop-in engine schema).
5. manifest.json (exact native sourceRect coordinates and asset-ID mapping).
6. design/vfx-recipes.json (per-entry effect trigger, materials, behavior and cleanup).
7. RESEARCH_AND_INSPIRATION.md (mythological sources and Heroes adaptations).
8. qa/asset-audit.json (file validation; does not claim gameplay validation).

Open index.html directly in a browser to inspect/search/filter the catalog and animate effect textures. It is a static local preview requiring no build. Do not ship the preview as game UI.

## Existing code inspected and integration points
Paths below are relative to C:\Users\lazeb\Desktop\pantheon_realms:
- packages/content/src/catalog.ts — merges catalogs.
- packages/content/src/common/heroesMagic.ts, expanded.ts, arcana.ts — existing spell/artifact/intervention content. Add a separate mythicLibraryV2.ts and import additively.
- packages/rules/src/definitions/pantheons.ts — current artifact slots/rarity and content definitions.
- packages/rules/src/definitions/skirmish.ts — intervention definitions.
- packages/rules/src/systems/interventions.ts — current once-per-world-week player gate, Favor payment and target validation.
- packages/rules/src/systems/battle/actions.ts — castThisRound, spell validation and commander costs.
- packages/rules/src/state/match.ts — player.pantheon.patronGodId / minorGodIds, interventionWeek, hero/artifact state. Extend save types for counters/escrow/temporary units.
- packages/ui/src/assets/manifest.ts and icons.tsx — asset resolution.
- packages/ui/src/components/spellbook.tsx — spell selection.
- packages/presentation/src/fx.ts and fxLooks.ts — existing effects/TweenPlayer and graphics-quality handling.
- packages/presentation/src/battle.ts and seaBattle.ts — battlefield/naval presentation.
Locate current inventory, loot, merchant, Favor, encyclopedia and adventure-cast components by their content IDs; do not assume a screen filename that wasn't verified.

IMPORTANT: existing fx.ts accepts animation strips for some phases. Our VFX sheets contain **different materials, not consecutive frames**. Do not play the sheet cells as an animation. Create a single-frame texture from sourceRect and animate its opacity/scale/travel through TweenPlayer. Reuse skip/instant/low-quality behavior.

## Icon and atlas integration
- Register the pack manifest and iconAssetId -> visualFrameId mapping.
- Every frame has original image dimensions and sourceRect [x,y,width,height]. Use those measured coordinates, not width/4 or an assumed 256px grid. Some cut boundaries were adjusted to avoid glow bleed.
- Preserve aspect ratio and contain-fit: artifact inventory 48–64px; spell/Favor buttons 48–64px; inspection/encyclopedia 96–128px. Tooltips may use 160px. Native artwork is sufficient; do not upscale exported files.
- An existing img URL resolver alone cannot display one frame from an atlas. Add an AtlasIcon component or extend the asset record to include a frame. Keep fallback support for existing standalone images.
- atlas-view.js demonstrates correct DOM rendering. For Pixi use the loaded texture source + a Rectangle matching sourceRect; cache frames and unload with the owning scene.
- Paths in manifest.json are relative to the runtime pack root. Example: assets/icons/icons-greek.png becomes assets-runtime/mythic-library-v2/assets/icons/icons-greek.png.
- Actual icon PNGs are 1254 x 1254; effects are native landscape images with dimensions recorded in the manifest. Requested larger sizes were not forced or synthesized.
- The first unspaced Greek/Norse/Egyptian VFX attempt is retained in the source folder for provenance only. It is NOT in the approved manifest. Use vfx-greek-norse-egyptian-spaced.png.

## Mechanics implementation priorities
### 1. Shared plumbing
Introduce proposed mythicLibraryV2 content/scenario flag; catalog definitions, icon resolver, semantic effect tags, known-spell access, save migrations and rules-event dispatch. Add all 92 entries to encyclopedia with accurate locks/availability.

Effect tags must be explicit data, never guessed from an ability's display name or color: fire, water, cold, nature, wind, arcane; physical/ranged/projectile/spell; mind; summon/illusion; forced displacement; root/anchor; healing/resurrection. Audit old effects before applying new conditional artifacts to them.

### 2. Lower-complexity hooks
Implement conditional damage/ward/retaliation/healing/artifact quotas, targeted cleanse/dispel, scouting reports, limited step discounts and ammo recovery. All content remains unavailable for normal play until its corresponding hook works; no placeholder +Attack replacements.

### 3. Positional and persistent state
Implement footprint-safe swap/push/flight, root/anchor restrictions, ground zones, current/landing mechanics, dwelling reservations and courier escrow. The player's chosen hero route persists across days and recalculates costs without discarding the destination.

### 4. Complex effects
Door of the Duat temporary HP ledger, Xolotl illusion lifecycle, and Glass Bulwark navigation changes need dedicated tests. GLOBAL_RULES.md provides exact destruction, expiry, defeat and path-blocking rules. Don't count temporary summons as permanent victory forces.

All proposed implementationHook strings are specifications, not claims that the current engine supports them. Extend typed effect unions, command validation, reducers, AI and presentation together.

## Screens and interaction changes
| Screen | Required behavior |
|---|---|
| Hero inventory / equipment | Correct slot and rarity, new icon, effect summary, remaining daily/battle quota; active artifacts get a compact action in battle, not permanent text clutter. |
| Artifact loot, merchant, reward and comparison | Include new pool entries, prices and comparison tooltips. Keep quest artifacts excluded from Courier Sigil. |
| Battle spellbook | Faction/general, tier, mana, target and availability; legal target preview; no duplicate or hidden-cost cast. Show unavailable reason. |
| Adventure spellbook | Separate adventure context; valid known targets/route preview; no casting through campaign masks or missing ships. |
| Favor / god screen | 12 new blessings with required god, Favor price, shared weekly-used state and unlock explanation. Existing commitments are decisive. |
| Battle inspection/status | Show named effect icon, source, remaining activations/rounds, barrier HP or charges, exact dispel eligibility. |
| Adventure hero panel | Small active travel/scouting/anchor/reservation/delivery badges with expiry; planned route stays visible across days. |
| Dwelling recruitment | Reserved stock split from available stock; full cost and army capacity still required. Visible reservation owner and expiry. |
| Naval UI | Existing ship/landing targeting; never imply land troops may occupy water because of an icon or effect. |
| Encyclopedia | Search all 92 by pantheon, context, slot/tier; exact effect and provenance-flavor text; existing art for summoned copies. |
| Accessibility/settings | Text labels/tooltips supplement color; reduced-motion/static flashes; keyboard focus and target cancellation. |

No new full-screen background, creature model, portrait, equipment silhouette or audio recording is required for this expansion. Reuse the existing screens, creature sprites, map-site models and licensed sound families. The delivered icon/FX kit covers the new visual identities.

## Suggested presentation timing
All 92 entries have recipes in design/vfx-recipes.json.
- Cast: optional small faction seal, ~150ms.
- Travel: 200–350ms, rotate right-facing trail to target.
- Impact/ward/cleanse: 350–700ms; cap combined sequence at ~900ms.
- Status: small badge; subtle zone texture only where the rules say it persists.
- Soft normal-alpha blending first; additive core only if tested on snow/sand/deck/water. Never display an opaque black/gray atlas cell.
- Persistent zones draw below units; damage numbers, selection and target outlines draw above.
- Fan out area effects only for actually affected targets, stable order. Cap concurrent decorative particles; no screen-wide flashes.
- VFX never decide damage, movement or expiry. Normal/fast/instant playback must produce identical rules state.
- Reuse current sound families: soft metal/chime for wards, wind for movement, frost crack for runes, water for naval effects, muted crackle for dispels. No new audio files are supplied.

## Balance starting points and discovery
Do not unlock everything at once. Native faction spells enter tier-appropriate Sanctum pools; the ten general spells enter shared pools. Cross-faction faction spells require explicitly authored rare scrolls. Artifact lore identity does not restrict who equips it.

Suggested relative loot weights: treasure 8, minor 5, major 2, relic 1. Preserve existing authored quest rewards and first-campaign progression. Test artifacts that improve early travel and the major late battle control effects separately. The 12 Favor blessings compete with existing miracles for the SAME one-per-week use.

Watch for dominant combinations: discounts + surcharge waivers; Mimir/Thoth discounts + mana refunds; Fleece/Tyet/wards; dispel + root chains; temporary return + recovery; illusion + on-kill procs; ship boarding + landing reserve; discount key + dwelling compact. Follow global caps and original-stack ledgers.

## Acceptance tests before enabling the pack
1. Catalog totals/deltas and IDs match; all 92 icons resolve on inventory, spells, Favor and encyclopedia. Existing icons and saves remain valid.
2. Tier, pantheon, known-spell, required-god and weekly-Favor gates agree in UI and authoritative rules. No second new commander activation in a round.
3. Cancel/illegal/outdated target spends no mana/Favor/quota. Costs in preview match committed costs with discounts/refunds.
4. Save/reload, item transfer, splitting/merging and turn rollover cannot refresh quotas or duplicate items/stock.
5. Control-category grace, dispel eligibility, status timing, waits/defends and death cleanup behave exactly as documented.
6. One- and two-hex targets, occupied footprints, flying, water, narrow bridges, walls/gates and campaign barriers validate before movement.
7. Door of the Duat/illusion cannot prolong permanent defeat or farm XP/recovery. Expiry removes only temporary bodies.
8. Glass Bulwark cannot seal sole naval access or a previously reachable opposing ground pair. Pathfinding rebuilds on removal.
9. Courier/reservations survive hero death, capture, day change, loading and elimination without duplication/loss.
10. Naval blessings cannot create ships or grant land units water occupancy. Boarding/landing never creates movement.
11. Campaign auto-resolution stays disabled on every battle entry path. Old scripted encounters are not bypassed.
12. Replay and multiplayer deterministic hashes are identical at normal, fast and instant VFX speeds.
13. Inspect art on dark/light UI, grass, snow, sand, deck and sea at 48/64/128px. No atlas neighbors, clipped sprites or dark rectangles.
14. AI uses only legal targets, doesn't waste spell/weekly allowance on empty effects, understands zone avoidance and considers travel limits.
15. Run existing repository checks plus focused tests for new mechanics. Report actual results and unresolved balance issues; don't mark the expansion implemented solely because art loads.

## Completion expected from Claude
Return implemented files, migration notes, screenshots of inventory/spellbook/Favor/representative battle effects, test results, and a list of any intentionally disabled hooks. Keep the expansion behind its feature flag until all included enabled content has real rules support.

