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
    # that returns junk once then valid JSON (so ok>0 overall).
    state = {"n": 0}
    good = '[{"start_phrase":"here is the crazy part","end_phrase":"changed how i think about money","title":"T","hook":"h","score":70,"reason":"r"}]'
    def flaky(prompt, stdin, model="sonnet"):
        state["n"] += 1
        return "not json" if state["n"] == 1 else good
    autoedit._claude_cli = flaky
    # force >=2 windows so one can fail and one succeed
    out = autoedit.find_highlights("ignored", ALL_WORDS, DUR, window_s=20.0, overlap_s=2.0)
    assert isinstance(out, list)          # no crash; partial results tolerated

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
    print("PASS")
