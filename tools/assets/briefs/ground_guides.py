#!/usr/bin/env python3
"""
Ground-transition guides for GPT-6 Brief 17 (development tool; never packaged in the game).

Writes, from the game's own hex geometry (pointy-top hexes, ground foreshortened
to 84 %, as `packages/presentation/src/hexmath.ts` draws the adventure map):

  assets-source/art/briefs/guides/ground.edges.layout.png   the guide for the six edge-mask sheets
  assets-source/art/briefs/guides/ground.shore.layout.png   the guide for the shore mask and its foam sheet
  assets-source/art/briefs/guides/ground.join-example.png   how the pieces sit on the map
  assets-source/sprites/ground-edges.json                    the sheet layout, read by the importer and the game

Each sheet is 6 x 3 cells of 256 x 256 px: one column per hex edge (e, se,
sw, w, nw, ne — the order of `hexPolygon`'s edges), three variants per edge
(rows). In every cell the hex is 224 px wide and centred, as in the road
sheets. A mask is a white shape on black: the neighbouring ground reaching
into this hex across the cell's edge. It must be white all along that edge
(the white line on the guide) and stay inside the light band (at most 45 %
of the way to the centre, about a third of that at the edge's two corners, so the
pieces of neighbouring edges join without notches).

    python3 tools/assets/briefs/ground_guides.py
"""
import json
import math
import os

from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
GUIDES = os.path.join(ROOT, 'assets-source', 'art', 'briefs', 'guides')
LAYOUT = os.path.join(ROOT, 'assets-source', 'sprites', 'ground-edges.json')

CELL, COLS, ROWS, HEX_W = 256, 6, 3, 224
R = HEX_W / math.sqrt(3)
S = 0.84
DIRS = ['e', 'se', 'sw', 'w', 'nw', 'ne']
MAX_DEPTH = 0.45  # share of the way from the edge to the centre
# Ground "characters": the shape of the edge a ground makes where it reaches into its neighbour.
CHARACTERS = {
    'meadow': {'ground': 'plains', 'depth': [0.25, 0.4]},
    'woodland': {'ground': 'forest', 'depth': [0.25, 0.45]},
    'rocky': {'ground': 'rough', 'depth': [0.2, 0.4]},
    'boggy': {'ground': 'marsh', 'depth': [0.25, 0.4]},
    'scree': {'ground': 'mountain', 'depth': [0.3, 0.45]},
    'shore': {'ground': 'any land into water', 'depth': [0.15, 0.35]},
}
# Which ground reaches over which where two meet (the higher one paints into the lower one's hex).
PRIORITY = ['water', 'marsh', 'plains', 'rough', 'forest', 'mountain']


def corner(k, r=R):
    a = math.radians(60 * k - 30)
    return (r * math.cos(a), r * math.sin(a) * S)


def hexagon(cx, cy, r=R):
    return [(cx + corner(k, r)[0], cy + corner(k, r)[1]) for k in range(6)]


def allowed_zone(cx, cy, k, depth=MAX_DEPTH, steps=24):
    """The band along edge k a mask may cover: deepest at the edge's middle, about a third as deep at its corners."""
    (x0, y0), (x1, y1) = corner(k), corner(k + 1)
    outer = []
    inner = []
    for i in range(steps + 1):
        t = i / steps
        ex, ey = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        f = depth * (0.35 + 0.65 * math.sin(math.pi * t) ** 0.6)  # tapering towards the corners, never to nothing (neighbouring edges join)
        outer.append((cx + ex, cy + ey))
        inner.append((cx + ex * (1 - f), cy + ey * (1 - f)))
    return outer + inner[::-1]


def neighbour_offset(k):
    a = math.radians(60 * k)
    d = HEX_W  # centre to centre, before foreshortening
    return (d * math.cos(a), d * math.sin(a) * S)


def cell_guide(d, img, cx, cy, k, water=False):
    # The neighbour across edge k (where the reaching ground comes from), clipped to the cell.
    nx, ny = neighbour_offset(k)
    d.polygon(hexagon(cx + nx, cy + ny), fill=(64, 116, 70, 255) if water else (96, 84, 60, 255))
    d.polygon(hexagon(cx, cy), fill=(44, 92, 140, 255) if water else (52, 58, 68, 255))
    band = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(band).polygon(allowed_zone(cx, cy, k), fill=(230, 230, 230, 90))
    img.alpha_composite(band)
    d = ImageDraw.Draw(img)
    d.line(allowed_zone(cx, cy, k)[25:] + [allowed_zone(cx, cy, k)[25]], fill=(200, 200, 200, 255), width=1)
    d.polygon(hexagon(cx, cy), outline=(150, 156, 168, 255), width=1)
    (x0, y0), (x1, y1) = corner(k), corner(k + 1)
    d.line([(cx + x0, cy + y0), (cx + x1, cy + y1)], fill=(255, 255, 255, 255), width=4)
    return d


