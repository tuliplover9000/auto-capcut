# capcut-autoedit

AI auto-editor for talking-head footage. Ingests a single video file and
produces a rough cut with filler words, false starts, long silences, and
bad takes removed — plus word-accurate captions.

**Output:** `out/roughcut.mp4` + `out/captions.srt`  
Import both into CapCut and refine from there.

There's also a **localhost web UI** — run `python app.py`, open
http://127.0.0.1:5000. It has three modes:

**Edit a clip** (your own talking-head footage): drag a clip in and edit it with
a chat panel — "keep the intro", "cut the first 5 seconds", "make the captions
Bebas Neue". The transcript is cached per job, so re-cuts only re-render and
caption tweaks are near-instant. Toggles: camera zooms, B-roll (stock via
Pexels/Pixabay or **your own media** — drop files into the in-page library,
named by what they show), editorial titles, vignette/grain/flash, and **sound
effects** (whoosh on cuts + impact on emphasis — drop your own sounds into the
two slots under the toggle).

**Auto-clip a long video** (repurpose someone else's content): paste a
**YouTube URL** (downloaded server-side at ≤1080p via yt-dlp) or upload a long
video. It transcribes, scans the transcript in parallel windows for
self-contained highlight moments, and shows a **ranked candidate list** (title,
hook, timestamps, score). Check the ones you want → each renders as a vertical
**9:16 short** (whole frame fit over a blurred background) with word-by-word
captions burned in. Clips are kept verbatim — precise in/out + a small tail,
no internal re-cutting. Old job folders in `webjobs/` are swept automatically
after 3 days (`AUTOEDIT_KEEP_JOBS_DAYS` to change).

**Lyric video** (a clip you filmed **with the song playing in the room** — yoyo
tricks, dancing, b-boying): drop the clip in and type the song title/artist.
It pulls the song's **synced lyrics from lrclib.net** (free, no key), has
Whisper listen to the clip's own audio, fuzzy-matches the misheard sung words
against the LRC to recover **one constant offset**, then renders the lyrics
giant and faded **behind you** — per-frame person segmentation (rembg
`u2netp`) so you occlude the letters, one line at a time with 0.2s fades.
Nothing is cut and the audio is untouched; the clip passes through at full
length. If it can't hear enough of the song to sync, there's a **"clip starts
at (song time)"** box — type `0:42` and it skips Whisper entirely. No synced
lyrics on lrclib? It falls back to Whisper's own lines and says so. Needs
`rembg` (`pip install rembg onnxruntime`); the ~5MB `u2netp` model downloads
itself on first use. Rendering is the slow part — segmentation runs at roughly
5 frames/sec on lyric-visible frames, and frames with no line showing pass
through untouched.

> **Note:** the edit and auto-clip modes call the `claude` CLI for editing
> decisions (lyric mode does not — it's Whisper + lrclib only). If every
> analysis fails (or the UI says every Claude call errored), run `claude`
> interactively and sign in again — an expired login surfaces as 401s.

## Install note

Dependencies are assumed already installed globally:

- `imageio-ffmpeg` — bundled ffmpeg (no separate ffmpeg install needed)
- `faster-whisper` — speech-to-text with word timestamps
- `claude` CLI — the Claude Code CLI (must be logged in with a Max subscription)
- `fonttools` — used to measure word widths so the "pop" caption style places
  words at fixed positions (no reflow). Optional: falls back to estimated widths.

## Usage

```bash
python autoedit.py myclip.mp4
python autoedit.py myclip.mp4 --aggressiveness heavy
python autoedit.py myclip.mp4 --whisper-model small -o my_output_dir
python autoedit.py --selftest
```

### Burned-in animated captions (optional)

Add `--burn-captions` to also produce `out/roughcut_captioned.mp4` with
word-by-word highlighted captions baked onto the video (the active word pops to
a color). Ready to post as-is, but **not editable in CapCut afterward**.

```bash
python autoedit.py myclip.mp4 --burn-captions
python autoedit.py myclip.mp4 --burn-captions --caption-style oneword --caption-font "Bebas Neue"
python autoedit.py myclip.mp4 --burn-captions --caption-style pop --caption-highlight green
```

Options:
- `--caption-style {clean,pop,highlight,oneword}` — **clean** (default) = minimal
  static phrases (white, soft shadow, no outline) like a pro talking-head edit;
  pop = active word bounces in; highlight = active word changes color; oneword =
  one big centered word at a time.
- `--caption-font {Montserrat,Anton,Bebas Neue,Arial Black,Impact}` — default
  **Montserrat** (clean body look); Anton/Bebas suit the punchy styles. First
  three are bundled in `fonts/` (OFL); last two come from the OS.
- `--caption-highlight {yellow,green,cyan,red,white}`
- `--caption-pos {lower,center}` (for pop/highlight)

All of these are also exposed in the web UI when "Burn animated captions" is checked.

### Camera zooms (optional)

Add `--zoom` to let Claude add tasteful camera zooms, decided **per segment**.
Two modes (`--zoom-mode`):

- **`static`** (default) — matches the reference-reel look: a hard cut to a
  held, slightly closer framing ("two-framing"), used sparingly on hooks/
  emphasis. No movement within a clip. Subtle (~1.10–1.14).
- **`animated`** — continuous push-in / pull-out *during* the clip (more
  energetic). On request only.

```bash
python autoedit.py myclip.mp4 --zoom                      # static (default)
python autoedit.py myclip.mp4 --zoom --zoom-mode animated # moving zooms
```

When zoom is off the render is byte-for-byte unchanged from the no-zoom pipeline.
In the **web UI** there's a "Camera zooms" checkbox (on by default). It's
**chat-adjustable** — "more punch-ins", "no zoom on the intro", "make the zooms
animated", "calmer", or "turn off the zooms" and it re-plans and re-renders.

### Effects (optional)

A global "grade" pass with three toggles, applied over the cut+zoom video
(before captions, so text stays sharp):

```bash
python autoedit.py myclip.mp4 --vignette --grain --flash
```

- `--vignette` — subtle darkened edges (focus + mood)
- `--grain` — light film grain so it looks less digitally flat
- `--flash` — quick white flash on cuts (gated to ≥1.5s apart so fast edits don't strobe)

Each is a checkbox in the web UI and **chat-adjustable** ("add a vignette",
"turn off the grain", "put a flash on the cuts"). Effect toggles re-grade
cheaply without re-cutting.

### Editorial titles (optional)

Add `--titles` for big yellow hook/section title cards (condensed Anton + thick
black outline, top of frame), Claude-decided and sparse — a hook over the
opening plus a couple of section headers. Separate layer from the body captions,
so it works with any caption style (or on its own). Checkbox in the UI;
chat-adjustable ("add the big titles", "turn off titles").

```bash
python autoedit.py myclip.mp4 --titles
python autoedit.py myclip.mp4 --burn-captions --titles
```

## Max plan / no API key

This tool uses the `claude` CLI in headless mode — it bills your **Claude Max
subscription**, NOT the Anthropic pay-per-token API. No `ANTHROPIC_API_KEY` is
needed or used. You must be logged in to the CLI (`run claude` interactively at
least once to authenticate).

## Disclaimer

This produces a **rough cut, not a final edit**. Whisper + Claude get roughly
80-90% of the obvious cuts right; you refine the rest in CapCut.
Best for commentary and talking-head content; less useful for music-driven edits.
