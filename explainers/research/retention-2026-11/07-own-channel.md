# 07 — Own-channel diagnostic: what separates our 4 hits from our 11 flops

Researcher #7 · 2026-11-27 · grade **OWN** unless marked otherwise.

**Method.**
- I ran `metrics.py` on all 15 posted mp4s, plus the unposted #13 as a control. I also re-transcribed every video with faster-whisper to get word timestamps.
- I measured luminance from 40 samples per video and a pixel-change novelty proxy from 20 samples per video.
- I pulled 0 / 0.5 / 1 / 2 / 3 s hook strips and last-3 s tail strips for every video, and read every contact sheet.
- I took full-resolution crops of each test area to judge phone legibility.
- I counted actors from `src/chain/*.tsx` (`N_EXTRAS`) and `src/three/crowd.ts`.
- I ran `demand.py` on 10 phrasings and reused the README's earlier runs (grade S).
- Scratch files are in the session scratchpad (`m/<id>/`, `hook_*.png`, `tail_*.png`, `words_*.json`).

**Data limits (read these first).**
- Views are lifetime totals read on 11-27, so the videos are at very different ages. #22 is about 1 day old and #20 about 2 days; the hits are 7–10 days old.
- I have no retention, completion or traffic-source data for this account. `~/.tiktok-manager/` only holds tulipyoyo9000.
- Post order comes from the BRIEF table: 01, 03, 06, 04, 10, 12, **15, 14, 16**, 17, 18, **19**, 20, 22, 23. The public profile shows `videoCount: 15`.
- **#13 (Paint) is NOT among the 15 posted videos.** The README still says it "outperformed everything else". The owner should confirm whether it was posted and then deleted.
- I could not get post timestamps. The yt-dlp TikTok user extractor failed, and the profile HTML carries no item IDs. Dates below are render dates, which are close to post dates.
- With n=15, every pattern below is a count, not a proof.

## The 15-row table

**A. Structure** (wps = narration-audio words/s from `*.timing.json`; w/vs = words per video-second; payoff = main answer or twist line, from whisper word times)

