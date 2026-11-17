"""TikTok draft pusher for the faceless-explainer account.

Uploads finished videos to the creator's TikTok INBOX as drafts through the
official Content Posting API (scope video.upload). The creator opens the TikTok
notification, pastes the caption and taps Post. Nothing is ever published by
this script.

Commands
  python scripts/tiktok_drafts.py setup            # one time: store client key/secret (typed by you, hidden)
  python scripts/tiktok_drafts.py auth             # one time (and every ~180 days): log in through TikTok
  python scripts/tiktok_drafts.py add <mp4> [...]  # queue finished videos (caption = sibling .caption.txt)
  python scripts/tiktok_drafts.py list             # show the queue
  python scripts/tiktok_drafts.py push [--n 1]     # upload the next queued video(s) as drafts
  python scripts/tiktok_drafts.py check            # token + queue health (no upload)

Secrets (client secret, tokens) live OUTSIDE the repo in ~/.tiktok-drafts/.
The queue lives in explainers/posting/queue.json (no secrets, safe to commit).

TikTok limits (docs, Aug 2026): <= 5 pending (un-posted) drafts per 24 h,
6 init requests/min per token, single chunk allowed up to 64 MB.
"""
from __future__ import annotations

import base64
import hashlib
import http.server
import json
import os
import secrets
import sys
import threading
import time
import urllib.parse
import webbrowser
from datetime import datetime
from getpass import getpass
from pathlib import Path

import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SECRET_DIR = Path.home() / ".tiktok-drafts"
APP_FILE = SECRET_DIR / "app.json"        # {"client_key", "client_secret"}
TOKEN_FILE = SECRET_DIR / "token.json"    # access/refresh tokens + expiry
HERE = Path(__file__).resolve().parent.parent
QUEUE_FILE = HERE / "posting" / "queue.json"
LAST_CAPTION = HERE / "posting" / "last_caption.txt"

AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
INIT_URL = "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/"
STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/"
REDIRECT_PORT = 3455
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}/callback/"
SCOPES = "user.info.basic,video.upload"
MAX_SINGLE = 64 * 1024 * 1024
CHUNK = 10 * 1024 * 1024
PENDING_LIMIT = 5


# ---------------------------------------------------------------- storage
def _load(p: Path, default):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def _save(p: Path, data) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(p)


def load_queue() -> list[dict]:
    return _load(QUEUE_FILE, [])


def caption_for(mp4: Path) -> str:
    """CAPTION block of the sibling .caption.txt (everything after the CAPTION header)."""
    cap = mp4.with_name(mp4.stem + ".caption.txt")
    if not cap.exists():
        return ""
    lines = cap.read_text(encoding="utf-8").splitlines()
    for i, ln in enumerate(lines):
        if ln.strip().upper().startswith("CAPTION"):
            return "\n".join(lines[i + 1:]).strip()
    return cap.read_text(encoding="utf-8").strip()


# ---------------------------------------------------------------- oauth
def pkce_pair(mode: str) -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)[:96]
    digest = hashlib.sha256(verifier.encode()).digest()
    if mode == "b64":  # RFC 7636
        challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    else:              # TikTok desktop docs: hex-encoded SHA256
        challenge = digest.hex()
    return verifier, challenge


def _store_token(tok: dict) -> None:
    if "access_token" not in tok:
        raise SystemExit(f"TikTok token error: {json.dumps(tok)}")
    now = time.time()
    tok["access_expires_at"] = now + int(tok.get("expires_in", 0)) - 120
    tok["refresh_expires_at"] = now + int(tok.get("refresh_expires_in", 0))
    _save(TOKEN_FILE, tok)


def cmd_setup(_args) -> None:
    print("Paste the values from developers.tiktok.com > your app > Credentials.")
    key = input("Client key: ").strip()
    sec = getpass("Client secret (hidden): ").strip()
    if not key or not sec:
        raise SystemExit("Both values are required.")
    _save(APP_FILE, {"client_key": key, "client_secret": sec})
    print(f"Saved to {APP_FILE} (outside the repo). Next: python scripts/tiktok_drafts.py auth")


