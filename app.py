#!/usr/bin/env python3
"""
app.py — tiny localhost web UI for autoedit.py.

Run:
  python app.py
then open http://127.0.0.1:5000 in your browser.

Drag in a talking-head video, pick the options, hit Start. The page shows live
progress and gives you download buttons for the rough cut (.mp4) + captions
(.srt) when it's done. It just runs the tested autoedit.py CLI under the hood —
no separate editing logic lives here.
"""
import os, sys, uuid, threading, subprocess

# Windows consoles default to cp1252 and crash on non-ASCII (e.g. the → below).
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from flask import (Flask, request, jsonify, send_file,
                   render_template_string, abort)

HERE = os.path.dirname(os.path.abspath(__file__))
AUTOEDIT = os.path.join(HERE, "autoedit.py")
JOBS_DIR = os.path.join(HERE, "webjobs")
os.makedirs(JOBS_DIR, exist_ok=True)

ALLOWED_EXT = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024 * 1024  # 4 GB cap

# job_id -> {"state", "log":[lines], "step", "error", "outdir", "name"}
JOBS = {}
LOCK = threading.Lock()


def _set(job_id, **kw):
    with LOCK:
        JOBS[job_id].update(kw)


def _append_log(job_id, line):
    with LOCK:
        JOBS[job_id]["log"].append(line)
        # cheap progress: detect the "N/7" stage banners autoedit prints
        for n in range(1, 8):
            if f"{n}/7" in line:
                JOBS[job_id]["step"] = n


def run_job(job_id, input_path, outdir, aggressiveness, model, whisper_model,
            burn=False, highlight="yellow"):
    """Run autoedit.py as a subprocess, streaming its stdout into the job log."""
    cmd = [
        sys.executable, AUTOEDIT, input_path,
        "-o", outdir,
        "--aggressiveness", aggressiveness,
        "--model", model,
        "--whisper-model", whisper_model,
    ]
    if burn:
        cmd += ["--burn-captions", "--caption-highlight", highlight]
    _set(job_id, state="running")
    try:
        proc = subprocess.Popen(
            cmd, cwd=HERE,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace", bufsize=1,
        )
        for line in proc.stdout:
            _append_log(job_id, line.rstrip("\n"))
        proc.wait()
    except Exception as e:
        _append_log(job_id, f"!! launcher error: {e}")
        _set(job_id, state="error", error=str(e))
        return

    mp4 = os.path.join(outdir, "roughcut.mp4")
    srt = os.path.join(outdir, "captions.srt")
    if proc.returncode == 0 and os.path.exists(mp4):
        _set(job_id, state="done", step=7)
    else:
        # autoedit prints a clear "!! Type: message" on failure — surface its tail
        with LOCK:
            tail = next((l for l in reversed(JOBS[job_id]["log"]) if l.startswith("!!")), "")
        _set(job_id, state="error", error=tail or f"autoedit exited with code {proc.returncode}")


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
        return jsonify(error=f"Unsupported file type '{ext}'. Use: "
                             + ", ".join(sorted(ALLOWED_EXT))), 400

    aggressiveness = request.form.get("aggressiveness", "medium")
    if aggressiveness not in {"light", "medium", "heavy"}:
        aggressiveness = "medium"
    model = request.form.get("model", "sonnet").strip() or "sonnet"
    whisper_model = request.form.get("whisper_model", "base").strip() or "base"
    burn = request.form.get("burn", "") in ("1", "true", "on", "yes")
    highlight = request.form.get("highlight", "yellow").strip() or "yellow"
    if highlight not in {"yellow", "green", "cyan", "red", "white"}:
        highlight = "yellow"

    job_id = uuid.uuid4().hex[:12]
    jobdir = os.path.join(JOBS_DIR, job_id)
    outdir = os.path.join(jobdir, "out")
    os.makedirs(outdir, exist_ok=True)
    input_path = os.path.join(jobdir, "input" + ext)
    f.save(input_path)

    with LOCK:
        JOBS[job_id] = {"state": "queued", "log": [], "step": 0,
                        "error": "", "outdir": outdir, "name": f.filename}

    t = threading.Thread(target=run_job, args=(
        job_id, input_path, outdir, aggressiveness, model, whisper_model,
        burn, highlight), daemon=True)
    t.start()
    return jsonify(job_id=job_id)


