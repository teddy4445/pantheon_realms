PANTHEON REALMS - SIEGE VISUAL REVISION 2
2026-10-10

Project: C:\Users\lazeb\Desktop\pantheon_realms
Source artwork: C:\Users\lazeb\Desktop\pantheon_realms\assets-source\siege-v2
Runtime artwork and measured atlas frames: C:\Users\lazeb\Desktop\pantheon_realms\assets-runtime\siege-v2
Before/after review captures: C:\Users\lazeb\Desktop\blannder_models\siege-review-2026-10-10

This delivery covers Greek, Norse, Egyptian, Japanese, Celtic and Mesoamerican sieges.
For each pantheon there is a whole-view ground painting, a gate/tower/keep atlas with intact/damaged/rubble states, and a continuous wall atlas with the same three states. Shared moat, end caps and bridge complete the ground registration. There are 72 fortification state definitions, four ground-piece definitions and six background entries.

All raster art was generated with the built-in image generator. Exact prompts are in prompts.json, prompts-walls.json and the groundworks prompt text files. Source PNGs are retained at native resolution; the importer does not upscale, repaint, remove backgrounds or otherwise modify their pixels. It copies the files unchanged and measures alpha bounds for runtime texture frames.

The game is already wired to these assets. The UI's assets/manifest.ts overlays siege-v2/manifest.json on the previous environment and siege manifests. Original artwork remains available in its original directories. General art import commands do not overwrite the separate siege-v2 manifest.

Presentation changes:
- Whole-view backgrounds are framed around the complete battlefield, with no second camera squash or tiny-center magnification.
- Walls use a continuous painted surface with a shared world-space repeat phase. Individual cells retain their existing damageable structure IDs. Destroying a section switches it to its rubble art.
- Gate, towers and keep use measured atlas rectangles and consistent footprint registration.
- The road, moat and bridge derive their positions from the actual gate row, wall column and moat cells.
- Contact shadows anchor buildings; the view reserves more room for the keep.
- The siege grid is quieter. Structure health appears on hover or while damaged; the existing HUD still exposes every structure's status.
- Combat rules, targeting cells, movement costs, siege levels and save formats are unchanged.

Main implementation:
packages/presentation/src/siegeLayout.ts
packages/presentation/src/siegeScenery.ts
packages/presentation/src/battle.ts
packages/presentation/src/staticSprites.ts
packages/presentation/src/sprites.ts
packages/presentation/src/environmentArt.ts
packages/ui/src/assets/manifest.ts

Re-register assets after intentionally replacing a source atlas:
python tools/assets/import_siege_v2.py
This metadata-only importer needs Pillow, numpy and scipy. Review measured frames and ground anchors in the actual game after any regenerated atlas; generation does not guarantee exact grid placement.

Focused verification command:
npx vitest run packages/presentation/test/siegeScenery.test.ts packages/presentation/test/sprites.test.ts packages/rules/test/siege.test.ts packages/ui/test/groundArt.test.ts --maxWorkers=1

Normal development launch: npm run dev
Normal release build: npm run build, followed by the project's usual desktop packaging workflow if a new installed executable is wanted. This change updates source and runtime assets; it does not replace an installed executable.

Completed verification (2026-10-10):
- Core and client TypeScript checks passed.
- Architecture boundary check and git diff --check passed.
- 38 focused tests passed across siege scenery, sprites, siege rules and ground art.
- Final production Vite bundle passed (973 modules). Verification used copyPublicDir:false to avoid duplicating the entire runtime library; this verification output is not a standalone release package.
- All six pantheons captured in intact and mixed damage/breach configurations: 12 actual game screenshots, visually reviewed at 1600 x 1000.
- Source and runtime PNG copies match byte-for-byte.

Native asset dimensions: backgrounds and wall atlases 1536 x 1024; gate/tower/keep atlases 1254 x 1254; shared groundworks atlas 1536 x 1024. These are native generated paintings, not upscaled versions. They do not meet the earlier brief's 4096 x 3200 painting target; native delivery with documented resolution shortfalls was authorized.

Open the local screenshot gallery:
C:\Users\lazeb\Desktop\blannder_models\siege-review-2026-10-10\review.html
