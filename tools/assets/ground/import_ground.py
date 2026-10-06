#!/usr/bin/env python3
"""
Import the painted ground transitions (GPT-6 Brief 17, Parts A and B; development tool,
never packaged in the game).

Sources in assets-source/sprites/final/, laid out as assets-source/sprites/ground-edges.json
(written with the guides by tools/assets/briefs/ground_guides.py):

    sheet.ground.<meadow|woodland|rocky|boggy|scree|shore>.png   black-and-white edge masks
    sheet.ground.shore.foam.png                                  transparent surf line

6 x 3 cells of 256 x 256 px (1536 x 768; an exact larger multiple is scaled down,
nothing is ever enlarged): one column per hex edge (e, se, sw, w, nw, ne), one row
per variant. Each mask is checked against the guide (white along its edge, nothing
on the other edges or beyond the band), clipped to its hex and traced into
outlines at three levels of grey; the game fills those outlines with the reaching
ground's own painting (three steps of opacity give a soft rim). Written to

    assets-runtime/sprites/final/ground/edges.json   the outlines (hex-width units around the hex centre)
    assets-runtime/sprites/final/ground/foam.webp    the foam atlas

and registered in assets-runtime/sprites/manifest.json under `ground`.

    python3 tools/assets/ground/import_ground.py [--dry-run] [--keep-going] [--self-test]

Nothing is written while a sheet has a problem, unless --keep-going (to look at an
imperfect sheet in the game before asking for a corrected one).

Needs: Pillow, numpy, scikit-image.
"""
import argparse
import json
import math
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from skimage import measure

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'assets-source' / 'sprites' / 'final'
LAYOUT = ROOT / 'assets-source' / 'sprites' / 'ground-edges.json'
OUT = ROOT / 'assets-runtime' / 'sprites' / 'final' / 'ground'
MANIFEST = ROOT / 'assets-runtime' / 'sprites' / 'manifest.json'
# Outline levels (share of white) and the opacity the game paints each with: together a soft rim, a solid core.
LEVELS = [(0.25, 0.35), (0.5, 0.5), (0.75, 1.0)]


def corner(cx, cy, r, s, k):
    a = math.radians(60 * k - 30)
    return (cx + r * math.cos(a), cy + r * math.sin(a) * s)


def hex_mask(size, cx, cy, r, s):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon([corner(cx, cy, r, s, k) for k in range(6)], fill=255)
    return np.array(m) > 127


def check_mask(a: np.ndarray, cx, cy, r, s, k, max_depth) -> list[str]:
    """a: cell luminance 0..1. White along edge k, nothing on the others, nothing beyond the band."""
    issues = []
    h, w = a.shape

    def at(x, y):
        x, y = int(round(x)), int(round(y))
        return float(a[min(h - 1, max(0, y)), min(w - 1, max(0, x))])

    def inside(px, py, f):
        return (px + (cx - px) * f, py + (cy - py) * f)

    covered = 0
    samples = [0.2 + 0.6 * i / 10 for i in range(11)]
    (x0, y0), (x1, y1) = corner(cx, cy, r, s, k), corner(cx, cy, r, s, k + 1)
    for t in samples:
        ex, ey = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        if at(*inside(ex, ey, 0.04)) > 0.5:
            covered += 1
    if covered < 0.8 * len(samples):
        issues.append(f'white along only {covered}/{len(samples)} points of its edge')
    for j in range(6):
        if j == k:
            continue
        (a0, b0), (a1, b1) = corner(cx, cy, r, s, j), corner(cx, cy, r, s, j + 1)
        mx, my = (a0 + a1) / 2, (b0 + b1) / 2
        if at(*inside(mx, my, 0.05)) > 0.25:
            issues.append(f'white on edge {j}')
    # Beyond the band: the middle of the edge pulled towards the centre by more than the band allows.
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    if at(*inside(mx, my, max_depth + 0.12)) > 0.5:
        issues.append('reaches past the band')
    return issues


