#!/usr/bin/env python3
"""
Import painted road sheets (GPT-6 Brief 16; development tool, never packaged in the game).

Each road type has three sheets, saved as
    assets-source/sprites/final/sheet.road.<type>.<a|b|c>.png
7 x 3 cells of 256 x 256 px (1792 x 768; an exact 2x or larger multiple is
scaled down, nothing is ever enlarged), transparent, the cells in the order of
`assets-source/sprites/road-tiles.json` (written with the guides by
`tools/assets/briefs/road_guides.py`). The importer checks every cell against
the guide geometry, clips it to its hex (a painting never spills into the next
tile) and writes one WebP atlas per sheet:

    assets-runtime/sprites/final/roads/road.<type>.<part>.webp

registered in `assets-runtime/sprites/manifest.json` under `roads` as
`<type>.<part>`. The adventure map draws painted roads on a map once all three
sheets of every road type the map needs are registered; otherwise it keeps the
roads drawn by code.

    python3 tools/assets/roads/import_roads.py [--dry-run] [--self-test]

Needs: Pillow, numpy.
"""
import argparse
import json
import math
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'assets-source' / 'sprites' / 'final'
LAYOUT = ROOT / 'assets-source' / 'sprites' / 'road-tiles.json'
OUT = ROOT / 'assets-runtime' / 'sprites' / 'final' / 'roads'
MANIFEST = ROOT / 'assets-runtime' / 'sprites' / 'manifest.json'
TYPES = ('dirt', 'cobble', 'sand', 'snow', 'boardwalk')
PARTS = ('a', 'b', 'c')


def hex_corners(cx: float, cy: float, r: float, s: float) -> list[tuple[float, float]]:
    return [(cx + r * math.cos(math.radians(60 * k - 30)), cy + r * math.sin(math.radians(60 * k - 30)) * s) for k in range(6)]


def edge_point(cx, cy, r, s, k, t):
    (x0, y0), (x1, y1) = hex_corners(cx, cy, r, s)[k], hex_corners(cx, cy, r, s)[(k + 1) % 6]
    return (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)


def check_cell(alpha: np.ndarray, cx: float, cy: float, r: float, s: float, mask: int) -> list[str]:
    """The road must reach each connected edge at its middle and stay away from the others."""
    issues = []
    h, w = alpha.shape

    def sample(x, y, rad=4):
        x0, x1 = max(0, int(x - rad)), min(w, int(x + rad + 1))
        y0, y1 = max(0, int(y - rad)), min(h, int(y + rad + 1))
        return float(alpha[y0:y1, x0:x1].mean()) if x1 > x0 and y1 > y0 else 0.0

    for k in range(6):
        mx, my = edge_point(cx, cy, r, s, k, 0.5)
        # A point just inside the edge's middle.
        ix, iy = mx + (cx - mx) * 0.06, my + (cy - my) * 0.06
        a = sample(ix, iy)
        if mask & (1 << k) and a < 128:
            issues.append(f'no road at edge {k} (alpha {a:.0f})')
        if not mask & (1 << k) and a > 96:
            issues.append(f'road at unconnected edge {k} (alpha {a:.0f})')
    return issues


def clip_to_hex(img: Image.Image, cell: int, cols: int, rows: int, r: float, s: float) -> Image.Image:
    clip = Image.new('L', img.size, 0)
    d = ImageDraw.Draw(clip)
    for row in range(rows):
        for col in range(cols):
            cx, cy = col * cell + cell / 2, row * cell + cell / 2
            # A hair larger than the hex so neighbouring tiles overlap by a pixel (no hairline gap).
            d.polygon(hex_corners(cx, cy, r * 1.01, s), fill=255)
    a = np.minimum(np.array(img.getchannel('A')), np.array(clip))
    out = img.copy()
    out.putalpha(Image.fromarray(a.astype(np.uint8)))
    return out


