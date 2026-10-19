from pathlib import Path
import json, html, re

ROOT = Path(__file__).resolve().parent
old = (ROOT.parent / 'single-ship-sea-battle-2026-10-17-v2/CLAUDE_HANDOFF.txt').read_text(encoding='utf-8')
units = json.loads((ROOT / 'animation-manifest.json').read_text(encoding='utf-8'))['units']
assets = json.loads((ROOT / 'asset-manifest.json').read_text(encoding='utf-8'))['assets']

intro = r'''PANTHEON REALMS — COMPLETE SEA-CREATURE ANIMATION & BATTLE HANDOFF
17 October 2026 | Consolidated delivery | Read this handoff first

Implement the five neutral sea-creature families, their base and upgraded portraits and animated battle sprites, the four attack/impact effects, and the revised single-ship sea encounter. This package supersedes the earlier portrait-only delivery. All game code was read-only during asset preparation; the feature is not yet integrated or playtested in the game.

1. COPY BETWEEN THE TWO PROJECTS

SOURCE PACKAGE:
C:\Users\lazeb\Desktop\blannder_models\sea-creatures-complete-2026-10-17

TARGET GAME:
C:\Users\lazeb\Desktop\pantheon_realms

Copy the CONTENTS of:
C:\Users\lazeb\Desktop\blannder_models\sea-creatures-complete-2026-10-17\assets
into:
C:\Users\lazeb\Desktop\pantheon_realms\assets-runtime\sea-creatures-v1

Preserve the animations subfolder. Result examples:
C:\Users\lazeb\Desktop\pantheon_realms\assets-runtime\sea-creatures-v1\single-ship-battlefield.png
C:\Users\lazeb\Desktop\pantheon_realms\assets-runtime\sea-creatures-v1\triton-upgraded.png
C:\Users\lazeb\Desktop\pantheon_realms\assets-runtime\sea-creatures-v1\animations\triton-upgraded-core.png

Keep the whole source delivery and its design/manifest data under:
C:\Users\lazeb\Desktop\pantheon_realms\assets-source\art\sea-creatures-v1

Use asset-manifest.json for exact filenames, native sizes and SHA-256 checks. Use runtime asset keys beginning sea-creatures-v1/ through the game's normal asset resolver. Never import from blannder_models, .codex, generated_images, or another user's desktop. Source and game are different projects; referencing the source without copying is not integration. If the destination already exists, compare hashes and existing registry use before replacing files.

Open index.html directly for the animated preview. battlefield-preview.html contains the terrain/footprint and portrait reference. Both work without a framework, build or server.

2. WHAT IS INCLUDED

37 native PNG assets:
• 22 transparent creature atlases, each 1254 × 1254, covering 10 forms.
• 4 transparent projectile/impact atlases, each 1774 × 887.
• 10 opaque portraits, each 1254 × 1254.
• 1 opaque battlefield, 1672 × 941: left half deck, central rail, right half sea.

84 animation profiles, containing 335 frame entries in total. This counts referenced poses, including deliberate reuse; it does not mean 335 unique hand-drawn frames. All are short 2D sprite pose sequences, generally four poses each, not 3D rigs, skeletal animation, video files, or smooth high-frame-count animation.

Every form has idle, move, attack, defend, hit, death and victory. The eight swimming forms also have shoot. Both Hippocampus forms have takeoff, fly and landing instead of shoot. No cast/ability clips are claimed. Ship movement animations and the older two-ship boarding mode are outside this package.

The generator's native RGBA pixels were preserved. No code retouching, background removal or upscaling was performed. Source rectangles, anchors, mirroring, scale and runtime fade/translation are rendering metadata. Do not remove alpha, chroma-key green pixels, flatten atlases onto black or resize them without also rebuilding the coordinates. Hidden RGB in fully transparent pixels is not a visible background.

This is native-resolution art: the battlefield is below 1920 × 1080. Use contain/letterboxing, never stretch/crop the battlefield independently of its grid. Portraits are for encyclopedia, inspection, encounter cards and upgrade comparison; use the transparent sprites in combat. Keep visible upgrade indicators and accessible names even though the upgraded silhouettes differ.

Important supplied files:
• sprite-manifest-merge.json — partial keyed entries for the existing sprite registry, NOT a replacement for the whole registry.
• animation-events.json — cosmetic contact/release timing, hover/death behavior and FX orientation.
• animation-manifest.json — preview data linking forms, portraits and sprite definitions.
• asset-manifest.json — all 37 deliverable images and their hashes.
• design/battlefield-layout.json — 16 × 11 board, terrain, normalized centers and projection.
• design/sea-creature-roster.json — movement, footprints, proposed range and renewable-ammo rules.
• design/frame-review.json — measured native rectangles, excluded pose and deliberate landing reuse.
• design/validation.json and design/browser-validation.json — package checks, not game integration certification.
• generation-prompts.json and reference/portrait-and-battlefield-prompts.json — generation prompts/provenance. Built-in image_gen was used.

Do not restore Abtu & Ant or the older full-ship picture. The two-fish family was rejected and is replaced by Triton / Stormcaller Triton. Deprecate old encounter references deliberately and retain save migrations; do not blindly delete unrelated data. Preserve old layouts for battles already in progress or explicitly migrate and validate placements.

'''

