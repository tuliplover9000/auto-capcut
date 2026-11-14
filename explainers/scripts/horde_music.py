"""ORIGINAL backing track for a Horde (1 vs many) episode, on the hype.py master.

    node scripts/horde-plan.ts episodes/<id>.json
    python scripts/horde_music.py episodes/<id>.json -> public/music/<id>.wav

jungle (gorilla): E minor 150 BPM fight groove (fills into every swat) -> tired
  half-time -> DEAD SILENCE under the chest beat (the sfx are the music) ->
  victory groove as the men run -> lazy "lunch" bounce -> fanfare.
park (Napoleon): C major courtly march -> tension build at the cages -> frantic
  charge -> TAPE-STOP on "it doesn't work" -> comedic chase -> fanfare.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hype import (SR, add, bass_note, bell, brass, clap, crash, hat, impact, kick, master,  # noqa: E402
                  noise_riser, pluck, rms_db, sidechain, snare, supersaw, tape_stop, tom)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MINOR = ([[64, 67, 71], [60, 64, 67], [62, 67, 71], [62, 66, 69]], [40, 36, 43, 38])
MAJOR = ([[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], [36, 41, 43, 36])
RIFF_MIN = [76, None, 76, 79, None, 76, 74, None, 71, None, 74, None, 76, None, None, None,
            76, None, 76, 79, None, 81, 79, None, 83, None, 81, None, 79, None, 76, None]
RIFF_MAJ = [72, None, 76, None, 79, 76, None, 72, 74, None, 72, None, 67, None, None, None,
            72, None, 76, None, 79, 81, None, 79, 76, None, 74, None, 72, None, None, None]


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    E = {}
    for e in plan["events"]:
        E.setdefault(e["kind"], e["t"])
    swats = [e["t"] + 0.16 for e in plan["events"] if e["kind"] == "swat"]
    end = plan["end"] + 0.5
    n = int(end * SR)
    drums, bass, chords, lead, fx = (np.zeros(n) for _ in range(5))
    kicks = []
    jungle = ep["stage"] == "jungle"
    bpm = 150 if jungle else 140
    BEAT = 60 / bpm
    S16 = BEAT / 4

    def groove(a, z, lv, key=MINOR, riff=None, half=False, up=0, gain=1.0):
        chs, rts = key
        s = 0
        t = a
        while t < z - 1e-6:
            bar, sub = divmod(s, 16)
            beat, q = divmod(sub, 4)
            ch, rt = chs[bar % 4], rts[bar % 4]
            if (q == 0 and not half) or (half and sub in (0, 10)):
                add(drums, t, kick(1.0 * gain))
                kicks.append(t)
            if (not half and q == 0 and beat in (1, 3)) or (half and sub == 8):
                add(drums, t, clap(0.8 * gain))
                add(drums, t, snare(0.45 * gain))
            if not half or q == 2:
                add(drums, t, hat(open_=(q == 2), g=(0.45 if q == 2 else 0.25 + 0.15 * lv) * gain))
            if q in ((0, 2, 3) if not half else (0,)):
                add(bass, t, bass_note(rt - 12 + (12 if q == 2 else 0), S16 * (0.95 if not half else 3.5), 500 + 1200 * lv, drive=1.6), 0.55 * gain)
            if q == 2 and not half:
                add(chords, t, supersaw(ch, BEAT * 0.4, 2000 + 5000 * lv), (0.28 + 0.12 * lv) * gain)
            if riff:
                m = riff[s % 32]
                if m is not None:
                    add(lead, t, pluck(m + up, 0.2, 5200 if lv > 0.5 else 2600), 0.3 * gain)
            s += 1
            t = a + s * S16

    t_fight, t_win = E["fight"], E["winner"]
    # ---- hook
    add(fx, 0.0, impact(1.2), 0.5)
    t = 0.0
    k = 0
    while t < t_fight - 1e-6:
        x = t / t_fight
        if k % 4 == 0:
            add(drums, t, kick(0.9))
            kicks.append(t)
        if jungle:
            if k % 2 == 0:
                add(drums, t, tom(90 + 80 * x, 0.3 + 0.5 * x))
        else:
            add(drums, t, snare(0.12 + 0.3 * x) if k % 2 == 0 else hat(g=0.2))
        if k % 2 == 0:
            add(bass, t, bass_note(28 if jungle else 36, S16 * 1.8, 400 + 500 * x, drive=1.5), 0.5)
        t += S16
        k += 1
    rd = min(2.2, t_fight)
    add(fx, t_fight - rd, noise_riser(rd), 0.45)
    add(fx, t_fight, impact(1.6), 0.8)
    silences = []

    if jungle:
        t_hurt, t_beat, t_flee, t_eat = E["hurt"], E["beat"], E["flee"], E["eat"]
        groove(t_fight, t_hurt, 0.85, MINOR, RIFF_MIN)
        for sw in swats:  # fill INTO every swat, crash ON it
            t = sw - 0.45
            while t < sw - 0.02:
                add(drums, t, snare(0.25 + 0.5 * (t - sw + 0.45) / 0.45))
                t += S16 / 2
            add(fx, sw, crash(1.4), 0.6)
            add(fx, sw, impact(0.8), 0.45)
        groove(t_hurt, t_beat - 0.3, 0.3, MINOR, None, half=True)  # tired
        tape_stop(drums, t_beat - 0.8, t_beat - 0.3)
        tape_stop(bass, t_beat - 0.8, t_beat - 0.3)
        silences.append((t_beat - 0.3, t_beat + 1.95))  # the chest beat IS the music
        for kk in range(14):
            add(fx, t_beat + kk * 0.13, tom(70, 0.9 if kk % 2 == 0 else 0.6), 1.0)
        add(fx, t_beat + 1.95, impact(1.4), 0.8)
        groove(t_beat + 1.95, t_eat, 1.0, MAJOR, RIFF_MAJ, up=12)  # the men run: victory groove
        groove(t_eat, t_win, 0.4, MAJOR, RIFF_MAJ, half=True, gain=0.85)  # lunch
    else:
        t_rel, t_charge, t_hurt, t_ret = E["release"], E["charge"], E["hurt"], E["retreat"]
        groove(t_fight, t_rel, 0.35, MAJOR, RIFF_MAJ, gain=0.9)  # courtly march
        t = t_rel  # tension: pizzicato rising + riser into the charge
        k = 0
        while t < t_charge:
            add(lead, t, pluck(60 + (k % 8) + (k // 8) * 2, 0.14, 2400), 0.45)
            if k % 2 == 0:
                add(drums, t, kick(0.6))
            t += BEAT / 2
            k += 1
        add(fx, t_charge - 1.6, noise_riser(1.6), 0.5)
        add(fx, t_charge, impact(1.6), 0.9)
        groove(t_charge, t_hurt, 1.0, MINOR, RIFF_MIN, up=12)
        for sw in swats:
            add(fx, sw, crash(1.0), 0.45)
        for buf in (drums, bass, chords, lead):
            tape_stop(buf, t_hurt - 0.15, t_hurt + 0.45)
            buf[int((t_hurt + 0.45) * SR):int((t_ret + 0.2) * SR)] = 0
        groove(t_ret + 0.2, t_win, 0.7, MAJOR, RIFF_MAJ, gain=0.9)  # the chase

    # ---- winner: fanfare + outro
    for buf in (drums, bass, chords, lead):
        buf[int(t_win * SR):] = 0
    add(fx, t_win, impact(1.4), 0.8)
    add(chords, t_win, brass([48, 55, 60, 64], 0.16), 0.8)
    add(chords, t_win + 0.18, supersaw([60, 64, 67, 72], 1.4, 7000), 0.6)
    for j, m in enumerate([72, 76, 79, 84]):
        add(lead, t_win + 0.18 + j * 0.09, bell(m), 0.35)
    groove(t_win + 0.18 + BEAT * 2, end, 0.9, MAJOR, RIFF_MAJ)

    sc = sidechain(n, kicks)
    mus = drums + (bass + chords) * sc + lead * (0.6 + 0.4 * sc) + fx
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    out = master(mus, plan["words"], path, silences)
    print(f"-> {path} ({end:.1f}s)")
    print("  " + "  ".join(f"line{i}:{rms_db(out, a, b):.1f}dB" for i, (a, b) in enumerate(zip(plan['lineStarts'], plan['lineEnds']))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
