#!/usr/bin/env python3
"""
Import final 2D sprites delivered by GPT-6 (development tool; never packaged).

GPT-6 delivers *sheets* (GPT6_2D_CONTENT_GENERATION.md); `npm run sprites:cut`
cuts them into the single files below, in assets-source/sprites/final/, each
with a sidecar JSON giving its frame count, frame rate, loop, anchor and
pixels per hex. A single file may also be delivered directly under the same
name (then the nominal frame sizes below apply). `npm run sprites:import`
checks every file (transparent background, frame grid, sizes), reduces it to
its runtime size (never enlarging), writes WebP under
assets-runtime/sprites/final/ and registers it in
assets-runtime/sprites/manifest.json with `"status": "final"`. Strips not
delivered yet keep their placeholders; nothing in the game's code changes.

File names (one image each; strips are N equal frames left to right):

  sprite.creature.<pantheon>.tier<N>.<base|upgraded>.<animation>.png
  sprite.creature.neutral.<family>.<base|upgraded>.<animation>.png
        frames 512 x 512 (two-hex creatures 768 x 512), facing right, feet on
        the baseline at 90 % of the height, one hex width = 240 px (any frame
        height from half to twice the nominal one is accepted, same shape;
        the hex width scales with it)
  sprite.hero.<pantheon>.<idle|walk|prepare|cast>.<e|ne|n|nw|w|sw|s|se>.png
        (prepare: readying for battle, cast: casting a map spell — GPT6_BRIEF_11; both play once)
        frames 320 x 320, ground point between the mount's feet at 88 %,
        one hex width = 150 px (e, ne, n, s, se are enough: the game mirrors
        e, ne, se for w, nw, sw)
  sprite.hero.<pantheon>.figure.png          1024 x 1024 still (hero screen)
  sprite.map.site.<kind>[.<variant>].png     512 x 512, ground at 92 %, one hex = 280 px
  sprite.map.decor.<kind>.png                256 x 256, ground at 95 %, one hex = 280 px
  sprite.battle.obstacle.<kind>.png          512 x 512, ground at 92 %, one hex = 240 px
  sprite.battle.siege.<kind>.<state>.png     512 x 512 (keep 768 x 768), ground at 95 %
  sprite.battle.siege.<wall|gate|tower>.<state>.<pantheon>.png  512 x 512, footprint centre at 68 % (Brief 15:
        one pantheon's pieces on the straight wall line; keep.<state>.<pantheon> 768 x 768 at 95 %)
  sprite.battle.siege.catapult.intact.png    512 x 512, ground at 95 % (the attackers' catapult, Brief 15)
  sprite.fx.siege.catapult.throw.png         frames 512 x 512, ground at 95 %, drawn normally (not additive)
  sprite.battle.projectile.<kind>.png        128 x 32, centred, pointing right
  sprite.fx.<effect>.png                     frames 256 x 256, centred at 62 %
        the nine shared battle effects keep their short IDs (sprite.fx.impact.png →
        effects "impact"); every magic and Favor phase keeps its full ID
        (sprite.fx.spell.lightning.cast.png → effects "fx.spell.lightning.cast",
        also fx.miracle.*, fx.status.*, fx.gift.*, fx.offering.*;
        VFX_MAGIC_AND_FAVORS.md)

A sidecar <same name>.json may set "fps", "loop", "anchor" and (effects)
"additive"; with "frames" and "pixelsPerHex" (as written by the cutter) any
frame size is accepted. Effects loop only when their sidecar says so (status
overlays, travel and aura phases).

Usage: python3 tools/assets/sprites/import_sprites.py [--dry-run] [--src DIR] [--only TEXT] [--self-test]
  --only TEXT   import only files whose name contains TEXT (e.g. --only sprite.fx.)
  --self-test   import synthetic effect strips into a temporary folder and check the IDs and loops
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "assets-source" / "sprites" / "final"
PLAN = ROOT / "assets-source" / "sprites" / "content-plan.json"
RUNTIME = ROOT / "assets-runtime"
OUT = RUNTIME / "sprites" / "final"
MANIFEST = RUNTIME / "sprites" / "manifest.json"

# Default frame rates: with the sheets' frame counts (GPT6_2D_CONTENT_GENERATION.md) they give the pacing
# targets of CREATURE_ANIMATION_REQUIREMENTS.md (idle 6 @ 3 = 2 s, move 6 @ 8 = 0.75 s, attack/shoot 6 @ 6 = 1 s,
# hit 3 @ 10 = 0.3 s, death 6 @ 5 = 1.2 s, victory 6 @ 4 = 1.5 s). A sidecar JSON (the cutter writes one) overrides them.
FPS = {"idle": 3, "move": 8, "attack": 6, "shoot": 6, "defend": 8, "hit": 10, "death": 5, "victory": 4, "takeoff": 8, "fly": 10, "landing": 8, "cast": 6, "ability": 6, "walk": 8, "prepare": 6}
LOOPS = {"idle", "move", "fly", "victory", "walk"}
ANIMS = set(FPS)
DIRS = {"e", "ne", "n", "nw", "w", "sw", "s", "se"}
# The nine shared battle effects registered under short IDs before the magic and Favor phases existed
# (sprite.fx.impact.png → effects "impact"). Everything else under sprite.fx.* keeps its full fx.* ID.
LEGACY_FX = {"impact", "ward", "morale.up", "morale.down", "spell.damage", "spell.area", "spell.heal", "spell.buff", "spell.curse"}


def effect_key(name: str) -> str:
    """Manifest key of an effect file (name without "sprite."): legacy short ID or the full fx.* asset ID."""
    rest = name.removeprefix("fx.")
    return rest if rest in LEGACY_FX else name


def effect_entry(entry: dict, key: str, over: dict) -> dict:
    """Manifest entry of an effect strip: it loops only when its sidecar says so; additive unless told otherwise."""
    legacy = key in LEGACY_FX
    return {
        **entry,
        "loop": bool(over.get("loop", False)),
        "provenance": "GPT-6 effect strip." if legacy else "Siege art (GPT-6 Brief 15), imported by `npm run sprites:import` with its full asset ID." if key.startswith("fx.siege.") else "Magic and Favor VFX phase (VFX_MAGIC_AND_FAVORS.md), imported by `npm run sprites:import` with its full asset ID.",
        "additive": bool(over.get("additive", not key.startswith("fx.siege."))),
    }

HERO_DIRS_NEEDED = {"e", "ne", "n", "s", "se"}  # the game mirrors e, ne, se for w, nw, sw

# kind → (frame w, frame h, anchor, source px per hex, runtime scale)
SPEC = {
    "creature": ((512, 512), (0.5, 0.9), 240, 0.5),
    "creature2": ((768, 512), (0.5, 0.9), 240, 0.5),
    "hero": ((320, 320), (0.5, 0.88), 150, 0.6),
    "site": ((512, 512), (0.5, 0.92), 280, 0.5),
    "decor": ((256, 256), (0.5, 0.95), 280, 0.5),
    "obstacle": ((512, 512), (0.5, 0.92), 240, 0.5),
    "siege": ((512, 512), (0.5, 0.95), 240, 0.5),
    "keep": ((768, 768), (0.5, 0.95), 240, 0.5),
    "projectile": ((128, 32), (0.5, 0.5), 240, 0.5),
    "fx": ((256, 256), (0.5, 0.62), 240, 0.5),
    # Brief 15 (2026-10-05): a pantheon's wall, gate and tower pieces stand on one straight wall
    # line and join the pieces above and below (footprint centre at 68 %); the catapult's throw
    # strip has the catapult still's framing (ground at 95 %) and is drawn normally (not additive).
    "wallpiece": ((512, 512), (0.5, 0.68), 240, 0.5),
    "siegefx": ((512, 512), (0.5, 0.95), 240, 0.5),
}


def transparent_background(img: Image.Image, fw: int, fh: int) -> bool:
    a = np.asarray(img.convert("RGBA"))[:, :, 3]
    for i in range(img.width // fw):
        f = a[:, i * fw:(i + 1) * fw]
        border = np.concatenate([f[0], f[-1], f[:, 0], f[:, -1]])
        if (border > 16).mean() > 0.02:
            return False
    return True


def runtime_strip(img: Image.Image, fw: int, fh: int, k: float) -> tuple[Image.Image, int, int]:
    n = img.width // fw
    rw, rh = max(1, round(fw * k)), max(1, round(fh * k))
    out = Image.new("RGBA", (rw * n, rh), (0, 0, 0, 0))
    for i in range(n):
        out.alpha_composite(img.crop((i * fw, 0, (i + 1) * fw, fh)).resize((rw, rh), Image.LANCZOS), (i * rw, 0))
    return out, rw, rh


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--src", help="folder to import from (default assets-source/sprites/final)")
    ap.add_argument("--only", help="import only files whose name contains this text")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    global SRC
    if args.src:
        SRC = Path(args.src).resolve()
    if not SRC.exists():
        print(f"nothing to import: {SRC} does not exist")
        return 0
    plan = json.loads(PLAN.read_text())
    by_asset = {c["spriteAssetId"].removesuffix(".sprites"): c for c in plan["creatures"]}
    manifest = json.loads(MANIFEST.read_text())
    problems: list[str] = []
    done: list[str] = []
    for src in sorted(SRC.glob("sprite.*.png")):
        if args.only and args.only not in src.name:
            continue
        name = src.stem.removeprefix("sprite.")
        side = src.with_suffix(".json")
        over = json.loads(side.read_text()) if side.exists() else {}
        img = Image.open(src).convert("RGBA")
        parts = name.split(".")
        target: tuple[str, ...]
        if parts[0] == "creature":
            anim = parts[-1]
            c = by_asset.get(".".join(parts[:-1]))
            if not c or anim not in ANIMS:
                problems.append(f"{src.name}: unknown creature form or animation")
                continue
            kind = "creature2" if c["footprint"] == 2 else "creature"
            target = ("creatures", c["id"], anim)
        elif parts[0] == "hero" and len(parts) == 3 and parts[2] == "figure":
            target = ("figure", parts[1])
            kind = "figure"
        elif parts[0] == "hero" and len(parts) == 4 and parts[2] in ("idle", "walk", "prepare", "cast") and parts[3] in DIRS:
            target = ("heroes", parts[1], parts[2], parts[3])
            kind = "hero"
        elif name.startswith("map.site."):
            target = ("sites", name)
            kind = "site"
        elif name.startswith("map.decor."):
            target = ("decor", name.removeprefix("map.decor."))
            kind = "decor"
        elif name.startswith("battle.obstacle."):
            target = ("obstacles", name.removeprefix("battle.obstacle."))
            kind = "obstacle"
        elif name.startswith("battle.siege."):
            key = name.removeprefix("battle.siege.")
            target = ("siege", key)
            pieces = key.split(".")
            kind = "keep" if key.startswith("keep.") else "wallpiece" if len(pieces) == 3 and pieces[0] in ("wall", "gate", "tower") else "siege"
        elif name.startswith("battle.projectile."):
            target = ("projectiles", name.removeprefix("battle.projectile."))
            kind = "projectile"
        elif parts[0] == "fx":
            target = ("effects", effect_key(name))
            kind = "siegefx" if name.startswith("fx.siege.") else "fx"
        else:
            problems.append(f"{src.name}: name does not match any sprite family")
            continue
        if kind == "figure":
            if max(img.width, img.height) < 300 or not transparent_background(img, img.width, img.height):
                problems.append(f"{src.name}: figure must be at least 300 px with a transparent background")
                continue
            fig = img.copy()
            fig.thumbnail((720, 720), Image.LANCZOS)
            path = OUT / "heroes" / target[1] / "figure.webp"
            if not args.dry_run:
                path.parent.mkdir(parents=True, exist_ok=True)
                fig.save(path, "WEBP", quality=90, method=6)
                h = manifest["heroes"].setdefault(target[1], {"status": "placeholder", "provenance": "", "facing": "right", "pixelsPerHex": 90, "animations": {}})
                h["figure"] = {"file": path.relative_to(RUNTIME).as_posix(), "width": fig.width, "height": fig.height, "status": "final"}
            done.append(src.name)
            continue
        (fw0, fh0), anchor, ppx0, k0 = SPEC[kind]
        if "frames" in over and "pixelsPerHex" in over:
            # Cut from a sheet: the sidecar says how many frames and how many pixels make one hex width.
            n = int(over["frames"])
            fh = img.height
            fw = img.width // max(1, n)
            if n < 1 or fw * n != img.width:
                problems.append(f"{src.name}: width {img.width} is not {n} equal frames")
                continue
            ppx = float(over["pixelsPerHex"])
        else:
            # Any uniform frame height from half to twice the nominal one is accepted (same aspect ratio);
            # the scale convention (px per hex) scales with it.
            fh = img.height
            fw = round(fh * fw0 / fh0)
            if not (fh0 / 2 <= fh <= fh0 * 2) or fw <= 0 or img.width % fw != 0:
                problems.append(f"{src.name}: expected frames of {fw0} x {fh0} px (or the same shape from half to twice that size) side by side; got {img.width} x {img.height}")
                continue
            ppx = ppx0 * fh / fh0
        # Runtime size: at most the nominal runtime scale (ppx0 * k0 pixels per hex), never enlarged.
        k = min(1.0, ppx0 * k0 / ppx)
        if not transparent_background(img, fw, fh):
            problems.append(f"{src.name}: background is not transparent")
            continue
        strip, rw, rh = runtime_strip(img, fw, fh, k)
        frames = img.width // fw
        path = OUT / "/".join(target[:-1]) / f"{target[-1]}.webp" if target[0] in ("creatures", "heroes") else OUT / target[0] / f"{target[-1]}.webp"
        anchor = tuple(over.get("anchor", anchor))
        entry = {
            "file": path.relative_to(RUNTIME).as_posix(),
            "frames": frames,
            "frameWidth": rw,
            "frameHeight": rh,
            "fps": over.get("fps", FPS.get(target[-2] if target[0] == "heroes" else target[-1], 12)),
            "loop": over.get("loop", (target[2] if target[0] in ("creatures", "heroes") else "") in LOOPS),
            "anchor": [anchor[0], anchor[1]],
            "pixelsPerHex": round(ppx * k, 2),
            "status": "final",
        }
        if not args.dry_run:
            path.parent.mkdir(parents=True, exist_ok=True)
            strip.save(path, "WEBP", quality=90, method=6)
            if target[0] == "creatures":
                s = manifest["creatures"][target[1]]
                s["animations"][target[2]] = entry
                c = next(x for x in plan["creatures"] if x["id"] == target[1])
                if all(s["animations"].get(a, {}).get("status") == "final" for a in c["animations"]):
                    s.update({"status": "final", "pixelsPerHex": entry["pixelsPerHex"], "provenance": "GPT-6 animation strips (GPT6_2D_CONTENT_GENERATION.md), imported by `npm run sprites:import`."})
                    s.pop("tint", None)
            elif target[0] == "heroes":
                h = manifest["heroes"][target[1]]
                anim = h["animations"].setdefault(target[2], {**entry})
                if target[3] == "e":
                    anim.update(entry)
                anim.setdefault("directions", {})[target[3]] = entry
                if all(HERO_DIRS_NEEDED <= set(h["animations"].get(a, {}).get("directions", {})) for a in ("idle", "walk")):
                    h.update({"status": "final", "pixelsPerHex": entry["pixelsPerHex"], "provenance": "GPT-6 mounted-hero sheet (idle and walk in five directions, mirrored for the other three), imported by `npm run sprites:import`."})
                    h.pop("tint", None)
            else:
                still = {k2: entry[k2] for k2 in ("file", "anchor", "pixelsPerHex", "status")}
                if target[0] == "effects":
                    manifest["effects"][target[1]] = effect_entry(entry, target[1], over)
                else:
                    manifest[target[0]][target[1]] = {**still, "width": rw * frames, "height": rh, "provenance": "GPT-6 final art, imported by `npm run sprites:import`."}
        done.append(src.name)
    if not args.dry_run and done:
        MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n")
    for p in problems:
        print("PROBLEM", p, file=sys.stderr)
    print(f"imported {len(done)} file(s){' (dry run)' if args.dry_run else ''}; {len(problems)} problem(s)")
    return 1 if problems else 0


def self_test() -> int:
    """Synthetic effect strips → import into a temporary project → check IDs, loops and untouched entries."""
    import shutil
    import tempfile

    global SRC, PLAN, RUNTIME, OUT, MANIFEST
    saved = (SRC, PLAN, RUNTIME, OUT, MANIFEST)
    tmp = Path(tempfile.mkdtemp(prefix="import-sprites-"))
    fails: list[str] = []
    try:
        SRC = tmp / "src"
        SRC.mkdir()
        PLAN = tmp / "content-plan.json"
        PLAN.write_text(json.dumps({"creatures": []}))
        RUNTIME = tmp / "runtime"
        OUT = RUNTIME / "sprites" / "final"
        MANIFEST = RUNTIME / "sprites" / "manifest.json"
        MANIFEST.parent.mkdir(parents=True)
        keep = {"file": "sprites/final/effects/keep.webp", "frames": 1, "status": "final"}
        MANIFEST.write_text(json.dumps({"effects": {"fx.spell.other.cast": keep}, "creatures": {}, "heroes": {}}))

        def strip(name: str, frames: int, side: dict | None) -> None:
            fw = fh = 128
            img = Image.new("RGBA", (fw * frames, fh), (0, 0, 0, 0))
            px = img.load()
            for i in range(frames):
                for y in range(40, 90):
                    for x in range(i * fw + 40, i * fw + 90):
                        px[x, y] = (255, 200, 80, 255)
            img.save(SRC / f"sprite.{name}.png")
            if side is not None:
                (SRC / f"sprite.{name}.json").write_text(json.dumps({"frames": frames, "pixelsPerHex": 120, **side}))

        strip("fx.impact", 6, {"fps": 14})
        strip("fx.spell.test.cast", 6, {"fps": 10, "loop": False})
        strip("fx.spell.test.travel", 4, {"fps": 12, "loop": True})
        strip("fx.status.test", 6, {"fps": 6, "loop": True, "additive": False})
        strip("fx.gift.test", 8, {"fps": 12})
        rc = main(["--only", "sprite.fx.", "--src", str(SRC)])
        if rc != 0:
            fails.append(f"import returned {rc}")
        eff = json.loads(MANIFEST.read_text())["effects"]
        expect = {
            "impact": (6, False, True),
            "fx.spell.test.cast": (6, False, True),
            "fx.spell.test.travel": (4, True, True),
            "fx.status.test": (6, True, False),
            "fx.gift.test": (8, False, True),
        }
        for key, (frames, loop, additive) in expect.items():
            e = eff.get(key)
            if not e:
                fails.append(f"missing effects[{key!r}]")
                continue
            if (e["frames"], e["loop"], e["additive"]) != (frames, loop, additive):
                fails.append(f"{key}: frames/loop/additive {(e['frames'], e['loop'], e['additive'])} != {(frames, loop, additive)}")
            if not (RUNTIME / e["file"]).exists():
                fails.append(f"{key}: runtime file {e['file']} not written")
        for wrong in ("spell.test.cast", "status.test", "gift.test"):
            if wrong in eff:
                fails.append(f"stripped ID {wrong!r} registered (the fx. prefix was lost)")
        if eff.get("fx.spell.other.cast") != keep:
            fails.append("an unrelated effect entry was changed")
        # --only skips the rest.
        strip("fx.spell.skipped.cast", 6, {"fps": 10})
        main(["--only", "fx.gift.", "--src", str(SRC)])
        if "fx.spell.skipped.cast" in json.loads(MANIFEST.read_text())["effects"]:
            fails.append("--only imported a file it should have skipped")
    finally:
        SRC, PLAN, RUNTIME, OUT, MANIFEST = saved
        shutil.rmtree(tmp, ignore_errors=True)
    for f in fails:
        print("SELF-TEST FAIL", f, file=sys.stderr)
    print("self-test " + ("passed" if not fails else f"failed ({len(fails)})"))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
