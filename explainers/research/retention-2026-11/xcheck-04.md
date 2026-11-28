# xcheck-04 · Visuals reviewer cross-check (2026-11-28)

**Re-measured this round:**
- line-level wpm from `episodes/*.timing.json`, computed two ways;
- frame-0 luma at exactly t = 0;
- Zack D. Z4/Z5 view counts (yt-dlp);
- SnapUGC §3.3, re-read.

**Reused from 04:** luma for all 15 episodes and caption and clue sizes from full-resolution frames. **Units:** every px figure here is on the 1080×1920 frame. 06 sometimes uses phone CSS px (a 390-wide viewport), which shrinks numbers about 2.8×.

**ERRATA applied.** The hits are now #14 Blood 66.7K, **#13 Paint 18.2K** (38 s), **#15 Fountain 11.8K** and #19 Sandcastle 9.5K. #16 was never posted and has been dropped. I measured #13 fresh for this round:
- **Brightness:** mean luma 0.74, frame-0 luma 0.75.
- **Captions:** height ~93–100 px, at y 508–608.
- **Timer and crowd:** a 12 s timer over a denser crowd, with figures ~45–50 px tall.
- **The puzzle's starting cause:** a dropped ice cream of only ~25–30 px.
- **The first link that moves:** a dog/kid at ~45–50 px.

Recomputed with the corrected labels:
- **Brightness vs views:** ρ = **+0.73** (n = 14, p ≈ 0.004). Excluding the three Chain Reaction hits: +0.57 (n = 11, p ≈ 0.07).
- **Hit caption heights:** 87–108 px. All hits' luma: 0.50–0.75.

## 1. Verdicts on others' claims

