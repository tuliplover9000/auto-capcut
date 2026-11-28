# xcheck-01: Hooks researcher cross-check

Reviewer #01 · 2026-11-28 · I re-checked only the claims that a rule depends on.

## 1. Verdicts on others' claims

| claim | verdict | evidence |
|---|---|---|
| **07 F11 / 02 / 03 / 06: our speech rates** (07: hits 211–220 wpm, Poison 256; 02/03/06: hits 169–178, Poison 230) | **CONFIRMED, both.** They measure different things. | I recomputed from `timing.json`. Words ÷ Σ line durations gives hits 169–173, Poison 230, tod-3d 250. Words ÷ Σ first-to-last-word spans gives hits 211–220, Poison 256, tod-3d 278. The two are about 1.25× apart. Every wpm rule must name its basis (see C7). |
| **My own F8: Zack's "Can You Solve" titles beat "How To Solve"** | **WEAKENED** (self-correction) | The upload date shows Ten Penny is 4 days old (2026-11-23), against 10–51 days for the "Can You" titles. Age explains the gap as well as the title does. 06 flagged it as provisional for the same reason. |
| **07 F6: "flops used the hits' exact hook template"** | **CONFIRMED.** It **WEAKENS my F6.** | Rechecked against `timing.json`. #12, #17, #18 and #23 all state a task by 3.3–3.9 s, so the sentence template is not the discriminator. My finding survives only in narrower form: the line must name a **visible** outcome (07 R4). |
| **07 F6: "a frame-0 card in 4/4 hits and 7/11 flops"** | **CONFIRMED** | My strips show it: #12, 17, 18, 20 (card), 01 (LED question), 03 and 06 (headline). |
| **07: #23 arrow lands at 3.0 s** | **WEAKENED** to 2.5 s | My 0.25-s strip shows the arrow at 2.50 s. 07 sampled at 2 s and 3 s, so it first saw it at 3.0 s. The conclusion is unchanged. |
| **04 F3: #23's timer sits in the top-240 band and the poisoning happens in the bottom-660 band** | **CONFIRMED** | I overlaid the safe zone on frames at 8 s and 20 s. The "11 WHO DID IT?" pill is above y 240. The ground floor, where the arrow points, is below y 1260. |
| **04 F12 / 07 F5: brightness ρ +0.72 / +0.62** | **CONFIRMED, and confounded** | My frame-0 luma agrees: all 5 dark openings flopped. Without the chain format, ρ falls to +0.43–0.57, which is not significant. |
| **02 F12: Buffer median watch time is 6.9 s for 30–60 s TikToks** | **CONFIRMED** | Read the primary page. n = 1.1M, medians, method not stated. This supports hooks: the median viewer of a 50 s video leaves in about the first seventh of it. |
| **05 F2: TikTok Search reads voiceover and on-screen text** | **UNVERIFIABLE** by me | WebFetch returns only the page shell. It is consistent with TikTok's support page wording, "how well the content matches the term". I accept it as A on 05's browser read. |
| **06 F1: Z4 (false solve, visible key) is 4× Z5 (hidden ice key)** | **CONFIRMED as S** | Same opening ("You're a detective"), same template, both older than 3 months. This is a clean within-channel pair. |
| **02 R1: open the participation window by ≤5 s** | **CONFIRMED** | It is consistent with SnapUGC: early exit (>5 s) correlates 0.926 with watch % (01 F3). |
| **06 R4 / 07 R2: "≥80 px or ≥5% of frame"** | **WEAKENED** | Our own hits fail 80 px. Fountain and Sandcastle figures are about 60 px (07 table), and Fountain's banana peel is about 40 px (04 F8). See C5. |

## 2. Rulings C1–C10

**C1: the test window.** One locked shot is allowed for up to 15 s **only** in an action window: a scripted, visible event every ≤1.5 s (02 measured 1.05–1.21 s on hits). A still test window is ≤7 s. The window opens by ≤5 s, or the lecture before it is ≤20 s and promised in line 1.
- Evidence: chains hit with 15 s action windows; Pickpocket's 15.8 s with no event flopped; Blood's 6.2 s still hit; the 10 s stills in #18 and #20 flopped.
- Novelty cadence counts on-screen events, not cuts or captions.
- Confidence: **med-low**.

**C2: the frame-0 question card.** It is neutral and optional.
- A challenge card of ≤6 words inside the safe box is fine for test formats.
- The card is never the whole of frame 0. What decides is the **playable field** behind it (01 H1): 4/5 vs 0/9 on our channel, and the Zack and Topper hits have no card at all.
- niche-data #6 applies to passive formats.
- Confidence: **med**.

