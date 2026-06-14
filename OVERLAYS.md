# capcut-autoedit — image / B-roll overlay research + roadmap

**Goal of this feature:** automatically drop **images and short B-roll clips** on top of
the talking-head rough cut at the right moments — the "when he says it, show it"
effect — so a flat face-to-camera clip becomes a retention-optimized, visually layered
short. This doc is the research dossier + the build roadmap. It's the overlay sibling of
[PLAN.md](PLAN.md).

Research done 2026-06-14 (4 parallel deep-research passes + `/watch` breakdowns of real
viral talking-head news shorts). Sources are inline at the end of each section.

---

## 0. TL;DR / decisions

- **This is very buildable** and slots cleanly into the existing pipeline. The hard part
  (word-level timestamps mapped onto the post-cut output timeline) is **already done** by
  `_kept_words()` in `autoedit.py:543`. Overlays are "just" a second Claude decision +
  an ffmpeg overlay pass placed **before** caption burn-in.
- **Image source: Pexels first, Pixabay as the legal-safe fallback.** Pexels is the only
  free API with genuinely good **vertical video** B-roll; Pixabay requires **zero
  attribution** so it's the safest to ship. Unsplash (photos only, mandatory
  attribution+UTM+download-ping) and Openverse (archival, per-asset attribution) are
  deprioritized — skip for v1.
- **Higgsfield / AI generation: NOT for inline B-roll.** The official Higgsfield OAuth MCP
  *does* exist (`mcp.higgsfield.ai/mcp`), but at ~30s latency and $0.09–$0.57 per asset it's
  far too slow/expensive for the 5–15 visuals-per-minute cadence we need. Free stock is
  instant, free, and more literal/reliable. Reserve AI gen for a later "no stock match →
  generate one" fallback, and if so use a **fast keyless** generator (Pollinations) not
  Higgsfield. Decision: **stock-only for v1.**
- **The brain decides overlays, same as it decides cuts.** A new Claude call takes the
  transcript and returns a list of `{phrase, time, query, format, duration}`. The fetcher
  + ffmpeg are dumb executors.

---

## 1. Placement science — the rules an algorithm can follow

This is the editorial "where do images go" question, reduced to numbers. **Confidence
note:** the cadence + safe-zone numbers are well-corroborated across independent sources;
the exact lead/lag milliseconds and the retention percentages are creator/vendor
heuristics (industry lore, plausible direction), not peer-reviewed. Treat the first set as
defaults to ship, the second as tunable.

### Timing
- **Lead:** show the overlay **~250 ms BEFORE** the trigger word starts (range 200–500 ms).
  The eye registers the image slightly before the ear connects the word → feels synced.
  `overlay_start = trigger_word.start − 0.25s`.
- **Hold duration:** default **1.5–2.5 s**. **Hard floor 1.2 s** (below this the brain reads
  it as noise and tunes out). **3–4 s** for numbers/stats/reveals/emotional beats.
- **Exit:** ~200–500 ms after the phrase ends.

### Cadence / density (the single most useful rule)
- Target a **visual change every 1.5–2 s** → **5–7 visual-change events per 10 s**.
- **< 4 / 10s = reads as slow**, retention drops. **> 8 / 10s = reads as chaotic noise.**
- A "visual change" is ANY of: image cutaway, B-roll, hard cut, **punch-in zoom on the
  talking head**, text-overlay swap. So we don't need a brand-new image every 1.5 s —
  alternating real B-roll with cheap punch-in zooms on the A-roll satisfies cadence.

### Which words trigger an overlay (score them; don't overlay everything)
Run NER + POS over the transcript, score each word, then **gate by cadence** (pick the
single highest-scoring trigger inside each ~1.5–2 s window; never fire two inside the 1.2 s
floor).

