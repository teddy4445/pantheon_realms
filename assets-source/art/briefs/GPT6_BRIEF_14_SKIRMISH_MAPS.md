# Pantheon Realms — Art Brief 14 for GPT-6: SKIRMISH MAP PICTURES

_Written 2026-10-05 for the six authored skirmish maps added that day (`packages/content/src/skirmish/maps/`). Until these pictures arrive, the skirmish screens show a drawn top-down overview of each map in their place. Nothing in the game code changes when they arrive: each file is found by its name._

## At a glance

| # | Map | Empires | File to deliver | Layout guide (attach) |
|---|---|---|---|---|
| 1 | Frostgate | 2 | `mission.skirmish.frostgate.thumbnail.png` | `assets-source/art/briefs/guides/skirmish.frostgate.layout.png` |
| 2 | The Burning Oasis | 4 | `mission.skirmish.burning_oasis.thumbnail.png` | `assets-source/art/briefs/guides/skirmish.burning_oasis.layout.png` |
| 3 | The Circle of Gates | 3 | `mission.skirmish.circle_of_gates.thumbnail.png` | `assets-source/art/briefs/guides/skirmish.circle_of_gates.layout.png` |
| 4 | Barrows of the Lost Kings | 2 | `mission.skirmish.barrows.thumbnail.png` | `assets-source/art/briefs/guides/skirmish.barrows.layout.png` |
| 5 | The Golden Fords | 2 | `mission.skirmish.golden_fords.thumbnail.png` | `assets-source/art/briefs/guides/skirmish.golden_fords.layout.png` |
| 6 | The Six Thrones | 6 | `mission.skirmish.six_thrones.thumbnail.png` | `assets-source/art/briefs/guides/skirmish.six_thrones.layout.png` |

**Six paintings, 1920 × 1080 px (16:9), opaque PNG, sRGB.** Deliver at least this size; larger 16:9 masters are welcome. Never enlarge a smaller image to reach it.

## 1. Where the game shows them

New Game → **Skirmish** lists the maps after Twin Harbors. Each painting is used four ways — design for all four:

1. **List card, 640 × 360** (reduced copy, about 330 px wide on screen). It must read at a glance: one clear landmark, a strong silhouette, clear light-and-dark contrast.
2. **Detail panel, full size** (about 700–900 px wide), above the map's description, facts and drawn layout.
3. **Seat setup panel** (Set Up Empires), about 450 px wide.
4. **Backdrop** of the skirmish screen while the map is selected, under a dark scrim, partly covered by the list on the left and the detail panel on the right. Keep the landmark in the central 60 % of the width; the edges may be quieter.

The game draws the title, the empire count and every frame itself.

## 2. Rules for every painting

* **Same studio as the rest of the game.** Epic painterly fantasy, like the delivered mission pictures and opening paintings: visible, controlled brushwork; crisp detail where the eye should go, soft atmosphere elsewhere. Not a photograph, not a 3D render, not anime, not flat vector.
* **Style references to attach:** `assets-runtime/art/missions/mission.skirmish.twin_harbors.briefing.webp` (the existing skirmish picture — the closest match in subject and framing) and one or two opening paintings from `assets-source/ui/backgrounds/` (`opening-greek-landscape.png`, `opening-norse-battle.png`) for light and finish. When words and references disagree on style, follow the references.
* **View.** A high three-quarter aerial view, as if from a mountain top or a soaring eagle: the land of the map, its signature landmark in the middle distance, the horizon in the upper fifth or higher. Show the *place* — it is the battlefield of a strategy game, not a battle scene.
* **Any pantheon may play any seat.** Do not paint one pantheon's towns, gods or armies as the owners of the land. Distant settlements, if any, stay small and generic; banners, if any, are plain cloth in muted seat colours (blue, red, green, amber, violet, teal) without emblems.
* **The layout guide is for composition only.** It is a top-down plan of the real map (towns are the large coloured hexagons; the orange disc is the shrine; violet discs are portals joined by violet lines; coloured squares are key gates, coloured triangles key tents; red dots are guarded passes). Paint the landscape it describes in perspective — do not copy its flat colours, hexagons or symbols.
* **No text of any kind:** no titles, letters, numbers, runes, logos, signatures, watermarks, frames, borders or UI.
* **People** only as tiny distant figures if at all; adults only, no gore, cultures shown with respect.
* **Light.** Each map has its own time of day (below). Keep a warm key light and a cool shadow side so all six sit together in the list.

## 3. How a delivery enters the game

1. Save each painting as `assets-source/art/final/<file name from the table>`.
2. Run `npm run art:import`. It makes the 640 × 360 card (`mission.skirmish.<map>.thumbnail`) and keeps the full-size picture (`mission.skirmish.<map>.briefing`) in `assets-runtime/art/`, never enlarging a source.
3. Run `npm run check`, then open New Game → Skirmish and select each map: the card, the detail picture, the backdrop and Set Up Empires should show the painting instead of the drawn overview.

---