design = old[old.index('3. FIVE NEUTRAL CREATURE FAMILIES'):old.index('6. INTEGRATION POINTS')]

animation = r'''6. ANIMATION REGISTRY AND PLAYBACK

The game API inspected was packages/presentation/src/sprites.ts in v1.4.0. Recheck the current checkout before applying changes. It already supports explicit SpriteFrameRegion entries (rect, anchor, sourceScale, sourceCell), per-state fps/loop, facing and pixelsPerHex. Its animation vocabulary includes all supplied states.

Deep-merge the creatures, effects, projectiles and projectileProfiles maps from sprite-manifest-merge.json into the existing manifest. Preserve heroes, sites, decor, obstacles, siege and every unrelated creature/effect. The supplied object has a notice and lacks required unrelated registry sections; it must NOT replace the production manifest wholesale or be passed as a complete manifest without merging/validation. Follow the existing content build/registry pipeline, rather than introducing a second competing registry.

Proposed creature IDs (map to current canonical content IDs if already present):
hippocampus → tempest_hippocampus
cetus → crownfin_cetus
hafgufa → abyssal_hafgufa
isonade → razorwake_isonade
triton → stormcaller_triton

No matching sea-family IDs were found in the inspected creature/sprite sources during preparation. That is a snapshot, not permission to duplicate records added subsequently. HP, damage, defense, speed, prices and growth still need a balance pass; preserve existing values if available. Keep these neutral creatures outside automatic pantheon town recruitment unless explicitly configured.

Rendering each frame:
1. Resolve file through assets-runtime. Use regions[frameIndex], not a uniform 4 × 4 division. The source images do not have perfectly aligned gutters; explicit rectangles are essential.
2. Draw the rect's native pixels at local offset (-anchor.x, -anchor.y). These region anchors are in native pixels relative to that rectangle; the strip-level normalized anchor is only a fallback when regions are absent.
3. Apply sourceScale, then the set's pixelsPerHex scale relative to the rendered hex size. Keep logical occupancy and art size separate; a two-hex unit remains two hexes regardless of its fin width.
4. All creature art faces right. Mirror the complete anchored sprite and attachment/socket offsets when facing left. Do not merely mirror the image while leaving the projectile socket on the other side.
5. Translate the anchored sprite along the legal path during move/fly. Changing image frames alone is not movement. The renderer never changes rules-layer coordinates or spends actions.
6. Use the explicit frames count and loop flag. Never assume every state has four frames. Loading/missing-file fallbacks should be visible in diagnostics rather than silently displaying a portrait as the final combat sprite.

Cadence: idle 3 fps; move and shoot 6; attack and hit 7; defend and landing 5; death and victory 4; takeoff 6; fly 7. These are short illustrated cycles. Keep pose-to-pose playback; do not crossfade opaque creature bodies into double silhouettes or claim interpolation creates new painted poses.

Idle, move and fly loop. Attack, shoot, defend, hit, takeoff, landing, death and victory play once. Normal hit/attack/shoot returns to idle. Defend holds its final pose while the defending status is active; victory holds its final pose until exit. Flight sequence is takeoff → travel/fly loop → landing → idle. Over water, landing means settling into a low hover, never standing on the sea. Intrinsic flyers hover around 0.12 hex high at idle and 0.4 during travel; height is purely visual.

Death holds its final pose. Over water only, optionally sink the visual by 0.12 hex and fade it over 450 ms after the final pose; do not change battle death resolution. On deck, hold the final pose under the existing corpse policy. Clear defeated-unit interaction immediately according to the game state, not when the animation ends. On reload, reconstruct living/dead visuals from saved rules state without replaying damage or shots.

Contact/release indices in animation-events.json are zero-based: generally frame 2. Emit each cosmetic event at most once per action token, including when a fast frame jump skips past the release time. Killing, canceling, skipping, speeding up, tab suspension or reduced motion must never reapply the attack. Rules resolve exactly once; presentation consumes the resolved event and animates its result. Death outranks hit. Multiple projectiles/splashes do not imply multiple hits or an area attack.

Source sockets in animation-events.json are initial normalized positions within the release frame's source rect. Convert through rect anchor, scale, mirror and world transform. Calibrate visually at the game's actual battle scale for mouths, the Isonade tail tip and the Triton conch bell. The supplied socket positions are starting metadata, not hand-calibrated bone sockets. Do not compensate by moving the logical unit.

Respect prefers-reduced-motion and the game's animation-speed controls. Reduce or skip travel particles, idle bobbing and dramatic sink effects while preserving readable action indicators. Pause off-screen encyclopedia previews; do not autoplay dozens of 1254-pixel atlases in a hidden panel. Lazy-load battle families and unload/reuse texture caches through the existing asset manager.

Known art/metadata decisions (do not discard):
• Razorwake Isonade shoot uses THREE frames. Source actions row 1, column 3 touches the outer canvas edge and is excluded from playback. Keep the manifest order/count; do not restore it by assuming a regular sheet.
• Tempest Hippocampus landing uses the takeoff poses in reverse. The generated landing row repeated attack poses, so it is intentionally unused. This reuse is marked by aliasOf. The explicit regions are authoritative; aliasOf here is descriptive, not an ID to resolve recursively.
• Per-sheet sourceScale and per-frame anchors were measured from native alpha/body bounds. Minor illustrated shape/anchor variation may remain between poses. At final game scale, tune metadata if needed; do not claim these are rig-locked frames.
• Small detached generated flecks outside the main body rectangles are excluded. Use the separate FX atlases for travelling projectiles and impact bursts.
• status: final in the supplied sprite entries means final provided raster art, not that integration, balancing or in-game performance checks have passed.

7. PROJECTILES, IMPACTS AND AUDIO

Cetus / Crownfin Cetus: Brine Jet. Pale turquoise water jet, compact splash on impact.
Hafgufa / Abyssal Hafgufa: Deepwater Blast. Dark pressure sphere with foam, heavy circular water burst.
Isonade / Razorwake Isonade: Barbed Spray. Ivory hooked barbs, short chips/droplets impact.
Triton / Stormcaller Triton: Conch Blast. Pale cyan sound-pressure rings, expanding ring burst.

Each FX atlas contains four travel poses on the upper row and four impact poses below. Use the supplied native rectangles, including uneven integer sizes caused by odd image dimensions. The Isonade profile deliberately uses a static travelling pose; its four impact frames animate. Other travel sequences loop. Use supplied travelFps/impactFps 8, 220–650 ms duration range, 150 ms final impact fade, normal alpha blend and no full-screen flash. Base and upgrade share their family's effect; the body silhouettes provide the main upgrade distinction.

Critical orientation detail: Deepwater Blast was generated pointing LEFT. animation-events.json → fxOrientation.hafgufa supplies travelRotationOffsetRad = PI. Apply angleToTarget + this offset to travelling blast art. The other three use offset 0. Impact orientation stays 0; do not rotate an impact burst with the travel correction. The current ProjectileProfile type does not natively expose this correction, so extend the optional presentation metadata or add a keyed FX orientation adapter. Merely merging the registry will not apply it. The package viewer.js shows the correction in use.

Profiles use sourcePoint names mouth, tail-tip and conch-bell. Verify/extend the game's resolver for these values; don't assume every new sourcePoint is already supported. Unit IDs and effect IDs must follow any canonical ID mapping performed during integration. Keep effects in the normal alpha pipeline; additive blending can wash out ivory barbs and water foam.

Fire visual travel from the mirrored release socket to the resolved target's appropriate occupied cell, then play one impact at contact. Camera distance/hex spacing affects only presentation duration. Do not start a second rules-layer hit at impact. This package does not introduce splash damage, slow, knockback, drowning or status effects through art alone.

No new audio is included. Reuse and verify the existing game's sound registry entries where suitable. Files observed in the current game include assets-runtime/audio/sfx/magic_water.ogg and magic_holy.ogg, but filenames do not establish registry IDs; resolve current IDs before wiring them. Suggested layers: soft water push for Brine Jet, a low short pressure thump for Deepwater Blast, a subdued whistle/tick for Barbed Spray, and a short conch tone for Conch Blast. Avoid loud overlapping loops. Deck Harpoon may reuse the existing arrow projectile and a light launch sound; no dedicated harpoon sprite is included.

8. RULES, SCREEN AND SAVE INTEGRATION

Files inspected under C:\Users\lazeb\Desktop\pantheon_realms:
packages/rules/src/definitions/creatures.ts
packages/rules/src/systems/battle/common.ts
packages/rules/src/systems/battle/actions.ts
packages/rules/src/systems/battle/deployment.ts
packages/rules/src/systems/battle/geometry.ts
packages/rules/src/systems/battle/flow.ts
packages/presentation/src/sprites.ts
docs/pantheon-v0.3/content/02_animation_behavior_contract.md

Observed shooter logic requires the shooter ability AND stats.shots > 0. Initialization seeds shotsRemaining; preview/commit reject exhausted, engaged and out-of-range shots; commit spends ammunition. Effective range includes climate and nearest footprint-cell distance. Add renewable shots through definitions/schema, initialization, round transition, AI, previews and saves consistently. Animations do not make a melee-only record a legal shooter.

Add the layout-specific occupancy policy in shared rules, not CSS/client filtering. Use it for reachable cells, deployment, AI, summons, teleport, resurrection and restored saves. Add Deck Harpoon as a real contextual action sharing damage preview and execution, not a visual button that bypasses normal activation. Existing land battles, sieges and two-ship boarding must keep their previous policies.

Save layout ID, ship ownership/sourceShipId, shipSide, terrain policy and renewable-ammo/action state through existing versioned migrations. Reuse existing ship result/army persistence rules; a single static background does not add hull HP or sinking. Handle the ship as attacker OR defender. Keep campaign auto-resolution disabled.

Screens to update:
• Battle: background/grid alignment, legal terrain highlights, animated sprites, counters, targeting, Deck Harpoon availability/tooltip and readable action/impact effects.
• Encounter/inspection: correct base/upgraded portrait, neutral origin, footprint, flight/swim trait, ranged attack name, range and renewable-shot explanation. No technical enum text in player-facing labels.
• Encyclopedia: all ten forms, upgrade comparison and only one active animation preview at a time. Keep keyboard focus and accessible names.
• Recruitment/army UI where these neutrals are actually available: correct portraits and upgrades, with explicit rules for where aquatic armies can travel/fight. Do not allow unrestricted recruitment onto land before terrain compatibility is implemented; use sea-only encounter availability as the initial safe scope.
• Adventure sea encounter selection: choose this new layout for one ship versus compatible sea creatures. Keep existing two-ship boarding encounters separate.

Suggested implementation order: copy and validate art → merge registry/map IDs → add shared terrain/shot/action rules and migrations → connect rendering/events/FX orientation → update screens → exercise AI and campaign restrictions → run acceptance checks. Keep the feature gated until game integration checks pass, rather than enabling a partially working encounter.

9. ACCEPTANCE CHECKLIST FOR CLAUDE

ART AND PRESENTATION
• All 37 runtime URLs resolve. Hashes match source. No runtime reference points outside the game project.
• All 10 forms have their required states; each state uses explicit regions and the proper FPS/loop policy. The three-frame shot and reverse landing remain correct.
• Play every state at battle scale facing both directions. Check no chopped wings/tails, obvious pose jumping, disappearing sprites, incorrect upgrade identity or opaque boxes. Correct metadata where necessary before shipping.
• Mouth/tail/conch sockets remain attached when mirrored. Deepwater Blast flies toward its target with PI travel correction; impacts do not inherit it.
• Rules apply damage/ammo exactly once regardless of frame rate, speed changes, skips, reduced motion, hidden tabs, cancellations or save/load. Death does not return to idle.
• Background is contained with the grid projected into the same rectangle. Hover and hit tests reject the rail/margins. Test resized windows and normal desktop UI scale.
• Portraits remain readable at 48/64/96 px; upgrade state and accessible names are available without relying only on artwork.

RULES AND CONTENT
• Seven one-hex or two-hex stacks deploy per side, including ship-as-defender. Complete footprints, not just anchors, obey deck/water bounds.
• Ground stays on deck; swim stays in water; flight crosses and hovers. Shared occupancy prevents vertical stacking. Two-hex endpoints never straddle the rail.
• Summon, resurrection, teleport, rotate, push/pull/fear and anti-flight effects cannot create illegal placement or automatic drowning.
• Every base and upgrade can harm a deck unit: both Hippocampi fly; the other eight forms have repeatable ranged attacks. Renew exactly once at round start, including round 1; persist correctly without changing normal archers.
• A melee-only ship army can use Deck Harpoon against offshore swimmers, with matching preview/execution and full activation cost. Test blocked approaches, high defense, exhausted shots, climate penalties and round limits.
• Cross-rail melee keeps the attacking sprite/footprint at its legal origin; engaged shooters receive a legal alternative.
• AI selects legal attacks and useful firing positions without repeatedly attempting rejected shots or moving swimmers onto deck.
• Old saves/layouts still load, unrelated land/siege/two-ship battles behave as before, campaign auto-resolve remains unavailable, and returning army ownership is correct.

DELIVERY VALIDATION ALREADY PERFORMED
Native rectangles/anchors are within image bounds; every required state is present. The standalone Chromium preview exercised all 84 states and 335 frame entries, reported zero JavaScript errors or broken images, and no horizontal overflow at 390px width. Representative sprites and effects were visually reviewed on the supplied background. These are package checks; they do not claim in-game performance, socket calibration, AI behavior, balance or engine tests passed. Claude must report its actual test results and unresolved issues separately.

'''

