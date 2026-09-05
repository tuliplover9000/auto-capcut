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


# Bake-off on real night-yoyo footage (2026-09-05, worst-blur frames, 384px):
#   u2netp 183ms/frame mid-band 5.4% | isnet ~1.0s 1.1-2.8% | birefnet-lite
#   ~6.8s 0.5% | bria ~13s 0.6%. birefnet/bria are HOURS per clip on CPU;
#   isnet is the quality/speed sweet spot, u2netp stays as the "fast" option.
MASK_MODEL_BEST = "isnet-general-use"
MASK_MODEL_FAST = "u2netp"

_SESSIONS = {}


def _mask_session(model=MASK_MODEL_BEST):
    """Lazy shared rembg session, one per model name."""
    if model not in _SESSIONS:
        from rembg import new_session
        _SESSIONS[model] = new_session(model)
    return _SESSIONS[model]


def _dilate(m, iters=2):
    """Cheap 3x3 max-filter dilation (numpy only) — grows the mask a couple of
    small-res pixels so edges err toward covering the person."""
    for _ in range(iters):
        p = np.pad(m, 1, mode="edge")
        m = np.maximum.reduce([p[y:y + m.shape[0], x:x + m.shape[1]]
                               for y in range(3) for x in range(3)])
    return m


def person_mask(rgb, mask_w=384, model=MASK_MODEL_BEST):
    """HxWx3 uint8 -> HxWx1 float32 person mask in [0,1] (1 = person).
    Segmentation runs at mask_w wide and is upscaled — plenty for text that is
    deliberately faint. The raw model output is HARDENED (smoothstep of the
    0.30-0.60 band -> ~1) and slightly dilated: on motion-blurred frames the
    model goes UNSURE (mid values) across the moving body, and the composite
    would blend text onto the person proportionally — the "phasing into the
    words" artifact seen on a real night yoyo clip."""
    from PIL import Image
    from rembg import remove
    h, w = rgb.shape[:2]
    small = Image.fromarray(rgb).resize(
        (mask_w, max(2, round(h * mask_w / w))), Image.BILINEAR)
    m = remove(small, session=_mask_session(model), only_mask=True)
    a = np.asarray(m, dtype=np.float32) / 255.0
    a = np.clip((a - 0.30) / 0.30, 0.0, 1.0)          # harden uncertainty
    a = _dilate(a, iters=2)
    m = Image.fromarray((a * 255.0).astype(np.uint8)).resize((w, h), Image.BILINEAR)
    return (np.asarray(m, dtype=np.float32) / 255.0)[..., None]


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
    # The agreeing cluster must be a STRICT MAJORITY of all anchors — a 50/50
    # split between two well-separated offsets is disagreement, not a winner
    # (the median just happens to land in one of the camps).
    if len(close) < min_anchors or len(close) <= len(offsets) - len(close):
        return None
    return sum(close) / len(close)


def transcribe_song(wav_path, model_size="base"):
    """Whisper for SUNG vocals — deliberately WITHOUT the Silero VAD that
    autoedit.transcribe uses for talking heads: that VAD classifies singing
    over music as non-speech and drops it wholesale (a real clip produced 0
    segments with VAD vs. audible lyrics without). Only a very loose
    no-speech guard remains, since singing routinely scores high
    no_speech_prob. Returns the same segment shape as autoedit.transcribe."""
    from faster_whisper import WhisperModel
    m = WhisperModel(model_size, device="cpu", compute_type="int8",
                     cpu_threads=max(4, os.cpu_count() or 4))
    segs, _info = m.transcribe(wav_path, word_timestamps=True,
                               condition_on_previous_text=False)
    out = []
    for seg in segs:
        if getattr(seg, "no_speech_prob", 0.0) > 0.98:
            continue
        words = [{"start": float(w.start), "end": float(w.end), "word": w.word}
                 for w in (seg.words or [])]
        out.append({"start": float(seg.start), "end": float(seg.end),
                    "text": seg.text, "words": words})
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


def _line_windows(lines_clip, duration):
    """[(t_start, t_end, text)] — each line holds until the next line or
    MAX_LINE_HOLD, clamped to the clip."""
    wins = []
    for i, (t, txt) in enumerate(lines_clip):
        end = lines_clip[i + 1][0] if i + 1 < len(lines_clip) else t + MAX_LINE_HOLD
        end = min(end, t + MAX_LINE_HOLD, duration)
        # A window shorter than a full fade in+out never becomes readable —
        # drop it rather than render a sub-25%-opacity flash (also covers two
        # lines sharing a timestamp: the earlier zero-length one goes).
        if end - t < 2 * LINE_FADE:
            continue
        if end > t >= 0 and t < duration:
            wins.append((t, end, txt))
    return wins


def render_lyric_video(input_path, lines_clip, out_mp4, tmpdir, tint="auto",
                       progress_cb=None, mask_w=384, model=MASK_MODEL_BEST):
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
    # Encoder stderr goes to a FILE, not DEVNULL: when it dies mid-stream
    # (bad output path, disk full, permissions) the pipe write breaks and its
    # stderr tail is the only actionable message we can give the user.
    err_path = os.path.join(tmpdir or os.path.dirname(os.path.abspath(out_mp4))
                            or ".", "lyric_enc_err.txt")
    err_f = open(err_path, "wb")
    enc = subprocess.Popen(
        [ff, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", f"{fps}", "-i", "-", "-i", os.path.abspath(input_path),
         "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-ar", "48000", "-shortest", "-movflags", "+faststart",
         os.path.abspath(out_mp4)],
        stdin=subprocess.PIPE, stderr=err_f)

    line_cache = {}
    resolved_tint = tint
    n = 0
    prev_mask = None
    pipe_broke = False
    try:
        while True:
            buf = dec.stdout.read(frame_bytes)
            if not buf or len(buf) < frame_bytes:
                break
            t = n / fps
            win = next(((s, e, txt) for s, e, txt in wins if s <= t < e), None)
            if win is None:
                data = buf
                prev_mask = None               # gap: stale confidence expires
            else:
                frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
                mask = person_mask(frame, mask_w=mask_w, model=model)
                # Temporal backstop: a motion-blurred frame borrows (decayed)
                # confidence from its predecessor, so the person never flickers
                # translucent to the text mid-trick.
                if prev_mask is not None:
                    mask = np.maximum(mask, prev_mask * 0.85)
                prev_mask = mask
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
                data = outf.clip(0, 255).astype(np.uint8).tobytes()
            try:
                enc.stdin.write(data)
            except (BrokenPipeError, OSError):
                pipe_broke = True          # encoder died; raise with its stderr below
                break
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
        err_f.close()
    if pipe_broke or rc != 0 or not (os.path.exists(out_mp4)
                                     and os.path.getsize(out_mp4) > 0):
        tail = ""
        try:
            with open(err_path, encoding="utf-8", errors="replace") as fh:
                tail = fh.read()[-800:]
        except OSError:
            pass
        raise RuntimeError(
            f"lyric render failed (encoder exit {rc}).\nffmpeg stderr: {tail}")
    if progress_cb:
        progress_cb(total, total)
