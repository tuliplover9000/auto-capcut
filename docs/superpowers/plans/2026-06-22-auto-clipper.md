# Auto-Clipper Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an auto-clipper mode that turns a long spoken-content video into a ranked list of highlight moments, then renders the user-selected ones as vertical 9:16 shorts with word-by-word captions.

**Architecture:** Two new pure-ish functions in `autoedit.py` (`find_highlights` = chunked windowed Claude pass + deterministic boundary-snap; `render_clip_vertical` = fit+blur 9:16 reframe in one ffmpeg pass), a two-phase job flow in `app.py` (analyze → candidate list → render selected), and a separate "Auto-clip a long video" UI mode. Reuses `transcribe`, `_map_clean_to_spans`, `_claude_cli`, `_extract_json`, `write_ass`, `burn_captions`.

**Tech Stack:** Python 3, Flask, faster-whisper, ffmpeg (via imageio-ffmpeg), headless `claude` CLI (Max-subscription auth).

## Global Constraints

- **`claude` CLI auth:** Always call via `autoedit._claude_cli(...)`. Never pass `--bare`; never rely on `ANTHROPIC_API_KEY` (it is popped from env on purpose). 300s timeout per call — keep each call's input small (this is why detection is windowed).
- **Secrets:** The Pexels key lives in a gitignored `.env`. Never print or commit it.
- **ffmpeg:** Get the binary via `autoedit.ff_exe()`. No ffprobe available — use `autoedit.probe()`. libx264 + `yuv420p` needs **even** width/height. Overlay/scale chains drop color tags, so the final node must re-stamp via `autoedit._setparams_suffix(spec.get("color"))`.
- **Tests run in-sandbox where the real `claude` CLI times out** — every test that would hit Claude must monkeypatch `autoedit._claude_cli`. Tests are standalone scripts (repo convention): `python test_clipper_*.py` prints `PASS` on success, raises/asserts on failure.
- **Commit after each task.** Remote is `origin` (`https://github.com/tuliplover9000/auto-capcut.git`). Use `git commit -F` with a temp message file (here-strings word-split on this shell).
- **Verbatim principle:** clips are NOT internally re-cut. Boundaries come from the detector; only end-tail + length clamp + dedup are applied.

---

### Task 1: Transcript windowing helper

**Files:**
- Modify: `autoedit.py` (add `_window_transcript` near the other cut helpers, after `_map_clean_to_spans` ~line 483)
- Test: `test_clipper_windows.py` (repo root)

**Interfaces:**
- Consumes: `all_words` = list of `{"word": str, "start": float, "end": float}` (from `transcribe`).
- Produces: `_window_transcript(all_words, total_duration, window_s=240.0, overlap_s=30.0) -> list[dict]`, each `{"start_s": float, "words": list[dict], "text": str}`. `text` is the window's words space-joined.

- [ ] **Step 1: Write the failing test**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python test_clipper_windows.py`
Expected: FAIL — `AttributeError: module 'autoedit' has no attribute '_window_transcript'`

- [ ] **Step 3: Write minimal implementation**

```python
def _window_transcript(all_words, total_duration, window_s=240.0, overlap_s=30.0):
    """Split words into overlapping time windows so the highlight detector never
    sees more than ~window_s of transcript per Claude call (keeps each call well
    under the 300s CLI timeout) and a moment on a boundary still lands whole in a
    neighbouring window. Returns [{start_s, words, text}, ...]."""
    words = sorted((w for w in all_words
                    if isinstance(w, dict)
                    and isinstance(w.get("start"), (int, float))),
                   key=lambda w: w["start"])
    if not words:
        return []
    window_s = float(window_s)
    step = max(1.0, window_s - float(overlap_s))
    dur = float(total_duration) if total_duration and total_duration > 0 else (words[-1]["start"] + 1.0)
    wins = []
    t = 0.0
    while t < dur:
        lo, hi = t, t + window_s
        chunk = [w for w in words if lo <= w["start"] < hi]
        if chunk:
            wins.append({"start_s": round(t, 3), "words": chunk,
                         "text": " ".join(str(w["word"]).strip() for w in chunk)})
        if hi >= dur:
            break
        t += step
    # collapse the degenerate case (one short window duplicated) to a single window
    if len(wins) >= 2 and len(wins[0]["words"]) == len(words):
        return wins[:1]
    return wins or ([{"start_s": 0.0, "words": words,
                      "text": " ".join(str(w["word"]).strip() for w in words)}])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python test_clipper_windows.py`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add autoedit.py test_clipper_windows.py
git commit -F COMMIT_MSG.tmp   # "Auto-clipper: transcript windowing helper"
```

---

### Task 2: Clip-boundary snap + score clamp

**Files:**
- Modify: `autoedit.py` (add `_snap_clip_bounds` and `_clamp_score` after `_window_transcript`)
- Test: `test_clipper_snap.py`

**Interfaces:**
- Produces:
  - `_snap_clip_bounds(start, end, total_duration, max_len=90.0, tail=0.3) -> (float, float)` — adds end tail, clamps to `[0, total_duration]`, caps length at `max_len`.
  - `_clamp_score(v) -> int` in `[1, 100]`, default `50` on garbage.

