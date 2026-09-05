# test_lyric_ui.py — the third mode's UI hooks (and the first two still intact).
import app

HTML = app.app.test_client().get("/").get_data(as_text=True)


def test_page_has_lyric_mode():
    for needle in ['id="mode-lyric"', 'id="lyricMode"', 'id="lyricDrop"',
                   'id="lyricFile"', 'id="lyricTrack"', 'id="lyricArtist"',
                   'id="lyricStart"', 'id="lyricTint"', 'id="lyricWhisper"',
                   'id="lyricGo"', 'id="lyricStage"', 'id="lyricResult"',
                   '/lyric/run', '/lyric/status/', '/lyric/video/',
                   '/lyric/download/', 'lyricPoll(', 'esc(']:
        assert needle in HTML, f"missing UI hook: {needle}"


def test_existing_modes_untouched():
    for needle in ['id="mode-edit"', 'id="mode-clip"', 'id="clipMode"',
                   'id="editMode"', 'id="clipFile"', 'id="clipFind"',
                   'id="clipUrl"', '/clip/analyze', '/clip/render/',
                   'renderCandidates', 'clipPoll']:
        assert needle in HTML, f"regressed existing UI hook: {needle}"


def test_setmode_handles_three_sections():
    """setMode must toggle all three buttons and all three sections."""
    for needle in ['"lyric"', '#lyricMode', '#mode-lyric']:
        assert needle in HTML, f"setMode missing {needle}"


if __name__ == "__main__":
    test_page_has_lyric_mode()
    test_existing_modes_untouched()
    test_setmode_handles_three_sections()
    print("PASS")
