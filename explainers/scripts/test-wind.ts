// node scripts/test-wind.ts — Wind Test timing invariants against the REAL narration timings.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {buildPlan, windAt, captions, contenderAt, bandAt, skyAt, cueOffset, FPS, type WindEpisode, type Timing} from '../src/windtest/timeline.ts';

const ep: WindEpisode = JSON.parse(readFileSync(new URL('../episodes/wind-survival.json', import.meta.url), 'utf8'));
const t: Timing = JSON.parse(readFileSync(new URL('../episodes/wind-survival.timing.json', import.meta.url), 'utf8'));
const p = buildPlan(ep, t);

// narration lines never overlap, and the hook starts at 0.00 (content at frame 0)
assert.equal(p.lineStarts[0], 0);
const ends = t.lines.map((l, i) => p.lineStarts[i] + l.duration);
for (let i = 1; i < p.lineStarts.length; i++) assert.ok(p.lineStarts[i] >= ends[i - 1] - 1e-9, `line ${i} overlaps line ${i - 1}`);

// THE sync promise: gauge reads the target exactly when the number is spoken
p.beats.forEach((b, k) => {
  const target = k < ep.contenders.length ? ep.contenders[k].mph : ep.finale.mph;
  const lineIdx = k + 1;
  const spoken = p.lineStarts[lineIdx] + cueOffset(t.lines[lineIdx], k < ep.contenders.length ? ep.contenders[k].cue : ep.finale.cue);
  assert.ok(Math.abs(spoken - b.landing) < 1e-6, `beat ${k}: landing != cue spoken`);
  const v = windAt(p, b.landing);
  assert.ok(Math.abs(v - target) / target < 0.05, `beat ${k}: gauge ${v.toFixed(1)} at landing, want ${target}`);
  assert.ok(windAt(p, b.rampStart - 0.01) < target, `beat ${k}: already at target before ramp`);
  assert.ok(b.fail >= b.landing, `beat ${k}: fails before its number is said`);
});

// the gauge only climbs across beats (gusts aside)
let prev = 0;
for (const b of p.beats) { assert.ok(b.to > prev, 'targets ascend'); prev = b.to; }

// stage always has the right contender during its beat
p.beats.filter((b) => b.index >= 0).forEach((b) => assert.equal(contenderAt(p, b.landing)?.index, b.index));

// captions: ordered, non-overlapping, cover every spoken word, numbers flagged hot
const cs = captions(ep, t, p);
for (let i = 1; i < cs.length; i++) assert.ok(cs[i].start >= cs[i - 1].start, 'captions ordered');
const spokenWords = t.lines.reduce((n, l) => n + l.words.length, 0);
assert.equal(cs.reduce((n, c) => n + c.n, 0), spokenWords, 'every word captioned once');
assert.ok(cs.some((c) => c.hot && /Fifty/.test(c.text)), 'numbers are hot');
assert.ok(!cs.some((c) => c.hot && /dandelion/i.test(c.text)), 'consequences are not hot');

// bands + sky behave
assert.equal(bandAt(10)[1], 'BREEZE');
assert.equal(bandAt(302)[1], 'EF5 TORNADO');
assert.notEqual(skyAt(0).top, skyAt(302).top);

console.log(`PASS — ${(p.end).toFixed(1)}s = ${Math.ceil(p.end * FPS)} frames; landings at ` +
  p.beats.map((b) => `${b.to}@${b.landing.toFixed(1)}s`).join(' ') + `; sting @${p.stingStart.toFixed(1)}s`);

// readout LOCKS on the spoken number (gusts move only the needle)
import {readoutAt} from '../src/windtest/timeline.ts';
for (const b of p.beats) {
  for (const dt of [0, 0.37, 0.81, 1.5]) {
    const s = b.landing + dt;
    const next = p.beats.find((x) => x.rampStart > b.rampStart);
    if (next && s >= next.rampStart) continue;
    assert.equal(readoutAt(p, s), b.to, `readout at landing+${dt}s should be exactly ${b.to}`);
  }
}
console.log('PASS — readout locks on every spoken number');
