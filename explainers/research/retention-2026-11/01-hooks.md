# 01: Hooks (the first 0–3 s, and the packaging)

Researcher #1 of 7 · 2026-11-27 · grades as defined in BRIEF.md

**Method.**
- **Ours.** I extracted frames at 0 / 0.25 / 0.5 / 1 / 1.5 / 2 / 2.5 / 3 s from all 15 tabled episodes (plus #13). I also measured a motion profile: the mean absolute frame difference over 0–3 s at 10 fps. The spoken words and their timings came from `episodes/*.timing.json`.
- **Other creators.** I pulled 9 YouTube Shorts with yt-dlp, sorted by view count, and handled them the same way.
  - Six hits: Zack D. Films ×4 (*Stolen Money* 26.8M, *Missing Dollar* 30M, *Matchstick* 16M, *How To Solve Ten Penny* 4.4M); Cuemath *Catch the thief* 16.6M; Topper Guild *KPop puzzle* 19.4M.
  - Weak: Pacific Learners *Spot the difference* 35K.
  - I read the spoken words from the burned-in captions, because the Whisper pass did not finish.
- **Zack D. Films titles.** I parsed the titles and view counts of his last 300 Shorts.
- Scratch outputs: `%TEMP%\claude\…\scratchpad\ours\*.png`, `…\ext\strips\*.png`, `…\ext\zack.txt`.

---

## 1. Findings

**F1 [A]: Every platform now measures "the opening" as its own metric. None publishes a ranking weight for it.**
- **YouTube.** "Stayed to watch" is "the percentage of times viewers stayed to watch past the initial seconds of a Short". The same page defines Engaged views from the same cut-off. https://support.google.com/youtube/answer/12220281
- **Instagram (Aug 2025).** Instagram replaced "view rate" with **skip rate**, defined as "the percentage of views where viewers skip a Reel within the first 3 seconds". Instagram also added a retention chart: "the flatter the line, the more engaged". Sources: https://www.socialmediatoday.com/news/instagram-adds-retention-insights-reels/758464/ (news report of Instagram's post), and the Meta developer blog, 2025-12-03: https://developers.facebook.com/blog/post/2025/12/03/instragram-api-updates/
- **TikTok, ads only.** TikTok's *Creative Codes* (May 2023) defines the hook as "the first six seconds" and claims that 90% of ad-recall impact and 80% of awareness impact are captured within 6 s. It also reports, from coding 3,500 ads, that suspense early gives +16% watch time and surprise gives 1.7× view-through rate. These are ad studies (Marketcast, Lumen), not organic ranking. https://ads.tiktok.com/business/library/Creative_Codes_ENG.pdf
- So the windows conflict: YouTube says "initial seconds" with no number, Instagram says 3 s, TikTok ads say 6 s. Don't average them. Design for the shortest window, which is under 3 s.

**F2 [A]: YouTube Shorts ranking is a "seed audience" test.**
- Todd Sherman (Shorts product lead, Creator Insider, Aug 2023) described a seed audience. Depending on how it responds, a Short "may get a lot more traffic or it may taper off".
- A view requires a "meaningful threshold" of intent to watch, which YouTube does not publish.
- Thumbnails are irrelevant once viewers are swiping.
- Nothing official says the swipe-away rate itself is the ranking signal.
- Source: https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/
- The same holds in 2025: Hoyos says "99.9%" of Shorts views come from the feed, so thumbnails don't matter. https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/ (2025-01-28; Hoyos's own view, C)

**F3 [B]: Early exit and overall completion are almost the same variable.**
- **SnapUGC** (ECCV 2024): 90,000 Snapchat Spotlight videos with more than 2,000 views each.
  - The engagement continuation rate (the share of viewers who watch more than 5 s) correlates **0.926** with normalised average watch percentage.
  - Both distributions are **bimodal**: viewers swipe past a video early or stay.
  - Source: https://arxiv.org/html/2410.00289v1
- **Dashlet** (Li et al., arXiv 2204.12954; 133 MTurk users made 15,344 swipes on 500 popular TikToks; 2022, so older).
  - 29% of swipes fall in the first 20% of a video.
  - Per video the shape differs widely: one video lost about 60% of its swipers in the first 20%, while others lost 60–80% only in the last seconds.
  - So the opening is a per-video property, not a fixed platform constant.
  - Source: https://ar5iv.labs.arxiv.org/html/2204.12954
