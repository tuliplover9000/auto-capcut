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
import sys, os, re, json, math, shutil, tempfile, argparse, subprocess, shlex

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


def run(cmd, timeout=300, input=None, env=None, cwd=None):
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
            cwd=cwd,
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

    # Display dims: phone clips store landscape with a 90/270° rotation flag, so
    # the DISPLAYED frame swaps W/H. ffmpeg auto-rotates on decode, so filters see
    # upright frames at these display dims. Stored width/height keys are unchanged.
    rot = 0
    m = re.search(r"rotation of (-?\d+(?:\.\d+)?) degrees", stderr) or re.search(r"\brotate\s*:\s*(-?\d+)", stderr)
    if m:
        rot = abs(int(float(m.group(1)))) % 180
    if rot == 90:
        info["disp_width"], info["disp_height"] = info["height"], info["width"]
    else:
        info["disp_width"], info["disp_height"] = info["width"], info["height"]

    # Color metadata. Phone clips are often HLG/HDR (bt2020 / arib-std-b67); the
    # zoompan filter DROPS color_primaries/color_trc, so the output reads as SDR
    # and looks washed-out/white. We capture the source's color here and re-stamp
    # it onto any filtered output (see _setparams_suffix). ffmpeg prints it as
    # e.g. "yuv420p10le(tv, bt2020nc/bt2020/arib-std-b67, progressive)".
    info["color"] = {}
    vline = next((ln for ln in stderr.splitlines() if "Video:" in ln), "")
    cm = re.search(r"\((?:(tv|pc|full|limited),\s*)?([a-z0-9]+)/([a-z0-9-]+)/([a-z0-9-]+)", vline)
    if cm:
        rng, mat, pri, trc = cm.group(1), cm.group(2), cm.group(3), cm.group(4)
        if rng:
            info["color"]["range"] = "pc" if rng in ("pc", "full") else "tv"
        if mat and mat != "unknown":
            info["color"]["matrix"] = mat
        if pri and pri != "unknown":
            info["color"]["primaries"] = pri
        if trc and trc != "unknown":
            info["color"]["transfer"] = trc

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
        text = (seg.get("text") or "").strip()   # a noise-only segment may lack "text"
        lines.append(f"[{i}] {seg.get('start', 0.0):.2f}-{seg.get('end', 0.0):.2f}: {text}")
    return "\n".join(lines)


# ── R6: Claude (headless CLI) ────────────────────────────────────────────────

def _claude_cli(prompt, stdin_text, model="sonnet"):
    """
    Run the `claude` CLI headless (Max subscription, NOT the API key) and return
    the inner result string (envelope unwrapped, code fences stripped).
    Raises RuntimeError on launch failure / non-zero exit / empty output.
    """
    claude_exe = shutil.which("claude") or "claude"
    # --bare is intentionally OMITTED: it forces API-key-only auth and breaks the
    # Max-subscription OAuth login we rely on for billing.
    cmd = [claude_exe, "-p", prompt, "--output-format", "json",
           "--max-turns", "1", "--model", model]
    env = dict(os.environ)
    env.pop("ANTHROPIC_API_KEY", None)  # force Max-plan billing, not the API

    def _spawn(command, shell):
        return subprocess.run(command, input=stdin_text, capture_output=True,
                              text=True, encoding="utf-8", errors="replace",
                              timeout=300, env=env, shell=shell)
    try:
        r = _spawn(cmd, False)
    except FileNotFoundError:
        # Quote per the actual shell: list2cmdline for cmd.exe (Windows), shlex
        # for a POSIX shell. Our prompts embed JSON full of quotes (and the
        # transcript/instructions are user-controlled), so naive joining both
        # breaks parsing AND would be an injection vector on POSIX.
        cmd_str = subprocess.list2cmdline(cmd) if os.name == "nt" else shlex.join(cmd)
        try:
            r = _spawn(cmd_str, True)
        except subprocess.TimeoutExpired:
            raise RuntimeError(
                "Claude CLI timed out after 300s with no response. "
                "Try again, or use a shorter clip.")
        except Exception as e2:
            raise RuntimeError(
                f"Claude CLI could not be launched: {e2}\n"
                "Make sure `claude` is on PATH and logged in (run it interactively once).")
    except subprocess.TimeoutExpired:
        raise RuntimeError(
            "Claude CLI timed out after 300s with no response. "
            "Try again, or use a shorter clip.")

    if r.returncode != 0:
        raise RuntimeError(
            f"Claude CLI returned exit code {r.returncode}. "
            "Are you logged in, with plan quota left?\n"
            f"stderr: {(r.stderr or '')[-800:]}")
    stdout = (r.stdout or "").strip()
    if not stdout:
        raise RuntimeError(f"Claude CLI returned empty output.\n"
                           f"stderr: {(r.stderr or '')[-800:]}")

    try:
        result_str = json.loads(stdout).get("result", stdout)
    except json.JSONDecodeError:
        result_str = stdout
    if not isinstance(result_str, str):
        result_str = json.dumps(result_str)
    result_str = result_str.strip()
    result_str = re.sub(r"^```(?:json)?\s*", "", result_str)
    result_str = re.sub(r"\s*```$", "", result_str)
    return result_str.strip()


def _extract_json(s):
    """Parse JSON, tolerating code fences, surrounding prose, and trailing extra
    blocks (e.g. a stray second JSON object after the answer). Raises ValueError
    when there's no parseable JSON (callers treat that as a safe failure)."""
    if not s or not s.strip():
        raise ValueError("empty JSON string")
    s = s.strip()
    try:
        return json.loads(s)                       # clean object/array
    except json.JSONDecodeError:
        pass
    # Decode the FIRST complete JSON value, skipping any leading prose and
    # ignoring any trailing data. raw_decode stops at the end of the first value,
    # so two concatenated objects no longer defeat a greedy `{.*}` regex.
    dec = json.JSONDecoder()
    for i, ch in enumerate(s):
        if ch in "{[":
            try:
                obj, _ = dec.raw_decode(s, i)
                return obj
            except json.JSONDecodeError:
                continue
    raise ValueError("no JSON object found")


def decide_cuts_with_claude(transcript_text, total_duration, aggressiveness="medium",
                            model="sonnet", extra=""):
    """
    Send the transcript to Claude via the `claude` CLI (headless, Max subscription).
    `extra` is free-form creator guidance folded into the prompt.
    Returns a list of (start, end) float tuples to KEEP.
    Raises RuntimeError if Claude is unreachable or returns no usable spans.
    """
    aggr_desc = {
        "light":  "Remove only obviously long silences (>3s) and clear vocal stutters. Preserve most content.",
        "medium": "Remove clear filler words (um, uh, like, you know), false starts, long silences (>1.5s), and obvious repeated/botched takes. Keep all clean, intentional takes.",
        "heavy":  "Aggressively cut all filler, hesitations, repeated ideas, tangents, and any silence >0.8s. Keep only the tightest version of each idea.",
    }

    extra_block = (f"\nCreator's extra instructions (these take PRIORITY over the "
                   f"defaults above):\n{extra}\n" if extra else "")

    prompt = f"""You are an AI video editor assistant. Your task is to decide which portions of a talking-head video recording to KEEP in the rough cut.

The timestamped transcript of the recording is provided on stdin. Each line is one speech segment: [index] start_seconds-end_seconds: text

Aggressiveness level: {aggressiveness}
Instruction: {aggr_desc.get(aggressiveness, aggr_desc['medium'])}
{extra_block}
Rules:
- Return ONLY valid JSON with a single key "keep": a list of objects, each with "start" and "end" (seconds, floats).
- The keep list must be in ascending time order, non-overlapping.
- All start/end values must be within [0, {total_duration:.2f}].
- Do NOT include any explanation, markdown, or extra text — ONLY the JSON object.
- If you remove a section, omit it. If you keep everything, return all segments.

Example output format:
{{"keep":[{{"start":0.5,"end":12.3}},{{"start":15.0,"end":28.7}}]}}

The transcript follows on stdin."""

    result_str = _claude_cli(prompt, transcript_text, model)
    try:
        data = _extract_json(result_str)
    except (json.JSONDecodeError, ValueError):
        raise RuntimeError(
            "Could not parse Claude's response as JSON.\n"
            f"Raw result (first 500 chars): {result_str[:500]}")

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


