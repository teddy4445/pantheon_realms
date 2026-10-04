# Pantheon Realms — Art Brief 11 for GPT-6: MAP HERO ANIMATIONS

Generated 2026-10-04 by `npm run art:briefs` (owner request: "a file for GPT-6 to make the map animations — moving, starting a battle, anything else needed — for all six hero types").

## What the map heroes have and what they still need

| Pantheon | Delivered | Still needed |
|---|---|---|
| Greek | idle (8 directions), walk (8 directions) | prepare, cast |
| Norse | idle (8 directions), walk (8 directions) | prepare, cast |
| Egyptian | idle (8 directions), walk (8 directions) | prepare, cast |
| Japanese | idle (8 directions), walk (8 directions) | prepare, cast |
| Celtic | idle (8 directions), walk (8 directions) | prepare, cast |
| Mesoamerican | idle (8 directions), walk (8 directions) | prepare, cast |

**Moving** (`walk`) and standing (`idle`) are delivered in all eight directions (the 2026-10-03 delivery) — nothing to paint. Two moments still use code-drawn motion only:

* **prepare — starting a battle.** When a hero attacks, it stops beside the enemy, turns toward it and readies itself before the battle screen opens (about 1.2 s). Today the rider only rises a little. The strip: the horse rears or stamps and tosses its head, the rider raises the weapon (or banner) high, then levels it toward the enemy and holds — 6 frames, played once, the last frame held until the battle opens.
* **cast — casting a map spell.** When a hero casts Far Sight, Fleet Foot, Homecoming or another map spell, a sigil glows at the hero. The strip: the rider lifts the free hand (or staff) and a soft light gathers in it and lifts away upward; the horse stands — 6 frames, played once. Paint only the gesture and a faint glow at the hand: the game draws each spell’s own effect.

The game plays a delivered `prepare` or `cast` strip automatically (no code change); until then it keeps the code-drawn motion.

## 1. Rules for every sheet

1. **One sheet per request**, at the size given (about 1.6 megapixels, the size GPT-6 has delivered so far) **or larger with the same proportions**. Save it under its exact file name in **`assets-source/sprites/sheets/`**.
2. **Invisible grid** of equal cells, filled left to right, rows top to bottom, exactly as listed. Every picture stays inside its own cell; nothing touches or crosses a cell edge. A cell marked *empty* stays empty.
3. **No text** of any kind: no letters, numbers, runes or glyphs that read as writing, no logos, signatures, watermarks, frames, grid lines or labels.
4. **Then:** `npm run sprites:cut -- --only <sheet name>` cuts that sheet (and only that one: the sheets already delivered keep their reviewed cuts) into its single files (a preview of each cut goes to `assets-source/sprites/sheets/_preview/` — check it), then the importer named in the sheet’s *Then* line. Nothing else changes: the game picks the files up by name.
5. **Too much for one image?** A sheet may come as two images split between rows, `<sheet>.part1.png` (upper rows) and `<sheet>.part2.png` (the rest), each with the same columns and cell shape.
6. **Style:** modern high-resolution painterly fantasy strategy art — the look of the pantheon boards and the game’s opening paintings. Not pixel art, not a photograph, not a 3D-render look, not anime, no ink outlines, no flat vector.
7. **Respect.** Gods and heroes of living and historical traditions are painted dignified and powerful — never comic, never horror; adults only, no gore, no nudity.

Each sheet (one per pantheon): **1920 × 800 px**, 12 columns × 5 rows of square cells (160 × 160). **Rows = directions** (east, north-east, north, south, south-east; the game mirrors east, north-east and south-east for west, north-west and south-west). **Cells 1–6: prepare; cells 7–12: cast.** A cell spans 2.13 map-hex widths, the same as the walk sheets: the ground point between the horse's feet at **88 % of the cell height**, centred; rider and horse about 60 % of the cell height, the same size in every cell. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). Elevated strategy-map camera about 35° above the horizon. Exactly the same rider, horse, armour, weapon and colours as the pantheon's delivered walk sheet. Cut into `sprite.hero.<pantheon>.<prepare|cast>.<direction>.png`; then `npm run sprites:import`.

