"""Compose an ORIGINAL backing track to a Fight plan (no licensed audio).

    node scripts/fight-plan.ts episodes/tulip-vs-sunflower.json
    python scripts/fight_music.py episodes/tulip-vs-sunflower.json  -> public/music/<id>.wav

E minor, 140 BPM, arranged to the story:
  hook        pulsing bass + building toms + riser into the bell
  FIGHT       full beat (kick, snare, hats, bass, saw stabs), a notch hotter each line
  sunset      TAPE-STOP, then silence + crickets (the joke needs the quiet)
  deer        sneaky pizzicato walk
  "wins"      a victory stab, cut dead by the record scratch
  winner      ta-da fanfare + bouncy outro
Narration ducking baked in.
"""
import json
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from music import SR, bp, clap, env, hat, hp, hz, kick, lp, saw  # noqa: E402

BPM = 140
BEAT = 60 / BPM
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(11)
PROG = [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]]  # Em C G D
BASS = [28, 24, 31, 26]


def add(buf, t, x, g=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    j = min(len(buf), i + len(x))
    buf[max(0, i):j] += g * x[max(0, -i):j - i]


def tom(f):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-t * 30))) / SR) * np.exp(-t * 9)


def pluck(m, d=0.18):
    n = int(d * SR)
    return lp(saw(hz(m), n), 1800) * env(n, a=0.002, d=0.06, s=0.0)


