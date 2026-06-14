# Reel Style Study — what we're emulating

Frame-by-frame study of 5 reference Instagram Reels the creator wants the
auto-editor to emulate (editing **style** only; topic-agnostic). Each dimension
was studied by a dedicated agent across all 5 reels (downloaded video + dense
frame sampling + scene-cut detection). This doc is the durable reference for
future build work — read it before building captions/zooms/overlays/transitions.

**Reels studied**
1. `DX8i0U3vTA1` — "10 Claude Github Repos" (AI/tech, 95s, screenshot-heavy)
2. `DYQquCSReTt` — NYC budget/politics (71s, cinematic, editorial overlays)
3. `DW1YMc3DTDr` — Chinese fashion brands (63s, B-roll heavy, fastest cuts)
4. `DTOIp4zjP5I` — graphic-design "fake it til you make it" (47s, split-screen)
5. `DYQOfKZSukQ` — "5 engaging songs" (26s; studied for its **intro text effect**)

---

## ⚠️ The three headline findings (these change our current build)

1. **No animated zoom anywhere.** Across all 5 reels, every clip is *static* within
   its duration — zero Ken Burns push/pull/drift. The "subtle zoom" look is a
   **hard cut to a tighter, pre-cropped framing** (a framing *jump* at the cut),
   used **sparingly**. Our tool currently defaults to *animated* push/pull — the
   opposite of the reference. (Decision needed — see below.)
2. **Captions are minimal & static, not animated pop.** White, no hard outline,
   soft drop shadow, grouped into **short phrases (3–6 words)** (or one-word for
   some), changing on **hard cuts** — no karaoke/pop/scale. The loud
   yellow+black-outline text is a *separate editorial/title layer*, not the body
   captions. Our tool's animated-pop captions are not what these use.
3. **"Behind the person" is NOT rotoscoping.** It's a **split-zone composite**:
   the graphic fills the upper ~50–65% of the vertical frame, the person sits in
   the lower portion. No per-frame matting. → The look the creator loves is
   **easy in ffmpeg** (plain `overlay`), no ML needed.

---

## 1. Cutting & Zooms  ⭐ (creator's #1 priority)

**Cut pace (scene-detected, not guessed):**

| Reel | Duration | Cuts | Avg clip |
|------|----------|------|----------|
| 1 | 95s | 22 | 4.15s (bimodal: ~7s wide + ~1.3s close pairs) |
| 2 | 72s | 26 | 2.66s |
| 3 | 63s | 27 | 2.26s (fastest) |
| 4 | 47s | 17 | 2.61s (most uniform) |

- **Target pace:** modal clip **1.5–2.5s**, most clips 1–4s, occasional ~5s for a long thought. Reel 1's higher average is its deliberate wide↔close pairing.
- **Zoom = static framing jump only.** ~1.5–1.7× scale difference between a "wide" and "close" framing, applied **instantly at the cut**, not animated. Reel 1 alternates wide(~7s)→close(~1.3s); others jump framing at topic/B-roll changes.
- **Frequency: sparse.** Not every 3–4s. More like at topic transitions / every several clips.

**What to change in our tool (vs current: animated push/pull ~16%, ~1 zoom per 3–4s):**
- Drop animated push/pull as the default; make **static punch-in** the core.
- Lower amount to **~8–12%** framing jump (16% animated is too much/wrong feel).
- Make zooms **much less frequent** (topic transitions, alternating wide/close), not constant.
- "Subtle zoom" here literally means *a hard cut to a closer pre-crop*, not a Ken Burns drift.

> NOTE: the creator earlier asked for *animated* zoom-during-clip. The reference
> reels they admire are *static*. This is a genuine conflict to resolve (below).

---

## 2. Captions

**The body-caption recipe these share:**
- Font: clean sans-serif, **regular–semibold** (Montserrat/Inter/Proxima feel) — **not** condensed (Anton/Bebas are wrong for body; right for editorial titles).
- Size ~5–6% of frame height; **lower third** (talkers) or **center dead-zone** (split-screen R3/R4).
- **Phrase grouping (3–6 words)** is dominant (R1, R2); one-word for staccato (R4, R5).
- Animation: **static hard-cut between cards** — no karaoke, no pop/scale, no typewriter.
- Color: **white**, **no hard outline**, **soft diffuse drop shadow**, no background box.
- **No active-word highlight** on body captions in any reel.
- Separate **editorial/title layer**: large condensed bold (Impact/Anton), **bright yellow + thick black outline**, upper/center — for hooks, list numbers, section headers. (Our Anton/Bebas + yellow belongs *here*, not on body captions.)