def cmd_auth(args) -> None:
    app = _load(APP_FILE, None) or sys.exit("Run `setup` first.")
    mode = "b64" if "--pkce-b64" in args else "hex"
    verifier, challenge = pkce_pair(mode)
    state = secrets.token_urlsafe(16)
    got: dict = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            got.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            msg = "Connected. You can close this tab." if "code" in got else f"Error: {got}"
            self.wfile.write(f"<h2>{msg}</h2>".encode())

        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(("127.0.0.1", REDIRECT_PORT), H)
    threading.Thread(target=srv.handle_request, daemon=True).start()
    url = AUTH_URL + "?" + urllib.parse.urlencode({
        "client_key": app["client_key"], "scope": SCOPES, "response_type": "code",
        "redirect_uri": REDIRECT_URI, "state": state,
        "code_challenge": challenge, "code_challenge_method": "S256",
    })
    print("Opening TikTok login in your browser. Log in as the FACELESS account and approve.")
    print(url)
    webbrowser.open(url)
    t0 = time.time()
    while "code" not in got and "error" not in got and time.time() - t0 < 300:
        time.sleep(0.3)
    srv.server_close()
    if got.get("state") != state or "code" not in got:
        raise SystemExit(f"Login did not complete: {got or 'timed out'}")
    r = requests.post(TOKEN_URL, data={
        "client_key": app["client_key"], "client_secret": app["client_secret"],
        "code": got["code"], "grant_type": "authorization_code",
        "redirect_uri": REDIRECT_URI, "code_verifier": verifier,
    }, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=30)
    tok = r.json()
    if "access_token" not in tok and mode == "hex":
        print("Token exchange failed with hex PKCE; re-run with: auth --pkce-b64")
    _store_token(tok)
    print(f"Logged in. Scopes: {tok.get('scope')}. Refresh token valid ~180 days.")


def access_token() -> str:
    tok = _load(TOKEN_FILE, None) or sys.exit("Not logged in. Run `auth`.")
    if time.time() < tok.get("access_expires_at", 0):
        return tok["access_token"]
    if time.time() > tok.get("refresh_expires_at", 0):
        raise SystemExit("REAUTH NEEDED: refresh token expired. Run `auth` again.")
    app = _load(APP_FILE, None)
    r = requests.post(TOKEN_URL, data={
        "client_key": app["client_key"], "client_secret": app["client_secret"],
        "grant_type": "refresh_token", "refresh_token": tok["refresh_token"],
    }, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=30)
    _store_token(r.json())  # TikTok rotates the refresh token: always replace it
    return _load(TOKEN_FILE, {})["access_token"]


# ---------------------------------------------------------------- upload
def chunk_plan(size: int) -> tuple[int, int]:
    """(chunk_size, total_chunk_count) per TikTok's media-transfer rules."""
    if size <= MAX_SINGLE:
        return size, 1
    return CHUNK, size // CHUNK  # last chunk absorbs the remainder (< 2*CHUNK <= 128 MB)


def upload_draft(mp4: Path) -> str:
    tok = access_token()
    size = mp4.stat().st_size
    chunk_size, count = chunk_plan(size)
    r = requests.post(INIT_URL, headers={
        "Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8",
    }, json={"source_info": {"source": "FILE_UPLOAD", "video_size": size,
                             "chunk_size": chunk_size, "total_chunk_count": count}}, timeout=30)
    body = r.json()
    err = body.get("error", {})
    if err.get("code") not in (None, "ok"):
        raise RuntimeError(f"init failed: {err.get('code')}: {err.get('message')}")
    publish_id, upload_url = body["data"]["publish_id"], body["data"]["upload_url"]
    with mp4.open("rb") as f:
        for i in range(count):
            start = i * chunk_size
            end = size - 1 if i == count - 1 else start + chunk_size - 1
            f.seek(start)
            data = f.read(end - start + 1)
            for attempt in range(3):
                pr = requests.put(upload_url, data=data, headers={
                    "Content-Type": "video/mp4", "Content-Length": str(len(data)),
                    "Content-Range": f"bytes {start}-{end}/{size}"}, timeout=300)
                if pr.status_code in (200, 201, 206):
                    break
                if pr.status_code < 500:
                    raise RuntimeError(f"chunk {i} HTTP {pr.status_code}: {pr.text[:300]}")
                time.sleep(3 * (attempt + 1))
            else:
                raise RuntimeError(f"chunk {i} failed after retries")
            print(f"  chunk {i + 1}/{count} uploaded")
    return publish_id


