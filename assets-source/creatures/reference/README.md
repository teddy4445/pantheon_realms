# Creature model reference views

Model-reference images for the later 3D step (image-to-3D and modelling),
delivered from `assets-source/art/briefs/GPT6_BRIEF_5_CREATURES.md`:
four views per creature form, named

    creature.<pantheon>.tier<N>.<base|upgraded>.ref.<threequarter|front|side|top>.png
    creature.neutral.<family>.<base|upgraded>.ref.<view>.png

1024 × 1024 PNG, transparent background, neutral A-pose / standing pose,
even studio light. The game never reads this folder; nothing here is packaged.
The matching painted portraits (`creature.….portrait.png`) go into
`assets-source/icons/final/` and are imported with `npm run icons:import`.

## Delivered so far (partial delivery, 2026-10-03)

Forms 001–043 of the brief's 102: every Greek and Norse and Egyptian form and
the Japanese Kitsune (base) — **172 reference views** here and **43 portraits**
in `assets-source/icons/final/` (imported into the game). Checked against the
delivery's `DELIVERY_MANIFEST.csv`: 215 of 215 SHA-256 match. Form 044 (the
Nine-Tailed Kitsune) exists only as an unfinished draft outside the game and
is not delivered; 294 requested images (forms 044–102) are still to come.

What to know before modelling (from the delivery's own notes, copied to
`delivery-notes/` — `review-notes.json` per form, `DESIGN_DECISIONS.txt`):

* Native size **1254 × 1254** (the brief asked 1024); kept as delivered, not resized.
* These are **painted concept views, not exact orthographic renders**: side and
  top views differ from the master in projection, margins and ornament
  placement. The **three-quarter master governs the design**; reconcile the
  other views against it.
* **Egyptian tier 2 and tier 5 need separate base and upgrade skeletons:** the
  pantheon board shows a four-legged Jackal Guardian and an upright Anubian
  Warden, a four-legged Crocodile Beast and an upright Sobek Warbeast. The brief
  asked one skeleton per family; the board's precedence was followed. This is an
  open owner decision (keep the board's body plans, or redesign so each pair
  shares one).
* Board design over the brief's text in a few places (the Draugr carries a
  sword, not an axe; the World-Serpent Wyrm is blue-violet, not sea-green; the
  Bennu is red, orange and gold, not grey-gold) — listed per form in
  `review-notes.json`.
