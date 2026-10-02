#!/usr/bin/env python3
"""
Import delivered story art (development tool; never packaged in the game).

Painted art from GPT6_BRIEF_1_STORY_ART.md is delivered as PNG files named by
asset ID into assets-source/art/final/ (ASSET_PIPELINE.md §13). This script
checks each file, writes optimized runtime derivatives to assets-runtime/art/
and registers them in assets-runtime/art/manifest.json, which the game reads
by asset ID (`resolveAsset` / `resolveArt` in packages/ui/src/assets/manifest.ts).

  hero.<pantheon>.<character>.bust.png   -> art/busts/<id>.webp        (alpha kept)
  campaign.<campaign>.cover.png          -> art/covers/<id>.webp
                                          + art/cards/campaign.<campaign>.thumbnail.webp (640 x 360 card)
  ending.<campaign>.<ending>.png         -> art/endings/<id>.webp
  mission.<campaign>.<mNN>.thumbnail.png -> art/missions/mission.<campaign>.<mNN>.briefing.webp (briefing art)
                                          + art/cards/<id>.webp (640 x 360 card)

Rules: the sources are never modified; nothing is ever upscaled (derivatives
are the native size or smaller, aspect ratio kept); dialogue portraits keep
their transparency; landscape art is stored at its native size (the 2026-10-02
delivery is 1672 x 940/941, below the brief's 1920 x 1080 / 2560 x 1440 — the
resize-only export decision is the owner's and is not taken here). Cards are a
centred 16:9 crop of at most one pixel row, then reduced to 640 x 360.

Needs: Pillow with WebP support.
"""
import hashlib
import json
import os
import re
import sys
from datetime import date

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets-source', 'art', 'final')
RUNTIME = os.path.join(ROOT, 'assets-runtime')
OUT = os.path.join(RUNTIME, 'art')
MANIFEST = os.path.join(OUT, 'manifest.json')
REPORT = os.path.join(ROOT, 'assets-source', 'art', 'IMPORT_REPORT.json')

BUST_MAX_H = 1152          # 768 x 1152 from the 1024 x 1536 masters (dialogue busts are shown up to ~60 % of the screen height)
LANDSCAPE_MAX_W = 1920     # covers, endings and briefing art: native size up to 1920 wide
CARD = (640, 360)          # campaign and mission cards

PATTERNS = [
    ('bust', re.compile(r'^hero\.[a-z]+\.[a-z_]+\.bust$')),
    ('cover', re.compile(r'^campaign\.[a-z_]+\.cover$')),
    ('ending', re.compile(r'^ending\.[a-z_]+\.[a-z_]+$')),
    ('mission', re.compile(r'^mission\.[a-z_]+\.(m\d\d|twin_harbors|random)\.thumbnail$')),
]


def kind_of(asset_id):
    for kind, rx in PATTERNS:
        if rx.match(asset_id):
            return kind
    return None


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def rel(path):
    return os.path.relpath(path, RUNTIME).replace(os.sep, '/')


def save_webp(img, path, quality, **extra):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'WEBP', quality=quality, method=4, **extra)


def shrink(img, max_w=None, max_h=None):
    """Reduce (never enlarge) to fit the limits, keeping the aspect ratio."""
    w, h = img.size
    scale = 1.0
    if max_w and w > max_w:
        scale = min(scale, max_w / w)
    if max_h and h > max_h:
        scale = min(scale, max_h / h)
    if scale >= 1.0:
        return img
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def card(img):
    """Centred 16:9 crop, then reduce to CARD (refuses to enlarge)."""
    w, h = img.size
    target = CARD[0] / CARD[1]
    if w / h > target:
        cw, ch = round(h * target), h
    else:
        cw, ch = w, round(w / target)
    x, y = (w - cw) // 2, (h - ch) // 2
    cropped = img.crop((x, y, x + cw, y + ch))
    if cw < CARD[0] or ch < CARD[1]:
        raise ValueError(f'{w}x{h} is too small for a {CARD[0]}x{CARD[1]} card')
    return cropped.resize(CARD, Image.LANCZOS), (x, y, cw, ch)


