"""rulecheck.py: machine-check the RULEBOOK.md rules marked with a robot emoji.

Usage:
  python scripts/rulecheck.py <episode-id> [video.mp4] [--answer SEC] [--lead SEC]

  <episode-id>  name of episodes/<id>.json; also reads episodes/<id>.timing.json
  video.mp4     optional final render; enables the loudness, true-peak, luma and payoff-% checks
  --answer SEC  time the core answer lands (for S5; omit to skip)
  --lead SEC    when the first line's audio starts in the video (default 0.3, the flow-narration lead)

Exit code 1 if any MUST rule fails. Rule ids match RULEBOOK.md.
"""
import json, re, subprocess, sys, os
import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BANNED = re.compile(r"\b(learn|learning|how to|today we|let's learn)\b", re.I)
TASK = re.compile(r"\b(find|spot|catch|pick|who|which|guess|solve|can you|figure|try)\b", re.I)


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def words_in(s):
    return re.findall(r"[A-Za-z0-9']+", s)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(2)
    opt = {}
    pos = []
    i = 0
    while i < len(args):
        if args[i] in ("--answer", "--lead"):
            opt[args[i][2:]] = float(args[i + 1]); i += 2
        else:
            pos.append(args[i]); i += 1
    ep_id = pos[0]
    video = pos[1] if len(pos) > 1 else None
    lead = opt.get("lead", 0.3)

    ep = json.load(open(os.path.join(ROOT, "episodes", f"{ep_id}.json"), encoding="utf-8"))
    tim = json.load(open(os.path.join(ROOT, "episodes", f"{ep_id}.timing.json"), encoding="utf-8"))
    lines = ep["lines"]
    tl = tim["lines"]
    rows = []  # (rule, must, ok, detail)

    # A1: line-level wpm = sum(words) / sum(line duration)
    nw = sum(len(words_in(l["text"])) for l in lines)
    dur = sum(t["duration"] for t in tl)
    span = sum((t["words"][-1]["end"] - t["words"][0]["start"]) for t in tl if t.get("words"))
    wpm = nw / dur * 60 if dur else 0
    wpm_span = nw / span * 60 if span else 0
    story = any(k in ep_id for k in ("story", "wojtek", "turkey", "bear"))
    cap = 220 if story else 200
    rows.append(("A1 voice <= %d wpm (line-level)" % cap, True, wpm <= cap,
                 f"{wpm:.0f} wpm line-level · {wpm_span:.0f} word-span (info) · {nw} words"))

    # H2: first sentence <= 10 words, ends by 3.0 s, no 'learn'
    first = lines[0]["text"]
    sent = re.split(r"(?<=[.!?])\s+", first.strip())[0]
    n1 = len(words_in(sent))
    # walk timing tokens until we've consumed n1 words
    t_end = None
    got = 0
    for w in tl[0].get("words", []):
        got += len(words_in(w["text"])) or 1
        if got >= n1:
            t_end = lead + w["end"]; break
    rows.append(("H2 first sentence <= 13 words", True, n1 <= 13, f'{n1} words: "{sent}"'))
    rows.append(("H2 first sentence ends <= 3.6 s", True, t_end is not None and t_end <= 3.6,
                 f"ends at {t_end:.2f} s" if t_end is not None else "no word timing"))
    rows.append(("H2 no 'learn / how to' in sentence 1", True, not BANNED.search(sent), sent))

    # H3: task verb spoken by 3.6 s (search line 0 and 1)
    t_task = None
    offset = lead
    for li, t in enumerate(tl[:2]):
        for w in t.get("words", []):
            if TASK.search(w["text"]):
                t_task = offset + w["start"]; break
        if t_task is not None:
            break
        offset += t["duration"] + (lines[li + 1].get("pauseBefore", 0) if li + 1 < len(lines) else 0)
    rows.append(("H3 task verb <= 5.5 s", True, t_task is not None and t_task <= 5.5,
                 f"at {t_task:.2f} s" if t_task is not None else "no task verb in lines 1-2"))

    if video:
        ff = ffmpeg()
        # A4 loudness / true peak
        p = subprocess.run([ff, "-hide_banner", "-nostats", "-i", video, "-af",
                            "loudnorm=I=-14:TP=-1:LRA=7:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True, errors="replace")
        m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
        if m:
            j = json.loads(m.group(0))
            I, TP = float(j["input_i"]), float(j["input_tp"])
            rows.append(("A4 loudness -14 +/-1 LUFS", True, abs(I + 14) <= 1, f"{I:.1f} LUFS"))
            rows.append(("A4 true peak <= -1 dBTP", True, TP <= -0.95, f"{TP:.1f} dBTP"))
        # duration
        d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", p.stderr)
        vdur = int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)) if d else None
        # V4 luma: 1 fps grey thumbnails
        raw = subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-i", video, "-vf",
                              "fps=1,scale=108:192,format=gray", "-f", "rawvideo", "-"],
                             capture_output=True).stdout
        fr = np.frombuffer(raw, np.uint8).reshape(-1, 192, 108) / 255.0
        if len(fr):
            rows.append(("V4 mean luma >= 0.45 (default)", False, fr.mean() >= 0.45, f"{fr.mean():.2f}"))
            rows.append(("V4 frame-0 luma >= 0.45 (default)", False, fr[0].mean() >= 0.45, f"{fr[0].mean():.2f}"))
        if "answer" in opt and vdur:
            pct = opt["answer"] / vdur
            tail = vdur - opt["answer"]
            rows.append(("S5 answer at 75-85% of runtime", True, 0.75 <= pct <= 0.85, f"{pct:.0%} of {vdur:.1f} s"))
            rows.append(("S5 <= 11 s after the answer", True, tail <= 11, f"{tail:.1f} s"))
        elif vdur:
            rows.append(("S5 payoff % (pass --answer SEC)", False, True, f"video {vdur:.1f} s; not checked"))

    fails = 0
    print(f"\nRULECHECK  {ep_id}" + (f"  ·  {os.path.basename(video)}" if video else ""))
    for rule, must, ok, det in rows:
        tag = "PASS" if ok else ("FAIL" if must else "warn")
        fails += (not ok) and must
        print(f"  {tag:4}  {rule:38} {det}")
    print(f"\n  {'OK: all automated MUST rules pass' if not fails else f'{fails} MUST rule(s) FAILED: fix before posting'}")
    print("  Still check by eye: F1-F4, H1, H4, H5, S1-S4, S6-S8, D1-D3, C5, V1-V3, A2, A3, P1-P5 (see the RULEBOOK checklist)\n")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
