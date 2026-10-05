#!/usr/bin/env python3
"""
Town layout guides for Brief 12 (development tool; never packaged in the game).

Reads assets-source/art/briefs/guides/town-placements.json (written by
`npm run art:brief12` from the content catalog) and draws, over each town's
current background, the footprint of every location as the town screen places
it: x = centre, y = foot line, width — percent of the 4:3 scene; the building
art is square, so its height is the same number of pixels as its width.
Dwellings are outlined in blue, services in gold. The guide is an attachment
for GPT-6 (what must stay an empty plot), never shown in the game.

Writes assets-source/art/briefs/guides/town.<pantheon>.layout.png (1448 x 1086).
Needs: Pillow.
"""
import json
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
GUIDES = os.path.join(ROOT, 'assets-source', 'art', 'briefs', 'guides')


def main() -> int:
    src = os.path.join(GUIDES, 'town-placements.json')
    if not os.path.exists(src):
        print('run npm run art:brief12 first', file=sys.stderr)
        return 1
    data = json.load(open(src, encoding='utf-8'))
    for town in data['towns']:
        bg_rel = town.get('background')
        bg_path = os.path.join(ROOT, 'assets-runtime', bg_rel) if bg_rel else None
        if bg_path and os.path.exists(bg_path):
            img = Image.open(bg_path).convert('RGB')
        else:
            img = Image.new('RGB', (1448, 1086), (70, 74, 80))
        w, h = img.size
        # Dim the painting so the outlines read; keep it recognisable.
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 90))
        out = img.convert('RGBA')
        out.alpha_composite(overlay)
        d = ImageDraw.Draw(out)
        for s in town['slots']:
            bw = s['width'] / 100 * w
            cx = s['x'] / 100 * w
            foot = s['y'] / 100 * h
            box = (cx - bw / 2, foot - bw, cx + bw / 2, foot)
            colour = (90, 160, 255, 255) if s['kind'] == 'dwelling' else (240, 196, 90, 255)
            d.rectangle(box, outline=colour, width=3)
            d.line((cx - bw / 2, foot, cx + bw / 2, foot), fill=(255, 255, 255, 255), width=2)
        name = os.path.join(GUIDES, f"town.{town['pantheon']}.layout.png")
        out.convert('RGB').save(name, optimize=True)
        print(f"{os.path.relpath(name, ROOT)}: {len(town['slots'])} locations")
    return 0


if __name__ == '__main__':
    sys.exit(main())
