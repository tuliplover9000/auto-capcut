# Lyric Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Lyric video" mode — faded synced lyrics rendered BEHIND the person (per-frame segmentation), timed to the song playing in the clip's own audio.

**Architecture:** New `lyricmode.py` module (LRC fetch/parse, Whisper↔LRC offset alignment reusing `autoedit._map_clean_to_spans`, u2netp person masks, ffmpeg rawvideo pipe compositor). `app.py` gains a one-shot `/lyric/*` job + third UI mode. Spec: `docs/superpowers/specs/2026-09-05-lyric-mode-design.md`.

**Tech stack:** rembg (installed; `u2netp` session downloads ~5MB on first use), PIL + numpy (installed), ffmpeg via `autoedit.ff_exe()`, faster-whisper via `autoedit.transcribe`, lrclib.net via urllib (NEVER hit in tests — mock it).

## Global Constraints

- Tests are standalone scripts (repo convention): `python test_lyric_*.py` prints `PASS`. Add each to `test_clipper_all.py`'s TESTS list. Never invoke the real `claude` CLI, never hit lrclib in tests, keep Whisper mocked in route tests.
- `autoedit.probe()` keys: `disp_width/disp_height/fps/duration/color`. No ffprobe exists.
- Commit per task: write message to `COMMIT_MSG.tmp`, `git commit -F COMMIT_MSG.tmp`, delete it. Do NOT push (orchestrator pushes after adversarial review).
- All UI-displayed external text (lyrics, errors) goes through the existing `esc()` JS helper.
- Fonts: `fonts/Anton-Regular.ttf` (bundled).

---

### Task 1: `lyricmode.py` — LRC parse + fetch

**Files:** Create `lyricmode.py`; Test `test_lyric_parse.py`.
**Produces:** `parse_lrc(text) -> list[(float, str)]`; `fetch_synced_lyrics(track, artist, timeout=15) -> str|None`.

- [ ] Test first:

```python
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
```

- [ ] Run → FAIL (`No module named 'lyricmode'`). Implement:

```python
"""lyricmode.py — faded synced lyrics BEHIND the presenter.

The clip was filmed with the song audible in the room. Whisper hears the sung
words (imperfectly, in CLIP time); lrclib supplies the song's official synced
lyrics (in SONG time); fuzzy-matching the two yields one constant offset,
after which the LRC's precise line times drive rendering. Per visible-line
frame: background -> giant faded line -> person cutout on top.
"""
import json, os, re, subprocess, urllib.parse, urllib.request

import numpy as np

import autoedit

FONT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "fonts", "Anton-Regular.ttf")
MAX_LINE_HOLD = 7.0       # a line never lingers longer than this
LINE_FADE = 0.2


def parse_lrc(text):
    """LRC text -> time-sorted [(seconds, line)]. Handles the multi-timestamp
    form '[00:45.50][01:30.00]chorus' (one entry per tag); drops untagged or
    empty lines."""
    out = []
    for raw in (text or "").splitlines():
        tags, rest = [], raw
        while True:
            m = re.match(r"\s*\[(\d+):(\d{1,2}(?:\.\d{1,3})?)\]", rest)
            if not m:
                break
            tags.append(int(m.group(1)) * 60 + float(m.group(2)))
            rest = rest[m.end():]
        line = rest.strip()
        if tags and line:
            out.extend((t, line) for t in tags)
    out.sort(key=lambda x: x[0])
    return out


def _http_json(url, timeout):
    req = urllib.request.Request(url, headers={
        "User-Agent": "capcut-autoedit (https://github.com/tuliplover9000/auto-capcut)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_synced_lyrics(track, artist, timeout=15):
    """lrclib.net synced lyrics (LRC text) or None. /api/get exact match first,
    /api/search fallback (first hit that has syncedLyrics). Free, no key."""
    try:
        q = urllib.parse.urlencode({"track_name": track, "artist_name": artist})
        data = _http_json(f"https://lrclib.net/api/get?{q}", timeout)
        if isinstance(data, dict) and data.get("syncedLyrics"):
            return data["syncedLyrics"]
    except Exception:
        pass
    try:
        q = urllib.parse.urlencode({"q": f"{track} {artist}".strip()})
        for hit in _http_json(f"https://lrclib.net/api/search?{q}", timeout) or []:
            if isinstance(hit, dict) and hit.get("syncedLyrics"):
                return hit["syncedLyrics"]
    except Exception:
        pass
    return None
```

