"""ORIGINAL backing track for a Story episode (Wojtek), on the hype.py master.

    node scripts/story-plan.ts episodes/<id>.json
    python scripts/story_music.py episodes/<id>.json -> public/music/<id>.wav

Follows the story's scenes (plan.cuts) and pins hits to events:
  parade: snare-roll march from frame 0, brass stab on the reveal ->
  desert/tent: bouncy pizzicato + bells (cub) -> camp: full groove ->
  port: RECORD-SCRATCH tape-stop on "problem", minor pizzicato tension ->
  office: military march, stabs on the stamp/rank -> Monte Cassino: minor toms
  + build -> impact + crash on "never" -> badge: fanfare groove ->
  zoo: warm bells/pads over a soft pulse, swell on "answered", final salute chord.
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
G_MAJ = ([[67, 71, 74], [60, 64, 67], [62, 66, 69], [67, 71, 74]], [43, 36, 38, 43])
E_MIN = ([[64, 67, 71], [60, 64, 67], [62, 67, 71], [59, 62, 66]], [40, 36, 43, 35])
WARM = ([[67, 71, 74, 78], [64, 67, 71, 74], [60, 64, 67, 71], [62, 66, 69, 72]], [43, 40, 36, 38])
RIFF_MAJ = [79, None, 74, None, 71, 74, 79, None, 81, None, 79, None, 78, None, 74, None,
            76, None, 72, None, 69, 72, 76, None, 78, None, 74, None, 79, None, None, None]
RIFF_MIN = [76, None, None, 71, None, 72, 71, None, 67, None, 71, None, 72, None, 74, None,
            76, None, None, 79, None, 78, 76, None, 74, None, 71, None, 67, None, None, None]
MARCH = [74, None, 74, 74, 79, None, 79, None, 83, None, 81, 79, 78, None, 74, None,
         76, None, 76, 76, 81, None, 81, None, 84, None, 83, 81, 79, None, None, None]


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
    BEAT = 60 / 120
    S16 = BEAT / 4

    def groove(a, z, lv, key=G_MAJ, riff=None, half=False, march=False, gain=1.0, up=0, pizz=False):
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
            if march:
                if q in (0, 2) or (beat == 3 and q in (1, 3)):
                    add(drums, t, snare((0.5 if q == 0 else 0.3) * gain))
            elif (not half and q == 0 and beat in (1, 3)) or (half and sub == 8):
                add(drums, t, clap(0.75 * gain))
                add(drums, t, snare(0.4 * gain))
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

    # ---- hook: parade march from frame 0, brass on the reveal
    add(fx, 0.0, impact(1.0), 0.45)
    groove(0.0, cut["desert"], 0.7, G_MAJ, MARCH, march=True)
    t = E["reveal"] - 0.5
    while t < E["reveal"] - 0.02:
        add(drums, t, snare(0.3 + 0.6 * (t - E["reveal"] + 0.5) / 0.5))
        t += S16 / 2
    add(chords, E["reveal"], brass([55, 62, 67, 71], 0.5), 0.8)
    add(fx, E["reveal"], crash(1.4), 0.5)

    # ---- the cub: bouncy pizzicato + bells
    groove(cut["desert"], cut["camp"], 0.35, G_MAJ, RIFF_MAJ, pizz=True, gain=0.9)
    for k in ("handover", "vodka", "name"):
        add(lead, E[k], bell(86), 0.35)
        add(lead, E[k] + 0.12, bell(91), 0.3)
    add(fx, E["name"], impact(0.9), 0.4)

    # ---- camp: full groove (wrestling, beer)
    add(fx, cut["camp"] - 0.8, noise_riser(0.8), 0.35)
    groove(cut["camp"], E["problem"], 0.9, G_MAJ, RIFF_MAJ, up=0)

    # ---- port: record scratch, minor tension until the sign
    for buf in (drums, bass, chords, lead):
        tape_stop(buf, E["problem"] - 0.25, E["problem"] + 0.2)
    groove(E["problem"] + 0.35, E["nopets"], 0.3, E_MIN, RIFF_MIN, pizz=True, half=True, gain=0.85)
    add(fx, E["nopets"], impact(1.0), 0.6)

    # ---- office: military march, stabs on stamp + rank
    groove(cut["office"], cut["cassino"], 0.75, G_MAJ, MARCH, march=True)
    add(chords, E["stamp"], brass([55, 62, 67], 0.3), 0.8)
    add(fx, E["stamp"], crash(1.0), 0.45)
    add(chords, E["rank"], brass([57, 62, 66, 69], 0.3), 0.6)

    # ---- Monte Cassino: minor toms, build into "never", crash
    add(fx, E["boom"], impact(1.8), 0.9)
    groove(cut["cassino"], E["never"], 1.0, E_MIN, RIFF_MIN)
    t = cut["cassino"]
    k = 0
    while t < E["never"]:
        if k % 2 == 0:
            add(drums, t, tom(80 + 30 * (k % 4), 0.5))
        t += S16 * 2
        k += 1
    add(fx, E["never"] - 1.4, noise_riser(1.4), 0.55)
    for buf in (drums, bass, chords, lead):
        buf[int((E["never"] - 0.12) * SR):int(E["never"] * SR)] = 0
    add(fx, E["never"], impact(1.6), 0.9)
    add(fx, E["never"], crash(2.0), 0.6)
    add(chords, E["never"], brass([52, 59, 64, 67], 0.6), 0.7)

    # ---- badge + promotion: triumphant
    groove(E["never"] + 0.6, cut["zoo"], 1.0, G_MAJ, MARCH, up=12, march=True)
    add(chords, E["badge"], supersaw([67, 71, 74, 79], 1.0, 7000), 0.5)
    add(chords, E["promote"], brass([55, 62, 67, 71], 0.5), 0.9)
    add(fx, E["promote"], crash(1.4), 0.5)

    # ---- the zoo: warm and slower-feeling (half-time), swell on "answered", final chord
    for buf in (drums, bass, chords, lead):
        buf[int(cut["zoo"] * SR):] = 0
    groove(cut["zoo"], E["answer"], 0.25, WARM, None, half=True, gain=0.8)
    t = cut["zoo"]
    k = 0
    seq = [79, 74, 71, 74, 78, 74, 71, 67]
    while t < E["answer"]:
        add(lead, t, bell(seq[k % 8], 0.9), 0.28)
        t += BEAT
        k += 1
    add(fx, E["answer"] - 1.2, noise_riser(1.2, 300, 5000), 0.35)
    add(chords, E["answer"], supersaw([55, 62, 67, 71, 74], 1.6, 5000), 0.5)
    groove(E["answer"], E["salute"], 0.6, WARM, RIFF_MAJ, gain=0.9)
    add(fx, E["salute"], impact(1.2), 0.6)
    add(chords, E["salute"], brass([43, 50, 55, 59, 62], 0.9), 0.9)
    for j, m in enumerate([79, 83, 86, 91]):
        add(lead, E["salute"] + 0.1 + j * 0.11, bell(m, 1.2), 0.35)
    groove(E["salute"] + BEAT * 2, end, 0.6, G_MAJ, MARCH, march=True, gain=0.85)

    sc = sidechain(n, kicks)
    mus = drums + (bass + chords) * sc + lead * (0.6 + 0.4 * sc) + fx
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    out = master(mus, plan["words"], path)
    print(f"-> {path} ({end:.1f}s)")
    print("  " + "  ".join(f"line{i}:{rms_db(out, a, b):.1f}dB" for i, (a, b) in enumerate(zip(plan['lineStarts'], plan['lineEnds']))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
