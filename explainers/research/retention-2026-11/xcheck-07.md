# xcheck-07: own-channel cross-check (researcher #7)

How I checked: I re-ran measurements on our own renders. That meant hook and tail strips, contact sheets, and a safe-zone overlay on frames of #15, #16, #19 and #23. I recomputed wpm on two bases from `timing.json`, recomputed the Fisher test, and re-read the episode scripts. I did not re-pull public TikTok stats.

## 1. Verdicts on others' claims

| claim | verdict | evidence |
|---|---|---|
| 01 F5: the "playable field at frame 0" sorts 4/5 hits from 0/9 flops | **CONFIRMED** | My 0/0.5/1/2/3 s strips: #14, 15, 16 and 19 show the full scene at 0.0 s. #17 and #18 open on empty navy. #22 opens on houses with no kid. |
| 01 F6: #12 Pickpocket has no visible event | **CONFIRMED** | Its 15.6 s VO gap (4.8→20.4 s) contains no event larger than a hand move. |
| 01 H4: #22 and #23 point at the target at 2.5 s | **WEAKENED** | #23 has no arrow at 2.0 s; it appears at 3.0 s. #22 never has a pointer. |
| 01 F8/H6: flops led with SEO titles, hits with "Can you" | **WEAKENED** | #17 "…Can You Find the Thief?" and #18 "…Can You Spot the Liar?" also use "Can you". So "Can you" marks the format; it doesn't separate hits from flops. |
| 02: hits run 170–175 wpm while speaking | **CONFIRMED** | Line-level recompute: 169–173. |
| 02: Fisher p≈0.09 for test vs non-test formats | **CONFIRMED** | One-sided 126/1365 = 0.092. Excluding #23: p = 0.07. |
| 02: posting order is 14 → 15 → 16 | **WRONG (minor)** | The BRIEF's newest-first table gives 15 → 14 → 16. No rule depends on it. |
| 02 R9: never below 155 wpm | **WEAKENED** | Only #18 (152) and #20 (138) are below it. Both are also text-reading tests, so slowness is fully confounded. |
| 03: audio is constant across hits and flops; Poison is 230 wpm, Turkey 193 | **CONFIRMED** | My recompute: Andrew-voice episodes 138–178, #22 193, #23 230, tod-3d 250. |
| 04 F3: #23's timer pill sits in the top band and its poisoning sits under the caption zone | **CONFIRMED** | Overlay: pill at y≈200, arrow target at y≈1480. |
| 04 F3: "the hits stay clear of both bands" | **WEAKENED** | In #16's wide shot, the seesaw link sits at y≈1380, below 1260. Chain links in every hit spill into the bottom zone. What the hits keep mid-frame is the *promised target*: the fountain at y≈900, the cake at y≈1040. |
| 04 F4: 3D captions are ~49 px vs 87–109 px on hits | **CONFIRMED** | Strips: #23 "SOMEONE POISONS" ≈52 px; hits ≈90–108 px. |
| 04 F12: luminance rho +0.72 | **CONFIRMED (direction)** | My samples give +0.62. Excluding the chain format, I get +0.43 (p 0.19) where 04 got +0.57. The size of the effect depends on method. |
| 05 table: #15 runs 38 s | **FLAG / UNVERIFIABLE** | The Fountain render is 48.5 s; **#13 Paint is exactly 38.0 s**. Either the 18K video is #13, which was posted and is the same template, or 05 misread. The owner must confirm. Rules are unaffected, since both are chain reactions. |
| 05 F8: the flop floor is 303–1,370 | **CONFIRMED** | BRIEF table. |
| 05 R5: speak the typed phrase in the first 3 s | **WEAKENED for us** | Demand rho is +0.16. None of the 3 chain hits contains a typed phrase. The A-grade source shows search *reads* the VO, but our search share is unknown. |
| 06 F2: #23 reuses the "poison in the ice" key | **CONFIRMED** | `poison.json` line 4: "It was in the ice." |
| 06 F4: Liar's alibis are ~8 px at phone size | **CONFIRMED** | ~18 px cap height at 1080 width ≈ 6.5 px at a 390 px-wide phone. |
| 06 R4: decisive event ≥5% of frame area | **WEAKENED** | #15's first link (the banana-peel toss) is about 40 px, far below 5% (≈322×322 px). What is big in the hits is the *outcome* and the *motion*, not the first clue. |
| 07 (mine) R2: decisive clue ≥80 px | **WEAKENED by the same fact** | It is now restated as size-OR-motion (C5). My wpm column used the articulation basis (~1.2× line-level); I corrected R9 in 07. |

## 2. Rulings C1–C10

**C1, test window.**
- Outside the test window, keep niche-data's new information every ≤3 s.
- Inside it, one of two shapes is allowed:
  - **Action window:** ≤15 s, visible countdown, a scripted visible event every ≤1.5 s.
  - **Still window:** ≤6 s, ≤3 options.
- Never ≥10 s still; never 15 s with no event.
- Evidence: the 3 chain hits (events every ~1.2 s); #12 (15.8 s, no events) flopped; Blood (6 s still) hit; #18 and #20 (10 s stills) flopped.
- Confidence: med-low.

**C2, frame-0 card.**
- Challenge formats only: frame 0 = the full playable scene + task card + timer, with the camera locked. This is required.
- The card alone is not sufficient: 7/11 flops had one.
- Passive formats keep niche-data's rule (no printed question).
- Confidence: med.

