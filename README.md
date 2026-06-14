# capcut-autoedit

AI auto-editor for talking-head footage. Ingests a single video file and
produces a rough cut with filler words, false starts, long silences, and
bad takes removed — plus word-accurate captions.

**Output:** `out/roughcut.mp4` + `out/captions.srt`  
Import both into CapCut and refine from there.

There's also a **localhost web UI with a chat editor** — run `python app.py`,
open http://127.0.0.1:5000, drag a clip in, and edit it. A preview plays on the
left and a chat panel sits on the right: type instructions before editing, then
keep chatting to revise — "keep the intro", "cut the first 5 seconds", "make the
captions Bebas Neue", "one word at a time". The transcript is cached per job, so
re-cuts only re-render and caption tweaks are near-instant.

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
