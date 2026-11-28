# xcheck-05: signals / endings cross-check (researcher #5, 2026-11-28)

**New OWN data that changes several conclusions.**
- I read post timestamps (`createTime`) from each public video page's embedded JSON. 07 said these were unobtainable.
- I re-pulled the newest videos at 2026-11-28 08:56 UTC:

| ep | posted (UTC) | views at BRIEF read | views now | age now |
|---|---|---|---|---|
| #23 Poison | 11-27 19:53 | 374 | 412 | 13 h |
| #22 Turkey | 11-26 19:50 | 303 | 307 | 37 h |
| #20 GTA | 11-26 15:52 | 506 | 532 | 41 h |

- When the BRIEF read #23 (374), it was only a few hours old. It then grew by about 10% in the next ~10 h. **All three have flat-lined.** The exploratory pool is spent within hours, not days.
- Post order from the timestamps (re-attributed per ERRATA.md):
  - #13 Paint (18.2K, 38 s) on 11-17 06:24, #14 on 11-17 22:38, #15 Fountain (11.8K, 48 s) on 11-18 03:47
  - #16 Birthday Cake was never posted. Every "#16 = 11.7K" in other files is #15 Fountain, and every "#15 Fountain = 18K" is #13 Paint.
  - #17 on 11-18 23:13, #18 on 11-19 23:45
  - #19 on 11-21 20:30, then #20 and #22 on 11-26

## 1. Verdicts on others' claims

| claim (file) | verdict | evidence |
|---|---|---|
| #23 "too young to judge" (01, 02, 04, 06, 07) | **WRONG** | 374→412 over ~10 h; same for #20 and #22. These are judged flops. |
| 01's test: "if the hook is the gate, #23 gets ≥5K" | **resolved: failed** | #23 passes H1–H3 and plateaued at about 400. Hook rules are necessary at most, not sufficient. 06's prediction (<1K) held. |
| #20 "about 2 days old", 5-day gap "Nov 20→25" (07) | WEAKENED (detail) | At the BRIEF read #20 was about 30 h old. The gap ran 11-21 20:30 → 11-26 15:52 (4.8 d). |
| "The account wasn't just hot" (02, 07) | **CONFIRMED** | #17 and #18 went out between hits #15 Fountain and #19 and got 795 and 861. One nit: 02 lists Blood before the chains, but #13 Paint was posted 16 h earlier, and #15 Fountain went out 5 h after Blood. |
| "Can You Solve" titles beat "How To Solve" (01 F8) | **WEAKENED** | yt-dlp: Ten Penny (4.4M) was uploaded 2026-11-23, so 4 days old, while the Can-You titles were 6–7 weeks old. The comparison is an age artefact. |
| GabeSweats 16.5M with 178K comments, 1.08% (06) | CONFIRMED | yt-dlp: 16,510,458 views and 178,000 comments, but it is a **2022** upload. |
| Missing Dollar comment rate 0.055% (06) | CONFIRMED | 17,000 comments / 30.8M views. |
| Buffer: 60 s+ gets +43.2% reach and +63.8% watch time vs 30–60 s; median watch time 6.9 s / 11.3 s (02) | CONFIRMED, B-weak | Primary page, 2025-03-17, about 1.1M TikToks, medians only, no controls. **Also on that page: median reach for a 30–60 s TikTok is 302.** Our flop band (303–861) is the platform median, not a penalty. |
| YouTube "Stayed to watch" definition (01 F1) | CONFIRMED | answer/12220281: "stayed to watch past the initial seconds". The page gives no number. |
| Sherman seed audience (01 F2) | CONFIRMED | Matches the TechCrunch, SEJ and outlierkit accounts of the 2023 Creator Insider video. |
| Demand rho +0.16 "disproves title-by-typed-phrase" (07 F3) | **WEAKENED as an argument** | demand.py measures *YouTube* autocomplete and Shorts medians, but the views are TikTok's, which are mostly For You. TikTok says search ranks on query match (05 F1). The rho tests the wrong platform. It shows demand doesn't drive FYF, which the playbook never claimed. |
| Instagram 3 s skip rate (01), ICIS AI-voice −5–7% (03), ManyPixels safe zone (04), Pup History share rates (06) | UNVERIFIABLE (not re-opened) | Outside my budget. No rule I propose depends on them. |
| My own 05 R4 "judge at 72 h" | **self-correct** | The plateau arrives within hours. Judge at **24 h**, and confirm at 72 h. |

## 2. Rulings C1–C10

**C1, the test window.** Novelty every ≤3 s applies everywhere except one declared participation window.
- The window is ≤15 s, with a countdown visible the whole time.
- Inside it, use either an **action test** (a scripted, visible salient event every ≤1.5 s) or a **still test** (≤6 s).
- Never a still of ≥10 s.
- Confidence: med. Chain 3/3 hits; Blood's 6 s still was a hit; the 10 s stills (Liar, GTA) went 0/2.

**C2, the frame-0 card.** Format-scoped.
- **Challenge formats:** frame 0 = the full playable scene plus the challenge card plus the timer.
- **Passive formats:** no printed question.
- The card on its own is neutral (07: 7/11 flops had one too). The active ingredient is the playable field.
- Confidence: med-low.