## Map 1 — Frostgate

`assets-source/art/final/mission.skirmish.frostgate.thumbnail.png` · attach `skirmish.frostgate.layout.png`

**The place.** A frozen fjord country. Two snowy valleys with pine woods face each other across a long fjord of dark sea water. A sheer mountain ridge runs down the middle, and the only way across is a narrow pass cut straight through it — barred by **two massive iron-and-timber gates**, one at each end of the pass, both banded with **crimson** (the crimson key opens them). In the fjord on either side lie small **glacier islands**: on the nearer one a keymaster's tent of hides beside a glowing stone arch (the portal), with **wyverns** circling or perched on the ice.

**Must show.** The ridge and its pass with the twin crimson-banded gates as the focal point (centre); the fjord water on both sides; at least one glacier island with the tent and arch; snow valleys with pines.

**Mood and light.** Clear, cold late afternoon; low sun gilding the snow and the gates; blue shadows; a hint of sea spray and drifting snow.

```text
Epic painterly fantasy landscape for the strategy game Pantheon Realms, 1920 x 1080, high three-quarter aerial view. A frozen fjord country: two snowy valleys with pine woods face each other across a long fjord of dark sea water. Down the middle runs a sheer mountain ridge, crossed only by one narrow pass cut through the rock, barred by two massive iron-and-timber gates banded with crimson, one at each end of the pass. In the fjord lie small glacier islands; on the nearest stands a keymaster's tent of hides beside a glowing stone arch, with wyverns perched on the ice. Clear cold late afternoon, low golden sun on the snow and the gates, blue shadows, sea spray and drifting snow. The twin gates and the pass in the centre of the picture. No text, no people in the foreground, no frame.
```

## Map 2 — The Burning Oasis

`assets-source/art/final/mission.skirmish.burning_oasis.thumbnail.png` · attach `skirmish.burning_oasis.layout.png`

**The place.** A vast burning desert of dunes and red mesas. In the very centre, ringed by a broken circle of **red rock**, stands the **Burning Shrine**: an ancient open-air sanctuary of pale stone around a great eternal flame that rises like a pillar. Out on the sand around it lie **oases** — turquoise ponds framed by date palms, with tents of a creature camp and the timber head of a gold mine among the rocks. Four empires hold the corners: suggest them only as faint far-off walls and plain banners on the horizon in four directions.

**Must show.** The Burning Shrine and its pillar of flame inside the red rock ring (centre); at least two oases with palms and water; the ring's openings where roads lead in; dunes and mesas.

**Mood and light.** Blazing noon to early afternoon, white-hot sky, heat shimmer; the flame glowing gold and orange; long violet shadows under the mesas.

```text
Epic painterly fantasy landscape for the strategy game Pantheon Realms, 1920 x 1080, high three-quarter aerial view. A vast burning desert of golden dunes and red mesas. In the centre, inside a broken ring of red rock with four openings, stands the Burning Shrine: an ancient open-air sanctuary of pale stone around an eternal flame rising like a pillar. Around it on the sand lie oases: turquoise ponds framed by date palms, with tents of a creature camp and the timber head of a gold mine among the rocks. Far away in four directions, faint walls and plain banners of four rival realms. Blazing early afternoon, heat shimmer, the flame glowing gold and orange, violet shadows under the mesas. The shrine and its flame in the centre. No text, no people in the foreground, no frame.
```

## Map 3 — The Circle of Gates

`assets-source/art/final/mission.skirmish.circle_of_gates.thumbnail.png` · attach `skirmish.circle_of_gates.layout.png`

**The place.** High mountain country: three green valleys spaced evenly around a central **peak sanctum** — a summit plateau among jagged peaks, with three small spell shrines and an ancient stone seat where a **crown** rests, reached by three narrow guarded paths. Ridges with one crossing each divide the valleys. In every valley stand two **standing-stone portal arches**, each glowing violet; faint violet light-bridges arc across the sky between arches of neighbouring valleys, so the portals form one great **ring** around the summit.

**Must show.** The summit sanctum (centre); at least two valleys with their portal arches; the violet arcs that read as a circle linking the gates; ridges and passes.

**Mood and light.** Thin, clear high-altitude air; morning light from the side; clouds below the peaks; the portal light cool violet against warm stone.

```text
Epic painterly fantasy landscape for the strategy game Pantheon Realms, 1920 x 1080, high three-quarter aerial view. High mountain country: three green valleys spaced evenly around a central summit sanctum among jagged peaks, a small plateau with three wayside spell shrines and an ancient stone seat where a crown rests, reached by three narrow paths. Rocky ridges with one crossing each divide the valleys. In every valley stand standing-stone portal arches glowing violet, and faint violet light-bridges arc through the sky between the arches of neighbouring valleys, forming one great ring around the summit. Clear thin morning air, side light, clouds below the peaks, cool violet portal light against warm stone. The summit in the centre, the ring of gates around it. No text, no people in the foreground, no frame.
```

## Map 4 — Barrows of the Lost Kings

