"""Compose an ORIGINAL backing track to an Odds Ladder plan (no licensed audio).

    node scripts/test-odds.ts episodes/pirate-token-odds.json   (also writes <id>.plan.json)
    python scripts/odds_music.py episodes/pirate-token-odds.json -> public/music/<id>.wav

D minor, 120 BPM, a "loot vault" arrangement:
  hook        ticking clock + sub pulse + riser into the first reveal
  ladder      groove that gets a notch hotter with every rarity tier
  every roll  slot-counter ticks that accelerate into the landing
  landing     reveal arpeggio, pitched higher for every tier + a cymbal wash
  catch       the drums drop out: heartbeat kick + clock (tension)
  finale      snare roll + riser -> IMPACT -> full drop
  sting       bright major bounce under the coin pile
Narration ducking baked in.
"""
import json
import math
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from music import SR, bp, clap, env, hat, hp, hz, kick, lp, saw  # noqa: E402

BPM = 120
BEAT = 60 / BPM
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(5)
PROG = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]]  # Dm Bb C A
BASS = [26, 22, 24, 21]


def add(buf, t, x, g=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    j = min(len(buf), i + len(x))
    buf[max(0, i):j] += g * x[max(0, -i):j - i]


def blip(f, d=0.035):
    n = int(d * SR)
    t = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 90) * 0.5


def bell(m, d=0.6):
    n = int(d * SR)
    t = np.arange(n) / SR
    f = hz(m)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) + 0.15 * np.sin(2 * np.pi * f * 3.98 * t)) * np.exp(-t * 5)


def wash(d=1.4):
    n = int(d * SR)
    t = np.arange(n) / SR
    return hp(rng.uniform(-1, 1, n), 5000) * np.exp(-t * 3) * 0.6


def brass(ms, d):
    n = int(d * SR)
    x = sum(saw(hz(m), n, detune=0.004) for m in ms) / len(ms)
    return lp(x, 2600) * env(n, a=0.02, d=0.4, s=0.7, r=0.15, hold=max(0.01, d - 0.15))


