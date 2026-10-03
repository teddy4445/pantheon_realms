#!/usr/bin/env python3
"""
2D placeholder sprites and the sprite manifest (development tool; never packaged).

Writes assets-runtime/sprites/** and assets-runtime/sprites/manifest.json — every
sprite the 2D views draw, each marked `"status": "placeholder"` with its
provenance, so a final GPT-6 strip replaces it by asset ID without code changes
(`npm run sprites:import`, which keeps entries already final).

Reuses the 2D content already produced before drawing anything new:

  creatures   the delivered three-quarter reference views (canonical masters,
              facing right) → a still battle sprite per form (43 forms);
              every other form → the interface's silhouette for its body
              profile, animated in simple multi-frame strips and tinted with
              the owner's colour at run time;
  map heroes  the six mounted-hero boards (support images/heros_full_view):
              the side view (facing right) → map avatar (idle, 4-frame walk)
              and the hero-screen figure; a rider silhouette for heroes
              without a pantheon;
  map sites   assets-source/ui/sheets/map-markers-sheet.png (towns per
              pantheon, mines, resources, objects, structures, passages);
  the rest    clean procedural placeholders (decoration, battle obstacles,
              siege pieces, projectiles, effect strips, the windmill).

Inputs: assets-source/sprites/content-plan.json (`npm run sprites:plan`) and
assets-source/sprites/silhouettes/*.svg (written by the same step).

Usage (repository root; Pillow, numpy, scipy, cairosvg):
    python3 tools/assets/sprites/make_sprite_placeholders.py \\
        [--references DIR] [--heroes DIR] [--sheet] [--keep-final]

--references  folder with creature.<…>.ref.threequarter.png (default
              assets-source/creatures/reference)
--heroes      folder with the six mounted-hero boards (default
              "support images/heros_full_view")
--sheet       also write assets-source/sprites/placeholder-contact.png
"""
from __future__ import annotations

import argparse
import io
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[3]
PLAN = ROOT / "assets-source" / "sprites" / "content-plan.json"
SIL = ROOT / "assets-source" / "sprites" / "silhouettes"
SHEET = ROOT / "assets-source" / "ui" / "sheets" / "map-markers-sheet.png"
RUNTIME = ROOT / "assets-runtime"
OUT = RUNTIME / "sprites"
MANIFEST = OUT / "manifest.json"

PANTHEON_BOARDS = ["greek", "norse", "egyptian", "japanese", "celtic", "mesoamerican"]  # heros_full_view files in name order

# Silhouette drawings whose head points left are mirrored so every sprite faces right.
SIL_FACES_LEFT = {"centaur", "griffin", "rider"}

# Figure height in hex widths on the battle board (placeholder sizing; final strips set their own pixelsPerHex).
BODY_HEIGHT = {
    "humanoid_spear": 1.2, "humanoid_thrower": 1.15, "humanoid_caster": 1.2, "centaur": 1.4, "griffin": 1.3,
    "rider": 1.5, "bull_biped": 1.45, "giant": 1.85, "beast": 0.95, "serpent": 1.3, "winged_humanoid": 1.35,
    "spirit": 1.3, "construct": 1.65,
}

FPS = {"idle": 4, "move": 8, "attack": 10, "shoot": 9, "defend": 6, "hit": 10, "death": 8, "victory": 6, "takeoff": 8, "fly": 8, "landing": 8, "cast": 8, "ability": 8, "walk": 8}
LOOPS = {"idle", "move", "fly", "victory", "walk"}


# ---------------------------------------------------------------------------- helpers

def rel(p: Path) -> str:
    return p.relative_to(RUNTIME).as_posix()


def save(img: Image.Image, path: Path, quality: int = 88, lossless: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=6, lossless=lossless, exact=False)


def trim(img: Image.Image, pad: int = 2, threshold: int = 8) -> Image.Image:
    a = np.asarray(img)[:, :, 3]
    ys, xs = np.where(a > threshold)
    if len(xs) == 0:
        return img
    x0, x1 = max(0, xs.min() - pad), min(img.width, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(img.height, ys.max() + 1 + pad)
    return img.crop((x0, y0, x1, y1))


def strip(frames: list[Image.Image]) -> Image.Image:
    w, h = frames[0].size
    out = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.alpha_composite(f, (i * w, 0))
    return out


def anim_def(path: Path, frames: int, fw: int, fh: int, name: str, anchor: tuple[float, float]) -> dict:
    return {
        "file": rel(path),
        "frames": frames,
        "frameWidth": fw,
        "frameHeight": fh,
        "fps": FPS.get(name, 8),
        "loop": name in LOOPS,
        "anchor": [round(anchor[0], 4), round(anchor[1], 4)],
    }


def flood_cut(tile: Image.Image) -> Image.Image:
    """Make the dark sheet background connected to the tile border transparent (soft edge); keep the main blob."""
    rgba = np.asarray(tile.convert("RGBA")).astype(np.float32)
    rgb = rgba[:, :, :3]
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    d = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    lum = rgb.mean(axis=2)
    near = (d < 30) & (lum < 75)
    lab, _ = ndimage.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outside = np.isin(lab, list(edge))
    inside = ~outside
    lab2, n = ndimage.label(inside)
    if n > 1:
        sizes = ndimage.sum(inside, lab2, range(1, n + 1))
        keep = {i + 1 for i, s in enumerate(sizes) if s >= 0.08 * sizes.max()}
        inside = np.isin(lab2, list(keep))
    soft = ndimage.gaussian_filter(inside.astype(np.float32), 0.8)
    a = np.clip(soft * 1.5, 0, 1)
    safe = np.maximum(a, 1e-3)[..., None]
    col = np.where(a[..., None] < 0.999, (rgb - (1 - a[..., None]) * bg) / safe, rgb)
    col = np.clip(col, 0, 255)
    return Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8), "RGBA")