- [ ] Run → PASS. Commit: `Lyric mode: LRC parse + lrclib fetch`.

### Task 2: offset alignment

**Files:** Modify `lyricmode.py`; Test `test_lyric_align.py`.
**Produces:** `align_offset(lrc_lines, all_words, min_anchors=2) -> float|None` (offset = clip_time − song_time).

- [ ] Test first:

```python
# test_lyric_align.py
import lyricmode

def words_at(text, t0):
    return [{"word": w, "start": t0 + i * 0.4, "end": t0 + i * 0.4 + 0.3}
            for i, w in enumerate(text.split())]

def test_known_offset_recovered():
    # song lines at 10s/20s/30s; clip audio starts 42s into the song
    lrc = [(10.0, "dancing through the midnight fire"),
           (20.0, "shadows follow where we go tonight"),
           (30.0, "hold me closer till the morning light")]
    words = (words_at("dancing through the midnight fire", 10.0 - 42.0 + 42.0 - 42.0 + 10.0) if False else
             words_at("dancing through the midnight fire", -32.0 + 32.0))  # see below
    # clip_time = song_time - 42  -> line at song 42+x appears at clip x.
    # Build words for the lines that fall INSIDE the clip: song 50s & 60s ->
    # clip 8s & 18s (song t -> clip t-42):
    lrc = [(50.0, "shadows follow where we go tonight"),
           (60.0, "hold me closer till the morning light"),
           (70.0, "hold me closer till the morning light")]   # duplicate text -> excluded
    words = (words_at("shadows follow where we go tonight", 8.0)
             + words_at("hold me closer till the morning light", 18.0))
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

if __name__ == "__main__":
    test_known_offset_recovered(); test_insufficient_or_conflicting_anchors(); print("PASS")
```

- [ ] Implement:

```python
def align_offset(lrc_lines, all_words, min_anchors=2):
    """One constant offset (clip_time - song_time), or None.
    Anchors only on lines whose TEXT is unique in the song — a repeated chorus
    fuzzy-matches an arbitrary occurrence and would poison the offset. Needs
    >= min_anchors offsets within 2s of their median; returns their mean."""
    from collections import Counter
    counts = Counter(ln.strip().lower() for _, ln in lrc_lines)
    offsets = []
    for t_song, line in lrc_lines:
        if counts[line.strip().lower()] != 1:
            continue
        spans = autoedit._map_clean_to_spans([line], all_words, min_ratio=0.6)
        if spans:
            offsets.append(spans[0][0] - t_song)
    if len(offsets) < min_anchors:
        return None
    offsets.sort()
    med = offsets[len(offsets) // 2]
    close = [o for o in offsets if abs(o - med) <= 2.0]
    if len(close) < min_anchors:
        return None
    return sum(close) / len(close)
```

- [ ] PASS → commit: `Lyric mode: Whisper<->LRC offset alignment`.

### Task 3: line image + auto tint

**Files:** Modify `lyricmode.py`; Test `test_lyric_image.py`.
**Produces:** `build_line_image(line, W, H, tint) -> HxWx4 float32 ndarray` (tint "light"|"dark"); `auto_tint(rgb, mask) -> "light"|"dark"`.

- [ ] Test first:

```python
# test_lyric_image.py
import numpy as np, lyricmode

def test_line_image_dims_and_wrap():
    img = lyricmode.build_line_image("hold me closer till the morning light", 1080, 1920, "light")
    assert img.shape == (1920, 1080, 4) and img.dtype == np.float32
    assert img[..., 3].max() > 0.2                       # visible but faded
    assert img[..., 3].max() < 0.6                       # NOT opaque
    rows_with_ink = np.where(img[..., 3].sum(axis=1) > 1)[0]
    assert rows_with_ink.size and rows_with_ink[0] < 400  # starts near the top
    assert rows_with_ink[-1] < 1920 * 0.75                # fits upper zone
    short = lyricmode.build_line_image("yo", 1080, 1920, "dark")
    assert short[..., 3].max() > 0.1

def test_auto_tint():
    dark_bg = np.zeros((100, 100, 3), np.uint8)
    light_bg = np.full((100, 100, 3), 230, np.uint8)
    nobody = np.zeros((100, 100, 1), np.float32)
    assert lyricmode.auto_tint(dark_bg, nobody) == "light"
    assert lyricmode.auto_tint(light_bg, nobody) == "dark"

if __name__ == "__main__":
    test_line_image_dims_and_wrap(); test_auto_tint(); print("PASS")
```