- [ ] **Step 1: Write the failing test**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python test_clipper_snap.py`
Expected: FAIL — `AttributeError: ... '_snap_clip_bounds'`

- [ ] **Step 3: Write minimal implementation**

```python
def _snap_clip_bounds(start, end, total_duration, max_len=90.0, tail=0.3):
    """Finalise a clip's [start,end]: pad the end with a small tail (so the last
    word isn't clipped), cap the length at max_len, and clamp inside the video."""
    start = max(0.0, float(start))
    end = float(end) + float(tail)
    if total_duration and total_duration > 0:
        end = min(end, float(total_duration))
    if end - start > max_len:
        end = start + max_len
    return (round(start, 3), round(end, 3))


def _clamp_score(v):
    """Coerce a model-provided score to an int in [1,100]; default 50."""
    try:
        n = int(round(float(v)))
    except (TypeError, ValueError):
        return 50
    return max(1, min(100, n))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python test_clipper_snap.py`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add autoedit.py test_clipper_snap.py
git commit -F COMMIT_MSG.tmp   # "Auto-clipper: clip-boundary snap + score clamp"
```

---

### Task 3: Candidate dedup + rank

**Files:**
- Modify: `autoedit.py` (add `_dedup_candidates` after `_clamp_score`)
- Test: `test_clipper_dedup.py`

**Interfaces:**
- Consumes: list of candidate dicts each with `start, end, dur, score` (and other fields passed through).
- Produces: `_dedup_candidates(cands, max_clips=12) -> list[dict]` — sorted by score desc, drops a candidate overlapping an already-kept one by >50% of the shorter clip, truncates to `max_clips`.

- [ ] **Step 1: Write the failing test**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python test_clipper_dedup.py`
Expected: FAIL — `AttributeError: ... '_dedup_candidates'`

- [ ] **Step 3: Write minimal implementation**

```python
def _dedup_candidates(cands, max_clips=12):
    """Rank candidates by score (desc) and drop any that overlap an already-kept
    clip by more than 50% of the shorter clip. Truncate to max_clips."""
    ranked = sorted(cands, key=lambda x: x.get("score", 0), reverse=True)
    kept = []
    for x in ranked:
        xs, xe, xd = x["start"], x["end"], max(0.001, x["dur"])
        dup = False
        for k in kept:
            ov = max(0.0, min(xe, k["end"]) - max(xs, k["start"]))
            if ov > 0.5 * min(xd, max(0.001, k["dur"])):
                dup = True
                break
        if not dup:
            kept.append(x)
        if len(kept) >= max_clips:
            break
    return kept
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python test_clipper_dedup.py`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add autoedit.py test_clipper_dedup.py
git commit -F COMMIT_MSG.tmp   # "Auto-clipper: candidate dedup + rank"
```

---

### Task 4: `find_highlights` orchestration (mocked Claude)

**Files:**
- Modify: `autoedit.py` (add `_HIGHLIGHT_PROMPT` and `find_highlights` after `_dedup_candidates`)
- Test: `test_clipper_highlights.py`

**Interfaces:**
- Consumes: `_window_transcript`, `_claude_cli`, `_extract_json`, `_map_clean_to_spans`, `_snap_clip_bounds`, `_clamp_score`, `_dedup_candidates`.
- Produces: `find_highlights(transcript_text, all_words, total_duration, model="sonnet", window_s=240.0, overlap_s=30.0, max_clips=12) -> list[dict]`, each `{"start": float, "end": float, "dur": float, "title": str, "hook": str, "score": int, "reason": str}`.

- [ ] **Step 1: Write the failing test**

```python
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

def test_find_highlights_survives_bad_window():
    autoedit._claude_cli = lambda prompt, stdin, model="sonnet": "not json at all"
    out = autoedit.find_highlights("ignored", ALL_WORDS, DUR)
    assert out == []          # no candidates, but no crash

if __name__ == "__main__":
    test_find_highlights_maps_and_ranks(); test_find_highlights_survives_bad_window()
    print("PASS")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python test_clipper_highlights.py`
Expected: FAIL — `AttributeError: ... 'find_highlights'`

- [ ] **Step 3: Write minimal implementation**