def decide_zooms_with_claude(cutlist, all_words, model="sonnet", extra="", mode="static"):
    """
    Ask Claude to choose a camera zoom PER kept segment. Returns a list aligned
    1:1 with cutlist of {"type","level"} dicts, defaulting to none and enforcing
    guardrails. Never raises — falls back to all-none.

    mode="static" (default): the reference-reel look — a STATIC framing jump (hard
      cut to a held closer crop), two-framing, sparse. Only none/in.
    mode="animated": continuous push/pull movement within clips (energetic option).
    """
    segs = []
    for i, (s, e) in enumerate(cutlist):
        txt = " ".join(w["word"].strip() for w in all_words if s <= w["start"] < e).strip()
        segs.append(f"[{i}] {e-s:.2f}s: {txt[:200]}")
    payload = "\n".join(segs)
    extra_block = f"\nCreator's guidance (PRIORITY): {extra}\n" if extra else ""

    if mode == "animated":
        body = '''Zoom types (this is the ANIMATED mode — the camera MOVES during a clip):
- "push": continuous zoom IN across the segment (main tool, intensify). level ~1.10-1.18
- "pullout": continuous zoom OUT across the segment (reveal/release). level ~1.10-1.18
- "snap": fast punchy zoom, JOKES/BEATS ONLY. level ~1.18-1.25
- "none": no movement (use ~1 in 3 segments for contrast)
- "in": static held crop (use rarely)

RULES:
- Most zoomed segments are "push" or "pullout"; ALTERNATE them so it breathes in/out.
- ~1 in 3 segments "none" for contrast. Bigger moves on hooks/emphasis, gentle on calm lines.
- "snap" only for clear jokes/beats, never two in a row.'''
    else:  # static (default) — matches the reference reels
        body = '''Zoom types (STATIC mode — NO animated movement; this matches a clean pro talking-head edit):
- "none": wide/resting framing 1.0x (the DEFAULT for most segments)
- "in": a STATIC closer framing, held still for the whole segment (a punch-in). level ~1.10-1.14
Do NOT use push/pullout/snap in this mode.

RULES (follow strictly):
- This is "two-framing": the frame is either wide ("none") or punched-in ("in"), and it CUTS between them — it never moves within a clip.
- Be SPARSE: MOST segments are "none". Use "in" only on hooks, emphasis, new points / topic shifts — roughly 1 in 3-4 segments, not every clip.
- Don't put "in" on many segments in a row; alternate with "none" so the punch-in reads as a deliberate change.
- Keep levels subtle (~1.10-1.14). The effect is the JUMP at the cut, not a big crop.'''

    prompt = f'''You are a video editor choosing CAMERA ZOOMS for a vertical talking-head edit. Below (on stdin) are the kept segments in order, one per line: [index] duration: text. Choose a zoom PER segment.

{body}
{extra_block}
Return ONLY JSON: {{"zooms":[{{"i":0,"type":"in","level":1.12}}, ...]}} — one entry per segment index 0..{len(cutlist)-1}. "level" optional.

The segments follow on stdin.'''
    try:
        data = _extract_json(_claude_cli(prompt, payload, model))
    except Exception:
        # Zooms are a nice-to-have; if Claude is unreachable/quota'd, fall back to
        # no zoom (all-none) rather than failing the whole render.
        data = {}
    raw = data.get("zooms") if isinstance(data, dict) else (data if isinstance(data, list) else [])
    plan = [{"type": "none", "level": 1.0} for _ in cutlist]
    for item in (raw or []):
        try:
            i = int(item["i"]); t = str(item.get("type", "none"))
            if 0 <= i < len(cutlist) and t in ZOOM_TYPES:
                lvl = item.get("level")
                lvl = float(lvl) if lvl is not None else DEFAULT_ZOOM_LEVEL.get(t, 1.0)
                plan[i] = {"type": t, "level": max(1.0, min(1.35, lvl))}
        except (KeyError, ValueError, TypeError):
            continue
    prev = None
    for i, (s, e) in enumerate(cutlist):
        dur = e - s; z = plan[i]
        if mode != "animated":
            # static mode: collapse any motion type to a held static punch-in
            if z["type"] in ("push", "pullout", "snap"):
                z["type"] = "in"
        else:
            # animated: too short to move -> rest; snap guardrails
            if z["type"] in ("push", "pullout") and dur < 0.5: z["type"] = "none"
            if z["type"] == "snap" and dur < 0.4: z["type"] = "in"
            if z["type"] == "snap" and prev == "snap": z["type"] = "in"
        prev = z["type"]
    return plan


def decide_titles_with_claude(cutlist, all_words, model="sonnet", extra=""):
    """
    Ask Claude for a few EDITORIAL TITLE cards (big yellow hook/section text) —
    sparse: a hook for the opening + a couple of section headers. Returns a list
    of {"start","end","text"} on the OUTPUT timeline. Never raises -> falls back
    to no titles ([]).
    """
    # per-segment output-timeline start/end
    outs, acc = [], 0.0
    for s, e in cutlist:
        outs.append((acc, acc + (e - s)))
        acc += (e - s)
    segs = []
    for i, (s, e) in enumerate(cutlist):
        txt = " ".join(w["word"].strip() for w in all_words if s <= w["start"] < e).strip()
        segs.append(f"[{i}] {e-s:.2f}s: {txt[:200]}")
    payload = "\n".join(segs)
    extra_block = f"\nCreator's guidance (PRIORITY): {extra}\n" if extra else ""
    prompt = f'''You are a short-form video editor adding a few big EDITORIAL TITLE cards to a talking-head edit (like the bold yellow hook/section text creators use). The kept segments are on stdin: [index] duration: text.

Pick a SMALL number of punchy titles:
- ONE hook title over the opening (segment 0) — the scroll-stopper, max ~5 words.
- 0-3 SECTION titles at clear topic shifts / big claims / list numbers.
Titles are SHORT (1-5 words), punchy, drawn from what's said (you may compress/rephrase to a punchy version). They are NOT a transcript. Be sparse and tasteful — most segments get NO title.
{extra_block}
Return ONLY JSON: {{"titles":[{{"i":0,"text":"WATCH THIS"}}, ...]}} — "i" is a segment index 0..{len(cutlist)-1}.

The segments follow on stdin.'''
    try:
        data = _extract_json(_claude_cli(prompt, payload, model))
    except Exception:
        return []
    raw = data.get("titles") if isinstance(data, dict) else (data if isinstance(data, list) else [])
    titles = []
    for item in (raw or []):
        try:
            i = int(item["i"]); text = str(item.get("text", "")).strip()
            if 0 <= i < len(cutlist) and text:
                st, en = outs[i]
                en = min(en, st + 2.5)          # hold ~2.5s max
                if en - st < 0.6:               # ensure visible on short segments
                    en = min(outs[i][1], st + 0.8)
                titles.append({"start": st, "end": en, "text": text[:40]})
        except (KeyError, ValueError, TypeError):
            continue
    return titles


