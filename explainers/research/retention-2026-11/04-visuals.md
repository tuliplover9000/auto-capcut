# 04 · Visuals: text, captions, motion, colour, phone legibility, cover

Researcher #4 · 2026-11-27 · grades per BRIEF (OWN / A / B / S / C / lore)

**Method.**
- I downloaded 12 reference Shorts with yt-dlp:
  - 7 puzzle Shorts: 7-Second Riddles ×3, "find 8 ducks", "find GOJO", "find the mistake", and GabeSweats murder mysteries ×3 (11.5M / 16.5M / 1.4M).
  - 3 viral explainers: Zack D. Films 32.9M, Oddly Bouncy 55.8M, Infographics Show 0.5M.
  - Zack D.'s 13.7M "Hermit's Well" murder mystery returned a 403 and could not be downloaded.
- I also measured 15 of our episodes.
- Every 2 s I sampled a frame and computed:
  - mean luma (Rec.709 weights on sRGB, 0–1)
  - HSV saturation
  - Hasler–Süsstrunk colourfulness
  - RMS contrast
- I measured caption bands and key-object sizes on full-res frames.
- I overlaid TikTok's safe zone and read every contact sheet myself.
- Scripts and outputs are in the scratchpad (`r4scripts/look.py`, `r4/look/*.json|_sheet.jpg`).
- ⚠️ **Tooling caveat for the other researchers:** `metrics.py` reports 1–2 "shots" for GabeSweats, which actually shows a new stock clip every ~2 s.
  - The cause is that GabeSweats uses dissolves, and the scene>0.30 detector misses dissolves at 60 fps.
  - So `cuts_per_10s ≈ 0` does NOT mean static. Read the contact sheet before you quote a cut count.

---

## 1. Findings

**F1. The TikTok safe zone now has measured official numbers.** [A template, measured by C]
- ManyPixels downloaded TikTok's own "In-Feed Standard LTR" template on 2026-11-11 and scaled it to 1080×1920. Keep clear of:
  - the top 240 px (For You / Following tabs)
  - the bottom 660 px (name, caption, music line)
  - 120 px on each side
  - a right column 180 px wide that starts at y = 840 (the buttons)
- That leaves only ~38% of the frame fully safe.
- With an anchor bar plus a 4-line caption, the bottom zone grows to 1,014 px. That is relevant because our captions run 3–5 lines.
- Sources:
  - https://www.manypixels.co/blog/social-media-design/tiktok-ad-specs
  - TikTok's spec page (zip templates, no numbers printed): https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads
- This confirms the conservative box in evidence.md §9 (x 120–940, y 240–1260) with a real source.

