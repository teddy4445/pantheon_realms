#!/usr/bin/env python3
"""
Cut GPT-6 sheets into the single files the importers read (development tool;
never packaged).

A sheet is one large image holding many sprites on an invisible grid of equal
cells: every animation of one creature form (one row per animation), all
directions of one map hero, a dozen map objects, three families' reference
views or portraits. The layout of every sheet — its grid, what each cell
holds, the scale and ground line — is in assets-source/sprites/sheet-layouts.json,
written by `npm run sprites:queue` together with GPT6_2D_CONTENT_GENERATION.md.

  1. Drop delivered sheets into assets-source/sprites/sheets/ under their exact
     names (`sheet.creature.greek.tier1.base.png`, or `<name>.part1.png` +
     `<name>.part2.png` for a sheet delivered as two row ranges).
  2. `npm run sprites:cut` cuts every new or changed sheet:
       * a background that is not transparent (flat magenta, grey, a fake
         checkerboard) is keyed out;
       * row and column cuts are moved to the emptiest line near the grid;
       * animation frames are re-aligned on the creature's feet (the median
         ground contact and foot position of each animation; airborne frames
         keep the alignment of the creature's idle row), so a figure drawn a
         little off-centre or off the ground line still stands on its anchor;
       * objects are cropped to their content and anchored at their ground
         contact; references and figures are centred on a square canvas;
         portraits are cut along the black gutters and squared.
     It writes the strips and objects (with a sidecar JSON giving frames,
     frame rate, loop, anchor and pixels per hex) to assets-source/sprites/final/,
     references to assets-source/creatures/reference/, portraits to
     assets-source/icons/final/, and a preview of every cut (frames on a
     checkerboard with the anchor and ground line) to
     assets-source/sprites/sheets/_preview/.
  3. `npm run sprites:import` (and `npm run icons:import` for portraits).

It never overwrites a file it did not cut itself (cut-log.json), unless --force.

Usage: python3 tools/assets/sprites/cut_sheets.py [--force] [--only NAME] [--dry-run] [--self-test]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[3]
LAYOUTS = ROOT / "assets-source/sprites/sheet-layouts.json"
SHEETS = ROOT / "assets-source/sprites/sheets"

ALPHA_ON = 48            # alpha above which a pixel counts as content
SEARCH = 0.22            # cut lines may move this fraction of a cell from the grid
PAD_SIDE, PAD_TOP, PAD_BOTTOM = 0.15, 0.15, 0.06   # output frame padding around a cell (fractions of the cell)
GROUND_LIFT = {"site": 0.06, "decor": 0.02, "obstacle": 0.05, "siege": 0.04}  # anchor above the bbox bottom (fraction of its height)


# ---------------------------------------------------------------------------- background

def key_background(rgba: np.ndarray) -> tuple[np.ndarray, str]:
    """Give an opaque sheet transparency by keying out its background colour(s), found on the border."""
    a = rgba.astype(np.float32)
    if (a[:, :, 3] < 250).mean() > 0.02:
        return a, "transparent"
    h, w = a.shape[:2]
    b = max(2, int(min(h, w) * 0.01))
    border = np.concatenate([a[:b].reshape(-1, 4), a[-b:].reshape(-1, 4), a[:, :b].reshape(-1, 4), a[:, -b:].reshape(-1, 4)])[:, :3]
    q = (border // 24).astype(np.int32)
    keys, inv, counts = np.unique(q, axis=0, return_inverse=True, return_counts=True)
    order = np.argsort(-counts)
    total = counts.sum()
    bgs, covered = [], 0
    for i in order[:2]:
        bgs.append(border[inv.ravel() == i].mean(axis=0))
        covered += counts[i]
        if covered / total >= 0.9:
            break
    if covered / total < 0.85:
        return a, "opaque (no flat background found)"
    rgb = a[:, :, :3]
    d = np.min(np.stack([np.linalg.norm(rgb - bg, axis=2) for bg in bgs]), axis=0)
    t1, t2 = 26.0, 70.0
    core = d < t1
    lab, n = ndimage.label(core)
    keep = np.zeros(n + 1, bool)
    if n:
        sizes = ndimage.sum(core, lab, index=np.arange(1, n + 1))
        edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        keep[edge] = True
        keep[1:] |= sizes > h * w * 0.0005  # enclosed gaps (between legs, under arms) of a real size
        keep[0] = False
    bgmask = keep[lab]
    saturated = [bg for bg in bgs if bg.max() - bg.min() > 150]
    if saturated:
        bgmask |= core  # a chroma key (magenta) never belongs to the art: key it everywhere, enclosed gaps included
    nearest = np.argmin(np.stack([np.linalg.norm(rgb - bg, axis=2) for bg in bgs]), axis=0)
    bgcol = np.stack(bgs)[nearest]
    # Edge pixels (a thin band next to the keyed background) are a mix of the figure's colour and the
    # background: estimate the figure colour from the nearby interior and unmix (alpha by projection).
    band = ndimage.binary_dilation(bgmask, iterations=3) & ~bgmask
    interior = ~ndimage.binary_dilation(bgmask, iterations=3)
    k = 9
    wint = ndimage.uniform_filter(interior.astype(np.float32), k)
    q = np.dstack([ndimage.uniform_filter(rgb[:, :, i] * interior, k) for i in range(3)]) / np.maximum(wint, 1e-6)[:, :, None]
    dq = q - bgcol
    dp = rgb - bgcol
    proj = (dp * dq).sum(axis=2) / np.maximum((dq * dq).sum(axis=2), 1.0)
    by_dist = np.clip((d - t1) / (t2 - t1), 0, 1)
    alpha = np.where(bgmask, 0.0, 1.0)
    est = np.where(wint > 0.05, np.clip(proj, 0, 1), by_dist)
    if saturated:
        # Chroma spill: how much of the key's hue a pixel carries (1 = pure key, 0 = neutral).
        cb = saturated[0] - saturated[0].mean()
        cp = rgb - rgb.mean(axis=2, keepdims=True)
        strength = (cp * cb).sum(axis=2) / float((cb * cb).sum())
        est = np.minimum(est, 1 - np.clip((strength - 0.12) / 0.75, 0, 1))
        band |= ndimage.binary_dilation(bgmask, iterations=5) & ~bgmask & (strength > 0.12)
    alpha[band] = est[band]
    al = alpha[:, :, None]
    fixed = np.where(al > 0.05, (rgb - (1 - al) * bgcol) / np.maximum(al, 0.05), rgb)
    out = np.dstack([np.clip(fixed, 0, 255), alpha * 255])
    return out, "keyed " + ", ".join("#%02x%02x%02x" % tuple(int(x) for x in bg) for bg in bgs)


# ---------------------------------------------------------------------------- grid

def refine_cuts(profile: np.ndarray, n: int) -> list[int]:
    """n+1 cut positions along a profile (content per line): each inner cut moved to the emptiest line near the grid."""
    length = len(profile)
    cell = length / n
    k = max(1, int(cell * 0.02))
    smooth = ndimage.uniform_filter1d(profile.astype(np.float64), size=k * 2 + 1)
    cuts = [0]
    for i in range(1, n):
        b = i * cell
        lo, hi = int(max(cuts[-1] + 1, b - SEARCH * cell)), int(min(length - 1, b + SEARCH * cell))
        seg = smooth[lo:hi + 1]
        if len(seg) == 0:
            cuts.append(int(round(b)))
            continue
        score = seg + (seg.max() + 1) * 0.02 * np.abs(np.arange(lo, hi + 1) - b) / cell
        cuts.append(int(lo + np.argmin(score)))
    cuts.append(length)
    return cuts


def clean_mask(alpha: np.ndarray, min_area: float) -> np.ndarray:
    m = alpha > ALPHA_ON
    lab, n = ndimage.label(m)
    if n == 0:
        return m
    sizes = ndimage.sum(m, lab, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = sizes >= max(6, min_area)
    return keep[lab]


def bbox(mask: np.ndarray) -> tuple[int, int, int, int] | None:
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def feet(mask: np.ndarray) -> tuple[float, float] | None:
    """(x of the feet, y of the ground contact) in mask coordinates."""
    bb = bbox(mask)
    if not bb:
        return None
    x0, y0, x1, y1 = bb
    band = max(1, int((y1 - y0) * 0.12))
    ys, xs = np.nonzero(mask[y1 - band:y1])
    return float(xs.mean()), float(y1)


# ---------------------------------------------------------------------------- sheets

class Problems(list):
    def add(self, sheet: str, msg: str) -> None:
        self.append(f"{sheet}: {msg}")


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def parts_of(rows: int) -> list[tuple[int, int]]:
    k = math.ceil(rows / 2)
    return [(0, k), (k, rows)]


def sources_for(name: str, lay: dict, sheets_dir: Path) -> list[tuple[Path, int, int]] | None:
    """The delivered image(s) of a sheet with the row range each covers."""
    whole = sheets_dir / lay["file"]
    if whole.exists():
        return [(whole, 0, lay["rows"])]
    stem = lay["file"][:-4]
    parts = [sheets_dir / f"{stem}.part{i}.png" for i in (1, 2)]
    if all(p.exists() for p in parts):
        return [(p, r0, r1) for p, (r0, r1) in zip(parts, parts_of(lay["rows"]))]
    return None


class Cutter:
    def __init__(self, out_root: Path, dry: bool, force: bool, log: dict, problems: Problems):
        self.root = out_root
        self.dry = dry
        self.force = force
        self.log = log
        self.problems = problems
        self.written: list[str] = []
        self.previews: list[tuple[str, list[Image.Image], tuple[float, float] | None]] = []
        self.owned = {o for e in log.values() for o in e.get("outputs", [])}

    def out_path(self, rel: str) -> Path:
        return self.root / rel

    def save(self, sheet: str, rel: str, img: Image.Image, sidecar: dict | None) -> None:
        p = self.out_path(rel)
        if p.exists() and rel not in self.owned and not self.force:
            self.problems.add(sheet, f"{rel} exists and was not cut by this tool; not overwritten (use --force)")
            return
        if not self.dry:
            p.parent.mkdir(parents=True, exist_ok=True)
            img.save(p)
            side = p.with_suffix(".json")
            if sidecar is not None:
                side.write_text(json.dumps(sidecar, indent=1) + "\n")
            elif side.exists() and rel in self.owned:
                side.unlink()
        self.written.append(rel)

    # -------------------------------------------------------------- animation rows
    def cut_animation(self, name: str, lay: dict, img: np.ndarray, r0: int, r1: int, src: str, ref_corr: dict) -> None:
        h, w = img.shape[:2]
        rows = r1 - r0
        cw, ch = w / lay["cols"], h / rows
        alpha = img[:, :, 3]
        row_cuts = refine_cuts(alpha.sum(axis=1), rows)
        ground = lay.get("groundY", 0.9)
        target = lay["target"]
        segs = [s for s in lay.get("segments", []) if r0 <= s["row"] < r1]
        cells = [c for c in lay.get("cells", []) if r0 <= c["row"] < r1]
        col_cache: dict[int, list[int]] = {}
        frames_of: dict[str, list[tuple[np.ndarray, int, int, int, int, int, int]]] = {}
        for s in sorted(segs, key=lambda s: (s["row"], s["col"])):
            r = s["row"] - r0
            ya, yb = row_cuts[r], row_cuts[r + 1]
            if r not in col_cache:
                col_cache[r] = refine_cuts(alpha[ya:yb].sum(axis=0), lay["cols"])
                self.check_count(name, lay, s["row"], alpha[ya:yb], segs, cells, cw)
            cuts = col_cache[r]
            out = []
            for j in range(s["col"], s["col"] + s["frames"]):
                xa, xb = cuts[j], cuts[j + 1]
                out.append((img[ya:yb, xa:xb], xa, ya, int(round(j * cw)), int(round(r * ch)), xb, yb))
            frames_of[s["name"]] = out
        # Alignment per segment: median feet of its grounded frames.
        corr: dict[str, tuple[float, float]] = {}
        bad: set[str] = set()
        for s in segs:
            fr = frames_of[s["name"]]
            masks = [clean_mask(f[0][:, :, 3], cw * ch * 0.002) for f in fr]
            empty = [i for i, m in enumerate(masks) if m.sum() < cw * ch * 0.004]
            allowed = {len(fr) - 1} if target == "fx" else set()
            if set(empty) - allowed:
                self.problems.add(name, f"{s['name']}: frame(s) {', '.join(str(i + 1) for i in empty)} empty — not written (wrong frame count or frames merged?)")
                bad.add(s["name"])
                continue
            if target == "fx":
                corr[s["name"]] = (0.0, 0.0)
                continue
            grounded = {"takeoff": [0], "landing": [len(fr) - 1], "fly": []}.get(s["anim"], list(range(len(fr))))
            pts = []
            for i in grounded:
                ft = feet(masks[i])
                if ft:
                    _, xa, ya, x0, y0, _, _ = fr[i]
                    pts.append((ft[0] + xa - x0, ft[1] + ya - y0))
            centres = []
            for i, m in enumerate(masks):
                bb = bbox(m)
                if bb:
                    centres.append((bb[0] + bb[2]) / 2 + fr[i][1] - fr[i][3])
            if pts:
                dx = float(np.median([p[0] for p in pts])) - cw / 2
                dy = float(np.median([p[1] for p in pts])) - ground * ch
                corr[s["name"]] = (dx, dy)
                if s["anim"] == "idle":
                    ref_corr["dx"], ref_corr["dy"] = dx / cw, dy / ch
                    ref_corr["body"] = (float(np.median(centres)) - float(np.median([p[0] for p in pts]))) / cw
            elif centres:
                ref_corr.setdefault("pending", {})[s["name"]] = float(np.median(centres))
        for s in segs:
            if s["name"] in bad:
                continue
            if s["name"] in corr:
                dx, dy = corr[s["name"]]
            elif "dx" in ref_corr:
                # Airborne frames: the idle row's height above the ground line; horizontally the body centred as in idle.
                dy = ref_corr["dy"] * ch
                centre = ref_corr.get("pending", {}).get(s["name"])
                dx = centre - ref_corr.get("body", 0.0) * cw - cw / 2 if centre is not None else ref_corr["dx"] * cw
            else:
                self.problems.add(name, f"{s['name']}: no grounded frame and no idle row to align with — not written")
                continue
            fw = int(round(cw * (1 + 2 * PAD_SIDE)))
            fh = int(round(ch * (1 + PAD_TOP + PAD_BOTTOM)))
            strip = Image.new("RGBA", (fw * s["frames"], fh), (0, 0, 0, 0))
            frames = []
            for k, (pix, xa, ya, x0, y0, xb, yb) in enumerate(frames_of[s["name"]]):
                fr = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
                tile = Image.fromarray(np.clip(pix, 0, 255).astype(np.uint8), "RGBA")
                ox = int(round(xa - x0 - dx + PAD_SIDE * cw))
                oy = int(round(ya - y0 - dy + PAD_TOP * ch))
                fr.alpha_composite(tile, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))
                frames.append(fr)
                strip.alpha_composite(fr, (k * fw, 0))
            anchor = [0.5, round((PAD_TOP * ch + ground * ch) / fh, 4)]
            ppx = round(ch / lay["cellHexes"][1], 3)
            side = {"frames": s["frames"], "fps": s["fps"], "loop": s["loop"], "anchor": anchor, "pixelsPerHex": ppx, "cutFrom": src}
            if target == "fx":
                side["additive"] = True
            self.save(name, f"assets-source/sprites/final/{s['name']}.png", strip, side)
            self.previews.append((s["name"], frames, (anchor[0], anchor[1])))
        if cells:
            self.cut_items(name, lay, img, r0, r1, src, row_cuts=row_cuts, only=cells)

    def check_count(self, name: str, lay: dict, row: int, band: np.ndarray, segs: list, cells: list, cw: float) -> None:
        expected = sum(s["frames"] for s in segs if s["row"] == row) + sum(1 for c in cells if c["row"] == row)
        cols = (band > ALPHA_ON).sum(axis=0) > 0
        gap = max(2, int(cw * 0.03))
        runs, inside, empty_run = 0, False, gap
        for v in cols:
            if v:
                if not inside and empty_run >= gap:
                    runs += 1
                inside, empty_run = True, 0
            else:
                empty_run += 1
                if empty_run >= gap:
                    inside = False
        if lay["target"] != "fx" and runs != expected:
            self.problems.add(name, f"row {row + 1}: found {runs} separate figures, expected {expected} (frames touching, missing or extra?) — cut by the grid; check the preview")

    # -------------------------------------------------------------- objects, references, figures
    def cut_items(self, name: str, lay: dict, img: np.ndarray, r0: int, r1: int, src: str, row_cuts: list[int] | None = None, only: list | None = None) -> None:
        h, w = img.shape[:2]
        rows = r1 - r0
        cw, ch = w / lay["cols"], h / rows
        alpha = img[:, :, 3]
        row_cuts = row_cuts or refine_cuts(alpha.sum(axis=1), rows)
        ppx = round(ch / lay["cellHexes"][1], 3)
        for c in only if only is not None else [c for c in lay.get("cells", []) if r0 <= c["row"] < r1]:
            r = c["row"] - r0
            ya, yb = row_cuts[r], row_cuts[r + 1]
            cuts = refine_cuts(alpha[ya:yb].sum(axis=0), lay["cols"])
            xa, xb = cuts[c["col"]], cuts[c["col"] + 1]
            pix = img[ya:yb, xa:xb]
            m = clean_mask(pix[:, :, 3], cw * ch * 0.003)
            bb = bbox(m)
            if not bb:
                self.problems.add(name, f"{c['name']}: cell (row {c['row'] + 1}, column {c['col'] + 1}) is empty")
                continue
            x0, y0, x1, y1 = bb
            bw, bh = x1 - x0, y1 - y0
            tile = Image.fromarray(np.clip(pix, 0, 255).astype(np.uint8), "RGBA")
            kind = c["kind"]
            if kind in ("ref", "figure"):
                side = int(max(bw, bh) * 1.1)
                canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
                canvas.alpha_composite(tile.crop((x0, y0, x1, y1)), ((side - bw) // 2, (side - bh) // 2))
                self.save(name, c["out"], canvas, None)
                self.previews.append((c["name"], [canvas], None))
                continue
            pad = int(max(bw, bh) * 0.06)
            cx0, cy0, cx1, cy1 = max(0, x0 - pad), max(0, y0 - pad), min(pix.shape[1], x1 + pad), min(pix.shape[0], y1 + max(2, pad // 2))
            crop = tile.crop((cx0, cy0, cx1, cy1))
            if kind == "projectile":
                anchor = [round((x0 + bw / 2 - cx0) / crop.width, 4), round((y0 + bh / 2 - cy0) / crop.height, 4)]
            else:
                lift = GROUND_LIFT.get(kind, 0.05)
                anchor = [round((x0 + bw / 2 - cx0) / crop.width, 4), round((y1 - lift * bh - cy0) / crop.height, 4)]
            self.save(name, c["out"], crop, {"frames": 1, "anchor": anchor, "pixelsPerHex": ppx, "cutFrom": src})
            self.previews.append((c["name"], [crop], (anchor[0], anchor[1])))

    # -------------------------------------------------------------- portraits (opaque, black gutters)
    def cut_portraits(self, name: str, lay: dict, img: np.ndarray, r0: int, r1: int, src: str) -> None:
        h, w = img.shape[:2]
        rows = r1 - r0
        lum = img[:, :, :3].mean(axis=2)

        def gutters(profile_mean: np.ndarray, profile_std: np.ndarray, n: int) -> list[tuple[int, int]]:
            score = profile_mean + profile_std
            cuts = refine_cuts(score, n)
            spans = []
            for i in range(n):
                a, b = cuts[i], cuts[i + 1]
                while a < b - 1 and profile_mean[a] < 40:
                    a += 1
                while b > a + 1 and profile_mean[b - 1] < 40:
                    b -= 1
                spans.append((a, b))
            return spans

        ys = gutters(lum.mean(axis=1), lum.std(axis=1), rows)
        for c in [c for c in lay.get("cells", []) if r0 <= c["row"] < r1]:
            ya, yb = ys[c["row"] - r0]
            band = lum[ya:yb]
            xs = gutters(band.mean(axis=0), band.std(axis=0), lay["cols"])
            xa, xb = xs[c["col"]]
            side = min(xb - xa, yb - ya)
            if side < 64:
                self.problems.add(name, f"{c['name']}: cell too small ({xb - xa} × {yb - ya} px)")
                continue
            cx, cy = (xa + xb) // 2, (ya + yb) // 2
            crop = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGBA").crop((cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)).convert("RGB")
            self.save(name, c["out"], crop, None)
            self.previews.append((c["name"], [crop.convert("RGBA")], None))

    # -------------------------------------------------------------- preview
    def write_preview(self, name: str, out: Path) -> None:
        if not self.previews or self.dry:
            self.previews = []
            return
        th = 140
        rows = []
        for label, frames, anchor in self.previews:
            k = th / max(f.height for f in frames)
            ims = [f.resize((max(1, int(f.width * k)), max(1, int(f.height * k))), Image.LANCZOS) for f in frames]
            row = Image.new("RGBA", (sum(i.width + 6 for i in ims) + 6, th + 22), (40, 40, 48, 255))
            x = 6
            d = ImageDraw.Draw(row)
            d.text((6, 4), label, fill=(230, 230, 230, 255))
            for im in ims:
                bg = Image.new("RGBA", im.size, (90, 90, 100, 255))
                cb = ImageDraw.Draw(bg)
                for yy in range(0, im.height, 10):
                    for xx in range((yy // 10 % 2) * 10, im.width, 20):
                        cb.rectangle((xx, yy, xx + 9, yy + 9), fill=(120, 120, 130, 255))
                bg.alpha_composite(im)
                if anchor:
                    ax, ay = anchor[0] * im.width, anchor[1] * im.height
                    dd = ImageDraw.Draw(bg)
                    dd.line((0, ay, im.width, ay), fill=(255, 40, 40, 255), width=2)
                    dd.line((ax, ay - 8, ax, ay + 8), fill=(255, 40, 40, 255), width=2)
                row.alpha_composite(bg, (x, 18))
                x += im.width + 6
            rows.append(row)
        sheet = Image.new("RGBA", (max(r.width for r in rows), sum(r.height for r in rows)), (30, 30, 36, 255))
        y = 0
        for r in rows:
            sheet.alpha_composite(r, (0, y))
            y += r.height
        out.mkdir(parents=True, exist_ok=True)
        sheet.convert("RGB").save(out / f"{name}.png")
        self.previews = []


def cut_all(layouts: dict, sheets_dir: Path, out_root: Path, force: bool, dry: bool, only: str | None) -> tuple[list[str], Problems, dict]:
    log_path = sheets_dir / "cut-log.json"
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    problems = Problems()
    done: list[str] = []
    for name, lay in layouts.items():
        if only and only not in name:
            continue
        srcs = sources_for(name, lay, sheets_dir)
        if not srcs:
            continue
        digest = hashlib.sha256("".join(sha(p) for p, _, _ in srcs).encode()).hexdigest()
        if not force and log.get(name, {}).get("sha256") == digest:
            continue
        cutter = Cutter(out_root, dry, force, log, problems)
        ref_corr: dict = {}
        for path, r0, r1 in srcs:
            im = Image.open(path).convert("RGBA")
            arr = np.asarray(im)
            if lay["target"] == "portraits":
                cutter.cut_portraits(name, lay, arr.astype(np.float32), r0, r1, path.name)
                continue
            arr, how = key_background(arr)
            if how.startswith("opaque"):
                problems.add(name, f"{path.name}: {how} — cannot separate the sprites; deliver with a transparent or flat background")
                continue
            if lay["target"] in ("creature", "hero", "fx"):
                cutter.cut_animation(name, lay, arr, r0, r1, path.name, ref_corr)
            else:
                cutter.cut_items(name, lay, arr, r0, r1, path.name)
        cutter.write_preview(name, sheets_dir / "_preview")
        if not dry:
            log[name] = {"sha256": digest, "outputs": sorted(set(log.get(name, {}).get("outputs", [])) | set(cutter.written))}
        done.append(f"{name}: {len(cutter.written)} file(s)")
    if not dry and done:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text(json.dumps(log, indent=1) + "\n")
    return done, problems, log


# ---------------------------------------------------------------------------- self-test

def self_test() -> int:
    """Synthetic sheets (jittered figures on magenta, a two-part transparent sheet, objects, portraits) → cut → check."""
    rng = np.random.default_rng(7)
    tmp = Path(tempfile.mkdtemp(prefix="cut-sheets-"))
    sheets = tmp / "sheets"
    sheets.mkdir()
    fails: list[str] = []

    def figure(d: ImageDraw.ImageDraw, cx: float, ground: float, size: float, pose: int, colour) -> None:
        # A simple two-legged figure: legs, body, head, a spear that moves with the pose.
        lx = size * 0.12
        d.rectangle((cx - lx - size * 0.05, ground - size * 0.45, cx - lx + size * 0.05, ground), fill=colour)
        d.rectangle((cx + lx - size * 0.05, ground - size * 0.45, cx + lx + size * 0.05, ground), fill=colour)
        d.ellipse((cx - size * 0.22, ground - size * 0.85, cx + size * 0.22, ground - size * 0.4), fill=colour)
        d.ellipse((cx - size * 0.12, ground - size, cx + size * 0.12, ground - size * 0.78), fill=(230, 200, 160, 255))
        d.line((cx + size * 0.2, ground - size * 0.7, cx + size * (0.35 + 0.08 * pose), ground - size * 0.95), fill=(120, 90, 40, 255), width=max(2, int(size * 0.04)))

    lay_c = {"file": "sheet.test.creature.png", "group": "C", "target": "creature", "cols": 6, "rows": 4, "cellHexes": [2.133, 2.133], "groundY": 0.9, "segments": [
        {"row": 0, "col": 0, "frames": 6, "anim": "idle", "name": "sprite.test.idle", "fps": 3, "loop": True, "airborne": False},
        {"row": 1, "col": 0, "frames": 6, "anim": "attack", "name": "sprite.test.attack", "fps": 6, "loop": False, "airborne": False},
        {"row": 2, "col": 0, "frames": 3, "anim": "defend", "name": "sprite.test.defend", "fps": 8, "loop": False, "airborne": False},
        {"row": 2, "col": 3, "frames": 3, "anim": "hit", "name": "sprite.test.hit", "fps": 10, "loop": False, "airborne": False},
        {"row": 3, "col": 0, "frames": 6, "anim": "fly", "name": "sprite.test.fly", "fps": 10, "loop": True, "airborne": True}]}
    W, H, C, R = 1200, 800, 6, 4
    cw, ch = W / C, H / R
    jit = {r: (rng.uniform(-0.06, 0.06) * cw, rng.uniform(-0.05, 0.05) * ch) for r in range(R)}
    img = Image.new("RGBA", (W, H), (255, 0, 255, 255))
    d = ImageDraw.Draw(img)
    for r in range(R):
        for c in range(C):
            hover = 0.15 * ch if r == 3 else 0
            figure(d, c * cw + cw / 2 + jit[r][0], r * ch + 0.9 * ch + jit[r][1] - hover, ch * 0.55, c % 3, (60, 90, 160, 255))
    img.save(sheets / "sheet.test.creature.png")
    # Two-part transparent hero sheet.
    lay_h = {"file": "sheet.test.hero.png", "group": "D", "target": "hero", "cols": 10, "rows": 3, "cellHexes": [2.133, 2.133], "groundY": 0.88, "segments": [
        s for r in range(3) for s in ({"row": r, "col": 0, "frames": 4, "anim": "idle", "name": f"sprite.test.hero.idle.{r}", "fps": 3, "loop": True, "airborne": False}, {"row": r, "col": 4, "frames": 6, "anim": "walk", "name": f"sprite.test.hero.walk.{r}", "fps": 8, "loop": True, "airborne": False})]}
    for part, (r0, r1) in enumerate(parts_of(3), 1):
        rows = r1 - r0
        pw, ph = 1500, int(150 * rows)
        im = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
        dd = ImageDraw.Draw(im)
        for r in range(rows):
            for c in range(10):
                figure(dd, c * 150 + 75 + rng.uniform(-4, 4), r * 150 + 0.88 * 150, 90, c % 2, (150, 60, 40, 255))
        im.save(sheets / f"sheet.test.hero.part{part}.png")
    # Objects (transparent) with a grey checkerboard instead of transparency.
    lay_e = {"file": "sheet.test.objects.png", "group": "E", "target": "items", "cols": 3, "rows": 2, "cellHexes": [1.83, 1.83], "cells": [
        {"row": i // 3, "col": i % 3, "name": f"sprite.test.obj{i}", "kind": "site", "out": f"assets-source/sprites/final/sprite.test.obj{i}.png"} for i in range(5)]}
    im = Image.new("RGBA", (900, 600), (255, 255, 255, 255))
    dd = ImageDraw.Draw(im)
    for yy in range(0, 600, 16):
        for xx in range((yy // 16 % 2) * 16, 900, 32):
            dd.rectangle((xx, yy, xx + 15, yy + 15), fill=(204, 204, 204, 255))
    for i in range(5):
        cx, gy = (i % 3) * 300 + 150, (i // 3) * 300 + 264
        dd.rectangle((cx - 40 - 10 * i, gy - 120, cx + 40 + 10 * i, gy), fill=(120 + 20 * i, 80, 60, 255))
    im.save(sheets / "sheet.test.objects.png")
    # Portraits: opaque squares with black gutters.
    lay_p = {"file": "sheet.test.portraits.png", "group": "B", "target": "portraits", "cols": 2, "rows": 2, "cellHexes": [1, 1], "cells": [
        {"row": i // 2, "col": i % 2, "name": f"portrait{i}", "kind": "portrait", "out": f"assets-source/icons/final/portrait{i}.png"} for i in range(4)]}
    im = Image.new("RGBA", (1000, 1000), (0, 0, 0, 255))
    dd = ImageDraw.Draw(im)
    cols4 = [(200, 50, 50), (50, 200, 50), (50, 50, 200), (200, 200, 50)]
    for i in range(4):
        x0, y0 = (i % 2) * 505 + 3, (i // 2) * 505 + 3
        dd.rectangle((x0, y0, x0 + 490, y0 + 490), fill=cols4[i] + (255,))
    im.save(sheets / "sheet.test.portraits.png")

    layouts = {"sheet.test.creature": lay_c, "sheet.test.hero": lay_h, "sheet.test.objects": lay_e, "sheet.test.portraits": lay_p}
    done, problems, _ = cut_all(layouts, sheets, tmp, force=False, dry=False, only=None)
    final = tmp / "assets-source/sprites/final"
    for p in problems:
        fails.append("problem reported: " + p)
    # Creature: grounded rows land on the anchor; the flying row keeps its hover.
    for anim, n in (("idle", 6), ("attack", 6), ("defend", 3), ("hit", 3), ("fly", 6)):
        f = final / f"sprite.test.{anim}.png"
        sc = json.loads(f.with_suffix(".json").read_text())
        im = np.asarray(Image.open(f))
        fw = im.shape[1] // n
        if sc["frames"] != n or im.shape[1] != fw * n:
            fails.append(f"{anim}: {sc['frames']} frames, width {im.shape[1]}")
        ay = sc["anchor"][1] * im.shape[0]
        bottoms = [np.nonzero((im[:, k * fw:(k + 1) * fw, 3] > ALPHA_ON).any(axis=1))[0].max() + 1 for k in range(n)]
        want = ay - (0.15 * ch if anim == "fly" else 0)
        if max(abs(b - want) for b in bottoms) > 3:
            fails.append(f"{anim}: ground contact {bottoms} vs {want:.1f}")
        cx = [feet(im[:, k * fw:(k + 1) * fw, 3] > ALPHA_ON)[0] for k in range(n)]
        if max(abs(x - fw / 2) for x in cx) > 0.03 * cw + 2:
            fails.append(f"{anim}: feet x {[round(x) for x in cx]} vs {fw / 2}")
        if abs(sc["pixelsPerHex"] - ch / 2.133) > 0.5:
            fails.append(f"{anim}: pixelsPerHex {sc['pixelsPerHex']}")
    if np.asarray(Image.open(final / "sprite.test.idle.png"))[:, :, 3].mean() > 60:
        fails.append("magenta background not keyed")
    for r in range(3):
        for a in ("idle", "walk"):
            if not (final / f"sprite.test.hero.{a}.{r}.png").exists():
                fails.append(f"hero part split: sprite.test.hero.{a}.{r} missing")
    for i in range(5):
        f = final / f"sprite.test.obj{i}.png"
        if not f.exists():
            fails.append(f"object {i} missing")
            continue
        sc = json.loads(f.with_suffix(".json").read_text())
        im = np.asarray(Image.open(f))
        if im[:, :, 3].mean() > 250 or im[0, 0, 3] > 10:
            fails.append(f"object {i}: checkerboard not keyed")
        if not (0.85 < sc["anchor"][1] < 1.0):
            fails.append(f"object {i}: anchor {sc['anchor']}")
    for i in range(4):
        f = tmp / f"assets-source/icons/final/portrait{i}.png"
        im = np.asarray(Image.open(f).convert("RGB")).astype(float)
        if abs(im.shape[0] - im.shape[1]) > 0 or np.abs(im.mean(axis=(0, 1)) - cols4[i]).max() > 6:
            fails.append(f"portrait {i}: {im.shape}, mean {im.mean(axis=(0, 1)).round()}")
    # Unchanged sheets are skipped; files not cut by the tool are never overwritten.
    again, _, _ = cut_all(layouts, sheets, tmp, force=False, dry=False, only=None)
    if again:
        fails.append(f"unchanged sheets cut again: {again}")
    foreign = tmp / "assets-source/sprites/final/sprite.test.obj0.png"
    log = json.loads((sheets / "cut-log.json").read_text())
    log["sheet.test.objects"]["outputs"].remove("assets-source/sprites/final/sprite.test.obj0.png")
    log["sheet.test.objects"]["sha256"] = "changed"
    (sheets / "cut-log.json").write_text(json.dumps(log))
    _, probs, _ = cut_all(layouts, sheets, tmp, force=False, dry=False, only="objects")
    if not any("obj0" in p and "not overwritten" in p for p in probs):
        fails.append("a file the tool did not cut was overwritten")
    if not foreign.exists():
        fails.append("foreign file vanished")
    print("self-test:", "; ".join(done))
    for f in fails:
        print("FAIL", f)
    print("self-test", "passed" if not fails else f"FAILED ({len(fails)})", f"(work folder {tmp})")
    return 1 if fails else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-cut unchanged sheets and overwrite files not cut by this tool")
    ap.add_argument("--only", help="cut only sheets whose name contains this text")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not LAYOUTS.exists():
        print("no sheet layouts: run `npm run sprites:queue` first")
        return 1
    layouts = json.loads(LAYOUTS.read_text())["sheets"]
    # Further layouts from the art briefs (`npm run art:briefs`: GPT6_BRIEF_8–11 — god and hero
    # portraits, blessing icons, town building levels, map-hero animations), same format.
    for extra in sorted(LAYOUTS.parent.glob("sheet-layouts.*.json")):
        layouts.update(json.loads(extra.read_text())["sheets"])
    if not SHEETS.exists():
        print(f"nothing to cut: {SHEETS.relative_to(ROOT)} does not exist")
        return 0
    done, problems, _ = cut_all(layouts, SHEETS, ROOT, args.force, args.dry_run, args.only)
    for d in done:
        print("cut", d)
    unknown = sorted(p.name for p in SHEETS.glob("sheet.*.png") if not any(p.name in (l["file"], l["file"][:-4] + ".part1.png", l["file"][:-4] + ".part2.png") for l in layouts.values()))
    for u in unknown:
        problems.append(f"{u}: no layout of that name (check the file name against GPT6_2D_CONTENT_GENERATION.md)")
    for p in problems:
        print("PROBLEM", p, file=sys.stderr)
    print(f"{len(done)} sheet(s) cut{' (dry run)' if args.dry_run else ''}; {len(problems)} problem(s)" + ("" if args.dry_run or not done else "; previews in assets-source/sprites/sheets/_preview/; next: npm run sprites:import (and npm run icons:import for portraits)"))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
