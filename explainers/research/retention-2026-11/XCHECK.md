# Cross-check round: instructions for all 7 researchers

All 7 findings files in this folder are now written (01-hooks through 07-own-channel). Your job this round is to review them, not to research from scratch.

1. **Read all 7 files.** Read the 6 that aren't yours closely.
2. **Verify, don't just agree.** Do the following for every claim inside your expertise, and for any claim a proposed rule depends on:
   - Re-open the source URL. Re-run the measurement where you can, or check it against your own data.
   - Give it one verdict: **CONFIRMED / WEAKENED / WRONG / UNVERIFIABLE**, with one line of evidence.
   - Be adversarial. A rule that enters the rule book on a misread source or a confound is the failure we are trying to prevent.
3. **Rule on each contested point below.** Pick a side or propose a reconciled rule, and give its evidence and confidence.
4. **Flag** any other contradictions you notice, and any rule that would conflict with another rule in practice.

## Contested points (each reviewer answers every one)
- **C1, novelty cadence vs the still search window.** niche-data says new information every 1.5–3 s. 07 says our hits hold one locked shot with no narration for ~15 s. 02 proposes "a salient event every 1.5 s or less, or a still frame of 6 s or less". 03 proposes a search window of 15 s or less. What is the rule for the test window?
- **C2, the frame-0 question card.** niche-data says the hits don't print a question at frame 0. 01 and 07 say all our hits had a "Can you…?" card with the full scene. Does this hold for challenge formats only?
- **C3, the title.** The playbook says use the phrasing people type (demand.py). 01 says lead with the event plus "Can you…". 07 says search demand doesn't predict our views (rho +0.16). 05 says TikTok search reads the voiceover and on-screen text. What goes in the title, the description and the first spoken line?
- **C4, the ending.** niche-data and 05 say a kicker with no question to the viewer. 06 says an unresolved ending can work for a real paradox, but never open a NEW question at the end. 02 says never leave the core question unanswered. Write the reconciled rule.
- **C5, minimum clue size.** 04 says ≥40 px static or ≥80 px for motion. 07 and 06 say ≥80 px, or ≥5% of the frame. Pick one checkable number.
- **C6, difficulty.** The owner insists puzzles must be HARD. 02 says 20–60% of cold testers solve it, using a near-miss decoy. 06 says script the confident wrong answer. 07 says difficulty comes from where or when, never size. Write the single definition of "hard" that the rule book will use.
- **C7, voice speed.** 03 says ≤200 wpm for teach/test and ≤230 for stories. 02 says 165–200 wpm and ≤100 words per 50 s. Our Gemini episodes run 230–256. Pick the limit and say how to measure it.
- **C8, brightness.** 04 gives ≥0.40 (low-med). 07 gives ≥0.45. Both are confounded. Is this a rule or a default?
- **C9, what actually caused the recent slump** (#20, #22, #23 all ≤506 views)? Rank the candidate causes using everyone's evidence: invisible clues, reading tests, too-young posts, the 3D look, Gemini voice speed, safe-zone violations, the lack of a frame-0 card, the key that can't be seen, and the hot music.
- **C10, what to measure next.** Which 3 A/B tests settle the most?

## Output
- Write `xcheck-<your number>.md` in this folder (e.g. `xcheck-04.md`), at most ~1,200 words.
- Use 3 sections: Verdicts on others' claims, Rulings C1–C10, and Other conflicts.
- Your final message is a ≤250-word summary: your C1–C10 rulings in one line each, plus the single most important claim you found WRONG or WEAKENED.
