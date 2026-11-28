# 03 — Audio: voice, music, SFX, loudness, sound-off  (researcher #3, 2026-11-27)

Grades follow the BRIEF. **S-new** means I measured it today for this file.

## Measurement  [S-new + OWN]

**Method.** The script is `C:\Users\zhrui\AppData\Local\Temp\claude\22714a93dc83baa6\26a1c0bf-e045-489f-aacd-5dd204e6b768\scratchpad\audio_metrics.py`; raw rows are in `results.jsonl` in the same folder, which is temporary. It measures:
- **Loudness:** ffmpeg `loudnorm` (EBU R128) gives integrated LUFS and true peak.
- **Speech:** faster-whisper small word stamps give wpm (first word to last word), speech coverage and speech gaps over 0.5 s.
- **Bed in gaps:** the median level of non-speech 50 ms frames, measured against the median voice frame. In other words, how loud music and SFX sit when nobody talks.
- **SFX/10 s:** non-speech transients at least 10 dB above the previous 400 ms and no more than 20 dB below the voice. This is crude: it misses SFX under speech and counts kick drums.

For our own episodes I also ran two checks on the stems:
- the exact `scripts/mixcheck.py`;
- an autocorrelation pitch tracker.

**Sample.** Seven references downloaded via yt-dlp (three more failed with 403 or "unavailable"). Big *animated puzzle* Shorts barely exist in YouTube search, so the puzzle peers are small channels and the big hits are explainers.

| video | views | dur s | LUFS | TP dBTP | wpm | speech % of runtime | gaps >0.5 s (longest) | bed in gaps dB re voice | SFX/10 s |
|---|---|---|---|---|---|---|---|---|---|
| Zack D. Films: Mouth breathing | 15.6M | 32 | **−9.1** | +0.7 | 182 | **89** | 0 | −9.1 | 0 |
| Zack D.: Elephant walked up to a vet | 14.6M | 32 | −10.9 | +1.2 | 175 | 89 | 1 (0.6) | −10.8 | 0 |
| Zack D.: Crows can count | 9.5M | 35 | −13.4 | +0.1 | 173 | 89 | 0 | −7.8 | 0 |
| Infographics Show: What happens when shot | 3.0M | 29 | −13.8 | −0.6 | 166 | 85 | 1 (0.5) | −12.7 | 0.4 |
| 7-Second Riddles: Can you solve this riddle (VO) | 52K | 59 | −17.6 | −1.4 | 166 | 69 | 6 (**7.6** think-time) | −12.8 | 0.2 |
| 7-Second Riddles: Who's the woman (music + text) | 43K | 15 | −11.3 | +1.0 | – | 0 | – | −0.3 | 2.0 |
| 7-Second Riddles: Who is the kidnapper (music + text) | 27K | 15 | −11.4 | +1.1 | – | 0 | – | −6.8 | 6.0* |
| **OWN 14 Blood Spatter** | **65.7K** | 59 | −14.0 | −1.7 | 144 | 63 | 16 (6.6) | **−2.0** | 1.5 |
| **OWN 15 Fountain** | **18K** | 48 | −14.5 | −0.1 | 107 | 44 | 10 (14.9) | −2.0 | 1.9 |
| **OWN 16 Birthday Cake** | **11.7K** | 50 | −14.2 | 0.0 | 109 | 43 | 10 (14.9) | −1.3 | 2.4 |
| **OWN 19 Sandcastle** | **9.5K** | 55 | −14.3 | +0.8 | 111 | 48 | 15 (15.0) | −0.9 | 1.3 |
| OWN 12 Observation | 1.4K | 46 | −13.9 | −0.8 | 110 | 43 | 10 (15.1) | −2.3 | 2.6 |
| OWN 10 Wojtek | 1.1K | 56 | −14.3 | −2.4 | 173 | 80 | 10 (1.0) | −3.6 | 1.1 |
| OWN 18 Liar | 860 | 59 | −13.7 | **+1.8** | 115 | 53 | 15 (10.3) | −1.9 | 1.9 |
| OWN 17 Fingerprint | 795 | 50 | −14.0 | −1.5 | 136 | 56 | 14 (6.4) | −2.5 | 1.0 |
| OWN 01 Speed Trap (no VO) | 593 | 29 | −15.8 | +0.4 | – | 0 | – | −12.7 | 3.7 |
| OWN 20 GTA 6 | 506 | 72 | −14.3 | **+2.3** | 109 | 61 | 17 (10.3) | −1.2 | 0.7 |
| OWN 22 Turkey (Gemini voice) | 303 | 49 | −13.7 | −1.0 | 190 | 75 | 5 (0.8) | −3.6 | 0 |
| OWN 23 Poison (Gemini, too young) | 374 | 49 | −14.0 | −0.9 | 153** | 55 | 2 (14.3) | −2.3 | 0 |

