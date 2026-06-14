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
- `--caption-style {pop,highlight,oneword}` — pop = active word bounces in;
  highlight = active word changes color; oneword = one big centered word at a time.
- `--caption-font {Anton,Bebas Neue,Montserrat,Arial Black,Impact}` — the first
  three are bundled in `fonts/` (OFL); the last two come from the OS.
- `--caption-highlight {yellow,green,cyan,red,white}`
- `--caption-pos {lower,center}` (for pop/highlight)

All of these are also exposed in the web UI when "Burn animated captions" is checked.

## Max plan / no API key

This tool uses the `claude` CLI in headless mode — it bills your **Claude Max
subscription**, NOT the Anthropic pay-per-token API. No `ANTHROPIC_API_KEY` is
needed or used. You must be logged in to the CLI (`run claude` interactively at
least once to authenticate).

## Disclaimer

This produces a **rough cut, not a final edit**. Whisper + Claude get roughly
80-90% of the obvious cuts right; you refine the rest in CapCut.
Best for commentary and talking-head content; less useful for music-driven edits.
