"""Compose an ORIGINAL backing track to an Odds Ladder plan (no licensed audio).

    node scripts/test-odds.ts episodes/pirate-token-odds.json   (also writes <id>.plan.json)
    python scripts/odds_music.py episodes/pirate-token-odds.json -> public/music/<id>.wav
    python scripts/mixcheck.py episodes/pirate-token-odds.json 1.0   (measure the balance)

v2 "hype" arrangement, D minor, 140 BPM, four-on-the-floor from frame 0:
  hook        IMPACT on frame 0, full beat + the lead hook + riser into the first reveal
  ladder      full beat; filter opens per rarity tier; a hat/snare build into EVERY landing
  catch       half-time (kick 1 + 3&, snare on 3), filtered — tension, never silence
  build       accelerating snare roll + riser + pitch sweep
  drop        IMPACT -> supersaw chords + lead an octave up (the loudest section)
  sting       major-key bounce under the coin pile
v1 was peak-normalised against one huge boom, so the hook sat at -41 dB (near silent).
v2 is glued with a soft clipper and ducks only the VOICE BAND under narration, so
the kick and hats keep driving while the words stay clear.
"""
import json
import math
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from music import SR, bp, clap, env, hat, hp, hz, kick, lp  # noqa: E402

BPM = 140
BEAT = 60 / BPM
S16 = BEAT / 4
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(11)
# i - VI - III - VII  (Dm Bb F C) — the "epic" loop
CHORDS = [[62, 65, 69], [58, 62, 65], [60, 65, 69], [60, 64, 67]]
ROOTS = [38, 34, 41, 36]
# D major for the sting (D A Bm G)
CHORDS_MAJ = [[62, 66, 69], [61, 64, 69], [59, 62, 66], [59, 62, 67]]
ROOTS_MAJ = [38, 33, 35, 31]
# the lead hook: 2 bars of 16ths (None = rest), D minor pentatonic
HOOK = [74, None, 77, None, 81, None, 79, 77, 74, None, None, 72, 74, None, None, None,
        74, None, 77, None, 81, None, 84, 81, 79, None, 77, None, 74, None, 72, None]


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


def pluck(m, d=0.22):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = osc_saw(hz(m), n, 3, 0.006)
    return (lp(x, 5200) * np.exp(-t * 14) + lp(x, 1500) * np.exp(-t * 5) * 0.6) * env(n, a=0.002, d=1, s=1, r=0.02)


def supersaw(ms, d, cut=6000):
    n = int(d * SR)
    x = sum(osc_saw(hz(m), n, 7, 0.012) for m in ms) / len(ms)
    return lp(x, cut) * env(n, a=0.01, d=0.3, s=0.75, r=0.08, hold=max(0.02, d - 0.08))


def bass_note(m, d, cut):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = osc_saw(hz(m), n, 2, 0.004)
    return (lp(x, cut) * 0.8 + np.sin(2 * np.pi * hz(m - 12) * t) * 0.6) * env(n, a=0.003, d=0.2, s=0.7, r=0.03)


def snare(g=1.0):
    n = int(0.2 * SR)
    t = np.arange(n) / SR
    return (bp(rng.uniform(-1, 1, n), 1500, 8000) * np.exp(-t * 20) + np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * 0.6) * g