```python
_HIGHLIGHT_PROMPT = """You are finding the best short-form clips inside a slice of a longer video's transcript (on stdin). Pick the moments that would make strong standalone vertical shorts for TikTok / Reels / YouTube Shorts.

A good clip is ONE self-contained idea with a hook — a surprising claim, a story beat, a strong tip, a punchline — that makes sense without the surrounding context. Ideally 15-90 seconds of speech.

Return ONLY a JSON array (no prose, no code fence). For each clip:
{
  "start_phrase": "<the FIRST ~6 words of the clip, copied VERBATIM from the transcript>",
  "end_phrase":   "<the LAST ~6 words of the clip, copied VERBATIM from the transcript>",
  "title": "<a punchy 3-8 word title for the short>",
  "hook":  "<one short sentence: why someone keeps watching>",
  "score": <integer 1-100, how strong/viral this clip is>,
  "reason": "<one short clause on what makes it work>"
}

Rules:
- start_phrase and end_phrase MUST be copied word-for-word from the transcript (they are matched back to the audio). Do not paraphrase.
- Prefer fewer, stronger clips over many weak ones. Skip filler, throat-clearing, and rambling.
- If this slice has nothing clip-worthy, return [].

The transcript slice is on stdin."""


def find_highlights(transcript_text, all_words, total_duration, model="sonnet",
                    window_s=240.0, overlap_s=30.0, max_clips=12):
    """Find ranked highlight clips in a long transcript. Windows the transcript,
    asks Claude per window for self-contained moments (verbatim start/end
    phrases), maps those phrases back to word timestamps, snaps/clamps the
    bounds, dedups across windows, and returns the top max_clips by score.
    Best-effort per window: a failed/timed-out/garbled window is skipped."""
    windows = _window_transcript(all_words, total_duration, window_s, overlap_s)
    raw = []
    for win in windows:
        if len(win["words"]) < 20:           # too little speech to clip from
            continue
        try:
            out = _claude_cli(_HIGHLIGHT_PROMPT, win["text"], model=model)
            data = _extract_json(out)
        except (RuntimeError, ValueError, OSError):
            continue
        items = data if isinstance(data, list) else (
            data.get("clips", []) if isinstance(data, dict) else [])
        for it in items:
            if not isinstance(it, dict):
                continue
            sp = str(it.get("start_phrase", "")).strip()
            ep = str(it.get("end_phrase", "")).strip()
            if not sp or not ep:
                continue
            ss = _map_clean_to_spans([sp], all_words)
            ee = _map_clean_to_spans([ep], all_words)
            if not ss or not ee:
                continue
            start, end = ss[0][0], ee[-1][1]
            if end <= start:
                continue
            start, end = _snap_clip_bounds(start, end, total_duration)
            if end - start < 10.0:           # too short even to be a short
                continue
            raw.append({
                "start": start, "end": end, "dur": round(end - start, 3),
                "title": (str(it.get("title", "")).strip()[:120] or "Clip"),
                "hook": str(it.get("hook", "")).strip()[:200],
                "score": _clamp_score(it.get("score")),
                "reason": str(it.get("reason", "")).strip()[:300],
            })
    return _dedup_candidates(raw, max_clips)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python test_clipper_highlights.py`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add autoedit.py test_clipper_highlights.py
git commit -F COMMIT_MSG.tmp   # "Auto-clipper: find_highlights orchestration (windowed, mocked-CLI tested)"
```

---

### Task 5: `render_clip_vertical` (fit+blur 9:16 reframe)

**Files:**
- Modify: `autoedit.py` (add `render_clip_vertical` after `render_video` ~line 1610)
- Test: `test_clipper_reframe.py`

**Interfaces:**
- Consumes: `ff_exe`, `run`, `probe`, `_setparams_suffix`, `_has_audio`.
- Produces: `render_clip_vertical(input_path, start, end, spec, out_mp4, tmpdir, out_w=1080, out_h=1920) -> None` — frame-exact trim `[start,end]` + fit+blur to `out_w×out_h`, audio sample-exact trimmed. Raises `RuntimeError` on failure.

- [ ] **Step 1: Write the failing test**

```python
# test_clipper_reframe.py
import os, tempfile, autoedit

def test_reframe_to_vertical():
    ff = autoedit.ff_exe(); assert ff
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "src.mp4")
    # 6s 1280x720 test source WITH an audio tone
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=6",
                  "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", src],
                 timeout=120)
    assert os.path.exists(src)
    spec = autoedit.probe(src)
    out = os.path.join(tmp, "clip.mp4")
    autoedit.render_clip_vertical(src, 1.0, 4.0, spec, out, tmp)
    assert os.path.exists(out) and os.path.getsize(out) > 0
    ospec = autoedit.probe(out)
    assert ospec["disp_width"] == 1080 and ospec["disp_height"] == 1920, ospec
    assert ospec["disp_width"] % 2 == 0 and ospec["disp_height"] % 2 == 0
    assert 2.7 <= ospec["duration"] <= 3.4, ospec["duration"]      # ~3s trim
    assert autoedit._has_audio(out), "clip lost its audio"

