#!/usr/bin/env python3
"""
Prepare TEMPORARY placeholder art from the owner's concept boards.

Inputs : "support images/" (owner-supplied concept references, AI-generated boards)
Outputs: assets-runtime/placeholders/... (committed runtime placeholders)
         assets-runtime/placeholders/manifest.json (provenance for every file)

Every output is a development placeholder, NOT production art. Final assets
replace these files by asset ID without any screen changes.

Requires Pillow. Run from the repository root:
    python3 tools/assets/prepare_placeholders.py
"""
from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "support images"
OUT = ROOT / "assets-runtime" / "placeholders"

BUILDINGS_BOARD = "ChatGPT Image Sep 29, 2026, 04_17_21 PM-1.png"
GREEK_TOWN = "ChatGPT Image Sep 29, 2026, 04_11_16 PM-1.png"

# (asset id, crop box in the 1448x1086 Greek buildings board, note)
BUILDING_CROPS = [
    ("town.greek.support.civic_hall", (18, 38, 278, 234), "Civic Hall"),
    ("town.greek.support.tavern", (282, 58, 502, 234), "Tavern / Heroes' Lodge"),
    ("town.greek.support.marketplace", (498, 52, 732, 234), "Marketplace"),
    ("town.greek.support.resource_depot", (738, 62, 962, 234), "Resource Depot"),
    ("town.greek.support.workshop", (963, 58, 1202, 234), "Blacksmith / Workshop", 14, 60),
    ("town.greek.support.mage_guild", (1203, 42, 1432, 234), "Mage Guild / Sanctum"),
    ("town.greek.support.pantheon_temple", (18, 258, 332, 488), "Pantheon Temple"),
    ("town.greek.support.fortifications", (348, 276, 622, 478), "Fortifications / Gatehouse"),
    ("town.greek.support.training_academy", (638, 272, 902, 474), "Training Academy"),
    ("town.greek.support.watchtower", (918, 270, 1102, 482), "Watchtower / Observatory"),
    ("town.greek.support.artifact_merchant", (1118, 286, 1428, 484), "Artifact Merchant"),
    ("town.greek.dwelling.tier1.base", (12, 592, 182, 758), "Barracks (base)"),
    ("town.greek.dwelling.tier1.upgraded", (186, 588, 364, 758), "Barracks (upgraded)"),
    ("town.greek.dwelling.tier2.base", (378, 596, 532, 758), "Archery Range (base) — stand-in for Peltast Range"),
    ("town.greek.dwelling.tier2.upgraded", (530, 590, 718, 758), "Archery Range (upgraded) — stand-in for Veteran Range"),
    ("town.greek.dwelling.tier3.base", (962, 822, 1162, 1030), "Griffin Aerie (base)"),
    ("town.greek.dwelling.tier3.upgraded", (1158, 808, 1438, 1030), "Griffin Aerie (upgraded)"),
    ("town.greek.dwelling.tier4.base", (638, 272, 902, 474), "Training Academy art — stand-in for the Cavalry Training Court"),
    ("town.greek.dwelling.tier4.upgraded", (898, 592, 1080, 758), "Centaur Grove (upgraded) art — stand-in for Companion Court"),
    ("town.greek.dwelling.tier5.base", (1118, 286, 1428, 484), "Artifact Merchant art — stand-in for House of Adepts"),
    ("town.greek.dwelling.tier5.upgraded", (918, 270, 1102, 482), "Observatory art — stand-in for House of Seers"),
    ("town.greek.dwelling.tier6.base", (1092, 600, 1248, 758), "Labyrinth (base)"),
    ("town.greek.dwelling.tier6.upgraded", (1242, 586, 1442, 758), "Labyrinth (upgraded)"),
    ("town.greek.dwelling.tier7.base", (502, 822, 706, 1030), "Cyclops Quarry (base)"),
    ("town.greek.dwelling.tier7.upgraded", (702, 808, 948, 1030), "Cyclops Quarry (upgraded)"),
]