- Implication: since the standing finding is "completion is the gate", the first ~5 s are most of that gate.

**F4 [C, method shown]: Viewed-vs-swiped has a floor.**
- Paddy Galloway's study covered 5,400 Shorts from 33 channels (3.3B views), with medians checked.
- Shorts under 60% viewed-vs-swiped "rarely performed well". The best ones sat at 70–90%. A high rate did not guarantee success.
- His advice: "treat your intro like a thumbnail".
- April 2023, so older. https://threadreaderapp.com/thread/1646898356419981315.html

**F5 [OWN, n=15, confounded]: Frame 0 sorts our hits from our flops better than anything else I measured.**

| frame-0 type | episodes | views | hits (>5K) |
|---|---|---|---|
| **Playable field:** the full puzzle scene or object fills the screen at 0.00 s, and you can start searching immediately | 14 blood wall, 15 fountain plaza, 16 park, 19 beach, 12 station crowd | 65.7K, 18K, 11.7K, 9.5K, 1.4K | **4/5** |
| Abstract quiz UI: mostly empty dark screen, "?" placeholder cards, small subject | 17 fingerprint, 18 liar, 20 GTA | 795, 860, 506 | 0/3 |
| Headline or title card: a static question or "X vs Y" graphic | 01, 03, 04, 06 | 593, 623, 652, 550 | 0/4 |
| Establishing story shot: the subject arrives at about 2.5 s | 10 Wojtek, 22 turkey | 1,124, 303 | 0/2 |

