#!/usr/bin/env python3
"""
Road tile guides for GPT-6 Brief 16 (development tool; never packaged in the game).

Writes, from the game's own hex geometry (pointy-top hexes, ground foreshortened
to 84 %, as `packages/presentation/src/hexmath.ts` draws the adventure map):

  assets-source/art/briefs/guides/road.<a|b|c>.layout.png   one guide per sheet part (the same for every road type)
  assets-source/art/briefs/guides/road.join-example.png      how tiles join on the map
  assets-source/sprites/road-tiles.json                      the cell order, read by the importer; a unit test
                                                             keeps it equal to `roadTileOrder()` in roads.ts

Each sheet is 7 x 3 cells of 256 x 256 px. In every cell the hex is 224 px
wide (between its vertical sides) and centred. The road leaves the hex at the
middle of each connected edge: its surface covers the middle 36 % of the edge
(red bar), its soft verge the middle 50 %. No text in the guides: the brief
names every cell.

    python3 tools/assets/briefs/road_guides.py
"""
import json
import math
import os

from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
GUIDES = os.path.join(ROOT, 'assets-source', 'art', 'briefs', 'guides')
LAYOUT = os.path.join(ROOT, 'assets-source', 'sprites', 'road-tiles.json')

CELL, COLS, ROWS, HEX_W = 256, 7, 3, 224
R = HEX_W / math.sqrt(3)
S = 0.84
DIRS = ['e', 'se', 'sw', 'w', 'nw', 'ne']
SURFACE = (0.32, 0.68)  # share of the edge covered by the road surface
VERGE = (0.25, 0.75)    # and by its soft verge


def bits(*ds):
    m = 0
    for d in ds:
        m |= 1 << (d % 6)
    return m


ALL = 0b111111
K6 = range(6)


def order():
    a = [bits(k) for k in K6] + [bits(0, 3), bits(1, 4), bits(2, 5)] + [bits(k, k + 2) for k in K6] + [bits(k, k + 1) for k in K6]
    b = [bits(0, 2, 4), bits(1, 3, 5)] + [bits(k, k + 1, k + 3) for k in K6] + [bits(k, k + 1, k + 4) for k in K6] + [bits(k, k + 1, k + 2) for k in K6] + [ALL]
    c = [ALL & ~bits(k, k + 3) for k in range(3)] + [ALL & ~bits(k, k + 2) for k in K6] + [ALL & ~bits(k, k + 1) for k in K6] + [ALL & ~bits(k) for k in K6]
    return {'a': a, 'b': b, 'c': c}


def name(mask):
    return '-'.join(d for k, d in enumerate(DIRS) if mask & (1 << k))


def corner(k, r=R):
    a = math.radians(60 * k - 30)
    return (r * math.cos(a), r * math.sin(a) * S)


def edge_point(k, t):
    """A point on edge k (corners k and k+1), t from 0 to 1."""
    (x0, y0), (x1, y1) = corner(k), corner(k + 1)
    return (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)


def draw_tile(d, cx, cy, mask, scale=1.0, verge=(70, 74, 82, 255), surface=(150, 154, 160, 255), centre=(235, 235, 235, 255), gates=True):
    """The road's footprint for a mask, drawn in the foreshortened plane: built in the
    unsquashed plane (a circle of road width at every step along each path) and squashed."""
    conn = [k for k in K6 if mask & (1 << k)]
    # Gate midpoints in the unsquashed plane (apothem along 60k degrees).
    ap = R * math.sqrt(3) / 2

    def gate(k):
        a = math.radians(60 * k)
        return (ap * math.cos(a), ap * math.sin(a))

    def paths():
        out = []
        if len(conn) == 1:
            g = gate(conn[0])
            out.append([(g[0] * (1 - t), g[1] * (1 - t)) for t in [i / 40 for i in range(41)]])
        elif len(conn) == 2:
            g0, g1 = gate(conn[0]), gate(conn[1])
            out.append([((1 - t) ** 2 * g0[0] + (t * t) * g1[0], (1 - t) ** 2 * g0[1] + (t * t) * g1[1]) for t in [i / 60 for i in range(61)]])
        else:
            for k in conn:
                g = gate(k)
                out.append([(g[0] * (1 - t), g[1] * (1 - t)) for t in [i / 40 for i in range(41)]])
        return out

    edge_len = R  # unsquashed edge length
    for width, colour in ((edge_len * (VERGE[1] - VERGE[0])), verge), ((edge_len * (SURFACE[1] - SURFACE[0])), surface):
        rad = width / 2 * scale
        for p in paths():
            for (ux, uy) in p:
                x, y = cx + ux * scale, cy + uy * S * scale
                d.ellipse([x - rad, y - rad * S, x + rad, y + rad * S], fill=colour)
        if len(conn) >= 3:
            d.ellipse([cx - rad * 1.15, cy - rad * 1.15 * S, cx + rad * 1.15, cy + rad * 1.15 * S], fill=colour)
    # Centre line.
    for p in paths():
        pts = [(cx + ux * scale, cy + uy * S * scale) for (ux, uy) in p]
        d.line(pts, fill=centre, width=max(1, int(2 * scale)))
    if gates:
        for k in conn:
            p0, p1 = edge_point(k, SURFACE[0]), edge_point(k, SURFACE[1])
            d.line([(cx + p0[0] * scale, cy + p0[1] * scale), (cx + p1[0] * scale, cy + p1[1] * scale)], fill=(230, 50, 45, 255), width=max(2, int(4 * scale)))


