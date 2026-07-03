# test_clipper_url.py — /clip/analyze accepts a URL: worker downloads then analyzes.
import os, time, tempfile, app, autoedit


def _make_mp4(path):
    ff = autoedit.ff_exe()
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=5",
                  "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path],
                 timeout=120)


def test_url_page_input_present():
    html = app.app.test_client().get("/").get_data(as_text=True)
    for needle in ['id="clipUrl"', 'fd.append("url"', 'clipReady']:
        assert needle in html, f"missing URL UI hook: {needle}"


def test_analyze_from_url():
    c = app.app.test_client()
    # mock the download (write a real playable mp4 into the job dir) + the slow bits
    def fake_dl(url, jobdir, timeout=1800):
        p = os.path.join(jobdir, "input.mp4"); _make_mp4(p); return p
    app._download_youtube = fake_dl
    autoedit.extract_audio = lambda src, wav: open(wav, "wb").close() or True
    autoedit.transcribe = lambda wav, m: [{"words": [
        {"word": w, "start": float(i)*0.4, "end": float(i)*0.4+0.3}
        for i, w in enumerate("a clip pulled straight from a youtube link for testing".split())]}]
    autoedit.build_transcript_text = lambda segs: "x"
    autoedit.find_highlights = lambda *a, **k: [
        {"start": 0.0, "end": 4.0, "dur": 4.0, "title": "From URL", "hook": "h", "score": 88, "reason": "r"}]

    r = c.post("/clip/analyze", data={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"})
    assert r.status_code == 200, (r.status_code, r.get_data(as_text=True))
    jid = r.get_json()["job_id"]
    for _ in range(160):
        st = c.get(f"/clip/status/{jid}").get_json()
        if st["state"] in ("ready", "error"):
            break
        time.sleep(0.25)
    assert st["state"] == "ready", st
    assert len(st["candidates"]) == 1 and st["candidates"][0]["title"] == "From URL"


def test_analyze_rejects_junk():
    c = app.app.test_client()
    r = c.post("/clip/analyze", data={"url": "not a url"})
    assert r.status_code == 400, r.status_code


if __name__ == "__main__":
    test_url_page_input_present()
    test_analyze_from_url()
    test_analyze_rejects_junk()
    print("PASS")
