# test_editmode_run.py — regression lock for the ORIGINAL "Edit a clip" flow.
# The clip-mode work wrapped the whole edit UI in #editMode and touched shared
# helpers; nothing else exercises POST /run end-to-end (audit finding), so this
# runs the full worker with only the slow/external stages mocked (Whisper,
# Claude) and the real ffmpeg render on a tiny lavfi source.
import os, time, tempfile, app, autoedit


def _tiny_mp4(path):
    ff = autoedit.ff_exe()
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=6",
                  "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path],
                 timeout=120)


def test_run_end_to_end():
    c = app.app.test_client()
    autoedit.extract_audio = lambda src, wav: open(wav, "wb").close() or True
    autoedit.transcribe = lambda wav, m: [{"start": 0.5, "end": 4.5,
        "text": "hello world this is a test",
        "words": [{"word": w, "start": 0.5 + i * 0.5, "end": 0.5 + i * 0.5 + 0.4}
                  for i, w in enumerate("hello world this is a test".split())]}]
    autoedit.decide_cutlist = lambda *a, **k: [(0.5, 4.5)]

    src = os.path.join(tempfile.mkdtemp(), "in.mp4"); _tiny_mp4(src)
    with open(src, "rb") as fh:
        r = c.post("/run", data={"video": (fh, "in.mp4"), "aggressiveness": "medium",
                                 "model": "sonnet", "whisper_model": "base"},
                   content_type="multipart/form-data")
    assert r.status_code == 200, (r.status_code, r.get_data(as_text=True))
    jid = r.get_json()["job_id"]
    st = {}
    for _ in range(240):
        st = c.get(f"/status/{jid}").get_json()
        if st["state"] in ("done", "error"):
            break
        time.sleep(0.25)
    assert st["state"] == "done", st
    assert st["has_mp4"], st
    v = c.get(f"/video/{jid}")
    assert v.status_code == 200 and len(v.data) > 1000, v.status_code


if __name__ == "__main__":
    test_run_end_to_end()
    print("PASS")