def hexagon(cx, cy, r=R, scale=1.0):
    return [(cx + corner(k, r)[0] * scale, cy + corner(k, r)[1] * scale) for k in K6]


def tile_layer(size, cx, cy, mask, gates=True, scale=1.0):
    """The road footprint of one tile, clipped to its hex (nothing may cross the hex outline)."""
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    draw_tile(ImageDraw.Draw(layer), cx, cy, mask, scale=scale, gates=False)
    clip = Image.new('L', size, 0)
    ImageDraw.Draw(clip).polygon(hexagon(cx, cy, scale=scale), fill=255)
    layer.putalpha(ImageChops.darker(layer.getchannel('A'), clip))
    if gates:
        d = ImageDraw.Draw(layer)
        for k in K6:
            if mask & (1 << k):
                p0, p1 = edge_point(k, SURFACE[0]), edge_point(k, SURFACE[1])
                d.line([(cx + p0[0] * scale, cy + p0[1] * scale), (cx + p1[0] * scale, cy + p1[1] * scale)], fill=(230, 50, 45, 255), width=max(2, int(4 * scale)))
    return layer


def guide(part, masks):
    img = Image.new('RGBA', (CELL * COLS, CELL * ROWS), (34, 38, 46, 255))
    d = ImageDraw.Draw(img)
    for i, mask in enumerate(masks):
        col, row = i % COLS, i // COLS
        x0, y0 = col * CELL, row * CELL
        d.rectangle([x0, y0, x0 + CELL - 1, y0 + CELL - 1], outline=(70, 76, 88, 255))
        cx, cy = x0 + CELL / 2, y0 + CELL / 2
        d.polygon(hexagon(cx, cy), fill=(52, 58, 68, 255))
        img.alpha_composite(tile_layer(img.size, cx, cy, mask))
        d = ImageDraw.Draw(img)
        d.polygon(hexagon(cx, cy), outline=(250, 250, 250, 255), width=2)
    return img


def join_example(masks_by_cell):
    """A small patch of map: tiles edge to edge, the roads continuing from tile to tile."""
    qs = [q for q, _ in masks_by_cell]
    rs = [r for _, r in masks_by_cell]
    cells = [(q, r) for r in range(min(rs) - 1, max(rs) + 2) for q in range(min(qs) - 2, max(qs) + 2)]

    def raw(q, r):
        return (HEX_W * (q + r / 2), 1.5 * R * S * r)

    xs = [raw(q, r)[0] for q, r in cells]
    ys = [raw(q, r)[1] for q, r in cells]
    ox, oy = -min(xs) + HEX_W, -min(ys) + R
    size = (int(max(xs) - min(xs) + 2 * HEX_W), int(max(ys) - min(ys) + 2 * R))
    img = Image.new('RGBA', size, (34, 38, 46, 255))
    d = ImageDraw.Draw(img)
    for q, r in cells:
        x, y = raw(q, r)
        d.polygon(hexagon(x + ox, y + oy), fill=(52, 58, 68, 255), outline=(110, 116, 128, 255))
    for (q, r), mask in masks_by_cell.items():
        x, y = raw(q, r)
        img.alpha_composite(tile_layer(img.size, x + ox, y + oy, mask, gates=False))
    return img


def main():
    os.makedirs(GUIDES, exist_ok=True)
    o = order()
    assert sorted(o['a'] + o['b'] + o['c']) == list(range(1, 64))
    layout = {
        'schema': 'pantheon-realms-road-tiles-1',
        'note': 'Written by tools/assets/briefs/road_guides.py. Cell order of the road sheets (GPT-6 Brief 16); keep equal to roadTileOrder() in packages/presentation/src/roads.ts.',
        'cell': CELL, 'cols': COLS, 'rows': ROWS, 'hexWidth': HEX_W, 'squash': S,
        'dirs': DIRS, 'surface': list(SURFACE), 'verge': list(VERGE),
        'parts': {p: [{'index': i, 'col': i % COLS, 'row': i // COLS, 'mask': m, 'name': name(m)} for i, m in enumerate(ms)] for p, ms in o.items()},
    }
    with open(LAYOUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(layout, f, indent=1)
        f.write('\n')
    for p, ms in o.items():
        out = os.path.join(GUIDES, f'road.{p}.layout.png')
        guide(p, ms).convert('RGB').save(out, optimize=True)
        print(os.path.relpath(out, ROOT))
    # A crossroads, a bend, a fork and a dead end, joined across tiles (axial q, r).
    roads = [((0, 2), (1, 2)), ((1, 2), (2, 2)), ((2, 2), (3, 2)), ((3, 2), (4, 2)), ((4, 2), (5, 2)), ((2, 2), (2, 1)), ((2, 1), (3, 0)),
             ((2, 2), (1, 3)), ((1, 3), (1, 4)), ((4, 2), (4, 3)), ((4, 3), (3, 4)), ((4, 2), (5, 1)), ((5, 1), (5, 0))]
    step = {(1, 0): 0, (0, 1): 1, (-1, 1): 2, (-1, 0): 3, (0, -1): 4, (1, -1): 5}
    masks = {}
    for a, b in roads:
        masks[a] = masks.get(a, 0) | (1 << step[(b[0] - a[0], b[1] - a[1])])
        masks[b] = masks.get(b, 0) | (1 << step[(a[0] - b[0], a[1] - b[1])])
    out = os.path.join(GUIDES, 'road.join-example.png')
    join_example(masks).convert('RGB').save(out, optimize=True)
    print(os.path.relpath(out, ROOT))
    print(os.path.relpath(LAYOUT, ROOT))


if __name__ == '__main__':
    main()
