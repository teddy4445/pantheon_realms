#!/usr/bin/env python3
"""
Import the final music and sound effects (development tool; never packaged in the game).

The owner asked (2026-10-05) for real audio in place of the code-made placeholders:
a menu theme, battle music per pantheon, siege music, short victory and defeat
pieces, and real effects for weapons, spells, building and the interface. The
choice is data: assets-source/audio/sounds.json lists every sound ID, the
Pixabay tracks it uses (ID, title, author, page, licence) and the runtime file
each becomes. This script

  1. converts each downloaded MP3 (`pixabay-<id>.mp3`, from --from DIR) by role:
       music     two-pass EBU R128 to -16 LUFS (as the map music), Ogg Vorbis q2;
       stinger   leading and trailing silence trimmed, loudness matched to the placeholder it
                 replaces (so the mix keeps its balance), Ogg q4;
       effect    leading and trailing silence trimmed, cut to the sound's length limit with a
                 short fade, loudness matched to the placeholder, Ogg q3;
       ambience  a seamless loop (a slice of at most 60 s whose end is
                 crossfaded into its start), loudness matched, Ogg q3;
       loop      the same with a short crossfade (footsteps);
  2. registers the entries in assets-runtime/audio/manifest.json: an existing
     entry keeps its gain, voices, cooldown and jitter and gets the new files,
     `status: final` and the provenance; a new ID (battle music per pantheon,
     siege music) is added; placeholder files no longer referenced are removed.

  python3 tools/audio/import_sounds.py --from ~/Downloads        # convert + register
  python3 tools/audio/import_sounds.py --register-only           # files already converted

Needs: ffmpeg with libvorbis, numpy.
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from import_music import convert as convert_music  # noqa: E402  (same loudness pipeline as the map music)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPEC = os.path.join(ROOT, 'assets-source', 'audio', 'sounds.json')
MANIFEST = os.path.join(ROOT, 'assets-runtime', 'audio', 'manifest.json')
RUNTIME = os.path.join(ROOT, 'assets-runtime')
SR = 44100
PEAK = 0.89  # about -1 dBFS


def decode(path: str) -> np.ndarray:
    """Any audio file -> float32 stereo array of shape (n, 2) at 44.1 kHz."""
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def encode(sig: np.ndarray, dst: str, quality: int) -> None:
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    data = np.clip(sig, -1, 1).astype(np.float32).tobytes()
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', str(quality), dst], input=data, check=True)


def active_rms(sig: np.ndarray) -> float:
    """RMS over the 50 ms frames that are within 40 dB of the loudest frame (silence does not count)."""
    mono = sig.mean(axis=1)
    n = int(SR * 0.05)
    frames = mono[: len(mono) // n * n].reshape(-1, n) if len(mono) >= n else mono.reshape(1, -1)
    rms = np.sqrt((frames ** 2).mean(axis=1) + 1e-12)
    keep = rms[rms >= rms.max() * 0.01]
    return float(np.sqrt((keep ** 2).mean())) if len(keep) else 0.0


def trim_lead(sig: np.ndarray, threshold_db: float = -45.0) -> np.ndarray:
    level = np.abs(sig).max(axis=1)
    above = np.nonzero(level > 10 ** (threshold_db / 20))[0]
    start = max(0, above[0] - int(SR * 0.005)) if len(above) else 0
    return sig[start:]


def trim_tail(sig: np.ndarray, below_peak_db: float = -48.0, keep_s: float = 0.06) -> np.ndarray:
    """Drop the trailing near-silence (a voice is not held for a silent tail)."""
    level = np.abs(sig).max(axis=1)
    peak = level.max() if len(level) else 0.0
    if peak <= 0:
        return sig
    above = np.nonzero(level > peak * 10 ** (below_peak_db / 20))[0]
    end = min(len(sig), above[-1] + int(SR * keep_s)) if len(above) else len(sig)
    return sig[:end]


def fade_out(sig: np.ndarray, seconds: float) -> np.ndarray:
    n = min(len(sig), int(SR * seconds))
    if n > 0:
        sig[-n:] *= np.linspace(1.0, 0.0, n)[:, None] ** 2
    return sig


def seamless_loop(sig: np.ndarray, length_s: float, xfade_s: float, skip_s: float) -> np.ndarray:
    """A loop of at most `length_s` whose end flows into its start (equal-power crossfade)."""
    start = int(SR * skip_s) if len(sig) > SR * (skip_s + length_s / 2) else 0
    body = sig[start:]
    x = int(SR * xfade_s)
    total = min(len(body) - x, int(SR * length_s))
    if total <= x * 2:
        raise RuntimeError('too short for a loop')
    out = body[:total].copy()
    t = np.linspace(0.0, np.pi / 2, x)[:, None]
    out[:x] = body[:x] * np.sin(t) + body[total : total + x] * np.cos(t)
    return out


def match_level(sig: np.ndarray, reference: str | None, fallback_rms: float) -> np.ndarray:
    target = fallback_rms
    if reference and os.path.exists(reference):
        target = active_rms(decode(reference)) or fallback_rms
    cur = active_rms(sig)
    if cur <= 0:
        return sig
    gain = target / cur
    peak = float(np.abs(sig).max()) * gain
    if peak > PEAK:
        gain *= PEAK / peak
    return sig * gain


def process(role: str, src: str, dst: str, reference: str | None, opts: dict) -> None:
    if role == 'music':
        convert_music(src, dst)
        return
    sig = decode(src)
    if role in ('ambience', 'loop'):
        loop_s = opts.get('loopSeconds', 60.0 if role == 'ambience' else 8.0)
        sig = seamless_loop(sig, loop_s, opts.get('crossfadeSeconds', 3.0 if role == 'ambience' else 0.3), opts.get('skipSeconds', 1.0 if role == 'ambience' else 0.0))
        sig = match_level(sig, reference, 0.08)
        encode(sig, dst, 3)
        return
    sig = trim_tail(trim_lead(sig))
    limit = opts.get('maxSeconds', 15.0 if role == 'stinger' else 3.5)
    if len(sig) > SR * limit:
        sig = fade_out(sig[: int(SR * limit)].copy(), 0.25)
    else:
        sig = fade_out(sig, 0.03)
    sig = match_level(sig, reference, 0.12)
    encode(sig, dst, 4 if role == 'stinger' else 3)


def provenance(spec: dict, sound: dict) -> str:
    credits = '; '.join(
        f"“{spec['sources'][str(t['pixabayId'])]['title']}” by {spec['sources'][str(t['pixabayId'])]['author']} ({spec['sources'][str(t['pixabayId'])]['page']})"
        for t in sound['tracks']
    )
    return f"{spec['licenseNote']} Converted by tools/audio/import_sounds.py. {credits}."


def register(spec: dict) -> tuple[list[str], list[str]]:
    manifest = json.load(open(MANIFEST, encoding='utf-8'))
    by_id = {s['id']: s for s in manifest['sounds']}
    added, missing = [], []
    for sound in spec['sounds']:
        files = [t['file'] for t in sound['tracks']]
        absent = [f for f in files if not os.path.exists(os.path.join(RUNTIME, f))]
        if absent:
            missing.append(f"{sound['id']}: {', '.join(absent)}")
            continue
        entry = dict(by_id.get(sound['id']) or {'id': sound['id'], 'role': sound['role'], 'bus': sound['bus'], 'gain': sound.get('gain', 1.0)})
        entry.update({'files': files, 'status': 'final', 'provenance': provenance(spec, sound)})
        if 'gain' in sound:
            entry['gain'] = sound['gain']
        if sound.get('playlist'):
            entry['playlist'] = True
        else:
            entry.pop('playlist', None)
        if sound['id'] in by_id:
            manifest['sounds'][manifest['sounds'].index(by_id[sound['id']])] = entry
        else:
            manifest['sounds'].append(entry)
        by_id[sound['id']] = entry
        added.append(sound['id'])
    # Sounds the game no longer plays (spec "retire"), e.g. the soundscape music the pantheon playlists replaced.
    retire = set(spec.get('retire', []))
    manifest['sounds'] = [s for s in manifest['sounds'] if s['id'] not in retire]
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')
    # Placeholder files no entry refers to any more.
    used = {f for s in manifest['sounds'] for f in s['files']}
    pdir = os.path.join(RUNTIME, 'audio', 'placeholder')
    for name in sorted(os.listdir(pdir)) if os.path.isdir(pdir) else []:
        if f'audio/placeholder/{name}' not in used:
            os.remove(os.path.join(pdir, name))
    return added, missing


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='src', help='folder holding pixabay-<id>.mp3')
    ap.add_argument('--register-only', action='store_true')
    ap.add_argument('--only', default='', help='comma-separated sound IDs to convert')
    a = ap.parse_args()
    spec = json.load(open(SPEC, encoding='utf-8'))
    only = set(filter(None, a.only.split(',')))
    if not a.register_only:
        if not a.src:
            ap.error('--from is required unless --register-only')
        manifest = json.load(open(MANIFEST, encoding='utf-8'))
        old = {s['id']: s for s in manifest['sounds']}
        for sound in spec['sounds']:
            if only and sound['id'] not in only:
                continue
            prev = old.get(sound['id'])
            refs = [os.path.join(RUNTIME, f) for f in prev['files']] if prev and prev.get('status') == 'placeholder' else []
            for i, t in enumerate(sound['tracks']):
                src = os.path.join(os.path.expanduser(a.src), f"pixabay-{t['pixabayId']}.mp3")
                if not os.path.exists(src):
                    print(f"{sound['id']}: pixabay-{t['pixabayId']}.mp3 not found", file=sys.stderr)
                    continue
                ref = refs[min(i, len(refs) - 1)] if refs else None
                process(sound['role'], src, os.path.join(RUNTIME, t['file']), ref, t)
                print(f"{t['file']}: {os.path.getsize(os.path.join(RUNTIME, t['file'])) / 1e3:.0f} kB", flush=True)
    added, missing = register(spec)
    print('registered:', len(added), 'sounds')
    for m in missing:
        print('not registered (files missing):', m, file=sys.stderr)
    return 1 if missing else 0


if __name__ == '__main__':
    sys.exit(main())
