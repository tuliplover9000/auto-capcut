# test_clipper_ui.py
import app

def test_page_has_clipper_mode():
    html = app.app.test_client().get("/").get_data(as_text=True)
    for needle in ['id="mode-clip"', 'id="clipMode"', 'id="clipFile"',
                   'id="clipFind"', '/clip/analyze', '/clip/render/',
                   'renderCandidates', 'clipPoll']:
        assert needle in html, f"missing UI hook: {needle}"

if __name__ == "__main__":
    test_page_has_clipper_mode()
    print("PASS")