- [ ] Implement:

```python
def build_line_image(line, W, H, tint):
    """Giant uppercase wrapped Anton line as an HxWx4 float32 RGBA layer in
    [0,1]. Faded fill (the whole point); auto-shrinks font until the wrap fits
    the width and <=62% of the height."""
    from PIL import Image, ImageDraw, ImageFont
    fill = (255, 255, 255, 105) if tint == "light" else (25, 25, 30, 80)
    words = line.upper().split() or ["♪"]
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    size, rows, line_h = 210, [words[0]], 235
    while size > 70:
        font = ImageFont.truetype(FONT_PATH, size)
        maxw = W - 110
        rows, cur = [], ""
        for wd in words:
            t = (cur + " " + wd).strip()
            if probe.textlength(t, font=font) <= maxw:
                cur = t
            else:
                if cur:
                    rows.append(cur)
                cur = wd
        if cur:
            rows.append(cur)
        line_h = round(size * 1.12)
        if (len(rows) * line_h <= H * 0.62
                and all(probe.textlength(r, font=font) <= maxw for r in rows)):
            break
        size -= 15
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y = round(H * 0.06)
    for r in rows:
        d.text((55, y), r, font=font, fill=fill)
        y += line_h
    return np.asarray(img, dtype=np.float32) / 255.0


def auto_tint(rgb, mask):
    """Faded-white text on dark backgrounds, faded-dark on light ones. Samples
    mean luminance of the top 55% of the frame excluding the person."""
    h = rgb.shape[0]
    top = rgb[: int(h * 0.55)].astype(np.float32)
    m = 1.0 - mask[: int(h * 0.55), ..., 0]
    if m.sum() < 1:
        return "light"
    lum = (0.299 * top[..., 0] + 0.587 * top[..., 1] + 0.114 * top[..., 2])
    return "dark" if float((lum * m).sum() / m.sum()) > 140.0 else "light"
```

- [ ] PASS → commit: `Lyric mode: faded line renderer + auto tint`.

### Task 4: person mask (u2netp)

**Files:** Modify `lyricmode.py`; Test `test_lyric_mask.py`.
**Produces:** `person_mask(rgb, mask_w=384) -> HxWx1 float32 in [0,1]`; lazy module-level `_mask_session()`.

- [ ] Test (REAL model — u2netp is ~5MB, downloads once; keep the input tiny):

```python
# test_lyric_mask.py
import numpy as np, lyricmode

def test_mask_shape_and_range():
    rgb = np.random.default_rng(0).integers(0, 255, (240, 160, 3), np.uint8)
    m = lyricmode.person_mask(rgb, mask_w=128)
    assert m.shape == (240, 160, 1) and m.dtype == np.float32
    assert 0.0 <= float(m.min()) and float(m.max()) <= 1.0

if __name__ == "__main__":
    test_mask_shape_and_range(); print("PASS")
```

- [ ] Implement:

```python
_SESSION = None

def _mask_session():
    """Lazy shared rembg session. u2netp = the small fast model (~5MB) — the
    default bria model is 1GB and ~10x slower, unusable per-frame."""
    global _SESSION
    if _SESSION is None:
        from rembg import new_session
        _SESSION = new_session("u2netp")
    return _SESSION


def person_mask(rgb, mask_w=384):
    """HxWx3 uint8 -> HxWx1 float32 person mask in [0,1] (1 = person).
    Segmentation runs at mask_w wide and is upscaled — plenty for text that is
    deliberately faint."""
    from PIL import Image
    from rembg import remove
    h, w = rgb.shape[:2]
    small = Image.fromarray(rgb).resize(
        (mask_w, max(2, round(h * mask_w / w))), Image.BILINEAR)
    m = remove(small, session=_mask_session(), only_mask=True)
    m = m.resize((w, h), Image.BILINEAR)
    return (np.asarray(m, dtype=np.float32) / 255.0)[..., None]
```

- [ ] PASS → commit: `Lyric mode: u2netp person mask`.

### Task 5: the compositor — `render_lyric_video`

**Files:** Modify `lyricmode.py`; Test `test_lyric_render.py`.
**Produces:** `render_lyric_video(input_path, lines_clip, out_mp4, tmpdir, tint="auto", progress_cb=None, mask_w=384) -> None`. `lines_clip` = time-sorted `[(t_clip, text)]`.