def wait_status(publish_id: str, timeout: int = 300) -> str:
    t0, status = time.time(), "?"
    while time.time() - t0 < timeout:
        r = requests.post(STATUS_URL, headers={
            "Authorization": f"Bearer {access_token()}",
            "Content-Type": "application/json; charset=UTF-8"},
            json={"publish_id": publish_id}, timeout=30).json()
        status = r.get("data", {}).get("status", "?")
        if status == "FAILED":
            raise RuntimeError(f"TikTok processing failed: {r.get('data', {}).get('fail_reason')}")
        if status in ("SEND_TO_USER_INBOX", "PUBLISH_COMPLETE"):
            return status
        time.sleep(5)
    return status


# ---------------------------------------------------------------- commands
def cmd_add(args) -> None:
    q = load_queue()
    have = {e["file"] for e in q}
    for a in args:
        p = Path(a).resolve()
        if not p.exists() or p.suffix.lower() != ".mp4":
            print(f"skip (not an mp4): {a}")
            continue
        if str(p) in have:
            print(f"already queued: {p.name}")
            continue
        q.append({"file": str(p), "caption": caption_for(p), "status": "queued",
                  "added": datetime.now().isoformat(timespec="seconds")})
        print(f"queued: {p.name}" + ("" if q[-1]["caption"] else "  (WARNING: no caption file)"))
    _save(QUEUE_FILE, q)


def cmd_list(_args) -> None:
    for i, e in enumerate(load_queue()):
        print(f"{i:>2}  {e['status']:<8} {Path(e['file']).name}  {e.get('drafted', '')}")


def pending_24h(q: list[dict]) -> int:
    cutoff = time.time() - 24 * 3600
    return sum(1 for e in q if e["status"] == "drafted"
               and datetime.fromisoformat(e["drafted"]).timestamp() > cutoff)


def cmd_push(args) -> None:
    n = int(args[args.index("--n") + 1]) if "--n" in args else 1
    q = load_queue()
    todo = [e for e in q if e["status"] == "queued"]
    if not todo:
        print("QUEUE EMPTY: nothing to draft. Add finished videos with `add`.")
        return
    room = PENDING_LIMIT - pending_24h(q)
    if room <= 0:
        print(f"HOLD: {PENDING_LIMIT} drafts already sent in the last 24 h (TikTok limit).")
        return
    for e in todo[:min(n, room)]:
        mp4 = Path(e["file"])
        print(f"Uploading draft: {mp4.name} ({mp4.stat().st_size / 1e6:.1f} MB)")
        try:
            pid = upload_draft(mp4)
            status = wait_status(pid)
        except Exception as ex:  # keep the queue consistent, report, move on
            e["status"], e["error"] = "error", str(ex)
            _save(QUEUE_FILE, q)
            print(f"ERROR: {ex}")
            continue
        e.update(status="drafted", publish_id=pid, tiktok_status=status,
                 drafted=datetime.now().isoformat(timespec="seconds"))
        e.pop("error", None)
        _save(QUEUE_FILE, q)
        caption = e.get("caption") or caption_for(mp4)
        LAST_CAPTION.write_text(caption, encoding="utf-8")
        print(f"DRAFTED ({status}): {mp4.name}")
        print("CAPTION TO PASTE:\n" + caption)
    left = sum(1 for e in q if e["status"] == "queued")
    print(f"Queue: {left} video(s) left" + ("  LOW: make more episodes" if left < 3 else ""))


def cmd_check(_args) -> None:
    print(f"app creds : {'ok' if APP_FILE.exists() else 'MISSING (run setup)'}")
    tok = _load(TOKEN_FILE, None)
    if not tok:
        print("login     : MISSING (run auth)")
    else:
        days = (tok.get("refresh_expires_at", 0) - time.time()) / 86400
        print(f"login     : ok, re-login needed in {days:.0f} days" if days > 0 else "login     : EXPIRED (run auth)")
    q = load_queue()
    print(f"queue     : {sum(e['status'] == 'queued' for e in q)} queued, "
          f"{pending_24h(q)} drafted in last 24 h, {sum(e['status'] == 'error' for e in q)} errors")


CMDS = {"setup": cmd_setup, "auth": cmd_auth, "add": cmd_add, "list": cmd_list,
        "push": cmd_push, "check": cmd_check}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in CMDS:
        print(__doc__)
        sys.exit(1)
    CMDS[sys.argv[1]](sys.argv[2:])