def key_light(img: Image.Image) -> Image.Image:
    """Remove a light studio background (the hero boards) by distance keying from the border colour."""
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    d = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    a = np.clip((d - 10.0) / 28.0, 0, 1)
    mask = a > 0.5
    mask = ndimage.binary_opening(mask, iterations=1)
    lab, n = ndimage.label(mask)
    if n > 1:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        big = int(np.argmax(sizes)) + 1
        boxes = ndimage.find_objects(lab)
        y1 = boxes[big - 1][0].stop - 1
        keep = {big}
        for i, s in enumerate(sizes):
            if i + 1 == big or s < 0.002 * sizes.max():
                continue
            if boxes[i][0].start <= y1 - 4:  # pieces level with the figure (spear tips, tails), not labels below it
                keep.add(i + 1)
        mask = np.isin(lab, list(keep))
    a = a * ndimage.gaussian_filter(ndimage.binary_dilation(mask, iterations=2).astype(np.float32), 1.0)
    safe = np.maximum(a, 1e-3)[..., None]
    col = np.where(a[..., None] < 0.999, (rgb - (1 - a[..., None]) * bg) / safe, rgb)
    return Image.fromarray(np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8), "RGBA")


def transform(fig: Image.Image, feet: tuple[float, float], frame: tuple[int, int], anchor_px: tuple[float, float], angle: float = 0.0, dx: float = 0.0, dy: float = 0.0, sx: float = 1.0, sy: float = 1.0, alpha: float = 1.0, glow: tuple[int, int, int, int] | None = None) -> Image.Image:
    """Place `fig` in a frame with its feet at the anchor, rotated/scaled about the feet, then offset."""
    w, h = fig.size
    if sx != 1.0 or sy != 1.0:
        fig = fig.resize((max(1, round(w * sx)), max(1, round(h * sy))), Image.LANCZOS)
        feet = (feet[0] * sx, feet[1] * sy)
        w, h = fig.size
    big = Image.new("RGBA", (w * 3, h * 3), (0, 0, 0, 0))
    big.alpha_composite(fig, (w, h))
    cx, cy = w + feet[0], h + feet[1]
    if angle:
        big = big.rotate(angle, resample=Image.BICUBIC, center=(cx, cy))
    out = Image.new("RGBA", frame, (0, 0, 0, 0))
    if glow:
        g = Image.new("RGBA", frame, (0, 0, 0, 0))
        d = ImageDraw.Draw(g)
        r = glow[3]
        gx, gy = anchor_px[0] + dx, anchor_px[1] + dy - h * 0.5
        d.ellipse((gx - r, gy - r, gx + r, gy + r), fill=(255, 255, 255, 110))
        out.alpha_composite(g.filter(ImageFilter.GaussianBlur(r * 0.25)))
    out.alpha_composite(big, (round(anchor_px[0] - cx + dx), round(anchor_px[1] - cy + dy)))
    if alpha < 1:
        arr = np.asarray(out).copy()
        arr[:, :, 3] = (arr[:, :, 3] * alpha).astype(np.uint8)
        out = Image.fromarray(arr, "RGBA")
    return out


# ---------------------------------------------------------------------------- silhouettes (animated, tinted at run time)

SIL_FRAME = (320, 224)
SIL_ANCHOR = (160, 208)
SIL_SCALE = 1.92  # 100-unit SVG → 192 px


def silhouette(body: str, form: str) -> tuple[Image.Image, tuple[float, float]]:
    import cairosvg

    svg = (SIL / f"{body}.{form}.svg").read_text()
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=192, output_height=192)
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    if body in SIL_FACES_LEFT:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.asarray(im)[:, :, 3].astype(np.float32) / 255
    # Shade: light top, darker feet; a dark outline keeps the shape readable on any ground.
    h = im.height
    shade = np.linspace(1.0, 0.72, h)[:, None]
    body_rgb = np.dstack([np.full_like(a, 245) * shade, np.full_like(a, 245) * shade, np.full_like(a, 245) * shade])
    ring = ndimage.binary_dilation(a > 0.4, iterations=3).astype(np.float32)
    ring = ndimage.gaussian_filter(ring, 0.8)
    out = np.zeros((h, im.width, 4), np.float32)
    out[..., :3] = 46
    out[..., 3] = np.clip(ring, 0, 1) * 235
    # body over outline
    out[..., :3] = body_rgb * a[..., None] + out[..., :3] * (1 - a[..., None])
    out[..., 3] = np.maximum(out[..., 3], a * 255)
    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    ys, xs = np.where(np.asarray(img)[:, :, 3] > 20)
    feet = (float((xs.min() + xs.max()) / 2), float(ys.max()))
    return img, feet


def silhouette_strips(body: str, form: str, outdir: Path, needed: set[str] | None = None) -> dict[str, dict]:
    fig, feet = silhouette(body, form)
    F, A = SIL_FRAME, SIL_ANCHOR
    T = lambda **k: transform(fig, feet, F, A, **k)  # noqa: E731
    seq: dict[str, list[Image.Image]]
    seq = {
        "idle": [T(sy=1.0), T(sy=0.988), T(sy=0.978), T(sy=0.988)],
        "move": [T(angle=-3, dy=-4), T(dy=0), T(angle=3, dy=-4), T(dy=0)],
        "attack": [T(angle=7, dx=-4), T(angle=-12, dx=12), T(angle=-8, dx=8), T(angle=0)],
        "shoot": [T(angle=4, dx=-2), T(angle=8, dx=-5), T(angle=-3, dx=2), T(angle=0)],
        "defend": [T(sy=0.96, dx=-3), T(sy=0.92, dx=-6), T(sy=0.92, dx=-6)],
        "hit": [T(angle=10, dx=-9, alpha=0.6), T(angle=5, dx=-5), T(angle=0)],
        "death": [T(angle=20), T(angle=45), T(angle=70), T(angle=86), T(angle=90, alpha=0.86)],
        "victory": [T(dy=0), T(dy=-10, sy=1.02), T(dy=-16, sy=1.03), T(dy=-10, sy=1.02)],
        "takeoff": [T(dy=-6, angle=-3), T(dy=-14, angle=-5), T(dy=-22, angle=-4)],
        "fly": [T(dy=-22), T(dy=-26, angle=-2), T(dy=-22), T(dy=-18, angle=2)],
        "landing": [T(dy=-14, angle=3), T(dy=-6, angle=2), T(dy=0)],
        "ability": [T(glow=(255, 255, 255, 40)), T(glow=(255, 255, 255, 62)), T(glow=(255, 255, 255, 78)), T(glow=(255, 255, 255, 58))],
    }
    out: dict[str, dict] = {}
    for name, frames in seq.items():
        if needed is not None and name not in needed:
            continue
        p = outdir / f"{name}.webp"
        save(strip(frames), p, quality=86)
        out[name] = anim_def(p, len(frames), F[0], F[1], name, (A[0] / F[0], A[1] / F[1]))
    return out


