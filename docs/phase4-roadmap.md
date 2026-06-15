# Phase 4 — Chat control of B-roll (verified roadmap)

Goal: let the creator tweak B-roll conversationally in the app chat — turn it
on/off, change density, and steer content ("add a rocket when I say launch",
"fewer images", "remove the map"). No UI change (the `#broll` checkbox already
exists). Reuse the cheap re-composite path so a B-roll tweak does NOT re-cut.

## Edit scope (ONLY these three edits, in two files)
- `autoedit.py` → `resolve_overlays` (L555): add an `extra=""` param, pass it through.
- `autoedit.py` → `revise_with_claude` (L577–651): add a `"broll"` directive to the
  JSON contract, parse it, return it; remove "b-roll" from the unsupported list.
- `app.py` → `revise_job` (L269–363): handle the `broll` directive (cheap
  re-composite path) + pass `extra` in the existing need_full re-resolve.

MUST NOT change: cut/zoom/effects/titles/captions directive handling (only ADD
alongside), render helpers (`_render_outputs`/`_regrade_only`/`_grade_to_roughcut`/
`_reburn_only`), `decide_overlays_with_claude` (it ALREADY has `extra=""`),
`overlays.py`, `mediasource.py`, `run_job` initial resolve, any public signatures
other than the two listed.

## Verified current state
- `decide_overlays_with_claude(cutlist, all_words, model="sonnet", extra="", density="tasteful")`
  (autoedit.py L470) — ALREADY accepts `extra` and injects it as
  "Creator's guidance (PRIORITY)". So `resolve_overlays` only needs to forward it.
- `resolve_overlays(cutlist, all_words, model="sonnet", density="tasteful", style="auto")`
  (autoedit.py L555) calls `decide_overlays_with_claude(cutlist, all_words, model=model, density=density)`
  — does NOT pass extra yet.
- `revise_with_claude` JSON contract (autoedit.py L602–609) has reply/keep/captions/
  zoom/effects/titles. Rule L616 lists "b-roll" as unsupported. Error returns L623–624
  and L626–627 and final return L651 enumerate keep/captions/zoom/effects/titles.
- `revise_job` (app.py L269–363): need_full set by keep (L282) / zoom (L291).
  Effects→`_regrade_only` (L352), titles→`_reburn_only` (L345), caps→`_reburn_only`
  (L355). The need_full block already re-resolves B-roll (L337–342) but does NOT
  pass `extra` and does NOT clear the plan when broll is turned off.
- `_grade_to_roughcut` (app.py L96) composites `job["overlay_plan"]`+effects in one
  pass when the plan is non-empty, else just grades. `_regrade_only` (app.py L136)
  re-runs `_grade_to_roughcut` from the persistent `roughcut_base.mp4` AND reburns
  captions — so it is the correct CHEAP path for a B-roll-only change.

## R1 — autoedit.py `resolve_overlays`: add `extra` param + forward it
Signature → add `, extra=""` as the last param. Inside, change the
`decide_overlays_with_claude(...)` call to also pass `extra=extra`. Nothing else.

## R2 — autoedit.py `revise_with_claude`: add the broll directive
1. JSON contract: AFTER the `"titles"` line (L608), add:
   `"broll": {{"enabled": true, "density": "tasteful|more|less", "instruction": "<what to change, e.g. add a rocket when I say launch / fewer images / remove the map>"}}`
   (double-brace `{{ }}` because this is inside an f-string.)
2. Rules: AFTER the titles rule (L615), add:
   `- Include "broll" ONLY if the creator wants to change the B-roll / overlay images/videos. Set "enabled":false to turn B-roll off, true to turn it on. Use "density" for "more"/"fewer" images. Put any content steering ("add a picture of X when I say Y", "remove the map", "use clips not photos") in "instruction". Omit "broll" entirely if unchanged.`
3. Rule L616: REMOVE "b-roll, " from the unsupported list so it reads
   `- If they ask for something not supported yet (music, sound effects, camera shake), explain that in "reply" and omit the unsupported directives.`
4. Parse: after `ti = ...` (L650) add:
   `br = data.get("broll") if isinstance(data.get("broll"), dict) else None`
5. Both early error returns (L623–624, L626–627): add `"broll": None,` to each dict.
6. Final return (L651): add `, "broll": br` before the closing brace.

## R3 — app.py `revise_job`: handle the broll directive
1. Parse block — AFTER the titles directive block (ends L319), add:
```python
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
```
2. need_full B-roll re-resolve (L337–342): pass `extra` AND clear when off:
```python
            if job["settings"].get("broll"):
                _stage(job_id, stage="Finding B-roll")
                job["overlay_plan"] = autoedit.resolve_overlays(
                    job["cutlist"], job["all_words"], job["settings"]["model"],
                    density=job["settings"].get("broll_density", "tasteful"),
                    style=job["settings"].get("broll_style", "auto"),
                    extra=job.get("broll_instruction", ""))
            else:
                job["overlay_plan"] = []
```
3. Dispatch: add a `changed_broll` branch BEFORE the `changed_fx` branch (L352).
   Running `_regrade_only` after re-resolving picks up effects + captions too
   (one composite pass), so this also covers a simultaneous fx/caption tweak:
```python
        elif changed_broll:
            if job["settings"].get("broll"):
                _stage(job_id, stage="Finding B-roll")
                job["overlay_plan"] = autoedit.resolve_overlays(
                    job["cutlist"], job["all_words"], job["settings"]["model"],
                    density=job["settings"].get("broll_density", "tasteful"),
                    style=job["settings"].get("broll_style", "auto"),
                    extra=job.get("broll_instruction", ""))
            else:
                job["overlay_plan"] = []
            _stage(job_id, stage="Re-rendering B-roll")
            _regrade_only(job)
```

## Contracts to preserve
- OUTPUT-timeline timing only (resolve_overlays already uses `_kept_words` inside the brain).
- `overlay_plan` is a list of composite-ready dicts (or `[]`); `_grade_to_roughcut`
  treats `[]`/missing as "no overlays → plain grade". Setting `[]` is how you turn off.
- f-string brace escaping in `revise_with_claude` (every literal `{`/`}` is `{{`/`}}`).
- B-roll is best-effort: `resolve_overlays` returns `[]` with no API key — must not raise.
- Don't break the elif dispatch chain (each branch mutually exclusive, as today).

## Verification block (run and report all)
1. `python -c "import autoedit, app, overlays, mediasource"` — imports clean.
2. `python -c "import inspect,autoedit; print('extra' in inspect.signature(autoedit.resolve_overlays).parameters)"` → `True`.
3. `python -c "import inspect,autoedit; print(inspect.signature(autoedit.revise_with_claude))"` — unchanged signature.
4. grep that `revise_with_claude` final return contains `"broll"`; that both error
   returns contain `"broll": None`; that the JSON contract string contains `"broll"`.
5. grep `revise_job` for `changed_broll` (appears in parse + dispatch) and that the
   need_full broll block now contains `extra=job.get("broll_instruction"`.
6. grep that the unsupported-items rule no longer contains the token `b-roll`.
7. `python test_plumbing.py` — still 19/19 (no regressions).
8. `git status` — only `autoedit.py`, `app.py`, and (new) `docs/phase4-roadmap.md` changed.

Report the verification output verbatim and any deviation from this roadmap.
