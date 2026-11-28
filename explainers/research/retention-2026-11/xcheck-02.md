# xcheck-02: structure reviewer (2026-11-28, revised after ERRATA.md)

**ERRATA applied.** The posted chain hits are **#13 Paint, 18.2K (38 s)**, **#15 Fountain, 11.8K** and **#19 Sandcastle, 9.5K**. #16 Cake was never posted.

My 02-structure.md beat map mislabels these. Its "Fountain 18K" row is really Fountain at 11.8K, and its "Cake 11.7K" row is unposted. Paint's beat map, re-run with the `Chain.tsx` link times:

| | Paint (18.2K) |
|---|---|
| length | 37.9 s |
| words | 68 |
| speed | 194 wpm on line-file duration, **246 wpm on word-span** |
| test opens | 4.0 s |
| search window | 12 s |
| gaps between events in the window | max 2.5 s (mean 1.08 s across the whole video) |
| central answer | "Dropped by this kid" at 30.5 s = **81%** |
| tail after the answer | 7.4 s |
| links | 7 |

The chain conclusions hold. Corrected chain ranges:
- test opens at 4.0–4.7 s
- mean gap between events 1.08–1.21 s, max 2.3–3.65 s
- answer at 79–84% of runtime
- tail after the answer 7.4–11 s

Within the chain format, views fall as length rises: 38 s → 18.2K, 48 s → 11.8K, 55 s → 9.5K. That is n=3, and it is confounded with posting order and difficulty.

## 1. Verdicts on others' claims (only claims that rules depend on)

