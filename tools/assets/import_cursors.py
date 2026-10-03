#!/usr/bin/env python3
"""
Import delivered mouse cursors (development tool; never packaged in the game).

Drop the PNGs from assets-source/art/briefs/GPT6_BRIEF_7_CURSORS.md (128 x 128,
transparent, named by cursor ID, e.g. cursor.map.attack.png) into
assets-source/ui/cursors/ and run `npm run cursors:import`. Each file is scaled
to 32 x 32 px (1x) and 64 x 64 px (2x, for high-density screens), and written to
assets-runtime/ui/cursors/ with its hotspot — read from the art delivery's
delivery-manifest.json (hotspot128) when it sits beside the PNGs, else measured;
assets-runtime/ui/cursors/manifest.json registers it, and the game uses it in
place of its stand-in (packages/ui/src/assets/cursors.ts).

Hotspots (brief section 1): tip cursors (the arrow and the gauntlet) — the
opaque pixel nearest the top-left corner; the sword — its point (the rightmost
opaque pixel near the middle row), and the sword is also written turned to the
six sides of a hex (0, 60, ..., 300 degrees clockwise, `@<angle>` in the ID);
every other cursor — the centre.

Needs: Pillow.
"""
import json
import math
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets-source', 'ui', 'cursors')
OUT = os.path.join(ROOT, 'assets-runtime', 'ui', 'cursors')
MANIFEST = os.path.join(OUT, 'manifest.json')
SIZE = 32
IDS = [
    'cursor.ui.default', 'cursor.ui.pointer', 'cursor.ui.grab', 'cursor.ui.grabbing', 'cursor.ui.busy', 'cursor.blocked',
    'cursor.map.hero', 'cursor.map.town', 'cursor.map.move', 'cursor.map.move_later', 'cursor.map.attack', 'cursor.map.siege',
    'cursor.map.visit', 'cursor.map.meet', 'cursor.map.portal',
    'cursor.battle.move', 'cursor.battle.fly', 'cursor.battle.melee', 'cursor.battle.shoot', 'cursor.battle.shoot_weak',
    'cursor.battle.structure', 'cursor.battle.ability', 'cursor.battle.info', 'cursor.spell',
]
TIP = {'cursor.ui.default', 'cursor.ui.pointer'}
SWORD = 'cursor.battle.melee'


def opaque(im, x, y):
    return im.getpixel((x, y))[3] > 127


def tip_hotspot(im):
    best = None
    for y in range(im.height):
        for x in range(im.width):
            if opaque(im, x, y) and (best is None or x + y < best[0] + best[1]):
                best = (x, y)
    return best or (0, 0)


def sword_point(im):
    mid = im.height // 2
    best = None
    for y in range(mid - im.height // 12, mid + im.height // 12 + 1):
        for x in range(im.width - 1, -1, -1):
            if opaque(im, x, y):
                if best is None or x > best[0]:
                    best = (x, y)
                break
    return best or (im.width - 1, mid)


DELIVERY = os.path.join(SRC, 'delivery-manifest.json')
SCALES = {1: SIZE, 2: SIZE * 2}  # 1x (32 px) and 2x (64 px) rasters


def delivered_hotspots():
    """hotspot128 per cursor ID from the art delivery's manifest (when present)."""
    if not os.path.exists(DELIVERY):
        return {}
    data = json.load(open(DELIVERY, encoding='utf-8'))
    return {a['id']: tuple(a['hotspot128']) for a in data.get('assets', []) if 'hotspot128' in a}


def pad_to_multiple(im, k):
    """Pad a square-ish image (centred) so both sides divide by k."""
    w = -(-im.width // k) * k
    h = -(-im.height // k) * k
    if (w, h) == im.size:
        return im, (0, 0)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ox, oy = (w - im.width) // 2, (h - im.height) // 2
    out.paste(im, (ox, oy))
    return out, (ox, oy)


def write_pair(manifest, key, im, hot, n):
    """Write the 1x and 2x rasters of `im` (a master of nominal size n) and register them.
    The hotspot is given in master pixels and stored in 1x CSS pixels (CSS cursor coordinates)."""
    f1 = SCALES[1] / n
    files = {}
    for scale, px in SCALES.items():
        f = px / n
        small = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
        name = f'{key}.png' if scale == 1 else f'{key}@2x.png'
        small.save(os.path.join(OUT, name), optimize=True)
        files[scale] = f'ui/cursors/{name}'
    w1, h1 = round(im.width * f1), round(im.height * f1)
    hx = min(w1 - 1, max(0, round(hot[0] * f1 - 0.25)))
    hy = min(h1 - 1, max(0, round(hot[1] * f1 - 0.25)))
    manifest['assets'][key] = {'file': files[1], 'file2x': files[2], 'size': [w1, h1], 'hotspot': [hx, hy]}


def main():
    manifest = {'note': json.load(open(MANIFEST, encoding='utf-8')).get('note', '') if os.path.exists(MANIFEST) else '', 'assets': {}}
    os.makedirs(OUT, exist_ok=True)
    files = sorted(f for f in os.listdir(SRC) if f.endswith('.png')) if os.path.isdir(SRC) else []
    hotspots = delivered_hotspots()
    warnings = []
    for f in files:
        cid = f[:-4]
        if cid not in IDS:
            warnings.append(f'{f}: not a cursor ID of the brief (skipped)')
            continue
        im = Image.open(os.path.join(SRC, f)).convert('RGBA')
        if im.width != im.height:
            warnings.append(f'{f}: {im.width}x{im.height} is not square')
        n = im.width
        hot = hotspots.get(cid)
        if hot is None:
            hot = sword_point(im) if cid == SWORD else tip_hotspot(im) if cid in TIP else (n / 2, n / 2)
        if cid == SWORD:
            for angle in (0, 60, 120, 180, 240, 300):
                # Screen angles turn clockwise (y down); PIL turns counter-clockwise. The canvas
                # grows so the blade is never clipped, and the point (hotspot) turns with it.
                rot = im.rotate(-angle, resample=Image.BICUBIC, expand=True)
                a = math.radians(angle)
                dx, dy = hot[0] - n / 2, hot[1] - n / 2
                hx = rot.width / 2 + dx * math.cos(a) - dy * math.sin(a)
                hy = rot.height / 2 + dx * math.sin(a) + dy * math.cos(a)
                rot, (ox, oy) = pad_to_multiple(rot, n // SIZE)
                write_pair(manifest, f'{cid}@{angle}', rot, (hx + ox, hy + oy), n)
            continue
        write_pair(manifest, cid, im, hot, n)
    # Files whose source was removed are dropped.
    keep = set()
    for a in manifest['assets'].values():
        keep.add(os.path.basename(a['file']))
        keep.add(os.path.basename(a['file2x']))
    for name in os.listdir(OUT):
        if name.endswith('.png') and name not in keep:
            os.remove(os.path.join(OUT, name))
    manifest['assets'] = dict(sorted(manifest['assets'].items()))
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(manifest, fh, indent=2)
        fh.write('\n')
    for w in warnings:
        print('warning:', w)
    print(f"imported {len(files)} cursor file(s); {len(manifest['assets'])} cursor image(s) registered in assets-runtime/ui/cursors/manifest.json (1x {SIZE} px + 2x {SIZE * 2} px)")
    return 0


if __name__ == '__main__':
    sys.exit(main())
