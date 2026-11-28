# The Rule Book: retention rules for every explainer Short

v1, 2026-11-28. It is built from 7 independent research tracks plus a cross-check round in which each track audited the other six.
- Evidence: `research/retention-2026-11/` (01–07 findings, xcheck-01…07, ERRATA).
- Every rule is tagged with its strongest evidence:
  - **[OWN]**: our 15 TikTok posts.
  - **[A]**: platform-official.
  - **[B]**: academic or large-n.
  - **[S]**: competitor videos we measured.
  - **[C]**: creator or vendor.
- **MUST** rules are gates: a video that fails one doesn't post. **DEFAULT** rules can be broken only by an episode that is labelled as an A/B test.

Run `python scripts/rulecheck.py <episode-id> [video.mp4] [--answer SEC]` before every render you plan to post. It checks every rule marked 🤖. The rest are checked by eye using the checklist at the bottom.

**Calibration law:** no MUST rule may fail one of our proven hits. All 🤖 thresholds were run against Paint, Fountain, Sandcastle and Blood Spatter on 2026-11-28 and loosened until all 4 pass. Re-run that check whenever a threshold changes.

---

## 0. What the research actually found (read this first)

Our channel splits cleanly:

| | posts | views |
|---|---|---|
| **Look-and-find challenge with a visible key** (chain reactions: Paint, Fountain, Sandcastle; Blood Spatter) | 4 | **9.5K – 66.7K** |
| **Challenge whose key you can't check by eye** (pickpocket hand, fingerprint ridges, liar's text, sentencing arithmetic, the 10 px vial) | 5 | 506 – 1,370 |
| **Passive** (story, fight, odds, wind, speed) | 6 | 303 – 1,124 |

1. **What wins is a solvable-looking challenge whose answer you can SEE on a phone.**
   - Audio is identical between the hits and the flops: same voice, same mix, same −14 LUFS. [OWN]
   - Search demand doesn't predict our views (ρ +0.16). [OWN]
   - Account momentum isn't the reason either: #17 and #18 flopped between two hits. [OWN]
2. **"Hard" was implemented wrong.** Hard puzzles win by making you *confidently wrong*, not by hiding the clue.
   - Zack D. Films' biggest puzzles do this: Missing Dollar got 30.8M and Stolen Money 26.8M. [S]
   - Their *weakest* is a hidden-key one, Poisoned Ice Cube, at 0.42× the channel median. That is the same key #23 used. [S]
   - Our views fell every time difficulty came from making clues smaller. [OWN]
3. **Posts settle within hours.** #23 had 374 views a few hours in and 412 at 13 h.
   - Our 11 flops all stopped in a 303–1,370 band. That looks like failing the first test audience. [OWN + A]
   - Judge a post at **24 h**, confirm at 72 h.
4. **Two routes to reach:**
   - *watch/rewatch* (chain reactions get about 2 shares+saves per 1K views, no better than the flops);
   - *saves* (Blood Spatter: 1,468 saves, 4.5× its shares, because it teaches a skill worth keeping). [OWN]

---

## 1. Format choice: decide before writing a word

- **F1 MUST: every episode gives the viewer a TASK they can attempt by LOOKING** (find, spot, catch, pick A/B/C).
  - Passive formats (story, fight, odds, ranking) are allowed only as labelled experiments, at most 1 in 4 posts. [OWN 0/6 passive hits]
- **F2 MUST: the answer is verifiable by eye on replay.** No key that needs:
  - reading (more than 4 words), or arithmetic;
  - comparing fine detail (ridges, glyphs);
  - knowing something that was never shown on screen (e.g. "it was in the ice").
  [OWN 0/5 · S Junior Detectives, Zack D.]
- **F3 DEFAULT: our lanes, in order:**
  1. **Chain Reaction.** 3/3 hits, and there is no YouTube competitor for "find what starts the chain reaction". [OWN, S]
  2. **Teach-then-test with a picture-match test** (Blood Spatter style: a short teach, then pick from 3 big images). [OWN]
  3. **Whodunit**, only if it obeys F2 and C6 below.
- **F4 AVOID:**
  - "who is lying" riddles: 0–47 views on YouTube [S];
  - well-known riddle keys like poison in the ice [S];
  - text-heavy rap-sheet tests [OWN].
- **F5 Stories, if made, follow the Pup History model:** one named real hero (an animal), a recurring cute mascot, a real-photo inset at the end, wholesome + heroic + one number, ~60–65 s. [S]

