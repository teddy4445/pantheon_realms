#!/usr/bin/env python3
"""
Import delivered painted art (development tool; never packaged in the game).

Painted art from the GPT-6 briefs (assets-source/art/briefs/) is delivered as PNG
files named by asset ID into assets-source/art/final/ (ASSET_PIPELINE.md §13).
This script checks each file, writes optimized runtime derivatives to
assets-runtime/art/ and registers them in assets-runtime/art/manifest.json, which
the game reads by asset ID (`resolveAsset` / `resolveArt` in
packages/ui/src/assets/manifest.ts).

Story art (Brief 1):
  hero.<pantheon>.<character>.bust.png   -> art/busts/<id>.webp        (alpha kept)
  story.herald.bust.png                  -> art/busts/<id>.webp        (the Herald, delivered 2026-10-04)
  campaign.<campaign>.cover.png          -> art/covers/<id>.webp
                                          + art/cards/campaign.<campaign>.thumbnail.webp (640 x 360 card)
  ending.<campaign>.<ending>.png         -> art/endings/<id>.webp
  mission.<campaign>.<mNN>.thumbnail.png -> art/missions/mission.<campaign>.<mNN>.briefing.webp (briefing art)
                                          + art/cards/<id>.webp (640 x 360 card)
  mission.skirmish.<map>.thumbnail.png   -> the same pair for an authored skirmish map (Brief 14: the
                                            picture in the skirmish list and the map's detail panel)
Ground and sky (Brief 2):
  terrain.<climate>.<ground>.png         -> art/terrain/<id>.webp, at most 1024 x 1024 (a power of two
                                            for mipmaps), with its average colour and wrap mode
  battlefield.<battlefield>.ground[.<climate>].png -> art/battle/<id>.webp, native size
  sky.<climate>.png                      -> art/sky/<id>.webp, native size, with its average colours
Big moments (Brief 3):
  intervention.<miracle>.card.png        -> art/miracles/<id>.webp, at most 768 x 1152 (opaque)
  splash.<pantheon>.(victory|defeat).png -> art/splashes/<id>.webp, native size up to 1920 wide (opaque)
  banner.level_up.<pantheon>.png, banner.new_week.png, banner.week.<event>.png
                                         -> art/banners/<id>.webp, at most 1536 wide, transparency and
                                            transparent padding kept (never cropped), with the measured
                                            box of its blank plaque (where the game writes its text)

Town building levels (Brief 10, cut from the level sheets by `npm run sprites:cut`):
  town.<pantheon>.support.<location>.l<N>.png -> art/town/<id>.webp, at most 512 px, transparency
                                            kept; the town shows level N of that building with it
                                            (until then every level uses the one location image)
Town art still missing (Brief 12, cut from its sheets by `npm run sprites:cut`):
  town.<pantheon>.dwelling.tier<N>.(base|upgraded).png -> art/town/<id>.webp, at most 512 px,
                                            transparency kept; replaces the cropped concept art
  town.<pantheon>.background.png          -> art/town/<id>.webp, opaque, native size up to 2048 wide
                                            (4:3; the locations keep their places on it)

Rules: the sources are never modified; nothing is ever upscaled (derivatives
are the native size or smaller, aspect ratio kept); dialogue portraits keep
their transparency; landscape art is stored at its native size (the 2026-10-02
deliveries are below the briefs' sizes — the resize-only export decision is the
owner's and is not taken here). Cards are a centred 16:9 crop of at most one
pixel row, then reduced to 640 x 360.

Runtime derivatives are reductions for display only: they do not change the
delivered masters and do not settle the briefs' exact-size exports.

Terrain and sky are drawn with a mirrored repeat until their seams are verified:
list verified asset IDs (one per line) in assets-source/art/seamless-verified.txt
and re-run to switch them to a plain repeat.

Usage: python3 tools/assets/import_story_art.py [--prune] [--self-test]
  --prune      also remove runtime files (and entries) whose source is not in
               assets-source/art/final/ — by default they are kept, so a checkout
               without every master never drops delivered art
  --self-test  check the name recognition only (no files touched)

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
SEAMLESS = os.path.join(ROOT, 'assets-source', 'art', 'seamless-verified.txt')

BUST_MAX_H = 1152          # 768 x 1152 from the 1024 x 1536 masters (dialogue busts are shown up to ~60 % of the screen height)
LANDSCAPE_MAX_W = 1920     # covers, endings and briefing art: native size up to 1920 wide
CARD = (640, 360)          # campaign and mission cards
TERRAIN_MAX = 1024         # ground textures: 1024 x 1024 runtime (the brief's size), never enlarged
WIDE_MAX_W = 4096          # battlefield grounds and skies: native size up to the briefs' 4096 px
MIRACLE_MAX_H = 1152       # miracle cards: 768 x 1152 from 1024 x 1536 (shown up to ~70 % of the screen height)
SPLASH_MAX_W = 1920        # victory/defeat splashes: native size up to 1920 wide
BANNER_MAX_W = 1536        # level-up and new-week banners: at most 1536 wide (the brief's design width)

PATTERNS = [
    ('bust', re.compile(r'^hero\.[a-z]+\.[a-z_]+\.bust$')),
    ('bust', re.compile(r'^story\.herald\.bust$')),   # the Herald (skirmish briefings), an ordinary messenger
    ('cover', re.compile(r'^campaign\.[a-z_]+\.cover$')),
    ('ending', re.compile(r'^ending\.[a-z_]+\.[a-z_]+$')),
    ('mission', re.compile(r'^mission\.[a-z_]+\.(m\d\d|twin_harbors|random)\.thumbnail$')),
    ('mission', re.compile(r'^mission\.skirmish\.[a-z_]+\.thumbnail$')),   # authored skirmish maps (Brief 14)
    ('terrain', re.compile(r'^terrain\.[a-z_]+\.(plains|forest|rough|marsh|mountain|water)$')),
    ('battlefield', re.compile(r'^battlefield\.[a-z_]+\.ground(\.[a-z_]+)?$')),
    ('sky', re.compile(r'^sky\.[a-z_]+$')),
    ('miracle', re.compile(r'^intervention\.[a-z_]+\.card$')),
    ('splash', re.compile(r'^splash\.[a-z]+\.(victory|defeat)$')),
    ('banner', re.compile(r'^banner\.(level_up\.[a-z]+|new_week|week\.[a-z_]+)$')),
    ('building', re.compile(r'^town\.[a-z]+\.support\.[a-z_]+\.l\d$')),
    ('building', re.compile(r'^town\.[a-z]+\.dwelling\.tier[1-7]\.(base|upgraded)$')),
    ('background', re.compile(r'^town\.[a-z]+\.background(?:\.l[1-4])?$')),
]
TOWN_BG_MAX_W = 2048       # town backgrounds: native size up to 2048 wide (Brief 12: 2048 x 1536)
BUILDING_MAX = 512         # town building level art: at most 512 px on the long side (shown at ~150–300 px)

# The brief's nominal plaque (about 60 % x 45 %, centred) when it cannot be measured.
NOMINAL_PLAQUE = [0.2, 0.275, 0.8, 0.725]


def plaque_box(img):
    """
    The blank navy plaque of a banner, as fractions [left, top, right, bottom]:
    the largest opaque, dark, blue-dominant region crossing the centre line in the
    middle band, its height trimmed to the rows that are clear plaque across the
    middle. Generated variants differ slightly, so each file is measured.
    """
    import numpy as np
    from scipy import ndimage
    a = np.asarray(img.convert('RGBA')).astype(np.int32)
    h, w = a.shape[:2]
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    lum = (r * 299 + g * 587 + b * 114) // 1000
    mask = ndimage.binary_opening((al > 250) & (b > r + 8) & (lum < 90), iterations=3)
    lab, n = ndimage.label(mask)
    if n == 0:
        return None
    col = lab[int(h * 0.35):int(h * 0.9), w // 2 - w // 50:w // 2 + w // 50]
    ids = [i for i in np.unique(col) if i]
    if not ids:
        return None
    sizes = ndimage.sum(mask, lab, ids)
    best = ids[int(np.argmax(sizes))]
    ys, xs = np.where(lab == best)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    # Keep only the rows that are clear plaque across its middle 60 %: an
    # ornament hanging into the plaque (a lotus, a jewel) is left free of text.
    mx0, mx1 = int(x0 + (x1 - x0) * 0.2), int(x1 - (x1 - x0) * 0.2)
    navy = (al > 250) & (b > r + 8) & (lum < 90)
    clear = np.where(navy[y0:y1, mx0:mx1].mean(axis=1) >= 0.9)[0]
    if len(clear):
        y0, y1 = y0 + clear.min(), y0 + clear.max() + 1
    box = [x0 / w, y0 / h, x1 / w, y1 / h]
    # Sanity: a plaque is wide, centred and not the whole image.
    if box[2] - box[0] < 0.35 or box[2] - box[0] > 0.9 or box[3] - box[1] < 0.12 or box[3] - box[1] > 0.7:
        return None
    return [round(float(v), 4) for v in box]


def average_hex(img, box=None):
    """Average sRGB colour of an RGB image (or of a box of it) as #RRGGBB."""
    im = img.crop(box) if box else img
    r, g, b = im.resize((1, 1), Image.BOX).getpixel((0, 0))[:3]
    return f'#{r:02X}{g:02X}{b:02X}'


