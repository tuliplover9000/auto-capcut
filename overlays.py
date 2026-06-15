"""overlays.py — stacked / cutaway B-roll compositor (Phase 0: no AI, no web).

Stacks image/video B-roll onto a talking-head base video in ONE ffmpeg pass.

Two placement formats per overlay:
  - "stacked": the presenter is shrunk into a bottom band (BAND_RATIO of the
    frame), the B-roll fills the top zone above it.
  - "cutaway": the B-roll fills the whole frame for its span (a full-screen cut).

Stills get a Ken Burns slow-zoom (zoompan); videos are trimmed/scaled to fit.
Both fade in/out on alpha. Effects (vignette/grain/flash) and HLG/HDR color
re-stamping are folded into the SAME pass (overlay/zoompan drop color tags, so
the final node MUST re-stamp setparams or the output washes out).
"""
import os
from autoedit import ff_exe, run, probe, _setparams_suffix, _effects_filters

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
BAND_RATIO = 0.45        # presenter band height fraction (bottom)
CROP_BIAS = 0.08         # vertical crop offset into the presenter (keeps the face)
KENBURNS_MAX = 1.15      # ken-burns end zoom
DEFAULT_FADE = 0.25


def _is_image(path):
    """True if path's extension is a known still-image format."""
    return os.path.splitext(path or "")[1].lower() in IMAGE_EXTS


def composite(base_mp4, out_mp4, overlays, spec, effects=None, boundaries=None, tmpdir=None):
    """
    Composite B-roll overlays onto base_mp4 -> out_mp4 in one ffmpeg pass.

    overlays: list of {path, start, end, format('stacked'|'cutaway'),
                       kenburns(bool, default True for stills), fade(float, default 0.25)}
              start/end are OUTPUT-timeline seconds.
    spec: probe() dict (uses disp_width/disp_height/fps/color).
    effects/boundaries: optional, folded into the SAME pass (vignette/grain/flash).
    Raises RuntimeError on failure. Requires >=1 overlay.
    """
    ff = ff_exe()
    if not ff:
        raise RuntimeError("ffmpeg not found — pip install imageio-ffmpeg")
    if not overlays:
        raise RuntimeError("composite() requires at least one overlay.")

    DW = int(spec.get("disp_width") or spec.get("width") or 0)
    DH = int(spec.get("disp_height") or spec.get("height") or 0)
    fps = float(spec.get("fps") or 30.0)
    if DW <= 0 or DH <= 0:
        raise RuntimeError(f"Cannot lay out overlays: invalid base dims {DW}x{DH}.")

    bandH = round(BAND_RATIO * DH)
    topH = DH - bandH
    bandY = DH - bandH
    cropY = round(CROP_BIAS * DH)

    base_abs = os.path.abspath(base_mp4)
    out_abs = os.path.abspath(out_mp4)

    # ── Stacked base (presenter band at the bottom, blurred/dimmed bg) ──────────
    chains = [
        f"[0:v]scale={DW}:{DH},boxblur=20:2,eq=brightness=-0.35,setsar=1[bg]",
        f"[0:v]crop={DW}:{bandH}:0:{cropY},setsar=1[pband]",
        f"[bg][pband]overlay=0:{bandY}[basec]",
    ]

    # ── Per-overlay chains ─────────────────────────────────────────────────────
    ovs = sorted(overlays, key=lambda o: float(o.get("start") or 0.0))
    inputs = []           # absolute paths in input-index order (after the base)
    prev_label = "basec"
    for i, ov in enumerate(ovs):
        N = i + 1                                   # ffmpeg input index (0 = base)
        path = ov.get("path")
        if not path:
            raise RuntimeError(f"overlay {i} has no path.")
        ov_abs = os.path.abspath(path)
        if not os.path.exists(ov_abs):
            raise RuntimeError(f"overlay {i}: file not found: {ov_abs}")
        inputs.append(ov_abs)

        start = float(ov.get("start") or 0.0)
        end = float(ov.get("end") or 0.0)
        dur = end - start
        if dur < 0.1:
            raise RuntimeError(
                f"overlay {i} ({path}): duration {dur:.3f}s too short (need >=0.1s).")
        frames = max(2, round(dur * fps))
        fade = min(float(ov.get("fade") if ov.get("fade") is not None else DEFAULT_FADE),
                   dur / 2.0)
        fmt = str(ov.get("format") or "stacked").lower()
        is_img = _is_image(path)
        kenburns = bool(ov.get("kenburns", True)) if is_img else False

        # Target zone geometry: cutaway = full frame; stacked = top zone @ 0:0.
        if fmt == "cutaway":
            zw, zh = DW, DH
        else:                                       # stacked (default)
            zw, zh = DW, topH
        ov_y = 0                                    # both still/video sit at y=0

        fade_chain = (f"format=yuva420p,"
                      f"fade=t=in:st=0:d={fade}:alpha=1,"
                      f"fade=t=out:st={dur - fade}:d={fade}:alpha=1,"
                      f"setpts=PTS-STARTPTS+{start}/TB,setsar=1")

        if is_img:
            # Scale-COVER then crop to the target aspect (preserves the image's
            # aspect — never stretch), 4x oversized so the ken-burns zoom has
            # jitter-free headroom; then zoompan zooms within and outputs the
            # exact target size. zoompan ALSO generates `frames` frames from the
            # single still — which is what makes a static (non-ken-burns) still
            # actually appear (a lone PNG frame at PTS=0 fades to alpha=0 and
            # vanishes). So stills ALWAYS go through zoompan: a slow zoom when
            # kenburns, a constant z=1.0 when not.
            z = f"min(zoom+0.0008\\,{KENBURNS_MAX})" if kenburns else "1.0"
            src = (f"[{N}:v]scale={zw * 4}:{zh * 4}:force_original_aspect_ratio=increase,"
                   f"crop={zw * 4}:{zh * 4},"
                   f"zoompan=z='{z}':d={frames}:s={zw}x{zh}:fps={fps}:"
                   f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',"
                   f"{fade_chain}[ov{N}]")
        else:                                       # video overlay
            src = (f"[{N}:v]trim=0:{dur},setpts=PTS-STARTPTS,fps={fps},"
                   f"scale={zw}:{zh}:force_original_aspect_ratio=increase,"
                   f"crop={zw}:{zh},{fade_chain}[ov{N}]")

        chains.append(src)
        out_lbl = f"c{i}"
        # Clamp this overlay's visible window so it never stays on screen past the
        # NEXT overlay's start — otherwise two overlapping windows both enable at
        # once and a later cutaway (full-frame) silently covers an earlier stacked
        # one. (Display window only; the clip's own fade timing is unchanged.)
        enable_end = end
        if i + 1 < len(ovs):
            nxt_start = float(ovs[i + 1].get("start") or 0.0)
            if nxt_start > start:
                enable_end = min(end, nxt_start)
        chains.append(
            f"[{prev_label}][ov{N}]overlay=0:{ov_y}:"
            f"enable='between(t\\,{start}\\,{enable_end})':eof_action=pass[{out_lbl}]")
        prev_label = out_lbl

    # ── Tail: effects + color re-stamp, applied to the final composite ──────────
    tail_filters = list(_effects_filters(effects or {}, boundaries or [], fps))
    suffix = _setparams_suffix(spec.get("color"))   # ",setparams=..." or ""
    if suffix:
        tail_filters.append(suffix.lstrip(","))     # drop the leading comma
    if tail_filters:
        chains.append(f"[{prev_label}]{','.join(tail_filters)}[outv]")
    else:
        chains.append(f"[{prev_label}]null[outv]")

    filter_complex = ";".join(chains)

    cmd = [ff, "-y", "-i", base_abs]
    for p in inputs:
        cmd += ["-i", p]
    cmd += [
        "-filter_complex", filter_complex,
        "-map", "[outv]", "-map", "0:a?",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000",
        "-movflags", "+faststart",
        out_abs,
    ]

    r = run(cmd, timeout=900)
    if not (os.path.exists(out_abs) and os.path.getsize(out_abs) > 0):
        raise RuntimeError(
            f"Overlay composite failed — output missing or empty.\n"
            f"ffmpeg stderr: {(r.stderr or '')[-800:]}")


