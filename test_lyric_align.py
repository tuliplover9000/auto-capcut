# test_lyric_align.py
import lyricmode

def words_at(text, t0):
    return [{"word": w, "start": t0 + i * 0.4, "end": t0 + i * 0.4 + 0.3}
            for i, w in enumerate(text.split())]

def test_known_offset_recovered():
    # clip_time = song_time - 42  -> a line at song 42+x appears at clip x.
    # Lines that fall INSIDE the clip: song 50s/60s/70s/80s -> clip 8/18/28/38.
    # The chorus text repeats (60s and 70s) so BOTH its occurrences are excluded
    # from anchoring; the two unique lines still carry the offset.
    lrc = [(50.0, "shadows follow where we go tonight"),
           (60.0, "hold me closer till the morning light"),
           (70.0, "hold me closer till the morning light"),   # duplicate text -> excluded
           (80.0, "dancing through the midnight fire")]
    words = (words_at("shadows follow where we go tonight", 8.0)
             + words_at("hold me closer till the morning light", 18.0)
             + words_at("dancing through the midnight fire", 38.0))
    off = lyricmode.align_offset(lrc, words)
    assert off is not None and abs(off - (-42.0)) < 1.5, off

def test_insufficient_or_conflicting_anchors():
    lrc = [(50.0, "shadows follow where we go tonight")]
    words = words_at("shadows follow where we go tonight", 8.0)
    assert lyricmode.align_offset(lrc, words) is None          # 1 anchor < 2
    lrc2 = [(50.0, "shadows follow where we go tonight"),
            (60.0, "completely different words entirely here")]
    words2 = (words_at("shadows follow where we go tonight", 8.0)
              + words_at("completely different words entirely here", 90.0))  # wildly off
    assert lyricmode.align_offset(lrc2, words2) is None        # anchors disagree

def test_all_duplicate_lines_never_anchor():
    """A song whose every line repeats gives no unique anchor at all."""
    lrc = [(50.0, "we are burning up the night"),
           (70.0, "we are burning up the night")]
    words = words_at("we are burning up the night", 8.0)
    assert lyricmode.align_offset(lrc, words) is None

if __name__ == "__main__":
    test_known_offset_recovered()
    test_insufficient_or_conflicting_anchors()
    test_all_duplicate_lines_never_anchor()
    print("PASS")