# ---------------------------------------------------------------------------- creatures

def reference_path(refs: Path, c: dict) -> Path:
    if c["pantheonId"]:
        return refs / f"creature.{c['pantheonId']}.tier{c['tier']}.{c['form']}.ref.threequarter.png"
    return refs / f"creature.neutral.{c['familyId']}.{c['form']}.ref.threequarter.png"


def target_height(c: dict) -> float:
    h = BODY_HEIGHT.get(c["body"], 1.2) * (0.92 + 0.03 * c["tier"])
    return h * (1.05 if c["form"] == "upgraded" else 1.0)


def reference_sprite(src: Path, c: dict, outdir: Path) -> tuple[dict, float]:
    im = trim(Image.open(src).convert("RGBA"), pad=0)
    max_h = 300
    k = min(1.0, max_h / im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    pad = 6
    frame = Image.new("RGBA", (im.width + pad * 2, im.height + pad), (0, 0, 0, 0))
    frame.alpha_composite(im, (pad, 0))
    p = outdir / "idle.webp"
    save(frame, p, quality=90)
    # Feet: the lowest opaque rows, centred on their columns.
    a = np.asarray(frame)[:, :, 3]
    rows = np.where(a.max(axis=1) > 40)[0]
    bottom = int(rows.max())
    cols = np.where(a[max(0, bottom - 12): bottom + 1].max(axis=0) > 40)[0]
    fx = float((cols.min() + cols.max()) / 2) if len(cols) else frame.width / 2
    anchor = (fx / frame.width, (bottom + 1) / frame.height)
    fig_h = bottom + 1
    ppx = max(fig_h / target_height(c), im.width / (1.35 if c["footprint"] == 1 else 2.3))
    return {"idle": anim_def(p, 1, frame.width, frame.height, "idle", anchor)}, ppx


def build_creatures(plan: dict, refs: Path, manifest: dict) -> dict:
    stats = {"reference": 0, "silhouette": 0}
    shared: dict[str, dict[str, dict]] = {}
    # Silhouette strips are drawn only for the animations some form using them needs.
    needs: dict[str, set[str]] = {}
    for c in plan["creatures"]:
        if not reference_path(refs, c).exists():
            needs.setdefault(f"{c['body']}.{c['form']}", set()).update(c["animations"])
    for c in plan["creatures"]:
        cid = c["id"]
        src = reference_path(refs, c)
        if src.exists():
            anims, ppx = reference_sprite(src, c, OUT / "creatures" / cid)
            manifest["creatures"][cid] = {
                "status": "placeholder",
                "provenance": f"Still pose cut from the delivered canonical reference view {src.name} (Brief 5, three-quarter master, facing right); no animation strips yet — the battle adds simple motion. Replace with GPT-6 strips (GPT6_2D_CONTENT_GENERATION.md).",
                "facing": "right",
                "pixelsPerHex": round(ppx, 2),
                "animations": anims,
            }
            stats["reference"] += 1
            continue
        key = f"{c['body']}.{c['form']}"
        if key not in shared:
            shared[key] = silhouette_strips(c["body"], c["form"], OUT / "creatures" / "_silhouette" / key, needs.get(key))
        anims = {a: shared[key][a] for a in c["animations"] if a in shared[key]}
        fig_h = SIL_SCALE * 80  # silhouettes stand ~80 of 100 units tall
        manifest["creatures"][cid] = {
            "status": "placeholder",
            "provenance": f"Procedural silhouette ({c['body'].replace('_', ' ')}, {c['form']}) from the interface's placeholder art, tinted with the owner's colour; simple multi-frame strips. No reference view delivered yet.",
            "facing": "right",
            "pixelsPerHex": round(fig_h / target_height(c), 2),
            "tint": "accent",
            "animations": anims,
        }
        stats["silhouette"] += 1
    return stats


# ---------------------------------------------------------------------------- map heroes

def build_heroes(boards: Path, manifest: dict) -> int:
    files = sorted(boards.glob("*.png")) if boards.exists() else []
    n = 0
    for pid, src in zip(PANTHEON_BOARDS, files):
        board = Image.open(src).convert("RGB")
        side = board.crop((int(board.width * 0.6), 0, board.width, int(board.height * 0.93)))
        cut = trim(key_light(side), pad=2)
        outdir = OUT / "heroes" / pid
        # Hero-screen figure.
        fh = 720
        fig = cut.resize((round(cut.width * fh / cut.height), fh), Image.LANCZOS)
        save(fig, outdir / "figure.webp", quality=88)
        # Map avatar: 200 px tall still and a 4-frame walk (a step bob of the whole rider).
        mh = 200
        av = cut.resize((round(cut.width * mh / cut.height), mh), Image.LANCZOS)
        a = np.asarray(av)[:, :, 3]
        bottom = int(np.where(a.max(axis=1) > 40)[0].max())
        feet = (av.width / 2, float(bottom))
        F = (av.width + 16, mh + 14)
        A = (F[0] / 2, mh + 6)
        idle = [transform(av, feet, F, A)]
        walk = [transform(av, feet, F, A, dy=0), transform(av, feet, F, A, dy=-3, angle=-1), transform(av, feet, F, A, dy=0), transform(av, feet, F, A, dy=-3, angle=1)]
        save(strip(idle), outdir / "idle.webp", quality=88)
        save(strip(walk), outdir / "walk.webp", quality=88)
        anchor = (A[0] / F[0], A[1] / F[1])
        manifest["heroes"][pid] = {
            "status": "placeholder",
            "provenance": f"Side view cut from the owner's mounted-hero board '{src.name}' (support images/heros_full_view); one direction (facing right, mirrored westward); the walk is a step bob of the still. Replace with GPT-6 8-direction idle/walk sheets.",
            "facing": "right",
            "pixelsPerHex": round(mh / 1.55, 2),
            "animations": {
                "idle": anim_def(outdir / "idle.webp", 1, F[0], F[1], "idle", anchor),
                "walk": anim_def(outdir / "walk.webp", 4, F[0], F[1], "walk", anchor),
            },
            "figure": {"file": rel(outdir / "figure.webp"), "width": fig.width, "height": fig.height, "status": "placeholder"},
        }
        n += 1
    # Heroes without a pantheon: the rider silhouette, tinted with the owner's colour.
    strips = silhouette_strips("rider", "base", OUT / "heroes" / "neutral", {"idle", "move"})
    manifest["heroes"]["neutral"] = {
        "status": "placeholder",
        "provenance": "Procedural rider silhouette tinted with the owner's colour (heroes without a pantheon avatar).",
        "facing": "right",
        "pixelsPerHex": round(SIL_SCALE * 80 / 1.45, 2),
        "tint": "accent",
        "animations": {"idle": strips["idle"], "walk": {**strips["move"], "fps": FPS["walk"]}},
    }
    return n


# ---------------------------------------------------------------------------- map sites

# (sheet box x0, y0, x1, y1), hex widths the object spans on the map
SHEET_ITEMS: dict[str, tuple[tuple[int, int, int, int], float]] = {
    "town.player": ((503, 48, 612, 178), 1.55),
    "town.neutral": ((731, 50, 835, 178), 1.55),
    "town.greek": ((24, 858, 134, 978), 1.5),
    "town.norse": ((134, 858, 246, 978), 1.5),
    "town.egyptian": ((250, 858, 360, 978), 1.5),
    "town.japanese": ((370, 858, 478, 978), 1.5),
    "town.celtic": ((496, 858, 602, 978), 1.5),
    "town.mesoamerican": ((606, 858, 724, 978), 1.5),
    "res.gold": ((1000, 66, 1102, 170), 0.8),
    "res.wood": ((1105, 70, 1204, 170), 0.8),
    "res.stone": ((1208, 64, 1308, 170), 0.8),
    "res.crystal": ((1311, 62, 1410, 170), 0.8),
    "res.favor": ((1412, 58, 1516, 170), 0.8),
    "quarry": ((19, 283, 142, 392), 1.25),
    "sawmill": ((143, 287, 261, 392), 1.25),
    "mine": ((267, 271, 379, 392), 1.25),
    "crystal_mine": ((383, 272, 498, 392), 1.25),
    "favor_shrine": ((502, 265, 617, 392), 1.15),
    "artifact": ((648, 275, 730, 388), 0.75),
    "chest": ((736, 286, 816, 381), 0.75),
    "scroll": ((819, 279, 898, 381), 0.85),
    "campfire": ((901, 286, 985, 384), 0.9),
    "marketplace": ((986, 288, 1077, 387), 1.1),
    "fountain": ((1082, 292, 1169, 384), 1.0),
    "neutral_creature": ((132, 480, 228, 600), 0.95),
    "watchtower": ((701, 478, 782, 603), 1.0),
    "portal": ((792, 482, 886, 603), 1.1),
    "shrine": ((888, 479, 983, 603), 1.05),
    "obelisk": ((988, 478, 1075, 603), 0.95),
    "altar": ((1079, 481, 1176, 603), 1.0),
    "sacred_grove": ((1181, 476, 1286, 603), 1.15),
    "ruins": ((1288, 484, 1394, 603), 1.15),
    "bridge": ((1393, 492, 1522, 603), 1.35),
    "mountain_pass": ((296, 686, 391, 785), 1.2),
    "lock": ((585, 686, 671, 785), 0.95),
    "healing_site": ((1016, 697, 1102, 780), 0.9),
    "mana_well": ((1106, 696, 1184, 781), 0.85),
    "recruit_camp": ((1192, 692, 1267, 780), 0.95),
    "training_grounds": ((1277, 685, 1359, 781), 1.0),
}

# Map location kind (and variant) → sheet item. Kinds absent here get a procedural placeholder.
SITE_FROM_SHEET: dict[str, str] = {
    "town": "town.neutral",
    "town.greek": "town.greek",
    "town.norse": "town.norse",
    "town.egyptian": "town.egyptian",
    "town.japanese": "town.japanese",
    "town.celtic": "town.celtic",
    "town.mesoamerican": "town.mesoamerican",
    "sawmill": "sawmill",
    "quarry": "quarry",
    "gold_mine": "mine",
    "crystal_deposit": "crystal_mine",
    "pickup": "res.gold",
    "pickup.gold": "res.gold",
    "pickup.wood": "res.wood",
    "pickup.stone": "res.stone",
    "pickup.crystal": "res.crystal",
    "pickup.favor": "res.favor",
    "pickup.artifact": "artifact",
    "watchtower": "watchtower",
    "crossing_bridge": "bridge",
    "crossing_pass": "mountain_pass",
    "nest": "neutral_creature",
    "refuge": "healing_site",
    "quarry_cache": "res.stone",
    "grove": "sacred_grove",
    "beacon": "altar",
    "relay": "campfire",
    "gate": "lock",
    "key_gate": "lock",
    "camp": "recruit_camp",
    "event_site": "shrine",
    "relic": "favor_shrine",
    "portal": "portal",
    "learning_stone": "obelisk",
    "spell_shrine": "mana_well",
    "skill_trainer": "training_grounds",
    "quest_hut": "scroll",
    "key_tent": "marketplace",
    "treasure_chest": "chest",
    "prison": "ruins",
}


def build_sites(manifest: dict) -> int:
    sheet = Image.open(SHEET).convert("RGB")
    cut: dict[str, tuple[Path, Image.Image, float]] = {}
    for item, (box, span) in SHEET_ITEMS.items():
        img = trim(flood_cut(sheet.crop(box)), pad=2)
        p = OUT / "map" / "sites" / f"{item}.webp"
        save(img, p, quality=90)
        cut[item] = (p, img, span)
    n = 0
    for kind, item in SITE_FROM_SHEET.items():
        p, img, span = cut[item]
        manifest["sites"][f"map.site.{kind}"] = {
            "file": rel(p), "width": img.width, "height": img.height, "anchor": [0.5, 0.94],
            "pixelsPerHex": round(img.width / span, 2), "status": "placeholder",
            "provenance": f"Cut from the owner's map-marker concept sheet (assets-source/ui/sheets/map-markers-sheet.png, '{item.replace('_', ' ')}'); placeholder until the GPT-6 map object is delivered.",
        }
        n += 1
    # The windmill is not on the sheet: a clean procedural placeholder.
    wm = draw_windmill()
    p = OUT / "map" / "sites" / "windmill.webp"
    save(wm, p)
    manifest["sites"]["map.site.windmill"] = {"file": rel(p), "width": wm.width, "height": wm.height, "anchor": [0.5, 0.95], "pixelsPerHex": round(wm.width / 1.05, 2), "status": "placeholder", "provenance": "Procedural placeholder (not on the map-marker sheet)."}
    return n + 1


# ---------------------------------------------------------------------------- procedural drawing (supersampled)

SS = 3


class Pen:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.img = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)

    def P(self, pts):
        return [(x * SS, y * SS) for x, y in pts]

    def poly(self, pts, fill, outline=None, width=1.0):
        self.d.polygon(self.P(pts), fill=fill, outline=outline, width=max(1, round(width * SS)))

    def ell(self, x0, y0, x1, y1, fill, outline=None, width=1.0):
        self.d.ellipse((x0 * SS, y0 * SS, x1 * SS, y1 * SS), fill=fill, outline=outline, width=max(1, round(width * SS)))

    def rect(self, x0, y0, x1, y1, fill, outline=None, width=1.0, r=0):
        if r:
            self.d.rounded_rectangle((x0 * SS, y0 * SS, x1 * SS, y1 * SS), r * SS, fill=fill, outline=outline, width=max(1, round(width * SS)))
        else:
            self.d.rectangle((x0 * SS, y0 * SS, x1 * SS, y1 * SS), fill=fill, outline=outline, width=max(1, round(width * SS)))

    def line(self, pts, fill, width=1.0):
        self.d.line(self.P(pts), fill=fill, width=max(1, round(width * SS)), joint="curve")

    def done(self) -> Image.Image:
        return self.img.resize((self.w, self.h), Image.LANCZOS)