| Claim | Verdict | Evidence |
|---|---|---|
| 07: per-episode luminance table | **CONFIRMED** | My independent 2 s sampling agrees within ±0.03 for every episode (#15 0.73, #17 0.24, #20 0.27, #23 0.47). |
| 07 F5: brightness ρ +0.62, falling to +0.43 without Chain Reaction | **CONFIRMED (direction)** | I get +0.72 (p≈0.005), and +0.57 (p≈0.07) without CR. The two of us sampled differently, but both read it as confounded with format. |
| 01 F5: all frame-0 lumas < 0.25 flopped; hits at 0.53–0.78 | **CONFIRMED / slightly WEAKENED** | At t = 0.000: #18 0.16, #17 0.20, #15 0.75. #14 is **0.47**, not ≥0.53. |
| **07 R2: decisive clue ≥ 80 px** | **WRONG as a threshold** | 07's own table puts #15 and #19 at "~60 px figures". The #15 start object (banana peel) is ~35 px in the wide shot; I back-computed this from the ~2.3× replay zoom. The biggest chain hit, **#13 Paint (18.2K)**, starts from a ~25–30 px ice cream, and its moving figures are ~45–50 px. At ≥80 px, **all three** chain hits fail. |
| **06 R4: decisive event ≥ 5% of frame area** | **WRONG** | 5% is about 322×322 px. No Chain Reaction cause meets it (skater, bike, peel are 35–100 px), yet all three hit. Only the outcomes (fountain, cake) are that big. |
| 06: Liar text "~8 px", fingerprint cards "~90 px" | **CONFIRMED, in phone px** | On the 1080 frame: Liar text cap height ~18 px (07); #20 sheets 17–25 px (mine); cards ~240 px (07, mine). Rules must name the frame. |
| 07, 02 and 06 on the size of what flops make you inspect | **CONFIRMED** | Flops: vial 10 px, ridges 6–8 px, text 17–25 px. Hits: spatter wall ~900 px; moving bodies ≥60 px. |
| **wpm: 07 says hits 191–220, #23 256; 02/03/06 say hits 169–175, #23 230** | **BOTH CONFIRMED, different basis** | From timing.json, words ÷ Σ line duration: hits 169–173, Blood 170, Liar 152, #23 **230**. Words ÷ Σ (first→last word) gives 211–220, 191, 179 and **256**. 07 used the word span; the others used line duration. |
| 01 F3: SnapUGC ECR–NAWP r = 0.926, bimodal | **CONFIRMED** | §3.3 says both, verbatim. |
| 06 F1: Z4 16.6M vs Z5 "Poisoned Ice" 4.1M | **CONFIRMED** | yt-dlp today: 16,619,335 vs 4,143,919. |
| 02 F13: Blood's test window is a ~6 s still | **CONFIRMED** | My 2 s frames at 28–34 s show the identical wall plus countdown. |
| 02 F10 (Adesope & Nesbit: verbatim captions don't hurt; keyword labels help) | **CONFIRMED** | This matches 04 F6. |
| 05 F2: TikTok Search reads voiceover and on-screen text | **UNVERIFIABLE by me** | WebFetch returns only the page shell. Keep it as A only on #05's browser read. |
| 06 F10: flat 2D gets routed into a kids pool | **UNVERIFIABLE** | Note that all 4 of our hits ARE flat 2D (9.5K–65.7K), so 2D is not disqualifying. |
| 06 F13 / 03 A1: "#23 at 230 is above every measured hit" | **CONFIRMED** | On the line basis. |

## 2. Rulings C1–C10

**C1. Test window.**
- Up to 15 s may be one locked shot with no VO.
- Novelty is counted as **on-screen scripted events, not cuts or captions**.
- Action window: a visible event (a body moving ≥ its own height, a spill, a crash) at least every **≤ 3 s**, with a target average of ≤ 1.5 s. The chain hits average ~1.2 s.
- Still window (pattern or lineup): **≤ 7 s**.
- Never a ≥ 10 s still. The countdown stays on screen inside the safe box.
- Evidence:
  - Mital 2011: motion is what gaze locks onto.
  - Blood: a 6 s still was a hit.
  - Liar and GTA: 10 s stills flopped.
  - Pickpocket: 15 s with no salient event flopped.
- Confidence: low-med.

**C2. Frame-0 card.**
- **Challenge formats only:** frame 0 = the full playable scene + a task card + the timer, with the card's top edge at y ≥ 240. #23's pill sat at y 135–275, under TikTok's tabs.
- The card is necessary-looking, not sufficient: 7 of 11 flops had one.
- niche-data #6 stays scoped to passive formats (comparison, what-if, story).
- Confidence: med.

**C3. Title, description, first line.**
- First spoken line = **event + victim + outcome + task** ("In 15 s, this X gets Y. Find what starts it.").
- Title = event or stakes + "Can you…?" (our hits 4/4; Zack D. 3 vs 1).
- The typed phrase goes in the first words of the description and once as plain on-screen text (card text ≥ 40 px cap, never hidden). Speak it only if it fits the event line.
- Demand is a tiebreaker, not a gate (07: ρ +0.16).
- Confidence: low-med. Needs the YouTube title A/B.

**C4. Ending.**
- Resolve the core question **visibly**: zoom in until the clue is ≥ 25% of frame width, then a kicker statement.
- The video ends ≤ 3 s after the kicker. Never open a NEW question.
- Leaving the ORIGINAL question open is allowed only for a genuine verbal paradox (Missing Dollar, GabeSweats). Our find-it formats are visual, so the replay IS the payoff, and they always resolve.
- Confidence: med.

**C5. Minimum clue size: ≥ 40 px on the short axis at 1080×1920, measured on the decisive element.**
- If the decisive element is an event, measure the moving body.
- It must also sit inside the safe box (x 120–960, y 240–1260) during the find window.
- After the errata, any threshold between 26 and 44 px separates the two groups:
  - Every interactive hit has its decisive element at ≥ ~45 px: the moving bodies in #13 Paint, or the 900 px wall.
  - Every interactive flop has its decisive element at ≤ 25 px: the vial, ridges, text, or the pickpocket's hand.
- 40 px sits in that window and matches the reference puzzles (40–70 px). The margin is narrower than before the errata.
- A static cause object may be smaller (Paint's ice cream is ~25–30 px) only if the first link it triggers is a ≥ 40 px body in motion.
- 80 px and 5% of frame area are both falsified by our own hits.
- Confidence: med-low, since the separation rests on ~2 groups of 3–5 videos.

**C6. "Hard" means:**
- **≥ 50% of cold viewers commit to a reasonable wrong answer** (a scripted near-miss decoy that is louder or more mobile than the key).
- Every decisive clue is on screen before the reveal and passes C5 and the safe box.
- Difficulty comes from position, timing, attention and misdirection, **never** from size, hiding, reading or outside knowledge.
- Pre-test: 20–60% of 5 cold testers solve it, and 5/5 can verify it on the replay.
- Confidence: med.

**C7. Voice speed.**
- Measure line-level: total words ÷ Σ `lines[].duration` in `timing.json`.
- Cap **≤ 200 wpm** for test and teach formats. The posted hits run 169–173 (Fountain 173, Sandcastle 169, Blood 170) and #23 runs 230. I did not measure #13 Paint's line-level rate; I expect it to sit near the other chains.
- Story: also ≤ 200 until a story A/B shows otherwise. 03's 230 for stories rests only on niche-data S.
- Floor 150.
- Never compare against 07's word-span figures without converting (about +25–45 wpm).
- Confidence: med.

**C8. Brightness is a DEFAULT, not a gate.**
- Defaults: render mean luma ≥ 0.40 and frame-0 ≥ 0.45, and retire the dark-navy test screens.
- A pre-post check flags a miss; it does not block a post.
- Why not a gate:
  - The 3D flops are at 0.47.
  - References hit at 0.28 (GabeSweats 16.5M) and 0.13 at frame 0 (01's Cuemath).
  - SnapUGC: aesthetic polish adds only +0.007 SRCC.
- Confidence: low-med.

**C9. Ranked causes of the slump.**
1. **The answer can't be checked by eye.** #20 is a reading-plus-arithmetic test at 17–25 px. #23 has a 10 px silent vial and an unseen ice pour, which is also Zack D.'s weakest key.
2. **Passive format.** #22 has no task, and passive videos are 0/6.
3. **Too young.** #22 and #23 were ≤ 1 day old. The 303–1,370 floor is the normal exploratory allotment (05).
4. **Safe-zone violations.** #23's poisoning happens at y 1230–1450 under TikTok's caption, and #20's sheets run to y 1330. This makes cause 1 worse.
5. **No frame-0 card / pointer only at 2.5 s** (#22, #23).
6. **Gemini at 230 wpm** (#23's 6-step relay).
7. **Dark look** (#20 only).
8. **The 3D look itself:** no evidence either way, and it is not isolable.
9. **Hot music:** identical in the hits (03).

**C10. The three A/B tests.**
1. **3D vs 2D** on a #15-structure chain that passes every rule above, with Andrew voice in both.
2. **Voice** on that same 3D chain: Gemini held to ≤ 200 wpm vs Andrew.
3. **Look-not-read:** remake #17/#18 as one ≥ 40 px visual clue on a light background vs the originals.
- For all three, compare completion % and the 2 s / 5 s stayed figures at 72 h, not views.

## 3. Other conflicts

- **01 H1 (a playable field ≥ 60% of the frame) vs 04 V1 (only ~38% of the frame is TikTok-safe).** Reconcile: the field may fill the frame, but the decisive clue, the outcome target and the timer must sit in x 120–960, y 240–1260.
- **03 A5 ("every clue readable on screen or in captions") vs 07 R3 / 06 R3 ("no reading") and 04 V9 (no captions during the find window).** Reconcile: clues must be visible *pictures*, never caption text.
- **niche-data's "lower-third captions (72–78%)"** lands under TikTok's caption block. Use y 480–700 instead (our posted hits: 26–32% of height, 87–108 px; #13 Paint at y 508–608).
- **The errata changes my 04 file too.** In 04-visuals.md, "#15 18K" should read 11.8K. #16's 109 px caption and 0.69 luma came from an unposted video, so they are not data. The corrected table is in the ERRATA note above. No rule in 04 changes direction.
- **06 R5 (≤ 3 s after the final answer) vs our Chain Reaction hits' 8–11 s replay ladders (02 R5/R6).** Scope 06 R5 to verbal mysteries only. The visual replay ladder is the payoff.
- **01 H4 (arrow on the target by ≤ 2 s) vs hard mode.** Point at the victim or outcome only, never at the cause.
- **Rules should name a measurement method.** wpm (line vs span) and px (1080 vs phone CSS) caused most of the apparent disagreement between tracks this round.
- **Tooling note:** `metrics.py` cut counts miss dissolves (GabeSweats reads as 1–2 shots). Read the contact sheet before citing a cut count.
