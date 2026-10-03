# Pantheon Realms — Art Brief 7 for GPT-6: MOUSE CURSORS

**What this file is.** A production brief for the game's **mouse cursors**:
a set of small pointer images that change with what the mouse is over — the
map tile a hero would walk to, an enemy to attack, a town to enter, a spell
target, and so on. Every cursor has its own description, the context in which
the game shows it, its **hotspot** (the exact point that clicks) and the exact
file name.

**Who reads it.** GPT-6 (the image generator) and the person running it.
Sections 1–3 apply to every cursor.

**Status in the game.** The game uses the system arrow today. Once these
files are delivered, the developer adds an importer and switches cursors by
context (section 7). Nothing here changes how the game plays.

**Files.** **24 PNG files** (section 6).

---

## 0. The game in one paragraph

*Pantheon Realms* is a turn-based fantasy strategy game in the tradition of
classic hero-and-army strategy games. On the **adventure map** (a hex map seen
from a fixed angle) the player selects mounted heroes, plans routes, visits
mines and shrines, fights guards and enemy heroes and enters towns. **Battles**
are fought on a 15 × 11 hex field where the player moves stacks of creatures,
attacks in melee from a chosen side, shoots, casts spells and storms town
walls. Cursors tell the player, before clicking, what a click will do.

---

## 1. How to work (rules for every cursor)

1. **One cursor per request.** Square canvas **128 × 128 px**, PNG, sRGB,
   **transparent background** (real alpha). The game shows cursors at
   **32 × 32 px** (64 × 64 on high-resolution screens), so design for 32 px.
2. **Name the file exactly** as written in its entry.
3. **Hotspot.** Every entry says where its hotspot is. Two kinds:
   - **Tip** cursors (arrows, hands, the sword): the tip that clicks lies in
     the **top-left corner**, between 4 and 10 px from the top and left edges
     of the 128 px canvas. Nothing else is closer to that corner.
   - **Centred** cursors (symbols over a tile or a creature): the symbol is
     centred on the canvas; its visual centre (**64, 64**) is the hotspot.
   - The sword (section 5.3) has its own rule.
4. **Readable at 32 px:** one bold silhouette; a dark outline about **6 px**
   wide (on the 128 px canvas) all around, so the cursor reads on bright snow,
   sand and sky as well as on dark navy panels.
5. **A small baked shadow** is allowed: soft, offset 3–4 px down and right,
   at most 35 % opacity. No glow halo wider than 4 px, no background shapes.
6. **No text, numbers or letters.**
7. **Consistent set.** All cursors share one style (section 3): same gold,
   same outline weight, same light from the top left. Generate the arrow
   (`cursor.ui.default`) first and attach it as the style reference for all
   the others.

**Test before delivering:** shrink to 32 × 32 px and look at it over a light
map (snow or sand) and a dark panel (`#0b1626`). The hotspot must be obvious.

---

## 2. Reference images to attach

| # | File in the project folder | Use it for |
|---|---|---|
| R1 | `assets-source/ui/sheets/resource-status-icon-pack.png` | **the icon style**: polished gold metal, navy and coloured enamel |
| R2 | `assets-runtime/ui/icons/final/` (e.g. `icon.spell.ward.png`, `icon.artifact.bronze_spear.png`) | finished in-game icons |
| R3 | `assets-source/ui/frames/intro-frame.png` | gold-and-navy ornament |
| R4 | the first delivered cursor, `cursor.ui.default.png` | **consistency for every later cursor** |

---

## 3. Style bible

**Medium.** Small painted game cursors: sculpted, polished **gold metal**
(`#C29A52`, highlights `#F5E4B7`, shadows `#7A5A26`) with **navy enamel**
(`#1D3557`) where a cursor needs a filled area, crisp edges, lit from the top
left — the same family as the game's icons (R1). Not flat vector, not photo,
not cartoon.

**Colour code** (used sparingly, so the meaning reads at a glance):

