#!/usr/bin/env python3
"""
Import the battle FX & neutral-upgrade delivery of 2026-10-15 (development tool; never packaged).

The delivery (PROJECTILES, IMPACTS & SIX NEUTRAL UPGRADES handoff) supplies 25
accepted native PNGs: twelve projectile/impact sheets (4 x 4 cells: base travel,
base impact, upgraded travel, upgraded impact; the siege sheet: turret arrow,
then catapult stone), six upgraded neutral portraits, six upgraded core
animation atlases (6 states x 4 poses) and the Dawncrest Pegasus flight atlas.

  1. With --kit DIR: copy the 25 PNGs listed in asset-manifest.json byte for byte
     into assets-source/battle-fx-neutral-upgrades-v1/ AND
     assets-runtime/battle-fx-neutral-upgrades-v1/ (delivered filenames, SHA-256
     checked), and the handoff and JSON metadata into
     docs/battle-fx-neutral-upgrades-v1/. Nothing from reference/iterations, no
     preview screenshots, no base comparison copies.
  2. Verify: every PNG in both folders matches its manifest hash and size.
  3. Write assets-runtime/battle-fx-neutral-upgrades-v1/manifest.json (relative
     paths only) from the delivery's merge fragments and projectile profiles:
       - `assets`: the six portraits as `neutralupgrade.portrait.<creatureId>`;
       - `creatures`: the six upgraded forms' frame-region sets (the fragment's
         values: body scale 0.82 of the base registration, flight sourceScale 0.65);
       - `effects`: 24 impacts `battlefx.<unit>.hit` (frame regions, pixel anchors);
       - `projectiles`: 24 travel stills `battlefx.<unit>` (first travel pose);
       - `projectileProfiles`: per shooter creature ID (22) plus `siege_turret` and
         `catapult`: travel frames (regions), the impact effect ID, path, duration
         range, frame rates, playback, size, release point, and `sounds` (release and
         impact sound IDs by missile family, the `SOUNDS` table below).
     The UI asset loader merges it into the sprite manifest (it never replaces it).

Usage: python3 tools/assets/import_battle_fx_upgrades.py [--kit DIR] [--dry-run]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NAME = 'battle-fx-neutral-upgrades-v1'
SRC = ROOT / 'assets-source' / NAME
RUN = ROOT / 'assets-runtime' / NAME
DOCS = ROOT / 'docs' / NAME
DOC_FILES = [
    'CLAUDE_HANDOFF.txt', 'CLAUDE_HANDOFF.html', 'START_HERE.txt', 'asset-manifest.json', 'animation-manifest.json',
    'projectile-profiles.json', 'sprite-manifest-merge.json', 'validation.json', 'delivery-checks.json', 'generation-log.json',
    'design/neutral-upgrades.json', 'design/generation-plan.json', 'reference/preview-qa.json', 'reference/shooter-audit.json',
    'reference/base-reference-map.json',
]


# In-game calibration (2026-10-16, metadata only; the delivered pixels are unchanged).
# The delivery calls its scales and impact sizes starting values to calibrate in the live
# renderer; these were measured in battle captures (DEVELOPMENT_STATUS.md, app 1.3.0).
CALIBRATION = {
    # Dawncrest's flight poses drew the body 15-20 % smaller than its ground poses at 0.65;
    # at 0.78 the head and body match the ground poses (calibration sheet in the 1.3.0 review set).
    'flightSourceScale': {'dawncrest_pegasus': 0.78},
    # Bodies (not crest or mane) about 12-15 % larger than their bases at the delivered 0.82;
    # these keep the upgrade a little larger (about 5-7 %) and the Dreamtusk inside its two hexes.
    'pixelsPerHex': {'dawncrest_pegasus': 130.0, 'dreamtusk_baku': 128.0},
    # Ground contact: Dawncrest death poses 2 and 4 sank 3-4 native px below the ground point.
    'anchorYOffset': {('dawncrest_pegasus', 'death', 1): 3, ('dawncrest_pegasus', 'death', 3): 4},
    # Small physical impacts (javelin, dart, sling, tower arrow) were hard to see at 0.5 hex.
    'impactSizeHex': {u: 0.7 for u in ('peltast', 'veteran_peltast', 'egyptian_jackal_guardian', 'egyptian_anubian_warden', 'mesoamerican_eagle_warrior_spirit', 'mesoamerican_solar_eagle_warrior', 'hill_slinger', 'sling_master', 'siege_turret')},
}


# What each missile sounds like (2026-10-16; presentation only): the release sound goes with the
# launch, the impact sound with the impact (BattleCue `sound`). Sound IDs of
# assets-runtime/audio/manifest.json only (no new audio); `maxMs` cuts a long sound with a ~70 ms
# fade (the magic recordings run 2-3.5 s; the missiles fly 220-650 ms). Keyed by the delivery's
# `family`; the two siege actors by unit, keeping the sounds they had (combat.turret /
# combat.catapult at launch). Durations and loudness envelopes were measured on the files
# (ffprobe, 50 ms RMS); proposed, tune in play.
SOUNDS = {
    # Thrown javelins and darts: an arm's whoosh, a pointed head striking.
    'greek-javelin': {'release': {'id': 'combat.swing', 'maxMs': 600}, 'impact': {'id': 'combat.arrow_hit'}},
    'egyptian-javelin': {'release': {'id': 'combat.swing', 'maxMs': 600}, 'impact': {'id': 'combat.arrow_hit'}},
    'atlatl-dart': {'release': {'id': 'combat.swing', 'maxMs': 600}, 'impact': {'id': 'combat.arrow_hit'}},
    # A sling stone: the whoosh and a blunt thud (combat.hit is mostly sword slices).
    'sling-ammunition': {'release': {'id': 'combat.swing', 'maxMs': 600}, 'impact': {'id': 'combat.hit_heavy'}},
    # Heavy lobs: the Catapult's own big whoosh (peaks mid-flight), stone debris on arrival.
    'cyclops-boulder': {'release': {'id': 'combat.catapult', 'maxMs': 750}, 'impact': {'id': 'combat.stone_hit'}},
    'granite-block': {'release': {'id': 'combat.catapult', 'maxMs': 750}, 'impact': {'id': 'combat.stone_hit'}},
    # Magic and breath (long recordings, cut): full level within 50-150 ms of the start.
    'arcane-bolt': {'release': {'id': 'magic.cast', 'maxMs': 600}, 'impact': {'id': 'magic.strike', 'maxMs': 700}},
    # A hissing spray, then breaking ice (magic.wind swells for 1.3 s: cut short it is almost silent).
    'frost-breath': {'release': {'id': 'magic.water', 'maxMs': 600}, 'impact': {'id': 'magic.frost', 'maxMs': 900}},
    # Fire leaves the mouth; the holy choir (Kirin) or an elemental strike (Xiuhcoatl) where it lands.
    'holy-fire': {'release': {'id': 'magic.fire'}, 'impact': {'id': 'magic.holy', 'maxMs': 800}},
    'serpent-fire': {'release': {'id': 'magic.fire'}, 'impact': {'id': 'magic.strike', 'maxMs': 700}},
    # A low rising whoosh, then the dark drone.
    'spectral-wail': {'release': {'id': 'magic.shadow', 'maxMs': 700}, 'impact': {'id': 'magic.curse', 'maxMs': 700}},
    # The siege actors (by unit): the sounds of before.
    'siege_turret': {'release': {'id': 'combat.turret'}, 'impact': {'id': 'combat.arrow_hit'}},
    'catapult': {'release': {'id': 'combat.catapult'}, 'impact': {'id': 'combat.stone_hit'}},
}


def sounds_for(unit: str, family: str, known: set[str]) -> dict:
    entry = SOUNDS.get(unit) if family == 'siege' else SOUNDS.get(family)
    if not entry:
        raise SystemExit(f'{unit}: no sounds for missile family {family!r} (add it to SOUNDS)')
    for part in ('release', 'impact'):
        sid = entry[part]['id']
        if sid not in known:
            raise SystemExit(f'{unit}: {part} sound {sid!r} is not in assets-runtime/audio/manifest.json')
    return {part: dict(entry[part]) for part in ('release', 'impact')}


def calibrate(merge: dict, profiles: dict) -> None:
    for cid, sc in CALIBRATION['flightSourceScale'].items():
        for name in ('takeoff', 'fly', 'landing'):
            for r in merge['creatures'][cid]['animations'][name]['regions']:
                r['sourceScale'] = sc
    for cid, pph in CALIBRATION['pixelsPerHex'].items():
        merge['creatures'][cid]['pixelsPerHex'] = pph
    for (cid, anim, i), dy in CALIBRATION['anchorYOffset'].items():
        r = merge['creatures'][cid]['animations'][anim]['regions'][i]
        r['anchor'] = [r['anchor'][0], min(r['rect'][3], r['anchor'][1] + dy)]
    for unit, size in CALIBRATION['impactSizeHex'].items():
        old = profiles[unit]['impactSizeHex']
        profiles[unit]['impactSizeHex'] = size
        eff = merge['effects'][f'battlefx.{unit}.hit']
        eff['pixelsPerHex'] = round(eff['pixelsPerHex'] * old / size, 3)
    for cid in CALIBRATION['flightSourceScale']:
        merge['creatures'][cid]['provenance'] += '; flight sourceScale, body scale and two death anchors calibrated in game 2026-10-16'


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def runtime_file(delivery_file: str) -> str:
    return f'{NAME}/{Path(delivery_file).name}'


def regions(frames: list[dict]) -> list[dict]:
    return [{'rect': f['rect'], 'anchor': f['anchor'], 'sourceScale': f['sourceScale'], 'sourceCell': f['sourceCell']} for f in frames]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--kit', type=Path, default=None)
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    meta_root = args.kit if args.kit else DOCS
    assets = json.loads((meta_root / 'asset-manifest.json').read_text(encoding='utf-8'))['assets']
    if len(assets) != 25:
        print(f'expected 25 delivered files, the manifest lists {len(assets)}')
        return 1

    if args.kit:
        for a in assets:
            src = args.kit / a['deliveryFile']
            if sha(src) != a['sha256'] or src.stat().st_size != a['bytes']:
                print(f'hash or size mismatch in the delivery: {a["deliveryFile"]}')
                return 1
        if not args.dry_run:
            for d in (SRC, RUN):
                d.mkdir(parents=True, exist_ok=True)
                for a in assets:
                    shutil.copyfile(args.kit / a['deliveryFile'], d / Path(a['deliveryFile']).name)
            for f in DOC_FILES:
                (DOCS / f).parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(args.kit / f, DOCS / f)
        print(f'copied 25 PNGs to {SRC.relative_to(ROOT)} and {RUN.relative_to(ROOT)}, {len(DOC_FILES)} documents to {DOCS.relative_to(ROOT)}')

    for d in (SRC, RUN):
        for a in assets:
            p = d / Path(a['deliveryFile']).name
            if not p.exists() or sha(p) != a['sha256']:
                print(f'{p.relative_to(ROOT)}: missing or not the delivered bytes')
                return 1

    merge = json.loads((meta_root / 'sprite-manifest-merge.json').read_text(encoding='utf-8'))['merge']
    profiles = json.loads((meta_root / 'projectile-profiles.json').read_text(encoding='utf-8'))['profiles']
    upgrades = json.loads((meta_root / 'design' / 'neutral-upgrades.json').read_text(encoding='utf-8'))['upgrades']
    by_file = {a['deliveryFile']: a for a in assets}
    calibrate(merge, profiles)
    known_sounds = {x['id'] for x in json.loads((ROOT / 'assets-runtime' / 'audio' / 'manifest.json').read_text(encoding='utf-8'))['sounds']}

    def check_file(entry: object) -> None:
        for f in json.dumps(entry).split('"file": "')[1:]:
            rel = f.split('"', 1)[0]
            if not rel.startswith(f'{NAME}/') or not (ROOT / 'assets-runtime' / rel).exists():
                raise SystemExit(f'manifest entry points outside {NAME}: {rel}')

    out_assets = {}
    for u in upgrades:
        a = by_file[u['portrait']]
        out_assets[u['portraitAssetId']] = {'file': runtime_file(a['deliveryFile']), 'kind': 'portrait', 'width': a['width'], 'height': a['height'], 'creatureId': u['id'], 'baseId': u['baseId']}

    out_profiles = {}
    for unit, p in profiles.items():
        file = runtime_file(p['file'])
        a = by_file[p['file']]
        for fr in p['travelFrames'] + p['impactFrames']:
            x, y, w, h = fr['rect']
            if x < 0 or y < 0 or x + w > a['width'] or y + h > a['height']:
                raise SystemExit(f'{unit}: frame {fr["rect"]} outside {a["width"]}x{a["height"]}')
        out_profiles[unit] = {
            'unitId': unit,
            'displayName': p['displayName'],
            'variant': p['variant'],
            'file': file,
            'travel': regions(p['travelFrames']),
            'travelFps': p['travelFps'],
            'travelPlayback': 'loop' if p['travelPlayback'].startswith('loop') else 'static',
            'impactEffectId': f'battlefx.{unit}.hit',
            'projectileId': f'battlefx.{unit}',
            'impactFps': p['impactFps'],
            'impactFadeLastMs': p['impactFadeLastMs'],
            'path': p['path'],
            'durationMsRange': p['durationMsRange'],
            'sourcePoint': p['sourcePoint'],
            'sizeHex': p['sizeHex'],
            'impactSizeHex': p['impactSizeHex'],
            'blend': p['blend'],
            'sounds': sounds_for(unit, p['family'], known_sounds),
        }
        if f'battlefx.{unit}.hit' not in merge['effects'] or f'battlefx.{unit}' not in merge['projectiles']:
            raise SystemExit(f'{unit}: the merge fragment lacks its effect or projectile')

    manifest = {
        'schema': 'pantheon-realms-battle-fx-upgrades-1',
        'notice': 'Written by tools/assets/import_battle_fx_upgrades.py from the battle FX & neutral-upgrade delivery of 2026-10-15. Relative paths only; merged into the sprite manifest by packages/ui/src/assets/manifest.ts.',
        'assets': out_assets,
        'creatures': merge['creatures'],
        'effects': merge['effects'],
        'projectiles': merge['projectiles'],
        'projectileProfiles': out_profiles,
    }
    for sec in ('creatures', 'effects', 'projectiles', 'projectileProfiles'):
        for k, v in manifest[sec].items():
            check_file(v)
    if len(out_profiles) != 24 or len(merge['creatures']) != 6:
        raise SystemExit('expected 24 profiles and 6 creature sets')
    if args.dry_run:
        print('dry run: manifest not written')
        return 0
    (RUN / 'manifest.json').write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'wrote {(RUN / "manifest.json").relative_to(ROOT)}: {len(out_assets)} portraits, {len(merge["creatures"])} creature sets, {len(merge["effects"])} impacts, {len(merge["projectiles"])} projectiles, {len(out_profiles)} profiles')
    return 0


if __name__ == '__main__':
    sys.exit(main())
