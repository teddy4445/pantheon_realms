# Pantheon Realms — Art Brief 15 for GPT-6: SIEGES (walls, gates, towers, keeps, the town and the catapult)

_Written 2026-10-05 after the owner's play-test: the walls, watchtowers and town in siege battles look poor, and the catapult needs a visible throw. Today one shared set of twelve small stills (front-facing wall blocks stacked in a column) serves every town. This brief asks for each pantheon's own fortification, a painted siege battlefield per pantheon with the town's streets, and the attackers' catapult with a throwing animation. The game already looks these files up by name: when they arrive, the siege shows them without a code change._


**Status (2026-10-05): delivered and in the game** — Parts A–C (the catapult and its throw, 72 fortification pieces, six siege battlefields). Accepted resolution exception: the battlefields are native 1419 × 1108 (Celtic 1419 × 1109), below the 4096 × 3200 asked; not enlarged. Each painting's ditch and crossing are aligned on screen by a measured shift (`SIEGE_GROUND_SHIFT`, ASSET_PIPELINE.md §14).

## At a glance

| Part | What | Files | Size | Priority |
|---|---|---|---|---|
| A | The attackers' catapult: a still and its throw | 2 | 512 × 512 still; strip of 8 frames of 512 × 512 | **high** |
| B | Fortification pieces per pantheon: wall, gate, tower, keep × intact, damaged, rubble | 12 per pantheon, 72 in all | 512 × 512 (keep 768 × 768), transparent | **high** — start with Greek, approve, then the others |
| C | Siege battlefield per pantheon (the field, the moat line and the town's streets) | 6 | 4096 × 3200, opaque | medium |

Attach to every request: `assets-source/art/briefs/guides/siege.layout.png` (the board as the game lays it out, explained in §2) and, for style, the pantheon's map town sprite `assets-runtime/sprites/final/sites/map.site.town.<pantheon>.webp` and the pantheon's town background `assets-runtime/placeholders/town/<pantheon>/background.jpg`.

## 1. Rules for every image

* **Look.** The game's painted sprite style: crisp painted forms, warm light from the upper left, a soft cool shadow side, readable silhouettes, slightly stylised proportions — like the delivered creature and map-site sprites. Not photographic, not pixel art, not flat vector.
* **Camera.** The battle camera looks north across the field from above at about 45°, flattened to 74 % in depth (see the guide). The attackers come from the **west (left)**; the town lies **east (right)** of the wall.
* **Transparent background** for Parts A and B (no ground plate, no shadow baked under the piece — the game draws its own soft shadow). Part C is an opaque painting.
* **No text, letters, runes, logos, banners with emblems or watermarks.** Plain cloth banners in the pantheon's colour are fine.
* **One file per asset**, named exactly as listed, PNG, sRGB. Never enlarge a smaller image to reach the size.

## 2. The layout guide (`siege.layout.png`)

Drawn at a third of sprite scale (80 px per hex width; sprites use **240 px per hex width**). Green hexes: the field (attackers deploy on the left). Blue hexes: the moat (column 9, open at the gate's row). Grey hexes: inside the town. The **white boxes** on one straight vertical line are the wall pieces, one per row (11 rows); the **red box** is the gate (middle row); the **yellow boxes** at both ends are where a level-3 town has towers (a smaller town has wall pieces there). The **light-blue frame** is one 512 × 512 wall piece drawn to scale with its footprint centre (dot). The **orange frame** is the keep's 768 × 768 frame beyond the east edge, the **violet frame** the catapult's 512 × 512 frame west of the field (dots: ground points).

The wall line is straight: each piece stands **one row (154 px at sprite scale) below the one before it**. A piece must therefore join the pieces above and below without a gap: its masonry runs off the top and the bottom of its footprint into the neighbours.

## Part A — The catapult (2 files)

| File | What |
|---|---|
| `assets-source/sprites/final/sprite.battle.siege.catapult.intact.png` | 512 × 512, the catapult at rest: a wooden siege catapult (onager) on four wheels, its throwing arm pulled back and lying low over the frame, a round stone in the arm's cup. Faces **right** (it throws to the east). Ground (bottom of the wheels) at **95 %** of the height, the machine about 1.6 hexes long (≈ 380 px). Neutral: dark weathered timber, iron bands and rivets, rope; no pantheon ornament. |
| `assets-source/sprites/final/sprite.fx.siege.catapult.throw.png` | The throw: **8 frames of 512 × 512 side by side (4096 × 512)**, exactly the same framing, size and ground line as the still. 1 at rest (= the still), 2 the arm pulled a little further back, 3–4 the arm whipping up, 5 the arm slamming upright against the padded crossbar, the stone leaving the cup toward the upper right, 6 the arm shaking upright, cup empty, 7–8 the arm settling halfway back. The stone leaves the frame in frame 5 (the game draws its flight). The whole machine jolts a little in 5–6. |

The game plays the strip at 12 frames a second where the catapult stands and draws the stone flying to the wall it hits; while no strip exists it draws a simple machine of its own.

## Part B — Fortifications per pantheon (12 files each)

For each pantheon `<p>` (greek, norse, egyptian, japanese, celtic, mesoamerican), save into `assets-source/sprites/final/`:

| Piece | Files (`<state>` = intact, damaged, rubble) | Frame | Ground point |
|---|---|---|---|
| Wall | `sprite.battle.siege.wall.<state>.<p>.png` | 512 × 512 | centre of the footprint at **68 %** of the height (y = 348) |
| Gate | `sprite.battle.siege.gate.<state>.<p>.png` | 512 × 512 | 68 % |
| Tower | `sprite.battle.siege.tower.<state>.<p>.png` | 512 × 512 | 68 % |
| Keep | `sprite.battle.siege.keep.<state>.<p>.png` | 768 × 768 | bottom of the walls at **95 %** |

**Wall.** A straight stretch of curtain wall seen from the attackers' side: it runs **from the top of the frame to the bottom** (away from the viewer, north–south), about 0.5 hex thick (≈ 120 px), its battlements and the face that looks west (left) toward the attackers visible, the walkway on top. Its footprint is one row long (154 px) around the ground point, but the masonry continues **straight up out of the top edge and down out of the bottom edge of the footprint** so that eleven pieces stacked 154 px apart read as one continuous wall. Battlements stand about 200 px above the footprint. Damaged: cracks, missing merlons, scorch, a few fallen stones at its foot — still standing. Rubble: a low heap of broken masonry and timber in the same footprint (≈ 60 px high), still joining its neighbours' line at the ground.

**Gate.** The same wall with the town gate in it: a gatehouse slightly wider and taller than the wall, the gate doors facing **west** (left), a short bridge or causeway over the moat on the left. Damaged: doors splintered and sagging. Rubble: the gatehouse fallen, the opening choked with debris.

**Tower.** The corner and flank tower that caps each end of the wall line on a level-3 town: taller (up to the frame's top), wider than the wall (≈ 1 hex), with arrow slits facing west and a lookout on top; the wall joins it from above or below. Damaged and rubble as for the wall.

**Keep.** The citadel behind the walls, east of the field: the town's strongest building, about 2.5 hexes wide, seen at the same camera angle; its door faces west toward the field. Damaged: breached upper floor, fire. Rubble: a burnt-out stump with fallen stones.

Each pantheon's set should look like **its own town** (attach its town background and map-site town sprite):

| Pantheon | Materials and shapes |
|---|---|
| Greek | white and cream limestone ashlar, blue-painted wooden doors with bronze studs, red terracotta roof tiles on towers and keep, a small temple pediment over the gate |
| Norse | dark grey fieldstone base with a tall timber palisade above, carved dragon-head gables, shingle roofs with snow on the ledges, iron-banded doors |
| Egyptian | sandstone and mudbrick with a battered (sloping) face, painted lotus columns at the gate, pylons flanking the doors, palm-trunk beams |
| Japanese | massive curved stone base (like castle walls), white plaster walls with dark timber, grey tiled roofs with upturned eaves, a two-storey gate tower |
| Celtic | earthwork rampart faced with dry-stone, timber palisade and walkway on top, round towers with thatched conical roofs, carved spiral posts at the gate |
| Mesoamerican | stepped grey-white limestone with red and turquoise painted bands, stepped merlons, a corbel-arched gate, jade and feather ornaments on the keep |

## Part C — Siege battlefields per pantheon (6 files)

`assets-source/art/final/battlefield.siege.ground.<p>.png` — **4096 × 3200**, opaque, like the delivered battlefields (`assets-runtime/art/battle/`): one painting seen at the battle camera's angle, image top = the far (north) side. The game fits the 15 × 11 board inside the quiet middle: the board spans **x 1298–2798, y 1158–2042**. Within it:

* **x 0 – 2190** — open ground before the town where the attackers come: trampled grass, a road leading to the gate, the town's climate; quiet enough that creatures read clearly.
* **x ≈ 2190 – 2290** — the moat ditch running north–south (the game draws water in its hexes; paint the ditch's banks).
* **x ≈ 2290 – 2380** — leave plain ground: the game stands the wall pieces on this line (do **not** paint walls).
* **x ≈ 2380 – 2798** — inside the town: paved streets and a small square, flat enough for creatures to stand on, in the pantheon's materials.
* **Beyond the board** (east of x 2798 and north and south of the board) — the town's houses, temples and trees as the frame of the picture; leave an open plaza around **x 2900, y 1630** where the game places the keep.

No walls, no keep, no creatures and no catapult in the painting: the game draws them.

## 3. How a delivery enters the game

1. Save Part A and B files in `assets-source/sprites/final/` and run `npm run sprites:import`. The importer knows the new names: pantheon pieces get the 68 % footprint anchor; the throw strip is drawn normally (not as a glow). The siege then shows the defending town's own set (the shared set stays for any piece not delivered).
2. Save Part C in `assets-source/art/final/` and run `npm run art:import`. A siege against that pantheon's town uses its painting; the grey town paving the game draws today is then left out.
3. Run `npm run check` and look at a siege of each pantheon (level 2 and level 3 towns): the wall reads as one line from the top of the field to the bottom, the gate in the middle, towers at the ends, the keep east of the field; damage states after the catapult and creatures hit them; the catapult's throw.
