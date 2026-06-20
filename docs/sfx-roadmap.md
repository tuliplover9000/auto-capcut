# Sound effects — build roadmap (deepbuild)

Add opt-in SFX: a **whoosh** on cuts and an **impact/riser** on emphasis moments,
mixed from a user folder `my_sfx/`, in a post-render audio pass. Purely additive —
the existing cut/render/audio/caption pipeline and A/V sync must not change.

## Edit scope (ONLY these)
- `autoedit.py`: ADD `MY_SFX_DIR` constant (near `MY_BROLL_DIR`, L23); ADD 3 new
  functions (`_sfx_file`, `decide_sfx_events`, `mix_sfx`); ADD `--sfx` CLI flag and
  call `mix_sfx` in `main()` after `build_roughcut` (before captions).
- `app.py`: ADD `"sfx"` to the `/run` settings dict; thread it through
  `_grade_to_roughcut`; ADD a "Sound effects" checkbox in the UI + send it in the JS.
- `my_sfx/README.md` + `.gitignore` entry (mirror the `my_broll/` pattern).

MUST NOT change: `render_video` (the cut+zoom+voice-audio render — its single-pass
audio and A/V-sync are sacred), `grade_video`/`composite` internals, `cut_offsets`,
`_kept_words`, `snap_and_clean`/`remove_dead_air`/`decide_cutlist`, captions, any
public signature other than the additions below. SFX is best-effort: an empty/absent
`my_sfx/` folder, a missing sound, or a mix failure must NEVER break a render — fall
back to passing the audio through unchanged.

## Verified current state
- `MY_BROLL_DIR` (autoedit L23) + `broll_library()` (L26-35) — mirror for `MY_SFX_DIR`.
- `cut_offsets(cutlist)` (L1477) → internal cut boundaries on the OUTPUT timeline
  (list of float seconds). USE for whoosh times. (`acc += e-s`, drops the last.)
- `_effects_filters` flash gating (L1497-1507) — the gating pattern to MIRROR:
  `times,last=[],-99.0; for t in boundaries: if t>0 and t-last>=1.5: times.append(t); last=t`.
- `_kept_words(cutlist, all_words)` (L1560) → `[{"new_start","new_end","word"}]` on the
  OUTPUT timeline. USE for emphasis keyword/phrase times.