## 2. Hook: frame 0 to 3.6 s

- **H1 MUST: frame 0 is the playable field.**
  - The whole puzzle scene is on screen at 0.00 s and covers at least 60% of the frame.
  - No title card, no dark quiz screen, no establishing shot that later cuts to the scene.
  - [OWN 4/5 hits vs 0/9] [S Zack D.: the object is in action at frame 0]
- **H2 MUST 🤖: the first sentence is at most 13 words and ends by 3.6 s.**
  - It names a concrete **event + victim + clock** ("In 15 seconds, this guy ends up in the fountain."), or for teach-then-test a concrete *mystery* ("Dexter can look at blood on a wall and know how someone died.").
  - "Learn", "how to" and "today we" never appear in sentence 1. "Learn the code, then you try" is fine as sentence 2.
  - Calibrated so all 4 hits pass (they end at 2.8–3.6 s).
  - ⚠️ This is **hygiene, not the cause**: Fingerprint, Liar and #23 pass it too. The hook's power comes from H1 plus F2.
- **H3 MUST 🤖: the task verb** (find / spot / catch / pick / who / try) is spoken by 5.5 s. Hits fall at 3.2–5.2 s. [OWN]
- **H4 DEFAULT: an arrow or ring points at the victim by 2.0 s.**
  - Challenge formats also show a task card (≤6 words, top edge at y ≥ 240) and the timer at frame 0.
  - The card alone predicts nothing (7/11 flops had one). It is hygiene, and it only works on top of H1. [OWN]
  - Passive formats print no question. [S niche-data]
- **H5 MUST: every promise in the hook happens on screen**, and every number in it is literally true.
  - "In 15 seconds" means the victim's event lands at 15 s.
  - YouTube penalises openings that don't deliver; it predicts satisfaction from surveys. [A]

## 3. Structure: 3.6 s to the end

- **S1 MUST: the test window opens by 5 s.**
  - The teach section of a teach-then-test runs **at most 10 s** before the first test.
  - Liar, Fingerprint and Irredeemable lectured for 25–30 s first and all flopped. [OWN]
- **S2 MUST: test-window pacing.** A locked, unnarrated shot is fine for **up to 15 s**, but:
  - a visible scripted event lands on average every **≤1.5 s**, with no gap over **4 s**;
  - crowd drift and idle loops don't count as events;
  - a **still-image** test (A/B/C pictures) lasts **at most 6 s**, never 10 s or more;
  - show a countdown on screen, with an audible tick every 1 s.
  - Our hits' longest gaps are 2.3–3.7 s. [OWN, B suspense research]
- **S3 DEFAULT: outside the test window, something new every ≤3 s** (a camera move, a caption pulse, a new object, a new number).
  - Cuts are not required: a 75.3M hit has 1 cut. [S]
  - `metrics.py` misses dissolves, so don't trust its cut count alone.
- **S4 MUST: build one decoy that catches most viewers.**
  - This is the trap, not a trick: a visible, plausible wrong answer most first-time viewers commit to. The Sandcastle crab ("If you said the crab… watch again") is the template.
  - **If no decoy exists, drop the idea.** [B near-miss & curiosity research · S Zack D. hits]
- **S5 MUST 🤖: the core answer lands at 75–85% of runtime**, and the video ends at most 11 s after it. [OWN: chain hits 79–84%; flops resolved at 56–68%, then talked for 18–32 s]
- **S6 DEFAULT: reveal as a ladder.** Rewind or replay, one link per step, a new step every ≤3.5 s, with a zoom push on each key link.
- **S7 MUST: chain links are "but" / "therefore", never "and then".** Every link physically causes the next one. [C Parker/Stone · OWN]
- **S8 MUST: the video ends** within 3 s of the final reveal (8 s if the ending carries one reusable fact) **on a statement kicker**.
  - Always answer the core question visibly.
  - **Never open a NEW question at the end.** Pickpocket did, and flopped.
  - **Never** ask for comments, follows or subscribes.
  - An original verbal paradox may stay open, but only as a labelled experiment.
  - [S 0/21 passive hits ask; 06/02/05 rulings]

## 4. Difficulty: the one definition of "hard"

- **D1 MUST: "hard" means all three of these:**
  1. **At least half of 5 cold testers commit to the scripted decoy.**
  2. **1–3 of the 5 solve it** (20–60%).
  3. **All 5 can confirm the answer on replay** once they're shown where to look.
