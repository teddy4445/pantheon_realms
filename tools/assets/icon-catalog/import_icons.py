#!/usr/bin/env python3
"""
Import delivered final icons (development tool; never packaged in the game).

Drop PNG files named exactly by their asset ID (for example
icon.spell.rune_of_tyr.png — see ICON_CATALOG.md) into assets-source/icons/final/
and run `npm run icons:import`. Each file is checked against the icon inventory,
resized to its section's size (never upscaled) and written to
assets-runtime/ui/icons/final/<asset id>.png (or .webp — see below);
assets-runtime/ui/final-manifest.json registers it, so the game shows it in place
of the stand-in by asset ID.

Icons with transparency stay PNG. Fully opaque pictures — the painted creature,
god and hero portraits, which have their own backgrounds — are written as WebP
(quality 88): about a sixth of the PNG size at the same 256 px.

Usage: python3 tools/assets/icon-catalog/import_icons.py [--new]
  --new   import only icons that are not registered yet (or whose runtime file is missing);
          every icon already imported keeps its file and manifest entry byte for byte
          (re-importing everything re-encodes the files and re-dates every entry).

Needs: Pillow.
"""
import json
import os
import re
import sys
from datetime import date

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(ROOT, 'assets-source', 'icons', 'final')
OUT_DIR = os.path.join(ROOT, 'assets-runtime', 'ui', 'icons', 'final')
MANIFEST = os.path.join(ROOT, 'assets-runtime', 'ui', 'final-manifest.json')
INVENTORY = os.path.join(ROOT, 'assets-source', 'icons', 'icon-inventory.json')


def target_size(size_text, asset_id=''):
    # The interface section's main-menu icons are larger ("menu icons 192 px").
    menu = re.search(r'menu icons (\d+)\s*px', size_text or '')
    if menu and asset_id.startswith('icon.menu.'):
        return (int(menu.group(1)), int(menu.group(1)))
    m = re.match(r'\s*(\d+)\s*[×x]\s*(\d+)', size_text or '')
    return (int(m.group(1)), int(m.group(2))) if m else (256, 256)


def main():
    inv = json.load(open(INVENTORY, encoding='utf-8')) if os.path.exists(INVENTORY) else {'sections': []}
    size_of = {}
    for s in inv['sections']:
        for r in s['rows']:
            size_of[r['assetId']] = target_size(s['size'], r['assetId'])
    manifest = json.load(open(MANIFEST, encoding='utf-8'))
    assets = manifest.setdefault('assets', {})
    os.makedirs(OUT_DIR, exist_ok=True)
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith('.png')) if os.path.isdir(SRC) else []
    imported, warnings = 0, []
    only_new = '--new' in sys.argv
    for f in files:
        asset_id = f[:-4]
        if only_new and asset_id in assets and os.path.exists(os.path.join(ROOT, 'assets-runtime', assets[asset_id]['file'])):
            continue
        if asset_id not in size_of:
            warnings.append(f'{f}: not an asset ID in the icon catalog (imported anyway — check the name)')
        w, h = size_of.get(asset_id, (256, 256))
        im = Image.open(os.path.join(SRC, f)).convert('RGBA')
        if im.width < w // 2 or im.height < h // 2:
            warnings.append(f'{f}: {im.width}×{im.height} is small for {w}×{h}')
        im.thumbnail((w, h), Image.LANCZOS)
        opaque = im.getchannel('A').getextrema()[0] == 255
        ext = 'webp' if opaque else 'png'
        out = os.path.join(OUT_DIR, f'{asset_id}.{ext}')
        if opaque:
            im.convert('RGB').save(out, 'WEBP', quality=88, method=6)
        else:
            im.save(out, optimize=True)
        # A picture that changed format leaves no stale file behind.
        stale = os.path.join(OUT_DIR, f'{asset_id}.{"png" if opaque else "webp"}')
        if os.path.exists(stale):
            os.remove(stale)
        assets[asset_id] = {
            'file': f'ui/icons/final/{asset_id}.{ext}',
            'provenance': f'Owner-delivered final art, imported {date.today().isoformat()} from assets-source/icons/final/{f}.',
        }
        imported += 1
    # Drop entries whose source file was removed.
    for asset_id in [k for k in assets if not os.path.exists(os.path.join(SRC, f'{k}.png'))]:
        del assets[asset_id]
        for ext in ('png', 'webp'):
            try:
                os.remove(os.path.join(OUT_DIR, f'{asset_id}.{ext}'))
            except FileNotFoundError:
                pass
    manifest['assets'] = dict(sorted(assets.items()))
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(manifest, fh, indent=2)
        fh.write('\n')
    for w_ in warnings:
        print('warning:', w_)
    print(f'imported {imported} final icon(s); {len(manifest["assets"])} registered in assets-runtime/ui/final-manifest.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