if __name__ == "__main__":
    test_reframe_to_vertical()
    print("PASS")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python test_clipper_reframe.py`
Expected: FAIL — `AttributeError: ... 'render_clip_vertical'`

- [ ] **Step 3: Write minimal implementation**

```python
def render_clip_vertical(input_path, start, end, spec, out_mp4, tmpdir,
                         out_w=1080, out_h=1920):
    """Trim [start,end] from input_path and reframe to out_w x out_h vertical
    with the fit+blur look: the whole frame is scaled to FIT the width and
    centred over a blurred, slightly darkened COVER of itself (nothing cropped
    out). Frame/sample-exact trim (filter trim/atrim, not -ss) so burned captions
    written against cutlist=[(start,end)] stay in sync. One encode."""
    ff = ff_exe()
    if not ff:
        raise RuntimeError("ffmpeg not found — pip install imageio-ffmpeg")
    start = max(0.0, float(start))
    end = float(end)
    if end - start < 0.1:
        raise RuntimeError(f"clip too short: {end - start:.3f}s")
    out_w -= out_w % 2
    out_h -= out_h % 2
    out_abs = os.path.abspath(out_mp4)
    setparams = _setparams_suffix(spec.get("color"))     # ",setparams=..." or ""

    vchain = (
        f"[0:v]trim={start:.3f}:{end:.3f},setpts=PTS-STARTPTS,setsar=1,split[bgsrc][fgsrc];"
        f"[bgsrc]scale={out_w}:{out_h}:force_original_aspect_ratio=increase,"
        f"crop={out_w}:{out_h},boxblur=18:2,eq=brightness=-0.18[bg];"
        f"[fgsrc]scale={out_w}:{out_h}:force_original_aspect_ratio=decrease[fg];"
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2{setparams}[outv]"
    )
    have_audio = _has_audio(input_path)
    if have_audio:
        achain = f";[0:a]atrim={start:.3f}:{end:.3f},asetpts=PTS-STARTPTS[outa]"
    else:
        achain = ""

    fc_path = os.path.join(tmpdir or os.path.dirname(out_abs) or ".", "clip_fc.txt")
    with open(fc_path, "w", encoding="utf-8") as fcf:
        fcf.write(vchain + achain)

    cmd = [ff, "-y", "-i", os.path.abspath(input_path),
           "-filter_complex_script", fc_path, "-map", "[outv]"]
    if have_audio:
        cmd += ["-map", "[outa]", "-c:a", "aac", "-ar", "48000"]
    else:
        cmd += ["-an"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out_abs]

    r = run(cmd, timeout=600)
    if r.returncode == 124 or not (os.path.exists(out_abs) and os.path.getsize(out_abs) > 0):
        raise RuntimeError(
            f"Vertical clip render failed{' (timed out)' if r.returncode == 124 else ''}.\n"
            f"ffmpeg stderr: {(r.stderr or '')[-800:]}")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python test_clipper_reframe.py`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add autoedit.py test_clipper_reframe.py
git commit -F COMMIT_MSG.tmp   # "Auto-clipper: render_clip_vertical fit+blur 9:16 reframe"
```

---

### Task 6: Clip render+caption pipeline helper (`app.py`)

**Files:**
- Modify: `app.py` (add `_render_one_clip` near `_render_outputs` ~line 133)
- Test: `test_clipper_pipeline.py`

**Interfaces:**
- Consumes: `autoedit.render_clip_vertical`, `autoedit.write_ass`, `autoedit.burn_captions`.
- Produces: `_render_one_clip(input_path, cand, spec, all_words, outdir, idx, captions=True) -> str` — renders clip `idx` to `outdir/clip_<idx>.mp4` (captioned in place when `captions`), returns the absolute path. `cand` is a `find_highlights` dict.

- [ ] **Step 1: Write the failing test**

```python
# test_clipper_pipeline.py
import os, tempfile, app, autoedit

def test_render_one_clip_makes_vertical_captioned(monkeypatch=None):
    ff = autoedit.ff_exe(); assert ff
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "src.mp4")
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=8",
                  "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", src],
                 timeout=120)
    spec = autoedit.probe(src)
    all_words = [{"word": w, "start": 2.0 + i*0.4, "end": 2.0 + i*0.4 + 0.3}
                 for i, w in enumerate("this is a clip from the middle of a longer video".split())]
    cand = {"start": 2.0, "end": 6.0, "dur": 4.0, "title": "Mid clip",
            "hook": "h", "score": 80, "reason": "r"}
    outdir = os.path.join(tmp, "out"); os.makedirs(outdir)
    path = app._render_one_clip(src, cand, spec, all_words, outdir, 0, captions=True)
    assert os.path.exists(path) and path.endswith("clip_0.mp4")
    ospec = autoedit.probe(path)
    assert ospec["disp_width"] == 1080 and ospec["disp_height"] == 1920

if __name__ == "__main__":
    test_render_one_clip_makes_vertical_captioned()
    print("PASS")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python test_clipper_pipeline.py`
Expected: FAIL — `AttributeError: module 'app' has no attribute '_render_one_clip'`

- [ ] **Step 3: Write minimal implementation**

```python
def _render_one_clip(input_path, cand, spec, all_words, outdir, idx, captions=True):
    """Render one highlight candidate to outdir/clip_<idx>.mp4 (vertical fit+blur),
    burning word-by-word captions rebased to the clip when captions=True."""
    tmp = os.path.join(outdir, f"_tmp_{idx}")
    os.makedirs(tmp, exist_ok=True)
    out_path = os.path.join(outdir, f"clip_{idx}.mp4")
    base = os.path.join(tmp, "base.mp4")
    autoedit.render_clip_vertical(input_path, cand["start"], cand["end"], spec, base, tmp)
    if not captions:
        shutil.move(base, out_path)
        return os.path.abspath(out_path)
    ass_path = os.path.join(tmp, "captions.ass")
    n = autoedit.write_ass([(cand["start"], cand["end"])], all_words,
                           1080, 1920, ass_path, style="pop", pos="lower")
    if n > 0:
        autoedit.burn_captions(base, ass_path, out_path)
    else:
        shutil.move(base, out_path)      # no words landed in the clip -> ship uncaptioned
    return os.path.abspath(out_path)
```

Note: confirm `shutil` is imported at the top of `app.py` (it is used by `_grade_to_roughcut`). If not, add `import shutil`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python test_clipper_pipeline.py`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add app.py test_clipper_pipeline.py
git commit -F COMMIT_MSG.tmp   # "Auto-clipper: per-clip render+caption pipeline helper"
```

