# Your own sound effects

Drop sound-effect files in this folder and the editor will mix them over the
voice in a post-render pass when you turn **Sound effects** on. Purely additive —
your voice stays at full volume; the cut, render, and captions are untouched.

- **whoosh** — played on cuts. Name it `whoosh.mp3` (also accepts `swoosh`, `swish`).
- **impact** — played on emphasis moments (the hook, B-roll reveals, and punchy
  phrases). Name it `impact.mp3` (also accepts `riser`, `boom`, `hit`).
- Supported: `.mp3 .wav .m4a .ogg .aac .flac`. Only **whoosh** + **impact** are
  used in v1.

Turn it on: in the app tick the **Sound effects** checkbox. CLI: add `--sfx`.

If the folder is empty or a sound is missing, the render simply runs without that
effect — nothing breaks.