def decide_overlays_with_claude(cutlist, all_words, model="sonnet", extra="", density="tasteful"):
    """
    Decide a sparse, tasteful B-roll plan on the OUTPUT (post-cut) timeline.
    Returns a list of dicts: {"start","end","query","format","kind","label"}
      - start/end: OUTPUT-timeline seconds (lead + duration already applied/clamped)
      - query: concrete stock search query
      - format: "stacked" (default) | "cutaway"
      - kind: "image" (default) | "video"
      - label: short ALL-CAPS headline string ("" if none)
    Never raises -> [] on any failure. NO files fetched here (Phase 3 resolves queries).
    density in {"tasteful","more","less"} controls min spacing between overlays.
    """
    kept = _kept_words(cutlist, all_words)
    if not kept:
        return []
    total_out = sum(e - s for s, e in cutlist)

    # phrase-line payload on the OUTPUT timeline
    lines = []
    for line in _group_caption_lines(kept, max_words=6):
        t = line[0]["new_start"]
        text = " ".join(w["word"].strip() for w in line).strip()
        lines.append(f"[t={t:.1f}] {text}")
    payload = "\n".join(lines)

    MIN_GAP = {"more": 3.0, "less": 7.0}.get(density, 4.5)
    density_phrase = {
        "more": "roughly one every 3 seconds",
        "less": "sparingly, about one every 7 seconds",
    }.get(density, "about ONE every 4-5 seconds")

    extra_block = f"\nCreator's guidance (PRIORITY): {extra}\n" if extra else ""

    prompt = f'''You are a short-form video editor adding B-ROLL (stock images / short video clips) to a talking-head edit, "show it when he says it" style. The kept transcript is on stdin, each line tagged with its time in the FINAL video: [t=SS.s] phrase.

Choose a SMALL, TASTEFUL set of B-roll moments ({density_phrase}; fewer well-matched beats beat many mediocre ones). For each pick a CONCRETE visual findable in stock footage.

GOOD triggers: concrete nouns (people/places/brands/products/objects), numbers/stats/money/dates, list items, comparisons, "let me show you".
SKIP: abstract concepts (focus, productivity, mindset, "the future" - literal stock looks generic), filler/function words, hook/punchline face moments.

Per moment return: time (final-video seconds of the trigger), phrase, query (CONCRETE 2-5 word stock query; translate ideas to filmable visuals, e.g. "market crashed"->"red downward stock chart"), kind (image default; video for motion subjects), format (stacked default; cutaway rare full-screen accent), duration (2 default; 3-4 for numbers/reveals), label (2-4 word ALL CAPS headline or "").
{extra_block}
Rules: skip abstracts, concrete queries only, never crowd.
Return ONLY JSON: {{"overlays":[{{...}}]}}. Transcript on stdin.'''

    try:
        data = _extract_json(_claude_cli(prompt, payload, model))
    except Exception:
        return []
    raw = data.get("overlays") if isinstance(data, dict) else (data if isinstance(data, list) else [])

    items = []
    for item in (raw or []):
        try:
            time = float(item["time"])
            if not (0 <= time <= total_out):
                continue
            dur = max(1.2, min(4.0, float(item.get("duration", 2.0))))
            start = max(0.0, time - 0.25)          # 0.25s LEAD
            end = min(total_out, start + dur)
            if end - start < 1.0:
                continue
            fmt = "cutaway" if str(item.get("format", "")).lower() == "cutaway" else "stacked"
            kind = "video" if str(item.get("kind", "")).lower() == "video" else "image"
            label = str(item.get("label") or "").strip()[:40]
            query = str(item.get("query") or "").strip()
            if not query:
                continue
            items.append({"start": start, "end": end, "query": query,
                          "format": fmt, "kind": kind, "label": label})
        except (KeyError, ValueError, TypeError):
            continue

    items.sort(key=lambda it: it["start"])
    kept_overlays = []
    last_kept_start = -1e9
    last_kept_end = -1e9
    for it in items:
        if it["start"] >= last_kept_start + MIN_GAP and it["start"] >= last_kept_end + 0.3:
            kept_overlays.append(it)
            last_kept_start = it["start"]
            last_kept_end = it["end"]
    return kept_overlays


def resolve_overlays(cutlist, all_words, model="sonnet", density="tasteful", style="auto", extra=""):
    """Decide a B-roll plan AND fetch the assets -> composite-ready overlay list.

    Returns a list of {path,start,end,format,kenburns,fade} for overlays.composite.
    Best-effort: an item whose asset can't be fetched (no API key / no match) is
    skipped, never aborts. May return [] (no key / nothing found).
    style: "auto" keeps each item's brain-chosen format; "stacked"/"cutaway" overrides.
    """
    import mediasource
    plan = decide_overlays_with_claude(cutlist, all_words, model=model, density=density, extra=extra)
    used, out = set(), []
    for item in plan:
        path = mediasource.search(item["query"], item.get("kind", "image"),
                                  "portrait", used_ids=used)
        if not path:
            continue                       # skip unfetchable; B-roll is best-effort
        fmt = item["format"] if style == "auto" else style   # stacked|cutaway override
        out.append({"path": path, "start": item["start"], "end": item["end"],
                    "format": fmt, "kenburns": True, "fade": 0.25})
    return out                             # may be [] (no key / nothing found)


def revise_with_claude(transcript_text, total_duration, current_keep,
                       caption_settings, chat_history, user_msg, model="sonnet"):
    """
    Conversational revision. Given the cached transcript, the current kept spans,
    the current caption settings, and the chat so far, ask Claude how to revise
    the edit per the creator's latest message.
    Returns a dict: {"reply": str, "keep": [[s,e],...] or None,
                     "captions": {..changed fields..} or None}.
    """
    keep_txt = json.dumps([[round(s, 2), round(e, 2)] for s, e in current_keep])
    history_txt = "\n".join(f"{m.get('role','?')}: {m.get('text','')}"
                            for m in chat_history[-12:]) or "(none)"

    prompt = f"""You are an AI video editor in a conversation with a creator about THEIR talking-head video. The full timestamped transcript is on stdin (each line: [i] start-end: text).

Total duration: {total_duration:.2f}s
CURRENT kept segments (seconds) — the edit as it stands: {keep_txt}
CURRENT caption settings: {json.dumps(caption_settings)}

Conversation so far:
{history_txt}

The creator's new message: "{user_msg}"

Decide how to revise. Respond with ONLY a JSON object:
{{
  "reply": "<friendly 1-2 sentence reply describing what you changed (or why you can't)>",
  "keep": [[start,end], ...],
  "captions": {{"style":"clean|pop|highlight|oneword","font":"Anton|Bebas Neue|Montserrat|Arial Black|Impact","highlight":"yellow|green|cyan|red|white","pos":"lower|center","burn":true}},
  "zoom": {{"enabled": true, "mode": "static|animated", "instruction": "<how to change zooms, e.g. 'more punch-ins', 'no zoom on the intro', 'calmer'>"}},
  "effects": {{"vignette": true, "grain": true, "flash": true}},
  "titles": {{"enabled": true}},
  "broll": {{"enabled": true, "density": "tasteful|more|less", "instruction": "<what to change, e.g. add a rocket when I say launch / fewer images / remove the map>"}}
}}
Rules:
- Include "keep" ONLY if the creator wants to change which parts are kept/removed. It must be the FULL new ordered, non-overlapping list within [0,{total_duration:.2f}]. Omit it entirely if the cut is unchanged.
- Include "captions" ONLY with the fields that change (e.g. just {{"font":"Bebas Neue"}}). Omit it if the look is unchanged. Set "burn":true if they want captions added.
- Include "zoom" ONLY if the creator wants to change camera zooms. Omit otherwise. Set "enabled":false to turn zooms off. Set "mode":"animated" if they want moving/animated zooms, "static" if they want still punch-ins (the default look).
- Include "effects" ONLY with the toggles that change. Available: "vignette" (darkened edges), "grain" (film grain), "flash" (white flash on cuts). e.g. {{"vignette":true}} or {{"grain":false}}. Omit if no effect changes.
- Include "titles" ONLY if the creator wants the big editorial title cards (hook/section text) turned on/off. e.g. {{"enabled":true}}. Omit otherwise.
- Include "broll" ONLY if the creator wants to change the B-roll / overlay images/videos. Set "enabled":false to turn B-roll off, true to turn it on. Use "density" for "more"/"fewer" images. Put any content steering ("add a picture of X when I say Y", "remove the map", "use clips not photos") in "instruction". Omit "broll" entirely if unchanged.
- If they ask for something not supported yet (music, sound effects, camera shake), explain that in "reply" and omit the unsupported directives.
- "reply" is always required. Output JSON only — no markdown, no prose outside the JSON."""

    result_str = _claude_cli(prompt, transcript_text, model)
    try:
        data = _extract_json(result_str)
    except (json.JSONDecodeError, ValueError):
        return {"reply": "Sorry — I couldn't parse that. Try rephrasing?",
                "keep": None, "captions": None, "zoom": None, "effects": None, "titles": None, "broll": None}
    if not isinstance(data, dict):
        return {"reply": "Sorry — I couldn't parse that. Try rephrasing?",
                "keep": None, "captions": None, "zoom": None, "effects": None, "titles": None, "broll": None}

    reply = str(data.get("reply") or "Done.")
    # Normalize keep -> list of (s,e) tuples or None
    keep = None
    raw = data.get("keep")
    if isinstance(raw, list) and raw:
        keep = []
        for it in raw:
            try:
                if isinstance(it, dict):
                    s, e = float(it["start"]), float(it["end"])
                else:
                    s, e = float(it[0]), float(it[1])
                if s < e:
                    keep.append((s, e))
            except (KeyError, ValueError, TypeError, IndexError):
                continue
        if not keep:
            keep = None
    caps = data.get("captions") if isinstance(data.get("captions"), dict) else None
    zoom = data.get("zoom") if isinstance(data.get("zoom"), dict) else None
    fx = data.get("effects") if isinstance(data.get("effects"), dict) else None
    ti = data.get("titles") if isinstance(data.get("titles"), dict) else None
    br = data.get("broll") if isinstance(data.get("broll"), dict) else None
    return {"reply": reply, "keep": keep, "captions": caps, "zoom": zoom, "effects": fx, "titles": ti, "broll": br}


