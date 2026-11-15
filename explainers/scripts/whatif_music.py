"""ORIGINAL backing track for a What-If episode (asteroid missed), on the hype.py master.

    node scripts/story-plan.ts episodes/<id>.json
    python scripts/whatif_music.py episodes/<id>.json -> public/music/<id>.wav

Follows the scenes (plan.cuts) and pins hits to events:
  space: ominous toms + riser from frame 0, IMPACT on "missed", drop into a groove ->
  you: tape-stop on "born" -> jungle: minor tribal groove, impact on the stomp ->
  real: riser into the extinction hit on "cleared", then a major groove + brass on "big" ->
  alt: minor half-time, sad fall on "tiny" -> troodon: record-scratch tape-stop on
  "twist", sneaky pluck riff, bells on "smarter" -> lab: build, gap, big hit on
  "Dinosauroid" -> today: chill groove, stop + chord on "you", riser into the loop.
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
A_MIN = ([[69, 72, 76], [65, 69, 72], [67, 71, 74], [64, 67, 71]], [45, 41, 43, 40])
C_MAJ = ([[72, 76, 79], [67, 71, 74], [69, 72, 76], [65, 69, 72]], [48, 43, 45, 41])
WARM = ([[67, 71, 74, 78], [64, 67, 71, 74], [60, 64, 67, 71], [62, 66, 69, 72]], [43, 40, 36, 38])
RIFF_MIN = [81, None, None, 76, None, 77, 76, None, 72, None, 76, None, 77, None, 79, None,
            81, None, None, 84, None, 83, 81, None, 79, None, 76, None, 72, None, None, None]
RIFF_MAJ = [84, None, 79, None, 76, 79, 84, None, 86, None, 84, None, 83, None, 79, None,
            81, None, 77, None, 74, 77, 81, None, 83, None, 79, None, 84, None, None, None]
SNEAK = [69, None, 72, None, 69, None, 75, 76, None, None, 69, None, 72, None, 76, None,
         74, None, 72, None, 69, None, 68, 69, None, None, 64, None, 66, None, 68, None]


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    E = {e["kind"]: e["t"] for e in plan["events"]}
    cut = {c["to"]: c["t"] for c in plan["cuts"]}
    end = plan["end"] + 0.6
    n = int(end * SR)
    drums, bass, chords, lead, fx = (np.zeros(n) for _ in range(5))
    kicks = []
    BEAT = 60 / 124
    S16 = BEAT / 4

    def groove(a, z, lv, key=A_MIN, riff=None, half=False, gain=1.0, up=0, pizz=False, toms=False):
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
                add(drums, t, clap(0.75 * gain))
                add(drums, t, snare(0.4 * gain))
            if toms and q in (2, 3) and beat in (1, 3):
                add(drums, t, tom(90 + 20 * q, 0.45 * gain))
            if not half or q == 2:
                add(drums, t, hat(open_=(q == 2), g=(0.4 if q == 2 else 0.22 + 0.12 * lv) * gain))
            if q in ((0, 2) if not half else (0,)):
                add(bass, t, bass_note(rt - 12 + (12 if q == 2 else 0), S16 * (1.6 if not half else 3.5), 500 + 1200 * lv, drive=1.4), 0.5 * gain)
            if pizz and q in (0, 2):
                add(chords, t, pluck(ch[(sub // 2) % len(ch)] - 12, 0.16, 1800), 0.5 * gain)
            elif q == 2 and not half:
                add(chords, t, supersaw(ch, BEAT * 0.4, 1800 + 4000 * lv), (0.24 + 0.12 * lv) * gain)
            if riff:
                m = riff[s % 32]
                if m is not None:
                    add(lead, t, pluck(m + up, 0.22, 5200 if lv > 0.5 else 2800), 0.3 * gain)
            s += 1
            t = a + s * S16

    def gap(t0, d=0.12):
        for buf in (drums, bass, chords, lead):
            buf[int((t0 - d) * SR):int(t0 * SR)] = 0

    # ---- space: ominous from frame 0 (toms speed up), impact on "missed"
    add(fx, 0.0, impact(1.0), 0.5)
    t, k = 0.0, 0
    while t < E["miss"] - 0.05:
        add(drums, t, tom(70 + 10 * (k % 3), 0.55))
        add(bass, t, bass_note(33, 0.3, 400, drive=1.6), 0.45)
        t += max(S16, BEAT * (1 - t / E["miss"]))
        k += 1
    add(chords, 0.0, supersaw([57, 60, 64], E["miss"], 1200), 0.35)
    add(fx, E["miss"] - 1.4, noise_riser(1.4), 0.5)
    gap(E["miss"])
    add(fx, E["miss"], impact(1.6), 0.9)
    add(fx, E["miss"], crash(1.8), 0.55)
    add(chords, E["miss"], brass([45, 52, 57, 60], 0.6), 0.8)
    groove(E["miss"] + 0.15, E["poof"], 0.8, A_MIN, RIFF_MIN)

    # ---- "born": tape-stop, a stab, then the jungle
    for buf in (drums, bass, chords, lead):
        tape_stop(buf, E["poof"] - 0.25, E["poof"] + 0.15)
    add(fx, E["poof"] + 0.1, impact(0.8), 0.5)
    groove(E["poof"] + 0.3, cut["jungle"], 0.3, A_MIN, None, half=True, gain=0.8)

    # ---- jungle: minor tribal groove, impact on the stomp
    groove(cut["jungle"], cut["real"], 0.6, A_MIN, RIFF_MIN, pizz=True, toms=True, gain=0.9)
    add(lead, E["shrew"], bell(88), 0.35)
    add(lead, E["shrew"] + 0.12, bell(93), 0.3)
    gap(E["stomp"], 0.1)
    add(fx, E["stomp"], impact(1.4), 0.9)

    # ---- real life: riser into the extinction hit, then the mammals' major groove
    groove(cut["real"], E["clear"], 0.5, A_MIN, None, half=True, toms=True)
    add(fx, E["clear"] - 1.6, noise_riser(1.6), 0.6)
    gap(E["clear"], 0.15)
    add(fx, E["clear"], impact(2.0), 1.0)
    add(fx, E["clear"], crash(2.2), 0.6)
    add(chords, E["clear"] + 0.3, supersaw([60, 64, 67, 72], 1.2, 2500), 0.35)
    groove(E["clear"] + 0.9, cut["alt"], 0.9, C_MAJ, RIFF_MAJ)
    add(chords, E["grow"], brass([48, 55, 60, 64], 0.6), 0.9)
    add(fx, E["grow"], crash(1.4), 0.5)

    # ---- the alternate timeline: minor half-time, sad fall on "tiny"
    groove(cut["alt"], cut["troodon"], 0.6, A_MIN, RIFF_MIN, half=True, toms=True)
    add(chords, E["alt"], brass([45, 52, 57], 0.5), 0.7)
    for j, m in enumerate([76, 74, 72, 69]):
        add(lead, E["stay"] + j * 0.16, pluck(m, 0.3, 2500), 0.4)

    # ---- the twist: record-scratch, sneaky riff, bells on "smarter"
    for buf in (drums, bass, chords, lead):
        tape_stop(buf, E["twist"] - 0.3, E["twist"] + 0.1)
    groove(E["twist"] + 0.3, cut["lab"], 0.45, A_MIN, SNEAK, pizz=True, gain=0.9)
    for j, m in enumerate([84, 88, 91, 96]):
        add(lead, E["smart"] + j * 0.08, bell(m, 0.8), 0.32)

    # ---- the lab: build, gap, the reveal hit
    groove(cut["lab"], E["unveil"], 0.5, A_MIN, SNEAK, gain=0.9)
    groove(E["unveil"], E["name"], 0.95, A_MIN, RIFF_MIN, toms=True)
    add(fx, E["name"] - 1.3, noise_riser(1.3), 0.55)
    gap(E["name"], 0.15)
    add(fx, E["name"], impact(1.8), 0.95)
    add(fx, E["name"], crash(2.0), 0.6)
    add(chords, E["name"], brass([48, 55, 60, 64, 67], 0.8), 0.9)
    groove(E["name"] + 0.4, cut["today"], 1.0, C_MAJ, RIFF_MAJ, up=12)

    # ---- today: chill groove, stop + chord on "you", riser into the loop
    groove(cut["today"], E["sting"], 0.45, WARM, RIFF_MAJ, half=True, gain=0.85, up=-5)
    gap(E["sting"], 0.2)
    add(fx, E["sting"], impact(1.2), 0.6)
    add(chords, E["sting"], brass([45, 52, 57, 60, 64], 1.0), 0.85)
    for j, m in enumerate([81, 84, 88]):
        add(lead, E["sting"] + 0.1 + j * 0.12, bell(m, 1.2), 0.32)
    t, k = E["sting"] + 0.8, 0
    while t < end:
        add(drums, t, tom(70 + 10 * (k % 3), 0.5))
        add(bass, t, bass_note(33, 0.3, 400, drive=1.6), 0.4)
        t += BEAT
        k += 1
    add(fx, end - 1.8, noise_riser(1.8), 0.45)

    sc = sidechain(n, kicks)
    mus = drums + (bass + chords) * sc + lead * (0.6 + 0.4 * sc) + fx
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    out = master(mus, plan["words"], path)
    print(f"-> {path} ({end:.1f}s)")
    print("  " + "  ".join(f"line{i}:{rms_db(out, a, b):.1f}dB" for i, (a, b) in enumerate(zip(plan['lineStarts'], plan['lineEnds']))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
