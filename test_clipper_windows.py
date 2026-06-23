# test_clipper_windows.py
import autoedit

def _mk_words(n, step=1.0):
    return [{"word": f"w{i}", "start": i*step, "end": i*step+0.5} for i in range(n)]

def test_windows_cover_and_overlap():
    words = _mk_words(600, step=1.0)          # 600s of speech, 1 word/sec
    wins = autoedit._window_transcript(words, 600.0, window_s=240.0, overlap_s=30.0)
    assert len(wins) >= 2, wins
    # first window starts at 0 and holds ~240 words
    assert wins[0]["start_s"] == 0.0
    assert 230 <= len(wins[0]["words"]) <= 250, len(wins[0]["words"])
    # consecutive windows step by window-overlap (210s) and overlap by 30s
    assert abs(wins[1]["start_s"] - 210.0) < 1e-6, wins[1]["start_s"]
    # text is the joined words
    assert wins[0]["text"].startswith("w0 w1 w2"), wins[0]["text"][:20]
    # every real word appears in at least one window
    seen = set()
    for wdw in wins:
        for w in wdw["words"]:
            seen.add(w["word"])
    assert len(seen) == 600, len(seen)

def test_windows_short_input_single():
    words = _mk_words(40, step=1.0)
    wins = autoedit._window_transcript(words, 40.0, window_s=240.0, overlap_s=30.0)
    assert len(wins) == 1 and len(wins[0]["words"]) == 40

if __name__ == "__main__":
    test_windows_cover_and_overlap(); test_windows_short_input_single()
    print("PASS")
