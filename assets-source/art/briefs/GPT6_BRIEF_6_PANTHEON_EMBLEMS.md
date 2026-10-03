# Pantheon Realms — Art Brief 6 for GPT-6: PANTHEON EMBLEMS

**What this file is.** A production brief for the **six pantheon emblems** —
the small crest that stands for a pantheon everywhere in the game. Today the
game draws a temporary stand-in (a dark disc with a thin gold line glyph,
generated in code); these six images replace it on every screen at once.

**Who reads it.** GPT-6 (the image generator) and the person running it. Read
sections 1–3 once; section 4 has one entry per emblem.

**Files.** Six PNG files, one per pantheon, named exactly as in section 4.

---

## 0. Where the emblems appear (why they must read when tiny)

The same image is shown at very different sizes (measured on a 1600 × 900
window; larger windows scale up):

| Where | Shown at |
|---|---|
| End-of-game summary and high-score tables (next to a player's name) | **17–19 px** |
| Rival picker chips (skirmish setup), hero screen title row | **21 px** |
| Pantheon screen header | 32 px |
| Random-map empire rows | 35 px |
| Encyclopedia section dividers (inside a round gold medallion) | 40 px |
| Pantheon cards (New Game → pantheon choice) | 48 px |
| World dialogs (a pantheon's god or shrine) | 60 px |
| Pantheon detail panel (setup) | 67 px |

So each emblem must be **recognisable at 18 px** (one bold silhouette, one
bold symbol) and still look rich at 70 px and above.

---

## 1. How to work (rules for every emblem)

1. **One emblem per request.** Square canvas **1024 × 1024 px**, PNG, sRGB,
   **transparent background** (real alpha — no white or checkerboard).
2. **Name the file exactly** as written in section 4. The game finds the image
   by this name.
3. **Composition:** a single crest centred on the canvas, filling **88–92 %**
   of it (about 45–60 px of empty margin on every side). Nothing touches the
   edges. Front view, perfectly upright, symmetric unless the entry says not.
4. **No text of any kind** — no letters, runes, hieroglyphs, kanji, ogham,
   numbers, logos or signatures. Patterns may suggest a script; they must not
   be readable.
5. **Readable when tiny:** one strong outer silhouette (each pantheon has its
   own shape, below), one bold central symbol, high contrast between symbol
   and field. Fine detail (engraving, enamel texture, small beads) is welcome
   but must not change the silhouette.
6. **A dark outer edge:** a thin dark-bronze outline (about 1.5 % of the
   width) all around the crest, so it reads on both the game's dark navy panels
   and on bright paintings.
7. **No cast shadow, glow halo or floor** outside the crest — the game places
   it on many backgrounds. Glow inside the crest is fine.
8. **Respectful.** Sacred symbols are shown with dignity; no skulls, blood or
   weapons dripping, no caricature.

**Test before delivering:** shrink the image to 24 × 24 px and to 64 × 64 px
on a dark navy background (`#0b1626`) and on a light parchment background
(`#efe6d2`). At 24 px you must still tell all six apart by shape and colour
alone.

---

## 2. Reference images to attach

| # | File in the project folder | Use it for |
|---|---|---|
| R1 | `assets-source/ui/sheets/resource-status-icon-pack.png` | **the target icon style**: polished gold metalwork, navy and coloured enamel, crisp edges |
| R2 | `assets-runtime/ui/icons/final/` (any few, e.g. `icon.artifact.boar_crest_helm.png`, `icon.spell.ward.png`) | the finished in-game icons the emblems sit next to |
| R3 | `assets-source/ui/frames/intro-frame.png`, `assets-source/ui/branding/full-logo.png` | the game's gold-and-navy ornament |
| R4 | `assets-source/art/final/banner.level_up.<pantheon>.png` | **each pantheon's ornament language** (the level-up banners already show it in metalwork) |
| R5 | `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` … `03_35_45 PM-6.png` | the pantheon boards (Greek, Norse, Egyptian, Japanese, Celtic, Mesoamerican) |

If you can attach only a few: **R1, R4 of the pantheon you are drawing, and R3.**

---

## 3. Style bible

**Medium.** A painted game crest: sculpted, polished **gold metalwork** with
**enamel fields**, lit from the **top left**, soft specular highlights on the
gold, slight bevel. Same family as the game's icon pack (R1) — not a flat
vector logo, not a photo, not a 3D render with plastic shading.

**Palette.** Each crest has: a gold rim and symbol (`#C29A52` → `#F5E4B7`
highlights, `#7A5A26` shadows), one field colour (the pantheon's main colour)
and at most one accent colour. Keep the field colour strong and saturated —
it is how the player tells pantheons apart at 18 px.

**Six different silhouettes** (most important rule after "no text"):

| Pantheon | Outer shape | Field colour | Central symbol |
|---|---|---|---|
| Greek | round hoplite shield | royal blue `#1F3F8F` (game accent `#3b73d9`) | thunderbolt |
| Norse | upright rune-stone slab, rounded top | night navy `#1B2A44` with steel silver | Thor's hammer |
| Egyptian | upright cartouche (tall oval on a bar) | lapis blue `#1F4FA0` with sand gold | ankh under a sun disc |
| Japanese | five-sided ema votive plaque | black lacquer `#1A1414` | vermilion torii and rising sun |
| Celtic | three-lobed knotwork trefoil | forest green `#2F5D34` | triskele spiral |
| Mesoamerican | stepped diamond (step-fret frame) | turquoise `#1AA39A` with crimson | feathered-serpent head |

---

## 4. The six emblems

All files go into the project folder **`assets-source/icons/final/`**.

### 4.1 `emblem.greek.png` — Greek · *Glory & Champions*

A **round hoplite shield (aspis)** seen straight on. Broad polished gold rim
engraved with a continuous **meander (Greek key)** band. The field is deep
royal-blue enamel. In the centre, a bold **golden thunderbolt** — the
zig-zag bolt of Zeus with flared, flame-like ends, placed vertically and
slightly diagonal (top right to bottom left) — framed by a thin **laurel
wreath** of gold leaves that follows the inside of the rim. A small
marble-white highlight on the bolt's edges.
*Silhouette:* a perfect circle. *At 18 px:* blue disc, gold ring, gold bolt.

### 4.2 `emblem.norse.png` — Norse · *Fate & Battle*

An **upright rune-stone slab** (taller than wide, about 4 : 5, gently
rounded top, flat bottom) carved from dark stone and banded with **steel and
gold**; its face is night-navy enamel with a faint aurora-teal shimmer
(`#3FD6B0`) near the top. In the centre, a bold **Mjölnir (Thor's hammer)**
in polished steel with gold inlay, head up, short handle with a ring at its
end. Around it, a thin interlaced **knotwork** border carved into the stone
(no readable runes).
*Silhouette:* a tombstone-like upright slab. *At 18 px:* dark slab, silver
hammer.

### 4.3 `emblem.egyptian.png` — Egyptian · *Afterlife & Resurrection*

An upright **cartouche** — a tall oval loop of gold rope-like metal resting on
a short horizontal bar at its base. The field inside is **lapis-blue** enamel
with fine gold flecks. In the centre, a bold **golden ankh**; above it, a
small **sun disc** in carnelian red (`#A3262A`) with a thin gold ring. Two
small stylised **wings** may spread from the sun disc inside the oval (they
must not leave the cartouche).
*Silhouette:* a tall oval on a foot. *At 18 px:* blue oval, gold ankh, red dot.

### 4.4 `emblem.japanese.png` — Japanese · *Spirits & Harmony*

A **five-sided ema votive plaque** (a wide pentagon: flat bottom, straight
sides, a gently pitched "roof" top) in **black lacquer** with a gold edge and
a tiny gold cord knot at the top centre. On it, a bold **vermilion torii gate**
(`#C0262D`) seen straight on, standing before a large **rising sun** disc in
warm gold-white. A few **cherry petals** (`#F2A7C3`) drift across the lower
corners — small, never covering the gate.
*Silhouette:* a house-shaped pentagon. *At 18 px:* black plaque, red gate,
pale sun.

### 4.5 `emblem.celtic.png` — Celtic · *Nature & Transformation*

A **three-lobed trefoil** made of interlaced gold **knotwork** bands (a
triquetra-like outline whose three round lobes give the crest its shape). The
field inside is **forest-green** enamel with a hint of woad blue at the
centre. In the centre, a bold **triskele** — three gold spirals turning
clockwise from one point. Optional: two tiny oak leaves where the lobes meet.
*Silhouette:* a rounded three-leaf clover. *At 18 px:* green trefoil, gold
spiral.

### 4.6 `emblem.mesoamerican.png` — Mesoamerican · *Ritual & Sacrifice*

A **diamond (a square turned 45°)** whose border is a stepped **step-fret
(xicalcoliuhqui)** frame in gold, with a thin inner band of **crimson**
enamel (`#B3262B`). The field is **turquoise** mosaic enamel (`#1AA39A`). In
the centre, the bold profile head of a **feathered serpent** (Quetzalcoatl)
facing left, in gold with **quetzal-green** feathers (jade `#2E9E5B`) forming
a crest behind its head. Calm and noble, mouth closed or slightly open — no
blood, no hearts, no sacrifice imagery (the pantheon's name for its theme is
told in the game's words, not in the emblem).
*Silhouette:* a diamond with stepped edges. *At 18 px:* turquoise diamond,
gold serpent head, green plume.

---

## 5. Delivery checklist (6 files)

```
assets-source/icons/final/emblem.greek.png
assets-source/icons/final/emblem.norse.png
assets-source/icons/final/emblem.egyptian.png
assets-source/icons/final/emblem.japanese.png
assets-source/icons/final/emblem.celtic.png
assets-source/icons/final/emblem.mesoamerican.png
```

- [ ] 1024 × 1024 PNG, sRGB, real transparency outside the crest
- [ ] crest centred, 88–92 % of the canvas, nothing touches the edges
- [ ] six different silhouettes (circle, slab, cartouche, pentagon, trefoil, diamond)
- [ ] no text, runes, hieroglyphs, kanji, ogham or numbers
- [ ] thin dark outline all around; no cast shadow or glow outside the crest
- [ ] all six tell apart at 24 × 24 px on navy and on parchment

## 6. Bringing them into the game (for the developer)

Run `npm run icons:import`. The importer checks each name against the icon
catalog, scales the image to 256 × 256 (never up) and registers it in
`assets-runtime/ui/final-manifest.json`; the game's `Emblem` component then
shows it on every screen listed in section 0 instead of the generated stand-in
(no code change). Then run `npm run icons:catalog` so ICON_CATALOG.md shows
the emblems as final art.
