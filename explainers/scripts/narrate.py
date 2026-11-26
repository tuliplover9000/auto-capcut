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


_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
         "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]


def _n2w(n: int) -> str:
    if n < 20:
        return _ONES[n]
    if n < 100:
        return _TENS[n // 10] + (_ONES[n % 10] if n % 10 else "")
    if n < 1000:
        return _ONES[n // 100] + "hundred" + (_n2w(n % 100) if n % 100 else "")
    return str(n)


def _expand(word: str) -> list[str]:
    """Whisper writes '98.6' where the script says 'Ninety-eight point six'."""
    import re
    w = word.strip().lower().strip(",!?;:\"'")
    w = w.rstrip(".") if not re.fullmatch(r"\d+\.\d+", w) else w
    m = re.fullmatch(r"(\d+)(?:\.(\d+))?%?", w)
    if m:
        out = [_n2w(int(m.group(1)))]
        if m.group(2):
            out += ["point"] + [_n2w(int(d)) for d in m.group(2)]
        return out
    n = _norm(w)
    return [n] if n else []


def gemini_take(text: str, voice: str, style: str, out_wav: str, model: str = "gemini-2.5-flash-preview-tts") -> None:
    """Google Gemini TTS (user pick 2026-11-26: Laomedeia, 'Say excitedly, fast and punchy: ').
    Key: GEMINI_API_KEY in the repo-root .env (gitignored; the user typed it). The 2.5 Flash
    model obeys a leading 'Say ...:' direction; the 3.x models READ it aloud (verified)."""
    import base64
    import time
    import urllib.error
    import urllib.request
    import wave
    env = os.path.join(os.path.dirname(ROOT), ".env")
    key = next((l.split("=", 1)[1].strip() for l in open(env, encoding="utf-8-sig") if l.startswith("GEMINI_API_KEY=")), "")
    if not key:
        sys.exit("GEMINI_API_KEY missing from .env")
    body = {"contents": [{"parts": [{"text": style + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    for k in range(4):
        req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                                     data=json.dumps(body).encode(), headers={"x-goog-api-key": key, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=240))
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code == 429:
                sys.exit(f"Gemini TTS quota hit (free tier is ~10-15 takes/day): {msg}")
            if k == 3:
                sys.exit(f"Gemini TTS failed: {e.code} {msg}")
            time.sleep(5 + 5 * k)
    part = d["candidates"][0]["content"]["parts"][0]["inlineData"]
    data = base64.b64decode(part["data"])
    if data[:4] == b"RIFF":
        open(out_wav, "wb").write(data)
    else:
        with wave.open(out_wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(24000)
            w.writeframes(data)


def align_to_script(audio_path: str, lines: list[str]) -> list[list[dict]]:
    """Word timings for an engine that gives none: faster-whisper word stamps, matched to the
    SCRIPT's own tokens (difflib), unmatched tokens spread evenly between their neighbours."""
    from difflib import SequenceMatcher

    from faster_whisper import WhisperModel
    toks = [(li, t) for li, ln in enumerate(lines) for t in ln.split()]
    ref = [_norm(t) for _, t in toks]
    segs, _ = WhisperModel("base", device="cpu", compute_type="int8").transcribe(audio_path, word_timestamps=True, language="en")
    hyp = []
    for s in segs:
        for w in s.words:
            parts = _expand(w.word)
            for j, p in enumerate(parts):  # split a multi-token number's time evenly
                a = w.start + (w.end - w.start) * j / len(parts)
                hyp.append((p, a, w.start + (w.end - w.start) * (j + 1) / len(parts)))
    times: list = [None] * len(ref)
    for blk in SequenceMatcher(None, ref, [h[0] for h in hyp], autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (hyp[blk.b + k][1], hyp[blk.b + k][2])
    if not any(times):
        sys.exit("align: speech-to-text matched none of the script")
    i = 0
    while i < len(times):  # fill unmatched runs
        if times[i] is None:
            j = i
            while j < len(times) and times[j] is None:
                j += 1
            a = times[i - 1][1] if i > 0 else (times[j][0] - 0.3 * (j - i) if j < len(times) else 0)
            z = times[j][0] if j < len(times) else a + 0.3 * (j - i)
            step = (z - a) / (j - i)
            for k in range(i, j):
                times[k] = (a + step * (k - i), a + step * (k - i + 1))
            i = j
        i += 1
    matched = sum(1 for blk in SequenceMatcher(None, ref, [h[0] for h in hyp], autojunk=False).get_matching_blocks() for _ in range(blk.size))
    print(f"align: {matched}/{len(ref)} script words matched by speech-to-text, rest interpolated")
    per: list[list[dict]] = [[] for _ in lines]
    for (li, t), (a, z) in zip(toks, times):
        per[li].append({"text": t.strip(".,!?;:\"“”"), "start": round(a, 3), "end": round(z, 3)})
    return per


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
    full = " ".join(x["text"].strip() for x in L)
    if ep.get("engine") == "gemini":
        # "--take <file>" reuses an approved take instead of spending a free-tier request
        take = os.path.join(out_dir, "take.wav")
        if "--take" in sys.argv:
            import shutil
            shutil.copyfile(sys.argv[sys.argv.index("--take") + 1], take)
        else:
            gemini_take(full, voice, ep.get("style", "Say excitedly, fast and punchy: "), take)
        per = align_to_script(take, [x["text"] for x in L])
        words = [w for ws in per for w in ws]
    else:
        take = os.path.join(out_dir, "take.mp3")
        words = synth_retry(full, voice, rate, take, pitch=pitch)
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
    json.dump({"lines": lines, "flow": True, "take": f"narration/{ep['id']}/{os.path.basename(take)}"}, open(timing_path, "w", encoding="utf-8"), indent=1)
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
