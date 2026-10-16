#!/usr/bin/env python3
"""
Import the campaign expansion kit of 2026-10-15 (development tool; never packaged).

The kit (CAMPAIGN EXPANSION AND NEUTRAL CREATURES handoff) supplies 31 accepted
PNGs: six neutral creature portraits, six core animation atlases (1024 x 1536)
and a Pegasus flight atlas, ten map-site pictures (six neutral hiring sites, the
open and closed sluice, a ferry landing, a supply depot), six campaign icons and
two backgrounds (native 1672 x 941, never upscaled). Everything else the new
campaign uses already belongs to the game (reuse-map.json; never re-imported).

  1. With --kit DIR: copy the 31 PNGs byte for byte into assets-source/campaign-v2/
     AND assets-runtime/campaign-v2/ (filenames kept; checked against the kit's
     asset-manifest.json SHA-256), and the handoff, manifests and design files into
     docs/campaign-v2/. reference/iterations (superseded attempts) is never copied.
  2. Verify: every PNG in both folders matches its manifest hash and size.
  3. Display derivatives (the native files stay as delivered): map sites trimmed to
     their painted pixels (alpha > 8, a small margin kept) and reduced to at most
     SITE_MAX px, icons trimmed and reduced to ICON_MAX px — premultiplied
     Lanczos, never enlarged — in assets-runtime/campaign-v2/display/ (WebP with alpha).
  4. Sprites: animation-manifest.json's measured frame regions become sprite sets in
     the game's frame-region variant (packages/presentation/src/sprites.ts): file
     prefix new-assets/ -> campaign-v2/, every rectangle checked inside its atlas,
     victory = idle, ability = defend (Pegasus, Baku, Afanc) or attack (the others),
     Pegasus takeoff/fly/landing from the flight atlas without the excluded clipped pose.
     The set's scale (pixels per hex) matches the existing creatures of the same
     footprint (body width about BODY_HEXES hexes); the flight sourceScale (0.62) is
     the kit's starting value.
  5. assets-runtime/campaign-v2/manifest.json registers all of it under relative
     paths; packages/ui/src/assets/manifest.ts reads it.

Usage: python3 tools/assets/import_campaign_v2.py [--kit DIR] [--dry-run]
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
SRC = ROOT / "assets-source" / "campaign-v2"
RUNTIME = ROOT / "assets-runtime" / "campaign-v2"
DISPLAY = RUNTIME / "display"
DOCS = ROOT / "docs" / "campaign-v2"
MANIFEST = RUNTIME / "manifest.json"
PREFIX_IN = "new-assets/"
PREFIX_OUT = "campaign-v2/"

SITE_MAX = 384
ICON_MAX = 192
ALPHA_TRIM = 8

# Body width in hexes of the existing creatures (measured 2026-10-15 on the final strips:
# griffin 1.73, centaur 1.41 for two-hex bodies; wild boar 1.22, hoplite 0.92 for one hex).
BODY_HEXES = {1: 1.05, 2: 1.6}
FOOTPRINT = {"pegasus": 2, "root_runner": 1, "serpopard": 2, "baku": 2, "afanc": 2, "ahuitzotl": 1}
ABILITY_ALIAS = {"pegasus": "defend", "baku": "defend", "afanc": "defend", "root_runner": "attack", "serpopard": "attack", "ahuitzotl": "attack"}
CORE_STATES = ["idle", "move", "attack", "defend", "hit", "death"]
FLIGHT_STATES = ["takeoff", "fly", "landing"]

# Map-site picture -> sprite ID (map.site.<kind>[.<variant>]).
SITE_IDS = {
    "site-pegasus.png": "map.site.neutral_dwelling.pegasus",
    "site-root_runner.png": "map.site.neutral_dwelling.root_runner",
    "site-serpopard.png": "map.site.neutral_dwelling.serpopard",
    "site-baku.png": "map.site.neutral_dwelling.baku",
    "site-afanc.png": "map.site.neutral_dwelling.afanc",
    "site-ahuitzotl.png": "map.site.neutral_dwelling.ahuitzotl",
    "site-sluice-closed.png": "map.site.sluice.closed",
    "site-sluice-open.png": "map.site.sluice.open",
    "site-ferry.png": "map.site.ferry",
    "site-supply-depot.png": "map.site.supply_depot",
}
# Sites are drawn about this many hexes wide (the existing landmarks are 1.1-1.6).
SITE_HEXES = {"map.site.ferry": 1.6, "map.site.sluice.closed": 1.5, "map.site.sluice.open": 1.5, "map.site.supply_depot": 1.35}
SITE_HEXES_DEFAULT = 1.4
# The two sluice pictures are states of ONE site: one common ground anchor and one display size.
SLUICE = ("site-sluice-closed.png", "site-sluice-open.png")

DOC_FILES = [
    "asset-manifest.json", "animation-manifest.json", "reuse-map.json", "CLAUDE_HANDOFF.html", "CLAUDE_HANDOFF.txt",
    "START_HERE.txt", "validation.json", "generation-log-complete.json", "creature-designs.json",
    "design/mission-content.json", "design/campaign-graph.json", "design/neutral-content.json", "design/screen-specs.json",
    "design/CAMPAIGN_DESIGN_REVIEW.html", "design/CAMPAIGN_DESIGN_REVIEW.txt", "design/campaign-proposal.json",
    "design/current-mission-audit.json", "reference/atlas-player.js", "reference/browser-check.json",
]


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def load_kit_manifest(kit: Path | None) -> dict:
    p = (kit / "asset-manifest.json") if kit else DOCS / "asset-manifest.json"
    return json.loads(p.read_text(encoding="utf-8"))


def copy_from_kit(kit: Path, assets: list[dict], dry: bool) -> None:
    for a in assets:
        src = kit / a["deliveryFile"]
        if sha(src) != a["sha256"]:
            sys.exit(f"kit file {src} does not match its manifest hash")
        name = Path(a["deliveryFile"]).name
        for dest in (SRC / name, RUNTIME / name):
            if dest.exists() and sha(dest) == a["sha256"]:
                continue
            if dest.exists():
                sys.exit(f"{dest} exists with different content; refusing to overwrite")
            print(f"copy {src} -> {dest.relative_to(ROOT)}")
            if not dry:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, dest)
    for rel in DOC_FILES:
        src = kit / rel
        dest = DOCS / rel
        if src.exists() and not dest.exists():
            print(f"copy {rel} -> docs/campaign-v2/{rel}")
            if not dry:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, dest)


def verify(assets: list[dict]) -> None:
    bad = []
    for a in assets:
        name = Path(a["deliveryFile"]).name
        for d in (SRC, RUNTIME):
            p = d / name
            if not p.exists():
                bad.append(f"missing {p.relative_to(ROOT)}")
                continue
            if sha(p) != a["sha256"]:
                bad.append(f"hash mismatch {p.relative_to(ROOT)}")
            with Image.open(p) as im:
                if im.size != (a["width"], a["height"]):
                    bad.append(f"{name}: {im.size} != manifest {a['width']}x{a['height']}")
    if bad:
        sys.exit("verification failed:\n  " + "\n  ".join(bad))
    print(f"verified {len(assets)} pictures in assets-source/campaign-v2 and assets-runtime/campaign-v2")


def visible_bounds(im: Image.Image, threshold: int = ALPHA_TRIM) -> tuple[int, int, int, int]:
    if im.mode != "RGBA":
        return (0, 0, im.width, im.height)
    a = im.getchannel("A").point(lambda v: 255 if v > threshold else 0)
    return a.getbbox() or (0, 0, im.width, im.height)


def reduce_premultiplied(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Lanczos reduction with premultiplied alpha (keeps the antialiased edge, no dark fringe)."""
    if im.size == size:
        return im.copy()
    pre = im.convert("RGBa")
    return pre.resize(size, Image.Resampling.LANCZOS).convert("RGBA")


