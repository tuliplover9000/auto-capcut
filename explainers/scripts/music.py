"""Compose an ORIGINAL backing track to a Wind Test plan (no licensed audio).

    node scripts/plan.ts episodes/wind-survival.json
    python scripts/music.py episodes/wind-survival.json   -> public/music/<id>.wav

A minor, 128 BPM. The arrangement follows the story:
  intro (hook)      kick on 1+3, soft hats, dark pad
  each contender    one notch more intensity: four-on-the-floor, claps,
                    16th hats, filter opens, pumping bass
  finale ramp       drums drop out -> accelerating snare roll + riser
  302 landing       IMPACT (sub boom + crash) then the full drop + arp
  underground       muffled pad + a soft heartbeat kick
Narration ducking is baked in (music dips ~7 dB under every spoken word).
"""
import json
import os
import sys
import wave

import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
BPM = 128
BEAT = 60 / BPM
BAR = BEAT * 4
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)

# A minor: i - VI - III - VII  (Am F C G)
CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]
BASS = [33, 29, 36, 31]
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)  # noqa: E731


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos"), x)


def saw(f, n, detune=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for d in (-detune, 0.0, detune) if detune else (0.0,):
        ph = (f * (1 + d) * t) % 1.0
        out += 2 * ph - 1
    return out / (3 if detune else 1)


def env(n, a=0.005, d=0.1, s=0.0, r=0.05, hold=None):
    t = np.arange(n) / SR
    hold = hold if hold is not None else n / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((t - hold) / max(r, 1e-4), 0, 1)
    return e * (1 - rel)


class Track:
    def __init__(self, seconds):
        self.n = int(seconds * SR) + SR
        self.bus = {k: np.zeros(self.n) for k in ("drums", "bass", "pad", "lead", "fx")}

    def add(self, bus, t, x, gain=1.0):
        i = int(t * SR)
        if i >= self.n or i + len(x) <= 0:
            return
        j = min(self.n, i + len(x))
        self.bus[bus][max(0, i):j] += gain * x[max(0, -i): j - i]


def kick(gain=1.0):
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 46 + 120 * np.exp(-t * 34)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8)
    x[: int(0.004 * SR)] += rng.uniform(-0.6, 0.6, int(0.004 * SR))
    return x * gain


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    x = bp(rng.uniform(-1, 1, n), 900, 3200)
    e = np.zeros(n)
    for o in (0.0, 0.011, 0.022):
        e += np.where(t >= o, np.exp(-(t - o) * 26), 0)
    return x * e * 0.9


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return hp(rng.uniform(-1, 1, n), 7000, 4) * np.exp(-t * (16 if open_ else 85)) * 0.5


