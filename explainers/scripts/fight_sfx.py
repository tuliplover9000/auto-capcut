"""Synthesize the Fight sound effects (no licensed audio).

    python scripts/fight_sfx.py   -> public/sfx/{bell,slam,zap,coins,seeds,grow,boom,fail,scratch,chomp,punch}.wav
"""
import os
import wave

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "sfx")
rng = np.random.default_rng(3)


def T(d):
    return np.arange(int(d * SR)) / SR


def filt(x, kind, fc, order=2):
    return sosfilt(butter(order, fc, kind, fs=SR, output="sos"), x)


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


def sine_sweep(f0, f1, d, curve=1.0):
    t = T(d)
    f = f0 + (f1 - f0) * (t / d) ** curve
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def place(buf, x, at):
    i = int(at * SR)
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]


def punch():
    t = T(0.35)
    body = sine_sweep(160, 45, 0.35, 0.4) * np.exp(-t * 14)
    snap = filt(noise(0.35), "highpass", 1500) * np.exp(-t * 60) * 0.8
    return body * 1.2 + snap


def bell():
    t = T(2.0)
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in
            [(820, 1, 1.4), (1640 * 1.01, 0.5, 2.2), (2460 * 0.99, 0.35, 3), (3350, 0.2, 4)])
    out = np.zeros(int(2.6 * SR))
    place(out, x * 0.5, 0)
    place(out, x * 0.4, 0.22)  # ding-ding
    return out


def slam():
    t = T(0.5)
    sw = filt(noise(0.5), "bandpass", [400, 3000]) * np.minimum(1, t / 0.15) * np.exp(-np.maximum(0, t - 0.15) * 18)
    hit = sine_sweep(110, 40, 0.5, 0.5) * np.exp(-np.maximum(0, t - 0.14) * 10) * (t > 0.14)
    return sw * 0.7 + hit


def zap():
    t = T(1.0)
    f = 220 + 40 * np.sin(2 * np.pi * 9 * t)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    buzz = filt(saw, "lowpass", 3000) * 0.6 + filt(noise(1.0), "bandpass", [2000, 6000]) * 0.25
    rise = sine_sweep(300, 1400, 1.0, 0.6) * 0.35
    return (buzz + rise) * np.minimum(1, t / 0.05) * np.minimum(1, (1.0 - t) / 0.2)


def coins():
    out = np.zeros(int(1.9 * SR))
    for i in range(18):
        t = T(0.25)
        f = 2600 + (i * 337) % 1200
        ping = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 22)
        place(out, ping * 0.35, 0.5 + i * 0.06 + (i % 3) * 0.01)
    return out


def seeds():
    out = np.zeros(int(1.6 * SR))
    for i in range(30):
        t = T(0.08)
        shot = filt(noise(0.08), "bandpass", [600, 5000]) * np.exp(-t * 70) + sine_sweep(220, 70, 0.08) * np.exp(-t * 50) * 0.6
        place(out, shot * 0.8, i * 0.042)
    return out


def grow():
    t = T(0.9)
    x = sine_sweep(180, 900, 0.9, 1.6)
    wob = 1 + 0.3 * np.sin(2 * np.pi * 14 * t)
    return x * wob * 0.5 * np.minimum(1, (0.9 - t) / 0.1)


def boom():
    t = T(1.4)
    return sine_sweep(90, 30, 1.4, 0.3) * np.exp(-t * 3.5) * 1.3 + filt(noise(1.4), "lowpass", 500) * np.exp(-t * 6) * 0.6


def fail():  # sad trombone: three falling notes, then a long wobbling one
    out = np.zeros(int(2.4 * SR))
    for k, (f, d) in enumerate([(311, 0.36), (293, 0.36), (277, 0.36), (262, 1.1)]):
        t = T(d)
        vib = 1 + (0.02 * np.sin(2 * np.pi * 6 * t) if k == 3 else 0)
        ph = np.cumsum(f * vib) / SR
        tone = sum(np.sin(2 * np.pi * h * ph) / h for h in range(1, 7))
        tone = filt(tone, "lowpass", 1800) * np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.08)
        place(out, tone * 0.45, k * 0.38)
    return out


def scratch():
    t = T(0.55)
    f = 300 + 900 * np.abs(np.sin(2 * np.pi * 2.2 * t))
    x = filt(noise(0.55), "bandpass", [500, 4000]) * 0.6 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4
    return x * np.minimum(1, (0.55 - t) / 0.1)


def chomp():
    out = np.zeros(int(0.7 * SR))
    for at in (0.0, 0.2):
        t = T(0.16)
        crunch = filt(noise(0.16), "bandpass", [300, 3500]) * np.exp(-t * 24) * (1 + 0.6 * np.sign(np.sin(2 * np.pi * 70 * t)))
        place(out, crunch * 0.8, at)
    return out


def clank():  # GPUs landing: metallic inharmonic hits
    out = np.zeros(int(1.4 * SR))
    for i in range(6):
        t = T(0.4)
        x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in [(540, 9), (1290, 12), (2210, 16), (3370, 20)])
        x += filt(noise(0.4), "highpass", 2500) * np.exp(-t * 40) * 0.6
        place(out, x * 0.4, i * 0.13)
    return out


def ding():  # the light bulb switching on
    t = T(1.2)
    return (np.sin(2 * np.pi * 1760 * t) + 0.4 * np.sin(2 * np.pi * 2640 * t)) * np.exp(-t * 3.5) * 0.6 + \
        filt(noise(1.2), "highpass", 5000) * np.exp(-t * 30) * 0.4


def shine():  # armour gleam: shimmering upward arpeggio
    out = np.zeros(int(1.2 * SR))
    for i, f in enumerate([1047, 1319, 1568, 2093, 2637]):
        t = T(0.5)
        place(out, np.sin(2 * np.pi * f * t) * np.exp(-t * 7) * 0.4, i * 0.07)
    return out


def powerdown():
    t = T(1.3)
    hum = sine_sweep(240, 30, 1.3, 0.5) + 0.4 * sine_sweep(480, 60, 1.3, 0.5)
    click = np.zeros_like(t)
    click[: int(0.01 * SR)] = noise(0.01)
    return hum * np.exp(-t * 1.6) * 0.7 + click


def powerup():
    t = T(1.4)
    return sine_sweep(60, 520, 1.4, 1.5) * np.minimum(1, t / 0.4) * 0.6 + \
        0.3 * sine_sweep(120, 1040, 1.4, 1.5) * np.minimum(1, t / 0.6) * np.minimum(1, (1.4 - t) / 0.1)


def save(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((x * 32767).astype("<i2").tobytes())
    print(f"ok {name:8s} {len(x) / SR:.2f}s")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for fn in (punch, bell, slam, zap, coins, seeds, grow, boom, fail, scratch, chomp, clank, ding, shine, powerdown, powerup):
        save(fn.__name__, fn())
