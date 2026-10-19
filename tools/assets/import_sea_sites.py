#!/usr/bin/env python3
"""
Import the coastal sites & sea salvage kit of 2026-10-17 (development tool; never packaged).

The delivery (COASTAL SITES AND SEA SALVAGE handoff) supplies eight native PNGs: two coastal watchtower
skins (warm, cold/rocky), two shipwreck silhouettes (broken mast, split hull), the three floating pickups
(Driftwood Bundle, Stone Cargo, Lost Treasury) — seven transparent 1254 x 1254 map sprites — and one opaque
1672 x 941 shipwreck expedition painting (panels only, never a battlefield):

    seaSites.coastal.watchtower.warm   -> coastal-watchtower-warm.png
    seaSites.coastal.watchtower.cold   -> coastal-watchtower-cold.png
    seaSites.shipwreck.broken.mast     -> shipwreck-broken-mast.png
    seaSites.shipwreck.split.hull      -> shipwreck-split-hull.png
    seaSites.sea.pickup.wood           -> sea-pickup-wood.png
    seaSites.sea.pickup.stone          -> sea-pickup-stone.png
    seaSites.sea.pickup.gold           -> sea-pickup-gold.png
    seaSites.shipwreck.expedition.scene -> shipwreck-expedition-scene.png

The kit's design/sea-creature-proposals.json and design/myth-rooted-creatures.json are proposals only
(not approved, and implemented separately): they are never copied by this importer.

  1. With --kit DIR: check the eight PNGs against asset-manifest.json (SHA-256, PNG dimensions, alpha
     channel; exactly the listed files in assets/), then copy byte for byte
       - assets/*.png -> assets-runtime/sea-sites-v1/ (native, never resized or retouched);
       - the masters (assets/) and the kit's documents (CLAUDE_HANDOFF.txt/.html, asset-manifest.json,
         art-sources.json, preview.png) and design contracts (interaction-contracts.json,
         asset-validation.json, browser-validation.json) -> assets-source/art/sea-sites-v1/.
  2. Verify (always; without --kit this is all it does besides step 3): every runtime and source picture
     is the delivered bytes and the runtime folder holds nothing else.
  3. Write assets-runtime/sea-sites-v1/manifest.json (relative paths `sea-sites-v1/...` only, no delivery
     path): every ID with native size, bytes, SHA-256, alpha range, the painted bounds MEASURED here (alpha
     >= 16: the kit's own bounds count faint alpha noise at the canvas edge and so span the whole canvas),
     the kit's approximate bounds and anchors kept beside them, the ground anchor (centre-bottom of the
     painted bounds), the towers' approximate flag mount, and the display size the presentation scales the
     painted bounds to (towers 2.0 hex widths tall, wreck hulls 1.55 and pickups 0.62 hex widths wide —
     presentation only, never a collision footprint). The UI asset loader merges it
     (packages/ui/src/assets/manifest.ts: `seaSiteArt`; presentation/src/seaSites.ts draws it).

Re-runnable and idempotent: the same kit gives the same files and the same manifest (no timestamps).
Needs Pillow (bounds measurement).

Usage: python3 tools/assets/import_sea_sites.py [--kit DIR] [--dry-run]     (npm run sea-sites:import -- --kit DIR)
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
NAME = 'sea-sites-v1'
RUN = ROOT / 'assets-runtime' / NAME
SRC = ROOT / 'assets-source' / 'art' / NAME

DOCS = ['CLAUDE_HANDOFF.txt', 'CLAUDE_HANDOFF.html', 'asset-manifest.json', 'art-sources.json', 'preview.png']
DESIGN = ['interaction-contracts.json', 'asset-validation.json', 'browser-validation.json']
NEVER = ['sea-creature-proposals.json', 'myth-rooted-creatures.json']
EXPECTED = {
    'seaSites.coastal.watchtower.warm': 'coastal-watchtower-warm.png',
    'seaSites.coastal.watchtower.cold': 'coastal-watchtower-cold.png',
    'seaSites.shipwreck.broken.mast': 'shipwreck-broken-mast.png',
    'seaSites.shipwreck.split.hull': 'shipwreck-split-hull.png',
    'seaSites.sea.pickup.wood': 'sea-pickup-wood.png',
    'seaSites.sea.pickup.stone': 'sea-pickup-stone.png',
    'seaSites.sea.pickup.gold': 'sea-pickup-gold.png',
    'seaSites.shipwreck.expedition.scene': 'shipwreck-expedition-scene.png',
}
# kind, display measure, hex widths (the handoff's bands: towers 1.8-2.2 tall, hulls 1.4-1.7 wide, pickups 0.55-0.7 wide).
DISPLAY = {
    'seaSites.coastal.watchtower.warm': ('map-sprite', 'height', 2.0),
    'seaSites.coastal.watchtower.cold': ('map-sprite', 'height', 2.0),
    'seaSites.shipwreck.broken.mast': ('map-sprite', 'width', 1.55),
    'seaSites.shipwreck.split.hull': ('map-sprite', 'width', 1.55),
    'seaSites.sea.pickup.wood': ('map-sprite', 'width', 0.62),
    'seaSites.sea.pickup.stone': ('map-sprite', 'width', 0.62),
    'seaSites.sea.pickup.gold': ('map-sprite', 'width', 0.62),
    'seaSites.shipwreck.expedition.scene': ('illustration', None, None),
}
NOTES = {
    'seaSites.coastal.watchtower.warm': 'Coastal watchtower, warm skin (sand / temperate coasts). Static: no bob, no flame; the owner flag is a runtime overlay at the bare mast (never tint the sprite). A biome skin, not a level or a reward.',
    'seaSites.coastal.watchtower.cold': 'Coastal watchtower, cold / rocky skin (rock, cool, marsh-adjacent coasts). Static; owner flag overlay at the mast.',
    'seaSites.shipwreck.broken.mast': 'Shipwreck landmark, broken mast with torn sail. Almost static (bob <= 0.4 px, roll <= 0.15 deg); its name, guards and reward are site data, never read from the picture.',
    'seaSites.shipwreck.split.hull': 'Shipwreck landmark, split exposed hull. Almost static; interchangeable with the broken-mast skin.',
    'seaSites.sea.pickup.wood': 'Driftwood Bundle (Wood salvage). Gentle bob 0.8-1.5 px over 3-4 s (none under reduced motion); 250 ms fade when collected.',
    'seaSites.sea.pickup.stone': 'Stone Cargo (Stone salvage) on a barrel raft. Gentle bob; 250 ms fade when collected.',
    'seaSites.sea.pickup.gold': 'Lost Treasury (Gold salvage) on a barrel raft. Gentle bob; 250 ms fade when collected.',
    'seaSites.shipwreck.expedition.scene': 'Shipwreck expedition painting for the wreck and reward panels, native 1672 x 941 (below full HD, never upscaled). Never a playable battle background; it does not show which guards are aboard.',
}
ALPHA_THRESHOLD = 16
ABSOLUTE = re.compile(r'(^[a-zA-Z]:[\\/])|(^/)|(\\)|(\.\.)')


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def png_info(p: Path) -> dict:
    data = p.read_bytes()[:33]
    if data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise SystemExit(f'{p}: not a PNG')
    w, h = struct.unpack('>II', data[16:24])
    return {'width': w, 'height': h, 'colorType': data[25]}


def measure(p: Path) -> tuple[list[int], list[int]]:
    """Alpha extrema and the painted bounds (alpha >= ALPHA_THRESHOLD) as [x0, y0, x1, y1] pixels (x1, y1 exclusive)."""
    try:
        from PIL import Image  # noqa: PLC0415
    except ImportError as e:  # pragma: no cover
        raise SystemExit('Pillow is needed to measure the painted bounds (pip install pillow)') from e
    with Image.open(p) as im:
        rgba = im.convert('RGBA')
        a = rgba.getchannel('A')
        lo, hi = a.getextrema()
        box = a.point(lambda v: 255 if v >= ALPHA_THRESHOLD else 0).getbbox() or (0, 0, rgba.width, rgba.height)
    return [lo, hi], [box[0], box[1], box[2], box[3]]


def verify(p: Path, a: dict) -> dict:
    if not p.is_file():
        raise SystemExit(f'{p}: missing')
    if sha(p) != a['sha256']:
        raise SystemExit(f'{p}: not the delivered bytes (SHA-256 differs from asset-manifest.json)')
    info = png_info(p)
    if (info['width'], info['height']) != (a['width'], a['height']):
        raise SystemExit(f'{p}: {info["width"]}x{info["height"]}, the manifest says {a["width"]}x{a["height"]}')
    if a['alphaRange'][0] < 255 and info['colorType'] not in (4, 6):
        raise SystemExit(f'{p}: the manifest lists transparency but the PNG has no alpha channel')
    return info


def load_assets(meta: Path) -> list[dict]:
    assets = json.loads((meta / 'asset-manifest.json').read_text(encoding='utf-8'))['assets']
    ids = {a['id']: Path(a['file']).name for a in assets}
    if ids != EXPECTED:
        raise SystemExit(f'asset-manifest.json lists {ids}, expected exactly {EXPECTED}')
    return assets


def copy_if_changed(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists() or dest.read_bytes() != src.read_bytes():
        shutil.copyfile(src, dest)


def r5(x: float) -> float:
    return round(x, 5)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--kit', type=Path, default=None, help='the delivered kit folder (copies it in); without it: verify and rewrite the manifest')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    meta = args.kit if args.kit else SRC
    assets = load_assets(meta)

    if args.kit:
        kit_assets = args.kit / 'assets'
        pngs = sorted(p.name for p in kit_assets.glob('*.png'))
        if pngs != sorted(EXPECTED.values()) or [p for p in kit_assets.iterdir() if p.is_dir()]:
            raise SystemExit(f'expected exactly the eight listed PNGs in assets/, found {pngs}')
        for a in assets:
            verify(args.kit / a['file'], a)
            got, _ = measure(args.kit / a['file'])
            if got != list(a['alphaRange']):
                raise SystemExit(f'{a["file"]}: alpha range {got}, the manifest says {a["alphaRange"]}')
        for f in DOCS:
            if not (args.kit / f).is_file():
                raise SystemExit(f'the kit lacks {f}')
        for f in DESIGN:
            if not (args.kit / 'design' / f).is_file():
                raise SystemExit(f'the kit lacks design/{f}')
        if not args.dry_run:
            RUN.mkdir(parents=True, exist_ok=True)
            for p in RUN.iterdir():
                if p.is_file() and p.name != 'manifest.json' and p.name not in EXPECTED.values():
                    p.unlink()
            for name in sorted(EXPECTED.values()):
                copy_if_changed(kit_assets / name, RUN / name)
                copy_if_changed(kit_assets / name, SRC / 'assets' / name)
            for f in DOCS:
                copy_if_changed(args.kit / f, SRC / f)
            for f in DESIGN:
                copy_if_changed(args.kit / 'design' / f, SRC / 'design' / f)
        print(f'checked the eight PNGs; copied them to {RUN.relative_to(ROOT)} and {(SRC / "assets").relative_to(ROOT)}, '
              f'{len(DOCS)} documents and {len(DESIGN)} design contracts to {SRC.relative_to(ROOT)} (creature proposals never copied)'
              + (' (dry run: nothing copied)' if args.dry_run else ''))
        if args.dry_run:
            return 0

    # ------------------------------------------------------------------ verify both copies
    for a in assets:
        name = Path(a['file']).name
        verify(RUN / name, a)
        verify(SRC / 'assets' / name, a)
    present = sorted(p.name for p in RUN.iterdir() if p.is_file())
    extra = [x for x in present if x not in set(EXPECTED.values()) | {'manifest.json'}]
    if extra or any(p.is_dir() for p in RUN.iterdir()):
        raise SystemExit(f'{RUN.relative_to(ROOT)} holds files that are not runtime assets: {extra}')
    for f in DOCS + [f'design/{x}' for x in DESIGN]:
        if not (SRC / f).is_file():
            raise SystemExit(f'{(SRC / f).relative_to(ROOT)}: missing')
    for f in NEVER:
        if (SRC / 'design' / f).exists():
            raise SystemExit(f'{(SRC / "design" / f).relative_to(ROOT)}: creature proposals are not imported (remove it)')

    # ------------------------------------------------------------------ manifest
    out: dict[str, dict] = {}
    for a in sorted(assets, key=lambda x: x['id']):
        name = Path(a['file']).name
        kind, measure_by, hexes = DISPLAY[a['id']]
        alpha, box = measure(RUN / name)
        w, h = a['width'], a['height']
        vb = [r5(box[0] / w), r5(box[1] / h), r5(box[2] / w), r5(box[3] / h)]
        entry = {
            'file': f'{NAME}/{name}',
            'kind': kind,
            'width': w,
            'height': h,
            'bytes': (RUN / name).stat().st_size,
            'sha256': a['sha256'],
            'alphaRange': alpha,
            'visibleBoundsPixels': box,
            'visibleBounds': vb,
            'visibleBoundsMethod': f'alpha >= {ALPHA_THRESHOLD} (measured by the importer)',
            'kitVisibleBoundsPixels': a['visibleBoundsPixels'],
            'kitAnchorApprox': a['anchorNormalizedApprox'],
            'status': 'final',
            'display': NOTES[a['id']],
            'provenance': 'Coastal sites & sea salvage kit 2026-10-17 (built-in image generator). Native pixels, never resized or retouched. Copied byte for byte by tools/assets/import_sea_sites.py.',
        }
        if kind == 'map-sprite':
            entry['groundAnchor'] = [r5((vb[0] + vb[2]) / 2), vb[3]]
            entry['displayMeasure'] = measure_by
            entry['displayHexWidths'] = hexes
        if 'flagAnchorNormalizedApprox' in a:
            entry['flagAnchorApprox'] = a['flagAnchorNormalizedApprox']
        if kind == 'illustration':
            entry['fit'] = 'contain'
            entry['alt'] = 'A small galley rows toward a wrecked ship listing on the rocks below a cliff temple; chests and barrels lie on its tilted deck.'
        out[a['id']] = entry
    manifest = {
        'schema': 'pantheon-realms-sea-sites-1',
        'notice': 'Written by tools/assets/import_sea_sites.py from the coastal sites & sea salvage kit of 2026-10-17 (sources: assets-source/art/sea-sites-v1). '
                  'Relative paths only (sea-sites-v1/...); merged by packages/ui/src/assets/manifest.ts and drawn by packages/presentation/src/seaSites.ts. '
                  'Display sizes and anchors are presentation only (never collision); owner flags, hover rings, bob and fades are runtime overlays.',
        'assets': out,
    }
    text = json.dumps(manifest, indent=1, ensure_ascii=False) + '\n'
    for f in re.findall(r'"file": "([^"]+)"', text):
        if not f.startswith(f'{NAME}/') or ABSOLUTE.search(f) or not (ROOT / 'assets-runtime' / f).is_file():
            raise SystemExit(f'manifest entry points outside {NAME}: {f}')
    if re.search(r'[A-Za-z]:[\\/]|blannder|Users|generated_images', text):
        raise SystemExit('an absolute delivery path leaked into the runtime manifest')
    if args.dry_run:
        print('dry run: manifest not written')
        return 0
    path = RUN / 'manifest.json'
    if not path.exists() or path.read_text(encoding='utf-8') != text:
        path.write_text(text, encoding='utf-8')
    print(f'verified the eight PNGs (SHA-256, native sizes, alpha) in {RUN.relative_to(ROOT)} and {(SRC / "assets").relative_to(ROOT)}; '
          f'wrote {path.relative_to(ROOT)}: {len(out)} assets')
    return 0


if __name__ == '__main__':
    sys.exit(main())
