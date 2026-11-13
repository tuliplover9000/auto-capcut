"""Synthesize the Speed Trap sound effects with ffmpeg (no licensed audio).

    python scripts/make_sfx.py      -> public/sfx/*.wav
"""
import os
import subprocess

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "sfx")
os.makedirs(OUT, exist_ok=True)

# name -> (lavfi source, audio filter chain)
SFX = {
    # radar counting blip
    "tick": ("sine=f=1900:d=0.035", "afade=t=out:st=0.005:d=0.03,volume=0.6"),
    # pass-by: band-limited noise swelling in and out
    "whoosh": ("anoisesrc=d=0.75:c=pink:a=0.9",
               "highpass=f=350,lowpass=f=4200,afade=t=in:d=0.38,afade=t=out:st=0.38:d=0.37"),
    # speed-camera shutter: sharp click + bright burst
    "shutter": ("anoisesrc=d=0.22:c=white:a=1.0",
                "highpass=f=1800,afade=t=out:st=0.01:d=0.2,volume=1.4"),
    # citation printer: pulsed ratchet
    "printer": ("anoisesrc=d=0.9:c=brown:a=0.9",
                "highpass=f=600,volume='0.25+0.75*gt(sin(2*PI*16*t),0)':eval=frame,afade=t=out:st=0.7:d=0.2"),
    # radar overload: crushed buzz
    "overload": ("sine=f=92:d=0.95",
                 "acrusher=bits=3:samples=8,volume=1.2,afade=t=out:st=0.6:d=0.35"),
    # marker drop: short falling thump
    "pop": ("aevalsrc='0.9*sin(2*PI*(420-900*t)*t)':d=0.16", "afade=t=out:st=0.04:d=0.12"),
    # message board updating
    "vms": ("sine=f=640:d=0.06", "afade=t=out:st=0.02:d=0.04,volume=0.7"),
    # night highway hum under everything
    "ambience": ("anoisesrc=d=40:c=brown:a=0.5", "lowpass=f=260,volume=0.5"),
    # Wind Test: gusting wind bed (level is automated per frame by the scene)
    "wind": ("anoisesrc=d=60:c=pink:a=0.8",
             "bandpass=f=520:width_type=h:w=760,volume='0.55+0.45*sin(2*PI*0.21*t)*sin(2*PI*0.07*t)':eval=frame,volume=1.6"),
    # tree snapping / roof tearing
    "crack": ("anoisesrc=d=0.4:c=white:a=1.0", "highpass=f=900,afade=t=out:st=0.02:d=0.35,volume=1.4"),
    # the 302 mph strike
    "thunder": ("anoisesrc=d=3.6:c=brown:a=1.0", "lowpass=f=320,afade=t=in:d=0.04,afade=t=out:st=0.35:d=3.2,volume=3.0"),
}

for name, (src, af) in SFX.items():
    path = os.path.join(OUT, f"{name}.wav")
    r = subprocess.run([FF, "-y", "-f", "lavfi", "-i", src, "-af", af,
                        "-ar", "48000", "-ac", "1", path],
                       capture_output=True, text=True)
    ok = r.returncode == 0 and os.path.getsize(path) > 0
    print(f"{'ok ' if ok else 'ERR'} {name:9s} {os.path.getsize(path) if os.path.exists(path) else 0:>8d} B"
          + ("" if ok else f"\n{r.stderr[-400:]}"))
