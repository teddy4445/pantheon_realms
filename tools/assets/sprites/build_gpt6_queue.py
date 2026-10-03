#!/usr/bin/env python3
"""
Write GPT6_2D_CONTENT_GENERATION.md — the GPT-6 production queue for the 2D
content still missing after reusing what the repository already has — and
assets-source/sprites/sheet-layouts.json, the layout of every sheet in it
(development tool; never packaged).

Sheet edition (owner request 2026-10-03): GPT-6 paints a few large *sheets*
(every animation of one creature form, all directions of one map hero, a
dozen map objects, three families' portraits) instead of one image per strip;
`npm run sprites:cut` (cut_sheets.py) cuts them into the single files the
importers read.

Reads what the game actually needs and has:
  assets-source/sprites/content-plan.json   creatures, their animations (from gameplay content),
                                            pantheons, map site kinds, battlefields, climates, spells
  assets-runtime/sprites/manifest.json      every sprite's status (placeholder / final) and provenance
  assets-runtime/ui/final-manifest.json     delivered portraits
  assets-runtime/art/manifest.json          delivered battlefield paintings
  assets-source/art/briefs/GPT6_BRIEF_5_CREATURES.md   canonical creature descriptions

Run after every delivery: `npm run sprites:queue` (after `npm run sprites:plan`
and `npm run sprites:import`), so the queue lists only what is still missing.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PLAN = json.loads((ROOT / "assets-source/sprites/content-plan.json").read_text())
SPRITES = json.loads((ROOT / "assets-runtime/sprites/manifest.json").read_text())
FINAL_UI = json.loads((ROOT / "assets-runtime/ui/final-manifest.json").read_text())["assets"]
ART = json.loads((ROOT / "assets-runtime/art/manifest.json").read_text())["assets"]
BRIEF5 = (ROOT / "assets-source/art/briefs/GPT6_BRIEF_5_CREATURES.md").read_text()
OUT = ROOT / "GPT6_2D_CONTENT_GENERATION.md"
LAYOUT_FILE = ROOT / "assets-source/sprites/sheet-layouts.json"

PANTHEON_NAME = {p["id"]: p["name"] for p in PLAN["pantheons"]}
BOARD = {
    "greek": "support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png",
    "norse": "support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png",
    "egyptian": "support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png",
    "japanese": "support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png",
    "celtic": "support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png",
    "mesoamerican": "support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png",
}
HERO_BOARD = {
    "greek": "support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_31 PM-1.png",
    "norse": "support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_33 PM-2.png",
    "egyptian": "support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_35 PM-3.png",
    "japanese": "support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_37 PM-4.png",
    "celtic": "support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_39 PM-5.png",
    "mesoamerican": "support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_48 PM-6.png",
}
GUI_SHEET = "assets-source/ui/sheets/map-markers-sheet.png"

# ---------------------------------------------------------------------------- canonical descriptions (Brief 5)

ENTRY = re.compile(r"^\*\*(\d{3}) · (.+?)\*\* — (.+?) · `(creature\.[a-z0-9_.]+)`\n\n?((?:\* .*\n)+)", re.M)
DESC: dict[str, dict[str, str]] = {}
for m in ENTRY.finditer(BRIEF5):
    fields: dict[str, str] = {"number": m.group(1), "name": m.group(2)}
    for line in m.group(5).splitlines():
        mm = re.match(r"\* ([A-Za-z ]+?): (.*)", line)
        if mm:
            fields[mm.group(1).strip()] = mm.group(2).strip()
        elif line.startswith("* Upgrade of"):
            fields["Upgrade"] = line[2:].strip()
    DESC[m.group(4)] = fields


def asset_of(c: dict) -> str:
    return c["portraitAssetId"].removesuffix(".portrait")


R1 = {"R1-G": "the Greek pantheon board", "R1-N": "the Norse pantheon board", "R1-E": "the Egyptian pantheon board", "R1-J": "the Japanese pantheon board", "R1-C": "the Celtic pantheon board", "R1-M": "the Mesoamerican pantheon board"}


def clean(s: str) -> str:
    s = re.sub(r"\*\*|_", "", s).strip()
    for k, v in R1.items():
        s = s.replace(k, v)
    return s



# ---------------------------------------------------------------------------- sheets: many items per image
#
# GPT-6 makes a few large images instead of a thousand small ones. Every image
# is a *sheet*: an invisible grid of equal cells, one frame or one object per
# cell. `npm run sprites:cut` (cut_sheets.py) cuts each delivered sheet into
# the single files the importers already read, using the layouts written here
# to assets-source/sprites/sheet-layouts.json.

SHEET_PIXELS = 1536 * 1024  # the image area GPT-6 has delivered so far (about 1.57 MP); larger is better
COLS = 6  # frames per creature animation row
FRAMES = {"idle": 6, "move": 6, "attack": 6, "shoot": 6, "defend": 3, "hit": 3, "death": 6, "victory": 6, "takeoff": 3, "fly": 6, "landing": 3, "ability": 6}
FPS = {"idle": 3, "move": 8, "attack": 6, "shoot": 6, "defend": 8, "hit": 10, "death": 5, "victory": 4, "takeoff": 8, "fly": 10, "landing": 8, "ability": 6, "walk": 8}
LOOP = {"idle", "move", "fly", "victory", "walk"}
AIRBORNE = {"takeoff", "fly", "landing"}
HERO_DIRS = ["e", "ne", "n", "s", "se"]  # w, nw, sw are the game's mirror images of e, ne, se
HERO_FRAMES = {"idle": 4, "walk": 6}
HERO_FPS = {"idle": 3, "walk": 8}
DIR_TEXT = {"e": "east — facing right, side-on", "ne": "north-east — facing right and away from the viewer", "n": "north — walking away from the viewer (we see the back)", "s": "south — walking toward the viewer (we see the front)", "se": "south-east — facing right and toward the viewer"}
# Body heights in hex widths (the same table as make_sprite_placeholders.py).
BODY_HEIGHT = {
    "humanoid_spear": 1.2, "humanoid_thrower": 1.15, "humanoid_caster": 1.2, "centaur": 1.4, "griffin": 1.3,
    "rider": 1.5, "bull_biped": 1.45, "giant": 1.85, "beast": 0.95, "serpent": 1.3, "winged_humanoid": 1.35,
    "spirit": 1.3, "construct": 1.65,
}

MELEE = {
    "humanoid_spear": "thrusts its spear forward from behind its shield",
    "humanoid_thrower": "jabs with a javelin or blade held close, guarding with its off arm",
    "humanoid_caster": "strikes with its staff in a short overhead blow",
    "centaur": "rears a little and drives its weapon forward",
    "griffin": "lunges, raking with its front talons and snapping its beak",
    "rider": "urges the mount a half step forward and drives the lance or blade forward",
    "bull_biped": "swings its heavy weapon in a downward arc",
    "giant": "smashes down with its weapon or fists",
    "beast": "lunges forward and bites, claws raking",
    "serpent": "rears back and strikes forward with its jaws",
    "winged_humanoid": "beats its wings once and strikes forward with its weapon",
    "spirit": "surges forward and rakes with spectral hands or claws",
    "construct": "swings a massive arm in a crushing blow",
}
SHOOT = {
    "humanoid_thrower": "throws its ranged weapon (javelin, sling stone or arrow, as in the reference)",
    "humanoid_caster": "casts a bolt of power from its staff or hands",
    "giant": "hurls a boulder overhand",
    "humanoid_spear": "makes its ranged attack with the weapon shown in the reference",
}
DEFEND = {
    "humanoid_spear": "raises its shield and braces behind it",
    "humanoid_thrower": "raises its small shield or arm and crouches",
    "humanoid_caster": "raises its staff crosswise and steadies itself",
    "griffin": "draws its wings around its body and lowers its head",
    "winged_humanoid": "folds its wings forward like a shield",
    "serpent": "coils tightly and lowers its head",
}


def frame_sequence(anim: str, c: dict) -> list[str]:
    body = c["body"]
    if anim == "idle":
        return ["neutral stance", "breathing in, chest rising", "breath held, weight shifts slightly forward", "small head turn", "breathing out, chest sinking", "settling back to neutral (loops into frame 1)"]
    if anim == "move":
        if body == "serpent":
            return ["body curved left", "curve travelling back", "body straight", "body curved right", "curve travelling back", "body straight (loops)"]
        if body in ("centaur", "griffin", "rider", "beast"):
            return ["front left foot down", "pushing off", "legs gathered", "front right foot down", "pushing off", "legs stretched (loops)"]
        if body == "spirit":
            return ["drifting forward, robes trailing", "rising slightly", "gliding", "sinking slightly", "drifting forward", "gliding (loops)"]
        return ["right foot forward, heel down", "weight on the right foot", "left leg passing", "left foot forward, heel down", "weight on the left foot", "right leg passing (loops)"]
    if anim == "attack":
        return ["ready stance", "anticipation: draws back, coiled", f"strike: {MELEE.get(body, 'makes its melee attack')}", "impact pose, fully extended", "follow-through", "recovering to the ready stance"]
    if anim == "shoot":
        return ["ready stance", "draws or winds up, aiming", f"release: {SHOOT.get(body, 'makes its ranged attack with the weapon shown in the reference')}", "follow-through (the missile has left; the game draws it in flight)", "recoil", "recovering to the ready stance"]
    if anim == "defend":
        return ["ready stance", DEFEND.get(body, "lowers its head and braces"), "braced (held)"]
    if anim == "hit":
        return ["struck: jolts back", "recoils, flinching", "steadies"]
    if anim == "death":
        return ["struck a final time", "staggers back", "legs buckle", "falls", "hits the ground", "lying still on the ground (held: the body stays on the battlefield)"]
    if anim == "victory":
        return ["begins a triumphant gesture", "raises weapon, head or wings high", "peak of the gesture", "holds", "lowers slightly", "raises again (loops into frame 2)"]
    if anim == "takeoff":
        return ["crouches, wings rising", "first downbeat, feet leave the ground", "hovering at flight height"]
    if anim == "landing":
        return ["hovering, wings spread to brake", "touchdown, legs absorbing the landing", "standing, wings folding"]
    if anim == "fly":
        return ["wings up", "downbeat", "wings down", "upstroke", "wings level", "wings rising (loops)"]
    if anim == "ability":
        names = [a for a in c["abilities"] if a["activation"] == "active"]
        what = "; ".join(f"{a['name']} ({a['summary'].rstrip('.')})" for a in names) or "its active ability"
        return ["ready stance", f"begins to use {what}", "builds up", "the ability takes effect (a short glow around the creature; no text)", "glow fading", "recovering to the ready stance"]
    return ["ready stance"]


def creature_rows(c: dict) -> list[list[str]]:
    rows = [["idle"], ["move"], ["attack"], ["defend", "hit"], ["death"], ["victory"]]
    a = set(c["animations"])
    if "shoot" in a:
        rows.append(["shoot"])
    if "takeoff" in a:
        rows += [["takeoff", "landing"], ["fly"]]
    if "ability" in a:
        rows.append(["ability"])
    return rows


def body_height(c: dict) -> float:
    h = BODY_HEIGHT.get(c["body"], 1.2) * (0.92 + 0.03 * c["tier"])
    return h * (1.05 if c["form"] == "upgraded" else 1.0)


def creature_cell(c: dict) -> tuple[float, float]:
    """Cell size in hex widths: as wide as the old frame (512 or 768 px at 240 px per hex), tall enough for the body."""
    w = 3.2 if c["footprint"] == 2 else 2.133
    flies = "takeoff" in c["animations"]
    h = max(2.133, math.ceil((body_height(c) * 1.31 + (0.35 if flies else 0)) * 10) / 10)
    return w, h


def parts_of(rows: int) -> list[tuple[int, int]]:
    """Row ranges [start, end) of a sheet delivered in two parts (the upper part gets the extra row)."""
    k = math.ceil(rows / 2)
    return [(0, k), (k, rows)]


def sheet_size(cols: int, rows: int, cell_aspect: float) -> tuple[int, int]:
    aspect = cols * cell_aspect / rows
    h = math.sqrt(SHEET_PIXELS / aspect)
    w = aspect * h
    return int(round(w / 8) * 8), int(round(h / 8) * 8)


# ---------------------------------------------------------------------------- status

def ref_delivered(c: dict) -> bool:
    if (ROOT / f"assets-source/creatures/reference/{asset_of(c)}.ref.threequarter.png").exists():
        return True
    s = SPRITES["creatures"].get(c["id"], {})
    return "cut from the delivered canonical reference view" in s.get("provenance", "")


def portrait_delivered(c: dict) -> bool:
    return c["portraitAssetId"] in FINAL_UI


def strip_status(c: dict, anim: str) -> str:
    s = SPRITES["creatures"].get(c["id"], {})
    a = s.get("animations", {}).get(anim)
    if a and (a.get("status") == "final" or s.get("status") == "final"):
        return "final"
    return "placeholder" if a else "missing"


# ---------------------------------------------------------------------------- data

creatures = PLAN["creatures"]
by_id = {c["id"]: c for c in creatures}
PANTHEON_ORDER = [p["id"] for p in PLAN["pantheons"]] + [None]


def group_of(c: dict) -> str:
    return c["pantheonId"] or "neutral"


def group_name(g: str) -> str:
    return PANTHEON_NAME.get(g, "Neutral")


def creature_head(c: dict) -> str:
    return f"{c['name']} — {group_name(group_of(c))}, tier {c['tier']}, {'upgraded' if c['form'] == 'upgraded' else 'base'} form"


def looks(c: dict) -> str:
    return clean(DESC.get(asset_of(c), {}).get("Looks", c["portraitAlt"]))


def design_note(c: dict) -> str:
    return clean(DESC.get(asset_of(c), {}).get("Design", "Design from the description, in the pantheon board's style."))


def ref_file(c: dict) -> str:
    return f"assets-source/creatures/reference/{asset_of(c)}.ref.threequarter.png"


def board_of(c: dict) -> str | None:
    return BOARD.get(c["pantheonId"]) if c["pantheonId"] else None


layouts: dict[str, dict] = {}


def add_layout(name: str, **kw) -> dict:
    kw["file"] = f"{name}.png"
    layouts[name] = kw
    return kw


# A and B: family rows (base, upgraded), three families per sheet, per pantheon.
def family_sheets(missing: list[dict], prefix: str) -> list[tuple[str, list[list[dict | None]]]]:
    out = []
    for g in [x or "neutral" for x in PANTHEON_ORDER]:
        fams: dict[str, list[dict | None]] = {}
        for c in sorted((c for c in missing if group_of(c) == g), key=lambda c: (c["tier"], c["familyId"], c["form"] != "base")):
            row = fams.setdefault(c["familyId"], [None, None])
            row[0 if c["form"] == "base" else 1] = c
        rows = list(fams.values())
        for i in range(0, len(rows), 3):
            out.append((f"sheet.{prefix}.{g}.{i // 3 + 1}", rows[i:i + 3]))
    return out


missing_refs = [c for c in creatures if not ref_delivered(c)]
missing_portraits = [c for c in creatures if not portrait_delivered(c)]
ref_sheets = family_sheets(missing_refs, "ref")
portrait_sheets = family_sheets(missing_portraits, "portrait")
for name, rows in ref_sheets:
    w, h = sheet_size(2, len(rows), 1.0)
    add_layout(name, group="A", target="items", cols=2, rows=len(rows), cellHexes=[1, 1], size=[w, h], background="transparent",
               cells=[{"row": r, "col": k, "name": f"{asset_of(c)}.ref.threequarter", "kind": "ref", "out": f"assets-source/creatures/reference/{asset_of(c)}.ref.threequarter.png"} for r, row in enumerate(rows) for k, c in enumerate(row) if c])
for name, rows in portrait_sheets:
    w, h = sheet_size(2, len(rows), 1.0)
    add_layout(name, group="B", target="portraits", cols=2, rows=len(rows), cellHexes=[1, 1], size=[w, h], background="opaque",
               cells=[{"row": r, "col": k, "name": c["portraitAssetId"], "kind": "portrait", "out": f"assets-source/icons/final/{c['portraitAssetId']}.png"} for r, row in enumerate(rows) for k, c in enumerate(row) if c])

# C: one animation sheet per creature form.
anim_forms = [c for c in creatures if any(strip_status(c, a) != "final" for a in c["animations"])]
for c in anim_forms:
    a = asset_of(c)
    cw, ch = creature_cell(c)
    rows = creature_rows(c)
    w, h = sheet_size(COLS, len(rows), cw / ch)
    segs = []
    for r, row in enumerate(rows):
        col = 0
        for anim in row:
            n = FRAMES[anim]
            segs.append({"row": r, "col": col, "frames": n, "anim": anim, "name": f"sprite.{a}.{anim}", "fps": FPS[anim], "loop": anim in LOOP, "airborne": anim in AIRBORNE})
            col += n
    add_layout(f"sheet.{a}", group="C", target="creature", creature=c["id"], cols=COLS, rows=len(rows), cellHexes=[cw, ch], groundY=0.9, size=[w, h], background="transparent", segments=segs)

# D: one sheet per mounted hero (five directions; the game mirrors the other three) + one sheet of hero-screen figures.
heroes = list(PLAN["pantheons"])
for p in heroes:
    pid = p["id"]
    hc = 10
    w, h = sheet_size(hc, len(HERO_DIRS), 1.0)
    segs = []
    for r, d in enumerate(HERO_DIRS):
        segs.append({"row": r, "col": 0, "frames": HERO_FRAMES["idle"], "anim": "idle", "name": f"sprite.hero.{pid}.idle.{d}", "fps": HERO_FPS["idle"], "loop": True, "airborne": False})
        segs.append({"row": r, "col": HERO_FRAMES["idle"], "frames": HERO_FRAMES["walk"], "anim": "walk", "name": f"sprite.hero.{pid}.walk.{d}", "fps": HERO_FPS["walk"], "loop": True, "airborne": False})
    add_layout(f"sheet.hero.{pid}", group="D", target="hero", cols=hc, rows=len(HERO_DIRS), cellHexes=[2.133, 2.133], groundY=0.88, size=[w, h], background="transparent", segments=segs)
fw_, fh_ = sheet_size(3, 2, 1.0)
add_layout("sheet.hero.figures", group="D", target="items", cols=3, rows=2, cellHexes=[1, 1], size=[fw_, fh_], background="transparent",
           cells=[{"row": i // 3, "col": i % 3, "name": f"sprite.hero.{p['id']}.figure", "kind": "figure", "out": f"assets-source/sprites/final/sprite.hero.{p['id']}.figure.png"} for i, p in enumerate(heroes)])

# E: map objects, four sheets.
SITE_TEXT = {
    "town": ("a walled town seen from the map", 1.5), "sawmill": ("a sawmill with a waterwheel or saw shed and stacked logs", 1.25), "quarry": ("a stone quarry cut into a rocky outcrop, with dressed blocks", 1.25),
    "gold_mine": ("a gold mine entrance in a rocky hill with timber supports and an ore cart", 1.25), "crystal_deposit": ("a cave mouth glittering with large blue crystals", 1.25),
    "pickup": ("a small pile of mixed resources lying on the ground", 0.8), "watchtower": ("a tall stone watchtower with a banner", 1.0), "crossing_bridge": ("an old stone bridge over a stream", 1.35),
    "crossing_pass": ("a narrow mountain pass between two rocky crags", 1.2), "nest": ("a creature lair: a rocky nest of branches and bones", 1.1), "refuge": ("a sheltered refuge: a small stone hut with a healing spring", 1.0),
    "quarry_cache": ("a cache of dressed stone blocks under a tarp", 0.9), "grove": ("a sacred grove: a great old tree in a ring of standing stones", 1.15), "beacon": ("a beacon: an iron fire-basket on a stone altar", 1.0),
    "relay": ("a small relay fire on a cairn", 0.9), "gate": ("a barred gate blocking a pass between rocks", 1.0), "camp": ("a creature camp: tents around a campfire", 1.0), "event_site": ("a wayside shrine with a weathered statue", 1.0),
    "relic": ("a relic shrine: a golden reliquary on a stepped stone platform", 1.15), "portal": ("a two-way portal: a stone arch around a glowing veil", 1.1), "learning_stone": ("a tall carved standing stone with a glowing mark (no readable writing)", 0.95),
    "spell_shrine": ("a small domed shrine with a floating glowing orb", 0.9), "skill_trainer": ("a training ground: a weapon rack, practice post and target under an awning", 1.0), "quest_hut": ("a scholar's hut with scrolls and a lantern", 0.95),
    "key_tent": ("a keymaster's striped tent (the game adds a coloured key pennant)", 1.0), "key_gate": ("a keymaster's barrier: a stone gateway with a heavy lock (the game adds the key colour)", 1.0), "windmill": ("a windmill with four sails", 1.05),
    "treasure_chest": ("an ornate treasure chest on the ground", 0.75), "prison": ("a ruined prison tower with a barred door", 1.15),
}
PICKUP_TEXT = {"gold": "a pile of gold coins and ingots", "wood": "a stack of cut logs", "stone": "a heap of dressed stone", "crystal": "a cluster of blue crystals", "favor": "a glowing golden sun-disc offering on a small altar", "artifact": "a legendary item resting on a small pedestal"}
DECOR_TEXT = {"pine": ("a single pine tree", 0.35), "tree": ("a single broad-leaved tree", 0.45), "rock": ("a small rock", 0.3), "shrub": ("a low shrub", 0.3), "grass": ("a tuft of tall grass", 0.2), "mountain": ("a rocky mountain peak with a snow cap (fills one mountain hex)", 1.0)}


def site_text(key: str) -> tuple[str, float]:
    kind, _, variant = key.removeprefix("map.site.").partition(".")
    text, span = SITE_TEXT.get(kind, ("a map location", 1.0))
    if kind == "town" and variant:
        name_ = PANTHEON_NAME[variant]
        text = f"{'an' if name_[0] in 'AEIOU' else 'a'} {name_} town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board"
    elif kind == "town":
        text = "a neutral walled town (no pantheon), plain stone and timber"
    if kind == "pickup" and variant:
        text = PICKUP_TEXT.get(variant, text)
    return text, span


site_keys = [k for k, v in SPRITES["sites"].items() if v.get("status") != "final"]
decor_keys = [k for k, v in SPRITES["decor"].items() if v.get("status") != "final"]
towns = [k for k in site_keys if k.startswith("map.site.town")]
resources = [k for k in site_keys if k.removeprefix("map.site.").split(".")[0] in ("sawmill", "quarry", "gold_mine", "crystal_deposit", "treasure_chest", "pickup")]
rest = [k for k in site_keys if k not in towns and k not in resources]
E_SHEETS = [("sheet.map.towns", towns, 4), ("sheet.map.resources", resources, 4), ("sheet.map.locations.1", rest[:12], 4), ("sheet.map.locations.2", rest[12:] + [f"map.decor.{k}" for k in decor_keys], 4)]
SITE_CELL = 512 / 280
for name, keys, cols in E_SHEETS:
    if not keys:
        continue
    nrows = math.ceil(len(keys) / cols)
    w, h = sheet_size(cols, nrows, 1.0)
    add_layout(name, group="E", target="items", cols=cols, rows=nrows, cellHexes=[SITE_CELL, SITE_CELL], size=[w, h], background="transparent",
               cells=[{"row": i // cols, "col": i % cols, "name": f"sprite.{k}", "kind": "decor" if k.startswith("map.decor.") else "site", "out": f"assets-source/sprites/final/sprite.{k}.png"} for i, k in enumerate(keys)])

# G: obstacles (one sheet) and siege pieces (one sheet: rows = piece, columns = state).
OB_TEXT = {"rock": ("a waist-high rock", 0.8), "boulder": ("a large boulder", 1.0), "log": ("a fallen log", 1.0), "tree": ("a single tree", 0.9), "stump": ("a broad tree stump", 0.7), "column": ("a broken marble column", 0.5), "stone_circle": ("three short standing stones", 1.0)}
SIEGE_TEXT = {"wall": "a section of crenellated town wall, one hex wide", "gate": "a fortified gatehouse door between two stone posts, one hex wide", "tower": "a round arrow tower with a conical roof, one hex wide", "keep": "the town keep: a tall square tower about 1.6 hexes wide"}
STATE_TEXT = {"intact": "intact", "damaged": "battered: cracked stones, a chunk knocked out of the top", "rubble": "destroyed: a low heap of rubble and broken timber"}
ob_keys = [k for k, v in SPRITES["obstacles"].items() if v.get("status") != "final"]
siege_keys = [k for k, v in SPRITES["siege"].items() if v.get("status") != "final"]
if ob_keys:
    nrows = math.ceil(len(ob_keys) / 4)
    w, h = sheet_size(4, nrows, 1.0)
    add_layout("sheet.battle.obstacles", group="G", target="items", cols=4, rows=nrows, cellHexes=[2.133, 2.133], size=[w, h], background="transparent",
               cells=[{"row": i // 4, "col": i % 4, "name": f"sprite.battle.obstacle.{k}", "kind": "obstacle", "out": f"assets-source/sprites/final/sprite.battle.obstacle.{k}.png"} for i, k in enumerate(ob_keys)])
PIECES = ["wall", "gate", "tower", "keep"]
STATES = ["intact", "damaged", "rubble"]
if siege_keys:
    w, h = sheet_size(3, 4, 1.0)
    add_layout("sheet.battle.siege", group="G", target="items", cols=3, rows=4, cellHexes=[3.2, 3.2], size=[w, h], background="transparent",
               cells=[{"row": PIECES.index(k.split(".")[0]), "col": STATES.index(k.split(".")[1]), "name": f"sprite.battle.siege.{k}", "kind": "siege", "out": f"assets-source/sprites/final/sprite.battle.siege.{k}.png"} for k in siege_keys])

# H: effects (one row each, six frames) and projectiles (last row) on one sheet.
FX_TEXT = {
    "impact": "a melee hit: a bright short burst and sparks", "spell.damage": "a striking bolt of power hitting one target (lightning-like)", "spell.area": "a blast hitting a target and the cells around it (spreads over most of the cell)",
    "spell.heal": "healing: soft green-gold motes rising", "spell.buff": "a blessing: a golden ring of light rising around the target", "spell.curse": "a curse: violet smoke coiling down around the target",
    "ward": "a creature's protective ward: a translucent shield dome", "morale.up": "high morale: a golden star rising", "morale.down": "low morale: a red downward swirl",
}
fx_keys = [k for k, v in SPRITES["effects"].items() if v.get("status") != "final"]
pj_keys = [k for k, v in SPRITES["projectiles"].items() if v.get("status") != "final"]
FX_FRAMES = 6
if fx_keys or pj_keys:
    nrows = len(fx_keys) + (1 if pj_keys else 0)
    w, h = sheet_size(FX_FRAMES, nrows, 1.0)
    add_layout("sheet.fx", group="H", target="fx", cols=FX_FRAMES, rows=nrows, cellHexes=[1.6, 1.6], groundY=0.62, size=[w, h], background="transparent",
               segments=[{"row": r, "col": 0, "frames": FX_FRAMES, "anim": k, "name": f"sprite.fx.{k}", "fps": 14, "loop": False, "airborne": True} for r, k in enumerate(fx_keys)],
               cells=[{"row": len(fx_keys), "col": i, "name": f"sprite.battle.projectile.{k}", "kind": "projectile", "out": f"assets-source/sprites/final/sprite.battle.projectile.{k}.png"} for i, k in enumerate(pj_keys)])

fields = sorted(PLAN["battlefields"])
climates = PLAN["climates"]
field_variants = [(f, cl) for f in fields for cl in climates if cl != "temperate" and f"battlefield.{f}.ground.{cl}" not in ART]

LAYOUT_FILE.write_text(json.dumps({"schema": "pantheon-realms-sheets-1", "generated": dt.date.today().isoformat(), "note": "Written by npm run sprites:queue; read by npm run sprites:cut. Rows and columns count from 0 here (from 1 in GPT6_2D_CONTENT_GENERATION.md).", "sheets": layouts}, indent=1) + "\n")

# ---------------------------------------------------------------------------- the document

lines: list[str] = []
W = lines.append


def table(rows: list[tuple[str, str]]) -> None:
    W("| Field | Value |")
    W("|---|---|")
    for k, v in rows:
        W(f"| {k} | {v} |")
    W("")


def px(n: float) -> str:
    return f"{n:,.0f}"


def size_line(lay: dict) -> str:
    w, h = lay["size"]
    return f"{w} × {h} px (about 1.6 MP) or larger with the same proportions — {lay['cols']} columns × {lay['rows']} rows, cells {px(w / lay['cols'])} × {px(h / lay['rows'])} px"


def sheets_of(group: str) -> list[tuple[str, dict]]:
    return [(k, v) for k, v in layouts.items() if v["group"] == group]


def count_items(lay: dict) -> int:
    return len(lay.get("segments", [])) + len(lay.get("cells", []))


BG = "Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else)."
GRID = "No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge."

n_sheets = {g: len(sheets_of(g)) for g in "ABCDEGH"}
n_items = {g: sum(count_items(v) for _, v in sheets_of(g)) for g in "ABCDEGH"}
n_files = {
    "A": len(missing_refs), "B": len(missing_portraits),
    "C": sum(len(c["animations"]) for c in anim_forms), "D": len(heroes) * 17,
    "E": len(site_keys) + len(decor_keys), "G": len(ob_keys) + len(siege_keys), "H": len(fx_keys) + len(pj_keys),
}
total_sheets = sum(n_sheets.values())

W("# Pantheon Realms — GPT-6 2D content generation (sheet edition)")
W("")
W(f"Generated {dt.date.today().isoformat()} by `npm run sprites:queue` from the repository's actual state (content version `{PLAN['contentVersion']}`): the content catalog, the 2D sprite manifest, delivered portraits and painted art. It lists **only what is still missing** after reusing the existing 2D content (`2D_MIGRATION_AUDIT.md`).")
W("")
W(f"**Many items per image.** Instead of one image per strip or object, GPT-6 paints **sheets**: one large image holding a whole set — every animation of one creature form, all directions of one map hero, a dozen map objects, three families' portraits. `npm run sprites:cut` cuts each sheet into the single files the game imports. **{total_sheets} sheets** replace {sum(n_files.values()):,} single images; only the {len(field_variants)} optional battlefield paintings stay one per image.")
W("")
W("## 0. Summary")
W("")
W("| Group | What | Sheets | Single files cut from them | In the game meanwhile |")
W("|---|---|---|---|---|")
W(f"| A | Creature canonical references (three-quarter masters), three families per sheet | **{n_sheets['A']}** | {n_files['A']} | silhouette placeholder |")
W(f"| B | Creature portraits, three families per sheet | **{n_sheets['B']}** | {n_files['B']} | drawn stand-in portrait |")
W(f"| C | Battle animations, **one sheet per creature form** (all its strips as rows) | **{n_sheets['C']}** | {n_files['C']} strips | reference still + simple motion (43 forms), animated silhouettes (59 forms) |")
W(f"| D | Mounted map heroes (one sheet per pantheon: 5 directions × idle + walk) and the six hero-screen figures (one sheet) | **{n_sheets['D']}** | {n_files['D']} | side-view still, mirrored westward, step bob |")
W(f"| E | Adventure-map locations and decoration (towns, resources, two location sheets) | **{n_sheets['E']}** | {n_files['E']} | concept crops; procedural decoration |")
W(f"| F | Battlefield backgrounds per climate (optional; full paintings, one per image) | — | {len(field_variants)} | temperate painting |")
W(f"| G | Battlefield obstacles (one sheet) and siege pieces (one sheet) | **{n_sheets['G']}** | {n_files['G']} | procedural placeholders |")
W(f"| H | Spell / combat effects and projectiles (one sheet) | **{n_sheets['H']}** | {n_files['H']} | procedural placeholders |")
W(f"| | **Total** | **{total_sheets}** | {sum(n_files.values())} | |")
W("")
W("## 1. How sheets work")
W("")
W("1. **One sheet per request.** Generate the image at the size given (about 1.6 megapixels — the size GPT-6 has delivered so far) **or larger with the same proportions**: a larger image gives sharper sprites. Save it under its exact sheet file name (for example `sheet.creature.greek.tier1.base.png`) in **`assets-source/sprites/sheets/`**.")
W(f"2. **Grid.** An invisible grid of equal cells. {GRID} Cells are filled left to right, rows top to bottom, exactly as listed; a cell marked *empty* stays empty.")
W("3. **Animation rows.** In a creature or hero sheet each row (or half-row) is one animation; its frames are the cells left to right. Every frame shows the same creature at the same size and in the same place in its cell — only the pose changes, so the motion reads when the cells are played one after another.")
W("4. **Then:** `npm run sprites:cut` (cuts every new or changed sheet; writes a preview of each cut to `assets-source/sprites/sheets/_preview/`), then `npm run sprites:import` and, for portraits, `npm run icons:import`. Nothing else changes; the cut files replace their placeholders.")
W("5. **Too much for one image?** A sheet may be delivered as two images split between rows, named `<sheet>.part1.png` (the upper rows) and `<sheet>.part2.png` (the rest) — each keeps the same column count and cell shape. The cutter splits the rows evenly between the parts (the upper part gets the extra row when the count is odd), so generate them that way. Worth it for the creature sheets with more than six rows (shooters, fliers, active abilities): their cells are smallest; the C entries list the part sizes.")
W("6. **What the cutter tolerates:** any image size; a background in flat magenta, grey or a fake checkerboard instead of real transparency (keyed out); figures a little off-centre or off the ground line in their cells (each animation is re-aligned on its feet). What it cannot fix: frames that touch or overlap, a different number of frames than asked, a creature that changes size or design between frames. The preview shows each cut frame with its ground line, so check it before importing.")
W("")
W("## 2. Rules for every image")
W("")
W("1. **Style:** modern high-resolution pre-rendered 2D fantasy strategy art — the painterly finish of the pantheon boards and the game's opening paintings. Not pixel art, not a photograph, not a 3D-render look, not anime, no ink outlines, no flat vector.")
W(f"2. **Background:** {BG} No ground plane, no cast shadow, no environment. (Portrait sheets and battlefield paintings are opaque; the effects sheet may use flat black instead of magenta.)")
W("3. **No text** of any kind: no letters, numbers, runes or glyphs that read as writing, no logos, signatures or watermarks — and no grid lines or labels on the sheet.")
W("4. **Camera:** one fixed elevated side / three-quarter strategy-game camera for every battle sheet (about 20° above the horizon, looking slightly down), the same for every creature and frame. Map objects and map heroes: the same camera from about 35° above the horizon.")
W("5. **Facing:** battle creatures face **right** (the game mirrors the defending side). Map heroes: the five directions listed (the game mirrors them for west, north-west and south-west).")
W("6. **Scale is set by the cell.** Each sheet states how many hex widths one cell spans and where the ground line is; draw every item to that scale. The game places sprites by these numbers, never by image size.")
W("7. **Content wins over art.** Draw only actions the creature has in the game (the rows below come from its gameplay definition); do not add weapons, wings or powers it does not have. Where a pantheon board and this text disagree on looks, follow the board (as in Brief 5); where they disagree on what the creature does, follow this document.")
W("8. **Base, then upgrade.** Make a base form's sheet first; make the upgraded form's sheet with the base sheet attached, keeping every frame's pose, timing, camera, scale and place in the cell (directive §17).")
W("")
W("## 3. Reference files")
W("")
W("| Ref | File | Use |")
W("|---|---|---|")
for p, f in BOARD.items():
    W(f"| Board {PANTHEON_NAME[p]} | `{f}` | design authority for {PANTHEON_NAME[p]} creatures |")
for p, f in HERO_BOARD.items():
    W(f"| Hero {PANTHEON_NAME[p]} | `{f}` | top / front / side of the {PANTHEON_NAME[p]} mounted hero |")
W(f"| Map objects | `{GUI_SHEET}` | approved look of map locations (towns per pantheon, mines, objects, structures, passages) |")
W("| Creature masters | `assets-source/creatures/reference/creature.<…>.ref.threequarter.png` | the canonical design of each form (43 delivered; the rest from Group A) |")
W("| Portraits | `assets-source/icons/final/creature.<…>.portrait.png` | finished look per form (43 delivered) |")
W("| Creature brief | `assets-source/art/briefs/GPT6_BRIEF_5_CREATURES.md` | full description, lore and board notes per form |")
W("| Ground / battlefields | `assets-source/art/briefs/GPT6_BRIEF_2_GROUND_AND_SKY.md` | battlefield layout (quiet centre for the hex board) |")
W("")


def form_label(c: dict | None) -> str:
    return f"{c['name']} ({c['form']})" if c else "*empty* (already delivered)"


# ---------------------------------------------------------------- A
W("## Group A — Creature canonical references (three families per sheet)")
W("")
W(f"{len(missing_refs)} forms have no canonical reference yet (the other {len(creatures) - len(missing_refs)} are delivered). Each sheet holds up to three families of one pantheon, one family per row: **left cell the base form, right cell the upgraded form**, both full-body, standing, three-quarter view facing right, neutral studio light — the masters every later sheet is drawn from. Painting both forms of a family side by side keeps them consistent. Cut into `assets-source/creatures/reference/<form>.ref.threequarter.png`.")
W("")
for name, rows in ref_sheets:
    lay = layouts[name]
    g = name.split(".")[2]
    W(f"### A · `{lay['file']}`")
    W("")
    table([
        ("Contains", "<br>".join(f"row {r + 1}: {form_label(row[0])} · {form_label(row[1])}" for r, row in enumerate(rows))),
        ("Image", size_line(lay)),
        ("Background", "transparent"),
        ("Attach", (f"`{BOARD[g]}` (pantheon board)" if g in BOARD else "Brief 5 §3 (neutral palette)") + "".join(f"; `{ref_file(by_id[row[1]['pairId']])}` (delivered base master of {row[1]['name']})" for row in rows if row[0] is None and row[1])),
        ("Cuts into", ", ".join(f"`{asset_of(c)}.ref.threequarter.png`" for row in rows for c in row if c)),
        ("Status", "missing (silhouette placeholders in the game)"),
    ])
    W("```text")
    W(f"Create one reference sheet for Pantheon Realms with the canonical designs of {len([c for row in rows for c in row if c])} creatures of the {group_name(g)} {'pantheon' if g in BOARD else 'creatures'}.")
    W(f"Image {lay['size'][0]} × {lay['size'][1]} px (or larger, same proportions): an invisible grid of 2 columns × {len(rows)} rows of equal square cells. {GRID}")
    for r, row in enumerate(rows):
        for k, c in enumerate(row):
            label = f"Row {r + 1}, {'left' if k == 0 else 'right'} cell"
            if not c:
                W(f"{label}: empty (leave it empty).")
                continue
            base = by_id.get(c["pairId"]) if c["form"] == "upgraded" else None
            W(f"{label}: {c['name']} — {c['role'].lower()}. Looks: {looks(c)} Design: {design_note(c)}" + (f" Upgraded form of {base['name']}: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change." if base else ""))
    W("Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.")
    W("Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.")
    W(f"{BG} No ground, no shadows, no text.")
    W("```")
    W("")

# ---------------------------------------------------------------- B
W("## Group B — Creature portraits (three families per sheet)")
W("")
W(f"{len(missing_portraits)} forms still show a drawn stand-in portrait (army slots, recruitment, turn order, bestiary). Same families and order as Group A: **left the base form, right the upgraded form**, each a square painting with its own background; generated with the forms' masters attached. Cut into `assets-source/icons/final/<portrait asset ID>.png` (then `npm run icons:import` makes the 256 px game images).")
W("")
for name, rows in portrait_sheets:
    lay = layouts[name]
    g = name.split(".")[2]
    masters = [c for row in rows for c in row if c]
    W(f"### B · `{lay['file']}`")
    W("")
    table([
        ("Contains", "<br>".join(f"row {r + 1}: {form_label(row[0])} · {form_label(row[1])}" for r, row in enumerate(rows))),
        ("Image", size_line(lay)),
        ("Background", "opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells"),
        ("Attach", "; ".join(f"`{ref_file(c)}`" for c in masters) + (f"; `{BOARD[g]}`" if g in BOARD else "")),
        ("Cuts into", ", ".join(f"`{c['portraitAssetId']}.png`" for c in masters)),
        ("Status", "missing (stand-in portraits in the game)"),
    ])
    W("```text")
    W(f"Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms ({group_name(g)}).")
    W(f"Image {lay['size'][0]} × {lay['size'][1]} px (or larger, same proportions): 2 columns × {len(rows)} rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.")
    for r, row in enumerate(rows):
        for k, c in enumerate(row):
            label = f"Row {r + 1}, {'left' if k == 0 else 'right'}"
            W(f"{label}: " + (f"{c['name']} — {looks(c)}" if c else "empty (flat black)."))
    W("Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.")
    W("```")
    W("")

# ---------------------------------------------------------------- C
W("## Group C — Battle animation sheets (one per creature form)")
W("")
W(f"One sheet holds **every animation the form has** — one row per animation, {COLS} cells per row (two short animations share a row: `defend` cells 1–3 and `hit` cells 4–6; `takeoff` cells 1–3 and `landing` cells 4–6). The rows come from the form's gameplay content: the base rows for everyone; `shoot` for shooters; `takeoff`/`landing` and `fly` for Flight; `ability` for an active ability; no creature casts spells in battle. Cells are as wide as {2.133:.2f} hex widths (one-hex creatures) or 3.2 hex widths (two-hex creatures); the ground line is at **90 % of each cell's height**; the creature faces right and stands centred in its cell. Cut into `sprite.<form>.<animation>.png` strips (`assets-source/sprites/final/`).")
W("")
W(f"Frame rates the game plays (from `sheet-layouts.json`): " + ", ".join(f"{a} {FRAMES[a]} frames at {FPS[a]} fps" for a in FRAMES) + ". Airborne frames (`takeoff` end, `fly`, `landing` start) hover with the feet about 15 % of the cell height above the ground line; the game adds the flight arc.")
W("")
for c in anim_forms:
    lay = layouts[f"sheet.{asset_of(c)}"]
    a = asset_of(c)
    cw, ch = lay["cellHexes"]
    hgt = body_height(c)
    base = by_id.get(c["pairId"]) if c["form"] == "upgraded" else None
    rows = creature_rows(c)
    W(f"### C · {creature_head(c)}")
    W("")
    table([
        ("Sheet file", f"`{lay['file']}`"),
        ("Creature", f"`{c['id']}` · {c['role']} · occupies {c['footprint']} hex{'es' if c['footprint'] == 2 else ''}" + (f" · shoots (range {c['range']})" if c["shots"] else "") + "".join(f" · {ab['name']} ({ab['activation']})" for ab in c["abilities"])),
        ("Rows", "<br>".join(f"{r + 1}. " + " + ".join(f"{x} ({FRAMES[x]})" for x in row) for r, row in enumerate(rows))),
        ("Image", size_line(lay) + (("<br>or two parts for sharper frames: " + "; ".join(f"`{lay['file'][:-4]}.part{i + 1}.png` rows {r0 + 1}–{r1}, {sheet_size(COLS, r1 - r0, cw / ch)[0]} × {sheet_size(COLS, r1 - r0, cw / ch)[1]} px" for i, (r0, r1) in enumerate(parts_of(len(rows))))) if len(rows) > 6 else "")),
        ("Scale", f"a cell is {cw:.2f} hex widths wide and {ch:.2f} tall; ground line at 90 % of the cell height; the creature stands about {round(hgt / ch * 100)} % of the cell height"),
        ("Attach", (f"`sheet.{asset_of(base)}.png` (the base form's sheet — same layout and poses); " if base else "") + f"`{ref_file(c)}` (canonical master{'' if ref_delivered(c) else ' — Group A first'})" + (f"; `assets-source/icons/final/{c['portraitAssetId']}.png`" if portrait_delivered(c) else "") + (f"; `{board_of(c)}`" if board_of(c) else "")),
        ("Cuts into", f"{sum(len(r) for r in rows)} strips: " + ", ".join(f"`sprite.{a}.{x}.png`" for row in rows for x in row)),
        ("Status", ", ".join(f"{x} {strip_status(c, x)}" for row in rows for x in row)),
    ])
    W("```text")
    if base:
        W(f"Using the attached animation sheet of {base['name']} and the canonical reference of {c['name']}, create the same animation sheet for {c['name']}, its upgraded form, for Pantheon Realms.")
        W("Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.")
    else:
        W(f"Using the attached canonical reference of {c['name']}, create one animation sheet for Pantheon Realms.")
    W(f"The creature: {c['name']} — {looks(c)}")
    W(f"Image {lay['size'][0]} × {lay['size'][1]} px (or larger, same proportions): an invisible grid of {COLS} columns × {len(rows)} rows of equal cells, each cell {cw:.2f} hex widths wide. {GRID}")
    W("Each row is one animation; its frames run left to right:")
    for r, row in enumerate(rows):
        parts = []
        col = 1
        for x in row:
            seq = frame_sequence(x, c)[:FRAMES[x]]
            span = f"cells {col}–{col + FRAMES[x] - 1}" if len(row) > 1 else f"{FRAMES[x]} frames"
            parts.append(f"{x} ({span}{', loops' if x in LOOP else ', last frame held' if x == 'death' else ''}): " + " · ".join(f"{i}) {s}" for i, s in enumerate(seq, 1)))
            col += FRAMES[x]
        W(f"Row {r + 1} — " + " | ".join(parts))
    W(f"In every frame: the exact same {c['name']}, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell" + (" (airborne frames hover about 15% of the cell height above that line)" if "takeoff" in c["animations"] else "") + f"; it stands about {round(hgt / ch * 100)}% of the cell height tall.")
    W("Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.")
    W("Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.")
    W(f"{BG} No ground, no shadows, no environment, no text.")
    W("```")
    W("")

# ---------------------------------------------------------------- D
W("## Group D — Mounted map heroes")
W("")
W(f"One sheet per pantheon: **5 rows = directions** (east, north-east, north, south, south-east; the game mirrors east, north-east and south-east for west, north-west and south-west), each row **idle in cells 1–{HERO_FRAMES['idle']}** and **walk in cells {HERO_FRAMES['idle'] + 1}–{HERO_FRAMES['idle'] + HERO_FRAMES['walk']}**. Cells are 2.13 map-hex widths square; the ground point between the horse's feet sits at **88 % of the cell height**, centred. Cut into `sprite.hero.<pantheon>.<idle|walk>.<direction>.png`. A seventh sheet holds the six hero-screen figures.")
W("")
for p in heroes:
    pid = p["id"]
    lay = layouts[f"sheet.hero.{pid}"]
    W(f"### D · {p['name']} mounted hero")
    W("")
    table([
        ("Sheet file", f"`{lay['file']}`"),
        ("Rows", "<br>".join(f"{r + 1}. {DIR_TEXT[d]}: idle ({HERO_FRAMES['idle']}) + walk ({HERO_FRAMES['walk']})" for r, d in enumerate(HERO_DIRS))),
        ("Image", size_line(lay)),
        ("Scale", "a cell is 2.13 map-hex widths square; ground point between the horse's feet at 88 % of the cell height; rider and horse about 60 % of the cell height"),
        ("Attach", f"`{HERO_BOARD[pid]}` (top / front / side views — the design authority); `assets-source/icons/final/emblem.{pid}.png`"),
        ("Cuts into", f"{len(HERO_DIRS) * 2} strips: `sprite.hero.{pid}.idle.<e|ne|n|s|se>.png`, `sprite.hero.{pid}.walk.<e|ne|n|s|se>.png`"),
        ("Status", "placeholder (side-view still from the board, mirrored westward, step bob)"),
    ])
    W("```text")
    W(f"Using the attached {p['name']} mounted-hero sheet (top, front and side views), create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.")
    W(f"Image {lay['size'][0]} × {lay['size'][1]} px (or larger, same proportions): an invisible grid of 10 columns × {len(HERO_DIRS)} rows of equal square cells. {GRID}")
    W("Each row is one direction of travel: " + "; ".join(f"row {r + 1}: {DIR_TEXT[d]}" for r, d in enumerate(HERO_DIRS)) + ".")
    W(f"In every row, cells 1–{HERO_FRAMES['idle']}: idle (standing still, the horse breathing, mane, cloak and banner stirring; loops); cells {HERO_FRAMES['idle'] + 1}–{HERO_FRAMES['idle'] + HERO_FRAMES['walk']}: walk (one full walking gait cycle of the horse, the rider swaying with it; loops).")
    W("The ground point between the horse's feet stands at 88% of the cell height, centred; the same scale in every cell; rider and horse about 60% of the cell height.")
    W("Elevated strategy-map camera about 35° above the horizon. Exact same rider, horse, armour, weapon and colours as the attached sheet in every cell; the rider's weapon held upright.")
    W(f"Modern high-resolution painterly fantasy strategy-game sprite. {BG} No ground, no shadow, no text.")
    W("```")
    W("")
lay = layouts["sheet.hero.figures"]
W("### D · hero-screen figures (all six pantheons)")
W("")
table([
    ("Sheet file", f"`{lay['file']}`"),
    ("Cells", "<br>".join(f"row {i // 3 + 1}, cell {i % 3 + 1}: {p['name']}" for i, p in enumerate(heroes))),
    ("Image", size_line(lay)),
    ("Attach", "the six hero boards above"),
    ("Cuts into", ", ".join(f"`sprite.hero.{p['id']}.figure.png`" for p in heroes)),
    ("Status", "placeholder (the boards' side views)"),
])
W("```text")
W(f"Using the six attached mounted-hero sheets, paint one sheet of six large standing figures for the Pantheon Realms hero screen: 3 columns × 2 rows of equal square cells, image {lay['size'][0]} × {lay['size'][1]} px (or larger). Order: " + ", ".join(p["name"] for p in heroes) + ".")
W(f"Each cell: that pantheon's mounted hero, rider and horse standing, side view facing right, whole figure inside the cell with margin, dramatic painterly light on the figure only. {GRID}")
W(f"{BG} No ground, no shadow, no text.")
W("```")
W("")

# ---------------------------------------------------------------- E
W("## Group E — Adventure-map locations and decoration")
W("")
W(f"Four sheets of square cells; each cell **{SITE_CELL:.2f} map-hex widths** wide, one object per cell, standing on the cell's ground line at 88 % of the cell height, centred, at its true map size (stated per cell). Elevated map camera (~35°), the painterly style of the map-marker sheet; no banner in the owner's colour (the game draws it). Cut into `sprite.map.site.<kind>[.<variant>].png` and `sprite.map.decor.<kind>.png`.")
W("")
for name, keys, cols in E_SHEETS:
    if name not in layouts:
        continue
    lay = layouts[name]
    W(f"### E · `{lay['file']}`")
    W("")
    cells_txt = []
    for i, k in enumerate(keys):
        if k.startswith("map.decor."):
            text, span = DECOR_TEXT[k.removeprefix("map.decor.")]
        else:
            text, span = site_text(k)
        cells_txt.append((i, k, text, span))
    table([
        ("Image", size_line(lay)),
        ("Cells", "<br>".join(f"row {i // cols + 1}, cell {i % cols + 1}: `{k}` — {t} (about {s} hex wide)" for i, k, t, s in cells_txt)),
        ("Attach", f"`{GUI_SHEET}` (approved look of map objects)" + ("; the six pantheon boards" if name == "sheet.map.towns" else "") + ("; `assets-runtime/art/terrain/terrain.temperate.plains.webp` (the ground decoration stands on)" if any(k.startswith('map.decor.') for k in keys) else "")),
        ("Status", "placeholder (concept-sheet crops; procedural decoration)"),
    ])
    W("```text")
    W(f"Create one sheet of adventure-map objects for Pantheon Realms: {lay['cols']} columns × {lay['rows']} rows of equal square cells, image {lay['size'][0]} × {lay['size'][1]} px (or larger, same proportions). {GRID}")
    for i, k, t, s in cells_txt:
        W(f"Row {i // cols + 1}, cell {i % cols + 1}: {t}, about {round(s / SITE_CELL * 100)}% of the cell width.")
    for i in range(len(keys), lay["cols"] * lay["rows"]):
        W(f"Row {i // cols + 1}, cell {i % cols + 1}: empty (leave it empty).")
    W("Every object stands on the cell's ground line at 88% of the cell height, centred, with a small ground skirt; elevated strategy-map camera about 35° above the horizon; all at the same map scale.")
    W(f"Match the painterly style of the attached map-marker sheet. Modern high-resolution fantasy strategy-game art. {BG} No text, no owner banner, no cast shadow beyond the ground skirt.")
    W("```")
    W("")

# ---------------------------------------------------------------- F
W("## Group F — Battlefield backgrounds (optional, one painting per image)")
W("")
W(f"The six temperate paintings are final and used in every climate. Climate variants are optional: the game picks `battlefield.<archetype>.ground.<climate>` when it exists (ASSET_PIPELINE.md §13). These are full paintings and cannot share an image. Format and composition exactly as Brief 2 §6: seen from above and foreshortened by the game, the quiet centre left calm for the hex board. Files → `assets-source/art/final/` (then `npm run art:import`).")
W("")
W("| Asset ID | File | Archetype | Climate | Attach |")
W("|---|---|---|---|---|")
for f, cl in field_variants:
    W(f"| `battlefield.{f}.ground.{cl}` | `battlefield.{f}.ground.{cl}.png` | {f.replace('_', ' ')} | {cl.replace('_', ' ')} | `assets-source/art/final/battlefield.{f}.ground.png`; `assets-source/art/final/terrain.{cl}.plains.png` |")
W("")
W("```text")
W("Using the attached temperate battlefield painting as the layout and the attached terrain texture as the climate, repaint the battlefield [ARCHETYPE] for the [CLIMATE] climate for Pantheon Realms, at the same size and proportions as the attached painting, seen from above. Keep the composition: the calm central area stays open, even ground for the hex board; features stay toward the edges. Painterly high-resolution fantasy strategy-game art, soft daylight. No creatures, no people, no text, no hex grid.")
W("```")
W("")

# ---------------------------------------------------------------- G
W("## Group G — Battlefield obstacles and siege pieces")
W("")
W("Transparent obstacles stand on the cells the rules block (the art never decides which cells are blocked). Battle camera (elevated side / three-quarter, ~20°), the same light as the creature sheets.")
W("")
if "sheet.battle.obstacles" in layouts:
    lay = layouts["sheet.battle.obstacles"]
    W(f"### G · `{lay['file']}`")
    W("")
    table([
        ("Image", size_line(lay)),
        ("Cells", "<br>".join(f"row {i // 4 + 1}, cell {i % 4 + 1}: `battle.obstacle.{k}` — {OB_TEXT.get(k, (k, 1))[0]} (about {OB_TEXT.get(k, (k, 1))[1]} hex wide)" for i, k in enumerate(ob_keys))),
        ("Scale", "a cell is 2.13 battle-hex widths square; ground line at 88 % of the cell height"),
        ("Attach", "`assets-runtime/art/battle/battlefield.open_field.ground.webp`; one finished creature sheet (for scale)"),
        ("Status", "placeholder (procedural)"),
    ])
    W("```text")
    W(f"Create one sheet of battlefield obstacles for Pantheon Realms: 4 columns × {lay['rows']} rows of equal square cells, image {lay['size'][0]} × {lay['size'][1]} px (or larger). {GRID}")
    for i, k in enumerate(ob_keys):
        t, s = OB_TEXT.get(k, (k, 1.0))
        W(f"Row {i // 4 + 1}, cell {i % 4 + 1}: {t}, about {round(s / 2.133 * 100)}% of the cell width.")
    for i in range(len(ob_keys), 4 * lay["rows"]):
        W(f"Row {i // 4 + 1}, cell {i % 4 + 1}: empty (leave it empty).")
    W(f"Each stands on the cell's ground line at 88% of the cell height, centred. The fixed elevated side / three-quarter battle camera (about 20° above the horizon). Neutral colours that sit on every battlefield. Painterly high-resolution fantasy strategy-game style. {BG} No shadow, no text.")
    W("```")
    W("")
if "sheet.battle.siege" in layouts:
    lay = layouts["sheet.battle.siege"]
    W(f"### G · `{lay['file']}`")
    W("")
    table([
        ("Image", size_line(lay)),
        ("Cells", "rows: " + ", ".join(f"{i + 1} {p}" for i, p in enumerate(PIECES)) + "; columns: " + ", ".join(f"{i + 1} {s}" for i, s in enumerate(STATES))),
        ("Scale", "a cell is 3.2 battle-hex widths square; ground line at 88 % of the cell height; wall, gate and tower one hex wide, the keep about 1.6"),
        ("Attach", "`assets-runtime/art/battle/battlefield.beacon_clearing.ground.webp`"),
        ("Status", "placeholder (procedural)"),
    ])
    W("```text")
    W(f"Create one sheet of town-siege pieces for Pantheon Realms: 3 columns × 4 rows of equal square cells, image {lay['size'][0]} × {lay['size'][1]} px (or larger). {GRID}")
    for i, pc in enumerate(PIECES):
        W(f"Row {i + 1}: {SIEGE_TEXT[pc]} — left {STATE_TEXT['intact']}; middle {STATE_TEXT['damaged']}; right {STATE_TEXT['rubble']}.")
    W(f"The same stone and timber in all three states and all four pieces. Each stands on the cell's ground line at 88% of the cell height, centred, at the scale stated. The fixed elevated side / three-quarter battle camera. Painterly high-resolution fantasy style. {BG} No text.")
    W("```")
    W("")

# ---------------------------------------------------------------- H
W("## Group H — Spell and combat effects, projectiles")
W("")
if "sheet.fx" in layouts:
    lay = layouts["sheet.fx"]
    used = {"spell.damage": [s["name"] for s in PLAN["battleSpells"] if s["effect"] == "direct_damage"], "spell.area": [s["name"] for s in PLAN["battleSpells"] if s["effect"] in ("area_damage", "mass_damage")], "spell.heal": [s["name"] for s in PLAN["battleSpells"] if s["effect"] in ("heal_front", "mass_heal")]}
    W(f"Only effects the game plays (the rules decide every result; effects are drawn after it). One sheet: one row per effect, {FX_FRAMES} frames left to right (build-up, peak, fade to nothing), centred in the cells with the target's ground point at 62 % of the cell height; a cell is 1.6 battle-hex widths. The last row holds the projectiles. Cut into `sprite.fx.<effect>.png` and `sprite.battle.projectile.<kind>.png`.")
    W("")
    W(f"### H · `{lay['file']}`")
    W("")
    table([
        ("Image", size_line(lay)),
        ("Rows", "<br>".join(f"{r + 1}. `fx.{k}` — {FX_TEXT[k]}" + (f" (used by {', '.join(used[k][:6])}{'…' if len(used[k]) > 6 else ''})" if used.get(k) else "") for r, k in enumerate(fx_keys)) + (f"<br>{len(fx_keys) + 1}. projectiles: " + ", ".join(f"cell {i + 1} `battle.projectile.{k}`" for i, k in enumerate(pj_keys)) if pj_keys else "")),
        ("Attach", "one finished creature sheet (for scale)"),
        ("Status", "placeholder (procedural)"),
    ])
    W("```text")
    W(f"Create one sheet of battle effects for Pantheon Realms: {FX_FRAMES} columns × {lay['rows']} rows of equal square cells, image {lay['size'][0]} × {lay['size'][1]} px (or larger, same proportions). {GRID}")
    for r, k in enumerate(fx_keys):
        W(f"Row {r + 1}: {FX_TEXT[k]} — {FX_FRAMES} frames: 1 build-up, 2 growing, 3 peak, 4 peak fading, 5 fading, 6 almost gone.")
    if pj_keys:
        W(f"Row {len(fx_keys) + 1}: cell 1: an arrow in flight, side view pointing right (about 50% of the cell width); cell 2: a thrown stone (about 15% of the cell width); the other cells empty.")
    W("Effects centred in their cells, the target's ground point at 62% of the cell height. Painterly high-resolution fantasy style, soft glow. Transparent background, or if transparency is impossible a perfectly flat pure black #000000 (the game adds these effects' light over the battlefield). No text.")
    W("```")
    W("")

W("## Checklist")
W("")
W(f"A {n_sheets['A']} · B {n_sheets['B']} · C {n_sheets['C']} · D {n_sheets['D']} · E {n_sheets['E']} · G {n_sheets['G']} · H {n_sheets['H']} — **{total_sheets} sheets**, cut into {sum(n_files.values())} files; F {len(field_variants)} optional paintings.")
W("")
W("Single files in the names of `ASSET_PIPELINE.md` §4 are still accepted by `npm run sprites:import` (for a strip or object redone on its own).")
W("")
OUT.write_text("\n".join(lines) + "\n")
print(f"wrote {OUT.relative_to(ROOT)} and {LAYOUT_FILE.relative_to(ROOT)}: {total_sheets} sheets (A {n_sheets['A']}, B {n_sheets['B']}, C {n_sheets['C']}, D {n_sheets['D']}, E {n_sheets['E']}, G {n_sheets['G']}, H {n_sheets['H']}) for {sum(n_files.values())} files; F {len(field_variants)} optional; {len(lines)} lines; Brief 5 descriptions found for {sum(1 for c in creatures if asset_of(c) in DESC)}/{len(creatures)} forms")
