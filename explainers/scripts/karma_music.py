"""ORIGINAL backing track for CHAIN REACTION #2 (karma, 10 links), on the hype.py master.

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
SNEAK = [65, None, 69, None, 65, None, 72, None, 70, None, 69, None, 67, None, 65, None,
         64, None, 67, None, 64, None, 70, None, 69, None, 67, None, 64, None, None, None]
BOUNCE = [77, None, 72, 74, None, 72, 69, None, 72, None, 74, 77, None, 79, 77, None,
          76, None, 72, 74, None, 72, 67, None, 69, None, 72, 74, None, 76, None, None]
T_SPLAT = 12.8
SEARCH = 15


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
    BEAT = 60 / 124
    S16 = BEAT / 4
    t_go = plan["lineEnds"][0] + 0.05
    t_splat = t_go + T_SPLAT

    def groove(a, z, lv, key=F_MAJ, riff=None, half=False, gain=1.0, up=0, pizz=False, toms=False):
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

    # ---- hook
    add(fx, 0.0, impact(1.0), 0.6)
    groove(0.05, E["go"], 0.5, F_MAJ, SNEAK, pizz=True, half=True)
    add(fx, E["go"] - 1.0, noise_riser(1.0), 0.4)
    gap(E["go"], 0.1)
    add(fx, E["go"], impact(1.0), 0.7)

    # ---- the search (15 s): playful, busier as the chain runs, IMPACT on the splash
    groove(E["go"] + 0.2, t_go + 4.0, 0.5, F_MAJ, SNEAK, pizz=True)
    groove(t_go + 4.0, t_go + 8.0, 0.75, F_MAJ, BOUNCE, toms=False)
    groove(t_go + 8.0, t_splat - 0.15, 0.95, F_MAJ, BOUNCE, toms=True, up=12)
    add(fx, t_splat - 1.4, noise_riser(1.4), 0.5)
    gap(t_splat, 0.15)
    add(fx, t_splat, impact(1.8), 1.0)
    add(fx, t_splat, crash(2.0), 0.6)
    add(chords, t_splat, brass([41, 48, 53, 57, 60], 0.8), 0.85)
    groove(t_splat + 0.5, E["late"] - 0.1, 0.4, D_MIN, None, half=True, gain=0.75)

    # ---- too late: sad fall
    for j, m in enumerate([72, 70, 69, 65]):
        add(lead, E["late"] + j * 0.15, pluck(m, 0.3, 2500), 0.45)
    groove(E["late"] + 0.6, E["rewind"] - 0.1, 0.3, D_MIN, None, half=True, gain=0.6)

    # ---- rewind
    for buf in (drums, bass, chords, lead):
        tape_stop(buf, E["rewind"] - 0.3, E["rewind"] + 0.05)
    add(fx, E["rewind"], noise_riser(LS[3] - E["rewind"])[::-1].copy(), 0.55)

    # ---- trace back: groove + a stab per link, climbing like dominoes (10 of them)
    groove(LS[3], E["throw"] - 0.1, 0.65, F_MAJ, SNEAK, pizz=True, gain=0.9)
    for j, k in enumerate(["l10", "l9", "l8", "l7", "l6", "l5", "l4", "l3", "l2", "l1"]):
        add(chords, E[k], brass([53 + j, 60 + j], 0.32), 0.55)
        add(lead, E[k], bell(84 + j, 0.5), 0.22)

    # ---- the twist: tension under "thrown by...", impact on "same"
    add(fx, E["throw"] - 0.1, noise_riser(E["same"] - E["throw"] + 0.1), 0.55)
    groove(E["throw"], E["same"] - 0.05, 0.4, D_MIN, None, half=True, gain=0.7)
    gap(E["same"], 0.1)
    add(fx, E["same"], impact(1.6), 0.95)
    add(fx, E["same"], crash(1.6), 0.5)
    add(chords, E["same"], brass([38, 45, 50, 53, 57], 0.9), 0.85)
    groove(E["same"] + 0.6, E["map"] - 0.05, 0.5, D_MIN, None, half=True, gain=0.7)

    # ---- the map: build into "ten"
    groove(E["map"], E["ten"] - 0.05, 0.9, F_MAJ, BOUNCE, toms=True, up=12)
    gap(E["ten"], 0.1)
    add(fx, E["ten"], impact(1.4), 0.9)
    add(chords, E["ten"], brass([41, 48, 53, 57, 60], 0.7), 0.85)
    groove(E["ten"] + 0.3, E["karma"] - 0.05, 0.9, F_MAJ, BOUNCE, up=12)

    # ---- karma: stop + chord sting, bell on "seconds", bouncy tail
    gap(E["karma"], 0.2)
    add(fx, E["karma"], impact(1.2), 0.7)
    add(chords, E["karma"], brass([41, 48, 53, 57, 62], 1.0), 0.85)
    for j, m in enumerate([77, 81, 84]):
        add(lead, E["secs"] + j * 0.12, bell(m, 1.2), 0.32)
    groove(E["karma"] + 0.6, end, 0.55, F_MAJ, SNEAK, pizz=True, half=True, gain=0.85)

    sc = sidechain(n, kicks)
    mus = drums + (bass + chords) * sc + lead * (0.6 + 0.4 * sc) + fx
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    out = master(mus, plan["words"], path)
    print(f"-> {path} ({end:.1f}s)")
    print("  " + "  ".join(f"line{i}:{rms_db(out, a, b):.1f}dB" for i, (a, b) in enumerate(zip(plan['lineStarts'], plan['lineEnds']))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