**C3: the title.** Demand did not predict our views (ρ +0.16), and my F8 is now weakened, so neither "typed phrase first" nor "Can you… first" is proven. Reconciled:
- **First spoken line:** names the visible event and its victim, plus the task, finished by 3.6 s. It may contain the searched noun ("blood spatter", "chain reaction") but never starts with "How to" or "Learn".
- **Title:** the event or stakes plus "Can you…?". The typed noun goes in it only if it fits in the first 40 characters naturally.
- **Description:** sentence 1 = the spoken event line. The typed phrase appears once, plus 3–5 topical tags, and no #fyp.
- Confidence: **low**. A/B it.

**C4: the ending.** The core question is always answered on screen with a visual replay.
- Sole exception: a genuine paradox the viewer was led into (Missing-Dollar type) may end on that original question.
- Never open a NEW question, and never use a comment or subscribe CTA.
- The last line is a kicker or a series promise in statement form ("Next case tomorrow"), and the video ends ≤3 s after the answer, or after its final visual sub-reveal.
- Confidence: **med**.

**C5: minimum clue size.** **The decisive difference is ≥60 px on its short side at 1080×1920, in the frame where the viewer can find it.** Measure the thing that separates the right answer from the wrong one, not the object that carries it: a ridge, a vial, a changed word.
- On our channel this splits cleanly. Hit links and figures run 60–90 px or are whole-object events. The flops' keys are ≤45 px: Pickpocket 45, Fingerprint ridges 6–8, text 18–20, the vial about 10.
- Hue-only differences don't count.
- Confidence: **med**.

**C6: what "hard" means.** "Hard" = at least half of cold testers commit to a **visible wrong answer** (a decoy or false solve) and miss the real key, AND 20–60% solve it, AND every clue needed passes C5 and is on screen before the reveal.
- Difficulty comes from where, when and misdirection. It never comes from size, reading, arithmetic or hidden mechanisms.
- Confidence: **med**.

**C7: voice speed.** **≤200 wpm, measured as words ÷ Σ line durations in `timing.json`.** Equivalently ≤225 on word-span, ≈3.75 wps.
- Hits run 169–178 on that basis. Gemini runs 193–250.
- One limit for all formats until a story A/B says otherwise.
- Confidence: **low-med**.

**C8: brightness.** A **default, not a rule**: frame-0 and mean luma ≥0.45, and retire the dark-navy test screen.
- A departure is allowed when frame 0 holds a face or a high-contrast puzzle object. Cuemath hit 16.6M at frame-0 luma 0.13 with a face.
- Confidence: **low**.

**C9: cause of the slump.** Ranked, with the strongest first:
1. **The answer can't be checked by eye.** #20 is a text-and-arithmetic test; #23 has a ~10 px vial and a hidden ice key (06 Z5, 07 R2). This is consistent across 3 channels.
2. **Passive format.** #22 is a story; passive formats are 0/7 on this channel.
3. **Too young.** Every flop sits on the same floor of 303–1,370 views. #22 and #23 were read at ≤2 days old.
4. **Safe-zone violations.** On #23 the key action sits under TikTok's caption; confirmed.
5. **Frame 0 not playable / subject late.** #22's kid arrives at 2.5 s; #23 opens on a tilted camera swing.
6. **Gemini at 230–250 wpm.** An untested comprehension cost.
7. **The 3D look.** No evidence either way.
8. **Hot music in the gaps.** Constant across hits and flops.
9. **No frame-0 card.** The Zack hits have none.

**C10: the next three A/B tests.** Before any of them, pull the Creator Center retention for all 15 videos. It is free and settles whether the drop is at 0–5 s or in the test.
1. **Visible key vs subtle key** in the same teach-test template: #17 remade with a ≥60 px key on a bright playable field, against the current version. This settles legibility vs format.
2. **3D vs 2D** on an identical chain structure (#15 layout, Andrew voice, card, safe box). This settles the look.
3. **Gemini vs Andrew**, rate-matched at ≤200 wpm on the same chain script. This settles the voice.

## 3. Other conflicts

- **05 R5 vs 01 H2.** 05 wants the typed query spoken in the first 3 s; I want the first line to be the event plus victim. Resolved in C3: put the searched noun inside the event line.
- **The answer's position.** 02 R5 says 75–85% of runtime; 06 R5 says ≥88% for mysteries; Blood hit at 62% with visual sub-reveals. Suggest one rule: "the final visual reveal ≥75%, ≤3 s tail after it."
- **Two rules saying the same thing.** 07 R5 and my H1/H4 overlap. Merge them into one frame-0 rule: playable field at 0.00 s, pointer on the victim by ≤2.0 s, everything inside the safe box.
- **My H5 (frame-0 luma)** is superseded by C8. Drop it as a rule.
- **04 V9** (no moving captions during the find window) conflicts with the hits' "TOO LATE!" and "CATCH THEM" stamps during the window. Allow ≤1 short stamp per window, inside the safe box.
- **niche-data "first motion ≤0.5 s" and "VO at 0.0 s".** Every one of our flops passes both. Keep them as hygiene and stop citing them as explanations.
