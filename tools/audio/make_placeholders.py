#!/usr/bin/env python3
"""Generate the temporary placeholder music, ambience and sound effects.

Everything is synthesized here from code (plucked strings, additive pads,
simple drums, filtered noise) with fixed seeds, so the output is reproducible
and contains no third-party recordings. The files are placeholders: final
audio replaces them by overwriting the file or changing its manifest entry.

Writes:
  assets-runtime/audio/placeholder/<name>.ogg   (Ogg Vorbis)
  assets-runtime/audio/manifest.json            (sound IDs -> files, buses, gains)

Usage:  python3 tools/audio/make_placeholders.py [--only name,name]
Needs:  numpy, scipy, and ffmpeg with libvorbis on PATH.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_DIR = os.path.join(ROOT, 'assets-runtime', 'audio', 'placeholder')
MANIFEST = os.path.join(ROOT, 'assets-runtime', 'audio', 'manifest.json')
PROVENANCE = 'Temporary placeholder synthesized by tools/audio/make_placeholders.py (no recordings); replace with final audio.'

# --------------------------------------------------------------------------- DSP helpers


def secs(n: float) -> int:
    return int(round(n * SR))


def tvec(n: int) -> np.ndarray:
    return np.arange(n) / SR


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def _sos(kind: str, f, order=2):
    nyq = SR / 2
    if isinstance(f, (list, tuple)):
        wn = [min(max(x / nyq, 1e-4), 0.999) for x in f]
    else:
        wn = min(max(f / nyq, 1e-4), 0.999)
    return butter(order, wn, btype=kind, output='sos')


def lowpass(x, f, order=2):
    return sosfilt(_sos('lowpass', f, order), x, axis=-1)


def highpass(x, f, order=2):
    return sosfilt(_sos('highpass', f, order), x, axis=-1)


def bandpass(x, lo, hi, order=2):
    return sosfilt(_sos('bandpass', [lo, hi], order), x, axis=-1)


def white(rng, n):
    return rng.standard_normal(n)


def pink(rng, n):
    # Paul Kellet's refined filter approximation of 1/f noise.
    w = rng.standard_normal(n)
    b = np.array([0.049922035, -0.095993537, 0.050612699, -0.004408786])
    a = np.array([1, -2.494956002, 2.017265875, -0.522189400])
    from scipy.signal import lfilter
    y = lfilter(b, a, w)
    return y / (np.std(y) + 1e-12)


def brown(rng, n):
    from scipy.signal import lfilter
    y = lfilter([1.0], [1.0, -0.997], rng.standard_normal(n))
    y -= lowpass(y, 8)
    return y / (np.std(y) + 1e-12)


def expdecay(n, tau):
    return np.exp(-tvec(n) / tau)


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    e = np.full(n, s, dtype=float)
    na, nd, nr = secs(a), secs(d), secs(r)
    na = min(na, n)
    e[:na] = np.linspace(0, 1, na, endpoint=False) if na else e[:na]
    nd = min(nd, max(0, n - na))
    if nd:
        e[na:na + nd] = np.linspace(1, s, nd, endpoint=False)
    nr = min(nr, n)
    if nr:
        e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def fade(x, fin=0.004, fout=0.01):
    x = x.copy()
    ni, no = secs(fin), secs(fout)
    if ni:
        x[..., :ni] *= np.linspace(0, 1, ni)
    if no:
        x[..., -no:] *= np.linspace(1, 0, no)
    return x


def place(buf, sig, at):
    """Add a mono or stereo signal into buf (2 x N or N) at sample `at` (clipped at the end)."""
    at = int(at)
    if at >= buf.shape[-1]:
        return
    n = min(sig.shape[-1], buf.shape[-1] - at)
    if buf.ndim == 2 and sig.ndim == 1:
        buf[:, at:at + n] += sig[:n]
    else:
        buf[..., at:at + n] += sig[..., :n]


def mix(*sigs):
    """Sum mono signals of different lengths (zero-padded to the longest)."""
    n = max(len(x) for x in sigs)
    out = np.zeros(n)
    for x in sigs:
        out[:len(x)] += x
    return out


def pan(sig, p):
    """Equal-power pan of a mono signal; p in [-1, 1]."""
    a = (p + 1) * np.pi / 4
    return np.vstack([sig * np.cos(a), sig * np.sin(a)])


def comb(x, d, g):
    """Feedback comb y[n] = x[n-d] + g*y[n-d], computed a block of d samples at a time."""
    y = np.zeros(len(x) + d)
    for k in range(d, len(y), d):
        e = min(k + d, len(y))
        y[k:e] = x[k - d:e - d] + g * y[k - d:e - d]
    return y[:len(x)]


def allpass(x, d, g):
    """Schroeder allpass y[n] = -g*x[n] + x[n-d] + g*y[n-d] (block recursion)."""
    xp = np.concatenate([np.zeros(d), x])
    y = np.zeros(len(xp))
    for k in range(d, len(xp), d):
        e = min(k + d, len(xp))
        y[k:e] = -g * xp[k:e] + xp[k - d:e - d] + g * y[k - d:e - d]
    return y[d:]


def reverb(x, wet=0.25, size=1.0, damp=4500, seed=0):
    """Small stereo Schroeder reverb (four combs, two allpasses per channel). x: 2 x N or N."""
    if x.ndim == 1:
        x = np.vstack([x, x])
    out = np.zeros_like(x)
    combs = [[29.7, 37.1, 41.1, 43.7], [31.3, 36.2, 40.1, 45.3]]
    g = min(0.88, 0.76 + 0.06 * size)
    for ch in range(2):
        src = lowpass(x[ch], damp)
        acc = np.zeros(x.shape[1])
        for ms in combs[ch]:
            acc += comb(src, max(1, int(ms * size * SR / 1000)), g)
        for ms, ga in ((5.0, 0.7), (1.7, 0.7)):
            acc = allpass(acc, max(1, int(ms * SR / 1000)), ga)
        out[ch] = acc
    out = lowpass(out, damp)
    return x * (1 - wet) + out * wet * 0.35


def soft_limit(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


def normalize(x, peak=0.89):
    m = np.max(np.abs(x)) + 1e-12
    return x * (peak / m)


def rms_to(x, db):
    r = np.sqrt(np.mean(x ** 2)) + 1e-12
    return x * (10 ** (db / 20) / r)


# --------------------------------------------------------------------------- instruments

_ks_cache: dict = {}


def pluck(freq, dur=2.2, bright=0.5, decay=0.996, seed=1):
    """Karplus-Strong plucked string (lyre/kithara-like)."""
    key = (round(freq, 2), round(dur, 2), round(bright, 2), round(decay, 4), seed)
    if key in _ks_cache:
        return _ks_cache[key]
    rng = np.random.default_rng(seed)
    n = secs(dur)
    period = max(2, int(round(SR / freq)))
    exc = rng.uniform(-1, 1, period)
    exc = lowpass(exc, 800 + bright * 6000)
    exc -= exc.mean()  # no DC: it would ring for the whole note
    y = np.zeros(n + period + 1)
    y[1:period + 1] = exc
    c = 0.5 * decay
    k = period + 1
    while k < len(y):
        e = min(k + period, len(y))
        y[k:e] = c * (y[k - period:e - period] + y[k - period - 1:e - period - 1])
        k = e
    out = y[1:n + 1]
    out = out + 0.3 * bandpass(out, freq * 0.9, min(freq * 4, 9000))  # body resonance
    out = fade(out, 0.001, 0.05)
    out /= np.max(np.abs(out)) + 1e-12
    _ks_cache[key] = out
    return out


def pad_note(freq, dur, bright=0.5, seed=0, attack=0.6, release=1.2, detune=6):
    n = secs(dur + release)
    t = tvec(n)
    rng = np.random.default_rng(seed)
    sig = np.zeros(n)
    for voice in range(3):
        cents = (voice - 1) * detune + rng.uniform(-1, 1)
        f = freq * 2 ** (cents / 1200)
        ph = rng.uniform(0, 2 * np.pi)
        for k in range(1, 9):
            if f * k > 9000:
                break
            sig += (1 / k ** (1.6 - bright * 0.6)) * np.sin(2 * np.pi * f * k * t + ph * k)
    env = adsr(n, attack, 0.3, 0.8, release)
    sig = lowpass(sig * env, 1200 + bright * 3000)
    return sig / 6


def flute_note(freq, dur, seed=0, vib=0.15, breath=0.05):
    n = secs(dur + 0.25)
    t = tvec(n)
    rng = np.random.default_rng(seed)
    vdepth = np.clip((t - 0.25) / 0.4, 0, 1) * vib / 100  # cents -> ratio fraction
    phase = 2 * np.pi * np.cumsum(freq * (1 + vdepth * np.sin(2 * np.pi * 5.2 * t))) / SR
    sig = np.sin(phase) + 0.22 * np.sin(2 * phase) + 0.08 * np.sin(3 * phase)
    sig += breath * bandpass(white(rng, n), freq * 1.5, min(freq * 4, 12000))
    env = adsr(n, 0.07, 0.1, 0.85, 0.22)
    return sig * env * 0.5


def horn_note(freq, dur, seed=0, bright=0.55, attack=0.05):
    n = secs(dur + 0.3)
    t = tvec(n)
    env = adsr(n, attack, 0.15, 0.8, 0.3)
    b = 0.25 + bright * 0.55 * np.clip(env * 1.2, 0, 1)
    sig = np.zeros(n)
    for k in range(1, 14):
        if freq * k > 8000:
            break
        sig += (1 / k) * (b ** (k - 1)) * np.sin(2 * np.pi * freq * k * t)
    sig = lowpass(sig, 2600)
    return sig * env * 0.45


def bell(freq, dur=2.0, bright=1.0, seed=0):
    n = secs(dur)
    t = tvec(n)
    ratios = [(0.5, 0.35, 1.8), (1.0, 1.0, 1.0), (2.0, 0.6, 0.7), (2.76, 0.45, 0.5), (5.4, 0.25 * bright, 0.25), (8.93, 0.12 * bright, 0.12)]
    sig = np.zeros(n)
    for r, a, tau in ratios:
        if freq * r > 14000:
            continue
        sig += a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / (tau * dur * 0.6))
    return fade(sig * 0.35, 0.002, 0.05)


def chime(freq, dur=0.6):
    n = secs(dur)
    t = tvec(n)
    sig = np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur * 0.35)) + 0.3 * np.sin(2 * np.pi * freq * 2.01 * t) * np.exp(-t / (dur * 0.18))
    return fade(sig * 0.5, 0.002, 0.03)


def frame_drum(rng, f0=95, dur=0.5, tone=1.0, slap=0.5):
    n = secs(dur)
    t = tvec(n)
    f = f0 * (1 + 0.8 * np.exp(-t / 0.02))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * tone
    skin = bandpass(white(rng, n), 180, 1800) * np.exp(-t / 0.04) * slap
    return fade(body + skin, 0.0005, 0.02) * 0.8


def thump(rng, f0=70, dur=0.35, noise=0.4):
    n = secs(dur)
    t = tvec(n)
    f = f0 * (1 + 1.5 * np.exp(-t / 0.015))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * 0.3))
    nz = lowpass(white(rng, n), 1500) * np.exp(-t / 0.03) * noise
    return fade(body + nz, 0.0005, 0.02)


def metal(rng, f0=520, dur=0.4, amount=1.0):
    n = secs(dur)
    t = tvec(n)
    sig = np.zeros(n)
    for r, a in ((1, 1), (1.47, 0.7), (2.09, 0.55), (2.56, 0.4), (3.61, 0.3), (4.9, 0.2)):
        sig += a * np.sin(2 * np.pi * f0 * r * t + rng.uniform(0, 6)) * np.exp(-t / (dur * rng.uniform(0.18, 0.35)))
    return fade(sig * 0.25 * amount, 0.0005, 0.02)


def whoosh(rng, dur=0.3, lo=300, hi=2500, up=True, amount=1.0):
    n = secs(dur)
    t = tvec(n)
    sig = np.zeros(n)
    bands = np.geomspace(lo, hi, 6)
    for i, fc in enumerate(bands):
        centre = (i + 0.5) / len(bands)
        if not up:
            centre = 1 - centre
        env = np.exp(-((t / dur - centre) ** 2) / 0.03)
        sig += bandpass(white(rng, n), fc * 0.8, fc * 1.25) * env
    return fade(sig * 0.5 * amount, 0.005, 0.03)


def crackle(rng, dur, rate=40, amount=1.0):
    n = secs(dur)
    sig = np.zeros(n)
    for _ in range(int(rate * dur)):
        at = rng.integers(0, n)
        k = secs(rng.uniform(0.002, 0.012))
        burst = highpass(white(rng, k), 1500) * np.exp(-tvec(k) / 0.003) * rng.uniform(0.2, 1)
        place(sig, burst, at)
    return sig * amount


def reed_note(freq, dur, seed=0):
    """A nasal double reed (ney / mizmar-like): odd-heavy harmonics, late vibrato, a little breath."""
    n = secs(dur + 0.2)
    t = tvec(n)
    rng = np.random.default_rng(seed)
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5.4 * t) * np.clip((t - 0.15) / 0.3, 0, 1)
    ph = 2 * np.pi * np.cumsum(freq * vib) / SR
    sig = np.zeros(n)
    for k in range(1, 11):
        if freq * k > 9000:
            break
        sig += (1 / k) * (0.9 if k % 2 else 0.5) * np.sin(k * ph)
    sig = bandpass(sig, freq * 0.9, min(freq * 6, 9000)) + 0.05 * bandpass(white(rng, n), freq * 2, min(freq * 5, 12000))
    return sig * adsr(n, 0.05, 0.1, 0.85, 0.18) * 0.42


def shaku_note(freq, dur, seed=0):
    """A breathy bamboo flute that bends up into each note."""
    n = secs(dur + 0.3)
    t = tvec(n)
    rng = np.random.default_rng(seed)
    f = freq * (1 - 0.035 * np.exp(-t / 0.12)) * (1 + 0.003 * np.sin(2 * np.pi * 4.2 * t) * np.clip((t - 0.4) / 0.5, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.12 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    breath = bandpass(white(rng, n), freq * 1.2, min(freq * 5, 12000)) * (0.22 + 0.18 * np.exp(-t / 0.15))
    return (sig + breath) * adsr(n, 0.12, 0.1, 0.8, 0.28) * 0.5


def whistle_note(freq, dur, seed=0):
    """A tin whistle an octave up, with a quick cut (grace note) at the start."""
    n = secs(dur + 0.2)
    t = tvec(n)
    rng = np.random.default_rng(seed)
    f = np.where(t < 0.045, freq * 2 * 2 ** (2 / 12), freq * 2) * (1 + 0.0025 * np.sin(2 * np.pi * 5.8 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.04 * np.sin(3 * ph) + 0.03 * bandpass(white(rng, n), freq * 3, min(freq * 8, 14000))
    return sig * adsr(n, 0.02, 0.08, 0.8, 0.12) * 0.32


def ocarina_note(freq, dur, seed=0):
    """A clay vessel flute: nearly pure, soft attack, airy."""
    n = secs(dur + 0.25)
    t = tvec(n)
    rng = np.random.default_rng(seed)
    ph = 2 * np.pi * np.cumsum(freq * (1 + 0.002 * np.sin(2 * np.pi * 4.8 * t))) / SR
    sig = np.sin(ph) + 0.06 * np.sin(2 * ph) + 0.06 * bandpass(white(rng, n), freq, min(freq * 3, 12000))
    return sig * adsr(n, 0.06, 0.1, 0.85, 0.2) * 0.5


LEADS = {'reed': reed_note, 'shaku': shaku_note, 'whistle': whistle_note, 'ocarina': ocarina_note}


def wood(freq, dur=0.35, seed=0):
    """A slit-drum / wood-block tone (teponaztli-like)."""
    n = secs(dur)
    t = tvec(n)
    rng = np.random.default_rng(seed)
    sig = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.07) + 0.4 * np.sin(2 * np.pi * freq * 2.7 * t) * np.exp(-t / 0.025)
    sig += bandpass(white(rng, n), 1500, 5000) * np.exp(-t / 0.004) * 0.3
    return fade(sig * 0.6, 0.0005, 0.02)


# --------------------------------------------------------------------------- music


MODES = {
    'ionian': [0, 2, 4, 5, 7, 9, 11],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'aeolian': [0, 2, 3, 5, 7, 8, 10],
    # Added for the campaign soundscapes (2026-10-03).
    'hijaz': [0, 1, 4, 5, 7, 8, 10],
    'miyako': [0, 1, 5, 7, 8],
    'minpent': [0, 3, 5, 7, 10],
}


@dataclass
class Track:
    name: str
    root: int  # midi of tonic (octave 3)
    mode: str
    bpm: float
    beats: int  # beats per bar
    bars: int
    chords: list  # scale degrees (0-based) per bar, cycled
    seed: int
    lyre: str = 'arp'  # 'arp' | 'ostinato' | 'sparse' | 'none'
    lead: str = 'flute'  # 'flute' | 'horn' | 'none'
    lead_from: int = 4  # bar where the lead enters
    drums: str = 'none'  # 'none' | 'soft' | 'march' | 'battle' | 'storm'
    drone: bool = False
    pad_bright: float = 0.4
    wet: float = 0.35
    level_db: float = -20.0


def scale_note(tr: Track, degree: int, octave: int = 0) -> int:
    iv = MODES[tr.mode]
    o, d = divmod(degree, len(iv))
    return tr.root + iv[d] + 12 * (o + octave)


def chord_notes(tr: Track, degree: int) -> list:
    return [scale_note(tr, degree), scale_note(tr, degree + 2), scale_note(tr, degree + 4)]


def compose_melody(tr: Track, rng) -> list:
    """(bar, beat, duration_beats, midi) notes; motif-based, stepwise, chord tones on strong beats."""
    rhythms = {
        4: [[2, 1, 1], [1, 1, 2], [3, 1], [1, 1, 1, 1], [2, 2], [1.5, 0.5, 2], [4]],
        3: [[2, 1], [1, 1, 1], [1.5, 0.5, 1], [3], [1, 2]],
    }[tr.beats]
    notes = []
    motifs = []
    for _ in range(2):
        motifs.append([rhythms[i] for i in rng.integers(0, len(rhythms), 2)])
    N = len(MODES[tr.mode])  # notes per octave (7, or 5 for the pentatonic modes)
    top = 9 if N == 7 else 6
    deg = N + (4 if N == 7 else 3)  # start on the fifth above the tonic (octave 4)
    for bar in range(tr.lead_from, tr.bars):
        phrase_pos = (bar - tr.lead_from) % 4
        if phrase_pos == 3 and rng.random() < 0.6:
            rhythm = [tr.beats] if rng.random() < 0.5 else [tr.beats - 1, 1]
        else:
            m = motifs[((bar - tr.lead_from) // 4) % 2]
            rhythm = m[phrase_pos % 2]
        chord = chord_notes(tr, tr.chords[bar % len(tr.chords)])
        beat = 0.0
        for i, r in enumerate(rhythm):
            if i == 0 or r >= 2:
                # Chord tone nearest the current degree (in the melody octave).
                target = min(range(deg - 3, deg + 4), key=lambda d: (min(abs((scale_note(tr, d, 1) - c) % 12) for c in chord), abs(d - deg)))
                deg = target
            else:
                deg += int(rng.choice([-1, 1, -1, 1, 2, -2]))
            deg = int(np.clip(deg, N, N + top))
            if phrase_pos == 3 and i == len(rhythm) - 1 and (bar - tr.lead_from) % 8 == 7:
                deg = N  # resolve to the tonic at the end of each 8-bar period
            notes.append((bar, beat, r, scale_note(tr, deg, 1)))
            beat += r
    return notes


def render_track(tr: Track) -> np.ndarray:
    rng = np.random.default_rng(tr.seed)
    beat_s = 60.0 / tr.bpm
    bar_s = beat_s * tr.beats
    L = secs(bar_s * tr.bars)
    T = secs(6.0)
    buf = np.zeros((2, L + T))

    # Pads / drone
    for bar in range(tr.bars):
        deg = tr.chords[bar % len(tr.chords)]
        at = secs(bar * bar_s)
        for i, m in enumerate(chord_notes(tr, deg)):
            sig = pad_note(midi_hz(m), bar_s * 1.02, bright=tr.pad_bright, seed=tr.seed + bar * 7 + i, attack=min(0.8, bar_s * 0.35), release=1.4)
            place(buf, pan(sig * 0.22, (i - 1) * 0.35), at)
        if tr.drone:
            d = pad_note(midi_hz(tr.root - 12), bar_s * 1.02, bright=0.2, seed=tr.seed + 999 + bar, attack=0.9, release=1.6, detune=3)
            place(buf, pan(d * 0.28, 0), at)
            d5 = pad_note(midi_hz(tr.root - 5), bar_s * 1.02, bright=0.2, seed=tr.seed + 1999 + bar, attack=0.9, release=1.6, detune=3)
            place(buf, pan(d5 * 0.16, 0.1), at)

    # Lyre
    for bar in range(tr.bars):
        deg = tr.chords[bar % len(tr.chords)]
        ch = chord_notes(tr, deg)
        if tr.lyre == 'arp':
            pattern = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]] if tr.beats == 3 else [ch[0], ch[2], ch[1] + 12, ch[2], ch[0] + 12, ch[2], ch[1] + 12, ch[2]]
            step = bar_s / len(pattern)
            for i, m in enumerate(pattern):
                s = pluck(midi_hz(m), 2.0, bright=0.45, seed=m)
                vel = 0.55 + 0.2 * (i % (3 if tr.beats == 3 else 4) == 0)
                place(buf, pan(s * vel * 0.3, -0.3 + 0.1 * (i % 3)), secs(bar * bar_s + i * step) + rng.integers(0, 60))
        elif tr.lyre == 'ostinato':
            pattern = [ch[0] - 12, ch[0], ch[0] - 12, ch[1], ch[0] - 12, ch[0], ch[0] - 12, ch[2]]
            step = bar_s / len(pattern)
            for i, m in enumerate(pattern):
                s = pluck(midi_hz(m), 1.2, bright=0.6, decay=0.993, seed=m + 3)
                place(buf, pan(s * (0.7 if i % 2 == 0 else 0.45) * 0.3, -0.15), secs(bar * bar_s + i * step))
        elif tr.lyre == 'sparse':
            for i, m in enumerate([ch[0], ch[2] + 12] if bar % 2 == 0 else [ch[1] + 12]):
                s = pluck(midi_hz(m), 2.6, bright=0.35, seed=m + 5)
                place(buf, pan(s * 0.35, 0.3 - 0.4 * i), secs(bar * bar_s + i * bar_s * 0.5) + rng.integers(0, 200))
        elif tr.lyre == 'koto':
            # A plucked zither: a few bright notes at uneven places in the bar.
            for frac, m, v in ((0.0, ch[0], 0.5), (0.375, ch[2], 0.35), (0.625, ch[0] + 12, 0.3), (0.875, ch[1] + 12, 0.25) if bar % 2 else (0.75, ch[2] + 12, 0.25)):
                s = pluck(midi_hz(m), 1.8, bright=0.85, decay=0.9945, seed=m + 9)
                place(buf, pan(s * v * 0.6, -0.25 + frac * 0.5), secs(bar * bar_s + frac * bar_s))
        elif tr.lyre == 'harp':
            # A bright harp rolling up and down the chord.
            pattern = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]] if tr.beats == 3 else [ch[0], ch[1], ch[2], ch[0] + 12, ch[1] + 12, ch[0] + 12, ch[2], ch[1]]
            step = bar_s / len(pattern)
            for i, m in enumerate(pattern):
                s = pluck(midi_hz(m), 1.9, bright=0.75, decay=0.995, seed=m + 13)
                place(buf, pan(s * (0.6 if i == 0 else 0.42) * 0.32, -0.35 + 0.12 * (i % 4)), secs(bar * bar_s + i * step))

    # Lead
    if tr.lead != 'none':
        for bar, beat, dur, m in compose_melody(tr, rng):
            at = secs(bar * bar_s + beat * beat_s)
            d = dur * beat_s * 0.95
            if tr.lead == 'flute':
                sig = flute_note(midi_hz(m), d, seed=m + bar)
            elif tr.lead == 'horn':
                sig = horn_note(midi_hz(m - 12), d, seed=m + bar)
            else:
                sig = LEADS[tr.lead](midi_hz(m - (12 if tr.lead == 'reed' else 0)), d, seed=m + bar)
            place(buf, pan(sig * (0.4 if tr.lead == 'horn' else 0.34), 0.15), at)

    # Drums
    if tr.drums != 'none':
        for bar in range(tr.bars):
            base = bar * bar_s
            if tr.drums == 'soft':
                hits = [(0, 1.0, 90), (2, 0.6, 110)] if tr.beats == 4 else [(0, 1.0, 90)]
            elif tr.drums == 'march':
                hits = [(0, 1.0, 85), (1.5, 0.45, 120), (2, 0.8, 95), (3, 0.5, 120), (3.5, 0.4, 120)]
            elif tr.drums == 'storm':
                hits = [(0, 1.0, 70), (0.75, 0.4, 100), (2, 0.8, 75), (3.5, 0.5, 95)]
            elif tr.drums in NEW_DRUMS:
                for b, v, kind in NEW_DRUMS[tr.drums]:
                    if b >= tr.beats:
                        continue
                    if kind == 'lo' or kind == 'hi':
                        d = wood(330 if kind == 'lo' else 440, seed=bar * 7 + int(b * 4))
                    elif kind == 'tek':
                        d = frame_drum(rng, f0=320, dur=0.18, tone=0.3, slap=1.0)
                    elif kind == 'taiko':
                        d = frame_drum(rng, f0=52, dur=1.1, tone=1.3, slap=0.25)
                    else:
                        d = frame_drum(rng, f0=kind, dur=0.5, slap=0.35 if kind < 100 else 0.7)
                    place(buf, pan(d * v * 0.5, 0.15 if kind in ('hi', 'tek') else -0.1), secs(base + b * beat_s))
                continue
            else:  # battle
                hits = [(0, 1.0, 72), (0.5, 0.35, 150), (1, 0.6, 110), (1.5, 0.35, 150), (2, 0.9, 80), (2.5, 0.35, 150), (3, 0.6, 110), (3.25, 0.3, 150), (3.5, 0.5, 120)]
            for b, v, f in hits:
                if b >= tr.beats:
                    continue
                d = frame_drum(rng, f0=f, dur=0.45, slap=0.35 if f < 100 else 0.7)
                place(buf, pan(d * v * 0.5, -0.1 if f < 100 else 0.2), secs(base + b * beat_s))

    buf = reverb(buf, wet=tr.wet, size=1.2)
    buf[:, :T] += buf[:, L:L + T]  # wrap the tail: the loop is seamless
    out = buf[:, :L]
    out = rms_to(out, tr.level_db)
    out = soft_limit(out, 1.2)
    return normalize(out, min(0.89, np.max(np.abs(out))))


# Drum patterns for the campaign soundscapes: (beat, velocity, voice); voice = Hz of a frame drum, or 'lo'/'hi' wood, 'tek', 'taiko'.
NEW_DRUMS = {
    'darbuka': [(0, 1.0, 85), (1, 0.5, 'tek'), (1.5, 0.4, 'tek'), (2, 0.8, 90), (3, 0.5, 'tek'), (3.5, 0.45, 'tek')],
    'taiko': [(0, 0.9, 'taiko'), (2.5, 0.5, 'taiko')],
    'log': [(0, 1.0, 'lo'), (0.75, 0.6, 'hi'), (1.5, 0.7, 'lo'), (2, 0.8, 'hi'), (3, 0.6, 'lo'), (3.5, 0.5, 'hi')],
    'bodhran': [(0, 1.0, 105), (0.5, 0.35, 130), (1, 0.5, 120), (1.5, 0.8, 105), (2, 0.35, 130), (2.5, 0.5, 120)],
    'deep': [(0, 0.9, 58), (2, 0.45, 64)],
}

TRACKS = [
    Track('music_menu', root=50, mode='dorian', bpm=70, beats=4, bars=16, chords=[0, 6, 3, 0, 0, 4, 6, 3], seed=11, lyre='arp', lead='flute', lead_from=4, drums='soft', pad_bright=0.35, wet=0.4),
    Track('music_battle', root=52, mode='phrygian', bpm=112, beats=4, bars=16, chords=[0, 1, 0, 6, 0, 1, 3, 4], seed=51, lyre='ostinato', lead='horn', lead_from=4, drums='battle', pad_bright=0.45, wet=0.3, level_db=-19.0),
    Track('music_resolution', root=55, mode='ionian', bpm=68, beats=4, bars=12, chords=[0, 3, 4, 0, 5, 3, 1, 4, 0, 3, 4, 0], seed=61, lyre='arp', lead='flute', lead_from=2, drums='none', pad_bright=0.45, wet=0.45),
]

# --------------------------------------------------------------------------- stingers


def stinger_victory():
    rng = np.random.default_rng(71)
    n = secs(4.2)
    buf = np.zeros((2, n))
    notes = [(0.0, 60, 0.28), (0.3, 64, 0.28), (0.6, 67, 0.28), (0.9, 72, 1.8)]
    for at, m, d in notes:
        place(buf, pan(horn_note(midi_hz(m - 12), d, bright=0.7), -0.1), secs(at))
        place(buf, pan(horn_note(midi_hz(m - 5), d, bright=0.5) * 0.5, 0.2), secs(at))
    for i, m in enumerate([48, 55, 60, 64, 67]):
        place(buf, pan(pad_note(midi_hz(m), 2.2, bright=0.5, seed=i, attack=0.2, release=1.2) * 0.25, (i - 2) * 0.2), secs(0.9))
    for at in (0.0, 0.9):
        place(buf, pan(frame_drum(rng, 70, 0.8, slap=0.3) * 0.8, 0), secs(at))
    for i, m in enumerate([72, 76, 79, 84]):
        place(buf, pan(pluck(midi_hz(m), 2.0, bright=0.6, seed=m) * 0.25, 0.3), secs(0.95 + i * 0.07))
    out = reverb(buf, wet=0.35, size=1.3)
    return normalize(soft_limit(out, 1.3), 0.85)


def stinger_defeat():
    n = secs(4.5)
    buf = np.zeros((2, n))
    for at, m, d in [(0.0, 57, 0.8), (0.8, 53, 0.8), (1.6, 50, 2.2)]:
        place(buf, pan(horn_note(midi_hz(m - 12), d, bright=0.3, attack=0.12) * 0.8, 0), secs(at))
    for i, m in enumerate([38, 45, 50, 53]):
        place(buf, pan(pad_note(midi_hz(m), 3.0, bright=0.15, seed=i + 10, attack=0.8, release=1.3) * 0.3, (i - 1.5) * 0.2), secs(0.6))
    rng = np.random.default_rng(72)
    place(buf, pan(frame_drum(rng, 60, 1.2, slap=0.15), 0), secs(1.6))
    out = reverb(buf, wet=0.4, size=1.4)
    return normalize(soft_limit(out, 1.2), 0.8)


def stinger_levelup():
    n = secs(2.8)
    buf = np.zeros((2, n))
    seq = [62, 66, 69, 74, 78, 81, 86]
    for i, m in enumerate(seq):
        place(buf, pan(pluck(midi_hz(m), 1.8, bright=0.7, seed=m) * 0.45, -0.4 + i * 0.13), secs(i * 0.07))
    for i, m in enumerate([86, 90, 93]):
        place(buf, pan(chime(midi_hz(m), 1.4) * 0.35, 0.3), secs(0.5 + i * 0.05))
    for i, m in enumerate([62, 66, 69]):
        place(buf, pan(pad_note(midi_hz(m), 1.2, bright=0.6, seed=i + 20, attack=0.1, release=1.0) * 0.2, 0), secs(0.45))
    out = reverb(buf, wet=0.4, size=1.1)
    return normalize(out, 0.8)


def stinger_beacon():
    rng = np.random.default_rng(74)
    n = secs(5.0)
    buf = np.zeros((2, n))
    # A low swell that blooms into a bright major chord, with fire.
    swell = pad_note(midi_hz(43), 2.8, bright=0.2, seed=40, attack=1.6, release=1.6)
    place(buf, pan(swell * 0.45, 0), 0)
    for i, m in enumerate([55, 59, 62, 67, 71, 74]):
        place(buf, pan(pad_note(midi_hz(m), 2.4, bright=0.6, seed=41 + i, attack=0.15, release=1.6) * 0.22, (i - 2.5) * 0.18), secs(1.6))
    for i, m in enumerate([79, 83, 86, 91]):
        place(buf, pan(chime(midi_hz(m), 1.8) * 0.28, 0.35 - i * 0.2), secs(1.62 + i * 0.09))
    fire = lowpass(crackle(rng, 3.4, rate=55), 6000) * 0.25 + bandpass(white(rng, secs(3.4)), 300, 1800) * 0.03
    fire *= adsr(secs(3.4), 0.3, 0.3, 0.9, 1.2)
    place(buf, np.vstack([fire, np.roll(fire, 400)]), secs(1.5))
    place(buf, pan(frame_drum(rng, 55, 1.4, slap=0.2) * 0.7, 0), secs(1.6))
    out = reverb(buf, wet=0.4, size=1.5)
    return normalize(soft_limit(out, 1.2), 0.85)


# --------------------------------------------------------------------------- ambience


def seamless_noise_loop(render, dur, xfade=2.0):
    """render(n) -> 2 x n; returns a loop of `dur` s with an equal-power crossfade seam."""
    L, X = secs(dur), secs(xfade)
    x = render(L + X)
    a = np.sin(np.linspace(0, np.pi / 2, X))
    head = x[:, :X] * a + x[:, L:L + X] * np.cos(np.linspace(0, np.pi / 2, X))
    out = x[:, :L].copy()
    out[:, :X] = head
    return out


def lfo(n, rate, rng, lo=0.0, hi=1.0):
    t = tvec(n)
    ph = rng.uniform(0, 2 * np.pi)
    s = 0.5 + 0.5 * np.sin(2 * np.pi * rate * t + ph) * 0.7 + 0.15 * np.sin(2 * np.pi * rate * 2.7 * t + ph * 2)
    return lo + (hi - lo) * np.clip(s, 0, 1)


def wind(rng, n, strength=1.0, bands=(250, 550, 1100, 2200)):
    out = np.zeros((2, n))
    for ch in range(2):
        for i, fc in enumerate(bands):
            g = lfo(n, rng.uniform(0.03, 0.09), rng, 0.1, 1.0) ** 2
            out[ch] += bandpass(pink(rng, n), fc * 0.7, fc * 1.4) * g * (0.8 ** i)
    return out * strength


def amb_coast():
    rng = np.random.default_rng(81)

    def r(n):
        out = wind(rng, n, 0.25)
        t = tvec(n)
        # Waves: slow asymmetric swells of filtered pink noise, left and right out of step.
        for ch, off in ((0, 0.0), (1, 3.1)):
            env = np.zeros(n)
            at = off
            while at < n / SR:
                period = rng.uniform(6.5, 9.5)
                rise, fall = period * 0.35, period * 0.65
                k0, k1, k2 = secs(at), secs(at + rise), secs(at + period)
                k1, k2 = min(k1, n), min(k2, n)
                if k1 > k0:
                    env[k0:k1] = np.maximum(env[k0:k1], np.linspace(0, 1, k1 - k0) ** 1.5)
                if k2 > k1:
                    env[k1:k2] = np.maximum(env[k1:k2], np.linspace(1, 0, k2 - k1) ** 0.8)
                at += period
            surf = bandpass(pink(rng, n), 180, 2400) * env + lowpass(brown(rng, n), 250) * (0.4 + 0.6 * env) * 0.6
            out[ch] += surf
        return out

    return rms_to(seamless_noise_loop(r, 28.0, 3.0), -26)


def amb_high_pass():
    rng = np.random.default_rng(82)

    def r(n):
        w = wind(rng, n, 1.0, bands=(320, 700, 1500, 3000))
        gust = lfo(n, 0.05, rng, 0.2, 1.0) ** 3
        w += wind(rng, n, 0.6, bands=(900, 1800)) * gust
        return w

    return rms_to(seamless_noise_loop(r, 26.0, 3.0), -27)


def amb_storm_plateau():
    rng = np.random.default_rng(83)

    def r(n):
        w = wind(rng, n, 1.0, bands=(200, 450, 900, 1800)) * 1.1
        # Two distant thunder rolls per loop (low, soft-edged: never a sharp crack).
        for at in (5.0, 17.5):
            k = secs(rng.uniform(4.0, 5.5))
            env = adsr(k, 0.35, 0.8, 0.5, 2.5) * (0.6 + 0.4 * lfo(k, 1.3, rng))
            roll = lowpass(brown(rng, k), 160) * env * 2.2
            place(w, np.vstack([roll, np.roll(roll, 900)]), secs(at))
        return w

    return rms_to(seamless_noise_loop(r, 30.0, 3.0), -25)


def amb_battlefield():
    rng = np.random.default_rng(84)

    def r(n):
        w = wind(rng, n, 0.8, bands=(220, 480, 950))
        hum = lowpass(brown(rng, n), 180) * 0.5
        return w + np.vstack([hum, np.roll(hum, 700)])

    return rms_to(seamless_noise_loop(r, 24.0, 3.0), -29)


# Campaign soundscapes (2026-10-03) -------------------------------------------------


def chirp(f0, f1, dur, shape=1.0):
    """A short pitch sweep with a soft envelope (birds, frogs, bubbles)."""
    n = secs(dur)
    t = tvec(n)
    f = f0 + (f1 - f0) * (t / dur) ** shape
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 2


def amb_fjord():
    rng = np.random.default_rng(85)

    def r(n):
        out = wind(rng, n, 0.8, bands=(380, 820, 1700, 3400))
        # Slow, deep water against rock, left and right out of step.
        for ch, rate in ((0, 0.11), (1, 0.085)):
            env = lfo(n, rate, rng, 0.0, 1.0) ** 2
            out[ch] += lowpass(brown(rng, n), 300) * (0.3 + 0.7 * env) * 0.7 + bandpass(pink(rng, n), 300, 1400) * env * 0.25
        # A far, low creak of ice or timber now and then.
        for at in rng.uniform(2, n / SR - 3, 3):
            k = secs(1.2)
            f = 70 + 25 * np.sin(np.linspace(0, 3, k))
            creak = np.sin(2 * np.pi * np.cumsum(f) / SR) * bandpass(white(rng, k), 100, 600) * np.sin(np.pi * tvec(k) / 1.2) ** 2 * 0.5
            place(out, np.vstack([creak, np.roll(creak, 300) * 0.7]), secs(at))
        return out

    return rms_to(seamless_noise_loop(r, 28.0, 3.0), -25)


def amb_desert():
    rng = np.random.default_rng(86)

    def r(n):
        out = wind(rng, n, 0.55, bands=(600, 1400, 3000, 6000))
        # Drifting sand: a fine, high hiss in gusts.
        gust = lfo(n, 0.07, rng, 0.0, 1.0) ** 3
        for ch in range(2):
            out[ch] += highpass(white(rng, n), 5000) * gust * 0.12 + lowpass(crackle(rng, n / SR, rate=25, amount=0.25), 9000) * gust
            # The river beyond the dunes: a slow, low flow.
            out[ch] += bandpass(brown(rng, n), 120, 700) * 0.35
        return out

    return rms_to(seamless_noise_loop(r, 26.0, 3.0), -26)


def amb_shrine():
    rng = np.random.default_rng(87)

    def r(n):
        out = wind(rng, n, 0.35, bands=(300, 700, 1500))
        # A thin stream through bamboo pipes.
        for ch in range(2):
            out[ch] += bandpass(white(rng, n), 1200, 5200) * (0.04 + 0.03 * lfo(n, 0.9, rng)) + lowpass(brown(rng, n), 400) * 0.15
        # Wind chimes in the eaves, and once a far temple bell.
        for at in np.sort(rng.uniform(1, n / SR - 2, 7)):
            for j in range(rng.integers(1, 4)):
                c = chime(midi_hz(int(rng.choice([86, 89, 91, 93, 96]))), 1.4) * 0.07
                place(out, pan(c, rng.uniform(-0.6, 0.6)), secs(at + j * 0.11))
        place(out, pan(bell(midi_hz(43), 7.0, bright=0.4) * 0.35, -0.2), secs(n / SR * 0.35))
        # The bamboo fountain's knock.
        place(out, pan(wood(560, 0.3, seed=5) * 0.25, 0.4), secs(n / SR * 0.7))
        return out

    return rms_to(seamless_noise_loop(r, 30.0, 3.0), -26)


def amb_glen():
    rng = np.random.default_rng(88)

    def r(n):
        out = wind(rng, n, 0.3, bands=(500, 1100, 2400))
        # Leaves fluttering, and a stream over stones.
        for ch in range(2):
            flutter = 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rng.uniform(5, 11, n)) / SR)
            out[ch] += bandpass(pink(rng, n), 1500, 5000) * flutter * lfo(n, 0.05, rng, 0.05, 0.25)
            babble = bandpass(white(rng, n), 500, 2600) * (0.4 + 0.6 * lfo(n, 2.3, rng)) * 0.12
            out[ch] += babble + lowpass(brown(rng, n), 350) * 0.12
        # Songbirds in the trees.
        for at in np.sort(rng.uniform(1, n / SR - 1.5, 9)):
            notes = rng.integers(2, 5)
            p = rng.uniform(-0.7, 0.7)
            base = rng.uniform(2600, 4200)
            for j in range(notes):
                place(out, pan(chirp(base * rng.uniform(0.9, 1.15), base * rng.uniform(1.1, 1.5), rng.uniform(0.05, 0.11)) * 0.05, p), secs(at + j * rng.uniform(0.08, 0.16)))
        return out

    return rms_to(seamless_noise_loop(r, 28.0, 3.0), -26)


def amb_jungle():
    rng = np.random.default_rng(89)

    def r(n):
        out = np.zeros((2, n))
        t = tvec(n)
        for ch in range(2):
            # Insects: a high buzz that swells and fades.
            buzz = bandpass(white(rng, n), 4200, 7500) * (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(38, 52) * t)) * lfo(n, 0.12, rng, 0.2, 1.0)
            out[ch] += buzz * 0.18 + lowpass(brown(rng, n), 300) * 0.25 + bandpass(pink(rng, n), 400, 1800) * 0.08
        # Frogs, far calls and drips.
        for at in rng.uniform(0.5, n / SR - 1, 26):
            k = secs(0.06)
            frog = np.sin(2 * np.pi * rng.uniform(180, 320) * tvec(k)) * np.sin(np.pi * tvec(k) / 0.06) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * tvec(k))))
            place(out, pan(frog * 0.12, rng.uniform(-0.8, 0.8)), secs(at))
        for at in rng.uniform(1, n / SR - 2, 5):
            f0 = rng.uniform(900, 1500)
            call = mix(chirp(f0, f0 * 1.6, 0.18, 0.6), np.zeros(secs(0.05)))
            p = rng.uniform(-0.8, 0.8)
            place(out, pan(call * 0.06, p), secs(at))
            place(out, pan(chirp(f0 * 1.5, f0 * 0.9, 0.22) * 0.05, p), secs(at + 0.25))
        for at in rng.uniform(0.5, n / SR - 0.5, 18):
            place(out, pan(chirp(rng.uniform(900, 1400), rng.uniform(1800, 2600), 0.03, 0.5) * 0.05, rng.uniform(-0.6, 0.6)), secs(at))
        return out

    return rms_to(seamless_noise_loop(r, 28.0, 3.0), -25)


# --------------------------------------------------------------------------- effects


def sfx_click(rng):
    n = secs(0.07)
    t = tvec(n)
    tick = bandpass(white(rng, n), 1800, 4200) * np.exp(-t / 0.004) * 0.8
    tone = np.sin(2 * np.pi * 1250 * t) * np.exp(-t / 0.012) * 0.35
    return fade(tick + tone, 0.0003, 0.01)


def sfx_open(rng):
    return mix(whoosh(rng, 0.24, 400, 3000, True, 0.6), chime(midi_hz(79), 0.25) * 0.08)


def sfx_close(rng):
    return whoosh(rng, 0.2, 300, 2400, False, 0.55)


def sfx_confirm(rng):
    n = secs(0.8)
    out = np.zeros(n)
    place(out, chime(midi_hz(76), 0.6), 0)
    place(out, chime(midi_hz(83), 0.7), secs(0.09))
    return out * 0.8


def sfx_error(rng):
    n = secs(0.36)
    out = np.zeros(n)
    for i, f in enumerate((240, 185)):
        k = secs(0.14)
        t = tvec(k)
        s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)) * np.exp(-t / 0.05)
        place(out, lowpass(s, 1200), secs(i * 0.13))
    return fade(out, 0.001, 0.02) * 0.8


def sfx_coins(rng):
    n = secs(0.6)
    out = np.zeros(n)
    for i in range(6):
        f = rng.uniform(2300, 3600)
        k = secs(0.22)
        t = tvec(k)
        s = sum(a * np.sin(2 * np.pi * f * r * t) for r, a in ((1, 1), (1.52, 0.5), (2.3, 0.3))) * np.exp(-t / 0.05)
        place(out, s * rng.uniform(0.3, 0.7), secs(i * 0.05 + rng.uniform(0, 0.03)))
    return fade(out * 0.5, 0.001, 0.05)


def sfx_build(rng):
    n = secs(0.9)
    out = np.zeros(n)
    for i in range(3):
        k = secs(0.2)
        t = tvec(k)
        knock = np.sin(2 * np.pi * rng.uniform(170, 210) * t) * np.exp(-t / 0.035) + bandpass(white(rng, k), 700, 2600) * np.exp(-t / 0.018) * 0.7
        place(out, knock * (1 - 0.15 * i), secs(i * 0.24))
    return fade(out * 0.7, 0.0005, 0.05)


def sfx_recruit(rng):
    n = secs(1.3)
    out = np.zeros(n)
    place(out, frame_drum(rng, 85, 0.5) * 0.7, 0)
    place(out, frame_drum(rng, 110, 0.4) * 0.5, secs(0.18))
    place(out, horn_note(midi_hz(57), 0.22, bright=0.6) * 0.8, secs(0.3))
    place(out, horn_note(midi_hz(64), 0.5, bright=0.6) * 0.8, secs(0.55))
    return normalize(out, 0.8)


def sfx_bell(freq, dur, two=None):
    def f(rng):
        n = secs(dur + (0.6 if two else 0))
        out = np.zeros(n)
        place(out, bell(freq, dur), 0)
        if two:
            place(out, bell(two, dur) * 0.8, secs(0.6))
        return normalize(out, 0.7)
    return f


def sfx_pickup(rng):
    n = secs(0.9)
    out = np.zeros(n)
    for i, m in enumerate([81, 84, 88, 93]):
        place(out, chime(midi_hz(m), 0.5) * (0.6 - i * 0.08), secs(i * 0.06))
    return normalize(out, 0.7)


def sfx_capture(rng):
    n = secs(1.6)
    out = np.zeros(n)
    place(out, horn_note(midi_hz(50), 0.35, bright=0.55), 0)
    place(out, horn_note(midi_hz(57), 0.9, bright=0.6), secs(0.38))
    place(out, whoosh(rng, 0.5, 200, 1200, True, 0.4), secs(0.1))
    return normalize(out, 0.8)


def sfx_divine(rng):
    n = secs(2.8)
    out = np.zeros(n)
    for i, m in enumerate([62, 66, 69, 74]):
        place(out, pad_note(midi_hz(m), 1.4, bright=0.7, seed=90 + i, attack=0.5, release=1.0, detune=9) * 0.35, 0)
    for i, m in enumerate([86, 90, 93]):
        place(out, chime(midi_hz(m), 1.2) * 0.2, secs(0.4 + i * 0.12))
    return normalize(out, 0.7)


def sfx_objective(rng):
    n = secs(1.1)
    out = np.zeros(n)
    place(out, chime(midi_hz(74), 0.8), 0)
    place(out, chime(midi_hz(79), 0.9), secs(0.14))
    place(out, pluck(midi_hz(86), 1.0, bright=0.6, seed=86) * 0.25, secs(0.14))
    return normalize(out, 0.7)


def sfx_steps(rng):
    """Seamless 2.4 s loop of soft footsteps on earth."""
    n = secs(2.4)
    out = np.zeros(n)
    for i in range(8):
        k = secs(0.09)
        t = tvec(k)
        step = lowpass(white(rng, k), rng.uniform(600, 900)) * np.exp(-t / 0.025) + bandpass(white(rng, k), 1800, 4000) * np.exp(-t / 0.01) * 0.15
        place(out, step * (0.8 if i % 2 == 0 else 0.6), secs(i * 0.3 + rng.uniform(0, 0.02)))
    return fade(out * 0.9, 0.001, 0.001)


def sfx_war_horn(rng):
    n = secs(2.4)
    t = tvec(n)
    f = midi_hz(45) * (1 + 0.5 * (np.clip(t / 0.35, 0, 1) - 1) * 0.12)
    env = adsr(n, 0.25, 0.3, 0.85, 0.7)
    sig = np.zeros(n)
    for k in range(1, 12):
        sig += (1 / k) * (0.6 ** (k - 1)) * np.sin(2 * np.pi * np.cumsum(f * k) / SR)
    sig = lowpass(sig * env, 1800) * 0.6
    place(sig, frame_drum(rng, 60, 1.0, slap=0.2) * 0.8, secs(0.05))
    return normalize(reverb(sig, 0.3, 1.2)[0], 0.85)


def sfx_swing(rng):
    return normalize(whoosh(rng, 0.26, 500, 4000, True, 1.0), 0.6)


def sfx_hit(rng, heavy=False):
    k = secs(0.45 if heavy else 0.3)
    out = thump(rng, rng.uniform(75, 105), 0.3 if not heavy else 0.4, noise=0.6)
    crack = highpass(white(rng, secs(0.015)), 2500) * 0.35
    place(out, crack, 0)
    if heavy:
        place(out, metal(rng, rng.uniform(420, 600), 0.4, 0.8), secs(0.003))
    out = np.pad(out, (0, max(0, k - len(out))))[:k]
    return normalize(out, 0.85 if heavy else 0.75)


def sfx_shot(rng):
    f = rng.uniform(95, 125)
    s = pluck(f, 0.4, bright=0.8, decay=0.985, seed=int(f)) * 0.8
    s = mix(s, whoosh(rng, 0.4, 1500, 5000, True, 0.25))
    return normalize(fade(s, 0.0005, 0.05), 0.7)


def sfx_arrow_hit(rng):
    n = secs(0.22)
    t = tvec(n)
    s = lowpass(white(rng, n), 1600) * np.exp(-t / 0.02) + np.sin(2 * np.pi * rng.uniform(260, 340) * t) * np.exp(-t / 0.03) * 0.6
    return normalize(fade(s, 0.0003, 0.02), 0.65)


def sfx_death(rng):
    n = secs(0.8)
    out = np.zeros(n)
    place(out, thump(rng, 55, 0.5, noise=0.8), 0)
    place(out, bandpass(white(rng, secs(0.4)), 400, 2000) * expdecay(secs(0.4), 0.12) * 0.25, secs(0.05))
    place(out, thump(rng, 48, 0.4, noise=0.5) * 0.5, secs(0.18))
    return normalize(out, 0.75)


def sfx_spell(rng):
    n = secs(1.1)
    t = tvec(n)
    out = np.zeros(n)
    for i in range(7):
        f = midi_hz(76 + i * 3) * (1 + 0.15 * t)
        trem = 0.6 + 0.4 * np.sin(2 * np.pi * (7 + i) * t)
        out += np.sin(2 * np.pi * np.cumsum(f) / SR) * trem * adsr(n, 0.1 + i * 0.05, 0.2, 0.6, 0.5) * (0.8 ** i)
    out = mix(out, whoosh(rng, 1.1, 800, 6000, True, 0.3))
    return normalize(reverb(out, 0.35)[0], 0.7)


def sfx_heal(rng):
    n = secs(1.2)
    out = np.zeros(n)
    for i, m in enumerate([72, 76, 79, 84]):
        place(out, chime(midi_hz(m), 0.8) * 0.5, secs(i * 0.1))
    place(out, pad_note(midi_hz(60), 0.6, bright=0.6, seed=7, attack=0.2, release=0.4) * 0.3, 0)
    return normalize(reverb(out, 0.35)[0], 0.65)


def sfx_ward(rng):
    n = secs(1.1)
    t = tvec(n)
    s = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, a, tau in ((1318, 1, 0.5), (1975, 0.6, 0.35), (2637, 0.4, 0.25), (3951, 0.2, 0.15)))
    return normalize(fade(s, 0.002, 0.05), 0.6)


def sfx_defend(rng):
    out = metal(rng, rng.uniform(330, 420), 0.4, 1.0)
    place(out, thump(rng, 120, 0.15, 0.5) * 0.5, 0)
    return normalize(out, 0.7)


def sfx_morale(up: bool):
    def f(rng):
        n = secs(0.9)
        out = np.zeros(n)
        seq = [74, 79, 83] if up else [71, 67, 62]
        for i, m in enumerate(seq):
            c = chime(midi_hz(m), 0.5) if up else lowpass(chime(midi_hz(m), 0.5), 1800)
            place(out, c * 0.6, secs(i * 0.11))
        return normalize(out, 0.6 if up else 0.5)
    return f


def sfx_shapeshift(rng):
    n = secs(0.9)
    t = tvec(n)
    f = 220 * 2 ** (1.5 * np.sin(np.pi * t / 0.9))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(n, 0.15, 0.2, 0.7, 0.3) * 0.4
    s = mix(tone, whoosh(rng, 0.9, 300, 3000, True, 0.6))
    return normalize(reverb(s, 0.3)[0], 0.7)


def sfx_recovery(rng):
    n = secs(1.8)
    out = np.zeros(n)
    for i, m in enumerate([60, 64, 67, 72]):
        place(out, pad_note(midi_hz(m), 0.9, bright=0.6, seed=60 + i, attack=0.5, release=0.8, detune=10) * 0.3, secs(i * 0.08))
    for i, m in enumerate([84, 88, 91]):
        place(out, chime(midi_hz(m), 1.0) * 0.18, secs(0.5 + i * 0.1))
    return normalize(reverb(out, 0.4)[0], 0.65)


def sfx_catapult(rng):
    n = secs(0.9)
    out = np.zeros(n)
    # Wooden creak (a slow, rough low pluck) then the arm's thump and a whoosh.
    creak = pluck(70, 0.4, bright=0.9, decay=0.97, seed=70) * lfo(secs(0.4), 18, rng, 0.3, 1.0)
    place(out, lowpass(creak, 1500) * 0.6, 0)
    place(out, thump(rng, 90, 0.25, 0.8) * 0.8, secs(0.3))
    place(out, whoosh(rng, 0.5, 200, 1500, True, 0.6), secs(0.35))
    return normalize(out, 0.75)


def sfx_stone_hit(rng):
    n = secs(1.2)
    t = tvec(n)
    boom = thump(rng, 50, 0.7, noise=1.0)
    rubble = lowpass(white(rng, n), 3000) * np.exp(-t / 0.2) * 0.5
    out = rubble.copy()
    place(out, boom, 0)
    for _ in range(10):
        k = secs(0.04)
        place(out, bandpass(white(rng, k), 800, 3500) * expdecay(k, 0.01) * rng.uniform(0.1, 0.4), secs(rng.uniform(0.05, 0.7)))
    return normalize(out, 0.9)


def sfx_breach(rng):
    n = secs(2.2)
    t = tvec(n)
    rumble = lowpass(brown(rng, n), 220) * adsr(n, 0.05, 0.4, 0.6, 1.4) * 1.2
    out = rumble + lowpass(white(rng, n), 2500) * np.exp(-t / 0.5) * 0.4
    place(out, thump(rng, 45, 0.9, 1.0), 0)
    for _ in range(18):
        k = secs(0.05)
        place(out, bandpass(white(rng, k), 600, 3000) * expdecay(k, 0.012) * rng.uniform(0.1, 0.35), secs(rng.uniform(0.05, 1.5)))
    return normalize(out, 0.9)


def sfx_turret(rng):
    n = secs(0.35)
    s = pluck(140, 0.35, bright=0.9, decay=0.98, seed=140) * 0.6
    s = s[:n] + np.pad(thump(rng, 160, 0.12, 0.6), (0, n))[:n] * 0.6
    return normalize(fade(s, 0.0005, 0.03), 0.7)


def sfx_moat(rng):
    n = secs(0.9)
    t = tvec(n)
    splash = bandpass(white(rng, n), 400, 5000) * np.exp(-t / 0.12)
    out = splash.copy()
    for _ in range(12):
        k = secs(0.05)
        f0 = rng.uniform(500, 1400)
        tt = tvec(k)
        place(out, np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2 * tt)) / SR) * np.exp(-tt / 0.012) * 0.2, secs(rng.uniform(0.05, 0.6)))
    return normalize(out, 0.7)


def sfx_march(rng):
    n = secs(0.8)
    out = np.zeros(n)
    for i in range(4):
        k = secs(0.1)
        step = lowpass(white(rng, k), 900) * expdecay(k, 0.03) + bandpass(white(rng, k), 2000, 5000) * expdecay(k, 0.01) * 0.2
        place(out, step * rng.uniform(0.5, 0.9), secs(i * 0.18 + rng.uniform(0, 0.03)))
    return normalize(out, 0.55)


def sfx_flight(rng):
    n = secs(0.9)
    out = np.zeros(n)
    for i in range(4):
        k = secs(0.18)
        tt = tvec(k)
        flap = lowpass(white(rng, k), 700) * np.sin(np.pi * tt / 0.18) ** 2
        place(out, flap * (0.9 - i * 0.12), secs(i * 0.2))
    return normalize(out, 0.6)


# Magic and Favor (fxLooks.FX_SOUNDS), the spellbook and the town (2026-10-03) -----------


def _wet(x, wet=0.3, size=1.0):
    return reverb(x, wet, size)[0]


def magic_cast(rng):
    n = secs(0.6)
    t = tvec(n)
    gather = whoosh(rng, 0.6, 600, 7000, True, 0.5)
    shimmer = sum(np.sin(2 * np.pi * midi_hz(84 + k * 4) * (1 + 0.2 * t) * t) * (0.6 ** k) for k in range(4)) * (t / 0.6) ** 2 * 0.25
    return normalize(_wet(mix(gather, shimmer), 0.3), 0.6)


def magic_strike(rng):
    n = secs(0.5)
    t = tvec(n)
    crack = highpass(white(rng, n), 2500) * np.exp(-t / 0.02)
    zap = np.sin(2 * np.pi * np.cumsum(2400 * np.exp(-t / 0.05) + 300) / SR) * np.exp(-t / 0.08) * 0.5
    buzz = np.sign(np.sin(2 * np.pi * 120 * t)) * bandpass(white(rng, n), 800, 3000) * np.exp(-t / 0.12) * 0.25
    return normalize(_wet(crack + zap + buzz, 0.25), 0.8)


def magic_thunder(rng):
    n = secs(1.8)
    t = tvec(n)
    crack = highpass(white(rng, n), 1500) * np.exp(-t / 0.03) * 0.8
    rumble = lowpass(brown(rng, n), 180) * adsr(n, 0.04, 0.4, 0.6, 1.0) * (0.7 + 0.3 * lfo(n, 6, rng)) * 2.0
    return normalize(_wet(crack + rumble, 0.35, 1.3), 0.85)


def magic_fire(rng):
    n = secs(1.1)
    t = tvec(n)
    roar = bandpass(brown(rng, n), 80, 900) * adsr(n, 0.08, 0.3, 0.6, 0.5) * 1.2
    return normalize(_wet(mix(whoosh(rng, 0.5, 300, 4000, True, 0.8), roar, crackle(rng, 1.1, rate=70, amount=0.5) * np.exp(-t / 0.6)), 0.25), 0.8)


def magic_heal(rng):
    n = secs(1.3)
    out = np.zeros(n)
    for i, m in enumerate([67, 71, 74, 79, 83]):
        place(out, bell(midi_hz(m), 1.0, bright=0.6) * 0.5, secs(i * 0.08))
    place(out, pad_note(midi_hz(55), 0.8, bright=0.5, seed=17, attack=0.15, release=0.4) * 0.35, 0)
    return normalize(_wet(out, 0.4), 0.65)


def magic_bless(rng):
    n = secs(1.4)
    out = np.zeros(n)
    for i, m in enumerate([60, 64, 67, 72]):
        place(out, pad_note(midi_hz(m), 0.9, bright=0.65, seed=30 + i, attack=0.08, release=0.5) * 0.3, 0)
    for i, m in enumerate([84, 88, 91]):
        place(out, chime(midi_hz(m), 0.9) * 0.3, secs(0.12 + i * 0.07))
    return normalize(_wet(out, 0.4), 0.65)


def magic_curse(rng):
    n = secs(1.3)
    t = tvec(n)
    out = np.zeros(n)
    for i, m in enumerate([45, 51, 46]):
        place(out, pad_note(midi_hz(m), 0.9, bright=0.3, seed=40 + i, attack=0.2, release=0.4, detune=18) * 0.35, 0)
    whisper = bandpass(white(rng, n), 900, 3500) * np.exp(-((t - 0.5) ** 2) / 0.05) * 0.25
    return normalize(_wet(out * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t)) + whisper, 0.35), 0.65)


def magic_wind(rng):
    n = secs(1.0)
    t = tvec(n)
    w = bandpass(pink(rng, n), 400, 3000) * np.sin(np.pi * t / 1.0) ** 2 * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t))
    return normalize(mix(whoosh(rng, 0.9, 300, 5000, True, 0.6), w * 0.8), 0.6)


def magic_frost(rng):
    n = secs(1.0)
    t = tvec(n)
    out = np.zeros(n)
    for i in range(9):
        f = rng.uniform(2500, 6000)
        k = secs(0.4)
        place(out, np.sin(2 * np.pi * f * tvec(k)) * np.exp(-tvec(k) / 0.06) * 0.25, secs(i * 0.05 + rng.uniform(0, 0.03)))
    out += highpass(crackle(rng, 1.0, rate=60, amount=0.4), 3000) * np.exp(-t / 0.5)
    return normalize(_wet(out, 0.35), 0.6)


def magic_nature(rng):
    n = secs(1.0)
    t = tvec(n)
    f = 90 + 40 * t
    creak = np.sin(2 * np.pi * np.cumsum(f) / SR) * bandpass(white(rng, n), 120, 900) * np.sin(np.pi * t) * 0.8
    rustle = bandpass(pink(rng, n), 2000, 7000) * np.sin(np.pi * t) ** 3 * 0.5
    snap = np.zeros(n)
    for at in (0.25, 0.45, 0.62):
        place(snap, highpass(white(rng, secs(0.02)), 1500) * np.exp(-tvec(secs(0.02)) / 0.004), secs(at))
    return normalize(_wet(creak + rustle + snap * 0.6, 0.25), 0.65)


def magic_swarm(rng):
    n = secs(1.1)
    t = tvec(n)
    out = np.zeros(n)
    for k in range(9):
        f = rng.uniform(170, 280) * (1 + 0.03 * np.sin(2 * np.pi * rng.uniform(3, 9) * t))
        ph = 2 * np.pi * np.cumsum(f) / SR
        out += np.sign(np.sin(ph)) * 0.08 * (0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(15, 30) * t))
    out = bandpass(out, 200, 3000) * adsr(n, 0.15, 0.2, 0.8, 0.4)
    return normalize(out, 0.55)


def magic_water(rng):
    n = secs(1.1)
    t = tvec(n)
    out = bandpass(white(rng, n), 600, 6000) * np.exp(-t / 0.25) * 0.5
    for _ in range(14):
        place(out, chirp(rng.uniform(500, 900), rng.uniform(1200, 2200), rng.uniform(0.03, 0.07), 2.0) * 0.25, secs(rng.uniform(0.05, 0.9)))
    return normalize(_wet(out, 0.3), 0.6)


def magic_shadow(rng):
    n = secs(1.1)
    t = tvec(n)
    swell = lowpass(brown(rng, n), 400) * (t / 1.1) ** 2 * np.exp(-np.maximum(0, t - 0.85) / 0.06) * 1.5
    sub = np.sin(2 * np.pi * 48 * t) * adsr(n, 0.5, 0.2, 0.8, 0.25) * 0.6
    return normalize(_wet(mix(whoosh(rng, 1.0, 200, 1500, False, 0.5), swell + sub), 0.35, 1.2), 0.7)


def magic_holy(rng):
    n = secs(2.0)
    out = np.zeros(n)
    for i, m in enumerate([55, 62, 67, 71, 74, 79]):
        place(out, pad_note(midi_hz(m), 1.3, bright=0.7, seed=60 + i, attack=0.25, release=0.6) * 0.22, 0)
    place(out, bell(midi_hz(79), 1.8, bright=0.8) * 0.4, secs(0.2))
    place(out, bell(midi_hz(86), 1.5, bright=0.8) * 0.25, secs(0.32))
    return normalize(_wet(out, 0.45, 1.3), 0.7)


def magic_smite(rng):
    n = secs(1.6)
    t = tvec(n)
    out = np.zeros(n)
    place(out, thump(rng, 50, 0.9, noise=1.0) * 1.2, secs(0.05))
    out += highpass(white(rng, n), 1800) * np.exp(-t / 0.04) * 0.7
    out += lowpass(brown(rng, n), 200) * adsr(n, 0.05, 0.3, 0.5, 0.9) * 1.4
    return normalize(_wet(mix(whoosh(rng, 0.25, 800, 6000, False, 0.6), out), 0.35, 1.3), 0.9)


def magic_reveal(rng):
    n = secs(1.3)
    out = np.zeros(n)
    for i, m in enumerate([72, 76, 79, 83, 86, 88, 91]):
        place(out, chime(midi_hz(m), 0.9) * 0.3, secs(i * 0.07))
    return normalize(_wet(mix(out, whoosh(rng, 1.2, 1000, 8000, True, 0.3)), 0.45), 0.6)


def magic_teleport(rng):
    n = secs(1.3)
    t = tvec(n)
    f = 200 * 2 ** (4 * np.clip(t / 0.9, 0, 1))
    rise = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / 0.9) ** 1.5 * (t < 0.9) * 0.3
    out = mix(rise, whoosh(rng, 0.9, 300, 6000, True, 0.5))
    place(out, chime(midi_hz(91), 0.4) * 0.5, secs(0.9))
    place(out, chime(midi_hz(96), 0.35) * 0.35, secs(0.93))
    return normalize(_wet(out, 0.4), 0.65)


def magic_coins(rng):
    n = secs(1.2)
    out = np.zeros(n)
    for i in range(18):
        at = 0.04 * i + rng.uniform(0, 0.05)
        place(out, metal(rng, rng.uniform(2200, 4200), 0.18, 0.6) * rng.uniform(0.4, 1.0), secs(at))
    return normalize(_wet(out, 0.2), 0.6)


def magic_horn(rng):
    n = secs(1.8)
    out = np.zeros(n)
    place(out, horn_note(midi_hz(43), 0.5, bright=0.6) * 0.9, 0)
    place(out, horn_note(midi_hz(50), 0.9, bright=0.7) * 0.9, secs(0.45))
    place(out, horn_note(midi_hz(43), 1.3, bright=0.4) * 0.4, secs(0.45))
    return normalize(_wet(out, 0.4, 1.4), 0.75)


def ui_book_open(rng):
    n = secs(0.55)
    out = np.zeros(n)
    place(out, thump(rng, 110, 0.18, noise=0.6) * 0.6, 0)
    for i in range(4):
        k = secs(0.09)
        place(out, bandpass(white(rng, k), 1500, 6000) * np.sin(np.pi * tvec(k) / 0.09) ** 2 * 0.25 * (1 - i * 0.2), secs(0.06 + i * 0.07))
    return normalize(out, 0.6)


def ui_book_close(rng):
    n = secs(0.35)
    out = np.zeros(n)
    place(out, bandpass(white(rng, secs(0.08)), 1200, 5000) * np.sin(np.pi * tvec(secs(0.08)) / 0.08) ** 2 * 0.2, 0)
    place(out, thump(rng, 95, 0.25, noise=0.8) * 0.8, secs(0.06))
    return normalize(out, 0.6)


def ui_book_page(rng):
    n = secs(0.32)
    t = tvec(n)
    swish = bandpass(white(rng, n), 900, 7000) * np.sin(np.pi * t / 0.32) ** 1.5 * 0.35
    crinkle = highpass(crackle(rng, 0.32, rate=60, amount=0.25), 2500) * np.sin(np.pi * t / 0.32)
    return normalize(swish + crinkle, 0.45)


def ui_popup(rng):
    n = secs(0.35)
    out = np.zeros(n)
    place(out, wood(620, 0.2, seed=3) * 0.6, 0)
    place(out, chime(midi_hz(84), 0.3) * 0.12, secs(0.03))
    return normalize(out, 0.5)


def ui_town_action(rng):
    n = secs(0.6)
    out = np.zeros(n)
    place(out, bandpass(white(rng, secs(0.03)), 1500, 6000) * np.exp(-tvec(secs(0.03)) / 0.006) * 0.7, 0)
    place(out, wood(480, 0.2, seed=4) * 0.4, secs(0.01))
    place(out, bell(midi_hz(81), 0.5, bright=0.6) * 0.3, secs(0.05))
    return normalize(out, 0.5)


# --------------------------------------------------------------------------- catalogue


@dataclass
class Sound:
    id: str
    role: str
    bus: str
    make: object
    gain: float = 1.0
    variants: int = 1
    stereo: bool = False
    intensity: str | None = None
    max_voices: int | None = None
    cooldown_ms: int | None = None
    pitch_jitter: int | None = None
    quality: int = 4
    name: str = ''


def S(id, role, bus, make, **kw):
    return Sound(id=id, role=role, bus=bus, make=make, **kw)


def music(tr: Track):
    return lambda rng: render_track(tr)


CATALOGUE = [
    # Music (production/04 §7 minimum set) and stingers
    S('music.menu', 'music', 'music', music(TRACKS[0]), gain=0.9, stereo=True, quality=3),
    S('music.battle', 'music', 'music', music(TRACKS[1]), gain=0.8, stereo=True, quality=3),
    S('music.resolution', 'music', 'music', music(TRACKS[2]), gain=0.9, stereo=True, quality=3),
    S('stinger.victory', 'stinger', 'music', lambda r: stinger_victory(), stereo=True, cooldown_ms=4000, max_voices=1),
    S('stinger.defeat', 'stinger', 'music', lambda r: stinger_defeat(), stereo=True, cooldown_ms=4000, max_voices=1),
    S('stinger.levelup', 'stinger', 'music', lambda r: stinger_levelup(), stereo=True, cooldown_ms=2500, max_voices=1),
    S('stinger.beacon', 'stinger', 'music', lambda r: stinger_beacon(), stereo=True, cooldown_ms=5000, max_voices=1),
    # Ambience beds
    S('amb.coast', 'ambience', 'ambience', lambda r: amb_coast(), stereo=True, quality=2),
    S('amb.high_pass', 'ambience', 'ambience', lambda r: amb_high_pass(), stereo=True, quality=2),
    S('amb.storm_plateau', 'ambience', 'ambience', lambda r: amb_storm_plateau(), stereo=True, quality=2, intensity='strong'),
    S('amb.battlefield', 'ambience', 'ambience', lambda r: amb_battlefield(), stereo=True, quality=2),
    # Interface
    S('ui.click', 'effect', 'interface', sfx_click, gain=0.35, max_voices=2, cooldown_ms=40, pitch_jitter=40),
    S('ui.open', 'effect', 'interface', sfx_open, gain=0.45, max_voices=1, cooldown_ms=120),
    S('ui.close', 'effect', 'interface', sfx_close, gain=0.4, max_voices=1, cooldown_ms=120),
    S('ui.confirm', 'effect', 'interface', sfx_confirm, gain=0.55, max_voices=1, cooldown_ms=200),
    S('ui.error', 'effect', 'interface', sfx_error, gain=0.55, max_voices=1, cooldown_ms=300),
    S('ui.coins', 'effect', 'interface', sfx_coins, gain=0.6, max_voices=1, cooldown_ms=200),
    S('ui.build', 'effect', 'interface', sfx_build, gain=0.7, max_voices=1, cooldown_ms=300),
    S('ui.recruit', 'effect', 'interface', sfx_recruit, gain=0.6, max_voices=1, cooldown_ms=300),
    S('ui.endday', 'effect', 'interface', sfx_bell(midi_hz(62), 1.8), gain=0.55, max_voices=1, cooldown_ms=800),
    S('ui.newday', 'effect', 'interface', sfx_bell(midi_hz(67), 1.8), gain=0.5, max_voices=1, cooldown_ms=800),
    S('ui.newweek', 'effect', 'interface', sfx_bell(midi_hz(67), 1.8, two=midi_hz(74)), gain=0.55, max_voices=1, cooldown_ms=800),
    S('ui.pickup', 'effect', 'interface', sfx_pickup, gain=0.55, max_voices=1, cooldown_ms=200),
    S('ui.capture', 'effect', 'interface', sfx_capture, gain=0.6, max_voices=1, cooldown_ms=500),
    S('ui.divine', 'effect', 'interface', sfx_divine, gain=0.6, max_voices=1, cooldown_ms=800),
    S('ui.objective', 'effect', 'interface', sfx_objective, gain=0.55, max_voices=1, cooldown_ms=500),
    S('sfx.steps', 'loop', 'interface', sfx_steps, gain=0.35),
    # Combat
    S('combat.start', 'effect', 'combat', sfx_war_horn, gain=0.7, max_voices=1, cooldown_ms=3000),
    S('combat.march', 'effect', 'combat', sfx_march, gain=0.4, max_voices=1, cooldown_ms=150),
    S('combat.flight', 'effect', 'combat', sfx_flight, gain=0.45, max_voices=1, cooldown_ms=150),
    S('combat.swing', 'effect', 'combat', sfx_swing, gain=0.45, variants=3, max_voices=2, pitch_jitter=60),
    S('combat.hit', 'effect', 'combat', lambda r: sfx_hit(r, False), gain=0.7, variants=3, max_voices=3, pitch_jitter=80),
    S('combat.hit_heavy', 'effect', 'combat', lambda r: sfx_hit(r, True), gain=0.75, variants=2, max_voices=2, pitch_jitter=60),
    S('combat.shot', 'effect', 'combat', sfx_shot, gain=0.55, variants=2, max_voices=3, pitch_jitter=50),
    S('combat.arrow_hit', 'effect', 'combat', sfx_arrow_hit, gain=0.55, variants=2, max_voices=3, pitch_jitter=60),
    S('combat.death', 'effect', 'combat', sfx_death, gain=0.6, variants=2, max_voices=2),
    S('combat.spell', 'effect', 'combat', sfx_spell, gain=0.55, max_voices=1),
    S('combat.heal', 'effect', 'combat', sfx_heal, gain=0.55, max_voices=1),
    S('combat.ward', 'effect', 'combat', sfx_ward, gain=0.45, max_voices=1),
    S('combat.defend', 'effect', 'combat', sfx_defend, gain=0.5, max_voices=1, pitch_jitter=40),
    S('combat.morale_up', 'effect', 'combat', sfx_morale(True), gain=0.5, max_voices=1),
    S('combat.morale_down', 'effect', 'combat', sfx_morale(False), gain=0.5, max_voices=1),
    S('combat.shapeshift', 'effect', 'combat', sfx_shapeshift, gain=0.55, max_voices=1),
    S('combat.recovery', 'effect', 'combat', sfx_recovery, gain=0.5, max_voices=1, cooldown_ms=400),
    S('combat.catapult', 'effect', 'combat', sfx_catapult, gain=0.6, max_voices=1),
    S('combat.stone_hit', 'effect', 'combat', sfx_stone_hit, gain=0.7, max_voices=2, intensity='strong'),
    S('combat.breach', 'effect', 'combat', sfx_breach, gain=0.75, max_voices=1, intensity='strong'),
    S('combat.turret', 'effect', 'combat', sfx_turret, gain=0.55, max_voices=2),
    S('combat.moat', 'effect', 'combat', sfx_moat, gain=0.55, max_voices=1),
    # --- Added 2026-10-03 (appended so earlier sounds keep their seeds) ---
    # Campaign soundscapes: The Winter Oath (fjord), the Egyptian (desert), Japanese (shrine), Celtic (glen) and Mesoamerican (jungle) campaigns.
    S('amb.fjord', 'ambience', 'ambience', lambda r: amb_fjord(), stereo=True, quality=2),
    S('amb.desert', 'ambience', 'ambience', lambda r: amb_desert(), stereo=True, quality=2),
    S('amb.shrine', 'ambience', 'ambience', lambda r: amb_shrine(), stereo=True, quality=2),
    S('amb.glen', 'ambience', 'ambience', lambda r: amb_glen(), stereo=True, quality=2),
    S('amb.jungle', 'ambience', 'ambience', lambda r: amb_jungle(), stereo=True, quality=2),
    # The spellbook, the town's building pop-up and its actions.
    S('ui.book_open', 'effect', 'interface', ui_book_open, gain=0.5, max_voices=1, cooldown_ms=150),
    S('ui.book_close', 'effect', 'interface', ui_book_close, gain=0.45, max_voices=1, cooldown_ms=150),
    S('ui.book_page', 'effect', 'interface', ui_book_page, gain=0.45, max_voices=1, cooldown_ms=90, pitch_jitter=80),
    S('ui.popup', 'effect', 'interface', ui_popup, gain=0.4, max_voices=1, cooldown_ms=100, pitch_jitter=40),
    S('ui.town_action', 'effect', 'interface', ui_town_action, gain=0.45, max_voices=1, cooldown_ms=150),
    # Spells and Favor: the gathering of a cast and one sound per look family (presentation/src/fxLooks.ts FX_SOUNDS).
    S('magic.cast', 'effect', 'combat', magic_cast, gain=0.45, max_voices=1, cooldown_ms=150),
    S('magic.strike', 'effect', 'combat', magic_strike, gain=0.55, max_voices=2, pitch_jitter=60),
    S('magic.thunder', 'effect', 'combat', magic_thunder, gain=0.65, max_voices=2, intensity='strong'),
    S('magic.fire', 'effect', 'combat', magic_fire, gain=0.6, max_voices=2),
    S('magic.heal', 'effect', 'combat', magic_heal, gain=0.55, max_voices=1),
    S('magic.bless', 'effect', 'combat', magic_bless, gain=0.5, max_voices=1),
    S('magic.curse', 'effect', 'combat', magic_curse, gain=0.55, max_voices=1),
    S('magic.wind', 'effect', 'combat', magic_wind, gain=0.5, max_voices=1),
    S('magic.frost', 'effect', 'combat', magic_frost, gain=0.5, max_voices=1),
    S('magic.nature', 'effect', 'combat', magic_nature, gain=0.55, max_voices=1),
    S('magic.swarm', 'effect', 'combat', magic_swarm, gain=0.5, max_voices=1),
    S('magic.water', 'effect', 'combat', magic_water, gain=0.5, max_voices=1),
    S('magic.shadow', 'effect', 'combat', magic_shadow, gain=0.55, max_voices=1),
    S('magic.holy', 'effect', 'combat', magic_holy, gain=0.55, max_voices=1, cooldown_ms=600),
    S('magic.smite', 'effect', 'combat', magic_smite, gain=0.7, max_voices=1, intensity='strong'),
    S('magic.reveal', 'effect', 'combat', magic_reveal, gain=0.5, max_voices=1),
    S('magic.teleport', 'effect', 'combat', magic_teleport, gain=0.5, max_voices=1),
    S('magic.coins', 'effect', 'combat', magic_coins, gain=0.5, max_voices=1, cooldown_ms=300),
    S('magic.horn', 'effect', 'combat', magic_horn, gain=0.4, max_voices=1, cooldown_ms=800),
]


def encode(sig: np.ndarray, path: str, quality: int, stereo: bool):
    data = sig.T if stereo else sig
    pcm = np.int16(np.clip(data, -1, 1) * 32767)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    try:
        wavfile.write(tmp, SR, pcm)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', str(quality), '-map_metadata', '-1', path], check=True)
    finally:
        os.unlink(tmp)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    args = ap.parse_args()
    only = set(filter(None, args.only.split(',')))
    os.makedirs(OUT_DIR, exist_ok=True)
    # Final audio (tools/audio/import_music.py, import_sounds.py) keeps its entries and needs no placeholder file.
    previous = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {'sounds': []}
    final_ids = {e['id'] for e in previous.get('sounds', []) if e.get('status') == 'final'}
    entries = []
    for i, s in enumerate(CATALOGUE):
        base = s.id.replace('.', '_')
        files = []
        for v in range(s.variants):
            name = f'{base}.ogg' if s.variants == 1 else f'{base}_{v + 1}.ogg'
            rel = f'audio/placeholder/{name}'
            files.append(rel)
            if (only and s.id not in only) or s.id in final_ids:
                continue
            rng = np.random.default_rng(1000 + i * 17 + v)
            sig = s.make(rng)
            if s.stereo and sig.ndim == 1:
                sig = np.vstack([sig, sig])
            if not s.stereo and sig.ndim == 2:
                sig = sig.mean(axis=0)
            sig = highpass(sig, 22, order=2)  # DC blocker
            if np.max(np.abs(sig)) > 1:
                sig = normalize(sig, 0.95)
            encode(sig, os.path.join(OUT_DIR, name), s.quality, s.stereo)
            print(f'  {rel}  {sig.shape[-1] / SR:5.1f} s', flush=True)
        e = {'id': s.id, 'role': s.role, 'bus': s.bus, 'files': files, 'gain': s.gain, 'status': 'placeholder', 'provenance': PROVENANCE}
        if s.intensity:
            e['intensity'] = s.intensity
        if s.max_voices:
            e['maxVoices'] = s.max_voices
        if s.cooldown_ms is not None:
            e['cooldownMs'] = s.cooldown_ms
        if s.pitch_jitter:
            e['pitchJitterCents'] = s.pitch_jitter
        entries.append(e)
    # Final audio (e.g. the map music of tools/audio/import_music.py) keeps its entries (2026-10-04).
    finals = {e['id']: e for e in previous.get('sounds', []) if e.get('status') == 'final'}
    entries = [finals.pop(e['id'], e) for e in entries] + list(finals.values())
    manifest = {
        'schema': 'pantheon-realms-sound-manifest',
        'schemaVersion': 1,
        'note': 'Sound IDs -> files. The placeholders are synthesized by tools/audio/make_placeholders.py (status "placeholder"); final audio (status "final", e.g. the map music of tools/audio/import_music.py) keeps its entries when the placeholders are regenerated.',
        'sounds': entries,
    }
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')
    print(f'wrote {len(entries)} sounds to {os.path.relpath(MANIFEST, ROOT)}')


if __name__ == '__main__':
    sys.exit(main())
