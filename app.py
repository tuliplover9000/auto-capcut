#!/usr/bin/env python3
"""
app.py — localhost web UI for autoedit.py, with a chat panel.

Run:
  python app.py
then open http://127.0.0.1:5000

Drag in a talking-head clip, optionally type instructions, and edit. Then use
the chat box beside the preview to revise: change what's kept/cut ("keep the
intro", "cut the first 5 seconds") or the captions ("make them Bebas Neue",
"one word at a time"). The transcript is cached per job, so revisions don't
re-transcribe — a re-cut is just a Claude call + re-render, and caption-only
tweaks skip the re-render entirely.

It runs the tested autoedit.py functions in-process; Claude is the headless
`claude` CLI on your Max subscription (no API key).
"""
import os, sys, uuid, threading, tempfile, shutil

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from flask import (Flask, request, jsonify, send_file,
                   render_template_string, abort)
import autoedit
import overlays

HERE = os.path.dirname(os.path.abspath(__file__))
JOBS_DIR = os.path.join(HERE, "webjobs")
os.makedirs(JOBS_DIR, exist_ok=True)

ALLOWED_EXT = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}
STYLES = {"clean", "pop", "highlight", "oneword"}
COLORS = {"yellow", "green", "cyan", "red", "white"}
POSES = {"lower", "center"}
FONTS = set(autoedit.CAPTION_FONTS)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024 * 1024  # 4 GB

JOBS = {}
LOCK = threading.Lock()


# ── small state helpers ──────────────────────────────────────────────────────

def _set(job_id, **kw):
    with LOCK:
        if job_id in JOBS:
            JOBS[job_id].update(kw)

def _stage(job_id, **kw):
    _set(job_id, **kw)

def _bump(job):
    with LOCK:
        job["version"] = job.get("version", 0) + 1

def _chat(job_id, role, text):
    with LOCK:
        JOBS[job_id]["chat"].append({"role": role, "text": text})


# ── rendering (shared by initial edit + revisions) ───────────────────────────

def _wants_caption_layer(job):
    s = job["settings"]
    return bool(s.get("burn") or s.get("titles"))


def _broll_note(job):
    """Heads-up when B-roll was requested but nothing could be fetched (usually a
    missing PEXELS_API_KEY) — so the feature never silently does nothing. Returns
    the note string, or '' when B-roll is off or assets were found."""
    if job["settings"].get("broll") and not job.get("overlay_plan"):
        return ("Heads up: I couldn't fetch any B-roll — set a PEXELS_API_KEY "
                "(or PIXABAY_API_KEY) in .env and ask me to add it again.")
    return ""


def _burn(job, src_mp4, out_cap, tmp):
    s = job["settings"]
    cap_spec = autoedit.probe(src_mp4)
    ass = os.path.join(tmp, "captions.ass")
    fam, ff = autoedit.CAPTION_FONTS.get(s["font"], ("Arial Black", None))
    n = autoedit.write_ass(job["cutlist"], job["all_words"],
                           cap_spec["width"], cap_spec["height"], ass,
                           font=fam, highlight=autoedit.CAPTION_COLORS[s["highlight"]],
                           pos=s["pos"], style=s["style"],
                           font_file=autoedit._font_file_path(s["font"]),
                           titles=job.get("titles") if s.get("titles") else None,
                           captions=bool(s.get("burn")))
    if n > 0:
        autoedit.burn_captions(src_mp4, ass, out_cap)
    elif os.path.exists(out_cap):
        # No caption/title events this render — drop any stale captioned file so
        # _video_path can't serve a previous version whose timing no longer matches.
        os.remove(out_cap)


def _effects(job):
    s = job["settings"]
    return {"vignette": s.get("vignette"), "grain": s.get("grain"), "flash": s.get("flash")}


def _grade_to_roughcut(job, base, out_mp4, tmp):
    """From the cut+zoom base -> roughcut.mp4: composite B-roll+effects when there's
    an overlay plan (folds both in one pass), else just the effects grade.

    The overlay plan persists in job["overlay_plan"], so a cheap re-grade (effects
    or caption toggle) reuses the SAME fetched assets — no re-fetch.
    """
    plan = job.get("overlay_plan") or []
    if plan:
        overlays.composite(base, out_mp4, plan, job["spec"],
                           effects=_effects(job),
                           boundaries=autoedit.cut_offsets(job["cutlist"]), tmpdir=tmp)
    else:
        autoedit.grade_video(base, out_mp4, _effects(job),
                             autoedit.cut_offsets(job["cutlist"]),
                             job["spec"]["fps"], job["spec"].get("color"), tmp)