| Trigger | Score | Treatment |
|---|---|---|
| Proper nouns — people / places / brands / products | HIGH | image or lower-third ID |
| Concrete objects ("pizza", "rocket", "passport") | HIGH | full-screen cutaway, the prototypical case |
| Numbers / stats / money / dates | HIGH | 3–4 s hold + on-screen number text |
| List items / enumerations | HIGH | rapid sequential cutaways (satisfies cadence) |
| Comparisons / contrasts ("X vs Y") | HIGH | split-screen or two sequential images |
| Emotional beats / reactions | MED | reaction image OR slow Ken-Burns hold |
| Abstract concepts (no concrete referent) | LOW/SKIP | skip, or text-behind-subject; forcing a literal image = generic-stock cringe |
| Function words / filler / hedges | SKIP | — |
| Hook / punchline / direct-address face moments | SKIP | let the A-roll breathe |

Governing principle: **"if someone says it, show it"** — the overlay should illustrate
*exactly* what's being said at that instant, not something vaguely related.

### Overlay formats (and when each is right)
- **Stacked / top-zone** (image fills the top ~55%, presenter reframed into the bottom ~45%)
  — **the recommended DEFAULT for talking-head/commentary** (this is the Dylan Page format,
  §5). Keeps the creator's face on screen for trust while still showing rapid topical images.
  Costs a base-video reframe (scale A-roll into the bottom band) — see roadmap Phase 3.
- **Full-screen cutaway** (image covers the whole frame, audio continues) — use as an
  occasional accent when the visual *is* the point and the face isn't load-bearing, or for
  big reveals. Bold but hides the speaker, so not the default for commentary.
- **Lower-third** — identifying a person/place/brand. Must sit **above** the caption band.
- **Picture-in-picture / corner** — "react to this reference" (a tweet, chart, product)
  while the speaker stays visible.
- **Split-screen** — comparisons / before-after / X-vs-Y.
- **Text-behind-subject** — topic intros, or a good substitute when an abstract concept
  can't be literally illustrated (needs subject segmentation — later).
- **Always keep captions visible** — overlays must respect the caption band ("caption-aware").

### Entrance / exit animation
- **Stills ALWAYS get motion (Ken Burns slow zoom) — never a frozen frame.** This is the
  one near-universal, defensible rule. A static still on screen looks amateur.
- **Hard cut** for fast high-cadence sequences (most TikTok energy).
- **Fade / Ken Burns** for emotional or 3–4 s holds.
- Punch-in zoom on the A-roll counts toward cadence for free.

### Platform safe zones — vertical 1080×1920
Keep faces / text / numbers / logos inside these margins (configurable; platforms shift UI):
- **TikTok:** clear top ~140 px (~7%), **bottom ~320 px (~17%)**, left ~60 px, right ~160 px (~12%).
- **Reels:** bigger bottom reserve — top ~220 px, **bottom ~420 px**. Design to this if cross-posting.
- **Universal safe box:** roughly central **60–960 px wide × 220–1500 px tall**.
- Our captions already sit at `out_h*0.82` (lower third) / `out_h*0.16` MarginV — overlays
  and lower-thirds must not collide with that band.

### Retention data (directional, vendor-sourced — not gospel)
- Pattern interrupts every ~4 s → ~58% retention vs ~41% static (≈+17 pts).
- Scene changes → ~+32% retention; jump cuts → +10–15 pts watch time.
- First 3 s: ~65% drop off if not hooked → argues for an early visual.
- 60%+ retention triggers strong algorithmic distribution.

_Sources: aibrify.com short-form pacing guide; captions.ai B-roll guide; opus.pro retention
data; ignitesocialmedia.com & houseofmarketers.com safe-zone guides; descript/wikipedia Ken
Burns; capcut.com text-behind-subject. Caveat: 58/41 retention figure traces to a single
repeated vendor claim; lead/lag ms are heuristics._

---

## 2. Image / B-roll source APIs

Researched Pexels, Pixabay, Unsplash, Openverse. **Per your call, prioritizing free stock +
(noting) Higgsfield MCP; AI generators deprioritized.**

