Neutral dragons — integrated 23 October 2026

PLAY
Open the game at http://127.0.0.1:5173/ and refresh if it was already open.
Encyclopedia > Neutral: Rain Dragon / Celestial Rain Dragon (Yinglong), Zilant / Crowned Zilant, Cuélebre / Ancient Cuélebre.
Single Battle: add any of these six forms to either army for an immediate trial.
Random Game: enable "New neutral creatures". Habitat-compatible lairs join the species pool; generation remains symmetric between empires. Each lair is guarded by two base dragons, hires either form from ONE shared recruit per week, and offers one upgrade per week.
Map Editor > Neutral hiring sites: place one of the three dragon lairs.

DELIVERY
Approved portraits, map figures, recruitment idle strips, 13 authored animation states per form (78 clips / 468 poses), six painted ability effects with supporting particles, stats, lore and encyclopedia pages.
Shoot and cast clips remain reserve artwork: these are melee flyers, not normal ranged attackers.
Rainward / Monsoon Ward: one or two living allies, percentage protection against the next creature hit.
Dread Hiss / Royal Dread: one or two living enemies lose their next retaliation; undead, constructs and mind-immune creatures are immune.
Guardian Coil / Ancient Aegis: Defend plus protection for one or all adjacent living allies.
Each special uses one action once per battle per stack and expires on the dragon's next activation. Exact rules are shown in the encyclopedia and ability card. The AI understands the multi-target powers.
All upgrades cost 1,300 Gold and 1 Crystal per creature. Proposed balance values still need human playtesting.

SOURCE
Approved review kit: docs/neutral-dragons-review-v1/
Runtime pack: assets-runtime/neutral-dragons-v1/
Importer: tools/assets/import_neutral_dragons.mjs
Generated content: packages/content/src/common/neutralDragons.ts
Generated battle effect recipes: packages/presentation/src/neutralDragonArt.ts

CHECKS
TypeScript, package-boundary lint and production build pass.
Focused content, rules, recruitment/training, weekly stock, AI, encyclopedia, sprite and map generation checks pass.
Browser checks pass for all six encyclopedia pages and an actual two-target Monsoon Ward battle through the real save-import interface. Screenshots are in this directory.
See regression-results.txt for the broader suite's results and outstanding checks elsewhere in the game.
