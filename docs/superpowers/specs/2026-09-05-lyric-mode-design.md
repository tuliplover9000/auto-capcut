# Lyric Mode — Design

**Date:** 2026-09-05
**Status:** Approved in chat (brainstormed 2026-09-05) → ready for implementation plan
**Component:** capcut-autoedit (`C:\Users\zhrui\Code\capcut-autoedit`)

## Summary

Third web-UI mode: **"Lyric video."** Input = a clip filmed **with the song
playing in the room** (e.g. yoyo tricks) + the song title/artist typed in.
Output = the same clip with the song's lyrics rendered **behind the person** —
giant, faded, one line at a time, synced to the music — using per-frame person
segmentation so the presenter occludes the letters. Original audio untouched.

Proven on the user's real footage 2026-09-05 (`_behindtext/behind_compare.png`):
rembg person cutout + faded Anton text sandwiched between background and
cutout reads exactly like the reference photo.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Music source | The clip's own live audio (filmed with music). Manual "clip starts at song position" box as the escape hatch. |
| Lyric display | One line at a time, giant faded Anton, 0.2s fades between lines. |
| Lyric source | lrclib.net synced lyrics (free API, no key) by title/artist; fallback = raw Whisper lines with a UI warning. |
| Sync method | Whisper transcribes the clip's audio (clip-time) → fuzzy-match its misheard words against LRC lines (reuse `_map_clean_to_spans`) → **one constant offset** (median of per-line anchors, chorus-duplicate lines excluded). LRC precise times + offset drive rendering. |
| Segmentation | rembg `u2netp` session (small/fast), mask computed at ~384px width and upscaled. Masks only computed on frames where a line is visible — pass-through elsewhere. |
| Tint | Auto by background luminance behind the text area (faded-white on dark, faded-dark on light), manual override. |
| Scope | Effect only: NO cutting, captions, B-roll, or zoom. Clip passes through full length. |
| Out of scope v1 | Word-by-word karaoke pop, auto song detection (fingerprinting), separate-song-file muxing, accumulating lyric wall. |

## Architecture

New module **`lyricmode.py`** (keep autoedit.py from growing):
- `parse_lrc(text) -> [(t_song, line)]` — handles multi-timestamp lines, sorts.
- `fetch_synced_lyrics(track, artist) -> lrc_text|None` — lrclib `/api/get`,
  `/api/search` fallback; urllib, 15s timeout, User-Agent set.
- `align_offset(lrc_lines, all_words) -> float|None` — anchors only on lines
  whose text is UNIQUE in the song (choruses repeat → ambiguous match →
  excluded); needs ≥2 anchors within 2s of their median, returns their mean.
- `person_mask(rgb_ndarray) -> HxWx1 float mask` — lazy module `u2netp` session.
- `build_line_image(line, W, H, tint) -> HxWx4 float` — uppercase, wrapped,
  font size auto-shrunk to fit width and ≤62% height, left margin, Anton.
- `render_lyric_video(input_path, lines_clip, out_mp4, tmpdir, tint, progress_cb)`
  — ffmpeg rawvideo decode pipe → numpy composite per frame
  (`frame*mask + (line over frame)*(1-mask)`, fade ramp 0.2s, line visible
  from its start to min(next line, +7s)) → ffmpeg encode pipe, audio mapped
  from the source file. Frames with no visible line are passed through
  untouched (no mask computed).

**`app.py`**: `/lyric/run` (multipart: video, track, artist, optional
`start_at` "m:ss" manual offset, `tint` auto|light|dark) → one-shot job worker
(`kind="lyric"`): extract audio → transcribe (base) → fetch+parse LRC → offset
(manual overrides Whisper) → shift lines to clip time, drop lines outside
[0, duration] → error clearly if nothing aligns → render with frame progress →
done. `/lyric/status|video|download/<id>`. Third mode button + section + JS
mirroring clip mode (all external text through `esc()`).

## Error handling

- lrclib unreachable / song not found → fall back to Whisper's own segment
  lines (timestamps already clip-time, no offset needed) + warning in stage.
- Alignment returns None and no manual offset → error: "couldn't hear enough
  of the song to sync — enter where the song starts" (the manual box).
- Zero lines land inside the clip → same clear error.
- Render pipe failures → RuntimeError with ffmpeg stderr tail.

## Testing (mock heavy/external bits; suite stays offline)

parse_lrc (multi-tag/sort/garbage); align_offset (synthetic words at known
offset, chorus dupes ignored, insufficient anchors → None); build_line_image
(dims, nonzero alpha, wraps long lines); render on a tiny synthetic clip with
a mocked rectangular mask (exists, duration ≈ source, audio present, frame
during a line differs from source, frame outside lines identical); routes with
mocked fetch/transcribe/render; UI hooks. lrclib never hit in tests.
