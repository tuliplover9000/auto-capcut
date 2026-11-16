"""ORIGINAL backing track for an OBSERVATION TEST episode, on the hype.py master.

    node scripts/story-plan.ts episodes/<id>.json
    python scripts/observe_music.py episodes/<id>.json -> public/music/<id>.wav

  hook: impact from frame 0, pulse + riser, hit on "Find" ->
  search (15 s): tense half-time pulse that builds (toms + riser in the last 5 s) ->
  STOP: gap + impact + stab -> rewind: tape-stop + reversed riser ->
  replay: sneaky pluck groove, bells on the dip, hit on "pickpocket", brass on "team" ->
  tip: warm half-time -> lookout: gap + minor stab, ominous toms to the end.
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
D_MIN = ([[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]], [38, 34, 36, 33])
WARM = ([[67, 71, 74, 78], [64, 67, 71, 74], [60, 64, 67, 71], [62, 66, 69, 72]], [43, 40, 36, 38])
SNEAK = [62, None, 65, None, 62, None, 68, 69, None, None, 62, None, 65, None, 69, None,
         67, None, 65, None, 62, None, 61, 62, None, None, 57, None, 59, None, 61, None]
PULSE = [74, None, None, None, 74, None, 77, None, 74, None, None, None, 72, None, 70, None,
         74, None, None, None, 74, None, 77, None, 79, None, 77, None, 76, None, None, None]


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    E = {e["kind"]: e["t"] for e in plan["events"]}
    LS = plan["lineStarts"]
    end = plan["end"] + 0.6
    n = int(end * SR)
    drums, bass, chords, lead, fx = (np.zeros(n) for _ in range(5))
    kicks = []
    BEAT = 60 / 120
    S16 = BEAT / 4
    t_go = plan["lineEnds"][0] + 0.05

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

    # ---- hook: impact at frame 0, pulse, riser into "Find"
    add(fx, 0.0, impact(1.2), 0.7)
    add(fx, 0.0, crash(1.4), 0.35)
    groove(0.05, E["go"], 0.6, D_MIN, PULSE, half=True, toms=True)
    add(fx, E["go"] - 1.2, noise_riser(1.2), 0.45)
    gap(E["go"], 0.1)
    add(fx, E["go"], impact(1.2), 0.8)
    add(chords, E["go"], brass([50, 57, 62, 65], 0.5), 0.75)

    # ---- the 15-second search: tense pulse, builds in the last 5 s
    t_stop = E["stop"]
    mid = t_go + 10
    groove(E["go"] + 0.3, mid, 0.45, D_MIN, PULSE, half=True, gain=0.85)
    groove(mid, t_stop - 0.2, 0.85, D_MIN, PULSE, toms=True, up=12)
    add(chords, t_go, supersaw([50, 53, 57], mid - t_go, 900), 0.22)
    add(fx, t_stop - 5.0, noise_riser(4.9), 0.55)

    # ---- STOP
    gap(t_stop, 0.2)
    add(fx, t_stop, impact(1.8), 1.0)
    add(fx, t_stop, crash(2.0), 0.6)
    add(chords, t_stop, brass([38, 45, 50, 53, 57], 0.9), 0.9)
    groove(t_stop + 0.6, E["rewind"] - 0.1, 0.25, D_MIN, None, half=True, gain=0.6)

    # ---- rewind: tape-stop + a reversed riser
    for buf in (drums, bass, chords, lead):
        tape_stop(buf, E["rewind"] - 0.3, E["rewind"] + 0.05)
    rr = noise_riser(LS[3] - E["rewind"])[::-1].copy()
    add(fx, E["rewind"], rr, 0.55)

    # ---- the replay: sneaky groove
    groove(LS[3], E["thief"], 0.55, D_MIN, SNEAK, pizz=True, gain=0.9)
    add(fx, E["spill"], impact(0.8), 0.5)
    for j, m in enumerate([86, 89, 93]):
        add(lead, E["dip"] + j * 0.09, bell(m, 0.8), 0.3)
    gap(E["thief"], 0.12)
    add(fx, E["thief"], impact(1.4), 0.85)
    add(chords, E["thief"], brass([50, 57, 62, 65], 0.6), 0.85)
    groove(E["thief"] + 0.3, E["team"], 0.8, D_MIN, SNEAK, toms=True, up=12)
    add(fx, E["team"] - 1.0, noise_riser(1.0), 0.45)
    gap(E["team"], 0.12)
    add(fx, E["team"], impact(1.6), 0.95)
    add(fx, E["team"], crash(1.8), 0.55)
    add(chords, E["team"], brass([50, 57, 62, 65, 69], 0.8), 0.9)
    groove(E["team"] + 0.4, LS[8], 0.9, D_MIN, PULSE, up=12)

    # ---- tip: warm half-time
    groove(LS[8], E["lookout"], 0.45, WARM, None, half=True, gain=0.85)

    # ---- lookout: gap + minor stab, ominous toms into the end
    gap(E["lookout"], 0.2)
    add(fx, E["lookout"], impact(1.4), 0.8)
    add(chords, E["lookout"], brass([38, 45, 50, 53], 1.0), 0.85)
    for j, m in enumerate([74, 77, 81]):
        add(lead, E["lookout"] + 0.1 + j * 0.12, bell(m, 1.2), 0.3)
    t, k = E["lookout"] + 0.7, 0
    while t < end:
        add(drums, t, tom(70 + 10 * (k % 3), 0.5))
        add(bass, t, bass_note(26, 0.3, 400, drive=1.6), 0.4)
        t += BEAT / 2
        k += 1
    add(fx, end - 1.6, noise_riser(1.6), 0.4)

    sc = sidechain(n, kicks)
    mus = drums + (bass + chords) * sc + lead * (0.6 + 0.4 * sc) + fx
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    out = master(mus, plan["words"], path)
    print(f"-> {path} ({end:.1f}s)")
    print("  " + "  ".join(f"line{i}:{rms_db(out, a, b):.1f}dB" for i, (a, b) in enumerate(zip(plan['lineStarts'], plan['lineEnds']))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
