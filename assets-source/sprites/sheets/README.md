# GPT-6 sheets go here

Save every sheet from `GPT6_2D_CONTENT_GENERATION.md` in this folder under its
exact name (for example `sheet.creature.greek.tier1.base.png`, or
`<name>.part1.png` + `<name>.part2.png` for a sheet delivered in two row
ranges). Then:

```
npm run sprites:cut      # cut new or changed sheets; check _preview/ (one image per sheet)
npm run sprites:import   # bring the cut sprites into the game
npm run icons:import     # portraits (from portrait sheets)
npm run sprites:queue    # refresh the queue: delivered sheets drop out
```

The layout of every sheet is in `../sheet-layouts.json` (written by
`npm run sprites:queue`). `cut-log.json` records what each sheet produced;
a sheet is cut again only when it changes. `_preview/` is regenerated and not
committed. Details: `ASSET_PIPELINE.md` §4.
