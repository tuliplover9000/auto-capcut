# test_clipper_all.py
import subprocess, sys
TESTS = ["test_clipper_windows.py","test_clipper_snap.py","test_clipper_dedup.py",
         "test_clipper_highlights.py","test_clipper_reframe.py",
         "test_clipper_pipeline.py","test_clipper_routes.py","test_clipper_ui.py",
         "test_clipper_captions.py","test_clipper_url.py","test_editmode_run.py",
         "test_lyric_parse.py","test_lyric_align.py","test_lyric_image.py",
         "test_lyric_mask.py","test_lyric_render.py","test_lyric_routes.py",
         "test_lyric_ui.py"]
for t in TESTS:
    print("==", t)
    r = subprocess.run([sys.executable, t])
    if r.returncode != 0:
        sys.exit(f"FAILED: {t}")
print("ALL CLIPPER TESTS PASS")
