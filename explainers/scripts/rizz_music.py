"""ORIGINAL backing track for the "Rizz Meter" voice-over skit, on the hype.py master.

    node scripts/story-plan.ts episodes/rizz-meter.json
    python scripts/rizz_music.py episodes/rizz-meter.json -> public/music/rizz-meter.wav

A bed for friends to talk over (the master ducks the voice band under every
line): sleepy then bouncy at home, a strutting groove for the street lessons
(stops dead on THUD and BONK), sneaky lo-fi in the park, an alarm for RIZZ
CRITICAL, warm pads for the confession, fireworks swell on the yes, then the
upbeat ending with a crash for Bolt's -900. Times in plan.json are STORY time.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hype import (SR, add, bass_note, bell, brass, clap, crash, hat, impact, kick, master,  # noqa: E402
                  noise_riser, pluck, sidechain, snare, supersaw, tape_stop)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POP = ([[67, 71, 74], [64, 67, 71], [60, 64, 67], [62, 66, 69]], [43, 40, 36, 38])  # G I-vi-IV-V
FUNK = ([[64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71], [62, 65, 69, 72]], [40, 38, 36, 38])
LOFI = ([[62, 65, 69, 72], [60, 64, 67, 71], [58, 62, 65, 69], [57, 60, 64, 67]], [38, 36, 34, 33])
WARM = ([[67, 71, 74, 78], [64, 67, 71, 74], [60, 64, 67, 71], [62, 66, 69, 72]], [43, 40, 36, 38])
RIFF = [79, None, 74, None, 76, None, 79, 81, None, 79, None, 76, 74, None, 71, None,
        72, None, 76, None, 79, None, 81, 83, None, 81, None, 79, 78, None, 74, None]
STRUT = [76, None, None, 76, 79, None, 76, None, 74, None, 72, None, 74, None, None, None,
         76, None, None, 76, 79, None, 81, None, 79, None, 76, None, 74, None, None, None]
LOFI_RIFF = [74, None, None, 72, None, 69, None, None, 72, None, 74, None, None, 77, None, None,
             76, None, None, 72, None, 71, None, None, 67, None, 69, None, None, None, None, None]


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    tim = json.load(open(ep_path.replace(".json", ".timing.json"), encoding="utf-8"))
    I = ep["intro"]
    LS = [x + I for x in plan["lineStarts"]]
    LE = [x + I for x in plan["lineEnds"]]
    cut = {c["to"]: c["t"] + I for c in plan["cuts"]}
    end = I + plan["end"] + ep["outro"] + 0.3
    n = int(end * SR)
    drums, bass, chords, lead, fx = (np.zeros(n) for _ in range(5))
    kicks = []

    def wt(i, w):
        for x in tim["lines"][i]["words"]:
            if x["text"].lower().strip(".,!?").startswith(w):
                return LS[i] + x["start"]
        return LS[i]

    def groove(a, z, lv, key=POP, riff=None, bpm=104, drums_on=True, half=False, gain=1.0, pad=False):
        beat = 60 / bpm
        s16 = beat / 4
        chs, rts = key
        s = 0
        t = a
        while t < z - 1e-6:
            bar, sub = divmod(s, 16)
            b, q = divmod(sub, 4)
            ch, rt = chs[bar % 4], rts[bar % 4]
            if drums_on:
                if (q == 0 and not half) or (half and sub in (0, 10)):
                    add(drums, t, kick(0.8 * gain))
                    kicks.append(t)
                if (not half and q == 0 and b in (1, 3)) or (half and sub == 8):
                    add(drums, t, clap(0.55 * gain))
                    add(drums, t, snare(0.3 * gain))
                if q == 2 or (not half and lv > 0.5):
                    add(drums, t, hat(open_=(q == 2), g=(0.3 if q == 2 else 0.15) * gain))
            if q == 0 and (not half or b in (0, 2)):
                add(bass, t, bass_note(rt - 12, s16 * (3.5 if not half else 7), 400 + 900 * lv, drive=1.2), 0.45 * gain)
            if pad and sub == 0:
                add(chords, t, supersaw(ch, beat * 4, 1400 + 1500 * lv), 0.22 * gain)
            elif q == 2 and not half:
                add(chords, t, pluck(ch[0], 0.18, 2400), 0.3 * gain)
                add(chords, t, pluck(ch[1], 0.18, 2400), 0.25 * gain)
            if riff:
                m = riff[s % 32]
                if m is not None:
                    add(lead, t, pluck(m, 0.22, 3600 if lv > 0.5 else 2200), 0.24 * gain)
            s += 1
            t = a + s * s16

    def stop(t0, t1):
        for buf in (drums, bass, chords, lead):
            tape_stop(buf, t0, t1)

    # ---- intro sting (slot-machine bells) + sleepy home
    add(fx, 0.05, impact(1.0), 0.35)
    for j in range(10):
        add(lead, 0.2 + j * 0.13, bell(76 + (j * 7) % 12, 0.15), 0.22)
    for j, m in enumerate([79, 83, 86, 91]):
        add(lead, 1.6 + j * 0.1, bell(m, 1.0), 0.3)
    groove(I - 0.4, LS[1] - 0.3, 0.2, WARM, None, bpm=84, drums_on=False, pad=True, half=True)
    groove(LS[1] - 0.3, LS[6] - 0.9, 0.35, POP, None, half=True)
    add(fx, LS[6] - 0.95, impact(0.8), 0.4)  # Bolt bursts in
    groove(LS[6] - 0.9, cut["street"] - 0.4, 0.6, POP, RIFF)
    add(chords, wt(8, "eighty"), brass([67, 71, 74, 79], 0.6), 0.5)  # "87, baby"
    add(fx, cut["street"] - 0.9, noise_riser(0.9), 0.3)

    # ---- the street: strutting funk; stops dead on THUD and BONK
    fall = LE[14] + 0.2
    groove(cut["street"], fall, 0.6, FUNK, STRUT, bpm=100)
    stop(fall, fall + 0.35)
    add(fx, fall + 0.35, impact(0.9), 0.5)
    groove(LS[16] - 0.3, LE[17], 0.55, FUNK, STRUT, bpm=100)
    stop(LE[17] - 0.05, LE[17] + 0.15)
    add(fx, LE[17], impact(1.0), 0.6)
    groove(LS[19], LS[21] - 1.3, 0.3, FUNK, None, bpm=100, half=True)
    for j, m in enumerate([79, 83, 86, 91, 95]):  # the golden retriever enters: harp-ish sparkle
        add(lead, LS[21] - 1.2 + j * 0.09, bell(m, 0.8), 0.25)
    groove(LS[21] - 1.2, cut["park"] - 0.4, 0.6, FUNK, STRUT, bpm=100)
    add(fx, cut["park"] - 0.9, noise_riser(0.9), 0.3)

    # ---- the park: sneaky lo-fi, each fail knocks it down a notch
    groove(cut["park"], LS[31], 0.4, LOFI, LOFI_RIFF, bpm=88, half=True)
    for t0 in (wt(31, "three"), wt(36, "ten")):
        add(fx, t0, impact(0.6), 0.35)
    groove(LS[31], wt(41, "forty"), 0.5, LOFI, LOFI_RIFF, bpm=88)
    stop(wt(41, "forty"), wt(41, "forty") + 0.3)
    add(fx, wt(41, "forty"), impact(1.2), 0.55)
    t = wt(41, "forty") + 0.2  # RIZZ CRITICAL alarm: two-tone siren bells
    k = 0
    while t < LS[43] - 0.2:
        add(lead, t, bell(84 if k % 2 == 0 else 79, 0.28), 0.22)
        t += 0.3
        k += 1
    groove(LS[43], LS[48], 0.25, WARM, None, bpm=80, drums_on=False, pad=True, half=True)
    add(fx, LS[48] - 0.1, crash(1.2), 0.35)
    groove(LS[48], cut["moment"] - 0.2, 0.6, POP, RIFF)

    # ---- the real moment: warm pads, bells, a drumroll of ticks on "Calculating"
    groove(cut["moment"], LS[50], 0.25, WARM, None, bpm=80, drums_on=False, pad=True, half=True)
    t, k = cut["moment"], 0
    while t < LS[50]:
        add(lead, t, bell([79, 74, 71, 74, 78, 74][k % 6], 0.9), 0.16)
        t += 60 / 80
        k += 1
    add(fx, LS[50], noise_riser(LE[50] - LS[50] + 0.4, 300, 5000), 0.28)
    yes = wt(52, "hundred")
    add(fx, LS[51], crash(1.0), 0.2)
    groove(LS[51], yes, 0.3, WARM, None, bpm=80, drums_on=False, pad=True, half=True)
    add(fx, yes - 1.0, noise_riser(1.0, 300, 6000), 0.3)
    add(fx, yes, impact(1.4), 0.5)
    add(chords, yes, supersaw([67, 71, 74, 79], 2.0, 5000), 0.35)
    groove(yes, cut["end"] - 0.4, 0.8, POP, RIFF, bpm=110)

    # ---- ending: upbeat; Bolt drains (tape stop), BOOM on -900, sting for the dog
    add(fx, cut["end"] - 0.8, noise_riser(0.8), 0.3)
    groove(cut["end"], LS[56], 0.7, POP, RIFF)
    stop(LS[56], LE[56])
    nine = wt(57, "nine")
    add(fx, nine, impact(1.6), 0.7)
    add(fx, nine, crash(1.6), 0.4)
    groove(LS[58], LS[59] - 1.5, 0.3, POP, None, half=True)
    for j, m in enumerate([79, 83, 86, 91, 95]):
        add(lead, LS[59] - 1.4 + j * 0.09, bell(m, 0.8), 0.25)
    groove(LS[59] - 1.4, wt(59, "hundred"), 0.6, FUNK, STRUT, bpm=100)
    add(chords, wt(59, "hundred"), brass([55, 62, 67, 71, 74], 1.4), 0.6)
    groove(wt(59, "hundred") + 0.3, end, 0.7, POP, RIFF)

    sc = sidechain(n, kicks, depth=0.5)
    mus = drums + (bass + chords) * sc + lead * (0.7 + 0.3 * sc) + fx
    words = [{"start": w["start"] + I, "end": w["end"] + I} for w in plan["words"]]
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    master(mus, words, path)
    print(f"-> {path} ({end:.1f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