def _render_outputs(job):
    """Full render: cut+zoom -> base -> effects grade -> roughcut.mp4 + srt + cap."""
    outdir = job["outdir"]
    base = os.path.join(outdir, "roughcut_base.mp4")  # internal, ungraded (cheap re-grade)
    out_mp4 = os.path.join(outdir, "roughcut.mp4")
    out_srt = os.path.join(outdir, "captions.srt")
    out_cap = os.path.join(outdir, "roughcut_captioned.mp4")
    tmp = tempfile.mkdtemp(prefix="ae_render_")
    try:
        autoedit.render_video(job["input_path"], job["cutlist"], job["spec"], base, tmp,
                              zoomplan=job.get("zoomplan"))
        _grade_to_roughcut(job, base, out_mp4, tmp)
        autoedit.write_srt(job["cutlist"], job["all_words"], out_srt)
        if _wants_caption_layer(job):
            _burn(job, out_mp4, out_cap, tmp)
        elif os.path.exists(out_cap):
            os.remove(out_cap)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    _bump(job)


def _regrade_only(job):
    """Effect-only change: re-grade the existing base -> roughcut (+reburn). No re-cut."""
    outdir = job["outdir"]
    base = os.path.join(outdir, "roughcut_base.mp4")
    if not os.path.exists(base):
        _render_outputs(job)
        return
    out_mp4 = os.path.join(outdir, "roughcut.mp4")
    out_cap = os.path.join(outdir, "roughcut_captioned.mp4")
    tmp = tempfile.mkdtemp(prefix="ae_grade_")
    try:
        _grade_to_roughcut(job, base, out_mp4, tmp)
        if _wants_caption_layer(job):
            _burn(job, out_mp4, out_cap, tmp)
        elif os.path.exists(out_cap):
            os.remove(out_cap)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    _bump(job)