- **The wpm figures disagree only because each researcher measured differently. CONFIRMED.** I re-ran three bases on `timing.json`:
  - **Word-span** (07's basis):
    - Andrew hits: Paint 246, Fountain 218, Sandcastle 211, Blood 191
    - Gemini: Poison 256, tod-3d 278, Turkey 214
  - **Line-file duration** (02, 03 and 06):
    - Paint 194, Fountain 173, Sandcastle 169, Blood 170
    - Poison 230, tod-3d 250, Turkey 193
    - edge-tts line padding inflates this denominator by about 26% for Andrew, and by about 11% for Gemini "flow"
  - **Whisper span over the whole video** (03's figures for our puzzles): unusable here, because the span includes the silent 12–15 s window.
  - **The errata changes the verdict.** On the engine-neutral word-span basis, Poison (256) is level with our biggest chain hit, Paint (246). Only tod-3d (278) is clearly beyond every hit.
  - 06 R12 (≤190, line-file) is **WEAKENED**, because Paint is 194 on that basis. 07 R9 (≤220 word-span) is **WRONG**, because Paint is 246.
- **07 R2 and 06 R2, "decisive clue ≥80 px" (graded *high*): WRONG as written.**
  - Fountain (11.8K, a hit) starts with a banana peel of about 40×15 px. That size comes from the `Peel` art, about 30 units wide, scaled by `kAt(1046)` ≈ 1.35, flattened by 0.55, at camera z 1.0.
  - The peel is findable only because it is thrown: a throw arc of about 115 px.
- **04 V7, "≥40 px static OR a motion event ≥80 px": CONFIRMED.**
  - It passes every posted hit.
  - It fails every unsolvable flop: the #23 vial (~10 px), the #18 and #20 text (18–20 px), the #17 ridges (6–8 px), and the #12 hand move.
- **06 F1, the Zack D controlled pair: CONFIRMED.** I re-pulled with yt-dlp: Couch 16,619,335 vs Poisoned Ice 4,143,919, a 4.0× gap.
- **04 F1, the safe-zone pixel numbers: CONFIRMED, but they are for ads.**
  - The numbers are 240 / 660 / 120, with a right column 180 px wide from y 840.
  - ManyPixels measured TikTok's In-Feed *ad* template and says the numbers don't cover organic posts.
  - Keep V1 as a conservative box, not as the official organic zone.
- **03 F2, the UCLA speed-watching study: CONFIRMED, with one minor error.**
  - One-week scores were 24 / 21 / **21** / 20, n = 231.
  - Immediate scores stay flat up to 2×. The delayed loss starts at 1.5×.
- **07 F8, hits run ~15 s with no narration and no cut: CONFIRMED for Fountain and Sandcastle.** Paint's window is 12 s.
- **07 F1 / 06 F4, "look, don't read" separates the teach-test hit from its flops: CONFIRMED.**
  - The three share one template: the test opens at 45–51%, the answer comes at 62–68%.
  - Only the object being inspected differs.
- **07 F4's difficulty trend: WEAKENED by the errata.** The trend now runs Paint → Fountain → Sandcastle, and it is still confounded with order. The "HARD mode" data point (Cake) never existed.
- **05 table, "Fountain 38 s": RIGHT after all.** The 38 s post was Paint.
- **05, Blood's 323 shares and 1,468 saves: UNVERIFIABLE** by me. It is plausible, and 05 R3 rests on it at n=1.
- **01 F5, the frame-0 "playable field": CONFIRMED, but confounded with format.**
- **My own R2, "an event every ≤1.5 s": WEAKENED.** It holds for the mean, but the max gaps run 2.3–3.65 s. The fix is in C1.

## 2. Rulings C1–C10

**C1. The test window.** The novelty-cadence rule is suspended inside a timed participation window and replaced by this:
- **Action window:** ≤15 s; our best hit used 12 s. Scripted salient events (links, sounds, impacts) arrive at a mean gap ≤1.5 s and a max gap ≤4 s. The countdown is visible and audible.
- **Still window:** ≤6 s. A ≥10 s still has gone 0/2 (#18, #20).
- **Crowd drift is not an event.** In #12 every frame moves, yet no salient event happens for 15.8 s.
- Confidence: med. Evidence: OWN beat map; Gruber's 14 s curiosity delay [B]; Simonov's finding that suspense cuts leaving [B].

**C2. The frame-0 card.**
- Use it for challenge formats only: the full playable scene, a card of ≤5 words, and the timer.
- It is hygiene, not the cause: hits and 7/11 flops both had one.
- niche-data's "no question on frame 0" stays the default for passive formats.
- Confidence: med.

**C3. Packaging.**
- **Title, and the first sentence of the TikTok caption:** the event plus the challenge.
- **Description, second sentence:** the typed search phrase, plus 3–5 hashtags.
- **Spoken line 1:** the event line, with the search noun said naturally ("blood spatter", "chain reaction").
- Evidence: TikTok reads voiceovers and on-screen text [A, 05]; demand did not predict our views (rho +0.16, OWN).
- Confidence: low-med. A/B it.

**C4. The ending.**
- Resolve the core question visibly.
- End on a one-sentence kicker that is a statement.
- End ≤3 s after the final answer, or ≤8 s if that time carries **one** reusable fact (Blood's "1 in 9").
- Never a NEW question, never a CTA.
- Exception: a genuine paradox may leave its *original* question open, labelled as an experiment.
- Confidence: med.

**C5. Minimum clue size.** The decisive clue is **≥40 px on its short side, or a motion event that travels ≥80 px, with ≥3:1 luma contrast against its surround** (04 V7).
- Drop "≥80 px static" and "≥5% of frame", because both would have failed Fountain.
- Confidence: med.

**C6. "Hard", one definition.**
- At least half of 5 cold testers commit to a scripted wrong answer.
- Every needed clue is on screen before the reveal, at C5 size.
- 20–50% of testers solve it.
- Difficulty may come from position, timing or misdirection. It may never come from size, off-screen events or outside knowledge.
- Confidence: med. Evidence: Kang [B], Clark [B], Zack D Couch vs Ice [S], OWN Sandcastle (Cake is now excluded).

**C7. Voice speed. REVISED by the errata.**
- **Cap: ≤250 wpm on the word-span basis.** Compute words ÷ Σ(last word end − first word start) per line from `timing.json`. This basis is engine-neutral.
- Teach lines that state a rule: ≤210.
- **Where the cap comes from:** our biggest chain hit, Paint, runs 246, so the old 220 cap is wrong.
- For edge-tts, the cap is roughly ≤200 on line-file duration, which matches 03 A1.
- **Who passes:** Poison (256) is marginal. tod-3d (278) fails. Turkey (214) passes.
- Speed is therefore **not** a strong explanation for #23.
- Drop my "≤100 words per 50 s"; it is an output, not a lever.
- Confidence: med-low.

**C8. Brightness.**
- Treat it as a default, not a rule: retire the dark navy template and start new templates at luma ≥0.45.
- It is not a gate: GabeSweats hit at 0.28, and #22/#23 flopped at 0.47.
- Confidence: low.

**C9. The slump, ranked:**
1. **No answer you can check by eye** (reading or arithmetic, or a hidden key). Explains #20, #23, and earlier #17/#18. The strongest signal across 02, 04, 06 and 07.
2. **Passive format.** Explains #22 (passive formats are 0/6).
3. **Too young.** It can't be excluded, but the floor of 303–1,370 views argues against a 10× recovery.
4. **Safe-zone violations** (#23 key action under the caption; #20's sheets).
5. **No frame-0 card** (#23).
6. **Gemini speed.** Demoted, because Poison ≈ Paint on word-span.
7. **3D look.** Never isolated.
8. **Hot music.** Constant across hits.

The slump started at #20, which is 2D with the Andrew voice.

**C10. The three tests that settle the most:**
1. **Paint, our best chain (38 s, 7 links), remade in 3D with the Andrew voice.** Isolates the look.
2. **The same 3D Paint with Gemini.** Isolates the voice.
3. **Fingerprint or Liar remade as solve-by-looking.** The test opens ≤5 s, the clue is C5-size, a decoy is scripted, and the ending follows C4. This tests whether the teach-test format is dead or only unsolvable.

Pull the retention curves for #13, #14, #17 and #18 first.

## 3. Other conflicts

- **06 R5 vs 05 R3.** 06 R5 allows ≤3 s after the answer and no stats tail. 05 R3 says to end teach-tests on a reusable fact. C4 settles it: one fact, ≤8 s. Liar's 15 s stats tail stays banned.
- **05 R1 (commit-then-reveal at 25–60% of runtime) vs our hits.** Our hits finish revealing at 79–84%. Use 25–60% for when the test starts, not for the answer.
- **07 R1 (every video is a timed task) vs 06 R11 (stories).** Keep 07 R1 as the main lane. A story lane may run only as a labelled experiment, since passive formats are 0/6.
- **03 A5 (no audio-only clue) vs audio decoys.** They are compatible: sound may misdirect but never decide. The only audio-decoy episode (Cake) was never posted, so the decoy has no data behind it.
- **C6 vs V1.** A "far corner" start must still sit inside the V1 safe box. Check both rules on every puzzle.
- **Length.** Within the chains, shorter has done better (38 → 48 → 55 s). That is n=3 and confounded, so it is not a rule yet. It is worth a 38 s vs 50 s pair.
