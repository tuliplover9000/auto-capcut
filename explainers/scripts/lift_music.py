"""ORIGINAL backing track for a Lift (balloon ladder) episode, on the hype.py master.

    node scripts/test-odds.ts episodes/balloons-lift.json   (writes the plan)
    python scripts/lift_music.py episodes/balloons-lift.json -> public/music/<id>.wav

C major, 128 BPM, bouncy and loud from frame 0:
  hook      impact + four-on-the-floor + the hook riff -> riser into the first object
  ladder    groove that opens up with every landing; a fill INTO each landing, a crash
            + a bell arpeggio (higher every time) ON it
  finale    snare roll + riser -> IMPACT -> the biggest section, through the helium line
  sting     tape-stop on the pop, silence, then a sad trombone after the splash
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hype import (SR, add, bass_note, bell, brass, clap, crash, hat, hz, impact, kick, master,  # noqa: E402
                  noise_riser, pluck, rms_db, sidechain, snare, supersaw, tape_stop)

BPM = 128
BEAT = 60 / BPM
S16 = BEAT / 4
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHORDS = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]]  # C G/B Am F
ROOTS = [36, 35, 33, 29]
RIFF = [72, None, 76, None, 79, 76, None, 72, 74, None, 72, None, 67, None, None, None,
        72, None, 76, None, 79, 81, None, 79, 76, None, 74, None, 72, None, None, None]


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    timing = json.load(open(ep_path.replace(".json", ".timing.json"), encoding="utf-8"))
    beats = plan["beats"]
    objs = [b for b in beats if b["odds"]]
    fin = objs[-1]
    sl = ep["sting"]
    cue = next(w for w in timing["lines"][sl["line"]]["words"] if w["text"].strip(".,?!").lower() == sl["cue"])
    t_pop = plan["lineStarts"][sl["line"]] + cue["start"]
    end = plan["end"] + 0.5
    n = int(end * SR)
    drums, bass, chords, lead, fx = (np.zeros(n) for _ in range(5))
    kicks = []
    t0 = beats[0]["enter"]
    t_build = fin["rampStart"] - 0.6

    def level(t):
        return sum(1 for b in objs if t >= b["landing"]) / len(objs)

    s = 0
    while True:
        t = s * S16
        if t >= t_pop:
            break
        bar, sub = divmod(s, 16)
        beat, q = divmod(sub, 4)
        s += 1
        if t_build <= t < fin["landing"]:
            continue  # the build has its own roll
        drop = t >= fin["landing"]
        lv = 1.0 if drop else (0.35 if t < t0 else 0.35 + 0.65 * level(t))
        ch, rt = CHORDS[bar % 4], ROOTS[bar % 4]
        if q == 0:
            add(drums, t, kick(1.0))
            kicks.append(t)
        if q == 0 and beat in (1, 3):
            add(drums, t, clap(0.85))
            add(drums, t, snare(0.4))
        add(drums, t, hat(open_=(q == 2), g=0.45 if q == 2 else 0.22 + 0.15 * lv))
        if q in (0, 2):
            add(bass, t, bass_note(rt - 12 + (12 if q == 2 else 0), S16 * 1.8, 500 + 1400 * lv, drive=1.4), 0.55)
        if q == 2:
            add(chords, t, supersaw(ch, BEAT * 0.45, 2200 + 5000 * lv), 0.28 + 0.14 * lv)
        m = RIFF[(s - 1) % 32]
        if m is not None and (t < t0 or lv > 0.5):
            add(lead, t, pluck(m + (12 if drop else 0), 0.2), 0.3)

    add(fx, 0.0, impact(1.2), 0.5)
    rd = min(2.0, t0)
    add(fx, t0 - rd, noise_riser(rd), 0.4)
    # a fill INTO every landing, a crash + bell arpeggio ON it (higher each time)
    for k, b in enumerate(beats):
        z = b["landing"]
        if b is fin:
            continue
        t = z - 0.45
        while t < z - 0.02:
            add(drums, t, snare(0.15 + 0.4 * (t - z + 0.45) / 0.45))
            t += S16 / 2
        add(fx, z, crash(1.5), 0.5)
        root = 72 + min(k, 6) * 2
        for j, iv in enumerate((0, 4, 7, 12)):
            add(lead, z + j * 0.055, bell(root + iv), 0.3)
    # the finale build -> impact
    t = t_build
    while t < fin["landing"] - 0.02:
        x = (t - t_build) / (fin["landing"] - t_build)
        add(drums, t, snare(0.3 + 0.6 * x))
        t += S16 * 2 * (1 - 0.75 * x)
    add(fx, t_build, noise_riser(fin["landing"] - t_build, 300, 10000), 0.6)
    add(fx, fin["landing"], impact(2.0), 0.95)
    kicks.append(fin["landing"])

    sc = sidechain(n, kicks)
    for buf in (drums, bass, chords, lead):
        tape_stop(buf, t_pop, t_pop + 0.5)
        buf[int((t_pop + 0.5) * SR):] = 0
    fx[int((t_pop + 0.2) * SR):] = 0
    # the sad trombone after the splash
    for j, (m, d) in enumerate([(58, 0.32), (57, 0.32), (56, 0.32), (55, 1.1)]):
        tt = t_pop + 1.0 + j * 0.34
        x = brass([m - 12], d, 1400)
        if j == 3:
            vib = np.sin(2 * np.pi * 6 * np.arange(len(x)) / SR)
            x = x * (1 + 0.15 * vib)
        add(lead, tt, x, 0.7)
    mus = drums + (bass + chords) * sc + lead * (0.6 + 0.4 * sc) + fx
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    out = master(mus, plan["words"], path)
    print(f"-> {path} ({end:.1f}s)  pop at {t_pop:.2f}s")
    secs = [("hook", 0, t0), ("ladder", t0, t_build), ("drop", fin["landing"], t_pop), ("sting", t_pop + 0.9, end)]
    print("  " + "  ".join(f"{nm}:{rms_db(out, a, z):.1f}dB" for nm, a, z in secs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