def seamless_verified():
    if not os.path.exists(SEAMLESS):
        return set()
    out = set()
    for line in open(SEAMLESS, encoding='utf-8'):
        line = line.split('#', 1)[0].strip()
        if line:
            out.add(line)
    return out


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


def self_test():
    """Name recognition (no files touched): every painted-art kind, the Herald's bust, and names that are refused."""
    cases = {
        'hero.greek.thaleia.bust': 'bust',
        'story.herald.bust': 'bust',
        'campaign.three_beacons.cover': 'cover',
        'terrain.moor.forest': 'terrain',
        'battlefield.grove.ground.moor': 'battlefield',
        'town.greek.support.civic_hall.l2': 'building',
        'town.norse.dwelling.tier7.upgraded': 'building',
        'town.celtic.background': 'background',
        'town.norse.background.l1': 'background',
        'town.mesoamerican.background.l4': 'background',
        'town.greek.background.l5': None,
        'town.greek.background.l0': None,
        'mission.skirmish.frostgate.thumbnail': 'mission',
        'mission.skirmish.six_thrones.thumbnail': 'mission',
        'mission.skirmish.frostgate.briefing': None,
        'story.herald.portrait': None,
        'story.someone.bust': None,
        'town.greek.dwelling.tier8.base': None,
        'icon.set.wayfarers_kit': None,
    }
    bad = [f'{k}: {kind_of(k)} (expected {v})' for k, v in cases.items() if kind_of(k) != v]
    for b in bad:
        print('self-test FAILED:', b)
    print(f'self-test: {len(cases) - len(bad)} / {len(cases)} names recognised as expected')
    return 1 if bad else 0


