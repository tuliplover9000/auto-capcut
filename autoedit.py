#!/usr/bin/env python3
"""
autoedit.py — AI auto-editor for talking-head footage (Tier 1).

Ingests ONE video file, produces a rough cut with filler / false starts /
long silences / bad takes removed, plus word-accurate captions.

Output: out/roughcut.mp4 + out/captions.srt  (ready to import into CapCut)

The "brain" is Claude, invoked via the claude CLI in headless mode using
your Max subscription — NOT the paid Anthropic API; no ANTHROPIC_API_KEY needed.

Usage examples:
  python autoedit.py myclip.mp4
  python autoedit.py myclip.mp4 -o output --aggressiveness heavy
  python autoedit.py myclip.mp4 --whisper-model small --keep-temp
  python autoedit.py --selftest
"""
import sys, os, re, json, math, shutil, tempfile, argparse, subprocess

# ── R1: Windows console UTF-8 fix (avoids cp1252 crashes on non-ASCII) ──────
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# ── R1: helpers ──────────────────────────────────────────────────────────────

def section(t):
    """Print a section banner."""
    print(f"\n{'='*60}\n{t}\n{'='*60}")


def run(cmd, timeout=300, input=None, env=None):
    """
    Subprocess wrapper that never raises on timeout.
    Returns a CompletedProcess-like object with .returncode/.stdout/.stderr.
    cmd may be a list or a string (used as shell=True when a string).
    """
    use_shell = isinstance(cmd, str)
    try:
        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            input=input,
            env=env,
            shell=use_shell,
        )
    except subprocess.TimeoutExpired as e:
        class _R:
            returncode = 124
            stdout = e.stdout or ""
            stderr = (e.stderr or "") + f"\n[timed out after {timeout}s]"
        return _R()


def ff_exe():
    """Return path to the bundled ffmpeg binary, falling back to PATH."""
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return shutil.which("ffmpeg")


# ── R2: probe ────────────────────────────────────────────────────────────────

def probe(path):
    """
    Run `ffmpeg -i <path>` and parse its stderr for duration/resolution/fps.
    ffmpeg exits non-zero when given no output — that's expected; read stderr.
    Returns {"duration": float, "width": int, "height": int, "fps": float}.
    """
    ff = ff_exe()
    if not ff:
        raise RuntimeError("ffmpeg not found — pip install imageio-ffmpeg")
    r = run([ff, "-i", path], timeout=30)
    stderr = r.stderr

    info = {"duration": 0.0, "width": 0, "height": 0, "fps": 30.0}

    # Duration: "Duration: HH:MM:SS.ss"
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", stderr)
    if m:
        h, mn, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
        info["duration"] = h * 3600 + mn * 60 + s
    else:
        print("WARNING: could not parse duration from ffmpeg output")

    # Resolution and fps — prefer the Video: stream line
    video_lines = [ln for ln in stderr.splitlines() if "Video:" in ln]
    search_text = video_lines[0] if video_lines else stderr

    # Resolution: "NNNxNNN" (2-5 digit each side)
    m = re.search(r",\s*(\d{2,5})x(\d{2,5})", search_text)
    if m:
        info["width"], info["height"] = int(m.group(1)), int(m.group(2))
    else:
        print("WARNING: could not parse resolution from ffmpeg output")

    # FPS: "NN.N fps"
    m = re.search(r"(\d+\.?\d*)\s*fps", search_text)
    if m:
        fps = float(m.group(1))
        info["fps"] = fps if fps > 0 else 30.0
    else:
        print("WARNING: could not parse fps — defaulting to 30.0")

    return info


# ── R3: extract_audio ────────────────────────────────────────────────────────

def extract_audio(path, wav_path):
    """Extract 16k mono WAV from input video. Returns True if wav_path exists."""
    ff = ff_exe()
    run([ff, "-y", "-i", path, "-vn", "-ar", "16000", "-ac", "1", wav_path], timeout=300)
    exists = os.path.exists(wav_path)
    if not exists:
        print("WARNING: audio extraction failed — no WAV produced")
    return exists


# ── R4: transcribe ───────────────────────────────────────────────────────────

