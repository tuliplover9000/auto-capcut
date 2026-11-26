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


def episode_lines(ep: dict) -> list[dict]:
    """Each line as {text, voice, rate, pitch}. A line may override the episode voice
    (multi-character skits) and give a `say` spelling for TTS ("Rizz dot exe")."""
    base = {"voice": ep.get("voice", "en-US-AndrewNeural"), "rate": ep.get("rate", "+0%"), "pitch": "+0Hz"}
    if "lines" in ep:  # generic episodes (e.g. Fight): an explicit list of narration lines
        return [{**base, **{k: ln[k] for k in ("voice", "rate", "pitch") if k in ln}, "text": ln.get("say", ln["text"])} for ln in ep["lines"]]
    return [{**base, "text": x} for x in (ep["hook"], *[c["line"] for c in ep["contenders"]], ep["finale"]["line"], ep["sting"]["line"])]


async def synth(text: str, voice: str, rate: str, path: str, pitch: str = "+0Hz") -> list[dict]:
    words, audio = [], bytearray()
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    async for ch in c.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            s = ch["offset"] / 1e7
            words.append({"text": ch["text"], "start": round(s, 3), "end": round(s + ch["duration"] / 1e7, 3)})
    with open(path, "wb") as f:
        f.write(audio)
    return words


def synth_retry(text: str, voice: str, rate: str, path: str, tries: int = 5, pitch: str = "+0Hz") -> list[dict]:
    """The free service drops requests intermittently (NoAudioReceived / 403);
    the same request usually succeeds a few seconds later."""
    import time
    last = None
    for k in range(tries):
        try:
            return asyncio.run(synth(text, voice, rate, path, pitch))
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


def _norm(s: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]", "", s.lower())


def flow(ep: dict, ep_path: str, out_dir: str) -> int:
    """FLOW MODE (2026-11-26, user: "the voice is strange, it needs to be smoother").
    The whole script is spoken in ONE take, so intonation runs across sentences
    instead of resetting every line. The take is then cut at the middle of each
    natural pause between lines, giving the same per-line files + word timings
    the timelines already use (line i's words are relative to its own file)."""
    import subprocess
    import wave

    import imageio_ffmpeg
    import numpy as np

    L = episode_lines(ep)
    voices = {(x["voice"], x["rate"], x["pitch"]) for x in L}
    if len(voices) != 1:
        sys.exit("flow mode needs one voice/rate/pitch for every line (multi-voice skits: use per-line mode)")
    voice, rate, pitch = voices.pop()
    take = os.path.join(out_dir, "take.mp3")
    words = synth_retry(" ".join(x["text"].strip() for x in L), voice, rate, take, pitch=pitch)
    # assign boundary words to lines by consuming each line's letters in order
    per, wi = [], 0
    for x in L:
        need, got, mine = len(_norm(x["text"])), 0, []
        while wi < len(words) and got < need:
            got += len(_norm(words[wi]["text"]))
            mine.append(words[wi])
            wi += 1
        if not mine or got != need:
            sys.exit(f"flow: could not align words to line: {x['text']!r} (got {got} of {need} letters)")
        per.append(mine)
    # decode once, cut at the middle of each gap between lines
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    pcm = subprocess.run([ff, "-i", take, "-f", "s16le", "-ac", "1", "-ar", "24000", "-"], capture_output=True).stdout
    audio = np.frombuffer(pcm, dtype="<i2")
    sr = 24000
    total = len(audio) / sr
    cuts = [0.0] + [(per[i][-1]["end"] + per[i + 1][0]["start"]) / 2 for i in range(len(per) - 1)] + [total]
    lines = []
    for i, ws in enumerate(per):
        a, z = cuts[i], cuts[i + 1]
        path = os.path.join(out_dir, f"line_{i}.wav")
        with wave.open(path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(audio[int(a * sr):int(z * sr)].tobytes())
        rel = [{"text": w["text"], "start": round(w["start"] - a, 3), "end": round(w["end"] - a, 3)} for w in ws]
        lines.append({"file": f"narration/{ep['id']}/line_{i}.wav", "duration": round(z - a, 3), "words": rel, "takeStart": round(a, 3)})
        print(f"line {i}: {z - a:5.2f}s  {len(ws)} words | {L[i]['text']}")
    timing_path = os.path.splitext(ep_path)[0] + ".timing.json"
    json.dump({"lines": lines, "flow": True, "take": f"narration/{ep['id']}/take.mp3"}, open(timing_path, "w", encoding="utf-8"), indent=1)
    span = words[-1]["end"] - words[0]["start"]
    print(f"-> {timing_path}  (one take, {len(words)} words, {span:.1f}s, {len(words) / span * 60:.0f} wpm)")
    return 0


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf-8"))
    out_dir = os.path.join(ROOT, "public", "narration", ep["id"])
    os.makedirs(out_dir, exist_ok=True)
    if ep.get("flow") or "--flow" in sys.argv:
        return flow(ep, ep_path, out_dir)
    lines = []
    for i, L in enumerate(episode_lines(ep)):
        text = L["text"]
        path = os.path.join(out_dir, f"line_{i}.mp3")
        words = synth_retry(text, L["voice"], L["rate"], path, pitch=L["pitch"])
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
