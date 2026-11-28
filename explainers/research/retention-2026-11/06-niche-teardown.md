# 06: Niche teardown. Who wins in our formats right now, and what they do that we don't

Researcher #6, 2026-11-27. The method was flat yt-dlp listings: 46 YouTube searches (plain, plus the "Shorts" and "under 4 min" filters) and the Shorts tabs of 18 channels. I downloaded 13 competitor Shorts and ran `metrics.py` plus 1.5 s frame grids on them. For 4 "made-for-kids" Shorts the download was refused, so I used storyboards and auto-captions instead. I also made frame grids for 8 of our own episodes and read the public grid of the Pup History TikTok profile, without logging in. About 140 YouTube requests in total.

Every view count was read on 2026-11-27. "Median" means the median of the channel's last 150 Shorts (900 for Zack D. Films).

All the scratch data (grids, metrics.json, search JSON) is in the session scratchpad `...\scratchpad\nt\` (g\, m\, ch\, s2–s5\, ours\, dl\jd\).

## Measured videos

| # | channel (median) | video | views | age | len | challenge posed | answer at | ending | verdict |
|---|---|---|---|---|---|---|---|---|---|
| Z1 | Zack D. Films (9.95M) | Missing Dollar Riddle (`mIHafmS6fYc`) | **30.8M** | 43 d | 51 s | 98 % | **never**: ends on "where did the dollar go?" | open paradox | HIT 3.1× |
| Z2 | Zack D | Stolen Money Puzzle (`C-GZdIT1_I0`) | **26.8M** | 51 d | 54 s | 35 % | wrong answer ($200) at 41–63 %, right one at 95 % | stop on answer | HIT 2.7× |
| Z3 | Zack D | Mail Chute Mystery (`NTC2esqvPoE`) | **18.0M** | 47 d | 37 s | 20–37 % (letters vanish) | 90–98 % | visual payoff (40,000 letters) | HIT 1.8× |
| Z4 | Zack D | Woman On The Couch, Murder Mystery (`36zQHVNKBWs`) | **16.6M** | 5 mo | 65 s | 0 s, "You're a detective" | **false solve "Case closed" at 74 %**, real one at 90–94 % | loops to the body | HIT 1.7× |
| Z5 | Zack D | Poisoned Ice Cube Riddle (`lGysMgVxRRw`) | 4.1M | 3 mo | 50 s | 57 % | 65 %, then explains to 100 % | explanation | MISS 0.42× |
| Z6 | Zack D | Greek Cross Puzzle (`uBbAEgsSdMM`, metadata only) | 3.1M | 2 mo | 48 s | – | – | – | MISS 0.31× |
| Z7 | Zack D | Electricity Reveals Fingerprints (`FbJsxhgeDyU`) | 1.9M | **3 d (young)** | 27 s | **none**: procedure only | – | "will catch more criminals" | MISS (provisional) |
| Z8 | Zack D | Ten Penny Puzzle (`obfPsvB-A9U`) | 4.4M | 4 d (young) | 27 s | 0 s | 47 % (step-by-step method) | method | MISS (provisional) |
| J1 | Junior Detectives w/ Hoot (259K, 26.5K subs) | Who Ate Grandpa's Chocolate? Can YOU Spot the Bite Mark? | **6.16M** | 23 d | 64 s | "Can you spot it?" at 61 % | 63 % | fun fact + "**Next case tomorrow**" | HIT 24× |
| J2 | Junior Detectives | Who Took Grandma's Pie? Follow the Glowing Footprints | **1.41M** | 26 d | 78 s | 66 %, after a **false solve** (Mia) | 70 % (raccoon) | fun fact + "Next case tomorrow" | HIT 5× |
| J3 | Junior Detectives | Who Ate the Glowing Jelly? (UV) | 67K | 8 d | 58 s | **no viewer challenge**: clue invisible until the UV torch | ~62 % | "watch my other cases and subscribe" | MISS 0.26× |
| J4 | Junior Detectives | Birthday Cupcakes, Mirror Writing Mystery | 44K | 4 d | 71 s | "Can you guess who?" 57 % (**reading** backwards text) | 60 % | "subscribe" | MISS 0.17× |
| G1 | GabeSweats (1.0M; stock footage + VO) | try and solve this murder mystery (`qneid0dg5tg`) | **16.5M** | 2022 | 60 s | 0 s, "I bet you can't solve" | **never**: "leave your answer in the comments, don't cheat" | open | HIT; **178K comments (1.08 %)** |
| L1 | Ludynx (2.4K, tiny like us) | Odd One Out: Sushi (`SiS898j9ID0`) | 87K | 5 d | 23 s | 0 s, 3 rounds × 3 s | each round | "comment your score" | HIT 36× |
| L2 | Ludynx | Shell Game: Red Car (`FxjKP_sswvY`) | 29.6K | 7 d | 25 s | 0 s | 93 % | "Did you get it? YES/NO" | HIT, 238 comments (0.8 %) |
| L3 | Ludynx | Odd Zombie (`g6fk0vDsh1k`) | **76** | 12 d | 23 s | identical template to L1 | | | MISS |
| L4 | Ludynx | Memory: 6 Candies (`82EyYvQhApg`) | 128 | 14 d | **53 s** | | | | MISS |
| P | Pup History (TikTok) | 16 latest posts | 80.9K–4.6M, **13/15 in 222K–750K** | | **65 s** (2 checked) | | | | consistent |

Ours, read from the grids and `*.timing.json`:

| ep | views | len | frame 0 | test posed | answer at | ending | VO wpm |
|---|---|---|---|---|---|---|---|
| 15 Fountain | 18K | 48 s | busy plaza + "IN 15 SECONDS" + 15 s timer; the outcome (guy in fountain) is named in the first line | 0 s; viewing the scene *is* the play | first cause at ~81 % after a backwards trace | whole chain + "12.0 SEC" | 173 |
| 16 Birthday / 19 Sandcastle | 11.7K / 9.5K | 50 / 54 s | same template | 0 s | ~80 % | chain recap | 171 / 169 |
| 14 Blood spatter | **65.7K** | 60 s | a big red spatter wall + "HOW DID THEY DIE?"; "Dexter" is the first word | 0 s promise ("learn the code, then you try"); timer at 47 % | 60 % | 2 more *visual* reveals (number of hits, "someone stood here"), then the 1-in-9 sting | 170 |
| 12 Pickpocket | 1.37K | 46 s | 600 tiny people; nothing visibly happens | 0 s | ~65 % | a **new unanswered question** ("who's the lookout? comment") | 178 |
| 17 Fingerprint | 795 | 50 s | small fingerprint card on a dark board | 44 % | 64 % | twins twist | 169 |
| 18 Liar | 860 | 58 s | three icons + "?" text boxes | 48 % (**read** 3 text alibis) | 69 % | 15 s tail of stats ("54 % = coin flip") | 152 |
| 23 Poison whodunit | 374 (young) | 48 s | dense dollhouse | 0 s | answer = poison in ice + 3 accomplices (**not visible**) | "not guilty" | **230** |

## Findings

1. **Within Zack D. Films, the ×3–×10 gap between hits and misses comes from the shape of the question, not from production.** [S] Same channel, same art, same voice, same 0–2 hard cuts, VO from 0.0 s, 134–196 wpm.
   - Hits (16–31M) make you commit to a **confident wrong answer**, then break it:
     - "$9×3 + 2 = 29": the paradox is never resolved.
     - "the store lost $200": shown as the wrong answer, then corrected at 95 %.
     - "no footprints, so nobody came in": "Case closed" at 74 %, then flipped.
   - Misses either pose **no question** (Fingerprints, 27 s of pure procedure) or have an answer that needs **hidden knowledge you couldn't have seen** (Poisoned Ice: 4.1M, 0.42× median at 3 months old).
   - Clean controlled pair: Z4 vs Z5. Both open "You're a detective", both are murder riddles of ~50–65 s, same template. The one with a false solve and a twist drawn from visible clues (snow, weather app) got 4× the views of the one whose key ("the poison was frozen in the ice") is never shown before the reveal.
   - URL: https://www.youtube.com/@zackdfilms/shorts

2. **Our ep 23 reused the exact losing key: poison in the ice.** [S + OWN] It is a famously old riddle, and it was Zack D's weakest mystery (Z5). Ours also hid the 3 accomplices. Ep 23 is too young to judge on its own, but it matches the miss pattern on both counts.

3. **Junior Detectives is the same "who did it, can YOU spot it" detective format as ours, and it splits 6.16M vs 44K.**
   - The hits (6.16M at 23.8× and 1.41M) name a **physical, visible clue in the title** ("Spot the Bite Mark", "Follow the Footprints"). The clue is shown on screen *before* "Can you spot it?" (61–66 % of runtime), so you can solve it by looking.
   - The misses either never let the viewer play (the UV clue is invisible until the tool reveals it) or make you **read** (mirror text).
   - Endings differ too. Both hits end "Next case tomorrow". Both misses end "watch my other cases and subscribe".
   - Confound: the hits are 23–26 days old and the misses 4–8 days. The 90× gap is far larger than age alone explains on a 26.5K-sub channel, but treat this as medium confidence.
   - Grade S. Source: auto-captions + storyboards at https://www.youtube.com/@JuniorDetectivesTV/shorts

4. **"Solve by LOOKING" beats "solve by READING or comparing tiny glyphs". This holds across 3 channels and our own data.** [S + OWN]
   - Hits:
     - our fountain, birthday and sandcastle: the scene itself is the puzzle;
     - our blood spatter: one big red wall;
     - Junior Detectives: bite gap, footprints;
     - Ludynx: sushi, shell game.
   - Misses:
     - our liar: three alibis printed as ~8 px text at phone size;
     - our fingerprint: whorl minutiae on ~90 px cards;
     - Junior Detectives: mirror writing;
     - Ludynx: "Find the 4" in a number grid, 11 views.
   - Our blood spatter, fingerprint and liar use the **identical** teach-then-test template: test at 44–48 %, answer at 60–69 %. Views still range 65.7K vs 795/860. So the template is not what killed them. What differs is the size and vividness of the thing you inspect, plus the "Dexter" hook. Ludynx word-search Shorts (18–20K) are a partial counterexample.

5. **A false solution and a double reveal is the hit signature for mysteries.** [S] It appears in Z2 ($200, then $100), Z4 ("Case closed", then "But then…") and J2 (Mia, then the raccoon). All 3 sit at 1.7–5× their channel median. None of the 4 single-reveal misses (Z5, J3, J4, ours ep17/18) has one.
   - Our blood spatter is the only one of our test videos with **additional visual reveals** after the answer (number of hits, the "someone stood here" gap). It is also our only breakout.
   - Our fingerprint "twins" twist and liar "54 %" tail are add-on *facts* after the answer, not a new reveal.

6. **Ending on an unresolved question works ONLY when it is a real paradox or a solvable whodunit. A bolt-on "comment your guess" does not.** [S]
   - Missing Dollar (30.8M) ends on its question.
   - GabeSweats (16.5M) never gives the answer and gets **178K comments (1.08 % of views, about 20× Zack D's 0.04–0.07 %)**.
   - Our pickpocket (1.37K) also ended on a question ("who's the lookout?"). It was a *new* question, introduced after the answer, about something nobody could see.
   - This qualifies niche-data.md's "0/21 end on a question" rule (see Contradictions).

7. **Comment rate does not separate hits within a channel.** [S] Zack D: Missing Dollar has a 0.055 % comment rate at 30.8M, Poisoned Ice 0.07 % at 4.1M. Ludynx: Sushi got 7 comments at 87K, while Shell Game got 238 comments at 29.6K. This extends niche-data finding 5 (like-rate does not predict reach) to comments.

8. **On a tiny channel, an unchanged template varies by 1,000×: 76 vs 87K views.** [S] Ludynx (2.4K median) posts pixel-identical "Can you find the odd X? 3 rounds" Shorts. Zombie got 76, Sushi 87K, both at ~1–2 weeks old. Our own spread (300 → 18K within the chain-reaction template) is the same phenomenon. **Volume per template is required before calling a format dead.** One flop of pickpocket, fingerprint or liar is not proof. Two flops in the same *type* (text/small-glyph tests, findings 4 and 6) is a stronger signal.

9. **"Who is lying?" riddles are a graveyard on YouTube Shorts; "find what starts the chain reaction" is almost uncontested.** [S]
   - The Shorts returned for "who is lying riddle #shorts" had **0–47 views each** (KnowledgeQuest 42/47, Baymax Explains 15, GooderDan 5, two at 0).
   - The query is owned by long-form compilations (7-Second Riddles 9.4M, Bright Side 1.9M).
   - I found **no** YouTube Shorts competitor doing "find what starts it" as a chain-reaction puzzle. The nearest is pure satisfying domino sims (@Dominoeffectsimulation: 103K median, 327M top) with no puzzle at all.
   - Our two consistent winners sit in the uncontested lane; our liar and pickpocket sit in crowded, low-value lanes.

10. **On YouTube Shorts, "can you spot the clue" detective puzzles are a KIDS format.** [S] The Shorts-filtered searches for "detective", "who did it", "can you solve it" and "spot the clue" returned mostly kids channels: J House jr. (506M), Adi Connection, Junior Detectives, Blippi, PBS Kids, Cocomelon.
   - Junior Detectives is "made for kids": comments off, and normal clients can't download it.
   - Our flat, cute 2D art plus "who stole it" framing likely gets classified into, and competes in, that pool.
   - The adult wins in this space come from photoreal 3D (Zack D) or stock footage with a narrator (GabeSweats), plus murder or money stakes.
   - This is a hypothesis about audience routing. Only our audience-age analytics can confirm it.

11. **Zack D's mysteries/puzzles median 8.6M (n=33 crime-ish titles) vs a 9.95M channel median.** [S] Crime is not a magic topic even for the niche leader. The *puzzle* titles ("Can You Solve…", "…Mystery") hold the channel's #2, #3, #7, #8 slots, but also its bottom tail (Greek Cross 3.1M, Ice Cube 4.1M). The topic opens the door; the question shape (finding 1) decides the result.

12. **Pup History (@whatiftheworldedition) is a one-archetype series with a share engine, not a format trick.** [S]
    - Profile: 125.7K followers, 3.2M likes. 13 of the 15 latest non-pinned posts land at 222K–750K, with one at 4.6M (Rosette).
    - Every post is the same thing: one **named real dog hero** (Balto, Rin Tin Tin, Bobbie, Gizmo), drawn as the same chibi cartoon dog. The real archival photo is inset ("Only photo I could find online").
    - A torn-newspaper caption strip at the top is split into a cliffhanger across beats ("TINY GIZMO CAME OUT… / …WITHOUT").
    - Both videos I checked run **65 s**.
    - Rosette's numbers: 892.6K likes (19 %), **73.8K shares (1.6 %)**, 98.9K saves (2.1 %). Sheila (222K): 1,615 shares (0.73 %).
    - Captions ask for *reposts*, not follows ("Please repost to spread her story"). The handle suggests a pivot from a what-if account to the dog series.
    - Our Wojtek story (1,124 views) had the hero but not the recurring character, the "save their story" share motive, or the real-photo inset.
    - URL: https://www.tiktok.com/@whatiftheworldedition

13. **VO pace and cuts don't separate hits here.** [S] Zack D hits run at 134–167 wpm and its misses at 155–196, with 0–2 hard cuts per video (`metrics.py`). Ludynx has no voice at all. Our wpm is 152–178, except ep 23 at **230**, which is above every measured hit. This is consistent with niche-data: novelty cadence, not cut rate.

## Contradictions

- **niche-data.md "0/21 hits end on a question".** That is true for comparison, what-if and story. For **puzzles** it is wrong: the two biggest videos measured here (30.8M, 16.5M) end on the unresolved question. The rule should be scoped by format (finding 6).
- **niche-data.md "late payoff ~86 %".** It matches Zack D's hits (90–98 %). Our test format pays off at 60–69 % and then runs a 15–25 s tail. Only blood spatter filled that tail with new visual reveals.
- **Owner feedback "puzzles must be HARD; one subtle key; decoys" (feedback_harder_puzzles.md).** This is only half supported. Hits are hard because of a **tempting wrong answer** whose key is *visible* (snow + weather app, bite gap). Videos that were hard because the key was **hidden or unknowable** flopped: ep 23, Zack D's Poisoned Ice, Junior Detectives' Glow Jelly. "Hard" should be redefined as "most people commit to the wrong answer", never "the clue wasn't on screen".
- **Common advice "always add a comment CTA".** The Junior Detectives misses end with "subscribe/watch more"; the hits end with "Next case tomorrow". The comment rate is not linked to reach (finding 7).

## Proposed rules (for interactive / mystery episodes)

| # | rule (checkable) | conf. | evidence |
|---|---|---|---|
| R1 | Before scripting, write down the **wrong answer ≥50 % of viewers will commit to**. If none exists, kill the idea. The video must state or show that wrong answer before the real one. | high | F1, F5 (Z2, Z4, J2 vs Z5, J3) |
| R2 | **Fair-clue test:** every fact needed for the answer is visible on screen *before* the reveal, at ≥80 px tall on a 1080×1920 frame. No hidden mechanisms (poison in ice, off-screen accomplices). | high | F1, F2, F3 |
| R3 | **Look, don't read:** the thing you inspect is a picture, motion or a big shape. No test that requires reading more than 4 words of on-screen text or comparing glyphs smaller than 15 % of frame width. | med-high | F4 (3 channels + ours) |
| R4 | **One big vivid object, not 600 tiny people.** At phone size, the decisive event must be ≥5 % of frame area (a cake, fountain or blood wall), not a gesture by a 30 px person. | med | ours 15 vs 12, F4 |
| R5 | Mysteries use a **double reveal**: a false solve at 60–75 %, then the real answer at ≥88 %, with ≤3 s after the final answer (a sting or loop to frame 0). No stats tail. | med | F5, niche-data payoff |
| R6 | End either on the answer or on the **original** paradox left open. Never open a *new* question at the end. | med | F6 (Z1, G1 vs ep12) |
| R7 | Ending line is a **series promise** ("Next case tomorrow", "Case #N"), not "subscribe/watch more". | low-med | F3 |
| R8 | Avoid the crowded lanes ("who is lying" riddles, tiny number grids). Stay in **chain reaction "find what starts it"**, plus forensic tests with one big visual artifact (spatter, footprints, bite marks). | med | F9, OWN hits |
| R9 | A new template gets **≥3 episodes** before it is judged. Judge by the median, not the first post. | high | F8 |
| R10 | Skip formats whose answer is a well-known riddle (missing dollar, poisoned ice…) *unless* the video adds a new twist. Search the key on YouTube first; if a top result already explains it, change the key. | med | F2, Z5 |
| R11 | Stories (Pup-History model): one named real hero, one recurring cartoon mascot, the real photo inset, a split cliffhanger caption strip, ~60–65 s, and a "share their story" caption ask. | med | F12 |
| R12 | VO ≤190 wpm (ep 23's 230 is out of range for every measured hit). | low-med | F13 |

## Applies to us

- **Fountain, birthday, sandcastle (9–18K) and blood spatter (65.7K) pass R2–R4.**
  - Chain reactions: the outcome is stated in line 1 ("this guy ends up in the fountain") and the whole scene is the puzzle. The decisive objects (banana peel, bike, cake) are big, and nobody can read the plaza "wrong" except by tracing the chain.
  - Blood spatter: one huge visual artifact, a pop-culture name in word 1, and two extra visual reveals in the tail (R5-like).
- **Pickpocket (1.37K)** fails R4: the dip is a tiny gesture among 600 people. It also fails R6: it ends on a new question about a lookout nobody could see.
- **Fingerprint (795)** fails R3: comparing whorls on small cards. Its "twins" ending is a fact tail, not a re-reveal.
- **Liar (860)** fails R3, since the alibis are text, and R8, since the lane is crowded. It ends on a 15 s stats tail.
- **Ep 23 whodunit (374, young)** fails R2 and R10: the poisoned-ice key is hidden, a well-known riddle and Zack D's weakest. It also breaks R12 (230 wpm). I predict it stays under 1K.
- **Not explained by these rules:**
  - why birthday or sandcastle got 9–12K and not fountain's 18K: likely F8 noise;
  - the 50× gap between blood spatter and the chain reactions, which may be "Dexter" search/browse demand (see another track) or audience routing (F10).

## Open questions (only our analytics can answer)

1. Retention curves of ep 14/15 vs ep 17/18: does the drop happen at the "learn the code" lecture (0–28 s) or at the test? If it happens in the lecture, shorten the teach section to ≤15 s.
2. Audience age and the traffic split for the flat-2D episodes: are we being routed to a kids or puzzle pool (F10)?
3. Rewatch / avg-watch-% above 100 % on the chain reactions: is the replay what makes them win?
4. Did the ep 12 comments actually answer "who's the lookout"? Count comments per view for ep 12 vs 15.
5. Re-check ep 23 at 7 days, and Zack D's Fingerprints/Ten Penny at 30 days, to confirm or drop the provisional misses.
