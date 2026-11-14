"""Compose an ORIGINAL backing track to a Fight plan (no licensed audio).

    node scripts/fight-plan.ts episodes/tulip-vs-sunflower.json
    python scripts/fight_music.py episodes/tulip-vs-sunflower.json  -> public/music/<id>.wav
    python scripts/mixcheck.py episodes/tulip-vs-sunflower.json 0.55

v2 "fighting-game" arrangement, E minor, 155 BPM, loud from frame 0:
  hook        IMPACT on frame 0, kick + driving bass + toms + riser, riff teaser -> the bell
  FIGHT       full drop: 4-on-the-floor, snare 2+4, 16th hats, gallop bass, supersaw stabs,
              the lead riff; a snare fill INTO every special move, a crash ON it
  twist       TAPE-STOP (the joke needs the quiet) -> crickets/hum
  deer        sneaky pizzicato bounce (garden) | blackout hum (ring)
  "X wins!"   victory stab + a few bars of groove, cut dead by the reversal
  drop        (ring) the power comes back: the biggest section of the track
  winner      fanfare + upbeat outro, full drums
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hype import (SR, add, bass_note, bell, brass, clap, crash, hat, hz, impact, kick, lp,  # noqa: E402
                  master, noise_riser, pluck, rms_db, sidechain, snare, supersaw, tape_stop, tom)

BPM = 155
BEAT = 60 / BPM
S16 = BEAT / 4
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHORDS = [[64, 67, 71], [60, 64, 67], [62, 67, 71], [62, 66, 69]]  # Em C G D
ROOTS = [40, 36, 43, 38]
RIFF = [76, None, 76, 79, None, 76, 74, None, 71, None, 74, None, 76, None, None, None,
        76, None, 76, 79, None, 81, 79, None, 83, None, 81, None, 79, None, 76, None]
WIN_CHORDS = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]]  # C F G C — the victory lap
WIN_ROOTS = [36, 41, 43, 36]


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    E = {}
    for e in plan["events"]:
        E.setdefault(e["kind"] + (e.get("target") or ""), e["t"])
    moves = [e["t"] for e in plan["events"] if e["kind"] == "move"]
    end = plan["end"] + 0.5
    n = int(end * SR)
    drums, bass, chords, lead, fx = (np.zeros(n) for _ in range(5))
    kicks = []
    ring = "deer" not in E
    t_fight = E["fight"]
    t_stop = E["blackout"] if ring else E["sunset"] + 0.5
    t_win, t_winner = E["banner"], E["winner"]
    t_cut = E["power"] if ring else E["deerTurn"]
    lines = plan["lineStarts"]

    def groove(a, z, energy, chord_set=CHORDS, root_set=ROOTS, riff_up=0, riff=True):
        """16th-note grid from a to z. energy(t) in 0..1 opens filters and adds layers."""
        s = 0
        t = a
        while t < z - 1e-6:
            bar, sub = divmod(s, 16)
            beat, q = divmod(sub, 4)
            lv = energy(t)
            ch, rt = chord_set[bar % 4], root_set[bar % 4]
            if q == 0:
                add(drums, t, kick(1.0))
                kicks.append(t)
            if q == 0 and beat in (1, 3):
                add(drums, t, snare(0.55))
                add(drums, t, clap(0.8))
            add(drums, t, hat(open_=(q == 2), g=0.5 if q == 2 else 0.3 + 0.15 * lv))
            if q in (0, 2, 3):  # gallop bass
                add(bass, t, bass_note(rt - 12 + (12 if q == 2 else 0), S16 * 0.95, 500 + 900 * lv, drive=1.8), 0.55)
            if q == 2:  # off-beat stabs
                add(chords, t, supersaw(ch, BEAT * 0.4, 2000 + 4500 * lv), 0.3 + 0.12 * lv)
            if riff and lv > 0.25:
                m = RIFF[s % 32]
                if m is not None:
                    add(lead, t, pluck(m + riff_up, 0.2), 0.3)
            s += 1
            t = a + s * S16

    # ---- hook: frame-0 impact, driving pulse, toms + riser into the bell
    add(fx, 0.0, impact(1.2), 0.5)
    t = 0.0
    k = 0
    while t < t_fight - 1e-6:
        x = t / t_fight
        if k % 4 == 0:
            add(drums, t, kick(0.95))
            kicks.append(t)
        add(drums, t, hat(g=0.25 + 0.2 * x))
        if k % 2 == 0:
            add(bass, t, bass_note(28, S16 * 1.8, 400 + 500 * x, drive=1.6), 0.55)
        if x > 0.45 and k % 2 == 0:
            add(drums, t, tom(100 + 90 * x, 0.35 + 0.5 * x))
        if x > 0.25:
            m = RIFF[k % 32]
            if m is not None:
                add(lead, t, lp(pluck(m - 12, 0.18), 1800), 0.25)
        t += S16
        k += 1
    rd = min(2.2, t_fight)
    add(fx, t_fight - rd, noise_riser(rd), 0.45)
    t = t_fight - 0.6  # snare roll into the bell
    while t < t_fight - 0.02:
        add(drums, t, snare(0.2 + 0.5 * (t - t_fight + 0.6) / 0.6))
        t += S16 / 2
    add(fx, t_fight, impact(1.6), 0.8)

    # ---- the fight
    groove(t_fight, t_stop, lambda tt: min(1.0, 0.35 + sum(1 for s in lines if s <= tt) / len(lines)))
    for m in moves:  # a fill INTO every special move, a crash ON it
        if not (t_fight + 0.6 < m < t_stop):
            continue
        t = m - 0.45
        while t < m - 0.02:
            add(drums, t, snare(0.25 + 0.5 * (t - m + 0.45) / 0.45))
            t += S16 / 2
        add(fx, m, crash(1.4), 0.55)
        add(fx, m, impact(0.8), 0.35)
    tape_stop(drums, t_stop - 0.6, t_stop)
    tape_stop(bass, t_stop - 0.6, t_stop)
    tape_stop(chords, t_stop - 0.6, t_stop)
    tape_stop(lead, t_stop - 0.6, t_stop)
    for b in (drums, bass, chords, lead):
        b[int(t_stop * SR):] = 0

    if not ring:
        t_deer, t_chomp = E["deer"], E["chompL"]
        # ---- night: crickets
        t = t_stop + 0.3
        while t < t_deer + 0.2:
            for c in range(3):
                nn = int(0.03 * SR)
                ch = np.sin(2 * np.pi * 4300 * np.arange(nn) / SR) * np.exp(-np.arange(nn) / SR * 160)
                add(fx, t + c * 0.05, ch, 0.3)
            t += 0.62
        # ---- deer: sneaky pizzicato bounce (with a soft kick) until "Sunflower wins!"
        walk = [40, 43, 45, 47, 47, 45, 43, 40]
        t = t_deer + 0.3
        i = 0
        while t < t_win - 0.05:
            add(lead, t, pluck(walk[i % 8] + 12, 0.16, 2600), 0.55)
            if i % 2 == 0:
                add(bass, t, pluck(walk[i % 8] - 12, 0.25, 900), 0.5)
                add(drums, t, kick(0.5))
            add(drums, t + BEAT / 4, hat(g=0.2))
            t += BEAT / 2
            i += 1
        add(fx, t_chomp + 0.18, impact(1.0), 0.6)
    else:
        nn = int(max(0.1, t_win - t_stop) * SR)
        tt = np.arange(nn) / SR
        add(fx, t_stop + 0.2, np.sin(2 * np.pi * 55 * tt) * 0.25 * np.minimum(1, tt / 0.5), 1.0)

    # ---- "X wins!": victory stab + groove, cut dead at the reversal
    add(fx, t_win, impact(1.0), 0.6)
    add(chords, t_win, brass([55, 59, 62, 67], 0.6), 0.7)
    groove(t_win + BEAT, t_cut, lambda _t: 0.7, WIN_CHORDS, WIN_ROOTS, riff=False)
    for b in (drums, bass, chords, lead, fx):
        b[int(t_cut * SR):int((t_cut + 0.02) * SR)] *= np.linspace(1, 0, int(0.02 * SR))
        b[int((t_cut + 0.02) * SR):int(t_winner * SR)] = 0

    silences = []
    if ring:
        # ---- the power comes back: the biggest drop, riff an octave up
        t_drop = t_cut + 0.55
        add(fx, t_drop, impact(2.0), 0.95)
        groove(t_drop, t_winner, lambda _t: 1.0, riff_up=12)
        for b in (drums, bass, chords, lead):
            b[int(t_winner * SR):] = 0
    else:
        silences.append((t_cut + 0.05, t_winner - 0.02))  # the record-scratch pause

    # ---- winner: fanfare + upbeat outro
    add(fx, t_winner, impact(1.4), 0.8)
    add(chords, t_winner, brass([48, 55, 60, 64], 0.16), 0.8)
    add(chords, t_winner + 0.18, supersaw([60, 64, 67, 72], 1.4, 7000), 0.6)
    groove(t_winner + 0.18 + BEAT * 2, end, lambda _t: 0.9, WIN_CHORDS, WIN_ROOTS, riff_up=0)
    for j, m in enumerate([72, 76, 79, 84]):
        add(lead, t_winner + 0.18 + j * 0.09, bell(m), 0.35)

    sc = sidechain(n, kicks)
    mus = drums + (bass + chords) * sc + lead * (0.6 + 0.4 * sc) + fx
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    out = master(mus, plan["words"], path, silences)
    print(f"-> {path} ({end:.1f}s)")
    secs = [("hook", 0, t_fight), ("fight", t_fight, t_stop), ("twist", t_stop, t_win), ("wins", t_win, t_cut)]
    secs += [("drop", t_cut + 0.55, t_winner)] if ring else []
    secs += [("winner", t_winner, end)]
    print("  " + "  ".join(f"{nm}:{rms_db(out, a, z):.1f}dB" for nm, a, z in secs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