---

### Task 7: Two-phase clip routes + workers (`app.py`)

**Files:**
- Modify: `app.py` (add routes after the `/sfx/*` routes ~line 700, and two worker functions near `run_job`)
- Test: `test_clipper_routes.py`

**Interfaces:**
- Consumes: `autoedit.probe`, `autoedit.extract_audio`, `autoedit.transcribe`, `autoedit.build_transcript_text`, `autoedit.find_highlights`, `_render_one_clip`, the existing `JOBS`, `LOCK`, `_stage`, `JOBS_DIR`, `ALLOWED_EXT`.
- Produces these routes:
  - `POST /clip/analyze` (multipart `video`, optional `whisper_model`, `model`, `captions`, `max_clips`) → `{job_id}`; spawns `analyze_clip_job`.
  - `GET /clip/status/<job_id>` → `{state, step, stage, error, candidates, clips}` where `candidates` is the `find_highlights` list (+ per-index `rendered` bool) and `clips` is the per-index render state.
  - `POST /clip/render/<job_id>` (json `{indices:[int,...]}`) → `{ok:true}`; spawns `render_clips_job`.
  - `GET /clip/video/<job_id>/<idx>` and `GET /clip/download/<job_id>/<idx>` → serve `clip_<idx>.mp4`.

- [ ] **Step 1: Write the failing test**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python test_clipper_routes.py`
Expected: FAIL — 404 from `/clip/analyze` (route undefined)

- [ ] **Step 3: Write minimal implementation**

```python
def analyze_clip_job(job_id):
    job = JOBS[job_id]
    try:
        _stage(job_id, state="running", step=1, stage="Probing video")
        spec = autoedit.probe(job["input_path"])
        if spec["duration"] <= 0:
            raise RuntimeError("Couldn't read a valid duration — is this a real video?")
        job["spec"] = spec
        _stage(job_id, step=2, stage="Extracting audio")
        wav = os.path.join(job["tmpdir"], "audio.wav")
        if not autoedit.extract_audio(job["input_path"], wav):
            raise RuntimeError("Audio extraction failed — does the video have an audio track?")
        _stage(job_id, step=3, stage="Transcribing (Whisper)")
        segs = autoedit.transcribe(wav, job["settings"]["whisper_model"])
        if not segs:
            raise RuntimeError("Transcription returned nothing — is the video silent?")
        job["all_words"] = [w for sg in segs for w in sg.get("words", [])]
        ttext = autoedit.build_transcript_text(segs)
        _stage(job_id, step=4, stage="Finding highlights")
        cands = autoedit.find_highlights(
            ttext, job["all_words"], spec["duration"],
            model=job["settings"]["model"], max_clips=job["settings"]["max_clips"])
        job["candidates"] = cands
        if not cands:
            _stage(job_id, state="ready", step=5,
                   stage="No clear spoken highlights found — is there enough speech?")
        else:
            _stage(job_id, state="ready", step=5, stage=f"Found {len(cands)} clips")
    except Exception as e:                                   # noqa: BLE001
        _stage(job_id, state="error", error=str(e), stage="Failed")


def render_clips_job(job_id, indices):
    job = JOBS[job_id]
    try:
        _stage(job_id, state="running", stage="Rendering clips")
        for idx in indices:
            if idx < 0 or idx >= len(job.get("candidates", [])):
                continue
            job["clips"][str(idx)] = {"state": "running"}
            _stage(job_id, stage=f"Rendering clip {idx + 1}")
            try:
                path = _render_one_clip(
                    job["input_path"], job["candidates"][idx], job["spec"],
                    job["all_words"], job["outdir"], idx,
                    captions=job["settings"]["captions"])
                job["clips"][str(idx)] = {"state": "done", "file": path,
                                          "title": job["candidates"][idx]["title"]}
            except Exception as e:                            # noqa: BLE001
                job["clips"][str(idx)] = {"state": "error", "error": str(e)}
        _stage(job_id, state="done", stage="Clips ready")
    except Exception as e:                                    # noqa: BLE001
        _stage(job_id, state="error", error=str(e))


@app.route("/clip/analyze", methods=["POST"])
def clip_analyze():
    f = request.files.get("video")
    if not f or not f.filename:
        return jsonify(error="No file uploaded."), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED_EXT:
        return jsonify(error=f"Unsupported type '{ext or '(none)'}'."), 400

    def pick(name, allowed, default):
        v = (request.form.get(name) or "").strip()
        return v if v in allowed else default

    try:
        max_clips = max(1, min(20, int(request.form.get("max_clips", "12"))))
    except ValueError:
        max_clips = 12
    settings = {
        "whisper_model": pick("whisper_model", {"tiny", "base", "small", "medium"}, "base"),
        "model": pick("model", {"sonnet", "opus", "haiku"}, "sonnet"),
        "captions": request.form.get("captions", "1") in ("1", "true", "on", "yes"),
        "max_clips": max_clips,
    }
    job_id = uuid.uuid4().hex[:12]
    jobdir = os.path.join(JOBS_DIR, job_id)
    outdir = os.path.join(jobdir, "out"); os.makedirs(outdir, exist_ok=True)
    tmpdir = os.path.join(jobdir, "tmp"); os.makedirs(tmpdir, exist_ok=True)
    input_path = os.path.join(jobdir, "input" + ext)
    f.save(input_path)
    with LOCK:
        JOBS[job_id] = {
            "kind": "clip", "input_path": input_path, "outdir": outdir,
            "tmpdir": tmpdir, "name": f.filename, "settings": settings,
            "chat": [], "state": "queued", "step": 0, "stage": "Starting…",
            "error": "", "spec": None, "all_words": [], "candidates": [], "clips": {},
        }
    threading.Thread(target=analyze_clip_job, args=(job_id,), daemon=True).start()
    return jsonify(job_id=job_id)


