# 02: Retention structure (why people stay from second 3 to the end)

> **ERRATA (2026-11-28):** the posted hits are #13 Paint 18.2K, #15 Fountain 11.8K and #19 Sandcastle 9.5K. #16 Cake was never posted. In the table below, the "Fountain 18K" row is Fountain at 11.8K, and the "Cake" row is not data. Paint's beat map and the revised speed cap (≤250 wpm word-span, because Paint runs at 246) are in `xcheck-02.md`.

Researcher #2 of 7, 2026-11-27. Grades follow BRIEF.md: OWN / A / B / S / C / lore.
Method: (1) web sources, with primary pages fetched where possible; (2) a NEW beat map of 8 of our episodes, built from `episodes/*.plan.json` (absolute word and event times), plus chain-link times read from `src/chain/*.tsx` (`tGo + T_*`). (3) A per-frame pixel-difference pass (5 fps, 54x96 grey) over the rendered mp4s, to measure how still each test window is. Scripts: the scratchpad `beatmap.py` and `motion.py` (not committed).

## 0. The beat map (OWN)

Episode-to-file mapping: #14 = blood-spatter, #15 Fountain = chain-karma, #16 Cake = chain-party, #19 Sandcastle = chain-beach, #17 = fingerprint, #18 = liar, #12 = pickpocket-station, #20 = irredeemable.

| ep | views | dur s | words | wpm while speaking | test window opens | longest stretch with no new scripted info | central answer at | tail after the answer |
|---|---|---|---|---|---|---|---|---|
| Blood Spatter | 65.7K | 59.3 | 139 | 173 | 30.4 s (promised at 3.7 s) | 6.8 s (test; 0% of frames change for 6.2 s) | 36.7 s = **62%** | 22.6 s (2 sub-puzzles + a stat) |
| Fountain | 18K | 48.4 | 82 | 175 | **4.5 s** | 2.6 s | first cause 40.5 s = **84%** | 7.9 s |
| Cake HARD | 11.7K | 49.5 | 85 | 173 | **4.4 s** | 3.4 s | ~41 s = **~82%** | ~8.5 s |
| Sandcastle | 9.5K | 54.7 | 97 | 170 | **4.7 s** | 3.7 s | ~43 s = **~79%** | ~11 s |
| Pickpocket | 1,370 | 45.5 | 82 | 180 | 4.3 s | **15.8 s** (no scripted salient event in the search) | 29.3 s = 64% | 16 s, ends on an unresolved question |
| Liar | 860 | 58.7 | 111 | 153 | 29.8 s | **10.9 s** (static test) | 40.1 s = 68% | 18.6 s |
| Fingerprint | 795 | 49.5 | 108 | 169 | 24.9 s | 7.7 s (static test) | 31.0 s = 63% | 18.5 s |
| Irredeemable | 506 | 71.8 | 127 | **138** | 29.9 s | **10.9 s** (static test) | 40.1 s = 56% | **31.7 s** |

- **First spoken word:** 0.09–0.11 s in every episode. Not a differentiator.
- **First challenge:** stated in the first sentence of every episode ("Find what starts it" at about 3.5 s; "then you try / find the liar / catch the thief" at about 4 s). Not a differentiator either.
- **What separates the 3 chain hits from the 4 flops:** (a) participation starts at about 4.5 s, not after 25–30 s of lecture; (b) new information arrives every 1.05–1.21 s on average (flops: 1.3–1.9 s); (c) the central answer lands at 79–84% of runtime, with ≤ 11 s of tail; (d) 82–97 words, not 108–139.
- **Blood Spatter breaks (a), (c) and (d).** It has the same teach-then-test skeleton as Liar and Fingerprint, and its numbers are close to theirs. **Structure cannot explain why Blood hit and its siblings flopped.** Topic, or plain variance with n = 1, has to. See finding 12.
- **Posting order:** 14 Blood (hit), 15 and 16 chains (hits), 17 and 18 tests (flops), 19 chain (hit), 20 test (flop). In one 10-day window the chain format went 3/3 and the other test formats went 0/3. That interleaving argues against "the account was just hot that week".

## 1. Findings

