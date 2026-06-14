#!/usr/bin/env python3
"""
test_plumbing.py — self-contained plumbing tests for autoedit.py.

Tests probe() and render_video() + write_srt() WITHOUT real speech or Claude.
Uses a synthetic 6s test clip generated with ffmpeg lavfi.
"""
import sys, os, re, tempfile, shutil

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ── locate autoedit.py ───────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

try:
    from autoedit import probe, render_video, write_srt, write_ass, ff_exe, run
except ImportError as e:
    print(f"FATAL: cannot import autoedit: {e}")
    sys.exit(1)

PASS = 0
FAIL = 0

def check(label, cond, detail=""):
    global PASS, FAIL
    status = "PASS" if cond else "FAIL"
    if cond:
        PASS += 1
    else:
        FAIL += 1
    suffix = f"  [{detail}]" if detail else ""
    print(f"  [{status}] {label}{suffix}")


def main():
    global PASS, FAIL

    print("=" * 60)
    print("autoedit plumbing test")
    print("=" * 60)

    # ── 0. ffmpeg available ──────────────────────────────────────────────────
    ff = ff_exe()
    check("ffmpeg found", ff is not None, ff or "NOT FOUND")
    if not ff:
        print("Cannot continue without ffmpeg.")
        sys.exit(1)

    # ── 1. Generate synthetic 6s test clip ───────────────────────────────────
    print("\n[1] Generate synthetic test clip")
    tmpdir = tempfile.mkdtemp(prefix="autoedit_test_")
    clip_path = os.path.join(tmpdir, "test_clip.mp4")

    r = run([
        ff, "-y",
        "-f", "lavfi", "-i", "testsrc=duration=6:size=320x240:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
        "-shortest",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000",
        clip_path,
    ], timeout=60)

    check("test clip created", os.path.exists(clip_path) and os.path.getsize(clip_path) > 0,
          f"{os.path.getsize(clip_path)//1024 if os.path.exists(clip_path) else 0} KiB")

    if not os.path.exists(clip_path):
        print(f"  ffmpeg stderr: {r.stderr[-400:]}")
        shutil.rmtree(tmpdir, ignore_errors=True)
        sys.exit(1)

    # ── 2. probe() ───────────────────────────────────────────────────────────
    print("\n[2] probe()")
    info = probe(clip_path)
    print(f"  duration={info['duration']:.2f}s  {info['width']}x{info['height']}  {info['fps']:.2f}fps")

    check("duration ≈ 6s",     5.0 <= info["duration"] <= 7.0,   f"{info['duration']:.2f}s")
    check("width parsed",      info["width"] > 0,                 str(info["width"]))
    check("height parsed",     info["height"] > 0,                str(info["height"]))
    check("fps parsed",        info["fps"] > 0,                   str(info["fps"]))

    # ── 3. render_video() with fake cutlist ──────────────────────────────────
    print("\n[3] render_video() with hard-coded cutlist")
    outdir = os.path.join(HERE, "out")
    os.makedirs(outdir, exist_ok=True)
    out_mp4 = os.path.join(outdir, "roughcut.mp4")

    # Remove any previous roughcut.mp4
    if os.path.exists(out_mp4):
        os.remove(out_mp4)

    fake_cutlist = [(0.5, 2.0), (3.0, 5.0)]
    spec = {"width": 320, "height": 240, "fps": 30.0}

    render_tmpdir = os.path.join(tmpdir, "render")
    os.makedirs(render_tmpdir, exist_ok=True)

    try:
        render_video(clip_path, fake_cutlist, spec, out_mp4, render_tmpdir)
        check("roughcut.mp4 exists",    os.path.exists(out_mp4))
        check("roughcut.mp4 non-empty", os.path.exists(out_mp4) and os.path.getsize(out_mp4) > 0,
              f"{os.path.getsize(out_mp4)//1024 if os.path.exists(out_mp4) else 0} KiB")
    except Exception as e:
        check("roughcut.mp4 produced", False, str(e))

    # ── 4. write_srt() with hand-made words ──────────────────────────────────
    print("\n[4] write_srt() with hand-made word list")
    out_srt = os.path.join(outdir, "captions.srt")

    # Hand-crafted words spanning the two fake keep spans
    fake_words = [
        {"start": 0.6,  "end": 0.9,  "word": "Hello"},
        {"start": 1.0,  "end": 1.3,  "word": "world"},
        {"start": 1.4,  "end": 1.9,  "word": "this"},
        {"start": 3.1,  "end": 3.5,  "word": "is"},
        {"start": 3.6,  "end": 4.0,  "word": "a"},
        {"start": 4.1,  "end": 4.6,  "word": "test."},
        {"start": 4.7,  "end": 5.0,  "word": "Done."},
    ]

    try:
        write_srt(fake_cutlist, fake_words, out_srt)
        check("captions.srt exists",    os.path.exists(out_srt))
        check("captions.srt non-empty", os.path.exists(out_srt) and os.path.getsize(out_srt) > 0)
    except Exception as e:
        check("captions.srt produced", False, str(e))

    # Validate SRT format: must contain at least one index + timestamp line
    srt_valid = False
    if os.path.exists(out_srt):
        content = open(out_srt, encoding="utf-8").read()
        # SRT timestamp line: 00:00:00,000 --> 00:00:00,000
        srt_valid = bool(re.search(r"\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}", content))
        if srt_valid:
            print(f"  SRT content preview:\n    " +
                  "\n    ".join(content.strip().splitlines()[:8]))
    check("SRT format well-formed (has timestamp lines)", srt_valid)

    # ── 5. write_ass(): Events Format must have MarginV (10 fields) ───────────
    # Regression guard: a missing MarginV makes libass prepend a stray ',' to
    # every burned caption line.
    print("\n[5] write_ass() Events Format + clean text")
    ass_path = os.path.join(tmpdir, "t.ass") if os.path.isdir(tmpdir) else os.path.join(HERE, "t.ass")
    os.makedirs(os.path.dirname(ass_path), exist_ok=True)
    n = write_ass(fake_cutlist, fake_words, 1080, 1920, ass_path, style="pop")
    ass = open(ass_path, encoding="utf-8").read() if os.path.exists(ass_path) else ""
    fmt = next((l for l in ass.splitlines() if l.startswith("Format:") and "Start" in l
                and "Text" in l and "MarginR" in l), "")
    check("write_ass produced events", n > 0, f"{n} events")
    check("Events Format includes MarginV", "MarginV" in fmt, fmt[:60])
    # Every Dialogue's text field must not begin with a comma
    bad = [l for l in ass.splitlines() if l.startswith("Dialogue:")
           and l.split(",", 9)[-1].lstrip().startswith(",")]
    check("no Dialogue text starts with ','", len(bad) == 0, f"{len(bad)} bad")

    # ── cleanup ──────────────────────────────────────────────────────────────
    shutil.rmtree(tmpdir, ignore_errors=True)

    # ── summary ──────────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    total = PASS + FAIL
    print(f"RESULT: {PASS}/{total} checks passed  |  {'ALL PASS' if FAIL == 0 else f'{FAIL} FAILED'}")
    print("=" * 60)
    sys.exit(0 if FAIL == 0 else 1)


if __name__ == "__main__":
    main()