def _reburn_only(job):
    """Re-burn captions/titles onto the existing roughcut without re-cutting."""
    outdir = job["outdir"]
    out_mp4 = os.path.join(outdir, "roughcut.mp4")
    out_cap = os.path.join(outdir, "roughcut_captioned.mp4")
    if not _wants_caption_layer(job):
        if os.path.exists(out_cap):
            os.remove(out_cap)
        _bump(job)
        return
    if not os.path.exists(out_mp4):
        _render_outputs(job)
        return
    tmp = tempfile.mkdtemp(prefix="ae_burn_")
    try:
        _burn(job, out_mp4, out_cap, tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    _bump(job)


def _video_path(job):
    cap = os.path.join(job["outdir"], "roughcut_captioned.mp4")
    if _wants_caption_layer(job) and os.path.exists(cap):
        return cap
    return os.path.join(job["outdir"], "roughcut.mp4")


def _apply_caption_changes(job, caps):
    """Merge validated caption fields from Claude into settings. Returns changed?"""
    s = job["settings"]
    changed = False
    checks = [("style", STYLES), ("font", FONTS), ("highlight", COLORS), ("pos", POSES)]
    for key, allowed in checks:
        if key in caps and caps[key] in allowed and s[key] != caps[key]:
            s[key] = caps[key]
            changed = True
    if "burn" in caps:
        b = bool(caps["burn"])
        if s["burn"] != b:
            s["burn"] = b
            changed = True
    return changed


# ── workers ──────────────────────────────────────────────────────────────────

def run_job(job_id, instructions):
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
        job["segments"] = segs
        job["all_words"] = [w for sg in segs for w in sg.get("words", [])]
        job["transcript_text"] = autoedit.build_transcript_text(segs)

        _stage(job_id, step=5, stage="Claude deciding cuts")
        keep = autoedit.decide_cuts_with_claude(
            job["transcript_text"], spec["duration"],
            job["settings"]["aggressiveness"], job["settings"]["model"],
            extra=instructions or "")
        job["keep"] = keep

        _stage(job_id, step=6, stage="Cleaning cut list")
        job["cutlist"] = autoedit.snap_and_clean(keep, job["all_words"], spec["duration"],
                                                 fps=spec.get("fps"))

        if job["settings"].get("zoom"):
            _stage(job_id, stage="Deciding zooms")
            job["zoomplan"] = autoedit.decide_zooms_with_claude(
                job["cutlist"], job["all_words"], job["settings"]["model"],
                mode=job["settings"].get("zoom_mode", "static"))

        if job["settings"].get("titles"):
            _stage(job_id, stage="Deciding titles")
            job["titles"] = autoedit.decide_titles_with_claude(
                job["cutlist"], job["all_words"], job["settings"]["model"])

        if job["settings"].get("broll"):
            _stage(job_id, stage="Finding B-roll")
            job["overlay_plan"] = autoedit.resolve_overlays(
                job["cutlist"], job["all_words"], job["settings"]["model"],
                density=job["settings"].get("broll_density", "tasteful"),
                style=job["settings"].get("broll_style", "auto"))

        _stage(job_id, step=7, stage="Rendering")
        _render_outputs(job)

        kept = sum(e - s for s, e in job["cutlist"])
        _chat(job_id, "editor",
              f"Done — cut {spec['duration']:.0f}s down to {kept:.0f}s "
              f"({len(job['cutlist'])} segments kept). Tell me what to tweak — e.g. "
              "“keep the intro”, “cut the first 5 seconds”, "
              "“make captions Bebas Neue”, “one word at a time”.")
        bn = _broll_note(job)        # tell the user if B-roll was asked for but dropped
        if bn:
            _chat(job_id, "editor", bn)
        _stage(job_id, state="done", step=7, stage="Done")
    except Exception as e:
        _chat(job_id, "editor", f"⚠ {type(e).__name__}: {e}")
        _stage(job_id, state="error", error=str(e))


def revise_job(job_id, msg):
    job = JOBS[job_id]
    try:
        _stage(job_id, state="running", stage="Thinking…")
        history = job["chat"][:-1]  # exclude the message we just appended
        action = autoedit.revise_with_claude(
            job["transcript_text"], job["spec"]["duration"], job["cutlist"],
            job["settings"], history, msg, job["settings"]["model"])

        reply = action.get("reply") or "Done."
        changed_caps = bool(action.get("captions")) and _apply_caption_changes(job, action["captions"])

        need_full = False
        if action.get("keep"):
            try:
                cl = autoedit.snap_and_clean(action["keep"], job["all_words"], job["spec"]["duration"],
                                             fps=job["spec"].get("fps"))
                job["keep"] = action["keep"]
                job["cutlist"] = cl
                need_full = True
            except Exception as e:
                reply += f"  (I couldn't apply that cut change: {e})"

        zdir = action.get("zoom")
        if zdir:
            job["settings"]["zoom"] = bool(zdir.get("enabled", job["settings"].get("zoom", True)))
            if zdir.get("instruction"):
                job["zoom_instruction"] = str(zdir["instruction"])
            if zdir.get("mode") in ("static", "animated"):
                job["settings"]["zoom_mode"] = zdir["mode"]
            need_full = True

        # Effects directive (vignette/grain/flash) — only needs a cheap re-grade,
        # not a re-cut, unless a cut/zoom change is already forcing a full render.
        changed_fx = False
        fxdir = action.get("effects")
        if isinstance(fxdir, dict):
            for k in ("vignette", "grain", "flash"):
                if k in fxdir:
                    b = bool(fxdir[k])
                    if job["settings"].get(k) != b:
                        job["settings"][k] = b
                        changed_fx = True

        # Titles directive — toggle the editorial title layer (cheap reburn).
        changed_titles = False
        tdir = action.get("titles")
        if isinstance(tdir, dict) and "enabled" in tdir:
            b = bool(tdir["enabled"])
            if job["settings"].get("titles") != b:
                job["settings"]["titles"] = b
                changed_titles = True

        # B-roll directive — re-resolve the overlay plan then cheap re-composite
        # from the persistent base (no re-cut), UNLESS a cut/zoom change already
        # forces a full render (handled in the need_full block below).
        changed_broll = False
        bdir = action.get("broll")
        if isinstance(bdir, dict):
            if "enabled" in bdir:
                b = bool(bdir["enabled"])
                if job["settings"].get("broll") != b:
                    job["settings"]["broll"] = b
                    changed_broll = True
            if bdir.get("density") in ("tasteful", "more", "less"):
                if job["settings"].get("broll_density") != bdir["density"]:
                    job["settings"]["broll_density"] = bdir["density"]
                    changed_broll = True
            if bdir.get("instruction"):
                job["broll_instruction"] = str(bdir["instruction"])
                changed_broll = True

        if need_full:
            if job["settings"].get("zoom"):
                _stage(job_id, stage="Deciding zooms")
                job["zoomplan"] = autoedit.decide_zooms_with_claude(
                    job["cutlist"], job["all_words"], job["settings"]["model"],
                    extra=job.get("zoom_instruction", ""),
                    mode=job["settings"].get("zoom_mode", "static"))
            else:
                job["zoomplan"] = None
            if job["settings"].get("titles"):
                _stage(job_id, stage="Deciding titles")
                job["titles"] = autoedit.decide_titles_with_claude(
                    job["cutlist"], job["all_words"], job["settings"]["model"])
            # A cut change shifts the OUTPUT timeline, so the cached overlay_plan's
            # timestamps are stale — re-resolve B-roll for the new cut (else the
            # overlays fire at wrong/old positions or vanish).
            if job["settings"].get("broll"):
                _stage(job_id, stage="Finding B-roll")
                job["overlay_plan"] = autoedit.resolve_overlays(
                    job["cutlist"], job["all_words"], job["settings"]["model"],
                    density=job["settings"].get("broll_density", "tasteful"),
                    style=job["settings"].get("broll_style", "auto"),
                    extra=job.get("broll_instruction", ""))
                if _broll_note(job):
                    reply += "  (" + _broll_note(job) + ")"
            else:
                job["overlay_plan"] = []
            _stage(job_id, stage="Re-rendering")
            _render_outputs(job)
        else:
            # Cheap paths COMPOSE — pick the minimum render tier that covers every
            # dirty flag at once (the old elif chain silently dropped a second
            # directive, e.g. "turn on titles AND add film grain"). A re-grade
            # (_regrade_only) re-composites B-roll + effects AND reburns
            # captions/titles, so it subsumes caption/title changes; a re-burn
            # only repaints the caption/title layer.
            if changed_broll:
                if job["settings"].get("broll"):
                    _stage(job_id, stage="Finding B-roll")
                    job["overlay_plan"] = autoedit.resolve_overlays(
                        job["cutlist"], job["all_words"], job["settings"]["model"],
                        density=job["settings"].get("broll_density", "tasteful"),
                        style=job["settings"].get("broll_style", "auto"),
                        extra=job.get("broll_instruction", ""))
                    if _broll_note(job):
                        reply += "  (" + _broll_note(job) + ")"
                else:
                    job["overlay_plan"] = []
            # Titles freshly toggled on must be generated before any burn/regrade.
            if changed_titles and job["settings"].get("titles") and not job.get("titles"):
                _stage(job_id, stage="Deciding titles")
                job["titles"] = autoedit.decide_titles_with_claude(
                    job["cutlist"], job["all_words"], job["settings"]["model"])
            if changed_broll or changed_fx:
                _stage(job_id, stage="Re-rendering")
                _regrade_only(job)          # composites broll+fx, reburns caps+titles
            elif changed_caps or changed_titles:
                _stage(job_id, stage="Updating captions/titles")
                _reburn_only(job)

        _chat(job_id, "editor", reply)
        _stage(job_id, state="done", stage="Done")
    except Exception as e:
        _chat(job_id, "editor", f"⚠ {type(e).__name__}: {e}")
        # Mirror run_job: record the failure as an error state (the UI keeps the
        # chat enabled on "error" and still shows the last good preview) rather
        # than masking a crashed revision as a clean "done".
        _stage(job_id, state="error", error=str(e), stage="Error")


# ── routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template_string(PAGE)


@app.route("/run", methods=["POST"])
def run():
    f = request.files.get("video")
    if not f or not f.filename:
        return jsonify(error="No file uploaded."), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED_EXT:
        return jsonify(error=f"Unsupported type '{ext}'. Use: " + ", ".join(sorted(ALLOWED_EXT))), 400

    def pick(name, allowed, default):
        v = (request.form.get(name) or "").strip()
        return v if v in allowed else default

    settings = {
        "aggressiveness": pick("aggressiveness", {"light", "medium", "heavy"}, "medium"),
        "model": pick("model", {"sonnet", "opus", "haiku"}, "sonnet"),
        "whisper_model": pick("whisper_model", {"tiny", "base", "small", "medium"}, "base"),
        "burn": request.form.get("burn", "") in ("1", "true", "on", "yes"),
        "style": pick("style", STYLES, "clean"),
        "font": pick("font", FONTS, "Montserrat"),
        "highlight": pick("highlight", COLORS, "yellow"),
        "pos": "lower",
        "zoom": request.form.get("zoom", "") in ("1", "true", "on", "yes"),
        "zoom_mode": "static",
        "titles": request.form.get("titles", "") in ("1", "true", "on", "yes"),
        "vignette": request.form.get("vignette", "") in ("1", "true", "on", "yes"),
        "grain": request.form.get("grain", "") in ("1", "true", "on", "yes"),
        "flash": request.form.get("flash", "") in ("1", "true", "on", "yes"),
        "broll": request.form.get("broll", "") in ("1", "true", "on", "yes"),
        "broll_density": pick("broll_density", {"tasteful", "more", "less"}, "tasteful"),
        "broll_style": pick("broll_style", {"auto", "stacked", "cutaway"}, "auto"),
    }
    instructions = (request.form.get("instructions") or "").strip()

    job_id = uuid.uuid4().hex[:12]
    jobdir = os.path.join(JOBS_DIR, job_id)
    outdir = os.path.join(jobdir, "out")
    os.makedirs(outdir, exist_ok=True)
    tmpdir = os.path.join(jobdir, "tmp")
    os.makedirs(tmpdir, exist_ok=True)
    input_path = os.path.join(jobdir, "input" + ext)
    f.save(input_path)

    chat = []
    if instructions:
        chat.append({"role": "you", "text": instructions})

    with LOCK:
        JOBS[job_id] = {
            "input_path": input_path, "outdir": outdir, "tmpdir": tmpdir,
            "name": f.filename, "settings": settings, "chat": chat,
            "state": "queued", "step": 0, "stage": "Starting…", "error": "",
            "version": 0, "spec": None, "all_words": [], "cutlist": [],
            "zoomplan": None, "zoom_instruction": "", "titles": [],
            "overlay_plan": [], "broll_instruction": "",
        }

    threading.Thread(target=run_job, args=(job_id, instructions), daemon=True).start()
    return jsonify(job_id=job_id)


@app.route("/chat/<job_id>", methods=["POST"])
def chat(job_id):
    msg = (request.json or {}).get("message", "").strip() if request.is_json else \
          (request.form.get("message") or "").strip()
    if not msg:
        return jsonify(error="empty message"), 400
    with LOCK:
        job = JOBS.get(job_id)
        if not job:
            return jsonify(error="unknown job"), 404
        if job["state"] == "running":
            return jsonify(error="busy"), 409
        if not job.get("transcript_text"):
            return jsonify(error="not ready"), 409
        # Claim the job under the lock BEFORE spawning the worker — otherwise two
        # near-simultaneous /chat posts both pass the busy check (the worker only
        # sets state="running" once its thread starts) and double-render.
        job["state"] = "running"
    _chat(job_id, "you", msg)
    threading.Thread(target=revise_job, args=(job_id, msg), daemon=True).start()
    return jsonify(ok=True)


@app.route("/status/<job_id>")
def status(job_id):
    with LOCK:
        j = JOBS.get(job_id)
        if not j:
            return jsonify(error="unknown job"), 404
        outdir = j["outdir"]
        return jsonify(
            state=j["state"], step=j["step"], stage=j["stage"], error=j["error"],
            version=j.get("version", 0), chat=list(j["chat"]),
            settings=dict(j["settings"]),
            has_mp4=os.path.exists(os.path.join(outdir, "roughcut.mp4")),
            has_srt=os.path.exists(os.path.join(outdir, "captions.srt")),
            has_cap=os.path.exists(os.path.join(outdir, "roughcut_captioned.mp4")),
        )


@app.route("/video/<job_id>")
def video(job_id):
    with LOCK:
        j = JOBS.get(job_id)
    if not j:
        abort(404)
    path = _video_path(j)
    # Catch the miss rather than pre-checking: a concurrent revision can delete
    # the file between an exists() check and send_file's own stat (TOCTOU -> 500).
    try:
        return send_file(path, mimetype="video/mp4", conditional=True, max_age=0)
    except (FileNotFoundError, OSError):
        abort(404)


@app.route("/download/<job_id>/<which>")
def download(job_id, which):
    with LOCK:
        j = JOBS.get(job_id)
    if not j:
        abort(404)
    fname = {"mp4": "roughcut.mp4", "srt": "captions.srt",
             "cap": "roughcut_captioned.mp4"}.get(which)
    if not fname:
        abort(404)
    path = os.path.join(j["outdir"], fname)
    # Set an explicit MIME for the .srt sidecar so it downloads as text rather
    # than being handed to a media player by the OS.
    mime = "text/plain; charset=utf-8" if which == "srt" else None
    try:
        return send_file(path, as_attachment=True, download_name=fname, mimetype=mime)
    except (FileNotFoundError, OSError):
        abort(404)


PAGE = r"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CapCut Auto-Edit</title>
<style>
  :root { --bg:#0f1115; --card:#181b22; --line:#2a2f3a; --fg:#e6e9ef;
          --muted:#9aa3b2; --accent:#4f8cff; --ok:#36c08a; --err:#ff6b6b; }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif;
         background:var(--bg); color:var(--fg); }
  .wrap { max-width:1100px; margin:28px auto; padding:0 18px; }
  h1 { font-size:21px; margin:0 0 4px; }
  .sub { color:var(--muted); margin:0 0 20px; }
  .card { background:var(--card); border:1px solid var(--line);
          border-radius:12px; padding:18px; }
  #drop { border:2px dashed var(--line); border-radius:12px; padding:34px 18px;
          text-align:center; cursor:pointer; color:var(--muted); }
  #drop.hot { border-color:var(--accent); color:var(--fg); background:#1c2230; }
  #drop b { color:var(--fg); }
  .row { display:flex; gap:12px; flex-wrap:wrap; }
  .field { flex:1; min-width:140px; }
  label { display:block; font-size:12px; color:var(--muted); margin-bottom:5px; }
  select, input[type=text], textarea { width:100%; padding:9px 10px; border-radius:8px;
          border:1px solid var(--line); background:#0e1117; color:var(--fg); font:inherit; }
  textarea { resize:vertical; min-height:54px; }
  button { background:var(--accent); color:#fff; border:0; border-radius:8px;
          padding:10px 18px; font-size:15px; font-weight:600; cursor:pointer; }
  button:disabled { opacity:.45; cursor:not-allowed; }
  .mt { margin-top:14px; }
  .caps { margin-top:14px; padding-top:12px; border-top:1px solid var(--line); }
  .chk { display:flex; gap:10px; align-items:center; cursor:pointer; }
  .note { color:var(--muted); font-size:13px; }
  .hide { display:none; }

  /* workspace */
  .work { display:grid; grid-template-columns: 1.1fr .9fr; gap:18px; align-items:start; }
  @media (max-width:820px){ .work { grid-template-columns:1fr; } }
  video { width:100%; border-radius:10px; background:#000; display:block; }
  .dl { display:flex; gap:10px; margin-top:12px; flex-wrap:wrap; }
  .dl a { flex:1; text-align:center; text-decoration:none; background:#222836;
          color:var(--fg); border:1px solid var(--line); font-weight:600;
          padding:9px; border-radius:8px; font-size:14px; }
  .dl a.cap { background:var(--ok); color:#06251a; border:0; }
  .prog { height:8px; background:var(--line); border-radius:4px; overflow:hidden; margin:10px 0; }
  .prog > i { display:block; height:100%; width:0; background:var(--accent); transition:.3s; }

  /* chat */
  .chat { display:flex; flex-direction:column; height:520px; }
  .msgs { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:9px; padding-right:4px; }
  .msg { max-width:85%; padding:9px 12px; border-radius:12px; font-size:14px; white-space:pre-wrap; }
  .msg.you { align-self:flex-end; background:var(--accent); color:#fff; border-bottom-right-radius:3px; }
  .msg.editor { align-self:flex-start; background:#222836; border:1px solid var(--line); border-bottom-left-radius:3px; }
  .cin { display:flex; gap:8px; margin-top:10px; }
  .cin input { flex:1; }
  .working { color:var(--muted); font-size:13px; font-style:italic; align-self:flex-start; }
  .err { color:var(--err); font-weight:600; }
</style></head>
<body><div class="wrap">
  <h1>🎬 CapCut Auto-Edit</h1>
  <p class="sub">Edit a talking-head clip, then chat with the editor to revise it.</p>

  <!-- SETUP -->
  <div class="card" id="setup">
    <div id="drop">
      <div>Drag &amp; drop a video, or <b>click to choose</b></div>
      <div style="font-size:12px;margin-top:6px">mp4 · mov · mkv · avi · webm · m4v</div>
      <div id="fname" style="margin-top:9px;color:var(--accent)"></div>
    </div>
    <input id="file" type="file" accept="video/*" class="hide">
    <div class="row mt">
      <div class="field"><label>Aggressiveness</label>
        <select id="aggr"><option value="light">Light</option>
          <option value="medium" selected>Medium</option>
          <option value="heavy">Heavy</option></select></div>
      <div class="field"><label>Claude model</label>
        <select id="model"><option value="sonnet" selected>Sonnet</option>
          <option value="haiku">Haiku</option><option value="opus">Opus</option></select></div>
      <div class="field"><label>Transcription</label>
        <select id="whisper"><option value="tiny">Tiny</option>
          <option value="base" selected>Base</option>
          <option value="small">Small</option><option value="medium">Medium</option></select></div>
    </div>
    <div class="mt"><label>Instructions (optional) — tell the editor anything before it cuts</label>
      <textarea id="instructions" placeholder="e.g. keep the intro intact, cut hard everywhere else, don't remove the joke at the end"></textarea></div>
    <div class="caps">
      <label class="chk"><input type="checkbox" id="zoom" checked>
        <span>Camera zooms (auto punch-ins) <span class="note">(Claude-decided; adjust in chat — "more zooms", "no zoom on the intro")</span></span></label>
      <label class="chk mt"><input type="checkbox" id="broll"> <span>B-roll (auto images/clips) <span class="note">(Claude-decided stock; needs a Pexels/Pixabay key — slower)</span></span></label>
      <div class="row mt" id="brollopts">
        <div class="field"><label>B-roll density</label><select id="broll_density">
          <option value="tasteful" selected>Tasteful (~one / 4-5s)</option>
          <option value="more">More</option>
          <option value="less">Less</option></select></div>
        <div class="field"><label>B-roll style</label><select id="broll_style">
          <option value="auto" selected>Auto (Claude picks)</option>
          <option value="stacked">Stacked</option>
          <option value="cutaway">Cutaway</option></select></div>
      </div>
      <label class="chk mt"><input type="checkbox" id="titles"> <span>Editorial titles <span class="note">(big yellow hook/section text, Claude-decided)</span></span></label>
      <label class="chk mt"><input type="checkbox" id="vignette"> <span>Vignette <span class="note">(subtle darkened edges)</span></span></label>
      <label class="chk"><input type="checkbox" id="grain"> <span>Film grain <span class="note">(light texture)</span></span></label>
      <label class="chk"><input type="checkbox" id="flash"> <span>Flash on cut <span class="note">(quick white flash on cuts)</span></span></label>
    </div>
    <div class="caps">
      <label class="chk"><input type="checkbox" id="burn">
        <span>Burn animated captions onto the video <span class="note">(word-by-word; not editable in CapCut after)</span></span></label>
      <div class="row cwrap hide mt" id="cwrap">
        <div class="field"><label>Style</label><select id="style">
          <option value="clean" selected>Clean (minimal phrases)</option>
          <option value="pop">Word pop / bounce</option>
          <option value="oneword">One word at a time</option>
          <option value="highlight">Highlight only</option></select></div>
        <div class="field"><label>Font</label><select id="font">
          <option value="Montserrat" selected>Montserrat</option>
          <option value="Anton">Anton</option><option value="Bebas Neue">Bebas Neue</option>
          <option value="Arial Black">Arial Black</option>
          <option value="Impact">Impact</option></select></div>
        <div class="field"><label>Highlight color</label><select id="hl">
          <option value="yellow" selected>Yellow</option><option value="green">Green</option>
          <option value="cyan">Cyan</option><option value="red">Red</option></select></div>
      </div>
    </div>
    <button class="mt" id="go" disabled style="width:100%">Start editing</button>
    <p class="note mt">Uses your Claude Max plan — no API key.</p>
  </div>

  <!-- WORKSPACE -->
  <div class="work hide" id="work">
    <div class="card">
      <div id="prewrap">
        <div class="prog" id="progwrap"><i id="prog"></i></div>
        <div id="stage" class="note">Starting…</div>
        <video id="vid" class="hide" controls playsinline></video>
      </div>
      <div class="dl hide" id="dl">
        <a id="dlcap" class="cap hide" href="#">⬇ Captioned</a>
        <a id="dlmp4" href="#">⬇ Rough cut</a>
        <a id="dlsrt" href="#">⬇ .srt</a>
      </div>
    </div>
    <div class="card chat">
      <div class="msgs" id="msgs"></div>
      <div class="cin">
        <input id="cmsg" type="text" placeholder="Tell the editor what to change…" disabled>
        <button id="csend" disabled>Send</button>
      </div>
    </div>
  </div>
</div>
<script>
const $ = s => document.querySelector(s);
let chosen=null, jobId=null, poll=null, lastVer=-1, lastMsgs=0, working=false;

const drop=$("#drop"), file=$("#file");
drop.onclick=()=>file.click();
["dragover","dragenter"].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add("hot");}));
["dragleave","drop"].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove("hot");}));
drop.addEventListener("drop",ev=>{ if(ev.dataTransfer.files[0]) pick(ev.dataTransfer.files[0]); });
file.onchange=()=>{ if(file.files[0]) pick(file.files[0]); };
function pick(f){ chosen=f; $("#fname").textContent="✓ "+f.name; $("#go").disabled=false; }
$("#burn").onchange=()=>$("#cwrap").classList.toggle("hide",!$("#burn").checked);

