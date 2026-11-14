"""Shared synth voices + the LOUD master chain for the explainer tracks.

Why the master exists: peak-normalising a track against one big boom left v1
hooks at -41 dB (inaudible). master() normalises to the loud body (99.5th
percentile), soft-clips, pumps against the kick, and ducks only the VOICE BAND
under narration so the beat keeps driving while the words stay clear.
Verify with: python scripts/mixcheck.py episodes/<id>.json <volume>
"""
import os
import wave

import numpy as np

from music import SR, bp, hp, hz, lp, env  # noqa: F401

rng = np.random.default_rng(23)


def add(buf, t, x, g=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    j = min(len(buf), i + len(x))
    buf[max(0, i):j] += g * x[max(0, -i):j - i]


def osc_saw(f, n, voices=1, spread=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for d in (np.linspace(-spread, spread, voices) if voices > 1 else [0.0]):
        out += 2 * ((f * (1 + d) * t + rng.uniform()) % 1.0) - 1
    return out / voices


def pluck(m, d=0.2, bright=5200):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = osc_saw(hz(m), n, 3, 0.006)
    return (lp(x, bright) * np.exp(-t * 14) + lp(x, 1500) * np.exp(-t * 5) * 0.6) * env(n, a=0.002, d=1, s=1, r=0.02)


def supersaw(ms, d, cut=6000):
    n = int(d * SR)
    x = sum(osc_saw(hz(m), n, 7, 0.012) for m in ms) / len(ms)
    return lp(x, cut) * env(n, a=0.008, d=0.3, s=0.75, r=0.06, hold=max(0.02, d - 0.06))


def bass_note(m, d, cut, drive=1.0):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = osc_saw(hz(m), n, 2, 0.004)
    y = lp(x, cut) * 0.8 + np.sin(2 * np.pi * hz(m - 12) * t) * 0.6
    if drive > 1:
        y = np.tanh(y * drive) / np.tanh(drive)
    return y * env(n, a=0.003, d=0.2, s=0.7, r=0.03)


def kick(g=1.0):
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    f = 48 + 140 * np.exp(-t * 32)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    x[: int(0.003 * SR)] += rng.uniform(-0.7, 0.7, int(0.003 * SR))
    return x * g


def snare(g=1.0):
    n = int(0.2 * SR)
    t = np.arange(n) / SR
    return (bp(rng.uniform(-1, 1, n), 1500, 8000) * np.exp(-t * 20) + np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * 0.6) * g


def clap(g=1.0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    x = bp(rng.uniform(-1, 1, n), 900, 3200)
    e = np.zeros(n)
    for o in (0.0, 0.011, 0.022):
        e += np.where(t >= o, np.exp(-(t - o) * 26), 0)
    return x * e * 0.9 * g


def hat(open_=False, g=1.0):
    n = int((0.24 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    return hp(rng.uniform(-1, 1, n), 7000, 4) * np.exp(-t * (16 if open_ else 90)) * 0.5 * g


def tom(f, g=1.0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-t * 30))) / SR) * np.exp(-t * 9) * g


def bell(m, d=0.6):
    n = int(d * SR)
    t = np.arange(n) / SR
    f = hz(m)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) + 0.15 * np.sin(2 * np.pi * f * 3.98 * t)) * np.exp(-t * 5)


def brass(ms, d, cut=2800):
    n = int(d * SR)
    x = sum(osc_saw(hz(m), n, 3, 0.004) for m in ms) / len(ms)
    return lp(x, cut) * env(n, a=0.015, d=0.4, s=0.7, r=0.12, hold=max(0.02, d - 0.12))


def noise_riser(d, lo=400, hi=9000):
    n = int(d * SR)
    tt = np.arange(n) / SR
    return bp(rng.uniform(-1, 1, n), lo, hi) * (tt / max(tt[-1], 1e-3)) ** 2


def crash(d=2.0):
    n = int(d * SR)
    t = np.arange(n) / SR
    return hp(rng.uniform(-1, 1, n), 4500) * np.exp(-t * 2.2) * 0.8


def impact(d=1.8):
    n = int(d * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(50 + 90 * np.exp(-t * 9)) / SR) * np.exp(-t * 2.6) + crash(d) * 0.7


def tape_stop(buf, t0, t1):
    """The last (t1-t0) s before t1 slows to a halt; silence after."""
    i0, i1 = int(t0 * SR), int(t1 * SR)
    seg = buf[i0:i1].copy()
    m = len(seg)
    pos = np.cumsum(np.linspace(1.0, 0.0, m))
    pos = pos / pos[-1] * (m * 0.5)
    buf[i0:i1] = np.interp(pos, np.arange(m), seg) * np.linspace(1, 0.2, m)


def sidechain(n, kicks, depth=0.75, rate=13):
    sc = np.ones(n)
    seg = int(0.3 * SR)
    curve = 1 - depth * np.exp(-np.arange(seg) / SR * rate)
    for k in kicks:
        a = int(k * SR)
        b = min(n, a + seg)
        if 0 <= a < n:
            sc[a:b] = np.minimum(sc[a:b], curve[: b - a])
    return sc


def master(mus, words, path, silences=()):
    """Glue + voice-band duck + write a stereo wav. `silences`: (a, z) spans kept dead silent."""
    n = len(mus)
    mus = hp(mus, 30)
    ref = np.percentile(np.abs(mus[np.abs(mus) > 1e-4]), 99.5)
    mus = np.tanh(1.4 * mus / ref) / np.tanh(1.4)
    talk = np.zeros(n)
    for w in words:
        talk[max(0, int((w["start"] - 0.04) * SR)):max(0, int((w["end"] + 0.12) * SR))] = 1
    kk = int(0.06 * SR)
    talk = np.convolve(talk, np.ones(kk) / kk, mode="same")
    low = lp(mus, 220, 4)
    high = hp(mus, 5500, 4)
    mid = mus - low - high
    mus = low * (1 - 0.25 * talk) + mid * (1 - 0.6 * talk) + high * (1 - 0.3 * talk)
    for a, z in silences:
        mus[int(a * SR):int(z * SR)] = 0
    fade = int(0.5 * SR)
    mus[-fade:] *= np.linspace(1, 0, fade)
    mus = mus / (np.max(np.abs(mus)) + 1e-9) * 0.95
    st = np.stack([mus, np.roll(mus, int(0.011 * SR)) * 0.96], axis=1)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(st, -1, 1) * 32767).astype("<i2").tobytes())
    return mus


def rms_db(mus, a, z):
    s = mus[int(a * SR):int(z * SR)]
    return 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9) if len(s) else -99.0
