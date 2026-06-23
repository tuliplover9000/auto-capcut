# test_clipper_pipeline.py
import os, tempfile, app, autoedit

def test_render_one_clip_makes_vertical_captioned(monkeypatch=None):
    ff = autoedit.ff_exe(); assert ff
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "src.mp4")
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=8",
                  "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", src],
                 timeout=120)
    spec = autoedit.probe(src)
    all_words = [{"word": w, "start": 2.0 + i*0.4, "end": 2.0 + i*0.4 + 0.3}
                 for i, w in enumerate("this is a clip from the middle of a longer video".split())]
    cand = {"start": 2.0, "end": 6.0, "dur": 4.0, "title": "Mid clip",
            "hook": "h", "score": 80, "reason": "r"}
    outdir = os.path.join(tmp, "out"); os.makedirs(outdir)
    path = app._render_one_clip(src, cand, spec, all_words, outdir, 0, captions=True)
    assert os.path.exists(path) and path.endswith("clip_0.mp4")
    ospec = autoedit.probe(path)
    assert ospec["disp_width"] == 1080 and ospec["disp_height"] == 1920

if __name__ == "__main__":
    test_render_one_clip_makes_vertical_captioned()
    print("PASS")
