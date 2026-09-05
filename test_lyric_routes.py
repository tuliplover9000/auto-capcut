# test_lyric_routes.py — /lyric/run -> status -> video/download, with every slow
# or networked bit mocked (lrclib is NEVER hit, Whisper never really runs).
import os, shutil, time, tempfile, app, autoedit, lyricmode


def _make_mp4(path, dur=5):
    ff = autoedit.ff_exe()
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", f"testsrc=size=320x240:rate=10:duration={dur}",
                  "-f", "lavfi", "-i", f"sine=frequency=440:duration={dur}",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path],
                 timeout=120)


def _words(text, t0, step=0.1):
    return [{"word": w, "start": t0 + i * step, "end": t0 + i * step + 0.05}
            for i, w in enumerate(text.split())]


LINE_A = "shadows follow where we go tonight"
LINE_B = "dancing through the midnight fire"
LRC_AT_ZERO = f"[00:01.00]{LINE_A}\n[00:03.00]{LINE_B}\n"


class Calls:
    """Records what the mocked heavy functions were asked to do."""
    def __init__(self):
        self.transcribe = 0
        self.render = []


def _install_mocks(calls, lrc=LRC_AT_ZERO, segs=None):
    lyricmode.fetch_synced_lyrics = lambda track, artist, timeout=15: lrc

    def fake_transcribe(wav, model):
        calls.transcribe += 1
        if segs is not None:
            return segs
        return [{"start": 1.0, "text": LINE_A, "words": _words(LINE_A, 1.0)},
                {"start": 3.0, "text": LINE_B, "words": _words(LINE_B, 3.0)}]
    autoedit.transcribe = fake_transcribe
    autoedit.extract_audio = lambda src, wav: open(wav, "wb").close() or True

    def fake_render(input_path, lines, out_mp4, tmpdir, tint="auto",
                    progress_cb=None, mask_w=384):
        calls.render.append({"lines": list(lines), "tint": tint})
        shutil.copyfile(input_path, out_mp4)          # a real, playable stub
        if progress_cb:
            progress_cb(10, 10)
    lyricmode.render_lyric_video = fake_render


def _wait(c, jid, limit=240):
    st = {}
    for _ in range(limit):
        st = c.get(f"/lyric/status/{jid}").get_json()
        if st["state"] in ("done", "error"):
            return st
        time.sleep(0.25)
    return st


def _post(c, extra=None, dur=5):
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "in.mp4")
    _make_mp4(src, dur)
    data = {"track": "Midnight Fire", "artist": "Test Band"}
    data.update(extra or {})
    with open(src, "rb") as fh:
        data["video"] = (fh, "in.mp4")
        return c.post("/lyric/run", data=data, content_type="multipart/form-data")


def test_parse_song_pos():
    assert app._parse_song_pos("0:42") == 42.0
    assert app._parse_song_pos("1:05.5") == 65.5
    assert app._parse_song_pos("42") == 42.0
    assert app._parse_song_pos("") is None
    assert app._parse_song_pos(None) is None
    assert app._parse_song_pos("banana") is None


def test_run_aligns_and_renders():
    c = app.app.test_client()
    calls = Calls()
    _install_mocks(calls)
    r = _post(c)
    assert r.status_code == 200, (r.status_code, r.get_data(as_text=True))
    jid = r.get_json()["job_id"]
    st = _wait(c, jid)
    assert st["state"] == "done", st
    assert st["has_mp4"] is True, st
    assert calls.transcribe == 1                      # no start_at -> Whisper ran
    assert len(calls.render) == 1
    times = [t for t, _ in calls.render[0]["lines"]]
    assert times == [1.0, 3.0], calls.render[0]["lines"]   # offset 0 recovered
    assert c.get(f"/lyric/video/{jid}").status_code == 200
    d = c.get(f"/lyric/download/{jid}")
    assert d.status_code == 200 and len(d.get_data()) > 0


def test_start_at_skips_whisper():
    c = app.app.test_client()
    calls = Calls()
    _install_mocks(calls, lrc="[00:42.50]line one here\n[00:44.00]line two here\n")
    r = _post(c, {"start_at": "0:42", "tint": "dark"})
    assert r.status_code == 200, r.get_data(as_text=True)
    jid = r.get_json()["job_id"]
    st = _wait(c, jid)
    assert st["state"] == "done", st
    assert calls.transcribe == 0, "start_at given -> Whisper must NOT run"
    assert calls.render[0]["tint"] == "dark"
    times = [round(t, 2) for t, _ in calls.render[0]["lines"]]
    assert times == [0.5, 2.0], calls.render[0]["lines"]


def test_no_lyrics_falls_back_to_whisper_lines():
    c = app.app.test_client()
    calls = Calls()
    _install_mocks(calls, lrc=None,
                   segs=[{"start": 0.5, "text": "whatever whisper heard",
                          "words": _words("whatever whisper heard", 0.5)},
                         {"start": 2.5, "text": "  ", "words": []}])   # blank -> dropped
    r = _post(c)
    assert r.status_code == 200
    jid = r.get_json()["job_id"]
    st = _wait(c, jid)
    assert st["state"] == "done", st
    assert calls.render[0]["lines"] == [(0.5, "whatever whisper heard")], calls.render[0]


def test_unalignable_errors_clearly():
    c = app.app.test_client()
    calls = Calls()
    _install_mocks(calls, lrc=LRC_AT_ZERO,
                   segs=[{"start": 0.0, "text": "totally unrelated speech here",
                          "words": _words("totally unrelated speech here", 0.0)}])
    r = _post(c)
    jid = r.get_json()["job_id"]
    st = _wait(c, jid)
    assert st["state"] == "error", st
    assert "start" in st["error"].lower(), st["error"]     # points at the escape hatch
    assert not calls.render


def test_missing_track_and_bad_file_rejected():
    c = app.app.test_client()
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "in.mp4"); _make_mp4(src, 2)
    with open(src, "rb") as fh:
        r = c.post("/lyric/run", data={"video": (fh, "in.mp4"), "artist": "x"},
                   content_type="multipart/form-data")
    assert r.status_code == 400, r.status_code           # no track
    with open(src, "rb") as fh:
        r = c.post("/lyric/run", data={"video": (fh, "in.txt"), "track": "x"},
                   content_type="multipart/form-data")
    assert r.status_code == 400, r.status_code           # bad extension
    r = c.post("/lyric/run", data={"track": "x"})
    assert r.status_code == 400, r.status_code           # no file at all


def test_unknown_job_404s():
    c = app.app.test_client()
    assert c.get("/lyric/status/nope").status_code == 404
    assert c.get("/lyric/video/nope").status_code == 404
    assert c.get("/lyric/download/nope").status_code == 404


if __name__ == "__main__":
    test_parse_song_pos()
    test_run_aligns_and_renders()
    test_start_at_skips_whisper()
    test_no_lyrics_falls_back_to_whisper_lines()
    test_unalignable_errors_clearly()
    test_missing_track_and_bad_file_rejected()
    test_unknown_job_404s()
    print("PASS")
