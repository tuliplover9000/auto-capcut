"""mediasource.py — stock B-roll fetcher (Pexels primary, Pixabay fallback).

Dependency-free: only stdlib (urllib/json/os/time/hashlib/random).
Returns a LOCAL vertical asset file path for a search query, or None.
"""
import os
import sys
import json
import time
import random
import hashlib
import urllib.request
import urllib.parse
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(HERE, "broll_cache")     # gitignored; persists across runs
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
CACHE_TTL = 24 * 3600
MIN_HEIGHT = 1280
MIN_RATIO = 1.4        # height/width must be >= this (true vertical)
TOP_N = 8              # pick randomly among the top N qualifying results


def _load_env():
    """Read KEY=VALUE lines from .env (if present), merged under os.environ.

    Real os.environ wins over .env. Blank lines and # comments are ignored.
    Returns a dict with at least PEXELS_API_KEY / PIXABAY_API_KEY resolved.
    """
    env = {}
    dotenv = os.path.join(HERE, ".env")
    if os.path.exists(dotenv):
        try:
            with open(dotenv, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, _, val = line.partition("=")
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key:
                        env[key] = val
        except Exception:
            pass
    # real environment overrides .env
    env.update(os.environ)
    return env


def _get(url, headers, raw=False, timeout=30, retries=2):
    """urllib GET with headers.

    On HTTP 429 (rate limit), sleep with exponential-ish backoff and retry.
    Returns parsed JSON (raw=False) or raw bytes (raw=True).
    Raises on final failure.
    """
    last_err = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, headers=headers, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
            if raw:
                return data
            return json.loads(data.decode("utf-8"))
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code == 429 and attempt < retries:
                # exponential-ish backoff: 2, 4, ...
                time.sleep(2 ** (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = e
            if attempt < retries:
                time.sleep(2 ** (attempt + 1))
                continue
            raise
    if last_err:
        raise last_err
    raise RuntimeError("unreachable")


def _ensure_cache_dir():
    if not os.path.isdir(CACHE_DIR):
        os.makedirs(CACHE_DIR, exist_ok=True)


def _query_prefix(provider, kind, query, orientation):
    """Glob-able prefix that UNIQUELY identifies (provider,kind,query,orientation).
    Includes orientation and a full-query hash so a truncated human-readable slug
    can never collide (two long queries sharing the first chars, or two
    orientations, must NOT map to the same cached file)."""
    qh = hashlib.sha1(query.encode("utf-8")).hexdigest()[:8]
    safe = "".join(c if c.isalnum() else "_" for c in query)[:20]
    return f"{provider}_{kind}_{orientation}_{qh}_{safe}_"


def _cache_path(provider, kind, query, orientation, chosen_id, ext):
    """Deterministic cache file path keyed by all selection inputs."""
    key = "|".join([provider, kind, query, orientation, str(chosen_id)])
    h = hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]
    return os.path.join(CACHE_DIR, f"{_query_prefix(provider, kind, query, orientation)}{h}{ext}")


def _query_cache_glob(provider, kind, query, orientation):
    """Return a cached file for this (provider,kind,query,orientation) if a
    fresh one exists, regardless of chosen_id — lets repeat queries reuse a
    download without a new API call. Returns path or None."""
    # We can't reverse the per-id hash, so scan the dir for a matching base.
    # The base includes orientation + a full-query hash, so it can't collide
    # across orientations or across long queries with the same leading chars.
    base = _query_prefix(provider, kind, query, orientation)
    if not os.path.isdir(CACHE_DIR):
        return None
    now = time.time()
    candidates = []
    for name in os.listdir(CACHE_DIR):
        if name.startswith(base):
            p = os.path.join(CACHE_DIR, name)
            try:
                st = os.stat(p)
            except OSError:
                continue
            if st.st_size > 0 and (now - st.st_mtime) < CACHE_TTL:
                candidates.append((st.st_mtime, p))
    if candidates:
        candidates.sort(reverse=True)
        return candidates[0][1]
    return None


def _fresh(path):
    """True if path exists, is non-empty and younger than CACHE_TTL."""
    try:
        st = os.stat(path)
    except OSError:
        return False
    return st.st_size > 0 and (time.time() - st.st_mtime) < CACHE_TTL


def _looks_like_media(data, ext):
    """True if `data`'s magic bytes match the expected media type for `ext`.
    Guards against a provider 200-ing with an HTML error/login page (or a
    truncated body) that would otherwise be cached as a .jpg/.mp4 and fed to
    ffmpeg on every run for the whole TTL."""
    if not data or len(data) < 64:
        return False
    if ext == ".mp4":
        return b"ftyp" in data[:16]            # ISO-BMFF box
    if data.startswith((b"\xff\xd8\xff",        # jpeg
                        b"\x89PNG\r\n",         # png
                        b"GIF87a", b"GIF89a",   # gif
                        b"BM")):                # bmp
        return True
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return True
    return False


def _download(url, dest, headers):
    """Download url to dest (atomically via .part). Returns dest or raises."""
    _ensure_cache_dir()
    data = _get(url, headers, raw=True, timeout=60)
    if not _looks_like_media(data, os.path.splitext(dest)[1].lower()):
        raise RuntimeError(
            f"downloaded content for {os.path.basename(dest)} is not valid media "
            f"({len(data) if data else 0} bytes) — skipping")
    tmp = dest + ".part"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, dest)
    return dest


def _pick_random_top(candidates, used_ids):
    """candidates: list of dicts with 'uid'. Filter out already-used ids, pick
    randomly among the top TOP_N. Returns chosen dict or None.

    When every candidate is already used, return None (skip this overlay) rather
    than re-serving a duplicate — B-roll is best-effort, and a visible repeat of
    the same clip in one video looks worse than that moment having no overlay.
    """
    fresh = [c for c in candidates if c["uid"] not in (used_ids or set())]
    if not fresh:
        return None
    top = fresh[:TOP_N]
    return random.choice(top)


# ───────────────────────── Pexels ─────────────────────────

def _pexels_headers(key):
    return {"Authorization": key, "User-Agent": UA}


def _pexels_image(query, key, orientation, used_ids):
    headers = _pexels_headers(key)
    q = urllib.parse.quote(query)
    url = (f"https://api.pexels.com/v1/search?query={q}"
           f"&orientation={orientation}&per_page=20")
    data = _get(url, headers)
    cands = []
    for p in data.get("photos", []):
        pid = p.get("id")
        if pid is None:                 # skip one bad item, don't drop the page
            continue
        w, h = p.get("width", 0), p.get("height", 0)
        if h < MIN_HEIGHT or w <= 0 or (h / w) < MIN_RATIO:
            continue
        src = p.get("src", {})
        link = src.get("large2x") or src.get("original") or src.get("large")
        if not link:
            continue
        cands.append({"uid": f"pexels:{pid}", "id": pid,
                      "link": link, "w": w, "h": h})
    chosen = _pick_random_top(cands, used_ids)
    if not chosen:
        return None
    dest = _cache_path("pexels", "image", query, orientation, chosen["id"], ".jpg")
    if not _fresh(dest):
        _download(chosen["link"], dest, headers)
    if used_ids is not None:
        used_ids.add(chosen["uid"])
    return dest


def _pexels_video(query, key, orientation, used_ids):
    headers = _pexels_headers(key)
    q = urllib.parse.quote(query)
    url = (f"https://api.pexels.com/videos/search?query={q}"
           f"&orientation={orientation}&per_page=20")
    data = _get(url, headers)
    cands = []
    for v in data.get("videos", []):
        vid = v.get("id")
        if vid is None:                 # skip one bad item, don't drop the page
            continue
        vw, vh = v.get("width", 0), v.get("height", 0)
        # prefer best mp4 portrait file within this video
        best = None
        for vf in v.get("video_files", []):
            if vf.get("file_type") != "video/mp4":
                continue
            fw, fh = vf.get("width", 0) or 0, vf.get("height", 0) or 0
            if fw <= 0 or fh <= 0:
                continue
            if fh <= fw:            # must be portrait
                continue
            if fh < MIN_HEIGHT or (fh / fw) < MIN_RATIO:
                continue
            link = vf.get("link")
            if not link:
                continue
            cand_file = {"h": fh, "w": fw, "link": link}
            if best is None:
                best = cand_file
            else:
                # prefer smallest height in [1280,2000], else smallest >=1280
                def score(c):
                    pref = 0 if 1280 <= c["h"] <= 2000 else 1
                    return (pref, c["h"])
                if score(cand_file) < score(best):
                    best = cand_file
        if best is None:
            continue
        cands.append({"uid": f"pexels:{vid}", "id": vid,
                      "link": best["link"], "w": best["w"], "h": best["h"],
                      "duration": v.get("duration")})
    chosen = _pick_random_top(cands, used_ids)
    if not chosen:
        return None
    dest = _cache_path("pexels", "video", query, orientation, chosen["id"], ".mp4")
    if not _fresh(dest):
        _download(chosen["link"], dest, headers)
    if used_ids is not None:
        used_ids.add(chosen["uid"])
    return dest


# ───────────────────────── Pixabay ─────────────────────────

def _pixabay_headers():
    return {"User-Agent": UA}


def _pixabay_image(query, key, orientation, used_ids):
    headers = _pixabay_headers()
    q = urllib.parse.quote(query)
    url = (f"https://pixabay.com/api/?key={key}&q={q}"
           f"&orientation=vertical&image_type=photo&safesearch=true&per_page=20")
    data = _get(url, headers)
    cands = []
    for hit in data.get("hits", []):
        hid = hit.get("id")
        if hid is None:                 # skip one bad item, don't drop the page
            continue
        w, h = hit.get("imageWidth", 0), hit.get("imageHeight", 0)
        if h < MIN_HEIGHT or w <= 0 or (h / w) < MIN_RATIO:
            continue
        link = hit.get("largeImageURL")
        if not link:
            continue
        cands.append({"uid": f"pixabay:{hid}", "id": hid,
                      "link": link, "w": w, "h": h})
    chosen = _pick_random_top(cands, used_ids)
    if not chosen:
        return None
    dest = _cache_path("pixabay", "image", query, orientation, chosen["id"], ".jpg")
    if not _fresh(dest):
        _download(chosen["link"], dest, headers)
    if used_ids is not None:
        used_ids.add(chosen["uid"])
    return dest


def _pixabay_video(query, key, orientation, used_ids):
    headers = _pixabay_headers()
    q = urllib.parse.quote(query)
    url = (f"https://pixabay.com/api/videos/?key={key}&q={q}"
           f"&safesearch=true&per_page=20")
    data = _get(url, headers)
    cands = []
    for hit in data.get("hits", []):
        hid = hit.get("id")
        if hid is None:                 # skip one bad item, don't drop the page
            continue
        vids = hit.get("videos", {})
        best = None
        for qual in ("large", "medium", "small", "tiny"):
            vf = vids.get(qual)
            if not vf:
                continue
            fw, fh = vf.get("width", 0) or 0, vf.get("height", 0) or 0
            url_v = vf.get("url")
            if fw <= 0 or fh <= 0 or not url_v:
                continue
            if fh <= fw:
                continue
            if fh < MIN_HEIGHT or (fh / fw) < MIN_RATIO:
                continue
            cand_file = {"h": fh, "w": fw, "link": url_v}
            if best is None or cand_file["h"] < best["h"]:
                best = cand_file
        if best is None:
            continue
        cands.append({"uid": f"pixabay:{hid}", "id": hid,
                      "link": best["link"], "w": best["w"], "h": best["h"],
                      "duration": hit.get("duration")})
    chosen = _pick_random_top(cands, used_ids)
    if not chosen:
        return None
    dest = _cache_path("pixabay", "video", query, orientation, chosen["id"], ".mp4")
    if not _fresh(dest):
        _download(chosen["link"], dest, headers)
    if used_ids is not None:
        used_ids.add(chosen["uid"])
    return dest


# ───────────────────────── public API ─────────────────────────

def search(query, kind="image", orientation="portrait", used_ids=None):
    """Return a local file path to a vertical stock asset for `query`, or None.

    kind in {"image","video"}. Tries Pexels first, then Pixabay (if key set).
    used_ids: optional set of "provider:id" strings to avoid repeats; updated
    in place. Any provider error falls through; ultimately returns None.
    """
    if kind not in ("image", "video"):
        kind = "image"
    env = _load_env()
    pexels_key = (env.get("PEXELS_API_KEY") or "").strip()
    pixabay_key = (env.get("PIXABAY_API_KEY") or "").strip()

    if not pexels_key and not pixabay_key:
        print("[mediasource] No PEXELS_API_KEY or PIXABAY_API_KEY found "
              "(env or .env); cannot fetch B-roll. Returning None.")
        return None

    # Cheap query-level cache reuse (skips API call entirely within TTL).
    # ONLY when no de-dup set is in play: when a used_ids set is provided
    # (production passes one, possibly EMPTY), we must run the real fetch so
    # selection can avoid repeats AND register the chosen id — returning a cached
    # file here would silently repeat B-roll. (Check `is None`, not truthiness:
    # an empty set is falsy but still means "de-dup is in play".)
    if used_ids is None:
        for provider in ("pexels", "pixabay"):
            if provider == "pexels" and not pexels_key:
                continue
            if provider == "pixabay" and not pixabay_key:
                continue
            cached = _query_cache_glob(provider, kind, query, orientation)
            if cached:
                return cached

    # Pexels primary
    if pexels_key:
        try:
            fn = _pexels_video if kind == "video" else _pexels_image
            path = fn(query, pexels_key, orientation, used_ids)
            if path:
                return path
            print(f"[mediasource] Pexels: no suitable {kind} for '{query}'.")
        except Exception as e:
            print(f"[mediasource] Pexels error for '{query}': {e}")

    # Pixabay fallback
    if pixabay_key:
        try:
            fn = _pixabay_video if kind == "video" else _pixabay_image
            path = fn(query, pixabay_key, orientation, used_ids)
            if path:
                return path
            print(f"[mediasource] Pixabay: no suitable {kind} for '{query}'.")
        except Exception as e:
            print(f"[mediasource] Pixabay error for '{query}': {e}")

    return None


def _main(argv):
    if len(argv) < 2:
        print('usage: python mediasource.py "<query>" [image|video]')
        return 2
    query = argv[1]
    kind = argv[2] if len(argv) > 2 else "image"
    path = search(query, kind=kind)
    if path:
        print(path)
        return 0
    print("no asset found")
    return 1


if __name__ == "__main__":
    sys.exit(_main(sys.argv))