def outlines(a: np.ndarray, cx, cy, hex_w):
    """Outlines of the white shape at each level, in hex-width units around the hex centre; holes are left out."""
    padded = np.pad(a, 2)
    out = []
    for li, (level, _) in enumerate(LEVELS):
        polys = []
        for c in measure.find_contours(padded, level):
            c = measure.approximate_polygon(c, tolerance=0.9)
            if len(c) < 4:
                continue
            ys, xs = c[:, 0] - 2, c[:, 1] - 2
            area = 0.5 * float(np.dot(xs, np.roll(ys, 1)) - np.dot(ys, np.roll(xs, 1)))
            if abs(area) < 8:
                continue
            polys.append((xs, ys, area))
        # A contour inside another one of the same level is a hole: left out (the brief asks for none).
        kept = []
        for i, (xs, ys, area) in enumerate(polys):
            px, py = xs[0], ys[0]
            hole = any(j != i and abs(polys[j][2]) > abs(area) and point_in(px, py, polys[j][0], polys[j][1]) for j in range(len(polys)))
            if not hole:
                kept.append((xs, ys))
        for xs, ys in kept:
            flat = []
            for x, y in zip(xs, ys):
                flat += [round((x - cx) / hex_w, 4), round((y - cy) / hex_w, 4)]
            out.append([li, flat])
    return out


def point_in(px, py, xs, ys):
    inside = False
    n = len(xs)
    for i in range(n):
        x0, y0, x1, y1 = xs[i], ys[i], xs[(i + 1) % n], ys[(i + 1) % n]
        if (y0 > py) != (y1 > py) and px < (x1 - x0) * (py - y0) / ((y1 - y0) or 1e-9) + x0:
            inside = not inside
    return inside


def load_sheet(path: Path, W: int, H: int, problems: list[str]) -> Image.Image | None:
    img = Image.open(path)
    if img.size != (W, H):
        kx, ky = img.width / W, img.height / H
        if kx < 1 or abs(kx - ky) > 1e-6 or abs(kx - round(kx)) > 1e-6:
            problems.append(f'{path.name}: {img.width} x {img.height}, expected {W} x {H} (or an exact multiple; never enlarged)')
            return None
        img = img.resize((W, H), Image.LANCZOS)
    return img