def main():
    if not os.path.isdir(SRC):
        print(f'missing {SRC}', file=sys.stderr)
        return 1
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith('.png'))
    assets = {}
    warnings = []
    counts = {'bust': 0, 'cover': 0, 'ending': 0, 'mission': 0}
    today = date.today().isoformat()
    for f in files:
        asset_id = f[:-4]
        kind = kind_of(asset_id)
        if kind is None:
            warnings.append(f'{f}: not a story-art name (ASSET_PIPELINE.md §13) — skipped')
            continue
        path = os.path.join(SRC, f)
        src = Image.open(path)
        src.load()
        sw, sh = src.size
        source = {'file': f'assets-source/art/final/{f}', 'width': sw, 'height': sh, 'sha256': sha256(path)}
        note = f'Owner-delivered story art (GPT6_BRIEF_1), imported {today}; source {sw} x {sh}'
        if kind == 'bust':
            if src.mode != 'RGBA':
                warnings.append(f'{f}: dialogue portrait without transparency ({src.mode})')
            im = shrink(src.convert('RGBA'), max_h=BUST_MAX_H)
            out = os.path.join(OUT, 'busts', f'{asset_id}.webp')
            save_webp(im, out, 82, alpha_quality=90)
            # Visible bounds from the master's alpha (ignoring faint fringe below 16/255), as fractions.
            mask = src.convert('RGBA').getchannel('A').point(lambda a: 255 if a >= 16 else 0)
            bbox = mask.getbbox() or (0, 0, sw, sh)
            assets[asset_id] = {
                'file': rel(out), 'kind': 'bust', 'width': im.width, 'height': im.height,
                # Visible (non-transparent) bounds as fractions, for alignment at the dialogue boundary.
                'alphaBox': [round(bbox[0] / sw, 4), round(bbox[1] / sh, 4), round(bbox[2] / sw, 4), round(bbox[3] / sh, 4)],
                'source': source, 'provenance': f'{note}; reduced to {im.width} x {im.height}, transparency kept.',
            }
        else:
            if src.mode not in ('RGB', 'RGBA'):
                src = src.convert('RGB')
            if src.mode == 'RGBA' and src.getchannel('A').getextrema()[0] < 255:
                warnings.append(f'{f}: landscape art has transparent pixels (flattened onto black)')
            rgb = src.convert('RGB')
            large = shrink(rgb, max_w=LANDSCAPE_MAX_W)
            native = large.size == rgb.size
            size_note = f'native {large.width} x {large.height} (not upscaled)' if native else f'reduced to {large.width} x {large.height}'
            if kind == 'mission':
                big_id = asset_id[: -len('.thumbnail')] + '.briefing'
                out = os.path.join(OUT, 'missions', f'{big_id}.webp')
                save_webp(large, out, 78)
                assets[big_id] = {'file': rel(out), 'kind': 'briefing', 'width': large.width, 'height': large.height, 'source': source, 'provenance': f'{note}; briefing art, {size_note}.'}
                small, crop = card(rgb)
                out_c = os.path.join(OUT, 'cards', f'{asset_id}.webp')
                save_webp(small, out_c, 78)
                assets[asset_id] = {'file': rel(out_c), 'kind': 'card', 'width': CARD[0], 'height': CARD[1], 'crop': list(crop), 'source': source, 'provenance': f'{note}; {CARD[0]} x {CARD[1]} card (centred 16:9 crop).'}
            else:
                folder = 'covers' if kind == 'cover' else 'endings'
                out = os.path.join(OUT, folder, f'{asset_id}.webp')
                save_webp(large, out, 78)
                assets[asset_id] = {'file': rel(out), 'kind': kind, 'width': large.width, 'height': large.height, 'source': source, 'provenance': f'{note}; {size_note}.'}
                if kind == 'cover':
                    camp = asset_id.split('.')[1]
                    card_id = f'campaign.{camp}.thumbnail'
                    small, crop = card(rgb)
                    out_c = os.path.join(OUT, 'cards', f'{card_id}.webp')
                    save_webp(small, out_c, 78)
                    assets[card_id] = {'file': rel(out_c), 'kind': 'card', 'width': CARD[0], 'height': CARD[1], 'crop': list(crop), 'source': source, 'provenance': f'{note}; {CARD[0]} x {CARD[1]} campaign card from the cover (centred 16:9 crop).'}
        counts[kind] += 1
    # Remove runtime files no longer produced (a source was removed or renamed).
    produced = {os.path.normpath(os.path.join(RUNTIME, a['file'])) for a in assets.values()}
    for folder in ('busts', 'covers', 'endings', 'missions', 'cards'):
        d = os.path.join(OUT, folder)
        if not os.path.isdir(d):
            continue
        for name in os.listdir(d):
            p = os.path.normpath(os.path.join(d, name))
            if p not in produced:
                os.remove(p)
    os.makedirs(OUT, exist_ok=True)
    # The game reads the compact manifest (it is part of the start-up bundle); sources,
    # hashes, crops and notes go to the import report next to the sources.
    runtime = {
        k: {key: v[key] for key in ('file', 'kind', 'width', 'height', 'alphaBox') if key in v}
        for k, v in sorted(assets.items())
    }
    manifest = {
        'note': 'Generated by tools/assets/import_story_art.py from assets-source/art/final/ (ASSET_PIPELINE.md §13). Do not edit by hand. Sources and hashes: assets-source/art/IMPORT_REPORT.json.',
        'provenance': 'Owner-delivered story art (GPT6_BRIEF_1_STORY_ART.md, delivery 2026-10-02). Landscape art at its native size (not upscaled).',
        'assets': runtime,
    }
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(manifest, fh, indent=1)
        fh.write('\n')
    with open(REPORT, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump({'imported': today, 'warnings': warnings, 'counts': counts, 'assets': dict(sorted(assets.items()))}, fh, indent=1)
        fh.write('\n')
    for w in warnings:
        print('warning:', w)
    total = sum(os.path.getsize(os.path.join(RUNTIME, a['file'])) for a in assets.values())
    print(f"story art: {counts['bust']} busts, {counts['cover']} covers, {counts['ending']} endings, {counts['mission']} mission pictures -> {len(assets)} runtime files, {total / 1e6:.1f} MB")
    return 0


if __name__ == '__main__':
    sys.exit(main())
