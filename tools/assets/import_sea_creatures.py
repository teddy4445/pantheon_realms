#!/usr/bin/env python3
"""
Import the sea-creature delivery of 2026-10-17 (development tool; never packaged).

The delivery (COMPLETE SEA-CREATURE ANIMATION & BATTLE handoff) supplies 37 native PNGs: 22
transparent creature atlases (1254 x 1254) for ten forms of five neutral families, four
projectile/impact atlases (1774 x 887), ten opaque portraits (1254 x 1254) and the single-ship
battlefield (1672 x 941). Its JSON carries the frame regions (sprite-manifest-merge.json), the
cosmetic event timing and FX orientation (animation-events.json), the board (design/
battlefield-layout.json) and the roster (design/sea-creature-roster.json). The generation prompts
(generation-prompts.json, reference/) are provenance only, never an asset list.

  1. With --kit DIR: check every PNG listed in asset-manifest.json (SHA-256, PNG size and colour
     mode, nothing missing, nothing extra), then copy byte for byte
       - the CONTENTS of assets/ (animations/ kept) -> assets-runtime/sea-creatures-v1/;
       - the whole delivery (every file, prompts and reference included) ->
         assets-source/art/sea-creatures-v1/.
     A destination that already holds the delivered bytes is left alone (idempotent); one that
     holds other bytes is replaced only after the delivery itself checked out.
  2. Verify (always; without --kit this is all it does besides step 3): every runtime and source
     PNG is the delivered bytes, the runtime folder holds nothing else, regions lie inside their
     atlases, every form has its required states with the delivered cadence and loop policy.
  3. Registries (relative paths `sea-creatures-v1/...` only):
       - deep-merge `creatures`, `effects`, `projectiles` and `projectileProfiles` of
         sprite-manifest-merge.json into assets-runtime/sprites/manifest.json under the canonical
         content IDs (ID_MAP), adding the cosmetic event metadata (`events`: contact/release
         frames, release socket, hover heights, death over water) and the FX orientation and
         sounds of each profile. Every unrelated entry is kept byte for byte; the file is replaced
         atomically (it may be hard-linked into other checkouts);
       - write assets-runtime/sea-creatures-v1/manifest.json: the ten portraits and the battlefield
         under `seacreatures.*` asset IDs (merged by packages/ui/src/assets/manifest.ts).

Usage: python3 -I tools/assets/import_sea_creatures.py [--kit DIR] [--dry-run] [--self-test]
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import shutil
import struct
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NAME = 'sea-creatures-v1'
SRC = ROOT / 'assets-source' / 'art' / NAME
RUN = ROOT / 'assets-runtime' / NAME
SPRITES = ROOT / 'assets-runtime' / 'sprites' / 'manifest.json'
AUDIO = ROOT / 'assets-runtime' / 'audio' / 'manifest.json'

EXPECTED_PNGS = 37
# The delivery's proposed IDs -> the canonical content IDs (packages/content/src/common/seaCreatures.ts).
# The catalog had no sea family before this delivery, so the proposals were adopted unchanged; the
# table stays the one place a later rename would be written.
ID_MAP = {
    'hippocampus': 'hippocampus', 'tempest_hippocampus': 'tempest_hippocampus',
    'cetus': 'cetus', 'crownfin_cetus': 'crownfin_cetus',
    'hafgufa': 'hafgufa', 'abyssal_hafgufa': 'abyssal_hafgufa',
    'isonade': 'isonade', 'razorwake_isonade': 'razorwake_isonade',
    'triton': 'triton', 'stormcaller_triton': 'stormcaller_triton',
}
FAMILY_OF = {k: k.split('_')[-1] for k in ID_MAP}
# The delivered cadence and playback policy (handoff §6): checked, never rewritten.
CADENCE = {'idle': 3, 'move': 6, 'shoot': 6, 'attack': 7, 'hit': 7, 'defend': 5, 'landing': 5, 'death': 4, 'victory': 4, 'takeoff': 6, 'fly': 7}
LOOPS = {'idle', 'move', 'fly'}
BASE_STATES = {'idle', 'move', 'attack', 'defend', 'hit', 'death', 'victory'}
FLYERS = {'hippocampus', 'tempest_hippocampus'}
# Missile sounds by family (existing sound IDs only; resolved against the audio manifest):
# a soft water push, a low pressure thump, a subdued whistle and tick, a short conch tone.
SOUNDS = {
    'cetus': {'release': {'id': 'magic.water', 'maxMs': 600}, 'impact': {'id': 'magic.water', 'maxMs': 450}},
    'hafgufa': {'release': {'id': 'magic.water', 'maxMs': 700}, 'impact': {'id': 'combat.hit_heavy'}},
    'isonade': {'release': {'id': 'combat.swing', 'maxMs': 600}, 'impact': {'id': 'combat.arrow_hit'}},
    'triton': {'release': {'id': 'magic.horn', 'maxMs': 700}, 'impact': {'id': 'magic.holy', 'maxMs': 600}},
}
PORTRAIT_FILES = {cid: f'{FAMILY_OF[cid]}-{"base" if cid == FAMILY_OF[cid] else "upgraded"}.png' for cid in ID_MAP}
BATTLEFIELD = 'single-ship-battlefield.png'
SECTIONS = ('creatures', 'effects', 'projectiles', 'projectileProfiles')
ABSOLUTE = re.compile(r'(^[a-zA-Z]:[\\/])|(^/)|(\\)|(\.\.)')
COLOR_MODES = {2: 'RGB', 6: 'RGBA'}


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def png_info(p: Path) -> tuple[int, int, str]:
    """Width, height and colour mode from the IHDR chunk (no decoding)."""
    data = p.read_bytes()[:33]
    if data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise SystemExit(f'{p}: not a PNG')
    w, h = struct.unpack('>II', data[16:24])
    return w, h, COLOR_MODES.get(data[25], f'colour type {data[25]}')


def check_png(p: Path, a: dict) -> None:
    if not p.is_file():
        raise SystemExit(f'{p}: missing')
    if sha(p) != a['sha256']:
        raise SystemExit(f'{p}: not the delivered bytes (SHA-256 differs from asset-manifest.json)')
    w, h, mode = png_info(p)
    if (w, h, mode) != (a['width'], a['height'], a['mode']):
        raise SystemExit(f'{p}: {w}x{h} {mode}, the manifest says {a["width"]}x{a["height"]} {a["mode"]}')


def rel_of(a: dict) -> str:
    """Path inside assets/ (and inside the runtime folder): `animations/<file>` or `<file>`."""
    f = a['file']
    if not f.startswith('assets/') or ABSOLUTE.search(f):
        raise SystemExit(f'asset-manifest.json: unexpected file {f}')
    rel = f[len('assets/'):]
    if a.get('runtimePath') != f'{NAME}/{rel}':
        raise SystemExit(f'{f}: runtimePath {a.get("runtimePath")} is not {NAME}/{rel}')
    return rel


def copy_if_changed(src: Path, dst: Path) -> bool:
    if dst.is_file() and dst.read_bytes() == src.read_bytes():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_name(dst.name + '.importing')
    shutil.copyfile(src, tmp)
    os.replace(tmp, dst)
    return True


def write_atomic(path: Path, text: str) -> None:
    """Replace the file through a new inode: a hard link in another checkout keeps its old bytes."""
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name + '.', suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    os.chmod(tmp, 0o644)
    os.replace(tmp, path)


def check_regions(label: str, regions: list[dict], size: tuple[int, int]) -> None:
    for r in regions:
        x, y, w, h = r['rect']
        if x < 0 or y < 0 or w <= 0 or h <= 0 or x + w > size[0] or y + h > size[1]:
            raise SystemExit(f'{label}: region {r["rect"]} outside {size[0]}x{size[1]}')
        ax, ay = r['anchor']
        if not (0 <= ax <= w and 0 <= ay <= h):
            raise SystemExit(f'{label}: anchor {r["anchor"]} outside its rectangle {r["rect"]}')
        if not (0 < r['sourceScale'] <= 2):
            raise SystemExit(f'{label}: sourceScale {r["sourceScale"]}')


def runtime_ref(file: str) -> str:
    if not file.startswith(f'{NAME}/') or ABSOLUTE.search(file):
        raise SystemExit(f'merge entry points outside {NAME}: {file}')
    return file


def build_entries(merge: dict, events: dict, sizes: dict[str, tuple[int, int]], known_sounds: set[str]) -> dict[str, dict]:
    """The four registry sections under canonical IDs, validated, with events, orientation and sounds."""
    out: dict[str, dict] = {s: {} for s in SECTIONS}
    if sorted(merge['creatures']) != sorted(ID_MAP):
        raise SystemExit(f'sprite-manifest-merge.json: expected the ten forms {sorted(ID_MAP)}, found {sorted(merge["creatures"])}')
    for kid, entry in merge['creatures'].items():
        cid = ID_MAP[kid]
        e = copy.deepcopy(entry)
        anims = e['animations']
        need = BASE_STATES | ({'takeoff', 'fly', 'landing'} if kid in FLYERS else {'shoot'})
        if set(anims) != need:
            raise SystemExit(f'{kid}: states {sorted(anims)}, expected {sorted(need)}')
        for state, a in anims.items():
            a['file'] = runtime_ref(a['file'])
            rel = a['file'][len(NAME) + 1:]
            regions = a.get('regions') or []
            if len(regions) != a['frames'] or not regions:
                raise SystemExit(f'{kid} {state}: {a["frames"]} frames but {len(regions)} regions')
            check_regions(f'{kid} {state}', regions, sizes[rel])
            if a['fps'] != CADENCE[state] or a['loop'] != (state in LOOPS):
                raise SystemExit(f'{kid} {state}: {a["fps"]} fps loop={a["loop"]}, the delivered policy is {CADENCE[state]} fps loop={state in LOOPS}')
        # The two delivery decisions kept as delivered (handoff §6): a three-pose upgraded Isonade shot and the
        # Tempest landing made of the takeoff poses in reverse (aliasOf is descriptive, never resolved).
        if kid == 'razorwake_isonade' and anims['shoot']['frames'] != 3:
            raise SystemExit('razorwake_isonade: the delivered shot has three usable poses')
        if kid == 'tempest_hippocampus':
            take = [r['rect'] for r in anims['takeoff']['regions']]
            land = [r['rect'] for r in anims['landing']['regions']]
            if land != list(reversed(take)):
                raise SystemExit('tempest_hippocampus: the landing must be the takeoff poses in reverse')
        ev = events['units'].get(kid)
        if not ev:
            raise SystemExit(f'animation-events.json: no events for {kid}')
        hover = ev.get('hover', {})
        shoot = ev.get('shoot')
        e['events'] = {
            'attackContactFrame': ev['attack']['contactFrame'],
            **({'shoot': {'releaseFrame': shoot['releaseFrame'], 'sourcePoint': shoot['sourcePoint'], 'socket': shoot['socketNormalizedInReleaseRect']}} if shoot else {}),
            'hover': {'idleHex': hover.get('idleHeightHex', 0), 'travelHex': hover.get('travelHeightHex', 0)},
            'death': {'holdLastFrame': ev['death']['holdLastFrame'], 'onWater': 'sink-fade', 'sinkHex': 0.12, 'fadeMs': 450, 'onDeck': 'hold'},
        }
        if shoot and not (0 <= shoot['releaseFrame'] < anims['shoot']['frames']):
            raise SystemExit(f'{kid}: release frame {shoot["releaseFrame"]} outside the shot')
        e['provenance'] = (e.get('provenance', '') + ' Sea-creature delivery 2026-10-17, merged by tools/assets/import_sea_creatures.py (status final = final delivered raster art; integration checks are separate).').strip()
        out['creatures'][cid] = e
    for eid, entry in merge['effects'].items():
        e = copy.deepcopy(entry)
        e['file'] = runtime_ref(e['file'])
        check_regions(eid, e['regions'], sizes[e['file'][len(NAME) + 1:]])
        if e.get('additive'):
            raise SystemExit(f'{eid}: the delivery keeps the normal alpha blend')
        out['effects'][eid] = e
    for pid, entry in merge['projectiles'].items():
        e = copy.deepcopy(entry)
        e['file'] = runtime_ref(e['file'])
        out['projectiles'][pid] = e
    orient = events['fxOrientation']
    for kid, entry in merge['projectileProfiles'].items():
        cid = ID_MAP[kid]
        p = copy.deepcopy(entry)
        p['unitId'] = cid
        p['file'] = runtime_ref(p['file'])
        check_regions(f'{kid} travel', p['travel'], sizes[p['file'][len(NAME) + 1:]])
        if p['impactEffectId'] not in out['effects'] or p['projectileId'] not in out['projectiles']:
            raise SystemExit(f'{kid}: profile names an effect or projectile the merge lacks')
        fam = FAMILY_OF[kid]
        o = orient[fam]
        p['travelRotationOffsetRad'] = o['travelRotationOffsetRad']
        p['impactRotationOffsetRad'] = o['impactRotationOffsetRad']
        sounds = SOUNDS[fam]
        for part in ('release', 'impact'):
            if sounds[part]['id'] not in known_sounds:
                raise SystemExit(f'{kid}: {part} sound {sounds[part]["id"]} is not in assets-runtime/audio/manifest.json')
        p['sounds'] = copy.deepcopy(sounds)
        out['projectileProfiles'][cid] = p
    # Only Deepwater Blast was painted pointing left (handoff §7): PI on its travel, never on an impact.
    for cid, p in out['projectileProfiles'].items():
        want = 3.141592653589793 if FAMILY_OF[cid] == 'hafgufa' else 0
        if abs(p['travelRotationOffsetRad'] - want) > 1e-9 or p['impactRotationOffsetRad'] != 0:
            raise SystemExit(f'{cid}: unexpected FX orientation {p["travelRotationOffsetRad"]}/{p["impactRotationOffsetRad"]}')
    return out


def merge_registry(manifest: dict, entries: dict[str, dict]) -> dict:
    """The production registry with the sea entries set under their IDs; every other entry kept as it was."""
    out = dict(manifest)
    for sec in SECTIONS:
        cur = dict(out.get(sec) or {})
        for k, v in entries[sec].items():
            cur[k] = v
        out[sec] = cur
    return out


def kit_manifest(assets: list[dict]) -> dict:
    by_rel = {rel_of(a): a for a in assets}
    out_assets: dict[str, dict] = {}
    for cid, f in PORTRAIT_FILES.items():
        a = by_rel[f]
        out_assets[f'seacreatures.portrait.{cid}'] = {'file': f'{NAME}/{f}', 'kind': 'portrait', 'width': a['width'], 'height': a['height'], 'creatureId': cid, 'sha256': a['sha256']}
    a = by_rel[BATTLEFIELD]
    out_assets['seacreatures.battlefield.single-ship'] = {'file': f'{NAME}/{BATTLEFIELD}', 'kind': 'battlefield', 'width': a['width'], 'height': a['height'], 'layoutId': 'single_ship_sea_encounter_v2', 'sha256': a['sha256']}
    return {
        'schema': 'pantheon-realms-sea-creatures-1',
        'notice': 'Written by tools/assets/import_sea_creatures.py from the sea-creature delivery of 2026-10-17 (sources: assets-source/art/sea-creatures-v1). '
                  'Relative paths only (sea-creatures-v1/...); portraits and the battlefield are read by packages/ui/src/assets/manifest.ts; the creature, '
                  'effect, projectile and profile entries live in assets-runtime/sprites/manifest.json. Native pixels: never resized, alpha kept.',
        'assets': out_assets,
    }


def self_test() -> int:
    """The registry merge keeps unrelated entries and replaces only its own IDs (no files touched)."""
    base = {'schema': 'pantheon-realms-sprites-1', 'creatures': {'hoplite': {'a': 1}, 'cetus': {'old': True}}, 'heroes': {'greek': {}}, 'effects': {'fx.x': {}}, 'projectiles': {}}
    entries = {s: {} for s in SECTIONS}
    entries['creatures']['cetus'] = {'new': True}
    entries['projectileProfiles']['cetus'] = {'unitId': 'cetus'}
    got = merge_registry(base, entries)
    assert got['creatures'] == {'hoplite': {'a': 1}, 'cetus': {'new': True}}, got
    assert got['heroes'] == {'greek': {}} and got['effects'] == {'fx.x': {}}
    assert got['projectileProfiles'] == {'cetus': {'unitId': 'cetus'}}
    assert list(got['creatures']) == ['hoplite', 'cetus']
    assert base['creatures']['cetus'] == {'old': True}, 'the input is never changed'
    print('self-test passed')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--kit', type=Path, default=None, help='the delivered folder (copies it in); without it: verify and rewrite the registries')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    meta = args.kit.resolve() if args.kit else SRC
    if not (meta / 'asset-manifest.json').is_file():
        print(f'{meta}: no asset-manifest.json (pass --kit <delivery folder> the first time)')
        return 1
    assets = json.loads((meta / 'asset-manifest.json').read_text(encoding='utf-8'))['assets']
    if len(assets) != EXPECTED_PNGS:
        print(f'expected {EXPECTED_PNGS} pictures, asset-manifest.json lists {len(assets)}')
        return 1
    rels = [rel_of(a) for a in assets]

    if args.kit:
        kit = args.kit.resolve()
        listed = sorted(rels)
        present = sorted(p.relative_to(kit / 'assets').as_posix() for p in (kit / 'assets').rglob('*') if p.is_file())
        if present != listed:
            raise SystemExit(f'assets/ holds {len(present)} files, the manifest lists {len(listed)}: extra {sorted(set(present) - set(listed))}, missing {sorted(set(listed) - set(present))}')
        for a, rel in zip(assets, rels):
            check_png(kit / 'assets' / rel, a)
        for f in ('sprite-manifest-merge.json', 'animation-events.json', 'animation-manifest.json', 'design/battlefield-layout.json', 'design/sea-creature-roster.json', 'CLAUDE_HANDOFF.txt'):
            if not (kit / f).is_file():
                raise SystemExit(f'the kit lacks {f}')
        changed = 0
        if not args.dry_run:
            for rel in rels:
                changed += copy_if_changed(kit / 'assets' / rel, RUN / rel)
            for p in sorted(kit.rglob('*')):
                if p.is_file():
                    changed += copy_if_changed(p, SRC / p.relative_to(kit))
        print(f'checked {EXPECTED_PNGS} PNGs (SHA-256, size, colour mode); {"dry run, nothing copied" if args.dry_run else f"{changed} file(s) copied or replaced"} '
              f'({RUN.relative_to(ROOT)}: assets/ contents; {SRC.relative_to(ROOT)}: the whole delivery)')
        if args.dry_run:
            return 0

    # ------------------------------------------------------------------ verify both copies
    sizes: dict[str, tuple[int, int]] = {}
    for a, rel in zip(assets, rels):
        check_png(RUN / rel, a)
        check_png(SRC / 'assets' / rel, a)
        sizes[rel] = (a['width'], a['height'])
    expected = set(rels) | {'manifest.json'}
    present = {p.relative_to(RUN).as_posix() for p in RUN.rglob('*') if p.is_file()}
    extra = sorted(present - expected)
    if extra:
        raise SystemExit(f'{RUN.relative_to(ROOT)} holds files that are not delivered runtime assets: {extra}')

    merge = json.loads((SRC / 'sprite-manifest-merge.json').read_text(encoding='utf-8'))
    events = json.loads((SRC / 'animation-events.json').read_text(encoding='utf-8'))
    known = {x['id'] for x in json.loads(AUDIO.read_text(encoding='utf-8'))['sounds']}
    entries = build_entries(merge, events, sizes, known)
    text = json.dumps(entries)
    for f in re.findall(r'"file": "([^"]+)"', text):
        if not (ROOT / 'assets-runtime' / f).is_file():
            raise SystemExit(f'registry entry names a missing file: {f}')
    if re.search(r'[A-Za-z]:\\\\|blannder|\.codex|generated_images', text):
        raise SystemExit('an absolute delivery path leaked into the registry entries')

    current = json.loads(SPRITES.read_text(encoding='utf-8'))
    merged = merge_registry(current, entries)
    sprites_text = json.dumps(merged, indent=1) + '\n'
    kit_text = json.dumps(kit_manifest(assets), indent=1, ensure_ascii=False) + '\n'
    if args.dry_run:
        print('dry run: registries not written')
        return 0
    wrote = []
    if SPRITES.read_text(encoding='utf-8') != sprites_text:
        write_atomic(SPRITES, sprites_text)
        wrote.append(SPRITES.relative_to(ROOT).as_posix())
    kit_path = RUN / 'manifest.json'
    if not kit_path.is_file() or kit_path.read_text(encoding='utf-8') != kit_text:
        write_atomic(kit_path, kit_text)
        wrote.append(kit_path.relative_to(ROOT).as_posix())
    print(f'verified {EXPECTED_PNGS} PNGs in {RUN.relative_to(ROOT)} and {(SRC / "assets").relative_to(ROOT)}; '
          f'registry: {len(entries["creatures"])} creature sets, {len(entries["effects"])} impacts, {len(entries["projectiles"])} projectiles, '
          f'{len(entries["projectileProfiles"])} profiles; {"wrote " + ", ".join(wrote) if wrote else "registries already up to date"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