# ── R7: snap_and_clean ───────────────────────────────────────────────────────

def snap_and_clean(keep_spans, all_words, total_duration, fps=None):
    """
    Snap span boundaries to word boundaries, drop short spans, merge overlaps.
    all_words: flat list of {"start", "end", "word"} sorted by start time.
    Returns cleaned list of (start, end) tuples, or raises RuntimeError if empty.

    fps: when given, each segment's DURATION is rounded UP to a whole frame so the
    nominal output timeline (sum of segment durations, used by captions / titles /
    B-roll / flash) matches what render_video actually produces. Without this, a
    re-encoded segment whose length isn't a frame multiple renders ~half a frame
    long, and the caption layer progressively leads the audio (~0.5s over ~30
    cuts). Rounding UP (never down) guarantees the last word of a span is never
    clipped out of the segment.
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

    # Frame-align each segment's duration so nominal output time == rendered time
    # (kills cumulative caption/overlay drift). Round UP so no trailing word is
    # clipped; clamp the end to the source duration (last segment only).
    if fps and fps > 0:
        aligned = []
        for i, (s, e) in enumerate(result):
            n = max(1, math.ceil((e - s) * fps - 1e-6))
            e2 = min(total_duration, s + n / fps)
            # Rounding UP can push the end past the next segment's start at low fps
            # (1/fps > the inter-segment gap); clamp so we never re-introduce the
            # overlap the merge step already removed.
            if i + 1 < len(result):
                e2 = min(e2, result[i + 1][0])
            aligned.append((s, e2))
        result = aligned

    return result


# ── R8: render_video ─────────────────────────────────────────────────────────

def _zoom_vf(zspec, dw, dh, fps, dur):
    r"""
    Build a -vf filter string for one segment's camera zoom, scaled to the
    DISPLAY dims (dw x dh) at `fps`. Returns a plain scale+fps for "none" (so
    every segment ends at uniform dims/fps and the stream-copy concat works).
    Note: the `\\,` in the source becomes a literal `\,` in the string — escaped
    commas INSIDE zoompan expressions (e.g. min(a\,b)) so they don't split the
    filtergraph.
    """
    t = (zspec or {}).get("type", "none")
    L = float((zspec or {}).get("level") or DEFAULT_ZOOM_LEVEL.get(t, 1.0))
    L = max(1.0, min(1.35, L))
    B = ZOOM_BIAS
    f = f"{fps:.4f}"
    if t in ("in", "snap") and L > 1.0:
        # Static punch-in held for the whole segment. "snap" is just a tighter
        # hard punch (an animated zoompan snap would start at 1.0 and visibly pop
        # OUT then in when it follows a tighter segment — a hard punch avoids that
        # and reads cleaner). Crop window iw/L x ih/L anchored at bias B of the
        # vertical slack, then scale back to display dims.
        # setsar=1: a non-integer iw/L crop makes ffmpeg nudge the SAR to preserve
        # display geometry; without resetting it this segment ends non-1:1 while
        # the other zoom types are 1:1, and the stream-copy concat then renders the
        # punch-in frames at the wrong SAR (slight horizontal squish).
        return (f"crop=iw/{L}:ih/{L}:(iw-iw/{L})/2:(ih-ih/{L})*{B},"
                f"scale={dw}:{dh},setsar=1,fps={f}")
    if t in ("push", "pullout") and L > 1.0:
        N = max(2, round(dur * fps)); nm1 = N - 1
        z = (f"min(1+({L}-1)*on/{nm1}\\,{L})" if t == "push"
             else f"max({L}-({L}-1)*on/{nm1}\\,1)")
        # y uses the SAME vertical-slack fraction as the static crop above:
        # (ih-ih/zoom)*B stays within [0, slack] for every zoom>1, so the subject
        # never gets clamped to the top of the frame (the bug for L<1.25).
        return (f"zoompan=z='{z}':d=1:x='(iw-iw/zoom)/2':"
                f"y='(ih-ih/zoom)*{B}':s={dw}x{dh}:fps={f}")
    return f"scale={dw}:{dh},fps={f}"   # none, but zoom active -> uniform dims/fps


# Whitelisted color values (these are ffmpeg's own display names == setparams
# option values). Anything outside the whitelist is skipped so a stray token
# can never break a render.
_CM_MATRIX = {"bt709", "bt2020nc", "bt2020c", "smpte170m", "bt470bg", "smpte240m", "fcc", "ycgco", "gbr"}
_CM_PRIM = {"bt709", "bt2020", "smpte170m", "bt470bg", "bt470m", "film", "smpte428", "smpte431", "smpte432"}
_CM_TRC = {"bt709", "arib-std-b67", "smpte2084", "smpte170m", "gamma22", "gamma28",
           "smpte240m", "linear", "iec61966-2-1", "bt2020-10", "bt2020-12"}


def _setparams_suffix(color):
    """
    Build a ',setparams=...' suffix that re-stamps source color metadata onto a
    filtered frame. zoompan drops color_primaries/color_trc, which makes HLG/HDR
    footage read as SDR and look washed-out; re-stamping fixes it. Returns "" when
    there's nothing to set (e.g. plain SDR with no tags).
    """
    if not color:
        return ""
    parts = []
    if color.get("matrix") in _CM_MATRIX:
        parts.append(f"colorspace={color['matrix']}")
    if color.get("primaries") in _CM_PRIM:
        parts.append(f"color_primaries={color['primaries']}")
    if color.get("transfer") in _CM_TRC:
        parts.append(f"color_trc={color['transfer']}")
    if color.get("range") in ("tv", "pc"):
        parts.append(f"range={color['range']}")
    return (",setparams=" + ":".join(parts)) if parts else ""


def _video_frame_count(path):
    """Exact decoded video frame count of `path` (None if unparseable)."""
    ff = ff_exe()
    r = run([ff, "-i", path, "-map", "0:v:0", "-c", "copy", "-f", "null", "-"], timeout=120)
    fr = None
    for m in re.finditer(r"frame=\s*(\d+)", r.stderr or ""):
        fr = int(m.group(1))
    return fr


def _has_audio(input_path):
    """True if `input_path` has at least one audio stream (parses ffmpeg -i).
    Requires the 'Stream #...: Audio:' shape so an 'Audio:' substring in a
    metadata/title line can't false-positive."""
    ff = ff_exe()
    r = run([ff, "-i", input_path], timeout=30)
    return any("Audio:" in ln and "Stream #" in ln
               for ln in (r.stderr or "").splitlines())


