# Retention research — shared brief (2026-11-27)

Every researcher reads this first. It is the common ground for all 7 tracks.

## The channel
Faceless animated-explainer Shorts, posted on TikTok as **@tulipsworld9000** (118 followers, 6.6K likes) and cross-posted to YouTube Shorts.
- Engine: Remotion (React) + a three.js 3D toy-diorama kit in `C:\Users\zhrui\Code\capcut-autoedit\explainers`.
- Voice: AI TTS (Gemini "Laomedeia", energetic, or edge-tts Andrew).
- Music: generated beds; SFX; burned-in captions.
- All art is original; no IP.

The owner's complaint: **"our videos are lowkey flopping."** The goal is a RULE BOOK that every future video must follow, so people keep watching and engage.

## Our own numbers (public TikTok views, read 2026-11-27, newest first)
| # | episode (format) | views | notes |
|---|---|---|---|
| 23 | Chain Reaction 5: Who poisoned the rich man's drink (3D whodunit, 48 s) | 374 | posted ~today, so too young to judge |
| 22 | Thanksgiving: the poor kid who tried to steal a turkey (3D story) | 303 | |
| 20 | GTA 6 Irredeemable vs real federal sentencing (teach) | 506 | |
| 19 | Chain Reaction: Sandcastle, "10 things go wrong first" | **9,473** | |
| 18 | Spot the Liar (hard) | 860 | |
| 17 | Fingerprint Match: can you find the thief | 795 | |
| 16 | Chain Reaction: Birthday cake HARD ("Did you catch it before the replay?") | **11.7K** | |
| 14 | Blood Spatter: like Dexter, learn 5 patterns then solve the wall | **65.7K** | only video with real shares (115) |
| 15 | Chain Reaction: Fountain "Can you find what started it?" | **18K** | |
| 12 | Observation Test: find the pickpocket, 600 people, 15 s | 1,370 | |
| 10 | Story: Wojtek the soldier bear | 1,124 | |
| 04 | Fight: Tulip vs Sunflower | 652 | |
| 06 | Odds: Fortnite pirate token vs real life | 550 | |
| 03 | Wind Test: what survives the strongest wind | 623 | |
| 01 | Speed Trap: which animal gets a speeding ticket | 593 | |

- Rendered mp4s (1080x1920) are in `C:\Users\zhrui\Capcut Video\Faceless Explainers\`; caption files sit next to them.
- Episode scripts are in `explainers/episodes/*.json`, with word timings in `*.timing.json`.

## Existing knowledge (READ it; do NOT redo it; extend, challenge, correct)
- `C:\Users\zhrui\.claude\skills\shorts-playbook\SKILL.md`: the current Episode Brief.
- `...\shorts-playbook\references\evidence.md`: the evidence-graded platform research from 2026-11-13.
- `...\shorts-playbook\references\niche-data.md`: measurements of 21 hit Shorts.
- `...\shorts-playbook\references\swipe\*.md|csv`: per-video notes behind those measurements.
- `...\shorts-playbook\scripts\metrics.py <video.mp4> <out_dir>` (cuts, novelty, wpm) and `scripts\demand.py` (YouTube autocomplete demand).
- Standing finding from the owner's other account (yoyo niche): **completion % is the gate** (rho +0.49 with views). Sound is 0.1% of traffic. Search is 30% of traffic.

## Evidence grades (tag EVERY claim)
- **OWN**: this channel's data.
- **A**: platform-official (TikTok, YouTube or Instagram docs, newsroom, Creator Insider, Mosseri).
- **B**: independent data or academic (peer-reviewed, arXiv, a large-n dataset with its method shown).
- **S**: our own measurements of other creators' videos (you can make new ones with metrics.py or frame reading).
- **C**: creator or vendor blog, podcast, or a big-creator anecdote (e.g. the MrBeast production doc, Paddy Galloway, Jenny Hoyos). Usable as a hypothesis.
- **lore**: repeated everywhere, with no source.

Say which grade, and give the URL. When sources conflict, say so; never average them silently. Prefer 2024–2026 sources, and flag anything older.

## Output (write to this folder; the file name is in your task)
1. **Findings**: a numbered list. Each item has the claim, grade, source URL, and the specific numbers.
2. **Contradictions**: where you disagree with `evidence.md`, `niche-data.md`, or common advice.
3. **Proposed rules**: concrete and checkable rules for OUR videos. Each has a number or test ("first spoken word ≤ 0.3 s", not "hook fast"), a confidence level (high/med/low), and the evidence behind it.
4. **Applies-to-us**: how each rule explains (or fails to explain) our hits vs flops in the table above.
5. **Open questions**: what only our own analytics could settle.

Aim for depth over breadth: 8–20 strong, sourced findings beat 60 weak ones. Keep it under ~2,500 words.

## Constraints
- Public pages only.
  - Never log in, enter credentials, use cookies, or fill TikTok age-gate or birthday forms.
  - Never post, comment, or follow.
- WebSearch and WebFetch may be deferred tools. Load them with ToolSearch (`select:WebSearch,WebFetch`) before use.
- yt-dlp works for public YouTube (`python -m yt_dlp`). Its TikTok video extractor is broken, and YouTube bot-blocks after ~300 requests.
- Don't put the owner's name, email, or account details into search queries.
- Copyright: summarize sources in your own words. At most one short quote (<15 words) per source.
- Don't edit any project code, skill files, or other researchers' files. Write only your own findings file.
