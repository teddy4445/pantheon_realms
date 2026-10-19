#!/usr/bin/env python3
"""
Import the expedition, naval & siege kit of 2026-10-17 (development tool; never packaged).

The delivery (EXPEDITION, NAVAL & SIEGE handoff) supplies 13 native PNGs (the neutral ship in
three facings and its wreck, the caravan wagon in three facings, the boarding battlefield, the
unknown-army vignette, the caravan dispatch and arrival paintings, the damaged and destroyed
catapult), three vector overlays (flag template, wake, destination ring) and 28 SVG controls in
icons/. Everything else it carries (reuse/ copies of existing game files, reference/ concept
pictures, index.html and the preview files) is reference material and never enters the runtime.

  1. With --kit DIR: check every PNG against asset-manifest.json (SHA-256, PNG dimensions, alpha
     range) and the icons against design/icon-manifest.json, then copy byte for byte
       - assets/ (13 PNGs, 3 overlay SVGs, icons/ with 28 SVGs) -> assets-runtime/expedition-v1/;
       - the source masters (assets/, icons/ kept) plus generation-prompts.json,
         generation-directions-and-corrections.json, selected-outputs.json, asset-manifest.json,
         reuse-manifest.json, design/, runtime/, validation.json and the handoff
         (CLAUDE_HANDOFF.txt/.html, START_HERE.txt) -> assets-source/expedition-v1/;
       - the handoff files and design/ -> docs/expedition-v1/.
  2. Verify (always; without --kit this is all it does besides step 3): every runtime and source
     file is the delivered bytes, the runtime folder holds nothing else, no absolute path leaks.
  3. Write assets-runtime/expedition-v1/manifest.json (relative paths `expedition-v1/...` only):
       - `assets`: every new picture by its kit ID (`expedition.ship-e`, ...) with native size,
         bytes, SHA-256, alpha range, visible bounds (pixels and normalized), ground anchor and the
         runtime display notes; the overlays (`expedition.overlay.*`) and the 28 controls
         (`expedition.icon.*`, with the Icon name the interface draws them under);
       - `mapTokens`: the ship, the wagon (painted E/NE/SE, mirrored W/NW/SW per
         design/animation-contract.json) and the wreck, for the presentation sprite manifest.
     The UI asset loader merges it (packages/ui/src/assets/manifest.ts); it never replaces the
     sprite, UI or siege manifests.

Usage: python3 tools/assets/import_expedition.py [--kit DIR] [--dry-run]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NAME = 'expedition-v1'
SRC = ROOT / 'assets-source' / NAME
RUN = ROOT / 'assets-runtime' / NAME
DOCS = ROOT / 'docs' / NAME

HANDOFF = ['CLAUDE_HANDOFF.txt', 'CLAUDE_HANDOFF.html', 'START_HERE.txt']
SOURCE_FILES = [
    'generation-prompts.json', 'generation-directions-and-corrections.json', 'selected-outputs.json',
    'asset-manifest.json', 'reuse-manifest.json', 'validation.json', *HANDOFF,
]
SOURCE_DIRS = ['design', 'runtime']
OVERLAYS = {
    'flag-template.svg': 'expedition.overlay.flag-template',
    'wake.svg': 'expedition.overlay.wake',
    'destination-ring.svg': 'expedition.overlay.destination-ring',
}
# The interface's Icon names for the 28 controls (packages/ui/src/assets/icons.tsx). `flag` is
# taken by the delivered objective flag (icon.ui.flag), so the ship's owner flag is `ownerFlag`.
ICON_NAMES = {
    'inspect': 'inspect', 'pin': 'pin', 'source': 'source', 'remaining': 'remaining',
    'sighting': 'sighting', 'identified': 'identified', 'scouted': 'scouted', 'stale-report': 'staleReport',
    'caravan': 'caravan', 'dispatch': 'dispatch', 'arrival': 'arrival', 'cargo': 'cargo', 'route': 'route',
    'blocked': 'blocked', 'intercept': 'intercept', 'garrison': 'garrison', 'ship': 'ship', 'embark': 'embark',
    'disembark': 'disembark', 'boarding': 'boarding', 'anchor': 'anchor', 'catapult': 'catapult', 'aim': 'aim',
    'fire': 'fire', 'skip': 'skip', 'wreck': 'wreck', 'flag': 'ownerFlag', 'water': 'water',
}
KINDS = {
    'ship-e': 'map-token', 'ship-ne': 'map-token', 'ship-se': 'map-token', 'ship-wreck': 'map-token',
    'wagon-e': 'map-token', 'wagon-ne': 'map-token', 'wagon-se': 'map-token',
    'boarding-battle': 'battlefield', 'scout-unknown': 'illustration',
    'caravan-dispatch-art': 'illustration', 'caravan-arrival-art': 'illustration',
    'catapult-damaged': 'siege-variant', 'catapult-destroyed': 'siege-variant',
}
NOTES = {
    'ship-wreck': 'Transient defeat/sinking aftermath of the neutral hull: shown after a confirmed defeat (sinking playback), then removed; never a persistent map object. Scale by visible bounds like the ship.',
    'boarding-battle': 'Two-ship boarding battlefield, native 1672 x 941 (below full HD: never upscaled, documented as is). Keep the aspect ratio (no crop or cover) so the board projection of design/boarding-layout.json stays valid; flags and HUD are overlays.',
    'scout-unknown': 'Generic unknown-army vignette: an anonymous illustrative mass, never a picture of the actual hidden stacks.',
    'caravan-dispatch-art': 'Text-free caravan dispatch illustration (service header); every label, price and count stays live text.',
    'caravan-arrival-art': 'Text-free caravan arrival illustration (notification); every label and count stays live text.',
    'catapult-damaged': 'Damaged stage of siege.catapult.intact (engine HP 1-60). Faces left like the intact engine; normalize by visible bounds (the transparent margins differ). Mapped by the siege renderer.',
    'catapult-destroyed': 'Destroyed stage of siege.catapult.intact (engine HP 0): non-blocking wreck. Faces left; normalize by visible bounds. Mapped by the siege renderer.',
}
DIRECTIONS = ['e', 'ne', 'se', 'w', 'nw', 'sw']
EXPECTED_PNGS = 13
EXPECTED_ICONS = 28
ABSOLUTE = re.compile(r'(^[a-zA-Z]:[\\/])|(^/)|(\\)|(\.\.)')


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def png_info(p: Path) -> dict:
    """Width, height and colour type from the IHDR chunk (no decoding)."""
    data = p.read_bytes()[:33]
    if data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise SystemExit(f'{p}: not a PNG')
    w, h = struct.unpack('>II', data[16:24])
    return {'width': w, 'height': h, 'bitDepth': data[24], 'colorType': data[25]}


def alpha_range(p: Path) -> list[int] | None:
    """The alpha channel's extrema (Pillow, when installed; None otherwise)."""
    try:
        from PIL import Image  # noqa: PLC0415
    except ImportError:
        return None
    with Image.open(p) as im:
        if im.mode != 'RGBA':
            im = im.convert('RGBA')
        lo, hi = im.getchannel('A').getextrema()
    return [lo, hi]


