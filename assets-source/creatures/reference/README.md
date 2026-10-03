# Creature canonical reference views

Canonical reference images for each creature form — the drawing masters for
its 2D animation strips (`GPT6_2D_CONTENT_GENERATION.md`) — delivered from `assets-source/art/briefs/GPT6_BRIEF_5_CREATURES.md`:
four views per creature form, named

    creature.<pantheon>.tier<N>.<base|upgraded>.ref.<threequarter|front|side|top>.png
    creature.neutral.<family>.<base|upgraded>.ref.<view>.png

1024 × 1024 PNG, transparent background, neutral A-pose / standing pose,
even studio light. The game never reads this folder at run time and nothing
here is packaged; `npm run sprites:placeholders` cuts the placeholder battle
stills of the delivered forms from the three-quarter views.
The matching painted portraits (`creature.….portrait.png`) go into
`assets-source/icons/final/` and are imported with `npm run icons:import`.

## Delivered so far (partial delivery, 2026-10-03)

Forms 001–043 of the brief's 102: every Greek and Norse and Egyptian form and
the Japanese Kitsune (base) — **172 reference views** here and **43 portraits**
in `assets-source/icons/final/` (imported into the game). Checked against the
delivery's `DELIVERY_MANIFEST.csv`: 215 of 215 SHA-256 match. Form 044 (the
Nine-Tailed Kitsune) exists only as an unfinished draft outside the game and
is not delivered; 294 requested images (forms 044–102) are still to come.

What to know before drawing the strips (from the delivery's own notes, copied
to `delivery-notes/` — `review-notes.json` per form, `DESIGN_DECISIONS.txt`).
Those two files are the delivery's unaltered records (their hashes are in the
delivery manifest); they were written for the modelling step that the 2D
migration of 2026-10-03 replaced, so their words "skeleton" and "3D
reconstruction" are **obsolete** — read "one motion design shared by base and
upgrade" and "drawing the strips" instead.

* Native size **1254 × 1254** (the brief asked 1024); kept as delivered, not resized.
* These are **painted concept views, not exact orthographic renders**: side and
  top views differ from the master in projection, margins and ornament
  placement. The **three-quarter master governs the design**; reconcile the
  other views against it.
* **Egyptian tier 2 and tier 5 change body plan on upgrade:** the pantheon
  board shows a four-legged Jackal Guardian and an upright Anubian Warden, a
  four-legged Crocodile Beast and an upright Sobek Warbeast. The brief asked
  each pair to share one body plan (one motion design for both forms); the
  board's precedence was followed. In 2D each form gets its own strips anyway,
  so this costs a second motion design per pair, not a technical problem. It
  remains an open owner decision (keep the board's body plans, or redesign so
  each pair shares one).
* Board design over the brief's text in a few places (the Draugr carries a
  sword, not an axe; the World-Serpent Wyrm is blue-violet, not sea-green; the
  Bennu is red, orange and gold, not grey-gold) — listed per form in
  `review-notes.json`.