| Meaning | Accent |
|---|---|
| normal / move | gold |
| move needs more days | silver-grey `#9AA3AD` with a small gold hourglass badge |
| attack / danger | crimson enamel `#B3262B` on the gold |
| magic | violet-blue glow `#8F7BFF` |
| not possible | crimson ring and bar |

---

## 4. Interface cursors (6)

### 4.1 `cursor.ui.default.png` — the arrow · *tip*
A classic slanted pointer arrow, gold with a navy enamel inlay along its
middle and a small ornamental flourish at the tail. Tip in the top-left
corner. **Shown:** everywhere by default (menus, panels, empty map).

### 4.2 `cursor.ui.pointer.png` — the gauntlet · *tip*
A gold-armoured **gauntlet hand pointing** with the index finger up-left
(fingertip in the top-left corner), other fingers curled. **Shown:** over
buttons, cards, list rows — anything clickable.

### 4.3 `cursor.ui.grab.png` — open gauntlet · *centred*
The same gauntlet, **open**, palm facing the viewer, fingers slightly spread.
**Shown:** over things that can be dragged (artifacts on the hero screen,
creature stacks between armies) and over the adventure map where dragging pans.

### 4.4 `cursor.ui.grabbing.png` — closed gauntlet · *centred*
The same gauntlet **closed** into a gripping fist. **Shown:** while dragging
an artifact or a stack, and while panning the map.

### 4.5 `cursor.ui.busy.png` — hourglass · *centred*
A small ornate **hourglass**, gold frame, navy caps, golden sand half run
through. **Shown:** while the other empires take their turn, and while a
battle or map is loading.

### 4.6 `cursor.blocked.png` — not possible · *centred*
A **crimson ring with a diagonal bar** (top-left to bottom-right), gold rim
on the ring. **Shown:** wherever a click would do nothing — an impassable
tile, a tile out of reach, a stack you cannot attack, an illegal spell target.

---

## 5. Adventure map cursors (9) and battle cursors (9)

### 5.1 Adventure map

| File | Hotspot | What it shows | Shown when the mouse is over… |
|---|---|---|---|
| `cursor.map.hero.png` | centred | a gold **crested helmet** seen from the side | one of your own heroes (click selects; on the selected hero: opens the hero screen) |
| `cursor.map.town.png` | centred | a small gold **fortified gate** with two towers and a pennant | your own town (click enters the town; selects it from the town list) |
| `cursor.map.move.png` | centred | a gold **galloping horse** in silhouette, mid-stride, facing right | a tile the selected hero reaches **today** |
| `cursor.map.move_later.png` | centred | the same horse in **silver-grey**, with a small gold **hourglass badge** at its lower right | a tile the hero reaches only on a later day |
| `cursor.map.attack.png` | centred | two gold **crossed swords** with crimson-enamel grips | a route that ends in a fight: guards, a wandering monster or an enemy hero |
| `cursor.map.siege.png` | centred | a small stone **tower** with a gold **sword** across its gate | an enemy town (entering starts a siege) |
| `cursor.map.visit.png` | centred | a gold **pennant flag** planted on a small mound, with a tiny four-point sparkle | a site the hero can visit or claim: a mine, shrine, camp, chest, quest hut, windmill, learning stone, prison |
| `cursor.map.meet.png` | centred | two gold **curved arrows** circling each other (exchange) | another of your heroes next to the selected one (trade troops and artifacts) |
| `cursor.map.portal.png` | centred | a swirling **violet portal ring** with a gold rim | a two-way portal the hero can step through |

### 5.2 Battle