- [ ] Test first (mock `person_mask` — a fixed right-half rectangle; verifies pass-through frames untouched and lyric frames changed on the left/text side only where unmasked):

```python
# test_lyric_render.py
import os, tempfile, numpy as np, autoedit, lyricmode

def _src(path):
    ff = autoedit.ff_exe()
    autoedit.run([ff, "-y", "-f", "lavfi", "-i", "color=c=0x606060:size=320x480:rate=10:duration=6",
                  "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path],
                 timeout=120)

def _frame(ff, path, t, out):
    autoedit.run([ff, "-y", "-ss", str(t), "-i", path, "-frames:v", "1", "-update", "1", out], timeout=60)
    from PIL import Image
    return np.asarray(Image.open(out).convert("RGB")).astype(np.int16)

def test_render_composites_only_during_lines():
    ff = autoedit.ff_exe()
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "s.mp4"); _src(src)
    lyricmode.person_mask = lambda rgb, mask_w=384: np.concatenate(
        [np.zeros((rgb.shape[0], rgb.shape[1] // 2, 1), np.float32),
         np.ones((rgb.shape[0], rgb.shape[1] - rgb.shape[1] // 2, 1), np.float32)], axis=1)
    out = os.path.join(tmp, "o.mp4")
    ticks = []
    lyricmode.render_lyric_video(src, [(1.0, "HELLO WORLD"), (3.0, "SECOND LINE")],
                                 out, tmp, tint="light",
                                 progress_cb=lambda d, t: ticks.append((d, t)))
    assert os.path.exists(out) and os.path.getsize(out) > 0
    spec = autoedit.probe(out)
    assert 5.5 <= spec["duration"] <= 6.5, spec["duration"]
    assert autoedit._has_audio(out)
    on = _frame(ff, out, 2.0, os.path.join(tmp, "a.png"))
    src_on = _frame(ff, src, 2.0, os.path.join(tmp, "b.png"))
    diff = np.abs(on - src_on).mean(axis=2)
    assert diff[:, :160].max() > 8, "text did not draw on the unmasked half"
    assert diff[:, 170:].mean() < 3, "masked (person) half should be untouched"
    off = _frame(ff, out, 0.3, os.path.join(tmp, "c.png"))
    src_off = _frame(ff, src, 0.3, os.path.join(tmp, "d.png"))
    assert np.abs(off - src_off).mean() < 3, "pass-through frame changed"
    assert ticks and ticks[-1][0] == ticks[-1][1], ticks[-1:]

if __name__ == "__main__":
    test_render_composites_only_during_lines(); print("PASS")
```

- [ ] Implement:

```python
def _line_windows(lines_clip, duration):
    """[(t_start, t_end, text)] — each line holds until the next line or
    MAX_LINE_HOLD, clamped to the clip."""
    wins = []
    for i, (t, txt) in enumerate(lines_clip):
        end = lines_clip[i + 1][0] if i + 1 < len(lines_clip) else t + MAX_LINE_HOLD
        end = min(end, t + MAX_LINE_HOLD, duration)
        if end > t >= 0 and t < duration:
            wins.append((t, end, txt))
    return wins


def render_lyric_video(input_path, lines_clip, out_mp4, tmpdir, tint="auto",
                       progress_cb=None, mask_w=384):
    """Composite faded lyric lines BEHIND the person. Streams rawvideo through
    two ffmpeg pipes; frames with no visible line pass through untouched (no
    segmentation cost). final = frame*mask + (line over frame)*(1-mask)."""
    ff = autoedit.ff_exe()
    if not ff:
        raise RuntimeError("ffmpeg not found")
    spec = autoedit.probe(input_path)
    W = int(spec["disp_width"]) - int(spec["disp_width"]) % 2
    H = int(spec["disp_height"]) - int(spec["disp_height"]) % 2
    fps = float(spec.get("fps") or 30.0)
    duration = float(spec.get("duration") or 0.0)
    if W <= 0 or H <= 0 or duration <= 0:
        raise RuntimeError(f"bad source: {W}x{H} {duration}s")
    wins = _line_windows(sorted(lines_clip), duration)
    frame_bytes = W * H * 3
    total = max(1, round(duration * fps))

    dec = subprocess.Popen(
        [ff, "-i", os.path.abspath(input_path), "-f", "rawvideo",
         "-pix_fmt", "rgb24", "-vf", f"scale={W}:{H}", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    enc = subprocess.Popen(
        [ff, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", f"{fps}", "-i", "-", "-i", os.path.abspath(input_path),
         "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-ar", "48000", "-shortest", "-movflags", "+faststart",
         os.path.abspath(out_mp4)],
        stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)

    line_cache = {}
    resolved_tint = tint
    n = 0
    try:
        while True:
            buf = dec.stdout.read(frame_bytes)
            if not buf or len(buf) < frame_bytes:
                break
            t = n / fps
            win = next(((s, e, txt) for s, e, txt in wins if s <= t < e), None)
            if win is None:
                enc.stdin.write(buf)
            else:
                frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
                mask = person_mask(frame, mask_w=mask_w)
                if resolved_tint == "auto":
                    resolved_tint = auto_tint(frame, mask)
                s, e, txt = win
                if txt not in line_cache:
                    line_cache[txt] = build_line_image(txt, W, H, resolved_tint)
                layer = line_cache[txt]
                fade = min(1.0, (t - s) / LINE_FADE, max(0.0, (e - t) / LINE_FADE))
                a = layer[..., 3:4] * fade
                f32 = frame.astype(np.float32)
                text_over = f32 * (1 - a) + layer[..., :3] * 255.0 * a
                outf = f32 * mask + text_over * (1 - mask)
                enc.stdin.write(outf.clip(0, 255).astype(np.uint8).tobytes())
            n += 1
            if progress_cb and (n % 30 == 0):
                progress_cb(min(n, total), total)
    finally:
        try:
            enc.stdin.close()
        except OSError:
            pass
        dec.stdout.close()
        dec.wait(timeout=60)
        rc = enc.wait(timeout=300)
    if progress_cb:
        progress_cb(total, total)
    if rc != 0 or not (os.path.exists(out_mp4) and os.path.getsize(out_mp4) > 0):
        raise RuntimeError(f"lyric render failed (encoder exit {rc})")
```

