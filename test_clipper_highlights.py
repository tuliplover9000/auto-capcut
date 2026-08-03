# test_clipper_highlights.py
import autoedit

# Build all_words from a known transcript so phrase->span mapping is exact.
SENT = ("the best advice i ever got was to just start before you feel ready "
        "and here is the crazy part nobody tells you this one weird trick "
        "changed how i think about money forever and that is the whole point").split()
ALL_WORDS = [{"word": w, "start": float(i), "end": float(i) + 0.6}
             for i, w in enumerate(SENT)]
DUR = float(len(SENT))

def test_find_highlights_maps_and_ranks(monkeypatch=None):
    fake = (
        '[{"start_phrase":"the best advice i ever got",'
        '  "end_phrase":"before you feel ready",'
        '  "title":"Start before you are ready","hook":"the #1 thing","score":92,"reason":"strong"},'
        ' {"start_phrase":"here is the crazy part",'
        '  "end_phrase":"changed how i think about money",'
        '  "title":"The money trick","hook":"nobody tells you","score":80,"reason":"curiosity"}]'
    )
    autoedit._claude_cli = lambda prompt, stdin, model="sonnet": fake   # mock the CLI
    out = autoedit.find_highlights("ignored", ALL_WORDS, DUR, model="sonnet")
    assert len(out) == 2, out
    assert out[0]["score"] == 92 and out[0]["title"].startswith("Start")
    # first clip starts at word 0 ("the") and ends after "...ready" (+tail)
    assert out[0]["start"] == 0.0, out[0]
    assert out[0]["end"] > 12.0 and out[0]["end"] <= DUR + 0.3
    for clip in out:
        assert clip["end"] > clip["start"]
        assert 1 <= clip["score"] <= 100

def test_find_highlights_partial_failure_survives():
    # One garbled window among good ones is skipped, not fatal. Simulate a call
    # that returns junk once then valid JSON (so ok>0 overall). Windows now run
    # concurrently, so the mock must be thread-safe.
    import threading
    state = {"n": 0}; lk = threading.Lock()
    good = '[{"start_phrase":"here is the crazy part","end_phrase":"changed how i think about money","title":"T","hook":"h","score":70,"reason":"r"}]'
    def flaky(prompt, stdin, model="sonnet"):
        with lk:
            state["n"] += 1
            first = state["n"] == 1
        return "not json" if first else good
    autoedit._claude_cli = flaky
    # force >=2 windows so one can fail and one succeed
    out = autoedit.find_highlights("ignored", ALL_WORDS, DUR, window_s=20.0, overlap_s=2.0)
    assert isinstance(out, list)          # no crash; partial results tolerated

def test_find_highlights_runs_windows_concurrently_with_progress():
    # Prove (1) progress_cb fires done=1..total, and (2) >1 call is in flight at
    # once: each mocked call sleeps; overlapping calls record concurrency >= 2.
    import threading, time
    peak = {"now": 0, "max": 0}; lk = threading.Lock()
    def slow(prompt, stdin, model="sonnet"):
        with lk:
            peak["now"] += 1; peak["max"] = max(peak["max"], peak["now"])
        time.sleep(0.25)
        with lk:
            peak["now"] -= 1
        return "[]"
    autoedit._claude_cli = slow
    ticks = []
    # 100 words at 1/sec -> window_s=30/overlap_s=5 gives 4 windows of ~30 words
    # (each clears the >=20-word minimum, unlike the short ALL_WORDS transcript)
    long_words = [{"word": f"w{i}", "start": float(i), "end": float(i) + 0.6}
                  for i in range(100)]
    out = autoedit.find_highlights("ignored", long_words, 100.0,
                                   window_s=30.0, overlap_s=5.0,
                                   progress_cb=lambda d, t: ticks.append((d, t)))
    assert out == []
    total = ticks[0][1]
    assert total >= 2, f"need >=2 windows for this test, got {total}"
    assert ticks[-1] == (total, total), ticks[-1]
    assert peak["max"] >= 2, f"windows did not overlap (peak={peak['max']})"

def test_find_highlights_all_fail_raises():
    # Every window errors (e.g. claude logged out -> 401): must RAISE, not return []
    autoedit._claude_cli = lambda prompt, stdin, model="sonnet": (_ for _ in ()).throw(
        RuntimeError("Claude CLI returned exit code 1 ... 401"))
    raised = False
    try:
        autoedit.find_highlights("ignored", ALL_WORDS, DUR)
    except RuntimeError as e:
        raised = "logged in" in str(e) or "Claude" in str(e)
    assert raised, "all-window failure should raise a clear error, not look like 'no speech'"

if __name__ == "__main__":
    test_find_highlights_maps_and_ranks()
    test_find_highlights_partial_failure_survives()
    test_find_highlights_all_fail_raises()
    test_find_highlights_runs_windows_concurrently_with_progress()
    print("PASS")