**C3, title, description and first spoken line.**
- **First spoken line:** event + clock + target ("In 15 seconds, this X gets Y. Find what starts it"). It should contain the topic noun.
- **Title:** "[Event/IP]: Can You [task]?", with the topic noun inside 40 characters.
- **Description:** first sentence = the event line + the typed phrase. 3–5 hashtags.
- Demand.py is a tie-breaker, not a gate: rho +0.16, and our high-demand topics flopped.
- Confidence: low-med (A/B the title on YouTube).

**C4, ending.**
- Resolve the core question visibly on screen, then end on a one-line kicker statement within ≤3 s.
- Never open a new question at the end.
- An unresolved *original* paradox is allowed only for a genuine paradox format, which we don't make.
- Comment prompts go in the caption only.
- Confidence: med.

**C5, clue size. One number: 80 px.**
- The clue that decides the answer is either ≥80 px on its short axis in the find-window frame, OR a motion event that travels ≥80 px, with luma contrast ≥3:1.
- The promised outcome target sits inside y 240–1260.
- No must-read text inside the test.
- 40 px is allowed only for a supporting clue that is not the only key.
- Confidence: med.

**C6, the definition of "hard".**
- Hard = most cold viewers commit to a visible wrong answer, through a decoy, a near-miss or an off-centre/early start.
- Every needed clue must be on screen at the C5 size before the reveal.
- Target: 20–60% of 5 cold testers solve it.
- Difficulty may never come from size, reading, arithmetic, hidden mechanisms (ice, off-screen accomplices) or outside knowledge.
- Confidence: med. This is backed by #16 and #19 (hard and visible: 9.5–11.7K) against #12, 17, 18, 20 and 23 (tiny or hidden: ≤1,370), plus 06's Zack D Z4/Z5 pair.

**C7, voice speed.**
- ≤185 wpm, measured as words ÷ Σ `timing.json` line durations × 60. Never mix this with articulation or whisper-span bases.
- Hits run 169–173; #23 runs 230.
- There is no lower bound (the slow-flop evidence is confounded).
- Stories may go to ≤210 pending evidence.
- Confidence: low-med (the comprehension research and peers agree; our own evidence is untested).

**C8, brightness.** A **default, not a rule**: mean luma ≥0.45, and retire the navy card template. It is confounded with format and reading tests; both 3D flops are 0.47–0.48. Confidence: low.

**C9, the recent slump, ranked:**
1. **Tests not solvable by eye** (reading, tiny or hidden keys): explains #20 fully and #23 largely, and covers 5/5 interactive flops.
2. **Passive format:** #22 is a story, and passive formats are 0/6.
3. **Too-young posts:** at read, #22 was ~1 day old, #23 <1 day and #20 ~2 days.
4. **A known riddle with a hidden key** (#23, the poison-in-ice twin of Zack D's weakest video).
5. **#23-specific layout:** no frame-0 card, pointer at 3 s, the target under TikTok's caption zone, 52 px captions.
6. **Gemini speed** (230 wpm on #23): plausible, untested.
7. **The 3D look itself:** the data cannot separate it from the causes above.
8. **Hot music:** ~ruled out, because it is constant across hits.
- The 5-day posting gap after #19 is unrankable.
- Confidence: med for items 1–2, low for the rest.

**C10, what to measure next.**
- **(0) Pull TikTok Creator Center retention for all 15 now.** It is free and expires after ~60 days.
- **A/B 1, legibility vs format:** remake #17 or #18 with one big visual key, no reading and a light background, keeping topic and teach section.
- **A/B 2, the 3D look:** a 3D Chain Reaction that obeys C2, C5, C6 and C7 (physical chain, Andrew voice ≤185 wpm, target mid-frame). Compare it with the 9.5–18K 2D band.
- **A/B 3, the voice:** the same 3D chain re-voiced with Gemini at ≤185 wpm vs Andrew, posted as two variants.

## 3. Other conflicts

- **Payoff position.** 06 R5 wants the answer at ≥88% with ≤3 s after it. 02 R5 wants 75–85% with a tail ≤11 s. Blood hit with the answer at 62% plus 22 s of *new visual reveals*. Reconcile: the answer is at ≥60%, and every beat after it must be a new visual reveal at ≤4 s intervals. Fact or stat tails count against it (#17, #18, #20).
- **Art style.** 06 F10 (flat 2D may be routed to the kids pool) conflicts with 04 V14 (no art-style rule) and with our 2D chain hits. Keep 2D until audience-age analytics exist.
- **Safe zone in practice.** 04 V1 ("the clue/key action inside y≤1260") would fail our own hits, whose chain links spill to y≈1380. Apply V1 to text, timer and the promised target; links may use the full frame if they are motion events.
- **Opening lines.** 05 R5 (typed phrase in the first 3 s) and 01 H2 (event line of ≤10 words) compete for the same 3 s. The event line wins; put the topic noun inside it.
- **Owner's rule.** `feedback_harder_puzzles.md` ("one subtle key, tiny clues") conflicts with C5 and C6 and should be rewritten to the C6 definition. It is the direct link to the #17–#23 run.
- **Brief data.** Blood's shares are now 323 with 1,468 saves (05), and #13's posting status is unknown (05's 38 s length). The coordinator should correct the BRIEF table.
