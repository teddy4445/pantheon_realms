#!/usr/bin/env python3
"""
Prepare the runtime UI art from the owner-supplied sources in assets-source/ui/.

Inputs  (owner-supplied, AI-generated visual references delivered 2026-10-01):
  assets-source/ui/backgrounds/opening-*.png   opening-screen backgrounds
  assets-source/ui/branding/full-logo.png      title logo (gold on navy)
  assets-source/ui/branding/logo.png           emblem (app icon, favicon, small branding)
  assets-source/ui/frames/intro-frame.png      main-menu frame (transparent centre)
  assets-source/ui/menu-icons/menu-*.png       the nine main-menu icons
  assets-source/ui/sheets/resource-status-icon-pack.png  icon pack (resources, stats,
                                               battle actions, status, map markers)

Outputs:
  assets-runtime/ui/...                        optimised runtime files
  assets-runtime/icons/menu-*.png              main-menu icons, 192 px
  assets-runtime/favicon.png                   64 px emblem
  apps/desktop/build-resources/icon.ico/.png   desktop app icon
  assets-runtime/ui/manifest.json              asset IDs, files and provenance

Adding a background: drop opening-<name>.png into assets-source/ui/backgrounds/ and
run this script again; the main menu picks one of the listed backgrounds at random.

Requires Pillow, numpy, scipy. Run from the repository root:
    python3 tools/assets/prepare_ui_art.py [--sheet]   (--sheet also writes a contact sheet)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets-source" / "ui"
RUNTIME = ROOT / "assets-runtime"
OUT = RUNTIME / "ui"
DESKTOP = ROOT / "apps" / "desktop" / "build-resources"

PROVENANCE = "Owner-supplied UI art (AI-generated visual reference, delivered 2026-10-01); replaceable by asset ID."

MENU_ICONS = {
    # asset id suffix -> source file (mapped by meaning from the owner's init_icon set)
    "continue": "menu-continue.png",  # double chevron
    "new-game": "menu-new-game.png",  # four-point star
    "load-game": "menu-load-game.png",  # tray with arrow
    "campaign": "menu-campaign.png",  # map with route
    "skirmish": "menu-skirmish.png",  # crossed swords
    "encyclopedia": "menu-encyclopedia.png",  # open book
    "settings": "menu-settings.png",  # gear
    "credits": "menu-credits.png",  # laurel with "i"
    "quit": "menu-quit.png",  # door with arrow
}

# Icon pack crops: (icon id, centre x, centre y, half size) in the 1536x1024 sheet.
# The background around each icon is removed by flood fill from the crop border, so
# framed icons keep their inner plate and unframed icons become free-standing.
PACK_ICONS = [
    # A. Resources (framed)
    ("res.gold", 70, 113, 46), ("res.wood", 170, 113, 46), ("res.stone", 273, 113, 46),
    ("res.crystal", 380, 113, 46), ("res.favor", 491, 117, 49),
    # B. Hero / world status
    ("stat.movement", 613, 116, 38), ("stat.mana", 705, 116, 38), ("stat.xp", 796, 118, 36),
    ("stat.level", 875, 118, 34), ("time.day", 964, 118, 36), ("time.week", 1040, 118, 36),
    ("stat.vision", 1125, 118, 34), ("world.town", 1210, 116, 36), ("world.hero", 1298, 116, 38),
    ("world.army", 1385, 118, 38),
    # C. Combat stats
    ("stat.attack", 55, 263, 30), ("stat.defense", 130, 263, 30), ("stat.power", 203, 263, 30),
    ("stat.knowledge", 281, 263, 30), ("stat.hp", 355, 263, 30), ("stat.damage", 426, 263, 30),
    ("stat.speed", 499, 263, 30), ("stat.shots", 570, 263, 30), ("stat.morale", 638, 263, 30),
    ("stat.luck", 707, 263, 30), ("stat.retaliation", 776, 263, 30), ("stat.flying", 858, 263, 30),
    ("stat.range", 936, 263, 30),
    # D. Secondary
    ("stat.initiative", 1034, 263, 30), ("stat.magic-resist", 1107, 263, 30),
    ("stat.physical-resist", 1180, 263, 30), ("stat.evasion", 1256, 263, 30),
    ("stat.accuracy", 1332, 263, 30), ("stat.stealth", 1407, 263, 30), ("stat.crit", 1482, 263, 30),
    # E. Hero attributes (large, framed)
    ("attr.attack", 66, 416, 34), ("attr.defense", 144, 416, 34), ("attr.power", 218, 416, 34),
    ("attr.knowledge", 293, 416, 34),
    # F. Status conditions (framed)
    ("status.buff", 379, 410, 28), ("status.debuff", 429, 410, 28), ("status.poison", 477, 410, 28),
    ("status.burning", 526, 410, 28), ("status.frozen", 575, 410, 28), ("status.stun", 623, 410, 28),
    ("status.heal", 672, 410, 28), ("status.weaken", 721, 410, 28),
    # G. Time & turn
    ("time.sun", 892, 413, 30), ("time.night", 948, 413, 30), ("time.turn", 1005, 413, 30),
    ("time.end-turn", 1061, 413, 30), ("time.extra-turn", 1123, 413, 30),
    # 3. Adventure-map markers (pins)
    ("marker.hero", 48, 600, 36), ("marker.enemy-hero", 110, 600, 36), ("marker.town", 171, 600, 36),
    ("marker.hostile-town", 232, 600, 36), ("marker.neutral-town", 292, 600, 36),
    ("marker.gold", 351, 600, 34), ("marker.wood", 404, 600, 34), ("marker.stone", 458, 600, 34),
    ("marker.crystal", 513, 600, 34), ("marker.shrine", 578, 600, 40), ("marker.quarry", 650, 600, 34),
    ("marker.sawmill", 710, 600, 34), ("marker.mine", 769, 600, 34), ("marker.artifact", 825, 600, 34), ("marker.chest", 884, 600, 34),
    ("marker.quest", 940, 600, 34), ("marker.story", 999, 600, 34), ("marker.encounter", 1059, 600, 34),
    ("marker.creature", 1123, 600, 34), ("marker.watchtower", 1186, 600, 36), ("marker.portal", 1246, 600, 34),
    ("marker.locked", 1305, 600, 34), ("marker.check", 1365, 600, 34), ("marker.question", 1416, 600, 34),
    ("marker.unknown", 1480, 600, 34),
    # 4D. Battle action buttons (framed)
    ("action.attack", 64, 945, 36), ("action.defend", 147, 945, 36), ("action.wait", 229, 945, 36),
    ("action.spell", 309, 945, 36), ("action.ability", 389, 945, 36), ("action.retreat", 469, 945, 36),
    ("action.surrender", 551, 945, 36),
    # 4E. Combat effect icons (framed) — used for spell schools and effects
    ("fx.strike", 656, 945, 34), ("fx.shield", 728, 945, 34), ("fx.arrow", 801, 945, 34),
    ("fx.healing", 872, 945, 34), ("fx.poison", 947, 945, 34), ("fx.burning", 1017, 945, 34),
    ("fx.frost", 1085, 945, 34), ("fx.lightning", 1152, 945, 34), ("fx.divine", 1224, 945, 34),
    ("fx.shadow", 1302, 945, 34), ("fx.summon", 1388, 945, 34), ("fx.death", 1473, 945, 34),
]

ICON_SIZE = 96


def keyed(img: Image.Image, bg: tuple[int, int, int] | None = None, lo: float = 14.0, hi: float = 60.0) -> Image.Image:
    """Remove a flat dark background (navy) by distance keying and un-blending."""
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    if bg is None:
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
        bg = tuple(np.median(border, axis=0))
    bgv = np.array(bg, dtype=np.float32)
    d = np.sqrt(((rgb - bgv) ** 2).sum(axis=2))
    a = np.clip((d - lo) / (hi - lo), 0.0, 1.0)
    safe = np.maximum(a, 1e-3)[..., None]
    col = (rgb - (1.0 - a[..., None]) * bgv) / safe
    col = np.clip(col, 0, 255)
    out = np.dstack([col, a * 255.0]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def crop_alpha(img: Image.Image, pad: int = 8, threshold: int = 6) -> Image.Image:
    a = np.asarray(img)[:, :, 3]
    ys, xs = np.where(a > threshold)
    if len(xs) == 0:
        return img
    x0, x1 = max(0, xs.min() - pad), min(img.width, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(img.height, ys.max() + 1 + pad)
    return img.crop((x0, y0, x1, y1))


def flood_cut(tile: Image.Image) -> Image.Image:
    """Make the background connected to the tile border transparent (soft edge)."""
    rgba = np.asarray(tile.convert("RGBA")).astype(np.float32)
    rgb = rgba[:, :, :3]
    alpha_in = rgba[:, :, 3]
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    d = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    lum = rgb.mean(axis=2)
    near = (d < 26) & (lum < 70)
    lab, _ = ndimage.label(near)
    edge_labels = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outside = np.isin(lab, list(edge_labels))
    # Remove thin label text and panel lines left outside the icon: keep the largest blob.
    inside = ~outside & (alpha_in > 8)
    lab2, n = ndimage.label(inside)
    if n > 1:
        sizes = ndimage.sum(inside, lab2, range(1, n + 1))
        keep = 1 + int(np.argmax(sizes))
        # Keep blobs that are big relative to the main one (e.g. two-part glyphs).
        keep_set = {i + 1 for i, s in enumerate(sizes) if s >= 0.12 * sizes[keep - 1]}
        inside = np.isin(lab2, list(keep_set))
    soft = ndimage.gaussian_filter(inside.astype(np.float32), 0.7)
    a = np.clip(soft * 1.4, 0, 1) * (alpha_in / 255.0)
    # Un-blend the dark background out of the soft edge.
    safe = np.maximum(a, 1e-3)[..., None]
    col = np.where(a[..., None] < 0.999, (rgb - (1 - a[..., None]) * bg) / safe, rgb)
    col = np.clip(col, 0, 255)
    return Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8), "RGBA")


def square(img: Image.Image, size: int, margin: float = 0.04) -> Image.Image:
    w, h = img.size
    side = int(max(w, h) * (1 + margin * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - w) // 2, (side - h) // 2), img)
    return canvas.resize((size, size), Image.LANCZOS)


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


def save_webp(img: Image.Image, path: Path, quality: int = 82) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=6)


def main() -> int:
    if not SRC.exists():
        print(f"missing {SRC}", file=sys.stderr)
        return 1
    assets: dict[str, dict] = {}

    def reg(asset_id: str, path: Path, note: str, **extra) -> None:
        rel = path.relative_to(RUNTIME).as_posix()
        assets[asset_id] = {"file": rel, "status": "placeholder", "provenance": f"{PROVENANCE} {note}".strip(), **extra}

    # Backgrounds -------------------------------------------------------------------
    backgrounds = sorted((SRC / "backgrounds").glob("opening-*.png"))
    bg_ids = []
    for src in backgrounds:
        name = src.stem.replace("opening-", "")
        img = Image.open(src).convert("RGB")
        if img.width > 1920:
            img = img.resize((1920, round(img.height * 1920 / img.width)), Image.LANCZOS)
        out = OUT / "backgrounds" / f"{src.stem}.webp"
        save_webp(img, out, 80)
        aid = f"menu.background.{name}"
        reg(aid, out, f"Opening-screen background ({name.replace('-', ' ')}).", width=img.width, height=img.height)
        bg_ids.append(aid)

    # Branding ----------------------------------------------------------------------
    logo = crop_alpha(keyed(Image.open(SRC / "branding" / "full-logo.png")), pad=10)
    save_webp(logo, OUT / "branding" / "full-logo.webp", 90)
    reg("brand.logo.full", OUT / "branding" / "full-logo.webp", "Title logo; navy background keyed out.", width=logo.width, height=logo.height)

    emblem_src = Image.open(SRC / "branding" / "logo.png").convert("RGB")
    emblem = crop_alpha(keyed(emblem_src), pad=6)
    emblem_sq = square(emblem, 256, 0.02)
    save_png(emblem_sq, OUT / "branding" / "emblem-256.png")
    reg("brand.emblem", OUT / "branding" / "emblem-256.png", "Emblem; navy background keyed out.")
    save_png(square(emblem, 64, 0.0), RUNTIME / "favicon.png")

    # Desktop icon: the emblem on its own navy field (reads at 16 px), rounded square.
    def app_icon(size: int) -> Image.Image:
        side = emblem_src.width
        # Trim the generous margin around the emblem so it fills the icon.
        a = np.asarray(keyed(emblem_src))[:, :, 3]
        ys, xs = np.where(a > 20)
        cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
        half = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 * 1.12
        box = (int(cx - half), int(cy - half), int(cx + half), int(cy + half))
        field = emblem_src.crop(box).resize((size, size), Image.LANCZOS).convert("RGBA")
        mask = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=size * 4 // 6, fill=255)
        field.putalpha(mask.resize((size, size), Image.LANCZOS))
        return field

    icon_png = app_icon(512)
    save_png(icon_png, DESKTOP / "icon.png")
    app_icon(256).save(DESKTOP / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    save_png(app_icon(256), OUT / "branding" / "app-icon-256.png")
    reg("brand.app-icon", OUT / "branding" / "app-icon-256.png", "Desktop app icon (emblem on navy).")

    # Frame -------------------------------------------------------------------------
    frame = Image.open(SRC / "frames" / "intro-frame.png").convert("RGBA")
    save_webp(frame, OUT / "frames" / "intro-frame.webp", 88)
    # Interior (transparent window) as fractions of the frame, measured on the centre lines.
    a = np.asarray(frame)[:, :, 3]
    h, w = a.shape
    row = a[h // 2] < 128
    col = a[:, w // 2] < 128
    xs = np.where(row)[0]
    ys = np.where(col)[0]
    inner_x = [int(x) for x in xs if w * 0.15 < x < w * 0.85]
    inner_y = [int(y) for y in ys if h * 0.15 < y < h * 0.9]
    interior = {
        "left": round(min(inner_x) / w, 4),
        "right": round(1 - (max(inner_x) + 1) / w, 4),
        "top": round(min(inner_y) / h, 4),
        "bottom": round(1 - (max(inner_y) + 1) / h, 4),
    }
    reg("menu.frame", OUT / "frames" / "intro-frame.webp", "Main-menu frame.", width=w, height=h, interior=interior)

    # Menu icons --------------------------------------------------------------------
    for key, file in MENU_ICONS.items():
        img = crop_alpha(Image.open(SRC / "menu-icons" / file).convert("RGBA"), pad=4)
        out = RUNTIME / "icons" / file
        save_png(square(img, 192, 0.03), out)
        reg(f"icon.menu.{key}", out, f"Main-menu icon ({key.replace('-', ' ')}).")

    # Icon pack ---------------------------------------------------------------------
    pack = Image.open(SRC / "sheets" / "resource-status-icon-pack.png").convert("RGBA")
    contact = []
    for aid, cx, cy, half in PACK_ICONS:
        tile = pack.crop((cx - half, cy - half, cx + half, cy + half))
        cut = crop_alpha(flood_cut(tile), pad=1, threshold=10)
        icon = square(cut, ICON_SIZE, 0.03)
        out = OUT / "icons" / f"{aid}.png"
        save_png(icon, out)
        reg(f"icon.{aid}", out, f"Icon cropped from the owner's resource & status icon pack ({aid}).")
        contact.append((aid, icon))

    manifest = {
        "schema": "pantheon-realms-ui-art",
        "note": "Generated by tools/assets/prepare_ui_art.py from assets-source/ui/. Edit the sources, not these files.",
        "backgrounds": bg_ids,
        "assets": dict(sorted(assets.items())),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    if "--sheet" in sys.argv:
        cols = 12
        cell = ICON_SIZE + 24
        rows = (len(contact) + cols - 1) // cols
        sheet = Image.new("RGBA", (cols * cell, rows * cell), (60, 70, 90, 255))
        dr = ImageDraw.Draw(sheet)
        for i, (aid, icon) in enumerate(contact):
            x, y = (i % cols) * cell, (i // cols) * cell
            sheet.alpha_composite(icon, (x + 12, y + 2))
            dr.text((x + 2, y + ICON_SIZE + 6), aid[-18:], fill=(255, 255, 255, 255))
        sheet.convert("RGB").save(ROOT / "ui-icons-contact.png")
    total = sum((RUNTIME / v["file"]).stat().st_size for v in assets.values())
    print(f"{len(assets)} UI assets, {len(bg_ids)} backgrounds, {total / 1e6:.1f} MB runtime")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