def main() -> int:
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
    beats = plan["beats"]
    contenders = [b for b in beats if b["index"] >= 0]
    finale = beats[-1]
    end = plan["end"] + 0.6
    tr = Track(end)

    def intensity(t):
        if t >= plan["panStart"]:
            return -1.0  # underground
        if finale["rampStart"] <= t < finale["landing"]:
            return -2.0  # riser / breakdown
        if t >= finale["landing"]:
            return 1.0  # the drop
        lvl = 0.25
        for k, b in enumerate(contenders):
            if t >= b["landing"]:
                lvl = 0.35 + 0.55 * (k + 1) / len(contenders)
        return lvl

    kicks = []
    nbars = int(end / BAR) + 1
    for bar in range(nbars):
        t0 = bar * BAR
        ch = CHORDS[bar % 4]
        # ---- pad: one note per bar, filter opens with intensity
        I0 = intensity(t0 + 0.01)
        cut = 350 if I0 == -1 else 900 if I0 == -2 else 600 + 5200 * max(0, I0)
        n = int((BAR + 0.6) * SR)
        pad = sum(saw(hz(m), n, detune=0.006) for m in ch) / len(ch)
        pad = lp(pad, cut, 2) * env(n, a=0.25, d=1.0, s=0.75, r=0.5, hold=BAR)
        tr.add("pad", t0, pad, 0.32 if I0 != -1 else 0.45)
        for b16 in range(16):
            t = t0 + b16 * BEAT / 4
            I = intensity(t)
            beat, sub = divmod(b16, 4)
            if I == -1:  # underground: heartbeat only
                if sub == 0 and beat in (0, 2):
                    tr.add("drums", t, lp(kick(0.5), 300))
                continue
            if I == -2:
                continue  # breakdown — the roll + riser are added below
            on = sub == 0
            if on and (I >= 0.45 or beat in (0, 2)):
                tr.add("drums", t, kick(0.95))
                kicks.append(t)
            if on and beat in (1, 3) and I >= 0.5:
                tr.add("drums", t, clap(), 0.7)
            if sub == 2 and I >= 0.3:
                tr.add("drums", t, hat(open_=I >= 0.6), 0.55)
            elif I >= 0.75 and sub in (1, 3):
                tr.add("drums", t, hat(), 0.35)
            # ---- bass: pumping 8ths on the root
            if sub in (0, 2) and I >= 0.3:
                m = BASS[bar % 4] + (12 if (b16 // 2) % 2 else 0)
                nn = int(BEAT / 2 * SR)
                x = lp(saw(hz(m), nn), 300 + 900 * I, 2) * env(nn, a=0.004, d=0.12, s=0.5, r=0.03)
                tr.add("bass", t, x, 0.55)
            # ---- arp lead in the drop
            if I >= 0.95:
                m = ch[b16 % 3] + 12 + (12 if b16 % 8 >= 4 else 0)
                nn = int(BEAT / 4 * SR)
                x = lp(saw(hz(m), nn, detune=0.004), 4000, 2) * env(nn, a=0.002, d=0.07, s=0.0)
                tr.add("lead", t, x, 0.22)

    # ---- breakdown: accelerating snare roll + riser into the 302 landing
    r0, r1 = finale["rampStart"], finale["landing"]
    t = r0
    while t < r1 - 0.02:
        k = (t - r0) / max(0.01, r1 - r0)
        tr.add("drums", t, clap() * (0.25 + 0.6 * k), 0.8)
        t += BEAT / (2 if k < 0.4 else 4 if k < 0.75 else 8)
    n = int((r1 - r0) * SR)
    if n > 0:
        tt = np.arange(n) / SR
        k = tt / (r1 - r0)
        noise = rng.uniform(-1, 1, n)
        riser = np.zeros(n)
        step = int(0.05 * SR)
        for i in range(0, n, step):
            c = 400 * (16 ** k[i])
            riser[i:i + step] = bp(noise[i:i + step], c * 0.7, c * 1.5)
        sweep = np.sin(2 * np.pi * np.cumsum(180 * (8 ** k)) / SR) * 0.4
        tr.add("fx", r0, (riser * 0.8 + sweep) * k ** 2, 0.55)
    # ---- impact on the landing
    n = int(2.2 * SR)
    tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-tt * 3)) / SR) * np.exp(-tt * 2.2)
    crash = hp(rng.uniform(-1, 1, n), 3500, 2) * np.exp(-tt * 2.0) * 0.45
    tr.add("fx", r1, boom + crash, 1.0)
    kicks.append(r1)

    # ---- sidechain pump (bass + pad duck after every kick)
    tt = np.arange(tr.n) / SR
    pump = np.ones(tr.n)
    for kt in kicks:
        i = int(kt * SR)
        seg = np.arange(min(int(0.3 * SR), tr.n - i)) / SR
        pump[i:i + len(seg)] = np.minimum(pump[i:i + len(seg)], 1 - 0.55 * np.exp(-seg / 0.09))
    music = tr.bus["drums"] + (tr.bus["bass"] + tr.bus["pad"]) * pump + tr.bus["lead"] * pump + tr.bus["fx"]
    # the drop is the PEAK of the track: lift it above the build
    pan = int(plan["panStart"] * SR)
    land = int(finale["landing"] * SR)
    music[land:pan] *= 1.5
    # underground: muffle everything after the pan
    music[pan:] = lp(music[pan:], 420, 2) * 0.7

    # ---- narration ducking (baked): ~7 dB under every spoken word
    #      (only ~4 dB in the drop — the payoff line rides ON the music)
    duck = np.ones(tr.n)
    for w in plan["words"]:
        a, b = int((w["start"] - 0.06) * SR), int((w["end"] + 0.18) * SR)
        duck[max(0, a):max(0, b)] = 0.62 if w["start"] >= finale["landing"] else 0.45
    k = int(0.05 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode="same")  # smooth attack/release
    music *= duck

    music = music / (np.max(np.abs(music)) + 1e-9) * 0.89
    stereo = np.stack([music, np.roll(music, int(0.012 * SR)) * 0.96], axis=1)  # slight width
    out_dir = os.path.join(ROOT, "public", "music")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{ep['id']}.wav")
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(stereo, -1, 1) * 32767).astype("<i2").tobytes())

    # section loudness report (dBFS RMS) so the arc can be checked without ears
    def rms(a, b):
        seg = music[int(a * SR):int(b * SR)]
        return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
    secs = [("hook", 0, contenders[0]["landing"])] + [
        (f"c{k}", b["landing"], (contenders[k + 1]["landing"] if k + 1 < len(contenders) else finale["rampStart"]))
        for k, b in enumerate(contenders)] + [
        ("riser", finale["rampStart"], finale["landing"]), ("DROP", finale["landing"], plan["panStart"]),
        ("underground", plan["panStart"], plan["end"])]
    print(f"-> {path}  ({end:.1f}s)")
    print("  " + "  ".join(f"{n}:{rms(a, b):.1f}dB" for n, a, b in secs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