refs = old[old.index('8. MYTHOLOGICAL REFERENCES'):].replace('8. MYTHOLOGICAL REFERENCES','10. MYTHOLOGICAL REFERENCES')
text = intro + design + animation + refs
(ROOT / 'CLAUDE_HANDOFF.txt').write_text(text, encoding='utf-8')

sections = re.split(r'(?m)^(\d+\. [^\n]+)\n', text)
body = '<p class="intro">'+html.escape(sections[0]).replace('\n','<br>')+'</p>'
for i in range(1,len(sections),2):
    body += '<section><h2>'+html.escape(sections[i])+'</h2>'
    for para in sections[i+1].strip().split('\n\n'):
        body += '<p>'+html.escape(para).replace('\n','<br>')+'</p>'
    body+='</section>'
rows=''.join('<tr><td>'+html.escape(u['name'])+'</td><td>'+html.escape(u['id'])+'</td><td>'+html.escape(', '.join(u['sprite']['animations']))+'</td></tr>' for u in units.values())
gallery=''.join('<figure><img src="'+html.escape(u['portrait'])+'" alt="'+html.escape(u['name'])+'"><figcaption>'+html.escape(u['name'])+'</figcaption></figure>' for u in units.values())
doc='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Claude handoff · Sea creatures</title><style>
*{box-sizing:border-box}body{margin:0;background:#091922;color:#e6e3d6;font:17px/1.65 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:32px}h1,h2{color:#f1d38c;font-family:Georgia,serif}h1{font-size:42px}h2{margin-top:40px}a{color:#76e0df}nav{display:flex;gap:24px;flex-wrap:wrap}p{overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:12px;text-align:left;border-bottom:1px solid #36505b;overflow-wrap:anywhere}th{color:#f1d38c}.gallery{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}figure{margin:0}img{width:100%;border-radius:8px}figcaption{font-size:13px}.intro{padding:24px;background:#122e3a;border-left:3px solid #e4ba69}.hero{margin:28px 0}.intro br:first-child{display:none}@media(max-width:650px){main{padding:20px}h1{font-size:32px}.gallery{grid-template-columns:repeat(2,1fr)}table{font-size:11px}td,th{padding:7px}}@media print{body{background:white;color:black}h1,h2{color:black}nav{display:none}section{break-inside:auto}a{color:#222}.intro{background:none}}
</style><main><nav><a href="index.html">Animation preview</a><a href="battlefield-preview.html">Terrain & portraits</a><a href="CLAUDE_HANDOFF.txt">Copyable handoff</a><a href="asset-manifest.json">Asset manifest</a></nav><h1>Bring the sea creatures into battle.</h1><p>Ten forms · 84 animation profiles · Four projectile/impact sets · One consolidated implementation handoff</p><img class="hero" src="assets/single-ship-battlefield.png" alt="Equal deck and sea battlefield"><div class="gallery">'''+gallery+'''</div><h2>Animation coverage</h2><table><thead><tr><th>Creature</th><th>Proposed content ID</th><th>Supplied states</th></tr></thead><tbody>'''+rows+'''</tbody></table>'''+body+'</main></html>'
(ROOT / 'CLAUDE_HANDOFF.html').write_text(doc,encoding='utf-8')

readme = r'''PANTHEON REALMS — SEA-CREATURE DELIVERY

START HERE
Open index.html to play the animations. Open CLAUDE_HANDOFF.html to read the illustrated integration guide, or send CLAUDE_HANDOFF.txt to Claude Code together with this folder/ZIP.

Source: C:\Users\lazeb\Desktop\blannder_models\sea-creatures-complete-2026-10-17
Game: C:\Users\lazeb\Desktop\pantheon_realms

Contains 37 PNG assets: 22 creature atlases, 4 projectile/impact atlases, 10 portraits and the revised half-deck/half-sea battlefield. Covers 10 base/upgraded forms with 84 short 2D animation profiles. These are sprite sequences, not 3D rigs. No build or install is required for the preview.

All native image generation used the built-in image_gen tool. Prompts are saved in generation-prompts.json and reference/portrait-and-battlefield-prompts.json. No pixel retouching/upscaling was performed. Existing game files were not modified. The animations, rules and UI still need integration and in-game validation by Claude.

Known choices: upgraded Isonade shoot has 3 usable frames; upgraded Hippocampus landing reverses takeoff poses. Deepwater Blast travel needs a PI orientation correction. Full details and explicit frame rectangles are included. Do not divide every atlas into uniform cells.

sprite-manifest-merge.json is a PARTIAL merge into the existing registry. Never replace the whole game's sprite registry with it.

The revised battlefield and Triton family supersede the previous full-ship/two-fish proposal. Other prior features such as ship adventure movement and two-ship boarding remain separate.

Implementation prompt to paste into Claude Code:

Read C:\Users\lazeb\Desktop\blannder_models\sea-creatures-complete-2026-10-17\CLAUDE_HANDOFF.txt and the accompanying JSON manifests. Implement the supplied single-ship sea battle, ten creature forms, 84 animation profiles and four projectile/impact sets in C:\Users\lazeb\Desktop\pantheon_realms. Copy the assets into the game project using the documented paths; do not reference the other project at runtime. Follow the terrain, renewable-shot, Deck Harpoon, campaign no-auto-resolve, save migration and presentation-only event rules. Inspect the latest game code before adapting the partial registry. Preserve unrelated content and the separate two-ship boarding mode. Validate all listed acceptance cases and report the files changed, tests run, remaining limitations and any proposed balance changes. The art package is provided, but the game integration has not yet been done.
'''
(ROOT/'README.txt').write_text(readme,encoding='utf-8')
print('Wrote handoff TXT/HTML and README:',len(text.split()),'handoff words')