def keep_main_components(mask: Image.Image, min_fraction: float = 0.06) -> Image.Image:
    """Drop small disconnected fragments (e.g. stray label letters)."""
    w, h = mask.size
    mp = mask.load()
    label = [0] * (w * h)
    sizes: list[int] = [0]
    for y in range(h):
        for x in range(w):
            if mp[x, y] < 128 or label[y * w + x]:
                continue
            idx = len(sizes)
            sizes.append(0)
            stack = [(x, y)]
            label[y * w + x] = idx
            while stack:
                cx, cy = stack.pop()
                sizes[idx] += 1
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not label[ny * w + nx] and mp[nx, ny] >= 128:
                        label[ny * w + nx] = idx
                        stack.append((nx, ny))
    if len(sizes) <= 1:
        return mask
    biggest = max(sizes)
    keep = {i for i, n in enumerate(sizes) if i and n >= biggest * min_fraction}
    out = Image.new("L", (w, h), 0)
    op = out.load()
    for y in range(h):
        for x in range(w):
            if label[y * w + x] in keep:
                op[x, y] = mp[x, y]
    return out


def remove_background(img: Image.Image, tolerance: int = 34, max_luma: int = 95) -> Image.Image:
    """Flood-fill the dark charcoal board background from the crop border."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    border = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)] + [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    border.sort(key=lambda c: sum(c))
    bg = border[len(border) // 2]

    def is_bg(c) -> bool:
        return abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) <= tolerance * 3 and sum(c) < 3 * max_luma

    mask = Image.new("L", (w, h), 255)
    mp = mask.load()
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not is_bg(px[x, y]):
            continue
        mp[x, y] = 0
        if x > 0:
            q.append((x - 1, y))
        if x < w - 1:
            q.append((x + 1, y))
        if y > 0:
            q.append((x, y - 1))
        if y < h - 1:
            q.append((x, y + 1))
    mask = keep_main_components(mask.filter(ImageFilter.MinFilter(3)))
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    out = rgb.convert("RGBA")
    out.putalpha(mask)
    bbox = mask.point(lambda v: 255 if v > 24 else 0).getbbox()
    return out.crop(bbox) if bbox else out


NORSE_BUILDINGS_BOARD = "ChatGPT Image Sep 29, 2026, 04_17_23 PM-2.png"
NORSE_TOWN = "ChatGPT Image Sep 29, 2026, 04_11_20 PM-2.png"

# Norse buildings board (1448x1086). Dwelling art follows the pantheon board's
# roster by theme; the buildings board orders its dwellings differently, so
# three tiers use the closest-themed stand-in (noted per entry).
NORSE_CROPS = [
    ("town.norse.support.civic_hall", (14, 36, 288, 232), "Civic Hall"),
    ("town.norse.support.tavern", (290, 56, 520, 236), "Tavern / Heroes' Lodge"),
    ("town.norse.support.marketplace", (520, 62, 760, 236), "Marketplace"),
    ("town.norse.support.resource_depot", (758, 70, 978, 236), "Resource Depot"),
    ("town.norse.support.workshop", (980, 56, 1210, 236), "Blacksmith / Workshop"),
    ("town.norse.support.mage_guild", (1216, 26, 1446, 240), "Mage Guild / Sanctum"),
    ("town.norse.support.pantheon_temple", (14, 258, 318, 496), "Pantheon Temple"),
    ("town.norse.support.fortifications", (320, 280, 634, 482), "Fortifications / Gatehouse"),
    ("town.norse.support.training_academy", (642, 300, 918, 482), "Training Academy"),
    ("town.norse.support.watchtower", (926, 266, 1156, 498), "Watchtower / Observatory"),
    ("town.norse.support.artifact_merchant", (1154, 276, 1436, 490), "Artifact Merchant"),
    ("town.norse.dwelling.tier1.base", (508, 822, 722, 1036), "Draugr Tomb (base) — the board's level-6 dwelling, used for tier-1 Draugr"),
    ("town.norse.dwelling.tier1.upgraded", (712, 816, 940, 1036), "Draugr Tomb (upgraded)"),
    ("town.norse.dwelling.tier2.base", (14, 604, 182, 768), "Wolf Den (base) — the board's level-1 dwelling, used for tier-2 Frost Wolves"),
    ("town.norse.dwelling.tier2.upgraded", (178, 600, 362, 768), "Wolf Den (upgraded)"),
    ("town.norse.dwelling.tier3.base", (734, 604, 900, 768), "Jotun Outpost (base) — stand-in for the Frost Troll dwelling"),
    ("town.norse.dwelling.tier3.upgraded", (892, 600, 1074, 768), "Jotun Outpost (upgraded) — stand-in"),
    ("town.norse.dwelling.tier4.base", (1086, 604, 1252, 768), "Valkyrie Aerie (base)"),
    ("town.norse.dwelling.tier4.upgraded", (1244, 596, 1436, 768), "Valkyrie Aerie (upgraded)"),
    ("town.norse.dwelling.tier5.base", (374, 604, 542, 768), "Raven Roost (base) — stand-in for the Lindworm dwelling"),
    ("town.norse.dwelling.tier5.upgraded", (536, 596, 713, 768), "Raven Roost (upgraded) — stand-in"),
    ("town.norse.dwelling.tier6.base", (20, 828, 250, 1036), "Frost Giant Camp (base) — used for tier-6 Jotunn"),
    ("town.norse.dwelling.tier6.upgraded", (240, 816, 498, 1036), "Frost Giant Camp (upgraded)"),
    ("town.norse.dwelling.tier7.base", (958, 830, 1180, 1036), "World Serpent Lair (base)"),
    ("town.norse.dwelling.tier7.upgraded", (1168, 816, 1442, 1036), "World Serpent Lair (upgraded)"),
]


# ---------------------------------------------------------------------------
# Egyptian, Japanese, Celtic and Mesoamerican boards share one layout (1448x1086):
# eleven support buildings in two rows, then seven dwelling panels (base +
# upgraded) whose "LEVEL n" order differs from the pantheon roster. Each entry
# maps roster tier -> board panel level; "stand-in" marks a themed substitute.
# ---------------------------------------------------------------------------
SUPPORT_BOXES = {
    "civic_hall": ((18, 36, 292, 236), "Civic Hall"),
    "tavern": ((290, 56, 520, 238), "Tavern / Heroes' Lodge"),
    "marketplace": ((522, 60, 760, 238), "Marketplace"),
    "resource_depot": ((756, 64, 978, 238), "Resource Depot"),
    "workshop": ((976, 52, 1210, 238), "Blacksmith / Workshop"),
    "mage_guild": ((1214, 20, 1432, 240), "Mage Guild / Sanctum"),
    "pantheon_temple": ((16, 258, 350, 498), "Pantheon Temple"),
    "fortifications": ((340, 268, 626, 488), "Fortifications / Gatehouse"),
    "training_academy": ((620, 270, 930, 490), "Training Academy"),
    "watchtower": ((916, 256, 1156, 500), "Watchtower / Observatory"),
    "artifact_merchant": ((1148, 264, 1434, 494), "Artifact Merchant"),
}
# Dwelling panel columns (x ranges of base/upgraded halves) for levels 1-7,
# inset from the gold panel frames so the keying can reach the background.
PANEL_X = {
    1: ((16, 184), (184, 358)),
    2: ((384, 544), (544, 718)),
    3: ((736, 900), (900, 1074)),
    4: ((1092, 1252), (1254, 1432)),
    5: ((20, 240), (250, 484)),
    6: ((506, 712), (714, 942)),
    7: ((970, 1170), (1172, 1434)),
}

KIT_BOARDS = {
    "egyptian": {
        "board": "ChatGPT Image Sep 29, 2026, 04_17_25 PM-3.png",
        "town": "ChatGPT Image Sep 29, 2026, 04_11_23 PM-3.png",
        "rows": ((600, 768), (832, 1030)),
        "levels": {1: "Desert Guardians", 2: "Scorpion Lair", 3: "Crocodile Pens", 4: "Falcon Aerie", 5: "Anubis Coven", 6: "Solar Guard", 7: "Sphinx Bastion"},
        # roster tier -> (board level, stand-in?)
        "tiers": {1: (2, True), 2: (5, False), 3: (1, False), 4: (7, False), 5: (3, False), 6: (4, True), 7: (6, False)},
    },
    "japanese": {
        "board": "ChatGPT Image Sep 29, 2026, 04_17_27 PM-4.png",
        "town": "ChatGPT Image Sep 29, 2026, 04_11_28 PM-4.png",
        "rows": ((600, 766), (832, 1030)),
        "levels": {1: "Ronin Barracks", 2: "Archery Range", 3: "Kitsune Grove", 4: "Tengu Nest", 5: "Dragon Sanctuary", 6: "Oni Quarry", 7: "Phoenix Aerie"},
        "tiers": {1: (3, False), 2: (2, True), 3: (4, False), 4: (6, False), 5: (1, True), 6: (7, True), 7: (5, False)},
    },
    "celtic": {
        "board": "ChatGPT Image Sep 29, 2026, 04_17_35 PM-5.png",
        "town": "ChatGPT Image Sep 29, 2026, 04_11_29 PM-5.png",
        "rows": ((600, 768), (832, 1030)),
        # The Blacksmith label sits inside the watchtower box on this board.
        "support": {"watchtower": (916, 292, 1156, 500)},
        "levels": {1: "Wolf Pack", 2: "Stag Herd", 3: "Boar Clan", 4: "Bear Circle", 5: "Eagle Aerie", 6: "Staghorn Riders", 7: "Ancient Entwives"},
        "tiers": {1: (3, True), 2: (1, False), 3: (6, True), 4: (4, True), 5: (5, True), 6: (2, False), 7: (7, True)},
    },
    "mesoamerican": {
        "board": "ChatGPT Image Sep 29, 2026, 04_17_37 PM-6.png",
        "town": "ChatGPT Image Sep 29, 2026, 04_11_31 PM-6.png",
        "rows": ((612, 772), (842, 1030)),
        # This board's first dwelling panel ends earlier.
        "panels": {1: ((16, 184), (184, 352))},
        "levels": {1: "Jaguar Prowl", 2: "Eagle Aerie", 3: "Serpent Sanctum", 4: "Warrior Altar", 5: "Stag Grove", 6: "Croc Quarry", 7: "Feathered Serpent Nest"},
        "tiers": {1: (7, False), 2: (1, False), 3: (2, False), 4: (6, False), 5: (5, True), 6: (3, False), 7: (4, True)},
    },
}


def kit_crops(pantheon: str) -> list:
    spec = KIT_BOARDS[pantheon]
    overrides = spec.get("support", {})
    out = [(f"town.{pantheon}.support.{slot}", overrides.get(slot, box), note) for slot, (box, note) in SUPPORT_BOXES.items()]
    for tier, (level, stand_in) in sorted(spec["tiers"].items()):
        (top1, bot1), (top2, bot2) = spec["rows"]
        top, bot = (top1, bot1) if level <= 4 else (top2, bot2)
        name = spec["levels"][level]
        for (x0, x1), form in zip(spec.get("panels", {}).get(level, PANEL_X[level]), ("base", "upgraded")):
            note = f"{name} ({form}) — the board's level-{level} dwelling, used for tier {tier}" + (" (themed stand-in)" if stand_in else "")
            out.append((f"town.{pantheon}.dwelling.tier{tier}.{form}", (x0, top, x1, bot), note))
    return out


def crop_board(board_name: str, pantheon: str, crops: list, manifest: dict, tolerance: int = 34, max_luma: int = 95) -> bool:
    board = Image.open(SRC / board_name)
    if board.size != (1448, 1086):
        print(f"Unexpected board size {board.size} for {board_name}", file=sys.stderr)
        return False
    prefix = f"town.{pantheon}."
    for entry in crops:
        asset_id, box, note = entry[0], entry[1], entry[2]
        tol = entry[3] if len(entry) > 3 else tolerance
        luma = entry[4] if len(entry) > 4 else max_luma
        sprite = remove_background(board.crop(box), tol, luma)
        sprite.thumbnail((420, 420), Image.LANCZOS)
        rel = Path("town") / pantheon / f"{asset_id.split(prefix)[1]}.png"
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        sprite.save(dest, optimize=True)
        manifest[asset_id] = {
            "file": f"placeholders/{rel.as_posix()}",
            "kind": "image",
            "status": "placeholder",
            "provenance": f"Cropped from owner concept board '{board_name}' ({note}). Development placeholder only.",
            "size": list(sprite.size),
        }
    return True


def town_background(name: str, pantheon: str, manifest: dict) -> Image.Image:
    town = Image.open(SRC / name).convert("RGB")
    dest = OUT / "town" / pantheon / "background.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)
    town.save(dest, quality=86, optimize=True, progressive=True)
    manifest[f"town.{pantheon}.background"] = {
        "file": f"placeholders/town/{pantheon}/background.jpg",
        "kind": "image",
        "status": "placeholder",
        "provenance": f"Owner concept reference '{name}'. Development placeholder only.",
        "size": list(town.size),
    }
    return town


def main() -> int:
    if not SRC.exists():
        print(f"Missing concept folder: {SRC}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict] = {}

    board = Image.open(SRC / BUILDINGS_BOARD)
    if board.size != (1448, 1086):
        print(f"Unexpected board size {board.size}", file=sys.stderr)
        return 1
    for entry in BUILDING_CROPS:
        asset_id, box, note = entry[0], entry[1], entry[2]
        tol = entry[3] if len(entry) > 3 else 34
        luma = entry[4] if len(entry) > 4 else 95
        sprite = remove_background(board.crop(box), tol, luma)
        sprite.thumbnail((420, 420), Image.LANCZOS)
        rel = Path("town") / "greek" / f"{asset_id.split('town.greek.')[1]}.png"
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        sprite.save(dest, optimize=True)
        manifest[asset_id] = {
            "file": f"placeholders/{rel.as_posix()}",
            "kind": "image",
            "status": "placeholder",
            "provenance": f"Cropped from owner concept board '{BUILDINGS_BOARD}' ({note}). Development placeholder only.",
            "size": list(sprite.size),
        }

    town = Image.open(SRC / GREEK_TOWN).convert("RGB")
    dest = OUT / "town" / "greek" / "background.jpg"
    town.save(dest, quality=86, optimize=True, progressive=True)
    manifest["town.greek.background"] = {
        "file": "placeholders/town/greek/background.jpg",
        "kind": "image",
        "status": "placeholder",
        "provenance": f"Owner concept reference '{GREEK_TOWN}'. Development placeholder only.",
        "size": list(town.size),
    }
    # Main-menu backdrop: acropolis side of the same concept, darkened at the menu edge by CSS.
    menu = town.crop((360, 0, 1448, 612)).resize((1920, 1080), Image.LANCZOS)
    dest = OUT / "menu" / "background.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)
    menu.save(dest, quality=84, optimize=True, progressive=True)
    manifest["menu.background"] = {
        "file": "placeholders/menu/background.jpg",
        "kind": "image",
        "status": "placeholder",
        "provenance": f"Crop of owner concept reference '{GREEK_TOWN}'. Development placeholder only.",
        "size": [1920, 1080],
    }

    # The Norse board is darker and its timber is near-black: key out only the true background.
    if not crop_board(NORSE_BUILDINGS_BOARD, "norse", NORSE_CROPS, manifest, tolerance=10, max_luma=40):
        return 1
    town_background(NORSE_TOWN, "norse", manifest)

    # Kit pantheons: same dark-board keying as Norse (dark roofs and stone must survive).
    for pantheon, spec in KIT_BOARDS.items():
        if not crop_board(spec["board"], pantheon, kit_crops(pantheon), manifest, tolerance=10, max_luma=40):
            return 1
        town_background(spec["town"], pantheon, manifest)

    (OUT / "manifest.json").write_text(json.dumps({"notice": "Temporary development placeholders derived from owner concept boards. Not production art.", "assets": manifest}, indent=2) + "\n")
    print(f"Wrote {len(manifest)} placeholder assets to {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