### Greek mounted hero · `sheet.heroanim.greek.png`

| Field | Value |
|---|---|
| Rows | 1. east — facing right, side-on: prepare (6) + cast (6)<br>2. north-east — facing right and away from the viewer: prepare (6) + cast (6)<br>3. north — away from the viewer (we see the back): prepare (6) + cast (6)<br>4. south — toward the viewer (we see the front): prepare (6) + cast (6)<br>5. south-east — facing right and toward the viewer: prepare (6) + cast (6) |
| Image | 1920 × 800 px (or larger, same proportions) — 12 columns × 5 rows, cells 160 × 160 |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_31 PM-1.png` (top / front / side views — the design authority); `assets-source/sprites/sheets/sheet.hero.greek.png` (the delivered idle and walk sheet — match it exactly) |
| Cuts into | 10 strips: `sprite.hero.greek.prepare.<e|ne|n|s|se>.png`, `sprite.hero.greek.cast.<e|ne|n|s|se>.png` |
| Then | `npm run sprites:cut -- --only sheet.heroanim.greek`, then `npm run sprites:import` |

```text
Using the attached Greek mounted-hero sheets, create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1920 × 800 px (or larger, same proportions): an invisible grid of 12 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every frame stays inside its own cell; nothing touches or crosses a cell edge.
Each row is one direction: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — away from the viewer (we see the back); row 4: south — toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–6: PREPARE — readying for battle: the horse rears or stamps and tosses its head, the rider raises the weapon or banner high, then levels it forward and holds the ready pose (plays once; the last frame is held). Cells 7–12: CAST — the rider lifts the free hand or staff, a soft light gathers in it and lifts away upward, the horse stands still (plays once). Only a faint glow at the hand — no large spell effect.
The ground point between the horse's feet stands at 88% of the cell height, centred, in every frame; the same scale in every cell; rider and horse about 60% of the cell height. Elevated strategy-map camera about 35° above the horizon. Exactly the same rider, horse, armour, weapon and colours as the attached sheets.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### Norse mounted hero · `sheet.heroanim.norse.png`

| Field | Value |
|---|---|
| Rows | 1. east — facing right, side-on: prepare (6) + cast (6)<br>2. north-east — facing right and away from the viewer: prepare (6) + cast (6)<br>3. north — away from the viewer (we see the back): prepare (6) + cast (6)<br>4. south — toward the viewer (we see the front): prepare (6) + cast (6)<br>5. south-east — facing right and toward the viewer: prepare (6) + cast (6) |
| Image | 1920 × 800 px (or larger, same proportions) — 12 columns × 5 rows, cells 160 × 160 |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_33 PM-2.png` (top / front / side views — the design authority); `assets-source/sprites/sheets/sheet.hero.norse.png` (the delivered idle and walk sheet — match it exactly) |
| Cuts into | 10 strips: `sprite.hero.norse.prepare.<e|ne|n|s|se>.png`, `sprite.hero.norse.cast.<e|ne|n|s|se>.png` |
| Then | `npm run sprites:cut -- --only sheet.heroanim.norse`, then `npm run sprites:import` |

```text
Using the attached Norse mounted-hero sheets, create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1920 × 800 px (or larger, same proportions): an invisible grid of 12 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every frame stays inside its own cell; nothing touches or crosses a cell edge.
Each row is one direction: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — away from the viewer (we see the back); row 4: south — toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–6: PREPARE — readying for battle: the horse rears or stamps and tosses its head, the rider raises the weapon or banner high, then levels it forward and holds the ready pose (plays once; the last frame is held). Cells 7–12: CAST — the rider lifts the free hand or staff, a soft light gathers in it and lifts away upward, the horse stands still (plays once). Only a faint glow at the hand — no large spell effect.
The ground point between the horse's feet stands at 88% of the cell height, centred, in every frame; the same scale in every cell; rider and horse about 60% of the cell height. Elevated strategy-map camera about 35° above the horizon. Exactly the same rider, horse, armour, weapon and colours as the attached sheets.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### Egyptian mounted hero · `sheet.heroanim.egyptian.png`

