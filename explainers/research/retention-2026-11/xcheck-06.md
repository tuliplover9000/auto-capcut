# xcheck-06: niche teardown, cross-check of 01–05, 07

Reviewer #6, 2026-11-28. I re-checked claims against my own downloads: 17 competitor Shorts, the Zack D. Films 900-Short listing, our mp4s and `timing.json`. Scratch files are in `...\scratchpad\nt\`.

## 1. Verdicts on others' claims

| claim | verdict | evidence |
|---|---|---|
| **05 table: "15 CR Fountain, 38 s"** (vs 02/04/07, who measure #15 at 48.4–48.5 s) | **UNVERIFIABLE, and it matters** | Our #15 mp4 is **48.50 s**. The unposted **#13 Paint** mp4 is exactly **38.00 s**: a plaza, 12 s timer, "this guy gets covered in blue paint". The README says #13 "outperformed everything", and 07 says #13 isn't among the 15 posts. **The 18K "Fountain" post may actually be the #13 render.** If so, the beat maps in 02 (48.4 s, answer at 84 %) and 07, plus 04's caption sizes, describe a different file from the one that earned 18K. My browser check of the TikTok post was refused. **The owner must open the 18K post and read its length and plot.** |
| 07 table wpm (hits 191–220, #23 256) vs 02/03 (169–178, #23 230) | **Both CONFIRMED; they use different bases** | I recomputed from `timing.json`. Words / Σ line-file duration gives 169–178 for the hits and 230 for #23. Words / Σ(first→last word per line) gives 211–220 for the hits and 256 for #23. The ~25 % gap is the silence padding inside each line file. Any wpm rule must name its basis (see C7). |
| 01 F8: "Can You Solve" titles (16/26/30M) beat "How To Solve" (4.4M) | **WEAKENED** | Ten Penny was **4 days old** when measured. In Zack's 900-Short list, puzzles with no "Can You" also hit: Mail Chute 18M, Woman on Couch 16M, Hermit's Well 13M, Car Ownership 12M. The low ones are all *method* videos: "How Two Cuts Solve…" 3.1M, "How The Triangle Peg Puzzle Works" 4.4M, Poisoned Ice 4.1M. The title wording tracks the *content* (paradox vs method), so it does not show that the wording causes anything. |
| 01 F7: Zack D. changes camera every ~1 s | **CONFIRMED, with a caveat** | My 1.5 s grids show a new composition in almost every sample. Yet `metrics.py` counts 0–2 cuts, because the changes are camera moves, not cuts. This matches 04's tooling warning. |
| 03: "big animated puzzle Shorts barely exist in YouTube search" | **WEAKENED** | They exist but sit outside "riddle" searches: Zack D's 3D puzzles at 16–31M, and Junior Detectives (animated, 2D) at 6.16M. The plain Shorts search is flooded by kids' channels and long-form compilations. |
| 04 F18: visual find-it Shorts sit at 50–150K, and 10M+ mysteries are verbal or narrative | **CONFIRMED** | Ludynx's ceiling is 87K. The adult 10M+ mysteries are verbal riddles told over footage (GabeSweats 16.5M, Zack D). The one big *visual* clue hit, Junior Detectives, is a kids' channel. |
| 04 F3: #23 timer pill sits in the tab band, poisoning action in the caption zone | **CONFIRMED** | In my #23 grid, the timer pill is at y ≈ 190 px and the arrowed ground floor at y ≈ 1,350 px. |
| 07 F1 / 01 F5: hits = a visible, checkable answer (4/4 vs 0/5) | **CONFIRMED, and replicated outside our channel** | Junior Detectives hits name a visible clue (bite gap, footprints; 6.16M, 1.41M). Its misses hide the clue (UV, 67K) or require reading (mirror text, 44K). Zack's hidden-key Poisoned Ice got 0.42× his median. Caveat: the Junior Detectives misses are 4–8 days old vs 23–26 days for the hits. |
| 05 R2 / niche-data: never end on a question to the viewer | **WEAKENED for puzzles** | The two largest puzzle Shorts I measured end on the *unresolved core question*: Missing Dollar 30.8M, GabeSweats 16.5M (178K comments). |
| 02 R12: "don't end on an unanswered core question" | **WEAKENED** | Same evidence as above. Missing Dollar works because it is a real paradox: the viewer already has every number, and the gap is conceptual. |
| 05 F10: Blood Spatter has 323 shares and 1,468 saves | **UNVERIFIABLE by me** (browser refused) | Plausible. Its share of views (0.5 %) is still below Pup History's 0.7–1.6 %. |
| 02 F13: a still frame in the test is not fatal | **CONFIRMED** | Ludynx's 87K hit is a still grid with 3 s rounds. Its 76-view sibling has the identical template. |
| 07 F4: views fell as difficulty rose | **CONFIRMED as a trend, cause unresolved** | Zack D shows the same pattern: Poisoned Ice (hidden key) 4.1M vs Woman on Couch (visible key plus a false solve) 16.6M. The failure is a *hidden* key, not difficulty itself. |

## 2. Rulings C1–C10

**C1, the test window.**
- An **action window** (a timed search over a scene where things visibly happen) may run up to **15 s with no VO**, but must contain a scripted salient event at least every **1.5 s**. That is 02's R2 combined with 03's A10.
- A **still window** must be **≤ 6 s**.
- Outside the test window, niche-data's novelty rule of something new every 1.5–3 s applies unchanged.
- Confidence: med.

**C2, the frame-0 question card.**
- The card is a *format marker*, neutral for passive formats.
- For challenge formats, **the playable scene must be visible at frame 0**. A question card is allowed on top of it (all 4 of our hits had one, and so did Ludynx's and Junior Detectives' hits), but the card alone predicts nothing: 7 of our 11 flops had one too.
- Confidence: med.

**C3, the title.**
- **Title:** "[concrete event/stakes] + Can you…?" The typed search phrase goes in the **description's first line and the first spoken sentence**, which TikTok Search reads (05 F2, grade A).
- Neither title rule is proven. Demand rho is +0.16 (07), and 01 F8 is confounded with content (see verdicts).
- Confidence: low; A/B it on YouTube.

**C4, the ending.**
- Resolve the core question and end **≤ 3 s** after the answer, with a kicker.
- **Exception:** a true paradox, where every fact is already on screen and the gap is conceptual, may end on the original question unresolved.
- **Never** open a *new* question at the end (Pickpocket).
- Confidence: med.

**C5, the minimum clue size.**
- The decisive clue must be **≥ 80 px on its short axis** (1080×1920 frame) in the frame where it can be solved. Text the viewer must read is a separate floor: ≥ 40 px cap height.
- Confidence: med.

**C6, what "hard" means.** "Hard" means **most cold testers commit to the scripted wrong answer, a visible decoy, before the reveal**. Concretely, all four must hold:
- ≤ 60 % of 5 cold testers solve it;
- at least half of the misses name the decoy;
- 5/5 can verify the real answer on replay;
- the key is the same size as the decoy (≥ 80 px).

Hard never means hidden, tiny or unknowable. Confidence: med-high.

**C7, voice speed.**
- Teach/test: **≤ 200 wpm**. Story: **≤ 230 wpm**.
- Measure it as words ÷ Σ(first-word start → last-word end) per line in `timing.json`, the word-span basis. On that basis our hits are 211–220, so they sit at or just over 200; the hits are the calibration, not a violation.
- Equivalent limits on the file-duration basis: ≤ 175 (teach/test) and ≤ 200 (story).
- #23's 256 / 230 breaks both bases.
- Confidence: low-med.

**C8, brightness.**
- **A default, not a rule.** Use luma ≥ 0.45 for 2D test screens and retire dark navy.
- It is not a gate: GabeSweats' 16.5M sits at 0.28, and Zack's dark-blue Woman on the Couch got 16.6M. It is confounded with text tests.

**C9, causes of the slump, ranked.**
1. **A key the viewer can't see, or a reading test.** #20 is text plus arithmetic. #23 hides its key (poison in the ice, which is also a famous old riddle that was Zack's weakest).
2. **Passive format.** #22 is a passive story, and passive posts are 0 for 6 on this channel.
3. **Too-young posts.** #22 and #23 were read at about 1 day old.
4. **Safe-zone violations.** #23.
5. **Gemini voice speed.** #23 at 256 wpm.
6. **Tiny captions in 3D.** #22 and #23 use 49 px captions.
7. **No frame-0 card.** It is neutral in the data.
8. **The 3D look.** No evidence: Zack's 3D wins at 16–31M.
9. **Hot music.** It is constant across hits and flops.

**C10, the three A/B tests.** Pulling retention curves (free) comes first, then:
1. **3D vs 2D with the same chain script and the Andrew voice**, then swap only the voice. This isolates look and voice (07's R10).
2. **A whodunit with a visible key and a false solve vs a single reveal of a hidden key**, same scene.
3. **A forensic test with a ≤ 10 s teach section vs a 28 s one**, keeping Blood Spatter's visual test. This tests 02's R1.

## 3. Other conflicts

- **Two rules collide.** 02's R5 says "answer at 75–85 %"; 05's R2 says "end ≤ 0.8 s after the last word". 02's R5 still allows an 11 s tail, which ends 8+ s after the answer unless the tail is all reveals. My reconciliation: put the answer at ≥ 75 %, and let only new visual reveals sit after it.
- **01 H5 and 04 V11 use the same brightness threshold** (≥ 0.45 at frame 0), and both are confounded. Merge them into one *default*.
- **03's A3 (quiet music in the gaps) vs the "MUSIC LOUD+HYPE" memory.** They conflict, and nothing in the niche data resolves it. Zack's beds sit 8–13 dB down. 03's A3 should win as the default.
- **05's "save trigger ≥ 10 per 1K" (R3).** It fits Blood Spatter, but the chain hits scored 1.6–2.3 per 1K and still won. Use it as a diagnostic, never a kill gate.
- **The owner's "make it HARD" memory** must be rewritten to the C6 definition. Otherwise R2/V7 (clue size) and the memory's "subtle key" will keep producing #23s.
- **Before any rule cites "Fountain" numbers, the owner must confirm which render was posted as the 18K video.**