def transcribe(wav_path, model_size="base"):
    """
    Transcribe wav_path with faster-whisper, returning word timestamps.
    First run downloads the Whisper model — may take a minute.
    Returns list of {"start", "end", "text", "words": [{"start","end","word"}]}.
    """
    print(f"  (using faster-whisper '{model_size}' model; first run downloads weights)")
    try:
        from faster_whisper import WhisperModel
        m = WhisperModel(model_size, device="cpu", compute_type="int8")
        segs, _ = m.transcribe(wav_path, word_timestamps=True)
        result = []
        for seg in segs:
            words = []
            if seg.words:
                for w in seg.words:
                    words.append({"start": float(w.start), "end": float(w.end), "word": w.word})
            result.append({
                "start": float(seg.start),
                "end": float(seg.end),
                "text": seg.text.strip(),
                "words": words,
            })
        return result
    except Exception as e:
        print(f"WARNING: transcription failed: {e}")
        return []


# ── R5: build_transcript_text ────────────────────────────────────────────────

def build_transcript_text(segments):
    """
    Build compact segment-level transcript for Claude.
    Format: [<i>] <start:.2f>-<end:.2f>: <text>
    """
    lines = []
    for i, seg in enumerate(segments):
        lines.append(f"[{i}] {seg['start']:.2f}-{seg['end']:.2f}: {seg['text']}")
    return "\n".join(lines)


# ── R6: decide_cuts_with_claude ──────────────────────────────────────────────

def decide_cuts_with_claude(transcript_text, total_duration, aggressiveness="medium", model="sonnet"):
    """
    Send the transcript to Claude via the `claude` CLI (headless, Max subscription).
    Returns a list of (start, end) float tuples to KEEP.
    Raises RuntimeError if Claude is unreachable or returns no usable spans.
    """
    aggr_desc = {
        "light":  "Remove only obviously long silences (>3s) and clear vocal stutters. Preserve most content.",
        "medium": "Remove clear filler words (um, uh, like, you know), false starts, long silences (>1.5s), and obvious repeated/botched takes. Keep all clean, intentional takes.",
        "heavy":  "Aggressively cut all filler, hesitations, repeated ideas, tangents, and any silence >0.8s. Keep only the tightest version of each idea.",
    }

    prompt = f"""You are an AI video editor assistant. Your task is to decide which portions of a talking-head video recording to KEEP in the rough cut.

The timestamped transcript of the recording is provided on stdin. Each line is one speech segment: [index] start_seconds-end_seconds: text

Aggressiveness level: {aggressiveness}
Instruction: {aggr_desc.get(aggressiveness, aggr_desc['medium'])}

Rules:
- Return ONLY valid JSON with a single key "keep": a list of objects, each with "start" and "end" (seconds, floats).
- The keep list must be in ascending time order, non-overlapping.
- All start/end values must be within [0, {total_duration:.2f}].
- Do NOT include any explanation, markdown, or extra text — ONLY the JSON object.
- If you remove a section, omit it. If you keep everything, return all segments.

Example output format:
{{"keep":[{{"start":0.5,"end":12.3}},{{"start":15.0,"end":28.7}}]}}

The transcript follows on stdin."""

    # Resolve the claude CLI executable (handle .cmd on Windows)
    claude_exe = shutil.which("claude") or "claude"

    # NOTE: --bare is intentionally OMITTED here.
    # --bare forces strict API-key-only auth (no OAuth/keychain), which breaks
    # Max subscription login.  We want OAuth to be used so the call bills the
    # Max plan instead of a per-token API key.
    cmd = [
        claude_exe,
        "-p", prompt,
        "--output-format", "json",
        "--max-turns", "1",
        "--model", model,
    ]

    # Build env WITHOUT ANTHROPIC_API_KEY so billing goes to Max subscription
    env = dict(os.environ)
    env.pop("ANTHROPIC_API_KEY", None)

    # First try as a list; on Windows claude may need shell=True
    r = None
    try:
        r = subprocess.run(
            cmd,
            input=transcript_text,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=300,
            env=env,
        )
    except FileNotFoundError:
        # Retry with shell=True (claude is a .cmd on Windows)
        cmd_str = " ".join(
            f'"{c}"' if " " in c else c
            for c in cmd
        )
        try:
            r = subprocess.run(
                cmd_str,
                input=transcript_text,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=300,
                env=env,
                shell=True,
            )
        except Exception as e2:
            raise RuntimeError(
                f"Claude CLI could not be launched even with shell=True: {e2}\n"
                "Make sure `claude` is on PATH and you have run `claude` interactively at least once."
            )

    if r is None or r.returncode != 0:
        stderr_snippet = (r.stderr if r else "")[-800:]
        raise RuntimeError(
            f"Claude (claude CLI) returned non-zero exit code {r.returncode if r else '?'}.\n"
            f"Make sure you're logged in (`claude` interactive at least once) and have remaining plan quota.\n"
            f"stderr: {stderr_snippet}"
        )

    stdout = (r.stdout or "").strip()
    if not stdout:
        raise RuntimeError(
            "Claude (claude CLI) returned empty stdout.\n"
            f"stderr: {(r.stderr or '')[-800:]}"
        )

    # Parse the outer JSON envelope {"result": "<string>"}
    try:
        outer = json.loads(stdout)
        result_str = outer.get("result", stdout)
    except json.JSONDecodeError:
        result_str = stdout

    # The result field is normally a JSON *string*; if Claude already returned a
    # structured object, coerce it back to text so the parsing below is uniform.
    if not isinstance(result_str, str):
        result_str = json.dumps(result_str)

    # Strip optional ```json ... ``` fences
    result_str = result_str.strip()
    result_str = re.sub(r"^```(?:json)?\s*", "", result_str)
    result_str = re.sub(r"\s*```$", "", result_str)
    result_str = result_str.strip()

    try:
        data = json.loads(result_str)
    except json.JSONDecodeError:
        # Harden against stray prose ("Sure! Here's the JSON ...") — extract the
        # first balanced {...} block and retry before giving up.
        m = re.search(r"\{.*\}", result_str, re.DOTALL)
        try:
            if not m:
                raise json.JSONDecodeError("no JSON object found", result_str, 0)
            data = json.loads(m.group(0))
        except json.JSONDecodeError as e:
            raise RuntimeError(
                f"Could not parse Claude's response as JSON: {e}\n"
                f"Raw result string (first 500 chars): {result_str[:500]}"
            )

    # Be defensive about the shape Claude returned.
    if isinstance(data, dict):
        keep_raw = data.get("keep") or []
    elif isinstance(data, list):
        keep_raw = data
    else:
        keep_raw = []
    if not isinstance(keep_raw, list):
        keep_raw = []
    spans = []
    for item in keep_raw:
        try:
            s, e = float(item["start"]), float(item["end"])
            if s < e:
                spans.append((s, e))
        except (KeyError, ValueError, TypeError):
            continue

    if not spans:
        raise RuntimeError(
            "Claude returned a parseable response but it contained no valid keep spans.\n"
            f"Parsed data: {data}"
        )

    return spans


