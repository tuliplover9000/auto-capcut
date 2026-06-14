# capcut-autoedit

AI auto-editor for talking-head footage. Ingests a single video file and
produces a rough cut with filler words, false starts, long silences, and
bad takes removed — plus word-accurate captions.

**Output:** `out/roughcut.mp4` + `out/captions.srt`  
Import both into CapCut and refine from there.

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

## Max plan / no API key

This tool uses the `claude` CLI in headless mode — it bills your **Claude Max
subscription**, NOT the Anthropic pay-per-token API. No `ANTHROPIC_API_KEY` is
needed or used. You must be logged in to the CLI (`run claude` interactively at
least once to authenticate).

## Disclaimer

This produces a **rough cut, not a final edit**. Whisper + Claude get roughly
80-90% of the obvious cuts right; you refine the rest in CapCut.
Best for commentary and talking-head content; less useful for music-driven edits.