**F2. YouTube Shorts has no official overlay numbers for organic videos.** [A-gap, C]
- Google publishes a "Universal Safe Zones for Video on YouTube" PDF (https://services.google.com/fh/files/misc/universalsafezones-youtube.pdf). The 9:16 diagram is image-only, so I could not read numbers from it.
- Third-party checkers disagree: bottom 461–672 px, right 173–192 px (kapwing, socialync, flixier).
- TikTok's zone is the binding one; design to it.

**F3. Our newest episodes put the key action under TikTok's UI.** [OWN, measured]
- #23 (poison, 374 views):
  - The "13 WHO DID IT?" timer pill sits at y ≈ 135–275, inside the top-240 tab band.
  - The ground floor, where the drink is actually poisoned and where the yellow arrow points, sits at y ≈ 1230–1450, inside the bottom-660 caption zone.
- #20 (GTA, 506 views): the rap sheets and "? PTS" run to y ≈ 1330.
- The hits stay clear of both bands:
  - #15 puts its header card at y ≥ 237, captions at y 503–611, and the fountain (the puzzle's start) at y ≈ 900.
  - #14 keeps its spatter pattern at y 600–1500.

**F4. Our hits use larger captions in the upper third; our 3D flops halved the size.** [OWN measured; S]

Caption cap height, measured as the bright text band:

| Video | Views | Caption height | y position |
|---|---|---|---|
| #15 | 18K | 108 px | y 503–611 |
| #16 | 11.7K | 109 px | — |
| #19 | 9.5K | 98 px | — |
| #14 | 65.7K | 87 px | — |
| #18 | 860 | 80 px | — |
| #22 | 303 | 49–74 px | y 340–430 |
| #23 | 374 | 49 px | y 340–430 |

- Across the hits, captions sit at 26–32% of frame height.
- References:
  - GabeSweats: ~105 px, one word, at ~48% (centre).
  - Zack D.: ~60 px, 2–3 words, at ~78%.
  - 7-Second Riddles: a fixed ~90 px question header at the top.
- Size ≥ ~60 px is common to all of them. Position is not.

**F5. One-word-at-a-time captions are used by the biggest puzzle hits, but they carry a comprehension cost.** [S + B]
- What the hits do: all three GabeSweats mysteries show ONE word at a time (11.5M, 16.5M, 1.4M); Zack D. shows 2–3 words; our hits show 1–2.
- What the reading research says (RSVP studies, single words flashed at fixation):
  - Readers who cannot glance back to re-read understand less (Schotter, Tran & Rayner 2014, *Psych Sci*; https://pmc.ncbi.nlm.nih.gov/articles/PMC4835101 and coverage at https://languagelog.ldc.upenn.edu/nll/?p=12234).
  - Literal comprehension was lower with Spritz-style single-word reading (Boo & Conklin 2015, via secondary summary).
- So word-by-word captions work as a rhythm cue next to the voice, not as the channel that carries the clue.
- Any clue the viewer must read needs a full phrase that stays on screen. Older lab work: B, 2014–2015.

**F6. The redundancy evidence supports short keyword captions, not full transcripts.** [B]
- Mayer's redundancy principle: adding on-screen captions to narrated graphics hurt learning, but only a little (median d ≈ 0.10).
- Adesope & Nesbit 2012 meta-analysis (*J Educ Psych* 104:250): spoken + written did no worse than spoken alone overall, and condensed key-word text helped.
- Yue, Bjork & Bjork 2013: verbatim text impaired learning, while slightly reworded text helped. https://sites.lifesci.ucla.edu/psych-bjorklab/wp-content/uploads/sites/13/2016/07/YueBjorkBjork2013_redundancy.pdf
- On the other side:
  - Gernsbacher 2015 cites 100+ studies in which captions improve comprehension, attention and memory. This is contested for native-language viewers without hearing loss. https://successforkidswithhearingloss.com/wp-content/uploads/2020/04/Video-Captions-Benefit-Everyone_2015.pdf
  - 80% of UK 18–24s use subtitles some or all of the time (Stagetext/Sapio 2021, self-report). https://www.stagetext.org/news/yougov-survey-supports-stagetexts-findings/
  - TikTok/Kantar 2021: 88% of users say sound is essential to TikTok. [A, commissioned] https://ads.tiktok.com/business/en-US/blog/kantar-report-how-brands-are-making-noise-and-driving-impact-with-sound-on-tiktok
- Net: TikTok viewers mostly have sound ON, so captions should be key words, not a second script.

**F7. #20 asked viewers to read far faster than any subtitling standard allows.** [industry standard B, OWN]
- Industry limits:
  - BBC subtitles run at 160–180 wpm (0.33–0.375 s per word).
  - Netflix allows ≤ 20 characters/s for adults and 17 for children, with ≤ 42 characters per line and 2 lines. https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide
- #20's "your turn" screen:
  - It shows 3 rap sheets with ~20 rows, about 100–150 words, in 17–25 px text, during a 10 s countdown while the voice keeps talking.
  - That is ~600–900 wpm of required reading.
  - Mean luma is 0.27 and the background is navy.

**F8. A 10 px clue is at the edge of what the eye can resolve on a phone.** [B + arithmetic]
- Phone geometry: a 1080-px video on a ~65 mm-wide screen is 0.060 mm per pixel.
- Viewing distance: phones are held at a mean of 32–36 cm (range 17–60) (Bababekova et al. 2011, *Optom Vis Sci* 88:795). https://pubmed.ncbi.nlm.nih.gov/21499163/
- So 10 px = 0.6 mm ≈ 6.4 arcmin. That is the size of one letter on the 20/20 eye-chart line, which you can only see when you look straight at it, at full contrast, with nothing crowding it.
- In a 100-character diorama it falls in peripheral vision, where acuity drops several-fold.
- Delivery codecs also store colour at half resolution (4:2:0), so a glint that differs mainly in hue gets about 5×5 colour samples.
- Comparison with references [S]:
  - 7-Second Riddles' hidden eye: ~70 px.
  - Smallest of the "8 ducks": ~60 px.
  - #15's banana peel: ~40 px in the wide shot. But its first link (a skater falling) is a large motion event.

**F9. In moving scenes, motion decides where everyone looks.** [B, 2011 — older]
- Flicker and motion were the strongest predictors of gaze location.
- Moments when all viewers looked at the same place were predicted by motion (Mital, Smith, Hill & Henderson 2011, *Cognitive Computation* 3:5–24). https://homepages.inf.ed.ac.uk/rhill2/pubs/Mital_(2011)_Clustering_of_gaze_during_dynamic_scene_viewing.pdf
- Consequence for us: a silent, low-motion hand-off loses to any noisy decoy, so nobody sees it. #23 was built that way on purpose ("the chain is SILENT … decoys make noise", memory note).
- In the Chain Reaction hits, every link is a visible motion event: crash, spill, splash.

**F10. Viewers look at centred subjects more steadily.** [B-weak]
- A 2025 webcam eye-tracking study on phones (n = 40, two 20 s vertical videos) found that a centred subject produced longer fixations and fewer saccades than a subject that moved around the frame.
- It reports no effect sizes and does not measure retention.
- Sources: https://realeye.io/blog/post/the-gravity-of-the-center-what-grabs-attention-in-vertical-videos/ (paper: https://submissions.regionaltribune.com/index.php/trt/article/download/138/271)

**F11. Faces, eyes and text grab gaze, and cartoon eyes steer attention.** [B, older]
- Observers fixate a face within their first 2 fixations more than 80% of the time (Cerf, Harel, Einhäuser & Koch, NIPS 2007/2008). https://proceedings.neurips.cc/paper/2007/hash/708f3cf8100d5e71834b1db77dfa15d6-Abstract.html
- Faces drew 16.6× and text 11.1× more fixations than size-matched regions, even when looking at them had a cost (Cerf, Frady & Koch 2009, JoV). https://resolver.caltech.edu/CaltechAUTHORS:20130816-103355264
- A line-drawn schematic face's gaze direction shifts attention reflexively (Friesen & Kingstone 1998). https://psych.unl.edu/mdodd/Psy498/FriesenKingstone.pdf
- Photos: Instagram photos with faces were 38% more likely to get likes (Bakhshi, Shamma & Gilbert, CHI 2014, ~1.1M photos; photos, not video). https://www.news.gatech.edu/news/2014/03/20/face-it-instagram-pictures-faces-are-more-popular
- Implications:
  - Captions on screen during a "find it" window compete with the clue for the eye.
  - Our characters' eye direction is a free pointer, toward the clue or toward a decoy.

**F12. On our channel, brightness tracks views strongly, but it is confounded.** [OWN, correlational]
- Mean luma vs views across 14 episodes (excluding #23, too young): Spearman ρ = +0.72, permutation p ≈ 0.005.
- Excluding the bright Chain Reaction format: ρ = +0.57 (n = 11, p ≈ 0.07).
- All 5 episodes with mean luma < 0.30 flopped: #01 0.26, #06 0.17, #17 0.24, #18 0.27, #20 0.27, with 506–860 views.
- All 4 hits are ≥ 0.50: #14 0.50, #15 0.73, #16 0.69, #19 0.75.
- Saturation runs the other way: ρ = −0.52, p ≈ 0.06 (the dark navy templates are saturated).
- **Confound:** the dark episodes share one navy card-UI template and a text-heavy teach/test format.
- The 3D flops are not dark: #22 0.48, #23 0.47. Brightness alone does not save a video.

**F13. Brightness is not required for a hit, and polish adds little.** [S, B]
- The reference hits span luma 0.28–0.69:
  - GabeSweats 16.5M at 0.28 and 11.5M at 0.42
  - Zack D. at 0.45
  - Oddly Bouncy at 0.69
- SnapUGC (ECCV 2024, ~90k Snapchat videos), predicting average watch %: https://arxiv.org/html/2410.00289v1
  - A model fine-tuned on visuals reached SRCC ≈ 0.63.
  - Adding audio, title and caption-model features raised it to 0.696.
  - Adding pretrained *aesthetic* (DOVER) features added only +0.007.
- Xue et al. 2026 (arXiv 2604.19995): https://arxiv.org/html/2604.19995
  - Validation set: 14,492 TikTok, Reels and Shorts videos.
  - Face time, shot rate and brightness are the top features (52% of importance) of a "sensation value" score.
  - Engagement is an inverted U over that score, so more stimulation is not always better.
- Reading: brightness is part of grabbing attention, but *what is shown* drives watch %.

**F14. The same visual system gives an 8–12× spread in views.** [S, n = 1 pair]
- GabeSweats' three mysteries use the same look: stock clips, dissolves, one centred word.
- They got 11.5M, 16.5M and 1.4M views.
- The story differs; the look does not.

**F15. No evidence supports one art style over another for retention.** [B: none found; S]
- I found no controlled study comparing 2D, 3D and collage styles for short-form attention. The closest studies are off-target: 3D vs text, 3D ads on TV.
- Styles of the top niche channels:
  - GabeSweats: stock-footage collage
  - Zack D.: realistic 3D
  - Oddly Bouncy, 7-Second Riddles, Infographics: flat 2D
- Our 3D episodes (#22, #23: 303–374 views) vs the 2D Chain Reactions (9.5K–18K) is confounded by format, caption size (F4) and safe-zone placement (F3).

**F16. Puzzle hits reveal the answer by zooming in until the clue fills the frame.** [S, OWN]
- 7-Second Riddles cuts to a close-up where the hidden eye or leg fills ~60–100% of the frame, under a new header ("LOOK AT HER EYES!").
- Our Chain Reaction hits replay at ~2× push-in with a labelled box on each link.

**F17. Covers: custom Shorts thumbnails exist on YouTube; TikTok's crop is unofficial.** [A, C]
- YouTube (blog, 2026-07-24): YPP creators can upload custom Shorts thumbnails. Desktop offers 3 suggested frames, and the mobile app lets you pick any frame. The post gives no effect data. https://blog.youtube/news-and-events/making-thumbnails-easier-on-youtube/
- TikTok has no official cover-crop doc.
  - Third parties say the profile grid shows a ~3:4 centre crop, i.e. y 240–1680; some say 1:1, i.e. y 420–1500. https://socialrails.com/blog/tiktok-thumbnail-size-guide
- Shorts appear in search results with a thumbnail, and Search was 30% of traffic on the owner's other account. So the cover is part of how searchers decide to tap. This is an inference, not measured.

**F18. "Find it visually" puzzle Shorts are a thin, low-view niche on YouTube.** [S, sample-biased]
- In view-sorted YouTube searches, visual find-it Shorts mostly sat at 50K–150K views, excluding kids' channels.
- The 10M+ "mystery" Shorts are verbal riddles over stock footage (GabeSweats) or narrative 3D (Zack D.).
- Our best performers (#14, #15, #16, #19) are visual-but-large puzzles: the "clue" is a whole spatter pattern or a chain of big motions, not a pixel.

---

## 2. Contradictions

1. **niche-data says what-if hit captions sit in the "lower third (72–78%)". That y ≈ 1380–1500 is inside TikTok's bottom-660 zone (F1).**
   - Those were YouTube measurements; Shorts' bottom overlay is thinner.
   - Copying that position on TikTok would hide the captions under the TikTok caption block.
   - Our own hits put captions at 26–32%. Position must be platform-checked, not copied.
2. **The 2026-11-26 benchmark memo said "our renders are darker (0.27 vs 0.43–0.54)". It is right for the card-UI episodes only.**
   - Our hits average 0.67, brighter than the reference style bible.
   - The 3D flops are at 0.47, within the bible's range.
   - A 16.5M reference sits at 0.28.
   - Raising lum to 0.43 will not by itself fix the 3D episodes (F12, F13).
3. **The "Harder puzzles" feedback (subtle key, decoys) collides with what the eye can do (F8, F9).** Subtle has to mean *semantically* subtle, not *physically* tiny or motionless. Hide in plain sight: big, visible, and easy to misread.
4. **"Always burn captions" vs Mayer's redundancy principle.** Both are partly right (F6): keep keyword captions and drop sentence-length on-screen text. niche-data already noted that a 2.36M hit had no captions at all.
5. **The evidence.md lore list says exact TikTok pixel margins are lore.** They are now sourced to TikTok's own template (F1), though still via a third-party measurement and for ads, not organic posts.

---

## 3. Proposed rules (checkable)

| # | Rule | Test | Conf. | Evidence |
|---|---|---|---|---|
| V1 | **Safe box.** All text, timers, and the clue/key action stay inside x 120–960, y 240–1260; x ≤ 900 when y > 840. | Overlay `safe` template on 1 frame/2 s; 0 violations | **high** | F1, F3 |
| V2 | **Caption size.** Cap height 80–110 px, never < 60 px; same size all video; heavy sans, dark outline ≥ 6 px | Measure the caption band on 3 frames | med | F4 (OWN + S) |
| V3 | **Caption band.** Default y 480–700 (25–36%); never below y 1260 | Same overlay as V1 | med | F1, F4 |
| V4 | **Chunks.** 1–3 words per caption chunk; at most one highlighted word (yellow #F2C21B) per chunk, and only for the clue/answer noun | Count words and colours per chunk in the timing JSON | med-low | F5, F6, niche-data |
| V5 | **Reading load.** Any text the viewer must READ (not the captions) is ≤ 15 words per screen. It stays on screen ≥ 0.35 s × words, and the voice pauses or reads it aloud. | Words ÷ seconds on screen ≤ 3 | med | F7 (BBC/Netflix) |
| V6 | **Small text floor.** Must-read text has cap height ≥ 40 px (≈ 2.4 mm, ~26 arcmin at 32 cm) | Measure the smallest label | med-low | F7, F8 |
| V7 | **Clue size.** The decisive clue is ≥ 40 px on its short axis in the shot where it can be found, OR is a motion event that moves ≥ 80 px. Luma contrast vs its surround ≥ 3:1. Never hue-only. | Measure in the find-window frame | med | F8, F9, S refs 40–70 px |
| V8 | **Clue placement.** During the find window the clue lives in y 600–1260, x 200–880 | Overlay | med-low | F1, F10 |
| V9 | **Quiet find window.** During "your turn", no captions or other moving text except one timer, and the timer sits inside V1 | Frame check | low-med | F11 (text grabs gaze 11×) |
| V10 | **Zoom reveal.** At the answer, push in until the clue is ≥ 25% of frame width; hold ≥ 1.0 s with a label | Measure the reveal frame | med | F16 |
| V11 | **Brightness.** Mean luma ≥ 0.40 over the video, ≥ 0.45 on frame 0. Retire the dark navy card background. | `look.py` luma_mean | low-med (confounded) | F12, F13 |
| V12 | **Gaze as pointer.** In replays, the nearest character looks at the clue. In hard mode, characters look at a decoy during the find window. | Storyboard check | low | F11 |
| V13 | **Cover.** The chosen cover frame shows the puzzle subject plus ≤ 5 title words inside y 420–1500, x 120–960, which survives both a 3:4 and a 1:1 crop. Upload a custom Shorts thumbnail when eligible. | Crop preview | low-med | F17 |
| V14 | **No art-style rule.** Don't choose 3D over 2D for retention. Choose whatever renders V1–V10 most clearly. | — | med | F13–F15 |

---

## 4. Applies-to-us

**Hits.** #14, #15, #16 and #19 pass V1–V3, V7, V10 and V11:
- luma 0.50–0.75
- captions 87–109 px at 26–32%
- clues that are big patterns or big motions
- push-in replays

**Dark teach/test flops.** #17, #18 and #20 fail V11 (luma 0.24–0.27).
- #20 also fails V5/V6 (rap-sheet text at 17–25 px, ~600–900 wpm of required reading) and V1 (sheets run to y 1330).
- #17's fingerprint "tiny details" are small, low-contrast line patterns. Visually it is a reading puzzle, not a seeing puzzle.

**3D flops.** #22 and #23 pass V11 (0.47–0.48), so darkness does not explain them.
- #23 fails V1 (timer pill in the tab band; the poisoning on the ground floor at y 1230–1450, under TikTok's caption), V2 (49 px captions), V7 (the ~10 px silent vial) and V8.
- #22 is a story, not a puzzle. It fails V2 (49–74 px captions) and has no clue to judge. Its weakness is more likely story or hook (other tracks).

**Older flops** #01, #03, #04 and #06 are other formats.
- #01 and #06 are dark (0.26, 0.17).
- #03 and #04 are bright (0.48, 0.50) and still flopped. That is consistent with F13: brightness is not sufficient.

**What it doesn't explain.** Visuals cannot explain the 65.7K vs 18K vs 9.5K spread among the hits; all four look similar. That spread is topic and hook (#14 "like Dexter") and shares.

---

## 5. Open questions (only our analytics can settle them)

1. **Where does #23 lose viewers?** Pull the TikTok retention curve. Is the drop inside the 15 s find window (supports V7/V8/V9) or before it (hook)?
2. **Brightness A/B.** Re-render #18 Spot the Liar on a light background (luma ≥ 0.5) with everything else identical and post it as a variant. That is the only clean test of V11.
3. **Caption-size A/B.** Use the next 3D episode at 100 px vs 50 px captions, or compare against the last two.
4. **Does the cover matter?** Check the actual crop on the public TikTok profile grid, and compare the share of search traffic for episodes whose covers show the subject vs a random frame.
5. **YouTube vs TikTok overlay.** Are YouTube retention curves for #23 better than TikTok's? If so, that points to the bottom-zone occlusion in F3.
