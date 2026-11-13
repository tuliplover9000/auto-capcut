# explainers — animated faceless shorts (Remotion)

Code-rendered flat-vector explainer shorts (1080x1920, 30fps) for the faceless
account. Every video is a **template + an episode JSON file**: write the data,
render, post. No generative video, no licensed art or audio.

## Speed Trap (format 1)

*"Which animal gets a speeding ticket?"* — contenders pass a highway speed
camera at night. The overhead message board narrates (name → verdict), the
2-digit radar sign counts each speed, anyone over the limit gets flashed and a
citation prints. Anything too fast for the sign overflows it (`ER`) and the
lineup scale zooms out at the end so the winner dwarfs everyone.

### Render

```bash
npm install                      # once
npm run sfx                      # once: synthesize public/sfx/*.wav (ffmpeg)
npm test                         # timeline logic (pure, no rendering)
npx remotion render SpeedTrap out/ep.mp4                                # default episode
npx remotion render SpeedTrap out/ep.mp4 --props=episodes/<file>.json   # any episode
npx remotion studio              # live preview / scrubbing
```

A ~30s episode renders in under a minute.

### New episode = new JSON

`episodes/<id>.json` — props are `{"episode": {...}}` when passed via
`--props`, or edit `defaultProps` in `src/Root.tsx`.

| field | meaning |
|---|---|
| `limit`, `unit` | the posted limit everyone is measured against |
| `hook` | message-board text on frame 0 (max 3 lines x 15 chars) |
| `outro` | message-board text at the end (comment bait) |
| `contenders[]` | ordered slowest → fastest. `name` (board lines), `speed`, `art` (pictogram key), `note` (small source line), `verdict` (board lines after the run), optional `motion: "dive"`, `fine`, `fineNote` (citation, only shown when over the limit) |

Pictograms live in `src/art/Pictograms.tsx` (keys: `human bear greyhound
pronghorn cheetah falcon kangaroo pigeon`). New contenders need a new pictogram: thick round
strokes + ellipses, one colour, facing right, 400x260 box, ground at y=250.
`kangaroo` hops (both legs together, body lifts on the push-off); `pigeon` is
drawn airborne mid-box and flaps its wings with `stride`, so it flies with the
default run motion — no `motion` field needed. Both rest (stride 0) in their
most legible pose, which is what the lineup chips show.

### Layout of the code

- `src/speedtrap/timeline.ts` — **all timing logic**, pure TS (beats, radar
  count, board text, flash, scale zoom, sound cues). Tested by
  `scripts/test-timeline.ts` (incl. a photosensitivity check: never more than
  3 flashes in any 1s window).
- `src/speedtrap/SpeedTrap.tsx` — the scene (render only).
- `src/lib/LedText.tsx` + `font5x7.ts` — real dot-matrix LED rendering.
- `scripts/make_sfx.py` — every sound effect, synthesized with ffmpeg.