def render_video(input_path, cutlist, spec, out_mp4, tmpdir, zoomplan=None):
    """
    Render each keep span as a normalized segment, then concatenate.
    spec: dict with "width", "height", "fps" keys.

    A/V-drift fix: segments are rendered VIDEO-ONLY and concatenated with -c copy
    (frame-exact, unchanged). The audio is built in a SINGLE ffmpeg pass from the
    original (one filtergraph -> one AAC encode = ONE encoder priming, instead of
    a priming per segment accumulating at every concat join — which pushed the
    audio progressively behind the video for edit-list-ignoring importers like
    CapCut). The single audio track is trimmed to the MEASURED video length and
    muxed onto the concatenated video. A source with no audio still yields a
    silent video, exactly as before.
    """
    ff = ff_exe()
    # Single-clip Tier 1: do NOT force -s/-r. Phone videos are often stored
    # landscape (e.g. 1920x1080) with a 90° displaymatrix rotation flag; forcing
    # a fixed WxH ignores that flag and stretches the portrait content. Letting
    # ffmpeg re-encode natively bakes the rotation in upright and keeps the true
    # aspect ratio + fps. All segments share the source spec, so concat still
    # stream-copies cleanly. (Per-clip normalization belongs to multi-clip Tier 2.)
    # When zoom is active, every segment must end at identical display dims + fps
    # so the stream-copy concat works. Compute the display dims/fps once.
    dw = int(spec.get("disp_width") or spec.get("width") or 0)
    dh = int(spec.get("disp_height") or spec.get("height") or 0)
    fps = float(spec.get("fps") or 30.0)

    seg_paths = []
    for idx, (start, end) in enumerate(cutlist):
        seg_path = os.path.join(tmpdir, f"seg_{idx:04d}.mp4")
        duration = end - start
        vf = None
        if zoomplan is not None and dw > 0 and dh > 0:
            z = zoomplan[idx] if idx < len(zoomplan) else None
            vf = _zoom_vf(z, dw, dh, fps, end - start)
            # Re-stamp source colour (zoompan drops HLG/HDR primaries+transfer).
            vf += _setparams_suffix(spec.get("color"))
        elif dw > 0 and dh > 0 and (dw % 2 or dh % 2):
            # libx264 yuv420p needs even W/H — an odd-dimensioned source would
            # abort the encode. Correct to the nearest even dims (only when the
            # source is actually odd, so the common even-dim path is untouched).
            vf = "scale=trunc(iw/2)*2:trunc(ih/2)*2" + _setparams_suffix(spec.get("color"))
        cmd = [
            ff, "-y",
            "-ss", f"{start:.6f}",
            "-i", input_path,
            "-t", f"{duration:.6f}",
            "-an",                          # video-only; audio is built in one pass below
        ]
        if vf:
            cmd += ["-vf", vf]
        cmd += [
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
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

    # Concatenate the VIDEO with stream copy (all segs share the same spec).
    # +faststart relocates the moov atom to the FRONT so a browser <video> can
    # read the duration and stream/seek immediately (otherwise it shows 0:00/0:00
    # and won't update until the whole file downloads).
    video_only = os.path.join(tmpdir, "video_concat.mp4")
    r = run([
        ff, "-y",
        "-f", "concat", "-safe", "0", "-i", list_path,
        "-c", "copy",
        "-movflags", "+faststart",
        video_only,
    ], timeout=600)
    if not (os.path.exists(video_only) and os.path.getsize(video_only) > 0):
        raise RuntimeError(
            f"Video concatenation failed — output file missing or empty.\n"
            f"ffmpeg stderr: {r.stderr[-600:]}"
        )

    # Build the WHOLE audio in ONE pass (one priming, no per-join accumulation).
    audio_path = None
    if _has_audio(input_path):
        # Pin audio to the MEASURED video length so it can't drift. Prefer the
        # concatenated video's actual container duration (correct for BOTH CFR and
        # VFR — using the source's average fps for frame->seconds math is wrong
        # when segments re-encode at a different rate than a VFR source's mean).
        # Fall back to frame-count/fps, then to the nominal sum.
        meas = (probe(video_only).get("duration") or 0.0)
        vframes = _video_frame_count(video_only)
        if meas > 0:
            total_v = meas
        elif vframes and fps > 0:
            total_v = vframes / fps
        else:
            total_v = sum(e - s for s, e in cutlist)
        parts = [f"[0:a]atrim=start={s:.6f}:end={e:.6f},asetpts=PTS-STARTPTS[a{i}]"
                 for i, (s, e) in enumerate(cutlist)]
        labels = "".join(f"[a{i}]" for i in range(len(cutlist)))
        # apad + atrim clamp the result to exactly the video length so tiny
        # per-chunk filter rounding can't re-accumulate into drift.
        fg = (";".join(parts) + ";" + labels +
              f"concat=n={len(cutlist)}:v=0:a=1,apad,atrim=end={total_v:.6f},"
              f"asetpts=PTS-STARTPTS[aout]")
        audio_path = os.path.join(tmpdir, "audio_single.m4a")
        ra = run([
            ff, "-y", "-i", input_path,
            "-filter_complex", fg,
            "-map", "[aout]",
            "-c:a", "aac", "-ar", "48000",
            "-movflags", "+faststart",
            audio_path,
        ], timeout=600)
        if not (os.path.exists(audio_path) and os.path.getsize(audio_path) > 0):
            # Unexpected audio failure -> degrade to a silent video, never abort.
            print(f"  WARNING: single-pass audio build failed; shipping silent video.\n"
                  f"  ffmpeg stderr: {(ra.stderr or '')[-400:]}")
            audio_path = None

    # Mux the concatenated video + single-pass audio (or pass the silent video
    # through). NB: NO -shortest — with -c copy it truncates the VIDEO to the last
    # audio packet boundary and drops trailing video frames.
    if audio_path:
        cmd = [ff, "-y", "-i", video_only, "-i", audio_path,
               "-map", "0:v:0", "-map", "1:a:0", "-c", "copy",
               "-movflags", "+faststart", out_mp4]
    else:
        cmd = [ff, "-y", "-i", video_only, "-c", "copy",
               "-movflags", "+faststart", out_mp4]
    r = run(cmd, timeout=600)
    if not (os.path.exists(out_mp4) and os.path.getsize(out_mp4) > 0):
        raise RuntimeError(
            f"Final mux failed — output file missing or empty.\n"
            f"ffmpeg stderr: {(r.stderr or '')[-600:]}"
        )
    print(f"  output: {out_mp4}  ({os.path.getsize(out_mp4)//1024} KiB)")


# ── R8b: effects grade (vignette / film grain / flash on cut) ────────────────

def cut_offsets(cutlist):
    """Output-timeline boundaries between segments (start of seg 1..n-1)."""
    offs, acc = [], 0.0
    for s, e in cutlist:
        acc += (e - s)
        offs.append(acc)
    return offs[:-1]  # drop the final end; these are the internal cut points


def _effects_filters(effects, boundaries, fps):
    """Return the list of effect filter strings (grain/vignette/flash), no setparams.

    Shared by _effects_vf (grade pass) and the overlay compositor (overlays.py),
    which folds these into the SAME ffmpeg pass and re-stamps color itself.
    """
    filters = []
    if effects.get("grain"):
        filters.append("noise=alls=10:allf=t")     # subtle moving film grain
    if effects.get("vignette"):
        filters.append("vignette=PI/4.2")           # gentle darkened corners
    if effects.get("flash") and boundaries:
        # White flash on cuts, gated to >=1.5s apart so fast edits don't strobe.
        times, last = [], -99.0
        for t in boundaries:
            if t > 0 and t - last >= 1.5:   # t>0: never flash the opening frames
                times.append(t); last = t
        if times:
            d = 2.0 / max(1.0, fps)                 # ~2 frames
            cond = "+".join(f"between(t\\,{t:.3f}\\,{t + d:.3f})" for t in times)
            filters.append(
                f"drawbox=x=0:y=0:w=iw:h=ih:t=fill:color=white@0.7:enable='{cond}'")
    return filters


def _effects_vf(effects, boundaries, fps, color):
    """Build the grade filter chain (or '' if nothing enabled)."""
    filters = _effects_filters(effects, boundaries, fps)
    chain = ",".join(filters)
    if not chain:
        return ""
    return chain + _setparams_suffix(color)         # re-stamp HLG/HDR colour tags


def grade_video(in_mp4, out_mp4, effects, boundaries, fps, color, tmpdir):
    """
    Apply the global effects grade (vignette/grain/flash) to in_mp4 -> out_mp4.
    If no effect is enabled, the input is stream-copied through unchanged.
    """
    ff = ff_exe()
    vf = _effects_vf(effects or {}, boundaries or [], float(fps or 30.0), color)
    if not vf:
        cmd = [ff, "-y", "-i", os.path.abspath(in_mp4), "-c", "copy",
               "-movflags", "+faststart", os.path.abspath(out_mp4)]
    else:
        cmd = [ff, "-y", "-i", os.path.abspath(in_mp4), "-vf", vf,
               "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "copy",
               "-movflags", "+faststart", os.path.abspath(out_mp4)]
    r = run(cmd, timeout=900)
    if not (os.path.exists(out_mp4) and os.path.getsize(out_mp4) > 0):
        raise RuntimeError(f"Effects grade failed.\nffmpeg stderr: {r.stderr[-500:]}")


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


def _kept_words(cutlist, all_words):
    """
    Map the words that survive the cut onto the OUTPUT (post-cut) timeline.
    Returns list of {"new_start", "new_end", "word"} in output time order.
    Shared by both the SRT writer and the burned-in ASS captions.
    """
    words_sorted = sorted(all_words, key=lambda w: w["start"])
    kept = []
    offset = 0.0
    for (span_start, span_end) in cutlist:
        span_dur = span_end - span_start
        for w in words_sorted:
            if w["start"] >= span_start and w["end"] <= span_end:
                kept.append({
                    "new_start": offset + (w["start"] - span_start),
                    "new_end": offset + (w["end"] - span_start),
                    "word": w["word"],
                })
        offset += span_dur
    return kept


def write_srt(cutlist, all_words, out_srt):
    """
    Build SRT captions aligned to the output (post-cut) timeline.
    Words are grouped into caption lines (~7 words, or on punctuation, or on gap >0.6s).
    """
    MAX_WORDS_PER_LINE = 7
    GAP_BREAK = 0.6  # seconds

    kept = _kept_words(cutlist, all_words)

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
            # Strip interior CR/LF so a transcribed word can't forge a second SRT
            # cue (the ASS path already neutralizes newlines via _ass_escape).
            text = " ".join(w["word"].replace("\n", " ").replace("\r", " ").strip()
                            for w in current_words).strip()
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


# ── R9b: burned-in animated captions (ASS karaoke) ───────────────────────────

# Highlight colors in ASS &HBBGGRR& (opaque). Friendly name -> ASS value.
CAPTION_COLORS = {
    "yellow": "&H0000FFFF",
    "green":  "&H0000FF00",
    "cyan":   "&H00FFFF00",
    "red":    "&H000000FF",
    "white":  "&H00FFFFFF",
}
BASE_COLOR = "&H00FFFFFF"  # inactive words: white

# Friendly font key -> (ASS family name, bundled .ttf filename or None for a
# system font). Bundled fonts live in ./fonts and are copied next to the .ass
# at burn time so libass finds them without OS install.
_HERE = os.path.dirname(os.path.abspath(__file__))
FONTS_DIR = os.path.join(_HERE, "fonts")
CAPTION_FONTS = {
    "Arial Black": ("Arial Black", None),
    "Impact":      ("Impact", None),
    "Anton":       ("Anton", "Anton-Regular.ttf"),
    "Bebas Neue":  ("Bebas Neue", "BebasNeue-Regular.ttf"),
    "Montserrat":  ("Montserrat", "Montserrat-Variable.ttf"),
}
CAPTION_STYLES = ("clean", "pop", "highlight", "oneword")

# ── camera-zoom palette / constants ──────────────────────────────────────────
ZOOM_BIAS = 0.40   # vertical centre of the zoom window (faces sit upper-centre in portrait)
DEFAULT_ZOOM_LEVEL = {"in": 1.12, "push": 1.16, "pullout": 1.16, "snap": 1.22, "none": 1.0}
ZOOM_TYPES = ("none", "in", "push", "pullout", "snap")


def _font_file_path(font_key):
    """Path to a .ttf for measuring text widths (bundled or system font)."""
    fam, bundled = CAPTION_FONTS.get(font_key, ("Arial Black", None))
    if bundled:
        p = os.path.join(FONTS_DIR, bundled)
        return p if os.path.exists(p) else None
    sysmap = {"Arial Black": "ariblk.ttf", "Impact": "impact.ttf"}
    fn = sysmap.get(font_key)
    if fn:
        win = os.environ.get("WINDIR", r"C:\Windows")
        p = os.path.join(win, "Fonts", fn)
        return p if os.path.exists(p) else None
    return None


def _text_metrics(tokens, font_file, fontsize):
    """
    Return (list of per-token pixel widths, space pixel width) at `fontsize`.
    Uses fontTools advance widths when available; otherwise estimates. Either way
    the caller lays words at FIXED positions, so the worst case is slightly uneven
    spacing — never reflow.
    """
    try:
        if not font_file:
            raise RuntimeError("no font file")
        from fontTools.ttLib import TTFont
        f = TTFont(font_file, fontNumber=0, lazy=True)
        upm = f["head"].unitsPerEm or 1000
        cmap = f.getBestCmap()
        hmtx = f["hmtx"]

        def adv(ch):
            g = cmap.get(ord(ch)) or cmap.get(ord("x"))
            try:
                a = hmtx[g][0]
            except Exception:
                a = upm * 0.5
            return a / upm * fontsize

        widths = [sum(adv(c) for c in t) for t in tokens]
        sw = adv(" ") or fontsize * 0.3
        f.close()
        return widths, sw
    except Exception:
        return [max(1, len(t)) * fontsize * 0.5 for t in tokens], fontsize * 0.35


def _ass_ts(seconds):
    """Seconds -> ASS timestamp H:MM:SS.cs (centiseconds)."""
    cs = int(round(max(0.0, seconds) * 100))
    h = cs // 360000
    m = (cs % 360000) // 6000
    s = (cs % 6000) // 100
    c = cs % 100
    return f"{h:d}:{m:02d}:{s:02d}.{c:02d}"


def _ass_escape(text):
    """Make a word safe inside an ASS dialogue field, and tidy stray commas.

    Strips surrounding whitespace and leading/trailing commas (Whisper often
    attaches a comma to the next word, giving an ugly ',word' at a line start).
    Sentence-ending . ? ! are kept.
    """
    t = (text.replace("\\", "")  # drop stray backslashes (would start an override)
             .replace("{", "(").replace("}", ")")
             .replace("\n", " ").strip())
    return t.strip(",").strip()


def _group_caption_lines(kept, max_words=4, gap_break=0.6):
    """Group kept words into short caption lines (portrait-friendly)."""
    lines, cur = [], []
    for w in kept:
        if cur:
            prev = cur[-1]
            if (len(cur) >= max_words
                    or (w["new_start"] - prev["new_end"]) > gap_break
                    or re.search(r"[.?!,]$", prev["word"].strip())):
                lines.append(cur)
                cur = []
        cur.append(w)
    if cur:
        lines.append(cur)
    return lines


def write_ass(cutlist, all_words, out_w, out_h, ass_path,
              font="Anton", highlight="&H0000FFFF", pos="lower", style="pop",
              font_file=None, titles=None, captions=True):
    """
    Write an ASS subtitle file sized to the OUTPUT video dimensions
    (out_w x out_h — the upright rough cut). Styles:
      highlight — active word changes color, the line stays on screen
      pop       — like highlight + active word bounces in (scale 125->100)
      oneword   — one big screen-centered word at a time (Hormozi style)
    `font` is the ASS family name. Returns the number of dialogue events.
    Styles:
      clean     — minimal static phrase captions: white, soft shadow, NO outline,
                  3-6 word phrases, no animation (the default; matches pro reels)
      highlight — active word changes color, the line stays on screen
      pop       — like highlight + active word bounces in (scale 125->100)
      oneword   — one big screen-centered word at a time (Hormozi style)
    """
    kept = _kept_words(cutlist, all_words)
    if not kept and not titles:
        # No caption words AND no title cards -> nothing to write. (A word-less
        # clip with titles requested must still emit the title events below.)
        return 0

    out_w = int(out_w) if out_w and out_w > 0 else 1080
    out_h = int(out_h) if out_h and out_h > 0 else 1920

    if style == "oneword":
        fontsize = max(40, round(out_h * 0.075))
        align, margin_v = 5, 0             # big, screen-centered
        margin_lr = round(out_w * 0.05)
    else:
        fontsize = max(24, round(out_h * 0.052))
        margin_lr = round(out_w * 0.07)
        if pos == "center":
            align, margin_v = 5, 0
        else:                              # lower third
            align, margin_v = 2, round(out_h * 0.16)
    if style == "clean":
        # clean: no hard outline, a soft drop shadow only (the reels' look)
        outline = 0
        shadow = max(3, round(fontsize * 0.06))
    else:
        outline = max(2, round(fontsize * 0.07))
        shadow = max(0, round(fontsize * 0.03))

    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        "WrapStyle: 0\n"
        "ScaledBorderAndShadow: yes\n"
        f"PlayResX: {out_w}\n"
        f"PlayResY: {out_h}\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, "
        "ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, "
        "MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Default,{font},{fontsize},{BASE_COLOR},&H000000FF,&H00000000,"
        f"&H64000000,-1,0,0,0,100,100,0,0,1,{outline},{shadow},{align},"
        f"{margin_lr},{margin_lr},{margin_v},1\n"
        # Editorial title layer: big condensed yellow + thick black outline, top.
        f"Style: Title,Anton,{round(out_h*0.072)},&H0000FFFF&,&H000000FF,&H00000000,"
        f"&H00000000,-1,0,0,0,100,100,0,0,1,{max(4,round(out_h*0.072*0.10))},2,8,"
        f"{round(out_w*0.06)},{round(out_w*0.06)},{round(out_h*0.10)},1\n\n"
        "[Events]\n"
        # MarginV MUST be here: each Dialogue has 10 fields. Omitting it makes
        # libass parse Text one field early and prepend a stray ',' to every line.
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, "
        "Effect, Text\n"
    )

    # oneword: quick pop-in that settles to base size (single word, no neighbors
    # to push around, so settling looks like a clean "appear")
    POP_IN = "\\fscx120\\fscy120\\t(0,150,\\fscx100\\fscy100)"
    # pop style: grow over 120ms and HOLD enlarged for the word's whole active
    # span — it only returns to normal once the NEXT word takes over.
    POP_HOLD = "\\fscx100\\fscy100\\t(0,120,\\fscx122\\fscy122)"

    dialogues = []
    src = kept if captions else []   # captions=False -> titles-only ASS
    if style == "clean":
        # Minimal static phrase captions: white, soft shadow, no per-word
        # animation, no highlight. One event per ~5-6 word phrase, held for its
        # span. Matches the reference reels' body-caption look.
        for line in _group_caption_lines(src, max_words=6):
            text = " ".join(_ass_escape(w["word"]) for w in line).strip()
            if not text:
                continue
            st, en = line[0]["new_start"], line[-1]["new_end"]
            if en <= st:
                en = st + 0.05
            dialogues.append(
                f"Dialogue: 0,{_ass_ts(st)},{_ass_ts(en)},Default,,0,0,0,,{text}")

    elif style == "oneword":
        for i, w in enumerate(src):
            start = w["new_start"]
            end = src[i + 1]["new_start"] if i + 1 < len(src) else w["new_end"]
            if end <= start:
                end = start + 0.05
            tok = _ass_escape(w["word"])
            if not tok:
                continue
            text = f"{{\\c{highlight}{POP_IN}}}{tok}"
            dialogues.append(
                f"Dialogue: 0,{_ass_ts(start)},{_ass_ts(end)},Default,,0,0,0,,{text}")

    elif style == "pop":
        # STATIONARY layout: each word gets a fixed \pos and the active word
        # scales about its own centre (\an5) so it grows in place WITHOUT pushing
        # its neighbours. Base layer = the whole line at rest (white); overlay
        # layer = the active word, enlarged + coloured, drawn on top.
        y = round(out_h * 0.50) if pos == "center" else round(out_h * 0.82)
        mlr = round(out_w * 0.06)
        max_w = max(1, out_w - 2 * mlr)
        for line in _group_caption_lines(src):
            toks = [_ass_escape(w["word"]) for w in line]
            widths, sw = _text_metrics(toks, font_file, fontsize)
            total = sum(widths) + sw * (len(toks) - 1)
            # If the line is too wide, shrink the FONT (not just the gaps) so the
            # glyphs and the spacing scale together — squeezing only the positions
            # made wide lines (e.g. a long word like "productivity") overlap.
            ls = min(1.0, max_w / total) if total > 0 else 1.0
            fs = max(8, int(round(fontsize * ls)))
            widths = [w * ls for w in widths]
            sw = sw * ls
            line_w = sum(widths) + sw * (len(toks) - 1)
            cur = (out_w - line_w) / 2.0
            centers = []
            for wd in widths:
                centers.append(cur + wd / 2.0)
                cur += wd + sw
            line_start, line_end = line[0]["new_start"], line[-1]["new_end"]
            for j, tok in enumerate(toks):
                if not tok:
                    continue
                cx = f"{centers[j]:.0f}"
                # base (rest) — whole line, white, fit font size
                dialogues.append(
                    f"Dialogue: 0,{_ass_ts(line_start)},{_ass_ts(line_end)},Default,,0,0,0,,"
                    f"{{\\an5\\pos({cx},{y})\\fs{fs}\\c{BASE_COLOR}}}{tok}")
                # active overlay — this word's span, coloured + popped, on top
                st = line[j]["new_start"]
                en = line[j + 1]["new_start"] if j + 1 < len(line) else line[j]["new_end"]
                if en <= st:
                    en = st + 0.05
                dialogues.append(
                    f"Dialogue: 1,{_ass_ts(st)},{_ass_ts(en)},Default,,0,0,0,,"
                    f"{{\\an5\\pos({cx},{y})\\fs{fs}{POP_HOLD}\\c{highlight}}}{tok}")

    else:  # highlight — colour change only (no size change, so no reflow)
        for line in _group_caption_lines(src):
            n = len(line)
            for i in range(n):
                start = line[i]["new_start"]
                end = line[i + 1]["new_start"] if i + 1 < n else line[i]["new_end"]
                if end <= start:
                    end = start + 0.05
                parts = []
                for j, ww in enumerate(line):
                    tok = _ass_escape(ww["word"])
                    if not tok:
                        continue
                    if j == i:
                        parts.append(f"{{\\c{highlight}}}{tok}{{\\c{BASE_COLOR}}}")
                    else:
                        parts.append(tok)
                dialogues.append(
                    f"Dialogue: 0,{_ass_ts(start)},{_ass_ts(end)},Default,,0,0,0,,{' '.join(parts)}")

    # Editorial title cards (big yellow hook/section text, top of frame).
    for t in (titles or []):
        txt = _ass_escape(str(t.get("text", ""))).upper()
        if not txt:
            continue
        st = float(t.get("start", 0.0))
        en = float(t.get("end", st + 1.5))
        if en <= st:
            en = st + 0.5
        dialogues.append(
            f"Dialogue: 0,{_ass_ts(st)},{_ass_ts(en)},Title,,0,0,0,,{{\\fad(120,120)}}{txt}")

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(header)
        f.write("\n".join(dialogues) + "\n")

    return len(dialogues)


