"""Final audio pass: loudness-normalize to ~-14 LUFS with a -1.5 dBTP ceiling
(TikTok/Shorts play around -14; the raw mix can hit 0 dBFS when thunder, the
music drop and the voice coincide). Video stream is copied untouched.

    python scripts/finish.py out/x.mp4 [out/x_final.mp4]
"""
import subprocess
import sys

import imageio_ffmpeg

src = sys.argv[1]
dst = sys.argv[2] if len(sys.argv) > 2 else src.replace(".mp4", "_final.mp4")
r = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-i", src, "-c:v", "copy",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", dst],
                   capture_output=True, text=True)
if r.returncode != 0:
    sys.exit(r.stderr[-800:])
print(dst)