\* This one is a kick-drum bed, so the detector counted beats.
\*\* The whisper span includes the 14 s search window. The line-level rate from `poison.timing.json` is 230 wpm.

Stem checks (OWN, `mixcheck.py` at the coded `volume={0.55}`), across 9 episodes from Blood Spatter to Wojtek:
- Music under the voice sits at −4.1 to −5.4 dB broadband, and −9.8 to −11.4 dB in the 300–4k voice band.
- Music in the gaps sits at −1.6 to +0.5 dB against the voice.
- These numbers are **identical in hits and flops.**

Pitch tracker (OWN): Andrew's pitch spread is 4.4–5.1 semitones SD on hits and flops alike. Laomedeia sits at 4.4–5.8 semitones.

Spearman correlation against views across 11 of our episodes:
- loudness ρ −0.21, true peak −0.24, speech % −0.22, bed-in-gaps +0.37, SFX density +0.41, wpm −0.36: **none significant.**
- Total VO-free time ρ +0.56 (p = 0.07). It is confounded: the puzzle formats that hit all have a 15 s silent search window.

## 1. Findings

1. **Audio does not explain our hit/flop spread.** [OWN + S-new]
   - Our four hits (9.5K–65.7K) and our puzzle flops (795–1.4K) share the same voice (Andrew +0%), the same pitch range, the same mix (music −5 dB under VO, about 0 dB in gaps), the same −14 LUFS, and the same 15 s VO-free search window with ticking.
   - A 20–80× view gap with a constant audio recipe means the cause is elsewhere: topic, hook or format (other tracks).
   - Audio rules below are about raising the floor, not explaining the hits.

2. **Speech rate: comprehension holds to about 1.5× normal speech and then degrades.** [B]
   - UCLA (Murphy et al., Applied Cognitive Psychology 2022): lecture video at 1×/1.5×/2× scored 26/25/25 of 40, but 22 at 2.5×. One week later: 24 vs 21 vs 20. https://newsroom.ucla.edu/releases/learning-while-speed-watching-class-videos
   - Meta-analysis (Sage, Journal of Educational Computing Research 2021, k = 18 comparisons): g −0.21 at 1.4–1.5×; g −0.36 (not significant) at 1.8–2×. https://journals.sagepub.com/doi/10.1177/07356331211043535
   - Meta-analysis (Frontiers in Psychology 2025, 12 studies): acceleration raised cognitive load (g +0.59) and lowered retention (g −0.41) and transfer (g −0.50). No breakdown by speed. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1427609/full
   - Baseline narration runs about 150 wpm, so harm starts somewhere around 200–230 wpm sustained.
   - Big explainer hits measured today run 166–182 wpm. [S-new]
   - Our Andrew episodes run 152–178 wpm line-level. **The Gemini/Laomedeia era runs 193 (Turkey), 230 (Poison) and 250 (tod-3d) wpm line-level** [OWN, timing.json]. These are the fastest we've shipped, and they clash with the owner's own "an 8-year-old can follow" script rule.

3. **Story Shorts are the exception on pace.** [S] niche-data story hits run 149–238 wpm, with 232 and 238 among the 6 hits. "Faster flopped" holds only in the what-if set (208 and 239 weak vs 158–200 hits). A comic deadpan read survives speed; a teach/test read probably doesn't (finding 2).

4. **Pitch: a moderate amount of variation beats both flat and highly varied.** [B]
   - Rodero (Frontiers in Communication 2022, n = 120): medium pitch variation was rated most effective. https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2022.869084/pdf
   - McGill (Pell lab): "engaging" speakers were louder and higher, with more loudness dynamics. Listeners' willingness to keep listening tracked topic interest most. https://www.mcgill.ca/newsroom/node/330380
   - Our prosody is constant across hits and flops (finding 1), so it is not our lever.

