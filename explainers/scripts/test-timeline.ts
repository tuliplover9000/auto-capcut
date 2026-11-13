// node scripts/test-timeline.ts  (Node >= 23 strips types natively)
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {
  buildBeats, totalFrames, radarValue, radarText, vmsLines, scaleMax,
  sfxEvents, crossFrames, passFraction, outroStart, flashAmount, flashPeaks,
  INTRO, FPS, OVERFLOW_REVEAL, type Episode,
} from '../src/speedtrap/timeline.ts';

const ep: Episode = JSON.parse(readFileSync(new URL('../episodes/animals-speeding.json', import.meta.url), 'utf8'));
const beats = buildBeats(ep);
const total = totalFrames(ep);

// beats are contiguous, ordered, and phases are monotonic inside each beat
assert.equal(beats[0].start, INTRO);
beats.forEach((b, i) => {
  assert.ok(b.start < b.runStart && b.runStart < b.passFrame && b.passFrame <= b.runEnd && b.runEnd <= b.end, `beat ${i} phases`);
  if (i) assert.equal(b.start, beats[i - 1].end, `beat ${i} contiguous`);
});

// faster animals cross faster; pass point lands inside the crossing
assert.ok(crossFrames(28) > crossFrames(70) && crossFrames(70) > crossFrames(240));
for (const m of ['run', 'dive'] as const) assert.ok(passFraction(m) > 0.2 && passFraction(m) < 0.8, m);

// verdict flags: only cheetah + falcon ticketed, only falcon overflows a 2-digit sign
assert.deepEqual(beats.map((b) => b.ticket), [false, false, false, false, true, true]);
assert.deepEqual(beats.map((b) => b.overflow), [false, false, false, false, false, true]);

// radar: blank before the run, climbs monotonically, locks at the TRUE speed on the pass
for (const b of beats) {
  const c = ep.contenders[b.index];
  assert.equal(radarValue(ep, beats, b.start), null);
  let prev = -1;
  for (let f = b.runStart; f <= b.passFrame; f++) {
    const v = radarValue(ep, beats, f)!;
    assert.ok(v >= prev, `radar monotonic beat ${b.index}`);
    prev = v;
  }
  assert.equal(radarValue(ep, beats, b.passFrame), c.speed, `locks at true speed ${c.speed}`);
  assert.equal(radarValue(ep, beats, b.end - 1), c.speed);
}
assert.equal(radarText(28, 0), '28');
assert.equal(radarText(7, 0), ' 7');
assert.ok(['ER', '--'].includes(radarText(240, 0)) && radarText(240, 0) !== radarText(240, 4), 'overflow flickers');

// narrator: hook first frame (the hook IS frame 0), name then verdict, outro last
assert.deepEqual(vmsLines(ep, beats, 0), ep.hook);
assert.deepEqual(vmsLines(ep, beats, beats[4].start), ep.contenders[4].name);
assert.deepEqual(vmsLines(ep, beats, beats[4].verdictStart), ep.contenders[4].verdict);
// falcon: name holds through the strobes, THEN the number lands on a clean frame
assert.deepEqual(vmsLines(ep, beats, beats[5].verdictStart), ep.contenders[5].name);
const reveal = beats[5].verdictStart + OVERFLOW_REVEAL;
assert.deepEqual(vmsLines(ep, beats, reveal), ['240 MPH']);
assert.ok(flashAmount(beats, reveal) < 0.05, `240 reveal must not be washed out (flash=${flashAmount(beats, reveal)})`);

// photosensitivity: never more than 3 flash peaks inside any 1-second window
const peaks = flashPeaks(beats);
for (const p of peaks) assert.ok(peaks.filter((q) => q >= p && q < p + FPS).length <= 3, `flash rate at ${p}`);
// flash is real: peaks near 0.92, zero between beats
assert.ok(flashAmount(beats, beats[4].passFrame + 1) > 0.9);
assert.equal(flashAmount(beats, beats[0].passFrame + 1), 0, 'no flash for under-limit runs');
assert.deepEqual(vmsLines(ep, beats, total - 1), ep.outro);

// scale zooms out ONLY in the outro, enough to fit the falcon
assert.equal(scaleMax(ep, outroStart(ep) - 1), 80);
assert.ok(scaleMax(ep, total - 1) >= 240);

// every sfx lands inside the video
for (const e of sfxEvents(ep, beats)) assert.ok(e.frame >= 0 && e.frame < total, `${e.sfx}@${e.frame}`);

console.log(`PASS — ${beats.length} beats, ${total} frames = ${(total / FPS).toFixed(1)}s`);
console.log(beats.map((b) => `${ep.contenders[b.index].name.join(' ')}: ${((b.end - b.start) / FPS).toFixed(1)}s`).join(' | '));
