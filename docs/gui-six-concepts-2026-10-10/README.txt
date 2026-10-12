PANTHEON REALMS — SIX GUI SCREEN CONCEPTS
Created 2026-10-10 using the built-in image generator.

Open index.html to browse all six screens. Click an image for the full native PNG.

01-tavern-recruitment.png — Hero selection, character details, offer and hire action.
02-creature-dwelling.png — Creature stats, recruitment quantity, total cost and seven army slots.
03-marketplace.png — Give/receive resource exchange at an Egyptian merchant counter.
04-hero-level-up.png — Portrait, attribute gain and two secondary-skill choices.
05-spellbook.png — Illustrated spell entries with the selected spell's details.
06-enemy-encounter.png — Friendly army and limited enemy information before combat.

These are visual reference screens only. Text and controls are baked into the PNGs. They are not production UI layers and must not be installed as functional screens with invisible click regions. No game code or release version was changed. A later implementation would need separate backgrounds/decorative elements and live text, inputs and game-bound data.

The sample tavern offer, inventories, army counts, encounter danger and level-up state are illustrative. Preserve actual game quotes, legal actions, catalogs and visibility rules. Do not interpret the sample 100-Gold-per-Wood rate as a balance change. Do not add a danger estimate or conceal exact numbers unless supported by the existing game visibility rules.

Hoplite stats/cost and skill effects were checked against current content. Spell labels and costs use current catalog entries; Lightning's shown 55 damage is its base 25 + 10 x Power 3, before any applicable target mitigation. Casting enters target selection; costs and effects must commit only on a valid confirmed cast. Spell availability remains subject to actual access rules and known spells.

Style reference: C:\Users\lazeb\Desktop\pantheon_realms\docs\encounters-v1.1.0\concept-hero-meeting.png
Final folder: C:\Users\lazeb\Desktop\pantheon_realms\docs\gui-six-concepts-2026-10-10
Exact generation prompts: prompts.json. Generator provenance and barracks correction prompt: generation-record.json.
The barracks row was corrected in the image generator to contain three occupied slots and four empty slots. No code-based retouching, cropping or upscaling was performed.
