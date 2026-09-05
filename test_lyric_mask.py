# test_lyric_mask.py — REAL u2netp model (~5MB, downloaded once by rembg).
import numpy as np, lyricmode

def test_mask_shape_and_range():
    rgb = np.random.default_rng(0).integers(0, 255, (240, 160, 3), np.uint8)
    m = lyricmode.person_mask(rgb, mask_w=128)
    assert m.shape == (240, 160, 1) and m.dtype == np.float32
    assert 0.0 <= float(m.min()) and float(m.max()) <= 1.0

if __name__ == "__main__":
    test_mask_shape_and_range(); print("PASS")