@app.route("/clip/status/<job_id>")
def clip_status(job_id):
    with LOCK:
        j = JOBS.get(job_id)
        if not j or j.get("kind") != "clip":
            return jsonify(error="unknown job"), 404
        cands = []
        for i, c in enumerate(j.get("candidates", [])):
            d = dict(c); d["index"] = i
            d["rendered"] = j["clips"].get(str(i), {}).get("state") == "done"
            cands.append(d)
        return jsonify(state=j["state"], step=j["step"], stage=j["stage"],
                       error=j["error"], candidates=cands, clips=dict(j["clips"]))


@app.route("/clip/render/<job_id>", methods=["POST"])
def clip_render(job_id):
    body = request.json or {}
    indices = [int(i) for i in body.get("indices", []) if str(i).lstrip("-").isdigit()]
    with LOCK:
        j = JOBS.get(job_id)
        if not j or j.get("kind") != "clip":
            return jsonify(error="unknown job"), 404
        if j["state"] == "running":
            return jsonify(error="busy"), 409
        if not j.get("candidates"):
            return jsonify(error="no candidates"), 409
        j["state"] = "running"
    threading.Thread(target=render_clips_job, args=(job_id, indices), daemon=True).start()
    return jsonify(ok=True)


def _clip_file(job_id, idx):
    with LOCK:
        j = JOBS.get(job_id)
    if not j or j.get("kind") != "clip":
        return None
    info = j["clips"].get(str(idx))
    return info.get("file") if info and info.get("state") == "done" else None


@app.route("/clip/video/<job_id>/<int:idx>")
def clip_video(job_id, idx):
    path = _clip_file(job_id, idx)
    if not path:
        abort(404)
    try:
        return send_file(path, mimetype="video/mp4", conditional=True, max_age=0)
    except (FileNotFoundError, OSError):
        abort(404)


@app.route("/clip/download/<job_id>/<int:idx>")
def clip_download(job_id, idx):
    path = _clip_file(job_id, idx)
    if not path:
        abort(404)
    try:
        return send_file(path, as_attachment=True,
                         download_name=f"clip_{idx}.mp4")
    except (FileNotFoundError, OSError):
        abort(404)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python test_clipper_routes.py`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add app.py test_clipper_routes.py
git commit -F COMMIT_MSG.tmp   # "Auto-clipper: two-phase clip routes + analyze/render workers"
```

---

### Task 8: "Auto-clip a long video" UI mode

**Files:**
- Modify: `app.py` (the `PAGE` template — add a mode switch at the top of `.wrap`, a `#clipMode` section mirroring the setup card, and the clipper JS)
- Test: `test_clipper_ui.py` (asserts the page serves the new markup + endpoints)

**Interfaces:**
- Consumes: the `/clip/*` routes from Task 7.
- Produces: a mode toggle (`#mode-edit` / `#mode-clip` buttons) showing/hiding `#editMode` (the existing setup+workspace) vs `#clipMode`; the clipper screen (uploader → Find highlights → candidate cards with checkboxes → Render → result tiles with download links).

- [ ] **Step 1: Write the failing test**

```python
# test_clipper_ui.py
import app

def test_page_has_clipper_mode():
    html = app.app.test_client().get("/").get_data(as_text=True)
    for needle in ['id="mode-clip"', 'id="clipMode"', 'id="clipFile"',
                   'id="clipFind"', '/clip/analyze', '/clip/render/',
                   'renderCandidates', 'clipPoll']:
        assert needle in html, f"missing UI hook: {needle}"

if __name__ == "__main__":
    test_page_has_clipper_mode()
    print("PASS")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python test_clipper_ui.py`
Expected: FAIL — `AssertionError: missing UI hook: id="mode-clip"`

- [ ] **Step 3: Write minimal implementation**

Add the mode switch immediately after `<h1>🎬 CapCut Auto-Edit</h1>` / `<p class="sub">…</p>` and wrap the existing setup+workspace in `<div id="editMode">…</div>`. Then add the clipper section and JS. Concretely:

1. Wrap existing content: put `<div id="editMode">` right before the `<!-- SETUP -->` comment and its matching `</div>` after the workspace/chat block closes (before the `<script>`).
2. Insert the toggle + clip section:

```html
<div class="modesw">
  <button id="mode-edit" class="modebtn on">Edit a clip</button>
  <button id="mode-clip" class="modebtn">Auto-clip a long video</button>
</div>

<div id="clipMode" class="hide">
  <div class="card">
    <p class="sub">Drop a long video (podcast, talk, interview…). It finds the best moments and turns the ones you pick into vertical shorts with captions.</p>
    <div id="clipDrop" class="drop">Drag a long video here, or click to choose</div>
    <input id="clipFile" type="file" accept="video/*,.mp4,.mov,.mkv,.webm,.m4v" style="display:none">
    <div class="row mt">
      <div class="field"><label>Whisper model</label><select id="clipWhisper">
        <option value="base" selected>base (fast)</option>
        <option value="small">small</option>
        <option value="medium">medium (best)</option></select></div>
      <div class="field"><label>Max clips</label><select id="clipMax">
        <option>6</option><option selected>12</option><option>20</option></select></div>
    </div>
    <label class="chk mt"><input type="checkbox" id="clipCaptions" checked>
      <span>Word-by-word captions <span class="note">(burned in)</span></span></label>
    <button id="clipFind" class="go mt" disabled>Find highlights</button>
    <div id="clipStage" class="note mt"></div>
  </div>
  <div id="clipList" class="mt"></div>
  <button id="clipRender" class="go mt hide" disabled>Render selected shorts</button>
  <div id="clipResults" class="mt"></div>
</div>
```

3. Minimal CSS (add near the other styles): `.modesw{display:flex;gap:8px;margin:8px 0 16px}.modebtn{flex:1;padding:10px;border-radius:8px;border:1px solid var(--line);background:#222836;color:var(--fg);font-weight:600;cursor:pointer}.modebtn.on{background:var(--accent);color:#fff;border:0}.clipcard{border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start}.clipcard .meta{flex:1}.clipcard .sc{color:var(--accent);font-weight:700}`

4. JS (append inside the existing `<script>`):

```javascript
// ── Auto-clip mode ──────────────────────────────────────────────
let clipFileObj=null, clipJob=null, clipCands=[];
const $c=s=>document.querySelector(s);
function setMode(m){
  $c("#mode-edit").classList.toggle("on", m==="edit");
  $c("#mode-clip").classList.toggle("on", m==="clip");
  $c("#editMode").classList.toggle("hide", m!=="edit");
  $c("#clipMode").classList.toggle("hide", m!=="clip");
}
$c("#mode-edit").onclick=()=>setMode("edit");
$c("#mode-clip").onclick=()=>setMode("clip");
const cdrop=$c("#clipDrop"), cfile=$c("#clipFile");
cdrop.onclick=()=>cfile.click();
cfile.onchange=()=>{ if(cfile.files[0]) pickClip(cfile.files[0]); };
["dragover","dragenter"].forEach(e=>cdrop.addEventListener(e,ev=>{ev.preventDefault();cdrop.classList.add("hot");}));
["dragleave","drop"].forEach(e=>cdrop.addEventListener(e,ev=>{ev.preventDefault();cdrop.classList.remove("hot");}));
cdrop.addEventListener("drop",ev=>{ if(ev.dataTransfer.files[0]) pickClip(ev.dataTransfer.files[0]); });
function pickClip(f){ clipFileObj=f; cdrop.textContent="✓ "+f.name; $c("#clipFind").disabled=false; }
function fmt(t){ t=Math.max(0,Math.round(t)); const m=Math.floor(t/60), s=t%60; return m+":"+String(s).padStart(2,"0"); }

$c("#clipFind").onclick=async()=>{
  if(!clipFileObj) return;
  $c("#clipFind").disabled=true; $c("#clipList").innerHTML=""; $c("#clipResults").innerHTML="";
  $c("#clipRender").classList.add("hide");
  const fd=new FormData();
  fd.append("video",clipFileObj);
  fd.append("whisper_model",$c("#clipWhisper").value);
  fd.append("max_clips",$c("#clipMax").value);
  fd.append("captions",$c("#clipCaptions").checked?"1":"0");
  const r=await (await fetch("/clip/analyze",{method:"POST",body:fd})).json();
  if(r.error){ $c("#clipStage").textContent=r.error; $c("#clipFind").disabled=false; return; }
  clipJob=r.job_id; clipPoll();
};
async function clipPoll(){
  const st=await (await fetch("/clip/status/"+clipJob)).json();
  $c("#clipStage").textContent=st.stage||"";
  if(st.state==="ready"){ clipCands=st.candidates||[]; renderCandidates(); $c("#clipFind").disabled=false; return; }
  if(st.state==="done"||st.state==="error"){ renderCandidates(st); if(st.state==="error") $c("#clipStage").textContent=st.error; $c("#clipFind").disabled=false; return; }
  setTimeout(clipPoll, 1000);
}
function renderCandidates(st){
  const wrap=$c("#clipList"); wrap.innerHTML="";
  if(!clipCands.length){ wrap.innerHTML='<p class="note">No clips found.</p>'; return; }
  clipCands.forEach((c,i)=>{
    const div=document.createElement("div"); div.className="clipcard";
    const pre = i<3 ? "checked":"";
    div.innerHTML=`<input type="checkbox" class="cpick" data-i="${i}" ${pre}>
      <div class="meta"><b>${c.title||"Clip"}</b> <span class="sc">${c.score}</span>
      <div class="note">⏱ ${fmt(c.start)}–${fmt(c.end)} · ${Math.round(c.dur)}s</div>
      <div class="note">${c.hook||""}</div></div>`;
    wrap.appendChild(div);
  });
  const btn=$c("#clipRender"); btn.classList.remove("hide"); btn.disabled=false;
}
$c("#clipRender").onclick=async()=>{
  const idx=[...document.querySelectorAll(".cpick:checked")].map(x=>+x.dataset.i);
  if(!idx.length) return;
  $c("#clipRender").disabled=true;
  const r=await (await fetch("/clip/render/"+clipJob,{method:"POST",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({indices:idx})})).json();
  if(r.error){ $c("#clipStage").textContent=r.error; $c("#clipRender").disabled=false; return; }
  clipRenderPoll();
};
async function clipRenderPoll(){
  const st=await (await fetch("/clip/status/"+clipJob)).json();
  $c("#clipStage").textContent=st.stage||"";
  const res=$c("#clipResults"); res.innerHTML="";
  Object.entries(st.clips||{}).forEach(([i,info])=>{
    const d=document.createElement("div"); d.className="clipcard";
    if(info.state==="done"){
      d.innerHTML=`<div class="meta"><b>${info.title||("Clip "+i)}</b>
        <video src="/clip/video/${clipJob}/${i}" controls style="width:180px;border-radius:8px;display:block;margin-top:6px"></video>
        <a class="dlbtn" href="/clip/download/${clipJob}/${i}">Download</a></div>`;
    } else if(info.state==="error"){
      d.innerHTML=`<div class="meta"><b>Clip ${i}</b> <span class="err">failed: ${info.error||""}</span></div>`;
    } else { d.innerHTML=`<div class="meta">Clip ${i} — ${info.state}…</div>`; }
    res.appendChild(d);
  });
  if(st.state==="done"||st.state==="error"){ $c("#clipRender").disabled=false; return; }
  setTimeout(clipRenderPoll, 1000);
}
```