def burn_captions(in_mp4, ass_path, out_mp4, font_file=None):
    """
    Burn the ASS captions onto in_mp4 -> out_mp4 (re-encode video, copy audio).
    Runs ffmpeg with cwd = the ass file's dir and references everything by
    basename, so Windows drive-letter paths never hit the fragile -vf parser.
    All bundled fonts are copied next to the .ass and libass is pointed at the
    cwd via fontsdir= — so both the body font AND the Title style's font (Anton)
    resolve, regardless of which body font was chosen. (font_file kept for
    backwards-compat; ignored — we copy the whole bundled set.)
    """
    ff = ff_exe()
    workdir = os.path.dirname(os.path.abspath(ass_path))
    ass_name = os.path.basename(ass_path)
    vf = f"ass={ass_name}"
    try:
        copied = False
        if os.path.isdir(FONTS_DIR):
            for fn in os.listdir(FONTS_DIR):
                if fn.lower().endswith((".ttf", ".otf")):
                    shutil.copy(os.path.join(FONTS_DIR, fn), os.path.join(workdir, fn))
                    copied = True
        if copied:
            vf = f"ass={ass_name}:fontsdir=."
    except Exception:
        pass  # fall back to system font lookup
    # Insurance: re-stamp source colour so the captioned output can't read as
    # washed-out SDR if the filter chain ever drops HLG/HDR tags.
    try:
        vf += _setparams_suffix(probe(os.path.abspath(in_mp4)).get("color"))
    except Exception:
        pass
    cmd = [
        ff, "-y",
        "-i", os.path.abspath(in_mp4),
        "-vf", vf,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        os.path.abspath(out_mp4),
    ]
    r = run(cmd, timeout=900, cwd=workdir)
    if not (os.path.exists(out_mp4) and os.path.getsize(out_mp4) > 0):
        raise RuntimeError(
            f"Caption burn-in failed — output missing or empty.\n"
            f"ffmpeg stderr: {r.stderr[-600:]}"
        )


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
    ap.add_argument("--burn-captions", action="store_true",
                    help="Also output roughcut_captioned.mp4 with word-by-word "
                         "animated captions burned in (not editable afterward)")
    ap.add_argument("--caption-style", choices=CAPTION_STYLES, default="clean",
                    help="Caption style: clean | pop | highlight | oneword (default: clean)")
    ap.add_argument("--caption-font", choices=sorted(CAPTION_FONTS), default="Montserrat",
                    help="Font for burned captions (default: Montserrat)")
    ap.add_argument("--caption-highlight", choices=sorted(CAPTION_COLORS), default="yellow",
                    help="Active-word highlight color (default: yellow)")
    ap.add_argument("--caption-pos", choices=["lower", "center"], default="lower",
                    help="Burned caption position for pop/highlight (default: lower third)")
    ap.add_argument("--titles", action="store_true",
                    help="Editorial title cards (big yellow hook/section text, Claude-decided)")
    ap.add_argument("--zoom", action="store_true",
                    help="Auto camera zooms (Claude-decided)")
    ap.add_argument("--zoom-mode", choices=["static", "animated"], default="static",
                    help="static = punch-in framing jumps (matches reels); animated = push/pull motion")
    ap.add_argument("--broll", action="store_true",
                    help="Auto B-roll: stacked/cutaway stock images+clips (Claude-decided, Pexels/Pixabay)")
    ap.add_argument("--broll-density", choices=["tasteful", "more", "less"], default="tasteful",
                    help="How often B-roll appears (default: tasteful, ~one every 4-5s)")
    ap.add_argument("--broll-style", choices=["auto", "stacked", "cutaway"], default="auto",
                    help="auto = per-item Claude choice; stacked/cutaway = force every overlay")
    ap.add_argument("--vignette", action="store_true",
                    help="Effect: subtle darkened edges")
    ap.add_argument("--grain", action="store_true",
                    help="Effect: light film grain texture")
    ap.add_argument("--flash", action="store_true",
                    help="Effect: quick white flash on cuts (gated >=1.5s apart)")
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
        cutlist = snap_and_clean(keep_spans, all_words, spec["duration"],
                                 fps=spec.get("fps"))
        orig_kept = sum(e - s for s, e in cutlist)
        print(f"  {len(cutlist)} segments after snap/clean")
        print(f"  Original duration : {spec['duration']:.2f}s")
        print(f"  Kept duration     : {orig_kept:.2f}s  ({100*orig_kept/max(spec['duration'],0.001):.1f}%)")

        # ── Stage 6b: zoom decisions (optional) ───────────────────────────────
        zoomplan = None
        if args.zoom:
            section("6b/7  ZOOM DECISIONS")
            zoomplan = decide_zooms_with_claude(cutlist, all_words, model=args.model, mode=args.zoom_mode)
            from collections import Counter
            print("  " + ", ".join(f"{k}:{v}" for k, v in Counter(z["type"] for z in zoomplan).items()))

        # ── Stage 6c: B-roll plan + asset fetch (optional) ────────────────────
        overlay_plan = []
        if args.broll:
            section("6c/7  B-ROLL")
            overlay_plan = resolve_overlays(cutlist, all_words, model=args.model,
                                            density=args.broll_density, style=args.broll_style)
            print(f"  {len(overlay_plan)} overlay(s) resolved" +
                  ("" if overlay_plan
                   else " — none (no API key or no matches); continuing without B-roll"))

        # ── Stage 7: render (cut+zoom -> base), overlays+effects -> roughcut ───
        # NOTE: brain returns short ALL-CAPS labels per overlay; label-bar
        # rendering is NOT implemented yet (Phase 4) — labels are unused for now.
        section("7a/7  RENDER")
        effects = {"vignette": args.vignette, "grain": args.grain, "flash": args.flash}
        import overlays as _ov   # lazy: overlays imports autoedit at top (circular if top-level)
        if overlay_plan:
            print("  compositing B-roll + effects ...")
        elif any(effects.values()):
            print("  effects: " + ", ".join(k for k, v in effects.items() if v))
        _ov.build_roughcut(input_path, cutlist, spec, out_mp4, tmpdir,
                           zoomplan=zoomplan, effects=effects, overlay_plan=overlay_plan)

        # ── Stage 7b: captions ────────────────────────────────────────────────
        section("7b/7  CAPTIONS")
        write_srt(cutlist, all_words, out_srt)

        # ── Stage 7c: burn-in captions and/or editorial titles (optional) ─────
        out_cap = None
        if args.burn_captions or args.titles:
            section("7c/7  BURN CAPTIONS / TITLES")
            titles = []
            if args.titles:
                titles = decide_titles_with_claude(cutlist, all_words, model=args.model)
                print(f"  {len(titles)} title card(s)")
            cap_spec = probe(out_mp4)  # true upright dims of the rendered cut
            ass_path = os.path.join(tmpdir, "captions.ass")
            fam, bundled = CAPTION_FONTS.get(args.caption_font, ("Arial Black", None))
            n_ass = write_ass(
                cutlist, all_words, cap_spec["width"], cap_spec["height"], ass_path,
                font=fam,
                highlight=CAPTION_COLORS[args.caption_highlight],
                pos=args.caption_pos,
                style=args.caption_style,
                font_file=_font_file_path(args.caption_font),
                titles=titles,
                captions=args.burn_captions,
            )
            if n_ass == 0:
                print("  (nothing to burn — skipped)")
            else:
                out_cap = os.path.join(outdir, "roughcut_captioned.mp4")
                print(f"  captions={args.burn_captions} titles={len(titles)} "
                      f"style={args.caption_style} — {n_ass} events, burning ...")
                burn_captions(out_mp4, ass_path, out_cap)
                print(f"  captioned video: {out_cap} "
                      f"({os.path.getsize(out_cap)//1024} KiB)")

        # ── Done ──────────────────────────────────────────────────────────────
        section("DONE")
        print(f"  Rough cut   : {out_mp4}")
        if out_cap:
            print(f"  Captioned   : {out_cap}")
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
