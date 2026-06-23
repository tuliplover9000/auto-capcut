# test_clipper_reframe.py
import os, tempfile, autoedit

def test_reframe_to_vertical():
    ff = autoedit.ff_exe(); assert ff
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "src.mp4")
    # 6s 1280x720 test source WITH an audio tone
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=6",
                  "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", src],
                 timeout=120)
    assert os.path.exists(src)
    spec = autoedit.probe(src)
    out = os.path.join(tmp, "clip.mp4")
    autoedit.render_clip_vertical(src, 1.0, 4.0, spec, out, tmp)
    assert os.path.exists(out) and os.path.getsize(out) > 0
    ospec = autoedit.probe(out)
    assert ospec["disp_width"] == 1080 and ospec["disp_height"] == 1920, ospec
    assert ospec["disp_width"] % 2 == 0 and ospec["disp_height"] % 2 == 0
    assert 2.7 <= ospec["duration"] <= 3.4, ospec["duration"]      # ~3s trim
    assert autoedit._has_audio(out), "clip lost its audio"

if __name__ == "__main__":
    test_reframe_to_vertical()
    print("PASS")