def run(src: Path, out_dir: Path, manifest_path: Path, layout_path: Path, dry: bool, keep_going: bool = False) -> int:
    lay = json.loads(layout_path.read_text(encoding='utf-8'))
    cell, cols, rows, hex_w, s = lay['cell'], lay['cols'], lay['rows'], lay['hexWidth'], lay['squash']
    r = hex_w / math.sqrt(3)
    W, H = cell * cols, cell * rows
    hm = hex_mask((cell, cell), cell / 2, cell / 2, r * 1.01, s)
    problems: list[str] = []
    edges = {}
    for name, spec in lay['characters'].items():
        f = src / lay['files'][name]
        if not f.exists():
            continue
        img = load_sheet(f, W, H, problems)
        if img is None:
            continue
        lum = np.array(img.convert('L'), dtype=np.float32) / 255.0
        per_dir = []
        for k in range(cols):
            variants = []
            for v in range(rows):
                a = lum[v * cell:(v + 1) * cell, k * cell:(k + 1) * cell] * hm
                for issue in check_mask(a, cell / 2, cell / 2, r, s, k, spec['depth'][1]):
                    problems.append(f'{f.name} cell {lay["dirs"][k]} / variant {v + 1}: {issue}')
                variants.append(outlines(a, cell / 2, cell / 2, hex_w))
            per_dir.append(variants)
        edges[name] = per_dir
    foam = None
    ff = src / lay['files']['foam']
    if ff.exists():
        img = load_sheet(ff, W, H, problems)
        if img is not None:
            img = img.convert('RGBA')
            if img.getchannel('A').getextrema()[0] == 255:
                problems.append(f'{ff.name}: needs a transparent background')
            else:
                clip = np.zeros((H, W), dtype=bool)
                for v in range(rows):
                    for k in range(cols):
                        clip[v * cell:(v + 1) * cell, k * cell:(k + 1) * cell] = hm
                arr = np.array(img)
                arr[..., 3] = np.where(clip, arr[..., 3], 0)
                foam = Image.fromarray(arr)
    if problems and not keep_going and not dry:
        print('nothing written: fix the problems below (or run with --keep-going to look at the sheets in the game anyway)')
    if not dry and (not problems or keep_going) and (edges or foam is not None):
        out_dir.mkdir(parents=True, exist_ok=True)
        manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
        ground = manifest.setdefault('ground', {})
        if edges:
            data = {'schema': 'pantheon-realms-ground-edges-1', 'hexWidth': hex_w, 'levels': [{'level': l, 'alpha': a} for l, a in LEVELS], 'priority': lay['priority'], 'characters': edges}
            (out_dir / 'edges.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
            ground['edges'] = {
                'file': 'sprites/final/ground/edges.json',
                'status': 'final',
                'characters': sorted(edges),
                'provenance': 'GPT-6 Brief 17 ground-transition masks, traced by `npm run ground:import`.',
            }
        if foam is not None:
            foam.save(out_dir / 'foam.webp', 'WEBP', quality=92, method=6)
            ground['foam'] = {
                'file': 'sprites/final/ground/foam.webp',
                'status': 'final',
                'width': W,
                'height': H,
                'cell': cell,
                'cols': cols,
                'rows': rows,
                'hexWidth': hex_w,
                'provenance': 'GPT-6 Brief 17 shore foam, imported by `npm run ground:import`.',
            }
        manifest_path.write_text(json.dumps(manifest, indent=1) + '\n')
    for p in problems:
        print('problem:', p)
    print(f'ground transitions: {len(edges)} mask sheet(s) ({", ".join(sorted(edges)) or "none"}), foam {"yes" if foam is not None else "no"}; {len(problems)} problem(s)')
    return 1 if problems else 0


def synthetic_sheet(lay, water=False, broken=False) -> Image.Image:
    """A test sheet drawn from the guide geometry: the allowed band, wobbled."""
    sys.path.insert(0, str(ROOT / 'tools' / 'assets' / 'briefs'))
    import ground_guides as g  # noqa: E402
    cell, cols, rows = lay['cell'], lay['cols'], lay['rows']
    img = Image.new('L', (cell * cols, cell * rows), 0)
    d = ImageDraw.Draw(img)
    for v in range(rows):
        for k in range(cols):
            cx, cy = k * cell + cell / 2, v * cell + cell / 2
            zone = g.allowed_zone(cx, cy, k, depth=0.3 - 0.04 * v)
            if broken and k == 0 and v == 0:
                continue
            d.polygon(zone, fill=255)
    return img


def self_test() -> int:
    lay = json.loads(LAYOUT.read_text(encoding='utf-8'))
    ok = True
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        src, out, man = tmp / 'src', tmp / 'out', tmp / 'manifest.json'
        src.mkdir()
        man.write_text(json.dumps({'schema': 'pantheon-realms-sprites-1', 'siege': {'keep': 1}}))
        for name in lay['characters']:
            synthetic_sheet(lay).save(src / lay['files'][name])
        foam = Image.new('RGBA', (lay['cell'] * lay['cols'], lay['cell'] * lay['rows']), (0, 0, 0, 0))
        foam.paste((255, 255, 255, 255), (10, 10, 40, 40))
        foam.save(src / lay['files']['foam'])
        rc = run(src, out, man, LAYOUT, dry=False)
        m = json.loads(man.read_text())
        data = json.loads((out / 'edges.json').read_text())
        ok = rc == 0 and 'siege' in m and set(m['ground']['edges']['characters']) == set(lay['characters']) and (out / 'foam.webp').exists()
        cell0 = data['characters']['meadow'][0][0]
        ok = ok and len(cell0) >= 3 and all(isinstance(p[1], list) and len(p[1]) >= 8 for p in cell0)
        # Every outline point lies inside the hex (hex-width units: within half a width).
        ok = ok and all(abs(x) <= 0.52 and abs(y) <= 0.52 for ch in data['characters'].values() for d in ch for v in d for _, flat in v for x, y in zip(flat[::2], flat[1::2]))
        synthetic_sheet(lay, broken=True).save(src / lay['files']['meadow'])
        ok = ok and run(src, out, man, LAYOUT, dry=True) == 1
        before = (out / 'edges.json').read_text()
        (out / 'edges.json').write_text('{}')
        ok = ok and run(src, out, man, LAYOUT, dry=False) == 1 and (out / 'edges.json').read_text() == '{}'
        ok = ok and run(src, out, man, LAYOUT, dry=False, keep_going=True) == 1 and (out / 'edges.json').read_text() != '{}'
        (out / 'edges.json').write_text(before)
        Image.new('L', (100, 50), 0).save(src / lay['files']['rocky'])
        ok = ok and run(src, out, man, LAYOUT, dry=True) == 1
    print('self-test', 'passed' if ok else 'FAILED')
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description='Import painted ground transitions (GPT-6 Brief 17).')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--keep-going', action='store_true', help='write the outlines even when a sheet has problems')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    return run(SRC, OUT, MANIFEST, LAYOUT, a.dry_run, a.keep_going)


if __name__ == '__main__':
    sys.exit(main())
