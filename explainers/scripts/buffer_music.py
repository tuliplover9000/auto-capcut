"""ORIGINAL backing track for the "Buffering" voice-over skit, on the hype.py master.

    node scripts/story-plan.ts episodes/buffering.json
    python scripts/buffer_music.py episodes/buffering.json -> public/music/buffering.wav

A bed for friends to talk over (the master ducks the voice band under every
line): bouncy synth-pop at home, lo-fi plucks at the Charging Station, a
tape-stop into silence for Dex's shutdown, a cheesy jingle for the ad voice,
warm pads (no drums) for the confession, a swell on the yes, upbeat ending.
Every time in plan.json is STORY time; the video adds ep["intro"] in front.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hype import (SR, add, bass_note, bell, brass, clap, crash, hat, impact, kick, master,  # noqa: E402
                  noise_riser, pluck, sidechain, snare, supersaw, tape_stop)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POP = ([[64, 68, 71], [61, 64, 68], [57, 61, 64], [59, 63, 66]], [40, 37, 33, 35])  # E major-ish I-vi-IV-V
LOFI = ([[62, 65, 69, 72], [60, 64, 67, 71], [58, 62, 65, 69], [57, 60, 64, 67]], [38, 36, 34, 33])
WARM = ([[64, 68, 71, 75], [61, 64, 68, 71], [57, 61, 64, 68], [59, 63, 66, 69]], [40, 37, 33, 35])
RIFF = [76, None, 71, None, 73, None, 76, 78, None, 76, None, 73, 71, None, 68, None,
        69, None, 73, None, 76, None, 78, 80, None, 78, None, 76, 75, None, 71, None]
LOFI_RIFF = [74, None, None, 72, None, 69, None, None, 72, None, 74, None, None, 77, None, None,
             76, None, None, 72, None, 71, None, None, 67, None, 69, None, None, None, None, None]


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    I = ep["intro"]
    LS = [x + I for x in plan["lineStarts"]]
    LE = [x + I for x in plan["lineEnds"]]
    cut = {c["to"]: c["t"] + I for c in plan["cuts"]}
    end = I + plan["end"] + ep["outro"] + 0.3
    n = int(end * SR)
    drums, bass, chords, lead, fx = (np.zeros(n) for _ in range(5))
    kicks = []

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

    # ---- intro sting + home (bouncy)
    add(fx, 0.05, impact(1.0), 0.35)
    for j, m in enumerate([76, 80, 83, 88]):
        add(lead, 0.3 + j * 0.12, bell(m, 1.0), 0.3)
    groove(I - 0.6, LS[4], 0.4, POP, None)
    add(fx, LS[4] - 0.05, impact(0.8), 0.4)
    groove(LS[4], LS[12], 0.6, POP, RIFF)
    for buf in (drums, bass, chords, lead):  # "CRITICAL ERROR": stutter-stop
        tape_stop(buf, LS[12] + 1.2, LS[12] + 1.6)
    groove(LS[12] + 1.7, LS[13], 0.3, POP, None, half=True)
    add(chords, LS[13] + 0.6, brass([64, 68, 71, 76], 0.6), 0.6)  # Rizz.exe reveal
    add(fx, LS[13] + 0.6, crash(1.2), 0.35)
    groove(LS[13] + 0.6, LS[21] - 0.5, 0.65, POP, RIFF)
    for buf in (drums, bass, chords, lead):  # record-scratch before "mostly himself"
        tape_stop(buf, LS[21] - 0.75, LS[21] - 0.45)
    groove(LS[21] + 0.6, cut["cafe"] - 0.4, 0.2, POP, None, drums_on=False, half=True)
    add(fx, cut["cafe"] - 0.9, noise_riser(0.9), 0.3)

    # ---- the Charging Station: lo-fi, sneaky
    groove(cut["cafe"], LS[26], 0.35, LOFI, LOFI_RIFF, bpm=88, half=True)
    groove(LS[26], LS[31], 0.45, LOFI, LOFI_RIFF, bpm=88)
    for st_ in (LS[31], LS[34]):  # the robot pickup lines: glitchy bleeps
        for j in range(6):
            add(lead, st_ + j * 0.09, bell(84 + (j * 5) % 12, 0.12), 0.25)
    groove(LS[31], LS[40], 0.6, LOFI, LOFI_RIFF, bpm=88)
    for buf in (drums, bass, chords, lead):  # "shutting down": the music dies with him
        tape_stop(buf, LS[40], LE[40])
    add(fx, LS[41] - 0.9, noise_riser(0.8, 300, 6000), 0.3)
    add(chords, LS[41] - 0.1, supersaw([64, 71, 76], 0.8, 3000), 0.3)  # boot chime chord
    groove(LS[41] + 0.3, LS[46], 0.3, LOFI, None, bpm=88, half=True)
    # ---- commercial jingle
    groove(LS[46], LS[49], 0.8, POP, RIFF, bpm=128)
    for j, m in enumerate([76, 80, 83, 88, 83, 88]):
        add(lead, LS[46] + j * 0.12, bell(m, 0.5), 0.28)
    groove(LS[49], LS[50] - 0.9, 0.5, LOFI, None, bpm=88)
    add(fx, LS[50] - 0.85, impact(1.2), 0.55)  # SMACK
    groove(LS[51], cut["moment"] - 0.6, 0.55, LOFI, LOFI_RIFF, bpm=88)

    # ---- the real moment: warm pads, no drums, bells
    groove(cut["moment"] - 0.3, LS[58], 0.25, WARM, None, bpm=80, drums_on=False, pad=True, half=True)
    t, k = cut["moment"], 0
    while t < LS[58]:
        add(lead, t, bell([76, 71, 68, 71, 75, 71][k % 6], 0.9), 0.16)
        t += 60 / 80
        k += 1
    add(fx, LS[58], crash(1.2), 0.35)
    add(fx, LS[60] - 1.0, noise_riser(1.0, 300, 5000), 0.3)
    add(chords, LS[60], supersaw([64, 68, 71, 76], 2.0, 5000), 0.35)
    groove(LS[60], LS[61], 0.5, WARM, None, bpm=80, pad=True, half=True)
    groove(LS[61], cut["end"] - 0.4, 0.4, WARM, LOFI_RIFF, bpm=96, half=True, pad=True)

    # ---- ending: upbeat, impact on "Bolt", final chord on the toaster line
    add(fx, cut["end"] - 0.8, noise_riser(0.8), 0.3)
    groove(cut["end"], LS[69], 0.7, POP, RIFF)
    groove(LS[69], LS[72], 0.5, POP, None, half=True)
    add(fx, LS[72], impact(1.2), 0.5)
    add(chords, LE[72] + 0.2, brass([52, 59, 64, 68, 71], 1.4), 0.6)
    groove(LE[72] + 0.2, end, 0.7, POP, RIFF)

    sc = sidechain(n, kicks, depth=0.5)
    mus = drums + (bass + chords) * sc + lead * (0.7 + 0.3 * sc) + fx
    words = [{"start": w["start"] + I, "end": w["end"] + I} for w in plan["words"]]
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    master(mus, words, path)
    print(f"-> {path} ({end:.1f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