def svg_viewbox(p: Path) -> list[float]:
    text = p.read_text(encoding='utf-8')
    if not text.lstrip().startswith('<svg') or '<script' in text.lower() or 'href=' in text.lower():
        raise SystemExit(f'{p}: not a plain inline SVG (scripts and external references are refused)')
    m = re.search(r'viewBox="([^"]+)"', text)
    if not m:
        raise SystemExit(f'{p}: SVG without a viewBox')
    return [float(x) if '.' in x else int(x) for x in m.group(1).split()]


def stem(file: str) -> str:
    return Path(file).name[:-4]


def check_delivery(kit_assets: Path, assets: list[dict], icons: list[dict]) -> None:
    """The delivery is complete and every picture is the manifest's bytes."""
    pngs = sorted(p.name for p in kit_assets.glob('*.png'))
    listed = sorted(Path(a['file']).name for a in assets)
    if pngs != listed or len(listed) != EXPECTED_PNGS:
        raise SystemExit(f'expected the {EXPECTED_PNGS} listed PNGs in assets/, found {pngs}')
    svgs = sorted(p.name for p in kit_assets.glob('*.svg'))
    if svgs != sorted(OVERLAYS):
        raise SystemExit(f'expected the overlays {sorted(OVERLAYS)} in assets/, found {svgs}')
    icon_files = sorted(p.name for p in (kit_assets / 'icons').glob('*.svg'))
    if icon_files != sorted(Path(i['file']).name for i in icons) or len(icon_files) != EXPECTED_ICONS:
        raise SystemExit(f'expected the {EXPECTED_ICONS} listed icons in assets/icons/, found {len(icon_files)}')
    others = [p.name for p in kit_assets.iterdir() if p.is_dir() and p.name != 'icons']
    if others:
        raise SystemExit(f'unexpected folders in assets/: {others}')