1. **Curiosity behaves like a reward people will wait for. The wait used in the lab is about 14 s.** [B] Gruber, Gelman & Ranganath 2014 (Neuron) used a 14 s anticipation delay between each trivia question and its answer. High-curiosity answers were recalled 70.6% vs 54.1% for low-curiosity ones (45.9% vs 28.1% a day later). Unrelated faces shown during the wait were also remembered better (42.4% vs 38.2%). n ≈ 19 fMRI + 28 follow-up. https://pmc.ncbi.nlm.nih.gov/articles/PMC4252494. Marvin & Shohamy 2016 (JEP: General): people chose to wait longer for answers they were more curious about, and waited more for answers with positive or negative valence than for neutral ones. https://shohamylab.zuckermaninstitute.columbia.edu/sites/default/files/2017-02/Curiosity.pdf (exact effect sizes not read).
   - **What this predicts for us:** an open question can carry a static stretch of roughly 6–15 s, but only if curiosity is high. Our 15 s chain windows and 6 s blood window sit inside that range. Our 10 s static windows on low-valence questions ("which one is Category six?") are where it fails.
2. **Curiosity peaks at intermediate confidence.** [B] Kang, Loewenstein et al. 2009 (Psychological Science): curiosity about trivia activated reward regions (caudate) and was an inverted-U function of confidence. The gap must feel closable. Curious subjects also spent scarce tokens or waiting time to get answers. https://pubmed.ncbi.nlm.nih.gov/19619181/. I could not open the full text to confirm the inverted-U figure; a secondary summary confirms it.
   - **What this predicts for us:** a puzzle nobody can possibly solve loses as much curiosity as one that everybody solves at once.
3. **Near-misses make people want another go.** [B] Clark et al. 2009 (Neuron): near-misses were rated less pleasant than full misses yet raised the desire to play again, and the effect held only when the player felt in control. Earlier work put the most persuasive near-miss rate at about 30%. https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737
   - [OWN] Sandcastle builds this in: the obvious cause (crab, link 2) is a decoy for the real one (a wave, link 1). The narration says it, "Think the crab started it? Nope", and the caption adds "If you said the crab... watch again".
4. **Making a prediction is what turns a reveal into surprise.** [B] Brod, Hasselhorn & Bunge 2018 (Learning & Instruction): learning improved after people made predictions, mostly after the wrong ones. A pupil-measured surprise response appeared only when a prediction had been made first. In a 2021 follow-up, children benefited only if they had stronger inhibitory control. https://idw-online.de/en/news693157
   - "Did you catch it?" forces a prediction. A narrator who simply explains does not.
5. **People overestimate what they will notice, so a "can you catch it" test produces real misses.** [B, 1999, OLD] Simons & Chabris: about half of viewers missed the gorilla (≈43% in the visible condition, ≈70% in the faint one, per a reanalysis). About 90% predicted they would notice. https://moodle2.units.it/pluginfile.php/242405/mod_resource/content/0/Simons1999.pdf
   - This is the mechanism behind "Did you catch it before the replay?": viewers are confident, miss it, hit a near-miss, and replay.