| # | views | len s | 1st word | first spoken line | frame-0 (what's on screen) | wps (wpm) | w/vs | payoff s (%) | novelty proxy* | lum |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 Speed Trap | 593 | 29.4 | no VO | (none: LED sign "WHICH ANIMAL GETS A SPEEDING TICKET?") | dark night highway, empty road, LED board | — | 0 | "LICENSE REVOKED" 24.3 (83%) | 6 | 0.23 |
| 03 Wind Test | 623 | 29.5 | 0.0 | "Which of these survives the strongest wind ever recorded?" | bright sky, gauge "3 MPH", 5 contenders with "?" | 3.00 (180) | 2.34 | "went underground" 26.5 (90%) | 14 | 0.46 |
| 04 Fight | 652 | 40.2 | 0.0 | "Tulip versus sunflower. A fight to the death." | two cartoon flowers, health bars, title | 3.03 (182) | 2.31 | "Winner? The deer" 35.3 (88%) | 19 | 0.50 |
| 06 Odds | 550 | 41.2 | 0.0 | "Is Fortnite's pirate token rarer than getting struck by lightning?" | dark navy rays, coin vs bolt, "RARER THAN LIGHTNING?" | 2.40 (144) | 1.97 | "nine times rarer" 24.8 (60%) / finale 37.0 (90%) | 13 | 0.18 |
| 10 Wojtek | 1,124 | 55.6 | 0.0 | "In World War Two, one of the soldiers in the Polish army was a bear." | saluting bear + soldiers + flag, service-record card | 3.41 (205) | 2.75 | "enlisted him" 24.9 (45%), sting 52 (94%) | 17 | 0.61 |
| 12 Pickpocket | 1,370 | 45.6 | 0.0 | "600 people. One pickpocket. 15 seconds. Find him." | 600-person station crowd, card + 15 timer | 3.56 (214) | 1.78 | "That's the pickpocket" 29.2 (64%) | 11 | 0.72 |
| **14 Blood Spatter** | **65.7K** | 59.4 | 0.0 | "Dexter can look at blood on a wall and know how someone died. Learn the code, then you try." | full spatter wall, card "HOW DID THEY DIE?" | 3.18 (191) | 2.31 | "B! A heavy blow" ~37 (62%), kicker 1-in-9 at 57 | 7 | 0.50 |
| **15 Fountain** | **18K** | 48.5 | 0.0 | "In 15 seconds, this guy ends up in the fountain. Find what starts it." | bright plaza, 110 extras, card + 15 timer | 3.63 (218) | 1.67 | "the same guy" 40.4 (83%) | 15 | 0.73 |
| **16 Cake HARD** | **11.7K** | 49.6 | 0.0 | "In 15 seconds, this cake gets smashed. Find what starts it." | bright park, 74 extras, card + 15 timer | 3.67 (220) | 1.69 | "started way up here" 39.6 (80%) | 15 | 0.69 |
| 17 Fingerprint | 795 | 49.6 | 0.0 | "Police lifted this fingerprint at a crime scene. Learn to read it, then you catch the thief." | near-empty dark navy, small print card, cards sliding in | 3.33 (200) | 2.18 | "C! A is a whorl" 31.7 (64%) | 6 | 0.23 |
| 18 Spot the Liar | 860 | 58.8 | 0.0 | "One of these three is lying about last night. Learn what detectives really look for…" | empty dark navy + card + the word "ONE OF" (tiles enter at 0.5 s) | 2.98 (179) | 1.87 | "B!" ~42 (71%) | 6 | 0.26 |
| **19 Sandcastle** | **9.5K** | 54.7 | 0.0 | "In 15 seconds, this sandcastle gets flattened. Find what starts it." | bright beach, 58 extras, card + 15 timer | 3.51 (211) | 1.75 | "crab started it? Nope" ~43 (79%) | 14 | 0.76 |
| 20 GTA 6 | 506 | 71.8 | 0.0 | "In GTA 6, go too far and the game ranks you Irredeemable. Forever." | synthwave rank panel, card "HOW BAD ARE YOU?" | 2.46 (148) | 1.77 | "C! … Thirteen" ~41 (57%), twist ~57 (80%) | 9 | 0.27 |
| 22 Turkey (3D, Gemini) | 303 | 48.9 | 0.1 | "This kid lives on the richest street in town. But his family can't even afford a turkey." | 3D street of houses, **no kid** (VO says "this kid" at 0.1 s; kid appears ~3 s) | 3.57 (214) | 2.99 | "Busted" 25.5 (52%), "12 turkeys" ~44 (90%) | 17 | 0.50 |
| 23 Poison (3D, Gemini) | 374† | 48.7 | 0.1 | "In 15 seconds, someone poisons the rich man's drink. Find out who." | tilted camera swinging onto a 12-room dollhouse, ~48 actors, **no card**; arrow at 3.0 s | 4.26 (256) | 2.42 | "in the ice" ~26 (53%), "She started it all" 37.4 (77%) | 14 | 0.47 |

*Novelty proxy = the number of the 20 samples that differ from the previous sample by a mean pixel change >15. Crowd motion inflates it for the chain videos, so it is NOT the same thing as the niche-data "distinct compositions". † Too young to count.

**B. Task, difficulty, packaging, demand**

