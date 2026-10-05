#!/usr/bin/env python3
"""
Layout guides for GPT-6 Brief 14 (development tool; never packaged in the game).

Draws each authored skirmish map (packages/content/src/skirmish/maps/*.prmap.json)
as a clean top-down picture without any text — ground, roads, towns in their seat
colours and the landmarks the painting should show — and writes
assets-source/art/briefs/guides/skirmish.<map>.layout.png. The brief attaches it
as a composition reference, not as a style reference.

    python3 tools/maps/layout_guides.py
"""
import glob
import json
import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'packages', 'content', 'src', 'skirmish', 'maps')
OUT = os.path.join(ROOT, 'assets-source', 'art', 'briefs', 'guides')

GROUND = {
    'temperate': {'p': (150, 160, 92), 'f': (70, 104, 52), 'r': (150, 128, 92), 's': (104, 112, 76), 'm': (112, 102, 92), 'w': (52, 98, 140)},
    'fjord': {'p': (214, 220, 222), 'f': (64, 96, 80), 'r': (168, 170, 172), 's': (120, 130, 120), 'm': (96, 100, 108), 'w': (40, 80, 116)},
    'desert': {'p': (226, 196, 140), 'f': (110, 140, 70), 'r': (200, 160, 104), 's': (150, 150, 96), 'm': (150, 92, 66), 'w': (54, 140, 160)},
    'high_pass': {'p': (156, 166, 120), 'f': (60, 96, 70), 'r': (150, 140, 120), 's': (110, 120, 96), 'm': (104, 100, 104), 'w': (60, 110, 150)},
    'moor': {'p': (128, 136, 96), 'f': (62, 84, 56), 'r': (120, 92, 104), 's': (88, 100, 80), 'm': (92, 90, 88), 'w': (56, 76, 96)},
    'autumn': {'p': (196, 170, 96), 'f': (176, 96, 44), 'r': (160, 130, 90), 's': (130, 120, 70), 'm': (110, 100, 92), 'w': (60, 110, 150)},
    'coast': {'p': (160, 172, 100), 'f': (64, 110, 60), 'r': (170, 150, 110), 's': (110, 124, 84), 'm': (116, 108, 100), 'w': (44, 104, 150)},
}
SEAT = [(59, 115, 217), (192, 57, 43), (46, 158, 91), (201, 138, 27), (138, 79, 194), (31, 159, 166)]
KEY = {'azure': (59, 143, 224), 'crimson': (192, 57, 43), 'emerald': (46, 158, 91), 'amber': (217, 162, 27), 'violet': (142, 91, 214), 'ivory': (232, 226, 207)}
R = 14  # hex radius in pixels


def render(path):
    d = json.load(open(path))
    w, h, t = d['width'], d['height'], d['terrain']
    pal = GROUND.get(d.get('biome', 'temperate'), GROUND['temperate'])
    cells = [(q, r) for r in range(h) for q in range(w) if t[r * w + q] != 'v']
    x0 = min(q + r / 2 for q, r in cells)
    x1 = max(q + r / 2 for q, r in cells)
    sq = math.sqrt(3) * R
    img = Image.new('RGB', (int((x1 - x0 + 1.5) * sq), int((h - 1) * 1.5 * R + 2.5 * R)), (12, 14, 18))
    dr = ImageDraw.Draw(img)

    def px(q, r):
        return ((q + r / 2 - x0 + 0.75) * sq, r * 1.5 * R + 1.25 * R)

    def hexagon(cx, cy, rad):
        return [(cx + rad * math.cos(math.radians(60 * i - 30)), cy + rad * math.sin(math.radians(60 * i - 30))) for i in range(6)]

    for q, r in cells:
        cx, cy = px(q, r)
        dr.polygon(hexagon(cx, cy, R + 0.6), fill=pal[t[r * w + q]])
    for e in d['roads']:
        a, b = e.split('|')
        qa, ra = map(int, a.split(','))
        qb, rb = map(int, b.split(','))
        dr.line([px(qa, ra), px(qb, rb)], fill=(92, 60, 30), width=4)
    sites = {s['id']: s for s in d['sites']}
    for s in d['sites']:
        if s['kind'] == 'portal' and s.get('twinId') in sites and s['id'] < s['twinId']:
            o = sites[s['twinId']]
            dr.line([px(s['q'], s['r']), px(o['q'], o['r'])], fill=(200, 140, 255), width=2)
    for s in d['sites']:
        cx, cy = px(s['q'], s['r'])
        k = s['kind']
        if k == 'town':
            dr.polygon(hexagon(cx, cy, R * 1.5), fill=SEAT[s['owner'] % len(SEAT)], outline=(245, 228, 183), width=3)
        elif k == 'relic':
            dr.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(255, 122, 46), outline=(255, 241, 208), width=3)
        elif k == 'portal':
            dr.ellipse([cx - R * 0.7, cy - R * 0.7, cx + R * 0.7, cy + R * 0.7], fill=(176, 123, 255), outline=(20, 14, 8), width=2)
        elif k in ('key_gate', 'key_tent'):
            c = KEY.get(s.get('color', 'azure'), (255, 255, 255))
            if k == 'key_gate':
                dr.rectangle([cx - R * 0.75, cy - R * 0.75, cx + R * 0.75, cy + R * 0.75], fill=c, outline=(20, 14, 8), width=2)
            else:
                dr.polygon([(cx, cy - R * 0.8), (cx + R * 0.75, cy + R * 0.6), (cx - R * 0.75, cy + R * 0.6)], fill=c, outline=(20, 14, 8))
        elif k == 'monster':
            dr.ellipse([cx - R * 0.5, cy - R * 0.5, cx + R * 0.5, cy + R * 0.5], fill=(192, 57, 43), outline=(20, 14, 8), width=2)
        elif k in ('gold_mine', 'crystal_deposit'):
            c = (242, 201, 76) if k == 'gold_mine' else (155, 123, 255)
            dr.ellipse([cx - R * 0.45, cy - R * 0.45, cx + R * 0.45, cy + R * 0.45], fill=c, outline=(20, 14, 8), width=2)
        elif k in ('prison', 'artifact', 'quest_hut', 'creature_camp', 'watchtower', 'spell_shrine'):
            dr.ellipse([cx - R * 0.35, cy - R * 0.35, cx + R * 0.35, cy + R * 0.35], fill=(240, 232, 214), outline=(20, 14, 8), width=1)
    os.makedirs(OUT, exist_ok=True)
    name = os.path.basename(path).replace('.prmap.json', '')
    out = os.path.join(OUT, f'skirmish.{name}.layout.png')
    img.save(out, optimize=True)
    return out, img.size


def main():
    for p in sorted(glob.glob(os.path.join(SRC, '*.prmap.json'))):
        out, size = render(p)
        print(f'{os.path.relpath(out, ROOT)}  {size[0]} x {size[1]}')


if __name__ == '__main__':
    main()