**C3, title, description, first line.** Each slot has one job.
- **First spoken line:** event + victim + outcome, and it names the topic noun ("blood on a wall", "this fingerprint").
- **YouTube title:** "[event/stakes]: Can You …?" first. Put the typed phrase after it, within 60 characters.
- **TikTok description:** the first sentence is the typed search phrase in natural words. Then the challenge, then 3–5 topical hashtags, no #fyp.
- The topic noun also appears once as on-screen text. That is TikTok's own guidance (A).
- demand.py picks the *topic*, not FYF success.
- Confidence: low-med. Settle the title lead with a YouTube A/B.

**C4, the ending.**
- Always answer the core question on screen. Then end on a **one-line kicker** within ≤4 s of the final reveal.
- Exception: a genuine paradox *that was the original question* may stay open.
- Never introduce a NEW question at the end. No spoken or on-screen "comment / subscribe" ask.
- Questions in the post caption are allowed.
- A single stat kicker (Blood's "1 in 9", which is the save trigger) counts as the kicker. A multi-stat tail does not.
- Confidence: med. S 0/21 + 2/2; OWN CTA endings 0/2; Pickpocket.

**C5, clue size.** **The decisive clue is ≥80 px on its short axis** in the shot where it can be found, on 1080×1920.
- 04's 40 px leaned on #15 Fountain's banana peel (a hit at 11.8K, not 18K), but its first solvable link is a large motion event.
- Every hit's decisive clue is ≥60–90 px or a whole-frame pattern. Every invisible-key flop's is ≤45 px.
- 40 px is the floor for decoys and labels only.
- Confidence: med.

**C6, the definition of "hard".** A puzzle is hard when **most cold viewers commit to a visible wrong answer** (a decoy that is louder, earlier or more obvious), and **every viewer can verify the true answer on the replay** from clues that were on screen at ≥80 px before the reveal.
- Pre-test: 1–3 of 5 cold testers solve it. All 5 say "oh" at the reveal.
- Hard never means small, hidden, off-screen, or requiring reading.
- Confidence: med. 02, 06 and 07 agree once their thresholds are aligned.

**C7, voice speed.** **≤200 wpm** for teach/test and **≤220** for stories. Floor 155.
- Measure *line-level*: words ÷ Σ(lineEnd − lineStart) × 60 from `*.timing.json`.
- Do not measure it over a whisper span that includes the silent window; that is why 03's 153 and 02's 230 disagree for #23.
- Confidence: low-med. Learning research plus the hits' 170–220.

**C8, brightness.** A **default, not a rule**.
- Mean luma ≥0.45 and retire the navy card UI, because the dark episodes share a format confound.
- A video may break it if it has a face or a close-up subject (Cuemath, GabeSweats).
- Confidence: low.

**C9, the cause of the slump, ranked:**
1. **Unsolvable or invisible key, or a reading test.** #20 needs 600–900 wpm of reading. #23 has a 10 px vial and an unseen pour into the ice. OWN: interactive flops 0/5, all failing this.
2. **No participation at all.** #22 is a passive story; passive videos are 0/6 on this channel.
3. **#23 changed 5 things at once:** no frame-0 card, a relay instead of a physical chain, a known "poison in the ice" riddle (06, and Zack's weakest), 256 wpm, and a 3D render.
4. **Safe-zone violations.** #23's poisoning happens under TikTok's caption block.
5. **Gemini speed** (230–256 wpm): plausible for comprehension, but untested.
6. **The 3D look:** no evidence either way.
7. **Hot music:** ruled out; it is identical in the hits.

"Too young" is ruled out (see the table).

**C10, the next three tests.** Pull faceless-account retention and traffic sources first; that is not an A/B but it outranks all of them. Then:
1. **#15's chain structure re-rendered in 3D with Andrew.** If it holds at ≥5K, the look is cleared and #23's failure was its design.
2. **The same 3D chain with Gemini** at ≤200 wpm vs at its natural speed. This isolates the voice.
3. **Fingerprint remake:** frame 0 is a playable scene, the key is a ≥80 px visual, everything else is identical. This tests solvability vs the teach-test format.

Judge each at 24 h and confirm at 72 h.

## 3. Other conflicts

- **02 R12 vs 06 R6.** 02 says "leave a second optional question open"; 06 says "never open a new question at the end". Rule for 06: Pickpocket is the only OWN case of a new question and it flopped.
- **06 R5 vs 02 R5.** 06 says "≤3 s after the answer, no stats tail"; 02 allows ≤11 s. Blood's tail of 22 s with two sub-reveals and a stat drove 1,468 saves. Reconciled rule: after the answer, only new *reveals* (each ≤4 s) plus one kicker. No multi-stat tail.
- **06 R7 "Next case tomorrow".** It is age-confounded (the hits were 23–26 d old, the misses 4–8 d). Allowed as a labelled experiment; it does not fall under C4's CTA ban because it asks nothing of the viewer.
- **Voice caps conflict:** 03 says 200, 06 says 190, 07 says 220. Settled in C7.
- **06 R11 Pup History story template vs 07 R1 "every video has a timed task".** Passive is 0/6 for us, so stories are an experiment slot (≤1 in 4 posts), not a default.
- **Speed of judgement.** The playbook says to post-mortem at 72 h. The seed pool now resolves within hours, so add a 24 h checkpoint and never delete and repost (Sherman: spam risk).
- **My own F10 still stands:** the Chain Reaction hits had share+save rates no higher than the flops. So R2/R4-type watchability rules, not share bait, are what graduate a video from its seed pool here. Blood's save route is a second, rarer path.
