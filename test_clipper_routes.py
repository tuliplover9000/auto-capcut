# test_clipper_routes.py  — mocks transcribe + find_highlights so no Whisper/CLI needed
import io, os, time, app, autoedit

def _tiny_mp4(path):
    ff = autoedit.ff_exe()
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=5",
                  "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path],
                 timeout=120)

def test_analyze_then_render(tmp_path=None):
    c = app.app.test_client()
    # stub the slow/External bits
    autoedit.extract_audio = lambda src, wav: open(wav, "wb").close() or True
    autoedit.transcribe = lambda wav, m: [{"words": [
        {"word": w, "start": float(i)*0.4, "end": float(i)*0.4+0.3}
        for i, w in enumerate("this is the clip moment that we will keep for the short".split())]}]
    autoedit.build_transcript_text = lambda segs: "x"
    autoedit.find_highlights = lambda *a, **k: [
        {"start": 0.0, "end": 4.0, "dur": 4.0, "title": "T", "hook": "h", "score": 90, "reason": "r"}]

    import tempfile
    src = os.path.join(tempfile.mkdtemp(), "in.mp4"); _tiny_mp4(src)
    with open(src, "rb") as fh:
        r = c.post("/clip/analyze", data={"video": (fh, "in.mp4")},
                   content_type="multipart/form-data")
    jid = r.get_json()["job_id"]
    for _ in range(120):
        st = c.get(f"/clip/status/{jid}").get_json()
        if st["state"] in ("ready", "error"): break
        time.sleep(0.25)
    assert st["state"] == "ready", st
    assert len(st["candidates"]) == 1 and st["candidates"][0]["title"] == "T"

    r = c.post(f"/clip/render/{jid}", json={"indices": [0]})
    assert r.get_json()["ok"]
    for _ in range(240):
        st = c.get(f"/clip/status/{jid}").get_json()
        if st["state"] in ("done", "error") and st["clips"].get("0", {}).get("state") in ("done", "error"):
            break
        time.sleep(0.25)
    assert st["clips"]["0"]["state"] == "done", st["clips"]
    v = c.get(f"/clip/video/{jid}/0")
    assert v.status_code == 200 and v.data[:4] != b""

if __name__ == "__main__":
    test_analyze_then_render()
    print("PASS")
