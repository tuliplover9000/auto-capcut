# test_clipper_snap.py
import autoedit

def test_snap_adds_tail_and_clamps_end():
    s, e = autoedit._snap_clip_bounds(10.0, 40.0, total_duration=100.0)
    assert s == 10.0 and abs(e - 40.3) < 1e-6, (s, e)

def test_snap_caps_max_len():
    s, e = autoedit._snap_clip_bounds(0.0, 500.0, total_duration=1000.0, max_len=90.0)
    assert s == 0.0 and abs(e - 90.0) < 1e-6, (s, e)

def test_snap_clamps_to_duration():
    s, e = autoedit._snap_clip_bounds(95.0, 130.0, total_duration=100.0)
    assert e <= 100.0, e

def test_clamp_score():
    assert autoedit._clamp_score(73) == 73
    assert autoedit._clamp_score("88") == 88
    assert autoedit._clamp_score(150) == 100
    assert autoedit._clamp_score(-5) == 1
    assert autoedit._clamp_score("nonsense") == 50
    assert autoedit._clamp_score(None) == 50

if __name__ == "__main__":
    for fn in (test_snap_adds_tail_and_clamps_end, test_snap_caps_max_len,
               test_snap_clamps_to_duration, test_clamp_score):
        fn()
    print("PASS")
