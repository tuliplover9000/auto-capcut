#!/usr/bin/env python3
"""
test_overlays_proto.py — Phase-0 GATE test for the B-roll compositor.

Self-contained: generates an HLG-tagged 1080x1920 "presenter" clip, two still
PNGs, and a short B-roll video, then composites a STILL+STACKED and a
VIDEO+CUTAWAY overlay onto the base in ONE pass via overlays.composite().

Asserts: output exists & non-empty; duration ≈ base; dims == 1080x1920;
HLG color tags (bt2020 + arib-std-b67) preserved; faststart (moov before mdat).
Extracts review frames at t=3.5 and t=6.5 to out/.
"""
import sys, os, re, tempfile, shutil

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from autoedit import ff_exe, run, probe
import overlays

PASS = 0
FAIL = 0


def check(label, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
    else:
        FAIL += 1
    suffix = f"  [{detail}]" if detail else ""
    print(f"  [{'PASS' if cond else 'FAIL'}] {label}{suffix}")


def main():
    print("=" * 60)
    print("overlays.py Phase-0 proto gate")
    print("=" * 60)

    ff = ff_exe()
    check("ffmpeg found", ff is not None, ff or "NOT FOUND")
    if not ff:
        sys.exit(1)

    tmpdir = tempfile.mkdtemp(prefix="ovproto_")
    outdir = os.path.join(HERE, "out")
    os.makedirs(outdir, exist_ok=True)

    # ── 1. HLG-tagged 1080x1920 8s presenter clip ─────────────────────────────
    print("\n[1] Generate HLG presenter clip + B-roll assets")
    presenter = os.path.join(tmpdir, "presenter.mp4")
    # color bg + red box at ~0.30H + green box lower + a tone, then HLG-tag it.
    vf = ("drawbox=x=340:y=576:w=400:h=300:color=red@1.0:t=fill,"
          "drawbox=x=340:y=1300:w=400:h=300:color=green@1.0:t=fill,"
          "setparams=color_primaries=bt2020:color_trc=arib-std-b67:"
          "colorspace=bt2020nc:range=tv")
    r = run([
        ff, "-y",
        "-f", "lavfi", "-i", "color=c=0x202840:s=1080x1920:d=8:r=30",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
        "-shortest", "-vf", vf,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000",
        presenter,
    ], timeout=120)
    check("presenter clip created",
          os.path.exists(presenter) and os.path.getsize(presenter) > 0,
          f"{os.path.getsize(presenter)//1024 if os.path.exists(presenter) else 0} KiB")
    if not os.path.exists(presenter):
        print(f"  ffmpeg stderr: {r.stderr[-500:]}")
        shutil.rmtree(tmpdir, ignore_errors=True)
        sys.exit(1)

    # Two still PNGs
    still1 = os.path.join(tmpdir, "still1.png")
    still2 = os.path.join(tmpdir, "still2.png")
    run([ff, "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=1:d=1",
         "-frames:v", "1", still1], timeout=60)
    run([ff, "-y", "-f", "lavfi", "-i", "rgbtestsrc=size=1280x720:rate=1:d=1",
         "-frames:v", "1", still2], timeout=60)
    check("still PNGs created",
          os.path.exists(still1) and os.path.exists(still2))

    # One 3s B-roll video
    broll = os.path.join(tmpdir, "broll.mp4")
    run([ff, "-y", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:d=3",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", broll], timeout=120)
    check("b-roll video created",
          os.path.exists(broll) and os.path.getsize(broll) > 0)

    # ── 2. composite ──────────────────────────────────────────────────────────
    print("\n[2] overlays.composite()")
    base_spec = probe(presenter)
    base_dur = base_spec["duration"]
    out_mp4 = os.path.join(outdir, "overlay_proto.mp4")
    if os.path.exists(out_mp4):
        os.remove(out_mp4)

    ov_list = [
        {"path": still1, "start": 2.5, "end": 4.5, "format": "stacked"},
        {"path": broll,  "start": 5.5, "end": 7.5, "format": "cutaway"},
    ]
    try:
        overlays.composite(presenter, out_mp4, ov_list, base_spec,
                           effects={"vignette": True, "grain": True})
        composited = True
    except Exception as e:
        composited = False
        print(f"  composite raised: {e}")
    check("composite() returned without error", composited)

    check("output exists & non-empty",
          os.path.exists(out_mp4) and os.path.getsize(out_mp4) > 0,
          f"{os.path.getsize(out_mp4)//1024 if os.path.exists(out_mp4) else 0} KiB")
    if not (os.path.exists(out_mp4) and os.path.getsize(out_mp4) > 0):
        shutil.rmtree(tmpdir, ignore_errors=True)
        _summary()

    # ── 3. probe the output ───────────────────────────────────────────────────
    print("\n[3] Verify output properties")
    info = probe(out_mp4)
    print(f"  duration={info['duration']:.2f}s (base {base_dur:.2f}s)  "
          f"{info['width']}x{info['height']}  {info['fps']:.2f}fps")
    check("duration ≈ presenter duration (±0.3s)",
          abs(info["duration"] - base_dur) <= 0.3,
          f"{info['duration']:.2f}s vs {base_dur:.2f}s")
    check("dims == 1080x1920",
          info["width"] == 1080 and info["height"] == 1920,
          f"{info['width']}x{info['height']}")

    # ── 4. color tags preserved (grep ffmpeg -i stderr) ───────────────────────
    rc = run([ff, "-i", out_mp4], timeout=30)
    vline = next((ln for ln in rc.stderr.splitlines() if "Video:" in ln), "")
    print(f"  Video line: {vline.strip()[:140]}")
    check("HLG color tag bt2020 present", "bt2020" in vline.lower(), vline.strip()[:90])
    check("HLG color tag arib-std-b67 present",
          "arib-std-b67" in vline.lower(), vline.strip()[:90])

    # ── 5. faststart (moov before mdat) ───────────────────────────────────────
    with open(out_mp4, "rb") as f:
        head = f.read(4 * 1024 * 1024)
    moov = head.find(b"moov")
    mdat = head.find(b"mdat")
    print(f"  moov offset={moov}  mdat offset={mdat}")
    check("faststart: moov before mdat",
          moov != -1 and (mdat == -1 or moov < mdat),
          f"moov@{moov} mdat@{mdat}")

    # ── 6. review frames ──────────────────────────────────────────────────────
    print("\n[6] Extract review frames")
    for t in (3.5, 6.5):
        fp = os.path.join(outdir, f"overlay_proto_t{t}.png")
        run([ff, "-y", "-ss", f"{t}", "-i", out_mp4, "-frames:v", "1", fp], timeout=60)
        check(f"review frame t={t}s extracted",
              os.path.exists(fp) and os.path.getsize(fp) > 0, fp)

    shutil.rmtree(tmpdir, ignore_errors=True)
    _summary()


def _summary():
    print()
    print("=" * 60)
    total = PASS + FAIL
    print(f"RESULT: {PASS}/{total} checks passed  |  "
          f"{'ALL PASS' if FAIL == 0 else f'{FAIL} FAILED'}")
    print("=" * 60)
    sys.exit(0 if FAIL == 0 else 1)


if __name__ == "__main__":
    main()