| | **Pexels** ⭐ primary | **Pixabay** ⭐ fallback | Unsplash (skip v1) | Openverse (skip v1) |
|---|---|---|---|---|
| Signup | instant key | instant key | prod-approval review | none (anon) |
| Free limit | 200/hr, 20k/mo | 100 / 60s | 50/hr demo, 1000/hr prod | ~100/day anon |
| Photos | curated, great | large, mixed quality | premium | archival |
| **Free video** | **YES — best (4K MP4, native portrait)** | yes, thinner/variable | **NO** | **NO** |
| Vertical 9:16 | `orientation=portrait` | `orientation=vertical` | `orientation=portrait` | `aspect_ratio=tall` |
| **Attribution** | requested (keep a Pexels link) | **NONE — cleanest** | mandatory + UTM + download-ping | per-asset |
| Auth placement | `Authorization:` **header** | `key=` query | `client_id=` query | optional bearer |

**Why Pexels first:** only one with good free **vertical video** B-roll (the killer feature
for talking-head shorts), first-class portrait filter, generous limits, instant key, minimal
attribution burden. **Why Pixabay second:** zero-attribution = safest to ship; good for
backfill when Pexels has no match. **Caching is contractual for Pixabay** (cache results 24h,
don't permanently hotlink — we download + composite anyway, so fine).

### Example requests
```
# Pexels portrait video, Full HD   (header: Authorization: YOUR_KEY)
GET https://api.pexels.com/v1/videos/search?query=house%20for%20sale%20sign&orientation=portrait&size=medium&per_page=15
# Pexels portrait photo
GET https://api.pexels.com/v1/search?query=real%20estate&orientation=portrait&size=large&per_page=20
# Pixabay vertical photo, safe
GET https://pixabay.com/api/?key=YOUR_KEY&q=housing+market&image_type=photo&orientation=vertical&safesearch=true&per_page=30
```

### Query strategy: transcript phrase → good asset
1. **Don't search the raw phrase.** Extract concrete depictable nouns; drop stopwords;
   lemmatize. "the housing market crashed" → `["house for sale sign", "real estate",
   "stock market crash chart", "downward red graph"]` (concrete→abstract). A cheap LLM
   keyword→visual mapping ("crashed" → "downward red graph") hugely improves hit quality —
   **and the brain (Claude) is already in the loop, so it can emit the search query directly.**
2. **Always filter at the API:** `orientation=portrait`, `per_page=15–30`, photo-only on Pixabay, safesearch on.
3. **Fallback cascade:** most-concrete query → broader → generic category; then across
   providers: Pexels video → Pexels photo → Pixabay.
4. **Pick among results:** require true vertical (`height/width ≥ 1.4`), min resolution
   (height ≥ 1280), don't always take result #0 (variety — pick randomly among top N),
   **de-dupe** used asset IDs within one video.
5. **Cache** by `(provider, query, orientation)` to stay way under rate limits.

**Gotchas:** Pexels key goes in the **header** (query-string = 401); Pixabay 24h-cache rule;
always SFW-filter auto-derived queries; read `X-Ratelimit-Remaining` + backoff on 429.

_Sources: official API docs for Pexels, Pixabay, Unsplash, Openverse; Pixabay license/ToS;
Unsplash API guidelines; shotstack stock-API comparison._

---

## 3. AI generation / Higgsfield — researched, deferred

- **Higgsfield is a cinematic AI *video* generator** (famous for camera-motion presets) that
  also does text-to-image. **It has a real public API and an OFFICIAL OAuth MCP server**
  (`https://mcp.higgsfield.ai/mcp`, add as a Claude connector, ~30+ models incl. Sora2/Veo/
  Flux/Soul). Community MCPs also exist. **So connectivity is NOT the blocker.**
- **Fit verdict: impractical for inline auto-B-roll.** Image gen ~30 s/request; video 30 s–
  several min; async/queued. Cost ~$0.09–$0.19/image, $0.13–$0.57 per 5 s clip. A 60 s clip
  needing 5–15 visuals = minutes of gen + $0.45–$2.85 just for images, vs **free + instant**
  stock. AI also hallucinates; for "show the literal noun he just said," a stock lookup is
  more reliable. Higgsfield's actual strength (camera motion on a hero shot) is wasted on
  quick cutaways.
- **If we ever add generation** (concept shots with no stock match), do it **pre-render /
  async**, and use a **fast keyless** option: **Pollinations.ai** (free, no key, URL-based,
  ~few sec) or **Cloudflare Workers AI** (10k neurons/day free, cents/image). Higgsfield is
  the wrong tool for this job.

_Sources: higgsfield.ai/mcp + /camera-controls; mcp.directory Higgsfield guide; apidog
Higgsfield API; higgsfield-ai GitHub SDKs; pricing (imagine.art, flowith); pollinations &
cloudflare workers-ai docs._

---

## 4. ffmpeg implementation — tested filter patterns

Full snippets live in the research notes; the essentials the builder needs:

- **Invoke ffmpeg via `subprocess.run([...])` (list, `shell=False`)** — then the
  `filter_complex` string is one argv element and the `enable='between(t,2,5)'` single
  quotes pass through verbatim **with no Windows quote hell.** `autoedit.py` already does this.
- **Full-screen cutaway, fill without distortion:**
  `[1:v]scale=W:H:force_original_aspect_ratio=increase,crop=W:H,setsar=1[ov];
  [0:v][ov]overlay=0:0:enable='between(t,2,5)'[v]`. `setsar=1` is mandatory (SAR mismatch
  breaks/squishes overlay).
- **Ken Burns on a still (`zoompan`):** pre-upscale the source ~4× first (kills the integer
  pan jitter), set `fps=`, `d`=frames (`seconds = d/fps`), center with
  `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`.
- **Fade in/out:** `format=yuva420p` **before** `fade=...:alpha=1`; `fade st=` is in the
  clip's OWN timeline; then `setpts=PTS-STARTPTS+START/TB` to place on the base timeline.
- **Video B-roll:** trim (`-ss`/`-t` or `trim`), **`setpts=PTS-STARTPTS`** to reset
  timestamps (the #1 B-roll bug), `fps=` to match, and simply **don't `-map` its audio** to
  mute it.
- **Chain many overlays in ONE pass** (each overlay's output label = next overlay's base):
  decode base once, encode once. Input `k` (0-based overlay) = ffmpeg input `[k+1:v]`
  (off-by-one is the classic bug). A Python filtergraph-builder for a variable number of
  overlays is in the notes — `";".join(stages)`, `",".join(filters-in-stage)`.
- **Order: overlays FIRST, captions LAST** (captions must sit on top so they stay readable
  during a cutaway). Ideally one pass: all overlays → `subtitles=` as the final stage.
- **Perf:** `-c:a copy`, `libx264 -preset veryfast -crf 20` draft / `medium -crf 18` final,
  `-pix_fmt yuv420p`, fixed `-r`. (nvenc note: `overlay_cuda` doesn't support `enable` — keep
  overlays on CPU.)

_Sources: ffmpeg.org filters docs; trac.ffmpeg.org FilteringGuide; mko.re & bannerbear Ken
Burns; pesky.moe fade slideshow; dev.to timed overlay; NVIDIA forum overlay_cuda enable bug._

---

## 5. What real viral talking-head shorts actually do (`/watch` findings)

Two real talking-head news shorts analyzed frame-by-frame via `/watch`.

**Sample A — low-prod commentary (BruceUnfiltered, "UK Censorship", 153 s, 11.7% like-rate).**
Format: static talking head + a **persistent lower-third news-card** (source screenshot +
headline thumbnail, lower-LEFT, ~40% frame width) parked for the first ~half, then gone.
Takeaway: even a one-person commentary uses a **"show the source"** reference card — a cheap,
high-trust overlay (a screenshot/thumbnail of the thing being discussed) that's easy to
auto-generate from a proper-noun trigger. Low cadence; not the polished style.

**Sample B — Dylan Page, "Africa Wants A New Map!" (70 s, 83K views, 5.5% like-rate) — THE
reference for this feature.** Frame-by-frame, his format is unmistakable and *directly the
thing we want to automate*:
- **Presenter is pinned to the BOTTOM ~third and NEVER covered** (head + shoulders, with the
  News Daddy logo on the left edge). His face stays on screen the whole time.
- **The top ~55–60% of the vertical frame is a persistent "image zone"** that swaps a NEW
  topical image **almost every frame (~every 2–3 s)** — i.e. right in the 5–7-changes/10s
  band from §1. Over 70 s that's ~20+ distinct visuals.
- Images are **topic-literal** (a maps story → glowing Africa maps, world maps, a globe,
  comparison maps with countries colored to scale) and **frequently carry a TITLE/headline
  bar** ("CORRECT THE WORLD MAP", "MERCATOR MAP PROJECTION", "AFRICAN UNION", "HOW BIG IS THE
  TRUE SIZE") — a label the editor adds, not part of the source image.
- **News-article screenshots appear with the key sentence HIGHLIGHTED** (yellow marker) — the
  "evidence" overlay, proving the claim while he narrates it.
- Burned-in word captions run the whole time, low in the frame.

**The format lesson that changes our default:** the most replicable, commentary-friendly
layout is **NOT** the full-screen cutaway (which hides the face). It's the **"stacked"
layout — image zone on top, presenter anchored at the bottom.** This keeps the creator on
screen (essential for UGC/commentary trust) *and* hits the rapid-cadence image requirement.
Full-screen cutaways become an occasional accent, not the default. Two overlay sub-types do
most of the work and are both auto-generatable:
1. **Top-zone topical image** (stock photo / map / diagram) with an optional **title bar**
   (we can render the trigger phrase as the label).
2. **Highlighted article-screenshot** "evidence" card for proper-noun / claim triggers.

---

## 6. Roadmap — phased, mapped to the existing pipeline

The current flow (`autoedit.py:main`): probe → audio → transcribe (word ts) → Claude cut →
snap/clean → **render** → SRT → optional **burn captions**. Overlays insert a new stage
**between render and caption burn-in**, and reuse `_kept_words()` for output-timeline timing.

### Phase 0 — plumbing & a manual proof (no AI, no API)
- New module `overlays.py`. Add `fetch/` cache dir + `out/overlays/` debug dump.
- Implement the **ffmpeg overlay pass**: given the rendered `roughcut.mp4` + a hand-written
  list `[{path, start, end, format, kenburns, fade}]`, composite all overlays in **one pass**
  on the **output** dims (use `probe(out_mp4)` like the caption stage already does).
- Wire ordering: `render → overlay pass → (optional) caption burn`. Captions last.
- **Gate:** hand a couple of local PNGs + a JSON list, confirm a clean composited cut.
  This de-risks all the ffmpeg syntax before any AI/API is involved.

### Phase 1 — stock fetcher (Pexels + Pixabay)
- `mediasource.py`: `search(query, kind, orientation) -> local_file`. Pexels first
  (photo+video), Pixabay fallback. Key in header for Pexels. Portrait filter, per_page~20.
- Result selection: vertical check (`h/w≥1.4`), min-res gate, top-N random pick, de-dupe.
- Disk cache keyed by `(provider, query, orientation)`; 429 backoff; SFW filter.
- Keys via `.env` / env vars (document in README; never commit).
- **Gate:** `python mediasource.py "rocket launch"` saves a good vertical clip.

### Phase 2 — the brain picks the overlays
- New Claude call `decide_overlays_with_claude(transcript, cutlist)` (mirror
  `decide_cuts_with_claude`, same headless-CLI/Max-plan path). Returns JSON:
  `[{"phrase","trigger_time","query","format","duration","emphasis"}]`.
- Prompt encodes §1 rules: score triggers (proper nouns/objects/numbers/lists/comparisons),
  **skip** abstract/filler/hook moments, respect the **5–7/10 s cadence** + **1.2 s floor**,
  emit a **concrete visual search query** per overlay (Claude does the keyword→visual mapping),
  choose `format` (cutaway default / lower-third for names / split for comparisons).
- Map `trigger_time` onto the **output timeline via `_kept_words()`**, apply −0.25 s lead,
  clamp durations, resolve overlaps so two don't fire inside the floor.
- **Gate:** dump the decided overlay plan as JSON for a real clip; eyeball that the triggers
  are sane before fetching.

### Phase 3 — end-to-end + polish
- Stitch it all: decide → fetch each query → Ken-Burns/fade per format → one-pass composite →
  captions. New flags: `--broll` (on/off), `--broll-density`, `--broll-source pexels|pixabay`,
  `--broll-style stacked|cutaway|mixed`.
- **Implement the STACKED layout (the recommended default, §5).** ffmpeg recipe: scale the
  base talking head into the bottom band (`scale=W:H*0.45`, place at `y=H*0.55`), fill the
  freed top with a dark/blurred backdrop, then overlay the topical image (Ken-Burns) into the
  top ~55% region. Optional **title bar**: `drawtext` the trigger phrase across the top of the
  image (this is the "MERCATOR MAP PROJECTION"-style label Dylan Page uses). For commentary
  shot full-frame, the reframe is what frees the top zone — verify the speaker still reads at
  45% height; if the source already has headroom, a partial top-overlay may suffice.
- **Ken Burns on every still by default** (§1 rule). Stills get motion; video B-roll gets
  fps-normalized + muted.
- **"Evidence" overlay** (Phase 3.5, optional): for proper-noun/claim triggers, fetch/screenshot
  a source and show it with the key line highlighted (Dylan Page's article-card pattern).
- Respect safe zones (lower-thirds and title bars above the caption band).
- **Gate:** full run on Jason's real clip; judge whether the images land on the right words.

### Phase 4 — chat-editor integration (`app.py`)
- Teach `revise_with_claude` about overlays (today it explicitly says it *can't* do B-roll,
  `autoedit.py:343`). Add an `overlays` field to its JSON contract so revisions like
  *"add a picture of the rocket when I say launch"*, *"fewer images"*, *"remove the map
  overlay"* work conversationally.
- Cache fetched media across revisions (like the transcript cache) so tweaks don't re-fetch.

### Later / optional (not v1)
- **Punch-in zoom on A-roll** as a cadence filler between real B-roll (cheap, no API).
- **Text-behind-subject** + lower-third graphic styling (needs subject matting).
- **AI-gen fallback** for no-stock concepts (Pollinations async), never Higgsfield inline.
- **Tier-2 FCPXML**: emit overlays as separate timeline tracks instead of flattening, so
  they're editable in CapCut.

### Branch / isolation
Per the devlog, overlays and the planned **zoom** feature BOTH touch the render pipeline →
build this on a **`feature/overlays` branch / worktree** to stay merge-safe with `feature/zoom`.

---

## 7. Honest risks / catches
- **Relevance is the whole game.** Bad/generic stock on an abstract word looks worse than no
  overlay. Mitigation: the brain skips abstracts, emits concrete queries, and we keep density
  conservative (lean toward fewer, well-matched overlays than many mediocre ones).
- **Timing drift:** overlays must use the **post-cut output timeline** (`_kept_words`), never
  raw input times — easy to get wrong, will look "off" if so.
- **Render cost:** the overlay pass re-encodes video (concat stream-copy no longer applies).
  Expect the slowest stage. One-pass compositing keeps it to a single encode.
- **Licensing:** Pexels keep-a-link + Pixabay no-attribution are clean for burned-in B-roll;
  avoid Unsplash's UTM/download-ping burden for v1; never scrape.
- **API keys** are required for stock — a small onboarding cost (free signup). Document it.

## 8. Open decisions for Jason
1. **v1 = images only, or images + video B-roll?** (Video looks more pro but is heavier to
   fetch/render; Pexels makes both easy.)
2. **Overlay density default** — conservative (every ~4–5 s, "tasteful") vs aggressive
   (5–7/10 s, "TikTok energy")?
3. **Default format** — research says **stacked / top-zone** (Dylan Page style, keeps your
   face on screen, §5) is the best default. Confirm, vs starting simpler with full-screen
   cutaways (less ffmpeg work but hides your face). Stacked needs the base-video reframe.
4. **Title bars on overlays?** Dylan Page labels most images with a headline bar — want the
   tool to auto-render the trigger phrase as a label, or keep images clean?