$("#go").onclick=async()=>{
  if(!chosen) return;
  $("#go").disabled=true;
  const fd=new FormData();
  fd.append("video",chosen);
  fd.append("aggressiveness",$("#aggr").value);
  fd.append("model",$("#model").value);
  fd.append("whisper_model",$("#whisper").value);
  fd.append("instructions",$("#instructions").value);
  fd.append("zoom",$("#zoom").checked?"1":"0");
  fd.append("broll",$("#broll").checked?"1":"0");
  if($("#broll_density")) fd.append("broll_density",$("#broll_density").value);
  if($("#broll_style")) fd.append("broll_style",$("#broll_style").value);
  fd.append("titles",$("#titles").checked?"1":"0");
  fd.append("vignette",$("#vignette").checked?"1":"0");
  fd.append("grain",$("#grain").checked?"1":"0");
  fd.append("flash",$("#flash").checked?"1":"0");
  fd.append("burn",$("#burn").checked?"1":"0");
  fd.append("style",$("#style").value);
  fd.append("font",$("#font").value);
  fd.append("highlight",$("#hl").value);
  let r;
  try{ r=await (await fetch("/run",{method:"POST",body:fd})).json(); }
  catch(e){ alert("Upload failed: "+e); $("#go").disabled=false; return; }
  if(r.error){ alert(r.error); $("#go").disabled=false; return; }
  jobId=r.job_id;
  try{ sessionStorage.setItem("jobId", jobId); }catch(e){}
  $("#setup").classList.add("hide");
  $("#work").classList.remove("hide");
  poll=setInterval(tick,1200); tick();
};

