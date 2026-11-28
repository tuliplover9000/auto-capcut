# xcheck-03: audio researcher's cross-check (2026-11-28)

## 1. Verdicts on others' claims

**Speech-rate claims (my field)**

- **The same Fountain narration measures 173, 218 or 257 wpm, depending on how you count.**
  - I recomputed all of them from `episodes/*.timing.json`.
  - On a **file basis** (words ÷ Σ line-file duration), Blood is 170, Fountain 173, Cake 171, Sand 169, Fingerprint 169, Liar 152, GTA 138, Turkey 193, Poison 230, tod-3d 250.
  - On a **first-to-last-word basis** the same episodes read 191 / 218 / 220 / 211 / 200 / 179 / 148 / 214 / **256** / 278.
  - The **word-only basis** gives 239–327.
  - 02, 06, niche-data and I used the file basis. 07, and the benchmark memo's "3.7 w/s", used the first-to-last-word basis.
- **07 F11 ("hits run 191–220 wpm; #23 256"): CONFIRMED arithmetically.** It uses the first-to-last-word basis, about 1.25× the file basis. So 07 R9's "≤ 220 wpm" means roughly 175 on the file basis, which is *not* a looser limit than 02's or mine.
- **06 F13 / R12 ("#23's 230 is above every measured hit"): CONFIRMED** on the file basis. The explainer hits I measured with whisper run 166–182.
- **02 F11 ("comprehension holds to ~275–280 wpm"): WEAKENED.**
  - The 275 wpm onset comes from 1969 time-compressed-speech work. Secondary snippets confirm the figure (https://apps.dtic.mil/sti/pdfs/AD0701150.pdf).
  - But video-learning meta-analyses show losses well before that: g −0.21 at 1.4–1.5× (Sage 2021), and retention g −0.41 for accelerated playback (Frontiers 2025).
  - 02's own conclusion that "170–200 is not too fast" is **CONFIRMED**.
- **02's "our two slowest (138, 153) both flopped": CONFIRMED** at 138 and 152, **but confounded.** Both are teach-then-test videos, and Fingerprint flopped at 169. This does not support R9's "never below 155".

**SFX and sound claims**

- **02 F13 ("chain windows carry 10–16 scripted links with SFX dings, about every 1.2 s"): WEAKENED in detail, substance holds.**
  - `src/chain/Karma.tsx` schedules about 13 *diegetic* SFX inside the 15 s window (whoosh, pop, crack, clank, bell, punch), plus 15 ticks.
  - The **dings play in the replay** (`LINKS.map → T(k)`), not in the window.
  - So "a sounding event about every 1.2 s" is true.
  - **Self-correction:** my mix detector found only 4 of these events. The SFX/10 s figures in 03-audio.md are lower bounds, and my "Observation is our densest SFX" remark is unreliable.
- **04 F6 ("TikTok/Kantar 2021: 88% say sound is essential, so viewers mostly have sound ON"): WEAKENED.**
  - TikTok's *Evolution of Sound* page credits the 88% to **Nielsen 2020**, and it is an attitude, not a sound-on share.
  - The nearest A figure is "93% enjoy the platform with sound on" (TikTok's self-report).
  - The rule 04 draws (keyword captions, not a second script) still stands.
- **05 F2 ("TikTok Search reads voiceover and on-screen text"): UNVERIFIABLE by me.** WebFetch got an empty shell. Two SEO guides quote the same list from TikTok's page, so it is probably right.
  - My own audio check: whisper recovered 138 words from Blood's final mix against 137 scripted, with music only about 5 dB under the voice.
  - So our hot mix does **not** block speech-to-text, and search is no reason to remix.

**Puzzle and source claims**

- **07 #16 caption "don't trust your ears", and 04 F9 ("decoys make noise"): CONFIRMED.**
  - Sound decoys have not been fatal: Cake used them and got 11.7K.
  - That fits my rule A5: a sound may misdirect, but it must never be the only path to the answer.
- **07 F12 ("the slump started before 3D and Gemini"): CONFIRMED on the audio side.** #20 has Andrew's voice at 138 wpm and the same mix as the hits.
- **01 F1 (Creative Codes: hook = 6 s, 90% of recall): UNVERIFIABLE.** I fetched the PDF and it is image-only, with no extractable text.

## 2. Rulings C1–C10

**C1. The test window.** *Reconciled rule:*
- The novelty cadence (1.5–3 s) applies **outside** the window.
- **Inside** the window, a locked shot with no narration is allowed, provided all of the following hold:
  - it lasts ≤ 15 s (all 3 chain hits ran 14.3–15.4 s; nothing longer has been tested);
  - a countdown is both visible and audible, ticking every 1 s;
  - for an action test, a scripted event with **visible motion plus a sound** happens every ≤ 1.5 s (Fountain has about 13 in 15 s);
  - for a still-image test, the window is ≤ 6 s (Blood).
- No captions or moving text during the window (04 V9).
- Confidence: med.

**C2. The frame-0 card.**
- **Challenge formats only:** the full scene, the task card and the timer are on screen at 0.0 s.
- It is part of the format, not the cause of a hit: it appears in 4/4 hits but also in 7/11 flops (07).
- Passive formats follow niche-data: no headline card.
- Confidence: low–med.

**C3. Title, description and first line.**
- **Title:** [event/stakes] + "Can you…?" (01 H6).
- **Description:** the typed phrase opens its first words.
- **First spoken line:** carries the typed noun when it fits naturally ("Dexter", "blood spatter"). If 05 F2 holds, VO is a free search slot.
- **On-screen:** the typed phrase appears once.
- Demand does not predict our FYP views (07, ρ +0.16), so never let the typed phrase displace the event hook.
- Confidence: low–med. A/B it on YouTube.

**C4. The ending.**
- Resolve the core question on screen, then end on a ≤ 3 s statement kicker. A one-line real fact is allowed, which reconciles 06 R5 with 05 R3.
- An *original* paradox may be left open (06).
- Never open a new question, and never end on a CTA question (02 R12, 05 R2).
- Confidence: med.

**C5. Clue size.**
- The decisive clue is **≥ 80 px on its short axis** at 1080 × 1920, or it is a motion event of ≥ 200 px.
- 40 px is only the floor for labels.
- Confidence: med (07: 4/4 vs 0/5; 06 agrees).

**C6. What "hard" means.**
- At least half of viewers commit to a scripted wrong answer.
- The key is ≥ 80 px, on screen before the reveal, and hidden only by position, timing or a decoy.
- **Pre-test:** 20–60% of 5 cold testers solve it.
- A sound can be a decoy, but never the key (A5).
- Confidence: med.

**C7. Voice speed.**
- **Measure only one way:** `Σwords / Σ line.duration × 60` from `timing.json` (the file basis).
- **Limit:** ≤ 200 wpm for every format, with a target of 165–185. Hits sit at 169–173 on this basis.
- 07's ≤ 220 (first-to-last-word basis) converts to about 175 here, so all three proposals agree.
- Gemini Poison (230) and tod-3d (250) fail. Turkey (193) passes, barely.
- Confidence: med.

**C8. Brightness.** A **default, not a rule.**
- It is confounded with the navy-template format.
- The reference hits include luma 0.28 (16.5M).
- Use ≥ 0.45 as the default, and gate on legibility (C5) instead.

**C9. Causes of the slump, ranked:**
1. A key that can't be seen, or a test that requires reading (#20 text plus arithmetic; #23 a 10 px vial plus poison in the ice). This is the only cause with a clean OWN contrast (0/5 interactive flops).
2. The posts are too young: #22 and #23 were under 1 day old when read, #20 about 2 days.
3. Passive format (#22). Passive videos are 0/6 on this channel.
4. #23 alone: no frame-0 card and safe-zone violations.
5. Gemini speed (#23 at 230). A plausible comprehension cost, but no OWN contrast.
6. The 3D look: no evidence either way.
7. **Hot music: ruled out.** The mix measures identical in the hits (03-audio).

**C10. The three A/B tests that settle the most:**
1. Remake #17 Fingerprint with a ≥ 80 px visual key, a playable frame 0 and an event line. This tests legibility against format.
2. Remake #15's structure in 3D, once with Andrew at about 170 and once with Gemini held to ≤ 185. This tests look and voice together.
3. A 15 s vs 8 s search window on two chain episodes. This tests C1.

A free check needing no A/B: measure the LUFS of our own TikTok post as played back, to learn whether TikTok normalises loudness.

## 3. Other conflicts

- **The wpm basis has to be written into the rule book.** Without one definition, R9 (02), R9 (07), R12 (06) and A1 (03) look like they disagree, but they don't. The benchmark memo's "2.7 vs 3.7 w/s" compares different bases and should not drive a speed-up.
- **02 R10 (narration ≤ 60% of runtime) applies to test formats only.** Zack D. explainers run VO over 89% of runtime (my measurement), and Blood is at 63%. Scope R10 to formats with a search window.
- **06 R5 ("no stats tail") vs 05 R3 ("end with a reusable fact") vs Blood's 1-in-9 kicker.** Resolved in C4: one line, ≤ 3 s.
- **04 V9 (silent find window) vs 02 R2 (an event every 1.5 s).** Compatible: inside the window, the cadence comes from sound and motion, not text.
- **Mix norms.** mixcheck's "music within 4 dB of the voice in the gaps" and the "LOUD+HYPE" memory conflict with my A3 (≤ −6 dB in gaps) and with broadcast guidance. Because the mix is not a cause (C9), A3 is a low-priority hygiene rule. Do not re-mix old posts.
