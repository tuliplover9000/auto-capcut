"""Writes episodes/rizz-meter.json: the 3-friend voice-over skit "Rizz Meter".

In Rizzville everybody's rizz floats above their head as a live number.
Same cast + caption-reading format as Buffering (src/rizz/RizzMeter.tsx keys
its gags to LINE INDICES, so keep the 60 lines in this order).

    python scripts/make_rizzmeter.py          # -> episodes/rizz-meter.json
    python scripts/narrate.py episodes/rizz-meter.json
    python scripts/make_rizzmeter.py trim     # cut TTS tail silence from the timing
    node scripts/story-plan.ts episodes/rizz-meter.json
    python scripts/rizz_music.py episodes/rizz-meter.json
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EID = "rizz-meter"
VOICES = {
    ("DEX", "normal"): ("en-US-BrianNeural", "+0%", "+0Hz"),
    ("DEX", "quiet"): ("en-US-BrianNeural", "-10%", "-4Hz"),
    ("BOLT", "normal"): ("en-US-GuyNeural", "+10%", "+0Hz"),
    ("BOLT", "whisper"): ("en-US-GuyNeural", "-4%", "-6Hz"),
    ("BOLT", "nervous"): ("en-US-GuyNeural", "-18%", "+10Hz"),
    ("NOVA", "normal"): ("en-US-AvaNeural", "+0%", "+0Hz"),
    ("SYS", "normal"): ("en-US-ChristopherNeural", "-4%", "-8Hz"),
}
D = 0.25  # default breath between lines (on top of the timeline's 0.15 s GAP)

# (speaker, style, scene, pause, on-screen text, tts text or None)
L = [
    # ---- 0-12 Dex's room
    ("SYS", "normal", "home", 0, "In Rizzville, everybody's rizz floats right above their head. Live. All day. No exceptions.", "In Rizville, everybody's riz floats right above their head. Live. All day. No exceptions."),
    ("DEX", "normal", "home", 0.5, "Ugh. Morning.", None),
    ("SYS", "normal", "home", D, "Rizz check. Dex: 4.", "Riz check. Dex, four."),
    ("DEX", "normal", "home", 0.2, "FOUR? I've been awake for ONE second!", "Four? I've been awake for one second!"),
    ("SYS", "normal", "home", D, "You slept in your jeans. 3.", "You slept in your jeans. Three."),
    ("DEX", "normal", "home", 0.5, "...That's fair.", "That's fair."),
    ("BOLT", "normal", "home", 0.9, "DEX! Big news! Nova's gonna be at the park today!", "Dex! Big news! Nova's gonna be at the park today!"),
    ("DEX", "normal", "home", D, "Bolt. I'm a 3. Nova's a 100. She literally GLOWS.", "Bolt. I'm a three. Nova's a hundred. She literally glows."),
    ("BOLT", "normal", "home", D, "That's why you've got ME. Certified rizz coach. 87, baby.", "That's why you've got me. Certified riz coach. Eighty seven, baby."),
    ("DEX", "normal", "home", D, "Your number's only high 'cause you never talk to anyone.", None),
    ("BOLT", "normal", "home", 0.3, "Exactly. You can't lose rizz if you never use it.", "Exactly. You can't lose riz if you never use it."),
    ("SYS", "normal", "home", 0.2, "Bolt: 88.", "Bolt, eighty eight."),
    ("DEX", "normal", "home", 0.3, "That's not how it... ugh. Fine. Teach me.", "That's not how it, ugh. Fine. Teach me."),
    # ---- 13-26 the street (rizz lessons)
    ("BOLT", "normal", "street", 1.2, "Lesson one. Lean on something. Real casual.", None),
    ("DEX", "normal", "street", 0.3, "Like this?", None),
    ("SYS", "normal", "street", 1.0, "Dex: 2.", "Dex, two."),
    ("BOLT", "normal", "street", 0.4, "Lesson two. Sunglasses. Instant mystery.", None),
    ("DEX", "normal", "street", 0.4, "Okay, I can't see anyth—", "Okay, I can't see any"),
    ("SYS", "normal", "street", 0.7, "Dex: 0.", "Dex, zero."),
    ("BOLT", "normal", "street", D, "Whoa. I've never seen a zero in real life.", None),
    ("DEX", "normal", "street", D, "Can it even go lower than zero?", None),
    ("SYS", "normal", "street", 0.9, "Dog: 95.", "Dog, ninety five."),
    ("DEX", "normal", "street", 0.2, "The DOG is a 95?!", "The dog is a ninety five?!"),
    ("BOLT", "normal", "street", D, "He's a golden retriever, Dex. They're born with it.", None),
    ("BOLT", "normal", "street", 0.4, "Lesson three. When you see her, say something smooth. Like, \"Hey. Come here often?\"", "Lesson three. When you see her, say something smooth. Like, hey. Come here often?"),
    ("DEX", "normal", "street", D, "It's a park, Bolt. Everybody comes here often. It's free.", None),
    ("BOLT", "normal", "street", 0.2, "Then IMPROVISE!", "Then improvise!"),
    # ---- 27-48 the park
    ("BOLT", "whisper", "park", 1.2, "There she is. A hundred. Don't look directly at it.", None),
    ("DEX", "normal", "park", 0.9, "Hey, Nova.", None),
    ("NOVA", "normal", "park", D, "Oh! Hey, Dex.", None),
    ("DEX", "normal", "park", D, "So, uh... do you come here often?", "So, uh, do you come here often?"),
    ("SYS", "normal", "park", 0.4, "Dex: minus 3.", "Dex, minus three."),
    ("NOVA", "normal", "park", D, "Your number's red. I didn't know they could go red.", None),
    ("DEX", "normal", "park", D, "Ha. Yeah. It's a... new feature.", "Ha. Yeah. It's a, new feature."),
    ("BOLT", "whisper", "park", 0.3, "Compliment her! COMPLIMENT HER!", "Compliment her! Compliment her!"),
    ("DEX", "normal", "park", 0.3, "You have really... nice... elbows.", "You have really, nice, elbows."),
    ("SYS", "normal", "park", 0.4, "Dex: minus 10.", "Dex, minus ten."),
    ("NOVA", "normal", "park", D, "Is your head... smoking?", "Is your head, smoking?"),
    ("DEX", "normal", "park", D, "No. Yes. It does that sometimes.", None),
    ("BOLT", "whisper", "park", 0.2, "Abort! Fake a phone call!", None),
    ("DEX", "normal", "park", 0.4, "Hello? Oh, the President? Yeah, I can talk.", None),
    ("SYS", "normal", "park", 0.4, "Dex: minus 40.", "Dex, minus forty."),
    ("SYS", "normal", "park", 0.3, "WARNING. Rizz levels critical. Nearby citizens, please look away.", "Warning. Riz levels critical. Nearby citizens, please look away."),
    ("NOVA", "normal", "park", 0.5, "Dex. DEX. Stop. Look at MY number.", "Dex. Dex! Stop. Look at my number."),
    ("DEX", "normal", "park", 0.4, "It's... a 7?", "It's, a seven?"),
    ("NOVA", "normal", "park", D, "It drops every time you walk over. I tripped over this bench when I saw you. Twice.", None),
    ("DEX", "normal", "park", 0.3, "Wait. So you're bad at this too?", None),
    ("NOVA", "normal", "park", 0.2, "Dex, I am SO bad at this.", "Dex, I am so bad at this."),
    ("BOLT", "normal", "park", 0.2, "SHE HAS LOW RIZZ FOR YOU!", "She has low riz for you!"),
    # ---- 49-52 the real moment
    ("DEX", "normal", "moment", 1.0, "Okay. No lessons. No tricks. Nova... I like you. A lot. Wanna get food sometime?", "Okay. No lessons. No tricks. Nova, I like you. A lot. Wanna get food sometime?"),
    ("SYS", "normal", "moment", 0.6, "Calculating...", "Calculating."),
    ("NOVA", "normal", "moment", 0.8, "Yes. Yeah. I'd really like that.", None),
    ("SYS", "normal", "moment", 0.3, "Dex: 100.", "Dex, one hundred."),
    # ---- 53-59 ending
    ("BOLT", "normal", "end", 1.2, "See? Told you. My lessons totally worked.", None),
    ("DEX", "normal", "end", 0.2, "NONE of your lessons worked.", "None of your lessons worked."),
    ("NOVA", "normal", "end", 0.3, "Hi, Bolt!", None),
    ("BOLT", "nervous", "end", 0.3, "Oh. Uh. H-hi...", "Oh. Uh. Hi."),
    ("SYS", "normal", "end", 0.3, "Bolt has spoken to a girl. Bolt: minus 900.", "Bolt has spoken to a girl. Bolt, minus nine hundred."),
    ("DEX", "quiet", "end", 0.6, "Huh. So THAT'S why you never use it.", "Huh. So that's why you never use it."),
    ("SYS", "normal", "end", 0.6, "Dog: 100.", "Dog, one hundred."),
]
assert len(L) == 60


def build() -> None:
    lines = []
    for spk, style, scene, pause, text, say in L:
        v, r, p = VOICES[(spk, style)]
        ln = {"speaker": spk, "style": style, "text": text, "scene": scene, "chapter": scene.upper(), "note": "",
              "pause": pause, "voice": v, "rate": r, "pitch": p, "events": []}
        if say:
            ln["say"] = say
        lines.append(ln)
    ep = {"id": EID, "lang": "en", "title": "Rizz Meter", "voice": lines[0]["voice"], "intro": 3.0, "outro": 2.5, "lines": lines}
    out = os.path.join(ROOT, "episodes", f"{EID}.json")
    json.dump(ep, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"{len(lines)} lines -> {out}")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    if "trim" in sys.argv[1:]:
        from make_buffering import trim
        trim(EID)
    else:
        build()