def snare():
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    return bp(rng.uniform(-1, 1, n), 1500, 7000) * np.exp(-t * 22) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    beats = plan["beats"]
    end = plan["end"] + 0.5
    n = int(end * SR)
    mus = np.zeros(n)
    hook_end = plan["hookEnd"]
    by_art = {b["art"]: b for b in beats}
    twist = next(b for b in beats if not b["odds"])  # the first counter = "here's the catch"
    t_catch = plan["lineStarts"][twist["line"]]
    fin = [b for b in beats if b["odds"]][-1]
    pile = beats[-1]
    t0 = beats[0]["enter"]

    # ---- pad under everything (filter opens as the ladder climbs)
    def level(t):
        lv = 0
        for k, b in enumerate(beats):
            if b["odds"] and t >= b["landing"]:
                lv = k + 1
        return lv
    t = 0.0
    bar = 0
    while t < end:
        d = BEAT * 4
        nn = int((d + 0.4) * SR)
        lv = level(t)
        cut = 500 + 450 * lv if not (t_catch <= t < fin["landing"]) else 420
        pad = sum(saw(hz(m), nn, detune=0.006) for m in PROG[bar % 4]) / 3
        add(mus, t, lp(pad, cut) * env(nn, a=0.3, d=1.0, s=0.7, r=0.4, hold=d), 0.22)
        t += d
        bar += 1

    # ---- hook: clock ticks + sub pulse + riser
    t = 0.0
    k = 0
    while t < t0:
        add(mus, t, blip(2400 if k % 2 == 0 else 1800, 0.02), 0.25)
        if k % 2 == 0:
            nn = int(BEAT * SR)
            add(mus, t, np.sin(2 * np.pi * hz(26) * np.arange(nn) / SR) * env(nn, d=0.25, s=0.0), 0.6)
        t += BEAT / 2
        k += 1
    rn = int(min(2.2, t0) * SR)
    tt = np.arange(rn) / SR
    add(mus, t0 - rn / SR, bp(rng.uniform(-1, 1, rn), 500, 6000) * (tt / tt[-1]) ** 2, 0.3)

    # ---- the ladder groove: first reveal -> "here's the catch"
    def groove(a, z, lvl_fn, hot=False):
        b = 0
        t = a
        while t < z:
            bar, sub = divmod(b, 16)
            beat, q = divmod(sub, 4)
            lv = lvl_fn(t)
            if q == 0:
                add(mus, t, kick(1.0))
            if q == 0 and beat in (1, 3):
                add(mus, t, clap(), 0.7)
            if q == 2:
                add(mus, t, hat(open_=beat == 3), 0.45)
            elif (lv >= 2 or hot) and q in (1, 3):
                add(mus, t, hat(), 0.22)
            if q in (0, 2):
                m = BASS[bar % 4] + (12 if q == 2 else 0)
                nn = int(BEAT / 2 * SR)
                add(mus, t, lp(saw(hz(m), nn), 450 + 220 * lv + (700 if hot else 0)) * env(nn, a=0.003, d=0.1, s=0.5, r=0.02), 0.5)
            if (lv >= 3 or hot) and q == 2 and beat in (0, 2):
                add(mus, t, brass(PROG[bar % 4], BEAT * 0.4), 0.2)
            b += 1
            t = a + b * BEAT / 4
    groove(t0, t_catch, level)

    # ---- the catch: heartbeat + clock (tension) until the finale roll
    t = t_catch
    k = 0
    while t < fin["rampStart"] - 0.6:
        add(mus, t, blip(2400 if k % 2 == 0 else 1800, 0.02), 0.22)
        if k % 4 == 0:
            add(mus, t, kick(0.8))
            add(mus, t + 0.18, kick(0.55))
        t += BEAT / 2
        k += 1

    # ---- finale: accelerating snare roll + riser into the IMPACT
    a, z = fin["rampStart"] - 0.6, fin["landing"]
    t = a
    while t < z - 0.02:
        x = (t - a) / (z - a)
        add(mus, t, snare(), 0.25 + 0.45 * x)
        t += BEAT / 2 * (1 - 0.8 * x)
    rn = int((z - a) * SR)
    tt = np.arange(rn) / SR
    add(mus, a, bp(rng.uniform(-1, 1, rn), 400, 8000) * (tt / tt[-1]) ** 2, 0.35)
    imp = int(2.0 * SR)
    ti = np.arange(imp) / SR
    add(mus, z, np.sin(2 * np.pi * np.cumsum(55 + 60 * np.exp(-ti * 8)) / SR) * np.exp(-ti * 2.2), 1.4)
    add(mus, z, wash(2.0), 0.9)
    groove(z + 0.35, pile["enter"], lambda _t: 5, hot=True)

    # ---- every roll: slot-counter ticks that accelerate into the landing
    for b in beats:
        a, z = b["rampStart"], b["landing"]
        t = a
        i = 0
        while t < z - 0.03:
            x = (t - a) / max(0.01, z - a)
            add(mus, t, blip(1500 + 900 * x, 0.025), 0.28)
            t += 0.11 - 0.07 * x
            i += 1

    # ---- every landing: reveal arpeggio, higher per tier, + cymbal wash
    for k, b in enumerate(beats):
        if b["art"] in ("powerball",):
            continue
        root = 62 + min(k, 6) * 2
        for j, iv in enumerate((0, 4, 7, 12)):
            add(mus, b["landing"] + j * 0.06, bell(root + iv), 0.32)
        add(mus, b["landing"], wash(1.0), 0.35)
    tok = by_art.get("token")
    if tok:  # the token is the star: a legendary fanfare
        add(mus, tok["landing"] + 0.05, brass([62, 66, 69, 74], 1.2), 0.45)

    # ---- sting: bright major bounce under the coin pile
    t = pile["enter"]
    k = 0
    mel = [74, 78, 81, 86, 81, 78]
    while t < end - 0.3:
        add(mus, t, kick(0.8) if k % 2 == 0 else clap() * 0.6)
        add(mus, t, bell(mel[k % 6], 0.3), 0.3)
        if k % 2 == 0:
            add(mus, t, brass([62, 66, 69], BEAT * 0.5), 0.3)
        t += BEAT / 2
        k += 1
    fade = int(0.6 * SR)
    mus[-fade:] *= np.linspace(1, 0, fade)

    # ---- duck under narration
    duck = np.ones(n)
    for w in plan["words"]:
        a, z = int((w["start"] - 0.05) * SR), int((w["end"] + 0.15) * SR)
        duck[max(0, a):max(0, z)] = 0.5
    kk = int(0.05 * SR)
    mus *= np.convolve(duck, np.ones(kk) / kk, mode="same")
    mus = hp(mus, 30)
    mus = mus / (np.max(np.abs(mus)) + 1e-9) * 0.89
    st = np.stack([mus, np.roll(mus, int(0.011 * SR)) * 0.96], axis=1)
    os.makedirs(os.path.join(ROOT, "public", "music"), exist_ok=True)
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(st, -1, 1) * 32767).astype("<i2").tobytes())

    def rms(a, z):
        seg = mus[int(a * SR):int(z * SR)]
        return 20 * math.log10(math.sqrt(float(np.mean(seg ** 2))) + 1e-9)
    print(f"-> {path} ({end:.1f}s)")
    secs = [("hook", 0, t0), ("ladder", t0, t_catch), ("catch", t_catch, fin["rampStart"]),
            ("drop", fin["landing"], pile["enter"]), ("sting", pile["enter"], end)]
    print("  " + "  ".join(f"{nm}:{rms(a, z):.1f}dB" for nm, a, z in secs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
