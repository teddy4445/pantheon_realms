#!/usr/bin/env python3
"""
Import the recruitment and route kit of 2026-10-14 (development tool; never packaged).

The kit (RECRUITMENT & PERSISTENT JOURNEY HANDOFF) supplies nine new text-free
RGBA PNGs, 1254 x 1254, and reuses art the game already has. This focused step
knows those nine IDs; it does not touch the generic art, icon or sprite imports.

  1. With --kit DIR (the delivery folder): copy the nine PNGs, byte for byte,
     into assets-source/ui/recruitment-route-v1/ (checked against the kit's
     asset-manifest.json SHA-256), and the handoff, its manifests and the
     reference pictures into docs/recruitment-route-v1/ for review.
  2. Runtime pictures: each source PNG is reduced (premultiplied alpha,
     Lanczos; never enlarged) to the size the game draws it at and written to
     assets-runtime/recruitment-route-v1/<name>.png. Its antialiased alpha edge
     is kept as delivered (no background removal, no trimming).
  3. Recruitment creature strips: the native source idle strip of every
     creature form — the 84 pantheon forms of the kit and the neutral ones
     (assets-source/sprites/final/sprite.creature.<pantheon>.tier<N>.<base|upgraded>.idle.png,
     sprite.creature.neutral.<family>.<form>.idle.png, cut by
     `npm run sprites:cut`) — is copied byte for byte to
     assets-runtime/recruitment-route-v1/creatures/<creatureId>.idle.png, with
     its frame count, frame rate and anchor from the sidecar, and the union of
     its visible pixels (alpha > 32) over every idle frame. Only the recruitment
     stage uses these copies; map and battle keep their own strips and scales.
     They are the delivered sprites at their native resolution, not new art.
  4. assets-runtime/recruitment-route-v1/manifest.json registers all of it under
     relative paths (packages/ui/src/assets/manifest.ts reads it).

Usage: python3 tools/assets/import_recruitment_route.py [--kit DIR] [--dry-run]
Needs: Pillow.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets-source" / "ui" / "recruitment-route-v1"
DOCS = ROOT / "docs" / "recruitment-route-v1"
SPRITES = ROOT / "assets-source" / "sprites" / "final"
PLAN = ROOT / "assets-source" / "sprites" / "content-plan.json"
OUT = ROOT / "assets-runtime" / "recruitment-route-v1"
MANIFEST = OUT / "manifest.json"
PREFIX = "recruitroute."
ALPHA_VISIBLE = 32

# The longest side each picture is drawn at in the game, doubled for high-density screens.
RUNTIME_SIZE = {
    "icon-recruit-all": 256,
    "icon-train-troops": 256,
    "icon-resume-route": 256,
    "route-chevron-current": 256,
    "route-chevron-later": 256,
    "route-hourglass": 256,
    "route-day-badge": 256,
    "route-destination": 512,
    "route-selection-ring": 512,
}
ROLE = {
    "icon-recruit-all": "Recruit all action (three shields and spears)",
    "icon-train-troops": "Train existing troops (anvil and hammer)",
    "icon-resume-route": "Continue journey (boot and arrow)",
    "route-chevron-current": "Route step reachable today (gold arrowhead, points up)",
    "route-chevron-later": "Route step on a later day (bronze arrowhead, points up)",
    "route-hourglass": "Later-day cue beside the first step of a new day (upright)",
    "route-day-badge": "Blank parchment for the live arrival-day number (upright)",
    "route-destination": "Journey destination seal (compass and laurel), laid on the ground",
    "route-selection-ring": "Selected hero ring at the feet, laid on the ground",
}
DOC_FILES = [
    "CLAUDE_HANDOFF.txt",
    "SEND_TO_CLAUDE.txt",
    "asset-manifest.json",
    "reuse-map.json",
    "creature-map.json",
    "generation-prompts.json",
    "generation-refinements.json",
    "validation.json",
    "browser-validation.json",
    "review-desktop.png",
    "review-mobile.png",
    "review-creatures.png",
    "reference/recruitment-upgrade-unlocked.png",
    "reference/recruitment-upgrade-locked.png",
    "reference/adventure-route-concept.png",
]


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def visible_box(alpha: Image.Image) -> tuple[int, int, int, int] | None:
    return alpha.point(lambda a: 255 if a > ALPHA_VISIBLE else 0).getbbox()


def reduce(img: Image.Image, longest: int) -> Image.Image:
    k = min(1.0, longest / max(img.width, img.height))
    if k >= 1.0:
        return img.copy()
    size = (max(1, round(img.width * k)), max(1, round(img.height * k)))
    # Premultiplied while resampling, so the transparent surround never darkens the antialiased edge.
    return img.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")


def copy_kit(kit: Path, dry: bool, problems: list[str]) -> None:
    manifest = json.loads((kit / "asset-manifest.json").read_text(encoding="utf-8"))
    for a in manifest["assets"]:
        src = kit / a["file"]
        if not src.exists():
            problems.append(f"kit: missing {a['file']}")
            continue
        if sha256(src) != a["sha256"]:
            problems.append(f"kit: {a['file']} does not match its SHA-256 in asset-manifest.json")
            continue
        if not dry:
            SRC.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, SRC / src.name)
    for rel in DOC_FILES:
        src = kit / rel
        if not src.exists():
            problems.append(f"kit: missing {rel} (docs copy)")
            continue
        if not dry:
            dest = DOCS / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kit", help="the delivery folder (copies its new PNGs and documents into the project first)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    problems: list[str] = []
    if args.kit:
        copy_kit(Path(args.kit).resolve(), args.dry_run, problems)

    kit_manifest_path = DOCS / "asset-manifest.json"
    if not kit_manifest_path.exists():
        print("nothing to import: docs/recruitment-route-v1/asset-manifest.json is missing (run once with --kit DIR)")
        return 1
    kit_manifest = json.loads(kit_manifest_path.read_text(encoding="utf-8"))
    assets: dict[str, dict] = {}
    for a in kit_manifest["assets"]:
        stem = Path(a["file"]).stem
        if stem not in RUNTIME_SIZE:
            problems.append(f"{a['id']}: not one of the nine kit pictures")
            continue
        src = SRC / f"{stem}.png"
        if not src.exists():
            problems.append(f"{src.relative_to(ROOT).as_posix()}: missing")
            continue
        if sha256(src) != a["sha256"]:
            problems.append(f"{src.name}: differs from the delivered file (SHA-256)")
            continue
        img = Image.open(src).convert("RGBA")
        if img.getchannel("A").getextrema()[0] != 0:
            problems.append(f"{src.name}: no transparency")
            continue
        box = visible_box(img.getchannel("A"))
        out = reduce(img, RUNTIME_SIZE[stem])
        rel = f"recruitment-route-v1/{stem}.png"
        if not args.dry_run:
            OUT.mkdir(parents=True, exist_ok=True)
            out.save(ROOT / "assets-runtime" / rel, "PNG", optimize=True)
        assets[PREFIX + stem] = {
            "file": rel,
            "width": out.width,
            "height": out.height,
            "sourceWidth": img.width,
            "sourceHeight": img.height,
            # Measured on the delivered picture (alpha > 32), as fractions [left, top, right, bottom].
            "visibleBounds": [round(box[0] / img.width, 6), round(box[1] / img.height, 6), round(box[2] / img.width, 6), round(box[3] / img.height, 6)] if box else [0, 0, 1, 1],
            "role": ROLE[stem],
            "sourceSha256": a["sha256"],
        }

    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    kit_creatures = {}
    cmap = DOCS / "creature-map.json"
    if cmap.exists():
        kit_creatures = {c["key"]: c for c in json.loads(cmap.read_text(encoding="utf-8"))}
    creatures: dict[str, dict] = {}
    mismatched: list[str] = []
    compared = 0
    for c in sorted(plan["creatures"], key=lambda c: c["id"]):
        key = c["spriteAssetId"].removesuffix(".sprites")
        src = SPRITES / f"sprite.{key}.idle.png"
        side = src.with_suffix(".json")
        if not src.exists() or not side.exists():
            problems.append(f"{c['id']}: native idle strip sprite.{key}.idle.png (+ .json) missing")
            continue
        cfg = json.loads(side.read_text(encoding="utf-8"))
        img = Image.open(src)
        n = int(cfg["frames"])
        fw, fh = img.width // n, img.height
        if fw * n != img.width:
            problems.append(f"{src.name}: width is not {n} equal frames")
            continue
        alpha = img.convert("RGBA").getchannel("A")
        boxes = [b for i in range(n) if (b := visible_box(alpha.crop((i * fw, 0, (i + 1) * fw, fh))))]
        if not boxes:
            problems.append(f"{src.name}: no visible pixels")
            continue
        union = [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]
        k = kit_creatures.get(key)
        compared += 1 if k else 0
        if k and (k["visibleUnionPx"] != union or k["frameWidth"] != fw or k["frameHeight"] != fh or k["frames"] != n):
            mismatched.append(key)
        rel = f"recruitment-route-v1/creatures/{c['id']}.idle.png"
        if not args.dry_run:
            (OUT / "creatures").mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, ROOT / "assets-runtime" / rel)
        creatures[c["id"]] = {
            "file": rel,
            "frames": n,
            "frameWidth": fw,
            "frameHeight": fh,
            "fps": cfg.get("fps", 3),
            "anchor": cfg.get("anchor", [0.5, 0.9]),
            # Union of the visible pixels (alpha > 32) over all idle frames, in frame pixels [x0, y0, x1, y1].
            "visibleUnion": union,
            "sourceKey": key,
        }

    manifest = {
        "schema": "pantheon-realms-recruitment-route-v1",
        "provenance": "Recruitment & route kit of 2026-10-14: nine pictures from the built-in image generator, reduced for runtime; creature strips are byte copies of the delivered native idle strips.",
        "assets": dict(sorted(assets.items())),
        "creatures": creatures,
    }
    if not args.dry_run:
        OUT.mkdir(parents=True, exist_ok=True)
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"pictures: {len(assets)} of {len(RUNTIME_SIZE)}; recruitment creature strips: {len(creatures)}")
    if kit_creatures:
        print(f"visible unions checked against the kit's creature-map.json ({len(kit_creatures)} forms): {compared - len(mismatched)} equal, {len(mismatched)} different, {len(kit_creatures) - compared} not found")
        for m in mismatched:
            print(f"  differs: {m}")
    for p in problems:
        print(f"PROBLEM: {p}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