`assets-source/art/final/mission.skirmish.barrows.thumbnail.png` · attach `skirmish.barrows.layout.png`

**The place.** A fog-bound moor of heather, bogs, dark meres and granite tors, scattered with **grassy burial mounds** (barrows), each with a stone doorway between standing slabs. One great **King's Barrow** dominates: larger, ringed by standing stones, a faint cold light at its door (a captive waits inside). Two **sealed hoards** sit in hollows of rock, each behind a heavy gate — one bound in **amber** metal, one in **violet**. A lone watchtower on a tor; a hermit's hut with smoke.

**Must show.** The King's Barrow and other barrows (focal); low fog over the moor; at least one of the amber or violet sealed gates; tors and meres.

**Mood and light.** Grey-green dusk, fog in the hollows, a break in the clouds lighting the King's Barrow; the gates' metal catching the last light. Eerie but not horror: no corpses, no gore.

```text
Epic painterly fantasy landscape for the strategy game Pantheon Realms, 1920 x 1080, high three-quarter aerial view. A fog-bound moor of purple heather, bogs, dark meres and granite tors, scattered with grassy burial mounds, each with a stone doorway between standing slabs. One great King's Barrow dominates the middle distance, ringed by standing stones, a faint cold light at its door. In rocky hollows lie two sealed hoards behind heavy gates, one bound in amber metal and one in violet. A lone watchtower on a tor, a hermit's hut with a thread of smoke. Grey-green dusk, low fog in the hollows, a break in the clouds lighting the King's Barrow, the gates catching the last light. Eerie and quiet, no corpses, no gore. No text, no people in the foreground, no frame.
```

## Map 5 — The Golden Fords

`assets-source/art/final/mission.skirmish.golden_fords.thumbnail.png` · attach `skirmish.golden_fords.layout.png`

**The place.** A rich autumn valley between **two parallel rivers**. Between the rivers lie golden fields, orchards, a windmill, mines in low hills, a centaur camp, and in the very middle a harvest altar where the **Horn of Plenty** rests, spilling light and fruit. Each river is crossed by **three fords** — shallow stone-paved crossings where the water runs bright over the stones — each watched by a small band of guards. Beyond each river, the home banks with woods.

**Must show.** Both rivers with at least two visible fords; the golden middle land with the Horn of Plenty on its altar (centre); autumn woods in red and gold.

**Mood and light.** Warm, generous late-afternoon gold; light mist over the water; falling leaves on the wind. The friendliest of the six.

```text
Epic painterly fantasy landscape for the strategy game Pantheon Realms, 1920 x 1080, high three-quarter aerial view. A rich autumn valley between two parallel rivers. Between them lie golden fields, orchards, a windmill, mine entrances in low hills and a camp of tents, and in the middle a harvest altar where a great horn of plenty rests, spilling golden light and fruit. Each river is crossed by three shallow fords paved with stones, the water running bright over them, each watched by a small band of guards. Beyond the rivers, woods in red and gold. Warm late-afternoon gold light, mist over the water, falling leaves on the wind. The horn of plenty and the fords in the centre. No text, no people in the foreground, no frame.
```

## Map 6 — The Six Thrones

`assets-source/art/final/mission.skirmish.six_thrones.thumbnail.png` · attach `skirmish.six_thrones.layout.png`

**The place.** One great island in a sunlit sea, divided like a wheel into **six wedges** by six long mountain ridges that run from the centre to the coast. In each wedge stands a **throne** — a colossal empty stone seat on a headland or terrace, each a different plain colour of banner (blue, red, green, amber, violet, teal), none showing any god or emblem. At the hub, inside a ring of mountains with six guarded paths, rises the **Shrine of Six Thrones**: a round temple with a beacon of light.

**Must show.** The island seen whole or nearly whole; the six ridges reading as spokes; the central shrine and its light (centre); at least three of the six thrones.

**Mood and light.** Bright, clear morning sea; a crown of cloud around the central peaks; the shrine's beacon a vertical column of light. Grand and symmetrical.

```text
Epic painterly fantasy landscape for the strategy game Pantheon Realms, 1920 x 1080, very high three-quarter aerial view. One great island in a sunlit sea, divided like a wheel into six wedges by six long mountain ridges running from the centre to the coast. In each wedge stands a colossal empty stone throne on a terrace, each with plain banners of one colour (blue, red, green, amber, violet, teal), no emblems. At the hub, inside a ring of mountains with six narrow paths, rises the Shrine of Six Thrones, a round temple sending a column of light into the sky. Bright clear morning, a crown of cloud around the central peaks, grand and symmetrical. The shrine in the centre, the island nearly whole. No text, no people in the foreground, no frame.
```

---

## Check before delivering

* 1920 × 1080 (or larger, exactly 16:9), opaque PNG, named exactly as in the table.
* Reduced to 330 px wide, the landmark is still recognisable.
* No text, letters, numbers, emblems or frames anywhere.
* No pantheon's gods, armies or architecture presented as the owner of the land.