| Field | Value |
|---|---|
| Rows | 1. east — facing right, side-on: prepare (6) + cast (6)<br>2. north-east — facing right and away from the viewer: prepare (6) + cast (6)<br>3. north — away from the viewer (we see the back): prepare (6) + cast (6)<br>4. south — toward the viewer (we see the front): prepare (6) + cast (6)<br>5. south-east — facing right and toward the viewer: prepare (6) + cast (6) |
| Image | 1920 × 800 px (or larger, same proportions) — 12 columns × 5 rows, cells 160 × 160 |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_35 PM-3.png` (top / front / side views — the design authority); `assets-source/sprites/sheets/sheet.hero.egyptian.png` (the delivered idle and walk sheet — match it exactly) |
| Cuts into | 10 strips: `sprite.hero.egyptian.prepare.<e|ne|n|s|se>.png`, `sprite.hero.egyptian.cast.<e|ne|n|s|se>.png` |
| Then | `npm run sprites:cut -- --only sheet.heroanim.egyptian`, then `npm run sprites:import` |

```text
Using the attached Egyptian mounted-hero sheets, create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1920 × 800 px (or larger, same proportions): an invisible grid of 12 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every frame stays inside its own cell; nothing touches or crosses a cell edge.
Each row is one direction: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — away from the viewer (we see the back); row 4: south — toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–6: PREPARE — readying for battle: the horse rears or stamps and tosses its head, the rider raises the weapon or banner high, then levels it forward and holds the ready pose (plays once; the last frame is held). Cells 7–12: CAST — the rider lifts the free hand or staff, a soft light gathers in it and lifts away upward, the horse stands still (plays once). Only a faint glow at the hand — no large spell effect.
The ground point between the horse's feet stands at 88% of the cell height, centred, in every frame; the same scale in every cell; rider and horse about 60% of the cell height. Elevated strategy-map camera about 35° above the horizon. Exactly the same rider, horse, armour, weapon and colours as the attached sheets.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### Japanese mounted hero · `sheet.heroanim.japanese.png`

| Field | Value |
|---|---|
| Rows | 1. east — facing right, side-on: prepare (6) + cast (6)<br>2. north-east — facing right and away from the viewer: prepare (6) + cast (6)<br>3. north — away from the viewer (we see the back): prepare (6) + cast (6)<br>4. south — toward the viewer (we see the front): prepare (6) + cast (6)<br>5. south-east — facing right and toward the viewer: prepare (6) + cast (6) |
| Image | 1920 × 800 px (or larger, same proportions) — 12 columns × 5 rows, cells 160 × 160 |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_37 PM-4.png` (top / front / side views — the design authority); `assets-source/sprites/sheets/sheet.hero.japanese.png` (the delivered idle and walk sheet — match it exactly) |
| Cuts into | 10 strips: `sprite.hero.japanese.prepare.<e|ne|n|s|se>.png`, `sprite.hero.japanese.cast.<e|ne|n|s|se>.png` |
| Then | `npm run sprites:cut -- --only sheet.heroanim.japanese`, then `npm run sprites:import` |

```text
Using the attached Japanese mounted-hero sheets, create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1920 × 800 px (or larger, same proportions): an invisible grid of 12 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every frame stays inside its own cell; nothing touches or crosses a cell edge.
Each row is one direction: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — away from the viewer (we see the back); row 4: south — toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–6: PREPARE — readying for battle: the horse rears or stamps and tosses its head, the rider raises the weapon or banner high, then levels it forward and holds the ready pose (plays once; the last frame is held). Cells 7–12: CAST — the rider lifts the free hand or staff, a soft light gathers in it and lifts away upward, the horse stands still (plays once). Only a faint glow at the hand — no large spell effect.
The ground point between the horse's feet stands at 88% of the cell height, centred, in every frame; the same scale in every cell; rider and horse about 60% of the cell height. Elevated strategy-map camera about 35° above the horizon. Exactly the same rider, horse, armour, weapon and colours as the attached sheets.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### Celtic mounted hero · `sheet.heroanim.celtic.png`

