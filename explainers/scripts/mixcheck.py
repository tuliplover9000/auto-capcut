"""Objective music-vs-voice balance for an episode (I can't hear the mix, so measure it).

    python scripts/mixcheck.py episodes/<id>.json [music_volume]

Places every narration line at its plan start, scales the music stem by the
Remotion <Audio volume>, and prints per-section levels (A-ish weighted RMS,
dBFS) plus the music-under-voice gap. Rules of thumb for hype shorts:
  music under voice  ~ -8 to -12 dB below the voice  (too quiet if < -15)
  music in the gaps  within ~4 dB of the voice level (it carries the energy)
"""
import json
import subprocess
import sys
import wave

import imageio_ffmpeg
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
ep_path = sys.argv[1]
vol = float(sys.argv[2]) if len(sys.argv) > 2 else 0.55
ep = json.load(open(ep_path, encoding="utf-8"))
plan = json.load(open(ep_path.replace(".json", ".plan.json"), encoding="utf-8"))
timing = json.load(open(ep_path.replace(".json", ".timing.json"), encoding="utf-8"))


def decode(path):
    r = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                       capture_output=True)
    return np.frombuffer(r.stdout, dtype="<i2").astype(np.float64) / 32768


with wave.open(f"public/music/{ep['id']}.wav") as wf:
    raw = np.frombuffer(wf.readframes(wf.getnframes()), dtype="<i2").reshape(-1, 2)[:, 0].astype(np.float64) / 32768
music = raw * vol
n = len(music)
voice = np.zeros(n)
for i, ln in enumerate(timing["lines"]):
    x = decode("public/" + ln["file"])
    a = int(plan["lineStarts"][i] * SR)
    j = min(n, a + len(x))
    voice[a:j] += x[: j - a]

# crude loudness weighting: drop sub-bass (ears hear it less), keep the presence band
w = butter(2, 100, "hp", fs=SR, output="sos")
mw, vw = sosfilt(w, music), sosfilt(w, voice)


def db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)


talk = np.zeros(n, bool)
for wd in plan["words"]:
    talk[int(wd["start"] * SR):int(wd["end"] * SR)] = True
gaps = ~talk
gaps[: int(0.3 * SR)] = False
print(f"voice (while talking)      {db(vw[talk]):6.1f} dB")
print(f"music under voice          {db(mw[talk]):6.1f} dB   gap {db(mw[talk]) - db(vw[talk]):+.1f} dB")
vb = butter(2, [300, 4000], "band", fs=SR, output="sos")
mb, vbv = sosfilt(vb, music), sosfilt(vb, voice)
print(f"  voice band (300-4k): music under voice {db(mb[talk]) - db(vbv[talk]):+.1f} dB vs the voice  (want <= -9)")
print(f"music in the gaps          {db(mw[gaps]):6.1f} dB   gap {db(mw[gaps]) - db(vw[talk]):+.1f} dB")
fin = [b for b in plan["beats"] if b["odds"]][-1]
for nm, a, z in [("hook", 0, plan["hookEnd"]), ("ladder", plan["hookEnd"], plan["lineStarts"][6]),
                 ("catch", plan["lineStarts"][6], fin["landing"]), ("finale+sting", fin["landing"], plan["end"])]:
    s = slice(int(a * SR), int(z * SR))
    print(f"  {nm:13s} music {db(mw[s]):6.1f} dB")