def rock_shape(p: Pen, cx, by, w, h, base=(122, 118, 110), seed=0):
    rng = np.random.default_rng(seed)
    n = 9
    pts = []
    for i in range(n):
        a = math.pi + i * math.pi / (n - 1)
        r = 1 + rng.uniform(-0.12, 0.08)
        pts.append((cx + math.cos(a) * w / 2 * r, by - h * 0.15 + math.sin(a) * h * 0.85 * r))
    pts += [(cx + w / 2, by), (cx - w / 2, by)]
    dark = tuple(int(c * 0.62) for c in base)
    p.poly(pts, fill=base + (255,), outline=dark + (255,), width=1.2)
    light = tuple(min(255, int(c * 1.22)) for c in base)
    p.poly([(cx - w * 0.36, by - h * 0.55), (cx - w * 0.05, by - h * 0.95), (cx + w * 0.12, by - h * 0.62), (cx - w * 0.1, by - h * 0.4)], fill=light + (255,))
    p.poly([(cx + w * 0.12, by - h * 0.62), (cx + w * 0.42, by - h * 0.35), (cx + w * 0.45, by), (cx + w * 0.05, by)], fill=dark + (140,))


def draw_tree() -> Image.Image:
    p = Pen(70, 90)
    p.rect(31, 52, 39, 86, fill=(92, 62, 36, 255), outline=(52, 34, 20, 255))
    for (x0, y0, x1, y1, c) in [(8, 22, 46, 60, (48, 92, 44)), (26, 12, 64, 54, (56, 104, 50)), (14, 4, 54, 42, (64, 116, 56))]:
        p.ell(x0, y0, x1, y1, fill=c + (255,), outline=(28, 52, 28, 255), width=1)
    p.ell(20, 10, 38, 24, fill=(98, 150, 80, 200))
    p.ell(44, 30, 60, 48, fill=(30, 62, 32, 150))
    return p.done()


