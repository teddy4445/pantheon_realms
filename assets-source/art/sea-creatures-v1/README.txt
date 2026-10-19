PANTHEON REALMS — SEA-CREATURE DELIVERY

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
