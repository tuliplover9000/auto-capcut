# capcut-autoedit — build plan

**Goal:** An AI auto-editor for talking-head / commentary / UGC footage, like Eleven
Percent's "AutoEdit Creator Mode" (which lives inside Premiere Pro), but targeting
**CapCut**. It ingests a folder of raw clips and produces a rough cut with the bad
takes / repeats / long silences removed, plus captions — ready to refine in CapCut.

Built for a solo creator (beginner→intermediate). Keep it a simple Python CLI.

---

## Key facts established before this build (don't re-research from scratch)

- **CapCut has NO public plugin/automation API or official Python SDK** (confirmed
  2026). Its "Open Platform" can't drive timeline editing. So unlike Premiere
  (UXP/CEP plugin SDK), we CANNOT build a button-inside-CapCut plugin. Our tool is an
  **external program that hands CapCut a finished file.**
- Two ways to deliver an editable result into CapCut:
  1. **CapCut XML import** (added 2025): `File → Import → XML`, FCP-style XML →
     clips/cuts/markers come in as a real editable timeline. Robust, standard.
  2. **Draft-file generation**: CapCut stores each project as JSON on disk
     (`draft_content.json`). Library **pyCapCut** (github.com/GuanYixuan/pyCapCut) +
     a draft schema cheat-sheet exist. Most native, but brittle across CapCut
     versions and ToS-gray.
- The hard 80% (the "AI brain") is **editor-agnostic** and the stack is ALREADY
  installed system-wide (from the /watch + /factcheck work):
  - **ffmpeg** — bundled via the `imageio-ffmpeg` pip package. Get its path in Python:
    `import imageio_ffmpeg; ff = imageio_ffmpeg.get_ffmpeg_exe()`. (No ffmpeg on PATH.)
  - **faster-whisper** — installed. Supports **word-level timestamps**
    (`model.transcribe(audio, word_timestamps=True)`), which is what we need for cut
    points. Use model size `base` or `small` for accuracy; `tiny` for speed.
  - **Claude** — available via the Anthropic API for the "decide what to cut" step.
- Reference ingester to crib patterns from (UTF-8 console fix, ffmpeg path helper,
  robust subprocess wrapper, smart sampling):
  `C:\Users\zhrui\.claude\skills\watch\analyze.py`

---

## Architecture (the brain is the same regardless of editor)

```
folder of raw clips
   │
   ├─ 1. probe each clip (ffmpeg/ffprobe): duration, fps
   ├─ 2. extract audio (ffmpeg → 16k mono wav)
   ├─ 3. transcribe w/ faster-whisper, WORD timestamps
   ├─ 4. detect silences (ffmpeg silencedetect or gaps between words)
   ├─ 5. Claude: given the timestamped transcript, return the KEEP segments
   │        (drop filler/um/false starts/repeats/bad takes; keep clean takes in order)
   ├─ 6. build a CUT LIST = ordered [(clip, in_s, out_s)]
   ├─ 7. captions = kept words w/ timings → .srt
   └─ 8. DELIVER to CapCut (tier below)
```

## Build tiers — START AT TIER 1

- **Tier 1 (build first; ~1–2 sessions; ~80% of the value):**
  ffmpeg stitches the keep-segments into one rough-cut `.mp4` + writes `.srt`.
  Import both into CapCut and refine. Robust, no reverse-engineering. Downside: it's
  a single flattened clip, not separate timeline pieces.
- **Tier 2 (upgrade): FCPXML output** that CapCut imports as separate, trimmable
  clips. Captions may still ride along as the SRT. The sweet spot if Tier 1's
  flattening is annoying.
- **Tier 3 (most native, most fragile): pyCapCut** to generate a real CapCut draft
  with styled caption tracks. Closest to AutoEdit's "magic"; expect breakage on
  CapCut updates.

## Honest catches
- No in-app UX — it's a script you run, not a button in CapCut.
- Cut quality is "rough cut, not final" (same disclaimer AutoEdit itself makes);
  Whisper+Claude get ~80–90%, human refines the rest.
- Tiers 2–3 are version-fragile; Tier 1 is bulletproof.
- Best for commentary/UGC talking content; less useful for music-driven skits/fashion.

---

## First steps for the new session
1. `git init` here.
2. Decide Claude access for step 5: Anthropic API key (`pip install anthropic`) vs a
   local heuristic fallback. (API gives by far the best cut decisions.)
3. Build Tier 1: `autoedit.py <clips_folder> -> out/roughcut.mp4 + out/captions.srt`.
4. Test on a real talking-head clip; import into CapCut; judge cut quality.
5. Only then consider Tier 2 (XML).

_Stack note: ffmpeg + faster-whisper + yt-dlp are installed GLOBALLY, so they're
available here even though this is a fresh folder/repo._