| # | viewer task? | stated difficulty / timer | answer verifiable by eye at phone size? | key-detail size (1080-wide frame) | YouTube title | TikTok caption hook | ending | demand (demand.py, S) |
|---|---|---|---|---|---|---|---|---|
| 01 | passive (implied guess) | — | n/a | — | (no caption file) | n/a | **question CTA** "WHO SHOULD WE CLOCK NEXT?" | "which animal is the fastest": 6 ac, median 1.2M |
| 03 | passive (implied guess) | — | n/a | — | "Which of these survives…" | n/a | kicker (bunker) | "strongest wind ever recorded": 3 ac, median 3.0M, **Shorts median 5.8M** |
| 04 | passive | — | n/a | — | (none kept) | n/a | sting (deer) | "tulip vs sunflower": **0 ac**, median 234 |
| 06 | passive | — | n/a | — | "…odds vs real life odds" | n/a | kicker | "fortnite pirate token": 10 ac, median 82K |
| 10 | passive story | — | n/a | — | (none kept) | n/a | sting | "wojtek the bear": 10 ac, median 371K (README) |
| 12 | **yes** | 600 people / 15 s | **no**: the dip is a hand move on ~45 px people in a 600-person mass | ~45 px figures | "Observation Test: Find the Pickpocket in 15 Seconds" | "can you find the pickpocket in 15 seconds?" | **question** "Who's the lookout? comment" | "find the pickpocket": median 3.0M (README) |
| **14** | **yes** | 3 choices / 6 s | **yes**: one big radial spray on a wall filling about 70% of the frame | wall ~900 px | "Dexter Blood Spatter 101: **Can You** Solve This Crime Scene?" | "How do blood spatter analysts like Dexter read a crime scene?… Did you get it before the reveal?" | stat kicker | "dexter blood spatter": 10 ac, median 91K; "blood spatter analysis": 10 ac, median 22K |
| **15** | **yes** | 10 links, 110 extras / 15 s | **yes**: the outcome (splash) is promised, happens on screen at ~16 s, and the replay zooms each link | ~60 px figures, big physical actions | "Chain Reaction: **Can You** Find What Starts It? (10 Links)" | "In 15 seconds this guy ends up in the fountain. 10 things go wrong first. Can you find what starts it?" | kicker "Karma took twelve seconds." | "chain reaction puzzle": 3 ac (game show), median 111K |
| **16** | **yes** | HARD: silent chain, decoys / 15 s | yes on replay (start is in a far corner at 0.4 s, so few solve it live) | ~60–90 px | "Chain Reaction HARD MODE: **Can You** Find…" | same template + "don't trust your ears" | kicker "Happy birthday." | same |
| 17 | **yes** | 3 suspects / 6 s | **no**: B vs C differ by a few ridge minutiae on ~230 px cards | ridge spacing ~6–8 px | "Fingerprint Match: **Can You** Find the Thief?" | "How do detectives match a fingerprint?…" | twist (twins) | "fingerprint match": 10 ac (mostly tech/Hindi), median 31K |
| 18 | **yes** | "Hard" / 10 s | **no**: read six lines of monospace text, find one changed word | text ~18 px cap height | "How to Tell If Someone Is Lying: **Can You** Spot the Liar? (Hard)" | "How to tell if someone is lying: forget body language…" | stat kicker | "how to tell if someone is lying": 10 ac, median 1.7M (README) |
| 19 | **yes** | starts BEFORE the timer, mirrored decoy / 15 s | yes on replay | ~60 px | "Chain Reaction: **Can You** Find…? (Beach, 10 links)" | template + "If you said the crab... watch again" | kicker "The crab is fine." | same as 15 |
| 20 | **yes** | 3 rap sheets + sum points / 10 s | **no**: ~24 lines of ~20 px text plus arithmetic | text ~20 px | "GTA 6 Irredeemable... But in Real Life" | statement, no question | kicker | "gta 6 irredeemable": 9 ac, 0/20 Shorts (README) |
| 22 | passive story | — | n/a | — | "He Tried to Steal a Thanksgiving Turkey... Then This Happened" | statement | sting | "thanksgiving animated story": 5 ac, median 47K (seasonal) |
| 23 | **yes** | ~48 actors, 3-person relay across 12 rooms / 15 s | **no**: a small blue vial handed between guests, plus an unseen pour into the ice | figures ~110 px, vial ~10 px | "Who Poisoned the Rich Man's Drink? You Have 15 Seconds" | "…did you catch WHO? (Hint: it's not who you think)" | kicker | "murder mystery riddles": 7 ac, median 537K; "who poisoned the drink riddle": 0 ac |

## Findings

1. **The hits are one shape. Every hit gives the viewer a task with a timer, AND the answer can be checked by eye at phone size. (4/4 hits; 0/5 interactive flops; 0/6 passive flops.)** [OWN]
   - Every hit asks the viewer to do something.
   - Of the 11 flops, 5 also asked for a task: #12, 17, 18, 20 and 23 (#23 is too young to count).
   - The one thing those 5 share is that the answer could not be checked with the eye at phone size. In #12 it is a hand move among 600 ~45 px people. In #17 it is ridge minutiae. In #18 it is one changed word in 18 px monospace. In #20 it is ~24 lines of 20 px text plus arithmetic. In #23 it is a 10 px vial passed between guests.
   - All 4 hits resolve on one large visual: the spray converging on a single point, or a person going into the fountain / a kite into the cake / a tower onto the castle.

