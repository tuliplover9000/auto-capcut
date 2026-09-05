# test_lyric_parse.py
import lyricmode

def test_parse_basic_and_multitag():
    lrc = ("[00:12.00]first line\n"
           "[00:45.50][01:30.00]chorus line\n"
           "junk without tag\n"
           "[00:05]early line\n"
           "[00:20.123]   \n")            # timestamped but empty -> dropped
    out = lyricmode.parse_lrc(lrc)
    assert out[0] == (5.0, "early line"), out[0]
    assert (12.0, "first line") in out
    assert (45.5, "chorus line") in out and (90.0, "chorus line") in out
    assert all(t2 >= t1 for (t1, _), (t2, _) in zip(out, out[1:]))
    assert not any(ln.strip() == "" for _, ln in out)
    assert lyricmode.parse_lrc("") == [] and lyricmode.parse_lrc(None) == []

if __name__ == "__main__":
    test_parse_basic_and_multitag(); print("PASS")