- **D2 MUST: difficulty comes from WHERE, WHEN and MISDIRECTION, never from SIZE, HIDDEN information or READING.**
  - Allowed tools:
    - a crowd that *moves*;
    - lookalike decoys doing similar actions at the same time;
    - the real start happening before the timer or off-centre;
    - a noisy decoy competing with a silent real link.
  - Banned tools:
    - a decisive object under the C5 size;
    - a key event inside a dense crowd with no visible consequence;
    - a mechanism never shown on screen.
- **D3 MUST: cold test before posting.**
  - Show the phone-size render to people who haven't seen it, or, at minimum, to a fresh-context agent viewing the frames at 360 px wide.
  - Record the decoy-commit, solve and verify counts in the Episode Brief.

## 5. Visuals: phone legibility

- **C5 MUST: clue size.** The decisive clue is either:
  - **(a) a motion event:** the moving body is at least **40 px** on its short side, travels at least **80 px**, and is the most salient motion in its region. (A 45 px hand inside 600 moving people fails.) A smaller trigger object is fine only if it *immediately* sets off a body that meets (a). Or:
  - **(b) a static difference of at least 80 px.**
  - Contrast against the background is at least **3:1** in both cases.
  - Examples:
    - Fountain's 40×15 px banana peel works because it's *thrown*.
    - Paint's 25–30 px ice cream works because a person slips on it.
    - #23's 10 px vial, passed silently hand to hand, cannot work.
  - Confidence: med. Only thresholds of 26–44 px separate our hits from flops. [OWN, B Mital gaze, eye-chart acuity at 32–36 cm]
- **V1 MUST: the safe box.** Every text element, the timer, the clue and the victim's event sit inside **x 120–960, y 240–1260**.
  - Additionally, nothing important sits at x > 900 for y > 840 (the right-hand buttons).
  - #23 put its timer in the tab band and the poisoning under the caption overlay. [A via TikTok ad template]
- **V2 MUST: caption cap height 80–110 px, never under 60.** Hits are 87–109 px; #22 and #23 dropped to 49–74. [OWN]
- **V3 MUST: no captions inside the find window.** Outside it, captions are **keyword pulses of 1–3 words**, not a transcript. Text the viewer must read appears at no more than 3 words per second. [B redundancy/reading research]
- **V4 DEFAULT 🤖: brightness.** Mean luma at least 0.45, frame 0 at least 0.45. Retire the dark-navy card template.
  - This is a default, not a cause: every one of our videos below 0.30 flopped, but brightness alone made no hits. [OWN ρ +0.62–0.72, confounded]
- **V5 DEFAULT: the reveal zooms in** until the clue fills at least 25% of the frame width.
- **V6: the art style is free.** 2D, 3D or collage: there's no evidence any one wins. Don't change the style and other variables in the same post (see M2).

## 6. Audio

- **A1 MUST 🤖: voice speed.** At most **200 wpm** for teach/test and **220** for stories; target 165–185.
  - **Measure it one way only:** Σwords ÷ Σ line `duration` in `<episode>.timing.json` (the line-level basis).
  - Hits are 170–196 (Paint 196). Poison (230) and tod-3d (250) fail. Checked by rulecheck on all hits.
  - Word-span numbers run ~25% higher; never compare across bases. [B comprehension research · OWN]
- **A2 MUST: no clue is audio-only.** Sound may reinforce a clue or misdirect, never decide; ~half of viewers may have the sound off. [OWN, C]
- **A3 MUST: mix.** Music sits at least **10 dB under the voice** in the voice band, and at least 6 dB under program level in the gaps. Our beds were ~5 dB under; Zack D. and Infographics run 8–13 dB under. [B Torcoli 2019, S]
- **A4 MUST 🤖: loudness.** −14 ±1 LUFS integrated, true peak at most **−1 dBTP**.
  - This is free hygiene, not a cause: Paint (+1.4), Sandcastle (+0.8), GTA6 (+2.3) and Liar (+1.8) all clip, hits and flops alike.
  - Fix it in the export with a true-peak limiter after loudnorm. [A YouTube normalisation]
- **A5 DEFAULT: few SFX.** About 1.5 per 10 s or fewer, on the beats that matter: the countdown tick, the reveal hit, the kicker sting. More is lore; the 15M Zack hits use almost none. [S]
- **A6: no trending sounds.** They bring 0.1% of traffic. [OWN other account]
- **A7 DEFAULT: AI voice is fine.** There is a small measured penalty of about 5–7% fewer likes, comments and shares. Pace (A1) matters more than which voice. [B prelim]