# ── R7: snap_and_clean ───────────────────────────────────────────────────────

def snap_and_clean(keep_spans, all_words, total_duration):
    """
    Snap span boundaries to word boundaries, drop short spans, merge overlaps.
    all_words: flat list of {"start", "end", "word"} sorted by start time.
    Returns cleaned list of (start, end) tuples, or raises RuntimeError if empty.
    """
    MIN_SPAN = 0.30   # seconds
    MERGE_GAP = 0.05  # merge spans within this gap

    # Sort words by start
    words = sorted(all_words, key=lambda w: w["start"])

    cleaned = []
    for (raw_start, raw_end) in keep_spans:
        # Clamp to valid range
        raw_start = max(0.0, min(raw_start, total_duration))
        raw_end = max(0.0, min(raw_end, total_duration))
        if raw_start >= raw_end:
            continue

        # Snap start: nearest word that starts at or after raw_start
        snapped_start = raw_start
        for w in words:
            if w["start"] >= raw_start:
                snapped_start = w["start"]
                break

        # Snap end: nearest word that ends at or before raw_end
        snapped_end = raw_end
        for w in reversed(words):
            if w["end"] <= raw_end:
                snapped_end = w["end"]
                break

        if snapped_start >= snapped_end:
            continue
        if (snapped_end - snapped_start) < MIN_SPAN:
            continue
        cleaned.append((snapped_start, snapped_end))

    if not cleaned:
        # No words available or no spans snapped — use raw spans
        cleaned = [(max(0.0, s), min(e, total_duration))
                   for (s, e) in keep_spans
                   if (e - s) >= MIN_SPAN]

    # Sort ascending
    cleaned.sort(key=lambda x: x[0])

    # Merge overlapping or near-adjacent spans
    merged = []
    for span in cleaned:
        if not merged:
            merged.append(list(span))
        else:
            prev = merged[-1]
            if span[0] <= prev[1] + MERGE_GAP:
                prev[1] = max(prev[1], span[1])
            else:
                merged.append(list(span))

    result = [(s, e) for s, e in merged if (e - s) >= MIN_SPAN]

    if not result:
        raise RuntimeError("No valid segments to keep after cleaning.")

    return result


# ── R8: render_video ─────────────────────────────────────────────────────────