5. **AI voice penalty: real but small, about 5–7% on engagement.** [B-weak]
   - Luo, Zheng, Yin, Teo (ICIS 2023): panel of 21,541 TikTok videos from 3,647 creators with fixed effects. AI-generated voice was associated with −5.4% likes, −5.2% comments and −7.4% shares, strongest in the "rising action" stage. The authors call it preliminary, and the abstract does not say how AI voice was detected. https://aisel.aisnet.org/icis2023/user_behav/user_behav/24
   - A 5–7% penalty cannot produce a 20–80× spread. All our hits used TTS.

6. **Many listeners can't tell AI voices from human; stock TTS is easier to spot than clones.** [B]
   - QMUL (Lavan et al., PLOS One 2025, 80 voices): 58% of voice clones were judged human, vs 62% of real voices (no difference). Only 41% of fully synthetic TTS voices were judged human. Both kinds of AI voice were rated more dominant, and some more trustworthy. https://www.qmul.ac.uk/news/latest-news/2025/science-and-engineering/se/ai-generated-voices-now-indistinguishable-from-real-human-voices.html
   - WPP Media / MediaScience (lab, n = 55; C/B-weak): listeners identified generic AI voices only 42–47% of the time, and 18–30-year-olds spotted them better. AI ads matched human ads on brand engagement and purchase intent, but ads were rated higher when *believed* human. https://www.wppmedia.com/thought-leadership/research-business-intelligence/ai-voices-audio-ads-research
   - Studio Resonate (n ≈ 1,300; C): human voices scored +24% on implicit brand attraction. Trust dropped when listeners were told to expect AI. https://www.contentgrip.com/studio-resonate-ai-voice-study/
   - Vocal Image (n > 10K, AI voices only; C): Microsoft, Google and Amazon TTS "lagged significantly" behind the best model (MiniMax). Andrew is Microsoft. https://www.techradar.com/pro/people-dont-trust-bad-ai-voices-listeners-rated-a-chinese-startups-synthetic-voices-higher-for-trust-and-realism-than-those-from-microsoft-google-and-amazon
   - Implication: the penalty comes from *detected* synthetic voice. Young viewers detect it best, and our audience is young.

7. **Narration vs music-only: sources conflict.**
   - Emplifi (brand Facebook Reels; vendor, C): speech in the first 3 s vs music-only gave +11.7% 3-s retention and +24.7% 10-s retention, but −10.6% replays and −3.3% reach. https://emplifi.io/resources/facebook-reels-data/
   - VidMob analysis on TikTok's blog (C; I could not load the primary page): music-only ads had +51% 6-s view rate vs voiceover ads.
   - TikTok Creative Center (A-marketing): voiceover is the "strongest alternative to music" for recall.
   - Our data: music-only Speed Trap (593) and the music+text riddle Shorts (27–43K) underperform VO explainers [OWN/S]. For a *teach-then-test* format, VO is the teaching channel. Keep it.

8. **Background music under narration: small effects that can go either way. Tempo helps persuasion, not memory.** [B]
   - Kämpfe et al. 2011 meta-analysis: about null overall (OLD). https://Www.Gwern.net/doc/music/music-distraction/2011-kampfe.pdf
   - Psychology of Music 2023 meta-analysis: d +0.31 overall, but music hurts with highly complex material. https://journals.sagepub.com/doi/full/10.1177/03057356231153070
   - JCMC 2024 (n = 873, TikTok-style videos): 120–160 bpm beat 60–90 bpm at reducing misbelief for *expert explainer* videos (b −0.28). There was **no difference in recognition memory**. https://academic.oup.com/jcmc/article/29/5/zmae007/7729237

9. **Our music sits far louder against the voice than broadcast guidance or the hits.** [B + S-new + OWN]
   - Torcoli et al. (JAES 2019, AES best paper; OLD but the standard): commentary should sit **≥ 10 LU above music** and ≥ 15 LU above ambience. Non-experts wanted about 4 LU *more* separation than engineers. https://salford-repository.worktribe.com/output/1360952
   - Ours: about 5 dB broadband under the voice, and music in the gaps at about 0 dB against the voice. Zack D. / Infographics Show beds sit 8–13 dB under the voice even in gaps.
   - The newer flow_music rule (8–9 dB under) is closer, but Turkey/Poison still measure −2 to −4 dB in gaps.