6. **Questions placed inside a video cut mind-wandering roughly in half.** [B, 2013, OLD, one lecture] Szpunar, Khan & Schacter (PNAS), n = 48, a 21-min lecture in 4 segments. Mind-wandering probes: tested group 19%, restudy group 39%, untested group 41%. Final test: 90% vs 76% vs 68%. https://pmc.ncbi.nlm.nih.gov/articles/PMC3631699
   - Pre-questions before a short video improved general retention [B] (Carpenter & Toftness 2017, https://link.springer.com/10.1186/s41235-017-0078-z). Their effect was limited on real lectures (Toftness et al. 2018).
   - **No study measures watch time or rewatches of interactive Shorts.** This is the evidence gap for our best format.
7. **Suspense (known stakes plus a clock) reduces leaving; surprise had no detectable effect.** [B] Simonov, Ursu & Zheng (Twitch CS:GO broadcasts, CEPR DP17353, later in JMR): a 1-SD increase in round suspense cut the chance of leaving a stream by 0.27 percentage points. Surprise had no detectable effect on joining or leaving. https://ideas.repec.org/p/cpr/ceprdp/17353.html
   - This fits Hitchcock's bomb-under-the-table argument [C, Truffaut interviews, 1960s]: show the bomb and the timer first.
   - [OWN] Our hits do exactly this. They state the outcome in line 1 ("this guy ends up in the fountain"), then run a visible 15 s countdown bar.
8. **The Zeigarnik effect is the wrong justification for open loops.** [B] Ghibellini & Meier 2025 meta-analysis (Humanities & Social Sciences Communications) found no memory advantage for unfinished tasks. Only a tendency to RESUME them (the Ovsiankina effect) holds up. https://ideas.repec.org/a/pal/palcom/v12y2025i1d10.1057_s41599-025-05000-w.html
   - Open loops are justified by curiosity (findings 1–2), not by "the brain can't forget unfinished things".
   - An unresolved ending (Pickpocket's "who's the lookout?") may draw people back via Ovsiankina-style resumption, i.e. comments or rewatches. It does nothing for completion, because the viewer has already finished.
9. **Causal links are what people remember.** [B, 1985, OLD] Trabasso & Sperry and Trabasso & van den Broek (J. Memory & Language 24): story events with more causal connections are recalled better and rated more important, and dead-end events are dropped. https://narrativestudies.lib.unb.ca/bibcite/reference/18640 (secondary).
   - [C] This is the empirical cousin of Parker and Stone's rule that every beat should be joined by "but" or "therefore", never "and then". https://cracked.com/article_43358_trey-parker-and-matt-stones-surprise-nyu-class-contains-some-great-writing-advice.html. Sources disagree on the date of the NYU class.
   - [OWN] Every chain-reaction replay line is a because-link ("fell in because a bike hit him… swerved for a dog, scared by a flying tray"). The teach sections of Liar and Fingerprint are partly "and then" lists ("Loops… Whorls… And arches…").
10. **Fast pacing costs the words, not the pictures.** [B, 1999, OLD] Lang, Potter & Bolls (Media Psychology): with fast pacing and arousing content, recognition of verbal information fell but visual recognition did not. Lang et al. 1999 (JBEM) is cited second-hand as finding overload only at ≥10 unrelated cuts per 30 s. https://ibl.kb.nl/article/0000000121451//2/46
   - Signaling (cues that point at what matters) improves retention, g = 0.53 [B] (Schneider et al. 2018, k = 139; secondary figure). Segmenting gives a small-to-medium gain (Rey et al. 2019, 88 comparisons, https://is.tuebingen.mpg.de/publications/rey2018segmenting).
   - Seductive details (interesting but irrelevant material) hurt learning [B] (Sundararajan & Adesope 2020, 58 studies, https://news.wsu.edu/2020/03/19/seductive-details-inhibit-learning/).
   - Verbatim captions over narration did NOT hurt vs narration alone, and short keyword labels helped [B] (Adesope & Nesbit 2012, 48 effect sizes, https://rex.libraries.wsu.edu/esploro/outputs/journalArticle/Verbal-Redundancy-in-Multimedia-Learning-Environments/99900601157101842).
   - **Implication:** in a teach-then-test video, the rule the viewer must use should be SHOWN, because spoken rules are what get lost.
   - [OWN] Liar's whole key ("tell it backwards") is verbal. Its 10 s test asks viewers to read 6 lines of 26–28 px monospace text (about 9 px on a 390-px phone). Irredeemable asks viewers to add six numbers. Blood asks viewers to match a picture against three one-word options.
11. **Speech rate: nothing says 170–200 wpm is too fast.** [B, OLD] Adult comprehension holds to about 275–280 wpm before falling steeply (Foulke & Sticht 1969 and Fairbanks 1957, via secondary sources). https://link.springer.com/article/10.3758/BF03208200
   - For children, slowing speech by about a third did not help typically developing children; it helped only children with a language impairment (Haake et al. 2014, https://lup.lub.lu.se/search/files/2053614/4279978.pdf; details secondary).
   - The "120 wpm for kids" figure is **lore** (it comes from a press piece).
   - [OWN] Our two slowest episodes (Irredeemable 138 wpm, Liar 153 wpm) both flopped. Our hits run 170–175 wpm while speaking. niche-data found what-if hits at 158–200 wpm.
12. **Length: platform data favour LONGER videos for reach. The completion data don't exist publicly.** [B-weak] Buffer, 1.1M TikToks (primary page read; accounts and date range not stated; all figures are medians):
    - 60 s+ videos got 43.2% more reach and 63.8% more watch time than 30–60 s videos.
    - **Median watch time was only 6.9 s for 30–60 s videos and 11.3 s for 60 s+ videos.** Most viewers of a 50 s video leave in the first seventh.
    - https://buffer.com/resources/longer-tiktoks-get-more-views-data/
    - [B] Kuaishou's D2Q paper (1.35B impressions, 47M users) shows watch time rises with duration and the platform's impressions drift toward long videos. Normalising watch time by duration does not remove that bias (arXiv 2308.08120). https://ar5iv.labs.arxiv.org/html/2206.06003
    - [C] OpusClip's "41 seconds" figure rests on 1,449 scraped TikToks with no method, and its own table contradicts its claim. https://www.opus.pro/blog/how-long-should-a-tiktok-be-2026. **Discard it.**
    - [A] YouTube's Shorts lead advises story over any target length (secondary summaries of a 2023 Creator Insider interview, e.g. https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/).
    - [OWN] Length doesn't separate our hits (48–59 s) from our flops (45–72 s).
13. **A static test frame is NOT fatal by itself.** [OWN] Blood's 6.2 s fully still test window (0% of sampled frames changed) sits in our biggest hit. Liar (6.2 s still within 10 s) and Fingerprint (5.6 s) are similar. Pixel motion doesn't separate hits from flops either: Pickpocket is 100% "moving" crowd and still flopped. **Salient scripted events matter, not raw motion.** The chain windows carry 10–16 scripted links with SFX dings, one about every 1.2 s.
14. **Valence and stakes.** [B, via finding 1] People wait longer for valenced answers.
    - [OWN] Questions in our hits are about consequences: "how did they die", someone ends up in a fountain, a cake gets smashed. Questions in our flops are classifications: which print type, which criminal-history category. Pickpocket (theft) and Liar (a lie about "last night") sit in between.
    - Plausible, but confounded with topic demand (Dexter). **Low confidence.**

## 2. Contradictions

- **niche-data "new info every ~1.5–3 s".** Our biggest hit has a 6.2 s frozen test window. The rule needs an explicit exception: a timed participation window, where the countdown is the novelty and the viewer is working.
- **niche-data "late payoff".** For test formats it holds for the chains (79–84%) but not for Blood (62% plus a 22.6 s tail of sub-puzzles). What matters is not where the answer sits but whether the tail after it opens NEW questions.
- **Common advice "open loops work because of Zeigarnik".** The 2025 meta-analysis finds no Zeigarnik memory effect (finding 8).
- **Common advice "keep it under 30 s".** Buffer's medians favour longer videos for reach. Every one of our hits is 48–59 s.
- **evidence.md §3 graded Buffer as a C summary.** I read the primary page. It reports medians, but buckets differ from those quoted and the method is partly hidden, so it is B-weak. Its median watch-time figures are more useful to us than its reach figures.
- **The owner's "puzzles must be HARD, one subtle key, no giveaway" (memory).** This partly conflicts with findings 2–3. Curiosity and replay peak at a near-miss, not at impossibility. Sandcastle, the hard one that hit, was hard because of a decoy, not because the answer was invisible. Poison (#23) answers via an ice elevator nobody saw, with 3 conspirators, which risks the zero-confidence end of the curve. It is too young to judge.
- **The quality benchmark's "our voice is slower: 2.7 vs 3.7 words/s".** Our hits run 2.84–2.91 words per second of speech, 1.7–2.3 overall. Check which basis the 3.7 figure used before acting on it.

## 3. Proposed rules (checkable)

| # | rule | test | conf. | evidence |
|---|---|---|---|---|
| R1 | Test formats open the participation window by **≤ 5 s** (challenge in line 1, timer starts right after). Teach-then-test must justify a ≥ 20 s lecture with a high-demand topic. | `lineEnds[0]` ≤ 5 s | med | OWN 3/3 chains vs 0/3 later teach-tests; B finding 6 |
| R2 | The test window holds a **scripted salient event every ≤ 1.5 s** (action test), OR it is a still frame of **≤ 6 s** (still test). Never a ≥ 10 s still. | max gap between `tGo+T_*` events; still-window length | low-med | OWN (10 s stills 0/2, 6 s stills 1/2); B finding 1 |
| R3 | **Build a near-miss decoy.** The loudest or most obvious cause is link 2; the real cause is link 1, earlier and quieter. The narration names the decoy ("Think the crab…? Nope"). | the script has a decoy line | med | B findings 3, 4, 5; OWN Sandcastle and Cake |
| R4 | **Difficulty target: 20–60% of 5 cold testers solve it.** All of them must say "oh!" at the reveal. | 5-person pre-test before render | med | B findings 2, 3 |
| R5 | The central answer lands at **75–85%** of runtime. Tail after it **≤ 11 s**, unless every extra beat opens a NEW question that is answered within ≤ 4 s (Blood's "how many hits?" and "this gap?"). | `answer_t / end`; `end − answer_t` | med | OWN chains vs flops; S niche-data 54–86% |
| R6 | **Pay off in a ladder**: after the test, a sub-reveal every ≤ 3.5 s (Fountain: 5 two-link steps of about 3.3 s each). | gaps between reveal events | med | OWN; B finding 9 |
| R7 | **Zero "and then" joints** in the replay or teach section. Every line starts with, or implies, *because / so / but*. | read the script aloud and try inserting "and then" | low-med | B finding 9; C Parker/Stone |
| R8 | The test is **solvable on a phone with sound off in the time given**: ≤ 3 options of ≤ 3 words each, no arithmetic, no reading of > 12 words, no detail smaller than about 40 px on 1080 w. Every rule needed is SHOWN on screen during the teach section. | frame check at 390 px width | med | B finding 10; OWN Liar/Irredeemable/Fingerprint |
| R9 | **Speech 165–200 wpm** while speaking; never below 155. No evidence supports slowing down for kids; clarity comes from simpler words, not slower ones. | words ÷ Σ(lineEnd − lineStart) | med-low | B finding 11; OWN; S niche-data |
| R10 | **Word budget for test formats: ≤ 100 words per 50 s.** Narration covers ≤ 60% of runtime; the visuals carry the test. | word count; speech coverage | low | OWN (82–97 hits vs 108–139) |
| R11 | **Line 1 states the stakes and the clock** ("In 15 seconds, X ends up Y"), i.e. the bomb under the table. The question asks about a consequence (who, how they died, what wrecked it), not a classification. | line-1 check | med-low | B findings 1, 7, 14; OWN |
| R12 | Don't end on an unanswered core question. If you want comments, leave a SECOND, optional question open after the main one is resolved. | script check | low | B finding 8; OWN Pickpocket |

## 4. Applies to us

- **Chain hits (Fountain, Cake, Sandcastle):** they pass R1, R2, R5, R6, R7, R9, R10 and R11, and Cake and Sandcastle pass R3. This is the best-explained part of our data.
- **Pickpocket (1,370):** passes R1 but fails R2 (15.8 s with no salient scripted event: needle-in-a-haystack, not a causal chain), R6 and R12. It is the best of the flops, which fits passing R1 alone.
- **Liar / Fingerprint / Irredeemable:** fail R1 (25–30 s of lecture first), R5 (tails of 18–32 s with mostly statements) and R8 (reading, fine detail, arithmetic). Liar and Irredeemable also fail R2 (10 s stills) and R9 (153 and 138 wpm).
- **Blood Spatter:** fails R1 and R10, and bends R5. **The rules do not explain it.** The remaining explanations are topic (Dexter, death, morbid curiosity, a searchable phrase) and luck at n = 1. Of its siblings, Blood is the only one that passes R8 (match a visual to three words) and has the highest-valence question ("how did this person die?").
- **Story, fight and odds episodes (#01–#10, #22):** none has a participation window. In our table, 4 of 9 test episodes were hits vs 0 of 6 non-test episodes. That gives Fisher p ≈ 0.09, and the non-test videos were also the earliest posts. **Suggestive, not proof.**
- **#23 Poison:** passes R1, R2 and R11. It risks R4 (answer via an unseen ice elevator, 3 conspirators across rooms) and R8. Judge it at 72 h.

## 5. Open questions (only our analytics can settle these)

1. Retention curves for Blood, Fountain, Liar and Fingerprint. Is there a cliff at the test window, a plateau, or a cliff right after the answer (which would decide R5)?
2. Rewatch or loop rate (retention above 100%, or YouTube views per engaged view) for the chains with "watch again" captions vs those without. This would test the near-miss mechanism (R3).
3. Comment counts and content per episode. Do test formats draw "I got it" or "the crab!" comments? Does Pickpocket's open lookout question draw more?
4. Search share of Blood's traffic ("dexter blood spatter"). If it is high, Blood's hit is a topic win, not a structure win.
5. An A/B pair: the same chain scene with the decoy line and without it, and with an 11 s tail vs a 20 s tail.