def main():
    if '--self-test' in sys.argv:
        return self_test()
    if not os.path.isdir(SRC):
        print(f'missing {SRC}', file=sys.stderr)
        return 1
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith('.png'))
    assets = {}
    warnings = []
    counts = {'bust': 0, 'cover': 0, 'ending': 0, 'mission': 0, 'terrain': 0, 'battlefield': 0, 'sky': 0, 'miracle': 0, 'splash': 0, 'banner': 0, 'building': 0, 'background': 0}
    today = date.today().isoformat()
    verified = seamless_verified()
    for f in files:
        asset_id = f[:-4]
        kind = kind_of(asset_id)
        if kind is None:
            warnings.append(f'{f}: not a painted-art name (ASSET_PIPELINE.md §13) — skipped')
            continue
        path = os.path.join(SRC, f)
        src = Image.open(path)
        src.load()
        sw, sh = src.size
        source = {'file': f'assets-source/art/final/{f}', 'width': sw, 'height': sh, 'sha256': sha256(path)}
        brief = 'ground and sky art (GPT6_BRIEF_2)' if kind in ('terrain', 'battlefield', 'sky') else 'big-moment art (GPT6_BRIEF_3)' if kind in ('miracle', 'splash', 'banner') else ('town art (GPT6_BRIEF_12)' if '.dwelling.' in asset_id or kind == 'background' else 'town building level art (GPT6_BRIEF_10)') if kind in ('building', 'background') else 'story art (GPT6_BRIEF_1)'
        note = f'Owner-delivered {brief}, imported {today}; source {sw} x {sh}'
        if kind == 'building':
            if src.mode != 'RGBA':
                warnings.append(f'{f}: building art without transparency ({src.mode})')
            im = src.convert('RGBA')
            if max(im.size) > BUILDING_MAX:
                k = BUILDING_MAX / max(im.size)
                im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            out = os.path.join(OUT, 'town', f'{asset_id}.webp')
            save_webp(im, out, 86, alpha_quality=90)
            assets[asset_id] = {'file': rel(out), 'kind': 'building', 'width': im.width, 'height': im.height, 'source': source, 'provenance': f'{note}; {im.width} x {im.height}, transparency kept.'}
            counts['building'] += 1
            continue
        if kind == 'background':
            im = src.convert('RGB')
            if abs(im.width / im.height - 4 / 3) > 0.02:
                warnings.append(f'{f}: {im.width} x {im.height} is not 4:3 — the town locations are placed on a 4:3 scene')
            if im.width > TOWN_BG_MAX_W:
                k = TOWN_BG_MAX_W / im.width
                im = im.resize((TOWN_BG_MAX_W, max(1, round(im.height * k))), Image.LANCZOS)
            out = os.path.join(OUT, 'town', f'{asset_id}.webp')
            save_webp(im, out, 86)
            assets[asset_id] = {'file': rel(out), 'kind': 'background', 'width': im.width, 'height': im.height, 'source': source, 'provenance': f'{note}; {im.width} x {im.height}.'}
            counts['background'] += 1
            continue
        if kind in ('miracle', 'splash', 'banner'):
            if kind == 'banner':
                if src.mode != 'RGBA' or src.getchannel('A').getextrema()[0] == 255:
                    warnings.append(f'{f}: banner without transparent pixels')
                rgba = src.convert('RGBA')
                im = shrink(rgba, max_w=BANNER_MAX_W)
                out = os.path.join(OUT, 'banners', f'{asset_id}.webp')
                save_webp(im, out, 84, alpha_quality=92)
                plaque = plaque_box(rgba)
                if plaque is None:
                    warnings.append(f'{f}: blank plaque not found; using the brief\'s nominal box')
                mask = rgba.getchannel('A').point(lambda v: 255 if v >= 16 else 0)
                bbox = mask.getbbox() or (0, 0, sw, sh)
                assets[asset_id] = {
                    'file': rel(out), 'kind': 'banner', 'width': im.width, 'height': im.height,
                    'alphaBox': [round(bbox[0] / sw, 4), round(bbox[1] / sh, 4), round(bbox[2] / sw, 4), round(bbox[3] / sh, 4)],
                    'plaque': plaque or NOMINAL_PLAQUE, 'plaqueMeasured': plaque is not None,
                    'source': source, 'provenance': f'{note}; {"reduced to" if im.size != rgba.size else "native"} {im.width} x {im.height} for display, transparency and padding kept; plaque {"measured" if plaque else "nominal"}.',
                }
            else:
                if src.mode == 'RGBA' and src.getchannel('A').getextrema()[0] < 255:
                    warnings.append(f'{f}: full painting has transparent pixels (flattened onto black)')
                rgb = src.convert('RGB')
                if kind == 'miracle':
                    im = shrink(rgb, max_h=MIRACLE_MAX_H)
                    out = os.path.join(OUT, 'miracles', f'{asset_id}.webp')
                    save_webp(im, out, 82)
                else:
                    im = shrink(rgb, max_w=SPLASH_MAX_W)
                    out = os.path.join(OUT, 'splashes', f'{asset_id}.webp')
                    save_webp(im, out, 80)
                assets[asset_id] = {
                    'file': rel(out), 'kind': kind, 'width': im.width, 'height': im.height,
                    'source': source, 'provenance': f'{note}; {"reduced to" if im.size != rgb.size else "native (not upscaled)"} {im.width} x {im.height} for display.',
                }
            counts[kind] += 1
            continue
        if kind in ('terrain', 'battlefield', 'sky'):
            if src.mode == 'RGBA' and src.getchannel('A').getextrema()[0] < 255:
                warnings.append(f'{f}: ground/sky art has transparent pixels (flattened onto black)')
            rgb = src.convert('RGB')
            wrap = 'repeat' if asset_id in verified else 'mirror'
            if kind == 'terrain':
                im = shrink(rgb, max_w=TERRAIN_MAX, max_h=TERRAIN_MAX)
                out = os.path.join(OUT, 'terrain', f'{asset_id}.webp')
                save_webp(im, out, 84)
                assets[asset_id] = {
                    'file': rel(out), 'kind': 'terrain', 'width': im.width, 'height': im.height, 'wrap': wrap, 'average': average_hex(rgb),
                    'source': source, 'provenance': f'{note}; {"reduced to" if im.size != rgb.size else "native"} {im.width} x {im.height}; seams {"verified" if wrap == "repeat" else "NOT verified (mirrored repeat)"}.',
                }
            elif kind == 'battlefield':
                im = shrink(rgb, max_w=WIDE_MAX_W)
                out = os.path.join(OUT, 'battle', f'{asset_id}.webp')
                save_webp(im, out, 84)
                assets[asset_id] = {
                    'file': rel(out), 'kind': 'battlefield', 'width': im.width, 'height': im.height,
                    'average': average_hex(rgb), 'edge': average_hex(rgb, (0, 0, sw, max(1, sh // 12))),
                    'source': source, 'provenance': f'{note}; native {im.width} x {im.height} (not upscaled), drawn once and clamped.',
                }
            else:
                im = shrink(rgb, max_w=WIDE_MAX_W)
                out = os.path.join(OUT, 'sky', f'{asset_id}.webp')
                save_webp(im, out, 82)
                hz = round(sh * 0.62)
                assets[asset_id] = {
                    'file': rel(out), 'kind': 'sky', 'width': im.width, 'height': im.height, 'wrap': wrap,
                    # The brief's horizon (62 % from the top, approximate in this delivery) and the colours
                    # above (sky) and just below it (haze).
                    'horizon': 0.62, 'average': average_hex(rgb, (0, 0, sw, hz)), 'haze': average_hex(rgb, (0, hz, sw, min(sh, hz + max(1, sh // 10)))),
                    'source': source, 'provenance': f'{note}; native {im.width} x {im.height} (not upscaled); left/right seam {"verified" if wrap == "repeat" else "NOT verified"}.',
                }
            counts[kind] += 1
            continue
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
    # Runtime files no longer produced (a source was removed, renamed — or is simply not in this
    # checkout's assets-source/art/final/): kept with their manifest entries unless --prune is given,
    # so a checkout without every master never silently drops delivered art (2026-10-04).
    prune = '--prune' in sys.argv
    produced = {os.path.normpath(os.path.join(RUNTIME, a['file'])) for a in assets.values()}
    previous = json.load(open(MANIFEST, encoding='utf-8')).get('assets', {}) if os.path.exists(MANIFEST) else {}
    kept = 0
    for asset_id, entry in previous.items():
        p = os.path.normpath(os.path.join(RUNTIME, entry['file']))
        if asset_id in assets or p in produced or not os.path.exists(p) or prune:
            continue
        assets[asset_id] = dict(entry)
        produced.add(p)
        kept += 1
    if kept:
        warnings.append(f'{kept} runtime file(s) without a source in assets-source/art/final/ kept as they are (run with --prune to remove them)')
    for folder in ('busts', 'covers', 'endings', 'missions', 'cards', 'terrain', 'battle', 'sky', 'miracles', 'splashes', 'banners', 'town'):
        d = os.path.join(OUT, folder)
        if not os.path.isdir(d):
            continue
        for name in os.listdir(d):
            p = os.path.normpath(os.path.join(d, name))
            if p not in produced:
                if prune:
                    os.remove(p)
                else:
                    warnings.append(f'{os.path.relpath(p, ROOT)}: not produced and not in the manifest — left in place (--prune removes it)')
    os.makedirs(OUT, exist_ok=True)
    # The game reads the compact manifest (it is part of the start-up bundle); sources,
    # hashes, crops and notes go to the import report next to the sources.
    runtime = {
        k: {key: v[key] for key in ('file', 'kind', 'width', 'height', 'alphaBox', 'wrap', 'average', 'edge', 'haze', 'horizon', 'plaque') if key in v}
        for k, v in sorted(assets.items())
    }
    manifest = {
        'note': 'Generated by tools/assets/import_story_art.py from assets-source/art/final/ (ASSET_PIPELINE.md §13). Do not edit by hand. Sources and hashes: assets-source/art/IMPORT_REPORT.json.',
        'provenance': 'Owner-delivered painted art (GPT6_BRIEF_1 story art, GPT6_BRIEF_2 ground and sky, GPT6_BRIEF_3 big moments; deliveries of 2026-10-02). Nothing upscaled; terrain and sky seams not verified (mirrored repeat).',
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
    print(f"painted art: {counts['bust']} busts, {counts['cover']} covers, {counts['ending']} endings, {counts['mission']} mission pictures, "
          f"{counts['terrain']} terrain, {counts['battlefield']} battlefields, {counts['sky']} skies, "
          f"{counts['miracle']} miracle cards, {counts['splash']} splashes, {counts['banner']} banners, {counts['building']} town buildings, {counts['background']} town backgrounds -> {len(assets)} runtime files, {total / 1e6:.1f} MB")
    return 0


if __name__ == '__main__':
    sys.exit(main())
