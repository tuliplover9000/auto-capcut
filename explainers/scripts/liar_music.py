"""ORIGINAL backing track for the SPOT THE LIAR episode (derived from blood_music.py), on the hype.py master.

    node scripts/story-plan.ts episodes/<id>.json
    python scripts/chain_music.py episodes/<id>.json -> public/music/<id>.wav

  hook: impact + sneaky pluck groove, hit on "starts" ->
  search: playful pizzicato groove that gets busier as the chain builds, IMPACT on the splat
  (world-time T_SPLAT after the countdown starts) -> "too late": sad fall ->
  rewind: tape-stop + reversed riser -> trace: one stab per link, each a step higher
  (a domino run) -> map: build -> "six": impact + brass -> "blue": stop + chord sting.
Loud and never silent (user feedback 2026-11-14: quiet music = no engagement).
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hype import (SR, add, bass_note, bell, brass, clap, crash, hat, impact, kick, master,  # noqa: E402
                  noise_riser, pluck, rms_db, sidechain, snare, supersaw, tape_stop, tom)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F_MAJ = ([[65, 69, 72], [62, 65, 69], [67, 70, 74], [60, 64, 67]], [41, 38, 43, 36])
D_MIN = ([[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]], [38, 34, 36, 33])
CREEP = [62, None, 65, None, 69, None, 68, None, 69, None, 65, None, 62, None, None, 61,
         62, None, 65, None, 70, None, 69, None, 65, None, 64, None, 61, None, None, None]
PULSE = [74, None, 74, 74, None, 74, 77, None, 74, None, 74, 76, None, 77, 79, None,
         81, None, 81, 81, None, 79, 77, None, 76, None, 77, 79, None, 81, 82, None]
SNEAK = [65, None, 69, None, 65, None, 72, None, 70, None, 69, None, 67, None, 65, None,
         64, None, 67, None, 64, None, 70, None, 69, None, 67, None, 64, None, None, None]
BOUNCE = [77, None, 72, 74, None, 72, 69, None, 72, None, 74, 77, None, 79, 77, None,
          76, None, 72, 74, None, 72, 67, None, 69, None, 72, 74, None, 76, None, None]
TEST = 10


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    E = {e["kind"]: e["t"] for e in plan["events"]}
    LS = plan["lineStarts"]
    LE = plan["lineEnds"]
    end = plan["end"] + 0.6
    n = int(end * SR)
    drums, bass, chords, lead, fx = (np.zeros(n) for _ in range(5))
    kicks = []
    BEAT = 60 / 118
    S16 = BEAT / 4
    t_test = LE[6] + 0.05

    def groove(a, z, lv, key=D_MIN, riff=None, half=False, gain=1.0, up=0, pizz=False, toms=False):
        chs, rts = key
        s = 0
        t = a
        while t < z - 1e-6:
            bar, sub = divmod(s, 16)
            beat, q = divmod(sub, 4)
            ch, rt = chs[bar % 4], rts[bar % 4]
            if (q == 0 and not half) or (half and sub in (0, 10)):
                add(drums, t, kick(0.95 * gain))
                kicks.append(t)
            if (not half and q == 0 and beat in (1, 3)) or (half and sub == 8):
                add(drums, t, clap(0.7 * gain))
                add(drums, t, snare(0.4 * gain))
            if toms and q in (2, 3) and beat in (1, 3):
                add(drums, t, tom(80 + 20 * q, 0.45 * gain))
            if not half or q == 2:
                add(drums, t, hat(open_=(q == 2), g=(0.36 if q == 2 else 0.2 + 0.12 * lv) * gain))
            if q in ((0, 2) if not half else (0,)):
                add(bass, t, bass_note(rt - 12 + (12 if q == 2 else 0), S16 * (1.6 if not half else 3.5), 450 + 1100 * lv, drive=1.5), 0.55 * gain)
            if pizz and q in (0, 2):
                add(chords, t, pluck(ch[(sub // 2) % len(ch)] - 12, 0.16, 1600), 0.5 * gain)
            elif q == 2 and not half:
                add(chords, t, supersaw(ch, BEAT * 0.4, 1500 + 3500 * lv), (0.22 + 0.12 * lv) * gain)
            if riff:
                m = riff[s % 32]
                if m is not None:
                    add(lead, t, pluck(m + up, 0.22, 4800 if lv > 0.5 else 2600), 0.3 * gain)
            s += 1
            t = a + s * S16

    def gap(t0, d=0.12):
        for buf in (drums, bass, chords, lead):
            buf[int((t0 - d) * SR):int(t0 * SR)] = 0

    def stab(t, notes=(50, 57, 62), g=0.7):
        add(chords, t, brass(list(notes), 0.45), g)

    # ---- hook: impact, a sneaky pizz groove
    add(fx, 0.0, impact(1.2), 0.7)
    add(fx, 0.0, crash(1.4), 0.4)
    groove(0.05, LS[1] - 0.3, 0.5, D_MIN, CREEP, pizz=True, half=True)
    add(fx, LS[1] - 0.9, noise_riser(0.6), 0.4)
    gap(LS[1] - 0.3, 0.08)
    add(fx, LS[1] - 0.3, impact(1.0), 0.6)

    # ---- myths: half-time, then a MYTH hit
    groove(LS[1] - 0.2, E["myth"] - 0.05, 0.5, D_MIN, CREEP, pizz=True, half=True, gain=0.85)
    gap(E["myth"], 0.1)
    add(fx, E["myth"], impact(1.4), 0.85)
    add(chords, E["myth"], brass([38, 45, 50, 53], 0.6), 0.8)
    # ---- the real signs: driving groove, a climbing stab per reveal
    groove(E["myth"] + 0.3, LS[6] - 0.1, 0.65, D_MIN, CREEP, pizz=True, gain=0.9)
    for j, k in enumerate(("trick", "back", "mem", "clean", "built", "slip", "moves", "changes")):
        stab(E[k], (50 + j, 57 + j, 62 + j), 0.55)
        add(lead, E[k], bell(79 + j, 0.5), 0.22)

    # ---- the test: slam, then a tense ticking pulse that climbs
    gap(E["test"], 0.1)
    add(fx, E["test"], impact(1.6), 0.95)
    add(fx, E["test"], crash(1.6), 0.5)
    stab(E["test"], (38, 45, 50, 53), 0.85)
    groove(E["test"] + 0.3, t_test, 0.5, D_MIN, None, half=True, gain=0.8)
    groove(t_test, t_test + TEST, 0.9, D_MIN, PULSE, toms=True, gain=0.95)
    add(fx, t_test + 3.5, impact(0.8), 0.5)
    add(fx, t_test + TEST - 1.6, noise_riser(1.6), 0.55)
    for buf in (drums, bass, chords, lead):
        tape_stop(buf, t_test + TEST - 0.05, t_test + TEST + 0.25)

    # ---- the answer
    gap(E["answer"], 0.15)
    add(fx, E["answer"], impact(1.6), 1.0)
    add(fx, E["answer"], crash(2.0), 0.55)
    add(chords, E["answer"], brass([38, 45, 50, 54, 57], 0.8), 0.9)
    groove(E["answer"] + 0.4, E["a"] - 0.05, 0.8, D_MIN, CREEP, toms=True, up=12, gain=0.9)
    stab(E["drove"], (52, 59, 64), 0.55)
    stab(E["bus"], (54, 61, 66), 0.6)

    # ---- the twist: drop, creep, TRUTH hit
    gap(E["a"], 0.25)
    for j, m in enumerate([74, 77, 81]):
        add(lead, E["a"] + j * 0.12, bell(m, 1.0), 0.3)
    groove(E["a"] + 0.2, E["truth"] - 0.05, 0.45, D_MIN, CREEP, half=True, pizz=True, gain=0.8)
    add(fx, E["truth"] - 0.8, noise_riser(0.8), 0.5)
    gap(E["truth"], 0.1)
    add(fx, E["truth"], impact(1.5), 0.95)
    add(chords, E["truth"], brass([38, 45, 50, 54, 57], 0.8), 0.85)
    groove(E["truth"] + 0.4, E["pct"] - 0.05, 0.7, D_MIN, CREEP, toms=True, gain=0.85)
    add(fx, E["pct"] - 1.2, noise_riser(1.2), 0.55)

    # ---- 54% hit, coin flip, ride out
    gap(E["pct"], 0.12)
    add(fx, E["pct"], impact(1.8), 1.0)
    add(fx, E["pct"], crash(2.0), 0.6)
    add(chords, E["pct"], brass([38, 45, 50, 53, 57, 62], 1.2), 0.95)
    groove(E["pct"] + 0.5, end, 0.6, D_MIN, CREEP, pizz=True, half=True, gain=0.85)
    add(fx, E["coin"] + 1.1, impact(1.2), 0.7)

    sc = sidechain(n, kicks)
    mus = drums + (bass + chords) * sc + lead * (0.6 + 0.4 * sc) + fx
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    out = master(mus, plan["words"], path)
    print(f"-> {path} ({end:.1f}s)")
    print("  " + "  ".join(f"line{i}:{rms_db(out, a, b):.1f}dB" for i, (a, b) in enumerate(zip(plan['lineStarts'], plan['lineEnds']))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
