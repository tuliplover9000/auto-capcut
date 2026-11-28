# 05: Distribution signals, endings, engagement (researcher #5)
Compiled 2026-11-27. Grades follow BRIEF.md. "Read" means I opened the primary page myself; anything else says where it came from.

## 0. New OWN data: public per-video stats (TikTok, read 2026-11-27 ~20:00 UTC)
Pulled from each public video page's embedded JSON (no login). Rates are lifetime figures, so a hit's rates mostly describe its later, broader audience.

| # | ep | len | views | like % | com % | shares | saves | (shares+saves)/1k views |
|---|---|---|---|---|---|---|---|---|
| 23 | Poison (day 0) | 48 s | 383 | 1.6 | 0.26 | 0 | 1 | 2.6 |
| 22 | Thanksgiving | 48 | 303 | 3.3 | 0 | 0 | 1 | 3.3 |
| 20 | GTA 6 | 71 | 508 | 0.8 | 0 | 0 | 0 | 0 |
| 19 | CR Sandcastle | 54 | 9,473 | 1.1 | 0.11 | 1 | 21 | 2.3 |
| 18 | Spot the Liar | 58 | 861 | 4.7 | 0 | 0 | 1 | 1.2 |
| 17 | Fingerprint | 49 | 795 | 3.3 | 0 | 0 | 4 | 5.0 |
| 15 | CR Fountain (ERRATA: BRIEF called this #16 Cake) | 48 | 11,700 | 1.9 | 0.09 | 4 | 19 | 2.0 |
| 14 | **Blood Spatter** | 59 | **66,700** | **8.0** | 0.02 | **323** | **1,468** | **26.9** |
| 13 | CR Paint (ERRATA: BRIEF called this #15 Fountain) | 38 | 18,000 | 2.0 | 0.06 | 7 | 22 | 1.6 |
| 12 | Pickpocket | 45 | 1,370 | 1.9 | 0.15 | 0 | 3 | 2.2 |
| 10 | Wojtek | 55 | 1,124 | 2.5 | 0 | 1 | 2 | 2.7 |
| 04 | Fight | 40 | 652 | 3.2 | 0 | 0 | 0 | 0 |
| 06 | Odds | 41 | 550 | 1.6 | 0.18 | 4 | 0 | 7.3 |
| 03 | Wind | 28 | 623 | 0.6 | 0 | 0 | 1 | 1.6 |
| 01 | Speed Trap | 29 | 593 | 0.7 | 0 | 0 | 1 | 1.7 |

The BRIEF's "115 shares" for Blood Spatter is out of date: it now has **323 shares and 1,468 saves** (66.7K views).

**YouTube Shorts copies: not found publicly.** I searched yt-dlp `ytsearch` for 5 exact titles from the caption files ("Who Poisoned the Rich Man's Drink? You Have 15 Seconds", "Dexter Blood Spatter 101…", "Chain Reaction HARD MODE…", "Fingerprint Match…", "Chain Reaction… (Beach, 10 links)"). None of our videos came up in the top 6–10 results. `youtube.com/@tulipsworld9000` returns 404. A guessed handle exists, but it belongs to an unrelated channel and is not ours. So either the Shorts are not published or public, or they are under a handle I don't know, or exact-title search gives them no ranking at all. **The owner must supply the channel URL before anyone analyses the YouTube side.**

## 1. Findings

**F1 [A] TikTok's current help page (replaces the 2020 newsroom text in evidence.md §1).**
- For You inputs: user interactions ("like, share, comment on, and watch in full or skip"); content information ("Sounds, hashtags, number of video views", country); and user information.
- "User interactions, which may include the time spent watching a video, are generally weighted more heavily." No weights are given.
- Two new points matter for us. First, **a video's view count is itself a ranking input**, which is a cold-start handicap. Second, for **Search**, "how well the content matches the specific term entered" is weighted most heavily.
- Source: https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content (read via browser; it redirects to faq id 7655285288050104852).
- The transparency centre page (© 2025) lists the predicted actions: like, share, comment, Not Interested, **finish, skip, favorite**, watch time, follow, profile visit, and sound tap. The scores are combined, again with no weights. A similarity check stops near-identical videos running back to back. https://www.tiktok.com/transparency/en/recommendation-system/

**F2 [A] TikTok Search reads more than hashtags.** The Creator Academy page "Getting discovered with Search" (updated Aug 18 2026) tells creators to use "description, voiceovers, captions, and on-screen text" to make clear what the video is about. It also says three things are myths: keyword-stuffed or hidden on-screen text (it "can get your video flagged for spam"), long hashtag lists, and TikTok-only editing. The Creator Rewards Program now pays for "search value". https://www.tiktok.com/creator-academy/article/Getting-discovered-with-Search (read via browser). [C] Since about April 2026, creators can also suggest or block a video's search keywords after upload (https://uppbeat.io/blog/creator-news/tiktok-now-lets-you-control-the-search-keywords-on-your-videos; this is secondary, and I found no TikTok announcement). **This overturns evidence.md §7**, which said no official source confirms that speech or on-screen text is used for search.

**F3 [A] TikTok Creator Rewards: the primary text is now verified.** https://www.tiktok.com/support/faq_detail?id=7581821550694013452, read via browser.
- Requirements: at least 10K followers, at least 100K views in the last 30 days, age 18+, videos at least 1 minute long, and at least 1,000 qualified views.
- **A qualified view is a unique FYF view watched for more than 5 seconds**, with "not interested" views excluded. Secondary blogs say "30 s"; the primary page does not.
- Non-original content lists "Content that contains looping videos, single or multiple photos, or only text overlays."
- My reading: the looping item means a clip repeated to pad length, not a narrative ending that loops back to the start. The page does not define it.
- Two limits on what this tells us. These are payout rules, not FYF ranking rules. And at 118 followers we are not eligible, so the "1 minute" rule has **no bearing on distribution for us today**. I found no official statement that FYF favours videos of 60 s or longer.

**F4 [A] YouTube Shorts seed testing, from the platform itself.**
- Todd **Sherman**, the Shorts product lead (not Beaupré), spoke on Creator Insider on 2023-08-23 (https://www.youtube.com/watch?v=n3jsYK_-aRU; this is older than 2024). Via SEJ (https://www.searchenginejournal.com/youtube-explains-how-shorts-algorithm-works/494953/) and outlierkit's transcript notes (https://outlierkit.com/resources/youtube-shorts-algorithm/), he said:
  - Shorts can get "a few hundred or thousand views" while the system looks for an audience. Early views are "exploratory".
  - "The audience is the algorithm."
  - Time of day is not optimised. No posting-volume threshold unlocks anything.
  - Hashtags are not required.
  - **Deleting and reposting risks being seen as spam.**
  - Most thumbnails in the feed are never seen.
  - "Viewed vs swiped away" is the comparison metric. YouTube does not publish the threshold.
- Todd **Beaupré** spoke on Creator Insider on 2026-09-01 (https://www.youtube.com/watch?v=rHLjxrbXmmY, via https://ppc.land/subscribers-skip-90-of-uploads-in-their-feed-youtube-director-says/; the video itself was not watched). He said:
  - Each upload reaches "diverse audiences" in its first hour, including non-subscribers.
  - Subscribers and non-subscribers are learned separately.
  - For new channels, the system matches a video's topic to viewers' interests. **If no interested audience emerges, impressions stop.**
  - Subscribers skip roughly 90% of uploads.

**F5 [A] YouTube view counting changed again.** From **Aug 24 2026**, a "view" counts from the **first frame** in every format. The old definition is now the "engaged view", and recommendations and YPP are unchanged. Retention and AVD (average view duration) stay anchored on engaged views. https://blog.youtube/inside-youtube/engaged-views-youtube-explained/ (2026-08-19). This adds to evidence.md §1, which covers only the March 2025 Shorts change. Public YouTube view counts are now close to impressions, **so compare our Shorts by engaged views or "chose to view" %, never by raw views.**

**F6 [B] On TikTok's feed, about half of what people see is exploration.** Vombatkere et al., WWW '24, used donated real-user TikTok traces (from Zannettou et al., CHI '24: 347 users, 9.2M views). The algorithm "exploits users' interests in between 30% and 50%" of the first 1,000 recommended videos; the rest is exploration. Likes and follows drive personalisation most. https://arxiv.org/pdf/2403.12410 (full text read). Zannettou et al.: only 10.3% of views came from followed accounts (https://homes.cs.washington.edu/~franzi/pdf/zannettou-tiktok-chi24.pdf, via search summary). Munger et al. 2022 found that political TikTok accounts' best video gets 64x their median, against 40x on YouTube (https://www.psu.edu/news/liberal-arts/story/tiktok-lowers-barriers-virality-keeps-tight-control-through-algorithm). Together these say exploration traffic is large, so a new account gets real test traffic, and reach is extremely hit-driven.

**F7 [B, 2021, flagged] The leaked "TikTok Algo 101" document.** TikTok confirmed it is authentic. It scores videos roughly as Plike·Vlike + Pcomment·Vcomment + Eplaytime·Vplaytime + Pplay·Vplay, called "highly simplified", and optimises for retention and time spent. Source: NYT 2021, via https://gizmodo.com/leaked-tiktok-doc-reveals-its-obvious-secret-to-an-addi-1848166901. Expected playtime is one term among several; shares and saves are not named in the formula.

**F8 [lore/C] "Batch testing in fixed pools of 200–500 viewers."** No platform names a number, and I found no TikTok text describing tiered pools. The A evidence (F4 for YouTube; F1 view count as an input) supports **sequential, response-gated expansion**, not fixed batch sizes. **[OWN] Our flop floor is tight:** the 11 non-hits all sit at **303–1,370 views (median 652)**, whatever the format, length or follower count. That fits every video getting a similar exploratory allotment and 11 of 15 failing to earn more. The newest (383 at day 0) can't be judged yet.

**F9 [B, 2012, flagged old] Berger & Milkman, "What Makes Online Content Viral?"**
- Data: 6,956 NYT articles, Aug 30 to Nov 30 2008. Outcome: making the most-emailed list, with controls for home-page placement and timing.
- Effect of +1 SD on the fitted probability (from the figure):
  - Raises it: **anger +34%, awe +30%, practical value +30%, interest +25%, anxiety +21%**, emotionality +18%, surprise +14%, positivity +13%.
  - Lowers it: **sadness −16%**.
- https://faculty.wharton.upenn.edu/wp-content/uploads/2011/11/Virality.pdf (full text read).
- Conflict: [B] Tellis et al. 2019 (J. Marketing, YouTube video *ads*) found informational content *reduces* sharing except in high-risk decisions and on LinkedIn. Positive high-arousal emotions (inspiration, amusement, excitement, warmth) increase it. https://www.ama.org/research-insights/research-insight-what-drives-sharing-of-digital-content/. Berger studied news and Tellis studied ads; neither studied short-form video. I found no 2020–26 large-n study of what drives shares on short video (only small or branded samples).
- [C] STEPPS (Berger, *Contagious*, 2013): Social currency, Triggers, Emotion, Public, Practical value, Stories. It is a synthesis book, not a new test.

**F10 [OWN] Shares and saves did NOT carry 3 of our 4 hits.**
- The Chain Reaction hits reached 9.5–18K views with **1.6–2.3 shares+saves per 1K**. The flops sit at 0–7.3 per 1K, so the hits were no higher.
- Like-rate is also inverted: Liar 4.7% → 861 views, Sandcastle 1.1% → 9.5K. That is OWN confirmation of niche-data #5.
- Only Blood Spatter is an engagement outlier: 26.9 per 1K (12x the Chain Reaction hits), with **saves 4.5x shares** and likes at 8%.
- So we have two routes to reach. The Chain Reaction route is watch-driven: our inference is completion plus rewatch, which public data can't show. Blood Spatter's route is save-driven practical value.
- Comments are negligible everywhere: at most 13 per video, 0–0.26%.

**F11 [A] Instagram (for any future Reels cross-post).**
- Mosseri, "Instagram Ranking Explained" (2023-05-31, older than 2024): Reels rank mainly on predicted likelihood to **reshare, watch all the way through, like, and visit the audio page**. Reels are shown less if they are **watermarked**, already posted on Instagram, low-resolution, bordered, or mostly text. https://about.instagram.com/blog/announcements/instagram-ranking-explained (read).
- [A, via C] In January 2025 Mosseri named watch time, likes per reach and **sends per reach** as the top 3. "Sends slightly more important for unconnected" (non-follower) reach. https://www.socialmediatoday.com/news/instagram-shares-algorithm-insights-2025/738034/ (secondary; Mosseri's own video not checked).
- [A] Trial Reels (2024-12-10): shown to non-followers first, and can auto-share to followers if the first 72 h go well. https://about.fb.com/news/2024/12/trial-reels-try-content-non-followers-first-see-what-perfoms-best
- [C] April 2024 originality change: Instagram replaces reposts with the original and credits it (Tubefilter/Engadget). https://www.engadget.com/instagrams-algorithm-overhaul-will-reward-original-content-and-penalize-aggregators-130018977.html

**F12 [C/conflicting] Posting time.** Buffer has a 7.1M-post TikTok study of *engagement rate*, not reach (https://buffer.com/resources/best-time-to-post-on-tiktok). Its own article versions disagree on the best slot, and Sprout Social reportedly says something different again. For Shorts, Sherman (A) says time of day is not optimised. [OWN] Our 4 hits went out at 03:47, 06:24, 20:30 and 22:38 UTC, while the flops cover the same hours. That's no pattern at n=15. **Grade: lore.**

**F13 [A] Hashtags.** TikTok says relevant hashtags "can support discovery" but more is not better, and overloading "can actually work against you" (F2). YouTube says hashtags are not required (F4). No primary source supports #fyp. Our Poison caption uses #fyp.

**F14 [A/C] Cross-posting.** TikTok makes ineligible for FYF content that is "unoriginal or reused material without anything new" (evidence.md §10). That targets other people's content, not your own original posted in two places. Instagram demotes watermarked Reels (F11, A). For YouTube, I found no primary statement that it demotes TikTok-watermarked uploads (lore). YouTube itself watermarks Shorts downloaded from Studio, since Aug 2022 (TechCrunch, https://techcrunch.com/2022/08/18/youtube-shorts-will-start-adding-watermarks-to-discourage-cross-platform-sharing/amp/).

**F15 [B-weak, 2012] Questions and comments.** de Vries, Gensler & Leeflang 2012 (355 Facebook brand posts): a question in the post raised comment counts. Whether it also cut likes is unverified; I couldn't confirm from the abstract. https://ideas.repec.org/a/eee/joinma/v26y2012i2p83-91.html. I found nothing on short-video puzzle comments. [OWN] Speed Trap's "Who should we clock next?" got 0 comments. The puzzle videos whose caption asks "Did you catch it before the replay?" got 10 comments on 11.7K–18K views (≈0.06–0.09%).

**F16 [lore] Loops and rewatches.** No platform or independent source measures a loop effect. YouTube counts replays as views (counting only). TikTok's transparency page lists "finish" and watch time but not "replay". The YouTube help docs list "Stayed to watch" / "chose to view", but they say nothing on rewatching as a ranking factor. Pinned comments and "Part N" numbering: I found no evidence either way (lore).

## 2. Contradictions
1. **evidence.md §7 is outdated:** TikTok (A, F2) now says voiceover, on-screen text, captions and description all help Search.
2. **evidence.md §4/§10 graded the Rewards text A→C:** it is now read from the primary page. Qualified view = **>5 s**, not 30 s. The "looping" item is about originality in a payout programme, not ranking, and doesn't apply to us (118 followers).
3. **evidence.md §1 "A-gap: viewed vs swiped away":** Sherman (A, 2023) describes it as YouTube's own comparison metric. What remains unpublished is the threshold, not the metric.
4. **The coordinator's brief attributes the swipe and seed-audience remarks to Beaupré;** they are Sherman's (2023). Beaupré's 2026 remarks are about diverse first-hour audiences and impressions stopping.
5. **"Shares are what make videos go viral" (common advice):** contradicted by OWN F10. Our 3 Chain Reaction hits reached 9–18K with near-zero shares.
6. **Berger (practical value +30%) vs Tellis (information hurts sharing):** unresolved because the content types differ. Blood Spatter has both practical value and a high-arousal subject (blood, a killer), which fits Berger.
7. **BRIEF's 115-share figure** is now 323 shares and 1,468 saves.
8. **"Graduate past 200–500"** is an unsourced number. The A evidence describes response-gated expansion with no fixed batch size.

## 3. Proposed rules
| # | rule (checkable) | conf. | evidence |
|---|---|---|---|
| R1 | Every video has a **commit-then-reveal moment**: the viewer is asked to pick (a timer, A/B/C, "find it") and the reveal shows they could have caught it, by replaying or pointing back to an earlier frame. Put it at 25–60% of runtime. It is a *beat inside the video*, not a question to the viewer. | med | OWN: 4/4 hits have one; but Fingerprint, Liar and Pickpocket also have one and flopped, so it is **necessary, not sufficient** |
| R2 | **Final line is a kicker** that reframes the reveal ("The crab is fine.", "1 in 9"). No spoken or on-screen question to the viewer and no end card in the last 3 s. Video ends ≤0.8 s after the last word. | med-high | S 0/21; OWN Speed Trap CTA → 0 comments; F15 says CTA questions raise comments only on old brand-post data |
| R3 | **Save trigger:** every teach-then-test episode ends with one reusable real-world fact plus a source in the caption (Blood Spatter's "analysts wrong 1 in 9"). Target **≥10 saves+shares per 1K views**. Under 5 per 1K at 72 h = no practical-value pull. | med | F9 practical value +30% [B]; OWN F10 |
| R4 | **Seed-pool gate:** at 72 h, <1,000 views *and* <5 saves+shares per 1K = the variant failed its exploratory pool. Allow one retry with a changed hook or topic, then drop it. **Never delete and repost.** | med | F4 [A]; F8 OWN floor 303–1,370 |
| R5 | **Search packaging (TikTok):** the typed query phrase from demand.py appears (a) as the first words of the description, (b) spoken in the first 3 s, and (c) as on-screen text once. No hidden or tiny keyword text. Use **3–5 topical hashtags; drop #fyp**. | med | F2, F13 [A] |
| R6 | **YouTube title:** typed phrase within the first 40 characters. Judge Shorts by **engaged views / "chose to view" %**, never raw views (first-frame counting since 2026-08-24). | med | F5 [A] |
| R7 | **Posting time is not a variable.** Post when ready and don't hold videos for a "slot". | med | F4 [A], F12 OWN/lore |
| R8 | **Cross-post the clean Remotion render** to every platform. Never re-upload a downloaded TikTok or Studio file, which would carry the other app's watermark. | high (IG), low (YT) | F11, F14 |
| R9 | **Length is set by the story, not by Rewards.** The ≥60 s rule only matters once we have ≥10K followers. If we target Rewards later, make it ≥60 s with no padded or repeated clip. | high (fact) | F3 [A] |
| R10 | **Pop-culture trigger plus a high-arousal subject** for teach-then-test episodes: name a known show, game or event in the first spoken line, and make the subject one that evokes awe, anxiety or anger (crime, danger, extremes). Avoid sad stories. | low-med | F9 [B]; OWN n=1 (Blood Spatter's Dexter hook; GTA 6 also had a trigger and got 508) |
| R11 | **Ignore like-rate and comments** as success signals. Log completion %, rewatch (if TikTok Studio shows it), saves/1K, shares/1K and search share. | high | OWN F10, S niche-data #5 |

## 4. Applies to us
- **Chain Reaction hits (13 Paint, 15 Fountain, 19 Sandcastle; per ERRATA.md, #16 was never posted):** they have R1 ("Too late! Did you catch it?" at ~15 s, then a replay reveal) and R2 (kickers like "Happy birthday." and "The crab is fine."). With no share or save advantage, the likely engine is completion plus scrolling back, which matches F1/F7 watch-time weighting. That is unproven until we pull retention.
- **Blood Spatter (14):** it fits STEPPS almost entirely:
  - practical value (learn 5 patterns), which shows in saves being 4.5x shares
  - social currency (you solved a forensics puzzle, "like Dexter")
  - a trigger (Dexter)
  - a high-arousal subject (blood, a killer)
  - a story, plus a surprising true stat as the kicker
  Fingerprint (17) and Liar (18) copied the structure without the pop-culture trigger or the arousal, and stalled at about 800. GTA 6 (20) had the trigger without the arousal or a visual test, and got 508. **R10 is the best-supported explanation, but it rests on one hit.**
- **Flops 01/03/04/06/10/22:** no commit-then-reveal (R1) at all. 01 ended on a CTA question (R2 violated). They all sit in the seed-pool floor (R4).
- **Unexplained:** Pickpocket (12) and Liar (18) have R1 and kickers but still flopped. So a hook or topic gate sits upstream (tracks 1–3), and R1/R2 alone don't predict a hit.
- **Poison (23):** too young (383 views at <1 day). It uses #fyp and a "Hint: it's not who you think" caption, both fine under R2 since the question is in the caption, not the video.

## 5. Open questions (only our analytics can settle these)
1. Completion % and **rewatch** (average watch time above 100%?) for the CR hits vs Pickpocket and Liar. This is the test of the "watch-driven" route.
2. Traffic source split per video: FYF vs Search vs Profile. Did Blood Spatter's tail come from Search ("dexter blood spatter")?
3. Day-by-day view curve: did each hit break out within 24–48 h of an initial ~500-view plateau? That would confirm F8.
4. The YouTube channel URL, so we can measure "chose to view" % per Short.
5. Do saves on the teach-then-test episodes lead to follows (profile visits)?
