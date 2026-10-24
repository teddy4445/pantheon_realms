PANTHEON REALMS — THE WINGED THREE
Review candidate v1 • 23 October 2026

This is an isolated art and design review kit. Nothing in this folder has been
registered in the game's creature roster, battle rules, asset manifest or installer.
Stats and special abilities are proposals, not playtested gameplay.

VIEW THE COMPLETE KIT
Run: node docs/neutral-dragons-review-v1/serve.mjs 4182
Open: http://127.0.0.1:4182/
Choose Yinglong, Zilant or Cuelebre to compare base and upgrade. Select any of the
13 animations, pause, scrub individual poses, change speed/background, or tour all
states. Disable Repeat to hold the final death/attack pose. Ability preview includes
an optional generated eight-frame effect plus lightweight particles.

DELIVERY
6 individual full-body masters and 6 square portrait masters.
Each form: 48/64/96/160/320 px portraits, 64/96/160 px map figures, 640 px stand.
Each form: idle, move, attack, hit, defend, victory, shoot, cast, takeoff, fly,
landing, ability and death. Six generated poses per animation: 78 clips / 468 poses.
Each form: one unique special-effect sequence, eight generated frames: 48 FX poses.
All animation sheets retain transparent alpha. Importing preserves aspect ratio.
Curved gutter cuts keep neighboring feather tips out of each sprite. Grounded
poses use contact anchors; each atlas has a constant scale calibrated to idle.
Facing is right; the game's renderer can mirror for left-facing armies.
Shoot and cast are reserved presentation clips. These proposals have zero shots;
those clips do not grant ranged attacks or additional spells.

DESIGN
Yinglong: four-legged winged Chinese rain dragon; rain protection for allies.
Zilant: two-legged Tatar/Kazan serpent with red wings; dread suppresses retaliation.
Cuelebre: legless Asturian guardian with feather wings; defensive protective coil.
Upgrades change silhouette, crest/crown, wing ornament and special-effect design.
Upgrade names and abilities are game adaptations, not claims of historical names.
See design/roster.json for all numerical stats, costs, precise ability rules,
habitats, mythology links and comparison with existing high-tier creatures.

FILES
assets/                  Exported transparent WebP atlases and small images.
source/                  Original generated PNG masters and animation sheets.
design/roster.json        Proposed stats, rules and animation timing.
design/sprite-manifest.json  Review gallery atlas regions, anchors and timings.
design/sprite-manifest-merge.json  Future integration reference; DO NOT auto-merge.
design/generation-prompts.json    Saved master and portrait prompts.
design/animation-prompts.json     Saved animation and effect prompts.
design/import-report.json        Source dimensions and per-frame alpha bounds.
tools/import.mjs          Reproducible asset packaging; accepts a Sharp module path.
tools/validate.mjs        Delivery structure, file, alpha and atlas validation.
tools/browser-check.mjs   Preview navigation, controls and layout verification.
design/validation-report.json  Export validation results.
design/browser-check.json      Browser validation results.
design/asset-checksums.json     SHA-256 checksums for exported art.
qa/                      Portrait/character boards and animation contact sheets.
review.js                Preview playback, optional crossfade and particle treatment.

PRODUCTION NOTES
The built-in image_gen tool created the artwork. Resizing, cropping and packing
were performed locally with Sharp; original generated PNGs are preserved.
The generation prompts are recorded verbatim in the design folder.
These are generated hand-painted animation candidates: inspect anatomy and motion
at the intended game scale before approving integration. The review can be used
to identify frames that need another art pass.
Following approval, integration still requires roster/lair registration, actual
special-ability implementation, targeting rules, AI handling and balance testing.
Do not treat the gallery's effect playback as an implemented battle rule.
