#!/usr/bin/env python3
"""
GATE for decide_overlays_with_claude — validates SHAPE + spacing of the B-roll
plan (not content). This makes a LIVE Claude CLI call.

Builds a canned ~28s post-cut talking transcript mixing CONCRETE nouns/numbers
(good triggers) with ABSTRACT filler (should be skipped). cutlist is a single
span [0, T] and all_words are sequential within it, so _kept_words maps them
onto the output timeline 1:1 (new_start ~= start).
"""
import autoedit


def build_canned():
    """Return (cutlist, all_words). One span [0, T]; words sequential in it."""
    script = (
        "okay so this completely changes how you work and the future of coding "
        "I ran thirty agents in parallel on a single GitHub repository "
        "each one opened a terminal and started an automated code review "
        "honestly the productivity gains here are just insane to think about "
        "then I deployed it to a server rack with sixteen processing nodes "
        "and the whole thing finished in under ninety seconds which is wild "
        "this is the mindset shift that nobody is really talking about yet"
    )
    tokens = script.split()
    all_words = []
    t = 0.0
    dur = 0.40  # ~0.4s per word -> ~28s total
    for tok in tokens:
        all_words.append({"start": t, "end": t + dur, "word": tok})
        t += dur
    T = t
    cutlist = [(0.0, T)]
    return cutlist, all_words


def main():
    cutlist, all_words = build_canned()
    total_out = sum(e - s for s, e in cutlist)
    density = "tasteful"
    MIN_GAP = {"more": 3.0, "less": 7.0}.get(density, 4.5)

    print(f"total_out = {total_out:.2f}s   density={density}  MIN_GAP={MIN_GAP}")
    plan = autoedit.decide_overlays_with_claude(cutlist, all_words, density=density)

    print("\n--- RETURNED PLAN ---")
    for it in plan:
        print(it)
    print(f"--- {len(plan)} overlays ---\n")

    checks = []

    def check(name, cond):
        checks.append((name, bool(cond)))
        print(f"[{'PASS' if cond else 'FAIL'}] {name}")

    check("returns a list", isinstance(plan, list))

    KEYS = {"start", "end", "query", "format", "kind", "label"}
    all_keys_ok = all(isinstance(it, dict) and KEYS.issubset(it.keys()) for it in plan)
    check("every item has all 6 keys", all_keys_ok)

    bounds_ok = all(it["start"] >= 0 and it["end"] <= total_out + 0.01
                    and it["end"] > it["start"] for it in plan)
    check("start>=0, end<=total_out, end>start", bounds_ok)

    fmt_ok = all(it["format"] in ("stacked", "cutaway") for it in plan)
    check("format in {stacked,cutaway}", fmt_ok)

    kind_ok = all(it["kind"] in ("image", "video") for it in plan)
    check("kind in {image,video}", kind_ok)

    starts = [it["start"] for it in plan]
    spacing_ok = all(b - a >= (MIN_GAP - 0.5)
                     for a, b in zip(starts, starts[1:]))
    check(f"no two starts closer than ~{MIN_GAP - 0.5}", spacing_ok)

    query_ok = all(isinstance(it["query"], str) and it["query"].strip()
                   for it in plan)
    check("queries non-empty strings", query_ok)

    passed = all(c for _, c in checks)
    print(f"\n{'='*40}")
    print("OVERALL:", "PASS" if passed else "FAIL",
          f"({sum(c for _, c in checks)}/{len(checks)} checks)")
    print('='*40)
    return 0 if passed else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