async function tick(){
  if(!jobId) return;
  let s, resp;
  try{ resp=await fetch("/status/"+jobId); s=await resp.json(); }catch(e){ return; }
  if(!resp.ok){
    // The job no longer exists (e.g. the server was restarted). Stop polling
    // and return cleanly to the upload screen instead of silently freezing.
    if(poll){ clearInterval(poll); poll=null; }
    try{ sessionStorage.removeItem("jobId"); }catch(e){}
    jobId=null; working=false;
    $("#work").classList.add("hide");
    $("#setup").classList.remove("hide");
    $("#go").disabled = !chosen;
    return;
  }
  // progress
  const running = s.state==="running";
  working = running;
  $("#stage").textContent = running ? (s.stage||"Working…")
                                    : (s.state==="error" ? ("⚠ "+(s.error||"failed")) : "");
  $("#prog").style.width = Math.round((s.step/7)*100)+"%";
  // Show the progress bar + stage while working — during the initial run AND
  // during revisions; hide them only once a render exists and nothing is running.
  $("#progwrap").classList.toggle("hide", !(running || !s.has_mp4));
  $("#stage").classList.toggle("hide", !running && s.state!=="error");

  // video preview — reload only when a new version is rendered
  if(s.has_mp4 && s.version!==lastVer){
    lastVer=s.version;
    const v=$("#vid");
    const t=v.currentTime||0;
    v.classList.remove("hide");
    // Restore the playback position after the reload (a revision shouldn't jump
    // the viewer back to 0:00).
    v.addEventListener("loadedmetadata", ()=>{
      try{ if(t>0 && t < (v.duration||1e9)) v.currentTime=t; }catch(e){}
    }, {once:true});
    v.src="/video/"+jobId+"?v="+s.version;
    v.load();
    $("#dl").classList.remove("hide");
    $("#dlmp4").href="/download/"+jobId+"/mp4";
    $("#dlsrt").href="/download/"+jobId+"/srt";
    if(s.has_cap){ $("#dlcap").href="/download/"+jobId+"/cap"; $("#dlcap").classList.remove("hide"); }
    else { $("#dlcap").classList.add("hide"); }
  }

  // chat
  renderChat(s.chat, running);

  // enable input once we have a transcript (after first edit) and not busy
  const ready = s.has_mp4 || s.state==="done" || s.state==="error";
  $("#cmsg").disabled = !ready || running;
  $("#csend").disabled = !ready || running;
}

