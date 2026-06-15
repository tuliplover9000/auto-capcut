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
    # Even W/H — libx264 yuv420p needs it, and render_video already corrects an
    # odd source to even (trunc/2*2). Match that here so the base file's dims and
    # the composite's target dims agree (else scale/crop hits an odd dim -> abort).
    DW -= DW % 2
    DH -= DH % 2

    bandH = round(BAND_RATIO * DH)
    bandH -= bandH % 2                # keep the band (and thus topH) even too
    topH = DH - bandH
    bandY = DH - bandH
    cropY = round(CROP_BIAS * DH)
    cropY -= cropY % 2                # even crop offset (avoid chroma-shift warning)

    base_abs = os.path.abspath(base_mp4)
    out_abs = os.path.abspath(out_mp4)

    # ── Base = the FULL presenter. The stacked split / cutaway appear ONLY during
    #    an overlay's window (hard cut in AND out); outside every window the full
    #    presenter shows. No always-on band, no blurred background. ──────────────
    chains = [f"[0:v]setsar=1[base]"]

    # ── Per-overlay chains ─────────────────────────────────────────────────────
    ovs = sorted(overlays, key=lambda o: float(o.get("start") or 0.0))
    inputs = []           # absolute paths in input-index order (after the base)
    prev_label = "base"
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
        fmt = str(ov.get("format") or "stacked").lower()
        is_img = _is_image(path)
        kenburns = bool(ov.get("kenburns", True)) if is_img else False

        # cutaway = media fills the whole frame; stacked = media fills the TOP zone
        # and the presenter (cropped) is shown in the bottom band.
        cutaway = (fmt == "cutaway")
        zw, zh = (DW, DH) if cutaway else (DW, topH)

        # Place the media on the base timeline at `start` via setpts — NO alpha
        # fade, so it's a HARD CUT in/out. Stills run through zoompan to generate
        # frames (a lone PNG is one frame): a slow ken-burns zoom, or constant z=1.
        place = f"setpts=PTS-STARTPTS+{start}/TB,setsar=1"
        if is_img:
            z = f"min(zoom+0.0008\\,{KENBURNS_MAX})" if kenburns else "1.0"
            chains.append(
                f"[{N}:v]scale={zw * 4}:{zh * 4}:force_original_aspect_ratio=increase,"
                f"crop={zw * 4}:{zh * 4},"
                f"zoompan=z='{z}':d={frames}:s={zw}x{zh}:fps={fps}:"
                f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',"
                f"{place}[ov{N}]")
        else:                                       # video overlay
            chains.append(
                f"[{N}:v]trim=0:{dur},setpts=PTS-STARTPTS,fps={fps},"
                f"scale={zw}:{zh}:force_original_aspect_ratio=increase,"
                f"crop={zw}:{zh},{place}[ov{N}]")

        # Clamp the visible window so it never runs past the NEXT overlay's start
        # (two overlapping windows would otherwise show at once).
        enable_end = end
        if i + 1 < len(ovs):
            nxt_start = float(ovs[i + 1].get("start") or 0.0)
            if nxt_start > start:
                enable_end = min(end, nxt_start)
        gate = f"enable='between(t\\,{start}\\,{enable_end})'"

        if cutaway:
            out_lbl = f"c{i}"
            chains.append(
                f"[{prev_label}][ov{N}]overlay=0:0:{gate}:eof_action=pass[{out_lbl}]")
            prev_label = out_lbl
        else:
            # stacked: media in the top zone + the presenter in the bottom band,
            # both gated to the SAME window -> cut to the split and back. The band
            # shows the WHOLE presenter frame (face AND body) scaled to FIT the band
            # height and CENTERED, over a soft blurred fill of itself (so there are
            # no black side bars) — not a tight crop of the top of the head.
            chains.append(
                f"[0:v]scale={DW}:{bandH}:force_original_aspect_ratio=increase,"
                f"crop={DW}:{bandH},boxblur=18:2,eq=brightness=-0.25,setsar=1[pbg{N}]")
            chains.append(f"[0:v]scale=-2:{bandH},setsar=1[pfg{N}]")
            chains.append(f"[pbg{N}][pfg{N}]overlay=(W-w)/2:0,setsar=1[pb{N}]")
            mid, out_lbl = f"c{i}a", f"c{i}"
            chains.append(
                f"[{prev_label}][ov{N}]overlay=0:0:{gate}:eof_action=pass[{mid}]")
            chains.append(
                f"[{mid}][pb{N}]overlay=0:{bandY}:{gate}[{out_lbl}]")
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

    # Pass the filtergraph via a script file, not inline: with ~one overlay every
    # few seconds, a multi-minute edit produces enough chains (~80+ overlays) to
    # blow past Windows' 32767-char command-line limit -> WinError 206 kills the
    # whole render with a cryptic message. (Same fix the audio pass uses.) Write
    # it next to the other scratch files (tmpdir, falling back to the output dir).
    script_dir = tmpdir or os.path.dirname(out_abs) or "."
    fc_path = os.path.join(script_dir, "overlay_fc.txt")
    with open(fc_path, "w", encoding="utf-8") as fcf:
        fcf.write(filter_complex)

    cmd = [ff, "-y", "-i", base_abs]
    for p in inputs:
        cmd += ["-i", p]
    cmd += [
        "-filter_complex_script", fc_path,
        "-map", "[outv]", "-map", "0:a?",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000",
        "-movflags", "+faststart",
        out_abs,
    ]

    r = run(cmd, timeout=900)
    if r.returncode == 124 or not (os.path.exists(out_abs) and os.path.getsize(out_abs) > 0):
        raise RuntimeError(
            f"Overlay composite failed{' (timed out)' if r.returncode == 124 else ''} — "
            f"output missing or empty.\n"
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
