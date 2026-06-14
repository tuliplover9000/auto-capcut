# Image / B-roll Overlays — build roadmap (revised for the current pipeline)

Supersedes the build-roadmap section in `OVERLAYS.md` (which is still the research
dossier). This version is reconciled with the pipeline as it stands after the
zoom / effects / clean-captions / titles work landed on `main`. Read
`docs/reel-style-study.md` too — its overlay findings (the "behind the person"
look is a **zone composite, not rotoscoping**) confirm the layout choice here.

## What this is
Auto image + short-video B-roll on top of the talking-head rough cut — "when he
says it, show it." Default layout = **stacked top-zone** (topical media fills the
top ~55%, presenter reframed into the bottom ~45%, face always visible). No
rotoscoping (the reels don't use it; a zone composite gets ~95% of the look).

## Locked decisions (unchanged, from Jason)
- Both stills AND short video B-roll (Pexels does both).
- Tasteful density: a visual change ~every 4–5s, not max cadence. Fewer, well-matched.
- Default = stacked/top-zone; full-screen cutaway is an occasional accent only.
- Auto title-bar labels ON (toggleable) — the trigger phrase as a headline on the image.
- Rotoscoping: **fallback / not v1** (confirmed unnecessary by the reel study).

## Source (unchanged)
- **Pexels primary** (photo + video). Key in the `Authorization:` HEADER, `orientation=portrait`, ~200 req/hr. Keep a Pexels credit somewhere.
- **Pixabay fallback** (no attribution). `orientation=vertical`, `safesearch=true`. Cache 24h, no hotlinking.
- Skip Unsplash/Openverse; **no AI generation** in v1.
- ⚠️ **First external API key in the project** (Claude runs key-free via the CLI). Document it in the README; load from `.env` (already gitignored). The tool must degrade gracefully (skip overlays + clear message) if the key is missing — same "fail clear" ethos as the Claude path.

---

## ⭐ Pipeline insertion — UPDATED (this is the big change vs v1)

The flow is no longer "render → captions." Current `main()` (autoedit.py) and the
app render path do:

```
render_video(... zoomplan=)  ->  base.mp4   (cut + camera zoom)
grade_video(...)             ->  roughcut.mp4  (vignette / grain / flash)
write_srt + burn_captions    ->  roughcut_captioned.mp4  (clean captions + titles)
```

Overlays slot **BEFORE the grade**, not just before captions:

```
base (cut+zoom)  ->  [OVERLAY PASS]  ->  grade (effects)  ->  captions/titles
```

Why before grade: vignette/grain must apply to the *whole* frame including the
overlay images, or the overlay looks crisp/ungraded against a graded base.

**Encode budget (important):** we already do render(per-seg encode) → concat(copy)
→ grade(encode) → captions(encode). Adding a naive overlay encode makes **4
sequential h264 passes** = visible quality loss. So:
- **Combine the overlay pass and the effects grade into ONE ffmpeg pass** (both
  are full-frame filter passes over `base.mp4`). Produce `roughcut.mp4` directly
  from `base.mp4` with overlays + vignette/grain/flash in a single `filter_complex`.
- Keep `+faststart` and **re-stamp HLG/HDR color** on that pass (see landmines).

### Accurate anchors in the current code (autoedit.py)
- `_kept_words(cutlist, all_words)` @ **L846** — maps words to the POST-CUT OUTPUT timeline (`new_start`/`new_end`). Overlay timing MUST use this, never raw input times.
- `render_video(input_path, cutlist, spec, out_mp4, tmpdir, zoomplan=None)` @ **L684** — writes the cut+zoom base.
- `grade_video(in_mp4, out_mp4, effects, boundaries, fps, color, tmpdir)` @ **L811** — the effects pass. **Overlays should be folded into this** (or a shared compositor it calls), so there's one encode. `_effects_vf()` builds its filter chain; the overlay branches prepend to it.
- `cut_offsets(cutlist)` @ **L778** — segment boundaries on the output timeline (used by flash; overlays use `_kept_words` for word-level timing).
- `_setparams_suffix(color)` @ **L663** — appends the `setparams=` that re-stamps HLG tags. **Reuse on the overlay+grade pass.**
- `probe(out_mp4)` returns true upright dims + `disp_width/disp_height` + `color` — use for layout math and the color re-stamp.
- `_claude_cli(prompt, stdin, model)` @ ~L210 and `_extract_json(s)` — the shared headless-Claude helpers (ANTHROPIC_API_KEY already popped). The overlay brain reuses these.
- `burn_captions(in_mp4, ass_path, out_mp4)` @ **L1236** — copies ALL bundled fonts + `fontsdir=.` Labels rendered via ASS ride this for free (see landmines).

### App path (app.py) — follow the established directive pattern
The app now has clean precedents to copy for overlays:
- `settings` dict in `/run` (add `broll`, `broll_density`, `broll_source`, `broll_style`, `broll_labels`).
- Per-job cached state like `zoomplan` / `titles` — add `overlay_plan` and a **media cache** (fetched files keyed by query) so revisions don't re-fetch.
- Worker wiring in `run_job` (decide overlays after `snap_and_clean`, like zoom/titles) and `revise_job` (an `overlays` directive, like `zoom`/`effects`/`titles`).
- `_render_outputs` builds base → grade; the overlay plan feeds the combined overlay+grade pass.
- `revise_with_claude` @ ~L501 currently lists b-roll as **unsupported** (L509). Replace that with an `overlays` field in its JSON contract (mirror the `effects`/`titles` directives) so "add a picture of X when I say Y", "fewer images", "remove the map" work in chat.

---

## Placement rules the brain follows (codified; Claude does it — no spaCy)
Claude reads the transcript and emits the plan in one call. The NER/POS ideas are
**prompt guidance**, not a separate library.
- **Lead:** overlay starts ~250ms before the trigger word (`trigger.new_start − 0.25s`, on the OUTPUT timeline).
- **Hold:** 1.5–2.5s default; 3–4s for numbers/stats/reveals; hard floor 1.2s.
- **Density:** ~1 overlay per 4–5s; never two inside the 1.2s floor.
- **Trigger scoring:** HIGH = proper nouns (people/places/brands), concrete objects, numbers/dates/money, list items, comparisons. SKIP = abstract concepts, function words/filler, and hook/punchline face moments.
- **Concrete queries:** Claude maps phrase → a *visual* query ("the market crashed" → "downward red stock graph"), picks format (stacked default / cutaway accent), and the label text.
- **Stills ALWAYS get a slow Ken-Burns zoom** — never a frozen frame.
- **Safe zones (1080×1920):** label bars clear of the top ~140px AND clear of the editorial-title zone (see collision note); presenter + captions live low.

---

## Phases

### Phase 0 — the compositor (de-risk first; no AI, no API)
New `overlays.py`. Given `base.mp4` + a hand-written list
`[{path,start,end,format,kenburns,fade,label}]` + the effects dict + color, build
**ONE** `filter_complex` that does overlays **and** the effects grade and outputs
`roughcut.mp4`.
- **Stacked layout, aspect-correct:** scale the presenter to FILL the bottom band (W × 0.45H) preserving aspect then **crop** (NOT a naive `scale=W:H*0.45`, which squishes). Fill the freed top with a dark/blurred backdrop; overlay the Ken-Burns image into the top ~55%.
- **Chaining:** each overlay's output label feeds the next; `setsar=1` on every branch (mandatory).
- **Ken Burns:** pre-upscale source ~4× before `zoompan` (kills jitter — same lesson as the zoom edge-shake), set `fps=`, `d`=frames, center the window.
- **Fade:** `format=yuva420p` before `fade=...:alpha=1`; clip-local `st=`; then `setpts=PTS-STARTPTS+START/TB` to place on the base timeline.
- **Video B-roll:** `-ss`/`-t` trim, `setpts=PTS-STARTPTS` (the #1 bug), `fps=` to match, do NOT map its audio.
- **Color:** append `_setparams_suffix(spec["color"])` to the chain (zoompan/overlay drop HLG tags → washed output otherwise) + `-movflags +faststart`.
- **Labels via ASS, not `drawtext`** (Windows `drawtext` hit fontconfig errors; we have a working ASS font pipeline). Emit label events into the same ASS the caption stage burns, OR a small dedicated ASS burned in this pass.
- **GATE:** 2–3 local PNGs + a clip + a JSON list → one clean stacked, graded, correctly-colored composite.

### Phase 1 — stock fetcher
`mediasource.py`: `search(query, kind, orientation) -> local_file`. Pexels first (photo+video), Pixabay fallback. Require true vertical (`h/w ≥ 1.4`, min height 1280), pick randomly among top N, de-dupe asset IDs per video, disk cache keyed by (provider,query,orientation), 429 backoff, SFW. Key from `.env`; **skip gracefully if absent.**
- **GATE:** `python mediasource.py "rocket launch"` saves a good vertical asset.

### Phase 2 — the overlay brain
`decide_overlays_with_claude(transcript, cutlist, all_words, model)` — reuse `_claude_cli` + `_extract_json`. Returns
`[{phrase, trigger_time, query, format, duration, label}]`. Prompt encodes the placement rules above. Map `trigger_time` → output timeline via `_kept_words`, apply −0.25s lead, clamp holds, resolve overlaps, enforce density.
- **GATE:** dump the plan as JSON for a real clip; eyeball trigger sanity before fetching.

### Phase 3 — end-to-end (CLI)
Wire decide → fetch each query → per-format Ken-Burns/fade → **combined overlay+grade pass** → captions/titles. Flags: `--broll`, `--broll-density` (default tasteful), `--broll-source pexels|pixabay`, `--broll-style stacked|cutaway|mixed` (default stacked), `--broll-labels` (default on).
- **GATE:** full run on a real clip; do images land on the right words, graded + colored correctly, captions on top?

### Phase 4 — chat editor (app.py)
Add the `overlays` directive to `revise_with_claude`; cache fetched media per job (like the transcript cache) so tweaks don't re-fetch; settings + UI checkbox + worker wiring mirroring `zoom`/`effects`/`titles`.

---

## Landmines (don't repeat this session's bugs)
1. **HLG color drop → washed output.** Any filter pass (zoompan/overlay/scale) drops `color_primaries`/`color_trc` on HLG phone footage. Re-stamp with `_setparams_suffix` on the overlay+grade pass. (We hit this twice already.)
2. **Encode stacking.** Fold overlay into the grade pass = one encode, not two. Consider `-crf 18` on intermediates.
3. **Stacked aspect.** Scale-to-fill + crop the presenter band; never `scale=W:H*0.45` (squish).
4. **Labels = ASS, not drawtext** (fontconfig on Windows).
5. **Title-zone collision.** The shipped `--titles` editorial layer already owns the top of the frame. Decide ownership or unify (a label *is* a title). At minimum, don't run auto-titles and overlay-labels in the same top band simultaneously.
6. **Output timeline.** All timing via `_kept_words`, never raw input timestamps.

## Branch / merge
`main` moved a lot this session (zoom, effects, clean captions, titles). **Rebase `feature/overlays` onto current `main` before building** — the integration points (`render_video(..., zoomplan=)`, `grade_video`, base/roughcut split, `_claude_cli`, `_setparams_suffix`) only exist on current main.

## Top risk
Relevance. Bad stock on an abstract word is worse than no overlay. Conservative density + skip-abstracts + concrete Claude queries is the mitigation. Treat the brain's query quality as the make-or-break and keep `--broll` opt-in until it's proven on real clips.