10. **The hits leave no VO gaps; our puzzles leave about 22 s of VO-free time.** [S-new]
    - Zack D. has VO over 89% of runtime with 0–1 gaps over 0.5 s.
    - Our chain puzzles have VO over 43–48% of runtime with a 15 s silent search.
    - The only peer puzzle with VO (7-Second Riddles, 59 s) uses a 7.6 s think-gap and has 52K views.
    - Within our data, the silent window does *not* hurt: hits have it (finding 1). It is a format feature, not a defect. Its length (15 s, about 30% of runtime) is untested.

11. **Loudness: YouTube turns loud uploads down to about −14 LUFS and never turns quiet ones up. TikTok has no published target.**
    - YouTube [C, measured by engineers; YouTube itself publishes no number]: https://productionadvice.co.uk/stats-for-nerds/ . The 2019 move to LUFS: https://www.meterplugs.com/blog/2019/09/18/youtube-changes-loudness-reference-to-14-lufs.html
    - Whether Shorts get the same treatment is unverified.
    - TikTok / Instagram [A-gap]: vendor claims range from −9 to −16 LUFS, and some say "no normalisation". https://www.forasoft.com/learn/audio-for-video/articles-audio/lufs-targets-per-platform-2026
    - On YouTube, our −14 LUFS is already at reference, so going louder gains nothing. **If TikTok does not normalise, Zack D. at −9 plays 5 dB louder than us in the same feed.** That is unknown and testable.

12. **True peak: several of our masters clip.** [S-new / OWN]
    - Measured: GTA 6 +2.3, Liar +1.8, ep13 +1.45, Sandcastle +0.8, Speed Trap +0.4 dBTP.
    - AAC/Opus transcodes turn peaks over 0 into audible distortion. The −1 dBTP ceiling is EBU/streaming practice [C consensus].

13. **Sound-on share: TikTok's own numbers say mostly sound-on; there is no independent 2024–26 figure for any platform.**
    - TikTok Creative Center: "93% enjoy the platform with sound on". Nielsen (2020, TikTok-commissioned): 88% say sound is vital. Kantar (2021): 73% would "stop and look" at sound-on ads. [A-marketing, OLD, self-report] https://ads.tiktok.com/business/en-US/blog/evolution-of-sound-volume-1
    - Verizon/Publicis 2019: 69% watch sound-off in public (general video, OLD) [B-weak; already in evidence.md].
    - Meta "85% of Reels sound-on": no primary source; untraceable [lore].
    - YouTube's "95% of ads audible" means volume ≥ 10% at any moment, from 2016 data [A, OLD, irrelevant definition]. https://thinkwithgoogle.com/data/youtube-ads-audible
    - Working assumption: roughly 7–30% of viewers can't hear us at a given moment.

14. **SFX (whooshes, risers, stingers, dings): there is no retention evidence at all.** [lore]
    - Every claim found was a creator or vendor blog, and one cited an unverifiable journal. https://fish.audio/blog/using-sound-effects-for-short-form-content
    - The 15M-view Zack D. hits have **near-zero** detectable SFX transients in gaps. Ours have 1–2.6 per 10 s, and our densest SFX episode (Observation, 2.6) is a flop.

15. **Original vs trending audio.** [A + OWN-other-account] TikTok lists "sounds" as video information it uses. https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you (2020) On the owner's other account, the Sound lane is 0.1% of traffic. Nothing supports switching to trending audio for a VO explainer.

## 2. Contradictions

- **niche-data "what-if: faster VO flopped"** should not become a universal pace cap. Story hits ran up to 238 wpm (niche-data itself). The learning research says the cost is comprehension and load, which matters most for *teach-then-test* (Blood Spatter), not for a joke story.
- **mixcheck.py's docstring says "music in the gaps within ~4 dB of the voice (it carries the energy)."** No source supports this. Torcoli says ≥ 10 LU, and the big explainer hits sit 8–13 dB down. Our hits *survived* the hot gap music, so it is not fatal. But it is a self-invented norm, not evidence.
- **hype.py and the "MUSIC MUST BE LOUD+HYPE" memory.** On YouTube, loudness above −14 is normalised away. "Hype" can only come from tempo, energy and arrangement, not level. The JCMC tempo study supports up-tempo beds for persuasion but shows no memory gain.
- **evidence.md §5** says captions are "sensible". I'd strengthen it: every puzzle-critical clue must be *visual*, because 7–30% of viewers can't hear it (finding 13).
- **Common advice "use SFX on every cut / whoosh transitions".** It is lore (finding 14), and the biggest explainer channel measured doesn't do it.