def derive(name: str, longest: int, bounds: tuple[int, int, int, int] | None, dry: bool) -> dict:
    """Trim to `bounds` (or the painted pixels plus a margin) and reduce; never enlarged."""
    src = RUNTIME / name
    with Image.open(src) as im0:
        im = im0.convert("RGBA")
    if bounds is None:
        x0, y0, x1, y1 = visible_bounds(im)
        pad = max(4, round(max(x1 - x0, y1 - y0) * 0.03))
        bounds = (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad))
    crop = im.crop(bounds)
    k = min(1.0, longest / max(crop.size))
    size = (max(1, round(crop.width * k)), max(1, round(crop.height * k)))
    out = reduce_premultiplied(crop, size)
    dest = DISPLAY / (Path(name).stem + ".webp")
    if not dry:
        DISPLAY.mkdir(parents=True, exist_ok=True)
        out.save(dest, "WEBP", quality=86, method=6, exact=False)
    return {"file": f"campaign-v2/display/{dest.name}", "width": size[0], "height": size[1], "crop": list(bounds), "scale": k}


def ground_anchor(name: str, bounds: tuple[int, int, int, int]) -> tuple[float, float]:
    """The landmark's ground point: horizontal centre of its painted pixels, near the bottom of
    the opaque base (the lowest row with a solid run), as fractions of the trimmed picture."""
    with Image.open(RUNTIME / name) as im0:
        im = im0.convert("RGBA").crop(bounds)
    a = im.getchannel("A")
    w, h = im.size
    px = a.load()
    rows = []
    for y in range(h):
        n = sum(1 for x in range(0, w, 2) if px[x, y] > 128)
        rows.append(n)
    widest = max(rows) or 1
    # Lowest row still at least 35 % as wide as the widest row: the base, not a stray pebble.
    base = max((y for y, n in enumerate(rows) if n >= widest * 0.35), default=h - 1)
    xs = [x for x in range(0, w, 2) if px[x, base] > 128]
    cx = (min(xs) + max(xs)) / 2 if xs else w / 2
    return (round(cx / w, 4), round(min(0.97, (base + 1) / h - 0.04), 4))