## 7. Packaging: title, caption, search

- **P1 DEFAULT: YouTube title** = `"[Event]: Can You [task]?"`, then the typed phrase if it fits.
  - Example: "This Guy Ends Up in the Fountain: Can You Find What Starts It?"
  - Never lead with "How to" or "Learn".
  - Low confidence: A/B it.
- **P2 MUST: TikTok description.** The first line is the event and the task, including the searched noun ("chain reaction", "blood spatter").
  - Then 3–5 *topical* hashtags. **Drop #fyp** and long tag lists.
  - TikTok's 2026 Creator Academy says search reads the description, voiceover, captions and on-screen text, and may flag stuffing as spam. [A]
- **P3 MUST: the searched noun is spoken once in the first 3 s** and shown once as plain on-screen text.
  - Demand (`demand.py`) is a **tiebreaker**, not a gate. [A + OWN ρ +0.16]
- **P4: cover frame.** The key subject sits inside y 420–1500.
- **P5 MUST: post the clean render** to every platform, never a watermarked re-download.

## 8. Measure and iterate

- **M1 MUST: judge at 24 h, confirm at 72 h.**
  - **Failed variant:** under 1K views and under 5 shares+saves per 1K views.
  - Retry a failed variant once with ONE fix, then drop it. Never delete and repost. [OWN, A]
- **M2 MUST: change at most one big variable per post** (style, voice, format or difficulty mechanic). #23 changed five at once, so its flop teaches nothing. [OWN]
- **M3: give each template 3 episodes before judging it.**
  - One video proves nothing: a small channel's identical template ranged from 76 to 87K views. [S]
- **M4: the target for teach-then-test is at least 10 shares+saves per 1K views** (Blood Spatter did 26.9).
- **M5: completion % is the metric that matters**, then shares+saves per view, then search share. Ignore like-rate (it runs backwards here) and posting time.
- **M6: queued A/B tests, in order:**
  1. **Pull the per-video retention curves** from TikTok Studio (the owner's logged-in Chrome, via `/tiktok pull`). This settles more than any rule here.
  2. **3D vs 2D:** the Fountain structure rebuilt in 3D with the Andrew voice, against the 2D original. That isolates the look.
  3. **Voice:** the same 3D build with Gemini held to 200 wpm or less. That isolates the voice.
  4. **A "look, don't read" remake of Fingerprint** with a big visual key, testing whether the teach-test format is dead or just was badly built.

---

## Pre-post checklist (paste into every Episode Brief)

```
FORMAT  [ ] F1 look-task  [ ] F2 verifiable by eye  [ ] F4 not a known riddle key
HOOK    [ ] H1 frame0 = playable field   [ ] H2 🤖 ≤13 words, ends ≤3.6s, event/mystery, no "learn" in sent. 1
        [ ] H3 🤖 task verb ≤5.5s  [ ] H4 arrow ≤2s + card + timer   [ ] H5 promise shown, numbers true
STRUCT  [ ] S1 test ≤5s (teach ≤10s)  [ ] S2 event ≤1.5s avg / ≤4s gap, still ≤6s, ticking countdown
        [ ] S4 decoy scripted: ____   [ ] S5 🤖 answer at 75–85%, ≤11s after
        [ ] S7 every link causes the next  [ ] S8 statement kicker ≤3s, no new question, no CTA
HARD    [ ] D1 cold test: commit __/5  solve __/5  verify __/5   [ ] D2 no size/hidden/reading
VISUAL  [ ] C5 clue: motion ≥40px & travels ≥80px, or static ≥80px; contrast ≥3:1
        [ ] V1 safe box x120–960 y240–1260 (+ right rail)  [ ] V2 caption cap 80–110px
        [ ] V3 no captions in find window  [ ] V4 🤖 luma ≥0.45
AUDIO   [ ] A1 🤖 ≤200 wpm line-level  [ ] A2 no audio-only clue  [ ] A3 music ≥10 dB under VO
        [ ] A4 🤖 −14±1 LUFS, TP ≤ −1 dBTP
PACKAGE [ ] P1 title  [ ] P2 description + 3–5 tags, no #fyp  [ ] P3 noun spoken ≤3s + on screen
MEASURE [ ] M2 the ONE variable this post tests: ____   [ ] 24 h check booked
```