@app.route("/status/<job_id>")
def status(job_id):
    with LOCK:
        j = JOBS.get(job_id)
        if not j:
            return jsonify(error="unknown job"), 404
        outdir = j["outdir"]
        return jsonify(
            state=j["state"], step=j["step"], error=j["error"],
            log="\n".join(j["log"]),
            has_mp4=os.path.exists(os.path.join(outdir, "roughcut.mp4")),
            has_srt=os.path.exists(os.path.join(outdir, "captions.srt")),
            has_cap=os.path.exists(os.path.join(outdir, "roughcut_captioned.mp4")),
        )


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
    if not os.path.exists(path):
        abort(404)
    return send_file(path, as_attachment=True, download_name=fname)


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
  .wrap { max-width:720px; margin:40px auto; padding:0 20px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:var(--muted); margin:0 0 24px; }
  .card { background:var(--card); border:1px solid var(--line);
          border-radius:12px; padding:20px; margin-bottom:18px; }
  #drop { border:2px dashed var(--line); border-radius:12px; padding:38px 20px;
          text-align:center; cursor:pointer; transition:.15s; color:var(--muted); }
  #drop.hot { border-color:var(--accent); color:var(--fg); background:#1c2230; }
  #drop b { color:var(--fg); }
  .row { display:flex; gap:14px; flex-wrap:wrap; margin-top:16px; }
  .field { flex:1; min-width:150px; }
  label { display:block; font-size:12px; color:var(--muted); margin-bottom:5px; }
  select, input[type=text] { width:100%; padding:9px 10px; border-radius:8px;
          border:1px solid var(--line); background:#0e1117; color:var(--fg); }
  button { background:var(--accent); color:#fff; border:0; border-radius:8px;
          padding:11px 20px; font-size:15px; font-weight:600; cursor:pointer; }
  button:disabled { opacity:.5; cursor:not-allowed; }
  .start { margin-top:18px; width:100%; }
  .steps { display:flex; gap:6px; margin:4px 0 14px; }
  .steps .s { flex:1; height:6px; border-radius:3px; background:var(--line); }
  .steps .s.on { background:var(--accent); }
  .steps .s.ok { background:var(--ok); }
  pre { background:#0b0d12; border:1px solid var(--line); border-radius:8px;
        padding:12px; max-height:300px; overflow:auto; font-size:12.5px;
        white-space:pre-wrap; color:#c9d1e0; margin:0; }
  .dl { display:flex; gap:12px; margin-top:14px; }
  .dl a { flex:1; text-align:center; text-decoration:none; background:var(--ok);
          color:#06251a; font-weight:700; padding:11px; border-radius:8px; }
  .err { color:var(--err); font-weight:600; margin-top:6px; }
  .hide { display:none; }
  .note { color:var(--muted); font-size:13px; margin-top:12px; }
  .caps { margin-top:16px; padding-top:14px; border-top:1px solid var(--line); }
  .chk { display:flex; gap:10px; align-items:flex-start; cursor:pointer; color:var(--fg); }
  .chk input { margin-top:3px; }
  .chk small { color:var(--muted); }
  .cwrap { max-width:200px; margin-top:12px; }
</style></head>
<body><div class="wrap">
  <h1>🎬 CapCut Auto-Edit</h1>
  <p class="sub">Drop a talking-head clip → get a rough cut + captions to import into CapCut.</p>

  <div class="card" id="setup">
    <div id="drop">
      <div>Drag &amp; drop a video here, or <b>click to choose</b></div>
      <div style="font-size:12px;margin-top:6px">mp4 · mov · mkv · avi · webm · m4v</div>
      <div id="fname" style="margin-top:10px;color:var(--accent)"></div>
    </div>
    <input id="file" type="file" accept="video/*" class="hide">
    <div class="row">
      <div class="field"><label>Aggressiveness</label>
        <select id="aggr">
          <option value="light">Light — only long silences</option>
          <option value="medium" selected>Medium — filler, false starts, repeats</option>
          <option value="heavy">Heavy — tighten hard</option>
        </select></div>
      <div class="field"><label>Claude model</label>
        <select id="model">
          <option value="sonnet" selected>Sonnet (balanced)</option>
          <option value="haiku">Haiku (fast/cheap)</option>
          <option value="opus">Opus (best)</option>
        </select></div>
      <div class="field"><label>Transcription accuracy</label>
        <select id="whisper">
          <option value="tiny">Tiny (fastest)</option>
          <option value="base" selected>Base</option>
          <option value="small">Small (more accurate)</option>
          <option value="medium">Medium (slow)</option>
        </select></div>
    </div>
    <div class="caps">
      <label class="chk"><input type="checkbox" id="burn">
        <span>Burn animated captions onto the video <small>(word-by-word highlight; not editable in CapCut after)</small></span></label>
      <div class="field cwrap hide" id="cwrap"><label>Highlight color</label>
        <select id="hl">
          <option value="yellow" selected>Yellow</option>
          <option value="green">Green</option>
          <option value="cyan">Cyan</option>
          <option value="red">Red</option>
        </select></div>
    </div>
    <button class="start" id="go" disabled>Start auto-edit</button>
    <p class="note">Uses your Claude Max plan — no API key, no per-token bill.</p>
  </div>

  <div class="card hide" id="progress">
    <div class="steps" id="steps"></div>
    <div id="stage" style="margin-bottom:10px;color:var(--muted)">Starting…</div>
    <pre id="log"></pre>
    <div class="dl hide" id="dl">
      <a id="dlcap" class="hide" href="#">⬇ Captioned video (.mp4)</a>
      <a id="dlmp4" href="#">⬇ Rough cut (.mp4)</a>
      <a id="dlsrt" href="#">⬇ Captions (.srt)</a>
    </div>
    <div class="err hide" id="err"></div>
    <p class="note hide" id="okmsg">Import <b>both</b> files into CapCut. This is a
       rough cut — refine the rest by hand.</p>
    <button id="again" class="hide" style="margin-top:14px">Edit another</button>
  </div>
</div>
<script>
const $ = s => document.querySelector(s);
let chosen = null, poll = null;
const STAGES = ["", "Probing video", "Extracting audio", "Transcribing (Whisper)",
  "Building transcript", "Claude deciding cuts", "Cleaning cut list", "Rendering + captions"];

const drop = $("#drop"), file = $("#file");
drop.onclick = () => file.click();
["dragover","dragenter"].forEach(e => drop.addEventListener(e, ev => {
  ev.preventDefault(); drop.classList.add("hot"); }));
["dragleave","drop"].forEach(e => drop.addEventListener(e, ev => {
  ev.preventDefault(); drop.classList.remove("hot"); }));
drop.addEventListener("drop", ev => { if (ev.dataTransfer.files[0]) pick(ev.dataTransfer.files[0]); });
file.onchange = () => { if (file.files[0]) pick(file.files[0]); };
function pick(f){ chosen = f; $("#fname").textContent = "✓ " + f.name; $("#go").disabled = false; }

$("#burn").onchange = () => $("#cwrap").classList.toggle("hide", !$("#burn").checked);

$("#go").onclick = async () => {
  if (!chosen) return;
  $("#go").disabled = true;
  const fd = new FormData();
  fd.append("video", chosen);
  fd.append("aggressiveness", $("#aggr").value);
  fd.append("model", $("#model").value);
  fd.append("whisper_model", $("#whisper").value);
  fd.append("burn", $("#burn").checked ? "1" : "0");
  fd.append("highlight", $("#hl").value);
  $("#setup").classList.add("hide");
  $("#progress").classList.remove("hide");
  renderSteps(0);
  let r;
  try { r = await (await fetch("/run", {method:"POST", body:fd})).json(); }
  catch(e){ return fail("Upload failed: " + e); }
  if (r.error) return fail(r.error);
  poll = setInterval(() => check(r.job_id), 1200);
  check(r.job_id);
};

async function check(id){
  let s;
  try { s = await (await fetch("/status/" + id)).json(); } catch(e){ return; }
  $("#log").textContent = s.log || "";
  $("#log").scrollTop = $("#log").scrollHeight;
  renderSteps(s.step);
  $("#stage").textContent = s.state === "running"
    ? (STAGES[s.step] || "Working…") + " …" : s.state;
  if (s.state === "done"){
    clearInterval(poll);
    $("#dl").classList.remove("hide");
    $("#okmsg").classList.remove("hide");
    $("#again").classList.remove("hide");
    $("#dlmp4").href = "/download/" + id + "/mp4";
    $("#dlsrt").href = "/download/" + id + "/srt";
    if (s.has_cap){
      $("#dlcap").href = "/download/" + id + "/cap";
      $("#dlcap").classList.remove("hide");
    }
    $("#stage").textContent = "✅ Done";
    renderSteps(7, true);
  } else if (s.state === "error"){
    clearInterval(poll);
    fail(s.error || "Something went wrong — see the log above.");
  }
}

function renderSteps(step, done){
  let h = "";
  for (let i=1;i<=7;i++) h += `<div class="s ${i<step?'ok':(i===step?'on':'')} ${done?'ok':''}"></div>`;
  $("#steps").innerHTML = h;
}
function fail(msg){
  if (poll) clearInterval(poll);
  $("#err").textContent = "❌ " + msg;
  $("#err").classList.remove("hide");
  $("#again").classList.remove("hide");
  $("#stage").textContent = "error";
}
$("#again").onclick = () => location.reload();
</script>
</body></html>"""


if __name__ == "__main__":
    print("CapCut Auto-Edit UI →  http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, threaded=True)