- `overlay_plan` items (from `resolve_overlays`): `{"path","start","end","format",...}`
  with OUTPUT-timeline `start`/`end`, CONTIGUOUS within a B-roll sequence (next.start ==
  prev.end). A sequence START = first item OR any item with `start > prev_end + 0.3`.
  USE those starts as B-roll "reveal" impact times. (In the app it's `job["overlay_plan"]`;
  in the CLI it's the `overlay_plan` local; may be `[]`.)
- `grade_video` (L1520) shows the audio contract: roughcut carries the VOICE audio
  (`-c:a copy` on grade; `composite` re-encodes `-c:a aac` but keeps it). So
  `roughcut.mp4` has the cut voice track (UNLESS the source was silent → silent video).
- `_has_audio(input_path)` (autoedit, ~L990) → bool. USE to detect a silent roughcut.
- `run(cmd, timeout=...)` returns `.returncode` (124 on timeout); `ff_exe()`; the
  `-filter_complex_script <file>` pattern (render_video audio pass, overlays.composite)
  is REQUIRED here too — many whoosh placements blow the 32767-char Windows cmdline.
- app `_grade_to_roughcut(job, base, out_mp4, tmp)` (L111-126): produces `out_mp4`
  (roughcut.mp4) via `overlays.composite` (plan) or `grade_video`. BOTH `_render_outputs`
  and `_regrade_only` flow through it; `_burn` copies the audio so captions inherit SFX.
- app `/run` settings dict (L466-481) ends with `"broll_source": pick(...)`.
- app UI B-roll opts block + the JS `fd.append(...)` list (~L761-821).
- CLI `main()`: `build_roughcut(... out_mp4 ...)` at L2211; captions at L2214+. `args`
  from argparse (~L2090 broll flags). `out_mp4 = os.path.join(outdir,"roughcut.mp4")`,
  `tmpdir` exists.

## Contracts to preserve
- **A/V sync**: SFX mixing must use `duration=first` (match the voice/video length) and
  NOT touch the video stream (`-c:v copy`). Never re-time or re-cut audio.
- **Voice at full volume**: `amix=...:normalize=0` (normalize=1 ducks the voice). Each
  SFX pre-attenuated with `volume=`.
- **Output-timeline only**: all SFX times from `cut_offsets`/`_kept_words`/`overlay_plan`
  (already output-timeline). Never raw input timestamps.
- **Best-effort**: every failure path (no folder, no file, no audio, ffmpeg error/timeout)
  → copy the input audio through unchanged; never raise out of the render.
- **faststart** on the muxed output (browser preview).

## R1 — autoedit.py: `MY_SFX_DIR` + `_sfx_file`
After `broll_library` (L35), add:
```python
MY_SFX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "my_sfx")
_SFX_EXTS = (".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac")
_SFX_ROLES = {"whoosh": ("whoosh", "swoosh", "swish"),
              "impact": ("impact", "riser", "boom", "hit")}

def _sfx_file(role):
    """First file in my_sfx/ whose stem matches a name for `role`, or None."""
    if not os.path.isdir(MY_SFX_DIR):
        return None
    names = _SFX_ROLES.get(role, (role,))
    try:
        files = sorted(os.listdir(MY_SFX_DIR))
    except OSError:
        return None
    for fn in files:
        stem, ext = os.path.splitext(fn)
        if ext.lower() in _SFX_EXTS and stem.strip().lower() in names:
            return os.path.join(MY_SFX_DIR, fn)
    return None
```
(`os.path.dirname(...)` is used because `_HERE` is defined later in the file — match the
`MY_BROLL_DIR` line exactly.)

## R2 — autoedit.py: `decide_sfx_events(cutlist, all_words, overlay_plan=None)`
Returns `{"whoosh": [float...], "impact": [float...]}` on the OUTPUT timeline.
```python
SFX_EMPHASIS_PHRASES = ("the big one", "here's the crazy", "crazy part", "number one",
                        "number two", "number three", "the best", "the secret",
                        "biggest", "game changer", "life changing")

def decide_sfx_events(cutlist, all_words, overlay_plan=None):
    total = sum(e - s for s, e in cutlist) if cutlist else 0.0
    # whoosh: on internal cuts, gated >=1.2s apart, a hair BEFORE the cut.
    whoosh, last = [], -99.0
    for b in cut_offsets(cutlist):
        if b > 0 and b - last >= 1.2:
            whoosh.append(max(0.0, b - 0.08)); last = b
    # impact: hook + B-roll reveals + emphasis phrases, gated >=2.5s, capped.
    cand = []
    kept = _kept_words(cutlist, all_words)
    if kept:
        cand.append(max(0.0, kept[0]["new_start"] - 0.05))      # hook
    prev_end = None                                              # B-roll sequence starts
    for ov in sorted(overlay_plan or [], key=lambda o: float(o.get("start") or 0)):
        s = float(ov.get("start") or 0.0)
        if prev_end is None or s > prev_end + 0.3:
            cand.append(max(0.0, s - 0.08))
        prev_end = max(prev_end or 0.0, float(ov.get("end") or 0.0))
    toks = [(re.sub(r"[^a-z0-9]", "", w["word"].lower()), w["new_start"]) for w in kept]
    joined = " ".join(t for t, _ in toks)
    for ph in SFX_EMPHASIS_PHRASES:                              # phrase -> first word time
        pos = joined.find(ph)
        if pos != -1:
            wi = joined[:pos].count(" ")
            if wi < len(toks):
                cand.append(max(0.0, toks[wi][1] - 0.05))
    impact, last = [], -99.0
    for t in sorted(c for c in cand if 0 <= c <= total):
        if t - last >= 2.5:
            impact.append(t); last = t
    impact = impact[:6]
    return {"whoosh": whoosh, "impact": impact}
```

## R3 — autoedit.py: `mix_sfx(in_mp4, out_mp4, events, tmpdir)`
RESEARCH-VERIFIED (ffmpeg 7.1, tested): per-SFX-file `asplit=N` →
`aformat=sample_rates=48000:channel_layouts=stereo,adelay=delays=<ms>:all=1,volume=<V>`
per copy → final `amix=inputs=K:normalize=0:duration=first`. `normalize=0` is
MANDATORY (else the voice is ducked by 1/K, no warning). `duration=first` is
MANDATORY (`longest` balloons the length past the video). `[0:a]` on a silent input
is a HARD crash (exit 234) → the `_has_audio` guard prevents it. Type this VERBATIM:
```python
def mix_sfx(in_mp4, out_mp4, events, tmpdir):
    """Mix whoosh/impact one-shots over the roughcut's voice audio. Best-effort:
    on ANY problem (no files, no audio, ffmpeg failure) copy the input through."""
    ff = ff_exe()
    in_abs, out_abs = os.path.abspath(in_mp4), os.path.abspath(out_mp4)
    plan = []  # (sfx_path, [times], volume)
    wf, imf = _sfx_file("whoosh"), _sfx_file("impact")
    if wf and events.get("whoosh"):
        plan.append((wf, list(events["whoosh"]), 0.55))
    if imf and events.get("impact"):
        plan.append((imf, list(events["impact"]), 0.85))

    def _copy():
        run([ff, "-y", "-i", in_abs, "-c", "copy", "-movflags", "+faststart", out_abs],
            timeout=600)

    if not plan or not _has_audio(in_abs):
        _copy(); return
    try:
        cmd = [ff, "-y", "-i", in_abs]            # [0] = video + voice
        chains, labels = [], []
        for k, (path, times, vol) in enumerate(plan):
            idx = k + 1                           # ffmpeg input index for this sfx file
            cmd += ["-i", os.path.abspath(path)]
            n = len(times)
            chains.append(f"[{idx}:a]asplit={n}" + "".join(f"[s{idx}_{j}]" for j in range(n)))
            for j, t in enumerate(times):
                ms = max(0, int(round(float(t) * 1000)))
                chains.append(
                    f"[s{idx}_{j}]aformat=sample_rates=48000:channel_layouts=stereo,"
                    f"adelay=delays={ms}:all=1,volume={vol}[d{idx}_{j}]")
                labels.append(f"[d{idx}_{j}]")
        chains.append(
            f"[0:a]{''.join(labels)}amix=inputs={1 + len(labels)}:normalize=0:duration=first[aout]")
        fc_path = os.path.join(tmpdir or os.path.dirname(out_abs) or ".", "sfx_fc.txt")
        with open(fc_path, "w", encoding="utf-8") as f:
            f.write(";".join(chains))            # script file: avoids the cmdline limit
        cmd += ["-filter_complex_script", fc_path,
                "-map", "0:v", "-map", "[aout]",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart", out_abs]
        r = run(cmd, timeout=600)
        if r.returncode == 124 or not (os.path.exists(out_abs) and os.path.getsize(out_abs) > 0):
            _copy()
    except Exception:
        _copy()
```

## R4 — app.py: settings + `_grade_to_roughcut` + UI
- `/run` settings dict (after `"broll_source"`): add
  `"sfx": request.form.get("sfx", "") in ("1", "true", "on", "yes"),`
- `_grade_to_roughcut(job, base, out_mp4, tmp)`: when `job["settings"].get("sfx")`, render
  to a temp then mix into out_mp4:
```python
    sfx_on = bool(job["settings"].get("sfx"))
    target = os.path.join(tmp, "pre_sfx.mp4") if sfx_on else out_mp4
    plan = job.get("overlay_plan") or []
    if plan:
        overlays.composite(base, target, plan, job["spec"], effects=_effects(job),
                           boundaries=autoedit.cut_offsets(job["cutlist"]), tmpdir=tmp)
    else:
        autoedit.grade_video(base, target, _effects(job),
                             autoedit.cut_offsets(job["cutlist"]),
                             job["spec"]["fps"], job["spec"].get("color"), tmp)
    if sfx_on:
        ev = autoedit.decide_sfx_events(job["cutlist"], job["all_words"], plan)
        autoedit.mix_sfx(target, out_mp4, ev, tmp)
```
- UI: in the `caps` block (near the B-roll/effects checkboxes, ~L743) add:
  `<label class="chk mt"><input type="checkbox" id="sfx"> <span>Sound effects <span class="note">(whoosh on cuts + impact on emphasis; drop whoosh.mp3 / impact.mp3 in my_sfx/)</span></span></label>`
- JS: after the broll appends (~L821) add `fd.append("sfx",$("#sfx").checked?"1":"0");`

## R5 — autoedit.py CLI `main()`
- argparse (after the broll flags, ~L2094): `ap.add_argument("--sfx", action="store_true", help="Sound effects: whoosh on cuts + impact on emphasis (drop files in my_sfx/)")`
- After `build_roughcut(... out_mp4 ...)` (L2211-2212), before captions:
```python
        if args.sfx:
            section("7a2/7  SOUND EFFECTS")
            ev = decide_sfx_events(cutlist, all_words, overlay_plan)
            _tmp_sfx = os.path.join(tmpdir, "pre_sfx.mp4")
            shutil.move(out_mp4, _tmp_sfx)
            mix_sfx(_tmp_sfx, out_mp4, ev, tmpdir)
            print(f"  whoosh x{len(ev['whoosh'])}, impact x{len(ev['impact'])}")
```

## R6 — folder + gitignore
- Create `my_sfx/README.md` (mirror `my_broll/README.md`): name files `whoosh.mp3` and
  `impact.mp3` (or `riser.mp3`); supported `.mp3 .wav .m4a .ogg .aac .flac`; turn on with
  the "Sound effects" toggle (UI) or `--sfx` (CLI). Only whoosh+impact are used in v1.
- `.gitignore`: `my_sfx/*` + `!my_sfx/README.md`.

## Pitfalls
- amix DUCKS the voice unless `normalize=0`. Verify the voice is unchanged.
- adelay is in MILLISECONDS and per-channel (`:all=1` applies to all) — research confirms.
- SFX sample rate / channel layout MUST be normalized (aformat) before amix or it errors.
- Many whooshes → use `-filter_complex_script` (file), not inline (Windows 32767 limit).
- A silent roughcut (no audio) → `_has_audio` guard → `_copy()` (no SFX), never crash.
- `shutil.move(out_mp4, tmp)` in the CLU path: out_mp4 just written by build_roughcut, not
  open — safe. (App path renders to a temp, so no move of the live file.)
- Do NOT add SFX inside `composite`/`grade_video` — keep it a separate, clearly-bounded pass.

## Verification block (builder runs + reports)
1. `python -c "import autoedit, app, overlays, mediasource"` — clean.
2. `python -c "import autoedit; print(autoedit._sfx_file('whoosh'), autoedit._sfx_file('impact'))"` — both None on an empty/absent my_sfx (no crash).
3. `decide_sfx_events` on a synthetic 4-segment cutlist + words → whoosh on the cut
   boundaries (gated), impact list non-crashing; print both.
4. REAL render: synthetic 480x854 clip w/ a tone; create `my_sfx/whoosh.wav` +
   `my_sfx/impact.wav` (short tones); `decide_sfx_events` + `mix_sfx` → output exists,
   has audio, video stream COPIED (compare codec/duration to input), and
   `silencedetect`/`astats` shows energy at the whoosh/impact times. THEN delete those
   test files (leave only README).
5. mix_sfx with NO my_sfx files → output == input audio (copy path), no error.
6. `python test_plumbing.py` 19/19; `python test_overlays_proto.py` 13/13.
7. `git status` — only autoedit.py, app.py, my_sfx/README.md, .gitignore changed.

Report verification output verbatim + any deviation.