def regions(frames: list[dict]) -> list[dict]:
    out = []
    for f in frames:
        r = {"rect": [int(v) for v in f["rect"]], "anchor": [float(v) for v in f["anchor"]], "sourceScale": float(f.get("sourceScale", 1))}
        if "sourceCell" in f:
            r["sourceCell"] = [int(v) for v in f["sourceCell"]]
        out.append(r)
    return out


def sprite_sets(anim: dict, sizes: dict[str, tuple[int, int]]) -> dict:
    excluded = {(e["state"], tuple(e["sourceCell"])) for e in anim.get("excludedFrames", [])}
    sets = {}
    for cid, s in anim["sets"].items():
        animations = {}
        concrete = {}
        for state, a in s["animations"].items():
            if "alias" in a:
                continue
            file = a["file"]
            if not file.startswith(PREFIX_IN):
                sys.exit(f"{cid}.{state}: unexpected file {file}")
            runtime_file = PREFIX_OUT + file[len(PREFIX_IN):]
            frames = [f for f in a["frames"] if (state, tuple(f.get("sourceCell", ()))) not in excluded]
            regs = regions(frames)
            w, h = sizes[Path(file).name]
            for r in regs:
                x, y, rw, rh = r["rect"]
                if x < 0 or y < 0 or x + rw > w or y + rh > h:
                    sys.exit(f"{cid}.{state}: rectangle {r['rect']} outside {w}x{h}")
            concrete[state] = {
                "file": runtime_file,
                "frames": len(regs),
                "frameWidth": max(r["rect"][2] for r in regs),
                "frameHeight": max(r["rect"][3] for r in regs),
                "fps": a["fps"],
                "loop": bool(a["loop"]),
                "anchor": [0.5, 0.9],
                "status": "final",
                "regions": regs,
            }
        for state in CORE_STATES:
            if state not in concrete:
                sys.exit(f"{cid}: missing core state {state}")
        if cid == "pegasus":
            for state in FLIGHT_STATES:
                if state not in concrete:
                    sys.exit("pegasus: missing flight state " + state)
            if any(tuple(r.get("sourceCell", ())) == (0, 2) for r in concrete["takeoff"]["regions"]):
                sys.exit("pegasus: the clipped takeoff pose [0,2] must not play")
        animations.update(concrete)
        animations["victory"] = {**concrete["idle"], "aliasOf": "idle"}
        animations["ability"] = {**concrete[ABILITY_ALIAS[cid]], "loop": False, "aliasOf": ABILITY_ALIAS[cid]}
        idle_w = sorted(r["rect"][2] for r in concrete["idle"]["regions"])
        median_w = (idle_w[1] + idle_w[2]) / 2
        ppx = round(median_w / BODY_HEXES[FOOTPRINT[cid]], 2)
        sets[cid] = {
            "status": "final",
            "provenance": "Campaign expansion kit 2026-10-15: native atlas, measured frame regions (animation-manifest.json); not retouched or upscaled.",
            "facing": "right",
            "pixelsPerHex": ppx,
            "animations": animations,
        }
    return sets


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kit", type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    km = load_kit_manifest(args.kit)
    assets = km["assets"]
    if len(assets) != 31:
        sys.exit(f"expected 31 accepted pictures, the manifest lists {len(assets)}")
    if args.kit:
        copy_from_kit(args.kit, assets, args.dry_run)
    verify(assets)
    anim_path = (args.kit / "animation-manifest.json") if args.kit else DOCS / "animation-manifest.json"
    anim = json.loads(anim_path.read_text(encoding="utf-8"))
    sizes = {Path(a["deliveryFile"]).name: (a["width"], a["height"]) for a in assets}

    out_assets: dict[str, dict] = {}
    sites: dict[str, dict] = {}
    # One crop for both sluice states (their union), so open and closed share one anchor and size.
    sluice_bounds = None
    for n in SLUICE:
        with Image.open(RUNTIME / n) as im:
            b = visible_bounds(im.convert("RGBA"))
        sluice_bounds = b if sluice_bounds is None else (min(sluice_bounds[0], b[0]), min(sluice_bounds[1], b[1]), max(sluice_bounds[2], b[2]), max(sluice_bounds[3], b[3]))
    pad = 24
    sluice_bounds = (max(0, sluice_bounds[0] - pad), max(0, sluice_bounds[1] - pad), min(1254, sluice_bounds[2] + pad), min(1254, sluice_bounds[3] + pad))
    sluice_anchor = None
    for n in SLUICE:
        a = ground_anchor(n, sluice_bounds)
        sluice_anchor = a if sluice_anchor is None else (round((sluice_anchor[0] + a[0]) / 2, 4), max(sluice_anchor[1], a[1]))

    for a in assets:
        name = Path(a["deliveryFile"]).name
        entry = {"file": a["proposedRuntimeFile"], "kind": a["kind"], "width": a["width"], "height": a["height"], "sha256": a["sha256"]}
        if a["kind"] == "map-site":
            bounds = sluice_bounds if name in SLUICE else None
            d = derive(name, SITE_MAX, bounds, args.dry_run)
            entry["display"] = {"file": d["file"], "width": d["width"], "height": d["height"]}
            anchor = sluice_anchor if name in SLUICE else ground_anchor(name, tuple(d["crop"]))
            sid = SITE_IDS[name]
            hexes = SITE_HEXES.get(sid, SITE_HEXES_DEFAULT)
            sites[sid] = {
                "file": d["file"],
                "width": d["width"],
                "height": d["height"],
                "anchor": list(anchor),
                "pixelsPerHex": round(d["width"] / hexes, 2),
                "status": "final",
                "provenance": f"Campaign expansion kit 2026-10-15 ({name}); trimmed to its painted pixels and reduced for the map (native file kept beside it).",
            }
        elif a["kind"] == "icon":
            d = derive(name, ICON_MAX, None, args.dry_run)
            entry["display"] = {"file": d["file"], "width": d["width"], "height": d["height"]}
        out_assets[a["id"]] = entry

    data = {
        "schema": "pantheon-realms-campaign-v2-1",
        "notice": "Written by tools/assets/import_campaign_v2.py from the campaign expansion kit of 2026-10-15. Relative paths only.",
        "assets": out_assets,
        "creatures": sprite_sets(anim, sizes),
        "sites": sites,
    }
    if args.dry_run:
        print(json.dumps({k: (len(v) if isinstance(v, dict) else v) for k, v in data.items()}, indent=1))
        return
    MANIFEST.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {MANIFEST.relative_to(ROOT)}: {len(out_assets)} pictures, {len(data['creatures'])} sprite sets, {len(sites)} map sites")
    for cid, s in data["creatures"].items():
        print(f"  {cid:12s} pixelsPerHex {s['pixelsPerHex']:7.2f}  states {', '.join(s['animations'])}")
    for sid, s in sites.items():
        print(f"  {sid:40s} {s['width']}x{s['height']} anchor {s['anchor']} ppx {s['pixelsPerHex']}")


if __name__ == "__main__":
    main()
