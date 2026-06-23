# test_clipper_captions.py
# Regression locks for the two highest-risk clipper properties:
#  (1) captions for a MID-video clip rebase to t~0 (else they'd never show), and
#  (2) render_clip_vertical refuses a trim window past the source end.
import os, tempfile, autoedit


def _ass_secs(ts):
    # "H:MM:SS.cs" -> seconds
    h, m, rest = ts.split(":")
    return int(h) * 3600 + int(m) * 60 + float(rest)


def test_captions_rebase_to_clip_start():
    # A clip taken from 120s into the video. write_ass is given the absolute
    # word times + cutlist=[(120,124)]; events MUST come out near 0:00, not 2:00.
    words = [{"word": w, "start": 120.0 + i * 0.4, "end": 120.0 + i * 0.4 + 0.3}
             for i, w in enumerate("this clip is taken from the middle of a long video".split())]
    tmp = tempfile.mkdtemp()
    ass = os.path.join(tmp, "c.ass")
    n = autoedit.write_ass([(120.0, 124.0)], words, 1080, 1920, ass, style="pop", pos="lower")
    assert n > 0, "no caption events written"
    starts = []
    with open(ass, encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("Dialogue:"):
                fields = line.split(":", 1)[1].split(",", 9)
                starts.append(_ass_secs(fields[1].strip()))
    assert starts, "no Dialogue lines"
    assert min(starts) < 1.0, f"captions not rebased — first event at {min(starts):.2f}s (expected ~0)"
    assert max(starts) < 5.0, f"caption past the 4s clip — {max(starts):.2f}s"


def test_render_rejects_window_past_end():
    ff = autoedit.ff_exe(); assert ff
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "src.mp4")
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=5",
                  "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", src],
                 timeout=120)
    spec = autoedit.probe(src)
    out = os.path.join(tmp, "bad.mp4")
    raised = False
    try:
        autoedit.render_clip_vertical(src, 100.0, 103.0, spec, out, tmp)   # past the 5s end
    except RuntimeError:
        raised = True
    assert raised, "render_clip_vertical should raise on a window past the source end"


if __name__ == "__main__":
    test_captions_rebase_to_clip_start()
    test_render_rejects_window_past_end()
    print("PASS")