def draw_pine() -> Image.Image:
    p = Pen(60, 100)
    p.rect(27, 78, 33, 97, fill=(86, 58, 34, 255))
    for i, (top, half, bot) in enumerate([(4, 14, 36), (20, 20, 58), (38, 26, 84)]):
        p.poly([(30, top), (30 + half, bot), (30 - half, bot)], fill=(30, 70 + i * 6, 40, 255), outline=(16, 40, 22, 255), width=1)
        p.poly([(30, top), (30 - half, bot), (30, bot)], fill=(48, 98 + i * 6, 54, 255))
    return p.done()


def draw_rock(seed=1) -> Image.Image:
    p = Pen(56, 40)
    rock_shape(p, 28, 38, 46, 30, seed=seed)
    return p.done()


def draw_shrub() -> Image.Image:
    p = Pen(50, 34)
    for (x0, y0, x1, y1, c) in [(4, 12, 26, 32, (70, 104, 52)), (18, 6, 44, 32, (82, 118, 58)), (30, 14, 48, 32, (62, 96, 46))]:
        p.ell(x0, y0, x1, y1, fill=c + (255,), outline=(34, 52, 26, 255))
    return p.done()


def draw_grass() -> Image.Image:
    p = Pen(40, 26)
    for i, x in enumerate(range(6, 36, 4)):
        lean = (i % 3 - 1) * 4
        p.line([(x, 25), (x + lean, 6 + (i % 2) * 5)], fill=(120 + (i % 3) * 18, 150 + (i % 2) * 14, 70, 255), width=2)
    return p.done()


def draw_mountain() -> Image.Image:
    p = Pen(150, 120)
    body = [(4, 116), (40, 48), (58, 60), (80, 8), (106, 54), (122, 42), (146, 116)]
    p.poly(body, fill=(120, 112, 102, 255), outline=(60, 54, 48, 255), width=1.5)
    p.poly([(80, 8), (66, 116), (4, 116), (40, 48), (58, 60)], fill=(146, 138, 126, 255))
    p.poly([(80, 8), (68, 36), (76, 32), (84, 42), (94, 32)], fill=(236, 240, 244, 255))
    p.poly([(40, 48), (34, 60), (44, 58), (50, 64), (52, 56)], fill=(226, 232, 238, 230))
    p.line([(80, 8), (72, 60), (66, 116)], fill=(88, 80, 72, 160), width=1.2)
    return p.done()


def draw_log() -> Image.Image:
    p = Pen(96, 40)
    p.rect(10, 12, 84, 34, fill=(110, 76, 44, 255), outline=(60, 40, 22, 255), width=1.2, r=8)
    p.line([(18, 18), (78, 18)], fill=(140, 100, 62, 255), width=1.5)
    p.ell(74, 11, 90, 35, fill=(178, 140, 96, 255), outline=(90, 62, 36, 255), width=1.2)
    p.ell(78, 17, 86, 29, fill=(150, 112, 72, 255))
    return p.done()


def draw_stump() -> Image.Image:
    p = Pen(56, 44)
    p.rect(12, 14, 44, 40, fill=(104, 72, 42, 255), outline=(58, 38, 22, 255), width=1.2)
    p.ell(12, 6, 44, 22, fill=(176, 138, 92, 255), outline=(84, 58, 34, 255), width=1.2)
    p.ell(20, 10, 36, 18, fill=(150, 112, 70, 255))
    return p.done()


