"""FLOW music: one smooth, continuous backing track for a flow-narrated episode.

    python scripts/flow_music.py episodes/<id>.json --lead 0.3 --lift four [--lift trick] [--tail 1.2]
    -> public/music/<id>.wav

Why (user, 2026-11-26): the old per-episode tracks hit a stab, tape stop or
genre switch on nearly every cue, which read as choppy. This one keeps ONE key,
ONE tempo and ONE 4-chord loop for the whole video. Energy moves only by
smooth automation (layers fading in, filters opening), with a soft riser
into each --lift word. No stabs, no stops. It stays loud (hype.master), and
master() ducks the voice band under every word so the narration stays clear.
"""
import argparse
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hype import SR, add, clap, crash, env, hat, hp, hz, kick, lp, master, noise_riser, osc_saw, pluck, sidechain  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# A minor, i - VI - III - VII: warm, curious, a little mysterious
CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]
ROOTS = [45, 41, 48, 43]


def pad(ms, d, cut):
    n = int(d * SR)
    x = sum(osc_saw(hz(m), n, 5, 0.009) for m in ms) / len(ms)
    x += 0.5 * sum(np.sin(2 * np.pi * hz(m - 12) * np.arange(n) / SR) for m in ms[:1])
    return lp(x, cut) * env(n, a=0.35, d=0.4, s=0.85, r=0.7, hold=max(0.05, d - 0.7))


def sub_bass(m, d, cut=320):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * hz(m) * t) * 0.8 + lp(osc_saw(hz(m), n, 2, 0.003), cut) * 0.35
    return x * env(n, a=0.02, d=0.2, s=0.8, r=0.12, hold=max(0.05, d - 0.12))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--lead", type=float, default=0.3, help="seconds of music before the first word")
    ap.add_argument("--tail", type=float, default=1.2)
    ap.add_argument("--bpm", type=float, default=100)
    ap.add_argument("--lift", action="append", default=[], help="word that gets a soft riser + crash (first match)")
    ap.add_argument("--key", default="mystery", choices=["mystery", "warm"], help="mystery = Am-F-C-G, warm = C-G-Am-F (heartwarming stories)")
    a = ap.parse_args()
    global CHORDS, ROOTS
    if a.key == "warm":
        CHORDS = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]]
        ROOTS = [48, 43, 45, 41]
    ep = json.load(open(a.episode, encoding="utf-8"))
    tm = json.load(open(a.episode.replace(".json", ".timing.json"), encoding="utf-8"))
    # absolute word times (flow timing: each line file starts at its takeStart)
    words, t0, gap = [], a.lead, 0.0
    for ln in tm["lines"]:
        gap += ln.get("pauseBefore", 0.0)  # e.g. the 10 s test window: music keeps playing through it
        base = a.lead + gap + ln.get("takeStart", 0.0) if tm.get("flow") else t0
        for w in ln["words"]:
            words.append({"text": w["text"], "start": base + w["start"], "end": base + w["end"]})
        t0 = base + ln["duration"]
    end = words[-1]["end"] + a.tail
    n = int(end * SR)
    norm = lambda s: "".join(ch for ch in s.lower() if ch.isalnum())  # noqa: E731
    lifts = sorted(next(w["start"] for w in words if norm(w["text"]) == norm(x)) for x in a.lift)
    # intensity: start medium, build steadily, step up after each lift, ease off at the end
    def inten(t):
        base = 0.45 + 0.35 * min(1, t / max(1, end * 0.75))
        for L in lifts:
            if t >= L:
                base += 0.12
        if t > end - 1.5:
            base *= max(0.3, (end - t) / 1.5)
        return min(1.0, base)

    beat = 60 / a.bpm
    bar = beat * 4
    drums, bass, pads, arp, fx = (np.zeros(n) for _ in range(5))
    kicks = []
    b = 0
    while b * bar < end:
        ts = b * bar
        ch, rt = CHORDS[b % 4], ROOTS[b % 4]
        lv = inten(ts)
        add(pads, ts, pad(ch, bar + 0.7, 700 + 2600 * lv), 0.42)
        for half in (0, 1):
            add(bass, ts + half * 2 * beat, sub_bass(rt - 12, 2 * beat), 0.55)
        for k in range(8):  # 8th-note arpeggio, fades in with intensity
            t = ts + k * beat / 2
            li = inten(t)
            if li > 0.5:
                m = (ch + [ch[1] + 12])[[0, 1, 2, 3, 2, 1, 2, 3][k]] + 12
                add(arp, t, pluck(m, 0.28, 1800 + 3000 * li), 0.16 * (li - 0.4) / 0.6)
        for q in range(16):  # drums on a 16th grid
            t = ts + q * beat / 4
            li = inten(t)
            four = li > 0.72
            if q in ((0, 4, 8, 12) if four else (0, 8)):
                add(drums, t, kick(0.75 + 0.2 * li))
                kicks.append(t)
            if q in (4, 12) and li > 0.38:
                add(drums, t, clap(0.45 * li))
            if q % 2 == 0:
                add(drums, t, hat(open_=(q % 4 == 2 and li > 0.6), g=0.1 + 0.14 * li))
            elif li > 0.6:
                add(drums, t, hat(g=0.05 + 0.05 * li))
        b += 1
    for L in lifts:  # soft lift: riser into the word, light crash on it
        add(fx, L - 1.4, noise_riser(1.4, 600, 7000), 0.12)
        add(fx, L, crash(1.8), 0.25)
    sc = sidechain(n, kicks, depth=0.35, rate=9)
    mus = drums + (bass + pads + arp) * sc + fx
    out = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    master(mus, words, out)
    print(f"-> {out}  ({end:.1f}s, {a.bpm:.0f} bpm, lifts at {[round(x, 2) for x in lifts]})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
