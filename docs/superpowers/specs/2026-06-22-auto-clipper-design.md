# Auto-Clipper Mode — Design

**Date:** 2026-06-22
**Status:** Approved (brainstorming) → ready for implementation plan
**Component:** capcut-autoedit (`C:\Users\zhrui\Code\capcut-autoedit`)

## Summary

Add an **auto-clipper mode**: feed in a long-form video (where the user is *not*
on camera — they're repurposing other people's content: podcasts, talks,
interviews, gameplay/commentary, etc.), automatically find the best
self-contained highlight moments by reading the transcript, present them as a
ranked candidate list, let the user pick which ones to keep, and render each
selected moment as a vertical **9:16** short with burned-in word-by-word
captions, ready to post to TikTok / Reels / YouTube Shorts.

This is **repurposing**, not editing the user's own rambly takes — so clips stay
**verbatim**: precise in/out points + trimmed end-silence only, *no* aggressive
internal cutting, *no* B-roll, *no* zoom.

## Decisions (locked during brainstorming)

| Decision | Choice | Notes |
|---|---|---|
| Primary content | Spoken-first, must degrade gracefully on mixed/low-speech | Transcript-driven detection |
| Highlight detection | **Approach A** — single windowed Claude pass + deterministic boundary-snap | B (scout+refine) and C (audio-energy hybrid) documented as v2 upgrades |
| Vertical framing | **Fit + blurred background** only | Nothing ever cropped; classic TikTok-repost look. Center-crop/auto are out of scope v1 |
| Workflow | **Analyze → review candidate list → user picks → render selected** | Two-phase job |
| Captions | **On by default, word-by-word** (existing `write_ass` "pop"/highlight style) | Reuses existing engine; no new caption style |
| UI surface | **Separate mode** ("Edit a clip" vs "Auto-clip a long video" switch) | Two flows stay distinct |
| Clip length bounds | 15–90s | Clamped during boundary-snap |
| Candidates surfaced | Top ~12 by score | Top ~3 pre-checked in UI |
| Per-clip title | Shown in UI to copy as the post caption | Comes from the highlight detector |

## Architecture

### New code (in `autoedit.py`)

#### `find_highlights(transcript_text, all_words, total_duration, model="sonnet", window_s=240, overlap_s=30)`

The core new piece. Returns a ranked list of candidate clips:
`[{start, end, dur, title, hook, score, reason}, ...]` (output-timeline seconds).

Steps:
1. **Window the transcript** into overlapping ~`window_s` (240s) chunks with
   `overlap_s` (30s) overlap, so a moment sitting on a window boundary isn't
   split. Each window carries its word list + light timestamps.
2. **One `_claude_cli` call per window.** Prompt: "You are finding viral
   short-form clips in this transcript window. Return a JSON array of the best
   self-contained moments — a complete thought with a hook, ideally 15–90s. For
   each: `start_phrase` (verbatim first ~6 words), `end_phrase` (verbatim last
   ~6 words), `title`, `hook`, `score` (1–100), `reason`." stdin = the window's
   transcript text with light per-line timestamps.
3. **Map phrases → word timestamps** via the existing fuzzy difflib matcher
   (same approach as `_map_clean_to_spans`). If either phrase fails to map, drop
   that candidate.
4. **Boundary-snap (deterministic):** start → first word of the containing
   sentence (or the matched start word); end → matched end word + 0.3s tail;
   trim leading/trailing silence using inter-word gaps; clamp duration to
   **[15, 90]s** (if longer, keep the first 90s from the start).
5. **Dedup across windows:** if two candidates overlap >50%, keep the
   higher-scored one.
6. **Rank** by score, return the top ~12.

Each window call is **best-effort**: a failed/timeout window is skipped and the
others still contribute. Because windows are small, each call stays well under
the 300s `_claude_cli` timeout — this is what kills the long-form timeout wall.

#### `render_clip_vertical(input_path, start, end, spec, out_mp4, tmpdir)`

One ffmpeg pass: trim `[start, end]`, build a 1080×1920 frame =
**blurred-cover background** (source scaled to *cover* 1080×1920, cropped,
boxblurred + slightly darkened) + **foreground** (source scaled to fit width
1080, centered), overlaid. Keep the audio (`0:a?`). Even-dimension guard and
HLG/color re-stamp reused from `overlays.composite`. Output is the trimmed,
reframed clip with audio, ready for caption burn.

### Reused as-is

`probe`, `extract_audio`, `transcribe`, `build_transcript_text`, `_claude_cli`,
the fuzzy phrase→span matcher, `write_ass([(start, end)], all_words, 1080, 1920,
…)` (already rebases caption timing to the output/cut timeline → captions start
at 0 for a clip taken from mid-video), and `burn_captions`.

## Data flow — two-phase job (`app.py`)

**Phase 1 · Analyze** (new job type, distinct from `run_job`):
`probe → extract_audio → transcribe → build_transcript_text → find_highlights`
→ store `candidates` on the job → return the list to the UI. **No rendering.**

**Phase 2 · Render selected:** UI POSTs the checked candidate indices. For each:
`render_clip_vertical` → `write_ass(cutlist=[(start,end)], all_words, 1080, 1920)`
→ `burn_captions` → save `outputs/clip_NN.mp4`. Rendered **sequentially** (each
clip is short); per-clip progress reported.

## UI — separate mode

A mode switch at the top of the page: **"Edit a clip"** (today's flow) vs
**"Auto-clip a long video"**. The clipper screen:

1. Uploader → **Find highlights** button → spinner (analyze phase).
2. Candidate **cards**: title, hook, `⏱ 12:04–12:48`, length, score; a checkbox
   per card; the top ~3 pre-checked.
3. **Render N shorts** button → per-clip progress.
4. Download tiles: each finished short + its **title text** (copy as your post
   caption).

Settings: caption on/off (default on); framing fixed to fit+blur in v1; clip
count surfaced (default top ~12).

## Error handling & degradation

- **Per-window best-effort:** a failed or timed-out window is skipped; the job
  continues with whatever the other windows produced.
- **Unmappable phrase:** that candidate is dropped (boundaries must be real).
- **Zero candidates:** friendly message — "couldn't find clear spoken highlights
  — is there enough speech in this video?" This is the mixed/low-speech graceful
  path. (Audio-energy detection — approach C — is the documented v2 upgrade for
  truly sparse-speech content.)
- **Per-clip render** wrapped in try/except: one bad clip is marked failed in the
  list; the rest still render.
- **Even-dim / color**: reuse the compositor's guards so reframed output is
  valid yuv420p and doesn't wash out.

## Testing

- **Unit — `find_highlights`:** mock `_claude_cli` to return canned JSON (the
  real CLI times out in-sandbox), then assert phrase→timestamp mapping, snap,
  dedup (>50% overlap), length clamp [15,90], and score ranking are
  deterministic. Same mocking pattern used for the SFX/cut tests.
- **Reframe — `render_clip_vertical`:** render a short synthetic 16:9 clip and
  assert the output is exactly 1080×1920, even dims, has an audio stream, and
  duration ≈ the requested clip length.
- **Captions:** assert ASS event times start near 0 for a clip taken from
  mid-video (timeline rebasing works).
- **Flask:** phase-1 analyze returns a candidate-list JSON; phase-2 render
  produces the expected files; the mode switch is present on the page.
- **deepbuild adversarial playtest** (Sonnet) before shipping.

## Out of scope (v1)

Center-crop / auto framing; audio-energy highlight detection (approach C);
internal clip tightening; B-roll / zoom in clipper mode; vertical face-tracking;
multi-language. These are noted as future upgrades, not part of this build.
