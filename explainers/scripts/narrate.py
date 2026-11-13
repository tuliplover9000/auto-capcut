"""Synthesize an episode's narration, one file per line, with WORD timings.

    python scripts/narrate.py episodes/wind-survival.json

Writes public/narration/<id>/line_<n>.mp3 and episodes/<id>.timing.json:
  {"lines": [{"file": "narration/<id>/line_0.mp3", "duration": s,
              "words": [{"text": "What", "start": s, "end": s}, ...]}, ...]}
Line order: hook, each contender, finale, sting. The timeline uses the word
timings so the gauge lands on a number exactly as the narrator says it.

Needs edge-tts >= 7.3 (7.2.x got HTTP 403 from the service in Nov 2026) and
boundary="WordBoundary" (the 7.x default is SentenceBoundary — no word timings).
"""
import asyncio
import json
import os
import sys

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def episode_lines(ep: dict) -> list[str]:
    return [ep["hook"], *[c["line"] for c in ep["contenders"]], ep["finale"]["line"], ep["sting"]["line"]]


async def synth(text: str, voice: str, rate: str, path: str) -> list[dict]:
    words, audio = [], bytearray()
    c = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    async for ch in c.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            s = ch["offset"] / 1e7
            words.append({"text": ch["text"], "start": round(s, 3), "end": round(s + ch["duration"] / 1e7, 3)})
    with open(path, "wb") as f:
        f.write(audio)
    return words


def synth_retry(text: str, voice: str, rate: str, path: str, tries: int = 5) -> list[dict]:
    """The free service drops requests intermittently (NoAudioReceived / 403);
    the same request usually succeeds a few seconds later."""
    import time
    last = None
    for k in range(tries):
        try:
            return asyncio.run(synth(text, voice, rate, path))
        except Exception as e:  # noqa: BLE001 — service flakiness, retried
            last = e
            time.sleep(2 + 3 * k)
    raise RuntimeError(f"TTS failed after {tries} tries: {last}")


def mp3_duration(path: str) -> float:
    import re
    import subprocess
    import imageio_ffmpeg
    r = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-i", path], capture_output=True, text=True, errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    out_dir = os.path.join(ROOT, "public", "narration", ep["id"])
    os.makedirs(out_dir, exist_ok=True)
    lines = []
    for i, text in enumerate(episode_lines(ep)):
        path = os.path.join(out_dir, f"line_{i}.mp3")
        words = synth_retry(text, ep.get("voice", "en-US-AndrewNeural"), ep.get("rate", "+0%"), path)
        if not words:
            sys.exit(f"line {i}: no word timings returned — is boundary=WordBoundary supported?")
        dur = mp3_duration(path)
        lines.append({"file": f"narration/{ep['id']}/line_{i}.mp3", "duration": round(dur, 3), "words": words})
        span = words[-1]["end"] - words[0]["start"]
        print(f"line {i}: {dur:5.2f}s  {len(words)} words  {len(words) / span * 60:.0f} wpm  | {text}")
    timing_path = os.path.splitext(ep_path)[0] + ".timing.json"
    json.dump({"lines": lines}, open(timing_path, "w", encoding="utf-8"), indent=1)
    total_words = sum(len(x["words"]) for x in lines)
    print(f"-> {timing_path}  ({total_words} words, {sum(x['duration'] for x in lines):.1f}s of speech)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