(Use existing `.go`, `.note`, `.hide`, `.drop`, `.field`, `.row`, `.chk`, `.err` classes; add `.dlbtn` styling or reuse `.dl a`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `python test_clipper_ui.py`
Expected: `PASS`

- [ ] **Step 5: Manual smoke (optional but recommended)**

Run: `python app.py`, open the page, click **Auto-clip a long video**, confirm the toggle swaps sections and the uploader appears. (Full end-to-end needs the real `claude` CLI, which times out in-sandbox — leave the live run to the user.)

- [ ] **Step 6: Commit**

```bash
git add app.py test_clipper_ui.py
git commit -F COMMIT_MSG.tmp   # "Auto-clipper: separate UI mode (analyze -> pick -> render)"
```

---

### Task 9: Full plumbing test + push

**Files:**
- Test: `test_clipper_all.py` (runs every clipper test in sequence)

- [ ] **Step 1: Write an aggregate runner**

```python
# test_clipper_all.py
import subprocess, sys
TESTS = ["test_clipper_windows.py","test_clipper_snap.py","test_clipper_dedup.py",
         "test_clipper_highlights.py","test_clipper_reframe.py",
         "test_clipper_pipeline.py","test_clipper_routes.py","test_clipper_ui.py"]
for t in TESTS:
    print("==", t)
    r = subprocess.run([sys.executable, t])
    if r.returncode != 0:
        sys.exit(f"FAILED: {t}")
print("ALL CLIPPER TESTS PASS")
```

- [ ] **Step 2: Run the whole suite**

Run: `python test_clipper_all.py`
Expected: `ALL CLIPPER TESTS PASS`

- [ ] **Step 3: Commit + push**

```bash
git add test_clipper_all.py
git commit -F COMMIT_MSG.tmp   # "Auto-clipper: aggregate test runner"
git push origin HEAD
```

---

## Self-Review (completed)

- **Spec coverage:** `find_highlights` windowed pass + boundary-snap (Tasks 1–4) ✓; `render_clip_vertical` fit+blur (Task 5) ✓; two-phase analyze→list→render flow (Tasks 6–7) ✓; separate UI mode (Task 8) ✓; reuse of `transcribe`/`write_ass`/`burn_captions` (Tasks 6–7) ✓; mocked-`_claude_cli` tests (Task 4, 7) ✓; graceful zero-candidate path (Task 7 `analyze_clip_job`) ✓; verbatim/no-internal-cut principle (Task 5/6 — clip is a single trim, captions only) ✓.
- **Out of scope honored:** no center-crop/auto-frame, no audio-energy detection, no B-roll/zoom in clip mode, captions reuse existing `write_ass` style.
- **Type consistency:** candidate dict shape `{start,end,dur,title,hook,score,reason}` is identical across Tasks 3, 4, 6, 7, 8; `_render_one_clip(... idx ..., captions=True) -> path`, `clip_<idx>.mp4` naming, and `clips[str(idx)] = {state,file,title}` consistent between Tasks 6, 7, 8.
- **Known follow-ups for the deepbuild builder:** confirm `import shutil` present in `app.py`; confirm `_has_audio` is module-level in `autoedit.py` (it is, per the cut pipeline); verify the `#editMode` wrapper `</div>` lands after the chat/workspace block and before `<script>`.