## 3. Proposed rules (checkable)

| # | rule | test | conf. | evidence |
|---|---|---|---|---|
| A1 | Teaching/test narration ≤ 200 wpm line-level. Story ≤ 230. | `timing.json`: words / Σ line duration × 60 | med | 2, 3, 8 |
| A2 | First spoken word ≤ 0.3 s. | timing / whisper | high (we already pass) | niche-data 13/13, Emplifi (C) |
| A3 | Music under VO ≤ −10 dB in the voice band **and** ≤ −8 dB broadband. Music in gaps ≤ −6 dB against the voice, except during the deliberate search window. | `mixcheck.py` | med | 9 |
| A4 | Master at −14 LUFS ±1 integrated and **≤ −1.0 dBTP** true peak. | `ffmpeg loudnorm print_format=json` | high (TP) / med (LUFS) | 11, 12 |
| A5 | No puzzle clue may be audio-only. Every key and every decoy must also be readable on screen or in captions. A sound may *reinforce* a clue or *misdirect*, never *decide* it. | per-clue checklist in the brief | high | 13 |
| A6 | SFX ≤ 1 hit per beat that matters (reveal, wrong answer, timer's last 3 s). No whoosh on every cut. Target ≤ 1.5 per 10 s outside the search window. | `audio_metrics` SFX/10 s, or a source count | low | 14 (no evidence either way; the default is restraint like the hits) |
| A7 | Original or generated music only. No trending sounds. | — | high | 15 |
| A8 | Voice: keep one consistent narrator per series. Do not switch voices mid-series to chase "energy" until an A/B exists. Prefer the voice with the lowest detected-AI tell; the 18–30 audience detects stock TTS best. | the A/B in Open questions | low | 5, 6 |
| A9 | Up-tempo bed (≥ 120 bpm) for explainers, but sitting low (A3). | bpm of the generated bed | low | 8 |
| A10 | Search window: VO-free time ≤ 15 s, and the ticking clock must be audible *and* shown as an on-screen countdown. | plan.json | med | 10, 13 |

## 4. Applies-to-us

- **A1** explains nothing among the Andrew-era hits and flops; all sit at 152–178. It *does* flag the newest Laomedeia episodes (Turkey 193, Poison 230, tod-3d 250), which are all low performers so far. That is confounded with the 3D switch, the story format and age, so it is not proof.
- **A3 / A4 / A6** don't separate hits from flops: hits and flops share the same mix. These are floor-raising hygiene rules. Expect small gains at most.
- **A4's TP clause** catches Liar (+1.8) and GTA 6 (+2.3), both flops, but also Sandcastle (+0.8), a hit. So clipping didn't sink a strong video.
- **A5** is preventive. Sound-off viewers can't solve an audio-dependent clue, and the "spot the liar" format leans on voice-based tells. The Liar flop is consistent with this but doesn't prove it.
- **The real lesson of this track:** audio is a solved, constant layer for us. Spend the iteration budget on topic, hook and format (other tracks).

## 5. Open questions (only our analytics can settle)

1. **Does TikTok normalise?** Download our own post via the logged-in phone (owner) and measure its LUFS against the −14 we uploaded. If it plays back un-normalised, test a −11 LUFS master.
2. **Andrew vs Laomedeia vs a human read.** Same script, split across two posts at the same hour, comparing completion %. The ICIS penalty (5–7%) predicts a small difference, and the QMUL work predicts stock TTS is the most detectable.
3. **The retention curve over the 15 s search window.** Does it dip at the silence onset (around 30–45% runtime)? If so, shorten it to 8 s (the 7-Second Riddles peer uses 7.6 s) or keep VO teasing through it.
4. **TikTok Creator Center "sound-on" or muted-viewer stats.** Not exposed publicly. If /tiktok can see a sound-off proxy, record it in the ledger.
5. A **music-in-gaps −1 dB vs −8 dB** A/B on two chain-reaction episodes, to settle the mixcheck "energy" norm.
