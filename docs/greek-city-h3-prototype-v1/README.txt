GREEK POLIS — HEROES III INSPIRED ART PROTOTYPE

Open preview.html in a browser to test the city.
Open contact-sheet.html to inspect all 18 transparent building assets.
Open versions.html to inspect all 33 catalog versions, grouped by building.

DELIVERABLES
full-city.png — complete concept painting.
background.png — reconstructed terrain plate, with gameplay buildings removed.
buildings/*.png — 33 individual transparent building/complex versions.
The original slot-name PNG is the highest level; .l1, .l2 and .l3 suffixes
identify additional earlier levels where present.
manifest.json — building IDs, relative image paths and initial placements.
manifest.js — the same manifest packaged for a preview that opens without a server.
prompts.json — full generation and extraction prompts.
version-prompts.json — prompts for the 15 earlier building stages.
assembled-preview.png — screenshot of the actual background + building layers.
contact-sheet.png — screenshot of all building assets on checkerboard.
validation.json — dimensions, transparency checks and preview checks.
all-versions.png — all 33 versions grouped into upgrade chains.
base-city-preview.png — city with every location at its first level.

CONTROLS
Show all: reveal all buildings.
Background only: hide all buildings.
View concept: compare the independent layers against the original painting.
Click a building or its name to select it.
Drag the selected building to move it.
Width changes its scale. Depth changes its overlap order.
Checkboxes toggle individual buildings.
Each building's dropdown selects its construction level or dwelling upgrade.
All base versions / All upgraded switches every location for comparison.
Reset layout returns to the supplied placement.
Export placement JSON downloads your adjusted layout. Changes are not autosaved.

PLACEMENT FORMAT
x = horizontal center as percent of scene width.
y = bottom edge as percent of scene height.
width = image width as percent of scene width.
layer = stacking order, higher numbers draw on top.
Image dimensions and transparent padding matter when tuning the final position.
Each slot has a shared frameAspectRatio; all its versions fit within this
bottom-aligned frame. Variants include catalog building IDs and art asset IDs.
The scene is 3:2. The current game's town scene uses a different aspect ratio,
so adopting this artwork requires a coordinated aspect-ratio and placement change.

SCOPE AND LIMITATIONS
This is an isolated visual test kit, not integrated game content.
All 33 versions in the current Greek building catalog are included:
four civic halls, three fortifications, three Sanctums, two temples,
seven single-level support buildings, and seven base/upgraded dwelling pairs.
Damage states are not construction levels and are not included.
Images were generated with the built-in image generation tool.
The background and transparent assets are reconstructions guided by the concept,
not a lossless decomposition. Some architectural details can differ.
Final game integration will need click regions, foreground occlusion and
ground-contact refinements, plus appropriate asset-resolution choices.
The preview uses rectangular image hit regions for dragging.

REPEAT VALIDATION
From the repository root:
node docs/greek-city-h3-prototype-v1/verify.mjs

This launches a temporary local server and headless Chromium, checks that all
33 version images load with transparency, exercises every version selector,
base/maximum presets and the preview controls, and saves
the assembled scene, asset contact sheet and validation results.