**Gaps vs our tool:** we lean animated-pop + outline; reference is static phrase + soft-shadow/no-outline. Missing: **phrase-grouping mode**, **soft-shadow-no-outline** look, **center-zone position**, and a **separate editorial-title layer**.

---

## 3. Transitions

- **~90% jump cuts / hard cuts.** Talking-head→talking-head is always a jump cut; never a dissolve. TH↔B-roll is a hard cut.
- **Fancy transitions appear ~once per reel**, only at hook/section pivots — not on every cut:
  - R2: a **zoom-push into extreme close-up** + a **glitch/scan-line wipe** out.
  - R5: an **animated warm-sky color wipe** + **flash-to-white** at the intro→content pivot.
- **Ranked to add (ffmpeg feasibility):** hard/jump cut (trivial, already do it) → flash-to-white (easy) → cross-dissolve (easy) → zoom-push accent (medium) → glitch wipe (medium) → animated color wipe (hard, needs an asset). Use sparingly — applying fancy transitions to every cut would break the style.

---

## 4. Overlays / "behind the person"

- **None of the 5 use true rotoscoping.** The "behind" look = **split-zone composite**: graphic in upper ~50–65% of frame, person in lower portion (over the room bg or a black bg). Clean horizontal boundary, no silhouette matte.
- Overlay vocabulary: **upper-zone screenshots/UI** (R1, R4 — 70–90% of frames), **full-screen cutaways** (B-roll, screenshots, album art — all reels), **on-top text/stat cards** (R2), **persistent title pill** (R3).
- **Feasibility:** the entire look is **easy/medium in ffmpeg** (`overlay` for the zone composite + cutaway splicing + PNG cards). **True matting (rembg/RVM/MODNet/SAM) is NOT needed** — a configurable `y_split_ratio` (graphic upper, person lower) gets ~95% of it. (Matches the creator's "on-top fallback is OK" call — turns out the fallback *is* what the pros do.)
- Hard part isn't compositing — it's **sourcing the right image/B-roll automatically** and timing it to the words (the AI-B-roll problem the other research session is on).

---

## 5. Intro text effect (Reel 5)

- Glowing **white, rounded-bold** title ("5 engaging / songs"), large (the "5" ~25–30% of frame height), upper-left/center.
- **Staggered word pop-in** (~0.2–0.3s apart, near-instant opacity snap), holds ~3s, fades out.
- "Futuristic" = a **soft glow/bloom** around the white letters (not a hard shadow) + the rounded-bold font; clean, no grids/grain.
- Appears "behind her" via **upper-safe-zone positioning** (+ possibly a rough CapCut auto-matte; static camera/bg makes real matting feasible here).
- **Recreate (ASS):** rounded-bold font (Nunito Black / Poppins ExtraBold), glow via `\blur` + fat white border (`\bord` + white `\3c`), staggered `\fad` per word. Behind-subject: optional `rembg` matte (cheap-ish on a static shot) or the upper-safe-zone fallback (~95% there). Feasibility: text effect **medium**, true behind **hard/optional**.

---

## Proposed build order (by priority + ROI)

1. **Cuts/zooms to match (priority):** static punch-in framing, ~8–12%, sparse/topic-driven; retire animated push as default. *(pending the animated-vs-static decision)*
2. **Caption "clean" mode:** phrase-grouping, white, soft-shadow/no-outline, static; keep the punchy pop as an *option*; add a separate editorial-title layer.
3. **Split-zone image overlay** (`y_split_ratio`) — the "behind the person" look, cheaply. (Auto-sourcing B-roll is the separate hard problem.)
4. **Accent transitions** used sparingly: flash-to-white, then zoom-push.
5. **Intro title effect** (glow + staggered pop) as an optional opener.

## Open decisions (surfaced by the study)
- **Animated vs static zoom** — reference is static; creator earlier asked for animated. Pick one (or offer both).
- **Captions** — match the reference's clean/minimal/static look, or keep our animated pop (or both as modes)?
- **Overlays** — proceed with the cheap split-zone composite (no rotoscoping), confirmed as what the pros actually do.
