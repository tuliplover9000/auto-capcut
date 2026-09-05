# test_lyric_image.py
import numpy as np, lyricmode

def test_poster_layout_dims_and_wrap():
    img = lyricmode.build_line_image("hold me closer till the morning light",
                                     1080, 1920, "light", layout="poster")
    assert img.shape == (1920, 1080, 4) and img.dtype == np.float32
    assert img[..., 3].max() > 0.2                       # visible but faded
    assert img[..., 3].max() < 0.6                       # NOT opaque
    rows_with_ink = np.where(img[..., 3].sum(axis=1) > 1)[0]
    assert rows_with_ink.size and rows_with_ink[0] < 400  # starts near the top
    assert rows_with_ink[-1] < 1920 * 0.75                # fits upper zone
    short = lyricmode.build_line_image("yo", 1080, 1920, "dark", layout="poster")
    assert short[..., 3].max() > 0.1

def test_side_layout_stays_in_dead_space():
    # side layout (the default): smaller text, confined to its half plus a
    # small tuck — the whole point is minimal contact with the person.
    for side, ok_cols in (("left", slice(0, int(1080 * 0.60))),
                          ("right", slice(int(1080 * 0.40), 1080))):
        img = lyricmode.build_line_image("hold me closer till the morning light",
                                         1080, 1920, "light", side=side)
        a = img[..., 3]
        assert a.max() > 0.2
        total, inside = float(a.sum()), float(a[:, ok_cols].sum())
        assert inside / total > 0.98, f"{side}: ink escaped the dead-space zone"
    # side text is genuinely smaller than poster text (fewer ink pixels per char)
    poster = lyricmode.build_line_image("hold me closer", 1080, 1920, "light",
                                        layout="poster")
    side_img = lyricmode.build_line_image("hold me closer", 1080, 1920, "light")
    assert float(side_img[..., 3].sum()) < 0.6 * float(poster[..., 3].sum())

def test_pick_side():
    m = np.zeros((100, 100), np.float32); m[:, 60:] = 1.0   # person on the right
    assert lyricmode._pick_side(m) == "left"
    m2 = np.zeros((100, 100), np.float32); m2[:, :40] = 1.0
    assert lyricmode._pick_side(m2) == "right"

def test_auto_tint():
    dark_bg = np.zeros((100, 100, 3), np.uint8)
    light_bg = np.full((100, 100, 3), 230, np.uint8)
    nobody = np.zeros((100, 100, 1), np.float32)
    assert lyricmode.auto_tint(dark_bg, nobody) == "light"
    assert lyricmode.auto_tint(light_bg, nobody) == "dark"

if __name__ == "__main__":
    test_poster_layout_dims_and_wrap()
    test_side_layout_stays_in_dead_space()
    test_pick_side()
    test_auto_tint()
    print("PASS")
