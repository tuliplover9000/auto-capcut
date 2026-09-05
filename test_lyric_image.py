# test_lyric_image.py
import numpy as np, lyricmode

def test_line_image_dims_and_wrap():
    img = lyricmode.build_line_image("hold me closer till the morning light", 1080, 1920, "light")
    assert img.shape == (1920, 1080, 4) and img.dtype == np.float32
    assert img[..., 3].max() > 0.2                       # visible but faded
    assert img[..., 3].max() < 0.6                       # NOT opaque
    rows_with_ink = np.where(img[..., 3].sum(axis=1) > 1)[0]
    assert rows_with_ink.size and rows_with_ink[0] < 400  # starts near the top
    assert rows_with_ink[-1] < 1920 * 0.75                # fits upper zone
    short = lyricmode.build_line_image("yo", 1080, 1920, "dark")
    assert short[..., 3].max() > 0.1

def test_auto_tint():
    dark_bg = np.zeros((100, 100, 3), np.uint8)
    light_bg = np.full((100, 100, 3), 230, np.uint8)
    nobody = np.zeros((100, 100, 1), np.float32)
    assert lyricmode.auto_tint(dark_bg, nobody) == "light"
    assert lyricmode.auto_tint(light_bg, nobody) == "dark"

if __name__ == "__main__":
    test_line_image_dims_and_wrap(); test_auto_tint(); print("PASS")
