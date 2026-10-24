LANDMARKS OF THE REALMS

Twelve transparent adventure-map sprites:
- Six giant guardian monuments inspired by the six pantheons.
- Marble and sandstone sanctuary ruins.
- Temperate and tropical cliff waterfalls.
- Sacred oak and blossom trees.

Generated using built-in imagegen. Exact prompts are in prompts.json; full-size
PNG sources are in this folder. Runtime transparent WebPs and sprite bindings
are in assets-runtime/map-landmarks-v1. index.html is the comparison gallery.

PLACEMENT
Landmarks are rare scenery, not new interactive reward sites. The seed fixes
their positions across reloads. Placement does not change map terrain, movement,
combat, saves or the gameplay RNG. Maps get at most eight landmarks, fewer when
space or suitable terrain is limited.

Interactive sites have a four-hex center clearance, roads three, and landmarks
eight from one another. Nearby small decorations are cleared around landmarks.
Statues use the nearest town's pantheon. Dry maps use sandstone ruins; cold and
dry maps exclude the lush trees and waterfalls. Waterfalls need a mountain cell
touching water, with both cells explored before the painting becomes visible.
Missing artwork is omitted. Existing and newly generated maps both use this
presentation layer. Terrain changes re-plan the scenery.

IMPORT
From the repository root:
node tools/assets/import_landmarks.mjs [absolute path to installed sharp package]

VERIFY
npx vitest run packages/presentation/test/landmarks.test.ts
npx playwright test --config playwright.landmarks.config.ts

The in-game folder contains ordinary saved games and screenshots from browser
verification. Use Load -> Import to try a save. Every map uses its own seed and
available terrain; not every landmark type appears on every map.
Interactive landmark update
===========================
New matches generate saved, visitable landmarks using the existing map-event parchment windows.
Existing saves retain their previous scenery; start a new match or import one of the visit-*.prsave.json examples in in-game/ to test.

Statues: +2 Attack in the next battle, one visit per hero per week.
Waterfalls: restore up to 15 mana, capped at maximum; one visit per hero per week. Full mana does not spend the visit.
Sacred trees: pay 500 gold for up to 500 XP (scenario cap applies), or 3 crystal for +2 Defense in the next battle. Choose one gift per hero per week.
Ruins: take 300 gold safely, or fight 12 local tier-II guardians for 1,500 gold and 3 crystal. One treasury globally; the battle reward requires victory. Retreat leaves the guardians and treasure in place.

Only one landmark blessing can be held at a time. It is consumed into the battle snapshot when the hero attacks or defends; it never permanently changes attributes. See the hero screen and reward receipt for the active blessing.
Placement is deterministic, respects existing sites/roads, and requires reachable land. Waterfalls appear only where the climate and a walkable cliff approach allow them. The waterfall test save authors a small cascade in Golden Fords, which has no suitable natural cliff.

Runtime state: world.landmarkSites, site.landmarkVisits, hero.landmarkBlessing.
Rules and save/load coverage: packages/rules/test/landmarks.test.ts.
Browser interaction and visual coverage: tests/e2e/landmarks.spec.ts.