def verify_png(p: Path, a: dict) -> dict:
    if not p.exists():
        raise SystemExit(f'{p.relative_to(ROOT) if ROOT in p.parents else p}: missing')
    if sha(p) != a['sha256']:
        raise SystemExit(f'{p}: not the delivered bytes (SHA-256 differs from asset-manifest.json)')
    info = png_info(p)
    if (info['width'], info['height']) != (a['width'], a['height']):
        raise SystemExit(f'{p}: {info["width"]}x{info["height"]}, the manifest says {a["width"]}x{a["height"]}')
    if a['alphaRange'][0] < 255 and info['colorType'] not in (4, 6):
        raise SystemExit(f'{p}: the manifest lists transparency but the PNG has no alpha channel')
    return info


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--kit', type=Path, default=None, help='the delivered kit folder (copies it in); without it: verify and rewrite the manifest')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    meta = args.kit if args.kit else SRC
    assets = json.loads((meta / 'asset-manifest.json').read_text(encoding='utf-8'))['assets']
    icons = json.loads((meta / 'design' / 'icon-manifest.json').read_text(encoding='utf-8'))['icons']
    contract = json.loads((meta / 'design' / 'animation-contract.json').read_text(encoding='utf-8'))
    if len(assets) != EXPECTED_PNGS or len(icons) != EXPECTED_ICONS:
        print(f'expected {EXPECTED_PNGS} pictures and {EXPECTED_ICONS} icons, the manifests list {len(assets)} and {len(icons)}')
        return 1

    if args.kit:
        kit_assets = args.kit / 'assets'
        check_delivery(kit_assets, assets, icons)
        for a in assets:
            verify_png(args.kit / a['file'], a)
            got = alpha_range(args.kit / a['file'])
            if got is not None and got != list(a['alphaRange']):
                raise SystemExit(f'{a["file"]}: alpha range {got}, the manifest says {a["alphaRange"]}')
        for i in icons:
            if svg_viewbox(args.kit / i['file']) != list(i['viewBox']):
                raise SystemExit(f'{i["file"]}: viewBox differs from icon-manifest.json')
        for f in [*SOURCE_FILES]:
            if not (args.kit / f).is_file():
                raise SystemExit(f'the kit lacks {f}')
        if not args.dry_run:
            # Runtime: the delivered assets/ folder exactly (icons/ kept), nothing else.
            if RUN.exists():
                for p in RUN.rglob('*'):
                    if p.is_file() and p.name != 'manifest.json':
                        p.unlink()
            for d in (RUN, SRC / 'assets'):
                (d / 'icons').mkdir(parents=True, exist_ok=True)
                for p in sorted(kit_assets.glob('*.png')) + sorted(kit_assets.glob('*.svg')):
                    shutil.copyfile(p, d / p.name)
                for p in sorted((kit_assets / 'icons').glob('*.svg')):
                    shutil.copyfile(p, d / 'icons' / p.name)
            for f in SOURCE_FILES:
                shutil.copyfile(args.kit / f, SRC / f)
            for dname in SOURCE_DIRS:
                for p in sorted((args.kit / dname).rglob('*')):
                    if p.is_file():
                        out = SRC / dname / p.relative_to(args.kit / dname)
                        out.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(p, out)
            DOCS.mkdir(parents=True, exist_ok=True)
            for f in HANDOFF:
                shutil.copyfile(args.kit / f, DOCS / f)
            for p in sorted((args.kit / 'design').glob('*.json')):
                (DOCS / 'design').mkdir(parents=True, exist_ok=True)
                shutil.copyfile(p, DOCS / 'design' / p.name)
        print(f'copied {EXPECTED_PNGS} PNGs, {len(OVERLAYS)} overlays and {EXPECTED_ICONS} icons to {RUN.relative_to(ROOT)} '
              f'and {(SRC / "assets").relative_to(ROOT)}; {len(SOURCE_FILES)} documents, design/ and runtime/ to {SRC.relative_to(ROOT)}; '
              f'the handoff and design/ to {DOCS.relative_to(ROOT)}')
        if args.dry_run:
            print('dry run: nothing copied, manifest not written')
            return 0

    # ------------------------------------------------------------------ verify both copies
    pngs: dict[str, dict] = {}
    for a in assets:
        name = Path(a['file']).name
        info = verify_png(RUN / name, a)
        verify_png(SRC / 'assets' / name, a)
        pngs[a['id']] = info
    svg_files = [*OVERLAYS] + [f'icons/{Path(i["file"]).name}' for i in icons]
    for rel in svg_files:
        r, s = RUN / rel, SRC / 'assets' / rel
        if not r.exists() or not s.exists() or r.read_bytes() != s.read_bytes():
            raise SystemExit(f'{rel}: the runtime copy is missing or differs from the source master')
    expected = {Path(a['file']).name for a in assets} | set(svg_files) | {'manifest.json'}
    present = {p.relative_to(RUN).as_posix() for p in RUN.rglob('*') if p.is_file()}
    extra = sorted(present - expected)
    if extra:
        raise SystemExit(f'{RUN.relative_to(ROOT)} holds files that are not runtime assets (reference or preview material?): {extra}')
    for f in [*SOURCE_FILES, 'design/animation-contract.json', 'design/icon-manifest.json', 'design/boarding-layout.json', 'runtime/ship-motion.js']:
        if not (SRC / f).is_file():
            raise SystemExit(f'{(SRC / f).relative_to(ROOT)}: missing')

    # ------------------------------------------------------------------ manifest
    out_assets: dict[str, dict] = {}
    for a in assets:
        s = stem(a['file'])
        vb = a['visibleBoundsNormalized']
        entry = {
            'file': f'{NAME}/{Path(a["file"]).name}',
            'kind': KINDS[s],
            'width': a['width'],
            'height': a['height'],
            'bytes': (RUN / Path(a['file']).name).stat().st_size,
            'sha256': a['sha256'],
            'alphaRange': a['alphaRange'],
            'visibleBoundsPixels': a['visibleBoundsPixels'],
            'visibleBounds': vb,
            'status': 'final',
            'provenance': 'Expedition, naval & siege kit 2026-10-17: ' + a['status'] + '. Copied byte for byte by tools/assets/import_expedition.py.',
        }
        if 'groundAnchor' in a:
            entry['groundAnchor'] = a['groundAnchor']
        elif KINDS[s] in ('map-token', 'siege-variant'):
            # Derived the way the kit derives the others: horizontal centre, bottom of the painted pixels.
            entry['groundAnchor'] = [0.5, vb[3]]
            entry['groundAnchorDerived'] = True
        display = a.get('runtimeDisplay')
        note = NOTES.get(s)
        if display or note:
            entry['display'] = ' '.join(x for x in (display, note) if x)
        out_assets[a['id']] = entry
    for fname, aid in OVERLAYS.items():
        vb = svg_viewbox(RUN / fname)
        out_assets[aid] = {'file': f'{NAME}/{fname}', 'kind': 'overlay', 'format': 'svg', 'viewBox': vb, 'width': vb[2], 'height': vb[3], 'sha256': sha(RUN / fname), 'status': 'final',
                           'provenance': 'Expedition kit 2026-10-17 vector overlay (flag shape, wake, destination ring); presentation only.'}
    for i in icons:
        base = Path(i['file']).name
        key = base[len('icon-'):-len('.svg')]
        if i['id'] != f'expedition.icon.{key}':
            raise SystemExit(f'{base}: unexpected icon ID {i["id"]}')
        out_assets[i['id']] = {'file': f'{NAME}/icons/{base}', 'kind': 'icon', 'format': 'svg', 'viewBox': i['viewBox'], 'width': i['viewBox'][2], 'height': i['viewBox'][3], 'iconName': ICON_NAMES[key],
                               'sha256': sha(RUN / 'icons' / base), 'status': 'final', 'provenance': 'Expedition kit 2026-10-17 control; its path is drawn by the interface Icon component under `iconName` (currentColor).'}

    def facing(aid: str) -> dict:
        e = out_assets[aid]
        return {'assetId': aid, 'file': e['file'], 'width': e['width'], 'height': e['height'], 'visibleBounds': e['visibleBounds'], 'groundAnchor': e['groundAnchor']}

    dirs = contract['directions']
    if sorted(dirs) != sorted(d.upper() for d in DIRECTIONS):
        raise SystemExit(f'animation-contract.json: expected the six directions {DIRECTIONS}, found {sorted(dirs)}')

    def directions() -> dict:
        out = {}
        for d in DIRECTIONS:
            c = dirs[d.upper()]
            painted = c['asset'].split('-', 1)[1]
            out[d] = {'facing': painted, 'flipX': bool(c['flipX'])}
        return out

    states = contract['states']
    map_tokens = {
        'ship': {
            'status': 'final',
            'provenance': 'Expedition kit 2026-10-17: one neutral hull painted in three facings (E, NE, SE); W, NW, SW mirror them (design/animation-contract.json). Never rotate the flat picture to steer.',
            'displayHexWidths': 1.2,
            'facings': {f: facing(f'expedition.ship-{f}') for f in ('e', 'ne', 'se')},
            'directions': directions(),
            'flag': {'mount': contract['flag']['mountNormalized'], 'ownerColor': contract['flag']['ownerColor'], 'mirror': contract['flag']['mirrorPolicy'], 'emptyShip': contract['flag']['emptyShip'], 'shapeAssetId': 'expedition.overlay.flag-template'},
            'wakeAssetId': 'expedition.overlay.wake',
            'wreck': 'ship-wreck',
            'motion': {k: v for k, v in states.items()},
            'reducedMotion': contract['reducedMotion'],
        },
        'wagon': {
            'status': 'final',
            'provenance': 'Expedition kit 2026-10-17: the shared caravan wagon painted in three facings (E, NE, SE); W, NW, SW mirror them. A map token with a path tween and a restrained cart bob; no horse gait strip.',
            'displayHexWidths': 1.2,
            'facings': {f: facing(f'expedition.wagon-{f}') for f in ('e', 'ne', 'se')},
            'directions': directions(),
            'motion': {'states': contract['wagon']['states'], 'travelBobPx': contract['wagon']['travelBobPx'], 'method': contract['wagon']['method']},
            'reducedMotion': contract['reducedMotion'],
        },
        'ship-wreck': {
            'status': 'final',
            'provenance': 'Expedition kit 2026-10-17: the sinking aftermath of the neutral hull (one still, mirrored with the ship it replaces).',
            'displayHexWidths': 1.2,
            'still': facing('expedition.ship-wreck'),
            'motion': {'sinking': states['sinking']},
            'reducedMotion': contract['reducedMotion'],
        },
    }

    manifest = {
        'schema': 'pantheon-realms-expedition-1',
        'notice': 'Written by tools/assets/import_expedition.py from the expedition, naval & siege kit of 2026-10-17 (sources: assets-source/expedition-v1). '
                  'Relative paths only (expedition-v1/...); merged by packages/ui/src/assets/manifest.ts (asset IDs `expedition.*`, sprite manifest `mapTokens`). '
                  'Native pixels: never resized, alpha kept. The kit\'s reused IDs (reuse-manifest.json) keep their existing registrations and are not listed here.',
        'assets': out_assets,
        'mapTokens': map_tokens,
    }
    text = json.dumps(manifest, indent=1, ensure_ascii=False) + '\n'
    for f in re.findall(r'"file": "([^"]+)"', text):
        if not f.startswith(f'{NAME}/') or ABSOLUTE.search(f) or not (ROOT / 'assets-runtime' / f).is_file():
            raise SystemExit(f'manifest entry points outside {NAME}: {f}')
    if re.search(r'[A-Za-z]:/Users|blannder', text):
        raise SystemExit('an absolute delivery path leaked into the runtime manifest')
    if args.dry_run:
        print('dry run: manifest not written')
        return 0
    (RUN / 'manifest.json').write_text(text, encoding='utf-8')
    print(f'verified {EXPECTED_PNGS} PNGs (SHA-256, dimensions, alpha), {len(OVERLAYS)} overlays and {EXPECTED_ICONS} icons in {RUN.relative_to(ROOT)} and {(SRC / "assets").relative_to(ROOT)}; '
          f'wrote {(RUN / "manifest.json").relative_to(ROOT)}: {len(out_assets)} assets, map tokens {sorted(map_tokens)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