def guide(water=False):
    img = Image.new('RGBA', (CELL * COLS, CELL * ROWS), (30, 33, 40, 255))
    for row in range(ROWS):
        for col in range(COLS):
            x0, y0 = col * CELL, row * CELL
            layer = Image.new('RGBA', (CELL, CELL), (30, 33, 40, 255))
            d = ImageDraw.Draw(layer)
            cell_guide(d, layer, CELL / 2, CELL / 2, col, water)
            ImageDraw.Draw(layer).rectangle([0, 0, CELL - 1, CELL - 1], outline=(70, 76, 88, 255))
            img.paste(layer, (x0, y0))
    return img


def join_example():
    """A patch of map: forest reaching into plains, plains into marsh, the shore into water."""
    w, h = 8, 6
    cells = {}
    for r in range(h):
        for q in range(-(r // 2), w - (r // 2)):
            g = 'plains'
            if q + r // 2 >= 5:
                g = 'water'
            elif r <= 1 and q + r // 2 <= 2:
                g = 'forest'
            elif r >= 4 and q + r // 2 <= 1:
                g = 'marsh'
            cells[(q, r)] = g
    colours = {'plains': (110, 130, 70), 'forest': (52, 86, 48), 'marsh': (70, 98, 84), 'water': (44, 92, 140)}

    def raw(q, r):
        return (HEX_W * (q + r / 2), 1.5 * R * S * r)

    xs = [raw(q, r)[0] for q, r in cells]
    ys = [raw(q, r)[1] for q, r in cells]
    ox, oy = -min(xs) + HEX_W, -min(ys) + R
    img = Image.new('RGBA', (int(max(xs) - min(xs) + 2 * HEX_W), int(max(ys) - min(ys) + 2 * R)), (30, 33, 40, 255))
    d = ImageDraw.Draw(img)
    for (q, r), g in cells.items():
        x, y = raw(q, r)
        d.polygon(hexagon(x + ox, y + oy), fill=colours[g])
    steps = [(1, 0), (0, 1), (-1, 1), (-1, 0), (0, -1), (1, -1)]
    for (q, r), g in cells.items():
        x, y = raw(q, r)
        for k, (dq, dr) in enumerate(steps):
            n = cells.get((q + dq, r + dr))
            if not n or n == g or PRIORITY.index(n) <= PRIORITY.index(g):
                continue
            # The neighbour's colour reaching into this hex inside the allowed band (a plain stand-in for the painted mask).
            zone = allowed_zone(x + ox, y + oy, k, depth=0.32)
            d.polygon(zone, fill=colours[n])
            if g == 'water':
                d.line(zone[25:], fill=(240, 248, 255), width=3)
    for (q, r) in cells:
        x, y = raw(q, r)
        d.polygon(hexagon(x + ox, y + oy), outline=(20, 22, 26), width=1)
    return img


def main():
    os.makedirs(GUIDES, exist_ok=True)
    layout = {
        'schema': 'pantheon-realms-ground-edges-1',
        'note': 'Written by tools/assets/briefs/ground_guides.py. Layout of the ground-transition sheets (GPT-6 Brief 17): one column per hex edge, one row per variant.',
        'cell': CELL, 'cols': COLS, 'rows': ROWS, 'hexWidth': HEX_W, 'squash': S, 'dirs': DIRS,
        'maxDepth': MAX_DEPTH, 'characters': CHARACTERS, 'priority': PRIORITY,
        'files': {**{c: f'sheet.ground.{c}.png' for c in CHARACTERS}, 'foam': 'sheet.ground.shore.foam.png'},
    }
    with open(LAYOUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(layout, f, indent=1)
        f.write('\n')
    for name, water in (('edges', False), ('shore', True)):
        out = os.path.join(GUIDES, f'ground.{name}.layout.png')
        guide(water).convert('RGB').save(out, optimize=True)
        print(os.path.relpath(out, ROOT))
    out = os.path.join(GUIDES, 'ground.join-example.png')
    join_example().convert('RGB').save(out, optimize=True)
    print(os.path.relpath(out, ROOT))
    print(os.path.relpath(LAYOUT, ROOT))


if __name__ == '__main__':
    main()