def brass(ms, d):
    n = int(d * SR)
    x = sum(saw(hz(m), n, detune=0.004) for m in ms) / len(ms)
    return lp(x, 2600) * env(n, a=0.02, d=0.4, s=0.7, r=0.15, hold=d - 0.15)


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    E = {}
    for e in plan["events"]:
        E.setdefault(e["kind"] + (e.get("target") or ""), e["t"])
    end = plan["end"] + 0.5
    n = int(end * SR)
    mus = np.zeros(n)
    ring = "deer" not in E  # the ring story: blackout -> "X wins!" -> power back -> the real winner
    t_fight = E["fight"]
    t_stop = E["blackout"] if ring else E["sunset"] + 0.5
    t_win, t_winner = E["banner"], E["winner"]
    if not ring:
        t_deer, t_chompL, t_turn = E["deer"], E["chompL"], E["deerTurn"]

    # ---- hook: bass pulse + toms building into the bell
    t = 0.0
    while t < t_fight:
        k = t / t_fight
        nn = int(BEAT / 2 * SR)
        add(mus, t, lp(saw(hz(28), nn), 260) * env(nn, d=0.1, s=0.3), 0.5)
        if k > 0.35 and int(round(t / (BEAT / 2))) % 2 == 0:
            add(mus, t, tom(110 + 60 * k), 0.4 + 0.5 * k)
        t += BEAT / 2
    rn = int(min(2.0, t_fight) * SR)
    tt = np.arange(rn) / SR
    add(mus, t_fight - rn / SR, bp(rng.uniform(-1, 1, rn), 600, 5000) * (tt / tt[-1]) ** 2, 0.35)

    # ---- the fight groove
    lines = plan["lineStarts"]
    b = 0
    t = t_fight
    while t < t_stop:
        bar, sub = divmod(b, 16)
        beat, q = divmod(sub, 4)
        lvl = sum(1 for s in lines if s <= t) / len(lines)
        if q == 0:
            add(mus, t, kick(1.0))
        if q == 0 and beat in (1, 3):
            add(mus, t, clap(), 0.8)
        if q == 2:
            add(mus, t, hat(open_=beat == 3), 0.5)
        elif lvl > 0.4 and q in (1, 3):
            add(mus, t, hat(), 0.25)
        if q in (0, 2):
            m = BASS[bar % 4] + (12 if q == 2 else 0)
            nn = int(BEAT / 2 * SR)
            add(mus, t, lp(saw(hz(m), nn), 500 + 600 * lvl) * env(nn, a=0.003, d=0.1, s=0.5, r=0.02), 0.5)
        if q == 2 and beat in (0, 2):  # off-beat saw stabs
            add(mus, t, brass(PROG[bar % 4], BEAT * 0.4), 0.22 + 0.1 * lvl)
        b += 1
        t = t_fight + b * BEAT / 4
    # tape stop: the last 0.6 s of groove slows to a halt
    i0, i1 = int((t_stop - 0.6) * SR), int(t_stop * SR)
    seg = mus[i0:i1].copy()
    m = len(seg)
    pos = np.cumsum(np.linspace(1.0, 0.0, m))
    pos = pos / pos[-1] * (m * 0.5)
    mus[i0:i1] = np.interp(pos, np.arange(m), seg) * np.linspace(1, 0.2, m)
    mus[i1:] = 0

    if not ring:
        # ---- night: crickets
        t = t_stop + 0.3
        while t < t_deer + 0.2:
            for c in range(3):
                nn = int(0.03 * SR)
                ch = np.sin(2 * np.pi * 4300 * np.arange(nn) / SR) * env(nn, a=0.002, d=0.012)
                add(mus, t + c * 0.05, ch, 0.18)
            t += 0.62

        # ---- deer: sneaky pizzicato walk (E G A B . B A G E)
        walk = [40, 43, 45, 47, 47, 45, 43, 40]
        t = t_deer + 0.3
        i = 0
        while t < t_chompL:
            add(mus, t, pluck(walk[i % 8] + 12), 0.5)
            if i % 2 == 0:
                add(mus, t, pluck(walk[i % 8] - 12, 0.25), 0.35)
            t += BEAT / 2
            i += 1

        # ---- "Sunflower wins!": a victory stab, cut dead at the turn
        add(mus, t_win, brass([55, 59, 62, 67], 0.9), 0.55)
        add(mus, t_win, kick(1.0))
        add(mus, t_win + BEAT * 2, brass([57, 60, 64, 69], 1.6), 0.5)
        mus[int(t_turn * SR):int(t_winner * SR)] *= 0
    else:
        # ---- blackout: a low hum in the dark
        nn = int(max(0.1, t_win - t_stop) * SR)
        tt = np.arange(nn) / SR
        add(mus, t_stop + 0.2, np.sin(2 * np.pi * 55 * tt) * 0.12 * np.minimum(1, tt / 0.5), 1.0)
        # ---- "Edison wins!": victory stab, cut dead when the power comes back
        t_pow = E["power"]
        add(mus, t_win, brass([55, 59, 62, 67], 0.9), 0.55)
        add(mus, t_win, kick(1.0))
        add(mus, t_win + BEAT * 2, brass([57, 60, 64, 69], 1.6), 0.5)
        mus[int(t_pow * SR):] = 0
        # ---- power back: the groove DROPS back in, full intensity, until the winner card
        t = t_pow + 0.55
        b = 0
        while t < t_winner:
            bar, sub = divmod(b, 16)
            beat, q = divmod(sub, 4)
            if q == 0:
                add(mus, t, kick(1.1))
            if q == 0 and beat in (1, 3):
                add(mus, t, clap(), 0.9)
            add(mus, t, hat(open_=q == 2), 0.35 if q % 2 else 0.5)
            if q in (0, 2):
                nn2 = int(BEAT / 2 * SR)
                add(mus, t, lp(saw(hz(BASS[bar % 4] + (12 if q == 2 else 0)), nn2), 1300) * env(nn2, a=0.003, d=0.1, s=0.5, r=0.02), 0.6)
            if q == 2:
                add(mus, t, brass(PROG[bar % 4], BEAT * 0.4), 0.35)
            b += 1
            t = t_pow + 0.55 + b * BEAT / 4
        mus[int(t_winner * SR):] = 0

    # ---- winner: ta-da + bouncy outro
    add(mus, t_winner, brass([48, 55, 60, 64], 0.18), 0.6)
    add(mus, t_winner + 0.2, brass([48, 55, 60, 64, 67], 1.6), 0.7)
    add(mus, t_winner + 0.2, kick(1.2))
    t = t_winner + 0.2 + BEAT * 2
    k = 0
    while t < end - 0.3:
        add(mus, t, kick(0.8) if k % 2 == 0 else clap() * 0.6)
        add(mus, t, pluck([60, 64, 67, 72][k % 4], 0.2), 0.4)
        t += BEAT
        k += 1

    # ---- duck under narration
    duck = np.ones(n)
    for w in plan["words"]:
        a, z = int((w["start"] - 0.05) * SR), int((w["end"] + 0.15) * SR)
        duck[max(0, a):max(0, z)] = 0.5
    kk = int(0.05 * SR)
    mus *= np.convolve(duck, np.ones(kk) / kk, mode="same")
    mus = hp(mus, 30)
    mus = mus / (np.max(np.abs(mus)) + 1e-9) * 0.89
    st = np.stack([mus, np.roll(mus, int(0.011 * SR)) * 0.96], axis=1)
    os.makedirs(os.path.join(ROOT, "public", "music"), exist_ok=True)
    path = os.path.join(ROOT, "public", "music", f"{ep['id']}.wav")
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(st, -1, 1) * 32767).astype("<i2").tobytes())

    def rms(a, z):
        seg = mus[int(a * SR):int(z * SR)]
        return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
    print(f"-> {path} ({end:.1f}s)")
    secs = [("hook", 0, t_fight), ("fight", t_fight, t_stop)]
    secs += [("dark", t_stop, t_win), ("wins", t_win, E["power"]), ("drop", E["power"] + 0.55, t_winner)] if ring else [
        ("night", t_stop, t_deer), ("deer", t_deer, t_chompL), ("wins", t_win, t_turn), ("silence", t_turn, t_winner)]
    secs += [("winner", t_winner, end)]
    print("  " + "  ".join(f"{nm}:{rms(a, z):.1f}dB" for nm, a, z in secs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