| File | Hotspot | What it shows | Shown when the mouse is over… |
|---|---|---|---|
| `cursor.battle.move.png` | centred | a pair of gold-studded **leather boots**, one stepping forward | a hex the active stack can walk to |
| `cursor.battle.fly.png` | centred | a single gold-edged white **feathered wing** | a hex the active (flying) stack can fly to |
| `cursor.battle.melee.png` | see 5.3 | a short gold **sword**, pointing straight right | an enemy stack the active stack can reach and strike (one image; the game turns it to the side the strike comes from) |
| `cursor.battle.shoot.png` | centred | a gold **bow** drawn with an arrow, pointing up-right | an enemy the active stack can shoot at full damage |
| `cursor.battle.shoot_weak.png` | centred | a **broken arrow** (shaft snapped in the middle, gold head) | an enemy the stack can shoot only at half damage (far half of its range, or behind an intact wall) |
| `cursor.battle.structure.png` | centred | a small **stone wall segment cracking**, with a gold hammer striking it | a wall, gate, tower or keep a siege creature can attack |
| `cursor.battle.ability.png` | centred | a gold **eight-point star** medallion with a navy centre | a target of a creature's active ability (for example, an ally to Ward) |
| `cursor.battle.info.png` | centred on the lens | a gold-rimmed **magnifying glass** | any stack when no action applies (click shows its details) |
| `cursor.spell.png` | centred | a glowing **violet-blue rune star** (a circle of light with a four-point star) — no readable runes | a legal spell or miracle target — in battle and on the adventure map (Divine Sight, Far Sight) |

### 5.3 The sword rule (`cursor.battle.melee.png`)

Draw the sword **horizontal, pointing right**: grip at the left, blade
reaching to the right; the **point** sits on the canvas's horizontal centre
line (y = 64) about **8 px from the right edge**. The sword fills the width
(about 112 px long) and is about 28–34 px tall at the guard. Light from the
top. The point is the hotspot.

The game rotates this one image to the **six sides** of a hex target (the
side the creature will strike from is where the player's mouse rests on the
target) — so do not add a shadow to this one, and keep it symmetric above and
below its centre line.

---

## 6. Delivery checklist (24 files)

All files go into the project folder **`assets-source/ui/cursors/`**.

```
cursor.ui.default.png        cursor.map.hero.png          cursor.battle.move.png
cursor.ui.pointer.png        cursor.map.town.png          cursor.battle.fly.png
cursor.ui.grab.png           cursor.map.move.png          cursor.battle.melee.png
cursor.ui.grabbing.png       cursor.map.move_later.png    cursor.battle.shoot.png
cursor.ui.busy.png           cursor.map.attack.png        cursor.battle.shoot_weak.png
cursor.blocked.png           cursor.map.siege.png         cursor.battle.structure.png
                             cursor.map.visit.png         cursor.battle.ability.png
                             cursor.map.meet.png          cursor.battle.info.png
                             cursor.map.portal.png        cursor.spell.png
```

- [ ] 128 × 128 PNG, sRGB, real transparency
- [ ] tip cursors: tip 4–10 px from the top-left corner; centred cursors centred
- [ ] the sword horizontal, pointing right, point at y = 64, no shadow
- [ ] dark outline all around; reads at 32 px on light and dark backgrounds
- [ ] one consistent style (generate the arrow first and attach it each time)
- [ ] no text, numbers or letters

---

## 7. Bringing them into the game (for the developer — not done yet)

1. An importer (to add) reads `assets-source/ui/cursors/`, writes 32 px and
   64 px versions to `assets-runtime/ui/cursors/` and measures each hotspot
   (tip cursors: the opaque pixel nearest the top-left corner; centred: the
   centre; the sword: its point, then the six rotations at 0°, ±60°, ±120°
   and 180° about the hotspot).
2. The interface sets the cursor from the state it already computes for hover
   previews: the adventure map's route quote (reachable today or later, ends
   in an encounter, own town, site, portal, own hero) and the battle's hover
   target (move cell, melee target and side, shoot target with full or half
   damage, spell or ability target, structure). CSS `cursor: url(…) x y,
   auto` with the measured hotspot; the system cursor stays the fallback.
3. Settings: a "Game cursors" switch (on by default) for players who prefer
   the system pointer.
