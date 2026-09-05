"""lyricmode.py — faded synced lyrics BEHIND the presenter.

The clip was filmed with the song audible in the room. Whisper hears the sung
words (imperfectly, in CLIP time); lrclib supplies the song's official synced
lyrics (in SONG time); fuzzy-matching the two yields one constant offset,
after which the LRC's precise line times drive rendering. Per visible-line
frame: background -> giant faded line -> person cutout on top.
"""
import json, os, re, subprocess, urllib.parse, urllib.request

import numpy as np

import autoedit

FONT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "fonts", "Anton-Regular.ttf")
MAX_LINE_HOLD = 7.0       # a line never lingers longer than this
LINE_FADE = 0.2


def parse_lrc(text):
    """LRC text -> time-sorted [(seconds, line)]. Handles the multi-timestamp
    form '[00:45.50][01:30.00]chorus' (one entry per tag); drops untagged or
    empty lines."""
    out = []
    for raw in (text or "").splitlines():
        tags, rest = [], raw
        while True:
            m = re.match(r"\s*\[(\d+):(\d{1,2}(?:\.\d{1,3})?)\]", rest)
            if not m:
                break
            tags.append(int(m.group(1)) * 60 + float(m.group(2)))
            rest = rest[m.end():]
        line = rest.strip()
        if tags and line:
            out.extend((t, line) for t in tags)
    out.sort(key=lambda x: x[0])
    return out


def align_offset(lrc_lines, all_words, min_anchors=2):
    """One constant offset (clip_time - song_time), or None.
    Anchors only on lines whose TEXT is unique in the song — a repeated chorus
    fuzzy-matches an arbitrary occurrence and would poison the offset. Needs
    >= min_anchors offsets within 2s of their median; returns their mean."""
    from collections import Counter
    counts = Counter(ln.strip().lower() for _, ln in lrc_lines)
    offsets = []
    for t_song, line in lrc_lines:
        if counts[line.strip().lower()] != 1:
            continue
        spans = autoedit._map_clean_to_spans([line], all_words, min_ratio=0.6)
        if spans:
            offsets.append(spans[0][0] - t_song)
    if len(offsets) < min_anchors:
        return None
    offsets.sort()
    med = offsets[len(offsets) // 2]
    close = [o for o in offsets if abs(o - med) <= 2.0]
    if len(close) < min_anchors:
        return None
    return sum(close) / len(close)


def _http_json(url, timeout):
    req = urllib.request.Request(url, headers={
        "User-Agent": "capcut-autoedit (https://github.com/tuliplover9000/auto-capcut)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_synced_lyrics(track, artist, timeout=15):
    """lrclib.net synced lyrics (LRC text) or None. /api/get exact match first,
    /api/search fallback (first hit that has syncedLyrics). Free, no key."""
    try:
        q = urllib.parse.urlencode({"track_name": track, "artist_name": artist})
        data = _http_json(f"https://lrclib.net/api/get?{q}", timeout)
        if isinstance(data, dict) and data.get("syncedLyrics"):
            return data["syncedLyrics"]
    except Exception:
        pass
    try:
        q = urllib.parse.urlencode({"q": f"{track} {artist}".strip()})
        for hit in _http_json(f"https://lrclib.net/api/search?{q}", timeout) or []:
            if isinstance(hit, dict) and hit.get("syncedLyrics"):
                return hit["syncedLyrics"]
    except Exception:
        pass
    return None