function renderChat(msgs, running){
  const box=$("#msgs");
  const sig=(msgs?msgs.length:0)+"/"+running;
  if(sig===window._csig) return; window._csig=sig;
  box.innerHTML="";
  (msgs||[]).forEach(m=>{
    const d=document.createElement("div");
    d.className="msg "+(m.role==="you"?"you":"editor");
    if(m.text && m.text.startsWith("⚠")) d.classList.add("err");
    d.textContent=m.text;
    box.appendChild(d);
  });
  if(running){
    const w=document.createElement("div"); w.className="working"; w.textContent="editor is working…";
    box.appendChild(w);
  }
  box.scrollTop=box.scrollHeight;
}

async function send(){
  const inp=$("#cmsg"); const msg=inp.value.trim();
  if(!msg||working) return;
  inp.value=""; $("#cmsg").disabled=true; $("#csend").disabled=true;
  try{
    const r=await (await fetch("/chat/"+jobId,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg})})).json();
    // Restore the text so the user doesn't have to retype it (busy/not-ready/etc).
    if(r && r.error){ inp.value=msg; }
  }catch(e){ inp.value=msg; }
  tick();
}
$("#csend").onclick=send;
$("#cmsg").addEventListener("keydown",e=>{ if(e.key==="Enter") send(); });

// Reconnect to an in-progress (or finished) job after a page refresh, so a long
// render isn't abandoned. If the job is gone, tick() falls back to the upload view.
(function reconnect(){
  let saved=null; try{ saved=sessionStorage.getItem("jobId"); }catch(e){}
  if(saved){
    jobId=saved;
    $("#setup").classList.add("hide");
    $("#work").classList.remove("hide");
    poll=setInterval(tick,1200); tick();
  }
})();
</script>
</body></html>"""


if __name__ == "__main__":
    print("CapCut Auto-Edit UI →  http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, threaded=True)