def bell(m, d=0.6):
    n = int(d * SR)
    t = np.arange(n) / SR
    f = hz(m)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) + 0.15 * np.sin(2 * np.pi * f * 3.98 * t)) * np.exp(-t * 5)


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
    boom = np.sin(2 * np.pi * np.cumsum(50 + 90 * np.exp(-t * 9)) / SR) * np.exp(-t * 2.6)
    return boom + crash(d) * 0.7


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    beats = plan["beats"]
    end = plan["end"] + 0.5
    n = int(end * SR)
    drums, bass, chords, lead, fx = (np.zeros(n) for _ in range(5))
    t0 = beats[0]["enter"]
    twist = next(b for b in beats if not b["odds"])  # first counter = "here's the catch"
    t_catch = plan["lineStarts"][twist["line"]]
    fin = [b for b in beats if b["odds"]][-1]
    t_build = fin["rampStart"] - 0.6
    t_drop = fin["landing"]
    pile = beats[-1]
    t_sting = pile["enter"]

    def tier(t):  # 0..5: how many odds items have landed — the track opens up per tier
        return sum(1 for b in beats if b["odds"] and t >= b["landing"])

    def section(t):
        if t < t0:
            return "hook"
        if t < t_catch:
            return "ladder"
        if t < t_build:
            return "catch"
        if t < t_drop:
            return "build"
        if t < t_sting:
            return "drop"
        return "sting"

    kicks = []
    steps = int(end / S16) + 1
    for s in range(steps):
        t = s * S16
        sec = section(t)
        bar, sub = divmod(s, 16)
        beat, q = divmod(sub, 4)
        major = sec == "sting"
        ch = (CHORDS_MAJ if major else CHORDS)[bar % 4]
        rt = (ROOTS_MAJ if major else ROOTS)[bar % 4]
        lv = tier(t)
        if sec == "build":
            continue  # the build has its own roll below
        if sec == "catch":  # half-time, filtered
            if sub in (0, 10):
                add(drums, t, kick(1.0)); kicks.append(t)
            if sub == 8:
                add(drums, t, snare(0.7))
            if q == 2:
                add(drums, t, hat(), 0.25)
            if sub == 0:
                add(bass, t, bass_note(rt - 12, BEAT * 3.5, 300), 0.7)
                add(chords, t, lp(supersaw(ch, BEAT * 4), 900), 0.45)
            if q == 0:  # the clock keeps ticking
                add(fx, t, np.sign(np.sin(2 * np.pi * 2400 * np.arange(int(0.02 * SR)) / SR)) * np.exp(-np.arange(int(0.02 * SR)) / SR * 90), 0.2)
            continue
        # four-on-the-floor everywhere else
        if q == 0:
            add(drums, t, kick(1.0)); kicks.append(t)
        if q == 0 and beat in (1, 3):
            add(drums, t, clap(), 0.8)
            add(drums, t, snare(0.35))
        if q == 2:
            add(drums, t, hat(open_=True), 0.38)
        elif q in (1, 3):
            add(drums, t, hat(), 0.28)
        # pumping offbeat bass (8ths), sidechained below
        if q in (0, 2):
            cut = {"hook": 900, "ladder": 700 + 160 * lv, "drop": 2200, "sting": 1800}[sec]
            add(bass, t, bass_note(rt - 12 + (12 if q == 2 else 0), S16 * 1.9, cut), 0.55)
        # chord stabs on every beat (sidechain makes them pump)
        if q == 0:
            cut = {"hook": 2600, "ladder": 1800 + 500 * lv, "drop": 8000, "sting": 6000}[sec]
            add(chords, t, supersaw(ch, BEAT * 0.9, cut), 0.42 if sec in ("drop", "sting") else 0.32)
        # the lead hook: in the hook, from EPIC up in the ladder, an octave up in the drop
        if sec in ("hook", "drop", "sting") or (sec == "ladder" and lv >= 2):
            m = HOOK[s % 32]
            if m is not None:
                up = 12 if sec == "drop" else 0
                if major:
                    m = {77: 78, 72: 73, 84: 85}.get(m, m)
                add(lead, t, pluck(m + up), 0.34 if sec != "ladder" else 0.26)

    # ---- frame 0: an IMPACT so the very first frame has weight
    add(fx, 0.0, impact(1.4), 0.55)
    # ---- hook riser into the first reveal
    add(fx, t0 - min(2.4, t0), noise_riser(min(2.4, t0)), 0.4)

    # ---- every landing in the ladder: 32nd-note hat + snare build in the last 0.6 s, crash on it
    for k, b in enumerate(beats):
        if b is fin or b is pile:
            continue
        a, z = b["landing"] - 0.6, b["landing"]
        t = a
        while t < z - 0.02:
            x = (t - a) / 0.6
            add(drums, t, hat(), 0.15 + 0.3 * x)
            add(drums, t, snare(0.12 + 0.3 * x))
            t += S16 / 2
        add(fx, z, crash(1.6), 0.5)
        root = 62 + min(k, 6) * 2
        for j, iv in enumerate((0, 4, 7, 12)):
            add(lead, z + j * 0.055, bell(root + iv), 0.3)
    tok = next((b for b in beats if b["art"] == "token"), None)
    if tok:  # the star of the video: a legendary fanfare
        add(lead, tok["landing"] + 0.05, supersaw([62, 66, 69, 74], 1.2, 3200), 0.5)

    # ---- every roll: slot-counter ticks that accelerate into the landing
    for b in beats:
        a, z = b["rampStart"], b["landing"]
        t = a
        while t < z - 0.03:
            x = (t - a) / max(0.01, z - a)
            nn = int(0.025 * SR)
            tt = np.arange(nn) / SR
            add(fx, t, np.sign(np.sin(2 * np.pi * (1500 + 900 * x) * tt)) * np.exp(-tt * 90), 0.18)
            t += 0.11 - 0.07 * x

    # ---- the build: accelerating snare roll + kicks + riser + rising saw into the drop
    t = t_build
    while t < t_drop - 0.02:
        x = (t - t_build) / (t_drop - t_build)
        add(drums, t, snare(0.3 + 0.6 * x))
        t += S16 * 2 * (1 - 0.75 * x)
    t = t_build
    while t < t_drop - 0.05:
        add(drums, t, kick(0.8)); kicks.append(t)
        t += BEAT
    d = t_drop - t_build
    add(fx, t_build, noise_riser(d, 300, 10000), 0.6)
    nn = int(d * SR)
    tt = np.arange(nn) / SR
    f = hz(50) * 2 ** (2 * tt / d)  # two-octave pitch sweep
    sweep = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (tt / d) ** 1.5
    add(fx, t_build, lp(sweep, 3000), 0.18)
    # ---- the drop
    add(fx, t_drop, impact(2.0), 0.9)
    kicks.append(t_drop)
    add(drums, t_drop, kick(1.2))

    # ---- sidechain: bass + chords pump against every kick
    sc = np.ones(n)
    seg = int(0.3 * SR)
    curve = 1 - 0.75 * np.exp(-np.arange(seg) / SR * 13)
    for k in kicks:
        a = int(k * SR)
        b = min(n, a + seg)
        if a < n:
            sc[a:b] = np.minimum(sc[a:b], curve[: b - a])
    mus = drums + (bass + chords) * sc + lead * (0.6 + 0.4 * sc) + fx

    # ---- fade out at the very end
    fade = int(0.6 * SR)
    mus[-fade:] *= np.linspace(1, 0, fade)

    # ---- glue: normalise to the loud body (not the single biggest peak), soft-clip
    mus = hp(mus, 30)
    ref = np.percentile(np.abs(mus), 99.5)
    mus = np.tanh(1.4 * mus / ref) / np.tanh(1.4)

    # ---- duck under narration: the VOICE BAND drops hard, the kick + hats only a little
    talk = np.zeros(n)
    for w in plan["words"]:
        talk[max(0, int((w["start"] - 0.04) * SR)):max(0, int((w["end"] + 0.12) * SR))] = 1
    kk = int(0.06 * SR)
    talk = np.convolve(talk, np.ones(kk) / kk, mode="same")
    low = lp(mus, 220, 4)
    high = hp(mus, 5500, 4)
    mid = mus - low - high
    mus = low * (1 - 0.25 * talk) + mid * (1 - 0.6 * talk) + high * (1 - 0.3 * talk)
    mus = mus / (np.max(np.abs(mus)) + 1e-9) * 0.95

    st = np.stack([mus, np.roll(mus, int(0.011 * SR)) * 0.96], axis=1)
    os.makedirs(os.path.join(ROOT, "public", "music"), exist_ok=True)
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(st, -1, 1) * 32767).astype("<i2").tobytes())

    def rms(a, z):
        s = mus[int(a * SR):int(z * SR)]
        return 20 * math.log10(math.sqrt(float(np.mean(s ** 2))) + 1e-9)
    print(f"-> {path} ({end:.1f}s)")
    secs = [("hook", 0, t0), ("ladder", t0, t_catch), ("catch", t_catch, t_build), ("build", t_build, t_drop),
            ("drop", t_drop, t_sting), ("sting", t_sting, end)]
    print("  " + "  ".join(f"{nm}:{rms(a, z):.1f}dB" for nm, a, z in secs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
