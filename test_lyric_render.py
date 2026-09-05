# test_lyric_render.py — the behind-person compositor, with person_mask mocked
# to a fixed right-half rectangle so the composite is deterministic.
import os, tempfile, time, numpy as np, autoedit, lyricmode

def _src(path):
    ff = autoedit.ff_exe()
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "color=c=0x606060:size=320x480:rate=10:duration=6",
                  "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path],
                 timeout=120)

def _frame(ff, path, t, out):
    autoedit.run([ff, "-y", "-ss", str(t), "-i", path, "-frames:v", "1", "-update", "1", out], timeout=60)
    from PIL import Image
    return np.asarray(Image.open(out).convert("RGB")).astype(np.int16)

def test_render_composites_only_during_lines():
    ff = autoedit.ff_exe()
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "s.mp4"); _src(src)
    real_mask = lyricmode.person_mask
    lyricmode.person_mask = lambda rgb, mask_w=384: np.concatenate(
        [np.zeros((rgb.shape[0], rgb.shape[1] // 2, 1), np.float32),
         np.ones((rgb.shape[0], rgb.shape[1] - rgb.shape[1] // 2, 1), np.float32)], axis=1)
    out = os.path.join(tmp, "o.mp4")
    ticks = []
    t0 = time.time()
    try:
        lyricmode.render_lyric_video(src, [(1.0, "HELLO WORLD"), (3.0, "SECOND LINE")],
                                     out, tmp, tint="light",
                                     progress_cb=lambda d, t: ticks.append((d, t)))
    finally:
        lyricmode.person_mask = real_mask
    elapsed = time.time() - t0
    assert os.path.exists(out) and os.path.getsize(out) > 0
    spec = autoedit.probe(out)
    assert 5.5 <= spec["duration"] <= 6.5, spec["duration"]
    assert autoedit._has_audio(out)
    on = _frame(ff, out, 2.0, os.path.join(tmp, "a.png"))
    src_on = _frame(ff, src, 2.0, os.path.join(tmp, "b.png"))
    diff = np.abs(on - src_on).mean(axis=2)
    assert diff[:, :160].max() > 8, "text did not draw on the unmasked half"
    assert diff[:, 170:].mean() < 3, "masked (person) half should be untouched"
    off = _frame(ff, out, 0.3, os.path.join(tmp, "c.png"))
    src_off = _frame(ff, src, 0.3, os.path.join(tmp, "d.png"))
    assert np.abs(off - src_off).mean() < 3, "pass-through frame changed"
    assert ticks and ticks[-1][0] == ticks[-1][1], ticks[-1:]
    print(f"  [throughput] {ticks[-1][1]} frames in {elapsed:.1f}s "
          f"= {ticks[-1][1] / max(elapsed, 1e-6):.1f} fps (mocked mask)")

def test_silent_source_still_renders():
    """-map 1:a? is optional: a source with no audio track must still produce a file."""
    ff = autoedit.ff_exe()
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "silent.mp4")
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "color=c=0x202020:size=160x240:rate=10:duration=2",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", src], timeout=120)
    assert not autoedit._has_audio(src)
    real_mask = lyricmode.person_mask
    lyricmode.person_mask = lambda rgb, mask_w=384: np.zeros(
        (rgb.shape[0], rgb.shape[1], 1), np.float32)
    out = os.path.join(tmp, "o.mp4")
    try:
        lyricmode.render_lyric_video(src, [(0.5, "QUIET")], out, tmp, tint="light")
    finally:
        lyricmode.person_mask = real_mask
    assert os.path.exists(out) and os.path.getsize(out) > 0

def test_line_windows_clamped():
    w = lyricmode._line_windows([(1.0, "a"), (2.0, "b"), (100.0, "far")], 20.0)
    assert w[0] == (1.0, 2.0, "a")
    assert w[1] == (2.0, 2.0 + lyricmode.MAX_LINE_HOLD, "b")   # capped at MAX_LINE_HOLD
    assert all(s < 20.0 and e <= 20.0 for s, e, _ in w)        # nothing past the clip
    assert not any(txt == "far" for _, _, txt in w)            # starts after the end

if __name__ == "__main__":
    test_line_windows_clamped()
    test_render_composites_only_during_lines()
    test_silent_source_still_renders()
    print("PASS")