def render_video(input_path, cutlist, spec, out_mp4, tmpdir):
    """
    Render each keep span as a normalized segment, then concatenate.
    spec: dict with "width", "height", "fps" keys.
    """
    ff = ff_exe()
    W, H = int(spec["width"]), int(spec["height"])
    fps = float(spec["fps"])

    # Default to sane values if probe failed
    if W <= 0 or H <= 0:
        W, H = 1280, 720
    if fps <= 0:
        fps = 30.0

    seg_paths = []
    for idx, (start, end) in enumerate(cutlist):
        seg_path = os.path.join(tmpdir, f"seg_{idx:04d}.mp4")
        duration = end - start
        cmd = [
            ff, "-y",
            "-ss", f"{start:.6f}",
            "-i", input_path,
            "-t", f"{duration:.6f}",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-r", str(fps),
            "-s", f"{W}x{H}",
            "-c:a", "aac",
            "-ar", "48000",
            "-movflags", "+faststart",
            seg_path,
        ]
        r = run(cmd, timeout=600)
        if os.path.exists(seg_path) and os.path.getsize(seg_path) > 0:
            seg_paths.append(seg_path)
            print(f"  segment {idx:04d}: {start:.2f}s → {end:.2f}s ({duration:.2f}s)")
        else:
            # Fail clearly rather than silently shipping a too-short cut.
            raise RuntimeError(
                f"Segment {idx:04d} ({start:.2f}s–{end:.2f}s) failed to render — "
                f"aborting so the output isn't silently incomplete.\n"
                f"ffmpeg stderr: {r.stderr[-400:]}"
            )

    if not seg_paths:
        raise RuntimeError("All segment renders failed — no segments to concatenate.")

    # Write concat list (absolute paths, forward slashes, single-quoted)
    list_path = os.path.join(tmpdir, "concat_list.txt")
    with open(list_path, "w", encoding="utf-8") as f:
        for p in seg_paths:
            # Forward slashes + single-quote. Escape any literal apostrophe the
            # concat demuxer way ('  ->  '\'' ) so usernames like O'Brien (which
            # appear in the %TEMP% path) don't break the concat list.
            fwd = p.replace("\\", "/").replace("'", "'\\''")
            f.write(f"file '{fwd}'\n")

    # Concatenate with stream copy (all segs share the same spec)
    cmd = [
        ff, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", list_path,
        "-c", "copy",
        out_mp4,
    ]
    r = run(cmd, timeout=600)

    if not (os.path.exists(out_mp4) and os.path.getsize(out_mp4) > 0):
        raise RuntimeError(
            f"Concatenation failed — output file missing or empty.\n"
            f"ffmpeg stderr: {r.stderr[-600:]}"
        )
    print(f"  output: {out_mp4}  ({os.path.getsize(out_mp4)//1024} KiB)")


# ── R9: write_srt ────────────────────────────────────────────────────────────

def _srt_ts(seconds):
    """Convert seconds to SRT timestamp: HH:MM:SS,mmm

    Work in integer milliseconds so rounding (e.g. 22.9996s) carries into the
    seconds field instead of producing an invalid '22,1000'.
    """
    total_ms = int(round(max(0.0, seconds) * 1000))
    h = total_ms // 3_600_000
    m = (total_ms % 3_600_000) // 60_000
    s = (total_ms % 60_000) // 1000
    ms = total_ms % 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(cutlist, all_words, out_srt):
    """
    Build SRT captions aligned to the output (post-cut) timeline.
    Words are grouped into caption lines (~7 words, or on punctuation, or on gap >0.6s).
    """
    MAX_WORDS_PER_LINE = 7
    GAP_BREAK = 0.6  # seconds

    # Sort words by start
    words_sorted = sorted(all_words, key=lambda w: w["start"])

    # Collect kept words with their new output timestamps
    kept = []  # list of {"new_start","new_end","word"}
    offset = 0.0
    for (span_start, span_end) in cutlist:
        span_dur = span_end - span_start
        for w in words_sorted:
            if w["start"] >= span_start and w["end"] <= span_end:
                new_start = offset + (w["start"] - span_start)
                new_end = offset + (w["end"] - span_start)
                kept.append({"new_start": new_start, "new_end": new_end, "word": w["word"]})
        offset += span_dur

    if not kept:
        print("  WARNING: no words fell within keep spans — SRT will be empty")
        open(out_srt, "w", encoding="utf-8").close()
        return

    # Group into caption lines
    lines = []       # list of (line_start, line_end, text)
    current_words = []
    current_start = None

    def flush_line():
        if current_words:
            text = " ".join(w["word"].strip() for w in current_words).strip()
            ls = current_words[0]["new_start"]
            le = current_words[-1]["new_end"]
            lines.append((ls, le, text))

    for i, w in enumerate(kept):
        if current_start is None:
            current_start = w["new_start"]

        # Decide whether to break here
        break_now = False
        if len(current_words) >= MAX_WORDS_PER_LINE:
            break_now = True
        elif current_words:
            prev = current_words[-1]
            gap = w["new_start"] - prev["new_end"]
            if gap > GAP_BREAK:
                break_now = True
            elif re.search(r"[.?!]$", prev["word"].strip()):
                break_now = True

        if break_now and current_words:
            flush_line()
            current_words = []
            current_start = None

        current_words.append(w)

    flush_line()  # last group

    # Write SRT
    with open(out_srt, "w", encoding="utf-8") as f:
        for idx, (ls, le, text) in enumerate(lines, 1):
            f.write(f"{idx}\n")
            f.write(f"{_srt_ts(ls)} --> {_srt_ts(le)}\n")
            f.write(f"{text}\n\n")

    print(f"  {len(lines)} caption lines -> {out_srt}")