def draw_column() -> Image.Image:
    p = Pen(48, 104)
    p.rect(8, 92, 40, 102, fill=(196, 190, 176, 255), outline=(110, 104, 94, 255))
    p.poly([(12, 92), (36, 92), (36, 24), (30, 18), (24, 26), (18, 14), (12, 22)], fill=(222, 216, 202, 255), outline=(120, 114, 102, 255), width=1.2)
    for x in (17, 24, 31):
        p.line([(x, 90), (x, 30)], fill=(170, 164, 150, 255), width=1.2)
    return p.done()


def draw_stone_circle() -> Image.Image:
    p = Pen(110, 70)
    for (cx, by, w, h, s) in [(24, 60, 18, 44, 3), (56, 52, 20, 50, 4), (88, 62, 18, 40, 5)]:
        p.rect(cx - w / 2, by - h, cx + w / 2, by, fill=(132, 128, 118, 255), outline=(66, 62, 56, 255), width=1.2, r=4)
        p.rect(cx - w / 2 + 2, by - h + 3, cx - 1, by - 4, fill=(160, 156, 146, 255), r=3)
    return p.done()


def draw_boulder() -> Image.Image:
    p = Pen(86, 64)
    rock_shape(p, 43, 62, 78, 54, base=(118, 112, 104), seed=7)
    return p.done()


def draw_battle_tree() -> Image.Image:
    p = Pen(90, 130)
    p.rect(39, 78, 51, 126, fill=(90, 60, 34, 255), outline=(50, 32, 18, 255), width=1.2)
    for (x0, y0, x1, y1, c) in [(6, 34, 58, 86, (46, 88, 42)), (34, 22, 86, 78, (54, 100, 48)), (16, 4, 72, 60, (62, 114, 54))]:
        p.ell(x0, y0, x1, y1, fill=c + (255,), outline=(26, 48, 26, 255), width=1)
    p.ell(26, 12, 48, 30, fill=(98, 150, 80, 200))
    return p.done()


def draw_windmill() -> Image.Image:
    p = Pen(90, 110)
    p.poly([(30, 106), (60, 106), (54, 40), (36, 40)], fill=(214, 200, 170, 255), outline=(110, 96, 72, 255), width=1.2)
    p.poly([(32, 42), (58, 42), (45, 24)], fill=(146, 70, 52, 255), outline=(80, 38, 28, 255), width=1.2)
    p.rect(41, 84, 49, 106, fill=(96, 66, 40, 255))
    for a in (20, 110, 200, 290):
        r = math.radians(a)
        x1, y1 = 45 + math.cos(r) * 40, 40 + math.sin(r) * 40
        nx, ny = -math.sin(r) * 7, math.cos(r) * 7
        p.poly([(45, 40), (x1, y1), (x1 + nx, y1 + ny), (45 + nx * 0.4, 40 + ny * 0.4)], fill=(236, 226, 204, 240), outline=(120, 104, 80, 255), width=1)
    p.ell(41, 36, 49, 44, fill=(80, 56, 36, 255))
    return p.done()


def bricks(p: Pen, x0, y0, x1, y1, base=(186, 176, 152)):
    p.rect(x0, y0, x1, y1, fill=base + (255,), outline=(96, 88, 72, 255), width=1.2)
    row = 0
    y = y0 + 8
    while y < y1:
        p.line([(x0, y), (x1, y)], fill=(130, 120, 100, 255), width=1)
        off = 0 if row % 2 == 0 else 7
        for x in range(int(x0 + off + 7), int(x1), 14):
            p.line([(x, y - 8), (x, y)], fill=(130, 120, 100, 255), width=1)
        y += 8
        row += 1


def draw_siege(kind: str, state: str) -> Image.Image:
    if kind == "keep":
        p = Pen(140, 190)
        if state == "rubble":
            for i, (cx, w, h) in enumerate([(40, 50, 26), (78, 64, 34), (110, 44, 22)]):
                rock_shape(p, cx, 186, w, h, base=(150, 142, 124), seed=10 + i)
            return p.done()
        bricks(p, 20, 70, 120, 186)
        p.poly([(14, 72), (70, 14), (126, 72)], fill=(140, 58, 42, 255), outline=(70, 28, 20, 255), width=1.5)
        p.rect(58, 140, 82, 186, fill=(70, 46, 28, 255), outline=(40, 26, 16, 255), r=10)
        if state == "damaged":
            p.poly([(96, 70), (120, 70), (120, 120), (104, 100)], fill=(0, 0, 0, 0))
            rock_shape(p, 116, 186, 30, 16, base=(150, 142, 124), seed=5)
        return p.done()
    if kind == "tower":
        p = Pen(80, 150)
        if state == "rubble":
            for i, (cx, w, h) in enumerate([(26, 36, 20), (54, 40, 24)]):
                rock_shape(p, cx, 146, w, h, base=(146, 138, 120), seed=20 + i)
            return p.done()
        top = 44 if state == "intact" else 66
        bricks(p, 12, top, 68, 146, base=(170, 162, 142))
        if state == "intact":
            p.poly([(6, 46), (40, 4), (74, 46)], fill=(140, 58, 42, 255), outline=(70, 28, 20, 255), width=1.5)
        else:
            p.poly([(12, top), (24, top - 10), (34, top - 2), (48, top - 12), (68, top)], fill=(170, 162, 142, 255))
        p.rect(34, 80, 46, 96, fill=(40, 30, 22, 255))
        return p.done()
    if kind == "gate":
        p = Pen(90, 110)
        if state == "rubble":
            p.rect(18, 92, 72, 106, fill=(88, 60, 36, 255), outline=(50, 32, 18, 255))
            rock_shape(p, 20, 106, 26, 14, base=(150, 142, 124), seed=31)
            rock_shape(p, 70, 106, 26, 14, base=(150, 142, 124), seed=32)
            return p.done()
        bricks(p, 4, 24, 22, 106)
        bricks(p, 68, 24, 86, 106)
        h = 30 if state == "intact" else 52
        p.rect(22, h, 68, 106, fill=(122, 82, 46, 255), outline=(60, 38, 20, 255), width=1.5)
        for x in (33, 45, 57):
            p.line([(x, h + 2), (x, 104)], fill=(84, 54, 30, 255), width=1.5)
        p.line([(22, h + 24), (68, h + 24)], fill=(60, 60, 64, 255), width=2.5)
        return p.done()
    # wall
    p = Pen(84, 110)
    if state == "rubble":
        for i, (cx, w, h) in enumerate([(26, 40, 22), (58, 44, 26)]):
            rock_shape(p, cx, 106, w, h, base=(150, 142, 124), seed=40 + i)
        return p.done()
    top = 26 if state == "intact" else 46
    bricks(p, 8, top + 10, 76, 106)
    for x in range(8, 76, 17):
        p.rect(x, top, x + 10, top + 12, fill=(186, 176, 152, 255), outline=(96, 88, 72, 255))
    if state == "damaged":
        p.poly([(44, top + 10), (76, top + 10), (76, top + 40), (60, top + 26)], fill=(0, 0, 0, 0))
        rock_shape(p, 66, 106, 20, 10, base=(150, 142, 124), seed=3)
    return p.done()


