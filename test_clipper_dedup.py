# test_clipper_dedup.py
import autoedit

def c(start, end, score):
    return {"start": start, "end": end, "dur": end - start, "score": score,
            "title": "t", "hook": "h", "reason": "r"}

def test_dedup_keeps_higher_score_on_overlap():
    cands = [c(0, 30, 60), c(5, 32, 90)]      # ~85% overlap
    out = autoedit._dedup_candidates(cands)
    assert len(out) == 1 and out[0]["score"] == 90, out

def test_dedup_keeps_disjoint():
    cands = [c(0, 30, 60), c(60, 90, 50)]
    out = autoedit._dedup_candidates(cands)
    assert len(out) == 2

def test_dedup_sorts_by_score_and_caps():
    cands = [c(i*100, i*100+30, i*10) for i in range(1, 20)]   # all disjoint
    out = autoedit._dedup_candidates(cands, max_clips=5)
    assert len(out) == 5
    assert [x["score"] for x in out] == sorted([x["score"] for x in out], reverse=True)

if __name__ == "__main__":
    test_dedup_keeps_higher_score_on_overlap(); test_dedup_keeps_disjoint()
    test_dedup_sorts_by_score_and_caps()
    print("PASS")
