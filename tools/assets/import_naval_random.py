#!/usr/bin/env python3
"""
Import the naval random-maps kit of 2026-10-17 (development tool; never packaged).

The delivery (TWO NAVAL RANDOM-MAP TEMPLATES handoff) supplies four native PNGs, all 1672 x 941
(below the 1920 x 1080 that was asked for: kept as delivered, never enlarged, never called 1080p):

    frontend.random.shattered_crown  -> shattered-crown-card.png     (type chooser, selected summary, thumbnail fallback)
    frontend.random.serpent_straits  -> serpent-straits-card.png
    random.shattered_crown.loading   -> shattered-crown-loading.png  (generated-mission loading / briefing background)
    random.serpent_straits.loading   -> serpent-straits-loading.png

plus the design inputs (reference topology graphs, layout diagrams, contracts, validation). The topology
JSONs are design inputs only: the game re-expresses the reference shapes in its generator
(packages/mapgen/src/naval/) and never imports them as a map.

  1. With --kit DIR: check the four PNGs against asset-manifest.json (SHA-256, PNG dimensions; exactly the
     four listed files in assets/), then copy byte for byte
       - assets/*.png -> assets-runtime/naval-random-v1/;
       - the masters (assets/) and the kit's documentation and design (CLAUDE_HANDOFF.txt/.html,
         START_HERE.txt, asset-manifest.json, art-sources.json, validation.json, preview.png, design/)
         -> assets-source/art/naval-random-v1/. generation-prompts.json is not taken (not an asset).
  2. Verify (always; without --kit this is all it does besides step 3): every runtime and source picture is
     the delivered bytes and the runtime folder holds nothing else.
  3. Write assets-runtime/naval-random-v1/manifest.json (relative paths `naval-random-v1/...` only, no
     delivery path): the four IDs with native size, bytes, SHA-256, fit (cover, centred) and role. The UI
     asset loader merges it (packages/ui/src/assets/manifest.ts: `frontendArt`, `navalRandomArt`).

Re-runnable and idempotent: the same kit gives the same files and the same manifest (no timestamps).

Usage: python3 tools/assets/import_naval_random.py [--kit DIR] [--dry-run]     (npm run naval-random:import -- --kit DIR)
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
NAME = 'naval-random-v1'
RUN = ROOT / 'assets-runtime' / NAME
SRC = ROOT / 'assets-source' / 'art' / NAME

DOCS = ['CLAUDE_HANDOFF.txt', 'CLAUDE_HANDOFF.html', 'START_HERE.txt', 'asset-manifest.json', 'art-sources.json', 'validation.json', 'preview.png']
EXPECTED = {
    'frontend.random.shattered_crown': 'shattered-crown-card.png',
    'frontend.random.serpent_straits': 'serpent-straits-card.png',
    'random.shattered_crown.loading': 'shattered-crown-loading.png',
    'random.serpent_straits.loading': 'serpent-straits-loading.png',
}
ROLES = {
    'frontend.random.shattered_crown': ('card', 'Random-map type chooser card, selected-type summary and save/scenario thumbnail fallback', 'The Shattered Crown: island kingdoms around a broken crown at sea'),
    'frontend.random.serpent_straits': ('card', 'Random-map type chooser card, selected-type summary and save/scenario thumbnail fallback', 'The Serpent Straits: rival harbors among winding island straits'),
    'random.shattered_crown.loading': ('loading', 'Generated-mission loading and briefing background for The Shattered Crown', ''),
    'random.serpent_straits.loading': ('loading', 'Generated-mission loading and briefing background for The Serpent Straits', ''),
}
ABSOLUTE = re.compile(r'(^[a-zA-Z]:[\\/])|(^/)|(\\)|(\.\.)')


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def png_size(p: Path) -> tuple[int, int]:
    data = p.read_bytes()[:24]
    if data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise SystemExit(f'{p}: not a PNG')
    w, h = struct.unpack('>II', data[16:24])
    return w, h


def verify(p: Path, a: dict) -> None:
    if not p.is_file():
        raise SystemExit(f'{p}: missing')
    if sha(p) != a['sha256']:
        raise SystemExit(f'{p}: not the delivered bytes (SHA-256 differs from asset-manifest.json)')
    if png_size(p) != (a['width'], a['height']):
        raise SystemExit(f'{p}: {png_size(p)}, the manifest says {a["width"]}x{a["height"]}')


def load_assets(meta: Path) -> list[dict]:
    assets = json.loads((meta / 'asset-manifest.json').read_text(encoding='utf-8'))['assets']
    ids = {a['id']: Path(a['file']).name for a in assets}
    if ids != EXPECTED:
        raise SystemExit(f'asset-manifest.json lists {ids}, expected exactly {EXPECTED}')
    return assets


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
            raise SystemExit(f'expected exactly the four listed PNGs in assets/, found {pngs}')
        for a in assets:
            verify(args.kit / a['file'], a)
        for f in DOCS:
            if not (args.kit / f).is_file():
                raise SystemExit(f'the kit lacks {f}')
        if not (args.kit / 'design').is_dir():
            raise SystemExit('the kit lacks design/')
        if not args.dry_run:
            RUN.mkdir(parents=True, exist_ok=True)
            for p in RUN.iterdir():
                if p.is_file() and p.name != 'manifest.json' and p.name not in EXPECTED.values():
                    p.unlink()
            (SRC / 'assets').mkdir(parents=True, exist_ok=True)
            for name in sorted(EXPECTED.values()):
                for dest in (RUN / name, SRC / 'assets' / name):
                    if not dest.exists() or dest.read_bytes() != (kit_assets / name).read_bytes():
                        shutil.copyfile(kit_assets / name, dest)
            for f in DOCS:
                shutil.copyfile(args.kit / f, SRC / f)
            for p in sorted((args.kit / 'design').rglob('*')):
                if p.is_file():
                    out = SRC / 'design' / p.relative_to(args.kit / 'design')
                    out.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(p, out)
        print(f'checked the four PNGs; copied them to {RUN.relative_to(ROOT)} and {(SRC / "assets").relative_to(ROOT)}, '
              f'{len(DOCS)} documents and design/ to {SRC.relative_to(ROOT)}' + (' (dry run: nothing copied)' if args.dry_run else ''))
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
    for f in DOCS + ['design/template-contracts.json', 'design/shattered_crown.topology.json', 'design/serpent_straits.topology.json']:
        if not (SRC / f).is_file():
            raise SystemExit(f'{(SRC / f).relative_to(ROOT)}: missing')

    # ------------------------------------------------------------------ manifest
    out: dict[str, dict] = {}
    for a in sorted(assets, key=lambda x: x['id']):
        name = Path(a['file']).name
        kind, role, alt = ROLES[a['id']]
        out[a['id']] = {
            'file': f'{NAME}/{name}',
            'kind': kind,
            'width': a['width'],
            'height': a['height'],
            'bytes': (RUN / name).stat().st_size,
            'sha256': a['sha256'],
            'fit': 'cover',
            'focal': [0.5, 0.5],
            'alt': alt,
            'role': role,
            'status': 'final',
            'provenance': 'Naval random-maps kit 2026-10-17 (built-in image generator). Native pixels, 1672 x 941 — below the requested 1920 x 1080, never enlarged or retouched. Copied byte for byte by tools/assets/import_naval_random.py.',
        }
    manifest = {
        'schema': 'pantheon-realms-naval-random-1',
        'notice': 'Written by tools/assets/import_naval_random.py from the naval random-maps kit of 2026-10-17 (sources: assets-source/art/naval-random-v1). '
                  'Relative paths only (naval-random-v1/...); merged by packages/ui/src/assets/manifest.ts. Decorative: every label stays live text; '
                  'the paintings illustrate the templates and are never a preview of a generated map.',
        'assets': out,
    }
    text = json.dumps(manifest, indent=1, ensure_ascii=False) + '\n'
    for f in re.findall(r'"file": "([^"]+)"', text):
        if not f.startswith(f'{NAME}/') or ABSOLUTE.search(f) or not (ROOT / 'assets-runtime' / f).is_file():
            raise SystemExit(f'manifest entry points outside {NAME}: {f}')
    if re.search(r'[A-Za-z]:[\\/]|blannder|Users', text):
        raise SystemExit('an absolute delivery path leaked into the runtime manifest')
    if args.dry_run:
        print('dry run: manifest not written')
        return 0
    path = RUN / 'manifest.json'
    if not path.exists() or path.read_text(encoding='utf-8') != text:
        path.write_text(text, encoding='utf-8')
    print(f'verified the four PNGs (SHA-256, native {assets[0]["width"]} x {assets[0]["height"]}) in {RUN.relative_to(ROOT)} and {(SRC / "assets").relative_to(ROOT)}; '
          f'wrote {path.relative_to(ROOT)}: {len(out)} assets')
    return 0


if __name__ == '__main__':
    sys.exit(main())
