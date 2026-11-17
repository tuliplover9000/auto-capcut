# TikTok auto-drafts — one-time setup (~10 min)

The script `scripts/tiktok_drafts.py` uploads finished videos to your TikTok
**inbox as drafts** through TikTok's official Content Posting API. You get a
TikTok notification, open it, paste the caption and tap Post. Nothing is ever
posted publicly without you.

## 1. Developer app (you do this, in your browser)
1. Go to **developers.tiktok.com** → log in → **Manage apps** → **Connect an app**.
2. Fill in the app name, icon, category and description. Platform: **Desktop**.
   If it asks for Terms / Privacy URLs, use the cultural-games site's privacy page.
3. **Add products:**
   - **Login Kit** → Desktop redirect URI: `http://localhost:3455/callback/`
   - **Content Posting API** → scope **video.upload** (leave *Direct Post* OFF).
4. If the portal offers **Sandbox**, create one and add the faceless TikTok
   account as a **target user**. That lets the app work for you without review.
   Otherwise, **Submit for review**. That's the same app, it just waits for approval first.

## 2. Credentials (terminal, values never go in chat or git)
```
cd C:\Users\zhrui\Code\capcut-autoedit\explainers
python scripts/tiktok_drafts.py setup
```
Paste the **Client key** and **Client secret** from the app's Credentials tab.
They're stored in `%USERPROFILE%\.tiktok-drafts\`, which is outside the repo.

## 3. Log in once
```
python scripts/tiktok_drafts.py auth
```
A browser tab opens. Log in as the **faceless** account and approve. Re-run this
every ~180 days (`check` warns you). If it says the token exchange failed, run
`auth --pkce-b64`.

## Daily use
- New video finished → `python scripts/tiktok_drafts.py add "<path to mp4>"`.
  The caption comes from the matching `.caption.txt`.
- Scheduled tasks `tiktok-draft-am` / `tiktok-draft-pm` run `push` twice a day.
  Each run sends you the caption to paste.
- TikTok limit: at most 5 un-posted drafts per 24 h, so post the drafts.
