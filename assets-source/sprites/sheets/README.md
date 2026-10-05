# GPT-6 sheets go here

Save every new sheet (from a GPT-6 brief, or from `GPT6_2D_CONTENT_GENERATION.md`
written by `npm run sprites:queue` for new content) in this folder under its
exact name (for example `sheet.creature.greek.tier1.base.png`, or
`<name>.part1.png` + `<name>.part2.png` for a sheet delivered in two row
ranges). Then:

```
npm run sprites:cut -- --only <sheet>   # cut one new or corrected sheet; check _preview/
npm run sprites:import   # bring the cut sprites into the game
npm run icons:import     # portraits (from portrait sheets)
npm run sprites:queue    # refresh the queue: delivered sheets drop out
```

The layout of every sheet is in `../sheet-layouts*.json` (`sheet-layouts.json`
from `npm run sprites:queue`, `.briefs.json` and `.brief12.json` from the art
briefs). The sheets already cut before 2026-10-05 were removed in the release
clean-up (git history keeps them); the Brief 12 sheets stay for corrections. `cut-log.json` records what each sheet produced;
a sheet is cut again only when it changes. `_preview/` is regenerated and not
committed. Details: `ASSET_PIPELINE.md` §4.