- (#23 poison is a playable field but too young to judge.)
- Frame-0 brightness follows the same split. All five dark openings (mean luma < 0.25: #01, 06, 17, 18, 20) flopped. The hits sit at luma 0.53–0.78.
- **Confound:** frame-0 type is almost the same thing as format (chain reaction against teach-quiz against comparison). This finding cannot separate the two.
- **Timing rules out one explanation:** the flops #17, 18, 20 and 22 came *after* the hits, so account growth does not explain the difference.

**F6 [OWN]: The opening line of our hits names a concrete event with a victim. The flops promise a lesson.**
- **Chain-reaction hits.** All three say: "In 15 seconds, this guy ends up in the fountain / this cake gets smashed / this sandcastle gets flattened. Find what starts it." That is 8–9 words, spoken from 0.10 s to about 3.0 s. The task verb "Find" lands at 3.26–3.55 s. A red arrow and label point at the victim from 1.5–2.0 s.
- **Blood spatter (65.7K).** The line is a superpower claim on famous IP with death at stake: "Dexter can look at blood on a wall and know how someone died."
- **Flops.**
  - Fingerprint: "Police lifted this fingerprint… *Learn to read it*, then you catch the thief."
  - Liar: "One of these three is lying… *Learn what detectives really look for*." The task only arrives at 5.1 s.
  - GTA: "In GTA 6, go too far and the game ranks you Irredeemable."
- **Pickpocket (1.4K)** had the same time limit and task as the hits ("600 people. One pickpocket. 15 seconds. Find him.") but **no event and no outcome**. It is a static search. It is the one playable-field video that missed. That points at the event as the active ingredient, not the crowd.
- This is the "start at the end" or payoff-tease hook: the outcome is given away, and the curiosity is about the cause.

**F7 [S, n=6 hits + 1 weak]: Hit puzzle Shorts from other creators open on the puzzle object in action, with a plain premise sentence and no on-screen question.**
- **Zack D. Films ×4.**
  - Frame 0 is already mid-action: a hand in a cash drawer, three men paying at a desk, fingers placing matches.
  - The narration states the scenario in about 8 words by 3 s: "He steals $100 from the cash register"; "Three people check into a hotel room that cost $30"; "These four matchsticks form a plus sign…".
  - There is a camera change every ~1 s, with motion scores of 13–21 (ours are 2–5).
  - No header card. "Can you" is never spoken in the first 3 s; it lives only in the title.
- **Cuemath (16.6M).** "Here is a map with a thief and you. Your task is to catch him." The puzzle is full-screen at 1.0 s and "you" is said at 1.5 s. Its motion score is low (1.25) and its frame 0 is dark (0.13) but carries a human face. So **neither high motion nor brightness is necessary** when there is a face or the object.
- **Topper Guild (19.4M).** No speech. Frame 0 is the full puzzle wall. The host *fails an attempt* by 3 s, which shows the stakes.
- **Pacific Learners (35K).** A static logo plus a "Spot the difference" banner for more than 3 s, with zero motion. This is the textbook dead opening.

**F8 [S]: Same creator, same format: "Can you solve" titles beat "How to solve" titles.**
- Among Zack D. Films' last 300 Shorts (median 10M), the 3 titles that start "Can You Solve…" got 16M, 26M and 30M.
- The single "How To Solve The Ten Penny Puzzle" got 4.4M, though its opening is built the same way (object on frame 0, premise narrated).
- n=3 against n=1, so this is a hint, not proof. Our flops #17 and #18 also *led* with instructional or SEO phrasing ("Fingerprints 101", "How to Tell If Someone Is Lying"). Our hits led with the event plus "Can you find…".

**F9 [B]: The curiosity mechanics behind "start at the end" and "can you".**
- **Loewenstein (1994).** Curiosity is the felt gap between what you know and what you want to know. It needs a reference point, because some information *raises* curiosity, and it grows as the answer gets closer. Psychological Bulletin 116:75–98, https://doi.org/10.1037/0033-2909.116.1.75 (old, foundational).
- **Kang et al. (2009).** Curiosity is an inverted U against confidence: it peaks when people are moderately sure. It increases willingness to spend time or tokens to see the answer, and improves memory for surprising answers. Psychological Science 20:963–973, https://doi.org/10.1111/j.1467-9280.2009.02402.x
- Read onto our videos:
  - "This cake gets smashed" gives the reference point (the outcome) and leaves a narrow, answerable gap (which of 10 links).
  - "Learn to read fingerprints" opens a *wide* gap at low confidence, which sits at the bottom of the curve.
- **Szpunar et al. (2013).** Giving viewers a task during online lectures reduced mind-wandering and improved learning. PNAS, https://doi.org/10.1073/pnas.1221764110 (lecture video, not Shorts). This supports stating the viewer's task early, not after the lesson.

**F10 [A]: Bait-and-switch has a real, documented penalty route on YouTube. TikTok's route is unproven.**
- **YouTube's satisfaction signal.** YouTube surveys viewers (1–5 stars) and trains a model to predict "valued watchtime", which counts only 4–5-star watching. It also demotes borderline content that is "misleading or deceptive". VP Eng. Goodrow, 2021-09-15: https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/
- **YouTube's clickbait enforcement.** In December 2024 YouTube began enforcement against "egregious clickbait" (titles or thumbnails promising what the video doesn't deliver), starting in India. https://blog.google/intl/en-in/products/platforms/strengthening-enforcement-against-egregious-clickbait-on-youtube/
- **MrBeast production doc [C, leaked 2024, authenticity contested].** The first minute must show that the thumbnail's promise "will be met". Losing 21M of 60M clickers in minute 1 was considered good. https://simonwillison.net/2024/Sep/15/how-to-succeed-in-mrbeast-production/
- **TikTok.** I found no official statement on a mismatch penalty. Treat it as likely-but-unproven.

**F11 [C]: The creator hook frameworks agree on the shape, but none shows data.**
- Hoyos: "you have one second". Her method is startle → curiosity → payoff, with foreshadowing as the most underrated tool. (YouTube blog above; podcast summaries.)
- Galloway: the first second is a thumbnail.
- TikTok/CreatorIQ ad report: a person in the first seconds gives +50% hook strength; saying "you" in the first 5 s gives +128% purchase intent. This is an ad metric, no n was given, and it is face-centric. https://www.marketingbrew.com/stories/2023/12/18/pay-attention-to-me-report-shares-brand-tips-for-catching-users-interest-on-tiktok
- I could not find a primary source for Kallaway's frameworks, so I'm not citing them.

**F12 [B-weak]: Interpretable engagement models put opening-relevant visual features near the top.**
- A Dec 2025 study of 11K edutainment Shorts ranked audio-energy dynamics (12.4% SHAP) and frame variance and motion (10.7%) as the top features. Its engagement target is likes-based, which is inconsistent with what we care about, and it does not test openings.
- Treat it as weak support for "energetic audio + visible change", not for hooks specifically. https://arxiv.org/html/2512.21402

---

## 2. Contradictions

1. **evidence.md §2 and its "What's lore" list say "no platform states a number".** That is now out of date for *measurement*:
   - Instagram's skip rate is officially 3 s.
   - YouTube's "Stayed to watch" (answer 12220281) is the renamed "viewed vs swiped away".
   - TikTok's ad guidance says 6 s.
   - What is still lore: that any of these is a **ranking weight**, and any numeric target. Galloway's 70–90% is C.
2. **SKILL.md and niche-data say "content at 0.00 s" and "first motion ≤ 0.5 s".** True of every one of our 15 videos. Narration starts at 0.00–0.12 s, and first motion is at 0.1–0.3 s (except #01 at 2.0 s). These rules are **necessary hygiene, not an explanation**: our flops pass them too. The discriminators are *what* is on frame 0 (F5) and *what* the first line promises (F6).
3. **Motion amount.** Common advice says "big movement at frame 0". Our hits had *low* 0–3 s motion (2.2–4.7, the same as the flops at 3.6–5.5), and Cuemath's 16.6M had 1.25. Motion size does not separate hits from flops. Showing the object does.
4. **SKILL.md brief slot 1: "Title the video with the phrasing people TYPE."** For a test video, leading the title with the search phrase ("How to Tell If Someone Is Lying", "Fingerprints 101") coincided with our flops. Zack's "How To Solve" underperformed his "Can You Solve" titles. I propose: event plus challenge first in the title, and the search phrase in the description and hashtags. That is unproven (F8 is n=4), so treat it as a test, not a law. This conflicts with the Search = 30% standing finding from the other account, so it needs an A/B test.
5. **niche-data #6: "a question printed on frame 0 is NOT what hits share".** We agree, and extend it.
   - Our three frame-0 headline-question videos all flopped (#01, 03, 06).
   - The header question card appears on our hits *and* our flops, and Zack's hits have none. It is neutral.
6. **Hook window conflict:** Hoyos says 1 s, Instagram 3 s, TikTok ads 6 s, SnapUGC 5 s. These are different metrics, not one truth. I propose designing frame 0 to work alone (a 1-s viewer must see the test) and the sentence to finish by 3 s.

---

## 3. Proposed rules (checkable)

| # | Rule | Test | Conf. | Evidence |
|---|---|---|---|---|
| H1 | **Frame 0 is the playable field.** The full test scene or object fills ≥ 60% of the 1080×1920 frame at t = 0.00. No title card, logo, empty UI, "?" placeholders, or establishing shot without the subject. | Read the 0.00 s frame: could a muted viewer start the task from this frame alone? | **med** | OWN F5 (4/5 vs 0/9), S F7 |
| H2 | **The first sentence is a concrete event with a victim and an outcome**, ≤ 10 words, ending by 3.0 s: "In 15 s, [this X] [gets harmed/lost/destroyed]". For a teach format, the sentence is a power claim over a crime or death ("…and know how someone died"), never "Learn…". | Count the words before the first full stop in `timing.json`, and check the end time. No "learn/lesson/101" in the first 5 s. | **med** | OWN F6, S F7, B F9 |
| H3 | **The viewer's task is spoken by ≤ 3.6 s** ("Find / Spot / Catch who…"). | Timestamp of the first task verb in `timing.json`. Ours: hits 3.26–3.55 s; liar 5.1 s. | med-low | OWN F6, B Szpunar |
| H4 | **Point at the subject by ≤ 2.0 s**: an arrow plus label on the victim or object named in the line. | Frame at 2.0 s shows the pointer. Hits: 1.5–2.0 s; #22 and #23: 2.5 s. | low-med | OWN F6 |
| H5 | **Frame-0 mean luma ≥ 0.45**, unless a face or an in-motion close-up is on screen. | `hookstrip.py` `frame0_luma` | low | OWN F5 (confounded), S F7 Cuemath exception |
| H6 | **Packaging repeats the hook.** The TikTok caption's first sentence is the spoken event line. The title is "[event/stakes] + Can You [find/solve]…?". The search phrase goes after it or in the description, never as the title's lead. | String check on `.caption.txt` | low-med (A/B it) | OWN 13–19 vs 17/18/20, S F8 |
| H7 | **Deliver the tease.** The outcome named in line 1 happens visibly on screen, and the answer to the task is shown explicitly. Every number in the hook (15 s, 10 links, 600 people) is literally true and visible as a countdown or count. | Pre-post checklist: a timestamp for the outcome and for the reveal. | **high** (policy) / med (mechanism) | A F10, C MrBeast |
| H8 | **Hygiene (already met; keep it):** narration starts ≤ 0.15 s, a visible change ≤ 0.5 s, no music lead-in. | `timing.json` first word; `hookstrip` `first_motion_s` | high | S niche-data, OWN |
| H9 | **Measure the hook in the platform's own metric.** For every post, log the share of viewers who stay past the opening: TikTok retention at 2 s and 5 s, YouTube "Stayed to watch", Instagram skip rate. Flag below 60% stayed. | ledger.md entry | med | A F1, C F4 |

---

## 4. Applies to us

| ep | views | H1 field | H2 event line | H3 task ≤3.6 s | H4 pointer ≤2 s | verdict |
|---|---|---|---|---|---|---|
| 14 Blood | 65.7K | ✔ wall at 0.00 | ✔ power claim + death + Dexter | ✔ ("can" 0.45) | n/a | rules explain it |
| 15 Fountain | 18K | ✔ | ✔ | ✔ 3.33 | ✔ | explained |
| 16 Cake | 11.7K | ✔ | ✔ | ✔ 3.26 | ✔ | explained |
| 19 Sand | 9.5K | ✔ | ✔ | ✔ 3.55 | ✔ | explained |
| 12 Pickpocket | 1.4K | ✔ | ✘ no event | ✘ 3.65 | ✘ | partly: H2 fails |
| 17 Fingerprint | 795 | ✘ dark, tiny object | ✘ "Learn to read it" | ✘ 3.88 | — | explained |
| 18 Liar | 860 | ✘ empty "?" cards | ✘ "Learn what…" | ✘ 5.11 | — | explained |
| 20 GTA | 506 | ✘ menu UI | ~ (stakes, but no event or victim) | ✔ 3.1 | — | explained |
| 22 Turkey | 303 | ✘ street, kid at 2.5 s | ~ premise, no outcome | ✘ none | ✘ 2.5 | explained |
| 23 Poison | 374 (too young) | ✔ house | ✔ "someone poisons the rich man's drink" | ✔ 3.26 | ✘ 2.5 s, no header card | **the test case**: the rules predict ≥ 5K if the hook is the gate. If it stays under 1K, the hook is not the gate for this format (48 s length, 3D look, voice) |
| 01/03/04/06 | 550–652 | ✘ title cards | ~ question or "X vs Y" | ✘ | — | explained |
| 10 Wojtek | 1.1K | ✘ | ~ odd fact | n/a | — | explained (a story format; H-rules fit it poorly) |

What the rules **don't** explain: why blood spatter got 3.6× the views of the best chain reaction, and was the only one with real shares. That is probably topic and IP (Dexter) plus the teach-then-test payoff, which is the job of other tracks.

---

## 5. Open questions (only our analytics can settle these)

1. **Is the drop really in the first 3 s?** We need a TikTok Creator Center retention curve per video, as a 2-s and 5-s "% still watching" for #14–19 against #17, 18, 20, 22. If the flops hold viewers through 5 s and die later, H1–H3 are wrong and the problem is mid-video.
2. **Frame-0 type against format.** One clean A/B: remake #17 (fingerprint) with H1/H2. Frame 0 becomes the full crime scene with the print and the suspects in view. The line becomes "Someone broke into this house. The thief left one fingerprint. Find whose." Keep everything else identical.
3. **Title test (H6).** Post the same video to YouTube with a "Can you…" lead against a search-phrase lead. TikTok has no title A/B.
4. **Search-traffic share** of the SEO-titled flops (#18, 20) against the event-titled hits. Does the "Search = 30%" finding transfer to this account?
5. **The poison verdict at 72 h** (see the H-check row for #23).

Source URLs used: all inline above.