- [ ] PASS → commit: `Lyric mode: behind-person pipe compositor`.

### Task 6: `/lyric/*` job + routes

**Files:** Modify `app.py` (worker + routes after `/clip/*`); Test `test_lyric_routes.py`.
**Produces:** `POST /lyric/run` (multipart `video`, `track`, `artist`, optional `start_at`, `tint`, `whisper_model`) → `{job_id}`; `GET /lyric/status/<id>` → `{state, stage, error, has_mp4}`; `GET /lyric/video/<id>`, `GET /lyric/download/<id>`. Worker `lyric_job(job_id)`.

Key logic (implement; mirror clip-job conventions — LOCK discipline, `_stage`, `kind="lyric"`, jobdir layout, `import lyricmode` at top of app.py):

```python
def _parse_song_pos(s):
    s = (s or "").strip()
    if not s:
        return None
    m = re.match(r"^(\d+):(\d{1,2}(?:\.\d+)?)$", s)
    if m:
        return int(m.group(1)) * 60 + float(m.group(2))
    try:
        return max(0.0, float(s))
    except ValueError:
        return None


def lyric_job(job_id):
    job = JOBS[job_id]
    try:
        _stage(job_id, state="running", step=1, stage="Probing video")
        spec = autoedit.probe(job["input_path"])
        if spec["duration"] <= 0:
            raise RuntimeError("Couldn't read a valid duration.")
        job["spec"] = spec
        s = job["settings"]

        _stage(job_id, step=2, stage="Fetching synced lyrics")
        lrc_text = lyricmode.fetch_synced_lyrics(s["track"], s["artist"])
        lrc = lyricmode.parse_lrc(lrc_text) if lrc_text else []

        offset = None
        if s["start_at"] is not None:
            offset = -s["start_at"]            # clip t = song t - start_at
        wav = os.path.join(job["tmpdir"], "audio.wav")
        segs = []
        if offset is None or not lrc:
            _stage(job_id, step=3, stage="Listening for the song (Whisper)")
            if not autoedit.extract_audio(job["input_path"], wav):
                raise RuntimeError("Audio extraction failed — no audio track?")
            segs = autoedit.transcribe(wav, s["whisper_model"])
        if lrc and offset is None:
            all_words = [w for sg in segs for w in sg.get("words", [])]
            offset = lyricmode.align_offset(lrc, all_words)
            if offset is None:
                raise RuntimeError(
                    "Couldn't hear enough of the song to sync the lyrics. "
                    "Enter where the song starts (e.g. 0:42) and retry.")
        if lrc:
            lines = [(t + offset, ln) for t, ln in lrc
                     if 0 <= t + offset < spec["duration"]]
        else:                                   # lrclib miss -> Whisper's own lines
            lines = [(float(sg.get("start", 0.0)), str(sg.get("text", "")).strip())
                     for sg in segs
                     if str(sg.get("text", "")).strip()
                     and 0 <= float(sg.get("start", 0.0)) < spec["duration"]]
            _stage(job_id, stage="No synced lyrics found — using what Whisper heard")
        if not lines:
            raise RuntimeError(
                "No lyric lines land inside this clip — check the song "
                "name/artist or the start position.")
        job["lines"] = lines

        _stage(job_id, step=4, stage="Rendering (this is the slow part)")
        out = os.path.join(job["outdir"], "lyric.mp4")
        lyricmode.render_lyric_video(
            job["input_path"], lines, out, job["tmpdir"], tint=s["tint"],
            progress_cb=lambda d, t: _stage(
                job_id, stage=f"Rendering… frame {d}/{t}"))
        _stage(job_id, state="done", step=5, stage="Lyric video ready")
    except Exception as e:                                     # noqa: BLE001
        _stage(job_id, state="error", error=str(e), stage="Failed")
```