def draw_arrow() -> Image.Image:
    p = Pen(64, 12)
    p.line([(6, 6), (52, 6)], fill=(150, 112, 70, 255), width=2)
    p.poly([(52, 2), (63, 6), (52, 10)], fill=(200, 200, 206, 255), outline=(90, 90, 96, 255))
    p.poly([(4, 2), (14, 6), (4, 10), (8, 6)], fill=(220, 210, 190, 255))
    return p.done()


def draw_stone() -> Image.Image:
    p = Pen(28, 28)
    p.ell(3, 3, 25, 25, fill=(142, 136, 126, 255), outline=(70, 66, 60, 255), width=1.5)
    p.ell(7, 6, 15, 13, fill=(186, 180, 170, 255))
    return p.done()


# ---------------------------------------------------------------------------- effects

def effect_strip(kind: str) -> tuple[list[Image.Image], tuple[int, int], tuple[float, float], bool]:
    W, H = 160, 160
    frames = []
    n = 6
    rng = np.random.default_rng(len(kind))
    for i in range(n):
        t = (i + 1) / n
        p = Pen(W, H)
        cx, cy = W / 2, H * 0.62
        fade = int(255 * (1 - t) ** 0.7)
        if kind == "impact":
            r = 10 + t * 44
            p.ell(cx - r, cy - r * 0.7, cx + r, cy + r * 0.7, fill=None, outline=(255, 240, 200, fade), width=4)
            for k in range(8):
                a = k * math.pi / 4 + 0.3
                p.line([(cx + math.cos(a) * r * 0.4, cy + math.sin(a) * r * 0.3), (cx + math.cos(a) * r, cy + math.sin(a) * r * 0.7)], fill=(255, 250, 230, fade), width=3)
        elif kind in ("spell.damage", "spell.area"):
            big = 1.5 if kind == "spell.area" else 1.0
            r = (14 + t * 46) * big
            p.ell(cx - r, cy - r * 0.6, cx + r, cy + r * 0.6, fill=(130, 180, 255, fade // 3), outline=(200, 230, 255, fade), width=3)
            x, y = cx, 6
            pts = [(x, y)]
            for k in range(6):
                x += rng.uniform(-12, 12)
                y += (cy - 6) / 6
                pts.append((x, y))
            p.line(pts, fill=(230, 244, 255, fade), width=4)
        elif kind == "spell.heal":
            for k in range(10):
                sx = cx + rng.uniform(-40, 40)
                sy = cy - t * 80 - rng.uniform(0, 30)
                s = 4 + rng.uniform(0, 4)
                p.poly([(sx, sy - s), (sx + s * 0.4, sy), (sx, sy + s), (sx - s * 0.4, sy)], fill=(160, 255, 150, fade))
            r = 40
            p.ell(cx - r, cy - r * 0.3, cx + r, cy + r * 0.3, fill=(120, 240, 120, fade // 3))
        elif kind in ("spell.buff", "morale.up"):
            r = 20 + t * 36
            col = (255, 226, 140) if kind == "spell.buff" else (255, 236, 170)
            p.ell(cx - r, cy - r * 0.35, cx + r, cy + r * 0.35, fill=None, outline=col + (fade,), width=4)
            if kind == "morale.up":
                sy = cy - 40 - t * 50
                p.poly([(cx, sy - 12), (cx + 4, sy - 3), (cx + 13, sy - 3), (cx + 6, sy + 3), (cx + 9, sy + 12), (cx, sy + 6), (cx - 9, sy + 12), (cx - 6, sy + 3), (cx - 13, sy - 3), (cx - 4, sy - 3)], fill=col + (fade,))
        elif kind in ("spell.curse", "morale.down"):
            col = (190, 120, 240) if kind == "spell.curse" else (255, 120, 100)
            for k in range(3):
                r = 16 + k * 14 + t * 10
                a0 = t * 360 + k * 70
                p.d.arc(((cx - r) * SS, (cy - 40 - r * 0.6) * SS, (cx + r) * SS, (cy - 40 + r * 0.6) * SS), a0, a0 + 220, fill=col + (fade,), width=3 * SS)
            if kind == "morale.down":
                sy = cy - 70 + t * 50
                p.poly([(cx - 8, sy), (cx + 8, sy), (cx, sy + 14)], fill=col + (fade,))
        elif kind == "ward":
            r = 52
            p.d.chord(((cx - r) * SS, (cy - r * 1.4) * SS, (cx + r) * SS, (cy + r * 0.6) * SS), 180, 360, fill=(140, 230, 255, int(fade * 0.35)), outline=(190, 245, 255, fade), width=3 * SS)
        frames.append(p.done())
    return frames, (W, H), (0.5, 0.62), True


# ---------------------------------------------------------------------------- main

def statics(manifest: dict) -> None:
    def put(section: str, key: str, img: Image.Image, path: Path, span: float, anchor=(0.5, 0.95), note="Procedural placeholder."):
        save(img, path, lossless=True)
        manifest[section][key] = {"file": rel(path), "width": img.width, "height": img.height, "anchor": list(anchor), "pixelsPerHex": round(img.width / span, 2), "status": "placeholder", "provenance": note}

    decor = {"tree": (draw_tree(), 0.42), "pine": (draw_pine(), 0.34), "rock": (draw_rock(1), 0.3), "shrub": (draw_shrub(), 0.28), "grass": (draw_grass(), 0.24), "mountain": (draw_mountain(), 1.2)}
    for k, (img, span) in decor.items():
        put("decor", k, img, OUT / "map" / "decor" / f"{k}.webp", span, note="Procedural map decoration placeholder.")
    obstacles = {"rock": (draw_rock(4), 0.85), "boulder": (draw_boulder(), 1.0), "log": (draw_log(), 1.05), "tree": (draw_battle_tree(), 0.95), "stump": (draw_stump(), 0.7), "column": (draw_column(), 0.5), "stone_circle": (draw_stone_circle(), 1.05)}
    for k, (img, span) in obstacles.items():
        put("obstacles", k, img, OUT / "battle" / "obstacles" / f"{k}.webp", span, note="Procedural battlefield obstacle placeholder.")
    for kind, span in (("wall", 0.95), ("gate", 1.0), ("tower", 0.9), ("keep", 1.0)):
        for state in ("intact", "damaged", "rubble"):
            img = draw_siege(kind, state)
            put("siege", f"{kind}.{state}", img, OUT / "battle" / "siege" / f"{kind}.{state}.webp", span, note="Procedural siege placeholder.")
    put("projectiles", "arrow", draw_arrow(), OUT / "battle" / "projectiles" / "arrow.webp", 0.55, anchor=(0.5, 0.5), note="Procedural projectile placeholder.")
    put("projectiles", "stone", draw_stone(), OUT / "battle" / "projectiles" / "stone.webp", 0.32, anchor=(0.5, 0.5), note="Procedural projectile placeholder.")
    for kind in ("impact", "spell.damage", "spell.area", "spell.heal", "spell.buff", "spell.curse", "ward", "morale.up", "morale.down"):
        frames, (W, H), anchor, additive = effect_strip(kind)
        path = OUT / "effects" / f"{kind}.webp"
        save(strip(frames), path, lossless=True)
        manifest["effects"][kind] = {**anim_def(path, len(frames), W, H, "effect", anchor), "fps": 16, "loop": False, "pixelsPerHex": round(W / 1.4, 2), "status": "placeholder", "provenance": "Procedural effect strip placeholder.", "additive": additive}


def contact(manifest: dict, out: Path) -> None:
    tiles: list[tuple[str, Image.Image]] = []
    def first_frame(d: dict) -> Image.Image:
        im = Image.open(RUNTIME / d["file"]).convert("RGBA")
        fw = d.get("frameWidth", im.width)
        return im.crop((0, 0, fw, d.get("frameHeight", im.height)))
    for cid, s in manifest["creatures"].items():
        tiles.append((cid, first_frame(s["animations"]["idle"])))
    for pid, s in manifest["heroes"].items():
        tiles.append((f"hero {pid}", first_frame(s["animations"]["idle"])))
    for sec in ("sites", "decor", "obstacles", "siege", "projectiles"):
        for k, s in manifest[sec].items():
            tiles.append((k.replace("map.site.", ""), Image.open(RUNTIME / s["file"]).convert("RGBA")))
    for k, s in manifest["effects"].items():
        tiles.append((k, first_frame(s)))
    cell = 120
    cols = 14
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 14)), (52, 60, 52))
    d = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(tiles):
        im = im.copy()
        im.thumbnail((cell - 8, cell - 8))
        x, y = (i % cols) * cell, (i // cols) * (cell + 14)
        sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height)), im)
        d.text((x + 3, y + cell + 1), name[:20], fill=(255, 255, 255))
    sheet.save(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--references", default=str(ROOT / "assets-source" / "creatures" / "reference"))
    ap.add_argument("--heroes", default=str(ROOT / "support images" / "heros_full_view"))
    ap.add_argument("--sheet", action="store_true")
    ap.add_argument("--only", default="", help="comma list of parts to rebuild (creatures,heroes,sites,statics); others are kept from the current manifest")
    args = ap.parse_args()
    only = {x.strip() for x in args.only.split(",") if x.strip()}
    if not PLAN.exists():
        print(f"missing {PLAN}: run `npm run sprites:plan` first", file=sys.stderr)
        return 1
    plan = json.loads(PLAN.read_text())
    previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    manifest = {
        "schema": "pantheon-realms-sprites-1",
        "notice": "2D sprite manifest. Placeholder entries come from tools/assets/sprites/make_sprite_placeholders.py; final GPT-6 strips are registered by `npm run sprites:import` (ASSET_PIPELINE.md §1). The game reads sprites only through this file.",
        "creatures": {}, "heroes": {}, "sites": {}, "decor": {}, "obstacles": {}, "siege": {}, "projectiles": {}, "effects": {},
    }
    parts = {"creatures": ["creatures"], "heroes": ["heroes"], "sites": ["sites"], "statics": ["decor", "obstacles", "siege", "projectiles", "effects"]}
    if only:
        for part, sections in parts.items():
            if part not in only:
                for sec in sections:
                    manifest[sec] = previous.get(sec, {})
    stats = build_creatures(plan, Path(args.references), manifest) if not only or "creatures" in only else {"reference": "kept", "silhouette": "kept"}
    heroes = build_heroes(Path(args.heroes), manifest) if not only or "heroes" in only else "kept"
    sites = build_sites(manifest) if not only or "sites" in only else "kept"
    if not only or "statics" in only:
        statics(manifest)
    # Keep entries already final (delivered strips are never overwritten by placeholders).
    kept = 0
    for section, entries in previous.items():
        if not isinstance(entries, dict) or section not in manifest:
            continue
        for k, v in entries.items():
            if not isinstance(v, dict):
                continue
            if v.get("status") == "final":
                manifest[section][k] = v
                kept += 1
            elif section in ("creatures", "heroes") and k in manifest[section]:
                # Delivered strips inside a set that is still partly placeholder.
                for a, d in (v.get("animations") or {}).items():
                    if isinstance(d, dict) and d.get("status") == "final":
                        manifest[section][k]["animations"][a] = d
                        kept += 1
                if isinstance(v.get("figure"), dict) and v["figure"].get("status") == "final":
                    manifest[section][k]["figure"] = v["figure"]
                    kept += 1
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=1, sort_keys=False) + "\n")
    print(f"creatures: {stats['reference']} from reference views, {stats['silhouette']} silhouettes; map heroes: {heroes} pantheon avatars + neutral; map sites: {sites}; finals kept: {kept}")
    if args.sheet:
        out = ROOT / "assets-source" / "sprites" / "placeholder-contact.png"
        contact(manifest, out)
        print(f"contact sheet: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