# ── R10: selftest ────────────────────────────────────────────────────────────

def selftest():
    """Check all dependencies and print a RESULT: ready / missing deps line."""
    section("SELFTEST")
    ok = True

    # Python version
    print(f"Python        : {sys.version.split()[0]}")

    # ffmpeg
    ff = ff_exe()
    if ff:
        r = run([ff, "-version"], timeout=30)
        first_line = (r.stdout or r.stderr or "").splitlines()[:1]
        print(f"ffmpeg        : {ff}")
        if first_line:
            print(f"               {first_line[0]}")
    else:
        print("ffmpeg        : NOT FOUND (pip install imageio-ffmpeg)")
        ok = False

    # faster-whisper
    try:
        import faster_whisper
        print(f"faster-whisper: OK (version {getattr(faster_whisper, '__version__', '?')})")
    except ImportError:
        print("faster-whisper: NOT FOUND (pip install faster-whisper)")
        ok = False

    # claude CLI
    claude_exe = shutil.which("claude") or "claude"
    r = run([claude_exe, "--version"], timeout=30)
    if r.returncode == 0 or r.stdout.strip():
        ver = (r.stdout or r.stderr or "").strip().splitlines()[:1]
        print(f"claude CLI    : OK  {ver[0] if ver else ''}")
    else:
        # Try shell=True fallback
        r2 = run("claude --version", timeout=30)
        if r2.returncode == 0 or r2.stdout.strip():
            ver = (r2.stdout or r2.stderr or "").strip().splitlines()[:1]
            print(f"claude CLI    : OK (shell)  {ver[0] if ver else ''}")
        else:
            print("claude CLI    : NOT FOUND or not logged in (run `claude` once interactively)")
            ok = False

    print(f"\nRESULT: {'ready' if ok else 'missing deps (see above)'}")
    return ok