| Field | Value |
|---|---|
| Rows | 1. east — facing right, side-on: prepare (6) + cast (6)<br>2. north-east — facing right and away from the viewer: prepare (6) + cast (6)<br>3. north — away from the viewer (we see the back): prepare (6) + cast (6)<br>4. south — toward the viewer (we see the front): prepare (6) + cast (6)<br>5. south-east — facing right and toward the viewer: prepare (6) + cast (6) |
| Image | 1920 × 800 px (or larger, same proportions) — 12 columns × 5 rows, cells 160 × 160 |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_39 PM-5.png` (top / front / side views — the design authority); `assets-source/sprites/sheets/sheet.hero.celtic.png` (the delivered idle and walk sheet — match it exactly) |
| Cuts into | 10 strips: `sprite.hero.celtic.prepare.<e|ne|n|s|se>.png`, `sprite.hero.celtic.cast.<e|ne|n|s|se>.png` |
| Then | `npm run sprites:cut -- --only sheet.heroanim.celtic`, then `npm run sprites:import` |

```text
Using the attached Celtic mounted-hero sheets, create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1920 × 800 px (or larger, same proportions): an invisible grid of 12 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every frame stays inside its own cell; nothing touches or crosses a cell edge.
Each row is one direction: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — away from the viewer (we see the back); row 4: south — toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–6: PREPARE — readying for battle: the horse rears or stamps and tosses its head, the rider raises the weapon or banner high, then levels it forward and holds the ready pose (plays once; the last frame is held). Cells 7–12: CAST — the rider lifts the free hand or staff, a soft light gathers in it and lifts away upward, the horse stands still (plays once). Only a faint glow at the hand — no large spell effect.
The ground point between the horse's feet stands at 88% of the cell height, centred, in every frame; the same scale in every cell; rider and horse about 60% of the cell height. Elevated strategy-map camera about 35° above the horizon. Exactly the same rider, horse, armour, weapon and colours as the attached sheets.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### Mesoamerican mounted hero · `sheet.heroanim.mesoamerican.png`

| Field | Value |
|---|---|
| Rows | 1. east — facing right, side-on: prepare (6) + cast (6)<br>2. north-east — facing right and away from the viewer: prepare (6) + cast (6)<br>3. north — away from the viewer (we see the back): prepare (6) + cast (6)<br>4. south — toward the viewer (we see the front): prepare (6) + cast (6)<br>5. south-east — facing right and toward the viewer: prepare (6) + cast (6) |
| Image | 1920 × 800 px (or larger, same proportions) — 12 columns × 5 rows, cells 160 × 160 |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_48 PM-6.png` (top / front / side views — the design authority); `assets-source/sprites/sheets/sheet.hero.mesoamerican.png` (the delivered idle and walk sheet — match it exactly) |
| Cuts into | 10 strips: `sprite.hero.mesoamerican.prepare.<e|ne|n|s|se>.png`, `sprite.hero.mesoamerican.cast.<e|ne|n|s|se>.png` |
| Then | `npm run sprites:cut -- --only sheet.heroanim.mesoamerican`, then `npm run sprites:import` |

```text
Using the attached Mesoamerican mounted-hero sheets, create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1920 × 800 px (or larger, same proportions): an invisible grid of 12 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every frame stays inside its own cell; nothing touches or crosses a cell edge.
Each row is one direction: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — away from the viewer (we see the back); row 4: south — toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–6: PREPARE — readying for battle: the horse rears or stamps and tosses its head, the rider raises the weapon or banner high, then levels it forward and holds the ready pose (plays once; the last frame is held). Cells 7–12: CAST — the rider lifts the free hand or staff, a soft light gathers in it and lifts away upward, the horse stands still (plays once). Only a faint glow at the hand — no large spell effect.
The ground point between the horse's feet stands at 88% of the cell height, centred, in every frame; the same scale in every cell; rider and horse about 60% of the cell height. Elevated strategy-map camera about 35° above the horizon. Exactly the same rider, horse, armour, weapon and colours as the attached sheets.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

## Checklist

* Six sheets named exactly as above, transparent, 12 frames per row, the same hero as the walk sheet.
* `npm run sprites:cut -- --only <sheet name>` for each new sheet (check the previews: each strip re-aligned on the horse’s feet), then `npm run sprites:import`.