2. **Within the hot window (posts 7–12, Nov 17–20), format split cleanly. Chain Reaction went 3/3 (18K, 11.7K, 9.5K). Teach-then-test went 1/3 (65.7K, then 795 and 860).** [OWN]
   - This is our best control for account momentum. #17 and #18 were posted between hits #16 and #19 and still flopped.
   - So the account was not "hot" in a way that lifts everything.
   - The two teach-then-test flops differ from #14 in their test. #14 is a big visual pattern on a cream wall (luminance 0.50). #17 and #18 are tiny details on dark navy (luminance 0.23–0.26).

3. **Typed search demand does not predict our views.** [S+OWN] Spearman rho is +0.16 (n=13, p=0.61).
   - "Strongest wind ever recorded" has a Shorts median of 5.8M; #03 got 623 views.
   - "Find the pickpocket" has a median of 3.0M; #12 got 1,370.
   - "How to tell if someone is lying" has a median of 1.7M; #18 got 860.
   - Our three Chain Reaction hits have *no* matching typed demand: autocomplete returns the game show.
   - The rule "title with the phrasing people TYPE" did not separate hits from flops on this account. #14's Dexter phrasing is the only case where demand and the hit coincide.

4. **Within each format, views fell as difficulty rose, in the order posted. Difficulty is confounded with time and format fatigue.** [OWN]
   - Chain Reaction: 18K (110 extras, normal) → 11.7K (HARD, silent chain) → 9.5K (starts before the timer) → 374 (#23 whodunit, 3D, too young).
   - Teach-then-test: 65.7K (6 s, three gross categories) → 795 (minutiae) → 860 ("Hard", text) → 506 (text plus math).
   - The "too easy" push (#13 v2, then #16 HARD, then the Liar v1→hard rewrite) runs alongside every decline. With n=4 per format I cannot separate harder-to-see from harder-to-solve from "4th one in a row".
   - What I *can* say: no post after the push toward tiny clues has beaten the post before it. The record is 0 for 6 on #16, 17, 18, 19, 20 and 23, each measured against its format's previous post.

5. **Brightness lines up with views (rho +0.62, n=14, p=0.018), but mostly because of the format.** [OWN]
   - 3/4 hits sit at luminance ≥0.69; the 4th (#14) is 0.50. 5/10 flops are ≤0.27: #01, 06, 17, 18, 20.
   - With the bright Chain Reactions removed, rho drops to +0.43 (p=0.19).
   - Treat dark navy as a *suspect*, not a cause. It travels with text-heavy, small-detail tests.

6. **The hook sentence is NOT the secret. Flops used the hits' exact template.** [OWN]
   - #23 opens "In 15 seconds, someone poisons… Find out who."
   - #12 opens "600 people… 15 seconds. Find him."
   - #17 and #18 use #14's "Learn X, then you Y" line.
   - First word at ≤0.1 s holds for 14/14 narrated videos, hits and flops alike.
   - A question card on frame 0 appears in 4/4 hits and 7/11 flops. All of these are *necessary-looking but not sufficient*.

7. **What the hits do in the first 3 s, frame by frame.** [OWN]
   - Frame 0 (0.0 s) already shows the whole scene, fully populated, with the card and the 15 timer.
   - 0.5 s: the caption grows. 2.0 s: a red arrow plus a label lands on the victim ("THIS GUY / THIS CAKE / THIS SANDCASTLE").
   - 3.0 s: the outcome verb arrives in yellow ("FOUNTAIN", "GETS SMASHED", "GETS FLATTENED").
   - The viewer learns *what will visibly happen to whom* inside 3 s, and the camera is locked.
   - #14 is the same idea: the evidence (the wall) is the frame-0 image.
   - Flops that break this:
     - #18 frame 0 is empty navy.
     - #17 frame 0 is a small print plus cards still sliding in.
     - #22 frame 0 shows houses while the VO says "this kid"; the kid appears at ~3 s.
     - #23 frame 0 is a tilted camera swing with no card; the arrow appears at 3.0 s and the rooms are tiny.

8. **The hits have the longest stretches with no narration and no cut on the channel.** [OWN]
   - Chain hits: 14.3–15.4 s of silence and one locked shot (#15 gap 4.0→19.4 s; #16 4.0→19.3 s; #19 5.6→19.9 s). Their words per video-second are the lowest on the channel (1.67–1.75).
   - Their pixel change is high because ~60–110 people move all the time.
   - Retention in that window comes from *watching*, not from new information. That contradicts the playbook's "novelty every ≤3 s" read as cuts or captions.

9. **Endings do not separate hits from flops.** [OWN]
   - 4/4 hits end on a kicker or sting. So do 9/11 flops.
   - The two question/CTA endings (#01 "Who should we clock next?", #12 "Who's the lookout?") both flopped. That is consistent with niche-data's 0/21, but n=2.

10. **Every hit uses "Can you…?" packaging, which the niche data would discourage.** [OWN]
    - 4/4 hit YouTube titles contain "Can You…?". 4/4 hit TikTok captions put a question to the viewer.
    - But so do #17, #18, #12 and #23. "Can you" marks the interactive format; it does not cause the hit.
    - For an interactive format, a challenge question on frame 0 and in the caption is part of the format, not a violation.

11. **Speech rate does not separate hits from flops; #23 is an outlier.** [OWN]
    - Hits: 3.18–3.67 wps (191–220 wpm). Flops span 2.40–3.57.
    - #23 (Gemini) runs at **4.26 wps (256 wpm)**, the fastest on the channel. It packs a 6-step causal relay ("ice → dumbwaiter → maid → bottle → gardener → niece") into 11 s.
    - That is a comprehension risk, separate from the voice timbre.

12. **The recent slump (#20 506, #22 303, #23 374) started BEFORE 3D and Gemini.** [OWN]
    - #20 is 2D with the Andrew voice. It flopped like #17 and #18, with the same profile: dark, text test, no visual answer.
    - #22 is a passive story. Passive formats are 0/6 on this channel (#10, a 2D Andrew story, also got only 1,124). #22 was also posted on Thanksgiving day and read ~1 day old.
    - #23 is the only 3D/Gemini video in a near-hit format. It also changed four other things at once: no frame-0 card, a 3-person relay instead of a physical chain, a tiny key prop, and 256 wpm. It is also <1 day old.
    - **Bottom line:** the data cannot isolate 3D or Gemini. It does show that the format and solvability problems were already present at #20.
    - There was also a 5-day posting gap (Nov 20 → 25) after the last hit. "The account is dying" and "the gap reset distribution" cannot be told apart from public views.

13. **Cold start: the first 5 posts were all passive, and all got 550–1,124.** [OWN]
    - The first interactive post (#12, post 6) got 1,370, the best of the early run, even though it was unsolvable.
    - The data cannot separate "new account" from "passive format" for posts 1–5.

## Contradictions (with evidence.md, niche-data.md and the playbook)

- **"Novelty every ~1.5–3 s"** (niche-data constant 1). Our three best Chain Reactions hold one locked shot with no VO for ~15 s. If the rule stays, novelty must count *on-screen motion and the event being waited for*, not cuts or captions.
- **"Title with the phrasing people TYPE"** (Brief slot 1). Demand had rho +0.16 against our views. Our 3 Chain hits have no typed demand, and the high-demand topics (wind, pickpocket, liar) flopped. Demand may matter on YouTube search, but it is not what drove TikTok FYP views here.
- **"A question printed on frame 0 is NOT what the hits share"** (niche-data 6). On our channel 4/4 hits have one: a challenge card plus timer. That niche finding came from passive comparison/story/what-if formats, so it should not be applied to interactive challenges.
- **"Make it HARD"** (`feedback_harder_puzzles.md`). Our record says the reverse for clues you can see. Harder *reasoning* (a hidden start in #16 and #19) kept 9.5–11.7K. Smaller *clues* (#12, 17, 18, 20, 23) never got above 1,370. Hard is fine; tiny is not.

## Proposed rules (each checkable)

| # | rule | test | confidence | evidence |
|---|---|---|---|---|
| R1 | Every video gives the viewer a timed task. | the script has a "find/which/who" task with an on-screen timer of 6–15 s | med | 4/4 hits, 0/6 passive posts |
| R2 | **The answer can be checked by eye at phone size.** | the decisive clue is ≥80 px in its smallest dimension on 1080×1920 and needs no reading. Hold the phone at arm's length: can you see the clue without zooming? | **high** (relative to n) | 4/4 hits vs 0/5 interactive flops |
| R3 | No reading inside the test. | 0 words of text a viewer must read to solve; labels ≤3 words and ≥40 px cap height | med | #17, 18, 20 flopped; #14 needed no reading |
| R4 | Promise a big visible outcome and show it inside the timer. | the hook line names WHO + WHAT HAPPENS ("this guy ends up in the fountain"), and that event happens on screen, ≥200 px, before the timer ends | med | #15, 16, 19 (3/3) vs #12 and #23 (theft/poison is invisible) |
| R5 | Frame 0 = the full puzzle scene + question card + timer, with the camera locked by 0.0 s, and an arrow on the target by ≤2.0 s. | frame grab at 0.0 s and 2.0 s | med | 4/4 hits; broken by #17, 18, 22, 23 |
| R6 | Bright scene. | mean luminance ≥0.45 over 40 samples; no dark-navy test screens | low–med (confounded) | rho +0.62; hits 0.50–0.76; five flops ≤0.27 |
| R7 | Difficulty comes from *where or when* (a far corner, before the timer, a decoy), never from *size*. | the decoy and the key clue are the same pixel size; the clue is only hidden by position, timing or a red herring | med | #16 and #19 (hard but visible) held 9.5–11.7K; tiny-clue posts ≤1,370 |
| R8 | The reveal is a visual replay that pays off even if you failed. | the reveal zooms in on each link for ≥1.5 s, with no text-only answer screens | med | all hits; #18 and #20 answers were text highlights |
| R9 | Narration ≤185 wpm on the line-level basis (words ÷ Σ `timing.json` line durations × 60), and ≤1 causal step per 2 s in the reveal. *Correction (xcheck): the wps column above is the articulation rate (pauses between words inside a line excluded), which runs ~1.2× the line-level rate. On the line-level basis the hits are 169–173 wpm and #23 is 230.* | compute from `timing.json` | low | hits 169–173 line-level; #23 230 is untested |
| R10 | Change ONE variable per post when testing the new look. | the next 3D/Gemini post keeps a hit layout (#15/#19: physical chain, card at frame 0, big outcome) | high (method) | #23 changed 5 things at once, so it can teach nothing |
| R11 | No question/CTA endings; end on a kicker. | the last line is a statement | low | 0/4 hits; 2/2 question endings flopped |

## Applies-to-us

- **R2, R3 and R4 explain all 15 rows:**
  - The 4 hits pass all three.
  - The 5 interactive flops fail R2. They also fail R3 (#17, 18, 20) or R4 (#12, 23).
  - The 6 passive flops have no task at all (R1).
- **R6 explains 13/15** (the exceptions are #12, bright but failed, and #14, mid-brightness but hit). It adds nothing once R2 is known.
- **Demand explains none of it:** #03 is the highest-demand flop.
- **Momentum explains part of it at most:** #17 and #18 flopped inside the hot window.
- **For #20, #22 and #23:**
  - #20 fails R2 and R3.
  - #22 fails R1 and R5.
  - #23 fails R2, R4 and R5 and is untested on R9.
  - The 3D look and the Gemini voice are not needed to explain any of them, but they are not cleared either.

## Open questions (only our own analytics can settle these)

1. **Completion % and average watch time per video, at equal age** (48 h). Do the hits show a retention bump or a flat line through the 15 s silent search window? That window is the core mechanism we are betting on.
2. **Where do #17, #18 and #20 lose people:** the lesson (0–25 s) or the test screen? If it is the lesson, it is the teach format; if it is the test, it is legibility.
3. **Traffic source split.** Were the hits FYP-driven, or did any come from search or profile? This decides whether demand.py matters for TikTok at all.
4. **Rewatch rate** on #16 and #19. Hard reasoning that is still visible should produce rewatches ("watch again 👀").
5. **Was #13 posted and deleted?** If it was posted, its views are a 5th Chain Reaction data point.
6. **YouTube Shorts cross-post numbers** for all 15: a second, independent sample on the same creative.
7. **A clean 3D test:** remake #15's structure in 3D with the Andrew voice, then with Gemini. That separates look from voice.