# ── R11: main ────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(
        description="AI auto-editor: rough-cut a talking-head video using Claude.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Example: python autoedit.py myclip.mp4 --aggressiveness medium",
    )
    ap.add_argument("input", nargs="?", help="Input video file path")
    ap.add_argument("-o", "--outdir", default="out", help="Output directory (default: out)")
    ap.add_argument("--model", default="sonnet", help="Claude model alias (default: sonnet)")
    ap.add_argument("--whisper-model", default="base",
                    help="Whisper model size: tiny|base|small|medium (default: base)")
    ap.add_argument("--aggressiveness", choices=["light", "medium", "heavy"], default="medium",
                    help="Cut aggressiveness (default: medium)")
    ap.add_argument("--keep-temp", action="store_true",
                    help="Keep temporary working files after completion")
    ap.add_argument("--selftest", action="store_true",
                    help="Check dependencies and exit")
    args = ap.parse_args()

    if args.selftest:
        sys.exit(0 if selftest() else 1)

    if not args.input:
        ap.error("an input video file is required (or use --selftest)")

    if not os.path.exists(args.input):
        print(f"!! Input file not found: {args.input}")
        sys.exit(1)

    input_path = os.path.abspath(args.input)
    outdir = os.path.abspath(args.outdir)
    os.makedirs(outdir, exist_ok=True)

    tmpdir = tempfile.mkdtemp(prefix="autoedit_")
    print(f"Input  : {input_path}")
    print(f"Outdir : {outdir}")
    print(f"Tmpdir : {tmpdir}")

    out_mp4 = os.path.join(outdir, "roughcut.mp4")
    out_srt = os.path.join(outdir, "captions.srt")

    try:
        # ── Stage 1: probe ───────────────────────────────────────────────────
        section("1/7  PROBE")
        spec = probe(input_path)
        print(f"  Duration : {spec['duration']:.2f}s")
        print(f"  Video    : {spec['width']}x{spec['height']} @ {spec['fps']:.2f} fps")
        if spec["duration"] <= 0:
            raise RuntimeError(
                "Could not read a valid duration from the input — is this a real "
                "video file? (ffmpeg couldn't report a Duration.)"
            )

        # ── Stage 2: extract audio ────────────────────────────────────────────
        section("2/7  EXTRACT AUDIO")
        wav_path = os.path.join(tmpdir, "audio.wav")
        if not extract_audio(input_path, wav_path):
            raise RuntimeError("Audio extraction failed — does the video have an audio track?")
        print(f"  WAV: {wav_path}")

        # ── Stage 3: transcribe ───────────────────────────────────────────────
        section("3/7  TRANSCRIBE  (faster-whisper)")
        segments = transcribe(wav_path, args.whisper_model)
        if not segments:
            raise RuntimeError(
                "Transcription returned no segments. "
                "Is the video silent? Does faster-whisper work? (python autoedit.py --selftest)"
            )
        all_words = [w for seg in segments for w in seg.get("words", [])]
        print(f"  {len(segments)} segments, {len(all_words)} words")
        for seg in segments[:3]:
            print(f"    {seg['start']:.1f}s  {seg['text'][:60]}")
        if len(segments) > 3:
            print(f"    ... ({len(segments)-3} more)")

        # ── Stage 4: build transcript text ────────────────────────────────────
        section("4/7  BUILD TRANSCRIPT")
        transcript_text = build_transcript_text(segments)
        print(f"  {len(transcript_text)} chars, {len(segments)} lines")

        # ── Stage 5: Claude decides cuts ──────────────────────────────────────
        section("5/7  CLAUDE CUT DECISIONS")
        print(f"  Model: {args.model}  Aggressiveness: {args.aggressiveness}")
        print("  Calling claude CLI (this may take 20-60s) ...")
        keep_spans = decide_cuts_with_claude(
            transcript_text,
            spec["duration"],
            aggressiveness=args.aggressiveness,
            model=args.model,
        )
        print(f"  Claude returned {len(keep_spans)} keep span(s)")
        for s, e in keep_spans:
            print(f"    {s:.2f}s – {e:.2f}s  ({e-s:.2f}s)")

        # ── Stage 6: snap & clean ─────────────────────────────────────────────
        section("6/7  SNAP & CLEAN CUT LIST")
        cutlist = snap_and_clean(keep_spans, all_words, spec["duration"])
        orig_kept = sum(e - s for s, e in cutlist)
        print(f"  {len(cutlist)} segments after snap/clean")
        print(f"  Original duration : {spec['duration']:.2f}s")
        print(f"  Kept duration     : {orig_kept:.2f}s  ({100*orig_kept/max(spec['duration'],0.001):.1f}%)")

        # ── Stage 7: render ───────────────────────────────────────────────────
        section("7a/7  RENDER")
        render_video(input_path, cutlist, spec, out_mp4, tmpdir)

        # ── Stage 7b: captions ────────────────────────────────────────────────
        section("7b/7  CAPTIONS")
        write_srt(cutlist, all_words, out_srt)

        # ── Done ──────────────────────────────────────────────────────────────
        section("DONE")
        print(f"  Rough cut   : {out_mp4}")
        print(f"  Captions    : {out_srt}")
        print(f"  Segments    : {len(cutlist)}")
        print(f"  Original    : {spec['duration']:.2f}s")
        print(f"  Cut to      : {orig_kept:.2f}s ({100*orig_kept/max(spec['duration'],0.001):.1f}%)")
        print()
        print("  Import both files into CapCut. Rough cut — not final; refine in CapCut.")

    finally:
        if not args.keep_temp and os.path.exists(tmpdir):
            shutil.rmtree(tmpdir, ignore_errors=True)
            print(f"  (temp dir removed; use --keep-temp to retain)")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n(interrupted)")
    except Exception as e:
        print(f"\n!! {type(e).__name__}: {e}")
        sys.exit(1)