def run(src: Path, out_dir: Path, manifest_path: Path, layout_path: Path, dry: bool) -> int:
    lay = json.loads(layout_path.read_text(encoding='utf-8'))
    cell, cols, rows, hex_w, s = lay['cell'], lay['cols'], lay['rows'], lay['hexWidth'], lay['squash']
    r = hex_w / math.sqrt(3)
    W, H = cell * cols, cell * rows
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    roads = manifest.setdefault('roads', {})
    problems, imported = [], 0
    for t in TYPES:
        for p in PARTS:
            f = src / f'sheet.road.{t}.{p}.png'
            if not f.exists():
                continue
            img = Image.open(f)
            if img.mode != 'RGBA' or img.getchannel('A').getextrema()[0] == 255:
                problems.append(f'{f.name}: needs a transparent background')
                continue
            if img.size != (W, H):
                kx, ky = img.width / W, img.height / H
                if kx < 1 or abs(kx - ky) > 1e-6 or abs(kx - round(kx)) > 1e-6:
                    problems.append(f'{f.name}: {img.width} x {img.height}, expected {W} x {H} (or an exact multiple; never enlarged)')
                    continue
                img = img.resize((W, H), Image.LANCZOS)
            alpha = np.array(img.getchannel('A'))
            masks = [c['mask'] for c in lay['parts'][p]]
            for i, m in enumerate(masks):
                cx, cy = (i % cols) * cell + cell / 2, (i // cols) * cell + cell / 2
                for issue in check_cell(alpha, cx, cy, r, s, m):
                    problems.append(f'{f.name} cell {i} ({lay["parts"][p][i]["name"]}): {issue}')
            img = clip_to_hex(img, cell, cols, rows, r, s)
            key = f'{t}.{p}'
            rel = f'sprites/final/roads/road.{key}.webp'
            if not dry:
                out_dir.mkdir(parents=True, exist_ok=True)
                img.save(out_dir / f'road.{key}.webp', 'WEBP', quality=92, method=6)
                roads[key] = {
                    'file': rel,
                    'status': 'final',
                    'width': W,
                    'height': H,
                    'cell': cell,
                    'cols': cols,
                    'rows': rows,
                    'hexWidth': hex_w,
                    'provenance': f'GPT-6 Brief 16 road sheet {f.name}, imported by `npm run roads:import`.',
                }
            imported += 1
    if not dry and imported:
        manifest_path.write_text(json.dumps(manifest, indent=1) + '\n')
    for pr in problems:
        print('problem:', pr)
    complete = sorted({k.split('.')[0] for k in roads if all(f'{k.split(".")[0]}.{p}' in roads for p in PARTS)})
    print(f'road sheets: {imported} imported; complete road types: {", ".join(complete) or "none"}; {len(problems)} problem(s)')
    return 1 if problems else 0


def self_test() -> int:
    """Synthetic sheets drawn from the guide geometry must import cleanly; a broken cell must be reported."""
    sys.path.insert(0, str(ROOT / 'tools' / 'assets' / 'briefs'))
    import road_guides as g  # noqa: E402
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        src, out, man = tmp / 'src', tmp / 'out', tmp / 'manifest.json'
        src.mkdir()
        man.write_text(json.dumps({'schema': 'pantheon-realms-sprites-1', 'siege': {'x': {'file': 'keep'}}}))
        order = g.order()
        for p in PARTS:
            sheet = Image.new('RGBA', (g.CELL * g.COLS, g.CELL * g.ROWS), (0, 0, 0, 0))
            for i, m in enumerate(order[p]):
                cx, cy = (i % g.COLS) * g.CELL + g.CELL / 2, (i // g.COLS) * g.CELL + g.CELL / 2
                sheet.alpha_composite(g.tile_layer(sheet.size, cx, cy, m, gates=False))
            sheet.save(src / f'sheet.road.dirt.{p}.png')
        rc = run(src, out, man, LAYOUT, dry=False)
        m = json.loads(man.read_text())
        ok = rc == 0 and set(m['roads']) == {'dirt.a', 'dirt.b', 'dirt.c'} and 'siege' in m and (out / 'road.dirt.a.webp').exists()
        # A cell with its road missing is reported.
        bad = Image.open(src / 'sheet.road.dirt.a.png')
        ImageDraw.Draw(bad).rectangle([0, 0, g.CELL - 1, g.CELL - 1], fill=(0, 0, 0, 0))
        bad.save(src / 'sheet.road.dirt.a.png')
        ok = ok and run(src, out, man, LAYOUT, dry=True) == 1
        # Upscaling is refused.
        Image.new('RGBA', (100, 50), (0, 0, 0, 0)).save(src / 'sheet.road.snow.a.png')
        ok = ok and run(src, out, man, LAYOUT, dry=True) == 1
    print('self-test', 'passed' if ok else 'FAILED')
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description='Import painted road sheets (GPT-6 Brief 16).')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    return run(SRC, OUT, MANIFEST, LAYOUT, a.dry_run)


if __name__ == '__main__':
    sys.exit(main())
