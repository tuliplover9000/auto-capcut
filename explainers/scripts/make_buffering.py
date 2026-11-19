"""Writes episodes/buffering.json: the 3-friend voice-over skit "Buffering".

    python scripts/make_buffering.py          # -> episodes/buffering.json
    python scripts/narrate.py episodes/buffering.json
    python scripts/make_buffering.py trim     # cut TTS tail silence from the timing
    (add `es` to either command for the Spanish version, episodes/buffering-es.json)

Each line names a SPEAKER + STYLE. The guide-track TTS voice comes from
VOICES; `text` is what shows on screen and `say` is what the TTS reads.
`pause` = extra silence before the line (dubbers need a breath between lines).
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = {
    ("DEX", "normal"): ("en-US-BrianNeural", "+0%", "+0Hz"),
    ("DEX", "robot"): ("en-US-BrianNeural", "-12%", "-30Hz"),
    ("DEX", "slow"): ("en-US-BrianNeural", "-45%", "-40Hz"),
    ("DEX", "ad"): ("en-US-BrianNeural", "+18%", "+12Hz"),
    ("DEX", "quiet"): ("en-US-BrianNeural", "-12%", "-4Hz"),
    ("BOLT", "normal"): ("en-US-GuyNeural", "+10%", "+0Hz"),
    ("BOLT", "whisper"): ("en-US-GuyNeural", "-4%", "-6Hz"),
    ("NOVA", "normal"): ("en-US-AvaNeural", "+0%", "+0Hz"),
    ("SYS", "normal"): ("en-US-JennyNeural", "-6%", "-12Hz"),
}
D = 0.25  # default breath between lines (on top of the timeline's 0.15 s GAP)

# (speaker, style, scene, pause, on-screen text, tts text or None)
L = [
    ("DEX", "normal", "home", 1.6, "Ugh. Morning.", None),
    ("SYS", "normal", "home", D, "Good morning, Dex. Your heart rate is elevated. You searched \"is Nova single\" 47 times last night.", "Good morning, Dex. Your heart rate is elevated. You searched, is Nova single, forty-seven times last night."),
    ("DEX", "normal", "home", D, "Delete that.", None),
    ("SYS", "normal", "home", D, "Posting it to your profile.", None),
    ("DEX", "normal", "home", 0.2, "NO. DELETE. I said DELETE!", "No! Delete! I said delete!"),
    ("BOLT", "normal", "home", 0.9, "DEX! Big news. Nova's gonna be at the Charging Station today.", "Dex! Big news! Nova's gonna be at the Charging Station today."),
    ("DEX", "normal", "home", D, "How do you know that?", None),
    ("BOLT", "normal", "home", D, "Her location's public.", None),
    ("DEX", "normal", "home", D, "Everybody's location is public, Bolt. We live in Techtopia. My toaster knows where I am.", None),
    ("SYS", "normal", "home", D, "You are in the kitchen. Also, you are out of bread.", None),
    ("DEX", "normal", "home", 0.2, "See?", None),
    ("BOLT", "normal", "home", 0.5, "Today's the day. You're asking her out.", None),
    ("DEX", "normal", "home", D, "No way. Last time I talked to her, my forehead screen said \"CRITICAL ERROR\" in size 72 font.", "No way. Last time I talked to her, my forehead screen said, critical error, in size seventy-two font."),
    ("BOLT", "normal", "home", D, "That's why I got you THIS. Rizz.exe, version 2.0. Downloads straight into your brain chip.", "That's why I got you this! Rizz dot exe, version two point oh. Downloads straight into your brain chip."),
    ("DEX", "normal", "home", 0.4, "...Where'd you get it?", "Where'd you get it?"),
    ("BOLT", "normal", "home", 0.2, "A guy.", None),
    ("DEX", "normal", "home", 0.2, "What guy?", None),
    ("BOLT", "normal", "home", 0.2, "A guy in a pop-up ad.", None),
    ("DEX", "normal", "home", 0.4, "Bolt.", None),
    ("BOLT", "normal", "home", 0.2, "He had SO many five-star reviews!", "He had so many five-star reviews!"),
    ("DEX", "normal", "home", 0.2, "From who?", None),
    ("BOLT", "normal", "home", 0.9, "...Mostly himself.", "Mostly himself."),
    # ---- the Charging Station
    ("BOLT", "whisper", "cafe", 1.2, "There she is. Two o'clock.", None),
    ("DEX", "normal", "cafe", 0.2, "It's four-thirty.", "It's four thirty."),
    ("BOLT", "whisper", "cafe", 0.2, "Her POSITION, Dex. Install it. NOW.", "Her position, Dex. Install it. Now."),
    ("DEX", "normal", "cafe", 0.3, "Ugh, fine.", None),
    ("SYS", "normal", "cafe", 0.4, "Installing Rizz.exe. Estimated time: three minutes.", "Installing Rizz dot exe. Estimated time, three minutes."),
    ("BOLT", "normal", "cafe", 0.2, "No time. Go. GO!", "No time. Go. Go!"),
    ("DEX", "normal", "cafe", 0.9, "Hey, Nova.", None),
    ("NOVA", "normal", "cafe", D, "Oh, hey Dex. Um... your forehead says \"installing.\"", "Oh, hey Dex. Um, your forehead says, installing."),
    ("DEX", "normal", "cafe", D, "Ha, yeah, it's just a little...", "Ha, yeah, it's just a little"),
    ("DEX", "robot", "cafe", 0.1, "Are you a Wi-Fi signal? Because I am feeling a connection.", None),
    ("NOVA", "normal", "cafe", 0.7, "...Did you just download pickup lines?", "Did you just download pickup lines?"),
    ("DEX", "normal", "cafe", 0.2, "No! No, I would never...", "No! No, I would never"),
    ("DEX", "robot", "cafe", 0.1, "Are you a keyboard? Because you are just my type.", None),
    ("NOVA", "normal", "cafe", 0.4, "You totally did.", None),
    ("DEX", "normal", "cafe", 0.2, "BOLT! How do I turn it OFF?", "Bolt! How do I turn it off?"),
    ("BOLT", "normal", "cafe", 0.2, "Turn it off and on again!", None),
    ("DEX", "normal", "cafe", 0.2, "I can't turn MYSELF off and on again!", "I can't turn myself off and on again!"),
    ("BOLT", "normal", "cafe", 0.2, "Have you TRIED?", "Have you tried?"),
    ("DEX", "slow", "cafe", 0.6, "Shutting... dooowwwn...", "Shutting. Down."),
    ("DEX", "normal", "cafe", 2.0, "...Hello? Where am I? Who am I?", "Hello? Where am I? Who am I?"),
    ("SYS", "normal", "cafe", D, "Welcome back, Dex. Please accept the new Terms and Conditions.", None),
    ("DEX", "normal", "cafe", 0.2, "Yes, yes, I accept, whatever!", None),
    ("SYS", "normal", "cafe", D, "Thank you. Dex will now speak only in commercials.", None),
    ("DEX", "normal", "cafe", 0.3, "WAIT, WHAT?", "Wait, what?"),
    ("DEX", "ad", "cafe", 0.2, "Hi, Nova! Are YOU tired of being single? Try dinner with Dex! Now with 50% less awkward!", "Hi, Nova! Are you tired of being single? Try dinner with Dex! Now with fifty percent less awkward!"),
    ("NOVA", "normal", "cafe", 0.3, "Oh my gosh.", None),
    ("DEX", "ad", "cafe", 0.2, "Side effects may include sweating and crying in the bathroom!", None),
    ("BOLT", "normal", "cafe", 0.4, "Okay, okay, I got this. I can fix it.", None),
    ("DEX", "normal", "cafe", 1.1, "OW! Did you just HIT me?", "Ow! Did you just hit me?"),
    ("BOLT", "normal", "cafe", 0.2, "Fixed it.", None),
    ("DEX", "normal", "cafe", 0.6, "...It actually worked.", "It actually worked."),
    ("BOLT", "normal", "cafe", 0.2, "Old-school tech, baby.", None),
    # ---- the real moment
    ("DEX", "normal", "moment", 1.2, "Okay. No apps. No updates. Nova... I like you. Like, real-life, offline, no-Wi-Fi like you. Do you wanna get food sometime?", "Okay. No apps. No updates. Nova, I like you. Like, real life, offline, no wifi, like you. Do you wanna get food sometime?"),
    ("NOVA", "normal", "moment", 2.0, "Dex. Look at my forehead.", None),
    ("DEX", "normal", "moment", 0.6, "It says... \"Buffering.\"", "It says, buffering."),
    ("NOVA", "normal", "moment", D, "Yeah. It does that every time you walk in. For like... three months.", "Yeah. It does that every time you walk in. For like, three months."),
    ("BOLT", "normal", "moment", 0.2, "SHE'S BEEN BUFFERING!", "She's been buffering!"),
    ("DEX", "normal", "moment", 0.4, "So... is that a yes?", "So, is that a yes?"),
    ("NOVA", "normal", "moment", 0.4, "That's a yes.", None),
    ("SYS", "normal", "moment", 0.5, "To confirm your date, please enter the six-digit code sent to your device.", None),
    ("DEX", "normal", "moment", 0.2, "Seriously?!", "Seriously?"),
    ("NOVA", "normal", "moment", 0.2, "I'll send it to you.", None),
    ("DEX", "normal", "moment", 1.0, "\"Four. Eight. Two... heart emoji.\"", "Four. Eight. Two. Heart emoji."),
    ("NOVA", "normal", "moment", D, "That's not part of the code.", None),
    ("DEX", "quiet", "moment", 0.6, "I know.", None),
    # ---- ending
    ("BOLT", "normal", "end", 1.2, "See? You're welcome. Rizz.exe totally worked.", "See? You're welcome. Rizz dot exe totally worked."),
    ("DEX", "normal", "end", 0.2, "It absolutely did NOT work.", "It absolutely did not work."),
    ("SYS", "normal", "end", 0.5, "Thank you for using Rizz.exe. Your free trial has ended. Charging $400 to... Bolt.", "Thank you for using Rizz dot exe. Your free trial has ended. Charging four hundred dollars to, Bolt."),
    ("BOLT", "normal", "end", 0.2, "Wait, WHAT? I didn't...", "Wait, what? I didn't"),
    ("SYS", "normal", "end", D, "Payment complete. Also, you are out of bread.", None),
    ("BOLT", "normal", "end", 0.2, "I DON'T EVEN HAVE A TOASTER!", "I don't even have a toaster!"),
]

def build(lang: str = "en") -> None:
    if lang == "es":
        from buffering_es import L_ES as lines_src, VOICES_ES as voices
        eid, title = "buffering-es", "Cargando"
    else:
        lines_src, voices, eid, title = L, VOICES, "buffering", "Buffering"
    assert len(lines_src) == len(L) and [x[2] for x in lines_src] == [x[2] for x in L], "line count/scenes must match (gags are keyed to line index)"
    lines = []
    for spk, style, scene, pause, text, say in lines_src:
        v, r, p = voices[(spk, style)]
        ln = {"speaker": spk, "style": style, "text": text, "scene": scene, "chapter": scene.upper(), "note": "",
              "pause": pause, "voice": v, "rate": r, "pitch": p, "events": []}
        if say:
            ln["say"] = say
        lines.append(ln)
    lines[0]["pause"] = 0
    # intro: seconds of title card before line 0 (Buffering.tsx + buffer_music.py both read it)
    ep = {"id": eid, "lang": lang, "title": title, "voice": lines[0]["voice"], "intro": 3.0, "outro": 2.5, "lines": lines}
    out = os.path.join(ROOT, "episodes", f"{eid}.json")
    json.dump(ep, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"{len(lines)} lines -> {out}")


def trim(eid: str = "buffering") -> None:
    """After narrate.py: edge-tts pads every mp3 with 0.4-1.3 s of trailing
    silence; cut each line's timeline duration to its last word + 0.15 s so the
    skit moves (the audio file still plays whole; the tail is silent)."""
    p = os.path.join(ROOT, "episodes", f"{eid}.timing.json")
    t = json.load(open(p, encoding="utf-8"))
    for ln in t["lines"]:
        ln["duration"] = round(min(ln["duration"], ln["words"][-1]["end"] + 0.15), 3)
    json.dump(t, open(p, "w", encoding="utf-8"), indent=1)
    print(f"trimmed -> {sum(x['duration'] for x in t['lines']):.1f}s of speech")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    args = sys.argv[1:]
    lang = "es" if "es" in args else "en"
    if "trim" in args:
        trim("buffering-es" if lang == "es" else "buffering")
    else:
        build(lang)
