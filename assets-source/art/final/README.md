# Delivered painted art

Put generated images here, each named exactly as its asset ID plus `.png`
(for example `hero.norse.hervor.bust.png`, `terrain.temperate.plains.png`,
`intervention.favorable_winds.card.png`). The full list of names, sizes and
descriptions is in `assets-source/art/briefs/` and `ASSET_PIPELINE.md` §13.

Story art (Brief 1) is imported with `npm run art:import`, which writes the
runtime copies to `assets-runtime/art/` and `IMPORT_REPORT.json` next to this
folder. The PNGs here are the masters and are never modified.
