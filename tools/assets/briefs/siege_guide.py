#!/usr/bin/env python3
"""
Siege layout guide for GPT-6 Brief 15 (development tool; never packaged in the game).

Draws the siege battlefield as the game lays it out — 15 x 11 hexes squashed to
74 %, the wall line of column 10 (towers at both ends on a level-3 town, the gate
in the middle row), the moat in column 9, the keep beyond the east edge and the
attackers' catapult west of the field — at 80 px per hex width (a third of the
sprites' 240 px), with the frame of one 512 x 512 wall piece and of the 768 x 768
keep drawn to scale. No text: the brief explains the colours.

    python3 tools/assets/briefs/siege_guide.py
"""
import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'assets-source', 'art', 'briefs', 'guides', 'siege.layout.png')

HEX_W = 80.0                    # guide pixels per hex width (sprites: 240)
RB = HEX_W / math.sqrt(3)
S = 0.74                        # BATTLE_SQUASH
COLS, ROWS, WALL_COL = 15, 11, 10
SPRITE_PX = 240.0               # sprite pixels per hex width (import_sprites.py)
K = HEX_W / SPRITE_PX


def cell(col, row):
    return (HEX_W * (col + 0.5 * (row & 1)) + 2.4 * HEX_W, 1.5 * RB * S * row + 2.2 * HEX_W)


def hexagon(cx, cy, r):
    return [(cx + r * math.cos(math.radians(60 * i - 30)), cy + r * math.sin(math.radians(60 * i - 30)) * S) for i in range(6)]


def main():
    w = int(HEX_W * (COLS + 5.5))
    h = int(1.5 * RB * S * ROWS + 4.2 * HEX_W)
    img = Image.new('RGB', (w, h), (96, 120, 70))
    d = ImageDraw.Draw(img)
    # The town side (east of the wall) and the field.
    for row in range(ROWS):
        for col in range(COLS):
            x, y = cell(col, row)
            fill = (128, 122, 108) if col > WALL_COL else (60, 110, 150) if col == WALL_COL - 1 and row != 5 else (104, 130, 78)
            d.polygon(hexagon(x, y, RB * 0.97), fill=fill, outline=(40, 50, 30))
    # The wall line: one straight line halfway between the zig-zagging cells of column 10.
    x0 = cell(WALL_COL, 0)[0] + HEX_W * 0.25
    pitch = 1.5 * RB * S
    for row in range(ROWS):
        y = cell(WALL_COL, row)[1]
        color = (200, 60, 50) if row == 5 else (230, 190, 70) if row in (0, 10) else (240, 236, 220)
        d.rectangle([x0 - HEX_W * 0.32, y - pitch / 2, x0 + HEX_W * 0.32, y + pitch / 2], outline=color, width=3)
    # One wall piece's 512 x 512 frame to scale (ground point at 95 % of its height), on row 3.
    gx, gy = x0, cell(WALL_COL, 3)[1] + RB * S * 0.3
    fw = 512 * K
    d.rectangle([gx - fw / 2, gy - fw * 0.95, gx + fw / 2, gy + fw * 0.05], outline=(80, 200, 255), width=2)
    d.ellipse([gx - 5, gy - 5, gx + 5, gy + 5], fill=(80, 200, 255))
    # The keep beyond the east edge (768 x 768 frame, ground at 95 %).
    kx, ky = cell(COLS, 5)
    kx += RB * 1.1
    ky += RB * S * 0.3
    kw = 768 * K
    d.rectangle([kx - kw / 2, ky - kw * 0.95, kx + kw / 2, ky + kw * 0.05], outline=(255, 140, 60), width=3)
    d.ellipse([kx - 6, ky - 6, kx + 6, ky + 6], fill=(255, 140, 60))
    # The attackers' catapult west of the field (512 x 512 frame, ground at 90 %).
    cx, cy = cell(-1, 5)
    cx -= HEX_W * 0.25
    cy += RB * S * 0.35
    cw = 512 * K
    d.rectangle([cx - cw / 2, cy - cw * 0.9, cx + cw / 2, cy + cw * 0.1], outline=(170, 110, 255), width=3)
    d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(170, 110, 255))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, optimize=True)
    print(f'{os.path.relpath(OUT, ROOT)}  {img.width} x {img.height}')


if __name__ == '__main__':
    main()