Route `/lyric/run`: validate file like `/clip/analyze` (ALLOWED_EXT), require non-empty `track` (artist may be blank), `settings = {"track","artist","start_at": _parse_song_pos(...), "tint": pick(tint, {"auto","light","dark"}, "auto"), "whisper_model": pick(...base...)}`, job dict with `kind="lyric"`, spawn `lyric_job` daemon thread. Status route mirrors `/clip/status` (`has_mp4` = `out/lyric.mp4` exists); video/download mirror `/clip/video|download` guarded on `kind=="lyric"` and state `done`.

- [ ] Test (mock `lyricmode.fetch_synced_lyrics`, `lyricmode.render_lyric_video` writes a stub file, `autoedit.transcribe`/`extract_audio`; real tiny mp4 upload; assert done + video 200; also `start_at="0:42"` path needs NO transcribe — assert the transcribe mock was NOT called when start_at given and lyrics found; junk: missing track → 400):

```python
# test_lyric_routes.py — pattern of test_clipper_url.py; write it fully, run it.
```
(Write the complete test following that pattern — no placeholder in the shipped file.)

- [ ] PASS → commit: `Lyric mode: one-shot job + routes`.

### Task 7: UI third mode

**Files:** Modify `app.py` PAGE; Test `test_lyric_ui.py` (hooks: `id="mode-lyric"`, `id="lyricMode"`, `id="lyricDrop"`, `id="lyricTrack"`, `id="lyricStart"`, `/lyric/run`, `lyricPoll(`, `esc(`).
Mode switch becomes three buttons (`mode-edit`, `mode-clip`, `mode-lyric`); `setMode` handles all three sections. Lyric section: drop zone + file input, Track + Artist text fields, "Clip starts at (song time, optional — e.g. 0:42)" text field, tint select (Auto/Faded white/Faded dark), Whisper select, Run button, stage note, result `<video>` + download link. JS mirrors clip mode: job-scoped `lyricPoll(jid)` (bail when superseded), all server text through `esc()`, poll 1s, show video via `/lyric/video/<jid>` when done.
- [ ] Test → implement → PASS → commit: `Lyric mode: UI (third mode)`.

### Task 8: aggregate + docs

- [ ] Add all `test_lyric_*.py` to `test_clipper_all.py` TESTS. Run `python test_clipper_all.py` → `ALL CLIPPER TESTS PASS`.
- [ ] README: add a **Lyric video** bullet under the web-UI section (filmed-with-music sync, lrclib, behind-person faded line, manual start-position escape hatch, rembg dep note).
- [ ] Commit: `Lyric mode: aggregate tests + README`. **Do NOT push.**

## Self-review notes for the builder
- `person_mask` monkeypatching in Task 5's test relies on `render_lyric_video` calling the MODULE-LEVEL `person_mask` (`lyricmode.person_mask(...)` resolved at call time) — do not import it into a local variable.
- `auto_tint` resolves ONCE (first lyric frame) then sticks — intended (no flicker).
- The encoder gets audio from input #1 (`-map 1:a?`) — a silent source must still produce a file (`?` optional map).
- `_map_clean_to_spans` needs ≥2 tokens per line; one-word lyric lines simply never anchor (fine).
- lrclib is NEVER hit by tests; `fetch_synced_lyrics` failures all resolve to None (fallback path), never raise.