def build_roughcut(input_path, cutlist, spec, out_mp4, tmpdir, zoomplan=None,
                   effects=None, overlay_plan=None):
    """Render the rough cut: cut+zoom -> (overlays + effects) -> out_mp4.

    overlay_plan: composite-ready list (from autoedit.resolve_overlays) or falsy.
    Routes through composite() when there are overlays (it folds effects + HLG
    color into one pass), else grade_video() when there are effects, else a
    direct render. ONE encode either way.
    """
    import autoedit
    boundaries = autoedit.cut_offsets(cutlist)
    has_fx = bool(effects) and any(effects.values())
    if overlay_plan:
        base = os.path.join(tmpdir, "roughcut_base.mp4")
        autoedit.render_video(input_path, cutlist, spec, base, tmpdir, zoomplan=zoomplan)
        composite(base, out_mp4, overlay_plan, spec, effects=effects,
                  boundaries=boundaries, tmpdir=tmpdir)
    elif has_fx:
        base = os.path.join(tmpdir, "roughcut_base.mp4")
        autoedit.render_video(input_path, cutlist, spec, base, tmpdir, zoomplan=zoomplan)
        autoedit.grade_video(base, out_mp4, effects, boundaries,
                             spec["fps"], spec.get("color"), tmpdir)
    else:
        autoedit.render_video(input_path, cutlist, spec, out_mp4, tmpdir, zoomplan=zoomplan)
