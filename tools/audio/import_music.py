#!/usr/bin/env python3
"""
Import the map music (development tool; never packaged in the game).

The owner chose royalty-free, no-attribution tracks for the adventure map,
several per pantheon (assets-source/audio/music/tracks.json: Pixabay ID,
title, author, page, licence). This script

  1. converts each downloaded MP3 (`pixabay-<id>.mp3`, from --from DIR) to
     Ogg Vorbis at quality 2 (about 96 kbit/s), 44.1 kHz stereo, loudness
     normalised to -16 LUFS integrated (two-pass EBU R128, linear gain, true
     peak at most -1.5 dBTP) -> assets-runtime/audio/<file>;
  2. registers one playlist per pantheon in assets-runtime/audio/manifest.json:
     `music.map.<pantheon>` (role music, `playlist: true`, status final, the
     tracks' provenance), keeping every other entry as it is.

The game plays a pantheon's playlist on the adventure map, town and hero
screens of the viewing player (packages/ui/src/audio/sounds.ts), streamed one
track after another with a crossfade (packages/audio/src/director.ts). Without
an entry it falls back to the mission's soundscape music.

  python3 tools/audio/import_music.py --from ~/Downloads        # convert + register
  python3 tools/audio/import_music.py --register-only           # files already converted
  python3 tools/audio/import_music.py --from DIR --out DIR2     # convert into another root (e.g. a staging folder)

Needs: ffmpeg with libvorbis.
"""
import argparse
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TRACKS = os.path.join(ROOT, 'assets-source', 'audio', 'music', 'tracks.json')
MANIFEST = os.path.join(ROOT, 'assets-runtime', 'audio', 'manifest.json')
TARGET_LUFS = -16.0
TRUE_PEAK = -1.5
GAIN = 0.85  # the same manifest gain as the soundscape music it replaces on the map


def measure(src: str) -> dict:
    """First loudnorm pass: the input's integrated loudness, range, true peak and threshold."""
    cmd = ['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-af', f'loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA=20:print_format=json', '-f', 'null', '-']
    out = subprocess.run(cmd, capture_output=True, text=True, check=True).stderr
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', out, re.S)
    if not m:
        raise RuntimeError(f'{src}: loudness not measured')
    return json.loads(m.group(0))


def convert(src: str, dst: str) -> None:
    j = measure(src)
    af = (
        f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA=20:linear=true:"
        f"measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
        f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}"
    )
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cmd = ['ffmpeg', '-hide_banner', '-nostats', '-loglevel', 'error', '-y', '-i', src, '-af', af, '-ar', '44100', '-ac', '2', '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', '2', dst]
    subprocess.run(cmd, check=True)


def register(tracks: list, out_root: str) -> list:
    manifest = json.load(open(MANIFEST, encoding='utf-8'))
    sounds = [s for s in manifest['sounds'] if not s['id'].startswith('music.map.')]
    order = []
    for t in tracks:
        if t['pantheon'] not in order:
            order.append(t['pantheon'])
    added = []
    for p in order:
        mine = [t for t in tracks if t['pantheon'] == p]
        missing = [t['file'] for t in mine if not os.path.exists(os.path.join(out_root, t['file']))]
        if missing:
            print(f'music.map.{p}: missing {", ".join(missing)} — not registered', file=sys.stderr)
            continue
        credits = '; '.join(f"“{t['title']}” by {t['author']} ({t['page']})" for t in mine)
        sounds.append({
            'id': f'music.map.{p}',
            'role': 'music',
            'bus': 'music',
            'files': [t['file'] for t in mine],
            'gain': GAIN,
            'playlist': True,
            'status': 'final',
            'provenance': f'Royalty-free tracks from Pixabay under the Pixabay Content License (no attribution required), chosen and downloaded with the owner’s approval on 2026-10-04; converted by tools/audio/import_music.py. {credits}.',
        })
        added.append(f'music.map.{p}')
    manifest['sounds'] = sounds
    manifest['note'] = 'Sound IDs -> files. The placeholders are synthesized by tools/audio/make_placeholders.py (status "placeholder"); final audio (status "final", e.g. the map music of tools/audio/import_music.py) keeps its entries when the placeholders are regenerated.'
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')
    return added


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='src', help='folder holding pixabay-<id>.mp3')
    ap.add_argument('--out', default=os.path.join(ROOT, 'assets-runtime'), help='root the tracks’ files are written under (default assets-runtime)')
    ap.add_argument('--register-only', action='store_true')
    ap.add_argument('--no-register', action='store_true')
    a = ap.parse_args()
    tracks = json.load(open(TRACKS, encoding='utf-8'))['tracks']
    if not a.register_only:
        if not a.src:
            ap.error('--from is required unless --register-only')
        for t in tracks:
            src = os.path.join(os.path.expanduser(a.src), t['source'])
            dst = os.path.join(a.out, t['file'])
            if not os.path.exists(src):
                print(f"{t['source']}: not found in {a.src}", file=sys.stderr)
                continue
            convert(src, dst)
            print(f"{t['file']}: {os.path.getsize(dst) / 1e6:.1f} MB")
    if not a.no_register:
        print('registered:', ', '.join(register(tracks, a.out)) or 'nothing')
    return 0


if __name__ == '__main__':
    sys.exit(main())
